/**
 * Studio Zero — pinned-versions.json loader tests.
 *
 * Phase 9 V2.1 Batch 1 (Forge) — VF3 carry close. Asserts that
 * `apps/runner/src/llm/pinned-versions.json` exists, parses, and the
 * exposed `resolvePinnedModel()` returns the expected pin per modelClass.
 *
 * Cross-ref: sprint/milestone-M1.md "provider abstraction (R9 mitigation)"
 * + tests/integration/cross-mode-consistency.spec.ts § L30 carry note.
 */
import { describe, it, expect } from "vitest";

import {
  loadPinnedVersions,
  resolvePinnedModel,
  _resetPinnedVersionsCache,
} from "../src/llm-gateway-client.js";

describe("pinned-versions.json — VF3 carry close", () => {
  it("loads + parses with required keys", () => {
    _resetPinnedVersionsCache();
    const pins = loadPinnedVersions();
    expect(pins.version).toBe("v1");
    expect(pins.pinned_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pins.anthropic.models.primary).toMatch(/^claude-sonnet-4/);
    expect(pins.anthropic.models.fast).toMatch(/^claude-haiku-4/);
    expect(pins.fallback_provider).toBe("openrouter");
    expect(pins.openrouter?.models.primary).toContain("anthropic/");
    expect(pins.rotation_policy).toMatch(/monthly/i);
  });

  it("resolvePinnedModel returns the anthropic pin by modelClass", () => {
    expect(resolvePinnedModel("fast")).toMatch(/^claude-haiku/);
    expect(resolvePinnedModel("thoughtful")).toMatch(/^claude-sonnet/);
    expect(resolvePinnedModel("long-context")).toMatch(/^claude-sonnet/);
  });

  it("resolvePinnedModel honors the fallback flag for OpenRouter ids", () => {
    expect(resolvePinnedModel("fast", { fallback: true })).toMatch(
      /^anthropic\/claude-haiku/,
    );
    expect(resolvePinnedModel("thoughtful", { fallback: true })).toMatch(
      /^anthropic\/claude-sonnet/,
    );
  });

  it("resolvePinnedModel throws on unknown modelClass", () => {
    expect(() =>
      resolvePinnedModel("unknown" as unknown as "fast"),
    ).toThrow(/unknown modelClass/);
  });
});
