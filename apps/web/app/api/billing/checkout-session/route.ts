/**
 * POST /api/billing/checkout-session
 *
 * Owner: Forge (Phase 9 M2 Batch 1). Spec: finance/stripe-config.md §1.6 +
 * §6.2 (EU/UK waiver). Reviewers: Ledger (Stripe config), Comply (cooling-off
 * waiver gate), Cipher (server-only secret use).
 *
 * --- Purpose ---------------------------------------------------------------
 * Creates a Stripe Checkout Session for the authenticated user. The Vega
 * pricing page hits this endpoint on every tier's "Start" CTA.
 *
 * --- Request body ----------------------------------------------------------
 *   {
 *     tier:                 'byok_starter' | 'byok_pro' | 'managed_starter'
 *                           | 'managed_pro' | 'cli',
 *     billing_period:       'monthly' | 'annual',
 *     cooling_off_waiver?:  boolean        // required true for EU/UK,
 *                                          // optional otherwise
 *   }
 *
 * --- Hard contracts --------------------------------------------------------
 *   - Authenticated. Web-session JWT required.
 *   - client_reference_id = <tenant_id>:<user_id>:<session_nonce> (Ledger's
 *     idempotency-forgery defense, stripe-config.md §1.6).
 *   - customer_email pulled from authenticated user.
 *   - automatic_tax: true; Stripe Tax computes per region at checkout.
 *   - tax_id_collection: true (B2B VAT).
 *   - billing_address_collection: 'required' (D20 region detection).
 *   - consent_collection.terms_of_service: 'required' (PRD §11 / Comply).
 *   - For EU/UK customers: require cooling_off_waiver === true OR
 *     ToS-equivalent acknowledgment in body (Comply locks the UX upstream
 *     in the plan-picker page; this endpoint enforces the contract).
 *   - Stripe Connect deferred to V2 (no multiplex).
 *
 * --- Price ID resolution ---------------------------------------------------
 * Per stripe-config.md §2 naming convention:
 *   price_<tier>_<currency>_<billing-period>
 *
 * Production deploys lock the actual Stripe Price IDs into env vars
 * (STRIPE_PRICE_*); this route resolves the env-var name from the (tier,
 * billing_period) tuple. Defensive errors when the env var is missing —
 * never silently fall back to the wrong tier.
 *
 * --- Response shape --------------------------------------------------------
 *   { checkout_url: string, session_id: string }
 */

import Stripe from "stripe";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API_VERSION: Stripe.LatestApiVersion =
  "2024-09-30.acacia" as Stripe.LatestApiVersion;

type Tier =
  | "byok_starter"
  | "byok_pro"
  | "managed_starter"
  | "managed_pro"
  | "cli";

type BillingPeriod = "monthly" | "annual";

type RegionCode = "eu" | "uk" | "california" | "us_other" | "row";

const VALID_TIERS: ReadonlySet<Tier> = new Set([
  "byok_starter",
  "byok_pro",
  "managed_starter",
  "managed_pro",
  "cli",
]);

const VALID_PERIODS: ReadonlySet<BillingPeriod> = new Set(["monthly", "annual"]);

interface CheckoutRequest {
  tier?: Tier;
  billing_period?: BillingPeriod;
  cooling_off_waiver?: boolean;
  /** Optional pre-declared region (Comply's plan-picker may pass this from
   *  the EU-banner flow). If absent, Stripe Tax + Checkout's billing-address
   *  collection resolves it; we record it on the resulting subscription row
   *  via webhook + the user's session metadata. */
  region?: RegionCode;
}

interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

interface ErrorResponse {
  error: string;
  detail?: string;
}

function json(
  body: CheckoutResponse | ErrorResponse,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}

/** Map (tier, billing_period) → env var name carrying the Stripe Price ID. */
function priceEnvVarName(tier: Tier, period: BillingPeriod): string {
  // STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY, etc. USD-only at MVP per
  // pricing.md §2 (EUR/GBP added when first EU customer signals).
  return `STRIPE_PRICE_${tier.toUpperCase()}_USD_${period.toUpperCase()}`;
}

function planFamilyFromTier(tier: Tier): "byok" | "managed" | "cli" {
  if (tier === "byok_starter" || tier === "byok_pro") return "byok";
  if (tier === "managed_starter" || tier === "managed_pro") return "managed";
  return "cli";
}

function modeFromTier(tier: Tier): "byok" | "managed" | "cli" {
  return planFamilyFromTier(tier);
}

function publicBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, "");
  // Fall back to request origin; Stripe success_url cannot be relative.
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  return "https://studiozero.dev";
}

export async function POST(req: Request): Promise<Response> {
  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const tier = body.tier;
  const period = body.billing_period;
  if (!tier || !VALID_TIERS.has(tier)) {
    return json({ error: "invalid_tier" }, 400);
  }
  if (!period || !VALID_PERIODS.has(period)) {
    return json({ error: "invalid_billing_period" }, 400);
  }

  // -- Auth -----------------------------------------------------------------
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: "not_authenticated" }, 401);
  }
  const user = userData.user;
  const userId = user.id;
  const email = user.email ?? null;
  const tenantId =
    (user.user_metadata as { default_tenant_id?: string } | null)
      ?.default_tenant_id ?? null;
  if (!tenantId) {
    return json({ error: "tenant_not_provisioned" }, 403);
  }

  // -- EU/UK waiver gate ---------------------------------------------------
  // The waiver checkbox is rendered on Vega's plan-picker page (B-S) per
  // ia/user-flows/billing-and-cancel.md; this endpoint is the server-side
  // contract enforcement. Comply's rule (refund-matrix.md §2): EU/UK
  // customers MUST acknowledge waiver-or-not at this step.
  if ((body.region === "eu" || body.region === "uk") && body.cooling_off_waiver !== true) {
    return json(
      {
        error: "cooling_off_waiver_required",
        detail:
          "EU/UK customers must explicitly waive the 14-day cooling-off " +
          "period via the plan-picker checkbox before checkout.",
      },
      400,
    );
  }

  // -- Price ID resolution -------------------------------------------------
  const priceEnv = priceEnvVarName(tier, period);
  const priceId = process.env[priceEnv];
  if (!priceId) {
    return json(
      {
        error: "price_not_configured",
        detail: `${priceEnv} env var is not set; Terra must provision the ` +
          "Stripe Price ID before the tier ships.",
      },
      500,
    );
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return json({ error: "stripe_not_configured" }, 500);
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION });

  // -- Build the Checkout Session ------------------------------------------
  const planFamily = planFamilyFromTier(tier);
  const mode = modeFromTier(tier);
  const sessionNonce = crypto.randomUUID();
  const clientReferenceId = `${tenantId}:${userId}:${sessionNonce}`;
  const baseUrl = publicBaseUrl(req);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    customer_creation: "always",
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    consent_collection: { terms_of_service: "required" },
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: clientReferenceId,
    ...(email ? { customer_email: email } : {}),
    success_url: `${baseUrl}/billing/return?cs={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: {
      tier,
      plan_family: planFamily,
      mode,
      billing_period: period,
      tenant_id: tenantId,
      user_id: userId,
      ...(body.region ? { region: body.region } : {}),
      cooling_off_waiver: String(Boolean(body.cooling_off_waiver)),
    },
    subscription_data: {
      metadata: {
        tier,
        plan_family: planFamily,
        tenant_id: tenantId,
        user_id: userId,
      },
    },
  };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stripe_error";
    return json({ error: "stripe_create_failed", detail: msg }, 502);
  }

  if (!session.url) {
    return json({ error: "no_checkout_url" }, 502);
  }

  return json(
    {
      checkout_url: session.url,
      session_id: session.id,
    },
    200,
  );
}
