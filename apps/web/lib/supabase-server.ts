/**
 * Supabase — server-side client (Server Components + Route Handlers).
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (cookie-handling),
 * Atlas (RLS dependency surface).
 *
 * Surface:
 *   - `createServerSupabaseClient()` returns a request-scoped client that
 *     reads/writes the session cookies that `@supabase/ssr` manages. The
 *     cookies are set/cleared via Next.js's `cookies()` helper — works in
 *     Server Components (read-only) and Route Handlers / Server Actions
 *     (read+write).
 *
 * Hard contracts:
 *   1. Uses the ANON key — RLS still scopes every query, even on the
 *      server. The service-role escape hatch is `supabase-service.ts`.
 *   2. NEVER imports `supabase-service.ts`. Lint rule guards this.
 *   3. The cookie handlers wrap reads in try/catch because Next 15 throws
 *      synchronously when a Server Component attempts to write cookies
 *      (cookies must be written from a Route Handler or Server Action).
 *      We swallow the write-failure in Server Components — the session
 *      refresh that wants to write will be retried by the middleware on
 *      the next request.
 *   4. Per-request instance — DO NOT memoize at module scope. Next.js's
 *      `cookies()` reads from the AsyncLocalStorage request context;
 *      a stale module-scope client leaks one user's session to another.
 *
 * Cross-refs:
 *   - `lib/supabase-client.ts` — browser counterpart.
 *   - `middleware.ts` — wires the session-refresh path that lets cookies
 *     update before a request reaches a Server Component.
 *   - `architecture/database/migrations/0002_rls_and_runner_jwt.sql` — the
 *     RLS layer that makes the anon key safe.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client. Each call returns a fresh instance bound
 * to the current request's cookies. Safe to call in Server Components
 * (writes silently no-op) and Route Handlers / Server Actions (full r/w).
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be " +
        "defined (see apps/web/.env.example).",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options });
          }
        } catch {
          // Server Components cannot mutate cookies. The middleware (which
          // CAN write cookies) will catch the refresh on the next request.
          // Swallow silently — this is the documented @supabase/ssr pattern.
        }
      },
    },
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // server never reads url hash
    },
  });
}

/**
 * Convenience: returns the current authenticated user (or `null`).
 * Centralises the call shape so Server Components don't reach into the
 * client object directly. Wraps `getUser()` (which validates against
 * Supabase Auth — NOT `getSession()` which only reads the local cookie).
 */
export async function getServerUser(): Promise<{
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
} | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata,
  };
}
