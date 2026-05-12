/**
 * POST /api/email/preferences — granular email-preference toggles.
 *
 * Reviewers: Comply (CASL Canada default-OFF for marketing), Cipher
 * (session-required write). Transactional emails are not toggleable.
 */
import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PreferencesBody {
  product_updates?: boolean;
  marketing?: boolean;
  reaudit_reminders?: boolean;
}

export async function POST(req: Request): Promise<Response> {
  const serverClient = await createServerSupabaseClient();
  const { data: userRes, error: userErr } = await serverClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return new Response(
      JSON.stringify({ error: "not_authenticated" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  let body: PreferencesBody;
  try {
    body = (await req.json()) as PreferencesBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  const patch: Record<string, boolean | string> = {};
  if (typeof body.marketing === "boolean") {
    patch.email_marketing_opted_out = !body.marketing;
    patch.marketing_consent = body.marketing;
  }
  if (typeof body.product_updates === "boolean") {
    patch.email_product_updates_opted_in = body.product_updates;
  }
  if (typeof body.reaudit_reminders === "boolean") {
    patch.email_reaudit_reminders_opted_in = body.reaudit_reminders;
  }
  patch.updated_at = new Date().toISOString();

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", userRes.user.id);

  if (error) {
    return new Response(
      JSON.stringify({ error: "update_failed", detail: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
      },
    );
  }

  await supabase.from("audit_logs").insert({
    tenant_id: null,
    actor_user_id: userRes.user.id,
    action: "admin_action",
    target_kind: "users",
    target_id: userRes.user.id,
    metadata: {
      internal_action: "email_preferences_changed",
      patch,
      source: "settings_notifications_page",
    },
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}
