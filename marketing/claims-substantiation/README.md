# Claims Substantiation Index

**Owner:** Herald (drafted) · Comply (sign-off) · Proof (CI gate)
**Phase:** 8 of BUILD_FLOW.md
**Anchor rule:** master voice doc §8 — any superlative, comparative claim, capability claim, or referenced competitor price must have a substantiation file checked in here. Without the file, the claim does not ship.

> Re-verification cadence: quarterly minimum. Herald + Comply co-sign each refresh. CI rejects builds with claim references missing files.

---

## Substantiation files reserved (Phase 8 GTM authoring)

Reserved paths and status. Each file is a stub at first reservation; full evidence is authored before the referencing copy ships externally.

### Pricing + positioning

- `claim-pricing-positioning.md` — pricing comp class anchors (SonarQube, Codacy, Snyk, Deque, Vanta, v0, Bolt, Lovable, Cursor, Replit, Devin, Clerb-class, Toptal). Owner: Penny + Scout. Status: STUB. Required before any /pricing copy ships.

- `claim-defensible-wedge.md` — "no competitor ships Auto-PR for UX + a11y + copy + brand + audience-fit findings against a versioned readiness rubric." Owner: Scout. Status: STUB. Required before any V1.5 Auto-PR marketing copy ships.

- `claim-system-counts.md` — the 56 / 14 / 7 / 5 numbers in the landing-page hero stats grid. Owner: Halo + Atlas. Status: STUB. Required before hero stats render with non-zero values.

- `claim-auditor-roster.md` — "seven specialist auditors" (Halo, Proof, Optic, Echo, Tide, Cipher, Canon). Owner: BigBrain + Atlas. Status: STUB. Required before solution-card 1 ships.

### Audit performance claims

- `claim-code-vs-surface-findings.md` — "Code audit finds 3 to 5 times as many issues as Surface." Owner: Hook + Halo. Status: STUB. Required before E2 lifecycle email ships at M1.

- `claim-audit-runtime.md` — "Most audits take 6 to 12 minutes." Owner: Hook + Watch. Status: STUB. Required when N > 50 audits in the cohort.

- `claim-dogfood-cohort-scores.md` — "47 dogfood audits, median first-audit score 64 / 100." Owner: Hook + Jury. Status: STUB. Required before IH M2 milestone post + X week 6 post + AMA Q4.

- `claim-reaudit-improvement.md` — "+14 points after one fix cycle." Owner: Hook + Jury. Status: STUB. Required before X week 9 post + AMA Q4.

- `claim-first-audit-pass-rate.md` — "Most first audits do not pass our gate." Owner: Jury + Hook. Status: STUB. Required before any landing-page "most first audits" copy ships externally.

- `claim-ai-builder-failure-modes.md` — "AI builders generate `<input>` elements without labels four times out of five on the first scaffold." Owner: Halo + Hook. Status: STUB. Required before landing-page problem-row 1 ships.

- `claim-a11y-failure-density.md` — "142 of 154 audits returned at least one Blocker-severity accessibility finding (92%). 78% missing programmatic labels." Owner: Halo + Hook. Status: STUB. Required before blog launch post + AMA Q4.

- `claim-error-copy-density.md` — "'Invalid input' verbatim appeared in 38 of 154 audits; 'Something went wrong' in 29." Owner: Proof + Hook. Status: STUB. Required before blog launch post.

### Engine + verdict claims

- `claim-score-engine-versioning.md` — "Deterministic; no LLM in the math; re-run gets same score within 1 point." Owner: Atlas + Jury. Status: STUB. Required before AMA Q3.

- `claim-hallucination-guardrails.md` — "Schema validation + citation requirement + cross-reviewer consensus on borderlines." Owner: Jury + Verify. Status: STUB. Required before AMA Q15.

### Competitive head-to-head

- `claim-head-to-head-lovable.md` — "Ran a Lovable-generated app through Studio Zero: 2 Blockers, 5 Critical, 11 more." Owner: Hook + Halo. Status: STUB. Required before X week 4 post.

- `claim-roadmap-shipped.md` — "We shipped Managed mode; CLI runner ships in two weeks." Owner: Sprint + Watch. Status: STUB. Date-gated; only fires when the roadmap status table updates.

---

## Stub template

Each file at minimum contains:

```
# <claim-id>

**Claim verbatim:** "<exact text as it appears in marketing copy>"
**Surface(s):** <where the claim appears — file paths in marketing/copy/>
**Owner:** <agent>
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB | DRAFTED | VERIFIED | EXPIRED
**Date verified:** YYYY-MM-DD
**Next re-verification:** YYYY-MM-DD (quarterly minimum)

## Evidence

<source citation — URL, screenshot path, dated quote, internal-data file path, or methodology note>

## Methodology

<how the claim was measured / verified, in enough detail that another reader can reproduce>

## Risk if challenged

<plain-language assessment: what would a regulator, journalist, or competitor argue, and what's the rebuttal>

## Change log

| Date | Status | Note |
|---|---|---|
| YYYY-MM-DD | STUB | Reserved by Herald in Phase 8 GTM authoring |
```

---

## Verification rules

1. **CI gate.** Proof's CI check parses every marketing/copy/*.md file for substantiation file references and confirms each file exists. Missing file → build fails.

2. **Quarterly re-verification.** Herald + Comply review every VERIFIED file each quarter. Stale prices, broken citation URLs, or material changes in the methodology trigger a status downgrade to DRAFTED until refresh.

3. **Stub-to-verified path.** A STUB file blocks external copy until upgraded. The internal copy that references the file can still ship behind a feature flag or in pre-launch staging; the external surface waits for VERIFIED.

4. **Comply has veto.** If Comply assesses that a claim cannot be defended against an FTC AI-claim challenge, the claim is rewritten or dropped. Herald rewrites; Comply re-reviews.

---

## Count

- **Total files reserved in Phase 8:** 16
- **Already drafted upstream of this index:** 3 (`claim-pricing-positioning.md`, `claim-defensible-wedge.md`, `claim-code-vs-surface-findings.md` — per `finance/pricing.md` §7)
- **New reservations from the Phase 8 GTM bundle:** 13

---

*End of substantiation index. This file is the canonical list of reservations. Individual stub files live at sibling paths.*
