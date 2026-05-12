/**
 * Studio Zero — path-traversal guard tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Test consumes Shield's corpus
 * `runner/fixtures/path-traversal-corpus/index.json`. Every pattern with
 * `expected_action === 'block'` MUST be rejected by either
 * `validatePath` (pre-resolve) OR `safeOpen` (post-resolve).
 *
 * Symlink fixture entries (PT-016..019) require setup of an actual
 * symlink to verify the lstat-check; we materialize them in a tmpdir.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, mkdtempSync, mkdirSync, symlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  validatePath,
  safeOpen,
  PathEscapeError,
  isSymlinkEntry,
} from "../src/path-traversal-guard.js";

interface CorpusEntry {
  id: string;
  category: string;
  pattern: string;
  symlink_target?: string;
  content?: string;
  expected_action: "block" | "allow";
  expected_outcome: string;
  notes: string;
}

interface Corpus {
  corpus: string;
  version: string;
  patterns: CorpusEntry[];
}

const corpusPath = path.resolve(
  __dirname,
  "../../../runner/fixtures/path-traversal-corpus/index.json",
);
const corpus: Corpus = JSON.parse(readFileSync(corpusPath, "utf-8"));

describe("path-traversal-guard / Shield corpus pre-resolve", () => {
  it("loads at least the M1 minimum (30 patterns)", () => {
    expect(corpus.patterns.length).toBeGreaterThanOrEqual(30);
  });

  for (const entry of corpus.patterns) {
    if (entry.expected_action !== "block") continue;
    // Symlink entries are tested separately (require fs setup).
    if (entry.category === "symlink") continue;
    // Git-hooks / gitattributes / gitmodules entries are excluded via
    // ingestion-limits.ts (the runner never reads them); we assert that
    // exclusion in the dedicated test, not here.
    if (
      entry.category === "git_hooks" ||
      entry.category === "gitattributes" ||
      entry.category === "gitmodules"
    ) {
      continue;
    }

    it(`${entry.id} (${entry.category}) — ${entry.pattern.slice(0, 60)}`, () => {
      const v = validatePath(entry.pattern);
      // Some patterns (e.g. dot-dot ascent that doesn't include NUL or
      // bad encoding) pass validatePath but get caught by safeOpen.
      if (!v.ok) {
        // Pre-resolve catch — good.
        return;
      }
      // Pre-resolve passed → safeOpen must escape.
      const workdir = mkdtempSync(path.join(tmpdir(), "sz-pt-"));
      try {
        expect(() => safeOpen(workdir, entry.pattern)).toThrow(PathEscapeError);
      } finally {
        rmSync(workdir, { recursive: true, force: true });
      }
    });
  }
});

describe("path-traversal-guard / symlink corpus", () => {
  let workdir: string;
  let outsideFile: string;

  beforeAll(() => {
    workdir = mkdtempSync(path.join(tmpdir(), "sz-pt-symlink-"));
    // Place a file OUTSIDE the workdir; symlinks pointing at it must be rejected.
    outsideFile = path.join(tmpdir(), `sz-outside-${process.pid}.txt`);
    writeFileSync(outsideFile, "secret");
  });

  afterAll(() => {
    try { rmSync(workdir, { recursive: true, force: true }); } catch {}
    try { rmSync(outsideFile, { force: true }); } catch {}
  });

  it("isSymlinkEntry returns true for a real symlink", () => {
    const linkPath = path.join(workdir, "test-link");
    try {
      symlinkSync(outsideFile, linkPath);
    } catch (err) {
      // On Windows without dev-mode privilege, symlink syscall fails.
      // Skip the assertion in that case rather than failing the suite.
      if ((err as NodeJS.ErrnoException).code === "EPERM") return;
      throw err;
    }
    expect(isSymlinkEntry(linkPath)).toBe(true);
  });

  it("safeOpen on a symlink target escaping workdir throws PathEscapeError", () => {
    const linkPath = path.join(workdir, "evil-symlink");
    try {
      symlinkSync(outsideFile, linkPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EPERM") return;
      throw err;
    }
    expect(() => safeOpen(workdir, "evil-symlink")).toThrow(PathEscapeError);
  });
});

describe("path-traversal-guard / structural", () => {
  it("rejects NUL byte pre-resolve", () => {
    const r = validatePath("harmless.txt\0../../etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("null_byte");
  });

  it("rejects Win32 long-path prefix", () => {
    const r = validatePath("\\\\?\\C:\\windows\\system32\\hosts");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("win32_long_path_prefix");
  });

  it("safeOpen allows a path inside workdir", () => {
    const workdir = mkdtempSync(path.join(tmpdir(), "sz-pt-good-"));
    try {
      const inside = path.join(workdir, "good.txt");
      writeFileSync(inside, "ok");
      const resolved = safeOpen(workdir, "good.txt");
      expect(resolved.endsWith("good.txt")).toBe(true);
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });

  it("normalizes backslashes (Windows-style paths)", () => {
    const r = validatePath("src\\components\\foo.tsx");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toBe("src/components/foo.tsx");
  });

  it("rejects malformed URL-encoding", () => {
    const r = validatePath("file%E0name");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("url_decode_error");
  });
});
