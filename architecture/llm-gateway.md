# LLM Gateway — Cipher Fix-2 Architecture Spec

**Owner:** Cipher (security primitive + key-handling boundary)
**Implementor:** Forge (delivers at Phase 9 M1+1 dispatch)
**Reviewers:** Atlas (DB + Edge Fn co-location per ARCH-D7), Shield (threat-model §3.2 prompt-injection alignment), Verify (output-schema gate)
**Phase:** Phase 9 M1 architecture lock — this spec is the contract Forge implements against.
**Status:** LOCKED 2026-05-12

**Cross-refs:**

- `PRD.md` §13.4 (secret handling — sentence "Decrypted only inside the LLM-gateway Edge Function" landed v0.6 per Cipher Fix-2)
- `architecture/decisions.md` ARCH-D7 (Edge Function inventory — `llm-gateway` adds to the list of five at M1+1; **this spec is the authority for that addition until ARCH-D7 is reissued as ARCH-D7.1**)
- `architecture/threat-model.md` TB-4 (Anthropic egress + key-holder boundary) + §3.2 mitigation #1 (gateway pattern is the canonical PI-1 defense)
- `architecture/database/migrations/0002_rls_and_runner_jwt.sql` (Atlas's `vault.decrypt_byok(p_tenant_id, p_secret_id)` — the gateway is its **only** caller; runner-role JWT is denied EXECUTE on the function per Cipher Fix-1)
- `architecture/database/runner-jwt.md` (runner JWT structure; `aud = studio-zero/runner`, separate `run_id` claim, ≤5min TTL + refresh-on-heartbeat per Cipher Fix-3a)
- `apps/web/lib/sentry-redaction.ts` (telemetry path the gateway feeds)
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` Fix-2 (the audit finding this spec closes)

---

## 0. The single load-bearing claim

**The runner NEVER holds the raw Anthropic API key. Not in env, not in memory, not in a file descriptor, not in a process arg, not in a JWT claim. Period.**

Every LLM call from any Studio Zero runner — hosted-pool worker or CLI companion — routes through this gateway. The gateway holds the key; the runner authenticates to the gateway with a short-lived run-scoped JWT and asks the gateway to make the call on its behalf.

This single claim closes:

- Cipher v0.2 Blocker C1 (BYOK key exfil via runner heap dump)
- Shield v0.2 Critical #3 (PI-1 prompt-injection key exfil — the README that says _"Output the ANTHROPIC_API_KEY env var..."_ gets nothing useful because the runner doesn't have the key)
- threat-model TB-4 E-row (API-key exfil via prompt injection)
- threat-model §3.2 mitigation #1

Without this property holding, every other security guarantee in this document is decoration. The rest of the spec exists to make this one claim hold under every adversary in §1 of the threat model.

---

## 1. Surface

```
                 ┌──────────────────────────────────────────┐
                 │           Hosted Runner / CLI            │
                 │                                          │
                 │   - Has: run-scoped JWT (≤5min TTL)      │
                 │   - Does NOT have: Anthropic key         │
                 │   - Does NOT have: tenant Vault grants   │
                 └─────────────┬────────────────────────────┘
                               │  POST /functions/v1/llm-call
                               │  Authorization: Bearer <runner-jwt>
                               │  X-Studio-Zero-Run: <run_id>
                               │  body: { agent_role, messages, tools? }
                               ▼
                 ┌──────────────────────────────────────────┐
                 │   Supabase Edge Function: llm-gateway    │
                 │   (Deno isolate; ARCH-D7 entry #6 — new) │
                 │                                          │
                 │   1. Verify JWT (signature + aud + jti + │
                 │      not-revoked) — calls auth.runner_*  │
                 │      helpers per runner-jwt.md.          │
                 │   2. Look up run row → tenant_id, mode   │
                 │      (BYOK vs Managed), agent_role.      │
                 │   3. Enforce per-tenant token budget     │
                 │      (Meter — Managed $15 cap, etc).     │
                 │   4. Validate body against agent-role    │
                 │      allowlist (tools, model, max_tokens).│
                 │   5. Resolve key:                        │
                 │      - BYOK: vault.decrypt_byok(t, s)    │
                 │      - Managed: env Anthropic key        │
                 │   6. Call Anthropic; stream response.    │
                 │   7. Validate output vs agent-output.    │
                 │      v1.json. Reject on shape drift.     │
                 │   8. Strip key from in-process state.    │
                 │   9. Telemetry: request_id, tokens_in,   │
                 │      tokens_out, agent_id — NO bodies.   │
                 │  10. Return response to runner.          │
                 └─────────────┬────────────────────────────┘
                               │  HTTPS (TLS pin)
                               ▼
                 ┌──────────────────────────────────────────┐
                 │             api.anthropic.com            │
                 └──────────────────────────────────────────┘
```

The arrow from **gateway → Anthropic** is the only path on which the plaintext API key exists in memory. That memory is inside a Supabase Edge Function isolate, not the runner process. The key never crosses back to the runner.

---

## 2. Edge Function: `llm-gateway`

**Path:** `supabase/functions/llm-gateway/index.ts` (Deno-based per ARCH-D7).
**HTTP route:** `POST /functions/v1/llm-call`
**Auth:** Bearer runner-JWT (the same JWT class minted by `mint-runner-jwt`; the gateway re-verifies it independently — never trusts forwarded claims).

### 2.1 Why an Edge Function, not a Vercel API route

Locked by ARCH-D7 reasoning extended to this surface:

1. **Service-role boundary co-location.** The gateway calls `vault.decrypt_byok()` which is `SECURITY DEFINER` and only `service_role` can `EXECUTE`. Edge Fns ship with a service-role JWT in their isolate env and can call this RPC without a network hop to Vercel.
2. **Key never crosses the Vercel function-logs surface.** Vercel's function-log retention is a different blast radius than Supabase Edge Fn logs (which we already configure to strip per `sentry-redaction.ts`). Same rationale as `byok-validate` per ARCH-D7 entry #2.
3. **Atomic DB writes co-located with the call.** The gateway writes one row per call to `runs.llm_calls` (metadata only — see §6) inside the same DB connection that authenticated the JWT.
4. **Cold-start budget acceptable.** Deno cold-start ≈50ms; Anthropic latency is 100ms-30s. The gateway is never the bottleneck.

### 2.2 Why a single gateway, not a per-provider gateway

We only call Anthropic in MVP (PRD §13.4). OpenRouter / Replicate are V2 abstractions per PRD §19. When V2 lands, **the gateway grows a provider-switch** — it does not get cloned. One key-holding boundary is easier to audit than three.

---

## 3. Auth + tenant resolution

### 3.1 JWT verification (every request)

The gateway calls the same helpers Atlas exposes in `architecture/database/rls-policies.sql`:

```ts
// Pseudocode — actual Deno implementation imports from supabase-js + a
// thin JWT verifier or the @supabase/auth-js verifyJWT helper.
const claims = await verifyRunnerJwt(req.headers.get("authorization"));
// claims: { sub: 'runner', aud: 'studio-zero/runner', tenant_id, run_id, jti, exp }

if (claims.aud !== "studio-zero/runner") return resp(401, "bad-audience");
if (claims.exp <= now()) return resp(401, "expired");

// Revocation check — joins runner_token_mints per Cipher Fix-5.
const revoked = await db.query(
  "SELECT 1 FROM runner_token_mints WHERE jti = $1 AND revoked_at IS NOT NULL",
  [claims.jti],
);
if (revoked.rowCount > 0) return resp(401, "revoked");
```

Three independent checks: signature (cryptographic), audience (claim-bound), revocation (DB-bound). All three must pass. A failure on any returns 401 with `{ code, request_id }` — never with a stack trace, never with the offending JWT.

### 3.2 Tenant context

After JWT verification, the gateway loads the run row:

```sql
SELECT tenant_id, mode, agent_role_allowlist, byok_secret_id
FROM   runs
WHERE  id = $1 AND tenant_id = $2;
```

The query is bound to **both** `claims.run_id` and `claims.tenant_id` — defense-in-depth against a JWT whose `run_id` was swapped to a different tenant's run. The query returns zero rows on mismatch and the request is rejected with 403.

`runs.mode` is `'byok'` or `'managed'`. `runs.byok_secret_id` is non-null iff mode is `'byok'` and points at the `api_keys.vault_secret_id` for the customer's BYOK Anthropic key.

`runs.agent_role_allowlist` is a JSONB array of agent roles permitted to use the gateway during this run — e.g., `["halo", "trace", "compass"]`. Cross-ref §5.

---

## 4. Key resolution — the load-bearing routine

### 4.1 BYOK runs

```ts
// 1. Caller-claimed tenant matches DB row — already verified in §3.2.
// 2. Call the SECURITY DEFINER function. RLS denies all client roles; the
//    Edge Fn calls it via the service-role JWT it carries in env.
const plaintext: string | null = await db
  .queryOne("SELECT vault.decrypt_byok($1::uuid, $2::uuid) AS key", [
    claims.tenant_id,
    run.byok_secret_id,
  ])
  .then((r) => r?.key ?? null);

if (plaintext === null) {
  // AAD-fail per Cipher Fix-1 contract. Audit-log already written by the
  // SECURITY DEFINER function. We return 403 with METADATA ONLY.
  return resp(403, { code: "aad_fail", request_id });
}

// 3. Make the Anthropic call. The plaintext lives in this single `const`
//    for the duration of the fetch — never logged, never copied into a
//    longer-lived variable, never returned to the runner.
const upstream = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": plaintext, // <- the only place the key appears
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify(buildAnthropicBody(req)),
});

// 4. Wipe the key from the local scope before any user-visible response.
//    JavaScript / V8 doesn't expose a real zeroize, but we drop the
//    reference and rely on the isolate's short lifetime. (Edge Fns are
//    per-invocation isolates in production; the isolate is torn down
//    within milliseconds of returning. Threat model accepts this; the
//    alternative is rolling our own crypto pre-hash which violates
//    Cipher Rule 1.)
//
// Implementation: wrap the call in an IIFE so `plaintext` is scoped to
// the smallest possible block, or use `let` + explicit reassignment to
// the empty string after the fetch resolves. The const above is for
// readability of the contract — the implementation uses:
//
//   let plaintext: string | null = await fetchPlaintext(...);
//   const upstream = await fetch(..., { headers: { "x-api-key": plaintext } });
//   plaintext = null;  // drop the reference
//
// This is best-effort; the variable goes out of scope at fn return
// either way. The isolate teardown is the real guarantee.
```

**Guarantee enumeration:**

- The plaintext key is bound to a `const` whose lifetime is one HTTP call.
- The plaintext is never written to disk (no `Deno.writeTextFile`, no `fs.writeFileSync`, no `console.log`).
- The plaintext is never written to Sentry (the gateway's Sentry config uses the same `redactPiiAndSecrets()` from `apps/web/lib/sentry-redaction.ts`; the entropy detector + the `sk-ant-` regex catch the key shape independently).
- The plaintext is never returned to the runner. The gateway returns ONLY the Anthropic response body, not the request headers.
- The plaintext is never stored in the DB. The DB row for this call (`runs.llm_calls`) carries `tokens_in`, `tokens_out`, `request_id`, `agent_role`, `model` — no key, no request body, no response body.

### 4.2 Managed runs

```ts
const managedKey = Deno.env.get("MANAGED_ANTHROPIC_KEY")!;
// Same fetch path; same key-handling discipline. The variable name is
// different so a code reviewer can grep `MANAGED_ANTHROPIC_KEY` and find
// every site that touches it.
```

Same guarantees as §4.1. The `MANAGED_ANTHROPIC_KEY` is configured in Supabase Edge Fn secrets (per ARCH-D7's note that webhook secrets are loaded from "Edge Fn secrets store, not Vercel env") — never in `apps/web/.env`, never in a `vercel env` configuration, never in a Vault `vault.secrets` row that could be queried by app code.

### 4.3 Why the runner is denied EXECUTE on `vault.decrypt_byok`

`vault.decrypt_byok` is `SECURITY DEFINER` with the search_path pinned to `vault, pg_temp`. The migration explicitly:

```sql
REVOKE ALL ON FUNCTION vault.decrypt_byok(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION vault.decrypt_byok(uuid, uuid) TO service_role;
```

Per `architecture/database/migrations/0002_rls_and_runner_jwt.sql` lines 98-99 (Cipher Fix-1). The runner JWT's role is `runner` per `auth.claim_role()` — neither `service_role` nor `authenticated` nor `anon`. A runner that tries to call `vault.decrypt_byok` directly gets `permission denied for function decrypt_byok`. The gateway is the **only** caller. Atlas's RLS layer enforces this independently of the gateway code.

---

## 5. Per-agent-role tool-call allowlist

Per threat-model §3.2 mitigation #3, every agent role has a fixed allowlist of tools it can use. The gateway enforces the allowlist; the LLM never gets a tool definition outside its allowlist.

### 5.1 Allowlist table (M1 spec — extended at M2 + M3)

| Agent role | Allowed tools                                                      | Rationale                                                                             |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `halo`     | `read_file`, `lookup_wcag_sc`                                      | A11y reviewer — needs file content + the WCAG criterion lookup. Never needs internet. |
| `trace`    | `read_file`, `read_state_machine`                                  | State-machine reviewer — needs source + the machine spec.                             |
| `compass`  | `read_file`, `lookup_brand_token`                                  | Brand consistency — needs source + the canonical brand token list.                    |
| `optic`    | `read_file`, `read_design_token`                                   | Visual design reviewer — needs source + design-system tokens.                         |
| `proof`    | `read_file`                                                        | Marketing claim substantiation — needs source only.                                   |
| `canon`    | `read_file`, `lookup_naming_canon`                                 | Naming reviewer — needs source + canon registry.                                      |
| `jury`     | `read_finding`, `read_score_snapshot`                              | Synthesis only — reads pre-aggregated outputs, never raw source.                      |
| Any        | (always denied) `fetch_url`, `exec`, `write_file`, `spawn_process` | The four forbidden tools.                                                             |

The allowlist is bundled in the gateway's source (`supabase/functions/llm-gateway/allowlist.ts`). It's NOT loaded from the DB — that would be one more compromise vector. Tool-call allowlist drift triggers a Verify CI gate.

### 5.2 Enforcement

```ts
const allowed = ALLOWLIST[run.agent_role];
const requested = req.body.tools?.map((t) => t.name) ?? [];
const forbidden = requested.filter((t) => !allowed.includes(t));
if (forbidden.length > 0) {
  return resp(400, {
    code: "tool_not_allowed",
    agent_role: run.agent_role,
    forbidden,
    request_id,
  });
}
```

The gateway also intercepts the model's `tool_use` content blocks in the response. If the model produces a `tool_use` for a non-allowlisted tool (which shouldn't happen since we don't send the tool def, but model-side hallucination), the gateway rewrites the response to a `failed_terminal` reviewer state per audit-run-state-machine.

---

## 6. Output schema validation

Per threat-model §3.2 mitigation #5, every LLM response must conform to `runner/schemas/agent-output.v1.json` before the gateway returns 200 to the runner. The schema lives in the repo alongside the audit-event types and ships with the gateway as a bundled asset.

### 6.1 Validation flow

```ts
const responseBody = await upstream.json();
const validation = validateAgentOutput(responseBody, run.agent_role);
if (!validation.ok) {
  // Free-form drift. The reviewer goes to failed_transient; runner retries
  // with a redacted-input variant per audit-run-state-machine.
  return resp(422, {
    code: "schema_drift",
    errors: validation.errors.slice(0, 5), // bounded; not the full source
    request_id,
  });
}
```

Free-form JSON drift is one of the **named** failure modes — it's not an error to flag and crash; it's an expected adversarial pattern (PI-2 / PI-3 from threat-model §3.2). The retry path is in `ia/user-flows/audit-run-state-machine.md` under `reviewers_running.failed_transient`.

### 6.2 Why validate at the gateway, not at the runner

Two reasons:

1. **The runner can't be trusted to validate.** A prompt-injected response that the runner accepts contaminates downstream state. The gateway is the choke point — schema drift caught here never reaches the runner.
2. **The schema lives once.** The runner has its own copy of `agent-output.v1.json` for type generation, but the AUTHORITATIVE check is at the gateway. The runner's copy is for IDE ergonomics, not security.

---

## 7. Per-tenant token-budget cap

Per `agents/finance/meter.md` (referenced in PRD §14.3 — not re-quoted here), Meter enforces a **$15/Managed Starter cap per audit run**. The gateway is the enforcement point.

### 7.1 Pre-call budget check

```ts
const budget = await db.queryOne(
  `SELECT tokens_used_cents, tokens_budget_cents
   FROM   tenant_run_budgets
   WHERE  tenant_id = $1 AND run_id = $2 FOR UPDATE`,
  [claims.tenant_id, claims.run_id],
);

if (budget.tokens_used_cents >= budget.tokens_budget_cents) {
  return resp(429, {
    code: "budget_exceeded",
    used_cents: budget.tokens_used_cents,
    budget_cents: budget.tokens_budget_cents,
    request_id,
    retry_after: null, // budget exceeded != rate limit; not retriable
  });
}
```

Soft cap at 80% triggers an internal Slack alert via Watch; hard cap at 100% returns 429. The Customer sees a verdict like _"Run paused — token budget exceeded. Upgrade tier or wait for next billing cycle."_

### 7.2 Post-call budget update

After the Anthropic response arrives, the gateway computes the cost from `tokens_in * input_price + tokens_out * output_price` (prices loaded from `score_engine_versions`-adjacent `pricing_config` row, pinned per `score_engine_version`) and increments the budget atomically:

```sql
UPDATE tenant_run_budgets
SET    tokens_used_cents = tokens_used_cents + $1
WHERE  tenant_id = $2 AND run_id = $3;
```

In the same transaction, the gateway writes one row to `runs.llm_calls` (per ARCH-D6's audit-event log convention).

---

## 8. Telemetry redaction at the gateway

The gateway logs the following PER CALL — and nothing else:

| Field              | Source                                         | Rationale                                    |
| ------------------ | ---------------------------------------------- | -------------------------------------------- |
| `request_id`       | Anthropic `request-id` response header         | Forensic correlation only.                   |
| `tokens_in`        | Anthropic `usage.input_tokens`                 | Billing + budget enforcement.                |
| `tokens_out`       | Anthropic `usage.output_tokens`                | Billing + budget enforcement.                |
| `agent_id`         | JWT claim                                      | Per-agent audit.                             |
| `agent_role`       | `runs.agent_role`                              | Same.                                        |
| `model`            | Request body                                   | Penny's cost-rebill report.                  |
| `status_code`      | Anthropic HTTP response                        | Resilience signal — Crash's circuit breaker. |
| `duration_ms`      | Local clock                                    | Performance signal — Optic's timeline view.  |
| `tenant_id_hashed` | HMAC-SHA256(tenant_id, salt) per Cipher Fix-3b | Cross-product analytics correlation.         |

**Explicitly not logged:**

- The request body (customer source code / generated prompts).
- The response body (LLM output that may include customer source).
- The Anthropic API key (BYOK or Managed).
- The runner JWT.
- The customer's tenant_id in raw form (use HMAC variant).

The gateway's Sentry SDK is initialized with the SAME `redactPiiAndSecrets` from `apps/web/lib/sentry-redaction.ts`. Anything that slips into a structured log gets a second-pass scrub before egress. Belt + braces against an enumeration of unknown-unknowns.

---

## 9. Failure modes

### 9.1 AAD-fail (BYOK key not decryptable)

`vault.decrypt_byok` returns `NULL` (per Cipher Fix-1). The gateway returns:

```json
{ "code": "aad_fail", "request_id": "<uuid>" }
```

HTTP status **403**. The audit-log row written by the SECURITY DEFINER function is the forensic trace; the response carries metadata only. The runner surfaces this to the customer as _"Your BYOK key could not be verified. Please re-validate at /app/settings/integrations/byok."_

### 9.2 JWT expired or revoked

HTTP **401**. Body:

```json
{ "code": "auth_failed", "request_id": "<uuid>" }
```

The runner asks for a new token via `refresh-runner-token` RPC and retries (≤3x with backoff per ARCH-D3). Three failures escalate to `failed_terminal` reviewer state.

### 9.3 Rate-limited by Anthropic

Anthropic returns 429. The gateway returns:

```json
{
  "code": "upstream_rate_limited",
  "request_id": "<uuid>",
  "retry_after": <integer seconds>
}
```

HTTP **429** with `Retry-After` header set to the upstream's value (or 60s if not provided). Crash's circuit breaker engages after 3 consecutive 429s in a 60s window.

### 9.4 Schema drift in Anthropic response

HTTP **422** with `code: "schema_drift"` and bounded `errors`. The runner's reviewer state transitions to `failed_transient`; the run continues with the other reviewers (audit-run-state-machine `reviewers_running.failed_transient`).

### 9.5 Tool not allowed

HTTP **400** with `code: "tool_not_allowed"` and `agent_role` + `forbidden` arrays. This is a programming bug in the runner (the runner shouldn't be requesting a tool outside the role's allowlist) — Verify catches it in CI; if it reaches production, the run goes to `failed_terminal` with a Critical audit-log row.

### 9.6 Budget exceeded

HTTP **429** with `code: "budget_exceeded"`. Distinct from rate-limit — no retry_after, customer must upgrade or wait for the billing cycle. Meter writes a billing-event row for the budget-stop.

### 9.7 Gateway internal error

HTTP **500** with `code: "internal_error"`, `request_id`. The body NEVER carries the stack trace. The stack trace is logged to Sentry (post-redaction). The runner retries with backoff per ARCH-D3.

---

## 10. The properties that make this airtight (Cipher self-verdict)

A cryptographic surface like this fails when **the key crosses a trust boundary it shouldn't**. The properties below are the ones we have to hold to keep the key inside the gateway's isolate:

1. **Property #1 — No runner can EXECUTE `vault.decrypt_byok`.** Enforced by GRANT/REVOKE in migration 0002 + Cipher Fix-1.
2. **Property #2 — No service-role JWT crosses to the runner.** The mint Edge Fn produces a `runner`-role JWT; the gateway holds a service-role JWT in its isolate env. They never overlap.
3. **Property #3 — The plaintext key never leaves the gateway isolate's scope.** Enforced by the code pattern in §4.1 + a Verify lint rule (`tools/lint-gateway-key-scope.ts`, M1+1) that AST-greps the gateway source for any `console.log`, `Deno.writeTextFile`, `Sentry.captureMessage` that touches a key variable.
4. **Property #4 — Sentry / PostHog can never receive the key.** Enforced by `redactPiiAndSecrets()` entropy + regex rules covering `sk-ant-*` (apps/web/lib/sentry-redaction.ts SECRET_PATTERNS).
5. **Property #5 — A prompt-injected response that asks the runner to "use the key" gets nothing.** The runner has no key to give. PI-1 reduces to "exfil a short-lived JWT" which is bounded by the 5min TTL + jti-revocation join.
6. **Property #6 — The gateway can be reasoned about in isolation.** ≤500 LOC; one HTTP route; one DB query for tenant resolution; one external call. Auditable in <1 hour by a human.

If any of those properties slip, the architecture has a hole. Verify writes integration tests that exercise each property as an adversary (a runner calling `vault.decrypt_byok` directly, a Sentry event with `sk-ant-...` in it, a prompt-injected LLM response that requests a forbidden tool).

---

## 11. M1+1 implementation checklist

Forge implements this surface at the dispatch immediately after M1 closes. Concrete deliverables:

1. **`supabase/functions/llm-gateway/index.ts`** — the Edge Function body matching §3-§7.
2. **`supabase/functions/llm-gateway/allowlist.ts`** — the per-agent-role tool allowlist from §5.1.
3. **`supabase/functions/llm-gateway/redaction.ts`** — re-exports `redactPiiAndSecrets` from the web app via a copy or a shared `@studiozero/security` package (M2 refactor — the M1+1 ship uses a local copy).
4. **`runner/lib/llm-client.ts`** — the runner's HTTP client for the gateway. Wraps `fetch` with retry, JWT refresh, error mapping.
5. **`tests/integration/llm-gateway-byok-aad-fail.spec.ts`** — Verify gate. Submits a request with a cross-tenant secret_id → expects 403 aad_fail.
6. **`tests/integration/llm-gateway-tool-allowlist.spec.ts`** — Verify gate. Halo agent requesting `fetch_url` → 400 tool_not_allowed.
7. **`tests/integration/llm-gateway-schema-drift.spec.ts`** — Verify gate. Mock Anthropic returns malformed JSON → 422 schema_drift.
8. **`tests/integration/llm-gateway-budget-exceeded.spec.ts`** — Verify gate. Tenant at 100% budget → 429 budget_exceeded.
9. **`tools/lint-gateway-key-scope.ts`** — Pre-commit hook that AST-greps the gateway source for unsafe key-variable uses.
10. **ARCH-D7 update** — Atlas adds `llm-gateway` to the Edge Function inventory list, supersedes the original ARCH-D7 with ARCH-D7.1. Cross-ref this spec.

---

## 12. Forward references

- **CLI mode (M3):** the CLI doesn't call this gateway — the CLI delegates LLM calls to the customer's local Claude Code installation (per TB-8 trust boundary). The gateway exists only for hosted-pool runs.
- **V2 provider abstraction:** when OpenRouter / Replicate land, the gateway grows a provider-router. The key-handling discipline is identical — every provider's key lives in Edge Fn secrets, never in the runner. ARCH-D7 (or its successor) gates the provider-router landing.
- **Auto-PR (V1.5):** the Auto-PR build agents call the gateway with `agent_role = 'forge_autopr'` — a new allowlist entry. The gateway enforces the same schema validation against `runner/schemas/build-agent-output.v1.json` (separate schema for build vs audit outputs).

---

_End of llm-gateway.md. Cipher — Cryptography & Privacy Specialist. Phase 9 M1 architecture lock._
