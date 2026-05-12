/**
 * Auth mock — Phase 9 M1 starter dispatch.
 *
 * Replaces Supabase Auth client until M1+1. Two surfaces:
 *
 *  1. **`useUser()`** — client-side hook that returns a hardcoded fake user
 *     so authed pages render without a real session. Always returns the
 *     same `MOCK_USER` instance.
 *
 *  2. **`getSessionFromCookies(cookies)`** — server-side helper that reads
 *     the `sz-session-mock` cookie set by `/api/signup`. If present, the
 *     user is "logged in"; if absent, redirect to /login or /signup.
 *
 * The cookie carries a fake JWT-looking string (`sz.mock.<email>.<ts>`) —
 * NOT a real JWT, never validated, never reaches a real auth provider.
 *
 * Owner: Forge (this dispatch) → Cipher + Forge (M1+1 real Supabase Auth).
 */
"use client";

import * as React from "react";

import { MOCK_USER, type MockUser } from "./mock-data";

/**
 * Client hook returning the mock user. Stable identity — never re-renders
 * the consumer needlessly.
 */
export function useUser(): MockUser {
  return MOCK_USER;
}

/**
 * Client helper — set a mock session cookie by document.cookie write.
 * Used by /signup and /login client-side forms so the next page render
 * sees the cookie. Real M1+1 calls Supabase Auth `signUp()` /
 * `signInWithPassword()` and lets the server set HTTP-only cookies.
 */
export function setMockSessionCookie(email: string): void {
  if (typeof document === "undefined") return;
  const value = `sz.mock.${encodeURIComponent(email)}.${Date.now()}`;
  // 7-day expiry. NOT HttpOnly because the mock has to read it on the
  // client; real auth flips this to HttpOnly + Secure + SameSite=Lax.
  const sevenDays = 7 * 24 * 60 * 60;
  document.cookie = `sz-session-mock=${value}; path=/; max-age=${sevenDays}; SameSite=Lax`;
}

export function clearMockSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "sz-session-mock=; path=/; max-age=0; SameSite=Lax";
}

/** A no-op provider component reserved for parity with the real auth
 * SDK shape. Pages compose `<MockAuthProvider>{children}</MockAuthProvider>`
 * so swapping to real Supabase Auth at M1+1 is a one-line change. */
export function MockAuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}

/** Returns true if a mock session cookie exists. Client-side only. */
export function hasMockSession(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("sz-session-mock=sz.mock.");
}
