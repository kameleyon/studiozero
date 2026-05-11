# Screen — settings-root

**Route:** `/app/settings`
**Surface class:** App shell · `noindex, nofollow` · session+consent
**Owner:** Pixel (composition) · Canvas (components) · Optic (IA) · Halo (a11y)
**Brand version:** Direction A v0.1.1
**Status:** Phase 4 hero-screen v0.1
**Heuristic budget:** HB-4 = PASS at 3-group top-level structure (Account / Integrations / Billing & Data)
**Sub-pages:** keyboard-navigable in <7 keystrokes per Halo

> **Why this is a hero.** Settings is the **work** surface (Direction A motion table: *"settings are work, not theatre"*). It's also the panel that has to satisfy FTC Click-to-Cancel, GDPR Art. 17 / 20, EU AI Act Art. 50 disclosures, and PRD §14.4 retention slider. Settings is where compliance lives in the user's vocabulary. Flat at MVP per Trace; sub-pages keyboard-navigable in <7 keystrokes per Halo A3-1.

---

## 1. Persona-fit notes

| Persona | What they need from settings | Tab-count to deepest item |
|---|---|---|
| **P1 — Non-technical solo founder** | Plan management, cancel subscription, GDPR export. The "Delete account" panel must be obvious (Comply §14.4 + Halo A9-1). | Group nav (1) → Account/Billing rail entry (2) → Delete account (3) = **3 Tabs**. |
| **P2 — Technical solo founder** | BYOK key, GitHub install, CLI pairings. AI training opt-in. | Group nav (1) → Integrations rail (2) → BYOK (3) = **3 Tabs**. |
| **P3 — Indie agency** | BYOK + GitHub + invoice list. | Same as P2 plus billing rail (4). |
| **P4 — Engineering lead** | Currently squeezed (no team page — V2). The Team panel placeholder must be visible-but-disabled to signal the roadmap. | n/a at MVP. |

---

## 2. Layout — desktop / tablet / mobile

### Desktop (≥1280px)
```
┌─────────────┬────────────────────────────────────────────────────────┐
│             │  SETTINGS                                              │
│  Sidebar    │                                                        │
│             │  Settings                                              │  H1 display-m 44px
│             │                                                        │
│  Dashboard  │  Three groups. Each panel shows its current state on   │  body subhead
│  Projects   │  the card — change details inside.                     │
│  New audit  │                                                        │
│  Settings ●│  ┌─── Account ─────────────────────────┐                │  group 1 — 5 panels
│             │  │  Profile        STATE              │                │
│             │  │  Notifications  3 ENABLED          │                │
│             │  │  Consent        ANALYTICS: OFF     │                │
│             │  │  Export         GDPR ART. 20       │                │
│             │  │  Delete account RE-AUTH REQUIRED   │                │
│             │  └─────────────────────────────────────┘                │
│             │                                                        │
│             │  ┌─── Integrations ───────────────────┐                │  group 2 — 3 panels
│             │  │  BYOK key       VALIDATED 3D AGO   │                │
│             │  │  CLI pairings   1 DEVICE           │                │
│             │  │  GitHub App     ON 2 REPOS         │                │
│             │  └─────────────────────────────────────┘                │
│             │                                                        │
│             │  ┌─── Billing & Data ─────────────────┐                │  group 3 — 7 panels (WARN)
│             │  │  Plan           BYOK STARTER $29   │                │
│             │  │  Invoices       3 PAID             │                │
│             │  │  Payment method •••• 4242          │                │
│             │  │  Cancel plan    AVAILABLE          │                │  FTC Click-to-Cancel
│             │  │  Dispute        NO ACTIVE          │                │
│             │  │  Retention      30 DAYS            │                │
│             │  │  Findings export READY             │                │
│             │  └─────────────────────────────────────┘                │
│             │                                                        │
│             │  ─ Team (V2) ─ disabled placeholder ─                  │  feature-flagged off
│             │                                                        │
└─────────────┴────────────────────────────────────────────────────────┘
```

### Tablet (768px)
- Sidebar collapses to icon rail.
- Group cards remain stacked vertically; each group becomes a single-column list of panels.
- Group headings (`<h2>`) stay sticky to top of their section for context (`position: sticky; top: var(--sticky-nav-h)`).

### Mobile (320–375px)
- Sidebar → hamburger.
- H1 drops to `h-card` (38px).
- Each group renders as a `<section>` with a sticky `<h2>` header.
- Within each group, panels render as full-width rows: `<a class="settings-row">` with title left + status mono-meta right + chevron.
- Tap-target = whole row (≥44×44).

---

## 3. Composition map — Canvas components + props

| Slot | Component | Props |
|---|---|---|
| App header | `<Nav variant="app">` | (shared) |
| Sidebar | `<Sidebar>` | `aria-current="page"` on Settings. |
| Page eyebrow | `<Chip variant="mono-meta">` | `SETTINGS` |
| H1 | native `<h1 tabindex="-1">` | "Settings" |
| Subhead | native `<p>` | "Three groups. Each panel shows its current state on the card — change details inside." (Open question for Herald.) |
| Group card (×3) | `<Card variant="default">` with internal `<h2>` + list | `heading: "Account"` / `"Integrations"` / `"Billing & Data"`. The list of panels inside the card is a `<ul>` of `<a class="settings-row">` rows. |
| Settings row | `<Placeholder kind="component" name="SettingsRow" />` | **Interface contract:** `href`, `title`, `stateText` (mono-meta, right-aligned), `destructive: boolean` (Delete account, Cancel plan), `chevron: true`. Hit area 44×44. Focus ring via `.sz-focus-ring`. **Not on Canvas's 14-list — recommend extending `<Card>` with a `variant="settings-row"` or shipping `<ListItem>` as a v0.2 primitive.** |
| Team V2 placeholder | `<Card variant="default" disabled>` | `heading: "Team"`, `body: "Multi-user workspaces ship in V2."`, `aria-disabled="true"`. |
| Inline "Save changes" buttons | `<Button variant="primary" size="md">` | Within each sub-page; not on the root. |
| Destructive confirmations | `<ModalRoute>` (Canvas) | The Delete account flow lives at `/app/settings/account/delete` and renders as a true modal-as-route per Halo A1-1. Modal opens with focus on H2; close returns focus to triggering row. |

---

## 4. State coverage per surface region

The root page is a directory — most state is "current value as a label."

| Region | Loading | Data | Empty | Error |
|---|---|---|---|---|
| Account · Profile row | skeleton | "John Doe · jo@studiozero.dev" | "NOT SET" if profile incomplete | "Could not load" if API failed |
| Account · Notifications row | skeleton | "3 ENABLED" | "NONE ENABLED" | error |
| Account · Consent row | skeleton | "ANALYTICS: OFF" | "PENDING" if banner unanswered | error |
| Account · Export row | "READY" | clickable; opens download | n/a | "EXPORT FAILED" with retry link |
| Account · Delete account row | "RE-AUTH REQUIRED" | destructive styling | n/a | n/a |
| Integrations · BYOK row | "VALIDATED 3D AGO" | shows last-validated timestamp | "NOT CONNECTED" (links to ES-SETTINGS-BYOK-NOT-ENTERED) | "VALIDATION FAILED" |
| Integrations · CLI row | "1 DEVICE" | count of paired CLI devices | "NO DEVICES" | "OFFLINE" (ES-CLI-OFFLINE applies on a sub-page level) |
| Integrations · GitHub row | "ON 2 REPOS" | install + repo count | "NOT INSTALLED" (links to ES-SETTINGS-GITHUB-NOT-INSTALLED) | "TOKEN EXPIRED" |
| Billing · Plan row | "BYOK STARTER $29" | tier label | "FREE TIER" | "PAYMENT FAILED" |
| Billing · Invoices row | "3 PAID" | count | "0 INVOICES" | error |
| Billing · Payment method row | "•••• 4242" | last-4 | "NO CARD" | "EXPIRED" |
| Billing · Cancel plan row | "AVAILABLE" | FTC Click-to-Cancel surface — same UI difficulty as signup per Decision #20 | "ALREADY CANCELLED" | error |
| Billing · Dispute row | "NO ACTIVE" | dispute count | n/a | n/a |
| Billing · Retention row | "30 DAYS" | slider | n/a | n/a |
| Billing · Findings export row | "READY" | download trigger | n/a | error |

Every row renders its **current state on the card** per OPT-M3 H6 (recognition over recall — customer who hasn't been in settings for weeks recognizes the state without drilling in).

---

## 5. Motion notes (none beyond focus-ring per `usage-rules.md`)

Per Direction A motion-appropriateness table: **settings = "None beyond default form-input focus rings."** *Settings are work, not theatre.*

- **No reveal stagger.**
- **No hover transforms** on settings rows. Hover state changes border from `--line-1` to `--line-2` (instant).
- **No cursor glow.**
- **Focus ring** appears on `:focus-visible` per token spec; that is the only motion-adjacent affordance on this surface.
- **Modal-route open/close:** 200ms (`--dur-fast`) fade-only — no slide.

Choreography reference: `motion.md` §"Settings / billing".

---

## 6. A11y notes — SCs satisfied and how

| SC | How |
|---|---|
| **1.3.1 Info and Relationships** | Each group is a `<section aria-labelledby="account-h2">`; group headings are `<h2>`; rows inside are a `<ul>` of `<li><a>` links. |
| **1.4.3 Contrast** | Row labels in `--ink-1` (13.7:1). State mono-meta in `--ink-2` (6.8:1). Destructive row labels use `--ink-0` on `--bg-1` with `--focus-ring-emphasis` for focus. |
| **1.4.10 Reflow** | Group cards stack vertically at any width; row layout switches from `flex-row` (desktop) to stacked title+state at 320px. |
| **1.4.11 Non-text Contrast** | Row chevron uses `--ink-2` (6.8:1). Disabled team placeholder uses dashed `--line-1` border + "V2" mono-meta — visual + text. |
| **2.1.1 Keyboard** | Tab order: skip-link → H1 → Account group's 5 rows → Integrations group's 3 rows → Billing & Data group's 7 rows → Team V2 placeholder (not tabbable since `aria-disabled`). Max 15 tabs to deepest item, which is **within HB-4 / Halo A3-1 budget** (≤8 tabs per group surface). |
| **2.4.1 Bypass Blocks** | Skip-link to `<main>`. Each group `<section>` is a landmark via `aria-labelledby`. |
| **2.4.3 Focus Order** | Document order = visual order. On sub-page entry from a settings row, focus moves to the sub-page `<h1 tabindex="-1">` per Halo A3-1. On modal-route open (Delete account), focus moves to the dialog `<h2>` per Halo A1-1. On modal-route close, focus returns to the originating row. |
| **2.4.4 Link Purpose** | Each row carries a self-describing label: "Profile · current name" / "BYOK key · current state" — never "Edit" alone. |
| **2.4.6 Headings** | `<h1>` page · `<h2>` per group · `<h3>` per row title (semantically `<a><h3>title</h3></a>` is unusual but valid; alternative pattern is `<h3>` outside the link, the row body inside — settled at Phase 4 build per Canvas's `<SettingsRow>` interface). |
| **2.4.11 Focus Not Obscured** | Sticky app header + scroll-padding-top: 80px. Sticky group `<h2>` on mobile also accounts for this in the offset calculation. |
| **2.4.13 Focus Appearance** | Token spec. Destructive rows use `--focus-ring-emphasis` (18.4:1). |
| **2.5.8 Target Size** | Every row reserves ≥44×44 hit area (well above 24×24 floor). |
| **3.3.4 Error Prevention (Legal/Financial/Data)** | Delete account, Cancel plan, Findings export — each requires the destructive-action pattern (modal-as-route, reauth or text-match confirm). |
| **3.3.7 Redundant Entry** | Settings does not re-prompt info from signup or BYOK. |
| **4.1.2 Name, Role, Value** | Disabled Team panel uses `aria-disabled="true"` (not `disabled` attribute on `<a>`, which has no effect) plus `tabindex="-1"` so keyboard skips it. |

### Traversal note

- Skip-link target: `<main id="main">`.
- Heading hierarchy: `<h1>` Settings · `<h2>` Account / Integrations / Billing & Data / Team · `<h3>` per row title.
- Landmark structure: `<header>` (app nav) · `<nav aria-label="Primary">` (sidebar) · `<main>` · 3× `<section aria-labelledby>` (one per group).
- Tab count from cold load to "Delete account" via skip-link: skip → H1 → Account `<h2>` (skippable) → row 1 → 2 → 3 → 4 → **Delete account row** = **7 Tabs**. Within Halo's <7 keystrokes ceiling **inclusive** (= 7, not >7). If group headings are `<h2 tabindex="-1">` and skipped over by Tab, the count drops to 6.

---

## 7. Open questions for Herald / Canvas

- **For Herald:** Subhead copy "Three groups. Each panel shows its current state on the card — change details inside." is invented. Confirm voice; alternative: drop the subhead entirely (settings rarely need one).
- **For Canvas:** `<SettingsRow>` (or a `<Card variant="settings-row">` extension) is not on the 14-list. Recommend it ships in Canvas v0.2 as a thin primitive: title + state + chevron + optional destructive variant. Until then, `<Placeholder>` carries the contract.
- **For Canvas:** `<ModalRoute>` is on the 14-list — confirm the focus-return-to-trigger contract per Halo A1-1 is implemented in its public interface (props should include a `returnFocusRef` or auto-track via history state).
- **For Optic:** HB-4c WARN on Billing & Data at 7 panels — if Sprint adds a Tax settings or Address book panel, the recommendation is to split into Billing (4) + Data (3) sub-groups. Spec the trigger for that split here so we don't drift past 8 silently.

---

*End of settings-root screen spec v0.1. Pixel — Design layer.*
