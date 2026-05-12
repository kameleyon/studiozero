/**
 * Studio Zero — Jury synthesis tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Drives `synthesizeJury` with mocked
 * deps and asserts:
 *   - flattens findings from completed reviewers
 *   - calls the score engine (never local) with the aggregate
 *   - emits a final_verdict AuditEvent
 *   - sets partial=true when ≥1 reviewer failed_terminal
 */
import { describe, it, expect, vi } from "vitest";
import { synthesizeJury } from "../../src/reviewers/jury.js";
import type { LlmGatewayClient } from "../../src/llm-gateway-client.js";
import type { ScoreEngineClient } from "../../src/score-engine-client.js";
import type { RealtimeEmitter } from "../../src/realtime-emitter.js";
import type { FindingRow } from "../../src/findings-writer.js";

function makeMockGateway(): LlmGatewayClient {
  return {
    async message() {
      return {
        text: "synth ok",
        usage: { input: 100, output: 200 },
        modelClass: "thoughtful",
        requestId: "mock-jury",
      };
    },
  };
}

function makeMockScoreEngine(
  override?: Partial<ReturnType<ScoreEngineClient["compute"]> extends Promise<infer R> ? R : never>,
): { client: ScoreEngineClient; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn().mockResolvedValue({
    verdict: "PASS WITH FIXES",
    score: 82,
    score_engine_version: "v1",
    score_breakdown: {
      ux: 90,
      accessibility: 85,
      copy: 95,
      brand: 80,
      flow: 75,
      audience: 88,
    },
    ...override,
  });
  return {
    client: { compute: spy } as unknown as ScoreEngineClient,
    spy,
  };
}

function makeMockEmitter(): {
  emitter: RealtimeEmitter;
  events: Array<Parameters<RealtimeEmitter["emit"]>[0]>;
} {
  const events: Array<Parameters<RealtimeEmitter["emit"]>[0]> = [];
  return {
    emitter: {
      emit(e) {
        events.push(e);
      },
      async flush() {},
      async close() {},
    },
    events,
  };
}

const findingA: FindingRow = {
  id: "F-001",
  run_id: "run-1",
  tenant_id: "tenant-1",
  reviewer: "optic",
  severity: "Minor",
  layer: "design",
  summary: "x",
  evidence: { type: "file", path: "a" },
  recommendation: "fix",
  estimated_effort: "S",
  wcag_sc: null,
};
const findingB: FindingRow = { ...findingA, id: "F-002", reviewer: "halo", severity: "Major" };

describe("jury / happy-path synthesis", () => {
  it("aggregates findings from complete reviewers and calls score-engine", async () => {
    const { client: scoreEngine, spy } = makeMockScoreEngine();
    const { emitter, events } = makeMockEmitter();
    const result = await synthesizeJury({
      runId: "run-1",
      tenantId: "tenant-1",
      audience: "indie maker",
      reviewerResults: [
        { reviewer: "optic", status: "complete", findings: [findingA] },
        { reviewer: "halo", status: "complete", findings: [findingB] },
      ],
      partial: false,
      gateway: makeMockGateway(),
      scoreEngine,
      emitter,
      signal: new AbortController().signal,
    });

    expect(result.output.findings).toHaveLength(2);
    expect(result.output.verdict).toBe("PASS WITH FIXES");
    expect(result.output.score).toBe(82);
    expect(result.output.partial).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].findings).toHaveLength(2);

    // final_verdict event emitted.
    const verdictEvents = events.filter((e) => e.kind === "final_verdict");
    expect(verdictEvents).toHaveLength(1);
  });
});

describe("jury / partial when reviewer failed", () => {
  it("flags partial=true and only includes findings from completed reviewers", async () => {
    const { client: scoreEngine } = makeMockScoreEngine();
    const { emitter } = makeMockEmitter();
    const result = await synthesizeJury({
      runId: "run-1",
      tenantId: "tenant-1",
      audience: "indie maker",
      reviewerResults: [
        { reviewer: "optic", status: "complete", findings: [findingA] },
        {
          reviewer: "halo",
          status: "failed_terminal",
          findings: [],
          failureCode: "prompt_injection_block",
        },
      ],
      partial: true,
      gateway: makeMockGateway(),
      scoreEngine,
      emitter,
      signal: new AbortController().signal,
    });

    expect(result.output.partial).toBe(true);
    expect(result.output.findings).toHaveLength(1);
    expect(result.output.findings[0]!.reviewer).toBe("optic");
  });
});

describe("jury / score-engine is the single source of truth", () => {
  it("verdict/score come from score-engine response, NOT a local computation", async () => {
    const { client: scoreEngine, spy } = makeMockScoreEngine({
      verdict: "FAIL",
      score: 42,
    });
    const { emitter } = makeMockEmitter();
    const result = await synthesizeJury({
      runId: "run-1",
      tenantId: "tenant-1",
      audience: "indie maker",
      reviewerResults: [
        { reviewer: "optic", status: "complete", findings: [findingA] },
      ],
      partial: false,
      gateway: makeMockGateway(),
      scoreEngine,
      emitter,
      signal: new AbortController().signal,
    });
    expect(result.output.verdict).toBe("FAIL");
    expect(result.output.score).toBe(42);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
