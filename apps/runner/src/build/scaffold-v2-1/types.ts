/**
 * Studio Zero — V2.1 scaffold generator types.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Distinct from `apps/runner/src/build/v2/types.ts`
 * (the V2 roadmap+docs+seeded-repo pipeline) — this file owns the V2.1 scaffold
 * generator's contracts: stack detection, per-stack scaffolders, the LLM-driven
 * code generator, the audit gate, and the final zip bundle.
 *
 * Cross-refs:
 *   - PRD §4 V2.1 (Working scaffold / MVP code, gated by audit-pass)
 *   - sprint/milestone-V2-1.md (exit gate — audit-gated delivery)
 *   - architecture/test-strategy.md §V2.1
 */

import type { Brief, BuildEvent } from "../v2/types.js";

/** Supported scaffold stacks at V2.1 Batch 1. Adding a stack requires a new
 *  scaffolder under `scaffolders/` + a `recommendStack()` branch + a fixture
 *  under `apps/runner/tests/build/scaffold-v2-1/`. */
export type ScaffoldStack =
  | "nextjs-saas"
  | "nodejs-worker"
  | "cli-tool";

export interface StackRecommendation {
  stack: ScaffoldStack;
  /** 0-1 confidence the recommendation is correct given the brief signals. */
  confidence: number;
  /** Brief signals that drove the pick (human-readable, surfaced to the
   *  customer so they can override). */
  rationale: string[];
  /** Alternates Sprint+Axiom considered; surfaced as "did you mean…?" if
   *  customer flags the primary pick. */
  alternates: ScaffoldStack[];
}

/** A single file the scaffolder produces. The orchestrator never mutates
 *  these — they are pushed straight into the zip bundle. */
export interface ScaffoldFile {
  /** Path WITHIN the scaffolded repo (POSIX, no leading slash). */
  path: string;
  /** UTF-8 file contents. */
  contents: string;
  /** Marks files that must NOT be edited downstream (lockfiles, license
   *  texts). The audit gate only audits non-pinned files. */
  pinned?: boolean;
}

export interface ScaffolderOutput {
  stack: ScaffoldStack;
  files: ScaffoldFile[];
  /** Human-readable summary printed in the customer-facing readme. */
  summary: string;
  /** README + install instructions, separately surfaced so the web UI can
   *  show them before zip-download. */
  install_instructions: string;
}

/** Inputs to per-stack scaffolders. */
export interface ScaffolderInput {
  brief: Brief;
  /** Project slug — used as the npm package name + repo name. */
  project_slug: string;
  /** Output of `code-generator.ts` — keyed by `path`, the LLM-generated
   *  file contents that replace the stack's template defaults. May be
   *  empty (template-only scaffold). */
  generated_files: Map<string, string>;
}

/** Audit gate verdict on the generated scaffold (Jury full audit). */
export type ScaffoldAuditVerdict =
  | "PASS"
  | "PASS WITH FIXES"
  | "FAIL";

export interface ScaffoldAuditResult {
  verdict: ScaffoldAuditVerdict;
  score: number;
  /** Critical + Major findings the customer must see. PASS WITH FIXES
   *  ships these as a checklist; FAIL surfaces them as the rejection
   *  reason + refund offer. */
  findings: Array<{
    code: string;
    severity: "critical" | "major" | "minor";
    layer:
      | "frontend"
      | "backend"
      | "data"
      | "security"
      | "design"
      | "growth"
      | "ops"
      | "strategy";
    file_path?: string;
    summary: string;
  }>;
  decided_at: string;
  audit_run_id: string;
  /** When FAIL, this is the customer-facing rejection_reason. */
  rejection_reason?: string;
}

export interface ScaffoldDeliverable {
  /** True iff verdict is PASS or PASS WITH FIXES. When false, no zip is
   *  produced and the worker triggers the refund flow. */
  deliverable: boolean;
  stack: ScaffoldStack;
  audit: ScaffoldAuditResult;
  /** When deliverable=true, the zip artifact's bytes (base64 in API,
   *  Buffer here). Empty when deliverable=false. */
  zip_bytes: Buffer;
  /** Manifest of every file in the zip — used by Probe's verification
   *  spec to assert no PII / no leaked secrets. */
  manifest: Array<{ path: string; bytes: number; pinned: boolean }>;
}

export interface ScaffoldOrchestratorDeps {
  /** Calls llm-gateway-client with the brief + per-file prompt to fill in
   *  the stack template. The implementation lives in `code-generator.ts`. */
  generateCode: (args: {
    brief: Brief;
    stack: ScaffoldStack;
    file_path: string;
    template_hint: string;
  }) => Promise<string>;
  /** Runs the Jury full audit. Mock in tests; real in production. */
  runAudit: (args: {
    stack: ScaffoldStack;
    files: ScaffoldFile[];
  }) => Promise<ScaffoldAuditResult>;
  /** Realtime emit — reuses the V2 BuildEvent type. */
  emit: (event: BuildEvent) => Promise<void>;
}
