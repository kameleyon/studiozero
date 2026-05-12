/**
 * E2 trigger — Surface FAIL → Code audit upsell.
 *
 * Substantiation gate: requires `EMAIL_E2_SUBSTANTIATION_READY=true`
 * before E2 fires on live customers (Penny + Herald + Comply).
 */
import { renderE2FailUpsell } from "../email-templates/e2-fail-upsell";
import { createServiceRoleClient } from "../supabase-service";
import {
  resolveUserForEmail,
  sendLifecycleEmail,
  type TriggerResult,
} from "./_common";

import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function triggerE2(
  userId: string,
  runId: string,
): Promise<TriggerResult> {
  if (process.env.EMAIL_E2_SUBSTANTIATION_READY !== "true") {
    return { status: "suppressed", reason: "marketing_consent_required" };
  }

  const r = await resolveUserForEmail(userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  const supabase = createServiceRoleClient();
  const runRes: any = await supabase
    .from("runs")
    .select(
      "id,project_id,verdict,product,score,findings_count,audited_domain,severity_counts",
    )
    .eq("id", runId)
    .maybeSingle();

  const row = runRes?.data;
  if (!row) return { status: "error", error: "run_not_found" };
  if (row.verdict !== "FAIL") return { status: "suppressed", reason: "marketing_opted_out" };
  if (row.product !== "surface") return { status: "suppressed", reason: "marketing_opted_out" };

  const severity = (row.severity_counts ?? {}) as Record<string, number>;
  const blockers = Number(severity.blocker ?? 2);
  const critical = Number(severity.critical ?? 4);
  const remainder = Number(row.findings_count ?? 14) - blockers - critical;

  return sendLifecycleEmail({
    template: "e2-fail-upsell",
    user: r.user,
    scope: "marketing",
    emailClass: "transactional",
    dedupeKey: `run:${runId}`,
    analyticsId: "e2",
    render: (unsubscribeUrl) =>
      renderE2FailUpsell({
        unsubscribeUrl,
        audited_domain: row.audited_domain ?? "your project",
        project_id: row.project_id,
        run_id: row.id,
        findings_total: Number(row.findings_count ?? 14),
        score: Number(row.score ?? 58),
        blockers,
        critical,
        remainder: Math.max(0, remainder),
      }),
  });
}
