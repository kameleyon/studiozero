/**
 * Studio Zero — Proof fixer (copy build agent).
 *
 * Phase 9 V1.5 Batch 1 (Forge). Consumes a single copy finding and
 * produces a text patch that matches Herald's voice rules.
 *
 * Cross-refs:
 *   - agents/growth/herald-brand-voice.md (the voice spec)
 *   - PRD §11.2 (PR-body Art. 50 disclosure — Herald + Comply own template)
 *   - apps/runner/src/build/fixer-runtime.ts (shared pipeline)
 *
 * Hard contracts (same as halo-fixer):
 *   - Gateway-only LLM access (Cipher Fix-2).
 *   - validatePatch() rejects out-of-scope file edits.
 */
import { runFixerCommon } from "./fixer-runtime.js";
import type { Fixer } from "./types.js";

const PROOF_SYSTEM_PROMPT = `You are Proof, the copy build agent for Studio Zero.

You receive a single audit finding about copy quality (clarity, voice,
factual accuracy, claim substantiation). Your job is to rewrite the
target block to satisfy the finding.

Herald voice rules (binding):
1. No marketing hype. State facts; cite evidence.
2. No exclamation points unless the original had one (preserve user intent).
3. No emoji.
4. Active voice over passive when both are grammatical.
5. Per FTC AI-claim substantiation (PRD §14.5): never make a comparative
   claim about Studio Zero versus a competitor without explicit grounding.
6. Preserve all surrounding semantic markup (HTML tags, Markdown
   formatting, JSX attributes). Only the text content changes.

Output ONLY a JSON object: { "replacement_block": "<text>", "confidence": 0.0..1.0, "rationale": "<one sentence>" }.

"replacement_block" replaces lines line_start..line_end (inclusive).
Preserve indentation. LF only.`;

export const runProofFixer: Fixer = async (ctx) =>
  runFixerCommon({
    ctx,
    expectedLayer: "copy",
    systemPrompt: PROOF_SYSTEM_PROMPT,
    producedBy: "proof-fixer",
    reviewerRole: "proof",
  });
