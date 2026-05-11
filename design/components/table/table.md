# Table

**Owner:** Canvas · **Status:** shipped · **Implements:** Halo HC3/A3-2 (pricing-table 320 px reflow) + SC 1.3.1 + SC 1.4.10 + Halo "Most popular" badge fix (programmatic, not visual-only)

This is a Phase 4 component specification.

## Purpose
Semantic `<table>` primitive. Two named uses at MVP:
- **Pricing table** (`/pricing`) — 7 SKUs (HB-5); above-fold renders 3 recommended cards, table itself is the full list. Stacks vertically at 320 px.
- **Settings tables** — invoices, paired CLI devices, retention slider rows, etc.

## Anatomy
- `<table>` (semantic — always)
- `<caption>` (visible or `sz-sr-only`)
- `<thead><tr><th scope="col">`
- `<tbody><tr><th scope="row">{key}</th><td>...</td></tr>`
- Optional row badge slot (Halo: "Most popular" is text-content of a `<td>`, never a CSS pseudo-element)
- Optional row action slot (per-row Button)

## Props
| Prop | Type | Notes |
|---|---|---|
| `caption` | string | required (visible or SR-only via `captionVisible=false`) |
| `captionVisible` | boolean | default true |
| `columns` | `{ key, label, scope?:"col", align? }[]` | required |
| `rows` | `{ id, cells, badge?, highlighted? }[]` | required |
| `responsive` | `"stack" \| "scroll"` | default `"stack"` — stack cards at 320 px (SC 1.4.10) |
| `striped` | boolean | adds alternating row background |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | — | rows on `--bg-1`, headers on `--bg-2`, hairlines `--line-1` |
| **hover** (row) | pseudo | row bg `--bg-2` |
| **active** (row click) | pseudo | brightness 0.97 |
| **focus** | focus-within | when row contains focusable controls; row outline 2px `--focus-ring` offset -2px |
| **disabled** | `disabled` | opacity 0.4; pointer-events none |
| **loading** | `loading` | cell shimmer; `aria-busy` on table |
| **error** | `error` | row gets `--sev-blocker-border` left border |
| **highlighted** | `highlighted` row | recommended SKU; carries badge text in cell + `--ink-0` text + `--line-3` border |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** semantic `<table>`, `<th scope>` on every header, `<caption>` present.
  - **1.3.2 Meaningful Sequence:** table reads left-to-right, top-to-bottom; on stack-at-320-px, each row becomes a `<dl>`-shaped card with `<dt>` (column label) + `<dd>` (cell value) so order is preserved (Halo A3-2).
  - **1.4.1 Use of Color:** "Most popular" badge is **text**, not just a colored band. Programmatic per Halo HC7.
  - **1.4.10 Reflow:** at 320 px the table reflows to vertical cards via CSS Grid `auto-flow`; no horizontal scroll.
  - **2.5.8 Target Size:** per-row action buttons ≥ 24×24.
- **Pricing table specifics:**
  - 7 rows; above-fold renders 3 highlighted recommended cards (HB-5 collapse); the full table appears in a "See all plans" disclosure section.
  - "Most popular" appears as a `<td>` value in the *Plan* row of the recommended SKU, with `aria-label` reinforcement.

## Brand-token references
`--bg-1`, `--bg-2`, `--bg-3`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--line-2`, `--line-3`, `--focus-ring`, `--font-sans`, `--font-mono`, `--fs-body`, `--fs-body-sm`, `--fs-mono-meta`, `--sp-*`, `--r`, `--hit-min`.

## Composition rules
- **Wraps:** native `<table>` semantic + Chip/Badge for highlights + Button for per-row actions.
- **Wrapped by:** the surface (pricing page, settings panel).
- **Pixel screen contract:** Pixel composes the table inside a wrap container; Canvas owns the reflow.

## Responsive behavior
- **320px:** rows become vertical cards (`<dt>` + `<dd>` pairs). Headers become labels inside each card.
- **768px:** standard table, may scroll horizontally only if explicitly opted in via `responsive="scroll"`.
- **1280px:** standard table.
