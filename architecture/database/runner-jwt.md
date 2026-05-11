# Runner JWT — tenant-scoped, short-lived, per-run

**Owner:** Atlas (data) + Vault (RLS pattern review) + Shield (threat-model gate) · **PRD:** §13.5 (Multi-tenancy isolation), §13.4 (Secret handling), §17 D1/D6/D7/D8/D9 · **Closes:** Atlas v0.2 **Blocker B2** ("runner using service-role key bypasses RLS"). · **Gates:** M1 exit gate (PRD §16).

## The one-paragraph version

The hosted runner authenticates to Supabase with a short-lived, tenant-scoped JWT minted at job dispatch by an Edge Function. Claims include `tenant_id` and `run_id`. The RLS policies in `rls-policies.sql` evaluate `auth.jwt() ->> 'tenant_id'` and `auth.jwt() ->> 'run_id'` and match them against the row's `tenant_id` and `id` columns respectively. **The runner never holds the Supabase service-role key.** If the runner-process code is compromised, the worst it can do is read/write its *own* tenant's *own* run's rows — the database engine refuses everything else.

## Mint endpoint

- **URL:** `POST /functions/v1/mint-runner-token`
- **Caller:** the job dispatcher inside the web app (Vercel serverless route or Edge Function), running with the user's authenticated Supabase session.
- **Authorization to call:** the caller MUST present a valid web-session JWT for a user who is an `owner`/`admin`/`member` of the tenant that owns `run_id`. The Edge Function verifies membership via the same `tenant_members` table the RLS policies use — same source of truth, no duplicated logic.
- **Inputs (request body, JSON):**
  ```json
  {
    "run_id": "01HXY9C8…ZK",        // ULID; must exist in runs and belong to the caller's tenant
    "runner_kind": "hosted-worker", // or "cli-companion"
    "runner_fingerprint": "…"        // hosted: worker hostname + container id; CLI: cli_pairings.id + public_key sig
  }
  ```
- **Output:**
  ```json
  {
    "token": "<JWT>",
    "expires_at": "2026-05-11T12:34:56Z",
    "jti": "9b1a…f7"
  }
  ```

## Claims

| Claim | Value | Why |
|---|---|---|
| `sub` | the runner's identifier (`worker:<hostname>` or `cli:<pairing_id>`) | identifies the principal |
| `tenant_id` | `runs.tenant_id` for the requested `run_id` | the canonical claim read by every RLS policy via `auth.tenant_id()` |
| `run_id` | the requested `run_id` | scopes the runner JWT to ONE run (defence-in-depth — even within the right tenant, the runner can only touch its own run's rows) |
| `role` | `"runner"` | read by `auth.claim_role()`; gates runner-only policies like `runs_runner_select` |
| `iat` | now | issued-at |
| `exp` | iat + 5 min (300s) | short-lived; renewed by re-mint at runtime |
| `aud` | `"studio-zero/runner"` | aud-bound |
| `iss` | `"studio-zero/mint-runner-token"` | iss-bound |
| `jti` | uuid v4 | unique identifier; persisted to `runner_token_mints.jti` for revocation lookup |

`tenant_id` and `run_id` are the load-bearing claims. The RLS policies in `rls-policies.sql` are written so a policy that requires the runner role ALSO requires both claims to match the target row — no single-claim escape.

## Rotation

- **Per run, not per request.** A run that takes 10 minutes re-mints once mid-run. A run that takes 4 minutes uses one mint.
- **TTL ≤ 5 min.** If the runner needs longer, the runner asks for a new token via a tiny refresh RPC (`/functions/v1/refresh-runner-token`) that re-validates the same membership check and re-mints with the same claims set.
- **Never re-used across runs.** Every run gets a fresh JWT; old JWTs from prior runs are not honored even within their TTL because their `run_id` claim no longer matches an active row's `id`.
- **Revocation:** `runner_token_mints.revoked_at`. Revoked JWTs fail the `auth.runner_run_id()` policy check immediately because we add an extra policy clause that joins to `runner_token_mints` and rejects rows whose `revoked_at IS NOT NULL` — this is added in the M1 migration alongside the policies that depend on it (see `migration-order.md` 0002).

## Audit trail

Every mint writes a row to `runner_token_mints`:

| Column | Why |
|---|---|
| `tenant_id` | which tenant the token was minted for |
| `run_id` | which run it was scoped to |
| `jti` | matches the JWT `jti` claim |
| `issued_at` / `expires_at` | window of validity |
| `token_sha256` | sha256 of the JWT itself for revocation lookup (we never store the secret) |
| `revoked_at` | when (if ever) the token was revoked |
| `issued_to` | hostname / worker id that requested the mint |

This table is admin-readable only (RLS denies all client roles). It is the artefact that closes Atlas v0.2 Blocker B2's audit-trail requirement: every short-lived runner JWT is accounted for, and a forensic review of a compromised tenant can answer "did any runner ever exfiltrate beyond this tenant?" by joining `runner_token_mints` ↔ `runs` ↔ access logs.

Every mint also writes a row to `audit_logs` with `action = 'runner_token_minted'` (see `tables.sql`). This is redundant with `runner_token_mints` and intentionally so — `audit_logs` is the SOC2/GDPR retention surface; `runner_token_mints` is the operational revocation surface. Two writes, two purposes.

## Service-role usage boundaries (where the key IS used)

The Supabase service-role key bypasses RLS. Studio Zero uses it ONLY in these well-defined server-only places, never in code that touches customer-supplied input directly:

1. **Stripe webhook handler.** Stripe is the source of truth for subscription state. The webhook handler INSERTs to `billing_events` and UPSERTs to `subscriptions` with service-role. The webhook is signed (PRD §17 Penny + Ledger sign-off); signature verification happens before any DB write.
2. **The mint-runner-token Edge Function.** It needs service-role to write to `runner_token_mints` (which denies all client roles). It does NOT need service-role for the membership-check SELECT — that goes through a normal `authenticated` session.
3. **The audit_log_write() SECURITY DEFINER function.** It runs as the function owner (service-role-equivalent) to append to `audit_logs`. It is the *only* path to write `audit_logs`; the function validates its input and rejects callers who can't prove their tenant context.
4. **Nightly retention jobs (pg_cron).** Cryptoshredding, `data_exports` purges, `audit_logs` partition rotation. All pg_cron-scheduled, all logged.
5. **Admin tooling (separate UI, MFA-gated, IP-allowlisted).** Reading `breach_events`, managing `score_engine_versions`. NEVER bound to a customer-facing surface.

What is explicitly NOT on this list: the runner. The runner is a customer-facing surface from a threat-model perspective (it executes against customer code and is reachable via the prompt-injection corpus that Verify ships) and therefore must NEVER hold the service-role key.

## What this fixes (v0.2 Blocker B2)

From Atlas's v0.2 panel review:

> **The runner must *never* execute queries using the Service Role key.** Implement a Supabase Edge Function or an auth-hook that generates a short-lived, tenant-scoped JWT for the runner whenever it picks up a job. The runner must authenticate to Postgres using this JWT so that `auth.jwt() ->> 'tenant_id'` evaluates correctly, enforcing Postgres RLS at the database engine level even if the runner's code is compromised.

This document, the `runner_token_mints` table, the `mint-runner-token` Edge Function, and the runner-role policies in `rls-policies.sql` together implement that. The Verify test that closes the loop is `integration/rls-cross-tenant.spec.ts` (PRD §18.5 Goal 5): a runner JWT minted for tenant A cannot SELECT a `findings` row in tenant B — query returns zero rows, not an error.

## Cross-references

- `architecture/database/tables.sql` — `runner_token_mints` table definition.
- `architecture/database/rls-policies.sql` — every `*_runner_select` / `*_runner_insert` policy that consumes `auth.tenant_id()` + `auth.runner_run_id()` + `auth.claim_role()`.
- `architecture/database/migration-order.md` — `0002_rls_and_runner_jwt.sql` ships this alongside RLS policies at M1.
- `shared_context/projects/studio-zero-productization/prd-review-atlas.md` — the original B2 finding.
- PRD §13.5 — Multi-tenancy isolation section that this implements.
- PRD §17 D9 — SSRF / prompt-injection / redaction / ingestion at M0/M1 mandatory (the runner is the threat surface this defends).
- PRD §18.5 Goal 5 acceptance test that this enables.
