import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../../lib/ai-disclosure";
import { getRunVerdict } from "../../../../../lib/run-state-machine";

/**
 * GET /api/runs/[runId]/findings
 *
 * Returns the mock findings list once the run has emitted a verdict.
 * Before `verdict_emitted`, returns 200 with `{ findings: [], pending: true }`
 * so the dashboard can poll without a flash of error.
 *
 * Real M1+1 wiring will return findings as reviewers complete (per
 * audit-run-state-machine.md `reviewers_running` → per-reviewer
 * `complete` substate). M1 mock waits until terminal state to keep
 * the demo predictable.
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3.
 *
 * Owner: Forge (this dispatch).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ runId: string }> },
): Promise<NextResponse> {
  const { runId } = await ctx.params;
  const verdict = getRunVerdict(runId);
  if (!verdict) {
    return NextResponse.json(
      { mock: true, runId, findings: [], pending: true },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }
  return NextResponse.json(
    {
      mock: true,
      runId,
      verdict: verdict.verdict,
      score: verdict.score,
      findings: verdict.findings,
      pending: false,
    },
    { status: 200, headers: aiDisclosureHeaders },
  );
}
