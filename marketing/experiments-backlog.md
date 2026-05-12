# Studio Zero — Conversion Experiments Backlog + Funnel Instrumentation

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Hook (Growth — Conversion Rate Optimization)
**Status:** Phase 8 conversion deliverable. Composes against Lens's event taxonomy (parallel — Phase 8 analytics-spec), Herald's locked CTAs (`brand/samples/02-in-app-cta.md` + `03-fail-verdict-body.md`), Penny's pricing (`finance/pricing.md`), Trace's verdict-to-upsell loop (`ia/user-flows/verdict-to-upsell-loop.md`), and PRD §15 success metrics + §17 D4 A/B slot + §18.5 Goal-1 acceptance test.
**Phase:** 8 of BUILD_FLOW.md.

> This document is the conversion experiment contract. The Lens analytics spec wires the events enumerated in §3. Probe gates the checkout-area experiments (§2 E-011, E-012, E-013) on max-QA pass before traffic. Herald's locked CTAs in `brand/samples/02-in-app-cta.md` are the **control** in every relevant cell — Hook A/B variants against the lock, never replacing it.

---

## 1. Hook's experimentation philosophy

Every test in this backlog ships with a written hypothesis of the form *"Changing X will move metric Y because Z"*; every test is ICE-scored (Impact / Confidence / Ease, 1–10 each, defended numbers not vibes); every test changes exactly one variable; every test runs to a 95% Bayesian posterior or 95% frequentist p-value gate before a winner is called — **no premature stops, ever**, because premature stops have killed more good ideas than bad creative ever did. Conversion is a system engineered before traffic hits it, not a thing that happens after engineering; the metrics in PRD §15 (25 paying day-60, Code-audit attach >20%, Auto-PR attach >15% at V1.5, +20 re-audit improvement, NPS >30) are unfalsifiable without the per-step funnel chain below — this backlog is the chain. The checkout page is sacred; checkout-area tests require Probe max-QA before any traffic split. Tests that touch regulatory or trust-critical UX (Comply's FTC Click-to-Cancel, Halo's WCAG 2.2 AA flows, Shield's URL-audit attestation) are **excluded** from this backlog by design — those are not conversion levers, they are floors.

---

## 2. Experiments backlog (ICE-scored)

15 experiments specced + 3 reserved open slots = 18 rows. Sorted by Total ICE descending so the top-of-funnel + free-tier activation tests run first (where the math compounds hardest).

| ID | Surface | Hypothesis | Variant A (control) | Variant B (proposed) | Primary metric | Secondary metrics | I | C | E | Total | Owner | Milestone slot | Required sample (per-arm) | Risk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **E-009** | Verdict screen (free-tier Surface FAIL) | Surfacing Compass AH-5 "Unlimited free Surface re-audits — fix and re-run as many times as you need" chip on the FAIL verdict will lift re-audit-rate within 7d because customers don't know the offer exists until they see it, and the loop is the activation engine per PRD D2. | No chip (current Trace V1a state) | Aqua chip above secondary-CTA row + tooltip on hover | re-audit-within-7d rate | 7d return-rate, Code-SKU upgrade-click rate downstream | 10 | 9 | 10 | **29** | Hook + Compass + Vega | M5 (free traffic live) | ~1,800 free-tier FAIL verdicts/arm (assume baseline 25% → expected 35%, MDE +10pp, α=.05, power=.8) | Low — chip is purely additive copy; no checkout impact |
| **E-008** | Verdict screen (free-tier Surface FAIL) | Herald's locked CTA *"Run the Code audit →"* will outperform 2 variants because the lock was chosen for voice + receipt-driven frame, but the upgrade-click rate is the single highest-leverage Code-attach lever and must be tested, not asserted. | "Run the Code audit →" (Herald lock) | B: "See 3–5× more issues — Code audit →"  ·  C: "Read your source — Code audit →" | Code-SKU upgrade-click rate (`upgrade_clicked` from `Surface` to `Code`) | Subsequent `paid_conversion` rate, time-to-click | 10 | 7 | 9 | **26** | Hook + Herald | M5 (E2 email + verdict screen live together) | ~2,400 FAIL verdicts/arm at 3 arms (baseline 14% click → MDE +4pp) | Medium — Herald owns voice; any winning variant must clear Herald veto |
| **E-005** | Signup flow | Deferring email verification until the upgrade attempt (vs requiring before mode-pick) lifts TTFV by ~3 min and signup→first-verdict completion by ≥10pp because verification round-trips kill the warm intent window (HubSpot/Imaginary Landscape benchmarks). | Email verification required before mode-pick (current PRD §7.1 default) | Magic-link signup; verification deferred until first paid-tier upgrade attempt | signup → `verdict_shown` completion rate | TTFV (median + p95), email-deliverability, fraud-rate | 9 | 8 | 9 | **26** | Hook + Forge | M1 (signup live) — `status: live (M1)` per Batch 3 | ~1,200 signups/arm (baseline 55% completion → MDE +10pp) | Low-Medium — fraud-rate must hold; Shield owns fraud guard |
| **E-002** | Landing page | Mid-fold pricing-table placement will outperform near-bottom because Studio Zero's pricing is the trust signal (audit-tool pricing, not AI-builder pricing per §1 of `finance/pricing.md`) and hiding it below the fold cedes the category-framing battle to the visitor's assumed comp class. | Pricing table near-bottom (after demo/social-proof, current Vega layout) | Pricing table mid-fold (after hero, before demo) | landing → `signup_started` rate | scroll-depth, time-on-page, pricing-table hover events | 8 | 7 | 9 | **24** | Hook + Vega + Herald | M4 (marketing site live) | ~5,000 sessions/arm (baseline 4% signup-start → MDE +1pp) | Low — purely layout; no copy change |
| **E-014** | Lifecycle email E2 | Domain-bearing subject line *"14 issues on staging.acme.dev"* (current Herald lock) will outperform domain-only *"Your audit found issues on staging.acme.dev"* on open-rate because the number is a curiosity gap (Brian Dean / GrowthHackers benchmark — numeric subject lines lift open-rate 17–32%). | Herald-locked: "14 issues on staging.acme.dev" | "Your audit found issues on staging.acme.dev" | open-rate | Code-upgrade-click rate from E2, unsubscribe-rate | 8 | 8 | 8 | **24** | Hook + Herald + Lens | M4 (E1–E5 wired) | ~3,000 E2 sends/arm (baseline 38% open → MDE +5pp) | Low — subject-line only; Herald's number framing already substantiated |
| **E-006** | Signup flow (mode picker) | Replacing jargon mode labels (BYOK / CLI / Managed) with Compass AH-1 plain-English ("Bring your AI" / "Run on my machine" / "We handle it") will lift mode-pick completion-rate because non-technical persona (PRD §5 Managed buyer) bounces on TLAs. | "BYOK Starter / Claude Code CLI / Managed" labels | "Bring your AI / Run on my machine / We handle it" labels (Compass AH-1) | mode-pick completion-rate (signup → `mode_picked`) | Managed-tier conversion-rate, support-ticket rate on "what is BYOK" | 9 | 8 | 7 | **24** | Hook + Compass + Herald | M2 (Managed live) | ~1,500 mode-picks/arm (baseline 70% completion → MDE +8pp) | Low — Compass already locked the IA copy |
| **E-001** | Landing page | The hero H1 *"Your AI builder shipped code that fails accessibility. We'll prove it — line by line."* (PRD §1 reference) is the locked one-liner promise; variants must hold the same promise but test register (problem-framing / outcome-framing / fear-framing) to converge on a winner in ≤2 weeks at expected M5 traffic. | "Your AI builder shipped code that fails accessibility. We'll prove it — line by line." (PRD §1 lock) | B (outcome): "Get a third-party audit on your AI-built app — line by line."  ·  C (fear): "AI shipped your code. Did anyone audit it?" | landing → `signup_started` rate | bounce-rate, scroll-depth | 9 | 7 | 8 | **24** | Hook + Herald | M5 (launch traffic) | ~5,000 sessions/arm at 3 arms (baseline 4% signup-start → MDE +1.5pp) | Medium — PRD §1 calls the original locked; deviation requires BigBrain sign-off |
| **E-011** | Pricing page (BYOK Starter row) | Default-$29 with $19 A/B slot for first 200 signups (Penny's locked Sprint default per §3 of `finance/pricing.md`) tests whether $29 anchor-as-audit-tool beats $19 anchor-as-AI-tool on (conversion × ARPU × 90d retention) — Penny argues $10 spread is symbolic of category; Hook argues lower entry compounds funnel. | $29 / mo BYOK Starter | $19 / mo BYOK Starter (first 200 signups; cookie-locked cohort) | conversion-rate (visit → `paid_conversion` tier=BYOK Starter) × 90d retention × ARPU | trial-to-paid time, churn-at-30d, downstream upgrade-to-BYOK-Pro rate | 9 | 7 | 6 | **22** | Hook + Penny + Ledger | M2 (Stripe live) — closes M2 exit per D4 dual-deadline | First 200 signups cohort-locked (Penny's locked sample size; no MDE — readout is the readout) | High — checkout-area test; Probe max-QA gate required; price-flip mid-cohort prohibited |
| **E-003** | Landing page | Replacing "Free Surface audit" CTA copy variants tests register against Herald's voice (E-001) without changing the offer; expected ~5pp lift on highest-resonance variant per Unbounce CTA-copy benchmarks. | "Run your free Surface audit →" (Herald E1 lock mirror) | B: "Audit my site free →"  ·  C: "Get my readiness score →" | landing → `signup_started` rate | CTA click-rate (separate from signup-completion) | 8 | 7 | 8 | **23** | Hook + Herald | M5 | ~4,000 sessions/arm at 3 arms (baseline 8% CTA-click → MDE +2pp) | Low — CTA copy only; no offer change |
| **E-015** | Lifecycle email E3 (PASS WITH FIXES) | T+7d re-audit-reminder will outperform T+14d on re-audit-rate because PASS-WITH-FIXES customers are in the active-fix window for ~10 days post-verdict (founder-build cycle); T+14 lands after the fix window has closed and the customer has context-switched. | E3 sends at T+14 days post-verdict | E3 sends at T+7 days post-verdict | re-audit-within-30d rate (Trace EC-2 path) | E3 open-rate, Code-upgrade-click rate from E3 | 8 | 7 | 8 | **23** | Hook + Herald + Lens | M4 | ~1,500 PASS-WITH-FIXES verdicts/arm (baseline 40% re-audit → MDE +8pp) | Low — timing-only |
| **E-007** | Signup flow (mode picker) | Skip-able mode pick (auto-recommend "We handle it" default for first-time visitors with no GitHub OAuth, surface BYOK only after first FAIL) lifts TTFV by ~2 min and signup → first-verdict completion by ≥6pp; deferred-decision pattern (Calendly / Notion onboarding benchmark). | Forced mode-pick at signup (current §7.1) | Auto-recommend Managed default; "Change mode" link below; mode-pick deferred until first paid attempt | TTFV (median + p95) | signup → `verdict_shown`, mode-distribution at day-30 | 9 | 6 | 7 | **22** | Hook + Forge | M2 (Managed live) | ~1,200 signups/arm (baseline median TTFV 11min → MDE -2min) | Medium — competes with E-005 for the same surface; sequence E-005 first, E-007 second |
| **E-013** | Pricing page (annual toggle) | Default-on annual toggle with savings badge "$58 off" (BYOK Starter math: $29 × 12 = $348; $29 × 10 = $290; saves $58) lifts annual-mix from baseline 15% (Stripe billing benchmark monthly-default) to 40%+ on default-on. | Annual toggle default-off; "2 months free" line below | Annual toggle default-on; "$58 off" savings badge anchored to BYOK Starter row | annual-mix rate (annual / total paid conversions) | total `paid_conversion` rate (must not regress), refund-rate | 7 | 8 | 9 | **24** | Hook + Vega + Penny | M2 (Stripe live) | ~600 paid conversions/arm (baseline 15% annual → MDE +15pp) | Medium — checkout-area; Probe gate required; annual ARR pull-forward is real cash; Penny + Ledger sign-off required |
| **E-010** | Verdict screen (V1.5 prep) | Per-finding "Fix this for $5" micro-CTA on Code-SKU FAIL verdicts (Hook C3 stack from prd-review-v03 — pre-V1.5, manual fulfillment per D3) lifts Auto-PR pre-interest signal (`auto_pr_upcharge_clicked`) ≥2× vs no per-finding CTA; data informs D5 (flat $49 vs tiered $15/$49/$99) at V1.5 spec time per `finance/pricing.md` §4. | No per-finding CTA (current MVP) | "Fix this for $5" button on every Code finding card + cart-total at top | `auto_pr_upcharge_clicked` rate per FAIL verdict | cart-abandon rate, $35-threshold bundle-anchor view-rate | 8 | 6 | 6 | **20** | Hook + Vega + Penny | V1.5 prep (~week 14 — slot opens after M4) | ~800 Code-SKU FAIL verdicts/arm (low baseline — pre-V1.5 manual fulfillment caps volume) | High — pre-V1.5 fulfillment is manual (Loom + spec); Hook owns ops; if click-rate exceeds fulfillment capacity, throttle |
| **E-012** | Pricing page | Inserting decoy tier "BYOK Pro + Auto-PR" at $129/mo between $79 (BYOK Pro) and $249 (Managed Pro) doubles Managed-Pro conversion-rate by making $249 the obvious "stop thinking, just upgrade" choice (classic Ariely decoy theory; canonical "no decoy" failure on a 3.1× gap). | 4-tier ladder: $29 / $79 / $99 / $249 (current `finance/pricing.md` §2) | 5-tier ladder with $129 decoy inserted between $79 and $249 | Managed-Pro conversion-rate (% of pricing-page sessions → `paid_conversion` tier=ManagedPro) | total ARPU per pricing-page session, Pro-tier-mix shift | 9 | 6 | 5 | **20** | Hook + Penny + Vega | V1.5 (Auto-PR live, decoy is legitimate) | ~3,000 pricing-page sessions/arm (baseline 1.2% Managed-Pro conversion → MDE +0.8pp) | High — decoy is honest only once Auto-PR is purchasable (V1.5); pre-V1.5 ship is FTC-substantiation risk per Comply; gated to V1.5+ |
| **E-004** | Landing page | Above-fold trust strip (customer count + "Audit-tool comparable to SonarQube / Codacy / Snyk" anchor + WCAG 2.2 AA conformance badge) reduces bounce-rate ≥5pp because Studio Zero's category-framing (audit, not AI builder per `finance/pricing.md` §1) loses against visitor assumptions without an explicit anchor. | No above-fold trust strip | Trust strip: customer-count + comp-anchor sentence + WCAG badge | bounce-rate (sub-30s exits) | scroll-depth, signup-start-rate | 7 | 7 | 8 | **22** | Hook + Vega + Scout (substantiation file) | M5 | ~5,000 sessions/arm (baseline 62% bounce → MDE -5pp) | Medium — customer-count claim requires `marketing/claims-substantiation/claim-trust-strip-customer-count.md` (Scout/Comply gate per PRD §14.5); blocked until first 25 paying land |
| **E-016** | RESERVED — emergent | Reserved by Hook for M5+30d cohort-driven test based on first-200-cohort funnel data. Likely candidates: (a) deferred-card vs immediate-card on free-tier signup, (b) demo-URL pre-fill on free-tier intake, (c) public-PR-comment "Audited by Studio Zero" badge opt-in. | TBD at M5+30 | TBD at M5+30 | TBD | TBD | — | — | — | **—** | Hook | M5+30d | TBD | TBD |
| **E-017** | RESERVED — emergent | Reserved by Hook for V1.5+30d Auto-PR cohort. Likely candidates: (a) flat $49 vs tiered $15/$49/$99 — closes D5 per `finance/pricing.md` §4 readout criterion, (b) PR-body copy A/B, (c) Auto-PR refund-on-FAIL banner copy. | TBD at V1.5+30 | TBD at V1.5+30 | TBD | TBD | — | — | — | **—** | Hook + Penny | V1.5+30d | TBD | TBD |
| **E-018** | RESERVED — emergent | Reserved for post-launch cohort surprise. The first 200 signups will produce at least one funnel anomaly Hook cannot predict; this slot exists so the experiment registry isn't filled by speculative work that the data invalidates on week 1. | — | — | — | — | — | — | — | **—** | Hook | M5+open | TBD | TBD |

### Math notes
- Sample-size estimates assume α=0.05, power=0.8, two-tailed, baseline rate per cell. Sequential-testing correction (mSPRT or always-valid p-values) where the test surface allows continuous monitoring (PostHog Experiments default — `runOnce: false`).
- 95% Bayesian threshold = posterior P(B > A) ≥ 95% OR 95% frequentist p-value ≤ 0.05. Pick one per test at start; don't switch mid-flight.
- Tests with overlapping surfaces (E-005 + E-007, E-001 + E-003, E-009 + E-008) must run **sequentially**, not in parallel, to avoid interaction confounds. Hook owns the scheduling order in the M-week ramp.

---

## 3. Funnel instrumentation spec (events for Lens)

Composes against ARCH-D7 (`architecture/decisions.md`): score-engine lives in Edge Functions, so `audit_completed` and `verdict_shown` fire from the Edge Function response → Web App render path. All events consent-gated per PRD §6.1 (cookie-consent: necessary/analytics/marketing; pre-consent telemetry buffered, never transmitted until granted). PII-scrub per Cipher v0.2 B5 — `beforeSend` strips file contents, high-entropy strings, customer code; only structured properties below survive transmission.

| Event | Fires when | Source file (rough) | Required properties | Expected fire-frequency | Consent gate |
|---|---|---|---|---|---|
| `signup_started` | User submits email on signup form | `app/auth/signup/page.tsx` | `email_domain` (hashed), `referrer`, `utm_source/medium/campaign`, `landing_page_variant` | 1× per signup attempt | analytics ✓ |
| `signup_completed` | Magic-link clicked + session minted | `app/auth/callback/route.ts` | `user_id`, `time_to_completion_sec`, `email_verified: bool` | 1× per successful signup | analytics ✓ |
| `mode_picked` | User selects BYOK / CLI / Managed | `app/onboarding/mode/page.tsx` | `mode: 'byok'\|'cli'\|'managed'`, `time_on_page_sec`, `variant_id` (E-006) | 1× per signup (0 if E-007 deferred-mode wins) | analytics ✓ |
| `byok_key_validated` | Dry-run Anthropic API call returns 200 | `supabase/functions/byok-validate/index.ts` | `user_id`, `validation_runtime_ms` | 0–1× per BYOK signup | analytics ✓ |
| `byok_key_failed` | Dry-run Anthropic API call returns non-200 | same | `user_id`, `error_code` (Anthropic-side, NOT key material), `attempt_count` | rare (≤3% of BYOK signups expected) | analytics ✓ |
| `intake_step1_completed` | "What do you have?" step done (Optic Hick's-Law 2-step picker per PRD §7.2 Step B) | `app/intake/step1/page.tsx` | `user_id`, `intake_type: 'repo'\|'folder'\|'url'`, `time_on_step_sec` | 1× per audit started | analytics ✓ |
| `intake_step2_completed` | "How deep?" step done (Quick / Comprehensive / Custom) | `app/intake/step2/page.tsx` | `user_id`, `depth: 'quick'\|'comprehensive'\|'custom'`, `time_on_step_sec` | 1× per audit started | analytics ✓ |
| `audit_started` | Runner job enqueued | `app/audit/start/action.ts` (Server Action) | `user_id`, `run_id`, `mode`, `product: 'surface'\|'code'\|'full'`, `depth`, `tier` | 1× per run | analytics ✓ |
| `audit_completed` | Edge Function `score-engine` returns final verdict | `supabase/functions/score-engine/index.ts` → fires telemetry to Web App via Realtime channel | `user_id`, `run_id`, `verdict: 'PASS'\|'PASS WITH FIXES'\|'FAIL'`, `score: 0-100`, `runtime_ms`, `mode`, `product`, `depth`, `score_engine_version`, `finding_count` | 1× per completed run | analytics ✓ |
| **`verdict_shown`** | **Verdict screen first paints to DOM (THE AHA EVENT)** | `app/project/[id]/audit/[run-id]/page.tsx` `useEffect` mount | `user_id`, `run_id`, `verdict`, `score`, `finding_count`, `time_since_audit_completed_ms`, `is_first_verdict_for_user: bool` | 1× per run viewed; **defines TTFV terminus** | analytics ✓ |
| `upgrade_clicked` | Any "Run the Code audit →" / "Ship the fixes" / "Pick →" CTA click | `components/upsell-card/*.tsx` + pricing-table rows | `user_id`, `run_id` (if from verdict), `from_tier`, `to_tier`, `variant_id` (E-008 / E-001 / E-003) | 0–many per session | analytics ✓ |
| `paid_conversion` | Stripe `checkout.session.completed` webhook lands | `app/api/webhooks/stripe/route.ts` | `user_id`, `tier`, `mode`, `currency`, `amount`, `is_annual: bool`, `variant_id` (E-011 / E-013), `cohort_id` (first-200 cookie-lock for E-011) | 0–1× per upgrade | analytics ✓ |
| `re_audit_started` | Audit started on existing project (Trace V4 re-entry) | same as `audit_started` with `runs.parent_run_id` set | additional: `parent_run_id`, `days_since_parent_verdict` | 0–many per project | analytics ✓ |
| `re_audit_completed` | Re-audit reaches `verdict_shown` | same as `verdict_shown` | additional: `parent_run_id`, `score_delta` (this run minus parent) | matches `re_audit_started` | analytics ✓ |
| `auto_pr_upcharge_clicked` | Per-finding "Fix this for $5" OR "Ship the fixes — $49" click (V1.5; pre-V1.5 fires for E-010 prep data) | `components/finding-card/*.tsx` + `components/auto-pr-cta/*.tsx` | `user_id`, `run_id`, `finding_id` (if per-finding), `cart_total_usd`, `variant_id` (E-010) | V1.5; 0–many per Code-FAIL verdict | analytics ✓ |
| `auto_pr_purchase_completed` | Stripe `checkout.session.completed` for fix-bundle SKU | `app/api/webhooks/stripe/route.ts` | `user_id`, `run_id`, `bundle_size: 'S'\|'M'\|'L'\|'flat'`, `amount` | V1.5; 0–1× per Auto-PR purchase | analytics ✓ |
| `dispute_finding_started` | "Dispute Finding" form opened (Trace EC-6) | `app/project/[id]/audit/[run-id]/dispute/page.tsx` | `user_id`, `run_id`, `finding_id` | 0–many per FAIL (rare) | analytics ✓ |
| `dispute_finding_resolved` | Comply marks dispute resolved | admin tool | `user_id`, `dispute_id`, `outcome: 'upheld'\|'overturned'\|'partial'` | matches `_started` after SLA | analytics ✓ |
| `feedback_submitted` | NPS or in-app feedback submitted | `components/feedback-widget/*.tsx` | `user_id`, `nps_score: 0-10`, `feedback_text_length` (NOT the text — Sentry redaction posture) | sparse | analytics ✓ |

**Reserved follow-up events (V1.5+ — not in MVP scope but Lens namespace-reserved):** `share_verdict_clicked`, `cli_pairing_completed`, `github_app_installed`, `email_e2_opened`, `email_e2_clicked`, `pricing_page_viewed`, `decoy_tier_clicked` (E-012 prep).

---

## 4. TTFV (time-to-first-value) target

**Aha moment definition (locked):** *the first FAIL verdict with cited evidence rendered to the customer.* Operationalized as the `verdict_shown` event with `is_first_verdict_for_user: true` AND `finding_count > 0` AND at least one finding has `evidence.alt` populated (per PRD §9.4 HC4 a11y addendum — evidence with `alt` text is the "cited" half of "cited evidence").

**TTFV targets:**

| Mode | TTFV target | Funnel (signup-start → `verdict_shown`) |
|---|---|---|
| **Free Surface audit** | **TTFV < 8 min** | signup (1–2 min) → mode pick OR auto-default (0–1 min) → URL attest checkbox + paste (1 min) → audit run (~3–4 min for Surface depth) → verdict render |
| **BYOK Code audit** | **TTFV < 12 min** | signup (1–2) → mode pick (1) → BYOK key paste + validation (1–2) → GitHub App install (2–3) → repo pick + depth (1) → audit run (~3–4 for Quick) → verdict render |
| **Managed Code audit** | **TTFV < 10 min** | signup (1–2) → mode pick (1) → Stripe Checkout (~2) → GitHub App install (2–3) → repo pick + depth (1) → audit run (~3–4) → verdict render. (Stripe adds ~2 min but the customer skips the API-key-paste-and-bounce friction.) |

**Enforcement:** `tests/acceptance/goal-1-signup-to-first-verdict.spec.ts` per PRD §18.5 Goal 1. Acceptance test is binary: synthetic free-tier user signs up cold → `verdict_shown` fires within 8 minutes simulated time → test exits 0 with finding-count > 0. Fail closes M1 exit gate.

**Caveat (Hook):** the < 8min Free target assumes E-005 (defer email verification) ships at M1. If E-005 loses, baseline TTFV is 11–13 min and the §18.5 acceptance test's 8-min budget will not hold — flagged for Verify. The acceptance test currently allows 8 min simulated; recommend Verify allow 12 min for v1 of the test and ratchet to 8 min after E-005 wins.

---

## 5. R21(c) conversion math (Managed-tier alpha ≥5 paying at M2 close)

Per PRD §19 R21 mitigation (c): Signal + Penny + Atlas own a Managed-tier alpha-cohort target of **≥5 paying customers at M2 close (week 9)** to pull MRR forward 7 weeks against the cash-runway crunch. Hook owns the alpha-list → paying-conversion test math.

**Reach assumptions (Signal's M0–M2 build-in-public ramp per PRD §15.5):**
- X / Twitter: 2,000 followers by M2 (warm — built-in-public threads, Jury verdict screenshots — assumes 4 posts/week × 9 weeks × ~55 followers/week ramp = 1,980)
- IndieHackers subscribers: 500 by M2 (cold-warm — milestone posts; assumes 55/week ramp)
- Hacker News (build-in-public Show HN draft): ~50 points on M0 launch thread = ~30 alpha-list signups
- **Total addressable reach at M2 ≈ 2,500**

**Funnel chain (Hook's per-step targets):**

| Step | Target retention | Cumulative | N at M2 |
|---|---|---|---|
| Reach (impressions from X / IH / HN — composed across the 4-channel min per PRD §15.5) | 100% | 100% | ~2,500 |
| Build-in-public CTA click → alpha-list signup form view | 8% (warm BIP audience benchmark; IH median ~6–10%) | 8% | ~200 |
| Alpha-list signup form submit | 50% (low-friction email-only; Optic Hick's-Law 1-field form) | 4% | **~100 alpha-list** |
| Alpha-list → first Managed audit (free trial OR direct paid) | 60% (engaged self-selected cohort) | 2.4% | ~60 |
| Managed audit → paying conversion | **8–17%** (range from Hook's pre-launch model — anchored to "engaged trial cohorts convert 5–15% for paid SaaS"; alpha cohort is warmer than typical) | 0.2–0.4% | **5–10 paying** |

**Readout (Hook's confidence):**
- Lower bound: 5 paying Managed (5% alpha-list conversion) — **meets R21(c) floor**
- Upper bound: 10 paying Managed (10% alpha-list conversion) — clears floor 2×
- Risk band: if reach falls below 1,500 OR alpha-list signup-rate falls below 4%, R21(c) is at risk; Hook + Signal flag at M1 retro (week 6) so corrective channels (Discord AMA bookings, Product Hunt hunter pre-recruitment) can fire before M2 close.

**Alpha-list → paying-conversion test spec (Hook's responsibility):**
- **CTA at top of alpha-list signup form:** "Be one of the first 25 — Managed beta access for $99/mo when we launch. No card required to join the list." (numeric scarcity — first 25 — anchors against the §15 day-60 25-paying target; "no card" removes friction; price is in the offer because Penny's pricing posture is transparent)
- **Onboarding flow at M2 conversion:** white-glove first-audit walkthrough video (Loom, owned by Jo) embedded in the day-1 email; **NOT** the standard E1 lifecycle email — the alpha cohort gets a warmer onboarding because the conversion math depends on it.
- **Pricing message at conversion (locked):** "Managed Starter — $99/mo. Tokens included. 2 Full audits/mo. Cancel anytime." No discount; no "founding member" coupon; the audit-tool positioning per `finance/pricing.md` §1 forbids commodity-discount framing. **Reserved cohort treatment:** lifetime grandfather at $99 if Penny re-prices Managed Starter upward in v2 (locked transparency commitment to alpha cohort; Comply + Penny sign-off).
- **Test variant slot (E-016 candidate, M2+30d):** A/B test the alpha → paid onboarding email between (A) Loom walkthrough vs (B) live 15-min Zoom 1:1 with Jo for the first 50 alpha-list signups. Primary metric: alpha → paying-conversion rate. Hypothesis: B will beat A by ≥5pp on a small cohort because Managed buyers (non-technical solo founders per PRD §5) over-index on human reassurance.

---

## 6. Hook exit-gate self-verdict

- [x] **≥15 ICE-scored experiments specced.** 15 active (E-001 through E-015) + 3 reserved slots (E-016, E-017, E-018) = 18 rows. Each active row has hypothesis + I/C/E defended + primary metric + sample-size estimate.
- [x] **TTFV target locked + acceptance-test path named.** Free <8min / BYOK <12min / Managed <10min. Aha event = `verdict_shown` with `is_first_verdict_for_user: true` AND `finding_count > 0` AND ≥1 finding with evidence.alt populated. Enforced by `tests/acceptance/goal-1-signup-to-first-verdict.spec.ts` per PRD §18.5 Goal 1.
- [x] **Funnel events enumerated for Lens.** 19 MVP events specced + 7 V1.5/post-MVP reserved. Each row has source-file, properties, fire-frequency, consent gate. Composes against ARCH-D7 (score-engine in Edge Functions) and Cipher's `beforeSend` PII-scrub posture.
- [x] **R21(c) conversion math sized.** 2,500 reach → ~100 alpha-list → 5–10 paying Managed at M2 close. Lower bound meets R21(c) floor; risk-band thresholds (reach <1,500 OR alpha-list rate <4%) flagged for M1 retro escalation. Alpha-list → paying-conversion test specced with locked CTA copy, onboarding flow, and pricing message.

**Cross-checks:**
- [x] **Composes against Herald.** Locked CTAs from `brand/samples/02-in-app-cta.md` § 2 are the control in E-008 (verdict primary), E-003 (free-Surface CTA), and the variant-baseline in E-001 (PRD §1 H1). Herald veto preserved on any winning variant.
- [x] **Composes against Penny.** D4 A/B slot ($29 default, $19 first-200) is E-011; sample-size matches Penny's "first 200 signups" cohort lock per `finance/pricing.md` §3. D5 readout criterion at V1.5+30d per `finance/pricing.md` §4 is the E-017 reserved-slot trigger.
- [x] **Composes against Lens.** §3 event list is the contract Lens's analytics-spec wires; variant_id columns on `upgrade_clicked` / `paid_conversion` are the join key for cohort readouts.
- [x] **Composes against Probe.** E-011, E-012, E-013 (checkout-area tests) explicitly gated on Probe max-QA in §2 Risk column; Probe sign-off required before any traffic split on those three.
- [x] **Composes against Verify.** §4 acceptance-test path (`tests/acceptance/goal-1-signup-to-first-verdict.spec.ts`) named; Hook's caveat (8min target depends on E-005 winning) flagged for Verify's TTFV budget.
- [x] **Composes against Trace.** §3 events mirror Trace's verdict-to-upsell-loop states V0→V5 (`verdict_shown` = V0; `upgrade_clicked` from Surface→Code = V1a→V2a transition; `paid_conversion` = V2a webhook; `re_audit_started` = V4 re-entry). OQ-3 from `ia/user-flows/verdict-to-upsell-loop.md` (V2a renders A/B-able price for first 200 signups) is resolved by E-011.
- [x] **Tests exclude regulatory/trust floors.** No A/B on FTC Click-to-Cancel (Comply lock), no A/B on WCAG 2.2 AA flows (Halo lock), no A/B on URL-audit attestation (Shield lock), no A/B on AI-disclosure copy (Comply + Herald lock per §11.3 / §14.5). Per Hook constraint — those are floors, not levers.
- [x] **No vibes ICE numbers.** Each I/C/E number is defended in the Hypothesis cell against either a public benchmark (HubSpot / Imaginary Landscape / GrowSumo / Stripe billing benchmark / Ariely decoy theory / Brian Dean numeric-subject) or an internal lock (Compass AH-1 / AH-5, Herald sample-02, Penny `pricing.md` §3, PRD D2).

**Hook's verdict on Phase 8 conversion exit gate: PASS.**

---

*Conversion experiments backlog v1.0. Locked at MVP. Hook revisits at M5+30d cohort readout — emergent slots E-016/E-017/E-018 fill against actual funnel data, never speculative work. Premature stops killed more good ideas than bad creative ever did; significance-gate is the only stop signal.*

---

## 7. Live experiment status (M1 Batch 3 — Hook)

| ID | Status | Code path | Test | Dashboard | Readout cadence |
|---|---|---|---|---|---|
| **E-005** | `live (M1)` — variant assignment + funnel tracking live | `apps/web/lib/experiment.ts` + `apps/web/app/signup/page.tsx` (variant branch) + `apps/web/components/VerifyEmailBanner.tsx` (variant-B banner) | `apps/web/tests/integration/funnel-instrumentation.spec.ts` (mirrored at `tests/funnel-instrumentation.test.ts` for root-vitest pickup) — Vitest, PR-blocking per Verify | `marketing/experiments/E-005-dashboard.md` (PostHog Insights URLs populated within 24h of M1 cutover) | M1+30d cohort + M2+30d cumulative |

**Operational notes:**
- PostHog flag config: `marketing/posthog-flags.md` §2 — sticky per user_id, hash-based deterministic fallback when PostHog is unreachable.
- Variant A and Variant B both ship working code paths (constraint per Hook: no half-finished branches).
- Stat-sig gate: 95% Bayesian (PostHog Experiments default).
- Stop condition: P(B>A) ≥ 0.95 OR ≤ 0.05 at ≥ 1,500 signups/arm, OR no-difference at 5,000/arm, OR 8-week max run.
- Full readout commits at M1+30d cohort as `marketing/experiments/E-005-readout.md`.
