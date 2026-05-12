/**
 * Dunning trigger — fans out by `attempt_count`.
 *
 * Called from `apps/web/app/api/webhooks/stripe/route.ts`
 * `handleInvoicePaymentFailed` + the grace-window cron for T+7/14/21.
 */
import {
  resolveUserForEmail,
  sendLifecycleEmail,
  type TriggerResult,
} from "./_common";
import {
  renderDunningT0,
  renderDunningT14,
  renderDunningT21,
  renderDunningT3,
  renderDunningT7,
} from "../email-templates/dunning";

import type { EmailTemplateId } from "../resend-client";


import "server-only";

export type DunningStep = "t0" | "t3" | "t7" | "t14" | "t21";

export interface TriggerDunningArgs {
  userId: string;
  step: DunningStep;
  tier: string;
  invoiceAmount: string;
  deadline?: string;
  dedupeKey: string;
}

export async function triggerDunning(args: TriggerDunningArgs): Promise<TriggerResult> {
  const r = await resolveUserForEmail(args.userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  const baseCtx = {
    tier: args.tier,
    invoice_amount: args.invoiceAmount,
    deadline: args.deadline,
  };

  let template: EmailTemplateId;
  let renderFn: (unsubscribeUrl: string) => ReturnType<typeof renderDunningT0>;
  switch (args.step) {
    case "t0":
      template = "dunning-t0";
      renderFn = (unsubscribeUrl) => renderDunningT0({ unsubscribeUrl, ...baseCtx });
      break;
    case "t3":
      template = "dunning-t3";
      renderFn = (unsubscribeUrl) => renderDunningT3({ unsubscribeUrl, ...baseCtx });
      break;
    case "t7":
      template = "dunning-t7";
      renderFn = (unsubscribeUrl) => renderDunningT7({ unsubscribeUrl, ...baseCtx });
      break;
    case "t14":
      template = "dunning-t14";
      renderFn = (unsubscribeUrl) => renderDunningT14({ unsubscribeUrl, ...baseCtx });
      break;
    case "t21":
      template = "dunning-t21";
      renderFn = (unsubscribeUrl) => renderDunningT21({ unsubscribeUrl, ...baseCtx });
      break;
    default:
      return { status: "error", error: `unknown_dunning_step:${args.step}` };
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
