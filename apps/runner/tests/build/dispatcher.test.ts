/**
 * Studio Zero — dispatch-build tests.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Drives the build dispatcher with a fake
 * `loadFindings` + `readFile` and asserts the artifact shape.
 */
import { describe, it, expect, vi } from "vitest";
import { dispatchBuild } from "../../src/build/index.js";
import type { BuildFinding } from "../../src/build/types.js";
import type { LlmGatewayClient } from "../../src/llm-gateway-client.js";

const FILE = "src/X.tsx";
const ORIGINAL =
  Array.from({ length: 60 }, (_, i) => `line${i + 1}`).join("\n") + "\n";

function gateway(): LlmGatewayClient {
  return {
    message: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        replacement_block: "REPLACED",
        confidence: 0.9,
      }),
      usage: { input: 10, output: 20 },
      modelClass: "thoughtful",
      requestId: "mock",
    }),
  };
}

function makeFinding(
  code: string,
  layer: BuildFinding["layer"],
): BuildFinding {
  return {
    id: `uuid-${code}`,
    finding_code: code,
    run_id: "run-1",
    tenant_id: "tenant-1",
    severity: "Major",
    layer,
    reviewer: "halo",
    summary: "x",
    recommendation: "y",
    file_path: FILE,
    line_start: 10,
    line_end: 10,
  };
}

describe("dispatchBuild", () => {
  it("routes one finding per layer to its fixer + aggregates patches", async () => {
    const findings: BuildFinding[] = [
      makeFinding("F-001", "accessibility"),
      makeFinding("F-002", "copy"),
      makeFinding("F-003", "design"),
    ];
    const out = await dispatchBuild(
      {
        fix_pr_job_id: "fp-1",
        run_id: "run-1",
        tenant_id: "tenant-1",
        signal: new AbortController().signal,
      },
      {
        gateway: gateway(),
        loadFindings: vi.fn().mockResolvedValue(findings),
        readFile: vi.fn().mockResolvedValue(ORIGINAL),
        runner_version: "1.5.0",
      },
    );
    expect(out.artifact.patches).toHaveLength(3);
    expect(out.artifact.files_changed).toEqual([FILE]);
    expect(out.failures).toHaveLength(0);
    // Patches emitted in finding-code order (deterministic).
    expect(out.artifact.patches.map((p) => p.finding_code)).toEqual([
      "F-001",
      "F-002",
      "F-003",
    ]);
  });

  it("returns a failure (not throw) for layers with no fixer", async () => {
    const findings = [makeFinding("F-100", "security")];
    const out = await dispatchBuild(
      {
        fix_pr_job_id: "fp-1",
        run_id: "run-1",
        tenant_id: "tenant-1",
        signal: new AbortController().signal,
      },
      {
        gateway: gateway(),
        loadFindings: vi.fn().mockResolvedValue(findings),
        readFile: vi.fn().mockResolvedValue(ORIGINAL),
        runner_version: "1.5.0",
      },
    );
    expect(out.artifact.patches).toHaveLength(0);
    expect(out.failures).toHaveLength(1);
    expect(out.failures[0]?.reason).toContain("no_fixer_for_layer");
  });

  it("aborts cleanly on signal-aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    const out = await dispatchBuild(
      {
        fix_pr_job_id: "fp-1",
        run_id: "run-1",
        tenant_id: "tenant-1",
        signal: ac.signal,
      },
      {
        gateway: gateway(),
        loadFindings: vi.fn().mockResolvedValue([
          makeFinding("F-001", "accessibility"),
        ]),
        readFile: vi.fn().mockResolvedValue(ORIGINAL),
        runner_version: "1.5.0",
      },
    );
    expect(out.artifact.patches).toHaveLength(0);
    expect(out.failures[0]?.reason).toBe("aborted");
  });
});
