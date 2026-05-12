/**
 * Studio Zero — pairing-token refresh.
 *
 * Phase 9 M3 Batch 1 (Forge). Token TTL is 90 days; we refresh when
 * `now > tokenExpiresAt - 7d` (one-week head room) so a long-running
 * customer never gets a 401 mid-audit. Server-side, the refresh route
 * issues a new token + invalidates the old one; per-device-fingerprint
 * binding is rechecked.
 *
 * M3 state: the refresh is spec'd here but returns a mock token unless
 * `STUDIOZERO_MOCK_REVIEWERS=false`. M3+1 wires the real round-trip
 * once the web endpoints (`/api/cli/refresh`) ship.
 */
import { readAuth, writeAuth, type AuthFile } from "./pairing-token.js";
import { request } from "../network/studio-client.js";

/** Decide whether refresh is needed. Threshold: 7 days before expiry. */
export function shouldRefresh(auth: AuthFile, now: Date = new Date()): boolean {
  const exp = new Date(auth.tokenExpiresAt).getTime();
  if (Number.isNaN(exp)) return true;
  const threshold = exp - 7 * 24 * 60 * 60 * 1000;
  return now.getTime() >= threshold;
}

interface RefreshResponseBody {
  token: string;
  expiresAt: string;
}

/**
 * Refresh the pairing token. Returns the updated auth row written to
 * disk, or the old auth row unchanged if no refresh was needed.
 *
 * Errors:
 *   - 401 → token already revoked; caller should clearAuth() + prompt
 *           the user to re-pair.
 *   - 5xx / network → throws; caller is expected to retry next command
 *           invocation. We do NOT block the user's current command.
 */
export async function refreshIfNeeded(
  configDir: string,
  apiUrl: string,
  opts: { mock?: boolean; now?: Date } = {},
): Promise<AuthFile | null> {
  const auth = readAuth(configDir);
  if (!auth) return null;
  if (!shouldRefresh(auth, opts.now ?? new Date())) return auth;

  if (opts.mock) {
    // M3 default: short-circuit with a 90-day extension.
    const next: AuthFile = {
      ...auth,
      token: auth.token, // mock keeps the same token string
      tokenExpiresAt: new Date(
        (opts.now ?? new Date()).getTime() + 90 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
    writeAuth(configDir, next);
    return next;
  }

  const res = await request<RefreshResponseBody>({
    apiUrl,
    method: "POST",
    path: "/api/cli/refresh",
    auth: auth.token,
    body: {
      deviceId: auth.deviceId,
      deviceFingerprint: auth.deviceFingerprint,
      cliVersion: auth.cliVersion,
      binaryHash: auth.binaryHash,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      // The server has revoked us. Don't loop; surface to the caller.
      throw new Error("PAIRING_REVOKED");
    }
    throw new Error(`refresh failed: HTTP ${res.status}`);
  }

  const next: AuthFile = {
    ...auth,
    token: res.body.token,
    tokenExpiresAt: res.body.expiresAt,
  };
  writeAuth(configDir, next);
  return next;
}
