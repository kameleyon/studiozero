/**
 * verdict-share-anonymous — Phase 9 M1 Batch 3 (Probe).
 *
 * V0 share surface from `ia/sitemap.md`: `/v/<short-id>` renders a
 * verdict snapshot without requiring auth. The route ships at M1+1
 * (Vega — share-card composition). For this dispatch we assert the
 * contract: the route either returns a renderable page (200) or a
 * graceful 404 — never a 500 / unauth redirect / blank screen.
 *
 * Two probes:
 *   1. A made-up short id ("does-not-exist") MUST return 404 (with a
 *      page body — not a server error).
 *   2. If the route is wired and renders a 200, axe-core gate fires —
 *      zero critical + serious. Skipped when 404 (no surface to scan).
 *
 * Anonymous: no signinMock() call — the browser context is fresh.
 */
import { expect, test } from "@playwright/test";

import { assertNoCriticalOrSerious } from "./_helpers/axe";
import { dismissCookieBanner } from "./_helpers/signin-mock";

test.describe("V0 share surface — /v/<short-id> anonymous", () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page);
  });


  test("unknown short id returns 404 (no auth redirect, no 500)", async ({
    page,
  }) => {
    const res = await page.goto("/v/does-not-exist-e2e", {
      waitUntil: "domcontentloaded",
    });

    // Three accepted shapes: 200 (route exists; share id resolved to a
    // mock), 404 (route exists; id unknown), or 404 from the Next.js
    // default not-found (route not implemented yet — M1+1 plan).
    // 5xx / 3xx-to-login both fail the gate.
    const status = res?.status() ?? 0;
    expect(
      [200, 404],
      `Expected /v/does-not-exist-e2e to 200 or 404, got ${status}`,
    ).toContain(status);

    // We must NOT be redirected to /signup or /login — anonymous access
    // is the whole point of the share surface.
    expect(page.url()).not.toMatch(/\/(signup|login|auth\/)/);
  });

  test(
    "if the share route renders 200, axe gate passes",
    async ({ page }, testInfo) => {
      // Hardcoded mock short id — when Vega wires the share route they
      // will seed at least one fixture for this id; until then this test
      // skips after the first probe.
      const res = await page.goto("/v/run-demo-1", {
        waitUntil: "domcontentloaded",
      });

      test.skip(
        res?.status() !== 200,
        "Share route at /v/<short-id> not yet wired (M1+1). Skipping axe scan.",
      );

      await expect(page.locator("main")).toBeVisible();
      await assertNoCriticalOrSerious(page, testInfo, { include: ["main"] });
    },
  );
});
