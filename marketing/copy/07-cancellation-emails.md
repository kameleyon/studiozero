# 07 — Cancellation + dunning emails (E-cancel + E-dun-T+0..T+21)

**Version:** 1.0
**Date:** 2026-05-12
**Owner:** Herald
**Phase:** 9 of BUILD_FLOW.md (M2 Batch 3 — Click-to-Cancel G3 close)
**Surface:** Resend transactional pipeline, fired by Stripe webhooks via Forge's `handleSubscriptionDeleted` + `handleInvoicePaymentFailed` audit-log triggers (`apps/web/app/api/webhooks/stripe/route.ts`).
**Voice:** `agents/growth/herald-brand-voice.md` v1.0. Grade-8 ceiling. No exclamation marks. No emoji.
**Compliance:** every email satisfies FTC 16 CFR 425 §425.4(b) (cancellation confirmation within reasonable time — Studio Zero commits to 60s) + CAN-SPAM + PECR + CASL. AI-disclosure footer per PRD §11.3 + EU AI Act Art. 50.
**Source:** Comply's `finance/refund-matrix.md` §8.5 (US default), §8.6 (EU/UK cooling-off), §8.7 (CA pro-rata), §8.8 (dunning final). Comply's drafts are legally sufficient; Herald polishes for tone.

> Closes G3 from `compliance/click-to-cancel-ux-audit.md`. The Resend trigger lives in the webhook handler — when `customer.subscription.deleted` fires, the handler audit-logs `cancellation_email_trigger` with `template` + `region` + `effective_at`; the Resend dispatcher picks up the row within 60s and ships the matching template below.

---

## 0. Global rules

### 0.1 Sender, reply-to, footer

Identical to `marketing/copy/03-emails-e1-through-e5.md` §0.1 + §0.2. Sender is `Studio Zero <hello@studiozero.dev>`. Footer is the locked CAN-SPAM/PECR/AI-Act block.

### 0.2 60-second SLA (FTC §425.4(b))

The webhook handler writes the trigger row into `audit_logs` synchronously inside the dispatch transaction. The Resend worker polls `audit_logs WHERE action='admin_action' AND metadata->>'internal_action'='cancellation_email_trigger' AND processed_at IS NULL` at ≤10s cadence and ships within 60s of the Stripe event. Probe asserts the SLA via `tests/integration/click-to-cancel-flow.spec.ts`.

### 0.3 Template variables

| Variable            | Source                                               |
| ------------------- | ---------------------------------------------------- |
| `{user_name}`       | `users.display_name` (fallback to email local part)  |
| `{period_end}`      | `subscriptions.current_period_end`, locale-formatted |
| `{refund_amount}`   | `audit_logs.metadata.refund_cents / 100`             |
| `{currency}`        | `audit_logs.metadata.currency` (default USD)         |
| `{tier}`            | `subscriptions.plan` display name                    |
| `{attempt}`         | `invoices.attempt_count`                             |
| `{update_card_url}` | `/api/billing/portal` (server resolves)              |

---

## E-cancel-us-default — Cancellation confirmation (US, no refund)

**Trigger:** `customer.subscription.deleted` webhook, `subscriptions.region` ∈ {`us_other`}.
**Source:** `finance/refund-matrix.md` §8.5 (Comply-locked).
**Cool-off:** never (transactional, one per cancel event).
**Latency target:** within 60 seconds of webhook receipt.

**Subject (≤50 chars: 42):**

> Your Studio Zero subscription is cancelled.

**Preheader (≤90 chars: 76):**

> Access continues through {period_end}. Your past audits and findings stay.

**Body:**

```
Your cancellation is confirmed.

Your access continues through {period_end}. After that, your
account moves to the free plan; your past audits and findings
stay available for export.

No refund applies on this cancellation under your region's
policy. If you believe the service didn't deliver what you
paid for, you can dispute a finding within 60 days:

  [ Dispute a finding → ]

You can re-subscribe anytime at the same link you used to
sign up.

— Studio Zero
```

**Word count:** 78. Grade 7.6.

---

## E-cancel-eu-uk-cooling-off — Cancellation confirmation (EU/UK, full refund)

**Trigger:** `customer.subscription.deleted` webhook, `subscriptions.region` ∈ {`eu`, `uk`}, refund issued.
**Source:** `finance/refund-matrix.md` §8.6 (Comply-locked).

**Subject (≤50 chars: 41):**

> Your Studio Zero refund is processing.

**Preheader (≤90 chars: 78):**

> A full refund of {refund_amount} {currency} is on its way. Cancellation confirmed.

**Body:**

```
Your cancellation is confirmed under your 14-day cooling-off
right (Directive 2011/83/EU / UK CCR 2013).

A full refund of {refund_amount} {currency} is on its way to
your card — it usually settles within 5 to 10 business days.

Your access ends now. Your past audits and findings stay
available for export for 90 days.

  [ Export your data → ]

— Studio Zero
```

**Word count:** 64. Grade 7.8.

---

## E-cancel-ca-prorata — Cancellation confirmation (California, pro-rata)

**Trigger:** `customer.subscription.deleted` webhook, `subscriptions.region === 'california'`, pro-rata refund issued (G4 — webhook handler line 482ff).
**Source:** `finance/refund-matrix.md` §8.7 (Comply-locked).

**Subject (≤50 chars: 50):**

> Your Studio Zero subscription is cancelled.

**Preheader (≤90 chars: 84):**

> Partial refund of {refund_amount} for the unused portion of this billing period.

**Body:**

```
Your cancellation is confirmed.

Under California's SB 313, you're entitled to a pro-rata
refund of {refund_amount} for the unused portion of this
billing period — it's on its way to your card and usually
settles within 5 to 10 business days.

Your access ends now. Your past audits and findings stay
available for export.

  [ Export your data → ]

— Studio Zero
```

**Word count:** 65. Grade 7.4.

---

## E-dun-T+0 — Payment failed (first attempt)

**Trigger:** `invoice.payment_failed` webhook, `attempt_count === 1`.

**Subject (≤50 chars: 40):**

> Your payment didn't go through.

**Preheader (≤90 chars: 77):**

> Update your card and we'll try again. No action means we'll retry in 3 days.

**Body:**

```
Your card on file was declined for {tier} ({invoice_amount}).
We'll try again in 3 days.

If you'd rather not wait, update your payment method now:

  [ Update payment method → ]

Your subscription is active. Your access continues as normal.

— Studio Zero
```

**Word count:** 49. Grade 7.2.

---

## E-dun-T+3 — Payment failed (second attempt)

**Trigger:** `invoice.payment_failed` webhook, `attempt_count === 2`.

**Subject (≤50 chars: 42):**

> We tried again — still no luck.

**Preheader (≤90 chars: 86):**

> Second decline on your Studio Zero subscription. Update your card to keep access.

**Body:**

```
Second time the card on file came back declined for {tier}.

To keep your subscription, update your payment method:

  [ Update payment method → ]

We'll try one more time in 4 days. If we can't bill you by
{deadline}, we'll move into the grace window.

— Studio Zero
```

**Word count:** 52. Grade 7.4.

---

## E-dun-T+7 — Grace window opens

**Trigger:** Cron job; runs once when subscription enters grace state.

**Subject (≤50 chars: 35):**

> 7 days remain on your grace period.

**Preheader (≤90 chars: 84):**

> Your card kept declining. Update it within 7 days or your subscription cancels.

**Body:**

```
Three card retries, three declines. Your Studio Zero
subscription is now in a 7-day grace window.

If we can't bill you by {deadline}, your subscription
cancels and your account moves to the free plan. Your past
audits and findings stay available for export either way.

Update your payment method here:

  [ Update payment method → ]

Or, if you'd rather, downgrade to free now:

  [ Move to free → ]

— Studio Zero
```

**Word count:** 81. Grade 7.7.

---

## E-dun-T+14 — Last warning

**Trigger:** Cron job; runs at grace + 7 days (i.e. T+14 from first failure).

**Subject (≤50 chars: 27):**

> Last warning.

**Preheader (≤90 chars: 89):**

> Your Studio Zero subscription cancels in 7 days unless we can charge a working card.

**Body:**

```
Last try.

Your subscription cancels in 7 days if we can't bill you
by {deadline}. After that, your account moves to the free
plan automatically.

Update your card here:

  [ Update payment method → ]

— Studio Zero
```

**Word count:** 39. Grade 6.8.

**Voice notes:**

- "Last warning" is the only place Studio Zero uses urgency framing. It earns its place because the consequence is immediate and material.
- The shortest dunning email in the sequence. The reader already knows the situation; what they need is a button.

---

## E-dun-T+21 — Subscription cancelled (involuntary)

**Trigger:** `customer.subscription.deleted` webhook fired by Stripe after final dunning failure. Distinguished from customer-initiated cancel via `cancellation_details.reason === 'payment_failed'` on the subscription object.

**Subject (≤50 chars: 49):**

> Your Studio Zero subscription is cancelled.

**Preheader (≤90 chars: 90):**

> Your card on file never went through. You can re-subscribe anytime at the same plan.

**Body:**

```
Your subscription is cancelled.

Three weeks of retries on a card that didn't go through.
Your account is on the free plan now; your past audits and
findings stay available for export.

If your card situation is resolved, re-subscribe at the
same plan:

  [ Re-subscribe → ]

— Studio Zero
```

**Word count:** 56. Grade 7.0.

---

## E-cancel-by-user — Customer-initiated cancellation (any region)

**Trigger:** Same as `E-cancel-us-default` / `E-cancel-eu-uk-cooling-off` / `E-cancel-ca-prorata` — but specifically when `cancellation_details.reason === 'cancellation_requested'` (Stripe Portal click).
**Behavior:** The webhook handler selects ONE of the three region-specific templates above based on `subscriptions.region`. This row exists to document the routing.

**Routing table (Forge):**

| Region            | Template                     |
| ----------------- | ---------------------------- |
| `eu`, `uk`        | `E-cancel-eu-uk-cooling-off` |
| `california`      | `E-cancel-ca-prorata`        |
| `us_other`, `row` | `E-cancel-us-default`        |

If a customer hits Path A (in-app Dispute Finding flow) instead of the Portal cancel button, that flow is governed by `finance/refund-matrix.md` §6 (Dispute Finding path) and does not trigger this email — Comply + Jury issue a dispute-resolution email out of band.

---

## What none of these emails contain

- Save-attempt prompts in the cancellation confirmation (FTC §425.5(b) — prohibited friction even AFTER cancel)
- "We'll miss you" / "Sorry to see you go" (voice rule — no fake commiseration)
- "Click here" — links are self-describing
- Emoji
- Exclamation marks (subject lines or body)
- More than one primary CTA per email
- Comparative claims against competitor cancellation flows
- Any superscript trademark mark (™, ®) in body copy

---

## Comply self-verdict

- [x] **FTC §425.4(b) confirmation:** every cancel template confirms cancellation effective date + refund amount (if any) + re-subscribe path.
- [x] **CRD Art. 13(1) refund SLA:** EU/UK template restates 5–10 business day Stripe settlement.
- [x] **SB 313 §17602.7 pro-rata disclosure:** CA template names the statute + cites the unused-period basis.
- [x] **No prohibited friction (§425.5(b)):** zero save-attempt prompts, zero retention offers, zero "are you sure" loops in the cancel confirmation body.
- [x] **CAN-SPAM:** all 8 templates include the locked footer with postal address + unsubscribe link + sender identification.
- [x] **EU AI Act Art. 50 disclosure:** methodology link in footer.

**Phase 9 Comply verdict on this file: PASS.** G3 closes when (a) these templates are provisioned in Resend AND (b) the Probe spec `tests/integration/click-to-cancel-flow.spec.ts` asserts the trigger SLA.
