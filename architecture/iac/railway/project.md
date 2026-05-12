# Railway — Runner Pool Bootstrap

**Vendor:** Railway (Team plan, $20/seat/mo + usage)
**Region pin:** `us-east` (Virginia DC) — matches Vercel iad1 + Supabase us-east-1 per ARCH-D2 region co-location.
**Owner:** Terra (project lifecycle) + Forge (Dockerfile + runner code) + Shield (seccomp + Cilium NetworkPolicy at M1) + Pipeline (CI deploy).
**Status at M0:** **STUB** — Jo creates the Railway project at M0 wk-1; first `runner-worker` deploy lands at M1 with Forge's runner package.

> **Why Railway (not Fly.io / Render / Fargate) per ARCH-D2.** Railway supports custom Dockerfiles with `security-opt no-new-privileges`, custom seccomp JSON, and per-service region pinning. RTT to Supabase us-east-1 < 5ms p50 — critical for the per-event Realtime writes during reviewer streaming (PRD §14.1 SLO budget). Fly.io's Firecracker primitive is the **V2 graduation host** per PRD D8 — Railway containers are the M1 ship; the runner code itself is portable (just `runner.runAudit()`) so the migration is mainly Dockerfile + IaC.

## Project identity

| Field                          | Value (M0 placeholder)                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project name                   | `studiozero-runner-pool`                                                                                                                                          |
| Region                         | `us-east` (Virginia DC)                                                                                                                                           |
| Service name (M1 first deploy) | `runner-worker`                                                                                                                                                   |
| Image base                     | `node:24-alpine` (Node 24 LTS — current as of 2026-05) **OR** `node:22-alpine` if Forge's runner package pins 22 LTS (Forge decides at runner-package write time) |
| Service count at M0            | 0 (stub project; no services deployed)                                                                                                                            |
| Service count at M1 ship       | 1 always-on container; horizontal scale to 2–3 at peak                                                                                                            |
| Resource per service           | 1 vCPU + 2 GB RAM (matches `finance/unit-economics.md` §2 cost calc — $0.000463/vCPU-min + $0.000231/GB-RAM-min)                                                  |
| Healthcheck path               | `GET /healthz` (returns 200 if worker process alive — see §4 below)                                                                                               |
| Auto-restart                   | enabled                                                                                                                                                           |
| Sleep mode                     | **DISABLED** (workers poll pg-boss; sleep would miss jobs)                                                                                                        |

## Sandbox primitives (Shield + Cipher own the actual JSON/YAML; Terra owns the wiring)

Per PRD §13.5 + ARCH-D2 + D8:

| Primitive                                                                                                                           | M0 status | M1 ship          | Owner                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------- | --------------------------- |
| Rootless container (`USER non-root` in Dockerfile, no `--privileged`)                                                               | spec      | ship             | Forge (Dockerfile)          |
| Dropped capabilities (`--cap-drop=ALL`, add back only `NET_BIND_SERVICE` if needed; runner uses no privileged ports so likely none) | spec      | ship             | Shield (seccomp profile)    |
| `security-opt no-new-privileges:true`                                                                                               | spec      | ship             | Terra (Railway service-opt) |
| Custom seccomp profile (`architecture/iac/runner-pool/seccomp.json` — Shield writes)                                                | not yet   | M1               | Shield                      |
| Cilium NetworkPolicy (egress allowlist enforcement primitive — open ARCH-D9 follow-up)                                              | not yet   | **M1 exit gate** | Shield + Cipher             |
| Egress allowlist (resolv.conf DNS-pin to allowed hostnames + Cilium drop-by-default)                                                | spec      | M1               | Shield                      |
| `--read-only` rootfs (runner writes only to a tmpfs mount under `/var/runs/<run_id>/`)                                              | spec      | M1               | Forge                       |

> **ARCH-D9 (open) is the M1 critical-path risk.** Egress allowlist enforcement on Railway requires a workable Cilium-equivalent primitive (Railway's underlying Kubernetes substrate may or may not expose NetworkPolicy CRDs to tenants — Shield validates at M1 entry). If it doesn't, the fallback is iptables in an initContainer + DNS pinning, which is **demonstrably leakier**. Sprint risk R13 names this. Pentest at M3 validates either way.

## Egress allowlist (TB-4 per system-diagram §2)

Outbound network connections from the runner container are restricted to:

| Hostname                                                                       | Purpose                                   |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| `*.supabase.co` (own project's host)                                           | Postgres + Realtime + Vault + Storage     |
| `api.anthropic.com`                                                            | LLM provider (BYOK or Managed)            |
| `api.github.com`                                                               | Repo clone + PR open (V1.5)               |
| `codeload.github.com`                                                          | git LFS / archive endpoints used by clone |
| `objects.githubusercontent.com`                                                | git LFS object storage                    |
| `<customer's audited URL host>` (per-run dynamic; allowlisted at job dispatch) | Surface audit headless-browser visits     |

Everything else → DROP. Shield writes the actual NetworkPolicy at M1.

## What Terra owns vs what Forge owns

| Concern                                                             | Owner                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Railway project existence + region pin + Team plan                  | **Terra** (this file)                                                |
| `railway.json` service spec (build, start, healthcheck, env-keys)   | **Terra** (this dir) — Forge reviews                                 |
| `Dockerfile` (runner image)                                         | **Forge** (writes at M1 from runner package)                         |
| Seccomp profile JSON + NetworkPolicy YAML                           | **Shield**                                                           |
| Runner code (`runner.runAudit()`, pg-boss worker loop, JWT refresh) | **Forge**                                                            |
| Env-vars (values)                                                   | per-secret owner agents; **Terra** wires them into Railway dashboard |
| Healthcheck endpoint implementation                                 | **Forge**                                                            |

## Env-vars (Railway dashboard, NOT Vercel)

These are runner-only secrets. Railway env-var store is separate from Vercel's; values are entered by Jo via Railway dashboard at the time the service exists (M1).

| Name                            | Provider-agent                                              | Activates | Notes                                                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SUPABASE_URL`                  | Terra                                                       | M1 wk-3   | Same value as Vercel's `NEXT_PUBLIC_SUPABASE_URL`                                                                                                                                                                        |
| `SUPABASE_RUNNER_BOOTSTRAP_KEY` | Cipher                                                      | M1 wk-3   | A boot-only key used to call `mint-runner-token` Edge Fn at worker startup; never used to access DB directly. Rotates quarterly. (Distinct from `SUPABASE_SERVICE_ROLE_KEY` — that one never leaves Vercel server-side.) |
| `RUNNER_HOSTNAME`               | Auto-injected by Railway                                    | M1        | Used in `mint-runner-token` JWT `sub` claim per ARCH-D3                                                                                                                                                                  |
| `NODE_ENV`                      | `production`                                                | M1        | static                                                                                                                                                                                                                   |
| `SENTRY_DSN`                    | Watch                                                       | M1        | Same Sentry project as web, different `environment` tag (`runner`)                                                                                                                                                       |
| `POSTHOG_KEY`                   | Lens                                                        | M1        | Server-side analytics; tenant_id HMAC-salted per Cipher Fix-3b                                                                                                                                                           |
| `LOG_LEVEL`                     | `info` (default); `debug` only by Jo's hand during incident | M1        | static                                                                                                                                                                                                                   |

> **No Anthropic key in Railway env.** BYOK keys live in Supabase Vault and decrypt per-run via `vault.decrypt_byok()` per Cipher Fix-1. Managed-tier shared key (Cortex's) lives in Vault as a single row keyed by `tenant_id='__managed__'` constant. Runner never sees an Anthropic key in its environment — only in memory for the duration of a single LLM call.

## M0 bootstrap actions (manual, one-time)

Jo executes (or Terra walks Jo through):

1. **Create Railway account** at railway.app → upgrade to Team plan (single seat at M0 — cost $20/mo).
2. **Create project** `studiozero-runner-pool` → set region to `us-east`.
3. **Do NOT create the service yet** — runner package doesn't exist until M1. Just confirm the project shell.
4. **Issue Railway token** at Account → Tokens → save as local env `RAILWAY_TOKEN`. **Rotate quarterly.**
5. **Capture Railway project ID** from dashboard → save to local env file. (No Terraform provider exists for Railway; this is for the CLI workflow only.)
6. **At M1 ship time:** Forge submits PR with `apps/runner/Dockerfile` + runner code; Pipeline workflow `.github/workflows/deploy-runner.yml` runs `railway up --service runner-worker` on merge to master.

## M0 stub `railway.json` (this directory's `railway.json`)

Lives at `architecture/iac/railway/railway.json` (see sibling file in this dir). Describes the service shape ahead of the actual deploy so Forge has a contract.

## M1+ Dockerfile (stub)

Lives at `architecture/iac/railway/Dockerfile` as a starter — full file lands when Forge writes the runner package at M1. See sibling file.

## Drift-check protocol

Weekly (Mon):

- `railway status` — verify project exists in us-east; service count matches expected
- `railway variables` — diff against env-var inventory above
- Dashboard → Service → Settings → confirm region still `us-east`, sleep mode still disabled

Any drift → log + same-day fix.

## Cross-references

- `architecture/decisions.md` ARCH-D1 (pg-boss queue), ARCH-D2 (Railway us-east), ARCH-D9 (egress primitive — open, M1 deadline)
- `architecture/threat-model.md` (Shield-owned; TB-4 + TB-5 + TB-6 covering runner egress)
- `architecture/iac/railway/railway.json` (service spec)
- `architecture/iac/railway/Dockerfile` (M1 stub)
- `finance/unit-economics.md` §2 (per-run COGS at $0.0046 Railway)

---

_Terra · Railway runner pool · M0 manual-bootstrap notes._
