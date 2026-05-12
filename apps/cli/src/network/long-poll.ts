/**
 * Studio Zero — long-poll for queued CLI jobs.
 *
 * Phase 9 M3 Batch 1 (Forge). Implements TB-7's read direction: a paired
 * CLI long-polls `/api/cli/jobs` for work. Server holds the connection
 * up to 25s; on dispatch, returns the job payload; on timeout, returns
 * `{ jobs: [] }` so the CLI loops cheaply.
 *
 * M3 state: spec'd here. The actual web endpoint lands in the next
 * Forge dispatch. The function returns gracefully on 404 / 5xx so the
 * CLI's `run` flow can also operate in direct-folder mode (where the
 * job payload is constructed locally from the CLI args rather than
 * received via dispatch).
 *
 * Backoff: on transport errors, exponential 1s → 30s capped. We do
 * NOT spin tightly on a server outage.
 */
import { request } from "./studio-client.js";

export interface CliJob {
  runId: string;
  tenantId: string;
  projectId: string;
  depth: "quick" | "custom" | "comprehensive";
  customerReviewers?: string[];
  /** Hint from the web app — what folder the customer picked. */
  projectPath?: string;
}

interface LongPollResponse {
  jobs: CliJob[];
}

export interface LongPollOpts {
  apiUrl: string;
  token: string;
  /** AbortSignal for graceful shutdown (Ctrl-C). */
  signal: AbortSignal;
  /** Override fetcher (testing). */
  fetcher?: typeof fetch;
}

/**
 * Poll once. Returns the array of dispatched jobs (often empty). Caller
 * is responsible for the outer loop + backoff (see `pollLoop`).
 */
export async function pollOnce(opts: LongPollOpts): Promise<CliJob[]> {
  const res = await request<LongPollResponse>({
    apiUrl: opts.apiUrl,
    method: "GET",
    path: "/api/cli/jobs",
    auth: opts.token,
    ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
  });
  if (!res.ok) return [];
  return res.body?.jobs ?? [];
}

/**
 * Long-poll loop with exponential backoff on transport failures.
 * Exits cleanly when `signal.aborted` becomes true.
 *
 * The `onJob` callback is invoked once per dispatched job. The loop
 * does NOT await `onJob` — concurrent jobs are bounded by the server's
 * dispatch logic + the CLI's per-run semaphore (M3 Batch 3).
 */
export async function pollLoop(
  opts: LongPollOpts,
  onJob: (job: CliJob) => void,
): Promise<void> {
  let backoff = 1000;
  while (!opts.signal.aborted) {
    try {
      const jobs = await pollOnce(opts);
      backoff = 1000; // reset on success
      for (const j of jobs) onJob(j);
      // small breath between polls so we don't hammer the server
      await sleep(500, opts.signal);
    } catch {
      await sleep(backoff, opts.signal);
      backoff = Math.min(backoff * 2, 30_000);
    }
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}
