# Live-progress-region

**Owner:** Canvas · **Status:** shipped · **Implements:** PRD §7.2 Step C + Halo HC2 (`aria-live="polite"` throttle ≤ 4/sec) + Halo A2-2 (single coalesced region, not per-reviewer)

This is a Phase 4 component specification.

## Purpose
Renders the per-agent live progress for an in-flight audit run at `/app/audits/[run-id]`. Per Halo A2-2: **one** wrapper `aria-live="polite"` region publishes a coalesced summary; per-reviewer rows are visual-only.

## Anatomy
- Wrapper `<section>` containing a hidden `<div aria-live="polite" aria-atomic="true">` (the coalesced SR announcement target)
- Per-reviewer `<ul role="list">` of rows; each row: agent chip + phase chip + partial-finding count
- Estimated time remaining (static text — not a countdown per Halo A5-2)
- Cancel button (ghost)

## Props
| Prop | Type | Notes |
|---|---|---|
| `reviewers` | `{ id, label, phase, partialCount }[]` | required; phase one of `dispatched`/`running`/`finished`/`blocked` |
| `etaMinutes` | number | static; not animated |
| `onCancel` | handler | renders Cancel button |
| `coalesceMs` | number | default 250 ms (the 4/sec throttle floor) |
| `srSummary` | string | optional override; default derived from reviewers state |

## Coalescing implementation (Halo A2-2 binding)
- A trailing-edge debounce: when any reviewer state changes, schedule a single SR announcement after `coalesceMs` ms. Subsequent changes inside the window cancel-and-reschedule.
- The coalesced message format: *"{N} reviewers running. {M} finished. About {ETA} minutes left."* — derived from current reviewers state at announcement time. SR users hear one summary, not 6 streams.
- Phase chip visual transitions are CSS only (`data-state`); no per-row `aria-live`.
- Throttle target: ≤ 4 announcements/sec per `motion.rules.live_region_throttle_per_sec=4` token; `coalesceMs=250` meets the floor.

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | — | rows visible; phase chip per reviewer |
| **hover** (cancel) | pseudo | Cancel button hover state |
| **active** | pseudo | brightness 0.95 |
| **focus** (cancel) | focus-visible | 2px ring `--focus-ring` |
| **disabled** (cancel) | `disabled` | Cancel disabled inside the uncancellable "jury synthesizing" window (Halo A5-2) |
| **loading** | `loading` | each row shows `running` phase chip with mono dots animation |
| **error** | `error` | reviewer row with phase=blocked gets `--sev-blocker-border` left rule |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** rows in `<ul>`; each row has accessible name from agent label + phase.
  - **1.4.1 Use of Color:** phase = chip text (RUNNING / FINISHED / BLOCKED), never color alone.
  - **2.2.1 Timing Adjustable:** the ETA is static text not a live countdown; respects user time-budget without forcing pause-control (per Halo A5-2).
  - **2.3.3 Animation from Interactions:** reduced-motion collapses spinner / phase chip transitions to ≤ 100 ms per tokens guard.
  - **4.1.3 Status Messages:** **one** `aria-live="polite"` region publishes coalesced summaries; satisfies HC2.
- **The treegrid alternative (HC8):** when a sighted user opens the per-agent timeline route (`/app/audits/[run-id]/timeline`), the same data renders as a `treegrid` for keyboard navigation. This component is the *summary* surface; treegrid is the *detail* surface.

## Brand-token references
`--bg-1`, `--bg-2`, `--bg-3`, `--ink-0`, `--ink-1`, `--ink-2`, `--ink-3`, `--line-1`, `--line-2`, `--sev-blocker-border`, `--font-sans`, `--font-mono`, `--fs-body-sm`, `--fs-mono-meta`, `--fs-mono-data`, `--sp-*`, `--r`, `--r-pill`, `--hit-min`, `--dur-fast`.

## Composition rules
- **Wraps:** native `<ul>` + Chip (phase) + Button (cancel).
- **Wrapped by:** the audit-run route shell. The VerdictCard renders this in its `loading` state too.
- **Pixel screen contract:** Pixel composes the page-level scaffolding (motion-gated per usage-rules.md "in-app dashboard: reduced motion"). Canvas owns the live-region semantics — Pixel cannot bypass.

## Responsive behavior
- **320px:** rows stack vertically; phase chip below agent name; ETA on its own line.
- **768px:** rows render `agent | phase | partial-count` in a row.
- **1280px:** same as 768 with additional partial-finding label.
