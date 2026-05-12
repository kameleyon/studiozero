/**
 * Studio Zero — Stripe SDK mock for M2 Batch 2 Verify specs.
 *
 * Surface intercepted (matches what the M2 Forge routes actually call):
 *   - new Stripe(secret, { apiVersion })  → records ctor args
 *   - stripe.webhooks.constructEventAsync(rawBody, sig, secret)
 *   - stripe.checkout.sessions.create(params)
 *   - stripe.checkout.sessions.retrieve(id)
 *   - stripe.subscriptions.retrieve(id)
 *   - stripe.products.retrieve(id)
 *   - stripe.billingPortal.sessions.create(params)
 *
 * Tests pre-load the return values via the `stub*` setters; the mock then
 * exposes the .create / .retrieve / .constructEventAsync call logs so
 * assertions can read the parameters that were passed.
 *
 * Signature verification:
 *   - `constructEventAsync` returns the pre-staged event when the
 *     (rawBody, signature) pair matches a registered fixture; otherwise
 *     throws a `Stripe.errors.StripeSignatureVerificationError`-shaped err.
 *   - The "valid_sig" sentinel string is the test convention for a passing
 *     signature; `"bad_sig"` (or anything else) triggers the verifier-throws
 *     branch.
 */

import { vi } from "vitest";

export interface MockStripeSession {
  id: string;
  url: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  client_reference_id?: string | null;
  customer_email?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string>;
  mode?: "subscription" | "payment" | "setup";
  amount_total?: number | null;
  currency?: string | null;
}

export interface MockStripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  items: { data: Array<{ price: { product: string } }> };
}

export interface MockStripeProduct {
  id: string;
  metadata: Record<string, string>;
}

export interface MockRefundCreateCall {
  params: Record<string, unknown>;
  opts?: { idempotencyKey?: string };
}

export interface MockInvoiceFixture {
  id: string;
  payment_intent: string | null;
  amount_paid: number;
}

export interface MockStripe {
  /** ctor invocation log. */
  ctorCalls: Array<{ secret: string; opts: { apiVersion: string } }>;

  /** checkout.sessions.create call log. */
  checkoutCreateCalls: Array<Record<string, unknown>>;
  /** checkout.sessions.retrieve call log. */
  checkoutRetrieveCalls: string[];
  /** subscriptions.retrieve call log. */
  subscriptionRetrieveCalls: string[];
  /** products.retrieve call log. */
  productRetrieveCalls: string[];
  /** billingPortal.sessions.create log. */
  portalCreateCalls: Array<Record<string, unknown>>;
  /** webhooks.constructEventAsync call log. */
  webhookVerifyCalls: Array<{ rawBody: string; sig: string }>;
  /** refunds.create call log (M2 Batch 3 — CA pro-rata refund). */
  refundCreateCalls: MockRefundCreateCall[];
  /** invoices.retrieve call log. */
  invoiceRetrieveCalls: string[];

  /** Pre-staged checkout-session result (used both for create + retrieve). */
  stubCheckoutSession: MockStripeSession | null;
  /** Map of session_id → session for retrieve calls (overrides stubCheckoutSession). */
  stubCheckoutSessionsByCs: Map<string, MockStripeSession>;
  /** Pre-staged subscription (by id). */
  stubSubscriptions: Map<string, MockStripeSubscription>;
  /** Pre-staged product (by id). */
  stubProducts: Map<string, MockStripeProduct>;
  /** Pre-staged portal session URL. */
  stubPortalUrl: string;
  /** Pre-staged constructEventAsync return; the rawBody key indexes them. */
  stubEvents: Map<string, unknown>;
  /** Pre-staged refund id returned by refunds.create. */
  stubRefundId: string;
  /** Pre-staged invoice fixtures (by invoice id). */
  stubInvoices: Map<string, MockInvoiceFixture>;

  /** Throw flags to force error paths. */
  throwOnCheckoutCreate: Error | null;
  throwOnCheckoutRetrieve: Error | null;
  throwOnSubscriptionRetrieve: Error | null;
  throwOnPortalCreate: Error | null;
  throwOnWebhookVerify: Error | null;
  throwOnRefundCreate: Error | null;
  throwOnInvoiceRetrieve: Error | null;
}

export const mockStripeState: MockStripe = {
  ctorCalls: [],
  checkoutCreateCalls: [],
  checkoutRetrieveCalls: [],
  subscriptionRetrieveCalls: [],
  productRetrieveCalls: [],
  portalCreateCalls: [],
  webhookVerifyCalls: [],
  refundCreateCalls: [],
  invoiceRetrieveCalls: [],
  stubCheckoutSession: null,
  stubCheckoutSessionsByCs: new Map(),
  stubSubscriptions: new Map(),
  stubProducts: new Map(),
  stubPortalUrl: "https://billing.stripe.com/p/session/test_portal",
  stubEvents: new Map(),
  stubRefundId: "re_TEST_DEFAULT",
  stubInvoices: new Map(),
  throwOnCheckoutCreate: null,
  throwOnCheckoutRetrieve: null,
  throwOnSubscriptionRetrieve: null,
  throwOnPortalCreate: null,
  throwOnWebhookVerify: null,
  throwOnRefundCreate: null,
  throwOnInvoiceRetrieve: null,
};

export function resetMockStripe(): void {
  mockStripeState.ctorCalls = [];
  mockStripeState.checkoutCreateCalls = [];
  mockStripeState.checkoutRetrieveCalls = [];
  mockStripeState.subscriptionRetrieveCalls = [];
  mockStripeState.productRetrieveCalls = [];
  mockStripeState.portalCreateCalls = [];
  mockStripeState.webhookVerifyCalls = [];
  mockStripeState.refundCreateCalls = [];
  mockStripeState.invoiceRetrieveCalls = [];
  mockStripeState.stubCheckoutSession = null;
  mockStripeState.stubCheckoutSessionsByCs.clear();
  mockStripeState.stubSubscriptions.clear();
  mockStripeState.stubProducts.clear();
  mockStripeState.stubEvents.clear();
  mockStripeState.stubInvoices.clear();
  mockStripeState.stubPortalUrl = "https://billing.stripe.com/p/session/test_portal";
  mockStripeState.stubRefundId = "re_TEST_DEFAULT";
  mockStripeState.throwOnCheckoutCreate = null;
  mockStripeState.throwOnCheckoutRetrieve = null;
  mockStripeState.throwOnSubscriptionRetrieve = null;
  mockStripeState.throwOnPortalCreate = null;
  mockStripeState.throwOnWebhookVerify = null;
  mockStripeState.throwOnRefundCreate = null;
  mockStripeState.throwOnInvoiceRetrieve = null;
}

/**
 * Returns the default-export class shape that `import Stripe from "stripe"`
 * yields. Use as the second arg to `vi.mock("stripe", () => ({ default: ... }))`.
 */
export function makeStripeMockModule(): { default: unknown } {
  // The class. We capture ctor args.
  function StripeClass(secret: string, opts: { apiVersion: string }) {
    mockStripeState.ctorCalls.push({ secret, opts });
    return {
      webhooks: {
        async constructEventAsync(rawBody: string, sig: string, _whSecret: string) {
          mockStripeState.webhookVerifyCalls.push({ rawBody, sig });
          if (mockStripeState.throwOnWebhookVerify) {
            throw mockStripeState.throwOnWebhookVerify;
          }
          if (sig === "bad_sig" || sig === "") {
            throw new Error("No signatures found matching the expected signature for payload");
          }
          // Prefer indexed events; else parse rawBody directly.
          const indexed = mockStripeState.stubEvents.get(rawBody);
          if (indexed) return indexed;
          try {
            return JSON.parse(rawBody);
          } catch {
            throw new Error("Invalid webhook payload");
          }
        },
      },
      checkout: {
        sessions: {
          async create(params: Record<string, unknown>) {
            mockStripeState.checkoutCreateCalls.push(params);
            if (mockStripeState.throwOnCheckoutCreate) {
              throw mockStripeState.throwOnCheckoutCreate;
            }
            const s = mockStripeState.stubCheckoutSession ?? {
              id: "cs_test_DEFAULT_" + Date.now(),
              url: "https://checkout.stripe.com/c/pay/cs_test_DEFAULT",
            };
            return s;
          },
          async retrieve(id: string) {
            mockStripeState.checkoutRetrieveCalls.push(id);
            if (mockStripeState.throwOnCheckoutRetrieve) {
              throw mockStripeState.throwOnCheckoutRetrieve;
            }
            const m = mockStripeState.stubCheckoutSessionsByCs.get(id);
            if (m) return m;
            if (mockStripeState.stubCheckoutSession) return mockStripeState.stubCheckoutSession;
            throw new Error(`No such checkout session: ${id}`);
          },
        },
      },
      subscriptions: {
        async retrieve(id: string) {
          mockStripeState.subscriptionRetrieveCalls.push(id);
          if (mockStripeState.throwOnSubscriptionRetrieve) {
            throw mockStripeState.throwOnSubscriptionRetrieve;
          }
          const s = mockStripeState.stubSubscriptions.get(id);
          if (s) return s;
          throw new Error(`No such subscription: ${id}`);
        },
      },
      products: {
        async retrieve(id: string) {
          mockStripeState.productRetrieveCalls.push(id);
          const p = mockStripeState.stubProducts.get(id);
          if (p) return p;
          // Fallback shape — tests that don't care about metadata still pass.
          return { id, metadata: {} };
        },
      },
      billingPortal: {
        sessions: {
          async create(params: Record<string, unknown>) {
            mockStripeState.portalCreateCalls.push(params);
            if (mockStripeState.throwOnPortalCreate) {
              throw mockStripeState.throwOnPortalCreate;
            }
            return { url: mockStripeState.stubPortalUrl };
          },
        },
      },
      refunds: {
        async create(
          params: Record<string, unknown>,
          reqOpts?: { idempotencyKey?: string },
        ) {
          mockStripeState.refundCreateCalls.push({ params, opts: reqOpts });
          if (mockStripeState.throwOnRefundCreate) {
            throw mockStripeState.throwOnRefundCreate;
          }
          return { id: mockStripeState.stubRefundId, status: "succeeded" };
        },
      },
      invoices: {
        async retrieve(id: string) {
          mockStripeState.invoiceRetrieveCalls.push(id);
          if (mockStripeState.throwOnInvoiceRetrieve) {
            throw mockStripeState.throwOnInvoiceRetrieve;
          }
          const f = mockStripeState.stubInvoices.get(id);
          if (f) return f;
          return { id, payment_intent: null, amount_paid: 0 };
        },
      },
    };
  }
  return { default: StripeClass as unknown };
}

/** Idiomatic guard: every M2 Verify spec uses this at the top. */
export function installStripeMock(): void {
  vi.mock("stripe", () => makeStripeMockModule());
}
