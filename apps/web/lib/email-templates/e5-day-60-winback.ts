/**
 * E5 — Day-60 win-back.
 *
 * Locked content: `marketing/copy/03-emails-e1-through-e5.md` §E5.
 * Marketing-class. Requires `marketing_consent = true` (CASL Canada
 * confirmed-opt-in). 158 words, grade 7.9. One per user, ever.
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

export interface E5Context {
  unsubscribeUrl: string;
  signup_date: string;
  project_id: string | null;
}

const SUBJECT = "What changed on Studio Zero since you signed up.";

export function renderE5Winback(ctx: E5Context): RenderedEmail {
  const base = getAppBaseUrl();
  const auditUrl = ctx.project_id
    ? `${base}/app/projects/${encodeURIComponent(ctx.project_id)}/re-audit?credit=winback-60d`
    : `${base}/app?action=new-audit&credit=winback-60d`;
  const winbackUnsubUrl = `${base}/app/settings/notifications?unsub=winback`;

  const footer: FooterContext = {
    contextLine: "This is the one and only win-back email you'll get from us.",
    unsubscribeUrl: ctx.unsubscribeUrl,
    preferencesUrl: preferencesUrl(),
    privacyUrl: privacyUrl(),
  };

  const vars = { signup_date: ctx.signup_date };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">You signed up on {signup_date}, ran your first Surface audit, and we haven&rsquo;t heard from you since.</p>`,
    `<p style="margin:0 0 16px 0;">No pressure. But three things changed.</p>`,
    `<ol style="margin:0 0 16px 24px;padding:0;">`,
    `<li style="margin:0 0 8px 0;">We shipped Managed mode. Paste a URL, run a Full audit, no API key required. Same gate. Same rubric.</li>`,
    `<li style="margin:0 0 8px 0;">The CLI runner ships in two weeks. Your code never leaves your machine.</li>`,
    `<li style="margin:0 0 8px 0;">Auto-PR fix delivery is on the V1.5 roadmap. The rubric flags the fix; Studio Zero writes the PR; we re-audit it before it lands.</li>`,
    `</ol>`,
    `<p style="margin:0 0 16px 0;">If any of that changes the math for you, here&rsquo;s a free re-audit credit on your old project:</p>`,
    renderButtonHtml("Run a fresh audit →", auditUrl),
    `<p style="margin:0 0 16px 0;">Or unsubscribe from this list and we won&rsquo;t send another one of these. No hard feelings.</p>`,
    `<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;"><a href="${winbackUnsubUrl}" style="color:#374151;text-decoration:underline;">Unsubscribe from win-back emails</a></p>`,
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const bodyHtml = interpolateHtml(bodyHtmlTemplate, vars);
  const html = renderShellHtml({ subject: SUBJECT, bodyHtml, ...footer });

  const textTemplate = [
    `You signed up on {signup_date}, ran your first Surface`,
    `audit, and we haven't heard from you since.`,
    ``,
    `No pressure. But three things changed.`,
    ``,
    `  1. We shipped Managed mode. Paste a URL, run a Full`,
    `     audit, no API key required. Same gate. Same rubric.`,
    ``,
    `  2. The CLI runner ships in two weeks. Your code never`,
    `     leaves your machine.`,
    ``,
    `  3. Auto-PR fix delivery is on the V1.5 roadmap. The`,
    `     rubric flags the fix; Studio Zero writes the PR;`,
    `     we re-audit it before it lands.`,
    ``,
    `If any of that changes the math for you, here's a free`,
    `re-audit credit on your old project:`,
    ``,
    `Run a fresh audit: ${auditUrl}`,
    ``,
    `Or unsubscribe from this list and we won't send another`,
    `one of these. No hard feelings.`,
    ``,
    `Unsubscribe from win-back emails: ${winbackUnsubUrl}`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject: SUBJECT, html, text };
}

export const E5_SUBJECT = SUBJECT;
