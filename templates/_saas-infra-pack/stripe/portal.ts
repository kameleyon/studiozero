/**
 * Studio Zero — Stripe Customer Portal
 *
 * Creates a portal session URL where the user can manage their own subscription:
 * update payment method, change plan, cancel. Reduces support load to ~zero.
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function createPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
