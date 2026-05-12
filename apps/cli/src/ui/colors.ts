/**
 * Studio Zero — CLI color tokens.
 *
 * Phase 9 M3 Batch 1 (Forge). Brand-aligned terminal palette using
 * picocolors (zero-dep, tty-aware). All ANSI escape codes go through
 * this module so we honor `NO_COLOR` (https://no-color.org/) and the
 * `FORCE_COLOR` overrides without scattering checks.
 *
 * Brand tokens (locked v0.4):
 *   - aqua  (#14C8CC) — PASS / paired / OK
 *   - gold  (#E4C875) — PASS WITH FIXES / warnings
 *   - red   (#C8421A) — FAIL / unpaired / error
 *
 * picocolors maps ANSI 256-color codes; we approximate brand hex with
 * the nearest ANSI tone. The exact hex is only honored by truecolor-
 * capable terminals; the fallback is the closest ANSI 8/16-color.
 */
import pc from "picocolors";

export interface Colorizer {
  pass: (s: string) => string;
  warn: (s: string) => string;
  fail: (s: string) => string;
  info: (s: string) => string;
  dim: (s: string) => string;
  bold: (s: string) => string;
  /** D7 watermark badge — neutral framing per Herald copy lock. */
  watermark: (s: string) => string;
}

/**
 * Construct a colorizer. Honors NO_COLOR + isTTY automatically (picocolors
 * does this internally). The caller decides whether color is appropriate
 * (e.g., we disable colors in test mode).
 */
export function createColors(opts: { color?: boolean } = {}): Colorizer {
  // picocolors auto-detects when not forced. We use the high-level
  // builders so a user setting FORCE_COLOR=0 disables everywhere.
  const enabled = opts.color ?? pc.isColorSupported;
  if (!enabled) {
    const id = (s: string): string => s;
    return {
      pass: id,
      warn: id,
      fail: id,
      info: id,
      dim: id,
      bold: id,
      watermark: id,
    };
  }
  return {
    pass: (s: string) => pc.cyan(s),       // aqua-ish
    warn: (s: string) => pc.yellow(s),     // gold-ish
    fail: (s: string) => pc.red(s),
    info: (s: string) => pc.blue(s),
    dim: (s: string) => pc.dim(s),
    bold: (s: string) => pc.bold(s),
    // Watermark: dim italic-equivalent so it reads as a transparency
    // signal, not an accusation. SC 1.4.1 — text + icon (emitted by
    // caller) so colorblind users see the badge without relying on color.
    watermark: (s: string) => pc.dim(pc.cyan(s)),
  };
}
