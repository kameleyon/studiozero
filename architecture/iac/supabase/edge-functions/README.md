# Supabase Edge Functions — Inventory & Ship Schedule

**Owner:** Atlas (writes function code) + Pipeline (CI deploys) + Terra (this manifest).
**Boundary policy:** per ARCH-D7, Edge Functions own four kinds of work — JWT minting, BYOK dry-run, score computation, webhooks with HMAC signature verification, and the V1.5 Jury re-audit gate. Everything else stays in Vercel API routes.
**Runtime:** Deno (Supabase-managed isolates); cold-start ≈ 50ms; co-resident with Postgres us-east-1 (RTT < 1ms internal).
**Deploy:** `supabase functions deploy <fn-name>` from CI (Pipeline's `.github/workflows/deploy-edge-fns.yml` at M1+). Not Terraform.
**Code location:** `supabase/functions/<fn-name>/index.ts` at repo root (Atlas writes; not in this directory).

## Function inventory & ship schedule

| Function               | Ships at                                                 | Purpose                                                                                                                                                                                                             | Auth                                                                   | Triggered by                                             |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `mint-runner-token`    | **M1**                                                   | Sole minter of short-lived tenant-scoped runner JWTs per ARCH-D3 (5-min TTL, `aud=studio-zero/runner`)                                                                                                              | Caller must present service-role JWT (only Web App job-dispatcher)     | Web App `POST /api/runs` → enqueue + mint                |
| `refresh-runner-token` | **M1**                                                   | Runner heartbeat token refresh per ARCH-D3 (re-validates membership, re-mints same claims)                                                                                                                          | Runner's current (about-to-expire) JWT                                 | Runner cron @ 30s when `exp - now < 60s`                 |
| `byok-validate`        | **M1**                                                   | Anthropic dry-run for customer-supplied BYOK keys per ARCH-D7 (keeps key out of Vercel function logs)                                                                                                               | Authenticated user JWT (RLS-checked)                                   | Web App `POST /api/byok/validate`                        |
| `score-engine`         | **M1**                                                   | Single-source-of-truth deterministic score computation per ARCH-D7 + PRD §10. Loads `score_engine.v1.json` as bundled asset. Input: `findings[]`. Output: `{score, verdict, score_breakdown, score_engine_version}` | Runner JWT OR Web App authenticated JWT (for explainability recompute) | Runner post-Jury synthesis; Web App on demand            |
| `stripe-webhook`       | **M2**                                                   | HMAC `Stripe-Signature` verify → upsert `subscriptions` + `billing_events` per ARCH-D4                                                                                                                              | HMAC signature (no JWT)                                                | Stripe webhook delivery → `/functions/v1/stripe-webhook` |
| `github-webhook`       | **M1** (subscribe events) → **V1.5** (PR merge tracking) | HMAC `X-Hub-Signature-256` verify → handle `installation.created/deleted` (ARCH-D6 tracking_state); subscribe to PR merge events at V1.5                                                                            | HMAC signature (no JWT)                                                | GitHub webhook delivery                                  |
| `jury-reaudit-gate`    | **V1.5**                                                 | Sole code path that can transition `fix_pr_jobs.state='reaudit_passed'`. RLS enforces `auth.jwt() ->> 'iss' = 'supabase-edge-functions'`                                                                            | Service-role auth from Auto-PR worker                                  | V1.5 fix-pipeline post-re-audit                          |

**M0 ship:** none. M0 deliverables are stubs/specs only. Atlas writes function skeletons at M1; ARCH-D9 (egress allowlist primitive) blocks until M1 too.

## Function-secret store (NOT Vercel env-vars)

Edge Function secrets live in Supabase's **separate** secret store, set via:

```bash
supabase secrets set --env-file=./functions.env
```

| Secret                         | Function(s)                                 | Provider-agent            | Notes                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_WEBHOOK_SECRET`        | `stripe-webhook`                            | Ledger                    | HMAC verification secret from Stripe Dashboard → Developers → Webhooks → Studio Zero endpoint                                                                                                                   |
| `GITHUB_APP_WEBHOOK_SECRET`    | `github-webhook`                            | Forge                     | HMAC verification secret from GitHub App config                                                                                                                                                                 |
| `GITHUB_APP_ID`                | `github-webhook`                            | Forge                     | App ID (for token minting in webhook flows)                                                                                                                                                                     |
| `GITHUB_APP_PRIVATE_KEY`       | `github-webhook`                            | Forge                     | PEM-format RSA private key                                                                                                                                                                                      |
| `ANTHROPIC_API_KEY_VALIDATION` | `byok-validate`                             | Cortex                    | A throwaway Managed-tier key used only to validate that customer keys are well-formed (the function uses **the customer's** key for the actual dry-run, not this one; this one is just for connectivity sanity) |
| `JWT_RUNNER_SIGNING_SECRET`    | `mint-runner-token`, `refresh-runner-token` | Cipher                    | Supabase's JWT signing secret — actually Supabase-managed and automatically available in Edge Functions; listed for inventory completeness                                                                      |
| `SUPABASE_URL`                 | all                                         | Auto-injected by Supabase | runtime                                                                                                                                                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`    | mint/refresh/score-engine/jury-reaudit-gate | Auto-injected             | runtime; for service-role queries within the function                                                                                                                                                           |
| `SUPABASE_ANON_KEY`            | byok-validate, webhooks                     | Auto-injected             | runtime                                                                                                                                                                                                         |

> **Cross-surface secret-inventory parity.** The same secrets named here appear in `vercel/env-vars.md` with surface=`edge-fn` so the full org-wide inventory is browsable from one place.

## CI deployment workflow (M1+)

Pipeline writes `.github/workflows/deploy-edge-fns.yml`:

```yaml
# (spec only — Pipeline owns the actual YAML)
# Triggers on: push to master + path: supabase/functions/**
# Steps:
#   1. supabase login --token $SUPABASE_ACCESS_TOKEN
#   2. supabase link --project-ref $SUPABASE_PROJECT_REF
#   3. supabase functions deploy <fn-name> --no-verify-jwt? (per config.toml)
#   4. Smoke: invoke each fn with a fixture payload; assert 2xx (or expected signature-fail for HMAC functions)
```

Per-function deploy = atomic; failures don't roll back other functions. Add a deploy-all wrapper at M2 if drift becomes a problem.

## Local development

`supabase functions serve <fn-name>` runs the function locally against the local Supabase stack. Secrets come from `supabase/.env.local` (gitignored). Atlas writes Vitest harness at M1 mirroring the deployed signature.

## Drift-check protocol

Weekly (Mon): `supabase functions list --project-ref $TF_VAR_supabase_project_ref` — diff against the table above. Any extra deployed function (someone hand-pushed via CLI) → log + tear down. Any missing function expected at this milestone → log + same-day deploy.

## Cross-references

- `architecture/decisions.md` ARCH-D3 (mint-runner-token spec), ARCH-D4 (stripe-webhook reconciliation), ARCH-D6 (github-webhook + tracking_state), ARCH-D7 (boundary policy)
- `architecture/database/runner-jwt.md` (Atlas-owned JWT claims spec)
- `architecture/system-diagram.md` §1 Edge Functions box
- `architecture/iac/secrets/vault-keys.md` (secret inventory cross-surface)
- `architecture/iac/supabase/config.toml` (per-function verify_jwt toggles)

---

_Terra · Supabase Edge Functions inventory · M0._
