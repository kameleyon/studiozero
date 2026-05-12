/**
 * Studio Zero — findings writer tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Verifies the CLIENT-SIDE RLS pre-check
 * (refuses to write a row with a tenant_id / run_id that doesn't match
 * this writer's scope). The DB-side RLS enforcement test lives at
 * `tests/acceptance/integration/rls-cross-tenant.spec.ts` per PRD §18.5
 * Goal 5 (driven by Verify against a real Supabase instance).
 *
 * We stub the Supabase client so this test stays unit-scoped.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Shared spies — declared via vi.hoisted so they exist BEFORE vi.mock
// runs (vi.mock is hoisted to the top of the module). Tests can assert
// on `mocks.setSessionSpy` after import.
const mocks = vi.hoisted(() => {
  return {
    setSessionSpy: vi.fn().mockResolvedValue({}),
  };
});

// Stub @supabase/supabase-js BEFORE the writer module is imported.
vi.mock("@supabase/supabase-js", () => {
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const mockClient = {
    auth: {
      setSession: mocks.setSessionSpy,
    },
    from: vi.fn().mockReturnValue(mockChain),
  };
  return {
    createClient: vi.fn().mockReturnValue(mockClient),
  };
});

import { createFindingsWriter, type FindingRow } from "../src/findings-writer.js";
import { TokenRefresher } from "../src/jwt-refresh.js";

function makeRefresher(): TokenRefresher {
  const ctrl = new AbortController();
  const r = new TokenRefresher({
    mintUrl: "https://example.com/mint",
    refreshUrl: "https://example.com/refresh",
    runId: "run-1",
    tenantId: "tenant-1",
    runnerKind: "hosted-worker",
    workerFingerprint: "worker:test:1",
    signal: ctrl.signal,
  });
  r.setToken({
    token: "abc.def.ghi",
    expiresAtMs: Date.now() + 60_000,
    jti: "test-jti",
  });
  return r;
}

const baseRow: FindingRow = {
  id: "F-001",
  run_id: "run-1",
  tenant_id: "tenant-1",
  reviewer: "optic",
  severity: "Minor",
  layer: "design",
  summary: "test",
  evidence: { type: "file", path: "x.ts" },
  recommendation: "fix it",
  estimated_effort: "S",
  wcag_sc: null,
};

describe("findings-writer / RLS-scoped pre-check", () => {
  // Note: we intentionally do NOT call vi.clearAllMocks() here — it would
  // wipe the createClient stub's return value, breaking every subsequent
  // test. Per-test we only clear the spy we want to inspect.

  it("admits a row matching the writer's tenant+run scope", async () => {
    const writer = createFindingsWriter({
      supabaseUrl: "https://x.supabase.co",
      anonKey: "anon-key-test-fixture",
      refresher: makeRefresher(),
      expectedTenantId: "tenant-1",
      expectedRunId: "run-1",
    });
    await expect(
      writer.insertFinding(baseRow, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it("refuses a row with a different tenant_id (defence in depth)", async () => {
    const writer = createFindingsWriter({
      supabaseUrl: "https://x.supabase.co",
      anonKey: "anon-key-test-fixture",
      refresher: makeRefresher(),
      expectedTenantId: "tenant-1",
      expectedRunId: "run-1",
    });
    const bad = { ...baseRow, tenant_id: "other-tenant" };
    await expect(
      writer.insertFinding(bad, new AbortController().signal),
    ).rejects.toThrow(/tenant_id mismatch/);
  });

  it("refuses a row with a different run_id", async () => {
    const writer = createFindingsWriter({
      supabaseUrl: "https://x.supabase.co",
      anonKey: "anon-key-test-fixture",
      refresher: makeRefresher(),
      expectedTenantId: "tenant-1",
      expectedRunId: "run-1",
    });
    const bad = { ...baseRow, run_id: "other-run" };
    await expect(
      writer.insertFinding(bad, new AbortController().signal),
    ).rejects.toThrow(/run_id mismatch/);
  });

  it("refuses when AbortSignal is already tripped", async () => {
    const writer = createFindingsWriter({
      supabaseUrl: "https://x.supabase.co",
      anonKey: "anon-key-test-fixture",
      refresher: makeRefresher(),
      expectedTenantId: "tenant-1",
      expectedRunId: "run-1",
    });
    const ctrl = new AbortController();
    ctrl.abort("test");
    await expect(writer.insertFinding(baseRow, ctrl.signal)).rejects.toThrow(
      /aborted/,
    );
  });

  it("calls setSession with the refresher's current token", async () => {
    mocks.setSessionSpy.mockClear();
    const writer = createFindingsWriter({
      supabaseUrl: "https://x.supabase.co",
      anonKey: "anon-key-test-fixture",
      refresher: makeRefresher(),
      expectedTenantId: "tenant-1",
      expectedRunId: "run-1",
    });
    await writer.insertFinding(baseRow, new AbortController().signal);
    expect(mocks.setSessionSpy).toHaveBeenCalled();
    const call = mocks.setSessionSpy.mock.calls[0]![0];
    expect(call.access_token).toBe("abc.def.ghi");
  });
});
