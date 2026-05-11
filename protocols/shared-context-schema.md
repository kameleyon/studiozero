# Studio Zero — Shared Context Schema

The contract for how agents pass work to each other. Without this schema, `shared_context/` is a dumping ground; with it, every agent knows exactly where to read inputs and write outputs.

**Single source of truth:** this file. If an agent or runner disagrees with this schema, the schema wins. Update the schema first, then update the agent.

## Top-level layout

```
shared_context/
├── _template/            ← directory tree to copy when creating a new project
├── audits/               ← audit reports, organized by project + date
│   ├── _template.md      ← Jury's verdict template
│   └── <project>/
│       └── <YYYY-MM-DD>/
│           ├── brief.md
│           ├── optic.md
│           ├── proof.md
│           ├── halo.md
│           ├── compass.md
│           ├── trace.md
│           ├── canon.md
│           └── verdict.md
└── projects/             ← per-project working directories (one per build)
    └── <project-slug>/
        ├── brief.md           ← Jo's original request + BigBrain's translation
        ├── state.json         ← live project state (managed by state-machine.js)
        ├── decisions.md       ← cross-layer decisions log (BigBrain writes)
        ├── handoffs/          ← inter-agent FROM/TO/RE messages
        │   └── <NN>-<from>-<to>.md
        ├── strategy/          ← Phase 1: Strategy outputs
        │   ├── prd.md
        │   ├── personas.md
        │   ├── pricing.md
        │   ├── plan.md
        │   └── competitor-research.md
        ├── design/            ← Phase 1: Design outputs
        │   ├── design-system.md
        │   ├── journey-map.md
        │   ├── brand-guide.md
        │   └── motion-spec.md
        ├── data/              ← Phase 2: Data layer
        │   ├── schema.sql
        │   ├── rls-policies.sql
        │   └── retention-policy.md
        ├── backend/           ← Phase 2: Backend layer (code goes in <project>/code/backend/)
        │   ├── api-contract.md
        │   ├── auth-design.md
        │   └── integration-list.md
        ├── frontend/          ← Phase 3
        │   ├── architecture.md
        │   ├── component-inventory.md
        │   └── perf-budget.md
        ├── security/          ← Phase 2/4
        │   ├── threat-model.md
        │   ├── sbom.json
        │   └── cve-baseline.md
        ├── tests/             ← Phase 4
        │   ├── test-plan.md
        │   ├── load-baselines.md
        │   └── exploratory-findings.md
        ├── devops/            ← Phase 4
        │   ├── ci-config.md
        │   ├── infra-plan.md
        │   ├── observability.md
        │   └── runbooks/
        ├── ai/                ← Phase 5 (conditional)
        │   ├── prompts.md
        │   ├── eval-suite.md
        │   └── rag-config.md
        ├── docs/              ← Phase 6
        │   ├── readme.md
        │   ├── help-articles.md
        │   └── changelog.md
        ├── growth/            ← Phase 6
        │   ├── seo-plan.md
        │   ├── analytics-plan.md
        │   ├── copy.md
        │   └── ab-tests.md
        ├── operations/        ← Phase 6
        │   ├── support-macros.md
        │   ├── billing-config.md
        │   └── compliance-checklist.md
        ├── code/              ← actual generated source files (real implementation lives here)
        │   ├── backend/
        │   ├── frontend/
        │   ├── shared/
        │   └── ...
        └── tickets/           ← audit findings as actionable tickets (audit-action.js writes these)
            └── <severity>-<id>-<short-name>.md
```

## File conventions

### Markdown documents (`.md`)
- Every artifact starts with a YAML frontmatter block:
  ```yaml
  ---
  agent: <agent-codename>
  phase: <phase-number>
  produced: <ISO-8601 timestamp>
  status: draft | final | revised
  consumes: [<list of upstream paths the agent read>]
  ---
  ```
- Body uses standard markdown
- Frontmatter is mandatory — `handoff-verify.js` reads it to confirm authorship and provenance

### State (`state.json`)
- Schema enforced by `state-machine.js`
- Atomic writes only — never edit by hand mid-run
- Schema:
  ```json
  {
    "slug": "<project-slug>",
    "brief": "<one-line summary>",
    "team": "<roster file used, e.g. 'saas'>",
    "phase": "1" | "2" | ... | "7" | "complete" | "halted",
    "phase_status": "pending" | "running" | "complete" | "blocked",
    "audience": "<primary persona description>",
    "started": "<ISO-8601>",
    "updated": "<ISO-8601>",
    "blockers": [{"id": "...", "phase": "...", "owner": "...", "reason": "..."}],
    "history": [{"phase": "...", "agent": "...", "action": "...", "timestamp": "..."}]
  }
  ```

### Handoff messages
- Filename: `<NN>-<from>-<to>.md` where `NN` is a zero-padded sequence number
- Frontmatter:
  ```yaml
  ---
  from: <from-agent>
  to: <to-agent>
  re: <subject>
  status: Request | In Progress | Blocked | Complete | Review
  needs: <what the receiver needs to do, if anything>
  deadline: <ISO-8601 or null>
  ---
  ```
- Body is the full handoff message in the format from `protocols/communication.md`

### Tickets (audit findings)
- Filename: `<severity>-<id>-<short-name>.md` (e.g., `critical-c1-keyboard-trap.md`)
- Frontmatter:
  ```yaml
  ---
  id: <id>
  severity: Blocker | Critical | Major | Minor | Polish
  finding: <one-line summary>
  evidence: <path or URL to evidence>
  reviewer: <originating reviewer codename>
  owner: <agent or layer responsible for fix>
  deadline: <ISO-8601>
  status: open | in_progress | fixed | verified | rejected
  audit_verdict: <path to the verdict that produced this ticket>
  ---
  ```
- Verification: a ticket transitions `fixed → verified` only when the originating reviewer (not the creator) re-audits and confirms

## Per-phase artifact requirements

These are the **minimum** artifacts each phase must produce before the next phase starts. `handoff-verify.js` checks each.

| Phase | Required artifacts | Owners |
|---|---|---|
| 1 — Strategy & Design | `strategy/prd.md`, `strategy/personas.md`, `strategy/plan.md`, `design/design-system.md`, `design/journey-map.md`, `design/brand-guide.md` | axiom, flow, sprint, canvas, pixel |
| 2 — Foundation | `data/schema.sql`, `data/rls-policies.sql`, `backend/api-contract.md`, `backend/auth-design.md`, `security/threat-model.md` | atlas, vault, forge, nexus, shield |
| 3 — Interface | `frontend/architecture.md`, `frontend/component-inventory.md`, `frontend/perf-budget.md`, code under `code/frontend/` | arch, vega, prism, access |
| 4 — Hardening | `tests/test-plan.md`, `devops/ci-config.md`, `devops/infra-plan.md`, `devops/observability.md` | probe, pipeline, terra, watch |
| 5 — Intelligence (conditional) | `ai/prompts.md`, `ai/eval-suite.md` | cortex, oracle |
| 6 — Launch | `docs/readme.md`, `docs/help-articles.md`, `growth/seo-plan.md`, `growth/copy.md`, `operations/compliance-checklist.md` | scribe, guide, signal, herald, comply |
| 7 — Audit | `audits/<project>/<date>/verdict.md` with verdict ∈ {`PASS`, `PASS WITH FIXES`} | jury |

## Path resolution rules

- All paths in this doc are relative to the studio-zero root
- `<project-slug>` is kebab-case, no spaces, no special characters: `senior-fintech-meds`
- Agents resolve their inputs and outputs via the `--project <slug>` flag passed to `task-claude.js`
- Code (the actual implementation) lives under `<project>/code/` — but for projects targeting an external repo, the orchestrator may instead point at that repo via `--code-dir <path>`

## When the schema must be extended

Add a new artifact type when:
1. A new agent is added that produces an output not covered by the existing tree
2. A new phase is introduced
3. An existing artifact needs to be split (e.g., `prd.md` → `prd.md` + `mvp-scope.md` because they're consumed by different downstream agents)

Update this file first. Then update `handoff-verify.js` to validate the new artifact. Then update affected agent files. Order matters — schema changes that don't propagate to the verifier silently break.
