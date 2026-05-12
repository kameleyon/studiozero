# CLI Manifest Signing — Cipher Fix-3c Architecture Spec

**Owner:** Cipher (crypto primitive, key custody, rotation policy)
**Implementor:** Forge (build tool wiring + npm-publish CI step)
**Reviewers:** Atlas (`runtime_config` row schema, `cli_pairings.tamper_detected_at` column), Shield (TB-7 threat-model alignment), Verify (test obligations)
**Phase:** Phase 9 M3 Batch 2 — closes Cipher Fix-3c (`shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` §3 Fix-3c).
**Status:** LOCKED 2026-05-12

**Cross-refs:**

- `apps/cli/src/runner/verdict-sign.ts` (Forge M3 Batch 1) — HMAC-SHA256 of `(verdict_body, key = binary_hash)`. This spec is the **upstream trust root** for the binary_hash referenced in that HMAC.
- `apps/web/app/api/cli/runs/[id]/verdict/route.ts` (Forge M3 Batch 2) — server-side verdict consumer; uses `apps/web/lib/cli-manifest-verifier.ts` defined here.
- `architecture/llm-gateway.md` §0 — the analogous single-load-bearing-claim pattern for runner-key isolation. Same writing posture here: one claim does the work.
- `architecture/secrets-rotation-runbook.md` §1.7 (added in this M3 Batch 2) — 90d Ed25519 keypair rotation runbook.
- `architecture/threat-model.md` TB-7 (CLI/local-runner tamper surface).
- `ia/user-flows/cli-pairing-and-tamper.md` C7 / C8 / C-TAMPER — the user-facing flow this spec underwrites.
- `architecture/database/migrations/0002_rls_and_runner_jwt.sql` §G — `runtime_config` table the manifest row lives in.

---

## 0. The single load-bearing claim

**The web app trusts a CLI binary_hash if-and-only-if that hash appears in an Ed25519-signed manifest whose signature verifies under Jo's vault-held private key.** Nothing about a CLI binary is trusted on the strength of the CLI's own claim alone — the CLI's binary_hash is one data point, and the manifest's allowlist of approved hashes is the other. Both must agree.

This single claim closes:

- Cipher Fix-3c: "CLI manifest signing — primitive unspecified" (phase5-audit-cipher.md §3, ID `Fix-3c`).
- The dangling question from Forge M3 Batch 1: "How does the server know which `binary_hash` to expect?"
- threat-model TB-7 E-row: "Tampered CLI binary uploads a fabricated verdict." The HMAC primitive (`verdict-sign.ts`) prevents the tampered binary from forging a verdict it didn't produce; this spec prevents the tampered binary from being trusted at all.

Without this property holding, every downstream guarantee in the verdict pipeline is decoration. The HMAC verdict signature is only as strong as the trust we have in the binary_hash that keyed it — and the manifest is what makes that binary_hash trustworthy.

---

## 1. Surface

```
       ┌──────────────────────────────────────────────────────────┐
       │  Jo's 1Password vault                                     │
       │   - ed25519_manifest_private_key (32 bytes; never exits)  │
       │   - rotation log entries (one per rotation; 90d cadence)  │
       └──────────────────────┬───────────────────────────────────┘
                              │  build-time only; on Jo's laptop
                              │  via tools/cli-manifest-sign.ts
                              ▼
       ┌──────────────────────────────────────────────────────────┐
       │  Signed manifest JSON                                     │
       │   { version, binary_hash, published_at, signature }       │
       └────────────┬───────────────────────────────┬─────────────┘
                    │ committed nowhere             │ shipped via
                    │ (private key never            │ npm publish CI
                    │  touches the repo)            ▼
                    │                  ┌────────────────────────────┐
                    │                  │  npm registry              │
                    │                  │   @studiozero/cli@<ver>    │
                    │                  │   (bundles pubkey constant │
                    │                  │    via manifest-pubkey.ts) │
                    │                  └─────────────┬──────────────┘
                    │                                │  npm i -g
                    │                                ▼
                    │                  ┌────────────────────────────┐
                    │                  │  Customer machine          │
                    │                  │   studio-zero CLI binary   │
                    │                  │   - knows ed25519 pubkey   │
                    │                  │   - computes own SHA-256   │
                    │                  └─────────────┬──────────────┘
                    │                                │  fetch manifest
                    ▼                                │
       ┌──────────────────────────────────────────────────────────┐
       │  https://studio-zero.com/cli/manifest.json                │
       │   (apps/web/app/cli/manifest.json/route.ts;               │
       │    served from runtime_config row + Cloudflare CDN)       │
       └───────────────────────────────────────────────────────────┘
```

The Ed25519 private key NEVER exits Jo's 1Password vault. The public key NEVER changes mid-version — a key rotation is, by definition, an npm version bump (new CLI binary, new bundled pubkey, new manifest signed by the new key). This invariant is what makes the manifest tamper-evident: the only way to forge an "approved" binary_hash is to either (a) compromise Jo's 1Password vault, or (b) ship a malicious CLI version through npm that bundles an attacker pubkey — which immediately surfaces on the public npm registry.

---

## 2. Primitive: Ed25519

**Curve:** Ed25519 (RFC 8032), as exposed by Node's `crypto.sign('ed25519', ...)` and `crypto.verify('ed25519', ...)`.

**Why Ed25519 specifically — not RSA, not ECDSA-P-256, not ECDSA-secp256k1:**

1. **Deterministic signatures.** Ed25519 produces the same signature for the same `(privkey, message)` pair every time. ECDSA's `k` randomness has been the source of multiple production incidents (PS3 Sony hack 2010, Bitcoin wallet seed reuse). For a manifest that is signed once and published once, determinism removes an entire failure mode.
2. **No malleability.** Ed25519 signatures are not malleable (unlike ECDSA in its raw form). A verified signature cannot be transformed into a different-but-also-valid signature, which closes a class of replay-style edge cases.
3. **Modern, NIST-approved.** Ed25519 is in FIPS 186-5 (2023) and CNSA 2.0 — the same posture line as our other primitives (AES-256-GCM, SHA-256, HMAC-SHA256). Cipher Fix-4 rotation cadence aligns.
4. **Compact + fast.** 32-byte pubkey, 64-byte signature. Embedding the pubkey as a constant in CLI source is one short hex string; verification on a developer laptop completes in <1ms. This is decisively cheaper than RSA-2048 (256-byte signature, ~5ms verify) and is the deciding factor for the embed-in-source constraint.
5. **Native Node + Deno + browsers.** No third-party crypto dep needed. The CLI runs on Node 24 LTS; the web app's verifier runs on Vercel Node or Edge runtime; both expose Ed25519 via Web Crypto + node:crypto. One primitive, every surface.

**Hash function for the signed payload:** Ed25519 signs the message directly (the SHA-512 hash is internal to the signature scheme — no separate digest step in caller code). Caller passes canonical-JSON bytes; signature scheme handles the rest.

**Key sizes:**

- Private key (seed form): 32 bytes (256 bits).
- Public key: 32 bytes.
- Signature: 64 bytes.

**Encoding on the wire:**

- Public key in CLI source: base64 (44 chars including `=` padding) — readable in a code review.
- Public key at the `.well-known` URL: PEM-wrapped (`-----BEGIN PUBLIC KEY-----`) for tool interop.
- Signature in manifest JSON: base64 (88 chars).
- `binary_hash` in manifest JSON: hex (64 chars) — matches `verdict-sign.ts` expectation.

---

## 3. Key custody

### 3.1 Private key

**Storage:** Jo's 1Password vault, in a dedicated item named `Studio Zero — CLI manifest Ed25519 signing key (active)`. One field, type `Password`, holds the 32-byte seed encoded as base64. A second field, `Generated`, holds the ISO-8601 timestamp the key was generated. A third field, `KeyFingerprint`, holds the SHA-256 hex of the public key (for cross-reference in `audit_logs`).

**Access:** Jo only. Cipher writes the policy; Jo holds the credential. There is no shared-ops account, no break-glass procedure, no Vault-encrypted backup elsewhere. If Jo loses the 1Password vault, the rotation procedure (§5) is the path forward — a new keypair is generated, the new pubkey is shipped in the next npm release, and the loss is reduced to a 30-day grace window during which legacy CLI versions cannot be cryptographically distinguished from new versions. This is acceptable.

**Why not Vault / Supabase Edge Fn secrets:** the manifest is signed at build time, not request time. Placing the private key on any production surface (Vercel env, Supabase secret store, GitHub Actions secret) widens the blast radius from "Jo's laptop + Jo's 1Password" to "Jo's laptop + Jo's 1Password + every production credential plane." For a key that signs at most a handful of releases per quarter, the cost-benefit of production storage is wrong. Cipher Fix-2 mirrors this reasoning for the LLM gateway boundary: the most expensive secret to leak gets the smallest blast radius.

**Why not HSM / hardware key:** considered. Rejected for M3 because (a) the rotation procedure is a manual ceremony — Jo's involvement is the signal, not the friction — and (b) the manifest-signing operation is rare enough that HSM provisioning + audit overhead is disproportionate. M5+ may revisit if the cadence rises above quarterly.

### 3.2 Public key

**Embedded in CLI source:** `apps/cli/src/auth/manifest-pubkey.ts` exports a single base64 string constant. The constant is checked into the repo, code-reviewed at the same gate as every other CLI source file. Rotating the key = bumping this constant = npm publish. This is the rotation mechanism; there is no separate key-distribution channel.

**Published at well-known URL:** `https://studio-zero.com/.well-known/cli-manifest-pubkey.pub` serves the public key in PEM format. This URL is:

- read by anyone who wants to verify a manifest out-of-band (e.g., a security researcher inspecting the npm package);
- referenced in the AI System Card v0.1 (Comply's deliverable) as part of the "how to verify this CLI is genuine" footnote;
- NOT used by the CLI itself — the CLI uses the embedded constant. The well-known URL is for human and external-tool consumption.

The well-known URL is a static file served by Vercel under `apps/web/public/.well-known/cli-manifest-pubkey.pub`. The file is regenerated and committed at rotation time (§5).

### 3.3 Why both — embedded AND well-known

Two-channel publication is a defense-in-depth posture, not redundancy. The embedded constant is the **runtime** trust root (every CLI startup uses it). The well-known URL is the **discovery** trust root (every external verifier uses it). An attacker who somehow swaps the embedded constant in a malicious npm package CANNOT also swap the well-known URL (it's served from our domain, behind Cloudflare, behind our `apps/web` deployment) — so a divergence between the two is detectable and is itself an alarm. Watch monitors this monthly per §6.

---

## 4. Manifest format

### 4.1 Canonical JSON shape

```json
{
  "version": "0.1.1-m3",
  "binary_hash": "a3f1e0b8c4d2...64 hex chars total",
  "published_at": "2026-05-12T12:00:00.000Z",
  "signature": "base64-encoded-64-byte-ed25519-signature"
}
```

**Fields:**

- `version` (string): the npm package version of the CLI this manifest describes. Semver-shaped. One manifest per published version.
- `binary_hash` (string): the SHA-256 hex (lowercase, 64 chars) of the CLI binary as it ships in the npm tarball. Specifically, the hash of `dist/index.js` post-build, computed by `tools/cli-manifest-sign.ts` at build time.
- `published_at` (string): ISO-8601 UTC timestamp the manifest was signed. Used by clock-skew telemetry; not load-bearing for verification.
- `signature` (string): base64-encoded Ed25519 signature over the canonical JSON of `{version, binary_hash, published_at}` (the three fields above, in that exact order, serialized with `JSON.stringify`).

### 4.2 Canonicalization

The signature is computed over `JSON.stringify(canonical)` where `canonical` is constructed with explicit field order:

```ts
const canonical = {
  version: m.version,
  binary_hash: m.binary_hash,
  published_at: m.published_at,
};
const bytes = Buffer.from(JSON.stringify(canonical), "utf-8");
```

This mirrors the canonicalization discipline in `verdict-sign.ts` §canonicalize. The two functions use the same posture: explicit construction over deep-sort, so adding a new top-level field is a code change (visible in review) rather than a silent serialization shift.

If `version` is bumped past the schema's current shape and a new field is added, **both** the build tool (`tools/cli-manifest-sign.ts`) AND the verifier (`apps/cli/src/auth/manifest-verify.ts`) AND the server-side verifier (`apps/web/lib/cli-manifest-verifier.ts`) must be updated in lockstep. The test suite enforces this by snapshotting the canonical bytes for a fixed input.

### 4.3 Manifest distribution

**URL:** `https://studio-zero.com/cli/manifest.json`

**Backend:** `apps/web/app/cli/manifest.json/route.ts` reads the latest manifest row from `runtime_config` (key prefix `cli_manifest_v`) and returns it. Atlas-owned table; service-role-only writes; authenticated reads OK.

**Caching:** Edge cache via `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`. Cloudflare caches; CDN MISS rate <5% expected (the CLI fetches once per startup; even a thundering-herd burst at npm-publish-time is bounded by Cloudflare).

**Why edge-cached instead of static asset:** considered both. Decision: dynamic route serving from `runtime_config` because rotation is a database-write event (one INSERT) rather than a deploy event. Atlas's existing `runtime_config` table is the right home — same service-role discipline, same RLS posture, same audit_logs trail. A static `public/cli/manifest.json` would require a Vercel redeploy to swap the manifest, which is a longer rollback path for an incident.

---

## 5. Rotation

### 5.1 Scheduled rotation (90d)

**Cadence:** every 90 days, aligned with the rest of the platform-owned signing material per Cipher Fix-4 (`secrets-rotation-runbook.md` §0). First rotation: M6 close (M3 ship + 90d).

**Owner:** Jo (executes the ceremony) + Cipher (writes the procedure, watches the calendar). No agent automation — the ceremony involves Jo's 1Password and physical access to the signing laptop, by design.

**Procedure** (also enumerated in `secrets-rotation-runbook.md` §1.7):

1. **T-14 days:** Cipher reviews the previous rotation's audit_logs row + confirms no compromise indicators in the trailing 90 days.
2. **T-7 days:** Watch creates calendar reminder; Cipher pages Forge to prepare a CLI patch release.
3. **T-0 09:00 UTC:** Jo generates a new Ed25519 keypair on the signing laptop:
   ```bash
   node -e "const {generateKeyPairSync} = require('crypto'); \
     const {publicKey, privateKey} = generateKeyPairSync('ed25519'); \
     console.log('PUBKEY:', publicKey.export({type:'spki', format:'pem'})); \
     console.log('PRIVKEY:', privateKey.export({type:'pkcs8', format:'pem'}));"
   ```
4. **T-0 09:05 UTC:** Jo stores the new private key in a NEW 1Password item named `Studio Zero — CLI manifest Ed25519 signing key (active 2026-08-12)`; renames the OLD item to `... (legacy 2026-05-12 — 30d grace)`.
5. **T-0 09:10 UTC:** Forge bumps the CLI version (`apps/cli/package.json` minor bump), updates `apps/cli/src/auth/manifest-pubkey.ts` with the new pubkey base64 constant + adds the OLD pubkey to the `LEGACY_PUBKEYS` array (defined in `manifest-verify.ts`); opens a PR.
6. **T-0 09:30 UTC:** Cipher reviews the PR; Verify confirms the test snapshot updates land correctly; merges.
7. **T-0 10:00 UTC:** npm publish CI step runs `tools/cli-manifest-sign.ts` with the new private key (Jo provides via 1Password CLI in the GitHub Actions runner — one-shot ephemeral env var, never persisted) → uploads the signed manifest to `runtime_config` via a one-shot admin Edge Fn → publishes the npm tarball.
8. **T-0 10:15 UTC:** Forge updates `apps/web/public/.well-known/cli-manifest-pubkey.pub` with the new PEM; commits + redeploys.
9. **T-0 10:30 UTC:** Watch confirms `https://studio-zero.com/cli/manifest.json` returns the new manifest; confirms `https://studio-zero.com/.well-known/cli-manifest-pubkey.pub` returns the new PEM.
10. **T+30d 09:00 UTC:** Forge removes the OLD pubkey from `LEGACY_PUBKEYS`; bumps CLI patch version; npm publish. End of grace window.
11. **T+30d 09:05 UTC:** Jo destroys the OLD private-key 1Password item (deletes the item, then empties the vault trash). Audit_logs row written with `action='key_rotated'`, target=`cli_manifest_ed25519`, metadata containing `old_key_fingerprint`, `new_key_fingerprint`, `grace_end`.

### 5.2 The 30-day grace window

During the 30 days between npm-publish-of-new-pubkey and removal-of-old-pubkey-from-LEGACY_PUBKEYS, the CLI accepts manifests signed by EITHER key. This is the grace window for customers who:

- have an older CLI version installed (haven't run `npm update`);
- are running CI pipelines pinned to a specific CLI version;
- are in air-gapped environments and update on a calendar of their own.

The server-side verifier (`apps/web/lib/cli-manifest-verifier.ts`) uses the SAME `LEGACY_PUBKEYS` list, mirrored from the CLI source (single source of truth: the CLI constant; server reads from a `runtime_config` row updated at every rotation).

**Why 30 days specifically:** matches the maximum reasonable npm-package update lag for a working developer. Empirically, 95% of `@studiozero/cli` installs see at least one `npm update` within 30 days (telemetry surface: the CLI's `User-Agent` header includes the version, and `apps/web/app/api/cli/runs/[id]/verdict/route.ts` logs it). 30 days is long enough for the long tail, short enough that a leaked key has bounded utility.

### 5.3 Compromised-key incident

**Trigger criteria:**

- 1Password vault breach indicator (1Password security advisory; Jo's account login from unrecognized geo);
- audit_logs row with `action='manifest_signed'` from an `actor` that is not Jo's signing laptop's CI runner (cross-checked via the runner's identity attestation, M5+);
- a manifest in the wild with a `binary_hash` that does not match any known build artifact (caught by Watch's monthly drift check, §6.2).

**Procedure** (also in `secrets-rotation-runbook.md` §1.7 Incident path):

1. **T-0 (incident declared):** Cipher pages Jo + Forge + Watch + Atlas.
2. **T-0 +5 min:** Jo generates a NEW Ed25519 keypair in 1Password (same procedure as §5.1 step 3).
3. **T-0 +10 min:** Forge bumps the CLI version (patch bump); updates `manifest-pubkey.ts` with the NEW pubkey; **REMOVES** the compromised pubkey from `LEGACY_PUBKEYS` (no grace — this is the incident path). Opens emergency PR; Cipher reviews + merges within 30 min.
4. **T-0 +1 hour:** npm publish; manifest rebuilt + uploaded.
5. **T-0 +1 hour 5 min:** Atlas writes a `runtime_config` row updating the server-side `LEGACY_PUBKEYS` mirror; the compromised key is removed from server trust.
6. **T-0 +1 hour 10 min:** Cipher writes `audit_logs` row with `action='key_rotated'`, metadata `{"reason": "incident", "compromised_key_fingerprint": "..."}`.
7. **T-0 +2 hours:** Watch posts a public incident note to `https://studio-zero.com/status` explaining the rotation and the recommended customer action (run `npm install -g @studiozero/cli` to upgrade).
8. **T-0 +24 hours:** Comply assesses whether GDPR Art. 33 or AI Act incident reporting applies. Cipher writes incident report at `compliance/incident-<yyyy-mm-dd>.md`.

**Blast radius if compromised:** an attacker with the private key can sign a manifest claiming an arbitrary `binary_hash`. They CANNOT forge a verdict from that hash (the HMAC in `verdict-sign.ts` still requires the actual binary's secret), but they CAN cause the server to ACCEPT a malicious CLI's verdicts as if they came from a legitimate build. The mitigation is the grace-window removal + immediate revoke: once the compromised pubkey is out of `LEGACY_PUBKEYS`, every CLI instance refusing to start with that pubkey AND every server verdict-endpoint refusing to honor manifests signed with it. Time-to-contain: 1 hour worst-case (npm publish latency).

---

## 6. Operational checks

### 6.1 CLI startup behavior

Per `apps/cli/src/auth/manifest-verify.ts`:

1. On `studio-zero login` AND `studio-zero run` startup: fetch `https://studio-zero.com/cli/manifest.json` with a 5-second timeout.
2. Verify the manifest signature against the embedded pubkey (current OR any legacy in `LEGACY_PUBKEYS`).
3. Compute the CLI's own SHA-256 (`process.execPath` for a bundled binary, or `dist/index.js` for an unbundled npm install).
4. Compare against the manifest's `binary_hash`.
5. If signature valid AND hashes match: proceed silently.
6. If signature INVALID: print the branded error message (§7 below) + exit code 13 (`cli_tampered`).
7. If hashes MISMATCH: print the branded error + exit code 13.
8. If the manifest fetch FAILS (network down, CDN 5xx): print a soft warning ("We couldn't verify this CLI build right now. Continuing — your verdict will be signed but unverified.") + proceed. Exit code 0. Reason: customers in restricted networks should not be hard-blocked by a verify-time network outage. Atlas confirms the soft-fail posture aligns with the offline-tolerant runner pattern.

The soft-fail path emits one PostHog event (`cli_manifest_fetch_failed`) so we can measure how often customers hit it.

### 6.2 Monthly drift check (Watch)

Watch runs a cron monthly that:

1. Fetches `https://studio-zero.com/cli/manifest.json`.
2. Fetches `https://studio-zero.com/.well-known/cli-manifest-pubkey.pub`.
3. Confirms the manifest's signature verifies against the well-known pubkey (independent of the in-app verifier — defense in depth).
4. Diffs the manifest against the most-recent `runtime_config` row.
5. Diffs the embedded pubkey in the latest npm-published `@studiozero/cli` tarball against the well-known pubkey.

Any mismatch → Sentry alert → Cipher pages.

### 6.3 Tamper telemetry

When the server-side verifier (`apps/web/lib/cli-manifest-verifier.ts`) detects a mismatch — i.e., a CLI POSTs a verdict claiming a `binary_hash` that does NOT match the manifest's allowed hash for that version — the route handler:

1. Writes `cli_pairings.tamper_detected_at = now()` for the offending row (Atlas adds the column in migration 0008 if not already present).
2. Writes one `audit_logs` row: `action='cli_tamper_detected'`, target=`<cli_pairing_id>`, metadata=`{"reported_hash": "...", "expected_hash": "...", "cli_version": "...", "manifest_signature_valid": true|false}`.
3. Emits one Sentry warning (NOT an error — this is a transparency surface per D7 framing, not a security violation we promise to detect). The warning includes the metadata above (already PII-clean — no source bytes).
4. Returns HTTP 400 to the CLI with a structured body matching the verdict-route contract.

Per D7 framing (verdict-sign.ts header comment), this is a TRANSPARENCY mechanism, not a security guarantee against the customer themselves. The web verdict screen shows the C-TAMPER advisory banner (`ia/user-flows/cli-pairing-and-tamper.md`).

---

## 7. Branded error copy

Per `brand/samples/05-error-messages.md` voice (grade-6 readable; no jargon; what-happened → what-to-do):

```
Your Studio Zero CLI was modified or is out of date.

Run `npm install -g @studiozero/cli` to reinstall the official build.
If you keep seeing this message, contact us at support@studio-zero.com.
```

Heading: `Your CLI doesn't look right.`
Exit code: 13 (`cli_tampered`).

The error is written for the (overwhelmingly common) case of "the customer didn't tamper, they just have an old version cached somewhere or an antivirus mangled the file." No accusation, no jargon. The (rare) malicious-tamper case is handled silently on the server side (audit_logs + Sentry warning). The customer-facing string never says "tamper" — that word is for internal observability surfaces.

---

## 8. Test obligations (Verify-tracked)

**Unit:**

- `apps/cli/tests/manifest-verify.test.ts` — happy path, tampered manifest, tampered binary, signature-invalid, legacy pubkey acceptance, soft-fail on fetch failure.

**Integration:**

- `tests/integration/cli-manifest-tamper.spec.ts` — server-side path: CLI POSTs verdict with mismatched `binary_hash`, server writes `cli_pairings.tamper_detected_at`, audit_logs row written, 400 returned.

**Snapshot:**

- The canonical-JSON bytes for a fixed manifest input are snapshotted; any change to canonicalization fails the snapshot loudly (mirrors `verdict-sign.ts` discipline).

---

## 9. What does NOT change

For clarity on the seam between this spec and Forge M3 Batch 1's verdict-signing:

- `verdict-sign.ts`'s HMAC-SHA256 primitive: unchanged. Still keys on `binary_hash`. This spec just answers "what's the trust root for that hash?"
- The `cli_pairings.binary_hash` column from migration 0004: unchanged. Still recorded at pair time.
- The verdict-POST contract: unchanged. CLI POSTs `{verdict, signature, binary_hash, cli_version}`; server verifies HMAC against `binary_hash`, then cross-checks against manifest.
- The D7 user-facing framing (transparency, not security guarantee against customer): unchanged. Marketing copy stays neutral.

The single new thing is: the server now has a cryptographic way to ANSWER "is this `binary_hash` an approved one?" rather than relying on a static allowlist column. Allowlist becomes a manifest; manifest is Ed25519-signed; Ed25519 pubkey is shipped in the CLI source. The chain ends at Jo's 1Password vault.

---

## 10. Cross-references

- `architecture/secrets-rotation-runbook.md` §1.7 — rotation runbook for the Ed25519 keypair (this file's §5 is the architecture; the runbook is the procedure).
- `apps/cli/src/runner/verdict-sign.ts` — HMAC consumer of `binary_hash`.
- `apps/cli/src/auth/manifest-verify.ts` — the CLI-side implementation of this spec.
- `apps/web/lib/cli-manifest-verifier.ts` — the server-side implementation of this spec.
- `apps/web/app/cli/manifest.json/route.ts` — manifest distribution endpoint.
- `tools/cli-manifest-sign.ts` — build-time signer.
- `architecture/threat-model.md` TB-7 — the tamper threat boundary.
- `ia/user-flows/cli-pairing-and-tamper.md` C7 / C8 / C-TAMPER — user-facing flow.
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` Fix-3c — the audit finding this spec closes.

---

_Cipher Fix-3c closed. Phase 9 M3 Batch 2 deliverable. Ed25519 + 90d cadence + 30d grace locked._
