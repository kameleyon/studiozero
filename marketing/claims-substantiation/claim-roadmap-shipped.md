# claim-roadmap-shipped

**Claim verbatim:** "We shipped Managed mode. Paste a URL, run a Full audit, no API key required." AND "The CLI runner ships in two weeks. Your code never leaves your machine." AND "Auto-PR fix delivery is on the V1.5 roadmap."
**Surface(s):** `marketing/copy/03-emails-e1-through-e5.md` E5 win-back body
**Owner:** Sprint + Watch
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB (date-gated)
**Date verified:** —
**Next re-verification:** on every milestone shipping or slipping

## Evidence (to author)

- Managed mode shipping confirmation: link to the changelog entry + the production-flag flip date.
- CLI runner: link to the milestone-M3 acceptance test passing in CI; a "two weeks" claim must be backed by the verified milestone ship date relative to the email send.
- Auto-PR: link to PRD §11 V1.5 deferral note + the V1.5 spec kickoff date.

## Methodology

This claim is date-gated. The E5 email is dynamic — the template references the *currently-shipped roadmap items*, which are pulled from `roadmap.json` (or equivalent source file) at send time.

The "two weeks" language is only correct in the email if the CLI runner is in fact two weeks from shipping at send time. If the timeline slips, the email is suppressed or the language updates.

## Risk if challenged

Medium. Forward-looking statements about ship dates are scrutinized — FTC and SEC both have history here, though Studio Zero is not public. Risk vector: we say "ships in two weeks" and it slips to four. Mitigation: the email is suppressed if the ship-date confidence falls below a threshold; the win-back is sent only when the roadmap is shipping on schedule.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
