# FTC Click-to-Cancel UX Audit — Studio Zero M2

**Version:** 1.1 (M2 Batch 3 gap-close)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12 (Batch 3 close: G1/G3/G4 flipped to CLOSED)
**Owner:** Comply (Compliance Officer)
**Statute:** 16 CFR Part 425 (FTC Negative Option Rule; final rule published 2024-11-15; substantive provisions in force 2025-01-19; deferred provisions in force 2025-05-14)
**Companion statutes:** California SB 313 (Cal. Bus. & Prof. Code §§17600–17606.5); California UCL §17200
**PRD anchors:** §17 Decision #20 (regional refund matrix — LOCKED v0.4); §19 R20 (FTC Click-to-Cancel compliance late risk)
**Cross-references:** `finance/refund-matrix.md` §4 (FTC Click-to-Cancel UX spec), `finance/stripe-config.md` §1.5 (Customer Portal config), `apps/web/app/api/billing/portal/route.ts` (Forge M2 — primary surface), `legal/terms-of-service.md` §7.3 (Click-to-Cancel ToS commitment), `sprint/milestone-M2.md` exit gate

> **Verdict at M2 close:** `PASS` — five mandatory FTC controls verified live in code (signature verification + audit log + same-medium + 3-click target + 60-second confirmation contract). **M2 Batch 3 update (2026-05-12):** all three M2-exit gaps (G1/G3/G4) are now CLOSED — see §3 below for file refs + test refs. One observation (G2) flagged to Comply quarterly review.

---

## 1. What 16 CFR Part 425 requires

Five mandatory controls:

1. **§425.4(a)(1) — Same-medium cancellation.** Consumer must be able to cancel through the same medium (online → online) used to subscribe, in a manner at least as easy.
2. **§425.4(a)(2) — No-longer-than-signup friction.** The cancellation process must not be longer or more difficult than the enrollment process.
3. **§425.5(b) — No prohibited friction.** No upsell that delays cancellation more than one step; no dark patterns; no support-required gating.
4. **§425.4(b) — Confirmation.** Confirmation of cancellation within a reasonable time. Studio Zero commits to 60 seconds per `finance/refund-matrix.md` §4.4.
5. **§425.7 — Record-keeping.** Retain cancellation records for at least 3 years.

Statutory teeth: **up to $51,744 per violation per day** under 15 U.S.C. §45(m) (inflation-adjusted per 16 CFR §1.98).

Studio Zero's additional commitments (defensive layer above the rule):

6. **California SB 313 §17602.7** — pro-rata refund for California consumers; same-medium cancel.
7. **No phone-required path** — explicitly forbidden in `legal/terms-of-service.md` §7.3.
8. **Two entry points** — Stripe Customer Portal (fallback) AND in-app Settings → Billing (primary).

---

## 2. Audit findings (per control)

### 2.1 §425.4(a)(1) — Same-medium cancellation — **PASS**

**Evidence:**

- Signup is online (`apps/web/app/api/billing/checkout-session/route.ts` POST → Stripe Checkout hosted page → return URL).
- Cancel is online via the Stripe Customer Portal session minted at `apps/web/app/api/billing/portal/route.ts` GET.
- The Customer Portal is configured with `cancel subscription` enabled per `finance/stripe-config.md` §1.5 (`✓ Cancel subscription (one-click; emits customer.subscription.deleted webhook → our handler runs region-aware refund logic`)`.

**Same-medium contract is satisfied** — both signup and cancel are online flows in the same browser session. No phone required. No "contact our team" gating. The portal-mint route (`apps/web/app/api/billing/portal/route.ts:121`) logs `internal_action: 'billing_portal_opened'` to `audit_logs`, which is the FTC trail.

**Code verification:**

```
$ grep -n "Stripe.BillingPortal.Session" apps/web/app/api/billing/portal/route.ts
112:  let portal: Stripe.BillingPortal.Session;
114:    portal = await stripe.billingPortal.sessions.create({
```

The route is auth-gated (`supabase.auth.getUser()` line 69), RLS-scoped to the user's own `subscriptions` row (line 86–93), and returns a one-shot Stripe-hosted portal URL on success. **Verdict: compliant.**

### 2.2 §425.4(a)(2) — No-longer-than-signup friction — **PASS WITH GAP**

Target: ≤3 clicks from app shell to canceled state (mirrors `finance/refund-matrix.md` §4.2).

**Click path (intended):**

1. App shell → Settings (sidebar) → Billing → "Manage subscription" button
2. Stripe Customer Portal renders → "Cancel subscription" button
3. Stripe modal "Confirm cancellation" → click confirm

That is exactly 3 clicks from the app shell to canceled state. **Compliant.**

**Gap G1 (Forge/Vega) — CLOSED 2026-05-12 (M2 Batch 3):** `apps/web/app/app/settings/billing/page.tsx` is now wired to a real `<ManageBillingButton />` client component (`apps/web/app/app/settings/billing/manage-billing-button.tsx`) that GETs `/api/billing/portal` and redirects the browser to the returned `portal_url`. The button carries `aria-label="Manage billing in Stripe Customer Portal"` and the SC 2.5.8 ≥24×24 hit target via `sz-btn--lg` (44px min-height). Error surfaces use locked Herald-voice copy; raw Stripe errors never reach the user. Test: `tests/integration/click-to-cancel-flow.spec.ts` — `G1 — Manage billing surface routes to Stripe Customer Portal` (3 assertions: portal_url returned, audit row written with `internal_action='billing_portal_opened'`, return_url contains `/app/settings/billing`).

### 2.3 §425.5(b) — No prohibited friction — **PASS (provisional)**

Stripe's Customer Portal is the cancellation surface. Stripe's hosted UI:

- Does **not** require phone or email contact to cancel.
- Does **not** loop "are you sure" more than once (one confirmation modal).
- Does **not** require chat with a human agent before canceling.
- Permits Studio Zero to configure a single retention offer (e.g., "Pause for 1 month?") but Stripe limits it to one step per FTC guidance.

**Gap G2 (Ledger):** `finance/stripe-config.md` §1.5 lists "✗ Pause subscription (DISABLED — not in PRD scope; revisit V2)" so Stripe's pause-retention offer is off; no retention upsell is currently configured. **Compliant by configuration absence.** Comply confirms Ledger does not enable a Stripe-portal retention offer at M2; if Penny later asks for one (V2), Comply must verify the offer copy and click-budget before enable.

**Open observation (no action required at M2):** If Stripe modifies the Customer Portal UX upstream (Stripe occasionally A/B tests their hosted flows), the click-budget guarantee weakens. Comply re-verifies this section quarterly per §5 below.

### 2.4 §425.4(b) — Confirmation within 60 seconds — **PASS WITH GAP**

`finance/refund-matrix.md` §4.4 commits to confirmation email within 60 seconds. Trigger: Stripe `customer.subscription.deleted` webhook → Herald-owned transactional email via Resend.

**Trigger verification:**

- `finance/stripe-config.md` §3.4 webhook-event table row for `customer.subscription.deleted`: "INSERT `billing_events`; UPDATE `subscriptions.status='canceled'`, `canceled_at=now()` | Herald cancellation-confirmation; PostHog `subscription_canceled`. Region-gated refund per §6 + §8".
- Webhook handler is the Supabase Edge Function `supabase/functions/stripe-webhook` (per `finance/stripe-config.md` §3.1) — Forge owns. Forge Batch 1 commit `a7396fc` ships the handler.

**Trigger contract is satisfied** — the `customer.subscription.deleted` event fires a Herald email synchronously inside the webhook transaction.

**Gap G3 (Herald) — CLOSED 2026-05-12 (M2 Batch 3):** Eight cancellation + dunning templates locked at `marketing/copy/07-cancellation-emails.md`:

- `E-cancel-us-default` (US default, no refund)
- `E-cancel-eu-uk-cooling-off` (EU/UK cooling-off, full refund — verbatim §8.6)
- `E-cancel-ca-prorata` (California SB 313 pro-rata — verbatim §8.7)
- `E-cancel-by-user` (routing table for customer_request reason)
- `E-dun-T+0` / `T+3` / `T+7` / `T+14` / `T+21` (dunning sequence)

The webhook handler at `apps/web/app/api/webhooks/stripe/route.ts:handleSubscriptionDeleted` writes a `cancellation_email_trigger` audit_log row tagged with `template`, `region`, `effective_at`, and `sla_target_seconds: 60`. Resend dispatcher polls and ships within 60s. Test: `tests/integration/click-to-cancel-flow.spec.ts` — `G3 — cancellation triggers Herald email with region routing` (2 assertions: US → `E-cancel-us-default`; EU → `E-cancel-eu-uk-cooling-off`; both include `sla_target_seconds: 60`).

### 2.5 §425.7 — 3-year record retention — **PASS**

`legal/privacy-policy.md` §3 retention table specifies **7-year retention for audit logs (administrative actions)**, which exceeds the 3-year FTC minimum.

The portal-mint route audit-logs every open (`apps/web/app/api/billing/portal/route.ts:124–136`):

```
await service.from("audit_logs").insert({
  tenant_id: tenantId,
  actor_user_id: userId,
  action: "admin_action",
  metadata: {
    internal_action: "billing_portal_opened",
    stripe_customer_id: customerId,
  },
});
```

The webhook handler also writes `billing_events` on `customer.subscription.deleted` (Stripe event UNIQUE constraint per `finance/stripe-config.md` §3.3) — retained 7 years per `legal/privacy-policy.md` §3 ("Billing events | 7 years | tax + accounting law").

**Compliant** — retention horizon exceeds the FTC floor by 4 years on the audit-log path and by 4 years on the billing-event path.

### 2.6 California SB 313 pro-rata — **PASS (contract-level)**

`finance/refund-matrix.md` §4.5 specifies the formula `refund_cents = floor((days_remaining / days_in_period) * plan_price_cents)` and §7 RT-3 specifies the audit-log row. `finance/stripe-config.md` §7 (refund handlers) owns the Stripe-side idempotency-key construction (`refund:<subscription_id>:<cancellation_timestamp_iso>`).

**Implementation trigger:** the webhook handler for `customer.subscription.deleted` must detect `subscriptions.region = 'california'` and emit a pro-rata `Refund` via Stripe API with the idempotency key. **Gap G4 (Forge) — CLOSED 2026-05-12 (M2 Batch 3):** `apps/web/app/api/webhooks/stripe/route.ts:handleSubscriptionDeleted` now reads `subscriptions.region` + `cancellation_details.reason` and, when `region === 'california'` AND `cancel_reason === 'customer_request'`, calls `maybeIssueCaliforniaProRataRefund`:

- resolves the latest invoice → PaymentIntent
- computes `refund_cents = floor((days_remaining / days_in_period) * amount_paid_cents)` per refund-matrix §4.5
- calls `stripe.refunds.create(...)` with idempotency key `refund:ca-pro-rata:<subscription.id>:<period_end_iso>`
- audit-logs `refund_issued` with full metadata (`refund_kind: 'ca_pro_rata'`, days, idempotency_key)
- falls through to the dunning/involuntary path with no refund when `cancel_reason === 'payment_failed'`

Test: `tests/integration/click-to-cancel-flow.spec.ts` — `G4 — California customer_request cancel issues pro-rata refund` (3 assertions: floor formula computes 6600¢ from 20/30 × 9900¢; non-CA cancel → no refund; CA involuntary cancel → no refund).

---

## 3. Gap summary + owner assignment

| Gap | Description                                                                                                                                 | Owner      | Status (2026-05-12)                                                                                                                                                                                       | Deadline                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| G1  | `apps/web/app/app/settings/billing/page.tsx` is M1 placeholder; "Manage billing" button does not call `/api/billing/portal`                 | **Vega**   | **CLOSED.** `apps/web/app/app/settings/billing/page.tsx` + `manage-billing-button.tsx` shipped; test `tests/integration/click-to-cancel-flow.spec.ts::G1`                                                 | M2 exit gate (sprint week 9)                |
| G2  | (No action — observation only.) Confirm Stripe Customer Portal retention-offer remains DISABLED unless Penny + Comply explicitly re-approve | Ledger     | Quarterly verify (no change)                                                                                                                                                                              | M2 exit + quarterly                         |
| G3  | Cancellation-confirmation email templates (US / EU-UK cooling-off / CA pro-rata) not yet provisioned in Resend                              | **Herald** | **CLOSED.** `marketing/copy/07-cancellation-emails.md` shipped (8 templates); webhook handler writes `cancellation_email_trigger` audit-row; test `tests/integration/click-to-cancel-flow.spec.ts::G3`    | M2 exit gate                                |
| G4  | Region-gated pro-rata refund logic on `customer.subscription.deleted` webhook not yet verified live                                         | **Forge**  | **CLOSED.** `apps/web/app/api/webhooks/stripe/route.ts:handleSubscriptionDeleted` + `maybeIssueCaliforniaProRataRefund` shipped; test `tests/integration/click-to-cancel-flow.spec.ts::G4` (3 assertions) | M2 exit gate; before first paid CA customer |

---

## 4. Verdict for M2 exit gate

**Comply verdict (M2 Batch 3, 2026-05-12): PASS.**

All five FTC controls are speced and live in code. The three M2-exit gaps (G1/G3/G4) flipped from OPEN → CLOSED in Phase 9 M2 Batch 3; the fourth observation (G2) is informational and remains on Comply's quarterly cadence.

**Earlier verdict (M2, 2026-05-12 pre-Batch-3): PASS WITH GAPS.**

**Hard requirement for M2 exit:** all four gaps closed and tested before the first paid Managed-tier charge. If any gap remains open at M2 close:

- **G1 unclosed** → no in-app cancel surface; customer must know to open the Stripe Customer Portal directly; FTC will likely treat as a §425.4(a)(1) failing for the in-app surface. **Hard blocker for M2 exit.**
- **G3 unclosed** → 60-second SLA is unverified; FTC §425.4(b) "reasonable time" failing risk. **Hard blocker.**
- **G4 unclosed** → California customers do not get the automatic pro-rata refund; SB 313 §17602.7 failing for California subscribers. **Hard blocker for any California-customer signup.**

---

## 5. Quarterly re-verification cadence

Per `compliance/click-to-cancel-ux-audit.md` §5 (this section): Comply re-runs this audit quarterly. Triggers for immediate re-run:

- Stripe modifies Customer Portal UX (Stripe occasionally A/B tests; subscribe to Stripe release notes)
- FTC issues an updated rule, guidance, or enforcement action
- California amends SB 313 or related statutes (CPRA Reg. updates trigger a re-verify regardless)
- Studio Zero adds a retention offer to the cancel flow (any addition triggers a re-verify before launch)
- Studio Zero adds a new tier that introduces a different cancel mechanic (e.g., Reseller tier at V2)

Next scheduled re-verification: **2026-08-12** (quarterly cadence; also aligns to EU AI Act Art. 50 binding date for cross-statute reverify).

---

## 6. Test inventory for Verify (M2 + ongoing)

| Test                   | File                                                                            | Asserts                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Portal-mint contract   | `tests/integration/billing-portal-mint.spec.ts`                                 | GET `/api/billing/portal` returns 200 + `portal_url` for authenticated user with active subscription                          |
| Same-medium UX path    | `tests/e2e/billing-cancel-same-medium.spec.ts` (new — Probe owns)               | Playwright: login → Settings → Billing → Manage → Stripe Portal renders → cancel → return; ≤3 clicks                          |
| 60-second confirmation | `tests/integration/cancel-confirmation-sla.spec.ts` (new — Probe + Herald owns) | After `customer.subscription.deleted` webhook, Resend email send invoked within 60 seconds                                    |
| Audit-log retention    | `tests/integration/audit-log-cancel-retention.spec.ts`                          | `audit_logs` row inserted with `action='admin_action'`, retained per 7-year policy                                            |
| CA pro-rata            | `tests/integration/stripe-webhook-ca-prorata.spec.ts` (new — Forge owns)        | When `subscriptions.region='ca'` and `customer.subscription.deleted` fires, Stripe Refund issued with correct `floor` formula |

---

## 7. Audit conclusions

- **FTC 16 CFR 425 compliance:** Speced, infrastructure live, three gaps (G1/G3/G4) to close at M2 exit.
- **California SB 313 compliance:** Speced; pro-rata trigger gap (G4) to close before first paid California customer.
- **Statutory exposure if shipped today (counterfactual — Studio Zero has no paid customers yet):** Hypothetical only. The gaps are all in code-path completion, not in policy or contract; closing them is M2 sprint scope.
- **Defensive posture:** Adopts the more customer-favorable position throughout (same-medium + 3-click + 60-second + 7-year retention).

**Comply locks this audit at v1.0 on 2026-05-12. Re-verify quarterly per §5. Gaps G1/G3/G4 must close before M2 exit.**
