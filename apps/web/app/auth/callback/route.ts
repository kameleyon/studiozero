/**
 * /auth/callback — Supabase Auth code exchange.
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (PKCE), Trace (S2 flow).
 *
 * Lands on every successful OAuth round-trip and every email-confirm
 * click. The query parameter `code` is the PKCE authorization code; we
 * exchange it for a session via `exchangeCodeForSession` and set the
 * cookies via the server-side client. On success, redirect to the `next`
 * param (default `/app/onboarding/mode` for first-time users).
 *
 * Hard contracts:
 *   - The route MUST run in the Node.js runtime (Edge runtime cannot
 *     read response cookies the same way the SSR helper expects).
 *   - The `next` param is validated against an allowlist of internal
 *     paths — never an absolute URL — to prevent open-redirect abuse.
 *   - On any error we redirect to `/login?error=...` rather than
 *     surfacing a stack trace.
 *
 * Cross-refs:
 *   - `lib/supabase-server.ts` — the SSR client this route uses.
 *   - `app/signup/page.tsx` — sets `emailRedirectTo` to this route.
 *   - `app/login/page.tsx` — sets OAuth `redirectTo` to this route.
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";
import { track } from "../../../lib/analytics-events.v1";
import { triggerE1 } from "../../../lib/email-triggers";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_NEXT_PATHS = new Set([
  "/app",
  "/app/onboarding/mode",
  "/app/onboarding/byok",
  "/app/onboarding/github",
  "/app/projects",
]);

function safeNext(raw: string | null): string {
  if (!raw) return "/app/onboarding/mode";
  if (!raw.startsWith("/")) return "/app/onboarding/mode";
  if (raw.includes("//") || raw.includes("..")) return "/app/onboarding/mode";
  // Allowlist-or-prefix check. Permits known onboarding routes + any
  // /app/audits/<id> deep-link (used by share-page sign-in redirects).
  if (ALLOWED_NEXT_PATHS.has(raw)) return raw;
  if (/^\/app\/audits\/[a-zA-Z0-9_-]+$/.test(raw)) return raw;
  return "/app/onboarding/mode";
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const errorParam = url.searchParams.get("error_description");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}`, url.origin),
      { headers: aiDisclosureHeaders },
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin), {
      headers: aiDisclosureHeaders,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
        { headers: aiDisclosureHeaders },
      );
    }
    // Lens spec §2.1 email_verification_completed — fires once per
    // session exchange. The latency tracker is approximate (we don't
    // know exactly when the original signup happened from inside the
    // callback) so we omit `latency_ms_since_signup` here; M4 wires the
    // server-side trigger that has the actual signup timestamp.
    const userId = data.user?.id;
    if (userId) {
      void track("email_verification_completed", {
        user_id: userId,
        latency_ms_since_signup: 0,
      });
      // M4 Batch 1 — fire E1 lifecycle welcome email. Fire-and-forget so
      // the redirect isn't blocked on Resend latency. Idempotent at the
      // trigger layer (dedupe_key="welcome"), so duplicate confirms
      // don't re-send.
      void triggerE1(userId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "callback_failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, url.origin),
      { headers: aiDisclosureHeaders },
    );
  }

  return NextResponse.redirect(new URL(next, url.origin), {
    headers: aiDisclosureHeaders,
  });
}
