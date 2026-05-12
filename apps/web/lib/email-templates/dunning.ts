/**
 * Dunning + cancellation-confirmation templates.
 *
 * Locked content: `marketing/copy/07-cancellation-emails.md`.
 * FTC 16 CFR 425 §425.4(b) — cancellation confirmation 60-second SLA.
 */
import {
  getAppBaseUrl,
  interpolateHtml,
  interpolateText,
  preferencesUrl,
  privacyUrl,
  renderButtonHtml,
  renderShellHtml,
  renderShellText,
  type FooterContext,
} from "./_layout";

import type { RenderedEmail } from "../resend-client";

import "server-only";

export interface DunningContext {
  unsubscribeUrl: string;
  tier: string;
  invoice_amount: string;
  deadline?: string;
}

function dunningFooter(ctx: { unsubscribeUrl: string; context: string }): FooterContext {
  return {
    contextLine: ctx.context,
    unsubscribeUrl: ctx.unsubscribeUrl,
    preferencesUrl: preferencesUrl(),
    privacyUrl: privacyUrl(),
  };
}

function updatePaymentUrl(): string {
  return `${getAppBaseUrl()}/api/billing/portal`;
}

export function renderDunningT0(ctx: DunningContext): RenderedEmail {
  const subject = "Your payment didn't go through.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "You're receiving this because your subscription payment was declined.",
  });
  const vars = { tier: ctx.tier, invoice_amount: ctx.invoice_amount };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Your card on file was declined for {tier} ({invoice_amount}). We&rsquo;ll try again in 3 days.</p>`,
    `<p style="margin:0 0 16px 0;">If you&rsquo;d rather not wait, update your payment method now:</p>`,
    renderButtonHtml("Update payment method →", updatePaymentUrl()),
    `<p style="margin:0 0 16px 0;">Your subscription is active. Your access continues as normal.</p>`,
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject,
    bodyHtml: interpolateHtml(bodyHtmlTemplate, vars),
    ...footer,
  });

  const textTemplate = [
    `Your card on file was declined for {tier} ({invoice_amount}).`,
    `We'll try again in 3 days.`,
    ``,
    `If you'd rather not wait, update your payment method now:`,
    ``,
    `Update payment method: ${updatePaymentUrl()}`,
    ``,
    `Your subscription is active. Your access continues as normal.`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject, html, text };
}

export function renderDunningT3(ctx: DunningContext): RenderedEmail {
  const subject = "We tried again — still no luck.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "You're receiving this because your subscription payment was declined twice.",
  });
  const vars = {
    tier: ctx.tier,
    deadline: ctx.deadline ?? "the deadline on your statement",
  };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Second time the card on file came back declined for {tier}.</p>`,
    `<p style="margin:0 0 16px 0;">To keep your subscription, update your payment method:</p>`,
    renderButtonHtml("Update payment method →", updatePaymentUrl()),
    `<p style="margin:0 0 16px 0;">We&rsquo;ll try one more time in 4 days. If we can&rsquo;t bill you by {deadline}, we&rsquo;ll move into the grace window.</p>`,
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject,
    bodyHtml: interpolateHtml(bodyHtmlTemplate, vars),
    ...footer,
  });

  const textTemplate = [
    `Second time the card on file came back declined for {tier}.`,
    ``,
    `To keep your subscription, update your payment method:`,
    ``,
    `Update payment method: ${updatePaymentUrl()}`,
    ``,
    `We'll try one more time in 4 days. If we can't bill you by`,
    `{deadline}, we'll move into the grace window.`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject, html, text };
}

export function renderDunningT7(ctx: DunningContext): RenderedEmail {
  const subject = "7 days remain on your grace period.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "You're receiving this because your subscription entered the grace window.",
  });
  const vars = { deadline: ctx.deadline ?? "the grace window close" };
  const moveToFreeUrl = `${getAppBaseUrl()}/app/settings/billing/cancel?reason=downgrade-to-free`;

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Three card retries, three declines. Your Studio Zero subscription is now in a 7-day grace window.</p>`,
    `<p style="margin:0 0 16px 0;">If we can&rsquo;t bill you by {deadline}, your subscription cancels and your account moves to the free plan. Your past audits and findings stay available for export either way.</p>`,
    `<p style="margin:0 0 16px 0;">Update your payment method here:</p>`,
    renderButtonHtml("Update payment method →", updatePaymentUrl()),
    `<p style="margin:0 0 16px 0;">Or, if you&rsquo;d rather, downgrade to free now:</p>`,
    renderButtonHtml("Move to free →", moveToFreeUrl),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject,
    bodyHtml: interpolateHtml(bodyHtmlTemplate, vars),
    ...footer,
  });

  const textTemplate = [
    `Three card retries, three declines. Your Studio Zero`,
    `subscription is now in a 7-day grace window.`,
    ``,
    `If we can't bill you by {deadline}, your subscription`,
    `cancels and your account moves to the free plan. Your past`,
    `audits and findings stay available for export either way.`,
    ``,
    `Update your payment method here:`,
    `${updatePaymentUrl()}`,
    ``,
    `Or, if you'd rather, downgrade to free now:`,
    `${moveToFreeUrl}`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject, html, text };
}

export function renderDunningT14(ctx: DunningContext): RenderedEmail {
  const subject = "Last warning.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "Final notice before involuntary cancellation.",
  });
  const vars = { deadline: ctx.deadline ?? "the grace deadline" };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Last try.</p>`,
    `<p style="margin:0 0 16px 0;">Your subscription cancels in 7 days if we can&rsquo;t bill you by {deadline}. After that, your account moves to the free plan automatically.</p>`,
    `<p style="margin:0 0 16px 0;">Update your card here:</p>`,
    renderButtonHtml("Update payment method →", updatePaymentUrl()),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject,
    bodyHtml: interpolateHtml(bodyHtmlTemplate, vars),
    ...footer,
  });

  const textTemplate = [
    `Last try.`,
    ``,
    `Your subscription cancels in 7 days if we can't bill you`,
    `by {deadline}. After that, your account moves to the free`,
    `plan automatically.`,
    ``,
    `Update your card here:`,
    `${updatePaymentUrl()}`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject, html, text };
}

export function renderDunningT21(ctx: DunningContext): RenderedEmail {
  const subject = "Your Studio Zero subscription is cancelled.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "You're receiving this because your subscription was cancelled after retries failed.",
  });
  const resubUrl = `${getAppBaseUrl()}/app/billing/upgrade`;

  const bodyHtml = [
    `<p style="margin:0 0 16px 0;">Your subscription is cancelled.</p>`,
    `<p style="margin:0 0 16px 0;">Three weeks of retries on a card that didn&rsquo;t go through. Your account is on the free plan now; your past audits and findings stay available for export.</p>`,
    `<p style="margin:0 0 16px 0;">If your card situation is resolved, re-subscribe at the same plan:</p>`,
    renderButtonHtml("Re-subscribe →", resubUrl),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({ subject, bodyHtml, ...footer });

  const text = renderShellText(
    [
      `Your subscription is cancelled.`,
      ``,
      `Three weeks of retries on a card that didn't go through.`,
      `Your account is on the free plan now; your past audits and`,
      `findings stay available for export.`,
      ``,
      `If your card situation is resolved, re-subscribe at the`,
      `same plan:`,
      ``,
      `Re-subscribe: ${resubUrl}`,
      ``,
      `— Studio Zero`,
    ].join("\n"),
    footer,
  );

  return { subject, html, text };
}

export interface CancelContext {
  unsubscribeUrl: string;
  period_end: string;
  refund_amount?: string;
}

export function renderCancelUsDefault(ctx: CancelContext): RenderedEmail {
  const subject = "Your Studio Zero subscription is cancelled.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "You're receiving this because you cancelled your subscription.",
  });
  const disputeUrl = `${getAppBaseUrl()}/app/settings/billing/disputes`;
  const vars = { period_end: ctx.period_end };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Your cancellation is confirmed.</p>`,
    `<p style="margin:0 0 16px 0;">Your access continues through {period_end}. After that, your account moves to the free plan; your past audits and findings stay available for export.</p>`,
    `<p style="margin:0 0 16px 0;">No refund applies on this cancellation under your region&rsquo;s policy. If you believe the service didn&rsquo;t deliver what you paid for, you can dispute a finding within 60 days:</p>`,
    renderButtonHtml("Dispute a finding →", disputeUrl),
    `<p style="margin:0 0 16px 0;">You can re-subscribe anytime at the same link you used to sign up.</p>`,
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject,
    bodyHtml: interpolateHtml(bodyHtmlTemplate, vars),
    ...footer,
  });

  const text = renderShellText(
    interpolateText(
      [
        `Your cancellation is confirmed.`,
        ``,
        `Your access continues through {period_end}. After that, your`,
        `account moves to the free plan; your past audits and findings`,
        `stay available for export.`,
        ``,
        `No refund applies on this cancellation under your region's`,
        `policy. If you believe the service didn't deliver what you`,
        `paid for, you can dispute a finding within 60 days:`,
        ``,
        `Dispute a finding: ${disputeUrl}`,
        ``,
        `You can re-subscribe anytime at the same link you used to`,
        `sign up.`,
        ``,
        `— Studio Zero`,
      ].join("\n"),
      vars,
    ),
    footer,
  );

  return { subject, html, text };
}

export function renderCancelEuUk(ctx: CancelContext & { currency?: string }): RenderedEmail {
  const subject = "Your Studio Zero refund is processing.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "You're receiving this because you cancelled under EU/UK cooling-off.",
  });
  const exportUrl = `${getAppBaseUrl()}/app/settings/data/export`;
  const refundAmount = ctx.refund_amount ?? "your full purchase price";
  const currency = ctx.currency ?? "";
  const vars = { refund_amount: refundAmount, currency };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Your cancellation is confirmed under your 14-day cooling-off right (Directive 2011/83/EU / UK CCR 2013).</p>`,
    `<p style="margin:0 0 16px 0;">A full refund of {refund_amount} {currency} is on its way to your card &mdash; it usually settles within 5 to 10 business days.</p>`,
    `<p style="margin:0 0 16px 0;">Your access ends now. Your past audits and findings stay available for export for 90 days.</p>`,
    renderButtonHtml("Export your data →", exportUrl),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject,
    bodyHtml: interpolateHtml(bodyHtmlTemplate, vars),
    ...footer,
  });

  const text = renderShellText(
    interpolateText(
      [
        `Your cancellation is confirmed under your 14-day cooling-off`,
        `right (Directive 2011/83/EU / UK CCR 2013).`,
        ``,
        `A full refund of {refund_amount} {currency} is on its way to`,
        `your card — it usually settles within 5 to 10 business days.`,
        ``,
        `Your access ends now. Your past audits and findings stay`,
        `available for export for 90 days.`,
        ``,
        `Export your data: ${exportUrl}`,
        ``,
        `— Studio Zero`,
      ].join("\n"),
      vars,
    ),
    footer,
  );

  return { subject, html, text };
}

export function renderCancelCaProrata(ctx: CancelContext): RenderedEmail {
  const subject = "Your Studio Zero subscription is cancelled.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "You're receiving this because you cancelled under California SB 313.",
  });
  const exportUrl = `${getAppBaseUrl()}/app/settings/data/export`;
  const refundAmount = ctx.refund_amount ?? "the unused-period amount";
  const vars = { refund_amount: refundAmount };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Your cancellation is confirmed.</p>`,
    `<p style="margin:0 0 16px 0;">Under California&rsquo;s SB 313, you&rsquo;re entitled to a pro-rata refund of {refund_amount} for the unused portion of this billing period &mdash; it&rsquo;s on its way to your card and usually settles within 5 to 10 business days.</p>`,
    `<p style="margin:0 0 16px 0;">Your access ends now. Your past audits and findings stay available for export.</p>`,
    renderButtonHtml("Export your data →", exportUrl),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject,
    bodyHtml: interpolateHtml(bodyHtmlTemplate, vars),
    ...footer,
  });

  const text = renderShellText(
    interpolateText(
      [
        `Your cancellation is confirmed.`,
        ``,
        `Under California's SB 313, you're entitled to a pro-rata`,
        `refund of {refund_amount} for the unused portion of this`,
        `billing period — it's on its way to your card and usually`,
        `settles within 5 to 10 business days.`,
        ``,
        `Your access ends now. Your past audits and findings stay`,
        `available for export.`,
        ``,
        `Export your data: ${exportUrl}`,
        ``,
        `— Studio Zero`,
      ].join("\n"),
      vars,
    ),
    footer,
  );

  return { subject, html, text };
}

export interface ConsentConfirmContext {
  unsubscribeUrl: string;
  buckets: {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
  };
  recorded_at: string;
}

export function renderConsentConfirmation(ctx: ConsentConfirmContext): RenderedEmail {
  const subject = "Your privacy preferences are saved.";
  const footer = dunningFooter({
    unsubscribeUrl: ctx.unsubscribeUrl,
    context: "This is a record of the privacy preferences you set on Studio Zero.",
  });
  const settingsUrl = `${getAppBaseUrl()}/app/settings/notifications`;

  const yes = "On";
  const no = "Off";

  const bodyHtml = [
    `<p style="margin:0 0 16px 0;">We&rsquo;ve recorded the privacy preferences you set on Studio Zero. This email is your copy of the record.</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;border:1px solid #e5e7eb;border-radius:6px;width:100%;">`,
    `<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Necessary &mdash; ${yes} (required)</td></tr>`,
    `<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Analytics &mdash; ${ctx.buckets.analytics ? yes : no}</td></tr>`,
    `<tr><td style="padding:12px 16px;">Marketing &mdash; ${ctx.buckets.marketing ? yes : no}</td></tr>`,
    `</table>`,
    `<p style="margin:0 0 16px 0;">Recorded at ${ctx.recorded_at}. You can change these anytime:</p>`,
    renderButtonHtml("Manage preferences →", settingsUrl),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({ subject, bodyHtml, ...footer });

  const text = renderShellText(
    [
      `We've recorded the privacy preferences you set on Studio Zero.`,
      `This email is your copy of the record.`,
      ``,
      `  Necessary  — On (required)`,
      `  Analytics  — ${ctx.buckets.analytics ? "On" : "Off"}`,
      `  Marketing  — ${ctx.buckets.marketing ? "On" : "Off"}`,
      ``,
      `Recorded at ${ctx.recorded_at}.`,
      ``,
      `Manage preferences: ${settingsUrl}`,
      ``,
      `— Studio Zero`,
    ].join("\n"),
    footer,
  );

  return { subject, html, text };
}
