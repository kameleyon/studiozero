/**
 * Studio Zero — Halo fixer (accessibility build agent).
 *
 * Phase 9 V1.5 Batch 1 (Forge). Consumes a single a11y finding (e.g.
 * "form input lacks programmatic label association") and produces a
 * CSS/JSX patch that resolves it — focus rings, contrast tokens, aria
 * attributes, htmlFor pairings, alt text.
 *
 * Cross-refs:
 *   - PRD §14.6 (HC1–HC10 + new WCAG 2.2 SCs in scope)
 *   - architecture/llm-gateway.md (the gateway is the only LLM caller)
 *   - apps/runner/src/build/types.ts (Fixer interface)
 *   - apps/runner/src/build/patch.ts (validatePatch — security boundary)
 *
 * Hard contracts:
 *   - All LLM calls route via the gateway (Cipher Fix-2). The BYOK key
 *     NEVER crosses the runner heap.
 *   - The returned patch is REJECTED by validatePatch() if it touches
 *     any file other than the finding's file_path.
 *   - Confidence is informational; the load-bearing check is the Jury
 *     re-audit gate (Edge Function at supabase/functions/jury-reaudit-gate).
 */
import { runFixerCommon } from "./fixer-runtime.js";
import type { Fixer } from "./types.js";

const HALO_SYSTEM_PROMPT = `You are Halo, the accessibility (WCAG 2.2 AA) build agent for Studio Zero.

You receive a single audit finding about an a11y defect. Your job is to
produce the SMALLEST possible code change that resolves the finding
without introducing new defects.

Rules:
1. Output ONLY a JSON object: { "replacement_block": "<code>", "confidence": 0.0..1.0, "rationale": "<one sentence>" }.
2. "replacement_block" is the exact bytes that will replace lines
   line_start..line_end (inclusive) of the file. Preserve indentation.
3. Do NOT change any line outside [line_start, line_end]. Out-of-scope
   patches are rejected by the validator.
4. Prefer additive fixes (add aria attribute, add htmlFor) over
   restructuring. The audit re-runs after your patch — keep the diff
   tight.
5. WCAG SCs in scope include 1.3.1, 1.4.1, 1.4.3, 1.4.11, 2.4.7, 2.4.11,
   2.4.13, 2.5.7, 2.5.8, 3.3.7, 3.3.8, 4.1.2, 4.1.3.
6. Never emit CRLF; LF only.`;

export const runHaloFixer: Fixer = async (ctx) =>
  runFixerCommon({
    ctx,
    expectedLayer: "accessibility",
    systemPrompt: HALO_SYSTEM_PROMPT,
    producedBy: "halo-fixer",
    reviewerRole: "halo",
  });
