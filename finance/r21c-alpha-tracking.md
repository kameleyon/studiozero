# R21(c) Managed Alpha Tracking — Studio Zero

**Phase:** 9 M2 Batch 2
**Owner:** Meter (FinOps — owns the tracking apparatus + escalation triggers); Signal (channel reach); Lens (PostHog events); Penny (price-reveal in 1:1); Watch on-call (weekly progress.json updates); Jo + BigBrain (escalation decisions).
**Version:** 0.1
**Date:** 2026-05-12
**Status:** First-cut tracking spec for R21(c) — the single load-bearing PRD §19 mitigation whose miss puts cash runway in critical. Daily check from week 6 onward; daily check from week 8 onward (8 → 9 hard-gate week).

> **Reader contract.** This document defines (a) the funnel stages with single-owner attribution; (b) the escalation triggers + their thresholds; (c) the weekly `r21c-progress.json` template that Watch on-call updates; (d) the data sources that feed each stage. Cross-ref `marketing/channel-plan.md` §3 + §6 (funnel + escalation triggers — Signal owns the channel side); `marketing/analytics-spec.md` §5.4 (PostHog insights). This document is the **Meter-side tracker** — the FinOps view of the same funnel, with cash-impact mapping.

---

## 0. The hard gate

PRD §19 R21 row: **≥ 5 paying Managed-tier customers by M2 close (week 9). If miss → R21 triggers (Jo bridges $15–25k OR M0–M5 re-baselines by +4 weeks).**

This document tracks progress toward that gate from week 5 (today) to week 9.

---

## 1. Funnel stages (per `marketing/channel-plan.md` §3, with Meter cash mapping)

| Stage                              | Lens event                                                                    | Source                                    | Cash-mapping per signup/conversion             | Hard-gate threshold (M2 close)     |
| ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| **S0 — Build-in-public reach**     | `posthog page_view` on owned channels + `external_share_recorded`             | X / IndieHackers / Hacker News inbound    | $0 (cost is time-only at MVP)                  | n/a — leading indicator            |
| **S1 — Reach**                     | aggregated impressions across channels                                        | Signal channel dashboards (cross-channel) | $0                                             | n/a                                |
| **S2 — Alpha-list signup**         | `alpha_list_signup` (Lens adds at M0 per `marketing/analytics-spec.md` §5.4)  | Form on `/managed-alpha` landing page     | $0 (lead capture; no charge)                   | ≥ 20 signups by wk 7.5             |
| **S3 — Paying Managed conversion** | `paid_conversion` with `plan_family = 'managed'` AND `is_alpha_cohort = true` | Stripe webhook → DB → PostHog             | $99 (Starter) or $249 (Pro) MRR per conversion | **≥ 5 paying by wk 9 — HARD GATE** |

### 1.1 The `is_alpha_cohort` property

Lens to add to `apps/web/lib/analytics-events.v1.ts` `paid_conversion` event:

```ts
paid_conversion: {
  // existing properties from analytics-spec.md §5.4 line 148
  tier: '...',
  mode: '...',
  currency: '...',
  amount_cents: number,
  plan_family: 'byok' | 'managed' | 'cli',
  utm_first_touch: string,
  utm_last_touch: string,
  days_since_signup: number,
  audits_before_conversion: number,
  // NEW for R21(c) — Meter owns the semantic
  is_alpha_cohort: boolean,  // true iff:
    //   (1) user_id was emitted from alpha_list_signup before paid_conversion
    //   (2) paid_conversion.timestamp <= <wk_9_close>
    //   (3) tenant.plan_family = 'managed'
}
```

The `is_alpha_cohort` boolean is computed server-side at the `paid_conversion` fire site (Lens's UTM-attribution module handles the join). NO raw `tenant_id` exposed to PostHog — `tenant_hash` is the only cross-trust-boundary identifier (Cipher Fix-3b).

---

## 2. Cadence & owners

### 2.1 Weekly cadence (wk 5 → wk 6)

| What                         | Owner         | Cadence                    | Channel                                                                       |
| ---------------------------- | ------------- | -------------------------- | ----------------------------------------------------------------------------- |
| S0/S1 reach digest           | Signal        | Weekly Friday              | Posted to internal Discord `#growth`                                          |
| S2 alpha-list count          | Lens          | Weekly Friday              | PostHog Insight `alpha-list-signups` (per `marketing/analytics-spec.md` §5.4) |
| S3 paying count              | Meter         | Weekly Friday              | Pulled from `subscriptions` table; cross-referenced with Stripe               |
| Roll-up `r21c-progress.json` | Watch on-call | Weekly Friday by 18:00 UTC | Committed to repo at `finance/r21c-progress.json`                             |

### 2.2 Daily cadence (wk 6 → wk 9)

Starting **wk 6 = 2026-06-15** (or per Sprint-locked calendar; recompute if calendar slips):

| What                                  | Owner         | Cadence         | Channel                                             |
| ------------------------------------- | ------------- | --------------- | --------------------------------------------------- |
| S2 alpha-list count (real-time check) | Watch on-call | Daily 09:00 UTC | PostHog Insight; updates `r21c-progress.json` daily |
| S3 paying count                       | Watch on-call | Daily 09:00 UTC | Stripe + DB query (see §4)                          |

### 2.3 Hyper-daily cadence (wk 8 → wk 9)

Starting **wk 8 = 2026-06-29** through **wk 9 close = 2026-07-06** — the M2 hard-gate week:

| What                           | Owner                  | Cadence                                       | Channel                                                 |
| ------------------------------ | ---------------------- | --------------------------------------------- | ------------------------------------------------------- |
| All four funnel stages (S0–S3) | Watch on-call          | Daily 09:00 UTC AND 18:00 UTC (two ticks/day) | `r21c-progress.json`                                    |
| Escalation status check        | Meter + Signal + Penny | Daily 17:00 UTC standup                       | Async Discord post + sync if any stage missed threshold |
| Jo notification                | BigBrain               | Daily by EOD if S3 < 5 with 48h to gate close | Direct                                                  |

---

## 3. Escalation triggers (per `marketing/channel-plan.md` §6 — Meter mirror)

These mirror `marketing/channel-plan.md` §6 with the cash-impact view:

| Trigger                                                     | Threshold                            | Wk     | Cash-impact framing                                                      | Action                                                                                                                                                     | Owner                                                           |
| ----------------------------------------------------------- | ------------------------------------ | ------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Reach < 50% of target**                                   | < 5,000 cross-channel impressions/wk | wk 6   | Top-of-funnel starvation → S2/S3 starvation → R21 trips → $15–25k bridge | Owned channels +1 cadence (Hook E-pre-alpha A/B variant; HN Show post slot; X build-in-public daily)                                                       | Signal + Hook + Penny                                           |
| **Alpha-list < 50% of target**                              | < 10 signups (vs target 20)          | wk 7.5 | Mid-funnel starvation → S3 < 5 → R21 trips                               | Jo's 1:1 outreach to 20 dev-Twitter accounts; tighten alpha-list CTA copy (Hook A/B); re-target SEO topic queue (Lens)                                     | Jo + Signal + Hook + Lens                                       |
| **Paying < 5 at gate close**                                | < 5 paying Managed @ wk 9 close      | wk 9   | **HARD GATE FAIL** → R21 triggers                                        | BigBrain escalates to Jo same-day; Jo decides: (a) bridge $15-25k friends-family OR (b) M0-M5 re-baselines +4 weeks. Per `runway.md` v0.2 §6.1 blocker #3. | BigBrain + Jo (decision); Penny + Meter (cash-impact recompute) |
| **Drift between Stripe webhook and `is_alpha_cohort` flag** | any                                  | any    | Data-quality risk on the gate-check                                      | Lens + Meter join Stripe webhook log vs PostHog event log; rectify within 24h                                                                              | Lens + Meter                                                    |

---

## 4. Data sources (single-owner per stage)

### 4.1 S2 alpha-list signups (Lens-owned)

```sql
-- PostHog HogQL (per marketing/analytics-spec.md §5.4)
SELECT
  count(DISTINCT person_id) AS alpha_list_signups,
  count(DISTINCT person_id FILTER (timestamp >= now() - interval '7 days')) AS last_7d,
  count(DISTINCT person_id FILTER (timestamp >= today())) AS today
FROM events
WHERE event = 'alpha_list_signup'
  AND timestamp >= '<wk_5_start>';
```

### 4.2 S3 paying conversions (Meter-owned)

```sql
-- Supabase service-role SQL
SELECT
  COUNT(DISTINCT s.tenant_id) AS managed_paying_count,
  COUNT(DISTINCT s.tenant_id) FILTER (WHERE s.created_at >= now() - interval '7 days') AS last_7d,
  COUNT(DISTINCT s.tenant_id) FILTER (WHERE s.created_at >= current_date) AS today,
  SUM(s.unit_amount_cents) / 100.0 AS mrr_pulled_forward_usd
FROM subscriptions s
WHERE s.status      = 'active'
  AND s.plan_family = 'managed'
  AND s.created_at >= '<wk_5_start>'
  AND s.created_at <= '<wk_9_close>';
```

### 4.3 Cross-check: PostHog `is_alpha_cohort` vs Stripe `subscriptions`

```sql
-- Run nightly during wk 6 → wk 9. Any drift > 1 row = Meter alert.
-- Compare the count from:
--   (A) Stripe subscriptions: managed plan_family + alpha-window timestamps
--   (B) PostHog paid_conversion: plan_family='managed' AND is_alpha_cohort=true
-- Drift = data-quality bug somewhere. Cannot be the gate verdict source-of-truth.
-- Lens + Meter rectify within 24h of drift.
```

---

## 5. `r21c-progress.json` template

Watch on-call updates this file daily (wk 6 →) and commits to repo. Single source of truth for the gate status across the team.

```json
{
  "schema_version": "1.0",
  "last_updated": "2026-MM-DDTHH:MM:SSZ",
  "updated_by": "<watch_oncall_handle>",
  "current_week": 5,
  "wk_9_gate_threshold": 5,
  "wk_9_gate_target_band": "5-10",
  "stages": {
    "S0_reach": {
      "this_week_impressions": null,
      "cumulative_wk5_to_now": null,
      "trend": null,
      "owner": "Signal",
      "data_source": "channel_dashboards",
      "comment": ""
    },
    "S2_alpha_list_signups": {
      "cumulative_signups": null,
      "this_week_signups": null,
      "today_signups": null,
      "wk75_threshold": 10,
      "wk75_status": "pending",
      "owner": "Lens",
      "data_source": "PostHog Insight alpha-list-signups",
      "comment": ""
    },
    "S3_paying_managed": {
      "cumulative_paying": null,
      "this_week_paying": null,
      "today_paying": null,
      "wk9_threshold": 5,
      "wk9_status": "pending",
      "mrr_pulled_forward_usd": null,
      "owner": "Meter",
      "data_source": "subscriptions table + Stripe webhook",
      "comment": ""
    }
  },
  "escalations_active": [],
  "next_escalation_check": "2026-MM-DDTHH:MM:SSZ",
  "verdict_at_wk9_close": "pending",
  "verdict_rationale": ""
}
```

**Update procedure:**

1. Watch on-call pulls the three SQL/HogQL queries from §4.
2. Updates the JSON with values + timestamp + handle.
3. If any stage crosses an escalation threshold (per §3), populates `escalations_active` with the trigger name and pages the appropriate owner per the §3 table.
4. Commits to repo with message `chore(finops): R21(c) progress wk<N> day<M>` — short conventional commit per Meter user-pref.

**File location:** `finance/r21c-progress.json` (Watch on-call commits weekly through wk 5, daily wk 6→).

---

## 6. The Penny + Meter escalation handoff

When Trigger #3 fires (paying < 5 at gate close), the Penny + Meter cash-impact recompute runs immediately:

1. **Meter recomputes Day-0 cash + wk-19 cushion** under the actual paying count (State A/B/C from `m2-runway-update.md` §2.1).
2. **Penny recomputes** whether dropping the $99 Managed Starter to a temporary $69 or $79 alpha-promo would close the gap in the 2-week window (wks 10–11) before pentest cash-out. PRD §12 Penny revisit clause applies.
3. **Joint memo to Jo within 6 hours** of trigger fire, with three options:
   - (a) bridge $15–25k from friends-family / personal credit
   - (b) M0–M5 re-baselines +4 weeks (slip the launch, give R21(c) two more weeks to land)
   - (c) hybrid: small bridge ($10k) + 2-week launch slip + price drop (deepens R21(c) at cost of margin)
4. **Jo signs off** on the chosen path. R21 row in PRD §19 + `sprint/owner-matrix.md` updates accordingly.

---

## 7. Anti-checklist — what NOT to do

1. **DO NOT update `r21c-progress.json`** with `verdict_at_wk9_close` until wk 9 = closed (Saturday EOD UTC). Pre-mature verdict closes the trigger window early.
2. **DO NOT raw-share `tenant_id` of alpha signups** in any chat/email/dashboard. Use `tenant_hash`. Penny's 1:1 onboarding calls happen inside the Supabase admin tool only.
3. **DO NOT lower the gate threshold to "5 alpha-list signups"** to manufacture a pass. The PRD §19 R21 row explicitly says **paying** Managed-tier ≥ 5. Funnel-to-paying conversion is the load-bearing math.
4. **DO NOT count BYOK conversions toward R21(c).** Only `plan_family = 'managed'` AND `is_alpha_cohort = true` count. BYOK customers are valuable but they don't help the cash bridge (BYOK customers pay Anthropic; Jo sees only $29–$79 MRR per BYOK vs $99–$249 per Managed).
5. **DO NOT delay the daily check** in wk 8–9. The hyper-daily cadence is the alarm system; pause it and the wk-9 close becomes a surprise.

---

## 8. M2-close transition (wk 9)

At wk 9 close:

1. Watch on-call finalizes `r21c-progress.json` with the verdict (pass / partial / fail).
2. `verdict_at_wk9_close` is written by Meter (NOT Watch on-call — Meter owns the gate semantics).
3. `verdict_rationale` includes paying count, MRR pulled forward, and any escalation lineage.
4. `runway.md` v0.3 is authored by Meter incorporating the gate verdict (see `m2-runway-update.md` §7).
5. If FAIL: PRD §19 R21 row gets an annotation; `sprint/owner-matrix.md` R21 closes one mitigation path and opens the bridge/re-baseline path; Jo's decision is recorded.

Cross-refs:

- `finance/m2-runway-update.md` §2, §6 — cash-impact mapping of alpha state A/B/C.
- `finance/runway.md` v0.2 §6.1 blocker #3 — R21(c) as one of the four mandatory mitigations.
- `marketing/channel-plan.md` §3, §6 — Signal-side funnel + escalation triggers (cross-mirrored here).
- `marketing/analytics-spec.md` §5.4 — Lens-side metric definitions.
- `apps/web/lib/analytics-events.v1.ts` — Lens adds `is_alpha_cohort` boolean here.
- `apps/web/lib/analytics-gate.ts:143-203` — Cipher Fix-3b tenant_hash that ALL stages use.
- PRD §19 R21 row.

---

_End of r21c-alpha-tracking.md v0.1. Meter — DevOps Layer._
_Template `r21c-progress.json` to be initialized by Watch on-call at wk 6 start._
