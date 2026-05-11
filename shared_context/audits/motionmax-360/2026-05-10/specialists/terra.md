# §8 Infrastructure & Scaling — Terra audit

**Project:** motionmax-360
**Date:** 2026-05-10
**Reviewer:** Terra (Cloud Infrastructure & IaC)
**Audience:** tool-savvy creative adults, mobile-heavy, US-first launch
**Method:** Static analysis of `iac/`, `worker/`, `supabase/`, `vercel.json`, `.github/workflows/`, deployment manifests, and supporting docs.

---

## Headline

The repository advertises an `iac/` tree (`iac/cloudflare`, `iac/supabase`, `iac/vercel`), but **all three directories are empty**. The actual infrastructure is configured by clicking around in Vercel, Render, Supabase, and (likely) Cloudflare dashboards. Terra rule #1 — "Click-Ops is forbidden" — is violated end-to-end. Combined with a hard-coded production Supabase project ref baked into both frontend and worker, MotionMax has no functional dev/staging/prod separation; every push to `main` deploys directly to the same database that paying users hit.

---

## Findings (severity ordered)

### F1 — `iac/` tree is an empty placeholder (no IaC at all)
- **Severity:** Blocker
- **Evidence:** `iac/cloudflare/`, `iac/supabase/`, `iac/vercel/` directories listed but contain zero files (verified via directory enumeration of `C:\Users\Administrator\motionmax\iac\*`). No `.tf`, `.tfstate`, `pulumi.yaml`, `wrangler.toml`, or `vercel-config.json` anywhere in the repo (verified via grep for `terraform`, `pulumi`, `wrangler` — only references are in node_modules and audit docs).
- **Why it matters:** Per Terra's own platform rules and the studio's "Production readiness" gate, infra must be reproducible from code in minutes. Today the live environment is undocumented dashboard state. A Vercel project deletion, Render account loss, or accidental misclick is unrecoverable in any predictable timeframe — RTO claim of 30 min in `DISASTER_RECOVERY.md:55` is fiction without IaC.
- **Fix:** Codify three files immediately: `iac/vercel/project.json` (project + env scoping for production / preview), `iac/supabase/config.tf` (project, storage buckets, edge function deploy targets — Supabase Terraform provider supports project-level config), `iac/cloudflare/wrangler.toml` or Terraform (R2 bucket `pub-d259d1d2737843cb8bcb2b1ff98fc9c6` is referenced in `vercel.json:71` CSP — provision it as code). Backfill state via `terraform import` against existing dashboard resources.
- **Effort:** L

### F2 — Hard-coded production Supabase ref makes a separate staging environment impossible
- **Severity:** Blocker
- **Evidence:** `worker/src/lib/supabase.ts:13` declares `const EXPECTED_PROJECT_REF = "ayjbvcikuwknqdrpsdmj";` and `worker/src/lib/supabase.ts:20-26` calls `process.exit(1)` if `SUPABASE_URL` does not contain that exact ref. `supabase/config.toml:1` pins `project_id = "ayjbvcikuwknqdrpsdmj"`. `vercel.json:9, 13, 18` rewrites contain the literal production URL `https://ayjbvcikuwknqdrpsdmj.supabase.co`. `.env:1` ships the same prod URL committed to the repo as the default dev value. `worker/.env:1` ditto.
- **Why it matters:** Even if Jo provisions a staging Supabase project tomorrow, the worker will refuse to start against any project ref other than `ayjbvcikuwknqdrpsdmj`. Vercel rewrites will continue to proxy media through the production project. There is no path to test migrations, RLS changes, or edge function rewrites without touching production data.
- **Fix:** In `worker/src/lib/supabase.ts:13`, replace the constant with `process.env.SUPABASE_EXPECTED_PROJECT_REF` so each environment validates against its own ref. In `vercel.json:9, 13, 18`, replace the literal hostname with a build-time substitution from `VITE_SUPABASE_URL` (or a generic `${SUPABASE_REWRITE_HOST}` set per Vercel environment). Remove production credentials from committed `.env` files (use `.env.example` only).
- **Effort:** M

### F3 — Two conflicting worker deployment manifests on disk
- **Severity:** Critical
- **Evidence:** `worker/render.yaml:1-93` declares a Render service with autoscaling `minInstances: 1, maxInstances: 8`. `worker/railway.json:1-14` declares a Railway deployment with `numReplicas: 3`. `worker/railpack.json:1-13` adds a Railpack provider config. CI (`.github/workflows/ci.yml:173-178`) only triggers a Render deploy hook. There is no documented decision on which platform is canonical.
- **Why it matters:** A new operator cannot tell from the repo which platform actually runs the worker. If the team migrates from Render to Railway (or vice versa) the silent manifest will diverge from reality, and on-call cannot trust either to reflect prod scaling. Concurrency tuning in `render.yaml` (the long HOTFIX comments at lines 18-39) is meaningless on Railway.
- **Fix:** Delete the unused manifest. If both platforms are in use (e.g., Render = prod, Railway = staging) document that mapping in `worker/README.md` and gate the unused config behind a comment block at the top stating which environment uses it. CI should fail if both are present without that doc.
- **Effort:** XS

### F4 — CI has no staging gate; `main` deploys straight to production
- **Severity:** Critical
- **Evidence:** `.github/workflows/ci.yml:135-178` defines a single `deploy` job that runs on `push` to `main` and immediately runs `supabase db push`, `supabase functions deploy`, and triggers the Render production deploy hook. No `environment:` GitHub-Actions key is used. No staging branch, no manual approval, no canary, no smoke-test job between migration and worker deploy. Also: `supabase functions deploy --no-verify-jwt` (line 165) deploys ALL functions with `--no-verify-jwt`, which conflicts with the per-function `verify_jwt = true` flags in `supabase/config.toml:4-35` — flag for §6 Security cross-check.
- **Why it matters:** Any merged PR can break prod with no recovery window. A schema migration that locks a busy table goes live the instant `db push` completes, before the worker deploy is verified. Combined with F2 (no separate Supabase project), there is literally no environment to test migrations against.
- **Fix:** Split `deploy` into `deploy-staging` (auto, on `main`) and `deploy-production` (manual `workflow_dispatch` or `environment: production` with required reviewer). Run smoke tests + a 5-min worker health watch before promoting. Drop `--no-verify-jwt` from the functions deploy and let `config.toml` per-function flags drive JWT enforcement.
- **Effort:** M

### F5 — Single-region deployment with no documented failover
- **Severity:** Major
- **Evidence:** `worker/render.yaml:5` pins `region: oregon`. `DISASTER_RECOVERY.md:5-12` confirms Database / Storage / Edge Functions all in `us-east-1`, Worker in `us-east`. (Note: docs claim `us-east` but render.yaml says `oregon` = us-west — the docs contradict the manifest.) No multi-region, no read replicas, no R2/S3 cross-region backup despite `DISASTER_RECOVERY.md:43` recommending one.
- **Why it matters:** A single AWS us-east-1 incident takes the entire product offline. Worker in `oregon` (us-west-2) querying a Supabase us-east-1 DB also adds ~70 ms RTT to every job claim — for a worker that polls `claim_pending_job` (`worker/src/index.ts:970, 986`) and runs many small RPCs per job, this is a measurable throughput hit.
- **Fix:** Either (a) move worker to us-east region to co-locate with the database (one-line change in `render.yaml:5`), or (b) keep oregon and accept the latency consciously, documented in an ADR. Long-term: provision a cross-region S3/R2 bucket and add a nightly `pg_dump | rclone` job (codified as a Supabase scheduled function).
- **Effort:** S (region change) / L (multi-region)

### F6 — Storage buckets created via SQL migrations with weak quotas
- **Severity:** Major
- **Evidence:** Five buckets created via SQL `INSERT INTO storage.buckets`: `audio` (`20260111221811_*.sql:2`), `project-thumbnails` (`20260221024844_*.sql:6`), and three more from `20260118032750_*.sql:22` and `20260121231954_*.sql:2`. Only `videos` (`20260309013400_create_videos_bucket.sql:2-9`) declares a `file_size_limit` (500 MB) and `allowed_mime_types`. The other four buckets have no file size limit and no MIME restriction. `audio` is `public = true`. `project-thumbnails` is `public = true`.
- **Why it matters:** Per §7 Data integrity overlap — uncapped public buckets are a cost runaway risk. A single user can upload arbitrary file types up to the global Supabase max (configured at project level — verify in dashboard). Storage growth trajectory is uncontrollable without per-bucket caps. From a FinOps perspective, Supabase storage is $0.021/GB/month + $0.09/GB egress; an abuse case could rack up significant cost overnight.
- **Fix:** Add a migration that ALTERs each bucket's `file_size_limit` and `allowed_mime_types` to match expected use (e.g., `audio`: 50 MB, `audio/mpeg, audio/wav`; `project-thumbnails`: 5 MB, image/* only). Add a Supabase scheduled job (codified, not click-ops) that emits storage growth metrics weekly to the alert webhook.
- **Effort:** S

### F7 — Cloudflare R2 used in production but not codified
- **Severity:** Major
- **Evidence:** `vercel.json:71` CSP `img-src` includes `https://pub-d259d1d2737843cb8bcb2b1ff98fc9c6.r2.dev` — a Cloudflare R2 public endpoint. `iac/cloudflare/` directory is empty. No `wrangler.toml`, no Terraform Cloudflare provider, no documentation of which bucket this is, who provisioned it, or how to reproduce it.
- **Why it matters:** Loss of access to that Cloudflare account = silently broken images in production with no clear path to re-create the bucket with the same public URL. This is exactly the case where IaC pays for itself.
- **Fix:** Add `iac/cloudflare/r2.tf` (or `wrangler.toml` if using Workers tooling) with the bucket definition, public access policy, and CORS config. Document the bucket purpose in `iac/cloudflare/README.md`.
- **Effort:** S

### F8 — Render deploy is fire-and-forget with no rollback signal
- **Severity:** Major
- **Evidence:** `.github/workflows/ci.yml:173-178` posts to `RENDER_DEPLOY_HOOK_URL` and exits 0 on the curl success — it does not wait for the deploy to complete, does not check the new instances' `/health` endpoints, and has no automatic rollback path. `worker/render.yaml:43` sets `autoDeploy: true` so a bad commit can also trigger a deploy outside of the CI pipeline (Render watches the repo directly).
- **Why it matters:** A failed worker deploy (e.g., bad migration left the schema incompatible) silently leaves the prior workers running until they restart and pick up the broken image. Operators learn about it from Sentry, not from CI. Combined with F4, there is no human gate before production worker rollout.
- **Fix:** After triggering the deploy hook, poll Render's API for the new deploy's status (Render API: `GET /v1/services/{id}/deploys`) until `live` or `failed`. On `failed`, trigger a rollback via Render's API and fail the CI job. Set `autoDeploy: false` in `render.yaml:43` so deploys are CI-gated only.
- **Effort:** M

### F9 — Worker autoscaling thresholds and per-pod concurrency are out of sync with platform reality
- **Severity:** Major
- **Evidence:** `worker/render.yaml:28-40` sets `minInstances: 1, maxInstances: 8, targetCPUPercent: 50, targetMemoryPercent: 40`. The same file (lines 32-39) candidly admits Render Pro's advertised 4 GB is enforced at ~2 GB at runtime, forcing the memory threshold down. `worker/src/index.ts:118-132` confirms the worker hard-caps llmSlots to 8 and exportSlots to 4 (max 12 total per pod) explicitly because of OOMs. So the *real* infra capacity is 8 pods × 12 slots = 96 jobs but in practice memory pressure caps it lower.
- **Why it matters:** This is "scale horizontally because vertical doesn't work" by accident, not design. The repeated HOTFIX comments (2026-05-05, 2026-05-07) show the team has been chasing the OOM cliff in production with no IaC-level upgrade path. If traffic spikes, `maxInstances: 8` is a hard ceiling — no escalation playbook in the repo for raising it.
- **Fix:** Either (a) move to Render's larger plan (8 GB / 4 vCPU) and re-tune slot budgets to match — codify the plan choice in `render.yaml:10` rather than commenting on it, or (b) split the worker into two services: an `export-worker` plan-sized for FFmpeg memory needs and an `llm-worker` sized for I/O concurrency. Add a runbook in `worker/SCALING.md` documenting how to raise `maxInstances` and the cost implication.
- **Effort:** M

### F10 — No connection pooler configuration is declared anywhere
- **Severity:** Major
- **Evidence:** Worker uses `@supabase/supabase-js` directly (`worker/src/lib/supabase.ts:65`) which connects via PostgREST. No mention of PgBouncer / Supavisor mode (`transaction` vs `session`) anywhere in the repo (verified via grep for `pgbouncer`, `supavisor`, `pooler` — zero hits). Up to 8 worker pods × 12 in-flight jobs each = 96 concurrent PostgREST clients, plus edge functions, plus browser clients.
- **Why it matters:** Supabase Free/Pro Postgres has a hard connection limit (60 by default; 200 on Pro). At peak the worker fleet alone can exhaust the pool. This is the kind of failure that doesn't surface in staging (because there is none) but breaks under launch traffic.
- **Fix:** Document the Supabase pooler setting (`Project Settings → Database → Connection Pooling`) in `iac/supabase/README.md` with the chosen mode and pool size. Validate at startup in `worker/src/lib/supabase.ts` that the URL points to the pooler hostname for the worker's RPC use case (most short-lived RPCs should go through transaction-mode pooler).
- **Effort:** S

### F11 — `ALERT_WEBHOOK_URL` declared but no IaC ensures it's set
- **Severity:** Minor
- **Evidence:** `worker/render.yaml:78` declares `ALERT_WEBHOOK_URL` with `sync: false` (operator must enter manually). `worker/src/index.ts:954-960` emits `stale_jobs_reaped` events that depend on this webhook. There is no validation at startup that the URL is actually set, no documentation of the expected webhook format, and no fallback (e.g., write to a Supabase `alerts` table).
- **Why it matters:** Silent observability gap. If the webhook env var is missing in prod, alerts vanish into nothing and on-call has no way to know in 5 min if prod broke (the §9 Observability test). For an audience of "tool-savvy creators" who'll churn on a single bad export, alerting has to be wired correctly from launch day.
- **Fix:** At worker startup, log a warning if `ALERT_WEBHOOK_URL` is unset and write the same alert payload to a Supabase `worker_alerts` table as a fallback. Document the expected webhook contract in `worker/ALERTS.md`.
- **Effort:** S

### F12 — Committed `.env` file pinning production Supabase URL
- **Severity:** Minor
- **Evidence:** `.env:1` reads `VITE_SUPABASE_URL=https://ayjbvcikuwknqdrpsdmj.supabase.co` and is tracked in the repo (file exists at the path, listed in the directory enumeration with size 300 bytes, 2026-03-09 timestamp). `.env.example:7` correctly uses a placeholder. `worker/.env:1` also pins prod.
- **Why it matters:** Defeats the purpose of `.env.example`. A new contributor cloning the repo silently runs against production. Combined with F2, there is no developer-mode guardrail. Also a §6 Security smell — anything else committed in those `.env` files (anon keys, redirect URLs) is now in git history forever.
- **Fix:** Remove `.env` and `worker/.env` from the repo, add explicit entries to `.gitignore` (verify they aren't already there). For local dev, instruct contributors to copy `.env.example` to `.env` and fill in their own dev project ref.
- **Effort:** XS

### F13 — Storage growth has no lifecycle / cleanup policy in code
- **Severity:** Minor
- **Evidence:** No `storage.objects` cleanup migration found (verified via grep across `supabase/migrations/`). No retention policy on `videos` (500 MB per file × N projects × no expiry). The export pipeline writes to `videos` bucket but the only deletion code path appears to be user-initiated (`Help.tsx`, project deletion).
- **Why it matters:** Storage cost grows monotonically with usage. A free-tier user could leave a 500 MB export sitting forever. At Supabase storage pricing ($0.021/GB-month), 10k users × 500 MB = $105/month perpetual cost growing forever. Right-sizing per Terra rule #5 means tying storage to active subscriptions.
- **Fix:** Add a Supabase scheduled function `cleanup-stale-exports` that deletes `videos/` objects older than 30 days where the user has not paid, and 90 days for paid users (configurable). Codify both the function and the schedule in `iac/supabase/scheduled-jobs.tf` (or `supabase/functions/_scheduled/cleanup-stale-exports.ts` with the cron in `config.toml`).
- **Effort:** M

### F14 — `region: oregon` contradicts `DISASTER_RECOVERY.md` claim of `us-east`
- **Severity:** Minor
- **Evidence:** `worker/render.yaml:5` says `region: oregon`. `DISASTER_RECOVERY.md:11` says Worker is in `us-east`. They cannot both be true.
- **Why it matters:** Operations rely on docs being right. An on-call following the runbook will look in the wrong region during an incident.
- **Fix:** Reconcile — pick one and update the other. Recommended: keep `oregon` only if there's a reason; otherwise change `render.yaml:5` to `ohio` (us-east-2) or `virginia` (us-east-1) to colocate with Supabase.
- **Effort:** XS

### F15 — Build dependency on `marketing` workspace is implicit, not declared
- **Severity:** Polish
- **Evidence:** `vercel.json:5` `installCommand` is `npm ci && npm ci --prefix marketing`. There is no top-level workspace declaration that makes this dependency explicit.
- **Why it matters:** A future Vercel project re-creation by a new operator will miss the marketing build. With F1, this would mean an unrecoverable broken deploy.
- **Fix:** Either move to npm workspaces (declare `marketing` in root `package.json` workspaces array) or codify the install command in `iac/vercel/project.json` (per F1).
- **Effort:** XS

---

## Production Blockers (must close before launch)

| # | Finding | Evidence |
|---|---------|----------|
| F1 | `iac/` is empty — no IaC at all | `iac/cloudflare/`, `iac/supabase/`, `iac/vercel/` are empty directories |
| F2 | Hard-coded prod Supabase ref blocks any staging env | `worker/src/lib/supabase.ts:13`, `supabase/config.toml:1`, `vercel.json:9,13,18` |
| F3 | Two conflicting worker deploy manifests | `worker/render.yaml` + `worker/railway.json` + `worker/railpack.json` |
| F4 | CI deploys straight to prod with no staging gate | `.github/workflows/ci.yml:135-178` |

## Top 10 Priority Fixes (ordered for execution)

| # | Fix | Effort | Severity |
|---|-----|--------|----------|
| 1 | Codify Vercel + Supabase + Cloudflare R2 as Terraform/wrangler files in `iac/` (F1, F7) | L | Blocker |
| 2 | Replace hard-coded `EXPECTED_PROJECT_REF` and committed `.env` URLs with env-driven values (F2, F12) | M | Blocker |
| 3 | Pick one worker host (Render or Railway) and delete the other manifest (F3) | XS | Critical |
| 4 | Add `staging` deploy job + manual prod approval gate to CI (F4) | M | Critical |
| 5 | Add `file_size_limit` and `allowed_mime_types` to all four uncapped storage buckets (F6) | S | Major |
| 6 | Wait-and-verify the Render deploy in CI; disable `autoDeploy: true` in `render.yaml` (F8) | M | Major |
| 7 | Codify Supabase connection pooler choice and validate at worker startup (F10) | S | Major |
| 8 | Reconcile worker region (`render.yaml:5` vs DR docs) and colocate with Supabase if possible (F5, F14) | S | Major |
| 9 | Add `cleanup-stale-exports` scheduled function for storage lifecycle (F13) | M | Minor |
| 10 | Wire `ALERT_WEBHOOK_URL` validation + DB fallback at worker startup (F11) | S | Minor |

---

## Cross-cutting notes for other reviewers

- **Trace (Observability):** F11 directly impacts the "would anyone know in 5 min if prod broke?" test. The webhook is plumbed but not validated.
- **Proof (Security):** F4 ships `--no-verify-jwt` for all functions despite per-function flags in `config.toml`. Verify this isn't actually disabling JWT auth on protected functions in production.
- **Compass (Data Integrity):** F2 means RLS testing has no isolated environment. F6 storage caps overlap with data-integrity guarantees.
- **Halo (Performance / Web Vitals):** F5 (worker in oregon, DB in us-east) is a 70 ms RTT tax on every worker RPC.

---

**Verdict input from Terra:** infrastructure layer is **NOT production-ready**. The `iac/` skeleton without bones is the worst kind of false signal — it suggests IaC discipline that does not exist. Combined with single-environment hard-coding and an unguarded prod deploy pipeline, MotionMax is one bad migration away from a multi-hour outage with no runbook, no staging to test the recovery in, and no IaC to rebuild from. F1 + F2 + F4 must be closed before US launch.
