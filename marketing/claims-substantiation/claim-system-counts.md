# claim-system-counts

**Claim verbatim:** "56 specialist agents · 14 layers · 7 independent auditors · 5 severity levels"
**Surface(s):** `marketing/copy/01-landing-page.md` §3 (hero stats grid)
**Owner:** Halo + Atlas
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly after first VERIFIED

## Evidence (to author)

- Agent roster file at `agents/` directory (each agent has a markdown definition; count is N files).
- Layer map at `SYSTEM_ACHITECTURE.md` (14 named layers).
- Auditor list at `agents/audit/` (Halo, Proof, Optic, Echo, Tide, Cipher, Canon — count is 7).
- Severity enum at `score_engine.v1.json` and PRD §10 (Blocker, Critical, Major, Minor, Polish — count is 5).

## Methodology

Each number is a count of live source-of-truth files in the repo. The substantiation file pins a commit hash at verification time; quarterly refresh re-confirms the count against the then-current main branch.

## Risk if challenged

Low. These are factual counts of named entities in our own system. The risk vector is a count change that doesn't update the landing page — quarterly cadence covers it. A regulator would not challenge a count of files we author.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
