/**
 * /api/builds/[buildId]/confirm-brief — Phase 9 V2 Batch 1 (Forge).
 *
 * POST → mark the brief as confirmed by the customer. State transition:
 *        brief_awaiting_confirmation → dispatching → layers_running.
 *
 * Per BIGBRAIN.md Hard Rule §1: the brief MUST be confirmed before any
 * layer work begins. This is the only endpoint authorized to make that
 * transition. RLS scopes the row to the calling tenant.
 *
 * After successful confirm, this route enqueues `build-dispatch-layers`
 * which the runner consumes to execute the per-layer plan.
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
    const ok = mockBuildStore.confirmBrief(buildId);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Cannot confirm — not in the right state." },
        { status: 409, headers: aiDisclosureHeaders },
      );
    }
    return NextResponse.json(
      { ok: true, mock: true, buildId },
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
    if (r.state !== "brief_awaiting_confirmation") {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot confirm a brief from state '${r.state}'.`,
        },
        { status: 409, headers: aiDisclosureHeaders },
      );
    }
    const { error: updErr } = await supabase
      .from("builds")
      .update({
        state: "dispatching",
        brief_confirmed_at: new Date().toISOString(),
      })
      .eq("id", buildId);
    if (updErr) {
      return NextResponse.json(
        { ok: false, error: updErr.message },
        { status: 500, headers: aiDisclosureHeaders },
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
      /* runner reconciles 'dispatching' rows */
    }
    return NextResponse.json(
      { ok: true, mock: false, buildId },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "confirm_brief_failed",
      },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}
