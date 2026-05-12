/**
 * Studio Zero — `studio-zero logout` command.
 *
 * Phase 9 M3 Batch 1 (Forge). Revokes the device's pairing:
 *
 *   1. DELETE /api/cli/pair { deviceId } with the current token → server
 *      marks `cli_pairings.revoked_at = now()`.
 *   2. Delete `~/.studio-zero/auth.json` locally regardless of the
 *      server response (we want logout to succeed offline so a stolen
 *      laptop's local state can be wiped without network).
 *
 * Idempotent: calling logout when not paired prints a friendly message
 * and exits 0.
 */
import { loadEnv } from "../env.js";
import { readAuth, clearAuth } from "../auth/pairing-token.js";
import { request } from "../network/studio-client.js";

export interface LogoutOpts {
  apiUrl?: string;
  fetcher?: typeof fetch;
}

export async function logoutCommand(
  opts: LogoutOpts = {},
): Promise<{ ok: boolean; message: string }> {
  const env = loadEnv();
  const apiUrl = opts.apiUrl ?? env.apiUrl;
  const auth = readAuth(env.configDir);

  if (!auth) {
    return { ok: true, message: "Already signed out." };
  }

  // Best-effort server-side revoke. We do NOT block on its result.
  try {
    await request({
      apiUrl,
      method: "DELETE",
      path: "/api/cli/pair",
      auth: auth.token,
      body: { deviceId: auth.deviceId },
      ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
    });
  } catch {
    // Offline / server unreachable — local state still gets wiped below.
  }
  clearAuth(env.configDir);
  return { ok: true, message: "Signed out. ~/.studio-zero/auth.json removed." };
}
