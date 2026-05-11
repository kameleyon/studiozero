# Canon — Visual Consistency Audit — motionmax-360 — 2026-05-10

**Reviewer:** Canon (Visual Consistency Auditor)
**Status:** Complete
**Audience:** Tool-savvy creative adults — content creators, marketers, video producers. Mobile-heavy. US launch.
**Brand rule under audit (verbatim from brief + memory):** aqua `#14C8CC` + gold `#E4C875` ONLY. No red. No green. No orange (especially in autopost / lab UI). Templates often ship `#F5B049` orange — must swap on import.

The audit traces every shipped surface (marketing site, in-app shells, transactional email, PWA chrome, OG/social, admin tooling) against the declared design system and the rules above. Severity uses the jury rubric.

---

## Category 1 — Brand color conformance

### Critical-1. Voice Lab speaker-flag gradients ship red, green, and template orange across 8 of 17 accents
- **Severity:** Critical
- **Issue:** The accent-color palette for the Voice Lab speaker cards uses raw red, green, amber/orange hexes for UK, AU, ES, LATAM, NL, RU, CN, HT, JP. Brand rule is aqua + gold only.
- **Evidence:** `src/lib/voiceCatalog.ts:222-238`. Verbatim:
  - `case "UK": return "linear-gradient(135deg, #EF4444, #991B1B)";` (red)
  - `case "AU": return "linear-gradient(135deg, #10B981, #047857)";` (green)
  - `case "ES": return "linear-gradient(135deg, #F59E0B, #B45309)";` (orange)
  - `case "LATAM": return "linear-gradient(135deg, #F97316, #C2410C)";` (orange)
  - `case "NL": return "linear-gradient(135deg, #F97316, #1E3A8A)";` (orange + blue)
  - `case "RU": return "linear-gradient(135deg, #DC2626, #7F1D1D)";` (red)
  - `case "CN": return "linear-gradient(135deg, #DC2626, #FBBF24)";` (red + orange)
  - `case "JP": return "linear-gradient(135deg, #F472B6, #BE185D)";` (pink/magenta)
  - `case "HT": return "linear-gradient(135deg, #1D4ED8, #DC2626)";` (blue + red)
- **Fix:** Replace `avatarBackground()` with a brand-palette-only mapping. Use one of three on-brand gradient templates per accent — `linear-gradient(135deg, #14C8CC, #0FA6AE)` (aqua-primary), `linear-gradient(135deg, #E4C875, #C9A75A)` (gold-primary), `linear-gradient(135deg, #14C8CC, #E4C875)` (duo) — and pick deterministically per ISO/region code with a hash to keep flags distinguishable without inventing new hues. **Where:** `src/lib/voiceCatalog.ts:220-240`. **How:** swap the case bodies; keep the function signature.
- **Effort:** S

### Critical-2. Transactional emails ship the template orange `#F5B049` in the primary CTA gradient
- **Severity:** Critical
- **Issue:** Every MotionMax transactional email — verification, password reset, billing, support — renders its primary CTA button as a gradient that starts at the brand-forbidden template orange `#F5B049` and ends at gold `#E4C875`, with a `rgba(245,176,73,.45)` orange border. The template orange is exactly the color the project memory says must be swapped on import.
- **Evidence:** `supabase/functions/_shared/emailTemplate.ts:55`:
  - `style="...background:linear-gradient(135deg,#F5B049 0%,#E4C875 100%);...border:1px solid rgba(245,176,73,.45);"`
  - Background radial-gradient on the email body also uses `rgba(245,176,73,.14)` (line 80).
- **Fix:** Replace the CTA `background` with `linear-gradient(135deg,#E4C875 0%,#C9A75A 100%)` (brand gold + deep gold) and the border with `rgba(228,200,117,.45)`. Replace the body radial-gradient orange tint with `rgba(228,200,117,.14)`. **Where:** `supabase/functions/_shared/emailTemplate.ts:55,80`. **How:** two-line color substitution; no structural change.
- **Effort:** XS

### Critical-3. v2 announcement modal ships template orange and a green pulse — across the whole modal
- **Severity:** Critical
- **Issue:** The v2 announcement modal currently shipping to every authenticated user on first hit (per `V2AnnouncementModal.tsx:43-48`) inlines the template orange `#F5B049` for numerals, "NEW" pills, and gold-icon containers, and uses a green pulse `#5CD68D` / `rgba(92,214,141,…)` as the open-state indicator. Direct violation of "no orange" and "no green" in the most prominent in-app dialog.
- **Evidence:** `src/components/announcements/v2-announcement.css`:
  - Line 11 (palette comment claims `--gold → #F5B049`)
  - Lines 162-163: `color: #F5B049; -webkit-text-fill-color: #F5B049;` (numeral italic)
  - Line 171: `background: #5CD68D;` (pulse dot)
  - Lines 172-178: `box-shadow: 0 0 0 0 rgba(92, 214, 141, .7); … rgba(92, 214, 141, 0);` (green pulse animation)
  - Line 269: `color: #F5B049;` (gold-icon container)
  - Lines 299-301: `background: rgba(245, 176, 73, .16); color: #F5B049; border: 1px solid rgba(245, 176, 73, .3);` ("NEW" pill)
- **Fix:** Global find-replace inside this file: `#F5B049` → `#E4C875`, `rgba(245, 176, 73, ...)` → `rgba(228, 200, 117, ...)`, `#5CD68D` → `#14C8CC`, `rgba(92, 214, 141, ...)` → `rgba(20, 200, 204, ...)`. Update the palette comment header. **Where:** `src/components/announcements/v2-announcement.css:9-23,162-178,267-302`. **How:** mechanical color substitution; no DOM changes.
- **Effort:** XS

### Critical-4. Admin shell ships green `#5CD68D` and purple `#a78bfa` as first-class status tokens, contradicting its own header
- **Severity:** Critical
- **Issue:** `admin-tokens.css` opens with the comment "Cyan + gold palette only (NO red — destructive renders as gold)" and then defines `--good: #5CD68D` (green) and `--purple: #a78bfa`, plus a tab-pulse keyframe that animates with `rgba(92, 214, 141, ...)` (green). These tokens are then consumed across the entire Admin tab suite for KPIs, log levels, console output, sparkline colors, funnel steps, plan badges, etc. Admin is a primary internal surface and the tokens leak straight into customer-impact pages.
- **Evidence:**
  - `src/styles/admin-tokens.css:40-42`: `--good: #5CD68D; --purple: #a78bfa; --danger: #E4C875;`
  - `src/styles/admin-tokens.css:60-64`: keyframe `adm-tab-pulse` animates `rgba(92, 214, 141, …)`
  - `src/styles/admin-shell.css:211,212,307,308,378-380,395,454,512,551,600,602`: 12 sites consuming `--good` / `--purple` / `rgba(92,214,141,...)`
  - Inline hex use of the same green/purple in tabs:
    - `src/components/admin/tabs/TabAnalytics.tsx:45,47,179-180,190`
    - `src/components/admin/tabs/TabConsole.tsx:38,40`
    - `src/components/admin/tabs/TabPerformance.tsx:49,51`
    - `src/components/admin/tabs/TabErrors.tsx:138,317`
    - `src/components/admin/tabs/TabUsers.tsx:247`
    - `src/components/admin/tabs/TabGenerations.tsx:255`
    - `src/components/admin/tabs/TabApi.tsx:330`
    - `src/components/admin/tabs/TabNewsletter.tsx:326`
- **Fix:** Re-map the admin status palette to brand-only:
  - `--good: #14C8CC` (success → aqua, matches in-app `--success`)
  - Replace `--purple` with a second-tier gold or aqua-light: `#7AD6E6` (aqua-light) or `#C9A75A` (deep gold). Pick one per data-viz dimension and stick with it.
  - Replace the keyframe rgba `92,214,141` with `20,200,204` (cyan).
  - Migrate every inline `#5CD68D` / `#a78bfa` in the TabXxx.tsx files to the new tokens via `var(--good)` / `var(--alt)`.
  **Where:** `src/styles/admin-tokens.css:40-64`, `src/styles/admin-shell.css:211-602`, every TabXxx.tsx flagged above. **How:** token edit + project-wide find-replace of the hex values; replace inline hexes with var() references so the next palette change propagates.
- **Effort:** M

### Critical-5. Marketing site `--destructive` token still resolves to red — cross-surface drift
- **Severity:** Critical
- **Issue:** The in-app surface migrated `--destructive` to gold (`src/index.css:67-69` light, `:146-148` dark) per the brand rule. The marketing surface did not — it still ships pure red destructive (`HSL 0 72% 51/55%` ≈ `#DE3535`). Any destructive primitive rendered on motionmax.io is therefore red, while the same primitive in `/app` is gold. Same brand, two different destructive languages.
- **Evidence:**
  - `marketing/src/styles/global.css:36-37`: `--destructive: 0 72% 51%; --destructive-foreground: 0 0% 100%;`
  - `marketing/src/styles/global.css:77-78`: `--destructive: 0 72% 55%; --destructive-foreground: 0 0% 100%;`
  - Compare against `src/index.css:67-69`: `--destructive: 45 67% 55%; --destructive-foreground: 200 9% 10%;` (gold).
- **Fix:** Replace the marketing destructive HSL with the same gold values used in-app. **Where:** `marketing/src/styles/global.css:36-37,77-78`. **How:** copy the four lines from `src/index.css`.
- **Effort:** XS

### Critical-6. Two different aquas ship in the same product (`#11C4D0` globally vs `#14C8CC` in shells)
- **Severity:** Critical
- **Issue:** Brand spec is `#14C8CC`. Every `.admin-shell`, `.billing-shell`, `.autopost-shell`, `.support-shell`, `.settings-shell` page renders `#14C8CC` (correct). Every other surface — landing, intake, editor, voice lab, dashboard, dialogs, every Tailwind `brand-aqua` / `text-primary` / `ring-primary` utility — renders `#11C4D0` because the global token is HSL `184 85% 44%`. The in-product navigation moves users between the two aquas without warning.
- **Evidence:**
  - `src/index.css:27`: `--brand-aqua: 184 85% 44%; /* #11C4D0 */` (developer comment confirms it's `#11C4D0`)
  - `src/index.css:44`: `--primary: 184 85% 44%;` (same — hsl-derived `#11C4D0`)
  - `marketing/src/styles/global.css:12,24`: same HSL, same `#11C4D0`
  - Shell tokens: `src/styles/admin-tokens.css:17`, `billing-tokens.css:14`, `autopost-tokens.css:18`, `settings-tokens.css:18`, `support-tokens.css:17` all hard-code `--cyan: #14C8CC`
  - `src/lib/voiceCatalog.ts:236,238` directly uses `#14C8CC` for default avatar — proving `#14C8CC` is treated as canonical elsewhere
- **Fix:** Pick one aqua and propagate. Recommended: keep `#14C8CC` (matches brand spec, brief, project memory, autopost/admin/billing/support/settings shells, voice catalog default). Update the global HSL to the equivalent of `#14C8CC` ≈ HSL `181 82% 44%` and re-derive `--primary`, `--ring`, `--secondary`, `--success` if needed. **Where:** `src/index.css:26-28,44,47,77,87-88,92,99,103,118-120,122-124,127,151-152,160-161,166,172-173,176`; `marketing/src/styles/global.css:11-13,24-26,38,42,46-48,53,63-65,79,82`. **How:** convert `#14C8CC` to HSL once (≈ `181 82% 44%`) and replace all `184 85% 44%` and the related light/dark lines together so the whole ramp shifts coherently. Do NOT change shell tokens — they're already correct.
- **Effort:** S

### Major-7. Tailwind `amber-*`, `orange-*`, `yellow-*`, `red-*`, `green-*` utilities used in product chrome
- **Severity:** Major
- **Issue:** The brand rule explicitly forbids orange, red, and green in chrome. These Tailwind utilities are imported as is and bypass the design system entirely.
- **Evidence:** verified per file:line:
  - `src/components/landing/LandingPricing.tsx:150,167,208` — `text-amber-400`, `border-amber-500/30 bg-amber-500/10 text-amber-400`, `border-amber-500/40 bg-amber-500/10 text-amber-400` (popular-plan badge — primary conversion surface)
  - `src/components/dashboard/LowCreditWarning.tsx:16-26` — `border-amber-500/40 bg-amber-500/10 text-amber-500/700/400` and a hover background `hover:bg-amber-500/10` (visible to every user near credit cap)
  - `src/pages/Auth.tsx:461` — auth notice `text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50`
  - `src/components/workspace/CharacterConsistencyToggle.tsx:111` — `text-amber-500`
  - `src/components/workspace/SubscriptionRenewalModal.tsx:120` — `text-orange-500` on `<Clock>` icon (renewal CTA)
  - `src/components/ui/password-strength.tsx:15-37` — `bg-orange-500`, `bg-yellow-500`, `text-orange-500`, `text-yellow-600` (visible on every signup)
  - `src/components/workspace/CaptionStyleSelector.tsx:98,100` — `bg-red-600` and `text-green-400` for caption style chips (these are previews of caption appearance on output video, but they sit inside chrome with no demarcation)
  - Voice Lab `src/pages/VoiceLab.tsx:663,1002` — `hover:text-red-400` on delete affordance
- **Fix:** Replace every warning/destructive Tailwind utility with brand tokens — `text-warning` / `bg-warning/10` / `border-warning/40` (where `--warning` has been re-mapped to gold, see Major-8) or directly `text-brand-gold` / `bg-brand-gold/10`. Replace every `text-red-*` hover on destructive icons with `hover:text-brand-gold`. For caption-style chips wrap them in a clearly labelled "video preview" frame so the red/green reads as user-content, not chrome. **Where:** see file:line list above. **How:** tailwind class swap; introduce a single `<WarningPill>` / `<DangerIconButton>` component to prevent regression. The password-strength meter should derive its color from a brand 0-25-50-75 scale (e.g., `bg-destructive`/`bg-warning`/`bg-warning`/`bg-success`).
- **Effort:** M

### Major-8. Global `--warning` token resolves to amber/orange `#F5A623`, contradicting "no orange"
- **Severity:** Major
- **Issue:** The shell-scoped pages render warnings as gold (correct, see autopost-tokens.css comments). The global token used by Tailwind utilities and any non-shell page is `38 92% 50/55%` — pure amber/orange. Anything that consumes `bg-warning` / `text-warning` outside a shell renders forbidden amber.
- **Evidence:** `src/index.css:64,143` (light/dark) and `marketing/src/styles/global.css:34,75-76`. Computed HSL `38 92% 50%` ≈ `#F5A623`.
- **Fix:** Re-map global `--warning` to `45 67% 55%` (light) and `45 67% 68%` (dark) — same gold ramp used by shells. **Where:** `src/index.css:64-65,142-143`; `marketing/src/styles/global.css:34-35,75-76`. **How:** four-line edit, two surfaces.
- **Effort:** XS

### Major-9. PWA `theme_color` and Safari mask-icon color are off-brand teal, not brand aqua
- **Severity:** Major
- **Issue:** The PWA chrome (Android status bar, Apple add-to-home-screen tile, Windows tile color, Safari pinned-tab mask) all advertise the brand color. Both manifest and HTML declare `#2D9A8C` — a darker, desaturated teal that is on no part of the brand palette. Brand aqua is `#14C8CC`. Brand dark is `#0F1112`.
- **Evidence:**
  - `public/manifest.json:8`: `"theme_color": "#2D9A8C"`
  - `index.html:26`: `<link rel="mask-icon" href="/favicon.png" color="#2D9A8C" />`
  - `index.html:30`: `<meta name="theme-color" content="#0F1112" />` (this one is on-brand — brand-dark — but inconsistent with the manifest above)
- **Fix:** Set `manifest.json` `theme_color` to `#14C8CC` (brand aqua) for the WebAPK chrome accent, OR `#0F1112` if a calm dark chrome is preferred (match `<meta theme-color>`). Set the mask-icon color to `#14C8CC`. Pick one rule and apply it everywhere. **Where:** `public/manifest.json:8`, `index.html:26`. **How:** two hex edits; align with whatever the chosen iOS status-bar style ends up being.
- **Effort:** XS

### Major-10. Email H1 uses Georgia/Playfair Display — neither matches the in-app heading stack
- **Severity:** Major
- **Issue:** The transactional email H1 declares `font-family: Georgia, 'Playfair Display', serif`. The in-app heading stack is `Instrument Serif` (admin/billing) or `Fraunces, Instrument Serif` (autopost/settings/support). The marketing site uses Inter for headings. Three different heading languages across three primary surfaces (email, in-app, marketing) for the same brand.
- **Evidence:** `supabase/functions/_shared/emailTemplate.ts:97`: `font-family:Georgia,'Playfair Display',serif`. Compare with `src/styles/admin-tokens.css:49` (`'Instrument Serif', Georgia, serif`), `src/styles/autopost-tokens.css:40` (`'Fraunces', 'Instrument Serif', Georgia, serif`), and Inter on the marketing landing.
- **Fix:** Replace email heading stack with `font-family: 'Instrument Serif', Georgia, serif` (matches the predominant in-app stack, has a graceful Georgia fallback for clients that strip web fonts — which most email clients do). Optionally inline a small base64 Instrument Serif Regular for clients that allow web fonts. **Where:** `supabase/functions/_shared/emailTemplate.ts:97`. **How:** one-line edit.
- **Effort:** XS

### Major-11. Marketing landing uses emoji as feature icons; in-app uses Lucide — visible drift on the acquisition surface
- **Severity:** Major
- **Issue:** The marketing landing — the surface every visitor sees first — illustrates its 6 feature cards with platform-rendered emoji `🎬 🎙️ ✨ 💬 🌍 ✏️`. Every other surface in the product uses Lucide icons (consistent line weight, consistent stroke, brand-aligned). Emoji are platform-rendered (different on iOS, Android, Windows, macOS) and break the brand chrome on the marketing surface specifically.
- **Evidence:** `marketing/src/pages/index.astro:6,11,16,21,26,31` — `icon: "🎬"`, `icon: "🎙️"`, `icon: "✨"`, `icon: "💬"`, `icon: "🌍"`, `icon: "✏️"`.
- **Fix:** Swap each emoji for a Lucide icon (or matching brand-illustrated SVG) — e.g., `🎬 → Clapperboard`, `🎙️ → Mic`, `✨ → Sparkles`, `💬 → MessageSquare`, `🌍 → Globe`, `✏️ → PencilLine`. Render at 32-40px in brand aqua. Add @lucide/astro or hand-render the SVGs (Astro has zero hydration cost). **Where:** `marketing/src/pages/index.astro:4-35` and feature-card markup further down. **How:** import + swap.
- **Effort:** S

### Major-12. Two competing serif declarations across shell tokens — primary face is never loaded
- **Severity:** Major
- **Issue:** Three shells (autopost, settings, support) declare `--serif: 'Fraunces', 'Instrument Serif', Georgia, serif`. Two shells (admin, billing) declare `--serif: 'Instrument Serif', Georgia, serif`. `index.html:126-128` loads only Inter, Instrument Serif, and JetBrains Mono — Fraunces is NOT loaded anywhere. The shells silently fall through to Instrument Serif, masking divergent type-system intent that will manifest the day someone adds Fraunces to the loader for a different reason.
- **Evidence:**
  - `src/styles/admin-tokens.css:49`, `billing-tokens.css:36`: Instrument Serif primary
  - `src/styles/autopost-tokens.css:40`, `settings-tokens.css:40`, `support-tokens.css:39`: Fraunces primary
  - `index.html:126-128`: Fraunces is missing from the Google Fonts URL
- **Fix:** Pick one. If Fraunces is the brand serif, add it to the Google Fonts loader at `index.html:128` (`&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600`) and update admin/billing tokens to match. If Instrument Serif is canonical, strip Fraunces from autopost/settings/support tokens. **Where:** `index.html:126-128` + the five `*-tokens.css` files. **How:** unify across all five shells; document the chosen serif in the brand guide and link it from the shell tokens.
- **Effort:** S

### Major-13. Storytelling product remnants on user-facing surfaces
- **Severity:** Major
- **Issue:** The brief states the storytelling product is being removed. SEO keywords, voice catalog descriptions, and dashboard filters still surface the term to users.
- **Evidence:**
  - `index.html:15` keyword meta: `... video storytelling, automated video production ...`
  - `src/components/landing/SeoHead.tsx:41` — same keyword string repeated
  - `src/components/workspace/SpeakerSelector.tsx:102,111,120,135` — voice descriptions reference "storytelling" / "narrative" as voice characteristics
  - `src/components/dashboard/ProjectsGallery.tsx:35-39` — `EXPLAINER_TYPES = new Set(['doc2video', 'storytelling', 'explainer'])` (legitimate legacy mapping but should be flagged for sunset; the comment says "pre-date the rename")
- **Fix:** Strip "storytelling" from `index.html:15` and `SeoHead.tsx:41` keyword strings. Audit `SpeakerSelector.tsx` voice descriptions: change "storytelling" to "narrative" or "documentary" (kept; a voice attribute is fine). Add a TODO above `EXPLAINER_TYPES` to remove `'storytelling'` once the legacy rows are migrated to `'doc2video'` (data migration, not a chrome fix). **Where:** see lines above. **How:** keyword strip + voice-description copy edit + TODO comment.
- **Effort:** S

### Minor-14. 1565 hard-coded hex colors across 89 source files bypass the token system
- **Severity:** Minor (volume) / Major (locally, in admin and unsubscribe surfaces)
- **Issue:** `Grep "#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}"` returns 1565 hits across 89 source files. Hot spots:
  - `src/pages/Unsubscribe.tsx`: 11 hex colors inlined as `style={{ color: "#..." }}` (lines 75,82,84,87,94,97,100,101,106)
  - `src/pages/Settings.tsx`: 8 inline hex colors (lines 685,690,692,701, ...)
  - `src/pages/Help.tsx`: 13 inline hex colors
  - `src/components/admin/_shared/Avatar.tsx:43,63`: defaults `#3a4a8a`, `#1a223f` (purple/blue) — see Minor-15
  - `src/components/announcements/AdminAnnouncementBanner.tsx:198,199`: inline `#ECEAE4`, `#B5BCC2`
  - Admin tabs (Newsletter, Errors, Console, Performance, Generations, Users, Api): repeated `#5CD68D`, `#a78bfa`, `#7ad6e6` (covered by Critical-4)
- **Fix:** Triage in two passes:
  1. Migrate inline hex values that appear in JSX `style={{ color: "..." }}` to either Tailwind classes or `var(--token)` references. Establish a lint rule: ESLint plugin `@stylistic` or a custom rule that fails on raw hex inside JSX style props.
  2. Document a brand-token whitelist of hex values that ARE allowed inline (the canonical shell palette: `#14C8CC`, `#0FA6AE`, `#E4C875`, `#C9A75A`, `#0A0D0F`, `#10151A`, `#151B20`, `#1B2228`, `#ECEAE4`, `#8A9198`, `#5A6268`, `#0a0e10`).
  **Where:** project-wide; biggest wins in `Unsubscribe.tsx`, `Settings.tsx`, `Help.tsx`, `AdminAnnouncementBanner.tsx`, admin tabs (already covered by Critical-4 fix). **How:** introduce ESLint rule first to stop new drift; migrate offending files in priority order (admin → unsubscribe → help → settings).
- **Effort:** L

### Minor-15. Admin Avatar default gradient is off-brand purple/blue
- **Severity:** Minor
- **Issue:** When an admin user has no custom avatar color, `Avatar.tsx` renders a `linear-gradient(135deg, #3a4a8a, #1a223f)` — a navy/purple gradient that is off the brand palette. Visible across every admin user list.
- **Evidence:** `src/components/admin/_shared/Avatar.tsx:43,63`. Defaults: seed `#3a4a8a`, end `#1a223f`.
- **Fix:** Default to `linear-gradient(135deg, #14C8CC, #0FA6AE)` (aqua) or `linear-gradient(135deg, #E4C875, #C9A75A)` (gold) — alternate per user-id hash so adjacent rows look distinct without inventing a new hue. **Where:** `src/components/admin/_shared/Avatar.tsx:43,63`. **How:** edit the two hex literals; optionally add `pickGradient(user.id)` helper.
- **Effort:** XS

### Minor-16. Caption-style preview chips use raw `bg-red-600` and `text-green-400` inside chrome
- **Severity:** Minor
- **Issue:** `CaptionStyleSelector.tsx:98,100` uses `bg-red-600` and `text-green-400` inside chrome with no clear "this is a preview of video output, not chrome" demarcation. Reads as a brand violation at a glance.
- **Evidence:** `src/components/workspace/CaptionStyleSelector.tsx:98,100`.
- **Fix:** Wrap caption-style preview chips in a clearly demarcated frame — black inner background with a visible border, a "PREVIEW" microcopy label, and reduced size — so the red/green clearly read as user-content rather than chrome. **Where:** `src/components/workspace/CaptionStyleSelector.tsx`. **How:** wrap each style preview in a `<span className="inline-flex items-center rounded border border-white/10 bg-black/60 px-2">` container and label the section "Caption preview".
- **Effort:** S

---

## Category 2 — Iconography conformance

### Major-17. Marketing emoji icons vs in-app Lucide icons (covered above as Major-11)
See Major-11.

### Polish-18. Decorative caption-fonts loaded globally on the public landing
- **Severity:** Polish (mostly perf, but iconography-adjacent)
- **Issue:** `index.html:126` loads ~13 decorative caption fonts (Bangers, Pacifico, Bebas Neue, Pangolin, Flavors, Chango, Luckiest Guy, Vina Sans, Special Elite, Rubik Mono One, Comfortaa, Oswald, Montserrat, Poppins) on every page including the marketing landing. They are intended for caption styles burned into rendered video — the landing does not use them. Bloats the public-facing surface and can paint with the wrong font momentarily on slow networks.
- **Evidence:** `index.html:126` (single Google Fonts URL with all 13 families).
- **Fix:** Move the caption fonts behind a route-level lazy load — only request them when the user enters the editor or caption-style picker. Keep Inter, Instrument Serif, JetBrains Mono in the document head. Use `<link rel="stylesheet" disabled>` toggled by JS on route change, or import them via a CSS module that the editor route lazy-loads.
- **Effort:** M

---

## Category 3 — Cross-surface coherence

### Major-19. Apple status-bar style is "default" — landing chrome is forced dark
- **Severity:** Major (cross-surface coherence)
- **Issue:** Landing forces dark mode (`useForceDarkMode()` per `Landing.tsx:31`), but the iOS PWA status bar is set to `default` (light, with black text on white). When a user adds-to-home-screen, the launch state shows a white iOS status bar above the dark landing — a hard visual break.
- **Evidence:**
  - `index.html:55`: `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
  - `src/pages/Landing.tsx:31`: `useForceDarkMode();`
- **Fix:** Set `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`. Also confirm the `theme_color` resolution from Major-9 — they need to agree. **Where:** `index.html:55`. **How:** one-line meta change (note: be aware `apple-mobile-web-app-capable` was deliberately removed per the existing comment on lines 53-54 due to an audio-session issue; this change is independent of that).
- **Effort:** XS

### Polish-20. Spacing / radius tokens declared twice — global vs shell — but with the same numbers
- **Severity:** Polish
- **Issue:** Global `--radius: 0.75rem` (12px) plus Tailwind `xl: calc(--radius + 4px)` (16px). Shell tokens hard-code `--radius: 12px; --radius-lg: 16px;`. Same numbers, but a future change to global `--radius` will not propagate to shells; a future shell change won't touch the rest of the app. Latent drift trap.
- **Evidence:** `src/index.css:79`, `tailwind.config.ts:103-109`, `src/styles/admin-tokens.css:46-47`, `billing-tokens.css:33-34`, `autopost-tokens.css:37-38`, `settings-tokens.css:37-38`, `support-tokens.css:36-37`.
- **Fix:** In each shell-token file, change `--radius: 12px;` to `--radius: 0.75rem;` and `--radius-lg: 16px;` to `--radius-lg: calc(0.75rem + 4px);` so they derive from the same source. Or migrate shells to consume the global `--radius` directly via `var(--radius, 0.75rem)`. **Where:** five shell-token files. **How:** five-line edit total.
- **Effort:** XS

---

## Production Blockers

| #  | Severity | Issue                                                                                                                              | Owner   |
|----|----------|------------------------------------------------------------------------------------------------------------------------------------|---------|
| C1 | Critical | Voice Lab gradients ship red/green/orange (`voiceCatalog.ts:222-238`)                                                              | Vega    |
| C2 | Critical | Email CTA gradient + body radial use template orange `#F5B049` (`emailTemplate.ts:55,80`)                                          | Forge   |
| C3 | Critical | v2 announcement modal ships template orange + green pulse (`v2-announcement.css:11,162-178,267-302`)                               | Vega    |
| C4 | Critical | Admin shell ships green `#5CD68D` and purple `#a78bfa` as legitimate tokens, used across all admin tabs                            | Vega    |
| C5 | Critical | Marketing `--destructive` token is red while in-app is gold — cross-surface drift (`marketing/.../global.css:36-37,77-78`)         | Signal  |
| C6 | Critical | Two different aquas in product (`#11C4D0` global vs `#14C8CC` shells) — global token off brand                                     | Pixel + Vega |

A `PASS` verdict is not achievable until every Blocker is resolved AND re-verified by Canon. Findings ranked Major or below do not block a `PASS WITH FIXES` but must be closed before next release.

---

## Top 10 Priority Fixes

| Rank | Finding                                                                  | Severity  | File:line                                                                     | Effort |
|------|--------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------|--------|
| 1    | Replace voice-lab flag gradients with brand-only palette                 | Critical  | `src/lib/voiceCatalog.ts:220-240`                                             | S      |
| 2    | Swap template orange in transactional emails for brand gold              | Critical  | `supabase/functions/_shared/emailTemplate.ts:55,80`                           | XS     |
| 3    | Strip orange + green from v2 announcement modal                          | Critical  | `src/components/announcements/v2-announcement.css:11,162-178,267-302`         | XS     |
| 4    | Re-map admin `--good`, `--purple`, and pulse keyframe to brand palette   | Critical  | `src/styles/admin-tokens.css:40-64` + `admin-shell.css` + 8 admin TabXxx.tsx  | M      |
| 5    | Migrate marketing `--destructive` from red to gold (match in-app)        | Critical  | `marketing/src/styles/global.css:36-37,77-78`                                 | XS     |
| 6    | Unify aqua: shift global `--brand-aqua` HSL to `#14C8CC`                 | Critical  | `src/index.css:26-28,44,77,...`; `marketing/src/styles/global.css:11-13,...` | S      |
| 7    | Re-map global `--warning` from amber `#F5A623` to brand gold             | Major     | `src/index.css:64,143`; `marketing/src/styles/global.css:34,75-76`            | XS     |
| 8    | Remove Tailwind `amber-*` / `orange-*` / `red-*` / `green-*` from chrome | Major     | LandingPricing, LowCreditWarning, Auth, Subscription/Renewal, password-strength | M    |
| 9    | Fix PWA `theme_color` and Safari mask-icon to brand aqua/dark            | Major     | `public/manifest.json:8`; `index.html:26`                                     | XS     |
| 10   | Decide one serif (Fraunces vs Instrument Serif) and load it everywhere   | Major     | `index.html:126-128` + 5 shell-token files                                    | S      |

---

## Out of Scope for Canon (referrals)
- Screen-reader contrast and WCAG conformance of the orange/red Tailwind utilities → **Halo**
- SEO consequences of `storytelling` keyword bloat → **Signal**
- 11-language hreflang gap (`index.html` only declares `en` and `x-default`) → **Trace** / **Signal**
- Bundle-weight cost of 13 decorative caption fonts on landing → **Trace**
- Feature-flag/config consequences of v2 announcement modal showing across 100% of authed users on first hit → **Optic**

## Statement of Verification
Every finding above is reproducible from a static read of the files at the cited file:line locations. Where claims involve color computation (HSL → hex), the math is documented inline. No live URL was inspected — claims about visual-render output are inferred from the code; if a runtime override exists (e.g., a feature flag or theme provider that re-skins the relevant surface), Vega should flag it during remediation. Canon will re-verify each Critical/Blocker after fixes land.
