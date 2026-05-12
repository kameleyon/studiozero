/**
 * Supabase — browser-side client.
 *
 * Owner: Forge (Phase 9 M1 Batch 2 — replaces `auth-mock.tsx`).
 * Reviewers: Cipher (no service-role here; PKCE flow), Atlas (RLS scopes
 * everything that flows through this client).
 *
 * Surface:
 *   - Single factory `createBrowserSupabaseClient()` per @supabase/ssr.
 *   - Authentication: cookie-based session shared with the server-side
 *     client in `supabase-server.ts` (same cookie names, same domain).
 *   - All queries go through PostgREST with the anon key. Every row this
 *     client can SELECT/INSERT/UPDATE/DELETE is constrained by the RLS
 *     policy set in `architecture/database/migrations/0002_rls_and_runner_jwt.sql`.
 *
 * Hard contracts (Cipher Fix-2 + ARCH-D7 + Atlas RLS):
 *   1. NEVER imports `supabase-service.ts` (service-role). Lint rule
 *      `no-restricted-imports` in `.eslintrc.json` enforces this.
 *   2. Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 *      The anon key is RLS-enforced and safe to ship to the browser
 *      (PRD §13.2 + Vercel env-vars.md row 2).
 *   3. PKCE flow type — `flowType: "pkce"` — so OAuth (Google/GitHub)
 *      and email-confirm flows produce a server-readable code exchange.
 *      Matches Trace's `signup-to-first-verdict.md` S1->S2 path.
 *   4. Auto-refresh enabled so a session that crosses the 1h Supabase
 *      JWT TTL doesn't surface as a logged-out flicker.
 *
 * Singleton convention: each call returns a new client instance. React
 * components should call this at module-init and cache; route handlers
 * are short-lived so per-handler instantiation is correct.
 *
 * Cross-refs:
 *   - `lib/supabase-server.ts` — server-side counterpart.
 *   - `lib/supabase-service.ts` — service-role; SERVER-ONLY, route-handler only.
 *   - `architecture/database/runner-jwt.md` (the runner uses a different
 *     JWT — minted by the `mint-runner-token` Edge Function; the browser
 *     never sees a runner JWT).
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | undefined;

/**
 * Returns a memoized browser Supabase client. React strict-mode double-
 * mounts are deduplicated by the module-scope cache; route navigations
 * reuse the same instance to keep the in-memory session table coherent.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be " +
        "defined (see apps/web/.env.example + architecture/iac/vercel/env-vars.md).",
    );
  }
  _client = createBrowserClient(url, anonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
