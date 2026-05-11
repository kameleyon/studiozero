# Canon — Visual Consistency Audit
**Project:** motionmax
**Audit date:** 2026-05-10
**Reviewer:** Canon (Visual Consistency Auditor)
**Surface in scope:** Full product — React app (`src/`), Astro marketing (`marketing/`), shared transactional email layout (`supabase/functions/_shared/emailTemplate.ts`), PWA manifest, Open Graph + favicon assets.
**Audience-relative target (per brief):** Tool-savvy creative adults — content creators, marketers, video producers. Brand expectation: aqua + gold, premium, restrained. **Hard rule from BigBrain:** no red, no green, no orange in autopost / lab UI.

---

## Verdict (reviewer-local — Jury synthesizes the global one)
`FAIL` — pre-launch ship is blocked by the brand-asset bundle (Blocker C-1) and by orange/green leakage on customer-facing in-app + email surfaces (Critical C-2 through C-4). The token system Pixel + Canvas defined is sound and in many places well-honored (`.autopost-shell`, `.admin-shell` are scoped properly; lucide-react is the single icon library across 130+ files). The drift is concentrated in three places: (a) the v2 announcement modal, (b) the shared email template, (c) shared brand assets. Those three are the gating issues. Everything else is below-the-line polish/major.

---

## Scorecard (1–5, audience-relative)

| Dimension | Score | Notes |
|---|---|---|
| Color-token adherence | **2** | Two competing brand-aqua hexes (`#11C4D0` 91 occ vs `#14C8CC` 437 occ); banned orange `#F5B049` in shipped customer-facing modal + email; pure red in marketing `--destructive`; amber `--warning` token contradicts brand rule. |
| Typography conformance | **3** | Single sans (Inter) is consistent. Serif drifts: spec says Fraunces, app loads only Instrument Serif — the autopost-tokens declare Fraunces but it is never actually loaded, so every "serif" headline silently falls through to Instrument Serif. Email layout uses `Georgia/'Playfair Display'` — third serif family entirely. |
| Iconography conformance | **5** | Single library (`lucide-react`) used across 130+ files. No mixed sets. |
| Spacing / radius / elevation | **2** | Tokens exist (`--radius: 12px`, `--radius-lg: 16px`) but bypassed pervasively in `admin-shell.css` with arbitrary `border-radius: 2/3/5/6/7/8/10/12/14/999px`. No formal elevation scale. |
| Imagery / brand-asset hygiene | **1** | Favicon, apple-touch-icon, og-image, and the brand logo are **byte-identical 2000×2000 PNGs**. No bespoke OG card. PWA manifest declares dimensions that do not match the file. |
| Motion-token conformance | **3** | Tailwind animations defined consistently (0.2s/0.3s ease-out). CSS uses ad-hoc `.12s/.15s/.2s/.25s` per-component. `prefers-reduced-motion` is honored globally — that is a strong positive. |
| Cross-surface coherence | **2** | App, marketing, email, PWA chrome, and Safari pinned-tab each declare a different theme/destructive color. Three theme-color values across surfaces (`#0F1112`, `#2D9A8C`, brand `#14C8CC`); two `--destructive` mappings (gold in app, red in marketing); `#F5B049` orange in transactional email. |

---

## Findings

> **Severity rubric (per `agents/audit/jury.md`):**
> Blocker — ships nothing until fixed; Critical — fix before launch; Major — fix before next release; Minor — fix when convenient; Polish — optional.

---

### BLOCKER

#### C-1 — Brand asset bundle is one PNG repeated four times
**Evidence (md5 + IHDR pixel-dimension probe):**
- `public/apple-touch-icon.png` — md5 `9da9fe1b44567c54529d3998c6fe5309`, **2000×2000** (`xxd -s 16 -l 8` → `000007d0000007d0`)
- `public/favicon.png` — md5 `9da9fe1b44567c54529d3998c6fe5309`, **2000×2000**
- `public/og-image.png` — md5 `9da9fe1b44567c54529d3998c6fe5309`, **2000×2000**
- `public/momaxlogo.png` — md5 `9da9fe1b44567c54529d3998c6fe5309`, **2000×2000**
- All four are 752,294 bytes; identical bytes confirmed by md5.
- Declared dimensions in `public/manifest.json:14-31` claim `192x192` (favicon), `180x180` (apple-touch-icon), `1200x630` (og-image) — none of these match the actual 2000×2000 square PNG that ships under each name.
- `index.html:36-39` declares `<meta property="og:image:width" content="1200"> <meta property="og:image:height" content="630">` — the file shipped at that URL is a 2000×2000 square. Twitter, LinkedIn, Slack, Discord, Facebook will all reject or center-crop the card.

**Brand impact:**
- Every social share preview is broken (no bespoke 1200×630 composition; aspect-ratio mismatch).
- Every favicon request downloads 752 KB to render a 16-pixel browser-tab icon (perf + UX).
- iOS home-screen icon has wrong safe-area composition (the logo was not authored for the 180×180 rounded-square mask).
- PWA manifest is not a truthful spec — Lighthouse PWA audit will fail.

**Recommendation (do NOT edit — flag and route):**
- Pixel produces:
  - `favicon.ico` (16/32/48) plus `favicon-32.png` and `favicon-16.png`
  - `apple-touch-icon.png` at exactly 180×180 with iOS safe-area composition (logo inset ~10%, no edge-bleed)
  - `og-image.png` at exactly 1200×630 with brand composition (logo + tagline + visual; not the raw logo)
  - Optional: `icon-192.png` and `icon-512.png` for PWA home-screen
- Sprint creates the asset-replacement ticket; Pipeline gates production deploy on Lighthouse PWA pass.

---

### CRITICAL

#### C-2 — V2 announcement modal ships banned orange + green, customer-facing
**Evidence:** `src/components/announcements/v2-announcement.css`
- Line 162: `color: #F5B049;` — template orange used as the v2.0 number tint.
- Line 163: `-webkit-text-fill-color: #F5B049;`
- Line 171: `background: #5CD68D;` — green pulse dot.
- Lines 176–178: animated green box-shadow `rgba(92, 214, 141, .7)`.
- Lines 269–270: `color: #F5B049; border-color: rgba(245, 176, 73, .3);` on `.mm-ann-ico-gold`.
- Lines 300–301: `color: #F5B049; border: 1px solid rgba(245, 176, 73, .3);` on the "NEW" badge.
- Mounted globally in `App.tsx` via `V2AnnouncementModal` (`src/components/announcements/V2AnnouncementModal.tsx:43`); fired on **first sign-in after v2 release** for every authenticated user; gated only by `dismissed_v2_announcement_at` profile column. The modal documents itself at the top of `AdminAnnouncementBanner.tsx:25-28` as "aqua + brand gold only. … No red, no green, no template orange." — the sibling component contradicts the documented rule.

**Brand impact:** This is the **first paywall-adjacent screen** every existing user sees on v2 launch day. It directly violates the brand rule the brief calls out by name. Audience perception: "this looks like the pre-launch template, not the polished product."

**Recommendation:**
- Replace every `#F5B049` → `#E4C875` (brand gold).
- Replace every `#5CD68D` → `#14C8CC` (brand aqua) for the active/live pulse, or remove the pulse if "green = healthy" semantics are not needed.
- Replace `rgba(245, 176, 73, *)` → `rgba(228, 200, 117, *)` and `rgba(92, 214, 141, *)` → `rgba(20, 200, 204, *)`.
- Add a lint rule (e.g., stylelint `color-no-hex` with allowlist) to keep the rule from regressing.

---

#### C-3 — Shared transactional email template ships template orange on every CTA
**Evidence:** `supabase/functions/_shared/emailTemplate.ts`
- Line 55: `background:linear-gradient(135deg,#F5B049 0%,#E4C875 100%)` — every CTA button starts in template orange and ends in brand gold.
- Line 55: `border:1px solid rgba(245,176,73,.45)` — orange border on the same button.
- Line 80: `background-image:radial-gradient( … rgba(245,176,73,.14), … )` — orange radial in the email background.
- Line 97: `font-family:Georgia,'Playfair Display',serif` — third serif family entirely (the app uses Instrument Serif / Fraunces, neither of which appears here).

**Brand impact:** Every transactional email — welcome, password reset, newsletter, payment receipt, deletion confirmation, support reply — carries off-brand orange CTAs. This is the most repeatable customer touchpoint after the in-app surface and it reads as "orange brand," not "aqua + gold brand."

**Recommendation:**
- Remove the orange waypoint from the gradient: `background:linear-gradient(135deg,#E4C875 0%,#C9A75A 100%)` (gold → deep gold companion, matching `autopost-tokens.css:18-23`).
- Border: `rgba(228,200,117,.45)`.
- Background radial: `rgba(228,200,117,.14)`.
- Replace `Georgia,'Playfair Display'` with `Georgia,'Instrument Serif',serif` so the email serif at least falls back to a face declared elsewhere in the brand.
- This is a single file — every transactional email inherits the fix.

---

#### C-4 — Marketing site ships pure red `--destructive` while the app ships gold
**Evidence:**
- App: `src/index.css:67-69` (light) and `:147` (dark) — `--destructive: 45 67% 55%` / `45 67% 68%` — both gold, with comment: *"Destructive — Gold (was red) — all destructive affordances render in brand gold so error/warning chrome stays on-palette."*
- Marketing: `marketing/src/styles/global.css:36` (light) and `:77` (dark) — `--destructive: 0 72% 51%` / `0 72% 55%` — both **pure red** (hue 0).
- Both surfaces share `--warning: 38 92% 50%` (light) / `38 92% 55%` (dark) — that is **amber/orange** (hue 38) in both shells, contradicting the brand rule "no orange." `index.css:62-64` and `index.css:142-143` both ship this token; `marketing/src/styles/global.css:34-35` and `:75-76` ship the same.

**Brand impact:** A user clicking "Cancel subscription" on the marketing pricing page sees red; clicking the same affordance inside the app sees gold. The product feels like two different brands.

**Recommendation:**
- Marketing: change `--destructive` HSL to match the app: `45 67% 55%` (light) / `45 67% 68%` (dark).
- Both surfaces: change `--warning` to a gold variant rather than amber. Suggested: `45 67% 50%` (deep gold) / `45 67% 60%` (lifted gold). If the design language needs to differentiate "warning" from "destructive," vary lightness, not hue.

---

### MAJOR

#### M-1 — Two competing brand-aqua hex values coexist
**Evidence:** Tally across `src/`:
- `#14C8CC` (brand spec, per Jo's memory) — **437 occurrences**
- `#11C4D0` (the legacy aqua) — **91 occurrences**
- `src/index.css:27` declares `--brand-aqua: 184 85% 44%` ≈ `#11C4D0`. So the **Tailwind primary token resolves to `#11C4D0`**, but the scoped shells (`autopost-tokens.css:18`, `admin-tokens.css:17`, `v2-announcement.css:9`, `VoiceLab.tsx:205+`) hard-code `#14C8CC`. Both ship side by side.
- The two hexes are visually distinguishable side by side (delta-E ≈ 5).
- Files still on `#11C4D0` include lab-side surfaces: `pages/lab/_LabLayout.tsx:78`, `pages/lab/autopost/_autopostUi.tsx:37`, `pages/lab/autopost/_GenerateTopicsDialog.tsx:365`, `pages/lab/autopost/RunDetail.tsx:303,335,389,420` — i.e., the lab UI is currently rendering both aquas in the same view.

**Recommendation:**
- Pick one. Per Jo's brand memory, the brand-spec value is `#14C8CC` (HSL `181 81% 44%`).
- Update `--brand-aqua` and `--primary` in `src/index.css:27,44` and `marketing/src/styles/global.css:12,24` to that HSL.
- Replace the 91 `#11C4D0` occurrences with `text-primary` / `bg-primary` Tailwind utilities or `var(--primary)` so they track the token.

---

#### M-2 — Spec-declared serif (Fraunces) is never loaded — silent fallback to Instrument Serif
**Evidence:**
- `src/styles/autopost-tokens.css:40` declares `--serif: 'Fraunces', 'Instrument Serif', Georgia, serif;` — Fraunces is the preferred face.
- `src/styles/autopost-modal.css:53` declares `font-family: 'Instrument Serif', 'Fraunces', Georgia, serif;` — order swapped.
- `index.html:128` only loads `Instrument Serif` and `JetBrains Mono` from Google Fonts — `Fraunces` is not in the stylesheet URL.
- The standalone Dashboard reference (`MotionMax Dashboard _standalone_ (1).html`) embeds Fraunces directly via `@font-face` — the React app inherited the spec but lost the loading.
- Result: every "Fraunces" reference silently falls through to Instrument Serif. Two pages styled with the same `--serif` token render identically because the first-choice face is never available, but if Fraunces ever loads (e.g., a future code change adds it), the app's serif sections will visually shift overnight without a code review trigger.

**Recommendation:**
- Decide one: Fraunces or Instrument Serif. (Brand source-of-truth says Fraunces; current production renders Instrument Serif.)
- If Fraunces: add to `index.html:128` Google Fonts link.
- If Instrument Serif: remove `'Fraunces'` from every `--serif` declaration so the spec is honest.

---

#### M-3 — `--warning: 38 92% 50%` is amber/orange in both app and marketing tokens
**Evidence:**
- `src/index.css:63-64` (light) and `:142-143` (dark) — `--warning: 38 92% 50%` and `38 92% 55%` — both render as amber/orange (`#F5A623`-ish).
- `marketing/src/styles/global.css:34-35` and `:75-76` — same.
- Used in `LandingPricing.tsx:150,167,208`, `LowCreditWarning.tsx:16-26`, `Auth.tsx:461`, `CharacterConsistencyToggle.tsx:111`, `SubscriptionRenewalModal.tsx:120`, `password-strength.tsx:15-16,36-37` — i.e., the orange shows up at every soft-warning surface (low credits, weak password, expiring sub, character consistency hint) on both the marketing site and inside the app.

**Brand impact:** Even though "warning" is a semantic role, the brand rule says no orange. Soft warnings look like template defaults.

**Recommendation:**
- Remap `--warning` to a gold variant matching `--destructive`: e.g., `45 67% 50%` (light) / `45 67% 60%` (dark). Differentiate warning from destructive via background opacity / icon, not hue.
- Replace Tailwind `amber-*` and `orange-*` utilities (`bg-amber-500/10`, `text-amber-400`, etc., in `LandingPricing.tsx`, `LowCreditWarning.tsx`, `Auth.tsx`, `SubscriptionRenewalModal.tsx`) with `warning`/`destructive`/custom gold tokens.

---

#### M-4 — `admin-shell` ships green `--good: #5CD68D` and purple `--purple: #a78bfa` outside the brand palette
**Evidence:** `src/styles/admin-tokens.css:40-41`
- `--good: #5CD68D` (green) used in `admin-shell.css:211, 307, 378, 454, 512, 551, 600` and `TabApiKeys.tsx:248`.
- `--purple: #a78bfa` used in `admin-shell.css:395, 602` (debug log lines + a label color).
- Pulse rings shipped in green: `admin-shell.css:212, 308` (`box-shadow: ... rgba(92, 214, 141, ...)`).
- Admin is internal-facing (not customer-facing), but it is part of the same product brand. Per brief the strict rule applies to **autopost/lab UI**; admin is adjacent and inherits the same expectation by reading native.

**Severity reasoning:** Major (not Critical) because admin is an internal surface the marketing audience never sees; admins are operators who tolerate convention more than aesthetics. But it is the single largest source of green leakage in the codebase.

**Recommendation:**
- Remap `--good` → aqua (`#14C8CC` for "ok"/"healthy" status), or aqua-light for liveness.
- Remap `--purple` → `var(--ink-dim)` for debug-line distinction, or drop the differentiation entirely.
- Audit pulse animations to use `rgba(20, 200, 204, *)` not `rgba(92, 214, 141, *)`.

---

#### M-5 — Three different theme-colors across PWA / Safari / browser chrome
**Evidence:**
- `public/manifest.json:8` — `"theme_color": "#2D9A8C"` (a third teal that matches neither brand aqua nor either of the live aquas above).
- `public/manifest.json:7` — `"background_color": "#0F1112"` (carbon black — on-brand).
- `index.html:26` — `<link rel="mask-icon" color="#2D9A8C">` (Safari pinned-tab tint, same off-brand teal).
- `index.html:28` — `<meta name="msapplication-TileColor" content="#0F1112">` (Windows tile).
- `index.html:30` — `<meta name="theme-color" content="#0F1112">` (mobile browser chrome — carbon black).
- `marketing/src/layouts/BaseLayout.astro:70` — `<meta name="theme-color" content="#0F1112">` (carbon black).

**Brand impact:** PWA install prompt, Android browser address bar, iOS standalone splash, Safari pinned tabs, and Windows tiles each render in a different color across the four declarations. `#2D9A8C` is not a brand color in any token file — it's an unattributable hex.

**Recommendation:**
- Settle the rule: brand chrome = either carbon black `#0F1112` (if the brief is "dark UI by default") or brand aqua `#14C8CC` (if the brief is "branded chrome wherever possible"). Pick one and use it in all four places.
- Delete `#2D9A8C` from `manifest.json:8` and `index.html:26`.

---

#### M-6 — Radius scale is bypassed pervasively in `admin-shell.css`
**Evidence:** `src/styles/admin-shell.css` ships arbitrary `border-radius` values not on any scale:
- `2px` (index.css:208,250,255)
- `3px` (admin-shell.css:278)
- `5px` (admin-shell.css:323, 505)
- `6px` (admin-shell.css:125, 149, 474, 580)
- `7px` (admin-shell.css:247, 470, 478, 481, 519, 591)
- `8px` (admin-shell.css:478, 481, 515, 550, 582)
- `10px` (admin-shell.css:529, 594)
- `12px` (admin-shell.css:446, 465, 485, 560)
- `14px` (admin-shell.css:586)
- `999px` (admin-shell.css:362)

Tokens defined: `--radius: 12px`, `--radius-lg: 16px`, plus Tailwind's `rounded-{sm,md,lg,xl,2xl}` derived from those — but admin-shell does not reference them.

**Recommendation:** Define a 6-step radius scale (`--radius-xs: 4px`, `--radius-sm: 6px`, `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-xl: 16px`, `--radius-pill: 999px`) and replace the literals.

---

### MINOR

#### M-7 — Voice Lab country flag gradients ship reds, greens, oranges, indigos, pinks
**Evidence:** `src/lib/voiceCatalog.ts:222-238`
```
case "UK":    return "linear-gradient(135deg, #EF4444, #991B1B)";  // red
case "AU":    return "linear-gradient(135deg, #10B981, #047857)";  // green
case "ES":    return "linear-gradient(135deg, #F59E0B, #B45309)";  // orange
case "LATAM": return "linear-gradient(135deg, #F97316, #C2410C)";  // orange
case "RU":    return "linear-gradient(135deg, #DC2626, #7F1D1D)";  // red
case "CN":    return "linear-gradient(135deg, #DC2626, #FBBF24)";  // red+yellow
case "HT":    return "linear-gradient(135deg, #1D4ED8, #DC2626)";  // blue+red
```
Used for voice-card avatar backgrounds in Voice Lab — a lab surface.

**Severity reasoning:** Minor not Critical. These are arguably **diegetic** — they reference national flag colors as a navigational affordance for "find a voice with this accent." A user picking a UK voice expects red; a user picking an AU voice expects green. Removing those tints would *hurt* the product UX (you'd pick voices by reading 2-letter codes instead of recognizing color).

**Recommendation:** Either (a) get a formal exception in the brand guide for "voice flag tints are diegetic and may break palette," or (b) desaturate to a brand-aligned gold/aqua tint per region with the country code text doing the work. Surface to Pixel for the brand-guide call.

#### M-8 — `text-red-400` hover state on Voice Lab delete buttons
**Evidence:** `src/pages/VoiceLab.tsx:663` and `:1002`
```
className="… hover:text-red-400 hover:bg-white/5 …"
```
Lab UI surface. Brand rule says no red.

**Recommendation:** `hover:text-[#E4C875]` or use the `destructive` token (which is already remapped to gold app-side).

#### M-9 — Mixed motion durations within a single shell file
**Evidence:** `src/styles/autopost-tokens.css` uses `.12s`, `.15s`, `.2s`, `.25s`, and `.3s` for transitions across different components in the same file. `admin-shell.css` adds a 6th value (`0.12s`, `0.15s`, `0.25s`, `0.3s`).

**Severity reasoning:** Minor — all durations are within the "fast micro-interaction" range; the inconsistency is noticeable in a pixel-level audit but not in user-perceived quality.

**Recommendation:** Codify a 4-step motion scale (`--motion-instant: 80ms`, `--motion-fast: 150ms`, `--motion-base: 240ms`, `--motion-slow: 400ms`) and replace literals. Already-strong: Tailwind animation tokens are consistent (0.2s/0.3s ease-out) — extend that discipline to scoped shells.

#### M-10 — Newsletter preview in admin uses serif `Georgia, "Times New Roman"` and `#fafaf6` background — drifts from both app and email-template stacks
**Evidence:** `src/styles/admin-shell.css:586,591`
- `.nl-preview { background: #fafaf6; … font-family: Georgia, "Times New Roman", serif; … }`
- `.nl-preview .cta { background: #0A0D0F; color: #fff; … font-family: "Inter", sans-serif; … }`

**Severity reasoning:** Minor because this is the *preview pane* in admin, not the actual sent email. But the live email template uses the same serif drift (M-2 / C-3) — admin operators are previewing one font stack and shipping a different one.

**Recommendation:** Render the preview using the actual `emailTemplate.ts` HTML so what admins see is what subscribers receive.

---

### POLISH

#### P-1 — Over-loaded font stylesheet: 17 display fonts loaded blocking on every page load
**Evidence:** `index.html:126` requests Inter, Montserrat, Bebas Neue, Poppins, Bangers, Comfortaa, Oswald, Pangolin, Flavors, Chango, Luckiest Guy, Vina Sans, Special Elite, Rubik Mono One, Pacifico, plus Instrument Serif and JetBrains Mono — 17 typefaces.

**Severity reasoning:** Polish — the display fonts (Bangers, Bebas, Pangolin, Chango, etc.) are caption-style picks for user videos (diegetic). Acceptable to load. But blocking-load all 17 on every request is a perf nit, not a brand nit.

**Recommendation:** Load Inter, Instrument Serif, JetBrains Mono blocking (chrome fonts); load the 14 caption display fonts on-demand when the caption-style picker mounts.

#### P-2 — Glass-effect utility uses `bg-white/80` in light + `bg-card/80` in dark — opacity asymmetry
**Evidence:** `src/index.css:230` — `.glass-effect { @apply backdrop-blur-md bg-white/80 dark:bg-card/80; }`
Light mode glass has 80% white over backdrop; dark mode has 80% card over backdrop. Visually different translucency levels because card is already a surface ramp.

**Recommendation:** Define `--glass-bg-light` and `--glass-bg-dark` tokens as discrete color/opacity pairs that produce equal perceived translucency in both modes.

#### P-3 — Scrollbar styles repeat per-shell with subtle drift
**Evidence:** `src/index.css:194-260` declares unified scrollbar styles. `src/styles/admin-shell.css` and `autopost-tokens.css` shells inherit but the v2 announcement modal (`v2-announcement.css:185-201`) defines its own scrollbar treatment with different colors.

**Recommendation:** Promote the unified `.scrollbar-thin` utility from `index.css` to a shared class the announcement modal can adopt.

---

## Summary punch-list (severity-sorted)

| # | Severity | Issue | Owner suggestion (final routing belongs to Jury) |
|---|---|---|---|
| C-1 | **Blocker** | Brand asset bundle is one PNG repeated 4x; OG card / favicon / app icon all 2000×2000 | Pixel (asset production) → Vega (manifest + meta wiring) |
| C-2 | **Critical** | V2 announcement modal ships orange `#F5B049` + green `#5CD68D` (banned) | Vega |
| C-3 | **Critical** | Shared email template CTA gradient ships orange `#F5B049` | Forge (Edge Functions) |
| C-4 | **Critical** | Marketing `--destructive` is red; app `--destructive` is gold; both ship orange `--warning` | Vega + marketing-side Astro author |
| M-1 | Major | Two brand-aqua hexes coexist (`#11C4D0` 91 occ vs `#14C8CC` 437 occ) | Vega |
| M-2 | Major | Fraunces declared in CSS but never loaded — silent fallback to Instrument Serif | Vega |
| M-3 | Major | `--warning: 38 92% 50%` is amber on both surfaces | Vega + marketing-side Astro author |
| M-4 | Major | `admin-shell` ships green `--good` and purple `--purple` outside palette | Vega |
| M-5 | Major | Three theme-colors across PWA/Safari/Windows; off-brand `#2D9A8C` in two of them | Vega |
| M-6 | Major | Radius scale bypassed pervasively in `admin-shell.css` (10 distinct literals) | Canvas (token system) → Vega (apply) |
| M-7 | Minor | Voice Lab country flag gradients use red/green/orange (likely diegetic — needs Pixel ruling) | Pixel (brand-guide call) |
| M-8 | Minor | `text-red-400` hover on Voice Lab delete buttons | Vega |
| M-9 | Minor | Mixed motion durations within scoped shells | Motion + Vega |
| M-10 | Minor | Admin newsletter preview uses different font stack than the actual sent email | Vega |
| P-1 | Polish | 17 display fonts loaded blocking on every page request | Vega (split blocking vs lazy) |
| P-2 | Polish | Glass-effect opacity asymmetry between light/dark | Canvas |
| P-3 | Polish | Scrollbar styles repeat per shell with drift | Vega |

---

## Cross-surface coherence matrix

| Surface | Brand aqua used | Destructive | Warning | Theme color | Serif face |
|---|---|---|---|---|---|
| App (`src/index.css`) | `#11C4D0` (token) | gold ✓ | amber ✗ | n/a | Instrument Serif (loaded) |
| Autopost shell | `#14C8CC` ✓ | gold ✓ | gold ✓ | n/a | Fraunces declared, falls back to Instrument Serif |
| Admin shell | `#14C8CC` ✓ | gold ✓ | gold (warn) ✓ | n/a | Instrument Serif |
| V2 announcement modal | `#14C8CC` ✓ | n/a | n/a | n/a | Instrument Serif |
| Marketing site | `#11C4D0` (token) | **RED ✗** | amber ✗ | `#0F1112` | (no serif explicit) |
| Transactional email | `#14C8CC` ✓ | n/a | n/a | n/a | **Georgia / Playfair ✗** |
| PWA manifest | n/a | n/a | n/a | **`#2D9A8C` ✗** | n/a |
| Safari pinned tab | n/a | n/a | n/a | **`#2D9A8C` ✗** | n/a |
| Windows tile | n/a | n/a | n/a | `#0F1112` | n/a |
| index.html `<meta theme-color>` | n/a | n/a | n/a | `#0F1112` | n/a |

The matrix illustrates the central problem: each surface was visually-tuned in isolation; no cross-surface enforcement.

---

## What is going well (record so we don't regress)
- **Single icon library** (`lucide-react`) across 130+ files. No drift to react-icons / radix-icons / heroicons. Continue.
- **Scoped shell pattern** (`.autopost-shell`, `.admin-shell`, `.bill-*`) prevents theme leak between surfaces — the architecture is correct; it's just inconsistently filled in.
- **Reduced-motion respect** is global and includes the inline-SVG SMIL `<animate*>` workaround at `index.css:325-353` — a thoughtful, non-obvious detail. Keep.
- **Z-index tokens** (`stage`/`overlay`/`drawer`/`modal`/`fullscreen` in `tailwind.config.ts:28-34`) replace prior arbitrary `z-[9999]` literals. Continue this pattern for radius/elevation/motion.
- **Destructive-as-gold remap** (in app shell only) is the right brand-respecting decision. Extend it to marketing.
- **Typography scale** in `index.css:355-405` (`type-display` … `type-label`) is a real codified scale. Encourage migration off arbitrary `text-[13px]` literals (currently extensive in lab/autopost JSX) into the named scale.

---

## Re-audit gate
Per `agents/audit/jury.md` rule 6, fixes for **C-1, C-2, C-3, C-4** must be re-verified by Canon (this reviewer) before the project can be promoted from `PASS WITH FIXES` to `PASS`. Re-verification will:
- Re-`md5` the four `public/*.png` files and confirm they are now distinct + correct dimensions (`xxd -s 16 -l 8` on each).
- Re-grep `#F5B049`, `#5CD68D`, `(text|bg|border)-(red|green|emerald|lime|orange|amber)-\d{2,3}` in `src/` and `marketing/src/` and `supabase/functions/_shared/` and confirm zero occurrences in customer-facing surfaces.
- Re-grep `#11C4D0` and require a single brand-aqua hex across all of `src/`.
- Render the v2 announcement modal in dark mode and confirm gold + aqua only.

---

**Submitted to Jury, 2026-05-10.** No code edits performed; auditor flags and recommends only.
