/**
 * Studio Zero — pg-boss worker tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Unit-scoped — we mock pg-boss so this
 * test doesn't need a live Postgres. The full e2e (real pg-boss schema
 * round-trip) lands at M1+1 with Verify's integration suite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub pg-boss BEFORE importing the worker.
vi.mock("pg-boss", () => {
  class MockPgBoss {
    constructor(_opts: unknown) {}
    async start(): Promise<void> {
      /* no-op */
    }
    async stop(_opts: unknown): Promise<void> {
      /* no-op */
    }
    async work(
      _name: string,
      _opts: unknown,
      _handler: unknown,
    ): Promise<string> {
      return "work-id";
    }
  }
  return { default: MockPgBoss };
});

// Stub the supabase client used by findings-writer.
vi.mock("@supabase/supabase-js", () => {
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    createClient: vi.fn().mockReturnValue({
      auth: { setSession: vi.fn().mockResolvedValue({}) },
      from: vi.fn().mockReturnValue(mockChain),
    }),
  };
});

import { createPgBossWorker, AUDIT_QUEUE_NAME } from "../src/pg-boss-worker.js";
import { createAbortRegistry } from "../src/abort-controller.js";
import type { RunnerEnv } from "../src/env.js";

const baseEnv: RunnerEnv = {
  DATABASE_URL: "postgres://localhost:5432/test",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-test-fixture-with-sufficient-length",
  LLM_GATEWAY_URL: "https://gateway.example.com",
  MOCK_LLM_GATEWAY: "true",
  MINT_RUNNER_TOKEN_URL: "https://example.com/mint",
  REFRESH_RUNNER_TOKEN_URL: "https://example.com/refresh",
  SCORE_ENGINE_URL: "https://example.com/score",
  WORKER_FINGERPRINT: "worker:test:1",
  TEAM_CONCURRENCY: 2,
  PORT: 8080,
  LOG_LEVEL: "info",
  NODE_ENV: "test",
  mockLlmGateway: true,
  workerFingerprint: "worker:test:1",
};

describe("pg-boss-worker / lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports the canonical queue name", () => {
    expect(AUDIT_QUEUE_NAME).toBe("audit-run");
  });

  it("starts and stops without throwing", async () => {
    const reg = createAbortRegistry();
    const worker = createPgBossWorker({ env: baseEnv, abortRegistry: reg });
    await worker.start();
    expect(worker.inFlight()).toBe(0);
    await worker.stop();
  });

  it("start is idempotent", async () => {
    const reg = createAbortRegistry();
    const worker = createPgBossWorker({ env: baseEnv, abortRegistry: reg });
    await worker.start();
    await worker.start();
    await worker.stop();
  });

  it("stop trips abort-registry signals (graceful shutdown)", async () => {
    const reg = createAbortRegistry();
    const handle = reg.create("run-x");
    const worker = createPgBossWorker({ env: baseEnv, abortRegistry: reg });
    await worker.start();
    await worker.stop();
    expect(handle.aborted).toBe(true);
  });
});
