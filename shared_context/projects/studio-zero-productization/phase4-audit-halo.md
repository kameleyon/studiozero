# Phase 4 Audit — Halo (Independent Accessibility Reviewer)

**Auditor:** Halo
**Phase:** BUILD_FLOW Phase 4 — Brand & Component Build (WCAG 2.2 AA conformance pass)
**Standard:** WCAG 2.2 Level AA (PRD §14.6 + HC1–HC10 + Halo Phase 2 SC commitments + Phase 3 binding fixes)
**Subject:** Canvas's 14 components + Pixel's 5 hero screens + the joint `motion.md`
**Date:** 2026-05-11
**Phase-4 exit gate (BUILD_FLOW.md):** *WCAG 2.2 AA on every component AND every screen, including new SCs 2.4.11 / 2.4.13 / 2.5.7 / 2.5.8 / 3.3.7 / 3.3.8; 320 CSS px reflow per SC 1.4.10; 24×24 target size per SC 2.5.8.*
**Prior verdicts:** v0.3 FAIL → v0.4 PASS WITH FIXES → Phase 2 PASS WITH FIXES → Phase 3 PASS WITH FIXES (15 binding fixes issued).

---

## TL;DR verdict

**PASS WITH FIXES.**

Canvas's 14 components materially closed the Phase 3 fixes I asked for. The big three are *actually* closed:

- **A1-1 modal-route focus return** is implemented end-to-end in `modal-route.jsx` (open→H2, close→trigger, fallback to parent `<h1>`, SR announce via `aria-live="polite"`, Esc + X + backdrop close, focus-trap with Tab wrap).
- **A2-1 `role="status"` discipline at the component layer** is held: verdict-card uses it on the `<h1>` (the single permitted case), live-progress-region renders a `<div aria-live="polite">` (not `role="status"`), empty-state uses `role="alert"` only when `assertive=true`, modal-route doesn't use it. Component layer is clean.
- **A2-2 live-region coalescing** is implemented: one wrapper region, 250ms trailing debounce in `useEffect`, message-deduplication via `lastMessageRef`. The throttle floor (≤4/sec) is met.

But **screen-layer discipline has drifted** in two places that re-open A2-1 at the surface I was most worried about. And **one Critical implementation gap** in `findings-row.jsx` makes the Alt+↑/↓ keyboard reorder I locked in Phase 3 (SC 2.5.7) effectively unreachable by keyboard alone. Three more Major findings on the screen layer. Pixel needs a tightening pass; Canvas needs one targeted code fix on findings-row.

**Halo does NOT block Phase 4 exit** — the remediations are 1-component-line + 4-screen-line edits, no structural rework. But the gate is **PASS WITH FIXES, binding before Phase 5 implementation**.

---

## Phase 3 fix-closure ledger (binding-list verification)

| Phase-3 fix | Surface | Status | Evidence |
|---|---|---|---|
| **A1-1** Modal-route focus return | `modal-route.jsx` L31–94 | **CLOSED** | `titleRef.current?.focus()` on open (L35); `history.replaceState` stores `sz_modal_trigger` (L40); `handleClose()` publishes `aria-live="polite"` "Navigated back to {parentLabel}" (L72–80) then focuses `triggerRef.current` or `main h1` (L84–91); Esc handler L57–68; focus-trap L97–112; X button `aria-label="Close"` L143–151; backdrop click L129. |
| **A2-1** `role="status"` discipline at component layer | all 14 `*.jsx` | **CLOSED at component layer; PARTIALLY OPEN at screen layer** | Component grep: `role="status"` appears only in `verdict-card.jsx` (L44 loading state `<h1>`, L59 default state `<h1>`). No other component uses it. `empty-state.jsx` correctly uses `role="alert"` (L37, only when `assertive=true`). Form uses `role="alert"` for error summary (transient, correct). **However** `intake-2step.jsx` L321 applies `role="status"` to a non-transient warning banner, and `dashboard-first-run.md` L134 specs a Mode chip with `role="status" aria-live="polite"` — see HF-1, HF-2 below. |
| **A2-2** live-region coalescing | `live-progress-region.jsx` L36–60 | **CLOSED** | Single `<div ref={liveRef} aria-live="polite" aria-atomic="true">` at L72; trailing-edge debounce `setTimeout(..., coalesceMs)` with `coalesceMs=250` default L52; same-message dedup via `lastMessageRef` L53–54; per-row `<li>` does NOT carry `aria-live`. The 4/sec throttle floor (1000ms/250ms=4) is met. |
| **A3-3** Kebab as ARIA menu | `findings-row.jsx` L152–189 | **CLOSED** | Kebab is `<button aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={menuId} aria-label="More actions">` (L153–163); menu is `<ul role="menu">` with `role="menuitem"` children (L166–187); Esc closes + restores focus to kebab (L50–55); ArrowUp/Down/Home/End handler at L65–82; outside-click dismiss L45–49. |
| **HC3** Radar + table sibling | `score-display.jsx` L88–179 | **CLOSED** | `<svg aria-hidden="true">` is the radar (L88); `<table>` is *always* in the DOM (L152–179) with `<caption>`, `<thead><th scope="col">`, `<tbody><th scope="row">`. When `view==='radar'` the table gets `class="sz-sr-only"` (L154) — still readable to AT. Delta text "+19, improved" follows SC 1.4.1 (L167–169). |
| **HC10** Watermark `aria-describedby` | `chip.jsx` L46; `verdict-card.jsx` L57–63, L122–127 | **CLOSED** | `<Chip variant="watermark" id={...} describedBy={wmHelpId}>` pairs with `<ChipHelperText id={wmHelpId}>` rendered as a `<p>` below; verdict `<h1>` carries `aria-describedby={wmHelpId}` when `watermark=true` so SR users hear the watermark caveat with the verdict. |
| **SC 2.5.7** non-drag reorder Alt+↑/↓ | `findings-row.jsx` L85–94 | **PARTIALLY OPEN** | Handler exists at L85–94 and reads `e.altKey && e.key === "ArrowUp"`. Kebab "Move up (Alt+↑)" / "Move down (Alt+↓)" menu items exist at L183–186. **BUT** the `<li>` has `tabIndex={-1}` (L108) which means **a keyboard user cannot focus the row to use the Alt+↑/↓ shortcut**. Only the kebab path works. See HF-3 below. |
| **SC 2.4.11** Focus Not Obscured | `_tokens/tokens.css` L150–159, `modal-route.jsx`, `nav.md` | **CLOSED** | `html { scroll-padding-top: var(--scroll-pad-top) }` at L157–159, `--scroll-pad-top: 80px`, `--sticky-nav-h: 60px` (L150–151). Modal-route closes with `preventScroll: false` (L89) so scroll-padding is honored. Nav.md cites SC 2.4.11 explicitly. Sticky group `<h2>` in `settings-root.md` accounts for the offset. |
| **SC 2.4.13** Focus Appearance | `_tokens/tokens.css` L35–39, all CSS files | **CLOSED at token layer** | Tokens lock 2px solid + 2px offset; ring 6.8:1, emphasis 18.4:1. `.sz-focus-ring` utility at L176–183. Every component's `.md` cites SC 2.4.13. Spot-checked CSS imports for `--focus-ring` — 27 files use it (per grep). |
| **SC 3.3.7** Redundant Entry | `form.jsx` L84–110 | **CLOSED** | `<FormContext.Provider value={{ priorValues }}>` wraps fields; `usePriorValue(name)` hook at L107–110 exposes prior-step values. Documented in `form.md` SC 3.3.7. |
| **SC 3.3.8** Accessible Authentication | `input.jsx` L105–115 | **CLOSED** | Revealable show/hide as `<button type="button" aria-pressed={revealed} aria-label={...}>`; `autoComplete` honored. BYOK input.md L58–63 documents the BYOK specifics (autoComplete=off, spellCheck=false). No CAPTCHA primitive present in any component. |

**Phase 3 closure rate: 8/11 fully closed, 2 partially open, 1 marked CLOSED-at-component-layer but with screen-layer drift (= 3 binding-list items reopen as Phase 4 findings).**

---

## Per-component findings

### 1. Button — `button/button.jsx`

**Verdict: PASS.**

`<button>` and `<a>` semantics are clean. `aria-disabled` + `tabIndex=-1` correctly applied to anchor variant when disabled (L48–50). `aria-busy` on loading (L62). Focus ring tokenized (button.md L41–43). Hit-area floor of 24×24 documented in all three sizes per button.md L43–44. SC 1.4.3 ratios verified (button.md L39). Destructive variant uses `--focus-ring-emphasis` for SC 2.4.13.

One nit (Minor): the anchor variant gets `role="button"` (L49). For an anchor with `href`, `role="button"` semantically converts a link into a button — this is usually unnecessary and can confuse SR users (NVDA will say "button" but Space activates a button while Space *scrolls* an anchor). If the use case is genuinely a button-styled link, prefer no `role` override; let it read as a link. **Not blocking.**

### 2. Input — `input/input.jsx`

**Verdict: PASS.**

- SC 3.3.1 / 3.3.2: `<label htmlFor>` always rendered (L81–88), `aria-describedby` pairs helper+error (L41), `aria-invalid="true"` on error (L64), error text in `<p role="alert">` (L127).
- SC 3.3.8: revealable is a `<button type="button" aria-pressed={revealed} aria-label>` not a div (L106–115).
- SC 1.3.5: `autoComplete` and `inputMode` honored (L68–69).
- SC 2.5.8: input height ≥44 per input.md L53; show/hide reserves 24×24.

One issue I want to flag (Minor, not blocking): the required asterisk is wrapped in `aria-hidden="true"` (L84) but `aria-required={true}` is set on the control (L67). That's correct — SR users hear "required" without hearing "asterisk" twice. Good. The `<label>` text itself does not contain the word "required" though. Per SC 3.3.2 the *programmatic* association via `aria-required` is sufficient at AA; making the visible label contain "required" is an AAA recommendation. **Keep as is for AA.**

### 3. Card — `card/card.jsx`

**Verdict: PASS WITH FIXES (Minor).**

- ModeCard implements Compass AH-1 dual-label (eyebrow + H2) at L40–52.
- ProjectCard carries `aria-label` with name + client (L75), satisfies SC 2.4.4.
- FindingCard expand button is `<button aria-expanded aria-controls>` (L138–145), satisfies SC 4.1.2.

**HF-CARD-1 (MAJOR) — Score aria-label inside ProjectCard duplicates content read by SR.** Line 95: `<div className="sz-card__score" aria-label={`Score ${score} out of 100, verdict ${verdict || "unknown"}`}>` wraps three `<span>` children that themselves carry "{score}" "/ 100" "{verdict}". When a `<div>` has `aria-label`, SR users hear *only* the aria-label and the inner text is suppressed (when the div is treated as a labeled region with role=group-via-label). On many SR/browser combos the aria-label *replaces* the inner text, but on Safari+VoiceOver in some configs the inner text is also announced — yielding double-announcement. **Fix:** drop the `aria-label` on the wrapper and let the natural reading order ("68 / 100 FAIL") work; or convert the div to a labeled region (`role="group" aria-label="Score 68 of 100, verdict FAIL"`) and `aria-hidden="true"` the inner spans. **SC 4.1.2 risk; not a hard fail because the content is correct either way; SR experience is degraded.**

### 4. Chip — `chip/chip.jsx`

**Verdict: PASS.**

- Filter chips correctly render `<button aria-pressed>` (L33).
- Watermark variant pairs `id` + `describedBy` + `<ChipHelperText id={id}>` (L46, L72–78) — HC10 closed.
- Dot is `aria-hidden="true"` (L49) — SC 1.4.1 (color/dot is reinforcing, not load-bearing).
- Remove-filter X button has `aria-label="Remove filter"` (L56).

### 5. Nav — `nav/nav.jsx`

**Verdict: PASS WITH FIXES (Major).**

- Skip-link is the first focusable element (L46) — SC 2.4.1.
- `<nav aria-label="Primary">` (L55) — SC 1.3.1.
- `aria-current="page"` on active link (L63) — SC 3.2.3.
- Bell button has dynamic `aria-label` with unread count (L103) and `aria-haspopup="dialog"` (L104).
- User menu has `aria-haspopup="menu"` (L120) and accessible name with email context (L119).

**HF-NAV-1 (MAJOR) — Mobile hamburger panel has no focus trap or `inert` on background.** The hamburger toggle is correctly `aria-expanded` (L135) and `aria-controls="sz-nav-mobile"` (L136). But when `mobileOpen=true` the expanded panel at L147–159 is a `<div>` of links rendered inline in the header — there is **no focus trap**, **no `inert` attribute on the page content behind it**, and **no Esc-to-close handler**. A keyboard user opens the menu, Tabs through it, then Tabs into the page content underneath while the visual panel is still over the top of the layout. SC 2.1.2 No Keyboard Trap is technically met (Tab exits the menu), but SC 2.4.3 Focus Order is broken (focus visibly leaves the menu while the menu remains visually open). And SC 2.4.11 Focus Not Obscured is at risk because the menu covers focused elements underneath.

**Fix:** when `mobileOpen=true`: (a) apply `inert` to the rest of the page (or focus-trap the menu), (b) bind Esc to close, (c) on close, return focus to the hamburger button. The sidebar.md L54 says "Open state: full-screen drawer with `inert` on background" but Nav's mobile panel is not the sidebar — and it does not implement the same contract.

**HF-NAV-2 (MINOR) — `--ink-3` color on inactive nav links.** Nav.md L43 admits `--ink-3` is 3.2:1 and asserts "nav labels are large-enough mono-meta at 11px UPPERCASE 0.08em; verified on Halo Phase 2." 11px is **not large text** by WCAG (large = 18pt/24px regular or 14pt/18.66px bold). The 11px mono-meta UPPERCASE 0.08em letter-spacing is body-sized. At 3.2:1 this fails SC 1.4.3 4.5:1 for body text. **Fix:** inactive nav links must use at minimum `--ink-2` (6.8:1 — clears AA). `--ink-3` is acceptable only on decorative hairline labels, never on the primary nav. I will not let this slide. This regresses what Phase 2 documented; either the contrast measurement was wrong or the SC interpretation was. SC 1.4.3 is **not** lenient on UPPERCASE — it's lenient on bold ≥14pt / regular ≥18pt only.

### 6. Sidebar — `sidebar/sidebar.jsx`

**Verdict: PASS.**

- `<nav aria-label="Primary">` (L23).
- `aria-current="page"` on active item (L31).
- Decorative icons are `aria-hidden` (L34).
- Count badge has accessible name `aria-label="{count} new"` (L37). Good.
- 44×44 hit area per sidebar.md L41 — exceeds SC 2.5.8.

### 7. Modal-as-route — `modal-route/modal-route.jsx`

**Verdict: PASS.**

Halo A1-1 fully closed; I detailed the evidence in the Phase-3-closure ledger above. Specific receipts:

- L35: focus moves to `titleRef` (the `<h2 tabIndex={-1}>` at L156).
- L70–94: `handleClose` publishes SR announcement on a polite live region then moves focus to `triggerRef.current` (L85) or fallback `document.querySelector('main h1, [data-sz-parent-heading]')` (L86). Sets `tabindex="-1"` on the fallback target before focusing (L88) so focus is programmatically valid.
- L97–112: focus trap with Tab+Shift+Tab wrapping at first/last focusable.
- L60–63: Esc handler.
- L143–151: X button with `aria-label="Close"`.
- L48–49: body scroll lock; cleanup restores prior overflow.

One observation (Minor): the focus-trap query selector at L99–101 is the standard one but doesn't include `details > summary`. If a modal-as-route ever contains a `<details>` element, the `<summary>` will be inside the focus order but the query won't find it. **Not currently in scope** for the 4 modal-as-route surfaces; flag for V1.5 when dispute form lands.

### 8. Findings-row — `findings-row/findings-row.jsx`

**Verdict: PASS WITH FIXES (1 Critical, 1 Minor).**

The kebab menu is well-implemented; A3-3 is closed. But:

**HF-FROW-1 (CRITICAL — SC 2.5.7, SC 2.1.1) — `tabIndex={-1}` on the row makes Alt+↑/↓ keyboard reorder unreachable.**

Line 108: `<li tabIndex={-1}>`. Lines 85–94 register an `onKeyDown` handler for `Alt+ArrowUp/Down` reorder. The handler only fires when the row itself is `document.activeElement`. With `tabIndex={-1}` the row is **not** in the Tab order — the user can never focus it via keyboard. Their only paths to focus the row are:

1. Click it with a mouse (defeats SC 2.5.7's purpose: providing a non-mouse alternative to drag).
2. The kebab → "Move up/down" menu item (which works, but is slow — 4 keystrokes per move: Tab to kebab, Enter, ArrowDown to "Move up", Enter).

Two viable fixes:
- **(a)** Set `tabIndex={0}` on the `<li>` and make it a focusable composite widget. Document a roving tabindex pattern so only one row at a time is in Tab order, and ArrowDown/Up moves between rows. This is the closest to ARIA APG "Grid" pattern.
- **(b)** Add a hidden but focusable "Reorder" handle button on each row that takes focus on Tab and exposes the Alt+↑/↓ key map via `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"`. Less invasive.

I lock **(a) roving tabindex** as the contract because it pairs with the natural reading order Pixel's verdict-fail screen expects (verdict-fail.md L150 "every finding row's expand toggle... reachable by Tab"). The current implementation makes the *row* unreachable while its inner buttons are reachable — which means the Alt+↑/↓ map dies. **This is a binding Critical: SC 2.5.7 has not been provided a non-drag alternative that works by keyboard alone, despite the appearance of one in the code.**

**HF-FROW-2 (MINOR) — `aria-labelledby` references a header that may not be unique.** Line 109 reads `aria-labelledby={`${id}-sum`}` and L124 is `<h3 id={`${id}-sum`}>`. If `id` is missing (consumer didn't pass it), both fall back to the same template-string-with-undefined. Looking at L34: `const evId = `${id || autoId}-ev`` — the `useId()` fallback is applied — but L109 uses `${id}-sum` (no autoId fallback) and L124 the same. So if `id` is undefined, both produce `"undefined-sum"` and any two rows on the page collide. Defensive fix: change both to `${id || autoId}-sum`. **Not blocking** because consumers will pass `id` in practice, but failure-mode is silent A11y degradation.

### 9. Verdict-card — `verdict-card/verdict-card.jsx`

**Verdict: PASS WITH FIXES (Minor).**

- `<h1 role="status" aria-live="polite">` (L58–60) — HC1 single-permitted use; confirmed correct.
- `aria-describedby={wmHelpId}` when watermark present (L61) — HC10 closed.
- `aria-labelledby={headlineId}` on the `<section>` (L78) ties the region to the heading.
- Decorative icon `aria-hidden="true"` (L64) — SC 1.4.1.
- Audience and run-id are static text; correct.

**HF-VC-1 (MINOR — SC 4.1.3) — Loading-state and default-state both carry `role="status"` on the `<h1>`. When the SPA transitions from loading to verdict-emitted, the same node remains in the DOM with `role="status"` — that's correct because A2-1 sanctioned this single SPA-state-change announcement.** *However* the loading-state `<h1>` reads "Audit in progress" (L46) and the resolved-state reads "Audit complete · {VERDICT}" (L67–69). On the transition, SR users hear: "Audit complete · FAIL" (good). But on initial render of the loading state, "Audit in progress" *also* fires through `role="status"`. That's an unwanted second announcement: the user already heard "starting an audit" elsewhere and now hears "Audit in progress" with no new info. **Fix:** remove `role="status"` from the loading-state `<h1>` at L44; keep `aria-live="polite"` if you want progress-text changes to announce, but the loading H1 is *not* a state change — the page just loaded. Per Halo A2-1: `role="status"` is for content that *appears or changes in place*, which is exactly what the verdict-resolved transition is, but NOT what the initial loading paint is. **Not blocking, but the spirit of A2-1 says clean this up.**

### 10. Score-display — `score-display/score-display.jsx`

**Verdict: PASS WITH FIXES (Minor).**

- `<svg aria-hidden="true">` at L88 — radar is decoration; correct.
- `<table>` always in DOM (L152), `<caption>` even when SR-only (L156), `<thead><th scope="col">` (L158–162), `<tbody><th scope="row">` (L172). HC3 closed.
- Delta text "+19, improved" / "−7, worse" / "unchanged" at L167–169 — SC 1.4.1 closed.
- Summary `<p>` derives auto-text or accepts `summaryText` override (L182).

**HF-SD-1 (MINOR — SC 4.1.2) — Tab/Tablist roles on the chart/table toggle are non-conformant ARIA.** Lines 61–82: the toggle uses `role="tablist"` with `role="tab"` children, but there are no `role="tabpanel"` siblings; the radar and table are not tab panels. ARIA APG "Tabs" pattern requires `role="tabpanel"` on the panels and `aria-labelledby` linking to the tab. Either:
- (a) Convert to proper tabs: each panel gets `role="tabpanel" aria-labelledby={tabId}`, and the tablist arrow-key navigation pattern is implemented (ArrowLeft/Right moves between tabs).
- (b) Drop the `role="tablist"` / `role="tab"` and just use `<button aria-pressed>` toggles. Simpler and equally accessible.

I prefer **(b)** — these are toggle buttons, not navigation tabs. Two adjacent toggles where each independently shows/hides a region is the press-button pattern, not the tabs pattern. **Not blocking** because keyboard activation still works; ARIA semantics are just slightly wrong.

### 11. Live-progress-region — `live-progress-region/live-progress-region.jsx`

**Verdict: PASS.**

Halo A2-2 fully closed; details in the Phase-3-closure ledger. Specific receipts:
- One `<div aria-live="polite" aria-atomic="true">` at L72; that's the only live region in the component.
- 250ms trailing-edge debounce at L52, dedup at L53–54.
- Per-row `<li>` (L76) has no `aria-live`. Visual phase chip data-state (L79) is CSS-only.
- Static ETA text (L67) — Halo A5-2 closed (no animated countdown, satisfies SC 2.2.1).
- `<Chip>` phase tones map cleanly; SC 1.4.1 — phase chip carries text ("RUNNING", "FINISHED", "BLOCKED") not just color.
- Reduced-motion: `prefers-reduced-motion` global guard in tokens.css handles chip transitions.

### 12. Table — `table/table.jsx`

**Verdict: PASS.**

- Semantic `<table>` (L21), `<caption>` always (L27 — `sz-sr-only` when invisible), `<thead><th scope>` (L33), `<tbody><th scope="row">` for row headers (L50).
- "Most popular" badge is **text content in a `<th>`** (L53–55, `<span>{r.badge}</span>` with `aria-label`), not a CSS pseudo-element. HC7 closed.
- `aria-busy` on loading state (L24).
- Per table.md: stack-at-320 with `<dt>/<dd>` pattern is documented. CSS implementation lives in table.css (not audited in this pass — verbal contract honored).

### 13. Form — `form/form.jsx`

**Verdict: PASS WITH FIXES (Minor).**

- `noValidate` on `<form>` (L43) — form-owned validation rather than browser-default.
- Error summary `role="alert" tabIndex={-1}` (L70–73); `useEffect` focuses it on render (L24–27). SC 3.3.1 closed.
- `<ol aria-label="Form progress">` step indicator with `aria-current="step"` on active (L46–65). Good.
- `usePriorValue` hook exposes SC 3.3.7 seed values.

**HF-FORM-1 (MINOR — SC 3.3.1) — Error summary swaps focus without telegraphing.** The `useEffect` at L24–27 focuses the summary on every `errorSummary.length > 0` change. Two concerns:
1. If the user submits, fixes one field, submits again, errors update — focus jumps back to the summary every time. SR users will get re-read. Mitigation: focus only when `errorSummary` *appears* (length went from 0 to >0), not when it *changes*.
2. `errorSummary` is the dep array — if the array reference changes but contents are equivalent, focus moves anyway. Mitigation: compare content, not reference.

Both are quality-of-experience tightenings, not WCAG failures (SC 3.3.1 requires identification + suggestion; this component delivers both). **Not blocking.**

### 14. Empty-state — `empty-state/empty-state.jsx`

**Verdict: PASS.**

- `<H>` swap based on `headingLevel` prop (L25, L45) — supports `<h1>` for route-level empties (most common per IA) and `<h2>` for in-page empties.
- `role="alert"` only on the `<div>` wrapping the status chip when `assertive=true` (L37–39). Otherwise no live region. **Aligns with Halo A2-1 — this is the discipline I asked for.**
- Support-code copy button has `aria-label` with the code (L55) — SC 4.1.2.
- `kind` prop drives default tone but does not auto-apply `role="alert"` — `assertive` is an explicit consumer choice.

---

## Per-screen findings

### S1. Landing — `landing/landing.md`

**Verdict: PASS WITH FIXES (Minor).**

The screen documents SC 1.4.3, 1.4.10, 1.4.11, 1.4.12, 2.1.1, 2.4.1, 2.4.3, 2.4.4, 2.4.6, 2.4.11, 2.4.13, 2.5.7 (N/A), 2.5.8, 2.3.3 cleanly. H1 is single and unique; section structure is `<h1>` → `<h2>` → `<h3>` per landing.md L168.

**HF-S1-1 (MINOR — SC 3.3.7) — Cookie banner state not documented as persisted.** HB-8 cookie banner is at the bottom of `<body>` per landing.md L120 + L179. If a user dismisses it on `/`, then navigates to `/pricing`, the banner should not reappear (SC 3.3.7 Redundant Entry — though cookie consent is closer to SC 3.2.2 On Input). The screen spec doesn't explicitly state banner state is persisted in localStorage/cookie. **Fix:** add a sentence to §"Cookie consent banner" in landing.md confirming the banner is suppressed on subsequent page loads once the user has answered.

### S2. Dashboard-first-run — `dashboard-first-run/dashboard-first-run.md`

**Verdict: PASS WITH FIXES (Major).**

H1 has `tabindex="-1"` and is programmatically focused on route load (L84, L129). Skip-link target is `<main id="main">`. Tab count to primary CTA via skip-link = 2 Tabs (L142). Heading hierarchy clean (L140).

**HF-S2-1 (MAJOR — SC 4.1.3 / Halo A2-1 reopen) — Mode chip spec breaks `role="status"` discipline.**

Dashboard-first-run.md L134:
> "Mode chip uses `<span role="status" aria-live="polite">` only when it transitions states (e.g., validation finishes); otherwise static."

This re-applies `role="status"` to a chip that is NOT one of the two sanctioned places (verdict-card `<h1>` and live-progress-region wrapper). The argument "only when it transitions states" is exactly the case I rejected in Phase 3 A2-1 for the payment-required dialogs: a state change in a chip is *not* a route-level event, so `role="status"` causes re-announcement noise when AT focus passes over the chip later. The chip transition (BYOK validation finished) should publish through the **same coalesced live region** the live-progress-region uses, or through a dedicated app-shell `<div aria-live="polite">` that is **not** on the chip itself.

**Fix:** rewrite dashboard-first-run.md L134 to specify: *"Mode chip is a static `<span>`. Validation state changes publish a one-shot announcement via the app-shell live-region (`<div aria-live='polite' aria-atomic='true'>` rendered as a sibling of `<main>`). The chip itself never carries `role='status'` or `aria-live`."* This aligns with the live-progress-region pattern Canvas already shipped.

**HF-S2-2 (MINOR — SC 2.4.4) — `<UserMenu>` and tablet-rail Sidebar are placeholders.** Both are admitted open contracts (dashboard-first-run.md L80, L150). Until Canvas ships them, they're `<Placeholder>` calls. **Cite as a tracking item for Phase 5**, not blocking Phase 4 — but the placeholders must not regress on the SC 2.4.4 / 2.5.8 / 2.4.7 contracts already established.

### S3. Intake-2step — `intake-2step/intake-2step.md` + `.jsx`

**Verdict: PASS WITH FIXES (Major).**

- Step-1 → Step-2 focus restoration on back-nav documented (L124, L171). Halo HC closed.
- Radio cards inside `<fieldset><legend>` (L122, L177).
- SC 3.3.7 honored: Step-1 selection auto-fills Step-2 (L178).
- 3-Tab path from skip-link to forward CTA (L186).

**HF-S3-1 (MAJOR — SC 4.1.3 / Halo A2-1 reopen) — Soft warning banner uses `role="status"` on a non-transient route element.**

intake-2step.jsx L321: `<div role="status" className="sz-soft-warning">`. This banner appears when the user picks Comprehensive on a free-tier Surface intake. It is NOT a transient state announcement — it's a persistent banner that stays visible until the user changes the depth radio. Per Halo A2-1: `role="status"` is for content that *appears or changes in place*; once it appears, subsequent focus over it should not re-announce. With `role="status"` on a persistent element, NVDA in browse-mode will re-announce it on every focus pass.

**Fix:** the banner *first appears* — that's a one-shot announcement event. Implement as:
1. Render the banner without `role="status"` (just `<div className="sz-soft-warning">`).
2. On the depth-change event that triggers the mismatch, publish the banner's text into the same app-shell `<div aria-live="polite">` used elsewhere.
3. The banner remains visually present for reference; SR users hear it once.

Same pattern as HF-S2-1. The discipline is: **`role="status"` is reserved for content surfaces whose primary identity is "state changed in place"**, which on Studio Zero is the verdict-card `<h1>` (SPA state change) and the live-progress-region wrapper (coalesced agent progress). Everything else publishes through a shared app-shell live region.

**HF-S3-2 (MINOR — SC 4.1.2) — Card-as-radio pattern needs an interface lock.** intake-2step.md L195 asks Canvas to confirm `<Card interactive>` can wrap an `<input type="radio">` without breaking radiogroup semantics. Recommended ARIA pattern is documented but not implemented in the .jsx I read (a `<details>` is used for Advanced; the depth radios at Step 2 are described in the .md but not visible at L300–320 of .jsx which shows the checkbox list). **Tracking item for Phase 5 — confirm the radio-card pattern is built with hidden native `<input>` + `<label>` wrapping the card, `aria-checked` mirrored from the input state, and arrow-key navigation within the radiogroup.**

### S4. Verdict-fail — `verdict-fail/verdict-fail.md` + `.jsx`

**Verdict: PASS WITH FIXES (Minor).**

- VerdictCard composition delivers SC 4.1.3 / HC1 correctly (.md L158, .jsx L172–199).
- ScoreDisplay composition delivers HC3 (.md L104, .jsx L216–219).
- Findings list grouping per Compass AH-2 (category primary, .md L107).
- 320 px reflow plan documented (.md L82–88).
- 2-Tab path from skip-link to primary CTA (.md L166).

**HF-S4-1 (MINOR — SC 2.4.6) — Heading hierarchy uses `<h4>` per finding inside `<h3>` group.** verdict-fail.md L164: `<h3>` per category group · `<h4>` per finding. But findings-row.jsx L124 renders `<h3 id={`${id}-sum`}>`. If the wrapping screen uses `<h3>` per category group (which is the Compass AH-2 contract) AND each finding inside is also `<h3>`, headings collide at the same level. The screen .md says `<h4>` per finding but the component ships `<h3>`. **Fix:** either Pixel's screen wrapping uses `<h2>` per category group (so component `<h3>` per finding nests correctly), or findings-row's component exposes a `headingLevel` prop the way empty-state does. I prefer the latter — `findings-row` is generic and may be used outside the verdict-fail context. **Add a `headingLevel` prop to findings-row defaulting to 3.**

**HF-S4-2 (MINOR — SC 1.4.11) — Verdict-region frame `#5a2828` on `#050506` is 2.0:1.** Documented at verdict-fail.md L149: "acceptable as decorative hairline because the verdict text + icon + bg-color triplet carries the meaning (SC 1.4.1 reinforcement)." **I accept this argument.** The verdict identity is the text + icon + the **bg color** (#C8421A on red bg with white text). The frame is hairline decoration that does not carry state. SC 1.4.11 applies to non-text contrast for "states, boundaries, focus" — a decorative hairline that does not bound an interactive control is exempt. **No fix required. Documentation cite for the audit trail: SC 1.4.11 lists "graphical objects required to understand content" — this hairline is not required to understand the FAIL verdict; the bg-color + icon + text triplet is sufficient.**

### S5. Settings-root — `settings-root/settings-root.md`

**Verdict: PASS WITH FIXES (Minor).**

- HB-4 3-group structure preserved (Halo A3-1 closed).
- 7-Tab path to "Delete account" — within Halo's ≤7 ceiling (.md L163).
- `aria-current="page"` on Settings sidebar item.
- Each group is `<section aria-labelledby="account-h2">` (.md L142).
- `<ModalRoute>` deletion flow per Halo A1-1 (.md L94).
- SC 3.3.4 destructive pattern documented (.md L154).

**HF-S5-1 (MINOR — SC 2.4.6 / SC 4.1.2) — `<a><h3>title</h3></a>` semantic note unresolved.** settings-root.md L150: "semantically `<a><h3>title</h3></a>` is unusual but valid; alternative pattern is `<h3>` outside the link, the row body inside — settled at Phase 4 build per Canvas's `<SettingsRow>` interface." Canvas's `<SettingsRow>` is a `<Placeholder>` (.md L91), so the contract is unresolved. **`<h3>` inside `<a>` is valid HTML5 but breaks NVDA in some configurations because the link's accessible name becomes "h3 text + state text" with no separator.** Recommended pattern: `<a><span class="settings-row__title">Title</span><span class="settings-row__state">STATE</span></a>` — no heading inside the link. Headings come at the group level (`<h2>`). **Fix when SettingsRow ships in Phase 5: no `<h3>` inside `<a>`.**

**HF-S5-2 (MINOR — SC 1.4.1) — Destructive row visual differentiation cite.** settings-root.md L142 mentions "destructive row labels use `--ink-0` on `--bg-1` with `--focus-ring-emphasis` for focus" but doesn't cite the *visual* differentiation when not focused. Per SC 1.4.1, destructive rows must be distinguishable by something other than color alone. **Fix:** state that destructive rows (Delete account, Cancel plan) carry a textual marker (e.g., "Destructive · " prefix in mono-meta, or an icon with `aria-label="Destructive action"`) — not just `--ink-0` color weight.

---

## Per-WCAG-2.2 new SC coverage matrix

| SC | Required artifacts | Coverage | Verdict |
|---|---|---|---|
| **2.4.11 Focus Not Obscured** | tokens.css scroll-padding-top, modal-route honors it, sticky nav budget | `_tokens/tokens.css` L150–159; modal-route restores scroll; nav.md cites 60px header + 80px padding | **CLOSED** |
| **2.4.13 Focus Appearance** | Every component CSS references `--focus-ring` | Grep confirms 27 files reference `--focus-ring`. Tokens lock 2px solid + 2px offset; 6.8:1 ratio. | **CLOSED** |
| **2.5.7 Dragging** | Findings-row non-drag alternative | Kebab menu items + Alt+↑/↓ handler exist, **but row is `tabIndex={-1}`** so keyboard cannot reach Alt+↑/↓. | **HF-FROW-1 CRITICAL** |
| **2.5.8 Target Size 24×24** | Buttons, sidebar items, findings row affordances, chips, kebab | Button sm = 24×24 floor (button.md L43); Sidebar 44×44 (sidebar.md L41); FindingsRow actions and kebab ≥24×24 (findings-row.md L41); filter chips render `<button>` ≥24×24 | **CLOSED** |
| **3.3.7 Redundant Entry** | Multi-step forms preserve values | `form.jsx` `usePriorValue` hook + `priorValues` prop; intake-2step.md L178 cites it; settings retains state | **CLOSED** |
| **3.3.8 Accessible Authentication** | BYOK paste, CLI pairing, OAuth | `input.jsx` revealable + `autoComplete` honored; no CAPTCHA; show/hide is keyboard-operable button; BYOK helper text cites SC 1.3.5 | **CLOSED** |

---

## Motion contract verification

`motion.md` is excellent. SC 2.3.3 / SC 2.2.2 / SC 2.2.1 compliance specified per surface in the §2 budget table; reduced-motion collapse rules per §3; specific animations spec'd per §4 with the `@media (prefers-reduced-motion: reduce)` collapse documented for each.

`motion.md` §6 ("Implementation enforcement") explicitly fails Phase 4 if any of the following appear:
- Hardcoded duration
- Off-grid easing
- An animation without a reduced-motion override
- A live region firing >4/sec
- **A `role="status"` applied to a stable route landing surface (Halo A2-1 fix — verdict-screen `<h1>` is the only exception).**

That last bullet is the exact rule HF-S2-1 and HF-S3-1 violate. Canon's drift detector should catch them at screen build time if the detector reads JSX. **If the detector does not parse JSX `role` attributes today, this is a Sprint-Phase-5 backlog item for Canon.**

---

## Phase-4 exit-gate verdict

**BUILD_FLOW.md Phase 4 gate:** *WCAG 2.2 AA on every component AND every screen, including new SCs 2.4.11 / 2.4.13 / 2.5.7 / 2.5.8 / 3.3.7 / 3.3.8; 320 CSS px reflow per SC 1.4.10; 24×24 target size per SC 2.5.8.*

| Artifact-class | Critical | Major | Minor |
|---|---|---|---|
| Components (14) | 1 (HF-FROW-1) | 2 (HF-CARD-1, HF-NAV-1) | 6 (HF-NAV-2, HF-FROW-2, HF-VC-1, HF-SD-1, HF-FORM-1, plus assorted inline) |
| Screens (5) | 0 | 2 (HF-S2-1, HF-S3-1) | 6 (HF-S1-1, HF-S2-2, HF-S3-2, HF-S4-1, HF-S4-2, HF-S5-1, HF-S5-2) |
| Motion (joint doc) | 0 | 0 | 0 |

**Totals: 1 Critical, 4 Major, 12 Minor.**

The Critical (HF-FROW-1) is a regression on a Phase-3 binding fix — SC 2.5.7 has lost its keyboard accessibility despite the code appearing to implement it. The two screen-layer Majors (HF-S2-1, HF-S3-1) are Phase-3 A2-1 reopens at the screen surface — `role="status"` discipline drifted from component to screen. HF-CARD-1 and HF-NAV-1 are component-layer Majors (double-announcement on ProjectCard score, no focus-trap on Nav mobile menu).

**Gate verdict: PASS WITH FIXES → back to Canvas+Pixel for tightening, not back to a redo of Phase 4.**

The Phase 4 design layer is fundamentally sound. Tokens are right. Component primitives are right. The 14-component manifest delivers the API surface screens compose against. Brand discipline is held. The Phase-3 binding fixes are 8/11 fully closed. But three specific items must close before Phase 5 implementation begins. None require rework — all are 1–10 line edits.

---

## Required fixes before Phase 5 implementation begins (binding)

1. **HF-FROW-1 — `findings-row.jsx` keyboard reachability for SC 2.5.7.** Change `<li tabIndex={-1}>` (L108) to implement a roving-tabindex grid pattern, OR add a focusable reorder-handle button per row with `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"`. CRITICAL.
2. **HF-CARD-1 — `card.jsx` ProjectCard score `aria-label` duplication.** Remove the `aria-label` from the wrapping `<div>` at L95 OR mark the inner spans `aria-hidden="true"` and keep the aria-label. MAJOR.
3. **HF-NAV-1 — `nav.jsx` mobile hamburger menu.** Add `inert` on background (or focus-trap), Esc-to-close, focus-return to hamburger button when closed. MAJOR.
4. **HF-NAV-2 — `nav.md` + nav.css inactive-nav-link contrast.** Inactive nav links must use `--ink-2` (6.8:1) not `--ink-3` (3.2:1). 11px mono-meta UPPERCASE is not large text per SC 1.4.3. MINOR-blocked-up-to-MAJOR if 11px UPPERCASE is the cited rationale, because the rationale is wrong.
5. **HF-S2-1 — `dashboard-first-run.md` L134.** Remove `role="status" aria-live="polite"` from the Mode chip spec. Use the app-shell shared live region instead. MAJOR.
6. **HF-S3-1 — `intake-2step.jsx` L321.** Drop `role="status"` from the soft-warning banner. Publish the message into the app-shell shared live region on first appearance. MAJOR.
7. **HF-S4-1 — `findings-row.jsx` heading level.** Add a `headingLevel` prop defaulting to 3, so consuming screens can nest the row's title heading at the right depth. MINOR.
8. **HF-VC-1 — `verdict-card.jsx` L44.** Drop `role="status"` from the loading-state `<h1>` (keep `aria-live="polite"` if you still want progress updates announced). MINOR.

---

## Open question answers from Pixel's screens

- **landing.md §7 "GateStageDiagram"** — keep as `<Placeholder>` in Phase 4; Canvas ships it in v0.2 as a visual-utility primitive with `aria-hidden="true"` and a static `<ul>` of agent names as the AT-readable sibling (HC8 pattern, same as live-progress-region's treegrid alternative).
- **dashboard-first-run.md §7 "UserMenu / Sidebar rail-mode"** — both Canvas v0.2 items. Sidebar's rail-mode prop should ship before Phase 5 implementation (tablet path is on the critical path); UserMenu is a Phase-5-implementation primitive.
- **intake-2step.md §7 "Card-as-radio pattern"** — Canvas confirms the contract: hidden native `<input type="radio">`, `<label>` wraps the `<Card>`, Card reads `aria-checked` from `data-checked` mirror, ArrowLeft/Right move between radios within the radiogroup. Locked.
- **intake-2step.md §7 "StepIndicator / Disclosure"** — both Canvas v0.2; the `<details>/<summary>` semantic Pixel uses for Advanced is acceptable as a placeholder pattern that satisfies SC 4.1.2 natively.
- **verdict-fail.md §8 "FindingsToolbar / VerdictCard children slot"** — both confirmed; the children slot is implemented per verdict-card.jsx L116–137.
- **settings-root.md §7 "SettingsRow"** — confirmed as Canvas v0.2; the `<h3>` inside `<a>` anti-pattern noted in HF-S5-1.

---

## Final verdict

**PASS WITH FIXES.**

Canvas + Pixel delivered Phase 4 to a high bar. The 14-component manifest is right. The 5 hero screens compose correctly. The motion contract is admirably restrained. The Phase-3 binding fixes are mostly closed.

What remains:
1. **The Critical (HF-FROW-1)** is the highest priority — SC 2.5.7 keyboard reorder is currently broken despite the code's appearance.
2. **The two screen-layer Majors (HF-S2-1, HF-S3-1)** show that the A2-1 `role="status"` discipline drifted between phases. Canon's drift detector should be extended to flag `role="status"` in screen JSX outside the two sanctioned components.
3. **HF-CARD-1 and HF-NAV-1** are localized component-layer Majors with simple fixes.

**Halo does NOT block Phase 4 exit.** The fixes are 8 items, none structural. They are binding before Phase 5 implementation.

Cite this audit by file path. Cite findings by HF-ID. SC numbers are non-negotiable.

---

*End of phase4-audit-halo v0.1. Halo — Independent Accessibility Reviewer.*
