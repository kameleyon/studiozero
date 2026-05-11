# Optic — UX/UI Audit Findings

```
FROM:    Optic (Audit)
TO:      Jury (Audit)
RE:      AUDIT FINDINGS — motionmax — 2026-05-10
STATUS:  Review
```

**Project:** MotionMax (AI video generator SaaS, pre-launch)
**Audience scored against:** tool-savvy creative adults — content creators, marketers, video producers. **Not developers.** Mobile usage assumed (TikTok/IG/Shorts production audience).
**Build state:** repo at `C:\Users\Administrator\motionmax`, branch `master`, audit walks the source tree (no live URL provided — findings cite file:line evidence).

**Method:** Heuristic walkthrough (Nielsen H1–H10, WCAG 2.2 touch targets, Fitts/Hick, Apple HIG / Material) of every primary surface — Landing, Auth, Dashboard, Sidebar, Intake (CreateNew), Editor, Voice Lab, Autopost Lab, Pricing, Settings — plus the design-token layer (`tailwind.config.ts`, `src/index.css`, `src/styles/*-tokens.css`) and the v2-announcement modal that auto-mounts on every login.

**Brand spec (per Jo's persistent guidance):** aqua `#14C8CC`, gold `#E4C875` only. No red, no green, no orange in autopost/lab UI. Templates often ship `#F5B049` orange — must be swapped on import.

**Optic score:** **2 / 5** — significant Critical findings; not ready to ship without remediation.

---

## Summary

Strong information architecture and a genuinely well-built dark dashboard shell. Heuristic violations cluster in three places: **(1) trust/social-proof on the landing page** (fake numbers, placeholder avatars, "coming soon" demo modal — H1/H10), **(2) brand color drift** (two different "brand aqua" hexes ship side by side, plus a template orange still lives in the v2 announcement modal — H4 consistency), and **(3) primary affordances that don't actually do what they promise** (Hero "Watch Demo" → empty modal, IntakeForm "Smart prompt" → toast, IntakeForm "URL" button → native `window.prompt()` — H1 visibility / H2 match-real-world / H3 user-control).

The audience is tool-savvy creators — they will notice off-brand color drift, "coming soon" placeholders behind primary CTAs, and a `/dashboard-new` URL exposed in the address bar. Several of these are **brand-damage Critical** rather than polish.

---

## Findings (severity-sorted, with heuristic citations)

### CRITICAL

#### C-1. Hero "Watch Demo" CTA opens a "Demo video coming soon" placeholder modal
- **Heuristic:** H1 (visibility of system status) + H2 (match real world). The hero promises a demo; the modal shows a placeholder.
- **Evidence:** `src/pages/Landing.tsx:268-285` (CTA), `src/pages/Landing.tsx:519-540` (modal body — literal text `"Demo video coming soon"`).
- **Why critical:** This is one of two primary hero CTAs on the marketing landing page. Clicking it on a launch-day audience drops them into a clear "this product isn't done" signal. On a pre-launch audit, that's brand-damage.
- **Recommendation:** Either record and embed a 60–90 s demo before launch, or remove the "Watch Demo" CTA from the hero and rely on the existing Guidde walkthrough embedded further down the page (`Landing.tsx:332-341`). Do not ship with the placeholder.

#### C-2. Fabricated social-proof numbers and placeholder avatars on the landing page
- **Heuristic:** H1 (visibility — system tells truth) + brand-trust posture for a launch audience.
- **Evidence:**
  - `src/pages/Landing.tsx:288-303` — copy reads `"Used by 2,400+ marketers"` and `"Join 2,400+ creators already making videos"` next to **5 gradient placeholder circles** (no real avatars, line 295-298). Line 299 contains the literal author admission: `// TODO: replace 2,400+ with a real figure from your analytics/DB`.
  - Same number replicated on the landing pricing block: `src/components/landing/LandingPricing.tsx:16-17` — `// TODO: replace with a real figure ... const SOCIAL_PROOF_COUNT = "2,400+"`.
- **Why critical:** This is fabricated marketing claim risk (FTC/ASA exposure depending on jurisdiction) **and** brand-trust damage. The TODO comments in source confirm the figure was never sourced. The audience is marketers — they recognize stock gradient avatars as a tell.
- **Recommendation:** Either replace with real numbers from analytics + real customer headshots/logos (with permission) before launch, or remove the social-proof row entirely until a real number exists. Same applies to LandingPricing.

#### C-3. Brand aqua ships in two different hex values across the product
- **Heuristic:** H4 (consistency and standards) — the *same* brand color renders differently on adjacent surfaces.
- **Evidence:**
  - **Brand spec:** `#14C8CC` (Jo's persistent memory; also coded as the literal in `Sidebar.tsx:291`, `AppShell.tsx:94`, `Hero.tsx:147,162,203`, `Landing.tsx:131,264,280,515`, `Pricing.tsx:270,277,283,296`, `v2-announcement.css:211,218,232,262`).
  - **Token resolves to a different aqua:** `src/index.css:27` declares `--brand-aqua: 184 85% 44%` with the inline comment `/* #11C4D0 - Primary Aqua */`. That CSS variable powers `--primary` (lines 44, 119), so anything using `bg-primary` / `text-primary` / `text-brand-aqua` ships **#11C4D0**, not #14C8CC.
  - **Hard-coded `#11C4D0` everywhere in the autopost / lab / integrations / admin surfaces:** `src/pages/lab/autopost/_autopostUi.tsx:37,119,120,122,131,199,206`, `_GenerateTopicsDialog.tsx` (10 occurrences), `_EditAutomationDialog.tsx` (12 occurrences), `_UpdateScheduleDialog.tsx:128,137,187`, `_SourcesField.tsx:137,159,196,210,227,252`, `RunDetail.tsx:303,335,420,515,547`, `pages/lab/LabHome.tsx:39,42,43,69,80`, `pages/lab/_LabLayout.tsx:76,78`, `components/settings/IntegrationsTab.tsx` (10 occurrences), `components/admin/AdminUserDetails.tsx:412,794`, `components/admin/AdminGenerations.tsx:60` (with the comment `// Primary aqua #11C4D0`).
- **Why critical:** A user navigating from `/dashboard-new` (where the Sidebar logo is `#14C8CC`) to `/lab/autopost` (where every accent is `#11C4D0`) sees the brand color shift. They can't tell if it's a render bug or two products. The two hexes are close in hue (184° vs 184°) but distinct in lightness/saturation; they read as inconsistent under monitor calibration. **This is on a pre-launch audit — every surface should ship one canonical aqua.** Per Jo's persistent rule the canonical value is `#14C8CC`.
- **Recommendation:** Pick one source of truth. Update `src/index.css` `--brand-aqua` (and `--primary`) to the brand value `#14C8CC` (≈ HSL 181 81% 44%), then global-replace `#11C4D0` → `#14C8CC` across the lab/autopost/integrations/admin surfaces (and the comments). Verify the `--primary` re-render across Pricing CTA, Auth submit, sidebar active-nav indicators, etc.

#### C-4. Template orange `#F5B049` still in v2 announcement modal (renders on every login)
- **Heuristic:** H4 (consistency) + brand-spec compliance per Jo's persistent rule "templates often ship `#F5B049` orange — swap on import."
- **Evidence:** `src/components/announcements/v2-announcement.css:11` (palette declaration `--gold → #F5B049`), `:162-163` (`.mm-ann-num i`), `:269-270` (`.mm-ann-ico-gold`), `:299-301` (`.mm-ann-new` "NEW" badge background + border + text). Modal mounts globally in `App.tsx:101` (`<V2AnnouncementModal />`) and triggers on every authenticated login until dismissed.
- **Why critical:** Per Jo's brand rule the gold is `#E4C875` — `#F5B049` is the template orange that should have been swapped on import. The orange is rendered as text fill, icon tint, AND a "NEW" badge that's the most prominent chip in the modal. Every authenticated user sees this on login — high impression count for an off-brand color.
- **Recommendation:** Replace `#F5B049` with `#E4C875` and the matching `rgba(245,176,73,...)` triplets with `rgba(228,200,117,...)`. Update the palette comment block at the top of the file. Keep the modal for the announcement content; just fix the swatch.

#### C-5. Off-palette colors on the landing "4 Ways to Create" cards (`#0D99A8` and `#D4A929`)
- **Heuristic:** H4 (consistency and standards) + brand-spec compliance.
- **Evidence:** `src/pages/Landing.tsx:432-444` — "Visual Stories" card uses `from-[#0D99A8]/20 to-[#0D99A8]/5` and `hover:border-[#0D99A8]/40`; "Smart Flow" card uses `from-[#D4A929]/20 to-[#D4A929]/5` and `hover:border-[#D4A929]/40`. Neither hex is in the brand palette. `#0D99A8` is a deeper aqua (it's the `--brand-aqua-dark` declared in CSS but used here as a literal that bypasses the token); `#D4A929` is an orange-gold close to the prohibited template tone.
- **Why critical:** The four product-mode cards are the most visually-anchored row on the marketing page. Two of them render in off-brand swatches. Audience-relative impact: marketers will read this as "they don't manage their own brand."
- **Recommendation:** Use only `#14C8CC` (aqua) and `#E4C875` (gold) tints. Pick one for each card — e.g., Cinematic + Visual Stories on aqua tint, Explainers + Smart Flow on gold tint — or use the existing `--brand-aqua` / `--gold` tokens.

#### C-6. Primary affordance on Intake screen does nothing ("Smart prompt" toast)
- **Heuristic:** H1 (visibility — buttons must do what they say) + H10 (help and documentation — placeholder copy belongs in a tooltip, not a toast).
- **Evidence:** `src/components/intake/IntakeForm.tsx:977-983` — "Smart prompt" button is styled as the most-prominent affordance on the intake form (aqua `bg-[#14C8CC]/10 text-[#14C8CC] border-[#14C8CC]/30`), and on click runs `toast.info('Smart Prompt coming soon.')`.
- **Why critical:** This sits on `/app/create/new`, the unified intake — the most-used screen in the app. A primary CTA that shows "coming soon" undermines trust on the screen the user is actively trying to do work on. First impression damage.
- **Recommendation:** Either ship Smart Prompt before launch, or remove the button entirely from the intake. Halfway approaches (greying it out, "Beta" pill, etc.) extend the bad impression.

---

### MAJOR

#### M-1. Hero CTA labelled "Direct" — verb is unclear to a non-developer audience
- **Heuristic:** H2 (match between system and real world). "Direct" reads as either an adjective ("direct mode") or a film-direction verb ("to direct"); neither matches the action ("submit and start generation").
- **Evidence:** `src/components/dashboard/Hero.tsx:339-352` — primary submit CTA on the dashboard hero reads `Direct ⏎`. Audience is content creators, not film directors; the noun-as-verb is opaque.
- **Recommendation:** Rename to `Generate`, `Create video`, or `Make it`. Keep the `⏎` keyboard hint. (Bonus: the `⏎` glyph is meaningless on touch devices; consider hiding it `< sm`.)

#### M-2. Internal route name `/dashboard-new` exposed to users
- **Heuristic:** H8 (aesthetic / minimalist design) + professional polish for a launch product.
- **Evidence:** `src/App.tsx:117,215-223` — the live dashboard route is literally `/dashboard-new`. After Google OAuth (`Auth.tsx:107-119`) users land here. The Sidebar logo links to `/dashboard-new` (`Sidebar.tsx:286`). The mobile topbar logo also links to `/dashboard-new` (`AppShell.tsx:88`). The route comment at `App.tsx:210-213` even says `Delete this route once DashboardLayout graduates and replaces /app.` — i.e., this was supposed to be an internal preview path.
- **Why major:** Users will see `/dashboard-new` in their browser address bar, share it in Slack, etc. Reads as "we're still building." Marketers and creators sharing screenshots will spread the unprofessional URL.
- **Recommendation:** Rename to `/app` (or `/studio` / `/dashboard`) before launch. The legacy `/app` redirect that currently points to `/dashboard-new` (`App.tsx:117`) should be flipped: `/app` becomes canonical, `/dashboard-new` becomes the legacy redirect (or deleted).

#### M-3. Native `window.prompt()` for URL attachment in IntakeForm
- **Heuristic:** H4 (consistency and standards) + H8 (minimalist design). Native browser prompts can't be themed, expose typed values to the browser's prompt history, and look broken inside a polished dark UI.
- **Evidence:** `src/components/intake/IntakeForm.tsx:933-957` — the "URL" button on the source-attachment toolbar invokes `window.prompt('Paste a URL, YouTube link, or GitHub repo link:')`. Acknowledged in source comment line 934: `TODO[polish]: replace with themed inline input dialog ... window.prompt non-styleable + leaks typed values to the browser's prompt history`.
- **Why major:** Drops users out of the dark themed UI into a stark white OS dialog. Looks broken; users hesitate to paste sensitive links. Same intake flow that just promised polish via the rest of the dark form.
- **Recommendation:** Replace with a Radix Dialog using the existing shadcn primitives — there's a Dialog import already in scope at `IntakeForm.tsx:14`. Single-input form with the same URL parsing logic moved into onSubmit.

#### M-4. Filter pill height on mobile is 28 px — below Apple HIG (44 px) and Material (48 dp)
- **Heuristic:** Fitts's law + WCAG 2.5.5 (target size). Apple HIG mandates 44×44 CSS px for touch targets; Material 48 dp; WCAG 2.2 Level AAA is 44×44. WCAG 2.2 Level AA minimum is 24×24 — 28 px clears that floor but barely.
- **Evidence:** `src/components/dashboard/ProjectsGallery.tsx:321` — filter pills (`All / Cinematic / Explainer / Smart Flow`) ship `min-h-[28px]` on mobile (`sm:min-h-[36px]` only kicks in ≥640 px). 36 px is also below Apple HIG.
- **Why major:** The audience produces short-form vertical video — they live on mobile. Pills sit in a row at the top of "Recent projects" — high-frequency tap target. 28 px under-thumb is mistap-prone, especially for the gold-standard "Smart Flow" pill which sits between two siblings.
- **Recommendation:** Bump to `min-h-[44px]` on mobile (`min-h-[36px]` ≥ md is acceptable for mouse). Same fix on Hero mode pills (`Hero.tsx:197` — `min-h-[36px]`) and the language/voice/aspect dropdowns (`Hero.tsx:222,264,307` — same `min-h-[36px]`).

#### M-5. "Smart Flow" landing card mislabels the mode as "Infographics"
- **Heuristic:** H2 (match between system and real world) + H4 (consistency).
- **Evidence:** `src/pages/Landing.tsx:437-445` — fourth product card has `title: "Smart Flow", tag: "Infographics"`, with copy `"Transform data and key insights into stunning visual infographics with optional narration."` But the actual `smartflow` mode in the rest of the product is described differently: `Hero.tsx:36-40` suggestions and `IntakeForm.tsx:845` describe Smart Flow as `"Fast, short-form reel — dial in the vibe, MotionMax does the rest."` Two different stories for the same mode across the marketing page and the in-product UI.
- **Why major:** A user clicks "Try Smart Flow" expecting infographics, lands on the intake screen which describes "fast short-form reel" — H4 violation, expectation/delivery mismatch.
- **Recommendation:** Pick one definition and propagate. If Smart Flow is reels, the landing tag should be "Short-form reels" and the description should match. If Smart Flow is infographics, the in-product copy should match. Coordinate with Proof on the canonical wording.

#### M-6. Console.log statements left in landing-page production code
- **Heuristic:** H8 (aesthetic / minimalist design — the console is part of the user-visible product surface for tech-savvy users).
- **Evidence:** `src/pages/Landing.tsx:176,187,189,195` — every mobile-nav item click logs four debug entries to the browser console.
- **Why major:** Audience includes marketers and developer-adjacent creators who routinely open DevTools. Verbose console pollution on the marketing page reads as "shipped without cleanup."
- **Recommendation:** Strip the debug logs or wrap them behind `if (import.meta.env.DEV)`.

---

### MINOR

#### m-1. Greeting strings can wrap awkwardly at certain widths
- **Heuristic:** H8 (aesthetic / minimalist design).
- **Evidence:** `src/components/dashboard/Hero.tsx:42-48` — `greetingFor` returns strings up to `'Late night creative session'` (28 chars). Combined with `, {displayName}. What are we making?` and `clamp(24px,6vw,48px)` font sizing (line 161), longer greetings wrap to 4 lines on a 360 px viewport with a long display name, breaking the visual hierarchy.
- **Recommendation:** Cap greeting to ~14 characters (e.g., `'Burning oil'` instead of `'Burning the midnight oil'`) or constrain the `<h1>` to two lines max and truncate the displayName.

#### m-2. Sidebar "Recent projects" delete dropdown — no undo, only an alert dialog
- **Heuristic:** H5 (error prevention — alert dialog is good) + H3 (user control / freedom — undo is missing).
- **Evidence:** `src/components/dashboard/Sidebar.tsx:240-264, 595-618` — delete cascades through `generations / project_shares / project_characters / projects` with an AlertDialog confirm but no soft-delete or undo path.
- **Recommendation:** Either (a) add a soft-delete with a 24-hr restore window (matches industry norm — Loom/Descript/Notion), or (b) add a "trash" page in `/projects`. Out-of-scope to fix now if launch is imminent; flag as Minor for next release.

#### m-3. Editor mobile drawer relies on `Sheet`'s default close X — the inspector drawer on iOS Safari may overlap tab row
- **Heuristic:** H4 (consistency) — the file already documents the workaround on `EditorFrame.tsx:357-372`. The mitigation is in place (`pt-12` on the inner scroll container, close-button bumped to `top-2 right-2`), but the comment indicates this is a known fragile area.
- **Evidence:** `src/components/editor/EditorFrame.tsx:362-372` — comment block + the `[&>button]:top-2` workaround.
- **Recommendation:** Smoke-test on a real iOS Safari device on launch day. The fix looks correct; just verify.

---

### POLISH

#### p-1. The "Settings → Workspace" tab body literally says "coming soon"
- **Evidence:** `src/pages/Settings.tsx:479` — `body="Workspace name, handle, default privacy, brand kit defaults and team-member seats are coming soon..."`
- Acceptable on Settings (it's a configuration surface where staged feature delivery is normal), but consider hiding the empty tab entirely until those features ship.

#### p-2. Hero "Direct" button shows `⏎` keyboard hint on mobile (no enter key)
- **Evidence:** `src/components/dashboard/Hero.tsx:351`. Tiny issue — hint reads as decoration on touch.
- **Recommendation:** Wrap the `<kbd>` in `hidden sm:inline-flex`.

#### p-3. Landing testimonials are use-cases, not real testimonials
- **Evidence:** `src/components/landing/Testimonials.tsx:3-19` — three "use cases" labelled like quotes (with `quote:` field) but framed as roles, not attributed people. The visual treatment looks like testimonials.
- **Recommendation:** Either rename the section "Use cases" / "Built for…" (already half-done at line 31) and drop the quote-mark styling, or seed real customer quotes before launch.

---

## Audience-relative scoring rationale

The audience is **tool-savvy creative adults — content creators, marketers, video producers**. Specifically NOT senior citizens, NOT developers, NOT children. They:
- Notice off-brand color drift (they use color tools daily).
- Notice "coming soon" placeholders (they evaluate competing AI video tools weekly).
- Live on mobile + tablet for content review (28 px tap targets fail this audience, even though they'd pass for a desktop-first power-user audience).
- Read in English (and 10 other languages — broader L1 testing recommended in the verdict).
- Care about brand and trust signals (they're in marketing — fake "2,400+ marketers" copy is a clear tell to this exact audience).

Against that audience, **the Critical findings above are launch-blockers, not polish.** The Major findings should be fixed before next-release; none of them break the product, but they each erode trust on the highest-impression surfaces.

---

## What's working well (for Jury context)

- **Dashboard hero** (`Hero.tsx`) — composition is excellent: prompt-first, mode pills, sane defaults, real keyboard handling with proper `aria-haspopup="listbox"` and Escape/outside-click dismissal documented for WCAG 2.1.2/2.1.4. Best surface in the product.
- **Sidebar admin section** — collapse-by-default with localStorage persistence is the right pattern for a 15-link admin sub-menu.
- **AppShell mobile drawer** — clever reuse of the desktop Sidebar inside the Sheet (`AppShell.tsx:58-73`) keeps the menu identical across viewports.
- **EditorFrame** — collapsible scenes/inspector panels with persisted layout state, keyboard-resizable timeline, fullscreen branch with iOS-rubber-band defeat — production-grade.
- **Auth lockout** — 5-attempts → 30 s lockout (`Auth.tsx:24-25,158-163`) + `RATE_LIMIT_HINT_THRESHOLD` for soft warning is the right ergonomics.
- **Skip links** present on Landing, Auth, AppShell, EditorFrame — WCAG bypass-blocks compliance is good.

These strengths are why the score is **2/5 and not lower** — the foundations are sound; the launch-blockers are concentrated in trust signals and brand-color drift, both of which are bounded fixes.

---

## Recommended next-step routing (for Jury)

- **Critical findings** → Layer leads:
  - C-1, C-2, C-5 (landing copy + visual): **Canvas / Pixel** (creative/brand)
  - C-3, C-4 (token + autopost color drift): **Vega / Pixel** (component + design system) — single fix touches `index.css` + a global hex replace
  - C-6 (Smart prompt empty CTA): **Canvas / Forge** (UI + scope decision: ship the feature or remove the button)
- **Major findings** → next-release sprint queue, owned by **Canvas** for copy/wording (M-1, M-5) and **Vega** for components (M-3, M-4, M-6) and **Forge** for routing (M-2).
- **Minor + Polish** → backlog.

No conflicts to flag with other reviewers' work — Optic findings are bounded to UX/UI heuristics. The `#11C4D0` vs `#14C8CC` brand-color split (C-3) will likely also surface as a Canon (visual consistency) finding — coordinate with Jury on dedup.

— Optic
