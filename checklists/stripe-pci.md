# QA Checklist — Stripe PCI Posture (SAQ A)

**Owner:** Ledger (billing operations)
**Audited by:** Comply (legal), Shield (security)
**Applies to:** every project that accepts payments

The cleanest PCI scope is **SAQ A** — you redirect to Stripe-hosted forms or use Stripe Elements / Checkout, and never touch raw card data. This checklist verifies you stay in SAQ A scope.

## Stay in SAQ A scope (mandatory)
- [ ] **Never log full card numbers, CVVs, or expiry dates** — anywhere. Not in app logs, not in error reports, not in support tickets.
- [ ] **Never store card data** in your database — Stripe does this; you store the customer ID and payment method ID.
- [ ] **Card data entry happens on Stripe-hosted pages** (Stripe Checkout, Customer Portal) OR via **Stripe Elements** (client-side iframe — card data never touches your server).
- [ ] **Webhook signature verification** on every Stripe event — already in `_saas-infra-pack/stripe/webhook-handler.ts`.
- [ ] **HTTPS-only** for the entire checkout flow — no fallback HTTP.

## Server-side
- [ ] **Stripe secret key in env vars only** — never committed, never in client-side bundles.
- [ ] **Webhook endpoint reachable only from Stripe** — IP allowlist in front of webhook (Cloudflare WAF or equivalent) is a bonus.
- [ ] **Idempotency on subscription mutations** — store `event.id` after processing to prevent double-handling on Stripe retries.
- [ ] **Plan changes happen through Stripe** — no app-level "free vs. paid" toggle that bypasses Stripe.

## Customer-facing flow
- [ ] **Customer Portal** offered — let users update payment, change plan, cancel themselves (per `_saas-infra-pack/stripe/portal.ts`).
- [ ] **Refund policy displayed** before checkout — required by EU consumer law (14-day cooling-off period).
- [ ] **Receipt sent automatically** via Stripe (default) or your own Resend template after `invoice.payment_succeeded`.
- [ ] **Subscription cancellation honored** — when Stripe sends `customer.subscription.deleted`, app revokes access (or grace period per product decision).
- [ ] **Failed payments handled** — when Stripe sends `invoice.payment_failed`, dunning flow kicks in (email + in-app banner).

## Reconciliation
- [ ] **Stripe → app DB sync verified** — for every active subscription in Stripe, there's a matching active row in your DB. Periodic reconciliation job (daily).
- [ ] **Tax handling** — Stripe Tax enabled if selling cross-border. Confirm tax rate calculation matches local jurisdiction.
- [ ] **Invoicing** — VAT-compliant invoices automatic for EU customers (Stripe handles).

## Audit & dispute
- [ ] **Dispute notifications** route to a human (Echo or founder) within 24h of receipt.
- [ ] **Chargeback evidence** automated — collect login logs, usage logs, contact records for any disputed charge.
- [ ] **Refund decision rights** documented — who can issue refunds, up to what amount, with what justification.

## Legal copy required
- [ ] Pricing page lists **all fees** including taxes (or explicitly notes "+VAT" for B2B EU).
- [ ] **Terms of Service** explicitly cover billing, refunds, cancellation, auto-renewal.
- [ ] **Subscription auto-renewal disclosure** — required in California (ARL — Automatic Renewal Law) and EU.

## Out of scope (for SAQ A)
If you ever leave SAQ A — by handling raw card data, building your own card form without Stripe Elements, or storing card numbers — **escalate to Comply and Shield immediately**. SAQ D is a different category of compliance work.
