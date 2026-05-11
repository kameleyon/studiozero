# Case Studies

Per-project retrospectives. The studio writes one of these after every project (or every audit, when audit-only). They're how Stage 5 (self-improvement) gets concrete data instead of generic platitudes.

## Conventions

- Filename: `<project-slug>-<date-yyyy-mm-dd>.md`
- One per significant event: full project ship, audit run, postmortem
- Frontmatter required (so future scripts can aggregate metrics)

## What goes in

1. **What we built** (or audited) — one paragraph
2. **Time, cost, headcount** (number of agents spawned, wall-clock, estimated $/run if known)
3. **What worked** — patterns to repeat
4. **What broke** — specific failures, with file:line where possible
5. **Action items** — concrete changes to agents, runners, protocols, or templates with owners

## How they're used

- Quarterly: read the last 90 days of case studies; identify recurring action items; promote them to `ROADMAP.md`
- Per-agent: when an agent appears in 3+ case studies as an underperformer, escalate to BigBrain for reshaping
- Per-runner: when a runner (audit-run.js, run-project.js) appears in 3+ case studies with a bug, prioritize fixing it

## Don't fake them

A case study with no honest "what broke" section is worse than no case study. If everything went perfectly, write that — but interrogate the run before declaring it. Real projects have at least one thing worth recording.
