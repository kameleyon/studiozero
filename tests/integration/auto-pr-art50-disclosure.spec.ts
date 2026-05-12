/**
 * Studio Zero — Auto-PR body contains the Art. 50 disclosure verbatim.
 *
 * Phase 9 V1.5 Batch 1 (Forge). PRD §11.2: "AI-content disclosure in the
 * PR body per EU AI Act Art. 50 + C2PA-style provenance (Comply): every
 * commit message carries `AI-Authored: studio-zero/runner@v<x.y.z>`
 * trailer; PR body opens with the Art. 50 disclosure paragraph
 * (template owned by Comply + Herald)."
 *
 * V1.5 exit gate: "AI System Card v1.0 published at /system-card; Comply
 * sign-off; Art. 50 disclosure paragraph in every PR body (snapshot test)."
 *
 * V2.1 Batch 1 update (Forge — VF1 carry close): the disclosure text is now
 * the VERBATIM source from `legal/pr-body-template.md` §2 (Comply-locked).
 * The four substantive bindings called out there are:
 *
 *   1. "AI system (Studio Zero v<system_card_version>)" — system name + version
 *   2. "All code changes are AI-generated" — synthetic-content marking
 *   3. "pre-verified by Studio Zero's independent audit panel (Jury + 6
 *       reviewers) before this PR was opened" — internal QA gate
 *   4. "Customer review and approval is required before merge" — human oversight
 *
 * This spec verifies all four bindings + the SB 942 provenance trailer + the
 * System Card URL render verbatim. Any drift requires a Comply-signed PR.
 */
import { describe, it, expect } from "vitest";
import {
  ART50_DISCLOSURE,
  formatCommitMessage,
  formatPrBody,
} from "../../apps/runner/src/build/pr-opener.js";

/** The four locked-verbatim bindings from legal/pr-body-template.md §2. */
const LOCKED_ART50_BINDINGS = [
  // Binding 1 — names the AI system + version.
  "AI Act Art. 50 Disclosure:",
  "AI system (Studio Zero v<system_card_version>)",
  "on behalf of <tenant_name>",
  // Binding 2 — synthetic-content marking.
  "All code changes are AI-generated",
  // Binding 3 — internal QA gate disclosure.
  "pre-verified by Studio Zero's independent audit panel (Jury + 6 reviewers) before this PR was opened",
  // Binding 4 — human oversight gate.
  "Customer review and approval is required before merge",
  // System Card link cycle.
  "https://studiozero.dev/system-card",
];

describe("Art. 50 disclosure is locked verbatim text + present in every PR body", () => {
  it("ART50_DISCLOSURE contains every locked binding from legal/pr-body-template.md §2", () => {
    for (const binding of LOCKED_ART50_BINDINGS) {
      expect(ART50_DISCLOSURE).toContain(binding);
    }
  });

  it("ART50_DISCLOSURE additionally carries the SB 942 provenance trailer marker", () => {
    // The auto-PR-provenance paragraph is the §1-template envelope.
    // It carries the AI-Authored: + Refs: F-NNN trailer spec from §3.
    expect(ART50_DISCLOSURE).toContain("AI-Authored: studio-zero/runner@v<runner_version>");
    expect(ART50_DISCLOSURE).toContain("Refs: F-NNN");
    expect(ART50_DISCLOSURE).toContain("California SB 942");
  });

  it("PR body opens with the disclosure paragraph (verbatim, no rewrites)", () => {
    const body = formatPrBody({
      artifact: {
        run_id: "RUN1",
        tenant_id: "t1",
        fix_pr_job_id: "fp-1",
        patches: [
          {
            finding_id: "u1",
            finding_code: "F-001",
            file_path: "src/x.ts",
            unified_diff: "diff",
            lines_added: 1,
            lines_removed: 1,
            confidence: 0.9,
            produced_by: "halo-fixer",
          },
        ],
        files_changed: ["src/x.ts"],
        total_lines_added: 1,
        total_lines_removed: 1,
        generated_at: "2026-05-12T00:00:00Z",
      },
      project_name: "demo",
      original_verdict: "FAIL",
      reaudit_verdict: "PASS WITH FIXES",
      score_delta: 10,
      score_engine_version_snapshot: "v1",
      runner_version: "1.5.0",
    });
    // Snapshot guard: body must START with the disclosure paragraph.
    // No prefix, no preamble, no transparency-theater rewrites.
    expect(body.startsWith(ART50_DISCLOSURE)).toBe(true);
  });
});

describe("Every commit message carries Refs + AI-Authored trailers", () => {
  it("Refs + AI-Authored both present", () => {
    const msg = formatCommitMessage({
      finding_code: "F-013",
      file_path: "src/components/Foo.tsx",
      runner_version: "1.5.0",
    });
    expect(msg).toMatch(/^fix\(F-013\):/);
    // Trailers separated from subject by a blank line per git convention.
    expect(msg).toContain("\nRefs: F-013");
    expect(msg).toContain("\nAI-Authored: studio-zero/runner@v1.5.0");
  });
});
