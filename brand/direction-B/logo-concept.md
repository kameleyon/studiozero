# Direction B — Logo Concept

**Hard Evidence** · Pixel · 2026-05-11

The mark must hold on dark *and* on bone — two surface registers with one identity. The brief inherits Direction A's geometric mark and specifies the bone-surface adaptations + a serif lockup variant for long-form bone surfaces.

---

## Recommended treatment

**Combination mark: same concentric-circle mark as Direction A + two wordmark variants** — a sans (Geist) variant for product surfaces and a serif (Source Serif 4) variant for bone long-form / exported PDF / cover pages.

### Why two wordmark variants

- The dark product surface speaks in Geist (existing template language). A sans wordmark there is on-tone.
- The bone PDF / blog / long-form surface speaks in Source Serif 4 (the bone reading face). A sans wordmark on a serif page reads as "we forgot to design the cover." A serif lockup pairs with serif body type the same way Stripe Press's serif title pairs with its serif body.

The mark itself does not change between surfaces. Only the wordmark adapts.

### Why not invent a wholly new mark for bone

- Two marks = two brands. Customers should recognize Studio Zero whether they see the app, the PDF, or the GitHub PR.
- The geometric mark is mode-agnostic by construction — a filled disc with an inner ring works on any background that satisfies contrast.
- Cost discipline: building a second mark doubles maintenance for zero recognition gain.

---

## Mark concept (prose)

Same construction as Direction A. The mark is a filled disc with a slight radial gradient (darker center, faintly lifted at 35%/35%), a single hairline inner ring at 55% diameter, and a 1 px outer-edge hairline.

**Bone-surface adaptation:**
- Filled disc: `--ink-b0` (#1a1814) — a deep bone-tinted black, never pure `#000000` (pure black on bone vibrates).
- Radial gradient: lifted from `--ink-b0` toward `#3a3530` at the 35%/35% highlight (subtle — same proportional lift as dark-mode).
- Inner ring: `--line-b3` (#7a7163) at 70% opacity. The ring is the *iris* — it must read against the dark disc.
- Outer edge: `--line-b3` at 60% opacity, 1 px.
- No inset white-highlight. (The dark-mode `inset 0 0 0 1px rgba(255,255,255,0.04)` exists to register the dark mark against the dark page — on bone, the mark is naturally registered by being darker than the page.)

The bone-mark reads exactly the same: gauge, iris, aperture, planet-with-orbit, coin-under-lamp. Identity preserved across surfaces.

---

## Wordmark variants

### Variant 1 — Sans lockup (product / dark / nav / OG default)

Same as Direction A:
- Typeface: Geist, lowercase, weight 500, letter-spacing `-0.01em`
- Cap-height: 0.55 × mark diameter
- Gap: 0.4 × mark diameter
- Color: `--ink-0` (dark) / `--ink-b0` (bone, when sans is permitted)

### Variant 2 — Serif lockup (bone PDF cover / long-form / blog header / printed letterhead)

- Typeface: **Source Serif 4 SemiBold** (weight 600), lowercase, letter-spacing `0`
- Cap-height: 0.62 × mark diameter (slightly larger than sans variant — serif x-height runs smaller, needs more cap-height for parity)
- Gap: 0.45 × mark diameter
- Color: `--ink-b0` (bone) only — serif lockup is bone-exclusive
- Italic version permitted only on the title page of an exported audit report ("studio zero · *audit*") — the italicized word is the *artifact type* (audit / brief / roadmap), set in Source Serif 4 Italic SemiBold 600, color `--press-ink-bone`. This is the *one* place press-ink touches the logo zone, and only as an artifact-type qualifier, not as the wordmark itself.

### Why Source Serif 4 SemiBold and not Instrument Serif

- Instrument Serif is a *display* face — high contrast, optimized for ≥36 px headlines. At wordmark sizes (lockup wordmark is ~12–28 px cap-height most of the time), Instrument Serif feels brittle.
- Source Serif 4 is a *text* face — designed by Frank Grießhammer for Adobe with a contemporary editorial register. SemiBold at small sizes holds weight without feeling shouty.
- Reference pairings: Source Serif 4 sits in the same room as Tiempos Text, FF Meta Serif, Lyon Text — the editorial-publisher register. Free on Google Fonts (no licensing complication).

---

## ASCII sketch

```
DARK SURFACE                                BONE SURFACE
─────────────                               ─────────────

      ╭───╮                                       ╭───╮
      │ ○ │  studio zero                          │ ○ │  studio zero
      ╰───╯                                       ╰───╯
       (Geist 500, --ink-0)                        (Geist 500, --ink-b0)

                                            BONE COVER / PDF TITLE PAGE
                                            ────────────────────────────

                                                  ╭───╮
                                                  │ ○ │  studio zero · audit
                                                  ╰───╯
                                                   (Source Serif 4 SemiBold,
                                                    "audit" in italic,
                                                    color --press-ink-bone)
```

The serif lockup with italic-press-ink artifact-type is what appears on the title page of every exported verdict PDF, on the blog post header, and on the cover of any long-form deliverable. The press-ink word names the artifact: *audit*, *brief*, *roadmap*, *fix bundle*.

---

## Size variations (specced)

### 1. Favicon / app-icon (16 / 32 / 192 / 512 px)

**Two icon sets must ship** — one for dark mode, one for light mode (rendered when the OS / browser is in light theme). Browsers and operating systems request the appropriate variant via `<link rel="icon" media="(prefers-color-scheme: dark)">`.

- 512 / 192 dark: identical to Direction A spec
- 512 / 192 light: `--ink-b0` disc on transparent, `--line-b3` inner ring + outer edge
- 32 / 16: simplify per Direction A spec (drop radial, drop ring at 16 px)

### 2. UI nav lockup (22 px mark + sans wordmark)

Same as Direction A. The in-app nav is dark-only in MVP, so the sans-dark lockup is the only nav variant.

### 3. OG image / social card (1200 × 630)

- Default: dark + sans lockup, identical to Direction A spec.
- **Variant for evidence-sharing**: bone background (`--bone-0`), serif lockup at top-left (`studio zero · audit` with italic-press-ink "audit"), verdict chip rendered centrally with score, single italicized phrase below in Source Serif 4 24 px `--ink-b2`. Used when a customer shares a verdict on social.

### 4. Exported PDF cover (US Letter / A4, portrait)

- Background: `--bone-0`
- Serif lockup centered horizontally, top quarter of page, mark 64 px, wordmark cap-height ~40 px
- Below lockup: artifact name + version + audit date in Geist Mono 11 px UPPERCASE `--ink-b2`
- Footer: project name, customer name, page count, generated-by-Studio-Zero machine-readable provenance (per PRD §11.3 AI-generated `<meta>` equivalent in PDF metadata)

### 5. PR-body Markdown header (V1.5 Auto-PR)

GitHub renders Markdown without CSS. The Markdown header is necessarily text-only:

```markdown
**studio zero · _fix bundle_**
Audit ID: `aud_01HQ...` · Re-audit verdict: PASS WITH FIXES (87/100)
---
```

The brand identity in PR-body context is the *typography choice* (markdown `**bold**` + `_italic_` for "fix bundle") + the dense-meta line in code formatting. The mark itself cannot render in Markdown; the wordmark + artifact-type does the lifting.

### 6. Letterhead / formal correspondence

- Bone background
- Serif lockup top-left at 64 px mark, wordmark cap-height 40 px
- Below: registered address + jurisdiction (per Comply trademark filing + GDPR Art. 13 controller-identity requirement)
- Page footer: page-number-of-total + a single press-ink hairline rule

---

## File outputs (for the designer who executes this)

In addition to all Direction A outputs:

- `brand/logo/lockup-horizontal-serif.svg` — serif lockup, bone surface
- `brand/logo/lockup-horizontal-serif-audit.svg` — serif lockup with "·audit" italic-press-ink variant
- `brand/logo/lockup-horizontal-serif-brief.svg` — same for "·brief" (V2 build mode)
- `brand/logo/lockup-horizontal-serif-roadmap.svg` — same for "·roadmap" (V2)
- `brand/logo/lockup-horizontal-serif-fix-bundle.svg` — same for "·fix bundle" (V1.5 Auto-PR)
- `brand/logo/mark-bone-{16,32,192,512}.png` — bone-surface favicon set
- `brand/logo/og-bone-evidence.png` — 1200 × 630 evidence-sharing OG variant
- `brand/logo/pdf-cover-letter.pdf` + `pdf-cover-a4.pdf` — exported PDF cover-page templates

All SVGs same conventions as Direction A.

---

## Trademark / clearance note

Same as Direction A. The serif wordmark variant does not change the trademark exposure — the wordmark *text* "studio zero" is the trademarked entity, not the typeface it's set in. Comply confirms.
