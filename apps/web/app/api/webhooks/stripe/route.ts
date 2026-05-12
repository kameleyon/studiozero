/**
 * POST /api/webhooks/stripe — Stripe webhook receiver (M2 Batch 1, Forge).
 *
 * Owner: Forge (Phase 9 M2 Batch 1). Reviewers: Ledger (event taxonomy +
 * idempotency), Cipher (signature verification before any side effect),
 * Comply (D22 EU/UK cooling-off windows).
 *
 * --- M2 vs M1 ---------------------------------------------------------------
 * M1 shipped the signature-verify + idempotency-UNIQUE pattern; M2 extends
 * per `finance/stripe-config.md` §3.4:
 *   - customer.subscription.created      → UPSERT subscriptions + open EU/UK
 *                                          cooling-off window (D22, subscribe)
 *   - customer.subscription.updated      → UPDATE subscription; on upgrade
 *                                          (plan-rank goes up), insert a new
 *                                          cooling_off_windows row with
 *                                          trigger_event='upgrade' (D22 reset)
 *   - customer.subscription.deleted      → status='canceled'
 *   - customer.subscription.trial_will_end → emit event only (Herald owns email)
 *   - invoice.payment_succeeded          → ledger event; reset dunning counter
 *   - invoice.payment_failed             → status='past_due'; dunning step
 *   - checkout.session.completed         → UPSERT subscription stub if not
 *                                          yet via subscription.created
 *                                          (race-resolution with reconcile)
 *   - payment_intent.succeeded (V1.5)    → UPDATE fix_pr_jobs; enqueue build
 *   - charge.dispute.created             → flag run; Sentry warning for Comply
 *
 * --- Hard rules (Ledger + Cipher) ------------------------------------------
 *   - The raw body is verified via stripe.webhooks.constructEventAsync BEFORE
 *     any DB read. Never JSON.parse before verify.
 *   - INSERT-first / process-second. billing_events.stripe_event_id UNIQUE is
 *     the idempotency spine; duplicate Stripe deliveries hit 23505 and
 *     short-circuit to 200 OK.
 *   - On dispatch error: do NOT mark the event processed — Stripe retries
 *     replay. (We approximate Postgres BEGIN/ROLLBACK by deleting the
 *     billing_events row on dispatch failure so the retry path re-runs the
 *     handler cleanly. PostgREST cannot open a true transaction across
 *     multiple table writes — Ledger accepts the compensation pattern with
 *     the explicit caveat that the dispatch handlers be themselves
 *     idempotent.)
 *
 * --- D22 cooling-off (EU/UK) -----------------------------------------------
 *   - On subscription.created, if region ∈ {eu, uk}: insert one cooling-off
 *     row with trigger_event='subscribe', expires_at = now() + 14 days.
 *   - On subscription.updated, if the plan changed AND the new plan ranks
 *     higher than the old plan AND region ∈ {eu, uk}: insert a fresh row
 *     with trigger_event='upgrade'.
 *   - waiver_signed is copied from subscriptions.cooling_off_waiver_signed
 *     (set during the Checkout Session creation step in
 *     /api/billing/checkout-session).
 *
 * Cross-refs:
 *   - architecture/decisions.md ARCH-D4 (idempotency + reconciliation)
 *   - architecture/database/tables.sql (subscriptions, cooling_off_windows,
 *     billing_events, fix_pr_jobs)
 *   - finance/stripe-config.md §3 (webhook handler design)
 *   - finance/refund-matrix.md §2 (regional matrix)
 */

import Stripe from "stripe";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { track } from "../../../../lib/analytics-events.v1";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// We need the raw body for signature verification — Next 15's req.text()
// returns the unparsed body. Do NOT use req.json() here.

const STRIPE_API_VERSION: Stripe.LatestApiVersion =
  "2024-09-30.acacia" as Stripe.LatestApiVersion;

const COOLING_OFF_DAYS = 14;
const COOLING_OFF_MS = COOLING_OFF_DAYS * 24 * 60 * 60 * 1000;

interface WebhookResponse {
  received: boolean;
  duplicate?: boolean;
  request_id: string;
}

type Supa = ReturnType<typeof createServiceRoleClient>;

function newRequestId(): string {
  return crypto.randomUUID();
}

/** Deterministic plan-rank for D22 upgrade detection.
 *  Mirrors finance/stripe-config.md §6.1 plan_rank() (mirror the Postgres
 *  function so we don't need a round-trip just to compare ranks). */
function planRank(plan: string | null | undefined): number {
  switch (plan) {
    case "free":
      return 0;
    case "byok_starter":
    case "cli":
      return 1;
    case "byok_pro":
      return 2;
    case "managed_starter":
      return 3;
    case "managed_pro":
      return 4;
    default:
      return -1;
  }
}

/** Map a Stripe Product → our plan_tier. The Product metadata.tier is the
 *  source of truth per stripe-config.md §2. */
function planFromProductMetadata(meta: Record<string, string> | null | undefined): string | null {
  if (!meta) return null;
  const t = meta.tier;
  if (!t) return null;
  // Whitelist against the plan_tier enum.
  if (
    t === "free" ||
    t === "byok_starter" ||
    t === "byok_pro" ||
    t === "managed_starter" ||
    t === "managed_pro" ||
    t === "cli"
  ) {
    return t;
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  const requestId = newRequestId();

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "stripe_not_configured", request_id: requestId }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "missing_signature", request_id: requestId }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  // Read raw body for signature verification.
  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verification_failed";
    return new Response(
      JSON.stringify({
        error: "invalid_signature",
        detail: msg,
        request_id: requestId,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  const supabase = createServiceRoleClient();

  // ---- Idempotency: INSERT billing_events first; UNIQUE(stripe_event_id) ----
  const tenantId = await resolveTenantId(supabase, event);

  const insertedEventRow = await insertBillingEvent(
    supabase,
    event,
    tenantId,
    requestId,
  );

  if (insertedEventRow === "duplicate") {
    const resp: WebhookResponse = {
      received: true,
      duplicate: true,
      request_id: requestId,
    };
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
    });
  }
  if (insertedEventRow === "error") {
    return new Response(
      JSON.stringify({
        error: "billing_event_insert_failed",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  // ---- Dispatch side-effects per event type. -----
  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(supabase, stripe, event, tenantId);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, stripe, event, tenantId);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event);
        break;
      case "customer.subscription.trial_will_end":
        // Trigger E3 email — Herald owns content; M2 emits the event only.
        await audit(supabase, tenantId, "trial_will_end", {
          stripe_subscription_id: extractSubId(event),
        });
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabase, event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabase, event, tenantId);
        break;
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabase, stripe, event, tenantId);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(supabase, event);
        break;
      case "charge.dispute.created":
        await handleDisputeCreated(supabase, event, tenantId);
        break;
      default:
        // Unknown event type — already logged in billing_events. No-op.
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "dispatch_failed";
    // Compensating-rollback: delete the billing_events row so Stripe's retry
    // replays the handler. (Ledger contract: dispatch handlers must be
    // idempotent, but we still prefer the retry-replay path over a stuck
    // half-processed event.) Best-effort — if the delete fails we still
    // surface 500 to Stripe.
    try {
      await supabase
        .from("billing_events")
        .delete()
        .eq("stripe_event_id", event.id);
    } catch {
      /* swallow — Stripe retry will see duplicate row, return 200; the
         half-processed row is the audit trail. */
    }
    return new Response(
      JSON.stringify({
        error: "dispatch_failed",
        detail: msg,
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  const ok: WebhookResponse = { received: true, request_id: requestId };
  return new Response(JSON.stringify(ok), {
    status: 200,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}

/* -------------------------------------------------------------------------- */
/* Idempotent billing_events insert.                                          */
/* -------------------------------------------------------------------------- */

async function insertBillingEvent(
  supabase: Supa,
  event: Stripe.Event,
  tenantId: string,
  requestId: string,
): Promise<"inserted" | "duplicate" | "error"> {
  const { error: insertErr } = await supabase.from("billing_events").insert({
    tenant_id: tenantId,
    stripe_event_id: event.id,
    stripe_event_type: event.type,
    amount_cents: extractAmountCents(event),
    currency: extractCurrency(event),
    payload: event as unknown as Record<string, unknown>,
  });
  if (!insertErr) return "inserted";
  if ((insertErr as { code?: string }).code === "23505") return "duplicate";
  // eslint-disable-next-line no-console
  console.warn("[stripe-webhook] billing_events insert failed", {
    request_id: requestId,
    code: (insertErr as { code?: string }).code,
  });
  return "error";
}

/* -------------------------------------------------------------------------- */
/* Tenant + payload helpers.                                                  */
/* -------------------------------------------------------------------------- */

async function resolveTenantId(
  supabase: Supa,
  event: Stripe.Event,
): Promise<string> {
  // 1. checkout.session.completed carries client_reference_id =
  //    <tenant_id>:<user_id>:<session_nonce> (see /api/billing/checkout-session).
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const ref = session.client_reference_id;
    if (ref && typeof ref === "string") {
      const parts = ref.split(":");
      const refTenantId = parts[0];
      if (refTenantId && isUuid(refTenantId)) return refTenantId;
    }
  }

  // 2. Try to extract a customer id from the event payload and look up by
  //    stripe_customer_id in subscriptions.
  const obj = event.data.object as unknown as {
    customer?: string | { id?: string };
  };
  const customerId =
    typeof obj?.customer === "string"
      ? obj.customer
      : (obj?.customer?.id ?? null);
  if (customerId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("tenant_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data?.tenant_id) return data.tenant_id as string;
  }

  // 3. Fall back to a sentinel UUID. The billing_events FK to tenants will
  //    reject it; the caller surfaces 500 and Stripe retries. This is the
  //    explicit unresolved-tenant signal until Atlas wires a dead-letter
  //    table at M2.
  return "00000000-0000-0000-0000-000000000000";
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

function extractSubId(event: Stripe.Event): string | null {
  const obj = event.data.object as unknown as Record<string, unknown>;
  const sub = obj.subscription ?? obj.id;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in (sub as Record<string, unknown>)) {
    const id = (sub as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
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

/* -------------------------------------------------------------------------- */
/* Subscription handlers (D22-aware).                                         */
/* -------------------------------------------------------------------------- */

interface ResolvedPlan {
  plan: string | null;
  product_id: string | null;
  plan_family: string | null;
}

async function resolvePlanFromSubscription(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<ResolvedPlan> {
  const firstItem = sub.items?.data?.[0];
  if (!firstItem) return { plan: null, product_id: null, plan_family: null };
  const price = firstItem.price;
  const productId =
    typeof price.product === "string" ? price.product : price.product?.id ?? null;
  if (!productId) return { plan: null, product_id: null, plan_family: null };
  try {
    const product = await stripe.products.retrieve(productId);
    const meta = (product.metadata ?? null) as Record<string, string> | null;
    return {
      plan: planFromProductMetadata(meta),
      product_id: productId,
      plan_family: meta?.plan_family ?? null,
    };
  } catch {
    return { plan: null, product_id: productId, plan_family: null };
  }
}

async function handleSubscriptionCreated(
  supabase: Supa,
  stripe: Stripe,
  event: Stripe.Event,
  tenantId: string,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const resolved = await resolvePlanFromSubscription(stripe, sub);
  await upsertSubscription(supabase, sub, tenantId, resolved);
  // D22: open a cooling-off window for EU/UK on first signup.
  await maybeOpenCoolingOff(supabase, sub, tenantId, "subscribe");
}

async function handleSubscriptionUpdated(
  supabase: Supa,
  stripe: Stripe,
  event: Stripe.Event,
  tenantId: string,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  // Read prior plan so we can detect upgrades.
  const { data: prevRow } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  const prevPlan = (prevRow as { plan?: string } | null)?.plan ?? null;

  const resolved = await resolvePlanFromSubscription(stripe, sub);
  await upsertSubscription(supabase, sub, tenantId, resolved);

  // D22 reset: insert NEW cooling-off window on plan upgrade.
  if (resolved.plan && prevPlan && resolved.plan !== prevPlan) {
    if (planRank(resolved.plan) > planRank(prevPlan)) {
      await maybeOpenCoolingOff(supabase, sub, tenantId, "upgrade");
    }
  }
}

async function handleSubscriptionDeleted(
  supabase: Supa,
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

async function upsertSubscription(
  supabase: Supa,
  sub: Stripe.Subscription,
  tenantId: string,
  resolved: ResolvedPlan,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // Defensive: subscriptions.plan is NOT NULL (plan_tier). If we couldn't
  // resolve, fall back to 'free' so the UPSERT doesn't violate. The next
  // subscription.updated will likely fix it.
  const plan = resolved.plan ?? "free";
  await supabase.from("subscriptions").upsert(
    {
      tenant_id: tenantId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_start: sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      canceled_at: sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

/* -------------------------------------------------------------------------- */
/* D22 cooling-off window writer.                                             */
/* -------------------------------------------------------------------------- */

async function maybeOpenCoolingOff(
  supabase: Supa,
  sub: Stripe.Subscription,
  tenantId: string,
  trigger: "subscribe" | "upgrade",
): Promise<void> {
  // Pull region + subscription id + waiver from our own table (the
  // /api/billing/checkout-session route writes region + waiver into a stub
  // before Checkout opens). If the row isn't there yet (race with
  // checkout.session.completed), skip — the next subscription.updated will
  // observe consistent state.
  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("id, region, cooling_off_waiver_signed")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (!subRow) return;
  const row = subRow as {
    id: string;
    region: string;
    cooling_off_waiver_signed: boolean | null;
  };
  if (row.region !== "eu" && row.region !== "uk") return;

  const now = Date.now();
  await supabase.from("cooling_off_windows").insert({
    tenant_id: tenantId,
    subscription_id: row.id,
    region: row.region,
    trigger_event: trigger,
    opened_at: new Date(now).toISOString(),
    expires_at: new Date(now + COOLING_OFF_MS).toISOString(),
    waiver_signed: Boolean(row.cooling_off_waiver_signed),
  });
}

/* -------------------------------------------------------------------------- */
/* Invoice handlers.                                                          */
/* -------------------------------------------------------------------------- */

async function handleInvoicePaymentSucceeded(
  supabase: Supa,
  event: Stripe.Event,
): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const subId =
    typeof inv.subscription === "string"
      ? inv.subscription
      : inv.subscription?.id;
  if (!subId) return;
  // Reset dunning state — flip past_due back to active if applicable.
  await supabase
    .from("subscriptions")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId)
    .eq("status", "past_due");
}

async function handleInvoicePaymentFailed(
  supabase: Supa,
  event: Stripe.Event,
  tenantId: string,
): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const subId =
    typeof inv.subscription === "string"
      ? inv.subscription
      : inv.subscription?.id;
  if (!subId) return;
  await supabase
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId);
  // Emit a dunning-step event; Herald M4 consumes for email content.
  await audit(supabase, tenantId, "dunning_step", {
    stripe_subscription_id: subId,
    invoice_id: inv.id,
    attempt: inv.attempt_count ?? null,
  });
}

/* -------------------------------------------------------------------------- */
/* Checkout / one-time / dispute.                                             */
/* -------------------------------------------------------------------------- */

async function handleCheckoutSessionCompleted(
  supabase: Supa,
  stripe: Stripe,
  event: Stripe.Event,
  tenantId: string,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const amountCents = extractAmountCents(event) ?? 0;
  const currency = (extractCurrency(event) ?? "USD").toUpperCase();
  const tier = (session.metadata?.tier as string | undefined) ?? "unknown";
  const mode =
    (session.metadata?.mode as "byok" | "cli" | "managed" | undefined) ??
    "managed";
  const planFamily =
    (session.metadata?.plan_family as
      | "byok"
      | "managed"
      | "cli"
      | undefined) ?? mode;
  // Lens spec §2.4 paid_conversion — fire AFTER the billing_events insert.
  void track("paid_conversion", {
    tier,
    mode,
    currency,
    amount_cents: amountCents,
    plan_family: planFamily,
  });

  // Race-resolution: if subscription mode, ensure a stub row exists keyed on
  // stripe_subscription_id so the reconcile endpoint can fast-path. The
  // subsequent customer.subscription.created webhook will fill in plan etc.
  if (
    session.mode === "subscription" &&
    typeof session.subscription === "string"
  ) {
    try {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const resolved = await resolvePlanFromSubscription(stripe, sub);
      await upsertSubscription(supabase, sub, tenantId, resolved);
    } catch {
      // Subscription expand may fail in test fixtures; the subscription
      // webhook will reconcile.
    }
  }
}

async function handlePaymentIntentSucceeded(
  supabase: Supa,
  event: Stripe.Event,
): Promise<void> {
  // V1.5 Auto-PR one-time charge — UPDATE fix_pr_jobs and queue build job.
  // We key off the PaymentIntent.metadata.run_id (set when the
  // PaymentIntent was created at the verdict-screen CTA — see
  // stripe-config.md §3.5).
  const pi = event.data.object as Stripe.PaymentIntent;
  const runId = (pi.metadata?.run_id as string | undefined) ?? null;
  if (!runId) return;
  await supabase
    .from("fix_pr_jobs")
    .update({
      stripe_payment_intent_id: pi.id,
      state: "building",
      updated_at: new Date().toISOString(),
    })
    .eq("run_id", runId)
    .eq("state", "queued");
  // Forge enqueue-build is deferred to V1.5 worker — the state transition
  // is the queue signal that runner picks up.
}

async function handleDisputeCreated(
  supabase: Supa,
  event: Stripe.Event,
  tenantId: string,
): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const charge = dispute.charge;
  const chargeId = typeof charge === "string" ? charge : charge?.id ?? null;

  // Flag any run linked via the charge → payment_intent → fix_pr_jobs path
  // (V1.5). For M2 we surface the dispute and let Comply investigate via the
  // Sentry alert; the disputes table is Atlas's M2 migration and may not be
  // present yet, so write-attempt is defensive.
  try {
    await supabase.from("disputes").insert({
      tenant_id: tenantId,
      stripe_dispute_id: dispute.id,
      stripe_charge_id: chargeId,
      reason: dispute.reason ?? null,
      status: dispute.status ?? "needs_response",
      amount_cents: dispute.amount ?? null,
      currency: (dispute.currency ?? "usd").toUpperCase(),
      payload: dispute as unknown as Record<string, unknown>,
    });
  } catch {
    // Table not present yet (Atlas 0003 not applied). The Sentry warning
    // below is still authoritative for Comply paging.
  }

  // Sentry-level WARNING so Watch routes to Comply (NOT an error — the
  // dispute is expected business signal, just one Comply must review).
  // eslint-disable-next-line no-console
  console.warn("[stripe-webhook] charge.dispute.created", {
    tenant_id: tenantId,
    stripe_dispute_id: dispute.id,
    stripe_charge_id: chargeId,
    reason: dispute.reason,
    amount: dispute.amount,
  });
}

/* -------------------------------------------------------------------------- */
/* audit_logs helper. Writes via service-role direct INSERT; falls back to a  */
/* console log if the row insert fails (e.g. enum value not yet shipped in    */
/* 0003 — Atlas's M2 migration adds dunning_step / trial_will_end values).    */
/* -------------------------------------------------------------------------- */

async function audit(
  supabase: Supa,
  tenantId: string,
  internalAction: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      action: "admin_action",
      metadata: { internal_action: internalAction, ...metadata },
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn("[stripe-webhook] audit_log insert failed", {
      action: internalAction,
      metadata,
    });
  }
}
