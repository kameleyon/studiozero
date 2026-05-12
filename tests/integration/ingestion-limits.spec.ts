/**
 * Studio Zero — ingestion-limits integration.
 *
 * Phase 9 M1 Batch 3 (Verify). Mirrors test-strategy.md §3 M1
 * "tests/security/ingestion-limits.spec.ts" gate + PRD §17 D9.
 *
 * Contract under test:
 *   - file-size cap (2 MiB per file at M1)        — `file_size_exceeded`
 *   - max-files cap (20k per run at M1)            — `max_files_exceeded`
 *   - total-bytes cap (256 MiB per run at M1)      — `total_bytes_exceeded`
 *   - token budget cap (2M tokens at M1)           — `token_budget_exceeded`
 *   - excluded-path predicate covers `.git`, `node_modules`, `dist`,
 *     `build`, `.next`, `.venv`, `target`, `vendor`, `.env*` etc.
 *
 * We use a synthetic in-memory model of a repo (file list + sizes)
 * rather than producing 256MiB of bytes on disk. This is integration
 * tier (the runner code path is the same code that operates on real
 * disk reads — Verify's M1+1 synth-repo fixture exercises real disk).
 */
import { describe, it, expect } from "vitest";

import {
  canAdmitFile,
  canAdmitTokens,
  createUsage,
  isExcludedPath,
  INGESTION_DEFAULTS,
  EXCLUDED_PATH_SEGMENTS,
} from "../../apps/runner/src/ingestion-limits.js";

describe("ingestion-limits — per-file size cap", () => {
  it("admits a file under the 2 MiB cap", () => {
    const r = canAdmitFile("src/index.ts", 100_000, createUsage());
    expect(r.ok).toBe(true);
  });

  it("rejects a 10 MiB file with reason=file_size_exceeded", () => {
    const r = canAdmitFile("data.bin", 10 * 1024 * 1024, createUsage());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("file_size_exceeded");
  });

  it("rejects exactly at the boundary + 1 byte", () => {
    const r = canAdmitFile(
      "boundary.bin",
      INGESTION_DEFAULTS.maxBytesPerFile + 1,
      createUsage(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("file_size_exceeded");
  });

  it("admits exactly at the boundary", () => {
    const r = canAdmitFile(
      "boundary.bin",
      INGESTION_DEFAULTS.maxBytesPerFile,
      createUsage(),
    );
    expect(r.ok).toBe(true);
  });
});

describe("ingestion-limits — max-files cap", () => {
  it("rejects file #20001 with reason=max_files_exceeded (synthetic counter)", () => {
    const usage = {
      filesRead: INGESTION_DEFAULTS.maxFiles, // already at cap
      totalBytes: 1024,
      tokensUsed: 0,
    };
    const r = canAdmitFile("file20001.ts", 100, usage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("max_files_exceeded");
  });

  it("admits the 20,000th file exactly", () => {
    const usage = {
      filesRead: INGESTION_DEFAULTS.maxFiles - 1,
      totalBytes: 0,
      tokensUsed: 0,
    };
    const r = canAdmitFile("file20000.ts", 100, usage);
    expect(r.ok).toBe(true);
  });

  it("simulates 5000-file repo rejected when limit is configured at 1000", () => {
    // Demonstrates the "5000 files (rejected over cap)" line in the
    // milestone-M1 deliverable. We pass a custom limit set with a 1000
    // max to model a tightened policy on a small-tier customer.
    const customLimits = {
      ...INGESTION_DEFAULTS,
      maxFiles: 1000,
    };
    const usage = { filesRead: 1000, totalBytes: 0, tokensUsed: 0 };
    const r = canAdmitFile("file1001.ts", 100, usage, customLimits);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("max_files_exceeded");
  });
});

describe("ingestion-limits — total-bytes cap", () => {
  it("rejects the cumulative-byte ceiling", () => {
    const usage = {
      filesRead: 10,
      totalBytes: INGESTION_DEFAULTS.maxTotalBytes,
      tokensUsed: 0,
    };
    const r = canAdmitFile("file.ts", 1, usage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("total_bytes_exceeded");
  });
});

describe("ingestion-limits — excluded paths (D9 mandatory list)", () => {
  // Every entry in milestone-M1 D9 + the test brief "(.gitignore-listed
  // paths excluded; node_modules excluded; .git/hooks excluded)".
  const cases: Array<[string, boolean]> = [
    [".git/HEAD", true],
    [".git/hooks/post-checkout", true],
    [".git/config", true],
    [".gitattributes", true],
    [".gitmodules", true],
    ["node_modules/lodash/index.js", true],
    [".venv/lib/python3/site.py", true],
    ["__pycache__/foo.cpython-311.pyc", true],
    ["dist/main.js", true],
    ["build/output.dat", true],
    [".next/static/chunks/0.js", true],
    ["target/debug/main", true],
    ["vendor/jquery.js", true],
    [".cache/tsbuildinfo", true],
    [".env", true],
    [".env.local", true],
    [".env.production", true],
    ["src/index.ts", false],
    ["packages/app/src/main.ts", false],
    ["README.md", false],
    ["docs/architecture.md", false],
  ];
  for (const [p, expected] of cases) {
    it(`isExcludedPath("${p}") === ${expected}`, () => {
      expect(isExcludedPath(p)).toBe(expected);
    });
  }

  it("the excluded-segments list covers every M1 mandate entry", () => {
    const required = [
      ".git/",
      "node_modules/",
      ".venv/",
      "dist/",
      "build/",
      "target/",
    ];
    for (const r of required) {
      expect(EXCLUDED_PATH_SEGMENTS).toContain(r);
    }
  });

  it("nested node_modules deep in a workspace is also excluded", () => {
    expect(isExcludedPath("packages/app/node_modules/foo.js")).toBe(true);
  });

  it("Windows-style backslash paths are normalized before exclusion check", () => {
    expect(isExcludedPath("node_modules\\foo\\bar.js")).toBe(true);
    expect(isExcludedPath(".git\\hooks\\pre-commit")).toBe(true);
  });
});

describe("ingestion-limits — token-budget cap (interaction with maxTokenBudget)", () => {
  it("rejects when tokensUsed + req > maxTokenBudget", () => {
    const usage = {
      filesRead: 0,
      totalBytes: 0,
      tokensUsed: INGESTION_DEFAULTS.maxTokenBudget - 100,
    };
    const r = canAdmitTokens(200, usage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("token_budget_exceeded");
  });

  it("admits when tokensUsed + req == maxTokenBudget", () => {
    const usage = {
      filesRead: 0,
      totalBytes: 0,
      tokensUsed: INGESTION_DEFAULTS.maxTokenBudget - 200,
    };
    const r = canAdmitTokens(200, usage);
    expect(r.ok).toBe(true);
  });
});

describe("ingestion-limits — synthetic repo walk", () => {
  // Models the milestone-M1 line: "synthetic repo with: 10MB file
  // (rejected), 5000 files (rejected over cap), node_modules/ excluded,
  // .git/hooks/ excluded, normal source accepted".
  it("walks a 5-file repo and produces the expected admit/reject mix", () => {
    const usage = createUsage();
    const files: Array<{ path: string; bytes: number }> = [
      { path: "src/index.ts", bytes: 1024 }, // accept
      { path: "src/util.ts", bytes: 512 }, // accept
      { path: "node_modules/lodash/index.js", bytes: 50_000 }, // exclude
      { path: ".git/HEAD", bytes: 41 }, // exclude
      { path: "data.bin", bytes: 10 * 1024 * 1024 }, // reject — size
      { path: ".gitignore", bytes: 100 }, // accept (not in excluded list)
    ];
    const results = files.map((f) => ({
      path: f.path,
      result: canAdmitFile(f.path, f.bytes, usage),
    }));

    const ok = results.filter((r) => r.result.ok).map((r) => r.path);
    const excluded = results.filter(
      (r) => !r.result.ok && r.result.ok === false && r.result.reason === "excluded_path",
    );
    const sizeRejected = results.filter(
      (r) => !r.result.ok && r.result.ok === false && r.result.reason === "file_size_exceeded",
    );

    expect(ok).toContain("src/index.ts");
    expect(ok).toContain("src/util.ts");
    expect(ok).toContain(".gitignore");
    expect(excluded.length).toBe(2); // node_modules, .git/HEAD
    expect(sizeRejected.length).toBe(1); // data.bin
  });
});
