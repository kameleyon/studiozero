/**
 * Studio Zero — build-agent fixer unit tests.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Drives each per-layer fixer with a mock
 * gateway and asserts the patch contract.
 */
import { describe, it, expect, vi } from "vitest";
import type { LlmGatewayClient } from "../../src/llm-gateway-client.js";
import { runHaloFixer } from "../../src/build/halo-fixer.js";
import { runProofFixer } from "../../src/build/proof-fixer.js";
import { runOpticFixer } from "../../src/build/optic-fixer.js";
import { runCanonFixer } from "../../src/build/canon-fixer.js";
import { runCompassFixer } from "../../src/build/compass-fixer.js";
import { runTraceFixer } from "../../src/build/trace-fixer.js";
import type { BuildFinding, FixerContext } from "../../src/build/types.js";

const FILE = "src/components/SignupForm.tsx";
const ORIGINAL =
  Array.from({ length: 50 }, (_, i) => `line${i + 1}`).join("\n") + "\n";

function makeFinding(
  layer: BuildFinding["layer"],
  overrides: Partial<BuildFinding> = {},
): BuildFinding {
  return {
    id: "uuid-finding-1",
    finding_code: "F-042",
    run_id: "run-1",
    tenant_id: "tenant-1",
    severity: "Major",
    layer,
    reviewer: layerToReviewer(layer),
    summary: "test finding",
    recommendation: "fix it",
    file_path: FILE,
    line_start: 42,
    line_end: 42,
    ...overrides,
  };
}

function layerToReviewer(layer: BuildFinding["layer"]): BuildFinding["reviewer"] {
  switch (layer) {
    case "accessibility":
      return "halo";
    case "copy":
      return "proof";
    case "design":
      return "optic";
    case "brand":
      return "canon";
    case "audience":
      return "compass";
    case "flow":
      return "trace";
    default:
      return "jury";
  }
}

function makeGateway(jsonText: string): LlmGatewayClient {
  return {
    message: vi.fn().mockResolvedValue({
      text: jsonText,
      usage: { input: 50, output: 80 },
      modelClass: "thoughtful",
      requestId: "mock-fixer-test",
    }),
  };
}

function makeCtx(
  finding: BuildFinding,
  gatewayText: string,
): FixerContext {
  return {
    finding,
    original_file_contents: ORIGINAL,
    gateway: makeGateway(gatewayText),
    signal: new AbortController().signal,
    runner_version: "1.5.0",
  };
}

const VALID_RESPONSE = JSON.stringify({
  replacement_block: "FIXED LINE 42",
  confidence: 0.85,
  rationale: "test",
});

describe("each fixer accepts a well-formed JSON response", () => {
  it.each([
    ["accessibility", runHaloFixer, "halo-fixer"],
    ["copy", runProofFixer, "proof-fixer"],
    ["design", runOpticFixer, "optic-fixer"],
    ["brand", runCanonFixer, "canon-fixer"],
    ["audience", runCompassFixer, "compass-fixer"],
    ["flow", runTraceFixer, "trace-fixer"],
  ] as const)(
    "%s → %s produces a valid patch",
    async (layer, fixer, producedBy) => {
      const ctx = makeCtx(
        makeFinding(layer as BuildFinding["layer"]),
        VALID_RESPONSE,
      );
      const res = await fixer(ctx);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.patch.file_path).toBe(FILE);
        expect(res.patch.finding_code).toBe("F-042");
        expect(res.patch.produced_by).toBe(producedBy);
        expect(res.patch.unified_diff).toContain("--- a/" + FILE);
        expect(res.patch.unified_diff).toContain("+FIXED LINE 42");
      }
    },
  );
});

describe("each fixer rejects findings of the wrong layer", () => {
  it.each([
    ["copy", runHaloFixer],
    ["accessibility", runProofFixer],
    ["accessibility", runOpticFixer],
    ["accessibility", runCanonFixer],
    ["accessibility", runCompassFixer],
    ["accessibility", runTraceFixer],
  ] as const)(
    "fixer rejects layer=%s",
    async (wrongLayer, fixer) => {
      const ctx = makeCtx(
        makeFinding(wrongLayer as BuildFinding["layer"]),
        VALID_RESPONSE,
      );
      const res = await fixer(ctx);
      expect(res.ok).toBe(false);
    },
  );
});

describe("fixer rejects non-JSON / fenced response cleanly", () => {
  it("returns ok=false with parse reason", async () => {
    const ctx = makeCtx(makeFinding("accessibility"), "this is not JSON");
    const res = await runHaloFixer(ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("non_json_response");
  });

  it("accepts JSON wrapped in markdown fences", async () => {
    const fenced = "```json\n" + VALID_RESPONSE + "\n```";
    const ctx = makeCtx(makeFinding("accessibility"), fenced);
    const res = await runHaloFixer(ctx);
    expect(res.ok).toBe(true);
  });
});

describe("fixer rejects empty replacement_block", () => {
  it("returns ok=false", async () => {
    const empty = JSON.stringify({ replacement_block: "", confidence: 0.5 });
    const ctx = makeCtx(makeFinding("accessibility"), empty);
    const res = await runHaloFixer(ctx);
    expect(res.ok).toBe(false);
  });
});
