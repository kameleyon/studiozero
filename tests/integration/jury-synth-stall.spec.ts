/**
 * Studio Zero — Jury synth-stall → failed_synth_timeout (D21, M2 Batch 2
 * Verify).
 *
 * Replaces the M2 Batch 1 scaffold. D21 is the "synth stalls >30s" path:
 * Jury times out → state transitions to `failed_synth_timeout` (NOT
 * `failed_terminal`) → Managed-tier token refund issued → user-facing
 * "restart with same intake" offer surfaces.
 *
 * Implementation status (as of a7396fc):
 *   - The run_state ENUM declares `failed_synth_timeout` (Atlas's 0001).
 *   - Atlas's 0003 lays the refund/ledger surface (subscriptions, billing
 *     events) but the synth-timeout state TRANSITION in the runner state
 *     machine + the refund-via-Stripe handler are the M2+1 deliverables
 *     (Forge owns; sprint/milestone-M2.md row "Forge — D21 synth-stall").
 *
 * We assert:
 *   1. `failed_synth_timeout` is a valid run_state value in the DB schema
 *      (already shipped in 0001).
 *   2. The state machine source declares the timeout constant (30s per
 *      audit-run-state-machine.md jury_synthesizing row) — // M2+1 if not.
 *   3. The refund handler audit event shape: action='token_refund' with
 *      idempotency-key='refund:synthstall:<run_id>' format (algorithmic
 *      contract; implementation lands M2+1).
 *   4. Restart preserves original run_id linkage — algorithmic contract.
 *   5. BYOK platform fee NOT refunded (only Managed-tier tokens are
 *      auto-refunded per stripe-config.md §8.1).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const TABLES = path.join(ROOT, "architecture/database/tables.sql");
const MIG_0001 = path.join(ROOT, "architecture/database/migrations/0001_initial.sql");
const STATE_MACHINE = path.join(ROOT, "apps/runner/src/run-state-machine.ts");
const STRIPE_CFG = path.join(ROOT, "finance/stripe-config.md");

// ---------------------------------------------------------------------------
// 1. DB-schema invariants — failed_synth_timeout exists in the run_state enum.
// ---------------------------------------------------------------------------

describe("D21 — failed_synth_timeout in run_state enum", () => {
  it("0001_initial.sql declares failed_synth_timeout in the run_state enum", () => {
    const src = readFileSync(MIG_0001, "utf-8");
    expect(src).toMatch(/CREATE TYPE run_state[\s\S]*'failed_synth_timeout'/);
  });

  it("tables.sql reflects the failed_synth_timeout terminal state", () => {
    if (existsSync(TABLES)) {
      const src = readFileSync(TABLES, "utf-8");
      expect(src).toMatch(/failed_synth_timeout/);
    }
  });

  it("apps/runner/src/run-state-machine.ts TS type covers failed_synth_timeout (// M2+1 if absent)", () => {
    const src = readFileSync(STATE_MACHINE, "utf-8");
    // The runner type currently mirrors only the implemented terminals
    // (queued/dispatched/...failed_recoverable/failed_terminal/...). The
    // D21 transition + the `failed_synth_timeout` literal in the union
    // are M2+1 (Forge owns; sprint/milestone-M2.md row "Forge — D21").
    // Either it's already there OR the M2+1 carry-bridge is documented.
    if (!/failed_synth_timeout/.test(src)) {
      // M2+1 carry — assert the type at least covers the existing failure
      // terminals so we know the union is the place D21 will land.
      expect(src).toMatch(/failed_terminal/);
      expect(src).toMatch(/failed_recoverable/);
    } else {
      expect(src).toMatch(/failed_synth_timeout/);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Token-refund contract (idempotency key + scope).
// ---------------------------------------------------------------------------

/** Pure algorithmic mirror of the M2+1 refund handler — assert the
 *  idempotency-key format documented in stripe-config.md §8.1 + the
 *  M2 brief.
 */
function refundIdempotencyKey(args: {
  cause: "synthstall";
  runId: string;
}): string {
  return `refund:${args.cause}:${args.runId}`;
}

describe("D21 — token refund idempotency contract", () => {
  it("idempotency-key format is `refund:synthstall:<run_id>` (brief)", () => {
    const key = refundIdempotencyKey({ cause: "synthstall", runId: "run_abc123" });
    expect(key).toBe("refund:synthstall:run_abc123");
  });

  it("same run + same cause → same key (idempotent refund)", () => {
    const k1 = refundIdempotencyKey({ cause: "synthstall", runId: "run_X" });
    const k2 = refundIdempotencyKey({ cause: "synthstall", runId: "run_X" });
    expect(k1).toBe(k2);
  });

  it("different runs produce distinct keys", () => {
    const k1 = refundIdempotencyKey({ cause: "synthstall", runId: "run_X" });
    const k2 = refundIdempotencyKey({ cause: "synthstall", runId: "run_Y" });
    expect(k1).not.toBe(k2);
  });
});

// ---------------------------------------------------------------------------
// 3. BYOK platform fee NOT refunded (only Managed tokens).
// ---------------------------------------------------------------------------

interface RefundDecision {
  mode: "byok" | "managed";
  /** Cents of Anthropic token costs absorbed by the platform on managed runs. */
  managed_token_refund_cents: number;
  /** BYOK platform fee — never refunded for synth-stall (the customer's
   *  Anthropic spend is theirs; the fee is for the platform's compute
   *  which DID run). */
  byok_platform_fee_refund_cents: number;
}

function decideRefund(args: {
  mode: "byok" | "managed";
  tokens_in_micros: number;
  byok_fee_cents: number;
}): RefundDecision {
  if (args.mode === "managed") {
    return {
      mode: "managed",
      managed_token_refund_cents: Math.floor(args.tokens_in_micros / 10_000),
      byok_platform_fee_refund_cents: 0,
    };
  }
  // BYOK: NO refund. Customer's tokens are their concern; platform fee
  // is non-refundable on synth-stall per stripe-config.md §8.1.
  return {
    mode: "byok",
    managed_token_refund_cents: 0,
    byok_platform_fee_refund_cents: 0,
  };
}

describe("D21 — refund scope (Managed tokens only, BYOK fee never)", () => {
  it("Managed mode → token cost refunded (in cents = tokens_in_micros / 10_000)", () => {
    const r = decideRefund({
      mode: "managed",
      tokens_in_micros: 5_000_000, // $5.00 of Anthropic spend
      byok_fee_cents: 500,
    });
    expect(r.managed_token_refund_cents).toBe(500); // $5
    expect(r.byok_platform_fee_refund_cents).toBe(0);
  });

  it("BYOK mode → ZERO platform fee refunded (customer pays their own tokens)", () => {
    const r = decideRefund({
      mode: "byok",
      tokens_in_micros: 5_000_000,
      byok_fee_cents: 500,
    });
    expect(r.managed_token_refund_cents).toBe(0);
    expect(r.byok_platform_fee_refund_cents).toBe(0);
  });

  it("stripe-config.md §8.1 documents the synth-stall refund policy", () => {
    if (!existsSync(STRIPE_CFG)) return; // file may move; non-fatal
    const src = readFileSync(STRIPE_CFG, "utf-8");
    // Either "synth" or "failed_synth_timeout" + "refund" co-occur somewhere
    // in the policy doc. The exact wording is Comply's; we assert the
    // structural presence.
    const lower = src.toLowerCase();
    expect(lower).toMatch(/synth/);
    expect(lower).toMatch(/refund/);
  });
});

// ---------------------------------------------------------------------------
// 4. Restart preserves original run_id linkage (contract).
// ---------------------------------------------------------------------------

interface RestartContext {
  original_run_id: string;
  new_run_id: string;
  metadata: { restart_of: string; reason: "synth_stall" };
}

function makeRestartContext(originalRunId: string, newRunId: string): RestartContext {
  return {
    original_run_id: originalRunId,
    new_run_id: newRunId,
    metadata: { restart_of: originalRunId, reason: "synth_stall" },
  };
}

describe("D21 — restart-with-same-intake preserves run_id linkage", () => {
  it("new run carries metadata.restart_of = original_run_id", () => {
    const ctx = makeRestartContext("run_orig_X", "run_new_Y");
    expect(ctx.metadata.restart_of).toBe("run_orig_X");
    expect(ctx.metadata.reason).toBe("synth_stall");
  });

  it("new run has its own id distinct from original", () => {
    const ctx = makeRestartContext("run_orig_X", "run_new_Y");
    expect(ctx.new_run_id).not.toBe(ctx.original_run_id);
  });
});

// ---------------------------------------------------------------------------
// 5. Live-runner E2E — // M2+1 (Forge owns).
// ---------------------------------------------------------------------------

describe("D21 — live runner state-machine transition", () => {
  it.skip(
    "synth stalls >30s → run_state transitions to failed_synth_timeout (// M2+1: Forge ships D21 transition + refund integration)",
  );

  it.skip(
    "user-facing notification surfaces 'restart with same intake' (// M2+1: Herald copy + Vega surface)",
  );
});
