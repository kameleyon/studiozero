/**
 * Studio Zero — reviewer dispatch.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Per PRD §9.3 + audit-run-state-machine.md
 * the reviewer set depends on audit `depth`:
 *
 *   quick         → optic, halo, proof              (3 reviewers, ~5–10 min)
 *   custom        → user-selected subset            (CONSULT depth + customer_reviewers)
 *   comprehensive → optic, halo, proof, compass,    (6 reviewers + jury, ~20–45 min)
 *                   trace, canon, then jury
 *
 * This module owns: pick the set, fan out in parallel, collect findings.
 * Per-reviewer failure handling (retry up to 2x; mark failed_terminal;
 * Jury proceeds with partial verdict) lives in run-state-machine.ts;
 * this module just runs each reviewer and returns its findings array
 * plus a status.
 *
 * At M1 each reviewer is a stub that emits one canned mock finding.
 * M1+1 replaces the stub with a real LLM call via llm-gateway-client.
 */
import type { LlmGatewayClient } from "../llm-gateway-client.js";
import type { RealtimeEmitter } from "../realtime-emitter.js";
import type { FindingRow } from "../findings-writer.js";

import { runOptic } from "./optic.js";
import { runHalo } from "./halo.js";
import { runProof } from "./proof.js";
import { runCompass } from "./compass.js";
import { runTrace } from "./trace.js";
import { runCanon } from "./canon.js";

export type ReviewerId =
  | "optic"
  | "halo"
  | "proof"
  | "compass"
  | "trace"
  | "canon";

export type AuditDepth = "quick" | "custom" | "comprehensive";

/** What a reviewer needs to do its job. */
export interface ReviewerContext {
  runId: string;
  tenantId: string;
  /** Sanitized project payload — the runner has already stripped any
   *  unsafe bytes per ingestion-limits + path-traversal-guard. */
  projectPayload: Record<string, unknown>;
  gateway: LlmGatewayClient;
  emitter: RealtimeEmitter;
  signal: AbortSignal;
}

/** What a reviewer returns. */
export interface ReviewerResult {
  reviewer: ReviewerId;
  status: "complete" | "failed_terminal";
  findings: FindingRow[];
  /** Set if status === 'failed_terminal'. Maps to error.code. */
  failureCode?: string;
}

/** Pick the reviewer set for a given depth + optional custom selection. */
export function reviewersForDepth(
  depth: AuditDepth,
  customerReviewers?: ReviewerId[],
): ReviewerId[] {
  if (depth === "quick") return ["optic", "halo", "proof"];
  if (depth === "custom") {
    if (!customerReviewers || customerReviewers.length === 0) {
      throw new Error(
        "[runner] reviewers: depth='custom' requires non-empty customer_reviewers",
      );
    }
    return customerReviewers;
  }
  // comprehensive
  return ["optic", "halo", "proof", "compass", "trace", "canon"];
}

/** Reviewer dispatch table. */
type ReviewerFn = (ctx: ReviewerContext) => Promise<ReviewerResult>;

const REVIEWER_FNS: Record<ReviewerId, ReviewerFn> = {
  optic: runOptic,
  halo: runHalo,
  proof: runProof,
  compass: runCompass,
  trace: runTrace,
  canon: runCanon,
};

/**
 * Run all reviewers in `set` in parallel. Honors the AbortSignal — any
 * reviewer that does not finish before the signal aborts returns with
 * status='failed_terminal' and failureCode='cancelled'.
 *
 * Returns one ReviewerResult per reviewer, in stable order matching `set`.
 */
export async function runReviewers(
  set: ReviewerId[],
  ctx: ReviewerContext,
): Promise<ReviewerResult[]> {
  const promises = set.map(async (id) => {
    const fn = REVIEWER_FNS[id];
    try {
      return await fn(ctx);
    } catch (err) {
      // Each reviewer is responsible for its own retry per §14.2. By the
      // time control reaches this catch, retries are exhausted. Mark
      // failed_terminal so Jury can proceed with a partial verdict.
      const message = (err as Error).message ?? String(err);
      const code = ctx.signal.aborted ? "cancelled" : "reviewer_failed";
      return {
        reviewer: id,
        status: "failed_terminal" as const,
        findings: [] as FindingRow[],
        failureCode: `${code}: ${message}`,
      };
    }
  });
  return Promise.all(promises);
}
