# Watch — Observability Audit (§9)

FROM: Watch (DevOps / Observability)
TO: Jury → BigBrain
RE: motionmax-360 production-readiness — Observability & Incident Readiness
STATUS: Review
DATE: 2026-05-10

Scope: Sentry + PostHog wire-up across frontend / worker / edge functions, uptime monitoring per primary path, performance metrics, alert thresholds, who gets paged at 3am, status page presence. Audience-relative: tool-savvy creative adults relying on a paid SaaS — they will not tolerate a generation pipeline that silently breaks at night.

Method: static review of `motionmax/` only — production Sentry/Render/PagerDuty dashboards are out of scope (cannot be verified from the repo). Where a control lives off-repo, finding flagged "Unable to verify from static analysis."

---

## Findings (sorted by severity within category)

### Blocker

**B1. Worker Sentry init has zero PII scrubbing — billing + generation payloads leak to Sentry on every error**
- Category: §9 Observability
- Evidence: `worker/src/index.ts:1-2` — entire init is `Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'production', tracesSampleRate: 0.1 })`. No `beforeSend`, no `ignoreErrors`, no `denyUrls`, no release tag. Compare to frontend `src/lib/sentry.ts:58-91` which scrubs `password|token|email|jwt|key|secret` keys via `beforeSend`. The worker imports `@sentry/node` v8 and processes payloads containing `userId`, `email`, Stripe customer ids (via Replicate/Hypereal upstream response bodies passed through `error.message`), and ElevenLabs/OpenRouter API keys whenever an upstream provider 401s and echoes the request header.
- Severity: Blocker — GDPR Article 32 violation surfaces the moment a single provider call fails with a verbose error.
- Fix: in `worker/src/lib/sentry.ts` (new file), replicate the `SENSITIVE_KEY_RE` + `scrubSensitive` from `src/lib/sentry.ts:58-89`, set `release: process.env.RENDER_GIT_COMMIT`, `serverName: WORKER_ID`, and `ignoreErrors: [/AbortError/, /ETIMEDOUT/]`. Replace the inline init at `worker/src/index.ts:1-2` with `import { initWorkerSentry } from "./lib/sentry.js"; initWorkerSentry();`.
- Effort: S

**B2. Edge-function Sentry init is identical bare-bones across 9 functions — no `beforeSend`, no scrubbing, no environment tag for staging**
- Category: §9 Observability
- Evidence: `supabase/functions/stripe-webhook/index.ts:27-30`, `cancel-with-reason/index.ts:8-11`, `customer-portal/index.ts:9-12`, `create-checkout/index.ts:8-11`, `list-invoices/index.ts:8-11`, `pause-subscription/index.ts:8-11`, `submit-support-ticket/index.ts:7-10`, `update-pack-quantity/index.ts:9-12` — every init looks like `{ dsn, environment }` with no `beforeSend`. The `stripe-webhook` `Sentry.captureException(error)` at line 613 will ship the full `Stripe.errors.StripeError` which carries `customer`, `email`, `last4`, and full `payment_method` objects.
- Severity: Blocker — PCI scope creep + GDPR Art 32. Stripe support has explicit guidance that PAN-adjacent data (last4, fingerprint, BIN) should not be logged in third-party error trackers without a DPA covering the surface.
- Fix: create `supabase/functions/_shared/sentry.ts` exporting `initEdgeSentry(serviceName: string)` with the same `beforeSend` + `SENSITIVE_KEY_RE` pattern from `src/lib/sentry.ts`, plus an extra Stripe-key blacklist (`payment_method`, `card`, `customer`, `last4`, `fingerprint`). Replace each `Sentry.init({...})` with one call. Run a grep — there are exactly 9 sites.
- Effort: M

**B3. No on-call rotation, escalation policy, or paging integration is defined anywhere in the repo**
- Category: §9 Observability
- Evidence: full repo grep for `pagerduty|opsgenie|on-call|oncall|escalation` returns only env-var docs, marketing copy ("on-call doctor"), and admin-tab strings. `docs/admin/runbooks/incident-response.md:1-55` describes mitigation but never names a person, rotation, or paging channel. The `src/lib/sentry.ts:12-32` comment names "#alerts-prod" and "#alerts-billing" Slack channels but no `slackWebhook.json`, no `alerts.tf`, no `pagerduty.yml` exists. `worker/render.yaml` has no `notifications:` block.
- Severity: Blocker — at 3am with the queue OOM-looping, nobody is woken up. Render's default behavior on health-check failure is to restart the pod silently. The only route from "production broken" → "human notified" is `ALERT_WEBHOOK_URL` (queue depth only) and Sentry email defaults — neither is on a phone.
- Fix: (1) Create `docs/admin/runbooks/oncall.md` listing primary/secondary on-call, paging channel, escalation timer (e.g., 15 min unack → escalate to founder). (2) Wire Sentry → PagerDuty integration for `level:error environment:production` and document the integration key in `docs/admin/runbooks/oncall.md` (not in repo). (3) Add a `notifications:` block to `worker/render.yaml` for deploy/health-check failures with an email/webhook destination.
- Effort: M

### Critical

**C1. PostHog is listed as a sub-processor in the planned Privacy Policy but is not installed in either app — analytics gap + compliance lie risk**
- Category: §9 Observability + §13 Compliance overlap (flagging here because reviewers handling §13 won't catch the missing dependency)
- Evidence: `tasks/vega-low.txt:33` says "add sub-processor section listing Supabase, Stripe, ElevenLabs, Replicate, Google, Sentry, **PostHog**". Repo grep for `posthog|PostHog|POSTHOG` returns zero hits in `package.json`, `worker/package.json`, or any source file outside that one task note. `src/hooks/useAnalytics.ts` uses GA4 only (`captureUtmParams` → `import.meta.env.VITE_GA_MEASUREMENT_ID`). The brief explicitly asks for "Sentry/PostHog wire-up on frontend AND worker AND edge functions."
- Severity: Critical — either install PostHog and rebuild the funnel/event taxonomy that GA4 cannot do (pipeline-stage dropoff, generation success rate by provider) OR strike PostHog from the privacy plan. Shipping with a privacy claim that names a service you don't use is an FTC/ICO finding waiting to happen.
- Fix: BigBrain decision required. If keeping PostHog: `npm i posthog-js` in root and `posthog-node` in `worker/`, init in `src/main.tsx` after `initSentry()`, gate `posthog.init()` behind `grantAnalyticsConsent()` like Sentry replay does at `src/lib/sentry.ts:117-126`. If dropping PostHog: remove from `tasks/vega-low.txt:33` so the privacy page generator doesn't include it.
- Effort: M (install) or XS (drop)

**C2. Sentry alert rules exist as a comment, not as code or verifiable config**
- Category: §9 Observability
- Evidence: `src/lib/sentry.ts:12-32` documents 4 required alert rules (new-issue alert, >50 errors/hour, p95 LCP >4000ms, worker/edge errors). These live only in the Sentry dashboard (config-as-clicks). No `sentry.toml`, no Terraform, no `alerts.json`. There is no way for an auditor or for the next agent to verify any of these alerts exist, are enabled, route to the right destination, or weren't deleted by an intern.
- Severity: Critical — "would anyone know in 5 min if prod broke?" (brief §9) is unanswerable.
- Fix: adopt Sentry's [Issue Alerts as YAML via the Sentry CLI](https://docs.sentry.io/cli/) or codify alert specs in `docs/admin/runbooks/sentry-alerts.md` with screenshots committed to `docs/admin/runbooks/_screenshots/sentry-alerts/`. Better: add a `scripts/verify-sentry-alerts.ts` that hits `GET /api/0/projects/{org}/{project}/rules/` and asserts the four named rules exist, then run it in CI.
- Effort: S (doc + screenshots) or M (CI verifier)

**C3. `tracesSampleRate: 0.1` on stripe-webhook means 90% of failed billing requests have no distributed trace**
- Category: §9 Observability
- Evidence: `supabase/functions/stripe-webhook/index.ts:27-30` sets no `tracesSampleRate` — `@sentry/deno` defaults to 0 (no traces at all), or if any default applies it's not customised for the criticality. `worker/src/index.ts:2` sets `tracesSampleRate: 0.1`. `src/lib/sentry.ts:78` sets `tracesSampleRate: IS_PROD ? 0.1 : 1.0`. Billing and generation are the two flows where you cannot afford a missing trace.
- Severity: Critical — when a checkout fails and the customer emails Echo, you have a 90% chance the trace was sampled out and Crash cannot reproduce.
- Fix: per-flow override using Sentry's `tracesSampler` callback. In `src/lib/sentry.ts:67-91` add `tracesSampler: (ctx) => ctx.transactionContext?.name?.startsWith('/checkout') || ctx.transactionContext?.name?.startsWith('/billing') ? 1.0 : 0.1`. In `supabase/functions/stripe-webhook/index.ts:27` set `tracesSampleRate: 1.0` explicitly (volume is low — webhooks per minute, not per second). In worker, sample 100% of `task_type='export_video'` and `'autopost_run'` jobs by setting trace context on entry.
- Effort: S

**C4. No external synthetic uptime monitor is configured — the `/health` endpoints exist but nothing pings them**
- Category: §9 Observability
- Evidence: `supabase/functions/health/index.ts:1-46` is a public endpoint built explicitly for "UptimeRobot, BetterStack, etc." (line 4 comment). `worker/src/healthServer.ts:175-198` exposes `/health` with DB ping. Repo grep for `uptimerobot|betterstack|betteruptime|pingdom|checkly|statusgator` returns only the comment in `health/index.ts`. No `monitors.json`, no Terraform module, no Pingdom config. `lighthouserc.cjs` exists but it's a build-time perf check, not a runtime synthetic.
- Severity: Critical — without an external prober, a regional Supabase edge outage looks identical to "everything is fine" from the inside.
- Fix: provision a free-tier BetterStack or UptimeRobot account, add monitors for `https://motionmax.io/`, `https://motionmax.io/app`, `https://<project>.supabase.co/functions/v1/health`, and `https://<worker>.onrender.com/health`. Document the monitor URLs in `docs/admin/runbooks/uptime-monitors.md`. Set 30s interval and 2-failure-threshold to avoid false pages on transient blips.
- Effort: S

**C5. No status page exists despite an 11-language US-launch audience expecting one**
- Category: §9 Observability + §14 Production Readiness
- Evidence: full glob for `status.{html,astro,tsx,md}` and grep for `statuspage|status\.io|incident\.io|atlassian.*status` returns zero project-side hits. Brief explicitly asks "status page (does it exist?)". `marketing/src/pages/` directory has `privacy.astro`, `terms.astro`, etc., but no `status.astro` and no link to an external status page from the marketing nav or from the in-app help.
- Severity: Critical — content creators on deadline (the audience) need to know whether "my export is stuck" is a them-problem or a MotionMax-problem before they email support.
- Fix: cheapest path — provision a free Atlassian Statuspage or Instatus, add components for "API", "Generation Pipeline", "Stripe Billing", "Edge Functions". Wire from the BetterStack/UptimeRobot monitor (C4). Link from `src/pages/Help.tsx` header and from `marketing/src/pages/index.astro` footer. Add `status.motionmax.io` CNAME.
- Effort: M

**C6. Marketing site (`marketing/`) has no Sentry instrumentation — failed marketing renders, broken CTAs, and 404s are invisible**
- Category: §9 Observability
- Evidence: `marketing/package.json` has no `@sentry/astro` dependency. `marketing/src/pages/index.astro` (the brief's listed primary surface) ships uninstrumented. The brief calls visitor → customer conversion (§2) a critical category — without RUM on marketing, you cannot see which CTA breaks before signup.
- Severity: Critical for §2 conversion; Major for §9 alone — a marketing JS exception silently breaks signup on Safari iOS and you find out via a support ticket two weeks later.
- Fix: `cd marketing && npm i @sentry/astro && npx astro add @sentry/astro`, then configure DSN via a separate Sentry project (`motionmax-marketing`) so error budgets don't co-mingle with the React app. Mirror the `beforeSend` scrubbing pattern from `src/lib/sentry.ts:58-89`.
- Effort: S

### Major

**M1. SLO/SLI definitions are absent — alert thresholds are arbitrary**
- Category: §9 Observability
- Evidence: `src/lib/sentry.ts:24-25` is the only quantified threshold in the repo (`p95 LCP > 4000 ms`). No documented target for: video-generation success rate, time-to-first-frame, edge-function p95, queue-depth-to-page threshold (worker uses 50 hardcoded at `worker/src/index.ts:1009` via `queueDepthAlertThreshold` — origin not in this snippet but treated as magic). `docs/admin/runbooks/incident-response.md` has zero numeric targets.
- Severity: Major — without an SLI you cannot tune alerts; ops will either get paged for nothing or never get paged when it counts.
- Fix: add `docs/admin/runbooks/slos.md` with explicit targets per flow: "auth p95 < 800ms", "generation success rate ≥ 95% rolling 1h", "stripe-webhook p99 < 3s", "worker queue depth < 30 sustained 5min", "/health uptime ≥ 99.5% rolling 30d". Reference the doc from each Sentry alert rule comment.
- Effort: S

**M2. `/metrics` Prometheus endpoint exists but no scraper is configured — observability data is generated and discarded**
- Category: §9 Observability
- Evidence: `worker/src/healthServer.ts:107-138` produces a clean Prometheus exposition (uptime, jobs_active, jobs_processed_total, memory, cpu) gated by `HEALTH_AUTH_TOKEN`. Repo grep for `prometheus|grafana|prom-client|scrape_configs` returns no scrape config, no `prometheus.yml`, no Grafana dashboard JSON. `worker/render.yaml` does not expose port 10000 to the public internet (no `domain:` block) — so even if you provisioned Grafana Cloud, it cannot reach the endpoint.
- Severity: Major — historical trends, capacity planning, and "is this slow today vs last week?" all impossible.
- Fix: either (a) pull the metrics into Sentry as custom measurements (already doing this for `api.{provider}.total_ms` at `worker/src/lib/logger.ts:144-148` — extend) and rely on Sentry Performance, or (b) provision Grafana Cloud, expose `/metrics` via Render's `domain:` config behind `HEALTH_AUTH_TOKEN`, add a scrape job. (a) is XS, (b) is L.
- Effort: XS or L

**M3. Queue-depth alert is fire-and-forget with `.catch(() => {})` — webhook outages are invisible**
- Category: §9 Observability
- Evidence: `worker/src/index.ts:1031-1042` and `worker/src/index.ts:1045-1065` both swallow webhook failures with `.catch(() => { /* Silently ignore webhook failures */ })`. If Slack is down, or if the webhook URL was rotated and not updated, the queue-depth alert never fires and ops never knows it was supposed to.
- Severity: Major — silent failure pattern explicitly forbidden by Watch rule #3 ("If a bug makes it to production, Watch should know about it before the customer complains to Echo").
- Fix: replace `.catch(() => {})` with `.catch((err) => writeSystemLog({ category: 'system_warning', eventType: 'alert_webhook_failed', message: 'Alert webhook delivery failed', details: { url: legacyAlertUrl, error: String(err) } }))`. Then wire a Sentry alert on `eventType=alert_webhook_failed` so the alert about the broken alerts surfaces somewhere.
- Effort: XS

**M4. Frontend `allowUrls` excludes the worker host — frontend errors that bubble up from worker SSE / direct calls would be filtered**
- Category: §9 Observability
- Evidence: `src/lib/sentry.ts:83` — `allowUrls: [/motionmax\.io/, /\.vercel\.app/, /localhost/]`. The worker is at `*.onrender.com`. If any frontend code reads from the worker's `/health` (it does — `src/components/admin/AdminWorkerHealth.tsx`) or polls a worker-served stream, fetch errors originating from the worker URL would be silently dropped by Sentry's URL filter.
- Severity: Major — admin observability for the worker host is the one place you cannot afford to drop errors.
- Fix: add `/onrender\.com$/` (or the explicit worker hostname) to `allowUrls` at `src/lib/sentry.ts:83`. Better: invert the logic and use `denyUrls` to filter known-noisy third-party origins, instead of an allowlist that breaks the moment infra moves.
- Effort: XS

**M5. Trace ID propagation is implemented but only one edge function consumes it — distributed tracing is broken end-to-end**
- Category: §9 Observability
- Evidence: `src/lib/tracing.ts:46-57` provides `attachTraceHeader`. `supabase/functions/generate-cinematic/index.ts:801` is the only edge function that reads `X-Trace-Id` (per repo grep). `stripe-webhook`, `create-checkout`, `customer-portal`, `cancel-with-reason`, etc. do not read or propagate the header. Worker `worker/src/lib/logger.ts` writes `worker_id` but no `trace_id` column is written in `system_logs.details` based on the visible code.
- Severity: Major — incident postmortems require correlating "user clicked checkout" → "stripe webhook fired" → "worker provisioned credits". Without consistent trace propagation, this is manual archaeology by timestamp + user-id.
- Fix: in `supabase/functions/_shared/log.ts`, accept `req.headers.get('X-Trace-Id') ?? crypto.randomUUID()`, store as `trace_id` column on every `writeSystemLog` insert. Add a `trace_id uuid` column to `system_logs` if not present. Update worker's `writeSystemLog` (`worker/src/lib/logger.ts:117-134`) to read `payload.traceId` and persist it.
- Effort: M

**M6. No Render service-level alerting configured — pod OOM kills, deploy failures, and health-check failures are dashboard-only**
- Category: §9 Observability
- Evidence: `worker/render.yaml:1-94` has `healthCheckPath: /health` but no `notifications:` block (Render supports `notifications: - type: email` and Slack integrations at the service level). The `render.yaml` comments mention HOTFIX 2026-05-05 for production OOMs at 2GB — the team has been actively tuning OOM behavior, which means OOMs have been happening — but there's no documented alert path for the next one.
- Severity: Major — Render emits OOM-kill events, deploy-failed events, and out-of-quota events; not subscribing to them is throwing away free observability.
- Fix: add `notifications:` block to `worker/render.yaml` — `- type: slack` (or email) on `event: deploy_failed`, `event: server_failed`, `event: out_of_memory`. Document the Slack channel target in `docs/admin/runbooks/oncall.md`.
- Effort: XS

**M7. `api_call_logs.error_message` is written raw with no scrubbing — provider API tokens leak via verbose 401s**
- Category: §9 Observability + §6 Security
- Evidence: `worker/src/lib/logger.ts:140-173` writes `error_message: payload.error || null` directly to `api_call_logs`. Several upstream providers (Hypereal, Replicate, ElevenLabs) echo the request `Authorization` header in their 401/403 error bodies. The current `wlog`/`writeApiLog` pipeline does not scrub these. The `system_error` `details` jsonb at `worker/src/lib/logger.ts:127-132` likewise unfiltered.
- Severity: Major — an auth-rotation incident now writes the leaked token into a Postgres table that admins can read.
- Fix: in `worker/src/lib/logger.ts`, before insert, run `payload.error` through a regex pass `.replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, '$1[REDACTED]').replace(/sk-[A-Za-z0-9_\-]{20,}/g, '[REDACTED]')`. Same for `payload.details` recursively, mirroring the frontend `SENSITIVE_KEY_RE` from `src/lib/sentry.ts:58`.
- Effort: S

**M8. Stripe webhook signature failures are captured as warnings but lack a routing tag for #alerts-billing**
- Category: §9 Observability
- Evidence: `supabase/functions/stripe-webhook/index.ts:161-162` — `Sentry.captureMessage(...,{ level: "warning" })` with no `tags: { flow: 'billing' }` or `fingerprint: ['stripe-signature-failure']`. The `src/lib/sentry.ts:30-32` comment claims billing errors should route to a dedicated #alerts-billing channel; without a tag, Sentry routing rules cannot select these events.
- Severity: Major — billing alerts get drowned in the general #alerts-prod channel; a real signature attack is indistinguishable from a generic 500.
- Fix: in `supabase/functions/stripe-webhook/index.ts:161`, wrap the captureMessage in `Sentry.withScope(scope => { scope.setTag('flow', 'billing'); scope.setTag('event', 'signature_failure'); scope.setLevel('warning'); Sentry.captureMessage(...); })`. Repeat for line 138 (missing webhook secret) and line 613 (general handler error).
- Effort: XS

**M9. Admin Performance dashboard is the only operational dashboard and requires admin login — useless for paged on-call**
- Category: §9 Observability
- Evidence: `src/components/admin/tabs/TabPerformance.tsx:1-80` is the dashboard surface. It pulls `admin_perf_kpis` RPC live. There's no public-or-VPN-only Grafana, no Datadog, no equivalent. At 3am the on-call must (a) wake up, (b) auth into the production app, (c) navigate to Admin → Performance, before they can answer "is the system healthy?" Watch rule #2: dashboards should answer "Is the system healthy?" within 3 seconds — login + nav alone exceeds that budget.
- Severity: Major — the dashboard exists but is positioned for product analytics, not for incident triage.
- Fix: either (a) build a `/health-summary` public endpoint that emits a one-screen JSON status (queue depth, worker count, uptime, recent error rate) consumable by curl from a phone, OR (b) ship a Grafana Cloud dashboard fed by the Prometheus metrics (M2). (a) is the cheaper path and aligns with the existing `/health` pattern.
- Effort: S (option a) or M (option b)

**M10. `/health` probe queries `profiles` table — a stuck RLS policy or migration could let it report ok while user reads are broken**
- Category: §9 Observability
- Evidence: `supabase/functions/health/index.ts:21` — `supabase.from("profiles").select("user_id").limit(1)`. Service-role bypasses RLS so this passes even if user-context RLS is broken. False-positive risk: user-facing `/app` is broken (cannot select own profile) but `/health` says ok and external monitors stay green.
- Severity: Major — false-confidence is worse than no probe.
- Fix: add a second probe path that uses an anon-key `createClient` and selects from a public `health_status` table seeded with one row visible to anon — that proves end-to-end that anon → RLS → row reads work. Or call a public RPC that internally checks user-path read.
- Effort: S

### Minor

**Mi1. `replaysSessionSampleRate: 0` even after analytics consent — only on-error replays are captured**
- Category: §9 Observability
- Evidence: `src/lib/sentry.ts:80-81, 117-126` — even after `grantAnalyticsConsent()`, only `replaysOnErrorSampleRate` is set to 0.1; session sampling stays at 0. For a creative-tool audience producing long-running editor sessions, no session replay means UX regressions ("the timeline jumped while I was scrubbing") cannot be reproduced.
- Severity: Minor — defensible for cost/privacy, but document the trade-off.
- Fix: either (a) keep at 0 and add a comment at `src/lib/sentry.ts:80` explaining the deliberate choice, or (b) bump `replaysSessionSampleRate` to 0.01 (1% of consented sessions) which is a tiny cost for huge UX-debugging value.
- Effort: XS

**Mi2. No `release` set on worker Sentry — every error is unattributed to a deploy**
- Category: §9 Observability
- Evidence: `worker/src/index.ts:2` — no `release` field. Frontend has `release: import.meta.env.VITE_SENTRY_RELEASE` (`src/lib/sentry.ts:70`). Without a release tag on the worker, you cannot use Sentry's "regressed in release X" feature, cannot tie an error spike to a specific deploy, cannot answer "did the new code cause this?"
- Severity: Minor — recoverable via timestamp correlation, but slow.
- Fix: add `release: process.env.RENDER_GIT_COMMIT || 'unknown'` to the worker `Sentry.init`. Render injects `RENDER_GIT_COMMIT` automatically.
- Effort: XS

**Mi3. Edge function Sentry init lacks `release` tag too**
- Category: §9 Observability
- Evidence: same as M2 — every `supabase/functions/*/index.ts` Sentry.init has no release. Edge deploys via `supabase functions deploy` (`.github/workflows/ci.yml:161-165`); no release identifier propagates.
- Severity: Minor.
- Fix: in the proposed `supabase/functions/_shared/sentry.ts` from B2, set `release: Deno.env.get('GITHUB_SHA') || Deno.env.get('SUPABASE_DEPLOYMENT_ID') || 'unknown'`. Pipe `GITHUB_SHA` through CI's deploy step as a Supabase secret.
- Effort: XS

**Mi4. No Web Vitals capture beyond Sentry's `browserTracingIntegration` defaults**
- Category: §9 Observability
- Evidence: no `web-vitals` package in `package.json`. The Sentry browser tracing integration emits LCP/CLS/FID/INP via Performance API but does so within a transaction — there's no separate vitals stream that would survive Sentry sampling. For an audience with mobile-heavy usage and 320–428px breakpoints, vitals at p75 mobile is the metric that matters; sampling at 10% is too low to hit statistical significance per route per device per day.
- Severity: Minor.
- Fix: install `web-vitals` and post to a beacon endpoint (or to PostHog if C1 lands as install). Alternative: bump Sentry `tracesSampler` to 1.0 for the first paint of each session only.
- Effort: S

**Mi5. `submit-support-ticket` Sentry init has trailing logic gap — `Sentry.flush(2000)` only on the catch path, never on the success path**
- Category: §9 Observability
- Evidence: `supabase/functions/submit-support-ticket/index.ts:186-187` flushes only inside the catch block. Edge functions are killed when the response is returned; without a flush on the happy path, any breadcrumbs added during the request may be lost on cold-start shutdown.
- Severity: Minor — most events still reach Sentry because errors are the primary capture, but breadcrumbs for warning-level traces may be dropped.
- Fix: add `await Sentry.flush(1000)` immediately before `return new Response(...)` on the success path. Same audit pass needed across all 9 edge functions.
- Effort: S

### Polish

**P1. Sentry alert-rule comment in `src/lib/sentry.ts` references "Slack #alerts-prod" and "#alerts-billing" but the actual channel names are not anchored anywhere — drift risk**
- Category: §9 Observability
- Evidence: `src/lib/sentry.ts:21, 27, 32` references three channel names. If a future ops change renames the Slack channel, this comment lies and nobody knows.
- Severity: Polish.
- Fix: move channel-name references into `docs/admin/runbooks/oncall.md` and replace the comment in `sentry.ts` with `// See docs/admin/runbooks/oncall.md for current routing`.
- Effort: XS

**P2. Worker `WORKER_ID` falls back to `'unknown-worker'` — log filtering breaks under that fallback**
- Category: §9 Observability
- Evidence: `worker/src/lib/logger.ts:39-43`. If neither `WORKER_ID`, `RENDER_INSTANCE_ID`, nor `os.hostname()` resolves, all logs from that pod aggregate under one synthetic id. Unlikely to hit in production but worth a sentry-tag.
- Severity: Polish.
- Fix: emit a Sentry warning on startup if `WORKER_ID === 'unknown-worker'` so you find out the moment a config drift would silently merge logs across pods.
- Effort: XS

---

## Production Blockers (must-fix before launch)

| # | Title | File:line | Effort |
|---|---|---|---|
| B1 | Worker Sentry has no PII scrubbing | `worker/src/index.ts:1-2` | S |
| B2 | Edge-function Sentry init lacks `beforeSend` across 9 functions | `supabase/functions/*/index.ts` | M |
| B3 | No on-call rotation, escalation policy, or paging integration defined | repo-wide gap | M |

## Top 10 Priority Fixes

| Rank | ID | Title | Severity | Effort |
|------|----|-------|----------|--------|
| 1 | B3 | Define on-call + page-routing | Blocker | M |
| 2 | B1 | Add scrubbing to worker Sentry init | Blocker | S |
| 3 | B2 | Shared `_shared/sentry.ts` for all 9 edge functions | Blocker | M |
| 4 | C1 | Decide PostHog: install or strike from privacy doc | Critical | XS or M |
| 5 | C4 | Provision external uptime monitor against `/health` endpoints | Critical | S |
| 6 | C5 | Stand up a public status page wired to uptime monitor | Critical | M |
| 7 | C3 | Per-flow `tracesSampler` so billing/generation get 100% sampling | Critical | S |
| 8 | C2 | Codify or screenshot-document Sentry alert rules + add CI verifier | Critical | S |
| 9 | C6 | Add `@sentry/astro` to marketing site | Critical | S |
| 10 | M3 | Stop swallowing webhook delivery failures in queue-alert path | Major | XS |

---

## Out-of-scope / Unable to verify from static analysis

- Whether the Sentry organization actually has the four alert rules described in `src/lib/sentry.ts:12-32` configured and active in the production dashboard.
- Whether `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `HEALTH_AUTH_TOKEN`, `ALERT_WEBHOOK_URL`, `AUTOPOST_ALERT_WEBHOOK_URL` are actually set in Render and Supabase production environments (only their references in `worker/render.yaml` and `.env.example` are visible).
- Render-side notifications config — the dashboard supports it independently of `render.yaml`; cannot verify from the file.
- Whether GA4 and any other analytics destinations are receiving events in production.
- Actual p95/p99 numbers and current error rate — requires production Sentry access.

— Watch
