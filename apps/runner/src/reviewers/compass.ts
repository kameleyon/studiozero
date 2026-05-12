/**
 * Studio Zero — Compass reviewer (audience).
 *
 * Phase 9 M1 Batch 2 (Forge-2). STUB at M1.
 */
import type { ReviewerContext, ReviewerResult } from "./index.js";
import type { FindingRow } from "../findings-writer.js";

export async function runCompass(
  ctx: ReviewerContext,
): Promise<ReviewerResult> {
  ctx.emitter.emit({
    kind: "progress",
    agent: "compass",
    phase: "starting",
    pct: 0,
  });

  await ctx.gateway.message(
    {
      reviewerId: "compass",
      system: "You are Compass — audience-fit reviewer.",
      messages: [
        {
          role: "user",
          content: `Audit project ${ctx.runId} for audience-fit issues.`,
        },
      ],
      modelClass: "thoughtful",
    },
    ctx.signal,
  );

  const finding: FindingRow = {
    id: "F-004",
    run_id: ctx.runId,
    tenant_id: ctx.tenantId,
    reviewer: "compass",
    severity: "Minor",
    layer: "audience",
    summary:
      "[M1 mock] Pricing page assumes technical buyer; non-technical readers may miss value.",
    evidence: { type: "url", url: "https://example.com/pricing" },
    recommendation:
      "Add a one-sentence outcome statement at the top of pricing.",
    estimated_effort: "S",
    wcag_sc: null,
  };

  ctx.emitter.emit({
    kind: "finding",
    finding: finding as unknown as Record<string, unknown>,
  });
  ctx.emitter.emit({
    kind: "progress",
    agent: "compass",
    phase: "complete",
    pct: 100,
  });

  return {
    reviewer: "compass",
    status: "complete",
    findings: [finding],
  };
}
