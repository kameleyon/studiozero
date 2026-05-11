# Screen — verdict-fail

**Route:** `/app/audits/[run-id]` (when verdict resolved to `FAIL`, current SKU = `Surface`)
**Surface class:** App shell · `noindex, nofollow` · session+consent
**Owner:** Pixel (composition) · Canvas (components) · Herald (copy locked, every word)
**Brand version:** Direction A v0.1.1
**Status:** Phase 4 hero-screen v0.1
**PRD lock:** §7.2 Step D (Herald + Hook + Optic + Halo locked v0.4)
**Heuristic budget:** HB-7 = PASS (1 primary CTA above the fold)
**Empty-state catalog:** N/A — this is a populated state. See `ES-AUDIT-VERDICT-ZERO-FINDINGS` for the PASS-clean variant.

> **The single most contested string in the product.** Every word of body copy below MUST match `brand/samples/03-fail-verdict-body.md` exactly. Pixel will not re-grade Herald's copy; Pixel composes Canvas's components around it. Score variant in this prototype: **68 / 100** (the prompt-specified hero example). Herald sample 03 uses **58 / 100** as its example score — both are valid FAIL scores; the *frame* is identical and only the numeric varies per run. The locked strings are independent of the score.

> **Activation surface.** PRD §15: the verdict screen is the activation moment for ≥70% of customers. The verdict screen is the brand. This screen is rendered as designed; later screens can flex.

---

## 1. Persona-fit notes

| Persona | What they read | Risk this screen mitigates |
|---|---|---|
| **P1 — Non-technical solo founder** | Verdict line · score · two sentences (Herald sample 03 above-fold). Plain-English CTA. | Punitive register collapses morale → churn. Herald's "*Most first audits do not pass our gate — that's the design*" reframes from *I failed* to *the gate is strict*. |
| **P2 — Technical solo founder** | Above-fold + 14-row findings checklist grouped by category (Compass AH-2 fix). | They want receipts. Each finding row carries file path + line range + recommended fix per PRD §7.2 + Herald sample 03 per-finding frame. |
| **P3 — Indie agency** | Reads as a deliverable. Export-report secondary CTA always available. | Their client wants the PDF. Export is one click. |
| **P4 — Engineering lead** | Score breakdown table (radar + `<table>` fallback) lets them assess vs internal targets. | Need defensible numbers. PRD §9.2 + HC3: chart + semantic table sibling. |

---

## 2. Layout — desktop / tablet / mobile

### Desktop (≥1280px)
```
┌─────────────┬────────────────────────────────────────────────────────┐
│             │  ───── verdict region · #C8421A bg · 1px #5a2828 frame │
│  Sidebar    │                                                        │
│             │  ⚠  Audit complete · FAIL                              │  h1 display-l 64px, role="status"
│             │                                                        │
│             │  Score: 68 / 100                                       │  serif-stat 56px italic
│             │  ───── neutral bg below this hairline                  │
│             │                                                        │
│             │  FREE · UNLIMITED RE-AUDITS ON THIS PROJECT            │  Compass AH-5 chip
│             │                                                        │
│             │  We found 14 issues across UX, accessibility,          │  body-lg 17px ink-1
│             │  and brand consistency. Here's every one, with         │  (Herald sample 03 locked)
│             │  the evidence.                                         │
│             │                                                        │
│             │  Most first audits do not pass our gate — that's       │
│             │  the design. Every finding below names a file, a       │
│             │  line, and a fix.                                      │
│             │                                                        │
│             │  ┌─────────────────────────────────┐ Export report     │  HB-7: 1 primary + secondary text
│             │  │ Run the Code audit →            │                   │
│             │  └─────────────────────────────────┘                   │
│             │                                                        │
│             │  ── score breakdown ───────────────────────────────    │
│             │  [ radar chart (decorative)  ]  [ semantic table   ]   │  HC3
│             │                                                        │
│             │  ── 14 findings, grouped by severity. Expand any       │
│             │     row for the evidence and the recommended fix.      │
│             │                                                        │
│             │  Blockers (2) · Critical (4) · Major (5) ·             │  Herald sample 03 separator dots
│             │  Minor (3) · Polish (0)                                │
│             │                                                        │
│             │  ┌──────────────────────────────────────────────────┐  │  per-finding row × N
│             │  │ [BLOCKER] [HALO] [F-007] Form labels missing     │  │  (Compass AH-2:
│             │  │                                                  │  │   group by CATEGORY,
│             │  │ What we found ↓                                  │  │   reviewer name as
│             │  │ Why it matters ↓                                 │  │   secondary metadata)
│             │  │ The fix ↓                                        │  │
│             │  │                                                  │  │
│             │  │ [Copy fix]  [Mark won't-fix]  ⋯                  │  │
│             │  └──────────────────────────────────────────────────┘  │
│             │                                                        │
└─────────────┴────────────────────────────────────────────────────────┘
```

### Tablet (768px)
- Sidebar → icon rail.
- Score breakdown switches from 2-column (chart + table) to stacked (chart, then table).
- Findings rows full-width.

### Mobile (320–375px)
- Sidebar → hamburger.
- Verdict region: H1 drops to `display-m` (44px). Score drops to `h-card` (38px italic).
- Primary CTA full-width. Secondary text-link below.
- Findings rows compact: severity + reviewer chips wrap below the title at 320px.
- Radar chart hidden under `prefers-reduced-motion` reasoning? No — chart stays visual; `<table>` is the semantic sibling for AT. Both render.
- Reflow proof at 320px: longest above-fold sentence ("Every finding below names a file, a line, and a fix.") fits in 4 lines at 17px body-lg within 280px content width.

---

## 3. Composition map — Canvas components + props

| Slot | Component | Props (interface contract) |
|---|---|---|
| App header | `<Nav variant="app">` | (same as dashboard-first-run) |
| Sidebar | `<Sidebar>` | `aria-current` on Projects (this run belongs to a project). HB-9a 4 items. |
| Verdict region | `<VerdictCard variant="fail">` | **Canvas component, on the 14-list.** Props: `verdict: 'FAIL'`, `score: 68`, `total: 100`, `watermark?: 'private-run' | null`, `children?` (slot for the free-tier chip below the score). Renders verdict line as `<h1 role="status">` per PRD §7.2 Step D + HC1 / SC 4.1.3. Color + icon + text per SC 1.4.1. |
| Free-tier chip (Compass AH-5) | `<Chip variant="free-tier">` | `text: "FREE · UNLIMITED RE-AUDITS ON THIS PROJECT"`. Tone is `--ink-2` on `--bg-3` per token system; chip is never the only signal — the word *FREE* is the signal. |
| Body — first paragraph (locked) | native `<p class="verdict-body">` | Locked: *"We found 14 issues across UX, accessibility, and brand consistency. Here's every one, with the evidence."* |
| Body — second paragraph (locked) | native `<p class="verdict-body">` | Locked: *"Most first audits do not pass our gate — that's the design. Every finding below names a file, a line, and a fix."* |
| Primary CTA | `<Button variant="primary" size="lg">` | `href: "/app/audits/[run-id]/upgrade"`, `arrow: true`, `label: "Run the Code audit"`. **Herald E2 hook lock** (sample 02 §2). |
| Secondary CTA | `<Button variant="ghost" size="md">` or link | `label: "Export report"`. (Herald sample 02 §5 microcopy reference; not "Export the report" — that variant is for the dashboard.) |
| Score breakdown | `<ScoreDisplay variant="radar-with-table">` | **Canvas component, on the 14-list.** Props: `categories: [{name, score}]` (length 6: UX, Accessibility, Copy, Brand, Flow, Audience), `total: 68`, `viewMode: 'both'`. HC3-compliant: renders both a decorative `<svg>` radar AND a semantic `<table>` (not `aria-hidden`). |
| Findings preamble | native `<p class="findings-intro">` | Locked: *"14 findings, grouped by severity. Expand any row for the evidence and the recommended fix."* |
| Severity group counts | native `<p class="severity-counts">` | Locked: *"Blockers (2) · Critical (4) · Major (5) · Minor (3) · Polish (0)"* — middle-dot separator per brand. |
| Findings list wrapper | `<Table variant="findings-list" role="treegrid">` or `<section>` | HC8 `treegrid` pattern for the timeline; for the findings list a `<section role="region">` with grouped child rows works (groups are `<h3>` per category or per severity). **Compass AH-2 fix:** default grouping is **by category** (Accessibility · UX · Copy · Brand · Flow · Audience), reviewer name renders as a secondary chip per row. Severity group also available via the toolbar control (HB-6a). |
| Per-finding row | `<FindingsRow>` | **Canvas component, on the 14-list.** Props: `severity`, `reviewer`, `findingId`, `title`, `category` (primary group per Compass AH-2), `whatWeFound`, `whyItMatters`, `fix`, `expanded`, `onToggle`, `onCopyFix`, `onWontFix`. Expand/collapse animation 200ms ease (`--dur-fast`); collapses to instant under `prefers-reduced-motion`. |
| Findings toolbar (HB-6a) | `<Placeholder kind="component" name="FindingsToolbar" />` | **Interface contract:** 3 controls (Filter / Group / Sort). Group default = category (Compass AH-2). 3 peers = HB-6a PASS. Not on Canvas's 14 — flag for v0.2 of Canvas. |

---

## 4. State coverage per surface region

| Region | Loading | Data | Empty | Error |
|---|---|---|---|---|
| Verdict region | skeleton (`<div class="sz-skeleton">`) ≤500ms during SSR hydration | populated as spec'd | n/a — this screen only renders when verdict resolved | If verdict failed irrecoverably: redirect to `ES-AUDIT-FAILED-IRRECOVERABLY` per `empty-states.md` |
| Free-tier chip | hidden until tenant plan loads | renders if `plan === 'free' && project.surface_reaudits === 'unlimited'` | hidden on paid plans | hidden on error |
| Score breakdown | skeleton ≤500ms | radar + table render with 6 categories | If `findings.length === 0` → all-spokes-maxed radar + table all 100s (PASS state); not this screen | hidden if score derivation failed |
| Findings list | skeleton list of 5 rows ≤500ms | populated with N rows | `findings.length === 0` → render the PASS-clean copy (different screen). Filtered-to-zero state delegates to `ES-FINDINGS-FILTERED-TO-ZERO` | per-row error: row carries an inline `role="alert"` if its fix snippet failed to render |
| Findings toolbar | hidden during skeleton | filter chips render; "Clear filters" link surfaces when filters active | n/a | n/a |

---

## 5. Motion notes (minimal budget per `usage-rules.md`)

**Verdict screen = "Minimal"** per Direction A motion-appropriateness table. *The verdict is the content; motion is a distraction.*

- **Verdict reveal on entry:** single 280ms fade-up (`--dur-medium`, `--ease-out`). No stagger, no slide.
- **No cursor glow** on verdict screens.
- **No grain animation** (static overlay only).
- **Findings expand/collapse:** 200ms `ease` (`--dur-fast`). Collapses to instant under `prefers-reduced-motion`.
- **Score breakdown:** chart renders static — no entry animation, no radar-spoke draw.
- **Toolbar filter chip changes:** instant; no transition.

Choreography reference: `motion.md` §"Verdict reveal" + §"Findings expand/collapse".

---

## 6. A11y notes — SCs satisfied and how

| SC | How |
|---|---|
| **1.1.1 Non-text Content** | Radar chart `aria-hidden="true"` (decorative); semantic `<table>` is the AT surface (HC3). Severity icons inside findings carry alt-text via `aria-label` on the wrapper chip. |
| **1.3.1 Info and Relationships** | Verdict header is `<h1>`; score is its sibling `<p>` not a heading; findings preamble is `<p>`; severity counts are a `<p>`; per-finding rows use `<article role="article">` with internal `<h3>`. Table for score breakdown has `<th scope="col"|"row">`. |
| **1.4.1 Use of Color** | Verdict region uses `#C8421A` background AND alert-triangle icon AND `FAIL` text. Severity chips inside rows use color + label. No color-only signals. |
| **1.4.3 Contrast** | Verdict text `--verdict-on-fail` (#f3f3f4) on `#C8421A`: 5.4:1 (clears AA body large). Body below verdict region uses `--ink-1` on `--bg-0`: 13.7:1. |
| **1.4.10 Reflow** | All sections reflow at 320 CSS px. Verdict region's H1 drops to `display-m` 44px. |
| **1.4.11 Non-text Contrast** | Verdict-region frame `#5a2828` on `#050506`: 2.0:1 — acceptable as decorative hairline because the verdict text + icon + bg-color triplet carries the meaning (SC 1.4.1 reinforcement). |
| **2.1.1 Keyboard** | Every finding row's expand toggle, "Copy fix", and "Mark won't-fix" actions reachable by Tab. Kebab-menu pattern per Halo A3-3 (`aria-haspopup="menu"`, arrow-key nav, Esc-close, focus-return to button). |
| **2.4.3 Focus Order** | Route entry on verdict-resolved: programmatically focus the verdict `<h1>` (per HC1 + SC 4.1.3) for SR announcement. First Tab moves to primary CTA. Findings rows tab in document order. |
| **2.4.6 Headings** | One `<h1>` (verdict line). `<h2>` for "Score breakdown" and "Findings". `<h3>` per category group. `<h4>` per finding (or `<h3>` if no category grouping). |
| **2.4.11 Focus Not Obscured** | Sticky app header + scroll-padding-top: 80px. |
| **2.4.13 Focus Appearance** | 2px ring + 2px offset per token. |
| **2.5.7 Dragging Movements** | Findings list reorder (rare in MVP — Phase 4 ships static order): non-drag alternative is the kebab menu's "Move to…" option (Halo A3-3 / SC 2.5.7). |
| **2.5.8 Target Size** | All Buttons + expand toggles + kebab buttons reserve ≥24×24. |
| **3.2.4 Consistent Identification** | The phrase *"Run the Code audit →"* appears identically on this verdict screen, in E2 email, in `/app/audits/[run-id]/upgrade`, and in any future PR-body upsell — same label, same arrow. |
| **4.1.2 Name, Role, Value** | Verdict header has `role="status"` (PRD §7.2 Step D explicit) — the one place where `<h1>` carries `role="status"` correctly (Halo A2-1: SPA renders same route URL pre- and post-finalization). |
| **4.1.3 Status Messages** | Verdict-region announces on SPA transition from running → resolved. Toast for "Fix copied to clipboard" uses `role="status" aria-live="polite"`. |

### Traversal note

- Skip-link target: `<main id="main">`.
- Heading hierarchy: `<h1 role="status">` "Audit complete · FAIL" · `<h2>` Score breakdown · `<h2>` Findings · `<h3>` per severity-or-category group · `<h4>` per finding.
- Landmark structure: `<header>` (app nav) · `<nav aria-label="Primary">` (sidebar) · `<main aria-labelledby="verdict-h1">` · `<section aria-labelledby="score-h2">` · `<section aria-labelledby="findings-h2">`.
- Tab count from cold load to primary CTA: skip → H1 (focused on route entry) → primary CTA = **2 Tabs**.

---

## 7. Locked-copy receipts (every word audited)

The following strings are quoted directly from `brand/samples/03-fail-verdict-body.md`. If any rendered string in `verdict-fail.jsx` differs from these (other than the score numeric), it is a Critical Canon finding.

- Verdict line: `Audit complete · FAIL`
- Score line: `Score: 68 / 100` *(template; numeric varies per run)*
- First body paragraph: `We found 14 issues across UX, accessibility, and brand consistency. Here's every one, with the evidence.`
- Second body paragraph: `Most first audits do not pass our gate — that's the design. Every finding below names a file, a line, and a fix.`
- Primary CTA (Surface SKU → FAIL): `Run the Code audit →`
- Secondary CTA: `Export report` *(microcopy reference set, sample 02 §5)*
- Findings preamble: `14 findings, grouped by severity. Expand any row for the evidence and the recommended fix.`
- Severity group line: `Blockers (2) · Critical (4) · Major (5) · Minor (3) · Polish (0)`
- Compass AH-5 chip: `FREE · UNLIMITED RE-AUDITS ON THIS PROJECT` *(open question for Herald — placeholder pending sample 07; flagged below.)*

### Banned strings (must not appear)

Per Herald sample 03 §"What this screen does *not* say":
- *Your product failed.*
- *Oh no.* / *Yikes.* / *Don't panic.*
- *Failed.* (standalone in body)
- *We're sorry.* / *Apologies.*
- *Don't worry, we can fix it.*
- *Click here.*
- *Congratulations!*
- Any `!` exclamation mark.
- Any emoji.

Canon will fail Phase 4 if any banned string appears in the rendered DOM of this screen.

---

## 8. Open questions for Herald / Canvas

- **For Herald (open question, flag for sample 07):** The Compass AH-5 free-tier chip currently reads `FREE · UNLIMITED RE-AUDITS ON THIS PROJECT`. Confirm the brand-voice register (uppercase mono-meta with middle dots matches the eyebrow grammar) or rephrase. The chip is critical to the D2 dopamine loop and currently has no sample-locked phrasing.
- **For Canvas:** `<VerdictCard>` is on the 14-list. Confirm the `children` slot accepts an arbitrary node so the AH-5 free-tier chip can render directly under the score line without breaking the score-card composition.
- **For Canvas:** `<FindingsRow>` and `<Table>` (treegrid variant) interface contracts — confirm both ship with the keyboard-nav + ARIA semantics Halo's A1-1 + A3-3 fix demand.
- **For Optic:** Compass AH-2 default group = **category, not reviewer**. The `<FindingsToolbar>` exposes a Group control with both options. Phase 4 default is `category`. Confirm this matches Optic's final IA spec; if not, flag before Canon audit kickoff.

---

*End of verdict-fail screen spec v0.1. Pixel — Design layer. Locked-copy lines above are receipts.*
