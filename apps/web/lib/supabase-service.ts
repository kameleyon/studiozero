/**
 * Supabase — SERVICE-ROLE client. SERVER-ONLY. RESTRICTED IMPORT.
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Audited by: Cipher (key boundary),
 * Atlas (RLS-bypass surface).
 *
 * --- LOAD-BEARING CLAIM -----------------------------------------------------
 *
 * This module is the ONE place the Web App holds a Supabase service-role
 * key. It bypasses Row-Level Security. It MUST NOT be imported by:
 *
 *   - Client components (anything under `app/**` that ships to the browser)
 *   - Server Components that render to a user-facing page response
 *   - Any module re-exported into the browser bundle
 *
 * The ESLint `no-restricted-imports` rule in `.eslintrc.json` enforces the
 * boundary. The Verify CI gate greps for `supabase-service` in compiled
 * `.next/static/**` and fails the build if it leaks.
 *
 * --- WHERE IT IS USED -------------------------------------------------------
 *
 * Per `architecture/database/runner-jwt.md` "Service-role usage boundaries":
 *
 *   1. Webhook handlers — `/api/webhooks/stripe`, `/api/webhooks/github`.
 *      Signature verification happens BEFORE any DB write; Stripe / GitHub
 *      are the source of truth for the rows being written.
 *
 *   2. Admin tooling (M3+) — not at M1.
 *
 *   3. Calls into the `mint-runner-token` Edge Function as the dispatcher.
 *      The Web App's `/api/runs` dispatcher mints a runner JWT for a freshly
 *      created `runs` row; the mint Edge Function requires a service-role
 *      caller because it writes to `runner_token_mints` (which denies all
 *      client roles).
 *
 * That's it. Nothing else. If you find yourself reaching for this client
 * because "the regular client can't read X" — the answer is to fix the RLS
 * policy in `0002_rls_and_runner_jwt.sql`, not to bypass it.
 *
 * --- WHY NO COOKIES ---------------------------------------------------------
 *
 * Service-role clients are stateless. The key bypasses auth entirely; there
 * is no session to manage, no cookies to read. Each Route Handler that
 * needs the client calls `createServiceRoleClient()` at the top of the
 * handler and uses the returned instance for that request.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

import "server-only";

/**
 * Returns a service-role Supabase client. SERVER-ONLY.
 *
 * @throws Error when `SUPABASE_SERVICE_ROLE_KEY` is unset (production must
 *   fail closed; preview can use a staging key per env-vars.md).
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) {
    throw new Error(
      "createServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY must be set. This client must NEVER " +
        "be invoked from a code path that ships to the browser.",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Belt-and-braces tag so service-role queries are visible in
        // Supabase audit logs as originating from the web app (not a
        // direct dashboard query or a leaked-key attacker).
        "x-studio-zero-surface": "web-service-role",
      },
    },
  });
}
