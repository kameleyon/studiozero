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

/**
 * Privacy invariant — CLI NEVER uploads source. If you're adding source
 * to this body, you're wrong. See PRD §13.4 + §13.5 + the M3 exit gate
 * `tests/integration/cli-no-upload.spec.ts`.
 *
 * The verdict body shape is the audit-output.v1 metadata-only contract:
 *   - verdict (string), signature (hex), claimedBinaryHash (hex)
 *   - findings (structured metadata: severity, reviewer, summary, evidence-by-reference)
 * The `evidence` field on each finding is REFERENCE-only — file paths,
 * line numbers, URLs, screenshot storage_paths. It MUST NOT contain
 * raw source bytes.
 *
 * Defence in depth:
 *   1. `assertMetadataOnly()` walks the finding list at runtime to refuse
 *      any evidence shape carrying a `snippet` longer than 256 chars
 *      (snippets are allowed for tiny context lines per audit-output.v1,
 *      but anything beyond a single line is treated as source-leak).
 *   2. studio-client's `maxBodyBytes` (64 KiB) is the size-cap guard.
 *   3. `tests/integration/cli-no-upload.spec.ts` (Verify) is the contract
 *      gate that fails CI if either guard is bypassed.
 */
const MAX_SNIPPET_LEN = 256;

interface MaybeFinding {
  evidence?: { type?: string; snippet?: unknown };
}

export function assertMetadataOnly(verdict: VerdictBody): void {
  for (const f of verdict.findings as ReadonlyArray<MaybeFinding>) {
    const ev = f.evidence;
    if (!ev) continue;
    const snip = ev.snippet;
    if (snip !== undefined && snip !== null) {
      if (typeof snip !== "string") {
        throw new Error(
          "[studio-zero] privacy invariant: finding.evidence.snippet must be a string",
        );
      }
      if (snip.length > MAX_SNIPPET_LEN) {
        throw new Error(
          `[studio-zero] privacy invariant: finding.evidence.snippet exceeds ${MAX_SNIPPET_LEN} chars; refusing to upload (PRD §13.4 — source never leaves the machine)`,
        );
      }
    }
  }
  // Dev-mode breadcrumb so a developer adding new evidence shapes sees
  // the invariant being asserted at runtime. Production CLIs are silent.
  if (process.env.STUDIOZERO_DEBUG_PRIVACY === "1") {
    // eslint-disable-next-line no-console
    console.log(
      `[studio-zero] privacy invariant OK: ${verdict.findings.length} findings, metadata-only`,
    );
  }
}

export async function uploadVerdict(
  opts: UploadVerdictOpts,
): Promise<UploadVerdictResult> {
  // Privacy invariant — CLI NEVER uploads source. See PRD §13.4.
  // If you're adding source to this body, you're wrong.
  assertMetadataOnly(opts.verdict);

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
  // Privacy invariant — CLI NEVER uploads source. See PRD §13.4.
  // Event bodies are progress/reviewer-status only; no source bytes,
  // no file contents. studio-client's 64 KiB cap is the runtime guard.
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
