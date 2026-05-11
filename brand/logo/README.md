# Studio Zero Logo Files

**Direction A · The Auditor's Notebook · v0.1.1**
**Concept spec:** [`../direction-A/logo-concept.md`](../direction-A/logo-concept.md)

---

## Files in this directory

| File | viewBox | Use |
|---|---|---|
| `mark.svg` | 22×22 | Primary mark (dark). Use in `.nav-inner` and email header chip. |
| `mark-director.svg` | 72×72 (rendered at 56) | BigBrain-only halo variant. Honors `prefers-reduced-motion`. |
| `lockup-horizontal.svg` | 200×28 | Mark + wordmark, dark surface. Uses `fill="currentColor"` for theming. |
| `lockup-horizontal-light.svg` | 200×28 | Light-mode inverted variant for bone-paper / email-light contexts. |
| `favicon.svg` | 32×32 | Modern single-file favicon. Recommended `<link rel="icon" type="image/svg+xml">`. |
| `favicon-16.svg` | 16×16 | Simplified per `logo-concept.md` (solid + dot, no radial gradient). |

## Still to produce (Phase 4 build step)

PNG rasterizations from the SVG sources:

- `favicon-32.png`, `favicon-192.png`, `favicon-512.png` — derived from `favicon.svg` (or `mark.svg` rasterized)
- `favicon.ico` — multi-resolution bundle (16 + 32 + 48 PNG)
- `apple-touch-icon.png` — 180×180 derived from `mark.svg` with safe-area padding
- `og-default.png` — 1200×630 OG card, see spec in `../direction-A/logo-concept.md§OG-image`
- `mark-director.svg` static fallback for AT users when reduced-motion strips the halo animation (currently the animated CSS already collapses to a static halo under `prefers-reduced-motion`; no separate file needed unless image-export pipelines flatten the animation)

These are deferred to Phase 4 visual-design build because they need a rasterization pipeline (sharp, resvg, or design tool).

## SVG implementation notes

- All SVGs use `<title>` and `<desc>` for AT (WCAG 2.2 SC 1.1.1).
- `lockup-horizontal.svg` uses `fill="currentColor"` for the wordmark so theme switching cascades.
- Animations honor `prefers-reduced-motion` per WCAG 2.2 SC 2.3.3 (see `mark-director.svg` inline style).
- No embedded raster, no inline `style="..."` attributes outside the `<style>` element. SVGO level-1 safe.
- Mark renders without webfonts loaded (mark is pure geometry). Wordmark falls back through the system font stack if Geist isn't loaded.

## Trademark clearance

**Not yet cleared.** Comply must run USPTO + EU TMview + WIPO Global Brand DB on:
1. "Studio Zero" wordmark
2. The concentric-circle device (likely conflicts in optics / financial / gaming industries)

Trademark clearance is a Phase 4 exit gate per `../../BUILD_FLOW.md`. Filing decision is Jo's, on Comply's recommendation, before Phase 10 public launch.
