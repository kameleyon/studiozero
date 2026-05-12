/**
 * Studio Zero — Stripe reconcile race (M2 Batch 1 scaffold; ARCH-D4).
 *
 * Verify fills this in at M2 Batch 2. Requires concurrent fake polls +
 * a fake webhook delivery against a real Supabase project (race on the
 * UNIQUE stripe_subscription_id constraint).
 *
 * Contract to verify (per architecture/decisions.md ARCH-D4 +
 * finance/stripe-config.md §4):
 *   - 10 concurrent polls to /api/billing/reconcile?cs=<cs_id> write
 *     the subscriptions row exactly once.
 *   - One poll racing with the webhook handler writes the row exactly
 *     once (UPSERT idempotency).
 *   - audit_logs row written per poll with internal_action=
 *     'stripe_reconcile_poll'.
 *   - 11th poll within the same (user, cs) → 429 + Retry-After.
 *   - Forged client_reference_id user_id mismatch → 403.
 */
import { describe, it } from "vitest";

describe("Stripe reconcile race (ARCH-D4) (M2)", () => {
  it.skip("10 concurrent polls write subscriptions row exactly once (needs Supabase test instance)", () => {});

  it.skip("poll racing with webhook writes row exactly once (needs concurrent fake events)", () => {});

  it.skip("11th poll returns 429 with Retry-After (needs audit_logs setup)", () => {});

  it.skip("forged user_id segment of client_reference_id → 403 (needs auth fixture)", () => {});
});
