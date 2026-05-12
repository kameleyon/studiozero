/**
 * Studio Zero — SSRF egress integration.
 *
 * Phase 9 M1 Batch 3 (Verify). Mirrors test-strategy.md §3 M1
 * "tests/security/ssrf-egress.spec.ts" gate. The sister unit-tier test
 * in `apps/runner/tests/ssrf-guard.test.ts` exercises the guard from
 * the runner package; this integration-tier spec drives the SAME guard
 * from the root surface so the repo-wide `pnpm test` honors the gate.
 *
 * The contract:
 *   - every pattern in `runner/fixtures/ssrf-corpus/index.json` with
 *     `expected_action: "block"` must return `ok: false` from
 *     `validateUrl()`. ZERO allowed bypasses.
 *   - patterns with `expected_action: "allow"` (none today; allowance
 *     added at M2 for the Anthropic / GitHub allowlist test) must
 *     return `ok: true`.
 *   - `assertSafeUrl()` throws `SsrfBlockedError` for every blocked
 *     pattern — the throw-style API parity with the result-style API.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  validateUrl,
  assertSafeUrl,
  SsrfBlockedError,
} from "../../apps/runner/src/ssrf-guard.js";

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
  min_size_m1: number;
  patterns: CorpusEntry[];
}

const CORPUS_PATH = path.resolve(
  __dirname,
  "../../runner/fixtures/ssrf-corpus/index.json",
);
const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf-8")) as Corpus;

describe("ssrf-egress — Shield corpus (M1 D9 mandate)", () => {
  it("loads the corpus and meets the M1 minimum size", () => {
    expect(corpus.corpus).toBe("ssrf");
    expect(corpus.patterns.length).toBeGreaterThanOrEqual(
      corpus.min_size_m1 ?? 30,
    );
  });

  it("every M1 corpus entry has an expected_action and a non-empty pattern", () => {
    for (const e of corpus.patterns) {
      expect(e.id, "entry id").toBeTruthy();
      expect(e.pattern, `${e.id} pattern`).toBeTruthy();
      expect(["block", "allow"]).toContain(e.expected_action);
    }
  });

  // The exhaustive loop — every `block` pattern, every test.
  for (const entry of corpus.patterns) {
    if (entry.expected_action !== "block") continue;
    // Redirect-chain patterns are blocked at the fetch wrapper, not at
    // validateUrl. The unit-tier llm-gateway-client.test.ts asserts the
    // `redirect: "error"` path. Skip here to avoid a false-negative.
    if (entry.category === "redirect_chain") continue;

    it(`${entry.id} (${entry.category}) — validateUrl returns ok:false`, () => {
      const r = validateUrl(entry.pattern);
      expect(
        r.ok,
        `${entry.id} expected BLOCK but got ALLOW. Pattern: ${entry.pattern}`,
      ).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBeTruthy();
        expect(r.detail).toBeTruthy();
      }
    });

    it(`${entry.id} — assertSafeUrl throws SsrfBlockedError`, () => {
      expect(() => assertSafeUrl(entry.pattern)).toThrow(SsrfBlockedError);
    });
  }
});

describe("ssrf-egress — allowed hosts pass the filter (sanity)", () => {
  // These hosts are in the M1 Cilium egress allowlist (ARCH-D9):
  //   anthropic, github API, stripe, sentry, supabase.
  // The validateUrl filter operates on IP shape, not domain allowlist;
  // valid-shaped public hosts should pass. The deep allowlist check is
  // the Cilium NetworkPolicy at the platform layer + the fetch wrapper.
  const cases = [
    "https://api.anthropic.com/v1/messages",
    "https://api.github.com/repos/foo/bar",
    "https://api.stripe.com/v1/charges",
    "https://sentry.io/api/123/store/",
    "https://abcdef.supabase.co/rest/v1/runs",
  ];
  for (const url of cases) {
    it(`allows ${url}`, () => {
      const r = validateUrl(url);
      expect(r.ok, `expected allow for ${url} — got ${JSON.stringify(r)}`).toBe(
        true,
      );
    });
  }
});

describe("ssrf-egress — unhappy paths", () => {
  it("malformed URL is rejected with reason=malformed_url", () => {
    const r = validateUrl("not a url");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("malformed_url");
  });

  it("http:// scheme is rejected (https-only allowlist)", () => {
    const r = validateUrl("http://example.com/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("scheme_not_allowed");
  });

  it("file:// scheme is rejected", () => {
    const r = validateUrl("file:///etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("scheme_not_allowed");
  });
});
