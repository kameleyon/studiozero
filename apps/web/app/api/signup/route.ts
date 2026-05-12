import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";

/**
 * POST /api/signup
 *
 * **MOCK** — Phase 9 M1 starter dispatch. Accepts an email + (optional)
 * password and returns a fake session cookie. Real M1+1 wiring calls
 * Supabase Auth `signUp()` with PKCE + email-confirmation flow per
 * Trace's signup-to-first-verdict.md S1→S2 path.
 *
 * Cookie: `sz-session-mock` — `sz.mock.<email>.<ts>` — clearly fake.
 * Real auth flips to HttpOnly + Secure + SameSite=Lax + Supabase JWT.
 *
 * Always returns `X-AI-Generated: studio-zero` per PRD §11.3.
 *
 * Owner: Forge (this dispatch) → Forge + Cipher (M1+1 real Supabase wiring).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SignupRequest {
  email?: string;
  // password is accepted but never stored — the mock doesn't verify.
  password?: string;
}

interface SignupResponse {
  ok: true;
  mock: true;
  redirectTo: string;
}

export async function POST(req: Request): Promise<NextResponse<SignupResponse | { ok: false; error: string; mock: true }>> {
  let body: SignupRequest;
  try {
    body = (await req.json()) as SignupRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body.", mock: true },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  const email = (body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "An email is required.", mock: true },
      { status: 400, headers: aiDisclosureHeaders },
    );
  }

  // Fake session token. NOT a real JWT. Real Supabase tokens are HS256
  // and carry a real `aud` + `sub`. This is a clearly-fake string so the
  // mock cannot be confused for production output.
  const fakeToken = `sz.mock.${encodeURIComponent(email)}.${Date.now()}`;
  const sevenDays = 7 * 24 * 60 * 60;

  const res = NextResponse.json<SignupResponse>(
    {
      ok: true,
      mock: true,
      // Per Trace flow: signup → mode picker (skip email-verify in mock).
      redirectTo: "/app/onboarding/mode",
    },
    { status: 200, headers: aiDisclosureHeaders },
  );

  // M1+1 real wiring uses HttpOnly cookies. The mock keeps the cookie
  // readable client-side so the client can detect session presence in
  // simple ways. Clearly named with `-mock` suffix.
  res.cookies.set("sz-session-mock", fakeToken, {
    path: "/",
    maxAge: sevenDays,
    sameSite: "lax",
    httpOnly: false,
    secure: false,
  });

  return res;
}
