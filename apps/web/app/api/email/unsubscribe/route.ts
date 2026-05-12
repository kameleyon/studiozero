/**
 * GET/POST /api/email/unsubscribe?token=... — public unsubscribe endpoint.
 *
 * Owner: Forge (Phase 9 M4 Batch 1). Reviewers: Comply (CAN-SPAM
 * §316.5(a)(3) — must work 30+ days post-send + MUST NOT require sign-in),
 * Cipher (HMAC verification + replay window).
 *
 * The HMAC-signed token carries user_id + scope + expires_at so the
 * preference change applies without a session. Synchronous DB write
 * inside the handler satisfies the CAN-SPAM 10-day SLA trivially.
 *
 * RFC 8058 one-click: accepts POST too — Gmail + Apple Mail honour
 * `List-Unsubscribe-Post: List-Unsubscribe=One-Click` by POSTing here.
 */
import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { verifyUnsubscribeToken } from "../../../../lib/email-templates/_unsubscribe-token";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderConfirmationPage(scope: string): string {
  const scopeLabel =
    scope === "winback" ? "win-back"
    : scope === "reaudit" ? "re-audit reminder"
    : "product";
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="ai-generated" content="studio-zero">',
    "<title>Unsubscribed — Studio Zero</title>",
    "</head>",
    `<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;">`,
    `<main style="max-width:600px;margin:48px auto;padding:32px 24px;background-color:#ffffff;border-radius:8px;">`,
    `<h1 style="font-size:20px;margin:0 0 16px 0;">You're unsubscribed.</h1>`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">You&rsquo;re unsubscribed from <strong>${htmlEscape(scopeLabel)}</strong> emails. We won&rsquo;t send another. You can re-subscribe anytime in your preferences. Transactional emails about your account and billing still come through.</p>`,
    `<p style="font-size:13px;line-height:1.6;margin:0;color:#6b7280;">Studio Zero is an AI system. See methodology: studiozero.dev/methodology</p>`,
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function renderInvalidPage(message: string): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="ai-generated" content="studio-zero">',
    "<title>Unsubscribe link — Studio Zero</title>",
    "</head>",
    `<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;">`,
    `<main style="max-width:600px;margin:48px auto;padding:32px 24px;background-color:#ffffff;border-radius:8px;">`,
    `<h1 style="font-size:20px;margin:0 0 16px 0;">This link is no longer valid.</h1>`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">${htmlEscape(message)} Sign in to your account and use <a href="/app/settings/notifications" style="color:#374151;text-decoration:underline;">Settings &rarr; Notifications</a> to manage your email preferences.</p>`,
    `<p style="font-size:13px;line-height:1.6;margin:0;color:#6b7280;">Studio Zero is an AI system. See methodology: studiozero.dev/methodology</p>`,
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

async function applyUnsubscribe(userId: string, scope: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("users")
    .update({
      email_marketing_opted_out: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  await supabase.from("audit_logs").insert({
    tenant_id: null,
    actor_user_id: userId,
    action: "admin_action",
    target_kind: "users",
    target_id: userId,
    metadata: {
      internal_action: "email_unsubscribed",
      scope,
      source: "email_link",
    },
  });
}

async function handle(token: string | null): Promise<Response> {
  if (!token) {
    return new Response(
      renderInvalidPage("This unsubscribe link is missing its token."),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8", ...aiDisclosureHeaders },
      },
    );
  }

  const verified = verifyUnsubscribeToken(token);
  if (!verified) {
    return new Response(
      renderInvalidPage("This unsubscribe link has expired or was tampered with."),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8", ...aiDisclosureHeaders },
      },
    );
  }

  try {
    await applyUnsubscribe(verified.user_id, verified.scope);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unsubscribe_failed";
    return new Response(
      renderInvalidPage(`We hit a database error processing your unsubscribe: ${msg}`),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8", ...aiDisclosureHeaders },
      },
    );
  }

  return new Response(renderConfirmationPage(verified.scope), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...aiDisclosureHeaders },
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  return handle(url.searchParams.get("token"));
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let token = url.searchParams.get("token");
  if (!token) {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await req.text();
      const params = new URLSearchParams(body);
      token = params.get("token");
    }
  }
  return handle(token);
}
