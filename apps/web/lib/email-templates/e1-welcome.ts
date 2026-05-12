/**
 * E1 — Signup welcome + first-audit prompt.
 *
 * Locked content: `marketing/copy/03-emails-e1-through-e5.md` §E1.
 * Herald owns the literal copy. Subject: "Your free audit is ready."
 * Word count 96. Flesch-Kincaid grade 7.4.
 */
import {
  escapeHtml,
  getAppBaseUrl,
  preferencesUrl,
  privacyUrl,
  renderButtonHtml,
  renderShellHtml,
  renderShellText,
  type FooterContext,
} from "./_layout";

import type { RenderedEmail } from "../resend-client";

import "server-only";

export interface E1Context {
  unsubscribeUrl: string;
}

const SUBJECT = "Your free audit is ready.";

export function renderE1Welcome(ctx: E1Context): RenderedEmail {
  const base = getAppBaseUrl();
  const ctaPrimary = `${base}/app?action=new-audit`;
  const ctaAlt = `${base}/app?tour=1`;

  const footer: FooterContext = {
    contextLine: "This is a confirmation email about your account.",
    unsubscribeUrl: ctx.unsubscribeUrl,
    preferencesUrl: preferencesUrl(),
    privacyUrl: privacyUrl(),
  };

  const bodyHtml = [
    `<p style="margin:0 0 16px 0;">Welcome to Studio Zero.</p>`,
    `<p style="margin:0 0 16px 0;">Your account is confirmed. Your free Surface audit is waiting — one project, unlimited re-audits, no card on file.</p>`,
    `<p style="margin:0 0 8px 0;">Two ways to start:</p>`,
    `<ol style="margin:0 0 16px 24px;padding:0;">`,
    `<li style="margin:0 0 8px 0;">Connect a GitHub repo. We&rsquo;ll audit the latest commit on your default branch.</li>`,
    `<li style="margin:0 0 8px 0;">Paste a URL you own. We&rsquo;ll audit the live page.</li>`,
    `</ol>`,
    renderButtonHtml("Run my free audit →", ctaPrimary),
    `<p style="margin:0 0 16px 0;">A heads-up before you start: our gate is strict. Most first audits do not pass it &mdash; that is the point. Every finding ships with a file path, a line number, and a fix.</p>`,
    `<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">Prefer to look around first? <a href="${escapeHtml(ctaAlt)}" style="color:#374151;text-decoration:underline;">Tour the dashboard</a>.</p>`,
    `<p style="margin:0 0 0 0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const html = renderShellHtml({
    subject: SUBJECT,
    bodyHtml,
    ...footer,
  });

  const text = renderShellText(
    [
      "Welcome to Studio Zero.",
      "",
      "Your account is confirmed. Your free Surface audit is waiting —",
      "one project, unlimited re-audits, no card on file.",
      "",
      "Two ways to start:",
      "",
      "  1. Connect a GitHub repo. We'll audit the latest commit on",
      "     your default branch.",
      "",
      "  2. Paste a URL you own. We'll audit the live page.",
      "",
      `Run my free audit: ${ctaPrimary}`,
      "",
      "A heads-up before you start: our gate is strict. Most first",
      "audits do not pass it — that is the point. Every finding ships",
      "with a file path, a line number, and a fix.",
      "",
      `Tour the dashboard first: ${ctaAlt}`,
      "",
      "— Studio Zero",
    ].join("\n"),
    footer,
  );

  return { subject: SUBJECT, html, text };
}

export const E1_SUBJECT = SUBJECT;
