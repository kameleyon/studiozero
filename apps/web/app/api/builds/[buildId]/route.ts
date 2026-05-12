/**
 * /api/builds/[buildId] — Phase 9 V2 Batch 1 (Forge).
 *
 * GET → return the live snapshot for the build, used by the dashboard.
 *       The client polls this every 2s; production code SHOULD additionally
 *       subscribe to Supabase Realtime channel `build:<buildId>` for
 *       sub-second updates (wired by milestone-V2.md "Live build dashboard"
 *       deliverable).
 *
 * `?include=output` returns the assembled documents (used by
 * /app/builds/[buildId]/output).
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { mockBuildStore } from "../../../../lib/build-mock-store";
import { hasSupabaseEnv, isMockMode } from "../../../../lib/env";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ buildId: string }> },
): Promise<NextResponse> {
  const { buildId } = await params;
  const url = new URL(req.url);
  const include = url.searchParams.get("include");

  /* ---- MOCK path ------------------------------------------------------ */
  if (isMockMode() || !hasSupabaseEnv()) {
    const r = mockBuildStore.get(buildId);
    if (!r) {
      return NextResponse.json(
        { error: "build_not_found" },
        { status: 404, headers: aiDisclosureHeaders },
      );
    }
    if (include === "output") {
      if (!r.output) {
        return NextResponse.json(
          { error: "Output not yet assembled." },
          { status: 425, headers: aiDisclosureHeaders },
        );
      }
      return NextResponse.json(
        {
          output: {
            build_id: r.id,
            verdict: r.verdict,
            score: r.score,
            documents: r.output,
            repo_url: r.repoUrl,
          },
        },
        { status: 200, headers: aiDisclosureHeaders },
      );
    }
    const completedLayers = r.layers.filter(
      (l) => l.status === "complete",
    ).length;
    const remaining = r.layers.length - completedLayers;
    return NextResponse.json(
      {
        build: {
          buildId: r.id,
          state: r.state,
          projectName: r.projectName,
          outputPreference: r.outputPreference,
          brief: r.brief,
          layers: r.layers,
          etaSeconds: remaining > 0 ? remaining * 90 : null,
          startedAt: r.createdAt,
          verdict: r.verdict,
          score: r.score,
          repoUrl: r.repoUrl,
          outputUrl: r.output ? `/app/builds/${r.id}/output` : null,
          mock: true,
        },
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  /* ---- REAL path ------------------------------------------------------ */
  try {
    const supabase = await createServerSupabaseClient();
    const { data: row, error } = await supabase
      .from("builds")
      .select(
        "id, state, project_name, output_preference, brief, layers, verdict, score, repo_url, created_at, eta_seconds, output",
      )
      .eq("id", buildId)
      .single();
    if (error || !row) {
      return NextResponse.json(
        { error: "build_not_found" },
        { status: 404, headers: aiDisclosureHeaders },
      );
    }
    const r = row as {
      id: string;
      state: string;
      project_name: string;
      output_preference: string;
      brief: Record<string, unknown> | null;
      layers: Array<Record<string, unknown>> | null;
      verdict: "PASS" | "PASS WITH FIXES" | "FAIL" | null;
      score: number | null;
      repo_url: string | null;
      created_at: string;
      eta_seconds: number | null;
      output: Record<string, string> | null;
    };
    if (include === "output") {
      if (!r.output) {
        return NextResponse.json(
          { error: "Output not yet assembled." },
          { status: 425, headers: aiDisclosureHeaders },
        );
      }
      return NextResponse.json(
        {
          output: {
            build_id: r.id,
            verdict: r.verdict,
            score: r.score,
            documents: r.output,
            repo_url: r.repo_url,
          },
        },
        { status: 200, headers: aiDisclosureHeaders },
      );
    }
    return NextResponse.json(
      {
        build: {
          buildId: r.id,
          state: r.state,
          projectName: r.project_name,
          outputPreference: r.output_preference,
          brief: r.brief,
          layers: r.layers ?? [],
          etaSeconds: r.eta_seconds,
          startedAt: r.created_at,
          verdict: r.verdict,
          score: r.score,
          repoUrl: r.repo_url,
          outputUrl: r.output ? `/app/builds/${r.id}/output` : null,
          mock: false,
        },
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "fetch_build_failed",
      },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}
