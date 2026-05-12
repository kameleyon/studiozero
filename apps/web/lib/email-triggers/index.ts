/**
 * Lifecycle email triggers — public entry points.
 *
 * Owner: Forge (Phase 9 M4 Batch 1). Reviewers: Herald (template
 * call-site shape), Comply (consent + region routing), Lens
 * (`e_email_sent` instrumentation).
 *
 * Every trigger function:
 *   1. Resolves user + consent state via service-role client.
 *   2. Short-circuits on marketing opt-out / missing consent.
 *   3. INSERTs `email_events` row BEFORE calling Resend (UNIQUE
 *      idempotency spine).
 *   4. Mints per-user HMAC unsubscribe token.
 *   5. Fires `track('e_email_sent', ...)` on success.
 */
import "server-only";

export { triggerCancellationConfirmation } from "./cancellation-trigger";
export { triggerConsentConfirmation } from "./consent-trigger";
export { triggerDunning } from "./dunning-trigger";
export { triggerE1 } from "./e1-trigger";
export { triggerE2 } from "./e2-trigger";
export { triggerE3 } from "./e3-trigger";
export { triggerE4ForUser, triggerE4Selector } from "./e4-trigger";
export { triggerE5ForUser, triggerE5Selector } from "./e5-trigger";
export type { TriggerResult } from "./_common";
