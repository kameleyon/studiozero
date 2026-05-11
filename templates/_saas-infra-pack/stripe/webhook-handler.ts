/**
 * Studio Zero — Stripe Webhook Handler
 *
 * Handles the events that actually matter for SaaS:
 *   - checkout.session.completed       → grant access immediately
 *   - customer.subscription.created    → store subscription in your DB
 *   - customer.subscription.updated    → plan/status changes
 *   - customer.subscription.deleted    → revoke access (or grace period)
 *   - invoice.payment_failed           → flag dunning state
 *
 * Always: verify signature, idempotent processing, log every event.
 *
 * Drop into your framework's webhook route:
 *   - Next.js: app/api/stripe/webhook/route.ts
 *   - Express: app.post("/webhooks/stripe", ...)
 *   - Hono: app.post("/webhooks/stripe", ...)
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});
const SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export interface WebhookContext {
  // Inject your DB client / service-role client / queue here.
  // Example: { supabase: SupabaseClient, queue: Queue }
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  ctx: WebhookContext,
): Promise<{ received: boolean; eventId?: string; error?: string }> {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, SIGNING_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    return { received: false, error: msg };
  }

  // TODO: idempotency — record event.id in your DB and skip if seen
  // (Stripe retries on non-2xx; you must handle duplicates safely)

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenant_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      // TODO: persist {tenant_id, stripe_customer_id, subscription_id} to your DB
      console.log("[stripe] checkout completed", { tenantId, customerId });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenant_id;
      // TODO: upsert subscription row {tenant_id, status, current_period_end, plan_id}
      console.log("[stripe] subscription", sub.status, tenantId);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenant_id;
      // TODO: revoke access OR start grace period (your call)
      console.log("[stripe] subscription cancelled", tenantId);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // TODO: flag dunning state, send recovery email via Resend
      console.log("[stripe] payment failed", invoice.id);
      break;
    }
    default:
      // Stripe sends many events you don't care about — that's fine
      break;
  }

  return { received: true, eventId: event.id };
}
