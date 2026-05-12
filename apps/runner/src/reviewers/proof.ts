/**
 * Studio Zero — Proof reviewer (copy).
 *
 * Phase 9 M1 Batch 2 (Forge-2). STUB at M1.
 */
import type { ReviewerContext, ReviewerResult } from "./index.js";
import type { FindingRow } from "../findings-writer.js";

export async function runProof(
  ctx: ReviewerContext,
): Promise<ReviewerResult> {
  ctx.emitter.emit({
    kind: "progress",
    agent: "proof",
    phase: "starting",
    pct: 0,
  });

  await ctx.gateway.message(
    {
      reviewerId: "proof",
      system: "You are Proof — copy reviewer.",
      messages: [
        {
          role: "user",
          content: `Audit project ${ctx.runId} for copy issues.`,
        },
      ],
      modelClass: "fast",
    },
    ctx.signal,
  );

  const finding: FindingRow = {
    id: "F-003",
    run_id: ctx.runId,
    tenant_id: ctx.tenantId,
    reviewer: "proof",
    severity: "Polish",
    layer: "copy",
    summary: "[M1 mock] CTA label is generic; consider verb-first phrasing.",
    evidence: {
      type: "file",
      path: "src/components/HeroCTA.tsx",
      line_start: 18,
      snippet: '<Button>Get started</Button>',
    },
    recommendation:
      "Replace 'Get started' with a verb that names the outcome, e.g. 'Audit my project'.",
    estimated_effort: "S",
    wcag_sc: null,
  };

  ctx.emitter.emit({
    kind: "finding",
    finding: finding as unknown as Record<string, unknown>,
  });
  ctx.emitter.emit({
    kind: "progress",
    agent: "proof",
    phase: "complete",
    pct: 100,
  });

  return {
    reviewer: "proof",
    status: "complete",
    findings: [finding],
  };
}
