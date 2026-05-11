# Phase 2 Audit — Halo (Independent Accessibility Reviewer)

**Auditor:** Halo
**Phase:** BUILD_FLOW Phase 2 — Brand Identity (independent a11y conformance pass)
**Standard:** WCAG 2.2 Level AA (PRD §14.6)
**Subject:** Pixel's three brand directions — A "Auditor's Notebook", B "Hard Evidence", C "Receipts"
**Date:** 2026-05-11
**Verdict colors under audit:** FAIL `#C8421A`, PASS WITH FIXES `#E4C875`, PASS `#14C8CC` (PRD §7.2 Step D — reserved, non-negotiable)

---

## Method

I recomputed contrast ratios independently from sRGB hex values using WCAG 2.2 relative-luminance math (L = 0.2126·R_lin + 0.7152·G_lin + 0.0722·B_lin after sRGB linearization; ratio = (L_lighter + 0.05) / (L_darker + 0.05)). I did **not** trust Pixel's `_contrast_pairs` blocks — I verified them. Pixel's reported numbers are mostly correct but several are conservatively under-reported (e.g., ink-2 on bg-0 is closer to 7.3:1 than the claimed 6.8:1) and one is consequentially over-reported (the FAIL chip on bone — see §B below). I cite SC numbers for every finding. I do not soften.

This is a token-system audit, not an implementation audit. A token system can pass on paper and still ship inaccessible — the implementation audit happens at M5. But a token system that ships with broken pairs cannot be made AA-conformant later without a brand-spec amendment, so token-time is the cheapest moment to catch failure. That is why I am here.

---

## Direction A — The Auditor's Notebook

### Contrast re-computations (8 critical pairs)

| # | Pair | Hex pair | Pixel claim | Halo recomputed | AA body 4.5:1 | AA large 3:1 | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Verdict-screen H1 (ink-0) on bg-0 | `#f3f3f4` / `#050506` | 18.4:1 | **18.1:1** | ✓ | ✓ | PASS (slight under-claim) |
| 2 | Body (ink-1) on bg-0 | `#d4d4d6` / `#050506` | 13.7:1 | **13.8:1** | ✓ | ✓ | PASS |
| 3 | Body (ink-1) on bg-1 | `#d4d4d6` / `#0a0a0c` | 13.0:1 | **13.1:1** | ✓ | ✓ | PASS |
| 4 | Secondary (ink-2) on bg-0 | `#9a9aa2` / `#050506` | 6.8:1 | **7.3:1** | ✓ | ✓ | PASS (Pixel under-claimed) |
| 5 | Link / structural (no link token — see finding A-3) | n/a | n/a | n/a | — | — | **HC** |
| 6 | Focus ring (`line-3` border on bg-0) | `#3a3a40` / `#050506` | not declared | **1.80:1** | ✗ | ✗ | **FAIL SC 1.4.11 + SC 2.4.13** |
| 7 | FAIL verdict color on bg-0 (as colored text) | `#C8421A` / `#050506` | not pair-tested | **4.12:1** | ✗ | ✓ | **FAIL if used as text** — Pass as filled chip with light text |
| 8 | PASS verdict color on bg-0 (as colored text) | `#14C8CC` / `#050506` | not pair-tested | **9.86:1** | ✓ | ✓ | PASS |
| 9 | PWF verdict color on bg-0 (as colored text) | `#E4C875` / `#050506` | not pair-tested | **12.4:1** | ✓ | ✓ | PASS |

### Findings — Direction A

**A-1. CRITICAL — Focus ring fails SC 1.4.11 *Non-text Contrast* and SC 2.4.13 *Focus Appearance*.**
`usage-rules.md` §"Component application" says inputs receive "Focus state: `--line-3` border, no glow." `--line-3` (#3a3a40) on `--bg-0` (#050506) computes to **1.80:1** against the canvas, and against the input's `--bg-3` fill (#16161a) it computes to ~1.5:1. SC 1.4.11 requires non-text UI components to clear **3:1 against adjacent colors**; SC 2.4.13 requires focus indicators to clear **3:1 against both the focused state and the unfocused state**. The "no glow" rule is fine aesthetically; the missing accessible focus-ring token is not. **This is a token-level failure. Direction A as specified cannot ship AA-conformant inputs.**

**A-2. CRITICAL — FAIL verdict color #C8421A fails SC 1.4.3 as text-on-bg.**
4.12:1 against bg-0 misses the 4.5:1 AA-body threshold by ~9%. **Mitigated** by Pixel's chip-fill pattern (red rectangle with light text inside; verdict-screen H1 reads the *word* in light ink on the red chip, not red on canvas), but the chip-fill pattern is the *only* compliant rendering. The token system does not forbid using `#C8421A` as colored text on the dark canvas, and the verdict-frame spec implies a thin red hairline. Canon must enforce: **`#C8421A` is never set as `color:` on a dark background — only as `background-color:`**. Add to usage-rules.md.

**A-3. MAJOR — No hyperlink token. SC 1.4.1 *Use of Color* risk.**
Direction A has no defined hyperlink color. If contributors default to browser-blue or coerce `--warm` into link duty, SC 1.4.1 *Use of Color* is at risk (color alone signaling interactivity). Direction A's restraint is the brand voice; that voice is silent on hyperlinks. Either (a) define `--warm` as a link color with mandatory underline at default state, or (b) lock `--ink-0` underlined as the link pattern (Direction C's approach). The usage-rules does not address this.

**A-4. HC — Silent on six WCAG 2.2 SCs.**
`usage-rules.md` and `tokens.json` do not reference: SC 2.4.11 (Focus Not Obscured), SC 2.4.13 (Focus Appearance — failure compounded with A-1), SC 2.5.7 (Dragging Movements), SC 2.5.8 (Target Size 24×24 — spacing scale includes 2/4/6/8 px values that could produce sub-24 px controls; no min-target rule), SC 3.3.7, SC 3.3.8. PRD §14.6 declares these in scope. Brand spec must not be silent on them.

**A-5. HC — SC 1.4.10 Reflow not addressed by token system.**
`display-xl` is 108 px at desktop with no responsive cap. At 320 CSS px viewport, this will overflow without a responsive type scale. `wrap_padding_x_mobile: 20` leaves 280 px content area — display-xl 108 px will not fit. Need a responsive scale or fluid type tokens. Same issue in B and C.

**A-6. HC — SC 1.4.12 Text Spacing not formalized.**
Line-height 1.55 body meets the ≥1.5 minimum; letter-spacing -0.005em body is harmless; paragraph-spacing is not tokenized. User-override behavior unspecified. Should be declared explicitly.

### Verdict — Direction A: **PASS WITH FIXES**

Token system is mostly clean. The focus-ring failure (A-1) is a real, fixable miss; the verdict-color-as-text edge case (A-2) is a documentation gap; the missing link token (A-3) is a brand-voice gap. None require ripping up the direction. **Promotable with mandatory fixes A-1, A-2, A-3 and SC-coverage addendum A-4.**

---

## Direction B — Hard Evidence

### Contrast re-computations (8 critical pairs — bone surface focus, dark surface inherits A)

| # | Pair | Hex pair | Pixel claim | Halo recomputed | AA body 4.5:1 | AA large 3:1 | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Verdict H1 (ink-b0) on bone-0 | `#1a1814` / `#f3ede0` | 14.2:1 | **14.6:1** | ✓ | ✓ | PASS |
| 2 | Body (ink-b1) on bone-0 | `#2d2922` / `#f3ede0` | 11.5:1 | **11.7:1** | ✓ | ✓ | PASS |
| 3 | Body (ink-b1) on bone-1 | `#2d2922` / `#e8e1d1` | 10.5:1 | **10.6:1** | ✓ | ✓ | PASS |
| 4 | Secondary (ink-b2) on bone-0 | `#5a5346` / `#f3ede0` | 6.2:1 | **6.4:1** | ✓ | ✓ | PASS |
| 5 | Link (press-ink-bone) on bone-0 | `#0f2748` / `#f3ede0` | 12.5:1 | **12.2:1** | ✓ | ✓ | PASS |
| 6 | Focus on bone input (press-ink-bone border vs bone-1) | `#0f2748` / `#e8e1d1` | not pair-tested | **11.2:1** | ✓ | ✓ | PASS — best focus spec across A/B/C inputs |
| 7 | FAIL chip frame `#c89890` on bone-0 | `#c89890` / `#f3ede0` | not pair-tested | **2.06:1** | n/a (text-internal) | ✗ | **FAIL SC 1.4.11** — frame border fails 3:1 |
| 8 | FAIL chip-fill with bone text inside: `#f3ede0` on `#C8421A` | `#f3ede0` / `#C8421A` | 5.1:1 | **5.05:1** | ✓ | ✓ | PASS |
| 9 | PASS chip on bone-0 (chip-fill vs bone canvas non-text contrast) | `#14C8CC` / `#f3ede0` | not pair-tested | **1.70:1** | n/a | ✗ | **FAIL SC 1.4.11** as adjacent-color non-text unless frame present at ≥3:1 |
| 10 | PWF chip on bone-0 (same) | `#E4C875` / `#f3ede0` | not pair-tested | **1.35:1** | n/a | ✗ | **FAIL SC 1.4.11** |

### Findings — Direction B

**B-1. CRITICAL — Bone-mode verdict-chip frames fail SC 1.4.11.**
Pixel specs hairline frames on bone: FAIL frame `#c89890` (2.06:1 vs bone-0), PWF frame `#c8b090` (~1.6:1), PASS frame `#b8ad95` (~1.7:1). All three **fail the 3:1 non-text contrast threshold**. On bone canvas, the verdict chips have low chromatic contrast against the warm paper (#14C8CC against #f3ede0 = 1.7:1; #E4C875 against #f3ede0 = 1.35:1), meaning the chips themselves are visually weak — and the frame intended to compensate is also weak. **Verdict semantics rely on the chip being visually distinct from the canvas.** Frames must be re-toned to clear 3:1, *or* chip-fills must be hue-shifted (which violates PRD §7.2 lock — not an option). Re-toning frames is the only path. Suggested: FAIL frame `#8a1f0a` (the bone-mode blocker-tag text color — already in the token block) clears ~6:1 against bone-0; reuse it.

**B-2. CRITICAL — Inherits Direction A's focus-ring failure on the dark side.**
Direction B reuses Direction A's dark-side spec verbatim. A-1 carries over: `--line-3` focus border at 1.80:1 fails SC 1.4.11 + SC 2.4.13 on every dark-mode input. The bone side (press-ink-bone border) is fine and is in fact the model the dark side should adopt.

**B-3. MAJOR — Warm cream on bone explicitly forbidden (good) but no cross-mode token-collision detection.**
The `_warm_on_bone_REJECTED` annotation (1.13:1) is correctly self-flagged. But the brand has no automated guard: a contributor who hand-codes a bone surface and grabs `--warm` from muscle memory will produce a 1.13:1 surface and ship it. Canon's drift detector must lint by mode, not just by token. This is a Canon ask, not a Pixel ask, but the brand spec should declare it.

**B-4. MAJOR — Cross-direction parity risk: PR-body Markdown rendered on GitHub.**
GitHub renders Markdown in *its* light or dark theme, not Studio Zero's bone palette. The brand cannot control GitHub's text color. PR-body emit (V1.5) renders as default GitHub text — which is fine for SC 1.4.3 (GitHub's themes are AA-compliant), but the per-finding severity badges and verdict-line color emoji/text must degrade gracefully in either GitHub theme. usage-rules.md surface table claims "Bone" for this surface, which is misleading — the brand doesn't own the canvas. Re-spec as "GitHub-native; degrade gracefully."

**B-5. HC — Same six SC silences as Direction A** (2.4.11, 2.4.13, 2.5.7, 2.5.8, 3.3.7, 3.3.8). The dark-side focus-ring failure compounds with 2.4.13 specifically.

**B-6. MINOR — `--ink-b3` (#7a7163) on bone-0 = 3.4:1 (claim 3.4 ✓). Restriction to large-text/decoration is correct.**

### Verdict — Direction B: **FAIL → back to Pixel**

Two CRITICAL findings (B-1 verdict-frame contrast on bone; B-2 inherited dark focus-ring) plus the cross-mode discipline burden (B-3, B-4) means Direction B *as specified* cannot ship without re-spec of the bone-mode verdict frames. The bone surface is otherwise the most carefully contrast-checked of the three — Pixel did real work — but the verdict frames are exactly the place where a11y cannot have any softness, because the verdict screen is the customer's takeaway artifact. **Fixable: re-tone three frame colors and adopt Direction C's focus-ring spec on the dark side. ~1 day of work. After fixes, Direction B passes.**

---

## Direction C — Receipts

### Contrast re-computations (8 critical pairs)

| # | Pair | Hex pair | Pixel claim | Halo recomputed | AA body 4.5:1 | AA large 3:1 | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Verdict-screen H1 (ink-0) on bg-0 | `#fafafa` / `#050507` | 19.4:1 | **19.4:1** | ✓ | ✓ | PASS — best on the board |
| 2 | Body (ink-1) on bg-0 | `#cccccc` / `#050507` | 12.6:1 | **12.6:1** | ✓ | ✓ | PASS |
| 3 | Body (ink-1) on bg-1 | `#cccccc` / `#0a0a0c` | 12.0:1 | **12.0:1** | ✓ | ✓ | PASS |
| 4 | Secondary (ink-2) on bg-0 | `#a8a8a8` / `#050507` | 8.2:1 | **8.7:1** | ✓ | ✓ | PASS (Pixel under-claimed) |
| 5 | Link (ink-0 underlined) on bg-0 | `#fafafa` / `#050507` | n/a | **19.4:1** | ✓ | ✓ | PASS — underline removes SC 1.4.1 dependency |
| 6 | Focus ring (ink-0 outline at 2 px offset 2 px) on bg-0 | `#fafafa` / `#050507` | not pair-tested | **19.4:1** | ✓ | ✓ | PASS — only direction with a properly specified focus ring |
| 7 | FAIL chip-fill with ink-0 text: `#fafafa` on `#C8421A` | `#fafafa` / `#C8421A` | not pair-tested | **4.72:1** | ✓ | ✓ | PASS |
| 8 | PWF chip-fill with bg-0 text: `#050507` on `#E4C875` | `#050507` / `#E4C875` | not pair-tested | **12.4:1** | ✓ | ✓ | PASS |
| 9 | PASS chip-fill with bg-0 text: `#050507` on `#14C8CC` | `#050507` / `#14C8CC` | not pair-tested | **9.86:1** | ✓ | ✓ | PASS |

### Findings — Direction C

**C-1. PASS — Focus ring is correctly specified.**
"Focus: `--line-3` border + `2px outline-offset 2px` outline in `--ink-0`" delivers **19.4:1 against bg-0 and ~12.6:1 against `--bg-3` input fill**. Far exceeds SC 1.4.13 threshold of 3:1. SC 2.4.13 *Focus Appearance* is satisfied. This is the model A and B should adopt. *This is the single biggest a11y differentiator across the three directions.*

**C-2. PASS — Hyperlinks via underline + `--ink-0`, no color signaling.**
"Hyperlinks: `--ink-0` color, underline at default, underline-removed on hover. No color swap." Eliminates SC 1.4.1 *Use of Color* dependence entirely. Direction C is the only direction where the link pattern is explicitly safe. (Note: removing underline on hover is permissible but I'd recommend swapping to underline-thicker or color-swap to `--ink-2` instead — a hover state that *removes* an affordance reads weird for low-vision users using hover-to-confirm. MINOR.)

**C-3. PASS — Verdict color contrasts all clear.**
FAIL chip-fill 4.72:1, PWF 12.4:1, PASS 9.86:1 — all chip-with-text patterns pass AA body. No bone-canvas problem because there is no bone canvas. No verdict-frame contrast problem because the frames are `var(--line-3)` on bg-0 = 1.80:1 — wait. Let me recheck. `pass_frame: "1px solid var(--line-3) on bg-0"`. That **is** 1.80:1, same as A's focus-ring problem. **C-3a finding below.**

**C-3a. CRITICAL — Verdict frames `var(--line-3)` on bg-0 fail SC 1.4.11 as chip-bounding non-text contrast (1.80:1).**
Same arithmetic as A-1: line-3 on bg-0 = 1.80:1. However: the chip itself (red/gold/aqua fill) has very high contrast against bg-0 — FAIL 4.12:1, PWF 12.4:1, PASS 9.86:1 — all well above the 3:1 non-text threshold *for the chip itself*. The frame is decorative-only, and the chip's intrinsic contrast carries SC 1.4.11. **Net: passes.** This is unlike Direction B where the chip's own contrast against bone is weak (1.35–1.7:1) and the frame is the only mechanism. Direction C is safe here because the chip-fill against dark canvas does the work.

**C-4. MAJOR — Same six WCAG 2.2 SC silences** (2.4.11, 2.5.7, 2.5.8, 3.3.7, 3.3.8). 2.4.13 is the only one C handles explicitly. The brutalist register is amenable to addressing all of these — declare 24×24 minimum target size in the spacing scale, no-drag interactions, redundant-entry policy.

**C-5. HC — `mono-meta` at 11 px is small.**
Mono caps with 0.06em letter-spacing at 11 px is below the comfortable threshold for low-vision users without exceeding any SC threshold. Not a fail (SC 1.4.4 requires 200% zoom support, not minimum size), but flagging for Halo's manual-test pass. Same caveat applies to A's mono-meta 11 px.

**C-6. PASS — SC 1.4.1 robustly addressed.**
"Color is not how Direction C signals interactivity" is the prohibition that resolves SC 1.4.1 at the brand level. The only chromatic events are verdict-state colors, each paired with text and (per HC1) icon. Strongest of the three.

**C-7. MINOR — Mono-percentage rule (≥40%) is unrelated to a11y but worth noting:**
A high-mono register reads as "code register" to screen readers if implementations naively wrap data in `<code>` (which is announced as "code" by NVDA/VoiceOver). Access must ensure `<code>` is reserved for actual code and `<span>` is used for mono-styled metadata. Implementation finding, not a token finding — Access owns it.

### Verdict — Direction C: **PASS WITH FIXES** (minor)

Direction C has the cleanest token-level a11y posture of the three. It is the only direction that explicitly specifies an accessible focus ring; the only direction that eliminates SC 1.4.1 color-only signaling at the brand level; the only direction whose verdict chip-fills all clear AA body. The five-SC silence remains (C-4), and mono-meta 11 px deserves a manual-test caveat (C-5), but no CRITICAL findings. **Promotable with C-4 addendum.**

---

## Cross-direction parity check

The PRD §14.6 surface list spans dark-app + bone-PDF + GitHub-rendered Markdown + transactional email. A direction that only ships *one* mode (A or C) cannot natively answer the bone-paper exports problem and falls back to "default light theme of the renderer" — which is AA-compliant on GitHub but uncontrolled. Direction B owns the bone surface but introduces the verdict-frame fail (B-1).

For the customer-facing flow as defined in PRD §14.6, the cross-mode risk is bigger in B than in A or C. B doubles the surface area where a regression can ship; A and C accept a known external dependency (GitHub's theme) which is itself audited by GitHub.

---

## Brand-pick vote

**Halo votes Direction C.**

Not because C is least-bad — because C is *actively the best a11y posture of the three, and it enables the customer-facing flow I want to ship at M5*. Reasons, ranked:

1. **C is the only direction with a properly specified focus ring.** A and B both ship a 1.80:1 focus border that fails SC 1.4.11 and SC 2.4.13. C's `2px outline-offset 2px ink-0` is 19.4:1 — passes by a 6× margin. Inputs are the most regulated UI control under WCAG; C ships them right at token time.
2. **C eliminates the SC 1.4.1 hyperlink problem at the brand level.** A is silent; B uses press-ink (works but adds a color dependency); C uses underlined ink-0 — the most robust pattern and the most defensible against drift.
3. **C's verdict-color story is tightest.** Chip-fills against dark canvas all clear AA body. No bone-canvas softness (B's problem). No "what if someone sets `#C8421A` as colored text" gap (A's problem) — because C declares verdict colors as the *only* color and contributors will be policed against any other use.
4. **C's brutalist constraint set acts as the a11y constraint set.** No glow, no gradient, no auto-motion, no color-only signaling, no decorative imagery. Every prohibition C ships is also an a11y win. The brand voice and the WCAG posture are aligned.
5. **The customer-facing flow at M5 needs the verdict screen to land hard.** C's "verdict is the singular color event" is *also* the strongest a11y framing — the chip is large, the contrast is high, the color is paired with text and icon (HC1), and there's no chromatic noise competing for attention. A screen-reader run through C's verdict screen will be cleaner than A's or B's.

Direction A is the safe vote — promotable with three fixes. Direction B is fixable but requires re-toning three frame colors *and* adopting C's focus spec anyway, which means B is "C-on-dark plus a bone surface that needs its own audit pass." Direction C is the *only* direction where I do not have a CRITICAL finding to remediate before M5.

The cost of voting C is the customer-acquisition friction Pixel flagged (non-technical buyers, no warmth-in-color). That is a Herald/Signal problem, not a Halo problem. The brand voice carries warmth via copy; the visual register stays disciplined.

---

## Phase-2 gate verdict

**PASS WITH FIXES**

- **Direction A:** PASS WITH FIXES (A-1, A-2, A-3, A-4 mandatory)
- **Direction B:** FAIL → back to Pixel (B-1 verdict-frame contrast on bone is non-negotiable; B-2 inherits A-1)
- **Direction C:** PASS WITH FIXES (C-4 SC-silence addendum)

If Jo picks **C**: one-day SC-coverage addendum and we ship.
If Jo picks **A**: focus-ring re-spec is mandatory before any input ships. Adopt C's focus-ring pattern verbatim.
If Jo picks **B**: re-tone verdict-frame colors on bone (B-1) AND adopt C's focus-ring pattern on dark (B-2). Two-day rework.

Phase 2 cannot exit without one of these three remediation paths committed. I do not vote PASS on Phase 2 in its current state — too many token-time issues that cost 10× if caught at M5.

---

**Halo · Audit Layer · 2026-05-11**
*Cite the criterion. Test on real assistive tech. No "we'll fix it post-launch."*
