/**
 * Studio Zero — Stripe webhook handler (M2 Batch 1 scaffold).
 *
 * Verify fills this in at M2 Batch 2. Requires a mocked Stripe SDK
 * (`stripe.webhooks.constructEventAsync` over fixture payloads from
 * `runner/fixtures/stripe-webhook-corpus/`) + a service-role Supabase
 * client.
 *
 * Contract to verify (per finance/stripe-config.md §3 + §3.4):
 *   - Signature verification runs BEFORE any DB write.
 *   - billing_events.stripe_event_id UNIQUE → duplicate delivery returns
 *     200 + duplicate:true without a second side-effect.
 *   - customer.subscription.created → subscriptions UPSERT + EU/UK
 *     cooling_off_windows row with trigger_event='subscribe'.
 *   - customer.subscription.updated with rank-up plan change → fresh
 *     cooling_off_windows row with trigger_event='upgrade' (D22).
 *   - customer.subscription.deleted → status='canceled'.
 *   - invoice.payment_succeeded → status flip past_due → active.
 *   - invoice.payment_failed → status='past_due' + dunning audit event.
 *   - payment_intent.succeeded → fix_pr_jobs.state='queued'→'building'
 *     keyed on metadata.run_id.
 *   - charge.dispute.created → disputes row (where Atlas's 0003 lands)
 *     + Sentry warning emitted.
 *
 * Replay-stale: events older than the Stripe library's 5-minute
 * tolerance must be rejected even when signature is valid.
 */
import { describe, it } from "vitest";

describe("Stripe webhook handler (M2)", () => {
  it.skip("verifies signature before any DB write (needs mocked Stripe SDK)", () => {});

  it.skip("idempotent: duplicate event_id returns 200 + duplicate:true (needs mocked Stripe SDK)", () => {});

  it.skip("customer.subscription.created opens EU cooling_off_windows row (needs mocked SDK)", () => {});

  it.skip("customer.subscription.updated upgrade resets cooling_off_windows (needs mocked SDK)", () => {});

  it.skip("invoice.payment_failed flips status to past_due + emits dunning event (needs mocked SDK)", () => {});

  it.skip("payment_intent.succeeded transitions fix_pr_jobs queued→building (needs V1.5 fixtures)", () => {});

  it.skip("charge.dispute.created emits Sentry warning + disputes row (needs disputes table)", () => {});
});
