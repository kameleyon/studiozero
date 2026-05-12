/**
 * Studio Zero — `studio-zero run [path]` command.
 *
 * Phase 9 M3 Batch 1 (Forge). The primary command — runs one audit
 * against a local folder. Mirrors C6 → C9 of the pairing flow:
 *
 *   1. Read auth + assert it's not expired.
 *   2. Resolve project path (default cwd).
 *   3. Generate a runId locally (the web server cross-references against
 *      its dispatched jobs; if the runId matches a queued job we attach
 *      to it, otherwise we create a "self-initiated" run server-side).
 *   4. Detect Claude Code; warn if missing.
 *   5. Run reviewers via `local-runner.ts` (mocked at M3).
 *   6. Stream progress events to `/api/cli/runs/<id>/events`.
 *   7. Sign the verdict via D7 HMAC.
 *   8. POST the signed verdict to `/api/cli/runs/<id>/verdict`.
 *   9. Print the watermark text + verdict line.
 *
 * Privacy invariant (M3 exit gate via `cli-no-upload.spec.ts`):
 *   - The folder is read locally; the LLM call happens in the customer's
 *     Claude Code subprocess (their key, their compute).
 *   - The CLI POSTs only progress events, structured findings, and the
 *     signed verdict. No source bytes. The studio-client maxBodyBytes
 *     guard is the runtime safety; the contract test is the formal gate.
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { loadEnv } from "../env.js";
import { readAuth, isTokenExpired } from "../auth/pairing-token.js";
import { detectClaudeCode } from "../runner/claude-code-detect.js";
import { runLocalAudit } from "../runner/local-runner.js";
import { createColors } from "../ui/colors.js";
import { createProgressRenderer } from "../ui/progress.js";
import { postRunEvent, uploadVerdict } from "../network/upload-verdict.js";
import { watermarkBlock } from "../watermark/private-run-self-audited.js";

export interface RunCmdOpts {
  /** Folder to audit; defaults to process.cwd(). */
  projectPath?: string;
  /** Override depth. Defaults to 'quick' at M3. */
  depth?: "quick" | "custom" | "comprehensive";
  /** Customer-selected reviewer set (only used when depth='custom'). */
  reviewers?: string[];
  /** Skip uploading the verdict (used in tests + dry-run mode). */
  skipUpload?: boolean;
  /** Override the http fetcher (testing). */
  fetcher?: typeof fetch;
}

export interface RunCmdResult {
  ok: boolean;
  message: string;
  runId: string;
  verdict?: "PASS" | "PASS WITH FIXES" | "FAIL";
  signature?: string;
  signatureStatus?: "verified" | "mismatch" | "unrecognized_binary" | "unknown" | "skipped";
}

export async function runCommand(
  opts: RunCmdOpts = {},
): Promise<RunCmdResult> {
  const env = loadEnv();
  const colors = createColors();

  const auth = readAuth(env.configDir);
  if (!auth) {
    return {
      ok: false,
      runId: "",
      message: "Not signed in. Run `studio-zero login` first.",
    };
  }
  if (isTokenExpired(auth)) {
    return {
      ok: false,
      runId: "",
      message:
        "Your pairing token has expired. Run `studio-zero login` to refresh.",
    };
  }

  const projectPath = path.resolve(opts.projectPath ?? process.cwd());
  if (!existsSync(projectPath)) {
    return {
      ok: false,
      runId: "",
      message: `We can't find that folder: ${projectPath}.`,
    };
  }

  // Claude Code is REQUIRED for real reviewer runs but OPTIONAL when
  // mockReviewers is on (M3 default).
  const cc = detectClaudeCode(env.claudeCodeBin);
  if (!cc.found && !env.mockReviewers) {
    return {
      ok: false,
      runId: "",
      message:
        "Claude Code isn't installed. Install it from anthropic.com/claude-code and try again.",
    };
  }

  const runId = randomUUID();
  const depth = opts.depth ?? "quick";
  const controller = new AbortController();
  const handleSignal = (): void => controller.abort();
  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  const progress = createProgressRenderer();
  const reviewers =
    depth === "quick"
      ? ["optic", "halo", "proof"]
      : depth === "comprehensive"
        ? ["optic", "halo", "proof", "compass", "trace", "canon"]
        : opts.reviewers ?? [];
  progress.start(reviewers);

  let result;
  try {
    result = await runLocalAudit({
      runId,
      projectPath,
      depth,
      ...(opts.reviewers !== undefined
        ? { customerReviewers: opts.reviewers as never }
        : {}),
      binaryHash: auth.binaryHash,
      mockReviewers: env.mockReviewers,
      claudeCode: cc,
      signal: controller.signal,
      onProgress: (evt) => progress.update(evt.reviewer, evt.phase, evt.pct),
    });
  } finally {
    process.removeListener("SIGINT", handleSignal);
    process.removeListener("SIGTERM", handleSignal);
    progress.end();
  }

  for (const r of result.reviewerResults) {
    if (r.status === "failed_terminal") {
      progress.fail(r.reviewer, r.failureCode ?? "unknown_failure");
    }
  }

  // Stream a single 'final' event so the web's `/app/runs/<id>` page
  // updates even before the verdict POST lands. Metadata only.
  await postRunEvent({
    apiUrl: env.apiUrl,
    token: auth.token,
    runId,
    event: {
      kind: "progress",
      phase: "verdict_pending",
      reviewerStatus: result.reviewerResults.map((r) => ({
        reviewer: r.reviewer,
        status: r.status,
      })),
    },
    ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
  }).catch(() => {
    // Event POST is best-effort; the verdict POST is the source of truth.
  });

  if (opts.skipUpload) {
    return {
      ok: true,
      runId,
      verdict: result.verdict.verdict,
      signature: result.signature,
      signatureStatus: "skipped",
      message: [
        `Verdict: ${colors.bold(result.verdict.verdict)} (${result.verdict.score}/100)`,
        "",
        colors.watermark(watermarkBlock()),
      ].join("\n"),
    };
  }

  const upload = await uploadVerdict({
    apiUrl: env.apiUrl,
    token: auth.token,
    runId,
    verdict: result.verdict,
    signature: result.signature,
    ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
  });

  const lines: string[] = [];
  lines.push(
    `Verdict: ${colors.bold(result.verdict.verdict)} (${result.verdict.score}/100)`,
  );
  if (upload.ok) {
    if (upload.signatureStatus === "verified") {
      lines.push(colors.pass("Signature verified by server."));
    } else if (upload.signatureStatus === "mismatch") {
      lines.push(
        colors.fail(
          "Server reported a signature mismatch. See the web verdict for the advisory.",
        ),
      );
    } else if (upload.signatureStatus === "unrecognized_binary") {
      lines.push(
        colors.warn(
          "Server doesn't recognize this CLI build. See the web verdict for the advisory.",
        ),
      );
    }
  } else {
    lines.push(
      colors.warn(
        `Verdict upload didn't go through (status ${upload.status}). Re-run \`studio-zero run\` to retry.`,
      ),
    );
  }
  lines.push("");
  lines.push(colors.watermark(watermarkBlock()));

  return {
    ok: upload.ok,
    runId,
    verdict: result.verdict.verdict,
    signature: result.signature,
    signatureStatus: upload.signatureStatus,
    message: lines.join("\n"),
  };
}
