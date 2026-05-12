/**
 * Shared trigger helpers — consent gate, email-event idempotency, send.
 */
import { track } from "../analytics-events.v1";
import { getAppBaseUrl } from "../email-templates/_layout";
import {
  buildUnsubscribeUrl,
  type UnsubscribeScope,
} from "../email-templates/_unsubscribe-token";
import {
  sendEmail,
  type EmailTemplateId,
  type RenderedEmail,
  type SendEmailResult,
} from "../resend-client";
import { createServiceRoleClient } from "../supabase-service";

import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TriggerResult =
  | { status: "sent"; email_event_id: string; provider_message_id: string }
  | { status: "stubbed"; email_event_id: string; reason: string }
  | { status: "suppressed"; reason: SuppressionReason }
  | { status: "duplicate"; email_event_id: null }
  | { status: "error"; error: string };

export type SuppressionReason =
  | "user_not_found"
  | "user_missing_email"
  | "email_invalid"
  | "marketing_opted_out"
  | "marketing_consent_required"
  | "winback_already_sent"
  | "schema_not_ready";

export interface ResolvedUser {
  id: string;
  email: string;
  display_name: string | null;
  default_tenant_id: string | null;
  email_marketing_opted_out: boolean;
  email_invalid_at: string | null;
  marketing_consent: boolean;
}

export async function resolveUserForEmail(
  userId: string,
): Promise<{ ok: true; user: ResolvedUser } | { ok: false; reason: SuppressionReason }> {
  const supabase = createServiceRoleClient();
  const res: any = await supabase
    .from("users")
    .select(
      "id,email,display_name,default_tenant_id,email_marketing_opted_out,email_invalid_at,marketing_consent",
    )
    .eq("id", userId)
    .maybeSingle();

  if (res?.error) {
    const code = res.error.code;
    if (code === "42703" || /column .* does not exist/i.test(String(res.error.message ?? ""))) {
      return { ok: false, reason: "schema_not_ready" };
    }
    return { ok: false, reason: "user_not_found" };
  }

  const row = res?.data;
  if (!row) return { ok: false, reason: "user_not_found" };
  if (!row.email) return { ok: false, reason: "user_missing_email" };
  if (row.email_invalid_at) return { ok: false, reason: "email_invalid" };

  const user: ResolvedUser = {
    id: row.id,
    email: row.email,
    display_name: row.display_name ?? null,
    default_tenant_id: row.default_tenant_id ?? null,
    email_marketing_opted_out: row.email_marketing_opted_out === true,
    email_invalid_at: row.email_invalid_at ?? null,
    marketing_consent: row.marketing_consent === true,
  };
  return { ok: true, user };
}

export type EmailClass = "transactional" | "marketing";

export interface SendLifecycleEmailArgs {
  template: EmailTemplateId;
  user: ResolvedUser;
  scope: UnsubscribeScope;
  emailClass: EmailClass;
  dedupeKey: string;
  render: (unsubscribeUrl: string) => RenderedEmail;
  analyticsId?: "e1" | "e2" | "e3" | "e4" | "e5";
}

export async function sendLifecycleEmail(
  args: SendLifecycleEmailArgs,
): Promise<TriggerResult> {
  const supabase = createServiceRoleClient();
  const { user, template, scope, emailClass, dedupeKey, render, analyticsId } = args;

  if (user.email_marketing_opted_out && emailClass === "marketing") {
    return { status: "suppressed", reason: "marketing_opted_out" };
  }
  if (emailClass === "marketing" && !user.marketing_consent) {
    return { status: "suppressed", reason: "marketing_consent_required" };
  }

  const eventId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const tenantId = user.default_tenant_id ?? null;

  const insertRes: any = await supabase.from("email_events").insert({
    id: eventId,
    tenant_id: tenantId,
    user_id: user.id,
    template,
    dedupe_key: dedupeKey,
    delivery_status: "pending",
    metadata: { email_class: emailClass, scope },
  });

  if (insertRes?.error) {
    const code = insertRes.error.code;
    const msg = String(insertRes.error.message ?? "");
    if (code === "23505") {
      return { status: "duplicate", email_event_id: null };
    }
    if (code === "42P01" || code === "42703" || /relation .*email_events.* does not exist/i.test(msg)) {
      return { status: "suppressed", reason: "schema_not_ready" };
    }
    return { status: "error", error: msg || "email_events_insert_failed" };
  }

  let result: SendEmailResult;
  try {
    const unsubscribeUrl = buildUnsubscribeUrl(getAppBaseUrl(), user.id, scope);
    const rendered = render(unsubscribeUrl);
    result = await sendEmail({
      to: user.email,
      template,
      rendered,
      tags: { template, user_id: user.id, env: process.env.NODE_ENV ?? "unknown" },
      listUnsubscribeUrl: unsubscribeUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "render_failed";
    await supabase
      .from("email_events")
      .update({ delivery_status: "failed", metadata: { error: msg } })
      .eq("id", eventId);
    return { status: "error", error: msg };
  }

  if (result.status === "sent") {
    await supabase
      .from("email_events")
      .update({
        delivery_status: "sent",
        provider_message_id: result.provider_message_id,
        sent_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (analyticsId) {
      void track("e_email_sent", { email_id: analyticsId, user_id: user.id });
    }
    return {
      status: "sent",
      email_event_id: eventId,
      provider_message_id: result.provider_message_id,
    };
  }

  if (result.status === "stub") {
    await supabase
      .from("email_events")
      .update({
        delivery_status: "pending",
        metadata: { stub_reason: result.reason },
      })
      .eq("id", eventId);
    return { status: "stubbed", email_event_id: eventId, reason: result.reason };
  }

  await supabase
    .from("email_events")
    .update({
      delivery_status: "failed",
      metadata: { error: result.error },
    })
    .eq("id", eventId);
  return { status: "error", error: result.error };
}
