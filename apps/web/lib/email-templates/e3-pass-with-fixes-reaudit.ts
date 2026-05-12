/**
 * E3 — PASS WITH FIXES + 30-day free re-audit.
 *
 * Locked content: `marketing/copy/03-emails-e1-through-e5.md` §E3.
 * Subject is templated: "{score} / 100 on {domain} — re-audit free for 30 days."
 * Word count 148, grade 7.6.
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

export interface E3Context {
  unsubscribeUrl: string;
  audited_domain: string;
  project_id: string;
  run_id: string;
  score: number;
  points_to_pass: number;
  fixes_count: number;
  critical: number;
  major: number;
  minor: number;
  window_close_date: string;
}

export function renderE3PassWithFixes(ctx: E3Context): RenderedEmail {
  const base = getAppBaseUrl();
  const reportUrl = `${base}/app/audits/${encodeURIComponent(ctx.run_id)}`;
  const reauditUrl = `${base}/app/projects/${encodeURIComponent(ctx.project_id)}/re-audit?credit=re-audit`;

  const subject =
    `${ctx.score} / 100 on ${ctx.audited_domain} — re-audit free for 30 days.`.slice(0, 78);

  const footer: FooterContext = {
    contextLine: `You're getting this because your audit on ${ctx.audited_domain} returned PASS WITH FIXES.`,
    unsubscribeUrl: ctx.unsubscribeUrl,
    preferencesUrl: preferencesUrl(),
    privacyUrl: privacyUrl(),
  };

  const vars = {
    audited_domain: ctx.audited_domain,
    score: ctx.score,
    points_to_pass: ctx.points_to_pass,
    fixes_count: ctx.fixes_count,
    critical: ctx.critical,
    major: ctx.major,
    minor: ctx.minor,
    window_close_date: ctx.window_close_date,
  };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Your audit on <span style="font-family:Menlo,Consolas,monospace;font-size:14px;">{audited_domain}</span> finished. Verdict: PASS WITH FIXES. Score: {score} / 100.</p>`,
    `<p style="margin:0 0 16px 0;">You&rsquo;re {points_to_pass} points from a clean PASS, with {fixes_count} fixes between you and shippable.</p>`,
    `<p style="margin:0 0 8px 0;">The fixes, briefly:</p>`,
    `<ul style="margin:0 0 16px 24px;padding:0;">`,
    `<li style="margin:0 0 6px 0;">{critical} Critical &mdash; heading hierarchy on /pricing.</li>`,
    `<li style="margin:0 0 6px 0;">{major} Major &mdash; copy clarity in error states.</li>`,
    `<li style="margin:0 0 6px 0;">{minor} Minor &mdash; design-system drift on button radii.</li>`,
    `</ul>`,
    `<p style="margin:0 0 16px 0;">Every fix is in your dashboard with the file, the line, and the change to make.</p>`,
    renderButtonHtml("See the fixes →", reportUrl),
    `<p style="margin:24px 0 8px 0;font-weight:600;">The offer: re-audit free for 30 days.</p>`,
    `<p style="margin:0 0 16px 0;">Same project, same rubric version, no charge. Make the {fixes_count} fixes, run it again, see if the score moves. The window opens today and closes on {window_close_date}.</p>`,
    renderButtonHtml("Re-audit free →", reauditUrl),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const bodyHtml = interpolateHtml(bodyHtmlTemplate, vars);
  const html = renderShellHtml({ subject, bodyHtml, ...footer });

  const textTemplate = [
    `Your audit on {audited_domain} finished. Verdict:`,
    `PASS WITH FIXES. Score: {score} / 100.`,
    ``,
    `You're {points_to_pass} points from a clean PASS, with {fixes_count} fixes`,
    `between you and shippable.`,
    ``,
    `The fixes, briefly:`,
    ``,
    `  • {critical} Critical — heading hierarchy on /pricing.`,
    `  • {major} Major — copy clarity in error states.`,
    `  • {minor} Minor — design-system drift on button radii.`,
    ``,
    `Every fix is in your dashboard with the file, the line,`,
    `and the change to make.`,
    ``,
    `See the fixes: ${reportUrl}`,
    ``,
    `The offer: re-audit free for 30 days.`,
    ``,
    `Same project, same rubric version, no charge. Make the`,
    `{fixes_count} fixes, run it again, see if the score moves. The`,
    `window opens today and closes on {window_close_date}.`,
    ``,
    `Re-audit free: ${reauditUrl}`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject, html, text };
}
