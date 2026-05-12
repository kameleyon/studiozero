# Vercel — Project Bootstrap

**Vendor:** Vercel (Pro plan, $20/mo · 1 seat)
**Region pin:** `iad1` (US-east, Virginia)
**Owner:** Terra (IaC) + Forge (deploy ergonomics) + Pipeline (CI workflow)
**Status at M0:** **LIVE** — Forge has shipped the Next.js scaffold; the project deploys at `studiozero-omega.vercel.app`.

> **Why Vercel at M0:** PRD §13.1 + ARCH-D2 co-locate the Web App with Supabase us-east-1. RTT budget for runner→DB stays < 5ms p50, which is what makes PRD §14.1 web TTFB < 500ms achievable. No alternative host can match this co-location cost profile.

## Project identity

| Field                    | Value                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Project name             | `studiozero-omega`                                                                                                               |
| Vercel team              | (Jo's personal team — single-seat at M0; team account at M5+)                                                                    |
| Deployment URL (default) | `https://studiozero-omega.vercel.app`                                                                                            |
| Custom domain (M0 wk-2)  | `https://studiozero.dev` (apex) + `https://www.studiozero.dev`                                                                   |
| Custom domain (post-M0)  | `app.studiozero.dev` (authenticated app shell — added at M1)                                                                     |
| Connected Git repo       | `github.com/kameleyon/studiozero` (master branch = prod; PR previews enabled)                                                    |
| Root Directory           | `apps/web`                                                                                                                       |
| Framework preset         | Next.js                                                                                                                          |
| Node.js Version          | `20.x` (Vercel default for Next.js 15)                                                                                           |
| Build Command            | `cd apps/web && npm install --legacy-peer-deps && npm run build` (per repo-root `vercel.json`)                                   |
| Install Command          | `cd apps/web && npm install --legacy-peer-deps` (per repo-root `vercel.json`)                                                    |
| Output Directory         | `apps/web/.next` (per repo-root `vercel.json`)                                                                                   |
| Functions region pin     | `iad1` ONLY (set in `vercel.json` `"regions": ["iad1"]` — paid Vercel feature; required for co-location with Supabase us-east-1) |
| Edge Functions region    | iad1 (where supported)                                                                                                           |

## Deployment topology

```
GitHub kameleyon/studiozero
   master ──────► Vercel production (studiozero.dev + studiozero-omega.vercel.app)
   PR branches ─► Vercel preview deployments (auto-generated subdomain)
```

- **Production protection:** required GitHub status checks (CI gates from `architecture/test-strategy.md`) must pass before merge to `master`. Pipeline owns the CI workflow file (`.github/workflows/ci.yml`).
- **Preview deployments:** unprotected by default; can be password-gated later if a marketing-preview leak risk surfaces.
- **Rollback:** Vercel dashboard → Deployments → Promote-to-Production on any prior green deploy. <30s rollback time.

## What Terra owns vs what Forge owns

| Concern                                                            | Owner                                                                                                                                          |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Project existence + region pin + Root Directory + GitHub link      | **Terra** (this file)                                                                                                                          |
| `vercel.json` content (build commands, regions, headers, rewrites) | **Forge** (repo-root file) — Terra reviews                                                                                                     |
| Env-var inventory (which secret, who provides, which target)       | **Terra** (`env-vars.md`) — agents provide values                                                                                              |
| Custom domains + SSL                                               | **Terra** (`domains.md` + Cloudflare DNS)                                                                                                      |
| API route deployment                                               | **Forge** (writes routes); **Pipeline** (CI)                                                                                                   |
| Edge Function deployment                                           | **Atlas** (writes functions); **Pipeline** (`supabase functions deploy` from CI) — NOT Vercel functions; Edge Fns live in Supabase per ARCH-D7 |

## M0 bootstrap actions (manual, one-time)

Jo executes:

1. **Confirm Vercel team identity** — single-seat Pro plan in Jo's name. Capture `vercel_team_id` from Team Settings → General → save to local env file as `TF_VAR_vercel_team_id`.
2. **Verify project Root Directory** = `apps/web` in Vercel dashboard → Project Settings → General. (Forge set this at scaffold time; Terra verifies.)
3. **Verify region pin** — Vercel dashboard → Project Settings → Functions → Region = `Washington, D.C., USA (iad1)`. Edge Network: leave global.
4. **Issue Vercel API token** — Account Settings → Tokens → "Create" → scope to `studiozero-omega` project → save to local env file as `TF_VAR_vercel_api_token`. **Cycle quarterly.**
5. **Custom domain wiring** (after Cloudflare DNS is set up — see `cloudflare/dns.md`):
   - Vercel dashboard → Project → Domains → Add → `studiozero.dev` → choose "Use a third-party DNS provider"
   - Vercel issues CNAME target (e.g., `cname.vercel-dns.com`) — copy this into Cloudflare DNS for the apex + `www`
   - Vercel auto-issues SSL via Let's Encrypt once DNS propagates (~5 min)
6. **Env-vars** — populate per `env-vars.md` (do NOT commit values; use Vercel dashboard or `vercel env add` CLI). Mark Production + Preview separately.

## M1+ Terraform conversion plan

At M1, Terra writes `architecture/iac/vercel/*.tf` mirroring the motionmax pattern (`provider.tf`, `project.tf`, `env.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, `terraform.tfvars.example`). The Vercel provider supports:

- `vercel_project` resource — name, framework, region, root directory, git repo link
- `vercel_project_environment_variable` — per-env-var, per-target (production / preview), `sensitive = true`
- `vercel_project_domain` — custom domain bindings

State backend stays local through M1; moves to Terraform Cloud free tier at M2 (when Pipeline starts running `terraform plan` in CI).

## Drift-check (weekly, Mon)

Jo or Pipeline runs:

```bash
# Pull Vercel project config (idempotent read)
vercel project ls
vercel env ls --environment production
vercel env ls --environment preview
vercel domains ls
```

Diff output against `vercel/env-vars.md` + `vercel/domains.md`. Any mismatch → append-row in `architecture/iac/drift-log.md` with `vendor=vercel, surface=<surface>, diff=<one-line>, fix-owner=<agent>, fix-deadline=<date>`.

## Cross-references

- Repo-root `vercel.json` (Forge-owned; build + region config)
- `architecture/iac/vercel/env-vars.md` (env-var inventory)
- `architecture/iac/vercel/domains.md` (domain plan + SSL)
- `architecture/iac/cloudflare/dns.md` (DNS records pointing at this project)
- `architecture/decisions.md` ARCH-D2 (Railway us-east — same physical region)
- `architecture/system-diagram.md` §8 (region pin rationale)

---

_Terra · Vercel · M0 manual-bootstrap notes._
