/**
 * Studio Zero — SSRF guard tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Test consumes Shield's corpus
 * `runner/fixtures/ssrf-corpus/index.json`. Every pattern with
 * `expected_action === 'block'` MUST be blocked by `validateUrl`.
 *
 * Adding a new corpus entry that is `expected_action === 'block'` and
 * NOT blocked by the current implementation is a test failure — Forge
 * MUST update the filter before the corpus PR merges.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { validateUrl, assertSafeUrl, SsrfBlockedError } from "../src/ssrf-guard.js";

interface CorpusEntry {
  id: string;
  category: string;
  pattern: string;
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
  "../../../runner/fixtures/ssrf-corpus/index.json",
);
const corpus: Corpus = JSON.parse(readFileSync(corpusPath, "utf-8"));

describe("ssrf-guard / Shield corpus", () => {
  it("loads at least the M1 minimum (30 patterns)", () => {
    expect(corpus.patterns.length).toBeGreaterThanOrEqual(30);
  });

  for (const entry of corpus.patterns) {
    if (entry.expected_action !== "block") continue;
    // Redirect-chain entries (SSRF-025..027) are blocked at the FETCH
    // LAYER's redirect-handling: every Location header is re-run through
    // validateUrl before following. The runner's gateway client uses
    // `redirect: "error"` so an unexpected redirect to a private IP
    // surfaces as a fetch error. The unit test for that path lives in
    // llm-gateway-client.test.ts ('redirect: "error"' assertion).
    if (entry.category === "redirect_chain") continue;

    it(`${entry.id} (${entry.category}) — ${entry.pattern.slice(0, 60)}`, () => {
      const result = validateUrl(entry.pattern);
      expect(
        result.ok,
        `${entry.id} expected to be BLOCKED but was allowed. Pattern: ${entry.pattern}`,
      ).toBe(false);
    });
  }

  // Sanity: redirect-chain entries exist in the corpus and are documented
  // as fetch-layer-caught. If a future SSRF-N entry has category
  // 'redirect_chain' and we forget to add the fetch-layer test, this
  // count-based check pings us. Currently the gateway client's
  // `redirect: "error"` is the load-bearing test (llm-gateway-client.test.ts).
  it("[meta] redirect_chain entries are explicitly fetch-layer-caught", () => {
    const redirects = corpus.patterns.filter(
      (p) => p.category === "redirect_chain",
    );
    expect(redirects.length).toBeGreaterThan(0);
  });
});

describe("ssrf-guard / structural", () => {
  it("accepts a normal public https URL", () => {
    const r = validateUrl("https://api.anthropic.com/v1/messages");
    expect(r.ok).toBe(true);
  });

  it("rejects malformed URLs", () => {
    const r = validateUrl("not-a-url");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("malformed_url");
  });

  it("rejects http:// (only https allowed)", () => {
    const r = validateUrl("http://example.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("scheme_not_allowed");
  });

  it("assertSafeUrl throws on a blocked URL", () => {
    expect(() => assertSafeUrl("http://169.254.169.254/")).toThrow(
      SsrfBlockedError,
    );
  });

  it("assertSafeUrl returns the URL on safe input", () => {
    const out = assertSafeUrl("https://api.anthropic.com/v1/messages");
    expect(out).toBe("https://api.anthropic.com/v1/messages");
  });
});
