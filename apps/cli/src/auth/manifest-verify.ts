/**
 * Studio Zero — CLI manifest verification (Ed25519).
 *
 * Phase 9 M3 Batch 2 (Cipher Fix-3c). Implementation of the CLI-side
 * verifier described in `architecture/cli-manifest-signing.md` §6.1.
 *
 * Exported functions:
 *   - getEmbeddedPubKeys():   returns the array of accepted base64 pubkeys
 *   - fetchManifest(url):     GET the published manifest JSON
 *   - verifyManifest(...):    Ed25519-verify the manifest's signature
 *   - verifyOwnBinary(...):   compute own SHA-256 + compare to manifest
 *   - verifyAtStartup(...):   one-call orchestrator for index.ts to use
 *
 * Threat-model posture (per the architecture spec §0):
 *   The CLI trusts a binary_hash if-and-only-if it appears in a manifest
 *   whose Ed25519 signature verifies under an embedded pubkey. Two
 *   independent checks must pass:
 *
 *     1. Signature verify  → manifest came from Jo's 1Password vault.
 *     2. Binary hash match → THIS executable is what the manifest claims.
 *
 *   Either failing = tampered or out-of-date. We refuse to run.
 *
 * Fail-safe posture for NETWORK failures (architecture spec §6.1 step 8):
 *   If the manifest fetch fails (timeout, 5xx, DNS), we emit a soft
 *   warning and return `{ ok: 'soft_fail', ... }`. We do NOT block the
 *   customer's audit — restrictive corporate networks are a real surface
 *   and a verify-time outage should not break their workday. The verdict
 *   is still HMAC-signed by `verdict-sign.ts`; the server makes the
 *   final tamper call. Cipher Fix-3c §6.1 documents this tradeoff.
 *
 * Fail-hard posture for SIGNATURE / HASH mismatches:
 *   These are not network conditions — they are evidence of tampering or
 *   version drift. We exit with code 13 (`cli_tampered`) and print the
 *   branded copy from `brand/samples/05-error-messages.md`.
 */
import { createHash, createPublicKey, verify as nodeCryptoVerify } from "node:crypto";
import { readFileSync } from "node:fs";
import { ACCEPTED_PUBKEYS, CURRENT_PUBKEY, pubkeyFingerprint } from "./manifest-pubkey.js";

/** Shape of the manifest JSON served at /cli/manifest.json. */
export interface Manifest {
  /** Semver string of the CLI version this manifest describes. */
  version: string;
  /** SHA-256 hex (lowercase, 64 chars) of dist/index.js. */
  binary_hash: string;
  /** ISO-8601 UTC timestamp the manifest was signed. */
  published_at: string;
  /** Base64-encoded 64-byte Ed25519 signature over canonical-JSON of the
   *  other three fields. */
  signature: string;
}

/** Discriminated result of the full startup verify orchestration. */
export type VerifyResult =
  | { ok: true; manifest: Manifest; pubkeyFingerprint: string }
  | {
      ok: false;
      reason:
        | "manifest_signature_invalid"
        | "binary_hash_mismatch"
        | "manifest_malformed";
      detail: string;
      expectedHash?: string;
      actualHash?: string;
    }
  | { ok: "soft_fail"; reason: "fetch_failed"; detail: string };

/** Default manifest URL — the production web app's edge-cached route. */
export const DEFAULT_MANIFEST_URL =
  "https://studio-zero.com/cli/manifest.json";

/** Default fetch timeout. Architecture spec §6.1 step 1. */
const DEFAULT_FETCH_TIMEOUT_MS = 5_000;

/**
 * Return the embedded pubkey constants. Thin wrapper so tests can mock
 * via dependency injection (rather than `vi.mock`-ing the module).
 */
export function getEmbeddedPubKeys(): ReadonlyArray<string> {
  return ACCEPTED_PUBKEYS;
}

/**
 * Fetch the published manifest. Timeout + redirect-error mirror the
 * studio-client.ts posture (M3 Batch 1).
 *
 * @returns the parsed Manifest, or throws on network failure.
 */
export async function fetchManifest(
  url: string = DEFAULT_MANIFEST_URL,
  opts: {
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<Manifest> {
  const fetcher = opts.fetcher ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new Error(
      "[manifest-verify] global fetch is not available; Node 24 LTS required",
    );
  }
  const timeoutMs = opts.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetcher(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "studio-zero-cli/manifest-verify",
      },
      redirect: "error",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    const body = (await res.json()) as Manifest;
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Canonicalize a manifest for signing/verifying. Mirrors the build-tool
 * canonicalization in `tools/cli-manifest-sign.ts`. Three fields, in
 * this exact order — adding a new field is a breaking change to BOTH
 * sides + the server-side verifier (architecture spec §4.2).
 */
export function canonicalManifestBytes(
  m: Pick<Manifest, "version" | "binary_hash" | "published_at">,
): Buffer {
  const canonical = {
    version: m.version,
    binary_hash: m.binary_hash,
    published_at: m.published_at,
  };
  return Buffer.from(JSON.stringify(canonical), "utf-8");
}

/**
 * Decode a base64 SPKI Ed25519 pubkey from our embedded constant form
 * into a Node KeyObject for `crypto.verify`. SPKI = the standard
 * "BEGIN PUBLIC KEY" / "END PUBLIC KEY" PEM-armored form sans armor.
 */
function decodePubkey(pubkeyB64: string): ReturnType<typeof createPublicKey> {
  const der = Buffer.from(pubkeyB64, "base64");
  return createPublicKey({
    key: der,
    format: "der",
    type: "spki",
  });
}

/**
 * Verify the manifest's signature against the embedded pubkey set.
 * Returns true iff the signature verifies under CURRENT_PUBKEY OR any
 * entry in LEGACY_PUBKEYS (architecture spec §5.2 grace window).
 *
 * Deterministic: Ed25519 has no per-call randomness, so this function
 * is referentially transparent given the same inputs.
 */
export function verifyManifest(
  manifest: Manifest,
  acceptedPubkeysB64: ReadonlyArray<string> = ACCEPTED_PUBKEYS,
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
      // `crypto.verify(null, ...)` is the Ed25519 form — the digest is
      // internal to the signature scheme, so caller passes null for
      // the hashing algorithm.
      const ok = nodeCryptoVerify(null, messageBytes, pubkey, signatureBytes);
      if (ok) return true;
    } catch {
      // Malformed pubkey constant or runtime crypto error — try next.
      continue;
    }
  }
  return false;
}

/**
 * Compute the SHA-256 of the running CLI binary and compare against the
 * manifest's `binary_hash`. Returns a structured result so callers can
 * report both values when they mismatch.
 *
 * `binaryPath` defaults to the path of the running JS entrypoint
 * (`require.main?.filename` analogue for ESM = process.argv[1]). For
 * tests, callers inject a fixture path.
 */
export function verifyOwnBinary(
  manifest: Manifest,
  binaryPath: string = process.argv[1] ?? process.execPath,
): { valid: boolean; expectedHash: string; actualHash: string } {
  let actualHash: string;
  try {
    const bytes = readFileSync(binaryPath);
    actualHash = createHash("sha256").update(bytes).digest("hex");
  } catch (err) {
    // If we can't read the binary, we can't verify it. Caller decides
    // how to surface this — we report a hash of empty bytes as a
    // distinguishable sentinel value.
    actualHash = createHash("sha256").update("").digest("hex");
    void err;
  }
  return {
    valid: actualHash.toLowerCase() === manifest.binary_hash.toLowerCase(),
    expectedHash: manifest.binary_hash,
    actualHash,
  };
}

/**
 * One-call orchestrator for `studio-zero login` and `studio-zero run`.
 * Fetches the manifest, verifies signature, verifies own binary hash,
 * returns a discriminated result.
 *
 * Architecture spec §6.1: this is the function that index.ts calls at
 * startup. The CLI command dispatchers handle the result — for the
 * `ok: true` case, proceed silently; for `ok: false`, print branded
 * error + exit 13; for `ok: "soft_fail"`, print soft warning + proceed.
 */
export async function verifyAtStartup(
  opts: {
    manifestUrl?: string;
    binaryPath?: string;
    fetcher?: typeof fetch;
    timeoutMs?: number;
    acceptedPubkeys?: ReadonlyArray<string>;
  } = {},
): Promise<VerifyResult> {
  const url = opts.manifestUrl ?? DEFAULT_MANIFEST_URL;
  const acceptedPubkeys = opts.acceptedPubkeys ?? ACCEPTED_PUBKEYS;

  let manifest: Manifest;
  try {
    const fetchOpts: { fetcher?: typeof fetch; timeoutMs?: number } = {};
    if (opts.fetcher !== undefined) fetchOpts.fetcher = opts.fetcher;
    if (opts.timeoutMs !== undefined) fetchOpts.timeoutMs = opts.timeoutMs;
    manifest = await fetchManifest(url, fetchOpts);
  } catch (err) {
    return {
      ok: "soft_fail",
      reason: "fetch_failed",
      detail: (err as Error).message,
    };
  }

  // Manifest shape sanity (we trust nothing).
  if (
    typeof manifest?.version !== "string" ||
    typeof manifest?.binary_hash !== "string" ||
    typeof manifest?.published_at !== "string" ||
    typeof manifest?.signature !== "string"
  ) {
    return {
      ok: false,
      reason: "manifest_malformed",
      detail: "manifest is missing one or more required fields",
    };
  }
  if (!/^[a-f0-9]{64}$/i.test(manifest.binary_hash)) {
    return {
      ok: false,
      reason: "manifest_malformed",
      detail: `binary_hash is not a 64-char hex string (got ${manifest.binary_hash.length} chars)`,
    };
  }

  if (!verifyManifest(manifest, acceptedPubkeys)) {
    return {
      ok: false,
      reason: "manifest_signature_invalid",
      detail:
        "manifest signature did not verify against any embedded pubkey (current or legacy)",
    };
  }

  const binCheck = verifyOwnBinary(manifest, opts.binaryPath);
  if (!binCheck.valid) {
    return {
      ok: false,
      reason: "binary_hash_mismatch",
      detail: "running CLI binary's SHA-256 does not match the manifest's allowed hash",
      expectedHash: binCheck.expectedHash,
      actualHash: binCheck.actualHash,
    };
  }

  return {
    ok: true,
    manifest,
    pubkeyFingerprint: pubkeyFingerprint(CURRENT_PUBKEY),
  };
}

/**
 * Branded copy for the fail-hard tamper case. Re-exports so the
 * index.ts dispatcher can print it without duplicating strings.
 *
 * Per `brand/samples/05-error-messages.md` voice (grade-6, what-then-
 * what-to-do). Exit code 13 = `cli_tampered`.
 */
export const TAMPER_ERROR_MESSAGE: string = [
  "Your Studio Zero CLI was modified or is out of date.",
  "",
  "Run `npm install -g @studiozero/cli` to reinstall the official build.",
  "If you keep seeing this message, contact us at support@studio-zero.com.",
].join("\n");

export const TAMPER_EXIT_CODE = 13 as const;

/**
 * Branded copy for the soft-fail case (manifest fetch failed; we are
 * proceeding without verification). Customer-friendly; explicitly does
 * NOT say "tamper" — the customer didn't do anything wrong.
 */
export const SOFT_FAIL_MESSAGE: string = [
  "We couldn't reach Studio Zero to verify this CLI build right now.",
  "Continuing — your verdict will still be signed and sent for server-side checks.",
].join("\n");
