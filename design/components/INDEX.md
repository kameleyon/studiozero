# Studio Zero — Component Library Manifest

**Owner:** Canvas · **Phase:** 4 · **Version:** v0.1 · **Date:** 2026-05-11
**Brand:** Direction A v0.1.1 (locked) · **Tokens:** `_tokens/tokens.css` (import in every component CSS)

This file is a Phase 4 deliverable manifest, not a session report.

---

## Hard constraints (Canon enforces)
- Every component CSS imports `../_tokens/tokens.css` and references variables only — **no hardcoded hex, no off-grid spacing**.
- Every component ships all 6 states (default / hover / active / focus / disabled / loading / error) — no `TBD`.
- Every component cites the WCAG 2.2 SCs it satisfies in its `.md`.
- Every component prefers semantic HTML (`<button>`, `<a>`, `<table>`, `<dialog>`) — never `<div role="…">` where a primitive exists.

---

## Components (priority order — ship in this order if time-constrained)

| # | Name | Import path | Status | One-liner | A11y test note |
|---|---|---|---|---|---|
| 1 | **Button** | `design/components/button/button.jsx` | shipped | 3 variants × 3 sizes; min 24×24 hit area per SC 2.5.8 | axe-core rule: button-name + color-contrast; focus-visible ring on Tab |
| 2 | **Input** | `design/components/input/input.jsx` | shipped | text / password / textarea / select; BYOK slot with SC 3.3.8 show/hide; `aria-describedby` for helper + error | axe-core: label + aria-invalid + autocomplete; paste-test for BYOK |
| 3 | **Card** | `design/components/card/card.jsx` | shipped | ModeCard (Compass AH-1 dual-label) + ProjectCard (AH-6 client tag) + FindingCard (AH-2 category primary) | axe-core: heading-order, region, link-name; alt enforced on screenshot evidence |
| 4 | **Chip / Badge** | `design/components/chip/chip.jsx` | shipped | status / severity / verdict / filter / watermark; D7 + HC10 `aria-describedby` paired text | axe-core: aria-pressed for filter; manual NVDA on watermark describedBy |
| 5 | **Nav** | `design/components/nav/nav.jsx` | shipped | Sticky top nav, mode-aware right cluster, skip-to-content link as first focusable element | axe-core: landmark-one-main, region, skip-link; manual: keyboard-only walkthrough |
| 6 | **Sidebar** | `design/components/sidebar/sidebar.jsx` | shipped | 4-item authed-app primary nav per HB-9a (Projects / Audits / Settings / Help) with `aria-current="page"` | axe-core: aria-current-valid; manual: roving Tab + Enter |
| 7 | **Modal-as-route** | `design/components/modal-route/modal-route.jsx` | shipped | Critical Halo A1-1 fix: focus return on close, route-back SR announcement, focus trap, scroll-padding for SC 2.4.11 | axe-core: dialog-name, aria-modal; manual NVDA: open→close announces "navigated back to {parent}" |
| 8 | **Findings-row** | `design/components/findings-row/findings-row.jsx` | shipped | HB-6 collapse (3 + kebab), Halo A3-3 ARIA menu, SC 2.5.7 keyboard reorder (Alt+↑/↓) | axe-core: button-name, aria-expanded; manual: Alt+arrows + kebab menu nav |
| 9 | **Verdict-card** | `design/components/verdict-card/verdict-card.jsx` | shipped | PRD §7.2 Step D: text+icon+color (SC 1.4.1), `role="status"` on `<h1>` (HC1), watermark slot + free-tier chip slot | axe-core: heading-order, status-role; manual NVDA: SPA state-change announcement |
| 10 | **Score-display** | `design/components/score-display/score-display.jsx` | shipped | Radar SVG (`aria-hidden`) + semantic `<table>` parity (HC3, SC 1.1.1, SC 1.3.1) + text summary (Halo A6-3) | axe-core: table-fake, td-headers-attr; manual: chart vs table toggle |
| 11 | **Live-progress-region** | `design/components/live-progress-region/live-progress-region.jsx` | shipped | Halo A2-2: ONE coalesced `aria-live="polite"` region, 250 ms trailing debounce, ≤ 4/sec throttle | axe-core: aria-live; manual NVDA: confirm no firehose with 6 reviewers running |
| 12 | **Table** | `design/components/table/table.jsx` | shipped | Semantic `<table>` with `<th scope>`, "Most popular" programmatic badge (HC7), 320 px stack-reflow (SC 1.4.10) | axe-core: th-has-data-cells, table-fake, scope-attr-valid |
| 13 | **Form** | `design/components/form/form.jsx` | shipped | Wraps Input + Label + Error + Helper; honors SC 3.3.7 priorValues seed; error summary focus on submit failure | axe-core: label, form-field-multiple-labels; manual: submit invalid → error summary focused |
| 14 | **Empty-state** | `design/components/empty-state/empty-state.jsx` | shipped | One template for every IA-enumerated empty state; copy via props; `role="alert"` only for assertive errors | axe-core: heading-order; manual: 12 IA empty-state copy renders |

**Plus** shared token bundle at `design/components/_tokens/tokens.css` — every component CSS imports this. Drift-detection lives here.

---

## Phase-4 binding fixes embedded across the library

| Fix | Source | Component(s) |
|---|---|---|
| **Halo A1-1** modal-route focus return | Critical | `modal-route` (open: focus to H2; close: focus to triggerRef + SR announce parent route via `aria-live="polite"`) |
| **Halo A2-1** `role="status"` discipline | Critical | `empty-state` (no role=status), `verdict-card` (one allowed — `<h1 role="status">` for SPA state change), `modal-route` (no role=status) |
| **Halo A2-2** live-region coalescing | Major | `live-progress-region` (single wrapper region, 250 ms trailing debounce, ≤4/sec) |
| **Halo A3-3** kebab as ARIA menu | Major | `findings-row` (`aria-haspopup="menu"`, `aria-expanded`, ArrowUp/Down/Home/End/Esc) |
| **Halo HC3** radar + table parity | Major | `score-display` (radar `aria-hidden`, `<table>` is truth) |
| **Halo HC7** "Most popular" programmatic | Major | `table` (`__badge` is a `<td>` text + `aria-label`, never a CSS pseudo-element) |
| **Halo HC5 / SC 3.3.8** BYOK paste | Major | `input` (revealable, autoComplete=off, no CAPTCHA constraint surfaced to consumer) |
| **Halo HC10 / SC 3.2.4** watermark text identity | Major | `chip` (watermark variant + `ChipHelperText` pair via `aria-describedby`) |
| **SC 2.5.7** non-drag reorder | Major | `findings-row` (Alt+↑/↓ when row focused; kebab "Move up/down") |
| **SC 2.4.13** focus ring spec | Major | all interactive components reference `--focus-ring` / `--focus-ring-emphasis` |
| **SC 2.4.11** focus not obscured | Major | `tokens.css` sets `html { scroll-padding-top: 80px }`; `modal-route` honors via scroll restoration |
| **SC 1.4.10** 320 px reflow | Major | `table` (`stack` mode), `findings-row` (grid collapse), `verdict-card` (vertical row stack) |
| **Compass AH-1** mode picker human label | Major | `card.ModeCard` (technicalLabel eyebrow + humanLabel H2) |
| **Compass AH-2** category primary grouping | Major | `findings-row` + `card.FindingCard` (category before reviewer) |
| **Compass AH-5** free-tier re-audit chip | Major | `verdict-card` (`freeTierChip` prop) |
| **Compass AH-6** indie-agency client tag | Major | `card.ProjectCard` (`clientTag` slot) |

---

## Coordination contract with Pixel (hero-screens parallel work)

Pixel owns the 5 hero screens; Canvas owns the 14 components. The contract is:

1. **Screens compose components; never bypass.** Pixel imports `<Button>`, `<VerdictCard>`, etc. — no one-off `<div className="my-button">`. If a screen needs a primitive not in this manifest, escalate to Canvas before shipping a one-off.
2. **Slot, don't restyle.** Components expose slots (`primaryCta`, `actions`, `iconLeft`, `evidence`, `findingsList`). Pixel fills slots with content; Canvas owns appearance.
3. **Token discipline goes both ways.** Pixel's screen CSS may compose, but every value must reference `--*` from `_tokens/tokens.css`. Canon's drift detector treats screen CSS the same as component CSS.
4. **Brand-token additions go to Canvas first.** If Pixel needs a token that doesn't exist, escalate; Canvas + Pixel + Canon co-decide and update `brand/direction-A/tokens.json` + `_tokens/tokens.css` together. Versioned bump.

---

## Self-verdict per component

| # | Component | All 6 states? | All relevant SCs cited? |
|---|---|---|---|
| 1 | Button | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.4.3, 1.4.11, 2.1.1, 2.4.7, 2.4.13, 2.5.8, 3.2.4, 4.1.2 |
| 2 | Input | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.3.1, 1.3.5, 1.4.3, 1.4.11, 2.1.1, 2.4.7, 2.5.8, 3.3.1, 3.3.2, 3.3.7, 3.3.8 |
| 3 | Card | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.1.1, 1.3.1, 1.4.1, 1.4.3, 2.1.1, 2.4.4, 2.5.8, 3.2.4 |
| 4 | Chip | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.3.1, 1.4.1, 1.4.3, 2.5.8, 3.2.4, 4.1.2 |
| 5 | Nav | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.3.1, 1.4.3, 2.1.1, 2.4.1, 2.4.4, 2.4.11, 2.5.8, 3.2.3 |
| 6 | Sidebar | ✅ default · hover · active · focus · disabled · loading · error · current | ✅ 1.3.1, 2.1.1, 2.4.1, 2.4.4, 2.4.7, 2.4.11, 2.5.8, 3.2.3 |
| 7 | Modal-as-route | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.3.1, 1.4.10, 1.4.11, 2.1.2, 2.4.3, 2.4.11, 2.4.13, 2.5.8, 4.1.3 |
| 8 | Findings-row | ✅ default · hover · active · focus-within · disabled · loading · error · expanded | ✅ 1.1.1, 1.3.1, 1.4.1, 2.1.1, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 3.2.4, 4.1.2 |
| 9 | Verdict-card | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.1.1, 1.3.1, 1.4.1, 1.4.3, 2.4.6, 3.2.4, 4.1.3 |
| 10 | Score-display | ✅ default · hover · active · focus · disabled · loading · error · table-only · radar-only | ✅ 1.1.1, 1.3.1, 1.4.1, 1.4.3, 1.4.10, 2.4.7, 2.5.8, 3.2.4 |
| 11 | Live-progress-region | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.3.1, 1.4.1, 2.2.1, 2.3.3, 4.1.3 |
| 12 | Table | ✅ default · hover · active · focus · disabled · loading · error · highlighted | ✅ 1.3.1, 1.3.2, 1.4.1, 1.4.10, 2.5.8 |
| 13 | Form | ✅ default · hover · active · focus · disabled · loading · error · success | ✅ 1.3.1, 1.3.5, 2.4.3, 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.7, 3.3.8 |
| 14 | Empty-state | ✅ default · hover · active · focus · disabled · loading · error | ✅ 1.3.1, 1.4.1, 2.4.1, 2.4.6, 2.4.7, 2.5.8, 3.2.3, 4.1.3 |

**Library verdict (Canvas, self-audit):** 14 / 14 components ship all 6 states + cite every relevant WCAG 2.2 SC.

---

*End of INDEX v0.1. Canvas — Design Layer.*
