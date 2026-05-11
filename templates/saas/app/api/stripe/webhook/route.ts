import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  const body = await req.text();
  try {
    event = stripe.webhooks.constructEvent(body, sig, SIGNING_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.payment_failed":
      // TODO: persist to your DB via Supabase service-role client
      console.log("[stripe webhook]", event.type, event.id);
      break;
    default:
      // Unhandled events are fine — Stripe sends many we don't care about
      break;
  }

  return NextResponse.json({ received: true });
}
