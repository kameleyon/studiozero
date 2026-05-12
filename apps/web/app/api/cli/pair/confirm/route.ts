/**
 * POST /api/cli/pair/confirm — Phase 9 M3 Batch 2 (Forge).
 *
 * Step C4 of `ia/user-flows/cli-pairing-and-tamper.md`. The signed-in
 * web user enters the 6-char code their CLI displayed; the web app POSTs
 * here with that code. We:
 *
 *   1. Resolve the authenticated user's session via `createServerSupabaseClient()`.
 *   2. Look up the `cli_pairings` pending row by code hash.
 *   3. Validate: not expired, not revoked, status='pending'.
 *   4. UPDATE: attach tenant_id + user_id, flip status='active', mint
 *      opaque pairing_token (32 random bytes → b64url), set
 *      expires_at = now + 90 days, paired_at = now.
 *   5. Return `{ pairing_token, expires_at }` to the web UI; the web UI
 *      shows "CLI connected ✓" and the CLI's parallel long-poll on
 *      /pair/init?code=... picks up the same token.
 *
 * Body: { pairing_code: "ABC123" }  (camelCase `pairingCode` also accepted)
 *
 * Auth: authenticated WEB user (Supabase session cookie). On unauthed →
 * 401.
 *
 * Rate limit: same per-IP 5/min bucket as init. Fail-streak counter
 * (≥5 mismatched code attempts) IP-blocks for 1h + Sentry alert.
 *
 * Privacy: the response carries the opaque token only — the web caller
 * MUST display it to the user as a one-time string OR pass it back to
 * the CLI by polling the init URL. Either way, the token is not stored
 * in browser-local storage by this endpoint; it lives in the DB and on
 * the CLI's `~/.studio-zero/auth.json`.
 */
import { aiDisclosureHeaders } from "../../../../../lib/ai-disclosure";
import {
  cliJson,
  generatePairingToken,
  getClientIp,
  hashPairingCode,
  isValidPairingCodeShape,
  PAIRING_TOKEN_TTL_MS,
  rateLimit,
  recordConfirmFailure,
  recordConfirmSuccess,
  tooManyRequests,
} from "../../../../../lib/cli-auth";
import { isMockMode } from "../../../../../lib/env";
import { createServerSupabaseClient } from "../../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRM_BODY_CAP = 1024; // 1 KiB — code only

interface ConfirmBody {
  pairing_code?: string;
  pairingCode?: string;
}

interface ConfirmOk {
  pairing_token: string;
  expires_at: string;
}

interface ConfirmErr {
  ok: false;
  error: string;
}

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) return tooManyRequests(rl.retryAfterMs, rl.reason ?? "rate_limited");

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return cliJson<ConfirmErr>({ ok: false, error: "invalid_body" }, 400);
  }
  if (raw.length > CONFIRM_BODY_CAP) {
    return cliJson<ConfirmErr>({ ok: false, error: "body_too_large" }, 413);
  }

  let body: ConfirmBody;
  try {
    body = raw.length ? (JSON.parse(raw) as ConfirmBody) : {};
  } catch {
    return cliJson<ConfirmErr>({ ok: false, error: "invalid_json" }, 400);
  }

  const code = body.pairing_code ?? body.pairingCode;
  if (!isValidPairingCodeShape(code)) {
    recordConfirmFailure(ip);
    return cliJson<ConfirmErr>({ ok: false, error: "invalid_pairing_code" }, 400);
  }

  // Web-session auth.
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return cliJson<ConfirmErr>({ ok: false, error: "unauthorized" }, 401);
  }
  const tenantId =
    (userData.user.user_metadata as { default_tenant_id?: string })?.default_tenant_id ?? null;

  // Mock fallback: skip DB roundtrip but still mint a token shape.
  if (isMockMode()) {
    const token = generatePairingToken();
    const expiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS).toISOString();
    recordConfirmSuccess(ip);
    return cliJson<ConfirmOk>({ pairing_token: token, expires_at: expiresAt }, 200);
  }

  if (!tenantId) {
    return cliJson<ConfirmErr>({ ok: false, error: "tenant_not_provisioned" }, 403);
  }

  // Real path — service-role update.
  try {
    const { createServiceRoleClient } = await import(
      "../../../../../lib/supabase-service"
    );
    const service = createServiceRoleClient();
    const codeHash = hashPairingCode(code.toUpperCase());

    const { data: pending, error: lookupErr } = await service
      .from("cli_pairings")
      .select("id, status, expires_at, revoked_at")
      .eq("pairing_code_hash", codeHash)
      .maybeSingle();

    if (lookupErr || !pending) {
      recordConfirmFailure(ip);
      return cliJson<ConfirmErr>({ ok: false, error: "pairing_code_invalid" }, 404);
    }
    const row = pending as {
      id: string;
      status: string | null;
      expires_at: string | null;
      revoked_at: string | null;
    };
    if (row.revoked_at) {
      recordConfirmFailure(ip);
      return cliJson<ConfirmErr>({ ok: false, error: "pairing_code_revoked" }, 410);
    }
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      recordConfirmFailure(ip);
      return cliJson<ConfirmErr>({ ok: false, error: "pairing_code_expired" }, 410);
    }
    if (row.status !== null && row.status !== "pending") {
      // Already confirmed by another browser tab — single-use guard.
      recordConfirmFailure(ip);
      return cliJson<ConfirmErr>({ ok: false, error: "pairing_code_already_used" }, 409);
    }

    const token = generatePairingToken();
    const tokenExpiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS).toISOString();

    const { error: updateErr } = await service
      .from("cli_pairings")
      .update({
        tenant_id: tenantId,
        user_id: userData.user.id,
        status: "active",
        pairing_token: token,
        revoked_at: null,
        expires_at: tokenExpiresAt,
        paired_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "pending"); // optimistic concurrency: single-use

    if (updateErr) {
      recordConfirmFailure(ip);
      return cliJson<ConfirmErr>({ ok: false, error: "confirm_failed" }, 500);
    }

    recordConfirmSuccess(ip);
    return new Response(
      JSON.stringify({ pairing_token: token, expires_at: tokenExpiresAt }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...aiDisclosureHeaders,
        },
      },
    );
  } catch {
    return cliJson<ConfirmErr>({ ok: false, error: "internal_error" }, 500);
  }
}
