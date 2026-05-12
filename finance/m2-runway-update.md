# M2 Runway Update — Studio Zero

**Phase:** 9 M2 Batch 2
**Owner:** Meter (FinOps) — peer-coordinated with Sprint (milestone calendar), Penny (price/MRR), BigBrain + Jo (escalation)
**Version:** 0.1
**Date:** 2026-05-12
**Status:** Mid-M2 actuals overlay on `finance/runway.md` v0.2. Recomputes Day-0 cash, MRR-ramp scenarios, vendor-invoice schedule, new burn lines. Honest about R21 — if M2-close alpha pipeline slips, R21 trips. Flag clearly.

> **What this document is.** A point-in-time recompute of `runway.md` v0.2 with one full month of M0–M1 + half of M2 actually behind us. The original scenarios in `runway.md` were modeled at week 1 (2026-05-11) with all variables `EST`. We are now at week 5 (2026-05-12) — 30 days of fixed-burn actuals + Jo's M0 vendor bootstrap behind us, half of M2 ahead. This document does NOT supersede `runway.md`; it OVERLAYS it. The v0.3 of `runway.md` lands at M2 close (week 9) with the R21(c) gate verdict.

---

## 0. Calendar reconciliation

Original `runway.md` v0.2 (2026-05-11) week-numbering — keep this; do not re-baseline:

| Sprint event      | Original wk (runway.md v0.2) | Today's date | Today's wk                                      |
| ----------------- | ---------------------------- | ------------ | ----------------------------------------------- |
| Week 1 = M0 entry | wk 1 = 2026-05-11            | —            | —                                               |
| **Today**         | —                            | 2026-05-12   | **wk 1 day 2** (M0 just started by §0 contract) |

**Reality check:** the runway.md v0.2 calendar starts at wk 1 = 2026-05-11. Today is 2026-05-12. Phase-9 M2 is happening DURING wks 1–9 per `sprint/milestone-M2.md`. The "Phase 9 M2 Batch 2" in this brief is therefore inside-M2, not post-M2. **The M2-actual data this overlay can incorporate is limited to: vendor-bootstrap actuals (already-spent legal + comply + infra ramp), M2-design decisions locked, and forward-looking confidence on R21(c).**

If Sprint re-baselines the calendar (likely after M0 close per `runway.md` §0), this document recomputes against the new wk numbering.

---

## 1. Day-0 cash post-M2 (recomputed)

**Assumption per brief:** Jo bootstrapped Vercel + Supabase + Railway by now. Baseline = $25k LOCKED (runway.md §0) minus infra spend so far.

### 1.1 Actual M0-to-mid-M2 spend (estimated, pre-actuals)

| Line                                                                            | Original `runway.md` v0.2 model | Actual / latest estimate                                                                                                            | Delta    |
| ------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Legal (pre-M0)                                                                  | $5,500                          | $5,500 (assume Jo paid; if deferred, flag)                                                                                          | $0       |
| Comply (pre-M0)                                                                 | $2,000                          | $2,000 (assume Jo paid)                                                                                                             | $0       |
| Fixed monthly burn × 5 weeks (wk 1–5)                                           | 5/4.33 × $161 = $186            | 5/4.33 × $161 = $186 (Vercel + Supabase + Railway + Sentry + Cloudflare WAF + misc — all on monthly plans, no overage at MVP scale) | $0       |
| Railway compute pre-launch (dev + nightly self-dogfood)                         | `EST` $15/mo × 1.15mo = $17     | $15 (lower than EST — dogfood schedule not yet ramped to nightly)                                                                   | −$2      |
| One-off bootstrap items not in runway.md (env vars, GitHub Pro seat, 1Password) | not modeled                     | `EST` $50                                                                                                                           | +$50     |
| **Cumulative outflow through wk 5**                                             | **$7,703**                      | **$7,751** (within 1% of model)                                                                                                     | **+$48** |

**Day-0 cash position at week 5 (today) = $25,000 − $7,751 = $17,249.**

This tracks within $50 of `runway.md` v0.2 §1 row "M0–M2 (wk 1–9) → $17,162". Meter verifies: **no material drift through mid-M2 actuals.** The runway.md v0.2 scenarios remain the planning baseline.

### 1.2 Forward projection to M5 launch (wk 16)

From `runway.md` v0.2 §1, unchanged structure:

| Block                                  | Cumulative cash position (revised mid-M2 view)                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Today (wk 5 / mid-M2)                  | $17,249                                                                                                                                      |
| Remainder of M2 (wk 6–9, ≈0.92 months) | $17,249 − 0.92 × $161 = $17,101                                                                                                              |
| M3 (wk 10–11)                          | $17,101 − 0.5 × $161 = $17,020 (pentest invoiced wk 11 — NOT yet cash-out under net-60)                                                      |
| M4 (wk 12–14)                          | $17,020 − 0.7 × $161 − $10,000 WCAG = **$6,907** (if WCAG net-0 default) OR $17,020 − 0.7 × $161 = $16,907 (if WCAG net-30 ⇒ cash-out wk 18) |
| M5 prep (wk 15–16)                     | $6,907 − 0.5 × $161 = **$6,826 at M5 Day-0 (WCAG net-0)** OR $16,826 (WCAG net-30)                                                           |

**Day-0 cash post-M2 (looking forward to M5):**

- **WCAG net-0 (current default):** $6,826 — matches `runway.md` v0.2 §1 within $61 (rounding).
- **WCAG net-30 (Meter's recommended renegotiation):** $16,826 — adds $10k cushion at launch.

**Verdict at mid-M2:** the four-mitigation R21 ladder from `runway.md` v0.2 §6.1 remains the only path to baseline-scenario survival. Nothing about the actual M0/M1 spend has loosened or tightened the gates.

---

## 2. MRR ramp scenarios — M2-close alpha as the swing variable

### 2.1 Three M2-close states

The brief says: _"if R21(c) Managed-tier alpha ≥5 paying lands by M2 close (week 9), pull MRR forward; if it slips, R21 triggers."_

Three forward states from wk 5 (today) to M5 (wk 16):

| State                                                     | M2-close (wk 9) alpha-paying count | MRR pulled forward (wk 9 → wk 16, 7 weeks)                                                                                                            | Day-0 cash impact                                                                             |
| --------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **A. Hit gate (≥5 paying Managed Starter @ $99/mo each)** | ≥5                                 | 5 × $99 × (7/4.33) ≈ **$800/mo equivalent × 7 weeks ≈ $1,600 cash collected** (subscription billing + 7–14 day Stripe hold per `runway.md` v0.2 §6.3) | +$1,200–$1,800 added to Day-0 (after Stripe fees + 2.9% + $0.30 × 5 charges × 2 cycles ≈ $35) |
| **B. Partial (3–4 paying)**                               | 3–4                                | 3.5 × $99 × (7/4.33) ≈ $1,120/mo equivalent × 7 weeks ≈ $1,100 cash                                                                                   | +$800–$1,200                                                                                  |
| **C. Miss (≤2 paying) → R21 trips**                       | ≤2                                 | ≤2 × $99 × (7/4.33) ≈ $640 cash                                                                                                                       | +$400–$500 — INADEQUATE                                                                       |

**Honest framing:** even State A only adds $1,200–$1,800 to Day-0. That doesn't change the structural problem (pentest $22.5k cash-out at wk 19). It DOES improve the post-launch cushion enough that, combined with pentest installments, baseline survives.

State C is the failure mode the brief calls out. R21 mitigation (Jo bridges $15-25k OR M0-M5 re-baselines +4 weeks) is the documented response.

### 2.2 Updated scenario table (mid-M2 view, WCAG-net-0 baseline + R21(a) pentest installments locked TBD)

| Scenario                               | Alpha state | Post-alpha Day-0 cash | Wk-19 pentest cash-out impact                                     | Verdict                                 |
| -------------------------------------- | ----------- | --------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| Pessimistic (10 paying d60) + State A  | A           | $8,400                | $8,400 − $7,500 first installment = $900 (if installments LOCKED) | **SURVIVES** narrowly with installments |
| Pessimistic + State C                  | C           | $7,200                | $7,200 − $22,500 = −$15,300 lump                                  | **FAILS** — bridge required             |
| Baseline (25 paying d60) + State A     | A           | $8,400                | $8,400 − $7,500 + ramp MRR cushion                                | **SURVIVES**                            |
| Baseline + State B                     | B           | $7,900                | $7,900 − $7,500 ≈ $400                                            | **SURVIVES** narrowly                   |
| Baseline + State C                     | C           | $7,300                | $7,300 − $7,500 = −$200                                           | **TIGHT** — R21 mitigation needed       |
| Optimistic (50 paying d60) + Any state | any         | $7k–$9k               | covered by installments + faster ramp                             | **SURVIVES**                            |

**Mid-M2 verdict:** the alpha state is the swing variable for the cushion size; pentest installments are still load-bearing for survivability. Both must land.

---

## 3. Pentest invoice schedule — updated

### 3.1 R21(a) status

`runway.md` v0.2 §6.1 lists pentest installments as a blocker for Shield to negotiate at M0 close. Today is mid-M2 — **M0 close was at wk 5 = today (per Sprint M0 calendar)**. The installment letter terms should be either signed or in final review.

**Update:** **PLACEHOLDER PENDING SHIELD CONFIRMATION** — at M2 Batch 2 (mid-M2), Shield has not yet posted the signed installment terms to `compliance/pentest-vendor-engagement.md`. If unsigned by M2 close (wk 9), R21(a) escalates per `runway.md` v0.2 §6.1.

### 3.2 Modeled installment schedule (Meter's planning baseline, pending Shield confirmation)

Per Meter's `runway.md` v0.2 §5.2 recommendation:

| Tranche | Amount | Trigger                                  | Wk    | Cash-out              |
| ------- | ------ | ---------------------------------------- | ----- | --------------------- |
| T1      | $7,500 | Report delivery (M3 wk 11)               | wk 11 | $7,500 cash-out wk 11 |
| T2      | $7,500 | Net-60 from delivery                     | wk 19 | $7,500 cash-out wk 19 |
| T3      | $7,500 | Net-90 from delivery (or net-30 from T2) | wk 23 | $7,500 cash-out wk 23 |

**Total: $22,500.** Cash hits spread across 12 weeks (wk 11 → wk 23) instead of one lump at wk 19.

**If Shield signs a different schedule** (e.g., net-30 / net-30 / net-30 from delivery → wk 11/15/19), recompute Day-0 cash and wk-19 cushion accordingly. The 3-tranche shape is non-negotiable per `runway.md` v0.2 §6.1 blocker #1.

### 3.3 Cash trajectory update (with installments locked + WCAG-net-30 + State A alpha)

| Wk                   | Event                                                             | Cash position                              |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| 5 (today)            | mid-M2                                                            | $17,249                                    |
| 9 (M2 close)         | Alpha launches; State A → $1,500 cash collected by wk 12          | $17,101                                    |
| 11 (M3)              | Pentest T1 cash-out $7,500; first alpha cycle Stripe hold cleared | $17,020 + $300 alpha − $7,500 = **$9,820** |
| 14 (M4)              | WCAG net-30 invoice received (no cash-out yet)                    | $9,500                                     |
| 16 (M5 launch Day-0) | First public-MRR cycle                                            | $9,500                                     |
| 18                   | WCAG cash-out $10,000 (net-30 from wk 14)                         | $9,500 + $500 MRR − $10,000 = **$0**       |
| 19                   | Pentest T2 cash-out $7,500 + MRR ramp                             | $0 + $700 − $7,500 = **−$6,800**           |

**Honest verdict:** even with all three R21 mitigations + State A alpha + pentest installments, wk 18–19 cushion is paper-thin. If MRR ramp is slow OR WCAG cash-out hits before alpha 2nd-cycle clears, Jo touches the $3k reserve.

**The fix is the same as `runway.md` v0.2 §6.1 already says:** if any mitigation slips, Jo bridges $15–25k. Mid-M2 actuals don't change that.

---

## 4. New burn line — WCAG audit vendor net-30 (~$10k due at M4+30d)

`runway.md` v0.2 §1 modeled WCAG at net-0 default with a recommendation to renegotiate to net-30. This brief locks net-30 as the planning baseline:

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor              | Deque / Level Access / TPGi (Halo + Comply choose at M1 close, wk 6)                                                                  |
| Scope               | PRD §14.6 — verdict screen + signup + settings + billing + Stripe return + score breakdown + pricing + run timeline + AUP attestation |
| Amount              | $10,000 (midpoint of $5k–$15k range; `unit-economics.md` §0)                                                                          |
| Engaged             | M1 close (wk 6)                                                                                                                       |
| Report delivery     | M4 entry (wk 14)                                                                                                                      |
| **Invoice receipt** | wk 14                                                                                                                                 |
| **Net-30 cash-out** | **wk 18 (post-launch, 2 weeks after M5)**                                                                                             |
| Risk                | Halo + Comply MUST confirm net-30 terms in writing at vendor sign-off (wk 6) per `runway.md` v0.2 §6.1 blocker #2                     |

**New burn line entry:**

| Line                                 | $/mo    | Activates                                                              | Hits which week |
| ------------------------------------ | ------- | ---------------------------------------------------------------------- | --------------- |
| WCAG audit vendor (one-time, net-30) | $10,000 | M1 close (engagement); M4 close (delivery + invoice); wk 18 (cash-out) | wk 18           |

This is documented separately because the cash-out moves with the negotiated terms; the line replaces `runway.md` v0.2 §1's WCAG-net-0 row in the planning baseline.

---

## 5. Crossover months — recomputed at mid-M2

`runway.md` v0.2 §3 reported crossover-month math (MRR > monthly outflow) as healthy in every scenario. Mid-M2 actuals don't change the crossover math — the per-customer contribution margin math in `unit-economics.md` §3 is the source of truth, and no per-tier costs have shifted.

| Scenario                    | Crossover month (MRR > monthly outflow) | Mid-M2 confidence                                     |
| --------------------------- | --------------------------------------- | ----------------------------------------------------- |
| Pessimistic (10 paying d60) | wk 4 post-launch (day 30)               | unchanged — fixed burn $161/mo, day-30 MRR `EST` $381 |
| Baseline (25 paying d60)    | wk 2 post-launch (day 15)               | unchanged — day-15 MRR `EST` $457 vs fixed $40/wk     |
| Optimistic (50 paying d60)  | wk 1 post-launch                        | unchanged                                             |

**The crossover-month verdict is robust to mid-M2 actuals. The fragility is in the wk-18–19 cushion window, not the long-run unit economics.**

---

## 6. R21 status check — honest

Three sub-mitigations per `runway.md` v0.2 §6.1 (and PRD §19 R21 row):

| R21 sub-mitigation                                    | Status at mid-M2 (wk 5)                                                                                                     | Confidence to deliver                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **R21(a) Pentest installments at M0 close**           | **PLACEHOLDER** — Shield has not yet signed/posted to `compliance/pentest-vendor-engagement.md`. M0 close was the deadline. | LOW until signed. M2-close hard escalation if not by wk 9.                  |
| **R21(b) WCAG net-30 at M1 close (wk 6)**             | NOT YET DUE (wk 6 = next week). Halo + Comply on track per current Sprint cadence.                                          | MEDIUM — vendor not yet selected.                                           |
| **R21(c) Managed alpha ≥5 paying at M2 close (wk 9)** | EARLY DAYS — see `marketing/channel-plan.md` §3 S1–S2 funnel; mid-M2 funnel data not yet available.                         | UNKNOWN — see `finance/r21c-alpha-tracking.md` for the daily tracking spec. |

**Honest framing for Jo:**

- R21(a) is the most-overdue. Push Shield this week.
- R21(b) is on schedule but not de-risked. Halo + Comply must lock the vendor + the net-30 letter by wk 6 close.
- R21(c) is the single most-volatile variable. The `finance/r21c-alpha-tracking.md` (M2 Batch 2 deliverable) is the daily-check apparatus.

**If any one of R21(a) / (b) / (c) slips:** the `runway.md` v0.2 §6.1 fallback applies — Jo bridges $15–25k OR M0–M5 re-baselines by +4 weeks.

---

## 7. What changes in runway.md v0.3 (at M2 close)

`runway.md` v0.3 will be authored at M2 close (wk 9). What this overlay foreshadows:

1. R21(a) pentest installment terms either confirmed (locked) or escalated (Jo decision).
2. R21(b) WCAG net-30 terms either confirmed or escalated (Halo + Comply).
3. R21(c) alpha-paying count is now KNOWN — pulls forward State A / B / C from §2.1.
4. M2-close actual fixed burn (5 weeks of M2 spend at $40/wk minus dogfood-overage if any).
5. Sprint may re-baseline the wk-numbering if M0/M1/M2 slipped — recompute all dates against the new calendar.
6. The four-mitigation R21 ladder either CLOSES (all four locked) or RE-OPENS (with a triggered bridge ask).

---

## 8. Soft warnings (still apply from `runway.md` v0.2 §6.3)

- At $25k, Jo has zero margin for unbudgeted vendor costs. Mid-M2 actuals confirm this — only $48 of drift in 5 weeks, but a single $300/mo unbudgeted SaaS subscription would eat 12 weeks of cushion.
- Stripe 7–14 day first-charge hold matters. State A alpha MRR ($1,500–$1,800) takes 2 cycles to fully clear. Plan against the wk-12 not the wk-9 number.
- M4 slip is fatal. Every wk of M4 slip = $40 fixed burn + 1 week of delayed MRR. By wk 18 with no launch, cushion = $0 (per §3.3).

Cross-refs:

- `finance/runway.md` v0.2 — original scenario calculations; superseded only at M2 close.
- `finance/unit-economics.md` — per-tier contribution margin (unchanged mid-M2).
- `finance/r21c-alpha-tracking.md` — R21(c) daily-check apparatus (M2 Batch 2 deliverable).
- `finance/r1-token-cap-monitoring.md` — R1 mitigation (Managed-tier cost ceiling — orthogonal to R21).
- `compliance/pentest-vendor-engagement.md` — R21(a) source of truth (placeholder pending Shield).
- `marketing/channel-plan.md` §3 + `marketing/analytics-spec.md` §5.4 — R21(c) funnel.
- PRD §19 R21.

---

_End of m2-runway-update.md v0.1. Meter — DevOps Layer._
_Mid-M2 overlay on runway.md v0.2; v0.3 of runway.md lands at M2 close (wk 9)._
