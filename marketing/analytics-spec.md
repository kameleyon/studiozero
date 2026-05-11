# Studio Zero — Analytics & Attribution Spec

**Phase:** 8 — GTM / Growth Instrumentation
**Owner:** Lens (Product Analytics) — Growth Layer
**Coordinates with:** Hook (experiments + TTFV), Signal (channel ROI), Herald (lifecycle email tagging), Penny (revenue), Comply (consent + retention), Cipher (PII scrub), Forge (typed `track<EventName>()` implementation), Atlas (`consent_records` table)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** First draft for Phase 8 Jury exit gate
**Reader contract:** Forge can implement `analytics-gate.ts`, the `track<EventName>()` typed dispatcher, and the `attribution.ts` server module directly from this spec. Atlas can extend `consent_records`. No PRD re-read required.

> **Method.** Taxonomy derived from PRD v0.5 §6.1 (cookie consent gate), §13.6 (PostHog + Sentry rules), §14.4 (retention table), §14.5 (EU AI Act + FTC + CCPA), §15 (success metrics), §15.5 (GTM channels), §17 D2 (free-tier conversion loop), §19 R21 (alpha-pipeline tracking). Cross-references: `architecture/system-diagram.md` TB-9 (outbound to PostHog), `sprint/owner-matrix.md` (Lens responsibilities per milestone), `design/components/nav/nav.jsx` (consent banner is a top-nav surface).

> **Lens posture.** Every event consent-gated. Every property PII-stripped. Identify only after signup; reset on signout. No event taxonomy drift — Forge implements via a typed `track<EventName>()` dispatcher so adding a new event requires a schema PR. We track what we ship; we ship what we track.

---

## 1. Consent-gated initialization

**Hard rule (PRD §6.1):** PostHog, GA4, and any third-party analytics initialize only AFTER the cookie consent banner returns `status='accepted'` or `status='partial'` with the analytics bucket on. Pre-consent telemetry is buffered locally; if the customer rejects, the buffer is discarded and **no event ever leaves the browser**.

### 1.1 Buffer semantics

```
sessionStorage key: sz.analytics.preconsent.queue
shape: { events: [{name, ts, props}], capped: 50, eviction: 'FIFO' }
TTL: session-bound (cleared on tab close)
```

- Max 50 events. Beyond 50 → FIFO eviction (oldest drops, newest enters).
- Queue is sessionStorage, not localStorage — a closed tab is a withdrawn consent prompt; we do not preserve pre-consent events across sessions.
- Queue is **not** persisted to the server. Pre-consent events live only in the customer's browser memory until the customer's own consent decision releases or destroys them.

### 1.2 State transitions

| Pre-state | Customer action | Post-state | Side effects |
|---|---|---|---|
| `unknown` (first visit, no `sz_consent` cookie) | (any event fire attempt) | `unknown` | Event pushed to buffer; PostHog/GA4 not initialized |
| `unknown` | clicks "Accept all" in banner | `accepted` | (1) `consent_records` row inserted server-side; (2) `sz_consent` cookie set; (3) PostHog `init()` + `posthog.opt_in_capturing()`; (4) GA4 `gtag('consent', 'update', {analytics_storage:'granted'})`; (5) drain buffer via `posthog.capture()` in original order |
| `unknown` | clicks "Reject non-essential" | `rejected` | (1) `consent_records` row with `status='rejected'`; (2) `sz_consent` cookie set; (3) `sessionStorage.removeItem('sz.analytics.preconsent.queue')` — **buffer discarded, never transmitted**; (4) PostHog/GA4 stay un-initialized |
| `unknown` | clicks "Customize" → analytics OFF, marketing OFF | `partial` (necessary only) | Same as rejected |
| `unknown` | clicks "Customize" → analytics ON, marketing OFF | `partial` (analytics only) | PostHog init; GA4 init; drain buffer; ad-attribution events (`utm_*` from paid channels) still fire because they're tagged `analytics`, not `marketing` |
| `accepted` / `partial` | clicks "Manage cookies" → withdraws analytics | `withdrawn` | `consent_changed` event fires (only event allowed to fire across the boundary, since withdrawing IS a consent event by GDPR Art. 7(3)); then `posthog.opt_out_capturing()` + GA4 `gtag('consent','update',{analytics_storage:'denied'})` |

### 1.3 Module shape (for Forge)

```ts
// app/lib/analytics-gate.ts
export type ConsentStatus = 'unknown' | 'accepted' | 'partial' | 'rejected' | 'withdrawn';

interface PreconsentEvent { name: string; ts: number; props: Record<string, unknown>; }

class AnalyticsGate {
  private status: ConsentStatus = 'unknown';
  private buffer: PreconsentEvent[] = [];   // capped at 50, FIFO
  private posthogReady = false;
  private ga4Ready = false;

  // Public API — the ONLY way the app talks to analytics.
  capture<E extends EventName>(name: E, props: EventProps<E>): void {
    const stripped = stripPII(props);          // §7.1
    if (this.status === 'accepted' || (this.status === 'partial' && this.analyticsBucketOn())) {
      this.dispatch(name, stripped);
    } else if (this.status === 'unknown') {
      this.bufferPush({ name, ts: Date.now(), props: stripped });
    }
    // 'rejected' | 'withdrawn' → drop silently. No telemetry about telemetry.
  }

  identify(userId: string, traits?: Record<string, unknown>): void { /* only after signup, §2.4 */ }
  reset(): void { /* on signout */ }
  onConsentChange(next: ConsentStatus): void { /* drains or destroys buffer per §1.2 */ }
}

export const analytics = new AnalyticsGate();
```

**Forge invariants (CI-enforced):**
- (a) No file outside `app/lib/analytics-gate.ts` may import `posthog-js` or `gtag` directly. ESLint rule `no-restricted-imports` blocks both.
- (b) Every event name in `EventName` union must have a corresponding row in `EVENT_REGISTRY` (§2) and a generated zod schema in `runner/schemas/analytics-events.v1.ts`. CI test `tests/contract/analytics-event-registry.spec.ts` diffs the two.
- (c) The `consent_records` table write happens server-side via the cookie-banner submission handler, NOT client-side — client localStorage is a cache hint, server is source of truth (PRD §14.4 row: consent records retained term-of-relationship + 3 years, not customer-overridable).

### 1.4 Cookie banner integration with top-nav (`design/components/nav/nav.jsx`)

The nav exposes the brand mark + skip-to-content link before any focusable button. The cookie banner renders as a `role="dialog"` overlay at first visit; "Manage cookies" link in the footer + the user menu (`onOpenUserMenu`) re-opens the same dialog. The dialog is the only surface that can flip `AnalyticsGate.status`. CI a11y test asserts the dialog traps focus and the banner does not auto-dismiss on outside-click (consent must be affirmative — PECR + EDPB Guidelines 5/2020).

---

## 2. PostHog event taxonomy

Every event below is **typed at compile time** (`EventName` union + per-event `EventProps<E>` mapped type in `runner/schemas/analytics-events.v1.ts`). Adding an event = schema PR + registry row. No drift, no string-typing, no "we'll add it later."

Each row spells: name · fire-location · property keys (typed) · consent-gate (always = analytics bucket; one exception called out) · owner (which agent reads the resulting metric).

### 2.1 Acquisition

| Event | Fire-location | Properties | Owner |
|---|---|---|---|
| `landing_viewed` | Marketing pages (`/`, `/pricing`, `/audit`, `/build`, `/modes`, `/blog/*`) — first paint after consent | `utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?, referrer_host?, path` | Signal (channel ROI) |
| `pricing_page_viewed` | `/pricing` — fires on every visit, dedup per-session | `from_path?, plan_focused?` (if hash-anchor to a specific tier) | Penny + Hook |
| `signup_started` | `/signup` mount | `method: 'email'|'oauth_google'|'oauth_github', utm_attribution_session_id` | Hook |
| `signup_completed` | `auth.users` insert success + email verified | `method, user_id, attribution_first_touch, attribution_last_touch` *(server-side fire — see §3.3)* | Lens + Hook |
| `oauth_started` | OAuth redirect click | `provider: 'google'|'github'` | Lens |
| `email_verification_sent` | After signup, before verify | `email_id` *(no email address)* | Herald |
| `email_verification_completed` | Verify token consumed | `latency_ms_since_signup` | Hook |

### 2.2 Onboarding

| Event | Fire-location | Properties | Owner |
|---|---|---|---|
| `mode_picker_viewed` | `/onboarding/mode` mount | (none beyond defaults) | Optic + Hook |
| `mode_picked` | Customer confirms mode card | `mode: 'byok'|'cli'|'managed'` | Hook |
| `byok_key_validated` | `byok-validate` Edge Fn returns OK (server-side fire) | `latency_ms` | Lens |
| `byok_key_failed` | `byok-validate` returns error | `failure_reason: 'invalid_key'|'rate_limited'|'network'|'unknown', latency_ms` | Hook + Crash |
| `cli_pairing_started` | `/onboarding/cli` mount | (none) | Lens |
| `cli_pairing_completed` | First successful heartbeat from paired CLI (server-side fire) | `time_to_pair_ms` | Hook |
| `github_app_install_started` | Customer redirected to GitHub App install URL | `from_path` | Lens |
| `github_app_install_completed` | GitHub webhook `installation.created` arrives (server-side, TB-10) | `installation_id_hash` *(HMAC of installation_id with `tenant_id` as salt — Cipher Fix-3b pattern)* | Lens |
| `onboarding_completed` | Mode picked + workspace created + (BYOK validated OR CLI paired OR Managed checkout completed) | `mode, time_to_complete_ms` | Hook |

### 2.3 Audit (the funnel that pays the bills)

| Event | Fire-location | Properties | Owner |
|---|---|---|---|
| `intake_step1_completed` | Step 1 of 2-step Optic picker | `method: 'repo'|'folder'|'url', auto_selected_product: 'surface'|'code'|'full'` | Optic + Hook |
| `intake_step2_completed` | Step 2 — depth picker | `product, depth: 'quick'|'custom'|'comprehensive'` | Hook |
| `audit_started` | `POST /api/runs` returns 200 | `run_id, mode, product, depth` | Lens |
| `audit_progress` | Runner Realtime emit *(server-side; throttled 1 per 30s per run)* | `run_id, phase: 'optic'|'proof'|...|'jury_synth', pct: 0..100` | Crash (latency SLI) |
| `audit_completed` | Runner emits `kind='final_verdict'` | `run_id, verdict: 'PASS'|'PASS WITH FIXES'|'FAIL', score, runtime_ms, findings_count, severity_breakdown: {blocker, critical, major, minor, polish}, score_engine_version` | Lens + Verify |
| **`verdict_shown`** | Verdict card mounts in browser AND first paint completes (`requestAnimationFrame` after data-loaded) | `run_id, verdict, score, time_since_signup_ms, is_first_audit: boolean, ttfv_ms` | **Hook (Aha event — see §5)** |
| `finding_expanded` | Customer clicks any finding chevron | `run_id, finding_id, severity, reviewer` | Optic |
| `finding_copied` | Copy-fix-recommendation button click | `run_id, finding_id` | Hook |
| `finding_dismissed` | Customer marks "won't-fix" | `run_id, finding_id, with_undo_window: boolean` | Hook (UX friction signal) |
| `evidence_viewed` | Screenshot lightbox or transcript drawer opens | `run_id, finding_id, evidence_type: 'file'|'url'|'screenshot'|'transcript'` | Optic |
| `audit_share_clicked` | "Share this verdict" button click (V0 public verdict share) | `run_id, verdict` | Signal (organic distribution) |
| `audit_share_link_generated` | Server creates share token (server-side) | `run_id, share_token_hash` | Lens |
| `re_audit_started` | New run dispatched within same project | `project_id, days_since_first_audit, previous_verdict, previous_score` | Hook (D2 loop validator) |
| `re_audit_completed` | Re-audit verdict emitted | `project_id, run_id, improvement_delta_points: int, new_verdict, audits_in_project: int` | Lens + Hook |
| `audit_failed_terminal` | Run state transitions to `failed_terminal` | `run_id, failure_code, retry_count` | Crash |

### 2.4 Conversion (free → paid)

| Event | Fire-location | Properties | Owner |
|---|---|---|---|
| `upgrade_card_shown` | E2 upsell card renders on verdict screen | `run_id, from_tier: 'free'|'byok_starter'|'byok_pro'|'managed_starter', to_tier, surface: 'verdict'|'email_e2'|'pricing_page'|'nav_token_chip'` | Hook (A/B test target) |
| `upgrade_clicked` | Customer clicks upgrade CTA | `from_tier, to_tier, surface, run_id?` | Hook |
| `checkout_started` | `/api/billing/checkout-session` returns Stripe URL; browser redirects | `tier, billing_period: 'monthly'|'annual', user_id, run_id?` *(server-side fire)* | Penny |
| `checkout_completed` | Stripe webhook `checkout.session.completed` arrives at `/webhooks/stripe` *(server-side, TB-8)* | `tier, billing_period, currency, amount_cents, stripe_session_id_hash` | **Penny (primary success event)** |
| `paid_conversion` | Same trigger as `checkout_completed` but with attribution joined | `tier, mode, currency, amount_cents, plan_family: 'byok'|'managed'|'cli', utm_first_touch, utm_last_touch, days_since_signup, audits_before_conversion: int` | Penny + Signal |
| `subscription_updated` | Stripe webhook `customer.subscription.updated` | `from_tier, to_tier, change_type: 'upgrade'|'downgrade'|'renewal'|'reactivation', proration_cents` | Penny |
| `cooling_off_waived` | EU/UK checkbox ticked at checkout (Decision #20 / #22) | `region: 'EU'|'UK', upgrade_event: boolean` | Comply |

### 2.5 Retention + lifecycle

| Event | Fire-location | Properties | Owner |
|---|---|---|---|
| `e_email_sent` | Resend API success (server-side) | `email_id: 'e1'|'e2'|'e3'|'e4'|'e5', user_id` | Herald |
| `e_email_opened` | Resend webhook `email.opened` | `email_id, user_id` | Herald |
| `e_email_clicked` | Resend webhook `email.clicked` + UTM landing reconciliation | `email_id, user_id, target_path` | Herald + Hook |
| `e_email_unsubscribed` | Unsubscribe link consumed (CAN-SPAM 10-day clock starts) | `email_id, list: 'transactional'|'lifecycle'|'marketing'` | Herald + Comply |
| `weekly_active_session` | Authed session ≥ 60s with at least one in-app navigation | `user_id, week_iso` *(server-side rollup, fires once per user per ISO week)* | Lens |
| `nps_survey_shown` | Day-30 in-app survey (PRD §15 NPS target) | `cohort_id` | Hook |
| `nps_survey_submitted` | Customer submits 0–10 score | `score: 0..10, segment: 'detractor'|'passive'|'promoter'` | Lens (no free-text — PII risk) |

### 2.6 V1.5 Auto-PR

| Event | Fire-location | Properties | Owner |
|---|---|---|---|
| `auto_pr_upcharge_clicked` | "Ship the fixes — $49 →" CTA click | `run_id, findings_count_in_bundle` | Hook |
| `auto_pr_purchase_completed` | Stripe webhook for the $49 charge | `run_id, amount_cents, stripe_session_id_hash` | Penny |
| `auto_pr_reaudit_passed` | `jury-reaudit-gate` Edge Fn returns PASS (server-side) | `run_id, fix_pr_job_id` | Verify |
| `auto_pr_reaudit_failed` | Gate returns FAIL → PR NOT opened, refund triggered | `run_id, fix_pr_job_id, reason` | Verify |
| `auto_pr_opened` | GitHub App opens PR successfully | `run_id, pr_url_hash, branch: 'studio-zero/fix-<run-id>'` | Hook |
| `auto_pr_merged` | GitHub webhook `pull_request.merged` | `run_id, days_open` | Lens (attach-rate ROI) |
| `auto_pr_closed_unmerged` | GitHub webhook `pull_request.closed` with `merged=false` | `run_id, days_open, close_reason_inferred: 'stale'|'rejected'|'superseded'` | Hook |
| `auto_pr_tracking_stale` | D23 banner shown after `installation.deleted` while open PR exists | `run_id, pr_url_hash` | Lens |

### 2.7 Compliance + lifecycle (consent-gate exemptions noted)

| Event | Fire-location | Properties | Consent gate | Owner |
|---|---|---|---|---|
| `consent_set` | First consent decision via banner | `status: 'accepted'|'rejected'|'partial', buckets: {analytics, marketing, necessary}` | **EXEMPT** — this event is itself the legal basis for processing subsequent events (GDPR Art. 7(1) demonstrability) | Comply |
| `consent_changed` | Customer re-opens banner and changes decision | `changes: {from: status, to: status, buckets_changed: string[]}` | **EXEMPT** — same rationale | Comply |
| `do_not_sell_clicked` | CCPA "Do Not Sell or Share My Personal Information" link in footer (CA + 4 other states require this) | `region_inferred: string` | EXEMPT (CCPA opt-out is a legal right) | Comply |
| `do_not_sell_request_submitted` | Form submitted; server marks `users.do_not_sell=true` | `user_id` *(server-side)* | EXEMPT | Comply |
| `data_export_requested` | Settings → "Export my data" (GDPR Art. 20) | `user_id, format: 'json'` | analytics | Comply |
| `data_export_downloaded` | Customer downloads the produced zip | `user_id, bytes_int_log10: number` *(log-10 bucket to prevent fingerprinting by exact size)* | analytics | Comply |
| `account_deletion_scheduled` | Customer confirms deletion (30-day cancel-window per GDPR Art. 17) | `user_id, scheduled_purge_at_iso` | analytics | Comply |
| `account_deletion_executed` | Purge cron deletes (server-side) | `user_id_hash, days_after_request` | analytics | Atlas + Comply |
| `cancel_started` | `/app/settings/billing/cancel` mount (FTC Click-to-Cancel SC) | `tier, current_period_end_iso` | analytics | Penny |
| `cancel_completed` | Stripe subscription canceled | `tier, days_subscribed, refund_cents?` | analytics | Penny |
| `dispute_finding_started` | Customer clicks "Dispute this finding" CTA (PRD §11.2 path) | `run_id, finding_id` | analytics | Comply + Hook |
| `dispute_finding_resolved` | Studio Zero adjudicates dispute | `finding_id, outcome: 'upheld'|'reversed'|'modified'` | analytics | Comply |

### 2.8 Identify policy

**`posthog.identify(user_id)` fires exactly once** — on `signup_completed` (server-side, immediately after `auth.users` insert + email-verify confirmation). Traits passed at identify time:

```
{
  signup_ts: <iso>,
  signup_method: 'email'|'oauth_google'|'oauth_github',
  attribution_first_touch: {source, medium, campaign},   // from acquisition_attribution jsonb (§3.3)
  attribution_last_touch:  {source, medium, campaign},
  plan_family: null,           // set at paid_conversion
  region_inferred: 'US'|'EU'|'UK'|'CA'|...,
  do_not_sell: false           // CCPA flag mirror
}
```

**`posthog.reset()` fires on:**
1. Signout (`POST /auth/signout` returns 200).
2. Account deletion executed.
3. Consent withdrawn (`consent_changed` to `withdrawn`).

**Never identify with email, name, IP, or any raw user content.** The `user_id` is the Supabase Auth UUID — Cipher-cleared as a server-issued opaque identifier with no PII payload.

---

## 3. UTM passthrough + attribution

### 3.1 Capture on first landing

```
On every page-load before consent gate:
  if document.referrer.hostname !== window.location.hostname:
    capture all query params matching ^utm_(source|medium|campaign|term|content)$
    capture referrer.hostname
    sessionStorage.setItem('sz_attribution_session_id', uuid())
    sessionStorage.setItem('sz_attribution_first_touch', JSON.stringify({...captured, ts}))
  if no sz_attribution_persistent in localStorage:
    localStorage.setItem('sz_attribution_persistent', JSON.stringify({first_touch, all_touches: [first_touch]}))
  else:
    append current touch to all_touches (capped at 20; FIFO eviction)
```

Notes:
- This capture runs **before consent**, but writes to local storage only. Nothing leaves the browser. The capture is the "necessary" bucket — UTM in URL is data the user already gave us by clicking the link.
- `referrer.hostname` only, never full referrer URL (full URL can leak Google query terms = PII).

### 3.2 Pass through signup

The signup form submission includes a hidden field `sz_attribution_payload` = `JSON.stringify({first_touch, last_touch, all_touches})`. Server receives this in the same POST that creates the user.

### 3.3 Persist server-side

`users.acquisition_attribution jsonb` column (Atlas to add at M1 migration if not already present):

```json
{
  "first_touch":  {"source":"hn","medium":"organic","campaign":null,"term":null,"content":null,"ts":"2026-05-10T14:22:11Z","referrer_host":"news.ycombinator.com"},
  "last_touch":   {"source":"google","medium":"cpc","campaign":"audit-launch","term":"ai code audit","content":"ad1","ts":"2026-05-12T09:15:03Z","referrer_host":"google.com"},
  "all_touches":  [/* up to 20, FIFO */],
  "captured_via": "client_session_storage"
}
```

`signup_completed` and `paid_conversion` events both pull from this column server-side and stamp `attribution_first_touch` + `attribution_last_touch` onto the PostHog event. **Attribution is computed server-side, not client-side** — cookie clearing, ad-blockers, and incognito sessions all break client-side attribution. Lens's `app/lib/server/attribution.ts` module is the single source of truth.

### 3.4 Models supported

| Model | When used | Computation |
|---|---|---|
| **First-touch** | Top-of-funnel channel dashboards (Signal's "which channel brings them in?") | `users.acquisition_attribution.first_touch` |
| **Last-touch** | Conversion attribution (Penny's "which channel closed the sale?") — default in PostHog Insights | `users.acquisition_attribution.last_touch` resolved as the touch most-recent-prior-to `paid_conversion` |
| **Multi-touch linear** | Hook's NPS work + channel-mix optimization | Split credit `1/n` across every touch in `all_touches[]`; surfaced as an Insight query, not stored per-event |

### 3.5 Direct vs unknown

- Touch with no `utm_*` params + no referrer → `source='direct', medium='(none)'`.
- Touch with a referrer but no UTMs → `source=referrer.hostname, medium='referral'`.
- Touch from a self-referrer (e.g., `studiozero.com → studiozero.com`) is **not** counted as a touch (session continuation, not new acquisition).

---

## 4. GA4 ↔ PostHog bridging

| Role | Tool |
|---|---|
| Primary funnel events (taxonomy in §2) | **PostHog** — single source of truth |
| Site traffic + paid-channel reporting (when paid ads kick in V2) | **GA4** |
| Identity bridge | `user_id` written to both at identify time |

**No duplicate event firing.** PostHog captures every funnel event in §2; GA4 captures only `gtag('event', 'page_view')` and Google Ads conversion pings (V2). When the customer fires `verdict_shown`, PostHog gets one event, GA4 gets nothing extra. When the customer navigates to `/pricing`, PostHog gets `pricing_page_viewed`, GA4 gets `page_view` — different events, different tools, no overlap.

The `user_id` bridge: when `signup_completed` fires, both `posthog.identify(user_id, traits)` and `gtag('set', {user_id})` fire. Cross-tool joins (e.g., "of the GA4 google-cpc traffic that converted, what was the median TTFV in PostHog?") happen in BigQuery via the user_id key. GA4's BQ export + PostHog's S3 export both land in the analytics warehouse; Lens's SQL queries join on `user_id`.

GA4 Consent Mode v2 is honored — `gtag('consent', 'default', {ad_storage:'denied', analytics_storage:'denied'})` runs in the GA4 snippet before any event; `gtag('consent', 'update', ...)` runs after consent.

---

## 5. KPI dashboard spec

For PRD §15 metrics. Each row: metric · PostHog query (PostHog SQL or Insights DSL) · dashboard surface · cadence · alert threshold for Watch.

### 5.1 Acquisition + activation

| Metric | Query (PostHog SQL) | Surface | Cadence | Alert |
|---|---|---|---|---|
| Landing → signup conversion rate | `SELECT count(if(event='signup_completed',1,NULL)) / count(if(event='landing_viewed',1,NULL)) FROM events WHERE timestamp >= now() - INTERVAL 7 DAY` | PostHog Insight `acq-funnel-7d` | daily | < 2% → Watch beeper (channel mix degraded) |
| Signup → first-`verdict_shown` (the Aha funnel) | Funnel insight: `signup_completed → onboarding_completed → audit_started → verdict_shown`; conversion window 24h | Insight `aha-funnel-24h` | daily | drop > 10pp wk-over-wk → Watch beeper |
| **TTFV p50** — median ms from `signup_completed` to first `verdict_shown` | `SELECT quantile(0.5)(ttfv_ms) FROM events WHERE event='verdict_shown' AND is_first_audit=true AND timestamp >= now() - INTERVAL 7 DAY` | Insight `ttfv-p50-7d` | real-time tile | > 8 min target breached → Watch beeper (Hook's BL3 hypothesis: every minute past 5 costs ~7% conversion) |

### 5.2 Audit funnel + quality

| Metric (PRD §15) | Query | Surface | Cadence | Alert |
|---|---|---|---|---|
| **Audit completion rate** — target > 80% of full audits run | `count(audit_completed) / count(audit_started) WHERE depth='comprehensive' AND timestamp >= now() - INTERVAL 7 DAY` | Insight `audit-completion-rate` | daily | < 80% → Watch beeper |
| **First-audit FAIL rate** — target ≥ 70% (PRD §15 design lock) | `count(if(event='audit_completed' AND verdict='FAIL' AND is_first_audit_for_user(user_id), 1, NULL)) / count(if(event='audit_completed' AND is_first_audit_for_user(user_id), 1, NULL))` rolling 30d | Insight `first-audit-fail-rate-30d` | weekly | < 60% → escalate to Jury (rubric drift); > 85% → escalate to Hook (too punishing) |
| **Median 2nd-audit score** — target ≥ 70 (proves loop produces improvement) | `quantile(0.5)(score) WHERE audits_in_project >= 2` per PRD §15 SLI | Insight `median-second-audit-score` | weekly | < 70 → Verify (rubric/scoring drift) |
| **Re-audit improvement** — target avg +20 score points | `avg(improvement_delta_points) FROM re_audit_completed WHERE timestamp >= now() - INTERVAL 30 DAY` | Insight `re-audit-improvement-30d` | weekly | < +15 → Hook |

### 5.3 Conversion + revenue

| Metric (PRD §15) | Query | Surface | Cadence | Alert |
|---|---|---|---|---|
| **25 paying customers in first 60 days** | `count(distinct user_id) FROM paid_conversion WHERE timestamp BETWEEN <M5_launch> AND <M5_launch + 60d>` | Insight `mvp-launch-paying-60d` | daily during M5+60d window | < 12 at day 30 → Penny + Signal war-room |
| **Code-audit upgrade attach rate** — target > 20% of free signups within 30 days | `count(distinct user_id FILTER (paid_conversion.plan_family='byok' OR plan_family='managed')) / count(distinct user_id FROM signup_completed) WHERE timestamp_signup >= now() - INTERVAL 30 DAY` | Insight `free-to-paid-30d` | weekly | < 12% → Hook (E2 email failing) |
| **NPS > 30** | `(count(promoter) - count(detractor)) / count(*) * 100 FROM nps_survey_submitted` | Insight `nps-30d` | monthly | < 20 → Compass + Hook |
| **Auto-PR attach > 15% (V1.5)** | `count(auto_pr_purchase_completed) / count(distinct user_id WHERE tier='managed_pro' OR tier='byok_pro' AND timestamp >= now() - INTERVAL 30 DAY)` | Insight `auto-pr-attach-30d` | weekly post-V1.5 | < 10% → R18 mitigation triggered |

### 5.4 R21(c) alpha-pipeline tracker (PRD §19)

**Hard lock per Owner Matrix R21(c):** Managed-tier alpha ≥ 5 paying at M2 close (week 9). This is the only metric whose miss puts cash runway in critical.

| Metric | Query | Surface | Cadence | Alert |
|---|---|---|---|---|
| Alpha-list signups (pre-launch lead capture on `/managed-alpha`) | `count(distinct user_id) FROM events WHERE event='alpha_list_signup' AND timestamp >= <campaign_start>` *(alpha_list_signup is a registry-extension event; Lens adds at M0)* | Insight `alpha-list-signups` | real-time | < 20 by week 6 → Signal + Penny + Atlas |
| Alpha → paying conversion rate | `count(distinct user_id FILTER (paid_conversion.plan_family='managed')) / count(distinct user_id FROM alpha_list_signup)` rolling | Insight `alpha-to-managed-paying` | weekly | < 25% by week 8 → R21(c) trip-wire |
| **Managed paying count** | `count(distinct user_id) FROM paid_conversion WHERE plan_family='managed' AND timestamp <= <week_9_close>` | Insight `managed-paying-count` (THE R21(c) gauge) | **daily through week 9** | < 5 at week 9 → **HARD GATE FAIL** → Penny + Signal escalate to Jo for R21 mitigation-(c) bridge |

**Math summary (R21(c)):** Day-0 cash $6.9k + reserve $3k = $9.9k working capital. Pentest installment terms (R21(a)) defer ~$22.5k from week 11 lump to ~$7.5k×3 over weeks 11/15/19. WCAG net-30 (R21(b)) shifts ~$10k to week 14. Alpha-5 paying at $99/mo Managed Starter = **$495 MRR by week 9** → $495 × ~7 weeks pulled forward vs week-16 launch = **~$3.5k incremental cash by week 19**, plus signals validated demand for Penny's M5 ramp scenarios. Five Managed Starters at $99 is the *minimum gating commitment*; alpha-pipeline tracker is the canary that says we will land it.

---

## 6. Per-channel ROI dashboard

For Signal's PRD §15.5 channel plan. UTM convention enforced so each channel is queryable.

### 6.1 UTM convention (Signal + Lens, locked)

| Channel | `utm_source` | `utm_medium` | `utm_campaign` example |
|---|---|---|---|
| X / Twitter | `x` | `social` | `build-in-public-w7` |
| Hacker News | `hn` | `social` | `show-hn-launch` |
| IndieHackers | `indiehackers` | `social` | `milestone-m3` |
| Product Hunt | `producthunt` | `social` | `launch-day` |
| Reddit | `reddit` | `social` | `r-saas-launch` |
| Discord (founder communities) | `discord` | `community` | `<community-handle>` |
| SEO content (Lens-owned blog) | `blog` | `organic` | `<post-slug>` |
| Partner integrations | `<partner-slug>` | `partnership` | `<co-marketing-asset>` |
| Lifecycle email | `lifecycle` | `email` | `e2-fail-upsell` |
| Paid ads (V2) | `google`/`bing`/`meta` | `cpc` | `<campaign-name>` |

Any link Studio Zero publishes that lacks a UTM tag is a bug. CI lint rule on marketing-site content (`marketing/copy/`) asserts every external `<a href>` to studiozero.com carries `utm_source` + `utm_medium`. Watch's beeper fires on unattributed acquisition spikes.

### 6.2 Per-channel metrics (Signal dashboard)

For each channel × week cohort:

| Metric | Formula |
|---|---|
| Signups | `count(distinct user_id) FROM signup_completed WHERE utm_source = <ch> GROUP BY week` |
| Signup-rate (per landing) | `signups / landing_viewed` filtered to same `utm_source` |
| Free-to-paid conversion | `count(paid_conversion ∩ first_touch.source=<ch>) / signups(<ch>)` *(first-touch attribution)* |
| CAC | `(channel_spend_usd / paid_conversions(<ch>))` — channel_spend pulled from a Lens-maintained `channel_costs.csv` (manual for organic; Stripe-ad-billing import for paid) |
| 4-week retention | `count(user_id WHERE weekly_active_session in week+4) / signups(<ch>)` |

Surfaced in PostHog Insight cluster `signal-channels-dash`. Cadence: weekly Monday rollup; per-channel breakdown delivered to Signal Slack thread.

---

## 7. Privacy + compliance gates

### 7.1 PII strip rules (`stripPII()` in `analytics-gate.ts`)

**Strip from every event payload before fire:**
- Any property whose key matches `/email|name|phone|address|ssn|password|api_?key|token|secret/i`.
- Any value > 200 chars (block raw user content; recommendations on file paths/line ranges stay short).
- Any value matching email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- Any value with Shannon entropy > 4.5 bits/char AND length > 20 (matches the Sentry `beforeSend` PRD §13.6 corpus; Cipher's threshold) — catches API keys, JWTs, source-code fragments.
- Stripe customer + session IDs are HMAC-hashed (key = `tenant_id`) before fire (`stripe_session_id_hash` pattern in §2.4).
- `installation_id` from GitHub App → HMAC-hashed (Cipher Fix-3b pattern).
- IP addresses: PostHog's "Disable IP collection" toggle ON at project config; verified in CI by hitting the PostHog API and asserting `event.properties.$ip === undefined` on the last 10 events.

CI test `tests/contract/analytics-pii-strip.spec.ts` runs `stripPII()` against a corpus of 50 payloads with planted PII and asserts none survive.

### 7.2 CCPA — Do Not Sell

`do_not_sell_request_submitted` → server flips `users.do_not_sell=true`. Side effects:
- GA4 entirely suppressed for this user — `gtag('consent','update',{ad_storage:'denied', analytics_storage:'denied'})` re-fired with `user_id` scope.
- PostHog: cannot fully opt out of own-product analytics (legitimate-interest basis for service operation under CCPA), but the user's events are tagged `do_not_sell=true` and excluded from any data-sharing export (BigQuery → ad-platform audiences in V2).
- Footer "Do Not Sell or Share My Personal Information" link present on every page (CA + CO + CT + UT + VA require this; rendered conditionally based on `region_inferred` only as a courtesy — the link is **present for all users** because we cannot reliably infer state-of-residence).

### 7.3 Retention

| Event class | Retention | Source |
|---|---|---|
| `checkout_completed`, `paid_conversion`, `subscription_updated`, `cancel_completed`, `auto_pr_purchase_completed` | **7 years** | PRD §14.4 billing events (tax + accounting) |
| `consent_set`, `consent_changed` | **Term of relationship + 3 years** | PRD §14.4 consent records |
| All other PostHog events | **24 months** | PRD §14.4 default; PostHog project-level retention policy set to 730 days |

PostHog's retention is enforced at the project level (settings → Data management → Event retention = 730 days). The 7-year billing-event retention lives in the `billing_events` Postgres table, NOT in PostHog — PostHog is the activity stream, not the financial system of record. Penny owns the billing-event reconciliation; Lens owns the PostHog window.

### 7.4 Cookie banner state — source of truth

Server-side `consent_records` table (Atlas, exists per PRD §13.2) is the source of truth. localStorage `sz_consent` cookie is a cache hint only — when it's out of sync with the server, the server wins and the banner re-prompts. Schema:

```sql
consent_records (
  user_id uuid references auth.users,        -- nullable for pre-signup consent
  anon_id text,                               -- cookie-set UUID for pre-signup
  status text check (status in ('accepted','rejected','partial','withdrawn')),
  buckets jsonb,                              -- {analytics:bool, marketing:bool, necessary:true}
  user_agent text,
  ip_country text,                            -- country only, never full IP (Comply)
  timestamp timestamptz default now()
)
```

Every consent change appends a new row; never UPDATE. PRD §14.4 demonstrates Art. 7(1) "the controller shall be able to demonstrate that the data subject has consented" via this append-only log.

---

## 8. Lens self-verdict (Phase 8 exit gate)

| Gate | Status |
|---|---|
| Event taxonomy enumerated — every Hook test surface instrumented (verdict CTA A/B, pricing tier order A/B, FAIL screen copy A/B, free-tier CTA A/B, signup field count A/B) | ✓ PASS — §2.4 `upgrade_card_shown.surface` + `signup_started.method` + `upgrade_clicked.surface` carry the A/B group dim PostHog Experiments injects via feature-flag context. |
| Consent-gated initialization | ✓ PASS — §1, with sessionStorage buffer (50, FIFO), discard-on-reject, and append-only `consent_records` server-side. |
| UTM passthrough end-to-end (browser → signup form → server → `users.acquisition_attribution` → PostHog identify traits) | ✓ PASS — §3.1–3.3. Server-side `attribution.ts` is the single source. |
| PRD §15 metrics queryable (all 9 success metrics from §15 + R21(c) alpha tracker) | ✓ PASS — §5.1–5.4. |
| R21(c) alpha-pipeline tracker | ✓ PASS — §5.4, daily cadence through week 9, hard-gate alert. |
| GA4 ↔ PostHog bridge specced (no duplicate events, `user_id` is the join key) | ✓ PASS — §4. |
| Every event consent-gated, PII-stripped, identify-only-after-signup, typed-dispatcher | ✓ PASS — §1.3 invariants (a)(b)(c), §2.8, §7.1. |

**Open follow-ups (handed to peer agents):**
1. **Atlas (M0):** add `users.acquisition_attribution jsonb` if not already in `0001_initial.sql`; confirm `consent_records.buckets jsonb` column exists.
2. **Forge (M1):** implement `app/lib/analytics-gate.ts` + `app/lib/server/attribution.ts` + typed `track<EventName>()` dispatcher from `runner/schemas/analytics-events.v1.ts`. CI lint rule `no-restricted-imports` on direct `posthog-js`/`gtag` access.
3. **Verify (M1):** add `tests/contract/analytics-event-registry.spec.ts` (registry-vs-schema drift) and `tests/contract/analytics-pii-strip.spec.ts` (PII corpus).
4. **Comply (M0):** sign off on `consent_set`/`consent_changed`/`do_not_sell_*` consent-gate exemption rationale (GDPR Art. 7(1) demonstrability + CCPA opt-out as legal right). Without sign-off, those four events buffer like everything else and the Art. 7(1) audit trail breaks.
5. **Signal (M0):** publish channel-cost source-of-truth (`channel_costs.csv` schema) so §6.2 CAC is computable from launch day, not retro-fitted.
6. **Hook (M1):** confirm `verdict_shown.ttfv_ms` is the canonical Aha timer (vs. `audit_completed` server-emit) — see §9 below.

---

## 9. Aha event definition (cross-ref to Hook's TTFV — PRD §15 / Hook BL3)

**Aha = `verdict_shown`.** Fires when the verdict card has mounted AND first paint completes (post-`requestAnimationFrame` after the data-loaded transition). NOT `audit_completed` (server-side; runner emits before browser repaints) and NOT `intake_step1_completed` (user has not yet seen value).

**Why this and not `audit_completed`:**
- `audit_completed` measures *audit runtime*, the system's job. Hook BL3 measures *customer experience* of receiving the verdict, including the dashboard's render path.
- A run that completes server-side at T=8min but doesn't paint until T=8:45 (cold load, network hiccup, hydration delay) is a 45s lie if we use `audit_completed` as the Aha timer.

**TTFV calculation:**
```
ttfv_ms = verdict_shown.timestamp − signup_completed.timestamp
```
Filtered to `is_first_audit=true` (the customer's first verdict; subsequent re-audits are not TTFV events).

**Target (PRD §15 implicit, Hook BL3 explicit):** TTFV p50 < 8 min. This is the median; tail latency tracked separately (p95 < 25 min — captures the cold-start path with CLI pairing).

`is_first_audit` is computed server-side via `SELECT count(*)=0 FROM runs WHERE tenant_id=$1 AND state='completed' AND id != $current_run_id` at the moment the runner emits `final_verdict`, then passed through to the browser in the verdict-render payload so the browser-side `verdict_shown` fire carries the correct bit.

**Aha event is load-bearing for:** §15 free-to-paid conversion ratio (verdict_shown → upgrade_clicked → checkout_completed funnel), Hook's TTFV experiment matrix, Signal's per-channel quality (a channel whose signups never reach `verdict_shown` is dead traffic regardless of signup count).

---

## 10. Event registry — single source of truth

`runner/schemas/analytics-events.v1.ts` (Forge to create at M1):

```ts
export const EVENT_REGISTRY = {
  // Acquisition (§2.1)
  landing_viewed: { props: z.object({...}), owner: 'signal', consent: 'analytics' },
  pricing_page_viewed: { ... },
  signup_started: { ... },
  // ... every event from §2.1 through §2.7
} as const;

export type EventName = keyof typeof EVENT_REGISTRY;
export type EventProps<E extends EventName> = z.infer<typeof EVENT_REGISTRY[E]['props']>;
```

CI test (`tests/contract/analytics-event-registry.spec.ts`):
- Asserts every event in this markdown spec has a registry row.
- Asserts every registry row has a markdown spec row.
- Asserts every `consent` value is one of `'analytics'|'exempt'`.

Adding an event requires: (1) markdown row in §2; (2) registry entry; (3) zod schema; (4) call site behind `analytics.capture()`. A PR that touches one without the others fails CI.

---

*End of analytics-spec.md v0.1 — Lens, Growth Layer.*
*Taxonomy-rigorous. Consent-respectful. The funnel is data or it is fiction.*
