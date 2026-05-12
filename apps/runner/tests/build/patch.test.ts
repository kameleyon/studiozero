/**
 * Studio Zero — patch.ts (build-agent patch validator) tests.
 *
 * Phase 9 V1.5 Batch 1 (Forge). validatePatch() is a security boundary —
 * any out-of-scope path or multi-file diff MUST be rejected before the
 * patch reaches the re-audit gate.
 */
import { describe, it, expect } from "vitest";
import { buildUnifiedDiff, validatePatch } from "../../src/build/patch.js";

describe("buildUnifiedDiff", () => {
  it("emits a minimal hunk for a single-line replacement", () => {
    const original = "line one\nline two\nline three\n";
    const out = buildUnifiedDiff({
      file_path: "src/foo.ts",
      original_contents: original,
      line_start: 2,
      line_end: 2,
      replacement_block: "LINE TWO REPLACED",
    });
    expect(out.unified_diff).toContain("--- a/src/foo.ts");
    expect(out.unified_diff).toContain("+++ b/src/foo.ts");
    expect(out.unified_diff).toContain("-line two");
    expect(out.unified_diff).toContain("+LINE TWO REPLACED");
    expect(out.lines_added).toBe(1);
    expect(out.lines_removed).toBe(1);
  });
});

describe("validatePatch", () => {
  const FILE = "src/components/SignupForm.tsx";

  function makePatch(replacement = "      <label htmlFor=\"email\">Email</label>") {
    return buildUnifiedDiff({
      file_path: FILE,
      original_contents:
        Array.from({ length: 50 }, (_, i) => `line${i + 1}`).join("\n") + "\n",
      line_start: 42,
      line_end: 42,
      replacement_block: replacement,
    }).unified_diff;
  }

  it("accepts a valid patch that targets the finding range", () => {
    const v = validatePatch({
      unified_diff: makePatch(),
      expected_file_path: FILE,
      expected_line_start: 42,
      expected_line_end: 42,
    });
    expect(v.ok).toBe(true);
  });

  it("rejects a patch whose file path differs from the finding", () => {
    const v = validatePatch({
      unified_diff: makePatch(),
      expected_file_path: "src/components/OtherFile.tsx",
      expected_line_start: 42,
      expected_line_end: 42,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toContain("out_of_scope_path");
  });

  it("rejects multi-file diffs", () => {
    const single = makePatch();
    const multi = single + "\n--- a/other.ts\n+++ b/other.ts\n@@ -1,1 +1,1 @@\n-old\n+new\n";
    const v = validatePatch({
      unified_diff: multi,
      expected_file_path: FILE,
      expected_line_start: 42,
      expected_line_end: 42,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("multiple_files_in_diff");
  });

  it("rejects empty diffs", () => {
    const v = validatePatch({
      unified_diff: "",
      expected_file_path: FILE,
      expected_line_start: 42,
      expected_line_end: 42,
    });
    expect(v.ok).toBe(false);
  });

  it("rejects CRLF in diff", () => {
    const v = validatePatch({
      unified_diff: makePatch().replace(/\n/g, "\r\n"),
      expected_file_path: FILE,
      expected_line_start: 42,
      expected_line_end: 42,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("crlf_in_diff");
  });

  it("rejects hunks outside the finding line range", () => {
    const v = validatePatch({
      unified_diff: makePatch(),
      expected_file_path: FILE,
      expected_line_start: 100,
      expected_line_end: 110,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toContain("hunk_outside_finding_range");
  });
});
