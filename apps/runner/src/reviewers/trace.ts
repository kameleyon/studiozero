/**
 * Studio Zero — Trace reviewer (flow).
 *
 * Phase 9 M1 Batch 2 (Forge-2). STUB at M1.
 */
import type { ReviewerContext, ReviewerResult } from "./index.js";
import type { FindingRow } from "../findings-writer.js";

export async function runTrace(
  ctx: ReviewerContext,
): Promise<ReviewerResult> {
  ctx.emitter.emit({
    kind: "progress",
    agent: "trace",
    phase: "starting",
    pct: 0,
  });

  await ctx.gateway.message(
    {
      reviewerId: "trace",
      system: "You are Trace — user-flow reviewer.",
      messages: [
        {
          role: "user",
          content: `Audit project ${ctx.runId} for flow regressions.`,
        },
      ],
      modelClass: "thoughtful",
    },
    ctx.signal,
  );

  const finding: FindingRow = {
    id: "F-005",
    run_id: ctx.runId,
    tenant_id: ctx.tenantId,
    reviewer: "trace",
    severity: "Major",
    layer: "flow",
    summary: "[M1 mock] Checkout success state has no 'next step' affordance.",
    evidence: {
      type: "file",
      path: "src/pages/checkout/success.tsx",
      line_start: 15,
    },
    recommendation:
      "Surface the post-purchase next step (e.g. 'View your audit' button) within the success card.",
    estimated_effort: "M",
    wcag_sc: null,
  };

  ctx.emitter.emit({
    kind: "finding",
    finding: finding as unknown as Record<string, unknown>,
  });
  ctx.emitter.emit({
    kind: "progress",
    agent: "trace",
    phase: "complete",
    pct: 100,
  });

  return {
    reviewer: "trace",
    status: "complete",
    findings: [finding],
  };
}
