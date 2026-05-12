/**
 * Mock-mode helper — Phase 9 M1 Batch 3 (Probe).
 *
 * Centralises the env-var contract from `apps/web/lib/env.ts` so specs
 * don't re-implement it. Reading `process.env.NEXT_PUBLIC_USE_AUTH_MOCK`
 * here matches the value the dev server was started with via
 * playwright.config.ts `webServer.env`.
 *
 * Probe-rule: tests must not branch on runtime "is mock?" guesses. Specs
 * call `isMockMode()` once at module load, then either run (mock-only
 * specs) or skip (RLS-only specs). No mid-test mode flipping.
 */

export function isMockMode(): boolean {
  // The webServer.env in playwright.config defaults this to "true"; CI
  // jobs that want to exercise real Supabase explicitly set it to "false"
  // before invoking `npx playwright test`.
  return (process.env.NEXT_PUBLIC_USE_AUTH_MOCK ?? "true") === "true";
}

/**
 * RLS-bearing specs (`rls-cross-tenant.spec.ts`) call this to short-circuit
 * when mock mode is on (no real Supabase = no RLS to test). Returns the
 * `test.skip()` predicate value + the reason string in one call.
 */
export function skipUnlessRealSupabase(): {
  skip: boolean;
  reason: string;
} {
  if (isMockMode()) {
    return {
      skip: true,
      reason:
        "RLS only testable in real Supabase mode. Set NEXT_PUBLIC_USE_AUTH_MOCK=false + " +
        "NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY before running.",
    };
  }
  return { skip: false, reason: "" };
}
