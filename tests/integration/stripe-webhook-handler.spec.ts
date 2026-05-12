/**
 * Studio Zero — Stripe webhook handler (M2 Batch 2 Verify).
 *
 * Replaces the M2 Batch 1 scaffold (commit 26b5781 + later) — Forge shipped
 * the 9-event webhook in a7396fc; this spec drives the handler with mocked
 * `stripe.webhooks.constructEventAsync` over synthetic Stripe events and a
 * lightweight in-memory Supabase service-role client (tests/integration/
 * _helpers/mock-supabase.ts) so every assertion is a real Response + a
 * recorded DB write — no live Supabase / Stripe required.
 *
 * Constraint: the route at apps/web/app/api/webhooks/stripe/route.ts imports
 * `server-only` (transitively, via lib/supabase-service.ts). Vitest needs
 * `server-only` mocked to a no-op before the route module loads.
 *
 * Contract verified per finance/stripe-config.md §3 + apps/web/app/api/
 * webhooks/stripe/route.ts header doc:
 *   1. Missing stripe-signature header → 400 + no DB write.
 *   2. Bad signature → 400 + no DB write.
 *   3. checkout.session.completed → billing_events row INSERTed,
 *      track('paid_conversion'), subscription stub UPSERTed if mode=subscription.
 *   4. customer.subscription.created (EU tenant) → subscriptions UPSERT +
 *      cooling_off_windows INSERT with trigger_event='subscribe'.
 *   5. customer.subscription.updated upgrade rank-up (EU) → second
 *      cooling_off_windows INSERT with trigger_event='upgrade'.
 *   6. customer.subscription.updated downgrade → NO new cooling-off row.
 *   7. customer.subscription.deleted → subscriptions UPDATE status=canceled.
 *   8. invoice.payment_succeeded → subscriptions UPDATE past_due→active.
 *   9. invoice.payment_failed → subscriptions UPDATE status=past_due +
 *      audit_logs INSERT with internal_action='dunning_step'.
 *  10. customer.subscription.trial_will_end → audit_logs INSERT with
 *      internal_action='trial_will_end'.
 *  11. payment_intent.succeeded → fix_pr_jobs UPDATE state queued→building.
 *  12. charge.dispute.created → disputes INSERT (best-effort).
 *  13. Duplicate event_id (23505 from billing_events INSERT) →
 *      200 + duplicate:true.
 *
 * Coverage delta target: ≥75% statement on the route.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockStripeState,
  resetMockStripe,
  makeStripeMockModule,
  type MockStripeSession,
} from "./_helpers/mock-stripe.js";
import {
  makeMockSupabase,
  type MockSupabase,
} from "./_helpers/mock-supabase.js";

// ---- Mocks (hoisted) ------------------------------------------------------
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => makeStripeMockModule());

// supabase-service: the webhook route imports createServiceRoleClient.
let __mockSupa: MockSupabase = makeMockSupabase();
vi.mock("../../apps/web/lib/supabase-service", () => ({
  createServiceRoleClient: () => __mockSupa.client,
}));
// analytics-events.v1.ts: the webhook calls track('paid_conversion').
const __trackCalls: Array<{ name: string; props: unknown }> = [];
vi.mock("../../apps/web/lib/analytics-events.v1", () => ({
  track: (name: string, props: unknown) => {
    __trackCalls.push({ name, props });
    return Promise.resolve();
  },
}));

// ---- Now import the route under test (after vi.mock hoisting). ------------
const routeMod = await import("../../apps/web/app/api/webhooks/stripe/route.js");
const POST = (
  routeMod as { POST: (req: Request) => Promise<Response> }
).POST;

// ---- Fixtures -------------------------------------------------------------
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const STRIPE_CUSTOMER = "cus_TESTCUSTOMER";
const STRIPE_SUB = "sub_TESTSUB";

function fakeEvent(type: string, obj: Record<string, unknown>, id?: string): Record<string, unknown> {
  return {
    id: id ?? `evt_${type.replace(/\./g, "_")}_${Math.random().toString(36).slice(2, 10)}`,
    type,
    api_version: "2024-09-30.acacia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: obj },
  };
}

function makeWebhookRequest(event: Record<string, unknown>, sig = "valid_sig"): Request {
  const body = JSON.stringify(event);
  return new Request("http://test.example.com/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": sig, "Content-Type": "application/json" },
    body,
  });
}

function setEnv(): void {
  process.env.STRIPE_SECRET_KEY = "sk_test_VERIFY";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_VERIFY";
}

function clearEnv(): void {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
}

beforeEach(() => {
  setEnv();
  resetMockStripe();
  __mockSupa.reset();
  __trackCalls.length = 0;
  // The webhook route resolves tenant by looking up subscriptions table.
  // Pre-load a customer lookup so resolveTenantId hits path #2.
  __mockSupa.pushRead("subscriptions", { tenant_id: TENANT_ID });
  // Register billing_events.stripe_event_id UNIQUE so dup detection works.
  __mockSupa.registerUnique("billing_events", "stripe_event_id");
});

afterEach(() => {
  clearEnv();
});

describe("Stripe webhook — signature gate", () => {
  it("missing stripe-signature header → 400, no DB write", async () => {
    const req = new Request("http://test.example.com/api/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("missing_signature");
    // Disclosure header still present even on the reject path.
    expect(res.headers.get("x-ai-generated")).toBe("studio-zero");
    // ZERO writes.
    expect(__mockSupa.inserts).toHaveLength(0);
    expect(__mockSupa.updates).toHaveLength(0);
  });

  it("bad signature → 400 invalid_signature, no DB write", async () => {
    const event = fakeEvent("customer.subscription.created", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
      status: "active",
      items: { data: [] },
    });
    const res = await POST(makeWebhookRequest(event, "bad_sig"));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_signature");
    expect(__mockSupa.inserts).toHaveLength(0);
  });

  it("misconfigured env (no STRIPE_SECRET_KEY) → 500 stripe_not_configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(makeWebhookRequest(fakeEvent("noop", {})));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("stripe_not_configured");
  });
});

describe("Stripe webhook — idempotency spine", () => {
  it("first delivery: 200 received:true, billing_events row INSERTed", async () => {
    const event = fakeEvent(
      "customer.subscription.trial_will_end",
      { id: STRIPE_SUB, customer: STRIPE_CUSTOMER },
      "evt_FIRST_001",
    );
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { received: boolean; duplicate?: boolean };
    expect(body.received).toBe(true);
    expect(body.duplicate).toBeUndefined();
    const billing = __mockSupa.inserts.filter((i) => i.table === "billing_events");
    expect(billing).toHaveLength(1);
    expect(billing[0].row.stripe_event_id).toBe("evt_FIRST_001");
    expect(billing[0].row.tenant_id).toBe(TENANT_ID);
  });

  it("duplicate event_id (23505) → 200 duplicate:true, second handler not invoked", async () => {
    // First delivery — fresh tenant lookup row consumed.
    __mockSupa.pushRead("subscriptions", { tenant_id: TENANT_ID });
    const event = fakeEvent(
      "customer.subscription.trial_will_end",
      { id: STRIPE_SUB, customer: STRIPE_CUSTOMER },
      "evt_DUP_001",
    );
    let res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);

    // Second delivery — same event_id. UNIQUE-23505 path.
    __mockSupa.pushRead("subscriptions", { tenant_id: TENANT_ID });
    res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { received: boolean; duplicate?: boolean };
    expect(body.received).toBe(true);
    expect(body.duplicate).toBe(true);

    // Only ONE billing_events row total (the second hit 23505).
    const billing = __mockSupa.inserts.filter((i) => i.table === "billing_events");
    expect(billing).toHaveLength(1);
  });
});

describe("Stripe webhook — customer.subscription.created (D22 EU cooling-off)", () => {
  it("EU subscription → subscriptions UPSERT + cooling_off_windows INSERT trigger='subscribe'", async () => {
    // Pre-load: resolveTenantId customer lookup, prior plan read (NULL),
    // products.retrieve, subscriptions row read for cooling-off (EU + waiver=false).
    mockStripeState.stubProducts.set("prod_MS", {
      id: "prod_MS",
      metadata: { tier: "managed_starter", plan_family: "managed" },
    });
    // resolveTenantId calls .from('subscriptions').select... .maybeSingle()
    // first read = tenant lookup (already pushed in beforeEach);
    // then handleSubscriptionCreated → upsertSubscription writes;
    // then maybeOpenCoolingOff reads subscriptions for (region, waiver, id).
    __mockSupa.pushRead("subscriptions", {
      id: "sub_row_uuid_1",
      region: "eu",
      cooling_off_waiver_signed: false,
    });

    const event = fakeEvent("customer.subscription.created", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
      status: "trialing",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      cancel_at_period_end: false,
      canceled_at: null,
      items: { data: [{ price: { product: "prod_MS" } }] },
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);

    // subscriptions UPSERT happened.
    const subUpserts = __mockSupa.upserts.filter((u) => u.table === "subscriptions");
    expect(subUpserts).toHaveLength(1);
    expect(subUpserts[0].row.plan).toBe("managed_starter");
    expect(subUpserts[0].row.stripe_subscription_id).toBe(STRIPE_SUB);
    expect(subUpserts[0].row.status).toBe("trialing");

    // cooling_off_windows INSERT happened (D22).
    const cw = __mockSupa.inserts.filter((i) => i.table === "cooling_off_windows");
    expect(cw).toHaveLength(1);
    expect(cw[0].row.trigger_event).toBe("subscribe");
    expect(cw[0].row.region).toBe("eu");
    expect(cw[0].row.waiver_signed).toBe(false);
    // expires_at ~ now + 14 days.
    const opened = new Date(cw[0].row.opened_at as string).getTime();
    const expires = new Date(cw[0].row.expires_at as string).getTime();
    const diff = expires - opened;
    // 14d = 1,209,600,000 ms. Allow ±1s for clock skew during the test.
    expect(Math.abs(diff - 14 * 24 * 60 * 60 * 1000)).toBeLessThanOrEqual(1000);
  });

  it("non-EU subscription → subscriptions UPSERT only, NO cooling_off_windows row", async () => {
    mockStripeState.stubProducts.set("prod_BS", {
      id: "prod_BS",
      metadata: { tier: "byok_starter", plan_family: "byok" },
    });
    __mockSupa.pushRead("subscriptions", {
      id: "sub_row_uuid_2",
      region: "us_other",
      cooling_off_waiver_signed: false,
    });
    const event = fakeEvent("customer.subscription.created", {
      id: "sub_US_001",
      customer: STRIPE_CUSTOMER,
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { product: "prod_BS" } }] },
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const cw = __mockSupa.inserts.filter((i) => i.table === "cooling_off_windows");
    expect(cw).toHaveLength(0);
  });
});

describe("Stripe webhook — customer.subscription.updated (D22 upgrade reset)", () => {
  it("rank-up plan change (EU) → NEW cooling_off_windows row trigger='upgrade'", async () => {
    mockStripeState.stubProducts.set("prod_MP", {
      id: "prod_MP",
      metadata: { tier: "managed_pro", plan_family: "managed" },
    });
    // handleSubscriptionUpdated reads prior plan first:
    __mockSupa.pushRead("subscriptions", { plan: "managed_starter" });
    // Then maybeOpenCoolingOff reads region+waiver:
    __mockSupa.pushRead("subscriptions", {
      id: "sub_row_uuid_3",
      region: "eu",
      cooling_off_waiver_signed: false,
    });

    const event = fakeEvent("customer.subscription.updated", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { product: "prod_MP" } }] },
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);

    const cw = __mockSupa.inserts.filter((i) => i.table === "cooling_off_windows");
    expect(cw).toHaveLength(1);
    expect(cw[0].row.trigger_event).toBe("upgrade");
  });

  it("downgrade (managed_pro → managed_starter) → NO new cooling_off_windows row", async () => {
    mockStripeState.stubProducts.set("prod_MS", {
      id: "prod_MS",
      metadata: { tier: "managed_starter" },
    });
    __mockSupa.pushRead("subscriptions", { plan: "managed_pro" });
    const event = fakeEvent("customer.subscription.updated", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { product: "prod_MS" } }] },
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const cw = __mockSupa.inserts.filter((i) => i.table === "cooling_off_windows");
    expect(cw).toHaveLength(0);
  });

  it("lateral move (same plan) → NO new cooling_off_windows row", async () => {
    mockStripeState.stubProducts.set("prod_MS", {
      id: "prod_MS",
      metadata: { tier: "managed_starter" },
    });
    __mockSupa.pushRead("subscriptions", { plan: "managed_starter" });
    const event = fakeEvent("customer.subscription.updated", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { product: "prod_MS" } }] },
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const cw = __mockSupa.inserts.filter((i) => i.table === "cooling_off_windows");
    expect(cw).toHaveLength(0);
  });
});

describe("Stripe webhook — customer.subscription.deleted", () => {
  it("UPDATE subscriptions status='canceled' + canceled_at set", async () => {
    const event = fakeEvent("customer.subscription.deleted", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
      status: "canceled",
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const upd = __mockSupa.updates.filter((u) => u.table === "subscriptions");
    expect(upd).toHaveLength(1);
    expect(upd[0].patch.status).toBe("canceled");
    expect(typeof upd[0].patch.canceled_at).toBe("string");
    // The filter is on stripe_subscription_id.
    const f = upd[0].filters.find((p) => p.col === "stripe_subscription_id");
    expect(f?.val).toBe(STRIPE_SUB);
  });
});

describe("Stripe webhook — invoice.payment_succeeded / failed", () => {
  it("payment_succeeded → UPDATE subscriptions status=active where status=past_due", async () => {
    const event = fakeEvent("invoice.payment_succeeded", {
      id: "in_TEST",
      subscription: STRIPE_SUB,
      amount_paid: 1500,
      currency: "usd",
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const upd = __mockSupa.updates.filter((u) => u.table === "subscriptions");
    expect(upd).toHaveLength(1);
    expect(upd[0].patch.status).toBe("active");
    expect(upd[0].filters.some((f) => f.col === "status" && f.val === "past_due")).toBe(true);
  });

  it("payment_failed → UPDATE status=past_due + audit_logs dunning_step", async () => {
    const event = fakeEvent("invoice.payment_failed", {
      id: "in_TEST_FAIL",
      subscription: STRIPE_SUB,
      attempt_count: 2,
      amount_due: 1500,
      currency: "usd",
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const upd = __mockSupa.updates.filter((u) => u.table === "subscriptions");
    expect(upd).toHaveLength(1);
    expect(upd[0].patch.status).toBe("past_due");
    const audit = __mockSupa.inserts.filter((i) => i.table === "audit_logs");
    expect(audit).toHaveLength(1);
    const meta = audit[0].row.metadata as { internal_action: string; attempt: number };
    expect(meta.internal_action).toBe("dunning_step");
    expect(meta.attempt).toBe(2);
  });
});

describe("Stripe webhook — customer.subscription.trial_will_end", () => {
  it("emits audit_logs row with internal_action='trial_will_end' (Herald owns email)", async () => {
    const event = fakeEvent("customer.subscription.trial_will_end", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const audit = __mockSupa.inserts.filter((i) => i.table === "audit_logs");
    expect(audit).toHaveLength(1);
    const meta = audit[0].row.metadata as { internal_action: string };
    expect(meta.internal_action).toBe("trial_will_end");
  });
});

describe("Stripe webhook — checkout.session.completed", () => {
  it("subscription-mode session → UPSERT subscription stub + track('paid_conversion')", async () => {
    mockStripeState.stubProducts.set("prod_BS", {
      id: "prod_BS",
      metadata: { tier: "byok_starter", plan_family: "byok" },
    });
    mockStripeState.stubSubscriptions.set("sub_FROM_CS", {
      id: "sub_FROM_CS",
      customer: STRIPE_CUSTOMER,
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { product: "prod_BS" } }] },
    });

    const event = fakeEvent("checkout.session.completed", {
      id: "cs_test_COMPLETED_001",
      object: "checkout.session",
      mode: "subscription",
      subscription: "sub_FROM_CS",
      amount_total: 1500,
      currency: "usd",
      client_reference_id: `${TENANT_ID}:${USER_ID}:nonce123`,
      metadata: {
        tier: "byok_starter",
        plan_family: "byok",
        mode: "byok",
        cooling_off_waiver: "true",
      },
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);

    // track('paid_conversion') fired.
    expect(__trackCalls.length).toBe(1);
    expect(__trackCalls[0].name).toBe("paid_conversion");
    const props = __trackCalls[0].props as {
      tier: string;
      amount_cents: number;
      currency: string;
    };
    expect(props.tier).toBe("byok_starter");
    expect(props.amount_cents).toBe(1500);
    expect(props.currency).toBe("USD");

    // The subscription was upserted into our table.
    const subUpserts = __mockSupa.upserts.filter((u) => u.table === "subscriptions");
    expect(subUpserts).toHaveLength(1);
    expect(subUpserts[0].row.stripe_subscription_id).toBe("sub_FROM_CS");
  });
});

describe("Stripe webhook — payment_intent.succeeded (V1.5 fix_pr_jobs)", () => {
  it("PI with metadata.run_id → UPDATE fix_pr_jobs queued→building", async () => {
    const event = fakeEvent("payment_intent.succeeded", {
      id: "pi_TEST",
      amount: 5000,
      currency: "usd",
      metadata: { run_id: "run_abc123" },
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const upd = __mockSupa.updates.filter((u) => u.table === "fix_pr_jobs");
    expect(upd).toHaveLength(1);
    expect(upd[0].patch.state).toBe("building");
    expect(upd[0].filters.some((f) => f.col === "run_id" && f.val === "run_abc123")).toBe(true);
    expect(upd[0].filters.some((f) => f.col === "state" && f.val === "queued")).toBe(true);
  });

  it("PI without metadata.run_id → no fix_pr_jobs UPDATE (defensive no-op)", async () => {
    const event = fakeEvent("payment_intent.succeeded", {
      id: "pi_NORUNID",
      amount: 5000,
      currency: "usd",
      metadata: {},
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const upd = __mockSupa.updates.filter((u) => u.table === "fix_pr_jobs");
    expect(upd).toHaveLength(0);
  });
});

describe("Stripe webhook — charge.dispute.created", () => {
  it("emits disputes INSERT (best-effort) + Sentry-level warning via console.warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const event = fakeEvent("charge.dispute.created", {
      id: "dp_TEST",
      charge: "ch_TEST",
      reason: "fraudulent",
      status: "needs_response",
      amount: 1500,
      currency: "usd",
    });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    const disp = __mockSupa.inserts.filter((i) => i.table === "disputes");
    expect(disp).toHaveLength(1);
    expect(disp[0].row.stripe_dispute_id).toBe("dp_TEST");
    expect(disp[0].row.reason).toBe("fraudulent");
    // Sentry-warning emitted via console.warn — the Sentry SDK's BeforeSend
    // upgrades the level. We assert the WARN call by content.
    const calls = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("charge.dispute.created"))).toBe(true);
    warnSpy.mockRestore();
  });
});

describe("Stripe webhook — disclosure header invariant", () => {
  it("every Response carries X-AI-Generated:studio-zero (Art. 50)", async () => {
    // Success path.
    const event = fakeEvent("customer.subscription.trial_will_end", {
      id: STRIPE_SUB,
      customer: STRIPE_CUSTOMER,
    });
    const ok = await POST(makeWebhookRequest(event));
    expect(ok.headers.get("x-ai-generated")).toBe("studio-zero");

    // Reject path (bad sig).
    const rej = await POST(makeWebhookRequest(event, "bad_sig"));
    expect(rej.headers.get("x-ai-generated")).toBe("studio-zero");
  });
});
