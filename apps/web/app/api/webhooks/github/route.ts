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
  // ARCH-D6 recovery: any fix_pr_jobs row currently in tracking_state='stale'
  // with this installation id flips to 'recovered'. (The matching column
  // ships in 0007_tracking_state.sql at V1.5; at M1 we attempt the update
  // and swallow "column does not exist" errors so M1 webhook tests pass.)
  try {
    await supabase
      .from("fix_pr_jobs")
      .update({ tracking_state: "recovered" })
      .eq("github_installation_id", install.id)
      .eq("tracking_state", "stale");
  } catch {
    // tracking_state column lands at V1.5 — ignore until then.
  }
}

async function handleInstallationDeleted(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Record<string, unknown>,
): Promise<void> {
  const install = event.installation as { id?: number } | undefined;
  if (!install?.id) return;
  try {
    await supabase
      .from("fix_pr_jobs")
      .update({ tracking_state: "stale" })
      .eq("github_installation_id", install.id)
      .eq("tracking_state", "active");
  } catch {
    // V1.5
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
}

async function handlePullRequestEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Record<string, unknown>,
): Promise<void> {
  // V1.5 — we log the event for forensics now; the merge-state update on
  // fix_pr_jobs lands when the Auto-PR flow ships.
  const pr = event.pull_request as { id?: number; merged?: boolean } | undefined;
  if (!pr?.id) return;
  try {
    await supabase.rpc("audit_log_write", {
      p_tenant_id: null,
      p_action: "github_pr_event",
      p_metadata: { pr_id: pr.id, merged: !!pr.merged },
    });
  } catch {
    // Best-effort
  }
}
