# Canvas — Specialist Audit (Design System Cross-Cuts)

**Project:** motionmax-360
**Date:** 2026-05-10
**Domain:** §1 — UI/UX & design system. Specifically: token completeness (spacing, type, color, radius, motion, elevation), component pattern reuse, system-feedback consistency (toast/loading/empty/error/success), mobile-first vs desktop-first.
**Audience:** tool-savvy creative adults, mobile-heavy usage.
**Severity rubric:** Blocker / Critical / Major / Minor / Polish.

> Auditor flags only — does not edit. All findings carry file:line evidence.

---

## §1.1 — Color tokens

### F-001 — Brand aqua drifts between root tokens and shell tokens (Critical)
**Issue:** `:root` defines `--brand-aqua: 184 85% 44%` which renders as **#11C4D0** (`src/index.css:27`). Every scoped shell token file hard-codes the brand aqua as **#14C8CC** (`src/styles/admin-tokens.css:17`, `src/styles/autopost-tokens.css:18`, `src/styles/billing-tokens.css:14`). The brand spec (PRD/persona/Memory) is `#14C8CC`. Result: anything rendered through Tailwind `bg-primary`/`text-brand-aqua` is the wrong brand color and visibly mis-matches the admin/billing/autopost surfaces that sit next to it. Two truths in the same product.
**Fix:** in `src/index.css:27` change `--brand-aqua: 184 85% 44%` to `184 84% 44%` (true #14C8CC = `184.5 81.6% 43.9%`); and at `:root` line 44 update `--primary` to match. Recompute `--brand-aqua-dark`, `--brand-aqua-light`, `--ring`, `--success`, `--sidebar-primary`, `--chart-1`, `--chart-3`, `--chart-5` against the corrected hue. Effort: S.

### F-002 — `--warning` token renders ORANGE — direct brand-rule violation (Critical)
**Issue:** `--warning: 38 92% 50%` (`src/index.css:63`) and `--warning: 38 92% 55%` (`src/index.css:142`) compute to **#f5b049 / #f7bb5f** — pure amber/orange. Brand contract is "aqua + gold ONLY. No red. No green. No orange." `bg-warning`/`text-warning` is exposed via `tailwind.config.ts:58-61` and is therefore reachable from any component. Anywhere this warning class lands (toast warnings, banner alerts, validation chrome) the page leaves brand.
**Fix:** in `src/index.css:63,142` change `--warning` to the brand gold mapping (`45 67% 55%` light / `45 67% 68%` dark) so warning = gold like destructive already does. Then grep `text-warning|bg-warning|border-warning` and verify the swap reads correctly. Effort: S.

### F-003 — Five parallel token universes — cyan/gold drift across shells (Critical)
**Issue:** The product runs **two design-token systems in parallel**: (a) the HSL `--brand-*` / shadcn semantic tokens in `src/index.css` consumed via Tailwind, and (b) raw-hex `--cyan / --gold / --bg / --panel / --ink / --line` redefined inside `.admin-shell` (`admin-tokens.css:15`), `.billing-shell` (`billing-tokens.css:13`), `.autopost-shell` (`autopost-tokens.css:17`), `.settings-shell` and `.support-shell`. Every shell file re-declares the same six colors, the same radius pair, the same three type stacks. A single brand change requires editing 6+ files; one already missed (`admin-tokens.css` lacks `--gold-dim` while the other shells have it). This is the structural cause of F-001.
**Fix:** promote a single `:root` block of canonical hex tokens (`--mm-cyan`, `--mm-cyan-2`, `--mm-gold`, `--mm-gold-deep`, `--mm-bg`, `--mm-panel`, `--mm-ink`, `--mm-line`) in `src/index.css`, then make each shell file alias `--cyan: var(--mm-cyan)` etc. — preserves the scoping but eliminates drift. Effort: M.

### F-004 — Admin destructive token aliased away from brand gold variable (Major)
**Issue:** `admin-tokens.css:42` sets `--danger: #E4C875;` as a literal hex. Line 38 sets `--warn: #E4C875;`. Two tokens collapsed to the same literal. If brand gold ever shifts (it has — see commit history), these literals must be hand-updated and the two will drift apart. Also: there's no path from a Tailwind utility into `--danger` so admin-shell components are forced to use raw CSS, breaking the shadcn pattern.
**Fix:** in `admin-tokens.css:38,42` change to `--warn: var(--gold); --danger: var(--gold);` after F-003 introduces a canonical `--gold`. Effort: XS.

### F-005 — Persistent destructive=gold mapping has no a11y guard (Major)
**Issue:** `--destructive` is mapped to gold (`src/index.css:68`) — semantically deliberate per the brand-only-aqua-gold rule, but **gold #E4C875 on white background contrasts ~1.6:1**, far below WCAG AA 4.5:1 for normal text and 3:1 for UI components. Any `text-destructive` lands on white surfaces (form errors under inputs, toast titles in light mode). Audience is mobile-heavy where ambient glare amplifies this.
**Fix:** introduce a paired `--destructive-strong` token that uses brand `--brand-gold-dark` (`45 67% 35%`, ≈ #7d6224) for **text** uses and reserve the lighter gold for chips/borders/backgrounds only. Update `.text-destructive` Tailwind alias to point at the strong variant; keep `bg-destructive` on the lighter gold. Effort: S.

---

## §1.2 — Spacing scale

### F-006 — No codified spacing scale; inline pixel padding the convention (Major)
**Issue:** `tailwind.config.ts:16-149` extends colors, radius, fontFamily, zIndex, keyframes, animation — but **does not extend `spacing` or `padding`**. There is no project spacing scale. Evidence that this is causing concrete drift: `autopost-tokens.css:49` openly admits "the JSX uses an inline 28px 32px 80px style, so we don't have to touch byte-identical wiring" — i.e. the scoped CSS exists *to compensate for inline pixel padding sprinkled in the JSX*. The same magic numbers (`28px 32px 80px` desktop, `20px 18px 60px` tablet, `16px 14px 50px` mobile) recur in `billing-tokens.css:46-50` and `autopost-tokens.css:51-55`.
**Fix:** in `tailwind.config.ts` add a `spacing` extension with project tokens (`page-x-d: '32px'`, `page-x-t: '18px'`, `page-x-m: '14px'`, `page-y-top: '28px'`, `page-y-bot: '80px'`) and replace the inline JSX `style={{padding: ...}}` with `className="px-page-x-d py-page-y-top ..."` patterns. Effort: M.

### F-007 — Page-wrap padding overrides target inline-style attribute selector (Critical maintainability)
**Issue:** `autopost-tokens.css:52` and `:55` use the selector `.autopost-shell > div[style*="padding"]` to override JSX-inline padding via attribute substring matching. This silently breaks the moment any wrapper changes its inline style string (refactor, codemod, prettier change), it depends on attribute selectors that bypass cascade clarity, and it has `!important` to win. Same anti-pattern not present in `billing-tokens.css` — billing got it right with a `.bill-wrap` class. So the divergence is internal.
**Fix:** in the autopost JSX wrappers (search `padding: '28px 32px 80px'` under `src/components/autopost/`) replace the inline `style={{padding: ...}}` with `className="ap-wrap"` and define `.ap-wrap` in `autopost-tokens.css` mirroring `.bill-wrap` (`billing-tokens.css:44-50`). Then delete the attribute-selector overrides at `autopost-tokens.css:52,55`. Effort: S.

---

## §1.3 — Type scale

### F-008 — Type scale lives in CSS components but most surfaces ignore it (Major)
**Issue:** `src/index.css:355-405` defines a clean `.type-display / .type-h1 / .type-h2 / .type-h3 / .type-h4 / .type-body-lg / .type-body / .type-body-sm / .type-caption / .type-label` system. But scoped shells bypass it entirely: `billing-tokens.css:54` sets `font-size: clamp(28px, 4vw, 38px)` directly on `h1`, `:81` sets `font-size: 18px` on `.card h3`, `:163` sets `font-size: 30px` on `.kpi .v`, etc. Same in `autopost-tokens.css` and the admin shell. Result: hero headings on /billing, /admin, /autopost are NOT the codified `.type-display` size and won't move when the type scale updates.
**Fix:** map shell typography classes to the codified scale: `billing-tokens.css:54` becomes `@apply type-display` (or extract a `.type-hero` token in `index.css` and use it in both). Audit every `font-size: <px>` declaration in the five `*-tokens.css` files and either reuse a `.type-*` class or document the deviation. Effort: M.

### F-009 — Three font stacks declared per shell — `--serif` differs across files (Minor)
**Issue:** `billing-tokens.css:36` and `admin-tokens.css:49` set `--serif: 'Instrument Serif'`. `autopost-tokens.css:40` sets `--serif: 'Fraunces', 'Instrument Serif'`. Same product, different fallback chains, different render at runtime. No single source of truth for the serif.
**Fix:** decide on one serif (Fraunces is already loaded in autopost) and make all five shell files reference `var(--mm-serif)` defined once at `:root`. Effort: XS.

### F-010 — Type system has no responsive overrides for 320 px viewport (Minor)
**Issue:** `.type-display` (`src/index.css:357-359`) uses `text-3xl sm:text-4xl md:text-5xl` — at 320 px (the smallest breakpoint the brief requires) this is `text-3xl` = 30 px. `clamp` is not used. `.type-h1` collapses to `text-2xl` (24 px) at 320 px. These are fine, but the autopost/billing scoped CSS uses `clamp(28px, 4vw, 38px)` (`billing-tokens.css:54`) which produces 28 px even at 320 px. Inconsistent strategies (Tailwind breakpoints vs `clamp`).
**Fix:** standardize on `clamp(min, vw, max)` for all hero headings and codify it inside the `.type-*` classes. Effort: S.

---

## §1.4 — Radius scale

### F-011 — Two radius scales co-exist (Minor)
**Issue:** Root scale is `--radius: 0.75rem` (= 12 px) with derived `lg / md / sm / xl / 2xl` in `tailwind.config.ts:103-109`. Shell scale is `--radius: 12px; --radius-lg: 16px;` (literal pixels) in every shell file (`admin-tokens.css:45`, `billing-tokens.css:33`, `autopost-tokens.css:37`). Same numerical `--radius`, but `--radius-lg` in shells (16 px) does not equal Tailwind's `rounded-xl` (calc(0.75rem + 4px) = 16 px) — they happen to align today, but no contract enforces that.
**Fix:** make shell tokens reference the root scale: `--radius-lg: calc(var(--radius) + 4px);`. Effort: XS.

---

## §1.5 — Motion scale

### F-012 — No motion duration / easing token system (Major)
**Issue:** `tailwind.config.ts:139-147` extends `animation` names but does not extend `transitionDuration` or `transitionTimingFunction`. As a result every component hardcodes its own duration: `.12s` (`autopost-tokens.css:225`, `billing-tokens.css:148,201`), `.15s` (`autopost-tokens.css:155,225,266,330`), `.2s` (`autopost-tokens.css:209,210`), `.3s` (`src/index.css:142` via `fade-in`), `.4s` (`billing-tokens.css:172`). Five different "fast" timings, six "medium" timings. No theme of motion.
**Fix:** in `tailwind.config.ts` add `transitionDuration: { fast: '120ms', base: '180ms', slow: '300ms' }` and `transitionTimingFunction: { 'emph-out': 'cubic-bezier(0.16, 1, 0.3, 1)' }`. Replace literal durations in shell CSS via search-and-replace. Effort: M.

### F-013 — Same conceptual animation defined four times with different keyframes (Critical)
**Issue:** A "pulsing dot" / "heartbeat" motion appears as:
  - `pulse` in `tailwind.config.ts:134-137` — `0%, 100% { opacity: 1 } 50% { opacity: 0.5 }` — 2s
  - `adm-pulse` in `admin-tokens.css:55-58` — same as above — 2s
  - `ap-hb` in `autopost-tokens.css:129` — `0%, 100% { opacity: 1 } 50% { opacity: .4 }` — 2s (different opacity floor)
  - `bill-pulse` in `billing-tokens.css:125` — `50% { opacity: .4 }` — 1.6s (different duration AND opacity)
Same intent, four implementations, three different visual results. Brand consistency suffers — the live-status heartbeat looks subtly different on /admin vs /billing vs /autopost.
**Fix:** keep ONE `pulse` keyframe in `tailwind.config.ts:134-137`, delete the three shell duplicates (`admin-tokens.css:55-58`, `autopost-tokens.css:129`, `billing-tokens.css:125`), and have shell selectors use `animation: pulse 1.6s ease-in-out infinite` referencing the canonical name. Effort: S.

### F-014 — `shimmer` keyframe defined twice with conflicting transforms (Critical)
**Issue:** `tailwind.config.ts:131-133` defines `shimmer` as `100% { transform: translateX(100%) }` (single 0→100% sweep) and assigns `animation: shimmer 2s infinite`. `src/index.css:281-288` redefines `@keyframes shimmer` as `0% { translateX(-100%) } 100% { translateX(200%) }` — a -100% → +200% sweep. Whichever loads later wins; cascade is fragile. Loading-state shimmer therefore has nondeterministic sweep distance depending on bundle order.
**Fix:** delete the keyframe block in `tailwind.config.ts:131-133` (the index.css version is the correct one — covers off-screen-to-off-screen) and keep the `animation: shimmer 2s linear infinite` mapping in the config. Effort: XS.

### F-015 — Custom `autopost-spin` exists because `animate-spin` "looked frozen" (Major)
**Issue:** `src/index.css:294-309` defines a parallel `.autopost-spin` class with comment: "Tailwind's animate-spin is theoretically available, but we hit at least one user-visible case where it looked frozen (likely a browser extension blocking utility-class keyframes or a stale CSS bundle)." The fix-by-workaround is permanent. If the root cause is bundle staleness, the same problem will hit any other tailwind keyframe (incl. F-014's `shimmer`). If a browser extension is the cause, the symptom will recur on the next utility-keyframe added. The diagnosis was never completed.
**Fix:** spike root cause: load /autopost in a clean browser profile + DevTools coverage panel and verify whether `animate-spin` keyframe is in the served CSS. If yes, delete `.autopost-spin` and revert call sites. If no (bundler tree-shake bug), pin the fix in PostCSS config. Effort: S to investigate, XS to remediate either way.

---

## §1.6 — Elevation / shadow tokens

### F-016 — No shadow scale; one-off `box-shadow` literals everywhere (Major)
**Issue:** `tailwind.config.ts` does not extend `boxShadow`. Shadows are hand-crafted per surface: `0 30px 60px -30px rgba(20,200,204,.4)` (`billing-tokens.css:210`), `0 12px 30px -10px rgba(20,200,204,.3)` (`billing-tokens.css:277`), `0 20px 60px -20px rgba(0,0,0,.7)` (`billing-tokens.css:248`), `0 30px 80px -20px rgba(0,0,0,.6)` (`billing-tokens.css:359`), `0 4px 10px rgba(0,0,0,.35)` (`billing-tokens.css:298`), `0 0 8px var(--cyan)` (`autopost-tokens.css:152,124`), `0 0 12px rgba(20,200,204,.6)` (`autopost-tokens.css:159`). No coherent elevation system. Surfaces of "the same depth" don't share a shadow.
**Fix:** in `tailwind.config.ts` add `boxShadow: { e1: '0 1px 2px rgba(0,0,0,0.06)', e2: '0 4px 10px rgba(0,0,0,0.1)', e3: '0 12px 30px -10px rgba(0,0,0,0.35)', e4: '0 30px 60px -30px rgba(0,0,0,0.5)', glow-aqua: '0 0 20px rgba(20,200,204,0.35)', glow-gold: '0 0 20px rgba(228,200,117,0.35)' }`. Replace ad-hoc shadows. Effort: M.

---

## §1.7 — System feedback (toast / loading / empty / error / success)

### F-017 — Toast wrapper bypassed by 88 of 89 call sites (Minor)
**Issue:** Verified: there is NO shadcn `toast.tsx` and NO `@/hooks/use-toast` — sonner is the only toast system, good. But of 89 files importing toast machinery, only `App.tsx` imports `Toaster` from `@/components/ui/sonner`; the other 88 import `{ toast }` directly from `"sonner"`, bypassing the wrapper. This works at runtime (sonner's `toast` is a global singleton, so `<Toaster>` options still apply), so it's not a UX defect today. But it means future edits to the wrapper (e.g. adding `richColors` or a custom render) silently apply only via the singleton — the wrapper exists but is structurally dead code as a *type boundary*, weakening the abstraction.
**Fix:** add an ESLint `no-restricted-imports` rule banning `"sonner"` outside `@/components/ui/sonner.tsx`, then re-export `toast` from the wrapper. Effort: XS.

### F-018 — Loading state has at least three implementations (Major)
**Issue:** `src/components/ui/loading-spinner.tsx`, `src/components/ui/admin-loading-state.tsx`, `src/components/ui/skeleton.tsx`, plus the bespoke `.autopost-spin` from F-015, plus shimmer from F-014. No documented contract for which to use when. Result: `/admin`, `/autopost`, `/billing`, dashboard each present a "loading…" state that looks different.
**Fix:** define three canonical loading states — `<Spinner size="sm|md|lg">` (sub-second indeterminate, all surfaces), `<Skeleton>` (above-the-fold structural placeholder), `<ProgressBar value=…>` (deterministic generation/upload). Document in `src/components/ui/_README.md`. Delete `admin-loading-state.tsx` and `.autopost-spin` once call sites are migrated. Effort: M.

### F-019 — Empty state component exists but isn't enforced (Minor)
**Issue:** `src/components/ui/empty-state.tsx` is in the ui kit but a quick scan of the scoped shells (admin/billing/autopost) shows hand-built "no data yet" rows (`autopost-tokens.css` styles bespoke `.runs-card` empty rows; the autopost design has `.hs-cell.soon` for "no real data" — `autopost-tokens.css:118-128`). Eight different "empty" looks across the app; the shadcn `EmptyState` is unused on those surfaces.
**Fix:** retrofit `<EmptyState>` into each "no data" surface (autopost runs, billing invoices, admin tables) with the pattern `icon + title + sub + optional CTA`. Effort: M.

### F-020 — Status pills duplicated per shell with different shape (Minor)
**Issue:** `.run-pill` (`autopost-tokens.css:389-404`), `.status-pill` (`autopost-tokens.css:243-254`), `.tbl .pill` (`billing-tokens.css:328-330`), `Badge` (shadcn `src/components/ui/badge.tsx`). Four different pill styles: one with an `::before` dot, one without, padding `4px 9px 4px 8px` vs `5px 9px 5px 8px` vs `3px 8px`. A user perceives "live status" through four different pill shapes inside one product.
**Fix:** introduce a single `<StatusPill variant="active|paused|idle|completed|failed|publishing">` component based on `Badge`, with a `dot` boolean prop for the heartbeat. Migrate the autopost/billing surfaces. Effort: M.

### F-021 — Success uses aqua, dot-pulse uses cyan, "completed" pill uses cyan, "active" pill uses cyan, "publishing" pill uses cyan (Minor)
**Issue:** Brand discipline — aqua signals everything positive AND everything in-progress. Without a secondary cue (icon, label cadence) users can't tell at a glance whether the pulsing aqua dot is "alive" vs "running right now" vs "completed successfully." This is the cost of an aqua/gold-only palette and needs explicit affordances to compensate.
**Fix:** distinguish in motion (heartbeat = "live"; static dot = "idle/done"; sweep = "running") and in iconography (check = success, gear-spin = running, dot = live). Codify as a `<StatusIndicator>` primitive with three motions. Effort: S.

---

## §1.8 — Mobile-first vs desktop-first

### F-022 — Entire scoped CSS layer is desktop-first; brief calls for mobile-heavy audience (Critical)
**Issue:** Every media query in the shells is `@media (max-width: …)` — desktop-first. Examples: `billing-tokens.css:49,90,118,131,159,160,197,269,270,312`, `autopost-tokens.css:51,80,83,105,202,220,315,321,348,349,359,366,418`. The codebase ships base styles for desktop, then progressively *removes/shrinks* for narrow viewports. Brief specifies "mobile-heavy usage" and lists 320/375/390/414/428 px as primary breakpoints. Mobile-first is the correct strategy: ship base styles for 320–428 px, then enhance up. Audience-relative this is significant — content creators on phones get the heaviest CSS bytes evaluated for them.
**Fix:** flip the convention going forward. Document at the top of each `*-tokens.css` that new selectors use `min-width:`. Existing rules can be flipped opportunistically as tokens migrate. The `index.css` `.type-*` classes (`src/index.css:357-394`) already use `sm: md:` Tailwind prefixes (mobile-first) — make this the universal pattern. Effort: L (incremental migration), M for the writing-down rule.

### F-023 — Mobile padding overrides only happen on a few wrappers; everything else stays desktop-padded (Major)
**Issue:** `billing-tokens.css:49,50` overrides `.bill-wrap` padding for `(max-width: 720px)` and `(max-width: 480px)`. But the cards inside `.bill-wrap` (`.card` at `:80` = `padding: 24px`, `.kpi` at `:161` = `padding: 18px`) have no mobile shrink rules. Net result: at 320 px the page padding shrinks to 14 px (good), but each card still has 24 px of internal padding, leaving ~268 px of usable content width. KPI value `font-size: 30px` (`:163`) on 268 px of width risks overflow with $ amounts >5 digits.
**Fix:** add `@media (max-width: 480px) { .billing-shell .card { padding: 16px; } .billing-shell .kpi { padding: 14px; } .billing-shell .kpi .v { font-size: 24px; } }` near `:160`. Effort: S.

### F-024 — `prefers-reduced-motion` correctly handled; no finding (Polish — kudos)
**Issue:** `src/index.css:325-353` correctly disables animations including SMIL inside SVGs and the filmic-grain overlay for users with reduced-motion preference. Properly scoped, no `display: none` for content. This is the kind of thing that usually gets missed; it didn't.
**Fix:** none.

---

## §1.9 — Component pattern reuse

### F-025 — Two button systems live side by side (Critical)
**Issue:** shadcn `<Button>` (`src/components/ui/button.tsx`) is the canonical primitive. Every shell file ships a parallel button system: `.btn-cyan` and `.btn-ghost` in `billing-tokens.css:148-155`, `autopost-tokens.css:177-184`. Different padding (`9px 14px` vs the shadcn `h-10 px-4 py-2`), different border-radius (`8px` literal vs `rounded-md` = `calc(var(--radius) - 2px)` = 10 px), different hover (`translateY(-1px)` vs background-tint). A user pressing the same intent ("upgrade plan", "run now") gets a different physical experience depending on which lab they're in.
**Fix:** delete `.btn-cyan` and `.btn-ghost` from each shell file; add a `<Button variant="brand-cyan">` and `<Button variant="brand-ghost">` to `button.tsx` `cva` map; sweep the JSX in `src/components/billing/*.tsx` and `src/components/autopost/*.tsx` to use the component. Effort: M.

### F-026 — Toggle/switch defined three times (Major)
**Issue:** shadcn `<Switch>` exists at `src/components/ui/switch.tsx`. Billing ships `.tg` (`billing-tokens.css:182-185`), autopost ships `.ks-tg` (`autopost-tokens.css:209-214`). All three render the same primitive — a pill background with a moving inner thumb. Three implementations means three accessibility audits, three keyboard-handlers, three focus rings.
**Fix:** delete `.tg` and `.ks-tg`; replace all `<button class="tg">` with `<Switch>`. Effort: M.

### F-027 — Tab system reimplemented in each shell (Major)
**Issue:** shadcn `<Tabs>` at `src/components/ui/tabs.tsx`. Billing ships `.bill-tabs` (`billing-tokens.css:62-77`). Autopost ships `.ap-tabs` (`autopost-tokens.css:329-341`). They are nearly identical — same border-bottom, same active-state cyan underline. The only meaningful difference is the icon-only mobile collapse, which is a Tailwind utility you could add to the shadcn primitive.
**Fix:** add a `density="compact"` and `mobileLabels="hide"` variant to `Tabs`; migrate billing/autopost. Effort: M.

### F-028 — `box-shadow` brand glow defined inline rather than via token (Polish)
**Issue:** "live cyan dot" glow appears as `box-shadow: 0 0 8px var(--cyan)` (`autopost-tokens.css:91,124`), `box-shadow: 0 0 6px var(--cyan)` (`autopost-tokens.css:250`, `billing-tokens.css:59`), `box-shadow: 0 0 12px rgba(20,200,204,.6)` (`autopost-tokens.css:159`). Three glow strengths.
**Fix:** add `--glow-aqua-sm: 0 0 6px var(--cyan); --glow-aqua-md: 0 0 8px var(--cyan); --glow-aqua-lg: 0 0 12px rgba(20,200,204,.6);` once and reference. Effort: XS.

---

## §1.10 — Hidden brand violations from imported templates

### F-029 — `gold-deep` literal `#C9A75A` is the deep gold companion but never centralized (Minor)
**Issue:** `--gold-deep: #C9A75A` appears in `billing-tokens.css:18`, `autopost-tokens.css:23`, `admin-tokens.css:41` independently. Brand has not been formally documented to include `#C9A75A` (Memory only specifies `--brand-gold #E4C875` and aqua `#14C8CC`). This is template residue from the static HTMLs that snuck in as a "good companion" without spec sign-off.
**Fix:** confirm with Pixel (brand) whether `#C9A75A` is ratified, then centralize as `--brand-gold-deep` in `src/index.css:30` (currently named `--brand-gold-dark` but defined as HSL `45 67% 50%` ≈ `#d2a625`, which does NOT match `#C9A75A`). Two "deep gold" tokens that don't agree. Effort: XS once Pixel ratifies.

### F-030 — Admin shell still has `--good: #5CD68D` (green) and `--purple: #a78bfa` and 13 files reference them (Critical — direct brand-rule violation)
**Issue:** `admin-tokens.css:40` declares `--good: #5CD68D;` (green) and `:41` declares `--purple: #a78bfa;`. Brand contract is "aqua + gold ONLY. **No red. No green.**" This is a documented violation living in source today. Worse: `admin-tokens.css:61-64` uses `rgba(92, 214, 141, ...)` (the same green) inside the `adm-tab-pulse` keyframe box-shadow — so admin tabs literally pulse green when active. Verified consumers (greppable today): `src/styles/admin-shell.css`, `src/styles/admin-tokens.css`, `src/components/announcements/v2-announcement.css`, plus 9 admin tab components — `TabUsers.tsx`, `TabGenerations.tsx`, `TabConsole.tsx`, `TabNewsletter.tsx`, `TabPerformance.tsx`, `TabErrors.tsx`, `TabAnalytics.tsx`, `TabApiKeys.tsx`, `TabApi.tsx`, `TabOverview.tsx`. 13 files painting admin chrome green right now.
**Fix:** in `admin-tokens.css:40,41` delete `--good` and `--purple`. In `admin-tokens.css:61-63` change `adm-tab-pulse` to use `var(--cyan)` rgba values (`rgba(20, 200, 204, …)`). Then sweep the 13 files (grep `var(--good)`, `var(--purple)`, `5CD68D`, `a78bfa`) and map each call site: success/done states → `var(--cyan)`; warning/destructive → `var(--gold)`; informational → `var(--ink-dim)`. Effort: M.

---

## Summary table — by severity

| Severity | Count | Findings |
|----------|-------|----------|
| Blocker  | 0     | — |
| Critical | 9     | F-001, F-002, F-003, F-007, F-013, F-014, F-022, F-025, F-030 |
| Major    | 11    | F-004, F-005, F-006, F-008, F-012, F-015, F-016, F-018, F-023, F-026, F-027 |
| Minor    | 8     | F-009, F-010, F-011, F-017, F-019, F-020, F-021, F-029 |
| Polish   | 2     | F-024 (kudos), F-028 |

## Top 5 design-system fixes (in order of leverage)

1. **F-003** — collapse the five parallel token universes to one root + aliases. Solves F-001, partially solves F-009, F-011, F-013, F-016, F-029 in one pass.
2. **F-002 + F-030** — eliminate orange `--warning` and green `--good` / purple `--purple`. Brand-rule blockers that creators noticed in 5 minutes will notice too.
3. **F-022** — flip the media-query convention to mobile-first; matches the audience.
4. **F-025 + F-026 + F-027** — kill the parallel button/toggle/tab systems. One source of truth per primitive.
5. **F-006 + F-012 + F-016** — codify spacing, motion, elevation tokens. Without these, every new screen drifts again.

## Things explicitly out of scope for Canvas

- Color-contrast measurements as full WCAG audit — Halo owns. Canvas only flagged F-005 because the brand-gold-on-white contrast is a design-system *token-level* defect, not a per-screen a11y miss.
- Specific screen flows, conversion paths, microcopy — Compass / Optic / Proof.
- Brand voice and asset audit — Pixel.

---
**End of Canvas specialist report.**
