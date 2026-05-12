/**
 * In-memory mock store for V2 Build mode.
 *
 * Phase 9 V2 Batch 1 (Forge). When Supabase env is absent (CI, demo,
 * local dev without DB) the build routes round-trip through this
 * store so the intake → live dashboard → output flow renders without
 * a database. The store auto-advances state on a timer so the live
 * dashboard surfaces visible progress in demo mode.
 *
 * NOT used in production. RLS-scoped Supabase rows are the real path.
 */

export type MockBuildState =
  | "queued"
  | "brief_generating"
  | "brief_awaiting_confirmation"
  | "dispatching"
  | "layers_running"
  | "bundle_assembling"
  | "audit_gate_running"
  | "delivering"
  | "delivered"
  | "audit_failed"
  | "cancelled"
  | "failed";

export type LayerName =
  | "strategy"
  | "design"
  | "data"
  | "security"
  | "growth"
  | "frontend"
  | "backend"
  | "ops";

export interface MockLayerRow {
  layer: LayerName;
  agent: string;
  status: "queued" | "running" | "complete" | "failed" | "skipped";
  score: number | null;
}

export interface MockBriefPreview {
  project_name: string;
  jtbd: string;
  risk_profile: "regulated" | "consumer" | "internal";
  team_roster: string[];
  success_criteria: string[];
}

export interface MockBuildRecord {
  id: string;
  projectName: string;
  idea: string;
  targetAudience: Record<string, unknown>;
  vibe: Record<string, unknown>;
  constraints: Record<string, unknown>;
  outputPreference: string;
  state: MockBuildState;
  brief: MockBriefPreview | null;
  briefConfirmedAt: string | null;
  layers: MockLayerRow[];
  verdict: "PASS" | "PASS WITH FIXES" | "FAIL" | null;
  score: number | null;
  repoUrl: string | null;
  createdAt: string;
  output: {
    readme_md: string;
    roadmap_md: string;
    architecture_md: string;
    prd_md: string;
    brand_tokens_json: string;
    voice_md: string;
    decisions_md: string;
    risks_md: string;
    cogs_md: string;
    channels_md: string;
  } | null;
}

const LAYER_DEFS: Array<{ layer: LayerName; agent: string }> = [
  { layer: "strategy", agent: "Axiom + Sprint + Penny + Scout" },
  { layer: "design", agent: "Canvas + Pixel" },
  { layer: "data", agent: "Atlas" },
  { layer: "security", agent: "Shield + Cipher + Verify" },
  { layer: "growth", agent: "Signal + Herald + Hook + Lens" },
  { layer: "frontend", agent: "Vega + Optic + Trace" },
  { layer: "backend", agent: "Forge + Arch" },
  { layer: "ops", agent: "Pipeline + Watch + Comply" },
];

function emptyLayers(): MockLayerRow[] {
  return LAYER_DEFS.map((d) => ({
    layer: d.layer,
    agent: d.agent,
    status: "queued",
    score: null,
  }));
}

class MockStore {
  private records = new Map<string, MockBuildRecord>();

  list(): Array<{
    id: string;
    projectName: string;
    state: string;
    verdict: "FAIL" | "PASS_WITH_FIXES" | "PASS" | null;
    createdAt: string;
    outputPreference: string;
  }> {
    return Array.from(this.records.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({
        id: r.id,
        projectName: r.projectName,
        state: r.state,
        verdict:
          r.verdict === null
            ? null
            : r.verdict === "PASS WITH FIXES"
              ? "PASS_WITH_FIXES"
              : r.verdict,
        createdAt: r.createdAt,
        outputPreference: r.outputPreference,
      }));
  }

  create(input: {
    id: string;
    projectName: string;
    idea: string;
    targetAudience: Record<string, unknown>;
    vibe: Record<string, unknown>;
    constraints: Record<string, unknown>;
    outputPreference: string;
  }): MockBuildRecord {
    const now = new Date().toISOString();
    const rec: MockBuildRecord = {
      id: input.id,
      projectName: input.projectName,
      idea: input.idea,
      targetAudience: input.targetAudience,
      vibe: input.vibe,
      constraints: input.constraints,
      outputPreference: input.outputPreference,
      state: "brief_generating",
      brief: null,
      briefConfirmedAt: null,
      layers: emptyLayers(),
      verdict: null,
      score: null,
      repoUrl: null,
      createdAt: now,
      output: null,
    };
    this.records.set(input.id, rec);
    // Mock the brief generation in 250ms.
    setTimeout(() => {
      const r = this.records.get(input.id);
      if (!r || r.state !== "brief_generating") return;
      r.brief = {
        project_name: r.projectName,
        jtbd: `When ${(r.targetAudience as { persona?: string })
          .persona ?? "the user"} wants to ${
          (r.targetAudience as { primary_need?: string }).primary_need ??
          "achieve their goal"
        }, they need this product so they can avoid ${
          (r.targetAudience as { pain_point?: string }).pain_point ??
          "their pain point"
        }.`,
        risk_profile: "consumer",
        team_roster: ["saas"],
        success_criteria: [
          "TTFV under 30 days",
          "First 100 customers within 90 days",
          "Audit verdict PASS or PASS WITH FIXES",
        ],
      };
      r.state = "brief_awaiting_confirmation";
    }, 250);
    return rec;
  }

  get(id: string): MockBuildRecord | undefined {
    return this.records.get(id);
  }

  confirmBrief(id: string): boolean {
    const r = this.records.get(id);
    if (!r) return false;
    if (r.state !== "brief_awaiting_confirmation") return false;
    r.state = "dispatching";
    r.briefConfirmedAt = new Date().toISOString();
    // Kick off the simulated layer execution.
    this.advanceLayers(id);
    return true;
  }

  cancel(id: string): boolean {
    const r = this.records.get(id);
    if (!r) return false;
    if (r.state === "delivered" || r.state === "cancelled") return false;
    r.state = "cancelled";
    return true;
  }

  private advanceLayers(id: string): void {
    let idx = 0;
    const tick = (): void => {
      const r = this.records.get(id);
      if (!r) return;
      if (r.state === "cancelled" || r.state === "failed") return;
      if (idx === 0) r.state = "layers_running";
      if (idx < r.layers.length) {
        const runningRow = r.layers[idx];
        if (runningRow) runningRow.status = "running";
        setTimeout(() => {
          const r2 = this.records.get(id);
          if (!r2) return;
          if (r2.state === "cancelled") return;
          const completedRow = r2.layers[idx];
          if (completedRow) {
            completedRow.status = "complete";
            completedRow.score = 78 + ((idx * 3) % 18);
          }
          idx += 1;
          tick();
        }, 280);
      } else {
        // Layers done — assemble bundle, then audit gate.
        r.state = "bundle_assembling";
        setTimeout(() => {
          const r2 = this.records.get(id);
          if (!r2 || r2.state === "cancelled") return;
          r2.state = "audit_gate_running";
          setTimeout(() => {
            const r3 = this.records.get(id);
            if (!r3 || r3.state === "cancelled") return;
            // Mock verdict — PASS WITH FIXES at score 84.
            r3.verdict = "PASS WITH FIXES";
            r3.score = 84;
            r3.state = "delivering";
            setTimeout(() => {
              const r4 = this.records.get(id);
              if (!r4 || r4.state === "cancelled") return;
              r4.repoUrl =
                r4.outputPreference === "roadmap-docs"
                  ? null
                  : `https://github.com/studio-zero-mock/${slug(r4.projectName)}`;
              r4.output = renderMockOutput(r4);
              r4.state = "delivered";
            }, 300);
          }, 300);
        }, 300);
      }
    };
    tick();
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "build";
}

function renderMockOutput(r: MockBuildRecord): MockBuildRecord["output"] {
  return {
    readme_md: `# ${r.projectName}\n\nProduced by Studio Zero Build mode.\n\nThis bundle contains the roadmap, architecture, PRD, brand, voice, decisions, risks, COGS, and channels.\n`,
    roadmap_md: `# Roadmap — ${r.projectName}\n\n## M0 — discovery (week 1-2)\n- Stakeholder interviews\n- Brand exploration\n\n## M1 — MVP (week 3-8)\n- Core flow\n- Auth (BYOK)\n\n## M2 — launch (week 9-12)\n- Beta program\n- GTM kickoff\n`,
    architecture_md: `# Architecture — ${r.projectName}\n\nNext.js + Supabase + pg-boss + Stripe. RLS-isolated per tenant.\n`,
    prd_md: `# PRD — ${r.projectName}\n\n## Vision\n${r.idea}\n\n## JTBD\n${r.brief?.jtbd ?? ""}\n`,
    brand_tokens_json: JSON.stringify(
      {
        colors: { primary: "#14C8CC", accent: "#E4C875", ink: "#1A1A1A" },
        type: { display: "Fraunces", body: "Inter" },
      },
      null,
      2,
    ),
    voice_md: `# Voice — ${r.projectName}\n\nNeutral-and-confident. Numbers carry the verdict; the brand voice never apologizes for the evidence.\n`,
    decisions_md: `# Decisions — ${r.projectName}\n\n- Brand direction: aqua + gold (Canvas)\n- Auth: BYOK only at MVP (Forge)\n- GTM: indie-founder channels (Signal)\n`,
    risks_md: `# Risks — ${r.projectName}\n\n- Concentration on a single LLM provider (Cortex)\n- Sandbox escape (Shield — first pentest)\n`,
    cogs_md: `# COGS — ${r.projectName}\n\n- Per-audit token spend: ~$0.40 (Penny)\n- Hosting: Vercel + Supabase + Railway\n`,
    channels_md: `# Channels — ${r.projectName}\n\n- Indie Hackers launch\n- Twitter / X founder community\n- Cold outbound to YC W26 batch (Signal)\n`,
  };
}

export const mockBuildStore = new MockStore();
