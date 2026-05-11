# Sprint Burndown — Studio Zero Productization

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Sprint
**Cadence:** Updated every Monday during execution. Filed alongside per-milestone retros at milestone close.

This file is the canonical weekly burndown. Each milestone's burndown table is mirrored from the per-milestone file at milestone open and updated weekly until milestone close.

---

## How to read this file

| Column | Meaning |
|---|---|
| **Week** | Week number relative to project start (week 1 = M0 kickoff). PRD §16 weeks are placeholders; Sprint firms the calendar after M0 lands. |
| **Planned** | Deliverables scoped for the week per the milestone file's Deliverables-per-layer section. Format: `<count> · <one-line summary>`. |
| **Completed** | Deliverables green at week close. CI-asserted where possible — green build with the matching exit-gate test. |
| **Blocked** | Deliverables stuck. Each one names the blocker + owner + escalation path. |
| **Notes** | Risks, scope changes, decisions surfaced. Anything BigBrain or Jo needs to see in 30 seconds. |

**Sprint's transparency rule:** if a row reads "Completed 4/5" with no note explaining the 5th, Sprint has failed his job. Every gap has a sentence.

---

## Burndown summary card (current state)

| Metric | Value | Source |
|---|---|---|
| **Current milestone** | _(set at M0 kickoff)_ | this file |
| **Week of milestone** | _(N of total)_ | this file |
| **Deliverables shipped this milestone** | _(count vs total)_ | per-milestone file |
| **Deliverables blocked** | _(count)_ | this file Blocked column |
| **Decisions closed this milestone** | _(count vs `owner-matrix.md` §3)_ | owner-matrix.md |
| **Decisions open at risk of milestone deadline** | _(count, names)_ | owner-matrix.md |
| **Self-dogfood gate verdict (M1+)** | _(PASS / PASS WITH FIXES / FAIL — if FAIL, milestone halts)_ | `audits/m<n>.json` |
| **Cross-milestone regression status** | _(green / red on prior gates)_ | CI dashboard |

Sign-off lines (filled at every weekly update):
- **Last updated:** _(YYYY-MM-DD)_
- **Sprint sign-off:** _(name + date)_
- **BigBrain sign-off:** _(name + date)_

---

## M0 — Spike (weeks 1–2)

Total planned deliverables: see `milestone-M0.md` Deliverables-per-layer (~22 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

---

## M1 — Audit MVP (BYOK only) (weeks 3–6)

Total planned deliverables: see `milestone-M1.md` (~38 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |

---

## M2 — Managed mode + billing (weeks 7–9)

Total planned deliverables: see `milestone-M2.md` (~28 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |

---

## M3 — CLI mode + pentest (weeks 10–11)

Total planned deliverables: see `milestone-M3.md` (~22 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 10 | | | | |
| 11 | | | | |

---

## M4 — Lifecycle + polish + WCAG (weeks 12–14)

Total planned deliverables: see `milestone-M4.md` (~24 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 12 | | | | |
| 13 | | | | |
| 14 | | | | |

---

## M5 — Public launch (weeks 15–16)

Total planned deliverables: see `milestone-M5.md` (~18 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 15 | | | | |
| 16 | | | | |

---

## V1.5 — Auto-PR delivery (weeks 17–22)

Total planned deliverables: see `milestone-V1-5.md` (~26 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 17 | | | | |
| 18 | | | | |
| 19 | | | | |
| 20 | | | | |
| 21 | | | | |
| 22 | | | | |

---

## V2 — Build mode + Firecracker (weeks 23–28)

Total planned deliverables: see `milestone-V2.md` (~22 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 23 | | | | |
| 24 | | | | |
| 25 | | | | |
| 26 | | | | |
| 27 | | | | |
| 28 | | | | |

---

## V2.1 — Scaffold generation (weeks 29–34)

Total planned deliverables: see `milestone-V2-1.md` (~16 items).

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 29 | | | | |
| 30 | | | | |
| 31 | | | | |
| 32 | | | | |
| 33 | | | | |
| 34 | | | | |

---

## Retrospective log (filled at each milestone close)

| Milestone | Closed (date) | Verdict (Jury self-dogfood) | What worked | What needs to change | Velocity vs plan |
|---|---|---|---|---|---|
| M0 | | | | | |
| M1 | | | | | |
| M2 | | | | | |
| M3 | | | | | |
| M4 | | | | | |
| M5 | | | | | |
| V1.5 | | | | | |
| V2 | | | | | |
| V2.1 | | | | | |

---

*Burndown v1.0. Updated weekly. Sign-off line is non-negotiable — Sprint and BigBrain both sign every weekly update. A week without a signed update is a Sprint Hard Rule violation (rule 1: transparency over optimism).*
