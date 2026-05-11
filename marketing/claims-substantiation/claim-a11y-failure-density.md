# claim-a11y-failure-density

**Claim verbatim:** "Across 154 first audits we ran during the build phase, 142 (92%) returned at least one Blocker-severity accessibility finding. The most common — missing programmatic labels on form inputs — appeared in 78% of audits."
**Surface(s):** `marketing/copy/04-social-bundles.md` blog launch post; `05-ama-prep.md` Q4
**Owner:** Halo + Hook
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + when N moves materially (>20% change)

## Evidence (to author)

- Internal `runs` table + `findings` table query for first audits where `created_at >= M0`.
- Filter findings where `severity = 'Blocker'` and `reviewer = 'halo'` (accessibility).
- Count audits with at least one such finding; divide by total first audits.
- Drill down to "missing programmatic labels" — finding `category` or `rule_id` taxonomy match.

## Methodology

The 154 number must match the cohort size at re-verification. The 92% must match the share with at least one a11y Blocker. The 78% must match the share with the specific "missing-label" finding.

This is internal cohort data from our dogfood + early customer audits. No external dataset.

## Risk if challenged

Low. The claim is about our own audit results, not about a named competitor's product. Risk vector: a journalist asks for the underlying data; we either show it (with appropriate anonymization) or admit the cohort is private.

Mitigation: the methodology page discloses the cohort's source (mix of dogfood + early customer audits, anonymized).

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
