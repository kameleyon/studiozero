/**
 * Studio Zero — axe-core rule configuration (Halo, Phase 9 M1 Batch 3).
 *
 * Single source of truth for which axe-core rules + tags apply to every
 * primary-flow page scan. Composed by `a11y-primary-flows.spec.ts` and
 * any future spec that wants Halo's gate.
 *
 * ─────────────────────────────────────────────────────────────────────
 * Gate rule (PRD §14.6 + brand/direction-A/tokens.json §wcag_2_2_compliance):
 *
 *   Tags enabled : wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice
 *   Impact gate  : critical + serious  → CI FAIL
 *                  moderate + minor    → tracked, not gate-blocking
 *
 * Halo locks the Studio Zero token system so color-contrast and landmark
 * rules MUST stay enabled — they're load-bearing. The only allowance is
 * for `form-field-multiple-labels` if our pattern ever conflicts (none
 * expected today; the entry below documents the seam so a future override
 * is one edit and not a fresh discovery).
 * ─────────────────────────────────────────────────────────────────────
 */
import type { AxeBuilder } from "@axe-core/playwright";

/**
 * The WCAG conformance tags Studio Zero must hit. Halo locks WCAG 2.2 AA
 * (which transitively requires 2.0 AA + 2.1 AA per WAI versioning rules).
 * `best-practice` stays on for moderate/minor surfacing (informational).
 */
export const AXE_WCAG_TAGS: ReadonlyArray<string> = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/**
 * Impact levels that block CI. Halo gate: zero violations of these
 * severities on every primary-flow page. `moderate`/`minor` are tracked
 * in the JSON report and surfaced in the failure summary, but do not
 * fail the build.
 *
 * Source: PRD §14.6 — "axe-core fails CI on Critical + Serious violations".
 */
export const BLOCKING_IMPACTS: ReadonlyArray<string> = ["critical", "serious"];

/**
 * Studio-Zero-specific rule overrides.
 *
 * Format:  ruleId → "enabled" | "disabled" (with a citation comment why).
 *
 * Rules NOT overridden inherit axe-core defaults — meaning they all run.
 *
 * Halo policy:
 *   - `color-contrast` MUST stay enabled. We ship Halo-locked tokens
 *     (brand/direction-A/tokens.json §_contrast_pairs); any contrast
 *     failure is a token bug, not an axe false positive.
 *   - `region` + `landmark-*` MUST stay enabled. Semantic landmark
 *     structure is mandatory per PRD §14.6 HC8.
 *   - `form-field-multiple-labels` — left as default-enabled. If a
 *     legitimate Studio Zero pattern ever conflicts (e.g., a paste-field
 *     with both visible label and visually-hidden helper label), disable
 *     here with an explicit cite + a tracking issue link. None expected
 *     today — the line below is intentionally absent so axe runs the rule.
 */
export const STUDIO_ZERO_RULE_OVERRIDES: Record<
  string,
  { enabled: boolean; reason: string }
> = {
  // color-contrast: DEFAULT-ENABLED. Halo-locked tokens cover all pairs.
  // landmark-one-main, landmark-unique, region: DEFAULT-ENABLED. Mandatory.
  //
  // Example of how to add an exception if ever needed:
  //   "form-field-multiple-labels": {
  //     enabled: false,
  //     reason: "Studio Zero BYOK paste-field uses visible label + sr-only
  //              helper label per HC5; tracked as a pattern-not-violation
  //              in compliance/wcag-audit-engagement-2026.md exceptions list.",
  //   },
};

/**
 * Configure an AxeBuilder instance with Studio Zero's locked-in policy.
 *
 * Usage:
 *   const results = await configureAxe(new AxeBuilder({ page })).analyze();
 */
export function configureAxe<T extends AxeBuilder>(builder: T): T {
  builder.withTags([...AXE_WCAG_TAGS]);

  for (const [ruleId, override] of Object.entries(STUDIO_ZERO_RULE_OVERRIDES)) {
    if (!override.enabled) {
      builder.disableRules([ruleId]);
    }
  }

  return builder;
}

/**
 * Filter axe-core violations down to those that block CI.
 *
 * Used by the spec to assert zero blocking-impact violations; the
 * full violation list (including moderate/minor) still lands in the
 * JSON report for trend tracking.
 */
export function blockingViolations<
  V extends { impact?: string | null | undefined; id: string },
>(violations: ReadonlyArray<V>): ReadonlyArray<V> {
  return violations.filter((v) =>
    BLOCKING_IMPACTS.includes(v.impact ?? "minor"),
  );
}
