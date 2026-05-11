# Direction C — Usage Rules

**Receipts** · Pixel · 2026-05-11

The brand has no accent color. The brand has no warm. The verdict carries the only color event in the system. Restraint is enforced by removing the option to be warm. Every rule below exists because Direction C's risk is *contributors quietly softening the register*. The softening is the regression. Police it.

---

## Logo clear-space

- Mark clear-space = **diameter × 0.5** all four sides (same as A/B).
- Lockup clear-space = **wordmark cap-height × 0.8** (tighter than A's 1.0 — brutalist register packs tighter).

## Minimum size

| Application | Minimum size |
|---|---|
| Mark-alone (favicon) | 16×16 px |
| Mark-alone (UI / nav) | 20×20 px (slightly smaller than A's 22 — denser register) |
| Lockup (mark + wordmark, horizontal) | 88 px wide |
| Print | 10 mm wide |

## Prohibited uses

All Direction A prohibitions, plus the *Direction C invariants*:

- **No brand-warm accent. No warm cream. No tinted neutrals.** Direction C's ink scale is achromatic (oklch hue = 0). Adding warm tint regresses the brand. Canon flags as Critical.
- **No pill-radius (`border-radius: 999px`) anywhere except the verdict-state chip itself.** Pills read as "SaaS-friendly." Direction C is brutalist-editorial. Chips, tags, buttons, inputs are 0px or 2px radius.
- **No drop-shadows. No glows. No gradients on surfaces** (the verdict chip fill is the single permitted gradient, and only because PRD §7.2 locks the verdict chip background).
- **No auto-playing motion.** No marquee, no ring pulse, no ambient animation. Motion happens on user interaction, ≤180ms.
- **No cursor-glow.**
- **No press-ink, no SaaS-blue, no any-blue.** If a structural color is needed for hyperlinks, use underline + `--ink-0` hover state. Color is not how Direction C signals interactivity.
- **No serif body type.** Instrument Serif is restricted to italicized H1 phrases and verdict-screen headlines. Long-form prose is Geist sans, not serif.
- **No illustrations. No decorative imagery. No "team smiling at laptop" photography.** Direction C has no imagery vocabulary by design.
- **No emoji adjacent to product copy.** Mono register breaks when emoji land in it.

## Do / Don't pairs

| ✓ Do | ✗ Don't |
|---|---|
| Set step titles, eyebrows, metadata in Geist Mono | Set them in Geist sans because "it feels softer" |
| Use 2px radius on cards / buttons / inputs | Use 6px (A's default) — regresses toward Direction A |
| Use 0px radius on chips, tags, status indicators | Use pill-radius — regresses toward SaaS |
| Set numeric stats in `mono-large` (Geist Mono 28 px) | Set them in serif-italic (that's Direction A) |
| Reserve serif for italicized H1 phrases + verdict headline only | Use serif for blog body / long-form prose |
| Underline hyperlinks at default state; remove underline on hover | Use a blue (any blue) to indicate links |
| Hover states change border color only (`line-1` → `line-3`) | Hover states translate, lift, shadow, or scale |
| Live-region updates throttle to ≤4/sec (Halo HC2) | Stream every event as it arrives |
| Use `--ink-3` for chip borders and decorative hairlines only | Use `--ink-3` for body copy (3.6:1 — fails AA body) |

## Contrast pairings (locked)

Body text (≥4.5:1 required):

| Token | On | Ratio | Use |
|---|---|---|---|
| `--ink-0` (#fafafa) | `--bg-0..4` | 14.4–19.4:1 | Headlines, primary text |
| `--ink-1` (#cccccc) | `--bg-0..4` | 9.3–12.6:1 | Body text |
| `--ink-2` (#a8a8a8) | `--bg-0..4` | 6.1–8.2:1 | Secondary text |

Decoration-only (must NOT carry body copy):

| Token | On | Ratio | Allowed use |
|---|---|---|---|
| `--ink-3` (#707070) | `--bg-0..1` | 3.4–3.6:1 | Large text (≥18.66 px reg / ≥14 px bold), chip borders, decorative hairlines |
| `--line-3` (#3a3a3e) | `--bg-0` | 1.5:1 | Decorative hairlines only — never text |

**Canon enforcement:** non-listed pairs forbidden in production CSS.

## Motion appropriateness

| Surface | Motion budget |
|---|---|
| Marketing landing | ≤180ms hover transitions. No marquee. No reveal stagger >40ms per index. Static-by-default. |
| In-app dashboard | ≤120ms transitions. No auto-playing motion. Live-region throttle ≤4/sec. |
| Verdict screen | Verdict reveal at 240ms fade-in. No looping. The verdict chip is large; the appearance is the event. |
| Findings list | Expand/collapse at 120ms. No staggered reveal. |
| Settings / billing | None beyond focus rings. |
| Email | None. |
| PDF / static export | None. |

`prefers-reduced-motion` collapses durations to ≤80ms and disables all transforms.

## Mono-percentage check (Canon enforces)

For any rendered viewport in the product:
- ≥40% of rendered glyphs are Geist Mono. If <40%, the screen has drifted toward sans-only and is no longer in the Direction C register. Canon's drift detector measures this on each release.
- Mono surfaces include: all navigation chrome, all metadata, all numbers, all severity tags, all timestamps, all status indicators, all file paths, all command examples, all in-app row metadata, footer text.
- Sans surfaces include: paragraph prose, button labels, headlines (display-XL/L/M).

This rule prevents the most common Direction C regression: contributors switching mono → sans because "it feels easier to read." Mono *is* the brand. Read-ease is solved by line-height, x-height, and letter-spacing tokens, not by font swap.

## Photography & imagery

**There is no photography vocabulary in Direction C.** No decorative images. No illustrations. No hero photography. The brand is type and structure exclusively.

When marketing absolutely needs imagery (e.g., a product screenshot in a launch tweet), the imagery is:
- A literal product screenshot (no annotation overlays beyond the product UI itself)
- Or a verdict-chip rendered standalone (the chip IS the marketing asset)

No other imagery ships under Direction C without escalating to Pixel + BigBrain.

## Iconography

- Stroke weight: **1.25 px** on 24×24 canvas (lighter than A's 1.5 — register is more delicate-precise than warm-editorial)
- Style: outline only, no fill, **sharp corners** (corner-radius 0 on icon strokes — matches the 0px chip radius)
- Recommended pack: **Tabler** or **Phosphor (regular weight)**. The icon line-weight matches Geist Mono's stroke density.
- Icon color: `--ink-2` default, `--ink-0` emphasis. Never colored.

## Component application

- **Buttons primary**: `--ink-0` fill, `--bg-0` text, 2 px radius. No gradient.
- **Buttons ghost**: transparent fill, `--ink-1` text, `--line-2` border, 2 px radius. Hover: border → `--line-3`.
- **Chips, status pills**: `--bg-3` fill, `--ink-1` text, `--line-1` border, **0 px radius (sharp)**. Geist Mono.
- **Inputs**: `--bg-3` fill, `--ink-0` text, `--line-2` border, 2 px radius. Focus: `--line-3` border + `2px outline-offset 2px` outline in `--ink-0`. (Outline is the brutalist focus signal — sharp, visible, no glow.)
- **Cards**: `--bg-1` fill, `--line-1` border, 2 px radius, 24 px padding desktop / 20 px mobile.
- **Hyperlinks**: `--ink-0` color, underline at default, underline-removed on hover. No color swap.

## When to break a rule

You don't. Direction C's enforcement is stricter than A/B because Direction C's risk profile is higher: every regression toward warmth or roundness drains the register. If a real product need surfaces a missing token (e.g., a long-form blog body that genuinely needs serif), escalate to Pixel + BigBrain for a brand-guide amendment — and consider whether the use-case is signaling that Direction B (which solves bone long-form natively) was the better pick all along.
