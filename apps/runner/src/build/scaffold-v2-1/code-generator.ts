/**
 * Studio Zero — V2.1 scaffold code generator.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Calls the LLM gateway with brief + scaffold
 * target → returns TS/TSX file contents that replace the template defaults
 * for brief-sensitive files (landing-page hero, README copy, per-feature
 * lib files).
 *
 * Constraint (PRD §11.3 + V1.5 VF3 carry close): every gateway call MUST
 * pass `modelClass` so the gateway can resolve to the pinned model id.
 * NEVER call the gateway without a class. The class is "thoughtful" by
 * default because scaffold copy must be coherent, not fast-and-loose.
 *
 * Failure mode. If the gateway call fails (rate limit, gateway down,
 * model rotation in progress), the generator falls through to the
 * template default — the audit gate will then see a generic scaffold,
 * which is still a deliverable per PRD §7.3 ("template-only scaffold is
 * a valid floor"). This matches the "audit-gate makes the call" rule:
 * the LLM is the optimistic path, the template is the floor.
 */
import type { Brief } from "../v2/types.js";
import type { LlmGatewayClient } from "../../llm-gateway-client.js";
import type { ScaffoldStack } from "./types.js";

export interface CodeGeneratorDeps {
  gateway: LlmGatewayClient;
  /** Per-stack token budget — Penny scaffold-tier cap. */
  maxTokensPerFile?: number;
  /** Optional signal for cancel propagation. */
  signal?: AbortSignal;
}

/** Build a per-file system prompt for the scaffold codegen.
 *  The prompt names the stack, the file path, and the brief signals — the
 *  LLM returns just the file body (no markdown fence; the orchestrator
 *  strips fences defensively in case the model adds them). */
export function buildSystemPrompt(
  stack: ScaffoldStack,
  file_path: string,
): string {
  return [
    "You are Forge, Studio Zero's scaffold-codegen agent.",
    `Stack: ${stack}.`,
    `File to write: ${file_path}.`,
    "Return ONLY the file contents — no markdown fences, no commentary.",
    "Match the existing scaffold's style: TypeScript strict, ES2022 modules,",
    "explicit return types, no any. Inline JSDoc for any exported symbol.",
    "The output will be run through the Studio Zero Jury audit BEFORE delivery,",
    "so prefer accessibility-correct + secure-by-default patterns.",
  ].join("\n");
}

/** Strip a triple-backtick fence the model may have added defensively.
 *  Handles ```ts, ```tsx, ```typescript, ```js, plain ```. */
export function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceStart = /^```(?:ts|tsx|typescript|javascript|js|json)?\s*\n/i;
  const fenceEnd = /\n```\s*$/;
  if (fenceStart.test(trimmed) && fenceEnd.test(trimmed)) {
    return trimmed.replace(fenceStart, "").replace(fenceEnd, "");
  }
  return trimmed;
}

/** Generate one file. Returns the LLM output OR null if the model decided
 *  the default template was already optimal (the prompt explicitly allows
 *  the model to reply "USE_DEFAULT" to skip a file). */
export async function generateOneFile(
  args: {
    brief: Brief;
    stack: ScaffoldStack;
    file_path: string;
    template_hint: string;
  },
  deps: CodeGeneratorDeps,
): Promise<string | null> {
  const { brief, stack, file_path, template_hint } = args;
  const signal = deps.signal ?? new AbortController().signal;
  const system = buildSystemPrompt(stack, file_path);

  const userPrompt = [
    `Project: ${brief.project_name}`,
    `Idea: ${brief.idea_summary ?? ""}`,
    `Audience persona: ${brief.target_audience.persona}`,
    `Primary need: ${brief.target_audience.primary_need}`,
    `JTBD: ${brief.jtbd}`,
    `Success criteria: ${brief.success_criteria.join("; ")}`,
    "",
    "Default template for reference:",
    "```",
    template_hint,
    "```",
    "",
    "Return the brief-tailored file body. If the default is already optimal,",
    "reply exactly: USE_DEFAULT",
  ].join("\n");

  try {
    const resp = await deps.gateway.message(
      {
        reviewerId: "jury",
        system,
        messages: [{ role: "user", content: userPrompt }],
        modelClass: "thoughtful",
        maxTokens: deps.maxTokensPerFile ?? 2048,
      },
      signal,
    );
    const out = stripCodeFence(resp.text);
    if (out === "USE_DEFAULT" || out === "") return null;
    return out;
  } catch {
    // Gateway down / rate limited / mid-rotation — fall through to template default.
    return null;
  }
}

/** Generate every brief-sensitive file for a stack. The orchestrator calls
 *  this once per scaffold and feeds the resulting map into the scaffolder. */
export async function generateBriefSensitiveFiles(
  args: {
    brief: Brief;
    stack: ScaffoldStack;
    /** Which files the orchestrator wants the LLM to attempt — paired with
     *  template hints so the model can compare. */
    targets: Array<{ file_path: string; template_hint: string }>;
  },
  deps: CodeGeneratorDeps,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const t of args.targets) {
    const result = await generateOneFile(
      {
        brief: args.brief,
        stack: args.stack,
        file_path: t.file_path,
        template_hint: t.template_hint,
      },
      deps,
    );
    if (result !== null) out.set(t.file_path, result);
  }
  return out;
}
