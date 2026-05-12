/**
 * Studio Zero — `studio-zero run` command tests.
 *
 * Phase 9 M3 Batch 1 (Forge). End-to-end test of the run pipeline with
 * mocked reviewers + mocked HTTP. Asserts:
 *
 *   - Unpaired users get a clear sign-in copy (no audit attempted).
 *   - Expired tokens are surfaced before the audit runs.
 *   - With mock reviewers ON, the run completes + produces a verdict +
 *     signs it correctly + tries to upload it.
 *   - --skip-upload short-circuits the network step (used by tests +
 *     dry-run).
 *   - The watermark text is in the printed output (locked Herald copy).
 *   - The privacy invariant: studio-client refuses to send a body
 *     bigger than the maxBodyBytes cap. We assert by injecting a fetcher
 *     that captures the request body and checks no source-code-looking
 *     content is present.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCommand } from "../src/commands/run.js";
import { writeAuth, type AuthFile } from "../src/auth/pairing-token.js";
import {
  WATERMARK_BADGE,
  WATERMARK_HELP,
} from "../src/watermark/private-run-self-audited.js";

let configDir: string;
let projectDir: string;

function makeAuth(overrides: Partial<AuthFile> = {}): AuthFile {
  return {
    version: 1,
    apiUrl: "https://studio-zero.test",
    userEmail: "alice@example.com",
    deviceId: "11111111-1111-1111-1111-111111111111",
    deviceFingerprint: { hostname: "alice-laptop", os: "darwin 24.0.0", arch: "arm64" },
    token: "x".repeat(40),
    tokenExpiresAt: "2099-01-01T00:00:00.000Z",
    pairedAt: "2026-05-12T00:00:00.000Z",
    cliVersion: "0.1.0-m3",
    binaryHash: "a".repeat(64),
    ...overrides,
  };
}

beforeEach(() => {
  configDir = mkdtempSync(path.join(tmpdir(), "sz-cli-run-cfg-"));
  projectDir = mkdtempSync(path.join(tmpdir(), "sz-cli-run-proj-"));
  // Plant a few files so the project looks plausible.
  mkdirSync(path.join(projectDir, "src"));
  writeFileSync(path.join(projectDir, "src", "index.ts"), "export {};\n");
  writeFileSync(path.join(projectDir, "package.json"), '{"name":"x"}\n');
  process.env.STUDIOZERO_CONFIG_DIR = configDir;
  process.env.STUDIOZERO_API_URL = "https://studio-zero.test";
  process.env.STUDIOZERO_MOCK_REVIEWERS = "true";
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
  rmSync(projectDir, { recursive: true, force: true });
  delete process.env.STUDIOZERO_CONFIG_DIR;
  delete process.env.STUDIOZERO_API_URL;
  delete process.env.STUDIOZERO_MOCK_REVIEWERS;
});

describe("run / preconditions", () => {
  it("refuses to run when not paired", async () => {
    const res = await runCommand({ projectPath: projectDir });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/Not signed in/);
  });

  it("refuses to run when the token is expired", async () => {
    writeAuth(
      configDir,
      makeAuth({ tokenExpiresAt: "2020-01-01T00:00:00.000Z" }),
    );
    const res = await runCommand({ projectPath: projectDir });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/has expired/);
  });

  it("refuses to run when the project path doesn't exist", async () => {
    writeAuth(configDir, makeAuth());
    const res = await runCommand({
      projectPath: path.join(projectDir, "does-not-exist"),
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/We can't find that folder/);
  });
});

describe("run / dry-run (skipUpload)", () => {
  it("produces a verdict + signature locally with mock reviewers ON", async () => {
    writeAuth(configDir, makeAuth());
    const res = await runCommand({
      projectPath: projectDir,
      depth: "quick",
      skipUpload: true,
    });
    expect(res.ok).toBe(true);
    expect(res.verdict).toMatch(/^(PASS|PASS WITH FIXES|FAIL)$/);
    expect(res.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(res.signatureStatus).toBe("skipped");
    expect(res.message).toMatch(WATERMARK_BADGE);
    expect(res.message).toMatch(WATERMARK_HELP);
  });
});

describe("run / upload happy path", () => {
  it("POSTs the verdict and surfaces the server's signatureStatus", async () => {
    writeAuth(configDir, makeAuth());
    const capturedBodies: string[] = [];
    const fetcher: typeof fetch = (async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const body = typeof init?.body === "string" ? init.body : "";
      capturedBodies.push(body);
      return new Response(
        JSON.stringify({ watermarkApplied: true, signatureStatus: "verified" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const res = await runCommand({ projectPath: projectDir, fetcher });
    expect(res.ok).toBe(true);
    expect(res.signatureStatus).toBe("verified");

    // PRIVACY INVARIANT: no body bytes should contain the source we
    // planted in the project dir. We seeded `export {};` — if it
    // appears in any uploaded payload, the test fails.
    for (const b of capturedBodies) {
      expect(b).not.toContain("export {}");
    }
  });
});

describe("run / privacy invariant", () => {
  it("never includes source bytes in event POST", async () => {
    writeAuth(configDir, makeAuth());
    const captured: string[] = [];
    const fetcher: typeof fetch = (async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const body = typeof init?.body === "string" ? init.body : "";
      captured.push(body);
      return new Response(
        JSON.stringify({ watermarkApplied: true, signatureStatus: "verified" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    await runCommand({ projectPath: projectDir, fetcher });
    // Every uploaded body must be ≤ the studio-client's body cap.
    for (const b of captured) {
      expect(Buffer.byteLength(b, "utf-8")).toBeLessThan(64 * 1024);
    }
    // None of the planted source files' contents are ever in a body.
    for (const b of captured) {
      expect(b).not.toContain("export {}");
      expect(b).not.toContain('"name":"x"');
    }
  });
});
