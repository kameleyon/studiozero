# Findings-row

**Owner:** Canvas · **Status:** shipped · **Implements:** HB-6 (3 visible + kebab), Compass AH-2 (category primary), Halo A3-3 (ARIA menu), SC 2.5.7 (keyboard reorder).

This file is a Phase 4 component spec, not a report.

## Purpose
Row primitive used in the findings list at `/app/audits/[run-id]/findings`. Visible row actions: Expand evidence, Copy fix, Dismiss (with undo). Kebab menu items: Share, Dispute, Move to category, Reorder up/down.

## Anatomy
- Leading severity chip (`Chip variant="severity"`)
- Category chip (primary group per Compass AH-2)
- Summary (truncatable)
- Reviewer eyebrow (secondary)
- Actions: Expand, Copy fix, Dismiss, kebab
- Expanded slot: Evidence + Recommendation

## Props
`id`, `severity`, `category`, `reviewer`, `summary`, `evidence`, `recommendation`, `expanded`, `onExpandToggle`, `onCopyFix`, `onDismiss`, `onShare`, `onDispute`, `onMoveCategory`, `onReorder(dir)`, `dismissed`.

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| default | — | bg `--bg-1`, border-bottom `--line-1` |
| hover | pseudo | bg `--bg-2`, border `--line-2` |
| active | pseudo | brightness 0.97 |
| focus | focus-within | outline 2px `--focus-ring`, offset -2px |
| disabled | dismissed | opacity 0.55, summary line-through |
| loading | loading | shimmer on summary |
| error | error | left border 2px `--sev-blocker-border` |
| expanded | expanded | row grows; evidence visible |

## A11y notes
- 1.1.1: screenshot evidence requires `alt`.
- 1.3.1: `<li>` inside `<ul>`; `<h3>` summary.
- 1.4.1: severity = chip text + color, never color alone.
- 2.1.1: all actions are `<button>`.
- 2.4.3: focus order severity → summary → expand → copy → dismiss → kebab.
- 2.4.7: focus ring on every action.
- 2.5.7: Alt+ArrowUp/Down reorders focused row; menu has Move up/down items.
- 2.5.8: every action and the kebab ≥ 24×24.
- 3.2.4: action labels consistent with detail page.
- 4.1.2: kebab `<button aria-haspopup="menu" aria-expanded>`; items `role="menuitem"`; ArrowUp/Down/Home/End nav; Esc closes and returns focus to kebab.

## Brand-token references
`--bg-1`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--line-2`, `--focus-ring`, `--sev-*-text`, `--sev-*-border`, `--font-sans`, `--font-mono`, `--fs-body`, `--fs-mono-meta`, `--sp-*`, `--r`, `--hit-min`, `--dur-fast`.

## Composition rules
- Wraps: Chip, Button, Evidence, Recommendation.
- Wrapped by: FindingsList (owns toolbar HB-6a + grouping per Compass AH-2).
- Pixel contract: Pixel composes the list grid; Canvas owns row internals.

## Responsive behavior
- 320 px: action labels become aria-only on icon-tight buttons; grid collapses to single column; menu repositions to left.
- 768 px: labels return.
- 1280 px: full row with all labels + kebab.
