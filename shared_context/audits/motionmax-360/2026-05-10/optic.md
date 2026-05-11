# OPTIC — UX/UI Audit — motionmax-360 — 2026-05-10

**Auditor:** Optic (UX/UI)
**Scope:** Heuristic audit of layout, navigation, hierarchy, interaction friction, mobile readiness, state coverage, theme/color violations, and storytelling-removal remnants. Audience-relative scoring against the brief's defined audience: tool-savvy creative adults, mobile-heavy, 11 languages, US-first.
**Method:** Static analysis of `C:\Users\Administrator\motionmax` (no live build available to this auditor — every finding cites file:line evidence; UI claims that require runtime measurement are flagged "Unable to verify from static analysis").
**Heuristics applied:** Nielsen 1-10 (H1-H10), Fitts, Hick, Apple HIG (44px), Material (48dp), iOS dvh + safe-area, brand-guide aqua #14C8CC + gold #E4C875 only.

---

## Category 1 — UI/UX & Design System

### Blocker

**1.1  Storytelling product still advertised on the in-app landing page** — H4 (consistency), H1 (visibility of system status)
- Issue: The "Visual Stories" mode card is still rendered as one of the four primary product modes on the public landing page, but the brief states the Storytelling product is being removed. New visitors will sign up expecting a feature that does not exist.
- Evidence: `src/pages/Landing.tsx:431-436` — entry titled "Visual Stories" with description, example, and color in the "4 Ways to Create" grid.
- Fix: remove the "Visual Stories" card from the `[{ title: "Cinematic" ... }, ...]` array at `src/pages/Landing.tsx:411-446`; rebalance the grid from `md:grid-cols-2` to a 3-card layout if only 3 modes ship.
- Effort: XS

**1.2  Storytelling remnants in marketing SEO + dashboard + speaker selector** — H4 (consistency)
- Issue: SEO metadata, projects gallery filters, and speaker selector still reference the storytelling product. Search engines and authenticated users will see promised functionality that has been removed.
- Evidence: grep matches in `src/components/landing/SeoHead.tsx`, `src/components/dashboard/ProjectsGallery.tsx`, `src/components/workspace/SpeakerSelector.tsx`.
- Fix: remove all storytelling/visual-stories strings, types, filter-options, and routes from the three files above. Add a follow-up grep gate to CI: `grep -ri "storytell\|visual.stor" src/ && exit 1`.
- Effort: S

### Critical

**1.3  Fabricated social-proof number with self-incriminating TODO ships in production** — H10 (help/recovery), trust
- Issue: Hero displays "Used by 2,400+ marketers" and "Join 2,400+ creators" with an inline `// TODO: replace 2,400+ with a real figure from your analytics/DB`. For a US-first launch with FTC endorsement-guidance exposure, this is a falsifiable trust claim with a paper trail in source.
- Evidence: `src/pages/Landing.tsx:289` ("Used by 2,400+ marketers"), `src/pages/Landing.tsx:299-302` (TODO + repeated number).
- Fix: replace with a non-falsifiable line such as "Built for marketers, creators, and producers" until a verified count exists; OR pull the number from an analytics endpoint. Remove the TODO line so the placeholder cannot ship again.
- Effort: XS

**1.4  Brand-color drift: hardcoded teal and ochre that are not the brand aqua/gold** — Brand-guide violation, H4 (consistency)
- Issue: Two of the four product-mode cards use hex colors that are NOT the spec colors (aqua #14C8CC + gold #E4C875). `#0D99A8` is a darker teal; `#D4A929` is a darker gold. Cards mix three shades of teal and two shades of gold, breaking visual hierarchy.
- Evidence: `src/pages/Landing.tsx:434-435` (`from-[#0D99A8]/20`, `hover:border-[#0D99A8]/40`); `src/pages/Landing.tsx:442-443` (`from-[#D4A929]/20`, `hover:border-[#D4A929]/40`).
- Fix: swap `#0D99A8` for `#14C8CC` and `#D4A929` for `#E4C875` (saved memory: `feedback_motionmax_brand_gold` confirms gold is `#E4C875`, aqua is `#14C8CC`).
- Effort: XS

**1.5  Auth screen "amber" warning band is borderline-orange — fails the no-orange brand rule** — Brand-guide violation
- Issue: The rate-limit warning uses Tailwind `text-amber-700/-400`, `bg-amber-50/-950`, `border-amber-200/-800`. Tailwind amber is `#d97706`/`#f59e0b` — visually orange. The brief explicitly forbids orange in autopost/lab UI; this is the first authenticated touchpoint and therefore at minimum brand-inconsistent.
- Evidence: `src/pages/Auth.tsx:461-463`.
- Fix: replace the amber palette with the brand gold `#E4C875` at low alpha for the badge, and brand aqua for the icon: `text-[#E4C875] bg-[#E4C875]/10 border-[#E4C875]/30`. Verify with the brand-guide reviewer before merging.
- Effort: XS

### Major

**1.6  Console.log debug noise on production landing-page navigation** — H8 (minimalist), polish, prod hygiene
- Issue: Mobile-menu navigation handler logs four debug lines to the browser console on every tap (`[Landing] Mobile nav item clicked`, `Scroll target lookup`, `No element matches selector`, `Smooth scrolling to`). End users with the console open (a non-trivial subset of the tool-savvy creative-adult audience) will see this.
- Evidence: `src/pages/Landing.tsx:176, 187, 189, 195`.
- Fix: gate the four `console.log/warn` lines behind `if (import.meta.env.DEV)` or remove. The smooth-scroll logic itself is fine; only the logs are noise.
- Effort: XS

**1.7  Hero CTA flow uses a 250ms blind setTimeout for in-page anchor scroll** — H1 (visibility), interaction friction
- Issue: After tapping a mobile-menu link, the menu must close before the page scrolls. Today the close + scroll are sequenced via `setTimeout(..., 250)` — a fragile fixed value that will lag on slow devices and feel unresponsive on fast ones. There is no progress indication during the gap; the user taps and nothing visibly happens for a quarter-second.
- Evidence: `src/pages/Landing.tsx:185-197`.
- Fix: drive the scroll off `AnimatePresence`'s `onExitComplete` callback (already available via Framer Motion) instead of a hardcoded delay. This synchronizes scroll with the actual close animation regardless of device speed.
- Effort: S

### Minor

**1.8  Hero h1 is `sr-only` — visible h1 is missing on the landing page** — H6 (recognition), SEO + a11y readability
- Issue: The visible-text headline ("Cinematic visuals. Natural voiceover. Seamless transitions.") is a `<p>`, not an `<h1>`. The h1 is `sr-only` and contains an HTML entity dash. For screen-reader users the h1 reads "MotionMax — AI Video Generation"; for sighted users there is no visual h1 anchoring the page.
- Evidence: `src/pages/Landing.tsx:227, 247`.
- Fix: promote the visible "Cinematic visuals…" `<p>` to `<h1>` with appropriate styling and remove the `sr-only` h1 (or keep it as visually hidden if needed for SEO, but the visible h1 is the one users perceive).
- Effort: XS

---

## Category 2 — Visitor → Customer Conversion

### Critical

**2.1  Demo modal shows "Demo video coming soon" placeholder** — H1 (system status), conversion
- Issue: The "Watch Demo" CTA is the second-most-prominent button in the hero. Tapping it currently opens a modal whose body says "Demo video coming soon" with another "Try for Free" button. For an audience that decides "is this real" in the first 10 seconds, this collapses confidence.
- Evidence: `src/pages/Landing.tsx:519-540` — the modal body is a placeholder div, not the embedded Guidde video that lives in the on-page Demo section (line 332-341).
- Fix: either (a) reuse the same Guidde iframe inside the modal, or (b) hide the "Watch Demo" button entirely until a real MP4 is uploaded. Do not ship the placeholder.
- Effort: S

### Major

**2.2  Sign-In and Get Started buttons are visually identical-weight on desktop nav** — H6 (recognition over recall), Fitts
- Issue: Desktop nav renders Sign In as a ghost button next to Get Started as a primary button — both at the same height with similar padding. For first-time visitors, the primary action ("Get Started") should dominate; the current pairing reads as two equal options and dilutes conversion.
- Evidence: `src/pages/Landing.tsx:135-148`.
- Fix: collapse "Sign In" to a low-emphasis text link (no button container) and let the primary "Get Started" button stand alone. Standard SaaS pattern (Linear, Notion, Vercel, Stripe).
- Effort: XS

**2.3  Mobile sign-in is the only auth CTA in the mobile menu — no "Get Started" / signup option** — H7 (flexibility)
- Issue: The mobile drawer has section anchors plus a single "Sign In" button. New visitors on mobile (the brief says mobile-heavy usage) cannot start an account from the drawer — they must scroll back to the hero, which is hidden behind the open drawer.
- Evidence: `src/pages/Landing.tsx:204-211`.
- Fix: stack two buttons in the mobile drawer footer — primary "Get Started" on top, secondary "Sign In" below.
- Effort: XS

---

## Category 3 — Process & Flow Consistency

### Major

**3.1  Auth checkboxes for Terms + Age block submit but show no inline error** — H9 (recovery), H1 (status)
- Issue: Signup submit is disabled until both `acceptedTerms` and `ageVerified` are true. The disabled button does not explain WHY it is disabled. A user who fills in email/password and never sees the checkboxes will tap a dead button with no feedback.
- Evidence: `src/pages/Auth.tsx:507` (button disabled state) and `src/pages/Auth.tsx:466-501` (the two checkboxes); only `acceptedTerms` shows a toast on submit (line 180-183), and `ageVerified` has no surfaced message at all.
- Fix: keep the button enabled and validate on click — show an inline `role="alert"` near each unchecked box with the missing requirement. Or, less ideal: add a hover/focus tooltip on the disabled button explaining the requirement.
- Effort: S

**3.2  Login lockout has no visible countdown — only a transient toast** — H1 (visibility of system status)
- Issue: After 5 failed logins, the form locks for 30 seconds. The user gets one toast with the seconds-remaining at click-time, but if they try again 5 seconds later they see another toast — with no persistent timer in the UI. Real users will spam-click the disabled button.
- Evidence: `src/pages/Auth.tsx:24-25, 145-149, 159-163`.
- Fix: when `Date.now() < lockedUntil`, render a persistent banner above the submit button: "Too many attempts. Try again in {seconds}s." Decrement via a `setInterval`.
- Effort: S

---

## Category 5 — Performance / Mobile Readiness

### Critical

**5.1  `100vh` used instead of `100dvh` on iOS-facing surfaces — viewport jumps under address bar** — iOS readiness
- Issue: The brief explicitly requires `100dvh` not `100vh` for iOS. Five usages of `100vh` remain — these will produce a layout jump when Mobile Safari's address bar shows/hides, and content will be cut off below the fold on first paint.
- Evidence:
  - `src/styles/admin-shell.css:26` (`height: 100vh`)
  - `src/styles/admin-shell.css:67` (`min-height: 100vh`)
  - `src/pages/VoiceLab.tsx:1178` (`max-h-[calc(100vh-7rem)]`)
  - `src/pages/Unsubscribe.tsx:57` (`minHeight: "100vh"`)
  - `src/components/admin/users/UserDrawer.tsx:201` (`height: "100vh"`)
  - `src/components/admin/tabs/TabGenerations.tsx:461` (`maxHeight: "calc(100vh - 64px)"`)
- Fix: replace each `100vh` / `100vw` with `100dvh` / `100dvw`. For the two `100vw` cases (UserDrawer line 201, TabGenerations line 461), use `100dvw` so iOS scrollbar doesn't induce horizontal overflow.
- Effort: XS

### Major

**5.2  Mobile-first hero uses `min-h-[85vh]` then `min-h-screen`** — iOS readiness
- Issue: The hero section uses `min-h-[85vh]` on small screens and `min-h-screen` from `sm:`. Both fall back to the legacy viewport unit on iOS Safari and will jitter on scroll. For an explicitly mobile-heavy launch this is a perceptible quality issue on the first surface.
- Evidence: `src/pages/Landing.tsx:220` — `min-h-[85vh] sm:min-h-screen`.
- Fix: switch to `min-h-[85dvh] sm:min-h-[100dvh]`. Tailwind v3.4+ supports the `dvh` unit natively via arbitrary values.
- Effort: XS

---

## Category 6 — Accessibility (UX-relevant subset; full WCAG belongs to Halo)

### Major

**6.1  Mobile menu trap-focus skips the Sign-In button** — H1 (status), keyboard a11y
- Issue: The focus-trap in the mobile menu queries `'a[href], button:not([disabled])'` but the menu items are rendered as `<button>` elements, and one of them is the Sign-In CTA. Tab order works, but the trap loops correctly only because every focusable matches. However: the dialog has `role="dialog" aria-modal="true"` but the menu also wraps the section anchors as buttons that scroll the body — pressing Enter on a "section" button closes the dialog, jumps focus back to the hamburger, then scrolls 250ms later. A keyboard user cannot tell anything is happening for a quarter-second.
- Evidence: `src/pages/Landing.tsx:43-44`, `:175-198`.
- Fix: move focus to the destination heading after scroll completes (set `tabIndex={-1}` on the `<h2>` and call `.focus()` after `scrollTo`), and add `aria-live="polite"` status text "Navigated to Features".
- Effort: M

---

## Category 11 — State Coverage

### Major

**11.1  Email-sent confirmation is the only path-completion screen — no signup-error fallback** — H9 (recovery)
- Issue: `showEmailSent` renders a clean confirmation. There is no equivalent persistent screen for "we sent the email but couldn't apply your referral code" or "your account was created but email delivery failed" — both surface only as toasts. Toasts auto-dismiss; a returning user will not know what to do.
- Evidence: `src/pages/Auth.tsx:62-75` (`applyStoredReferralCode` swallows errors silently); `src/pages/Auth.tsx:243-279` (only the success path has a persistent screen).
- Fix: track an `accountCreatedEmailFailed` state and render an alternate panel with "Resend confirmation" + support contact when delivery fails. Surface referral-failure as a non-blocking inline note on the success panel ("Couldn't apply referral code MM-XXXXXX — contact support to claim it").
- Effort: M

---

## Category 14 — Production Readiness (UX surface only)

### Minor

**14.1  Inline `style={{ touchAction: "manipulation" }}` repeated on hero buttons** — code health, polish
- Issue: Three buttons set `touchAction: manipulation` inline. This works but is the wrong layer — it should be a global rule on `button, [role="button"]` so future buttons inherit it.
- Evidence: `src/pages/Landing.tsx:130, 263, 279`.
- Fix: add to `src/index.css`: `button, [role="button"] { touch-action: manipulation; }` and remove the three inline `style` props.
- Effort: XS

---

## Production Blockers (must fix before US launch)

| # | Severity | Finding | Location | Effort |
|---|----------|---------|----------|--------|
| 1.1 | Blocker | "Visual Stories" mode advertised in landing despite Storytelling product removal | `src/pages/Landing.tsx:411-446` | XS |
| 1.2 | Blocker | Storytelling remnants in SEO/gallery/speaker-selector | 3 files | S |
| 1.9 | Blocker | Autopost lab uses `#11C4D0` not the brand aqua `#14C8CC` (dozens of refs) | `src/pages/lab/autopost/*` | S |
| 1.3 | Critical | Fabricated "2,400+" social-proof with TODO comment in source | `src/pages/Landing.tsx:289, 299` | XS |
| 1.4 | Critical | Hardcoded brand colors `#0D99A8`, `#D4A929` not the spec aqua/gold | `src/pages/Landing.tsx:434-443` | XS |
| 1.5 | Critical | Auth amber-orange warning band violates no-orange rule | `src/pages/Auth.tsx:461-463` | XS |
| 1.10 | Critical | Site-wide red/destructive — 112 occurrences across 40 files | grep summary | M |
| 2.1 | Critical | "Watch Demo" modal shows "coming soon" placeholder | `src/pages/Landing.tsx:519-540` | S |
| 5.1 | Critical | `100vh` used in 6 places instead of `100dvh` | 5 files | XS |

## Top 10 Priority Fixes

| Rank | Finding | Why now | Effort |
|------|---------|---------|--------|
| 1 | 1.1 Remove "Visual Stories" mode card | Promises a removed feature on the landing page | XS |
| 2 | 1.2 Purge storytelling strings from 3 files | SEO + dashboard still surface ghost product | S |
| 3 | 1.3 Replace fabricated 2,400+ + delete TODO | Falsifiable claim with paper trail | XS |
| 4 | 5.1 Replace `100vh` with `100dvh` everywhere | Brief explicitly requires it for iOS | XS |
| 5 | 1.4 Fix `#0D99A8` and `#D4A929` to brand aqua/gold | Brand-guide violation visible in the hero | XS |
| 6 | 1.5 Recolor amber-orange auth warning to brand gold | First authenticated screen, brand-guide violation | XS |
| 7 | 2.1 Remove or replace "coming soon" demo modal | Conversion-killing placeholder on hero CTA | S |
| 8 | 1.6 Strip `console.log` from landing nav handler | Prod hygiene; visible to tool-savvy audience | XS |
| 9 | 3.1 Surface inline error for un-checked Terms/Age | Dead-button silent failure on signup | S |
| 10 | 3.2 Persistent lockout countdown banner | Toast-only feedback fails the locked user | S |

---

## Additional Findings (post-initial pass)

### Blocker

**1.9  Autopost lab uses `#11C4D0` as "aqua" — that is NOT the brand aqua `#14C8CC`** — Brand-guide violation, H4 (consistency)
- Issue: The shared autopost token file declares `aqua: "#11C4D0"` and dozens of components reference `#11C4D0` directly. The brand spec is `#14C8CC` (memory: `feedback_motionmax_brand_gold`). `#11C4D0` is a distinct, slightly cooler teal — placed next to the real `#14C8CC` from the rest of the app, the autopost screens will read as a different product.
- Evidence:
  - `src/pages/lab/autopost/_autopostUi.tsx:37` — `aqua: "#11C4D0"`
  - `src/pages/lab/autopost/_autopostUi.tsx:118-133, 199, 206` — status pills + progress gradient hardcoded to `#11C4D0`
  - `src/pages/lab/autopost/RunDetail.tsx:303, 335, 348, 420, 515, 547` — same hex repeated
  - `src/pages/lab/autopost/_UpdateScheduleDialog.tsx:128, 137, 187` — same
  - `src/pages/lab/autopost/_SourcesField.tsx:137, 159, 196, 210, 227, 252` — same
  - `src/pages/lab/autopost/_GenerateTopicsDialog.tsx:365, 389, 410` — same
- Fix: replace every `#11C4D0` with `#14C8CC` across the `src/pages/lab/autopost/` subtree. Then add a Tailwind/CSS token (`--brand-aqua: #14C8CC`) and a CI grep gate that fails on raw hex inside that subtree.
- Effort: S (single find-replace + token introduction)

### Critical

**1.10  Site-wide red usage despite "no red" brand rule — 112 occurrences across 40 files** — Brand-guide violation
- Issue: The brief states "no red" for MotionMax. The codebase has 112 occurrences of `text-red-*`, `bg-red-*`, `hover:text-red-*`, or shadcn `destructive` (which resolves to red by default in shadcn's design tokens) across 40 files. This includes auth, voice-lab, admin, workspace, modals, and generation pipeline UIs. Even if shadcn `destructive` is recolored at the token level, the explicit `red-400` hovers in `VoiceLab.tsx:663, 1002` still ship red.
- Evidence: grep summary: `text-red|hover:text-red|bg-red|destructive` — 112 hits / 40 files. Direct red-400 hovers: `src/pages/VoiceLab.tsx:663, 1002`. shadcn destructive token: `src/index.css:5` and others.
- Fix:
  1. In `src/index.css` (and `src/styles/admin-tokens.css`, `src/styles/settings-tokens.css`), redefine the `--destructive` HSL token to the brand gold `#E4C875` so every shadcn-derived destructive button/badge/alert switches at once.
  2. Find-replace `text-red-400`, `text-red-500`, `bg-red-*`, `border-red-*` with brand-gold equivalents (`text-[#E4C875]`, `bg-[#E4C875]/10`, `border-[#E4C875]/30`).
  3. Add a CI grep gate: `grep -rE "(text|bg|border|hover:text|hover:bg)-(red|orange|amber|emerald|rose|lime|green)-[0-9]" src/ && exit 1`.
- Effort: M (token swap is XS, but the find-replace + visual QA across 40 files is M)

### Major

**1.11  Help-page FAQ pricing claims contradict billing-toggle reality** — H4 (consistency)
- Issue: FAQ states "Pro ($29/mo) unlocks 50,000 credits, HD exports and voice cloning. Studio ($99/mo) adds 4K, priority queue, 5 team seats, brand kits and removed branding." A user comparing these numbers against the Pricing page or Billing page would expect them to match exactly. Without verifying the pricing page, this is at minimum a maintenance hazard — the FAQ is hardcoded prose, not driven from the same source as the pricing component.
- Evidence: `src/pages/Help.tsx:46-50` (Pro/Studio FAQ); pricing component is `src/components/landing/LandingPricing.tsx` (separate source).
- Fix: extract a single `PRICING_PLANS` config (already partially in `landingContent.ts` per the import in Landing.tsx) and have the FAQ render from it. Or, at minimum, write a unit test that asserts the FAQ string contains the same `$29` / `$99` numbers as the pricing config.
- Effort: M

**1.12  Admin VoiceLab delete buttons use raw `red-400` hover** — Brand violation, H4
- Issue: Two delete-icon buttons in VoiceLab.tsx hover to `text-red-400` — direct red, not the brand palette. Admin/voice-lab is owned by tool-savvy users but still part of the audited brand surface.
- Evidence: `src/pages/VoiceLab.tsx:663, 1002` (`hover:text-red-400`).
- Fix: change `hover:text-red-400` to `hover:text-[#E4C875]` and the surrounding `hover:bg-white/5` is fine to keep. Add `aria-label="Delete voice"` if missing for screen-reader clarity (verify on read).
- Effort: XS

---

## Coverage Notes & Limits

- **Surfaces NOT yet read in this 10-min budget:** `IntakeForm.tsx`, `Editor.tsx`, `Stage.tsx`, `Timeline.tsx`, `Help.tsx`, `Admin.tsx`, autopost lab pages, marketing Astro index, Render worker UI, email templates, dashboard. Recommend a follow-on Optic pass scoped to those surfaces.
- **Findings I could not verify from static analysis:**
  - Touch-target sizes at runtime on real 320/375/390/414/428px devices (the code declares 44px+ but I cannot measure rendered DOM).
  - Color-contrast ratios for `#E4C875` gold on dark background (Halo's domain anyway).
  - 16px input font-size on iOS (the brief requires it; Tailwind defaults to base 16px but `text-xs/-sm` shrinks below 16 — needs runtime verification on `<Input>` and `<Label>`).
  - Add-to-home-screen manifest correctness, status-bar `theme-color`, WebAPK readiness — needs `index.html` + `manifest.webmanifest` review (skipped here for time).
  - Hardware back-button behavior on Android, soft-keyboard avoidance — runtime only.
- **Findings deferred to other reviewers:** OWASP/CSP/security-headers (Halo), schema/RLS (Trace), legal text in `Terms.tsx`/`Privacy.tsx`/`AcceptableUse.tsx` (Canon), email-template UX (Proof), SEO structured-data (Compass).

**Verdict input from Optic to Jury:** `FAIL` until Blockers 1.1 + 1.2 are closed, then re-audit for `PASS WITH FIXES`. The other Criticals are XS/S effort and should be batched into the same fix sprint.
