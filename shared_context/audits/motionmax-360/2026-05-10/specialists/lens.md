# Lens — §11 Analytics: Funnel + Events

**Project:** motionmax-360
**Audit date:** 2026-05-10
**Specialist:** Lens (Product Analytics)
**Audience:** tool-savvy creative adults (NOT developers / NOT seniors), mobile-heavy, US-first launch
**Scope:** event instrumentation consistency, funnel definition end-to-end, conversion firing, UTM/referral, identify on signin, reset on signout, drop-off measurement.

Severity rubric: Blocker / Critical / Major / Minor / Polish. Every finding cites file:line.

---

## Executive read

MotionMax has a thin, single-vendor analytics layer (GA4 only, no PostHog/Mixpanel) with two unreconciled sources of truth: GA4 events fired client-side, and a Postgres-derived "funnel" (`admin_analytics_funnel` RPC). They do not share definitions, identifiers, or coverage. Top-of-funnel (the marketing Astro site) has zero tracking. Identity is never bound across anonymous → authenticated sessions. The admin dashboard renders three identical funnel rows from the same `signups` count, so the rendered "drop-off" between landing → signup-start → signup-complete is theatrical, not measured. For a US-first paid-marketing launch, this is not adequate — UTM money will spend without reportable attribution, and product activation events (generation, voice lab, autopost lab) are entirely untracked.

---

## Findings

### Blocker

#### B1. Marketing site has zero analytics; funnel cannot start there
**Category:** §11
**Severity:** Blocker
**Issue:** `marketing/src/pages/index.astro` (and the rest of `marketing/src/pages/*.astro`) ship no GA4 / gtag / dataLayer / PostHog / Mixpanel script. Privacy policy at `marketing/src/pages/privacy.astro:60,72` explicitly promises Google Analytics 4. The funnel literally cannot begin at the marketing surface that the brand will run paid ads against.
**Evidence:** `Grep gtag|trackEvent|analytics|posthog|mixpanel marketing/` returns only the two privacy-policy mentions; no `<script>` injection or partial includes anything analytics-related. `marketing/src/pages/privacy.astro:60,72,73`.
**Fix:** Add a consent-gated GA4 snippet to the marketing layout (e.g. `marketing/src/layouts/Layout.astro` or `BaseHead.astro`) that mirrors the in-app consent contract (read same `motionmax_cookie_consent` localStorage key, share the same `VITE_GA_MEASUREMENT_ID` so cross-domain stitching is possible). Add a server-side cookie banner in the Astro layout, not just the in-app one in `src/components/CookieConsent.tsx`.
**Effort:** M

#### B2. UTMs lost across marketing → app handoff
**Category:** §11
**Severity:** Blocker
**Issue:** `captureUtmParams()` in `src/main.tsx:12` reads from `window.location.search` only on the in-app entry. Marketing CTAs link to `/app` without query-string forwarding. A Google-Ads → marketing.motionmax.com → "Get started" → app.motionmax.com flow loses every UTM parameter at the marketing→app hop.
**Evidence:** `src/hooks/useAnalytics.ts:11-21` (UTM capture is window.location-bound to the React app domain). `marketing/src/pages/index.astro` contains no link rewriter or UTM-forward script. No middleware/redirect logic forwards the query string.
**Fix:** In the marketing Astro layout, add a small inline script that reads `window.location.search` for the UTM keys and rewrites every outbound link to `app.motionmax.com/*` to carry them as query params. Mirror the same `UTM_KEYS` list (`utm_source, utm_medium, utm_campaign, utm_term, utm_content`) at `src/hooks/useAnalytics.ts:8`. Alternative: redirect through an attribution endpoint that sets a first-party cross-subdomain cookie before redirecting.
**Effort:** S

#### B3. No `identify` call on signin — anonymous→authenticated identity broken
**Category:** §11
**Severity:** Blocker
**Issue:** After `signUp` and `signIn` in `src/hooks/useAuth.ts:147,158`, the code fires GA4 events `signup` / `login` but never calls `gtag('config', GA_ID, { user_id: ... })` or `gtag('set', { user_id })`. GA4 sees the same browser as one anonymous user pre-signin and a different "no user_id" identity post-signin. Identity resolution required by the brief ("identify on signin") is not implemented anywhere.
**Evidence:** `Grep -n 'user_id|gtag.*config|identify' src/hooks/` finds no `gtag('config', ..., {user_id})` or equivalent identify call. `src/hooks/useAuth.ts:131-161`.
**Fix:** In `src/hooks/useAnalytics.ts`, add `export function identifyUser(userId: string)` that runs `window.gtag?.('config', VITE_GA_MEASUREMENT_ID, { user_id: hash(userId) })` and persists the hashed id. Call it from `useAuth.ts` after both `signUp` (line 147) and `signIn` (line 158), and inside the auth-state listener so existing sessions are also identified on app boot. Hash the Supabase UUID with SHA-256 before sending to keep the value pseudonymous (per the privacy.astro promise of "anonymized usage data").
**Effort:** S

### Critical

#### C1. Dashboard funnel renders fake drop-off — first three rows all use `signups`
**Category:** §11
**Severity:** Critical
**Issue:** In `src/components/admin/tabs/TabAnalytics.tsx:172-183` the funnelRows array sets rows "Visited landing", "Started sign-up", and "Completed sign-up" all to `n: funnel.signups` with `pctOfTop: 100`. The RPC at `supabase/migrations/20260505210000_admin_phase3_5_rpcs.sql:286,288-291` actually computes both `signups` and `first_project`, but the front-end discards `first_project` and shows three identical bars. The admin dashboard funnel will always show 100/100/100 for the first three steps regardless of actual drop-off.
**Evidence:** TabAnalytics.tsx:177-178 — `n: funnel.signups, pctOfTop: 100` for "Started sign-up"; same line for "Completed sign-up". RPC returns `first_project` (line 320) which is unread by the FE.
**Fix:** In TabAnalytics.tsx:172-183, redesign as a 4-stage funnel using the data we actually have: `signups` (top), `first_project`, `first_gen`, `returned`, `paid`. Drop the redundant "Visited landing / Started sign-up / Completed sign-up" rows until visit-tracking exists (RPC comment at migration line 263-265 acknowledges this gap: *"Visited landing page is not tracked DB-side"*). Add a top-row "Visited landing (last 30d)" sourced from a new `landing_views` table populated by a `track_visit` Edge Function called from `Landing.tsx` mount.
**Effort:** S to fix the FE, M to add real visit tracking.

#### C2. No tracking on first-generation / activation events
**Category:** §11
**Severity:** Critical
**Issue:** "First generation" is the activation moment per the funnel definition (`admin_analytics_funnel` line 293-296 reads `public.generations`). But there is no `trackEvent("generation_started")` / `trackEvent("generation_completed")` anywhere in the editor, generate-video flow, or worker. GA4 has zero visibility into the most important product event in the funnel.
**Evidence:** `Grep trackEvent src/components/editor/` → no matches. `Grep trackEvent worker/` → no matches. The only product-side trackEvent in the entire codebase is `share_created` (`src/pages/Projects.tsx:650`).
**Fix:** Add `trackEvent("generation_started", { project_type, style })` at the moment the user clicks "Generate" in `src/components/editor/EditorTopBar.tsx` (or the relevant generate button), and `trackEvent("generation_completed", { project_type, duration_ms, success: true|false })` when the worker reports back via the Supabase realtime channel. Mirror these on the worker side via the GA4 Measurement Protocol in `worker/src/handlers/handleFinalize.ts` so they survive ad-blockers and tab close.
**Effort:** M

#### C3. No Voice Lab / Autopost Lab event tracking — entire feature surfaces invisible
**Category:** §11
**Severity:** Critical
**Issue:** The Voice Lab and Autopost Lab are listed in the brief as core surfaces, but `src/pages/lab/**` contains zero `trackEvent` calls. Lens cannot answer "what % of paying users use Voice Lab in week 1" because the data does not exist.
**Evidence:** `Grep trackEvent|track_event|analytics src/pages/lab` → "No files found".
**Fix:** Add `trackEvent("voice_lab_opened")`, `trackEvent("voice_lab_voice_generated", { provider, characters })`, `trackEvent("autopost_lab_opened")`, `trackEvent("autopost_run_created", { platform })`, `trackEvent("autopost_run_completed", { platform, status })` at the relevant entry points in `src/pages/lab/voice/*` and `src/pages/lab/autopost/*`. Document the schema in a new `docs/tracking-plan.md` (see M2 below).
**Effort:** M

#### C4. Server-side conversion uses `userId` as GA4 `client_id` — attribution broken
**Category:** §11
**Severity:** Critical
**Issue:** `supabase/functions/stripe-webhook/index.ts:67-69` sets `client_id: params.userId, user_id: params.userId`. GA4's `client_id` field is meant to match the `_ga` first-party cookie value from the user's browser session — using a different value (the Supabase user UUID) creates a brand-new anonymous-looking "user" in GA4 server-side, so the purchase event is not stitched onto the user's actual acquisition session. Acquisition channel attribution and ROAS calculations will be wrong: every purchase will look like "(direct) / (none)" with no UTMs.
**Evidence:** stripe-webhook/index.ts:67-69; `trackConversion` is called from line 259 (credit pack) and line 315 (subscription) without any browser-session client_id input.
**Fix:** At checkout creation in `src/hooks/useSubscription.ts:215`, read the `_ga` cookie value (parse out the `GA1.1.<client_id>` segment), forward it to `create-checkout` Edge Function as metadata, persist it on the Stripe Checkout Session via `metadata.ga_client_id`, then in `stripe-webhook/index.ts:67` use `client_id: session.metadata?.ga_client_id ?? params.userId` (fallback). Continue passing `user_id: params.userId` separately. This is the standard GA4 server-side stitching pattern.
**Effort:** S

#### C5. Pre-consent events vanish silently — no client-side queue/replay
**Category:** §11
**Severity:** Critical
**Issue:** `trackEvent` (`src/hooks/useAnalytics.ts:46-65`) calls `gtag` if defined, else `dataLayer` if defined, else a dev console fallback. Before consent, neither `gtag` nor `dataLayer` exists (CookieConsent.tsx:107-119 only loads them post-accept). So a user who clicks "Get started" on the landing page **before** the cookie banner finishes its 1500ms delay (CookieConsent.tsx:49) loses the `cta_click` event entirely — it is silently dropped, not queued.
**Evidence:** useAnalytics.ts:46-65; CookieConsent.tsx:48-49 (1500ms timer before banner shows). User can absolutely click a CTA in the first 1.5s.
**Fix:** Buffer pre-consent events into a small in-memory queue (`pendingEvents: EventTuple[]`), flushed by `loadGoogleAnalytics()` in CookieConsent.tsx after consent is granted. Drop the queue if the user rejects consent. Limit the queue to ~50 events to avoid memory issues. Alternative: wait for an explicit consent decision before firing the consent banner timer rather than gating GA load.
**Effort:** S

#### C6. Two unreconciled funnel sources of truth
**Category:** §11
**Severity:** Critical
**Issue:** GA4 records `signup`, `login`, `begin_checkout`, `purchase`, `cta_click`, `share_created`, `scroll_depth`, `feature_view`, etc. The admin dashboard funnel is computed from Postgres tables (`auth.users`, `public.projects`, `public.generations`, `public.system_logs`, `public.subscriptions`) by `admin_analytics_funnel`. They use different definitions, different timestamps, and capture different events. The "Returned next day" step is defined as a `system_logs` row with `category='user_activity'` between 24h-48h after signup (RPC line 298-307) — but Lens has no way to confirm what writes those rows or whether they correlate to actual app usage.
**Evidence:** TabAnalytics.tsx:107-114 (RPC-driven funnel) vs useAnalytics.ts:67-69 (GA4-driven events). No warehousing of GA4 → Postgres or vice-versa anywhere in the repo.
**Fix:** Pick one truth and document it. Recommended: Postgres for funnel (durable, server-side, ad-blocker-immune), GA4 only for acquisition channels and engagement microevents. Document this split in `docs/tracking-plan.md`. Audit `system_logs` writes to confirm the "Returned next day" definition is accurate (otherwise retention is mismeasured). Fix in `supabase/functions/_shared/log.ts` or wherever `writeSystemLog` is invoked.
**Effort:** M

### Major

#### M1. No reset on signout — identity bleeds across users on shared device
**Category:** §11
**Severity:** Major
**Issue:** `signOut` in `src/hooks/useAuth.ts:163-169` clears two sessionStorage keys (`upgradeModalDismissed`, `subscriptionSuspendedDismissed`) and calls `supabase.auth.signOut()`. It does NOT call `gtag('config', GA_ID, { user_id: null })`, does NOT clear the `mm_utm` sessionStorage entry, does NOT clear the `mm_referral_code` (Auth.tsx:53), and does NOT call `Sentry.setUser(null)`. If user A signs out and user B signs in on the same browser, user B's events will carry user A's identity bindings until next page reload, and user B's first sign-up will (incorrectly) inherit user A's UTM attribution.
**Evidence:** useAuth.ts:163-169.
**Fix:** In `signOut`, add `sessionStorage.removeItem("mm_utm")`, `sessionStorage.removeItem("mm_referral_code")`, `window.gtag?.('set', { user_id: undefined })`, and `Sentry.setUser(null)` (require `@sentry/react`). Reset the GA4 client_id is not strictly required — GA4 `_ga` cookie can persist — but user_id binding must be cleared.
**Effort:** XS

#### M2. No tracking plan / event nomenclature documentation
**Category:** §11
**Severity:** Major
**Issue:** Event names mix GA4-recommended verbs (`signup`, `login`, `begin_checkout`, `purchase`) with custom snake_case (`cta_click`, `watch_demo_click`, `share_created`, `scroll_depth`) and noun-action variants (`feature_view`, `trust_section_view`, `before_after_section_view`, `faq_section_view`). No `docs/tracking-plan.md` or equivalent exists (Glob `**/{tracking,analytics,events}*.md` → no files). New developers will invent new event names.
**Evidence:** Glob returns 0 docs. Names listed across Landing.tsx:85,272, Projects.tsx:650, useAnalytics.ts:124, plus the impression hooks in TrustIndicators.tsx, FeatureCard.tsx, FaqSection.tsx, BeforeAfterComparison.tsx.
**Fix:** Create `docs/tracking-plan.md` with: (a) naming convention — pick one, e.g. object_action snake_case (`cta_clicked`, `signup_completed`, `generation_started`); (b) event catalog — name, when it fires, properties; (c) reserved property names — `user_id`, `plan_name`, `project_type`, `utm_*`, `ga_client_id`. Rename mismatching events in the codebase as a follow-up patch.
**Effort:** S

#### M3. No referral-conversion event despite a fully built referral system
**Category:** §11
**Severity:** Major
**Issue:** Referral system exists at `supabase/migrations/20260419430000_add_referral_system.sql`, `src/components/billing/tabs/TabReferrals.tsx`, and Auth.tsx:53-60 captures `?ref=MM-XXXXXX`. But no `trackEvent("referral_signup_completed")` or `trackEvent("referral_purchase")` fires. The admin dashboard at TabAnalytics.tsx:275 hardcodes "Referrer tracking pending — Phase 18 enrichment" — *while referral codes are already being applied to subscriptions*.
**Evidence:** Auth.tsx:53-60 captures `mm_referral_code` but no `trackEvent` call references it. TabAnalytics.tsx:275 placeholder copy.
**Fix:** In `useAuth.ts` signUp (line 147), include `referral_code: sessionStorage.getItem('mm_referral_code') ?? null` in the trackEvent params. In `useSubscription.ts:215` `begin_checkout`, include the same. Wire the dashboard's "Acquisition" card (TabAnalytics.tsx:273-276) to a real query against `signup` events with referral_code populated.
**Effort:** S

#### M4. `begin_checkout` fires but Stripe opens in new tab — silent drop-off on mobile
**Category:** §11
**Severity:** Major
**Issue:** `useSubscription.ts:215-216` fires `begin_checkout` then immediately `window.open(data.url, "_blank")`. On iOS Safari and most mobile WebViews, popups not directly tied to the user gesture are blocked. The event fires, the user sees nothing happen — silent funnel leak between begin_checkout and purchase. Mobile is the primary audience per the brief.
**Evidence:** useSubscription.ts:215-216.
**Fix:** Switch to same-tab navigation: `window.location.assign(data.url)`. Or detect mobile and same-tab there only: `if (matchMedia('(max-width: 768px)').matches) window.location.assign(data.url); else window.open(data.url, '_blank')`. Add `trackEvent("checkout_redirect_blocked")` if `window.open` returns null so we measure the leak.
**Effort:** XS

#### M5. `trackEvent` swallows errors silently — analytics gaps invisible to ops
**Category:** §11
**Severity:** Major
**Issue:** `useAnalytics.ts:62-64` swallows all errors from `sendEvent` with an empty catch block. If gtag throws (e.g. a CSP violation, a regional block), the event is lost and no Sentry breadcrumb is left.
**Evidence:** useAnalytics.ts:62-64.
**Fix:** Replace `catch {}` with `catch (err) { Sentry.addBreadcrumb({ category: 'analytics', message: 'sendEvent failed', level: 'warning', data: { name } }); }`. Don't `Sentry.captureException` — that would spam if the user has a content-blocker. Just leave a breadcrumb.
**Effort:** XS

#### M6. `getStoredUtm` returns `{}` on JSON.parse error — silent UTM loss
**Category:** §11
**Severity:** Major
**Issue:** `useAnalytics.ts:23-30` `getStoredUtm` catches all errors and returns `{}`. If sessionStorage is full or corrupted, UTMs vanish and signup is wrongly attributed to "(direct)". No telemetry on this.
**Evidence:** useAnalytics.ts:23-30.
**Fix:** On catch, leave a Sentry breadcrumb (`category: 'analytics', message: 'getStoredUtm parse failed'`) before returning `{}` so we can diagnose attribution gaps. Do not throw.
**Effort:** XS

### Minor

#### m1. Inconsistent consent-gate enforcement
**Category:** §11
**Severity:** Minor
**Issue:** `useScrollDepthTracker` (`useAnalytics.ts:113`) explicitly checks `hasAnalyticsConsent()` before firing, but `trackEvent`, `useTrackClick`, and `useTrackImpression` rely on the implicit `window.gtag === undefined` no-op behavior. Functionally equivalent today, but a future change that loads GA4 unconditionally would break the consent contract for every event except scroll depth.
**Evidence:** useAnalytics.ts:113 vs useAnalytics.ts:46-65.
**Fix:** Move the consent gate into `sendEvent` itself: `if (!hasAnalyticsConsent()) return;` at the top of `sendEvent`. Remove the duplicate check in `useScrollDepthTracker`. This makes the contract explicit and centralized.
**Effort:** XS

#### m2. UTM uses `sessionStorage` — lost across tabs and sessions
**Category:** §11
**Severity:** Minor
**Issue:** `useAnalytics.ts:9` uses `sessionStorage` for UTM persistence. A user clicking an ad, opening a new tab, and signing up there loses attribution. Also lost if the user comes back the next day to complete signup.
**Evidence:** useAnalytics.ts:9, 19, 25.
**Fix:** Use `localStorage` with a 30-day TTL stamp, or a first-party cookie with `SameSite=Lax` set on the apex domain so it survives subdomain hops. 30-day attribution window is the GA4 default for `utm_campaign` so match it.
**Effort:** XS

#### m3. `feature_view` impression events spam GA4 — every scroll fires multiple
**Category:** §11
**Severity:** Minor
**Issue:** `FeatureCard.tsx:15` fires `feature_view` per card. With ~6-8 feature cards on the landing page, every visit produces 6-8 events. Layered with `trust_section_view`, `before_after_section_view`, `faq_section_view`, the per-pageview event count is high → GA4 free tier can hit collection limits faster than expected.
**Evidence:** Files matching `useTrackImpression` — TrustIndicators.tsx:13, FeatureCard.tsx:15, FaqSection.tsx:21, BeforeAfterComparison.tsx:38.
**Fix:** Aggregate into a single `landing_section_viewed` event with a `section` property, and only fire each section once per pageview (already the case). For feature cards specifically, fire `feature_card_section_viewed` once when *any* feature card enters the viewport, not per-card.
**Effort:** XS

#### m4. No `page_view` SPA event on route change
**Category:** §11
**Severity:** Minor
**Issue:** GA4 is loaded with `send_page_view: true` in CookieConsent.tsx:119, but that fires only on initial GA load. SPA route changes (React Router navigations) do not refire page_view, so subsequent screens (Editor, Voice Lab, Autopost Lab, Settings, Billing) do not register as pageviews. The "Top features" / engagement metrics in TabAnalytics.tsx:268-298 will under-count internal page traffic.
**Evidence:** CookieConsent.tsx:119; no `gtag('event', 'page_view', ...)` listener attached to React Router location changes anywhere in `src/`.
**Fix:** Add a `useEffect(() => { window.gtag?.('event', 'page_view', { page_path: location.pathname, page_title: document.title }); }, [location])` hook in App.tsx (or a dedicated `RouteChangeTracker` component) using `useLocation()` from react-router-dom.
**Effort:** XS

### Polish

#### p1. Hardcoded "Phase 18 GeoIP enrichment pending" placeholder copy
**Category:** §11
**Severity:** Polish
**Issue:** TabAnalytics.tsx:271, 275, 319 ship "Phase 18" placeholder strings to admins. Phase 18 is undefined for the audit reader. Either ship the feature or remove the placeholder.
**Evidence:** TabAnalytics.tsx:271,275,319.
**Fix:** Replace with neutral copy like "Acquisition channels coming soon" or, better, hide the cards until data exists rather than ship empty placeholders.
**Effort:** XS

---

## Production Blockers (must fix before launch)

| # | Title | File | Severity | Effort |
|---|-------|------|----------|--------|
| B1 | Marketing Astro site has no analytics | marketing/src/pages/index.astro | Blocker | M |
| B2 | UTMs lost across marketing→app | src/main.tsx:12 + marketing/* | Blocker | S |
| B3 | No identify() on signin → identity broken | src/hooks/useAuth.ts:147,158 | Blocker | S |

---

## Top 10 Priority Fixes

| # | Title | Severity | Effort | File |
|---|-------|----------|--------|------|
| 1 | Add identify(user_id) on signin / signup / boot | Blocker | S | src/hooks/useAuth.ts:147,158 |
| 2 | Forward UTMs from marketing→app | Blocker | S | marketing/src/layouts/* + src/main.tsx |
| 3 | Add GA4 to marketing Astro site | Blocker | M | marketing/src/layouts/Layout.astro |
| 4 | Fix admin funnel — stop showing 100/100/100 first 3 rows | Critical | S | src/components/admin/tabs/TabAnalytics.tsx:172-183 |
| 5 | Track generation_started / generation_completed | Critical | M | src/components/editor/* + worker/src/handlers/handleFinalize.ts |
| 6 | Track Voice Lab + Autopost Lab events | Critical | M | src/pages/lab/** |
| 7 | Forward GA4 client_id from FE → Stripe → webhook | Critical | S | src/hooks/useSubscription.ts:215 + supabase/functions/stripe-webhook/index.ts:67 |
| 8 | Buffer pre-consent events instead of dropping | Critical | S | src/hooks/useAnalytics.ts + src/components/CookieConsent.tsx |
| 9 | Reset analytics identity + UTM + referral on signOut | Major | XS | src/hooks/useAuth.ts:163-169 |
| 10 | Switch checkout redirect to same-tab on mobile | Major | XS | src/hooks/useSubscription.ts:216 |

---

## Notes / unable-to-verify

- Whether `VITE_GA_MEASUREMENT_ID` and `GA_MEASUREMENT_ID`/`GA_API_SECRET` are actually set in the production Vercel/Render environments could not be verified from static analysis (only `.env.example` is in the repo). If unset in prod, **all** GA4 conclusions above become moot — analytics is simply not collecting. Confirm via Vercel + Render env-var dashboards before launch.
- The `system_logs` writes that drive the "Returned next day" funnel step (admin RPC line 298-307) were not exhaustively traced; spot checks confirm `writeSystemLog` is called from Edge Functions but a full coverage audit of which user actions create `category='user_activity'` rows is out of this 15-minute window. Recommend a follow-up from `forge` to enumerate all `writeSystemLog(..., category: 'user_activity')` callsites and confirm they correlate to actual user-driven activity (not background jobs).
- No third-party product-analytics SDK (PostHog, Mixpanel, Amplitude, Segment) is wired up. This is a stack choice, not a bug — but PostHog autocapture would meaningfully reduce the manual instrumentation required for Voice Lab / Autopost Lab / Editor activation tracking. Flagged for `arch` to consider.
