# Studio Zero — Communication Protocol

## Chain of Command

```
Jo (Owner) → BigBrain (Director) → Layer Leads → Agents
```

- **Jo** has final say on everything. She's not a developer — she communicates in vision, outcomes, and vibes. When she says "make it pop" or "this feels off," that's valid input. Translate it.
- **BigBrain** interprets Jo's intent, breaks it into tasks, coordinates agents, resolves conflicts, and reports back. BigBrain is the only agent that speaks directly to Jo unless she addresses someone by name.
- **Layer Leads** are the first agent listed in each layer. They coordinate their layer and speak to BigBrain.

## How Agents Communicate

Every agent interaction follows this format:

```
FROM: [Agent Name] ([Layer])
TO: [Agent Name] ([Layer])  
RE: [Brief subject]
STATUS: [Request | In Progress | Blocked | Complete | Review]

[Message body — clear, concise, actionable]

NEEDS: [What you need from the recipient, if anything]
DEADLINE: [When you need it by, if applicable]
```

## Rules

1. **No agent works in isolation.** Before building anything, check if another agent's work affects yours.
2. **Don't assume — ask.** If a requirement is ambiguous, ask BigBrain. Don't guess.
3. **Show your work.** Every decision includes a brief "why." No magic.
4. **Speak plainly.** Jo reads these sometimes. No unnecessary jargon.
5. **Flag blockers immediately.** Don't sit on problems. Escalate to BigBrain.
6. **Document as you go.** If you learned something, write it down. Future agents need it.
7. **Quality over speed.** Nothing ships half-done. If it needs more time, say so.
8. **Respect the chain.** Don't bypass your layer lead. Don't go to Jo directly unless asked.

## Handoff Protocol

When passing work to another agent:

1. Summarize what you did and what decisions you made
2. List any assumptions you made
3. Specify exactly what the next agent needs to do
4. Include all relevant file paths, endpoints, or references
5. Flag any known issues or risks

## Conflict Resolution

If two agents disagree on an approach:
1. Both present their case with pros/cons to BigBrain
2. BigBrain decides based on project goals + Jo's preferences
3. Decision is final — no relitigating

## Status Updates

Every agent updates their status when:
- Starting a task
- Completing a task
- Hitting a blocker
- Changing approach from what was planned

BigBrain compiles these into updates for Jo.

## Audit Reports

The Audit layer (Jury + Optic, Proof, Halo, Compass, Trace, Canon) operates as an independent panel reviewing work the rest of the studio produced. Audit reports flow through these specific channels:

### Jury → Reviewers (audit dispatch)
When BigBrain or `run-project.js` hands a project to Jury, Jury issues a parallel brief to all six reviewers using the standard FROM/TO/RE format with `RE: AUDIT BRIEF — <project>` and STATUS: `Request`. Each reviewer's brief includes:
- Target audience (audience-relative scoring is mandatory)
- Audit scope (full app, single feature, specific surface)
- Artifact bundle paths (live URL, design specs, brand guide, PRD, persona doc)
- Deadline

### Reviewers → Jury (findings)
Each reviewer responds with a per-reviewer findings file under `shared_context/audits/<project>/<date>/<reviewer>.md` using the rubric defined in `agents/audit/jury.md`. STATUS: `Review`. Every finding requires evidence — findings without an artifact reference (screen capture, file:line, contrast measurement, screen-reader recording) are rejected back to the reviewer.

### Jury → BigBrain (verdict)
Jury synthesizes the six reviewer reports into a single `shared_context/audits/<project>/<date>/verdict.md` matching the template at `shared_context/audits/_template.md`. STATUS: `Complete`. Verdict values are exactly one of:
- `PASS` — ready to ship
- `PASS WITH FIXES` — Critical/Blocker findings must be fixed and re-verified by the originating reviewer before final close
- `FAIL` — significant remediation required; project halts and re-audits later

### Verdict → Layer leads (remediation)
Critical and Blocker findings route from the verdict to the originating layer lead (NOT directly to specialists) with owner + deadline. Layer leads dispatch internally. Once remediation is marked done, the **originating reviewer** (Optic, Proof, Halo, Compass, Trace, or Canon — not the creator) re-verifies the specific finding before it closes.

### Re-audit
A `PASS WITH FIXES` verdict cannot be promoted to `PASS` until every Critical and Blocker is closed by the originating reviewer. Re-audit invokes only the affected reviewer(s), not the full panel — saves token cost and keeps the focus tight.

### Audit gate enforcement
Per `protocols/code-standards.md` — no production deploy without a `PASS` or `PASS WITH FIXES` verdict on file. Pipeline (CI/CD) is the enforcement point.
