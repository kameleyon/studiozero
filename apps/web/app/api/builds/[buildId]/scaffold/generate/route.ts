/**
 * /api/builds/[buildId]/scaffold/generate — Phase 9 V2.1 Batch 1 (Forge).
 *
 * Three actions on the same route:
 *
 *   POST                                 → trigger scaffold generation
 *   GET                                  → return live status (polled by UI)
 *   GET ?action=download                 → stream the zip bytes (when ready)
 *
 * Auth: requires authenticated session + tenant ownership of the build.
 * The current Phase 9 implementation runs in MOCK mode (mock build store).
 * The Supabase wire-up lands in V2.1 Batch 2 once Atlas's
 * `scaffolds` + `scaffold_audits` tables exist (migration 0009).
 *
 * The route returns 200 with `state='failed'` rather than 5xx when the
 * audit gate fires FAIL — the customer-facing UI distinguishes "scaffold
 * pipeline failure" (5xx) from "audit-gate halted delivery" (200 + verdict).
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../../../lib/ai-disclosure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------- */
/* In-memory scaffold store — V2.1 Batch 1 only.                         */
/* Mirrors lib/build-mock-store.ts pattern. Atlas's 0009 migration       */
/* introduces real Postgres rows in Batch 2.                             */
/* -------------------------------------------------------------------- */
interface ScaffoldPipelineState {
  build_id: string;
  state:
    | "pending"
    | "stack_detect"
    | "code_gen"
    | "compose_scaffold"
    | "audit_gate"
    | "delivered"
    | "failed";
  stack: "nextjs-saas" | "nodejs-worker" | "cli-tool" | null;
  audit: {
    verdict: "PASS" | "PASS WITH FIXES" | "FAIL" | null;
    score: number | null;
    findings_count: number;
    rejection_reason: string | null;
  };
  zip_bytes: Buffer | null;
  started_at: string;
}

const globalAny = globalThis as unknown as {
  __studio_zero_scaffold_store?: Map<string, ScaffoldPipelineState>;
  __studio_zero_scaffold_tick?: Map<string, number>;
};
const STORE: Map<string, ScaffoldPipelineState> =
  globalAny.__studio_zero_scaffold_store ??
  (globalAny.__studio_zero_scaffold_store = new Map());
const TICKS: Map<string, number> =
  globalAny.__studio_zero_scaffold_tick ??
  (globalAny.__studio_zero_scaffold_tick = new Map());

/** Returns the mock progression — each successive call advances one phase.
 *  Tests can pre-seed STORE to skip the progression. */
function advance(s: ScaffoldPipelineState): void {
  const order: Array<ScaffoldPipelineState["state"]> = [
    "pending",
    "stack_detect",
    "code_gen",
    "compose_scaffold",
    "audit_gate",
    "delivered",
  ];
  const idx = order.indexOf(s.state);
  if (idx < 0 || idx === order.length - 1) return;
  s.state = order[idx + 1]!;
  if (s.state === "stack_detect") {
    s.stack = "nextjs-saas";
  }
  if (s.state === "audit_gate") {
    s.audit.verdict = "PASS WITH FIXES";
    s.audit.score = 86;
    s.audit.findings_count = 2;
  }
  if (s.state === "delivered") {
    s.zip_bytes = Buffer.from("PK\x05\x06" + "\x00".repeat(18), "binary");
  }
}

/* -------------------------------------------------------------------- */
/* Handlers                                                              */
/* -------------------------------------------------------------------- */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ buildId: string }> },
): Promise<NextResponse> {
  const { buildId } = await params;
  if (!buildId) {
    return NextResponse.json(
      { ok: false, error: "build_id required" },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }
  let rec = STORE.get(buildId);
  if (!rec) {
    rec = {
      build_id: buildId,
      state: "pending",
      stack: null,
      audit: {
        verdict: null,
        score: null,
        findings_count: 0,
        rejection_reason: null,
      },
      zip_bytes: null,
      started_at: new Date().toISOString(),
    };
    STORE.set(buildId, rec);
    TICKS.set(buildId, 0);
  }
  return NextResponse.json(
    { ok: true, build_id: buildId, state: rec.state },
    { status: 202, headers: aiDisclosureHeaders },
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ buildId: string }> },
): Promise<NextResponse | Response> {
  const { buildId } = await params;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const rec = STORE.get(buildId);
  if (!rec) {
    return NextResponse.json(
      { ok: false, error: "not_started", build_id: buildId },
      { status: 404, headers: aiDisclosureHeaders },
    );
  }

  // Advance the mock state machine by one phase per GET poll. Tests that
  // need a specific state seed STORE directly.
  if (action !== "download") {
    advance(rec);
  }

  if (action === "download") {
    if (rec.state !== "delivered" || !rec.zip_bytes) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_ready",
          state: rec.state,
        },
        { status: 425, headers: aiDisclosureHeaders },
      );
    }
    return new Response(rec.zip_bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="studio-zero-scaffold-${buildId}.zip"`,
        "Cache-Control": "no-store",
        ...aiDisclosureHeaders,
      },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      status: {
        build_id: rec.build_id,
        state: rec.state,
        stack: rec.stack,
        audit: rec.audit,
        download_url:
          rec.state === "delivered"
            ? `/api/builds/${buildId}/scaffold/generate?action=download`
            : null,
      },
    },
    { status: 200, headers: aiDisclosureHeaders },
  );
}

/** Test-only helper: seed a specific state. Exported via a module-side
 *  store; tests import this route's module and call into STORE directly.
 *  Real tenant lookups will be a Supabase query in Batch 2. */
export function _scaffoldStoreForTests(): Map<string, ScaffoldPipelineState> {
  return STORE;
}
