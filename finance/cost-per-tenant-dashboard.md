# Cost-per-Tenant Dashboard — Studio Zero

**Phase:** 9 M2 Batch 2
**Owner:** Meter (FinOps) — peer-coordinated with Lens (PostHog Insights), Atlas (SQL surfaces), Penny (tier-margin reconciliation)
**Version:** 0.1
**Date:** 2026-05-12
**Status:** First-cut spec. Source data: `tenant_token_usage_daily` (Atlas 0003 §C, live), `subscriptions` (Atlas 0003 §B, live), `audit_logs` action='llm_call' (Forge gateway, live), PostHog `paid_conversion` + `signup_completed` events (`marketing/analytics-spec.md`, live).

> **Reader contract.** This is the FinOps single pane of glass. Every query below either (a) runs against Supabase SQL with service-role and stays inside the platform, OR (b) ships hashed payloads to PostHog/external dashboards. Per-tenant data NEVER leaves raw — `tenant_hash` (Cipher Fix-3b, `apps/web/lib/analytics-gate.ts:143-203`) is the only identifier crossing the trust boundary.

---

## 0. What this dashboard answers

Six questions, in priority order:

1. **Per-tier average tokens-per-audit (input + output split)** — calibration of `unit-economics.md` §2 COGS model against reality. If real tokens drift >25% from modeled, COGS sensitivity (`unit-economics.md` §3.4 Managed Starter at 500k / 1M tokens) escalates.
2. **Per-tier audit-cost-COGS rolling-7d** — the daily margin pulse. Penny's tier prices are defensible only if this stays inside the §3 envelope.
3. **Per-tenant breach-of-cap alerts (24h)** — the R1 enforcement audit trail. Cross-ref `finance/r1-token-cap-monitoring.md` §3.
4. **Margin tracking per Penny tier** — cross-ref `unit-economics.md` §3 contribution margins. Meter's exit-gate test.
5. **LTV/CAC per acquisition channel** — cross-ref `unit-economics.md` §5 + `marketing/analytics-spec.md` §5 + Lens UTM attribution.
6. **Reconciliation between Atlas `check_token_budget()` and Meter's monitor** — drift detection (`r1-token-cap-monitoring.md` §6).

Each query below names its data source, its surface (SQL Editor vs PostHog Insight vs external Grafana), and its refresh cadence.

---

## 1. Per-tier average tokens-per-audit (input + output split)

**Source:** `audit_logs` rows with `action = 'llm_call'` carry `metadata.tokens_in`, `metadata.tokens_out`, `metadata.model`, `metadata.agent_role`, `metadata.mode` (Forge gateway `index.ts` step 10 audit_log_write).

**Surface:** Supabase SQL view + PostHog Insight (hashed).

```sql
-- Supabase SQL view (Atlas owns):
CREATE OR REPLACE VIEW v_meter_tier_tokens_per_audit AS
WITH llm_calls_with_tier AS (
  SELECT
    al.tenant_id,
    s.plan_family,
    al.metadata->>'run_id'    AS run_id,
    (al.metadata->>'tokens_in')::bigint  AS tokens_in,
    (al.metadata->>'tokens_out')::bigint AS tokens_out,
    al.metadata->>'agent_role' AS agent_role,
    al.created_at
  FROM audit_logs al
  LEFT JOIN subscriptions s
         ON s.tenant_id = al.tenant_id
        AND s.status    = 'active'
  WHERE al.action     = 'llm_call'
    AND al.created_at >= now() - interval '7 days'
)
SELECT
  COALESCE(plan_family, 'free') AS tier,
  run_id,
  SUM(tokens_in)  AS audit_tokens_in,
  SUM(tokens_out) AS audit_tokens_out,
  SUM(tokens_in) + SUM(tokens_out) AS audit_tokens_total,
  COUNT(DISTINCT agent_role) AS reviewer_count
FROM llm_calls_with_tier
GROUP BY plan_family, run_id;

-- Then the dashboard query:
SELECT
  tier,
  AVG(audit_tokens_in)::bigint  AS avg_in_per_audit,
  AVG(audit_tokens_out)::bigint AS avg_out_per_audit,
  AVG(audit_tokens_total)::bigint AS avg_total_per_audit,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY audit_tokens_total)::bigint AS p50_total,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY audit_tokens_total)::bigint AS p95_total,
  COUNT(*) AS audit_count
FROM v_meter_tier_tokens_per_audit
GROUP BY tier
ORDER BY tier;
```

**Baseline reference points (from `unit-economics.md` §2):**

| Tier                                  | Modeled tokens-per-audit                                      | Drift threshold                                                |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Free / Surface                        | 50k in + 8k out = 58k total                                   | Alert if p95 > 100k total or avg > 80k                         |
| BYOK Starter (70% Comprehensive mix)  | ~220k weighted average                                        | Alert if p95 > 350k or avg > 280k                              |
| BYOK Pro (60% Comprehensive mix)      | ~190k weighted average                                        | Alert if p95 > 300k or avg > 240k                              |
| Managed Starter (100% Comprehensive)  | 295k total                                                    | Alert if p95 > 500k or avg > 380k — escalates §3.4 sensitivity |
| Managed Pro (5 Full + 0.5 Auto-PR/mo) | 295k Full + 730k Auto-PR                                      | Alert if Full p95 > 500k OR Auto-PR p95 > 1M                   |
| CLI                                   | n/a — runs on customer machine, no metadata in our audit_logs | (no row expected)                                              |

**Refresh cadence:** SQL view refreshed real-time (it's a view, not a materialized view). PostHog Insight pulls weekly via a Lens-owned export script.

**PostHog surface (external dashboard):** event `tier_tokens_weekly` fired by Lens's weekly export — payload uses `tenant_hash`, `tier`, `avg_total_per_audit`, `p95_total`, `audit_count`. NO raw tenant_id.

---

## 2. Per-tier audit-cost-COGS rolling-7d

**Source:** `tenant_token_usage_daily.cost_micros` (Atlas 0003 §C) joined to `subscriptions.plan_family`.

**Surface:** Supabase SQL → Grafana panel (Watch owns the Grafana frame; Meter owns the query).

```sql
CREATE OR REPLACE VIEW v_meter_tier_cogs_rolling_7d AS
SELECT
  s.plan_family AS tier,
  COUNT(DISTINCT u.tenant_id) AS tenant_count,
  SUM(u.cost_micros) / 1000000.0 AS total_cogs_usd,
  (SUM(u.cost_micros) / 1000000.0) / NULLIF(COUNT(DISTINCT u.tenant_id), 0) AS avg_cogs_per_tenant_usd,
  -- Add Railway + Storage estimate per audit (from unit-economics.md §2)
  -- Surface: $0.005 + $0.001 + $0.001 = $0.007
  -- Comprehensive: $0.028 + $0.008 + $0.002 = $0.038
  -- Weighted by tier mix in §3 of unit-economics.md.
  SUM(u.cost_micros) / 1000000.0 *
    CASE s.plan_family
      WHEN 'byok'    THEN 0.0   -- customer pays Anthropic; Jo COGS in §3 SQL below
      WHEN 'managed' THEN 1.0   -- Jo pays full
      WHEN 'cli'     THEN 0.0
      ELSE 1.0                  -- free tier — Jo pays
    END AS jo_anthropic_cogs_usd
FROM tenant_token_usage_daily u
LEFT JOIN subscriptions s
       ON s.tenant_id = u.tenant_id
      AND s.status    = 'active'
WHERE u.usage_date >= current_date - interval '7 days'
GROUP BY s.plan_family;
```

**Grafana panel layout:**

- Top row: total Jo Anthropic COGS rolling-7d (single big number, color-coded green if < $50/wk for the modeled 25-customer state, amber if $50–$150, red if > $150).
- Second row: per-tier bar chart — Anthropic spend × tenant count.
- Third row: Anthropic-spend-per-tenant-per-day spark line, one line per tier.
- Fourth row: comparison vs `unit-economics.md` §3 modeled COGS — if real > modeled × 1.25, panel turns amber.

**Refresh cadence:** Grafana panel polls every 5 min.

---

## 3. Per-tenant breach-of-cap alerts (24h)

**Source:** Meter poller events in Sentry (`finance/r1-token-cap-monitoring.md` §3 emit shape) + the hard-block 429 events from `index.ts` step 5.

**Surface:** Watch's Sentry "R1 Cap Breaches" saved search → cross-feeds into the Grafana FinOps panel.

```sql
-- Direct DB query for the audit-trail panel (Supabase SQL Editor):
SELECT
  -- Hash for any export; raw id only when viewed inside Supabase admin
  encode(hmac(t.id::text, current_setting('app.posthog_hash_salt'), 'sha256'), 'hex') AS tenant_hash,
  s.plan_family,
  t.token_budget_micros / 1000000.0 AS cap_usd,
  (SELECT SUM(cost_micros)
     FROM tenant_token_usage_daily u
    WHERE u.tenant_id = t.id
      AND u.usage_date >= current_date - interval '1 day') / 1000000.0
    AS used_24h_usd,
  (SELECT SUM(cost_micros)
     FROM tenant_token_usage_daily u
    WHERE u.tenant_id = t.id
      AND u.usage_date >= date_trunc('month', current_date)::date) / 1000000.0
    AS used_mtd_usd,
  check_token_budget(t.id) AS within_budget,
  -- Threshold tier per r1-token-cap-monitoring.md §2:
  CASE
    WHEN NOT check_token_budget(t.id) THEN 'blocked_110'
    WHEN (SELECT SUM(cost_micros) FROM tenant_token_usage_daily u
           WHERE u.tenant_id = t.id
             AND u.usage_date >= date_trunc('month', current_date)::date)
         >= t.token_budget_micros * 0.90 THEN 'critical_90'
    WHEN (SELECT SUM(cost_micros) FROM tenant_token_usage_daily u
           WHERE u.tenant_id = t.id
             AND u.usage_date >= date_trunc('month', current_date)::date)
         >= t.token_budget_micros * 0.70 THEN 'warning_70'
    ELSE 'ok'
  END AS threshold_tier
FROM tenants t
LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status = 'active'
WHERE t.token_budget_micros IS NOT NULL  -- Managed tenants only
ORDER BY used_mtd_usd::float / NULLIF(t.token_budget_micros, 0) DESC NULLS LAST;
```

**Refresh:** real-time (SQL Editor) + every 5 min on the Grafana panel.

**Critical-row alert:** any row where `threshold_tier = 'blocked_110'` triggers a Sentry event from the poller; Watch on-call invokes `finance/budget-alert-runbook.md` step 1.

---

## 4. Margin tracking per Penny tier

**Source:** `tenant_token_usage_daily` + `subscriptions.plan_family` + `subscriptions.unit_amount` + Stripe `invoices.amount_paid` (cross-tabled in Atlas's `billing_events` table — 0001 schema).

**Surface:** Supabase SQL → weekly Grafana panel.

```sql
-- Per-tier monthly margin reconciliation against unit-economics.md §3.
-- Run on the 1st of each month for the prior month.
WITH revenue_by_tier AS (
  SELECT
    s.plan_family,
    s.billing_period,
    SUM(s.unit_amount_cents) / 100.0 AS gross_mrr_usd
  FROM subscriptions s
  WHERE s.status = 'active'
  GROUP BY s.plan_family, s.billing_period
),
cogs_by_tier AS (
  SELECT
    s.plan_family,
    -- Anthropic only — Railway + Storage are flat-monthly amortizations,
    -- handled by the unit-economics.md §2 model.
    SUM(u.cost_micros) / 1000000.0 AS anthropic_cogs_usd,
    -- Stripe: 2.9% + $0.30 per active subscription
    COUNT(DISTINCT s.tenant_id) * 0.30
      + (SUM(s.unit_amount_cents) / 100.0) * 0.029 AS stripe_cogs_usd
  FROM tenant_token_usage_daily u
  JOIN subscriptions s ON s.tenant_id = u.tenant_id AND s.status = 'active'
  WHERE u.usage_date >= date_trunc('month', current_date - interval '1 month')
    AND u.usage_date  < date_trunc('month', current_date)
  GROUP BY s.plan_family
)
SELECT
  r.plan_family AS tier,
  r.gross_mrr_usd,
  c.anthropic_cogs_usd,
  c.stripe_cogs_usd,
  r.gross_mrr_usd - c.anthropic_cogs_usd - c.stripe_cogs_usd AS net_margin_usd,
  ((r.gross_mrr_usd - c.anthropic_cogs_usd - c.stripe_cogs_usd) / NULLIF(r.gross_mrr_usd, 0)) * 100 AS margin_pct
FROM revenue_by_tier r
LEFT JOIN cogs_by_tier c USING (plan_family)
ORDER BY r.gross_mrr_usd DESC;
```

**Reconciliation against `unit-economics.md` §3:**

| Tier                   | Modeled margin | Real margin (this query) | Action if real < modeled − 5pp                                                                               |
| ---------------------- | -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| BYOK Starter ($29)     | 95.9%          | (live)                   | Investigate Stripe-fee drift OR audit-mix shift                                                              |
| BYOK Starter ($19 A/B) | 95.3%          | (live)                   | Same                                                                                                         |
| BYOK Pro               | 96.5%          | (live)                   | Same                                                                                                         |
| Managed Starter        | 93.7%          | (live)                   | If real < 88% → tighten cap toward `unit-economics.md` §6 original $15 if it was raised                      |
| Managed Pro            | 92.7%          | (live)                   | If real < 87% → recompute Auto-PR attach rate; possibly tighten Managed Pro cap from $80 toward original $45 |
| CLI                    | 95.5%          | (live)                   | Lowest variance expected                                                                                     |

**Refresh:** monthly (on the 1st).

---

## 5. LTV/CAC per acquisition channel

**Source:** PostHog `paid_conversion` event (`marketing/analytics-spec.md` §5) joined to `users.acquisition_attribution.first_touch` (Lens UTM attribution, `apps/web/lib/utm-attribution.ts` — server-side).

**Surface:** PostHog Insight `ltv-cac-by-channel` + Grafana panel (Meter mirrors).

**PostHog HogQL query:**

```sql
-- Cross-ref marketing/analytics-spec.md §5.5 channel performance table.
-- Note: PostHog already receives tenant_hash, NOT raw tenant_id.
SELECT
  properties.utm_first_touch_source AS channel,
  COUNT(DISTINCT person_id) AS signups,
  countIf(event = 'paid_conversion') AS conversions,
  -- LTV: monthly margin × (1 / monthly_churn_pct) per tier from unit-economics.md §4
  sumIf(properties.amount_cents, event = 'paid_conversion') / 100.0 AS first_month_revenue_usd,
  -- CAC: channel_spend / conversions — channel_spend comes from a Lens-maintained
  -- channel_costs.csv (manual for organic; Stripe-ad-billing import for paid).
  (countIf(event = 'paid_conversion') / NULLIF(COUNT(DISTINCT person_id), 0)) * 100 AS conversion_rate_pct
FROM events
WHERE timestamp >= now() - interval '60 days'
  AND event IN ('signup_completed', 'paid_conversion')
GROUP BY channel
ORDER BY conversions DESC;
```

**Supabase complement (LTV model):**

```sql
-- Compute LTV per active subscription using unit-economics.md §4 churn assumptions.
SELECT
  s.plan_family AS tier,
  AVG(s.unit_amount_cents / 100.0) AS avg_mrr_usd,
  CASE s.plan_family
    WHEN 'byok'    THEN 'byok_starter_or_pro_blend'
    WHEN 'managed' THEN 'managed_starter_or_pro_blend'
    WHEN 'cli'     THEN 'cli'
    ELSE 'other'
  END AS churn_class,
  -- LTV/CAC ratios from unit-economics.md §5; recompute when real churn data > 60d window
  CASE s.plan_family
    WHEN 'byok'    THEN AVG(s.unit_amount_cents / 100.0) / 0.07
    WHEN 'managed' THEN AVG(s.unit_amount_cents / 100.0) / 0.05
    WHEN 'cli'     THEN AVG(s.unit_amount_cents / 100.0) / 0.08
    ELSE AVG(s.unit_amount_cents / 100.0) / 0.05
  END AS modeled_ltv_usd
FROM subscriptions s
WHERE s.status = 'active'
GROUP BY s.plan_family;
```

**Cross-ref:** `marketing/analytics-spec.md` §5 + `unit-economics.md` §5. Lens owns the PostHog Insight; Meter owns the Supabase LTV view. **All channel data refresh weekly** — `marketing/analytics-spec.md` says daily for R21(c) tracking but the LTV/CAC blend is too noisy for daily; week-7-rolling smooths.

---

## 6. Reconciliation: Atlas function vs Meter monitor

Nightly job (Meter cron, 02:30 UTC) runs the reconciliation query from `finance/r1-token-cap-monitoring.md` §6. Any drift > 0 rows → Sentry CRITICAL → Watch on-call → `budget-alert-runbook.md` step 1 (the same runbook handles drift investigation as a sub-flow).

---

## 7. PostHog event registry adds (for this dashboard)

Lens to add to `apps/web/lib/analytics-events.v1.ts`:

| Event name                                    | Properties                                                                                         | Owner               | Fires when                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------- |
| `tier_tokens_weekly`                          | `tenant_hash`, `tier`, `avg_total_per_audit`, `p95_total`, `audit_count`, `week_iso`               | Meter export script | Weekly Sunday 23:00 UTC          |
| `tier_margin_monthly`                         | `tier`, `gross_mrr_usd`, `anthropic_cogs_usd`, `stripe_cogs_usd`, `margin_pct`, `month_iso`        | Meter export script | Monthly 1st 02:00 UTC            |
| `r1_cap_threshold` (already in r1-monitoring) | `tenant_hash`, `alert_tier`, `threshold_pct`, `window`, `cap_micros`, `used_micros`, `plan_family` | Meter poller        | Every poll where threshold ≥ 70% |

All events use `tenant_hash` only. Raw `tenant_id` MUST NOT appear in any PostHog payload — `apps/web/lib/analytics-gate.ts:198-203` enforces this for events fired from the web app; the Meter export script enforces the same shape on server-side fires.

---

## 8. Dashboard surface map

| Panel                 | Surface                       | Refresh           | Owner                            |
| --------------------- | ----------------------------- | ----------------- | -------------------------------- |
| §1 Tokens-per-audit   | Grafana + PostHog Insight     | 5 min / weekly    | Meter (Grafana), Lens (PostHog)  |
| §2 COGS rolling-7d    | Grafana                       | 5 min             | Meter                            |
| §3 Cap breaches       | Grafana + Sentry saved search | 5 min / real-time | Watch (Sentry) + Meter (Grafana) |
| §4 Margin per tier    | Grafana                       | Monthly           | Meter                            |
| §5 LTV/CAC by channel | PostHog Insight + Grafana     | Weekly            | Lens (Insight) + Meter (Grafana) |
| §6 Reconciliation     | Sentry + Supabase SQL         | Nightly           | Meter                            |

All Grafana panels live under one dashboard: **"Studio Zero — FinOps"** (Meter-owned). Single pane of glass, per Watch rule 2 ("Dashboards should answer 'Is the system healthy?' within 3 seconds").

Cross-refs:

- `finance/unit-economics.md` §3, §4, §5 — model values that this dashboard reconciles against.
- `finance/r1-token-cap-monitoring.md` — alert routing for §3 breaches.
- `finance/budget-alert-runbook.md` — operator response when §3 fires.
- `marketing/analytics-spec.md` §5 — PostHog event registry + UTM attribution.
- `apps/web/lib/analytics-gate.ts:143-203` — Cipher Fix-3b tenant_hash shape.
- `architecture/database/migrations/0003_billing_managed.sql` §C — source data.

---

_End of cost-per-tenant-dashboard.md v0.1. Meter — DevOps Layer._
