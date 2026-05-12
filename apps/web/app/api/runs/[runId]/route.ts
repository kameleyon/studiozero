import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import {
  getReviewerProgress,
  getRunState,
  getRunVerdict,
} from "../../../../lib/run-state-machine";

/**
 * GET /api/runs/[runId]
 *
 * Returns the current state of a mock run. Each request advances the
 * client's view of the state machine by virtue of the wall-clock progress
 * since `registerMockRun()` was called — see `lib/run-state-machine.ts`.
 *
 * Response shape MATCHES (subset of) what M1+1 Supabase Realtime channel
 * `runs:<run_id>` will deliver:
 *   { state, progress, reviewers[], verdict?, score?, findings? }
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3.
 *
 * Owner: Forge (this dispatch).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RunStateResponse {
  mock: true;
  runId: string;
  state: ReturnType<typeof getRunState>["state"];
  progress: number;
  elapsedMs: number;
  reviewers: ReturnType<typeof getReviewerProgress>;
  verdict: ReturnType<typeof getRunVerdict>;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ runId: string }> },
): Promise<NextResponse<RunStateResponse>> {
  const { runId } = await ctx.params;
  const { state, progress, elapsedMs } = getRunState(runId);
  const reviewers = getReviewerProgress(runId);
  const verdict = getRunVerdict(runId);

  return NextResponse.json<RunStateResponse>(
    {
      mock: true,
      runId,
      state,
      progress,
      elapsedMs,
      reviewers,
      verdict,
    },
    { status: 200, headers: aiDisclosureHeaders },
  );
}
