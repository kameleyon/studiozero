# Verdict-card

**Owner:** Canvas · **Status:** shipped · **Implements:** PRD §7.2 Step D + Halo HC1 (`role="status"` on verdict `<h1>`) + Halo A1-4 (public `/v/<short-id>` parity) + Compass AH-5 (free-tier re-audit chip slot)

This is a Phase 4 component specification.

## Purpose
The verdict surface at the top of `/app/audits/[run-id]` (and at `/v/<short-id>`). Renders verdict line + score + primary CTA above the fold, with the watermark slot for CLI-mode runs and a free-tier re-audit chip slot for Compass AH-5.

## Anatomy (PRD §7.2 Step D order)
1. **Verdict line** — text + icon + color (SC 1.4.1 — never color alone)
   - `<h1 role="status">Audit complete · {VERDICT}</h1>`
2. **Score numeric** — large `serif-stat` italic, e.g. `68 / 100`
3. **Watermark slot** — `<Chip variant="watermark">Private Run · Self-Audited</Chip>` + help-text via `aria-describedby` (D7 + HC10 + SC 3.2.4)
4. **Free-tier chip slot** — `FREE · UNLIMITED RE-AUDITS ON THIS PROJECT` per Compass AH-5
5. **Primary CTA** — single button (HB-7); copy per verdict + SKU:
   - FAIL / PASS WITH FIXES on Surface SKU → "Run the Code audit →"
   - FAIL / PASS WITH FIXES on Code/Full SKU (V1.5) → "Ship the fixes — $49 →"
   - PASS → "Share this verdict →"
6. Below: Score-display (radar + table; see `score-display.md`) and FindingsList.

## Props
| Prop | Type | Notes |
|---|---|---|
| `verdict` | `"PASS" \| "PASS WITH FIXES" \| "FAIL"` | required |
| `score` | number (0..100) | required |
| `scoreBreakdown` | `{ux,accessibility,copy,brand,flow,audience}` | passed through to ScoreDisplay |
| `primaryCta` | ReactNode | typically `<Button variant="primary" size="lg" arrow>` |
| `watermark` | boolean | when true, renders `<Chip variant="watermark">` + helper text (D7) |
| `freeTierChip` | boolean | when true, renders Compass AH-5 chip |
| `findingsCount` | number | used in subhead copy ("We found 14 issues across…") |
| `findingsCategories` | string[] | comma-joined into copy |
| `findingsList` | ReactNode | the FindingsList below the fold |
| `audienceLabel` | string | shows on share view ("Audience: solo founders") |
| `runId` | string | renders as `<code>RUN-{runId}</code>` for support context |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | `verdict` set | rendered card; verdict header colored per verdict tokens |
| **hover** | n/a | verdict header static; CTA owns hover |
| **active** | n/a | — |
| **focus** | focus-visible on CTA | inherited from Button |
| **disabled** | n/a | CTA may be disabled while waiting for re-audit dispatch |
| **loading** | `loading` | header replaced with "Audit in progress…" + per-agent live region (see `live-progress-region.md`); skeleton on score |
| **error** | `error` | replaces verdict with ES-AUDIT-FAILED-IRRECOVERABLY treatment; `role="alert"` on status chip |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.1.1 Non-text Content:** verdict icon paired with text; `alt` not needed because icon is decorative `aria-hidden` (text is the signal).
  - **1.3.1 Info and Relationships:** `<h1 role="status">` is the load-bearing verdict announcement (per Halo A2-1: this is the *one* permitted `role="status"` on an `<h1>` because SPA renders the same URL pre- and post-finalization).
  - **1.4.1 Use of Color:** verdict header is text + icon + color (SC 1.4.1).
  - **1.4.3 Contrast:** verdict bg/text pairs PRD-locked; all clear AA. Watermark text `--ink-2` on `--bg-2` = 6.0:1.
  - **2.4.6 Headings and Labels:** `<h1>` per route; verdict text is the page title.
  - **3.2.4 Consistent Identification:** primary CTA labels match Herald canonical examples.
  - **4.1.3 Status Messages:** `role="status"` on `<h1>` is correct here per HC1; SPA state change is the *only* event needing AT announcement.
- **Watermark D7 + HC10 + SC 3.2.4:** when `watermark=true`, the `<Chip variant="watermark">` carries an `id`, and an adjacent `<p id="…-help">` carries the body *"This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device."*. The verdict `<h1>` gets `aria-describedby="<help-id>"` so SR users hear the watermark caveat with the verdict.
- **Free-tier chip (Compass AH-5):** when `freeTierChip=true`, renders alongside the primary CTA, secondary visual weight, label `FREE · UNLIMITED RE-AUDITS ON THIS PROJECT`. Communicates D2's promise on the surface customers actually see.

## Brand-token references
`--verdict-pass`, `--verdict-pwf`, `--verdict-fail`, `--verdict-on-*`, `--verdict-*-frame`, `--bg-0`, `--bg-1`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--warm`, `--line-1`, `--line-3`, `--font-sans`, `--font-serif`, `--font-mono`, `--fs-display-l`, `--fs-display-m`, `--fs-h-step`, `--fs-body-lg`, `--fs-body`, `--fs-mono-meta`, `--fs-serif-stat`, `--r-card`, `--card-pad`, `--card-pad-mobile`, `--sp-*`.

## Composition rules
- **Wraps:** verdict header + Chip (watermark + free-tier) + Button (primary CTA) + ScoreDisplay + FindingsList slot.
- **Wrapped by:** route shell at `/app/audits/[run-id]` and `/v/<short-id>`.
- **Pixel screen contract:** Pixel composes the page-level layout (background framing, motion gating per usage-rules.md "Verdict screen: minimal motion"). VerdictCard is the load-bearing semantic surface.

## Responsive behavior
- **320px:** verdict header collapses to single-line + chip below; score renders below header; CTA full-width; FindingsList stacks under ScoreDisplay.
- **768px:** verdict + score side-by-side; CTA right-aligned to score; watermark below as a row.
- **1280px:** verdict bordered at full PRD §7.2 visual hierarchy; score + radar on right column; CTA above-fold.
