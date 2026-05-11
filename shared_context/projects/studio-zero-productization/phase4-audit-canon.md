# Phase 4 Audit — Canon (Visual Consistency / Brand Drift)

**Reviewer:** Canon — Visual Consistency Auditor
**Phase:** BUILD_FLOW Phase 4 — Brand & Component Build
**Reviewing:** `design/components/` (14 components + `_tokens/tokens.css`) · `design/screens/` (5 hero screens) · `design/motion.md`
**Brand baseline:** Direction A v0.1.1 (`brand/direction-A/tokens.json`, `usage-rules.md`)
**Method:** ripgrep drift-detection across `design/` tree (hex / rgb / spacing / radius / motion / verdict-misuse / italic-serif / mono-uppercase) + per-component spec read + cross-surface portability check (web / marketing / email / PR-body Markdown / exported PDF / CLI watermark).
**Independent-reviewer bias check:** I voted Direction A at Phase 2 and flagged 3 Criticals (A-C1 template-green pulse-dot, B-C2 press-ink hue conflict, C-C? automation gap). Direction A was locked. I judge Phase 4 conformance to A v0.1.1 on its merits, not loyalty to my Phase 2 pick.
**Date:** 2026-05-11
**Status:** Phase 4 Jury exit gate

---

## 0. Gate verdict at a glance

**PASS WITH FIXES.**

Canvas + Pixel's claim of "100% token discipline" is **not literally true** — drift exists — but no drift is brand-fatal and every fix is a one-line change against the existing tokens.css scaffolding. The brand survives Phase 4 because the structural decisions (type, restraint, hairlines, verdict reservation) are solid; the gaps are mechanical (raw px where `--sp-*` exists, raw `rgba(5,5,6,…)` where a `--scrim` token should exist, four verdict-color misuses outside verdict context, seven loader animations at off-token durations).

**Phase 2 follow-up:** A-C1 (template green pulse-dot `#6dd07a` purged from design tree) — **CONFIRMED LANDED** in `design/screens/landing/landing.jsx` + `landing.md`. The template still carries the green at `project-template/studiozero/project/styles.css:115` etc., but the design tree no longer propagates it. Acceptable — template is gitignored.

**B-C2 risk realized in a different shape:** I warned that brand accents within 54° hue of any verdict color on dark backgrounds would compete with the verdict surface. The actual Phase 4 drift is worse — `--verdict-pass` (#14C8CC) is used directly as a brand accent on `.sz-nav__bell-dot` (notification dot, not a verdict context), and `--verdict-fail`/`--verdict-pass` are reused for "blocked" / "running" workflow states inside `chip.css`. The hue-proximity rule isn't enough — the verdict tokens themselves are leaking into non-verdict roles.

---

## 1. Drift-detection scoreboard

| Check | Count | Severity | Notes |
|---|---:|---|---|
| **Hardcoded hex outside tokens.css** | **0** | — | One incidental `#808080`/`#ffffff` appears in a *quoted finding string* inside `verdict-fail.jsx:121` (i.e., evidence content describing a sample finding, not an applied color). Not a violation. |
| **Hardcoded rgb()/rgba() outside tokens.css** | **2** | Major | `modal-route.css:8` and `nav.css:33` both use `rgba(5, 5, 6, 0.7|0.75)` for scrim/blur backgrounds. These are token-equivalent (rgb of `--bg-0`) but bypass the variable system. **Token gap:** no `--scrim` / `--bg-0-translucent` token exists. |
| **Off-grid spacing (raw px not on locked scale)** | **3** | Minor | `nav.css:79` `inset: 5px`; `input.css:65-66` `5px 5px` chevron sizing + `calc(100% - 13px)` position; recurring `1px` borders are hairlines (not "spacing") and are excluded. All three are decorative micro-positions, not load-bearing spacing. |
| **Off-radius (not in 6/14/999)** | **1** | Minor | `sidebar.css:69` `border-radius: 2px` on the 2px current-page indicator bar. Decoration-only on a 2px-wide vertical accent; per the locked rule "No other radii allowed" — a finding. |
| **Off-icon-scale (icon sizes outside 16/20/24)** | **3** | Minor | `sidebar.css:73` `width: 18px` icon; `button.css:96` `width: 14px` spinner; `chip.css:93` `width: 14px` close-X. Spinner/close-X aren't strictly "icons" per the Lucide rule; sidebar 18px is the strongest hit. |
| **Off-motion-token durations** | **7** | Major | `1.4s` shimmer (`card`, `empty-state`, `findings-row`, `score-display`, `table`); `700ms` button spinner; `1s` chip-dots loading. None are in the locked motion scale `[120/200/280/380/900]ms` or `70s`. motion.md §1 explicitly says "These are the only values motion may take." **Token gap:** `--dur-loop` / `--dur-shimmer` not exported. |
| **Off-easing (not `ease` / `ease-out` / `ease-in-out`)** | **7** | Minor | Same 7 animations use `linear` / `steps(3, end)` — not in easing token set. Consistent with their off-token durations; same token-gap fix resolves it. |
| **Verdict-color misuse (used outside verdict context)** | **4** | Critical (1) + Major (3) | See §3. |
| **Italic-serif as full headline** | **0** | — | `--font-serif` italic appears only in `card.css:150` and `verdict-card.css:97`, both on `serif-stat` numerics. Type-scale-permitted role. PASS. |
| **Mono-uppercase on body** | **0** | — | All 33 `text-transform: uppercase` declarations pair with `--font-mono`. No sans-uppercase body. PASS. |
| **Type-scale violations (non-token font-size / letter-spacing)** | **5** | Minor | `empty-state.css:38` `clamp(28px, 4.8vw, 64px)` — 28 not on type scale; `empty-state.css:18` `letter-spacing: 0.1em` (scale is 0.08 for mono-meta); `findings-row.css:116` `font-size: 18px` kebab glyph; `modal-route.css:47` `font-size: 18px` close X; `button.css:113` `font-size: 1.1em` arrow glyph. |
| **Token-discipline drift (raw px where `--sp-*` exists)** | **~14** | Minor | `padding: 2px 8px`, `padding: 2px`, `margin-left: 2px`, `gap: 4px`, `top: 8px right: 8px`, JSX `marginTop: 4` in 5 Placeholder devstubs, etc. Values are on-scale but bypass the variables. The Phase 2 commitment was "tokens-only"; "values-on-scale-only" is a weaker guarantee. |
| **Total Critical findings** | **1** | | nav bell-dot verdict-color misuse |
| **Total Major findings** | **6** | | rgba scrim drift (2), verdict-color misuse (3), motion-duration drift (1 systemic) |
| **Total Minor findings** | **5+ classes** | | spacing/radius/icon/type/token-discipline |

---

## 2. Per-component verdict

| # | Component | Verdict | Drift |
|---|---|---|---|
| 1 | Button | **PASS WITH FIXES** | `transform: translateY(-1px)`, `translateX(3px)` off-grid micro; spinner 700ms off-motion; spinner 14×14 marginal; destructive hover fill = `--verdict-fail` (verdict-color drift, see §3) |
| 2 | Input | **PASS WITH FIXES** | Chevron positioning `calc(100% - 13px) 50%` + `5px 5px` (off-grid); `line-height: 1.4` raw (matches `--lh-mono-meta`); `min-height: 96px` borderline (not on scale; matches mobile section-py) |
| 3 | Card | **PASS WITH FIXES** | Hover `translateY(-3px)` off-grid; `1.4s` shimmer off-motion; `filter: brightness(0.97)` opacity-like literal |
| 4 | Chip | **PASS WITH FIXES** | `tone-running` reuses `--verdict-pass`; `tone-blocked` reuses `--verdict-fail` (§3); close-X `font-size: 14px`, `width/height 14px` raw; `margin-left: 2px` raw; `1s` chip-dots loading off-motion |
| 5 | Nav | **PASS WITH FIXES** | `rgba(5,5,6,0.75)` raw scrim; `inset: 5px` off-grid; `gap: 4px` raw; **`.sz-nav__bell-dot { background: var(--verdict-pass) }` — Critical verdict-color misuse, B-C2 risk realized** |
| 6 | Sidebar | **PASS WITH FIXES** | `width: 18px; height: 18px` icon (off 16/20/24); `border-radius: 2px` off-radius; `min-width: 22px` count badge (off-scale); `padding: 2px var(--sp-8)` raw 2px |
| 7 | Modal-route | **PASS WITH FIXES** | `rgba(5,5,6,0.7)` raw scrim; `font-size: 18px` close X glyph off type-scale |
| 8 | Findings-row | **PASS WITH FIXES** | `1.4s` shimmer; kebab `font-size: 18px` off type-scale; `outline-offset: -2px` raw |
| 9 | Verdict-card | **PASS WITH FIXES** | `padding: 2px 8px` raw on runid `<code>`; `font-size: 0.9em` icon relative |
| 10 | Score-display | **PASS WITH FIXES** | `padding: 2px` raw on toggle; `1.4s` shimmer |
| 11 | Live-progress-region | **PASS WITH FIXES** | `padding: 2px var(--sp-8)` raw 2px; `min-width: 22px` off-scale |
| 12 | Table | **PASS WITH FIXES** | `1.4s` shimmer; `padding: 2px var(--sp-8)` raw |
| 13 | Form | **PASS WITH FIXES** | `width: 22px; height: 22px` step-num (off-scale, not a brand mark) |
| 14 | Empty-state | **PASS WITH FIXES** | `font-size: clamp(28px, 4.8vw, 64px)` — 28px and 4.8vw off type-scale; `letter-spacing: 0.1em` off type-scale (mono-meta is 0.08); `1.4s` shimmer |

Zero components are **FAIL** under Canon's Phase 4 gate; zero components are **PASS** clean. All 14 ship **PASS WITH FIXES**.

---

## 3. Verdict-color drift — §3 deep-dive (Critical/Major)

**The constraint:** `tokens.json§color.verdict._note` and `usage-rules.md` both say *"Verdict colors are PRD-locked (§7.2 Step D). Brand cannot compete with verdict colors — these are reserved."*

**Phase 4 violations:**

| # | Location | Drift | Severity | Fix |
|---|---|---|---|---|
| V1 | `design/components/nav/nav.css:159` `.sz-nav__bell-dot { background: var(--verdict-pass); }` | Notification dot is brand-accent role; uses cyan PASS verdict color outside verdict screen | **Critical** | Introduce `--state-dot-default` token (recommend `--ink-1` or a single new state-info hue ≥90° from all verdict hues) |
| V2 | `design/components/chip/chip.css:34` `.sz-chip--status.sz-chip--tone-running .sz-chip__dot { background: var(--verdict-pass); }` | "Running" status reuses PASS verdict. Running ≠ passed audit | **Major** | New `--status-running` token; recommend `--ink-2` static dot or `--warm` (warm cream is brand-accent, hue-distinct from all verdict colors) |
| V3 | `design/components/chip/chip.css:36` `.sz-chip--status.sz-chip--tone-blocked .sz-chip__dot { background: var(--verdict-fail); }` | "Blocked" workflow status reuses FAIL verdict. Workflow-blocked is a process state, not an audit FAIL | **Major** | New `--status-blocked` token (or reuse `--sev-blocker-border` muted brick) |
| V4 | `design/components/button/button.css:66-68` `.sz-btn--destructive:hover { background: var(--verdict-fail); border-color: var(--verdict-fail); }` | Destructive button hover fills with FAIL verdict orange. Destructive action ≠ FAIL verdict outcome | **Major** | The idle border (`--verdict-fail-frame`) and disabled state are fine. Hover fill should use a darker neutral `--bg-3` with `--sev-blocker-text` color, or a dedicated `--btn-destructive-hover-bg` token. |

V1 is **Critical** because the nav bell-dot is the most-shown surface in the entire app — every logged-in screen ships it. A PASS-cyan dot in the top nav trains users that "cyan = good thing happened," which conflicts with "cyan = audit PASS" on the verdict screen. The verdict-color reservation rule was put in place precisely to prevent this dilution. This is the single highest-priority Phase 4 brand fix.

V2–V4 are Major because each is on a more local surface and the semantic distance ("blocked" vs "FAIL", "destructive button hover" vs "FAIL verdict") is more recoverable, but every instance of verdict-color outside the verdict screen erodes the reservation.

**Hue-conflict re-check (B-C2 follow-up):** No NEW brand accents within 54° hue of any verdict color have been introduced. The drifts above are *direct verdict-token reuse*, not hue-adjacent brand colors. So B-C2 itself didn't ship as predicted; a structurally similar but different drift class did. Same fix family (introduce new tokens; do not reuse verdict tokens).

---

## 4. Per-screen verdict

| Screen | Composition | Drift inherited from components | Screen-specific drift | Verdict |
|---|---|---|---|---|
| `landing` | Nav + cookie banner + Hero + sections + Footer | Nav bell-dot V1 (only if logged in; landing is public-default) | `Placeholder` devstub uses `marginTop: 4` raw (acceptable as a sentinel during build) | **PASS WITH FIXES** |
| `dashboard-first-run` | Sidebar + Nav + Card + Button | Sidebar 18px icon + 2px radius; Nav V1 bell-dot | None unique | **PASS WITH FIXES** |
| `intake-2step` | Form + Card + Input + Chip | Input chevron 13px/5px; Chip running/blocked V2/V3 if any rendering uses those tones | None unique | **PASS WITH FIXES** |
| `verdict-fail` | Verdict-card + Score-display + Findings-row + Chip | All loader shimmers (1.4s × 4 components) hit this screen during the loading state | One hex-in-quoted-string at line 121 (`#808080 on #ffffff`) — evidence content, not applied style | **PASS WITH FIXES** |
| `settings-root` | Sidebar + Nav + Form + Card | Sidebar 18px icon + 2px radius; Form step-num 22×22 off-scale | None unique | **PASS WITH FIXES** |

No screen ships a one-off color, one-off radius, or one-off typography on top of the component library — Pixel's "compose, never restyle" contract holds. All screen drift is **inherited** from the components themselves.

---

## 5. Cross-surface portability

### Web app vs Marketing
**PASS.** Same tokens, same components. `_tokens/tokens.css` is the single source. Landing uses the same `--bg-0`, `--ink-0`, `--font-sans`, etc. as the dashboard. Motion budget differs per surface (landing: full; dashboard: reduced) but every motion value still references a token — except the 7 loader animations, which apply identically to both contexts (drift is uniform, not surface-asymmetric).

### Email
**PASS.** Sample 04 (transactional emails) ships as **plain text** with no CSS dependency. Direction A's brand is structural (type hierarchy, restraint, sender identification in mono-meta-style labels) — none of this depends on `prefers-reduced-motion`, `backdrop-filter`, or grain overlay. Email rendering in Outlook/Gmail/Apple Mail will not strip anything load-bearing.

### PR-body Markdown rendered on GitHub
**PASS WITH FIXES.** Sample 03 (FAIL-verdict body) renders cleanly in GitHub Flavored Markdown — headings, blockquotes, code blocks, `> **Private Run · Self-Audited**` watermark all survive. **Spec gap:** `verdict-card.md` does not contain a "rendered as Markdown" section explaining how `<h1 role="status">Audit complete · FAIL</h1>` collapses to a Markdown `# Audit complete · FAIL` line, what color treatment (if any) the verdict word gets in Markdown (the answer is: none — GitHub markdown can't color text, so the verdict word relies on capitalization + emoji-free icon). Recommend a `## Markdown rendering` subsection in `verdict-card.md` that locks: (a) verdict line as `# Audit complete · FAIL` with no emoji icon (because `usage-rules.md` forbids emoji-adjacent-to-logo and Herald forbids exclamation marks; same restraint applies); (b) watermark as `> Private Run · Self-Audited` blockquote followed by the help-text line.

### Exported PDF
**PASS WITH FIXES.** Direction A's motion budget says PDF=none, and the structural brand survives. **Spec gap (Major):** there is no explicit declaration of what happens to the **grain overlay** (`grain.enabled: true`, opacity 0.035, blend-mode `overlay`) and **cursor glow** in PDF export. Grain in a PDF rasterization at 0.035 opacity is *probably* fine but unspecified; cursor glow is interactive and doesn't apply. Recommend `usage-rules.md §Motion appropriateness` extend the Exported PDF row to read **"None for motion. Grain overlay stripped from PDF — paper rasterizes grain unpredictably; brand is structural, not chromatic, so grain absence does not break register."** Same explicit fallback for `cursor_glow` (already implied by interactivity but should be locked).

### CLI watermark cross-surface (SC 3.2.4)
**PASS.** The exact string `Private Run · Self-Audited` is identical across:
- web verdict screen (`design/components/verdict-card/verdict-card.jsx:106`)
- PR-body Markdown (`brand/samples/03-fail-verdict-body.md:143`)
- dashboard explainer (`design/screens/dashboard-first-run/dashboard-first-run.jsx:186`)
- PRD §7.2 Step D (`PRD.md:223`)
- IA flows (`ia/user-flows/cli-pairing-and-tamper.md:196,275,313`)
- chip.md spec (`design/components/chip/chip.md:9,50`)

No drift on the watermark text identity. SC 3.2.4 PASS.

### Sample-04 email rendering
**PASS.** Sample 04 (transactional emails) ships as plain text wrapped in a triple-backtick code block in the brand markdown — the actual deliverable email is plain text + a footer with required CAN-SPAM / CASL / PECR sender ID. No CSS surface to fail.

---

## 6. Phase 2 fix verification

| Phase 2 finding | Status | Evidence |
|---|---|---|
| **A-C1** — template `#6dd07a` green pulse-dot must be removed before propagating to product surfaces | **CONFIRMED LANDED** | `design/screens/landing/landing.md:151` documents the fix ("drop the dot on the hero eyebrow row… Nav CTA pulse-dot stays as `var(--ink-0)`"). Zero hits on `#6dd07a` inside `design/`. Template still carries it but is gitignored. |
| **B-C2** — press-ink hue conflict (now moot: Direction B not picked) | **N/A — direction not selected** | Direction A picked; B's press-ink concern is dead. However the structural risk — verdict-token leakage into brand-accent roles — landed in a different form (§3 V1–V4 above). |
| **C-C3** — automation gap on the 40%-mono enforcement rule (now moot: Direction C not picked) | **N/A — direction not selected** | Direction A picked; C's enforcement-gap concern is dead. The analogous drift-detection automation gap for Direction A (raw px / raw rgba / off-motion durations) is the topic of §1 and the Phase 5 Vega/build-tool recommendation in §8 below. |

---

## 7. Top-5 specific findings (priority order)

1. **V1 — nav bell-dot uses `--verdict-pass` cyan** (`design/components/nav/nav.css:159`). **Critical.** Notification dot is the most-shown brand-accent surface in the app; using PASS verdict color dilutes the verdict reservation. Fix: introduce `--state-dot-default` token; recommend `--ink-1` or a hue ≥90° from any verdict.

2. **V2 + V3 — `tone-running` and `tone-blocked` chips reuse verdict tokens** (`design/components/chip/chip.css:34,36`). **Major.** Workflow status ≠ audit verdict; reusing the same tokens trains the wrong mental model. Fix: introduce `--status-running` and `--status-blocked` tokens; recommend `--warm` for running and a muted brick (not `--verdict-fail`) for blocked.

3. **rgba scrim drift** (`design/components/modal-route/modal-route.css:8`, `design/components/nav/nav.css:33`). **Major.** Two `rgba(5,5,6, 0.7|0.75)` literals bypass the variable system. Token gap. Fix: export `--scrim-modal` and `--scrim-nav` (or a single `--bg-0-translucent` with documented alpha multiplier) in `_tokens/tokens.css`.

4. **Off-motion-token loaders** — 7 animations at `1.4s` / `700ms` / `1s` / `linear` across button, card, chip, empty-state, findings-row, score-display, table. **Major.** motion.md §1 says "These are the only values motion may take." Fix: add `--dur-loop: 1400ms;` and `--dur-spin: 700ms;` (or fold loaders into `--dur-reveal` 900ms) + accept `linear` as a documented exception for shimmer/spinner loops in motion.md.

5. **V4 — destructive button hover fill uses `--verdict-fail`** (`design/components/button/button.css:66-68`). **Major.** Destructive action is a UI primitive role, not a verdict outcome. Fix: keep `--verdict-fail-frame` border on idle; on hover, use `--bg-3` fill with `--sev-blocker-text` color (matches the `data-state="error"` already shipped in the same file).

**Honorable mentions (Minor):** `sidebar.css:69` `border-radius: 2px` off-radius; `sidebar.css:73` `width: 18px` off-icon-scale; `empty-state.css:18` `letter-spacing: 0.1em` off type-scale; `nav.css:79` `inset: 5px` off-spacing.

---

## 8. Phase 5 recommendation

Most of the drift surface is **mechanical** (raw px instead of `var(--sp-N)`) — i.e., readily catchable by a CI lint pass. Recommend Vega ship a Stylelint config in Phase 5 with rules:

- `declaration-property-value-disallowed-list` blocking hex / rgb() / rgba() outside `**/_tokens/tokens.css`
- a custom rule rejecting numeric `px` values not in the locked scale `[1,2,4,6,8,10,12,14,16,18,20,24,28,32,36,40,48,56,64,80,100,120,140,240,560,720,880,1280]` (1px reserved for hairlines; 240/560/720/880/1280 reserved for layout dimensions and breakpoints)
- a custom rule requiring `animation:` / `transition:` durations to reference `var(--dur-*)`
- an axe-core + visual-regression integration that diff-checks the verdict-card watermark text identity across emitted surfaces (web / PR body / PDF)

With those four checks wired into PR-blocking CI, Canon's manual drift hunt at every phase becomes the safety net rather than the primary line of defense.

---

## 9. Phase-4 gate verdict

**PASS WITH FIXES.** Ship Phase 4 to Jury with the following bound to Phase 5 entry:

- **Critical (must fix before Phase 5):** V1 (nav bell-dot verdict-color misuse) — 1-line CSS swap once `--state-dot-default` is exported.
- **Major (fix during Phase 5):** V2 / V3 / V4 verdict-color drifts; `--scrim-*` token gap; `--dur-loop` motion-token gap; spec gap on PDF rendering of grain in `usage-rules.md`; spec gap on Markdown rendering of verdict-card in `verdict-card.md`.
- **Minor (polish during Phase 5):** off-grid spacing/radius/icon/letter-spacing micro-violations; raw px → `var(--sp-*)` cleanup pass.

The brand identity is intact. The 14 components compose into 5 screens without one-off restyling. The verdict reservation is the only structurally important rule being violated and it is fixable in a single Vega commit. Direction A has earned its lock as Studio Zero brand v1.

---

*End of Phase 4 audit. Canon — Audit Layer.*
