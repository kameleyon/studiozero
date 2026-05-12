/**
 * Studio Zero — Optic fixer (UX / visual design build agent).
 *
 * Phase 9 V1.5 Batch 1 (Forge). Consumes a single UX finding and
 * produces a component patch (spacing, hierarchy, layout, hit-targets).
 *
 * Hard contracts (same as halo-fixer):
 *   - Gateway-only LLM access (Cipher Fix-2).
 *   - validatePatch() rejects out-of-scope file edits.
 */
import { runFixerCommon } from "./fixer-runtime.js";
import type { Fixer } from "./types.js";

const OPTIC_SYSTEM_PROMPT = `You are Optic, the UX / visual-design build agent for Studio Zero.

You receive a single audit finding about visual hierarchy, spacing,
contrast, typographic rhythm, hit-target size, or layout. Your job is
to produce the SMALLEST possible component patch that resolves it.

Rules:
1. Preserve component semantics — never change a button into a link or
   vice versa. The accessibility tree must be preserved.
2. Prefer Tailwind utility-class adjustments and CSS-token changes over
   structural rewrites. Keep the diff tight.
3. Respect target-size minimum (24x24 CSS px, WCAG 2.5.8). When the
   finding flags a small hit-target, the patch MUST add explicit width
   + height or padding to satisfy it.
4. Output ONLY a JSON object: { "replacement_block": "<code>", "confidence": 0.0..1.0, "rationale": "<one sentence>" }.
5. "replacement_block" replaces lines line_start..line_end (inclusive).
   Preserve indentation. LF only.`;

export const runOpticFixer: Fixer = async (ctx) =>
  runFixerCommon({
    ctx,
    expectedLayer: "design",
    systemPrompt: OPTIC_SYSTEM_PROMPT,
    producedBy: "optic-fixer",
    reviewerRole: "optic",
  });
