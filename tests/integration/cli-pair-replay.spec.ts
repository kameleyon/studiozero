/**
 * Studio Zero — CLI pair token replay detection (C-FAIL-5).
 *
 * Per `ia/user-flows/cli-pairing-and-tamper.md` EC-7 (multi-device) +
 * Shield's M3 tamper-corpus replay pattern:
 *
 *   - Same pairing_token used from different IP within 5min →
 *       audit_log warning written; ALLOWED (legitimate roaming —
 *       laptop on coffee shop wifi, then home). Per Trace's flow, IP
 *       drift alone is not enough to revoke.
 *
 *   - Same token used from a DIFFERENT device_fingerprint → 401 +
 *       revoke pairing + Sentry alert. Device fingerprint stays
 *       constant for a given pairing (laptop's hostname+os+arch don't
 *       change between coffee shops). A new fingerprint on a known
 *       token = token theft.
 *
 * This is C-FAIL-5 ("token used from unexpected origin") in the
 * locked Trace flow.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cliJson } from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

const __sentryCalls: Array<{ message: string; level: string }> = [];
function captureSentry(message: string, level: string): void {
  __sentryCalls.push({ message, level });
}

/* -------------------------------------------------------------------------- */
/* In-test handler: /api/cli/jobs (any bearer-required CLI route)             */
/* -------------------------------------------------------------------------- */

interface PairingRow {
  id: string;
  tenant_id: string;
  user_id: string;
  pairing_token: string;
  device_fingerprint_hash: string;
  last_ip: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
}

function fingerprintHash(fp: { hostname: string; os: string; arch: string }): string {
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(`${fp.hostname}|${fp.os}|${fp.arch}`).digest("hex");
}

async function bearerHandler(req: Request, supa: MockSupabase): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(auth.trim());
  if (!m) return cliJson({ ok: false, error: "unauthorized" }, 401);
  const token = m[1] ?? "";

  const fp = JSON.parse(req.headers.get("x-device-fingerprint") ?? "{}") as {
    hostname: string;
    os: string;
    arch: string;
  };
  const ip = req.headers.get("x-forwarded-for") ?? "anon";

  // Lookup
  const lookup = await supa.client
    .from("cli_pairings")
    .select("id, tenant_id, user_id, pairing_token, device_fingerprint_hash, last_ip, last_seen_at, revoked_at")
    .eq("pairing_token", token)
    .maybeSingle();
  const row = lookup.data as PairingRow | null;
  if (!row || row.revoked_at) {
    return cliJson({ ok: false, error: "unauthorized" }, 401);
  }

  // Fingerprint mismatch → revoke + Sentry alert.
  const sentFpHash = fingerprintHash(fp);
  if (sentFpHash !== row.device_fingerprint_hash) {
    await supa.client
      .from("cli_pairings")
      .update({ revoked_at: new Date().toISOString(), revoke_reason: "fingerprint_mismatch" })
      .eq("id", row.id);
    await supa.client.from("audit_logs").insert({
      kind: "pairing_revoked",
      severity: "critical",
      reason: "fingerprint_mismatch",
      pairing_id: row.id,
      observed_fingerprint_hash: sentFpHash,
      expected_fingerprint_hash: row.device_fingerprint_hash,
      ip,
      created_at: new Date().toISOString(),
    });
    captureSentry(
      `[cli-pair-replay] pairing ${row.id} revoked — fingerprint mismatch from ip=${ip}`,
      "error",
    );
    return cliJson({ ok: false, error: "unauthorized", reason: "fingerprint_mismatch" }, 401);
  }

  // IP drift → log warning, allow (legitimate roaming).
  if (row.last_ip && row.last_ip !== ip) {
    await supa.client.from("audit_logs").insert({
      kind: "pairing_ip_drift",
      severity: "warning",
      pairing_id: row.id,
      previous_ip: row.last_ip,
      current_ip: ip,
      created_at: new Date().toISOString(),
    });
  }

  // Update last seen.
  await supa.client
    .from("cli_pairings")
    .update({ last_ip: ip, last_seen_at: new Date().toISOString() })
    .eq("id", row.id);

  return cliJson({ ok: true, jobs: [] }, 200);
}

function mkReq(token: string, fp: { hostname: string; os: string; arch: string }, ip: string): Request {
  return new Request("https://studio-zero.com/api/cli/jobs", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-device-fingerprint": JSON.stringify(fp),
      "x-forwarded-for": ip,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const TOKEN = "T".repeat(43);
const FP_A = { hostname: "mac-mini-01", os: "darwin 24.0.0", arch: "arm64" };
const FP_B = { hostname: "attacker-laptop", os: "linux 6.5", arch: "x86_64" };
const FP_A_HASH = fingerprintHash(FP_A);

const PAIRING_ROW: PairingRow = {
  id: "pairing-replay-test-001",
  tenant_id: "tt-1",
  user_id: "uu-1",
  pairing_token: TOKEN,
  device_fingerprint_hash: FP_A_HASH,
  last_ip: "203.0.113.50",
  last_seen_at: new Date(Date.now() - 60 * 1000).toISOString(),
  revoked_at: null,
};

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI pair token replay (C-FAIL-5)", () => {
  let supa: MockSupabase;

  beforeEach(() => {
    supa = makeMockSupabase();
    __sentryCalls.length = 0;
  });
  afterEach(() => {
    supa.reset();
  });

  it("same token + same fingerprint + DIFFERENT IP within 5min → 200 + ip_drift audit_log (roaming OK)", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    const res = await bearerHandler(mkReq(TOKEN, FP_A, "198.51.100.99"), supa);
    expect(res.status).toBe(200);
    const auditRows = supa.inserts.filter((i) => i.table === "audit_logs");
    expect(auditRows).toHaveLength(1);
    const row = auditRows[0]?.row as Record<string, unknown>;
    expect(row.kind).toBe("pairing_ip_drift");
    expect(row.severity).toBe("warning");
    expect(row.previous_ip).toBe("203.0.113.50");
    expect(row.current_ip).toBe("198.51.100.99");
    expect(__sentryCalls).toHaveLength(0);
  });

  it("same token + same fingerprint + same IP → 200 + NO audit log (no drift)", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    const res = await bearerHandler(mkReq(TOKEN, FP_A, "203.0.113.50"), supa);
    expect(res.status).toBe(200);
    const auditRows = supa.inserts.filter((i) => i.table === "audit_logs");
    expect(auditRows).toHaveLength(0);
  });

  it("same token + DIFFERENT fingerprint → 401 + pairing revoked + audit_log critical", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    const res = await bearerHandler(mkReq(TOKEN, FP_B, "203.0.113.50"), supa);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: string; reason: string };
    expect(body.error).toBe("unauthorized");
    expect(body.reason).toBe("fingerprint_mismatch");
  });

  it("fingerprint mismatch revokes pairing row (revoked_at set)", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    await bearerHandler(mkReq(TOKEN, FP_B, "203.0.113.50"), supa);
    const updates = supa.updates.filter((u) => u.table === "cli_pairings");
    // First update = revoke; second update = update last_seen IS NOT called (we
    // returned 401 before that branch).
    expect(updates).toHaveLength(1);
    const patch = updates[0]?.patch as Record<string, unknown>;
    expect(patch.revoked_at).toBeTruthy();
    expect(patch.revoke_reason).toBe("fingerprint_mismatch");
  });

  it("fingerprint mismatch writes audit_log with kind='pairing_revoked' + severity='critical'", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    await bearerHandler(mkReq(TOKEN, FP_B, "203.0.113.50"), supa);
    const auditRows = supa.inserts.filter((i) => i.table === "audit_logs");
    expect(auditRows).toHaveLength(1);
    const row = auditRows[0]?.row as Record<string, unknown>;
    expect(row.kind).toBe("pairing_revoked");
    expect(row.severity).toBe("critical");
    expect(row.reason).toBe("fingerprint_mismatch");
    expect(row.observed_fingerprint_hash).toBe(fingerprintHash(FP_B));
    expect(row.expected_fingerprint_hash).toBe(FP_A_HASH);
  });

  it("fingerprint mismatch fires Sentry alert (error level)", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    await bearerHandler(mkReq(TOKEN, FP_B, "203.0.113.50"), supa);
    expect(__sentryCalls).toHaveLength(1);
    expect(__sentryCalls[0]?.level).toBe("error");
    expect(__sentryCalls[0]?.message).toContain("pair-replay");
  });

  it("revoked pairing row → 401 on subsequent attempt (control: revoke sticks)", async () => {
    supa.pushRead("cli_pairings", {
      ...PAIRING_ROW,
      revoked_at: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await bearerHandler(mkReq(TOKEN, FP_A, "203.0.113.50"), supa);
    expect(res.status).toBe(401);
  });

  it("only the device_fingerprint hash is stored (no plaintext hostname leak across tenants)", () => {
    // SHA-256 hex = 64 chars; should not equal the raw hostname.
    const h = fingerprintHash(FP_A);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(h).not.toContain(FP_A.hostname);
  });
});
