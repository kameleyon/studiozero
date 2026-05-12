/**
 * Studio Zero — Jury synthesizer.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Per audit-run-state-machine.md
 * `jury_synthesizing` state: after every reviewer has reached a terminal
 * substate (`complete` or `failed_terminal`), Jury composes the final
 * audit-output v1 payload from the aggregated findings array, calls the
 * score-engine Edge Function (ARCH-D7: NEVER local), and emits a
 * `final_verdict` AuditEvent.
 *
 * Jury is uncancellable per state-machine.md `all_reviewers_complete`
 * (cancel button is disabled during this < 30s window — Trace UX exemption).
 * The signal we receive here is still threaded through so process-level
 * SIGTERM can abort cleanly during graceful shutdown.
 */
import type { LlmGatewayClient } from "../llm-gateway-client.js";
import type { ScoreEngineClient } from "../score-engine-client.js";
import type { RealtimeEmitter } from "../realtime-emitter.js";
import type { FindingRow } from "../findings-writer.js";
import type { ReviewerResult } from "./index.js";

export interface JurySynthesizeOptions {
  runId: string;
  tenantId: string;
  audience: string;
  reviewerResults: ReviewerResult[];
  partial: boolean;
  gateway: LlmGatewayClient;
  scoreEngine: ScoreEngineClient;
  emitter: RealtimeEmitter;
  signal: AbortSignal;
}

export interface JurySynthesizeResult {
  /** The AuditOutput payload — mirrors audit-output.v1.schema.json. */
  output: {
    verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
    score: number;
    score_engine_version: string;
    audience: string;
    watermark: "private-run-self-audited" | null;
    findings: FindingRow[];
    score_breakdown: {
      ux: number;
      accessibility: number;
      copy: number;
      brand: number;
      flow: number;
      audience: number;
    };
    partial: boolean;
    run_id: string;
    generated_at: string;
    score_engine_provenance?: { sha256: string };
  };
}

/**
 * Synthesize. Steps:
 *   1. Flatten findings from completed reviewers.
 *   2. (M1 stub) one LLM "synthesis" message — at M1+1 this becomes a
 *      narrative summary; at M1 we just acknowledge.
 *   3. Call score-engine Edge Function (ARCH-D7 single source of truth).
 *   4. Compose AuditOutput shape; emit final_verdict event.
 */
export async function synthesizeJury(
  opts: JurySynthesizeOptions,
): Promise<JurySynthesizeResult> {
  opts.emitter.emit({
    kind: "progress",
    agent: "jury",
    phase: "starting",
    pct: 0,
  });

  // Step 1 — aggregate findings.
  const findings: FindingRow[] = [];
  for (const r of opts.reviewerResults) {
    if (r.status === "complete") findings.push(...r.findings);
  }

  // Step 2 — M1 stub synthesis message. M1+1: real narrative.
  await opts.gateway.message(
    {
      reviewerId: "jury",
      system: "You are Jury — synthesizer of the final verdict.",
      messages: [
        {
          role: "user",
          content: `Synthesize a final verdict for run ${opts.runId} from ${findings.length} finding(s).`,
        },
      ],
      modelClass: "thoughtful",
    },
    opts.signal,
  );

  opts.emitter.emit({
    kind: "progress",
    agent: "jury",
    phase: "reasoning",
    pct: 50,
  });

  // Step 3 — score via Edge Function (NEVER local per ARCH-D7).
  const scoreResult = await opts.scoreEngine.compute(
    {
      run_id: opts.runId,
      tenant_id: opts.tenantId,
      audience: opts.audience,
      findings: findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        reviewer: f.reviewer,
        layer: f.layer,
      })),
      partial: opts.partial,
    },
    opts.signal,
  );

  // Step 4 — compose AuditOutput.
  const output: JurySynthesizeResult["output"] = {
    verdict: scoreResult.verdict,
    score: scoreResult.score,
    score_engine_version: scoreResult.score_engine_version,
    audience: opts.audience,
    watermark: null,
    findings,
    score_breakdown: scoreResult.score_breakdown,
    partial: opts.partial,
    run_id: opts.runId,
    generated_at: new Date().toISOString(),
    ...(scoreResult.score_engine_provenance && {
      score_engine_provenance: scoreResult.score_engine_provenance,
    }),
  };

  opts.emitter.emit({
    kind: "progress",
    agent: "jury",
    phase: "complete",
    pct: 100,
  });
  opts.emitter.emit({
    kind: "final_verdict",
    result: output as unknown as Record<string, unknown>,
  });

  return { output };
}
