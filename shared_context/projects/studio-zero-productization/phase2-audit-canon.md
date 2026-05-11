# Phase 2 Audit — Canon (Visual Consistency)

**Reviewer:** Canon — Visual Consistency Auditor
**Phase:** BUILD_FLOW Phase 2 — Brand Identity
**Reviewing:** Pixel's three visual brand directions (A / B / C)
**Date:** 2026-05-11
**Inputs read:** `brand/directions.md`; `brand/direction-{A,B,C}/tokens.json` + `usage-rules.md` + `logo-concept.md`; `agents/growth/herald-brand-voice.md`; `project-template/studiozero/project/styles.css`; `PRD.md` §7.2 Step D.

> Canon does not grade aesthetics. Canon grades **conformance to a system** — token discipline, drift risk, cross-surface portability, and whether the brand respects the constraints already locked above it (verdict colors, voice doc, template baseline).

---

## TL;DR

| Direction | Sub-verdict | Top issue |
|---|---|---|
| A — Auditor's Notebook | **PASS WITH FIXES** | Single-token-source discipline is good; warm accent is the only smuggle-risk surface but well-policed |
| B — Hard Evidence | **PASS WITH FIXES** | Token surface ~2× A's; press-ink accent is the structural-blue risk Pixel called; bone-mode warm-accent forbidden but tempting |
| C — Receipts | **PASS WITH FIXES** | Maximally consistent by construction; but the 40%-mono enforcement rule has no automated check spec'd, and the wordmark-only-in-nav rule weakens 16 px recognition |

**Single brand-pick vote: Direction A (The Auditor's Notebook).**

**Phase 2 gate verdict for the brand panel:** **PASS WITH FIXES** — the panel does not need to be returned to Pixel. Findings below are addressable inside Phase 2 before Phase 3 starts.

---

## Single Brand Pick — Rationale

Canon votes **A** for four conformance-driven reasons (not aesthetic):

1. **Lowest drift surface.** A has one ink scale, one bg scale, one accent. B has two of each. C has one of each but introduces a behavioral constraint (≥40% mono) that requires tooling Canon does not yet have. Lowest token surface = lowest drift surface = lowest audit cost over 6 months.

2. **The baseline already exists in A's language.** `project-template/studiozero/project/styles.css` lines 2–20 are already the Direction A token set. Picking A means **the template gets enforced**, not rewritten. Picking B doubles the surface; picking C requires rebuilding the landing's typography from sans-default to mono-co-equal. Canon's rule #1 is "the brand guide is source of truth." Picking the direction that *is already the template* shortest-paths to that state.

3. **A has zero verdict-color competition.** Warm cream `#cfc4b3` (oklch 0.78 0.02 70) sits in a chroma-near-neutral position with hue 70° — far from FAIL 35°, PWF 88° is close in hue but cream's chroma 0.02 is 5× lower than PWF's 0.10 (the eye will not confuse them). B's press-ink `#b8d4ff` (oklch 0.83 0.06 250) is structurally fine but hue 250° is closer to PASS aqua 196° than I'd like (~54° apart; Canon would want ≥90°). C has no brand accent so the question is moot.

4. **A is reversible.** Pixel's framing is correct: A → B is additive (introduce bone surface later for exports), A → C is restrictive (remove the warm). A → either is a one-step migration. C → anything else looks like a brand crisis. Reversibility is a consistency-protective property.

C is the right choice **only** if Jo accepts that the visual identity itself is the X/HN conversation-starter. Canon does not grade that bet; that's a Compass + Hook decision. From a pure-conformance posture, A wins.

---

## Direction A — The Auditor's Notebook

**Sub-verdict: PASS WITH FIXES**

### Blockers
None.

### Criticals

**A-C1 · Existing template already drifts from A's tokens.json.**
- Location: `project-template/studiozero/project/styles.css:115` and `:151`.
- Issue: pulse-dot uses `#6dd07a` (a saturated green) hardcoded — not in tokens.json, not in any severity/verdict color, and visually adjacent to a "PASS" state that PRD §7.2 Step D locks to aqua `#14C8CC`. A green dot near a verdict screen could be misread as a second PASS color.
- Fix: replace with a tokenized neutral (`var(--ink-2)`) or with the PRD-locked PASS aqua. If "live" indicator needs to remain distinct from PASS-verdict, use `--ink-0` + the animated ring pulse alone (no chromatic dot).
- Rule violated: tokens.json must be the single source of truth (Canon rule #1). Hardcoded hex in production CSS is a Critical finding regardless of direction.

**A-C2 · `--warm` accent not enumerated in tokens.json as a CSS custom property name.**
- Issue: `tokens.json§color.accent.warm` is documented, but the styles.css already exposes `--warm: oklch(0.78 0.02 70)` (line 15). The token in JSON ships hex `#cfc4b3` AND oklch; the template ships oklch only. These are equivalent but the JSON-hex / CSS-oklch mismatch is the seed of drift.
- Fix: tokens.json should declare a canonical CSS-output form (either hex or oklch, both, with a build step that emits the other). Pixel + Canvas must decide which is canonical.

### Majors

**A-M1 · `severity.polish` text token `#6b6b72` on `bg-0` is 3.2:1 — labeled DECORATION ONLY in the JSON.** Direction A's own rules forbid body copy in this combination, but Canon's drift detector needs an automated rule (e.g., a stylelint plugin or a Canon-runner check) to enforce it. Without the check, drift is inevitable.

**A-M2 · `verdict_surface.pass_frame` says "warm accent permitted as supporting flourish on PASS state only" (tokens.json:188).** That's a soft rule that requires per-instance Canon review. Either codify the exact allowed elements (italic phrase under the PASS chip? scrubbed?) or remove the carve-out. Soft rules rot.

**A-M3 · Logo `logo-concept.md:91-93` 16 px favicon spec drops the inner ring and uses a "2 px `--ink-2` dot at center." The 16 px favicon is the only place the mark is rendered at a size where AT users see it as an alt-text equivalent.** Spec is clear but should be tested as a rendered raster before Phase 3 — concentric-circle marks at 16 px frequently muddy.

### Minors

- **A-m1** `radius._rule` says "No other radii allowed" — styles.css line 19 declares `--r: 6px` but doesn't expose `--r-card: 14px` as a variable. Cards in the wild will reach for inline `border-radius: 14px` instead of a token. Add `--r-card` to the CSS export.
- **A-m2** `spacing.scale` is 23 values. That's already a lot; if Vega's components stay inside this scale strictly, fine — but Canon's experience says a 23-value spacing scale becomes a 30-value spacing scale in 6 months. Consider trimming to the values actually used at MVP.
- **A-m3** Motion `marquee: 70s` — auto-marquee is in the system but the usage rules say "Settings are work, not theatre." The two are consistent only if the marquee is restricted to the landing's logo-marquee strip. Codify the surface restriction.

### Token discipline
Strong. Every color is tokenized; spacing is on a 4 px base; radius scale is exactly three values (6 / 14 / 999); type scale is finite and named. The main violation lives in the *template*, not the tokens — i.e., Direction A is well-specified and the template needs to be brought into compliance, not the other way around.

### Cross-surface portability
Strong. The brand carries on typography + hairlines, both of which translate cleanly across:
- web app: native
- marketing site: native (already shipped)
- transactional email: degrades gracefully (typography stack + neutral palette work in any email client)
- PR-body Markdown: degrades to plain text; the brand reads as "serif italic phrase + mono metadata" which Markdown renders as `_italic_` + ` `backtick``. Acceptable.
- exported PDF: needs Source Serif 4 (Direction A doesn't declare it; A's Instrument Serif is display-only). **Open question for Pixel:** what is A's PDF-body face? B answers this; A does not.

### Logo at 16/48/400
- **16×16 favicon:** spec'd (logo-concept.md §1) but Canon flags concentric circles as fragile at this size — requires raster test before sign-off.
- **48×48 CLI banner:** not directly spec'd. Falls between favicon-32 (which simplifies) and UI-nav-22. Pixel should add a 48 px spec.
- **400×100 PR body:** the lockup is meant for OG (1200×630). 400×100 is roughly 1/3 the OG width — should render cleanly. Spec should explicitly call out the PR-body banner size.

### Drift risk at 6 months
**Low.** The brand carries on typography and restraint; both are durable. The single drift vector is contributors reaching for `--warm` outside the italic-phrase rule (e.g., as a button background, as a card border). Canon's drift detector needs an automated lint for `var(--warm)` appearing on non-text properties.

### Herald-voice alignment
**Strong.** Editorial restraint matches "we don't shout; we cite." The typography choice (Instrument Serif italic phrase + Geist sans body + Geist Mono metadata) is the visual cognate of the voice doc's "specific, not vague" pillar.

---

## Direction B — Hard Evidence

**Sub-verdict: PASS WITH FIXES**

### Blockers
None.

### Criticals

**B-C1 · Token surface area is ~2× Direction A's.** This is a Canon-load issue, not an aesthetic one. Two ink scales, two bg scales, two line scales, two severity-tag colorways. Every audit Canon runs after Phase 2 will need to verify both surfaces. The PRD does not currently fund that audit cadence. Either fund it explicitly or accept that Canon will only audit dark surfaces in MVP and bone audits start at M3.

**B-C2 · `--press-ink-dark` `#b8d4ff` is hue 250°, chroma 0.06. PASS aqua `#14C8CC` is hue 196°, chroma 0.13.** 54° hue separation. Both are light cool colors on dark. In a verdict screen that contains both a PASS chip AND a press-ink-styled hyperlink, the customer's eye groups them. Press-ink is meant to be *structural* (links only), not chromatic-decorative, but on a PASS-verdict screen the structural read will be challenged.
- Fix option 1: forbid press-ink-dark on the verdict screen itself.
- Fix option 2: shift press-ink-dark further from PASS aqua (e.g., to hue 270–280° — true violet-blue, away from cyan).
- Fix option 3: accept the conflict and let Canon flag every verdict-screen instance as a Major in production.
- Pixel must pick before this direction is implementable.

**B-C3 · Two-surface contributor education burden.** `usage-rules.md` §Surface-assignment table is binding but is also long. Every new contributor must learn it. Canon predicts this is the #1 drift source for Direction B: someone adds a bone card to a dark surface, or a dark CTA to a bone PDF cover. Mitigation: a CI lint that checks the rendered surface mode against the asset-class registry. Without that lint, drift is guaranteed.

### Majors

**B-M1 · `--warm` is declared in tokens.json `accent_warm.warm` but forbidden on bone (contrast 1.13:1, called out in `_warm_on_bone_REJECTED`).** Good that Pixel pre-rejected. But the JSON should *not* expose `--warm` as a CSS variable available on bone surfaces — Canon needs the CSS export to be mode-scoped. (e.g., `:root[data-surface="dark"] { --warm: #cfc4b3; }` with no declaration under `[data-surface="bone"]`. Currently there's no spec for the scoping mechanism.)

**B-M2 · Severity-tag bone variants `#8a1f0a` (blocker_bone) etc. are sourced from Pixel's eye, not from a contrast-tested algorithm.** Each pair should be re-derived to hit the same contrast band as the dark variants (~9–13:1) — but bone has narrower color-space because the ink ceiling is `#1a1814`, not pure black. Halo audits contrast; Canon audits that the *same severity = same visual weight across surfaces*. Verify post-Halo.

**B-M3 · Logo `logo-concept.md` introduces five serif-lockup variants (`audit`, `brief`, `roadmap`, `fix bundle`, plus base).** Each is a separate SVG asset to maintain. Each must be Canon-audited every release. This is a real maintenance multiplier; consider scoping to just `audit` + `fix bundle` for MVP and deferring `brief` + `roadmap` to V2 when those modes exist.

**B-M4 · `body-bone` typography uses Source Serif 4 — a font not declared in styles.css.** Direction B adds a font dependency that A does not. The export pipeline must bundle/subset this font for PDFs. Spec the font-loading strategy (Google Fonts CDN? bundled? subsetted?). Without this spec, the PDF renders in the fallback stack and the brand reads as "we forgot to embed the font."

### Minors

- **B-m1** Bone-mode favicon minimum 24 px (not 16) is a real constraint but no fallback strategy is spec'd for the actual 16 px case (the favicon spec mandates 16 px exists). Pick: render the 16 px in dark-mode regardless of OS theme, or accept slight bone-mode degradation at 16 px.
- **B-m2** `body-bone` line-height 1.62 is slightly off the 1.55 default in dark mode. Two body line-heights = a real source of "this PDF feels different than the app" drift. Either justify it on optical grounds or unify.
- **B-m3** Press-ink-usage budget (`press_ink_usage_rule._strict`) caps callouts at ≤1 per section. This is enforceable by Canon at review time but should also be a CI rule.

### Token discipline
Reasonable, but the **mode-scoping mechanism is undeclared**. The JSON groups tokens under `background_dark` / `background_bone` etc. but does not say how the CSS export resolves them. Direction B is implementable only with that mechanism spec'd.

### Cross-surface portability
**Strongest of the three for exports.** B is the only direction with a native answer for bone-paper surfaces (PDF, GitHub PR-body, email). The trade is the token-surface load.

### Logo at 16/48/400
- **16×16 favicon:** spec'd, with dark + light variants. Light variant adds risk: the auto-selection via `prefers-color-scheme` is browser-dependent (Safari quirks documented). Test at all three browsers.
- **48×48 CLI banner:** still not spec'd directly. Same gap as A.
- **400×100 PR body:** B has the cleanest answer because PR-body Markdown lives on bone (GitHub's default). The serif lockup with italic press-ink "·audit" qualifier is genuinely on-brand for that surface. **B wins this dimension.**

### Drift risk at 6 months
**Medium.** Two-surface brands historically drift at the boundary. Mitigation tooling (CI lint for surface-mode mismatch) is needed but not spec'd.

### Herald-voice alignment
**Strong.** Bone-paper surface for receipts (PDFs, PRs, emails) is the literal cognate of the voice doc's "receipt-bringing" pillar. Editorial register holds across both surfaces. Press-ink-as-link-color matches "we cite."

---

## Direction C — Receipts

**Sub-verdict: PASS WITH FIXES**

### Blockers
None.

### Criticals

**C-C1 · The 40%-mono enforcement rule has no automated check spec'd.**
- Location: `usage-rules.md§Mono-percentage check`.
- Issue: "Canon enforces ≥40% Geist Mono per rendered viewport" is a behavioral invariant with no tool to measure it. Canon does not currently have a glyph-count audit. Without one, the rule is aspirational and drift is guaranteed (contributors will reach for sans because "it reads easier" — Pixel even names this regression).
- Fix: spec a build-time or post-render checker. Options: (a) computed-style scan that counts `font-family: var(--mono)` rule hits weighted by element area; (b) Playwright-based snapshot that runs OCR-or-DOM-glyph-count on the rendered page. Pixel + Canvas + Vega must agree on which.

**C-C2 · "No press-ink, no blue, no any-blue" — but hyperlink interactivity has no visual signal beyond underline.**
- Issue: WCAG SC 1.4.1 (Use of Color) requires interactive elements to be distinguishable without color alone. Underline alone is acceptable for inline links (matches HTML default), but **the rule that hyperlink hover *removes* the underline** (`usage-rules.md` line 47) reverses the convention — hover state weakens the signal instead of strengthening it.
- Fix: hover should keep underline AND add a `text-decoration-thickness` increase, or color shift to `--ink-0`. Cross-check with Halo — Canon flags as Critical because the rule is in the *brand* spec, not the implementation. Brand must not specify an a11y-fragile pattern.

**C-C3 · Mark concept (square + diagonal slit) is geometrically generic and Pixel pre-flags trademark risk.**
- Location: `logo-concept.md§Trademark`.
- Issue: Pixel's own note says "the square-with-diagonal-slit mark is geometrically generic enough that conflicts are likely in *any* design-mark search." If Comply's USPTO/TMview search returns conflicts, Direction C is forced to wordmark-only — which then loses 16 px favicon recognition entirely.
- Fix: either commission a more distinctive mark (a slit at 32° with a specific terminal element is too generic), OR commit to wordmark-only-from-day-one and remove the mark from the spec. Both choices are valid; deferring the choice is not.

### Majors

**C-M1 · Wordmark-only-in-nav rule (`logo-concept.md§Wordmark-only mode`) breaks the favicon use-case.** The favicon, app icon, OG image, and social avatar still need the mark. Direction C says "the wordmark is the brand" but then specs a mark anyway. Resolve: either the mark is part of the brand (then it's spec'd properly) or it isn't (then the favicon is a wordmark crop, which fails at 16 px because mono is illegible).

**C-M2 · Spacing scale drops 18, 28, 36, 100, 140 from Direction A's scale.** That's fine in isolation, but the existing template uses several of those values (e.g., `padding: 18px` likely exists somewhere). Migration cost: every component in the existing template needs spacing-scale remediation before C ships. Quantify before sign-off.

**C-M3 · `radius._rule` declares 2 px on surfaces / 0 px on chips — no pill radius anywhere.** The existing template line 109 sets `border-radius: 999px` on `.nav-cta`. Picking C means rebuilding the nav CTA. Migration cost is real.

**C-M4 · `_direction_c_invariants[2]` declares "Geist Mono ≥40% at any viewport."** This invariant is also restated in the usage rules but not in the JSON's machine-readable form. Canon can't lint a prose invariant. Move it to a structured field (e.g., `_invariants: { mono_glyph_fraction_min: 0.40 }`) so tooling can read it.

### Minors

- **C-m1** Cursor-glow DISABLED (`tokens.json§cursor_glow.enabled: false`) but the styles.css declares `.glow` (line 51-61). Picking C means deleting that CSS rule entirely, not just toggling it. Track as a migration task.
- **C-m2** `motion.rules.marquee: "DISABLED — no auto-marquee in Direction C"` — the string-as-disable is awkward in JSON. Either omit the key entirely or use `false`. Schema cleanup.
- **C-m3** Iconography stroke 1.25 px (vs A's 1.5) is a fine distinction; Canon needs visual-regression baselines because at 16 px the 0.25 px difference may not render distinctly.

### Token discipline
**Strongest of the three by construction.** No accent token means no accent-token violations. Achromatic ink scale means no hue-drift. The Direction C invariants array (`_direction_c_invariants`) is a Canon-friendly artifact — but only when it's machine-readable, not prose.

### Cross-surface portability
**Mediocre.** C has no bone-surface answer for the PDF / PR-body / email problem that B solves. The brand renders on light backgrounds by inverting (mark goes light, wordmark goes dark) but the *register* stays dark-product even on a printable PDF. Customers' export-quality experience suffers.

### Logo at 16/48/400
- **16×16 favicon:** spec'd (logo-concept.md§Favicon). Square + slit holds at 16 px better than A's concentric circles. **C wins this dimension over A.**
- **48×48 CLI banner:** mark holds; wordmark cap-height 50% of mark side-length = 24 px wordmark, which is legible in Geist Mono. Cleanest answer of the three.
- **400×100 PR body:** wordmark-only in code-formatting (`` `studio-zero` ``) is a clever native-Markdown answer. Reads as a system identifier, which matches register. **C is also clean here, in a different way than B.**

### Drift risk at 6 months
**High by character, low by audit.** C's invariants are the strictest of the three, so any drift is *visible* (a colored button, a rounded chip, a serif body — all instantly off-brand). The risk isn't subtle drift; it's a contributor who doesn't read the invariants and ships an obvious break that gets through review. Mitigation: the invariants array + machine-readable enforcement.

### Herald-voice alignment
**Mixed.** Voice doc lands as "editorial premium, neutral-confident, receipts-driven." C is strong on receipts and neutral-confident. **Weakness:** voice doc says "slightly warm" (axis 2). C explicitly removes warmth from the visual register, leaving the voice to carry it alone. If Herald's copy slips toward cooler, the entire brand reads as cold. This is a coupling risk: the voice cannot tolerate any cooling in C the way it can in A.

---

## Cross-direction summary

### Verdict-color competition matrix

| Direction | Brand accent(s) | Hue distance to nearest verdict | Chroma vs verdict | Risk |
|---|---|---|---|---|
| A | warm cream (hue 70°, chroma 0.02) | 18° to PWF gold (88°, 0.10) | 5× lower chroma — eye separates | **Low** |
| B-dark | press-ink-dark (250°, 0.06) | 54° to PASS aqua (196°, 0.13) | 2× lower chroma; same lightness band | **Medium** — flagged C2 |
| B-bone | press-ink-bone (250°, 0.07) | 162° from FAIL red, 162° from PWF gold | distinct on bone — fine | **Low** |
| C | none | n/a — verdict is the only color event | n/a | **None by construction** |

### Token-discipline ranking
1. **C** — least surface, machine-checkable invariants (once moved out of prose).
2. **A** — moderate surface, clean structure, but missing PDF-body face.
3. **B** — largest surface, requires mode-scoping mechanism not yet spec'd.

### Cross-surface portability ranking
1. **B** — native bone answer for PDF / PR-body / email.
2. **A** — graceful degradation but no bone surface.
3. **C** — dark-only register translates poorly to printable artifacts.

### Logo at 16/48/400 ranking
1. **C** — square mark + wordmark-as-identifier work at all three sizes.
2. **B** — combination mark + bone variant work, but two variants double the asset surface.
3. **A** — concentric mark is the most fragile at 16 px; needs raster test.

### Drift-at-6-months ranking
1. **A** — single accent, single scale, smallest possible smuggle surface.
2. **C** — strict invariants make breaks visible; risk is unguarded contributions, not subtle drift.
3. **B** — two-surface boundary is the historical drift vector; CI lint required.

### Herald-voice alignment ranking
1. **A** — typography-driven editorial register is the literal visual cognate of the voice doc.
2. **B** — adds bone surface for receipts, strong cognate for the "receipts" pillar.
3. **C** — strong on receipts/neutral-confident; weak on "slightly warm" — couples brand temperature 100% to copy.

---

## Phase 2 Gate Verdict

**PASS WITH FIXES.** The panel does not require Pixel re-spin. All three directions are implementable; A is Canon's recommended pick. The fixes called out in each direction's Critical findings must be resolved before Phase 3 implementation begins. Specifically:

- **A:** fix template drift (`#6dd07a` pulse-dot), declare PDF-body face, spec automated `--warm` misuse linter.
- **B:** spec the dark/bone mode-scoping CSS mechanism, resolve press-ink-dark vs PASS-aqua adjacency, scope MVP serif-lockup variants to `audit` + `fix bundle` only.
- **C:** spec the automated 40%-mono check, resolve hyperlink-hover a11y rule with Halo, decide mark-or-wordmark-only before trademark exposure.

Whichever direction Jo selects, the template at `project-template/studiozero/project/styles.css` must be remediated to match the locked direction's tokens.json before any further surface ships. The pulse-dot `#6dd07a` is a brand drift that exists *today* and any direction must clean it up.

---

*Canon, signing off independent review. Findings traceable to: tokens.json field locations, PRD §7.2 Step D, Herald voice doc §2, and the existing template's hardcoded-color drift surface.*
