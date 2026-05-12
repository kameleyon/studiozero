// supabase/functions/refresh-runner-token/index.ts
//
// Runner-JWT refresh per ARCH-D3 refresh-on-heartbeat pattern.
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Atlas, Cipher.
//
// Auth: caller presents the CURRENT runner JWT (still valid — not yet
// expired, not revoked). The function:
//   1. Verifies the signature + audience.
//   2. Confirms exp > now (still valid).
//   3. Confirms `runner_token_mints.revoked_at IS NULL` for the jti.
//   4. Re-validates membership / run existence (defense in depth).
//   5. Re-mints with the same claims set + fresh jti + fresh iat/exp.
//   6. Writes a NEW row to `runner_token_mints` for the new jti.
//      (We do NOT revoke the old one — Cipher Fix-3a "rotation" semantics
//       allow overlap so an in-flight call doesn't 401 mid-response.)
//
// Refresh policy: re-mint only if `(now - iat) > 60s` AND not revoked.
// Calling refresh sooner returns the existing exp (idempotent within
// the first minute). This avoids a hot-spinning runner from minting
// new tokens every heartbeat. Runners SHOULD refresh when
// `exp - now < 60s`.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

import { corsPreflight, CORS_HEADERS } from "../_shared/cors.ts";
import {
  bearerToken,
  newJti,
  RUNNER_TTL_SECONDS,
  sha256Hex,
  signRunnerJwt,
  verifyRunnerJwt,
  type RunnerClaims,
} from "../_shared/jwt.ts";
import { log } from "../_shared/redact.ts";

interface RefreshOk {
  token: string;
  expires_at: string;
  jti: string;
  rotated: boolean;
}

interface RefreshErr {
  code: string;
  request_id: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const JWT_SIGNING_SECRET =
  Deno.env.get("JWT_RUNNER_SIGNING_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET") ?? "";

const ROTATION_MIN_AGE_SECONDS = 60;

function respond(status: number, body: RefreshOk | RefreshErr): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  const requestId = newJti();

  if (req.method !== "POST") {
    return respond(405, { code: "method_not_allowed", request_id: requestId });
  }
  if (!JWT_SIGNING_SECRET) {
    return respond(500, { code: "misconfigured", request_id: requestId });
  }

  const token = bearerToken(req);
  if (!token) return respond(401, { code: "missing_auth", request_id: requestId });

  const claims = await verifyRunnerJwt(token, JWT_SIGNING_SECRET);
  if (!claims) return respond(401, { code: "invalid_signature", request_id: requestId });

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) {
    return respond(401, { code: "expired", request_id: requestId });
  }
  if (claims.role !== "runner") {
    return respond(401, { code: "bad_role", request_id: requestId });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Revocation check on the CURRENT jti.
  const { data: mintRow, error: mintErr } = await admin
    .from("runner_token_mints")
    .select("jti, revoked_at")
    .eq("jti", claims.jti)
    .maybeSingle();
  if (mintErr) {
    log("error", { event: "refresh_mint_lookup_failed", request_id: requestId, err: mintErr.message });
    return respond(500, { code: "lookup_failed", request_id: requestId });
  }
  if (!mintRow) {
    return respond(401, { code: "unknown_jti", request_id: requestId });
  }
  if (mintRow.revoked_at != null) {
    return respond(401, { code: "revoked", request_id: requestId });
  }

  // Re-validate the run row still exists and matches.
  const { data: runRow } = await admin
    .from("runs")
    .select("id, tenant_id, state")
    .eq("id", claims.run_id)
    .eq("tenant_id", claims.tenant_id)
    .maybeSingle();
  if (!runRow) {
    return respond(403, { code: "run_no_longer_active", request_id: requestId });
  }

  // Idempotency window — if minted < 60s ago, return same exp.
  const tokenAge = now - claims.iat;
  if (tokenAge < ROTATION_MIN_AGE_SECONDS) {
    log("info", {
      event: "refresh_noop",
      request_id: requestId,
      run_id: claims.run_id,
      token_age_s: tokenAge,
    });
    return respond(200, {
      token,
      expires_at: new Date(claims.exp * 1000).toISOString(),
      jti: claims.jti,
      rotated: false,
    });
  }

  // Mint a new token with fresh iat/exp/jti, same tenant + run + sub.
  const newClaims: RunnerClaims = {
    sub: claims.sub,
    aud: claims.aud,
    iss: claims.iss,
    tenant_id: claims.tenant_id,
    run_id: claims.run_id,
    role: "runner",
    iat: now,
    exp: now + RUNNER_TTL_SECONDS,
    jti: newJti(),
  };
  let newToken: string;
  try {
    newToken = await signRunnerJwt(newClaims, JWT_SIGNING_SECRET);
  } catch (err) {
    log("error", { event: "refresh_sign_failed", request_id: requestId, err: String(err) });
    return respond(500, { code: "sign_failed", request_id: requestId });
  }

  const tokenHash = await sha256Hex(newToken);
  const { error: insertErr } = await admin.from("runner_token_mints").insert({
    tenant_id: claims.tenant_id,
    run_id: claims.run_id,
    jti: newClaims.jti,
    issued_at: new Date(now * 1000).toISOString(),
    expires_at: new Date(newClaims.exp * 1000).toISOString(),
    token_sha256: tokenHash,
    issued_to: claims.sub,
  });
  if (insertErr) {
    log("error", { event: "refresh_audit_failed", request_id: requestId, err: insertErr.message });
    return respond(500, { code: "audit_write_failed", request_id: requestId });
  }

  await admin.rpc("audit_log_write", {
    p_tenant_id: claims.tenant_id,
    p_action: "runner_token_minted",
    p_metadata: { run_id: claims.run_id, jti: newClaims.jti, refresh: true, prev_jti: claims.jti },
  });

  log("info", {
    event: "refresh_ok",
    request_id: requestId,
    run_id: claims.run_id,
    jti: newClaims.jti,
    prev_jti: claims.jti,
  });

  return respond(200, {
    token: newToken,
    expires_at: new Date(newClaims.exp * 1000).toISOString(),
    jti: newClaims.jti,
    rotated: true,
  });
});
