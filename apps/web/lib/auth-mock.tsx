/**
 * Auth mock — DEV-FALLBACK ONLY. Phase 9 M1 Batch 2 (Forge).
 *
 * **Gated behind `NEXT_PUBLIC_USE_AUTH_MOCK=true`.** The default Supabase
 * Auth path is in `lib/supabase-client.ts` + `lib/supabase-server.ts`.
 * This module exists so an offline contributor (no Supabase project, no
 * local Docker stack) can render authed pages without setting up the
 * full auth stack. Production builds set the env flag to false (or omit
 * it) so the mock returns `null` from every helper.
 *
 * If the flag is on:
 *  - `useUser()` returns a hardcoded fake user (`MOCK_USER`).
 *  - `getSessionFromCookies` reads `sz-session-mock`.
 *  - The signup / login / verify-email pages still render but their
 *    Supabase calls are intercepted by the mock branch.
 *
 * If the flag is off (the default):
 *  - Every helper returns `null`. Code paths that imported these helpers
 *    must check the return value or use `supabase-server.ts` /
 *    `supabase-client.ts` directly.
 *
 * Owner: Forge. Cipher reviewed the gating.
 */
"use client";

import * as React from "react";

import { isMockMode } from "./env";
import { MOCK_USER, type MockUser } from "./mock-data";

/**
 * Returns true if the auth mock is enabled. Delegates to `lib/env.ts`
 * `isMockMode()` so the rule lives in one place — mock is active when
 * EITHER `NEXT_PUBLIC_USE_AUTH_MOCK=true` is set OR the Supabase env
 * vars are absent (offline dev / preview-without-Supabase).
 *
 * Production deploys MUST set the Supabase env vars; the
 * `assertProductionWiringPresent()` startup guard in `lib/env.ts` warns
 * loudly when this rule auto-flips a production build to mock.
 */
export function isAuthMockEnabled(): boolean {
  return isMockMode();
}

/**
 * Client hook returning the mock user iff the mock is enabled, else null.
 * Components should prefer the Supabase Auth `getSession()` / `getUser()`
 * helpers; this hook is intended for explicit dev-fallback branches.
 */
export function useUser(): MockUser | null {
  if (!isAuthMockEnabled()) return null;
  return MOCK_USER;
}

/**
 * Client helper — set a mock session cookie. NO-OP when mock disabled.
 * Real auth flow uses `supabase.auth.signUp()` / `signInWithPassword()`
 * and the Supabase SDK manages cookies via @supabase/ssr.
 */
export function setMockSessionCookie(email: string): void {
  if (!isAuthMockEnabled()) return;
  if (typeof document === "undefined") return;
  const value = `sz.mock.${encodeURIComponent(email)}.${Date.now()}`;
  const sevenDays = 7 * 24 * 60 * 60;
  document.cookie = `sz-session-mock=${value}; path=/; max-age=${sevenDays}; SameSite=Lax`;
}

export function clearMockSessionCookie(): void {
  if (!isAuthMockEnabled()) return;
  if (typeof document === "undefined") return;
  document.cookie = "sz-session-mock=; path=/; max-age=0; SameSite=Lax";
}

/** No-op provider component retained for back-compat (used by mock-data
 *  consumers). Renders children unchanged regardless of flag state. */
export function MockAuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}

/** True iff the mock cookie is present AND the mock is enabled. */
export function hasMockSession(): boolean {
  if (!isAuthMockEnabled()) return false;
  if (typeof document === "undefined") return false;
  return document.cookie.includes("sz-session-mock=sz.mock.");
}
