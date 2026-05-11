# Audit Verdict — `<project-slug>` — `<YYYY-MM-DD>`

> Template stored at `shared_context/audits/_template.md`. Jury synthesizes per-reviewer findings into this format. Do not edit reviewer findings into this file — copy them into the Punch List below with citations.

## 1. Verdict

**Result:** `PASS` | `PASS WITH FIXES` | `FAIL`

**One-line summary for Jo:** _(plain language, no jargon, leads with the answer)_

**Audience this was scored against:** _(per the brief — primary persona, secondary persona; reject the audit if either is missing)_

**Project state at audit:** _(commit SHA / build URL / staging URL — this verdict applies to that exact build)_

---

## 2. Scorecard

Each reviewer scores their domain on a 1-5 rubric, audience-relative. Five = ready to ship, one = unacceptable.

| Reviewer | Score (1-5) | Headline finding | Open Critical | Open Blocker |
|---|---|---|---|---|
| Optic (UX/UI heuristics) | _N_ | _e.g., 3 critical hierarchy issues on dashboard_ | _N_ | _N_ |
| Proof (content & wording) | _N_ | _e.g., onboarding reads at grade 12 for a grade-6 audience_ | _N_ | _N_ |
| Halo (accessibility) | _N_ | _e.g., 4 WCAG AA failures on primary flow_ | _N_ | _N_ |
| Compass (audience alignment) | _N_ | _e.g., 65+ persona excluded by default touch-target sizes_ | _N_ | _N_ |
| Trace (flow & logic) | _N_ | _e.g., dead-end on declined-payment recovery path_ | _N_ | _N_ |
| Canon (visual consistency) | _N_ | _e.g., 12 hard-coded colors bypassing brand tokens_ | _N_ | _N_ |

**Total Critical:** _N_  
**Total Blocker:** _N_  
**Verdict cannot promote from `PASS WITH FIXES` to `PASS` until both totals reach zero, verified by the originating reviewer.**

---

## 3. Punch List (severity-sorted)

> Severity rubric (fixed — defined in `agents/audit/jury.md`):
> - **Blocker** — ships nothing until fixed (legal, security, broken core flow)
> - **Critical** — fix before launch (significant audience exclusion, data loss, brand damage)
> - **Major** — fix before next release (clear friction, comprehension failure)
> - **Minor** — fix when convenient (polish, edge cases)
> - **Polish** — optional improvement
>
> Every finding requires evidence: screen capture, file:line, contrast measurement, screen-reader recording, or tool output. Findings without evidence are rejected back to the reviewer, not listed here.

### Blockers
| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|
| B-1 | _e.g., Halo_ | _Sign-up form unreachable via keyboard on iOS Safari_ | _video at audits/.../halo-keyboard-trap.mov_ | _Access_ | _2026-MM-DD_ |

### Critical
| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|
| C-1 | _e.g., Compass_ | _Default 12px body type fails the 65+ primary persona_ | _persona doc + screen at audits/.../compass-typescale.png_ | _Canvas_ | _2026-MM-DD_ |

### Major
| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|

### Minor
| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|

### Polish
| ID | Reviewer | Finding | Evidence | Owner | Deadline |
|---|---|---|---|---|---|

---

## 4. Routing & Next Steps

- [ ] Blockers routed to layer leads with deadlines
- [ ] Critical findings routed to layer leads with deadlines
- [ ] Major findings logged in Sprint's queue for next-release scope
- [ ] Re-audit scheduled — only originating reviewers, not full panel
- [ ] Pipeline gate: `PASS` or `PASS WITH FIXES` verdict file visible at `shared_context/audits/<project>/<date>/verdict.md`

## 5. Conflict Resolutions

_(Optional — only if reviewers disagreed. Document Jury's decision and the rationale.)_

| Conflict | Reviewers involved | Jury decision | Rationale |
|---|---|---|---|
| _e.g., Optic wanted denser dashboard, Proof wanted more whitespace_ | Optic, Proof | _Side with Proof_ | _Audience is 65+; readability outranks density per the audience rubric_ |

---

## 6. Reviewer Reports

Per-reviewer detailed findings are stored alongside this verdict in:

- `shared_context/audits/<project>/<date>/optic.md`
- `shared_context/audits/<project>/<date>/proof.md`
- `shared_context/audits/<project>/<date>/halo.md`
- `shared_context/audits/<project>/<date>/compass.md`
- `shared_context/audits/<project>/<date>/trace.md`
- `shared_context/audits/<project>/<date>/canon.md`

This verdict file is the synthesized output. Reviewer files are the source of truth for individual findings.

---

## 7. Sign-off

- **Jury (synthesis):** _name + timestamp_
- **BigBrain acknowledgment:** _name + timestamp_
- **Jo's review (only required for `FAIL` or for projects Jo flagged for personal review):** _name + timestamp_
