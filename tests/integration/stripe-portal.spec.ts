/**
 * Studio Zero — Stripe Customer Portal (M2 Batch 2 Verify).
 *
 * Drives GET /api/billing/portal with mocked Stripe + Supabase. Asserts the
 * FTC Click-to-Cancel compliance trail (audit_logs row per portal-open) +
 * the one-shot portal URL contract.
 *
 * Contract per apps/web/app/api/billing/portal/route.ts + R20 mitigation:
 *   - Unauthenticated → 401 not_authenticated.
 *   - User without default_tenant_id → 403 tenant_not_provisioned.
 *   - No subscription on file → 404 no_subscription.
 *   - Subscription with no stripe_customer_id → 404 no_stripe_customer.
 *   - Missing STRIPE_SECRET_KEY → 500 stripe_not_configured.
 *   - Stripe billingPortal.sessions.create throws → 502 portal_create_failed.
 *   - Happy path → 200 { portal_url } + return_url lands on /app/settings/billing.
 *   - audit_logs row recorded (internal_action='billing_portal_opened').
 *   - X-AI-Generated header on every Response.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const routeMod = await import("../../apps/web/app/api/billing/portal/route.js");
const GET = (
  routeMod as { GET: (req: Request) => Promise<Response> }
).GET;

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const CUSTOMER_ID = "cus_portal_TEST";

function makeReq(origin = "http://test.example.com"): Request {
  return new Request(`${origin}/api/billing/portal`, {
    method: "GET",
    headers: { origin },
  });
}

beforeEach(() => {
  resetMockStripe();
  __mockServer.reset();
  __mockService.reset();
  __mockServer.setUser({
    id: USER_ID,
    email: "user@example.com",
    user_metadata: { default_tenant_id: TENANT_ID },
  });
  process.env.STRIPE_SECRET_KEY = "sk_test_VERIFY";
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
});

describe("portal — auth + tenant gates", () => {
  it("unauthenticated → 401", async () => {
    __mockServer.setUser(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_authenticated");
  });

  it("no default_tenant_id → 403", async () => {
    __mockServer.setUser({ id: USER_ID, email: "u@x.com", user_metadata: {} });
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("tenant_not_provisioned");
  });
});

describe("portal — subscription lookup", () => {
  it("no subscription on file → 404 no_subscription", async () => {
    // .from('subscriptions').select(...).eq().in().order().limit().maybeSingle()
    __mockServer.pushRead("subscriptions", null);
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("no_subscription");
  });

  it("subscription without stripe_customer_id → 404 no_stripe_customer", async () => {
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: null,
      status: "active",
      user_id: USER_ID,
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("no_stripe_customer");
  });
});

describe("portal — Stripe config + upstream failure", () => {
  it("missing STRIPE_SECRET_KEY → 500 stripe_not_configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "active",
      user_id: USER_ID,
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("stripe_not_configured");
  });

  it("Stripe billingPortal.sessions.create throws → 502 portal_create_failed", async () => {
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "active",
      user_id: USER_ID,
    });
    mockStripeState.throwOnPortalCreate = new Error("Stripe down");
    const res = await GET(makeReq());
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; detail?: string };
    expect(body.error).toBe("portal_create_failed");
    expect(body.detail).toContain("Stripe down");
  });
});

describe("portal — happy path + audit trail (FTC Click-to-Cancel)", () => {
  it("returns { portal_url } + records audit_logs internal_action='billing_portal_opened'", async () => {
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "active",
      user_id: USER_ID,
    });
    mockStripeState.stubPortalUrl = "https://billing.stripe.com/p/session/FRESH";

    const res = await GET(makeReq("http://app.studiozero.dev"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { portal_url: string };
    expect(body.portal_url).toBe("https://billing.stripe.com/p/session/FRESH");

    // Stripe was called with the right customer + return_url.
    expect(mockStripeState.portalCreateCalls).toHaveLength(1);
    const params = mockStripeState.portalCreateCalls[0];
    expect(params.customer).toBe(CUSTOMER_ID);
    expect(String(params.return_url)).toContain("/app/settings/billing");

    // Audit row written (FTC compliance trail).
    const audit = __mockService.inserts.filter((i) => i.table === "audit_logs");
    expect(audit).toHaveLength(1);
    const meta = audit[0].row.metadata as {
      internal_action: string;
      stripe_customer_id: string;
    };
    expect(meta.internal_action).toBe("billing_portal_opened");
    expect(meta.stripe_customer_id).toBe(CUSTOMER_ID);
  });

  it("Stripe ctor called with apiVersion '2024-09-30.acacia'", async () => {
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "active",
      user_id: USER_ID,
    });
    await GET(makeReq());
    expect(mockStripeState.ctorCalls[0].opts.apiVersion).toBe("2024-09-30.acacia");
  });

  it("works for canceled subscription (cancel-in-same-channel — FTC)", async () => {
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "canceled",
      user_id: USER_ID,
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { portal_url: string };
    expect(body.portal_url).toBeTruthy();
  });
});

describe("portal — disclosure header invariant", () => {
  it("every Response carries X-AI-Generated:studio-zero", async () => {
    // 401 path
    __mockServer.setUser(null);
    const a = await GET(makeReq());
    expect(a.headers.get("x-ai-generated")).toBe("studio-zero");

    // Happy path
    __mockServer.setUser({
      id: USER_ID,
      email: "u@x.com",
      user_metadata: { default_tenant_id: TENANT_ID },
    });
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "active",
      user_id: USER_ID,
    });
    const b = await GET(makeReq());
    expect(b.headers.get("x-ai-generated")).toBe("studio-zero");
  });
});
