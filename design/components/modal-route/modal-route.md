# Modal-as-route

**Owner:** Canvas · **Status:** shipped · **Implements Halo A1-1 (Critical):** focus return on close

## Purpose
Route-level dialog used for: `/app/cli/offline`, `/app/billing/token-budget-exceeded`, `/app/billing/free-tier-exhausted`, `/app/settings/account/delete`. Renders over the parent route shell; URL updates so back works; **focus choreography on open AND close is fully spec'd** (Halo A1-1).

## Anatomy
- Backdrop (`--bg-0`, 70 % opacity overlay over parent)
- Dialog surface (`--bg-1`, 14 px radius, `--card-pad` 36 desktop / 24 mobile)
- Close button (X) — `aria-label="Close"`, ≥ 24×24 hit area
- Heading `<h2>` (focus target on open)
- Body
- Action row (footer)

## Props
| Prop | Type | Notes |
|---|---|---|
| `open` | boolean | controls render (typically `true` for a modal-as-route since the route is the gate) |
| `title` | string | H2 text; focus moves here on open |
| `parentLabel` | string | text used for SR announcement on close, e.g. "Projects" — "navigated back to Projects" |
| `parentHref` | string | back-target if browser back is unavailable (server-rendered fallback) |
| `triggerRef` | React.Ref | original trigger element ref so focus returns there on close |
| `onClose` | handler | called on Esc, X, or backdrop click |
| `dismissible` | boolean (default true) | when false, removes X and Esc binding (used for paywall states — payment-required modal cannot be dismissed without action; per HC9 enforcement) |
| `srAnnounceRef` | React.Ref | the page-level `aria-live` region that publishes the "navigated back" message; Canvas exposes a default consumer when not provided |
| `children` | ReactNode | body content |
| `actions` | ReactNode | footer actions; primary `<Button>` last in DOM, focus order |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | `open` | backdrop visible, dialog centered, focus on H2 (`tabindex="-1"`) |
| **hover** (close-X) | pseudo | bg `--bg-2`; icon `--ink-0` |
| **active** | pseudo | filter brightness 0.95 |
| **focus** | focus-visible | 2px solid `--focus-ring` on every interactive element |
| **disabled** (action button) | inherited from Button | — |
| **loading** | `loading` | applied during async action (e.g., "Confirm delete" mid-request); spinner on primary action; backdrop persists |
| **error** | `error` | error text rendered below body before actions; `aria-live="polite"` published |

## A11y notes — focus choreography (Halo A1-1 binding)
- **On open:**
  - Render `<dialog>` (or `<div role="dialog" aria-modal="true">`) with `aria-labelledby={titleId}` and (optional) `aria-describedby={bodyId}`.
  - Store `triggerRef` on history-state via `history.replaceState({ ...history.state, sz_modal_trigger: trigger.id })`.
  - Move focus to the H2 with `tabindex="-1"`.
  - Lock focus inside the dialog (focus-trap; Tab cycles within dialog only) — SC 2.1.2.
  - Lock body scroll (`document.body.style.overflow = "hidden"`).
- **On close** — fires on **Esc**, **X click**, **backdrop click** (unless `dismissible=false`), or **browser back**:
  - Pop route back to parent.
  - Programmatically move focus to the original trigger element (via `triggerRef`); fallback: parent route's `<h1 tabindex="-1">`.
  - Publish a polite SR announcement to a page-shell `aria-live="polite"` region: *"Navigated back to {parentLabel}."* (SC 4.1.3.)
  - Restore body scroll.
  - Restore scroll position with `scroll-padding-top: var(--scroll-pad-top)` honored to keep focused trigger visible (SC 2.4.11).
- **Focus trap:** Tab + Shift+Tab cycle within the dialog. The first and last focusable elements wrap.
- **Reduced motion:** backdrop fade collapses to instant per tokens.json§motion.prefers_reduced_motion.

## WCAG SCs satisfied
- **1.3.1 Info and Relationships:** `<dialog>` semantics; `aria-modal="true"`; `aria-labelledby` link; body in semantic structure.
- **1.4.10 Reflow:** dialog max-width 560 px; on 320 px viewport it fills with 16 px margin.
- **1.4.11 Non-text Contrast:** close-X border `--line-2` for hover; focus ring 6.8:1.
- **2.1.2 No Keyboard Trap:** focus trap within dialog while open; Esc breaks the trap by closing dialog.
- **2.4.3 Focus Order:** open → H2; close → trigger.
- **2.4.11 Focus Not Obscured:** sticky nav scroll-padding-top guard.
- **2.4.13 Focus Appearance:** 2px ring + 2px offset on every interactive element.
- **2.5.8 Target Size:** close-X ≥ 24×24 hit area; action buttons inherit Button SC 2.5.8.
- **4.1.3 Status Messages:** route-back announcement via page-shell `aria-live="polite"`.

## Brand-token references
`--bg-0`, `--bg-1`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--line-1`, `--line-2`, `--focus-ring`, `--font-sans`, `--fs-h-step`, `--fs-body`, `--r-card`, `--card-pad`, `--card-pad-mobile`, `--sp-*`, `--dur-medium`, `--ease-out`, `--hit-min`.

## Composition rules
- **Wraps:** any body content + Button row.
- **Wrapped by:** Next.js route at the named modal-as-route paths.
- **Pixel screen contract:** the dialog *is* the screen at these routes. Pixel composes via `<ModalRoute title=... parentLabel=... actions={...}><BodyContent/></ModalRoute>`.

## Responsive behavior
- **320px:** dialog fills viewport minus 16 px margin; vertically centered if short, scroll-y if tall (the inner content scrolls; backdrop doesn't).
- **768px:** dialog max-width 480 px.
- **1280px:** dialog max-width 560 px; never wider (SC 1.4.10 + readability budget).
