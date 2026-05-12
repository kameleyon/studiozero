/**
 * Studio Zero — EU/UK cooling-off reset (D22, M2 Batch 1 scaffold).
 *
 * Verify fills this in at M2 Batch 2. Requires Atlas's
 * 0003_billing_managed.sql applied (cooling_off_windows table + trigger)
 * AND mocked Stripe webhook events for subscribe + upgrade flows.
 *
 * Contract to verify (per finance/stripe-config.md §6 + Comply
 * refund-matrix.md §2):
 *   - EU customer signs up → ONE cooling_off_windows row with
 *     trigger_event='subscribe', expires_at = now + 14d.
 *   - EU customer upgrades plan-rank up on day 7 →
 *     SECOND cooling_off_windows row with trigger_event='upgrade',
 *     expires_at = upgrade_day + 14d.
 *   - Old window's exercised_at remains NULL (customer didn't exercise).
 *   - Non-EU/non-UK customer subscribe → ZERO cooling_off_windows rows.
 *   - Downgrade / lateral move → NO new cooling-off row.
 *   - With waiver_signed=true on the original row: refund-eligibility
 *     query (WHERE waiver_signed=false) returns no row.
 *
 * R1 race: subscription.updated arrives BEFORE checkout.session.completed
 * (race in stripe-config.md §3.4) — confirm idempotent upsert still
 * results in exactly one row per (subscription_id, trigger_event).
 */
import { describe, it } from "vitest";

describe("EU/UK cooling-off reset on upgrade (D22) (M2)", () => {
  it.skip("EU subscribe → one row trigger_event='subscribe' (needs 0003 applied)", () => {});

  it.skip("EU upgrade rank-up → fresh row trigger_event='upgrade' (needs 0003 + Stripe fixture)", () => {});

  it.skip("US customer → zero cooling_off_windows rows (needs 0003)", () => {});

  it.skip("downgrade does NOT insert a new cooling-off row (needs plan_rank fn)", () => {});

  it.skip("waiver_signed=true gates refund-eligibility query to false (needs §6.3 query)", () => {});
});
