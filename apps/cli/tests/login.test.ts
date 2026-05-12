/**
 * Studio Zero — login command tests.
 *
 * Phase 9 M3 Batch 1 (Forge). Mocks the HTTP fetcher + the prompt so the
 * tests exercise:
 *
 *   - happy path: code is valid, server returns token, auth.json is
 *     written with the right shape.
 *   - rejection: malformed code (not 6 alnum) → no HTTP call.
 *   - expired code → C-FAIL `pairing_code_expired` copy.
 *   - version too old → C-FAIL `cli_version_too_old` copy.
 *   - binary hash unknown → C-FAIL `cli_binary_hash_unknown` copy.
 *   - network error → returns ok=false with retry-friendly copy.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loginCommand } from "../src/commands/login.js";
import { authFilePath, readAuth } from "../src/auth/pairing-token.js";

let dir: string;

function makeFetcher(
  responses: Array<{ status: number; body: Record<string, unknown> }>,
): typeof fetch {
  let i = 0;
  return (async (_url: string | URL | Request, _init?: RequestInit) => {
    const r = responses[i++];
    if (!r) throw new Error("[test] unexpected extra fetch call");
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "studio-zero-cli-login-test-"));
  process.env.STUDIOZERO_CONFIG_DIR = dir;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.STUDIOZERO_CONFIG_DIR;
});

describe("login / happy path", () => {
  it("pairs and writes auth.json", async () => {
    const fetcher = makeFetcher([
      {
        status: 200,
        body: {
          token: "t".repeat(48),
          deviceId: "dev-abc-123",
          userEmail: "alice@example.com",
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        },
      },
    ]);
    const res = await loginCommand({
      apiUrl: "https://studio-zero.test",
      code: "ABC123",
      fetcher,
    });
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/Paired with/);
    expect(existsSync(authFilePath(dir))).toBe(true);
    const auth = readAuth(dir);
    expect(auth?.userEmail).toBe("alice@example.com");
    expect(auth?.token).toBe("t".repeat(48));
    expect(auth?.deviceId).toBe("dev-abc-123");
    expect(auth?.deviceFingerprint.hostname).toBeDefined();
  });
});

describe("login / rejections", () => {
  it("rejects malformed pairing codes locally (no HTTP)", async () => {
    const res = await loginCommand({
      apiUrl: "https://studio-zero.test",
      code: "short",
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/doesn't look like a pairing code/);
    expect(existsSync(authFilePath(dir))).toBe(false);
  });

  it("returns expired-code copy on 410", async () => {
    const fetcher = makeFetcher([
      { status: 410, body: { code: "pairing_code_expired" } },
    ]);
    const res = await loginCommand({
      apiUrl: "https://studio-zero.test",
      code: "EXPIRE",
      fetcher,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/has expired/);
  });

  it("returns wrong-code copy on 404", async () => {
    const fetcher = makeFetcher([{ status: 404, body: {} }]);
    const res = await loginCommand({
      apiUrl: "https://studio-zero.test",
      code: "BADBAD",
      fetcher,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/didn't match/);
  });

  it("returns upgrade copy on 426", async () => {
    const fetcher = makeFetcher([{ status: 426, body: {} }]);
    const res = await loginCommand({
      apiUrl: "https://studio-zero.test",
      code: "OLDCLI",
      fetcher,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/older than what we support/);
  });

  it("returns unknown-binary copy on 409", async () => {
    const fetcher = makeFetcher([{ status: 409, body: {} }]);
    const res = await loginCommand({
      apiUrl: "https://studio-zero.test",
      code: "REBUIL",
      fetcher,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/don't recognize this CLI binary/);
  });

  it("returns retry-friendly copy on transport failure", async () => {
    const fetcher: typeof fetch = (async () => {
      throw new Error("ENOTFOUND");
    }) as unknown as typeof fetch;
    const res = await loginCommand({
      apiUrl: "https://studio-zero.test",
      code: "ABC123",
      fetcher,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/status 0/);
  });
});
