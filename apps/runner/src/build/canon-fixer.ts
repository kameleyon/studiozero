/**
 * Studio Zero — Canon fixer (brand build agent).
 *
 * Phase 9 V1.5 Batch 1 (Forge). Consumes a brand finding (off-brand
 * color, off-brand token, wrong logo asset reference) and produces a
 * token-swap patch.
 *
 * Hard contracts (same as halo-fixer):
 *   - Gateway-only LLM access (Cipher Fix-2).
 *   - validatePatch() rejects out-of-scope file edits.
 *   - Brand token swaps are mechanical: the agent looks up the
 *     canonical token in the project's brand manifest and rewrites the
 *     literal occurrence. We do NOT introduce new tokens here.
 */
import { runFixerCommon } from "./fixer-runtime.js";
import type { Fixer } from "./types.js";

const CANON_SYSTEM_PROMPT = `You are Canon, the brand-token build agent for Studio Zero.

You receive a single audit finding about brand-token drift — a literal
hex color, font family, or asset URL that diverges from the canonical
brand manifest. Your job is to rewrite the target block to use the
canonical token.

Rules:
1. Only mechanical swaps. Do NOT introduce new brand tokens.
2. Preserve all surrounding code — only the off-brand literal changes.
3. If the finding cites Tailwind config or design-token files, prefer
   semantic-token references (var(--brand-primary)) over inline hex.
4. Output ONLY a JSON object: { "replacement_block": "<code>", "confidence": 0.0..1.0, "rationale": "<one sentence>" }.
5. "replacement_block" replaces lines line_start..line_end (inclusive).
   Preserve indentation. LF only.`;

export const runCanonFixer: Fixer = async (ctx) =>
  runFixerCommon({
    ctx,
    expectedLayer: "brand",
    systemPrompt: CANON_SYSTEM_PROMPT,
    producedBy: "canon-fixer",
    reviewerRole: "canon",
  });
