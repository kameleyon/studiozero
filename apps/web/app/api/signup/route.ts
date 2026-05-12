import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";

/**
 * POST /api/signup
 *
 * **DEPRECATED** — Phase 9 M1 Batch 2 (Forge).
 *
 * Real signup goes client-side through `supabase.auth.signUp()` (PKCE)
 * so the email-confirm round-trip + OAuth flows work end-to-end without
 * a server-side intermediate step. See `apps/web/app/signup/page.tsx`.
 *
 * This route survives ONLY for the offline-dev `NEXT_PUBLIC_USE_AUTH_MOCK=true`
 * branch. When the mock is disabled (the default), this route returns 410.
 *
 * The mock fallback keeps the legacy `sz-session-mock` cookie semantics so
 * a contributor without a Supabase project can still render the app.
 *
 * Cookie: `sz-session-mock` — `sz.mock.<email>.<ts>` — clearly fake.
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SignupRequest {
  email?: string;
  password?: string;
}

interface SignupOk {
  ok: true;
  mock: true;
  redirectTo: string;
}

interface SignupFail {
  ok: false;
  error: string;
  mock: true;
}

const MOCK_ENABLED = process.env.NEXT_PUBLIC_USE_AUTH_MOCK === "true";

export async function POST(
  req: Request,
): Promise<NextResponse<SignupOk | SignupFail>> {
  if (!MOCK_ENABLED) {
    return NextResponse.json<SignupFail>(
      {
        ok: false,
        mock: true,
        error:
          "This route is the offline-dev fallback. Production signups go " +
          "through supabase.auth.signUp() on the client; see /signup.",
      },
      { status: 410, headers: aiDisclosureHeaders },
    );
  }

  let body: SignupRequest;
  try {
    body = (await req.json()) as SignupRequest;
  } catch {
    return NextResponse.json<SignupFail>(
      { ok: false, error: "Invalid JSON body.", mock: true },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  const email = (body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json<SignupFail>(
      { ok: false, error: "An email is required.", mock: true },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  const fakeToken = `sz.mock.${encodeURIComponent(email)}.${Date.now()}`;
  const sevenDays = 7 * 24 * 60 * 60;

  const res = NextResponse.json<SignupOk>(
    {
      ok: true,
      mock: true,
      redirectTo: "/app/onboarding/mode",
    },
    { status: 200, headers: aiDisclosureHeaders },
  );

  res.cookies.set("sz-session-mock", fakeToken, {
    path: "/",
    maxAge: sevenDays,
    sameSite: "lax",
    httpOnly: false,
    secure: false,
  });

  return res;
}
