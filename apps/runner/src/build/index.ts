/**
 * Studio Zero — build-agent dispatcher.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Reads ONE pending `fix_pr_jobs` row,
 * loads the originating findings via the runner's tenant-scoped JWT,
 * routes each finding to its layer's fixer, and aggregates the patches
 * into a `PatchArtifact` that the Jury re-audit gate consumes.
 *
 * Cross-refs:
 *   - PRD §11.2 Auto-PR hard rules
 *   - architecture/decisions.md ARCH-D7 (jury-reaudit-gate is the only
 *     transition path to `fix_pr_jobs.state='reaudit_passed'`)
 *   - apps/runner/src/build/types.ts (PatchArtifact contract)
 *   - apps/runner/src/build/{halo,proof,optic,canon,compass,trace}-fixer.ts
 *
 * The dispatcher is intentionally pure-routing — it does not own the
 * Stripe refund, the GH branch push, or the re-audit ping. Those live
 * in `pr-opener.ts` (post-gate) and `jury-reaudit-gate` (Edge Fn).
 */
import type { LlmGatewayClient } from "../llm-gateway-client.js";
import { runHaloFixer } from "./halo-fixer.js";
import { runProofFixer } from "./proof-fixer.js";
import { runOpticFixer } from "./optic-fixer.js";
import { runCanonFixer } from "./canon-fixer.js";
import { runCompassFixer } from "./compass-fixer.js";
import { runTraceFixer } from "./trace-fixer.js";
import type {
  BuildFinding,
  Fixer,
  FixerContext,
  Patch,
  PatchArtifact,
} from "./types.js";

/** Lookup table: finding layer → fixer fn. */
export const FIXER_REGISTRY: Record<BuildFinding["layer"], Fixer | undefined> = {
  accessibility: runHaloFixer,
  copy: runProofFixer,
  design: runOpticFixer,
  brand: runCanonFixer,
  audience: runCompassFixer,
  flow: runTraceFixer,
  // Layers without an MVP fixer (security/compliance/data/etc.) deliberately
  // map to undefined — the dispatcher returns a clean failure rather than
  // routing them to a wrong fixer. V2 expands coverage.
  frontend: undefined,
  backend: undefined,
  data: undefined,
  infra: undefined,
  security: undefined,
  compliance: undefined,
};

/** Read-side dependencies the dispatcher needs to load a fix_pr_jobs row,
 *  fetch its findings, and fetch the original file contents. */
export interface BuildDispatcherDeps {
  gateway: LlmGatewayClient;
  /** Load the BuildFindings referenced by a fix_pr_jobs row. The caller
   *  must already have a runner-JWT scoped to the run + tenant; this
   *  function is invoked by pg-boss-worker after token mint. */
  loadFindings: (
    fix_pr_job_id: string,
    signal: AbortSignal,
  ) => Promise<BuildFinding[]>;
  /** Load the original file contents at the time of fix. The implementer
   *  is expected to checkout the run's commit SHA from `runs` and read
   *  the file from a tenant-isolated working tree. The dispatcher does
   *  NOT clone; cloning happens in the worker that calls us. */
  readFile: (
    finding: BuildFinding,
    signal: AbortSignal,
  ) => Promise<string>;
  /** AI-disclosure provenance — stamped into PatchArtifact.generated_at +
   *  produced_by, but the runner version string lives in env. */
  runner_version: string;
}

export interface DispatchInput {
  fix_pr_job_id: string;
  run_id: string;
  tenant_id: string;
  signal: AbortSignal;
  traceparent?: string;
}

export interface DispatchResult {
  artifact: PatchArtifact;
  /** Per-finding fixer failures (gateway error, parse failure,
   *  out-of-scope patch). Surfaced to the operator + recorded on the
   *  fix_pr_jobs row. */
  failures: Array<{ finding_id: string; reason: string }>;
}

/**
 * Dispatch the build phase for a single fix_pr_jobs row.
 *
 * Failure semantics (per PRD §11.2):
 *   - If ANY fixer fails (no patch produced or patch invalid), we
 *     surface the failure but DO NOT abort the build phase. The
 *     re-audit gate is the authoritative quality check; build agents
 *     submit what they can, the re-audit decides if the bundle is
 *     shippable.
 *   - If ZERO patches are produced, the artifact is still returned
 *     (empty `patches`); the caller (pg-boss build worker) is
 *     responsible for marking `fix_pr_jobs.state='failed'` in that
 *     terminal case.
 */
export async function dispatchBuild(
  input: DispatchInput,
  deps: BuildDispatcherDeps,
): Promise<DispatchResult> {
  const findings = await deps.loadFindings(input.fix_pr_job_id, input.signal);

  const patches: Patch[] = [];
  const failures: Array<{ finding_id: string; reason: string }> = [];

  // Process in finding-code order for deterministic patch ordering.
  const sorted = [...findings].sort((a, b) =>
    a.finding_code.localeCompare(b.finding_code),
  );

  for (const finding of sorted) {
    if (input.signal.aborted) {
      failures.push({ finding_id: finding.id, reason: "aborted" });
      continue;
    }
    const fixer = FIXER_REGISTRY[finding.layer];
    if (!fixer) {
      failures.push({
        finding_id: finding.id,
        reason: `no_fixer_for_layer:${finding.layer}`,
      });
      continue;
    }
    let original_contents: string;
    try {
      original_contents = await deps.readFile(finding, input.signal);
    } catch (err) {
      failures.push({
        finding_id: finding.id,
        reason: `read_file_failed:${(err as Error).message}`,
      });
      continue;
    }
    const ctx: FixerContext = {
      finding,
      original_file_contents: original_contents,
      gateway: deps.gateway,
      signal: input.signal,
      runner_version: deps.runner_version,
      ...(input.traceparent && { traceparent: input.traceparent }),
    };
    try {
      const result = await fixer(ctx);
      if (result.ok) {
        patches.push(result.patch);
      } else {
        failures.push({ finding_id: finding.id, reason: result.reason });
      }
    } catch (err) {
      failures.push({
        finding_id: finding.id,
        reason: `fixer_exception:${(err as Error).message}`,
      });
    }
  }

  const files_changed = Array.from(new Set(patches.map((p) => p.file_path)));
  const total_lines_added = patches.reduce((s, p) => s + p.lines_added, 0);
  const total_lines_removed = patches.reduce((s, p) => s + p.lines_removed, 0);

  const artifact: PatchArtifact = {
    run_id: input.run_id,
    tenant_id: input.tenant_id,
    fix_pr_job_id: input.fix_pr_job_id,
    patches,
    files_changed,
    total_lines_added,
    total_lines_removed,
    generated_at: new Date().toISOString(),
  };

  return { artifact, failures };
}

export type { BuildFinding, Patch, PatchArtifact, Fixer } from "./types.js";
