# Sidebar

**Owner:** Canvas · **Status:** shipped

## Purpose
The 4-item authed-app sidebar locked by HB-9a: **Projects · Audits · Settings · Help**. (Notifications via the header bell on Nav; not a sidebar item — HB-9a collapse.) Active state is the SR-load-bearing affordance for "where am I" — `aria-current="page"`.

## Anatomy
- Brand mark (smaller variant — 22 px)
- 4 nav items, each: icon (decorative, `aria-hidden`) + label + optional count badge
- Persistent footer: account chip + sign-out

## Props
| Prop | Type | Notes |
|---|---|---|
| `items` | `{href,label,icon,count}[]` | required; defaults to the 4-item set |
| `currentPath` | string | drives `aria-current` |
| `user` | object | footer chip |
| `onSignOut` | handler | — |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | — | `--bg-1` panel on `--bg-0` page; items `--ink-2` text, `--ink-1` icon |
| **hover** | pseudo | item bg `--bg-2`; text `--ink-0` |
| **active** | pseudo | same as hover momentarily |
| **focus** | focus-visible | 2px solid `--focus-ring`, 2px offset |
| **disabled** | `disabled` | opacity 0.4; pointer-events none (rare) |
| **loading** | `loading` | skeleton item shimmer (rare; only on initial dashboard mount) |
| **error** | `error` | item with `--sev-blocker-border` border if a route fails to load (graceful degradation) |
| **current** | `aria-current="page"` | left rail accent `--ink-0` 2px-wide; text `--ink-0`; bg `--bg-2` |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** `<nav aria-label="Primary">` wraps `<ul>` with `<li>` items.
  - **2.1.1 Keyboard:** native anchors; Tab walks; ArrowUp/Down optional roving.
  - **2.4.1 Bypass Blocks:** the page-level skip-to-content link (rendered by Nav) bypasses the sidebar.
  - **2.4.4 Link Purpose:** every item has a text label; icons are `aria-hidden`.
  - **2.4.7 Focus Visible:** focus ring on every item.
  - **2.4.11 Focus Not Obscured:** sidebar is non-sticky on viewport-height-constrained surfaces; on mobile it's a collapsing drawer behind hamburger (Nav-owned trigger).
  - **2.5.8 Target Size:** each item ≥ 44 px tall.
  - **3.2.3 Consistent Navigation:** same order on every page; HB-9a-locked.
- **Keyboard map:** Tab walks items top→bottom; Enter activates; Esc closes mobile drawer (consumer-owned).

## Brand-token references
`--bg-0`, `--bg-1`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--focus-ring`, `--font-mono`, `--font-sans`, `--fs-body-sm`, `--fs-mono-meta`, `--sp-12`, `--sp-16`, `--r`, `--hit-min`, `--dur-fast`.

## Composition rules
- **Wraps:** anchors + icons + Chip (for count badges).
- **Wrapped by:** AppShell layout component.
- **Pixel screen contract:** Sidebar lives in column 1; main content in column 2 with `min-width: 0` to prevent grid overflow.

## Responsive behavior
- **320px:** sidebar collapses behind hamburger in Nav. Open state: full-screen drawer with `inert` on background.
- **768px:** rail-only sidebar (icon + abbreviated label) optional; or full sidebar with label.
- **1280px:** full sidebar always visible, 240 px wide.
