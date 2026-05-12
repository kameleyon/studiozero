/**
 * a11y-fail-flow — Phase 9 M1 Batch 3 (Probe).
 *
 * Halo + Probe + Pipeline M1 gate from architecture/test-strategy.md §1
 * Accessibility row + sprint/milestone-M1.md exit-gate row "axe-core
 * PR-blocking gate green on every primary-flow page at 320 / 768 / 1280 px
 * — no Critical or Serious violations".
 *
 * Reaches the FAIL verdict screen via the mock state machine (the most
 * dense surface in the app — VerdictCard + ScoreDisplay + FindingsRow ×
 * 14) and runs axe-core. M1 gate fires on `critical` + `serious` only;
 * `moderate` + `minor` are tracked for the M4 release-gate.
 *
 * The desktop project renders at 1280; the mobile-chromium-pixel project
 * renders at 320 (Halo SC 1.4.10 reflow). Both projects execute this
 * spec — that's how we cover the matrix without duplicating files.
 */
import { expect, test } from "@playwright/test";

import { assertNoCriticalOrSerious } from "./_helpers/axe";
import { signinMock } from "./_helpers/signin-mock";

test.describe("Halo M1 a11y gate — verdict screen (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await signinMock(page);
  });

  test("FAIL verdict — zero critical or serious axe violations", async ({
    page,
  }, testInfo) => {
    // run-demo-1 is the deterministic FAIL fixture (mock-data.ts ln
    // 364 — runId not "run-demo-2"/"run-demo-3" → FAIL).
    await page.goto("/app/audits/run-demo-1");

    // Wait for the verdict surface to settle. The h1 carries role=status
    // which promotes over implicit heading role in the a11y tree — so
    // we locate by id (sz-verdict-h1, set in VerdictCard.tsx ln 102).
    const verdictH1 = page.locator("h1#sz-verdict-h1");
    await expect(verdictH1).toBeVisible({ timeout: 30_000 });

    // Belt-and-braces: confirm the findings checklist mounted before we
    // scan — axe needs the full DOM, not the loading state. The
    // findings h2 carries id="findings-h2" (page.tsx ln 290).
    await expect(page.locator("h2#findings-h2")).toBeVisible();

    await assertNoCriticalOrSerious(page, testInfo, {
      // <head> is out of scope for visual a11y; the meta tags carry
      // `ai-generated` and other Comply markers that aren't a Halo
      // concern. Sticking to `main` matches the M0 axe scope.
      include: ["main"],
    });
  });

  test("landing page (logged-out) — zero critical or serious axe violations", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    // The H1 in landing is "The independent audit for AI-built software"
    // per brand/samples/01-landing-h1.md — but to stay decoupled from
    // future copy edits, just wait for *any* h1 in main.
    await expect(page.locator("main h1").first()).toBeVisible();
    await assertNoCriticalOrSerious(page, testInfo, { include: ["main"] });
  });

  test("signup form — zero critical or serious axe violations", async ({
    page,
  }, testInfo) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await assertNoCriticalOrSerious(page, testInfo, { include: ["main"] });
  });
});
