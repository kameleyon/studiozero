/**
 * Studio Zero — runner env validation.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Zod-validated env vars; fail-fast at boot.
 *
 * Inventory of env vars (and what we DO NOT accept):
 *
 * - DATABASE_URL          — Postgres connection string for pg-boss. Required.
 *                           Used ONLY for queue ops; ALL row-level DB writes go
 *                           through the Supabase client carrying a runner-JWT.
 *                           pg-boss owns its own schema and is RLS-scoped at
 *                           the schema level per Atlas's migration 0002.
 *
 * - SUPABASE_URL          — Supabase project URL. Required.
 * - SUPABASE_ANON_KEY     — Public anon key. Required. Used to construct the
 *                           Supabase client; the runner JWT is layered on top
 *                           via `setSession({ access_token, refresh_token })`
 *                           or the `Authorization: Bearer <jwt>` header.
 *
 * - LLM_GATEWAY_URL       — Cipher's gateway base URL. Required. Per ARCH-D7
 *                           and Cipher Fix-2 the runner NEVER holds a raw
 *                           Anthropic key — every LLM call goes via this URL.
 * - MOCK_LLM_GATEWAY      — Optional. When 'true', the gateway client returns
 *                           canned mock responses. M1 default. M1+1 will flip
 *                           to real streaming.
 *
 * - MINT_RUNNER_TOKEN_URL — Edge Function URL for initial JWT mint. Required.
 *                           Called once per job pickup with the worker
 *                           fingerprint.
 * - REFRESH_RUNNER_TOKEN_URL — Edge Function URL for mid-run refresh. Required.
 *                           Called by jwt-refresh.ts when exp - now < 60s.
 *
 * - SCORE_ENGINE_URL      — Edge Function URL for the deterministic score
 *                           engine. Required. Per ARCH-D7 the runner NEVER
 *                           computes the score locally.
 *
 * - WORKER_FINGERPRINT    — Optional. Defaults to `worker:<hostname>:<pid>`.
 *                           Used in the runner-JWT mint request body so the
 *                           audit trail in `runner_token_mints` ties tokens
 *                           to specific workers.
 *
 * - TEAM_CONCURRENCY      — pg-boss teamConcurrency for the 'audit-run' queue.
 *                           Default 4. Per-tenant cap (5) is enforced at the
 *                           DB layer via `tenants.max_concurrent_runs` join
 *                           in pg-boss-worker.ts; this is a worker-level cap.
 *
 * - PORT                  — Healthcheck HTTP port. Default 8080.
 *
 * - LOG_LEVEL             — 'debug' | 'info' | 'warn' | 'error'. Default 'info'.
 *
 * - NODE_ENV              — 'development' | 'production' | 'test'.
 *
 * Things this file MUST refuse (Cipher Fix-2 + Atlas B2):
 *   - ANTHROPIC_API_KEY            — never. Belongs to the gateway only.
 *   - SUPABASE_SERVICE_ROLE_KEY    — never. Belongs to web-app + Edge Fns only.
 * Both are refused by the `forbiddenKeys` post-parse check below.
 */
import { z } from "zod";

const forbiddenKeys = [
  "ANTHROPIC_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
] as const;

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  LLM_GATEWAY_URL: z.string().url(),
  MOCK_LLM_GATEWAY: z
    .union([z.literal("true"), z.literal("false")])
    .default("true"),
  MINT_RUNNER_TOKEN_URL: z.string().url(),
  REFRESH_RUNNER_TOKEN_URL: z.string().url(),
  SCORE_ENGINE_URL: z.string().url(),
  WORKER_FINGERPRINT: z.string().optional(),
  TEAM_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("production"),
});

export type RunnerEnv = z.infer<typeof EnvSchema> & {
  mockLlmGateway: boolean;
  workerFingerprint: string;
};

/**
 * Parse + validate process.env. Throws on any failure. Refuses to boot if a
 * forbidden key is present.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): RunnerEnv {
  // Hard refuse forbidden keys — defence in depth against the bootstrap
  // mistake where someone "just adds the service-role key for testing".
  for (const k of forbiddenKeys) {
    if (source[k] !== undefined && source[k] !== "") {
      throw new Error(
        `[runner] env: '${k}' is forbidden. The runner NEVER holds this credential. ` +
          `See ARCH-D3 + ARCH-D7 + architecture/database/runner-jwt.md.`,
      );
    }
  }

  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`[runner] env validation failed:\n${message}`);
  }

  const env = parsed.data;
  const hostname =
    source.HOSTNAME ?? source.RAILWAY_REPLICA_ID ?? "unknown-worker";
  const workerFingerprint =
    env.WORKER_FINGERPRINT ?? `worker:${hostname}:${process.pid}`;

  return {
    ...env,
    mockLlmGateway: env.MOCK_LLM_GATEWAY === "true",
    workerFingerprint,
  };
}
