/**
 * Studio Zero — Stripe Checkout flow (M2 Batch 2 Verify).
 *
 * Replaces the M2 Batch 1 scaffold (commit 26b5781 + later). Drives the
 * POST /api/billing/checkout-session route with mocked Stripe SDK + mocked
 * Supabase server client (no live Supabase, no live Stripe).
 *
 * Contract verified per apps/web/app/api/billing/checkout-session/route.ts
 * header doc + finance/stripe-config.md §1.6 + §6.2:
 *   1. Body validation: missing/invalid tier → 400; missing/invalid
 *      billing_period → 400.
 *   2. Auth: unauthenticated → 401.
 *   3. Tenant: user.user_metadata.default_tenant_id missing → 403.
 *   4. EU/UK + cooling_off_waiver !== true → 400 cooling_off_waiver_required.
 *   5. EU/UK + cooling_off_waiver === true → 200, Stripe session created.
 *   6. Missing STRIPE_PRICE_<TIER>_USD_<PERIOD> env → 500 price_not_configured.
 *   7. Missing STRIPE_SECRET_KEY → 500 stripe_not_configured.
 *   8. Happy path → returns { checkout_url, session_id } + the Stripe
 *      session was created with the correct params:
 *        - automatic_tax.enabled = true
 *        - tax_id_collection.enabled = true
 *        - billing_address_collection = "required"
 *        - consent_collection.terms_of_service = "required"
 *        - client_reference_id = `<tenant>:<user>:<nonce>`
 *        - line_items[0].price = resolved env var
 *        - metadata.tier + plan_family + mode + billing_period + tenant_id +
 *          user_id all present.
 *        - subscription_data.metadata mirrors the same.
 *   9. Stripe.create throws → 502 stripe_create_failed.
 *
 * Coverage target ≥75% statement on the route.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockStripeState,
  resetMockStripe,
  makeStripeMockModule,
} from "./_helpers/mock-stripe.js";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase.js";

// ---- Mocks (hoisted) ------------------------------------------------------
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => makeStripeMockModule());

// Mock the supabase-server module which is what the route imports.
const __mockSupa: MockSupabase = makeMockSupabase();
vi.mock("../../apps/web/lib/supabase-server", () => ({
  createServerSupabaseClient: async () => __mockSupa.client,
  getServerUser: async () => null,
}));

// Route under test.
const routeMod = await import(
  "../../apps/web/app/api/billing/checkout-session/route.js"
);
const POST = (
  routeMod as { POST: (req: Request) => Promise<Response> }
).POST;

// ---- Fixtures -------------------------------------------------------------
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const USER_EMAIL = "founder@example.com";

const AUTH_USER = {
  id: USER_ID,
  email: USER_EMAIL,
  user_metadata: { default_tenant_id: TENANT_ID },
};

function makeReq(body: unknown, origin = "http://test.example.com"): Request {
  return new Request(`${origin}/api/billing/checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

const PRICE_ENV_HAPPY = "STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY";

beforeEach(() => {
  resetMockStripe();
  __mockSupa.reset();
  __mockSupa.setUser(AUTH_USER);
  process.env.STRIPE_SECRET_KEY = "sk_test_VERIFY";
  process.env[PRICE_ENV_HAPPY] = "price_BYOK_STARTER_MONTHLY_123";
  mockStripeState.stubCheckoutSession = {
    id: "cs_test_HAPPY_001",
    url: "https://checkout.stripe.com/c/pay/cs_test_HAPPY_001",
  };
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env[PRICE_ENV_HAPPY];
  delete process.env.STRIPE_PRICE_MANAGED_STARTER_USD_MONTHLY;
});

describe("checkout-session — body validation", () => {
  it("missing tier → 400 invalid_tier", async () => {
    const res = await POST(makeReq({ billing_period: "monthly" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_tier");
  });

  it("invalid tier value → 400", async () => {
    const res = await POST(makeReq({ tier: "premium_plus", billing_period: "monthly" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_tier");
  });

  it("missing billing_period → 400 invalid_billing_period", async () => {
    const res = await POST(makeReq({ tier: "byok_starter" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_billing_period");
  });

  it("malformed JSON body → 400 invalid_body", async () => {
    const req = new Request("http://test.example.com/api/billing/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_body");
  });
});

describe("checkout-session — auth", () => {
  it("not authenticated → 401", async () => {
    __mockSupa.setUser(null);
    const res = await POST(makeReq({ tier: "byok_starter", billing_period: "monthly" }));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_authenticated");
  });

  it("user without default_tenant_id → 403 tenant_not_provisioned", async () => {
    __mockSupa.setUser({ id: USER_ID, email: USER_EMAIL, user_metadata: {} });
    const res = await POST(makeReq({ tier: "byok_starter", billing_period: "monthly" }));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("tenant_not_provisioned");
  });
});

describe("checkout-session — EU/UK cooling-off waiver gate (D22 / refund-matrix §2)", () => {
  it("EU without cooling_off_waiver=true → 400 cooling_off_waiver_required", async () => {
    const res = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly", region: "eu" }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("cooling_off_waiver_required");
    // NO Stripe call was made.
    expect(mockStripeState.checkoutCreateCalls).toHaveLength(0);
  });

  it("UK without cooling_off_waiver=true → 400", async () => {
    const res = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly", region: "uk" }),
    );
    expect(res.status).toBe(400);
    expect(mockStripeState.checkoutCreateCalls).toHaveLength(0);
  });

  it("EU + cooling_off_waiver=true → 200 + Stripe session created", async () => {
    const res = await POST(
      makeReq({
        tier: "byok_starter",
        billing_period: "monthly",
        region: "eu",
        cooling_off_waiver: true,
      }),
    );
    expect(res.status).toBe(200);
    expect(mockStripeState.checkoutCreateCalls).toHaveLength(1);
    const params = mockStripeState.checkoutCreateCalls[0];
    const meta = params.metadata as Record<string, string>;
    expect(meta.region).toBe("eu");
    expect(meta.cooling_off_waiver).toBe("true");
  });

  it("non-EU/UK without waiver → 200 (waiver irrelevant for US/RoW)", async () => {
    const res = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly" }),
    );
    expect(res.status).toBe(200);
  });
});

describe("checkout-session — Stripe Price ID env resolution", () => {
  it("missing STRIPE_PRICE_<TIER>_USD_<PERIOD> → 500 price_not_configured", async () => {
    // Happy env tier is byok_starter; ask for a tier whose env IS NOT set.
    delete process.env.STRIPE_PRICE_MANAGED_STARTER_USD_MONTHLY;
    const res = await POST(
      makeReq({ tier: "managed_starter", billing_period: "monthly" }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; detail?: string };
    expect(body.error).toBe("price_not_configured");
    expect(body.detail).toContain("STRIPE_PRICE_MANAGED_STARTER_USD_MONTHLY");
  });

  it("resolves env var name from (tier, billing_period) → STRIPE_PRICE_<TIER>_USD_<PERIOD>", async () => {
    process.env.STRIPE_PRICE_MANAGED_PRO_USD_ANNUAL = "price_MP_ANNUAL_999";
    try {
      const res = await POST(
        makeReq({ tier: "managed_pro", billing_period: "annual" }),
      );
      expect(res.status).toBe(200);
      const params = mockStripeState.checkoutCreateCalls[0];
      const items = params.line_items as Array<{ price: string }>;
      expect(items[0].price).toBe("price_MP_ANNUAL_999");
    } finally {
      delete process.env.STRIPE_PRICE_MANAGED_PRO_USD_ANNUAL;
    }
  });

  it("missing STRIPE_SECRET_KEY → 500 stripe_not_configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly" }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("stripe_not_configured");
  });
});

describe("checkout-session — happy path Stripe params (stripe-config.md §1.6)", () => {
  it("creates Stripe Checkout Session with all hard-contract fields", async () => {
    const res = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly" }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { checkout_url: string; session_id: string };
    expect(body.checkout_url).toBe("https://checkout.stripe.com/c/pay/cs_test_HAPPY_001");
    expect(body.session_id).toBe("cs_test_HAPPY_001");

    expect(mockStripeState.checkoutCreateCalls).toHaveLength(1);
    const p = mockStripeState.checkoutCreateCalls[0] as Record<string, unknown>;

    expect(p.mode).toBe("subscription");
    expect(p.payment_method_types).toEqual(["card"]);
    expect(p.customer_creation).toBe("always");
    expect((p.automatic_tax as { enabled: boolean }).enabled).toBe(true);
    expect((p.tax_id_collection as { enabled: boolean }).enabled).toBe(true);
    expect(p.billing_address_collection).toBe("required");
    expect((p.consent_collection as { terms_of_service: string }).terms_of_service).toBe("required");
    expect(p.allow_promotion_codes).toBe(true);
    expect(p.customer_email).toBe(USER_EMAIL);

    const items = p.line_items as Array<{ price: string; quantity: number }>;
    expect(items[0].price).toBe("price_BYOK_STARTER_MONTHLY_123");
    expect(items[0].quantity).toBe(1);
  });

  it("client_reference_id format is <tenant_id>:<user_id>:<nonce>", async () => {
    await POST(makeReq({ tier: "byok_starter", billing_period: "monthly" }));
    const p = mockStripeState.checkoutCreateCalls[0] as Record<string, unknown>;
    const cri = String(p.client_reference_id);
    const parts = cri.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(TENANT_ID);
    expect(parts[1]).toBe(USER_ID);
    // Nonce — UUID v4 shape.
    expect(parts[2]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("metadata + subscription_data.metadata carry tier + plan_family + mode + tenant_id + user_id", async () => {
    await POST(makeReq({ tier: "managed_pro", billing_period: "monthly" }));
    process.env.STRIPE_PRICE_MANAGED_PRO_USD_MONTHLY = "price_MP_MONTHLY";
    try {
      const res = await POST(
        makeReq({ tier: "managed_pro", billing_period: "monthly" }),
      );
      // First call (above) failed price_not_configured because env wasn't
      // set at the time. The second call (this one) succeeds; assert on it.
      if (res.status !== 200) {
        // Defensive: surface the body in failure mode.
        const body = await res.json();
        throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(body)}`);
      }
      const created = mockStripeState.checkoutCreateCalls.at(-1) as Record<string, unknown>;
      const meta = created.metadata as Record<string, string>;
      expect(meta.tier).toBe("managed_pro");
      expect(meta.plan_family).toBe("managed");
      expect(meta.mode).toBe("managed");
      expect(meta.billing_period).toBe("monthly");
      expect(meta.tenant_id).toBe(TENANT_ID);
      expect(meta.user_id).toBe(USER_ID);

      const subMeta = (
        created.subscription_data as { metadata: Record<string, string> }
      ).metadata;
      expect(subMeta.tier).toBe("managed_pro");
      expect(subMeta.plan_family).toBe("managed");
      expect(subMeta.tenant_id).toBe(TENANT_ID);
      expect(subMeta.user_id).toBe(USER_ID);
    } finally {
      delete process.env.STRIPE_PRICE_MANAGED_PRO_USD_MONTHLY;
    }
  });

  it("success_url + cancel_url are absolute (Stripe rejects relative)", async () => {
    await POST(makeReq({ tier: "byok_starter", billing_period: "monthly" }, "http://app.studiozero.dev"));
    const p = mockStripeState.checkoutCreateCalls[0] as Record<string, unknown>;
    expect(String(p.success_url)).toMatch(/^https?:\/\//);
    expect(String(p.success_url)).toContain("/billing/return?cs={CHECKOUT_SESSION_ID}");
    expect(String(p.cancel_url)).toMatch(/^https?:\/\//);
    expect(String(p.cancel_url)).toContain("/pricing");
  });

  it("Stripe ctor called with locked apiVersion '2024-09-30.acacia'", async () => {
    await POST(makeReq({ tier: "byok_starter", billing_period: "monthly" }));
    expect(mockStripeState.ctorCalls).toHaveLength(1);
    expect(mockStripeState.ctorCalls[0].opts.apiVersion).toBe("2024-09-30.acacia");
    expect(mockStripeState.ctorCalls[0].secret).toBe("sk_test_VERIFY");
  });
});

describe("checkout-session — upstream Stripe failure", () => {
  it("stripe.checkout.sessions.create throws → 502 stripe_create_failed", async () => {
    mockStripeState.throwOnCheckoutCreate = new Error("Stripe is down");
    const res = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly" }),
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; detail?: string };
    expect(body.error).toBe("stripe_create_failed");
    expect(body.detail).toContain("Stripe is down");
  });

  it("Stripe returns session with no url → 502 no_checkout_url", async () => {
    mockStripeState.stubCheckoutSession = {
      id: "cs_test_NOURL",
      url: null,
    };
    const res = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly" }),
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("no_checkout_url");
  });
});

describe("checkout-session — disclosure header invariant", () => {
  it("every Response carries X-AI-Generated:studio-zero (Art. 50)", async () => {
    const happy = await POST(
      makeReq({ tier: "byok_starter", billing_period: "monthly" }),
    );
    expect(happy.headers.get("x-ai-generated")).toBe("studio-zero");

    const bad = await POST(makeReq({ tier: "invalid", billing_period: "monthly" }));
    expect(bad.headers.get("x-ai-generated")).toBe("studio-zero");
  });
});
