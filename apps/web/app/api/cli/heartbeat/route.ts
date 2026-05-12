/**
 * POST /api/cli/heartbeat — Phase 9 M3 Batch 2 (Forge).
 *
 * 30s liveness ping from a paired CLI. Updates `cli_pairings.last_heartbeat_at`
 * (ARCH-D10 column added by Atlas's 0004 migration). The web app's
 * `studio-zero status` command uses this column to render the device's
 * "last seen" state.
 *
 * Auth: pairing-token Bearer.
 * Body: empty (or `{}`). We accept either.
 * Response: 200 `{ ok: true, last_heartbeat_at }`
 *
 * Rate posture: this endpoint is hit every 30s per paired CLI. Atlas's
 * migration adds an index on `(id) WHERE revoked_at IS NULL` so the
 * UPDATE is O(1). No outer rate-limit — bearer-token auth is sufficient
 * (the token's TTL + revocation are the throttle).
 *
 * Privacy: heartbeats are metadata-only; the body is unused (kept for
 * forward-compat with cli_version drift markers).
 */
import {
  cliJson,
  EVENTS_BODY_CAP_BYTES,
  unauthorized,
  verifyPairingToken,
} from "../../../../lib/cli-auth";
import { isMockMode } from "../../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_BODY_CAP = 1024; // 1 KiB

export async function POST(req: Request): Promise<Response> {
  // Body is optional; cap-check just in case.
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    // empty acceptable
  }
  if (raw.length > Math.min(HEARTBEAT_BODY_CAP, EVENTS_BODY_CAP_BYTES)) {
    return cliJson({ ok: false, error: "body_too_large" }, 413);
  }

  if (isMockMode()) {
    return cliJson(
      { ok: true, last_heartbeat_at: new Date().toISOString(), mock: true },
      200,
    );
  }

  let service:
    | Awaited<ReturnType<typeof import("../../../../lib/supabase-service").createServiceRoleClient>>
    | null = null;
  try {
    const mod = await import("../../../../lib/supabase-service");
    service = mod.createServiceRoleClient();
  } catch {
    return unauthorized("service_unavailable");
  }
  const pairing = await verifyPairingToken(service, req);
  if (!pairing) return unauthorized();

  const now = new Date().toISOString();
  try {
    const { error } = await service
      .from("cli_pairings")
      .update({ last_heartbeat_at: now, last_seen_at: now })
      .eq("id", pairing.id);
    if (error) {
      // last_heartbeat_at column may not be migrated yet — retry with
      // just last_seen_at which exists in the v0.1 schema.
      await service
        .from("cli_pairings")
        .update({ last_seen_at: now })
        .eq("id", pairing.id);
    }
  } catch {
    // Best-effort; the response below still confirms liveness from the
    // caller's perspective.
  }

  return cliJson({ ok: true, last_heartbeat_at: now }, 200);
}
