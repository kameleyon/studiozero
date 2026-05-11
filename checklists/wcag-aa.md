# QA Checklist — WCAG 2.2 Level AA

**Owner:** Access (a11y implementer)
**Audited by:** Halo (independent a11y auditor — never audits its own work)
**Applies to:** every web vertical and every customer-facing surface

## Automated baseline (CI gate)
- [ ] **axe-core** runs on every primary route in CI. Zero violations.
- [ ] **Lighthouse Accessibility score** ≥ 95 on every primary route.
- [ ] **eslint-plugin-jsx-a11y** enabled with default rules. Zero warnings.
- [ ] **Manual testing acknowledged** — automation catches ~30% of issues. The remaining 70% requires the manual checks below.

## Perceivable (WCAG Principle 1)

### 1.1 Text alternatives
- [ ] Every `<img>` has meaningful `alt=""` (or empty alt for decorative).
- [ ] Icons used as buttons have accessible names (`aria-label`).
- [ ] Form inputs have associated `<label>` (visible) — placeholder is not a label.

### 1.3 Adaptable
- [ ] Semantic HTML used throughout — `<button>` not `<div onClick>`.
- [ ] Heading hierarchy: single h1 per page, no skipped levels.
- [ ] Landmarks present: `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`.
- [ ] Reading order matches visual order in the DOM (no `tabindex` reordering hacks).

### 1.4 Distinguishable
- [ ] **Color contrast** — 4.5:1 for normal text, 3:1 for large text (≥18px or ≥14px bold), 3:1 for non-text UI.
- [ ] **Color is not the only signal** — every state (error, success, required) has icon, text, or pattern in addition to color.
- [ ] **Text reflows at 320px width** without horizontal scroll (other than for tables/data-grids that genuinely need it).
- [ ] **200% zoom works** — no clipped content, no overlapping elements.
- [ ] **Forced-colors mode (Windows High Contrast)** doesn't break the UI — test it.
- [ ] **prefers-reduced-motion respected** — animations disable / shorten when user prefers.

## Operable (WCAG Principle 2)

### 2.1 Keyboard accessible
- [ ] **Every interactive element reachable via Tab** — no `tabindex="-1"` on user-facing buttons/links.
- [ ] **Logical tab order** matches visual layout.
- [ ] **No keyboard traps** — escape always works in modals, focus returns to trigger on close.
- [ ] **Skip links** — "Skip to main content" link visible on focus, before primary nav.

### 2.4 Navigable
- [ ] Page titles unique and descriptive per route.
- [ ] Focus visible on every interactive element (never `outline: none` without replacement).
- [ ] Link text descriptive on its own — no "click here" / "read more" without context.

### 2.5 Input modalities
- [ ] **Touch targets ≥ 44×44 CSS pixels** (Apple HIG) / 48dp (Material) on mobile.
- [ ] **Single-pointer alternatives** for any drag-and-drop interaction.
- [ ] **Click cancellation** — actions trigger on `mouseup`/`touchend`, not `mousedown`/`touchstart`, so users can drag away to cancel.

## Understandable (WCAG Principle 3)

### 3.1 Readable
- [ ] `<html lang="en">` (or appropriate locale).
- [ ] Language changes within the page marked: `<span lang="fr">bonjour</span>`.

### 3.2 Predictable
- [ ] Navigation consistent across pages.
- [ ] No surprise context changes — focus doesn't jump unexpectedly, form submission doesn't auto-redirect without warning.

### 3.3 Input assistance
- [ ] **Error messages programmatically associated** with their input via `aria-describedby`.
- [ ] **Error messages announce via `role="alert"` or `aria-live="assertive"`**.
- [ ] **Required fields communicated via label text** (not asterisks alone, not color alone).
- [ ] **Form labels persistent** — placeholder-as-label is rejected.
- [ ] **Error prevention** for legal/financial submissions: confirmation step or undo.

## Robust (WCAG Principle 4)

### 4.1 Compatible
- [ ] **Valid HTML** — no duplicate IDs, no unclosed tags. Run validator on key pages.
- [ ] **ARIA used correctly** — never `aria-*` to fix what semantic HTML solves. Roles match the WAI-ARIA Authoring Practices patterns for any custom widget.
- [ ] **Status messages** announce via `role="status"` (polite) or `role="alert"` (assertive).

## Manual screen-reader pass (mandatory before PASS)
- [ ] **NVDA on Windows + Firefox** — primary flows work end-to-end with eyes closed.
- [ ] **VoiceOver on macOS + Safari** — same.
- [ ] **VoiceOver on iOS** — primary flows work with screen reader on (mobile parity).
- [ ] **TalkBack on Android** (when applicable) — same.

Halo records short transcripts of each pass and stores them under `shared_context/audits/<project>/<date>/halo-transcripts/`.

## Per-vertical extras
- **SaaS:** test with a real screen reader on the dashboard, not just the marketing site.
- **E-commerce:** checkout MUST pass — accessibility lawsuits target checkout flows.
- **Mobile:** add iOS VoiceOver + Android TalkBack — simulator a11y is not equivalent to device.
- **Gaming web:** Game Accessibility Guidelines supplement WCAG — colorblind modes, remappable controls, subtitles, motion-sickness reduction.
