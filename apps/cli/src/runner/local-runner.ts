/**
 * Studio Zero — local runner (CLI mode entrypoint).
 *
 * Phase 9 M3 Batch 1 (Forge). Drives one audit run end-to-end on the
 * customer's machine. Mirrors the contract of `apps/runner` so the
 * web verdict surface renders identically regardless of mode (SC 3.2.4).
 *
 * Flow per `ia/user-flows/cli-pairing-and-tamper.md` C6 → C7:
 *
 *   1. detect Claude Code            → claude-code-detect.ts
 *   2. pick reviewer set per depth   → reviewers-local.ts
 *   3. run reviewers in parallel     → reviewers-local.ts (mocked at M3)
 *   4. compose AuditOutput per §9.4  → here
 *   5. sign verdict                  → verdict-sign.ts (D7)
 *   6. emit progress events upstream → caller (run.ts → upload-verdict.ts)
 *
 * Key invariant (PRD §13.4 + §13.5): the local runner reads the project
 * folder from disk for the LLM call, but the returned `AuditOutput`
 * carries ONLY findings + score + verdict. No source bytes are
 * included. The caller (commands/run.ts) is the gatekeeper for the
 * upload — even if a hostile finding shape tried to embed bytes, the
 * studio-client's maxBodyBytes guard would refuse the POST.
 */
import { detectClaudeCode, type ClaudeCodeStatus } from "./claude-code-detect.js";
import {
  reviewersForDepth,
  runReviewersLocal,
  type LocalReviewerResult,
  type ReviewerId,
  type AuditDepth,
} from "./reviewers-local.js";
import {
  signVerdict,
  sha256Hex,
  type VerdictBody,
} from "./verdict-sign.js";
import { watermarkFor } from "../watermark/private-run-self-audited.js";

export interface LocalRunOptions {
  runId: string;
  projectPath: string;
  depth: AuditDepth;
  customerReviewers?: ReviewerId[];
  /** Cached binary hash (from auth.json — pair time). */
  binaryHash: string;
  /** When true, reviewers return canned findings (M3 default). */
  mockReviewers: boolean;
  /** Optional ClaudeCodeStatus override (testing). */
  claudeCode?: ClaudeCodeStatus;
  /** Cancellation signal (Ctrl-C in commands/run.ts). */
  signal: AbortSignal;
  /** Progress event sink. */
  onProgress?: (evt: {
    reviewer: ReviewerId;
    phase: "starting" | "running" | "complete";
    pct: number;
  }) => void;
}

export interface LocalRunResult {
  /** Composed verdict body per audit-output.v1.schema.json. */
  verdict: VerdictBody;
  /** HMAC-SHA256(verdict_body_json, key=binary_hash). */
  signature: string;
  /** Per-reviewer pass/fail status. */
  reviewerResults: LocalReviewerResult[];
}

/**
 * Score weights mirror `apps/runner/score-engine` (Atlas-locked). The CLI
 * computes a tentative score locally so the customer sees a verdict
 * immediately; the server re-runs the deterministic score on receipt
 * (defence in depth — D7 lock means we don't trust the CLI to be the
 * single source of truth for the score).
 */
const SEVERITY_WEIGHT: Record<string, number> = {
  Blocker: 25,
  Critical: 15,
  Major: 8,
  Minor: 3,
  Polish: 1,
};

function tentativeScore(findings: ReadonlyArray<{ severity: string }>): number {
  let deduction = 0;
  for (const f of findings) deduction += SEVERITY_WEIGHT[f.severity] ?? 0;
  // round-half-to-even per PRD §10
  return Math.max(0, Math.round(100 - deduction));
}

function verdictFromScore(
  score: number,
  hasBlocker: boolean,
): "PASS" | "PASS WITH FIXES" | "FAIL" {
  if (hasBlocker) return "FAIL";
  if (score >= 90) return "PASS";
  if (score >= 60) return "PASS WITH FIXES";
  return "FAIL";
}

/** Empty-but-shaped score breakdown so the schema validates. */
function emptyBreakdown(): Record<string, number> {
  return { ux: 0, accessibility: 0, copy: 0, brand: 0, flow: 0, audience: 0 };
}

/**
 * Run the audit locally + return the signed verdict. Does NOT POST.
 * The caller (commands/run.ts) owns the upload step and the AI-Act
 * disclosure header. Separation keeps this function pure-ish for tests.
 */
export async function runLocalAudit(
  opts: LocalRunOptions,
): Promise<LocalRunResult> {
  const claudeCode = opts.claudeCode ?? detectClaudeCode();
  const set = reviewersForDepth(opts.depth, opts.customerReviewers);

  const reviewerResults = await runReviewersLocal(set, {
    runId: opts.runId,
    projectPath: opts.projectPath,
    claudeCode,
    mock: opts.mockReviewers,
    signal: opts.signal,
    ...(opts.onProgress !== undefined ? { onProgress: opts.onProgress } : {}),
  });

  const allFindings = reviewerResults.flatMap((r) => r.findings);
  const score = tentativeScore(allFindings);
  const hasBlocker = allFindings.some((f) => f.severity === "Blocker");

  const verdict: VerdictBody = {
    runId: opts.runId,
    verdict: verdictFromScore(score, hasBlocker),
    score,
    scoreEngineVersion: "v1",
    audience: "unspecified",
    watermark: watermarkFor("cli"),
    findings: allFindings.map((f) => ({ ...f })),
    scoreBreakdown: emptyBreakdown(),
    sealedAt: new Date().toISOString(),
    claimedBinaryHash: opts.binaryHash,
  };

  const signature = signVerdict(verdict, opts.binaryHash);
  return { verdict, signature, reviewerResults };
}

/** Re-export for caller convenience. */
export { sha256Hex };
