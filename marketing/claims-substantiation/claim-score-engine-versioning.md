# claim-score-engine-versioning

**Claim verbatim:** "Deterministic; no LLM in the math; re-run gets same score within 1 point." Plus the rubric weights cited in AMA Q3 (Blocker -25, Critical -10, Major -4, Minor -2, Polish -0.5; threshold for PASS 90+; threshold for FAIL <60 or any Blocker).
**Surface(s):** `marketing/copy/03-emails-e1-through-e5.md` E3 body; `05-ama-prep.md` Q3
**Owner:** Atlas + Jury
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + on every rubric version bump

## Evidence (to author)

- Reference the live `score_engine.v1.json` (or equivalent versioned file) at the pinned commit.
- Confirm the cited weights match the file.
- Confirm the cited thresholds (PASS 90+, FAIL <60 or any Blocker) match the file.

## Methodology

The score engine is published as JSON. The weights, thresholds, and severity enum are deterministic configuration values. Re-running the engine on the same findings list against the same engine version produces the same score by construction.

"Within 1 point" describes the variance introduced by reviewer attribution edge cases when two reviewers find the same underlying issue and the deduplication step has minor non-determinism — addressed in v1.1 of the engine.

## Risk if challenged

Low. The math is open in the published JSON. Reproducibility is a feature, not a marketing claim subject to dispute.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
