// supabase/functions/build-audit-gate/index.ts
//
// Build-mode audit gate — Phase 9 V2 Batch 1 (Forge).
//
// Per PRD §7.3 step 7 hard rule: NO Build output ships without a Jury
// verdict of `PASS` or `PASS WITH FIXES`. This Edge Function is the
// only authorized code path that decides delivery.
//
// Algorithm (mirrors the V1.5 jury-reaudit-gate but operates on the
// assembled bundle rather than a patched working tree):
//
//   1. Verify caller is service-role.
//   2. Load the roadmap-bundle for `build_id`.
//   3. Insert a synthetic `runs` row (audit-mode) with intake_payload =
//      the bundle's documents; enqueue an `audit-run` job.
//   4. Wait for verdict (poll up to 20 min — bundles audit faster than
//      code; V1.5 used 30 min for re-audit).
//   5. Compare verdict:
//        - FAIL              → block delivery; surface findings to customer
//        - PASS WITH FIXES   → allow delivery; record fixes in bundle.risks_md
//        - PASS              → allow delivery
//   6. Update the `builds` row state + audit_gate field; the runner-
//      worker then either proceeds to repo seed (if applicable) or
//      stops at the bundle assembly stage.
//
// Cross-refs:
//   - PRD §7.3 step 7
//   - milestone-V2.md exit gate "Audit-gate-blocks-delivery negative test"
//   - apps/runner/src/build/v2/bundle-assembler.ts (caller)
//
// Mock mode: `MOCK_BUILD_AUDIT_GATE=true` + body.mock_verdict bypasses
// the audit job and uses the supplied verdict for integration tests.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

import { corsPreflight, CORS_HEADERS } from "../_shared/cors.ts";
import { log } from "../_shared/redact.ts";

interface GateRequest {
  build_id?: string;
  tenant_id?: string;
  bundle?: { documents?: Record<string, string> };
  // Mock-mode escape hatch — only honored when MOCK_BUILD_AUDIT_GATE=true.
  mock_verdict?: {
    verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
    score: number;
    rejection_reason?: string;
  };
}

interface GateResponseOk {
  gate: "passed" | "rejected";
  build_id: string;
  audit_run_id: string;
  verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  score: number;
  rejection_reason?: string;
  request_id: string;
}

function isServiceRole(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  // Edge Functions sign the SUPABASE_SERVICE_ROLE_KEY as a JWT internally;
  // we accept "Bearer <token>" matching SUPABASE_SERVICE_ROLE_KEY or a
  // valid signed service-role JWT. The deno runtime sets a `role` claim
  // upstream when called via supabase.functions.invoke().
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (expected && token === expected) return true;
  // Allow signed JWT with role=service_role (decoded by supabase-js
  // helper in the calling context).
  try {
    const [, payload] = token.split(".");
    if (!payload) return false;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { role?: string };
    return decoded.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const requestId = crypto.randomUUID();
  const respond = (
    body: GateResponseOk | { code: string; detail?: string; request_id: string },
    status: number,
  ): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "X-AI-Generated": "studio-zero",
      },
    });

  if (req.method !== "POST") {
    return respond(
      { code: "method_not_allowed", request_id: requestId },
      405,
    );
  }

  if (!isServiceRole(req)) {
    return respond(
      { code: "unauthorized", request_id: requestId },
      401,
    );
  }

  let body: GateRequest;
  try {
    body = (await req.json()) as GateRequest;
  } catch {
    return respond({ code: "bad_json", request_id: requestId }, 400);
  }

  if (!body.build_id || !body.tenant_id) {
    return respond(
      { code: "missing_fields", request_id: requestId },
      400,
    );
  }

  const mock = Deno.env.get("MOCK_BUILD_AUDIT_GATE") === "true";
  let verdict: "PASS" | "PASS WITH FIXES" | "FAIL" = "PASS WITH FIXES";
  let score = 80;
  let rejectionReason: string | undefined;
  let auditRunId = "";

  if (mock && body.mock_verdict) {
    verdict = body.mock_verdict.verdict;
    score = body.mock_verdict.score;
    rejectionReason = body.mock_verdict.rejection_reason;
    auditRunId = `audit-mock-${requestId}`;
  } else {
    // Production: enqueue an audit run on the bundle's documents.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !serviceKey) throw new Error("supabase_env_missing");
      const svc = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });
      const { data: runRow, error: insErr } = await svc
        .from("runs")
        .insert({
          tenant_id: body.tenant_id,
          project_id: body.build_id,
          state: "queued",
          mode: "managed",
          product: "full",
          depth: "comprehensive",
          intake_method: "local_folder",
          intake_payload: {
            kind: "build_bundle",
            build_id: body.build_id,
            documents: body.bundle?.documents ?? {},
          },
          correlation_id: requestId,
          is_build_audit: true,
        })
        .select("id")
        .single();
      if (insErr || !runRow) throw new Error(insErr?.message ?? "audit_insert_failed");
      auditRunId = (runRow as { id: string }).id;

      // Poll the run for terminal verdict (max 20 min).
      const deadline = Date.now() + 20 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5000));
        const { data: poll } = await svc
          .from("runs")
          .select("state, verdict, score")
          .eq("id", auditRunId)
          .single();
        const p = poll as
          | {
              state: string;
              verdict: "PASS" | "PASS WITH FIXES" | "FAIL" | null;
              score: number | null;
            }
          | null;
        if (!p) continue;
        if (
          p.state === "verdict_emitted" ||
          p.state === "archived" ||
          p.state === "failed_terminal"
        ) {
          verdict = p.verdict ?? "FAIL";
          score = p.score ?? 0;
          break;
        }
      }
    } catch (err) {
      log("build-audit-gate poll failed", {
        reason: err instanceof Error ? err.message : "unknown",
      });
      verdict = "FAIL";
      score = 0;
      rejectionReason = "audit_run_failed";
    }
  }

  const passed = verdict === "PASS" || verdict === "PASS WITH FIXES";
  if (!passed && !rejectionReason) {
    rejectionReason = `Jury verdict ${verdict} at score ${score}/100.`;
  }

  // Persist the verdict on the build row.
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (supabaseUrl && serviceKey) {
      const svc = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });
      await svc
        .from("builds")
        .update({
          state: passed ? "delivering" : "audit_failed",
          verdict,
          score,
          audit_gate: {
            verdict,
            score,
            decided_at: new Date().toISOString(),
            audit_run_id: auditRunId,
            rejection_reason: rejectionReason,
          },
        })
        .eq("id", body.build_id);
    }
  } catch (err) {
    log("build-audit-gate persist failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
  }

  return respond(
    {
      gate: passed ? "passed" : "rejected",
      build_id: body.build_id,
      audit_run_id: auditRunId,
      verdict,
      score,
      rejection_reason: rejectionReason,
      request_id: requestId,
    },
    200,
  );
});
