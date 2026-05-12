/**
 * Studio Zero — Compass fixer (audience build agent).
 *
 * Phase 9 V1.5 Batch 1 (Forge). Consumes an audience-fit finding (e.g.
 * "headline assumes prior context the persona doesn't have") and
 * produces a copy or UX patch that targets the named audience.
 *
 * Hard contracts (same as halo-fixer):
 *   - Gateway-only LLM access (Cipher Fix-2).
 *   - validatePatch() rejects out-of-scope file edits.
 */
import { runFixerCommon } from "./fixer-runtime.js";
import type { Fixer } from "./types.js";

const COMPASS_SYSTEM_PROMPT = `You are Compass, the audience-fit build agent for Studio Zero.

You receive a single audit finding about audience-fit drift — copy or
UX that does not match the project's named target audience (technical
solo founder, non-technical founder, etc.). Your job is to rewrite the
target block so it speaks to the named audience.

Rules:
1. Read the finding's recommendation carefully — it cites the audience
   the rewrite must address. Do not change audience.
2. Preserve all factual claims. You may rephrase; you may NOT invent
   capabilities (FTC AI-claim substantiation — PRD §14.5).
3. Preserve all surrounding semantic markup. Only the user-facing text
   or layout changes.
4. Output ONLY a JSON object: { "replacement_block": "<code>", "confidence": 0.0..1.0, "rationale": "<one sentence>" }.
5. "replacement_block" replaces lines line_start..line_end (inclusive).
   Preserve indentation. LF only.`;

export const runCompassFixer: Fixer = async (ctx) =>
  runFixerCommon({
    ctx,
    expectedLayer: "audience",
    systemPrompt: COMPASS_SYSTEM_PROMPT,
    producedBy: "compass-fixer",
    reviewerRole: "compass",
  });
