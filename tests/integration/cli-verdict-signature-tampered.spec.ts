/**
 * Studio Zero — verdict HMAC signature mismatch (C-TAMPER red banner).
 *
 * Per `ia/user-flows/cli-pairing-and-tamper.md` C8 + EC-5:
 * the CLI binary_hash IS in the manifest, but the HMAC signature over
 * the verdict body doesn't match. This means EITHER:
 *   - the verdict bytes were modified post-sign (in transit, by middlebox,
 *     or by a tampered binary that claimed an official hash), OR
 *   - the CLI has a bug.
 *
 * Server-side response per the flow:
 *   - 400 status + body.error='signature_invalid' + body.signature_status='mismatch'
 *   - audit_logs row inserted with severity='warning' + kind='signature_mismatch'
 *   - Sentry critical event (this is rarer than unrecognized_binary →
 *     louder alert per EC-5 "if a pattern emerges across many users,
 *     on-call paged")
 *   - Body uses red-banner Herald copy (transparency, not security claim)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canonicalizeVerdict,
  cliJson,
  verifyVerdictSignature,
  type VerdictBody,
} from "../../apps/web/lib/cli-auth";
import {
  lookupBinaryHash,
  __resetManifestCacheForTest,
} from "../../apps/web/lib/cli-binary-registry";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

/* -------------------------------------------------------------------------- */
/* Sentry shim                                                                */
/* -------------------------------------------------------------------------- */

const __sentryCalls: Array<{ message: string; level: string }> = [];
function captureSentry(message: string, level: string): void {
  __sentryCalls.push({ message, level });
}

/* -------------------------------------------------------------------------- */
/* In-test handler — mirrors apps/web/app/api/cli/runs/[id]/verdict route     */
/* -------------------------------------------------------------------------- */

const RED_BANNER_COPY =
  "We couldn't verify this verdict was produced by the CLI binary it claims. Findings are shown but we recommend re-running on hosted infra to confirm.";

async function verdictHandler(
  req: Request,
  supa: MockSupabase,
): Promise<Response> {
  const body = (await req.json()) as {
    verdict: VerdictBody;
    signature: string;
    claimedBinaryHash: string;
  };
  const claimedHash = body.claimedBinaryHash;

  // Stage 1: manifest lookup — known hash for this spec.
  if (lookupBinaryHash(claimedHash) === "unrecognized") {
    return cliJson({ ok: false, error: "tamper_detected" }, 400);
  }

  // Stage 2: signature verify.
  if (!verifyVerdictSignature(body.verdict, claimedHash, body.signature)) {
    await supa.client.from("audit_logs").insert({
      kind: "signature_mismatch",
      run_id: body.verdict.runId,
      severity: "warning",
      detected_via: "hmac_verify",
      claimed_binary_hash: claimedHash,
      created_at: new Date().toISOString(),
    });
    captureSentry(
      `[cli-signature-mismatch] run=${body.verdict.runId} hash=${claimedHash.slice(0, 8)}…`,
      "error",
    );
    return cliJson(
      {
        ok: false,
        error: "signature_invalid",
        signature_status: "mismatch",
        user_message: RED_BANNER_COPY,
      },
      400,
    );
  }

  return cliJson({ ok: true, watermarkApplied: true, signatureStatus: "verified" }, 200);
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const KNOWN_HASH = "b".repeat(64);

const baseVerdict: VerdictBody = {
  runId: "run-sig-test-001",
  verdict: "PASS",
  score: 90,
  scoreEngineVersion: "1.0.0",
  audience: "internal",
  watermark: "private-run-self-audited",
  findings: [],
  scoreBreakdown: { tests: 30, security: 30, perf: 30 },
  sealedAt: new Date("2026-05-10T12:00:00Z").toISOString(),
  claimedBinaryHash: KNOWN_HASH,
};

function correctSignature(v: VerdictBody, key: string): string {
  // Use the same canonicalization the server uses.
  const { createHmac } = require("node:crypto") as typeof import("node:crypto");
  return createHmac("sha256", key).update(canonicalizeVerdict(v), "utf-8").digest("hex");
}

function mkReq(body: unknown): Request {
  return new Request("https://studio-zero.com/api/cli/runs/run-sig-test-001/verdict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + "Z".repeat(43),
    },
    body: JSON.stringify(body),
  });
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI verdict signature mismatch (C-TAMPER red banner)", () => {
  let supa: MockSupabase;
  let savedTrusted: string | undefined;

  beforeEach(() => {
    __resetManifestCacheForTest();
    supa = makeMockSupabase();
    __sentryCalls.length = 0;
    savedTrusted = process.env.STUDIOZERO_CLI_TRUSTED_HASHES;
    process.env.STUDIOZERO_CLI_TRUSTED_HASHES = KNOWN_HASH;
  });

  afterEach(() => {
    if (savedTrusted === undefined) {
      delete process.env.STUDIOZERO_CLI_TRUSTED_HASHES;
    } else {
      process.env.STUDIOZERO_CLI_TRUSTED_HASHES = savedTrusted;
    }
    __resetManifestCacheForTest();
  });

  it("verdict body mutated post-sign (score changed) → 400 + signature_status='mismatch'", async () => {
    const sig = correctSignature(baseVerdict, KNOWN_HASH);
    // Tamper: bump the score AFTER signing.
    const tamperedVerdict: VerdictBody = { ...baseVerdict, score: 99 };
    const res = await verdictHandler(
      mkReq({
        verdict: tamperedVerdict,
        signature: sig,
        claimedBinaryHash: KNOWN_HASH,
      }),
      supa,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      error: string;
      signature_status: string;
      user_message: string;
    };
    expect(body.error).toBe("signature_invalid");
    expect(body.signature_status).toBe("mismatch");
    expect(body.user_message).toBe(RED_BANNER_COPY);
  });

  it("verdict body mutated post-sign (verdict flipped FAIL→PASS) → 400 + signature_status='mismatch'", async () => {
    const failVerdict: VerdictBody = { ...baseVerdict, verdict: "FAIL", score: 12 };
    const sig = correctSignature(failVerdict, KNOWN_HASH);
    // Tamper: flip to PASS but keep the signature for FAIL.
    const tampered: VerdictBody = { ...failVerdict, verdict: "PASS", score: 88 };
    const res = await verdictHandler(
      mkReq({ verdict: tampered, signature: sig, claimedBinaryHash: KNOWN_HASH }),
      supa,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { signature_status: string };
    expect(body.signature_status).toBe("mismatch");
  });

  it("audit_logs row written with kind='signature_mismatch' + detected_via='hmac_verify'", async () => {
    const sig = correctSignature(baseVerdict, KNOWN_HASH);
    await verdictHandler(
      mkReq({
        verdict: { ...baseVerdict, score: 100 },
        signature: sig,
        claimedBinaryHash: KNOWN_HASH,
      }),
      supa,
    );
    const auditRows = supa.inserts.filter((i) => i.table === "audit_logs");
    expect(auditRows).toHaveLength(1);
    const row = auditRows[0]?.row as Record<string, unknown>;
    expect(row.kind).toBe("signature_mismatch");
    expect(row.detected_via).toBe("hmac_verify");
    expect(row.severity).toBe("warning");
    expect(row.run_id).toBe(baseVerdict.runId);
  });

  it("Sentry critical event emitted (louder than unrecognized_binary per EC-5)", async () => {
    const sig = correctSignature(baseVerdict, KNOWN_HASH);
    await verdictHandler(
      mkReq({
        verdict: { ...baseVerdict, score: 100 },
        signature: sig,
        claimedBinaryHash: KNOWN_HASH,
      }),
      supa,
    );
    expect(__sentryCalls).toHaveLength(1);
    const call = __sentryCalls[0]!;
    expect(call.level).toBe("error");
    expect(call.message).toContain("signature-mismatch");
  });

  it("correctly-signed verdict (no tamper) → 200 + watermark applied (control)", async () => {
    const sig = correctSignature(baseVerdict, KNOWN_HASH);
    const res = await verdictHandler(
      mkReq({
        verdict: baseVerdict,
        signature: sig,
        claimedBinaryHash: KNOWN_HASH,
      }),
      supa,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; watermarkApplied: boolean };
    expect(body.ok).toBe(true);
    expect(body.watermarkApplied).toBe(true);
    expect(supa.inserts.filter((i) => i.table === "audit_logs")).toHaveLength(0);
    expect(__sentryCalls).toHaveLength(0);
  });

  it("D7 lock: response copy uses transparency framing — no accusatory words", async () => {
    const sig = correctSignature(baseVerdict, KNOWN_HASH);
    const res = await verdictHandler(
      mkReq({
        verdict: { ...baseVerdict, score: 100 },
        signature: sig,
        claimedBinaryHash: KNOWN_HASH,
      }),
      supa,
    );
    const body = (await res.json()) as { user_message: string };
    expect(body.user_message.toLowerCase()).not.toContain("tampered");
    expect(body.user_message.toLowerCase()).not.toContain("attacked");
    expect(body.user_message.toLowerCase()).not.toContain("compromised");
  });
});
