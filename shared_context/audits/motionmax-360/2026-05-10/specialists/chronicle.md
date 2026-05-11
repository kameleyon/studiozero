# Chronicle — Logging & Audit Findings

**Project:** motionmax-360
**Date:** 2026-05-10
**Reviewer:** Chronicle (DevOps · Logging & Audit)
**Scope:** §9 — structured logging, redaction, trace-ID propagation, audit trails for admin + billing actions, log retention.
**Audience-relative posture:** consumer SaaS handling Stripe payments, account deletions, voice biometrics (cloning), and admin moderation actions over PII. Standards applied: SOC 2 CC7.2 (audit log integrity), GDPR Art. 30 (records of processing), PCI-DSS 10.x (audit trails for cardholder access).

---

`★ Insight ─────────────────────────────────────`
This codebase has the *bones* of a real logging system — a typed audit-event union, a Postgres redaction trigger, fingerprinting for error grouping, dual stdout + DB sinks. But the wiring has gaps where the contract breaks silently: a trace-ID API that nobody calls, an api_call_logs table that's never given a userId, an audit insert that runs after Stripe handlers commit. The instinct is right; the last-mile rigor is where the holes are.
`─────────────────────────────────────────────────`

## Findings (sorted by severity within category §9)

### CRITICAL

#### C-1. Trace-ID propagation is dead code — zero end-to-end correlation from browser to worker
- **Severity:** Critical
- **Evidence:**
  - `src/lib/tracing.ts:22,33,48` exports `generateTraceId`, `startGenerationTrace`, `attachTraceHeader`.
  - `Grep "generateTraceId|attachTraceHeader|startGenerationTrace"` across the entire `src/` tree returns **only the definitions** — zero callers. Frontend never generates or attaches a trace ID to any edge-function fetch.
  - `supabase/functions/generate-cinematic/index.ts:802` reads `req.headers.get("X-Trace-Id") || crypto.randomUUID()` — because the FE never sends the header, every request gets a fresh server-side UUID.
  - `worker/src/index.ts:509` reads `job.payload?.traceId` — only receives a value because `generate-cinematic` enqueues it at line 956. The FE→edge hop is broken; edge→worker is wired.
  - `audit.ts:75-83 AuditOpts` interface has no `traceId` field, so even when the worker has one it never lands in `system_logs`.
  - `system_logs` schema (migration `20260201233354`) has no `trace_id` column; `20260505160000_admin_phase2_schema_additions.sql:44-49` added `fingerprint` and `worker_id` but not `trace_id`.
- **Impact:** Chronicle rule #5 violated ("If you cannot trace a user's action from button click to database commit via a single ID, the logging is incomplete"). Support cannot give a user a single reference ID. Each layer's Sentry trace is its own island.
- **Fix:** In `src/lib/api.ts` (or wherever edge functions are invoked) call `generateTraceId()` once per user action, store on a `useRef` so retries reuse it, attach via `attachTraceHeader`, and include it in the JSON body so `generate-cinematic` enqueues the same value into the worker payload (it already forwards `traceId` — `generate-cinematic/index.ts:956`). Add `trace_id text` column to `system_logs` and to `AuditOpts`. Return it in API error responses for support reference.
- **Effort:** S

#### C-2. `api_call_logs` is unattributable — every LLM call inserts NULL userId / generationId / cost
- **Severity:** Critical
- **Evidence:**
  - `worker/src/services/openrouter.ts:170,178,183,259,267,286` — every `writeApiLog(...)` call hard-codes `userId: undefined, generationId: undefined, cost: 0`.
  - `worker/src/services/hypereal.ts:799,820,823,856,866` — same pattern.
  - `worker/src/services/imageGenerator.ts:689,706,723,739` — same.
  - `worker/src/services/audioASR.ts:123,129,133` — same.
  - The retention rationale in `supabase/migrations/20260419340000_log_retention_policy.sql:6` calls out api_call_logs as kept "30 days (lower volume; needed for billing/abuse forensics)" — neither use case is satisfiable when 100 % of LLM rows are anonymous and zero-cost.
- **Impact:** No per-user cost attribution; abuse investigations against an anonymous row can't connect a spike to a user; refund disputes can't reconstruct cost-of-goods. The table is currently a write-only blob.
- **Fix:** Thread `{ userId, generationId, costUsd }` through the call sites — every LLM invocation in the worker happens inside a handler that already has a `job.user_id` and `job.payload.generationId`. Plumb both into the service-layer call signature (e.g. `callOpenRouter(opts, ctx: { userId, generationId })`) and pass `ctx` straight into `writeApiLog`. Compute `cost` from the model's per-token rate and the response token counts (Hypereal's `creditsUsed` is already received per `hypereal.ts:285`).
- **Effort:** M

#### C-3. Stripe webhook audit is post-handler and best-effort — billing events can be lost silently
- **Severity:** Critical
- **Evidence:**
  - `supabase/functions/stripe-webhook/index.ts:572-604` writes the audit row AFTER all payment handlers run AND AFTER the idempotency insert at line 572.
  - `_shared/log.ts:55-128` — `writeSystemLog` is documented (line 13) and implemented (line 116-128) to **swallow all errors**. A failed audit insert returns silently; the webhook returns 200 to Stripe regardless.
  - There is no transaction wrapping the handler mutations + the audit insert — they are independent inserts at different points in the function.
- **Impact:** A payment can succeed (credit grant, subscription change, refund) without an audit row. SOC 2 CC7.2 / PCI-DSS 10.2 require non-repudiable audit trails for billing changes. Chronicle rule #6 ("data mutations to critical records happen alongside an audit log insert in the same database transaction") is violated.
- **Fix:** Move the `writeSystemLog` call into the same SQL transaction as the credit-grant / subscription-update inside the handler (use a Postgres function called from the edge fn, OR insert via a single RPC that takes both rows). On audit failure, return HTTP 5xx so Stripe retries the webhook — losing an audit row is worse than a duplicate webhook (handlers are already idempotent per the comment at line 569-571).
- **Effort:** M

#### C-4. Two retention crons race on `system_logs` with conflicting windows (7d vs 90d) at the same time
- **Severity:** Critical (silent data behavior bug)
- **Evidence:**
  - `supabase/migrations/20260404000005_data_retention_and_cleanup.sql:106-120,210-214` schedules `daily-data-retention` at `0 3 * * *` UTC — purges system_logs older than **90 days**.
  - `supabase/migrations/20260419270001_reduce_system_logs_retention.sql:13` `CREATE OR REPLACE FUNCTION purge_old_system_logs` redefines the function body to delete at **7 days**.
  - `supabase/migrations/20260505140000_admin_phase2_cron_schedules.sql:64-68` schedules a **second** cron `purge-system-logs` also at `0 3 * * *` UTC.
  - Net result on production: both cron jobs fire at the same instant; both call `purge_old_system_logs()`; whichever finishes first deletes 7-day-old rows; the second call is a no-op. Operationally fine but the migration history reads as if 90-day retention is policy when 7 days is what runs. Compass/Comply will misread this.
- **Impact:** Documentation-vs-reality drift. The "90 days" comment in the older migration is now false but still in the codebase; an auditor reviewing GDPR retention claims will get the wrong answer. Also: 7-day system_logs retention is too short for any incident review that takes more than a week to surface (e.g. a delayed user complaint about a billing event).
- **Fix:** Decide a single retention number, document it in `DEPLOYMENT_SECURITY.md` and a single migration. Drop the duplicate schedule. Recommend: `system_logs` 30 days for `system_error`/`system_warning` (long-tail incident review), 7 days for `system_info` — implement by parameterizing `purge_old_system_logs(category_in text, days int)` and scheduling two separate calls.
- **Effort:** S

### MAJOR

#### M-1. Frontend Sentry redaction is shallow and key-set is too narrow
- **Severity:** Major
- **Evidence:**
  - `src/lib/sentry.ts:58-65` `SENSITIVE_KEY_RE = /password|token|email|jwt|key|secret/i` and `scrubSensitive` only walks one level (`Object.entries(...)`).
  - The Postgres `sanitize_jsonb_value` (migration `20260320210300:32-122`) is recursive and covers `ssn`, `cvv`, `cvc`, `credit_card`, `card_number`, `private_key`, `bearer`, `auth_token`, `refresh_token`, `stripe_key` — **none of these match the FE regex**.
  - `slog`'s `_errorSink` (`structuredLogger.ts:124-130` → `sentry.ts:94-108`) forwards `entry.ctx` to Sentry's `extra` without re-running the scrubber on nested objects. A breadcrumb like `slog.error("checkout failed", { user: { email, ssn }, card: { number, cvv } })` ships every leaf to Sentry. Only `{ password: "..." }` at the top level would be redacted.
  - `beforeSend` (line 84-90) re-walks `event.extra` once but uses the same shallow `scrubSensitive`, so it does not rescue nested fields.
- **Impact:** PII leaks to Sentry SaaS — GDPR Art. 28 issue (Sentry is a sub-processor; nothing in the DPA covers SSN/PAN). Chronicle rule #4 violated ("Auto-redact PII and secrets at the application edge").
- **Fix:** Replace `scrubSensitive` with a recursive walker (mirror the SQL trigger's logic in TS — already a reference implementation exists at `migrations/20260320210300:32-122`). Expand the key set to match the SQL list. Add string-pattern checks (Stripe key prefixes, JWT shape) so a leaked secret-shaped value gets redacted even when its key name is innocent.
- **Effort:** S

#### M-2. Stdout redaction asymmetry — secrets land in Render log drain even when the DB row is sanitized
- **Severity:** Major
- **Evidence:**
  - `worker/src/lib/logger.ts:82-103` `emitStructuredConsoleLog` JSON-stringifies the full payload (including `details`) directly to stdout.
  - The SQL trigger `sanitize_log_details` (migration `20260320210300:125-129`) fires `BEFORE INSERT OR UPDATE ON public.system_logs` — only on the DB row.
  - The supabase edge `_shared/log.ts:69-88` does the same: stdout receives raw `details`, DB row gets sanitized.
  - Net effect: a worker that emits `await audit("voice.clone_failed", { details: { auth_token: "..." } })` writes **two** copies — one redacted (DB), one raw (Render → log shipper → SaaS log store).
- **Impact:** Chronicle rule #4 violated for the stdout path. Once a secret reaches the log aggregator it is a security incident; rotation + breach disclosure may be required.
- **Fix:** Move the sanitizer into the application layer (TS) and apply it BEFORE both `console.log` and the DB insert. Reuse the same key/regex list across worker, edge fn, and FE. Reference SQL implementation at `migrations/20260320210300:32-122`.
- **Effort:** S

#### M-3. `serve-media` blocks the 302 redirect on a logging round-trip
- **Severity:** Major
- **Evidence:**
  - `supabase/functions/serve-media/index.ts:120-129` — comment claims "writeSystemLog swallows errors → never blocks the 302" but the line is `await writeSystemLog(...)`. `await` provably waits for the Postgres round-trip even when errors are swallowed inside.
  - `_shared/log.ts:91-103` `await supabase.from("system_logs").insert(...)` — the network insert latency (50–200 ms typical Supabase RTT from edge) is paid before the redirect returns.
- **Impact:** Chronicle rule #2 violated ("Never block the user response to write a log"). Hot media path adds measurable latency to every signed-URL fetch on every page that displays scene previews. On mobile (the primary surface per brief) this compounds.
- **Fix:** Drop the `await` — `void writeSystemLog({...})` — or `EdgeRuntime.waitUntil(writeSystemLog({...}))` if the runtime supports it (Deno deploy does). Rename the misleading comment.
- **Effort:** XS

#### M-4. `admin_logs` schema drift between two migrations — newer migration is documentation-only fiction
- **Severity:** Major
- **Evidence:**
  - `supabase/migrations/20260201152356_6e193c85-...sql:137-147` defines `admin_logs(admin_id, action, target_type, target_id, details, ip_address, user_agent, created_at)` and creates the table.
  - `supabase/migrations/20260327000002_enhance_admin_logs.sql:4-15` declares an entirely different shape: `admin_user_id, action_type, affected_user_id, affected_resource_type, affected_resource_id` — but uses `CREATE TABLE IF NOT EXISTS`, so on production it silently no-ops.
  - All actual call sites use the OLD column names: `admin-force-signout/index.ts:166-177`, `admin-stats/index.ts:387-395, 568, 625, 664, 864, 1027`, `admin-hard-delete-user/index.ts:204-215`, `admin-send-newsletter/index.ts:369`, `admin-send-reset-link/index.ts:136`, `notify-user-of-message/index.ts:128`.
  - On a fresh dev DB rebuilt from migrations, the SECOND migration would actually create the new schema and then the first migration's existing schema would never run — opposite drift. The two migrations are incompatible and the order matters.
- **Impact:** New developers reading `20260327000002` will write code against `affected_user_id`, hit a 42703 (column does not exist) at runtime in prod. Migration history is unreliable as documentation. Migration replay on staging diverges from prod.
- **Fix:** Delete `20260327000002_enhance_admin_logs.sql` (or write a real `ALTER TABLE` migration that adds the missing columns + backfills + drops the old ones). Update all call sites in one batch. Add a regression test that selects from `admin_logs` with both shapes.
- **Effort:** M

#### M-5. Stripe audit row captures stripe_event_id only — amount, currency, plan, refund reason all dropped
- **Severity:** Major
- **Evidence:**
  - `supabase/functions/stripe-webhook/index.ts:592-604` — `details: { stripe_event_id, stripe_event_type, customer_id }`. No amount, no currency, no invoice id, no plan/price id, no refund reason, no email.
  - The handlers above (lines 200-565 — checkout completed, subscription updated, refund created) all have these values in scope.
- **Impact:** Compliance review or a customer dispute can't be answered from the audit table; reviewer must re-fetch from Stripe (rate-limited, slow, requires Stripe API access). Chronicle rule #1 violated ("Failed to process Stripe webhook for user_id 123: Network timeout" beats "Error happened" — but only when the row carries the facts).
- **Fix:** Build an `extractEventSummary(event)` helper that pulls `{ amount, currency, plan_id, invoice_id, refund_reason }` from the typed Stripe event union and merge into `details`. Keep PII (email) out of the row — `customer_id` is already enough for re-lookup.
- **Effort:** S

#### M-6. No retention or archival policy for `admin_logs`
- **Severity:** Major
- **Evidence:**
  - Searched `supabase/migrations/` for any `purge_old_admin_logs` or `DELETE FROM admin_logs` — zero hits.
  - `migrations/20260404000005_data_retention_and_cleanup.sql:188-199` purges `system_logs`, `archives`, `jobs`, `webhook_events` — not `admin_logs`.
  - `migrations/20260419340000_log_retention_policy.sql` documents retention only for `system_logs` (7d) and `api_call_logs` (30d).
- **Impact:** Two readings:
  1. Intentional (audit trails must persist forever for SOC 2 / GDPR Art. 30) — but no comment, schema annotation, or `DEPLOYMENT_SECURITY.md` entry says so. A future engineer will add a "cleanup" cron and silently destroy compliance evidence.
  2. Oversight — the table grows unbounded, eventually a slow `idx_admin_logs_created` scan becomes a problem.
- **Fix:** Document the retention decision explicitly. Recommended: keep `admin_logs` for 7 years (typical SOC 2 / financial retention) with a cold archive to Supabase Storage (Parquet) at 90 days. Add a `COMMENT ON TABLE admin_logs IS 'Permanent audit trail — do NOT add a purge cron. Cold archive to motionmax-archive bucket at 90d.'`.
- **Effort:** S (policy + COMMENT) / M (with archival)

#### M-7. `audit()` does not stamp the request trace ID even when one exists
- **Severity:** Major
- **Evidence:**
  - `worker/src/lib/audit.ts:75-83` `AuditOpts` has no `traceId` field. `audit()` takes `userId`, `generationId`, `projectId`, `jobId` — but not the trace id that the worker already extracted at `worker/src/index.ts:509`.
  - The Sentry scope at `worker/src/index.ts:514` does set `traceId` as a tag for the Sentry transaction, but that ID never reaches `system_logs` or any DB row.
- **Impact:** Even if C-1 is fixed and the FE starts generating trace IDs, the audit log won't carry them — defeating the point of correlation. A support engineer reading the trace ID from a Sentry alert can't `select … from system_logs where trace_id = …`.
- **Fix:** Add `trace_id text` column to `system_logs` (and `api_call_logs`). Add `traceId?: string` to `AuditOpts` and `WriteSystemLogOpts`. Plumb `job.payload?.traceId` from the per-job scope (`worker/src/index.ts:509`) into a per-job audit factory: `const log = makeAuditLogger({ userId, jobId, traceId })`.
- **Effort:** S

#### M-8. Sentry breadcrumbs and `slog` paths can double-report errors to Sentry
- **Severity:** Major
- **Evidence:**
  - `src/lib/sentry.ts:94-109` registers an `_errorSink` that calls `Sentry.captureException` for every `level === "error"` log.
  - Sentry's React SDK installs a global handler that captures unhandled exceptions and (when `consoleIntegration` is enabled — default in `@sentry/react`) also captures `console.error` output.
  - `structuredLogger.ts:100` `fn = console.error` for level=error in production. So a single `slog.error("x", {}, err)` produces:
    1. `_errorSink` → `Sentry.captureException`
    2. `console.error(JSON.stringify(entry))` → Sentry console capture → second event.
- **Impact:** Sentry quota burn (each unique error counts twice toward the project quota). Alert fatigue (`>50 errors/hour` rule at `src/lib/sentry.ts:21` triggers earlier than intended). Issue grouping is split because the two events have different fingerprints (one has the Error stack, the other a JSON string).
- **Fix:** Either disable the Sentry browser console integration (`integrations: [..., Sentry.consoleIntegration({ levels: [] })]`) OR change the `_errorSink` for `level==="error"` to use `Sentry.addBreadcrumb` (since `console.error` will already capture). Pick one path; document it.
- **Effort:** XS

### MINOR

#### m-1. `worker_id` defaults to `os.hostname()` on Render, which is not stable
- **Severity:** Minor
- **Evidence:** `worker/src/lib/logger.ts:39-43` resolves `WORKER_ID` from `process.env.WORKER_ID || RENDER_INSTANCE_ID || os.hostname()`. Render Web Services rotate hostnames on deploy and on container restart; without `RENDER_INSTANCE_ID` (set automatically by Render but only for Web Services, not Background Workers in all plans), the hostname can change mid-day and break "filter by replica" on the admin Console.
- **Fix:** Set `WORKER_ID` explicitly via `render.yaml` env block to `${RENDER_SERVICE_NAME}-${RENDER_INSTANCE_ID}` so the value is stable per replica per deploy and human-readable.
- **Effort:** XS

#### m-2. Frontend `slog.info()` is silently dropped in production but the API hides this
- **Severity:** Minor
- **Evidence:** `structuredLogger.ts:23` `PROD_MIN = LEVEL_VALUE.warn`; `shouldLog()` at line 103-106 drops debug+info in prod. There is no JSDoc on `slog.info` warning callers. A dev who instruments a checkout flow with `slog.info("checkout step 2")` will see nothing in prod and assume their code didn't run.
- **Fix:** Add `@remarks In production, only warn/error levels are emitted.` to the JSDoc on `slog.debug` and `slog.info`. Optionally expose `import.meta.env.VITE_LOG_LEVEL` so QA can flip on info logs in staging.
- **Effort:** XS

#### m-3. `audit()` event union is missing key admin actions
- **Severity:** Minor
- **Evidence:** `worker/src/lib/audit.ts:21-71 SystemEventType` lists user/billing/voice/autopost events but no `admin.*` events, despite admin actions being logged via `writeSystemLog` directly at `admin-force-signout/index.ts:188` (`event_type: "admin.force_signout"`), `admin-hard-delete-user/index.ts:260` (`event_type: "user.account_deleted"` — which conflates user-initiated and admin-initiated deletes).
- **Impact:** `event_type` field is now an untyped free-for-all in the edge layer; the typed union no longer reflects reality. Searching for "all admin events" requires guessing prefixes.
- **Fix:** Extend the union with `admin.user_deleted_hard | admin.user_force_signedout | admin.password_reset_sent | admin.newsletter_sent | admin.message_sent | admin.flag_resolved | admin.feature_flag_toggled | admin.killswitch_triggered`. Update edge fns to use `audit()` instead of raw `writeSystemLog()`.
- **Effort:** S

#### m-4. `webhook_events` retention (7d) is shorter than typical Stripe replay window
- **Severity:** Minor
- **Evidence:** `migrations/20260404000005:158-172` purges `webhook_events` at 7 days. Stripe retries for up to 3 days but high-volume merchants occasionally request replays of older events for reconciliation. 30 days is the conservative norm.
- **Fix:** Bump to 30 days. Trivial (single literal in `purge_old_webhook_events`).
- **Effort:** XS

### POLISH

#### p-1. Audit `details` JSON has no schema versioning
- Adding/removing fields breaks any analytics that joins on `details ->> 'foo'`. A `schema_version` int in every audit `details` block lets queries fence on shape.
- **Effort:** XS

#### p-2. `_errorSink` swallows its own throws silently (`structuredLogger.ts:127`)
- The `try { _errorSink(entry) } catch {}` masks Sentry SDK init bugs. Use a one-time `console.warn("[slog] error sink threw:", e)` at module scope so a misconfigured Sentry doesn't go unnoticed forever.
- **Effort:** XS

#### p-3. `breadcrumbAdminTabOpen` comment claims low-PII but the Sentry user context still carries actor email
- `sentryBreadcrumbs.ts:51-61` correctly omits the user_id from the breadcrumb but the Sentry `setUser({ id, email })` call elsewhere (search `Sentry.setUser` if present) would still attach actor identity. Document that this is by design (admin must be identifiable for compliance) — current comment reads as if the breadcrumb is anonymous, which is misleading.
- **Effort:** XS

---

## Production Blockers (§9 only)

| # | Finding | Why it blocks production |
|---|---------|--------------------------|
| C-1 | Trace IDs never propagate FE→edge→worker | No correlation = no support, no incident response under 5 min (Chronicle rule #5, brief §9 explicit ask) |
| C-2 | api_call_logs has no userId / generationId / cost | No per-user billing or abuse forensics on LLM spend; the only record of revenue cost is unattributable |
| C-3 | Stripe webhook audit is post-handler & best-effort | Billing mutations can commit without an audit row (SOC 2 CC7.2 / PCI-DSS 10.2 fail) |
| C-4 | Two retention crons race; documented retention ≠ actual retention | Compliance attestation will be wrong; auditor finds the discrepancy |

## Top 10 §9 Priority Fixes

| Rank | Finding | Severity | Effort | Notes |
|------|---------|----------|--------|-------|
| 1 | C-3 — Move Stripe audit into the same txn as the handler; fail webhook on audit failure | Critical | M | Compliance must-have; affects launch eligibility |
| 2 | C-1 — Wire `tracing.ts` into FE fetches; add `trace_id` column; plumb to worker | Critical | S | One-day fix, unlocks every other observability win |
| 3 | C-2 — Thread userId/generationId/cost into all `writeApiLog` call sites | Critical | M | Required for finance reporting + abuse prevention |
| 4 | C-4 — Reconcile retention crons; pick a single policy and document | Critical | S | Drop one schedule; ALTER COMMENT; touch DEPLOYMENT_SECURITY.md |
| 5 | M-2 — Apply redaction at the TS layer before stdout AND DB inserts | Major | S | Closes the secret-leak path to log SaaS |
| 6 | M-1 — Recursive scrubber with extended key set in `sentry.ts` | Major | S | GDPR Art. 28; mirror existing SQL trigger logic |
| 7 | M-3 — Drop `await` on `serve-media`'s log call | Major | XS | One character; trivially shaves 50–200 ms off every media fetch |
| 8 | M-5 — Capture amount/plan/refund_reason in Stripe audit details | Major | S | Self-contained billing audit rows for compliance review |
| 9 | M-4 — Fix `admin_logs` schema drift; delete the dead migration | Major | M | Migration replay determinism; new-dev footgun |
| 10 | M-7 — Add `traceId` field to `AuditOpts` and `system_logs` | Major | S | Pre-req for C-1 to actually be queryable |

---

## Out-of-Scope Notes (passed to other reviewers)

- **Compass (compliance):** the 7-day `system_logs` retention is short for GDPR Art. 30 records-of-processing if those events qualify as such. Confirm whether `user.signed_up`, `user.account_deletion_requested`, `user.account_deleted` need longer retention than 7 days.
- **Trace (observability):** Sentry alert thresholds at `sentry.ts:13-32` are documented but not provisioned in code. Confirm with Watch whether alert rules exist in the Sentry org or only in this comment.
- **Cipher (security):** the SQL `sanitize_jsonb_value` regex for JWTs at `migrations/20260320210300:109` requires all three segments ≥ 20 chars — short tokens slip through. Consider weakening the segment-length minimum.
- **Halo (admin/ops UX):** admin Console "filter by replica" depends on `worker_id` stability; see m-1.

---

**End of Chronicle findings.**
