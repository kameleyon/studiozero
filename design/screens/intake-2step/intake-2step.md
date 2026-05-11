# Screen — intake-2step

**Route:** `/app/projects/new` (Step 1) and `/app/projects/new?step=2` (Step 2)
**Surface class:** App shell · `noindex, nofollow` · session+consent
**Owner:** Pixel (composition) · Canvas (components) · Herald (copy) · Optic (IA)
**Brand version:** Direction A v0.1.1
**Status:** Phase 4 hero-screen v0.1
**Heuristic budget:** HB-3 Step 1 = PASS (3 peers); HB-3 Step 2 = PASS (2 visible + 1 advanced disclosure)
**PRD reference:** §7.2 Step A + Step B

> **Why this is a hero.** Optic's Hick's-Law fix lives or dies on this surface. The 27-combination intake matrix collapses into **3 + (2 or 3) decisions in sequence**. The customer never sees the matrix. This screen also implements Compass AH-4 (SKU plain-English subtitles) and the Halo focus-restoration contract for back-from-Step-2.

---

## 1. Persona-fit notes

| Persona | Step 1 friction | Step 2 friction | Answer on this screen |
|---|---|---|---|
| **P1 — Non-technical solo founder** | "What do you have?" is recognition-language, not jargon. The "Paste a URL you own" card has equal visual weight to the GitHub card (Compass AH-3 fix). | "How deep?" with Quick pre-selected. Advanced disclosure is collapsed — no overwhelm. | Header chip surfaces the **product** the picker just derived (e.g., "AUDIT PRODUCT: SURFACE · audits the live site") with the plain-English subtitle per Compass AH-4. |
| **P2 — Technical solo founder** | GitHub repo card carries the per-repo permissions explanation in-line (AH-3 fix). | Expands Advanced to confirm they can subset reviewers per PRD §9.3. | Custom reviewer multi-select is keyboard-operable per Halo A3-3 (kebab/menu pattern applies to the expander). |
| **P3 — Indie agency** | Picks "Paste a URL you own" most often. They use BYOK Pro — no SKU friction. | Default Quick = 10-min run, ships fast. | Optional client-tag field at Step 1 (Compass AH-6 minimum) so projects group later. |
| **P4 — Engineering lead** | Picks GitHub repo. | Comprehensive depth surfaces as a one-click upgrade chip. | "Save and run later" preserves the draft per Trace S7. |

---

## 2. Layout — desktop / tablet / mobile

### Desktop — Step 1 (≥1280px)
```
┌─────────────┬────────────────────────────────────────────────────────┐
│             │   STEP 01 · INTAKE · CHOOSE WHAT YOU HAVE              │
│  Sidebar    │   ◐──── ◯ ──── ◯                                       │  3-step progress (OPT-Polish#1)
│             │                                                        │
│  Dashboard  │   What do you have?                                    │  H1 display-m 44px
│  Projects   │                                                        │
│  New audit  │   We'll pick the audit product for you. You can        │  body subhead
│  Settings   │   change your mind on the next step.                   │
│             │                                                        │
│             │   ┌──────────────────┐ ┌──────────────────┐ ┌────────┐ │  3 peer cards (HB-3 step 1)
│             │   │ GitHub repo      │ │ Paste a URL      │ │ Local  │ │
│             │   │                  │ │ you own          │ │ folder │ │
│             │   │ One-repo install │ │ Free Surface on  │ │ CLI    │ │
│             │   │ Read-only        │ │ a URL you own.   │ │ only   │ │
│             │   │ Source-readable  │ │ Email-verified.  │ │        │ │
│             │   │                  │ │                  │ │        │ │
│             │   │ Pick this →      │ │ Pick this →      │ │ Pick → │ │
│             │   └──────────────────┘ └──────────────────┘ └────────┘ │
│             │                                                        │
│             │   ── advanced ─────────────────────────────────────    │
│             │   Optional · Client tag for this project:              │
│             │   ┌──────────────────────────────────┐                 │  optional tag input
│             │   │  e.g. Acme Co.                   │                 │  (Compass AH-6 minimum)
│             │   └──────────────────────────────────┘                 │
│             │                                                        │
│             │   ← Back to dashboard           Save and continue →    │  back + forward
│             │                                                        │
└─────────────┴────────────────────────────────────────────────────────┘
```

### Desktop — Step 2 (≥1280px)
```
┌─────────────┬────────────────────────────────────────────────────────┐
│             │   STEP 02 · INTAKE · CHOOSE DEPTH                      │
│  Sidebar    │   ◉──── ◐ ──── ◯                                       │  step 2 active
│             │                                                        │
│             │   AUDIT PRODUCT: SURFACE · audits the live site        │  Compass AH-4 chip
│             │                                                        │
│             │   How deep?                                            │  H1 display-m 44px
│             │                                                        │
│             │   Quick is the default for most first audits.          │  body subhead
│             │                                                        │
│             │   ┌──────────────────────┐ ┌──────────────────────┐    │  2 visible peers
│             │   │ ● Quick (default)    │ │ ○ Comprehensive      │    │
│             │   │   10–15 min          │ │   20–45 min          │    │
│             │   │   Optic, Halo, Proof │ │   All 6 reviewers    │    │
│             │   │                      │ │   + Jury synthesis   │    │
│             │   └──────────────────────┘ └──────────────────────┘    │
│             │                                                        │
│             │   ► Advanced — pick reviewers individually             │  collapsed disclosure
│             │                                                        │
│             │   ← Back (preserves Step 1 state)    Start audit →     │
│             │                                                        │
└─────────────┴────────────────────────────────────────────────────────┘
```

### Tablet (768px)
- Sidebar collapses to icon rail.
- Step-1 3 cards stay in a row (slim padding); Step-2 2 cards remain side-by-side.
- Step indicator: 3 numbered dots in a row.

### Mobile (320–375px)
- Sidebar collapsed; hamburger.
- H1 drops to `h-card` (38px).
- Step-1 cards stack vertically.
- Step-2 cards stack vertically; the "● Quick" radio uses a real `<input type="radio">` for keyboard ergonomics.
- Back + forward buttons stack: forward CTA is full-width on top; back link below.
- "Advanced" disclosure expands to a vertical checkbox list when opened.

---

## 3. Composition map — Canvas components + props

### Step 1: "What do you have?"
| Slot | Component | Props |
|---|---|---|
| Page eyebrow | `<Chip variant="mono-meta">` | `STEP 01 · INTAKE · CHOOSE WHAT YOU HAVE` |
| Step indicator | `<Placeholder kind="component" name="StepIndicator" />` | **Interface contract:** 3-step progress dots with `aria-current="step"` on active; `aria-label` per step ("Step 1 of 3: intake"). Not in Canvas's 14 — flag for v0.2. |
| H1 | native `<h1 tabindex="-1">` | "What do you have?" (Optic OPT-C1 recognition language) |
| Subhead | native `<p>` | "We'll pick the audit product for you. You can change your mind on the next step." (Open question for Herald — locked phrasing not yet in samples.) |
| Intake cards (×3) | `<Card variant="default" interactive>` | `heading`, `body`, `mono` (per-mode availability), `cta`. CLI-mode users see GitHub card disabled with `aria-disabled="true"` + helper text "Local folders only in CLI mode" (Trace S6 lock). |
| Tag input | `<Input>` (Canvas) | `label: "Optional · Client tag for this project"`, `placeholder: "e.g. Acme Co."`, `name: "client_tag"`, `autoComplete: "off"`. Compass AH-6 minimum-MVP for P3. |
| Back link | `<Button variant="ghost" size="md">` | `href: "/app", label: "Back to dashboard"` |
| Forward CTA | `<Button variant="primary" size="lg">` | `label: "Save and continue", arrow: true`. Disabled until a peer is selected; disabled state has accessible name per HC1. |

### Step 2: "How deep?"
| Slot | Component | Props |
|---|---|---|
| Page eyebrow | `<Chip variant="mono-meta">` | `STEP 02 · INTAKE · CHOOSE DEPTH` |
| Audit-product chip | `<Chip variant="mono-meta" tone="emphasis">` | `AUDIT PRODUCT: SURFACE · audits the live site` — **Compass AH-4 critical fix**. Plain-English subtitle is non-negotiable. |
| H1 | native `<h1 tabindex="-1">` | "How deep?" |
| Subhead | native `<p>` | "Quick is the default for most first audits." |
| Depth peers (×2) | `<Form>` wrapping `<input type="radio">` cards | Quick (pre-selected) / Comprehensive. Both are `<Card>` visually but the `<input>` is the load-bearing primitive (SC 4.1.2). |
| Advanced disclosure | `<Placeholder kind="component" name="Disclosure" />` | **Interface contract:** `<details>`/`<summary>` semantics; expanded state preserved on back-nav; reviewer multi-select inside is a `<Form>` `<input type="checkbox">` group with 6 reviewers. Not in Canvas's 14 — flag. |
| Back link | `<Button variant="ghost" size="md">` | `onClick: navigateBackPreservingStep1State`. Halo HC focus-restoration: focus moves to whichever Step-1 card was previously selected. |
| Start CTA | `<Button variant="primary" size="lg">` | `label: "Start audit", arrow: true` — Locked from Herald sample 02 (microcopy reference set). |
| SKU mismatch banner | `<Placeholder kind="component" name="SoftWarningBanner" />` | When user picks Comprehensive on free-tier Surface intake, surfaces an inline `role="status"` banner: "Comprehensive needs the Code SKU. Upgrade, or run Quick on Surface." Per Trace S7. |

---

## 4. State coverage per surface region

### Step 1
| Region | Loading | Data | Empty | Error |
|---|---|---|---|---|
| Intake cards | static | 3 cards rendered; selection state in URL query (`?intake=github`) | n/a | If GitHub App not installed → card body changes to "Install the app to enable this option" + secondary link to `/auth/install/github`. |
| Client-tag input | n/a | text input | placeholder visible | Field-level error rare (free text) |
| Forward CTA | n/a | enabled when selection made | disabled with `aria-disabled="true"` when no selection | n/a |

### Step 2
| Region | Loading | Data | Empty | Error |
|---|---|---|---|---|
| Audit-product chip | derived synchronously from Step-1 selection | renders SKU name + plain-English subtitle | n/a | If derivation failed (rare race) → back to Step 1 with error banner |
| Depth radios | Quick pre-selected | radios | n/a | n/a |
| Advanced disclosure | collapsed | 6-reviewer checklist when expanded | All-off forbidden — at least 1 reviewer must be selected (form validation) | inline error using `aria-describedby` on the fieldset |
| Soft warning banner | n/a | hidden by default | renders when Comprehensive + Surface combo selected | n/a — it's the error state itself |

---

## 5. Motion notes

Per Direction A: **app shell = reduced motion**.
- **Card hover:** 380ms transform (`--dur-slow`).
- **Card selection state:** instant; no animation.
- **Step indicator transition:** 200ms fill-color tween on the active dot.
- **Advanced disclosure expand/collapse:** 200ms `ease` (`--dur-fast`). Honors `prefers-reduced-motion`: collapses to instant.
- **Forward CTA enabled state:** 120ms opacity (`--dur-instant`).

Choreography reference: `motion.md` §"Findings expand/collapse" (same primitive applies here).

---

## 6. A11y notes — SCs satisfied and how

| SC | How |
|---|---|
| **1.4.3 Contrast** | All body in `--ink-1` / `--ink-2`. Disabled card state uses `--ink-3` on `--bg-3` — but disabled controls are exempt from SC 1.4.3 minimums (WCAG 2.2 explicit exception). |
| **1.4.10 Reflow** | Step-1 cards stack vertically at 320px; Step-2 radios stack at 320px. |
| **1.4.11 Non-text Contrast** | Selected-card state uses border `--line-3` (1.4:1 — decorative only) PLUS text label "Selected" PLUS `aria-checked` — color is reinforcing, not load-bearing (HC1). |
| **2.1.1 Keyboard** | Tab order Step 1: eyebrow → step indicator (focusable: false) → H1 → intake card 1 → 2 → 3 → tag input → back link → forward CTA. Arrow keys move between intake cards when one is focused (radiogroup pattern). |
| **2.1.2 No Keyboard Trap** | Advanced disclosure does not trap focus — Tab exits to the back link. |
| **2.4.3 Focus Order** | Route entry programmatically focuses `<h1 tabindex="-1">`. After Step 1 selection, forward-nav to Step 2 focuses the Step-2 `<h1>`. Back-from-Step-2 focuses the **previously selected intake card** (Halo HC focus-restoration; Step-1 state preserved in URL query). |
| **2.4.6 Headings** | One `<h1>` per step. Card titles are `<h3>`. |
| **2.4.11 Focus Not Obscured** | Sticky header + scroll-padding-top: 80px. |
| **2.4.13 Focus Appearance** | 2px ring + 2px offset. |
| **2.5.8 Target Size** | Intake cards exceed 24×24 (full card is the hit target via the `<Card interactive>` primitive). |
| **3.3.1 Error Identification** | Soft warning banner uses `role="status"`. Form validation on the Advanced multi-select uses `aria-describedby` linking the error message to the fieldset; field-level error styling adds `aria-invalid="true"`. |
| **3.3.2 Labels or Instructions** | Tag input has visible `<label>`. Depth radios are inside a `<fieldset>` with `<legend>` "How deep?". Advanced multi-select fieldset has legend "Pick reviewers". |
| **3.3.7 Redundant Entry** | Step-1 selection auto-fills Step-2 derivations. Going back never re-prompts the user for what they already chose. |

### Traversal note

- Skip-link target: `<main id="main">`.
- Heading hierarchy: `<h1>` per step · `<h3>` per intake card · `<legend>` for radio/checkbox groups (semantically equivalent to `<h2>` for screen readers within the fieldset).
- Landmark structure: `<header>` (app nav) · `<nav aria-label="Primary">` · `<main>` · no footer.
- Step navigation is **routed**, not modal — back-button works per H3 (Optic).
- Tab count Step 1 → forward: skip → H1 → card → forward CTA = **3 Tabs**. Step 2 → start: skip → H1 → Quick radio (default) → Start CTA = **3 Tabs**.

---

## 7. Open questions for Herald / Canvas

- **For Herald:** Subhead copy "We'll pick the audit product for you. You can change your mind on the next step." is invented for this screen. Confirm in-voice or rewrite.
- **For Herald:** Soft warning banner copy on the SKU-mismatch case — "Comprehensive needs the Code SKU. Upgrade, or run Quick on Surface." — paraphrased from Trace S7. Confirm or graduate it into a brand sample.
- **For Canvas:** `<StepIndicator>` and `<Disclosure>` are not on the 14-component list. Both are foundational; recommend they ship in Canvas v0.2 or as variant-extensions of `<Nav>` (for step indicator) and `<Form>` (for disclosure).
- **For Canvas:** `<Card interactive>` as a radio peer — confirm `<Card>` can be the visual wrapper for a `<input type="radio">` without breaking the radiogroup semantics. Recommended pattern: hidden native `<input>`, label wraps the `<Card>`, `<Card>` reads `aria-checked` from the input state.
- **For Optic / Trace:** Client-tag field at Step 1 — should it be optional-and-skippable as drafted, or surface as a peer chip on the project create form proper (`/app/projects/[id]/settings`) so the intake stays minimal? My read: keep it optional here; advanced agency users will look for it on intake.

---

*End of intake-2step screen spec v0.1. Pixel — Design layer.*
