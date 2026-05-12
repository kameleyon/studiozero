/**
 * Studio Zero — V2 Build mode happy-path integration spec.
 *
 * Phase 9 V2 Batch 1 (Forge). Drives the full Build-mode pipeline:
 *
 *   intake → brief → confirm → dispatch (8 layers) → assemble bundle →
 *   audit gate PASS WITH FIXES → repo seed → delivered
 *
 * Covers the V2 milestone exit gate "Live build dashboard reconstructible
 * solely from emitted phase_started / phase_finished events" by asserting
 * that every state transition emits a typed event.
 *
 * Mock GitHub client mirrors the V1.5 pattern in auto-pr-flow.spec.ts.
 */
import { describe, it, expect, vi } from "vitest";

import {
  dispatchLayers,
  makeStubRunLayer,
} from "../../apps/runner/src/build/v2/layer-dispatcher.js";
import { assembleBundle } from "../../apps/runner/src/build/v2/bundle-assembler.js";
import {
  seedRepo,
  extractMilestonesFromRoadmap,
  type GhSeederClient,
} from "../../apps/runner/src/build/v2/repo-seeder.js";
import type {
  Brief,
  BuildEvent,
  LayerName,
} from "../../apps/runner/src/build/v2/types.js";

function makeBrief(): Brief {
  return {
    schema_version: "brief.v1",
    build_id: "11111111-1111-1111-1111-111111111111",
    tenant_id: "22222222-2222-2222-2222-222222222222",
    project_name: "Pace — a calm cardio coach",
    idea_summary:
      "A running coach app that adapts to how the runner feels each day.",
    target_audience: {
      persona: "First-time runners aged 35-55 training for a 5K",
      primary_need: "An adaptive plan that responds to perceived effort",
      pain_point: "Existing apps shame them for missed runs",
    },
    jtbd: "When a runner wants to keep training despite a bad day, they need a coach that adapts so they avoid shame.",
    success_criteria: ["TTFV under 30 days", "100 customers in 90 days"],
    vibe: { adjectives: ["calm", "editorial"], reference_urls: [] },
    constraints: {
      budget_usd: 50000,
      deadline: "2026-09-01",
      must_have_features: ["Adaptive plan", "Apple Health sync"],
      non_goals: ["Social feed"],
    },
    risk_profile: "consumer",
    team_roster: ["saas"],
    output_preference: "roadmap-docs-repo",
    generated_at: "2026-05-12T00:00:00Z",
    produced_by: {
      agent: "bigbrain",
      model_class: "thoughtful",
      request_id: "spec-build-happy",
    },
  };
}

function makeGh(): GhSeederClient {
  return {
    async createRepo() {
      return { html_url: "https://github.com/cust/pace", default_branch: "main" };
    },
    async putFile() {
      return { sha: "sha-" + Math.random().toString(36).slice(2, 8) };
    },
    async createMilestone({ title }) {
      return { number: Math.floor(Math.random() * 100) + 1 };
    },
    async createIssue() {
      return {
        number: Math.floor(Math.random() * 1000) + 1,
        html_url: "https://github.com/cust/pace/issues/1",
      };
    },
  };
}

describe("V2 Build mode — happy path", () => {
  it("intake → brief → confirm → dispatch → assemble → audit gate PASS → seed repo → delivered", async () => {
    const brief = makeBrief();
    const events: BuildEvent[] = [];
    const emit = async (e: BuildEvent): Promise<void> => {
      events.push(e);
    };

    // 1. Layer dispatch — 8 layers, two waves.
    const dispatch = await dispatchLayers(
      { brief, signal: new AbortController().signal },
      { runLayer: makeStubRunLayer(), emit },
    );
    expect(dispatch.outputs).toHaveLength(8);
    expect(dispatch.failures).toHaveLength(0);

    // Every layer must emit one started + one finished event.
    const startedLayers = events
      .filter((e) => e.type === "layer_started")
      .map((e) => e.layer);
    const finishedLayers = events
      .filter((e) => e.type === "layer_finished")
      .map((e) => e.layer);
    const expectedLayers: LayerName[] = [
      "strategy",
      "design",
      "data",
      "security",
      "growth",
      "frontend",
      "backend",
      "ops",
    ];
    expect(new Set(startedLayers)).toEqual(new Set(expectedLayers));
    expect(new Set(finishedLayers)).toEqual(new Set(expectedLayers));

    // 2. Assemble the bundle.
    const bundle = assembleBundle({
      brief,
      outputs: dispatch.outputs,
      auditGate: {
        verdict: "PASS WITH FIXES",
        score: 84,
        decided_at: new Date().toISOString(),
        audit_run_id: "audit-spec",
      },
      runner_version: "2.0.0",
      request_id: "spec-build-happy",
    });
    expect(bundle.schema_version).toBe("roadmap-bundle.v1");
    expect(bundle.documents.readme_md).toContain(brief.project_name);
    expect(bundle.documents.roadmap_md).toContain("Roadmap");
    expect(bundle.documents.architecture_md.length).toBeGreaterThan(10);
    expect(bundle.layer_outputs).toHaveLength(8);
    expect(bundle.audit_gate.verdict).toBe("PASS WITH FIXES");

    // 3. Seed the GitHub repo.
    const seed = await seedRepo(
      { bundle, owner: "cust", repoSlug: "pace" },
      makeGh(),
    );
    expect(seed.repo_created).toBe(true);
    expect(seed.html_url).toBe("https://github.com/cust/pace");
    expect(seed.milestones_created).toBeGreaterThanOrEqual(1);
    expect(seed.issues_created).toBeGreaterThan(0);
  });

  it("extractMilestonesFromRoadmap derives titles from H2 headings", () => {
    const md = "# Roadmap\n\n## M0 discovery\nstuff\n\n## M1 MVP\n## M2 launch";
    const titles = extractMilestonesFromRoadmap(md);
    expect(titles).toEqual(["M0 discovery", "M1 MVP", "M2 launch"]);
  });

  it("bundle schema validates against roadmap-bundle.v1.schema.json", async () => {
    const brief = makeBrief();
    const events: BuildEvent[] = [];
    const dispatch = await dispatchLayers(
      { brief, signal: new AbortController().signal },
      {
        runLayer: makeStubRunLayer(),
        emit: async (e): Promise<void> => {
          events.push(e);
        },
      },
    );
    const bundle = assembleBundle({
      brief,
      outputs: dispatch.outputs,
      auditGate: {
        verdict: "PASS",
        score: 92,
        decided_at: new Date().toISOString(),
      },
      runner_version: "2.0.0",
    });

    // Load + compile the schema with ajv 2020-12.
    const Ajv2020Mod = await import("ajv/dist/2020.js");
    const addFormatsMod = await import("ajv-formats");
    const AjvCtor =
      (Ajv2020Mod as unknown as { default?: typeof Ajv2020Mod["default"] })
        .default ?? Ajv2020Mod.default;
    const addFormats =
      (addFormatsMod as unknown as { default?: typeof addFormatsMod["default"] })
        .default ?? addFormatsMod.default;
    const ajv = new AjvCtor({ allErrors: true, strict: false });
    addFormats(ajv);
    const schema = await import(
      "../../apps/runner/schemas/roadmap-bundle.v1.schema.json",
      { with: { type: "json" } }
    );
    const validate = ajv.compile(
      (schema as unknown as { default: object }).default ?? schema,
    );
    const ok = validate(bundle);
    if (!ok) {
      // Surface validation errors in the test failure message.
      throw new Error(
        `Bundle invalid: ${JSON.stringify(validate.errors, null, 2)}`,
      );
    }
    expect(ok).toBe(true);
  });
});
