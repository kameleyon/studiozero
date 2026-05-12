/**
 * Studio Zero — run state machine tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Drives `runAudit()` with mocked deps
 * and asserts the state transition order. Cancel-mid-run is in
 * abort-controller.test.ts; here we cover the happy path + the
 * all-reviewers-failed terminal + the partial path.
 */
import { describe, it, expect, vi } from "vitest";
import { runAudit, type RunState } from "../src/run-state-machine.js";
import type { LlmGatewayClient } from "../src/llm-gateway-client.js";
import type { ScoreEngineClient } from "../src/score-engine-client.js";
import type { FindingsWriter } from "../src/findings-writer.js";
import type { RealtimeEmitter } from "../src/realtime-emitter.js";

function makeMockGateway(): LlmGatewayClient {
  return {
    async message() {
      return {
        text: "ok",
        usage: { input: 1, output: 1 },
        modelClass: "fast",
        requestId: "mock",
      };
    },
  };
}

function makeMockScoreEngine(): ScoreEngineClient {
  return {
    async compute() {
      return {
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
      };
    },
  };
}

function makeMockWriter(): FindingsWriter {
  return {
    async insertFinding() {
      /* no-op */
    },
  };
}

function makeMockEmitter(): RealtimeEmitter {
  return {
    emit() {
      /* no-op */
    },
    async flush() {
      /* no-op */
    },
    async close() {
      /* no-op */
    },
  };
}

describe("run-state-machine / happy path quick depth", () => {
  it("transitions through dispatched → reviewers_running → all_reviewers_complete → jury_synthesizing → verdict_emitted", async () => {
    const states: RunState[] = [];
    const result = await runAudit(
      {
        runId: "01HXY9C8ZK",
        tenantId: "00000000-0000-0000-0000-000000000001",
        audience: "indie maker",
        depth: "quick",
        projectPayload: {},
      },
      {
        gateway: makeMockGateway(),
        scoreEngine: makeMockScoreEngine(),
        findingsWriter: makeMockWriter(),
        emitter: makeMockEmitter(),
        onStateChange: (s) => states.push(s),
        signal: new AbortController().signal,
      },
    );

    expect(result.finalState).toBe("verdict_emitted");
    expect(result.jurySynthesized).toBe(true);
    expect(states).toEqual([
      "dispatched",
      "reviewers_running",
      "all_reviewers_complete",
      "jury_synthesizing",
      "verdict_emitted",
    ]);
    // Quick depth = 3 reviewers
    expect(result.reviewerResults).toHaveLength(3);
    expect(result.reviewerResults.every((r) => r.status === "complete")).toBe(
      true,
    );
  });
});

describe("run-state-machine / comprehensive depth", () => {
  it("runs all six reviewers", async () => {
    const result = await runAudit(
      {
        runId: "01HXY9C8ZL",
        tenantId: "00000000-0000-0000-0000-000000000001",
        audience: "agency",
        depth: "comprehensive",
        projectPayload: {},
      },
      {
        gateway: makeMockGateway(),
        scoreEngine: makeMockScoreEngine(),
        findingsWriter: makeMockWriter(),
        emitter: makeMockEmitter(),
        onStateChange: () => {},
        signal: new AbortController().signal,
      },
    );
    expect(result.reviewerResults).toHaveLength(6);
    expect(result.finalState).toBe("verdict_emitted");
  });
});

describe("run-state-machine / cancel before dispatch", () => {
  it("transitions to cancelled when signal already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort("user_cancelled");
    const states: RunState[] = [];
    const result = await runAudit(
      {
        runId: "01HXY9C8ZM",
        tenantId: "00000000-0000-0000-0000-000000000001",
        audience: "indie maker",
        depth: "quick",
        projectPayload: {},
      },
      {
        gateway: makeMockGateway(),
        scoreEngine: makeMockScoreEngine(),
        findingsWriter: makeMockWriter(),
        emitter: makeMockEmitter(),
        onStateChange: (s) => states.push(s),
        signal: ctrl.signal,
      },
    );
    expect(result.finalState).toBe("cancelled");
    expect(states).toContain("dispatched");
    expect(states).toContain("cancelled");
  });
});

describe("run-state-machine / jury synth failure", () => {
  it("transitions to failed_terminal when score-engine throws", async () => {
    const flakyEngine: ScoreEngineClient = {
      async compute() {
        throw new Error("schema_invalid: response missing verdict");
      },
    };
    const result = await runAudit(
      {
        runId: "01HXY9C8ZN",
        tenantId: "00000000-0000-0000-0000-000000000001",
        audience: "indie maker",
        depth: "quick",
        projectPayload: {},
      },
      {
        gateway: makeMockGateway(),
        scoreEngine: flakyEngine,
        findingsWriter: makeMockWriter(),
        emitter: makeMockEmitter(),
        onStateChange: () => {},
        signal: new AbortController().signal,
      },
    );
    expect(result.finalState).toBe("failed_terminal");
    expect(result.failureCode).toBe("schema_invalid");
  });
});

describe("run-state-machine / persists findings via writer", () => {
  it("calls insertFinding for every completed reviewer's findings", async () => {
    const writer = makeMockWriter();
    const spy = vi.spyOn(writer, "insertFinding");
    await runAudit(
      {
        runId: "01HXY9C8ZP",
        tenantId: "00000000-0000-0000-0000-000000000001",
        audience: "indie maker",
        depth: "quick",
        projectPayload: {},
      },
      {
        gateway: makeMockGateway(),
        scoreEngine: makeMockScoreEngine(),
        findingsWriter: writer,
        emitter: makeMockEmitter(),
        onStateChange: () => {},
        signal: new AbortController().signal,
      },
    );
    // Quick = 3 reviewers, each emits 1 mock finding.
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
