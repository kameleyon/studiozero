/**
 * Unsubscribe token helper. SERVER-ONLY.
 *
 * Owner: Forge (Phase 9 M4 Batch 1). Reviewers: Cipher (HMAC + key
 * boundary), Comply (CAN-SPAM §316.5(a)(3) — unsubscribe link MUST
 * function for 30 days post-send and MUST NOT require sign-in).
 *
 * Token shape (URL-safe base64 of):
 *
 *   `<user_id>.<scope>.<expires_at>.<hmac_sha256>`
 *
 * `scope` is the preference bucket the link unsubscribes from:
 *   - `marketing`  — all marketing + product updates (default)
 *   - `winback`    — only the E5 win-back stream
 *   - `reaudit`    — only the E3/E4 re-audit reminders
 *
 * Expiry is 30 days from send. The 10-day CAN-SPAM SLA is on the
 * SERVICE's processing of the unsubscribe — not the link's freshness.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import "server-only";

export type UnsubscribeScope = "marketing" | "winback" | "reaudit";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET unset. Cannot sign/verify unsubscribe tokens.",
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function hmacFor(payload: string): string {
  const h = createHmac("sha256", getSecret());
  h.update(payload);
  return h.digest("hex");
}

export function mintUnsubscribeToken(
  userId: string,
  scope: UnsubscribeScope = "marketing",
  nowMs: number = Date.now(),
): string {
  const expiresAt = nowMs + TOKEN_TTL_MS;
  const payload = `${userId}.${scope}.${expiresAt}`;
  const sig = hmacFor(payload);
  return base64url(`${payload}.${sig}`);
}

export interface VerifiedUnsubscribe {
  user_id: string;
  scope: UnsubscribeScope;
  expires_at: number;
}

export function verifyUnsubscribeToken(
  token: string,
  nowMs: number = Date.now(),
): VerifiedUnsubscribe | null {
  let decoded: string;
  try {
    decoded = fromBase64url(token);
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 4) return null;
  const [userId, scopeRaw, expiresRaw, sigRaw] = parts;
  if (!userId || !scopeRaw || !expiresRaw || !sigRaw) return null;
  if (scopeRaw !== "marketing" && scopeRaw !== "winback" && scopeRaw !== "reaudit") {
    return null;
  }
  const expiresAt = Number.parseInt(expiresRaw, 10);
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt < nowMs) return null;

  const expected = hmacFor(`${userId}.${scopeRaw}.${expiresAt}`);
  let aBuf: Buffer;
  let bBuf: Buffer;
  try {
    aBuf = Buffer.from(sigRaw, "hex");
    bBuf = Buffer.from(expected, "hex");
  } catch {
    return null;
  }
  if (aBuf.length !== bBuf.length) return null;
  if (!timingSafeEqual(aBuf, bBuf)) return null;

  return {
    user_id: userId,
    scope: scopeRaw as UnsubscribeScope,
    expires_at: expiresAt,
  };
}

export function buildUnsubscribeUrl(
  baseUrl: string,
  userId: string,
  scope: UnsubscribeScope = "marketing",
): string {
  const token = mintUnsubscribeToken(userId, scope);
  const safeBase = baseUrl.replace(/\/+$/, "");
  return `${safeBase}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
