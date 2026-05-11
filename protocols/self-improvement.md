# Studio Zero — Self-Improvement Protocol

How Studio Zero gets better over time. Stage 5 of `AGENCY_CHECKLIST.md` codified.

## Cadence

| Cadence | Activity | Owner | Output |
|---|---|---|---|
| **Per project** | Write a case study to `shared_context/projects/_case-studies/` | BigBrain (or whoever ran the project) | One `<slug>-<date>.md` |
| **Per project** | Append events to `shared_context/projects/<slug>/metrics.json` | Pipeline + each runner (`audit-run.js`, `run-project.js`) | Append-only event log per `_metrics-schema.md` |
| **Monthly** | Review the last 30 days of case studies + metrics | BigBrain | Summary in `shared_context/reviews/<YYYY-MM>.md` |
| **Quarterly** | Agent + runner audit — retire / merge / split based on observed patterns | BigBrain + Sprint | Updates to `agents/`, `catalog.json`, `ROADMAP.md` |
| **Quarterly** | Toolchain refresh — re-read `CAPABILITIES.md`, upgrade stale tools, prune unused templates | Pipeline + Terra | Updated `CAPABILITIES.md` and `templates/` |
| **Quarterly** | Severity rubric calibration — has "Critical" drifted into "Major"? | Jury + BigBrain | Updates to `agents/audit/jury.md` rubric definitions |

## Per-project case study

Required for: every full project run, every audit, every postmortem.

Skipped for: throwaway smoke tests where no agent was actually spawned.

Format: see `shared_context/projects/_case-studies/README.md` and the `motionmax-audit-2026-05-09.md` reference.

The honest "what broke" section is the load-bearing element. A case study without one is a case study about a project that hasn't been examined yet.

## Per-project metrics

`metrics.json` per project, schema in `shared_context/projects/_metrics-schema.md`. Events are append-only — never edit a past record; only append new ones.

If no metrics file exists for a project yet (true for projects pre-dating Stage 5), one is created the first time any runner appends to it.

## Monthly review

BigBrain reads:
- Every case study from the last 30 days
- Aggregated metrics (using `scripts/metrics-roll-up.mjs` once it exists)
- Open `Action item` lines from each case study

And writes a one-page review to `shared_context/reviews/<YYYY-MM>.md` covering:
- **Recurring problems** — patterns across multiple projects
- **Action items closed this month** — what we actually shipped
- **Action items still open ≥ 30 days** — flag for prioritization
- **Promoted to ROADMAP.md** — items significant enough to escalate

Monthly review skipped if zero case studies that month.

## Quarterly agent + runner audit

Every 90 days, BigBrain + Sprint look at:

### Agents to **retire**
- Agents that haven't been spawned in 90 days
- Agents whose role has been folded into another agent
- Agents whose persona has rotted (refers to deprecated tools, frameworks, or rules)

### Agents to **merge**
- Two agents whose case-study appearances are always together (shipping together, failing together)
- Two agents with overlapping rubric who haven't produced distinct findings

### Agents to **split**
- An agent appearing as "the slow one" in 3+ case studies (Canon's October 2026 case is the prototype)
- An agent producing wildly different finding types across projects, suggesting two roles inside one persona

### Runners to **harden**
- Any runner with 3+ open action items from case studies
- Any runner whose timeout / contention / cost is flagged in metrics

The output is a PR (manual or AI-driven) against `agents/`, `catalog.json`, `protocols/`, `ROADMAP.md` — same review process as any other code change.

## Quarterly toolchain refresh

Pipeline + Terra:
1. Re-read `CAPABILITIES.md` — is anything listed that's been deprecated, abandoned, or replaced upstream?
2. Run `npm outdated --long` against every project; aggregate version drift
3. Identify templates with > 6 months of dependency lag — propose refresh PRs
4. Review the host's installed toolchains (Node, Python, Swift) — is a major version available?
5. Update `CAPABILITIES.md` with any changes; note migrations in this quarter's monthly review

## Quarterly severity rubric calibration

Jury + BigBrain:
1. Sample 10 random Critical findings from the last quarter
2. Re-score them today — would any be Major now? Major then but Critical now?
3. If > 30% have shifted, the rubric is drifting — update `agents/audit/jury.md` with refined definitions
4. Document the calibration in this quarter's review

This prevents the long-known anti-pattern: "Critical" gradually meaning "the worst we found this week" instead of an absolute bar.

## What this protocol explicitly does NOT do

- **No quarterly off-site, no all-hands review meeting.** Studio Zero has no humans to gather. The cadence is real time + on-cadence file writes.
- **No "monthly metrics dashboard."** The metrics roll-up is on-demand from `metrics.json`, not a maintained dashboard. Build a dashboard only if a Stage 5 review explicitly recommends one — and only as a per-project tool, not a studio-wide one.
- **No agent performance reviews of the praise/blame variety.** Agents are personas, not employees. The action is always to reshape the persona, not to "talk to" the agent.

## How this becomes real

This protocol is theory until two things happen:
1. The first monthly review is written (depends on having ≥ 1 case study in a 30-day window)
2. The first quarterly agent audit is performed (depends on having ≥ 1 month of case studies)

The motionmax audit case study (2026-05-09) is the first data point. The May 2026 review is when this protocol stops being aspirational.
