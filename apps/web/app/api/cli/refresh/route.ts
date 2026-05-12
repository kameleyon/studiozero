/**
 * POST /api/cli/refresh — Phase 9 M3 Batch 2 (Forge).
 *
 * Token rotation per `apps/cli/src/auth/refresh.ts`. The CLI calls this
 * within the 7-day-before-expiry threshold; the server:
 *
 *   1. Verifies the current bearer token resolves to an active pairing.
 *   2. Generates a NEW opaque pairing_token (revokes the old by
 *      overwriting the column — the old token can't be looked up after).
 *   3. Extends expires_at by 90 days from now.
 *   4. Returns `{ token, expiresAt }` (also `pairing_token` / `expires_at`
 *      for parity with refresh.ts).
 *
 * Auth: pairing-token Bearer. On revoked/expired → 401.
 *
 * Rotation guarantee: the old token is invalid the moment the new one
 * is issued. There is no overlap window — a concurrent in-flight CLI
 * request using the old token will 401 (the CLI's HTTP layer retries
 * on the next request, by which point the rotation is finished and the
 * new token is on disk).
 */
import {
  cliJson,
  generatePairingToken,
  PAIRING_TOKEN_TTL_MS,
  unauthorized,
  verifyPairingToken,
} from "../../../../lib/cli-auth";
import { isMockMode } from "../../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RefreshOk {
  token: string;
  expiresAt: string;
  pairing_token: string;
  expires_at: string;
}

export async function POST(req: Request): Promise<Response> {
  if (isMockMode()) {
    const token = generatePairingToken();
    const expiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS).toISOString();
    return cliJson<RefreshOk>(
      { token, expiresAt, pairing_token: token, expires_at: expiresAt },
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

  const newToken = generatePairingToken();
  const newExpiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS).toISOString();

  const { error } = await service
    .from("cli_pairings")
    .update({
      pairing_token: newToken,
      expires_at: newExpiresAt,
    })
    .eq("id", pairing.id)
    .is("revoked_at", null);

  if (error) {
    return cliJson({ ok: false, error: "refresh_failed" }, 500);
  }

  return cliJson<RefreshOk>(
    {
      token: newToken,
      expiresAt: newExpiresAt,
      pairing_token: newToken,
      expires_at: newExpiresAt,
    },
    200,
  );
}
