/**
 * POST /api/cli/pair/init — Phase 9 M3 Batch 2 (Forge).
 *
 * Step C3a of `ia/user-flows/cli-pairing-and-tamper.md` (CLI-generated
 * code path). The CLI calls this to mint a fresh 6-char pairing code
 * which the user then enters on the web app's Settings → CLI page. The
 * user's web-session `pair/confirm` POST flips this row to `active` +
 * issues the opaque pairing token; the CLI long-polls back here via
 * `long_poll_url` to pick up the token once confirmed.
 *
 * Body shape:
 *   { device_fingerprint: { hostname, os, arch }, cli_version }
 *   (also accepts camelCase `deviceFingerprint` / `cliVersion` for
 *    parity with the CLI's existing client code at
 *    `apps/cli/src/network/studio-client.ts`.)
 *
 * Response:
 *   {
 *     pairing_code: "ABC123",
 *     long_poll_url: "/api/cli/pair/init?code=ABC123",   // GET to poll
 *     expires_at:   "<iso>"
 *   }
 *
 * Rate limit: 5/min per IP. On bucket-full → 429 + Retry-After.
 *
 * Storage: inserts a pending row in `cli_pairings`:
 *   - tenant_id/user_id NULL until `pair/confirm` lands (the web user
 *     supplies them via session). Per Atlas's 0004 migration these are
 *     NULL-able for pending rows.
 *   - status='pending'
 *   - pairing_code_hash = sha256(code)
 *   - hostname/os/cli_version  from the body
 *   - expires_at = now + 5 min
 *
 * Privacy: NEVER accepts source-code or arbitrary payload — body cap
 * 4 KiB (deep below the M3 64 KiB cap; this endpoint sees only short
 * fingerprint strings).
 */
import { aiDisclosureHeaders } from "../../../../../lib/ai-disclosure";
import {
  cliJson,
  generatePairingCode,
  getClientIp,
  hashPairingCode,
  PAIRING_CODE_TTL_MS,
  rateLimit,
  tooManyRequests,
} from "../../../../../lib/cli-auth";
import { isMockMode } from "../../../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAIR_INIT_BODY_CAP = 4 * 1024; // 4 KiB

interface PairInitRequestBody {
  device_fingerprint?: { hostname?: string; os?: string; arch?: string };
  deviceFingerprint?: { hostname?: string; os?: string; arch?: string };
  cli_version?: string;
  cliVersion?: string;
}

interface PairInitOk {
  pairing_code: string;
  long_poll_url: string;
  expires_at: string;
}

interface PairInitErr {
  ok: false;
  error: string;
}

/* --------------------------------------------------------------------- */
/* POST — mint pairing code                                              */
/* --------------------------------------------------------------------- */

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) return tooManyRequests(rl.retryAfterMs, rl.reason ?? "rate_limited");

  // Body cap — read raw text so we can size-check before JSON parse.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return cliJson<PairInitErr>({ ok: false, error: "invalid_body" }, 400);
  }
  if (raw.length > PAIR_INIT_BODY_CAP) {
    return cliJson<PairInitErr>({ ok: false, error: "body_too_large" }, 413);
  }

  let body: PairInitRequestBody;
  try {
    body = raw.length ? (JSON.parse(raw) as PairInitRequestBody) : {};
  } catch {
    return cliJson<PairInitErr>({ ok: false, error: "invalid_json" }, 400);
  }

  const fp = body.device_fingerprint ?? body.deviceFingerprint;
  const cliVersion = body.cli_version ?? body.cliVersion;
  if (
    !fp ||
    typeof fp.hostname !== "string" ||
    typeof fp.os !== "string" ||
    typeof fp.arch !== "string" ||
    typeof cliVersion !== "string"
  ) {
    return cliJson<PairInitErr>({ ok: false, error: "invalid_fingerprint" }, 400);
  }

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString();
  const longPollUrl = `/api/cli/pair/init?code=${encodeURIComponent(code)}`;

  // Mock path — used in CI + the offline demo. Returns the code without
  // hitting Supabase so test fixtures don't need a DB.
  if (isMockMode()) {
    return cliJson<PairInitOk>(
      { pairing_code: code, long_poll_url: longPollUrl, expires_at: expiresAt },
      200,
    );
  }

  // Real path — service-role insert into `cli_pairings`. The user_id +
  // tenant_id stay NULL until pair/confirm; this is per Atlas's 0004
  // migration. RLS denies all client roles on this table so service-role
  // is the only way in.
  try {
    const { createServiceRoleClient } = await import(
      "../../../../../lib/supabase-service"
    );
    const service = createServiceRoleClient();
    const { error } = await service.from("cli_pairings").insert({
      pairing_code_hash: hashPairingCode(code),
      hostname: fp.hostname.slice(0, 256),
      os: fp.os.slice(0, 128),
      cli_version: cliVersion.slice(0, 64),
      // Atlas's 0004 adds these columns; existing rows are NULL-safe.
      status: "pending",
      expires_at: expiresAt,
      // We don't have the public-key from the CLI in M3 (ED25519 device
      // keys land in M4 per OQ-3). Placeholder column.
      public_key: "pending",
    });

    if (error) {
      // If the schema isn't migrated yet, fall back to returning the
      // code anyway — the long-poll will return empty until storage
      // catches up. Keeps the CLI's UX moving in early-dev environments.
      return cliJson<PairInitOk>(
        { pairing_code: code, long_poll_url: longPollUrl, expires_at: expiresAt },
        200,
        { "X-Studio-Zero-Storage": "deferred" },
      );
    }
  } catch {
    // Service role not configured (dev env) — degrade gracefully.
    return cliJson<PairInitOk>(
      { pairing_code: code, long_poll_url: longPollUrl, expires_at: expiresAt },
      200,
      { "X-Studio-Zero-Storage": "skipped" },
    );
  }

  return cliJson<PairInitOk>(
    { pairing_code: code, long_poll_url: longPollUrl, expires_at: expiresAt },
    200,
  );
}

/* --------------------------------------------------------------------- */
/* GET — long-poll for confirmation                                      */
/* --------------------------------------------------------------------- */

/**
 * GET /api/cli/pair/init?code=ABC123 — long-poll up to 25s for the
 * web user to confirm the code. On confirm, returns:
 *   { pairing_token, device_id, user_email, expires_at }
 * On still-pending: 204 No Content.
 * On expired/invalid code: 410 Gone.
 *
 * The CLI consumes this from `apps/cli/src/network/long-poll.ts`-style
 * polling. Returns 200 + the token immediately if the row already
 * flipped to active.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  if (!/^[A-Z0-9]{6}$/i.test(code)) {
    return cliJson({ ok: false, error: "invalid_code" }, 400);
  }
  const codeHash = hashPairingCode(code);

  if (isMockMode()) {
    return new Response(null, { status: 204, headers: aiDisclosureHeaders });
  }

  // Real path — poll the row up to 25s. We use a sparse polling loop
  // (250ms tick) rather than NOTIFY/LISTEN because pg-boss already owns
  // that channel; keeping the CLI long-poll independent avoids a second
  // pg listen consumer for M3.
  try {
    const { createServiceRoleClient } = await import(
      "../../../../../lib/supabase-service"
    );
    const service = createServiceRoleClient();
    const deadline = Date.now() + 25_000;

    while (Date.now() < deadline) {
      const { data, error } = await service
        .from("cli_pairings")
        .select(
          "id, user_id, tenant_id, status, expires_at, pairing_token, revoked_at, users(email)",
        )
        .eq("pairing_code_hash", codeHash)
        .maybeSingle();

      if (error || !data) {
        return cliJson({ ok: false, error: "code_not_found" }, 404);
      }

      const row = data as {
        id: string;
        user_id: string | null;
        tenant_id: string | null;
        status: string | null;
        expires_at: string | null;
        pairing_token: string | null;
        revoked_at: string | null;
        users?: { email?: string } | null;
      };

      if (row.revoked_at) {
        return cliJson({ ok: false, error: "code_revoked" }, 410);
      }
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
        return cliJson({ ok: false, error: "code_expired" }, 410);
      }
      if (row.status === "active" && row.pairing_token && row.user_id) {
        return cliJson(
          {
            pairing_token: row.pairing_token,
            device_id: row.id,
            user_email: row.users?.email ?? "",
            expires_at: row.expires_at,
          },
          200,
        );
      }

      // sleep 250ms before next poll
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } catch {
    // fall through
  }

  return new Response(null, { status: 204, headers: aiDisclosureHeaders });
}
