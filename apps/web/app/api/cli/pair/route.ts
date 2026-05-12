/**
 * DELETE /api/cli/pair — Phase 9 M3 Batch 2 (Forge).
 *
 * Step C-UNPAIR of `ia/user-flows/cli-pairing-and-tamper.md` + S-CLI of
 * settings-and-account-management.md. The CLI calls this on `studio-zero
 * logout` to revoke its own pairing; the web UI also calls it from the
 * Settings → CLI list to revoke any device. Both share this endpoint —
 * server-side we check the auth header for a pairing token first; on
 * miss, we fall through to the web-session path with optional `?id=<row>`.
 *
 * Response: 204 No Content on success.
 *
 * Idempotency: a second DELETE on an already-revoked row is a 204 (the
 * CLI's logout loop should keep working even if the user revoked from
 * the web first).
 */
import {
  cliEmpty,
  cliJson,
  extractBearerToken,
  isValidTokenShape,
} from "../../../../lib/cli-auth";
import { isMockMode } from "../../../../lib/env";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request): Promise<Response> {
  if (isMockMode()) return cliEmpty(204);

  const token = extractBearerToken(req);
  const url = new URL(req.url);
  const rowId = url.searchParams.get("id");

  // Path A: CLI-initiated unpair (bearer token).
  if (token && isValidTokenShape(token)) {
    try {
      const { createServiceRoleClient } = await import(
        "../../../../lib/supabase-service"
      );
      const service = createServiceRoleClient();
      await service
        .from("cli_pairings")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("pairing_token", token);
    } catch {
      // Treat failure as still-202-ish for the CLI: it will clear local
      // state regardless (auth.json is the source of truth on the
      // device — leaving a stale server row is the lesser harm).
    }
    return cliEmpty(204);
  }

  // Path B: web-session unpair of a specific row.
  if (!rowId) {
    return cliJson({ ok: false, error: "missing_token_or_id" }, 400);
  }
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return cliJson({ ok: false, error: "unauthorized" }, 401);
  }
  try {
    const { createServiceRoleClient } = await import(
      "../../../../lib/supabase-service"
    );
    const service = createServiceRoleClient();
    // Scope to the calling user so a web user can't revoke someone
    // else's CLI device. Service-role bypasses RLS so we do the check
    // explicitly here.
    await service
      .from("cli_pairings")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("user_id", userData.user.id);
  } catch {
    // best-effort
  }
  return cliEmpty(204);
}
