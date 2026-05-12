/**
 * Studio Zero — build-agent shared types.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Common shapes used by all six per-layer
 * build fixers (`halo-fixer`, `proof-fixer`, `optic-fixer`, `canon-fixer`,
 * `compass-fixer`, `trace-fixer`) and the dispatcher in `index.ts`.
 *
 * Hard contracts (per PRD §11.2 + ARCH-D7 + Cipher Fix-2):
 *   - The runner NEVER calls Anthropic directly. Every LLM call routes
 *     through `LlmGatewayClient` so the BYOK key never crosses the
 *     runner heap (Cipher Fix-2).
 *   - The dispatcher reads ONE row from `fix_pr_jobs` and routes by the
 *     originating finding's `layer`. Cross-layer findings are rejected;
 *     each finding belongs to exactly one fixer.
 *   - Each fixer returns a unified-diff `Patch` object plus a confidence
 *     score. The dispatcher aggregates patches into a `PatchArtifact`
 *     handed to `jury-reaudit-gate` (the Edge Function that owns the
 *     gating transition to `fix_pr_jobs.state='reaudit_passed'` per
 *     ARCH-D7 #4).
 *   - Out-of-scope changes (patches that touch a file outside
 *     `finding.file_path`) are REJECTED by the validator and never reach
 *     the re-audit.
 */
import type { LlmGatewayClient } from "../llm-gateway-client.js";

/** The finding shape a build agent consumes. Subset of the `findings`
 *  table row, plus the `file_path` + `line_range` the build agent
 *  needs to target the patch. Sourced from the `findings` table via
 *  `evidence.path` + `evidence.line_start/line_end`. */
export interface BuildFinding {
  /** finding row id (uuid). */
  id: string;
  /** finding code F-NNN — used in the `Refs:` trailer. */
  finding_code: string;
  run_id: string;
  tenant_id: string;
  severity: "Blocker" | "Critical" | "Major" | "Minor" | "Polish";
  /** Layer determines which fixer runs. Drawn from the `findings.layer`
   *  enum + Halo/Compass/Trace/Canon/Proof/Optic dispatch keys. */
  layer:
    | "accessibility"
    | "copy"
    | "design"
    | "brand"
    | "audience"
    | "flow"
    | "frontend"
    | "backend"
    | "data"
    | "infra"
    | "security"
    | "compliance";
  reviewer:
    | "jury"
    | "optic"
    | "proof"
    | "halo"
    | "compass"
    | "trace"
    | "canon";
  summary: string;
  recommendation: string;
  /** Required for build-agent dispatch. The finding's `evidence.path`. */
  file_path: string;
  /** Required for build-agent dispatch. Defaults to whole-file when
   *  `evidence.line_start/end` is not set. */
  line_start: number;
  line_end: number;
}

/** A single proposed patch in unified-diff form. */
export interface Patch {
  /** finding the patch addresses — included on every `Refs: F-NNN` trailer. */
  finding_id: string;
  finding_code: string;
  /** Absolute (repo-relative) path. */
  file_path: string;
  /** Unified-diff body — exactly the bytes a `git apply` consumes.
   *  Standard format: `--- a/path` + `+++ b/path` + one or more @@ hunks.
   *  Validated by `validatePatch()` before this object is returned. */
  unified_diff: string;
  lines_added: number;
  lines_removed: number;
  /** Build-agent self-reported confidence [0,1]. The re-audit gate is the
   *  load-bearing check — confidence is informational. */
  confidence: number;
  /** Which fixer produced this. */
  produced_by:
    | "halo-fixer"
    | "proof-fixer"
    | "optic-fixer"
    | "canon-fixer"
    | "compass-fixer"
    | "trace-fixer";
}

/** Aggregated output across all fixers for one fix_pr_jobs row. */
export interface PatchArtifact {
  run_id: string;
  tenant_id: string;
  fix_pr_job_id: string;
  /** Per-finding patches, in finding-code order for deterministic diffs. */
  patches: Patch[];
  files_changed: string[];
  total_lines_added: number;
  total_lines_removed: number;
  generated_at: string;
}

/** What every fixer accepts. */
export interface FixerContext {
  finding: BuildFinding;
  /** Original file contents — read by dispatcher; passed to fixer so the
   *  fixer can construct a 3-way-merge-safe unified diff against it. */
  original_file_contents: string;
  gateway: LlmGatewayClient;
  signal: AbortSignal;
  /** The runner version stamped into AI-Authored trailers + provenance. */
  runner_version: string;
  /** W3C traceparent — propagated to the LLM gateway so the build call
   *  shows up in the same trace as the original audit run. */
  traceparent?: string;
}

/** What every fixer returns. */
export type FixerResult =
  | { ok: true; patch: Patch }
  | { ok: false; reason: string; finding_id: string };

/** Per-fixer interface. Each implementation is a pure async function so
 *  the dispatcher can swap impls in tests via a registry override. */
export type Fixer = (ctx: FixerContext) => Promise<FixerResult>;
