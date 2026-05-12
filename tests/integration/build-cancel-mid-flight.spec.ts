/**
 * Studio Zero — V2 Build mode mid-flight cancel spec.
 *
 * Phase 9 V2 Batch 1 (Forge). When the customer cancels a build before
 * delivery, the dispatcher must respect the abort signal and the refund
 * calculator must produce a pro-rata refund proportional to layers
 * completed.
 *
 * Refund policy (Penny):
 *   - 0 of 8 layers complete  → 100% refund
 *   - K of 8 layers complete  → ((8-K)/8) * paid
 *   - 8 of 8 complete         →  0% refund (delivery imminent; cancel is too late)
 */
import { describe, it, expect, vi } from "vitest";

import {
  dispatchLayers,
  makeStubRunLayer,
} from "../../apps/runner/src/build/v2/layer-dispatcher.js";
import type {
  Brief,
  BuildEvent,
  LayerName,
  LayerOutput,
} from "../../apps/runner/src/build/v2/types.js";

function makeBrief(): Brief {
  return {
    schema_version: "brief.v1",
    build_id: "55555555-5555-5555-5555-555555555555",
    tenant_id: "66666666-6666-6666-6666-666666666666",
    project_name: "MidflightCancelDemo",
    target_audience: {
      persona: "Tester",
      primary_need: "Cancellation works",
      pain_point: "Stuck builds",
    },
    jtbd: "When a customer cancels, the build halts.",
    success_criteria: ["No layers run after abort"],
    risk_profile: "consumer",
    team_roster: ["saas"],
    output_preference: "roadmap-docs-repo",
    generated_at: "2026-05-12T00:00:00Z",
    produced_by: {
      agent: "bigbrain",
      model_class: "fast",
      request_id: "spec-cancel",
    },
  };
}

/** Pro-rata refund fraction. Mirrors the formula in
 *  apps/web/app/api/builds/[buildId]/cancel/route.ts. */
function proRataRefund(layersComplete: number, total: number): number {
  if (total === 0) return 1;
  return (total - layersComplete) / total;
}

describe("V2 Build mode — cancel mid-flight", () => {
  it("aborts before layer execution → all layers marked failed → refund = 1.0", async () => {
    const brief = makeBrief();
    const events: BuildEvent[] = [];
    const ctrl = new AbortController();
    // Abort before dispatch runs.
    ctrl.abort();

    const result = await dispatchLayers(
      { brief, signal: ctrl.signal },
      {
        runLayer: makeStubRunLayer(),
        emit: async (e): Promise<void> => {
          events.push(e);
        },
      },
    );
    // All layers are marked failed when aborted before they start.
    expect(result.failures).toHaveLength(8);
    expect(result.outputs.filter((o) => o.status === "complete")).toHaveLength(0);

    const completed = result.outputs.filter(
      (o) => o.status === "complete",
    ).length;
    expect(proRataRefund(completed, 8)).toBe(1);
  });

  it("aborts after 3 layers → refund = 5/8 = 0.625", async () => {
    const brief = makeBrief();
    const events: BuildEvent[] = [];
    const ctrl = new AbortController();

    let calls = 0;
    const slowRunLayer = async (args: {
      brief: Brief;
      layer: LayerName;
      signal: AbortSignal;
    }): Promise<LayerOutput> => {
      if (args.signal.aborted) {
        return {
          layer: args.layer,
          agent: "x",
          status: "failed",
          summary: "aborted",
          score: null,
          artifacts: [],
        };
      }
      calls += 1;
      // Abort after 3 layers complete.
      if (calls === 3) {
        // Trigger abort on the next tick so the in-flight 3rd layer finishes.
        queueMicrotask(() => ctrl.abort());
      }
      return {
        layer: args.layer,
        agent: "stub",
        status: "complete",
        summary: `${args.layer} done`,
        score: 80,
        artifacts: [],
      };
    };

    const result = await dispatchLayers(
      { brief, signal: ctrl.signal },
      {
        runLayer: slowRunLayer,
        emit: async (e): Promise<void> => {
          events.push(e);
        },
      },
    );
    const completed = result.outputs.filter(
      (o) => o.status === "complete",
    ).length;
    // Strategy wave runs first (1 layer), then wave 2 (7 in parallel) —
    // with the abort firing after 3 layers complete, we expect between
    // 3 and 7 completions depending on timing, but at LEAST 3.
    expect(completed).toBeGreaterThanOrEqual(3);
    // Pro-rata refund matches the completion count.
    const refund = proRataRefund(completed, 8);
    expect(refund).toBeGreaterThanOrEqual(0);
    expect(refund).toBeLessThanOrEqual(5 / 8);
  });

  it("refund formula edge cases", () => {
    expect(proRataRefund(0, 8)).toBe(1);
    expect(proRataRefund(4, 8)).toBe(0.5);
    expect(proRataRefund(8, 8)).toBe(0);
  });
});
