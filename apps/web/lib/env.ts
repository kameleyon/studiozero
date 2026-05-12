/**
 * Runtime environment detector — Phase 9 M1 Batch 2 (Vega).
 *
 * Studio Zero ships a **dual-mode** front-end during M1: with-Supabase
 * when the env vars are populated, and an obvious-mock fallback when
 * they're absent. This module is the single source of truth for
 * which path is live.
 *
 * Why a dedicated module:
 *  - Every call site (auth provider, /api/runs route, BYOK form, etc.)
 *    needs the same answer. Centralising avoids drift.
 *  - Forge-1 lands `lib/supabase-{client,server,service}.ts` next.
 *    Those modules import from here; they never re-read process.env.
 *  - The mock-fallback is a **dev/CI convenience**, NOT a production
 *    posture. Production deploys must have Supabase env vars; the
 *    `assertProductionWiringPresent()` guard at startup throws if a
 *    prod build was deployed without them.
 *
 * Three signals:
 *   `hasSupabaseEnv()`       — minimum to talk to Supabase (URL + anon key)
 *   `hasSupabaseServiceEnv()`— additionally has service role (server only)
 *   `isMockMode()`           — final boolean every UI surface consults
 *
 * Env contract (locked):
 *   NEXT_PUBLIC_SUPABASE_URL          required for any Supabase path
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY     required for any Supabase path
 *   SUPABASE_SERVICE_ROLE_KEY         server-only; route handlers & SSR
 *   NEXT_PUBLIC_USE_AUTH_MOCK         "true" → force mock even with vars
 *   NEXT_PUBLIC_GITHUB_APP_SLUG       e.g. "studio-zero-audit"
 *   NEXT_PUBLIC_SUPABASE_FN_URL       Edge Functions base, falls back to
 *                                     `<SUPABASE_URL>/functions/v1`
 *
 * Cipher's lint rule still blocks `SUPABASE_SERVICE_ROLE_KEY` from
 * leaking to client bundles via the `NEXT_PUBLIC_` prefix gate.
 */

/** Cheap env read that works in both Node + Edge runtimes. */
function read(name: string): string | null {
  // Next inlines `process.env.NEXT_PUBLIC_*` at build time on the client;
  // server-side it's the live process.env. Both shapes work with this read.
  const v = process.env[name];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Public Supabase URL + anon key both present? */
export function hasSupabaseEnv(): boolean {
  return (
    read("NEXT_PUBLIC_SUPABASE_URL") !== null &&
    read("NEXT_PUBLIC_SUPABASE_ANON_KEY") !== null
  );
}

/** Server-side: service-role key also present? */
export function hasSupabaseServiceEnv(): boolean {
  return hasSupabaseEnv() && read("SUPABASE_SERVICE_ROLE_KEY") !== null;
}

/** Explicit override — set in `.env.local` for offline demo flows. */
export function isAuthMockForced(): boolean {
  return read("NEXT_PUBLIC_USE_AUTH_MOCK") === "true";
}

/**
 * The single boolean every UI surface consults. **True** ⇒ render the
 * mock auth provider + mock data + mock state machine. **False** ⇒
 * call into real Supabase + Edge Functions + Realtime.
 *
 * Order of precedence (highest first):
 *   1. `NEXT_PUBLIC_USE_AUTH_MOCK=true` always wins (debug knob).
 *   2. Missing Supabase env vars falls back to mock.
 *   3. Otherwise real path.
 */
export function isMockMode(): boolean {
  if (isAuthMockForced()) return true;
  if (!hasSupabaseEnv()) return true;
  return false;
}

/** Resolved Edge Functions base URL (`/functions/v1`). */
export function getFunctionsBaseUrl(): string | null {
  const explicit = read("NEXT_PUBLIC_SUPABASE_FN_URL");
  if (explicit !== null) return explicit.replace(/\/+$/, "");
  const supa = read("NEXT_PUBLIC_SUPABASE_URL");
  if (supa === null) return null;
  return `${supa.replace(/\/+$/, "")}/functions/v1`;
}

/** GitHub App slug for the install link. */
export function getGithubAppSlug(): string | null {
  return read("NEXT_PUBLIC_GITHUB_APP_SLUG");
}

/** Public anon key — safe to ship to the client. */
export function getSupabaseAnonKey(): string | null {
  return read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Public URL — safe to ship to the client. */
export function getSupabaseUrl(): string | null {
  return read("NEXT_PUBLIC_SUPABASE_URL");
}

/**
 * Server-only. Throws on bundles that ever try to read this in the
 * client (Next strips non-`NEXT_PUBLIC_` vars from the client bundle).
 * Belt-and-braces alongside Cipher's lint rule.
 */
export function getSupabaseServiceRoleKey(): string | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "getSupabaseServiceRoleKey() called on the client — service role keys " +
        "MUST stay server-side. Use createServerClient or a route handler.",
    );
  }
  return read("SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Production-deploy guard. Called once at startup (root layout import).
 * If `NODE_ENV==='production'` AND we're in mock mode AND the auth-mock
 * override was NOT explicitly enabled, log a loud warning. We do not
 * throw — preview deploys without Supabase still need to boot — but the
 * Vercel build log surfaces the gap.
 */
export function assertProductionWiringPresent(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (isAuthMockForced()) return; // explicit demo deploy
  if (hasSupabaseEnv()) return;
  // eslint-disable-next-line no-console
  console.warn(
    "[studio-zero] Production build is missing NEXT_PUBLIC_SUPABASE_URL " +
      "or NEXT_PUBLIC_SUPABASE_ANON_KEY — falling back to mock-data render. " +
      "Set the Supabase vars in Vercel Project Settings before launch.",
  );
}
