/**
 * /api/builds/[buildId]/cancel — Phase 9 V2 Batch 1 (Forge).
 *
 * POST → cancel a running build. Computes a pro-rata refund based on
 * how many layers completed:
 *   - 0 layers complete   → 100% refund
 *   - N of 8 layers       → ((8 - N) / 8) * paid
 *
 * State transition: any non-terminal → 'cancelled'. Halts pg-boss jobs
 * via the abort-controller registry (worker-side). Stripe refund is
 * triggered via a separate Edge Function (not exposed here).
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../../lib/ai-disclosure";
import { mockBuildStore } from "../../../../../lib/build-mock-store";
import { hasSupabaseEnv, isMockMode } from "../../../../../lib/env";
import { createServerSupabaseClient } from "../../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["delivered", "cancelled", "failed", "audit_failed"]);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ buildId: string }> },
): Promise<NextResponse> {
  const { buildId } = await params;

  if (isMockMode() || !hasSupabaseEnv()) {
    const r = mockBuildStore.get(buildId);
    if (!r) {
      return NextResponse.json(
        { ok: false, error: "build_not_found" },
        { status: 404, headers: aiDisclosureHeaders },
      );
    }
    if (TERMINAL.has(r.state)) {
      return NextResponse.json(
        { ok: false, error: `Cannot cancel from state '${r.state}'.` },
        { status: 409, headers: aiDisclosureHeaders },
      );
    }
    const completed = r.layers.filter((l) => l.status === "complete").length;
    const refundFraction = (r.layers.length - completed) / r.layers.length;
    mockBuildStore.cancel(buildId);
    return NextResponse.json(
      {
        ok: true,
        mock: true,
        buildId,
        refund: { fraction: refundFraction, layers_completed: completed },
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: row, error: selErr } = await supabase
      .from("builds")
      .select("id, state, tenant_id, layers")
      .eq("id", buildId)
      .single();
    if (selErr || !row) {
      return NextResponse.json(
        { ok: false, error: "build_not_found" },
        { status: 404, headers: aiDisclosureHeaders },
      );
    }
    const r = row as {
      id: string;
      state: string;
      tenant_id: string;
      layers: Array<{ status: string }> | null;
    };
    if (TERMINAL.has(r.state)) {
      return NextResponse.json(
        { ok: false, error: `Cannot cancel from state '${r.state}'.` },
        { status: 409, headers: aiDisclosureHeaders },
      );
    }
    const total = (r.layers ?? []).length || 8;
    const completed = (r.layers ?? []).filter(
      (l) => l.status === "complete",
    ).length;
    const refundFraction = (total - completed) / total;

    const { error: updErr } = await supabase
      .from("builds")
      .update({
        state: "cancelled",
        cancelled_at: new Date().toISOString(),
        refund_fraction: refundFraction,
      })
      .eq("id", buildId);
    if (updErr) {
      return NextResponse.json(
        { ok: false, error: updErr.message },
        { status: 500, headers: aiDisclosureHeaders },
      );
    }

    // Fire the refund edge fn — non-blocking.
    try {
      const { createServiceRoleClient } = await import(
        "../../../../../lib/supabase-service"
      );
      const service = createServiceRoleClient();
      await service.rpc("enqueue_build_refund", {
        p_build_id: buildId,
        p_tenant_id: r.tenant_id,
        p_refund_fraction: refundFraction,
      });
    } catch {
      /* refund worker will reconcile */
    }
    return NextResponse.json(
      {
        ok: true,
        mock: false,
        buildId,
        refund: { fraction: refundFraction, layers_completed: completed },
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "cancel_failed",
      },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}
