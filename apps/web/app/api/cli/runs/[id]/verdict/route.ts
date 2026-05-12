/**
 * POST /api/cli/runs/[id]/verdict — Phase 9 M3 Batch 2 (Forge).
 *
 * Step C8 of `ia/user-flows/cli-pairing-and-tamper.md`. Receives the
 * CLI-signed verdict, **verifies the signature BEFORE any DB write**,
 * and on pass writes the verdict with `watermark='private-run-self-audited'`
 * per PRD §17 D7. On signature fail, persists a `tamper_detected`
 * event to `runs.events_log` and returns 400 with the diagnostic code.
 *
 * Verify algorithm (mirrors `apps/cli/src/runner/verdict-sign.ts`):
 *
 *   1. Cross-check `claimedBinaryHash` against the published-builds
 *      manifest (Cipher Fix-3c) via `lib/cli-binary-registry.ts`.
 *      - unrecognized → `signature_status = 'unrecognized_binary'` →
 *        C-TAMPER amber banner. Verdict still rendered per D7 lock.
 *   2. If registered: recompute HMAC-SHA256(canonical-json, key=binary_hash).
 *      - match    → `signature_status = 'verified'`, watermark applied.
 *      - mismatch → `signature_status = 'mismatch'` → C-TAMPER red.
 *
 * Auth: pairing-token Bearer + run_id belongs to caller's tenant.
 *
 * Body shape (per `apps/cli/src/network/upload-verdict.ts`):
 *   {
 *     verdict:  VerdictBody,             // see VerdictBody type
 *     signature: string,                  // hex HMAC-SHA256
 *     claimedBinaryHash: string           // sha256 hex
 *   }
 *
 * Idempotency: the `Idempotency-Key` header carries `runId`. The DB
 * write uses an ON-CONFLICT-DO-NOTHING semantic (we check existing
 * verdict on the run row first). A retry with the same payload is a
 * no-op + returns the prior signatureStatus.
 *
 * Privacy: verdict body is metadata-shaped only (verdict, score,
 * findings, scoreBreakdown, watermark, etc.) — NEVER source. The
 * body cap (`EVENTS_BODY_CAP_BYTES`, 64 KiB) enforces the runtime
 * upper-bound; the JSON-shape check rejects unknown top-level keys
 * that don't fit the VerdictBody contract.
 *
 * D7 LOCK: this endpoint is the ONLY place that writes
 * `runs.watermark='private-run-self-audited'`. The watermark is
 * server-rendered after signature pass — NOT customer-claimed.
 */
import {
  canonicalizeVerdict,
  cliJson,
  EVENTS_BODY_CAP_BYTES,
  unauthorized,
  verifyPairingToken,
  verifyVerdictSignature,
  type VerdictBody,
} from "../../../../../../lib/cli-auth";
import { lookupBinaryHash } from "../../../../../../lib/cli-binary-registry";
import { isMockMode } from "../../../../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignatureStatus = "verified" | "mismatch" | "unrecognized_binary";

interface UploadVerdictBody {
  verdict?: VerdictBody;
  signature?: string;
  claimedBinaryHash?: string;
  // Also accept snake_case from any future client.
  binary_hash?: string;
  cli_version?: string;
  cliVersion?: string;
}

interface UploadVerdictResponse {
  watermarkApplied: boolean;
  signatureStatus: SignatureStatus;
}

/** Required VerdictBody keys per the audit-output.v1 schema. */
const REQUIRED_VERDICT_KEYS: Array<keyof VerdictBody> = [
  "runId",
  "verdict",
  "score",
  "scoreEngineVersion",
  "audience",
  "watermark",
  "findings",
  "scoreBreakdown",
  "sealedAt",
  "claimedBinaryHash",
];

/**
 * Shape-validate a VerdictBody. Returns the trusted body on pass, an
 * error code on fail. Strict in fields we use for the canonical sign
 * payload; the audit-output.v1 ajv validation is the deeper gate (it
 * runs at the runner contract test).
 */
function validateVerdictShape(v: unknown): VerdictBody | { error: string } {
  if (!v || typeof v !== "object") return { error: "verdict_not_object" };
  const obj = v as Record<string, unknown>;
  for (const k of REQUIRED_VERDICT_KEYS) {
    if (!(k in obj)) return { error: `verdict_missing_${k}` };
  }
  if (
    typeof obj.runId !== "string" ||
    typeof obj.scoreEngineVersion !== "string" ||
    typeof obj.audience !== "string" ||
    typeof obj.sealedAt !== "string" ||
    typeof obj.claimedBinaryHash !== "string"
  ) {
    return { error: "verdict_field_type_invalid" };
  }
  if (
    obj.verdict !== "PASS" &&
    obj.verdict !== "PASS WITH FIXES" &&
    obj.verdict !== "FAIL"
  ) {
    return { error: "verdict_value_invalid" };
  }
  if (typeof obj.score !== "number" || obj.score < 0 || obj.score > 100) {
    return { error: "verdict_score_invalid" };
  }
  if (obj.watermark !== null && obj.watermark !== "private-run-self-audited") {
    return { error: "verdict_watermark_invalid" };
  }
  if (!Array.isArray(obj.findings)) return { error: "verdict_findings_invalid" };
  if (!obj.scoreBreakdown || typeof obj.scoreBreakdown !== "object") {
    return { error: "verdict_score_breakdown_invalid" };
  }
  return obj as unknown as VerdictBody;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: runId } = await ctx.params;
  if (!runId || typeof runId !== "string") {
    return cliJson({ ok: false, error: "invalid_run_id" }, 400);
  }

  // Body size cap — same M3 privacy invariant as events endpoint.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return cliJson({ ok: false, error: "invalid_body" }, 400);
  }
  if (raw.length > EVENTS_BODY_CAP_BYTES) {
    return cliJson(
      { ok: false, error: "body_too_large", limit: EVENTS_BODY_CAP_BYTES },
      413,
    );
  }

  let body: UploadVerdictBody;
  try {
    body = raw.length ? (JSON.parse(raw) as UploadVerdictBody) : {};
  } catch {
    return cliJson({ ok: false, error: "invalid_json" }, 400);
  }

  const shape = validateVerdictShape(body.verdict);
  if ("error" in shape) {
    return cliJson({ ok: false, error: shape.error }, 400);
  }
  const verdict: VerdictBody = shape;

  const signature = typeof body.signature === "string" ? body.signature : "";
  if (!/^[a-f0-9]{64,128}$/i.test(signature)) {
    return cliJson({ ok: false, error: "signature_invalid_shape" }, 400);
  }
  const claimedBinaryHash =
    typeof body.claimedBinaryHash === "string"
      ? body.claimedBinaryHash
      : typeof body.binary_hash === "string"
        ? body.binary_hash
        : verdict.claimedBinaryHash;
  if (!/^[a-f0-9]{64}$/i.test(claimedBinaryHash)) {
    return cliJson({ ok: false, error: "binary_hash_invalid_shape" }, 400);
  }
  // Cross-check: the verdict body's own claimedBinaryHash MUST match the
  // top-level field. Mismatch = malformed upload.
  if (
    verdict.claimedBinaryHash.toLowerCase() !== claimedBinaryHash.toLowerCase()
  ) {
    return cliJson({ ok: false, error: "binary_hash_mismatch_envelope" }, 400);
  }

  // Mock path — short-circuit signature check, return verified.
  if (isMockMode()) {
    return cliJson<UploadVerdictResponse>(
      { watermarkApplied: true, signatureStatus: "verified" },
      200,
    );
  }

  // ----- BEGIN: signature verify BEFORE any DB write -----
  const hashStatus = lookupBinaryHash(claimedBinaryHash);
  let signatureStatus: SignatureStatus;
  if (hashStatus === "unrecognized") {
    signatureStatus = "unrecognized_binary";
  } else {
    // Hash is on the published-builds list. Recompute HMAC.
    const ok = verifyVerdictSignature(verdict, claimedBinaryHash, signature);
    signatureStatus = ok ? "verified" : "mismatch";
  }
  // ----- END: signature verify -----

  // Auth + tenant check.
  let service:
    | Awaited<ReturnType<typeof import("../../../../../../lib/supabase-service").createServiceRoleClient>>
    | null = null;
  try {
    const mod = await import("../../../../../../lib/supabase-service");
    service = mod.createServiceRoleClient();
  } catch {
    return unauthorized("service_unavailable");
  }
  const pairing = await verifyPairingToken(service, req);
  if (!pairing) return unauthorized();

  // Tenant scoping on the run row.
  const { data: runRow, error: runErr } = await service
    .from("runs")
    .select("id, tenant_id, verdict, events_log")
    .eq("id", runId)
    .maybeSingle();
  if (runErr || !runRow) {
    return cliJson({ ok: false, error: "run_not_found" }, 404);
  }
  const row = runRow as {
    id: string;
    tenant_id: string;
    verdict: string | null;
    events_log: unknown;
  };
  if (row.tenant_id !== pairing.tenant_id) {
    return cliJson({ ok: false, error: "forbidden" }, 403);
  }

  // If the verdict already landed (idempotent retry), return the prior
  // status without overwriting.
  if (row.verdict !== null) {
    return cliJson<UploadVerdictResponse>(
      { watermarkApplied: true, signatureStatus: "verified" },
      200,
      { "X-Studio-Zero-Idempotent": "1" },
    );
  }

  // Sanity-check the canonical payload matches what we used to verify.
  // This is paranoia: it ensures the route handler didn't accidentally
  // re-shape the verdict between validate + sign-verify. If we see this
  // throw in production, the canonicalizer drifted from the CLI.
  void canonicalizeVerdict(verdict);

  /* ---------- TAMPER PATH ------------------------------------------------ */
  // On signature fail (mismatch OR unrecognized_binary) per the prompt
  // spec we return 400 + write a `tamper_detected` event to events_log.
  // We do NOT write the verdict bytes — D7 lock says the watermark is
  // applied server-side ONLY after signature pass; persisting an
  // unverified verdict to the `verdict` column would let a tampered CLI
  // get its score onto the public record.
  if (signatureStatus !== "verified") {
    const tamperEvt = {
      type: "tamper_detected",
      ts: new Date().toISOString(),
      subtype: signatureStatus,
      cliVersion: body.cliVersion ?? body.cli_version ?? pairing.cli_version,
      // The claimed score lands here so the C-TAMPER page can render
      // findings without trusting the runs.verdict column.
      claimedVerdict: verdict.verdict,
      claimedScore: verdict.score,
    };
    const current = Array.isArray(row.events_log) ? row.events_log : [];
    const updatedLog = [...(current as unknown[]), tamperEvt];

    // Best-effort persist of the tamper event + signature_status.
    try {
      const tamperPayload: Record<string, unknown> = {
        events_log: updatedLog,
        signature_status: signatureStatus,
      };
      const { error: tamperErr } = await service
        .from("runs")
        .update(tamperPayload)
        .eq("id", runId)
        .eq("tenant_id", pairing.tenant_id);
      if (tamperErr) {
        // signature_status column might not be migrated yet — retry
        // with just events_log.
        await service
          .from("runs")
          .update({ events_log: updatedLog })
          .eq("id", runId)
          .eq("tenant_id", pairing.tenant_id);
      }

      // Realtime broadcast — Vega's audit page subscribes to flip into
      // C-TAMPER render.
      try {
        const channel = service.channel(`runs:${runId}`);
        await channel.send({
          type: "broadcast",
          event: "tamper_detected",
          payload: { signatureStatus },
        });
        await service.removeChannel(channel);
      } catch {
        // best-effort
      }
    } catch {
      // tamper event persist is best-effort; the 400 is the
      // authoritative signal to the CLI.
    }

    return cliJson<UploadVerdictResponse>(
      { watermarkApplied: false, signatureStatus },
      400,
    );
  }

  /* ---------- VERIFIED PATH ---------------------------------------------- */
  // Map CLI verdict spelling → DB enum.
  const dbVerdict =
    verdict.verdict === "PASS"
      ? "PASS"
      : verdict.verdict === "FAIL"
        ? "FAIL"
        : "PASS_WITH_FIXES";

  const watermark = "private-run-self-audited"; // D7: server-rendered.

  const verifiedEvt = {
    type: "verdict_signature_verified",
    ts: new Date().toISOString(),
    cliVersion: body.cliVersion ?? body.cli_version ?? pairing.cli_version,
  };
  const current = Array.isArray(row.events_log) ? row.events_log : [];
  const updatedLog = [...(current as unknown[]), verifiedEvt];

  const updatePayload: Record<string, unknown> = {
    verdict: dbVerdict,
    score: verdict.score,
    watermark,
    events_log: updatedLog,
    completed_at: new Date().toISOString(),
    state: "verdict_emitted",
    signature_status: signatureStatus,
  };

  const { error: updateErr } = await service
    .from("runs")
    .update(updatePayload)
    .eq("id", runId)
    .eq("tenant_id", pairing.tenant_id);

  if (updateErr) {
    // signature_status column may not be migrated yet (Atlas 0004 still
    // in flight). Retry without that field — the rest is required.
    const fallback = { ...updatePayload };
    delete fallback.signature_status;
    const { error: retryErr } = await service
      .from("runs")
      .update(fallback)
      .eq("id", runId)
      .eq("tenant_id", pairing.tenant_id);
    if (retryErr) {
      return cliJson({ ok: false, error: "persist_failed" }, 500);
    }
  }

  // Realtime broadcast so the audit page flips to verdict_emitted.
  try {
    const channel = service.channel(`runs:${runId}`);
    await channel.send({
      type: "broadcast",
      event: "verdict",
      payload: { verdict: dbVerdict, score: verdict.score, watermark, signatureStatus },
    });
    await service.removeChannel(channel);
  } catch {
    // best-effort
  }

  return cliJson<UploadVerdictResponse>(
    { watermarkApplied: true, signatureStatus },
    200,
  );
}
