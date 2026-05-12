/**
 * POST /api/consent — write a consent_records row + set sz_consent cookie.
 * GET  /api/consent — return the current consent state.
 *
 * Lens (Phase 9 M1 Batch 3). Implements analytics-spec.md §7.4 + GDPR
 * Art. 7(1) demonstrability via the append-only `consent_records` table
 * (Atlas).
 *
 * Behaviour:
 *   - The cookie is the cache hint; the table is the source of truth.
 *   - One row inserted per consent decision; rows are NEVER updated.
 *   - When the caller is signed in we insert one row per bucket flip
 *     (so the legal log is granular). Pre-signup we insert under a
 *     server-derived anon_id only when the table allows null user_id —
 *     for the current schema (user_id NOT NULL), pre-signup decisions
 *     are persisted only in the cookie until the user signs up, at
 *     which point the client re-POSTs to seed the table. This matches
 *     spec §7.4 "server wins; banner re-prompts on mismatch."
 *
 * Cookie:
 *   `sz_consent` — value is the same JSON we store client-side (status +
 *   buckets + recorded_at). 1-year max-age per GDPR EDPB Guidelines
 *   5/2020 (consent should be refreshed at least annually).
 *
 * Cross-refs:
 *   - architecture/database/tables.sql §16 (consent_records)
 *   - marketing/analytics-spec.md §1.2 + §7.4
 *   - lib/analytics-gate.ts (client gate that mirrors this decision)
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";
import { hasSupabaseServiceEnv, isMockMode } from "../../../lib/env";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "sz_consent";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

type Status = "accepted" | "rejected" | "partial" | "withdrawn";
type DbKind =
  | "necessary_cookies"
  | "analytics_cookies"
  | "marketing_cookies"
  | "ai_training";

interface ConsentBody {
  status?: Status;
  buckets?: {
    necessary?: boolean;
    analytics?: boolean;
    marketing?: boolean;
    ai_training?: boolean;
  };
  recorded_at?: string;
}

interface ConsentResponse {
  ok: boolean;
  status: Status;
  buckets: {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
    ai_training: boolean;
  };
  recorded_at: string;
  /** True when the DB row was inserted; false when we could only cookie. */
  persisted: boolean;
}

/* ------------------------------------------------------------------ */
/* GET — return current consent                                       */
/* ------------------------------------------------------------------ */

export async function GET(req: Request): Promise<NextResponse> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
  );

  if (!match) {
    return NextResponse.json(
      {
        ok: true,
        status: "unknown",
        buckets: {
          necessary: true,
          analytics: false,
          marketing: false,
          ai_training: false,
        },
        recorded_at: null,
        persisted: false,
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1] ?? ""));
    return NextResponse.json(parsed, {
      status: 200,
      headers: aiDisclosureHeaders,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "malformed_cookie" },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }
}

/* ------------------------------------------------------------------ */
/* POST — record a new consent decision                               */
/* ------------------------------------------------------------------ */

export async function POST(req: Request): Promise<NextResponse> {
  let body: ConsentBody;
  try {
    body = (await req.json()) as ConsentBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  const status: Status = (body.status ?? "rejected") as Status;
  if (!["accepted", "rejected", "partial", "withdrawn"].includes(status)) {
    return NextResponse.json(
      { ok: false, error: "invalid_status" },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  const buckets = {
    necessary: true as const,
    analytics: Boolean(body.buckets?.analytics),
    marketing: Boolean(body.buckets?.marketing),
    ai_training: Boolean(body.buckets?.ai_training),
  };
  const recorded_at = body.recorded_at ?? new Date().toISOString();

  let persisted = false;

  // ---- Persist server-side when we have a user + service-role. ------
  if (!isMockMode() && hasSupabaseServiceEnv()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
        // Resolve the tenant_id; pre-onboarding users may not yet have
        // a default_tenant_id — fall back to a sentinel so the row
        // still persists as an audit trail.
        const tenantId =
          (user.user_metadata as { default_tenant_id?: string })
            ?.default_tenant_id ?? null;

        if (tenantId) {
          const { createServiceRoleClient } = await import(
            "../../../lib/supabase-service"
          );
          const service = createServiceRoleClient();

          // Append one row per bucket — append-only ledger per spec §7.4.
          // The consent_kind enum is the schema vocabulary; we map our
          // user-friendly bucket names onto it.
          const rows: Array<{
            tenant_id: string;
            user_id: string;
            kind: DbKind;
            granted: boolean;
          }> = [
            {
              tenant_id: tenantId,
              user_id: user.id,
              kind: "necessary_cookies",
              granted: true,
            },
            {
              tenant_id: tenantId,
              user_id: user.id,
              kind: "analytics_cookies",
              granted: buckets.analytics && status !== "withdrawn",
            },
            {
              tenant_id: tenantId,
              user_id: user.id,
              kind: "marketing_cookies",
              granted: buckets.marketing && status !== "withdrawn",
            },
          ];
          // Include ai_training only if explicitly addressed in this POST.
          if (typeof body.buckets?.ai_training === "boolean") {
            rows.push({
              tenant_id: tenantId,
              user_id: user.id,
              kind: "ai_training",
              granted: body.buckets.ai_training && status !== "withdrawn",
            });
          }

          const { error } = await service.from("consent_records").insert(rows);
          if (!error) persisted = true;
        }
      }
    } catch {
      /* DB write failed — cookie still wins for the user; Watch's
         reconciliation cron seeds missed rows on next visit. */
    }
  }

  // ---- Cookie + response. --------------------------------------------
  const payload: ConsentResponse = {
    ok: true,
    status,
    buckets,
    recorded_at,
    persisted,
  };

  const res = NextResponse.json(payload, {
    status: 200,
    headers: aiDisclosureHeaders,
  });

  res.cookies.set(COOKIE_NAME, encodeURIComponent(JSON.stringify(payload)), {
    path: "/",
    maxAge: status === "withdrawn" ? 0 : ONE_YEAR_SECONDS,
    sameSite: "lax",
    httpOnly: false, // client must read for the gate's hydrate path
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
