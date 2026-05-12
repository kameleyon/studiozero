/**
 * Studio Zero — pairing-token storage tests.
 *
 * Phase 9 M3 Batch 1 (Forge). Asserts the locked invariants from
 * `ia/user-flows/cli-pairing-and-tamper.md` C5 + TB-7:
 *
 *   - The file lives at `<configDir>/auth.json`.
 *   - On POSIX, the file is `chmod 0600` after write.
 *   - readAuth returns null when the file doesn't exist OR is malformed.
 *   - clearAuth is idempotent (no error when nothing to delete).
 *   - isTokenExpired correctly handles ISO-8601 input + future/past.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { tmpdir, platform } from "node:os";
import {
  readAuth,
  writeAuth,
  clearAuth,
  isPaired,
  isTokenExpired,
  authFilePath,
  type AuthFile,
} from "../src/auth/pairing-token.js";

let dir: string;

function makeAuth(overrides: Partial<AuthFile> = {}): AuthFile {
  return {
    version: 1,
    apiUrl: "https://studio-zero.com",
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
  dir = mkdtempSync(path.join(tmpdir(), "studio-zero-cli-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("pairing-token / writeAuth", () => {
  it("writes the file at <dir>/auth.json", () => {
    const auth = makeAuth();
    writeAuth(dir, auth);
    expect(existsSync(authFilePath(dir))).toBe(true);
  });

  it("writes the file with 0600 perms (POSIX)", () => {
    if (platform() === "win32") return; // ACL handles perms on Windows
    writeAuth(dir, makeAuth());
    const mode = statSync(authFilePath(dir)).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("refuses to write a malformed auth row", () => {
    expect(() =>
      writeAuth(dir, { ...makeAuth(), binaryHash: "too short" } as AuthFile),
    ).toThrow(/refusing to write malformed/);
  });
});

describe("pairing-token / readAuth", () => {
  it("returns null when no file exists", () => {
    expect(readAuth(dir)).toBeNull();
  });

  it("round-trips a write+read", () => {
    const auth = makeAuth();
    writeAuth(dir, auth);
    const back = readAuth(dir);
    expect(back).not.toBeNull();
    expect(back?.userEmail).toBe(auth.userEmail);
    expect(back?.token).toBe(auth.token);
    expect(back?.binaryHash).toBe(auth.binaryHash);
  });

  it("returns null when the file is corrupt JSON", () => {
    writeFileSync(authFilePath(dir), "{this is not json");
    expect(readAuth(dir)).toBeNull();
  });

  it("returns null when the file is JSON but fails schema", () => {
    writeFileSync(authFilePath(dir), JSON.stringify({ version: 1 }));
    expect(readAuth(dir)).toBeNull();
  });
});

describe("pairing-token / clearAuth", () => {
  it("removes the file when present", () => {
    writeAuth(dir, makeAuth());
    expect(existsSync(authFilePath(dir))).toBe(true);
    clearAuth(dir);
    expect(existsSync(authFilePath(dir))).toBe(false);
  });

  it("is idempotent when no file exists", () => {
    expect(() => clearAuth(dir)).not.toThrow();
  });
});

describe("pairing-token / helpers", () => {
  it("isPaired tracks file presence", () => {
    expect(isPaired(dir)).toBe(false);
    writeAuth(dir, makeAuth());
    expect(isPaired(dir)).toBe(true);
  });

  it("isTokenExpired returns false for future expiry", () => {
    const auth = makeAuth({ tokenExpiresAt: "2099-01-01T00:00:00.000Z" });
    expect(isTokenExpired(auth, new Date("2026-05-12T00:00:00.000Z"))).toBe(
      false,
    );
  });

  it("isTokenExpired returns true for past expiry", () => {
    const auth = makeAuth({ tokenExpiresAt: "2020-01-01T00:00:00.000Z" });
    expect(isTokenExpired(auth, new Date("2026-05-12T00:00:00.000Z"))).toBe(
      true,
    );
  });

  it("isTokenExpired returns true for invalid ISO string", () => {
    const auth = makeAuth({ tokenExpiresAt: "not-a-date" });
    expect(isTokenExpired(auth)).toBe(true);
  });
});
