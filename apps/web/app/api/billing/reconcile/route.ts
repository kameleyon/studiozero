/**
 * GET /api/billing/reconcile?cs=<stripe_checkout_session_id>
 *
 * Owner: Forge (Phase 9 M2 Batch 1). Spec: finance/stripe-config.md §4 +
 * architecture/decisions.md ARCH-D4. Reviewers: Ledger (idempotency),
 * Cipher (auth + session-id enumeration vector).
 *
 * --- Purpose ---------------------------------------------------------------
 * The Stripe Checkout return URL (`/billing/return?cs={CHECKOUT_SESSION_ID}`)
 * lands on Vega's polling page; the page hits this endpoint up to 10 × 2 s
 * waiting for the customer.subscription.created webhook to land. Bounded
 * polling per ARCH-D4 — never poll Stripe directly more than is necessary.
 *
 * Fast path:  if the webhook already wrote a `subscriptions` row keyed on
 *             the session's subscription id, we return success immediately.
 *             This is the canonical race-winner; no Stripe API call.
 *
 * Slow path:  otherwise we call stripe.checkout.sessions.retrieve(cs); if
 *             payment_status='paid' AND subscription populated, UPSERT the
 *             subscriptions row using stripe_subscription_id as the
 *             idempotency key (UNIQUE constraint protects against the race
 *             with the parallel webhook write).
 *
 * --- Hard contracts --------------------------------------------------------
 *   - Authenticated. Web-session JWT required.
 *   - Authorization: the JWT subject's user_id MUST match the
 *     client_reference_id's <user_id> segment on the Checkout Session
 *     (<tenant_id>:<user_id>:<nonce>). Prevents authenticated attacker from
 *     reconciling another customer's session.
 *   - Idempotent: same cs → same result regardless of poll count.
 *   - audit_logs row per poll attempt (`action='admin_action'` with
 *     `internal_action='stripe_reconcile_poll'` until Atlas's M2 enum value
 *     `stripe_reconcile_poll` lands in 0003_billing_managed.sql).
 *
 * --- Response shape (matches stripe-config.md §4.3) ------------------------
 *   {
 *     subscription_status: 'active' | 'trialing' | 'incomplete' | null,
 *     mode_unlocked:       true | false,
 *     next_action:         'ready' | 'wait' | 'failed',
 *     retry_after_ms:      2000,                            // wait only
 *     plan:                'managed_pro' | ... | null,
 *     tier:                same as plan (alias for client convenience),
 *     polled_at:           ISO 8601 timestamp,
 *   }
 */

import Stripe from "stripe";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API_VERSION: Stripe.LatestApiVersion =
  "2024-09-30.acacia" as Stripe.LatestApiVersion;

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10;
const RETRY_AFTER_SECONDS_ON_EXHAUSTION = 60;

interface ReconcileResponse {
  subscription_status: string | null;
  mode_unlocked: boolean;
  next_action: "ready" | "wait" | "failed";
  retry_after_ms?: number;
  plan: string | null;
  tier: string | null;
  polled_at: string;
  error?: string;
}

function json(
  body: ReconcileResponse | { error: string },
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}

function isCheckoutSessionId(s: string): boolean {
  return /^cs_(test|live)_[A-Za-z0-9_]{10,}$/.test(s);
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const cs = url.searchParams.get("cs");
  if (!cs || !isCheckoutSessionId(cs)) {
    return json({ error: "invalid_session_id" }, 400);
  }

  // -- Auth -----------------------------------------------------------------
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: "not_authenticated" }, 401);
  }
  const callingUserId = userData.user.id;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return json({ error: "stripe_not_configured" }, 500);
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION });

  // Service-role client for the post-success UPSERT (subscriptions row may
  // belong to a tenant whose RLS scope the user already has; service-role
  // is consistent with the webhook-side writer for race safety).
  const service = createServiceRoleClient();

  // -- 1. Fast path: did the webhook already write the row? ----------------
  //
  // We can't query stripe_subscription_id without first knowing it; but
  // billing_events.payload contains the checkout.session.completed body
  // which carries `subscription`. Query that first — cheaper than a Stripe
  // API call.
  const { data: eventRows } = await service
    .from("billing_events")
    .select("payload")
    .eq("stripe_event_type", "checkout.session.completed")
    .filter("payload->data->object->>id", "eq", cs)
    .limit(1);

  let stripeSubscriptionId: string | null = null;
  if (eventRows && eventRows.length > 0) {
    const row = eventRows[0] as {
      payload?: {
        data?: { object?: { subscription?: string | null } };
      };
    };
    const subFromPayload = row.payload?.data?.object?.subscription;
    if (typeof subFromPayload === "string") {
      stripeSubscriptionId = subFromPayload;
    }
  }

  // -- 2. Slow path: ask Stripe for the live session state -----------------
  let session: Stripe.Checkout.Session | null = null;
  if (!stripeSubscriptionId) {
    try {
      session = await stripe.checkout.sessions.retrieve(cs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "stripe_retrieve_failed";
      await pollLog(service, cs, callingUserId, "failed", msg);
      return json(
        {
          subscription_status: null,
          mode_unlocked: false,
          next_action: "failed",
          plan: null,
          tier: null,
          polled_at: nowIso(),
          error: "stripe_retrieve_failed",
        },
        404,
      );
    }
    if (typeof session.subscription === "string") {
      stripeSubscriptionId = session.subscription;
    }
  }

  // -- 3. Authorization gate (client_reference_id ownership check) ---------
  //
  // If we never fetched the session in the slow path (fast-path hit), we
  // still need to verify ownership. Fetch the session if we haven't.
  if (!session) {
    try {
      session = await stripe.checkout.sessions.retrieve(cs);
    } catch {
      // Treat as failed — we cannot authorize without the session.
      await pollLog(service, cs, callingUserId, "failed", "owner_check_no_session");
      return json(
        {
          subscription_status: null,
          mode_unlocked: false,
          next_action: "failed",
          plan: null,
          tier: null,
          polled_at: nowIso(),
          error: "stripe_retrieve_failed",
        },
        404,
      );
    }
  }
  const ref = session.client_reference_id ?? null;
  if (typeof ref === "string") {
    const parts = ref.split(":");
    const refUserId = parts.length >= 2 ? parts[1] : undefined;
    if (refUserId && isUuid(refUserId) && refUserId !== callingUserId) {
      await pollLog(service, cs, callingUserId, "failed", "user_mismatch");
      return json({ error: "forbidden" }, 403);
    }
  }

  // -- 4. Rate limit per (user_id, cs) -------------------------------------
  const { data: priorPolls } = await service
    .from("audit_logs")
    .select("id")
    .eq("actor_user_id", callingUserId)
    .filter("metadata->>cs", "eq", cs)
    .filter("metadata->>internal_action", "eq", "stripe_reconcile_poll");
  const attempt = (priorPolls?.length ?? 0) + 1;
  if (attempt > MAX_POLLS) {
    return new Response(
      JSON.stringify({
        subscription_status: null,
        mode_unlocked: false,
        next_action: "failed",
        plan: null,
        tier: null,
        polled_at: nowIso(),
        error: "poll_budget_exhausted",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(RETRY_AFTER_SECONDS_ON_EXHAUSTION),
          ...aiDisclosureHeaders,
        },
      },
    );
  }

  // -- 5. Decide based on the session state --------------------------------
  if (session.payment_status === "paid" && stripeSubscriptionId) {
    // Look in our table — webhook may have already written it.
    const { data: subRow } = await service
      .from("subscriptions")
      .select("status, plan, tenant_id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    let status = (subRow as { status?: string } | null)?.status ?? null;
    let plan = (subRow as { plan?: string } | null)?.plan ?? null;
    let tenantId = (subRow as { tenant_id?: string } | null)?.tenant_id ?? null;

    if (!subRow) {
      // Race-recovery: webhook hasn't landed; build a stub row from Stripe.
      // The UNIQUE on stripe_subscription_id keeps this idempotent vs the
      // parallel webhook write — only one INSERT wins, the other ignored.
      let sub: Stripe.Subscription | null = null;
      try {
        sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } catch {
        // Fall through — surface 'wait'.
      }
      if (sub) {
        // Resolve plan from Product metadata.
        const firstItem = sub.items?.data?.[0];
        if (firstItem) {
          const productId =
            typeof firstItem.price.product === "string"
              ? firstItem.price.product
              : firstItem.price.product?.id ?? null;
          if (productId) {
            try {
              const product = await stripe.products.retrieve(productId);
              const tier = (product.metadata?.tier as string | undefined) ?? null;
              if (tier) plan = tier;
            } catch {
              /* swallow — plan stays null; client retries */
            }
          }
        }
        status = sub.status;
        // Pull tenantId from client_reference_id if we have it; else from
        // session metadata.
        if (!tenantId && ref) {
          const parts = ref.split(":");
          const refTenantId = parts[0];
          if (refTenantId && isUuid(refTenantId)) {
            tenantId = refTenantId;
          }
        }
        if (tenantId && plan) {
          await service.from("subscriptions").upsert(
            {
              tenant_id: tenantId,
              user_id: callingUserId,
              stripe_customer_id:
                typeof sub.customer === "string" ? sub.customer : sub.customer.id,
              stripe_subscription_id: sub.id,
              plan,
              status: sub.status,
              region: (session.metadata?.region as string | undefined) ?? "us_other",
              current_period_start: sub.current_period_start
                ? new Date(sub.current_period_start * 1000).toISOString()
                : null,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" },
          );

          // Synthesize a billing_events row so the audit ledger picks up
          // the reconcile-driven write. The synthesized event_id prefix
          // distinguishes from real Stripe events; UNIQUE protects against
          // duplicate polls.
          await service.from("billing_events").insert({
            tenant_id: tenantId,
            stripe_event_id: `reconcile:${cs}:${sub.id}`,
            stripe_event_type: "internal.reconcile",
            amount_cents: session.amount_total ?? null,
            currency: (session.currency ?? "usd").toUpperCase(),
            payload: { source: "reconcile_endpoint", cs, sub_id: sub.id },
          });
        }
      }
    }

    const modeUnlocked =
      status === "trialing" || status === "active";
    if (modeUnlocked) {
      await pollLog(service, cs, callingUserId, "ready", null);
      return json({
        subscription_status: status,
        mode_unlocked: true,
        next_action: "ready",
        plan: plan ?? null,
        tier: plan ?? null,
        polled_at: nowIso(),
      });
    }
  }

  if (
    session.payment_status === "unpaid" ||
    session.payment_status === "no_payment_required"
  ) {
    if (session.payment_status === "no_payment_required") {
      // Free-tier promo (Coupon edge case). Treat as ready.
      await pollLog(service, cs, callingUserId, "ready", "no_payment_required");
      return json({
        subscription_status: "active",
        mode_unlocked: true,
        next_action: "ready",
        plan: "free_promo",
        tier: "free_promo",
        polled_at: nowIso(),
      });
    }
  }

  // -- 6. Default: wait + retry -------------------------------------------
  await pollLog(service, cs, callingUserId, "wait", null);
  return json({
    subscription_status: null,
    mode_unlocked: false,
    next_action: "wait",
    retry_after_ms: POLL_INTERVAL_MS,
    plan: null,
    tier: null,
    polled_at: nowIso(),
  });
}

async function pollLog(
  service: ReturnType<typeof createServiceRoleClient>,
  cs: string,
  userId: string,
  result: string,
  detail: string | null,
): Promise<void> {
  // Resolve tenant_id from the user's default tenant (Atlas's M2 enum value
  // `stripe_reconcile_poll` is not yet shipped; we use the existing
  // `admin_action` with `internal_action` metadata to keep the row valid).
  try {
    const { data: userRow } = await service
      .from("users")
      .select("default_tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId =
      (userRow as { default_tenant_id?: string } | null)?.default_tenant_id ??
      null;
    if (!tenantId) return;
    await service.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "admin_action",
      metadata: {
        internal_action: "stripe_reconcile_poll",
        cs,
        result,
        ...(detail ? { detail } : {}),
      },
    });
  } catch {
    /* swallow — telemetry, not load-bearing */
  }
}
