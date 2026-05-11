# Direction A — Logo Concept

**The Auditor's Notebook** · Pixel · 2026-05-10

This file specifies the logo for a designer or generator to produce. Pixel does not ship SVG here; Pixel ships the brief that makes the SVG inevitable.

---

## Recommended treatment

**Combination mark: circular concentric mark + lowercase Geist wordmark.**

The mark is already drafted in the existing template (`styles.css §.brand-mark` and `§.layer.director .director-mark`). Direction A formalizes it as the canonical mark.

### Why combination, not wordmark-alone

- The product surfaces (favicon, app icon, social avatar, OG image) need a mark that survives at 16 px.
- "Studio Zero" wordmark-only at 16 px is illegible; the mark holds the brand at sizes the wordmark cannot.
- Editorial brands often pair a precise geometric mark with a typographic wordmark (NYT's "T", New Yorker monocle, FT's "FT" diamond). Studio Zero's circle-within-circle sits in that lineage.

### Why not a literal symbol (magnifying glass, checkmark, shield)

- A magnifying glass narrows the brand to "audit-only" and undersells the V2 Build mode.
- A checkmark conflicts with verdict-PASS state (PRD §7.2 Step D).
- A shield reads as security/compliance vendor (Snyk / Vanta visual neighborhood — wrong space per PRD §3a).
- A pure geometric mark (concentric circles) reads as *focus, gauge, aperture, ringlight, target* — all on-tone, none category-specific. Lets the brand carry the meaning, not the icon.

---

## Mark concept (prose)

A near-black filled circle with a slight radial gradient — darker at center, faintly lifted near 35% / 35% (matches existing template's `radial-gradient(circle at 35% 35%, #2a2a2f, #050506 70%)`). A single hairline ring inside the filled circle, set at 55% diameter, in `--line-3` (#3a3a40), at 60-70% opacity. Outer edge of the filled circle carries a 1 px hairline in `--line-2` (#2a2a2f), and a subtle inner highlight at `inset 0 0 0 1px rgba(255,255,255,0.04)` to register on dark surfaces.

The mark reads as: **a gauge, a lens iris, an aperture, a planet with an orbit, a coin under a lamp.** Multiple reads are intentional — Studio Zero is "ten or so different things looking at one thing" (Jury + reviewers); the mark mirrors that.

### Director variant (used in `.layer.director`)

Same construction but: 56 px, with an *outer* ring at `inset -8px` (so it sits outside the filled circle, like a halo) carrying a slow 4-second pulse animation. The director variant signals **BigBrain** specifically and is reserved for that semantic. Brand contributors do not use the director variant casually.

---

## ASCII sketch

```
          .  -  -  .                          .  -  -  .
       .              .                    .              .
      .   ┌──────┐    .                   .   ┌──────┐    .
     .   │        │    .                  .   │        │    .
     .   │   ○    │    .                  .   │   ○    │    .  ← inner hairline ring
     .   │        │    .                  .   └──────┘    .     at 55% diameter
      .  └──────┘     .                    .              .
       .              .                     .  -  -  .
          ` - - `                       outer "halo" ring
                                        (director variant only)

  default mark, 22 px               director mark, 56 px
```

The filled disc is the canvas. The inner ring is the iris. The optional outer halo (director only) is the orbit. The radial gradient gives the mark a *focal point* without ever feeling skeuomorphic.

---

## Wordmark

**Typeface:** Geist (the body sans). Lowercase. Weight 500. Letter-spacing `-0.01em`. Size relative to mark: cap-height of "s" equals 0.55 × mark diameter.

**Lockup spacing:** wordmark sits to the right of the mark, gap = 0.4 × mark diameter.

**Capitalization:** lowercase "studio zero" — editorial restraint, lowercase signals confidence (Apple, Stripe, Linear all use it). UPPERCASE reads as enterprise-trust-vendor (Vanta neighborhood — wrong space).

**Color:** wordmark fill = `--ink-0` (#f3f3f4) on dark, `--bg-0` (#050506) on light fallback. **Never** the warm cream accent. **Never** a verdict color.

**Letter treatment:** no kerning eccentricity. The "s" of "studio" and the "z" of "zero" align on the baseline. No italic in the wordmark — italic is reserved for editorial flourish inside copy.

### Alternative considered: serif wordmark

A Source Serif 4 / Instrument Serif italic wordmark was considered for editorial register. Rejected because:
- Display-serif italic at small sizes (nav 12 px, favicon, mobile) fatigues fast.
- A serif wordmark *plus* a serif accent inside copy doubles down on one register — overplays the editorial card.
- Geist sans + Instrument Serif italic inside body type already carries the editorial mix. The wordmark stays neutral so the *language* carries the brand.

Keep as a deferred option for Direction B's bone-paper export surface, where serif holds at larger sizes.

---

## Size variations (specced)

### 1. Favicon / app-icon (16 / 32 / 192 / 512 px)
- **Mark only.** No wordmark.
- 512 px and 192 px: full radial-gradient mark + inner ring as specified.
- 32 px: simplify to solid `--bg-0` fill + 1 px `--ink-3` outer edge + a single inner-ring at 50% diameter (`--ink-3` at 70% opacity). Drop the radial gradient — at 32 px it muddies.
- 16 px: solid `--bg-0` fill + 1 px `--ink-2` outer edge + a 2 px `--ink-2` dot at center. Drop the ring; preserve the *concentric* concept via center-dot-in-circle.
- **Light-mode fallback** (rendered when system is in light theme): invert fill to `--ink-0`, outer edge in `--ink-3`, inner ring in `--ink-3`.

### 2. UI nav lockup (22 px mark + wordmark)
- Existing template baseline (`styles.css §.brand`). Locked.
- Mark 22 px, wordmark cap-height 12 px (so wordmark x-height ≈ 9 px). Gap 9 px. Total lockup width ≈ 88 px.
- Use site-wide in `.nav-inner` and as the header chip in transactional emails.

### 3. OG image / social card lockup (1200 × 630 OG default)
- Mark 96 px, wordmark cap-height 52 px. Gap 38 px. Lockup centered or top-left at 80 px inset.
- Background: `--bg-0` with grain overlay at 0.04 opacity (slightly higher than UI default — at 1200 px the grain reads more, not less).
- Below the lockup, a single-line subhead in Geist 28 px (`--ink-2`) and an italicized phrase in Instrument Serif 28 px (`--warm`): *"We'll prove it — line by line."*

---

## File outputs (for the designer / generator who executes this)

The designer should produce, at minimum:

- `brand/logo/mark.svg` — primary mark, 22 px reference size, dark-mode default
- `brand/logo/mark-light.svg` — light-mode inverted variant
- `brand/logo/mark-director.svg` — 56 px director variant with halo
- `brand/logo/lockup-horizontal.svg` — mark + wordmark, dark
- `brand/logo/lockup-horizontal-light.svg`
- `brand/logo/lockup-vertical.svg` — stacked, for narrow contexts (footer, sidebar)
- `brand/logo/favicon-{16,32,192,512}.png` — rasterized per spec above
- `brand/logo/favicon.ico` — multi-resolution
- `brand/logo/apple-touch-icon.png` — 180 px
- `brand/logo/og-default.png` — 1200 × 630 OG card

All SVGs: viewBox-based, no embedded raster, no inline `style` attribute (use `fill="currentColor"` where possible so CSS can theme), `<title>` element for AT, optimized through SVGO at level 1 (don't over-minify — preserve viewBox readability).

---

## Trademark / clearance note

Pixel does not own trademark clearance — Comply does. Before Phase 4 closes:
- Comply runs USPTO + EU TMview + WIPO Global Brand DB searches on "Studio Zero" wordmark.
- Comply runs design-mark search on the concentric-circle device (likely conflicts in optics / financial / gaming industries — verify).
- If conflicts surface, Pixel proposes a wordmark fallback ("studio-zero", "studio.zero", "Studio Zero Inc.") and re-runs.
- Trademark filing decision is Jo's, on Comply's recommendation, before public launch (Phase 10).
