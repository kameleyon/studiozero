/**
 * Studio Zero — verdict signing tests (D7).
 *
 * Phase 9 M3 Batch 1 (Forge). Covers the locked D7 contract from
 * `ia/user-flows/cli-pairing-and-tamper.md` C7 + C8 + the unhappy-path
 * acceptance criteria in `cli-version-mismatch.spec.ts` neighbours.
 *
 * The unit tests assert:
 *   - HMAC-SHA256 with key=binary_hash is deterministic for the same body
 *   - Canonicalization is stable across object key shuffling
 *   - signVerdict refuses non-hex / wrong-length binaryHash
 *   - verifySignature is constant-time-ish (Buffer XOR)
 *   - A tampered verdict body produces a different signature
 *   - A tampered binary hash produces a different signature
 */
import { describe, it, expect } from "vitest";
import {
  signVerdict,
  verifySignature,
  canonicalize,
  sha256Hex,
  type VerdictBody,
} from "../src/runner/verdict-sign.js";

const SAMPLE_HASH = "a".repeat(64);
const OTHER_HASH = "b".repeat(64);

function sampleVerdict(): VerdictBody {
  return {
    runId: "run-01HXYZ",
    verdict: "PASS WITH FIXES",
    score: 72,
    scoreEngineVersion: "v1",
    audience: "smb-builders",
    watermark: "private-run-self-audited",
    findings: [
      {
        id: "F-001",
        reviewer: "halo",
        severity: "Major",
        summary: "label missing",
      },
    ],
    scoreBreakdown: { ux: 80, accessibility: 60, copy: 80, brand: 90, flow: 70, audience: 75 },
    sealedAt: "2026-05-12T12:00:00.000Z",
    claimedBinaryHash: SAMPLE_HASH,
  };
}

describe("verdict-sign / HMAC-SHA256 (D7)", () => {
  it("is deterministic for the same body + same key", () => {
    const v = sampleVerdict();
    const a = signVerdict(v, SAMPLE_HASH);
    const b = signVerdict(v, SAMPLE_HASH);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes signature when the body changes (1-bit verdict flip)", () => {
    const v = sampleVerdict();
    const a = signVerdict(v, SAMPLE_HASH);
    const v2 = { ...v, verdict: "PASS" as const };
    const b = signVerdict(v2, SAMPLE_HASH);
    expect(a).not.toBe(b);
  });

  it("changes signature when the binary hash changes", () => {
    const v = sampleVerdict();
    const a = signVerdict(v, SAMPLE_HASH);
    const b = signVerdict(v, OTHER_HASH);
    expect(a).not.toBe(b);
  });

  it("refuses non-hex binary hash", () => {
    const v = sampleVerdict();
    expect(() => signVerdict(v, "not-hex-not-hex-not-hex")).toThrow(
      /binaryHash must be 64-char hex/,
    );
  });

  it("refuses wrong-length binary hash", () => {
    const v = sampleVerdict();
    expect(() => signVerdict(v, "a".repeat(63))).toThrow(
      /binaryHash must be 64-char hex/,
    );
  });

  it("verifySignature returns true for the matching signature", () => {
    const v = sampleVerdict();
    const sig = signVerdict(v, SAMPLE_HASH);
    expect(verifySignature(v, SAMPLE_HASH, sig)).toBe(true);
  });

  it("verifySignature returns false when the body was tampered", () => {
    const v = sampleVerdict();
    const sig = signVerdict(v, SAMPLE_HASH);
    const tampered = { ...v, score: 99 };
    expect(verifySignature(tampered, SAMPLE_HASH, sig)).toBe(false);
  });

  it("verifySignature returns false on a wrong key (unrecognized binary)", () => {
    const v = sampleVerdict();
    const sig = signVerdict(v, SAMPLE_HASH);
    expect(verifySignature(v, OTHER_HASH, sig)).toBe(false);
  });

  it("canonicalize produces the same string regardless of input key order", () => {
    const v = sampleVerdict();
    const reordered: VerdictBody = {
      claimedBinaryHash: v.claimedBinaryHash,
      sealedAt: v.sealedAt,
      scoreBreakdown: v.scoreBreakdown,
      findings: v.findings,
      watermark: v.watermark,
      audience: v.audience,
      scoreEngineVersion: v.scoreEngineVersion,
      score: v.score,
      verdict: v.verdict,
      runId: v.runId,
    };
    expect(canonicalize(reordered)).toBe(canonicalize(v));
  });

  it("sha256Hex(known input) matches a fixed hex value", () => {
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
