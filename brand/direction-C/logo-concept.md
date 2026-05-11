# Direction C — Logo Concept

**Receipts** · Pixel · 2026-05-11

The brutalist register reframes the mark from "auditor's gauge" to "system identifier." Lower romance, higher specificity. The mark and wordmark are designed to look like they belong on a terminal status line, a changelog header, or a debug overlay — not on a glossy landing hero.

---

## Recommended treatment

**Wordmark-dominant lockup, with a stripped-down geometric mark.** The mark exists for favicon-and-app-icon recognition; on the marketing landing and in-product nav, the wordmark does most of the carrying.

### Why wordmark-dominant (vs combination mark in A/B)

- Brutalist editorial brands tend toward typographic identity (Read.cv, Modal Labs, Linear's pre-rebrand changelog header, Vercel). The mark is a fallback for the contexts the wordmark can't reach (favicon, 16 px contexts).
- The dense-mono register treats type as the brand. A heavy decorative mark competes with the typographic register; a stripped mark complements it.
- The PRD positioning (*we'll prove it — line by line*) is fundamentally textual. The brand mirrors that.

### Why strip the mark vs remove it entirely

- Favicon, app icon, social avatar, and OG image still need a graphic identifier — wordmark-only at 16 px is illegible.
- A stripped mark (square + diagonal-line aperture, see below) holds at 16 px in a way that the concentric-circle mark of A/B requires more pixel budget to render cleanly.

---

## Mark concept (prose)

A **sharp square** (2 px corner-radius — matches the brand's chip radius) with a single **diagonal hairline** cutting from the upper-left corner area to the lower-right corner area, *not* corner-to-corner — offset inward by ~12% on each end, so the hairline appears to be an aperture-slit through a closed surface, not a slash mark.

The square fill is `--bg-3` (#161618), one step lifted from the page so the mark registers as a *plate*, not a hole. The diagonal hairline is `--ink-0` (#fafafa), 1.5 px stroke on a 24 px canvas. A 1 px outer-edge hairline in `--line-3` (#3a3a3e) defines the plate edge.

The mark reads as: **an aperture slit, a card-reader slot, a slot machine line, a barcode element, a single line of code.** All on-tone: data-plate / terminal-element / receipt-fold-line. The slit IS the brand's "line by line" promise made graphic.

### Why a square, not a circle

- Direction A/B uses the concentric circle for editorial-gauge metaphor. Direction C explicitly departs.
- A sharp 2 px-radius square at 16 px reads as a *system tray icon*, a *file extension marker*, a *terminal window symbol* — vocabulary that lives in the engineering-tools neighborhood (Datadog, Sentry, Linear, Modal — all use rectilinear or square logo forms).
- A square also makes the mark grid-aligned with chip and card geometry (also 2 px radius, also rectilinear) — visual coherence with the brand's component vocabulary.

### Verdict-state colored variants (reserved)

The mark may be tinted to verdict-state colors **only when rendering a verdict artifact thumbnail** (e.g., a thumbnail of an exported audit in the dashboard listing). Three variants:

- `mark-fail`: square fill `--bg-3`, slit `#C8421A`, outer edge `#5a2828`
- `mark-pwf`: square fill `--bg-3`, slit `#E4C875`, outer edge `#5a3f1e`
- `mark-pass`: square fill `--bg-3`, slit `#14C8CC`, outer edge `--line-3`

These variants are **never used as the brand logo** (in nav, in OG, in favicon). They are *artifact thumbnails* — the same mark, tinted to indicate the verdict of the audit the thumbnail represents.

---

## ASCII sketch

```
DEFAULT MARK (brand)               VERDICT-THUMBNAIL VARIANTS (artifact only)
────────────────────               ──────────────────────────────────────────

   ┌─────────┐                       ┌─────────┐  ┌─────────┐  ┌─────────┐
   │   ╲     │                       │   ╲     │  │   ╲     │  │   ╲     │
   │    ╲    │                       │    ╲    │  │    ╲    │  │    ╲    │
   │     ╲   │                       │     ╲   │  │     ╲   │  │     ╲   │
   └─────────┘                       └─────────┘  └─────────┘  └─────────┘
   slit in --ink-0                    FAIL slit    PWF slit     PASS slit
   (the brand)                       #C8421A      #E4C875      #14C8CC
                                     (artifact)   (artifact)   (artifact)
```

The slit's diagonal angle is 32° from horizontal — chosen so it reads as a deliberate vector, not as a sloppy slash. The slit endpoints are inset 12% from each corner, so it does not touch the plate edges.

---

## Wordmark

**Typeface:** **Geist Mono**, lowercase, weight 500, letter-spacing `-0.01em`.

This is the Direction C inversion from A/B: the wordmark is set in *mono*, not in sans. The mono wordmark immediately signals the brand's register: terminal / changelog / data-table neighborhood. The wordmark *itself* is the strongest brand signal in Direction C.

**Cap-height:** 0.50 × mark side-length (mono x-heights run lower than Geist sans, so cap-height needs to be proportionally higher).

**Gap:** 0.35 × mark side-length (tighter than A/B — brutalist packs).

**Color:** `--ink-0` on dark backgrounds. There is no light-mode default surface in Direction C (no bone variant); if a wordmark must render on a light background (e.g., GitHub README), use `--bg-0` (`#050507`) on the lightest available bg.

**Letter treatment:**
- Lowercase only. UPPERCASE in mono reads as terminal-shouting (`ERROR:`, `WARNING:`); lowercase reads as terminal-prompt — calmer, more confident.
- Letter-spacing is *slightly* negative (`-0.01em`) — counters mono's natural extra spacing and gives the lockup a denser, more deliberate read.
- The "s" of "studio" and the "z" of "zero" sit on the mono baseline; no kerning eccentricity, no ligatures.

### Wordmark-only mode (preferred for in-product nav)

In the in-app nav and on the marketing landing's primary lockup, the wordmark may render **without the mark** — a horizontal `studio zero` in Geist Mono 500. This is a Direction C invariant: where there's room for the wordmark, the mark is optional. The mark is for *small* contexts.

### Alternative considered: serif wordmark in `Berkeley Mono Display`

A serif-mono hybrid (Berkeley Mono Display, Tiempos Mono) was considered for additional editorial register. Rejected because:
- License complications (Berkeley Mono is paid, not free).
- The hybrid register softens the brutalist edge — pulls Direction C back toward Direction A's warmth.
- Geist Mono is already in the existing template — zero new font dependency.

---

## Size variations (specced)

### 1. Favicon / app-icon (16 / 32 / 192 / 512 px)

- 512 / 192: full mark per spec (square plate, diagonal slit, outer-edge hairline)
- 32: simplify — square plate + slit thickened to 2 px, drop outer-edge hairline
- 16: square plate + slit thickened to 2 px, slit endpoints touch the inset boundary more aggressively (10% inset instead of 12%) to remain visible

Light-mode fallback (auto-rendered when system theme is light):
- Plate fill becomes `--bg-0` (#050507) — the *page* color, which reads as a small dark plate on light backgrounds
- Slit becomes `--bg-0` filling around an `--ink-0` background — inverts the figure-ground relationship so the slit reads as a hole, not a stroke

### 2. UI nav lockup (wordmark-only or mark + wordmark)

- **Wordmark-only (preferred, default):** `studio zero` in Geist Mono 500, 13 px cap-height, `--ink-0`. Total lockup width ~92 px.
- **Mark + wordmark (used when navigating product needs additional grounding):** 20 px mark + wordmark cap-height 10 px. Gap 7 px. Total lockup width ~78 px.

### 3. OG image / social card (1200 × 630)

- Background: `--bg-0` with grain at 0.025 opacity.
- Wordmark `studio zero` set in Geist Mono 500, cap-height 88 px, top-left at 80 px inset.
- Below the wordmark: a single line of `mono-meta` (Geist Mono 32 px UPPERCASE letter-spacing 0.06em) reading `audit · build · readiness`.
- No italicized phrase. No serif. No warm accent. (Direction C OG does not borrow from Direction A's "we'll prove it — line by line" italic flourish — the OG reads like a system header, not a poster.)

### 4. PR-body Markdown header (V1.5 Auto-PR)

GitHub strips CSS. The Markdown header is:

```markdown
`studio-zero` · fix-bundle
audit_id: aud_01HQ... · re-audit_verdict: PASS_WITH_FIXES · score: 87/100
---
```

The wordmark in code-formatting (backticks) is a Direction C signature — treats the brand as an *identifier*, matching the surrounding mono register. All metadata on one line, separated by interpuncts, snake_case. Reads like a terminal status line.

### 5. Letterhead / formal correspondence

- Background: `--bg-0`. (No bone variant exists in Direction C; formal correspondence is dark.)
- Wordmark top-left at 64 px cap-height, `--ink-0`.
- Below: registered address + jurisdiction in `mono-meta` 11 px UPPERCASE `--ink-2`.
- Page footer: `mono-data` page-number-of-total + a single `--line-1` hairline rule.

The letterhead deliberately rejects the editorial-publisher cover-page convention. Direction C's formal artifact reads as a *system print-out* — a printed terminal log, not a published document.

---

## File outputs (for the designer who executes this)

- `brand/logo/mark.svg` — primary mark, 24 px reference
- `brand/logo/mark-light.svg` — light-mode inverted variant
- `brand/logo/mark-fail.svg` — verdict-tinted artifact thumbnail
- `brand/logo/mark-pwf.svg` — verdict-tinted artifact thumbnail
- `brand/logo/mark-pass.svg` — verdict-tinted artifact thumbnail
- `brand/logo/wordmark.svg` — wordmark-only Geist Mono lockup, dark
- `brand/logo/wordmark-light.svg` — same, light-mode
- `brand/logo/lockup-horizontal.svg` — mark + wordmark, dark
- `brand/logo/lockup-horizontal-light.svg`
- `brand/logo/favicon-{16,32,192,512}.png` — rasterized per spec
- `brand/logo/favicon.ico` — multi-resolution
- `brand/logo/apple-touch-icon.png` — 180 px
- `brand/logo/og-default.png` — 1200 × 630 OG card

All SVGs: viewBox-based, no embedded raster, `fill="currentColor"` for theming, `<title>` for AT, optimized through SVGO level 1.

---

## Trademark / clearance note

Same as Directions A/B. The square-with-diagonal-slit mark is geometrically generic enough that conflicts are likely in *any* design-mark search; Comply runs the search and flags overlaps. If the mark conflicts, Pixel pivots to a wordmark-only logo for Direction C — the wordmark in Geist Mono is itself sufficiently brand-distinctive, and the mark is the most expendable element of Direction C's identity.
