# Refund Operations Runbook — Studio Zero

**Owner:** Ledger
**Status:** M2 Batch 2 — operationally executable. Some triggers automated; some manual via Echo + Comply review.
**Spec source:** `finance/stripe-config.md` §8 (idempotency contract); `finance/refund-matrix.md` §7 (truth table); `apps/web/app/api/webhooks/stripe/route.ts` (subscription state machine).
**Code consumers:**

- Forge implements `/api/billing/refund` (M2 endpoint) per §6 below
- Atlas adds `refund_issued` enum value to `audit_action` in `0003_billing_managed.sql`
- Verify covers automated triggers with integration tests

**Legal anchors:**

- EU CRD Art. 13(1) — refund within 14 days of withdrawal notice
- UK CCR 2013 Reg. 38 — same
- California SB 313 (Cal. Bus. & Prof. Code §17602.7) — pro-rata refund
- FTC 16 CFR §425.4 — easy cancellation (refund timing not federally mandated)
- Stripe Services Agreement §3 — Stripe controls dispute reversal

---

## 1. Refund trigger taxonomy

Each row maps to `audit_logs.action='refund_issued'` with `metadata.trigger=<one-of>`:

| `trigger` enum            | Source                                                                                 | Auto vs Manual                                | SLA                                              | Region scope                                                   |
| ------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| `cooloff_eu_uk`           | `customer.subscription.deleted` webhook + open `cooling_off_windows` row, waiver=false | **AUTO**                                      | Immediate Stripe call; 5-10 biz days bank settle | EU, UK                                                         |
| `sb313_ca`                | `customer.subscription.deleted` webhook + region='ca' + mid-period                     | **AUTO**                                      | Immediate                                        | California                                                     |
| `ftc_cancel_with_refund`  | Customer-initiated via B-CAN UI (not auto-mandated by FTC; we offer for goodwill)      | **MANUAL** (Echo ticket → Comply approves)    | 5 biz days                                       | US (other 49) — currently MVP does not surface; open follow-up |
| `dispute_finding_upheld`  | Comply review of in-app dispute (B-DISPUTE) returns "upheld"                           | **MANUAL** (Comply approves; Ledger executes) | 5 biz days from review                           | All                                                            |
| `dispute_finding_partial` | Comply partial-refund determination                                                    | **MANUAL**                                    | 5 biz days                                       | All                                                            |
| `chargeback_lost`         | Stripe `charge.dispute.closed` with `outcome=lost`                                     | **AUTO by Stripe** (we don't initiate)        | Per card network                                 | All                                                            |
| `failed_synth_timeout`    | Runner `failed_synth_timeout` state (PRD D21)                                          | **AUTO**                                      | Real-time                                        | All — Managed only (token cost)                                |
| `autopr_rejection` (V1.5) | Jury re-audit FAILs on Auto-PR delivery                                                | **AUTO**                                      | Real-time                                        | All                                                            |
| `aup_termination`         | Studio Zero terminates customer for AUP violation per PRD §14.7                        | **MANUAL** (Comply approves; Ledger executes) | 14 days                                          | All — pro-rata applied per regional law                        |

---

## 2. The idempotent refund call (canonical)

**Stripe API call** — used for every trigger except `chargeback_lost` (Stripe auto-issues):

```ts
await stripe.refunds.create(
  {
    payment_intent: paymentIntentId, // OR charge: chargeId
    amount: refundCents, // partial supported; null = full
    reason: stripeReason, // 'requested_by_customer' | 'duplicate' | 'fraudulent'
    metadata: {
      tenant_id: tenantId,
      user_id: userId,
      run_id: runId ?? "", // V1.5 Auto-PR scenario
      trigger: triggerEnum, // matches §1 trigger column
      audit_log_id: auditLogId, // cross-ref into audit_logs
      idempotency_subject: idempotencySubject, // human-readable form of the key
    },
  },
  {
    idempotencyKey: refundIdempotencyKey, // see §3 below
  },
);
```

**Hard rule (Ledger):** every refund MUST carry `idempotencyKey`. Stripe's API requires it (`Idempotency-Key` header) for deterministic retry safety. A second call with the same key returns the same Refund object — no double-refund possible. This is the same red-line as webhook idempotency (`finance/stripe-config.md` §3.3).

---

## 3. Idempotency key construction (deterministic, by trigger)

Per `finance/stripe-config.md` §8.2. Replicated here for operator clarity:

| Trigger                   | Idempotency key format                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `cooloff_eu_uk`           | `refund:cooloff:<subscription_id>:<cooling_off_window_id>`                                                          |
| `sb313_ca`                | `refund:sb313:<subscription_id>:<cancel_event_id>`                                                                  |
| `dispute_finding_upheld`  | `refund:dispute:<dispute_id>`                                                                                       |
| `dispute_finding_partial` | `refund:dispute:<dispute_id>` (same — partial vs full does NOT change key; the disambiguator is the `amount` param) |
| `failed_synth_timeout`    | `refund:synthstall:<run_id>`                                                                                        |
| `autopr_rejection`        | `refund:autopr:<run_id>`                                                                                            |
| `aup_termination`         | `refund:aup:<subscription_id>:<termination_event_id>`                                                               |
| `ftc_cancel_with_refund`  | `refund:ftcgw:<subscription_id>:<cancel_event_id>`                                                                  |

**Why this matters:** if the refund creation request times out client-side and retries, Stripe sees the same key and returns the existing Refund. No duplicate refund. No double bookkeeping.

---

## 4. Refund-eligibility window checks (auto-decline guardrails)

Before issuing ANY automated refund, the eligibility check below MUST pass:

### 4.1 Cooling-off (EU/UK)

```sql
-- Must return exactly one row to proceed
SELECT id, region, waiver_signed
FROM cooling_off_windows
WHERE subscription_id = $1
  AND region IN ('eu','uk')
  AND exercised_at IS NULL
  AND expires_at > now()
  AND waiver_signed = false
ORDER BY opened_at DESC
LIMIT 1;
```

If row returned → eligible; proceed with §5.1.
If no row → **auto-decline**; do not refund. Customer can still file via Dispute path (B-DISPUTE) per §4.3.

### 4.2 California SB 313 pro-rata

```sql
-- Subscription must be (a) California region, (b) cancelled mid-period
SELECT id, current_period_start, current_period_end, status
FROM subscriptions
WHERE id = $1
  AND region = 'ca'
  AND status = 'canceled'
  AND canceled_at IS NOT NULL
  AND canceled_at > current_period_start
  AND canceled_at < current_period_end;
```

If row returned → eligible; proceed with §5.2.
If no row → no automatic refund (dunning-driven cancellations and end-of-period cancellations do not trigger SB 313 pro-rata per `dunning-policy-config.md` §5.3).

### 4.3 Outside cooling-off + outside SB 313 → manual review required

If a refund request comes in (via Echo support ticket or Dispute Finding flow) and BOTH §4.1 and §4.2 return no rows, the refund is **manual-only**:

- Echo opens a ticket → Comply reviews → if upheld, Comply marks `disputes.outcome='resolved_refund'` → Ledger executes §5.3 (manual refund) → `audit_logs` row stamped with `internal_action='refund_issued'` + `trigger=dispute_finding_upheld`.

**Auto-decline copy** (Vega B0 billing UI on declined-refund cases):

> _"Your refund request falls outside automatic eligibility. We've forwarded it to our compliance team for review — expect a response within 5 business days. You can also dispute a specific finding for a re-audit."_

---

## 5. Per-trigger operational procedure

### 5.1 EU/UK cooling-off refund (AUTO)

**Trigger:** webhook `customer.subscription.deleted` fires, OR customer hits B-CAN-REGIONAL inside open window.

**Algorithm:**

```
1. Eligibility check per §4.1 → must return a cooling_off_windows row.
2. Compute refund amount:
   - If trigger_event='subscribe': full refund of all paid amounts on this
     subscription (= `subscriptions.current_period_paid_amount_cents` —
     populated by webhook from invoice.payment_succeeded events).
   - If trigger_event='upgrade': full refund of the upgrade increment only
     (= upgrade invoice amount, NOT cumulative subscription cost).
3. Issue Stripe refund per §2 with:
     idempotencyKey: refund:cooloff:<sub_id>:<window_id>
     reason: 'requested_by_customer'
     metadata.trigger: 'cooloff_eu_uk'
4. On Stripe success:
   - UPDATE cooling_off_windows
     SET exercised_at=now(), refund_amount_cents=<refund_cents>
     WHERE id=<window_id>
   - INSERT audit_logs (action='refund_issued',
       metadata={trigger:'cooloff_eu_uk', refund_id, amount_cents,
                  idempotency_key_used, cooling_off_window_id})
   - INSERT billing_events synthetic row with
     stripe_event_id='refund_initiated:<refund_id>' (the real
     refund.created webhook will follow with its own event_id; both retained)
5. On Stripe failure: do NOT mark window exercised; surface 500 to caller;
   Watch alerts; retry via cron (Ledger's M3 deliverable).
```

**Settlement:** 5-10 business days for bank settle. Customer-facing email per `refund-matrix.md` §8.6 (Herald polishes).

### 5.2 California SB 313 pro-rata refund (AUTO)

**Trigger:** `customer.subscription.deleted` fires, customer region='ca', cancellation is mid-period.

**Algorithm:**

```
1. Eligibility check per §4.2.
2. Compute pro-rata refund:
     days_remaining = days_between(canceled_at, current_period_end)
     days_in_period = days_between(current_period_start, current_period_end)
     refund_cents = floor((days_remaining / days_in_period) * plan_price_cents)
   (Rounding favors customer per Comply read of UCL §17200 — floor on the
   ratio means we slightly over-credit days_remaining vs days_in_period;
   acceptable per Comply.)
3. Issue Stripe refund per §2 with:
     idempotencyKey: refund:sb313:<sub_id>:<cancel_event_id>
     amount: refund_cents
     reason: 'requested_by_customer'
     metadata.trigger: 'sb313_ca'
4. On success:
   - INSERT audit_logs (action='refund_issued', metadata={trigger:'sb313_ca',
       refund_id, refund_cents, days_remaining, days_in_period,
       idempotency_key_used})
   - INSERT billing_events synthetic row
5. Customer-facing email per refund-matrix.md §8.7.
```

### 5.3 Dispute Finding upheld / partial (MANUAL)

**Trigger:** Comply review of `disputes` row marks outcome.

**Procedure:**

1. **Comply** reviews dispute via internal ops dashboard (M3 deliverable; M2 = direct DB UPDATE by Comply per `compliance/stripe-dispute-runbook.md` placeholder).
2. **Comply** sets:
   ```sql
   UPDATE disputes
   SET state='resolved_refund', refund_amount_cents=<determined_amount>,
       resolved_at=now(), resolved_by=<comply_user_id>, resolution_notes=<text>
   WHERE id=<dispute_id>;
   ```
3. **Ledger ops endpoint** (`POST /api/admin/refunds/execute` — M2 deliverable; Comply-only access via RBAC):
   - Reads the `disputes` row
   - Issues Stripe refund per §2 with:
     ```
     idempotencyKey: refund:dispute:<dispute_id>
     amount: refund_amount_cents
     reason: 'requested_by_customer'
     metadata.trigger: 'dispute_finding_upheld' (or 'dispute_finding_partial')
     ```
4. On success:
   - INSERT audit_logs (action='refund_issued', metadata={trigger,
     dispute_id, refund_id, amount, idempotency_key_used,
     approved_by:<comply_user_id>})
   - INSERT billing_events synthetic row
   - Herald sends dispute-resolution email

### 5.4 Failed-synth timeout refund (AUTO — Managed only)

**Trigger:** Forge's runner emits `failed_synth_timeout` state (PRD §14.2 + D21).

**Procedure:**

1. Runner emits state transition → audit row `audit_logs.action='admin_action'` with `internal_action='run_failed_synth'`.
2. Ledger's M2 refund handler (`/api/internal/refunds/synth-stall` — internal-only, runner-service-role auth):
   - Looks up token cost: `runs.tokens_used * cost_per_token` (Managed only; BYOK uses customer's tokens — no refund owed)
   - Issues Stripe refund per §2 with:
     ```
     idempotencyKey: refund:synthstall:<run_id>
     amount: token_cost_cents  (translated via current Anthropic pricing)
     reason: 'requested_by_customer'
     metadata.trigger: 'failed_synth_timeout'
     ```
3. Audit row + billing_events row stamped per §5.1 step 4.
4. Herald fires "We're refunding the tokens for run X" email.

**Note:** the BYOK platform-fee is UNAFFECTED by failed-synth. The subscription remains active. Only the Managed token cost is refunded.

### 5.5 Auto-PR rejection refund (AUTO — V1.5)

**Trigger:** V1.5 Jury re-audit FAILs on the proposed PR (PRD C6 negative test).

**Procedure:**

1. V1.5 Jury emits `fix_pr_jobs.state='re_audit_failed'`.
2. Refund handler (`/api/internal/refunds/autopr-rejection`):
   - Looks up `fix_pr_jobs.stripe_payment_intent_id`
   - Issues Stripe refund per §2 with:
     ```
     idempotencyKey: refund:autopr:<run_id>
     amount: 4900 (full $49)
     reason: 'requested_by_customer'
     metadata.trigger: 'autopr_rejection'
     ```
3. Audit + billing_events + Herald email "Your Auto-PR didn't pass our quality bar — refunded".

### 5.6 Chargeback resolution (AUTO BY STRIPE)

**Trigger:** Stripe `charge.dispute.closed` with `outcome=lost`.

**Procedure:**

1. Webhook handler at `apps/web/app/api/webhooks/stripe/route.ts` (M2 already handles via `handleDisputeCreated` and a parallel `handleDisputeClosed` to be added in M2 Batch 3) processes the event.
2. Stripe has already reversed the charge — no Stripe API call required from us.
3. UPDATE `disputes` row: `outcome='lost'`, `resolved_at=now()`.
4. INSERT audit_logs (action='refund_issued', metadata={trigger:'chargeback_lost', dispute_id, charge_id}) — no `idempotency_key_used` because we didn't initiate.
5. Comply review for fraud-blocklist evaluation per `agents/persona-rules.md` rule 4.

### 5.7 AUP termination refund (MANUAL)

**Trigger:** Comply terminates a customer per PRD §14.7.

**Procedure:**

1. Comply opens `disputes` row OR direct termination ticket.
2. Comply determines refund amount per regional law (EU/UK defensive full; CA pro-rata; US other 49 typically none unless §14.7 carve-out applies; ROW defensive pro-rata).
3. Ledger executes via `/api/admin/refunds/execute` with `idempotencyKey: refund:aup:<sub_id>:<termination_event_id>`.
4. Audit row + billing_events row + Herald email "Account terminated per AUP — refund issued where applicable".

---

## 6. The internal refund endpoint contract (Forge implements)

### 6.1 `/api/admin/refunds/execute` (Comply + Ledger access)

- **Method:** `POST`
- **Auth:** Service-role JWT + RBAC check (`user.role IN ('comply','ledger','admin')`)
- **Body:**
  ```json
  {
    "subscription_id": "uuid",
    "trigger": "dispute_finding_upheld | dispute_finding_partial | aup_termination | ftc_cancel_with_refund",
    "amount_cents": 9900,
    "reason": "requested_by_customer | duplicate | fraudulent",
    "metadata": {
      "dispute_id": "uuid?",
      "termination_event_id": "uuid?",
      "approved_by": "<comply user id>",
      "notes": "<free text>"
    }
  }
  ```
- **Idempotency key derivation:** server constructs per §3 from `trigger` + `subscription_id` + relevant disambiguator.
- **Response:**
  ```json
  {
    "refund_id": "re_...",
    "amount_cents": 9900,
    "status": "succeeded | pending | failed",
    "audit_log_id": "uuid",
    "settlement_eta": "5-10 business days"
  }
  ```

### 6.2 `/api/internal/refunds/synth-stall` (runner service-role only)

- **Method:** `POST`
- **Auth:** Runner service-role JWT (no human caller)
- **Body:** `{ "run_id": "uuid" }`
- **Idempotency:** server constructs key per §3
- **Side effects:** as §5.4

### 6.3 `/api/internal/refunds/autopr-rejection` (V1.5; Jury service-role)

Same shape as §6.2 but for V1.5 Auto-PR path.

---

## 7. Audit log entry — canonical shape

Every refund (regardless of trigger) MUST write a corresponding `audit_logs` row:

```sql
INSERT INTO audit_logs (
  tenant_id, user_id, action, metadata
) VALUES (
  $tenant_id,
  COALESCE($user_id, NULL),       -- NULL for system-initiated triggers
  'refund_issued',                 -- ← NEW enum value Atlas adds in 0003
  jsonb_build_object(
    'trigger', $trigger,           -- §1 enum
    'refund_id', $stripe_refund_id,
    'amount_cents', $amount_cents,
    'currency', $currency,
    'subscription_id', $subscription_id,
    'run_id', $run_id,             -- if V1.5 Auto-PR
    'dispute_id', $dispute_id,     -- if dispute-driven
    'cooling_off_window_id', $window_id, -- if cooloff-driven
    'idempotency_key_used', $idempotency_key,
    'approved_by', $comply_user_id,-- if manual
    'reason_text', $reason_notes   -- if manual
  )
);
```

**Atlas action item (M2):** add `'refund_issued'` to the `audit_action` enum in `0003_billing_managed.sql`. Without this, the INSERT fails the enum check and refund execution rolls back.

---

## 8. Customer-facing communication

Per region, refund triggers Herald email (copy locked in `refund-matrix.md` §8):

| Trigger                  | Email template                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `cooloff_eu_uk`          | §8.6 — "Your Studio Zero refund is processing"                                          |
| `sb313_ca`               | §8.7 — "Your Studio Zero subscription is cancelled, with a partial refund"              |
| `dispute_finding_upheld` | Custom — references the specific finding + the resolution                               |
| `failed_synth_timeout`   | Custom — "We're refunding the tokens for run X"                                         |
| `autopr_rejection`       | Custom (V1.5) — "Auto-PR didn't pass our re-audit; refund issued"                       |
| `aup_termination`        | §14.7-specific (Comply locks)                                                           |
| `chargeback_lost`        | No email from Studio Zero (customer's bank handles) — internal Comply notification only |

---

## 9. Watch alerting

Watch monitors refund operations via `audit_logs` queries:

| Metric                            | Threshold                                    | Action                                                           |
| --------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Refund rate (last 30 days)        | >5% of all charges                           | Page Penny + Comply — pricing or quality issue                   |
| Auto-refund failure rate          | >1%                                          | Page Ledger — Stripe API integration issue                       |
| `dispute_finding_upheld` rate     | >2% of all runs                              | Page Jury + Comply — verdict quality                             |
| Cooling-off exercise rate (EU/UK) | >10% of EU/UK subscriptions                  | Page Penny — pricing or expectation-setting issue in that region |
| Manual refund SLA breach          | refund_at - dispute_resolved_at > 5 biz days | Page Ledger + Comply                                             |

---

## 10. Verification — exit gate

Automated (Verify, M2):

- `tests/integration/refund-cooling-off-auto.spec.ts` — EU customer subscribes without waiver → cancels day 7 → eligibility check passes → Stripe refund issued → `cooling_off_windows.exercised_at` set → `audit_logs.refund_issued` row present → idempotency-replay returns same Refund ID
- `tests/integration/refund-sb313-prorata-auto.spec.ts` — California customer cancels day 15 of 30-day period → pro-rata = 50% → Stripe refund issued → audit row + billing_events row
- `tests/integration/refund-idempotency-replay.spec.ts` — same trigger key called twice → exactly one Stripe Refund object returned, exactly one audit row
- `tests/integration/refund-ineligible-decline.spec.ts` — US-other customer mid-period cancel → eligibility checks return empty → no refund auto-issued, audit_logs records the decline
- V1.5: `tests/integration/refund-autopr-rejection.spec.ts`

Manual smoke (Test mode):

- [ ] EU customer Test-mode subscribe (region=eu, waiver=false) → cancel day 5 → verify Stripe refund issued with idempotency key `refund:cooloff:<sub>:<window>`
- [ ] California customer (region=ca) → mid-period cancel → verify pro-rata calculation matches `floor((days_remaining/days_in_period) * plan_price)`
- [ ] Manual dispute upheld → Comply triggers `/api/admin/refunds/execute` → Stripe refund + audit row

---

## 11. Open follow-ups

- **`refund_issued` enum value** (Atlas, M2): add to `audit_action` in `0003_billing_managed.sql` before this runbook is operationally live.
- **`/api/admin/refunds/execute` endpoint** (Forge, M2 Batch 3): implement per §6.1 with RBAC + idempotency-key derivation server-side.
- **FTC cancel-with-refund button** (Comply, M2): policy decision pending — currently §1 marks `ftc_cancel_with_refund` as manual-only outside CA + EU/UK. If Comply confirms "no refund outside regional law", §1 row stays manual.
- **Refund retry on Stripe-API failure** (Ledger, M3): currently §5.1 step 5 surfaces 500; M3 adds cron-driven retry for transient Stripe-API failures.
- **Watch alerts wired** (Watch, M2): metrics in §9 are spec; Watch implements queries in M2 Batch 3.

---

_Owner: Ledger · M2 Batch 2 · Operational; ready for Forge (endpoint) + Atlas (enum) + Verify (tests) to land at M2 Batch 3._
