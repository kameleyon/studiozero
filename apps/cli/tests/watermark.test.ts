/**
 * Studio Zero — watermark constants tests (D7 lock).
 *
 * Phase 9 M3 Batch 1 (Forge). The watermark text is BRAND-LOCKED per
 * Herald + Halo at v0.4 of the PRD. Any change here is a brand-voice
 * change and must round-trip through the D7 owners. This test snapshots
 * the exact strings so accidental drift breaks CI.
 *
 * The web verdict surface and (V1.5) PR-body emitter MUST emit the same
 * strings for SC 3.2.4 "Consistent Identification". The cross-surface
 * snapshot test is `tests/acceptance/goal-4-three-modes.spec.ts` (Verify,
 * M3 exit gate); this unit test is the CLI-local guard.
 */
import { describe, it, expect } from "vitest";
import {
  WATERMARK_BADGE,
  WATERMARK_HELP,
  WATERMARK_FIELD_VALUE,
  WATERMARK_FIELD_NULL,
  watermarkBlock,
  watermarkFor,
} from "../src/watermark/private-run-self-audited.js";

describe("watermark / D7 locked copy", () => {
  it("badge text is exactly the Herald-locked string", () => {
    expect(WATERMARK_BADGE).toBe("Private Run · Self-Audited");
  });

  it("help text is exactly the Herald-locked string", () => {
    expect(WATERMARK_HELP).toBe(
      "This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device.",
    );
  });

  it("schema field value is the audit-output.v1 enum", () => {
    expect(WATERMARK_FIELD_VALUE).toBe("private-run-self-audited");
  });

  it("schema field null sentinel is JS null (PRD §9.4)", () => {
    expect(WATERMARK_FIELD_NULL).toBeNull();
  });

  it("watermarkBlock concatenates badge + help", () => {
    expect(watermarkBlock()).toBe(`${WATERMARK_BADGE}\n${WATERMARK_HELP}`);
  });

  it("watermarkFor('cli') returns the locked field value", () => {
    expect(watermarkFor("cli")).toBe(WATERMARK_FIELD_VALUE);
  });

  it("watermarkFor non-cli modes returns null", () => {
    expect(watermarkFor("byok")).toBeNull();
    expect(watermarkFor("managed")).toBeNull();
    expect(watermarkFor("surface")).toBeNull();
  });
});
