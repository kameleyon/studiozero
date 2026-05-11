# Direction A — Usage Rules

**The Auditor's Notebook** · Pixel · 2026-05-10

The brand carries on typography and restraint. The rules below are how restraint is enforced when contributors aren't looking.

---

## Logo clear-space

- Minimum clear space around the lockup = **height of the wordmark cap-height × 1.0** on all four sides.
- For the mark-alone (no wordmark), clear space = **diameter of the mark × 0.5** on all four sides.
- Nothing — not navigation, not chrome, not other type — enters the clear-space rectangle. Background photography, gradients, and grain *may* pass through; UI elements may not.

## Minimum size

| Application | Minimum size |
|---|---|
| Mark-alone (favicon, app icon) | 16×16 px |
| Mark-alone (UI / nav) | 22×22 px (current template baseline) |
| Lockup (mark + wordmark, horizontal) | 96 px wide |
| Lockup (vertical, stacked) | 80 px wide |
| Print | 12 mm wide |

Below minimums, fall back to the mark-alone — never shrink the wordmark below 11 px cap-height.

## Prohibited uses

- **No drop-shadow on the mark.** The brand is hairline-and-grain elevation. A drop-shadow breaks register.
- **No gradients on the wordmark.** Solid `--ink-0` or solid `--bg-0` only.
- **No outline-only wordmark.** The wordmark is set, not stenciled.
- **No rotation > 0°.** Studio Zero is published, not tilted.
- **No warp, no skew, no stretching the lockup.** Aspect ratio is locked.
- **No re-coloring the wordmark to brand-warm.** The cream accent is editorial flourish, not a logo color.
- **No verdict-color recolor of the logo, ever.** A logo in `#C8421A` would imply Studio Zero itself has failed — verdict colors are reserved per PRD §7.2 Step D.
- **No emoji adjacent to the logo.** Ever. This is a hard rule.
- **No "powered by" placement** on customer-owned surfaces unless a co-marketing agreement is in place (Signal owns the agreement template).

## Do / Don't pairs

| ✓ Do | ✗ Don't |
|---|---|
| Set H1 phrases in Geist with selected words in *Instrument Serif italic* | Set entire H1 in Instrument Serif (display-only face fatigues at scale) |
| Use `--ink-3` for hairline labels and chip borders | Use `--ink-3` for body copy (3.2:1 contrast — fails AA body) |
| Use `--warm` accent for one italicized phrase per section | Use `--warm` accent as a button fill or background |
| Set numeric data and stat numerals in Instrument Serif italic | Set running prose in Instrument Serif italic |
| Use Geist Mono UPPERCASE with `letter-spacing: 0.08em` for eyebrows | Use Geist Mono sentence-case for body copy |
| Pair a hairline (`1px solid var(--line-1)`) with `bg-1` cards | Stack drop-shadows to fake elevation |
| Animate at 220ms ease (default) | Animate at >400ms unless it's a reveal-stagger |
| Hide grain + cursor-glow under `prefers-reduced-motion` | Animate on motion-sensitive surfaces (verdict screen, evidence viewer) |

## Contrast pairings (locked)

Body text (≥4.5:1 required):

| Text token | On | Ratio | Use |
|---|---|---|---|
| `--ink-0` (#f3f3f4) | `--bg-0` to `--bg-4` | 13.6:1 – 18.4:1 | Headlines, primary text |
| `--ink-1` (#d4d4d6) | `--bg-0` to `--bg-4` | 10.1:1 – 13.7:1 | Body text (default) |
| `--ink-2` (#9a9aa2) | `--bg-0` to `--bg-4` | 5.0:1 – 6.8:1 | Secondary text, sub-headers |
| `--warm` (#cfc4b3) | `--bg-0` to `--bg-2` | 10.1:1 – 11.4:1 | Italicized editorial phrases |

Decoration-only (must NOT be used for body copy):

| Token | On | Ratio | Allowed use |
|---|---|---|---|
| `--ink-3` (#6b6b72) | `--bg-0` | 3.2:1 | Large text (≥18.66 px reg / ≥14 px bold) only; chip borders; hairline metadata |
| `--line-3` (#3a3a40) | `--bg-0` | 1.4:1 | Decorative hairlines only — never carries text |

**Canon enforcement:** any token combination not listed above is forbidden in production CSS. Canon's brand-drift detector flags non-listed pairs as a Critical finding.

## Motion appropriateness

| Surface | Motion budget |
|---|---|
| Landing / marketing | Full motion: reveal stagger, cursor glow, grain, marquee, ring pulses |
| In-app dashboard | Reduced: 220ms transitions, no auto-playing motion, throttled live-region updates (≤4/sec, Halo HC2) |
| Verdict screen | Minimal: verdict reveal on entry (single 280ms fade-up), no looping motion, no cursor glow. The verdict is the content; motion is a distraction. |
| Findings list | None on the row itself; expand/collapse at 200ms `ease`. No staggered reveal — accessibility-tested order matters more than choreography. |
| Settings / billing | None beyond default form-input focus rings. Settings are *work*, not theatre. |
| Email | None at all (rendered without JS; many clients strip CSS animations). |
| Exported PDF / report | None (static document). |
| CLI-emitted Markdown rendered on GitHub | None (GitHub strips CSS). Direction A renders gracefully as plain Markdown because the brand is structural, not chromatic. |

`prefers-reduced-motion` is honored everywhere with no exceptions. The reduced-motion rule in `tokens.json§motion.prefers_reduced_motion` is the source of truth.

## Photography & imagery (deferred)

Direction A does not specify photography style at this draft — the MVP brand is type-and-structure. When marketing escalates to needing imagery (Signal's call, post-launch):
- No stock photos of "diverse teams pointing at a laptop." Ever.
- Photography, if any, follows the same register: editorial, ambient, no-people-look-at-camera, desaturated. Reference: NYT photography section, FT Weekend, MIT Tech Review long-form.
- Illustrations: none. The brand earns its emotion from type, not illustration.

## Iconography

- Stroke weight: 1.5 px on a 24×24 canvas
- Corner radius on icon strokes: 1 px (subtle)
- Style: outline-only, no fill
- Recommended pack: **Lucide** or **Phosphor (light weight)**. Custom marks only when no pack icon fits.
- Icon size in UI: 16 / 20 / 24 px. Nothing else.

## Component application

- **Buttons primary** (`--btn-primary`): `--ink-0` fill, `--bg-0` text. Pill radius. No gradient.
- **Buttons ghost** (`--btn-ghost`): transparent fill, `--ink-1` text, `--line-2` border. Pill radius.
- **Chips, status pills**: `--bg-3` fill, `--ink-2` text, `--line-1` border, Geist Mono UPPERCASE.
- **Inputs**: `--bg-3` fill, `--ink-1` text, `--line-2` border, 6 px radius. Focus state: `2px solid var(--focus-ring)` + `outline-offset: 2px` (per `tokens.json§focus`; satisfies SC 1.4.11 + SC 2.4.13). No glow.
- **Cards**: `--bg-1` fill, `--line-1` border, 14 px radius, 36 px padding desktop / 24 px mobile.

## WCAG 2.2 Success Criteria — implementation rules

These are added v0.1.1 per Halo Phase 2 audit. Spec'd in `tokens.json§wcag_2_2_compliance`. Canon enforces.

| SC | Rule | Where it applies |
|---|---|---|
| **1.4.3 Contrast (Minimum)** | Body text ≥4.5:1; large text ≥3:1; non-text UI ≥3:1 | Every text/bg pair |
| **1.4.10 Reflow** | Renders at 320 CSS px without horizontal scroll | Every page, every breakpoint |
| **1.4.11 Non-text Contrast** | Focus rings, borders, icons ≥3:1 against adjacent colors | All UI components |
| **1.4.12 Text Spacing** | User-overridable line-height + letter-spacing + paragraph-spacing | Every prose surface |
| **2.4.11 Focus Not Obscured (Minimum)** | Sticky nav must not hide focused inputs; `scroll-padding-top` honored | Sticky-nav pages |
| **2.4.13 Focus Appearance** | 2 px focus ring + 2 px offset; ≥3:1 against both bg and adjacent content | Every interactive control |
| **2.5.7 Dragging Movements** | Non-drag alternative for every drag (keyboard reorder + "Move to…" menu) | Findings list, severity buckets |
| **2.5.8 Target Size (Minimum)** | Interactive controls ≥24×24 CSS px hit area | All buttons, links, icon buttons, checkboxes, toggles |
| **3.3.7 Redundant Entry** | Don't re-prompt info entered earlier in a multi-step flow | Signup → BYOK → project intake |
| **3.3.8 Accessible Authentication (Minimum)** | API key paste accepts paste; supports password manager; no CAPTCHA on key-paste step; show/hide keyboard-operable | API key entry, login |

**Canon enforcement:** any component shipping without satisfying every applicable SC above produces a Critical finding. axe-core runs PR-blocking on Critical + Serious violations per PRD §18.

---

## When to break a rule

You don't. Every rule above traces to either: (a) PRD §7.2 Step D verdict-screen lock, (b) PRD §14.6 a11y requirement, (c) Canon's consistency invariant. Breaking any rule produces a Canon Critical finding. If a real product need forces a deviation, escalate to Pixel + Canon + BigBrain for a brand-guide amendment — never deviate silently.
