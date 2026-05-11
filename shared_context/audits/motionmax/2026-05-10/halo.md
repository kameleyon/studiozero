# HALO — Accessibility Audit — MotionMax — 2026-05-10

**Reviewer:** Halo (Accessibility Auditor)
**Layer:** Audit
**Scope:** Pre-launch a11y review of the full React 18 + Vite + Tailwind + shadcn web app at `C:\Users\Administrator\motionmax`.
**Audience-relative basis:** Tool-savvy creative adults (marketers, content creators, video producers). Not a regulated/medical audience, but a public-facing SaaS — WCAG 2.2 AA conformance is the floor. Users include a non-trivial percentage with low-vision, motor, and screen-reader needs (creators are *also* customers with disabilities).
**Method:** Source-level audit — keyboard-trace, ARIA inspection, contrast computation against design tokens, screen-reader-name verification. (Live screen-reader transcripts are not possible in a code-only audit; flagged accordingly where needed.)
**Verdict input:** **FAIL** — multiple Critical findings on primary flows (intake form labels, slider controls, contrast tokens, reduced-motion). Audit gate per `protocols/code-standards.md` should hold ship until at least the Critical block is closed.

---

## Severity Summary

| Severity  | Count |
|-----------|------:|
| Blocker   | 0     |
| Critical  | 7     |
| Major     | 9     |
| Minor     | 5     |
| Polish    | 2     |

---

## CRITICAL

### C-1 — Sliders have no programmatic label (WCAG 4.1.2 Name/Role/Value, 1.3.1, 3.3.2)
**Evidence:** `src/components/intake/primitives.tsx:79-83`
```tsx
<input
  type="range" min={min} max={max} value={value}
  onChange={(e) => onChange(+e.target.value)}
  className="flex-1 accent-[#14C8CC]"
/>
```
The `IntakeSlider` primitive emits a `<input type="range">` with **no `id`, no `aria-label`, no `aria-labelledby`, no name attribute**. NVDA/JAWS announce it as "slider, 45 of 100" with no clue what it controls.

**Affected call sites:** `src/components/intake/IntakeForm.tsx:1144` (Lip sync strength), `:1470` (Tone). Both are user-facing controls in the primary intake flow.

**Recommendation:** Add `id` + `aria-labelledby` (pointing at the IntakeLabel) and a `aria-valuetext` so screen readers announce the formatted output (e.g., "Subtle / Natural / Exaggerated") instead of the raw 0-100 number.

---

### C-2 — IntakeLabel silently degrades to a non-label `<div>` (WCAG 1.3.1, 3.3.2, 4.1.2)
**Evidence:** `src/components/intake/primitives.tsx:10-27` — when `htmlFor` is omitted, the label is rendered as `<div className="...">` instead of `<label>`. Eight of ten IntakeLabel call sites in IntakeForm.tsx omit `htmlFor`:

| File:Line | Field | Has htmlFor? |
|-----------|-------|:------------:|
| IntakeForm.tsx:851  | Sources & direction       | NO  |
| IntakeForm.tsx:1014 | Format (16:9 / 9:16)      | NO  |
| IntakeForm.tsx:1037 | Duration (<3 / >3 min)    | NO  |
| IntakeForm.tsx:1073 | Language                  | YES |
| IntakeForm.tsx:1084 | Voice                     | YES |
| IntakeForm.tsx:1110 | Captions                  | NO  |
| IntakeForm.tsx:1116 | Brand name                | YES |
| IntakeForm.tsx:1133 | Audio & realism (group)   | NO  |
| IntakeForm.tsx:1143 | Lip sync strength         | NO  |
| IntakeForm.tsx:1354 | Visual style              | NO  |
| IntakeForm.tsx:1461 | Direction                 | NO  |
| IntakeForm.tsx:1470 | Tone slider               | (none) |

For 9 of these the visible text exists only as decoration — the form controls below them have no programmatic connection. Screen-reader users tab through unlabeled toggle groups, sliders, and uploaders.

**Recommendation:** Make `htmlFor` required at the type level for IntakeLabel, and add `aria-labelledby` linkage where the underlying control is a composite (e.g. the Format/Duration toggle groups need `<fieldset><legend>` or `role="radiogroup" aria-labelledby`).

---

### C-3 — Tertiary muted-text token fails AA contrast (WCAG 1.4.3 Contrast — Minimum)
**Evidence:** `src/index.css:96`
```css
--text-tertiary: 200 7% 52%;     /* ~3.5:1 contrast vs light background — AA large text */
```
**Plus** the dark-mode equivalent `text-[#5A6268]` hard-coded across the app. Computed:

| Pair | Foreground | Background | Ratio | Required | Pass? |
|------|------------|------------|------:|---------:|:-----:|
| Editor disclaimer text | `#5A6268` | `#0A0D0F` | 3.30:1 | 4.5:1 | **FAIL** |
| Sidebar "Recent" timestamp | `#5A6268` | `#10151A` | 2.96:1 | 4.5:1 | **FAIL** |
| IntakeLabel font-mono 10px | `#5A6268` | `#151B20` | 2.94:1 | 4.5:1 | **FAIL** |
| ConfirmModal footer 9.5px | `#5A6268` | `#10151A` | 2.96:1 | 4.5:1 | **FAIL** |
| ScenesColumn empty-state italic | `#5A6268` | `#10151A` | 2.96:1 | 4.5:1 | **FAIL** |
| Stage AI disclaimer | `#5A6268` | `#050709` | 3.43:1 | 4.5:1 | **FAIL** |
| Light-mode `--text-tertiary` self-described as "AA large text" | `hsl(200 7% 52%)` ≈ `#7B838A` | `#FCFCFC` | 3.95:1 | 4.5:1 (normal) / 3:1 (large) | normal text **FAIL**, large **PASS** |

The token is documented as "AA for 14px+" — but it is used at 9–13 px throughout (font-mono labels, dates, disclaimers, timestamps). Ten of the surveyed files use this color for body-size text, which is a categorical 1.4.3 failure.

**Sample affected files (non-exhaustive):** `Sidebar.tsx:444,471,540`; `EditorFrame.tsx:248,262,286,298,317`; `Stage.tsx:743,789,811`; `ScenesColumn.tsx:61,69,99`; `ConfirmModal.tsx:128`; `IntakeForm.tsx:1055,1122,1169`; `primitives.tsx:18`; `AppShell.tsx:100,101`; `Auth.tsx` AuthPageFooter `text-muted-foreground/60`.

**Recommendation:** Raise the muted token to at least `#8A9198` (the existing secondary muted at ~5.7:1 against `#10151A`) for any text below 18 px or below 14 px bold. Restrict `#5A6268` to decorative chrome (separators, bullet glyphs) only.

---

### C-4 — Brand-locked `--destructive` removes the only color signal for danger (WCAG 1.4.1 Use of Color)
**Evidence:** `src/index.css:66-69`
```css
/* Destructive - Gold (was red) — all destructive affordances render
   in brand gold so error/warning chrome stays on-palette. */
--destructive: 45 67% 55%;
--destructive-foreground: 200 9% 10%;
```
The audit brief mandates "no red, no green" — fine — but the chosen substitute is **the same brand gold (`#E4C875`) used as a positive accent and a heading wordmark color**. The Sidebar's "Log Out" affordance (`Sidebar.tsx:432, 583`) and the Delete Project confirm button (`Sidebar.tsx:612`) render in brand gold against gold-tinted backgrounds. To a colorblind user, "Delete project" looks identical to a "Premium feature" gold pill (`Sidebar.tsx:583` `text-[#E4C875] focus:bg-[#E4C875]/10`).

**WCAG impact:** 1.4.1 requires that color is not the *sole* visual means of conveying information or distinguishing visual elements. Today, "destructive" relies on the user knowing that gold-on-gold means dangerous. Iconography (Trash2) is present but small (3.5px in the popover); a color-deficient user with low vision has no second cue.

**Recommendation:** Add a non-color signal to every destructive affordance — a stronger border, a dashed outline, an outline-style "Cancel" against a filled "Delete", or an inline "Permanent" badge. Keep the gold tone, but pair it with a structural cue. The "Delete" word in the AlertDialog action helps; the kebab menu item does not.

---

### C-5 — `--warning` token resolves to amber/orange in violation of brand contract and weakens warning signal (WCAG 1.4.1)
**Evidence:** `src/index.css:63`
```css
/* Warning - Unified amber */
--warning: 38 92% 50%;
--warning-foreground: 0 0% 100%;
```
HSL(38, 92%, 50%) → roughly `#F5A623` (orange-amber). The brief explicitly disallows orange in autopost/lab UI. More importantly for a11y, the only two semantic alert colors are now amber `#F5A623` (warning) and gold `#E4C875` (destructive). Both sit in the orange-yellow region of the spectrum; users with deuteranopia/protanopia see them as similar muddy yellows. There is now no perceptual distance between "warning" and "destructive."

**Recommendation:** If brand forbids red, restrict the warning token to a *cooler* gold (lower saturation, more muted) or pair it with an icon-driven differential (a striped/diagonal pattern for destructive vs. a flat bar for warning). At minimum align with the brief and remove orange (#F5A623) per Jo's color rule.

---

### C-6 — Editor `<video>` and `<audio>` elements are not keyboard-operable (WCAG 2.1.1 Keyboard, 1.2.1 Audio-only/Video-only, 4.1.2)
**Evidence:** `src/components/editor/Stage.tsx:610-611, 656-670, 688`
```tsx
<audio ref={musicRef} preload="auto" loop />
<audio ref={sfxRef}   preload="auto" loop />
...
<video ref={videoRef} muted playsInline preload="auto" poster={...} />
<audio ref={audioRef} preload="auto" />
```
None of the four media elements has `controls`. Playback is driven imperatively from the Timeline transport. The Timeline's Play/Prev/Next buttons ARE labelled (`Timeline.tsx:100,112,120` — good), so keyboard *transport* works. However:

1. The video itself receives no focus, no tab stop, and no `tabIndex` — mouse-only users can click the frame to advance scenes (`Stage.tsx:629-637`) but **keyboard users cannot trigger that gesture**. There is no `onKeyDown` Enter/Space handler on the click target.
2. On mobile (where the Scenes column is hidden, per `EditorFrame.tsx:240` `hidden lg:block`), keyboard users have NO way to walk through scenes from the Stage at all.

**Affected flow:** Editor preview, primary surface for every signed-in user.

**Recommendation:** Either expose `controls` on the visible `<video>` element so users can use spacebar/arrow keys natively, OR add `role="button" tabIndex={0}` + `onKeyDown` (Enter/Space → advance) to the frame click target, with an `aria-label="Advance to next scene (Scene N of M)"`. The audio elements should remain headless (they're driven by the transport) but the video MUST be reachable.

---

### C-7 — No reduced-motion handling for Framer Motion animations (WCAG 2.3.3 Animation from Interactions)
**Evidence:** Repo-wide grep for `useReducedMotion`, `MotionConfig`, or `reducedMotion`:
```
$ rg -l 'useReducedMotion|MotionConfig|reducedMotion' src/
(no results)
```
The CSS reduced-motion block at `src/index.css:325-353` clamps `animation-duration` and `transition-duration` to 0.01 ms — but Framer Motion uses Web Animations API + requestAnimationFrame, which CSS cannot reach. Affected components include:

- `Button` (`src/components/ui/button.tsx:48-50`) — every button bounces on tap via `whileTap={{ scale: 0.97 }}`. Used app-wide.
- Landing hero, demo modal, feature cards (`Landing.tsx:228-231, 311-315, 365-368, 449-452, ...`) — `motion.div` with `initial`/`animate`/`whileInView`. Whole-page parallax-style entrances.
- Auth page (`Auth.tsx:248-252, 288-292`) — modal-card entrance animations.
- Filmic grain overlay (`AppShell.tsx:46-54`) is correctly hidden via the CSS `[data-filmic-grain="true"]{display:none}` rule — that one passes.

For users with vestibular disorders or migraine triggers (per WHO ~1% of users in any consumer audience), the motion budget here is meaningful: a hero scroll triggers ~6 simultaneous entrance transforms. WCAG 2.3.3 is Level AAA but the studio's audience targets `prefers-reduced-motion` as table-stakes — and the codebase already references "WCAG 2.3.3" in its own comments (`index.css:322`), establishing the team's intent to honor it.

**Recommendation:** Wrap the app in `<MotionConfig reducedMotion="user">` in `App.tsx` so framer-motion automatically suppresses transforms for `prefers-reduced-motion: reduce` users. Then audit any motion you want to keep (e.g., a 100ms fade may be fine; a 600ms slide-up is not).

---

## MAJOR

### M-1 — Toggle-group buttons are not exposed as a single-select group
**Evidence:** `src/components/intake/IntakeForm.tsx:1014-1066` (Format, Duration), `:1015` (16:9 / 9:16). Buttons are flat `<button type="button">` in a `<div>` — no `role="radiogroup"`, no `aria-pressed` per item, no shared `<fieldset><legend>`. Screen-reader users hear "button, 16:9 / button, 9:16" with no indication that they form a single-choice group or which is currently selected.

**Search confirmation:** `rg 'role="radiogroup"|role="radio"' src/` → only 4 matches (autopost dialog, ScheduleBlock, ToneSelector, GenreSelector). The intake's primary Format/Duration choice is NOT among them.

**Recommendation:** Add `role="radiogroup" aria-labelledby="..."` on the wrapper, `role="radio" aria-checked={a===aspect}` on each button, and arrow-key navigation per ARIA Authoring Practices.

---

### M-2 — Scene list buttons lack `aria-current` / `aria-pressed` for the active scene
**Evidence:** `src/components/editor/ScenesColumn.tsx:82-94` — the active scene is communicated only via background tint (`bg-[#151B20]`) and a left-edge bar. Screen-reader users hear every scene as an identical button. The codebase uses `aria-current` in two other places (`AppSidebar.tsx`, `_LabLayout.tsx`) — the editor surface should be brought to parity.

**Recommendation:** Add `aria-current={isActive ? 'true' : undefined}` and an accessible name combining position + status (e.g., `aria-label="Scene 3 of 12, narrating, currently selected"`).

---

### M-3 — Mobile landing nav uses `<button>` for in-page anchors
**Evidence:** `src/pages/Landing.tsx:173-202` — the mobile menu items are `<button onClick={...scrollIntoView...}>`. Compare with the desktop nav at `:101-114`, which correctly uses `<a href="#features">`.

**Impact:** Right-click "Open in new tab" doesn't work; screen-reader users hear "button" instead of "link"; URL hash never updates so deep-linking breaks.

**Recommendation:** Use `<a href="#features">` and intercept the click for the smooth-scroll + focus-restore behavior. Falls back gracefully if JS is off.

---

### M-4 — Dialog primitive does not require `<DialogDescription>`; Demo modal omits it
**Evidence:** `src/components/ui/dialog.tsx:30-52` — DialogContent does not require a description. Radix logs a runtime warning when none is provided. The Watch Demo modal (`Landing.tsx:511-543`) ships with only a DialogTitle. Same pattern in several admin/lab dialogs.

**Impact:** Screen-reader users get "MotionMax — 90-second demo, dialog" with no description of what's inside the dialog body. WCAG 4.1.2 requires the dialog has an accessible name, which is met — but the ARIA Authoring Practices spec recommends a description for non-trivial dialogs.

**Recommendation:** Either pass `aria-describedby={undefined}` explicitly to silence the warning AND add a visually-hidden `<DialogDescription>` per dialog with a one-line summary, OR (preferred) add a sr-only DialogDescription inside the demo modal copy.

---

### M-5 — Caption preview in Stage is sighted-only; no `<track kind="captions">` on the video
**Evidence:** `src/components/editor/Stage.tsx:699-714, 656-666` — the player renders a styled `<div>` overlay with caption text derived from `audio.currentTime`. There is no `<track>` element on the `<video>`, so screen readers and assistive captioning tools cannot interrogate it.

**Impact:** WCAG 1.2.2 Captions (Prerecorded) — the editor preview is functionally a video player and should expose captions in a programmatic way. Sighted users see a styled overlay; deaf-blind users with refreshable Braille get nothing. (In the rendered/exported video the captions are burned in — also a 1.2.2 problem because burned captions cannot be turned off.)

**Recommendation:** Generate a WebVTT track from the same word-window data in the caption-sync effect and attach `<track kind="captions" srclang={state.intake.languageCode} default>` when captions are on. Bonus: this also lets users with high-contrast OS settings use their own caption styling.

---

### M-6 — Skip-link target appears AFTER the modal trigger but the modal opens *over* it
**Evidence:** `src/pages/Landing.tsx:92-95`, `:511-543`. Skip link points to `#main-content`, which is fine. But pressing Tab from the skip link advances into the first hero CTA — and the demo modal `<Dialog open={demoModalOpen}>` is rendered at the very bottom of the JSX tree. When opened, Radix portal'd content steals focus correctly, but if the user has already pressed Skip-to-content and then opens the demo modal, on close, focus returns to the trigger — which is fine. **Actual issue:** the global `SubscriptionRenewalModal` and `V2AnnouncementModal` are mounted in `App.tsx:97-101` *outside* any Suspense boundary and may auto-open before the lazy-loaded route renders, racing focus with the page-level skip link.

**Recommendation:** Verify announcement modal does not steal focus during initial route load; if it does, hold its `open` state until `mounted && !pageLoading`.

---

### M-7 — `text-amber-700` rate-limit hint uses non-brand colors and is not announced
**Evidence:** `src/pages/Auth.tsx:460-464`
```tsx
<p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 ...">
  Too many failed attempts? You may be temporarily rate-limited. ...
</p>
```
1. Uses Tailwind amber palette in a no-orange brand. (Brand violation; Halo flags because color is also a usability signal — the user can't distinguish this from a destructive amber state.)
2. The hint is a plain `<p>` — no `role="alert"` or `aria-live`. Screen-reader users get no announcement when this state changes.

**Recommendation:** Re-skin to brand gold per the design system, AND add `role="alert"` so it auto-announces when it appears.

---

### M-8 — Sidebar `<aside>` and primary `<nav>` lack accessible names
**Evidence:** `src/components/dashboard/Sidebar.tsx:283, 313` — `<aside className="...">` and `<nav className="...">` carry no `aria-label`. With multiple landmarks on each page (sidebar + topbar + main + footer), screen-reader users navigating by landmark get "navigation, navigation" with no way to disambiguate.

**Recommendation:** `<aside aria-label="Workspace sidebar">` and `<nav aria-label="Studio">` (or similar). The mobile drawer's `SheetTitle` already covers the drawer instance — only the always-mounted desktop sidebar needs this.

---

### M-9 — Toggle-fullscreen and similar icon-buttons announce stale state
**Evidence:** `src/components/editor/Stage.tsx:587-602` — `aria-label="Toggle fullscreen"` is **static**, while the visible `title` switches between "Exit fullscreen" and "Fullscreen". Screen-reader users always hear the same label, regardless of whether they're in fullscreen.

Same pattern is correct in Landing.tsx (`menuToggleRef` swaps between "Open menu" / "Close menu") — so the team knows the right pattern; it's just not applied uniformly.

**Recommendation:** Make `aria-label` reflect the **action** the click performs given current state: `aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}`. Or better: use `aria-pressed={isFullscreen}` and a single `aria-label="Fullscreen"`.

---

## MINOR

### m-1 — Hero badges over translucent video frames have variable contrast
**Evidence:** `src/components/editor/Stage.tsx:558-562` — aspect chip `text-[#ECEAE4]` on `bg-[#10151A]/80` (80% opacity over the gradient stage). Computed against worst-case backdrop (a bright generated frame), contrast can dip below 4.5:1.
**Recommendation:** Add a stronger backdrop-blur or solid backplate behind chips that overlay user-generated imagery.

### m-2 — `<a>` tags styled without `text-decoration: underline` rely on color alone in body copy
**Evidence:** `src/pages/Auth.tsx:43-45` — `<a className="underline hover:text-muted-foreground">` is correctly underlined. **But** in `LandingFooter`, `LandingPricing`, and several FAQ rows, anchors styled with `text-primary` and `hover:underline` only show the underline on hover — fails WCAG 1.4.1 in body text.
**Recommendation:** Audit all in-text links for a permanent visual indicator (underline, icon, or sufficient contrast difference >3:1 from surrounding text plus a focus indicator).

### m-3 — Sidebar `<button>` for kebab menus has icon-only label that's hidden by default opacity
**Evidence:** `src/components/dashboard/Sidebar.tsx:482-489` — `opacity-0 group-hover:opacity-100 focus:opacity-100`. When tabbed to via keyboard, the focus ring should fire because of `focus:opacity-100` — confirmed. But touch-screen users without hover have no way to discover the kebab. WCAG 2.5.7 (pointer dragging) and 2.4.7 (focus visible) both pass; but discoverability is a usability gap (not strictly WCAG).
**Recommendation:** On touch devices (`@media (hover: none)`), keep the kebab at opacity-100 always.

### m-4 — Form error messages clear `aria-describedby` link before the user reads it
**Evidence:** `src/pages/Auth.tsx:362-367, 398` — `aria-describedby={errors.email ? "email-error" : undefined}` is removed as soon as the user starts typing again. With slow screen readers (NVDA buffering), the description may not have been read yet when it disappears.
**Recommendation:** Keep the describedby link stable; clear the message text on input instead. Or better: delay the error clear until blur-without-correction.

### m-5 — Decorative SVGs use `aria-hidden="true"` correctly; raster decorative images sometimes use `alt=""` *and* `aria-hidden="true"` (redundant)
**Evidence:** `src/pages/Landing.tsx:234-241`. Not a violation, just redundancy that adds noise to maintenance.
**Recommendation:** Pick one signal — `alt=""` is sufficient and idiomatic.

---

## POLISH

### P-1 — No automated a11y CI check is wired up
The project has Lighthouse config (`lighthouserc.cjs`) and Vitest, but no axe-core in test or pa11y in CI. Without a regression gate, any of the C-class findings will recur.
**Recommendation:** Add `@axe-core/playwright` to e2e tests against the top 5 routes (Landing, Auth, Dashboard, Editor, Intake).

### P-2 — Sonner toaster is fine; consider explicit `richColors` opt-out for destructive intents
The `<Sonner />` mount at `App.tsx:89` uses defaults. Sonner's default `richColors=false` means error toasts render in the same neutral background as success — losing a visual cue. Since the brand bans red, the existing approach is consistent, but consider a stronger non-color signal in error toasts (icon + bold).

---

## Out-of-scope / Could-not-verify

- **Live screen-reader testing**: this audit is source-only. NVDA/VoiceOver/TalkBack runs against the running app are required to fully close C-1, C-6, M-2, M-9. Recommend Halo or a peer reviewer record a 5-minute SR pass through the Sign-up → Intake → Editor flow before final ship sign-off.
- **Forced-colors mode (Windows High Contrast)**: not testable from source alone — token-driven theming usually fares okay, but the heavy use of hard-coded hex (`text-[#5A6268]`) bypasses `forced-color-adjust` and may render invisibly. Halo to verify on a Windows host post-fix.
- **Touch-target sizes in production**: spot-checks (Timeline transport: 44 px on mobile, 28 px desktop — passes WCAG 2.5.5 at the relevant breakpoint) look correct. Some tertiary controls (kebab `w-6 h-6` = 24 px in `Sidebar.tsx:486`) sit below the 24 px AAA floor and the 44 px AA mobile floor — flagged here, but verification needs an actual device.
- **Embedded Guidde iframe** (`Landing.tsx:332-341`): third-party content. Title attribute is present (good). Halo cannot audit content inside the iframe — ensure Guidde's player meets WCAG 1.2.2/1.2.5 independently or replace before launch.

---

## Top 3 actions to unlock PASS WITH FIXES

1. **Fix the muted text token (C-3)** — single token swap fixes contrast for ~30 files. Token bump from `#5A6268` to `#8A9198` (already a brand-approved color in the palette) restores 5.7:1 across all the affected surfaces.
2. **Fix IntakeForm labels & sliders (C-1, C-2)** — make `htmlFor` required at the IntakeLabel type level; add `id`/`aria-labelledby`/`aria-valuetext` to IntakeSlider. Self-contained edit, ~30 minutes.
3. **Add `<MotionConfig reducedMotion="user">` at the App root (C-7)** — single-line change that flips the entire framer-motion footprint into a respectful default for vestibular users. Then revisit any motion that should remain.

Closing C-1 through C-3 plus C-7 takes the verdict from FAIL to **PASS WITH FIXES**, with C-4/C-5/C-6 as non-shippers that need to land before launch but are bigger lifts.

---

**FROM:** Halo (Audit)
**TO:** Jury (Audit)
**RE:** AUDIT — motionmax — 2026-05-10
**STATUS:** Review

7 Critical, 9 Major. Recommended verdict: **FAIL** until C-1, C-2, C-3 and C-7 are closed; remediation path is clear and self-contained. Re-audit by Halo required after Access lands the fixes — particularly with a screen-reader run through the Auth → Intake → Editor flow.
