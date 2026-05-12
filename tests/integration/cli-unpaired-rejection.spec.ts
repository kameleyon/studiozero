/**
 * Studio Zero — CLI unpaired rejection on bearer-required routes.
 *
 * Per `ia/user-flows/cli-pairing-and-tamper.md` C-FAIL section + Shield's
 * M3 cli-tamper-corpus "unpaired" pattern + RFC 6750 §3:
 *
 *   - Missing Bearer header → 401 + WWW-Authenticate: Bearer realm=...
 *   - Bearer with revoked pairing → 401
 *   - Bearer that doesn't match any row → 401
 *   - Bearer with bad shape (not 20-128 b64url chars) → 401 immediately
 *     (no DB lookup — the verifyPairingToken() in cli-auth short-circuits)
 *
 * This is the canonical "Goal 4 CLI lane" precondition: every CLI-only
 * endpoint MUST reject unpaired callers before doing any other work.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cliJson, verifyPairingToken } from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

/* -------------------------------------------------------------------------- */
/* In-test handler — represents any bearer-required CLI route                 */
/* -------------------------------------------------------------------------- */

async function bearerGuard(req: Request, supa: MockSupabase): Promise<Response> {
  const row = await verifyPairingToken(supa.client, req);
  if (!row) {
    return cliJson(
      { ok: false, error: "unauthorized" },
      401,
      { "WWW-Authenticate": 'Bearer realm="studio-zero"' },
    );
  }
  return cliJson({ ok: true, pairingId: row.id }, 200);
}

function mkReq(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.Authorization = authHeader;
  return new Request("https://studio-zero.com/api/cli/jobs", { method: "GET", headers });
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI unpaired rejection", () => {
  let supa: MockSupabase;

  beforeEach(() => {
    supa = makeMockSupabase();
  });
  afterEach(() => {
    supa.reset();
  });

  it("missing Authorization header → 401 + WWW-Authenticate", async () => {
    const res = await bearerGuard(mkReq(), supa);
    expect(res.status).toBe(401);
    const wwwAuth = res.headers.get("WWW-Authenticate");
    expect(wwwAuth).toBeTruthy();
    expect(wwwAuth).toContain("Bearer");
    expect(wwwAuth).toContain('realm="studio-zero"');
  });

  it("bad bearer header shape (no Bearer prefix) → 401", async () => {
    const res = await bearerGuard(mkReq("Token abc123"), supa);
    expect(res.status).toBe(401);
  });

  it("bearer with empty token → 401", async () => {
    const res = await bearerGuard(mkReq("Bearer "), supa);
    expect(res.status).toBe(401);
  });

  it("bearer with malformed token shape (too short) → 401 (short-circuit, no DB lookup)", async () => {
    const res = await bearerGuard(mkReq("Bearer x"), supa);
    expect(res.status).toBe(401);
  });

  it("bearer with valid-shape token but no DB row → 401", async () => {
    // No pushRead = supabase returns null = no row found.
    const res = await bearerGuard(mkReq("Bearer " + "U".repeat(43)), supa);
    expect(res.status).toBe(401);
  });

  it("bearer with REVOKED pairing → 401", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-revoked-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: new Date(Date.now() - 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await bearerGuard(mkReq("Bearer " + "Q".repeat(43)), supa);
    expect(res.status).toBe(401);
  });

  it("bearer with EXPIRED token (expires_at in past) → 401", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-expired-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: null,
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await bearerGuard(mkReq("Bearer " + "Q".repeat(43)), supa);
    expect(res.status).toBe(401);
  });

  it("bearer with VALID + active pairing → 200 (control)", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-ok-001",
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
    const res = await bearerGuard(mkReq("Bearer " + "Q".repeat(43)), supa);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; pairingId: string };
    expect(body.ok).toBe(true);
    expect(body.pairingId).toBe("pairing-ok-001");
  });

  it("AI-disclosure header on the 401 body (PRD §11.3)", async () => {
    const res = await bearerGuard(mkReq(), supa);
    expect(res.headers.get("X-AI-Generated")).toBe("studio-zero");
  });
});
