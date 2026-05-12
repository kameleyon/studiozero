/**
 * Cancellation-confirmation trigger.
 *
 * Region routing (`marketing/copy/07-cancellation-emails.md`):
 *   eu, uk        → E-cancel-eu-uk-cooling-off
 *   california    → E-cancel-ca-prorata
 *   us_other, row → E-cancel-us-default
 *
 * FTC 16 CFR 425 §425.4(b) — 60-second SLA from webhook receipt.
 */
import {
  resolveUserForEmail,
  sendLifecycleEmail,
  type TriggerResult,
} from "./_common";
import {
  renderCancelCaProrata,
  renderCancelEuUk,
  renderCancelUsDefault,
} from "../email-templates/dunning";

import type { EmailTemplateId } from "../resend-client";


import "server-only";

export type CancelRegion = "eu" | "uk" | "california" | "us_other" | "row";

export interface CancellationConfirmArgs {
  userId: string;
  region: CancelRegion;
  periodEnd: string;
  dedupeKey: string;
  refundAmount?: string;
  currency?: string;
}

export async function triggerCancellationConfirmation(
  args: CancellationConfirmArgs,
): Promise<TriggerResult> {
  const r = await resolveUserForEmail(args.userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  let template: EmailTemplateId;
  let renderFn: (unsubscribeUrl: string) => ReturnType<typeof renderCancelUsDefault>;
  switch (args.region) {
    case "eu":
    case "uk":
      template = "cancel-eu-uk-cooling-off";
      renderFn = (unsubscribeUrl) =>
        renderCancelEuUk({
          unsubscribeUrl,
          period_end: args.periodEnd,
          refund_amount: args.refundAmount,
          currency: args.currency,
        });
      break;
    case "california":
      template = "cancel-ca-prorata";
      renderFn = (unsubscribeUrl) =>
        renderCancelCaProrata({
          unsubscribeUrl,
          period_end: args.periodEnd,
          refund_amount: args.refundAmount,
        });
      break;
    case "us_other":
    case "row":
    default:
      template = "cancel-us-default";
      renderFn = (unsubscribeUrl) =>
        renderCancelUsDefault({
          unsubscribeUrl,
          period_end: args.periodEnd,
        });
      break;
  }

  return sendLifecycleEmail({
    template,
    user: r.user,
    scope: "marketing",
    emailClass: "transactional",
    dedupeKey: args.dedupeKey,
    render: renderFn,
  });
}
