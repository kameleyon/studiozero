/**
 * Studio Zero — Click-to-Cancel flow (G1/G3/G4 M2 Batch 3 Verify).
 *
 * Asserts FTC 16 CFR 425 compliance gaps closed in Phase 9 M2 Batch 3:
 *   G1: in-app "Manage billing" button calls /api/billing/portal and the
 *       portal mint endpoint returns the Stripe Customer Portal URL.
 *   G3: customer.subscription.deleted webhook writes a
 *       `cancellation_email_trigger` audit_log row tagged with the right
 *       region template + the 60-second SLA target.
 *   G4: California subscription deletion with customer_request triggers a
 *       pro-rata refund via stripe.refunds.create with a stable
 *       idempotency key, and audit-logs `refund_issued`.
 *
 * Contract refs:
 *   - apps/web/app/api/billing/portal/route.ts
 *   - apps/web/app/api/webhooks/stripe/route.ts (handleSubscriptionDeleted)
 *   - compliance/click-to-cancel-ux-audit.md (G1/G3/G4 closed-status)
 *   - finance/refund-matrix.md §4.5 (CA pro-rata formula) + §4.4 (60s SLA)
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

const portalRouteMod = await import(
  "../../apps/web/app/api/billing/portal/route.js"
);
const portalGET = (
  portalRouteMod as { GET: (req: Request) => Promise<Response> }
).GET;

const webhookRouteMod = await import(
  "../../apps/web/app/api/webhooks/stripe/route.js"
);
const webhookPOST = (
  webhookRouteMod as { POST: (req: Request) => Promise<Response> }
).POST;

// ---- Fixtures -------------------------------------------------------------
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const CUSTOMER_ID = "cus_G1_TEST";
const SUBSCRIPTION_ID = "sub_G4_TEST";
const INVOICE_ID = "in_G4_TEST";
const PAYMENT_INTENT_ID = "pi_G4_TEST";

function makePortalReq(origin = "http://test.example.com"): Request {
  return new Request(`${origin}/api/billing/portal`, {
    method: "GET",
    headers: { origin },
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
  // refunds + invoices state lives on mockStripeState (helper M2 Batch 3
  // surface); resetMockStripe() already clears it.
  process.env.STRIPE_SECRET_KEY = "sk_test_VERIFY";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_VERIFY";
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

// ===========================================================================
// G1 — In-app "Manage billing" → Stripe Portal mint (FTC same-medium)
// ===========================================================================
describe("G1 — Manage billing surface routes to Stripe Customer Portal", () => {
  it("authenticated user with active sub gets portal_url + audit row", async () => {
    __mockServer.setUser({
      id: USER_ID,
      email: "user@example.com",
      user_metadata: { default_tenant_id: TENANT_ID },
    });
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "active",
      user_id: USER_ID,
    });
    mockStripeState.stubPortalUrl =
      "https://billing.stripe.com/p/session/G1_TEST";

    const res = await portalGET(makePortalReq("http://app.studiozero.dev"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { portal_url: string };
    expect(body.portal_url).toContain("billing.stripe.com");

    // Audit row → FTC compliance trail (same-medium evidence).
    const audit = __mockService.inserts.filter(
      (i) => i.table === "audit_logs",
    );
    expect(audit).toHaveLength(1);
    const meta = audit[0].row.metadata as Record<string, unknown>;
    expect(meta.internal_action).toBe("billing_portal_opened");

    // Return URL lands back on the in-app Settings → Billing surface (3-click
    // contract — refund-matrix.md §4.2).
    const params = mockStripeState.portalCreateCalls[0];
    expect(String(params.return_url)).toContain("/app/settings/billing");
  });

  it("works for cancelled subscription — still routes to portal (same-medium)", async () => {
    __mockServer.setUser({
      id: USER_ID,
      email: "u@x.com",
      user_metadata: { default_tenant_id: TENANT_ID },
    });
    __mockServer.pushRead("subscriptions", {
      stripe_customer_id: CUSTOMER_ID,
      status: "canceled",
      user_id: USER_ID,
    });
    const res = await portalGET(makePortalReq());
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// G3 — Cancellation email trigger within 60-second SLA contract
// ===========================================================================
describe("G3 — cancellation triggers Herald email with region routing", () => {
  it("US cancel writes cancellation_email_trigger audit row + 60s SLA", async () => {
    // 1st read: resolveTenantId
    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    // 2nd read: handleSubscriptionDeleted local sub row lookup
    __mockService.pushRead("subscriptions", {
      id: "sub_row_us",
      region: "us_other",
      current_period_start: new Date(Date.now() - 10 * 86400_000).toISOString(),
      current_period_end: new Date(Date.now() + 20 * 86400_000).toISOString(),
      stripe_customer_id: CUSTOMER_ID,
      plan: "managed_starter",
    });

    const event = {
      id: "evt_us_cancel",
      type: "customer.subscription.deleted",
      api_version: "2024-09-30.acacia",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: SUBSCRIPTION_ID,
          customer: CUSTOMER_ID,
          status: "canceled",
          current_period_start: Math.floor(Date.now() / 1000) - 10 * 86400,
          current_period_end: Math.floor(Date.now() / 1000) + 20 * 86400,
          cancel_at_period_end: true,
          cancellation_details: { reason: "cancellation_requested" },
          items: { data: [] },
        },
      },
    };
    const res = await webhookPOST(makeWebhookReq(event));
    expect(res.status).toBe(200);

    const audits = __mockService.inserts.filter(
      (i) =>
        i.table === "audit_logs" &&
        (i.row.metadata as Record<string, unknown>).internal_action ===
          "cancellation_email_trigger",
    );
    expect(audits.length).toBeGreaterThanOrEqual(1);
    const meta = audits[0].row.metadata as Record<string, unknown>;
    expect(meta.template).toBe("E-cancel-us-default");
    expect(meta.sla_target_seconds).toBe(60);
  });

  it("EU cancel routes to E-cancel-eu-uk-cooling-off template", async () => {
    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    __mockService.pushRead("subscriptions", {
      id: "sub_row_eu",
      region: "eu",
      current_period_start: new Date(Date.now() - 5 * 86400_000).toISOString(),
      current_period_end: new Date(Date.now() + 25 * 86400_000).toISOString(),
      stripe_customer_id: CUSTOMER_ID,
      plan: "managed_starter",
    });
    const event = {
      id: "evt_eu_cancel",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_EU_TEST",
          customer: CUSTOMER_ID,
          status: "canceled",
          current_period_start: Math.floor(Date.now() / 1000) - 5 * 86400,
          current_period_end: Math.floor(Date.now() / 1000) + 25 * 86400,
          cancel_at_period_end: true,
          cancellation_details: { reason: "cancellation_requested" },
          items: { data: [] },
        },
      },
    };
    await webhookPOST(makeWebhookReq(event));
    const triggers = __mockService.inserts.filter(
      (i) =>
        i.table === "audit_logs" &&
        (i.row.metadata as Record<string, unknown>).internal_action ===
          "cancellation_email_trigger",
    );
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(
      (triggers[0].row.metadata as Record<string, unknown>).template,
    ).toBe("E-cancel-eu-uk-cooling-off");
  });
});

// ===========================================================================
// G4 — California pro-rata refund branch
// ===========================================================================
describe("G4 — California customer_request cancel issues pro-rata refund", () => {
  it("computes floor((days_remaining/days_in_period) * amount_paid)", async () => {
    // 30-day period, cancel at day 10 → ~20 days remaining → ~2/3 refund.
    // Add a small buffer to the end so the millisecond clock-drift between
    // test setup and handler execution doesn't drop us into the day-19
    // bucket (the handler uses Math.floor, which is fragile at boundaries).
    const now = Date.now();
    const periodStart = now - 10 * 86400_000;
    const periodEnd = now + 20 * 86400_000 + 60_000; // +1 minute buffer
    mockStripeState.stubInvoices.set(INVOICE_ID, {
      id: INVOICE_ID,
      payment_intent: PAYMENT_INTENT_ID,
      amount_paid: 9900, // $99 managed_starter
    });

    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    __mockService.pushRead("subscriptions", {
      id: "sub_row_ca",
      region: "california",
      current_period_start: new Date(periodStart).toISOString(),
      current_period_end: new Date(periodEnd).toISOString(),
      stripe_customer_id: CUSTOMER_ID,
      plan: "managed_starter",
    });

    const event = {
      id: "evt_ca_cancel",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: SUBSCRIPTION_ID,
          customer: CUSTOMER_ID,
          status: "canceled",
          current_period_start: Math.floor(periodStart / 1000),
          current_period_end: Math.floor(periodEnd / 1000),
          cancel_at_period_end: true,
          cancellation_details: { reason: "cancellation_requested" },
          latest_invoice: INVOICE_ID,
          items: { data: [] },
        },
      },
    };
    const res = await webhookPOST(makeWebhookReq(event));
    expect(res.status).toBe(200);

    // Refund issued
    expect(mockStripeState.refundCreateCalls).toHaveLength(1);
    const call = mockStripeState.refundCreateCalls[0];
    expect(call.params.payment_intent).toBe(PAYMENT_INTENT_ID);
    // floor((20/30) * 9900) = floor(6600) = 6600. The handler uses
    // Math.floor on day-count subtraction; the +1m buffer above guarantees
    // we don't fall into the day-19 bucket due to ms-level clock drift.
    expect(call.params.amount).toBe(6600);
    expect(call.opts?.idempotencyKey).toContain("refund:ca-pro-rata:");
    expect(call.opts?.idempotencyKey).toContain(SUBSCRIPTION_ID);

    // Audit log → refund_issued
    const audits = __mockService.inserts.filter(
      (i) =>
        i.table === "audit_logs" &&
        (i.row.metadata as Record<string, unknown>).internal_action ===
          "refund_issued",
    );
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(
      (audits[0].row.metadata as Record<string, unknown>).refund_kind,
    ).toBe("ca_pro_rata");
  });

  it("non-California cancel does NOT issue refund", async () => {
    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    __mockService.pushRead("subscriptions", {
      id: "sub_row_us",
      region: "us_other",
      current_period_start: new Date(Date.now() - 10 * 86400_000).toISOString(),
      current_period_end: new Date(Date.now() + 20 * 86400_000).toISOString(),
      stripe_customer_id: CUSTOMER_ID,
      plan: "managed_starter",
    });
    const event = {
      id: "evt_us_no_refund",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_US_NOREFUND",
          customer: CUSTOMER_ID,
          status: "canceled",
          current_period_start: Math.floor(Date.now() / 1000) - 10 * 86400,
          current_period_end: Math.floor(Date.now() / 1000) + 20 * 86400,
          cancel_at_period_end: true,
          cancellation_details: { reason: "cancellation_requested" },
          latest_invoice: "in_NOREFUND",
          items: { data: [] },
        },
      },
    };
    await webhookPOST(makeWebhookReq(event));
    expect(mockStripeState.refundCreateCalls).toHaveLength(0);
  });

  it("California involuntary cancel (dunning, not customer_request) → no refund", async () => {
    __mockService.pushRead("subscriptions", { tenant_id: TENANT_ID });
    __mockService.pushRead("subscriptions", {
      id: "sub_row_ca_dun",
      region: "california",
      current_period_start: new Date(Date.now() - 10 * 86400_000).toISOString(),
      current_period_end: new Date(Date.now() + 20 * 86400_000).toISOString(),
      stripe_customer_id: CUSTOMER_ID,
      plan: "managed_starter",
    });
    const event = {
      id: "evt_ca_dun",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_CA_DUN",
          customer: CUSTOMER_ID,
          status: "canceled",
          current_period_start: Math.floor(Date.now() / 1000) - 10 * 86400,
          current_period_end: Math.floor(Date.now() / 1000) + 20 * 86400,
          cancel_at_period_end: false,
          cancellation_details: { reason: "payment_failed" },
          latest_invoice: "in_DUN",
          items: { data: [] },
        },
      },
    };
    await webhookPOST(makeWebhookReq(event));
    expect(mockStripeState.refundCreateCalls).toHaveLength(0);
  });
});
