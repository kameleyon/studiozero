/**
 * Studio Zero — Lifecycle email triggers (M4 Batch 1 Verify).
 *
 * Asserts:
 *   - E1 fires on signup-confirmed (triggerE1).
 *   - E2 fires on Surface FAIL when substantiation-flag set.
 *   - E3 fires on PASS_WITH_FIXES.
 *   - E4 fires at T-3 (triggerE4ForUser).
 *   - E5 fires at day-60 ONLY when marketing_consent=true (CASL).
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

const __sendEmailCalls: Array<Record<string, unknown>> = [];
vi.mock("../../apps/web/lib/resend-client", () => ({
  sendEmail: vi.fn(async (req: Record<string, unknown>) => {
    __sendEmailCalls.push(req);
    return { status: "sent", provider_message_id: `resend_${__sendEmailCalls.length}` };
  }),
}));

process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret-do-not-use-in-prod";
process.env.NEXT_PUBLIC_APP_URL = "https://studiozero.test";

const triggersMod = await import("../../apps/web/lib/email-triggers/index.js");
const { triggerE1, triggerE2, triggerE3, triggerE4ForUser, triggerE5ForUser } = triggersMod;

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
  __mockService.registerUnique("email_events", "id");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("E1 — signup welcome", () => {
  it("fires on signup-confirmed and inserts an email_events row", async () => {
    seedUser();
    const r = await triggerE1(USER.id);
    expect(r.status).toBe("sent");
    if (r.status !== "sent") return;
    expect(r.provider_message_id).toMatch(/^resend_/);

    const eventInserts = __mockService.inserts.filter((i) => i.table === "email_events");
    expect(eventInserts).toHaveLength(1);
    expect(eventInserts[0].row.template).toBe("e1-welcome");
    expect(eventInserts[0].row.dedupe_key).toBe("welcome");

    expect(__sendEmailCalls).toHaveLength(1);
    const sent = __sendEmailCalls[0] as { rendered: { subject: string; html: string; text: string } };
    expect(sent.rendered.subject).toBe("Your free audit is ready.");
  });
});

describe("E2 — Surface FAIL upsell", () => {
  it("suppresses when EMAIL_E2_SUBSTANTIATION_READY is false", async () => {
    delete process.env.EMAIL_E2_SUBSTANTIATION_READY;
    seedUser();
    const r = await triggerE2(USER.id, "run-1");
    expect(r.status).toBe("suppressed");
  });

  it("fires when verdict=FAIL + product=surface and flag is set", async () => {
    process.env.EMAIL_E2_SUBSTANTIATION_READY = "true";
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
    const r = await triggerE2(USER.id, "run-1");
    expect(r.status).toBe("sent");
    const sent = __sendEmailCalls[0] as { rendered: { subject: string; html: string } };
    expect(sent.rendered.subject).toContain("staging.acme.dev");
    expect(sent.rendered.subject).toContain("Surface");
  });
});

describe("E3 — PASS WITH FIXES", () => {
  it("fires with the score and re-audit window date in the body", async () => {
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
    const r = await triggerE3(USER.id, "run-2");
    expect(r.status).toBe("sent");
    const sent = __sendEmailCalls[0] as { rendered: { subject: string; text: string } };
    expect(sent.rendered.subject).toContain("81 / 100");
    expect(sent.rendered.subject).toContain("re-audit free for 30 days");
  });
});

describe("E4 — re-audit window expiring (T-3)", () => {
  it("fires with the project slug and locked subject", async () => {
    seedUser();
    __mockService.pushRead("projects", {
      id: "proj-1",
      slug: "acme-marketing-site",
      last_run_id: "run-2",
    });
    __mockService.pushRead("runs", {
      score: 81,
      severity_counts: { critical: 1, major: 3, minor: 2 },
    });
    const r = await triggerE4ForUser(USER.id, "proj-1");
    expect(r.status).toBe("sent");
    const sent = __sendEmailCalls[0] as { rendered: { subject: string; text: string } };
    expect(sent.rendered.subject).toBe("3 days left on your free re-audit.");
    expect(sent.rendered.text).toContain("acme-marketing-site");
  });
});

describe("E5 — day-60 win-back (CASL-gated)", () => {
  it("DOES NOT fire when marketing_consent is false (CASL gate)", async () => {
    seedUser({ marketing_consent: false });
    const r = await triggerE5ForUser(USER.id, "proj-1");
    expect(r.status).toBe("suppressed");
    if (r.status !== "suppressed") return;
    expect(r.reason).toBe("marketing_consent_required");
    expect(__sendEmailCalls).toHaveLength(0);
  });

  it("fires when marketing_consent is true", async () => {
    seedUser({ marketing_consent: true });
    __mockService.pushRead("users", { created_at: "2026-03-11T00:00:00.000Z" });
    const r = await triggerE5ForUser(USER.id, "proj-1");
    expect(r.status).toBe("sent");
    const sent = __sendEmailCalls[0] as { rendered: { subject: string } };
    expect(sent.rendered.subject).toBe("What changed on Studio Zero since you signed up.");
  });

  it("DOES NOT fire when email_marketing_opted_out is true", async () => {
    seedUser({ marketing_consent: true, email_marketing_opted_out: true });
    const r = await triggerE5ForUser(USER.id, "proj-1");
    expect(r.status).toBe("suppressed");
  });
});
