/**
 * Studio Zero — D7 verdict signing.
 *
 * Phase 9 M3 Batch 1 (Forge). Implements the locked D7 contract from
 * `ia/user-flows/cli-pairing-and-tamper.md` C7 + C8:
 *
 *     signature = HMAC-SHA256(verdict_body_json, key = binary_hash)
 *
 * Rationale (per the flow's design notes):
 *  - The HMAC key is the CLI binary's own SHA-256 hash. A tampered
 *    binary produces a different signature; the server has the hash
 *    in its published-builds list and re-computes the expected
 *    signature server-side (C8).
 *  - This is a TRANSPARENCY mechanism, not a security guarantee against
 *    the customer themselves. Per D7 lock: marketing copy must not
 *    claim "tamper detected"; product copy uses neutral framing.
 *  - The mismatch case is the C-TAMPER state in the user-flow: the
 *    verdict is still shown to the customer (we do not block their own
 *    verdict on their own machine), but with a red-banner advisory and
 *    CTAs to re-run on hosted infra.
 *
 * Determinism is load-bearing:
 *  - Serialization MUST be canonical (we use JSON with sorted keys at
 *    the top-level fields specified by audit-output.v1.schema.json).
 *  - Adding a new field to the verdict body without versioning the
 *    canonicalization function will silently break signature verify.
 *    Verify owns the snapshot test that catches this; we keep the
 *    canon fn purely structural.
 */
import { createHash, createHmac } from "node:crypto";

/** Minimal verdict shape per PRD §9.4 audit-output.v1 schema. */
export interface VerdictBody {
  runId: string;
  verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  score: number;
  scoreEngineVersion: string;
  audience: string;
  watermark: "private-run-self-audited" | null;
  findings: ReadonlyArray<Record<string, unknown>>;
  scoreBreakdown: Record<string, number>;
  /** ISO-8601 timestamp the CLI sealed the verdict. */
  sealedAt: string;
  /** Sender's claimed binary hash — server cross-checks. */
  claimedBinaryHash: string;
}

/**
 * Canonical JSON for signing. Two invariants:
 *   1. Top-level fields are serialized in a deterministic order so the
 *      same object always produces the same string.
 *   2. Nested objects retain their natural key order — findings are
 *      shaped by the audit-output schema and are stable in that
 *      ordering. (If V1.5 adds nested ordering risk, we revisit.)
 *
 * We intentionally avoid generic deep-sort here: it would mask schema
 * drift. If a new top-level field lands, this function MUST be updated
 * to include it, and Verify's snapshot test will fail until then. That
 * surfacing is the design goal.
 */
export function canonicalize(v: VerdictBody): string {
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
 * Sign a verdict body. Returns the hex-encoded HMAC-SHA256.
 *
 * `binaryHash` is the SHA-256 hex (64 chars) of the CLI binary on disk.
 * In practice this comes from `binaryHash()` below, computed once at
 * pair time + cached in `auth.json` per `auth/pairing-token.ts`.
 */
export function signVerdict(v: VerdictBody, binaryHash: string): string {
  if (!/^[a-f0-9]{64}$/i.test(binaryHash)) {
    throw new Error(
      `[verdict-sign] binaryHash must be 64-char hex sha256; got ${binaryHash.length} chars`,
    );
  }
  const payload = canonicalize(v);
  return createHmac("sha256", binaryHash).update(payload, "utf-8").digest("hex");
}

/**
 * Verify a verdict signature. Returns true iff the recomputed HMAC
 * matches `signature` exactly. Uses constant-time-ish comparison
 * (Node's `timingSafeEqual` via Buffer).
 *
 * This function is what the server runs at C8. We ship it here so the
 * CLI can self-test (`studio-zero doctor`) and so the unit test can
 * round-trip without an HTTP round-trip.
 */
export function verifySignature(
  v: VerdictBody,
  binaryHash: string,
  signature: string,
): boolean {
  let expected: string;
  try {
    expected = signVerdict(v, binaryHash);
  } catch {
    return false;
  }
  if (expected.length !== signature.length) return false;
  // Constant-time compare via Buffer.
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signature, "utf-8");
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/**
 * SHA-256 hex of an arbitrary string (used to compute the binary hash
 * from a file's bytes). Caller is responsible for reading the binary
 * bytes; this fn is the hashing primitive.
 *
 * For the actual on-disk CLI binary the consumer is `commands/version.ts`
 * + the `cli/binary-hash.ts` helper (TBD M3 Batch 2 when we wire the
 * npm publish provenance).
 */
export function sha256Hex(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
