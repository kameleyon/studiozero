# R1 Token-Cap Monitoring Spec — Studio Zero

**Phase:** 9 M2 Batch 2
**Owner:** Meter (FinOps) — peer-coordinated with Watch (alerting), Forge (gateway), Atlas (DB)
**Version:** 0.1
**Date:** 2026-05-12
**Status:** First-cut spec. Forge's `check_token_budget()` call is live in `supabase/functions/llm-gateway/index.ts` step 5 (a7396fc); Atlas's `tenant_token_usage_daily` table + function are live in `0003_billing_managed.sql` §C (f67ef63). This document specifies the monitoring + alerting surface that wraps them.

> **Reader contract.** Every cap threshold below cites Atlas's `check_token_budget()` (or its inputs). Every alert path cites Sentry → Watch routing (PRD §13.6). Per-tenant data NEVER leaves the platform raw — external dashboards consume the `tenant_hash` (Cipher Fix-3b, `apps/web/lib/analytics-gate.ts:143-203`).

---

## 0. What this spec covers

R1 (PRD §19): _"LLM cost overrun in Managed tier — High likelihood, High impact."_ Mitigation is per-tenant token caps + budget alerts + auto-pause at threshold.

The mitigation stack:

| Layer                            | Owner | Code reference                                                 | What it does                                                                                                                        |
| -------------------------------- | ----- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Atlas DB rollup                  | Atlas | `architecture/database/migrations/0003_billing_managed.sql` §C | UPSERTs one row per `(tenant_id, usage_date)` in `tenant_token_usage_daily`.                                                        |
| Atlas cap function               | Atlas | same file, `check_token_budget(uuid)`                          | Returns FALSE when month-to-date cost ≥ `token_budget_micros × 1.10`.                                                               |
| Forge gateway pre-flight         | Forge | `supabase/functions/llm-gateway/index.ts` step 5 (a7396fc)     | Calls `check_token_budget()` BEFORE every Anthropic call; returns 429 `token_budget_exceeded` on FALSE.                             |
| Forge usage UPSERT               | Forge | same file, step 10                                             | After every successful Anthropic call, UPSERTs `tenant_token_usage_daily` row with `cost_micros = tokens_in × 3 + tokens_out × 15`. |
| **Meter monitoring (THIS SPEC)** | Meter | `finance/r1-token-cap-monitoring.md`                           | Defines threshold semantics, rolling windows, alert routing, per-plan defaults.                                                     |
| **Watch alerting (THIS SPEC)**   | Watch | Sentry → on-call channel                                       | Receives the 70%/90% warnings; the 110% block is already enforced by Forge.                                                         |
| **Meter runbook**                | Meter | `finance/budget-alert-runbook.md`                              | On-call response playbook.                                                                                                          |

Two operational regimes coexist:

1. **Hard block (110%)** — enforced in code by Atlas's `check_token_budget()`. Already live. No human in the loop. Customer sees 429 + `/app/billing/token-budget-exceeded` route (PRD sitemap).
2. **Soft warning (70% / 90%)** — emitted as Sentry warnings by a Meter-owned poller (this spec). Routes to Watch on-call. Triggers the §3 runbook.

---

## 1. Rolling-window definitions

The Atlas `check_token_budget()` function operates on a **month-to-date** window:

```sql
-- From 0003_billing_managed.sql §C (Atlas):
WHERE u.usage_date >= date_trunc('month', current_date)::date
  AND u.usage_date <= current_date
```

This is the **billing window** — it resets the 1st of every calendar month UTC, matching the Stripe subscription billing period. Meter additionally monitors:

| Window                | Purpose                                                                                                         | SQL aggregation                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Rolling 24h           | Detect runaway spend (prompt-injection / Penny's "monorepo + 10 audits/day" scenario, `unit-economics.md` §3.4) | `SUM(cost_micros) FROM tenant_token_usage_daily WHERE tenant_id = $1 AND usage_date >= current_date - INTERVAL '1 day'`         |
| Rolling 30d (billing) | Cap enforcement window — matches `check_token_budget()`                                                         | `SUM(cost_micros) FROM tenant_token_usage_daily WHERE tenant_id = $1 AND usage_date >= date_trunc('month', current_date)::date` |

The 24h window is the **leading indicator**. The 30d window is the **enforcement window**. A tenant can hit 70% of their 30d cap in 5h of bad behavior — Watch must see the 24h spike before the 30d cap fires the hard block. See §3 thresholds.

---

## 2. Cap thresholds

All three thresholds are computed against the same source: `tenants.token_budget_micros` (set per §5 below). The 110% hard-block is in code (Atlas); the 70% and 90% warnings are emitted by the Meter-owned poller into Sentry.

| Threshold                         | Trigger                                                                                    | Action                                                                                                                                                                                                                                  | Code path                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **70%** of `token_budget_micros`  | 30d rolling cost reaches 0.70 × cap **OR** 24h cost reaches 0.30 × cap (leading-indicator) | Sentry `warning` → Watch on-call (low-priority Slack/Discord channel) → notify tenant via E-cap-warning email (Herald content)                                                                                                          | Meter poller; uses `check_token_budget()` inputs but does NOT call the function (which is binary). Reads `tenants.token_budget_micros` + `SUM(tenant_token_usage_daily.cost_micros)` directly. |
| **90%** of `token_budget_micros`  | 30d rolling cost reaches 0.90 × cap **OR** 24h cost reaches 0.50 × cap                     | Sentry `error` → Watch on-call (high-priority channel; PagerDuty if pre-arranged) → second E-cap-warning email                                                                                                                          | Same poller, escalation tier.                                                                                                                                                                  |
| **110%** of `token_budget_micros` | 30d rolling cost reaches 1.10 × cap                                                        | **HARD BLOCK** — gateway returns 429 `token_budget_exceeded`; UI degrades to `/app/billing/token-budget-exceeded`; Sentry `error` event with `event=token_budget_exceeded` already emitted by gateway at `index.ts` step 5 line 234-256 | Already live (Forge a7396fc).                                                                                                                                                                  |

**Why three thresholds?** Atlas's `check_token_budget()` is a binary `true|false` — it tells the gateway whether to allow the call, not whether to warn anyone. The 10% headroom between 100% of cap and the 110% block is the documented R1 mitigation grace (`0003_billing_managed.sql` §C comment + `unit-economics.md` §6). Without the 70%/90% pre-warnings, the customer's first signal is the 429 — at which point the audit they're running fails. The pre-warnings give them time to either upgrade or plug in a BYOK key (Penny's `prd-review-penny.md` §3.5 graceful-degrade copy).

---

## 3. Meter poller — implementation contract

The poller runs as a Supabase Edge Function on a cron schedule (5-minute cadence — fast enough to catch the 24h leading-indicator before it becomes a 30d crisis; slow enough not to thrash the DB). Pseudocode:

```typescript
// supabase/functions/r1-budget-poller/index.ts  (Meter, M2 Batch 2 deliverable)
// Cron: */5 * * * * via pg_cron OR Supabase scheduled function
//
// For every Managed tenant (token_budget_micros IS NOT NULL):
//   24h_cost = SUM(cost_micros WHERE usage_date >= now() - 1d)
//   30d_cost = SUM(cost_micros WHERE usage_date >= date_trunc('month', now()))
//   cap      = tenants.token_budget_micros
//
//   IF 30d_cost >= 0.90 * cap OR 24h_cost >= 0.50 * cap:
//     emit Sentry error  level + alert_tier=critical
//   ELIF 30d_cost >= 0.70 * cap OR 24h_cost >= 0.30 * cap:
//     emit Sentry warning level + alert_tier=warning
//
// Sentry event payload — uses tenant_hash, NEVER tenant_id raw:
//   {
//     event: "r1_cap_threshold",
//     tenant_hash: <HMAC-SHA256(tenant_id, POSTHOG_HASH_SALT)>,  // Cipher Fix-3b
//     alert_tier: "warning" | "critical",
//     threshold_pct: 70 | 90,
//     window: "24h" | "30d",
//     cap_micros: tenants.token_budget_micros,
//     used_micros: SUM(cost_micros) for window,
//     ratio: used_micros / cap_micros,
//     plan_family: subscriptions.plan_family,
//   }
```

**Why Sentry, not Slack-direct?** PRD §13.6 names Sentry as the canonical observability layer with the `beforeSend` PII scrub (`apps/web/lib/sentry-redaction.ts`). Routing through Sentry means: (a) the `tenant_hash` redaction floor is enforced by Cipher's scrubber regardless of poller-author mistakes; (b) Watch's existing on-call routing wiring (Sentry alert rules → Slack/Discord/PagerDuty) handles severity tiering; (c) the event is searchable + correlatable with other Sentry events for the same tenant (e.g., the upstream `token_budget_exceeded` 429 event from `index.ts:234`).

**Deduplication:** the poller MUST suppress duplicate warnings within a 6-hour window per `(tenant_hash, threshold_pct)`. Sentry fingerprinting handles this if the event `fingerprint` is set to `["r1-cap", tenant_hash, threshold_pct]`. Without dedup, a tenant sitting at 71% for a week would generate ~2000 warnings/week. Watch on-call would mute it; alert fatigue (Watch rule 3) kills the system.

---

## 4. Alert routing — Sentry → Watch on-call (PRD §13.6)

| Sentry severity                | Watch routing target                                                                    | Latency SLO | Escalation if no ack                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `warning` (70% threshold)      | Watch Slack `#meter-alerts` channel                                                     | 30-min ack  | Next on-call shift                                                          |
| `error` (90% threshold)        | Watch Slack `#oncall-critical` + Discord ping                                           | 5-min ack   | PagerDuty SMS at 15 min if pre-arranged; otherwise escalate to Jo at 30 min |
| `error` (110% — Forge-emitted) | Same as 90% — also kicks the §3 runbook automatically because the customer sees the 429 | 5-min ack   | Same as 90%                                                                 |

Routing is configured in Sentry Alert Rules — Watch owns the dashboard and ruleset (`agents/devops/watch.md` rule 6: "Provide context with alerts — link to logs, runbooks, or traces"). The Sentry alert message MUST include:

1. `tenant_hash` (NOT raw tenant_id — Cipher Fix-3b is non-negotiable for any surface outside Supabase RLS)
2. `plan_family` (so on-call knows immediately whether this is Managed Starter vs Managed Pro — affects cap sizing decisions)
3. Link to `finance/budget-alert-runbook.md` step list
4. Link to the Supabase SQL Editor with a pre-canned `SELECT * FROM tenant_token_usage_daily WHERE tenant_id = ?` template (on-call uses internal-only admin tool to translate `tenant_hash` → `tenant_id` per the same hashing key)

---

## 5. Per-plan cap defaults

Read from `tenants.token_budget_micros` (set on plan-change via the Stripe webhook handler). Locked defaults per `unit-economics.md` §6 and the M2 brief:

| Plan                    | `token_budget_micros` value | USD/mo equivalent                             | Notes                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free (Surface only)** | `0`                         | $0                                            | Surface audits don't go through Managed shared key when free-tier-limit is reached; gated by `tenants.max_concurrent_runs` + per-month-audit-count. Set to 0 here so `check_token_budget()` blocks any Managed-path traffic from free tenants (defense-in-depth — Forge's `runMode === "managed"` branch already requires a paid subscription, but the cap-check is a second wall). |
| **BYOK Starter**        | `NULL`                      | n/a — customer pays Anthropic                 | `check_token_budget()` returns `true` on NULL — Atlas line 291.                                                                                                                                                                                                                                                                                                                     |
| **BYOK Pro**            | `NULL`                      | n/a — customer pays Anthropic                 | Same.                                                                                                                                                                                                                                                                                                                                                                               |
| **Managed Starter**     | `15000000`                  | **$15.00 / mo**                               | Per `unit-economics.md` §6: at $1.67/Comprehensive (modeled) this allows ~9 Comprehensive audits/mo before the 100% mark, ~10 before the 110% block. Targets 84%+ margin floor.                                                                                                                                                                                                     |
| **Managed Pro**         | `80000000`                  | **$80.00 / mo**                               | M2 brief override of the original `unit-economics.md` §6 $45 cap. At $1.67/Comprehensive (modeled) this allows ~48 Comprehensive audits/mo before the 100% mark, ~53 before the 110% block. Targets ~68% margin floor on $249 plan (after Stripe + Railway + Storage). Recompute if Cortex picks Opus for any reviewer or if `unit-economics.md` cost model is updated.             |
| **CLI ($19/mo)**        | `NULL`                      | n/a — customer pays Anthropic via Claude Code | Same as BYOK.                                                                                                                                                                                                                                                                                                                                                                       |

**Where these get set.** The Stripe webhook handler (Forge, a7396fc) writes `token_budget_micros` to `tenants` on every `customer.subscription.created` / `customer.subscription.updated` event. The value comes from the Stripe Price metadata (`finance/stripe-config.md` — Penny + Ledger maintain). Per-plan defaults are documented as the Stripe Price metadata target values; the runtime source-of-truth is `tenants.token_budget_micros`.

**Audit trail.** Every cap change MUST emit an `audit_log_write` row with `action = 'cap_change'` and metadata `{ old_micros, new_micros, reason }`. Audit-log retention is 7 years per PRD §14.4. The cap-raise approval flow in `finance/budget-alert-runbook.md` step 5 hooks into this.

---

## 6. Reconciliation with `check_token_budget()`

**Atlas's function is the enforcement source of truth.** Meter's poller is a monitoring layer; it MUST agree with the function on the binary `over-cap | not-over-cap` question. Reconciliation check (Meter's nightly job — see `finance/cost-per-tenant-dashboard.md` §6):

```sql
-- Verify: every tenant flagged by Meter's 110% poll is also blocked by check_token_budget
SELECT t.id, t.token_budget_micros,
       (SELECT SUM(cost_micros) FROM tenant_token_usage_daily u
        WHERE u.tenant_id = t.id
          AND u.usage_date >= date_trunc('month', current_date)::date) AS used_micros,
       check_token_budget(t.id) AS function_says_ok
FROM tenants t
WHERE t.token_budget_micros IS NOT NULL;
-- For any row where used_micros >= token_budget_micros * 1.10 AND function_says_ok = true:
-- Meter raises a CRITICAL alert. Means Atlas's function and Meter's monitor disagree.
-- Root cause is almost always a stale rollup row — investigate in §3 runbook step 1.
```

Drift between the function and the monitor is itself a Critical Meter finding (rule echoes `unit-economics.md` §1 untagged-spend rule).

---

## 7. SLOs for the cap-check itself

| SLO                                                                   | Target                                                                 | Measurement                                                                                                                      | Breach action                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `check_token_budget()` p95 latency                                    | < 50 ms                                                                | Watch instruments via Sentry transaction on the `admin.rpc("check_token_budget", ...)` call in `index.ts` step 5                 | Atlas + Forge investigate; consider materialized-view caching   |
| Cap-check error rate (gateway falls back to `audit_logs` aggregation) | < 0.1% of Managed calls                                                | Forge emits `used_fallback_check: true` on the warning log line at `index.ts:241` — Watch alerts if fallback rate > 0.1% over 1h | Atlas migration drift / RLS regression; investigate immediately |
| Poller cadence                                                        | < 6 min between successive polls (5-min cron + 1-min jitter buffer)    | Sentry transaction every poll run                                                                                                | Re-deploy poller; check pg_cron is alive                        |
| 70%/90% warning false-positive rate                                   | < 5% (warnings that do not match a real cap-approach within 24h after) | Watch reviews weekly                                                                                                             | Tune thresholds OR investigate stale rollup data                |

---

## 8. What this spec does NOT cover

- **Per-tenant cap override UX** — Penny owns the upgrade-flow copy and pricing-page reveal.
- **E-cap-warning email content** — Herald owns content; this spec only TRIGGERS the email at the 70% threshold.
- **Refund-tokens-burned flow** — Ledger owns the Stripe credit-note path; runbook step 5 hands off there.
- **Cap raises for legitimate enterprise customers** — Penny + Meter approve, Ledger executes (runbook step 5).
- **External-dashboard tenant_hash translation** — internal-only Supabase admin tool (Vega + Atlas own).

Cross-refs:

- `finance/unit-economics.md` §6 — original token-cap recommendation, locked here at $15 / $80.
- `finance/cost-per-tenant-dashboard.md` — PostHog Insights + SQL queries for the FinOps dashboard.
- `finance/budget-alert-runbook.md` — on-call response playbook when this spec's alerts fire.
- `architecture/database/migrations/0003_billing_managed.sql` §C — Atlas DB layer.
- `supabase/functions/llm-gateway/index.ts` step 5 — Forge gateway pre-flight.
- `apps/web/lib/sentry-redaction.ts` — Cipher PII scrub that every alert passes through.
- `apps/web/lib/analytics-gate.ts:143-203` — Cipher Fix-3b tenant_hash implementation.
- `agents/devops/watch.md` — Watch persona + alerting rules.
- PRD §13.6, §15 R1, §19 R1.

---

_End of r1-token-cap-monitoring.md v0.1. Meter — DevOps Layer._
