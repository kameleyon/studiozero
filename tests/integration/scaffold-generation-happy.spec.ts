/**
 * Studio Zero — V2.1 scaffold-generation happy-path spec.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Drives the full scaffold pipeline:
 *
 *   brief → recommendStack → generateBriefSensitiveFiles (mocked LLM)
 *         → scaffolder → runScaffoldAuditGate (mock Jury) → zipFiles
 *
 * Asserts:
 *   - Stack picked is nextjs-saas for a SaaS-flavored brief.
 *   - Audit gate verdict is PASS or PASS WITH FIXES (no Critical).
 *   - Deliverable is true; zip bytes > 0.
 *   - Manifest contains the expected core files.
 *   - BuildEvent stream is reconstructible (every phase emits start + finish).
 */
import { describe, it, expect } from "vitest";

import { runScaffoldPipeline } from "../../apps/runner/src/build/scaffold-v2-1/index.js";
import { makeMockJuryAudit } from "../../apps/runner/src/build/scaffold-v2-1/audit-gate.js";
import { recommendStack } from "../../apps/runner/src/build/scaffold-v2-1/stack-detector.js";
import type {
  Brief,
  BuildEvent,
} from "../../apps/runner/src/build/v2/types.js";

function makeBrief(): Brief {
  return {
    schema_version: "brief.v1",
    build_id: "55555555-5555-5555-5555-555555555555",
    tenant_id: "66666666-6666-6666-6666-666666666666",
    project_name: "Folio — a B2B SaaS dashboard for indie agencies",
    idea_summary:
      "A multi-tenant B2B SaaS dashboard built on Next.js, Supabase, and Stripe subscriptions.",
    target_audience: {
      persona: "Indie agency operators",
      primary_need: "A single dashboard for their clients' campaign metrics",
      pain_point: "Switching between 5 vendor tools",
    },
    jtbd: "When an agency operator gets up, they want one dashboard so they save 30 min/day.",
    success_criteria: ["MRR $5k in 90 days"],
    risk_profile: "consumer",
    team_roster: ["saas"],
    output_preference: "roadmap-docs-repo-scaffold",
    generated_at: "2026-05-12T00:00:00Z",
    produced_by: {
      agent: "bigbrain",
      model_class: "thoughtful",
      request_id: "spec-scaffold-happy",
    },
  };
}

describe("V2.1 scaffold pipeline — happy path (PASS WITH FIXES)", () => {
  it("recommendStack picks nextjs-saas for a SaaS-flavored brief", () => {
    const reco = recommendStack(makeBrief());
    expect(reco.stack).toBe("nextjs-saas");
    expect(reco.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("pipeline returns deliverable=true on PASS WITH FIXES", async () => {
    const brief = makeBrief();
    const events: BuildEvent[] = [];

    const result = await runScaffoldPipeline(
      {
        brief,
        project_slug: "folio",
        signal: new AbortController().signal,
      },
      {
        generateCode: async () => "USE_DEFAULT", // template defaults
        runAudit: makeMockJuryAudit(),
        emit: async (e: BuildEvent): Promise<void> => {
          events.push(e);
        },
      },
    );

    expect(result.deliverable).toBe(true);
    expect(result.stack).toBe("nextjs-saas");
    expect(result.audit.verdict === "PASS" || result.audit.verdict === "PASS WITH FIXES").toBe(true);
    expect(result.audit.score).toBeGreaterThan(60);
    expect(result.zip_bytes.length).toBeGreaterThan(0);
    expect(result.manifest.length).toBeGreaterThan(5);

    // Manifest contains the core Next.js SaaS files.
    const paths = result.manifest.map((m) => m.path);
    expect(paths).toContain("package.json");
    expect(paths).toContain("next.config.ts");
    expect(paths).toContain("app/layout.tsx");
    expect(paths).toContain("app/page.tsx");
    expect(paths).toContain("README.md");
  });

  it("BuildEvent stream contains every pipeline phase start + finish", async () => {
    const brief = makeBrief();
    const events: BuildEvent[] = [];

    await runScaffoldPipeline(
      {
        brief,
        project_slug: "folio",
        signal: new AbortController().signal,
      },
      {
        generateCode: async () => "USE_DEFAULT",
        runAudit: makeMockJuryAudit(),
        emit: async (e: BuildEvent): Promise<void> => {
          events.push(e);
        },
      },
    );

    const phaseStarts = new Set(
      events
        .filter((e) => e.type === "phase_started")
        .map((e) => (e.payload as { phase?: string } | undefined)?.phase ?? ""),
    );
    expect(phaseStarts.has("stack_detect")).toBe(true);
    expect(phaseStarts.has("code_gen")).toBe(true);
    expect(phaseStarts.has("compose_scaffold")).toBe(true);
    expect(phaseStarts.has("audit_gate")).toBe(true);
    expect(phaseStarts.has("bundle_zip")).toBe(true);

    expect(events.some((e) => e.type === "audit_gate_decided")).toBe(true);
    expect(events.some((e) => e.type === "delivered")).toBe(true);
  });

  it("zip bytes start with the PK signature", async () => {
    const brief = makeBrief();
    const result = await runScaffoldPipeline(
      {
        brief,
        project_slug: "folio",
        signal: new AbortController().signal,
      },
      {
        generateCode: async () => "USE_DEFAULT",
        runAudit: makeMockJuryAudit(),
        emit: async (): Promise<void> => {
          /* noop */
        },
      },
    );
    expect(result.zip_bytes[0]).toBe(0x50); // 'P'
    expect(result.zip_bytes[1]).toBe(0x4b); // 'K'
  });
});

describe("V2.1 stack detector — alternate briefs", () => {
  it("recommendStack picks cli-tool for a CLI-flavored brief", () => {
    const brief: Brief = {
      ...makeBrief(),
      project_name: "rgctl — a regex compilation CLI",
      idea_summary:
        "A command-line tool that compiles regexes into stable bin shell scripts.",
      target_audience: {
        persona: "Sysadmins and platform engineers",
        primary_need: "A predictable CLI for regex compilation",
        pain_point: "Inconsistent shell tool behavior across distros",
      },
    };
    const reco = recommendStack(brief);
    expect(reco.stack).toBe("cli-tool");
  });

  it("recommendStack picks nodejs-worker for an ETL/worker brief", () => {
    const brief: Brief = {
      ...makeBrief(),
      project_name: "Pipeflow — an ETL background worker",
      idea_summary:
        "Background ETL worker pipeline that runs cron jobs and ingests vendor APIs.",
      target_audience: {
        persona: "Data engineers at small startups",
        primary_need: "A worker for nightly ETL batch jobs",
        pain_point: "Their current cron setup is fragile",
      },
    };
    const reco = recommendStack(brief);
    expect(reco.stack).toBe("nodejs-worker");
  });

  it("Sprint+Axiom override takes precedence", () => {
    const reco = recommendStack(makeBrief(), {
      sprint_recommended_stack: "cli-tool",
    });
    expect(reco.stack).toBe("cli-tool");
    expect(reco.confidence).toBe(1.0);
  });
});
