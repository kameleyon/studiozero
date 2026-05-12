/**
 * Studio Zero — cross-mode consistency (M2 Batch 1 scaffold).
 *
 * Verify fills this in at M2 Batch 2. Requires:
 *   - Runner deployed (Railway us-east per ARCH-D2).
 *   - BYOK + Managed lanes both functional with same model pins.
 *   - A fixture repo with deterministic findings (golden corpus).
 *
 * Contract to verify (per sprint/milestone-M2.md Forge — Cross-mode
 * consistency, PRD M2 exit gate):
 *   - Running the same fixture repo through BYOK vs Managed lanes
 *     emits identical (score, verdict) — model pins from M1 hold.
 *   - finding_ids in score_snapshots match between modes (modulo
 *     non-deterministic ordering on equal-severity ties).
 *   - audit_logs.action='llm_call' rows differ in mode metadata only.
 *
 * Scope: this is the *cross-mode equivalence* assertion, not the
 * golden-corpus assertion (that's `tests/golden-corpus/`).
 */
import { describe, it } from "vitest";

describe("Cross-mode consistency BYOK vs Managed (M2)", () => {
  it.skip("identical (score, verdict) on fixture repo (needs runner deployed)", () => {});

  it.skip("finding_ids match modulo equal-severity ordering (needs runner deployed)", () => {});

  it.skip("audit_logs llm_call rows differ in mode metadata only (needs runner deployed)", () => {});
});
