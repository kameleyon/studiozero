/**
 * CLI binary-hash registry — Phase 9 M3 Batch 2 (Forge).
 *
 * Cross-checks a CLI's claimed binary_hash against the published-builds
 * manifest per `cli-pairing-and-tamper.md` C8:
 *
 *   - hash on the published list  → ok (signature-verify next)
 *   - hash not on the list        → unrecognized_binary (C-TAMPER amber)
 *
 * Cipher's Fix-3c (parallel work) will land the Ed25519-signed manifest
 * at `/cli/handshake`. Until then we look up against two sources, in
 * priority order:
 *
 *   1. Filesystem manifest at `public/cli/handshake.json` — Cipher will
 *      populate this when Fix-3c lands. Shape:
 *        {
 *          "version": 1,
 *          "signature": "<ed25519>",
 *          "publicKey": "<ed25519 pub>",
 *          "builds": [
 *            { "cliVersion": "0.1.0-m3", "binaryHash": "<sha256-hex>",
 *              "publishedAt": "...", "platforms": ["darwin","linux","win32"] }
 *          ]
 *        }
 *   2. Environment variable `STUDIOZERO_CLI_TRUSTED_HASHES` — comma-separated
 *      sha256-hex list. Used in CI + dev. Convenient seam for the Verify
 *      integration tests.
 *
 * If both are empty/unavailable, EVERY hash returns `unrecognized_binary`
 * — fail-closed posture per Shield's threat model.
 *
 * NB: the registry is **transparency, not security** per D7 lock. A
 * mismatch shows the C-TAMPER banner; it does NOT block the verdict.
 * That call lives in the route handler, not here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import "server-only";

import type { TamperDetectedEvent } from "../../../architecture/schemas/audit-event.v1";

export type BinaryHashStatus = "registered" | "unrecognized";

interface ManifestBuild {
  cliVersion: string;
  binaryHash: string;
  publishedAt?: string;
  platforms?: string[];
}

interface Manifest {
  version: number;
  signature?: string;
  publicKey?: string;
  builds: ManifestBuild[];
}

let cached: Manifest | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

/** Load the manifest from disk, caching for 60s. Returns null if absent. */
function loadManifest(): Manifest | null {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;

  const candidates = [
    path.join(process.cwd(), "public", "cli", "handshake.json"),
    path.join(process.cwd(), "apps", "web", "public", "cli", "handshake.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf-8");
      const parsed = JSON.parse(raw) as Manifest;
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray(parsed.builds)
      ) {
        cached = parsed;
        cachedAt = now;
        return parsed;
      }
    } catch {
      // try next
    }
  }
  cached = null;
  cachedAt = now;
  return null;
}

/** Comma-separated env hashes (lowercased). */
function envTrustedHashes(): Set<string> {
  const raw = process.env.STUDIOZERO_CLI_TRUSTED_HASHES ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[a-f0-9]{64}$/.test(s)),
  );
}

/**
 * Look up a binary hash in the published-builds registry. Returns
 * `"registered"` if found, `"unrecognized"` otherwise. Fail-closed:
 * when neither manifest nor env list is present, ALL hashes are
 * `"unrecognized"`.
 */
export function lookupBinaryHash(binaryHash: string): BinaryHashStatus {
  if (!/^[a-f0-9]{64}$/i.test(binaryHash)) return "unrecognized";
  const hash = binaryHash.toLowerCase();

  // Env list — first because it's the test/CI seam.
  if (envTrustedHashes().has(hash)) return "registered";

  // Manifest list.
  const m = loadManifest();
  if (m && Array.isArray(m.builds)) {
    for (const b of m.builds) {
      if (typeof b.binaryHash === "string" && b.binaryHash.toLowerCase() === hash) {
        return "registered";
      }
    }
  }

  return "unrecognized";
}

/** Test-only: bust the manifest cache. */
export function __resetManifestCacheForTest(): void {
  cached = null;
  cachedAt = 0;
}

/**
 * Construct an AuditEvent v1.1 `tamper_detected` variant for the case
 * where a CLI's reported binary hash is not on the registered list
 * (ARCH-D10 close, Phase 9 M3). Callers (the verdict route handler) can
 * pipe the returned event into the runs.events_log + the realtime channel
 * so the web UI surfaces the same C-TAMPER amber banner the CLI sees
 * locally. Per D7: a mismatch shows the banner, it does NOT block the
 * verdict.
 */
export function tamperEventForUnrecognizedBinary(
  reportedBinaryHash: string,
  opts: { pairingId?: string; cliVersion?: string } = {},
): TamperDetectedEvent {
  return {
    kind: "tamper_detected",
    reason: "unrecognized_binary",
    binary_hash_actual: reportedBinaryHash.toLowerCase(),
    binary_hash_expected: "",
    ...(opts.pairingId !== undefined ? { pairing_id: opts.pairingId } : {}),
    ...(opts.cliVersion !== undefined ? { cli_version: opts.cliVersion } : {}),
    at: new Date().toISOString(),
  };
}
