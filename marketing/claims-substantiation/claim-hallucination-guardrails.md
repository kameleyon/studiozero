# claim-hallucination-guardrails

**Claim verbatim:** "Schema validation + citation requirement + cross-reviewer consensus on borderlines."
**Surface(s):** `marketing/copy/05-ama-prep.md` Q15
**Owner:** Jury + Verify
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + on every reviewer-prompt or schema version bump

## Evidence (to author)

- Reference `audit-output.v1.schema.json` for the schema-validation gate.
- Reference the reviewer-prompt files at `agents/audit/*/prompt.md` (or equivalent) for the citation requirement.
- Reference the Jury synthesis logic (`agents/audit/jury.md` or equivalent) for the consensus-on-borderlines mechanism.

## Methodology

Three independent gates:

1. Schema validation runs post-reviewer, pre-customer. A finding that fails JSON Schema validation against `audit-output.v1.schema.json` does not ship to the customer.
2. Citation requirement is encoded in each reviewer's prompt and validated by the schema (the `citation` field is required).
3. Cross-reviewer consensus on borderline findings is the Jury synthesizer's job. Documented in Jury's agent file.

## Risk if challenged

Low-medium. The claim is about our process; the FTC has not historically substantiated "guardrail" claims at the same standard as performance claims. Risk vector: a customer experiences a hallucinated finding and we have to point to the Dispute Finding path. Mitigation: the Dispute Finding path is the substantive remedy, and it works.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
