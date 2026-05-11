# Siren — Incident Response & On-Call Audit

**Project:** motionmax-360
**Date:** 2026-05-10
**Specialist:** Siren (Incident Response)
**Scope:** §9 Observability & Incident Readiness + §14 Production Readiness (incident response slice)
**Audience-relative note:** MotionMax is a paid B2C creative tool with credit-based generation. A 5-minute outage that silently burns user credits is a churn event, not just a metric. Audit applied accordingly.

---

## Headline answer to BigBrain's question
> "If prod breaks right now, would anyone know within 5 minutes?"

**No — not reliably.** The plumbing is *documented* (Sentry alerts, BetterStack monitors, escalation policy, status page) but most of it is **unverified or unconfigured**. The repo contains setup instructions with placeholder URLs (`<RENDER_WORKER_URL>`, `<your-alert-policy-id>`, `<render-url>`) and no Terraform / IaC artifact that proves the monitors were ever provisioned. Sentry alert rules live as a JSDoc block, not as code (`src/lib/sentry.ts:12-32`). The single named on-call contact ("kameleyon (repo owner)" — `DISASTER_RECOVERY.md:245`) is a bus factor of 1 with no rotation. Detection-to-page is a paper claim, not a tested loop.

The in-app status widget (`src/pages/Help.tsx:197-211`) reads from `support_system_status` RPC and is only visible to **authenticated users on /help** — useless when auth itself is the outage.

---

## Findings (grouped by severity)

### Blocker

#### B1. On-call rotation = one person; no escalation chain in code or scheduler
- **Category:** §9 Incident readiness
- **Issue:** `DISASTER_RECOVERY.md:243-249` lists exactly one engineer ("kameleyon (repo owner)") as the human escalation point. There is no rotation, no secondary, no documented handoff. If the single engineer is unreachable (sleep, travel, illness, AWOL), nothing routes the page to a backup.
- **Evidence:**
  - `DISASTER_RECOVERY.md:243` table titled "Escalation Contacts" — only one human row; rest are vendor support emails.
  - `docs/betterstack-uptime-setup.md:113-118` describes a 3-step escalation policy ("Step 3: escalate to secondary") but no secondary exists.
  - No `oncall.md`, no PagerDuty schedule export, no `who-is-on-call` script anywhere in the repo (verified via `grep -r oncall|on-call|rotation`).
- **Fix (solution + location + how):** Add a 2-person rotation in `DISASTER_RECOVERY.md §8`. Even if it is the same person + a contracted backup, write the contact, paid-pager number, and weekly handoff date down. Wire BetterStack escalation Step 2 → primary, Step 3 → secondary. Until a real second engineer exists, document the failure mode explicitly ("if primary unreachable, status page goes to user-facing 'manual investigation in progress' message and the kill switch is engaged by Supabase support") so callers know what happens.
- **Effort:** S

#### B2. BetterStack monitors documented as setup-instructions, not provisioned
- **Category:** §9 Incident readiness
- **Issue:** `docs/betterstack-uptime-setup.md` is a **how-to**, not a **what-is**. It contains literal placeholders (`<RENDER_WORKER_URL>`, `<your-alert-policy-id>`, `<your-api-token>`) and zero evidence the monitors were ever created (no Terraform, no `.betterstack.json`, no committed monitor IDs, no script run log). Without provisioned monitors, no alert ever fires when `/ready` returns 503.
- **Evidence:**
  - `docs/betterstack-uptime-setup.md:46-99` — the curl commands have unresolved bash variables; running them as-is sends garbage to the API.
  - `docs/betterstack-uptime-setup.md:122-127` — "Validation checklist" entries are unchecked boxes.
  - `DISASTER_RECOVERY.md:200-220` cross-references "BetterStack" but with the same placeholder URL `<render-url>/health`.
- **Fix:** Either (a) provision the monitors via the BetterStack UI, then commit a `docs/betterstack-monitors.json` export so future you can verify config drift, or (b) add a CI smoke test that hits the BetterStack API and asserts the four named monitors exist. Same fix for the PagerDuty/Slack integration mentioned at `docs/betterstack-uptime-setup.md:34`.
- **Effort:** S (config) + S (commit verification artifact)

#### B3. Sentry alert rules exist as a JSDoc comment, not as actual configuration
- **Category:** §9 Incident readiness
- **Issue:** `src/lib/sentry.ts:12-32` describes four alert rules ("Error spike", "High error rate", "Performance", "Worker edge-function errors") **as documentation in a comment**. There is no `sentry-cli alerts create` script, no `.sentryclirc` alert config, no committed alert export, and no runbook step that says "run X to verify alerts are present in Sentry". Code comments don't page anyone.
- **Evidence:**
  - `src/lib/sentry.ts:12-32` — narrative description only.
  - No `sentry/alerts.yaml`, no Sentry Terraform provider in repo (verified via `glob` for `*.tf`).
  - The DR doc never tells the operator to verify Sentry alerts are armed.
- **Fix:** Use Sentry's "Alerts as Code" (sentry-cli or the [Terraform Sentry provider](https://registry.terraform.io/providers/jianyuan/sentry)) to commit the four rules. Minimum viable path: take screenshots of the four configured alerts in Sentry, save under `docs/sentry/alerts/`, and reference them from `src/lib/sentry.ts:12`. Add a manual quarterly task to `DISASTER_RECOVERY.md §6` to verify alert state (one alert that hasn't fired in 90 days is suspicious).
- **Effort:** M

#### B4. No runbook for third-party provider outage (Stripe / OpenRouter / Supabase / ElevenLabs / Hypereal)
- **Category:** §9 Incident readiness
- **Issue:** The five most likely causes of a user-visible outage are upstream vendors going down. None of them have a written response procedure. `docs/admin/runbooks/` has `incident-response.md`, `master-kill.md`, `kill-switch-deploy.md`, `revenue-reconciliation.md`, `newsletter-send.md`, `announcement-publish.md` — and that's it.
- **Evidence:**
  - `ls docs/admin/runbooks/` — six files; none vendor-specific.
  - `docs/admin/runbooks/incident-response.md:23-34` lists per-subsystem mitigations (e.g. "voice_generation errors spiking → pause voice") but does not address: how to detect that the provider itself is down vs. our integration is bad, what to tell users, when to refund credits, how to fall back to an alternate provider if available.
  - Worker has multiple providers in `worker/src/services/openrouter.ts`, `audioProviders.ts`, `geminiNative.ts`, `geminiFlashTTS.ts` — but no "if X fails, fall to Y" routing logic that's documented as an outage-response lever.
- **Fix:** Add five short runbooks under `docs/admin/runbooks/dependency-outages/`:
  - `stripe-down.md` — engage `payments` kill switch, post status banner, no refund actions until Stripe webhook event log is replayable, customer-comms template.
  - `openrouter-down.md` — engage `image_generation` + `video_generation` kill switches if those models route through OpenRouter, check Hypereal/Replicate as alternates, comms template.
  - `supabase-down.md` — meta-failure; the kill-switch table itself lives in Supabase, so document the manual `cancel_all_active_jobs` procedure via worker env-var override, and the path to update the public marketing site banner (which is on Vercel and survives Supabase being down).
  - `elevenlabs-down.md`, `hypereal-down.md` — pause-and-comms flows, with explicit credit-refund policy.
  Each runbook ≤1 page, follows the same template (Detect → Triage → Mitigate → Comms → Resolve → Postmortem trigger).
- **Effort:** M

### Critical

#### C1. Status page link in DR doc points to a domain that's not verified to exist
- **Category:** §14 Production readiness
- **Issue:** `DISASTER_RECOVERY.md:218` says "Set the public URL (e.g. `https://status.motionmax.app` via CNAME...)" — but no evidence the CNAME, the BetterStack page, or even the domain alignment exists. The app domain in monitor docs is sometimes `motionmax.ai` (`docs/betterstack-uptime-setup.md:88`), sometimes `motionmax.app` (`DISASTER_RECOVERY.md:212`). Inconsistent base domain = nobody knows where the real status page lives.
- **Evidence:**
  - `docs/betterstack-uptime-setup.md:18` → `https://motionmax.ai`
  - `DISASTER_RECOVERY.md:212` → `https://motionmax.app`
  - `src/pages/Help.tsx` only references the in-app `support_system_status` RPC; no external status page link found in `src/pages/Help.tsx`, `marketing/src/pages/index.astro`, footer components, or 404 page (verified via `grep -r "status\."`).
- **Fix:** Pick one canonical domain in `DISASTER_RECOVERY.md` and `docs/betterstack-uptime-setup.md`. Add a link to the public status page in (a) marketing site footer, (b) in-app `Help.tsx` "Full status page" link (the placeholder at `src/styles/support-tokens.css:501` already shows intent — wire it up), (c) 5xx error page, (d) email failure notifications. The 5-minute detection question is moot if users have nowhere to find the status page when the app is down.
- **Effort:** S

#### C2. In-app system status (`Help.tsx`) is unreachable when auth is broken
- **Category:** §9 Incident readiness
- **Issue:** `src/pages/Help.tsx:197-211` calls `supabase.rpc("support_system_status")` and the RPC at `supabase/migrations/20260506170000_support_tickets.sql:310-311` is granted only to `authenticated`. When auth/Supabase is down, the only place a user can see status... is also down.
- **Evidence:**
  - `supabase/migrations/20260506170000_support_tickets.sql:310` — `REVOKE ALL ON FUNCTION public.support_system_status() FROM anon, public;`
  - `supabase/migrations/20260506170000_support_tickets.sql:311` — `GRANT EXECUTE ON FUNCTION public.support_system_status() TO authenticated;`
- **Fix:** A public status page (BetterStack-hosted or Statuspage.io) MUST live on a domain that is **not on the same Supabase + Vercel stack** — at minimum on a separate Vercel project + alternate provider, or hosted directly by BetterStack. Then link to it from the marketing footer (Astro site, deployed independently) so it survives an app outage. Optionally relax `support_system_status` to `anon` if the data is non-sensitive (it appears to be operational state only).
- **Effort:** S

#### C3. No alerting on Stripe webhook delivery failures
- **Category:** §9 Incident readiness
- **Issue:** `DISASTER_RECOVERY.md:154-159` describes how to "review missed events in the event log" and "replay failed events manually" — but there is no proactive alert that fires when Stripe webhook deliveries start failing. A silent webhook outage = subscriptions not provisioned, credits not granted, churn from frustrated paid users with no signal in our dashboard.
- **Evidence:**
  - `docs/betterstack-uptime-setup.md:18` lists the webhook URL but only HTTP-pings it (expects 405); a 200 response from the GET doesn't prove webhook signature verification works for incoming POSTs.
  - Sentry alert comment block (`src/lib/sentry.ts:24-27`) mentions "stripe-webhook" but only on **unhandled exception**, not on the more common "Stripe says delivery failed → retry queue" symptom.
  - Stripe Dashboard webhook delivery alerts not referenced in any runbook.
- **Fix:** In Stripe Dashboard → Developers → Webhooks → Notifications, enable "Send notifications when events fail to deliver" to the on-call email + Slack `#alerts-billing`. Add a step to `docs/admin/runbooks/incident-response.md` Mitigate table: row for "Stripe delivery failures spiking → check Stripe Dashboard event log → re-send via `stripe events resend`". Reference the Stripe alerting docs from `DISASTER_RECOVERY.md §4.5`.
- **Effort:** XS

#### C4. Master-kill engagement has up to 60s propagation lag — runbook doesn't disclose
- **Category:** §9 Incident readiness
- **Issue:** `docs/admin/runbooks/master-kill.md:22` claims "Within ≤5 s the worker's `isMasterKillEngaged()` poll catches the flip". But `docs/admin/runbooks/kill-switch-deploy.md:34` contradicts this: "Worker caches feature flags for 60 s ... Test toggles take up to a minute to propagate." During an active incident (credential leak, billing fraud), an extra 55 seconds of in-flight job intake is potentially thousands of dollars of provider spend or user-data exposure.
- **Evidence:**
  - `docs/admin/runbooks/master-kill.md:22` — "≤5 s"
  - `docs/admin/runbooks/kill-switch-deploy.md:34` — "60 s"
  - `worker/src/lib/featureFlags.ts` referenced as the cache source.
- **Fix:** Reconcile the two runbooks. Either (a) shorten the master-kill cache to 5 s in `worker/src/lib/featureFlags.ts` and document the elevated query rate, or (b) update `master-kill.md:22` to honestly say "up to 60 s" and add an explicit step "after engaging master kill, also run `admin_cancel_all_active_jobs()` again at 30 s and 60 s to catch any pre-cache jobs". The current contradiction means the operator either oversells safety or undersells it — both bad in a real incident.
- **Effort:** XS

#### C5. Worker is a single Render instance — no failover; runbook doesn't say so
- **Category:** §14 Production readiness
- **Issue:** `DISASTER_RECOVERY.md:8-13` lists "Worker — Render — us-east" with no replica count, no horizontal-scaling note, no statement about what happens if the Render instance dies. `worker/src/healthServer.ts` exposes `/ready` for external checks but Render doesn't have a built-in pod-replication recovery model unless explicitly configured. If the worker pod crashes, all in-flight generations stall until the next deploy/restart.
- **Evidence:**
  - `worker/src/healthServer.ts` describes a single-process health server.
  - No multi-instance scheduling logic in `worker/src/index.ts` (Sentry init at top-level singleton suggests single-process design).
  - `DISASTER_RECOVERY.md` has no section on "Worker process crash" — it only documents rollback (a different failure).
- **Fix:** Add `DISASTER_RECOVERY.md §4.3b` "Worker process crash recovery" — Render auto-restart policy, what to expect for in-flight jobs, the resume-checkpoint mechanism mentioned in `master-kill.md:22`. If Render is configured for ≥2 instances, document it and the load-balancer health-check setup; if it's 1 instance, document the recovery time SLA and consider scaling to 2 for the launch.
- **Effort:** S

### Major

#### M1. Postmortem template is too thin to drive learning
- **Category:** §9 Incident readiness
- **Issue:** `DISASTER_RECOVERY.md:321-338` "Post-Incident Template" has 5 fields: duration, impact, root cause, timeline, action items. Missing: **severity classification** (Blocker/Critical/Major/Minor — already used in jury.md), **contributing factors** (multiple system weaknesses that combined), **what went well**, **what went poorly**, **detection-to-mitigation time**, **customer-comms log**, **action item OWNERS and DEADLINES** (the current "[ ] preventive measure" has neither). Without owner+date, action items rot.
- **Evidence:**
  - `DISASTER_RECOVERY.md:321-338` — count the fields.
  - No example completed postmortem in `docs/incidents/` (the directory does not exist).
- **Fix:** Replace `DISASTER_RECOVERY.md §10` template with the format described in the Siren agent definition: timeline, impact, severity (use jury.md rubric), root cause, contributing factors, what went well, what went poorly, action items **with owner and date**, customer comms summary. Create `docs/incidents/` directory with a `_template.md` file. Add a one-sentence rule: "Every Critical and Blocker incident gets a postmortem committed to `docs/incidents/YYYY-MM-DD-slug.md` within 7 days. No exceptions."
- **Effort:** S

#### M2. Comms templates only in English despite 11-language launch claim
- **Category:** §9 Incident readiness (audience-relative)
- **Issue:** Brief states 11-language launch. `docs/admin/runbooks/master-kill.md:36-46` ("Comms templates") provides only English templates. Same for `incident-response.md:43-46`, the BetterStack alert messages, the auto-created announcement banner. A French / Japanese / Spanish user during an outage gets an English banner saying "we've temporarily paused video generation" — likely incomprehensible to a portion of the user base.
- **Evidence:**
  - `docs/admin/runbooks/master-kill.md:36-46` — three English-only template strings.
  - `docs/admin/runbooks/incident-response.md` Comms section (line 43) is English narrative only.
  - No `comms-templates/` directory or i18n translation files for incident messaging (verified via grep for `comms.*template|incident.*template`).
- **Fix:** Pre-translate the four canonical comms templates (engage / disengage / direct support reply / status page banner) into all 11 supported languages once. Store under `docs/admin/runbooks/comms-templates/{lang}.md`. Add a step to the `master-kill.md` runbook: "select the correct language pack before posting". This is a 1-hour task that pays back permanently.
- **Effort:** S

#### M3. No automated chaos / DR drill — last test was a "mock run"
- **Category:** §14 Production readiness
- **Issue:** `DISASTER_RECOVERY.md:183-196` records 2026-04-19 as "Mock Test Record" — but the body confirms restore was done against **staging**, not a destroy-and-restore-prod scenario. The "PASS" results are essentially a paper-walkthrough. The action item "Automate quarterly restore test via CI scheduled workflow" is **unchecked** (line 195 still has `[ ]`).
- **Evidence:**
  - `DISASTER_RECOVERY.md:194-195` — both action items from the 2026-04-19 mock are still unchecked, ~3 weeks later.
  - No GitHub Action `dr-test.yml`, no scheduled `cron` workflow for backup verification.
- **Fix:** Add `.github/workflows/dr-restore-test.yml` running monthly against the staging Supabase project, asserting (a) latest snapshot is < 25 hours old, (b) test restore completes within 30 min, (c) row counts on `projects` and `credit_transactions` are non-zero post-restore. Failure pages on-call. This converts "we believe restores work" into "we proved restores worked last Tuesday".
- **Effort:** M

#### M4. Health endpoint exposes operational metrics with no auth — fingerprinting risk
- **Category:** §9 Incident readiness (security-adjacent, but it sits in incident plumbing)
- **Issue:** `worker/src/healthServer.ts` exposes `/health`, `/ready`, **and `/metrics`** with no authentication. `/metrics` returns memory bytes, CPU usage, total processed jobs, total failed jobs, active job count — useful for an attacker to time DoS or inventory the system. The doc at `supabase/functions/health/index.ts:5` even admits "No auth required — this is intentionally public for uptime monitors" — but that argument applies to `/ready`, not `/metrics`.
- **Evidence:**
  - `worker/src/healthServer.ts` — `/metrics` route returns full operational telemetry.
  - No bearer-token check, no IP allowlist, no auth header on `/metrics`.
- **Fix:** Keep `/health` and `/ready` public (they need to be for BetterStack). Gate `/metrics` behind a shared bearer secret (`METRICS_BEARER` env var, set in Render + BetterStack/Grafana scraper). Update `docs/betterstack-uptime-setup.md` to document the header.
- **Effort:** XS

#### M5. No alerting threshold on AI-provider cost spikes
- **Category:** §9 Incident readiness
- **Issue:** Generation routes through paid APIs (Replicate, ElevenLabs, OpenRouter, Hypereal, Fish Audio). A bug or abuse pattern that loops generations can produce a five-figure bill in an hour with **no alert** until the operator opens the admin dashboard. The admin tab `TabApi.tsx:249` shows per-provider breakdown but there is no automated alarm.
- **Evidence:**
  - `src/components/admin/tabs/TabApi.tsx:249` — manual breakdown view exists.
  - No `cost_spike` Sentry rule or `feature_flags` auto-engagement in the codebase (`grep -r "cost.*alert|cost.*spike|spend.*threshold"` returns nothing relevant).
  - No mention in any runbook of what to do if provider spend doubles in 1 hour.
- **Fix:** Add a Postgres function `monitor_provider_spend_5min()` that compares last-5-minute spend to a rolling baseline, plus an Edge Function cron at `*/5 * * * *` that calls it and creates a `severity='critical'` row in `incidents` (which auto-triggers the admin alert path) when spend > 3× baseline. Add a runbook `docs/admin/runbooks/cost-spike.md`: detect → identify offending provider → engage matching pause kill switch → investigate offending user / workload.
- **Effort:** M

#### M6. Edge functions inconsistently instrumented with Sentry
- **Category:** §9 Incident readiness
- **Issue:** Some Edge Functions init Sentry (`supabase/functions/cancel-with-reason/index.ts:6-8`, `create-checkout`, `customer-portal`, `pause-subscription`, `list-invoices`, `stripe-webhook`, `submit-support-ticket`, `update-pack-quantity`). The `health` function does not (which is fine — it's a probe). But there are likely other functions not in this list that handle business logic without Sentry. An unhandled exception in a non-instrumented edge fn is silent.
- **Evidence:**
  - `grep -r "Sentry\|@sentry" supabase/functions` returns 11 functions out of however-many exist (`ls supabase/functions` to enumerate the gap).
  - No CI lint rule that asserts every non-probe edge function imports Sentry.
- **Fix:** Add an ESLint custom rule (or a simple grep-based CI step in `.github/workflows/ci.yml`) that fails the build when a `supabase/functions/<name>/index.ts` exists without `Sentry.init` (excluding `health` and any other declared probes). Alternatively, factor Sentry init into `supabase/functions/_shared/sentry.ts` and require every function to import it.
- **Effort:** S

### Minor

#### Mi1. Sentry replay sample rate at 10% may miss low-volume blocker bugs
- **Category:** §9
- **Evidence:** `src/lib/sentry.ts:124` — `replaysOnErrorSampleRate: 0.1`
- **Fix:** For a launch, raise to 1.0 (every error session gets a replay) until traffic > 10K errors/day, then taper. Storage cost is trivial relative to the diagnostic value during launch.
- **Effort:** XS

#### Mi2. Worker Sentry init has no `release` tag
- **Category:** §9
- **Evidence:** `worker/src/index.ts:2` — `Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'production', tracesSampleRate: 0.1 });` — no `release` field. Front-end has it (`src/lib/sentry.ts:70`).
- **Fix:** Pass `release: process.env.RENDER_GIT_COMMIT || process.env.npm_package_version` so a regression is attributable to a specific deploy. Render injects `RENDER_GIT_COMMIT` at build time.
- **Effort:** XS

#### Mi3. DR test action items uncompleted but no follow-up date
- **Category:** §14
- **Evidence:** `DISASTER_RECOVERY.md:194-195` — two unchecked boxes from 2026-04-19; no due date on either.
- **Fix:** Either complete them or add explicit due dates and an owner. Open action items without owners are noise.
- **Effort:** XS

#### Mi4. No "what to tell users" template for partial-degradation states
- **Category:** §9
- **Evidence:** Comms templates in `master-kill.md:36-46` cover only "fully paused" and "fully restored". Nothing for "voice generation degraded but image generation working" — the most common real outage mode in a multi-provider system.
- **Fix:** Add 3 more comms templates for partial-degradation: per-subsystem pause messages users see in the in-app banner.
- **Effort:** XS

### Polish

#### P1. Post-incident review window stated as "48 hours" in one place, "7 days" implied elsewhere
- **Category:** §9
- **Evidence:** `DISASTER_RECOVERY.md:170` says "Conduct post-incident review within 48 hours". The Siren agent norm (and most studio docs) say 7 days for postmortem commit. Pick one and use it consistently.
- **Fix:** Reconcile to one window (7 days for written postmortem, 48 hours for "blameless verbal review with stakeholders" if you want both).
- **Effort:** XS

#### P2. Escalation contacts table lacks PagerDuty / phone numbers
- **Category:** §9
- **Evidence:** `DISASTER_RECOVERY.md:243-249` lists only email + dashboard. Vendor support emails have ~hour-scale response; for a Critical incident you want a phone-callable PagerDuty rotation reference for the lead engineer.
- **Fix:** Add a phone number column. Mark which contacts are 24/7 vs. business-hours.
- **Effort:** XS

---

## Production Blockers Table

| ID | Severity | Issue | Owner Layer |
|----|----------|-------|-------------|
| B1 | Blocker  | On-call rotation has bus factor of 1; no documented secondary | DevOps (Siren) |
| B2 | Blocker  | BetterStack monitors are docs only — never provisioned | DevOps |
| B3 | Blocker  | Sentry alert rules exist as comments, not as configured alerts | DevOps |
| B4 | Blocker  | No runbooks for Stripe / OpenRouter / Supabase / ElevenLabs / Hypereal outages | DevOps + Backend |
| C1 | Critical | Status page URL inconsistent (motionmax.ai vs motionmax.app) and never linked from app | DevOps + Frontend |
| C2 | Critical | In-app status reachable only when the app already works (auth-gated) | Backend + Frontend |
| C3 | Critical | No alert on Stripe webhook delivery failures | DevOps + Backend |

## Top 10 Priority Fixes (incident-response slice only)

1. **B2** — Provision the four BetterStack monitors with real URLs, commit a config export. Without this, no alert ever fires. (S)
2. **B3** — Configure the four Sentry alert rules in the Sentry dashboard (or via Terraform), commit screenshots/IDs. (M)
3. **B1** — Name a secondary on-call human and document in `DISASTER_RECOVERY.md §8`. Even if it's the same person + one consultant, have a fallback. (S)
4. **B4** — Write 5 dependency-outage runbooks (Stripe / OpenRouter / Supabase / ElevenLabs / Hypereal). (M)
5. **C2** — Move public status page off the app stack (BetterStack-hosted is fine), link from marketing footer + 5xx page. (S)
6. **C3** — Enable Stripe Dashboard webhook-failure notifications → Slack + email. (XS)
7. **C4** — Reconcile the 5s vs 60s master-kill propagation contradiction; either fix the cache or fix the runbook. (XS)
8. **M1** — Replace 5-field postmortem template with the full template (severity / contributing / went well / went poorly / owner + date). (S)
9. **M2** — Translate the four canonical comms templates into all 11 supported languages. (S)
10. **M3** — Add `.github/workflows/dr-restore-test.yml` so DR is verified monthly, not assumed. (M)

---

## Items I was unable to verify from static analysis

- Whether the BetterStack monitors actually exist in the BetterStack account (not visible from repo). If they do exist, items B2 / C1 collapse to "documentation hygiene" rather than Blocker. I am rating them Blocker because the **on-disk evidence shows them as undeployed**.
- Whether the Sentry alert rules exist in the Sentry dashboard. Same caveat — rated Blocker based on absence of any committed evidence.
- Whether Render is configured for >1 worker instance.
- Whether the `support_system_status` RPC's "operational/degraded/down" buckets are driven by a real signal (e.g. latest worker `lastPollAt` timestamp) or hardcoded — I read the consumer (`Help.tsx`) but not the body of the SQL function.

If the creator can show provisioning evidence (BetterStack monitor IDs, Sentry alert IDs, screenshot of dashboards), Blockers B2 and B3 demote to Major (documentation gap rather than missing capability).
