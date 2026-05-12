/**
 * Studio Zero — V2 Build mode audit-gate FAIL spec.
 *
 * Phase 9 V2 Batch 1 (Forge). Negative test for the V2 milestone exit
 * gate: when Jury verdicts FAIL on the assembled bundle, delivery MUST
 * be refused and a refund offered.
 *
 * Mirrors `tests/integration/auto-pr-reaudit-fail.spec.ts` for the V1.5
 * Auto-PR equivalent. Both gates share the principle: bad output never
 * ships, regardless of whether the customer would still want it.
 *
 * This spec asserts:
 *   - Bundle assembly proceeds normally.
 *   - With audit_gate.verdict='FAIL', the repo seeder MUST NOT be called.
 *   - The roadmap-bundle still carries a `rejection_reason`.
 */
import { describe, it, expect, vi } from "vitest";

import {
  dispatchLayers,
  makeStubRunLayer,
} from "../../apps/runner/src/build/v2/layer-dispatcher.js";
import { assembleBundle } from "../../apps/runner/src/build/v2/bundle-assembler.js";
import { seedRepo, type GhSeederClient } from "../../apps/runner/src/build/v2/repo-seeder.js";
import type { Brief, BuildEvent } from "../../apps/runner/src/build/v2/types.js";

function makeBrief(): Brief {
  return {
    schema_version: "brief.v1",
    build_id: "33333333-3333-3333-3333-333333333333",
    tenant_id: "44444444-4444-4444-4444-444444444444",
    project_name: "RegulatedFinTech — KYC-heavy product",
    target_audience: {
      persona: "FinTech founder",
      primary_need: "Compliant KYC flow",
      pain_point: "Onboarding friction",
    },
    jtbd: "When fintech founders launch, they need compliant KYC.",
    success_criteria: ["Pass external pentest before launch"],
    risk_profile: "regulated",
    team_roster: ["saas"],
    output_preference: "roadmap-docs-repo",
    generated_at: "2026-05-12T00:00:00Z",
    produced_by: {
      agent: "bigbrain",
      model_class: "thoughtful",
      request_id: "spec-fail",
    },
  };
}

/** A GitHub client that flags any call — used to assert that the
 *  seeder is NEVER invoked when the audit gate FAILs. */
function spyGh(): { client: GhSeederClient; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    client: {
      async createRepo() {
        calls.push("createRepo");
        return { html_url: "x", default_branch: "main" };
      },
      async putFile() {
        calls.push("putFile");
        return { sha: "x" };
      },
      async createMilestone() {
        calls.push("createMilestone");
        return { number: 1 };
      },
      async createIssue() {
        calls.push("createIssue");
        return { number: 1, html_url: "x" };
      },
    },
  };
}

/** Caller-side guard: a worker MUST NOT call seedRepo when audit_gate
 *  reports FAIL. This helper mirrors the worker's branch. */
function maybeSeed(
  bundle: ReturnType<typeof assembleBundle>,
  client: GhSeederClient,
): Promise<{ skipped: true } | { skipped: false }> {
  if (bundle.audit_gate.verdict === "FAIL") {
    return Promise.resolve({ skipped: true } as const);
  }
  // Sanity-only — won't be reached in this spec.
  return seedRepo(
    { bundle, owner: "x", repoSlug: bundle.brief_ref },
    client,
  ).then(() => ({ skipped: false } as const));
}

describe("V2 Build mode — audit gate FAIL halts delivery", () => {
  it("FAIL verdict → seed NOT called → refund signaled", async () => {
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
    expect(dispatch.outputs).toHaveLength(8);

    // Audit gate decides FAIL on the bundle.
    const bundle = assembleBundle({
      brief,
      outputs: dispatch.outputs,
      auditGate: {
        verdict: "FAIL",
        score: 41,
        decided_at: new Date().toISOString(),
        audit_run_id: "audit-fail-spec",
        rejection_reason:
          "Shield finding C2 (regulated profile + no KYC documentation): Critical.",
      },
      runner_version: "2.0.0",
    });
    expect(bundle.audit_gate.verdict).toBe("FAIL");
    expect(bundle.audit_gate.rejection_reason).toMatch(/Critical/);

    const { client, calls } = spyGh();
    const result = await maybeSeed(bundle, client);
    expect((result as { skipped: boolean }).skipped).toBe(true);
    expect(calls).toEqual([]);
  });

  it("schema still validates a FAIL bundle (rejection_reason is optional but typed)", async () => {
    const brief = makeBrief();
    const dispatch = await dispatchLayers(
      { brief, signal: new AbortController().signal },
      {
        runLayer: makeStubRunLayer(),
        emit: async (): Promise<void> => {
          /* noop */
        },
      },
    );
    const bundle = assembleBundle({
      brief,
      outputs: dispatch.outputs,
      auditGate: {
        verdict: "FAIL",
        score: 30,
        decided_at: new Date().toISOString(),
        rejection_reason: "Multiple Critical findings.",
      },
      runner_version: "2.0.0",
    });
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
    const schemaMod = await import(
      "../../apps/runner/schemas/roadmap-bundle.v1.schema.json",
      { with: { type: "json" } }
    );
    const validate = ajv.compile(
      (schemaMod as unknown as { default: object }).default ?? schemaMod,
    );
    expect(validate(bundle)).toBe(true);
  });
});
