# Studio Zero — Metrics Schema

Per-project `metrics.json` schema. Owned by Meter (FinOps) and aggregated quarterly to identify slow agents, expensive runs, and contention points.

## Location

Each project directory holds its own metrics file:
```
shared_context/projects/<project-slug>/metrics.json
```

Append-only — every agent run, audit, or deploy adds one record.

## Schema

```json
{
  "project_slug": "motionmax",
  "events": [
    {
      "event_id": "uuid-v4",
      "event_type": "agent_spawn" | "audit_run" | "phase_complete" | "deploy" | "rollback" | "incident",
      "timestamp": "ISO-8601",
      "agent": "optic",                        // for agent_spawn / audit_run
      "phase": "1",                            // for phase_complete
      "duration_seconds": 388.1,
      "outcome": "success" | "timeout" | "failed" | "partial",
      "tokens_in": 12345,                      // when known
      "tokens_out": 3456,                      // when known
      "cost_usd": 0.42,                        // when known
      "artifacts_written": ["path/to/output.md"],
      "error_message": null,                   // populated on outcome != success
      "context": {                             // free-form per event_type
        "audit_severity_counts": { "Blocker": 1, "Critical": 7 },
        "verdict": "FAIL"
      }
    }
  ]
}
```

## Aggregation queries (for the quarterly review)

Read with `node scripts/metrics-roll-up.mjs` (TBD). Useful slices:

- **Time-to-ship per project**: first `agent_spawn` → final `phase_complete:complete` for each project
- **$/run per agent**: sum `cost_usd` grouped by `agent` over the period
- **Defect rate**: count `audit_run` events with `verdict=FAIL` / total `audit_run` events
- **Agent contention**: count `outcome=timeout` events grouped by `agent` — flags reviewers that need longer ceilings or scope tightening
- **Cost regressions**: compare `cost_usd` per `audit_run` over time — alert if 2x baseline

## When to record an event

- **`agent_spawn`** — every `task-claude.js` or `task.js` invocation (Pipeline wraps both)
- **`audit_run`** — `audit-run.js` records one event with the full panel summary
- **`phase_complete`** — `run-project.js` records one per phase transition
- **`deploy`** — Pipeline records on every production deploy
- **`rollback`** — Siren records on every rollback fired
- **`incident`** — Siren records on every declared incident

## What NOT to put in metrics.json

- Findings / verdicts (those live in `shared_context/audits/`)
- Project state (lives in `state.json` — managed by `state-machine.js`)
- Code (lives in `code/` per the schema)
- Decisions or postmortems (live in `decisions.md` and `_case-studies/`)

`metrics.json` is for **counters and timings**, not narrative.
