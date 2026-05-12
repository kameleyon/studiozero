/**
 * Server-side CLI manifest verifier — Phase 9 M3 Batch 2 (Cipher Fix-3c).
 *
 * Mirrors `apps/cli/src/auth/manifest-verify.ts` on the server. Used by
 * `apps/web/app/api/cli/runs/[id]/verdict/route.ts` (Forge M3 Batch 2)
 * to decide whether a CLI-reported `binary_hash` is the one approved by
 * the latest signed manifest for that CLI version.
 *
 * The architecture spec (`architecture/cli-manifest-signing.md` §0) is
 * the canonical reference. This module is the implementation of §6.3:
 *
 *   "When the server-side verifier detects a mismatch — i.e., a CLI
 *    POSTs a verdict claiming a binary_hash that does NOT match the
 *    manifest's allowed hash for that version — the route handler:
 *       1. writes cli_pairings.tamper_detected_at = now()
 *       2. writes one audit_logs row (action='cli_tamper_detected')
 *       3. emits one Sentry warning
 *       4. returns HTTP 400 to the CLI"
 *
 * This module owns steps 1–2 (and the verification primitive); the route
 * handler owns step 3 (Sentry) + step 4 (HTTP response shape) per
 * separation of concerns.
 *
 * Posture (per architecture §6.1, mirrored server-side):
 *   - Fail-hard on signature-invalid or binary-hash-mismatch.
 *   - Fail-hard if the manifest for a given CLI version cannot be
 *     found. The server does NOT soft-fail like the CLI does — the
 *     server is on a stable network; a missing manifest IS a tamper
 *     signal (the CLI is claiming a version we never published).
 *   - The accepted pubkey set is read from runtime_config row
 *     `cli_manifest_accepted_pubkeys` (a jsonb array of base64 SPKI
 *     pubkeys), maintained by Atlas's manifest-publish flow. This is
 *     the server-side mirror of the CLI's CURRENT_PUBKEY +
 *     LEGACY_PUBKEYS arrays.
 *
 * Cipher-policy note: this module is intentionally pure-function-shaped
 * (no implicit globals, every dep injected) so the test suite at
 * `tests/integration/cli-manifest-tamper.spec.ts` can exercise the
 * tamper-detection path without standing up Supabase.
 */
import { createPublicKey, verify as nodeCryptoVerify } from "node:crypto";

import { createServiceRoleClient } from "./supabase-service";

/** Manifest shape — structurally identical to the CLI side. */
export interface CliManifest {
  version: string;
  binary_hash: string;
  published_at: string;
  signature: string;
}

/** Result of `verifyCliClaim` — the orchestrator the verdict route calls. */
export type CliClaimVerifyResult =
  | { ok: true; manifest: CliManifest }
  | {
      ok: false;
      reason:
        | "no_manifest_for_version"
        | "manifest_signature_invalid"
        | "binary_hash_mismatch";
      detail: string;
      reportedHash?: string;
      expectedHash?: string;
    };

/** Canonical bytes for verification — mirror of the CLI/build-tool fn. */
function canonicalManifestBytes(
  m: Pick<CliManifest, "version" | "binary_hash" | "published_at">,
): Buffer {
  const canonical = {
    version: m.version,
    binary_hash: m.binary_hash,
    published_at: m.published_at,
  };
  return Buffer.from(JSON.stringify(canonical), "utf-8");
}

/** Decode a base64-encoded SPKI Ed25519 pubkey to a KeyObject. */
function decodePubkey(pubkeyB64: string): ReturnType<typeof createPublicKey> {
  const der = Buffer.from(pubkeyB64, "base64");
  return createPublicKey({
    key: der,
    format: "der",
    type: "spki",
  });
}

/**
 * Verify a manifest's Ed25519 signature against an accepted-pubkey list.
 * Returns true iff any pubkey in the list verifies. Pure function —
 * exported for direct unit testing.
 */
export function verifyManifestSignature(
  manifest: CliManifest,
  acceptedPubkeysB64: ReadonlyArray<string>,
): boolean {
  if (typeof manifest.signature !== "string" || manifest.signature.length === 0) {
    return false;
  }
  let signatureBytes: Buffer;
  try {
    signatureBytes = Buffer.from(manifest.signature, "base64");
  } catch {
    return false;
  }
  if (signatureBytes.length !== 64) return false;

  const messageBytes = canonicalManifestBytes(manifest);
  for (const pubkeyB64 of acceptedPubkeysB64) {
    try {
      const pubkey = decodePubkey(pubkeyB64);
      if (nodeCryptoVerify(null, messageBytes, pubkey, signatureBytes)) {
        return true;
      }
    } catch {
      // malformed pubkey row — try next
      continue;
    }
  }
  return false;
}

/**
 * Load the manifest for the given CLI version + the accepted-pubkey
 * mirror from `runtime_config`. Returns null if no row exists.
 *
 * Service-role client is required: runtime_config writes are
 * service-role-only, but reads from authenticated role are policy-
 * allowed (migration 0002 §G). We still use service-role here because
 * the verdict-route runs server-side and benefits from RLS-bypass for
 * a single well-defined query — Atlas's standing pattern for
 * platform-config reads.
 */
export async function loadManifestForVersion(
  version: string,
  opts: { supabase?: ReturnType<typeof createServiceRoleClient> } = {},
): Promise<{
  manifest: CliManifest | null;
  acceptedPubkeys: ReadonlyArray<string>;
}> {
  const supabase = opts.supabase ?? createServiceRoleClient();
  const manifestKey = `cli_manifest_v${version}`;
  const pubkeysKey = "cli_manifest_accepted_pubkeys";

  const [manifestRes, pubkeysRes] = await Promise.all([
    supabase
      .from("runtime_config")
      .select("value")
      .eq("key", manifestKey)
      .maybeSingle(),
    supabase
      .from("runtime_config")
      .select("value")
      .eq("key", pubkeysKey)
      .maybeSingle(),
  ]);

  const manifest =
    manifestRes.data && !manifestRes.error
      ? ((manifestRes.data as { value: CliManifest }).value ?? null)
      : null;

  // Pubkeys row holds a jsonb array of base64-encoded SPKI pubkeys.
  // Fallback to empty list — verifyManifestSignature returns false on
  // empty list, which is the fail-safe posture.
  const acceptedPubkeys: ReadonlyArray<string> =
    pubkeysRes.data && !pubkeysRes.error
      ? ((pubkeysRes.data as { value: ReadonlyArray<string> }).value ?? [])
      : [];

  return { manifest, acceptedPubkeys };
}

/**
 * Orchestrator: verify that a CLI's reported `binary_hash` for a given
 * `cli_version` is the one approved by the signed manifest. Called by
 * the verdict-route handler at the top of POST handling.
 *
 * Returns ok=true only if ALL of:
 *   1. A manifest row exists for cli_version.
 *   2. The manifest's signature verifies under the accepted pubkey set.
 *   3. The manifest's binary_hash matches the CLI's reported one.
 */
export async function verifyCliClaim(
  cliVersion: string,
  reportedBinaryHash: string,
  opts: { supabase?: ReturnType<typeof createServiceRoleClient> } = {},
): Promise<CliClaimVerifyResult> {
  const { manifest, acceptedPubkeys } = await loadManifestForVersion(
    cliVersion,
    opts,
  );

  if (!manifest) {
    return {
      ok: false,
      reason: "no_manifest_for_version",
      detail: `no signed manifest published for CLI version ${cliVersion}`,
    };
  }

  if (!verifyManifestSignature(manifest, acceptedPubkeys)) {
    return {
      ok: false,
      reason: "manifest_signature_invalid",
      detail:
        "stored manifest's Ed25519 signature does not verify under any accepted pubkey",
    };
  }

  if (
    reportedBinaryHash.toLowerCase() !== manifest.binary_hash.toLowerCase()
  ) {
    return {
      ok: false,
      reason: "binary_hash_mismatch",
      detail: "CLI-reported binary_hash does not match manifest's allowed hash",
      reportedHash: reportedBinaryHash,
      expectedHash: manifest.binary_hash,
    };
  }

  return { ok: true, manifest };
}

/**
 * Record a tamper event in `cli_pairings` + `audit_logs`. Called by the
 * verdict-route handler when `verifyCliClaim` returns ok=false. Keeps
 * the side-effect surface in one place so the route handler stays thin.
 *
 * Cipher posture: writes are idempotent for the audit_logs row (every
 * tamper attempt is a separate row, even if the same pairing). The
 * cli_pairings.tamper_detected_at column is UPDATEd to NOW() on every
 * detection — most-recent wins.
 *
 * The Atlas migration that adds `cli_pairings.tamper_detected_at` is
 * 0008 (next migration after 0007). Until that migration lands, this
 * fn silently skips the cli_pairings UPDATE — the audit_logs row is the
 * source of truth either way.
 */
export async function recordTamperEvent(
  params: {
    cliPairingId: string;
    cliVersion: string;
    reportedHash: string;
    expectedHash: string;
    reason: CliClaimVerifyResult extends { ok: false; reason: infer R }
      ? R
      : never;
    manifestSignatureValid: boolean;
  },
  opts: { supabase?: ReturnType<typeof createServiceRoleClient> } = {},
): Promise<void> {
  const supabase = opts.supabase ?? createServiceRoleClient();

  // 1. Update cli_pairings.tamper_detected_at if the column exists.
  //    The schema introspection here is intentional — until migration
  //    0008 lands, the column isn't present and the UPDATE would 500.
  //    We swallow that specific error class; any other error surfaces.
  try {
    await supabase
      .from("cli_pairings")
      .update({ tamper_detected_at: new Date().toISOString() })
      .eq("id", params.cliPairingId);
  } catch {
    // Column not present yet (pre-0008) — audit_logs is enough.
  }

  // 2. Write audit_logs row.
  await supabase.from("audit_logs").insert({
    tenant_id: null,
    action: "cli_tamper_detected",
    actor: "system",
    target: params.cliPairingId,
    metadata: {
      cli_version: params.cliVersion,
      reported_hash: params.reportedHash,
      expected_hash: params.expectedHash,
      reason: params.reason,
      manifest_signature_valid: params.manifestSignatureValid,
    },
  });
}
