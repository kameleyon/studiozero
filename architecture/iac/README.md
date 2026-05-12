# Studio Zero — Infrastructure as Code

**Phase:** 9 — Build (M0 ticket-0)
**Owner:** Terra (DevOps · Infrastructure-as-Code)
**Coordinates with:** Pipeline (CI/CD), Atlas (DB hosting), Watch (metric targets), Cipher (Vault), Shield (sandbox + WAF)
**Status:** M0 manual-bootstrap stubs. Full Terraform/Pulumi conversion lands at M1+.
**Closes:** Phase-5 Jury Major M1 ("IaC directory empty") · sprint risk R12 ("IaC absence blocks all M0 testing").

> **Click-Ops is forbidden — but the M0 cushion is honest.** This directory is the **single source of truth** for what platform surfaces exist, in which region, with which env-vars and which owner. Until Terraform-driven apply lands at M1, M0 surfaces are **bootstrapped manually following the notes here**; what is documented IS the state. Anything provisioned manually that is _not_ recorded here is treated as drift and must be reconciled into a doc before the next migration ships.

---

## 1. What's provisioned at M0 (manual one-time bootstrap)

These exist as one-time manual provisioning steps. Operator (Jo) follows the per-vendor `project.md` to stand each one up. Drift-detection is a weekly manual diff (§4 below).

| Surface                                                 | Vendor         | Region                  | Doc                                               | M0 status                                                                       |
| ------------------------------------------------------- | -------------- | ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Web app + Marketing                                     | Vercel         | iad1 (US-east)          | `vercel/project.md`                               | **LIVE** — Forge shipped scaffold; deployed at `studiozero-omega.vercel.app`    |
| Postgres + Auth + Vault + Storage + Realtime + Edge Fns | Supabase       | us-east-1               | `supabase/project.md`                             | **STUB** — Jo creates project at M0 wk-1; Atlas applies `0001_initial.sql` wk-2 |
| Runner pool                                             | Railway        | us-east (Virginia)      | `railway/project.md`                              | **STUB** — service stood up at M0; first `runner-worker` deploys at M1          |
| DNS + CDN + WAF                                         | Cloudflare     | global edge             | `cloudflare/dns.md` + `cloudflare/zone-config.md` | **STUB** — Jo registers `studiozero.dev` + transfers zone at M0 wk-2            |
| Error tracking                                          | Sentry         | US cloud                | `observability/sentry.md`                         | **STUB** — project created at M0 close                                          |
| Product analytics                                       | PostHog        | US cloud                | `observability/posthog.md`                        | **STUB** — project created at M0 close; consent-gated init                      |
| Secrets                                                 | Supabase Vault | us-east-1 (co-resident) | `secrets/vault-keys.md`                           | **SPEC** — Cipher Fix-1 `vault.decrypt_byok()` ships M1                         |

## 2. What's IaC-automated (Terraform-driven at M1+)

| Surface                                                           | When it converts to Terraform                                              | Owner            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------- |
| Vercel project + env-vars + domain bindings                       | M1 (after first staging env stabilizes)                                    | Terra            |
| Cloudflare zone + DNS records + WAF managed ruleset               | M1 (DNS records stop changing)                                             | Terra            |
| Supabase project settings (statement_timeout, max_rows, site_url) | M1 (settings tuned for prod)                                               | Terra + Atlas    |
| Railway service + region + Dockerfile + healthcheck               | M1 (runner package ships from Forge)                                       | Terra + Forge    |
| Sentry alert rules (JSON-importable)                              | M2 (alert rules stabilize after Watch wires runbooks)                      | Watch + Terra    |
| Edge Function deploys                                             | M1 (functions ship via `supabase functions deploy` from CI; not Terraform) | Pipeline + Atlas |
| Database migrations                                               | M0 onward (Supabase CLI `db push` from CI)                                 | Atlas + Pipeline |
| Status page                                                       | M4 (Watch + Siren milestone — see `observability/status-page.md`)          | Watch + Terra    |

Per-vendor layout matches the motionmax pattern (`provider.tf` + `variables.tf` + `terraform.tfvars.example` + resource files). State backend lives **local on operator workstation** through M1 (gitignored `.tfstate`); we move to a shared backend (Terraform Cloud free tier, or Supabase Postgres `pg` backend) when a second operator is added (post-M5).

## 3. Provider auth setup (where each token comes from)

Tokens are **never committed**. They land in operator's local `~/.config/terraform/credentials` or the GitHub Actions secrets store (when CI starts applying at M1+). For local apply, export `TF_VAR_*` env vars in the shell. For CI, configure the same names as GitHub repo secrets.

| Token                         | Where issued                                                                                                      | Where stored locally              | Where stored in CI (M1+)                 | Rotation cadence                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------- | ---------------------------------- |
| `TF_VAR_vercel_api_token`     | Vercel dashboard → Account Settings → Tokens (scoped to `studiozero-omega` project)                               | `~/.config/terraform/credentials` | GitHub Actions secret `VERCEL_API_TOKEN` | Quarterly (90d)                    |
| `TF_VAR_vercel_team_id`       | Vercel dashboard → Team Settings → General                                                                        | local env file                    | GH secret `VERCEL_TEAM_ID`               | Never (identifier, not credential) |
| `TF_VAR_cloudflare_api_token` | Cloudflare dashboard → My Profile → API Tokens (Zone:DNS edit + WAF edit scopes; pinned to `studiozero.dev` zone) | local env file                    | GH secret `CLOUDFLARE_API_TOKEN`         | Quarterly (90d)                    |
| `TF_VAR_cloudflare_zone_id`   | Cloudflare dashboard → `studiozero.dev` zone → Overview                                                           | local env file                    | GH secret `CLOUDFLARE_ZONE_ID`           | Never                              |
| `SUPABASE_ACCESS_TOKEN`       | Supabase dashboard → Account → Access Tokens (provider reads this env var directly — no `TF_VAR_` prefix)         | local env file                    | GH secret `SUPABASE_ACCESS_TOKEN`        | Quarterly (90d)                    |
| `TF_VAR_supabase_project_ref` | Supabase dashboard → Project Settings → General → Reference ID                                                    | local env file                    | GH secret `SUPABASE_PROJECT_REF`         | Never                              |
| `RAILWAY_TOKEN`               | Railway dashboard → Account → Tokens (no Terraform provider; CLI-only)                                            | local `~/.railway/auth.json`      | GH secret `RAILWAY_TOKEN`                | Quarterly (90d)                    |
| `SENTRY_AUTH_TOKEN`           | Sentry → User Auth Tokens (scoped to `studio-zero` org)                                                           | local env file                    | GH secret `SENTRY_AUTH_TOKEN`            | Quarterly (90d)                    |
| `POSTHOG_PERSONAL_API_KEY`    | PostHog → Account → Personal API Keys                                                                             | local env file                    | GH secret `POSTHOG_PERSONAL_API_KEY`     | Quarterly (90d)                    |

> **Single-operator caveat at M0:** Jo holds every token. When a second human joins (post-M5), tokens rotate immediately and operator-token ownership moves to a shared password manager (1Password — paid line item in `finance/unit-economics.md` §1 already).

## 4. Drift-detection cadence

Discipline per Terra's persona: _if it's in a cloud console UI and not codified here, it doesn't exist_. The drift-check below catches the M0 manual-bootstrap window before the first Terraform apply.

| Check                                                                                            | Frequency                                 | Owner         | Where the log lands                              |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------- | ------------------------------------------------ |
| **Vercel project settings + env-var inventory** (diff dashboard vs `vercel/env-vars.md`)         | Weekly (Mon)                              | Jo + Pipeline | `architecture/iac/drift-log.md` (append-only)    |
| **Supabase project settings** (auth providers, statement_timeout, RLS-enabled tables)            | Weekly (Mon)                              | Atlas + Terra | same log                                         |
| **Cloudflare DNS records** (`cf-cli` export vs `cloudflare/dns.md`)                              | Weekly (Mon)                              | Jo            | same log                                         |
| **Railway service config** (railway.json vs deployed config)                                     | Weekly (Mon)                              | Forge         | same log                                         |
| **GitHub Actions secrets inventory** (count + names vs `secrets/vault-keys.md` external section) | Weekly (Mon)                              | Pipeline      | same log                                         |
| **`terraform plan` (per provider)**                                                              | Weekly (Fri) — once Terraform lands at M1 | Terra         | log to `architecture/iac/plan-output/<date>.txt` |
| **Cost report (current month projected spend per vendor)**                                       | Weekly (Fri)                              | Meter         | `finance/burn-log.md`                            |

Drift triggers a fix-it ticket the same day. **No "we'll fix it in the dashboard for now."** If the dashboard is wrong, the doc is wrong, or vice versa — pick one, fix the other, log the reconciliation.

## 5. Cost projection (M0–M5)

Per `finance/runway.md` §1. Numbers are **pre-launch monthly fixed burn**; usage-tier overages tracked separately in `finance/unit-economics.md`.

| Vendor                                            | Plan                                                  | $/mo              | Activates | Source                           |
| ------------------------------------------------- | ----------------------------------------------------- | ----------------- | --------- | -------------------------------- |
| Vercel                                            | Pro (1 seat = Jo)                                     | $20               | M0 wk 1   | `unit-economics.md` §0           |
| Supabase                                          | Pro (org-flat)                                        | $25               | M0 wk 1   | `unit-economics.md` §0           |
| Railway                                           | Team plan (1 seat)                                    | $20               | M0 wk 1   | `unit-economics.md` §0           |
| Railway                                           | Compute pre-launch (dev + nightly self-dogfood) `EST` | $15               | M0 wk 1   | EST (~30 dev audits/mo × $0.038) |
| Cloudflare                                        | WAF Pro                                               | $25               | M0 wk 1   | `unit-economics.md` §0           |
| Sentry                                            | Team                                                  | $26               | M0 wk 1   | `unit-economics.md` §0           |
| PostHog                                           | Free tier (1M events/mo)                              | $0                | M0 wk 1   | covers MVP                       |
| Resend                                            | Free tier (3k emails/mo)                              | $0                | M4 wk 14  | covers M4                        |
| Domain (`studiozero.dev`)                         | Cloudflare Registrar at cost                          | $20/yr ≈ $1.67/mo | M0 wk 2   | EST                              |
| Misc SaaS (1Password / GitHub Pro / Linear) `EST` | —                                                     | $30               | M0 wk 1   | EST                              |
| **Total fixed M0–M4 monthly**                     |                                                       | **$161**          |           |                                  |

One-time vendor costs (pentest $22.5k + WCAG $10k) tracked in `finance/runway.md` §1 — they are **not** IaC line items; they sit in `compliance/`.

## 6. Bootstrap order (the manual M0 wk-1 → wk-2 sequence)

For Jo to execute, in order. Each step yields a value that unblocks the next.

1. **Cloudflare account + register `studiozero.dev`** (Cloudflare Registrar; ~$20/yr at cost) → yields `cloudflare_zone_id`.
2. **Vercel account already exists** (deployment live at `studiozero-omega.vercel.app`) → verify `vercel_team_id`; add custom domain `studiozero.dev` once Cloudflare records propagate (DNS first → Vercel verifies → SSL auto).
3. **Supabase account + create project** `studiozero` in **us-east-1** → yields `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. **Railway account + create project** `studiozero-runner-pool` (us-east) → yields `RAILWAY_TOKEN`, service `runner-worker` placeholder (no deploy yet — Forge ships container at M1).
5. **Sentry account + create project** `studio-zero` (US cloud) → yields `SENTRY_DSN`.
6. **PostHog account + create project** `studio-zero` (US cloud) → yields `NEXT_PUBLIC_POSTHOG_KEY`.
7. **Wire env-vars into Vercel** per `vercel/env-vars.md` (Production + Preview targets).
8. **Atlas applies `0001_initial.sql`** to Supabase (M0 wk-2 deliverable).
9. **Terra adds CNAME `studiozero.dev` → Vercel** in Cloudflare DNS (`cloudflare/dns.md`).
10. **Verify smoke**: `curl https://studiozero.dev/healthz` → 200; Vercel build green; Supabase migration applied; first `terraform plan` (when Terraform lands at M1) shows no drift.

## 7. What's intentionally NOT here at M0

- **Railway Terraform provider** — Railway has no first-class Terraform provider; `railway.json` + dashboard until that ships. Same workaround motionmax uses today.
- **Edge Function deploys** — Supabase functions deploy via CLI (`supabase functions deploy`) not Terraform. Pipeline owns the workflow file at M1.
- **Database migrations** — Atlas owns; Supabase CLI applies. Terraform doesn't run SQL.
- **Status page** — M4 deliverable (Watch). See `observability/status-page.md`.
- **GitHub App registration** — One-time manual step at M1 (Forge + Comply). Not an IaC surface; App credentials land in Vault.
- **Stripe** — One-time account creation at M2 (Ledger). API keys land in Vercel env-vars; webhook secret lands in Supabase Vault.

## 8. Cross-references

- `architecture/decisions.md` ARCH-D1 (pg-boss), ARCH-D2 (Railway us-east), ARCH-D3 (mint-runner-token), ARCH-D7 (Edge Fn boundary), ARCH-D8 (multi-region deferral).
- `architecture/system-diagram.md` §8 hosting/region decisions.
- `sprint/milestone-M0.md` ticket-0 (this dir is the deliverable).
- `sprint/owner-matrix.md` R12 (closed by this dir landing in HEAD).
- `finance/runway.md` §1 + §5 (cost baseline + crunch points).
- `finance/unit-economics.md` §0 (vendor pricing source-of-truth).

---

_Terra — DevOps Layer. M0 stubs deployable; Terraform-as-state-truth lands M1+._
