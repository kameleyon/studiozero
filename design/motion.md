# Studio Zero — Motion Grammar

**Phase:** 4 — Brand & Component Build
**Owners:** Pixel (composition) · Canvas (foundational components)
**Brand:** Direction A v0.1.1 ("The Auditor's Notebook")
**Status:** v0.1 — joint motion doc; locked to tokens.json §motion
**Compliance:** WCAG 2.2 SC 2.3.3 Animation from Interactions · SC 2.2.2 Pause/Stop/Hide · SC 2.2.1 Timing Adjustable

> **Method.** Motion is a *budget*, not a style. Each surface gets a budget. Every animation references a token from `brand/direction-A/tokens.json§motion` and `design/components/_tokens/tokens.css`. No hardcoded durations. No off-token easings. Canon's drift detector fails Phase 4 if either appears in component or screen CSS.
>
> Every animation has a defined collapse to ≤100ms under `prefers-reduced-motion: reduce` per the global guard in `_tokens/tokens.css`. Marquee, ring pulse, and cursor glow stop entirely. Reveals collapse to fade-only — no translate.

---

## 1. Tokens (source of truth)

All durations and easings reference these tokens. **No exceptions.**

| Purpose | CSS variable | Value |
|---|---|---|
| Instant — opacity-only state changes | `--dur-instant` | 120ms |
| Fast — disclosure expand/collapse, color transitions | `--dur-fast` | 200ms |
| Medium — verdict reveal, modal-route open/close | `--dur-medium` | 280ms |
| Slow — card hover transform | `--dur-slow` | 380ms |
| Reveal — entry stagger on marketing | `--dur-reveal` | 900ms |
| Marquee — agent-name loop | `--dur-marquee` *(implied)* | 70s |
| Default easing | `--ease` | `ease` |
| Out (decelerate) | `--ease-out` | `cubic-bezier(.2,.7,.2,1)` |
| In-out | `--ease-in-out` | `cubic-bezier(.4,.0,.2,1)` |
| Reveal stagger per index | (rule) | 80ms |
| Ring pulse period | (rule) | 4–5s |
| Live-region throttle | (rule) | ≤ 4/sec |

These are the **only** values motion may take.

---

## 2. Motion budget per surface

The budget table from `brand/direction-A/usage-rules.md` is the canonical contract. Each row below extends it with implementation specifics.

| Surface | Budget | Reveal | Hover | Loop motion | Cursor glow | Grain | Live-region |
|---|---|---|---|---|---|---|---|
| **Marketing landing** | Full | Stagger 80ms/idx, 280ms transform + 380ms opacity, `ease-out` | 380ms transform on mode cards | Ring pulse 4–5s, marquee 70s | Yes | Yes | n/a |
| **In-app dashboard** | Reduced | None | 380ms transform on explainer cards | None | No | Yes (static) | Bell-count debounced ≤ 4/sec |
| **Verdict screen** | Minimal | Single 280ms fade-up on verdict entry only | None | None | No | Yes (static) | Toast `role="status"` debounced ≤ 4/sec |
| **Findings list** | Row-none, expand 200ms | None on the rows themselves | None | None | No | Yes (static) | Filter-to-zero count debounced ≤ 4/sec |
| **Intake 2-step** | Reduced | None | 380ms transform on intake/depth cards | None | No | Yes (static) | Soft-warning banner once on appear |
| **Settings / billing** | None beyond focus rings | None | Border `--line-1` → `--line-2` instant | None | No | Yes (static) | "Save changes" toast |
| **Email** | None | n/a | n/a | None | n/a | n/a | n/a |
| **Exported PDF / report** | None | n/a | n/a | None | n/a | n/a | n/a |
| **CLI-emitted Markdown (GitHub-rendered)** | None | n/a | n/a | None | n/a | n/a | n/a |

**Rationale per surface:**

- **Marketing landing** earns the full budget because it's the only public-facing surface where motion buys engagement. Cursor glow + grain + ring pulse + marquee define the brand's premium register.
- **Dashboard** ships at "Reduced" — the customer is here to do work, not to be entertained. Card hover survives because it's a Fitts's affordance (the card is reaching back to the cursor) more than a decorative one.
- **Verdict screen** ships at "Minimal" — the verdict is the content. Motion competes with the content for attention; we don't compete with our own product. The single fade-up on entry signals "result has arrived" and stops.
- **Findings list** is "row-none" because per-row choreography (HC2 / SC 2.2.1) would create an aria-live firehose if rows animated as they sorted/filtered. Expand/collapse is the only allowed motion and it's bounded to 200ms.
- **Settings / billing** is "none beyond focus rings" because every settings change is a legal/financial/data-state event. Motion suggests *celebration* or *delight*; settings need *confirmation* and *receipts*.
- **Email / PDF / GitHub Markdown** ship motion-less because the rendering surfaces strip CSS animations. Direction A renders gracefully as plain text because the brand is *structural*, not chromatic.

---

## 3. `prefers-reduced-motion` contract (binding)

The global guard in `design/components/_tokens/tokens.css` collapses all `transition-duration` and `animation-duration` to `0.01ms` and `animation-iteration-count` to `1` under `prefers-reduced-motion: reduce`. That's the floor. Specific surface-level requirements:

| Effect | Reduced-motion behavior |
|---|---|
| Cursor glow | Disabled (display:none). |
| Grain overlay | Static (no animation either way; overlay is not animated). |
| Marquee (agent-name loop) | Stops at first frame. Track does not translate. |
| Ring pulse on gate stage | Stops at idle radius. No periodic scale. |
| Reveal stagger on landing | Collapses to fade-in only — **no translateY**. Opacity 0→1 over ≤100ms; transform not applied. |
| Card hover transform | Collapses to a 1-step background-color shift (no `translateY`, no scale). |
| Verdict reveal | Collapses to opacity 0→1 over ≤100ms. No translateY. |
| Findings expand/collapse | Collapses to instant show/hide — height transition skipped. |
| Modal-route fade in/out | Collapses to instant. Focus management is unchanged (still moves to dialog `<h2>`). |
| Toasts (`role="status"` "Saved.") | Stay visible same duration; entry animation collapsed to instant. |

**SC 2.3.3 Animation from Interactions** is satisfied because every animation that responds to interaction respects the media query. **SC 2.2.2 Pause/Stop/Hide** is satisfied because no animation auto-plays longer than 5 seconds without a pause control *and* every animation respects `prefers-reduced-motion` regardless.

For the marquee specifically (70s loop) — it would technically run longer than 5 seconds, so it's published under the SC 2.2.2 exception that allows decorative content (no information conveyed) when `prefers-reduced-motion` stops it. The marquee carries the agent-name list, which is also rendered as a static `<ul>` for AT — so it doesn't carry unique information either.

---

## 4. Specific animation specs

### 4.1 Verdict reveal — single 280ms fade-up (locked)

**Surface:** `/app/audits/[run-id]` when SPA transitions from `running` → `verdict_emitted`.

```css
@keyframes verdict-reveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.sz-verdict-card.sz-just-resolved {
  animation: verdict-reveal var(--dur-medium) var(--ease-out) both;
}

@media (prefers-reduced-motion: reduce) {
  .sz-verdict-card.sz-just-resolved {
    animation: none;
    /* fallback: opacity-only fade-in handled by the global guard */
  }
}
```

- Triggered **once** on the SPA transition. No re-play on focus, scroll, or filter changes.
- 8px translate is the maximum — the verdict should feel like it *arrived*, not *flew in*.
- Score numerals, findings preamble, and findings list **do not** animate on entry. They render with the page.

### 4.2 Card hover — 380ms transform (locked)

**Surface:** Landing mode cards, dashboard explainer cards, intake cards.

```css
.sz-card[data-interactive="true"] {
  transition:
    transform var(--dur-slow) var(--ease),
    border-color var(--dur-slow) var(--ease);
}

.sz-card[data-interactive="true"]:hover,
.sz-card[data-interactive="true"]:focus-visible {
  transform: translateY(-3px);
  border-color: var(--line-3);
}

@media (prefers-reduced-motion: reduce) {
  .sz-card[data-interactive="true"]:hover,
  .sz-card[data-interactive="true"]:focus-visible {
    transform: none;
    /* border-color change still allowed; not motion */
  }
}
```

- 3px translate up. Never more. The card reaches back; it does not jump.
- Border swap from `--line-1` to `--line-3` for the focused/hovered state.

### 4.3 Findings expand/collapse — 200ms ease (locked)

**Surface:** `<FindingsRow>` in the verdict screen findings list.

```css
.sz-findings-row-body {
  /* visible-by-default approach: collapsed via grid-template-rows trick */
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--dur-fast) var(--ease);
}

.sz-findings-row[aria-expanded="true"] .sz-findings-row-body {
  grid-template-rows: 1fr;
}

.sz-findings-row-body > .sz-findings-row-inner {
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .sz-findings-row-body { transition: none; }
}
```

- The `grid-template-rows: 0fr → 1fr` trick allows the row to animate to its natural content height without `max-height` magic numbers.
- 200ms `ease` (`--dur-fast`). Long enough to read; short enough to feel responsive at the Doherty Threshold (< 400ms).
- Reduced-motion: collapses to instant show/hide. `aria-expanded` still toggles — no SR regression.

### 4.4 Live-progress region updates — debounced to ≤ 4/sec (locked per Halo HC2 / SC 2.2.1)

**Surface:** `/app/audits/[run-id]` while `state ∈ {dispatched, running}` (ES-AUDIT-RUNNING in `empty-states.md`).

```js
// Pseudo-implementation contract for Canvas's <LiveProgressRegion> primitive.
//
// One wrapper region (NOT one per reviewer row — per Halo A2-2 coalescing fix).
// SR users hear a coalesced summary at most 4×/sec; per-row visual updates are
// not aria-live.
//
// Component owns:
//   - per-row visual state (chip text, partial-finding count)
//   - the single coalesced live-region message
//   - the throttle (`requestAnimationFrame`-paced, capped at 4 fires/sec)
```

```html
<div role="status" aria-live="polite" aria-atomic="true" class="sz-live-region">
  <!-- coalesced message; updates at most 4×/sec -->
  Optic finished. 2 reviewers running. 4 minutes left.
</div>

<ul aria-label="Reviewer progress" class="sz-progress-rows">
  <!-- visual rows; NOT aria-live -->
  <li class="sz-progress-row" data-phase="finished">…</li>
  ...
</ul>
```

- The coalescing summary is the **only** SR-announced content. Per-row chip changes (e.g., `RUNNING` → `FINISHED`) are visual-only.
- Throttle rule: at most 4 announcements per second. The throttle is per-region, not per-reviewer.
- `prefers-reduced-motion`: chip transitions collapse to instant; live-region behavior unchanged (assistive tech requires the announcement regardless of motion preferences).

### 4.5 Reveal stagger on marketing landing (locked)

**Surface:** `/` only.

```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-medium) var(--ease-out);
}

.reveal.in {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger driven by data-d index per-element */
.reveal[data-d="1"] { transition-delay: 80ms; }
.reveal[data-d="2"] { transition-delay: 160ms; }
.reveal[data-d="3"] { transition-delay: 240ms; }
.reveal[data-d="4"] { transition-delay: 320ms; }
.reveal[data-d="5"] { transition-delay: 400ms; }

@media (prefers-reduced-motion: reduce) {
  .reveal { transform: none; transition: opacity 100ms ease; }
  .reveal[data-d] { transition-delay: 0ms; }
}
```

- `data-d` index multiplied by 80ms per `motion.rules.reveal_stagger_per_index`.
- IntersectionObserver applies the `.in` class when an element enters the viewport (threshold 0.08, rootMargin `0px 0px -8% 0px`).
- Reduced motion: transform stripped, delay zeroed, opacity-only fade at ≤100ms.

### 4.6 Cursor glow (landing only)

**Surface:** `/` only.

- 600px diameter, opacity 0.05 at center, 20px blur (tokens `cursor_glow.diameter_px`, `opacity_at_center`, `blur_px`).
- Lerps to pointer position at 0.08/frame damping.
- Disabled entirely under `prefers-reduced-motion` (no element rendered).
- Disabled on touch devices via `@media (hover: none) and (pointer: coarse)`.

### 4.7 Marquee (agent-name loop on `/team` section of landing)

**Surface:** `/` only.

- 70-second linear loop (`motion.rules.marquee_period`).
- `animation-iteration-count: infinite`.
- Under `prefers-reduced-motion: reduce`, the global guard sets `animation-iteration-count: 1` — the marquee plays once at infinite-frame-0-ish behavior, which effectively renders as a static row. The static `<ul>` of agent names always renders for AT regardless.

### 4.8 Ring pulse on gate stage

**Surface:** `/#audit` section on landing.

- 4–5 second period (`motion.rules.ring_pulse_period`).
- `ease-out` easing — rings expand outward and fade.
- Pure decoration (`aria-hidden="true"` on the SVG group).
- Reduced motion: stops at idle radius.

### 4.9 Toast notifications — Saved. / Fix copied to clipboard. / etc.

**Surface:** app shell global toast region.

```html
<div aria-live="polite" role="status" class="sz-toast-region">
  <!-- toasts render here -->
</div>
```

- Toast renders for 3s then fades out over `--dur-fast` (200ms).
- Entry animation: 200ms fade + 8px slide-up (`--dur-fast`, `--ease-out`).
- Reduced motion: entry collapses to instant; auto-dismiss timer unchanged.
- One toast at a time — queue rather than stack.

### 4.10 Modal-route open / close (Halo A1-1 contract)

**Surface:** `/app/cli/offline`, `/app/billing/token-budget-exceeded`, `/app/billing/free-tier-exhausted`, `/app/settings/account/delete`.

- Open: 200ms fade-in (`--dur-fast`, `--ease-out`); focus moves to dialog `<h2 tabindex="-1">`.
- Close (Esc / X button / browser-back): 200ms fade-out; focus returns to the triggering element ref captured in history state.
- Background scrim: `rgba(5,5,6,0.7)` (matches `--bg-0` translucent), no animation on entry.
- Reduced motion: open/close collapse to instant; focus management unchanged.

---

## 5. Per-surface SC compliance summary

| SC | Surface impact | How motion.md satisfies |
|---|---|---|
| **2.2.1 Timing Adjustable** | Live-region updates, countdowns | Live-region throttled ≤ 4/sec (§4.4). Countdowns (ES-429) rendered as static text, not live (per `empty-states.md`). |
| **2.2.2 Pause/Stop/Hide** | Marquee, ring pulse, cursor glow | All three respect `prefers-reduced-motion` (§3). Marquee carries no unique info (agent names also in a static `<ul>` for AT). |
| **2.3.3 Animation from Interactions** | All hover / focus / reveal animations | All animations are gated by the global media query (§3); every spec above documents its reduced-motion collapse. |

---

## 6. Implementation enforcement

Canon's brand-drift detector fails Phase 4 if any of the following appear in `design/components/**/*.css` or `design/screens/**/*.{css,jsx}`:

- A hardcoded duration (e.g., `transition-duration: 250ms`) instead of a token reference.
- An off-grid easing curve.
- An animation that does not include a `@media (prefers-reduced-motion: reduce)` override OR depend on the global guard.
- A live-region update mechanism that fires more than 4× per second on any single region.
- A `role="status"` applied to a stable route landing surface (Halo A2-1 fix — verdict-screen `<h1>` is the only exception).
- A motion-on entry on a Verdict, Findings-row, Settings, Email, or Exported-report surface.

The motion budget is enforced at component build time and at screen composition time. Drift is a Critical finding.

---

## 7. Coordinating notes (joint Pixel ↔ Canvas)

- **Canvas needs to ship** `<LiveProgressRegion>` (on the 14-list) with a coalesced single-region announcement primitive per Halo A2-2 — not 6 per-reviewer regions.
- **Canvas needs to ship** `<VerdictCard>` with the `sz-just-resolved` animation class hook so the SPA can apply the single 280ms fade-up on transition, then strip the class.
- **Canvas needs to ship** `<FindingsRow>` with the grid-template-rows expand/collapse pattern in §4.3 rather than `max-height` magic numbers.
- **Canvas needs to ship** `<ModalRoute>` with the focus-return-via-history-state contract per Halo A1-1.
- **Pixel's screens** never invent motion — they reference this doc. Any new motion need raises an issue here first; if accepted, it earns a token and a `@media (prefers-reduced-motion: reduce)` collapse rule before any screen uses it.

---

*End of motion grammar v0.1. Pixel + Canvas — Design layer. Tokens are the source of truth; this doc is how to read them.*
