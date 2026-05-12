import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";
import { MOCK_PROJECTS } from "../../../lib/mock-data";
import { registerMockRun } from "../../../lib/run-state-machine";

/**
 * /api/runs
 *
 * GET  → list of mock runs (one-per-project demo set)
 * POST → create a new mock run, return its runId
 *
 * **MOCK** — Phase 9 M1 starter. Real M1+1 wiring:
 *   · Forge: enqueue pg-boss job tagged with tenant_id from JWT
 *   · Atlas: insert `runs` row in `created` state, RLS-scoped to tenant
 *   · Crash: per-tenant concurrency cap check
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3.
 *
 * Owner: Forge (this dispatch).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RunListItem {
  id: string;
  projectId: string;
  projectName: string;
  state: "verdict_emitted" | "queued";
  verdict: "FAIL" | "PASS_WITH_FIXES" | null;
  startedAt: string;
}

export function GET(): NextResponse<{ runs: RunListItem[]; mock: true }> {
  const runs: RunListItem[] = MOCK_PROJECTS.map((p) => ({
    id: p.lastRunId ?? `run-demo-${p.id}`,
    projectId: p.id,
    projectName: p.name,
    state: "verdict_emitted",
    verdict: p.lastVerdict === "FAIL" ? "FAIL" : p.lastVerdict === "PASS_WITH_FIXES" ? "PASS_WITH_FIXES" : null,
    startedAt: p.createdAt,
  }));

  return NextResponse.json(
    { runs, mock: true },
    { status: 200, headers: aiDisclosureHeaders },
  );
}

interface CreateRunRequest {
  /** "github" | "url" | "local" — drives the deterministic mock verdict. */
  intakeMethod?: "github" | "url" | "local";
  /** Quick / Comprehensive depth. */
  depth?: "quick" | "comprehensive";
  /** BYOK | Managed | CLI. */
  mode?: "byok" | "managed" | "cli";
}

interface CreateRunResponse {
  ok: true;
  mock: true;
  runId: string;
  redirectTo: string;
}

export async function POST(
  req: Request,
): Promise<NextResponse<CreateRunResponse>> {
  let body: CreateRunRequest = {};
  try {
    body = (await req.json()) as CreateRunRequest;
  } catch {
    // Empty body is fine — the mock defaults to URL-Surface-FAIL flow.
  }

  // Deterministic mock runId based on flow signature so each scenario
  // is reproducible.
  // - GitHub + Code + BYOK → run-demo-3 (PASS WITH FIXES)
  // - URL + Surface       → run-demo-fail-<ts> (FAIL)
  const isCodePath =
    body.intakeMethod === "github" || body.intakeMethod === "local";

  const runId = isCodePath
    ? "run-demo-3"
    : `run-demo-fail-${Date.now().toString(36)}`;

  // Seed the in-memory state machine.
  registerMockRun(runId);

  return NextResponse.json<CreateRunResponse>(
    {
      ok: true,
      mock: true,
      runId,
      redirectTo: `/app/audits/${runId}`,
    },
    { status: 201, headers: aiDisclosureHeaders },
  );
}
