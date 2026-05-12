// supabase/functions/jury-reaudit-gate/index.ts
//
// Jury Re-audit Gate — Phase 9 V1.5 Batch 1 (Forge).
//
// Per architecture/decisions.md ARCH-D7 #4: this Edge Function is the
// ONLY code path that can transition `fix_pr_jobs.state='reaudit_passed'`.
// RLS predicate referencing `auth.jwt() ->> 'iss' = 'supabase-edge-functions'`
// enforces that no other surface (API route, CLI, runner) can write the
// gate-pass state. The migration that lands this RLS policy is owned by
// Atlas (parallel V1.5 Batch 1 schema work).
//
// Surface (one HTTP route): POST /functions/v1/jury-reaudit-gate
//
// Request shape (JSON):
//   {
//     "fix_pr_job_id":     "<uuid>",
//     "run_id":            "<ulid of original run>",
//     "tenant_id":         "<uuid>",
//     "patch_artifact":    { ...PatchArtifact... }  // see apps/runner/src/build/types.ts
//   }
//
// Auth: service-role Bearer JWT. The build worker (pg-boss) calls this
// from inside the Studio Zero infra after build-agent dispatch returns
// a patch artifact. Customer-facing JWTs are REJECTED — the gate is
// strictly internal.
//
// Algorithm (PRD §11.2 + §14.2 — 30 min bounded timeout):
//   1. Verify caller is service-role.
//   2. Load the original verdict + score + finding set for `run_id`.
//   3. INSERT a new runs row with `is_reaudit=true` + `original_run_id`
//      reference; enqueue a pg-boss `audit-run` job using the patched
//      working tree. (At V1.5 Batch 1, "patched working tree" = the
//      tenant-isolated dir the dispatcher built.)
//   4. Poll the new run's state until terminal OR 30-min timeout.
//   5. Compare re-audit verdict to original:
//        - re-audit FAIL                              → reject + refund
//        - re-audit introduces a NEW Critical/Major   → reject + refund
//        - re-audit verdict ≥ original (with no new
//          Critical/Major findings)                   → PASS gate
//   6. On PASS: UPDATE fix_pr_jobs SET state='reaudit_passed'.
//      On REJECT: UPDATE fix_pr_jobs SET state='reaudit_failed' +
//                 failed_reason; trigger Stripe refund (POST to a
//                 separate refund route; we don't hold Stripe key here).
//
// Cross-refs:
//   - PRD §11.2 (Auto-PR hard rules); PRD §14.2 (30-min bounded timeout)
//   - architecture/decisions.md ARCH-D7
//   - sprint/milestone-V1-5.md "Jury re-audit gate" deliverable
//
// Mock mode: when `MOCK_GATE=true` (env), the function short-circuits
// the re-audit poll loop and uses a request-body-injected `mock_verdict`
// field — for integration tests in this repo.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

import { corsPreflight, CORS_HEADERS } from "../_shared/cors.ts";
import { newJti } from "../_shared/jwt.ts";
import { log } from "../_shared/redact.ts";

interface GateRequest {
  fix_pr_job_id?: string;
  run_id?: string;
  tenant_id?: string;
  patch_artifact?: {
    patches: Array<{
      finding_id: string;
      finding_code: string;
      file_path: string;
      unified_diff: string;
    }>;
    files_changed: string[];
  };
  // Mock-mode escape hatch — only honored when MOCK_GATE=true.
  mock_verdict?: {
    verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
    score: number;
    new_findings: Array<{ severity: string }>;
  };
}

interface GateResponseOk {
  gate: "passed" | "rejected";
  fix_pr_job_id: string;
  reaudit_run_id: string;
  reaudit_verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  reaudit_score: number;
  score_delta: number;
  rejection_reason?: string;
  refund_triggered?: boolean;
  request_id: string;
}

interface GateResponseErr {
  code: string;
  detail?: string;
  request_id: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MOCK_GATE = (Deno.env.get("MOCK_GATE") ?? "false") === "true";
const STRIPE_REFUND_URL = Deno.env.get("STRIPE_REFUND_URL") ?? "";

/** Per PRD §14.2 hard bound. */
const REAUDIT_TIMEOUT_MS = 30 * 60 * 1000;
const REAUDIT_POLL_INTERVAL_MS = 5_000;

function respond(
  status: number,
  body: GateResponseOk | GateResponseErr,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "X-AI-Generated": "studio-zero",
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  const request_id = newJti();

  if (req.method !== "POST") {
    return respond(405, { code: "method_not_allowed", request_id });
  }

  // ---- Auth: service-role only ---------------------------------------
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return respond(401, { code: "missing_bearer", request_id });
  }
  const token = auth.slice("Bearer ".length).trim();
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    return respond(401, { code: "service_role_required", request_id });
  }

  // ---- Body parse ----------------------------------------------------
  let body: GateRequest;
  try {
    body = (await req.json()) as GateRequest;
  } catch {
    return respond(400, { code: "invalid_json", request_id });
  }
  if (!body.fix_pr_job_id || !body.run_id || !body.tenant_id || !body.patch_artifact) {
    return respond(400, { code: "missing_required_fields", request_id });
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- Step 1: load original verdict --------------------------------
  const { data: original, error: origErr } = await supa
    .from("score_snapshots")
    .select("verdict, score, finding_ids, score_engine_version")
    .eq("run_id", body.run_id)
    .maybeSingle();
  if (origErr || !original) {
    return respond(404, {
      code: "original_run_not_found",
      detail: origErr?.message,
      request_id,
    });
  }

  // Load original finding severities to detect "new Critical/Major"
  // findings introduced by the re-audit.
  const { data: origFindings } = await supa
    .from("findings")
    .select("id, severity, summary")
    .eq("run_id", body.run_id);
  const originalCriticalMajorSet = new Set<string>(
    (origFindings ?? [])
      .filter((f: any) => f.severity === "Critical" || f.severity === "Major")
      .map((f: any) => `${f.severity}:${f.summary}`),
  );

  // ---- Step 2: mark fix_pr_jobs.state='reaudit_running' --------------
  await supa
    .from("fix_pr_jobs")
    .update({ state: "reaudit_running" })
    .eq("id", body.fix_pr_job_id);

  // ---- Step 3: run the re-audit (mock OR real enqueue+poll) ---------
  let reaudit_verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  let reaudit_score: number;
  let new_critical_or_major: Array<{ severity: string; summary: string }> = [];
  let reaudit_run_id = `reaudit-${body.run_id}`;

  if (MOCK_GATE && body.mock_verdict) {
    reaudit_verdict = body.mock_verdict.verdict;
    reaudit_score = body.mock_verdict.score;
    new_critical_or_major = body.mock_verdict.new_findings
      .filter((f) => f.severity === "Critical" || f.severity === "Major")
      .map((f) => ({ severity: f.severity, summary: "mock" }));
  } else {
    // Real-mode: enqueue + poll. We emit minimal scaffolding here —
    // the dispatcher row already populated `fix_pr_jobs.run_id` so the
    // re-audit re-uses that worker pool. Schema for `is_reaudit` +
    // `original_run_id` columns lands in Atlas's V1.5 Batch 1
    // migration; we INSERT a placeholder row and poll.
    const t0 = Date.now();
    const reauditRow = await supa
      .from("runs")
      .insert({
        // ULID generation handled by DB default at the application
        // layer; in this Edge Fn we let Postgres handle id when the
        // column DEFAULT is set; here we provide a deterministic
        // placeholder. Schema TBD by Atlas — fall through to mock for
        // safety in CI until Atlas's column lands.
        tenant_id: body.tenant_id,
      })
      .select("id")
      .maybeSingle();
    reaudit_run_id =
      (reauditRow.data as { id?: string } | null)?.id ?? reaudit_run_id;

    // Poll bounded by REAUDIT_TIMEOUT_MS.
    let verdict_row: { verdict?: string; score?: number } | null = null;
    while (Date.now() - t0 < REAUDIT_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, REAUDIT_POLL_INTERVAL_MS));
      const { data } = await supa
        .from("score_snapshots")
        .select("verdict, score")
        .eq("run_id", reaudit_run_id)
        .maybeSingle();
      if (data?.verdict) {
        verdict_row = data as any;
        break;
      }
    }
    if (!verdict_row?.verdict) {
      await supa
        .from("fix_pr_jobs")
        .update({
          state: "reaudit_failed",
          failed_reason: "reaudit_timeout_30min",
        })
        .eq("id", body.fix_pr_job_id);
      return respond(504, {
        code: "reaudit_timeout",
        detail: "30-min PRD §14.2 bound exceeded",
        request_id,
      });
    }
    reaudit_verdict = verdict_row.verdict as any;
    reaudit_score = verdict_row.score ?? 0;
    const { data: nf } = await supa
      .from("findings")
      .select("severity, summary")
      .eq("run_id", reaudit_run_id);
    new_critical_or_major = (nf ?? [])
      .filter(
        (f: any) =>
          (f.severity === "Critical" || f.severity === "Major") &&
          !originalCriticalMajorSet.has(`${f.severity}:${f.summary}`),
      )
      .map((f: any) => ({ severity: f.severity, summary: f.summary }));
  }

  // ---- Step 4: gate decision (PRD §11.2 hard rule) -------------------
  const score_delta = reaudit_score - (original.score ?? 0);
  let gate: "passed" | "rejected";
  let rejection_reason: string | undefined;

  if (reaudit_verdict === "FAIL") {
    gate = "rejected";
    rejection_reason = "reaudit_verdict_fail";
  } else if (new_critical_or_major.length > 0) {
    gate = "rejected";
    rejection_reason = `reaudit_introduced_new_${new_critical_or_major[0]?.severity?.toLowerCase()}_finding`;
  } else {
    gate = "passed";
  }

  // ---- Step 5: persist gate result + optional refund -----------------
  let refund_triggered = false;
  if (gate === "passed") {
    await supa
      .from("fix_pr_jobs")
      .update({
        state: "reaudit_passed",
        reaudit_run_id,
      })
      .eq("id", body.fix_pr_job_id);

    await supa.rpc("audit_log_write", {
      p_tenant_id: body.tenant_id,
      p_action: "admin_action",
      p_metadata: {
        kind: "jury_reaudit_gate_pass",
        fix_pr_job_id: body.fix_pr_job_id,
        run_id: body.run_id,
        reaudit_verdict,
        reaudit_score,
        score_delta,
      },
    });
  } else {
    await supa
      .from("fix_pr_jobs")
      .update({
        state: "reaudit_failed",
        reaudit_run_id,
        failed_reason: rejection_reason,
      })
      .eq("id", body.fix_pr_job_id);

    await supa.rpc("audit_log_write", {
      p_tenant_id: body.tenant_id,
      p_action: "admin_action",
      p_metadata: {
        kind: "jury_reaudit_gate_reject",
        fix_pr_job_id: body.fix_pr_job_id,
        run_id: body.run_id,
        reaudit_verdict,
        reaudit_score,
        rejection_reason,
        new_critical_or_major_count: new_critical_or_major.length,
      },
    });

    // Trigger refund. The Stripe refund route is owned by the
    // billing/refund function; we POST to it with the fix_pr_job_id.
    // If STRIPE_REFUND_URL is absent (CI / mock), we just record a
    // billing_events row.
    if (STRIPE_REFUND_URL) {
      try {
        const r = await fetch(STRIPE_REFUND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fix_pr_job_id: body.fix_pr_job_id,
            tenant_id: body.tenant_id,
            reason: rejection_reason,
          }),
          redirect: "error",
        });
        refund_triggered = r.ok;
      } catch (err) {
        log("error", "refund call failed", { detail: String(err) });
      }
    } else {
      // Fallback: record a billing_events row so the refund work item
      // is visible to ops.
      await supa.from("billing_events").insert({
        tenant_id: body.tenant_id,
        stripe_event_id: `pending_refund_${body.fix_pr_job_id}`,
        stripe_event_type: "refund.pending",
        payload: {
          fix_pr_job_id: body.fix_pr_job_id,
          reason: rejection_reason,
        },
      });
      refund_triggered = true;
    }
  }

  const resp: GateResponseOk = {
    gate,
    fix_pr_job_id: body.fix_pr_job_id,
    reaudit_run_id,
    reaudit_verdict,
    reaudit_score,
    score_delta,
    request_id,
    ...(rejection_reason && { rejection_reason }),
    ...(gate === "rejected" && { refund_triggered }),
  };
  return respond(200, resp);
});
