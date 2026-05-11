# Flow: Billing & Cancel (D20 regional matrix is the spine)

**Owner:** Trace
**Personas affected:** all §5 personas. Billing-touchpoint personas include EU/UK/CA customers whose regional law overrides US-default policies.
**Mode applicability:** Managed primarily (subscription tier); BYOK + CLI for platform-fee subscriptions; Auto-PR one-time charges (V1.5).
**Acceptance test:** `tests/acceptance/e2e/billing-subscribe-eu.spec.ts`, `tests/acceptance/e2e/billing-cancel-click-to-cancel.spec.ts` (FTC 16 CFR 425), `tests/acceptance/integration/stripe-webhook-idempotency.spec.ts` (PRD M2 gate), `tests/acceptance/e2e/refund-eu-cooling-off.spec.ts` (D20).
**PRD references:** §12 pricing, §17 D20 (regional refund matrix — locked v0.4), §14.5 compliance (FTC Click-to-Cancel 16 CFR 425, EU Directive 2011/83/EU, UK CCR 2013, CA SB 313), §17 #17 GDPR Art. 28 DPA.

---

## State diagram (ASCII)

```
                  ┌───────────────────────┐
                  │ B0  Billing home      │  current plan + invoice history
                  │ (S-BILL in settings)  │
                  └────┬────┬────┬───┬────┘
                       │    │    │   │
                  sub  │  up │ dn │ can
                       ▼    ▼    ▼   ▼
                  ┌────┐ ┌────┐ ┌────┐ ┌────────────┐
                  │ B-S│ │B-UP│ │B-DN│ │ B-CAN      │
                  │sub │ │grade││grade││ cancel     │
                  │scr │ │     ││     ││ (D20 path) │
                  │ibe │ │     ││     ││            │
                  └─┬──┘ └──┬──┘ └──┬──┘ └─────┬──────┘
                    │       │       │          │
                    │       │       │     ┌────┴────┐
                    │       │       │     │         │
                    │       │       │  EU/UK/CA   US default
                    │       │       │     │         │
                    │       │       │     ▼         ▼
                    │       │       │ B-CAN-     B-CAN-
                    │       │       │ REGIONAL   STANDARD
                    │       │       │            (click-to-
                    │       │       │             cancel)
                    └───────┴───────┴──────┬──────┘
                                           │
                                           ▼
                          ┌────────────────────────────┐
                          │ B-WH  Stripe Checkout +    │
                          │ webhook reconciliation     │
                          └────────────┬───────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────┐
                          │ B-CONF  Confirmation +     │
                          │ receipt email              │
                          └────────────────────────────┘

  side branches:
   - B-PAYFAIL   payment failed → retry path + dunning
   - B-DISPUTE   pre-chargeback "Dispute Finding" path
   - B-CB        chargeback path (last resort)
   - B-RES       resubscribe after cancellation
```

---

## Regional decision tree (D20 spine)

**At every billing-state transition** (subscribe, change plan, cancel, refund), the system reads the customer's region (IP geolocation + timezone + billing-address country, in that priority) and routes through one of these branches. Per D20 locked v0.4:

```
              region ?
                │
   ┌────────────┼─────────────┬──────────────┬────────────┐
   ▼            ▼             ▼              ▼            ▼
   EU           UK            California     Rest of US   Rest of world
   (Directive   (CCR 2013)    (SB 313 +      (FTC         (default —
   2011/83/EU)                FTC Click-to-  Click-to-    Stripe
                              Cancel)        Cancel)      hosted)
   │            │             │              │            │
   ▼            ▼             ▼              ▼            ▼
   - 14-day     - 14-day      - Pro-rata     - Easy-      - Easy-cancel
     cooling-     CCR 2013      refund on     cancel        ToS terms
     off          cooling-      cancel        UI            apply
     waiver       off match     (SB 313)      (16 CFR
     checkbox     waiver                      425)
     at           checkbox
     checkout
   - Refund on   - Refund on
     dispute      dispute
   - GDPR Art.   - PECR
     28 DPA       cookie
                  policy
```

The waiver checkbox is required for EU + UK only. The text is locked by Comply + Herald per D20.

**Locked checkbox copy (Comply + Herald, EU):**
> I waive my right to the 14-day cooling-off period under Directive 2011/83/EU. I understand that by clicking Subscribe, my subscription begins immediately and I cannot cancel for a refund within the next 14 days unless the service is faulty.

**Locked checkbox copy (UK):**
> I waive my right to the 14-day cancellation period under the Consumer Contracts Regulations 2013. I understand my subscription begins immediately and I cannot cancel for a refund within 14 days unless the service is faulty.

If checkbox not ticked: subscription is still allowed BUT the user retains the 14-day refund window — they can cancel within 14 days and get a full refund (D20 mandate).

---

## States

### B0 — Billing home (= S-BILL in settings)

- **Renders:** current plan card, next billing date (with timezone), payment method (last 4), invoice history table (HC7 semantic table), "Change plan" button, "Update payment method" button, "Cancel subscription" button.
- **Forward:** click any action → B-S, B-UP, B-DN, B-CAN.
- **Back/cancel:** breadcrumb back to S-NAV.
- **What can go wrong:** customer's account has unresolved dispute → action buttons that would change billing state are gated with a banner: "A dispute is open on this account. Resolve or wait for our review (typical SLA 5 business days)."

### B-S — Subscribe (new subscription)

- **Renders:** plan picker (HC7 semantic table) with comparison table. Below picker: regional D20 widget renders the cooling-off waiver checkbox if region ∈ {EU, UK}.
- **Forward:** plan pick → Stripe Checkout (hosted, HC6) → B-WH.
- **Back/cancel:**
  - "Back" → B0.
  - Stripe Cancel → `/billing/cancel` → "Checkout cancelled. Pick a plan or stay on free." → B-S.
- **What can go wrong:**
  - EU/UK customer doesn't tick waiver → subscription proceeds with implicit 14-day refund right (UI explains: "You haven't waived your cooling-off period. You can cancel within 14 days for a full refund.").
  - Region detection ambiguous (VPN, IP/timezone disagree) → ask explicitly: "Are you in the EU/UK?" radio.
  - Payment method 3DS-challenge → Stripe handles in-checkout; webhook arrives after challenge cleared.
- **Recovery:** every path returns user to B-S or to B-CONF; no dead-end.

### B-UP — Upgrade plan

- **Renders:** current plan + target plan picker, prorated charge preview (e.g., "$50 today, then $79 / mo on 2026-06-09"), "Confirm upgrade" button.
- **Forward:** confirm → Stripe API upgrade (no Checkout redirect for upgrade-in-place; uses stored payment method) → B-WH.
- **Back/cancel:** "Back" → B0; "Cancel" before confirm has no effect.
- **What can go wrong:**
  - Stored payment method declined for proration charge → B-PAYFAIL with retry path.
  - Customer was annual → upgrade-to-different-tier proration uses Stripe's standard formula; preview is exact.
  - Free → paid is treated as B-S (new subscription), not B-UP.

### B-DN — Downgrade plan

- **Renders:** current plan + target plan picker; explanation: "Downgrade takes effect at the end of your current billing period (`<date>`). Until then, you keep your current features."
- **Forward:** confirm → Stripe API `cancel_at_period_end = false` + `prorated_downgrade` → B-CONF.
- **Back/cancel:** "Back" → B0.
- **What can go wrong:**
  - Downgrade reduces features mid-period (e.g., Pro → Starter) → customer keeps Pro features through period end; this is the standard pattern.
  - Customer downgrades while runs > new plan allowance → at period-end, excess runs are not deleted but cannot create new runs above quota.

### B-CAN — Cancel subscription (D20 spine entry)

- **Renders:** region-detected; routes to B-CAN-REGIONAL or B-CAN-STANDARD.
- **All routes share: FTC Click-to-Cancel UI compliance (16 CFR 425) — locked D20.** Cancel must be **at least as easy** as subscribe was. Specifically:
  - One-click access from B0 (no menu-burying).
  - No login wall beyond the one already authenticated.
  - No "talk to support" required.
  - Confirmation modal: one click to confirm.
  - Cancellation effective immediately recorded; subscription continues to period-end (standard).

### B-CAN-REGIONAL — Regional cancel (EU/UK/CA)

- **Renders depending on region:**
  - **EU/UK + within 14 days of subscription + waiver not signed:** "You're within the 14-day cooling-off window. You qualify for a full refund." Cancel button → full refund + immediate downgrade to free.
  - **EU/UK + within 14 days + waiver signed:** "You signed the cooling-off waiver at checkout. Cancellation takes effect at the end of your current period." Standard cancel path.
  - **EU/UK + outside 14 days:** standard cancel.
  - **California:** explanation of SB 313 pro-rata refund: "California law gives you a pro-rata refund of unused days. Refund amount: $`<calculated>`. Cancel?" Pro-rata calculated server-side; idempotent.
- **Forward:** confirm cancel → Stripe API + refund (if applicable) → B-CONF.
- **Back/cancel:** "Keep my subscription" returns to B0 — single click. (FTC compliance: "Keep" cannot be a multi-step dark-pattern.)

### B-CAN-STANDARD — Rest-of-world cancel

- **Renders:** "Cancel subscription? Your access continues until `<period_end>`. No refund." Confirm button: "Cancel subscription" (red); reject button: "Keep my subscription" (neutral). Single confirm.
- **Forward:** confirm → Stripe API `cancel_at_period_end: true` → B-CONF.
- **Back/cancel:** "Keep my subscription" returns to B0 in one click.

### B-WH — Stripe webhook reconciliation

- **Renders:** polling page: "Confirming with Stripe…" with auto-redirect on webhook arrival.
- **Forward:** webhook lands → state advances per webhook type (`checkout.session.completed` / `customer.subscription.updated` / etc.) → B-CONF.
- **Back/cancel:** "Refresh status now" button; "Contact us with checkout ID `cs_<...>`" fallback after 60s.
- **Data persisted:** `billing_events` row (idempotent per Stripe `event.id`).
- **What can go wrong:**
  - Webhook delayed (Stripe outage) → polling timeout at 5 min → "Stripe is taking longer than usual…" copy as in signup-to-first-verdict.md S5c.
  - Webhook signature verification fails → 401 + on-call paged; user retried by Stripe redelivery.

### B-CONF — Confirmation + receipt email

- **Renders:** "Subscription active" / "Plan changed" / "Cancellation confirmed — access until `<date>`" / "Refunded $`<amount>`". Email mirror (Stripe-default + Herald-branded transactional shell per brand voice §6).
- **Forward:** "Back to dashboard" or "View invoice".
- **Back/cancel:** terminal state.

### B-PAYFAIL — Payment failed (dunning)

- **Trigger:** Stripe webhook `invoice.payment_failed`.
- **Renders:** in-app banner + email: "Your payment for `<plan>` didn't go through. Update your card to keep your subscription." Buttons: "Update payment method →" (Stripe Customer Portal) / "Switch to free plan".
- **Forward:** customer updates card → Stripe retries → success → B-CONF.
- **Back/cancel:** if customer ignores → Stripe dunning runs (4 retries over 30 days per Stripe Smart Retries); on final failure → subscription cancelled → revert to free plan + email.
- **Data persisted:** `billing_events` row per webhook.
- **What can go wrong:** customer in dunning + opens a dispute → both paths run; resolution is whichever finishes first.

### B-DISPUTE — Pre-chargeback dispute path (D20)

- **Trigger:** customer clicks "Dispute Finding" on V0 or "Dispute charge" in B0.
- **Renders:** dispute form: "Which charge? Why?" → submit → "We'll review within 5 business days. Your charge is on hold; no follow-on charges until resolved."
- **Forward:** Comply + Jury manual review → decision (refund / partial / upheld) → B-CONF or B-CB.
- **Back/cancel:** customer can withdraw dispute any time before resolution.
- **Data persisted:** `disputes` row; Stripe Radar review hold applied.

### B-CB — Chargeback path (last resort)

- **Trigger:** customer skips B-DISPUTE and goes straight to their card issuer.
- **Renders:** in-app banner: "We received a chargeback on charge `<id>`. We're working with your bank." Comply runs the response process per Stripe Dispute API.
- **Forward:** Stripe dispute resolution outcome → B-CONF (refund or upheld).
- **Back/cancel:** customer can offer to withdraw the chargeback if it was filed in error.
- **Note:** D20 mandates we always offer the pre-chargeback path B-DISPUTE first; B-CB is the catch-all when customers skip.

### B-RES — Resubscribe after cancellation

- **Renders:** customer who cancelled returns; B0 shows "Resubscribe?" CTA → opens plan picker.
- **Forward:** identical to B-S; new subscription.
- **Back/cancel:** identical to B-S.
- **What can go wrong:**
  - Customer was within EU/UK 14-day window when they originally cancelled with refund → resubscribe is treated as a new contract; new waiver checkbox.
  - Customer had unresolved dispute → resubscribe gated until dispute resolved.

---

## Edge cases

### EC-1 — EU customer subscribes without ticking waiver, then cancels on day 7

**Trigger:** B-S → subscribe without waiver → B-CAN on day 7.
**What user sees:** "You're within the 14-day cooling-off window. You qualify for a full refund." Confirm → refund + cancel.
**System does:** Stripe refund idempotent; subscription cancelled immediately; access downgraded to free.
**Recovery:** customer can resubscribe immediately if they change mind; new waiver checkbox surfaces.

### EC-2 — UK customer subscribes with waiver, tries to cancel on day 7 for full refund

**Trigger:** B-S → waiver ticked → B-CAN on day 7.
**What user sees:** "You signed the cooling-off waiver at checkout. Cancellation takes effect at the end of your current period. No refund." Confirm → standard cancel.
**System does:** if customer disputes ("the service is faulty"), B-DISPUTE path opens; Comply reviews. Waiver does not override service-faulty refund right (CCR 2013).
**Recovery:** dispute path available.

### EC-3 — California customer cancels mid-month (SB 313 pro-rata)

**Trigger:** California customer with monthly plan cancels on day 15.
**What user sees:** "California law gives you a pro-rata refund of unused days. Refund amount: $14.50. Cancel?" Confirm → pro-rata refund + cancel.
**System does:** calculated as `(days_remaining / days_in_period) * plan_price` rounded down to nearest cent; idempotent.
**Recovery:** standard.

### EC-4 — Payment fails, customer ignores dunning, subscription auto-cancels

**Trigger:** Stripe Smart Retries exhausted after 30 days.
**What user sees:** email: "We weren't able to charge your card. Your subscription is now on the free plan. Resubscribe any time."
**System does:** `subscriptions.status = canceled_unpaid`; revert to free plan; retain run data per §14.4.
**Recovery:** customer resubscribes via B-RES; new payment method.

### EC-5 — Customer disputes after chargeback was filed in error

**Trigger:** customer filed chargeback in panic; later realizes the audit was correct.
**What user sees:** "Want to withdraw your chargeback? Contact your bank — we'll waive the dispute fee." (Comply-locked copy.)
**System does:** logs withdrawal request; awaits bank confirmation.
**Recovery:** standard customer-success interaction; no automated unwind.

### EC-6 — Region ambiguous (VPN user in EU IP, US billing address)

**Trigger:** IP says EU; billing address says US.
**What user sees:** at B-S, explicit radio: "Where are you located? (We need this to apply the right consumer-protection rules.)" Options: EU / UK / California / Rest of US / Rest of world.
**System does:** trusts the user's declaration + logs all three signals (IP, TZ, billing address) for Comply audit trail.
**Recovery:** standard; misdeclaration is on the customer (Comply-locked ToS clause).

### EC-7 — Customer changes plan within 14-day EU window

**Trigger:** EU customer subscribed on day 1 without waiver, upgrades on day 7.
**What user sees:** upgrade confirms with notice: "Your 14-day cooling-off window remains in effect for the upgraded plan." (Cooling-off resets per the new contract — D20 lock.)
**System does:** new 14-day window starts from upgrade date.
**Recovery:** customer can cancel within 14 days of upgrade for full refund of the upgrade increment.

### EC-8 — Customer cancels, then EU GDPR Art. 17 delete request follows

**Trigger:** B-CAN → settings → S-DEL.
**What user sees:** S-DEL flow (settings-and-account-management.md).
**System does:** cancellation processed first; deletion-grace starts; billing events retained 7y per §14.4.
**Recovery:** standard.

### EC-9 — Annual subscription cancel — refund amount?

**Trigger:** annual customer cancels mid-year.
**What user sees:**
  - EU/UK + 14-day window → full refund.
  - California → pro-rata of unused months (SB 313 applies to annual too).
  - Rest of US + rest of world → no refund; access through period-end.
**System does:** calculated per region.
**Recovery:** standard.

### EC-10 — Multiple subscriptions on one account (BYOK platform fee + Auto-PR one-time)

**Trigger:** customer has BYOK Pro $79/mo + bought Auto-PR $49 one-time + decides to cancel.
**What user sees:** B-CAN handles subscription only; "Cancel subscription" doesn't touch the one-time Auto-PR charge.
**System does:** subscription Stripe-cancel; one-time charge unaffected unless explicitly disputed.
**Recovery:** clear UI segmentation prevents accidental refund-everything.

---

## Acceptance criteria (binary, testable)

**Happy — subscribe:**
- **Given** a logged-in user with no active subscription and a non-EU IP,
- **When** they pick Managed Pro at $249/mo and complete Stripe Checkout,
- **Then** webhook `checkout.session.completed` reconciles to `subscriptions.status = active`, B-CONF renders, a receipt email is delivered within 30s, and `billing_events` has exactly one row for this event (idempotency).

**Unhappy 1 — EU 14-day cooling-off refund:**
- **Given** an EU customer subscribed without ticking the waiver checkbox,
- **When** they cancel within 14 days of subscription,
- **Then** a full Stripe refund is issued, the subscription cancels immediately, and the customer is downgraded to free with access retained for prior runs per §14.4.

**Unhappy 2 — FTC Click-to-Cancel (16 CFR 425) compliance:**
- **Given** a US customer on any paid plan,
- **When** they click "Cancel subscription" in B0,
- **Then** cancellation completes in ≤ 2 clicks (B-CAN screen + confirm), no support contact is required, no upsell-with-confirm-buried, and "Keep my subscription" exits in 1 click.

**Unhappy 3 — California SB 313 pro-rata:**
- **Given** a California customer on a monthly $249 plan, day 15 of a 30-day period,
- **When** they cancel,
- **Then** a refund of $124.50 (= 15/30 × $249) is calculated and issued via Stripe idempotently, and the subscription cancels immediately.

**Unhappy 4 — Stripe webhook idempotency on duplicate delivery:**
- **Given** Stripe delivers the same `checkout.session.completed` event twice (after a redelivery),
- **When** both events are processed,
- **Then** `billing_events` has exactly one row (deduped by `event.id`), `subscriptions.status` is set once, no double-charge occurs, and the user is not double-emailed.

---

## Open questions

- **OQ-1 (for Comply):** EC-6 (region ambiguous) — does our explicit radio prompt satisfy regional law as the user's declaration, or do we need a stricter signal (e.g., billing address authoritative)? Recommend explicit radio + log all signals; flag for Comply legal review.
- **OQ-2 (for Penny + Ledger):** EC-7 (upgrade in cooling-off window) — D20 doesn't specify reset-on-upgrade; some lawyers argue the original window stands. Recommend the customer-friendly interpretation: window resets on upgrade.
- **OQ-3 (for Optic):** B-CAN-REGIONAL renders different copy per region. Is the visual hierarchy stable (same buttons in same positions, just different body copy) so users from different regions see a recognizable interface? Recommend yes; flag for Phase 4.
- **OQ-4 (for Comply + Herald):** EU/UK waiver checkbox copy is locked, but the rest of cancel-flow copy is not. Recommend Comply + Herald lock the full regional-cancel string set before Phase 4 visual design.
- **OQ-5 (for Stripe expert / Ledger):** EC-4 (Stripe Smart Retries exhaustion) — what's the customer-facing email cadence during dunning? Recommend at attempt 1 (silent in-app banner), attempt 2 (email), attempt 4 final (email + in-app urgency banner). Flag for Stripe-aware review.
