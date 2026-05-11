# architecture/schemas — README

**Owner:** Atlas (data layer) · **Gate:** Verify Contract layer (`pnpm test schema:validate`) · **Phase:** 5 (Tech Architecture)

Four files in this directory carry the load-bearing data contracts of Studio Zero. Treat them as **schemas-as-files, not schemas-as-prose** (BUILD_FLOW.md Phase 5 lesson learned). If a reviewer adds a field to the audit output without updating these schemas, downstream consumers silently diverge — Verify's CI gate exists to make that impossible.

| File | What it constrains | Consumed by |
|---|---|---|
| `audit-output.v1.schema.json` | The terminal `final_verdict.result` payload (PRD §9.4). | Web app, score engine, share view at `/v/<short-id>`, `verdict-card` component, score_snapshots persistence, V1.5 Auto-PR body composer. |
| `audit-event.v1.ts` | The `runner.runAudit()` event stream (PRD §13.3). | Hosted runner, CLI runner, web Realtime channel consumers, `runs.events_log` persister. |
| `score_engine.v1.json` | Weights, thresholds, rounding mode, verdict-rule priority (PRD §10). | Score-engine implementation in the runner, score_snapshots column `score_engine_version`. |
| `score_engine.v1.fixtures.json` | Canonical (findings_input → score+verdict) rows. | `pnpm test score-engine` contract-test suite (closes Verify Blocker B1). |

## Validation pattern (ajv)

Studio Zero standardises on **ajv** (Draft 2020-12 mode) at every boundary that emits or accepts these payloads. The runner MUST validate `final_verdict.result` against `audit-output.v1.schema.json` *before* emission — if validation fails, the runner emits `{ kind: 'error', code: 'schema_invalid', recoverable: false }` instead, transitioning the run to `failed_terminal` (audit-run-state-machine.md, jury_synthesizing state).

```ts
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import auditOutputSchema from './audit-output.v1.schema.json' assert { type: 'json' };
import scoreEngineSchema from './score_engine.v1.json'   assert { type: 'json' };

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictTuples: true,
  strictTypes: true,
  // We use oneOf for evidence-type discrimination; ajv handles this natively.
});
addFormats(ajv);  // date-time, uri

export const validateAuditOutput   = ajv.compile(auditOutputSchema);
export const validateScoreEngineV1 = ajv.compile(scoreEngineSchema);

// At runner emission:
if (!validateAuditOutput(result)) {
  throw new SchemaInvalidError(validateAuditOutput.errors);
}
```

Strict mode is non-negotiable. `additionalProperties: false` is set at every object level in `audit-output.v1.schema.json` — silent typos in field names would otherwise produce silently-empty downstream consumers.

## Versioning policy (PRD §10)

**Forward-only. Never in-place edit.** Any change to:

- the weights in `score_engine.v1.json`
- the thresholds in `score_engine.v1.json`
- the rounding mode in `score_engine.v1.json`
- the verdict-rule priority order
- any required field in `audit-output.v1.schema.json`
- any enum value (severity, reviewer, verdict, evidence.type) in either schema
- any AuditEvent variant in `audit-event.v1.ts`

…ships as a **new version file** (`score_engine.v2.json`, `audit-output.v2.schema.json`, `audit-event.v2.ts`). The version stamp on every persisted score snapshot (`score_snapshots.score_engine_version`) means old runs remain mathematically reproducible against the engine that produced them, and cross-version re-audit comparisons go through the analytics-emitted `v1_equivalent_score` column (Atlas v0.2 Critical 1 fix — see `architecture/database/tables.sql` and `migration-order.md` for the `score_engine_versions` and `score_snapshots` tables).

Additive, non-breaking changes (e.g., adding a new *optional* field with `additionalProperties: false` already locked) are still considered version bumps for traceability — version stamps are cheap, divergence is expensive.

## Test-fixture-as-contract-test pattern

`score_engine.v1.fixtures.json` is the contract test. The implementation under test is `runner/src/score-engine/v1/index.ts` (to be written by Forge at M0). The PR-blocking test in `tests/contract/score-engine.spec.ts` does, in essence:

```ts
import fixtures from '../../architecture/schemas/score_engine.v1.fixtures.json' assert { type: 'json' };
import { scoreV1 } from '../../runner/src/score-engine/v1';

describe('score_engine v1 — fixture contract', () => {
  for (const row of fixtures.rows) {
    it(`${row.id} — ${row.label}`, () => {
      const out = scoreV1(row.findings_input);
      expect(out.score).toBe(row.expected_output.score);
      expect(out.verdict).toBe(row.expected_output.verdict);
      // Optional but recommended: assert the rule-precedence trace
      expect(out.verdict_rule_triggered).toBe(row.expected_breakdown.verdict_rule_triggered);
    });
  }
});
```

Every row in `score_engine.v1.fixtures.json` includes an `expected_breakdown` block showing the math (`deduction_total`, `raw_score_pre_round`, `raw_score_post_round`, `clamped`, `any_blocker`, `verdict_rule_triggered`). When a row fails, the breakdown tells the reviewer exactly which step diverged — they don't have to redo the arithmetic.

**Rule-precedence rows.** SE-R02 and SE-R15 specifically assert the verdict-rule *priority ordering*, not just the outcome. SE-R15 has both `any_blocker = true` AND `score = 68 < 70` — the test must witness that the implementation marked `any_blocker` as the triggering rule, not `score_lt_fail_below`. This protects against an implementation that accidentally short-circuits the score-band check and produces the right verdict for the wrong reason.

## Cross-references

- PRD §9.4 — output contract
- PRD §10 — readiness score, formula, weights, thresholds, rounding mode (locked v0.4)
- PRD §13.3 — runner contract + AuditEvent enum
- PRD §17 — locked decisions, including D7 (CLI watermark) which gates `audit-output.watermark`
- PRD §18.2 — test data including these fixture files
- `agents/data/atlas.md` — Atlas's rule "schemas are the most expensive thing to change once users have data in them"
- `BUILD_FLOW.md` Phase 5 — exit gate that requires these files to exist in HEAD
- `architecture/database/tables.sql` — `score_snapshots` and `findings` table definitions that persist these payloads
- `ia/user-flows/audit-run-state-machine.md` — `jury_synthesizing` state schema-invalid error path
- `design/components/verdict-card/verdict-card.md` — the UI surface consuming `audit-output.v1`
