# Phase 5 Audit — Cipher (Cryptography & Secrets)

**Phase:** 5 — Tech Architecture
**Auditor:** Cipher (Security layer / Cryptography & Privacy Specialist)
**Date:** 2026-05-11
**Inputs reviewed:**
- `PRD.md` v0.5 (§11.3, §13.4, §13.6, §14.3, §14.4, §14.5, §17 #12, #18, #19)
- `architecture/system-diagram.md` v0.1 (Axiom — TB-1..TB-10, ARCH-D3, ARCH-D7)
- `architecture/decisions.md` v0.1 (ARCH-D1..D8, plus open ARCH-D9 egress)
- `architecture/database/tables.sql` (`api_keys`, `oauth_tokens`, `runner_token_mints`, `cli_pairings`, `audit_logs`, `breach_events`, `score_engine_versions`)
- `architecture/database/rls-policies.sql` (helpers `auth.tenant_id()`, `auth.runner_run_id()`, `auth.claim_role()`; runner-scoped policies on `runs`, `findings`, `score_snapshots`, `oauth_tokens`)
- `architecture/database/runner-jwt.md` (mint endpoint, claims, rotation, audit trail, service-role boundaries)
- `architecture/threat-model.md` v1.0 (TB-2 I-row, TB-3 S/I, TB-4 I/E, TB-5 S/I, TB-12 S/E, TB-14 §3.3 EXF-1..4)
- Prior `prd-review-cipher.md` v0.2 (B5 telemetry, C1 API-key exfil, #12 sealed-boxes correction)

> **Method.** Per question in the audit framework, name the primitive in use, walk the AEAD+AAD checklist where it applies, name the file:section the spec lives in, and call out drift between Axiom's auth map, Atlas's RLS+DDL, and Shield's STRIDE+corpora. "Correct primitive" is a binary check — sealed boxes are not symmetric AEAD; AEAD without AAD is not the same as AEAD with AAD; HMAC-with-binary-hash is not a signature scheme. Don't soften.

---

## 0. Phase-5 secrets-at-rest verdict

**PASS WITH FIXES.**

The crypto/secrets surface across the four Phase-5 deliverables is coherent, primitive-correct, and M0-actionable. v0.2's three Cipher findings (B5 telemetry, C1 BYOK-key-in-runner, #12 sealed-boxes) are all closed by name in either PRD §13.4/§13.6 or threat-model §3.2/§3.3, with the LLM-gateway pattern (TB-4 E-row + §3.2 mitigation #1) being the standout correct call. The five fixes below are real but none are M0-blockers; each is implementable inside the M0/M1 envelope without re-architecting.

Cipher's M0-go vote: **GO**, conditional on Fix-1 and Fix-2 landing in the M0 migration (0002_rls_and_runner_jwt.sql per migration-order.md). Fix-3..Fix-5 are M1-track.

---

## 1. BYOK + Anthropic key storage (TB-4, §13.4)

**Encryption primitive at rest:**
- PRD §13.4 names "Supabase Vault (`pgsodium`, AES-256-GCM AEAD) with `tenant_id` bound as Additional Authenticated Data." Correct primitive. AEAD ✓ / AAD ✓ / Vault ✓.
- system-diagram §1 component table reiterates: "Supabase Vault — `pgsodium` AEAD AES-256-GCM with `tenant_id` as AAD."
- threat-model TB-2 I-row reiterates: "Supabase Vault (`pgsodium`, AES-256-GCM AEAD) with `tenant_id` AAD."

Three deliverables agree on the primitive. v0.2 #12 (sealed boxes) is correctly burned.

**Caveat on the primitive name (pedantic but load-bearing for Forge):** `pgsodium`'s Transparent Column Encryption surface uses `crypto_aead_xchacha20poly1305_ietf_encrypt` for column-level AEAD, not literally `AES-256-GCM`. The PRD/diagram/threat-model copy reads "AES-256-GCM" — both are 256-bit AEAD with 128-bit auth tag and are functionally equivalent in security posture, but the API call and the IV/nonce sizing are different (XChaCha20 = 24-byte nonce, AES-GCM = 12-byte). **Fix-4 below.**

**`tenant_id` bound as AAD:** PRD §13.4 + system-diagram §1 + threat-model TB-2 I-row name this requirement. **Not yet enforced anywhere in `tables.sql` or `rls-policies.sql`** — `api_keys.vault_secret_id` is a uuid reference and Vault's TCE-with-AAD is a column-encryption transform that lives outside `tables.sql`. Verify's `integration/vault-aad-required.spec.ts` is named in threat-model TB-2 I-row but not yet written. **Fix-1 below.**

**Where the key lives in memory during a run — the load-bearing question:** Per threat-model §3.2 mitigation #1, "The runner NEVER holds the raw Anthropic API key. All LLM calls route through a Supabase Edge Function (LLM gateway) that holds the key." This closes Cipher v0.2 C1 + Shield v0.2 #3 (PI-1 exfil scenario). Correct architecture.

But there is **drift between deliverables on this point that needs resolving before Forge starts M1:**
- `system-diagram` §1 Edge-Functions block lists `byok-validate` only. No `llm-gateway` Edge Function is on the diagram.
- `ARCH-D7` enumerates Edge Functions as: `mint-runner-jwt`, `byok-validate`, `score-engine`, `stripe-webhook`, `github-webhook`, `jury-reaudit-gate`. **No `llm-gateway`.**
- `threat-model` §3.2 mitigation #1 names this gateway pattern as the load-bearing PI-1 defense and assumes it exists.
- `system-diagram` TB-5 description ("Hosted Runner → Anthropic API. Anthropic API key (BYOK from Vault, or Managed shared key)") **contradicts** the gateway pattern — it implies the runner holds the key.

The runner cannot both "decrypt the BYOK key via Vault RPC, then call Anthropic with it" (system-diagram TB-5, data-flow 3c) AND "never hold the raw Anthropic API key" (threat-model §3.2 #1). Pick one. **Fix-2 below.** Cipher's strong recommendation: gateway pattern wins. The PRD-§13.4 text "Decrypted only inside the runner process via a tenant-scoped Edge Function RPC" should be rewritten to "Decrypted only inside the LLM-gateway Edge Function; never crosses the runner process boundary."

**Decryption boundary — who can decrypt?** `rls-policies.sql` `api_keys_member_select` exposes `last4`, `last_verified_at`, `vault_secret_id` to tenant members but NOT the plaintext. Plaintext fetch is documented as going through "a SECURITY DEFINER RPC scoped to (tenant_id, runner-role JWT)" (line 163). Function not yet written. The function is the choke point — its definition is where AAD must be passed to `pgsodium`'s decrypt API. **Fix-1 covers this.**

---

## 2. Runner-JWT minting (Axiom ARCH-D3 + Atlas runner-jwt.md)

**Primitive:** Supabase Auth JWT, server-signed (HS256 or RS256 per Supabase project config — unspecified in the deliverables; Cipher recommends RS256 for asymmetric verifiability across Edge Function boundaries). HMAC-or-asymmetric-JWT ✓ (with the RS256 nudge in Fix-5).

**TTL ≤5 min — appropriate for an Anthropic call that can take 5–10 min?**
- runner-jwt.md §Rotation: "Per run, not per request. A run that takes 10 minutes re-mints once mid-run. A run that takes 4 minutes uses one mint. TTL ≤ 5 min. If the runner needs longer, the runner asks for a new token via a tiny refresh RPC."
- Comprehensive depth = "~20–45 min runtime" (PRD §7.2 Step B). 45min ÷ 5min = 9 re-mints.
- ARCH-D3: "TTL: default 300s (5 minutes); max 1800s (30 min for Comprehensive depth)."

**Drift between Axiom and Atlas on max-TTL.** Atlas says ≤5min hard, refresh-on-heartbeat. Axiom says 5min default, **1800s max** for Comprehensive. These are different security postures. Cipher prefers Atlas's tighter cap — a 30-minute live JWT is a 30-minute replay window for any in-memory leak. **Fix-3 below:** reconcile to Atlas's ≤5min hard cap + refresh-RPC; delete Axiom's "max 1800s" exception. The audit trail (one `runner_token_mints` row per mint) is cheap; the security delta of 5min vs 30min replay window is not.

**Audience binding — verified in both Axiom's policy and Atlas's RLS?**
- ARCH-D3 spec: `aud=runner-<run_id>`.
- runner-jwt.md spec: `aud=studio-zero/runner`, with `run_id` as a **separate claim** matched in RLS via `auth.runner_run_id()`.
- `rls-policies.sql` `runs_runner_select` (line 275): `auth.claim_role() = 'runner' AND tenant_id = auth.tenant_id() AND id = auth.runner_run_id()`.

**Drift in the `aud` claim value.** Axiom encodes the run_id IN the audience string; Atlas keeps a static audience plus a separate `run_id` claim. Atlas's pattern is **the correct one** for RLS — `auth.jwt() ->> 'aud'` would otherwise need substring parsing inside SQL, and the predicate would be fragile. The RLS as written in `rls-policies.sql` uses Atlas's pattern. **Axiom's ARCH-D3 needs editing to match Atlas's implementation**, not the other way around. Filed as a doc-only fix inside Fix-3.

**Replay window:**
- runner-jwt.md adds `jti` (uuid v4, persisted to `runner_token_mints.jti`) — ✓.
- One-time-use check: runner-jwt.md describes it as "Revocation: `runner_token_mints.revoked_at`. Revoked JWTs fail the `auth.runner_run_id()` policy check immediately because we add an extra policy clause that joins to `runner_token_mints` and rejects rows whose `revoked_at IS NOT NULL`."
- **This extra join clause is not in `rls-policies.sql`.** The runner-policies on `runs`, `findings`, `score_snapshots`, `oauth_tokens` do NOT join to `runner_token_mints.revoked_at`. **Fix-5 below.**

**Mint audit log:** `runner_token_mints` is well-shaped (tables.sql lines 692–705): `tenant_id`, `run_id`, `jti UNIQUE`, `issued_at`, `expires_at`, `token_sha256` (hash of the JWT, not the secret — ✓ correct primitive), `revoked_at`, `issued_to`, `CHECK (expires_at > issued_at)`. RLS denies all client roles (line 479). **Append-only invariant:** there's a `revoked_at` column that gets UPDATE'd, so the table is NOT pure append-only — but that's correct since revocation needs to be expressible. The audit_logs row (`action='runner_token_minted'`, enum in tables.sql line 131) is the immutable companion. Two writes, two purposes — matches runner-jwt.md §Audit-trail. ✓

---

## 3. OAuth tokens — GitHub App + Stripe (TB-10, TB-12)

**GitHub App private key (the RS256/PS256 signing material for the App JWT used to mint installation tokens):**
- threat-model TB-12 S-row: "GitHub App private key in Vault, never in env or bundle; rotation 180d; CODEOWNERS gate on Vault access." ✓ primitive.
- Not represented in `tables.sql` as a row — it's a singleton platform secret, presumably stored as a `vault.secrets` row keyed by name. **Fix-4 covers documenting this in `13.4` more explicitly.**

**GitHub App installation tokens (per-repo, ~1hr, refreshable):**
- `oauth_tokens` table: `installation_id bigint`, `vault_secret_id uuid NOT NULL UNIQUE`, `revoked_at timestamptz`. ✓
- runner-jwt.md §Service-role-boundaries item 1 makes the webhook handler service-role; the install-token mint path is implicit (Octokit handles the JWT→installation-token round trip).
- threat-model TB-5 S-row: "Installation tokens are short-lived (1h) and minted on demand from the GitHub App private key (Vault-stored, never in app env)." ✓
- Per-repo permissions only (PRD D1) — closes the v0.2 over-permissioned blast-radius concern.

**Stripe keys:**
- threat-model TB-10 S-row: "Stripe restricted-key scopes: only the specific resources we need; key rotation 90d; never in client bundle." ✓
- Webhook secret: TB-11 + ARCH-D4 — HMAC-SHA256 signature verify; `Stripe-Signature` header. ✓ primitive.
- system-diagram §5 auth map: "Web App → Stripe — Restricted API key (read-write subscriptions + customers only) — rotate quarterly." ✓ alignment.
- **Drift:** TB-10 says 90d, system-diagram §5 says "quarterly" (~90d, equivalent). PRD §13.4 says nothing about rotation cadence. **Fix-4 below:** lock the rotation cadence in PRD §13.4 alongside the encryption primitive — 90 days for GitHub App pkey (currently 180d in TB-12, **inconsistent with Stripe 90d** — pick one cadence policy), 90 days for Stripe restricted-key + webhook secret, customer-controlled for BYOK, Jo-rotated quarterly for Managed shared key (system-diagram §5).

**Rotation procedure + audit trail:**
- `audit_action` enum (tables.sql lines 114–136) includes `api_key_added`, `api_key_rotated`, `api_key_removed`, `github_app_installed`, `github_app_uninstalled`. ✓ surfaces exist.
- No corresponding `stripe_key_rotated` action in the enum. Probably fine since Stripe rotation is internal-only, but if Comply asks for it (SOC2 separation-of-duties), it needs a row in the enum. Flag for Comply panel; not a Cipher blocker.

---

## 4. Sentry / PostHog redaction (TB-14, Cipher v0.2 B5)

**`beforeSend` implementation pattern — precisely enough for Forge?**

threat-model §3.3 spells it out — this is the strongest section of any Phase-5 deliverable on this dimension:

> 1. Strip `event.request.data`, `event.request.headers.authorization`, `event.request.headers.cookie`, `event.extra.body`, `event.extra.code`.
> 2. Drop any breadcrumb message > 1000 chars (likely a code blob).
> 3. **Drop any string property whose Shannon entropy > 4.5 bits/byte over ≥ 24 chars** (catches API keys: `sk-ant-*`, `sk-*`, `ghp_*`, `ghs_*`, UUIDs, hex-encoded secrets).
> 4. Drop any string containing a known-secret-pattern regex set (50+ patterns from gitleaks rule pack).
> 5. Drop any property named in the denied-keys set: `apiKey`, `api_key`, `token`, `secret`, `password`, `authorization`, `cookie`, `key`.

Cipher's exact v0.2 spec was "Drop strings whose Shannon entropy >4.5 bits/byte over 24+ chars" — Shield's §3.3 mitigation #1 reproduces this **verbatim**. ✓ This is implementable by Forge without inventing the pattern.

**Allowlist-not-denylist on log shape:**
- threat-model §3.3 mitigation #2: "Pino's serializer is configured with an explicit allowlist of fields per log event type. Anything not allowlisted is dropped." ✓ matches Cipher's prior recommendation.
- threat-model §3.3 mitigation #5: "PostHog event allowlist: the PostHog SDK is wrapped; only a fixed set of event names (signup, audit_started, verdict_emitted, etc.) with a fixed schema of properties are emitted." ✓ matches Cipher's prior B5 fix.

**PostHog `identify` — `tenant_id` raw vs hashed?**
- Neither system-diagram nor threat-model nor PRD §13.6 specifies. system-diagram §1 component row notes "PostHog — Product analytics; does not fire until cookie consent granted."
- TB-14 I-row threat is "PostHog event property leaks finding text containing customer's API key" — but the **`tenant_id` is the primary identifier** in any product-analytics setup, and a raw uuid in the PostHog UI = cross-product correlation surface. **Fix-3 below (telemetry sub-item):** §13.6 must mandate `tenant_id` is passed to PostHog as HMAC-SHA256(tenant_id, hash_salt) where `hash_salt` is a Vault-stored constant, not raw uuid. Same for any analytics `distinct_id`. This is a Cipher-rule.

**Secret-exfil corpus exists** (`runner/fixtures/secret-exfil-corpus/`, ≥40 patterns at M1, Cipher + Shield owners per threat-model §4 table). ✓ M1-actionable. CI gate is `pnpm test telemetry:scrub`.

---

## 5. Customer code cryptoshredding (§13.4)

**Primitive:** Per-run AES-256-GCM (or `crypto_aead_xchacha20poly1305_ietf` — same Fix-4 ambiguity as §1) symmetric key, stored as a `vault.secrets` row keyed by run_id. Key deletion at retention expiry → ciphertext mathematically destroyed simultaneously across backups. AEAD ✓ / Vault ✓ / cryptoshred semantics ✓.

**PRD §13.4 line:** "Customer code (in BYOK and Managed modes): cryptoshredded — encrypted with a per-run key stored in Vault; key deleted at retention expiry so backups become mathematically destroyed simultaneously. Default retention 7 days, customer-overridable to 0–30."

**Retention machinery:**
- `tenants.retention_days_code int NOT NULL DEFAULT 7 CHECK (retention_days_code BETWEEN 0 AND 30)` (tables.sql line 147). ✓
- `runs.archive_after timestamptz` (tables.sql line 388) — computed from tenant policy at `verdict_emitted`. ✓
- pg_cron retention job: runner-jwt.md §Service-role-boundaries item 4 mentions "Nightly retention jobs (pg_cron). Cryptoshredding, `data_exports` purges, `audit_logs` partition rotation. All pg_cron-scheduled, all logged." ✓ — but the actual SQL migration is at M5 per `migration-order.md` (referenced but not read).

**Audit trail for cryptoshred operation:**
- `audit_action` enum does NOT have a `code_cryptoshredded` action. Closest is `account_deletion_executed`, which is broader.
- The retention job needs to log every key-delete to `audit_logs` for GDPR Art. 30 records-of-processing. **Fix-3 sub-item:** add `code_cryptoshredded` to the `audit_action` enum in `tables.sql` (forward-compat — enums append safely in Postgres).

**Per-run key derivation vs per-run key generation:** The deliverables say "per-run key" — Cipher reads this as a fresh CSPRNG-generated key per run, not a KDF-derived key. That's the safer choice (no master-key compromise → cascading decrypt risk). Document explicitly in §13.4. Fix-4.

---

## 6. CLI binary-hash signing (D7, Shield TB-7 + §3.6)

**Primitive:** HMAC-SHA256 with key = binary's SHA-256 hash. threat-model §3.6 mitigation #2: "the CLI computes `signature = HMAC(verdict_bytes, key=binary_hash)`. Server-side, a verdict whose hash is on the registry must verify with the registered hash's expected signature."

**Cipher's view (reaffirmed from v0.2):** This is transparency, not security. HMAC where the key is the binary hash (which the binary itself computes) means a hostile CLI can recompute its own hash and sign with it — the signature attests to "this verdict came from a binary with hash X" but says nothing about whether X is an authentic Studio Zero binary. That's why §3.6 mitigation #1 introduces the **binary hash registry** (a signed manifest of known-good hashes) — the registry is what makes "Studio Zero recognized binary" expressible, not the HMAC.

**Is the registry signing primitive specified?** §3.6 mitigation #1: "every official CLI build's SHA-256 is published at a signed manifest URL." Signed by what key? Where is the public key distributed? Not specified anywhere in Phase-5 deliverables.

**Cipher's recommendation (Fix-3 sub-item):** The manifest should be signed by an Ed25519 key (NOT HMAC — this is an asymmetric problem; the verifier is the customer's CLI, the signer is Studio Zero's build pipeline). The Ed25519 public key is bundled in the CLI binary itself + pinned in the web app's `/cli/handshake` response so the binary can re-verify. Private key lives in Vault (Studio Zero release engineering namespace, not per-tenant). Rotation = re-issue the manifest with new pubkey, ship new CLI build; old CLI builds keep working against old manifest until end-of-support. This is one signing surface, M3-track (CLI ships at M3), not M0-blocker.

D7 transparency framing reaffirmed. The watermark is **honest**, not load-bearing. Shield §3.6 mitigation #5 names this correctly: "The customer is the only party harmed by tampering with their own audit. We do not over-claim tamper-detection." ✓

---

## 7. AI Act Art. 50 disclosure (PRD §11.3 + §14.5)

**Interim machinery (M0/M1):** HTTP header `X-AI-Generated: studio-zero` + `<meta name="ai-generated" content="studio-zero">` tag + AI System Card v0.1 placeholder. PRD §11.3 + §14.5 + #18 lock this for M0/M1, full Card v1.0 before V1.5 Auto-PR. ✓

**Crypto-relevant — does the disclosure need to be cryptographically verifiable (C2PA)?**
- PRD §11.2 mentions "C2PA-style provenance" in the V1.5 Auto-PR PR-body context: "every commit message carries `AI-Authored: studio-zero/runner@v<x.y.z>` trailer."
- That trailer is a string in a commit message — not signed, not C2PA. "C2PA-style" is doing a lot of work in that sentence.
- C2PA proper requires X.509 cert chain + content-binding hash signed by a trust-list-registered signer. Heavy for V1.5.
- California SB 942 (PRD §14.5) mandates "machine-readable provenance" but doesn't require C2PA specifically — the `<meta>` tag + header satisfy the floor.

**Cipher's read:** the M0/M1 interim machinery is correct primitive (string declaration, no crypto). The V1.5 commit trailer is also string-only, which is honest. **No C2PA work is on Cipher's M0-M5 roadmap.** If/when an external party asks for "real" C2PA, that becomes a V2 work item — flag for Comply panel; not a Phase 5 fix.

---

## 8. Tactical questions for the deliverables

**Q1. Does Atlas's `runner_token_mints` table satisfy the audit-log requirement for §13.4 + GDPR Art. 30?**
- ✓ Yes. The combination of `runner_token_mints` (operational revocation surface) + `audit_logs` rows with `action='runner_token_minted'` (SOC2/GDPR retention surface, 7y) covers Art. 30. Two writes, two purposes, documented in runner-jwt.md §Audit-trail. ✓

**Q2. Does Shield's TB-14 mitigation specify the `beforeSend` implementation precisely enough that Forge can build it without inventing the pattern?**
- ✓ Yes — threat-model §3.3 has the entropy-threshold number (4.5 bits/byte), the length threshold (24 chars), the regex denylist source (gitleaks rule pack), the key-name denylist, AND the allowlist-not-denylist principle. This is the most implementable telemetry redaction spec in the Phase-5 deliverables.
- Missing piece: the **PostHog identify call hashing** of `tenant_id` (Fix-3 sub-item above). Not in threat-model §3.3. Should be added.

**Q3. Does Axiom's ARCH-D3 + Atlas's runner-jwt.md agree on the JWT structure?**
- ✗ No — three drifts named in §2 above:
  - `aud` claim value: Axiom `runner-<run_id>` vs Atlas static `studio-zero/runner` + separate `run_id` claim. Atlas's pattern is correct per the RLS already written; Axiom needs editing.
  - TTL: Axiom default 300s, max 1800s; Atlas hard 300s + refresh-RPC. Cipher prefers Atlas — Fix-3.
  - Revocation join in RLS: runner-jwt.md describes joining policies to `runner_token_mints.revoked_at IS NOT NULL`; `rls-policies.sql` does NOT contain this join. Fix-5.

---

## 9. Cipher's five fixes — primitive citation + file ref

### Fix-1 [M0 blocker for migration 0002] — Vault-AAD enforcement contract

**Primitive:** `pgsodium` AEAD (whichever underlying cipher — see Fix-4) decrypt API requires AAD = `tenant_id::text`.
**File:** Atlas to add `architecture/database/migrations/0002_rls_and_runner_jwt.sql` — define the `SECURITY DEFINER` function `vault.decrypt_byok(p_tenant_id uuid, p_secret_id uuid) returns text` that calls `pgsodium`'s decrypt with AAD bound to `p_tenant_id`. Verify writes `integration/vault-aad-required.spec.ts` (named in threat-model TB-2 I-row) that asserts a cross-tenant AAD swap fails to decrypt. **Without this function, the AAD claim in PRD §13.4 is prose, not code.**

### Fix-2 [M1 architecture lock] — Resolve runner-vs-gateway BYOK key-holding contradiction

**Primitive:** The LLM gateway pattern (Edge Function holds the key, not the runner) is the correct architecture per Cipher v0.2 C1 + Shield v0.2 #3 + threat-model §3.2 mitigation #1. **system-diagram TB-5 description + ARCH-D7 Edge-Functions inventory + PRD §13.4 sentence all need to be edited to match.**
**File:** PRD §13.4 sentence "Decrypted only inside the runner process via a tenant-scoped Edge Function RPC" — rewrite to "Decrypted only inside the `llm-gateway` Edge Function; runner authenticates to the gateway with a short-lived run-scoped JWT and never holds the raw Anthropic key." Add `llm-gateway` to ARCH-D7 Edge-Functions list. Update system-diagram §1 Edge-Functions block and §5 auth map row "Runner → Anthropic." This is the single most important Phase-5 fix from the crypto surface.

### Fix-3 [M0/M1 doc fixes — reconcile Axiom/Atlas drifts + tighten three crypto specs]

Three sub-items, none individually M0-blocking but together cover most of the residual drift:
- **3a (runner JWT — to PRD §13.5 + system-diagram §5 + ARCH-D3):** Reconcile to Atlas's `aud=studio-zero/runner` + separate `run_id` claim (matches the RLS already in `rls-policies.sql`). Hard-cap TTL at 300s, refresh-on-heartbeat. Delete Axiom's 1800s exception.
- **3b (PostHog `identify` — to PRD §13.6 + threat-model §3.3):** Mandate `tenant_id` is HMAC-SHA256(tenant_id, vault-stored hash_salt) before being sent to PostHog or any analytics SaaS. Same for `distinct_id`. Cipher allowlist rule.
- **3c (CLI manifest signing — to threat-model §3.6 mitigation #1):** Lock the manifest signing primitive to Ed25519 (asymmetric). Public key bundled in CLI binary + pinned in `/cli/handshake`. Private key in Vault under release-engineering namespace. M3-track, not M0.
- **3d (audit_action enum — to tables.sql line 114):** Add `code_cryptoshredded` action for GDPR Art. 30 records-of-processing on key-delete events.

### Fix-4 [M0 PRD/spec hygiene] — Lock the actual AEAD cipher + rotation cadences

**Primitive ambiguity:** PRD/diagram/threat-model say "AES-256-GCM" but `pgsodium`'s TCE-with-AAD surface uses `crypto_aead_xchacha20poly1305_ietf_encrypt`. Both are 256-bit AEAD with 128-bit auth tags; the security delta is zero, but Forge will write the wrong nonce-handling code if we don't pick one in writing.
**File:** PRD §13.4 — replace "AES-256-GCM AEAD" with "XChaCha20-Poly1305 AEAD (via `pgsodium` TCE), AAD = `tenant_id::text`." Apply same edit to system-diagram §1 Vault row + threat-model TB-2 I-row.

**Rotation cadence policy in same edit pass to §13.4:**
- BYOK API keys: customer-controlled (no Studio Zero rotation policy).
- Anthropic Managed shared key: 90 days (system-diagram §5).
- GitHub App private key (RS256 signer): **90 days** (currently 180d in threat-model TB-12, inconsistent with Stripe 90d). Pick 90d uniformly for platform-owned signing material.
- Stripe restricted key + webhook secret: 90 days (consistent across deliverables — keep).
- Per-run cryptoshred key: per-run lifetime; deletion at `archive_after` is the rotation event.
- Supabase JWT signing secret: Supabase-managed; rotation per Supabase Pro tier policy.

### Fix-5 [M1 RLS migration completeness] — Revocation join clause in runner policies

**Primitive:** RLS policy clause joining `runner_token_mints.revoked_at IS NULL` to the runner-scoped policies.
**File:** `rls-policies.sql` lines 275, 280, 307, 344 (and the `oauth_tokens_runner_select` at line 204) — every policy whose `USING (...)` clause includes `auth.claim_role() = 'runner'` needs an additional predicate:
```sql
AND NOT EXISTS (
  SELECT 1 FROM runner_token_mints
  WHERE jti = (current_setting('request.jwt.claims', true)::jsonb ->> 'jti')::uuid
    AND revoked_at IS NOT NULL
)
```
runner-jwt.md describes this clause as already part of the policy; `rls-policies.sql` doesn't have it. Without this, revoking a `runner_token_mints` row has no effect — the policy still passes on the live JWT until natural expiry. Add the clause to migration 0002.

---

## 10. M0-actionability summary

| Surface | Primitive correct? | Spec implementable at M0/M1? | Blocker? |
|---|---|---|---|
| BYOK at-rest encryption | AEAD ✓ AAD ✓ Vault ✓ | Yes once Fix-1 lands | Fix-1 M0 |
| Runner BYOK key handling (gateway pattern) | ✓ in threat-model | Contradicts diagram + ARCH-D7 | Fix-2 M1 |
| Runner JWT minting | ✓ in Atlas runner-jwt.md | Yes; needs Axiom edit | Fix-3a M0 (doc) |
| Runner JWT revocation | Schema ✓ RLS clause missing | Yes once Fix-5 lands | Fix-5 M1 |
| OAuth tokens (GitHub App pkey + install token) | ✓ | Yes; rotation cadence drift in Fix-4 | No |
| Stripe keys + webhook signing | ✓ HMAC-SHA256 | Yes | No |
| Sentry `beforeSend` | ✓ entropy + regex + allowlist | Yes — threat-model §3.3 is the spec | No |
| PostHog `tenant_id` hashing | Missing | Add in Fix-3b | No (cheap) |
| Customer code cryptoshredding | ✓ | Yes; `code_cryptoshredded` action missing | Fix-3d M0 (enum) |
| CLI binary-hash HMAC | ✓ transparency framing | Yes | No |
| CLI manifest signing | Primitive unspecified | M3-track | Fix-3c M3 |
| Art. 50 disclosure machinery | ✓ string-only, correct | Yes | No |
| Cipher primitive name (XChaCha vs AES-GCM) | Same security; spec says wrong name | Fix-4 doc | M0 doc |

**Cipher's M0-go vote: GO.** Land Fix-1 + Fix-3a + Fix-3d + Fix-4 doc edits in the M0 PRD-tick + migration 0002. Land Fix-2 + Fix-5 in the M1 architecture pass. Fix-3b + Fix-3c are M1+M3 sequencing.

The secrets surface is in better shape now than after v0.2 — the gateway-pattern direction (closes C1 + #3), the AAD requirement (closes #12), the entropy-threshold telemetry spec (closes B5), and the runner-JWT audit trail (closes B2 alongside Atlas) are all named in writing by the agents who own them. The remaining work is reconciliation between deliverables, not new architecture.

---

*End of phase5-audit-cipher.md. Cipher — Security Layer, Cryptography & Privacy.*
