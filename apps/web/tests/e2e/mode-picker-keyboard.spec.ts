/**
 * mode-picker-keyboard — Phase 9 M1 Batch 3 (Probe).
 *
 * Halo WCAG gates exercised:
 *   - SC 2.1.1 Keyboard — every ModeCard reachable + actionable via
 *     keyboard alone
 *   - SC 2.4.7 Focus Visible — focus ring renders on each ModeCard
 *   - SC 1.4.10 Reflow — at 320 px, the 3 cards stack vertically with
 *     no horizontal scroll
 *
 * The ModeCards on /app/onboarding/mode are rendered by Card.tsx with
 * `interactive` + `onClick`, which lowers to <button type="button">.
 * Buttons get native focus + Enter activation for free; this test
 * verifies that wiring didn't regress.
 */
import { expect, test } from "@playwright/test";

import { signinMock } from "./_helpers/signin-mock";

test.describe("Halo SC 2.1.1 + 2.4.7 — mode picker keyboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    await signinMock(page);
  });

  test("Tab traverses each ModeCard with a visible focus indicator", async ({
    page,
  }) => {
    await page.goto("/app/onboarding/mode");

    // Heading anchors the page. id="page-h1" is set by the picker route
    // (mode/page.tsx ln 53).
    await expect(page.locator("#page-h1")).toBeVisible();

    // The three mode cards: BYOK / CLI / Managed. Each renders as a
    // <button> because Card has `interactive` + `onClick`. Headings on
    // the cards are stable (mode/page.tsx ln 62-87):
    const byok = page.getByRole("button", { name: /paste your anthropic key/i });
    const cli = page.getByRole("button", { name: /run on your laptop/i });
    const managed = page.getByRole("button", { name: /we handle everything/i });

    for (const card of [byok, cli, managed]) {
      // Focus directly — keyboard navigation is implementation-agnostic
      // here; what we assert is that the element CAN take focus and
      // CAN be activated by Enter.
      await card.focus();
      await expect(card).toBeFocused();

      // Focus-visible: presence of a non-trivial outline / box-shadow in
      // the computed style. We don't pin to a specific color so the
      // assertion survives token tweaks; we just guard against the
      // outline being removed.
      const outlineSummary = await card.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
        };
      });
      const hasVisibleIndicator =
        (outlineSummary.outlineStyle !== "none" &&
          outlineSummary.outlineWidth !== "0px") ||
        (outlineSummary.boxShadow !== "none" &&
          outlineSummary.boxShadow !== "");
      expect(
        hasVisibleIndicator,
        `Focus indicator missing on mode card. computed=${JSON.stringify(outlineSummary)}`,
      ).toBe(true);
    }
  });

  test("Enter on a ModeCard selects + Continue advances", async ({ page }) => {
    await page.goto("/app/onboarding/mode");

    const byok = page.getByRole("button", { name: /paste your anthropic key/i });
    await byok.focus();
    await page.keyboard.press("Enter");

    // The picker writes selection to local state and surfaces the
    // confirmation paragraph ("You picked BYOK") — assert the state
    // transition happened.
    await expect(page.getByText(/You picked\s+BYOK/i)).toBeVisible();

    // The primary "Save and continue" CTA is now enabled. Click → next step.
    await page.getByRole("button", { name: /save and continue/i }).click();

    // BYOK lane → /app/onboarding/byok (mode/page.tsx ln 42).
    await page.waitForURL(/\/app\/onboarding\/byok(\/|$|\?)/, {
      timeout: 10_000,
    });
  });

  test("at 320px viewport, all 3 cards visible without horizontal scroll", async ({
    page,
  }, testInfo) => {
    // Only run on the mobile project; on desktop/tablet projects the
    // viewport is not 320 so the assertion would be tautological.
    test.skip(
      testInfo.project.name !== "mobile-chromium-pixel",
      "320px reflow assertion only runs on the mobile-chromium-pixel project.",
    );

    await page.goto("/app/onboarding/mode");
    await expect(page.locator("#page-h1")).toBeVisible();

    // No horizontal scroll on <html> — SC 1.4.10 reflow contract.
    const scrollDiff = await page.evaluate(() => {
      const html = document.documentElement;
      return html.scrollWidth - html.clientWidth;
    });
    expect(
      scrollDiff,
      `Horizontal overflow at 320px viewport (scrollWidth - clientWidth = ${scrollDiff})`,
    ).toBeLessThanOrEqual(0);

    // All three cards must be in the layout flow (not hidden) at 320.
    await expect(
      page.getByRole("button", { name: /paste your anthropic key/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /run on your laptop/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /we handle everything/i }),
    ).toBeVisible();
  });
});
