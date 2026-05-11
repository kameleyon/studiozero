# Empty-state

**Owner:** Canvas · **Status:** shipped · **Implements:** every state catalogued in `ia/empty-states.md`

This is a Phase 4 component specification.

## Purpose
Single template that serves every empty state the IA enumerates:
- **zero-data** (ES-DASHBOARD-FIRST-RUN, ES-PROJECT-ZERO-AUDITS, ES-FINDINGS-FILTERED-TO-ZERO)
- **error** (ES-AUDIT-FAILED-IRRECOVERABLY, /500)
- **payment-required** (ES-PAYMENT-MANAGED-BUDGET, ES-PAYMENT-LAPSED, ES-PAYMENT-FREE-TIER)
- **permission-denied** (/403)
- **offline** (/offline)
- **loading** (route entry skeleton)
- **maintenance** (/503)
- **rate-limited** (/429)
- **not-found** (/404)
- **gone** (/410)
- **settings-not-connected** (BYOK + GitHub not connected)
- **coming-soon** (marketing routes not yet built)

Each invocation passes **copy via props** (so we don't ship banned-word strings); the component never carries copy itself.

## Anatomy
- Optional eyebrow (mono-meta UPPERCASE, e.g. `STEP 01 · YOU'RE IN`)
- Optional status chip (e.g. `RUN FAILED · CODE E-…`) — assertive when `kind="error"`
- `<h1>` (route-level) or `<h2>` (in-page empty state) per consumer choice via `headingLevel` prop
- Body paragraph (Herald-graded copy passed in via prop)
- Primary CTA (Button)
- Optional secondary affordance
- Optional support code chip (e.g. `RUN-{id}`) for the error variant

## Props
| Prop | Type | Notes |
|---|---|---|
| `kind` | `"zero-data" \| "error" \| "payment" \| "permission" \| "offline" \| "loading" \| "maintenance" \| "rate-limit" \| "not-found" \| "gone" \| "settings" \| "coming-soon"` | required; drives default chip tone + role |
| `eyebrow` | string | e.g. `STEP 01 · YOU'RE IN` |
| `statusChip` | string | optional |
| `headingLevel` | `1 \| 2` | default 1 |
| `title` | string | required; Herald-graded |
| `body` | ReactNode | required; Herald-graded |
| `primary` | ReactNode (Button) | typically `<Button variant="primary" arrow>` |
| `secondary` | ReactNode (Button) | optional |
| `supportCode` | string | renders `<code>` block + copy button |
| `assertive` | boolean | when true, wraps status chip in `role="alert"` (used for unexpected failures only — H9) |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | — | centered card on page; CTA below body |
| **hover** (CTA) | per Button | inherited |
| **active** (CTA) | per Button | inherited |
| **focus** (CTA) | per Button | inherited |
| **disabled** (CTA) | inherited | CTA can be disabled while async fetch resolves |
| **loading** | `loading` | renders skeleton (eyebrow → title → body lines) |
| **error** | `error` | status chip carries `role="alert"` when `assertive=true` |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** `<h1>` or `<h2>` per `headingLevel`; semantic ordering preserved.
  - **1.4.1 Use of Color:** every chip carries text; no color-alone signaling.
  - **2.4.1 Bypass Blocks:** the Nav-level skip-link already targets `<main>`; empty-state lives inside `<main id="main">`.
  - **2.4.6 Headings and Labels:** `title` is the route heading per `sitemap.md` SEO posture.
  - **2.4.7 Focus Visible:** primary CTA carries Button's focus ring.
  - **2.5.8 Target Size:** CTAs ≥ 24×24.
  - **3.2.3 Consistent Navigation:** secondary affordance position is consistent across kinds.
  - **4.1.3 Status Messages:** `role="alert"` reserved for `assertive=true` (e.g., audit failed irrecoverably). All other empty states use no live region — the route IS the state.
- **Per Halo A2-4:** the skip-to-content target is `<main id="main">`, not the primary CTA — Empty-state defers to the Nav-rendered skip link.
- **`role="status"` is NOT used here** — Halo A2-1: empty-state is a *route*, not a transient region update. Skip the live region except for the assertive-error edge.

## Brand-token references
`--bg-0`, `--bg-1`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--focus-ring`, `--sev-blocker-text`, `--sev-blocker-border`, `--font-sans`, `--font-mono`, `--fs-display-l`, `--fs-h-step`, `--fs-body-lg`, `--fs-body`, `--fs-mono-meta`, `--r-card`, `--card-pad`, `--sp-*`.

## Composition rules
- **Wraps:** Chip + heading + body + Button + optional code chip.
- **Wrapped by:** route shell at every IA-enumerated empty state.
- **Pixel screen contract:** Pixel composes hero-grade rendering for `ES-DASHBOARD-FIRST-RUN` (the activation moment per BUILD_FLOW Phase 3 lesson #2) — same template, hero typography size. Canvas owns structure; Pixel scales the heading via `headingLevel=1` + custom container.

## Responsive behavior
- **320px:** centered, full-width; CTAs stack; status chip on its own line.
- **768px:** centered, max-width 720 px; CTA row inline.
- **1280px:** centered, max-width 720 px; ample whitespace per Direction A restraint.
