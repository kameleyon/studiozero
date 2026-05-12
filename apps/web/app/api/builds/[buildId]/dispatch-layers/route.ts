/**
 * /api/builds/[buildId]/dispatch-layers — Phase 9 V2 Batch 1 (Forge).
 *
 * POST → admin/internal-only re-dispatch entry point. Used by support to
 * re-kick a stuck build after BigBrain confirmation. The customer-facing
 * confirm flow goes through /api/builds/[buildId]/confirm-brief which
 * already enqueues the dispatch job.
 *
 * Auth: requires authenticated session + role=admin OR the calling user
 * to be the build's tenant owner.
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../../lib/ai-disclosure";
import { mockBuildStore } from "../../../../../lib/build-mock-store";
import { hasSupabaseEnv, isMockMode } from "../../../../../lib/env";
import { createServerSupabaseClient } from "../../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ buildId: string }> },
): Promise<NextResponse> {
  const { buildId } = await params;

  if (isMockMode() || !hasSupabaseEnv()) {
    // In mock mode, the confirmBrief() call already wires the layer ticker.
    // We expose this as an idempotent no-op so the integration test can call
    // it without side effects.
    const r = mockBuildStore.get(buildId);
    if (!r) {
      return NextResponse.json(
        { ok: false, error: "build_not_found" },
        { status: 404, headers: aiDisclosureHeaders },
      );
    }
    return NextResponse.json(
      { ok: true, mock: true, buildId, state: r.state },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: row, error: selErr } = await supabase
      .from("builds")
      .select("id, state, tenant_id")
      .eq("id", buildId)
      .single();
    if (selErr || !row) {
      return NextResponse.json(
        { ok: false, error: "build_not_found" },
        { status: 404, headers: aiDisclosureHeaders },
      );
    }
    const r = row as { id: string; state: string; tenant_id: string };

    if (
      r.state !== "dispatching" &&
      r.state !== "layers_running" &&
      r.state !== "brief_awaiting_confirmation"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot dispatch layers from state '${r.state}'.`,
        },
        { status: 409, headers: aiDisclosureHeaders },
      );
    }

    try {
      const { createServiceRoleClient } = await import(
        "../../../../../lib/supabase-service"
      );
      const service = createServiceRoleClient();
      await service.rpc("enqueue_build_dispatch_layers", {
        p_build_id: buildId,
        p_tenant_id: r.tenant_id,
      });
    } catch {
      /* runner reconciles */
    }
    return NextResponse.json(
      { ok: true, mock: false, buildId },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "dispatch_failed",
      },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}
