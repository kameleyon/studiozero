# Screen — dashboard-first-run

**Route:** `/app` (when `count(projects) === 0`)
**Surface class:** App shell · `noindex, nofollow` · session+consent for analytics
**Owner:** Pixel (composition) · Canvas (components) · Herald (copy)
**Brand version:** Direction A v0.1.1
**Status:** Phase 4 hero-screen v0.1
**Empty-state catalog ID:** `ES-DASHBOARD-FIRST-RUN` (see `ia/empty-states.md`)
**Heuristic budget:** HB-9a (sidebar = 4 items: Dashboard · Projects · New audit · Settings)

> **Why this is a hero.** BUILD_FLOW.md Phase 3 lesson #2: *"First-run empty state is the highest-leverage onboarding moment. Treat it as a hero design surface."* The dashboard at zero is the activation moment. It earns the same hierarchy as the landing hero — single H1, single body, single CTA, restrained motion.

---

## 1. Persona-fit notes

| Persona | What they see | Friction risk | This screen's answer |
|---|---|---|---|
| **P1 — Non-technical solo founder** | "You're in." card with one CTA. Sidebar has 4 named links — no jargon. | Without context they may not know what a "Surface audit" runs against. | Below-fold 3-card explainer (*Connect a repo · Paste a URL · Run reviewers*) clarifies the three intake methods in plain words — no SKU vocabulary above the fold. |
| **P2 — Technical solo founder** | "Run your free Surface audit →" CTA reads as the next-step contract from the landing CTA. Mode chip in header shows BYOK · GitHub connected — sets the workflow. | Wants to know they're in BYOK mode and where the API key is. | Header status row shows: `MODE: BYOK · KEY VALIDATED · NO RUNS YET`. Settings deep-link surfaces in the secondary CTA. |
| **P3 — Indie agency** | Same screen, but ideally would land on a multi-client overview. Known constraint (AH-6); flagged. | "I have 8 clients; show me at-a-glance" — not addressed at MVP. | Surface the open Compass AH-6 question via copy: *"One project? Start here. Multiple clients? Tag them when you create a project."* (Open question for Herald; placeholder copy below.) |
| **P4 — Engineering lead** | Reads as a clean activation moment; no team affordance shown. | Wants to share / assign — none of that exists yet (AH-7). | Acknowledged constraint; not addressed on this screen. Settings team route remains a V2 placeholder. |

The screen is single-purpose: convert *I just signed up* into *I just dispatched my first audit*. Herald sample 02 §"In-app CTA" voice applies: sentence case, no trailing period on button, single arrow glyph, grade 8.

---

## 2. Layout — desktop / tablet / mobile

### Desktop (≥1280px)
```
┌─────────────┬────────────────────────────────────────────────────────┐
│             │                                                        │
│  Studio·Zero│   STEP 01 · YOU'RE IN                          [Bell]  │  Header (mono-meta eyebrow + bell)
│             │                                                        │
│  Dashboard  │                                                        │
│  Projects   │   Run your first audit.                                │  H1 display-l 64px
│  New audit  │                                                        │
│  Settings   │   Connect a repo or paste a URL.                       │  body-lg subhead 17px
│             │   We'll run seven reviewer agents and hand you a       │
│             │   graded checklist with the evidence.                  │
│             │                                                        │
│  ─────────  │   ┌───────────────────────────────────────┐            │  primary CTA pill
│             │   │ Run your free Surface audit →         │  Settings  │  + secondary text-link
│  [User]     │   └───────────────────────────────────────┘            │
│             │                                                        │
│             │   ────────────────────────────────────────────         │
│             │                                                        │
│             │   Three ways to start:                                 │
│             │                                                        │
│             │   ┌────────────┐ ┌────────────┐ ┌────────────┐         │  3-card explainer
│             │   │ Connect a  │ │ Paste a    │ │ Run on your│         │
│             │   │ GitHub repo│ │ URL you own│ │ machine    │         │
│             │   │            │ │            │ │ (CLI)      │         │
│             │   └────────────┘ └────────────┘ └────────────┘         │
│             │                                                        │
└─────────────┴────────────────────────────────────────────────────────┘
              ^240px sidebar         ^remaining = main content
```

### Tablet (768px)
- Sidebar collapses to icon-rail (4 icons, 60px wide); labels available via tooltip + screen-reader text.
- H1 drops to `display-m` (44px).
- 3-card explainer remains 3-up but with reduced padding.

### Mobile (320–375px)
- Sidebar fully collapsed; replaced with a top header hamburger.
- H1 drops to `h-card` (38px) — fits in 2 lines at 280px content width.
- 3-card explainer stacks vertically (1 column).
- Primary CTA full-width.
- Secondary text-link sits below the CTA, not beside it.

---

## 3. Composition map — Canvas components + props

| Slot | Component | Props (interface contract) |
|---|---|---|
| App shell | `<Nav variant="app">` (header) + `<Sidebar collapsed=false>` | Sidebar items: Dashboard / Projects / New audit / Settings (HB-9a 4-item collapse). `aria-current="page"` on Dashboard. |
| Header user menu | `<Placeholder kind="component" name="UserMenu" />` | **Interface contract for Canvas:** dropdown surfaces account email, settings deep-link, "log out". Not in Canvas's 14-component manifest — flag for v0.2 of Canvas's library. |
| Header bell | `<Button variant="ghost" size="icon">` with `<Placeholder kind="icon" name="bell" />` | Reserves 24×24 hit area; visual glyph 16px (per Halo A1-2 fix). Opens `<ModalRoute>` to `/app/notifications` per OPT-M1. |
| Mode chip | `<Chip variant="mono-meta">` | `text: "MODE: BYOK · KEY VALIDATED · NO RUNS YET"` — Canon flagged: dot indicator removed; words carry the signal. |
| Page header eyebrow | `<Chip variant="mono-meta">` | `text: "STEP 01 · YOU'RE IN"` (locked from `empty-states.md` ES-DASHBOARD-FIRST-RUN) |
| H1 | native `<h1 tabindex="-1">` | "Run your first audit." (Herald-locked variant of empty-states.md ES-DASHBOARD-FIRST-RUN). |
| Body | native `<p>` body-lg | Locked: *"Connect a repo or paste a URL. We'll run seven reviewer agents and hand you a graded checklist with the evidence."* |
| Primary CTA | `<Button variant="primary" size="lg">` | `href: "/app/projects/new"`, `arrow: true`, `label: "Run your free Surface audit"`. Locked from Herald sample 02 + ES-DASHBOARD-FIRST-RUN. |
| Secondary action | `<Button variant="ghost" size="md">` or text link | `href: "/app/settings"`, `label: "Settings"`. Optic OPT-Polish#1: progress indicator at the top can lead into this; for first-run it's a calm secondary. |
| Section divider | `<hr class="sz-divider">` | Hairline `--line-1`. |
| Explainer eyebrow | native `<p class="eyebrow">` | "Three ways to start:" |
| Explainer cards (×3) | `<Card variant="default">` | `heading: "Connect a GitHub repo"`, `body`, `mono-meta`, `cta: {href, label}`. Cards are interactive surfaces — clicking begins `/app/projects/new` with the intake pre-selected. |
| `<EmptyState>` (alternative wrapper) | `<EmptyState>` (Canvas) | If Canvas's `<EmptyState>` ships, the entire main content can wrap. Props: `eyebrow`, `heading`, `body`, `primaryCta`, `secondaryCta`, `children` (the 3-card explainer). Spec'd here as the preferred composition; falls back to manual composition above if `<EmptyState>` lacks the `children` slot. |

---

## 4. State coverage per surface region

| Region | Loading | Data | Empty | Error |
|---|---|---|---|---|
| Sidebar | static — no async dependency | Dashboard active | n/a | n/a |
| Mode chip | spinner replacing the chip until BYOK validation status loads (≤500ms expected) | `MODE: BYOK · KEY VALIDATED · NO RUNS YET` | `MODE: BYOK · KEY MISSING` (deep-links to `/app/settings/integrations/byok`) | `MODE: BYOK · KEY EXPIRED` (deep-links to settings; error frame ES-SETTINGS-BYOK-NOT-ENTERED applies) |
| Bell notifications count | 0 visible on cold load | Numeric badge if >0 (but on first-run, always 0) | `aria-live="polite"` announces count *on change*, never on first render | n/a |
| Page main content | Skeleton briefly during SSR-hydration mismatch only; otherwise renders inline. | Empty-state composition (this screen). | n/a — this IS the empty state. | If projects-count query fails: show generic ES-AUDIT-FAILED-IRRECOVERABLY-style banner with `role="alert"`. |
| 3-card explainer | static | always-on | n/a | n/a |

---

## 5. Motion notes (reduced budget per `usage-rules.md`)

Per Direction A motion-appropriateness table: **dashboard = "Reduced"**.
- **No reveal stagger** on entry — content appears instantly.
- **No cursor glow** in app shell (`prefers-reduced-motion` toggle hides it; for app shell it's hidden unconditionally).
- **Card hover:** 380ms transform on the explainer cards only (`--dur-slow`).
- **Live-region throttle:** N/A on first-run (no per-agent updates yet).
- **Bell-count change:** debounced live-region announcement at most 4/sec per Halo HC2 / SC 2.2.1.

Choreography reference: `motion.md` §"Dashboard".

---

## 6. A11y notes — SCs satisfied and how

| SC | How |
|---|---|
| **1.4.3 Contrast** | All body copy uses `--ink-1`. Mono-meta eyebrow uses `--ink-2` (6.8:1) — clears AA body. |
| **1.4.10 Reflow** | Sidebar collapses at 768px; content reflows at 320px with H1 dropping to 38px. No horizontal scroll. |
| **1.4.11 Non-text Contrast** | Focus rings on sidebar links, bell, CTA — all 6.8:1. Sidebar `aria-current="page"` indicator uses a 2px solid border at `--line-3` (decorative, paired with text label). |
| **2.1.1 Keyboard** | Sidebar Tab order: Dashboard → Projects → New audit → Settings → user menu → bell → Skip-link to main → page H1 (tabindex=-1) → primary CTA. |
| **2.4.1 Bypass Blocks** | Skip-link to `<main id="main">` first; sidebar is `<nav aria-label="Primary">` skippable. |
| **2.4.3 Focus Order** | Route entry programmatically focuses the page `<h1 tabindex="-1">` for context. First Tab reaches the primary CTA. |
| **2.4.6 Headings and Labels** | One `<h1>`. Explainer eyebrow is `<p class="eyebrow">`, not a heading. Card headings are `<h3>`. |
| **2.4.11 Focus Not Obscured** | Sticky app header `60px`; `scroll-padding-top: 80px` token. |
| **2.4.13 Focus Appearance** | Token spec satisfies. |
| **2.5.8 Target Size** | Sidebar links pad to 44×44 hit area (well over the 24×24 floor); icon buttons reserve 24×24 even when glyph is smaller. |
| **4.1.2 Name, Role, Value** | Mode chip is decorative — no `role="status"` (HF-S2-1 fix: role="status" is reserved per Canvas A2-1 discipline to verdict-card `<h1>` + live-progress-region wrapper only). State-transition announcements publish via the app-shell live region (single coalesced `<div aria-live="polite" class="sz-sr-only" />` rendered by AppShell). Bell button has `aria-label="Notifications"` and `aria-haspopup="dialog"` when it triggers a modal-route. |
| **4.1.3 Status Messages** | First-render: no `role="status"` on the H1 — this is a stable route landing, not a transient state change (Halo A2-1 fix applied). |

### Traversal note

- Skip-link target: `<main id="main">`.
- Heading hierarchy: `<h1>` page title · `<h2>` ("Three ways to start:" — promoted from eyebrow because it labels a content region) · `<h3>` per explainer card.
- Landmark structure: `<header>` (app nav) · `<nav aria-label="Primary">` (sidebar) · `<main>` · no footer in app shell (per HB-9a; Help is a footer link only on marketing).
- Tab count from cold load to primary CTA via skip-link: skip → H1 → CTA = **2 Tabs**. Without skip-link: Tab through 4 sidebar items + user menu + bell + H1 = 7 Tabs. Both within budget.

---

## 7. Open questions for Herald / Canvas

- **For Herald:** Compass AH-6 — P3 multi-project / multi-client framing. Placeholder copy I'd want graded: *"One project? Start here. Multiple clients? Add a tag when you create one and we'll keep them grouped."* Is this in-voice, or should it stay silent at MVP and let the project-create flow surface tagging without dashboard framing?
- **For Canvas:** `<EmptyState>` is on the 14-component list. Confirm the interface supports a `children` slot for the 3-card explainer below the body+CTA stack. If not, the prototype composes manually.
- **For Canvas:** `<UserMenu>` and the `<Sidebar>` collapse-at-tablet pattern are missing primitives. Sidebar is on the list; tablet collapse behavior should be a prop, e.g. `<Sidebar mode="auto" />` switching between full and rail.
- **For Optic:** OPT-Polish#1 mentioned a progress indicator across onboarding steps — should that ribbon ship across `/app` on first-run as a 3-step indicator (Sign up · Choose mode · First audit), or is it bounded to the `/onboarding/*` routes only? I have it bounded; flag for review.

---

*End of dashboard-first-run screen spec v0.1. Pixel — Design layer.*
