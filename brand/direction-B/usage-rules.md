# Direction B — Usage Rules

**Hard Evidence** · Pixel · 2026-05-10

Two surfaces, one brand. The dark surface is the live product. The bone surface is every artifact the customer exports, forwards, or screenshot-shares. Both surfaces are first-class; neither is an afterthought.

---

## Surface assignment (binding)

| Surface | Mode | Rationale |
|---|---|---|
| Marketing landing page | Dark | Brand entry point; matches PRD §15.5 channel surfaces (X/HN/IH) where dark hero is the norm |
| In-app dashboard | Dark | Live work; matches reader's other dev tools |
| Audit verdict screen (in-app) | Dark | Verdict chip color is the focal point; dark frame maximizes chip contrast |
| Exported verdict PDF | **Bone** | Paper artifact; printable; defensible at a 1:1 PDF reader |
| PR-body Markdown (V1.5 Auto-PR) | **Bone** | Renders inside GitHub which is light-mode default for most readers |
| Transactional email (E1–E5) | **Bone** | Most clients render light by default; bone reads as paper-stationery not "we forgot to test dark mode" |
| Long-form blog / docs site | **Bone** | Reading register; serif holds at long lengths |
| Status page | Dark | Live data surface; matches product |
| Customer-shared screenshot (social) | Dark (default) | Brand surface for X/HN. Bone permitted when sharing a *receipt* (verdict PDF) for editorial register. |

**No mixed-mode surfaces.** A single rendered surface is one or the other. The brand never half-converts inside a viewport.

---

## Logo clear-space

Same as Direction A: cap-height × 1.0 around the lockup; diameter × 0.5 around the mark-alone.

## Minimum size

Same minimum sizes as Direction A. Bone-mode logo has *additional* minimum size of 24×24 px for the mark — at 16 px on bone, the inner ring blurs against the bone texture; favicon falls back to a darker variant.

## Prohibited uses

All Direction A prohibitions, plus:

- **No warm-cream accent on bone.** Warm and bone are both warm-tonal; the accent vanishes (contrast 1.13:1). Use `press-ink-bone` instead.
- **No press-ink on UI buttons.** Press-ink is a *structural* color — links, callouts, score numerators. Buttons stay neutral (`--ink-0` fill on dark, `--ink-b0` fill on bone). The brand does not use color to direct action; it uses color to mark *evidence*.
- **No mode-flip animation.** Dark-to-bone is not a "dark mode toggle." The surface is determined by the artifact, not the viewer's preference. (Future: an auth'd user may opt to render the in-app dashboard in bone, but not in the MVP.)
- **No grain overlay on bone.** Bone is paper-clean; grain on paper reads as "low-res JPEG."
- **No cursor-glow on bone.** Same rationale — bone is static-document, not theater.
- **No serif body type on dark.** Source Serif 4 is bone-only; Instrument Serif on dark is permitted only for italicized H1 phrases (Direction A rule).

## Do / Don't pairs

| ✓ Do | ✗ Don't |
|---|---|
| Set exported PDF body in Source Serif 4, 16 px, line-height 1.62, on `--bone-0` | Set PDF body in Geist (sans on paper at 16 px fatigues over 800 words) |
| Use `press-ink-bone` (#0f2748) for hyperlinks in bone-mode prose | Use `press-ink-bone` for button fills or icon strokes |
| Set the score numerator (e.g., the "68" in "68 / 100") in `press-ink-bone` on bone, `press-ink-dark` on dark | Set the entire score block in press-ink (drowns the brand in blue) |
| Render the verdict chip color identically on both surfaces (`#C8421A`, `#E4C875`, `#14C8CC`) | Lighten/darken verdict colors for bone — verdict colors are PRD-locked |
| Set bone-mode body text in `--ink-b1` (#2d2922), not `#000000` | Use pure black on bone (vibrates against warm paper, fatigues) |
| Use grain only on dark surfaces | Add grain to bone surfaces |
| Switch decorative-only `--ink-3` (dark) / `--ink-b3` (bone) for hairline labels | Use either for body text — both fail 4.5:1 |

## Contrast pairings (locked)

**Dark surface** (same as Direction A):

| Text | On | Ratio | Use |
|---|---|---|---|
| `--ink-0` | `--bg-0..4` | 13.6–18.4:1 | Headlines |
| `--ink-1` | `--bg-0..4` | 10.1–13.7:1 | Body |
| `--ink-2` | `--bg-0..4` | 5.0–6.8:1 | Secondary |
| `--warm` | `--bg-0..2` | 10.1–11.4:1 | Editorial flourish |
| `--press-ink-dark` | `--bg-0..2` | 11.5–13.4:1 | Links, structural emphasis |
| `--ink-3` | `--bg-0..1` | 3.0–3.2:1 | Large text / chip borders only |

**Bone surface:**

| Text | On | Ratio | Use |
|---|---|---|---|
| `--ink-b0` (#1a1814) | `--bone-0..2` | 11.4–14.2:1 | Headlines, primary body |
| `--ink-b1` (#2d2922) | `--bone-0..1` | 10.5–11.5:1 | Body default |
| `--ink-b2` (#5a5346) | `--bone-0..1` | 5.6–6.2:1 | Secondary |
| `--press-ink-bone` (#0f2748) | `--bone-0..1` | 10.5–12.5:1 | Links, structural emphasis |
| `--ink-b3` (#7a7163) | `--bone-0` | 3.4:1 | Large text / decoration only |

**Verdict-on-bone:**
- FAIL chip `#C8421A` with `#f3ede0` text → ratio ~5.1:1 ✓ AA body
- PASS-WITH-FIXES chip `#E4C875` with `#1a1814` text → ratio ~11.6:1 ✓ AAA
- PASS chip `#14C8CC` with `#1a1814` text → ratio ~8.4:1 ✓ AAA

**Canon enforcement:** non-listed combinations forbidden. Bone-mode export pipeline runs an axe-core pass before any PDF is delivered.

## Press-ink usage budget (hard cap)

`press-ink` (in either surface form) is a **single-purpose structural color.** Per rendered viewport / page:

- ≤1 structural callout (e.g., one inline pull-quote underline, one section-divider rule)
- All hyperlinks in long-form prose (no per-page cap; this is the inline-link color)
- The numerator of the score block on the verdict screen (one instance per verdict)

That's it. No press-ink icons. No press-ink buttons. No press-ink decorative tabs. Canon flags any other use as a Critical finding.

## Motion appropriateness

| Surface | Motion budget |
|---|---|
| Dark landing | Full (reveal stagger, cursor glow, grain, ring pulses) — same as Direction A |
| Dark in-app | Reduced (220ms, no auto-playing, throttled live-region updates ≤4/sec) |
| Bone PDF / static export | **None.** Static document. |
| Bone email | **None.** Email clients strip animations. |
| Bone PR-body Markdown | **None.** GitHub strips CSS. |
| Bone blog / long-form | Minimal: link-hover color shift (instant), no scroll-tied animation |
| Verdict screen (either surface) | Minimal: single 280ms verdict reveal on entry, no looping |

`prefers-reduced-motion` honored universally on dark surfaces; bone surfaces have no motion to reduce.

## Photography & imagery

Same as Direction A (deferred; no illustrations; editorial-register photo style if needed).

**Bone-specific note:** if photography ships on a bone surface, desaturate further (warm-paper register doesn't tolerate saturated photo), aim for sepia-adjacent treatment that sits inside the bone palette. Avoid full-color photography on bone — it reads as "magazine spread we couldn't afford to design properly."

## Iconography

Same icon system as Direction A (Lucide / Phosphor light, 1.5 px stroke, 16/20/24 sizes). Stroke color:
- Dark surface: `--ink-1` default, `--ink-0` emphasis
- Bone surface: `--ink-b1` default, `--ink-b0` emphasis
- Never `--press-ink` (icons are not links)

## Component application

Dark mode: identical to Direction A.

Bone mode:
- **Buttons primary**: `--ink-b0` fill (#1a1814), `--bone-0` text (#f3ede0). Pill radius.
- **Buttons ghost**: transparent fill, `--ink-b1` text, `--line-b2` border. Pill radius.
- **Chips, status pills**: `--bone-2` fill, `--ink-b2` text, `--line-b1` border, Geist Mono UPPERCASE.
- **Inputs**: `--bone-1` fill, `--ink-b0` text, `--line-b2` border. Focus state: `--press-ink-bone` border (the one place press-ink touches a UI control — focus is a structural state, not a decorative one).
- **Cards**: `--bone-1` fill, `--line-b1` border, 14 px radius.
- **Hyperlinks**: `--press-ink-bone`, no underline by default, underline on hover. Same hover behavior as dark-mode links (which use `--press-ink-dark`).

## When to break a rule

Same as Direction A: you don't. Direction B's *additional* enforcement risk is the two-surface boundary — contributors will be tempted to "mix" (a bone card on a dark page, a press-ink icon, a warm-cream on bone). Each is a Canon Critical finding. The surface-assignment table at the top of this file is binding.
