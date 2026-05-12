/**
 * Studio Zero — upload signed verdict.
 *
 * Phase 9 M3 Batch 1 (Forge). After `runLocalAudit` produces a signed
 * verdict, this module POSTs it to `/api/cli/runs/:runId/verdict` so
 * the web server can verify the signature (C8) and render the verdict
 * with the D7 watermark (C9) or with the C-TAMPER banner on mismatch.
 *
 * Idempotency: the upload uses `Idempotency-Key: <runId>` so a network
 * blip + retry can't produce two verdict rows. Server-side the
 * verdict insert is `INSERT ... ON CONFLICT (run_id) DO NOTHING` (Atlas).
 *
 * Privacy: per PRD §13.4 the upload payload contains ONLY:
 *   { verdict, signature, claimedBinaryHash }
 * No source bytes. The studio-client's maxBodyBytes guard is the
 * runtime guardrail; the contract test (`cli-no-upload.spec.ts`) is
 * the M3 exit-gate enforcement.
 */
import { request } from "./studio-client.js";
import type { VerdictBody } from "../runner/verdict-sign.js";

export interface UploadVerdictOpts {
  apiUrl: string;
  token: string;
  runId: string;
  verdict: VerdictBody;
  signature: string;
  fetcher?: typeof fetch;
}

export interface UploadVerdictResult {
  ok: boolean;
  status: number;
  watermarkApplied: boolean;
  /**
   * Server-reported signature status. One of:
   *   - 'verified'              → C9 happy path
   *   - 'mismatch'              → C-TAMPER red banner
   *   - 'unrecognized_binary'   → C-TAMPER amber banner
   */
  signatureStatus: "verified" | "mismatch" | "unrecognized_binary" | "unknown";
}

interface UploadVerdictResponse {
  watermarkApplied: boolean;
  signatureStatus: "verified" | "mismatch" | "unrecognized_binary";
}

export async function uploadVerdict(
  opts: UploadVerdictOpts,
): Promise<UploadVerdictResult> {
  const res = await request<UploadVerdictResponse>({
    apiUrl: opts.apiUrl,
    method: "POST",
    path: `/api/cli/runs/${encodeURIComponent(opts.runId)}/verdict`,
    auth: opts.token,
    idempotencyKey: opts.runId,
    body: {
      verdict: opts.verdict,
      signature: opts.signature,
      claimedBinaryHash: opts.verdict.claimedBinaryHash,
    },
    ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
  });

  return {
    ok: res.ok,
    status: res.status,
    watermarkApplied: res.ok ? res.body?.watermarkApplied ?? false : false,
    signatureStatus: res.ok
      ? res.body?.signatureStatus ?? "unknown"
      : "unknown",
  };
}

/**
 * Post a single progress / finding event. Used during a run so the
 * web's `/app/runs/<id>` page shows live updates. Metadata only —
 * no source bytes (privacy invariant).
 */
export async function postRunEvent(opts: {
  apiUrl: string;
  token: string;
  runId: string;
  event: Record<string, unknown>;
  fetcher?: typeof fetch;
}): Promise<{ ok: boolean; status: number }> {
  const res = await request<{ accepted: boolean }>({
    apiUrl: opts.apiUrl,
    method: "POST",
    path: `/api/cli/runs/${encodeURIComponent(opts.runId)}/events`,
    auth: opts.token,
    body: opts.event,
    ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
  });
  return { ok: res.ok, status: res.status };
}
