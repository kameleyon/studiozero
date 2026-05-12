/**
 * Studio Zero — CLI heartbeat (ARCH-D10 close).
 *
 * Per `sprint/milestone-M3.md` + ARCH-D10:
 * - The CLI emits a heartbeat every 30s.
 * - Server stamps `cli_heartbeat.last_seen_at` + status:
 *     - `healthy` if last_seen within 60s.
 *     - `stale`   after 5 min (Atlas's stale_after trigger).
 * - A revoked pairing rejects the heartbeat with 401.
 *
 * Atlas owns the schema (0004_cli_pairing_hardening.sql lands the
 * `cli_heartbeat` table + `stale_after` interval). Forge owns the
 * /api/cli/heartbeat route. This spec drives the server-side contract
 * via the published primitives in `apps/web/lib/cli-auth.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cliJson, verifyPairingToken } from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

const HEARTBEAT_HEALTHY_WINDOW_MS = 60 * 1000;
const HEARTBEAT_STALE_AFTER_MS = 5 * 60 * 1000;

/** Atlas-style stale_after derivation (logic mirrored from 0004 migration). */
export function heartbeatStatus(lastSeenAt: string | null, now: number = Date.now()): "healthy" | "stale" | "offline" {
  if (!lastSeenAt) return "offline";
  const age = now - new Date(lastSeenAt).getTime();
  if (age <= HEARTBEAT_HEALTHY_WINDOW_MS) return "healthy";
  if (age >= HEARTBEAT_STALE_AFTER_MS) return "stale";
  // Between healthy and stale = still healthy per Atlas's interval boundary.
  return "healthy";
}

/* -------------------------------------------------------------------------- */
/* In-test handler: POST /api/cli/heartbeat                                   */
/* -------------------------------------------------------------------------- */

async function heartbeatHandler(req: Request, supa: MockSupabase): Promise<Response> {
  const row = await verifyPairingToken(supa.client, req);
  if (!row) return cliJson({ ok: false, error: "unauthorized" }, 401);

  const now = new Date().toISOString();
  await supa.client
    .from("cli_heartbeat")
    .upsert(
      {
        pairing_id: row.id,
        last_seen_at: now,
        cli_version: row.cli_version,
      },
      { onConflict: "pairing_id" },
    );

  return cliJson({ ok: true, status: "healthy", last_seen_at: now }, 200);
}

function mkReq(token: string): Request {
  return new Request("https://studio-zero.com/api/cli/heartbeat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI heartbeat (ARCH-D10)", () => {
  let supa: MockSupabase;

  beforeEach(() => {
    supa = makeMockSupabase();
  });
  afterEach(() => {
    supa.reset();
  });

  it("healthy heartbeat: paired CLI POSTs → 200 + cli_heartbeat upserted", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-hb-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await heartbeatHandler(mkReq("V".repeat(43)), supa);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; status: string; last_seen_at: string };
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
    expect(supa.upserts).toHaveLength(1);
    expect(supa.upserts[0]?.table).toBe("cli_heartbeat");
    const row = supa.upserts[0]?.row as Record<string, unknown>;
    expect(row.pairing_id).toBe("pairing-hb-001");
    expect(typeof row.last_seen_at).toBe("string");
  });

  it("heartbeatStatus derives 'healthy' for last_seen within 60s", () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    expect(heartbeatStatus(recent)).toBe("healthy");
  });

  it("heartbeatStatus derives 'stale' after 5 min (Atlas stale_after trigger)", () => {
    const stale = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(heartbeatStatus(stale)).toBe("stale");
  });

  it("heartbeatStatus is 'healthy' between 60s and 5min (boundary — stale only at 5min mark)", () => {
    const between = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    expect(heartbeatStatus(between)).toBe("healthy");
  });

  it("heartbeatStatus is 'offline' if last_seen is null (no heartbeat yet)", () => {
    expect(heartbeatStatus(null)).toBe("offline");
  });

  it("revoked pairing → 401 + no heartbeat write", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-hb-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      // Revoked 1h ago.
      revoked_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await heartbeatHandler(mkReq("V".repeat(43)), supa);
    expect(res.status).toBe(401);
    expect(supa.upserts).toHaveLength(0);
  });

  it("missing Bearer → 401 + no heartbeat write", async () => {
    const req = new Request("https://studio-zero.com/api/cli/heartbeat", {
      method: "POST",
    });
    const res = await heartbeatHandler(req, supa);
    expect(res.status).toBe(401);
    expect(supa.upserts).toHaveLength(0);
  });

  it("AI-disclosure header on heartbeat response (PRD §11.3)", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-hb-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await heartbeatHandler(mkReq("V".repeat(43)), supa);
    expect(res.headers.get("X-AI-Generated")).toBe("studio-zero");
  });

  it.skip(
    "Atlas stale_after trigger flips DB row's status='stale' after 5min — needs live Postgres trigger (// M3+1)",
  );
});
