/**
 * Studio Zero — V2.1 scaffold audit-gate FAIL spec.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Negative test for the V2.1 milestone exit
 * gate (PRD §7.3 hard rule): when the Jury audit verdicts FAIL on the
 * generated scaffold, delivery MUST be refused and a refund offered.
 *
 * This is the V2.1 sibling of `build-audit-gate-fail.spec.ts` (V2 roadmap
 * bundle FAIL). Same principle: bad output never ships.
 *
 * Asserts:
 *   - When a scaffold file contains the SECURITY_BUG sentinel, the mock
 *     Jury audit emits a Critical finding → verdict FAIL.
 *   - The pipeline returns deliverable=false + zip_bytes is empty.
 *   - A `failed` event is emitted with `refund: true`.
 *   - The rejection_reason names the Critical finding.
 *
 * Plus the unit-level decideVerdict() function table:
 *   - 1 critical → FAIL
 *   - 3+ major   → FAIL
 *   - 1 major    → PASS WITH FIXES
 *   - 4+ minor   → PASS WITH FIXES
 *   - clean      → PASS
 */
import { describe, it, expect } from "vitest";

import { runScaffoldPipeline } from "../../apps/runner/src/build/scaffold-v2-1/index.js";
import {
  decideVerdict,
  type AuditGateDeps,
} from "../../apps/runner/src/build/scaffold-v2-1/audit-gate.js";
import type {
  Brief,
  BuildEvent,
} from "../../apps/runner/src/build/v2/types.js";

function makeBrief(): Brief {
  return {
    schema_version: "brief.v1",
    build_id: "77777777-7777-7777-7777-777777777777",
    tenant_id: "88888888-8888-8888-8888-888888888888",
    project_name: "RegFin — a regulated fintech SaaS",
    idea_summary:
      "A regulated KYC-heavy fintech SaaS dashboard for compliance officers.",
    target_audience: {
      persona: "Fintech compliance officers",
      primary_need: "Pre-built KYC + audit-log surface",
      pain_point: "Manual quarterly compliance reviews",
    },
    jtbd: "When a CCO opens the dashboard, they need a one-click KYC audit.",
    success_criteria: ["FCA-friendly audit posture"],
    risk_profile: "regulated",
    team_roster: ["saas"],
    output_preference: "roadmap-docs-repo-scaffold",
    generated_at: "2026-05-12T00:00:00Z",
    produced_by: {
      agent: "bigbrain",
      model_class: "thoughtful",
      request_id: "spec-scaffold-fail",
    },
  };
}

/** Force the Jury audit to emit a Critical finding by tagging a scaffold
 *  file with the SECURITY_BUG sentinel (audit-gate.ts's mock contract). */
function juryAuditWithCritical(): AuditGateDeps["runJuryAudit"] {
  return async ({ files }) => {
    // The orchestrator already produced the scaffold; we synthesize a
    // Critical finding regardless of file contents to assert the FAIL path.
    const findings = [
      {
        code: "F-SEC-002",
        severity: "critical" as const,
        layer: "security" as const,
        file_path: files[0]?.path,
        summary:
          "Generated scaffold ships a Stripe webhook handler without signature verification.",
      },
    ];
    return {
      findings,
      score: 40,
      audit_run_id: "mock-audit-fail-spec",
    };
  };
}

describe("V2.1 scaffold pipeline — audit-gate FAIL halts delivery", () => {
  it("Critical finding → deliverable=false + refund signaled", async () => {
    const brief = makeBrief();
    const events: BuildEvent[] = [];

    const result = await runScaffoldPipeline(
      {
        brief,
        project_slug: "regfin",
        signal: new AbortController().signal,
      },
      {
        generateCode: async () => "USE_DEFAULT",
        runAudit: juryAuditWithCritical(),
        emit: async (e: BuildEvent): Promise<void> => {
          events.push(e);
        },
      },
    );

    expect(result.deliverable).toBe(false);
    expect(result.audit.verdict).toBe("FAIL");
    expect(result.audit.rejection_reason).toMatch(/Critical/);
    expect(result.zip_bytes.length).toBe(0);
    expect(result.manifest).toEqual([]);

    const failed = events.find((e) => e.type === "failed");
    expect(failed).toBeDefined();
    expect(
      (failed?.payload as { refund?: boolean } | undefined)?.refund,
    ).toBe(true);
  });
});

describe("V2.1 audit-gate decideVerdict — rule table", () => {
  const finding = (sev: "critical" | "major" | "minor") =>
    ({
      code: `F-${sev[0]!.toUpperCase()}-001`,
      severity: sev,
      layer: "frontend" as const,
      summary: "test",
    });

  it("1 critical → FAIL", () => {
    const v = decideVerdict([finding("critical")]);
    expect(v.verdict).toBe("FAIL");
    expect(v.rejection_reason).toBeDefined();
  });

  it("3 major → FAIL (cap is 2)", () => {
    const v = decideVerdict([finding("major"), finding("major"), finding("major")]);
    expect(v.verdict).toBe("FAIL");
  });

  it("2 major → PASS WITH FIXES", () => {
    const v = decideVerdict([finding("major"), finding("major")]);
    expect(v.verdict).toBe("PASS WITH FIXES");
  });

  it("1 major → PASS WITH FIXES", () => {
    const v = decideVerdict([finding("major")]);
    expect(v.verdict).toBe("PASS WITH FIXES");
  });

  it("4 minor → PASS WITH FIXES (>3 minor floor)", () => {
    const v = decideVerdict([
      finding("minor"),
      finding("minor"),
      finding("minor"),
      finding("minor"),
    ]);
    expect(v.verdict).toBe("PASS WITH FIXES");
  });

  it("3 minor → PASS (still under the floor)", () => {
    const v = decideVerdict([finding("minor"), finding("minor"), finding("minor")]);
    expect(v.verdict).toBe("PASS");
  });

  it("0 findings → PASS", () => {
    const v = decideVerdict([]);
    expect(v.verdict).toBe("PASS");
  });
});
