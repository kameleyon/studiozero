# Chip / Badge

**Owner:** Canvas · **Status:** shipped · **Inherits:** `.chip` / `.hero-status` from template baseline

## Purpose
The token-laden building block. Five named uses share one primitive:
- **Severity chip** — Blocker / Critical / Major / Minor / Polish (per tokens.json§color.severity)
- **Status chip** — `RUNNING`, `FINISHED`, `BLOCKED`, `OFFLINE`, `NOT CONNECTED`, etc. (mono-meta UPPERCASE)
- **Watermark badge** — `Private Run · Self-Audited` (D7 + Halo HC10 `aria-describedby`)
- **Filter chip** — toggleable, used on FindingsRow toolbar
- **Verdict chip** — small inline `FAIL` / `PASS WITH FIXES` / `PASS` (the *big* verdict header lives in `VerdictCard`)

## Anatomy
- Optional leading dot or icon (decorative; never carries info alone — SC 1.4.1).
- Label (mono-meta, UPPERCASE, letter-spacing 0.08em per typography.scale).
- Optional trailing close-X (filter chip).

## Props
| Prop | Type | Notes |
|---|---|---|
| `variant` | `"status" \| "severity" \| "verdict" \| "filter" \| "watermark"` | required |
| `tone` | `"neutral" \| "blocker" \| "critical" \| "major" \| "minor" \| "polish" \| "pass" \| "pass-with-fixes" \| "fail"` | applies per variant |
| `selected` | boolean | filter chip toggle state |
| `dismissible` | boolean | adds the close-X (filter only) |
| `onDismiss` | handler | — |
| `id` | string | needed for watermark `aria-describedby` target |
| `describedBy` | string | watermark links its help-text via this ID (D7 + HC10) |
| `as` | `"span" \| "button"` | filter chips render `<button>`; status chips render `<span>` |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | — | `--bg-3` fill, `--ink-2` text, `--line-1` border (status); severity uses `--sev-*` text+border; verdict uses verdict tokens |
| **hover** | `hover` | only filter+button variants; `--bg-2`→`--bg-3` shift, border `--line-2` |
| **active** | `active` | filter chip pressed: text→`--ink-0`, border→`--ink-2` |
| **focus** | `focus-visible` | 2px solid `--focus-ring`, 2px offset (interactive variants) |
| **disabled** | `disabled` | opacity 0.4; pointer-events none |
| **loading** | `loading` | mono dots animation in label position (status chips) |
| **error** | `error` | border `--sev-blocker-border`; mostly used by status chips reflecting failed runs |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** label is text (never icon-only); decorative dot is `aria-hidden`.
  - **1.4.1 Use of Color:** every state-bearing chip uses *text + color*, never color alone. `OFFLINE` is the word.
  - **1.4.3 Contrast:** all combinations cleared in tokens.json§_contrast_pairs.
  - **2.5.8 Target Size:** filter chips render `<button>` ≥ 24×24 hit area. Static chips have no hit-area requirement (they're not interactive).
  - **3.2.4 Consistent Identification:** verdict chip text matches PRD §7.2 Step D verdict header.
  - **4.1.2 Name, Role, Value:** filter chips use `aria-pressed="true|false"` for toggle state.
- **Watermark variant (D7 + HC10):**
  - Renders as `<span id="…">Private Run · Self-Audited</span>` with paired help-text in a separate element keyed by `aria-describedby` on the verdict heading.
  - Help-text: *"This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device."* (locked per D7).
  - Identical text required across exported reports + PR body (Halo A7-1 + SC 3.2.4).
- **Live-region chip transitions** (e.g., CLI ONLINE→OFFLINE) — see `live-progress-region.md` for the coalescing pattern (Halo A2-2).

## Brand-token references
`--bg-2`, `--bg-3`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--line-2`, `--focus-ring`, `--sev-*-text`, `--sev-*-border`, `--verdict-*`, `--warm`, `--font-mono`, `--fs-mono-meta`, `--r-pill`, `--sp-4`, `--sp-10`, `--hit-min`, `--dur-fast`.

## Composition rules
- **Wraps:** text + (optional) decorative dot.
- **Wrapped by:** any component — Cards, FindingsRow, Nav, EmptyState, VerdictCard.
- **Pixel screen contract:** Pixel composes the watermark Chip into the VerdictCard primary slot via `<VerdictCard watermark={<Chip variant="watermark"/>}>`.

## Responsive behavior
- **320px:** label may shorten via consumer-provided prop; never wraps inside the chip (white-space: nowrap).
- **768px / 1280px:** identical visual; chips never grow in size at larger viewports.
