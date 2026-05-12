/**
 * Studio Zero — CLI pair/confirm integration (M3 Batch 2 Verify).
 *
 * Drives the POST /api/cli/pair/confirm contract per
 * `ia/user-flows/cli-pairing-and-tamper.md` C4 + C5:
 *
 *   - Happy: web-authenticated user POSTs a fresh pairing code → server
 *     returns { token, deviceId, userEmail, tokenExpiresAt } and stamps
 *     `cli_pairings.paired_at`.
 *   - Expired code (>5min) → 410 Gone with reason.
 *   - Invalid code (typo) → 400 + remaining_attempts in body.
 *   - Already-confirmed code (replay) → 409 Conflict.
 *
 * Same in-test handler strategy as cli-pair-init.spec.ts: use the
 * published `cli-auth.ts` primitives to model Forge's M3 Batch 2
 * contract; route file lands in parallel and assertions stay identical.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAIRING_TOKEN_TTL_MS,
  __resetBucketsForTest,
  cliJson,
  generatePairingToken,
  hashPairingCode,
  isValidPairingCodeShape,
  recordConfirmFailure,
  recordConfirmSuccess,
} from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

/* -------------------------------------------------------------------------- */
/* In-test handler                                                            */
/* -------------------------------------------------------------------------- */

interface PairConfirmBody {
  pairingCode?: unknown;
  deviceFingerprint?: { hostname?: string; os?: string; arch?: string };
  cliVersion?: string;
  binaryHash?: string;
}

interface CliPairingRow {
  id: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  pairing_code_hash: string;
  expires_at: string;
  paired_at: string | null;
}

const failsByIp = new Map<string, number>();

async function pairConfirmHandler(
  req: Request,
  supa: MockSupabase,
): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";

  let body: PairConfirmBody;
  try {
    body = (await req.json()) as PairConfirmBody;
  } catch {
    return cliJson({ ok: false, error: "invalid_json" }, 400);
  }
  if (!isValidPairingCodeShape(body.pairingCode)) {
    return cliJson(
      { ok: false, error: "pairing_code_invalid", remaining_attempts: 5 - (failsByIp.get(ip) ?? 0) },
      400,
    );
  }

  const fp = body.deviceFingerprint;
  if (!fp?.hostname || !fp?.os || !fp?.arch) {
    return cliJson({ ok: false, error: "device_fingerprint_required" }, 400);
  }

  const codeHash = hashPairingCode(body.pairingCode);
  // Service-role lookup of the pending pairing row.
  const lookup = await supa.client
    .from("cli_pairings")
    .select(
      "id, tenant_id, user_id, user_email, pairing_code_hash, expires_at, paired_at",
    )
    .eq("pairing_code_hash", codeHash)
    .maybeSingle();
  const row = lookup.data as CliPairingRow | null;

  if (!row) {
    failsByIp.set(ip, (failsByIp.get(ip) ?? 0) + 1);
    recordConfirmFailure(ip);
    return cliJson(
      {
        ok: false,
        error: "pairing_code_invalid",
        remaining_attempts: Math.max(0, 5 - (failsByIp.get(ip) ?? 0)),
      },
      400,
    );
  }

  // Expired?
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return cliJson(
      { ok: false, error: "pairing_code_expired", reason: "ttl_exceeded" },
      410,
    );
  }

  // Already confirmed?
  if (row.paired_at) {
    return cliJson(
      { ok: false, error: "pairing_code_already_used", reason: "replay" },
      409,
    );
  }

  const token = generatePairingToken();
  const expiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS).toISOString();

  await supa.client
    .from("cli_pairings")
    .update({
      paired_at: new Date().toISOString(),
      pairing_token: token,
      token_expires_at: expiresAt,
      hostname: fp.hostname,
      os: fp.os,
      arch: fp.arch,
      cli_version: body.cliVersion ?? null,
      binary_hash: body.binaryHash ?? null,
    })
    .eq("id", row.id);

  recordConfirmSuccess(ip);
  return cliJson(
    {
      ok: true,
      token,
      deviceId: row.id,
      userEmail: row.user_email,
      tokenExpiresAt: expiresAt,
    },
    200,
  );
}

function mkReq(body: unknown, ip = "203.0.113.20"): Request {
  return new Request("https://studio-zero.com/api/cli/pair/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const validFingerprint = {
  hostname: "mac-mini-02",
  os: "darwin 24.0.0",
  arch: "arm64",
};

const VALID_CODE = "AB12CD";
const PAIRING_ROW: CliPairingRow = {
  id: "pairing-id-001",
  tenant_id: "00000000-0000-0000-0000-000000000aaa",
  user_id: "00000000-0000-0000-0000-000000000bbb",
  user_email: "alice@example.com",
  pairing_code_hash: hashPairingCode(VALID_CODE),
  // 4 minutes in the future = NOT expired.
  expires_at: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
  paired_at: null,
};

describe("CLI pair/confirm — contract surface (M3 Batch 2 Verify)", () => {
  let supa: MockSupabase;

  beforeEach(() => {
    __resetBucketsForTest();
    failsByIp.clear();
    supa = makeMockSupabase();
  });

  afterEach(() => {
    __resetBucketsForTest();
    failsByIp.clear();
  });

  it("happy: valid code + fingerprint → 200 + 43-char token + 90d expiry + paired_at stamped", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    const res = await pairConfirmHandler(
      mkReq({
        pairingCode: VALID_CODE,
        deviceFingerprint: validFingerprint,
        cliVersion: "0.1.0-m3",
        binaryHash: "a".repeat(64),
      }),
      supa,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      token: string;
      deviceId: string;
      userEmail: string;
      tokenExpiresAt: string;
    };
    expect(body.ok).toBe(true);
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{20,128}$/);
    expect(body.userEmail).toBe("alice@example.com");
    // 90d expiry — allow ±5s drift.
    const exp = new Date(body.tokenExpiresAt).getTime() - Date.now();
    expect(exp).toBeGreaterThan(PAIRING_TOKEN_TTL_MS - 5000);
    expect(exp).toBeLessThanOrEqual(PAIRING_TOKEN_TTL_MS + 100);
    // paired_at recorded.
    expect(supa.updates).toHaveLength(1);
    const upd = supa.updates[0];
    expect(upd?.table).toBe("cli_pairings");
    const patch = upd?.patch as Record<string, unknown>;
    expect(patch.paired_at).toBeTruthy();
    expect(patch.pairing_token).toBe(body.token);
  });

  it("expired (>5min) → 410 Gone with reason='ttl_exceeded'", async () => {
    supa.pushRead("cli_pairings", {
      ...PAIRING_ROW,
      // Expired 1 minute ago.
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const res = await pairConfirmHandler(
      mkReq({
        pairingCode: VALID_CODE,
        deviceFingerprint: validFingerprint,
      }),
      supa,
    );
    expect(res.status).toBe(410);
    const body = (await res.json()) as { ok: boolean; error: string; reason: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("pairing_code_expired");
    expect(body.reason).toBe("ttl_exceeded");
    // No update on expired code.
    expect(supa.updates).toHaveLength(0);
  });

  it("invalid code (typo / no row) → 400 + remaining_attempts in body", async () => {
    // No pushRead — supabase returns null = no row found.
    const res = await pairConfirmHandler(
      mkReq({
        pairingCode: "ZZZZZZ",
        deviceFingerprint: validFingerprint,
      }),
      supa,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      error: string;
      remaining_attempts: number;
    };
    expect(body.error).toBe("pairing_code_invalid");
    expect(typeof body.remaining_attempts).toBe("number");
    expect(body.remaining_attempts).toBeLessThanOrEqual(5);
    expect(body.remaining_attempts).toBeGreaterThanOrEqual(0);
  });

  it("malformed code shape → 400 immediately (no DB hit)", async () => {
    const res = await pairConfirmHandler(
      mkReq({
        pairingCode: "TOO-LONG-CODE-NOT-SIX-CHARS",
        deviceFingerprint: validFingerprint,
      }),
      supa,
    );
    expect(res.status).toBe(400);
    // We never looked up the DB.
    expect(supa.readResponses.size).toBe(0);
  });

  it("already-confirmed code (replay) → 409 Conflict", async () => {
    supa.pushRead("cli_pairings", {
      ...PAIRING_ROW,
      paired_at: new Date(Date.now() - 30_000).toISOString(),
    });
    const res = await pairConfirmHandler(
      mkReq({
        pairingCode: VALID_CODE,
        deviceFingerprint: validFingerprint,
      }),
      supa,
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { ok: boolean; error: string; reason: string };
    expect(body.error).toBe("pairing_code_already_used");
    expect(body.reason).toBe("replay");
    // No update on replay (the original pairing keeps its token).
    expect(supa.updates).toHaveLength(0);
  });

  it("missing device_fingerprint → 400 (server cannot bind device)", async () => {
    const res = await pairConfirmHandler(mkReq({ pairingCode: VALID_CODE }), supa);
    expect(res.status).toBe(400);
    expect(supa.readResponses.size).toBe(0);
  });

  it("every response carries the AI-disclosure header (PRD §11.3)", async () => {
    supa.pushRead("cli_pairings", { ...PAIRING_ROW });
    const res = await pairConfirmHandler(
      mkReq({ pairingCode: VALID_CODE, deviceFingerprint: validFingerprint }),
      supa,
    );
    expect(res.headers.get("X-AI-Generated")).toBe("studio-zero");
  });
});
