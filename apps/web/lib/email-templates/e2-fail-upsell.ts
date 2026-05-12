/**
 * E2 — Post-FAIL upsell (Surface → Code).
 *
 * Locked content: `marketing/copy/03-emails-e1-through-e5.md` §E2.
 * Substantiation gate (`EMAIL_E2_SUBSTANTIATION_READY=true`) required
 * before E2 fires on live customers.
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

export interface E2Context {
  unsubscribeUrl: string;
  audited_domain: string;
  project_id: string;
  run_id: string;
  findings_total: number;
  score: number;
  blockers: number;
  critical: number;
  remainder: number;
}

export function renderE2FailUpsell(ctx: E2Context): RenderedEmail {
  const base = getAppBaseUrl();
  const reportUrl = `${base}/app/audits/${encodeURIComponent(ctx.run_id)}`;
  const upgradeUrl = `${base}/app/upgrade?from=e2&plan=byok-starter&project=${encodeURIComponent(ctx.project_id)}`;

  const subject =
    `${ctx.findings_total} issues on ${ctx.audited_domain} — and we only ran Surface.`.slice(0, 78);

  const footer: FooterContext = {
    contextLine: "You're getting this because your free Surface audit completed.",
    unsubscribeUrl: ctx.unsubscribeUrl,
    preferencesUrl: preferencesUrl(),
    privacyUrl: privacyUrl(),
  };

  const vars = {
    audited_domain: ctx.audited_domain,
    score: ctx.score,
    blockers: ctx.blockers,
    critical: ctx.critical,
    remainder: ctx.remainder,
  };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Your Surface audit on <span style="font-family:Menlo,Consolas,monospace;font-size:14px;">{audited_domain}</span> finished. Verdict: FAIL. Score: {score} / 100.</p>`,
    `<p style="margin:0 0 8px 0;">What we found, briefly:</p>`,
    `<ul style="margin:0 0 16px 24px;padding:0;">`,
    `<li style="margin:0 0 6px 0;">{blockers} Blockers &mdash; both accessibility, both on /signup.</li>`,
    `<li style="margin:0 0 6px 0;">{critical} Critical &mdash; split across copy clarity and brand consistency.</li>`,
    `<li style="margin:0 0 6px 0;">{remainder} more across Major, Minor, and Polish.</li>`,
    `</ul>`,
    `<p style="margin:0 0 16px 0;">Every finding is in your dashboard with the evidence.</p>`,
    renderButtonHtml("See the full report →", reportUrl),
    `<p style="margin:24px 0 8px 0;font-weight:600;">What Surface cannot see</p>`,
    `<p style="margin:0 0 16px 0;">Surface audits the live page &mdash; they don&rsquo;t read your code. A Code audit connects to your repo and finds 3 to 5 times as many issues: dead code, unused dependencies, semantic HTML problems, security patterns, design-system drift.</p>`,
    `<p style="margin:0 0 16px 0;">Same project. Deeper gate.</p>`,
    renderButtonHtml("Run the Code audit →", upgradeUrl),
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const bodyHtml = interpolateHtml(bodyHtmlTemplate, vars);

  const html = renderShellHtml({ subject, bodyHtml, ...footer });

  const textTemplate = [
    `Your Surface audit on {audited_domain} finished. Verdict:`,
    `FAIL. Score: {score} / 100.`,
    ``,
    `What we found, briefly:`,
    ``,
    `  • {blockers} Blockers — both accessibility, both on /signup.`,
    `  • {critical} Critical — split across copy clarity and brand`,
    `    consistency.`,
    `  • {remainder} more across Major, Minor, and Polish.`,
    ``,
    `Every finding is in your dashboard with the evidence.`,
    ``,
    `See the full report: ${reportUrl}`,
    ``,
    `What Surface cannot see`,
    ``,
    `Surface audits the live page — they don't read your code.`,
    `A Code audit connects to your repo and finds 3 to 5 times`,
    `as many issues: dead code, unused dependencies, semantic`,
    `HTML problems, security patterns, design-system drift.`,
    ``,
    `Same project. Deeper gate.`,
    ``,
    `Run the Code audit: ${upgradeUrl}`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject, html, text };
}
