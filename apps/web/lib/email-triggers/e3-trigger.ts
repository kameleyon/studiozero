/**
 * E3 trigger — PASS WITH FIXES + 30-day re-audit window opens.
 */
import { renderE3PassWithFixes } from "../email-templates/e3-pass-with-fixes-reaudit";
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

export async function triggerE3(
  userId: string,
  runId: string,
): Promise<TriggerResult> {
  const r = await resolveUserForEmail(userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  const supabase = createServiceRoleClient();
  const runRes: any = await supabase
    .from("runs")
    .select(
      "id,project_id,verdict,score,findings_count,audited_domain,severity_counts",
    )
    .eq("id", runId)
    .maybeSingle();

  const row = runRes?.data;
  if (!row) return { status: "error", error: "run_not_found" };
  if (row.verdict !== "PASS_WITH_FIXES" && row.verdict !== "PASS WITH FIXES") {
    return { status: "suppressed", reason: "marketing_opted_out" };
  }

  const severity = (row.severity_counts ?? {}) as Record<string, number>;
  const critical = Number(severity.critical ?? 1);
  const major = Number(severity.major ?? 3);
  const minor = Number(severity.minor ?? 2);
  const fixes = critical + major + minor;
  const score = Number(row.score ?? 81);
  const points_to_pass = Math.max(0, 100 - score);
  const closeDate = formatLocaleDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return sendLifecycleEmail({
    template: "e3-pass-with-fixes-reaudit",
    user: r.user,
    scope: "reaudit",
    emailClass: "transactional",
    dedupeKey: `run:${runId}`,
    analyticsId: "e3",
    render: (unsubscribeUrl) =>
      renderE3PassWithFixes({
        unsubscribeUrl,
        audited_domain: row.audited_domain ?? "your project",
        project_id: row.project_id,
        run_id: row.id,
        score,
        points_to_pass,
        fixes_count: fixes,
        critical,
        major,
        minor,
        window_close_date: closeDate,
      }),
  });
}
