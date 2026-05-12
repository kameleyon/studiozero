# Supabase Vault — Secret Inventory

**Vault primitive:** Supabase Vault uses `pgsodium` TCE (Transparent Column Encryption) with **XChaCha20-Poly1305 AEAD**, AAD = `tenant_id::text` per Cipher Fix-4. Master key managed by Supabase. Cipher spec lives at `architecture/threat-model.md` TB-2/§3 (Cipher-owned).
**Owner of this manifest:** Terra (this file) — Cipher owns the actual function definitions + key-management code that lands in Atlas's `0002_rls_and_runner_jwt.sql`.
**Status at M0:** **SPEC** — Vault secret schema is documented here; the `vault.decrypt_byok()` SECURITY DEFINER function ships at M1 in `0002_rls_and_runner_jwt.sql` per Cipher Fix-1.

> **Why Vault (not Vercel env-vars) for these secrets.** Per-tenant secrets (BYOK keys, GitHub App installation tokens, per-run code-encryption keys) cannot live in a process-level env-var store — they need per-tenant isolation, AAD-bound decryption, and an audit trail of every read. Vercel env-vars are correct only for **org-wide** secrets (Studio Zero's own Stripe key, Sentry DSN, etc.). Same boundary motionmax draws.

## Secret-store boundary map

```
┌──────────────────────────────────────────────────────────────────────┐
│ Vercel env-vars (org-wide, process-level)                            │
│   · SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY                         │
│   · STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY                        │
│   · GITHUB_APP_ID, CLIENT_ID, CLIENT_SECRET, PRIVATE_KEY (org-wide)  │
│   · SENTRY_DSN, POSTHOG_KEY, RESEND_API_KEY                          │
│   · CLI_PAIRING_HMAC_KEY                                             │
└──────────────────────────────────────────────────────────────────────┘
                              │  (web app server-side reads)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Supabase Edge Function secret store (org-wide, function-level)       │
│   · STRIPE_WEBHOOK_SECRET                                            │
│   · GITHUB_APP_WEBHOOK_SECRET                                        │
│   · ANTHROPIC_API_KEY_VALIDATION (throwaway, byok-validate's own)    │
│   · JWT_RUNNER_SIGNING_SECRET (Supabase auto-injects from project)   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Supabase Vault (per-tenant, AAD-bound, XChaCha20-Poly1305)           │
│   ─ Cipher Fix-1 vault.decrypt_byok(p_tenant_id, p_secret_id) →      │
│     SECURITY DEFINER function w/ AAD validation                       │
│   ─ Listed below                                                      │
└──────────────────────────────────────────────────────────────────────┘
                              │  (mint-runner-token Edge Fn reads
                              │   via tenant-scoped JWT per ARCH-D3)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Railway env-vars (runner-pool only, process-level)                   │
│   · SUPABASE_URL, SUPABASE_RUNNER_BOOTSTRAP_KEY                      │
│   · SENTRY_DSN, POSTHOG_KEY                                          │
└──────────────────────────────────────────────────────────────────────┘
```

## Vault secret inventory (per-tenant, AAD-bound)

Each row's `name` is the logical secret identifier. Storage = `vault.secrets` table (Supabase-managed); `decrypted_secret` decrypts on read via the Cipher Fix-1 SECURITY DEFINER function. Rotation cadence per Cipher Fix-4: customer-controlled BYOK rotates at customer pace; platform-owned signing material rotates 90d.

| Vault secret name                              | Purpose                                                                                                                                                                 | AAD                                                                                          | Stored at                                         | Rotation                                                                                                                          | Provider-agent                                               | M0/M1 ship                                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `byok_anthropic_key_<tenant_id>`               | Customer's BYOK Anthropic API key                                                                                                                                       | `tenant_id::text`                                                                            | Vault                                             | Customer-pace (UI: "Rotate key" button calls `byok-validate` Edge Fn with new key → re-encrypt)                                   | Customer (entered at `/onboarding/byok`); Cipher owns crypto | **M1** ship                                                                                        |
| `managed_anthropic_key_shared`                 | Studio Zero's Managed-tier shared key                                                                                                                                   | constant `"__managed__"`                                                                     | Vault                                             | 90 days (Cortex rotates; Jo grants new key in Vault)                                                                              | Cortex (procurement) + Cipher (rotation runbook)             | **M2** ship                                                                                        |
| `github_app_installation_token_<tenant_id>`    | Per-tenant GitHub App installation token (1h TTL; runner refreshes)                                                                                                     | `tenant_id::text`                                                                            | Vault                                             | Token TTL is 1h; refresh on demand via App JWT — Vault stores the App's private key, not the rotating installation token directly | Forge                                                        | **M1** ship                                                                                        |
| `github_app_private_key`                       | RSA private key for the Studio Zero GitHub App (org-wide, NOT per-tenant)                                                                                               | constant `"__github_app__"`                                                                  | Vault                                             | 90 days (Cipher Fix-4)                                                                                                            | Forge (key generation) + Cipher (rotation)                   | **M1** ship — currently mirrored to Vercel env-var `GITHUB_APP_PRIVATE_KEY` until Vault path lands |
| `per_run_code_key_<run_id>`                    | Symmetric key encrypting customer code for the 7-day retention window                                                                                                   | `tenant_id::text` (NOT `run_id` — AAD scoped wider so retention purge can decrypt for audit) | Vault                                             | Per-run; cryptoshredded at retention expiry per Cipher Fix-3d (`code_cryptoshredded` audit_action)                                | Atlas (key generation at job dispatch)                       | **M1** ship (Code SKU enters at M1)                                                                |
| `cli_pairing_token_<device_id>`                | Long-lived (90d) pairing token signed for one CLI device                                                                                                                | `device_id::text` (NOT tenant — pairing crosses tenants if user belongs to multiple)         | Vault (HMAC'd; not encrypted — see Cipher Fix-3c) | 90 days (regenerate on `studio-zero login` re-pair)                                                                               | Cipher (signing scheme) + Forge (impl)                       | **M3** ship                                                                                        |
| `cli_ed25519_signing_key_<device_id>`          | Ed25519 keypair binding to CLI binary hash for tamper-evidence (Cipher Fix-3c)                                                                                          | `device_id::text`                                                                            | Vault                                             | Per-pairing; same lifetime as `cli_pairing_token_*`                                                                               | Cipher                                                       | **M3** ship                                                                                        |
| `stripe_customer_payment_method_<tenant_id>`   | NOT in Vault — Stripe stores payment methods on their side via `customer_id`; Studio Zero stores only the `customer_id` reference in `subscriptions.stripe_customer_id` | n/a                                                                                          | Stripe                                            | per Stripe's own rotation                                                                                                         | Ledger                                                       | **M2** ship                                                                                        |
| `webhook_idempotency_keys` (in pg-boss job_id) | NOT in Vault — webhook handlers use `stripe_subscription_id` or `github_delivery_id` as the upsert idempotency key per ARCH-D4                                          | n/a                                                                                          | Postgres                                          | n/a                                                                                                                               | Ledger / Forge                                               | **M2**                                                                                             |

## SECURITY DEFINER decryption function (Cipher Fix-1)

Function signature lives in `architecture/database/migrations/0002_rls_and_runner_jwt.sql` (Atlas + Cipher write at M1):

```sql
-- spec only; Cipher + Atlas write the full body at M1
CREATE OR REPLACE FUNCTION vault.decrypt_byok(
  p_tenant_id uuid,
  p_secret_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as owner; bypasses RLS once AAD check passes
SET search_path = vault
AS $$
DECLARE
  v_decrypted text;
  v_caller_tenant uuid;
BEGIN
  -- 1. JWT must carry a tenant_id claim
  v_caller_tenant := (auth.jwt() ->> 'tenant_id')::uuid;
  IF v_caller_tenant IS NULL THEN
    RAISE EXCEPTION 'vault.decrypt_byok: missing tenant_id claim';
  END IF;

  -- 2. The tenant the JWT identifies MUST match the tenant we're decrypting for
  IF v_caller_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'vault.decrypt_byok: tenant_id mismatch (caller=% requested=%)',
      v_caller_tenant, p_tenant_id;
  END IF;

  -- 3. Decrypt — AAD = tenant_id::text per Cipher Fix-4
  SELECT decrypted_secret INTO v_decrypted
    FROM vault.decrypted_secrets
   WHERE id = p_secret_id
     AND key_id IS NOT NULL;  -- column exists if AAD was set at encrypt time

  IF v_decrypted IS NULL THEN
    RAISE EXCEPTION 'vault.decrypt_byok: secret not found or AAD mismatch';
  END IF;

  -- 4. Audit log every successful decrypt
  INSERT INTO audit_logs (tenant_id, audit_action, actor, target, created_at)
  VALUES (p_tenant_id, 'byok_decrypted', auth.uid(), p_secret_id, now());

  RETURN v_decrypted;
END;
$$;
```

Negative test: Verify writes `tests/acceptance/integration/vault-aad-required.spec.ts` proving (a) a JWT for tenant A cannot decrypt tenant B's BYOK, and (b) a JWT with no tenant claim raises an exception. M1 exit gate.

## Audit-log emission per decrypt

Every Vault read writes one row to `audit_logs` table (PRD §14.3) with shape:

- `tenant_id` = the decrypting tenant
- `audit_action` = `byok_decrypted` | `github_app_token_decrypted` | `per_run_code_key_decrypted` | `cli_token_decrypted` | `managed_key_decrypted` | `code_cryptoshredded` (Cipher Fix-3d)
- `actor` = JWT's `sub` (user UUID, runner UUID, or `__system__` for cron jobs)
- `target` = the Vault `secrets.id` being decrypted
- `created_at` = `now()`

Retention: audit_logs are retained 24 months per PRD §14.4 (longest retention class — these MUST outlive findings).

## Provider-agent responsibility table

| Agent                 | Vault entries they provide / manage                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cipher**            | Owns the SECURITY DEFINER function (Fix-1), AAD scheme (Fix-4), revocation join (Fix-5), Ed25519 CLI manifest signing (Fix-3c), `code_cryptoshredded` enum (Fix-3d), 90-day rotation cadence runbook |
| **Atlas**             | Owns the table schemas + RLS policies + `0002_rls_and_runner_jwt.sql` migration that lands the function                                                                                              |
| **Forge**             | Provides GitHub App private key + installation token refresh logic + CLI pairing impl                                                                                                                |
| **Cortex**            | Provides Managed-tier Anthropic shared key                                                                                                                                                           |
| **Customer (via UI)** | Provides their own BYOK Anthropic key at `/onboarding/byok`                                                                                                                                          |
| **Terra**             | Owns this manifest + cross-surface inventory parity                                                                                                                                                  |

## Cross-references

- `architecture/database/migrations/0002_rls_and_runner_jwt.sql` (Atlas; ships M1)
- `architecture/decisions.md` ARCH-D3 (mint-runner-token), ARCH-D7 (Edge Fn boundary)
- `architecture/threat-model.md` TB-2 (Vault), TB-3 (decrypt path)
- `architecture/iac/secrets/key-rotation.md` (rotation runbook)
- `architecture/iac/vercel/env-vars.md` (org-wide secret inventory)
- `architecture/iac/supabase/edge-functions/README.md` (function secret store)
- PRD §13.4 (encryption strategy), §14.3 (audit-log retention 24mo)

---

_Terra · Vault secret inventory · M0 spec; M1+ implementations land per `0002_rls_and_runner_jwt.sql`._
