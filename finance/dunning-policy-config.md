# Dunning Policy Configuration — Studio Zero

**Owner:** Ledger
**Status:** M2 Batch 2 — operationally executable. Jo configures in Stripe Dashboard (Settings → Billing → Subscriptions and emails) per §1 below; Herald owns email copy per §3.
**Spec source:** `finance/stripe-config.md` §5; `finance/refund-matrix.md` §8 (EU/UK cooling-off cancellation overlap); `agents/growth/herald-brand-voice.md` (email content lock).
**Code consumers:**

- `apps/web/app/api/webhooks/stripe/route.ts` `handleInvoicePaymentFailed` (line 582) — flips `subscriptions.status='past_due'` and emits `dunning_step` audit event.
- Herald M4 pipeline — consumes `audit_logs.action='admin_action'` + `metadata.internal_action='dunning_step'` to fire email per cadence §2 below.

**Legal anchors:** FTC 16 CFR §425.4 (cancel-in-same-channel; dunning emails MUST include a Customer Portal link) + EU CRD Art. 11(1) + Stripe Services Agreement §3 (max 4 retries / 30d per Stripe Smart Retries default — we configure 3 retries / 21d for tighter customer experience).

---

## 1. Stripe Smart Retries configuration

Apply in Stripe Dashboard → Settings → Billing → **Subscriptions and emails** → **Smart Retries**.

| Field                                 | Value                                          | Rationale                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Smart Retries**                     | **Enable**                                     | Stripe's machine-learning retry algorithm beats hand-rolled cron-driven retries on net-recovery rate (Stripe-documented ~30% lift).                                                                                                                                                                                              |
| **Maximum retries**                   | **3**                                          | Tighter than the Stripe default of 4. Three retries over 21 days exhausts the bulk of recoverable declines (Stripe data: 80%+ of recoverable declines recover within 14 days; the 4th attempt has diminishing returns and adds friction.)                                                                                        |
| **Retry window**                      | **21 days**                                    | Aligned to `finance/stripe-config.md` §5.1. PRD §14.2 originally said "4 retries over 30 days"; Ledger aligned this to 3/21 for tighter UX. EC-4 in `ia/user-flows/billing-and-cancel.md` flagged for doc-fix (Trace owns sync).                                                                                                 |
| **Retry schedule**                    | Day 0 (immediate auto), Day 3, Day 7, Day 14   | **OVERRIDE Smart Retries defaults** with a fixed schedule. Smart Retries default windows are non-deterministic; for FTC compliance + Comply audit + Watch alerting, we lock the schedule. Configurable in Dashboard.                                                                                                             |
| **Email notifications (Stripe-sent)** | **DISABLE all**                                | Herald owns email; Stripe's default emails conflict with Herald brand voice and would create double-emails. Disable: "Send email when subscription becomes past due", "Send email when subscription is canceled due to non-payment", "Send email before card expires", "Send invoice emails for invoices created automatically". |
| **Final-fail action**                 | **Cancel subscription** at end of retry window | Webhook fires `customer.subscription.deleted`; our handler transitions to `canceled_unpaid` state per §2.                                                                                                                                                                                                                        |
| **Grace period before final-fail**    | **7 days**                                     | After retry 3 (Day 14) fails, the customer has 7 additional days of `past_due` state with degraded service (see §4) before the subscription auto-cancels at Day 21. Total dunning window: 21 days.                                                                                                                               |

---

## 2. Dunning state machine (overlay on Stripe Smart Retries)

| Event                                        | T    | `subscriptions.status`    | Stripe action                                | Studio Zero action                                                                                         |
| -------------------------------------------- | ---- | ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `invoice.payment_failed` (attempt 1)         | T+0  | `past_due`                | Stripe auto-retries Day 3                    | Herald email + in-app banner + `audit_logs.dunning_step`                                                   |
| `invoice.payment_failed` (attempt 2)         | T+3  | `past_due`                | Stripe auto-retries Day 7                    | Herald email + `audit_logs.dunning_step`                                                                   |
| `invoice.payment_failed` (attempt 3 = final) | T+7  | `past_due`                | Stripe auto-retries Day 14 (final)           | Herald email "Last try" + in-app banner + grace warning + `audit_logs.dunning_step`                        |
| `invoice.payment_failed` (final retry)       | T+14 | `past_due` (grace begins) | No further Stripe retry                      | Herald email "Grace period — 7 days to update card" + `audit_logs.dunning_step`                            |
| Grace expires                                | T+21 | `canceled_unpaid`         | Stripe emits `customer.subscription.deleted` | Herald cancellation email + UPDATE `subscriptions.status='canceled_unpaid'` + `tenants.plan='free'` revert |

**Cadence summary** (matches the brief — five email touchpoints):

- **T+0:** email + in-app banner
- **T+3:** email
- **T+7:** email + grace warning
- **T+14:** email + final warning
- **T+21:** cancellation email

**Why this differs from `finance/stripe-config.md` §5.2** (which lists T+0/+3/+10/+17/+21): the brief explicitly specifies T+0/+3/+7/+14/+21. This document overrides stripe-config.md §5.2 cadence — Ledger updates §5.2 to match in the cross-ref pointer at §10 of stripe-config.md. Trace + Verify update test fixtures to match T+0/+3/+7/+14/+21.

---

## 3. Email cadence triggers (Herald owns content; Ledger specs timing)

Herald-owned content lives in `agents/growth/herald-brand-voice.md` (copy templates) and is fired by the Herald M4 pipeline reading `audit_logs.dunning_step` events. Ledger's contract:

### 3.1 Trigger source

Forge's webhook handler at `apps/web/app/api/webhooks/stripe/route.ts:582` already emits:

```ts
await audit(supabase, tenantId, "dunning_step", {
  stripe_subscription_id: subId,
  invoice_id: inv.id,
  attempt: inv.attempt_count ?? null,
});
```

Herald M4 consumes `internal_action=dunning_step` audit rows and fires email per `attempt` value:

| `attempt`       | T    | Email template (Herald)                                                                      | Trigger logic                                                                                                                                                     |
| --------------- | ---- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1               | T+0  | `dunning_email_attempt_1.html` ("We couldn't bill your card")                                | Fire immediately on `invoice.payment_failed` with `attempt=1`                                                                                                     |
| 2               | T+3  | `dunning_email_attempt_2.html` ("Second try — update your card")                             | Fire on `invoice.payment_failed` with `attempt=2`                                                                                                                 |
| 3               | T+7  | `dunning_email_attempt_3.html` ("Last try — we'll pause your subscription if we can't bill") | Fire on `invoice.payment_failed` with `attempt=3` (final retry)                                                                                                   |
| (grace warning) | T+14 | `dunning_email_grace.html` ("Your subscription pauses in 7 days")                            | Fire on detection of `attempt=3 + grace_window_active`; cron-driven nightly check on `subscriptions.status='past_due' AND updated_at < now() - interval '7 days'` |
| (cancellation)  | T+21 | `dunning_email_cancelled.html` ("Subscription cancelled — re-subscribe anytime")             | Fire on `customer.subscription.deleted` webhook where preceding status was `past_due` (i.e., dunning-driven cancel, not customer-initiated cancel)                |

### 3.2 Required content in every dunning email (legal + UX hard rules)

Herald must include the following in every dunning email template:

- [x] **Customer Portal "Update payment method" deep-link.** Stripe-generated session URL; 1-hour expiry; Forge mints via `/api/billing/portal-session?return=dunning&invoice_id=<id>`. Per `finance/stripe-customer-portal-config.md` §6.
- [x] **Plain-language explanation** of what happens next (what date, what status change). FTC §425.5 misrepresentation prohibition + EU CRD Art. 6(1) pre-contractual info parity.
- [x] **"Switch to free plan" CTA** (one-click cancellation via Customer Portal). FTC 16 CFR 425 cancel-in-same-channel; gives customer an honest off-ramp instead of forcing chargeback.
- [x] **Support contact** (`support@studiozero.dev`). Echo owns the inbox.
- [x] **Re-subscribe / dispute link** (in the cancellation email at T+21). EU CRD residual rights notice.

Drafts at `finance/refund-matrix.md` §8.8 (Herald polishes voice; Comply locks legal text).

### 3.3 Anti-spam guardrails

- **Email frequency cap:** maximum 5 dunning emails per subscription per dunning cycle (T+0, +3, +7, +14, +21). If retries somehow extend (Stripe edge case), no further emails fire — banner-only.
- **Unsubscribe-from-dunning:** **NOT ALLOWED**. Dunning emails are transactional under CAN-SPAM (15 U.S.C. §7702(2)(A)); the customer cannot opt out without canceling the subscription. Herald copy makes this explicit.
- **Idempotency:** Herald M4 pipeline deduplicates by `(subscription_id, attempt)` tuple — replayed audit events do NOT re-fire emails.

---

## 4. Service degradation during dunning

Per `finance/stripe-config.md` §5.3 + PRD §14.2 partial-result rule:

| Subscription state                 | Run dispatch                                    | UI banner                                                        | Existing-data access                         |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `active`                           | Normal                                          | None                                                             | Full                                         |
| `past_due` (attempt 1 → 3)         | **403 `subscription_past_due`** with retry-hint | "Your card was declined; update payment method" + Portal link    | **Read-only** preserved (no destructive ops) |
| `past_due` (grace, post-attempt 3) | 403                                             | "Grace period: <N> days until subscription pauses" + Portal link | Read-only                                    |
| `canceled_unpaid`                  | 403                                             | "Subscription cancelled; account is now free tier"               | Read-only; free-tier limits apply            |

**Existing in-flight runs at `past_due` transition:** complete normally (token-refund grace per PRD §14.2). The dispatch gate fires only on NEW run starts.

---

## 5. Regional considerations

### 5.1 EU / UK — cooling-off window overlap

If a customer is in an open `cooling_off_windows` row (waiver unsigned, `expires_at > now()`) AND their card fails dunning:

- **Cancel-driven refund still applies** at the end of the cooling-off window if customer takes no action and cancellation processes.
- The Day-21 cancellation event triggers a region-aware refund check per `finance/refund-matrix.md` §6.3: query `cooling_off_windows` → if open → issue full refund per `finance/refund-operations-runbook.md` §3.
- **Dunning grace + cooling-off grace do NOT extend each other** — they run in parallel. The longer of the two governs the actual cancellation timing.

### 5.2 EU / UK — 14-day cooling-off vs dunning timeline overlap

The 14-day cooling-off window starts at signup; dunning starts at first invoice fail. For a monthly subscriber, the second invoice (and thus first possible dunning event) falls at T+30, by which point the cooling-off window has already closed (or been reset by an upgrade). For an annual subscriber, the cooling-off window closes at T+14 and the first possible dunning event is T+365. **No regulatory overlap in practice** unless the customer is on a weekly plan (we do not offer one).

### 5.3 California — SB 313 pro-rata

If subscription cancels via dunning (T+21) AND customer is in California: California SB 313 pro-rata refund **does not apply** to dunning-driven cancellations because the customer failed to pay for the period — there is no "unused subscription period paid for" to refund. The dunning-cancellation email at T+21 includes this explanation.

**Exception:** if the customer paid mid-period and THEN dunning kicked off on the NEXT invoice (e.g., annual subscription that fails the renewal): the cancellation is end-of-current-period (the period they already paid for), not mid-period. No refund owed.

### 5.4 Other regions

Per `finance/refund-matrix.md` §2 — no statutory pro-rata in US (other 49) or ROW for dunning cancellations. The cancellation email at T+21 is the final touch; subscription transitions to `canceled_unpaid`.

---

## 6. Watch alerts (Siren routing)

Watch monitors dunning health via `audit_logs` queries. Thresholds:

| Metric                                      | Threshold                    | Action                                                |
| ------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| Dunning-cancellation rate                   | >5% of active subs per month | Page Penny + Hook — pricing or onboarding issue       |
| Average dunning-recovery rate               | <30% (Stripe benchmark ~40%) | Page Ledger — re-tune retry schedule or email cadence |
| Single tenant: 3+ dunning events in 90 days | (per tenant)                 | Page Echo — proactive support outreach                |
| Stripe Smart Retries disabled               | (config drift)               | Page Cipher + Ledger — config integrity check         |

---

## 7. Provisioning procedure

1. Stripe Dashboard → **Settings → Billing → Subscriptions and emails**.
2. **Smart Retries:**
   - Toggle ON
   - Maximum retries: 3
   - Retry days: Day 3, Day 7, Day 14 (after the initial Day 0 attempt)
   - Final-fail action: **Cancel subscription**
3. **Subscription emails (Stripe-generated):** disable all 4 toggles (see §1 row "Email notifications").
4. **Invoice emails:** disable "Send invoice emails for invoices created automatically" (Herald handles).
5. **Save.**
6. Confirm via Stripe CLI:
   ```
   stripe billing settings retrieve
   ```
   Expected: `retry_policy.max_attempts=3`, `email_notifications.*=false`.

---

## 8. Verification — exit gate

Manual smoke (Test mode):

- [ ] Create Test-mode subscription with card `4000 0000 0000 0341` (auto-declines on first renewal).
- [ ] Wait for renewal → expect `invoice.payment_failed` webhook → `subscriptions.status='past_due'` → `audit_logs.dunning_step` row inserted → Herald T+0 email queued.
- [ ] Advance time (Stripe Test Clocks) by 3 days → expect 2nd retry + Herald T+3 email.
- [ ] Advance 4 more days → 3rd retry + T+7 email.
- [ ] Advance 7 more days → 4th retry (FAILS — Smart Retries max 3) → T+14 grace email.
- [ ] Advance 7 more days → `customer.subscription.deleted` → `subscriptions.status='canceled_unpaid'` + `tenants.plan='free'` + T+21 cancellation email.
- [ ] Verify every email contains: Portal link, plain-language status, free-plan CTA, support contact.

Automated (Verify, M2):

- `tests/integration/dunning-cadence-21d.spec.ts` — asserts 5 email triggers at T+0/+3/+7/+14/+21 with correct templates
- `tests/integration/dunning-cancellation-state.spec.ts` — asserts `canceled_unpaid` state transition + `tenants.plan='free'` revert

---

## 9. Open follow-ups

- **EC-4 doc-fix (Trace, M2):** `ia/user-flows/billing-and-cancel.md` line 189 says "4 retries over 30 days"; this config is 3 retries over 21 days. Trace updates the flow doc.
- **`canceled_unpaid` enum value (Atlas, M2):** add to `subscription_status` enum in `0003_billing_managed.sql` if not already present (Atlas's f67ef63 added other M2 enum values; verify this one lands).
- **EU/UK Herald email variants** when Locale opens; current Herald copy is en-US default.
- **In-app banner copy** (Vega owns) — locked per `agents/growth/herald-brand-voice.md` `banner_dunning_*`; surface at every page within `/app` while `status='past_due'`.

---

_Owner: Ledger · M2 Batch 2 · Operational; ready for Jo + Herald to deploy._
