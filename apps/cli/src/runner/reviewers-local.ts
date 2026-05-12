/**
 * Studio Zero — local reviewer dispatch (CLI mode).
 *
 * Phase 9 M3 Batch 1 (Forge). CLI mode runs each reviewer locally,
 * invoking the customer's Claude Code installation with the reviewer's
 * system prompt + the local folder context. Source code stays on disk
 * — we read it for the LLM call (in the customer's process), but the
 * CLI never POSTs source bytes back to the web (PRD §13.4 + §13.5).
 *
 * M3 state: reviewers return canned mock findings so the rest of the
 * pipeline (signing, watermark, upload) can be tested end-to-end. The
 * real Claude Code subprocess invocation is the M3+1 carry (documented
 * in README "What's mocked at M3").
 *
 * Why the reviewer ID set mirrors `apps/runner/src/reviewers/index.ts`:
 * the audit-output schema is mode-agnostic. The web verdict surface
 * renders the same finding shape whether the verdict came from the
 * hosted runner (BYOK / Managed) or from the CLI. SC 3.2.4 demands
 * identical render across surfaces.
 */
import type { ClaudeCodeStatus } from "./claude-code-detect.js";

export type ReviewerId =
  | "optic"
  | "halo"
  | "proof"
  | "compass"
  | "trace"
  | "canon";

export type AuditDepth = "quick" | "custom" | "comprehensive";

export interface LocalFinding {
  id: string;
  reviewer: ReviewerId;
  severity: "Blocker" | "Critical" | "Major" | "Minor" | "Polish";
  layer: "design" | "frontend" | "backend" | "data" | "ops" | "copy";
  summary: string;
  evidence: Record<string, unknown>;
  recommendation: string;
  estimated_effort: "S" | "M" | "L";
}

export interface LocalReviewerResult {
  reviewer: ReviewerId;
  status: "complete" | "failed_terminal";
  findings: LocalFinding[];
  failureCode?: string;
}

export interface LocalReviewerContext {
  runId: string;
  /** Absolute path to the project folder being audited. Never uploaded. */
  projectPath: string;
  /** Claude Code install status; reviewers refuse to run if !found. */
  claudeCode: ClaudeCodeStatus;
  /** When true, reviewers return canned findings (M3 default). */
  mock: boolean;
  /** Cancellation signal (Ctrl-C → AbortController). */
  signal: AbortSignal;
  /** Per-event callback for progress streaming. */
  onProgress?: (evt: {
    reviewer: ReviewerId;
    phase: "starting" | "running" | "complete";
    pct: number;
  }) => void;
}

/** Same depth → reviewer map as `apps/runner`. SC 3.2.4 consistency. */
export function reviewersForDepth(
  depth: AuditDepth,
  customer?: ReviewerId[],
): ReviewerId[] {
  if (depth === "quick") return ["optic", "halo", "proof"];
  if (depth === "custom") {
    if (!customer || customer.length === 0) {
      throw new Error(
        "[cli] depth='custom' requires non-empty customer_reviewers",
      );
    }
    return customer;
  }
  return ["optic", "halo", "proof", "compass", "trace", "canon"];
}

/**
 * Run a single reviewer locally. At M3 this is canned. M3+1 will spawn
 * Claude Code with the reviewer's system prompt + the project folder
 * mounted into the process's CWD.
 */
export async function runReviewerLocal(
  reviewer: ReviewerId,
  ctx: LocalReviewerContext,
): Promise<LocalReviewerResult> {
  if (!ctx.claudeCode.found) {
    return {
      reviewer,
      status: "failed_terminal",
      findings: [],
      failureCode: "claude_code_not_installed",
    };
  }
  if (ctx.signal.aborted) {
    return {
      reviewer,
      status: "failed_terminal",
      findings: [],
      failureCode: "cancelled",
    };
  }

  ctx.onProgress?.({ reviewer, phase: "starting", pct: 0 });

  // M3 stub: yield to the event loop so abort signals + progress
  // emitters interleave correctly. M3+1 replaces this with the actual
  // subprocess + streaming JSON parse.
  await new Promise<void>((r) => setImmediate(r));
  ctx.onProgress?.({ reviewer, phase: "running", pct: 50 });

  if (ctx.mock) {
    const finding: LocalFinding = mockFindingFor(reviewer, ctx.runId);
    ctx.onProgress?.({ reviewer, phase: "complete", pct: 100 });
    return { reviewer, status: "complete", findings: [finding] };
  }

  // Real subprocess invocation lands in M3+1.
  // const result = await spawnClaudeCode(ctx.claudeCode.binPath, ...)
  // For M3 we fail-soft so the pipeline still produces a verdict.
  ctx.onProgress?.({ reviewer, phase: "complete", pct: 100 });
  return {
    reviewer,
    status: "failed_terminal",
    findings: [],
    failureCode: "reviewer_real_mode_not_yet_wired_m3+1",
  };
}

/**
 * Run a set of reviewers in parallel. Mirrors the hosted runner's
 * `runReviewers` contract so Jury synthesis (M3 Batch 3) can consume
 * the same shape regardless of mode.
 */
export async function runReviewersLocal(
  set: ReviewerId[],
  ctx: LocalReviewerContext,
): Promise<LocalReviewerResult[]> {
  const promises = set.map(async (id) => {
    try {
      return await runReviewerLocal(id, ctx);
    } catch (err) {
      const code = ctx.signal.aborted ? "cancelled" : "reviewer_failed";
      return {
        reviewer: id,
        status: "failed_terminal" as const,
        findings: [],
        failureCode: `${code}: ${(err as Error).message}`,
      };
    }
  });
  return Promise.all(promises);
}

/** Canned finding so the rest of the pipeline can be exercised. */
function mockFindingFor(reviewer: ReviewerId, runId: string): LocalFinding {
  const base: Record<ReviewerId, Omit<LocalFinding, "id">> = {
    optic: {
      reviewer: "optic",
      severity: "Minor",
      layer: "design",
      summary: "[M3 mock] Primary CTA contrast on hero is borderline.",
      evidence: { type: "file", file: "src/components/Hero.tsx", lines: "12-18" },
      recommendation:
        "Increase contrast ratio of primary CTA to >= 4.5:1 against hero gradient.",
      estimated_effort: "S",
    },
    halo: {
      reviewer: "halo",
      severity: "Major",
      layer: "frontend",
      summary: "[M3 mock] Form labels missing on /signup inputs.",
      evidence: { type: "file", file: "src/pages/signup.tsx", lines: "44-72" },
      recommendation:
        "Add explicit <label> elements for every input. SC 1.3.1 + SC 3.3.2.",
      estimated_effort: "S",
    },
    proof: {
      reviewer: "proof",
      severity: "Polish",
      layer: "copy",
      summary: "[M3 mock] CTA copy reads at grade 11; target is grade 8.",
      evidence: { type: "file", file: "src/copy/cta.ts", lines: "1-30" },
      recommendation: "Rewrite primary CTA copy to grade 8 reading level.",
      estimated_effort: "S",
    },
    compass: {
      reviewer: "compass",
      severity: "Minor",
      layer: "copy",
      summary:
        "[M3 mock] Landing copy targets enterprise; audience config is SMB.",
      evidence: { type: "file", file: "src/pages/index.tsx", lines: "1-50" },
      recommendation:
        "Align landing-page copy with declared SMB audience in audience-config.json.",
      estimated_effort: "M",
    },
    trace: {
      reviewer: "trace",
      severity: "Major",
      layer: "frontend",
      summary: "[M3 mock] Signup flow has a dead-end on email-already-used.",
      evidence: { type: "file", file: "src/pages/signup.tsx", lines: "120-160" },
      recommendation:
        "Add 'Sign in instead' CTA when email is already registered. Avoid the empty-state dead end.",
      estimated_effort: "M",
    },
    canon: {
      reviewer: "canon",
      severity: "Polish",
      layer: "design",
      summary: "[M3 mock] Primary button uses gradient outside brand token set.",
      evidence: { type: "file", file: "src/styles/buttons.css", lines: "1-20" },
      recommendation:
        "Replace gradient with tokenized brand color brand.primary.500.",
      estimated_effort: "S",
    },
  };
  return { id: `F-${reviewer}-${runId.slice(0, 6)}`, ...base[reviewer] };
}
