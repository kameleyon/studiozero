/**
 * Studio Zero — D23 GitHub App uninstall/reinstall tracking spec.
 *
 * Phase 9 V1.5 Batch 1 (Forge). PRD §11.2 D23 + ARCH-D6: when the
 * customer uninstalls the GitHub App AFTER an Auto-PR has opened, the
 * `fix_pr_jobs.tracking_state` column flips from `'active'` → `'stale'`.
 * When the customer reinstalls, the same row flips to `'recovered'`.
 *
 * V1.5 exit gate test row: "GitHub App uninstalled after PR opened →
 * tracking_state='stale'; reinstall → 'recovered'."
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase.js";

vi.mock("server-only", () => ({}));

const __mockSupa: MockSupabase = makeMockSupabase();
vi.mock("../../apps/web/lib/supabase-service", () => ({
  createServiceRoleClient: () => __mockSupa.client,
}));

const routeMod = await import("../../apps/web/app/api/webhooks/github/route.js");
const POST = (
  routeMod as { POST: (req: Request) => Promise<Response> }
).POST;

const SECRET = "verify_test_webhook_secret_2026";
process.env.GITHUB_APP_WEBHOOK_SECRET = SECRET;

function signBody(body: string): string {
  const h = createHmac("sha256", SECRET);
  h.update(body);
  return `sha256=${h.digest("hex")}`;
}

function makeReq(body: string, eventType: string): Request {
  return new Request("https://studio-zero.dev/api/webhooks/github", {
    method: "POST",
    headers: {
      "x-github-event": eventType,
      "x-hub-signature-256": signBody(body),
      "x-github-delivery": "test-delivery-" + Math.random(),
      "Content-Type": "application/json",
    },
    body,
  });
}

describe("D23: GH App uninstall → fix_pr_jobs.tracking_state='stale'", () => {
  beforeEach(() => {
    __mockSupa.reset();
  });
  afterEach(() => {
    __mockSupa.reset();
  });

  it("installation.deleted flips fix_pr_jobs.tracking_state to 'stale'", async () => {
    const payload = {
      action: "deleted",
      installation: { id: 42 },
    };
    const body = JSON.stringify(payload);
    const res = await POST(makeReq(body, "installation"));
    expect(res.status).toBe(200);

    // Assert UPDATE was issued against fix_pr_jobs with the stale set.
    const fixPrJobsUpdates = __mockSupa.updates.filter(
      (u) => u.table === "fix_pr_jobs",
    );
    expect(fixPrJobsUpdates.length).toBeGreaterThan(0);
    const staleUpdate = fixPrJobsUpdates.find(
      (u) => (u.patch as { tracking_state?: string }).tracking_state === "stale",
    );
    expect(staleUpdate).toBeDefined();
    // Predicate must scope by the installation id.
    expect(
      staleUpdate?.filters.some((f) => f.col === "github_installation_id" && f.val === 42),
    ).toBe(true);
  });

  it("installation.created flips fix_pr_jobs.tracking_state to 'recovered'", async () => {
    // The handler does an .update(...).select() then audits the count.
    // Push a fake recovered-rows result so the handler walks the
    // "recovered, log it" branch.
    __mockSupa.pushRead("fix_pr_jobs", [
      { id: "fp-1", pr_number: 99 },
    ]);
    const payload = {
      action: "created",
      installation: { id: 42 },
    };
    const body = JSON.stringify(payload);
    const res = await POST(makeReq(body, "installation"));
    expect(res.status).toBe(200);

    const fixPrJobsUpdates = __mockSupa.updates.filter(
      (u) => u.table === "fix_pr_jobs",
    );
    const recoveredUpdate = fixPrJobsUpdates.find(
      (u) =>
        (u.patch as { tracking_state?: string }).tracking_state === "recovered",
    );
    expect(recoveredUpdate).toBeDefined();
    expect(
      recoveredUpdate?.filters.some(
        (f) => f.col === "github_installation_id" && f.val === 42,
      ),
    ).toBe(true);
  });

  it("pull_request.merged updates fix_pr_jobs.state='pr_merged'", async () => {
    __mockSupa.pushRead("fix_pr_jobs", [
      { id: "fp-1", tenant_id: "t1", run_id: "r1" },
    ]);
    const payload = {
      action: "closed",
      pull_request: {
        id: 1000,
        number: 99,
        merged: true,
        merged_at: "2026-05-12T00:00:00Z",
        html_url: "https://github.com/acme/demo/pull/99",
        base: { repo: { full_name: "acme/demo" } },
      },
    };
    const body = JSON.stringify(payload);
    const res = await POST(makeReq(body, "pull_request"));
    expect(res.status).toBe(200);

    const fixPrJobsUpdates = __mockSupa.updates.filter(
      (u) => u.table === "fix_pr_jobs",
    );
    const mergeUpdate = fixPrJobsUpdates.find(
      (u) => (u.patch as { state?: string }).state === "pr_merged",
    );
    expect(mergeUpdate).toBeDefined();
  });

  it("pull_request.closed (unmerged) updates fix_pr_jobs.state='pr_closed_unmerged'", async () => {
    __mockSupa.pushRead("fix_pr_jobs", [
      { id: "fp-2", tenant_id: "t1", run_id: "r1" },
    ]);
    const payload = {
      action: "closed",
      pull_request: {
        id: 1001,
        number: 100,
        merged: false,
        merged_at: null,
        html_url: "https://github.com/acme/demo/pull/100",
        base: { repo: { full_name: "acme/demo" } },
      },
    };
    const body = JSON.stringify(payload);
    const res = await POST(makeReq(body, "pull_request"));
    expect(res.status).toBe(200);
    const fixPrJobsUpdates = __mockSupa.updates.filter(
      (u) => u.table === "fix_pr_jobs",
    );
    const closeUpdate = fixPrJobsUpdates.find(
      (u) => (u.patch as { state?: string }).state === "pr_closed_unmerged",
    );
    expect(closeUpdate).toBeDefined();
  });
});
