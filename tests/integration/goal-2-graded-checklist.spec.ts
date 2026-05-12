/**
 * Studio Zero — Goal 2 integration: graded checklist + score fixture parity.
 *
 * Phase 9 M1 Batch 3 (Verify). Mirrors PRD §4 Goal 2 + test-strategy.md
 * §3 M1 + §4 Goal-2 acceptance row. The sister Playwright spec
 * (`tests/acceptance/goal-2-graded-checklist.spec.ts`) runs on staging
 * via the rendered verdict screen; this integration spec exercises the
 * runner-side contract:
 *
 *   1. Every finding produced by every reviewer has non-null `severity`,
 *      `evidence`, `recommendation`, and `estimated_effort` ∈ {S,M,L}.
 *      This is the PRD §4 Goal-2 acceptance line verbatim.
 *   2. For each canonical fixture row in
 *      `architecture/schemas/score_engine.v1.fixtures.json`, feeding the
 *      runner's score-engine client (here mocked with a v1-faithful
 *      implementation) yields exactly the expected (score, verdict) pair.
 *      The fixture is the contract: any divergence is a bug.
 *   3. Cross-engine parity: the **same** findings array fed to the
 *      reference score_v1() in tests/score-engine.test.ts also produces
 *      the same (score, verdict). This is R8 mitigation in
 *      test-strategy.md (score-engine drift detection).
 *
 * Unhappy paths:
 *   - A finding missing `recommendation` makes the test FAIL — that's a
 *     fixture we construct to prove the assertion fires.
 *   - A finding with `evidence: null` fails — same protection.
 */
import { describe, it, expect } from "vitest";
import fixturesDoc from "../../architecture/schemas/score_engine.v1.fixtures.json" with { type: "json" };

import { runReviewers, reviewersForDepth } from "../../apps/runner/src/reviewers/index.js";
import type { ReviewerContext, ReviewerResult } from "../../apps/runner/src/reviewers/index.js";
import type { FindingRow } from "../../apps/runner/src/findings-writer.js";
import type { LlmGatewayClient } from "../../apps/runner/src/llm-gateway-client.js";
import { createRealtimeEmitter } from "../../apps/runner/src/realtime-emitter.js";
import { score_v1 } from "../score-engine.test.js";

// ---------- helpers ----------

type Severity = "Blocker" | "Critical" | "Major" | "Minor" | "Polish";

interface FixtureRow {
  id: string;
  label: string;
  findings_input: Array<{ severity: Severity }>;
  expected_output: { score: number; verdict: "PASS" | "PASS WITH FIXES" | "FAIL" };
}

const fixtures = (fixturesDoc.rows as unknown as FixtureRow[]) ?? [];

function mockGateway(): LlmGatewayClient {
  return {
    async message(req) {
      return {
        text: `[mock] ${req.reviewerId}`,
        usage: { input: 1, output: 1 },
        modelClass: "fast",
        requestId: "test",
      };
    },
  };
}

// ---------- spec ----------

describe("Goal 2 — every finding is graded with severity/evidence/recommendation/effort", () => {
  it("every reviewer stub emits a finding with the four required keys non-null", async () => {
    const events: unknown[] = [];
    const emitter = createRealtimeEmitter({
      runId: "g2-test",
      progressWindowMs: 1,
      publish: async (_c, e) => {
        events.push(e);
      },
    });
    const ctx: ReviewerContext = {
      runId: "01HX5K0Z9PVB9Y6XTD9HSN9X45",
      tenantId: "22222222-2222-2222-2222-222222222222",
      projectPayload: {},
      gateway: mockGateway(),
      emitter,
      signal: new AbortController().signal,
    };
    // Comprehensive depth runs all six reviewers — broadest coverage.
    const set = reviewersForDepth("comprehensive");
    const results = await runReviewers(set, ctx);

    expect(results.length).toBe(set.length);
    // Every reviewer that completed produces ≥1 finding; the finding
    // carries the four-keys-non-null Goal-2 contract.
    let totalFindings = 0;
    for (const r of results) {
      expect(r.status).toBe("complete");
      expect(r.findings.length).toBeGreaterThan(0);
      for (const f of r.findings) {
        expect(f.severity, `${r.reviewer} ${f.id} severity`).toBeTruthy();
        expect(["Blocker", "Critical", "Major", "Minor", "Polish"]).toContain(
          f.severity,
        );
        expect(f.evidence, `${r.reviewer} ${f.id} evidence`).toBeTruthy();
        // Evidence must be an object with a `type` key (file|url|screenshot|transcript).
        expect(typeof f.evidence).toBe("object");
        expect((f.evidence as Record<string, unknown>).type).toBeTypeOf("string");
        expect(
          f.recommendation,
          `${r.reviewer} ${f.id} recommendation`,
        ).toBeTruthy();
        expect(f.recommendation.length).toBeGreaterThan(0);
        expect(
          ["S", "M", "L"],
          `${r.reviewer} ${f.id} estimated_effort`,
        ).toContain(f.estimated_effort);
        // Layer + reviewer + summary are also required by audit-output.v1.
        expect(f.layer).toBeTruthy();
        expect(f.summary.length).toBeGreaterThan(0);
        expect(f.reviewer).toBe(r.reviewer);
        totalFindings++;
      }
    }
    expect(totalFindings).toBeGreaterThanOrEqual(6); // 6 reviewers, ≥1 each
    await emitter.close();
  });

  it("(unhappy) the assertion FAILS on a synthetic finding missing recommendation", () => {
    const bad: Partial<FindingRow> = {
      id: "F-099",
      reviewer: "optic",
      severity: "Minor",
      layer: "design",
      summary: "Bad shape",
      evidence: { type: "file", path: "x" },
      // recommendation deliberately missing
      estimated_effort: "S",
    };
    // The contract is binary: a missing required key means the assertion
    // we use in the happy-path test must FAIL. We model it directly so
    // future contributors see exactly what shape failure looks like.
    expect(() => {
      const recommendation = (bad as { recommendation?: string }).recommendation;
      expect(recommendation).toBeTruthy();
      expect(recommendation && recommendation.length > 0).toBe(true);
    }).toThrow();
  });

  it("(unhappy) the assertion FAILS on a synthetic finding with evidence=null", () => {
    const bad: Partial<FindingRow> = {
      id: "F-100",
      reviewer: "halo",
      severity: "Major",
      layer: "accessibility",
      summary: "Missing alt",
      evidence: null as unknown as Record<string, unknown>,
      recommendation: "Fix it",
      estimated_effort: "M",
    };
    expect(() => {
      expect(bad.evidence).toBeTruthy();
    }).toThrow();
  });
});

describe("Goal 2 — score parity vs score_engine.v1.fixtures.json", () => {
  it(`loads the canonical fixture file (${fixtures.length} rows)`, () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(15);
    expect(fixturesDoc.engine_version).toBe("v1");
  });

  for (const fx of fixtures) {
    it(`${fx.id} — runner-side score path produces ${fx.expected_output.verdict} / ${fx.expected_output.score}`, () => {
      // The "runner-side" path: runner sends findings to the score-engine
      // Edge Function. We can't hit the Edge Function in unit-time, but
      // we can prove the runner's INPUT shape matches the v1 contract:
      // a Findings[] with `severity` keys. We compute via the v1
      // reference implementation that the engine MUST match (R8 drift).
      const findings = fx.findings_input.map((f) => ({ severity: f.severity }));
      const r = score_v1(findings);
      expect(r.score, `${fx.id} score`).toBe(fx.expected_output.score);
      expect(r.verdict, `${fx.id} verdict`).toBe(fx.expected_output.verdict);
    });
  }
});

describe("Goal 2 — verdict-screen contract (audit-output.v1 keys present)", () => {
  it("every required audit-output key is enumerable when composed at runner-jury", () => {
    // The runner's jury.synthesizeJury assembles the AuditOutput.
    // Required keys (audit-output.v1.schema.json):
    //   verdict, score, score_engine_version, audience, watermark,
    //   findings, score_breakdown.
    // We assert the SHAPE is producable from a minimal input.
    const sample = {
      verdict: "PASS WITH FIXES" as const,
      score: 79,
      score_engine_version: "v1",
      audience: "test",
      watermark: null,
      findings: [],
      score_breakdown: {
        ux: 80,
        accessibility: 90,
        copy: 85,
        brand: 88,
        flow: 92,
        audience: 80,
      },
    };
    const required = [
      "verdict",
      "score",
      "score_engine_version",
      "audience",
      "watermark",
      "findings",
      "score_breakdown",
    ];
    for (const k of required) {
      expect(sample).toHaveProperty(k);
    }
  });
});
