/**
 * Studio Zero — V2 Build mode types.
 *
 * Phase 9 V2 Batch 1 (Forge). Distinct from the V1.5 Auto-PR build/types.ts;
 * this namespace covers the second product line (idea → roadmap + docs +
 * seeded repo) per PRD §7.3.
 */

export type LayerName =
  | "strategy"
  | "design"
  | "data"
  | "security"
  | "growth"
  | "frontend"
  | "backend"
  | "ops";

export interface Brief {
  schema_version: "brief.v1";
  build_id: string;
  tenant_id: string;
  project_name: string;
  idea_summary?: string;
  target_audience: {
    persona: string;
    primary_need: string;
    pain_point: string;
  };
  jtbd: string;
  success_criteria: string[];
  vibe?: { adjectives?: string[]; reference_urls?: string[] };
  constraints?: {
    budget_usd?: number | null;
    deadline?: string | null;
    must_have_features?: string[];
    non_goals?: string[];
  };
  risk_profile: "regulated" | "consumer" | "internal";
  team_roster: string[];
  output_preference:
    | "roadmap-docs"
    | "roadmap-docs-repo"
    | "roadmap-docs-repo-scaffold";
  generated_at: string;
  produced_by: {
    agent: "bigbrain";
    model_class: "fast" | "thoughtful" | "long-context";
    request_id: string;
  };
}

export interface LayerArtifact {
  name: string;
  kind: "md" | "json" | "yaml" | "diagram";
  content: string;
}

export interface LayerOutput {
  layer: LayerName;
  agent: string;
  status: "complete" | "complete-with-fixes" | "skipped" | "failed";
  summary: string;
  score: number | null;
  artifacts: LayerArtifact[];
}

export interface BuildEvent {
  build_id: string;
  type:
    | "phase_started"
    | "phase_finished"
    | "layer_started"
    | "layer_finished"
    | "audit_gate_decided"
    | "delivered"
    | "failed";
  at: string;
  layer?: LayerName;
  status?: "running" | "complete" | "failed";
  payload?: Record<string, unknown>;
}

export interface RoadmapBundle {
  schema_version: "roadmap-bundle.v1";
  build_id: string;
  tenant_id: string;
  brief_ref: string;
  documents: {
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
  };
  layer_outputs: LayerOutput[];
  audit_gate: {
    verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
    score: number;
    decided_at: string;
    audit_run_id?: string;
    rejection_reason?: string;
  };
  repo_seed?: {
    html_url: string;
    milestones_created: number;
    issues_created: number;
    default_branch: string;
  } | null;
  generated_at: string;
  produced_by: { runner_version: string; request_id?: string };
}
