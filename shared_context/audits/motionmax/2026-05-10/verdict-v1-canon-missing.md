# Audit Verdict — `motionmax` — 2026-05-10

> Synthesized by Jury from per-reviewer findings in this directory. Source-of-truth for individual findings remains the reviewer files (`optic.md`, `proof.md`, `halo.md`, `compass.md`, `trace.md`).

## 1. Verdict

**Result:** `FAIL`

**One-line summary for Jo:** MotionMax is not ready to ship — the landing page makes claims that aren't true (fake user counts, a fake price-increase countdown, a "Visual Stories" mode that doesn't exist, an "Export 4K" button on plans that top out at 720p), the brand colors drift across surfaces, and the intake form is unusable with a screen reader. Fixes are bounded and well-scoped; we are recommending a halt + fix + re-audit, not a redesign.

**Audience this was scored against:** Tool-savvy creative adults — content creators, marketers, video producers. Explicitly **not** developers, not seniors, not children. Mobile-heavy usage. Mixed English fluency (product advertises 11 languages). US-first launch implied by USD pricing.

**Project state at audit:** Local source tree at `C:\Users\Administrator\motionmax`, branch `master`, walked top-to-bottom by all five completing reviewers. No live URL was supplied; every finding cites `file:line` evidence in the source. This verdict applies to that exact source state.

**Reviewer that did not complete:** **Canon (visual consistency / legal-text)** — no findings file produced. Multiple findings below cross into Canon's lane (legal claims, brand-color drift, GDPR/Privacy subprocessor list, Terms readability), and remediation cannot promote `FAIL → PASS WITH FIXES → PASS` until Canon completes a coverage pass on the affected items. See §4 routing.

---

## 2. Scorecard

Audience-relative scoring (1-5; 5 = ready to ship for the stated audience).

| Reviewer | Score (1-5) | Headline finding | Open Critical | Open Blocker |
|---|---:|---|---:|---:|
| Optic (UX/UI heuristics) | 2 | Brand aqua ships in two different hex values across the product; primary CTAs open "coming soon" placeholders | 6 | 0 |
| Proof (content & wording) | 1 | Three Blocker-class content failures (fabricated social-proof claim, FAQ names a plan that doesn't exist, credits-policy contradiction across Pricing/FAQ/Terms) | 7 | 3 |
| Halo (accessibility) | 1 | 7 WCAG AA failures on primary flows — sliders/labels in IntakeForm have no programmatic name, muted-text token fails contrast across ~30 files, no reduced-motion handling | 7 | 0 |
| Compass (audience alignment) | 3 | Trust signals undermined by placeholder counts + hardcoded scarcity + zero real testimonials; developer jargon (RLS, 429, Retry-After) leaks into the public Help FAQ | 4 | 0 |
| Trace (flow & logic) | 2 | Landing advertises a 4th product mode ("Visual Stories") that does not exist anywhere in the system; pricing → signup loses paid-intent | 4 | 1 |
| Canon (visual consistency) | — | **DID NOT COMPLETE** — coverage gap on brand-color drift, legal claims, and Privacy subprocessor accuracy | — | — |

**Total Critical (after dedup):** **22**
**Total Blocker (after dedup):** **4**

**Verdict cannot promote from `FAIL` until:** (a) every Blocker is closed by the originating reviewer, (b) every Critical is closed by the originating reviewer, AND (c) Canon completes the missing coverage pass on the brand/legal/visual-consistency items routed in §4.

---

## 3. Punch List (severity-sorted, deduped across reviewers)

> Severity rubric (fixed — `agents/audit/jury.md`):
> - **Blocker** — ships nothing until fixed (legal, security, broken core flow)
> - **Critical** — fix before launch (significant audience exclusion, data loss, brand damage)
> - **Major** — fix before next release (clear friction, comprehension failure)
> - **Minor** — fix when convenient (polish, edge cases)
> - **Polish** — optional improvement
>
> Where multiple reviewers flagged the same artifact, the maximum severity is recorded and the convergent reviewers are listed in the Reviewer column. **Convergence elevates risk; it does not deduplicate it down.**

### Blockers

| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|
| B-1 | Proof + Optic + Trace + Compass | "2,400+ marketers / creators" social-proof claim is a hard-coded placeholder repeated on 4 surfaces (in-app landing hero, in-app pricing card, marketing Astro hero + pricing). Source comments explicitly admit the figure is fake (`// TODO: replace with a real figure ...`). Audience is marketers — they recognize fabricated counts. FTC §255.1 / EU Directive 2005/29/EC exposure. | `src/pages/Landing.tsx:289,299-301`; `src/components/landing/LandingPricing.tsx:16-17,76,101`; `marketing/src/pages/index.astro:202,213,405` | Herald (creator) + Sprint (re-route to Canvas + Pixel for visual treatment if avatars also change) | Pre-launch (block ship) |
| B-2 | Proof | Public FAQ names a plan ("Professional") that does not exist anywhere in the system. The actual plans are Free / Creator / Studio. A user reads "Creator and Professional plans include voice cloning" in the FAQ, then can't find a Professional plan on Pricing — paid-conversion contradiction + chargeback exposure. | `src/config/landingContent.ts:114-116` (in-app FAQ) vs `src/pages/Pricing.tsx:38-89` and `marketing/src/pages/index.astro:271-343` (actual plans) | Herald | Pre-launch (block ship) |
| B-3 | Proof | Credits-expiry policy contradicts itself across three customer-facing surfaces. In-app Pricing says "Credits never expire"; landing FAQ says "unused credits do not roll over"; Terms of Service §6 says "Monthly subscription credits expire at the end of each billing period." Credits ARE the unit of purchase — the contradiction is contractually consequential. | `src/pages/Pricing.tsx:167-168`; `src/config/landingContent.ts:119-120`; `src/pages/Terms.tsx:81-82` | Herald + Comply (legal) | Pre-launch (block ship) |
| B-4 | Trace | Landing's "4 Ways to Create" section advertises a "Visual Stories" mode (with a "Try Visual Stories" CTA and rich descriptive copy) that does not exist anywhere in the codebase. The CTA routes to signup; post-signup the user lands on the dashboard and `modeFromParam()` silently coerces unknown values to `cinematic`. Phantom feature on the paid-conversion path. | `src/pages/Landing.tsx:430-436` (no `mode` field); `src/pages/CreateNew.tsx:16-23`; `src/components/dashboard/Hero.tsx:12` (modes: cinematic / doc2video / smartflow only) | Vega + Nexus + Flow (mode definition decision: ship the feature or remove the card) | Pre-launch (block ship) |

### Critical

| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|
| C-1 | Optic + Proof + Trace + Compass | Hero "Watch Demo" CTA opens a "Demo video coming soon" placeholder modal on the in-app Landing — while the marketing Astro page on the same product wires a real Guidde iframe. Trust break on the highest-traffic CTA, and an inconsistency between the two landing surfaces. | `src/pages/Landing.tsx:268-285` (CTA); `:511-543` (placeholder modal text "Demo video coming soon") vs `marketing/src/pages/index.astro:467-478` (real iframe) | Herald (decision) + Vega (implementation) | Pre-launch |
| C-2 | Optic | Brand aqua ships in two different hex values across the product. `#14C8CC` is the brand-spec value (per Jo's persistent rule) and is used on the dashboard / sidebar / hero. `#11C4D0` is what the `--brand-aqua` token actually resolves to and is hard-coded across the entire autopost / lab / integrations / admin surface tree. A user navigating from `/dashboard-new` to `/lab/autopost` sees the brand color shift. | `src/index.css:27` token = `#11C4D0`; vs literal `#14C8CC` in `Sidebar.tsx:291`, `AppShell.tsx:94`, `Hero.tsx:147,162,203`, `Landing.tsx`, `Pricing.tsx`; vs literal `#11C4D0` in `pages/lab/autopost/_autopostUi.tsx`, `_GenerateTopicsDialog.tsx`, `_EditAutomationDialog.tsx`, `_UpdateScheduleDialog.tsx`, `_SourcesField.tsx`, `RunDetail.tsx`, `pages/lab/LabHome.tsx`, `pages/lab/_LabLayout.tsx`, `components/settings/IntegrationsTab.tsx`, `components/admin/AdminUserDetails.tsx`, `components/admin/AdminGenerations.tsx` | Pixel (token bump) + Vega (global hex replace) | Pre-launch |
| C-3 | Optic + Trace | V2 Announcement modal (renders on every authenticated login until dismissed) is built on template orange `#F5B049` and a green pulse `#5CD68D`. Brand brief explicitly bans red, green, and orange. The modal is the first thing every signed-in user sees. | `src/components/announcements/v2-announcement.css:11` (palette), `:162-164,171,176-178,267-271,293-302` | Pixel + Vega | Pre-launch |
| C-4 | Optic | Off-palette colors on the landing "4 Ways to Create" cards — "Visual Stories" uses `#0D99A8` (deeper aqua, off-token) and "Smart Flow" uses `#D4A929` (off-brand orange-gold). Two of the four most visually-anchored cards on the marketing page render in unauthorized swatches. | `src/pages/Landing.tsx:432-444` | Pixel + Canvas | Pre-launch |
| C-5 | Optic + Trace | "Smart prompt" button on the unified intake form (`/app/create/new`) is styled as a primary aqua affordance and on click runs `toast.info('Smart Prompt coming soon.')`. Empty CTA on the most-used screen in the app. | `src/components/intake/IntakeForm.tsx:977-983` | Canvas (decision: ship or remove) + Vega | Pre-launch |
| C-6 | Proof + Optic + Trace | Primary dashboard CTA reads as the single word **"Direct"**. Ambiguous verb in English; not translatable cleanly across the 11 supported languages (becomes a noun in French/Spanish/etc.); doesn't match the headline verb "making" the user just read. Load-bearing CTA — comprehension failure costs activation. | `src/components/dashboard/Hero.tsx:339-352` (CTA at line 350) | Guide (microcopy) | Pre-launch |
| C-7 | Proof | Unsubstantiated quantitative comparison claims on the landing page — `"Save 99% of Your Production Time"`, `"Faster than manual: 120×"`, `"Cost reduction: ~90%"`. No methodology, no benchmark, no footnote. FTC §255.1 / EU UCPD substantiation requirement. | `src/components/landing/BeforeAfterComparison.tsx:32-34,50,184-188` | Herald + Comply | Pre-launch |
| C-8 | Proof + Compass | "Testimonials" component (filename + section position match testimonial idiom) renders three brand-written marketing quotes attributed only to roles ("Content Creators", "Social Media Managers", "Learning & Development Teams"). The variable name is literally `quote`. FTC §255.2 fictional-endorsement exposure. | `src/components/landing/Testimonials.tsx:3-19,34` | Herald + Canvas | Pre-launch |
| C-9 | Proof | "Export 4K" button label is hard-coded on the editor top bar, with no plan-tier check. Free plan caps at 720p; Creator at 1080p; only Studio supports 4K. Implicit promise the product can't keep for two of three paid tiers. | `src/components/editor/EditorTopBar.tsx:352`; ceilings in `src/pages/Pricing.tsx:42-49` | Guide + frontend (plan-tier-aware label) | Pre-launch |
| C-10 | Proof + Compass | Hard-coded `PRICE_INCREASE_DATE = new Date("2026-05-19T23:59:59Z")` drives a landing-page urgency countdown. Source comment explicitly says "Update this when you want to reset the countdown. Keep ~30 days out" — i.e., engineered as a perpetually-resetting fake countdown. FTC 16 CFR Part 465 false-urgency dark-pattern exposure. | `src/components/landing/LandingPricing.tsx:11-13,22-37,152-153`; reinforced by Compass C-2 hardcoded "47 people upgraded this week" at `:167-170` | Penny (pricing) + Herald | Pre-launch |
| C-11 | Proof | In-app FAQ overstates supported aspect ratios — claims "16:9, 9:16, and 1:1" but Hero/Intake only offer 16:9 and 9:16. Pre-purchase promise contradicted by the actual product. | `src/config/landingContent.ts:108-110` vs `src/components/dashboard/Hero.tsx:14,322` | Herald + product | Pre-launch |
| C-12 | Halo | IntakeSlider has no programmatic label — `<input type="range">` with no `id`, no `aria-label`, no `aria-labelledby`, no name. NVDA/JAWS announce "slider, 45 of 100" with no clue what it controls. Affects two user-facing controls in the primary intake flow (Lip sync strength, Tone). WCAG 4.1.2 / 1.3.1 / 3.3.2. | `src/components/intake/primitives.tsx:79-83`; call sites `src/components/intake/IntakeForm.tsx:1144,1470` | Access (a11y owner via Halo) | Pre-launch |
| C-13 | Halo | IntakeLabel silently degrades to a non-label `<div>` when `htmlFor` is omitted, and 8 of 10 call sites in the primary intake flow omit it. 9 form controls (Sources, Format, Duration, Captions, Audio group, Lip sync, Visual style, Direction, Tone) have visible-text decoration only — no programmatic connection. WCAG 1.3.1 / 3.3.2 / 4.1.2. | `src/components/intake/primitives.tsx:10-27`; call sites at IntakeForm.tsx:851, 1014, 1037, 1110, 1133, 1143, 1354, 1461, 1470 | Access | Pre-launch |
| C-14 | Halo | Tertiary muted-text token (`--text-tertiary: 200 7% 52%`, ≈ `#7B838A`) fails AA contrast for normal text in both light and dark modes. The token is documented as "AA for 14px+" but is used at 9–13 px throughout (font-mono labels, dates, disclaimers, timestamps). ~30 affected files; categorical 1.4.3 failure. | `src/index.css:96`; usage in Sidebar, EditorFrame, Stage, ScenesColumn, ConfirmModal, IntakeForm, primitives, AppShell, Auth | Pixel (token bump) | Pre-launch |
| C-15 | Halo | Brand-locked `--destructive` resolves to brand gold `#E4C875` — the same gold used as the positive accent and wordmark color elsewhere. To a colorblind user, "Delete project" looks identical to a "Premium feature" gold pill. Color is the sole visual cue for danger. WCAG 1.4.1. | `src/index.css:66-69`; affected affordances `Sidebar.tsx:432,583,612` | Pixel + Vega (add structural cue) | Pre-launch |
| C-16 | Halo | `--warning` token resolves to amber/orange `#F5A623` — violates the brand brief's explicit "no orange in autopost/lab UI" rule AND is perceptually indistinguishable from the gold `--destructive` token for users with deuteranopia/protanopia. No perceptual distance between "warning" and "destructive". WCAG 1.4.1. | `src/index.css:63` | Pixel | Pre-launch |
| C-17 | Halo | Editor `<video>` element has no `controls` and no keyboard handler on the click-to-advance frame target. Mouse-only users can click to advance scenes; keyboard users cannot. On mobile the Scenes column is hidden, so keyboard users have no scene-walk affordance from the Stage. WCAG 2.1.1 / 1.2.1 / 4.1.2. | `src/components/editor/Stage.tsx:610-611,656-670,688,629-637` | Access + Vega | Pre-launch |
| C-18 | Halo | No reduced-motion handling for Framer Motion. CSS `prefers-reduced-motion` block exists but framer-motion uses Web Animations API which CSS cannot reach. Every Button bounces on tap; landing/auth use full-page entrance transforms. Vestibular-disorder / migraine-trigger exposure for ~1% of users. WCAG 2.3.3. | Repo grep for `useReducedMotion|MotionConfig|reducedMotion` returns zero matches; affected: `src/components/ui/button.tsx:48-50`, `Landing.tsx:228-231,311-315,365-368,449-452`, `Auth.tsx:248-252,288-292`, etc. | Access + Vega (single `<MotionConfig reducedMotion="user">` at root) | Pre-launch |
| C-19 | Compass | Developer jargon (`429`, `Retry-After`, `RLS`, `webhooks`) leaked into the public Help FAQ. Brief explicitly says audience is **not developers**. A creator reading the FAQ to evaluate the product will infer "this is for engineers, not me" and bounce. | `src/pages/Help.tsx:147,156,169` | Guide + Herald (or move API content to a separate `/developers` route) | Pre-launch |
| C-20 | Trace | Dead link: AutopostHome's "Calendar view" button points at `/dashboard?tab=calendar` which is not a defined route — falls into the catch-all and renders the 404. None of the 404's quick suggestions surface a calendar-equivalent. | `src/pages/lab/autopost/AutopostHome.tsx:453`; `src/App.tsx:103-256` (no `/dashboard` route) | Sprint + Vega | Pre-launch |
| C-21 | Trace | Pricing → Signup loses paid-intent. Pricing redirects unauthed users to `/auth?next=/pricing&plan=creator`; Auth.tsx ignores both `next` and `plan` and only honors `returnUrl`. After sign-in the user lands on `/app` with the plan intent dropped — no auto-redirect to Stripe checkout. Dropped-revenue territory. | `src/pages/Pricing.tsx:104` vs `src/pages/Auth.tsx:107` | Hook (conversion) + Nexus (auth) | Pre-launch |
| C-22 | Trace | Autopost delivery-method initial state defaults to `'social'` while the social radio is `disabled: true` (Social paused pending YouTube data-access verification). The default is unactionable; the validation toast hint steers users only into the second clause of the validation, leaving the first impossible. Trap state on the autopost intake. | `src/components/intake/IntakeForm.tsx:161-170`; `src/components/intake/ScheduleBlock.tsx:596-602,639-643`; validation `src/components/intake/IntakeForm.tsx:665-674` | Vega + Hook | Pre-launch |

### Major

| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|
| Mj-1 | Optic | Internal route name `/dashboard-new` exposed to users in the address bar; sidebar + topbar logos link to it; comment in source says "Delete this route once DashboardLayout graduates." Reads as "still building" when shared in screenshots. | `src/App.tsx:117,210-223`; `Sidebar.tsx:286`; `AppShell.tsx:88` | Forge (route rename) | Next release |
| Mj-2 | Optic + Trace | `window.prompt()` used for URL attachment in IntakeForm and for rename/delete in VoiceLab + admin RichEditor. Native browser dialogs can't be themed, leak typed values to prompt history, and look broken in the dark UI. Author flagged it themselves at line 934. | `src/components/intake/IntakeForm.tsx:933-957,1274`; `src/pages/VoiceLab.tsx:648,661,989,1001`; `src/components/admin/_shared/RichEditor.tsx:78` | Vega | Next release |
| Mj-3 | Optic + Compass | Filter pill / mode pill / dropdown touch targets ship at 28–36 px on mobile — below Apple HIG (44 px) and below the WCAG 2.2 AAA 44×44 target. Audience produces vertical short-form video — they live on mobile. Pricing CTAs at h-9 (36 px) and h-10 (40 px) compound the issue at the conversion point. | `ProjectsGallery.tsx:321`; `Hero.tsx:197,222,264,307`; `Pricing.tsx:244,327`; `LandingPricing.tsx:230-236` | Vega + Pixel | Next release |
| Mj-4 | Optic | "Smart Flow" landing card mislabels the mode as "Infographics" — the in-product mode (`Hero.tsx:36-40`, `IntakeForm.tsx:845`) describes Smart Flow as "fast short-form reel". Same mode, two different stories across marketing and in-product UI. | `src/pages/Landing.tsx:437-445` vs in-product copy | Herald + Canvas | Next release |
| Mj-5 | Optic | `console.log` debug statements left in production landing-page mobile-nav handlers. Audience includes marketers + dev-adjacent creators who routinely open DevTools. | `src/pages/Landing.tsx:176,187,189,195` | Vega | Next release |
| Mj-6 | Proof | English idiomatic greetings ("Burning the midnight oil", "Late night creative session") in dashboard hero — non-native English speakers across the 11 supported languages won't parse them. Other greetings ("Good morning") translate cleanly. | `src/components/dashboard/Hero.tsx:42-48` | Guide | Next release |
| Mj-7 | Proof | Autopost lab page lede uses developer jargon ("recurring video pipelines firing"). FK-G 10.2 / FRE 43.1 — above target. Lab is the public-soft-launch surface per `LabHome.tsx:33`. | `src/pages/lab/autopost/AutopostHome.tsx:382-385` | Guide | Next release |
| Mj-8 | Proof | Toast titles use four different capitalization conventions (sentence case + exclamation, sentence case, Title Case, Title Case present-progressive, Title Case verb-only). No in-repo style decision committed. | Sample sites: `useVoiceCloning.ts:124,217`; `useSceneRegeneration.ts:62,65`; `useCinematicRegeneration.ts:140,196`; `useWorkspaceSubscription.ts:90`; `Sidebar.tsx:249,275`; `IntakeForm.tsx:746` | Guide | Next release |
| Mj-9 | Proof | Voice Lab "Suggested read · phonetically diverse" — speech-engineering jargon for a creator audience. | `src/pages/VoiceLab.tsx:906` | Guide | Next release |
| Mj-10 | Proof | Voice Lab "Test playground" header pairs with a `● LIVE` chip that misreads as broadcast-status semantics in a sandbox testing context. | `src/pages/VoiceLab.tsx:1180-1184` | Guide | Next release |
| Mj-11 | Proof + Compass | Marketing FAQ vs. in-app FAQ have different credit-policy descriptions on top of Blocker B-3. The same FAQ should be sourced from a single shared file consumed by both surfaces. | `marketing/src/pages/index.astro:60` vs `src/config/landingContent.ts:119-120` | Herald + frontend (centralize FAQ) | Next release |
| Mj-12 | Proof | Marketing footer claim names a subprocessor ("Seedance") that is not in the Privacy subprocessor list. If real → Privacy.tsx must list it (GDPR Art. 28). If not → footer is misleading. **Routes to Canon when Canon completes coverage.** | `marketing/src/pages/index.astro:455` vs `src/pages/Privacy.tsx:88-95` | Herald + Comply + Canon (re-verify) | Next release |
| Mj-13 | Proof | Auth page trust-strip claims "GDPR compliant" (a regulator-attention claim CNIL has called out as misleading without evidence) and "SSL secured" (technically wrong — SSL deprecated 10 years ago; should be TLS or "Encrypted in transit"). | `src/pages/Auth.tsx:529-531` | Guide + Comply | Next release |
| Mj-14 | Proof | Terms of Service §6 (credits & billing) at FK-G 16.6 and §9 (limitation of liability) at FK-G 21.1 — both above any reasonable consumer-readability target. Add side-by-side plain-English summaries; don't replace the legal text. **Routes to Canon when Canon completes coverage.** | `src/pages/Terms.tsx:82,98`; FK-G via `textstat==0.7.13` | Comply + Herald | Next release |
| Mj-15 | Halo | Toggle-group buttons (Format, Duration) are flat `<button>`s in a `<div>` — no `role="radiogroup"`, no `aria-pressed`, no fieldset/legend. Screen-reader users hear independent buttons with no group context. | `src/components/intake/IntakeForm.tsx:1014-1066`; grep: `role="radiogroup"\|role="radio"` matches only 4 unrelated places | Access + Vega | Next release |
| Mj-16 | Halo | Editor scene list buttons lack `aria-current` / `aria-pressed` for the active scene. Screen-reader users hear identical buttons with no active-state context. | `src/components/editor/ScenesColumn.tsx:82-94` | Access | Next release |
| Mj-17 | Halo | Mobile landing nav uses `<button onClick={scrollIntoView}>` for in-page anchors instead of `<a href="#features">`. Right-click "Open in new tab" doesn't work; SR users hear "button" not "link"; URL hash never updates. | `src/pages/Landing.tsx:173-202` vs desktop nav at `:101-114` | Access + Vega | Next release |
| Mj-18 | Halo | Dialog primitive doesn't require `<DialogDescription>`; demo modal + several admin dialogs ship without it. Radix logs warnings; SR users get only the dialog title. | `src/components/ui/dialog.tsx:30-52`; `src/pages/Landing.tsx:511-543` | Access + Vega | Next release |
| Mj-19 | Halo | Editor caption preview is sighted-only — no `<track kind="captions">` on the video. Burned-in captions in the rendered/exported video also fail WCAG 1.2.2 (cannot be turned off). | `src/components/editor/Stage.tsx:699-714,656-666` | Access + Vega | Next release |
| Mj-20 | Halo | Auth page rate-limit hint uses `text-amber-700` (off-brand) AND has no `role="alert"` — SR users get no announcement when the state appears. | `src/pages/Auth.tsx:460-464` | Access + Pixel | Next release |
| Mj-21 | Halo | Sidebar `<aside>` and primary `<nav>` lack accessible names. Multiple landmarks per page; SR landmark navigation hears "navigation, navigation". | `src/components/dashboard/Sidebar.tsx:283,313` | Access | Next release |
| Mj-22 | Halo | Toggle-fullscreen button announces a static `aria-label="Toggle fullscreen"` regardless of current state. Same team applies the right pattern in Landing's menu toggle — just not uniformly. | `src/components/editor/Stage.tsx:587-602` | Access | Next release |
| Mj-23 | Compass | USD-only pricing + `en-US` date formatting hard-coded throughout the pricing surfaces. Marketing claims 11-language support; pricing UI immediately breaks that promise. Friction at the conversion moment. | `src/config/products.ts:42-53`; `src/components/landing/LandingPricing.tsx:153`; `src/pages/Projects.tsx:104` | Hook + frontend (locale-aware formatting) | Next release |
| Mj-24 | Compass | "1 credit = 1 second (5x for cinematic)" cost model is buried inside one plan's feature list. Without surfacing the math, creators will over- or under-buy and churn. | `src/components/landing/LandingPricing.tsx:61`; `src/config/products.ts:49-52`; `src/components/workspace/CreditEstimate.tsx:41`; `src/config/landingContent.ts:118-121` | Hook + Herald | Next release |
| Mj-25 | Compass | Yearly pricing display invites misreading — `$19 /month (billed annually)` with the load-bearing parenthetical as the smallest text; no upfront annual total disclosed; countdown urgency message doesn't state the post-increase price. Refund/chargeback risk. | `src/config/products.ts:43-46`; `src/components/landing/LandingPricing.tsx:222-227,152-153` | Hook + Herald | Next release |
| Mj-26 | Trace | V2 Announcement modal defaults the "Don't show this again" checkbox to UNCHECKED — silent dismissal closes session-only and the modal returns on every login. Hostile after 3-5 logins. | `src/components/announcements/V2AnnouncementModal.tsx:48,91-108` | Vega | Next release |
| Mj-27 | Trace | Hero submits via `window.location.href` (full page reload) — blows away the React tree, refetches the bundle, re-runs all Suspense boundaries, drops scroll position, and re-runs the V2AnnouncementModal logic. SPA navigation via `useNavigate()` is a 1-line change. | `src/components/dashboard/Hero.tsx:131-141,175` | Vega | Next release |
| Mj-28 | Trace | Hero language picker (7 languages) ≠ IntakeForm picker (11 languages). Inconsistent surface; users cannot start Russian/Chinese/Japanese/Korean videos from the dashboard fast-input. | `src/components/dashboard/Hero.tsx:13` vs `src/components/intake/IntakeForm.tsx:82-94` | Vega (single shared `LANGUAGES` constant) | Next release |
| Mj-29 | Trace | Autopost empty-state instructs the user to "toggle 'Run on a schedule' at the bottom" of the intake form — but the "New automation" CTA next to the instruction deeplinks to `/app/create/new?mode=cinematic`, a 1500-line form where the toggle is buried 10+ sections deep. | `src/pages/lab/autopost/AutopostHome.tsx:507-535`; IntakeForm rail invocation ~line 800+ | Vega + Hook | Next release |
| Mj-30 | Trace | Editor kickoff-error UI offers Retry but no "Top up credits" CTA, even though the error copy itself names credits as the most likely cause. | `src/pages/Editor.tsx:374-401` | Vega | Next release |
| Mj-31 | Trace | Editor zombie-project state (no generation row, no `?autostart=1`, no error) sits on the rendering overlay forever. Code comment claims a "Start generation" retry button is shown but the rendering path discards it. | `src/pages/Editor.tsx:166-174` (claim) vs `:403` (`void awaitingGeneration`) | Vega | Next release |
| Mj-32 | Trace | Mobile Generate button reads "Create Video · {n} cr" regardless of whether the user has flipped the schedule toggle to autopost-mode. | `src/components/intake/IntakeForm.tsx:1518-1524,684-748` | Vega + Guide | Next release |
| Mj-33 | Trace | Auth signup age-verification enforced only via the disabled-button gate; `handleSubmit` only re-validates `acceptedTerms`. Autofill quirks / DOM-tampered submits could bypass `ageVerified`. | `src/pages/Auth.tsx:179-199,504-507` | Nexus | Next release |

### Minor

| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|
| mn-1 | Optic | Greeting strings can wrap to 4 lines on a 360 px viewport with a long display name. | `src/components/dashboard/Hero.tsx:42-48,161` | Guide | Backlog |
| mn-2 | Optic | Sidebar Recent-projects delete cascades through 4 tables with AlertDialog confirm but no undo path. Out-of-scope to fix pre-launch; flag for next release. | `src/components/dashboard/Sidebar.tsx:240-264,595-618` | Vega + Forge (next release) | Backlog |
| mn-3 | Optic | Editor mobile drawer iOS Safari overlap — workaround in place; smoke-test on real device. | `src/components/editor/EditorFrame.tsx:362-372` | QA | Pre-launch smoke test |
| mn-4 | Proof | "tiktok" lowercased in suggestion chip — should be "TikTok". | `src/components/dashboard/Hero.tsx:39` | Guide | Backlog |
| mn-5 | Proof | "0:30 minimum" inside Voice Lab record button reads as a timestamp; should be "30 seconds" or "30 sec". | `src/pages/VoiceLab.tsx:893` | Guide | Backlog |
| mn-6 | Proof | "+ Example" button on Voice Lab playground too terse; recommend "Use sample text". | `src/pages/VoiceLab.tsx:1223` | Guide | Backlog |
| mn-7 | Proof | "Best Value" badge appears in three different visual treatments across pricing surfaces. | `LandingPricing.tsx:209`; `TabTopup.tsx:67`; `CreditTopUp.tsx:70` | Pixel + Guide | Backlog |
| mn-8 | Proof | "Continue with Google" / "Sign In" / "Sign in" inconsistent capitalization across Auth + Landing + marketing. | `Auth.tsx:336,513,271`; `Landing.tsx:140`; `marketing/src/pages/index.astro:121,434` | Guide | Backlog |
| mn-9 | Proof + Halo | `aria-label="Toggle TT/IG/YT"` uses platform abbreviations in screen-reader labels. `TT` is genuinely ambiguous. | `src/pages/lab/autopost/AutopostHome.tsx:478-493` | Access + Guide | Backlog |
| mn-10 | Halo | Hero badges over translucent video frames have variable contrast against worst-case backdrops. | `src/components/editor/Stage.tsx:558-562` | Pixel | Backlog |
| mn-11 | Halo | In-text `<a>` links in LandingFooter / LandingPricing / FAQ rely on hover-only underline — fails WCAG 1.4.1 in body text. | Various | Pixel + Vega | Backlog |
| mn-12 | Halo | Sidebar kebab menu hidden by `opacity-0 group-hover:opacity-100`; touch users without hover have no discovery. | `src/components/dashboard/Sidebar.tsx:482-489` | Vega | Backlog |
| mn-13 | Halo | `aria-describedby` form-error link cleared as soon as user types again; slow SRs may not have read it yet. | `src/pages/Auth.tsx:362-367,398` | Access | Backlog |
| mn-14 | Halo | Decorative SVGs sometimes use both `alt=""` AND `aria-hidden="true"` (redundant). | `src/pages/Landing.tsx:234-241` | Access | Backlog |
| mn-15 | Compass | Generic "Failed to..." toasts give no recovery path. Creators are problem-solvers but not debuggers. | `src/pages/Projects.tsx:381,426,464,476`; `Editor.tsx:317`; `Pricing.tsx:113,191` | Guide | Backlog |
| mn-16 | Compass | Auth lockout copy uses developer phrasing ("rate-limited"). | `src/pages/Auth.tsx:462` | Guide | Backlog |
| mn-17 | Compass | Hero claims "Used by 2,400+ marketers" while sibling copy says "Join 2,400+ creators" — same number, two nouns, adjacent. (Resolves automatically when B-1 is fixed.) | `src/pages/Landing.tsx:289,301` | Herald | Backlog |
| mn-18 | Trace | Login lockout (5 attempts / 30 s) survives only the React tree (`useRef` in-memory). Page refresh resets the counter. | `src/pages/Auth.tsx:103,159-162` | Nexus | Backlog |
| mn-19 | Trace | Sources block has two visually-different buttons ("+ Add source" dashed-border, "File" solid-border + paperclip) firing the same action. Hick's-law tax. | `src/components/intake/IntakeForm.tsx:911-930` | Vega | Backlog |
| mn-20 | Trace | Editor "Project not found" recovery offers only "Back to Studio" — no "Try again" / "Reload" affordance. | `src/pages/Editor.tsx:349-367` | Vega | Backlog |
| mn-21 | Trace | Subscription renewal modal uses `text-orange-500`; brand brief and audit memory both ban orange. Same fix at `src/components/ui/password-strength.tsx:15,36`. | `src/components/workspace/SubscriptionRenewalModal.tsx:120` | Pixel + Vega | Backlog |

### Polish

| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|
| p-1 | Optic | Settings → Workspace tab body literally says "coming soon". Acceptable on Settings; consider hiding the tab. | `src/pages/Settings.tsx:479` | Vega | Optional |
| p-2 | Optic | Hero "Direct" `⏎` keyboard hint shows on mobile (no enter key). Wrap in `hidden sm:inline-flex`. (Stale once C-6 ships a new label.) | `src/components/dashboard/Hero.tsx:351` | Vega | Optional |
| p-3 | Optic | Landing testimonials are use-cases, not real testimonials (overlaps C-8 — kept for record). | `src/components/landing/Testimonials.tsx:3-19` | Herald | Optional |
| p-4 | Proof | Landing features intro is a slight FK-G overshoot; small reorder lowers reading level. | `src/pages/Landing.tsx:377-379` | Herald | Optional |
| p-5 | Proof | Hero tagline is a noun-fragment chain that translates poorly across the 11 supported languages. | `src/pages/Landing.tsx:248` | Herald | Optional |
| p-6 | Halo | No automated a11y CI gate. Recommend `@axe-core/playwright` against top 5 routes. | Repo lacks axe-core in test or pa11y in CI | Access + Sprint | Optional |
| p-7 | Halo | Sonner toaster defaults — consider explicit non-color signal in error toasts since brand bans red. | `src/App.tsx:89` | Pixel + Vega | Optional |
| p-8 | Compass | Decorative pseudo-avatars next to social-proof number. (Resolves automatically when B-1 + C-8 land real avatars.) | `src/pages/Landing.tsx:294-298` | Pixel | Optional |
| p-9 | Trace | `/lab/autopost/schedules/:id` redirect drops the id segment. | `src/App.tsx:204-206` | Sprint | Optional |
| p-10 | Trace | V2 Announcement at 720 px tall on landscape phones — mild dismissal-affordance ergonomic friction. | `src/components/announcements/v2-announcement.css:42-65` | Vega + Pixel | Optional |

---

## 4. Routing & Next Steps

- [x] **Verdict:** `FAIL` — project halts pre-launch; remediation + re-audit required.
- [ ] **Blockers (B-1 → B-4)** routed to layer leads:
  - B-1, B-2, B-3 → **Herald** (creator copy) + **Comply** (legal liaison for B-3) — deadline pre-launch
  - B-4 → **Vega + Nexus + Flow** (mode definition + scope decision) — deadline pre-launch
- [ ] **Critical (C-1 → C-22)** routed to layer leads (NOT to specialists directly, per protocol):
  - Brand / visual / content layer (C-1, C-3, C-4, C-7, C-8, C-19) → **Pixel + Canvas + Herald**
  - Color tokens / brand-color drift (C-2, C-15, C-16) → **Pixel** (single-token-bump fixes touch ~30 files at once)
  - Empty/fake CTAs + microcopy (C-5, C-6, C-9, C-11) → **Canvas + Guide**
  - Pricing / urgency / commercial claims (C-10) → **Penny + Herald**
  - Accessibility (C-12, C-13, C-14, C-17, C-18) → **Access** (with Vega for component changes)
  - Flow / routing / state (C-20, C-21, C-22) → **Sprint + Hook + Vega**
- [ ] **Major findings** logged in Sprint's queue for next-release scope.
- [ ] **Re-audit scheduled** — only originating reviewers per the protocol (saves token cost; keeps focus tight). Specifically:
  - **Halo** must rerun the keyboard + screen-reader pass after C-12, C-13, C-17 land
  - **Proof** must verify zero matches for "2,400" / "Professional plan" / `#F5B049` (plus FAQ alignment) post-fix
  - **Optic** must re-walk the brand-color drift fix to confirm `#11C4D0` is gone from the lab/autopost surfaces
  - **Trace** must re-walk the Pricing→Stripe round-trip + the autopost default + the Visual Stories card
  - **Compass** must re-verify Help/FAQ jargon removed and pricing-locale signals improved
- [ ] **Canon** — must complete the missing coverage pass on (a) brand-color drift findings (overlaps C-2, C-3, C-4, C-15, C-16, mn-21), (b) legal-text findings (Mj-12 Seedance subprocessor, Mj-14 Terms readability), and (c) Privacy/subprocessor accuracy. Until Canon completes, `FAIL` cannot promote to `PASS WITH FIXES` even if every other Critical/Blocker closes.
- [ ] **Pipeline gate:** `protocols/code-standards.md` requires `PASS` or `PASS WITH FIXES` on file at `shared_context/audits/<project>/<date>/verdict.md` before a production deploy. **This verdict is `FAIL` — pipeline must hold.**

---

## 5. Conflict Resolutions

Per `agents/audit/jury.md` Rule 7, Jury resolves cross-reviewer conflicts using the audience rubric.

| Conflict | Reviewers involved | Jury decision | Rationale |
|---|---|---|---|
| Compass recommended `PASS WITH FIXES`; Proof, Halo, Trace recommended `FAIL` | Compass vs. Proof + Halo + Trace | **Side with `FAIL`** | Compass scored audience-fit only and explicitly noted that lane-overlapping findings (e.g., M-4 tap targets) were "the same defect from a different rubric." Once Proof's Blocker-class FTC/UCPD claims, Halo's WCAG 1.4.3 contrast failures across 30 files, and Trace's phantom-feature Blocker are aggregated, the ship-blocking severity is unambiguous. The audience (marketers who recognize fake social proof; non-developers who'd bounce on `429`/`Retry-After`; mixed-language users who can't parse "Direct") supports the stricter verdict. |
| `--destructive` token bound to brand gold (Halo C-15) vs. brand brief's "no red, no green" rule (Optic C-3 + C-4) | Halo vs. Pixel/Optic | **Side with Halo on the a11y requirement, side with brand on the color choice — require both to be satisfied** | The brand brief is non-negotiable (no red), but the fix is not "add red back" — it's "add a non-color structural cue" (border weight, dashed outline, "Permanent" badge, icon size). Pixel + Vega own the implementation that lets gold stay AND meets WCAG 1.4.1. |
| `--warning` token currently amber `#F5A623` violates the brand brief AND is perceptually identical to gold `--destructive` (Halo C-16) | Halo vs. Pixel | **Side with Halo — pick a cooler / lower-saturation gold for warning OR add an icon-driven differential** | Brand-brief compliance + a11y compliance are both load-bearing; they are not in conflict — they both demand the amber be removed. Choice of replacement is Pixel's. |
| Trace M11 (fabricated social proof), Proof Blocker-1, Optic C-2, Compass C-1 — same artifact, four different severities (Blocker vs. Critical vs. Critical vs. Critical) | All four | **Promote to Blocker (B-1)** | Convergence elevates risk, not lowers it. The Proof rubric (FTC §255.1 / EU Directive 2005/29/EC) carries the legal-exposure framing that makes this Blocker-class. The other reviewers' framings (brand-trust damage, audience-fit, flow risk) compound the exposure rather than dilute it. |
| Trace + Optic flagged the V2 announcement modal's `#F5B049` orange + `#5CD68D` green; both as Critical | Trace + Optic (alignment, not conflict) | **Hold at Critical (C-3)** | No conflict to resolve — same severity, same artifact, same recommended fix (global swap). Listed once with both reviewers in the Reviewer column. |
| "Watch Demo" placeholder modal — Optic Critical, Proof Critical, Trace Major (M10), Compass Minor (m-4) | All four | **Hold at Critical (C-1)** | Trace + Compass scored their findings inside their own rubric (flow / audience-fit) and noted both should escalate if launch is imminent. Proof's framing (trust-beat on the highest-traffic CTA + verb/outcome mismatch) and Optic's framing (H1/H2 violation on a primary hero CTA) together establish brand-damage Critical. Launch IS imminent. Critical stands. |

---

## 6. Reviewer Reports

Per-reviewer detailed findings:

- `shared_context/audits/motionmax/2026-05-10/optic.md` — UX/UI heuristics, score 2/5, 6 Critical / 6 Major / 3 Minor / 3 Polish
- `shared_context/audits/motionmax/2026-05-10/proof.md` — content & wording, score effectively 1/5 (FAIL), 3 Blocker / 7 Critical / 9 Major / 6 Minor / 2 Polish
- `shared_context/audits/motionmax/2026-05-10/halo.md` — accessibility, score 1/5 (FAIL), 7 Critical / 9 Major / 5 Minor / 2 Polish
- `shared_context/audits/motionmax/2026-05-10/compass.md` — audience alignment, score 3/5 (Compass-recommended PASS WITH FIXES; Jury overrode), 4 Critical / 4 Major / 3 Minor / 1 Polish
- `shared_context/audits/motionmax/2026-05-10/trace.md` — flow & logic, score 2/5 (FAIL), 1 Blocker / 4 Critical / 13 Major / 4 Minor / 2 Polish
- `shared_context/audits/motionmax/2026-05-10/canon.md` — **NOT PRODUCED.** Canon (visual consistency / legal-text reviewer) did not complete coverage. Several findings (B-3, C-7, C-10, Mj-12, Mj-14) cite Canon as a required co-verifier; remediation cannot promote `FAIL → PASS WITH FIXES → PASS` until Canon completes the missing pass. Routed to BigBrain for re-dispatch.

This verdict file is the synthesized output. Reviewer files are the source of truth for individual findings.

---

## 7. Sign-off

- **Jury (synthesis):** Jury · 2026-05-10
- **BigBrain acknowledgment:** _pending_
- **Jo's review (required because verdict is `FAIL`):** _pending_
