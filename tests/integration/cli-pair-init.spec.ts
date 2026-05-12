/**
 * Studio Zero — CLI pair/init integration (M3 Batch 2 Verify).
 *
 * Drives the POST /api/cli/pair/init contract per
 * `ia/user-flows/cli-pairing-and-tamper.md` C2 + C3:
 *   - Happy: returns { pairingCode (6 chars), expiresAt (now + 5min) }
 *   - Rate limit: 6th attempt from same IP within 60s → 429 + Retry-After.
 *   - Body validation: missing device_fingerprint → 400.
 *
 * Forge's route at `apps/web/app/api/cli/pair/init/route.ts` is wired in
 * parallel (M3 Batch 2 Forge dispatch). Until that lands we drive the
 * contract via the published primitives in `apps/web/lib/cli-auth.ts` so
 * Verify's spec ratchets the contract instead of trailing the
 * implementation. Once the route file lands, swap the in-test handler
 * for a dynamic import of the route — assertions stay identical (the
 * contract was the test, not the file).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAIRING_CODE_LENGTH,
  PAIRING_CODE_TTL_MS,
  PAIR_RATE_LIMIT_PER_MIN,
  __resetBucketsForTest,
  cliJson,
  generatePairingCode,
  getClientIp,
  hashPairingCode,
  rateLimit,
  tooManyRequests,
} from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

/* -------------------------------------------------------------------------- */
/* In-test handler — mirror of the contract Forge is shipping.                */
/* -------------------------------------------------------------------------- */

interface PairInitBody {
  deviceFingerprint?: { hostname?: string; os?: string; arch?: string };
  cliVersion?: string;
  binaryHash?: string;
}

async function pairInitHandler(req: Request, supa: MockSupabase): Promise<Response> {
  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return tooManyRequests(rl.retryAfterMs, rl.reason ?? "rate_limited");
  }

  let body: PairInitBody;
  try {
    body = (await req.json()) as PairInitBody;
  } catch {
    return cliJson({ ok: false, error: "invalid_json" }, 400);
  }

  const fp = body.deviceFingerprint;
  if (
    !fp ||
    typeof fp.hostname !== "string" ||
    typeof fp.os !== "string" ||
    typeof fp.arch !== "string"
  ) {
    return cliJson({ ok: false, error: "device_fingerprint_required" }, 400);
  }

  const code = generatePairingCode();
  const codeHash = hashPairingCode(code);
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString();

  await supa.client.from("cli_pairings").insert({
    pairing_code_hash: codeHash,
    expires_at: expiresAt,
    hostname: fp.hostname,
    os: fp.os,
    arch: fp.arch,
    cli_version: body.cliVersion ?? null,
    pending_binary_hash: body.binaryHash ?? null,
  });

  return cliJson({ ok: true, pairingCode: code, expiresAt }, 200);
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const validFingerprint = {
  deviceFingerprint: { hostname: "mac-mini-01", os: "darwin 24.0.0", arch: "arm64" },
  cliVersion: "0.1.0-m3",
};

function mkReq(body: unknown, ip = "203.0.113.1"): Request {
  return new Request("https://studio-zero.com/api/cli/pair/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI pair/init — contract surface (M3 Batch 2 Verify)", () => {
  let supa: MockSupabase;

  beforeEach(() => {
    __resetBucketsForTest();
    supa = makeMockSupabase();
  });

  afterEach(() => {
    __resetBucketsForTest();
  });

  it("happy path: returns 6-char code + 5-min TTL + inserts cli_pairings row", async () => {
    const res = await pairInitHandler(mkReq(validFingerprint), supa);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      pairingCode: string;
      expiresAt: string;
    };
    expect(body.ok).toBe(true);
    expect(body.pairingCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(body.pairingCode.length).toBe(PAIRING_CODE_LENGTH);

    const ttl = new Date(body.expiresAt).getTime() - Date.now();
    // Should be ~5 min (300s), allow ±2s for execution drift.
    expect(ttl).toBeGreaterThan(PAIRING_CODE_TTL_MS - 2000);
    expect(ttl).toBeLessThanOrEqual(PAIRING_CODE_TTL_MS + 100);

    // DB write recorded.
    expect(supa.inserts).toHaveLength(1);
    expect(supa.inserts[0]?.table).toBe("cli_pairings");
    const inserted = supa.inserts[0]?.row as Record<string, unknown>;
    // The plaintext code MUST NOT be persisted — only the hash.
    expect(inserted.pairing_code_hash).toBe(hashPairingCode(body.pairingCode));
    expect(Object.values(inserted)).not.toContain(body.pairingCode);
  });

  it("happy path: AI-disclosure header on every response (PRD §11.3)", async () => {
    const res = await pairInitHandler(mkReq(validFingerprint), supa);
    expect(res.headers.get("X-AI-Generated")).toBe("studio-zero");
  });

  it("rate limit: 6th attempt from same IP within 60s → 429 + Retry-After header", async () => {
    const ip = "198.51.100.50";
    // First PAIR_RATE_LIMIT_PER_MIN attempts succeed.
    for (let i = 0; i < PAIR_RATE_LIMIT_PER_MIN; i++) {
      const ok = await pairInitHandler(mkReq(validFingerprint, ip), supa);
      expect(ok.status).toBe(200);
    }
    // 6th attempt → 429.
    const blocked = await pairInitHandler(mkReq(validFingerprint, ip), supa);
    expect(blocked.status).toBe(429);
    const retryAfter = blocked.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
    const body = (await blocked.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("rate_limited");
  });

  it("rate limit: different IPs each get their own bucket (no cross-IP starvation)", async () => {
    // Exhaust IP A.
    const ipA = "203.0.113.10";
    for (let i = 0; i < PAIR_RATE_LIMIT_PER_MIN; i++) {
      await pairInitHandler(mkReq(validFingerprint, ipA), supa);
    }
    const aBlocked = await pairInitHandler(mkReq(validFingerprint, ipA), supa);
    expect(aBlocked.status).toBe(429);

    // IP B is still fresh.
    const bOk = await pairInitHandler(mkReq(validFingerprint, "203.0.113.11"), supa);
    expect(bOk.status).toBe(200);
  });

  it("body validation: missing device_fingerprint → 400 + machine error code", async () => {
    const res = await pairInitHandler(mkReq({ cliVersion: "0.1.0-m3" }), supa);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("device_fingerprint_required");
    expect(supa.inserts).toHaveLength(0);
  });

  it("body validation: partial fingerprint (hostname only) → 400", async () => {
    const res = await pairInitHandler(
      mkReq({ deviceFingerprint: { hostname: "mac-mini-01" } }),
      supa,
    );
    expect(res.status).toBe(400);
    expect(supa.inserts).toHaveLength(0);
  });

  it("body validation: malformed JSON body → 400 (no crash)", async () => {
    const res = await pairInitHandler(mkReq("not json {{{"), supa);
    expect(res.status).toBe(400);
    expect(supa.inserts).toHaveLength(0);
  });

  it("generated codes are random across calls (no repeats in 50 draws)", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const c = generatePairingCode();
      expect(seen.has(c)).toBe(false);
      seen.add(c);
    }
  });
});
