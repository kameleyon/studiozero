/**
 * E4 — Re-audit window expiring (T-3 days).
 *
 * Locked content: `marketing/copy/03-emails-e1-through-e5.md` §E4.
 * 73 words, grade 7.5.
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

export interface E4Context {
  unsubscribeUrl: string;
  project_slug: string;
  project_id: string;
  last_run_id: string;
  last_score: number;
  points_to_pass: number;
  fixes_count: number;
  window_close_date: string;
}

const SUBJECT = "3 days left on your free re-audit.";

export function renderE4ReauditExpiring(ctx: E4Context): RenderedEmail {
  const base = getAppBaseUrl();
  const reauditUrl = `${base}/app/projects/${encodeURIComponent(ctx.project_id)}/re-audit?credit=re-audit`;
  const lastVerdictUrl = `${base}/app/audits/${encodeURIComponent(ctx.last_run_id)}`;

  const footer: FooterContext = {
    contextLine: `You're receiving this because ${ctx.project_slug} has an open re-audit window.`,
    unsubscribeUrl: ctx.unsubscribeUrl,
    preferencesUrl: preferencesUrl(),
    privacyUrl: privacyUrl(),
  };

  const vars = {
    project_slug: ctx.project_slug,
    last_score: ctx.last_score,
    points_to_pass: ctx.points_to_pass,
    fixes_count: ctx.fixes_count,
    window_close_date: ctx.window_close_date,
  };

  const bodyHtmlTemplate = [
    `<p style="margin:0 0 16px 0;">Heads-up &mdash; the 30-day free re-audit window on <span style="font-family:Menlo,Consolas,monospace;font-size:14px;">{project_slug}</span> closes {window_close_date}.</p>`,
    `<p style="margin:0 0 16px 0;">Your last verdict: PASS WITH FIXES, {last_score} / 100. You were {points_to_pass} points from a clean PASS, with {fixes_count} fixes between you and shippable.</p>`,
    renderButtonHtml("Redeem your free re-audit →", reauditUrl),
    `<p style="margin:0 0 16px 0;">Re-audits cover the same project against the same rubric version (v1). The score is comparable.</p>`,
    `<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;"><a href="${lastVerdictUrl}" style="color:#374151;text-decoration:underline;">See my last verdict</a></p>`,
    `<p style="margin:0;">&mdash; Studio Zero</p>`,
  ].join("\n");

  const bodyHtml = interpolateHtml(bodyHtmlTemplate, vars);
  const html = renderShellHtml({ subject: SUBJECT, bodyHtml, ...footer });

  const textTemplate = [
    `Heads-up — the 30-day free re-audit window on`,
    `{project_slug} closes {window_close_date}.`,
    ``,
    `Your last verdict: PASS WITH FIXES, {last_score} / 100.`,
    `You were {points_to_pass} points from a clean PASS, with {fixes_count} fixes`,
    `between you and shippable.`,
    ``,
    `Redeem your free re-audit: ${reauditUrl}`,
    ``,
    `Re-audits cover the same project against the same rubric`,
    `version (v1). The score is comparable.`,
    ``,
    `See my last verdict: ${lastVerdictUrl}`,
    ``,
    `— Studio Zero`,
  ].join("\n");

  const text = renderShellText(interpolateText(textTemplate, vars), footer);

  return { subject: SUBJECT, html, text };
}

export const E4_SUBJECT = SUBJECT;
