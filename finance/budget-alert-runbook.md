# Budget-Alert Runbook — Studio Zero

**Phase:** 9 M2 Batch 2
**Owner:** Meter (FinOps) — peer-coordinated with Watch (on-call), Shield (suspicious-traffic triage), Ledger (refund/credit execution), Herald (customer email content), Penny (cap-raise approval), BigBrain + Jo (escalation)
**Version:** 0.1
**Date:** 2026-05-12
**Status:** Operational runbook. Triggered when `finance/r1-token-cap-monitoring.md` §3 alerts fire.

> **Reader contract.** This runbook is the on-call playbook when R1 cap breaches surface in Sentry. Steps are ordered; do NOT skip steps unless a higher-severity escalation explicitly overrides. Every step names its owner, its tool, and its exit criteria. Per-tenant data NEVER leaves the platform in raw form — use `tenant_hash` for any external comms; raw `tenant_id` only inside the Supabase admin tool.

---

## 0. When this runbook fires

Three trigger sources, all routed through Sentry → Watch on-call (PRD §13.6):

| Trigger                                                     | Source                                                          | Severity                                  | Action                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Meter poller `r1_cap_threshold` event, `threshold_pct = 70` | `finance/r1-token-cap-monitoring.md` §3                         | Sentry `warning`                          | Run **Steps 1 → 2** (verify legitimate; notify).                    |
| Meter poller `r1_cap_threshold` event, `threshold_pct = 90` | Same                                                            | Sentry `error`                            | Run **Steps 1 → 2 → 3 if suspicious**.                              |
| Forge gateway 429 `token_budget_exceeded` event             | `supabase/functions/llm-gateway/index.ts` step 5 (line 234-256) | Sentry `error` (already fired by gateway) | Run **Steps 1 → 4** (customer is already blocked; resolve quickly). |

**SLO for on-call ack:** 30 min (warning) / 5 min (error). Beyond ack: each step has its own latency target listed.

---

## 1. Triage — is this legitimate usage or a runaway?

**Owner:** Watch on-call.
**Tool:** Supabase SQL Editor + Sentry alert payload + internal admin tool (`tenant_hash` → `tenant_id` translator).
**Latency target:** 10 min from ack.

The Sentry alert payload contains `tenant_hash`, `plan_family`, `cap_micros`, `used_micros`, `threshold_pct`, `window`. Use the internal admin tool to translate `tenant_hash` → `tenant_id` (the tool runs inside Supabase RLS service-role and is the ONLY surface where the mapping is exposed; it is NOT part of any public API).

### 1.1 Pull the usage timeline

```sql
-- Run as service-role in Supabase SQL Editor:
SELECT
  usage_date,
  input_tokens,
  output_tokens,
  cost_micros / 1000000.0 AS cost_usd,
  updated_at
FROM tenant_token_usage_daily
WHERE tenant_id = '<tenant_id_from_admin_tool>'
ORDER BY usage_date DESC
LIMIT 31;
```

### 1.2 Pull the per-audit token detail (last 24h)

```sql
SELECT
  al.created_at,
  al.metadata->>'run_id'      AS run_id,
  al.metadata->>'agent_role'  AS agent_role,
  al.metadata->>'model'       AS model,
  (al.metadata->>'tokens_in')::bigint  AS tokens_in,
  (al.metadata->>'tokens_out')::bigint AS tokens_out,
  al.metadata->>'mode'        AS mode
FROM audit_logs al
WHERE al.tenant_id = '<tenant_id>'
  AND al.action    = 'llm_call'
  AND al.created_at >= now() - interval '1 day'
ORDER BY al.created_at DESC;
```

### 1.3 Classify the pattern

| Pattern                                          | Indicator                                                                                                            | Verdict                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Normal Managed Starter usage                     | 3–10 audits/day; consistent agent_role mix; reasonable tokens_in/out per call (per `unit-economics.md` §2 baselines) | **LEGITIMATE** → Step 2                                                                   |
| Managed Pro power user                           | 5–15 audits/day; mix of Surface + Comprehensive; Auto-PR bundles present                                             | **LEGITIMATE** → Step 2                                                                   |
| Sudden 24h spike with normal historical baseline | 0–2/day for 14 days, then 50+ in last 24h                                                                            | **SUSPICIOUS** → Step 3                                                                   |
| Unusual agent_role mix                           | Same reviewer running 100+ times in 1h                                                                               | **SUSPICIOUS** (possible prompt-injection retry-loop) → Step 3                            |
| Massive `tokens_in` per call (>1M)               | Single audit at 1M+ tokens                                                                                           | **SUSPICIOUS** (prompt-injection payload OR malicious monorepo) → Step 3 + loop in Shield |
| Failed reviewer-validation retries               | High volume of `schema_drift` 422s preceding the spike                                                               | **SUSPICIOUS** (Cortex / reviewer regression — escalate to Forge) → Step 3                |

**Exit criteria for Step 1:** classification recorded in the Sentry alert comment thread as `verdict: legitimate | suspicious` with a one-line rationale.

---

## 2. Step 2 — Legitimate usage path: notify the tenant

**Owner:** Watch on-call (triggers); Herald (owns email content).
**Tool:** Trigger E-cap-warning email via the lifecycle-emails queue.
**Latency target:** 30 min from Step-1 verdict.

### 2.1 Trigger the lifecycle email

Insert one row in the `lifecycle_email_queue` table (Atlas 0005 migration):

```sql
INSERT INTO lifecycle_email_queue (
  tenant_id,
  template_key,    -- 'E-cap-warning-70' or 'E-cap-warning-90'
  payload,
  scheduled_at
) VALUES (
  '<tenant_id>',
  'E-cap-warning-' || '<70|90>',
  jsonb_build_object(
    'cap_usd',       <cap_micros> / 1000000.0,
    'used_usd',      <used_micros> / 1000000.0,
    'threshold_pct', <70|90>,
    'plan_family',   '<managed|...>',
    'reset_date',    date_trunc('month', current_date) + interval '1 month'
  ),
  now()
);
```

The email content is Herald-owned (`marketing/copy/E-cap-warning-*.mdx`). The trigger spec'd here MUST include the cap, current usage, threshold, plan family, and reset date. **Herald is the SOLE owner of the customer-facing copy** — this runbook only fires the trigger.

### 2.2 Offer remediation options inside the email

Herald's copy (per Penny's `prd-review-penny.md` §3.5 graceful-degrade pattern) MUST surface three options:

1. Upgrade to Managed Pro (if currently Managed Starter) — Stripe checkout link with `cap_raise: true` UTM
2. Plug in a BYOK key — link to `/app/settings/byok`
3. Wait until reset on the 1st of next month — surfaced as the default, no action required

### 2.3 Record the touch

```sql
INSERT INTO audit_logs (tenant_id, action, metadata)
VALUES (
  '<tenant_id>',
  'r1_cap_warning_sent',
  jsonb_build_object(
    'threshold_pct', <70|90>,
    'sent_at',       now(),
    'oncall',        '<watch_oncall_handle>'
  )
);
```

**Exit criteria for Step 2:** email queued + audit row written + Sentry alert resolved with `outcome: notified`.

---

## 3. Step 3 — Suspicious usage path: suspend + Shield review

**Owner:** Watch on-call + Shield (security review).
**Tool:** Supabase SQL Editor.
**Latency target:** 5 min from Step-1 verdict (this is the hottest path).

### 3.1 Suspend the tenant's runs immediately

```sql
-- Set max_concurrent_runs to 0 — every in-flight run completes,
-- but no new runs can be enqueued. Reversible.
UPDATE tenants
   SET max_concurrent_runs = 0
 WHERE id = '<tenant_id>';

INSERT INTO audit_logs (tenant_id, action, metadata)
VALUES (
  '<tenant_id>',
  'tenant_run_suspended',
  jsonb_build_object(
    'reason',          'r1_cap_suspicious_pattern',
    'threshold_pct',   <70|90|110>,
    'previous_max',    <previous_value>,
    'suspended_at',    now(),
    'oncall',          '<watch_oncall_handle>'
  )
);
```

**Why `max_concurrent_runs = 0` not `0003_billing_managed.sql check_token_budget` tightening:** the cap function only blocks NEW LLM calls; it does not stop a tenant from queuing 1000 audit runs which then sit in `queued` state waiting to fire. `max_concurrent_runs = 0` blocks the queue at the dispatch layer.

### 3.2 Page Shield for security review

Use the Shield on-call rotation per `agents/security/shield.md`. Shield investigates:

- Prompt-injection corpus match against the offending audit's source content (Shield maintains the corpora in `tests/prompt-injection-corpus/`)
- Stripe payment fraud signals (if the tenant signed up in the last 7 days)
- BYOK key fingerprint anomalies (if BYOK path — though this runbook is primarily about Managed)
- Repo-content scans (does the customer code contain known malicious patterns)

**Shield delivers a verdict within 2 business hours:**

- `verdict: false_positive` → unsuspend (revert max_concurrent_runs) + apologize to customer via Echo + Step 2 warning email
- `verdict: confirmed_attack` → escalate to Step 4
- `verdict: legitimate_but_capped` → unsuspend + Step 2 + flag for Penny cap-raise review

### 3.3 Notify the customer of the suspension

Trigger E-cap-suspended email (Herald content; this runbook only fires the trigger). Email MUST include:

- The fact of suspension
- A support email contact (Echo on-call)
- An expected timeline for review (2 business hours)

**Critical:** the suspension email goes out at the SAME time as the suspension SQL. Customer must not discover the suspension by hitting a 5xx in the dashboard.

**Exit criteria for Step 3:** Shield verdict logged + audit_log row written + customer email queued.

---

## 4. Step 4 — Escalation: BigBrain + Jo

**Owner:** Watch on-call escalates; BigBrain (director agent) + Jo (founder) make decisions.
**Trigger conditions:**

| Condition                                                                            | Why escalate                                                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Confirmed attack from Step 3 → revenue impact OR brand impact                        | Strategic decision: refund + ban OR rate-limit + warn OR public disclosure |
| Customer dispute on a legitimate cap-hit                                             | Penny + Meter approval needed for cap raise OR refund                      |
| Cap breach by a strategic-relationship customer (alpha cohort, design partner, etc.) | Jo's strategic call — different from the standard playbook                 |
| Reconciliation drift > 0 rows (Atlas function disagrees with Meter monitor)          | Atlas + Forge + Meter triage; may require migration hotfix                 |

**Latency target:** 1 business hour from Step-3 escalation trigger.

**Communication channel:** Watch on-call posts to the internal Discord `#oncall-escalations` channel with:

- Sentry alert URL
- `tenant_hash` (NOT tenant_id in chat)
- Step-1 verdict + Step-3 Shield verdict
- Recommended resolution
- ETA for resolution

**BigBrain decision authority:**

- Refund/credit up to $500 — BigBrain approves alone
- Refund/credit $500–$2,000 — BigBrain + Penny approve
- Refund/credit > $2,000 — Jo signs off
- Permanent ban — Jo + Comply review (TOS §AUP enforcement)
- Cap raise above `unit-economics.md` §6 defaults — Penny + Meter joint approval (preserve margin floor)

---

## 5. Step 5 — Resolution

**Two paths converge here:** either (a) a cap-raise, or (b) a token refund for already-burned spend.

### 5.1 Cap-raise path

**Owner:** Penny (pricing approval) + Meter (margin reconciliation) + Ledger (Stripe + DB write).
**Tool:** Supabase SQL + Stripe Dashboard.

```sql
-- Update tenants.token_budget_micros to new cap (example: raise from $15 to $30)
UPDATE tenants
   SET token_budget_micros = 30000000  -- new cap in micros
 WHERE id = '<tenant_id>';

-- Audit-log the cap change per r1-token-cap-monitoring.md §5
INSERT INTO audit_logs (tenant_id, action, metadata)
VALUES (
  '<tenant_id>',
  'cap_change',
  jsonb_build_object(
    'old_micros',  <previous_cap>,
    'new_micros',  30000000,
    'reason',      'enterprise_request_approved_by_penny_meter',
    'approver_penny',  '<penny_handle>',
    'approver_meter',  '<meter_handle>',
    'effective_at',    now()
  )
);

-- Unsuspend if currently suspended
UPDATE tenants
   SET max_concurrent_runs = <previous_value>  -- restore prior value
 WHERE id = '<tenant_id>';
```

**Margin check (Meter enforces):** the new cap MUST preserve ≥80% contribution margin per the Phase-7 exit gate (`unit-economics.md` §7). Penny + Meter compute jointly:

```
new_margin_pct = (mrr - stripe_fee - new_cap × 1.10) / mrr
require: new_margin_pct >= 0.80
```

If the math fails, the path is "raise the cap AND raise the price" — Stripe subscription update via Ledger.

### 5.2 Token-refund path

**Owner:** Ledger executes; Meter signs off on amount.
**Tool:** Stripe credit note + DB rollup adjustment.

```sql
-- Subtract the refunded cost from the rollup so the cap window resets effectively.
UPDATE tenant_token_usage_daily
   SET cost_micros = GREATEST(0, cost_micros - <refund_amount_micros>),
       updated_at  = now()
 WHERE tenant_id   = '<tenant_id>'
   AND usage_date  = '<usage_date_of_refund>';

INSERT INTO audit_logs (tenant_id, action, metadata)
VALUES (
  '<tenant_id>',
  'r1_token_refund',
  jsonb_build_object(
    'refund_micros',         <refund_amount_micros>,
    'stripe_credit_note_id', '<cn_...>',
    'reason',                'r1_dispute_resolved_favor_customer',
    'approver_ledger',       '<ledger_handle>',
    'approver_meter',        '<meter_handle>'
  )
);
```

Stripe credit note created via Ledger's Stripe Dashboard access. Use the standard PRD §14.2 partial-result refund template ("A run that fails irrecoverably refunds tokens (BYOK) or credits (Managed)") as the customer comms hook.

**Exit criteria for Step 5:** cap raised OR refund issued + audit_log row + Sentry alert closed with `outcome: cap_raised | refunded | denied`.

---

## 6. Post-incident review

For every alert that escalates beyond Step 2 (i.e., every Step 3+ case):

| Activity                                                                       | Owner                 | Cadence                    |
| ------------------------------------------------------------------------------ | --------------------- | -------------------------- |
| Sentry alert annotated with Step-by-step decision log                          | Watch on-call         | Same day                   |
| Weekly review of all R1 cap alerts                                             | Meter                 | Friday 16:00 UTC           |
| Pattern-detection on suspended tenants (does Shield's corpus need expansion?)  | Shield + Meter        | Monthly                    |
| Cap default re-tuning (if real margin drift > 5pp from `unit-economics.md` §3) | Penny + Meter         | Quarterly                  |
| Reconciliation drift incidents (Atlas function vs Meter monitor disagreement)  | Atlas + Forge + Meter | Per-occurrence, root-cause |

---

## 7. Anti-checklist — what NOT to do

1. **DO NOT manually raise the cap in DB without Penny + Meter joint approval.** That breaks the §3 margin gate.
2. **DO NOT delete rows from `tenant_token_usage_daily`** to "reset" a cap. Use the §5.2 refund path which preserves audit trail. Atlas's audit retention is 7 years (PRD §14.4).
3. **DO NOT send a cap-warning email outside the Herald-owned `E-cap-warning-*` templates.** Customer comms are Herald's responsibility. This runbook only fires triggers.
4. **DO NOT page Jo before BigBrain has had a chance to review** unless step-4 conditions are met. Watch alert-fatigue rule 3 applies: pre-filtered escalation only.
5. **DO NOT expose raw `tenant_id` outside the Supabase admin tool.** All chat / Sentry / Grafana surfaces use `tenant_hash`. Cipher Fix-3b is the rule.
6. **DO NOT set `check_token_budget()` to always-return-true** as a workaround. That is a CRITICAL Meter finding. Atlas + Forge + Meter sign-off required for any cap-function change; should be a 0004+ migration with its own review.
7. **DO NOT unsuspend a Step-3 tenant** before Shield's verdict is in. If you do and Shield later confirms attack, every audit run between unsuspension and re-suspension is on Jo's bill AND adds to the incident severity.

---

## 8. Quick reference card (print-friendly)

```
ALERT: R1 cap breach
  ↓
Step 1: SQL on tenant_token_usage_daily + audit_logs (10 min) → verdict
  ↓
  ├── LEGITIMATE  → Step 2: queue E-cap-warning + audit row → DONE
  ├── SUSPICIOUS  → Step 3: max_concurrent_runs=0 + page Shield (5 min)
  └── 110% HARD-BLOCK already firing → Step 4 + 5 in parallel
                                            ↓
                                  Step 4: escalate BigBrain/Jo
                                            ↓
                                  Step 5: cap-raise OR refund
                                            ↓
                                          DONE (audit_log written)
```

Cross-refs:

- `finance/r1-token-cap-monitoring.md` — threshold semantics + Sentry routing.
- `finance/cost-per-tenant-dashboard.md` — Grafana panels referenced in Step 1.
- `finance/unit-economics.md` §6, §7 — margin gate + cap defaults.
- `architecture/database/migrations/0003_billing_managed.sql` §C — `check_token_budget()` source.
- `supabase/functions/llm-gateway/index.ts` step 5 — Forge 429 emission site.
- `apps/web/lib/analytics-gate.ts:143-203` — Cipher Fix-3b tenant_hash.
- `agents/devops/watch.md` — on-call rules + alert routing.
- `agents/security/shield.md` — Shield triage.
- `agents/operations/ledger.md` — Stripe refund execution.
- PRD §13.6, §14.2, §15 R1, §17 (AUP), §19 R1.

---

_End of budget-alert-runbook.md v0.1. Meter — DevOps Layer._
