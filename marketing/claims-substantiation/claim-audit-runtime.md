# claim-audit-runtime

**Claim verbatim:** "Most audits take 6 to 12 minutes."
**Surface(s):** `marketing/copy/01-landing-page.md` §8 step 2; `02-pricing-page.md` §8 final CTA; `03-emails-e1-through-e5.md` E1 footer; AMA Q17
**Owner:** Hook + Watch
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly after first VERIFIED

## Evidence (to author)

- Audit-runtime telemetry from the dogfood cohort (N > 50 audits required before this claim ships externally).
- Percentile distribution: p25, p50 (median), p75, p95. Claim must reflect the p25–p75 interquartile range, with the upper bound rounded conservatively.
- Excludes audits that fail to start (queue stalls, runner offline) and audits that complete with error verdicts.

## Methodology

Query `runs` table where `verdict IN ('PASS', 'PASS_WITH_FIXES', 'FAIL')`, compute `completed_at - started_at` in minutes, take p25 and p75, round to whole minutes, round the upper bound up (conservative — under-promise).

## Risk if challenged

Medium-low. The claim is a range, not a guarantee. The FTC standard for performance claims allows "typical" experience as long as the methodology is disclosed and the range matches the data. Risk vector: a customer's first audit takes 18 minutes and they screenshot the homepage saying "6 to 12." Mitigation: the methodology link from the landing page footer (→ /methodology) discloses the range basis.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
