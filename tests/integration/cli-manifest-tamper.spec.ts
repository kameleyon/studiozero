/**
 * Studio Zero — CLI manifest tamper detection (server-side integration).
 *
 * Phase 9 M3 Batch 2 (Cipher Fix-3c). Verifies the server-side path
 * described in `architecture/cli-manifest-signing.md` §6.3:
 *
 *   When a CLI POSTs a verdict with a binary_hash that does NOT match
 *   the manifest's allowed hash for its claimed version, the verdict
 *   route MUST:
 *     1. refuse the verdict (return 400-class);
 *     2. write a `cli_tamper_detected` row to audit_logs;
 *     3. mark the cli_pairings row's tamper_detected_at (when 0008 lands);
 *     4. (separate spec) emit a Sentry warning.
 *
 * Test posture: we exercise `verifyCliClaim` + `recordTamperEvent` from
 * `apps/web/lib/cli-manifest-verifier.ts` against a mock Supabase service
 * client. This keeps the spec hermetic — no real Supabase, no real
 * crypto material outside the test process — while exercising the same
 * code paths the verdict-route handler does.
 *
 * Cross-refs:
 *   - apps/web/lib/cli-manifest-verifier.ts (system under test)
 *   - architecture/cli-manifest-signing.md §6.3 (contract)
 *   - apps/cli/tests/manifest-verify.test.ts (CLI-side sibling)
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  createHash,
  generateKeyPairSync,
  sign as nodeCryptoSign,
} from "node:crypto";

// `apps/web/lib/cli-manifest-verifier.ts` imports `supabase-service`
// which imports `server-only` to enforce the runtime boundary. In the
// Node test process we no-op the guard — the actual service-role
// client is never constructed because every test injects a mock
// `supabase` opt. Mirrors the pattern from stripe-webhook-handler.spec.ts.
vi.mock("server-only", () => ({}));

import {
  verifyManifestSignature,
  verifyCliClaim,
  recordTamperEvent,
  type CliManifest,
} from "../../apps/web/lib/cli-manifest-verifier.js";

/** Canonical bytes (must mirror the lib/CLI canonicalization). */
function canonicalBytes(m: Omit<CliManifest, "signature">): Buffer {
  return Buffer.from(
    JSON.stringify({
      version: m.version,
      binary_hash: m.binary_hash,
      published_at: m.published_at,
    }),
    "utf-8",
  );
}

/** Build a signed manifest mirroring `tools/cli-manifest-sign.ts`. */
function buildManifest(
  privKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
  body: Omit<CliManifest, "signature">,
): CliManifest {
  const signature = nodeCryptoSign(null, canonicalBytes(body), privKey).toString(
    "base64",
  );
  return { ...body, signature };
}

/**
 * Hand-rolled mock supabase service client. Implements only the
 * surface `cli-manifest-verifier.ts` calls:
 *   - from('runtime_config').select('value').eq('key', ...).maybeSingle()
 *   - from('cli_pairings').update(...).eq('id', ...)
 *   - from('audit_logs').insert(...)
 *
 * Records all writes so tests can assert against them.
 */
function makeMockSupabase(
  initialConfig: Record<string, unknown> = {},
): {
  client: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: { value: unknown } | null; error: null | Error }>;
        };
        like: (col: string, pattern: string) => {
          order: () => { limit: () => { maybeSingle: () => Promise<{ data: unknown; error: null | Error }> } };
        };
      };
      update: (patch: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ data: unknown; error: null | Error }>;
      };
      insert: (row: Record<string, unknown>) => Promise<{ data: unknown; error: null | Error }>;
    };
  };
  state: {
    config: Record<string, unknown>;
    auditLogInserts: Array<Record<string, unknown>>;
    cliPairingsUpdates: Array<{ id: string; patch: Record<string, unknown> }>;
    cliPairingsUpdateShouldThrow: boolean;
  };
} {
  const state = {
    config: { ...initialConfig },
    auditLogInserts: [] as Array<Record<string, unknown>>,
    cliPairingsUpdates: [] as Array<{ id: string; patch: Record<string, unknown> }>,
    cliPairingsUpdateShouldThrow: false,
  };

  const client = {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, val: string) {
              return {
                async maybeSingle() {
                  if (table === "runtime_config") {
                    const value = state.config[val];
                    if (value === undefined) return { data: null, error: null };
                    return { data: { value }, error: null };
                  }
                  return { data: null, error: null };
                },
              };
            },
            like(_col: string, _pattern: string) {
              return {
                order() {
                  return {
                    limit() {
                      return {
                        async maybeSingle() {
                          return { data: null, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            async eq(_col: string, val: string) {
              if (table === "cli_pairings") {
                if (state.cliPairingsUpdateShouldThrow) {
                  throw new Error("column tamper_detected_at does not exist");
                }
                state.cliPairingsUpdates.push({ id: val, patch });
              }
              return { data: null, error: null };
            },
          };
        },
        async insert(row: Record<string, unknown>) {
          if (table === "audit_logs") {
            state.auditLogInserts.push(row);
          }
          return { data: null, error: null };
        },
      };
    },
  };

  // Mock type assertion — the surface we mock is the strict subset of the
  // real client that cli-manifest-verifier.ts calls.
  return { client: client as never, state };
}

describe("cli-manifest-verifier / signature verify primitive", () => {
  it("verifies a signed manifest against the matching pubkey", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const pubB64 = (
      publicKey.export({ format: "der", type: "spki" }) as Buffer
    ).toString("base64");
    const m = buildManifest(privateKey, {
      version: "0.1.0",
      binary_hash: "a".repeat(64),
      published_at: "2026-05-12T00:00:00Z",
    });
    expect(verifyManifestSignature(m, [pubB64])).toBe(true);
  });

  it("rejects a manifest signed by a non-accepted key", () => {
    const { privateKey: forgerKey } = generateKeyPairSync("ed25519");
    const { publicKey: realPub } = generateKeyPairSync("ed25519");
    const realPubB64 = (
      realPub.export({ format: "der", type: "spki" }) as Buffer
    ).toString("base64");
    const m = buildManifest(forgerKey, {
      version: "0.1.0",
      binary_hash: "a".repeat(64),
      published_at: "2026-05-12T00:00:00Z",
    });
    expect(verifyManifestSignature(m, [realPubB64])).toBe(false);
  });

  it("rejects a manifest with a wrong-length signature", () => {
    const m: CliManifest = {
      version: "0.1.0",
      binary_hash: "a".repeat(64),
      published_at: "2026-05-12T00:00:00Z",
      signature: Buffer.from("too-short").toString("base64"),
    };
    expect(verifyManifestSignature(m, ["unused"])).toBe(false);
  });
});

describe("cli-manifest-verifier / verifyCliClaim orchestrator", () => {
  it("returns ok=true when the CLI's reported hash matches the signed manifest", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const pubB64 = (
      publicKey.export({ format: "der", type: "spki" }) as Buffer
    ).toString("base64");
    const reportedHash = "c".repeat(64);
    const manifest = buildManifest(privateKey, {
      version: "0.1.5",
      binary_hash: reportedHash,
      published_at: "2026-05-12T00:00:00Z",
    });
    const supa = makeMockSupabase({
      "cli_manifest_v0.1.5": manifest,
      cli_manifest_accepted_pubkeys: [pubB64],
    });

    const result = await verifyCliClaim("0.1.5", reportedHash, {
      supabase: supa.client as never,
    });
    expect(result.ok).toBe(true);
  });

  it("returns reason=no_manifest_for_version when no row exists", async () => {
    const supa = makeMockSupabase({ cli_manifest_accepted_pubkeys: [] });
    const result = await verifyCliClaim("0.0.0-doesnotexist", "a".repeat(64), {
      supabase: supa.client as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("no_manifest_for_version");
    }
  });

  it("returns reason=manifest_signature_invalid when stored manifest's sig is broken", async () => {
    const { privateKey: forgerKey } = generateKeyPairSync("ed25519");
    const { publicKey: realPub } = generateKeyPairSync("ed25519");
    const realPubB64 = (
      realPub.export({ format: "der", type: "spki" }) as Buffer
    ).toString("base64");
    // Manifest signed by the wrong key (compromised vault scenario):
    const manifest = buildManifest(forgerKey, {
      version: "0.1.0",
      binary_hash: "d".repeat(64),
      published_at: "2026-05-12T00:00:00Z",
    });
    const supa = makeMockSupabase({
      "cli_manifest_v0.1.0": manifest,
      cli_manifest_accepted_pubkeys: [realPubB64],
    });

    const result = await verifyCliClaim("0.1.0", "d".repeat(64), {
      supabase: supa.client as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("manifest_signature_invalid");
    }
  });

  it("returns reason=binary_hash_mismatch when CLI claims a different hash", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const pubB64 = (
      publicKey.export({ format: "der", type: "spki" }) as Buffer
    ).toString("base64");
    const officialHash = "e".repeat(64);
    const manifest = buildManifest(privateKey, {
      version: "0.1.0",
      binary_hash: officialHash,
      published_at: "2026-05-12T00:00:00Z",
    });
    const supa = makeMockSupabase({
      "cli_manifest_v0.1.0": manifest,
      cli_manifest_accepted_pubkeys: [pubB64],
    });

    const tamperedHash = "f".repeat(64);
    const result = await verifyCliClaim("0.1.0", tamperedHash, {
      supabase: supa.client as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("binary_hash_mismatch");
      expect(result.reportedHash).toBe(tamperedHash);
      expect(result.expectedHash).toBe(officialHash);
    }
  });
});

describe("cli-manifest-verifier / recordTamperEvent side-effects", () => {
  let supa: ReturnType<typeof makeMockSupabase>;
  beforeEach(() => {
    supa = makeMockSupabase({});
  });

  it("writes one audit_logs row with action='cli_tamper_detected'", async () => {
    await recordTamperEvent(
      {
        cliPairingId: "pairing-123",
        cliVersion: "0.1.0",
        reportedHash: "f".repeat(64),
        expectedHash: "e".repeat(64),
        reason: "binary_hash_mismatch",
        manifestSignatureValid: true,
      },
      { supabase: supa.client as never },
    );

    expect(supa.state.auditLogInserts).toHaveLength(1);
    const row = supa.state.auditLogInserts[0];
    expect(row).toMatchObject({
      action: "cli_tamper_detected",
      target: "pairing-123",
    });
    const metadata = (row as { metadata: Record<string, unknown> }).metadata;
    expect(metadata).toMatchObject({
      cli_version: "0.1.0",
      reported_hash: "f".repeat(64),
      expected_hash: "e".repeat(64),
      reason: "binary_hash_mismatch",
      manifest_signature_valid: true,
    });
  });

  it("updates cli_pairings.tamper_detected_at to a fresh ISO timestamp", async () => {
    const beforeTs = Date.now();
    await recordTamperEvent(
      {
        cliPairingId: "pairing-abc",
        cliVersion: "0.1.0",
        reportedHash: "f".repeat(64),
        expectedHash: "e".repeat(64),
        reason: "binary_hash_mismatch",
        manifestSignatureValid: true,
      },
      { supabase: supa.client as never },
    );

    expect(supa.state.cliPairingsUpdates).toHaveLength(1);
    const update = supa.state.cliPairingsUpdates[0];
    expect(update?.id).toBe("pairing-abc");
    const patch = update?.patch ?? {};
    const ts = patch["tamper_detected_at"];
    expect(typeof ts).toBe("string");
    const parsed = new Date(String(ts)).getTime();
    expect(parsed).toBeGreaterThanOrEqual(beforeTs);
  });

  it("survives the cli_pairings UPDATE failing (pre-migration-0008 path)", async () => {
    // Simulate the pre-0008 schema where the column doesn't exist.
    supa.state.cliPairingsUpdateShouldThrow = true;

    // Should NOT throw — audit_logs is the source of truth either way.
    await expect(
      recordTamperEvent(
        {
          cliPairingId: "pairing-xyz",
          cliVersion: "0.1.0",
          reportedHash: "f".repeat(64),
          expectedHash: "e".repeat(64),
          reason: "binary_hash_mismatch",
          manifestSignatureValid: true,
        },
        { supabase: supa.client as never },
      ),
    ).resolves.toBeUndefined();

    // audit_logs still written.
    expect(supa.state.auditLogInserts).toHaveLength(1);
  });
});

describe("cli-manifest-verifier / end-to-end tamper flow", () => {
  it("a forged hash from a customer CLI fails verifyCliClaim AND records a tamper row", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const pubB64 = (
      publicKey.export({ format: "der", type: "spki" }) as Buffer
    ).toString("base64");
    const officialBinaryBytes = Buffer.from("official-build-bytes");
    const officialHash = createHash("sha256")
      .update(officialBinaryBytes)
      .digest("hex");
    const manifest = buildManifest(privateKey, {
      version: "0.1.0",
      binary_hash: officialHash,
      published_at: "2026-05-12T00:00:00Z",
    });
    const supa = makeMockSupabase({
      "cli_manifest_v0.1.0": manifest,
      cli_manifest_accepted_pubkeys: [pubB64],
    });

    // Attacker CLI claims a different binary_hash (representing a
    // modified build that somehow passed the CLI's own startup check —
    // e.g., the attacker patched out the verify call and recompiled).
    const attackerClaimedHash = createHash("sha256")
      .update("attacker-modified-bytes")
      .digest("hex");

    const verdict = await verifyCliClaim("0.1.0", attackerClaimedHash, {
      supabase: supa.client as never,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok === false && verdict.reason === "binary_hash_mismatch") {
      await recordTamperEvent(
        {
          cliPairingId: "pairing-attack",
          cliVersion: "0.1.0",
          reportedHash: attackerClaimedHash,
          expectedHash: officialHash,
          reason: verdict.reason,
          manifestSignatureValid: true,
        },
        { supabase: supa.client as never },
      );
    }

    // Audit trail recorded.
    expect(supa.state.auditLogInserts).toHaveLength(1);
    expect(supa.state.cliPairingsUpdates).toHaveLength(1);
  });
});
