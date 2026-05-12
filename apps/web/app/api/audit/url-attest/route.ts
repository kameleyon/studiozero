/**
 * POST /api/audit/url-attest — Phase 9 M3+1 (Forge).
 *
 * AUP (Acceptable Use Policy) URL-audit attestation per PRD §14.7 +
 * Jury M3 audit Critical #2. CFAA shield — the customer must warrant
 * (verbatim text below) that they are authorized to audit the URL
 * BEFORE any deployed-URL audit run is queued.
 *
 * Body:        { url: string, project_id: string }
 * Auth:        authenticated tenant member (Supabase session client).
 * Side effect: append-only row in `audit_logs` with action='url_audit_attestation'.
 * Response:    200 { attested: true, attestation_id }
 *              400 { ok: false, error: 'missing_attestation' }
 *              401 { ok: false, error: 'unauthorized' }
 *
 * Privacy:
 *   - We store `metadata.url` verbatim (the URL is the thing the customer
 *     is attesting about — it has to be in the log).
 *   - We store `metadata.ip_hash` (SHA-256 hex of client IP) so Comply's
 *     CFAA audit trail can correlate without retaining raw IPs.
 *   - We store `metadata.tenant_id` + `metadata.attested_at` (RFC 3339).
 *   - The attestation_text is the PRD §14.7 verbatim phrase, persisted
 *     so a future Comply review can confirm the exact words shown to
 *     the customer at the time.
 *
 * Append-only: audit_logs is service-role-only INSERT; UPDATE/DELETE
 * are RLS-denied per the migration's CHECK + revoke grants.
 *
 * Why we don't take any other body fields: the attestation IS the
 * affirmative act. The downstream `/api/runs` POST is the one that
 * carries the actual intake payload — this route's only job is to
 * write the ledger row before the run is queued.
 */
import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { hasSupabaseServiceEnv, isMockMode } from "../../../../lib/env";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verbatim PRD §14.7 attestation text — Herald-locked. Any edit here
 *  must also update the intake checkbox label + Comply's copy review.
 *  NOTE: Next.js 15 disallows non-route exports from route.ts files;
 *  this constant is module-local. If shared with a UI surface in
 *  future, re-home it to `lib/aup-attestation.ts`. */
const URL_AUDIT_ATTESTATION_TEXT =
  "I am the owner of, or have written authorization to audit, the URL above.";

interface AttestBody {
  url?: unknown;
  project_id?: unknown;
}

interface AttestSuccess {
  attested: true;
  attestation_id: string;
}

interface AttestError {
  ok: false;
  error: string;
}

/** Hash the client IP for the ledger row. We never persist raw IPs. */
function hashClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return createHash("sha256").update(ip, "utf-8").digest("hex").slice(0, 32);
}

function isHttpUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > 2048) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isUuidish(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{8,64}$/i.test(v);
}

export async function POST(
  req: Request,
): Promise<NextResponse<AttestSuccess | AttestError>> {
  /* ---- Body validation ---------------------------------------------- */
  let body: AttestBody;
  try {
    body = (await req.json()) as AttestBody;
  } catch {
    return NextResponse.json<AttestError>(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  if (!isHttpUrl(body.url) || !isUuidish(body.project_id)) {
    return NextResponse.json<AttestError>(
      { ok: false, error: "missing_attestation" },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  const url = body.url;
  const projectId = body.project_id;
  const attestedAt = new Date().toISOString();
  const ipHash = hashClientIp(req);

  /* ---- Mock path ----------------------------------------------------- */
  if (isMockMode() || !hasSupabaseServiceEnv()) {
    // Even the mock path returns a stable attestation id so the intake
    // flow stays exercised end-to-end in dev / CI.
    return NextResponse.json<AttestSuccess>(
      {
        attested: true,
        attestation_id: `mock-att-${Date.now().toString(36)}`,
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  /* ---- Real path ---------------------------------------------------- */
  try {
    const supabase = await createServerSupabaseClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return NextResponse.json<AttestError>(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: aiDisclosureHeaders },
      );
    }
    const tenantId =
      (userData.user.user_metadata as { default_tenant_id?: string })
        ?.default_tenant_id ?? null;
    if (!tenantId) {
      return NextResponse.json<AttestError>(
        { ok: false, error: "tenant_not_provisioned" },
        { status: 403, headers: aiDisclosureHeaders },
      );
    }

    // Write the audit_logs row via service-role — the table is
    // append-only and locked to service-role + the SECURITY DEFINER
    // `audit_log_write` proc. We use the direct insert here; if/when
    // the proc lands, this call swaps to `service.rpc('audit_log_write', ...)`.
    const { createServiceRoleClient } = await import(
      "../../../../lib/supabase-service"
    );
    const service = createServiceRoleClient();

    const metadata = {
      url,
      tenant_id: tenantId,
      attested_at: attestedAt,
      ip_hash: ipHash,
      attestation_text: URL_AUDIT_ATTESTATION_TEXT,
    };

    const { data, error } = await service
      .from("audit_logs")
      .insert({
        tenant_id: tenantId,
        actor_user_id: userData.user.id,
        action: "url_audit_attestation",
        target_kind: "project",
        target_id: projectId,
        metadata,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json<AttestError>(
        { ok: false, error: error?.message ?? "insert_failed" },
        { status: 500, headers: aiDisclosureHeaders },
      );
    }

    return NextResponse.json<AttestSuccess>(
      {
        attested: true,
        attestation_id: (data as { id: string }).id,
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "attest_failed";
    return NextResponse.json<AttestError>(
      { ok: false, error: msg },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}
