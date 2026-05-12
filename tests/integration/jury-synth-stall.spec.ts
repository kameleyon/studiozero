/**
 * Studio Zero — Jury synth-stall → failed_synth_timeout (D21, M2 Batch 1
 * scaffold).
 *
 * Verify fills this in at M2 Batch 2. Requires:
 *   - Runner deployed with synth-timeout instrumentation (Forge M2 D21
 *     deliverable per sprint/milestone-M2.md).
 *   - run_state enum value 'failed_synth_timeout' active (tables.sql
 *     already declares — confirm Atlas migration shipped).
 *   - Stripe test mode for the auto-refund leg (Forge §8.1
 *     failed-synth refund path).
 *
 * Contract to verify (per ia/user-flows/audit-run-state-machine.md
 * D21 path + finance/stripe-config.md §8.1):
 *   - Synth stall > 30 s → runs.state transitions to
 *     'failed_synth_timeout' (NOT 'failed_terminal').
 *   - Auto-refund issued for Managed-tier tokens (BYOK platform fee
 *     unaffected).
 *   - Customer can restart the run from the verdict-screen CTA.
 *   - audit_logs row written with the refund details + idempotency key
 *     `refund:synthstall:<run_id>`.
 *   - Restart preserves the original run_id linkage in metadata.
 */
import { describe, it } from "vitest";

describe("Jury synth-stall → failed_synth_timeout (D21) (M2)", () => {
  it.skip("synth stall >30s transitions runs.state to failed_synth_timeout (needs runner)", () => {});

  it.skip("Managed-tier token refund issued with stable idempotency key (needs Stripe test mode)", () => {});

  it.skip("BYOK platform fee not refunded (needs Stripe test mode)", () => {});

  it.skip("restart preserves original run_id linkage (needs runner)", () => {});
});
