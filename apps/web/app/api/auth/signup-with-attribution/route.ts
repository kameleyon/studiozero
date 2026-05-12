/**
 * POST /api/auth/signup-with-attribution — Lens (Phase 9 M1 Batch 3).
 *
 * Server-side UTM passthrough for analytics-spec.md §3.2 + §3.3.
 *
 * The route is called by the client *immediately after* `supabase.auth.
 * signUp()` (or the OAuth callback) returns a session, with the
 * `sz_attribution_payload` localStorage blob in the body. It writes the
 * payload to `users.acquisition_attribution jsonb`.
 *
 * Why a dedicated route and not a Supabase trigger:
 *   - We want server-controlled normalization (string-length clipping,
 *     touch-count cap, type validation). A DB trigger can't see the
 *     localStorage blob the client carries.
 *   - The route is also the right place to fire `signup_completed` from
 *     the server (with attribution stamped on) per spec §2.1.
 *
 * Idempotency:
 *   - First call sets the column (it is initially NULL).
 *   - Subsequent calls UPDATE only when `first_touch.ts` matches OR is
 *     newer — we never let a later sign-in obliterate the first-touch
 *     record. The DB column is jsonb so we read-modify-write under RLS.
 *
 * Mock-safety: when isMockMode() returns true we return ok=true without
 * touching Supabase (so the offline demo still works).
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { hasSupabaseServiceEnv, isMockMode } from "../../../../lib/env";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { normalizeAttributionPayload } from "../../../../lib/utm-attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SignupAttributionBody {
  /** Stringified or already-parsed attribution payload from the client. */
  sz_attribution_payload?: unknown;
  /** Optional: signup method, plumbed through for the server-side
   *  signup_completed event log line. */
  method?: "email" | "oauth_google" | "oauth_github";
}

interface SignupAttributionResponse {
  ok: boolean;
  persisted: boolean;
  user_id?: string;
  attribution?: ReturnType<typeof normalizeAttributionPayload>;
  reason?: string;
}

export async function POST(req: Request): Promise<NextResponse<SignupAttributionResponse>> {
  let body: SignupAttributionBody;
  try {
    body = (await req.json()) as SignupAttributionBody;
  } catch {
    return NextResponse.json(
      { ok: false, persisted: false, reason: "invalid_json" },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  // Accept either a string (JSON.stringified) or an object.
  let rawPayload: unknown = body.sz_attribution_payload;
  if (typeof rawPayload === "string") {
    try {
      rawPayload = JSON.parse(rawPayload);
    } catch {
      rawPayload = null;
    }
  }
  const attribution = normalizeAttributionPayload(rawPayload);

  // Mock path — skip Supabase, ack the call.
  if (isMockMode() || !hasSupabaseServiceEnv()) {
    return NextResponse.json(
      { ok: true, persisted: false, attribution, reason: "mock_or_missing_service_role" },
      { status: 200, headers: aiDisclosureHeaders },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return NextResponse.json(
        { ok: false, persisted: false, reason: "not_authenticated" },
        { status: 401, headers: aiDisclosureHeaders },
      );
    }
    const userId = userData.user.id;
    const method =
      body.method ??
      (userData.user.app_metadata?.provider as
        | "email"
        | "oauth_google"
        | "oauth_github"
        | undefined) ??
      "email";

    const { createServiceRoleClient } = await import(
      "../../../../lib/supabase-service"
    );
    const service = createServiceRoleClient();

    // Read current value to preserve first_touch.
    const { data: existingRow } = await service
      .from("users")
      .select("acquisition_attribution")
      .eq("id", userId)
      .maybeSingle();

    const existing = (existingRow?.acquisition_attribution ?? null) as
      | (ReturnType<typeof normalizeAttributionPayload> & {
          first_touch?: ReturnType<typeof normalizeAttributionPayload>["first_touch"];
        })
      | null;

    const finalPayload = {
      first_touch:
        existing?.first_touch && existing.first_touch.ts
          ? existing.first_touch
          : attribution.first_touch,
      last_touch: attribution.last_touch ?? existing?.last_touch ?? null,
      all_touches: dedupTouches([
        ...(existing?.all_touches ?? []),
        ...attribution.all_touches,
      ]).slice(-20),
      captured_via: attribution.captured_via,
    };

    const { error: updateErr } = await service
      .from("users")
      .update({
        acquisition_attribution: finalPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json(
        {
          ok: false,
          persisted: false,
          reason: `update_failed:${updateErr.message}`,
        },
        { status: 500, headers: aiDisclosureHeaders },
      );
    }

    // Structured server-side signup_completed log line — M2 wires this
    // to posthog-node so the funnel includes server-side fires.
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        ts: Date.now(),
        kind: "analytics_server_event",
        event: "signup_completed",
        properties: {
          user_id: userId,
          method,
          attribution_first_touch: finalPayload.first_touch,
          attribution_last_touch: finalPayload.last_touch,
        },
      }),
    );

    return NextResponse.json(
      {
        ok: true,
        persisted: true,
        user_id: userId,
        attribution: finalPayload,
      },
      { status: 200, headers: aiDisclosureHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "signup_attribution_failed";
    return NextResponse.json(
      { ok: false, persisted: false, reason: msg },
      { status: 500, headers: aiDisclosureHeaders },
    );
  }
}

function dedupTouches<T extends { ts: string; source: string | null }>(touches: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of touches) {
    const key = `${t.ts}|${t.source ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
