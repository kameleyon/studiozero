/**
 * GDPR Art. 7(1) consent-confirmation email.
 *
 * Fired on cookie/marketing-consent set. Transactional class — sends
 * regardless of marketing-opt-out state because this email IS the
 * consent receipt.
 */
import {
  resolveUserForEmail,
  sendLifecycleEmail,
  type TriggerResult,
} from "./_common";
import { renderConsentConfirmation } from "../email-templates/dunning";


import "server-only";

export interface ConsentConfirmArgs {
  userId: string;
  buckets: { necessary: true; analytics: boolean; marketing: boolean };
  recordedAt: string;
  dedupeKey: string;
}

export async function triggerConsentConfirmation(
  args: ConsentConfirmArgs,
): Promise<TriggerResult> {
  const r = await resolveUserForEmail(args.userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  return sendLifecycleEmail({
    template: "consent-confirmation",
    user: r.user,
    scope: "marketing",
    emailClass: "transactional",
    dedupeKey: args.dedupeKey,
    render: (unsubscribeUrl) =>
      renderConsentConfirmation({
        unsubscribeUrl,
        buckets: args.buckets,
        recorded_at: args.recordedAt,
      }),
  });
}
