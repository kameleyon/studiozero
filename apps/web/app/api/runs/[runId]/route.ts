/**
 * GET /api/runs/[runId] — Phase 9 M1 Batch 2 (Vega).
 *
 * Returns the current state of an audit run. The response shape matches
 * (a subset of) what Supabase Realtime on `runs:<runId>` delivers so
 * the audit page can use one render contract for mock + real.
 *
 * Two paths:
 *   - MOCK (`isMockMode()`): wall-clock state machine from
 *     `lib/run-state-machine.ts`. Used by the offline demo + when
 *     Supabase env vars are absent.
 *   - REAL: SELECT runs + reviewer_progress + findings (RLS-scoped via
 *     the user's session client). Verdict is included only when the
 *     run is in `verdict_emitted` or `archived` state.
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3.
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { isMockMode } from "../../../../lib/env";
import {
  getReviewerProgress,
  getRunState,
  getRunVerdict,
} from "../../../../lib/run-state-machine";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

import type {
  MockFinding,
  MockScoreBreakdown,
} from "../../../../lib/mock-data";
import type {
  ReviewerProgress,
  RunState,
  Verdict,
} from "../../../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RunStateResponse {
  mock: boolean;
  runId: string;
  state: RunState;
  progress: number;
  elapsedMs: number;
  reviewers: ReviewerProgress[];
  verdict: {
    verdict: Verdict;
    score: MockScoreBreakdown;
    findings: MockFinding[];
  } | null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ runId: string }> },
): Promise<NextResponse<RunStateResponse>> {
  const { runId } = await ctx.params;

  // ---- MOCK ------------------------------------------------------------
  if (isMockMode()) {
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

  // ---- REAL ------------------------------------------------------------
  try {
    const supabase = await createServerSupabaseClient();
    const { data: runRow, error } = await supabase
      .from("runs")
      .select(
        "id, state, started_at, finished_at, verdict, score_total, score_categories, depth",
      )
      .eq("id", runId)
      .single();

    if (error || !runRow) {
      // Empty queued snapshot lets the UI render its "queued" frame.
      return NextResponse.json<RunStateResponse>(
        {
          mock: false,
          runId,
          state: "queued",
          progress: 0,
          elapsedMs: 0,
          reviewers: [],
          verdict: null,
        },
        { status: 200, headers: aiDisclosureHeaders },
      );
    }

    const row = runRow as {
      id: string;
      state: RunState;
      started_at: string;
      finished_at: string | null;
      verdict: Verdict | null;
      score_total: number | null;
      score_categories:
        | Array<{ name: string; score: number; weight: number }>
        | null;
    };

    const startedAt = new Date(row.started_at).getTime();
    const finishedAt = row.finished_at
      ? new Date(row.finished_at).getTime()
      : Date.now();
    const elapsedMs = Math.max(0, finishedAt - startedAt);

    // reviewer_progress rows for this run
    const { data: reviewerRows } = await supabase
      .from("reviewer_progress")
      .select("reviewer, status, phase, partial_findings")
      .eq("run_id", runId);

    const reviewers: ReviewerProgress[] = (reviewerRows ?? []).map((r) => {
      const rr = r as {
        reviewer: ReviewerProgress["reviewer"];
        status: ReviewerProgress["status"];
        phase: ReviewerProgress["phase"];
        partial_findings: number;
      };
      return {
        reviewer: rr.reviewer,
        status: rr.status,
        phase: rr.phase,
        partialFindings: rr.partial_findings ?? 0,
        elapsedMs,
      };
    });

    // Progress: derive a 0..1 from state ladder.
    const stateOrder: Record<string, number> = {
      created: 0,
      queued: 0.05,
      dispatched: 0.1,
      reviewers_running: 0.45,
      all_reviewers_complete: 0.8,
      jury_synthesizing: 0.9,
      verdict_emitted: 1,
      archived: 1,
      cancelled: 1,
      failed_recoverable: 0.5,
      failed_terminal: 1,
      partial_completed: 1,
      suspended_violation: 0.5,
    };
    const progress = stateOrder[row.state] ?? 0;

    let verdict: RunStateResponse["verdict"] = null;
    if (
      (row.state === "verdict_emitted" || row.state === "archived") &&
      row.verdict
    ) {
      const { data: findingsRows } = await supabase
        .from("findings")
        .select(
          "id, severity, reviewer, category, title, what_we_found, why_it_matters, fix, file_path, line_range",
        )
        .eq("run_id", runId)
        .order("severity_rank", { ascending: true });

      const findings: MockFinding[] = (findingsRows ?? []).map((f) => {
        const ff = f as {
          id: string;
          severity: MockFinding["severity"];
          reviewer: MockFinding["reviewer"];
          category: MockFinding["category"];
          title: string;
          what_we_found: string;
          why_it_matters: string;
          fix: string;
          file_path: string;
          line_range: string;
        };
        return {
          id: ff.id,
          severity: ff.severity,
          reviewer: ff.reviewer,
          category: ff.category,
          title: ff.title,
          whatWeFound: ff.what_we_found,
          whyItMatters: ff.why_it_matters,
          fix: ff.fix,
          filePath: ff.file_path,
          lineRange: ff.line_range,
        };
      });

      verdict = {
        verdict: row.verdict,
        score: {
          total: row.score_total ?? 0,
          categories: row.score_categories ?? [],
        },
        findings,
      };
    }

    return NextResponse.json<RunStateResponse>(
      {
        mock: false,
        runId,
        state: row.state,
        progress,
        elapsedMs,
        reviewers,
        verdict,
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch {
    return NextResponse.json<RunStateResponse>(
      {
        mock: false,
        runId,
        state: "queued",
        progress: 0,
        elapsedMs: 0,
        reviewers: [],
        verdict: null,
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }
}
