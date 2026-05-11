# claim-error-copy-density

**Claim verbatim:** "'Invalid input' — verbatim — appeared in 38 of the 154 audits. 'Something went wrong' — verbatim — in 29."
**Surface(s):** `marketing/copy/04-social-bundles.md` blog launch post
**Owner:** Proof + Hook
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly

## Evidence (to author)

- Internal `findings` table query for first audits, filter where `reviewer = 'proof'` and `evidence` (the cited content) contains either exact phrase.
- Count distinct audits (not findings — one audit can have multiple instances of "Invalid input" but counts once toward the 38).

## Methodology

Verbatim string match on the evidence captured at audit time. Case-insensitive ("INVALID INPUT" counts). Both phrases must be in the rendered HTML or in the source code that produces the rendered HTML.

## Risk if challenged

Low. The claim is about our own audit results. The specific phrases are easy to verify against the cohort data.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
