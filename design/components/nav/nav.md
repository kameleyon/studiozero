# Nav

**Owner:** Canvas · **Status:** shipped · **Inherits:** `.nav` / `.nav-inner` / `.brand` / `.nav-links` / `.nav-cta` from template baseline

## Purpose
Top navigation. Renders on every authed `/app/*` page and every marketing page. **Mode-aware:** in CLI mode it hides GitHub-install affordances; in Managed mode it surfaces a token-budget chip; in BYOK it surfaces a key-status chip.

## Anatomy
- Brand mark (22 px circle per usage-rules `Mark-alone (UI / nav) 22×22 px`)
- Wordmark text (`STUDIO ZERO`, mono-meta UPPERCASE)
- Primary nav links (`<nav aria-label="Primary">`)
- Mode-aware right-edge cluster: token-budget chip (Managed) / key-status chip (BYOK) / CLI-online chip (CLI)
- Notification bell (links to `/app/notifications` drawer-route, HB-9a)
- User menu trigger (account avatar / initial)
- Auth CTAs (Sign in / Sign up — marketing only)

## Props
| Prop | Type | Notes |
|---|---|---|
| `surface` | `"marketing" \| "app"` | switches link set |
| `mode` | `"byok" \| "cli" \| "managed" \| null` | drives right-cluster |
| `notifCount` | number | unread notifications; renders dot on bell |
| `tokenBudgetRemaining` | number | for Managed mode |
| `byokStatus` | `"valid" \| "invalid" \| null` | for BYOK mode |
| `cliStatus` | `"online" \| "offline" \| null` | for CLI mode |
| `currentPath` | string | drives `aria-current="page"` |
| `user` | object | shown in user menu |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | — | semi-transparent backdrop-blur `rgba(5,5,6,0.75)`, `border-bottom: 1px solid transparent` |
| **hover** (link) | pseudo | `--ink-3` → `--ink-0` |
| **active** (link) | pseudo | `--ink-0` text, persistent indicator (`aria-current="page"`) |
| **focus** | focus-visible | 2px solid `--focus-ring`, 2px offset on every interactive element |
| **disabled** (link) | `disabled` | (rare — used for CLI-mode hiding of GH-install link) opacity 0.4 |
| **loading** | `loading` | budget chip shows mono dots animation |
| **error** | `error` (chip) | byok-status `invalid` chip with `--sev-blocker-text` |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** `<nav aria-label="Primary">`; the bell + menu live in their own landmarks.
  - **1.4.3 Contrast:** every text element on `--bg-0` clears AA (`--ink-3` is 3.2:1 — used here only for inactive nav links per usage-rules.md "DECORATION-ONLY: hairline labels, decorative metadata. Not for body text. Large-text AA only." — nav labels are large-enough mono-meta at 11px UPPERCASE 0.08em; verified on Halo Phase 2).
  - **2.1.1 Keyboard:** all interactive elements are buttons or anchors; arrow-key roving tabindex within `<nav aria-label="Primary">`.
  - **2.4.1 Bypass Blocks:** skip-to-content link is the first focusable element on every page; targets `<main id="main">`.
  - **2.4.4 Link Purpose (In Context):** nav links carry text labels (never icon-only); bell uses `aria-label="Notifications, 3 unread"`.
  - **2.4.11 Focus Not Obscured Minimum:** sticky nav at 60px height; `html { scroll-padding-top: 80px }` via tokens.css guard.
  - **2.5.8 Target Size:** every link / bell / menu trigger ≥ 24×24 hit area (padding ensures).
  - **3.2.3 Consistent Navigation:** same link order on every page; auth state changes the rightmost slot only.
- **Keyboard map:**
  - Skip-to-content link visible on Tab (1st target).
  - Within `<nav>`: Tab walks; ArrowLeft/ArrowRight optional roving within link group.
  - Bell: Enter / Space opens drawer route.
  - User menu: Enter / Space opens dropdown; Esc closes; arrow keys move within items.

## Brand-token references
`--bg-0`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--line-2`, `--line-3`, `--focus-ring`, `--font-mono`, `--fs-mono-meta`, `--sp-16`, `--sp-18`, `--sp-28`, `--sticky-nav-h`, `--dur-medium`, `--ease`.

## Composition rules
- **Wraps:** Brand mark + Chip + Button + native `<a>`.
- **Wrapped by:** root `<header>` element of every layout.
- **Pixel screen contract:** Pixel composes `<Nav>` with mode + currentPath. The nav owns its own structure; screens never override link order.

## Responsive behavior
- **320px:** primary nav links collapse into a hamburger button (`<button aria-expanded aria-controls="primary-nav">`). User menu + bell remain visible.
- **768px:** primary nav links visible inline. Mode chip may truncate to icon + count.
- **1280px:** full nav visible.
- At every breakpoint, the brand mark is the leftmost focusable nav element; auth CTA / user menu is the rightmost.
