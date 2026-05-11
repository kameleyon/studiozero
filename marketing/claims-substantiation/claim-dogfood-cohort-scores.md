# claim-dogfood-cohort-scores

**Claim verbatim:** "47 dogfood audits run against our own codebase since M0. Median first-audit score across those 47: 64 / 100."
**Surface(s):** `marketing/copy/04-social-bundles.md` X week 6; IH M2 milestone post; `05-ama-prep.md` Q4
**Owner:** Hook + Jury
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + on every IH milestone post (cohort moves)

## Evidence (to author)

- Internal `runs` table query for `tenant_id = 'studio-zero-dogfood'` (or equivalent), `verdict IS NOT NULL`, `created_at >= M0_DATE`.
- N (count of audits) verified to match the cited number.
- Median computed as exact p50 of the cohort scores. Not rounded inside the cited claim.

## Methodology

The dogfood cohort is Studio Zero running against its own production codebase across version bumps. The cohort grows over time; cited number must match the cohort size at the most recent reading.

Median is the p50 of the score values. If the cohort doubles, the median moves; the cited number must be re-derived at re-verification.

## Risk if challenged

Low. The claim is about our own data, against our own product. No competitor or regulator can dispute internal cohort data. Risk vector: a journalist or customer asks for the underlying data and we have to either show it or admit we can't. Mitigation: the methodology page (`/methodology`) discloses the cohort and the query.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
