# Phase 4 Heuristic Audit — Optic

**Auditor:** Optic (UX/UI heuristics, Audit layer)
**Phase:** BUILD_FLOW Phase 4 — Brand & Component Build
**Reviewing:** Canvas's 14 components (`design/components/INDEX.md`) + Pixel's 5 hero screens (`design/screens/*`) + `design/motion.md`
**Independent-reviewer bias check:** I produced the IA at Phase 3. Where Pixel diverged from my spec, I judge the divergence on its own merits — improvement or regression — rather than defending my own draft.
**Date:** 2026-05-11
**Status:** Phase 4 Jury exit gate

---

## 0. Gate verdict at a glance

**PASS WITH FIXES.**

- **Heuristic-budget re-verdict:** all five hero screens hold Hick's-Law / Miller PASS at composition time. No screen drifted above 7 choices.
- **Nielsen 10 re-check:** 47 of 50 screen × heuristic cells PASS; 3 WARN; 0 FAIL.
- **Critical IA divergence found:** the Sidebar component (`sidebar.md`) ships with items *Projects · Audits · Settings · Help* — which contradicts both HB-9a (*Dashboard · Projects · New audit · Settings*) and the Dashboard screen composition map (which expects HB-9a's labels). This is the highest-priority Phase 4 fix.
- **Bias-check on the parts I specced:** Pixel's screens compose my IA decisions cleanly. The one place Pixel improved on me is the *audit-product chip with plain-English subtitle* at Step 2 of intake (AH-4 made literal). The one place a Canvas component diverged from my IA is the Sidebar (see above).

---

## 1. Heuristic-budget re-verdict per hero screen

Re-counting Hick's-Law choices on the **rendered** composition (not the IA spec). The screen filename below references `design/screens/<name>/<name>.md`.

| Screen | Surface budget at Phase 3 (HB-#) | Choice count at Phase 4 composition | Verdict |
|---|---|---:|---|
| **landing** | HB-1 hero = 2; HB-5 pricing strip = 3 above-fold + "See all plans"; HB-10 top nav = 5 + auth | Hero: 2 (Run free Surface audit + See how it works). Pricing strip: 3 above-fold + disclosure. Top nav: 5 + auth pair. | **PASS** all surfaces |
| **dashboard-first-run** | HB-9a sidebar = 4; ES-DASHBOARD-FIRST-RUN: 1 primary + 1 secondary + 3 explainer cards | Sidebar in screen composition map = 4 (Dashboard / Projects / New audit / Settings). Main: 1 primary + 1 secondary + 3 explainer cards (5 peers below fold, peers-of-peers separated by section). | **PASS** (note Sidebar contradiction with `sidebar.md` component file — see Finding F1) |
| **intake-2step** | HB-3 Step 1 = 3; HB-3 Step 2 = 2 visible + 1 disclosure | Step 1: 3 peer cards (GitHub / URL / Local-folder) + tag input (not a peer choice). Step 2: 2 depth radios (Quick / Comprehensive) + Advanced disclosure. | **PASS** both steps |
| **verdict-fail** | HB-7 = 1 primary CTA above fold; HB-6a findings toolbar = 3 | 1 primary CTA (*Run the Code audit →*) + 1 secondary text-link (*Export report*). No third/fourth peer. Findings toolbar = 3 (Filter / Group / Sort). Per-row = 3 visible + kebab. | **PASS** |
| **settings-root** | HB-4 = 3 groups; HB-4a Account = 5; HB-4b Integrations = 3; HB-4c Billing & Data = 7 (WARN); + Team V2 disabled placeholder | 3 groups exactly as specced. Billing & Data still at 7 (the carried-forward HB-4c WARN). Team V2 rendered disabled, not tabbable — good (no choice burden). | **PASS** at group level; **WARN held** at HB-4c (Billing & Data = 7). No regression. |

**Spot-checks the prompt explicitly asked for:**

- **Intake Step 1 mode-aware filtering (IA-D1).** `intake-2step.md` §3 Step-1 row specifies: *"CLI-mode users see GitHub card disabled with `aria-disabled='true'` + helper text 'Local folders only in CLI mode' (Trace S6 lock)."* The card is *rendered but disabled* rather than *hidden*. **Hick's-correct interpretation:** disabled-but-visible is acceptable because (a) it shows the customer the option exists in other modes (recognition over recall, H6), and (b) `aria-disabled` removes it from the choice load for sighted+SR users. **PASS** with one minor note: the choice count for a CLI-mode user is effectively 2 (URL + Local folder), but the GitHub card consumes visual space and might still register as a cognitive peer for a non-AT user. Acceptable trade-off given AH-6 recognition value.
- **Verdict-fail above-fold CTAs.** Screen composition shows exactly **1 primary CTA** (*Run the Code audit →*) and **1 secondary text-link** (*Export report*). No "share" + "export" + "compare" + "re-audit" quartet. **PASS at 1 primary, 1 secondary** — Herald's E2-locked CTA is held. AH-5 free-tier chip is present but is *informational*, not a CTA peer. The radar, table, and findings list are *content*, not choices.
- **Settings-root panel count + tab traversal.** Account = 5, Integrations = 3, Billing & Data = 7, plus Team V2 disabled = **15 panels total** (claim "9 panels at MVP" in the prompt is incorrect — my Phase 3 HB-4 already specced 15). Pixel's tab-traversal claim *"Tab count from cold load to Delete account via skip-link = 7 Tabs"* checks out: skip → H1 → Account `<h2>` skippable → row 1 → 2 → 3 → 4 → Delete row = 7. If group `<h2>`s carry `tabindex="-1"`, count drops to 6. **PASS within Halo A3-1 ceiling of ≤8 keystrokes per group.**
- **Sidebar 4 items across all 4 app-shell screens.** Dashboard-first-run, intake-2step, verdict-fail, settings-root all specify 4 sidebar items in their composition maps **matching HB-9a (Dashboard · Projects · New audit · Settings)**. But `sidebar.md` (Canvas component) lists *Projects · Audits · Settings · Help*. This is a **regression** I owe to the gate (Finding F1, below).
- **Findings-row affordances.** `findings-row.md` lists: severity chip · category chip · summary · reviewer eyebrow · Expand · Copy fix · Dismiss · kebab = **3 primary actions + 1 kebab** per row. Per HB-6 collapse this is **PASS** (3 visible + kebab). All actions ≥24×24 per SC 2.5.8. Group-by-category default (AH-2) is enforced in the FindingsRow `category` prop being primary over `reviewer` (secondary eyebrow). **PASS.**

---

## 2. Per-screen Nielsen-10 condensed table

Format: P = PASS, W = WARN, F = FAIL. Cells called out below the table with file paths.

| Screen | H1 Status | H2 Real-world | H3 Control/freedom | H4 Consistency | H5 Error prev | H6 Recognition | H7 Flexibility | H8 Minimalist | H9 Error recovery | H10 Help |
|---|---|---|---|---|---|---|---|---|---|---|
| landing | P | P | P | P | P | P | P | **W** | P | P |
| dashboard-first-run | P | P | P | **W** | P | P | P | P | P | **W** |
| intake-2step | P | P | P | P | P | P | P | P | P | P |
| verdict-fail | P | P | P | P | P | P | P | P | P | P |
| settings-root | P | P | P | P | P | P | P | P | P | P |

**WARN cells:**

- **landing × H8 Aesthetic & minimalist** — `design/screens/landing/landing.md` §2 lists *8 below-fold sections* (Modes / Roster / Gate / SKU explainer / Pricing / Footer). Above the fold is correctly Hick's-trimmed to 2 CTAs, but the *vertical* density is high. Not a Hick's violation (each section is a single decision-zone), but Direction A's "restrained" register is being stretched. Recommendation: drop the Roster section's full 14-card layer enumeration to a "14 layers · 56 specialists →" link card; let `/team` carry the deep enumeration. Not a Phase 4 blocker.
- **dashboard-first-run × H4 Consistency & standards** — `design/screens/dashboard-first-run/dashboard-first-run.md` §3 composition map names the sidebar items *Dashboard / Projects / New audit / Settings* (HB-9a-correct), but `design/components/sidebar/sidebar.md` §"Purpose" lists *Projects · Audits · Settings · Help*. Two sources of truth disagree. **This is the gate's top Phase 4 fix (F1).**
- **dashboard-first-run × H10 Help & documentation** — sidebar (per HB-9a recommendation) moved Help to a footer link, but the app shell has no footer (per dashboard-first-run.md §6 Traversal note: *"no footer in app shell"*). Result: Help is **invisible** in the authed app at MVP. The IA put it in a footer; the design composition has no footer. Either the Help link rejoins the sidebar (and HB-9a goes to 5 items = PASS at WARN border) or Help gets a header-bell-style affordance. Recommend the latter: header-right help button (icon "?") in `<Nav variant="app">` per H10 visible-help mandate.

**No FAIL cells.**

---

## 3. Per-component heuristic-fitness check

Walking 14 Canvas components against the heuristic constraints they were specced to satisfy. Format: ✓ = satisfied, ⚠ = warn, ✗ = fail.

| # | Component | Heuristic fitness verdict | Notes |
|---|---|---|---|
| 1 | Button | ✓ | 6 states + WCAG SCs cited; SC 2.5.8 24×24 floor; arrow-glyph convention. H4 consistency held. |
| 2 | Input | ✓ | BYOK paste + show/hide per HC5 + SC 3.3.8; helper + error via `aria-describedby`. |
| 3 | Card | ✓ | ModeCard humanLabel + technicalLabel pair satisfies AH-1. FindingCard `category` primary satisfies AH-2. |
| 4 | Chip | ✓ | Watermark variant `aria-describedby` pair (D7 + HC10). Filter chip `aria-pressed`. |
| 5 | Nav | ✓ | Skip-to-content as first focusable element (SC 2.4.1). H10 help-link host on marketing. **But** see Finding F2: the app-shell `<Nav variant="app">` doesn't enumerate a Help affordance, only a bell. |
| 6 | Sidebar | ✗ | **F1 — items list contradicts HB-9a.** Component file says *Projects · Audits · Settings · Help*; HB-9a + every screen composition map says *Dashboard · Projects · New audit · Settings*. |
| 7 | Modal-as-route | ✓ | Halo A1-1 focus return + SR announcement on close. H3 emergency exit via Esc/X/backdrop. |
| 8 | Findings-row | ✓ | HB-6 collapse (3 + kebab); A3-3 menu pattern; AH-2 category primary; SC 2.5.7 keyboard reorder. |
| 9 | Verdict-card | ✓ | PRD §7.2 Step D lock; HC1 `role="status"` on `<h1>` (the one allowed exception); AH-5 free-tier chip slot. |
| 10 | Score-display | ✓ | HC3 radar + table parity; chart `aria-hidden`, table is truth (SC 1.1.1 / 1.3.1). |
| 11 | Live-progress-region | ✓ | A2-2 single coalesced region; 250ms debounce; ≤4/sec throttle satisfies HC2 / SC 2.2.1. |
| 12 | Table | ✓ | Semantic `<table>`, `<th scope>`; "Most popular" badge programmatic (HC7); SC 1.4.10 stack-reflow. |
| 13 | Form | ✓ | Error-summary focus on submit failure; SC 3.3.7 redundant-entry honored. |
| 14 | Empty-state | ✓ | Single template covers all 17 IA-enumerated states. `role="alert"` reserved for assertive errors only (A2-1). Halo A2-4 skip-to-content target consistent. |

**Library verdict from heuristic lens:** 13/14 ✓; 1 ✗ (Sidebar items list).

---

## 4. Top 5 findings (Phase 4 gate priority)

### F1 — Critical · H4 Consistency & standards · Sidebar item list contradicts HB-9a across the design system

- **Files:** `C:\Users\Administrator\studio-zero\design\components\sidebar\sidebar.md` (lists *Projects · Audits · Settings · Help*); contradicted by `C:\Users\Administrator\studio-zero\ia\heuristic-budget.md` HB-9a, `C:\Users\Administrator\studio-zero\design\screens\dashboard-first-run\dashboard-first-run.md` §3, `C:\Users\Administrator\studio-zero\design\screens\verdict-fail\verdict-fail.md` §3, `C:\Users\Administrator\studio-zero\design\screens\settings-root\settings-root.md` §3, `C:\Users\Administrator\studio-zero\design\screens\intake-2step\intake-2step.md` §3.
- **Heuristic:** H4 Consistency & standards · Jakob's Law.
- **Severity rationale:** The Sidebar is the *most-rendered surface in the app*. If Canvas ships *Projects · Audits · Settings · Help* and Pixel's screens declare *Dashboard · Projects · New audit · Settings*, the rendered DOM will mismatch one or the other. This is a Critical Phase 4 fix because Canon's drift-detector should fail on it — and if Canon doesn't, customers see two products.
- **Bias check:** I specced HB-9a. The Canvas component diverged. The Sidebar component file's choice (*Audits* and *Help* as sidebar items) has merit — *New audit* is arguably a route-action (belongs in a CTA, not nav), and *Help* in sidebar satisfies H10. But that's a **superseding-recommendation conversation**, not a silent divergence. Resolve before Phase 5: either update HB-9a to match Sidebar component, or update Sidebar component to match HB-9a. My vote: HB-9a wins because every screen composition map already cites it; align Canvas to the IA.

### F2 — Major · H10 Help & documentation · Help affordance invisible in app shell

- **Files:** `C:\Users\Administrator\studio-zero\design\components\nav\nav.md` (no Help affordance in app variant); `C:\Users\Administrator\studio-zero\design\screens\dashboard-first-run\dashboard-first-run.md` §6 (*"no footer in app shell"*); `C:\Users\Administrator\studio-zero\ia\heuristic-budget.md` HB-9a (*"Help to footer link"*).
- **Heuristic:** H10 Help & documentation.
- **Severity rationale:** HB-9a moved Help out of the sidebar *to a footer link* to keep sidebar at 4 items. But Pixel's app shell has no footer — so Help is now unreachable except via direct URL (`/app/help`). The P1 persona (non-technical) cannot find help when they need it.
- **Fix:** add a Help button to `<Nav variant="app">` right-cluster (after the bell, before the user menu). Icon-only with `aria-label="Help"`; opens `/app/help`. Header now reads: `[brand] [search?] ... [bell] [help] [user]` — 3 right-side affordances, still HB-9 PASS at the header level.

### F3 — Major · H4 Consistency & standards · Sidebar item *"Dashboard"* vs route `/app` (root)

- **Files:** `C:\Users\Administrator\studio-zero\design\screens\dashboard-first-run\dashboard-first-run.md` §3 (sidebar item *Dashboard* → href `/app`); `C:\Users\Administrator\studio-zero\ia\sitemap.md` line 52 (*"/app  (App shell — dashboard, authed, noindex)"*).
- **Heuristic:** H4 + Jakob's Law.
- **Severity rationale:** Sidebar item *Dashboard* is `aria-current="page"` on the first-run screen, but on every other authed screen (intake, verdict, settings) the user is **also** technically "on the dashboard" (it's the shell). The label needs disambiguation OR the sidebar's current-page logic needs to be route-specific (only `/app` exactly, not `/app/*`).
- **Fix (low-cost):** Sidebar component's `currentPath` prop matches *exact route* (already implied in `sidebar.md` props), not prefix. Confirm in implementation. No spec change needed.

### F4 — Major · H5 Error prevention · Soft warning banner on intake-Step-2 SKU mismatch is ambiguous about consequence

- **Files:** `C:\Users\Administrator\studio-zero\design\screens\intake-2step\intake-2step.md` §3 Step 2 (*"When user picks Comprehensive on free-tier Surface intake, surfaces an inline role='status' banner: 'Comprehensive needs the Code SKU. Upgrade, or run Quick on Surface.'"*).
- **Heuristic:** H5 Error prevention · H9 Error recovery.
- **Severity rationale:** The banner is `role="status"` (non-assertive, correct for non-error). But the copy *"Comprehensive needs the Code SKU"* asks the customer to translate two SKU names. AH-4 Critical (plain-English subtitles) was specced; this banner is the place that drops the AH-4 fix. The plain-English version should be: *"Comprehensive runs against your source code — and you're on the live-site (Surface) tier. Upgrade, or run Quick on Surface."*
- **Fix:** Herald owns the rewrite. Pixel + Optic enforce on render: banner copy MUST include the plain-English subtitle.

### F5 — Minor · H8 Aesthetic & minimalist · Landing below-fold section count is high

- **File:** `C:\Users\Administrator\studio-zero\design\screens\landing\landing.md` §2 (lists Nav + Hero + Modes + Roster + Gate + SKU explainer + Pricing strip + Footer = 7 sections; Roster section enumerates Director + 14 layer cards).
- **Heuristic:** H8 Aesthetic & minimalist · Direction A "restrained" register.
- **Severity rationale:** Above-fold is correct (HB-1 hero = 2 CTAs). Below-fold density is what stretches the brand register, not the heuristics. Not a Phase 4 blocker — flagging for Hook / Herald / Lens to consider in Phase 5 conversion-optimization work.
- **Fix:** Collapse the Roster to a single "14 layers · 56 specialists →" card linking to a deep `/team` page. Defers the long enumeration to a route that wants the depth.

---

## 5. Did the IA I specced at Phase 3 deliver in the design?

**Yes — with one Sidebar-naming divergence and one Help-affordance gap (F1 + F2 above).**

Specific Phase-3 IA decisions verified delivered:

- **HB-3 2-step intake** — composed exactly. Step 1 = 3 peers; Step 2 = 2 visible + Advanced disclosure. Mode-aware filtering on Step 1 honored via `aria-disabled` on the GitHub card in CLI mode (IA-D1 PASS).
- **HB-4 Settings 3-group structure** — composed exactly. Account = 5, Integrations = 3, Billing & Data = 7 (WARN held, no drift).
- **HB-7 Verdict 1 primary CTA above the fold** — composed exactly. *Run the Code audit →* primary; *Export report* secondary text-link. No CTA-quartet.
- **HB-9a Sidebar 4 items** — declared in screens but contradicted in Canvas component file. **F1.**
- **HB-1 Landing 1 primary + 1 secondary** — composed exactly. Herald canonical CTA copy preserved.
- **ES-DASHBOARD-FIRST-RUN as hero design surface** — Pixel treated it as a hero per BUILD_FLOW Phase 3 lesson #2.
- **Empty-state catalog** — Canvas's `<EmptyState>` single template covers all 17 IA-enumerated cases, `role="alert"` reserved for assertive errors only (A2-1 honored, my Phase 3 H9 spec held).
- **Heuristic citations on every component** — 14/14 cite the SCs they satisfy; my Phase 3 "each component documents its heuristics" expectation cleared.

**Compass AH-* fixes verified delivered in composition:**

- **AH-1 (mode picker human labels)** — `card.md` ModeCard has `technicalLabel` eyebrow + `humanLabel` H2 pair (per INDEX manifest line 24). Verified.
- **AH-2 (findings category primary)** — `findings-row.md` props list `category` as primary group, `reviewer` as secondary eyebrow. Verified.
- **AH-4 (SKU plain-English subtitle)** — `intake-2step.md` Step 2 audit-product chip reads *"AUDIT PRODUCT: SURFACE · audits the live site"*. Verified for intake. The SKU explainer cards on `landing.md` §3 also pass plain-English subtitles via `<Card variant="sku">` prop `plainEnglish`. Verified. **F4 calls out the one place AH-4 leaks (the SKU-mismatch banner copy).**
- **AH-5 (free-tier re-audit chip on verdict)** — `verdict-card.md` props include `freeTierChip` boolean; `verdict-fail.md` renders `FREE · UNLIMITED RE-AUDITS ON THIS PROJECT`. Verified.

**Motion-budget contract honored:**

- Verdict screen ships *minimal* motion: single 280ms fade-up on verdict reveal. Confirmed in `motion.md` §4.1 and `verdict-fail.md` §5. No motion-on-entry for score / findings list. PASS — my Phase 3 minimal-motion intent honored.
- Findings rows: expand/collapse 200ms; no per-row entry animation; no live-region firehose. PASS.
- Settings: zero motion beyond focus rings. PASS.

---

## 6. Phase-4 gate verdict (final)

**PASS WITH FIXES.**

- **Heuristic budget across 5 screens:** 5/5 PASS (one HB-4c carry-forward WARN unchanged from Phase 3 — Billing & Data at 7 panels; no regression).
- **Nielsen-10 across 5 screens:** 47 PASS / 3 WARN / 0 FAIL.
- **14 components vs heuristic-fitness:** 13 PASS / 1 FAIL (Sidebar items list, F1).
- **IA-D1 mode-aware intake filtering:** PASS.
- **Top fixes (in priority order):**
  1. **F1 (Critical)** Resolve Sidebar item-list contradiction. My vote: align Canvas Sidebar to HB-9a.
  2. **F2 (Major)** Add Help affordance to `<Nav variant="app">` (header right-cluster icon).
  3. **F3 (Major)** Confirm Sidebar `currentPath` matches exact route, not prefix.
  4. **F4 (Major)** Herald rewrites SKU-mismatch banner copy with plain-English subtitle (AH-4 enforcement).
  5. **F5 (Minor)** Landing Roster section collapse — defer to Phase 5 conversion work.

Phase 4 does not block on F2–F5; they're Phase 4.x or early Phase 5 fixes. **F1 must be resolved before Phase 5 begins** because Canon's drift-detector will fail on the first rendered page that mounts both Sidebar component and a screen that declares a different item set.

**Independent-reviewer bias check (self):** I produced HB-9a; the Canvas Sidebar diverged. I have judged the divergence on its merits (Canvas's Help-in-sidebar instinct has H10 merit) but recommended HB-9a wins because every screen already cites it. If the panel disagrees and prefers Canvas's *Projects · Audits · Settings · Help*, update HB-9a + every screen composition map together — don't ship the split.

---

*End of Phase 4 audit v0.1. Optic — Audit Layer. Verdict travels to Jury.*
