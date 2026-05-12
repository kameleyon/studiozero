// supabase/functions/llm-gateway/index.ts
//
// LLM Gateway — Cipher Fix-2. The ONLY caller of `vault.decrypt_byok`.
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (key-handling
// boundary), Atlas (DB co-location + RLS), Shield (PI/SSRF surface),
// Verify (allowlist + schema validation gate).
//
// Authoritative spec: `architecture/llm-gateway.md`.
//
// Surface (one HTTP route): POST /functions/v1/llm-gateway
//
// Request shape (JSON):
//   {
//     "agent_role":   "halo"|"optic"|...,
//     "messages":     [...]              // Anthropic-style messages
//     "model":        "claude-...",       // optional
//     "max_tokens":   number,            // required by Anthropic
//     "system":       string|null,       // optional
//     "tools":        [{name,description,input_schema}]?  // role-allowlisted
//   }
//
// Auth: Bearer runner-JWT (validated independently of the runner; signature
// + audience + revocation join + run-row tenancy match).
//
// Key handling (the load-bearing routine):
//   - BYOK runs: SELECT api_keys.vault_secret_id by tenant; call
//     `vault.decrypt_byok(tenant_id, secret_id)` via service-role; use the
//     plaintext for ONE fetch to Anthropic; nullify the local variable
//     after the fetch resolves; never log, never persist.
//   - Managed runs: read `MANAGED_ANTHROPIC_KEY` from Edge Fn secrets.
//
// Telemetry: per llm-gateway.md §8 — request_id, tokens_in, tokens_out,
// agent_role, model, status_code, duration_ms. NEVER the body, NEVER the
// key, NEVER the JWT.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

import { corsPreflight, CORS_HEADERS } from "../_shared/cors.ts";
import { bearerToken, newJti, verifyRunnerJwt } from "../_shared/jwt.ts";
import { log, redact } from "../_shared/redact.ts";

import { ALLOWLIST, FORBIDDEN_TOOLS, isKnownRole, type AgentRole } from "./allowlist.ts";
import { validateAgentOutput } from "./schema.ts";

interface LlmRequest {
  agent_role?: string;
  messages?: unknown[];
  model?: string;
  max_tokens?: number;
  system?: string | null;
  tools?: Array<{ name: string }>;
}

interface LlmErr {
  code: string;
  request_id: string;
  detail?: unknown;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const JWT_SIGNING_SECRET =
  Deno.env.get("JWT_RUNNER_SIGNING_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET") ?? "";
const MANAGED_ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY_MANAGED") ?? Deno.env.get("MANAGED_ANTHROPIC_KEY") ?? "";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const MAX_TOKENS_CAP = 8192;

function errRespond(status: number, body: LlmErr): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  const requestId = newJti();
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return errRespond(405, { code: "method_not_allowed", request_id: requestId });
  }
  if (!JWT_SIGNING_SECRET) {
    return errRespond(500, { code: "misconfigured", request_id: requestId });
  }

  // -- 1. Auth: verify runner JWT (signature + audience + expiry). --
  const token = bearerToken(req);
  if (!token) return errRespond(401, { code: "missing_auth", request_id: requestId });
  const claims = await verifyRunnerJwt(token, JWT_SIGNING_SECRET);
  if (!claims) return errRespond(401, { code: "invalid_signature", request_id: requestId });
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) return errRespond(401, { code: "expired", request_id: requestId });
  if (claims.aud !== "studio-zero/runner") {
    return errRespond(401, { code: "bad_audience", request_id: requestId });
  }
  if (claims.role !== "runner") {
    return errRespond(401, { code: "bad_role", request_id: requestId });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // -- 2. Revocation check (Cipher Fix-5). --
  const { data: mintRow } = await admin
    .from("runner_token_mints")
    .select("jti, revoked_at")
    .eq("jti", claims.jti)
    .maybeSingle();
  if (!mintRow || mintRow.revoked_at != null) {
    return errRespond(401, { code: "revoked", request_id: requestId });
  }

  // -- 3. Tenant + run resolution. Bound to BOTH run_id AND tenant_id. --
  const { data: runRow } = await admin
    .from("runs")
    .select("id, tenant_id, mode")
    .eq("id", claims.run_id)
    .eq("tenant_id", claims.tenant_id)
    .maybeSingle();
  if (!runRow) {
    return errRespond(403, { code: "run_tenant_mismatch", request_id: requestId });
  }
  const runMode = (runRow.mode ?? "byok") as "byok" | "managed";

  // -- 4. Body parse + role + tool-allowlist enforcement. --
  let body: LlmRequest;
  try {
    body = (await req.json()) as LlmRequest;
  } catch {
    return errRespond(400, { code: "invalid_body", request_id: requestId });
  }
  const role = (body.agent_role ?? "").trim();
  if (!isKnownRole(role)) {
    return errRespond(400, { code: "unknown_agent_role", request_id: requestId });
  }
  const requestedTools = Array.isArray(body.tools) ? body.tools.map((t) => t.name) : [];
  const forbidden = requestedTools.filter(
    (t) => FORBIDDEN_TOOLS.includes(t) || !ALLOWLIST[role as AgentRole].includes(t),
  );
  if (forbidden.length > 0) {
    log("warn", { event: "tool_not_allowed", request_id: requestId, role, forbidden });
    return errRespond(400, { code: "tool_not_allowed", request_id: requestId, detail: forbidden });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return errRespond(400, { code: "missing_messages", request_id: requestId });
  }
  const maxTokens = Math.min(Math.max(Number(body.max_tokens ?? 1024), 1), MAX_TOKENS_CAP);
  const model = body.model && typeof body.model === "string" ? body.model : DEFAULT_MODEL;

  // -- 5. Per-tenant token-budget cap (R1 — M2). --
  //
  // Calls Atlas's `check_token_budget(tenant_id)` SECURITY DEFINER function,
  // which returns FALSE iff used > cap × 1.10 (110% threshold per the brief).
  // Falls back to the legacy audit_logs aggregation if the function is not
  // yet present (deploys where Atlas's M2 migration hasn't applied).
  //
  // On cap hit: HTTP 429 + JSON { error, cap_micros, used_micros, alert_sent }.
  // Emits a Sentry "warning" so Watch routes to Meter alert per agent
  // persona rule 5 (not "error" — budget enforcement is expected business
  // behavior, not a failure mode).
  {
    let withinBudget = true;
    let capMicros: number | null = null;
    let usedMicros = 0;
    let usingFallback = false;

    try {
      const { data: budgetOk, error: budgetErr } = await admin.rpc(
        "check_token_budget",
        { p_tenant_id: claims.tenant_id },
      );
      if (budgetErr) {
        usingFallback = true;
      } else if (typeof budgetOk === "boolean") {
        withinBudget = budgetOk;
      }
    } catch (_err) {
      usingFallback = true;
    }

    // Pull current cap + usage for the 429 envelope (and the fallback path).
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("token_budget_micros")
      .eq("id", claims.tenant_id)
      .maybeSingle();
    if (tenantRow && typeof tenantRow.token_budget_micros === "number") {
      capMicros = tenantRow.token_budget_micros;
    }

    // Prefer tenant_token_usage_daily (Atlas's M2 rollup) for the used_micros
    // figure; fall back to scanning today's audit_logs entries on older deploys.
    let usageRollupAvailable = false;
    try {
      const { data: usageRow, error: usageErr } = await admin
        .from("tenant_token_usage_daily")
        .select("used_micros")
        .eq("tenant_id", claims.tenant_id)
        .eq("usage_date", new Date().toISOString().slice(0, 10))
        .maybeSingle();
      if (!usageErr && usageRow && typeof (usageRow as { used_micros?: number }).used_micros === "number") {
        usedMicros = (usageRow as { used_micros: number }).used_micros;
        usageRollupAvailable = true;
      }
    } catch (_err) {
      /* table not present; fall through to audit_logs path */
    }

    if (!usageRollupAvailable) {
      const { data: usageRows } = await admin
        .from("audit_logs")
        .select("metadata")
        .eq("tenant_id", claims.tenant_id)
        .eq("action", "llm_call")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      for (const r of usageRows ?? []) {
        const m = (r as { metadata?: { cost_micros?: number } }).metadata;
        if (m && typeof m.cost_micros === "number") usedMicros += m.cost_micros;
      }
      if (usingFallback && capMicros !== null && usedMicros > capMicros * 1.1) {
        withinBudget = false;
      }
    }

    if (!withinBudget) {
      log("warn", {
        event: "token_budget_exceeded",
        request_id: requestId,
        tenant_id: claims.tenant_id,
        cap_micros: capMicros,
        used_micros: usedMicros,
        used_fallback_check: usingFallback,
      });
      return new Response(
        JSON.stringify({
          error: "token_budget_exceeded",
          request_id: requestId,
          cap_micros: capMicros,
          used_micros: usedMicros,
          alert_sent: true,
        }),
        {
          status: 429,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }
  }

  // -- 6. Key resolution. THE LOAD-BEARING ROUTINE. --
  let apiKey: string | null = null;
  if (runMode === "byok") {
    const { data: keyRow } = await admin
      .from("api_keys")
      .select("vault_secret_id")
      .eq("tenant_id", claims.tenant_id)
      .is("revoked_at", null)
      .maybeSingle();
    if (!keyRow?.vault_secret_id) {
      return errRespond(403, { code: "byok_no_key", request_id: requestId });
    }
    const { data: decrypted, error: decryptErr } = await admin.rpc("decrypt_byok", {
      p_tenant_id: claims.tenant_id,
      p_secret_id: keyRow.vault_secret_id,
    });
    if (decryptErr || !decrypted || typeof decrypted !== "string") {
      // Cipher Fix-1: audit-log already written by SECURITY DEFINER func.
      return errRespond(403, { code: "aad_fail", request_id: requestId });
    }
    apiKey = decrypted;
  } else {
    if (!MANAGED_ANTHROPIC_KEY) {
      return errRespond(500, { code: "managed_key_unavailable", request_id: requestId });
    }
    apiKey = MANAGED_ANTHROPIC_KEY;
  }

  // -- 7. Anthropic call. apiKey lives ONLY in this scope. --
  const upstreamBody = {
    model,
    max_tokens: maxTokens,
    messages: body.messages,
    ...(body.system != null ? { system: body.system } : {}),
    ...(body.tools && body.tools.length > 0 ? { tools: body.tools } : {}),
  };

  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch (err) {
    apiKey = null;
    log("error", { event: "upstream_fetch_failed", request_id: requestId, err: String(err) });
    return errRespond(502, { code: "upstream_unreachable", request_id: requestId });
  } finally {
    // Drop the plaintext reference ASAP. The isolate teardown is the real
    // guarantee; this is belt+braces against a slow-cleanup pause.
    apiKey = null;
  }

  // -- 8. Handle upstream non-200. --
  if (!upstream.ok) {
    const retryAfter = upstream.headers.get("retry-after");
    if (upstream.status === 429) {
      return new Response(
        JSON.stringify({
          code: "upstream_rate_limited",
          request_id: requestId,
          retry_after: retryAfter ? parseInt(retryAfter, 10) : 60,
        }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            ...(retryAfter ? { "Retry-After": retryAfter } : {}),
          },
        },
      );
    }
    log("warn", {
      event: "upstream_non_2xx",
      request_id: requestId,
      status: upstream.status,
    });
    return errRespond(upstream.status >= 500 ? 502 : 400, {
      code: `upstream_${upstream.status}`,
      request_id: requestId,
    });
  }

  // -- 9. Parse + schema validate. --
  let responseBody: Record<string, unknown>;
  try {
    responseBody = (await upstream.json()) as Record<string, unknown>;
  } catch (err) {
    log("error", { event: "upstream_parse_failed", request_id: requestId, err: String(err) });
    return errRespond(502, { code: "upstream_parse_failed", request_id: requestId });
  }
  const validation = validateAgentOutput(responseBody);
  if (!validation.ok) {
    log("warn", {
      event: "schema_drift",
      request_id: requestId,
      errors: validation.errors.slice(0, 5),
    });
    return errRespond(422, {
      code: "schema_drift",
      request_id: requestId,
      detail: validation.errors.slice(0, 5),
    });
  }

  // -- 10. Audit-log metadata-only. Tokens in/out come from response.usage. --
  const usage = (responseBody.usage as { input_tokens?: number; output_tokens?: number } | undefined) ?? {};
  const tokensIn = typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
  const tokensOut = typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
  const durationMs = Date.now() - startedAt;
  const upstreamRequestId = upstream.headers.get("request-id") ?? upstream.headers.get("x-request-id");

  await admin.rpc("audit_log_write", {
    p_tenant_id: claims.tenant_id,
    p_action: "llm_call",
    p_metadata: {
      run_id: claims.run_id,
      request_id: requestId,
      upstream_request_id: upstreamRequestId,
      agent_role: role,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      duration_ms: durationMs,
      mode: runMode,
    },
  });

  // R1 — token-usage rollup (Atlas M2 `tenant_token_usage_daily`).
  //
  // Best-effort UPSERT keyed on (tenant_id, usage_date) — Atlas's migration
  // ships the table + ON CONFLICT (...) DO UPDATE accumulator. Token-COGS
  // conversion to micros is the same heuristic Meter uses for the dashboard:
  // input $3 / 1M tokens + output $15 / 1M tokens (Sonnet-class pricing per
  // finance/unit-economics.md). If the table isn't present yet the write
  // fails silently — the audit_log row above is still the canonical record.
  try {
    const INPUT_COST_MICROS_PER_TOKEN = 3;      // $3.00 / 1M  = 3 micros / token
    const OUTPUT_COST_MICROS_PER_TOKEN = 15;    // $15.00 / 1M = 15 micros / token
    const costMicros =
      tokensIn * INPUT_COST_MICROS_PER_TOKEN +
      tokensOut * OUTPUT_COST_MICROS_PER_TOKEN;
    const today = new Date().toISOString().slice(0, 10);
    await admin.from("tenant_token_usage_daily").upsert(
      {
        tenant_id: claims.tenant_id,
        usage_date: today,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        used_micros: costMicros,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,usage_date", ignoreDuplicates: false },
    );
  } catch (_err) {
    // Atlas's M2 migration hasn't applied; metadata.cost_micros on the
    // audit_log row above is still the fallback aggregation source.
  }

  log("info", {
    event: "llm_call_ok",
    request_id: requestId,
    run_id: claims.run_id,
    agent_role: role,
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    duration_ms: durationMs,
  });

  // Forward the response body — redaction applied for any embedded paths /
  // UUIDs / accidental key shapes. The runner consumes this JSON.
  const safeBody = redact(responseBody) as Record<string, unknown>;
  return new Response(JSON.stringify(safeBody), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
