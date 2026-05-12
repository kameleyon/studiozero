# Secrets Rotation Runbook

**Owner:** Cipher (crypto policy + procedure authorship)
**Operational tempo:** Terra (executes the rotations on calendar; on-call performs incident rotations)
**Phase:** Phase 9 M1 deliverable
**Status:** LOCKED 2026-05-12

**Cross-refs:**

- `architecture/iac/secrets/key-rotation.md` — the calendar + 24h-overlap procedure (Terra's operational tempo layer); this runbook is the **incident-response + per-secret playbook**, not a replacement.
- `architecture/llm-gateway.md` §9.1 — AAD-fail surface that this runbook escalates from.
- `PRD.md` §13.4 — rotation cadence policy (Cipher Fix-4 lock: 90d uniform for platform-owned signing material).
- `architecture/threat-model.md` TB-2 / TB-4 / TB-10 / TB-12 — the threats this rotation cadence defends against.
- `architecture/database/migrations/0002_rls_and_runner_jwt.sql` — `vault.decrypt_byok` AAD-fail path.
- `agents/security/cipher.md` Rule 4 — _"Rotate keys regularly. If modifying a key requires codebase changes, the architecture is wrong."_

---

## 0. The rotation policy in one paragraph

**Every platform-owned secret rotates every 90 days.** Customer-controlled secrets (BYOK Anthropic keys) rotate at the customer's pace. Per-run encryption keys rotate per-run (cryptoshredded at retention expiry). One cadence, one procedure (the 24-hour overlap pattern in `architecture/iac/secrets/key-rotation.md` §2), one audit trail (`audit_logs` rows with `action='key_rotated'`).

The cadence is uniform because **drift between rotation cadences is itself a vulnerability** — an attacker who learns our schedule from leaked telemetry can plan a key-use window. Uniform 90d means one calendar, one Watch alert, one rehearsal.

---

## 1. Per-secret playbooks

### 1.1 Anthropic Managed shared key ("Jo-key")

**Secret name:** `MANAGED_ANTHROPIC_KEY` (Supabase Edge Function secrets store; loaded into the `llm-gateway` Edge Fn at cold-start per `architecture/llm-gateway.md` §4.2).

**Cadence:** Quarterly (90 days). First rotation: M5 close (M2 ship + 90d) per `architecture/iac/secrets/key-rotation.md` row 21.

**Why this cadence:** This is the most expensive secret to leak — every Managed-tier customer's audit costs are billed against this key. A leaked Managed key in a public log could be drained for tens of thousands of dollars in a weekend before Anthropic's rate limits intervene. 90d is short enough that an attacker who exfiltrated the key on day 89 has at most one full billing cycle of useful access; long enough that operations isn't doing this monthly.

**Owner of the rotation procedure:** Cipher schedules; Cortex (agent ops) executes; Watch verifies.

**Procedure:**

1. **T-7 days:** Watch creates a calendar reminder + Slack message in `#sec-rotation` channel.
2. **T-0 09:00 UTC:** Cortex logs into the Anthropic console (`console.anthropic.com`) with the shared-ops account; **Settings → API Keys → Generate new key**.
3. **T-0 09:05 UTC:** Cortex creates a Supabase Edge Fn secret `MANAGED_ANTHROPIC_KEY_NEW` with the new value via the Supabase CLI:
   ```bash
   supabase secrets set MANAGED_ANTHROPIC_KEY_NEW="sk-ant-..." --project-ref <ref>
   ```
4. **T-0 09:10 UTC:** Cortex deploys an Edge Fn build that reads `MANAGED_ANTHROPIC_KEY_NEW || MANAGED_ANTHROPIC_KEY` (preferring NEW). This is the **24-hour overlap window**.
5. **T-0 09:15 UTC:** Watch monitors `runs.llm_calls` for any 401 from upstream Anthropic (signal the new key isn't being accepted). Zero expected.
6. **T+24h 09:00 UTC:** Cortex deletes `MANAGED_ANTHROPIC_KEY` from the Edge Fn secrets store; renames `MANAGED_ANTHROPIC_KEY_NEW` → `MANAGED_ANTHROPIC_KEY`; redeploys the Edge Fn build that reads only `MANAGED_ANTHROPIC_KEY`.
7. **T+24h 09:05 UTC:** Cortex revokes the OLD key in the Anthropic console (**API Keys → old key → Revoke**).
8. **T+24h 09:10 UTC:** Cortex writes one `audit_logs` row:
   ```sql
   INSERT INTO audit_logs (tenant_id, action, actor, target, metadata)
   VALUES (NULL, 'key_rotated', 'cortex',
     'MANAGED_ANTHROPIC_KEY',
     '{"reason": "scheduled-90d", "old_key_last4": "...XYZ", "new_key_last4": "...ABC", "old_key_revoked_at": "<ts>"}'::jsonb);
   ```
9. **T+24h 09:15 UTC:** Watch confirms zero 401s during the overlap window; closes the rotation ticket.

**Failure mode — new key rejected by Anthropic:** revert step 4 (deploy build that reads only `MANAGED_ANTHROPIC_KEY`); page Cipher; open incident in `breach_events` table. Re-attempt after Anthropic confirms key activation.

### 1.2 Stripe restricted key

**Secret names:** `STRIPE_SECRET_KEY` (restricted key, read-write on subscriptions + customers per system-diagram §5) and `STRIPE_WEBHOOK_SECRET`.

**Cadence:** 90 days. First rotation: M5 close (M2 ship + 90d) per key-rotation.md rows 18-19.

**Why this cadence:** Stripe restricted keys can drain refundable amounts; webhook secret leakage allows forged "checkout completed" webhooks (TB-11 STRIDE-S). 90d uniform per Cipher Fix-4 — same calendar as the Anthropic Jo-key.

**Owner:** Ledger executes; Watch verifies.

**Procedure:**

1. **T-7 days:** Watch calendar reminder.
2. **T-0 09:00 UTC:** Ledger logs into Stripe dashboard → **Developers → API keys → Create restricted key**. Same permissions as the active key (Stripe UI duplicates permissions from an existing key).
3. **T-0 09:05 UTC:** Ledger sets `STRIPE_SECRET_KEY_NEW` in both Vercel env and Supabase Edge Fn secrets:
   ```bash
   vercel env add STRIPE_SECRET_KEY_NEW production < /tmp/new_key
   supabase secrets set STRIPE_SECRET_KEY_NEW="rk_live_..." --project-ref <ref>
   ```
4. **T-0 09:10 UTC:** Ledger deploys `apps/web` reading `STRIPE_SECRET_KEY_NEW || STRIPE_SECRET_KEY`.
5. **T-0 09:15 UTC:** Ledger triggers Stripe **Roll signing secret** on the webhook endpoint (**Developers → Webhooks → endpoint → Signing secret → Roll**); Stripe gives a 24h window where BOTH secrets are valid for incoming webhooks. Ledger sets `STRIPE_WEBHOOK_SECRET_NEW`.
6. **T-0 09:20 UTC:** Webhook handler code reads `[STRIPE_WEBHOOK_SECRET_NEW, STRIPE_WEBHOOK_SECRET]` and tries each in turn until signature verifies (per Stripe's official rotation recipe).
7. **T+24h 09:00 UTC:** Ledger removes `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` from env/secrets; renames `*_NEW` → primary; redeploys.
8. **T+24h 09:05 UTC:** Ledger revokes OLD restricted key (**Developers → API keys → old → Reveal → Delete key**).
9. **T+24h 09:10 UTC:** Ledger writes two `audit_logs` rows (one per secret).

**Failure mode — webhook secret rolled but old still being used by Stripe ops:** the dual-secret reader handles this for 24h. If after 24h Stripe still sends with the old secret, escalate to Stripe support (this has not happened in production for any motionmax rotation — kept as belt-and-braces).

### 1.3 GitHub App private key

**Secret name:** `github_app_private_key` stored in `vault.secrets` (Vault row, not env var — per threat-model TB-12 S-row: _"GitHub App private key in Vault, never in env or bundle"_).

**Cadence:** 90 days (Cipher Fix-4 — unified down from threat-model TB-12 v0.5's 180d to match Stripe + Anthropic cadence). First rotation: M4 close (M1 ship + 90d) per key-rotation.md row 17.

**Why this cadence:** The GitHub App private key signs every JWT used to mint installation tokens. A leaked private key allows anyone to act as Studio Zero against any installed customer repo (TB-12 STRIDE-S). 90d matches the rest of the calendar; the previous 180d was inconsistent with Stripe and the Anthropic Jo-key and is the artifact of an early threat-model draft.

**Owner:** Forge + Cipher.

**Procedure:**

1. **T-7 days:** Watch calendar reminder; Cipher pages Forge.
2. **T-0 09:00 UTC:** Forge logs into GitHub → **Settings → Developer settings → GitHub Apps → Studio Zero → Private keys → Generate a new private key**. Downloads the `.pem` file.
3. **T-0 09:05 UTC:** Forge encrypts the new `.pem` to Vault via a one-shot admin Edge Fn:
   ```bash
   supabase functions invoke admin-vault-write \
     --body '{"key_name": "github_app_private_key_new", "value_b64": "..."}' \
     --header "Authorization: Bearer <admin-jwt>"
   ```
   The admin Edge Fn calls `pgsodium.crypto_aead_xchacha20poly1305_ietf_encrypt` with `additional='global'::bytea` (singleton platform key has no tenant binding; documented in `architecture/iac/secrets/vault-keys.md`).
4. **T-0 09:10 UTC:** Forge deploys `apps/web` Octokit client wired to read whichever Vault row is current (`github_app_private_key_new` if present, else `github_app_private_key`).
5. **T-0 09:15 UTC:** Forge triggers a synthetic GitHub-App installation-token mint (`/api/internal/test-github-mint`) and confirms the new key produces a valid token.
6. **T+24h 09:00 UTC:** Forge deletes the OLD `vault.secrets` row; renames the NEW row's key_name to drop `_new`.
7. **T+24h 09:05 UTC:** Forge revokes the OLD GitHub App private key in the GitHub UI (**Private keys → old → Delete**).
8. **T+24h 09:10 UTC:** Forge writes one `audit_logs` row.

**Failure mode — GitHub rejects the new key:** GitHub-side caching of the App's public-key-set takes up to 60s to propagate. If the synthetic mint fails at T-0 09:15, retry every 30s for 5 minutes before reverting. If still failing after 5 minutes, page Cipher.

### 1.4 Supabase service-role JWT secret

**Secret:** Supabase project service-role JWT signing secret. **Supabase-managed; rotates only on incident.**

**Cadence:** Per Supabase Pro tier policy — no scheduled rotation; rotate only on suspected compromise.

**Why no scheduled cadence:** Rotating the service-role JWT secret invalidates every issued service-role JWT in flight — including the one cached in `llm-gateway` and every other Edge Fn. Supabase docs warn this is an outage event for ≤30 seconds. The threat-model cost of an unrotated service-role-secret is **lower** than the operational cost of a quarterly outage event, because:

- The service-role secret never appears in any client bundle (TB-2 S mitigation enforced by `tests/e2e/no-service-role-in-bundle.spec.ts` which regex-scans `.next/static/`).
- The service-role secret never leaves Edge Fn env at rest.
- Supabase isolates the secret from any user-driven query path.

So we trade a quarterly low-risk rotation for an on-incident rotation procedure with a clear trigger.

**Owner:** Cipher (declares incident); Terra (executes via Supabase support).

**Procedure (incident-only):**

1. **T-0 (incident declared):** Cipher pages Jo, Watch, Atlas, Forge.
2. **T-0 +5min:** Cipher opens a Supabase support ticket with `severity=urgent`, subject _"Service-role JWT compromise — request rotation"_.
3. **T-0 +30min (typical Supabase SLA on Pro):** Supabase confirms readiness; coordinates a rotation window.
4. **Rotation window (≤30s):** Supabase rotates the project's JWT signing secret. Every Edge Fn and Vercel app momentarily 401s on its service-role calls; the SDK auto-refreshes from the project's secret store.
5. **T+15min:** Watch confirms zero in-flight calls failing post-window; Forge validates `vault.decrypt_byok` callable; Cipher confirms `audit_logs` rows being written normally.
6. **T+1h:** Cipher writes incident report at `compliance/incident-<yyyy-mm-dd>.md`; opens `breach_events` row if compromise was confirmed (not suspected).

**Trigger criteria for declaring incident:**

- Service-role JWT secret string found in any log surface (Sentry, Pino, GitHub commit, Slack).
- Departed contractor with documented service-role access.
- Supabase publishes a security advisory affecting their KMS / project-secret store.
- Quarterly Shield audit finds an unauthorized service-role-key reference in code.

### 1.5 BYOK Anthropic key (per-tenant)

**Secret:** Customer's own Anthropic API key, stored encrypted in `vault.secrets` per `architecture/database/migrations/0002_rls_and_runner_jwt.sql` Cipher Fix-1 (AAD = `tenant_id::text`).

**Cadence:** Customer-controlled. Studio Zero does not initiate rotation.

**Customer-side rotation procedure:**

1. Customer visits `/app/settings/integrations/byok`.
2. Customer pastes new Anthropic API key.
3. Web App calls `byok-validate` Edge Fn (ARCH-D7 entry #2) — Anthropic dry-run call confirms the key works.
4. On success: web App writes new ciphertext to `vault.secrets` via `vault.encrypt_byok(p_tenant_id, p_plaintext)` (the symmetric counterpart to `vault.decrypt_byok`); updates `api_keys.last4` + `api_keys.last_verified_at`; writes one `audit_logs` row with `action='api_key_rotated'`.
5. Old `vault.secrets` row is `DELETE`d, not soft-deleted — cryptoshred discipline. Customer-side audit trail is in `audit_logs` only.

**No Studio Zero-initiated rotation, ever.** A customer who never rotates their BYOK key is the customer's risk surface, not ours. The audit-disclosure copy on the settings page notes the recommended Anthropic-side rotation cadence.

### 1.6 Per-run code-encryption key

**Secret:** Symmetric XChaCha20-Poly1305 key per audit run, stored in `vault.secrets` with `additional='run:<run_id>'::bytea`. Encrypts customer source code stored at `/var/runs/<tenant>/<run>/` for the run's lifetime.

**Cadence:** Per-run; cryptoshredded at `runs.archive_after` (`pg_cron` retention job — per `architecture/database/runner-jwt.md` §Service-role-boundaries item 4).

**Why no rotation:** This is the cryptoshredding primitive itself. The key's deletion IS the data's destruction. Rotating the key mid-run would corrupt all in-flight reads (we'd have to decrypt with the old key and re-encrypt with the new — for a 30-day-max-retention dataset, the cost-benefit is wrong).

**Audit trail at delete-time:** `audit_logs` row with `action='code_cryptoshredded'` (enum value to be added in migration 0007 per Cipher Fix-3d; placeholder name pending Atlas confirmation). Metadata: `{"tenant_id_hashed": "...", "run_id_hashed": "...", "retention_days": N}`.

### 1.7 CLI manifest signing Ed25519 keypair

**Secret name:** CLI manifest Ed25519 private key — stored in **Jo's 1Password vault** (item: `Studio Zero — CLI manifest Ed25519 signing key (active)`); NEVER on Vercel env, NEVER on Supabase secrets, NEVER in the repo. Public key embedded in `apps/cli/src/auth/manifest-pubkey.ts` as a base64 constant + published at `https://studio-zero.com/.well-known/cli-manifest-pubkey.pub`.

**Cadence:** 90 days. First rotation: M6 close (M3 ship 2026-05-12 + 90d = ~2026-08-10).

**Why this cadence:** Aligns with Cipher Fix-4 platform-wide 90d policy. The Ed25519 manifest-signing key is the trust root for "is this CLI binary an approved build?" — a leaked private key allows an attacker to sign a manifest accepting their own malicious CLI's `binary_hash`, causing the server to honor verdicts from a tampered binary. Mitigation surfaces are immediate-rotate + 30d-grace window for legacy versions (`architecture/cli-manifest-signing.md` §5.2). 90d matches the rest of the calendar; the manifest is signed at most a handful of times per quarter so the operational overhead is low.

**Owner of the rotation procedure:** Jo (executes the ceremony — holds the 1Password vault) + Cipher (schedules + writes the procedure) + Forge (CLI patch release).

**Procedure** (architecture detail: `cli-manifest-signing.md` §5.1):

1. **T-14 days:** Cipher reviews previous rotation's `audit_logs` row + confirms no compromise indicators in the trailing 90 days.
2. **T-7 days:** Watch creates calendar reminder; Cipher pages Forge to prepare a CLI patch release.
3. **T-0 09:00 UTC:** Jo generates a new Ed25519 keypair on the signing laptop:
   ```bash
   node -e "const {generateKeyPairSync} = require('crypto'); \
     const {publicKey, privateKey} = generateKeyPairSync('ed25519'); \
     console.log('PUBKEY:', publicKey.export({type:'spki', format:'pem'})); \
     console.log('PRIVKEY:', privateKey.export({type:'pkcs8', format:'pem'}));"
   ```
4. **T-0 09:05 UTC:** Jo stores the new private key in a NEW 1Password item named `Studio Zero — CLI manifest Ed25519 signing key (active <yyyy-mm-dd>)`; renames the OLD item to `... (legacy <yyyy-mm-dd> — 30d grace)`. NEVER copy the private key off the 1Password vault.
5. **T-0 09:10 UTC:** Forge bumps `apps/cli/package.json` minor version; updates `apps/cli/src/auth/manifest-pubkey.ts` with the new pubkey base64 constant; adds the OLD pubkey to `LEGACY_PUBKEYS`; opens a PR. Atlas mirrors the new accepted-pubkey set into the `runtime_config` row `cli_manifest_accepted_pubkeys` as part of the same change.
6. **T-0 09:30 UTC:** Cipher reviews the PR; Verify confirms the test snapshot updates land correctly; merges.
7. **T-0 10:00 UTC:** npm publish CI step runs `tools/cli-manifest-sign.ts` — Jo provides the private key via 1Password CLI as a one-shot env var the GitHub Actions runner sources into a temp file, signs the manifest, `shred`s the file, then uploads the signed manifest to `runtime_config` via a one-shot admin Edge Fn. The private key NEVER persists outside the runner job.
8. **T-0 10:15 UTC:** Forge updates `apps/web/public/.well-known/cli-manifest-pubkey.pub` with the new PEM; commits + redeploys.
9. **T-0 10:30 UTC:** Watch confirms `https://studio-zero.com/cli/manifest.json` returns the new manifest; confirms `https://studio-zero.com/.well-known/cli-manifest-pubkey.pub` returns the new PEM.
10. **T+30d 09:00 UTC:** Forge removes the OLD pubkey from `LEGACY_PUBKEYS`; bumps CLI patch version; npm publish. Atlas mirrors the removed entry out of `cli_manifest_accepted_pubkeys`. End of grace window.
11. **T+30d 09:05 UTC:** Jo destroys the OLD private-key 1Password item (deletes item + empties vault trash).
12. **T+30d 09:10 UTC:** Cipher writes one `audit_logs` row:
    ```sql
    INSERT INTO audit_logs (tenant_id, action, actor, target, metadata)
    VALUES (NULL, 'key_rotated', 'cipher',
      'cli_manifest_ed25519',
      jsonb_build_object(
        'reason',                 'scheduled-90d',
        'old_key_fingerprint',    '<first 12 b64 chars>',
        'new_key_fingerprint',    '<first 12 b64 chars>',
        'rotation_window_start',  '<ISO ts>',
        'rotation_window_end',    '<ISO ts>',
        'grace_window_end',       '<T+30d ISO ts>'
      ));
    ```

**Failure mode — npm publish fails after manifest signed but before manifest uploaded:** the old manifest is still served at `/cli/manifest.json` (Atlas's `runtime_config` write is the atomic surface). Jo retries npm publish; if it fails again, page Pipeline. The old CLI keeps working with the old manifest until the new release lands. No customer impact.

**Failure mode — customer running old CLI version during 30d grace:** that CLI has the OLD pubkey embedded, fetches the manifest signed by either the OLD or NEW key (server returns the manifest for THAT CLI's claimed version), verifies under the OLD pubkey (which is still in its `ACCEPTED_PUBKEYS`). Works correctly. After grace ends, the customer's `studio-zero login` / `studio-zero run` will hard-fail with the branded `Your Studio Zero CLI was modified or is out of date.` message and exit code 13 — clear signal to run `npm install -g @studiozero/cli`.

**Failure mode — Jo loses access to the 1Password vault entirely (catastrophic):** the rotation procedure IS the recovery path. Cipher declares an incident, Jo generates a new keypair on a new device, Forge ships a CLI patch release without legacy pubkeys (no grace possible because the old key is unrecoverable); customers running the old CLI hit the hard-fail tamper message and must reinstall. Acceptable worst case: a 30-day window where existing-paired CLIs cannot complete a verdict POST. No data loss; the privacy invariant of the CLI is preserved (source never left the customer's machine).

**Compromised-key incident path:** `architecture/cli-manifest-signing.md` §5.3 — abbreviated steps:

1. Cipher pages Jo + Forge + Watch + Atlas.
2. Jo generates new keypair in 1Password.
3. Forge bumps CLI patch version, updates `manifest-pubkey.ts` with the NEW pubkey, **REMOVES** the compromised pubkey from `LEGACY_PUBKEYS` immediately (no grace — incident path). Cipher reviews + merges within 30 min.
4. npm publish + manifest rebuild within 1 hour.
5. Atlas updates `cli_manifest_accepted_pubkeys` to mirror the new state.
6. Cipher writes `audit_logs` row with `action='key_rotated'`, `metadata->>'reason' = 'incident'`.
7. Watch posts public incident note at `studio-zero.com/status`.
8. Comply assesses GDPR Art. 33 + AI Act incident reporting applicability.

**Verify test obligations:**

- `apps/cli/tests/manifest-verify.test.ts` — happy path + signature-invalid + binary-hash-mismatch + legacy pubkey acceptance + soft-fail on fetch failure (Phase 9 M3 Batch 2 ship).
- `tests/integration/cli-manifest-tamper.spec.ts` — server-side path: tampered binary_hash → `verifyCliClaim` returns false → `recordTamperEvent` writes audit_logs + updates cli_pairings (Phase 9 M3 Batch 2 ship).
- Monthly drift check (Watch cron, M5+): fetches `https://studio-zero.com/cli/manifest.json` + `.well-known/cli-manifest-pubkey.pub`, verifies signature out-of-band, diffs against `runtime_config`. Any mismatch → Sentry alert.

---

## 2. AAD-fail incident response

**Trigger:** `audit_logs` row with `action='api_key_decrypted', metadata->>'outcome' = 'aad_fail'` — written by `vault.decrypt_byok` per `0002_rls_and_runner_jwt.sql` Cipher Fix-1.

**What an AAD-fail means:** The ciphertext in `vault.secrets` was successfully decrypted at the `pgsodium` cipher layer BUT the AAD (tenant_id) did not match. This is **not** a routine error — it indicates one of:

1. **Cross-tenant query** — code attempted to decrypt a different tenant's secret. Symptom of an RLS bypass attempt or a code bug. **Severity Critical.**
2. **Key swap between rows** — someone tried to copy ciphertext from one tenant's row into another's. Symptom of an insider attack or a data-restore mishap. **Severity Critical.**
3. **Vault corruption** — a single-bit flip in the AAD column. Rare but possible. **Severity Major.**
4. **Migration error** — a migration changed how AAD is computed without re-encrypting existing rows. **Severity Critical** (should be caught in pre-merge review, but the AAD-fail is the failsafe).

**None of these are acceptable.** Every AAD-fail is a security event.

**Procedure:**

1. **T-0 (alert fires):** Sentry alert on `action='api_key_decrypted' AND metadata->>'outcome' = 'aad_fail'` count > 0 in last 5min → Watch pages Cipher + Atlas + Shield.
2. **T-0 +2min:** Cipher logs into the read-replica DB (NEVER write-replica during an incident) and runs:
   ```sql
   SELECT created_at, actor, target, metadata
   FROM   audit_logs
   WHERE  action = 'api_key_decrypted'
     AND  metadata->>'outcome' = 'aad_fail'
     AND  created_at > now() - interval '24 hours'
   ORDER BY created_at DESC;
   ```
3. **T-0 +5min:** Cipher classifies the event:
   - **Single AAD-fail, no clustering:** likely category 3 (corruption) or 4 (migration). Investigate the offending `secret_id` row; check `vault.secrets.created_at` vs the migration history.
   - **AAD-fails clustered by tenant_id:** likely category 1 (RLS bypass attempt or runner bug). Suspend the run via `audit-run-state-machine` → `suspended_violation` per `ia/user-flows/audit-run-state-machine.md`.
   - **AAD-fails clustered by actor:** likely category 2 (insider). Page Jo + open `breach_events` row immediately.
4. **T-0 +15min:** Cipher posts initial findings to `#sec-incident` channel; Shield begins forensic review of `audit_logs` for related events (cross-tenant queries, anomalous service-role-key access).
5. **T-0 +1h:** If category 1 or 2: PRIVILEGES REVOKED on the offending actor (whether code path or human); Atlas opens an emergency PR removing the offending code path.
6. **T-0 +24h:** Postmortem in `compliance/incident-<yyyy-mm-dd>.md`; Comply assesses whether GDPR Art. 33 72h notification applies (only if customer data was actually decrypted to an unauthorized party — AAD-fail is a SUCCESS of the AAD guard, but cluster patterns may indicate attempted breach reportable per Art. 33).
7. **T+7d:** Cipher writes lessons-learned entry in `BUILD_FLOW.md` Phase 9 section; corpus pattern appended to `runner/fixtures/secret-exfil-corpus/` if applicable.

**Verify test obligation:** `tests/integration/vault-aad-required.spec.ts` (named in threat-model TB-2 I-row — owed at M1). Asserts:

- A swap of `vault.secrets.secret` from tenant A's row into tenant B's row → `vault.decrypt_byok` returns NULL.
- The NULL return triggers an `audit_logs` row with the expected metadata.
- An alert fires on the row (verified by querying the alert-engine test surface — full Verify wiring at M2).

---

## 3. Rotation evidence trail

Every successful rotation lands ONE `audit_logs` row with this exact shape:

```sql
INSERT INTO audit_logs (
  tenant_id,    -- NULL for platform-owned secrets; tenant uuid for BYOK
  action,       -- 'key_rotated'
  actor,        -- 'cortex' | 'ledger' | 'forge' | 'cipher' | the agent that ran it
  target,       -- the secret name OR vault.secrets.id
  metadata      -- jsonb
) VALUES (...);
```

`metadata` schema:

```json
{
  "reason": "scheduled-90d" | "incident" | "vendor-breach" | "departed-contractor",
  "old_key_last4": "ABCD",
  "new_key_last4": "WXYZ",
  "old_key_revoked_at": "2026-05-12T09:24:00Z",
  "rotation_window_start": "2026-05-11T09:00:00Z",
  "rotation_window_end": "2026-05-12T09:30:00Z"
}
```

The drift-check protocol cross-references this table monthly against the cadence calendar in `architecture/iac/secrets/key-rotation.md`. Any secret whose `last_rotated_at` exceeds the cadence + 7d grace window triggers a Watch alert.

**Audit retention:** 7 years (per PRD §14.4 audit-log retention). SOC2 + GDPR Art. 30 records-of-processing compliant.

---

## 4. What does NOT rotate on this schedule

For completeness and to prevent overreach:

- **Customer code at rest** — encrypted per-run, deleted at retention expiry. Cryptoshred is the rotation event.
- **Audit-log signing material** — not applicable; audit_logs is append-only with row-level integrity, no signature.
- **TLS certificates** — managed by Vercel / Cloudflare via Let's Encrypt; auto-renewed at 60d.
- **Customer's own passwords** — managed by Supabase Auth; rotation per customer policy.
- **Customer-installed GitHub-App installation tokens** — short-lived (1h), GitHub-managed, refreshed on demand from the App private key.

---

## 5. Cross-references

- `architecture/iac/secrets/key-rotation.md` — Terra's operational tempo + calendar (this runbook's companion)
- `architecture/cli-manifest-signing.md` — the Ed25519 keypair §1.7 rotates (architecture spec)
- `architecture/llm-gateway.md` — the gateway whose key-handling discipline this runbook enforces
- `architecture/database/migrations/0002_rls_and_runner_jwt.sql` — Cipher Fix-1 `vault.decrypt_byok` (AAD-fail surface)
- `architecture/threat-model.md` TB-2 / TB-4 / TB-10 / TB-12 (rotation-cadence-relevant boundaries)
- `compliance/incident-runbook.md` (Comply — broader incident-response wrapper this runbook composes with)
- `apps/web/lib/sentry-redaction.ts` (ensures rotation alerts don't ship secrets to Sentry)
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` Fix-4 (cadence-unification policy)

---

_Cipher policy reflected; Phase 9 M1 deliverable; 90d uniform platform cadence locked._
