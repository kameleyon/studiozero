/**
 * Studio Zero — Halo reviewer (accessibility).
 *
 * Phase 9 M1 Batch 2 (Forge-2). STUB at M1: emits one canned mock
 * finding. M1+1 wires a real LLM call with the Halo system prompt
 * plus axe-core integration for WCAG SC evidence.
 */
import type { ReviewerContext, ReviewerResult } from "./index.js";
import type { FindingRow } from "../findings-writer.js";

export async function runHalo(
  ctx: ReviewerContext,
): Promise<ReviewerResult> {
  ctx.emitter.emit({
    kind: "progress",
    agent: "halo",
    phase: "starting",
    pct: 0,
  });

  await ctx.gateway.message(
    {
      reviewerId: "halo",
      system: "You are Halo — accessibility (WCAG) reviewer.",
      messages: [
        {
          role: "user",
          content: `Audit project ${ctx.runId} for WCAG SC violations.`,
        },
      ],
      modelClass: "thoughtful",
    },
    ctx.signal,
  );

  const finding: FindingRow = {
    id: "F-002",
    run_id: ctx.runId,
    tenant_id: ctx.tenantId,
    reviewer: "halo",
    severity: "Major",
    layer: "accessibility",
    summary: "[M1 mock] Form input lacks programmatic label association.",
    evidence: {
      type: "file",
      path: "src/components/SignupForm.tsx",
      line_start: 42,
      line_end: 48,
    },
    recommendation:
      "Associate the visible label with the input via htmlFor / id pairing OR wrap the input inside <label>.",
    estimated_effort: "S",
    wcag_sc: ["1.3.1", "4.1.2"],
  };

  ctx.emitter.emit({
    kind: "finding",
    finding: finding as unknown as Record<string, unknown>,
  });
  ctx.emitter.emit({
    kind: "progress",
    agent: "halo",
    phase: "complete",
    pct: 100,
  });

  return {
    reviewer: "halo",
    status: "complete",
    findings: [finding],
  };
}
