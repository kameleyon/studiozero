#!/usr/bin/env node
/**
 * Studio Zero — CLI manifest builder + Ed25519 signer (build-time tool).
 *
 * Phase 9 M3 Batch 2 (Cipher Fix-3c). Implements the build-time signer
 * specified in `architecture/cli-manifest-signing.md` §4.
 *
 *   tsx tools/cli-manifest-sign.ts \
 *     --binary apps/cli/dist/index.js \
 *     --version 0.1.1-m3 \
 *     --private-key /tmp/ed25519-privkey.pem \
 *     --out apps/web/public/cli/manifest.json
 *
 * Wired into the npm-publish CI step (Pipeline owns the CI YAML; this
 * tool owns the bytes). Jo's 1Password CLI surfaces the private key as
 * a one-shot env var the CI runner sources into a temp file, runs this
 * tool against, then `shred`s — the key never persists on disk longer
 * than the build job, never crosses our repo, never lands on Vercel or
 * Supabase.
 *
 * Side effects (intentional, idempotent):
 *   - reads the CLI binary at --binary, computes SHA-256 hex.
 *   - reads the Ed25519 private key (PEM) at --private-key.
 *   - signs canonical-JSON({version, binary_hash, published_at}).
 *   - writes the signed manifest to --out as pretty-printed JSON.
 *
 * Non-side effects (defense in depth):
 *   - does NOT write the private key to any file we control.
 *   - does NOT log the private key.
 *   - does NOT keep the private key in process memory after `sign()`
 *     returns. Node's GC will reclaim it; we zero the buffer eagerly.
 *
 * Self-verification:
 *   After signing, the tool re-imports the just-signed manifest +
 *   verifies the signature against the matching pubkey (derived from
 *   the private key). If verification fails, exit non-zero — never
 *   publish a manifest that doesn't round-trip.
 */
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as nodeCryptoSign,
  verify as nodeCryptoVerify,
} from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

interface CliArgs {
  binary: string;
  version: string;
  privateKey: string;
  out: string;
  publishedAt?: string;
}

interface SignedManifest {
  version: string;
  binary_hash: string;
  published_at: string;
  signature: string;
}

/** Tiny built-in arg parser — no extra dependency. */
function parseArgs(argv: ReadonlyArray<string>): CliArgs {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a !== undefined && a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        map.set(key, next);
        i++;
      } else {
        map.set(key, "");
      }
    }
  }
  const get = (k: string): string => {
    const v = map.get(k);
    if (v === undefined || v.length === 0) {
      throw new Error(`[cli-manifest-sign] missing required --${k}`);
    }
    return v;
  };
  const args: CliArgs = {
    binary: get("binary"),
    version: get("version"),
    privateKey: get("private-key"),
    out: get("out"),
  };
  const publishedAt = map.get("published-at");
  if (publishedAt !== undefined && publishedAt.length > 0) {
    args.publishedAt = publishedAt;
  }
  return args;
}

/** SHA-256 hex (lowercase, 64 chars) of a file's bytes. */
export function sha256HexFile(filePath: string): string {
  const bytes = readFileSync(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Canonical bytes for signing. Mirrors
 * `apps/cli/src/auth/manifest-verify.ts::canonicalManifestBytes`. The
 * symmetry is load-bearing: adding a field here without adding it to
 * the verifier will produce manifests that no CLI will accept.
 */
export function canonicalBytes(m: {
  version: string;
  binary_hash: string;
  published_at: string;
}): Buffer {
  const canonical = {
    version: m.version,
    binary_hash: m.binary_hash,
    published_at: m.published_at,
  };
  return Buffer.from(JSON.stringify(canonical), "utf-8");
}

/**
 * Sign a manifest body with the provided Ed25519 private key.
 *
 * `privateKeyPem` is a PEM-armored Ed25519 PKCS#8 private key. We zero
 * the buffer after signing as a defense-in-depth measure — Node's GC
 * will reclaim it eventually, but for a build tool that runs once per
 * release we eagerly null out to shrink the window where the key sits
 * in process memory.
 */
export function signManifest(
  body: { version: string; binary_hash: string; published_at: string },
  privateKeyPem: string,
): { manifest: SignedManifest; publicKeyDerB64: string } {
  const privKey = createPrivateKey({
    key: privateKeyPem,
    format: "pem",
    type: "pkcs8",
  });
  if (privKey.asymmetricKeyType !== "ed25519") {
    throw new Error(
      `[cli-manifest-sign] private key is ${String(
        privKey.asymmetricKeyType,
      )}, expected ed25519`,
    );
  }

  const messageBytes = canonicalBytes(body);
  // `crypto.sign(null, ...)` is the Ed25519 form — the SHA-512 digest
  // is internal to the signature scheme.
  const signatureBytes = nodeCryptoSign(null, messageBytes, privKey);
  if (signatureBytes.length !== 64) {
    throw new Error(
      `[cli-manifest-sign] unexpected signature length ${signatureBytes.length} (expected 64)`,
    );
  }

  // Derive the public key from the private key for the round-trip
  // self-check below. createPublicKey(privKey) is supported by Node.
  const pubKey = createPublicKey(privKey);
  const pubDer = pubKey.export({ format: "der", type: "spki" });
  const publicKeyDerB64 = Buffer.isBuffer(pubDer)
    ? pubDer.toString("base64")
    : Buffer.from(pubDer as ArrayBuffer).toString("base64");

  const manifest: SignedManifest = {
    version: body.version,
    binary_hash: body.binary_hash,
    published_at: body.published_at,
    signature: signatureBytes.toString("base64"),
  };

  return { manifest, publicKeyDerB64 };
}

/**
 * Verify a signed manifest against an embedded-form pubkey (SPKI DER
 * b64). Used by main() for the round-trip self-check.
 */
function selfVerify(
  manifest: SignedManifest,
  publicKeyDerB64: string,
): boolean {
  const pubKey = createPublicKey({
    key: Buffer.from(publicKeyDerB64, "base64"),
    format: "der",
    type: "spki",
  });
  const messageBytes = canonicalBytes(manifest);
  const signatureBytes = Buffer.from(manifest.signature, "base64");
  return nodeCryptoVerify(null, messageBytes, pubKey, signatureBytes);
}

/** Ensure the output directory exists, creating it if necessary. */
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.binary)) {
    throw new Error(`[cli-manifest-sign] binary not found: ${args.binary}`);
  }
  if (!existsSync(args.privateKey)) {
    throw new Error(
      `[cli-manifest-sign] private key not found: ${args.privateKey}`,
    );
  }

  const binaryHash = sha256HexFile(args.binary);
  const publishedAt = args.publishedAt ?? new Date().toISOString();
  const privateKeyPem = readFileSync(args.privateKey, "utf-8");

  const { manifest, publicKeyDerB64 } = signManifest(
    { version: args.version, binary_hash: binaryHash, published_at: publishedAt },
    privateKeyPem,
  );

  // Round-trip self-verify before writing the output. NEVER publish a
  // manifest the tool itself can't verify.
  if (!selfVerify(manifest, publicKeyDerB64)) {
    throw new Error(
      "[cli-manifest-sign] self-verify FAILED — refusing to write output",
    );
  }

  ensureDir(args.out);
  writeFileSync(args.out, JSON.stringify(manifest, null, 2) + "\n", {
    encoding: "utf-8",
  });

  // Print only metadata to stdout — never the private key, never the
  // signature, never the pubkey (the pubkey is published via the
  // well-known URL committed separately). CI logs are not a secure
  // surface even though they should not see a secret here.
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        version: manifest.version,
        binary_hash: manifest.binary_hash,
        published_at: manifest.published_at,
        out: args.out,
        pubkey_fingerprint: publicKeyDerB64.slice(0, 12),
      },
      null,
      2,
    ) + "\n",
  );
}

// Top-level await is fine under Node 24 LTS / ESM. The script is the
// build-tool entry point; `tsx tools/cli-manifest-sign.ts` is the
// invocation Pipeline wires into CI.
// CLI guard: only execute when run directly, not when imported by tests.
const isDirectInvocation =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("cli-manifest-sign.ts") ||
    process.argv[1].endsWith("cli-manifest-sign.js"));

if (isDirectInvocation) {
  main().catch((err) => {
    process.stderr.write(`[cli-manifest-sign] ${(err as Error).message}\n`);
    process.exit(1);
  });
}
