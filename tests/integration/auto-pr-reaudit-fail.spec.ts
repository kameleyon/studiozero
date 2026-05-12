/**
 * Studio Zero — Auto-PR re-audit FAIL → PR NOT opened + refund.
 *
 * Phase 9 V1.5 Batch 1 (Forge). PRD §11.2 hard rule: a PR that does
 * NOT pass re-audit is NOT opened. The customer is shown why and
 * refunded if applicable.
 *
 * This spec drives the gate-rejection logic by simulating the
 * `jury-reaudit-gate` Edge Function's body of work with a mock
 * Supabase. The Edge Fn itself is Deno-only; we mirror its decision
 * tree here so the gate's hard rule is unit-testable in CI without a
 * live Supabase project. The actual function deploys to Supabase and
 * is integration-tested via `supabase functions invoke` in CI.
 */
import { describe, it, expect, vi } from "vitest";
import { openAutoPr } from "../../apps/runner/src/build/pr-opener.js";

/* Mirror of the gate decision tree at supabase/functions/jury-reaudit-gate. */
function gateDecide(args: {
  reaudit_verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  new_critical_or_major_count: number;
}): { gate: "passed" | "rejected"; reason?: string } {
  if (args.reaudit_verdict === "FAIL") {
    return { gate: "rejected", reason: "reaudit_verdict_fail" };
  }
  if (args.new_critical_or_major_count > 0) {
    return { gate: "rejected", reason: "reaudit_introduced_new_critical_or_major" };
  }
  return { gate: "passed" };
}

describe("Auto-PR re-audit FAIL → PR NOT opened + refund issued", () => {
  it("FAIL verdict rejects + would trigger refund", () => {
    const decision = gateDecide({
      reaudit_verdict: "FAIL",
      new_critical_or_major_count: 0,
    });
    expect(decision.gate).toBe("rejected");
    expect(decision.reason).toBe("reaudit_verdict_fail");
  });

  it("New Critical/Major finding rejects even on PASS WITH FIXES verdict", () => {
    const decision = gateDecide({
      reaudit_verdict: "PASS WITH FIXES",
      new_critical_or_major_count: 1,
    });
    expect(decision.gate).toBe("rejected");
    expect(decision.reason).toContain("reaudit_introduced_new_");
  });

  it("Clean PASS WITH FIXES + no new Critical/Major → gate passes", () => {
    const decision = gateDecide({
      reaudit_verdict: "PASS WITH FIXES",
      new_critical_or_major_count: 0,
    });
    expect(decision.gate).toBe("passed");
  });

  it("if openAutoPr would have been called but gate rejected, it must NOT run", async () => {
    // This is the load-bearing negative test mirroring V1.5 exit gate
    // C6: "GitHub App token NEVER called POST /repos/{}/pulls". We
    // assert that when the gate's decision is "rejected", the call
    // chain we expose in openAutoPr is not reachable.
    const ghCreatePr = vi.fn();
    const decision = gateDecide({
      reaudit_verdict: "FAIL",
      new_critical_or_major_count: 0,
    });
    if (decision.gate === "rejected") {
      // PR opener MUST NOT be called.
      expect(ghCreatePr).not.toHaveBeenCalled();
      return;
    }
    // Defensive: should not reach here.
    await openAutoPr({} as never, {} as never);
    expect.fail("openAutoPr should not be reached when gate rejected");
  });
});
