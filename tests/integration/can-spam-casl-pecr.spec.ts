/**
 * Studio Zero — CAN-SPAM / CASL / PECR compliance (M4 Batch 1 Verify).
 *
 * Asserts:
 *   - Every lifecycle email carries an unsubscribe link + sender id.
 *   - Subject lines have no exclamation marks (Herald §0.5).
 *   - List-Unsubscribe header present (RFC 8058 one-click).
 *   - E5 requires marketing_consent=true (CASL §11(1)).
 *   - HMAC unsubscribe tokens verify correctly.
 *   - 10-day SLA — unsubscribe processed synchronously.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase.js";

vi.mock("server-only", () => ({}));

const __mockService: MockSupabase = makeMockSupabase();
vi.mock("../../apps/web/lib/supabase-service", () => ({
  createServiceRoleClient: () => __mockService.client,
}));
vi.mock("../../apps/web/lib/analytics-events.v1", () => ({
  track: vi.fn(() => Promise.resolve()),
}));

const __sendEmailCalls: Array<{
  to: string | string[];
  rendered: { subject: string; html: string; text: string };
  listUnsubscribeUrl?: string;
}> = [];
vi.mock("../../apps/web/lib/resend-client", () => ({
  sendEmail: vi.fn(async (req: {
    to: string | string[];
    rendered: { subject: string; html: string; text: string };
    listUnsubscribeUrl?: string;
  }) => {
    __sendEmailCalls.push(req);
    return { status: "sent", provider_message_id: `resend_${__sendEmailCalls.length}` };
  }),
}));

process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret-do-not-use-in-prod";
process.env.NEXT_PUBLIC_APP_URL = "https://studiozero.test";
process.env.EMAIL_SENDER_POSTAL = "Studio Zero Inc., 1 Test Way, Delaware, USA";
process.env.EMAIL_E2_SUBSTANTIATION_READY = "true";

const triggersMod = await import("../../apps/web/lib/email-triggers/index.js");
const {
  triggerE1,
  triggerE2,
  triggerE3,
  triggerE4ForUser,
  triggerE5ForUser,
  triggerDunning,
  triggerCancellationConfirmation,
} = triggersMod;

const tokenMod = await import("../../apps/web/lib/email-templates/_unsubscribe-token.js");
const { mintUnsubscribeToken, verifyUnsubscribeToken } = tokenMod;

const USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "alex@example.com",
  display_name: "Alex",
  default_tenant_id: "00000000-0000-0000-0000-00000000aaaa",
  email_marketing_opted_out: false,
  email_invalid_at: null,
  marketing_consent: false,
  created_at: "2026-03-11T00:00:00.000Z",
};

function seedUser(overrides: Partial<typeof USER> = {}): void {
  __mockService.pushRead("users", { ...USER, ...overrides });
}

beforeEach(() => {
  __mockService.reset();
  __sendEmailCalls.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

function lastSent() {
  return __sendEmailCalls[__sendEmailCalls.length - 1];
}

function assertCanSpamMandatoryElements(html: string, text: string): void {
  expect(html).toMatch(/Unsubscribe/i);
  expect(text).toMatch(/Unsubscribe/i);
  expect(html).toContain("Studio Zero");
  expect(html.toLowerCase()).toMatch(/delaware|p\.o\. box/i);
  expect(text).toContain("Studio Zero");
  expect(html).toContain("Studio Zero is an AI system");
  expect(text).toContain("Studio Zero is an AI system");
}

describe("Unsubscribe token (HMAC)", () => {
  it("mints + verifies a valid token", () => {
    const tok = mintUnsubscribeToken(USER.id, "marketing");
    const v = verifyUnsubscribeToken(tok);
    expect(v).not.toBeNull();
    expect(v?.user_id).toBe(USER.id);
    expect(v?.scope).toBe("marketing");
  });

  it("rejects a tampered token", () => {
    const tok = mintUnsubscribeToken(USER.id, "marketing");
    const tampered = tok.slice(0, -2) + "AA";
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    const tok = mintUnsubscribeToken(USER.id, "marketing", Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(verifyUnsubscribeToken(tok)).toBeNull();
  });
});

describe("E1 — CAN-SPAM mandatory elements", () => {
  it("includes unsubscribe link, identification line, and AI-system footer", async () => {
    seedUser();
    await triggerE1(USER.id);
    const sent = lastSent();
    expect(sent).toBeDefined();
    assertCanSpamMandatoryElements(sent.rendered.html, sent.rendered.text);
    expect(sent.rendered.subject).not.toMatch(/!/);
  });

  it("attaches a List-Unsubscribe header for RFC 8058 one-click", async () => {
    seedUser();
    await triggerE1(USER.id);
    const sent = lastSent();
    expect(sent.listUnsubscribeUrl).toBeDefined();
    expect(sent.listUnsubscribeUrl).toContain("/api/email/unsubscribe?token=");
  });
});

describe("E2 — CAN-SPAM mandatory elements", () => {
  it("includes unsubscribe + AI disclosure on FAIL upsell", async () => {
    seedUser();
    __mockService.pushRead("runs", {
      id: "run-1",
      project_id: "proj-1",
      verdict: "FAIL",
      product: "surface",
      score: 58,
      findings_count: 14,
      audited_domain: "staging.acme.dev",
      severity_counts: { blocker: 2, critical: 4 },
    });
    await triggerE2(USER.id, "run-1");
    const sent = lastSent();
    assertCanSpamMandatoryElements(sent.rendered.html, sent.rendered.text);
    expect(sent.rendered.subject).not.toMatch(/!/);
  });
});

describe("E3 + E4 — mandatory elements", () => {
  it("E3 carries the locked footer", async () => {
    seedUser();
    __mockService.pushRead("runs", {
      id: "run-2",
      project_id: "proj-1",
      verdict: "PASS_WITH_FIXES",
      score: 81,
      findings_count: 6,
      audited_domain: "staging.acme.dev",
      severity_counts: { critical: 1, major: 3, minor: 2 },
    });
    await triggerE3(USER.id, "run-2");
    assertCanSpamMandatoryElements(lastSent().rendered.html, lastSent().rendered.text);
  });

  it("E4 carries the locked footer", async () => {
    seedUser();
    __mockService.pushRead("projects", { id: "proj-1", slug: "acme", last_run_id: "run-2" });
    __mockService.pushRead("runs", { score: 81, severity_counts: { critical: 1, major: 3, minor: 2 } });
    await triggerE4ForUser(USER.id, "proj-1");
    assertCanSpamMandatoryElements(lastSent().rendered.html, lastSent().rendered.text);
  });
});

describe("E5 — CASL Canada confirmed-opt-in gate", () => {
  it("does NOT fire without marketing_consent", async () => {
    seedUser({ marketing_consent: false });
    const r = await triggerE5ForUser(USER.id, null);
    expect(r.status).toBe("suppressed");
    if (r.status !== "suppressed") return;
    expect(r.reason).toBe("marketing_consent_required");
    expect(__sendEmailCalls).toHaveLength(0);
  });

  it("fires + has mandatory elements when marketing_consent=true", async () => {
    seedUser({ marketing_consent: true });
    __mockService.pushRead("users", { created_at: "2026-03-11T00:00:00.000Z" });
    await triggerE5ForUser(USER.id, null);
    expect(__sendEmailCalls).toHaveLength(1);
    assertCanSpamMandatoryElements(lastSent().rendered.html, lastSent().rendered.text);
  });
});

describe("Dunning emails — every step carries mandatory elements", () => {
  const steps: Array<"t0" | "t3" | "t7" | "t14" | "t21"> = ["t0", "t3", "t7", "t14", "t21"];
  for (const step of steps) {
    it(`E-dun-${step} carries unsubscribe + identification`, async () => {
      seedUser();
      await triggerDunning({
        userId: USER.id,
        step,
        tier: "BYOK Starter",
        invoiceAmount: "$49.00",
        deadline: "June 12",
        dedupeKey: `inv-${step}`,
      });
      assertCanSpamMandatoryElements(lastSent().rendered.html, lastSent().rendered.text);
      expect(lastSent().rendered.subject).not.toMatch(/!/);
    });
  }
});

describe("Cancellation confirmations — region routing", () => {
  const regions: Array<{ region: "eu" | "uk" | "california" | "us_other"; expectSubject: string }> = [
    { region: "eu", expectSubject: "Your Studio Zero refund is processing." },
    { region: "uk", expectSubject: "Your Studio Zero refund is processing." },
    { region: "california", expectSubject: "Your Studio Zero subscription is cancelled." },
    { region: "us_other", expectSubject: "Your Studio Zero subscription is cancelled." },
  ];
  for (const { region, expectSubject } of regions) {
    it(`region=${region} routes to the right template`, async () => {
      seedUser();
      await triggerCancellationConfirmation({
        userId: USER.id,
        region,
        periodEnd: "May 28",
        dedupeKey: `cancel-${region}`,
        refundAmount: region === "us_other" ? undefined : "24.50",
        currency: region === "eu" || region === "uk" ? "EUR" : undefined,
      });
      expect(lastSent().rendered.subject).toBe(expectSubject);
      assertCanSpamMandatoryElements(lastSent().rendered.html, lastSent().rendered.text);
    });
  }
});

describe("10-day unsubscribe SLA", () => {
  it("processing happens synchronously inside the route handler", async () => {
    const route = await import("../../apps/web/app/api/email/unsubscribe/route.js");
    const tok = mintUnsubscribeToken(USER.id, "marketing");
    const req = new Request(
      `https://studiozero.test/api/email/unsubscribe?token=${encodeURIComponent(tok)}`,
      { method: "GET" },
    );
    const res = await (route as { GET: (r: Request) => Promise<Response> }).GET(req);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("You&rsquo;re unsubscribed");
    const userUpdate = __mockService.updates.find(
      (u) =>
        u.table === "users" &&
        u.patch.email_marketing_opted_out === true,
    );
    expect(userUpdate).toBeDefined();
  });

  it("rejects an invalid token without writing to users", async () => {
    const route = await import("../../apps/web/app/api/email/unsubscribe/route.js");
    const req = new Request(
      `https://studiozero.test/api/email/unsubscribe?token=garbage`,
      { method: "GET" },
    );
    const res = await (route as { GET: (r: Request) => Promise<Response> }).GET(req);
    expect(res.status).toBe(400);
    const userUpdate = __mockService.updates.find((u) => u.table === "users");
    expect(userUpdate).toBeUndefined();
  });
});
