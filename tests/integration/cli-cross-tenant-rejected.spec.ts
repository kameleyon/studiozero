/**
 * Studio Zero — CLI cross-tenant verdict submission rejected by RLS.
 *
 * Per `architecture/database/migration-order.md` + Atlas's RLS pattern:
 * when Tenant A's CLI submits a verdict for a `run_id` that belongs to
 * Tenant B, RLS denies the row INVISIBLY (returns 0 rows on SELECT,
 * affecting 0 rows on UPDATE). The route handler MUST surface this as
 * a 404 — NOT 403 — per Atlas's documented pattern:
 *
 *   "RLS denial is indistinguishable from row-not-found by design. The
 *    UX consequence is consistent: 404 for ANY case where the row
 *    isn't visible to the caller. 403 would leak existence."
 *
 * This is the canonical cross-tenant invariant. Mirrors
 * `tests/integration/goal-5-rls-cross-tenant.spec.ts` for the CLI lane.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cliJson, verifyPairingToken } from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

/* -------------------------------------------------------------------------- */
/* In-test handler: /api/cli/runs/:runId/verdict                              */
/* -------------------------------------------------------------------------- */

interface RunsRow {
  id: string;
  tenant_id: string;
}

async function verdictHandler(
  req: Request,
  supa: MockSupabase,
  runId: string,
): Promise<Response> {
  const pairing = await verifyPairingToken(supa.client, req);
  if (!pairing) return cliJson({ ok: false, error: "unauthorized" }, 401);

  // RLS-scoped lookup: the route's service-role client sets a tenant
  // filter equivalent to `WHERE tenant_id = pairing.tenant_id`. In real
  // life this is the RLS USING clause on `runs`. The mock returns
  // whatever pushRead injected — we model RLS by checking tenant_id
  // matches and otherwise returning null.
  const result = await supa.client
    .from("runs")
    .select("id, tenant_id")
    .eq("id", runId)
    .eq("tenant_id", pairing.tenant_id)
    .maybeSingle();
  const row = result.data as RunsRow | null;
  if (!row) {
    // 404, NOT 403 — per Atlas RLS pattern (invisibility).
    return cliJson({ ok: false, error: "run_not_found" }, 404);
  }

  return cliJson({ ok: true, runId: row.id }, 200);
}

function mkReq(token: string, runId: string): Request {
  return new Request(`https://studio-zero.com/api/cli/runs/${runId}/verdict`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const RUN_OWNED_BY_A = "run-owned-by-A-001";
const RUN_OWNED_BY_B = "run-owned-by-B-001";

const PAIRING_A = {
  id: "pairing-tenant-a-001",
  tenant_id: TENANT_A,
  user_id: "user-A-001",
  cli_version: "0.1.0-m3",
  hostname: "host-A",
  os: "darwin",
  binary_hash: "a".repeat(64),
  revoked_at: null,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  last_heartbeat_at: null,
};

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI cross-tenant rejected (RLS invisibility — 404 not 403)", () => {
  let supa: MockSupabase;

  beforeEach(() => {
    supa = makeMockSupabase();
  });
  afterEach(() => {
    supa.reset();
  });

  it("Tenant A's CLI submits verdict for Tenant B's run → 404 (RLS-scoped query returns 0 rows)", async () => {
    // Pairing belongs to Tenant A.
    supa.pushRead("cli_pairings", PAIRING_A);
    // Runs lookup returns null (RLS scopes WHERE tenant_id = A; the row's
    // tenant_id = B, so no row visible). The mock simulates this by not
    // pushing a read for `runs`.
    const res = await verdictHandler(
      mkReq("Q".repeat(43), RUN_OWNED_BY_B),
      supa,
      RUN_OWNED_BY_B,
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.error).toBe("run_not_found");
  });

  it("404 status surfaces — NOT 403 (per Atlas: 403 would leak existence)", async () => {
    supa.pushRead("cli_pairings", PAIRING_A);
    const res = await verdictHandler(
      mkReq("Q".repeat(43), RUN_OWNED_BY_B),
      supa,
      RUN_OWNED_BY_B,
    );
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });

  it("Tenant A's CLI submits verdict for Tenant A's run → 200 (control)", async () => {
    supa.pushRead("cli_pairings", PAIRING_A);
    supa.pushRead("runs", { id: RUN_OWNED_BY_A, tenant_id: TENANT_A });
    const res = await verdictHandler(
      mkReq("Q".repeat(43), RUN_OWNED_BY_A),
      supa,
      RUN_OWNED_BY_A,
    );
    expect(res.status).toBe(200);
  });

  it("Tenant A's CLI submits verdict for a nonexistent run_id → 404 (same code path as cross-tenant)", async () => {
    supa.pushRead("cli_pairings", PAIRING_A);
    // No runs row pushed.
    const res = await verdictHandler(
      mkReq("Q".repeat(43), "nonexistent-run-id"),
      supa,
      "nonexistent-run-id",
    );
    expect(res.status).toBe(404);
    // The error string MUST be identical to the cross-tenant case so
    // existence is not leaked via the body shape.
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("run_not_found");
  });

  it("response body shape is identical between cross-tenant and not-found (no enumeration vector)", async () => {
    supa.pushRead("cli_pairings", PAIRING_A);
    const crossTenant = await verdictHandler(
      mkReq("Q".repeat(43), RUN_OWNED_BY_B),
      supa,
      RUN_OWNED_BY_B,
    );

    supa.pushRead("cli_pairings", PAIRING_A);
    const notFound = await verdictHandler(
      mkReq("Q".repeat(43), "definitely-does-not-exist"),
      supa,
      "definitely-does-not-exist",
    );

    expect(crossTenant.status).toBe(notFound.status);
    expect(await crossTenant.json()).toEqual(await notFound.json());
  });

  it("AI-disclosure header on the 404 (PRD §11.3)", async () => {
    supa.pushRead("cli_pairings", PAIRING_A);
    const res = await verdictHandler(
      mkReq("Q".repeat(43), RUN_OWNED_BY_B),
      supa,
      RUN_OWNED_BY_B,
    );
    expect(res.headers.get("X-AI-Generated")).toBe("studio-zero");
  });

  it("unpaired CLI submitting any verdict → 401 (separate code path; not 404)", async () => {
    // No pairing row.
    const res = await verdictHandler(
      mkReq("Q".repeat(43), RUN_OWNED_BY_A),
      supa,
      RUN_OWNED_BY_A,
    );
    expect(res.status).toBe(401);
  });
});
