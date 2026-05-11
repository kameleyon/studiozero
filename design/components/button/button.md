# Button

**Owner:** Canvas · **Status:** shipped · **Inherits:** `.btn-primary` / `.btn-ghost` from `project-template/studiozero/project/styles.css`

## Purpose
Single source of truth for every CTA in the product. Replaces ad-hoc anchors and `<div onClick>` patterns. Three semantic variants × three sizes = nine renderings; the JSX surface is `<Button variant="…" size="…">`.

## Anatomy
- Optional leading icon (16/20 px, stroke 1.5)
- Label (sentence case per Herald §7; never trailing period; arrow `→` allowed once per screen)
- Optional trailing arrow (`.btn-arrow`) animated on hover

## Props (JSX)
| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `"primary" \| "ghost" \| "destructive"` | `"primary"` | destructive uses `--focus-ring-emphasis` for SC 2.4.13 |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | sm hit area still ≥ 24×24 via padding |
| `as` | `"button" \| "a"` | `"button"` | semantic HTML; never `<div role="button">` |
| `href` | string | — | only when `as="a"` |
| `disabled` | boolean | `false` | sets `aria-disabled` + `data-state="disabled"` |
| `loading` | boolean | `false` | sets `aria-busy`; spinner replaces leading icon |
| `iconLeft` | ReactNode | — | inline SVG; 16/20/24 px to size |
| `arrow` | boolean | `false` | renders `→` on the trailing edge |
| `onClick` | handler | — | — |

## States (all 6 spec'd, no TBD)
| State | data-state | Visual |
|---|---|---|
| **default** | — | primary: `--ink-0` fill on `--bg-0` text; ghost: transparent fill, `--ink-1` text, `--line-2` border; destructive: transparent fill, `--ink-0` text, `--verdict-fail-frame` border |
| **hover** | `hover` (CSS pseudo) | primary: `--ink-1` fill + `translateY(-1px)`; ghost: `--bg-2` fill, `--ink-2` border; destructive: `--verdict-fail` fill, `--verdict-on-fail` text |
| **active** | `active` (CSS pseudo) | translateY(0); brightness drop via `filter: brightness(0.95)` |
| **focus** | `focus-visible` | 2px solid `--focus-ring` (destructive uses `--focus-ring-emphasis`), `2px` offset — SC 2.4.13 |
| **disabled** | `disabled` (attr) | opacity 0.4; pointer-events: none; `aria-disabled="true"` — never just visual |
| **loading** | `loading` (attr) | label dims to `--ink-2`; spinner mark replaces left icon; `aria-busy="true"`; pointer-events disabled |
| **error** | `data-state="error"` | for verbose forms (e.g., BYOK validate) — ghost shell, `--sev-blocker-text` label, error icon left |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.4.3 Contrast Minimum:** primary text `--bg-0` on `--ink-0` = 18.4:1; ghost text `--ink-1` on `--bg-0` = 13.7:1; destructive on hover `--verdict-on-fail` on `--verdict-fail` ≥ 4.5:1 (Halo Phase 2 verified).
  - **1.4.11 Non-text Contrast:** ghost border `--line-2` 1.4:1 acceptable only as decoration; focus ring 6.8:1 carries the affordance.
  - **2.1.1 Keyboard:** native `<button>` / `<a>` — Space + Enter natively.
  - **2.4.7 Focus Visible:** `:focus-visible` always renders ring.
  - **2.4.13 Focus Appearance:** 2px ring + 2px offset = 4px visible perimeter, ≥3:1 vs adjacent.
  - **2.5.8 Target Size Minimum:** sm = padding 9px 16px (≥ 24×24 hit area); md = 13px 22px; lg = 16px 28px. All clear ≥ 24×24.
  - **3.2.4 Consistent Identification:** the same icon-arrow pair is reused for the same intent everywhere.
  - **4.1.2 Name, Role, Value:** native button has `name`+`role`; `aria-disabled` and `aria-busy` are surfaced.
- **Keyboard map:** Tab focuses; Space/Enter activates (native); Esc never bound to a button (modals use Esc).
- **Role/aria pattern:** prefers `<button type="button">` for action; `<a>` only for navigation. Never `<div role="button">`. Loading button keeps `aria-busy="true"` until response lands; do not steal focus on resolve.

## Brand-token references
`--ink-0`, `--ink-1`, `--ink-2`, `--bg-0`, `--bg-2`, `--line-2`, `--line-3`, `--focus-ring`, `--focus-ring-emphasis`, `--verdict-fail`, `--verdict-fail-frame`, `--verdict-on-fail`, `--font-sans`, `--font-mono`, `--fs-body-sm`, `--sp-*`, `--r-pill`, `--dur-fast`, `--ease`, `--hit-min`.

## Composition rules
- **Wraps:** plain text + optional SVG icon.
- **Wrapped by:** `Form` (submit action), `EmptyState` (primary CTA), `VerdictCard` (primary CTA slot), `ModalRoute` (footer actions), `FindingsRow` (kebab + inline actions).
- **Pixel screen contract:** screens compose `<Button>` directly; never re-style with one-off class names. Screen-level layout owns *position*, Button owns *appearance*.

## Responsive behavior
- **320px:** sm-size becomes default in dense rows (e.g., findings actions). Labels never wrap inside a button — they truncate via `text-overflow: ellipsis` with `max-width: 100%` of the parent.
- **768px:** md default; primary CTA inflates to `min-width: 200px` on verdict screen per Pixel hero spec.
- **1280px:** lg available for hero CTAs; verdict screen primary CTA uses lg.
- All sizes preserve `min-height: var(--hit-min)` (24px) regardless of viewport.
