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
 */
import { describe, it, expect } from "vitest";
import {
  ART50_DISCLOSURE,
  formatCommitMessage,
  formatPrBody,
} from "../../apps/runner/src/build/pr-opener.js";

describe("Art. 50 disclosure is locked text + present in every PR body", () => {
  it("ART50_DISCLOSURE contains required AI Act / SB 942 markers", () => {
    expect(ART50_DISCLOSURE).toContain("EU AI Act Article 50");
    expect(ART50_DISCLOSURE).toContain("California SB 942");
    expect(ART50_DISCLOSURE).toContain("AI-Authored");
    expect(ART50_DISCLOSURE).toContain("Refs: F-NNN");
    expect(ART50_DISCLOSURE).toContain(
      "https://studiozero.dev/system-card",
    );
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
