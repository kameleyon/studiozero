# claim-ai-builder-failure-modes

**Claim verbatim:** "AI builders generate `<input>` elements without labels four times out of five on the first scaffold."
**Surface(s):** `marketing/copy/01-landing-page.md` §5 problem row 1
**Owner:** Halo + Hook
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + on every named-AI-builder version bump

## Evidence (to author)

- Test fixtures: prompt each named AI builder (v0, Bolt, Lovable, Cursor, Replit Agent) to generate a "signup form" with default settings.
- For each generated output, count `<input>` elements and count those with an associated `<label for=>` or `aria-label`.
- "Four times out of five" requires the share of unlabeled inputs across the cohort to be approximately 80%.

## Methodology

The fixtures are reproducible: each AI builder's prompt is documented; each output is captured; each finding is computed deterministically. Re-run quarterly to confirm the share holds (AI builders update; the share may move).

The cohort must include each major named AI builder (at least 5 named builders × 3 fresh sessions each = 15 outputs minimum).

## Risk if challenged

Medium-high. This is a comparative claim about competitor products. FTC AI-claim substantiation and the Lanham Act (false advertising re: competitors) both apply.

Risk vector: a competitor argues we cherry-picked prompts or used outdated versions. Mitigation: the fixtures and the dates are published with the claim; the methodology is reproducible by anyone.

Risk vector: the share is below 80% on a re-test. Mitigation: the claim is rephrased to match the new share, or retired.

**Comply gate:** this claim does not ship externally until Comply signs off on the methodology and the published-fixture surface.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
