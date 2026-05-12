/**
 * Studio Zero — V2.1 scaffold generator orchestrator.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Drives the scaffold pipeline end-to-end:
 *
 *   brief
 *     ↓ recommendStack (stack-detector.ts)
 *   stack pick
 *     ↓ generateBriefSensitiveFiles (code-generator.ts via llm-gateway)
 *   generated_files (Map)
 *     ↓ scaffolders[stack] (nextjs-saas | nodejs-worker | cli-tool)
 *   ScaffolderOutput { files: ScaffoldFile[] }
 *     ↓ runScaffoldAuditGate (audit-gate.ts — Jury full audit)
 *   ScaffoldAuditResult { verdict: PASS | PASS WITH FIXES | FAIL }
 *     ↓ if FAIL → halt + refund (deliverable=false)
 *     ↓ else    → zipFiles (bundle-zip.ts)
 *   ScaffoldDeliverable { zip_bytes: Buffer, manifest }
 *
 * The orchestrator emits BuildEvent timestamps at every transition so the
 * /app/builds/[id]/scaffold live progress page can render the pipeline.
 *
 * Hard rule (PRD §7.3 + sprint/milestone-V2-1.md exit gate):
 *   - Audit gate runs on the GENERATED scaffold BEFORE delivery.
 *   - FAIL halts delivery + signals refund.
 *   - PASS WITH FIXES ships + bundles the findings checklist.
 *
 * Cross-refs:
 *   - apps/runner/src/build/v2/layer-dispatcher.ts (V2 layer dispatch — the
 *     orchestrator is structurally similar; same event shape).
 *   - apps/runner/src/llm-gateway-client.ts (the gateway boundary).
 */
import type { Brief, BuildEvent } from "../v2/types.js";

import { recommendStack } from "./stack-detector.js";
import { generateBriefSensitiveFiles } from "./code-generator.js";
import { runScaffoldAuditGate } from "./audit-gate.js";
import { zipFiles, manifestFor } from "./bundle-zip.js";
import { scaffoldNextjsSaas } from "./scaffolders/nextjs-saas.js";
import { scaffoldNodejsWorker } from "./scaffolders/nodejs-worker.js";
import { scaffoldCliTool } from "./scaffolders/cli-tool.js";
import type {
  ScaffoldDeliverable,
  ScaffoldOrchestratorDeps,
  ScaffoldStack,
  ScaffolderInput,
  ScaffolderOutput,
} from "./types.js";

export interface RunScaffoldPipelineInput {
  brief: Brief;
  /** Project slug — produced by web app from project_name. */
  project_slug: string;
  signal: AbortSignal;
  /** Sprint+Axiom recommendation override. Optional. */
  sprint_recommended_stack?: ScaffoldStack | null;
}

/** Map each stack to its scaffolder. */
const SCAFFOLDERS: Record<
  ScaffoldStack,
  (input: ScaffolderInput) => ScaffolderOutput
> = {
  "nextjs-saas": scaffoldNextjsSaas,
  "nodejs-worker": scaffoldNodejsWorker,
  "cli-tool": scaffoldCliTool,
};

/** Run the full scaffold pipeline. Always returns a `ScaffoldDeliverable`;
 *  on FAIL it carries `deliverable=false` + a rejection reason. */
export async function runScaffoldPipeline(
  input: RunScaffoldPipelineInput,
  deps: ScaffoldOrchestratorDeps,
): Promise<ScaffoldDeliverable> {
  const { brief, project_slug, signal, sprint_recommended_stack } = input;
  const buildId = brief.build_id;

  await deps.emit({
    build_id: buildId,
    type: "phase_started",
    at: new Date().toISOString(),
    payload: { phase: "scaffold_pipeline" },
  });

  // 1. Stack pick.
  await deps.emit({
    build_id: buildId,
    type: "phase_started",
    at: new Date().toISOString(),
    payload: { phase: "stack_detect" },
  });
  const reco = recommendStack(brief, { sprint_recommended_stack });
  await deps.emit({
    build_id: buildId,
    type: "phase_finished",
    at: new Date().toISOString(),
    payload: {
      phase: "stack_detect",
      stack: reco.stack,
      confidence: reco.confidence,
    },
  });

  if (signal.aborted) throw new Error("scaffold pipeline aborted at stack-detect");

  // 2. Code generation.
  await deps.emit({
    build_id: buildId,
    type: "phase_started",
    at: new Date().toISOString(),
    payload: { phase: "code_gen", stack: reco.stack },
  });

  const generated_files = new Map<string, string>();
  // Targets vary by stack — we pick the customer-facing files where the LLM
  // output adds genuine value over the template default.
  const targets = targetsForStack(reco.stack);
  for (const t of targets) {
    if (signal.aborted) break;
    try {
      const result = await deps.generateCode({
        brief,
        stack: reco.stack,
        file_path: t.file_path,
        template_hint: t.template_hint,
      });
      if (result && result.length > 0) {
        generated_files.set(t.file_path, result);
      }
    } catch {
      // Per code-generator.ts contract: gateway failure → template default.
    }
  }
  await deps.emit({
    build_id: buildId,
    type: "phase_finished",
    at: new Date().toISOString(),
    payload: {
      phase: "code_gen",
      stack: reco.stack,
      generated_count: generated_files.size,
    },
  });

  if (signal.aborted) throw new Error("scaffold pipeline aborted at code-gen");

  // 3. Compose scaffold.
  await deps.emit({
    build_id: buildId,
    type: "phase_started",
    at: new Date().toISOString(),
    payload: { phase: "compose_scaffold", stack: reco.stack },
  });
  const scaffolder = SCAFFOLDERS[reco.stack];
  const scaffold = scaffolder({
    brief,
    project_slug,
    generated_files,
  });
  await deps.emit({
    build_id: buildId,
    type: "phase_finished",
    at: new Date().toISOString(),
    payload: {
      phase: "compose_scaffold",
      stack: reco.stack,
      file_count: scaffold.files.length,
    },
  });

  // 4. Audit gate (Jury full audit, net-recursive).
  await deps.emit({
    build_id: buildId,
    type: "phase_started",
    at: new Date().toISOString(),
    payload: { phase: "audit_gate", stack: reco.stack },
  });
  const audit = await runScaffoldAuditGate(
    { stack: reco.stack, files: scaffold.files },
    { runJuryAudit: deps.runAudit },
  );
  await deps.emit({
    build_id: buildId,
    type: "audit_gate_decided",
    at: new Date().toISOString(),
    payload: {
      verdict: audit.verdict,
      score: audit.score,
      findings_count: audit.findings.length,
      audit_run_id: audit.audit_run_id,
    },
  });

  // 5. Branch on verdict — FAIL → no zip + signal refund.
  if (audit.verdict === "FAIL") {
    await deps.emit({
      build_id: buildId,
      type: "failed",
      at: new Date().toISOString(),
      payload: {
        reason: audit.rejection_reason ?? "audit_gate_failed",
        refund: true,
      },
    });
    return {
      deliverable: false,
      stack: reco.stack,
      audit,
      zip_bytes: Buffer.alloc(0),
      manifest: [],
    };
  }

  // 6. Zip + deliver (PASS or PASS WITH FIXES).
  await deps.emit({
    build_id: buildId,
    type: "phase_started",
    at: new Date().toISOString(),
    payload: { phase: "bundle_zip" },
  });
  const zip_bytes = zipFiles(scaffold.files);
  const manifest = manifestFor(scaffold.files);
  await deps.emit({
    build_id: buildId,
    type: "phase_finished",
    at: new Date().toISOString(),
    payload: { phase: "bundle_zip", zip_bytes: zip_bytes.length },
  });

  await deps.emit({
    build_id: buildId,
    type: "delivered",
    at: new Date().toISOString(),
    payload: {
      stack: reco.stack,
      verdict: audit.verdict,
      score: audit.score,
      file_count: scaffold.files.length,
    },
  });

  return {
    deliverable: true,
    stack: reco.stack,
    audit,
    zip_bytes,
    manifest,
  };
}

/** Per-stack list of files the LLM should attempt to brief-tailor. The
 *  scaffolder's `pick(path, fallback)` helper consults this map; if the
 *  LLM produced output, it overrides the template default. */
function targetsForStack(
  stack: ScaffoldStack,
): Array<{ file_path: string; template_hint: string }> {
  switch (stack) {
    case "nextjs-saas":
      return [
        {
          file_path: "app/page.tsx",
          template_hint:
            "Default: H1 = project_name; P = 'For <persona> who need <primary_need>.'",
        },
        {
          file_path: "README.md",
          template_hint: "Default: project_name + idea_summary + Run instructions.",
        },
      ];
    case "nodejs-worker":
      return [
        {
          file_path: "README.md",
          template_hint: "Default: project_name + idea_summary + Run instructions.",
        },
      ];
    case "cli-tool":
      return [
        {
          file_path: "README.md",
          template_hint: "Default: project_name + idea_summary + Install/run.",
        },
      ];
  }
}

/** Re-export the helper used by the dispatcher tests so callers don't need
 *  to reach into code-generator.ts directly. */
export { generateBriefSensitiveFiles };
