# Sample 03 — FAIL verdict screen body copy

**Surface:** `/project/<id>/audit/<run-id>` — the activation screen for ≥70% of customers (PRD §15).
**Voice check:** grade 7. Neutral. Receipt-driven. Never punitive. Numbers and evidence carry the verdict; the prose stays out of the way.
**Spec source:** PRD §7.2 Step D, locked v0.4.

---

## Above-the-fold copy

```
[ verdict region — red #C8421A background, alert triangle icon ]

  Audit complete · FAIL                              [h1, role="status"]
  Score: 58 / 100                                    [large numeric]

[ body region — neutral background ]

  We found 14 issues across UX, accessibility, and brand
  consistency. Here's every one, with the evidence.

  Most first audits do not pass our gate — that's the design.
  Every finding below names a file, a line, and a fix.

  [ Primary CTA: Run the Code audit →     ] [ Export report ]
```

**Word count above the fold:** 36. Reading grade: 6.8 (Flesch-Kincaid).

---

## Detailed copy spec

### Verdict line (locked)

> Audit complete · FAIL

- `<h1 role="status">` per WCAG SC 4.1.3 and PRD §7.2 Step D.
- Middle dot `·` (U+00B7), not hyphen, not em-dash. The dot is the brand's verdict separator across PASS, PASS WITH FIXES, and FAIL screens.
- Never *Your audit failed.* Never *Sorry, your audit failed.* Never *Audit failed!*

### Score line

> Score: 58 / 100

- The number is the message. No interpretive adjective ("low," "concerning").
- Spaces around the slash. Sentence case for "Score:".

### First sentence of body (the only sentence the customer is guaranteed to read)

> We found 14 issues across UX, accessibility, and brand consistency.

- Always begins *We found [N] issues*. The verb owns the claim. The number is specific.
- "Across" + three areas — never more than three named in the first sentence. If the audit found issues in more areas, the score breakdown table below carries the long list.
- Areas are listed in descending count order (highest count first).

### Second sentence (the receipt)

> Here's every one, with the evidence.

- Identical across every FAIL screen. This is the brand promise the customer is here for.
- Em-dash variant for narrow viewports: *Here's every one — with the evidence.*

### Pre-empt paragraph (the strict-gate frame)

> Most first audits do not pass our gate — that's the design. Every finding below names a file, a line, and a fix.

- "Do not pass" not "fail." Same outcome; different register.
- "That's the design" reframes the FAIL from the customer's failure to the rubric's strictness. Closes the punitive loop.
- "Names a file, a line, and a fix" sets the format the customer is about to see, so the findings list below feels like a delivery, not a list of complaints.

### Primary CTA (Surface SKU)

> Run the Code audit →

(See sample 02 for the matrix across SKUs.)

### Secondary CTA (text link, no arrow)

> Export report

---

## Findings list — heading and intro

Below the verdict block, before the per-severity groups:

> **14 findings, grouped by severity.** Expand any row for the evidence and the recommended fix.

- Reuses the number from the verdict body — never two different counts on one screen.
- "Expand any row" tells the user the rows are interactive without dictating the interaction (works for click, tap, keyboard).

### Per-severity group headings

> Blockers (2) · Critical (4) · Major (5) · Minor (3) · Polish (0)

- Separated by middle dot (the brand's separator).
- Zero-count groups still listed for transparency — collapsed by default.

### Empty group (e.g., Blockers (0) on a PASS WITH FIXES)

> No Blockers found.

- Single sentence. No emoji. No "Great news!" — see banned phrases.

---

## Per-finding card — copy frame

Each row in the checklist follows this fixed shape (Proof grades — H-M3 in the v0.3 review):

```
[severity chip] [reviewer chip] [F-007] Form labels missing on /signup inputs

What we found
  The email and password inputs on /signup are missing programmatic
  labels. Screen-reader users hear "edit text, blank" and have to
  guess what to type.

Why it matters
  WCAG 2.2 AA, success criterion 1.3.1 (Info and Relationships) and
  3.3.2 (Labels or Instructions). One in five visitors uses an
  assistive technology at some point — they'll bounce.

The fix
  In app/signup/page.tsx, lines 42–58, add an aria-label or a visible
  <label for="…"> to each <input>.

  [ Copy fix ]   [ Mark won't-fix ]
```

- **What we found** — neutral, observation only.
- **Why it matters** — names the WCAG SC or the heuristic; one human consequence.
- **The fix** — file path, line range, one concrete change. Code snippet inline where it earns the precision.
- **Statistic in "Why it matters"** ("One in five visitors uses an assistive technology") requires a substantiation file before launch.

---

## CLI-mode watermark (per D7)

When the verdict was produced by a local runner, a badge appears below the verdict line:

> **Private Run · Self-Audited**

With `aria-describedby` help-text:

> This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device.

(Locked in PRD §7.2 Step D — duplicated here so the verdict-screen spec is self-contained for Vega.)

---

## What this screen does *not* say

For the avoidance of doubt, none of these strings appear:

- *Your product failed.*
- *Oh no.* / *Yikes.* / *Don't panic.*
- *Failed.* (as a standalone word in body copy)
- *We're sorry.* / *Apologies.*
- *Don't worry, we can fix it.* (we can't, not yet — Auto-PR is V1.5)
- *Click here.* (CTAs are self-describing)
- *Congratulations!* (this is a FAIL screen)
- Any exclamation mark.
- Any emoji.

---

*End of FAIL-verdict body copy spec. Companion PASS-WITH-FIXES and PASS specs ship in v1.1 of this sample set.*
