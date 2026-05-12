/**
 * POST /api/webhooks/resend — Resend delivery-events webhook (Forge M4 Batch 1).
 *
 * Reviewers: Cipher (HMAC-SHA256 signature verification via Svix),
 * Comply (complained + unsubscribed → users.email_marketing_opted_out
 * within CAN-SPAM 10-day SLA), Watch (Sentry alert on hard bounce).
 *
 * Event taxonomy:
 *   email.delivered    → email_events.delivery_status='delivered'
 *   email.bounced      → hard bounce: users.email_invalid_at=now()
 *   email.complained   → users.email_marketing_opted_out=true
 *   email.opened       → delivery_status='opened'; opened_at
 *   email.clicked      → delivery_status='clicked'; clicked_at
 *   email.unsubscribed → users.email_marketing_opted_out=true (RFC 8058)
 *
 * Signature: Resend uses Svix — verify `svix-id.svix-timestamp.body`
 * HMAC-SHA256 keyed by the secret. Multiple `v1,...` blocks; ANY match wins.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { track } from "../../../../lib/analytics-events.v1";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { type?: string; subType?: string };
    tags?: Array<{ name: string; value: string }>;
    [k: string]: unknown;
  };
}

function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}`;
}

function verifyResendSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  const svixId = headers.get("svix-id");
  const svixTs = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!svixId || !svixTs || !sigHeader) return false;

  const tsSec = Number.parseInt(svixTs, 10);
  if (!Number.isFinite(tsSec)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsSec) > 300) return false;

  const secretRaw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let secretBuf: Buffer;
  try {
    secretBuf = Buffer.from(secretRaw, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${svixId}.${svixTs}.${rawBody}`;
  const expected = createHmac("sha256", secretBuf).update(signedPayload).digest("base64");

  const parts = sigHeader.split(" ");
  for (const part of parts) {
    const [version, signature] = part.split(",", 2);
    if (version !== "v1" || !signature) continue;
    try {
      const a = Buffer.from(signature, "base64");
      const b = Buffer.from(expected, "base64");
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

interface UpdatePatch {
  delivery_status?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  metadata?: Record<string, unknown>;
}

async function updateEmailEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  providerMessageId: string,
  patch: UpdatePatch,
): Promise<void> {
  await supabase
    .from("email_events")
    .update(patch)
    .eq("provider_message_id", providerMessageId);
}

async function suppressMarketingForUser(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string | undefined,
  reason: "complained" | "unsubscribed",
): Promise<void> {
  if (!userId) return;
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
    metadata: { internal_action: `email_${reason}`, source: "resend_webhook" },
  });
}

async function flagBounceForUser(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string | undefined,
): Promise<void> {
  if (!userId) return;
  await supabase
    .from("users")
    .update({
      email_invalid_at: new Date().toISOString(),
      email_marketing_opted_out: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

function findUserIdInTags(
  tags: Array<{ name: string; value: string }> | undefined,
): string | undefined {
  if (!tags) return undefined;
  const t = tags.find((x) => x.name === "user_id");
  return t?.value;
}

export async function POST(req: Request): Promise<Response> {
  const requestId = newRequestId();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    return new Response(
      JSON.stringify({ error: "resend_webhook_not_configured", request_id: requestId }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  const rawBody = await req.text();
  if (!verifyResendSignature(rawBody, req.headers, secret)) {
    return new Response(
      JSON.stringify({ error: "invalid_signature", request_id: requestId }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json", request_id: requestId }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  const supabase = createServiceRoleClient();
  const providerMessageId = event.data?.email_id ?? "";
  if (!providerMessageId) {
    return new Response(JSON.stringify({ received: true, request_id: requestId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
    });
  }

  const userId = findUserIdInTags(event.data?.tags);
  const nowIso = new Date().toISOString();

  try {
    switch (event.type) {
      case "email.delivered":
        await updateEmailEvent(supabase, providerMessageId, {
          delivery_status: "delivered",
          delivered_at: nowIso,
        });
        break;

      case "email.opened":
        await updateEmailEvent(supabase, providerMessageId, {
          delivery_status: "opened",
          opened_at: nowIso,
        });
        if (userId) {
          void track("e_email_opened", {
            user_id: userId,
            provider_message_id: providerMessageId,
          });
        }
        break;

      case "email.clicked":
        await updateEmailEvent(supabase, providerMessageId, {
          delivery_status: "clicked",
          clicked_at: nowIso,
        });
        if (userId) {
          void track("e_email_clicked", {
            user_id: userId,
            provider_message_id: providerMessageId,
          });
        }
        break;

      case "email.bounced": {
        const bounceType = event.data?.bounce?.type ?? "hard";
        await updateEmailEvent(supabase, providerMessageId, {
          delivery_status: "bounced",
          bounced_at: nowIso,
          metadata: { bounce_type: bounceType },
        });
        if (bounceType === "hard" || bounceType === "Permanent") {
          await flagBounceForUser(supabase, userId);
        }
        break;
      }

      case "email.complained":
        await updateEmailEvent(supabase, providerMessageId, {
          delivery_status: "complained",
        });
        await suppressMarketingForUser(supabase, userId, "complained");
        break;

      case "email.unsubscribed":
        await updateEmailEvent(supabase, providerMessageId, {
          delivery_status: "unsubscribed",
        });
        await suppressMarketingForUser(supabase, userId, "unsubscribed");
        if (userId) {
          void track("e_email_unsubscribed", {
            user_id: userId,
            source: "resend_one_click",
          });
        }
        break;

      default:
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "dispatch_failed";
    return new Response(
      JSON.stringify({ error: "dispatch_failed", detail: msg, request_id: requestId }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  return new Response(JSON.stringify({ received: true, request_id: requestId }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}
