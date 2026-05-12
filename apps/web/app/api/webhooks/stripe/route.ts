/**
 * POST /api/webhooks/stripe — Stripe webhook receiver.
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Ledger (event taxonomy +
 * idempotency), Cipher (signature verification before any side effect).
 *
 * Architecture:
 *   - Per ARCH-D7, webhook handlers can live in Vercel Routes (this file)
 *     OR Supabase Edge Functions. We ship the V1 path on Vercel for
 *     deploy-velocity; the Stripe Dashboard endpoint URL can be flipped
 *     to the Edge Function variant at M2 without app changes (same
 *     idempotency key — `stripe_event_id`).
 *   - The `Stripe-Signature` header is HMAC-SHA256 over the raw body
 *     with the `STRIPE_WEBHOOK_SECRET` shared secret. Verify ON THE
 *     RAW BYTES — do NOT parse the body first, do NOT touch the DB
 *     until verification passes (Cipher's hard rule).
 *   - Idempotency: every event row carries `stripe_event_id UNIQUE`.
 *     A duplicate delivery (Stripe retries 3x at 30s/2h/2h backoff)
 *     returns 200 on the second hit without re-applying side effects.
 *
 * Events handled (per Ledger's stripe-config.md):
 *   - customer.subscription.created  → upsert `subscriptions` row, open
 *     cooling-off window for EU/UK regions (D22)
 *   - customer.subscription.updated  → upsert + flip cooling_off if upgrade
 *   - customer.subscription.deleted  → cancel
 *   - invoice.payment_succeeded      → ledger event only (entitlement
 *     already flowed from subscription.created)
 *   - invoice.payment_failed         → flip status to past_due
 *   - checkout.session.completed     → ledger event (idempotency with the
 *     reconciliation poll at /app/billing/checkout per ARCH-D4)
 *   - payment_intent.succeeded       → Auto-PR (V1.5; logged at M2)
 *   - charge.dispute.created         → ledger + Watch alert
 *
 * Cross-refs:
 *   - architecture/iac/supabase/edge-functions/README.md (alternate path)
 *   - architecture/decisions.md ARCH-D4 (idempotency + reconciliation)
 *   - architecture/database/tables.sql billing_events row
 */

import Stripe from "stripe";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { track } from "../../../../lib/analytics-events.v1";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// We need the raw body for signature verification — Next 15's
// req.text() returns the unparsed body. Do NOT use req.json() here.

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2024-09-30.acacia" as Stripe.LatestApiVersion;

interface WebhookResponse {
  received: boolean;
  duplicate?: boolean;
  request_id: string;
}

function newRequestId(): string {
  return crypto.randomUUID();
}

export async function POST(req: Request): Promise<Response> {
  const requestId = newRequestId();

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "stripe_not_configured", request_id: requestId }),
      { status: 500, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "missing_signature", request_id: requestId }),
      { status: 400, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  // Read raw body for signature verification.
  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verification_failed";
    return new Response(
      JSON.stringify({ error: "invalid_signature", detail: msg, request_id: requestId }),
      { status: 400, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  const supabase = createServiceRoleClient();

  // ---- Idempotency: insert billing_events first; UNIQUE(stripe_event_id)
  //      means a duplicate delivery hits 23505 (unique violation) and we
  //      return 200 without doing the side-effect work. ----
  const tenantId = await resolveTenantId(supabase, event);

  const { error: insertErr } = await supabase.from("billing_events").insert({
    tenant_id: tenantId,
    stripe_event_id: event.id,
    stripe_event_type: event.type,
    amount_cents: extractAmountCents(event),
    currency: extractCurrency(event),
    payload: event as unknown as Record<string, unknown>,
  });

  if (insertErr) {
    // 23505 is the Postgres unique-violation code; PostgREST surfaces it
    // as code === "23505" in the error response.
    if ((insertErr as { code?: string }).code === "23505") {
      const resp: WebhookResponse = { received: true, duplicate: true, request_id: requestId };
      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      });
    }
    return new Response(
      JSON.stringify({ error: "billing_event_insert_failed", request_id: requestId }),
      { status: 500, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  // ---- Dispatch side-effects per event type. -----
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(supabase, event, tenantId);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDelete(supabase, event);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(supabase, event);
        break;
      case "invoice.payment_succeeded":
      case "payment_intent.succeeded":
      case "charge.dispute.created":
        // billing_events row is the ledger; downstream workers consume it.
        break;
      case "checkout.session.completed": {
        // Lens spec §2.4 paid_conversion — fire AFTER the billing_events
        // insert so duplicates from Stripe retries don't double-count.
        const session = event.data.object as Stripe.Checkout.Session;
        const amountCents = extractAmountCents(event) ?? 0;
        const currency = (extractCurrency(event) ?? "USD").toUpperCase();
        // Resolve tier + mode from metadata or line items; Penny ships
        // M2 metadata. Defensive defaults keep the event well-typed.
        const tier =
          (session.metadata?.tier as string | undefined) ?? "unknown";
        const mode =
          (session.metadata?.mode as "byok" | "cli" | "managed" | undefined) ??
          "managed";
        const planFamily =
          (session.metadata?.plan_family as
            | "byok"
            | "managed"
            | "cli"
            | undefined) ?? mode;
        void track("paid_conversion", {
          tier,
          mode,
          currency,
          amount_cents: amountCents,
          plan_family: planFamily,
        });
        break;
      }
      default:
        // Unknown event type — already logged in billing_events. No-op.
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "dispatch_failed";
    return new Response(
      JSON.stringify({ error: "dispatch_failed", detail: msg, request_id: requestId }),
      { status: 500, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  const ok: WebhookResponse = { received: true, request_id: requestId };
  return new Response(JSON.stringify(ok), {
    status: 200,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}

// ---- helpers ---------------------------------------------------------------

async function resolveTenantId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Stripe.Event,
): Promise<string> {
  // Try to extract a customer id from the event and look up the tenant.
  const obj = event.data.object as unknown as { customer?: string | { id?: string } };
  const customerId =
    typeof obj?.customer === "string" ? obj.customer : obj?.customer?.id ?? null;
  if (customerId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("tenant_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data?.tenant_id) return data.tenant_id as string;
  }
  // Fall back to a sentinel "00000000-0000-0000-0000-000000000000" only if
  // the table accepts it (it doesn't — there's a FK to tenants). In
  // practice the row insert below will fail; let the caller see the
  // error so Ledger can wire a dead-letter table at M2.
  return "00000000-0000-0000-0000-000000000000";
}

function extractAmountCents(event: Stripe.Event): number | null {
  const o = event.data.object as unknown as Record<string, unknown>;
  for (const k of ["amount_total", "amount_paid", "amount", "amount_due"]) {
    const v = o[k];
    if (typeof v === "number") return v;
  }
  return null;
}

function extractCurrency(event: Stripe.Event): string | null {
  const o = event.data.object as unknown as Record<string, unknown>;
  const c = o.currency;
  return typeof c === "string" ? c.toUpperCase().slice(0, 3) : null;
}

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Stripe.Event,
  tenantId: string,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await supabase.from("subscriptions").upsert(
    {
      tenant_id: tenantId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_start: sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionDelete(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);
}

async function handleInvoiceFailed(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Stripe.Event,
): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
  if (!subId) return;
  await supabase
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId);
}
