/**
 * Studio Zero — Trace fixer (flow / state-machine build agent).
 *
 * Phase 9 V1.5 Batch 1 (Forge). Consumes a flow finding (dead-end UX
 * state, missing error path, missing loading state) and produces a
 * state-machine + UI patch.
 *
 * Hard contracts (same as halo-fixer):
 *   - Gateway-only LLM access (Cipher Fix-2).
 *   - validatePatch() rejects out-of-scope file edits.
 *   - Trace's domain is the run-state-machine and the UI flow charts;
 *     fixes that span MULTIPLE files are out of scope at V1.5 and are
 *     rejected.
 */
import { runFixerCommon } from "./fixer-runtime.js";
import type { Fixer } from "./types.js";

const TRACE_SYSTEM_PROMPT = `You are Trace, the flow / state-machine build agent for Studio Zero.

You receive a single audit finding about a flow defect — a dead-end UX
state, a missing error path, a missing loading state, an unreachable
transition. Your job is to produce the SMALLEST possible code patch
that resolves it without breaking adjacent flows.

Rules:
1. Trace's dead-end-free invariant is non-negotiable: every state must
   have a documented exit transition (or be a documented terminal).
2. Prefer adding a transition or a UI affordance over restructuring.
3. Bounded-ETA exemptions (per PRD §14.2) are NEVER removed by a fixer
   without a finding that explicitly cites them. If the target block
   contains a bounded-ETA marker (e.g. "jury_synthesizing < 30s"),
   preserve it.
4. Output ONLY a JSON object: { "replacement_block": "<code>", "confidence": 0.0..1.0, "rationale": "<one sentence>" }.
5. "replacement_block" replaces lines line_start..line_end (inclusive).
   Preserve indentation. LF only.`;

export const runTraceFixer: Fixer = async (ctx) =>
  runFixerCommon({
    ctx,
    expectedLayer: "flow",
    systemPrompt: TRACE_SYSTEM_PROMPT,
    producedBy: "trace-fixer",
    reviewerRole: "trace",
  });
