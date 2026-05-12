/**
 * E4 trigger — Re-audit window expiring (T-3 days).
 *
 * Two entry points:
 *   - `triggerE4Selector()` — pg-cron-callable
 *   - `triggerE4ForUser(userId, projectId)` — direct call for tests
 */
import { renderE4ReauditExpiring } from "../email-templates/e4-reaudit-window-expiring";
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

export async function triggerE4ForUser(
  userId: string,
  projectId: string,
): Promise<TriggerResult> {
  const r = await resolveUserForEmail(userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  const supabase = createServiceRoleClient();
  const projRes: any = await supabase
    .from("projects")
    .select("id,slug,last_run_id")
    .eq("id", projectId)
    .maybeSingle();
  const project = projRes?.data;
  if (!project) return { status: "error", error: "project_not_found" };

  let lastScore = 81;
  let pointsToPass = 19;
  let fixesCount = 6;
  if (project.last_run_id) {
    const runRes: any = await supabase
      .from("runs")
      .select("score,severity_counts")
      .eq("id", project.last_run_id)
      .maybeSingle();
    if (runRes?.data) {
      lastScore = Number(runRes.data.score ?? lastScore);
      pointsToPass = Math.max(0, 100 - lastScore);
      const sev = (runRes.data.severity_counts ?? {}) as Record<string, number>;
      fixesCount =
        Number(sev.critical ?? 0) + Number(sev.major ?? 0) + Number(sev.minor ?? 0);
      if (fixesCount === 0) fixesCount = 6;
    }
  }

  const closeDate = formatLocaleDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));

  return sendLifecycleEmail({
    template: "e4-reaudit-window-expiring",
    user: r.user,
    scope: "reaudit",
    emailClass: "transactional",
    dedupeKey: `project:${projectId}:t-3`,
    analyticsId: "e4",
    render: (unsubscribeUrl) =>
      renderE4ReauditExpiring({
        unsubscribeUrl,
        project_slug: project.slug ?? "your project",
        project_id: project.id,
        last_run_id: project.last_run_id ?? "unknown",
        last_score: lastScore,
        points_to_pass: pointsToPass,
        fixes_count: fixesCount,
        window_close_date: closeDate,
      }),
  });
}

export interface E4SelectorRow {
  user_id: string;
  project_id: string;
}

export async function triggerE4Selector(
  nowMs: number = Date.now(),
): Promise<{ fired: number; suppressed: number; errors: number }> {
  void nowMs;
  const supabase = createServiceRoleClient();
  const res: any = await supabase
    .from("email_e4_candidates")
    .select("user_id,project_id");
  if (res?.error) {
    return { fired: 0, suppressed: 0, errors: 1 };
  }
  const rows: E4SelectorRow[] = res?.data ?? [];
  let fired = 0;
  let suppressed = 0;
  let errors = 0;
  for (const row of rows) {
    const r = await triggerE4ForUser(row.user_id, row.project_id);
    if (r.status === "sent" || r.status === "stubbed") fired += 1;
    else if (r.status === "suppressed" || r.status === "duplicate") suppressed += 1;
    else errors += 1;
  }
  return { fired, suppressed, errors };
}
