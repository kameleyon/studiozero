# Studio Zero — KPI Dashboard (PostHog Insights)

**Phase:** 9 M1 Batch 3 — Lens
**Owner:** Lens (Product Analytics) — Growth Layer
**Sign-off:** Comply for the 4 compliance-event KPIs (rows tagged `comply-only`)
**Version:** 0.1
**Status:** Placeholder spec — Lens wires these to PostHog Insights at M2 when
the project DSN lands in Vercel env vars.
**Source of truth:** `marketing/analytics-spec.md` §5 (queries) + PRD §15
(success metrics).

> **Posture.** Each metric below carries the PostHog query string, the
> dashboard cadence, and the alert threshold that pages Watch's beeper. Adding
> a row requires (a) a `marketing/analytics-spec.md` §5 line and (b) Comply
> sign-off when the metric reads any of the 4 exempt events.

---

## How to read this file

For each KPI:

- **Query** — PostHog SQL or Funnel/Insight DSL (Lens normalizes both).
- **Surface** — PostHog Insight slug; the dashboard URL pattern is
  `https://us.posthog.com/project/<sz>/insights/<slug>`.
- **Cadence** — refresh rhythm.
- **Alert** — the threshold whose breach pages Watch.

---

## 1. Acquisition + activation (analytics-spec §5.1)

### 1.1 Landing → signup conversion rate

- **Query (PostHog SQL)**
  ```sql
  SELECT
    countIf(event = 'signup_completed') / countIf(event = 'landing_viewed') AS conv
  FROM events
  WHERE timestamp >= now() - INTERVAL 7 DAY
  ```
- **Surface:** Insight `acq-funnel-7d`
- **Cadence:** daily
- **Alert:** `conv < 0.02` → Watch beeper (channel mix degraded)

### 1.2 Signup → first verdict funnel (the Aha funnel)

- **Query (Funnel insight):**
  Steps: `signup_completed → onboarding_completed → audit_started → verdict_shown`
  Conversion window: **24 h**
- **Surface:** Insight `aha-funnel-24h`
- **Cadence:** daily
- **Alert:** week-over-week drop > 10 pp → Watch beeper

### 1.3 TTFV p50 (median signup → first verdict ms)

- **Query (PostHog SQL)**
  ```sql
  SELECT
    quantile(0.5)(toUInt64OrNull(properties.ttfv_ms)) AS ttfv_p50_ms
  FROM events
  WHERE event = 'verdict_shown'
    AND properties.is_first_verdict_for_user = true
    AND timestamp >= now() - INTERVAL 7 DAY
  ```
- **Surface:** Insight `ttfv-p50-7d` (real-time tile)
- **Cadence:** real-time
- **Alert:** `ttfv_p50_ms > 8 * 60 * 1000` → Watch beeper (Hook BL3)

---

## 2. Audit funnel + quality (analytics-spec §5.2)

### 2.1 Audit completion rate (PRD §15: target > 80%)

- **Query**
  ```sql
  SELECT
    countIf(event = 'audit_completed') / countIf(event = 'audit_started')
  FROM events
  WHERE timestamp >= now() - INTERVAL 7 DAY
    AND properties.depth = 'comprehensive'
  ```
- **Surface:** Insight `audit-completion-rate`
- **Cadence:** daily
- **Alert:** ratio < 0.80 → Watch beeper

### 2.2 First-audit FAIL rate (PRD §15 design lock: ≥ 70%)

- **Query:** rolling 30 d; window by user_id with `min(timestamp) WHERE event='audit_completed'`
- **Surface:** Insight `first-audit-fail-rate-30d`
- **Cadence:** weekly
- **Alert:** `< 0.60` → escalate to Jury (rubric drift); `> 0.85` → Hook (too punishing)

### 2.3 Median 2nd-audit score (target ≥ 70)

- **Query**
  ```sql
  SELECT quantile(0.5)(toUInt8(properties.score))
  FROM events
  WHERE event = 'audit_completed'
    AND toUInt8(properties.audits_in_project) >= 2
  ```
- **Surface:** Insight `median-second-audit-score`
- **Cadence:** weekly
- **Alert:** < 70 → Verify

### 2.4 Re-audit improvement (target avg +20 score pts)

- **Query**
  ```sql
  SELECT avg(toInt32(properties.improvement_delta_points))
  FROM events
  WHERE event = 're_audit_completed' AND timestamp >= now() - INTERVAL 30 DAY
  ```
- **Surface:** Insight `re-audit-improvement-30d`
- **Cadence:** weekly
- **Alert:** < +15 → Hook

---

## 3. Conversion + revenue (analytics-spec §5.3)

### 3.1 25 paying customers in first 60 days

- **Query**
  ```sql
  SELECT count(distinct person_id)
  FROM events
  WHERE event = 'paid_conversion'
    AND timestamp BETWEEN '<M5_launch>' AND '<M5_launch+60d>'
  ```
- **Surface:** Insight `mvp-launch-paying-60d`
- **Cadence:** daily during the 60-d window
- **Alert:** < 12 at day 30 → Penny + Signal war-room

### 3.2 Code-audit upgrade attach (target > 20% in 30 d)

- **Query**
  ```sql
  WITH paid AS (
    SELECT distinct person_id
    FROM events
    WHERE event = 'paid_conversion'
      AND properties.plan_family IN ('byok', 'managed')
  )
  SELECT count(distinct paid.person_id) / count(distinct s.person_id)
  FROM events s
  LEFT JOIN paid USING (person_id)
  WHERE s.event = 'signup_completed' AND s.timestamp >= now() - INTERVAL 30 DAY
  ```
- **Surface:** Insight `free-to-paid-30d`
- **Cadence:** weekly
- **Alert:** < 0.12 → Hook (E2 email failing)

### 3.3 NPS > 30

- **Query**
  ```sql
  SELECT
    (countIf(properties.segment = 'promoter') - countIf(properties.segment = 'detractor'))
    / count() * 100 AS nps
  FROM events
  WHERE event = 'nps_survey_submitted'
    AND timestamp >= now() - INTERVAL 30 DAY
  ```
- **Surface:** Insight `nps-30d`
- **Cadence:** monthly
- **Alert:** < 20 → Compass + Hook

### 3.4 Auto-PR attach > 15% (V1.5)

- **Query**
  ```sql
  SELECT
    countIf(event = 'auto_pr_purchase_completed') /
    count(distinct person_id WHERE properties.tier IN ('managed_pro', 'byok_pro'))
  FROM events
  WHERE timestamp >= now() - INTERVAL 30 DAY
  ```
- **Surface:** Insight `auto-pr-attach-30d`
- **Cadence:** weekly post-V1.5
- **Alert:** < 0.10 → R18 mitigation

---

## 4. R21(c) alpha-pipeline tracker (analytics-spec §5.4)

> **Hard lock.** Managed-tier alpha ≥ 5 paying at M2 close (week 9). Daily
> through week 9 — this is the only gauge whose miss puts cash runway in
> critical.

### 4.1 Alpha-list signups

- **Query**
  ```sql
  SELECT count(distinct person_id)
  FROM events
  WHERE event = 'alpha_list_signup'  -- registry-extension; M0 Lens row
    AND timestamp >= '<campaign_start>'
  ```
- **Surface:** Insight `alpha-list-signups`
- **Cadence:** real-time
- **Alert:** < 20 by week 6 → Signal + Penny + Atlas

### 4.2 Alpha → paying conversion rate

- **Surface:** Insight `alpha-to-managed-paying`
- **Cadence:** weekly
- **Alert:** < 0.25 by week 8 → R21(c) trip-wire

### 4.3 Managed paying count (THE R21(c) gauge)

- **Query**
  ```sql
  SELECT count(distinct person_id)
  FROM events
  WHERE event = 'paid_conversion'
    AND properties.plan_family = 'managed'
    AND timestamp <= '<week_9_close>'
  ```
- **Surface:** Insight `managed-paying-count`
- **Cadence:** **daily through week 9**
- **Alert:** < 5 at week 9 → **HARD GATE FAIL** → escalate to Jo for R21(c) bridge

---

## 5. Per-channel ROI (analytics-spec §6)

For each `utm_source` × week cohort, the dashboard cluster
`signal-channels-dash` surfaces:

| Metric             | Formula                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Signups            | `count(distinct person_id) WHERE event='signup_completed' AND properties.utm_first_touch.source = <ch>` |
| Signup-rate        | signups / `landing_viewed` filtered to same source                                                      |
| Free-to-paid conv. | `paid_conversion ∩ first_touch.source=<ch>` / signups(<ch>)                                             |
| CAC                | channel_spend / paid_conversions(<ch>) — Signal's `channel_costs.csv`                                   |
| 4-week retention   | `weekly_active_session in week+4` / signups(<ch>)                                                       |

Cadence: weekly Monday rollup; per-channel breakdown to Signal Slack thread.

---

## 6. Compliance KPIs — Comply sign-off required

> These five rows read consent-exempt events. The funnel below is the
> demonstrability evidence for GDPR Art. 7(1) and CCPA opt-out — Comply
> reviews + signs off before each row is wired.

| Metric                                                          | Source                                                       | Surface                        | Comply review           |
| --------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ----------------------- |
| Consent acceptance rate `consent_set.status='accepted' / total` | `consent_set`                                                | `consent-rate-30d`             | quarterly               |
| Consent rejection rate                                          | `consent_set.status='rejected'`                              | `consent-rate-30d`             | quarterly               |
| Withdrawal events                                               | `consent_changed.to_status='withdrawn'`                      | `withdrawals-90d`              | quarterly               |
| DNS click → submit conversion                                   | funnel `do_not_sell_clicked → do_not_sell_request_submitted` | `dns-funnel`                   | annual + CA reg refresh |
| DNS-flag count                                                  | `users WHERE do_not_sell=true` (DB, not PostHog)             | server tile in `/admin/comply` | monthly                 |

---

## 7. Wiring milestones

| When                | What                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1 (this batch)** | This file lands as the spec; no Insights created yet. Funnel events fire from the app and are visible in PostHog Live Events for QA.              |
| **M2**              | Lens wires Insights 1.1–3.4 via the PostHog Terraform provider (`infra/posthog/insights.tf`). Comply signs off on the four compliance-event rows. |
| **M3**              | Watch wires alert thresholds to the on-call rotation.                                                                                             |
| **M4**              | NPS + retention rows light up after E1–E5 + day-30 survey are live.                                                                               |
| **M5+60d**          | R21(c) gauge actively monitored; alert routed to Jo's pager.                                                                                      |

---

_End of kpi-dashboard.md v0.1 — Lens, Growth Layer._
_Counts before claims. Alerts before regret._
