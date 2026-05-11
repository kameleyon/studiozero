# claim-first-audit-pass-rate

**Claim verbatim:** "Most first audits do not pass our gate — that's the design."
**Surface(s):** `marketing/copy/01-landing-page.md` §11 final CTA; `03-emails-e1-through-e5.md` E1 body; `04-social-bundles.md` HN intro; verdict-screen sample 03 ("Most first audits do not pass our gate"); AMA Q4
**Owner:** Jury + Hook
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + after every milestone (M2, M5, V1.5)

## Evidence (to author)

- Internal `runs` table query for first audits per project where `created_at >= M0`.
- Compute share with `verdict IN ('FAIL', 'PASS_WITH_FIXES')` versus `verdict = 'PASS'`.
- Cited claim ("most") requires share >= 50% before shipping externally.
- N (count of first audits) must be >= 100 before this claim ships externally per voice §8 example.

## Methodology

A "first audit" is the first completed audit per `project_id`. Excludes runs that error out before producing a verdict.

The threshold for "do not pass" is `verdict != 'PASS'` — FAIL and PASS WITH FIXES both count as "not a clean PASS." This is the strict interpretation; "pass our gate" is the most strict reading.

## Risk if challenged

Medium. The FTC scrutiny on AI-claim substantiation is highest for performance-claim assertions. The wording "most first audits do not pass" is a performance claim about *our own product's output*, not about a competitor. We are best-positioned to substantiate it.

Risk vector: at low N, the share could swing. Mitigation: gate at N >= 100 per voice §8.

Risk vector: if the share ever drops below 50%, the claim must be retired or rephrased. Mitigation: quarterly re-verification.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
