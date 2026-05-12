/**
 * Next.js middleware — Supabase session refresh + tenant-context inject.
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (cookie boundary),
 * Atlas (tenant claim shape).
 *
 * Two responsibilities:
 *
 *   1. **Refresh the Supabase session cookie** before the request lands
 *      on a Server Component. Server Components are read-only with
 *      cookies, so the refresh path must run here (the only place Next 15
 *      lets us write request-bound cookies before the route handler).
 *      Pattern follows @supabase/ssr's documented middleware recipe.
 *
 *   2. **Inject a `x-studio-zero-tenant` request header** for downstream
 *      handlers that want the tenant_id without re-parsing the JWT. The
 *      tenant_id is read from `user_metadata.default_tenant_id` (set by
 *      our signup flow). Empty when the request is unauthenticated.
 *
 * Skips:
 *   - Static assets (Next's `_next/static`, `_next/image`, favicon, etc.)
 *   - The auth callback route (it must run with its own cookies path).
 *
 * Cross-refs:
 *   - `lib/supabase-server.ts` — pairs with this middleware for the
 *     request-scoped session.
 *   - `architecture/database/runner-jwt.md` — the JWT shape `auth.tenant_id()`
 *     reads. (The runner JWT is minted by the Edge Function, never here.)
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest): Promise<NextResponse> {
  // Default response — every branch below mutates / replaces this.
  let res = NextResponse.next({ request: { headers: req.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env is missing (offline dev with NEXT_PUBLIC_USE_AUTH_MOCK)
  // skip the refresh — the auth-mock cookie owns the session in that mode.
  if (!url || !anonKey) {
    return res;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
      ) {
        // Update both the request-side cookie jar (so downstream Server
        // Components see the refreshed cookie within this request) AND
        // the response-side cookie jar (so the browser persists it).
        for (const { name, value } of cookiesToSet) {
          req.cookies.set(name, value);
        }
        res = NextResponse.next({ request: { headers: req.headers } });
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  // Validate against Supabase Auth (don't trust the cookie alone). This
  // performs the JWT verify + auto-refresh in one round-trip.
  const { data } = await supabase.auth.getUser();

  // Inject a tenant header for downstream handlers. Empty string when
  // unauthenticated so the header always exists (avoids undefined-checks
  // in every route).
  const tenantId =
    (data.user?.user_metadata as { default_tenant_id?: string } | undefined)
      ?.default_tenant_id ?? "";

  res.headers.set("x-studio-zero-tenant", tenantId);
  res.headers.set("x-studio-zero-uid", data.user?.id ?? "");

  return res;
}

/**
 * Run middleware on everything except static assets + the OAuth callback
 * which carries its own cookies path. Auth callback is at /auth/callback.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg, favicon-16.svg
     * - public assets (anything with a file extension is treated as static)
     */
    "/((?!_next/static|_next/image|favicon.svg|favicon-16.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
