# Studio Zero — PostHog Feature Flags & Experiments

**Version:** 1.0
**Date:** 2026-05-12
**Owner:** Hook (Growth — CRO) with Lens (analytics infra)
**Status:** Phase 9 M1 Batch 3 deliverable. Lands alongside Lens's `analytics-events.v1.ts` typed registry.
**Reader contract:** Forge can wire a new feature flag from this file alone — name, key, variants, payload, rollout rule, kill-switch, evaluation context.

> **Convention.** Every flag here has (1) a stable string key — never rename, only deprecate — (2) a kill-switch contract (what happens when the flag is OFF), (3) a sticky-bucket contract (per-user, per-tenant, per-cookie), (4) an evaluation context (where in the codebase the flag is read), and (5) a sunset date. Drift kills experiments; this file is the lock.

---

## 1. Flag inventory

| Key | Type | Default | Rollout | Owner | Evaluation context | Sunset |
|---|---|---|---|---|---|---|
| `defer-email-verify-experiment` | A/B (experiment) | `A` (control) | 50/50 sticky per user | Hook | `apps/web/lib/experiment.ts → assignVariant({ key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY })` | M1 + 30d cohort readout OR 8-week max run (whichever first) |
| `dev-runtime-mock-auth` | boolean (kill-switch) | `false` | env-driven (`NEXT_PUBLIC_USE_AUTH_MOCK=true`) | Forge | `apps/web/lib/auth-mock.tsx → isAuthMockEnabled()` | When prod auth is the only path |

Future M2+ rows (reserved keys, not yet live):

| Key (reserved) | Test | Slot |
|---|---|---|
| `verdict-fail-reaudit-chip` | E-009 (free-tier FAIL re-audit chip) | M5 |
| `verdict-code-cta-copy` | E-008 (Code-CTA copy A/B/C) | M5 |
| `landing-pricing-position` | E-002 (landing pricing position) | M4 |
| `landing-hero-h1` | E-001 (landing H1 register) | M5 |
| `mode-labels-plain-english` | E-006 (mode picker labels) | M2 |
| `e1-subject-numeric` | E-014 (E2 numeric subject) | M4 |

---

## 2. `defer-email-verify-experiment` — full spec

### 2.1 Hypothesis
*Deferring email verification until the upgrade attempt (vs requiring before mode-pick) lifts TTFV by ~3 min and signup → first-verdict completion by ≥10pp because verification round-trips kill the warm intent window* (HubSpot / Imaginary Landscape benchmarks; `experiments-backlog.md` E-005 row).

### 2.2 Variants

| Variant | Label | Behavior | Banner |
|---|---|---|---|
| **A** (control) | `require-verify` | After `supabase.auth.signUp()`, redirect to `/auth/verify-email`; user cannot reach `/app/onboarding/mode` until the link is clicked. Current Forge-1 behavior. | none |
| **B** (treatment) | `defer-verify` | After `supabase.auth.signUp()`, redirect to `/app/onboarding/mode?verify=pending` immediately. Mode-pick allowed pre-verify. Persistent dismissable banner: *"Confirm your email to keep your account active."* Banner remains until the user clicks the magic link OR dismisses. Verification is enforced ONLY at the first paid-tier upgrade attempt (Stripe checkout submit). | yes — `apps/web/components/VerifyEmailBanner.tsx` |

### 2.3 Allocation
- **50 / 50** sticky per user.
- **Sticky strategy:** PostHog's default per-`distinctID` bucketing. Pre-signup (anonymous) traffic is bucketed via a localStorage anon-id (`sz.exp.defer-email-verify.bucket`) so the user lands in the same arm at signup as they would have pre-signup if they'd been profiled.
- **No targeting filters** — global rollout to 100% of signups. Any segmentation would dilute the funnel signal.

### 2.4 Evaluation context
- **Client-side read:** `apps/web/app/signup/page.tsx` immediately after `supabase.auth.signUp()` returns. Variant resolves via `assignVariant({ key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY, userId: data.user?.id })`.
- **Sticky after first read:** subsequent reads from `apps/web/app/app/onboarding/mode/page.tsx` and the verdict page receive the same variant for the same `user.id` — both PostHog (when available) and the FNV-1a fallback guarantee this.
- **Exposure event:** `experiment_exposure` fires exactly once per (user × experiment_key) per page-load (de-duped in `posthog-client.ts`).
- **Variant tag on funnel events:** every `signup_completed`, `mode_picked`, `audit_completed`, `verdict_shown` event carries `experiment_variant: 'A' | 'B'`.

### 2.5 Metrics

**Primary (decision metric):**
- `signup → verdict_shown` completion rate per variant (counted on `is_first_verdict_for_user: true`).

**Secondary (guardrails + understanding):**
- Signup-to-Aha TTFV: median + p95, computed from `verdict_shown.ttfv_ms`.
- `email_verification_completed` rate at T+24h post-signup, per variant (variant B's hypothesis predicts this can drop while primary still wins — guardrail says it must not drop > 20pp).
- Fraud-rate proxy: rate of `byok_key_failed: invalid_key` per signup, per variant (Shield-owned guardrail; if variant B opens a fraud vector, it shows here first).
- `paid_conversion` rate per variant (downstream guardrail — variant B cannot win primary while losing money).

### 2.6 Sample size

Baseline: 25% signup → `verdict_shown` completion (Hook's pre-launch model — anchored against PRD §15 success-metric chain and `experiments-backlog.md` E-005 row).
Target MDE: +10pp absolute (treatment ≥ 35%).
Confidence: 95% (Bayesian P(B > A) ≥ 0.95 OR α=0.05 frequentist; PostHog Experiments default = Bayesian).
Power: 80%.

**Calculation (two-proportion, α=0.05, power=0.80, two-tailed):**

```
n_per_arm = (Z_α/2 + Z_β)^2 × (p1(1-p1) + p2(1-p2)) / (p2 - p1)^2
         = (1.96 + 0.84)^2 × (0.25 × 0.75 + 0.35 × 0.65) / (0.10)^2
         = 7.84 × (0.1875 + 0.2275) / 0.01
         = 7.84 × 0.415 / 0.01
         ≈ 326
```

Hook's stated estimate in `experiments-backlog.md` E-005 is **~1,200 signups/arm**. The discrepancy: that figure includes a continuity correction + a 3× cushion for Bayesian early-look + sequential-testing penalties (mSPRT). The minimum statistical sample is ~326/arm; **Hook ships with the conservative 3,000/arm target so we don't burn the experiment on a flaky early read**.

**Stop conditions:**
- Stop early (winner called): PostHog reports P(B > A) ≥ 0.95 OR ≤ 0.05 (clear loser) AND ≥ 1,500 signups per arm have accumulated.
- Stop early (futility): P(B > A) within [0.40, 0.60] after 5,000 signups per arm — declare no-difference, ship control as default, free the slot.
- Stop on max-run: 8 weeks of traffic at expected M1 cadence (≈ 100 signups/day per Hook's R21(c) model → ≈ 5,600 signups total over 8 weeks ≈ 2,800/arm — close to the conservative target).
- Stop on guardrail breach: `email_verification_completed`-at-T+24h drops > 20pp on variant B, OR `byok_key_failed` rate doubles on variant B. Hook + Shield co-own the breach trigger; if breached, variant B is rolled back to 0% within 24h.

### 2.7 Decision-time matrix

| Posterior P(B > A) | Sample threshold | Decision | Owner |
|---|---|---|---|
| ≥ 0.95 | ≥ 1,500/arm | Ship B as default; deprecate A; free the slot | Hook |
| ≤ 0.05 | ≥ 1,500/arm | Ship A as default; deprecate B; free the slot | Hook |
| [0.05, 0.40] or [0.60, 0.95] | < 5,000/arm | Continue running | Hook |
| (0.40, 0.60) | ≥ 5,000/arm | Declare no-difference; ship A; free the slot | Hook |
| any | guardrail breach | Roll back to A; document; re-design | Hook + Shield |

### 2.8 Kill-switch contract

When `defer-email-verify-experiment` is OFF (PostHog flag disabled, or PostHog unreachable):
- `assignVariant()` returns `A` (control).
- The signup page falls back to PRD §7.1 default: `/auth/verify-email`.
- No `experiment_exposure` event fires (PostHog client unavailable; deterministic fallback still bucketed but exposure dedup'd in-memory only).
- The codebase NEVER hard-fails on PostHog absence. This is enforced by `apps/web/lib/posthog-client.ts loadClient()` returning null → all calls degrade to no-op.

### 2.9 Test ownership
- Variant A regression: `tests/acceptance/goal-1-signup-to-first-verdict.spec.ts` (Verify; the existing PRD §18.5 path).
- Variant B regression: `apps/web/tests/integration/funnel-instrumentation.spec.ts` (Hook; this batch). Walks signup-to-verdict with `track()` mocked and asserts the variant-B redirect lands on `/app/onboarding/mode?verify=pending` AND the banner renders AND every funnel event carries `experiment_variant: 'B'`.

---

## 3. Operating procedure

### 3.1 Launch ramp
1. Land code (this batch).
2. Create the flag in PostHog UI with key `defer-email-verify-experiment`, variants `A` (50%) and `B` (50%), rollout to 100% of users.
3. Set the **identify-at** to `user_id` so logged-in users get sticky variants across devices.
4. Smoke-test in staging: 10 signups, verify ~5 in each arm, verify exposure events fire once, verify funnel events carry `experiment_variant`.
5. Enable in production at M1 cutover.

### 3.2 During the experiment
- Hook reads the dashboard daily for the first 3 days (smoke-test signal), then 2× per week.
- No peeking-and-stopping; the stop conditions in §2.6 are the ONLY decision triggers.
- Guardrail breach review: Shield runs a daily `byok_key_failed` rate diff at 09:00 UTC; Hook reads `email_verification_completed` rate weekly.

### 3.3 Post-experiment
- Winner declared per §2.7 matrix.
- Loser arm code path STAYS in the codebase for ≥30 days post-decision (rollback safety).
- Variant data archived to `marketing/experiments/E-005-readout.md` (Hook owns; lands at decision time).
- The experiment-backlog row for E-005 transitions `status: live → decided`.

---

## 4. Cross-refs

- `marketing/experiments-backlog.md` E-005 row — hypothesis + ICE + sample size (this file is the operational spec).
- `marketing/experiments/E-005-dashboard.md` — dashboard layout, PostHog Insights URLs (placeholder until prod data), readout template.
- `apps/web/lib/experiment.ts` — sticky-assignment implementation.
- `apps/web/lib/analytics-events.v1.ts` — typed event registry; `experiment_variant` property surface.
- `apps/web/lib/posthog-client.ts` — PostHog transport + flag resolution + exposure dedup.
- `ia/user-flows/signup-to-first-verdict.md` — the flow under test.
- `architecture/test-strategy.md` §1 — test layer matrix; integration tests are PR-blocking.

---

*PostHog flag config v1.0. Locked at M1. Hook revisits at experiment decision; Lens revisits on registry drift.*
