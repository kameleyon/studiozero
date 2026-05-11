# Screen — landing

**Route:** `/`
**Surface class:** Marketing, public, indexable. Cookie-consent gated for analytics.
**Owner:** Pixel (composition) · Canvas (components) · Herald (copy)
**Brand version:** Direction A v0.1.1 ("The Auditor's Notebook")
**Status:** Phase 4 hero-screen v0.1
**Reading order:** this file → `landing.jsx`

> **Origin.** This screen *refines* the existing landing baseline at `project-template/studiozero/project/Studio Zero - Landing.html` rather than replacing it. The template's structural skeleton (Nav · Hero · Modes · Team · Gate · Process · Footer) survives; the substance changes to match PRD v0.5 + Herald sample 01 + Canon's Direction A finding on the green pulse-dot.

---

## 1. Persona-fit notes (the 4 personas walking this screen)

| Persona | What they see first | Friction risk | This screen's answer |
|---|---|---|---|
| **P1 — Non-technical solo founder** | The H1 names the *pain* (their AI builder shipped accessibility failures) and the *receipt* ("line by line"). Single CTA. No jargon above the fold. | "Surface audit" — they don't yet know what that is. | Microcopy directly under CTA: *"Free Surface audit on a URL you own. No credit card."* And the SKU explainer section uses **plain-English subtitles** per Compass AH-4. |
| **P2 — Technical solo founder** | Secondary "See how it works" link earns the curious click. Footer references API key + CLI as peer options. | Will scroll for receipts; needs to see the agent roster and the rubric strip. | Below-fold Modes section names *BYOK · CLI · Managed*; Gate section names the 7 reviewers; rubric strip names severities. |
| **P3 — Indie agency** | Pricing footer reference shows **BYOK Pro $79 — Unlimited audits (any depth)**. | They will scan for "unlimited" and "team / multi-client." | Pricing section flags Pro tier; co-attribution and multi-project surfaces are V1.1 (AH-6 follow-up). |
| **P4 — Engineering lead** | Hero subhead's *"Connect your repo, pick a depth, get a graded checklist"* signals workflow fit. | Wants to know the runner is independent and the score is deterministic. | Below-fold Gate section emphasizes *"Auditors don't edit code. They flag, recommend, and verify fixes."* (already in template; preserved.) |

All four personas converge on the **single primary CTA** above the fold: *Run a free Surface audit →* (Herald sample 01 microcopy; Heuristic budget HB-1 = PASS at 2 choices).

---

## 2. Layout — desktop (≥1280px) / tablet (768px) / mobile (320–375px)

**Wrap:** `max-width: var(--wrap-max)` = 1280px; `padding-inline: var(--wrap-pad-x)` = 40px desktop, 20px mobile.

### Desktop (≥1280px)
```
┌──────────────────────────────────────────────────────────────────────┐
│  <Nav variant="marketing" scrolled>                                  │  60px sticky
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STUDIO STATUS · 56 AGENTS ONLINE  ·  v0.5 — AUDIT LAYER LIVE       │  mono-meta eyebrow
│                                                                      │
│  Your AI builder shipped code that fails                             │  H1 display-xl 108px
│  accessibility. We'll prove it — line by line.                       │  (Herald sample 01)
│                                                                      │
│  Studio Zero is the independent audit for AI-built software.         │  body-lg subhead 17px
│  Connect your repo, pick a depth, get a graded checklist —           │
│  every finding with a file path, a line range, and a fix.            │
│                                                                      │
│  ┌────────────────────────────────────┐  See how it works            │  HB-1: 1 primary + 1 secondary
│  │ Run a free Surface audit →         │                              │
│  └────────────────────────────────────┘                              │
│                                                                      │
│  Free Surface audit on a URL you own. No credit card.                │  microcopy below CTA
│  Email verification required.                                        │  (Herald sample 01)
│                                                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                              │  hero-stats serif-stat 56px
│  │  56  │  │  14  │  │   7  │  │   5  │                              │
│  │AGENT │  │LAYER │  │ AUDIT│  │ SEV. │                              │
│  └──────┘  └──────┘  └──────┘  └──────┘                              │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  01 · TWO MODES                                                      │
│  Build from a vision. Or audit what already ships.                   │
│                                                                      │
│  [ Mode A — Build ]   [ Mode B — Audit ]                             │  2-card row
├──────────────────────────────────────────────────────────────────────┤
│  02 · THE ROSTER                                                     │
│  Fourteen layers. Fifty-six specialists.                             │
│  [Director + 14 layer cards]                                         │
├──────────────────────────────────────────────────────────────────────┤
│  03 · THE AUDIT GATE                                                 │
│  An independent panel, against a fixed rubric.                       │
│  [Gate stage diagram + rubric strip]                                 │
├──────────────────────────────────────────────────────────────────────┤
│  04 · WHAT YOU GET — SKU PLAIN-ENGLISH (Compass AH-4)                │
│  [3-card SKU explainer: Surface / Code / Full]                       │
├──────────────────────────────────────────────────────────────────────┤
│  05 · PRICING (footer reference)                                     │
│  [3 above-fold cards: Free · BYOK Starter $29 · Managed Pro $249]    │
│  + See all plans → /pricing                                          │
├──────────────────────────────────────────────────────────────────────┤
│  <Footer> — legal links, AI System Card, accessibility statement     │
└──────────────────────────────────────────────────────────────────────┘
```

### Tablet (768px)
- Hero stays single-column; H1 drops from `display-xl` (108px) to `display-l` (64px).
- Modes section: 2 cards stack horizontally with reduced padding.
- Stats grid: 2×2 instead of 4×1.

### Mobile (320–375px)
- Nav collapses: logo + hamburger (no inline links). Auth CTAs in the hamburger drawer.
- H1 drops to `display-m` (44px) — guarantees no horizontal scroll at 320px (SC 1.4.10).
- Section padding switches to `--section-py-mobile` (96px) and `--wrap-pad-x-mobile` (20px).
- Stats grid: 2×2.
- Modes section: 1 card per row, stacked.
- Pricing: vertically stacked 3 cards; "See all plans →" anchored at bottom.
- **Reflow proof at 320px:** longest content string is the H1 ("Your AI builder shipped code that fails accessibility..."); at 44px it fits in 4 lines within 280px content width (320px – 2 × 20px padding).

---

## 3. Composition map — Canvas components + props

Every interactive element below is a Canvas component (or a flagged placeholder).

| Slot | Component | Props (interface contract) |
|---|---|---|
| Page chrome — top | `<Nav variant="marketing">` | `links: [{href, label}]`, `cta: {href, label, variant}`, `sticky: boolean`, `scrolled: boolean` (auto from scroll listener). Renders `<nav aria-label="Primary">`. |
| Hero eyebrow | `<Chip variant="mono-meta">` | `text: "STUDIO STATUS · 56 AGENTS ONLINE"`, `pulse: false` (Canon finding: no green dot; status indicator is mono-meta text only on landing v0.1.1) |
| Hero H1 | native `<h1>` inside `.hero` | Mixed inline: Geist sans + selected italicized phrases in `<em class="serif-it">` per `usage-rules.md` italic_phrase_rule |
| Hero subhead | native `<p class="hero-sub">` | body-lg 17px; ink-1 |
| Primary CTA | `<Button variant="primary" size="lg">` | `href: "/signup"`, `arrow: true`, `label: "Run a free Surface audit"`. Pill radius. |
| Secondary CTA | `<Button variant="ghost" size="lg">` | `href: "/how-it-works"`, `arrow: false`, `label: "See how it works"`. |
| Microcopy under CTA | native `<p class="hero-microcopy">` | body-sm 14px; ink-2 |
| Hero stats (×4) | `<Card variant="stat">` | `number: 56`, `label: "Specialist agents"`, `countUp: boolean`. Stat numerals use `serif-stat` 56px italic. |
| Modes section cards (×2) | `<Card variant="mode" interactive>` | `eyebrow`, `title`, `body`, `items: [{label, meta}]`, `cta: {href, label}`. The "mode visual" SVG is a child slot. |
| Roster layer cards | `<Card variant="layer">` | `name`, `lead`, `agents: [agentName]`, `count: number` |
| Gate stage diagram | `<Placeholder kind="svg" name="GateStageDiagram" />` | **Interface contract for Canvas:** rotating-orbit SVG; 7 auditor nodes around a Jury core; pure-decoration `aria-hidden="true"`. Honors `prefers-reduced-motion`: orbit animation stops. Component owns its motion; props = `auditors: string[]` (length 7) + `static: boolean` (reduced-motion fallback). |
| Rubric strip rows (×5) | `<Card variant="rubric-row">` | `severity: 'blocker'|'critical'|'major'|'minor'|'polish'`, `definition: string`, `action: string`. Token colors from `--sev-{severity}-text` / `--sev-{severity}-border`. |
| SKU explainer cards (×3) | `<Card variant="sku">` | `name: "Surface"`, `plainEnglish: "audits the live site"` (Compass AH-4), `bullets: string[]`, `priceFrom: string`, `cta: {href, label}` |
| Pricing strip (3 above-fold) | `<Card variant="pricing">` | `tier`, `price`, `cadence`, `features: string[]`, `recommendedBadge: boolean`, `cta: {href, label}`. Last row links to `/pricing` for full 7-tier table per HB-5 recommendation. |
| Footer | `<Nav variant="footer">` | `columns: [{heading, links: [{href, label}]}]`. Includes mandatory legal links: `/accessibility`, `/privacy`, `/terms`, `/aup`, `/ai-system-card`, `/dpa`, `/subprocessors`, `/dmca`. |
| Decorative overlays | `<div class="grain">`, `<div class="glow">` | Page-wide. `pointer-events: none`. Disabled under `prefers-reduced-motion`. |

---

## 4. State coverage per surface region

The landing is a public, stateless page — so most regions don't have data/loading/error states. The exceptions:

| Region | Loading | Data | Empty | Error |
|---|---|---|---|---|
| Stats counters | numerals 0 before IntersectionObserver fires | counts animate up | n/a | falls back to static numerals if `IntersectionObserver` unsupported |
| Nav scroll state | starts unscrolled | adds `.scrolled` class above 12px | n/a | n/a |
| Cookie consent banner | renders below `<body>` on first paint | three peer-weighted buttons (Accept all · Reject all · Customize) per HB-8 | n/a | n/a |
| Cursor glow | renders on mouse-move | follows pointer | n/a | disabled by `prefers-reduced-motion` |

No fetch dependencies on this route — Astro/Next can ship as static.

---

## 5. Motion notes (full motion budget per `usage-rules.md`)

This is the only screen in the Phase 4 hero set that earns the **full** motion budget. Choreography per `motion.md`:

- **Reveal stagger** on entry: each `.reveal` element animates 280ms transform + 380ms opacity, staggered 80ms per index (`--dur-medium`, `--dur-slow`, `motion.rules.reveal_stagger_per_index`).
- **Cursor glow** follows pointer with 0.08 lerp damping; disabled under `prefers-reduced-motion`.
- **Grain overlay** static (no animation).
- **Stat count-up** animates over 1400ms with eased cubic when the stats grid intersects viewport.
- **Ring pulse on gate stage** = 4–5s period (`motion.rules.ring_pulse_period`).
- **Marquee (agent names)** = 70s loop (`--dur-marquee`). Under `prefers-reduced-motion`: stops entirely.
- **Nav scrolled state**: 220ms ease (`--dur-default-transition` / `--ease`).

**Replaces:** Canon flagged the template's `#6dd07a` green pulse-dot on the nav CTA and hero status row. v0.1.1 replaces both with `var(--ink-0)` static dot OR drops the dot entirely on landing. **Implementation decision (locked here): drop the dot on the hero eyebrow row.** The "STUDIO STATUS · 56 AGENTS ONLINE" mono-meta text is sufficient signal; the dot was decorative and brand-non-compliant. Nav CTA pulse-dot stays as `var(--ink-0)` (or removed if Nav component doesn't ship with a dot affordance).

---

## 6. A11y notes — SCs satisfied and how

| SC | How it's satisfied on this screen |
|---|---|
| **1.4.1 Use of Color** | Verdict/severity colors in rubric strip carry text labels (BLOCKER · CRITICAL · MAJOR · MINOR · POLISH) — color is reinforcing, not load-bearing. |
| **1.4.3 Contrast Minimum** | Body text uses `--ink-1` (13.7:1 on `--bg-0`); microcopy uses `--ink-2` (6.8:1). Both clear AA body. No `--ink-3` body copy. |
| **1.4.10 Reflow** | Every section reflows at 320 CSS px without horizontal scroll (validated against H1 longest line at `display-m` 44px). Hero stats grid switches to 2×2. |
| **1.4.11 Non-text Contrast** | Focus rings on Nav links + buttons at 6.8:1 (`--focus-ring`). Card borders at `--line-1` are decorative; interactive cards (modes) use `--line-2` hover. |
| **1.4.12 Text Spacing** | All prose uses line-height + letter-spacing tokens; no fixed-height containers around prose. |
| **2.1.1 Keyboard** | All links, buttons, and the cookie banner reachable by Tab. Skip-to-content link at start of `<body>`. |
| **2.4.1 Bypass Blocks** | `<a href="#main" class="sz-skip-link">Skip to content</a>` at start of `<body>` (first focusable element). |
| **2.4.3 Focus Order** | Nav → Hero H1 (`tabindex="-1"`, programmatically focusable on route load) → Subhead → Primary CTA → Secondary CTA → microcopy → stats → section 01 → section 02 → … → Footer → cookie banner. |
| **2.4.4 Link Purpose** | "See how it works" / "See all plans" / footer links are self-describing; no "click here". |
| **2.4.6 Headings and Labels** | One `<h1>` ("Your AI builder shipped code that fails accessibility..."); section eyebrows are `<p class="eyebrow">`, section titles are `<h2>`. Hierarchy never skips a level. |
| **2.4.11 Focus Not Obscured** | Sticky nav max height 60px; `scroll-padding-top: 80px` global token guarantees focused targets remain visible. |
| **2.4.13 Focus Appearance** | 2px solid `--focus-ring` + 2px offset; both ring vs bg and ring vs adjacent guaranteed ≥3:1 by token spec. |
| **2.5.7 Dragging Movements** | No drag interactions on landing — N/A. |
| **2.5.8 Target Size** | Every Button + Nav link reserves ≥24×24 CSS px hit area (pill CTAs exceed by spec). |
| **2.3.3 Animation from Interactions** | All motion respects `prefers-reduced-motion` via the global media query in `_tokens/tokens.css`. |

### Traversal note

- Skip-link target: `<main id="main">` (entire hero + sections live inside `<main>`).
- Heading hierarchy: `<h1>` Hero · `<h2>` per section · `<h3>` inside cards · `<h4>` footer column titles.
- Landmark structure: `<header>` (nav) · `<main>` · `<footer>` · cookie banner as `<aside aria-label="Cookie preferences">` (non-modal landmark per HB-8 / `sitemap.md` §"Cookie/consent gating").
- Tab count to reach primary CTA from page load: Skip-link → Nav links (≤6) → Nav CTA → H1 (tabindex=-1, focusable on route entry only) → **Primary CTA**. At most 8 Tabs from cold load. Skip-link sends user straight to `<main>` for a 1-Tab path to the H1.

---

## 7. Open questions for Herald / Canvas

- **For Herald:** The SKU explainer section needs a one-line subtitle per SKU per Compass AH-4. Locked translations: *Surface · audits the live site* / *Code · audits the source code* / *Full · audits both*. **Confirm** these match Herald's intended brand-voice register before launch.
- **For Canvas:** The `<Card variant="sku">` interface doesn't appear on Canvas's 14-component list. Recommendation: extend `<Card>` with a `variant="sku"` slot (eyebrow + plain-English subtitle + bullets + priceFrom + CTA). Alternative: build as `<Card variant="default">` with composition; flag if the variant prop is needed.
- **For Canvas:** `<Nav variant="marketing">` and `<Nav variant="footer">` are sibling variants of the same primitive — confirm that's how Canvas's Nav is shaped (or if Footer needs its own component).
- **For Canvas:** `GateStageDiagram` SVG is rendered inline on the existing template; for Phase 4 should this be a Canvas-owned visual-utility component or stay inline as a `<Placeholder>` until a later phase?

---

*End of landing screen spec v0.1. Pixel — Design layer.*
