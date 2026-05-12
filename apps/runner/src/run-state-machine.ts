/**
 * Studio Zero — runner-side run state machine.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Implements the runner-driven half of
 * `ia/user-flows/audit-run-state-machine.md`. Mirrors the `run_state`
 * ENUM in `architecture/database/tables.sql` (queued → dispatched →
 * reviewers_running → all_reviewers_complete → jury_synthesizing →
 * verdict_emitted; plus the unhappy terminals).
 *
 * Responsibility split:
 *   - the WEB APP drives `created` → `queued` (insert + enqueue)
 *   - THIS module drives every state after `queued` (pickup → terminal)
 *   - `archived` is driven by the nightly retention pg_cron job
 *
 * Every state transition:
 *   1. updates `runs.state` (via runner-JWT — RLS scoped to this run)
 *   2. emits an AuditEvent (progress/agent_log) to Realtime
 *
 * On cancel (runs.cancelled_at set externally):
 *   - the abort handle for this run is tripped
 *   - in-flight LLM/Edge fn calls AbortError
 *   - reviewers that finished have findings persisted (per partial-result
 *     boundary §14.2)
 *   - state transitions to `cancelled` (or `partial_completed` if ≥1
 *     reviewer completed)
 *
 * NOTE: persistence of `runs.state` is stubbed at M1 — the actual UPDATE
 * call lands at M1+1 when Atlas's `runs` table is queryable from this
 * worker (it's already created by migration 0001, but the RLS-via-
 * runner-JWT path lands with mint endpoint integration). At M1 we emit
 * the state-transition AuditEvent so the UI can render correctly via
 * Realtime; persistence is the M1+1 follow-up.
 */
import { reviewersForDepth, runReviewers } from "./reviewers/index.js";
import type {
  ReviewerContext,
  ReviewerId,
  AuditDepth,
  ReviewerResult,
} from "./reviewers/index.js";
import { synthesizeJury } from "./reviewers/jury.js";
import type { LlmGatewayClient } from "./llm-gateway-client.js";
import type { ScoreEngineClient } from "./score-engine-client.js";
import type { FindingsWriter } from "./findings-writer.js";
import type { RealtimeEmitter } from "./realtime-emitter.js";

/** Mirrors the `run_state` ENUM in tables.sql exactly. */
export type RunState =
  | "created"
  | "queued"
  | "dispatched"
  | "reviewers_running"
  | "all_reviewers_complete"
  | "jury_synthesizing"
  | "verdict_emitted"
  | "archived"
  | "cancelled"
  | "failed_recoverable"
  | "failed_terminal"
  | "partial_completed"
  | "suspended_violation";

export interface RunMachineInput {
  runId: string;
  tenantId: string;
  audience: string;
  depth: AuditDepth;
  customerReviewers?: ReviewerId[];
  projectPayload: Record<string, unknown>;
}

export interface RunMachineDeps {
  gateway: LlmGatewayClient;
  scoreEngine: ScoreEngineClient;
  findingsWriter: FindingsWriter;
  emitter: RealtimeEmitter;
  /** Hook fired on every state transition. Tests assert on this. */
  onStateChange: (state: RunState) => void;
  signal: AbortSignal;
}

export interface RunMachineResult {
  finalState: RunState;
  reviewerResults: ReviewerResult[];
  jurySynthesized: boolean;
  failureCode?: string;
}

/**
 * Drive one run from `dispatched` through terminal. The caller (pg-boss
 * worker) hands us a pre-minted token via the deps refresher; we run
 * reviewers in parallel, persist their findings, synthesize via Jury,
 * and emit the final_verdict event.
 */
export async function runAudit(
  input: RunMachineInput,
  deps: RunMachineDeps,
): Promise<RunMachineResult> {
  // ---- dispatched ----
  deps.onStateChange("dispatched");
  deps.emitter.emit({
    kind: "agent_log",
    agent: "jury", // jury == orchestrator label for log purposes pre-reviewer
    level: "info",
    message: `Run ${input.runId} dispatched to worker.`,
  });

  if (deps.signal.aborted) {
    deps.onStateChange("cancelled");
    return {
      finalState: "cancelled",
      reviewerResults: [],
      jurySynthesized: false,
      failureCode: "cancelled_before_dispatch",
    };
  }

  // ---- reviewers_running ----
  deps.onStateChange("reviewers_running");
  const set = reviewersForDepth(input.depth, input.customerReviewers);
  const ctx: ReviewerContext = {
    runId: input.runId,
    tenantId: input.tenantId,
    projectPayload: input.projectPayload,
    gateway: deps.gateway,
    emitter: deps.emitter,
    signal: deps.signal,
  };
  const reviewerResults = await runReviewers(set, ctx);

  // Persist each reviewer's findings as they arrive. (Stream-as-emitted
  // is the M1+1 enhancement; at M1 we batch-write after parallel finish.
  // The state-machine partial-result boundary §14.2 holds either way:
  // by the time we got here, every reviewer either completed or
  // failed_terminal.)
  for (const result of reviewerResults) {
    for (const finding of result.findings) {
      try {
        await deps.findingsWriter.insertFinding(finding, deps.signal);
      } catch (err) {
        // Don't crash the run on a single findings-writer failure — emit
        // an error event and continue. RLS denial here is a security
        // event (Shield gets paged); other failures are transient.
        deps.emitter.emit({
          kind: "error",
          recoverable: true,
          code: "findings_write_failed",
          message: (err as Error).message,
          agent: result.reviewer,
        });
      }
    }
  }

  // Did anyone complete? If zero completed → failed_terminal.
  const anyComplete = reviewerResults.some((r) => r.status === "complete");
  if (!anyComplete) {
    deps.onStateChange("failed_terminal");
    deps.emitter.emit({
      kind: "error",
      recoverable: false,
      code: "all_reviewers_failed",
      message: "Every reviewer reached failed_terminal.",
    });
    return {
      finalState: "failed_terminal",
      reviewerResults,
      jurySynthesized: false,
      failureCode: "all_reviewers_failed",
    };
  }

  // Cancellation between reviewers and Jury → partial_completed.
  if (deps.signal.aborted) {
    deps.onStateChange("partial_completed");
    return {
      finalState: "partial_completed",
      reviewerResults,
      jurySynthesized: false,
      failureCode: "cancelled_before_jury",
    };
  }

  // ---- all_reviewers_complete ----
  deps.onStateChange("all_reviewers_complete");

  // ---- jury_synthesizing ----
  deps.onStateChange("jury_synthesizing");
  const partial = reviewerResults.some((r) => r.status === "failed_terminal");

  try {
    await synthesizeJury({
      runId: input.runId,
      tenantId: input.tenantId,
      audience: input.audience,
      reviewerResults,
      partial,
      gateway: deps.gateway,
      scoreEngine: deps.scoreEngine,
      emitter: deps.emitter,
      signal: deps.signal,
    });
  } catch (err) {
    // Jury synth failure (schema_invalid OR LLM provider issue) → failed_terminal.
    const code =
      (err as Error).message.includes("schema") ? "schema_invalid" : "jury_failed";
    deps.onStateChange("failed_terminal");
    deps.emitter.emit({
      kind: "error",
      recoverable: false,
      code,
      message: (err as Error).message,
      agent: "jury",
    });
    return {
      finalState: "failed_terminal",
      reviewerResults,
      jurySynthesized: false,
      failureCode: code,
    };
  }

  // ---- verdict_emitted (terminal happy) OR partial_completed ----
  const finalState: RunState = partial ? "partial_completed" : "verdict_emitted";
  deps.onStateChange(finalState);
  await deps.emitter.flush();

  return {
    finalState,
    reviewerResults,
    jurySynthesized: true,
  };
}
