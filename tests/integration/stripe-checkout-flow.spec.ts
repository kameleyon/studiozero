/**
 * Studio Zero — Stripe Checkout flow (M2 Batch 1 scaffold).
 *
 * Verify fills this in at M2 Batch 2. Requires Stripe test mode keys +
 * a deployed Edge Function + an authenticated test user.
 *
 * Contract to verify (per finance/stripe-config.md §1.6 + §3.4):
 *   - POST /api/billing/checkout-session with valid auth returns a
 *     Stripe Checkout URL.
 *   - client_reference_id formatted as <tenant_id>:<user_id>:<nonce>.
 *   - automatic_tax + tax_id_collection + billing_address_collection are
 *     on the resulting session.
 *   - EU/UK region without cooling_off_waiver=true → 400.
 *   - On Stripe Checkout completion, /api/webhooks/stripe receives the
 *     checkout.session.completed event and writes billing_events +
 *     subscription stub row.
 */
import { describe, it } from "vitest";

describe("Stripe Checkout flow (M2)", () => {
  it.skip("creates a Stripe Checkout Session with correct client_reference_id (needs Stripe test mode)", () => {
    // M2 Batch 2 — Verify wires fetch against next dev server + Stripe
    // test-mode SDK to assert the session payload.
  });

  it.skip("rejects EU customer without cooling_off_waiver (needs Stripe test mode)", () => {
    // POST body { tier:'managed_starter', billing_period:'monthly',
    //             region:'eu', cooling_off_waiver:false } → 400
  });

  it.skip("checkout.session.completed → billing_events row (needs mocked Stripe SDK)", () => {
    // Simulate the webhook delivery; assert UNIQUE stripe_event_id + the
    // subscription stub row keyed on stripe_subscription_id.
  });
});
