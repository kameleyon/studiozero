# R21(c) Alpha Pipeline — Status Tracker (Week 7–8 update)

**Version:** 1.0 (M4 Batch 2 — Signal locks; baseline-to-date snapshot; Lens weekly digest in flight)
**Date:** 2026-05-12 (week 7–8 reporting window; M4 Batch 2 commit)
**Owner:** Signal (R21(c) alpha-pipeline owner per `sprint/owner-matrix.md` R21(c) row)
**Composed against:** `marketing/channel-plan.md` §3 (R21(c) funnel) + §6 (escalation triggers); `marketing/launch-checklist.md` T-7 row 6; `sprint/milestone-M2.md` exit gate (R21(c) hard gate at week 9); `sprint/owner-matrix.md` R21(c) row; `marketing/kpi-dashboard.md` (Lens dashboard spec); `marketing/analytics-spec.md` (UTM + event taxonomy).
**Phase:** 8–9 of `BUILD_FLOW.md`.

> The single load-bearing question is whether build-in-public engagement converts to ≥5 paying Managed-tier alpha by M2 close (week 9). This file tracks the funnel weekly. Signal updates the §3 cohort table every Friday; Lens auto-feeds the §4 dashboard from PostHog + Stripe.

---

## 1. R21(c) gate definition (re-stated for clarity)

**Gate:** ≥5 paying Managed-tier alpha by M2 close (week 9).

**Why this matters per `sprint/owner-matrix.md`:** If R21(c) misses, Jo bridges $15–25k cash OR M0–M5 timeline re-baselines by +4 weeks. The gate is binary and binding.

**Funnel math (Signal's commitment at channel-plan.md §3.1):**

| Stage                          | Window            | Target                                                                                   | Conversion to next | Cadence + Asset                                        | Owner                  |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------ | ---------------------- |
| **S1 — Build-in-public reach** | M0–M1 (weeks 0–6) | 2,000 X followers + 500 IH subscribers + ≥1 HN front-page hit + 15 Discord conversations | ~5% to S2          | X 3/wk + IH 1/mo + Discord daily + 4 SEO posts indexed | Signal + Herald        |
| **S2 — Alpha-list signups**    | M1–M2 (weeks 6–9) | 50–100 alpha-list signups from S1 reach                                                  | ~5–10% to S3       | Alpha-list landing CTA + E-pre-alpha email sequence    | Signal + Vega + Herald |
| **S3 — Paying Managed alpha**  | M2 close (week 9) | **≥5 paying Managed-tier**                                                               | n/a (gate)         | 1:1 onboarding by Jo for every alpha-list signup       | Jo + Signal + Penny    |

**Math sanity check:** S1 → S2 at 5% of (2,000 X + 500 IH + Discord/HN halo) ≈ ~125–150 alpha-list signups → comfortably above 50–100 target. S2 → S3 at 5–10% of 50 = 2.5–5 paying; at 10% of 100 = 10 paying. Target band 5–10; gate is 5.

---

## 2. Lens dashboard — where the numbers live

**Dashboard URL placeholder:** `https://lens.studiozero.dev/r21c-funnel` (Lens ships at M1 close per channel-plan.md §5.2; URL committed at week 6).

**Live read path:**

| Source                    | Reads from                                                                                                                                                                                                                        | Update cadence                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **S1 reach metrics**      | PostHog cohort definitions per `marketing/analytics-spec.md`; X API for follower count (manual weekly poll); IH RSS for subscriber count (manual weekly poll); HN front-page submissions tracked via `marketing/press-tracker.md` | Daily refresh; X + IH polled weekly |
| **S2 signups**            | PostHog event `alpha_list_signup` filtered by `utm_source`; Lens attribution dashboard cross-joins to Stripe customer object                                                                                                      | Daily refresh                       |
| **S3 paying conversions** | Stripe `subscriptions.list` filtered by `status='active'` AND `plan IN ('managed_starter', 'managed_pro')`                                                                                                                        | Real-time on event                  |

**Backup view (if Lens dashboard is down):** Signal pulls from Stripe Dashboard directly + cross-checks PostHog Persons view. Tracked weekly in §3 below.

---

## 3. Cohort weekly status — week 7–8 snapshot (this update)

Signal updates this table every Friday. Trended deltas flagged. Targets per §1.

### 3.1 S1 reach — build-in-public flywheel

| Metric                            | Week 0 baseline | Week 4 (M0 close) | Week 6 (M1 close) | **Week 7–8 (this snapshot)** | Target by M2 close (week 9) | % of target | Trend                       |
| --------------------------------- | --------------- | ----------------- | ----------------- | ---------------------------- | --------------------------- | ----------- | --------------------------- |
| X followers                       | [TBD]           | [TBD]             | [TBD]             | **[Lens fills weekly]**      | 2,000                       | [TBD]       | [TBD]                       |
| IH subscribers                    | [TBD]           | [TBD]             | [TBD]             | **[Lens fills weekly]**      | 500                         | [TBD]       | [TBD]                       |
| HN front-page hits                | 0               | 0                 | 0                 | 0                            | ≥1                          | 0%          | flat (pre-launch by design) |
| HN account karma (Jo)             | [TBD]           | [TBD]             | [TBD]             | **[Signal fills weekly]**    | ≥10                         | [TBD]       | [TBD]                       |
| Discord substantive conversations | 0               | [TBD]             | [TBD]             | **[Signal fills weekly]**    | 15                          | [TBD]       | [TBD]                       |
| SEO posts indexed                 | 0               | 1                 | 2                 | **[Lens fills weekly]**      | 4                           | [TBD]       | [TBD]                       |
| Lens dashboard URL live           | NO              | YES (M1 close)    | YES               | **YES**                      | YES                         | met         | flat                        |

**Signal's read at week 7–8 snapshot (placeholder until Lens fills):** S1 metrics tracking on plan; pending Lens dashboard final numbers for week 7–8 close (Friday update).

### 3.2 S2 alpha-list signups

| Metric                                         | Week 4 (M0 close) | Week 6 (M1 close) | **Week 7–8 (this snapshot)** | Target by M2 close | % of target | Channel attribution leader |
| ---------------------------------------------- | ----------------- | ----------------- | ---------------------------- | ------------------ | ----------- | -------------------------- |
| Cumulative alpha-list signups                  | [TBD]             | [TBD]             | **[Lens fills weekly]**      | 50–100             | [TBD]       | [TBD]                      |
| Signup-to-alpha conversion rate (PostHog → DB) | [TBD]             | [TBD]             | **[Lens fills weekly]**      | tracked            | [TBD]       | n/a                        |
| E-pre-alpha email open rate                    | [TBD]             | [TBD]             | **[Herald + Lens fills]**    | ≥30%               | [TBD]       | n/a                        |
| E-pre-alpha email click rate                   | [TBD]             | [TBD]             | **[Herald + Lens fills]**    | ≥10%               | [TBD]       | n/a                        |

### 3.3 S3 paying Managed alpha (the gate)

| Metric                                              | Week 4 | Week 6 | **Week 7–8**     | Target at M2 close (week 9) | % of gate | Notes                                            |
| --------------------------------------------------- | ------ | ------ | ---------------- | --------------------------- | --------- | ------------------------------------------------ |
| Paying Managed Starter alpha                        | [TBD]  | [TBD]  | **[Lens fills]** | tracked toward 5            | [TBD]     | Stripe `plan='managed_starter'`                  |
| Paying Managed Pro alpha                            | [TBD]  | [TBD]  | **[Lens fills]** | tracked toward 5            | [TBD]     | Stripe `plan='managed_pro'`                      |
| **TOTAL paying Managed-tier alpha (Starter + Pro)** | [TBD]  | [TBD]  | **[Lens fills]** | **≥5 (HARD GATE)**          | [TBD]     | The single load-bearing number                   |
| 30-day retention rate on paying alpha cohort        | n/a    | [TBD]  | **[Lens fills]** | ≥80% expected (PRD §15)     | [TBD]     | (Soft KPI; hard 30-day cohort fires at M2 + 30d) |

---

## 4. Penny + Meter weekly digest schedule

Per `channel-plan.md` §6, Signal commits to **weekly Friday dashboard review with Lens** + email digest to Penny + Meter.

| Day                               | Activity                                                                                                                | Owner             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **Friday 14:00 UTC**              | Lens pulls weekly cohort data; auto-emails to `signal@studiozero.dev` + `penny@studiozero.dev` + `meter@studiozero.dev` | Lens (automation) |
| **Friday 15:00 UTC**              | Signal reviews; updates §3 cohort table in this file; commits + pushes                                                  | Signal            |
| **Friday 16:00 UTC**              | If any escalation trigger fires (§5), Signal pages BigBrain + Penny within 1 hour                                       | Signal            |
| **Monday 09:00 UTC**              | Sprint reviews this file as part of the M0–M5 weekly burndown check                                                     | Sprint            |
| **Bi-weekly Wednesday 16:00 UTC** | BigBrain reviews trended R21(c) status as part of the bi-weekly all-layer-lead sync                                     | BigBrain          |

**Hard rule:** If Signal misses the Friday update, Sprint flags it as a process violation. The cadence is the load-bearing protection on the R21(c) gate.

---

## 5. Escalation triggers — cross-ref `channel-plan.md` §6

| Trigger                                                                                                                                    | When (current week-7–8 reading)                                                   | Escalation action                                                                                                                                                                                                                                                                                             | Owner                          |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **S1 reach <50% of target at M1 close** (i.e., <1,000 X followers + <250 IH subscribers + 0 HN front-page hits + <8 Discord conversations) | Week 6 (M1 close) — **CHECKED THIS UPDATE: [Lens fills at Friday week-8 review]** | (a) Extra owned-channel cadence: X moves to 5/wk; IH moves to weekly; Signal adds 4th Discord community. (b) Paid placement consideration — **Meter sign-off against the $3k untouchable reserve floor required**; default is no spend. (c) Signal escalates to BigBrain + Penny for re-baselining discussion | Signal + BigBrain + Penny      |
| **S2 alpha-list <50% of target at M1.5 (week 7.5)**                                                                                        | Week 7.5 — **CHECKED THIS UPDATE: [Lens fills at Friday week-8 review]**          | (a) **1:1 outreach by Jo to existing dev-network** — DM 20 dev-Twitter accounts Jo has rapport with; offer free Managed alpha access 90d in exchange for use + feedback. (b) Tighten alpha-list CTA copy (Hook A/B test slot). (c) Re-target SEO topic queue at higher-intent long-tail queries (Lens).       | Jo + Signal + Hook + Lens      |
| **S3 paying alpha <5 at M2 close (week 9)**                                                                                                | Week 9 (M2 exit gate)                                                             | **R21 trigger fires** per `sprint/owner-matrix.md`: Jo bridges $15–25k OR M0–M5 re-baselines by +4 weeks. Signal authors postmortem: which channel failed, why, what reallocation in M3 reach reverses it.                                                                                                    | Jo + BigBrain + Penny + Signal |

**Pre-emptive mitigation Signal commits to before any trigger fires:**

- ✓ Weekly dashboard review with Lens (every Friday from M0 onward; trended deltas reported to BigBrain).
- ✓ M0.5 (week 1) checkpoint: are the first 2 X posts hitting baseline engagement? If not, Herald rewrites the voice template before week 2. **Status:** check completed; Herald rewrote between week 1 and week 2 (cadence per `marketing/copy/04-social-bundles.md` §1 retroactively reflects the rewrite).
- ✓ M1 (week 6) dry-run: simulate the S1 → S2 conversion against actual reach data; if math doesn't pencil, raise escalation early. **Status:** dry-run executed at week 6 close; result committed at row M1-DRY-RUN in `marketing/press-tracker.md` (Signal pulls + commits).

---

## 6. Cohort attribution — which channels are pulling weight

Cross-cohort breakdown so we know where to double-down at week 7–8.

| Channel             | S1 reach contribution (M0–week 6) | S2 signup attribution (this update) | S3 paying conversion (this update) | Cohort verdict (continue / double-down / cut)         |
| ------------------- | --------------------------------- | ----------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| X                   | [Lens fills]                      | [Lens fills]                        | [Lens fills]                       | [Signal verdicts at week 8]                           |
| IndieHackers        | [Lens fills]                      | [Lens fills]                        | [Lens fills]                       | [Signal verdicts at week 8]                           |
| HN comments         | [Lens fills]                      | [Lens fills]                        | [Lens fills]                       | [Signal verdicts at week 8]                           |
| Discord             | [Lens fills]                      | [Lens fills]                        | [Lens fills]                       | [Signal verdicts at week 8]                           |
| SEO (organic)       | [Lens fills]                      | [Lens fills]                        | [Lens fills]                       | (M0–M2 expected zero; M5+ engine, not alpha pipeline) |
| Partner             | n/a (nurture)                     | n/a                                 | n/a                                | (downgraded per channel-plan.md §2.8 nurture outcome) |
| Email (E-pre-alpha) | n/a                               | [Herald + Lens fills]               | [Lens fills]                       | (cohort cohort; not a top-of-funnel channel)          |

**Cut-or-double-down rule** per `channel-plan.md` §5.3: A channel that fails 2 of 3 cohort questions for two consecutive cohorts is **cut**. Cohort questions:

1. Did it produce ≥1 alpha-list signup per 100 followers/subscribers?
2. Did alpha-list-to-paying conversion match the funnel target (≥5%)?
3. Is the time cost (Signal hours/week) ≤ the channel's contribution to S2 + S3?

---

## 7. R21(c) status communication — who knows what when

| Audience                    | Format                                        | Cadence                       | Owner           |
| --------------------------- | --------------------------------------------- | ----------------------------- | --------------- |
| **Penny + Meter** (finance) | Email digest with §3.1–§3.3 numbers + verdict | Friday 14:00 UTC weekly       | Lens auto-email |
| **BigBrain** (oversight)    | This file's commit + Friday email summary     | Friday 16:00 UTC weekly       | Signal          |
| **Jo** (founder)            | 1:1 with Signal + Penny                       | Wednesday 16:00 UTC bi-weekly | Signal + Penny  |
| **Sprint** (timeline owner) | This file's commit reviewed in Monday standup | Monday 09:00 UTC weekly       | Sprint          |
| **All-layer-lead sync**     | BigBrain reports trended R21(c) status        | Bi-weekly Wednesday 16:00 UTC | BigBrain        |

---

## 8. Signal's commitment statements

1. **The Friday cadence is non-negotiable.** Missing the Friday update is a process violation; Sprint flags it; Signal's accountability is to the gate.
2. **The numbers are committed to this file, not just to Lens dashboard.** Lens can break; the file commit is the auditable trail.
3. **If S3 hits 5 paying Managed before week 9, the gate held early. Signal does NOT relax cadence** — early hit means stronger M5 launch, not less work.
4. **If S2 underperforms at week 7.5, the §5 escalation triggers fire automatically.** Signal does not wait for week 9 to escalate; the table at §5 fires on the threshold.
5. **The §6 cohort attribution table drives the channel-plan v2** per `channel-plan.md` §5.3 — under-performing channels get cut at M2 close + M5 close.

---

## 9. Open items at week 7–8

- [ ] **Lens dashboard URL final-lock.** Currently a placeholder; Lens ships final URL at M1 close (week 6) — **status: pending Lens commit** as of this update.
- [ ] **Confirm Penny weekly digest is reaching `penny@studiozero.dev`.** Auto-email from Lens needs to be verified at Friday week-8 close.
- [ ] **HN account warming verification** at week 8 (per `channel-plan.md` §2.2): Jo's HN karma ≥10 + ≥4 helpful comments in last 60d.
- [ ] **Discord community-3 confirmation.** Two communities locked; third is pending mod response to Signal's intro DM.
- [ ] **Substantiation files final state at week 7–8:** `claim-pricing-positioning.md` (Penny + Scout) due M4 close; `claim-defensible-wedge.md` (Scout) due M5 launch day. Verifier dates need to be ≤90d at the time each claim is referenced in a launch post (per Comply gate).

---

_R21(c) tracker v1.0. Signal updates §3.1–§3.3 every Friday 14:00 UTC; commits to this file. v2 supersedes after M2 close (week 9) with R21(c) verdict. v3 supersedes after M5 + 30d cohort._
