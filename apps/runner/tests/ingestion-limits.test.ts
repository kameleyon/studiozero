/**
 * Studio Zero — ingestion limits tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Pure unit tests for the
 * `canAdmitFile`, `canAdmitTokens`, and `isExcludedPath` helpers.
 * The git-hooks / gitattributes / gitmodules path-traversal corpus
 * entries assert exclusion via isExcludedPath here (this is what
 * keeps them out of read-time per Forge D9).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canAdmitFile,
  canAdmitTokens,
  createUsage,
  isExcludedPath,
  INGESTION_DEFAULTS,
} from "../src/ingestion-limits.js";

interface CorpusEntry {
  id: string;
  category: string;
  pattern: string;
  expected_action: "block" | "allow";
}

const corpusPath = path.resolve(
  __dirname,
  "../../../runner/fixtures/path-traversal-corpus/index.json",
);
const corpus = JSON.parse(readFileSync(corpusPath, "utf-8")) as {
  patterns: CorpusEntry[];
};

describe("ingestion-limits / isExcludedPath", () => {
  it("excludes .git/ paths", () => {
    expect(isExcludedPath(".git/hooks/post-checkout")).toBe(true);
    expect(isExcludedPath(".git/config")).toBe(true);
    expect(isExcludedPath(".git")).toBe(true);
  });

  it("excludes .gitattributes / .gitmodules", () => {
    expect(isExcludedPath(".gitattributes")).toBe(true);
    expect(isExcludedPath(".gitmodules")).toBe(true);
  });

  it("excludes node_modules at any depth", () => {
    expect(isExcludedPath("node_modules/foo/index.js")).toBe(true);
    expect(isExcludedPath("apps/web/node_modules/bar.ts")).toBe(true);
  });

  it("does not exclude regular source paths", () => {
    expect(isExcludedPath("src/components/Foo.tsx")).toBe(false);
    expect(isExcludedPath("README.md")).toBe(false);
  });

  it("[corpus] git-hooks / gitattributes / gitmodules entries are excluded", () => {
    const targetCats = new Set(["git_hooks", "gitattributes", "gitmodules"]);
    const expectedExcluded = corpus.patterns.filter((p) =>
      targetCats.has(p.category),
    );
    expect(expectedExcluded.length).toBeGreaterThan(0);
    for (const e of expectedExcluded) {
      expect(
        isExcludedPath(e.pattern),
        `${e.id} (${e.category}) — '${e.pattern}' should be excluded`,
      ).toBe(true);
    }
  });
});

describe("ingestion-limits / canAdmitFile", () => {
  it("admits a small file under fresh usage", () => {
    const r = canAdmitFile("src/foo.ts", 1000, createUsage());
    expect(r.ok).toBe(true);
  });

  it("rejects oversized single file", () => {
    const r = canAdmitFile(
      "src/big.bin",
      INGESTION_DEFAULTS.maxBytesPerFile + 1,
      createUsage(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("file_size_exceeded");
  });

  it("rejects excluded path", () => {
    const r = canAdmitFile(".git/config", 100, createUsage());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("excluded_path");
  });

  it("rejects when filesRead would exceed maxFiles", () => {
    const usage = { ...createUsage(), filesRead: INGESTION_DEFAULTS.maxFiles };
    const r = canAdmitFile("src/foo.ts", 100, usage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("max_files_exceeded");
  });

  it("rejects when totalBytes would exceed cap", () => {
    const usage = {
      ...createUsage(),
      totalBytes: INGESTION_DEFAULTS.maxTotalBytes,
    };
    const r = canAdmitFile("src/foo.ts", 1, usage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("total_bytes_exceeded");
  });
});

describe("ingestion-limits / canAdmitTokens", () => {
  it("admits a small token request under fresh usage", () => {
    const r = canAdmitTokens(1000, createUsage());
    expect(r.ok).toBe(true);
  });

  it("rejects when token budget would overflow", () => {
    const usage = {
      ...createUsage(),
      tokensUsed: INGESTION_DEFAULTS.maxTokenBudget,
    };
    const r = canAdmitTokens(1, usage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("token_budget_exceeded");
  });
});
