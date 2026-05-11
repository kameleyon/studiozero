# claim-reaudit-improvement

**Claim verbatim:** "Median first-audit score: 64 / 100. Median second-audit score after one fix cycle: 78. Re-audit improvement holding at +14 points so far."
**Surface(s):** `marketing/copy/04-social-bundles.md` X week 9; IH M2 milestone post; `05-ama-prep.md` Q4
**Owner:** Hook + Jury
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + on every IH milestone post

## Evidence (to author)

- Internal `runs` table query joining first audit and re-audit pairs by `project_id`.
- Compute paired-sample median delta. Cited improvement = `median(score_re-audit) - median(score_first)`.
- Sample size requirement: N >= 20 paired audits before this claim ships externally.

## Methodology

A "re-audit" is defined as a subsequent audit on the same project, against the same rubric version, after the customer (or dogfood operator) has shipped fixes. The pair is `(first_audit, most_recent_re-audit_within_30d)`.

Improvement = re-audit score minus first-audit score, per project. Median of those deltas is the cited improvement.

## Risk if challenged

Low-medium. The claim implies causality (fixes → score improvement) but states only correlation. The phrasing "after one fix cycle" is descriptive, not causal — a re-audit on the same project without fixes would still count if customer ran it.

Mitigation: the methodology page discloses the definition of "fix cycle" (customer shipped commits between the two audits, on the relevant branches).

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
