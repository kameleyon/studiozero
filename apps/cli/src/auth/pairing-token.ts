/**
 * Studio Zero — pairing-token local storage.
 *
 * Phase 9 M3 Batch 1 (Forge). Persists the device's pairing token to
 * `~/.studio-zero/auth.json`. The file is `chmod 0600` (owner read/write
 * only) per TB-7 and `ia/user-flows/cli-pairing-and-tamper.md` C5.
 *
 * The token itself is OPAQUE — no embedded JWT claims, server-side
 * lookup only. Per-device-fingerprint binding lives server-side
 * (`cli_pairings` row); we just store what the server returned at C5 +
 * the device fingerprint we sent up so the user can see `studio-zero
 * status` without a network round-trip.
 *
 * File shape:
 *
 *   {
 *     "version": 1,
 *     "apiUrl":            "https://studio-zero.com",
 *     "userEmail":         "alice@example.com",
 *     "deviceId":          "uuid-from-server",
 *     "deviceFingerprint": { "hostname": "...", "os": "...", "arch": "..." },
 *     "token":             "<opaque>",
 *     "tokenExpiresAt":    "2026-08-08T12:00:00Z",
 *     "pairedAt":          "2026-05-10T12:00:00Z",
 *     "cliVersion":        "0.1.0-m3",
 *     "binaryHash":        "<sha256-of-self>"
 *   }
 *
 * Why the binaryHash is stored: C7 of the flow signs each verdict with
 * `HMAC-SHA256(verdict_bytes, key=binary_hash)`. We resolve the hash
 * once at pair time + cache it; if the binary changes (user upgrades
 * the CLI), `studio-zero status` will detect the mismatch and prompt a
 * re-pair (C-FAIL `cli_binary_hash_unknown`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const AUTH_FILE_NAME = "auth.json";

/** Schema for the on-disk auth file. */
const AuthFileSchema = z.object({
  version: z.literal(1),
  apiUrl: z.string().url(),
  userEmail: z.string().email(),
  deviceId: z.string().min(1),
  deviceFingerprint: z.object({
    hostname: z.string(),
    os: z.string(),
    arch: z.string(),
  }),
  token: z.string().min(20),
  tokenExpiresAt: z.string(),
  pairedAt: z.string(),
  cliVersion: z.string(),
  binaryHash: z.string().length(64), // sha256 hex
});

export type AuthFile = z.infer<typeof AuthFileSchema>;

/** Return the absolute path to `~/.studio-zero/auth.json`. */
export function authFilePath(configDir: string): string {
  return path.join(configDir, AUTH_FILE_NAME);
}

/** Read + parse the auth file. Returns null if missing or invalid. */
export function readAuth(configDir: string): AuthFile | null {
  const p = authFilePath(configDir);
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = AuthFileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Write the auth file with 0600 perms (owner-only read/write). Creates
 * the directory if it doesn't exist. Idempotent: re-writing the same
 * data is a no-op semantically (file is replaced atomically by Node's
 * writeFileSync — Node uses `O_TRUNC` so a partial write can't leave a
 * stale file behind unless the process dies mid-write; pairing is a
 * single round-trip so the race is acceptable for M3).
 */
export function writeAuth(configDir: string, auth: AuthFile): void {
  const parsed = AuthFileSchema.safeParse(auth);
  if (!parsed.success) {
    throw new Error(
      `[studio-zero] refusing to write malformed auth file: ${parsed.error.message}`,
    );
  }
  if (!existsSync(configDir)) {
    // 0700 on the directory — owner-only access.
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  const p = authFilePath(configDir);
  // 1. Write with 0600. Node's writeFileSync mode arg sets perms on
  //    create, but if the file already exists Node does NOT chmod it.
  //    Belt-and-braces: explicitly chmod after write.
  writeFileSync(p, JSON.stringify(parsed.data, null, 2), {
    mode: 0o600,
    encoding: "utf-8",
  });
  try {
    chmodSync(p, 0o600);
  } catch {
    // Windows doesn't honor POSIX perms — silent on EPERM. On Windows
    // the parent dir's ACL is the actual protection; the chmod call is
    // a best-effort POSIX assertion.
  }
}

/** Delete the auth file. Idempotent. */
export function clearAuth(configDir: string): void {
  const p = authFilePath(configDir);
  if (existsSync(p)) {
    try {
      unlinkSync(p);
    } catch (err) {
      throw new Error(
        `[studio-zero] could not delete auth file at ${p}: ${(err as Error).message}`,
      );
    }
  }
}

/** Convenience: paired? */
export function isPaired(configDir: string): boolean {
  return readAuth(configDir) !== null;
}

/** Convenience: token-expired? */
export function isTokenExpired(auth: AuthFile, now: Date = new Date()): boolean {
  const exp = new Date(auth.tokenExpiresAt);
  if (Number.isNaN(exp.getTime())) return true;
  return now.getTime() >= exp.getTime();
}
