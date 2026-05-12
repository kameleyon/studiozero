// supabase/functions/mint-runner-token/index.ts
//
// Sole minter of short-lived runner JWTs per ARCH-D3 + Atlas Blocker B2 close.
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Atlas (claim shape), Cipher
// (signing material, TTL hard cap), Shield (replay window). Audited by:
// `architecture/database/runner-jwt.md`.
//
// Auth: caller MUST present either
//   (a) the Supabase service-role JWT (web app's `/api/runs` dispatcher), or
//   (b) an authenticated user JWT for a member of the run's tenant.
// The function validates membership through `auth.is_member_of(tenant_id)`
// via service-role query — same source of truth the RLS policies use.
//
// Output: { token, expires_at, jti }. Token is HS256 over the Supabase JWT
// secret. Every mint writes one row to `runner_token_mints` (audit trail
// + revocation surface — Cipher Fix-5) and one row to `audit_logs` with
// action='runner_token_minted'.
//
// Hard contracts:
//   1. TTL is hard-capped at 300s (RUNNER_TTL_SECONDS in _shared/jwt.ts).
//   2. Claims include role='runner' so RLS `auth.claim_role()` returns
//      the expected value.
//   3. Service-role NEVER crosses to the runner — this function holds
//      the service-role internally for the audit-row write only.
//
// Cross-refs: see ARCH-D3 and runner-jwt.md "Mint endpoint" section.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

import { corsPreflight, CORS_HEADERS } from "../_shared/cors.ts";
import {
  newJti,
  RUNNER_AUDIENCE,
  RUNNER_ISSUER,
  RUNNER_TTL_SECONDS,
  sha256Hex,
  signRunnerJwt,
  type RunnerClaims,
} from "../_shared/jwt.ts";
import { log } from "../_shared/redact.ts";

interface MintRequestBody {
  run_id?: string;
  runner_kind?: "hosted-worker" | "cli-companion";
  runner_fingerprint?: string;
}

interface MintResponseOk {
  token: string;
  expires_at: string;
  jti: string;
}

interface MintResponseErr {
  code: string;
  request_id: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const JWT_SIGNING_SECRET =
  Deno.env.get("JWT_RUNNER_SIGNING_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET") ?? "";

function respond(status: number, body: MintResponseOk | MintResponseErr): Response {
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
    log("error", { event: "mint_misconfig", reason: "no_signing_secret", request_id: requestId });
    return respond(500, { code: "misconfigured", request_id: requestId });
  }

  // ---- Auth: must be service-role OR an authenticated user JWT. ---------
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearer) {
    return respond(401, { code: "missing_auth", request_id: requestId });
  }

  // Body parse.
  let body: MintRequestBody;
  try {
    body = (await req.json()) as MintRequestBody;
  } catch {
    return respond(400, { code: "invalid_body", request_id: requestId });
  }
  const runId = (body.run_id ?? "").trim();
  if (!runId) {
    return respond(400, { code: "missing_run_id", request_id: requestId });
  }

  // Service-role client for DB lookups + audit writes.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Lookup the run row (service-role bypasses RLS so we can resolve the
  // tenant_id without trusting the caller).
  const { data: runRow, error: runErr } = await admin
    .from("runs")
    .select("id, tenant_id, state")
    .eq("id", runId)
    .maybeSingle();
  if (runErr || !runRow) {
    log("warn", {
      event: "mint_run_not_found",
      run_id: runId,
      request_id: requestId,
      err: runErr?.message,
    });
    return respond(404, { code: "run_not_found", request_id: requestId });
  }

  const tenantId = runRow.tenant_id as string;

  // ---- Authorize the caller. ---------------------------------------------
  // Strategy: try the caller's JWT as an authenticated user first; if
  // membership check passes, mint. If the JWT is the service-role key
  // itself, allow (the web app dispatcher path).
  const isServiceRole = bearer === SUPABASE_SERVICE_ROLE_KEY;

  if (!isServiceRole) {
    const userClient = createClient(SUPABASE_URL, bearer, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      log("warn", { event: "mint_auth_failed", request_id: requestId, err: userErr?.message });
      return respond(401, { code: "invalid_auth", request_id: requestId });
    }
    // Membership check via service-role: is_member_of(tenant_id) for caller.
    const { data: memberRow, error: memberErr } = await admin
      .from("tenant_members")
      .select("tenant_id, role")
      .eq("tenant_id", tenantId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (memberErr || !memberRow) {
      log("warn", {
        event: "mint_membership_denied",
        request_id: requestId,
        tenant_id_hash: await sha256Hex(tenantId),
      });
      return respond(403, { code: "not_a_member", request_id: requestId });
    }
  }

  // ---- Mint. ------------------------------------------------------------
  const now = Math.floor(Date.now() / 1000);
  const exp = now + RUNNER_TTL_SECONDS;
  const jti = newJti();

  const fingerprint = (body.runner_fingerprint ?? "unknown").slice(0, 256);
  const sub =
    body.runner_kind === "cli-companion"
      ? `cli:${fingerprint}`
      : `worker:${fingerprint}`;

  const claims: RunnerClaims = {
    sub,
    aud: RUNNER_AUDIENCE,
    iss: RUNNER_ISSUER,
    tenant_id: tenantId,
    run_id: runId,
    role: "runner",
    iat: now,
    exp,
    jti,
  };

  let token: string;
  try {
    token = await signRunnerJwt(claims, JWT_SIGNING_SECRET);
  } catch (err) {
    log("error", { event: "mint_sign_failed", request_id: requestId, err: String(err) });
    return respond(500, { code: "sign_failed", request_id: requestId });
  }

  const tokenHash = await sha256Hex(token);

  // Audit trail: write to runner_token_mints (admin-only) + audit_logs.
  const { error: mintErr } = await admin.from("runner_token_mints").insert({
    tenant_id: tenantId,
    run_id: runId,
    jti,
    issued_at: new Date(now * 1000).toISOString(),
    expires_at: new Date(exp * 1000).toISOString(),
    token_sha256: tokenHash,
    issued_to: fingerprint,
  });
  if (mintErr) {
    log("error", { event: "mint_audit_insert_failed", request_id: requestId, err: mintErr.message });
    return respond(500, { code: "audit_write_failed", request_id: requestId });
  }

  // audit_logs via the SECURITY DEFINER function (service-role can EXECUTE).
  await admin.rpc("audit_log_write", {
    p_tenant_id: tenantId,
    p_action: "runner_token_minted",
    p_metadata: { run_id: runId, jti, sub, exp },
  });

  log("info", {
    event: "mint_ok",
    request_id: requestId,
    run_id: runId,
    jti,
    exp,
  });

  return respond(200, {
    token,
    expires_at: new Date(exp * 1000).toISOString(),
    jti,
  });
});
