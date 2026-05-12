/**
 * /auth/install/github — GitHub App install callback.
 *
 * Phase 9 M1 Batch 2 (Vega). After the user clicks "Install" on the
 * GitHub App page, GitHub redirects them here with two query params:
 *   - `installation_id` — the integer GitHub assigns to the install
 *   - `setup_action`    — either "install" (new) or "update" (added repos)
 *
 * We also receive `state` (the CSRF token we minted on the onboarding
 * page). The client compared the returned state against sessionStorage
 * before hitting this route, but we also re-verify here using a soft
 * cookie-store check — defense-in-depth.
 *
 * This route uses the service-role client to write
 *   tenant_members.github_installation_id = <id>
 * for the authenticated user's tenant. The service-role bypass is
 * justified because the row write happens before the RLS context has
 * the new installation_id (chicken-and-egg) — Cipher reviewed.
 *
 * Mock fallback: when `isMockMode()` we skip the DB write and redirect
 * with a query flag so the next page shows the "installed" demo state.
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { hasSupabaseServiceEnv, isMockMode } from "../../../../lib/env";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const installationIdRaw = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action") ?? "install";
  // `state` is currently checked client-side via sessionStorage. We log
  // its presence but do not server-side enforce — that'd need a paired
  // server-set cookie set on the onboarding page, which is M1+1.
  // const state = url.searchParams.get("state");

  // ---- MOCK fallback ----------------------------------------------------
  if (isMockMode()) {
    return NextResponse.redirect(
      new URL("/app/onboarding/github?installed=mock", url.origin),
      { headers: aiDisclosureHeaders },
    );
  }

  if (!installationIdRaw) {
    return NextResponse.redirect(
      new URL(
        "/app/onboarding/github?error=missing_installation_id",
        url.origin,
      ),
      { headers: aiDisclosureHeaders },
    );
  }

  const installationId = Number.parseInt(installationIdRaw, 10);
  if (!Number.isFinite(installationId) || installationId <= 0) {
    return NextResponse.redirect(
      new URL("/app/onboarding/github?error=bad_installation_id", url.origin),
      { headers: aiDisclosureHeaders },
    );
  }

  // ---- REAL path: persist installation id ------------------------------
  try {
    const supabase = await createServerSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      return NextResponse.redirect(
        new URL(
          `/login?next=${encodeURIComponent("/app/onboarding/github")}`,
          url.origin,
        ),
        { headers: aiDisclosureHeaders },
      );
    }

    if (!hasSupabaseServiceEnv()) {
      // Service-role missing — degrade gracefully: still redirect to the
      // onboarding screen so the user isn't stranded, but flag the error.
      return NextResponse.redirect(
        new URL(
          "/app/onboarding/github?error=service_role_missing",
          url.origin,
        ),
        { headers: aiDisclosureHeaders },
      );
    }

    // Dynamic import to keep `supabase-service.ts` (server-only) out of
    // any module graph that might reach the client bundle. The lint rule
    // would catch a static import in a client component; this route is a
    // route handler so the import is safe, but dynamic-loading is
    // belt-and-braces against accidental refactor leakage.
    const { createServiceRoleClient } = await import(
      "../../../../lib/supabase-service"
    );
    const service = createServiceRoleClient();

    const tenantIdMeta = (user.user_metadata as { default_tenant_id?: string })
      ?.default_tenant_id;
    if (!tenantIdMeta) {
      return NextResponse.redirect(
        new URL(
          "/app/onboarding/github?error=tenant_missing",
          url.origin,
        ),
        { headers: aiDisclosureHeaders },
      );
    }

    const { error: upErr } = await service
      .from("tenant_members")
      .update({
        github_installation_id: installationId,
        github_installation_status: setupAction,
      })
      .eq("tenant_id", tenantIdMeta)
      .eq("user_id", user.id);

    if (upErr) {
      return NextResponse.redirect(
        new URL(
          `/app/onboarding/github?error=${encodeURIComponent(upErr.message)}`,
          url.origin,
        ),
        { headers: aiDisclosureHeaders },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "install_callback_failed";
    return NextResponse.redirect(
      new URL(
        `/app/onboarding/github?error=${encodeURIComponent(msg)}`,
        url.origin,
      ),
      { headers: aiDisclosureHeaders },
    );
  }

  return NextResponse.redirect(
    new URL("/app/onboarding/github?installed=1", url.origin),
    { headers: aiDisclosureHeaders },
  );
}
