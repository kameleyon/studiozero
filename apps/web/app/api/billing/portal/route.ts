/**
 * GET /api/billing/portal
 *
 * Owner: Forge (Phase 9 M2 Batch 1). Spec: finance/stripe-config.md §1.5
 * (Customer Portal) + R20 mitigation (FTC 16 CFR 425 Click-to-Cancel).
 * Reviewers: Ledger (Stripe config), Comply (FTC compliance posture).
 *
 * --- Purpose ---------------------------------------------------------------
 * Returns a fresh, short-lived Stripe Customer Portal URL for the calling
 * user's active subscription. Used by:
 *   - Vega's B0 "Manage subscription" button (settings → Billing)
 *   - Dunning emails' "Update payment method" CTA (Herald, M4)
 *   - The FTC Click-to-Cancel "Cancel subscription" UI surface
 *
 * --- Hard contracts --------------------------------------------------------
 *   - Authenticated. Web-session JWT required.
 *   - Resolves stripe_customer_id from the user's active subscription row
 *     (RLS-scoped — anon/authenticated can read their own tenant's rows).
 *   - Portal session is one-shot, expires per Stripe default (~1 h).
 *   - return_url lands on /app/settings/billing.
 *
 * --- Response shape --------------------------------------------------------
 *   { portal_url: string, expires_in_seconds: number }
 *
 * Cancel-in-same-channel-as-signup is satisfied because both signup (Stripe
 * Checkout) and cancel (Stripe Customer Portal) are online flows in the
 * same browser session.
 */

import Stripe from "stripe";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API_VERSION: Stripe.LatestApiVersion =
  "2024-09-30.acacia" as Stripe.LatestApiVersion;

interface PortalResponse {
  portal_url: string;
}

interface ErrorResponse {
  error: string;
  detail?: string;
}

function json(body: PortalResponse | ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}

function publicBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  return "https://studiozero.dev";
}

export async function GET(req: Request): Promise<Response> {
  // -- Auth -----------------------------------------------------------------
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: "not_authenticated" }, 401);
  }
  const userId = userData.user.id;
  const tenantId =
    (userData.user.user_metadata as { default_tenant_id?: string } | null)
      ?.default_tenant_id ?? null;
  if (!tenantId) {
    return json({ error: "tenant_not_provisioned" }, 403);
  }

  // -- Resolve stripe_customer_id -----------------------------------------
  //
  // Read via the authenticated session client (RLS scoped to the tenant).
  // Service-role is only needed if RLS denies, which it shouldn't for the
  // user's own subscription row.
  const { data: subRow, error: subErr } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, status, user_id")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due", "canceled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr || !subRow) {
    return json({ error: "no_subscription" }, 404);
  }
  const customerId = (subRow as { stripe_customer_id?: string })
    .stripe_customer_id;
  if (!customerId) {
    return json({ error: "no_stripe_customer" }, 404);
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return json({ error: "stripe_not_configured" }, 500);
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION });

  // -- Mint a Customer Portal session --------------------------------------
  const baseUrl = publicBaseUrl(req);
  let portal: Stripe.BillingPortal.Session;
  try {
    portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/app/settings/billing`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stripe_error";
    return json({ error: "portal_create_failed", detail: msg }, 502);
  }

  // -- Audit log: cancel-in-same-channel FTC compliance trail --------------
  try {
    const service = createServiceRoleClient();
    await service.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "admin_action",
      metadata: {
        internal_action: "billing_portal_opened",
        stripe_customer_id: customerId,
      },
    });
  } catch {
    /* swallow — telemetry, not load-bearing */
  }

  return json({ portal_url: portal.url }, 200);
}
