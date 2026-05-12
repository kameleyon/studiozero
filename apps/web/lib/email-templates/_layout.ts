/**
 * Shared email layout — header + footer + button + plain-text helpers.
 *
 * Owner: Forge (Phase 9 M4 Batch 1). Locked content from Herald
 * (`marketing/copy/03-emails-e1-through-e5.md` §0.1 + §0.2).
 *
 * Hand-written HTML (not react-email) so the locked Herald copy is
 * verbatim and email clients receive exactly what we wrote:
 *   - Inline CSS only (Gmail truncates at 102 KB)
 *   - Table-based layout (no `<div>`-only; clients strip CSS)
 *   - System font stack only (no remote fonts)
 *   - Plain-text MIME alternative dual-shipped
 */
import "server-only";

const SENDER_LINE = "Studio Zero · Studio Zero Inc.";

function postalAddress(): string {
  const v = process.env.EMAIL_SENDER_POSTAL;
  if (v && v.trim().length > 0) return v.trim();
  return "P.O. Box pending — Studio Zero Inc., Delaware, USA";
}

function appBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_APP_URL;
  if (v && v.trim().length > 0) return v.replace(/\/+$/, "");
  return "https://studiozero.dev";
}

export function escapeHtml(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  const s = String(input);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function interpolateText(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

export function interpolateHtml(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    return escapeHtml(vars[key]);
  });
}

export interface FooterContext {
  contextLine: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
  privacyUrl: string;
}

export function renderFooterHtml(ctx: FooterContext): string {
  const base = appBaseUrl();
  return [
    `<tr>`,
    `<td style="padding:24px 24px 32px 24px;border-top:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">`,
    `<p style="margin:0 0 4px 0;">${escapeHtml(SENDER_LINE)}</p>`,
    `<p style="margin:0 0 4px 0;">${escapeHtml(postalAddress())}</p>`,
    `<p style="margin:0 0 12px 0;">${escapeHtml(ctx.contextLine)}</p>`,
    `<p style="margin:0 0 12px 0;">`,
    `<a href="${escapeHtml(ctx.unsubscribeUrl)}" style="color:#374151;text-decoration:underline;">Unsubscribe from product emails</a>`,
    ` · `,
    `<a href="${escapeHtml(ctx.privacyUrl)}" style="color:#374151;text-decoration:underline;">Privacy</a>`,
    ` · `,
    `<a href="${escapeHtml(ctx.preferencesUrl)}" style="color:#374151;text-decoration:underline;">Manage preferences</a>`,
    `</p>`,
    `<p style="margin:0;">Studio Zero is an AI system. See methodology: <a href="${escapeHtml(`${base}/methodology`)}" style="color:#374151;text-decoration:underline;">${escapeHtml(`${base.replace(/^https?:\/\//, "")}/methodology`)}</a></p>`,
    `</td>`,
    `</tr>`,
  ].join("");
}

export function renderFooterText(ctx: FooterContext): string {
  const base = appBaseUrl();
  return [
    "",
    "---",
    SENDER_LINE,
    postalAddress(),
    ctx.contextLine,
    "",
    `Unsubscribe: ${ctx.unsubscribeUrl}`,
    `Privacy: ${ctx.privacyUrl}`,
    `Manage preferences: ${ctx.preferencesUrl}`,
    "",
    `Studio Zero is an AI system. Methodology: ${base}/methodology`,
  ].join("\n");
}

export function renderButtonHtml(label: string, href: string): string {
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">`,
    `<tr><td style="background-color:#111827;border-radius:6px;">`,
    `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>`,
    `</td></tr>`,
    `</table>`,
  ].join("");
}

export interface ShellContext extends FooterContext {
  subject: string;
  bodyHtml: string;
}

export function renderShellHtml(ctx: ShellContext): string {
  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${escapeHtml(ctx.subject)}</title>`,
    `</head>`,
    `<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;">`,
    `<tr><td align="center" style="padding:24px 12px;">`,
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;">`,
    `<tr><td style="padding:32px 24px 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;">`,
    ctx.bodyHtml,
    `</td></tr>`,
    renderFooterHtml(ctx),
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

export function renderShellText(body: string, ctx: FooterContext): string {
  return `${body.trimEnd()}\n${renderFooterText(ctx)}\n`;
}

export function preferencesUrl(): string {
  return `${appBaseUrl()}/app/settings/notifications`;
}
export function privacyUrl(): string {
  return `${appBaseUrl()}/privacy`;
}
export function methodologyUrl(): string {
  return `${appBaseUrl()}/methodology`;
}
export function getAppBaseUrl(): string {
  return appBaseUrl();
}
