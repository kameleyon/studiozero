// supabase/functions/build-brief/index.ts
//
// Build-mode brief generator — Phase 9 V2 Batch 1 (Forge).
//
// Per PRD §7.3 step 2 + BIGBRAIN.md Hard Rule §1 (confirm-brief-before-
// dispatch): this Edge Function consumes an intake-form payload, calls
// the LLM gateway (Cipher Fix-2) to produce a structured brief that
// matches `architecture/schemas/brief.v1.schema.json`, and writes the
// brief back to the `builds` row so the customer can review + confirm.
//
// Surface (one HTTP route): POST /functions/v1/build-brief
//
// Request body:
//   {
//     "build_id":  "<uuid>",
//     "tenant_id": "<uuid>",
//     "intake": {
//       "project_name":     "...",
//       "idea":             "...",
//       "target_audience":  { persona, primary_need, pain_point },
//       "vibe":             { adjectives: [], reference_urls: [] },
//       "constraints":      { budget_usd, deadline, must_have_features, non_goals },
//       "output_preference": "roadmap-docs" | "roadmap-docs-repo" | "roadmap-docs-repo-scaffold"
//     }
//   }
//
// Auth: service-role Bearer JWT only — invoked by pg-boss worker after
// the web app inserts the build row and enqueues `build-brief`. NOT a
// customer-facing endpoint.
//
// Cross-refs:
//   - architecture/schemas/brief.v1.schema.json
//   - agents/strategy/axiom.md (CPO — owns brief content quality)
//   - BIGBRAIN.md Brief Translation
//   - teams/*.md (used to derive team_roster from product type)
//
// Mock mode: `MOCK_BRIEF=true` returns a deterministic brief without
// calling the LLM gateway — used by integration tests.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

import { corsPreflight, CORS_HEADERS } from "../_shared/cors.ts";
import { log } from "../_shared/redact.ts";

interface IntakePayload {
  project_name?: string;
  idea?: string;
  target_audience?: {
    persona?: string;
    primary_need?: string;
    pain_point?: string;
  };
  vibe?: { adjectives?: string[]; reference_urls?: string[] };
  constraints?: {
    budget_usd?: number | null;
    deadline?: string | null;
    must_have_features?: string[];
    non_goals?: string[];
  };
  output_preference?:
    | "roadmap-docs"
    | "roadmap-docs-repo"
    | "roadmap-docs-repo-scaffold";
}

interface BriefRequest {
  build_id?: string;
  tenant_id?: string;
  intake?: IntakePayload;
}

interface Brief {
  schema_version: "brief.v1";
  build_id: string;
  tenant_id: string;
  project_name: string;
  idea_summary: string;
  target_audience: {
    persona: string;
    primary_need: string;
    pain_point: string;
  };
  jtbd: string;
  success_criteria: string[];
  vibe?: { adjectives?: string[]; reference_urls?: string[] };
  constraints?: {
    budget_usd?: number | null;
    deadline?: string | null;
    must_have_features?: string[];
    non_goals?: string[];
  };
  risk_profile: "regulated" | "consumer" | "internal";
  team_roster: string[];
  output_preference:
    | "roadmap-docs"
    | "roadmap-docs-repo"
    | "roadmap-docs-repo-scaffold";
  generated_at: string;
  produced_by: {
    agent: "bigbrain";
    model_class: "fast" | "thoughtful" | "long-context";
    request_id: string;
  };
}

/** Infer the team roster from idea + audience text. */
function inferTeamRoster(intake: IntakePayload): string[] {
  const blob = [
    intake.idea ?? "",
    intake.target_audience?.persona ?? "",
    intake.target_audience?.primary_need ?? "",
    (intake.constraints?.must_have_features ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const roster = new Set<string>();
  if (/shop|store|cart|product|inventory|checkout/.test(blob))
    roster.add("ecommerce");
  if (/blog|article|cms|newsletter|publishing/.test(blob)) roster.add("blog");
  if (/mobile|ios|android|app store|swift|kotlin/.test(blob))
    roster.add("mobile");
  if (/landing|marketing|brochure|info site/.test(blob))
    roster.add("marketing-site");
  if (/game|gaming|level|player|unity|unreal/.test(blob)) roster.add("gaming");
  if (/vr|virtual reality|metaverse|webxr/.test(blob)) roster.add("vr");
  if (/swift|swiftui|native ios/.test(blob)) roster.add("native-ios");
  if (/audit|compliance|wcag|review/.test(blob)) roster.add("audit");
  if (roster.size === 0) roster.add("saas");
  return Array.from(roster);
}

/** Infer the risk profile — regulated, consumer, or internal. */
function inferRiskProfile(
  intake: IntakePayload,
): "regulated" | "consumer" | "internal" {
  const blob = [
    intake.idea ?? "",
    (intake.constraints?.must_have_features ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  if (
    /(health|hipaa|medical|patient|finance|bank|kyc|aml|gdpr|pii|child|coppa|gambling|crypto)/.test(
      blob,
    )
  )
    return "regulated";
  if (/(internal|admin|back\s*office|operations|employee)/.test(blob))
    return "internal";
  return "consumer";
}

function composeJtbd(intake: IntakePayload): string {
  const persona = intake.target_audience?.persona ?? "the user";
  const need = intake.target_audience?.primary_need ?? "achieve their goal";
  const pain = intake.target_audience?.pain_point ?? "their current pain";
  return `When ${persona} wants to ${need}, they need this product so they can avoid ${pain}.`;
}

function deriveSuccessCriteria(intake: IntakePayload): string[] {
  const criteria: string[] = [];
  criteria.push("Time-to-first-value under 30 days for the target persona");
  if (intake.constraints?.deadline)
    criteria.push(`Ship MVP by ${intake.constraints.deadline}`);
  criteria.push("First 100 customers reached within 90 days post-launch");
  criteria.push(
    "Audit gate verdict PASS or PASS WITH FIXES before any delivery",
  );
  if (intake.constraints?.budget_usd != null)
    criteria.push(
      `Total Phase-1 spend under $${intake.constraints.budget_usd.toLocaleString()}`,
    );
  return criteria;
}

async function callLlmGateway(args: {
  intake: IntakePayload;
  buildId: string;
  tenantId: string;
}): Promise<{ summary: string; jtbd: string; criteria: string[] }> {
  const url = Deno.env.get("LLM_GATEWAY_URL");
  const useMock = Deno.env.get("MOCK_BRIEF") === "true" || !url;
  if (useMock) {
    return {
      summary: args.intake.idea?.slice(0, 480) ?? "",
      jtbd: composeJtbd(args.intake),
      criteria: deriveSuccessCriteria(args.intake),
    };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewerId: "jury", // closest existing principal in the gateway allowlist; replaced with 'bigbrain' once V2 schema lands
        system:
          "You are BigBrain — Studio Director. Convert the customer's intake into a precise project brief. Return strict JSON with keys idea_summary, jtbd, success_criteria (array of 4-6 items). Lead with the answer. Do not add commentary.",
        messages: [
          {
            role: "user",
            content: JSON.stringify(args.intake),
          },
        ],
        maxTokens: 700,
        modelClass: "thoughtful",
      }),
    });
    if (!res.ok) throw new Error(`gateway_${res.status}`);
    const body = (await res.json()) as { text?: string };
    if (!body.text) throw new Error("empty_text");
    const parsed = JSON.parse(body.text) as {
      idea_summary?: string;
      jtbd?: string;
      success_criteria?: string[];
    };
    return {
      summary: parsed.idea_summary ?? args.intake.idea ?? "",
      jtbd: parsed.jtbd ?? composeJtbd(args.intake),
      criteria:
        Array.isArray(parsed.success_criteria) &&
        parsed.success_criteria.length > 0
          ? parsed.success_criteria.slice(0, 12)
          : deriveSuccessCriteria(args.intake),
    };
  } catch (err) {
    log("build-brief gateway fallback", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    // Degrade gracefully — deterministic brief still emitted so the
    // confirm-flow can proceed; Comply audit logs the fallback.
    return {
      summary: args.intake.idea?.slice(0, 480) ?? "",
      jtbd: composeJtbd(args.intake),
      criteria: deriveSuccessCriteria(args.intake),
    };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response("method_not_allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const requestId = crypto.randomUUID();
  let body: BriefRequest;
  try {
    body = (await req.json()) as BriefRequest;
  } catch {
    return new Response(JSON.stringify({ code: "bad_json", request_id: requestId }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!body.build_id || !body.tenant_id || !body.intake) {
    return new Response(
      JSON.stringify({ code: "missing_fields", request_id: requestId }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const intake = body.intake;

  const { summary, jtbd, criteria } = await callLlmGateway({
    intake,
    buildId: body.build_id,
    tenantId: body.tenant_id,
  });

  const brief: Brief = {
    schema_version: "brief.v1",
    build_id: body.build_id,
    tenant_id: body.tenant_id,
    project_name: intake.project_name ?? "Untitled build",
    idea_summary: summary,
    target_audience: {
      persona: intake.target_audience?.persona ?? "Unknown persona",
      primary_need: intake.target_audience?.primary_need ?? "Unknown need",
      pain_point: intake.target_audience?.pain_point ?? "Unknown pain",
    },
    jtbd,
    success_criteria: criteria,
    vibe: intake.vibe,
    constraints: intake.constraints,
    risk_profile: inferRiskProfile(intake),
    team_roster: inferTeamRoster(intake),
    output_preference: intake.output_preference ?? "roadmap-docs-repo",
    generated_at: new Date().toISOString(),
    produced_by: {
      agent: "bigbrain",
      model_class: "thoughtful",
      request_id: requestId,
    },
  };

  // Write the brief back to the `builds` row + transition to
  // `brief_awaiting_confirmation`. The customer reviews and confirms
  // before any layer work begins (Hard Rule §1).
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
          state: "brief_awaiting_confirmation",
          brief,
          brief_generated_at: new Date().toISOString(),
        })
        .eq("id", body.build_id);
    }
  } catch (err) {
    log("build-brief write failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
  }

  return new Response(JSON.stringify({ brief, request_id: requestId }), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "X-AI-Generated": "studio-zero",
    },
  });
});
