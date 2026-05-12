/**
 * Studio Zero — runner healthcheck HTTP server.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Hard requirement: respond ≤ 100ms,
 * no DB call in the hot path. Railway's healthcheck hits /health every
 * 15s; flapping kills the container.
 *
 * The response body conforms to the operational shape every Studio Zero
 * service uses: { ok, version, uptime_seconds, jobs_in_flight,
 * last_heartbeat }. The `jobs_in_flight` and `last_heartbeat` are
 * provided by a getter callback so the worker subscriber can update them
 * without coupling.
 *
 * AI Act disclosure header `X-AI-Generated: studio-zero` is on EVERY
 * response (PRD §11.3 + §14.5 + Comply ticket #18 — same as Next.js
 * `next.config.ts` does for the web app).
 */
import { createServer, type Server } from "node:http";

export interface HealthStats {
  /** Number of jobs currently being processed by this worker. */
  jobsInFlight: number;
  /** Epoch ms timestamp of the worker's most recent heartbeat tick. */
  lastHeartbeatMs: number;
}

export interface HealthcheckServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Update the snapshot the /health endpoint serves. */
  setStats(stats: HealthStats): void;
}

export interface HealthcheckOptions {
  port: number;
  version: string;
  /** Initial stats. Default { jobsInFlight: 0, lastHeartbeatMs: Date.now() } */
  initialStats?: Partial<HealthStats>;
}

/**
 * Create the healthcheck server. The returned object is start/stop-able.
 *
 * Why we build a tiny http server instead of reusing a framework:
 *   - the hot-path latency budget is 100ms; cold framework boot would
 *     eat half of that on first hit
 *   - we have ONE endpoint, no auth, no body parsing — keep it small
 */
export function createHealthcheckServer(
  opts: HealthcheckOptions,
): HealthcheckServer {
  const startedAtMs = Date.now();
  let stats: HealthStats = {
    jobsInFlight: opts.initialStats?.jobsInFlight ?? 0,
    lastHeartbeatMs: opts.initialStats?.lastHeartbeatMs ?? startedAtMs,
  };

  let server: Server | null = null;

  const handler = (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
  ): void => {
    // AI Act Art. 50 interim disclosure — every response, every path.
    res.setHeader("X-AI-Generated", "studio-zero");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");

    if (req.url === "/health" && req.method === "GET") {
      const body = {
        ok: true,
        version: opts.version,
        uptime_seconds: Math.floor((Date.now() - startedAtMs) / 1000),
        jobs_in_flight: stats.jobsInFlight,
        last_heartbeat:
          stats.lastHeartbeatMs > 0
            ? new Date(stats.lastHeartbeatMs).toISOString()
            : null,
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  };

  return {
    async start() {
      if (server) return;
      server = createServer(handler);
      await new Promise<void>((resolve, reject) => {
        const onError = (err: Error): void => reject(err);
        server!.once("error", onError);
        server!.listen(opts.port, () => {
          server!.off("error", onError);
          resolve();
        });
      });
    },
    async stop() {
      if (!server) return;
      const s = server;
      server = null;
      await new Promise<void>((resolve, reject) => {
        s.close((err) => (err ? reject(err) : resolve()));
      });
    },
    setStats(next: HealthStats) {
      stats = next;
    },
  };
}
