# Supabase — Project Bootstrap

**Vendor:** Supabase (Pro plan, $25/mo org-flat)
**Region pin:** `us-east-1` (AWS Virginia) — per PRD §14.4 + ARCH-D2 region co-location with Vercel iad1 + Railway us-east.
**Owner:** Terra (project lifecycle) + Atlas (schema, RLS, migrations) + Cipher (Vault) + Pipeline (Edge Function CI).
**Status at M0:** **STUB** — Jo creates the project at M0 wk-1; Atlas applies `0001_initial.sql` wk-2.

> **Why Supabase Pro at M0 (not Free).** Free tier pauses projects after 1 week of inactivity, which destroys staging-style "weekend gap" usage patterns and risks data loss. Pro tier ($25/mo) gives daily backups + 7-day PITR + 8 GB DB + 100 GB egress + 2M Edge Function invocations included — comfortable budget through M5. Listed in `finance/runway.md` §1.

## Project identity

| Field                  | Value (M0 placeholder)                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Project name           | `studiozero`                                                                                           |
| Org name               | `studio-zero` (Jo's personal org at M0; converts to team org at M5+)                                   |
| Region                 | `us-east-1` (AWS Virginia) — **HARD region pin per ARCH-D2**                                           |
| Database password      | generated at project create; stored in Jo's password manager + 1Password vault item "supabase-db-root" |
| Project reference (ID) | TBD on creation — captured into `TF_VAR_supabase_project_ref`                                          |
| Project URL            | TBD on creation — captured into `NEXT_PUBLIC_SUPABASE_URL` (format: `https://<ref>.supabase.co`)       |
| Anon (public) key      | TBD on creation — captured into `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                        |
| Service-role key       | TBD on creation — captured into `SUPABASE_SERVICE_ROLE_KEY` (server-side ONLY; never browser)          |

> **Staging project.** A second project `studiozero-staging` provisioned at M1 close in the same region for PR-preview deploys. Same `config.toml` shape; separate URL + keys. Listed at `architecture/iac/supabase/staging-project.md` (deferred — Atlas writes at M1).

## What Supabase gives us (component map)

Per `architecture/system-diagram.md` §1:

| Sub-service           | Used for                                                                                                                | M0 status     | Notes                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres + RLS        | All tenant data                                                                                                         | **M0**        | Atlas applies `0001_initial.sql` wk-2; RLS policies enforce tenant isolation                                                                |
| Auth (GoTrue)         | Email + Google + GitHub OAuth                                                                                           | **M0**        | Providers wired via `config.toml`                                                                                                           |
| Vault (pgsodium TCE)  | BYOK API keys + GitHub App tokens + per-run encryption keys                                                             | **M1**        | XChaCha20-Poly1305 AEAD with `tenant_id::text` AAD per Cipher Fix-4; `vault.decrypt_byok()` function ships in `0002_rls_and_runner_jwt.sql` |
| Storage               | Evidence blobs (screenshots, transcripts), exported reports                                                             | **M1**        | RLS-scoped; private buckets only                                                                                                            |
| Realtime              | Per-run channels `runs:<run_id>` (ARCH-D5)                                                                              | **M0**        | Channel subscribe gated by RLS-aware filter                                                                                                 |
| Edge Functions        | `mint-runner-token`, `byok-validate`, `score-engine`, `stripe-webhook`, `github-webhook`, `jury-reaudit-gate` (ARCH-D7) | **M1 onward** | See `edge-functions/README.md` for the per-function ship schedule                                                                           |
| pg-boss (in Postgres) | Job queue (ARCH-D1)                                                                                                     | **M1**        | Atlas installs in `0003_pg_boss_install.sql`                                                                                                |

## What Terra owns vs what Atlas owns

| Concern                                                             | Owner                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Project existence + region pin + Pro tier + access tokens           | **Terra** (this file)                                       |
| `config.toml` content (auth providers, statement_timeout, max_rows) | **Terra** with Atlas review                                 |
| `tables.sql` + `rls-policies.sql` + migrations                      | **Atlas** (`architecture/database/`)                        |
| Vault secret schema + AAD enforcement function                      | **Cipher** + **Atlas** (`0002_rls_and_runner_jwt.sql`)      |
| Edge Function code                                                  | **Atlas** writes; **Pipeline** deploys via CLI              |
| Storage buckets + RLS policies on buckets                           | **Atlas**                                                   |
| Database backups + PITR                                             | **Supabase-managed** (Pro tier default: daily + 7-day PITR) |
| Disaster recovery runbook                                           | **Watch** (M4)                                              |

## M0 bootstrap actions (manual, one-time)

Jo executes (or Terra walks Jo through):

1. **Create Supabase account** at supabase.com → upgrade to Pro plan ($25/mo billed annually preferred for ~$20/mo effective; otherwise monthly).
2. **Create project** `studiozero` in **us-east-1**. Strong DB password (24+ chars random); stash in Jo's password manager.
3. **Issue Supabase access token** at Account → Access Tokens (Terraform/CLI scope). Save as local env `SUPABASE_ACCESS_TOKEN`.
4. **Capture project ref + URL + anon key + service-role key** from Project Settings → API. Wire into Vercel env-vars per `vercel/env-vars.md`.
5. **Confirm region** = `us-east-1`; **confirm Postgres major version** = `15.x` (default at time of writing — matches the `pg-boss` + `pgsodium` extension compatibility matrix).
6. **Enable Vault** at Project Settings → Vault → Initialize (one-time; generates the master key — managed by Supabase). Cipher Fix-4 cipher rotation cadence: see `secrets/key-rotation.md`.
7. **Wire Auth providers**:
   - Email/password: enabled by default; configure Site URL = `https://studiozero.dev` (will fail until Cloudflare DNS lands wk-2; placeholder URL until then)
   - Google OAuth: create OAuth credentials at Google Cloud Console → Studio Zero project; paste client_id + client_secret into Supabase Auth → Providers → Google
   - GitHub OAuth: create OAuth App at github.com/settings/applications → Studio Zero; paste into Supabase Auth → Providers → GitHub
8. **Apply `config.toml`** via Supabase CLI (`supabase link` + `supabase config push`) — see `config.toml` in this directory.
9. **Wait for Atlas** to land `0001_initial.sql` (M0 wk-2). Atlas runs `supabase db push` from local dev to apply.
10. **Smoke**: `psql $DATABASE_URL -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"` → returns expected table count from `0001_initial.sql`.

## Database password rotation

Per Cipher Fix-4: 90-day cadence. Jo rotates via Supabase dashboard → Project Settings → Database → "Reset database password". Connection strings refresh automatically; service-role JWT is unaffected (it's signed with a separate Supabase-managed JWT secret).

## Backups + disaster recovery

Pro tier defaults:

- **Daily backups** retained 7 days
- **PITR (point-in-time-recovery)** 7-day window
- **Read replica** NOT enabled (additional cost; not needed at MVP scale per `unit-economics.md` §1)

At M4 (Watch milestone), Terra + Watch publish a DR runbook covering: (a) accidental DROP TABLE; (b) bad migration rollback; (c) region-wide AWS outage (paper plan only — RTO is "wait for AWS"). M5+ may add cross-region async replica for true HA.

## M1+ Terraform conversion plan

Supabase has a Terraform provider (`supabase/supabase`) that manages **project settings only** — not schema, not RLS, not Edge Function deploys (those stay CLI-driven). At M1, Terra writes:

- `architecture/iac/supabase/provider.tf` (provider block, `SUPABASE_ACCESS_TOKEN` env)
- `architecture/iac/supabase/settings.tf` (mirrors motionmax's pattern; statement_timeout, max_rows, site_url, storage)
- `architecture/iac/supabase/variables.tf` + `terraform.tfvars.example`
- `architecture/iac/supabase/outputs.tf` (pulls API keys via `data "supabase_apikeys"` for downstream wiring)

State backend stays local through M1; Terraform Cloud at M2 with the Vercel state.

## Drift-check protocol

Weekly (Mon):

- `supabase projects api-keys --project-ref $TF_VAR_supabase_project_ref` — verify anon + service-role keys match Vercel env-vars
- Dashboard → Auth → Providers → check Google + GitHub OAuth still enabled; site URL still `https://studiozero.dev`
- Dashboard → Project Settings → Vault → confirm initialized
- Dashboard → Database → Extensions → confirm `pgsodium`, `pg_cron` (when needed), `pg-boss` (M1+), `pg_graphql` (default-on; harmless)

Any drift → log + same-day fix.

## Cross-references

- `architecture/iac/supabase/config.toml` (CLI-driven project settings)
- `architecture/iac/supabase/seed.sql` (dev-time seed data)
- `architecture/iac/supabase/migrations/README.md` (pointer to canonical migrations)
- `architecture/iac/supabase/edge-functions/README.md` (per-function ship schedule + secrets)
- `architecture/iac/secrets/vault-keys.md` (Vault secret inventory)
- `architecture/decisions.md` ARCH-D1, ARCH-D2, ARCH-D3, ARCH-D7
- `architecture/database/migration-order.md` (Atlas-owned migration sequence)

---

_Terra · Supabase · M0 manual-bootstrap notes._
