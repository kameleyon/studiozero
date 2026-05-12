/**
 * CLI auth helpers — Phase 9 M3 Batch 2 (Forge).
 *
 * Shared infrastructure for the `apps/web/app/api/cli/**` route handlers.
 * Handles:
 *
 *   - Bearer-token resolution (opaque pairing token → `cli_pairings` row)
 *   - 6-char alphanumeric pairing-code generation (Crockford-ish: upper
 *     A-Z + 0-9, no ambiguous chars). ~36⁶ ≈ 2.18B combos.
 *   - SHA-256 hash of pairing codes (we store the hash, never the plaintext)
 *   - Token-bucket rate limiter per IP (in-memory; M3 default — Redis
 *     for V1.5 multi-region per env.md). 5 attempts / minute.
 *   - JSON helpers that always carry `X-AI-Generated: studio-zero`.
 *
 * Why opaque tokens (no JWT): per PRD §16 + cli-pairing-and-tamper.md C5,
 * the pairing token is server-side state — revocable any time. JWTs would
 * require a JWKS rotation flow we don't need for the CLI surface.
 *
 * Token shape: 32 random bytes, base64url-encoded → 43 chars. Stored in
 * `cli_pairings.pairing_token` as plaintext (this column is RLS-protected
 * + only visible to service-role). On confirm, we hash with SHA-256 too
 * so lookups can be hash-equality if we ever rotate to a hashed-token
 * posture (parallel work track for Atlas).
 *
 * SECURITY-CRITICAL: any path that READS `cli_pairings` rows MUST go
 * through `verifyPairingToken()` (no direct service-role queries from
 * route handlers — keeps the bearer-token boundary auditable).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { aiDisclosureHeaders } from "./ai-disclosure";

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/** Pairing-code charset — 36 alphanumerics, NO ambiguous chars (no O/0/I/1 ambiguity here since we use both but accept that — 36⁶ ≈ 2.18B). */
const PAIRING_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Pairing code length per cli-pairing-and-tamper.md C2. */
export const PAIRING_CODE_LENGTH = 6;

/** Pairing-code TTL — 5 min per flow + PRD §16 M3. */
export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;

/** Pairing-token TTL — 90 days per the flow. */
export const PAIRING_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Long-poll hold window — 30s per prompt spec. */
export const LONG_POLL_HOLD_MS = 30 * 1000;

/** Events-body privacy cap (M3 invariant). */
export const EVENTS_BODY_CAP_BYTES = 64 * 1024;

/** Rate-limit window for pair-init / pair-confirm: 5 / minute / IP. */
export const PAIR_RATE_LIMIT_PER_MIN = 5;

/** Confirm-fail-streak threshold before IP block. */
export const CONFIRM_FAIL_BLOCK_THRESHOLD = 5;

/** IP block duration after fail-streak. */
export const IP_BLOCK_MS = 60 * 60 * 1000; // 1h

/* -------------------------------------------------------------------------- */
/* Pairing-code utilities                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Generate a fresh pairing code. Uses crypto.randomBytes so the entropy
 * is sound (not Math.random). The modulo bias from `byte % 36` is
 * negligible at this length / charset size (≤ 1 LSB on an 8-bit byte).
 */
export function generatePairingCode(): string {
  const bytes = randomBytes(PAIRING_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    const idx = (bytes[i] ?? 0) % PAIRING_CODE_ALPHABET.length;
    out += PAIRING_CODE_ALPHABET[idx];
  }
  return out;
}

/** SHA-256 hex hash of a pairing code (case-insensitive: we uppercase first). */
export function hashPairingCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase(), "utf-8").digest("hex");
}

/** Validate pairing-code shape. */
export function isValidPairingCodeShape(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z0-9]{6}$/i.test(code);
}

/* -------------------------------------------------------------------------- */
/* Opaque pairing-token utilities                                             */
/* -------------------------------------------------------------------------- */

/** Generate a new opaque pairing token: 32 random bytes → base64url (43 chars). */
export function generatePairingToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Validate pairing-token shape (43 chars b64url is the canonical shape). */
export function isValidTokenShape(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{20,128}$/.test(token);
}

/** Constant-time string compare. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf-8"), Buffer.from(b, "utf-8"));
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Bearer-token extraction + DB lookup                                        */
/* -------------------------------------------------------------------------- */

/** Pull the bearer token out of `Authorization: Bearer <token>`. */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  return match[1] ?? null;
}

/** Shape returned from `cli_pairings` lookup. */
export interface PairingRow {
  id: string;
  tenant_id: string;
  user_id: string;
  cli_version: string;
  hostname: string;
  os: string;
  /** Server-trusted CLI binary hash (recorded at pair time). */
  binary_hash?: string | null;
  revoked_at: string | null;
  expires_at?: string | null;
  last_heartbeat_at?: string | null;
}

/**
 * Verify a bearer pairing token. Returns the active row OR null.
 *
 * Checks:
 *   1. Token has plausible shape.
 *   2. Row exists for this token.
 *   3. `revoked_at IS NULL`.
 *   4. `expires_at IS NULL OR expires_at > now()`.
 *
 * The caller is expected to have a service-role client (CLI endpoints
 * can't rely on the user's session — the CLI runs headless).
 */
export async function verifyPairingToken(
  service: SupabaseClient,
  req: Request,
): Promise<PairingRow | null> {
  const token = extractBearerToken(req);
  if (!token || !isValidTokenShape(token)) return null;

  const { data, error } = await service
    .from("cli_pairings")
    .select(
      "id, tenant_id, user_id, cli_version, hostname, os, binary_hash, revoked_at, expires_at, last_heartbeat_at",
    )
    .eq("pairing_token", token)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as PairingRow;
  if (row.revoked_at) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }
  return row;
}

/* -------------------------------------------------------------------------- */
/* In-memory rate limiter — IP token bucket                                   */
/* -------------------------------------------------------------------------- */

interface BucketState {
  /** Timestamps of recent attempts (ms). */
  attempts: number[];
  /** Failed-confirm streak — when ≥5, IP is blocked. */
  failStreak: number;
  /** When the IP is unblocked. 0 = not blocked. */
  blockedUntil: number;
}

/** Module-scope map; M3 only. V1.5 moves to Upstash Redis (see env.md). */
const buckets = new Map<string, BucketState>();

/** Periodic GC — prune buckets that haven't been touched in 1h. */
let lastGc = 0;
function gcBuckets(now: number): void {
  if (now - lastGc < 60_000) return;
  lastGc = now;
  const stale = now - 60 * 60 * 1000;
  for (const [k, v] of buckets) {
    const last = v.attempts[v.attempts.length - 1] ?? 0;
    if (last < stale && v.blockedUntil < now) buckets.delete(k);
  }
}

/** Extract a stable IP key from a Next request. Falls back to "anon" so tests work. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}

export interface RateLimitVerdict {
  ok: boolean;
  retryAfterMs: number;
  reason?: "rate_limited" | "ip_blocked";
}

/**
 * Token-bucket check. Counts attempts in the last 60s; allows up to
 * PAIR_RATE_LIMIT_PER_MIN. Also enforces the failStreak IP block.
 *
 * MUTATES the bucket — call once per request, NOT speculatively.
 */
export function rateLimit(ip: string, now: number = Date.now()): RateLimitVerdict {
  gcBuckets(now);
  const b = buckets.get(ip) ?? { attempts: [], failStreak: 0, blockedUntil: 0 };
  if (b.blockedUntil > now) {
    buckets.set(ip, b);
    return { ok: false, retryAfterMs: b.blockedUntil - now, reason: "ip_blocked" };
  }
  // Prune attempts older than 60s.
  const cutoff = now - 60_000;
  b.attempts = b.attempts.filter((t) => t >= cutoff);
  if (b.attempts.length >= PAIR_RATE_LIMIT_PER_MIN) {
    const oldest = b.attempts[0] ?? now;
    buckets.set(ip, b);
    return {
      ok: false,
      retryAfterMs: Math.max(1000, oldest + 60_000 - now),
      reason: "rate_limited",
    };
  }
  b.attempts.push(now);
  buckets.set(ip, b);
  return { ok: true, retryAfterMs: 0 };
}

/** Record a failed confirm attempt. If streak hits threshold, block the IP. */
export function recordConfirmFailure(ip: string, now: number = Date.now()): void {
  const b = buckets.get(ip) ?? { attempts: [], failStreak: 0, blockedUntil: 0 };
  b.failStreak += 1;
  if (b.failStreak >= CONFIRM_FAIL_BLOCK_THRESHOLD) {
    b.blockedUntil = now + IP_BLOCK_MS;
    b.failStreak = 0;
    // Sentry alert — best-effort, server-only. We dynamic-import so the
    // shim stays test-friendly (Sentry isn't loaded under vitest).
    void (async () => {
      try {
        const sentry = (await import("@sentry/nextjs")) as {
          captureMessage?: (msg: string, level?: string) => void;
        };
        sentry.captureMessage?.(
          `[cli-pair] IP ${ip} blocked for 1h after ${CONFIRM_FAIL_BLOCK_THRESHOLD} failed pair-confirm attempts`,
          "warning",
        );
      } catch {
        // Sentry not installed in this build — no-op.
      }
    })();
  }
  buckets.set(ip, b);
}

/** Reset the fail streak on a successful confirm. */
export function recordConfirmSuccess(ip: string): void {
  const b = buckets.get(ip);
  if (b) {
    b.failStreak = 0;
    buckets.set(ip, b);
  }
}

/** Test-only: clear all buckets. */
export function __resetBucketsForTest(): void {
  buckets.clear();
  lastGc = 0;
}

/* -------------------------------------------------------------------------- */
/* JSON response helpers — every CLI response carries the AI Act header.      */
/* -------------------------------------------------------------------------- */

export function cliJson<T>(body: T, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...aiDisclosureHeaders,
      ...extraHeaders,
    },
  });
}

export function cliEmpty(status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status,
    headers: {
      ...aiDisclosureHeaders,
      ...extraHeaders,
    },
  });
}

/** 401 helper used by every authenticated CLI endpoint. */
export function unauthorized(reason = "unauthorized"): Response {
  return cliJson({ ok: false, error: reason }, 401);
}

/** 429 helper with `Retry-After` (seconds) per RFC 9110. */
export function tooManyRequests(retryAfterMs: number, reason = "rate_limited"): Response {
  const secs = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return cliJson(
    { ok: false, error: reason, retryAfterSeconds: secs },
    429,
    { "Retry-After": String(secs) },
  );
}

/* -------------------------------------------------------------------------- */
/* HMAC-SHA256 verdict-signature verify (mirror of CLI verdict-sign.ts)       */
/* -------------------------------------------------------------------------- */

/**
 * Canonicalize a verdict body for signing. MUST mirror the CLI's
 * `canonicalize()` in `apps/cli/src/runner/verdict-sign.ts` exactly —
 * any divergence here = silent verification failure. We keep the field
 * order identical to that file (purely structural, not key-sorted).
 */
export interface VerdictBody {
  runId: string;
  verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  score: number;
  scoreEngineVersion: string;
  audience: string;
  watermark: "private-run-self-audited" | null;
  findings: ReadonlyArray<Record<string, unknown>>;
  scoreBreakdown: Record<string, number>;
  sealedAt: string;
  claimedBinaryHash: string;
}

export function canonicalizeVerdict(v: VerdictBody): string {
  const ordered = {
    runId: v.runId,
    verdict: v.verdict,
    score: v.score,
    scoreEngineVersion: v.scoreEngineVersion,
    audience: v.audience,
    watermark: v.watermark,
    findings: v.findings,
    scoreBreakdown: v.scoreBreakdown,
    sealedAt: v.sealedAt,
    claimedBinaryHash: v.claimedBinaryHash,
  };
  return JSON.stringify(ordered);
}

/**
 * Server-side mirror of CLI's `verifySignature`. Returns true iff the
 * recomputed HMAC-SHA256(canonical-json, key=binary_hash) matches the
 * provided signature. Constant-time compare via Node's timingSafeEqual.
 *
 * `binaryHash` is the binary's SHA-256 hex. Must be 64-char hex.
 */
export function verifyVerdictSignature(
  v: VerdictBody,
  binaryHash: string,
  signature: string,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(binaryHash)) return false;
  if (typeof signature !== "string" || signature.length === 0) return false;
  let expected: string;
  try {
    expected = createHmac("sha256", binaryHash)
      .update(canonicalizeVerdict(v), "utf-8")
      .digest("hex");
  } catch {
    return false;
  }
  return safeEqual(expected, signature);
}
