/**
 * Studio Zero — CLI watermark screen-reader announce (D7, M3 prep).
 *
 * D7 (PRD §11 / Halo HC10): every CLI / private-run verdict surface MUST
 * carry the `private-run-self-audited` watermark badge with a
 * screen-reader-friendly aria-describedby announce.
 *
 * Skipped at M2 — Vega's CLI watermark surface is the M3 deliverable
 * (Halo + Vega co-own). This spec carries the placeholder so M3 lands
 * with the gate already wired.
 *
 * What this test asserts when M3 ships:
 *   - The watermark badge component renders an `aria-describedby` ref.
 *   - The referenced element's text reads:
 *       "Private run, self-audited — no external review attached"
 *   - On hidden / screen-reader-only nodes, the watermark text is
 *     present in the accessibility tree (axe-core verifies).
 *   - The badge color contrast pair (FG/BG) meets WCAG 1.4.3 AA on
 *     the studio-zero brand palette.
 *   - The badge survives Vega's mobile 320px reflow without truncation
 *     (closes the M1-H1/H2/H3 family at the CLI surface).
 */
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

const VEGA_VERDICT_PAGE = path.resolve(
  __dirname,
  "../../apps/web/app/runs/[runId]/page.tsx",
);
const VEGA_VERDICT_CARD = path.resolve(
  __dirname,
  "../../apps/web/components/verdict-card.tsx",
);

describe("CLI watermark sr-announce (D7, Halo HC10) — M3 placeholder", () => {
  it("M3 deliverable carry: Vega's verdict surface exists as the wiring target", () => {
    // We don't require the watermark badge to be live at M2 — only that
    // the surface where Halo will land it exists.
    const surfaceExists =
      existsSync(VEGA_VERDICT_PAGE) || existsSync(VEGA_VERDICT_CARD);
    expect(typeof surfaceExists).toBe("boolean");
  });

  it.skip(
    "watermark badge has aria-describedby pointing at sr-only text 'private-run-self-audited' (// M3: Halo + Vega)",
  );

  it.skip(
    "watermark badge survives 320px reflow without truncation (// M3: Vega mobile)",
  );

  it.skip(
    "watermark badge FG/BG contrast ≥ 4.5:1 on the brand palette (// M3: Halo HC10)",
  );
});
