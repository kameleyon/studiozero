/**
 * /api/builds — Phase 9 V2 Batch 1 (Forge).
 *
 * GET  → list builds scoped via RLS to the authenticated tenant.
 * POST → validate intake payload (ajv) → insert `builds` row in state
 *        'brief_generating' → enqueue pg-boss job `build-brief` with
 *        `{ buildId, tenantId }` via service-role → return `{ buildId }`.
 *
 * Pricing rate-limit:
 *   - Managed Pro $249/mo gives 1 build / 30 days.
 *   - Premium Build add-on $999/build (unlimited).
 *   - Enforced server-side by counting `builds` rows in the trailing 30 days
 *     for tenants whose plan is `managed_pro`. (`managed_pro_build` plan
 *     bypasses the cap.)
 *
 * Mock fallback: when env is absent (per lib/env.ts isMockMode()), we use
 * an in-memory mock store keyed by build id — round-trips the intake to
 * the live dashboard without hitting Supabase.
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3 + §14.5
 * (AI System Card v1.0 disclosure binding).
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";
import { mockBuildStore } from "../../../lib/build-mock-store";
import { hasSupabaseEnv, isMockMode } from "../../../lib/env";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BuildListItem {
  id: string;
  projectName: string;
  state: string;
  verdict: "FAIL" | "PASS_WITH_FIXES" | "PASS" | null;
  createdAt: string;
  outputPreference: string;
}

/* --------------------------------------------------------------------- */
/* GET — list                                                              */
/* --------------------------------------------------------------------- */

export async function GET(): Promise<
  NextResponse<{ builds: BuildListItem[]; mock: boolean }>
> {
  if (isMockMode()) {
    const builds = mockBuildStore.list();
    return NextResponse.json(
      { builds, mock: true },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("builds")
      .select(
        "id, project_name, state, verdict, output_preference, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      return NextResponse.json(
        { builds: [], mock: false },
        { status: 200, headers: aiDisclosureHeaders },
      );
    }
    const builds: BuildListItem[] = (data ?? []).map((row) => {
      const r = row as {
        id: string;
        project_name: string;
        state: string;
        verdict: "FAIL" | "PASS_WITH_FIXES" | "PASS" | null;
        output_preference: string;
        created_at: string;
      };
      return {
        id: r.id,
        projectName: r.project_name,
        state: r.state,
        verdict: r.verdict,
        createdAt: r.created_at,
        outputPreference: r.output_preference,
      };
    });
    return NextResponse.json(
      { builds, mock: false },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch {
    return NextResponse.json(
      { builds: [], mock: false },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }
}

/* --------------------------------------------------------------------- */
/* POST — create                                                           */
/* --------------------------------------------------------------------- */

interface IntakeBody {
  project_name?: string;
  idea?: string;
  target_audience?: {
    persona?: string;
    primary_need?: string;
    pain_point?: string;
  };
  vibe?: { adjectives?: string[]; reference_urls?: string[] };
  constraints?: {
    budget_usd?: number | null;
    deadline?: string | null;
    must_have_features?: string[];
    non_goals?: string[];
  };
  output_preference?:
    | "roadmap-docs"
    | "roadmap-docs-repo"
    | "roadmap-docs-repo-scaffold";
}

function validateIntake(body: IntakeBody): string[] {
  const errs: string[] = [];
  if (!body.project_name || body.project_name.trim().length < 3)
    errs.push("project_name must be at least 3 characters.");
  if (!body.idea || body.idea.trim().length < 20)
    errs.push("idea must be at least 20 characters.");
  const ta = body.target_audience;
  if (!ta?.persona || ta.persona.trim().length < 3)
    errs.push("target_audience.persona required.");
  if (!ta?.primary_need || ta.primary_need.trim().length < 3)
    errs.push("target_audience.primary_need required.");
  if (!ta?.pain_point || ta.pain_point.trim().length < 3)
    errs.push("target_audience.pain_point required.");
  if (
    body.output_preference !== "roadmap-docs" &&
    body.output_preference !== "roadmap-docs-repo" &&
    body.output_preference !== "roadmap-docs-repo-scaffold"
  )
    errs.push("output_preference invalid.");
  if (body.output_preference === "roadmap-docs-repo-scaffold")
    errs.push(
      "roadmap-docs-repo-scaffold is V2.1 — audit-gated; not available yet.",
    );
  return errs;
}

export async function POST(
  req: Request,
): Promise<
  NextResponse<
    | { ok: true; mock: boolean; buildId: string; redirectTo: string }
    | { ok: false; error: string }
  >
> {
  let body: IntakeBody = {};
  try {
    body = (await req.json()) as IntakeBody;
  } catch {
    /* empty body still validated below */
  }

  const errs = validateIntake(body);
  if (errs.length > 0) {
    return NextResponse.json(
      { ok: false, error: errs.join(" ") },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  /* ---- MOCK path ------------------------------------------------------ */
  if (isMockMode() || !hasSupabaseEnv()) {
    const buildId = `build-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    mockBuildStore.create({
      id: buildId,
      projectName: body.project_name?.trim() ?? "Untitled build",
      idea: body.idea?.trim() ?? "",
      targetAudience: body.target_audience ?? {},
      vibe: body.vibe ?? {},
      constraints: body.constraints ?? {},
      outputPreference: body.output_preference ?? "roadmap-docs-repo",
    });
    return NextResponse.json(
      {
        ok: true,
        mock: true,
        buildId,
        redirectTo: `/app/builds/${buildId}`,
      },
      { status: 201, headers: aiDisclosureHeaders },
    );
  }

  /* ---- REAL path ------------------------------------------------------ */
  try {
    const supabase = await createServerSupabaseClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return NextResponse.json(
        { ok: false, error: "Not signed in." },
        { status: 401, headers: aiDisclosureHeaders },
      );
    }
    const tenantId =
      (userData.user.user_metadata as { default_tenant_id?: string })
        ?.default_tenant_id ?? null;
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "Tenant not provisioned." },
        { status: 403, headers: aiDisclosureHeaders },
      );
    }

    // Rate-limit: Managed Pro $249/mo gives 1 build / 30 days.
    // Skip the cap for `managed_pro_build` ($499/mo) and premium add-on rows.
    try {
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("plan")
        .eq("id", tenantId)
        .single();
      const plan = (tenantRow as { plan?: string } | null)?.plan ?? "free";
      if (plan === "managed_pro") {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("builds")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since);
        if ((count ?? 0) >= 1) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Managed Pro includes 1 build / 30 days. Upgrade to Managed Pro Build ($499/mo) or buy a Premium Build add-on ($999/build).",
            },
            { status: 402, headers: aiDisclosureHeaders },
          );
        }
      }
    } catch {
      // Non-fatal — DB cap policy will enforce.
    }

    const buildId = crypto.randomUUID();

    const { data: row, error: insertErr } = await supabase
      .from("builds")
      .insert({
        id: buildId,
        tenant_id: tenantId,
        state: "brief_generating",
        project_name: body.project_name?.trim() ?? "Untitled build",
        idea: body.idea?.trim() ?? "",
        target_audience: body.target_audience ?? {},
        vibe: body.vibe ?? {},
        constraints: body.constraints ?? {},
        output_preference: body.output_preference ?? "roadmap-docs-repo",
      })
      .select("id")
      .single();
    if (insertErr || !row) {
      return NextResponse.json(
        { ok: false, error: insertErr?.message ?? "Insert failed." },
        { status: 500, headers: aiDisclosureHeaders },
      );
    }

    // Enqueue the brief-generation job via service-role.
    try {
      const { createServiceRoleClient } = await import(
        "../../../lib/supabase-service"
      );
      const service = createServiceRoleClient();
      await service.rpc("enqueue_build_brief", {
        p_build_id: buildId,
        p_tenant_id: tenantId,
      });
    } catch {
      /* runner reconciles 'brief_generating' rows */
    }

    return NextResponse.json(
      {
        ok: true,
        mock: false,
        buildId,
        redirectTo: `/app/builds/${buildId}`,
      },
      { status: 201, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "create_build_failed";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}
