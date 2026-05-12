/**
 * Studio Zero — ingestion limits.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Mitigates Jury B7 (resource exhaustion
 * via huge / hostile repos) and PRD §17 D9 (ingestion limits at M0/M1
 * mandatory). Composes with path-traversal-guard.ts: any path that
 * passes safeOpen() is then quota-checked here before its bytes are
 * counted toward the run budget.
 *
 * Limits (M1 baseline — tunable via env later):
 *   - max files per run:        20,000
 *   - max bytes per file:       2 MiB (~ 524k LOC at 4-byte chars)
 *   - max total bytes per run:  256 MiB
 *   - max token budget per run: 2,000,000 tokens (matches PRD §14.4)
 *
 * Excluded paths (Forge D9): paths matching any of these prefixes/exacts
 * are never read by the runner. These match the `path-traversal-corpus`
 * PT-025..030 git-hooks / gitattributes / gitmodules entries, AND the
 * obvious binary-blob directories that have no audit value.
 */

export const INGESTION_DEFAULTS = {
  maxFiles: 20_000,
  maxBytesPerFile: 2 * 1024 * 1024, // 2 MiB
  maxTotalBytes: 256 * 1024 * 1024, // 256 MiB
  maxTokenBudget: 2_000_000,
} as const;

/** Path prefixes / exact names that the runner NEVER reads. */
export const EXCLUDED_PATH_SEGMENTS: ReadonlyArray<string> = [
  ".git/",
  ".git",
  ".gitattributes",
  ".gitmodules",
  "node_modules/",
  ".venv/",
  "venv/",
  "__pycache__/",
  "dist/",
  "build/",
  ".next/",
  "target/",
  "vendor/",
  ".cache/",
  ".turbo/",
  ".env",
  ".env.local",
  ".env.production",
];

export interface IngestionLimits {
  maxFiles: number;
  maxBytesPerFile: number;
  maxTotalBytes: number;
  maxTokenBudget: number;
}

export interface IngestionUsage {
  filesRead: number;
  totalBytes: number;
  tokensUsed: number;
}

export type IngestionAdmitResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "excluded_path"
        | "file_size_exceeded"
        | "max_files_exceeded"
        | "total_bytes_exceeded"
        | "token_budget_exceeded";
      detail: string;
    };

/** Returns true if the (relative) path is in the exclusion set. */
export function isExcludedPath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  for (const segment of EXCLUDED_PATH_SEGMENTS) {
    if (segment.endsWith("/")) {
      // prefix or contained-segment match
      if (normalized.startsWith(segment)) return true;
      if (normalized.includes(`/${segment}`)) return true;
    } else {
      // exact basename or prefix-with-slash
      if (
        normalized === segment ||
        normalized.endsWith(`/${segment}`) ||
        normalized.startsWith(`${segment}/`)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check whether the runner is allowed to ingest `bytes` from `relPath`
 * given current usage. Does NOT mutate usage — caller updates after a
 * successful read.
 */
export function canAdmitFile(
  relPath: string,
  bytes: number,
  usage: IngestionUsage,
  limits: IngestionLimits = { ...INGESTION_DEFAULTS },
): IngestionAdmitResult {
  if (isExcludedPath(relPath)) {
    return {
      ok: false,
      reason: "excluded_path",
      detail: `Path '${relPath}' is in the excluded-paths set`,
    };
  }
  if (bytes > limits.maxBytesPerFile) {
    return {
      ok: false,
      reason: "file_size_exceeded",
      detail: `File '${relPath}' size ${bytes}B exceeds per-file cap ${limits.maxBytesPerFile}B`,
    };
  }
  if (usage.filesRead + 1 > limits.maxFiles) {
    return {
      ok: false,
      reason: "max_files_exceeded",
      detail: `Would exceed max files (${limits.maxFiles}) for this run`,
    };
  }
  if (usage.totalBytes + bytes > limits.maxTotalBytes) {
    return {
      ok: false,
      reason: "total_bytes_exceeded",
      detail: `Would exceed total bytes cap (${limits.maxTotalBytes}B) for this run`,
    };
  }
  return { ok: true };
}

/**
 * Check whether `tokens` additional tokens can be consumed by an LLM call.
 * Same pure-function pattern: caller updates usage after a successful gateway call.
 */
export function canAdmitTokens(
  tokens: number,
  usage: IngestionUsage,
  limits: IngestionLimits = { ...INGESTION_DEFAULTS },
): IngestionAdmitResult {
  if (usage.tokensUsed + tokens > limits.maxTokenBudget) {
    return {
      ok: false,
      reason: "token_budget_exceeded",
      detail: `Would exceed token budget (${limits.maxTokenBudget}) for this run`,
    };
  }
  return { ok: true };
}

export function createUsage(): IngestionUsage {
  return { filesRead: 0, totalBytes: 0, tokensUsed: 0 };
}
