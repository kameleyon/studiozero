# Card

**Owner:** Canvas · **Status:** shipped · **Inherits:** `.card` / `.mode` from template baseline

## Purpose
Three semantic card variants. The structural shell is shared (radius 14, border 1px `--line-1`, padding 36 desktop / 24 mobile, `--bg-1` fill). Variants diverge on **content slots**, not chrome:

- **ModeCard** — BYOK / CLI / Managed picker on `/onboarding/mode`. Implements Compass AH-1 fix: human-language primary label + technical eyebrow.
- **ProjectCard** — used in `/app/projects` list. Implements Compass AH-6 fix: indie-agency client-tag chip slot.
- **FindingCard** — severity-tagged finding with reviewer, evidence, recommendation. Compass AH-2 fix: category is primary grouping; reviewer is secondary metadata.

## Anatomy
### ModeCard
- Eyebrow (mono-meta UPPERCASE): technical name *BYOK · USE MY API KEY* (Compass AH-1 dual-label)
- H2 title (human-language primary, e.g. *Use my API key*)
- Body (≤60 words per HB-2 binding)
- Optional "RECOMMENDED" chip (when persona-recommended)
- One CTA (per HB-2: 1 CTA, 1 chip, ≤60 words)

### ProjectCard
- Title row: project name (H3) + optional client-tag chip (AH-6)
- Status chip row: `MODE: BYOK · GITHUB CONNECTED · LAST AUDIT 3 DAYS AGO` (mono-meta)
- Score eyebrow + numeric (when at least one audit exists)
- One CTA → project detail

### FindingCard
- Severity chip (one of Blocker/Critical/Major/Minor/Polish — colored border-text per `--sev-*-*`)
- Category eyebrow + reviewer eyebrow (Compass AH-2: category primary, reviewer secondary)
- Summary (H3, plain English; SC 3.3.1)
- Evidence slot (renders `Evidence` sub-component: file path / line range / contrast ratio / screenshot with `alt`)
- Recommendation block
- Action row: Expand · Copy fix · Dismiss-with-undo · kebab (per HB-6 collapse)

## Props
| Prop | Type | Notes |
|---|---|---|
| `variant` | `"mode" \| "project" \| "finding"` | required |
| `as` | `"article" \| "div" \| "a"` | default `"article"` (semantic) |
| `interactive` | boolean | whole card focusable + clickable (used for ProjectCard) |
| `href` / `onClick` | — | applies when interactive |
| `data-state` | string | hover/active/focus/disabled/error/loading set by interaction |
| variant-specific props | see jsx file | — |

## States (all 6 spec'd, applied to interactive cards)
| State | data-state | Visual |
|---|---|---|
| **default** | — | `--bg-1` fill, `--line-1` border |
| **hover** | `hover` (pseudo) | `--bg-2` fill, `--line-3` border, `translateY(-3px)` over `var(--dur-slow)` |
| **active** | `active` (pseudo) | translateY(0); brightness 0.97 |
| **focus** | `focus-visible` | 2px solid `--focus-ring`, 2px offset; border remains `--line-1` |
| **disabled** | `disabled` (attr) | opacity 0.5; pointer-events none; mode-card `COMING SOON` per HB-2 |
| **loading** | `loading` | skeleton shimmer using `--bg-2` / `--bg-3` gradient; `aria-busy="true"` |
| **error** | `error` (data) | border `--sev-blocker-border`; for FindingCard with disputed evidence |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.1.1 Non-text Content:** FindingCard evidence requires `alt` for screenshot evidence (PRD §9.4 `evidence.alt` mandatory).
  - **1.3.1 Info and Relationships:** card uses `<article>` semantic; H2/H3 hierarchy preserved; severity chip is text + color (not color alone).
  - **1.4.1 Use of Color:** severity is text + border color + (in chip) text color; never color alone.
  - **1.4.3 Contrast:** all chip text/bg pairs cleared in tokens.json §_contrast_pairs.
  - **2.1.1 Keyboard:** interactive cards use `<a>` or `<button>`. Decorative cards are non-interactive `<article>`.
  - **2.4.4 Link Purpose (In Context):** card title carries link purpose; `aria-label` provided when title is ambiguous.
  - **2.5.8 Target Size:** when interactive, entire card surface ≥ 24×24 (always at our card padding); inner actions on FindingCard each ≥ 24×24.
  - **3.2.4 Consistent Identification:** the same chip-and-eyebrow pattern reads identically across variants.
- **Keyboard map (interactive):** Tab focuses card; Enter / Space activates (native via `<a>` / `<button>` wrapping).
- **FindingCard kebab:** `<button aria-haspopup="menu" aria-expanded>` per Halo A3-3 — handled by sub-component (see findings-row.md).

## Brand-token references
`--bg-1`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--line-3`, `--focus-ring`, `--sev-*-text`, `--sev-*-border`, `--font-sans`, `--font-mono`, `--fs-h-card`, `--fs-h-step`, `--fs-body`, `--fs-mono-meta`, `--r-card`, `--card-pad`, `--card-pad-mobile`, `--dur-slow`, `--ease`.

## Composition rules
- **Wraps:** any combination of Chip, Badge, Button, text. Never wraps another Card (no nesting).
- **Wrapped by:** Screen-level grids (CSS Grid columns or `Cards` list).
- **Pixel screen contract:** `<ModeCard>` × 3 lives inside Pixel's onboarding-mode hero. Pixel owns the 3-column grid; Canvas owns the card surface.
- **No drop-shadow** — Direction A is hairline-and-grain (Pixel rule).

## Responsive behavior
- **320px:** single column; padding `--card-pad-mobile` (24px); H2 in ModeCard drops to `--fs-h-step` size for reflow.
- **768px:** ModeCard 2-up; ProjectCard 2-up; FindingCard remains full-row.
- **1280px:** ModeCard 3-up (BYOK / CLI / Managed); ProjectCard 3-up; FindingCard remains full-row inside the findings list grid.
