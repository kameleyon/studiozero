/**
 * Studio Zero — shared fixer runtime helpers.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Extracted out of `halo-fixer.ts` so the
 * other five fixers (proof, optic, canon, compass, trace) can reuse the
 * "LLM → parse JSON → buildUnifiedDiff → validatePatch → Patch" pipeline.
 *
 * Every fixer's prompt template differs (Halo cites WCAG; Proof cites the
 * Herald voice rules; Canon swaps brand tokens; etc.); the post-LLM
 * pipeline is identical — and getting it identical is load-bearing for
 * the Cipher Fix-2 "single LLM-call code path" assertion.
 */
import type { Fixer, FixerResult, FixerContext, Patch } from "./types.js";
import type { LlmGatewayClient } from "../llm-gateway-client.js";
import { buildUnifiedDiff, validatePatch } from "./patch.js";

interface FixerJsonResponse {
  replacement_block?: string;
  confidence?: number;
  rationale?: string;
}

export interface RunFixerArgs {
  ctx: FixerContext;
  expectedLayer: ReturnType<() => FixerContext["finding"]["layer"]>;
  systemPrompt: string;
  producedBy: Patch["produced_by"];
  /** Which reviewer role the gateway logs this call under. The gateway
   *  enforces a per-role allowlist for tool calls; we map fixer → reviewer
   *  so the role used at audit-time is the same at fix-time. */
  reviewerRole:
    | "halo"
    | "proof"
    | "optic"
    | "canon"
    | "compass"
    | "trace";
}

export async function runFixerCommon(
  args: RunFixerArgs,
): Promise<FixerResult> {
  const { ctx, expectedLayer, systemPrompt, producedBy, reviewerRole } = args;
  if (ctx.finding.layer !== expectedLayer) {
    return {
      ok: false,
      finding_id: ctx.finding.id,
      reason: `${producedBy}: layer=${ctx.finding.layer} not '${expectedLayer}'`,
    };
  }
  const originalLines = ctx.original_file_contents.split("\n");
  const targetBlock = originalLines
    .slice(ctx.finding.line_start - 1, ctx.finding.line_end)
    .join("\n");

  const userMsg = JSON.stringify({
    finding_code: ctx.finding.finding_code,
    severity: ctx.finding.severity,
    summary: ctx.finding.summary,
    recommendation: ctx.finding.recommendation,
    file_path: ctx.finding.file_path,
    line_start: ctx.finding.line_start,
    line_end: ctx.finding.line_end,
    target_block: targetBlock,
  });

  const resp = await callGateway(ctx.gateway, {
    reviewerId: reviewerRole,
    system: systemPrompt,
    userMsg,
    traceparent: ctx.traceparent,
    signal: ctx.signal,
  });

  const parsed = parseJsonOrFenced(resp.text);
  if (!parsed.ok) {
    return {
      ok: false,
      finding_id: ctx.finding.id,
      reason: `${producedBy}: ${parsed.reason}`,
    };
  }

  const { unified_diff, lines_added, lines_removed } = buildUnifiedDiff({
    file_path: ctx.finding.file_path,
    original_contents: ctx.original_file_contents,
    line_start: ctx.finding.line_start,
    line_end: ctx.finding.line_end,
    replacement_block: parsed.replacement_block,
  });

  const v = validatePatch({
    unified_diff,
    expected_file_path: ctx.finding.file_path,
    expected_line_start: ctx.finding.line_start,
    expected_line_end: ctx.finding.line_end,
  });
  if (!v.ok) {
    return {
      ok: false,
      finding_id: ctx.finding.id,
      reason: `${producedBy}: patch_invalid:${v.reason}`,
    };
  }

  return {
    ok: true,
    patch: {
      finding_id: ctx.finding.id,
      finding_code: ctx.finding.finding_code,
      file_path: ctx.finding.file_path,
      unified_diff,
      lines_added,
      lines_removed,
      confidence: clampConfidence(parsed.confidence),
      produced_by: producedBy,
    },
  };
}

async function callGateway(
  gateway: LlmGatewayClient,
  args: {
    reviewerId:
      | "optic"
      | "halo"
      | "proof"
      | "compass"
      | "trace"
      | "canon"
      | "jury";
    system: string;
    userMsg: string;
    traceparent?: string;
    signal: AbortSignal;
  },
): Promise<{ text: string }> {
  return gateway.message(
    {
      reviewerId: args.reviewerId,
      system: args.system,
      messages: [{ role: "user", content: args.userMsg }],
      modelClass: "thoughtful",
      ...(args.traceparent && { traceparent: args.traceparent }),
    },
    args.signal,
  );
}

function parseJsonOrFenced(
  text: string,
): { ok: true; replacement_block: string; confidence: number } | { ok: false; reason: string } {
  let raw: FixerJsonResponse;
  try {
    raw = JSON.parse(text) as FixerJsonResponse;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!fenced) return { ok: false, reason: "non_json_response" };
    try {
      raw = JSON.parse(fenced[1] ?? "") as FixerJsonResponse;
    } catch {
      return { ok: false, reason: "non_json_response" };
    }
  }
  if (typeof raw.replacement_block !== "string" || raw.replacement_block.length === 0) {
    return { ok: false, reason: "missing_replacement_block" };
  }
  return {
    ok: true,
    replacement_block: raw.replacement_block,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.5,
  };
}

function clampConfidence(c: number): number {
  if (!Number.isFinite(c)) return 0.5;
  if (c < 0) return 0;
  if (c > 1) return 1;
  return c;
}

/** Re-export so individual fixers can decorate without re-importing. */
export type { Fixer, FixerResult, FixerContext };
