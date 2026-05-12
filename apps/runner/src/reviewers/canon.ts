/**
 * Studio Zero — Canon reviewer (brand).
 *
 * Phase 9 M1 Batch 2 (Forge-2). STUB at M1.
 */
import type { ReviewerContext, ReviewerResult } from "./index.js";
import type { FindingRow } from "../findings-writer.js";

export async function runCanon(
  ctx: ReviewerContext,
): Promise<ReviewerResult> {
  ctx.emitter.emit({
    kind: "progress",
    agent: "canon",
    phase: "starting",
    pct: 0,
  });

  await ctx.gateway.message(
    {
      reviewerId: "canon",
      system: "You are Canon — brand consistency reviewer.",
      messages: [
        {
          role: "user",
          content: `Audit project ${ctx.runId} for brand inconsistency.`,
        },
      ],
      modelClass: "fast",
    },
    ctx.signal,
  );

  const finding: FindingRow = {
    id: "F-006",
    run_id: ctx.runId,
    tenant_id: ctx.tenantId,
    reviewer: "canon",
    severity: "Polish",
    layer: "brand",
    summary: "[M1 mock] Two heading sizes mix on the pricing page.",
    evidence: {
      type: "file",
      path: "src/pages/pricing.tsx",
      line_start: 22,
    },
    recommendation:
      "Align heading scale to the design system's H2 token on pricing.",
    estimated_effort: "S",
    wcag_sc: null,
  };

  ctx.emitter.emit({
    kind: "finding",
    finding: finding as unknown as Record<string, unknown>,
  });
  ctx.emitter.emit({
    kind: "progress",
    agent: "canon",
    phase: "complete",
    pct: 100,
  });

  return {
    reviewer: "canon",
    status: "complete",
    findings: [finding],
  };
}
