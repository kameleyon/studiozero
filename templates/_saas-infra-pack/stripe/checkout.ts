/**
 * Studio Zero — Stripe Checkout Session
 *
 * Creates a hosted checkout session for a subscription. Returns the session URL
 * to redirect the user to.
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export interface CheckoutOptions {
  priceId: string;          // from your Stripe dashboard (e.g. price_1ABC...)
  customerId?: string;      // existing Stripe customer
  customerEmail?: string;   // used if no customerId — Stripe creates one
  tenantId: string;         // your internal tenant id — passed via metadata
  successUrl: string;       // where to redirect after successful payment
  cancelUrl: string;        // where to redirect if user cancels
  trialDays?: number;       // free trial in days
  allowPromotionCodes?: boolean;
}

export async function createCheckoutSession(opts: CheckoutOptions) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: opts.priceId, quantity: 1 }],
    customer: opts.customerId,
    customer_email: opts.customerId ? undefined : opts.customerEmail,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: opts.allowPromotionCodes ?? true,
    metadata: { tenant_id: opts.tenantId },
    subscription_data: {
      ...(opts.trialDays && { trial_period_days: opts.trialDays }),
      metadata: { tenant_id: opts.tenantId },
    },
    billing_address_collection: "required",
    automatic_tax: { enabled: true },     // requires Stripe Tax — disable if not configured
  });
}
