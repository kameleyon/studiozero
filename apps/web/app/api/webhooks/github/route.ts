/**
 * POST /api/webhooks/github — GitHub App webhook receiver.
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (HMAC), Atlas
 * (tracking_state transitions per ARCH-D6), Trace (UI banner consequences).
 *
 * Verifies `X-Hub-Signature-256` (HMAC-SHA256 over raw body with the App's
 * `GITHUB_APP_WEBHOOK_SECRET`) BEFORE any DB write.
 *
 * Events handled:
 *   - installation.created          → record the install (oauth_tokens row at
 *                                     S-GH; here we just log + flip stale to
 *                                     recovered on existing fix_pr_jobs)
 *   - installation.deleted          → ARCH-D6: flip every open fix_pr_jobs +
 *                                     run row with this github_installation_id
 *                                     to tracking_state='stale'
 *   - installation_repositories.*   → record repo add/remove
 *   - pull_request                  → V1.5 (D23 + tracking_state recovery for
 *                                     PR merge state). At M1 we log only.
 *
 * Cross-refs:
 *   - architecture/decisions.md ARCH-D6
 *   - architecture/iac/supabase/edge-functions/README.md (alternate path)
 */

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import { createServiceRoleClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GhResponse {
  received: boolean;
  request_id: string;
}

function newRequestId(): string {
  return crypto.randomUUID();
}

/** Constant-time string comparison for signature verification. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}

async function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  // Header format: "sha256=<hex>". Reject anything else.
  if (!signatureHeader.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length).trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(provided)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return timingSafeEqualHex(computed, provided);
}

export async function POST(req: Request): Promise<Response> {
  const requestId = newRequestId();
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "github_webhook_not_configured", request_id: requestId }),
      { status: 500, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "missing_signature", request_id: requestId }),
      { status: 400, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  const rawBody = await req.text();
  const verified = await verifyGitHubSignature(rawBody, signature, secret);
  if (!verified) {
    return new Response(
      JSON.stringify({ error: "invalid_signature", request_id: requestId }),
      { status: 401, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json", request_id: requestId }),
      { status: 400, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  const eventType = req.headers.get("x-github-event") ?? "";
  const action = (event.action as string | undefined) ?? "";
  const supabase = createServiceRoleClient();

  try {
    switch (`${eventType}.${action}`) {
      case "installation.created":
      case "installation.new_permissions_accepted":
        await handleInstallationCreated(supabase, event);
        break;
      case "installation.deleted":
      case "installation.suspend":
        await handleInstallationDeleted(supabase, event);
        break;
      case "installation_repositories.added":
      case "installation_repositories.removed":
        // Record repo-list deltas; tracking_state flips happen on full
        // installation events only.
        break;
      case "pull_request.closed":
      case "pull_request.merged":
        // V1.5 — Auto-PR merge tracking. At M1 we log into audit_logs only.
        await handlePullRequestEvent(supabase, event);
        break;
      default:
        // Unknown event — accept the delivery but don't act on it.
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "dispatch_failed";
    return new Response(
      JSON.stringify({ error: "dispatch_failed", detail: msg, request_id: requestId }),
      { status: 500, headers: { "Content-Type": "application/json", ...aiDisclosureHeaders } },
    );
  }

  const ok: GhResponse = { received: true, request_id: requestId };
  return new Response(JSON.stringify(ok), {
    status: 200,
    headers: { "Content-Type": "application/json", ...aiDisclosureHeaders },
  });
}

// ---- handlers --------------------------------------------------------------

async function handleInstallationCreated(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Record<string, unknown>,
): Promise<void> {
  const install = event.installation as { id?: number } | undefined;
  if (!install?.id) return;
  // ARCH-D6 recovery: any fix_pr_jobs / runs row currently in
  // tracking_state='stale' with this installation id flips to 'recovered'.
  // V1.5 Batch 1: re-query PR merge status via GitHub API to backfill the
  // window between uninstall and re-install (per ARCH-D6 "Recovery" — this
  // is the best-effort recovery the customer banner promises).
  try {
    const { data: recoveredFixRows } = await supabase
      .from("fix_pr_jobs")
      .update({ tracking_state: "recovered" })
      .eq("github_installation_id", install.id)
      .eq("tracking_state", "stale")
      .select("id, pr_number");
    // We INTENTIONALLY do not call back into GitHub's REST API from this
    // handler — that work is owned by a scheduled `fix-pr-tracking-recovery`
    // background job (Forge V1.5 follow-up); writing it here would block
    // the webhook response and defeat GitHub's 10s timeout. The UI
    // surfaces the "Tracking resumed — last known state was X" copy per
    // ARCH-D6 §Recovery; an enqueue-on-recovery primitive lands when that
    // background job ships.
    if (recoveredFixRows && recoveredFixRows.length > 0) {
      // Best-effort: log the count for ops observability.
      await supabase.rpc("audit_log_write", {
        p_tenant_id: null,
        p_action: "admin_action",
        p_metadata: {
          kind: "github_app_reinstalled_recovery",
          installation_id: install.id,
          recovered_fix_pr_jobs_count: recoveredFixRows.length,
        },
      });
    }
  } catch {
    // Best-effort — webhook must not 500 because the recovery write failed.
  }
  // Also recover runs.tracking_state per ARCH-D6 §State transitions.
  try {
    // `runs` doesn't carry github_installation_id directly — join via
    // projects.github_installation_id. We do a single update keyed on the
    // run's project to keep this webhook short.
    const { data: projs } = await supabase
      .from("projects")
      .select("id")
      .eq("github_installation_id", install.id);
    const projIds = (projs ?? []).map((p: { id: string }) => p.id);
    if (projIds.length > 0) {
      await supabase
        .from("runs")
        .update({ tracking_state: "recovered" })
        .in("project_id", projIds)
        .eq("tracking_state", "stale");
    }
  } catch {
    // Best-effort
  }
}

async function handleInstallationDeleted(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Record<string, unknown>,
): Promise<void> {
  const install = event.installation as { id?: number } | undefined;
  if (!install?.id) return;
  // ARCH-D6 stale-tracking: any open fix_pr_jobs / runs with this
  // installation id flip from 'active' → 'stale'. UI banner per PRD §11.2 D23.
  try {
    await supabase
      .from("fix_pr_jobs")
      .update({ tracking_state: "stale" })
      .eq("github_installation_id", install.id)
      .eq("tracking_state", "active");
  } catch {
    // tracking_state column lands at V1.5 — swallow until then.
  }
  // Same transition on `runs` — surfaces the banner on every run-detail
  // page, not just the PR-detail subroute (ARCH-D6 UI consequences).
  try {
    const { data: projs } = await supabase
      .from("projects")
      .select("id")
      .eq("github_installation_id", install.id);
    const projIds = (projs ?? []).map((p: { id: string }) => p.id);
    if (projIds.length > 0) {
      await supabase
        .from("runs")
        .update({ tracking_state: "stale" })
        .in("project_id", projIds)
        .eq("tracking_state", "active");
    }
  } catch {
    // Best-effort
  }
  // Also flip oauth_tokens revoked_at for the install (S-GH revoke flow).
  try {
    await supabase
      .from("oauth_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("github_installation_id", install.id)
      .is("revoked_at", null);
  } catch {
    // Best-effort
  }
  // Audit-log the uninstall so ops can correlate with customer banner
  // appearance. PRD §17 D23 "tracking goes stale; banner notifies".
  try {
    await supabase.rpc("audit_log_write", {
      p_tenant_id: null,
      p_action: "github_app_uninstalled",
      p_metadata: { installation_id: install.id },
    });
  } catch {
    // Best-effort
  }
}

async function handlePullRequestEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Record<string, unknown>,
): Promise<void> {
  // V1.5 — match the PR back to its fix_pr_jobs row by pr_number + repo,
  // update state to 'pr_merged' or 'pr_closed_unmerged', and fire the
  // corresponding Lens event.
  const pr = event.pull_request as
    | {
        id?: number;
        number?: number;
        merged?: boolean;
        merged_at?: string | null;
        html_url?: string;
        base?: { repo?: { full_name?: string } };
      }
    | undefined;
  const action = (event.action as string | undefined) ?? "";
  if (!pr?.number) return;

  const repoFullName = pr.base?.repo?.full_name;
  if (!repoFullName) return;

  const newState: "pr_merged" | "pr_closed_unmerged" =
    pr.merged || action === "merged" ? "pr_merged" : "pr_closed_unmerged";

  try {
    // Match by pr_url containing both repo + pr_number. We don't store
    // repo_full_name on fix_pr_jobs directly — the pr_url is the join key.
    const prUrlLike = `%${repoFullName}/pull/${pr.number}%`;
    const { data: updated } = await supabase
      .from("fix_pr_jobs")
      .update({ state: newState })
      .eq("pr_number", pr.number)
      .like("pr_url", prUrlLike)
      .select("id, tenant_id, run_id");

    if (updated && updated.length > 0) {
      const lensEvent = newState === "pr_merged" ? "auto_pr_merged" : "auto_pr_closed_unmerged";
      for (const row of updated as Array<{
        id: string;
        tenant_id: string;
        run_id: string;
      }>) {
        await supabase.rpc("audit_log_write", {
          p_tenant_id: row.tenant_id,
          p_action: "admin_action",
          p_metadata: {
            kind: lensEvent,
            fix_pr_job_id: row.id,
            run_id: row.run_id,
            pr_number: pr.number,
            pr_url: pr.html_url,
            merged_at: pr.merged_at ?? null,
          },
        });
      }
    }
  } catch {
    // Best-effort — never 500 from a GitHub webhook.
  }

  try {
    await supabase.rpc("audit_log_write", {
      p_tenant_id: null,
      p_action: "admin_action",
      p_metadata: {
        kind: "github_pr_event",
        pr_id: pr.id,
        pr_number: pr.number,
        merged: !!pr.merged,
        action,
      },
    });
  } catch {
    // Best-effort
  }
}
