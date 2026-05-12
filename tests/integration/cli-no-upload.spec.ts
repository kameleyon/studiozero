/**
 * Studio Zero — CLI mode network-tap (PRD §13.4 privacy invariant).
 *
 * Phase 9 M3 — M3 Jury cross-cutting Critical #1 close.
 *
 *   "CLI mode customer code: never leaves the customer's machine." — PRD §13.4
 *
 * This spec is the load-bearing automated enforcement of that claim. It drives
 * the CLI's `studio-zero run` command against a synthetic fixture project
 * (`tests/integration/_fixtures/synthetic-repo/`) and intercepts every fetch
 * the run makes via an injected fetcher spy. Each captured request body is
 * inspected against four privacy heuristics derived from Cipher's redaction
 * primitives + the studio-client's `maxBodyBytes` runtime guard
 * (apps/cli/src/network/studio-client.ts §M3-privacy-invariant):
 *
 *   1.  Body size MUST be <= 64 KiB (the studio-client cap; defense in depth
 *       against any code path that accidentally tries to upload source).
 *   2.  Body MUST NOT contain any long ( > 200 char) string whose ratio of
 *       code-density characters ({} () ; = -> => :: etc.) exceeds 10% — that
 *       shape is Cipher's "looks like source" heuristic (Sentry redaction §6).
 *   3.  Body MUST NOT contain file:// URIs nor any absolute path that includes
 *       the synthetic fixture's project folder (path leak through evidence).
 *   4.  Content-Type MUST be application/json (not text/x-source, not
 *       application/x-tar — accidental tar/zip uploads).
 *   5.  Body MUST decode as either an AuditEvent-shaped JSON payload OR an
 *       empty JSON object (events route / verdict route shapes per
 *       architecture/schemas/audit-event.v1.ts).
 *   6.  Body MUST NOT contain any string from a canary list of source-content
 *       fingerprints planted in the fixture (SYNTHETIC_CANARY token).
 *
 * Implementation notes:
 *
 *   - We mock the local-runner so reviewers return a tiny deterministic
 *     verdict shape (Anthropic / Claude Code never called). The verdict's
 *     `findings[]` is empty so the upload body is the smallest possible
 *     metadata-only payload.
 *   - We mock the auth file via STUDIOZERO_CONFIG_DIR pointing at an OS temp
 *     dir we provision in beforeEach. Token has a far-future expiry.
 *   - We mock STUDIOZERO_MOCK_REVIEWERS=true (the CLI's M3 default) so the
 *     Claude Code subprocess is not required.
 *   - The fetcher spy records (url, method, headers, body) for every call.
 *   - Test runtime budget: < 5s. Achieved by skipping any real I/O.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { runCommand } from "../../apps/cli/src/commands/run";
import { AUDIT_EVENT_KINDS } from "../../architecture/schemas/audit-event.v1";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Bypass the Claude Code detection so the CLI runs without a real binary.
vi.mock("../../apps/cli/src/runner/claude-code-detect", () => ({
  detectClaudeCode: () => ({
    found: true,
    binPath: "/fake/claude-code",
    version: "0.0.0-test",
  }),
}));

// Force the local runner to return a deterministic verdict shape — never call
// Anthropic. The shape mirrors VerdictBody from verdict-sign.ts.
vi.mock("../../apps/cli/src/runner/local-runner", async () => {
  const watermark = await import(
    "../../apps/cli/src/watermark/private-run-self-audited"
  );
  return {
    runLocalAudit: async (opts: {
      runId: string;
      binaryHash: string;
    }) => {
      const verdict = {
        runId: opts.runId,
        verdict: "PASS",
        score: 100,
        scoreEngineVersion: "v1",
        audience: "unspecified",
        watermark: watermark.watermarkFor("cli"),
        findings: [],
        scoreBreakdown: {
          ux: 100,
          accessibility: 100,
          copy: 100,
          brand: 100,
          flow: 100,
          audience: 100,
        },
        sealedAt: new Date().toISOString(),
        claimedBinaryHash: opts.binaryHash,
      };
      return {
        verdict,
        // Deterministic 64-hex signature placeholder — real HMAC happens in
        // verdict-sign.ts unit tests. We assert privacy here, not signing.
        signature: "0".repeat(64),
        reviewerResults: [
          { reviewer: "optic", status: "complete", findings: [] },
          { reviewer: "halo", status: "complete", findings: [] },
          { reviewer: "proof", status: "complete", findings: [] },
        ],
      };
    },
    sha256Hex: (s: string) => s,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Fingerprint string planted in the fixture; MUST NOT appear in any body. */
const SYNTHETIC_SOURCE_CANARIES = [
  "SYNTHETIC_CANARY_d3adb33fc0ffee",
  "syntheticAdd",
];

const FIXTURE_PROJECT_PATH = path.resolve(
  __dirname,
  "_fixtures",
  "synthetic-repo",
);

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyText: string | null;
}

function makeFetcherSpy(): {
  fetcher: typeof fetch;
  captured: CapturedRequest[];
} {
  const captured: CapturedRequest[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    const method = init?.method ?? "GET";
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const k of Object.keys(h)) headers[k.toLowerCase()] = String(h[k]);
    }
    let bodyText: string | null = null;
    if (init?.body !== undefined && init?.body !== null) {
      bodyText =
        typeof init.body === "string"
          ? init.body
          : Buffer.from(init.body as ArrayBuffer).toString("utf-8");
    }
    captured.push({ url, method, headers, bodyText });
    // Respond with the upload-verdict / events shapes.
    const responseBody = JSON.stringify({
      watermarkApplied: true,
      signatureStatus: "verified",
      accepted: true,
    });
    return new Response(responseBody, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetcher, captured };
}

// ---------------------------------------------------------------------------
// Heuristics for "looks like source code"
// ---------------------------------------------------------------------------

/**
 * Cipher's "code density" heuristic — proportion of characters that are
 * typical code punctuation. Source has ~10–25%, prose has ~0–5%, JSON keys
 * land around 5–10% but the strings inside are short. We trip on long
 * strings with > 10% density.
 */
function isCodeDense(s: string): boolean {
  if (s.length <= 200) return false;
  // Characters strongly associated with source code: braces, parens, semis,
  // arrows, scope ops. We exclude the colon + comma because JSON itself is
  // colon+comma-heavy and would trigger false positives.
  const codeChars = s.match(/[{}();=]|->|=>|::/g);
  const density = (codeChars?.length ?? 0) / s.length;
  return density > 0.1;
}

const SUSPECT_CONTENT_TYPES = [
  "text/x-source",
  "application/x-tar",
  "application/zip",
  "application/octet-stream",
  "application/x-gzip",
];

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let tmpConfigDir: string;
const ORIG_ENV = { ...process.env };

beforeEach(() => {
  tmpConfigDir = mkdtempSync(path.join(tmpdir(), "studio-zero-cli-test-"));
  // Provision a valid auth.json so readAuth() succeeds.
  mkdirSync(tmpConfigDir, { recursive: true });
  const authFile = {
    version: 1,
    apiUrl: "https://studio-zero.test",
    userEmail: "alice@example.com",
    deviceId: "00000000-0000-0000-0000-000000000000",
    deviceFingerprint: {
      hostname: "test-host",
      os: "test-os",
      arch: "x64",
    },
    token: "test-token-aaaaaaaaaaaaaaaaaaaa",
    tokenExpiresAt: new Date(Date.now() + 86400_000).toISOString(),
    pairedAt: new Date().toISOString(),
    cliVersion: "0.1.0-m3",
    binaryHash: "a".repeat(64),
  };
  writeFileSync(
    path.join(tmpConfigDir, "auth.json"),
    JSON.stringify(authFile),
    { encoding: "utf-8" },
  );
  process.env.STUDIOZERO_CONFIG_DIR = tmpConfigDir;
  process.env.STUDIOZERO_API_URL = "https://studio-zero.test";
  process.env.STUDIOZERO_MOCK_REVIEWERS = "true";
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  if (tmpConfigDir) {
    rmSync(tmpConfigDir, { recursive: true, force: true });
  }
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

describe("CLI run network-tap — PRD §13.4 privacy invariant (M3 Jury Critical #1)", () => {
  it("emits ONLY metadata-shaped JSON bodies (no source bytes ever leave the machine)", async () => {
    const { fetcher, captured } = makeFetcherSpy();
    const start = Date.now();

    const res = await runCommand({
      projectPath: FIXTURE_PROJECT_PATH,
      depth: "quick",
      fetcher,
    });

    expect(res.ok).toBe(true);
    expect(res.runId).toBeTruthy();
    expect(res.verdict).toBe("PASS");

    // Network was actually exercised — we want at least one POST captured to
    // make this test load-bearing. If the run made zero requests the spy is
    // not catching anything.
    expect(captured.length).toBeGreaterThan(0);

    for (const req of captured) {
      // (4) Method + Content-Type assertions.
      const ct = req.headers["content-type"] ?? "";
      for (const bad of SUSPECT_CONTENT_TYPES) {
        expect(ct).not.toContain(bad);
      }
      // POSTs carry application/json; if no body, no content-type required.
      if (req.bodyText !== null && req.bodyText.length > 0) {
        expect(ct).toContain("application/json");
      }

      // (1) Body size guard — must be under the studio-client's 64 KiB cap.
      const byteLen = Buffer.byteLength(req.bodyText ?? "", "utf-8");
      expect(byteLen).toBeLessThanOrEqual(64 * 1024);

      // Empty body is acceptable (e.g., long-poll GETs).
      if (req.bodyText === null || req.bodyText.length === 0) continue;

      // (5) Body must be valid JSON.
      let parsed: unknown;
      try {
        parsed = JSON.parse(req.bodyText);
      } catch (err) {
        throw new Error(
          `CLI POSTed a non-JSON body to ${req.url}: ${(err as Error).message}\n` +
            `Body preview: ${req.bodyText.slice(0, 200)}`,
        );
      }
      expect(typeof parsed).toBe("object");
      expect(parsed).not.toBeNull();

      // (3) No file:// URIs anywhere in the body.
      expect(req.bodyText).not.toContain("file://");

      // (3) No absolute fixture-folder path leak (would indicate evidence
      // shapes that carry customer-folder paths).
      const fixtureAbs = FIXTURE_PROJECT_PATH;
      expect(req.bodyText).not.toContain(fixtureAbs);

      // (6) No canary source strings.
      for (const canary of SYNTHETIC_SOURCE_CANARIES) {
        expect(req.bodyText).not.toContain(canary);
      }

      // (2) No long code-dense strings inside the JSON. We walk the parsed
      // tree and check every string value.
      const longCodeStrings: string[] = [];
      const walk = (node: unknown): void => {
        if (node === null || node === undefined) return;
        if (typeof node === "string") {
          if (isCodeDense(node)) longCodeStrings.push(node.slice(0, 80));
          return;
        }
        if (Array.isArray(node)) {
          for (const x of node) walk(x);
          return;
        }
        if (typeof node === "object") {
          for (const v of Object.values(node as Record<string, unknown>)) {
            walk(v);
          }
        }
      };
      walk(parsed);
      if (longCodeStrings.length > 0) {
        throw new Error(
          `CLI body contained ${longCodeStrings.length} long code-dense strings — ` +
            `PRD §13.4 violation. First: ${longCodeStrings[0]}`,
        );
      }

      // Body shape must be one of:
      //   - an AuditEvent (has `kind` in the union)
      //   - a verdict-upload shape (has `verdict` + `signature` + `claimedBinaryHash`)
      // Anything else is a contract drift.
      const p = parsed as Record<string, unknown>;
      const isAuditEventShape =
        typeof p.kind === "string" &&
        (AUDIT_EVENT_KINDS as ReadonlyArray<string>).concat([
          "verdict_pending",
        ]).includes(p.kind);
      const isVerdictUploadShape =
        typeof p.verdict === "object" &&
        typeof p.signature === "string" &&
        typeof p.claimedBinaryHash === "string";
      if (!isAuditEventShape && !isVerdictUploadShape) {
        throw new Error(
          `Unexpected upload body shape at ${req.url}: keys=${Object.keys(p).join(",")}`,
        );
      }
    }

    // Performance budget — keep this test snappy (M3 brief: <5s).
    expect(Date.now() - start).toBeLessThan(5000);
  });

  it("verdict upload body contains the signed metadata only — no findings array bytes from source", async () => {
    const { fetcher, captured } = makeFetcherSpy();

    await runCommand({
      projectPath: FIXTURE_PROJECT_PATH,
      depth: "quick",
      fetcher,
    });

    const verdictPosts = captured.filter(
      (r) => r.method === "POST" && /\/api\/cli\/runs\/[^/]+\/verdict$/.test(r.url),
    );
    expect(verdictPosts.length).toBe(1);

    const body = JSON.parse(verdictPosts[0]!.bodyText ?? "{}") as {
      verdict: { findings: unknown[]; runId: string };
      signature: string;
      claimedBinaryHash: string;
    };

    // Findings array is exactly the mocked shape — empty in this test.
    expect(Array.isArray(body.verdict.findings)).toBe(true);
    expect(body.verdict.findings.length).toBe(0);
    expect(body.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(body.claimedBinaryHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects (refuses-to-send) a runtime regression that would upload an oversized body", async () => {
    // Sanity check on the studio-client guard itself. We do this by
    // directly invoking the request function with an oversized body; the
    // CLI's command surface would never produce one, but if something
    // downstream regresses, the guard MUST throw before the wire.
    const { request } = await import(
      "../../apps/cli/src/network/studio-client"
    );
    const huge = "x".repeat(70 * 1024); // 70 KiB > 64 KiB cap
    await expect(
      request({
        apiUrl: "https://studio-zero.test",
        method: "POST",
        path: "/api/cli/runs/test/events",
        body: { junk: huge },
        fetcher: makeFetcherSpy().fetcher,
      }),
    ).rejects.toThrow(/privacy invariant/i);
  });
});
