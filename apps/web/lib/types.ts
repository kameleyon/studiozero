/**
 * Shared TypeScript types for Studio Zero's M1 mock app.
 *
 * The state names + verdict names + reviewer names below are STABLE
 * contracts that real M1+1 wiring must preserve. They mirror:
 *  - `architecture/database/migration-order.md` runs.state ENUM
 *  - `architecture/schemas/audit-output.v1.schema.json` `verdict` enum
 *  - `architecture/decisions.md` (reviewer roster)
 *
 * Owner: Forge. Reviewed by: Atlas (state names) + Jury (verdict names).
 */

/**
 * Run state — string literal union mirrors `runs.state` ENUM from PRD's
 * audit-run-state-machine.md. Do NOT invent state names; the mock state
 * machine in `lib/run-state-machine.ts` traverses these.
 */
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

/**
 * Verdict — one of three terminal verdicts per PRD §7.2 Step D.
 * Underscored for SQL-friendliness; UI renders the human form
 * ("PASS WITH FIXES") via `verdictLabel()`.
 */
export type Verdict = "FAIL" | "PASS_WITH_FIXES" | "PASS";

export function verdictLabel(v: Verdict): string {
  switch (v) {
    case "FAIL":
      return "FAIL";
    case "PASS_WITH_FIXES":
      return "PASS WITH FIXES";
    case "PASS":
      return "PASS";
  }
}

/** Severity ladder — five rungs per PRD §10. */
export type Severity = "blocker" | "critical" | "major" | "minor" | "polish";

/** Reviewer roster — 6 reviewers per Comprehensive depth. */
export type ReviewerName =
  | "Optic"
  | "Halo"
  | "Proof"
  | "Compass"
  | "Canon"
  | "Compass+Audience";

/** Per-reviewer substate inside `reviewers_running`. */
export type ReviewerStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed_transient"
  | "retried"
  | "failed_terminal";

export interface ReviewerProgress {
  reviewer: ReviewerName;
  status: ReviewerStatus;
  phase: "reading_repo" | "running_heuristics" | "synthesizing" | "done" | "idle";
  partialFindings: number;
  elapsedMs: number;
}
