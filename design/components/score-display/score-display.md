# Score-display

**Owner:** Canvas · **Status:** shipped · **Implements:** PRD §7.2 Step D + SC 1.1.1 (table fallback) + SC 1.3.1 (semantic structure) + Halo HC3 (radar + `<table>` parity)

This is a Phase 4 component specification.

## Purpose
Renders the per-category breakdown of an audit score: a six-spoke radar chart with a semantic `<table>` sibling carrying the same six numbers. SR users hear the table; sighted users see the radar; both can switch via `aria-controls` toggle.

The six categories: **UX**, **Accessibility**, **Copy**, **Brand**, **Flow**, **Audience** (PRD §10).

## Anatomy
- Eyebrow `BREAKDOWN`
- `<table>` (always rendered, hidden from sighted users by default; AT reads it as the primary source)
- Visual radar (SVG; `aria-hidden="true"` — the table is the truth)
- A short text summary below: `<p>Accessibility is the lowest category at 62. Copy is the highest at 91.</p>` (Halo A6-3 — `+19, improved` style; never color-only deltas).
- Toggle: "Show table" / "Show chart" — `<button aria-pressed>` switching visual presentation.

## Props
| Prop | Type | Notes |
|---|---|---|
| `breakdown` | `{ux,accessibility,copy,brand,flow,audience}` | required; 0..100 each |
| `delta` | same shape | optional diff vs prior audit; renders as `+19` with text "improved" |
| `runtime` | `"both" \| "table" \| "radar"` | default `"both"` |
| `summaryText` | string | auto-derived from breakdown if not supplied |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | `both` | radar visible; table hidden visually but in DOM for AT |
| **hover** (toggle) | pseudo | bg `--bg-2` |
| **active** (toggle) | pseudo | filter brightness 0.95 |
| **focus** (toggle) | focus-visible | 2px ring `--focus-ring`, 2px offset |
| **disabled** | `disabled` | rare; renders during loading; opacity 0.4 |
| **loading** | `loading` | radar replaced with skeleton; table cells shimmer; `aria-busy` |
| **error** | `error` | table renders `—` for missing categories; toggle disabled |
| **table-only** | `table` | radar hidden; table visible |
| **radar-only** | `radar` | radar visible; table marked `class="sz-sr-only"` (still readable to AT) |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.1.1 Non-text Content:** the radar is `aria-hidden="true"` because the `<table>` carries the same data semantically; no `alt` needed.
  - **1.3.1 Info and Relationships:** semantic `<table>` with `<caption>`, `<thead><tr><th scope="col">Category</th><th scope="col">Score</th></tr></thead>`, `<tbody>` rows with `<th scope="row">{Category}</th><td>{score}</td>`.
  - **1.4.1 Use of Color:** delta uses text "+19, improved" or "−7, worse" — never green/red arrow alone (Halo A6-3).
  - **1.4.3 Contrast:** all label/data text on `--bg-1` clears AA.
  - **1.4.10 Reflow:** table reflows to vertical card-stack at 320 px per Halo A3-2.
  - **2.4.7 Focus Visible:** toggle has focus ring.
  - **2.5.8 Target Size:** toggle ≥ 24×24.
  - **3.2.4 Consistent Identification:** category names match findings categories (Compass AH-2 primary grouping).

## Brand-token references
`--bg-1`, `--bg-2`, `--bg-3`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--line-2`, `--line-3`, `--focus-ring`, `--font-sans`, `--font-mono`, `--fs-body`, `--fs-body-sm`, `--fs-mono-data`, `--fs-mono-meta`, `--sp-*`, `--r`, `--hit-min`.

## Composition rules
- **Wraps:** SVG radar + `<table>` + `<p>` summary + toggle button.
- **Wrapped by:** VerdictCard.
- **Pixel screen contract:** Pixel positions ScoreDisplay relative to VerdictCard; Canvas owns the chart/table parity.

## Responsive behavior
- **320px:** table is the default visual; toggle to radar swaps; radar is at most 280 px diameter.
- **768px:** both visible side-by-side; radar 360 px.
- **1280px:** both visible; radar 480 px; table on the right column.
