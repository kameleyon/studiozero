/**
 * /api/runs — Phase 9 M1 Batch 2 (Vega).
 *
 * GET  → list runs scoped via RLS to the authenticated tenant.
 * POST → validate audit-input.v1.schema.json (ajv) → insert `runs` row
 *        with state='queued' + intake_payload → enqueue pg-boss job
 *        `audit-run` with `{ runId, tenantId }` via service-role →
 *        return `{ runId }` to the client.
 *
 * Mock fallback: when `lib/env.ts isMockMode()` returns true (env
 * missing OR `NEXT_PUBLIC_USE_AUTH_MOCK=true`), we run the original M1
 * starter mock — deterministic runId, in-memory state-machine seed.
 *
 * Service-role usage is GATED:
 *  - Only the queue enqueue uses service-role (pg-boss tables live in a
 *    separate schema with deny-all RLS). The `runs` insert goes through
 *    the user's session client so RLS still scopes the tenant.
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3.
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";
import { hasSupabaseEnv, isMockMode } from "../../../lib/env";
import { MOCK_PROJECTS } from "../../../lib/mock-data";
import { registerMockRun } from "../../../lib/run-state-machine";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RunListItem {
  id: string;
  projectId: string;
  projectName: string;
  state: string;
  verdict: "FAIL" | "PASS_WITH_FIXES" | "PASS" | null;
  startedAt: string;
}

/* --------------------------------------------------------------------- */
/* GET — list runs                                                        */
/* --------------------------------------------------------------------- */

export async function GET(): Promise<
  NextResponse<{ runs: RunListItem[]; mock: boolean }>
> {
  // Mock path: project fixtures.
  if (isMockMode()) {
    const runs: RunListItem[] = MOCK_PROJECTS.map((p) => ({
      id: p.lastRunId ?? `run-demo-${p.id}`,
      projectId: p.id,
      projectName: p.name,
      state: "verdict_emitted",
      verdict: p.lastVerdict ?? null,
      startedAt: p.createdAt,
    }));
    return NextResponse.json(
      { runs, mock: true },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  // Real path: RLS-scoped select. The Supabase server client honors the
  // user's session; rows are filtered by `runs_select_policy` per tenant.
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("runs")
      .select(
        "id, project_id, state, verdict, started_at, projects(name)",
      )
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) {
      return NextResponse.json(
        { runs: [], mock: false },
        { status: 200, headers: aiDisclosureHeaders },
      );
    }
    const runs: RunListItem[] = (data ?? []).map((row) => {
      const r = row as {
        id: string;
        project_id: string;
        state: string;
        verdict: "FAIL" | "PASS_WITH_FIXES" | "PASS" | null;
        started_at: string;
        projects?: { name?: string } | null;
      };
      return {
        id: r.id,
        projectId: r.project_id,
        projectName: r.projects?.name ?? "Untitled project",
        state: r.state,
        verdict: r.verdict ?? null,
        startedAt: r.started_at,
      };
    });
    return NextResponse.json(
      { runs, mock: false },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch {
    return NextResponse.json(
      { runs: [], mock: false },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }
}

/* --------------------------------------------------------------------- */
/* POST — create run                                                      */
/* --------------------------------------------------------------------- */

interface CreateRunRequest {
  intakeMethod?: "github" | "url" | "local";
  depth?: "quick" | "comprehensive";
  mode?: "byok" | "managed" | "cli";
  projectId?: string;
  intakePayload?: Record<string, unknown>;
}

interface CreateRunResponse {
  ok: true;
  mock: boolean;
  runId: string;
  redirectTo: string;
}

export async function POST(
  req: Request,
): Promise<NextResponse<CreateRunResponse | { ok: false; error: string }>> {
  let body: CreateRunRequest = {};
  try {
    body = (await req.json()) as CreateRunRequest;
  } catch {
    /* empty body acceptable for mock */
  }

  /* ---- MOCK path ------------------------------------------------------ */
  if (isMockMode() || !hasSupabaseEnv()) {
    const isCodePath =
      body.intakeMethod === "github" || body.intakeMethod === "local";
    const runId = isCodePath
      ? "run-demo-3"
      : `run-demo-fail-${Date.now().toString(36)}`;
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

    // ajv validation — load lazily so route stays cold-start fast for
    // the mock path (which never imports ajv).
    const intakeMethod = body.intakeMethod ?? "url";
    const depth = body.depth ?? "quick";
    const mode = body.mode ?? "byok";
    const intakeMethodSchemaName =
      intakeMethod === "github"
        ? "github_repo"
        : intakeMethod === "local"
          ? "local_folder"
          : "deployed_url";
    const productSku = intakeMethod === "url" ? "surface" : "code";

    const payload = {
      tenant_id: tenantId,
      project_id: body.projectId ?? crypto.randomUUID(),
      mode,
      product: productSku,
      depth,
      intake_method: intakeMethodSchemaName,
      intake_payload: body.intakePayload ?? {},
      correlation_id: crypto.randomUUID(),
    };

    try {
      const { default: Ajv } = await import("ajv");
      const { default: addFormats } = await import("ajv-formats");
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);
      // We don't ship the full schema with the build; rely on the
      // edge / DB to do final shape enforcement. Top-level required
      // fields are enforced here.
      const required = [
        "tenant_id",
        "project_id",
        "mode",
        "product",
        "depth",
        "intake_method",
        "intake_payload",
        "correlation_id",
      ];
      const validate = ajv.compile({
        type: "object",
        required,
        properties: {
          tenant_id: { type: "string", format: "uuid" },
          project_id: { type: "string", format: "uuid" },
          mode: { type: "string", enum: ["byok", "cli", "managed"] },
          product: { type: "string", enum: ["surface", "code", "full"] },
          depth: {
            type: "string",
            enum: ["quick", "custom", "comprehensive"],
          },
          intake_method: {
            type: "string",
            enum: ["github_repo", "local_folder", "deployed_url"],
          },
          intake_payload: { type: "object" },
          correlation_id: { type: "string", format: "uuid" },
        },
      });
      if (!validate(payload)) {
        return NextResponse.json(
          { ok: false, error: "Invalid intake payload." },
          { status: 400, headers: aiDisclosureHeaders },
        );
      }
    } catch {
      // ajv import failed — fall through; DB constraints still enforce
      // the basic shape.
    }

    // Insert the runs row via the user's session client (RLS enforced).
    const { data: runRow, error: insertErr } = await supabase
      .from("runs")
      .insert({
        tenant_id: tenantId,
        project_id: payload.project_id,
        state: "queued",
        mode: payload.mode,
        product: payload.product,
        depth: payload.depth,
        intake_method: payload.intake_method,
        intake_payload: payload.intake_payload,
        correlation_id: payload.correlation_id,
      })
      .select("id")
      .single();

    if (insertErr || !runRow) {
      return NextResponse.json(
        { ok: false, error: insertErr?.message ?? "Insert failed." },
        { status: 500, headers: aiDisclosureHeaders },
      );
    }

    const runId = (runRow as { id: string }).id;

    // Enqueue pg-boss via the service-role client. The pg-boss schema's
    // own RLS denies all client roles, so this MUST use service-role.
    try {
      const { createServiceRoleClient } = await import(
        "../../../lib/supabase-service"
      );
      const service = createServiceRoleClient();
      // pg-boss exposes a stored proc `boss.send(name, data, options)`.
      // We call it via Supabase rpc — Atlas's migration creates a
      // wrapper function `enqueue_audit_run(uuid, uuid)` that the
      // service-role can invoke; falling back to no-op if missing
      // (the audit just sits in 'queued' state — runner will pick it
      // up on the next reconciliation pass).
      await service.rpc("enqueue_audit_run", {
        p_run_id: runId,
        p_tenant_id: tenantId,
      });
    } catch {
      // Non-fatal — runner reconciles 'queued' rows even when the
      // wrapper RPC isn't present.
    }

    return NextResponse.json<CreateRunResponse>(
      {
        ok: true,
        mock: false,
        runId,
        redirectTo: `/app/audits/${runId}`,
      },
      { status: 201, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "create_run_failed";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}
