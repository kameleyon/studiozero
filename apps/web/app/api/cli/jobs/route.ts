/**
 * GET /api/cli/jobs — Phase 9 M3 Batch 2 (Forge).
 *
 * Long-poll up to 30s for jobs queued for THIS CLI device. The CLI
 * client (`apps/cli/src/network/long-poll.ts`) calls this in a loop;
 * server holds the connection until either:
 *   - pg-boss returns a job for `cli-jobs:<pairing_id>` → 200 + job; or
 *   - the 30s hold expires → 204 No Content (CLI loops cheaply).
 *
 * Auth: pairing-token Bearer. Unpaired/revoked → 401.
 *
 * Job payload shape (per `apps/cli/src/network/long-poll.ts CliJob`):
 *   {
 *     job: {
 *       runId, tenantId, projectId, depth, customerReviewers?, projectPath?
 *     }
 *   }
 *
 * Tenant scoping: jobs are stamped at enqueue time with the CLI's
 * pairing_id (the queue name encodes that). We re-check tenantId on the
 * returned payload as defense-in-depth: a service-role bug that
 * cross-enqueued a job to the wrong queue would still be caught here.
 *
 * Privacy invariant: the job payload contains paths + ids, never source
 * code (M3 lock — the CLI is the one with the source on its disk).
 */
import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";
import {
  cliJson,
  LONG_POLL_HOLD_MS,
  unauthorized,
  verifyPairingToken,
} from "../../../../lib/cli-auth";
import { isMockMode } from "../../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CliJob {
  runId: string;
  tenantId: string;
  projectId: string;
  depth: "quick" | "custom" | "comprehensive";
  customerReviewers?: string[];
  projectPath?: string;
}

interface JobsResponse {
  // CLI client expects `{ jobs: [...] }` per long-poll.ts pollOnce().
  jobs: CliJob[];
}

export async function GET(req: Request): Promise<Response> {
  // Mock fallback: empty stream, but with the right shape so the CLI's
  // long-poll loop keeps running cleanly under `STUDIOZERO_USE_MOCK=true`.
  if (isMockMode()) {
    // Hold briefly so dev clients don't hot-loop the endpoint.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return cliJson<JobsResponse>({ jobs: [] }, 200);
  }

  // Auth.
  let service:
    | Awaited<ReturnType<typeof import("../../../../lib/supabase-service").createServiceRoleClient>>
    | null = null;
  try {
    const mod = await import("../../../../lib/supabase-service");
    service = mod.createServiceRoleClient();
  } catch {
    return unauthorized("service_unavailable");
  }
  const pairing = await verifyPairingToken(service, req);
  if (!pairing) return unauthorized();

  // Long-poll loop: poll pg-boss every 500ms up to the hold window.
  // pg-boss exposes `boss.fetch(name, batch)` which atomically marks a
  // job as `active`; we invoke it via the RPC wrapper Atlas's
  // 0001_initial.sql ships (`enqueue_audit_run`). The dequeue RPC name
  // is `cli_fetch_job(p_queue text, p_pairing_id uuid)` — Atlas adds it
  // in 0004; we degrade gracefully if it's not present yet.
  const queueName = `cli-jobs:${pairing.id}`;
  const deadline = Date.now() + LONG_POLL_HOLD_MS;

  while (Date.now() < deadline) {
    try {
      const { data, error } = await service.rpc("cli_fetch_job", {
        p_queue: queueName,
        p_pairing_id: pairing.id,
      });
      if (!error && data) {
        // The RPC returns a single row when there's a job. Coerce to
        // the CLI's expected shape.
        const job = data as {
          run_id?: string;
          runId?: string;
          tenant_id?: string;
          tenantId?: string;
          project_id?: string;
          projectId?: string;
          depth?: string;
          customer_reviewers?: string[];
          customerReviewers?: string[];
          project_path?: string;
          projectPath?: string;
        } | null;
        if (job) {
          const runId = job.runId ?? job.run_id;
          const tenantId = job.tenantId ?? job.tenant_id;
          const projectId = job.projectId ?? job.project_id;
          const depth = (job.depth ?? "quick") as CliJob["depth"];
          if (runId && tenantId && projectId && tenantId === pairing.tenant_id) {
            return cliJson<JobsResponse>(
              {
                jobs: [
                  {
                    runId,
                    tenantId,
                    projectId,
                    depth,
                    ...(job.customerReviewers || job.customer_reviewers
                      ? {
                          customerReviewers:
                            job.customerReviewers ?? job.customer_reviewers ?? [],
                        }
                      : {}),
                    ...(job.projectPath || job.project_path
                      ? { projectPath: job.projectPath ?? job.project_path }
                      : {}),
                  },
                ],
              },
              200,
            );
          }
        }
      }
    } catch {
      // RPC absent — fall through to empty long-poll. The CLI's own
      // direct-folder mode (M3) doesn't need queue dispatch.
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // No jobs in the hold window — 204 so the CLI cheaply re-polls.
  return new Response(null, { status: 204, headers: aiDisclosureHeaders });
}
