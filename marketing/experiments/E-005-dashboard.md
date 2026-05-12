# E-005 — Defer Email Verification — Dashboard

**Experiment ID:** E-005
**Version:** 1.0
**Status:** `live (M1)` — assignment + tracking landed in Phase 9 M1 Batch 3 (Hook).
**Owner:** Hook (Growth — CRO)
**Started:** M1 cutover, 2026-05-12
**Stop deadline:** start + 8 weeks OR Bayesian P(B>A) ≥ 0.95 OR ≤ 0.05 (whichever first)
**Backlog row:** `marketing/experiments-backlog.md` E-005
**Flag config:** `marketing/posthog-flags.md` §2

---

## 1. At a glance

| | Variant A (control) | Variant B (treatment) |
|---|---|---|
| Behavior | Verify email before mode-pick | Defer verify; land on mode-pick; banner persists |
| Traffic share (sticky per user) | 50% | 50% |
| Code path | `/auth/verify-email` | `/app/onboarding/mode?verify=pending` |
| Banner | none | `VerifyEmailBanner` |

**Primary metric:** `signup → verdict_shown` completion rate (per variant), where `verdict_shown.is_first_verdict_for_user === true`.

**Secondary metrics:** TTFV (median, p95); `email_verification_completed`-at-T+24h rate (guardrail); `byok_key_failed` rate (Shield-owned fraud guardrail); `paid_conversion` rate (downstream guardrail).

---

## 2. PostHog Insights URLs

> Placeholders — Hook fills these in within 24h of M1 cutover once the PostHog project is live. Until populated, this dashboard renders against `apps/web/tests/integration/funnel-instrumentation.spec.ts` synthetic data so the layout + columns can be reviewed in PRs.

| Insight | PostHog URL | Description |
|---|---|---|
| Funnel — variant A | `https://us.posthog.com/insights/<id>/` (TBD) | signup_started → signup_completed → mode_picked → audit_started → audit_completed → verdict_shown, filtered to `experiment_variant = 'A'` |
| Funnel — variant B | `https://us.posthog.com/insights/<id>/` (TBD) | same filter, `experiment_variant = 'B'` |
| TTFV — variant A | `https://us.posthog.com/insights/<id>/` (TBD) | `verdict_shown.ttfv_ms` histogram, median + p95 markers, A only |
| TTFV — variant B | `https://us.posthog.com/insights/<id>/` (TBD) | same, B only |
| Experiment — primary | `https://us.posthog.com/experiments/<id>/` (TBD) | PostHog Experiments view: Bayesian posterior on signup → verdict_shown |
| Guardrail — verify-at-24h | `https://us.posthog.com/insights/<id>/` (TBD) | `email_verification_completed` / `signup_completed` at 24h window, per variant |
| Guardrail — fraud | `https://us.posthog.com/insights/<id>/` (TBD) | `byok_key_failed` rate per variant |

---

## 3. Funnel-per-variant table (live readout — populated automatically by Hook's weekly query)

> Snapshot template. Hook updates this table weekly from the PostHog funnel insights linked above. Fields marked `…` are TBD until traffic accumulates.

| Step | Variant A users | Variant A % step→step | Variant A cumulative % | Variant B users | Variant B % step→step | Variant B cumulative % |
|---|---|---|---|---|---|---|
| `signup_started` | … | 100% (entry) | 100% | … | 100% (entry) | 100% |
| `signup_completed` | … | … | … | … | … | … |
| `mode_picked` | … | … | … | … | … | … |
| `audit_started` | … | … | … | … | … | … |
| `audit_completed` | … | … | … | … | … | … |
| `verdict_shown` (`is_first_verdict_for_user=true`) | … | … | **primary** | … | … | **primary** |

**TTFV (signup_completed → verdict_shown):**

| Variant | Median | p95 | Sample |
|---|---|---|---|
| A | … min | … min | … |
| B | … min | … min | … |

**Target:** Free Surface < 8 min. Hook's caveat (per `experiments-backlog.md` §4): if B wins, the < 8 min target is reachable; if A wins, raise the Verify acceptance test budget to 12 min temporarily.

---

## 4. Stat-sig calculator notes (Bayesian via PostHog Experiments)

PostHog Experiments uses a Bayesian framework by default — Beta posterior on each variant's conversion rate, with the prior being uninformative (Beta(1, 1)). The decision metric is **P(treatment > control)**, the posterior probability that B's true conversion rate exceeds A's.

### 4.1 Decision criteria (matches `posthog-flags.md` §2.7)

- **Stop, ship B:** P(B > A) ≥ 0.95 AND ≥ 1,500 signups per arm (sample-floor prevents PostHog's early-look from declaring on too-thin data).
- **Stop, ship A:** P(B > A) ≤ 0.05 AND ≥ 1,500 signups per arm.
- **Stop, no-difference:** P(B > A) ∈ (0.40, 0.60) AND ≥ 5,000 signups per arm. Ship A (control wins ties — incumbency rule).
- **Continue:** none of the above.
- **Roll back B:** guardrail breach (`email_verification_completed`-at-T+24h drops > 20pp on B OR `byok_key_failed` rate on B doubles vs A).

### 4.2 Why we don't use the frequentist p-value here
PostHog Experiments lets us toggle — Hook chose Bayesian because:
- Continuous monitoring is safe under Bayesian (the posterior updates incrementally; there's no Type-I-inflation penalty for peeking, only a sample-floor caveat).
- The decision threshold is interpretable to non-stats stakeholders (Penny + Compass): "we are 95% sure B is better" reads cleanly.
- mSPRT / always-valid p-values would work too but PostHog's default is Bayesian and switching tools mid-flight would be a footgun.

### 4.3 Common failure modes Hook watches for
- **Sample ratio mismatch (SRM):** if PostHog reports the split is not 50/50 (chi-sq p < 0.001), suspect a bucketing leak (cookie failure, anon-id reset, identify drift). Halt and investigate before reading metrics.
- **Cross-variant contamination:** if a user toggles between arms across sessions (logging-in on a new device, cookie wipe, ad-block reset), PostHog's `distinctID`-bound stickiness is supposed to prevent this — but verify weekly by inspecting users whose `experiment_exposure` event fired with both A and B in the same week. Expected rate < 0.5%.
- **Outlier TTFV:** the < 8 min Free target assumes B wins. If a small cluster of B users has TTFV in the hours range (signup, walked away, came back), the median will be fine but p95 will look broken. Hook truncates the tail at p99 before reading p95.

---

## 5. Hook's post-experiment readout template

> Hook fills this in at decision time (winner called per §4.1) and commits as `marketing/experiments/E-005-readout.md`. The current file (this dashboard) stays live; the readout is the historical record.

### Header
- **Experiment:** E-005 — Defer Email Verification
- **Window:** YYYY-MM-DD → YYYY-MM-DD
- **Total signups bucketed:** N
  - A: N_A (n%)
  - B: N_B (n%)
- **SRM check:** chi-sq p = … (pass / fail)
- **Decision:** ship A / ship B / no-difference / rolled back
- **Decision trigger:** P(B>A) = … at N=… AND … (matches §4.1 cell)

### Results

| Metric | A | B | Δ (B − A) | P(B>A) | Decision-level? |
|---|---|---|---|---|---|
| signup → verdict_shown | … | … | … | … | primary |
| TTFV median | … | … | … | n/a | secondary |
| TTFV p95 | … | … | … | n/a | secondary |
| verify-at-24h | … | … | … | n/a | guardrail |
| byok_key_failed rate | … | … | … | n/a | guardrail |
| paid_conversion rate | … | … | … | n/a | downstream |

### Hypothesis check
> *"Deferring email verification until the upgrade attempt lifts TTFV by ~3 min and signup → first-verdict completion by ≥10pp because verification round-trips kill the warm intent window."*

- TTFV lift observed: … min (vs predicted ~3 min). **Confirmed / partial / refuted.**
- Completion-rate lift observed: … pp (vs predicted ≥10 pp). **Confirmed / partial / refuted.**
- Hook's confidence-band assertion in `experiments-backlog.md` (8 min Free TTFV target depends on E-005 winning): **vindicated / requires Verify-test budget revision to 12 min**.

### What Hook learned
- Free-form 5-bullet retrospective. Format: *I expected X. Data showed Y. Therefore Z. Next test: W.*

### Follow-up tests unlocked
- If B wins → E-007 (auto-recommend Managed default; further TTFV optimization) opens its slot at M2.
- If A wins → re-design needed; reserve slot E-016 at M5+30d for "magic-link-only" variant (no password, single click).
- If no-difference → free the slot for E-001 (landing H1 A/B/C) at M5 — TTFV is not the lever.

### Cohort caveat
- M1+30d cohort is a small slice. Full readout at M1+30d AND M2+30d (cumulative) — Hook commits both.

---

## 6. Cross-refs

- `marketing/posthog-flags.md` §2 — operational flag spec
- `marketing/experiments-backlog.md` E-005 row — ICE-scored hypothesis
- `marketing/analytics-spec.md` §2.1–2.3 — event taxonomy this experiment depends on
- `apps/web/tests/integration/funnel-instrumentation.spec.ts` — regression guard that every funnel event fires per variant
- `ia/user-flows/signup-to-first-verdict.md` — flow states under test (S1 → S9)
- `architecture/test-strategy.md` §1 — integration tests are PR-blocking; this experiment's instrumentation cannot drift

---

*E-005 dashboard v1.0. Hook updates the live tables weekly; readout commits at decision time.*
