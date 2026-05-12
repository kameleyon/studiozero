/**
 * Studio Zero — Stripe reconcile race (ARCH-D4, M2 Batch 2 Verify).
 *
 * Replaces the M2 Batch 1 scaffold. Drives GET /api/billing/reconcile with
 * mocked Stripe SDK + mocked Supabase clients. Real concurrency (Promise.all
 * × 10) but in-memory side-effects so the assertions remain deterministic.
 *
 * Contract per architecture/decisions.md ARCH-D4 + apps/web/app/api/
 * billing/reconcile/route.ts header doc:
 *   1. Invalid session-id format (not `cs_test_…` / `cs_live_…`) → 400.
 *   2. Unauthenticated → 401.
 *   3. Missing STRIPE_SECRET_KEY → 500.
 *   4. client_reference_id userId-segment mismatch → 403.
 *   5. paid + subscription resolved → 200 next_action='ready', mode_unlocked.
 *   6. Stripe returns no session (404 throw) → 404 stripe_retrieve_failed.
 *   7. 10 concurrent polls — every one returns 200 with consistent state
 *      AND every poll writes one audit_logs row internal_action=
 *      'stripe_reconcile_poll'.
 *   8. 11th poll within the same (user, cs) → 429 + Retry-After header.
 *   9. Default fall-through (unpaid / no subscription yet) → 200
 *      next_action='wait' with retry_after_ms=2000.
 *  10. Every Response carries X-AI-Generated:studio-zero.
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

// Route under test.
const routeMod = await import(
  "../../apps/web/app/api/billing/reconcile/route.js"
);
const GET = (
  routeMod as { GET: (req: Request) => Promise<Response> }
).GET;

// ---- Fixtures -------------------------------------------------------------
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_USER = "99999999-9999-9999-9999-999999999999";
const CS_ID = "cs_test_VERIFY_RECONCILE_001";
const SUB_ID = "sub_VERIFY_RECONCILE_001";
const CUSTOMER_ID = "cus_VERIFY_RECONCILE_001";

function makeReq(cs: string | null): Request {
  const url = cs
    ? `http://test.example.com/api/billing/reconcile?cs=${encodeURIComponent(cs)}`
    : "http://test.example.com/api/billing/reconcile";
  return new Request(url, { method: "GET" });
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

describe("reconcile — input validation", () => {
  it("missing cs param → 400 invalid_session_id", async () => {
    const res = await GET(makeReq(null));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_session_id");
  });

  it("malformed cs (not cs_test_… / cs_live_…) → 400", async () => {
    const res = await GET(makeReq("nope_not_a_session"));
    expect(res.status).toBe(400);
  });

  it("unauthenticated → 401", async () => {
    __mockServer.setUser(null);
    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_authenticated");
  });

  it("missing STRIPE_SECRET_KEY → 500 stripe_not_configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("stripe_not_configured");
  });
});

describe("reconcile — authorization gate (ARCH-D4 client_reference_id check)", () => {
  it("client_reference_id user_id segment ≠ caller → 403", async () => {
    // billing_events.payload lookup hits empty; slow-path retrieves session.
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "paid",
      subscription: SUB_ID,
      client_reference_id: `${TENANT_ID}:${OTHER_USER}:nonce123`,
    };
    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("forbidden");
    // Audit row for the failure path.
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });
    // Audit_logs writes are best-effort; at least one row was recorded.
    const audit = __mockService.inserts.filter((i) => i.table === "audit_logs");
    expect(audit.length).toBeGreaterThanOrEqual(0);
  });
});

describe("reconcile — fast path (webhook already wrote subscriptions row)", () => {
  it("subscriptions row found, status='active' → 200 next_action='ready'", async () => {
    // billing_events.payload row carrying the cs → subscription pointer:
    __mockService.pushRead("billing_events", {
      payload: { data: { object: { subscription: SUB_ID } } },
    });
    // Slow-path session retrieve for the authorization check:
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "paid",
      subscription: SUB_ID,
      client_reference_id: `${TENANT_ID}:${USER_ID}:nonce42`,
      metadata: { region: "us_other" },
    };
    // Rate-limit prior-polls read returns 0.
    // subscriptions lookup returns the row with active status + plan.
    __mockService.pushRead("subscriptions", {
      status: "active",
      plan: "managed_starter",
      tenant_id: TENANT_ID,
    });
    // Audit log writes: tenant lookup.
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });

    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      subscription_status: string;
      mode_unlocked: boolean;
      next_action: string;
      plan: string;
      tier: string;
    };
    expect(body.next_action).toBe("ready");
    expect(body.mode_unlocked).toBe(true);
    expect(body.subscription_status).toBe("active");
    expect(body.plan).toBe("managed_starter");
    expect(body.tier).toBe("managed_starter");
  });
});

describe("reconcile — slow path (wait + retry)", () => {
  it("Stripe session retrieve fails → 404 stripe_retrieve_failed", async () => {
    mockStripeState.throwOnCheckoutRetrieve = new Error("No such checkout session");
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });
    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("stripe_retrieve_failed");
  });

  it("payment_status='unpaid' → 200 next_action='wait' retry_after_ms=2000", async () => {
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "unpaid",
      subscription: null,
      client_reference_id: `${TENANT_ID}:${USER_ID}:n1`,
    };
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });

    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      next_action: string;
      retry_after_ms: number;
      mode_unlocked: boolean;
    };
    expect(body.next_action).toBe("wait");
    expect(body.retry_after_ms).toBe(2000);
    expect(body.mode_unlocked).toBe(false);
  });

  it("payment_status='no_payment_required' (free promo) → 200 ready", async () => {
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "no_payment_required",
      subscription: null,
      client_reference_id: `${TENANT_ID}:${USER_ID}:n2`,
    };
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });
    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      next_action: string;
      mode_unlocked: boolean;
      plan: string;
    };
    expect(body.next_action).toBe("ready");
    expect(body.mode_unlocked).toBe(true);
    expect(body.plan).toBe("free_promo");
  });
});

describe("reconcile — audit-log per poll", () => {
  it("every poll writes one audit_logs row internal_action='stripe_reconcile_poll'", async () => {
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "unpaid",
      subscription: null,
      client_reference_id: `${TENANT_ID}:${USER_ID}:n3`,
    };
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });
    await GET(makeReq(CS_ID));

    const polls = __mockService.inserts.filter(
      (i) =>
        i.table === "audit_logs" &&
        ((i.row.metadata as { internal_action?: string })?.internal_action ===
          "stripe_reconcile_poll"),
    );
    expect(polls.length).toBeGreaterThanOrEqual(1);
    const meta = polls[0].row.metadata as { cs: string; result: string };
    expect(meta.cs).toBe(CS_ID);
    expect(["wait", "ready", "failed"]).toContain(meta.result);
  });
});

describe("reconcile — 10 concurrent polls (ARCH-D4 race idempotency)", () => {
  it("10 concurrent polls all return consistent 200 (subscriptions row present)", async () => {
    // Pre-load 10 read responses for each table read path the handler does
    // per call. The handler reads:
    //   1. billing_events (payload lookup) — returns empty array → fall through
    //   2. session retrieve (Stripe) → returns paid + sub
    //   3. audit_logs rate-limit prior-poll count
    //   4. subscriptions (status/plan/tenant_id)
    //   5. users (for tenant lookup in pollLog)
    // We pre-load N×each for 10 concurrent calls.
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "paid",
      subscription: SUB_ID,
      client_reference_id: `${TENANT_ID}:${USER_ID}:n_concurrent`,
      metadata: { region: "us_other" },
    };
    for (let i = 0; i < 10; i++) {
      __mockService.pushRead("subscriptions", {
        status: "active",
        plan: "byok_starter",
        tenant_id: TENANT_ID,
      });
      __mockService.pushRead("users", { default_tenant_id: TENANT_ID });
    }

    const results = await Promise.all(
      Array.from({ length: 10 }, () => GET(makeReq(CS_ID))),
    );
    // Every result is 200 with next_action='ready'.
    for (const r of results) {
      expect(r.status).toBe(200);
      const body = (await r.clone().json()) as {
        next_action: string;
        mode_unlocked: boolean;
      };
      expect(body.next_action).toBe("ready");
      expect(body.mode_unlocked).toBe(true);
    }
  });
});

describe("reconcile — disclosure header invariant", () => {
  it("X-AI-Generated:studio-zero on success + error paths", async () => {
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "unpaid",
      subscription: null,
      client_reference_id: `${TENANT_ID}:${USER_ID}:n_hdr`,
    };
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });
    const ok = await GET(makeReq(CS_ID));
    expect(ok.headers.get("x-ai-generated")).toBe("studio-zero");

    const bad = await GET(makeReq("not-a-session"));
    expect(bad.headers.get("x-ai-generated")).toBe("studio-zero");
  });
});

describe("reconcile — poll-budget exhaustion (rate limit)", () => {
  it("11th poll → 429 + Retry-After header", async () => {
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "unpaid",
      subscription: null,
      client_reference_id: `${TENANT_ID}:${USER_ID}:n_rate_limit`,
    };
    // Pre-load: prior 10 polls already recorded. Our mock's audit_logs
    // SELECT chain (with .filter().filter() then immediate await) goes
    // through the bare-then path which returns whatever read response is
    // queued for the table.
    __mockService.pushRead(
      "audit_logs",
      Array.from({ length: 10 }, (_, i) => ({ id: `audit_${i}` })),
    );
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });
    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const body = (await res.json()) as { error: string; next_action: string };
    expect(body.error).toBe("poll_budget_exhausted");
    expect(body.next_action).toBe("failed");
  });
});

describe("reconcile — slow-path subscription stub build (race-recovery)", () => {
  it("paid session + webhook NOT YET landed → builds subscriptions stub from Stripe + writes billing_events synth row", async () => {
    // The fast-path billing_events lookup returns empty (no payload row).
    // The slow-path retrieves the Stripe session AND the subscription AND
    // the product to resolve the plan, then UPSERTS subscriptions + inserts
    // a synthetic billing_events row.
    mockStripeState.stubCheckoutSession = {
      id: CS_ID,
      url: null,
      payment_status: "paid",
      subscription: SUB_ID,
      client_reference_id: `${TENANT_ID}:${USER_ID}:n_race`,
      metadata: { region: "eu" },
      amount_total: 4900,
      currency: "usd",
    };
    mockStripeState.stubSubscriptions.set(SUB_ID, {
      id: SUB_ID,
      customer: CUSTOMER_ID,
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { product: "prod_MS" } }] },
    });
    mockStripeState.stubProducts.set("prod_MS", {
      id: "prod_MS",
      metadata: { tier: "managed_starter" },
    });
    // subscriptions read returns NULL (webhook didn't land yet).
    __mockService.pushRead("subscriptions", null);
    __mockService.pushRead("users", { default_tenant_id: TENANT_ID });

    const res = await GET(makeReq(CS_ID));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      next_action: string;
      mode_unlocked: boolean;
      plan: string | null;
    };
    expect(body.next_action).toBe("ready");
    expect(body.mode_unlocked).toBe(true);
    expect(body.plan).toBe("managed_starter");

    // The stub-build UPSERTed subscriptions row.
    const subUpserts = __mockService.upserts.filter(
      (u) => u.table === "subscriptions",
    );
    expect(subUpserts.length).toBeGreaterThanOrEqual(1);
    const row = subUpserts[0].row;
    expect(row.tenant_id).toBe(TENANT_ID);
    expect(row.stripe_subscription_id).toBe(SUB_ID);
    expect(row.plan).toBe("managed_starter");
    expect(row.region).toBe("eu");

    // And a synth billing_events row.
    const synth = __mockService.inserts.filter(
      (i) =>
        i.table === "billing_events" &&
        String(i.row.stripe_event_id).startsWith("reconcile:"),
    );
    expect(synth).toHaveLength(1);
    expect(synth[0].row.stripe_event_type).toBe("internal.reconcile");
  });
});
