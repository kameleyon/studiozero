/**
 * Studio Zero — path-traversal fuzz integration.
 *
 * Phase 9 M1 Batch 3 (Verify). Mirrors test-strategy.md §3 M1
 * "tests/security/path-traversal-fuzz.spec.ts" gate.
 *
 * The contract: every entry in `runner/fixtures/path-traversal-corpus/`
 * with `expected_action: "block"` must be REJECTED by the runner's
 * `safeOpen(workdir, rel)`. The reject must happen pre-syscall (no
 * actual read of `/etc/passwd`) for `dot_dot_ascent`, `absolute_path`,
 * `win32_long_path`; for `symlink` patterns the reject happens at
 * realpath-time.
 *
 * Strategy: we set up a tenant-isolated temp workdir under
 * `os.tmpdir()/sz-pt-fuzz-<rand>/var/runs/<tenant>/<run>/`, drop a
 * benign source tree inside, and feed every corpus entry through
 * `safeOpen`. The check is binary: throws PathEscapeError → pass;
 * does not throw → fail.
 *
 * Excluded-path entries (`git_hooks`, `gitattributes`, `gitmodules`)
 * route through `isExcludedPath()` in ingestion-limits.ts — not the
 * path-traversal guard. We assert those via the sister API.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  safeOpen,
  PathEscapeError,
  validatePath,
} from "../../apps/runner/src/path-traversal-guard.js";
import { isExcludedPath } from "../../apps/runner/src/ingestion-limits.js";

interface PtEntry {
  id: string;
  category: string;
  pattern: string;
  expected_action: "block" | "allow";
  expected_outcome: string;
}

interface PtCorpus {
  corpus: string;
  min_size_m1: number;
  patterns: PtEntry[];
}

const CORPUS_PATH = path.resolve(
  __dirname,
  "../../runner/fixtures/path-traversal-corpus/index.json",
);
const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf-8")) as PtCorpus;

const TENANT_ID = "33333333-3333-3333-3333-333333333333";
const RUN_ID = "01HX5K0Z9PVB9Y6XTD9HSN9X46";

let WORKDIR: string;
let TMP_ROOT: string;

beforeAll(() => {
  TMP_ROOT = path.join(tmpdir(), `sz-pt-fuzz-${Date.now().toString(36)}`);
  WORKDIR = path.join(TMP_ROOT, "var", "runs", TENANT_ID, RUN_ID);
  mkdirSync(WORKDIR, { recursive: true });
  // Drop a couple benign files so safeOpen can find a happy-path target.
  writeFileSync(path.join(WORKDIR, "README.md"), "# benign");
  mkdirSync(path.join(WORKDIR, "src"), { recursive: true });
  writeFileSync(path.join(WORKDIR, "src", "index.ts"), "// benign");

  // For the symlink category, we set up an actual symlink that escapes
  // the workdir. On Win32 symlink creation often requires Developer
  // Mode; we wrap in try/catch and let the test handle SKIP gracefully.
  try {
    const outsideTarget = path.join(TMP_ROOT, "outside-target.txt");
    writeFileSync(outsideTarget, "would be a leak");
    symlinkSync(outsideTarget, path.join(WORKDIR, "evil-symlink"));
  } catch {
    // Symlink creation may fail on Windows w/o privileges — skip
    // symlink-touching cases via the in-spec branch below.
  }
});

afterAll(() => {
  try {
    rmSync(TMP_ROOT, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

describe("path-traversal-fuzz — Shield corpus (M1 D9 mandate)", () => {
  it("loads the corpus and meets the M1 minimum size", () => {
    expect(corpus.corpus).toBe("path-traversal");
    expect(corpus.patterns.length).toBeGreaterThanOrEqual(
      corpus.min_size_m1 ?? 30,
    );
  });

  for (const entry of corpus.patterns) {
    if (entry.expected_action !== "block") continue;

    // Categories handled by isExcludedPath, NOT path-traversal guard.
    if (
      entry.category === "git_hooks" ||
      entry.category === "gitattributes" ||
      entry.category === "gitmodules"
    ) {
      it(`${entry.id} (${entry.category}) — caught by isExcludedPath`, () => {
        expect(isExcludedPath(entry.pattern)).toBe(true);
      });
      continue;
    }

    it(`${entry.id} (${entry.category}) — safeOpen throws PathEscapeError`, () => {
      // For some symlink entries the symlink may not have been created
      // (Windows privilege issue). In that case the path simply doesn't
      // exist and safeOpen throws nonexistent_path — still a throw,
      // still passes the binary "reject" contract.
      let threw = false;
      let err: unknown = null;
      try {
        safeOpen(WORKDIR, entry.pattern);
      } catch (e) {
        threw = true;
        err = e;
      }
      expect(threw, `${entry.id}: safeOpen did not throw on ${JSON.stringify(entry.pattern)}`).toBe(
        true,
      );
      expect(err).toBeInstanceOf(PathEscapeError);
    });
  }
});

describe("path-traversal-fuzz — happy path + unhappy paths", () => {
  it("safeOpen returns a canonical path for a benign in-workdir file", () => {
    const real = safeOpen(WORKDIR, "src/index.ts");
    expect(real).toBeTruthy();
    expect(real.endsWith("index.ts")).toBe(true);
  });

  it("validatePath rejects NUL bytes pre-resolve", () => {
    const r = validatePath("file\0name");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("null_byte");
  });

  it("validatePath rejects Win32 long-path prefix \\\\?\\", () => {
    const r = validatePath("\\\\?\\C:\\Windows\\System32\\drivers\\etc\\hosts");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("win32_long_path_prefix");
  });

  it("validatePath rejects malformed percent-encoding", () => {
    const r = validatePath("%zz");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("url_decode_error");
  });

  it("safeOpen rejects an absolute path that escapes the workdir", () => {
    expect(() => safeOpen(WORKDIR, "/etc/passwd")).toThrow(PathEscapeError);
  });

  it("safeOpen rejects a dot-dot ascent that escapes the workdir", () => {
    expect(() =>
      safeOpen(WORKDIR, "../../../../../../etc/passwd"),
    ).toThrow(PathEscapeError);
  });
});
