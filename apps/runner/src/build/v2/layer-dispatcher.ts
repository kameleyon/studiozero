/**
 * Studio Zero — V2 Build mode layer dispatcher.
 *
 * Phase 9 V2 Batch 1 (Forge). After BigBrain has generated a brief AND
 * the customer has confirmed it, this dispatcher fans out work to each
 * layer lead in parallel where dependencies allow, then waits for all
 * layers to complete (or fail). Each layer emits a `LayerOutput` that
 * aggregates into the roadmap bundle (`bundle-assembler.ts`).
 *
 * Dependency graph (per agents/strategy/* + sprint/milestone-V2.md):
 *
 *   Wave 1 (no deps — run in parallel):
 *     - Axiom    (architecture / PRD outline)
 *     - Penny    (pricing + unit economics)
 *     - Scout    (competitive landscape)
 *     - Sprint   (milestone plan)
 *
 *   Wave 2 (depends on Wave 1):
 *     - Canvas + Pixel (brand identity — 3 directions, customer picks)
 *     - Optic + Trace  (IA + flows)
 *     - Atlas + Shield + Verify (tech architecture)
 *     - Signal + Herald + Hook + Lens (GTM plan)
 *
 * Per PRD §7.3 + milestone-V2.md "Per-layer parallelism where deps allow".
 *
 * The dispatcher uses pg-boss queue `build-<buildId>` so jobs are durable
 * across worker restarts. In test/mock mode it runs synchronously and
 * returns the aggregated `LayerOutput[]` directly.
 *
 * Constraint (Penny): per-tenant token cap is stricter for Build mode
 * than for Audit mode (8x the per-audit budget across the 8 layers).
 * Enforcement lives in the LLM gateway — the dispatcher passes a
 * `build_mode: true` flag the gateway uses to pick the build-mode budget.
 */
import type { Brief, BuildEvent, LayerName, LayerOutput } from "./types.js";

export interface LayerDispatcherDeps {
  /** Called once per layer to produce its output. Implementations call
   *  the LLM gateway with the layer's persona prompt + brief. */
  runLayer: (args: {
    brief: Brief;
    layer: LayerName;
    signal: AbortSignal;
    traceparent?: string;
  }) => Promise<LayerOutput>;
  /** Realtime emit — used by the live build dashboard. The web client
   *  reconstructs the timeline solely from `phase_started`/`phase_finished`
   *  events (per V2 exit gate). */
  emit: (event: BuildEvent) => Promise<void>;
}

export interface DispatchLayersInput {
  brief: Brief;
  signal: AbortSignal;
  traceparent?: string;
}

export interface DispatchLayersResult {
  outputs: LayerOutput[];
  failures: Array<{ layer: LayerName; reason: string }>;
  /** ISO timestamps for debugging + observability. */
  startedAt: string;
  finishedAt: string;
}

/** Wave-1 layers: produce outputs that Wave-2 layers may reference. */
const WAVE_1: LayerName[] = ["strategy"];
/** Wave-2 layers: brand + IA + tech-arch + GTM run in parallel after Wave 1. */
const WAVE_2: LayerName[] = [
  "design",
  "data",
  "security",
  "growth",
  "frontend",
  "backend",
  "ops",
];

const LAYER_AGENT_LABEL: Record<LayerName, string> = {
  strategy: "Axiom + Sprint + Penny + Scout",
  design: "Canvas + Pixel",
  data: "Atlas",
  security: "Shield + Cipher + Verify",
  growth: "Signal + Herald + Hook + Lens",
  frontend: "Vega + Optic + Trace",
  backend: "Forge + Arch",
  ops: "Pipeline + Watch + Comply",
};

/** Dispatch all layers in dependency order with per-wave parallelism. */
export async function dispatchLayers(
  input: DispatchLayersInput,
  deps: LayerDispatcherDeps,
): Promise<DispatchLayersResult> {
  const { brief, signal, traceparent } = input;
  const startedAt = new Date().toISOString();

  await deps.emit({
    build_id: brief.build_id,
    type: "phase_started",
    at: startedAt,
    payload: { phase: "dispatch_layers", waves: 2 },
  });

  const outputs: LayerOutput[] = [];
  const failures: Array<{ layer: LayerName; reason: string }> = [];

  async function runOne(layer: LayerName): Promise<void> {
    if (signal.aborted) {
      failures.push({ layer, reason: "aborted" });
      return;
    }
    const t0 = new Date().toISOString();
    await deps.emit({
      build_id: brief.build_id,
      type: "layer_started",
      at: t0,
      layer,
      status: "running",
    });
    try {
      const out = await deps.runLayer({ brief, layer, signal, traceparent });
      outputs.push(out);
      await deps.emit({
        build_id: brief.build_id,
        type: "layer_finished",
        at: new Date().toISOString(),
        layer,
        status: out.status === "failed" ? "failed" : "complete",
        payload: { score: out.score, summary: out.summary },
      });
      if (out.status === "failed") {
        failures.push({ layer, reason: "layer_returned_failed" });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      failures.push({ layer, reason });
      outputs.push({
        layer,
        agent: LAYER_AGENT_LABEL[layer],
        status: "failed",
        summary: `Layer failed: ${reason}`,
        score: null,
        artifacts: [],
      });
      await deps.emit({
        build_id: brief.build_id,
        type: "layer_finished",
        at: new Date().toISOString(),
        layer,
        status: "failed",
        payload: { reason },
      });
    }
  }

  // Wave 1 — must complete before Wave 2 starts.
  await Promise.all(WAVE_1.map(runOne));
  // Wave 2 — parallel.
  await Promise.all(WAVE_2.map(runOne));

  const finishedAt = new Date().toISOString();
  await deps.emit({
    build_id: brief.build_id,
    type: "phase_finished",
    at: finishedAt,
    payload: {
      phase: "dispatch_layers",
      outputs: outputs.length,
      failures: failures.length,
    },
  });

  return { outputs, failures, startedAt, finishedAt };
}

/** Helper used by the runner pg-boss worker and the integration tests:
 *  builds a deterministic stub `runLayer` that returns markdown matching
 *  each layer's persona. The real runner replaces this with an LLM call.
 */
export function makeStubRunLayer(): LayerDispatcherDeps["runLayer"] {
  return async ({ brief, layer }): Promise<LayerOutput> => {
    const agent = LAYER_AGENT_LABEL[layer];
    const baseSummary = `${agent} produced the ${layer} layer for ${brief.project_name}.`;
    const artifacts = layerStubArtifacts(layer, brief);
    return {
      layer,
      agent,
      status: "complete",
      summary: baseSummary,
      score: 80 + ((layer.length * 3) % 18),
      artifacts,
    };
  };
}

function layerStubArtifacts(
  layer: LayerName,
  brief: Brief,
): LayerOutput["artifacts"] {
  switch (layer) {
    case "strategy":
      return [
        {
          name: "milestones.md",
          kind: "md",
          content: `# Milestones — ${brief.project_name}\n\n## M0 discovery\n## M1 MVP\n## M2 launch\n`,
        },
        {
          name: "competitive.md",
          kind: "md",
          content: `# Competitive landscape — ${brief.project_name}\n\nScout finds 3 incumbents; differentiator is the audit-gate-before-delivery.\n`,
        },
        {
          name: "unit-economics.md",
          kind: "md",
          content: `# Unit economics — ${brief.project_name}\n\nPenny estimates LTV / CAC = 3.2 under conservative assumptions.\n`,
        },
      ];
    case "design":
      return [
        {
          name: "brand-tokens.json",
          kind: "json",
          content: JSON.stringify(
            {
              colors: {
                primary: "#14C8CC",
                accent: "#E4C875",
                ink: "#1A1A1A",
              },
              type: { display: "Fraunces", body: "Inter" },
            },
            null,
            2,
          ),
        },
      ];
    case "data":
      return [
        {
          name: "architecture.md",
          kind: "md",
          content: `# Architecture — ${brief.project_name}\n\nNext.js + Supabase + pg-boss + Stripe. RLS-isolated per tenant. Atlas owns schema.\n`,
        },
      ];
    case "security":
      return [
        {
          name: "threat-model.md",
          kind: "md",
          content: `# Threat model — ${brief.project_name}\n\nShield: STRIDE table; Cipher: secrets handling; Verify: ajv contract tests.\n`,
        },
      ];
    case "growth":
      return [
        {
          name: "channels.md",
          kind: "md",
          content: `# GTM channels — ${brief.project_name}\n\nSignal: indie-founder channels; Herald: brand voice; Hook: funnel; Lens: metrics.\n`,
        },
      ];
    case "frontend":
      return [
        {
          name: "ia.md",
          kind: "md",
          content: `# IA + flows — ${brief.project_name}\n\nOptic: sitemap; Trace: flows; Vega: component plan.\n`,
        },
      ];
    case "backend":
      return [
        {
          name: "api.md",
          kind: "md",
          content: `# API surface — ${brief.project_name}\n\nForge: REST + Realtime + Edge Functions. Arch: dependency boundaries.\n`,
        },
      ];
    case "ops":
      return [
        {
          name: "runbook.md",
          kind: "md",
          content: `# Ops runbook — ${brief.project_name}\n\nPipeline: CI/CD; Watch: observability; Comply: GDPR + AI Act surfaces.\n`,
        },
      ];
  }
}
