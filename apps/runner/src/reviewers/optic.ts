/**
 * Studio Zero — Optic reviewer (UX heuristics).
 *
 * Phase 9 M1 Batch 2 (Forge-2). STUB at M1: emits one canned mock
 * finding so the run state machine can be exercised end-to-end without
 * a real Anthropic call. M1+1 replaces this body with a real
 * llm-gateway-client.message() call carrying Optic's system prompt.
 */
import type { ReviewerContext, ReviewerResult } from "./index.js";
import type { FindingRow } from "../findings-writer.js";

export async function runOptic(
  ctx: ReviewerContext,
): Promise<ReviewerResult> {
  ctx.emitter.emit({
    kind: "progress",
    agent: "optic",
    phase: "starting",
    pct: 0,
  });

  // Mock LLM call (the gateway client returns a canned response when
  // MOCK_LLM_GATEWAY=true). M1+1: switch to a real call with the
  // optic system prompt + reasoning to derive findings.
  await ctx.gateway.message(
    {
      reviewerId: "optic",
      system: "You are Optic — UX heuristics reviewer.",
      messages: [
        {
          role: "user",
          content: `Audit project ${ctx.runId} for UX heuristic violations.`,
        },
      ],
      modelClass: "fast",
    },
    ctx.signal,
  );

  ctx.emitter.emit({
    kind: "progress",
    agent: "optic",
    phase: "writing",
    pct: 80,
  });

  const finding: FindingRow = {
    id: "F-001",
    run_id: ctx.runId,
    tenant_id: ctx.tenantId,
    reviewer: "optic",
    severity: "Minor",
    layer: "design",
    summary: "[M1 mock] CTA contrast on landing hero is borderline.",
    evidence: {
      type: "screenshot",
      storage_path: "evidence/mock-cta-contrast.png",
      alt: "Landing hero showing primary CTA on gradient background",
    },
    recommendation:
      "Increase contrast ratio of primary CTA to >= 4.5:1 against the hero gradient.",
    estimated_effort: "S",
    wcag_sc: ["1.4.3"],
  };

  ctx.emitter.emit({
    kind: "finding",
    finding: finding as unknown as Record<string, unknown>,
  });
  ctx.emitter.emit({
    kind: "progress",
    agent: "optic",
    phase: "complete",
    pct: 100,
  });

  return {
    reviewer: "optic",
    status: "complete",
    findings: [finding],
  };
}
