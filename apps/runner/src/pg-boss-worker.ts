/**
 * Studio Zero — pg-boss worker.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Subscribes to the `audit-run` queue
 * inside Postgres (pg-boss per ARCH-D1). Per-worker concurrency is
 * `TEAM_CONCURRENCY` (default 4). Per-tenant concurrency cap is
 * enforced at the DB layer via the `tenants.max_concurrent_runs` join
 * in the SQL that pg-boss issues (added in migration 0002 alongside
 * the RLS policies).
 *
 * Job shape (matches what the web app dispatcher publishes):
 *   {
 *     run_id: ULID,
 *     tenant_id: UUID,
 *     audience: string,
 *     depth: 'quick' | 'custom' | 'comprehensive',
 *     customer_reviewers?: ReviewerId[],
 *     project_payload: object,
 *     caller_jwt: string   // user-session JWT — used to mint the runner-JWT
 *   }
 *
 * Lifecycle per job:
 *   1. mint runner-JWT via mintRunnerToken()
 *   2. spin up TokenRefresher (heartbeat at 30s)
 *   3. construct findings-writer, gateway-client, score-engine-client,
 *      realtime-emitter — all bound to the same refresher
 *   4. register an abort handle in the registry
 *   5. drive run-state-machine.runAudit()
 *   6. on terminal: stop refresher, release abort handle, mark job done
 *
 * Resilience:
 *   - SIGTERM aborts all in-flight runs; the partial-result boundary
 *     §14.2 ensures completed reviewers persist
 *   - any thrown error in the lifecycle is caught and translated to a
 *     pg-boss `fail()` so retries / DLQ work
 */
import PgBoss from "pg-boss";

import type { RunnerEnv } from "./env.js";
import type { AbortRegistry } from "./abort-controller.js";
import type { HealthStats } from "./healthcheck.js";

import { mintRunnerToken, TokenRefresher } from "./jwt-refresh.js";
import { createLlmGatewayClient } from "./llm-gateway-client.js";
import { createScoreEngineClient } from "./score-engine-client.js";
import { createFindingsWriter } from "./findings-writer.js";
import { createRealtimeEmitter } from "./realtime-emitter.js";
import { runAudit } from "./run-state-machine.js";
import type { AuditDepth, ReviewerId } from "./reviewers/index.js";

export const AUDIT_QUEUE_NAME = "audit-run";

/** Shape of a pg-boss `audit-run` job's data payload. */
export interface AuditRunJobData {
  run_id: string;
  tenant_id: string;
  audience: string;
  depth: AuditDepth;
  customer_reviewers?: ReviewerId[];
  project_payload: Record<string, unknown>;
  caller_jwt: string;
}

export interface PgBossWorkerOptions {
  env: RunnerEnv;
  abortRegistry: AbortRegistry;
  /** Push stats every time inFlight changes — for /health. */
  onStatsChange?: (stats: HealthStats) => void;
}

export interface PgBossWorker {
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Returns the number of jobs currently being processed. */
  inFlight(): number;
}

/**
 * Construct the worker. Does not start until .start() is called so
 * tests can install spies on the boss client first.
 */
export function createPgBossWorker(
  opts: PgBossWorkerOptions,
): PgBossWorker {
  const env = opts.env;
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    // pg-boss writes its own schema; Atlas's migration 0002 wires RLS
    // on it. application_name aids ops dashboards.
    application_name: env.workerFingerprint,
  });

  let started = false;
  let inFlightCount = 0;
  const setInFlight = (n: number): void => {
    inFlightCount = n;
    opts.onStatsChange?.({
      jobsInFlight: inFlightCount,
      lastHeartbeatMs: Date.now(),
    });
  };

  const processJob = async (
    job: PgBoss.Job<AuditRunJobData>,
  ): Promise<void> => {
    const data = job.data;
    const runId = data.run_id;

    // 1. Register abort handle.
    const abort = opts.abortRegistry.create(runId);
    const cleanup = async (): Promise<void> => {
      opts.abortRegistry.release(runId);
      setInFlight(inFlightCount - 1);
    };

    setInFlight(inFlightCount + 1);

    try {
      // 2. Mint runner-JWT.
      const initialToken = await mintRunnerToken({
        mintUrl: env.MINT_RUNNER_TOKEN_URL,
        callerJwt: data.caller_jwt,
        runId,
        runnerKind: "hosted-worker",
        workerFingerprint: env.workerFingerprint,
        signal: abort.signal,
      });

      // 3. Start refresher.
      const refresher = new TokenRefresher({
        mintUrl: env.MINT_RUNNER_TOKEN_URL,
        refreshUrl: env.REFRESH_RUNNER_TOKEN_URL,
        runId,
        tenantId: data.tenant_id,
        runnerKind: "hosted-worker",
        workerFingerprint: env.workerFingerprint,
        callerJwt: data.caller_jwt,
        signal: abort.signal,
      });
      refresher.setToken(initialToken);
      refresher.start();

      try {
        // 4. Compose deps.
        const gateway = createLlmGatewayClient({
          gatewayUrl: env.LLM_GATEWAY_URL,
          refresher,
          mock: env.mockLlmGateway,
        });
        const scoreEngine = createScoreEngineClient({
          scoreEngineUrl: env.SCORE_ENGINE_URL,
          refresher,
        });
        const findingsWriter = createFindingsWriter({
          supabaseUrl: env.SUPABASE_URL,
          anonKey: env.SUPABASE_ANON_KEY,
          refresher,
          expectedTenantId: data.tenant_id,
          expectedRunId: runId,
        });
        const emitter = createRealtimeEmitter({
          runId,
          publish: async () => {
            // Real Supabase Realtime publish wired in M1+1. M1: no-op.
          },
        });

        // 5. Drive the state machine.
        await runAudit(
          {
            runId,
            tenantId: data.tenant_id,
            audience: data.audience,
            depth: data.depth,
            ...(data.customer_reviewers && {
              customerReviewers: data.customer_reviewers,
            }),
            projectPayload: data.project_payload,
          },
          {
            gateway,
            scoreEngine,
            findingsWriter,
            emitter,
            // State persistence is the M1+1 enhancement; at M1 we just
            // observe transitions for logging. Realtime carries the
            // user-facing signal in the meantime.
            onStateChange: () => {
              /* no-op stub at M1 */
            },
            signal: abort.signal,
          },
        );

        await emitter.flush();
        await emitter.close();
      } finally {
        refresher.stop();
      }
    } finally {
      await cleanup();
    }
  };

  return {
    async start() {
      if (started) return;
      started = true;
      await boss.start();
      // pg-boss v10: `.work(name, options, handler)` returns an unsubscribe id.
      // Concurrency is driven by `batchSize` (jobs pulled per poll) at this
      // version — teamSize/teamConcurrency were renamed in the v10 rewrite.
      await boss.work<AuditRunJobData>(
        AUDIT_QUEUE_NAME,
        { batchSize: env.TEAM_CONCURRENCY },
        async (jobs: PgBoss.Job<AuditRunJobData>[]) => {
          // pg-boss v10 always hands an array (batch). Process serially
          // within a batch; concurrency across batches is automatic.
          for (const j of jobs) {
            await processJob(j);
          }
        },
      );
    },
    async stop() {
      if (!started) return;
      started = false;
      // Trip every in-flight signal before stopping the boss connection.
      opts.abortRegistry.abortAll("worker_shutdown");
      await boss.stop({ graceful: true, timeout: 30_000 });
    },
    inFlight(): number {
      return inFlightCount;
    },
  };
}
