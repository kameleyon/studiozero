/**
 * Studio Zero — manifest verification unit tests.
 *
 * Phase 9 M3 Batch 2 (Cipher Fix-3c). Covers the locked behavior in
 * `architecture/cli-manifest-signing.md` §6.1 + §8.
 *
 *   - Happy path: signed manifest verifies + binary hash matches.
 *   - Hard fail: signature invalid.
 *   - Hard fail: binary hash mismatch (tampered binary).
 *   - Hard fail: malformed manifest (missing fields, non-hex hash).
 *   - Soft fail: fetch throws → result.ok === 'soft_fail'.
 *   - Legacy pubkey: signature from a rotated-out key still accepts
 *     during the 30-day grace window.
 *   - Canonicalization: bytes are deterministic across key shuffling.
 *
 * Test posture: we generate a real Ed25519 keypair per-test using
 * `crypto.generateKeyPairSync` so the tests don't depend on the
 * placeholder constant in `manifest-pubkey.ts`. Each test wires up the
 * pubkey list explicitly via the `acceptedPubkeys` opt.
 */
import { describe, it, expect } from "vitest";
import {
  createHash,
  generateKeyPairSync,
  sign as nodeCryptoSign,
} from "node:crypto";
import { writeFileSync, mkdtempSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  canonicalManifestBytes,
  verifyAtStartup,
  verifyManifest,
  verifyOwnBinary,
  type Manifest,
} from "../src/auth/manifest-verify.js";

/**
 * Generate a real Ed25519 keypair + return both forms used by the
 * verifier (raw signing primitive + SPKI-DER-b64 for embedded
 * comparison).
 */
function makeKeypair(): {
  privKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
  pubKeyB64: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pubDer = publicKey.export({ format: "der", type: "spki" });
  const pubKeyB64 = Buffer.isBuffer(pubDer)
    ? pubDer.toString("base64")
    : Buffer.from(pubDer as ArrayBuffer).toString("base64");
  return { privKey: privateKey, pubKeyB64 };
}

/**
 * Build a signed manifest for the given binary bytes. Mirrors what
 * `tools/cli-manifest-sign.ts` does at build time.
 */
function buildSignedManifest(
  binaryBytes: Buffer,
  version: string,
  privKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
): Manifest {
  const binary_hash = createHash("sha256").update(binaryBytes).digest("hex");
  const published_at = "2026-05-12T12:00:00.000Z";
  const message = canonicalManifestBytes({ version, binary_hash, published_at });
  const signature = nodeCryptoSign(null, message, privKey).toString("base64");
  return { version, binary_hash, published_at, signature };
}

/** Write a fake binary to a temp file; return its path + bytes. */
function makeTempBinary(content: string): { path: string; bytes: Buffer } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sz-manifest-test-"));
  const p = path.join(dir, "fake-binary.js");
  const bytes = Buffer.from(content, "utf-8");
  writeFileSync(p, bytes);
  return { path: p, bytes };
}

/** Build a fake fetcher that returns a Response-shaped object. */
function makeFetcher(
  responseFactory: () => { ok: boolean; status: number; body: unknown } | Error,
): typeof fetch {
  return (async () => {
    const r = responseFactory();
    if (r instanceof Error) throw r;
    return {
      ok: r.ok,
      status: r.status,
      json: async () => r.body,
      headers: new Headers(),
      text: async () => JSON.stringify(r.body),
    } as unknown as globalThis.Response;
  }) as typeof fetch;
}

describe("manifest-verify / Ed25519 happy path", () => {
  it("accepts a manifest signed by the current pubkey + matching binary hash", async () => {
    const { privKey, pubKeyB64 } = makeKeypair();
    const bin = makeTempBinary("console.log('studio-zero/test-build');");
    const manifest = buildSignedManifest(bin.bytes, "0.1.1-m3", privKey);

    const fetcher = makeFetcher(() => ({
      ok: true,
      status: 200,
      body: manifest,
    }));

    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: [pubKeyB64],
    });

    expect(result.ok).toBe(true);
    if (result.ok === true) {
      expect(result.manifest.version).toBe("0.1.1-m3");
      expect(result.manifest.binary_hash).toBe(manifest.binary_hash);
    }
  });

  it("verifyManifest returns true for a freshly signed manifest", () => {
    const { privKey, pubKeyB64 } = makeKeypair();
    const bin = makeTempBinary("a-binary");
    const manifest = buildSignedManifest(bin.bytes, "0.1.0", privKey);
    expect(verifyManifest(manifest, [pubKeyB64])).toBe(true);
  });
});

describe("manifest-verify / Ed25519 hard-fail (tamper)", () => {
  it("rejects a manifest whose signature was forged with the wrong key", async () => {
    const { privKey: realKey, pubKeyB64: realPubB64 } = makeKeypair();
    const { privKey: forgerKey } = makeKeypair();
    const bin = makeTempBinary("legit-build");
    // Sign with the FORGER's key; verifier accepts only the REAL key.
    const forged = buildSignedManifest(bin.bytes, "0.1.0", forgerKey);
    void realKey;

    const fetcher = makeFetcher(() => ({
      ok: true,
      status: 200,
      body: forged,
    }));

    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: [realPubB64],
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("manifest_signature_invalid");
    }
  });

  it("rejects when the running binary's hash doesn't match the manifest", async () => {
    const { privKey, pubKeyB64 } = makeKeypair();
    const legitBin = makeTempBinary("the-official-build");
    const tamperedBin = makeTempBinary("attacker-injected-bytes");
    // Manifest was signed for the LEGIT binary; we run the TAMPERED one.
    const manifest = buildSignedManifest(legitBin.bytes, "0.1.0", privKey);

    const fetcher = makeFetcher(() => ({
      ok: true,
      status: 200,
      body: manifest,
    }));

    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: tamperedBin.path,
      fetcher,
      acceptedPubkeys: [pubKeyB64],
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("binary_hash_mismatch");
      expect(result.expectedHash).toBe(manifest.binary_hash);
      expect(result.actualHash).not.toBe(manifest.binary_hash);
    }
  });

  it("rejects a manifest with malformed binary_hash (not 64 hex chars)", async () => {
    const { privKey, pubKeyB64 } = makeKeypair();
    const bin = makeTempBinary("build");
    const manifest = buildSignedManifest(bin.bytes, "0.1.0", privKey);
    // Corrupt binary_hash AFTER signing — signature won't match either,
    // but the malformed-shape check runs first.
    const malformed = { ...manifest, binary_hash: "not-hex" };

    const fetcher = makeFetcher(() => ({
      ok: true,
      status: 200,
      body: malformed,
    }));

    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: [pubKeyB64],
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("manifest_malformed");
    }
  });

  it("rejects a manifest missing a required field", async () => {
    const { pubKeyB64 } = makeKeypair();
    const bin = makeTempBinary("build");
    const fetcher = makeFetcher(() => ({
      ok: true,
      status: 200,
      body: { version: "0.1.0", binary_hash: "a".repeat(64) }, // no published_at, no signature
    }));

    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: [pubKeyB64],
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("manifest_malformed");
    }
  });
});

describe("manifest-verify / legacy pubkey grace window", () => {
  it("accepts a manifest signed by a legacy key still in the accepted set", async () => {
    const { privKey: legacyKey, pubKeyB64: legacyPubB64 } = makeKeypair();
    const { pubKeyB64: currentPubB64 } = makeKeypair();
    const bin = makeTempBinary("build");
    // Manifest signed by the LEGACY (rotated-out) key.
    const manifest = buildSignedManifest(bin.bytes, "0.1.0", legacyKey);

    const fetcher = makeFetcher(() => ({
      ok: true,
      status: 200,
      body: manifest,
    }));

    // Verifier accepts current OR legacy.
    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: [currentPubB64, legacyPubB64],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a manifest signed by a fully-rotated-out key (post grace)", async () => {
    const { privKey: oldKey } = makeKeypair();
    const { pubKeyB64: currentPubB64 } = makeKeypair();
    const bin = makeTempBinary("build");
    const manifest = buildSignedManifest(bin.bytes, "0.1.0", oldKey);

    const fetcher = makeFetcher(() => ({
      ok: true,
      status: 200,
      body: manifest,
    }));

    // After grace ends, the old key is gone from the accepted list.
    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: [currentPubB64],
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("manifest_signature_invalid");
    }
  });
});

describe("manifest-verify / soft-fail on network failure", () => {
  it("returns soft_fail when fetch throws", async () => {
    const fetcher = makeFetcher(() => new Error("connect ECONNREFUSED"));
    const bin = makeTempBinary("build");
    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: ["unused"],
    });
    expect(result.ok).toBe("soft_fail");
    if (result.ok === "soft_fail") {
      expect(result.reason).toBe("fetch_failed");
    }
  });

  it("returns soft_fail on a 5xx response", async () => {
    const fetcher = makeFetcher(() => ({ ok: false, status: 503, body: {} }));
    const bin = makeTempBinary("build");
    const result = await verifyAtStartup({
      manifestUrl: "https://test.invalid/cli/manifest.json",
      binaryPath: bin.path,
      fetcher,
      acceptedPubkeys: ["unused"],
    });
    expect(result.ok).toBe("soft_fail");
  });
});

describe("manifest-verify / canonicalization determinism", () => {
  it("canonicalManifestBytes produces identical bytes regardless of input key order", () => {
    const a = canonicalManifestBytes({
      version: "0.1.0",
      binary_hash: "a".repeat(64),
      published_at: "2026-05-12T00:00:00Z",
    });
    const b = canonicalManifestBytes({
      published_at: "2026-05-12T00:00:00Z",
      binary_hash: "a".repeat(64),
      version: "0.1.0",
    } as never);
    expect(a.equals(b)).toBe(true);
  });

  it("canonicalManifestBytes snapshot is stable", () => {
    const bytes = canonicalManifestBytes({
      version: "0.1.0",
      binary_hash: "f".repeat(64),
      published_at: "2026-05-12T00:00:00.000Z",
    });
    // Snapshot the exact string so any canonicalization drift fails
    // loudly (architecture spec §4.2).
    expect(bytes.toString("utf-8")).toBe(
      '{"version":"0.1.0","binary_hash":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","published_at":"2026-05-12T00:00:00.000Z"}',
    );
  });
});

describe("manifest-verify / verifyOwnBinary primitive", () => {
  it("returns valid=true when the binary matches the manifest hash", () => {
    const bin = makeTempBinary("specific-bytes");
    const expectedHash = createHash("sha256").update(bin.bytes).digest("hex");
    const result = verifyOwnBinary(
      {
        version: "0.1.0",
        binary_hash: expectedHash,
        published_at: "2026-05-12T00:00:00Z",
        signature: "",
      },
      bin.path,
    );
    expect(result.valid).toBe(true);
    expect(result.actualHash).toBe(expectedHash);
  });

  it("returns valid=false on hash mismatch + reports both values", () => {
    const bin = makeTempBinary("the-real-bytes");
    const result = verifyOwnBinary(
      {
        version: "0.1.0",
        binary_hash: "b".repeat(64),
        published_at: "2026-05-12T00:00:00Z",
        signature: "",
      },
      bin.path,
    );
    expect(result.valid).toBe(false);
    expect(result.expectedHash).toBe("b".repeat(64));
    expect(result.actualHash).not.toBe("b".repeat(64));
  });
});
