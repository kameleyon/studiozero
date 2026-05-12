/**
 * Studio Zero — patch construction + validation helpers.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Pure utilities. No I/O, no LLM calls.
 *
 * Why custom code rather than `diff` or `parse-diff` from npm:
 *   - The runner package has a security/lockfile-minimalism rule (Cipher
 *     v0.5): every new dependency requires a Cipher review. We control
 *     the unified-diff surface ourselves to keep the dep graph tight.
 *   - The validator is a security boundary (rejects out-of-scope patches
 *     that touch files outside `finding.file_path`). Writing it locally
 *     keeps the audit trail short and readable.
 *
 * Two responsibilities:
 *   1. `buildUnifiedDiff()` — turn (original, replacement, file_path,
 *      line_start, line_end) into a minimal unified-diff hunk string.
 *   2. `validatePatch()` — assert that a diff (a) parses cleanly, (b)
 *      touches exactly one file matching the expected `file_path`, and
 *      (c) the line range overlaps the finding's `line_start..line_end`.
 *      Rejects everything else.
 */

export interface ValidatedPatch {
  file_path: string;
  hunks: Array<{
    old_start: number;
    old_lines: number;
    new_start: number;
    new_lines: number;
  }>;
  lines_added: number;
  lines_removed: number;
}

/** Build a single-hunk unified diff from a known line replacement.
 *
 *  We assume the fixer has the entire original file contents in memory.
 *  We emit a hunk that covers `line_start..line_end` (1-indexed inclusive)
 *  with the replacement block of lines. No surrounding context is
 *  emitted — patches are tiny and tightly scoped per Cipher Fix-2's
 *  "minimal change" review heuristic. */
export function buildUnifiedDiff(args: {
  file_path: string;
  original_contents: string;
  line_start: number;
  line_end: number;
  replacement_block: string;
}): { unified_diff: string; lines_added: number; lines_removed: number } {
  const originalLines = args.original_contents.split("\n");
  // 1-indexed inclusive bounds; clamp.
  const startIdx = Math.max(0, args.line_start - 1);
  const endIdx = Math.min(originalLines.length, args.line_end);

  const removedBlock = originalLines.slice(startIdx, endIdx);
  const replacementLines = args.replacement_block.split("\n");

  // Strip a trailing empty line if the replacement ends with '\n'.
  if (
    replacementLines.length > 0 &&
    replacementLines[replacementLines.length - 1] === ""
  ) {
    replacementLines.pop();
  }

  const oldLines = removedBlock.length;
  const newLines = replacementLines.length;

  const hunkHeader = `@@ -${args.line_start},${oldLines} +${args.line_start},${newLines} @@`;
  const body = [
    `--- a/${args.file_path}`,
    `+++ b/${args.file_path}`,
    hunkHeader,
    ...removedBlock.map((l) => `-${l}`),
    ...replacementLines.map((l) => `+${l}`),
    "", // trailing newline
  ].join("\n");

  return {
    unified_diff: body,
    lines_added: newLines,
    lines_removed: oldLines,
  };
}

/** Parse + validate a unified diff. Rejects multi-file patches and any
 *  patch whose target path doesn't match the expected file path. */
export function validatePatch(args: {
  unified_diff: string;
  expected_file_path: string;
  expected_line_start: number;
  expected_line_end: number;
}): { ok: true; patch: ValidatedPatch } | { ok: false; reason: string } {
  const diff = args.unified_diff;
  if (typeof diff !== "string" || diff.length === 0) {
    return { ok: false, reason: "empty_diff" };
  }
  // Reject CRLF — agents must emit LF-only.
  if (diff.includes("\r")) {
    return { ok: false, reason: "crlf_in_diff" };
  }

  const lines = diff.split("\n");
  let i = 0;

  // Expect exactly one `--- a/<path>` then `+++ b/<path>` header pair.
  let oldHeaderIdx = -1;
  let newHeaderIdx = -1;
  for (; i < lines.length; i++) {
    const ln = lines[i] ?? "";
    if (ln.startsWith("--- a/")) {
      if (oldHeaderIdx !== -1) {
        return { ok: false, reason: "multiple_files_in_diff" };
      }
      oldHeaderIdx = i;
    } else if (ln.startsWith("+++ b/")) {
      if (newHeaderIdx !== -1) {
        return { ok: false, reason: "multiple_files_in_diff" };
      }
      newHeaderIdx = i;
    }
    if (oldHeaderIdx !== -1 && newHeaderIdx !== -1) {
      i++;
      break;
    }
  }
  if (oldHeaderIdx === -1 || newHeaderIdx === -1) {
    return { ok: false, reason: "missing_file_headers" };
  }

  const oldPath = (lines[oldHeaderIdx] ?? "").slice("--- a/".length);
  const newPath = (lines[newHeaderIdx] ?? "").slice("+++ b/".length);
  if (oldPath !== newPath) {
    return { ok: false, reason: "path_mismatch_in_headers" };
  }
  if (oldPath !== args.expected_file_path) {
    return {
      ok: false,
      reason: `out_of_scope_path:${oldPath}!=${args.expected_file_path}`,
    };
  }

  // Parse hunks: `@@ -old_start,old_lines +new_start,new_lines @@`.
  const hunks: ValidatedPatch["hunks"] = [];
  let lines_added = 0;
  let lines_removed = 0;

  for (; i < lines.length; i++) {
    const ln = lines[i] ?? "";
    if (ln === "") continue;
    if (ln.startsWith("@@")) {
      const m = ln.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (!m) {
        return { ok: false, reason: "malformed_hunk_header" };
      }
      hunks.push({
        old_start: Number(m[1]),
        old_lines: m[2] !== undefined ? Number(m[2]) : 1,
        new_start: Number(m[3]),
        new_lines: m[4] !== undefined ? Number(m[4]) : 1,
      });
    } else if (ln.startsWith("--- a/") || ln.startsWith("+++ b/")) {
      // A second file-header pair inside the body is a multi-file diff;
      // reject explicitly so the caller sees the right reason. (This is
      // a security-boundary path — out-of-scope file edits MUST be
      // identified by this exact reason code so audit logs are
      // consistent.)
      return { ok: false, reason: "multiple_files_in_diff" };
    } else if (ln.startsWith("+") && !ln.startsWith("+++")) {
      lines_added++;
    } else if (ln.startsWith("-") && !ln.startsWith("---")) {
      lines_removed++;
    } else if (ln.startsWith(" ") || ln.startsWith("\\")) {
      // Context line ("\ No newline at end of file") — OK.
    } else {
      // Anything else (untyped chars at top level) — reject as malformed
      // body. The only legal leading chars in hunk body are ' ', '+', '-',
      // '\\'. Lines like 'Binary files differ' are not allowed.
      return { ok: false, reason: "unexpected_diff_body_line" };
    }
  }

  if (hunks.length === 0) {
    return { ok: false, reason: "no_hunks" };
  }

  // Verify the patched range overlaps the finding's line range.
  const finStart = args.expected_line_start;
  const finEnd = args.expected_line_end;
  const inRange = hunks.some((h) => {
    const hStart = h.old_start;
    const hEnd = h.old_start + Math.max(h.old_lines, 1) - 1;
    return hEnd >= finStart && hStart <= finEnd;
  });
  if (!inRange) {
    return {
      ok: false,
      reason: `hunk_outside_finding_range:${finStart}-${finEnd}`,
    };
  }

  return {
    ok: true,
    patch: {
      file_path: oldPath,
      hunks,
      lines_added,
      lines_removed,
    },
  };
}
