/**
 * axe-core scan wrapper — Phase 9 M1 Batch 3 (Probe).
 *
 * Wraps `@axe-core/playwright` AxeBuilder with the Studio Zero M1 gate
 * contract from `architecture/test-strategy.md` §1 Accessibility row:
 *
 *   "Every primary-flow page renders without `critical` or `serious`
 *    violations at 320 / 768 / 1280 px"
 *
 * Minor + Moderate are tracked but do not gate at M1; the M4 release-gate
 * tightens this to the full set (NVDA + VoiceOver recordings join the
 * automated axe).
 *
 * WCAG 2.2 AA tags enabled. Rule allowlist intentionally empty — we want
 * surprises to surface. Add temporary skips with `.disableRules([...])`
 * at the call site and link the issue/finding in a comment.
 *
 * Returns the raw axe results so specs can attach them to test-info and
 * the html report. The caller asserts on `criticalAndSerious` length.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

import type { Result as AxeResult } from "axe-core";

export interface AxeScanResult {
  violations: AxeResult[];
  criticalAndSerious: AxeResult[];
}

/**
 * Run axe against the current page. M1 gate: zero `critical` + `serious`
 * violations. Attaches the full violations list to the test report so a
 * regression shows the diff between runs.
 *
 * @param page    Playwright page (must already be at the URL under test).
 * @param testInfo  optional — when provided, attaches violations.json to the
 *                  report artifact.
 * @param opts.include  CSS selectors to restrict the scan to (e.g. "main")
 * @param opts.exclude  CSS selectors to skip (e.g. third-party widgets)
 */
export async function runAxe(
  page: Page,
  testInfo?: TestInfo,
  opts: { include?: string[]; exclude?: string[] } = {},
): Promise<AxeScanResult> {
  let builder = new AxeBuilder({ page }).withTags([
    // WCAG 2.2 AA per Halo's M1 conformance contract.
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
    // Best practices Halo cares about (focus-order, link-purpose, etc.).
    "best-practice",
  ]);

  if (opts.include) {
    for (const sel of opts.include) builder = builder.include(sel);
  }
  if (opts.exclude) {
    for (const sel of opts.exclude) builder = builder.exclude(sel);
  }

  const results = await builder.analyze();

  const criticalAndSerious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

  if (testInfo) {
    await testInfo.attach("axe-violations.json", {
      body: JSON.stringify(
        {
          url: page.url(),
          viewport: page.viewportSize(),
          violations: results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            nodes: v.nodes.length,
          })),
          criticalAndSerious: criticalAndSerious.length,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  }

  return { violations: results.violations, criticalAndSerious };
}

/**
 * Assert the M1 gate (zero critical + serious). On fail, surfaces the
 * violation rule ids in the test failure message so triage doesn't need
 * to open the attached JSON.
 */
export async function assertNoCriticalOrSerious(
  page: Page,
  testInfo?: TestInfo,
  opts?: { include?: string[]; exclude?: string[] },
): Promise<void> {
  const { criticalAndSerious } = await runAxe(page, testInfo, opts);
  const ids = criticalAndSerious.map(
    (v) => `${v.id} [${v.impact}] (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`,
  );
  expect(
    criticalAndSerious,
    `axe-core M1 gate — expected 0 critical/serious violations, got ${criticalAndSerious.length}:\n  - ${ids.join("\n  - ")}`,
  ).toHaveLength(0);
}
