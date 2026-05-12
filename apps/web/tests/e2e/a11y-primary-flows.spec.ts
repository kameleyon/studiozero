/**
 * Studio Zero — a11y primary-flow axe-core gate (Halo, Phase 9 M1 Batch 3).
 *
 * The PR-blocking accessibility gate for every primary-flow page listed
 * in sprint/milestone-M1.md row 144:
 *
 *   "axe-core PR-blocking gate green on every primary-flow page at
 *    320 / 768 / 1280 px — no Critical or Serious violations."
 *
 * Scope: 12 primary-flow pages × 2 viewports (mobile 320×640 + desktop
 * 1280×720) = 24 scans per run. PRD §14.6 explicitly calls out mobile
 * 320 reflow per SC 1.4.10.
 *
 * Composition with Probe's harness:
 *   - Probe owns playwright.config.ts + the test runner.
 *   - This spec is just `tests/e2e/*.spec.ts` — it picks up Probe's
 *     baseURL, fixtures, and the dev-server `webServer` declaration
 *     automatically.
 *   - All routes are visited in mock mode (apps/web/lib/mock-data.ts);
 *     no real Supabase / Anthropic / pg-boss network calls.
 *
 * Output:
 *   - apps/web/playwright-report/a11y/<page-slug>-<viewport>.json
 *     full axe JSON dump per scan (Pipeline uploads as CI artifact).
 *   - apps/web/playwright-report/a11y/summary.json
 *     aggregate summary written by the suite afterAll hook for the
 *     CI failure annotation step in .github/workflows/ci.yml.
 *
 * Gate semantics (see _helpers/axe-rules.ts):
 *   - critical + serious violations → assertion FAIL (CI red)
 *   - moderate + minor violations  → tracked, not gate-blocking
 *
 * Owner: Halo (this dispatch) → Halo + Access (M2 widening).
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  configureAxe,
  blockingViolations,
  AXE_WCAG_TAGS,
} from "./_helpers/axe-rules";
import { signinMock } from "./_helpers/signin-mock";

// ─── Primary-flow inventory ────────────────────────────────────────────
// Twelve routes that comprise the M1 primary flow. Order mirrors the
// user journey: marketing → signup → app shell → onboarding → first run
// → results → settings → trust pages.
const PRIMARY_FLOW_ROUTES: ReadonlyArray<{
  path: string;
  slug: string;
  /** Whether to drop the mock-session cookie before navigating. */
  authed: boolean;
  why: string;
}> = [
  { path: "/", slug: "landing", authed: false, why: "Marketing entry." },
  { path: "/signup", slug: "signup", authed: false, why: "Goal-1 e2e step 1." },
  { path: "/login", slug: "login", authed: false, why: "Auth surface." },
  { path: "/app", slug: "app-dashboard", authed: true, why: "Dashboard first-run." },
  {
    path: "/app/onboarding/mode",
    slug: "onboarding-mode",
    authed: true,
    why: "IA-D1: mode pick first.",
  },
  {
    path: "/app/onboarding/byok",
    slug: "onboarding-byok",
    authed: true,
    why: "HC5 — API-key paste field.",
  },
  {
    path: "/app/onboarding/github",
    slug: "onboarding-github",
    authed: true,
    why: "GitHub App install step.",
  },
  {
    path: "/app/projects/new",
    slug: "projects-new",
    authed: true,
    why: "Intake 2-step (URL or GitHub).",
  },
  {
    path: "/app/audits/run-demo-fail-1",
    slug: "audit-run-fail",
    authed: true,
    why: "FAIL verdict — HC1 verdict color + HC3 score chart.",
  },
  {
    path: "/app/audits/run-demo-3",
    slug: "audit-run-pwf",
    authed: true,
    why: "PASS WITH FIXES verdict — findings checklist a11y.",
  },
  {
    path: "/app/settings",
    slug: "settings",
    authed: true,
    why: "Account + BYOK mgmt.",
  },
  {
    path: "/accessibility",
    slug: "accessibility-statement",
    authed: false,
    why: "Conformance statement itself must be exemplary.",
  },
  // ─── M5 launch routes (Vega + Forge) ─────────────────────────────
  {
    path: "/pricing",
    slug: "pricing",
    authed: false,
    why: "HC7 pricing table reflow + Herald-locked copy.",
  },
  {
    path: "/audit",
    slug: "audit-explainer",
    authed: false,
    why: "M5 — landing-style explainer for the audit product.",
  },
  {
    path: "/build",
    slug: "build-placeholder",
    authed: false,
    why: "M5 — V2 placeholder + demand-gate signup.",
  },
  {
    path: "/modes",
    slug: "modes-comparison",
    authed: false,
    why: "M5 — BYOK / CLI / Managed comparison table.",
  },
  {
    path: "/blog",
    slug: "blog-index",
    authed: false,
    why: "M5 — blog index with launch post.",
  },
  {
    path: "/blog/why-audit",
    slug: "blog-why-audit",
    authed: false,
    why: "M5 — Herald-locked launch blog post + Article JSON-LD.",
  },
  {
    path: "/dmca",
    slug: "dmca",
    authed: false,
    why: "M5 — DMCA designated agent + takedown procedure.",
  },
];

// ─── Viewports per SC 1.4.10 ───────────────────────────────────────────
// Mobile 320 is the WCAG-mandated reflow check; desktop 1280 is the
// canonical design viewport. Halo composes with Vega's 768 px check
// at M2 — M1 ships 320 + 1280 only to keep the matrix tight.
const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 640 },
  { name: "desktop-1280", width: 1280, height: 720 },
] as const;

const REPORT_DIR = path.join(
  process.cwd(),
  "playwright-report",
  "a11y",
);

interface ScanRecord {
  page: string;
  slug: string;
  viewport: string;
  violations: number;
  blocking: number;
  blockingRules: string[];
  moderateMinorRules: string[];
}

const allScans: ScanRecord[] = [];

test.describe("Halo a11y gate — primary-flow axe-core scans", () => {
  // Halo owns the viewport matrix in-spec (mobile-320 + desktop-1280
  // per SC 1.4.10). Probe's playwright.config.ts ships THREE projects
  // (desktop-chromium, mobile-chromium-pixel, tablet-chromium-ipad);
  // we only run on `desktop-chromium` to avoid 3× duplicate scans and
  // because we re-set `viewportSize` ourselves below.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Halo axe gate owns its own viewport matrix; runs once on desktop-chromium project.",
    );
  });

  test.beforeAll(async () => {
    await mkdir(REPORT_DIR, { recursive: true });
  });

  for (const route of PRIMARY_FLOW_ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route.slug} @ ${vp.name}  (${route.path})`, async ({ page }) => {
        // Set viewport BEFORE navigation so reflow + media queries fire
        // for the initial paint (matters for SC 1.4.10 at 320 px).
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Drop the mock-session cookie for /app/* routes so the layout
        // renders the authed shell instead of redirecting to /login.
        if (route.authed) {
          await signinMock(page);
        }

        await page.goto(route.path, { waitUntil: "networkidle" });

        // Some animated entrance components (LiveProgressRegion, etc.)
        // settle in <500 ms. Wait a beat so axe sees post-mount DOM,
        // not the SSR shell.
        await page.waitForTimeout(500);

        const results = await configureAxe(new AxeBuilder({ page })).analyze();

        const blocking = blockingViolations(results.violations);
        const moderateMinor = results.violations.filter(
          (v) => !blocking.includes(v),
        );

        const record: ScanRecord = {
          page: route.path,
          slug: route.slug,
          viewport: vp.name,
          violations: results.violations.length,
          blocking: blocking.length,
          blockingRules: blocking.map((v) => v.id),
          moderateMinorRules: moderateMinor.map((v) => v.id),
        };
        allScans.push(record);

        // Per-scan JSON dump (Pipeline ships this as CI artifact).
        const fileName = `${route.slug}-${vp.name}.json`;
        await writeFile(
          path.join(REPORT_DIR, fileName),
          JSON.stringify(
            {
              route: route.path,
              viewport: vp,
              tagsScanned: AXE_WCAG_TAGS,
              summary: record,
              fullViolations: results.violations,
              passes: results.passes.length,
              incomplete: results.incomplete.length,
            },
            null,
            2,
          ),
          "utf8",
        );

        // Gate assertion. Critical + serious must be zero.
        // Build a readable failure message so CI annotation is useful
        // without spelunking the artifact.
        const blockingMsg =
          blocking.length === 0
            ? ""
            : "\nBlocking violations:\n" +
              blocking
                .map(
                  (v) =>
                    `  - [${v.impact}] ${v.id}: ${v.help}` +
                    `\n      docs: ${v.helpUrl}` +
                    `\n      nodes: ${v.nodes.length}`,
                )
                .join("\n");

        expect(
          blocking.length,
          `Halo a11y gate FAIL on ${route.path} @ ${vp.name}. ` +
            `${blocking.length} critical/serious axe violation(s).` +
            blockingMsg,
        ).toBe(0);
      });
    }
  }

  test.afterAll(async () => {
    // Aggregate summary written for the CI failure-annotation step.
    const totals = {
      generatedAt: new Date().toISOString(),
      tagsScanned: AXE_WCAG_TAGS,
      pagesScanned: PRIMARY_FLOW_ROUTES.length,
      viewports: VIEWPORTS.map((v) => v.name),
      totalScans: allScans.length,
      totalBlocking: allScans.reduce((s, r) => s + r.blocking, 0),
      totalNonBlocking: allScans.reduce(
        (s, r) => s + (r.violations - r.blocking),
        0,
      ),
      scans: allScans,
    };

    await writeFile(
      path.join(REPORT_DIR, "summary.json"),
      JSON.stringify(totals, null, 2),
      "utf8",
    );
  });
});
