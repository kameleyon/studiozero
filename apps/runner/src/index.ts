/**
 * Studio Zero — runner entrypoint.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Long-running Node process. Boots:
 *   1. env validation (refuses to start if forbidden creds are present)
 *   2. abort registry (per-run signal plumbing)
 *   3. healthcheck HTTP server on PORT (Railway probes /health)
 *   4. pg-boss subscriber on the `audit-run` queue
 *   5. SIGTERM/SIGINT graceful shutdown — aborts in-flight runs first
 *
 * The process exits 0 on clean shutdown, 1 on env-validation failure,
 * 2 on a fatal startup error. Railway restarts on any non-zero exit.
 */
import { loadEnv } from "./env.js";
import { createAbortRegistry } from "./abort-controller.js";
import { createHealthcheckServer } from "./healthcheck.js";
import { createPgBossWorker } from "./pg-boss-worker.js";

const RUNNER_VERSION = "0.1.0-m1";

async function main(): Promise<void> {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const abortRegistry = createAbortRegistry();
  const health = createHealthcheckServer({
    port: env.PORT,
    version: RUNNER_VERSION,
  });

  await health.start();
  console.log(`[runner] healthcheck listening on :${env.PORT}/health`);

  const worker = createPgBossWorker({
    env,
    abortRegistry,
    onStatsChange: (stats) => health.setStats(stats),
  });

  await worker.start();
  console.log(
    `[runner] pg-boss subscriber started (concurrency=${env.TEAM_CONCURRENCY}, mock_gateway=${env.mockLlmGateway})`,
  );

  // Graceful shutdown — abort in-flight runs first, then stop the boss.
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    console.log(`[runner] received ${signal}; shutting down…`);
    try {
      await worker.stop();
    } catch (err) {
      console.error("[runner] worker stop error:", (err as Error).message);
    }
    try {
      await health.stop();
    } catch (err) {
      console.error("[runner] health stop error:", (err as Error).message);
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[runner] fatal:", err);
  process.exit(2);
});
