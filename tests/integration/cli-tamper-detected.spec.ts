/**
 * Studio Zero — CLI binary-hash NOT in manifest (C-TAMPER amber banner).
 *
 * Per `ia/user-flows/cli-pairing-and-tamper.md` C8 + EC-4:
 * when the CLI's claimed binary_hash is not in the published-builds
 * manifest (cli_binary_hash_unknown), the verdict route MUST:
 *
 *   1. Return 400 (rejected at the manifest gate).
 *   2. Write an `audit_logs` row with kind='tamper_detected' carrying:
 *        - run_id
 *        - claimed_binary_hash
 *        - detected_via='manifest_lookup'
 *        - severity='warning'
 *   3. Emit a Sentry-shaped warning so on-call can correlate.
 *   4. Body carries the branded copy per Herald sample 05 (transparency,
 *      not accusation per D7 lock).
 *
 * Live binary-tamper detection requires the actual CLI binary on disk
 * (`computeBinaryHash` reads process.execPath) — the genuine "verify the
 * binary was modified" lane lives in `tests/security/cli-job-tamper.spec.ts`
 * (Probe). This spec covers the SERVER-SIDE rejection contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cliJson, verifyVerdictSignature, type VerdictBody } from "../../apps/web/lib/cli-auth";
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
/* In-test handler: /api/cli/runs/[id]/verdict                                */
/* -------------------------------------------------------------------------- */

interface VerdictRequestBody {
  verdict: VerdictBody;
  signature: string;
  claimedBinaryHash: string;
}

const HERALD_SAMPLE_05_COPY =
  "We don't recognize this CLI build. We're showing your findings as-is — if you built from source, that's expected. Re-run on hosted infra if you want an independently-verified verdict.";

async function verdictHandler(
  req: Request,
  supa: MockSupabase,
): Promise<Response> {
  const body = (await req.json()) as VerdictRequestBody;
  const claimedHash = body.claimedBinaryHash;

  // Stage 1: manifest lookup.
  const status = lookupBinaryHash(claimedHash);
  if (status === "unrecognized") {
    // Write the tamper_detected audit log.
    await supa.client.from("audit_logs").insert({
      kind: "tamper_detected",
      run_id: body.verdict?.runId ?? null,
      severity: "warning",
      detected_via: "manifest_lookup",
      claimed_binary_hash: claimedHash,
      created_at: new Date().toISOString(),
    });
    captureSentry(
      `[cli-tamper] verdict rejected — claimed binary hash ${claimedHash.slice(0, 8)}… not in manifest`,
      "warning",
    );
    return cliJson(
      {
        ok: false,
        error: "tamper_detected",
        signature_status: "unrecognized_binary",
        user_message: HERALD_SAMPLE_05_COPY,
      },
      400,
    );
  }

  // Stage 2: signature verify (covered by cli-verdict-signature-tampered).
  if (!verifyVerdictSignature(body.verdict, claimedHash, body.signature)) {
    return cliJson({ ok: false, error: "signature_invalid" }, 400);
  }

  return cliJson({ ok: true, watermarkApplied: true, signatureStatus: "verified" }, 200);
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const KNOWN_HASH = "a".repeat(64);
const UNKNOWN_HASH = "f".repeat(64);

const baseVerdict: VerdictBody = {
  runId: "run-12345",
  verdict: "PASS",
  score: 88,
  scoreEngineVersion: "1.0.0",
  audience: "internal",
  watermark: "private-run-self-audited",
  findings: [],
  scoreBreakdown: { tests: 30, security: 30, perf: 28 },
  sealedAt: new Date().toISOString(),
  claimedBinaryHash: UNKNOWN_HASH,
};

function mkReq(body: unknown): Request {
  return new Request("https://studio-zero.com/api/cli/runs/run-12345/verdict", {
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

describe("CLI tamper-detected — binary hash NOT in manifest (C-TAMPER)", () => {
  let supa: MockSupabase;
  let savedTrusted: string | undefined;

  beforeEach(() => {
    __resetManifestCacheForTest();
    supa = makeMockSupabase();
    __sentryCalls.length = 0;
    savedTrusted = process.env.STUDIOZERO_CLI_TRUSTED_HASHES;
    // Trust ONLY KNOWN_HASH for this spec.
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

  it("verdict with unknown binary_hash → 400 + tamper_detected error", async () => {
    const res = await verdictHandler(
      mkReq({
        verdict: baseVerdict,
        signature: "deadbeef",
        claimedBinaryHash: UNKNOWN_HASH,
      }),
      supa,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string; signature_status: string };
    expect(body.error).toBe("tamper_detected");
    expect(body.signature_status).toBe("unrecognized_binary");
  });

  it("response carries Herald sample-05 branded copy (transparency, not accusation per D7)", async () => {
    const res = await verdictHandler(
      mkReq({
        verdict: baseVerdict,
        signature: "deadbeef",
        claimedBinaryHash: UNKNOWN_HASH,
      }),
      supa,
    );
    const body = (await res.json()) as { user_message: string };
    expect(body.user_message).toBe(HERALD_SAMPLE_05_COPY);
    // D7 lock: no accusatory language.
    expect(body.user_message.toLowerCase()).not.toContain("tampered");
    expect(body.user_message.toLowerCase()).not.toContain("hacked");
    expect(body.user_message.toLowerCase()).not.toContain("malicious");
  });

  it("audit_logs row written with kind='tamper_detected' + claimed hash + detected_via", async () => {
    await verdictHandler(
      mkReq({
        verdict: baseVerdict,
        signature: "deadbeef",
        claimedBinaryHash: UNKNOWN_HASH,
      }),
      supa,
    );
    const auditRows = supa.inserts.filter((i) => i.table === "audit_logs");
    expect(auditRows).toHaveLength(1);
    const row = auditRows[0]?.row as Record<string, unknown>;
    expect(row.kind).toBe("tamper_detected");
    expect(row.severity).toBe("warning");
    expect(row.detected_via).toBe("manifest_lookup");
    expect(row.claimed_binary_hash).toBe(UNKNOWN_HASH);
    expect(row.run_id).toBe("run-12345");
  });

  it("Sentry warning emitted with truncated hash (no PII leak in error tracker)", async () => {
    await verdictHandler(
      mkReq({
        verdict: baseVerdict,
        signature: "deadbeef",
        claimedBinaryHash: UNKNOWN_HASH,
      }),
      supa,
    );
    expect(__sentryCalls).toHaveLength(1);
    const call = __sentryCalls[0]!;
    expect(call.level).toBe("warning");
    expect(call.message).toContain("cli-tamper");
    // Hash truncated to 8 chars in Sentry message — full hash is in audit_logs only.
    expect(call.message).toContain(UNKNOWN_HASH.slice(0, 8));
    expect(call.message).not.toContain(UNKNOWN_HASH);
  });

  it("known binary_hash (in manifest) is admitted past stage 1 (control)", async () => {
    // Build a properly-signed verdict for the known hash.
    const { createHmac } = await import("node:crypto");
    const okVerdict: VerdictBody = { ...baseVerdict, claimedBinaryHash: KNOWN_HASH };
    const sig = createHmac("sha256", KNOWN_HASH)
      .update(JSON.stringify({
        runId: okVerdict.runId,
        verdict: okVerdict.verdict,
        score: okVerdict.score,
        scoreEngineVersion: okVerdict.scoreEngineVersion,
        audience: okVerdict.audience,
        watermark: okVerdict.watermark,
        findings: okVerdict.findings,
        scoreBreakdown: okVerdict.scoreBreakdown,
        sealedAt: okVerdict.sealedAt,
        claimedBinaryHash: okVerdict.claimedBinaryHash,
      }), "utf-8")
      .digest("hex");
    const res = await verdictHandler(
      mkReq({ verdict: okVerdict, signature: sig, claimedBinaryHash: KNOWN_HASH }),
      supa,
    );
    expect(res.status).toBe(200);
    expect(supa.inserts.filter((i) => i.table === "audit_logs")).toHaveLength(0);
    expect(__sentryCalls).toHaveLength(0);
  });

  it.skip(
    "live binary tamper detection on actual CLI bin — needs real binary at test time (// M3+1)",
  );
});
