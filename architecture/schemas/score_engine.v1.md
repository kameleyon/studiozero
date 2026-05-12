# Score Engine v1 — Runbook

**Owner:** Atlas (data) + Verify (contract gate) · **Implementer:** Forge (`runner/src/score-engine/v1/index.ts`) · **PRD anchor:** §10 (locked v0.2; rounding locked v0.4)

This document is the **canonical mathematical reference** for the readiness score. Forge implements `score_v1()` from this doc; Verify's `pnpm test score-engine` asserts the implementation against `score_engine.v1.fixtures.json`; the JSON Schema (`score_engine.v1.json`) machine-encodes the same constants for ajv validation of any runner emitting `score_engine_version: "v1"`.

If this doc disagrees with `score_engine.v1.json`, the JSON Schema wins (it is the artifact the runner loads at build time and stamps onto every snapshot). Edits to either MUST be paired.

---

## 1. Formula

```
score = max(0, round_half_even(100 - Σ severity_weight[finding.severity]))
```

Plain English: start at 100, subtract a weighted point cost for every finding, clamp at 0, then round the floating-point result to a single integer using banker's rounding (half-to-even). The output is always an integer in `[0, 100]`.

The starting score (`100`) and the floor (`0`) are constants. They are exposed in `score_engine.v1.json` as `starting_score` and `score_floor` so a future v2 could change them without touching the implementation — but v1 locks both.

## 2. Severity weights

| Severity | Weight | Rationale (PRD §10) |
|---|---|---|
| **Blocker** | 30 | Ships-blocking issue (security hole, data-loss bug, total inaccessibility). Two Blockers ≈ 40-point swing — the floor exists so a perfect-storm input still yields a defined score. |
| **Critical** | 18 | Single Critical alone yields 82 (PASS WITH FIXES band). Two Criticals → 64 → FAIL on score-band. |
| **Major** | 7 | A typical "must fix before launch" finding. One Major alone yields 93 — under the 95 PASS threshold, which is intentional (PRD §10: "the math enforces 'no Major and no Critical'" for a PASS). |
| **Minor** | 2 | Small polish-adjacent issues that still warrant a fix. |
| **Polish** | 0.5 | Genuinely cosmetic. The decimal weight is the **only** source of non-integer intermediate sums in v1 — and the reason banker's rounding is locked at §4 below. |

All five weights appear in `score_engine.v1.json#/properties/weights/properties` as `const` values. The runner MUST load weights from the schema, never duplicate them inline (drift = score divergence = unreproducible audits = a class of bug Atlas will not ship).

## 3. Verdict thresholds and rule precedence (critical — read twice)

The verdict is **not** purely a function of the score. It is a function of `(any_blocker, score)` evaluated in a strict priority order:

```
verdict_rule.priority (evaluated top-to-bottom; first match wins):
  1. any_blocker          → FAIL
  2. score < 70           → FAIL
  3. 70 ≤ score ≤ 94      → PASS WITH FIXES
  4. score ≥ 95           → PASS
```

### Why precedence matters

A run with `score = 99` AND `any_blocker = true` is **FAIL**, not PASS. Rule 1 fires first and short-circuits. An implementation that checks the score band first and never re-examines `any_blocker` produces the right answer for the wrong reason on most inputs and the **wrong** answer on this case.

`score_engine.v1.fixtures.json` row **SE-R02** asserts this directly: one Blocker → score 70 → expected verdict **FAIL** with `verdict_rule_triggered = "any_blocker"`. Row **SE-R15** doubles down: Blocker + score 68 → both rules 1 and 2 would individually trigger FAIL, but the fixture witnesses that rule 1 is the one that fires.

### Inclusive bounds

The PASS WITH FIXES band is `[70, 94]` inclusive on both ends. The PASS band is `[95, ∞)` (capped at 100 by the max-score ceiling). The FAIL-by-score band is `[0, 69]`. There is no gap, no overlap.

| Threshold key (in schema) | Value | Meaning |
|---|---|---|
| `fail_below` | 70 | `score < fail_below` → FAIL (rule 2) |
| `pass_with_fixes_min` | 70 | inclusive lower bound of rule 3 |
| `pass_with_fixes_max` | 94 | inclusive upper bound of rule 3 |
| `pass_min` | 95 | inclusive lower bound of rule 4 |

## 4. Rounding — half-to-even (banker's), not half-up

Locked v0.4 by Verify. The motivation is the Polish weight (0.5): any odd count of Polish findings produces a `.5` fractional deduction, and `.5` fractional deductions land on `.5` raw scores, and rounding mode determines whether those land at the band boundary or one off.

### Behaviour

`round_half_even(x)` returns the closest integer to `x`. When `x` is exactly halfway between two integers, it returns the **even** one.

| Input | half-to-even | half-up (NOT used) |
|---|---|---|
| 94.4 | 94 | 94 |
| **94.5** | **94** (94 is even) | 95 |
| 94.6 | 95 | 95 |
| **95.5** | **96** (96 is even) | 96 |
| 96.5 | 96 (96 is even) | 97 |
| **67.5** | **68** (68 is even) | 68 |
| 67.4 | 67 | 67 |
| 68.5 | 68 (68 is even) | 69 |

The asymmetry vs. half-up is the point: over a population of audits, half-up systematically inflates scores by ~0.25 per `.5` boundary hit; half-to-even has zero expected bias because ties resolve up and down with equal frequency. Verify's `pnpm test schema:property` 1000-iteration determinism test exercises this directly.

### `Math.round` is wrong

JavaScript's `Math.round` is half-**up** (technically half-to-positive-infinity), not half-to-even. **Do not use it.** Implement the rounder explicitly:

```ts
/**
 * Half-to-even (banker's) rounding. Standard library compatible:
 *   - Python `round()` (Python 3)
 *   - PostgreSQL `numeric` default rounding
 *   - IEEE 754 default rounding mode
 *
 * Returns the integer nearest to `x`, breaking ties to even.
 *
 * Implementation note: We round the absolute value and re-sign at the end so
 * the tie-break logic is identical for negative inputs (relevant only if a
 * future v2 lowers `score_floor` below 0; v1 clamps to 0 so this branch is
 * theoretical for now, but the rounder is general).
 */
export function roundHalfEven(x: number): number {
  if (!Number.isFinite(x)) {
    throw new RangeError(`roundHalfEven received non-finite input: ${x}`);
  }
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const floor = Math.floor(absX);
  const diff = absX - floor;

  let rounded: number;
  if (diff < 0.5) {
    rounded = floor;
  } else if (diff > 0.5) {
    rounded = floor + 1;
  } else {
    // diff === 0.5 exactly — tie. Round to the even neighbour.
    rounded = (floor % 2 === 0) ? floor : floor + 1;
  }
  return sign * rounded;
}
```

### Floating-point caveat

`0.5 + 0.5 + 0.5 + 0.5 + 0.5 + 0.5 + 0.5 + 0.5 + 0.5 + 0.5 + 0.5` in IEEE-754 doubles equals exactly `5.5` (powers of 2 in the mantissa cooperate at this scale). The fixtures verify the math at 11, 12, 13, and 9 Polish findings without intermediate-precision drift. If a future severity weight introduces a non-power-of-2-friendly decimal (e.g., 0.3), the implementation MUST switch to fixed-point arithmetic (multiply weights by 10, sum as integers, divide at the end) before computing `raw_score_pre_round`. v1 weights are all friendly; this is a v2 forward-look.

## 5. Reference algorithm (pseudocode)

```ts
import scoreEngineSchema from './score_engine.v1.json' assert { type: 'json' };

type Severity = 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Polish';

interface FindingLike { severity: Severity; }
interface ScoreResult {
  score: number;                              // 0..100 integer
  verdict: 'PASS' | 'PASS WITH FIXES' | 'FAIL';
  verdict_rule_triggered:
    | 'any_blocker'
    | 'score_lt_fail_below'
    | 'score_in_pass_with_fixes_band'
    | 'score_gte_pass_min';
  raw_score_pre_round: number;
  raw_score_post_round: number;
  deduction_total: number;
  any_blocker: boolean;
  clamped: boolean;
}

export function scoreV1(findings: readonly FindingLike[]): ScoreResult {
  const W      = scoreEngineSchema.properties.weights.properties;
  const T      = scoreEngineSchema.properties.thresholds.properties;
  const start  = scoreEngineSchema.properties.starting_score.const;     // 100
  const floor  = scoreEngineSchema.properties.score_floor.const;        // 0

  // Step 1 — sum weighted deductions.
  let deduction_total = 0;
  let any_blocker = false;
  for (const f of findings) {
    deduction_total += (W[f.severity]?.const ?? 0);
    if (f.severity === 'Blocker') any_blocker = true;
  }

  // Step 2 — raw pre-round.
  const raw_score_pre_round = start - deduction_total;

  // Step 3 — round half-to-even.
  const rounded = roundHalfEven(raw_score_pre_round);

  // Step 4 — clamp to [score_floor, starting_score].
  const score = Math.min(start, Math.max(floor, rounded));
  const clamped = score !== rounded;

  // Step 5 — verdict by priority order (DO NOT REORDER).
  let verdict_rule_triggered: ScoreResult['verdict_rule_triggered'];
  let verdict: ScoreResult['verdict'];
  if (any_blocker) {
    verdict_rule_triggered = 'any_blocker';
    verdict = 'FAIL';
  } else if (score < T.fail_below.const) {                              // 70
    verdict_rule_triggered = 'score_lt_fail_below';
    verdict = 'FAIL';
  } else if (score <= T.pass_with_fixes_max.const) {                    // 94
    verdict_rule_triggered = 'score_in_pass_with_fixes_band';
    verdict = 'PASS WITH FIXES';
  } else {
    verdict_rule_triggered = 'score_gte_pass_min';
    verdict = 'PASS';
  }

  return {
    score,
    verdict,
    verdict_rule_triggered,
    raw_score_pre_round,
    raw_score_post_round: rounded,
    deduction_total,
    any_blocker,
    clamped,
  };
}
```

The `raw_score_pre_round`, `raw_score_post_round`, `deduction_total`, `any_blocker`, and `clamped` fields are surfaced so the contract test in `score_engine.v1.fixtures.json` can assert *every step* of the math, not just the final outputs. When a fixture row fails, the breakdown tells the reviewer exactly which step diverged.

## 6. Per-category breakdown

The `score_breakdown.{ux,accessibility,copy,brand,flow,audience}` block in `audit-output.v1.schema.json` is computed by applying the same formula above to the **subset of findings tagged with the matching reviewer**:

| Category | Reviewer source (subset filter) |
|---|---|
| `ux` | `finding.reviewer == "optic"` |
| `accessibility` | `finding.reviewer == "halo"` |
| `copy` | `finding.reviewer == "proof"` |
| `brand` | `finding.reviewer == "canon"` |
| `flow` | `finding.reviewer == "trace"` |
| `audience` | `finding.reviewer == "compass"` |

`jury` findings (reviewer synthesis notes) are excluded from any category breakdown but are included in the global score. A category with zero matching findings yields the category-score `100` (the empty-set produces the perfect ceiling per row **SE-R01**).

## 7. Versioning policy (forward-only)

**Any change to weights, thresholds, rounding mode, or verdict-rule priority order produces a new version file (`score_engine.v2.json`, `score_engine.v2.md`, `score_engine.v2.fixtures.json`).** v1 is never edited in place.

Why: `score_snapshots.score_engine_version` is the persisted version stamp on every audit ever run. An in-place edit to v1's rubric would silently make historical snapshots mathematically incomparable to fresh runs — re-audits would report different scores for the same findings, breaking the "improve-and-re-audit" workflow that the product's value prop rests on.

Atlas v0.2 Critical 1 closed this with the `score_engine_versions` table + the `v1_equivalent_score` analytics column: cross-version comparisons go through `v1_equivalent_score`, which is computed by re-running the historical findings through whichever older engine version is referenced.

Additive, non-breaking changes (e.g., introducing a new optional field on `audit-output.v1` with `additionalProperties: false` already locked) are still considered version bumps for traceability — version stamps are cheap, divergence is expensive.

## 8. Test fixtures

The canonical contract-test rows live at `score_engine.v1.fixtures.json`. Every row is independently verifiable from the formula in this doc — pick any row, apply Sections 1–4 by hand, and you will arrive at the row's `expected_breakdown` and `expected_output`. The 15 rows cover:

- **Boundary rows** at scores 69, 70, 94, 95 (verdict-band edges).
- **Rounding rows** at 94.5, 95.5, 93.5, 67.5 (both half-to-even directions).
- **Clamping rows** (four Blockers → -20 → clamped to 0).
- **Rule-precedence rows** (Blocker present + score 70 → FAIL by rule 1, not rule 3).

Verify's `tests/contract/score-engine.spec.ts` parameterises off this file. If any row fails, CI blocks the PR.

## 9. Cross-references

- **PRD §10** — readiness score, formula, weights, thresholds, rounding mode (locked v0.4).
- **PRD §9.4** — output contract that carries the score.
- **PRD §17 D7** — CLI watermark gating (orthogonal to score; the verdict is the same shape either way).
- **`score_engine.v1.json`** — machine-readable embodiment of every constant in this doc.
- **`score_engine.v1.fixtures.json`** — every row independently verifiable from this doc's formula.
- **`audit-output.v1.schema.json`** — the payload carrying `score`, `verdict`, and `score_breakdown`.
- **`README.md`** — versioning policy and ajv usage pattern.
- **`agents/data/atlas.md`** — Atlas's "schemas are the most expensive thing to change once users have data in them."
- **`architecture/database/tables.sql`** — `score_engine_versions` (rubric table) and `score_snapshots` (persisted output) definitions.
