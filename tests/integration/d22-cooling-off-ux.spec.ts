/**
 * Studio Zero — D22 cooling-off UX gates (D1/D2/D3/D4/D5 close).
 *
 * Asserts the D22 EU/UK cooling-off UX gaps closed in Phase 9 M2 Batch 3:
 *   D1: Edge region detection (`x-vercel-ip-country` etc.) resolves the
 *       five RegionCode values per refund-matrix.md §3.1.
 *   D2: /api/billing/checkout-session enforces strict-true waiver for
 *       EU/UK; non-strict-true → 400 cooling_off_waiver_required.
 *   D3: Without waiver, EU subscription.created opens a cooling_off_windows
 *       row with waiver_signed=false (handled by existing webhook handler
 *       — verified live).
 *   D4: With waiver, the same handler writes waiver_signed=true.
 *   D5: subscription.updated upgrade event inserts a fresh
 *       cooling_off_windows row with trigger_event='upgrade'.
 *
 * Contract refs:
 *   - apps/web/lib/region-detect.ts
 *   - apps/web/app/api/billing/checkout-session/route.ts
 *   - apps/web/app/api/webhooks/stripe/route.ts (handleSubscriptionCreated)
 *   - compliance/d22-cooling-off-flow.md (D1-D5 closed-status)
 *   - finance/refund-matrix.md §3.1–3.5
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  detectRegion,
  detectRegionFromRequest,
  requiresCoolingOffWaiver,
} from "../../apps/web/lib/region-detect.js";
import {
  mockStripeState,
  resetMockStripe,
  makeStripeMockModule,
} from "./_helpers/mock-stripe.js";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase.js";

vi.mock("server-only", () => ({}));
vi.mock("stripe", () => makeStripeMockModule());

const __mockServer: MockSupabase = makeMockSupabase();
const __mockService: MockSupabase = makeMockSupabase();
vi.mock("../../apps/web/lib/supabase-server", () => ({
  createServerSupabaseClient: async () => __mockServer.client,
}));
vi.mock("../../apps/web/lib/supabase-service", () => ({
  createServiceRoleClient: () => __mockService.client,
}));
vi.mock("../../apps/web/lib/analytics-events.v1", () => ({
  track: () => Promise.resolve(),
}));

const checkoutRouteMod = await import(
  "../../apps/web/app/api/billing/checkout-session/route.js"
);
const checkoutPOST = (
  checkoutRouteMod as { POST: (req: Request) => Promise<Response> }
).POST;

const webhookRouteMod = await import(
  "../../apps/web/app/api/webhooks/stripe/route.js"
);
const webhookPOST = (
  webhookRouteMod as { POST: (req: Request) => Promise<Response> }
).POST;

const TENANT_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "44444444-4444-4444-4444-444444444444";

function makeCheckoutReq(body: Record<string, unknown>): Request {
  return new Request("http://test.example.com/api/billing/checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeWebhookReq(event: Record<string, unknown>): Request {
  return new Request("http://test.example.com/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "stripe-signature": "valid_sig",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
}

beforeEach(() => {
  resetMockStripe();
  __mockServer.reset();
  __mockService.reset();
  __mockService.registerUnique("billing_events", "stripe_event_id");
  __mockServer.setUser({
    id: USER_ID,
    email: "eu-user@example.com",
    user_metadata: { default_tenant_id: TENANT_ID },
  });
  process.env.STRIPE_SECRET_KEY = "sk_test_VERIFY";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_VERIFY";
  process.env.STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY = "price_test_byok_starter";
  process.env.NEXT_PUBLIC_SITE_URL = "http://test.example.com";

  // Seed product fixtures for upgrade flow.
  mockStripeState.stubProducts.set("prod_BYOK_STARTER", {
    id: "prod_BYOK_STARTER",
    metadata: { tier: "byok_starter", plan_family: "byok" },
  });
  mockStripeState.stubProducts.set("prod_BYOK_PRO", {
    id: "prod_BYOK_PRO",
    metadata: { tier: "byok_pro", plan_family: "byok" },
  });
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

// ===========================================================================
// D1 — Region detection at the edge
// ===========================================================================
describe("D1 — region detection from edge headers", () => {
  it("DE → eu", () => {
    expect(detectRegion({ country: "DE" })).toBe("eu");
  });
  it("FR → eu", () => {
    expect(detectRegion({ country: "FR" })).toBe("eu");
  });
  it("GB → uk", () => {
    expect(detectRegion({ country: "GB" })).toBe("uk");
  });
  it("UK alias → uk", () => {
    expect(detectRegion({ country: "UK" })).toBe("uk");
  });
  it("US + CA region → california", () => {
    expect(detectRegion({ country: "US", region: "CA" })).toBe("california");
  });
  it("US + NY → us_other", () => {
    expect(detectRegion({ country: "US", region: "NY" })).toBe("us_other");
  });
  it("JP → row", () => {
    expect(detectRegion({ country: "JP" })).toBe("row");
  });
  it("empty → row", () => {
    expect(detectRegion({ country: "" })).toBe("row");
  });

  it("requiresCoolingOffWaiver: eu/uk only", () => {
    expect(requiresCoolingOffWaiver("eu")).toBe(true);
    expect(requiresCoolingOffWaiver("uk")).toBe(true);
    expect(requiresCoolingOffWaiver("california")).toBe(false);
    expect(requiresCoolingOffWaiver("us_other")).toBe(false);
    expect(requiresCoolingOffWaiver("row")).toBe(false);
  });

  it("detectRegionFromRequest reads Vercel headers", () => {
    const req = new Request("http://test/", {
      headers: { "x-vercel-ip-country": "DE" },
    });
    expect(detectRegionFromRequest(req)).toBe("eu");
  });

  it("detectRegionFromRequest falls back to cf-ipcountry", () => {
    const req = new Request("http://test/", {
      headers: { "cf-ipcountry": "FR" },
    });
    expect(detectRegionFromRequest(req)).toBe("eu");
  });
});

// ===========================================================================
// D2 — Checkout-session waiver gate (server-side enforcement)
// ===========================================================================
describe("D2 — checkout-session enforces strict-true EU/UK waiver gate", () => {
  it("EU without waiver → 400 cooling_off_waiver_required", async () => {
    const res = await checkoutPOST(
      makeCheckoutReq({
        tier: "byok_starter",
        billing_period: "monthly",
        region: "eu",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("cooling_off_waiver_required");
  });

  it("EU with cooling_off_waiver: false → 400", async () => {
    const res = await checkoutPOST(
      makeCheckoutReq({
        tier: "byok_starter",
        billing_period: "monthly",
        region: "eu",
        cooling_off_waiver: false,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("EU with stringy 'true' → 400 (strict equality)", async () => {
    const res = await checkoutPOST(
      makeCheckoutReq({
        tier: "byok_starter",
        billing_period: "monthly",
        region: "eu",
        cooling_off_waiver: "true",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("EU with true → 200 + checkout_url", async () => {
    mockStripeState.stubCheckoutSession = {
      id: "cs_test_EU_OK",
      url: "https://checkout.stripe.com/c/pay/cs_test_EU_OK",
    };
    const res = await checkoutPOST(
      makeCheckoutReq({
        tier: "byok_starter",
        billing_period: "monthly",
        region: "eu",
        cooling_off_waiver: true,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { checkout_url: string };
    expect(body.checkout_url).toContain("checkout.stripe.com");

    // The metadata.cooling_off_waiver is forwarded as "true" for the
    // webhook handler to read.
    const params = mockStripeState.checkoutCreateCalls[0];
    const meta = params.metadata as Record<string, string>;
    expect(meta.cooling_off_waiver).toBe("true");
    expect(meta.region).toBe("eu");
  });

  it("UK with true → 200", async () => {
    const res = await checkoutPOST(
      makeCheckoutReq({
        tier: "byok_starter",
        billing_period: "monthly",
        region: "uk",
        cooling_off_waiver: true,
      }),
    );
    expect(res.status).toBe(200);
  });

  it("California → no waiver gate, 200 even without waiver", async () => {
    const res = await checkoutPOST(
      makeCheckoutReq({
        tier: "byok_starter",
        billing_period: "monthly",
        region: "california",
      }),
    );
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// D3 — EU subscription.created opens cooling-off window (waiver_signed=false)
// ===========================================================================
describe("D3 — EU customer without waiver opens 14-day cooling-off window", () => {
  it("writes cooling_off_windows row with waiver_signed=false", async () => {
    // 1st read: resolveTenantId (subscriptions by stripe_customer_id) — returns tenant_id row
    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    // 2nd read: maybeOpenCoolingOff reads the subscriptions row for region+waiver
    __mockService.pushRead("subscriptions", {
      id: "sub_uuid_eu",
      region: "eu",
      cooling_off_waiver_signed: false,
    });

    const event = {
      id: "evt_eu_subscribe",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_EU_NOWAIVER",
          customer: "cus_EU_TEST",
          status: "active",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          items: { data: [{ price: { product: "prod_BYOK_STARTER" } }] },
        },
      },
    };
    const res = await webhookPOST(makeWebhookReq(event));
    expect(res.status).toBe(200);

    const rows = __mockService.inserts.filter(
      (i) => i.table === "cooling_off_windows",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const row = rows[0].row as Record<string, unknown>;
    expect(row.region).toBe("eu");
    expect(row.trigger_event).toBe("subscribe");
    expect(row.waiver_signed).toBe(false);
  });
});

// ===========================================================================
// D4 — EU customer WITH waiver writes waiver_signed=true
// ===========================================================================
describe("D4 — EU customer with waiver writes waiver_signed=true", () => {
  it("cooling_off_windows.waiver_signed = true", async () => {
    // 1st read: resolveTenantId
    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    // 2nd read: maybeOpenCoolingOff
    __mockService.pushRead("subscriptions", {
      id: "sub_uuid_eu_waived",
      region: "eu",
      cooling_off_waiver_signed: true,
    });
    const event = {
      id: "evt_eu_waived",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_EU_WAIVED",
          customer: "cus_EU_WAIVED",
          status: "active",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          items: { data: [{ price: { product: "prod_BYOK_STARTER" } }] },
        },
      },
    };
    await webhookPOST(makeWebhookReq(event));
    const rows = __mockService.inserts.filter(
      (i) => i.table === "cooling_off_windows",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect((rows[0].row as Record<string, unknown>).waiver_signed).toBe(true);
  });
});

// ===========================================================================
// D5 — Upgrade event inserts NEW cooling_off_windows row
// ===========================================================================
describe("D5 — upgrade inserts fresh cooling_off_windows row", () => {
  it("BYOK starter → BYOK pro for EU customer: new row with trigger_event='upgrade'", async () => {
    // 1st read: resolveTenantId
    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    // 2nd read: handleSubscriptionUpdated prior-plan lookup
    __mockService.pushRead("subscriptions", { plan: "byok_starter" });
    // 3rd read: maybeOpenCoolingOff reads the subscriptions row
    __mockService.pushRead("subscriptions", {
      id: "sub_uuid_upgrade",
      region: "eu",
      cooling_off_waiver_signed: false,
    });

    const event = {
      id: "evt_eu_upgrade",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_EU_UPGRADE",
          customer: "cus_EU_UPGRADE",
          status: "active",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          items: { data: [{ price: { product: "prod_BYOK_PRO" } }] },
        },
      },
    };
    const res = await webhookPOST(makeWebhookReq(event));
    expect(res.status).toBe(200);

    const rows = __mockService.inserts.filter(
      (i) => i.table === "cooling_off_windows",
    );
    // Should have one upgrade-triggered window.
    const upgradeRows = rows.filter(
      (r) => (r.row as Record<string, unknown>).trigger_event === "upgrade",
    );
    expect(upgradeRows.length).toBeGreaterThanOrEqual(1);
    expect((upgradeRows[0].row as Record<string, unknown>).region).toBe("eu");
  });
});
