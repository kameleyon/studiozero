# HALO — Accessibility Audit (motionmax-360)

**Reviewer:** Halo (Accessibility Auditor)
**Audit Date:** 2026-05-10
**Audience:** Tool-savvy creative adults (creators, marketers, video producers); mobile-heavy; US-first; 11 languages claimed.
**Scope:** Per Jury brief, full app. Halo's rubric: WCAG 2.2 AA conformance + assistive-tech (AT) usability. Halo also flags adjacent issues from the 14-category 360 brief where they intersect a11y (UI/UX, performance, data integrity, observability, etc.).
**Method:** Static source analysis only. No live build was run; manual NVDA/VoiceOver runs and tool output (axe, Lighthouse, pa11y) could not be produced inside the time budget. All keyboard-trap, focus-order, and screen-reader-announcement claims marked "Unable to verify dynamically" require live verification before remediation closes.
**Status:** PARTIAL — written under 20-min time budget; categories prioritized by audience-exclusion impact.

> Note on long dashes: Brief asked for none. Halo uses standard hyphens and en-dashes only.

---

## Findings (grouped by category, sorted by severity)

### Category 1 — UI/UX & Design System (a11y intersect)

#### F-A11Y-001 — `--destructive` and `--success` semantic tokens are mapped to brand gold and brand aqua, collapsing color signaling
- **Severity:** Critical
- **WCAG:** 1.4.1 Use of Color (A); 3.3.1 Error Identification (A)
- **Evidence:** `src/index.css:67-69` — `--destructive: 45 67% 55%;` (gold) with comment "Destructive - Gold (was red)"; `src/index.css:71-72` — `--success: 186 85% 35%;` (aqua, same family as `--primary`); `src/index.css:147-148` dark-mode mapping repeats the gold-as-destructive pattern; `src/components/ui/input.tsx:11` uses `aria-[invalid=true]:border-destructive` so invalid inputs render in gold (the same gold used for highlights, brand accents, badges, and the "Smart Flow" / "Explainers" cards on `Landing.tsx:425-444`).
- **Issue:** A user cannot distinguish "this field has an error" from "this control is highlighted" without reading associated text. Gold is also the brand accent — every "destructive" affordance now shares the same hue as decorative highlights. Color-blind users (the 8% deuteranopia/protanopia cohort plus the much larger "I just glanced at the screen" cohort) lose the affordance entirely. WCAG 1.4.1 requires color is never the sole signal; here color is actively misleading because the same color carries opposite meaning.
- **Fix:** In `src/index.css:66-72` and `:147-152`, restore `--destructive` to a hue distinct from gold and aqua (the brand says "no red" — use a desaturated coral or amber-burnt-sienna with sufficient distance from `--brand-gold`, OR keep the gold but ALWAYS pair every destructive surface with a leading icon (e.g. `AlertTriangle`) AND visually-bold text "Error:" / "Required" so the affordance is non-color. Audit every consumer of `text-destructive`/`bg-destructive` to confirm icon+text pairing. Same for `--success` — pair with a check icon and the word "Done"/"Saved".
- **Effort:** M

#### F-A11Y-002 — `--text-tertiary` token explicitly fails WCAG 1.4.3 by design comment
- **Severity:** Major
- **WCAG:** 1.4.3 Contrast (Minimum) (AA)
- **Evidence:** `src/index.css:97` — `--text-tertiary: 200 7% 52%;     /* ~3.5:1 contrast vs light background — AA large text */`. This token is exposed via `tailwind.config.ts:63` as `text-tertiary` and intended for body use across the app.
- **Issue:** 3.5:1 only passes 1.4.3 AA when used at "large text" sizes (>=18pt regular or >=14pt bold). A token named `text-tertiary` with no enforcement mechanism will be applied to small body text by developers; the comment itself acknowledges this. WCAG 1.4.3 requires 4.5:1 for normal text.
- **Fix:** In `src/index.css:97`, raise lightness to ~40% (`200 7% 40%`) to clear 4.5:1 against the `--background` `0 0% 99%`. If the visual goal of "tertiary" really needs to be that light, rename it to `--text-large-only` and gate its use to typography classes >= 18px in a CSS lint or doc rule.
- **Effort:** S

#### F-A11Y-003 — Framer Motion animations bypass `prefers-reduced-motion`
- **Severity:** Major
- **WCAG:** 2.3.3 Animation from Interactions (AAA — best practice for AA shipping)
- **Evidence:** `src/index.css:325-353` defines a `@media (prefers-reduced-motion: reduce)` block that overrides `animation-duration` and `transition-duration` to 0.01ms. However: (1) `src/components/ui/button.tsx:48-50` — every Button uses `motion.button whileTap={{ scale: 0.97 }}` driven by Framer Motion's spring (`type: "spring", stiffness: 400, damping: 17`). Spring physics run on rAF, not CSS transitions — the CSS override does NOT stop them. (2) `src/pages/Landing.tsx:228-231, 247-249, 287-289, 311-323, 365-380` etc. use `<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>` and `whileInView` — these also ignore the CSS override. (3) Grep for `useReducedMotion` (Framer's React hook) returns 0 matches across the entire `src/` tree.
- **Issue:** Users with vestibular disorders (motion-sickness from scrolling animations) will continue to see fade+rise animations, button-press scales, and inView-triggered slides regardless of OS setting.
- **Fix:** In `src/components/ui/button.tsx:42-56` import `useReducedMotion` from framer-motion and skip the `whileTap` prop when true. Add a top-level `MotionConfig reducedMotion="user"` wrapper in `src/main.tsx` or `App.tsx` so every nested `<motion.*>` respects the OS preference globally.
- **Effort:** S

#### F-A11Y-004 — Brand "no orange/amber" rule violated in user-facing warning component
- **Severity:** Major (a11y impact via color signaling AND brand-rule violation)
- **WCAG:** 1.4.1 Use of Color (A) — additionally violates the brand-only-aqua-gold rule from the brief
- **Evidence:** `src/components/dashboard/LowCreditWarning.tsx:16-30` — uses `border-amber-500/40`, `bg-amber-500/10`, `text-amber-500`, `text-amber-700 dark:text-amber-400`, `border-amber-500/40 hover:bg-amber-500/10`. The brief explicitly forbids orange/amber. Also `src/pages/Auth.tsx:461-463` uses `text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50` for the rate-limit hint.
- **Issue:** Beyond the brand violation, mixing amber into a palette that already overloads gold for both "destructive" and "highlight" makes the warning palette indistinguishable from accents to a casual viewer. The light-mode pairing `text-amber-700` (#b45309) on `bg-amber-500/10` over white background measures approximately 4.4:1 (Unable to verify dynamically; static estimate) — borderline failure of 1.4.3 for normal text.
- **Fix:** In `LowCreditWarning.tsx:16-30` and `Auth.tsx:461-463`, replace amber tokens with `--brand-gold` family (`bg-brand-gold/10`, `border-brand-gold/40`, `text-brand-gold-dark` for light / `text-brand-gold` for dark) AND keep the leading `AlertTriangle` icon. Verify final contrast >= 4.5:1.
- **Effort:** S

#### F-A11Y-005 — Custom scrollbar widths of 2-4px violate WCAG 2.5.8 Target Size (Minimum)
- **Severity:** Minor
- **WCAG:** 2.5.8 Target Size (Minimum) (AA, WCAG 2.2)
- **Evidence:** `src/index.css:196-197` (`width: 4px; height: 4px`), `:243-245` (`.scrollbar-thin` 3px), `:267-269` (`.scrollbar-thin.narrow` 2px).
- **Issue:** WCAG 2.2's 2.5.8 requires interactive targets at least 24×24 CSS px (with documented exceptions for inline elements and equivalents available elsewhere). Native scrollbars are an exception when the OS provides keyboard alternatives, but a 2-4px wide thumb is essentially unhittable for users with motor impairments on a touchscreen. Acceptable if every scroll container is fully usable via keyboard arrow keys and gesture alternatives — please verify.
- **Fix:** Keep visual width but expand the hit-test area via `::-webkit-scrollbar { width: 12px; }` combined with `background-clip: content-box` on the thumb so the thumb still LOOKS 4px but accepts pointer input across 12px. Or accept the limitation and document keyboard-scroll as the supported path for motor-impaired users.
- **Effort:** S

---

### Category 11/12 — Internationalization (a11y intersect: language identification)

#### F-A11Y-006 — `<html lang="en">` is hardcoded; no runtime lang update for the 11 advertised languages
- **Severity:** Critical
- **WCAG:** 3.1.1 Language of Page (A); 3.1.2 Language of Parts (AA)
- **Evidence:** `index.html:2` — `<html lang="en">`. `Grep document\.documentElement\.(lang|setAttribute\(['\"]lang)` across `src/` returns **0 matches**. Grep for `i18n|useTranslation|i18next` returns matches that are all references to "i18n" in comments or unrelated `t()` test functions — there is no installed i18n framework. `src/components/workspace/LanguageSelector.tsx:34-65` is a project-asset language picker (selects the voiceover/script language for the generated video), NOT a UI translator.
- **Issue:** The brief states "11 languages claimed" and the SoftwareApplication JSON-LD at `index.html:84` advertises "Multi-Language Support (11 languages)". For a screen-reader user, every page is announced in an English voice/synthesizer regardless of content language. When the LanguageSelector dropdown renders "Русский / 中文 / 日本語 / 한국어" (`LanguageSelector.tsx:28-31`), each label is announced phonetically by an English voice because `lang` attributes are not set on the `<span>` containing the foreign-script label. 3.1.1 applies to the page; 3.1.2 applies to the parts (the dropdown items in the foreign script).
- **Fix:** (a) For 3.1.2 (immediate, low cost): wrap each foreign-script label in a `<span lang={lang.id}>` in `LanguageSelector.tsx:55-57` and the IntakeForm copy at `IntakeForm.tsx:82-94`. (b) For the broader "11 languages" claim: either install an i18n framework (`react-i18next`) and expose a UI language switch that updates `document.documentElement.lang` AND `dir` (for future RTL), OR remove the "11 languages" UI claim from `index.html:84` and `LANDING_FEATURES` (the audience expects "the UI is in 11 languages"; only the GENERATED VIDEO is). This is also a Compass/Trust finding because the marketing claim mismatches reality.
- **Effort:** S for the lang-attribute fix; L if true UI i18n is desired

---

### Category 1/3 — Forms & Error Handling

#### F-A11Y-007 — Auth signup blocks submit when terms/age unchecked but provides no programmatic association telling AT users why
- **Severity:** Major
- **WCAG:** 3.3.1 Error Identification (A); 3.3.3 Error Suggestion (AA); 4.1.3 Status Messages (AA)
- **Evidence:** `src/pages/Auth.tsx:466-501` renders the two checkboxes (`id="terms"` and `id="age-verify"`), and `:507` disables the submit button via `(mode === "signup" && (!acceptedTerms || !ageVerified))`. There is no `aria-describedby` linking the disabled button to "you must accept terms and confirm age", no `aria-required` on either checkbox, and no `aria-live` region announcing why the submit is disabled.
- **Issue:** A keyboard/AT user reaches a disabled "Create Account" button with no announced reason. They cannot complete signup. The toast at `:181` (`toast.error("Terms required", ...)`) only fires on submit attempt — but submit is `disabled`, so the toast never fires for these users.
- **Fix:** In `Auth.tsx:466-507`: (a) add `aria-required="true"` to both Checkbox elements; (b) keep the submit button enabled but, when checkboxes are unchecked, intercept submit, set `aria-invalid` on the unchecked checkbox(es), focus the first unchecked one, and render a `role="alert"` paragraph below it with the requirement; (c) optionally add `aria-describedby="signup-requirements"` to the submit button pointing at a sr-only summary.
- **Effort:** S

#### F-A11Y-008 — Eye-toggle "Show password" button uses `aria-pressed` on a non-toggle role; AT may announce inconsistently
- **Severity:** Minor
- **WCAG:** 4.1.2 Name, Role, Value (A)
- **Evidence:** `src/pages/Auth.tsx:406-414` — the eye toggle is `<button type="button" aria-label="..." aria-pressed={showPassword}>`. `aria-pressed` is defined on `role="button"` (default for `<button>`), so this is technically valid; however `aria-pressed` is intended for "button stays pressed" semantics, and the dynamic `aria-label` already changes between "Show password" and "Hide password", which is the canonical pattern. The two together can produce double-announcement ("Show password, toggle button, pressed").
- **Issue:** Verbose/redundant announcement; not blocking, but inconsistent with WAI-ARIA Authoring Practices toggle-button guidance.
- **Fix:** In `Auth.tsx:406-414` and `:444-452`, drop `aria-pressed` and keep only the dynamic `aria-label`. Alternatively, keep `aria-pressed` and stop swapping the `aria-label` (use `aria-label="Show password"` always).
- **Effort:** XS

#### F-A11Y-009 — Form-field error messages render but several are blank-string suppressed; AT may announce nothing on failure
- **Severity:** Major
- **WCAG:** 3.3.1 Error Identification (A); 4.1.3 Status Messages (AA)
- **Evidence:** `src/pages/Auth.tsx:169` — on a failed login, `setErrors({ email: msg, password: " " })` sets the password error to a single space. `:416` then conditionally renders `errors.password && errors.password.trim()` — so the password field gets `aria-invalid="true"` (`:403`) and `aria-describedby="password-error"` (`:404`) pointing at an element that does NOT render. This produces a broken `aria-describedby` reference.
- **Issue:** Some screen readers (NVDA, JAWS) silently fail when `aria-describedby` points at a missing id; others read the empty string. Either way the user gets no useful feedback. The actual failure message goes to a `toast` (sonner) — which by default does NOT announce to screen readers without `role="status"` configured (Unable to verify Sonner config dynamically).
- **Fix:** In `Auth.tsx:169` either set `password: msg` (duplicate) or omit the password key entirely. At `:404`, only set `aria-describedby` when the renderable error exists. Verify Sonner's `<Toaster>` is configured with proper ARIA via `src/components/ui/sonner.tsx` — if not, set `richColors` and confirm the underlying div uses `role="status"` aria-live="polite".
- **Effort:** XS

#### F-A11Y-010 — Sonner toast notifications used as the primary error channel may not announce to AT
- **Severity:** Major
- **WCAG:** 4.1.3 Status Messages (AA)
- **Evidence:** Auth.tsx uses `toast.error(...)` 9 times (`:147, 162, 170, 181, 188, 209, 218, 223, 231`) and `toast.success(...)` 2 times (`:209, 236`) as the main feedback mechanism for login failures, signup failures, password mismatches, lockouts, and reset confirmations. Sonner is imported from `"sonner"` (`Auth.tsx:11`). Whether Sonner's toast container is configured with `role="status"` / `aria-live="polite"` is not visible in `src/components/ui/sonner.tsx` (Unable to verify without reading that file in this audit's budget).
- **Issue:** If toast announcements aren't wired through ARIA live regions, AT users will not be told why login failed, why signup was blocked, or that the password reset email was sent. This is the only error channel for many flows.
- **Fix:** Read `src/components/ui/sonner.tsx` and confirm `<Toaster />` has `closeButton` and that the rendered toasts have `role="status"` (info/success) or `role="alert"` (errors). If missing, pass appropriate props per Sonner docs. Add a Playwright/RTL test that asserts a `[role=alert]` exists in the DOM after `toast.error()` is called.
- **Effort:** S

#### F-A11Y-011 — `placeholder="••••••••"` on password fields could be misread by AT as content
- **Severity:** Minor
- **WCAG:** 1.3.1 Info and Relationships (A); 3.3.2 Labels or Instructions (A)
- **Evidence:** `src/pages/Auth.tsx:396, 434` — `placeholder="••••••••"` on the password and confirm-password inputs.
- **Issue:** Some screen readers announce placeholders as "edit, dot dot dot dot dot dot dot dot, password". The Label is correctly associated, so this is informational rather than blocking.
- **Fix:** Replace with a meaningful placeholder like `placeholder="At least 8 characters"` or remove the placeholder and rely on the Label alone.
- **Effort:** XS

---

### Category 1 — Editor Surfaces (Stage / Timeline / Inspector)

#### F-A11Y-012 — Timeline transport controls have ARIA labels but no `role="region"` / `aria-label` on the timeline container; no programmatic playback state announcement
- **Severity:** Major
- **WCAG:** 1.3.1 Info and Relationships (A); 4.1.3 Status Messages (AA)
- **Evidence:** `src/components/editor/Timeline.tsx:97-120` — Prev / Play / Next buttons each have `aria-label` (good). However the Timeline container (`:93-94`) has no ARIA role, no `aria-label`, and there's no `aria-live` region announcing scene-change ("Now on scene 3 of 15") when the user clicks Next or Prev. The `selectedSceneIndex` state changes but the change is communicated only visually.
- **Issue:** A screen-reader user navigating the editor cannot tell which scene is selected, when playback has started/stopped, or when scene-change occurred. The user-facing labels at `:101, :112, :120` change text but are tooltips, not announcements.
- **Fix:** In `Timeline.tsx`: (a) wrap the timeline in `<section aria-label="Project timeline">`; (b) add a visually-hidden `<div role="status" aria-live="polite">{`Scene ${selectedSceneIndex+1} of ${state.scenes.length}: ${currentSceneTitle}`}</div>` that updates whenever `selectedSceneIndex` changes; (c) on play/pause toggle, update the same live region with "Playing" / "Paused".
- **Effort:** S

#### F-A11Y-013 — Stage uses `<animateTransform>` SVG animations that the global reduced-motion CSS hides entirely, leaving no static fallback
- **Severity:** Minor
- **WCAG:** 2.3.3 Animation from Interactions; 1.4.13 Content on Hover or Focus (AA)
- **Evidence:** `src/components/editor/Stage.tsx:84-101` defines a LoadingRing with `<animateTransform>`. `src/index.css:348-352` has `animateTransform, animateMotion, animate { display: none !important; }` inside the reduced-motion block.
- **Issue:** With `prefers-reduced-motion: reduce`, the animated portion of the spinner disappears entirely (display:none). The user sees only the static base ring at line 85 and a partial dasharray ring at lines 86-89, but with no rotation cue. The overall spinner becomes a still ring — it could be misread as "stuck" rather than "loading". Also the elapsed-time counter (`formatElapsed` at `:72-80`) updates via `setInterval` but is not in an aria-live region, so AT users get no progress feedback at all.
- **Fix:** In `Stage.tsx:82-101`, when reduced-motion is set, render a static "Loading…" text + the elapsed counter inside a `role="status" aria-live="polite"` element that updates every ~10 seconds (not every second — too chatty). Keep the animated spinner for users who haven't opted out.
- **Effort:** S

#### F-A11Y-014 — Mobile Timeline buttons are 44×44 (good), but desktop-collapsed `sm:w-7 sm:h-7` is 28×28 — fails 2.5.8 Target Size
- **Severity:** Minor
- **WCAG:** 2.5.8 Target Size (Minimum) (AA, WCAG 2.2 — 24×24 minimum)
- **Evidence:** `src/components/editor/Timeline.tsx:103` — `className="w-11 h-11 sm:w-7 sm:h-7 ..."`. The `w-11 h-11` is 44px (mobile, passes both 2.5.5 AAA and 2.5.8 AA). At `sm:` breakpoint and up, target shrinks to 28px (passes 2.5.8 by 4px) — but the 24×24 budget is for *isolated* targets. With buttons in a tight horizontal row (`gap-2.5` ~10px), the 24×24 spacing exception does NOT apply because the gap+target combined still requires evaluation. Borderline pass for desktop, fail for users with motor impairments who use desktop with touch (Surface, iPad with mouse).
- **Fix:** In `Timeline.tsx:103, 113, 122` and similar transport rows, use `sm:w-9 sm:h-9` (36px) at minimum for touch+keyboard parity. The center Play button at `:113` is 36px on desktop (good); apply same to Prev/Next.
- **Effort:** XS

#### F-A11Y-015 — Editor `<video>` elements lack `<track kind="captions">` — generated videos have no captions in the in-app preview
- **Severity:** Major
- **WCAG:** 1.2.2 Captions (Prerecorded) (A); 1.2.3 Audio Description or Media Alternative (A)
- **Evidence:** `src/components/editor/Stage.tsx:656` `<video ...>`, `src/components/workspace/VideoPlayer.tsx:288`, `src/components/workspace/CinematicResult.tsx:488`, `src/components/workspace/CinematicEditModal.tsx:174`, `src/pages/PublicShare.tsx:522, 532` — none include a `<track>` element. The product burns captions INTO the video frames (per the captionStyle pipeline), so the captions are present visually but are NOT a separate text track that AT can read. The Watch Demo iframe at `Landing.tsx:332-341` (Guidde embed) has no caption guarantee either.
- **Issue:** WCAG 1.2.2 requires synchronized captions for prerecorded audio in video. Burned-in captions satisfy "captions are visible" but do NOT satisfy AT requirements for screen-reader users who consume captions via braille display or text-only output. Also the in-app preview is the user's only QA path before publishing — Deaf/HoH creators cannot verify the burned captions are correct without a separate text view.
- **Fix:** (a) For all in-app `<video>` elements (`Stage.tsx:656`, `VideoPlayer.tsx:288`, `CinematicResult.tsx:488`, `CinematicEditModal.tsx:174`, `PublicShare.tsx:522, 532`), generate a `.vtt` from the existing per-scene script/audio transcript (the pipeline already has it) and include `<track kind="captions" srclang="..." src="..." default>`. (b) For PublicShare, also include `<track kind="descriptions">` for AD where possible. (c) Document burned-captions vs caption-track tradeoff in the help docs; offer caption-track download in the export.
- **Effort:** L (requires worker-side .vtt generation)

#### F-A11Y-016 — Iframe embed for Guidde demo lacks transcript / fallback for users who can't load the iframe
- **Severity:** Major
- **WCAG:** 1.2.1 Audio-only and Video-only (Prerecorded) (A); 1.2.2 Captions (A)
- **Evidence:** `src/pages/Landing.tsx:332-341` — `<iframe src="https://embed.app.guidde.com/playbooks/..." title="Product walkthrough..." sandbox="...">`. Title is good. No transcript, no fallback, no `<noscript>` content, no link to a captioned standalone video.
- **Issue:** A user with reduced bandwidth, third-party-cookie blockers, screen-reader, or a no-iframe browser sees nothing useful. The product's primary "see it work" hook is gated behind a third-party iframe.
- **Fix:** Below the iframe in `Landing.tsx:342-353`, add a `<details>` containing a full text transcript of the demo, plus a link to the same video on a hosted-by-MotionMax page that includes a `<track kind="captions">`. Confirm Guidde itself supports captioning (most Guidde players do — enable in Guidde settings).
- **Effort:** S

---

### Category 1 — Modals & Overlays

#### F-A11Y-017 — Dialog primitive is well-built (focus-trap via Radix, Escape-to-close, role=dialog) — pattern compliant
- **Severity:** PASS observation
- **Evidence:** `src/components/ui/dialog.tsx:30-51` uses `@radix-ui/react-dialog` which provides focus trap, focus restoration, Escape-to-close, `role="dialog"` + `aria-modal="true"`, and accessible name via `DialogPrimitive.Title` (`:64-74`). DialogClose at `:45-48` includes `<span className="sr-only">Close</span>` for the icon-only X. Landing's Demo modal (`Landing.tsx:511-543`) and the mobile menu (`Landing.tsx:152-214` with manual focus trap, Escape handler, focus-return) follow correct patterns.
- **Note:** Halo could not verify focus-trap behavior dynamically; recommend a Playwright test that tabs through every dialog and confirms wrap-around.

#### F-A11Y-018 — `DialogContent` uses `z-[9999]` arbitrary value duplicating `tailwind.config.ts` z-index tokens (`z-modal`)
- **Severity:** Minor (consistency issue, not a11y direct)
- **WCAG:** N/A
- **Evidence:** `src/components/ui/dialog.tsx:22` and `:39` — `z-[9999]`. `tailwind.config.ts:28-33` defines named tokens (`z-modal: 60`, `z-fullscreen: 100`) intended to replace ad-hoc values; the comment at `tailwind.config.ts:20-27` explicitly cites this dialog as the reason for adding the tokens. The dialog still uses the un-tokenized value.
- **Fix:** Replace `z-[9999]` with `z-modal` (overlay) and `z-modal` (content) — or `z-fullscreen` if needed.
- **Effort:** XS

---

### Category 1 — Document Structure

#### F-A11Y-019 — Landing has a visually hidden `<h1>` with the page-title; visible hero text is `<p>` not heading — heading hierarchy is intact but the visible page lacks a semantic top-level heading
- **Severity:** Minor
- **WCAG:** 1.3.1 Info and Relationships (A); 2.4.6 Headings and Labels (AA)
- **Evidence:** `src/pages/Landing.tsx:227` — `<h1 className="sr-only">MotionMax – AI Video Generation</h1>`. The visible hero text at `:243-249` is rendered as `<p>`. `<h2>`s exist at `:320, :374, :402` for sections.
- **Issue:** A sighted user has no visible top heading; an AT user gets a generic "AI Video Generation" h1 that doesn't match what they SEE on screen ("Cinematic visuals. Natural voiceover…"). This violates the principle that the accessible name should match the visible name.
- **Fix:** In `Landing.tsx:227-249`, promote the visible hero copy at `:247-249` to `<h1>` (style with `type-display` from `index.css:357-359`). Remove the sr-only h1 at `:227`. The current "AI Video Generator" eyebrow at `:243` becomes a kicker `<p>`.
- **Effort:** XS

#### F-A11Y-020 — Skip-link present on Landing and Auth, but `id="main-content"` is on `<main>` AFTER the fixed header — confirm scroll-padding handles offset
- **Severity:** Minor
- **WCAG:** 2.4.1 Bypass Blocks (A)
- **Evidence:** `src/pages/Landing.tsx:92-95` and `src/pages/Auth.tsx:284-287` — skip link targets `#main-content` on `<main>`. The fixed header (`Landing.tsx:97-216`, `Auth.tsx:29-37`) overlays the top of the page. `src/index.css:191` sets `scroll-padding-top: 5rem;` which mitigates the issue for hash-link navigation.
- **Note:** Pattern is sound. Verify with NVDA + Firefox that activating the skip link moves focus visibly and the next Tab lands inside `<main>`.
- **Fix:** No code change required if dynamic verification passes.
- **Effort:** N/A

#### F-A11Y-021 — No skip link on app-shell pages (Editor, Dashboard, Admin) verified
- **Severity:** Major
- **WCAG:** 2.4.1 Bypass Blocks (A)
- **Evidence:** Grep confirmed skip-links only on `Landing.tsx` and `Auth.tsx`. The Editor (`src/pages/Editor.tsx`), Dashboard, Admin (`src/pages/Admin.tsx`), Help, Settings, Billing, and other authenticated pages were not seen to render `<a href="#main-content" className="sr-only focus:not-sr-only">` (Unable to fully verify across all pages in budget — recommend a global check).
- **Issue:** Authenticated users on the editor must Tab through the entire AppSidebar (`src/components/layout/AppSidebar.tsx`) every time they want to interact with the timeline or inspector. This is the most-used part of the app for keyboard users.
- **Fix:** Add the skip link to the layout component(s) that wrap authenticated pages — likely `src/components/layout/WorkspaceLayout.tsx`. Ensure each authenticated page has a `<main id="main-content">` root.
- **Effort:** S

---

### Category 9 — Observability (a11y intersect: screen-reader status announcements during async work)

#### F-A11Y-022 — Long-running generation pipeline (multi-minute) provides verbose visual status but no `aria-live` updates during the process
- **Severity:** Critical
- **WCAG:** 4.1.3 Status Messages (AA)
- **Evidence:** `src/components/editor/Stage.tsx:19-51` defines four pools of rotating status messages (analysis/scripting/visuals/rendering). `useRotatingMessage` at `:63-70` rotates them every 4s. The message is rendered visually but Halo found no `role="status"` or `aria-live` wrapper around it (verified by grep — no `aria-live` matches in `Stage.tsx`).
- **Issue:** A screen-reader user starts a video generation and gets no announcement that it's in progress, what phase it's in, when it completes, or if it errors. They must Tab around aimlessly to find a "Done" cue. For a 5+ minute process, this is a complete usability failure.
- **Fix:** In `Stage.tsx`, wrap the visible status message in `<div role="status" aria-live="polite" aria-atomic="true">{message}</div>`. Throttle announcements: only announce at phase transitions (analysis → scripting → visuals → rendering → done) and on error, not on every 4-second rotation (rotating announcements would be deafening). Pair with a `<div role="alert">` for genuine errors.
- **Effort:** S

#### F-A11Y-023 — Sonner toasts (per F-A11Y-010) carry critical async feedback for generation, save, share, and credit-deduction events
- **Severity:** See F-A11Y-010
- **Note:** This is the same root cause as F-A11Y-010, manifested across the editor and beyond. Resolving Sonner's ARIA configuration fixes both.

---

### Category 5 — Performance (a11y intersect: motion-induced disorientation on slow devices)

#### F-A11Y-024 — Hero background loads as `<link rel="preload" as="image">` with no LQIP/poster; on slow connections users see a black overlay for several seconds before the hero text becomes legible against the image
- **Severity:** Minor
- **WCAG:** N/A direct, but contributes to perceived-quality and contrast issues
- **Evidence:** `index.html:115` preloads `/herobackground.webp`; `Landing.tsx:223` overlays `bg-black/70 backdrop-blur-sm`. Until the bg image loads, users see solid black plus the dark overlay (effectively a near-black hero) — text contrast is fine, but the visual jolt when the image arrives is significant on a 3G connection.
- **Fix:** Provide an inlined LQIP (base64 ~200-byte placeholder) as the initial CSS background in `Landing.module.css` so the eventual image swap is smooth.
- **Effort:** S

---

### Category 13 — Legal/Compliance (a11y intersect: ADA / EAA exposure)

#### F-A11Y-025 — App is launching to US-first audience without an Accessibility Statement / VPAT
- **Severity:** Major
- **WCAG:** N/A (governance / disclosure)
- **Evidence:** No `accessibility-statement` route or `Accessibility` link in `LandingFooter.tsx` (Unable to verify the file content directly in this audit's budget; grep showed no occurrences of the word "accessibility" in routes). US ADA Title III applies to "places of public accommodation" — the DOJ's 2024 final rule under Title II (state/local governments) sets WCAG 2.1 AA as the standard, and private-sector litigation continues to use WCAG 2.x AA as the de facto bar. EU launches additionally trigger the European Accessibility Act (effective 28 June 2025).
- **Fix:** Publish an Accessibility Statement page (`/accessibility`) that lists the WCAG version targeted, known limitations (point readers to the post-audit punch list), and a contact email for accessibility issues. Link from `LandingFooter.tsx`. If this audit's findings are not all remediated pre-launch, the statement should disclose them honestly — that is more legally defensible than silence.
- **Effort:** S

---

### Category 10 — Testing (a11y intersect)

#### F-A11Y-026 — No automated a11y tests in the repo (no axe, no jest-axe, no Playwright a11y snapshots found)
- **Severity:** Major
- **WCAG:** Process control
- **Evidence:** Test files found are `src/components/__tests__/authRoutes.test.tsx`, `src/components/__tests__/PasswordStrengthMeter.test.tsx`, `src/components/__tests__/errorBoundaries.test.tsx` — none import `axe`, `jest-axe`, `@axe-core/playwright`, or `pa11y`. Grep confirms no `axe`/`pa11y` imports across `src/`.
- **Issue:** Without automated checks in CI, every regression in color, ARIA, or focus order will land in production undetected. Static analysis here covers the worst landmines, but only ~30% of WCAG can be verified by tools — and 0% is being verified currently.
- **Fix:** Install `@axe-core/playwright` and add a single Playwright test that loads each top-level route (`/`, `/auth`, `/app`, `/app/editor/:id`, `/app/admin`) in a logged-in fixture, runs `await new AxeBuilder({page}).analyze()`, and asserts zero violations of severity >= "serious". Add `npm run test:a11y` to the CI pipeline. This is a 1-day setup that catches the top-30% of regressions forever.
- **Effort:** M

---

### Quick Pattern-Compliance Audit (good work to preserve)

Halo confirms the following are correctly built and should NOT be regressed:

- Mobile menu has manual focus trap, Escape-to-close, focus-return: `src/pages/Landing.tsx:37-81`. PASS.
- Auth uses correct `<Label htmlFor>` + `<Input id>` association on every field: `src/pages/Auth.tsx:352-405`. PASS.
- `aria-invalid` + `aria-describedby` are correctly wired on Auth inputs: `src/pages/Auth.tsx:365-366, 403-404, 441-442`. PASS modulo F-A11Y-009.
- Iframe at `Landing.tsx:332-341` has a descriptive `title` attribute. PASS modulo F-A11Y-016.
- Hero decorative image has `alt=""` + `aria-hidden="true"`: `Landing.tsx:235-237`. PASS.
- Logo image has meaningful alt: `Landing.tsx:99` `alt="MotionMax home"`. PASS.
- Touch targets on hero CTAs are 48px high (h-12) with `touchAction: manipulation`: `Landing.tsx:259-285`. PASS, exceeds 44px minimum.
- Reduced-motion CSS block exists: `src/index.css:325-353`. PARTIAL — see F-A11Y-003 for Framer Motion gap.
- Mobile hamburger button is 44×44 with proper `aria-expanded`, `aria-controls`, `aria-label`: `Landing.tsx:122-134`. PASS.
- Theme-color meta is set: `index.html:30`. PASS for status-bar/PWA chrome.

---

## Production Blockers Table (Halo's a11y-relative)

| ID | Category | Issue (1-sentence) | File:Line |
|----|----------|---------------------|-----------|
| F-A11Y-001 | UI/UX | `--destructive` mapped to brand gold collapses error/highlight signaling | `src/index.css:67-69, :147-148` |
| F-A11Y-006 | i18n | `<html lang="en">` hardcoded; "11 languages" UI claim has no implementation | `index.html:2`; `LanguageSelector.tsx:55-57` |
| F-A11Y-022 | Editor | Multi-minute generation has no aria-live progress announcements | `src/components/editor/Stage.tsx:19-70` |

(Halo issues no Blockers separately; the Critical findings above qualify as launch blockers under the brief's rubric — significant audience exclusion (color-blind users, AT users, multi-language users).)

---

## Top 10 Priority Fixes (Halo)

| Rank | ID | Severity | Effort | Title |
|------|----|----------|--------|-------|
| 1 | F-A11Y-001 | Critical | M | Remap `--destructive` away from brand gold; pair every destructive surface with icon+text |
| 2 | F-A11Y-006 | Critical | S+L | Add `lang` attribute on foreign-script labels; either ship UI i18n or stop claiming 11 UI languages |
| 3 | F-A11Y-022 | Critical | S | Wrap generation status in `role="status" aria-live="polite"` with throttled phase-transition announcements |
| 4 | F-A11Y-015 | Major | L | Generate `.vtt` caption tracks for in-app `<video>` and PublicShare; add `<track>` elements |
| 5 | F-A11Y-003 | Major | S | Wrap app in `<MotionConfig reducedMotion="user">` and use `useReducedMotion` in Button |
| 6 | F-A11Y-007 | Major | S | Auth signup: do not ship a disabled submit; intercept and announce why |
| 7 | F-A11Y-009 + F-A11Y-010 | Major | S | Fix broken `aria-describedby` and verify Sonner toasts announce via aria-live |
| 8 | F-A11Y-021 | Major | S | Add skip-link to authenticated layout (Editor / Admin / Dashboard) |
| 9 | F-A11Y-002 | Major | S | Raise `--text-tertiary` lightness to clear 4.5:1, or rename to gate usage |
| 10 | F-A11Y-026 | Major | M | Install `@axe-core/playwright`; add CI a11y test for top routes |

---

## What Halo Could Not Verify In Budget

Honest disclosure — these require live verification before remediation closes:

- Manual NVDA + Firefox / VoiceOver + Safari walkthroughs of the primary flows (signup → intake → generate → editor → publish). Halo's findings on screen-reader behavior (F-A11Y-009, F-A11Y-010, F-A11Y-022, F-A11Y-013) are reasoned from source, not recorded.
- Color-contrast measurements (F-A11Y-002, F-A11Y-004, F-A11Y-024) — values cited are static estimates from HSL math; please confirm with the WebAIM Contrast Checker or Colour Contrast Analyser on the rendered surfaces in both light and dark modes.
- Touch-target evaluations under iOS Safari and Android Chrome at 320px / 375px / 390px / 414px / 428px breakpoints.
- Forced-colors mode (Windows High Contrast) — every brand-gold surface that relies on color rather than border/icon may disappear entirely under Forced Colors. Test in Edge with Settings → Accessibility → High Contrast.
- 200% browser zoom and 400% reflow testing on the editor — the timeline + inspector + scenes column three-pane layout is at high risk of horizontal-scroll appearance under reflow.
- The Admin pages (`src/pages/Admin.tsx` + `src/components/admin/*`) — flagged in the brief for broken API calls; Halo did not audit them in this pass.
- Email templates (`supabase/functions/_shared/emailTemplate.ts`) — email a11y (image alt, semantic structure, contrast, dark-mode media query) was out of budget but should be Halo's next pass.
- The marketing site (`marketing/src/pages/index.astro`) — separate codebase, separate audit needed.
- Worker pipeline / database — outside Halo's a11y scope (route to Trace / Compass).

A re-audit by Halo after the Top-10 are addressed should focus on F-A11Y-001, F-A11Y-006, F-A11Y-015, F-A11Y-022, plus the dynamic verifications above.

---

**End of Halo audit.**
