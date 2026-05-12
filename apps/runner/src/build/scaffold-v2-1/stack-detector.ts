/**
 * Studio Zero — V2.1 scaffold stack detector.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Reads the brief + the Sprint+Axiom layer
 * recommendations and picks the scaffold stack that best matches.
 *
 * Heuristics (priority order):
 *   1. Brief.target_audience.persona + jtbd mentions of "B2B SaaS",
 *      "subscriptions", "dashboard" → nextjs-saas.
 *   2. Brief.idea_summary + must_have_features mentions of "API",
 *      "background job", "worker", "ETL" → nodejs-worker.
 *   3. Brief.idea_summary mentions "CLI", "command-line", "binary",
 *      "shell tool" → cli-tool.
 *   4. Default: nextjs-saas (covers the majority of indie-founder briefs).
 *
 * Sprint+Axiom recommendations override #1-3 when the strategy LayerOutput
 * names a stack explicitly via the `recommended_stack` tag in its summary.
 *
 * Output: a `StackRecommendation` with confidence + rationale. The web
 * client surfaces these to the customer; if confidence < 0.6, we add an
 * "Are we right?" gate before generation begins (PRD §7.3 hard rule —
 * customer-attested intent before delivery).
 */
import type { Brief } from "../v2/types.js";
import type { ScaffoldStack, StackRecommendation } from "./types.js";

const SAAS_SIGNALS: ReadonlyArray<RegExp> = [
  /\bSaaS\b/i,
  /\bdashboard\b/i,
  /\bsubscription\b/i,
  /\bb2b\b/i,
  /\bmulti[- ]?tenant\b/i,
  /\bstripe\b/i,
  /\bnext\.?js\b/i,
];

const WORKER_SIGNALS: ReadonlyArray<RegExp> = [
  /\bworker\b/i,
  /\bbackground\s+job\b/i,
  /\bcron\b/i,
  /\betl\b/i,
  /\bingest(?:ion)?\b/i,
  /\bpipeline\b/i,
  /\bbatch\b/i,
];

const CLI_SIGNALS: ReadonlyArray<RegExp> = [
  /\bcli\b/i,
  /\bcommand[- ]?line\b/i,
  /\bnpx\s+\w+/i,
  /\bbin(?:ary)?\b/i,
  /\bshell\s+tool\b/i,
  /\bterminal\b/i,
];

function score(text: string, signals: ReadonlyArray<RegExp>): {
  hits: number;
  matches: string[];
} {
  const matches: string[] = [];
  let hits = 0;
  for (const re of signals) {
    if (re.test(text)) {
      hits += 1;
      matches.push(re.toString());
    }
  }
  return { hits, matches };
}

/** Compose the searchable haystack from the brief. */
function briefText(brief: Brief): string {
  return [
    brief.idea_summary ?? "",
    brief.jtbd,
    brief.target_audience.persona,
    brief.target_audience.primary_need,
    brief.target_audience.pain_point,
    (brief.constraints?.must_have_features ?? []).join(" "),
    (brief.vibe?.adjectives ?? []).join(" "),
    brief.team_roster.join(" "),
  ].join("\n");
}

/** Pick the scaffold stack that best matches the brief.
 *  Sprint+Axiom hints (optional override) take precedence when present. */
export function recommendStack(
  brief: Brief,
  hints?: { sprint_recommended_stack?: ScaffoldStack | null },
): StackRecommendation {
  // Sprint+Axiom explicit override.
  if (hints?.sprint_recommended_stack) {
    return {
      stack: hints.sprint_recommended_stack,
      confidence: 1.0,
      rationale: [
        `Sprint+Axiom strategy layer recommended ${hints.sprint_recommended_stack} for this brief.`,
      ],
      alternates: alternatesFor(hints.sprint_recommended_stack),
    };
  }

  const text = briefText(brief);
  const saas = score(text, SAAS_SIGNALS);
  const worker = score(text, WORKER_SIGNALS);
  const cli = score(text, CLI_SIGNALS);

  // Default tilt: nextjs-saas wins ties (V2.1 Batch 1 assumption — most
  // indie-founder briefs are consumer SaaS). Future Batch 2 retunes with
  // adoption telemetry from Hook.
  const ranked: Array<{
    stack: ScaffoldStack;
    hits: number;
    matches: string[];
  }> = [
    { stack: "nextjs-saas", hits: saas.hits, matches: saas.matches },
    { stack: "nodejs-worker", hits: worker.hits, matches: worker.matches },
    { stack: "cli-tool", hits: cli.hits, matches: cli.matches },
  ];
  ranked.sort((a, b) => b.hits - a.hits);

  const top = ranked[0]!;
  const totalSignals = saas.hits + worker.hits + cli.hits;
  // Confidence formula:
  //   - 0 signals = 0.4 (fallback default — show "Are we right?" gate)
  //   - 1 signal  = 0.6
  //   - 2 signals = 0.75
  //   - 3+        = 0.85 capped — never claim 1.0 from heuristics alone.
  let confidence: number;
  if (top.hits === 0) confidence = 0.4;
  else if (top.hits === 1) confidence = 0.6;
  else if (top.hits === 2) confidence = 0.75;
  else confidence = 0.85;

  const rationale: string[] = [];
  if (top.hits > 0) {
    rationale.push(
      `Brief signals matching ${top.stack}: ${top.hits} (of ${SAAS_SIGNALS.length + WORKER_SIGNALS.length + CLI_SIGNALS.length} total patterns scanned).`,
    );
  } else {
    rationale.push(
      "No strong signals; defaulting to nextjs-saas (V2.1 Batch 1 fallback). Customer is asked to confirm before generation.",
    );
  }
  if (totalSignals >= 2 && top.hits === ranked[1]!.hits) {
    rationale.push(
      `Stack picks tied at ${top.hits} signals; tilted to ${top.stack} per V2.1 default.`,
    );
  }

  return {
    stack: top.stack,
    confidence,
    rationale,
    alternates: alternatesFor(top.stack),
  };
}

function alternatesFor(stack: ScaffoldStack): ScaffoldStack[] {
  const all: ScaffoldStack[] = ["nextjs-saas", "nodejs-worker", "cli-tool"];
  return all.filter((s) => s !== stack);
}
