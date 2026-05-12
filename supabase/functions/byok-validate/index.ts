// supabase/functions/byok-validate/index.ts
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (key never persists
// without Vault encryption), Atlas (api_keys row shape).
//
// Validates a customer-supplied Anthropic API key by making a 1-token
// dry-run call to `messages`. On success: encrypts the key via Supabase
// Vault (the AAD = `tenant_id::text` per Cipher Fix-1), inserts an
// `api_keys` row with `vault_secret_id` pointing at the Vault secret +
// `last4` fingerprint, and returns success metadata. On failure: returns
// 400 + a sanitised error reason. NEVER logs the key.
//
// Auth: authenticated user JWT (RLS-checked via api_keys_member_insert).
// The function uses the user's JWT to verify membership, then uses
// service-role to write the Vault secret + api_keys row.
//
// Edge-Fn co-location rationale per ARCH-D7: keep the dry-run + Vault
// write next to Postgres so the plaintext never crosses the Vercel
// function-logs surface.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

import { corsPreflight, CORS_HEADERS } from "../_shared/cors.ts";
import { bearerToken, newJti } from "../_shared/jwt.ts";
import { log } from "../_shared/redact.ts";

interface ValidateBody {
  api_key?: string;
  tenant_id?: string;
  /** Optional label like "Production key". */
  label?: string;
}

interface ValidateOk {
  ok: true;
  last4: string;
  vault_secret_id: string;
  request_id: string;
}

interface ValidateErr {
  ok: false;
  code: string;
  request_id: string;
  detail?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const VALIDATION_MODEL = "claude-3-5-haiku-20241022";

function respond(status: number, body: ValidateOk | ValidateErr): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function lastFour(key: string): string {
  return key.length >= 4 ? key.slice(-4) : "????";
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  const requestId = newJti();

  if (req.method !== "POST") {
    return respond(405, { ok: false, code: "method_not_allowed", request_id: requestId });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return respond(500, { ok: false, code: "misconfigured", request_id: requestId });
  }

  // Authenticated user JWT required.
  const userToken = bearerToken(req);
  if (!userToken) {
    return respond(401, { ok: false, code: "missing_auth", request_id: requestId });
  }
  const userClient = createClient(SUPABASE_URL, userToken, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return respond(401, { ok: false, code: "invalid_auth", request_id: requestId });
  }

  let body: ValidateBody;
  try {
    body = (await req.json()) as ValidateBody;
  } catch {
    return respond(400, { ok: false, code: "invalid_body", request_id: requestId });
  }

  const tenantId = (body.tenant_id ?? "").trim();
  const apiKey = (body.api_key ?? "").trim();
  if (!tenantId) {
    return respond(400, { ok: false, code: "missing_tenant_id", request_id: requestId });
  }
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return respond(400, { ok: false, code: "invalid_key_format", request_id: requestId });
  }
  if (apiKey.length > 200) {
    return respond(400, { ok: false, code: "key_too_long", request_id: requestId });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Membership verification (service-role read, but predicate identical to
  // RLS auth.is_member_of()).
  const { data: memberRow } = await admin
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!memberRow) {
    log("warn", { event: "byok_validate_not_member", request_id: requestId });
    return respond(403, { ok: false, code: "not_a_member", request_id: requestId });
  }

  // -- Dry-run Anthropic call. ONE token. ---
  let dryRun: Response;
  try {
    dryRun = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: VALIDATION_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
  } catch (err) {
    log("error", { event: "byok_dry_run_failed", request_id: requestId, err: String(err) });
    return respond(502, { ok: false, code: "anthropic_unreachable", request_id: requestId });
  }

  if (!dryRun.ok) {
    let reason = `status_${dryRun.status}`;
    try {
      const j = (await dryRun.json()) as { error?: { type?: string; message?: string } };
      if (j?.error?.type) reason = j.error.type;
    } catch {
      // ignore
    }
    log("warn", { event: "byok_invalid_key", request_id: requestId, reason });
    return respond(400, {
      ok: false,
      code: "anthropic_rejected",
      detail: reason,
      request_id: requestId,
    });
  }
  // Drain the response so the body doesn't hang in memory.
  try {
    await dryRun.text();
  } catch {
    // ignore
  }

  // -- Encrypt + persist. The Vault create_secret RPC encrypts with the
  //    project key; the `name` carries the AAD (per Cipher Fix-1, the
  //    AAD-binding check is enforced on the read side via
  //    vault.decrypt_byok which verifies api_keys.tenant_id matches the
  //    decrypt request's tenant). The plaintext stays in this scope
  //    only for the create_secret call. ---
  let vaultSecretId: string;
  try {
    // Supabase Vault: insert a secret and get the id back. Schema lives in
    // the `vault` schema; service-role can call `vault.create_secret`.
    const secretName = `byok_anthropic_${tenantId}_${Date.now()}`;
    const { data: secretResp, error: secretErr } = await admin.rpc("create_secret", {
      new_secret: apiKey,
      new_name: secretName,
      new_description: `BYOK Anthropic key for tenant ${tenantId}`,
    });
    if (secretErr || !secretResp || typeof secretResp !== "string") {
      log("error", { event: "byok_vault_write_failed", request_id: requestId, err: secretErr?.message });
      return respond(500, { ok: false, code: "vault_write_failed", request_id: requestId });
    }
    vaultSecretId = secretResp;
  } catch (err) {
    log("error", { event: "byok_vault_exception", request_id: requestId, err: String(err) });
    return respond(500, { ok: false, code: "vault_write_failed", request_id: requestId });
  }

  // -- Insert api_keys row. ---
  const last4 = lastFour(apiKey);
  const { error: insertErr } = await admin.from("api_keys").insert({
    tenant_id: tenantId,
    provider: "anthropic",
    vault_secret_id: vaultSecretId,
    last4,
    last_verified_at: new Date().toISOString(),
    label: body.label ?? null,
    created_by: userData.user.id,
  });
  if (insertErr) {
    log("error", { event: "byok_row_insert_failed", request_id: requestId, err: insertErr.message });
    return respond(500, { ok: false, code: "row_insert_failed", request_id: requestId });
  }

  await admin.rpc("audit_log_write", {
    p_tenant_id: tenantId,
    p_action: "api_key_validated",
    p_metadata: { provider: "anthropic", last4, vault_secret_id: vaultSecretId },
  });

  log("info", {
    event: "byok_validate_ok",
    request_id: requestId,
    tenant_id_hash: tenantId.slice(0, 8),
    last4,
  });

  return respond(200, {
    ok: true,
    last4,
    vault_secret_id: vaultSecretId,
    request_id: requestId,
  });
});
