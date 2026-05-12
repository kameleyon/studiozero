/**
 * Studio Zero — V2 Build mode bundle assembler.
 *
 * Phase 9 V2 Batch 1 (Forge). After all layers complete, this assembler
 * stitches the layer outputs into the customer-facing roadmap-bundle.v1
 * artifact validated by `apps/runner/schemas/roadmap-bundle.v1.schema.json`.
 *
 * Each markdown document is a synthesis of one or more layer outputs:
 *   - roadmap.md       ← Sprint's milestones + dependency chain
 *   - architecture.md  ← Axiom + Atlas + Forge architecture decisions
 *   - prd.md           ← BigBrain's compiled PRD (brief + criteria + scope)
 *   - brand-tokens.json← Canvas + Pixel
 *   - voice.md         ← Herald
 *   - decisions.md     ← every cross-layer decision logged
 *   - risks.md         ← Shield's risk register + Penny's commercial risks
 *   - cogs.md          ← Penny's unit economics
 *   - channels.md      ← Signal's GTM
 *   - README.md        ← bundle overview
 *
 * Outputs are pure-strings — no I/O happens here. Persistence is the
 * caller's responsibility (the pg-boss build worker writes to S3 + the
 * `roadmap_bundles` table per Atlas's V2 schema).
 */
import type {
  Brief,
  LayerArtifact,
  LayerOutput,
  RoadmapBundle,
} from "./types.js";

export interface AssembleInput {
  brief: Brief;
  outputs: LayerOutput[];
  auditGate: RoadmapBundle["audit_gate"];
  repoSeed?: RoadmapBundle["repo_seed"];
  runner_version: string;
  request_id?: string;
}

function findArtifact(
  outputs: LayerOutput[],
  layer: LayerOutput["layer"],
  name: string,
): LayerArtifact | undefined {
  const layerOut = outputs.find((o) => o.layer === layer);
  return layerOut?.artifacts.find((a) => a.name === name);
}

function joinArtifacts(
  outputs: LayerOutput[],
  layer: LayerOutput["layer"],
): string {
  const layerOut = outputs.find((o) => o.layer === layer);
  if (!layerOut) return "";
  return layerOut.artifacts
    .filter((a) => a.kind === "md")
    .map((a) => a.content)
    .join("\n\n");
}

export function assembleBundle(input: AssembleInput): RoadmapBundle {
  const { brief, outputs, auditGate, repoSeed, runner_version, request_id } = input;

  const roadmapMd =
    `# Roadmap — ${brief.project_name}\n\n` +
    `**Built by:** Studio Zero — V2 Build mode\n` +
    `**Risk profile:** ${brief.risk_profile}\n` +
    `**Team roster:** ${brief.team_roster.join(", ")}\n\n` +
    joinArtifacts(outputs, "strategy");

  const archMd =
    `# Architecture — ${brief.project_name}\n\n` +
    joinArtifacts(outputs, "data") +
    "\n" +
    joinArtifacts(outputs, "backend") +
    "\n" +
    joinArtifacts(outputs, "frontend");

  const prdMd =
    `# PRD — ${brief.project_name}\n\n` +
    `## Vision\n${brief.idea_summary ?? ""}\n\n` +
    `## Audience\n` +
    `- Persona: ${brief.target_audience.persona}\n` +
    `- Primary need: ${brief.target_audience.primary_need}\n` +
    `- Pain point: ${brief.target_audience.pain_point}\n\n` +
    `## JTBD\n${brief.jtbd}\n\n` +
    `## Success criteria\n` +
    brief.success_criteria.map((c) => `- ${c}`).join("\n") +
    "\n\n## Constraints\n" +
    JSON.stringify(brief.constraints ?? {}, null, 2);

  const brandTokensJson =
    findArtifact(outputs, "design", "brand-tokens.json")?.content ??
    JSON.stringify(
      {
        colors: { primary: "#14C8CC", accent: "#E4C875", ink: "#1A1A1A" },
        type: { display: "Fraunces", body: "Inter" },
      },
      null,
      2,
    );

  const voiceMd =
    `# Voice — ${brief.project_name}\n\n` +
    `Herald: neutral-and-confident. Lead with the answer. Don't apologize for the evidence.\n\n` +
    `**Vibe adjectives:** ${(brief.vibe?.adjectives ?? []).join(", ") || "—"}\n`;

  const decisionsMd =
    `# Decisions — ${brief.project_name}\n\n` +
    outputs
      .map(
        (o) =>
          `## ${o.layer} (${o.agent})\n- Status: ${o.status}\n- Score: ${o.score ?? "—"}\n- ${o.summary}`,
      )
      .join("\n\n");

  const risksMd =
    `# Risks — ${brief.project_name}\n\n` +
    joinArtifacts(outputs, "security") +
    "\n\n## Commercial risks\n" +
    "- LLM provider concentration (R9 mitigation: dual-provider lane).\n" +
    "- Audit-gate FAIL is unrecoverable without a clear remediation path.\n";

  const cogsMd =
    `# COGS — ${brief.project_name}\n\n` +
    "Penny's unit economics inputs:\n" +
    `- Estimated budget: ${
      brief.constraints?.budget_usd != null
        ? `$${brief.constraints.budget_usd.toLocaleString()}`
        : "not specified"
    }\n` +
    "- Per-build LLM spend (V2 mode): subject to per-tenant token cap (Penny spec).\n";

  const channelsMd =
    `# Channels — ${brief.project_name}\n\n` +
    joinArtifacts(outputs, "growth");

  const readmeMd =
    `# ${brief.project_name}\n\n` +
    `Produced by Studio Zero — V2 Build mode.\n\n` +
    `## Contents\n` +
    `- \`README.md\` (this file)\n` +
    `- \`roadmap.md\` — Sprint's milestone plan\n` +
    `- \`architecture.md\` — Atlas + Forge architecture\n` +
    `- \`prd.md\` — BigBrain's compiled PRD\n` +
    `- \`brand-tokens.json\` — Canvas + Pixel brand\n` +
    `- \`voice.md\` — Herald voice doc\n` +
    `- \`decisions.md\` — cross-layer decision log\n` +
    `- \`risks.md\` — risk register\n` +
    `- \`cogs.md\` — Penny's unit economics\n` +
    `- \`channels.md\` — Signal's GTM\n\n` +
    `## Audit gate\n` +
    `**Verdict:** ${auditGate.verdict}\n` +
    `**Score:** ${auditGate.score}/100\n` +
    (auditGate.rejection_reason
      ? `**Rejection reason:** ${auditGate.rejection_reason}\n`
      : "") +
    `\n## AI Act Art. 50 disclosure\n` +
    `This bundle was produced by Studio Zero. See https://studio-zero.app/ai-system-card for the System Card v1.0.\n`;

  return {
    schema_version: "roadmap-bundle.v1",
    build_id: brief.build_id,
    tenant_id: brief.tenant_id,
    brief_ref: brief.build_id,
    documents: {
      readme_md: readmeMd,
      roadmap_md: roadmapMd,
      architecture_md: archMd,
      prd_md: prdMd,
      brand_tokens_json: brandTokensJson,
      voice_md: voiceMd,
      decisions_md: decisionsMd,
      risks_md: risksMd,
      cogs_md: cogsMd,
      channels_md: channelsMd,
    },
    layer_outputs: outputs,
    audit_gate: auditGate,
    repo_seed: repoSeed ?? null,
    generated_at: new Date().toISOString(),
    produced_by: { runner_version, request_id },
  };
}
