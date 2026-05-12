/**
 * E5 trigger — Day-60 win-back.
 *
 * Marketing-class per Herald §E5. CASL Canada requires confirmed
 * opt-in: refuses to send unless `users.marketing_consent = true`.
 * Cool-off: one E5 per user, ever.
 */
import { renderE5Winback } from "../email-templates/e5-day-60-winback";
import { createServiceRoleClient } from "../supabase-service";
import {
  resolveUserForEmail,
  sendLifecycleEmail,
  type TriggerResult,
} from "./_common";

import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */

function formatLocaleDate(d: Date): string {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export async function triggerE5ForUser(
  userId: string,
  projectId: string | null = null,
): Promise<TriggerResult> {
  const r = await resolveUserForEmail(userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  if (!r.user.marketing_consent) {
    return { status: "suppressed", reason: "marketing_consent_required" };
  }
  if (r.user.email_marketing_opted_out) {
    return { status: "suppressed", reason: "marketing_opted_out" };
  }

  const supabase = createServiceRoleClient();
  const userRes: any = await supabase
    .from("users")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();
  const createdAt = userRes?.data?.created_at;
  const signupDate = createdAt ? formatLocaleDate(new Date(createdAt)) : "earlier this year";

  return sendLifecycleEmail({
    template: "e5-day-60-winback",
    user: r.user,
    scope: "winback",
    emailClass: "marketing",
    dedupeKey: "winback",
    analyticsId: "e5",
    render: (unsubscribeUrl) =>
      renderE5Winback({
        unsubscribeUrl,
        signup_date: signupDate,
        project_id: projectId,
      }),
  });
}

export interface E5SelectorRow {
  user_id: string;
  project_id: string | null;
}

export async function triggerE5Selector(
  nowMs: number = Date.now(),
): Promise<{ fired: number; suppressed: number; errors: number }> {
  void nowMs;
  const supabase = createServiceRoleClient();
  const res: any = await supabase
    .from("email_e5_candidates")
    .select("user_id,project_id");
  if (res?.error) {
    return { fired: 0, suppressed: 0, errors: 1 };
  }
  const rows: E5SelectorRow[] = res?.data ?? [];
  let fired = 0;
  let suppressed = 0;
  let errors = 0;
  for (const row of rows) {
    const r = await triggerE5ForUser(row.user_id, row.project_id);
    if (r.status === "sent" || r.status === "stubbed") fired += 1;
    else if (r.status === "suppressed" || r.status === "duplicate") suppressed += 1;
    else errors += 1;
  }
  return { fired, suppressed, errors };
}
