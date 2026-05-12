# Key Rotation Runbook

**Owner of crypto policy:** Cipher (this runbook reflects Cipher's policy; Terra documents the operational tempo + tooling).
**Reference cadence (Cipher Fix-4 lock):** 90 days uniform for platform-owned signing material; customer-controlled keys (BYOK) rotate at customer pace; per-run encryption keys rotate per-run (no fixed cadence — bound to retention purge).

## Rotation calendar at M0–M5

| Secret                                                     | Cadence                                        | First rotation                                                           | Owner                            | Tool                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Supabase project DB password                               | 90d                                            | M3 close                                                                 | Terra                            | Supabase dashboard → DB → Reset password                                                                                     |
| Supabase service-role JWT secret                           | **Supabase-managed; rotates only on incident** | —                                                                        | Cipher (incident)                | Supabase support ticket                                                                                                      |
| Vercel API token (Terraform)                               | 90d                                            | M3 close                                                                 | Terra                            | Vercel dashboard → Tokens → Revoke + reissue                                                                                 |
| Cloudflare API token (Terraform)                           | 90d                                            | M3 close                                                                 | Terra                            | Cloudflare dashboard → Tokens                                                                                                |
| Railway API token                                          | 90d                                            | M3 close                                                                 | Terra                            | Railway dashboard → Tokens                                                                                                   |
| Sentry auth token                                          | 90d                                            | M3 close                                                                 | Watch                            | Sentry dashboard → User Auth Tokens                                                                                          |
| PostHog personal API key                                   | 90d                                            | M3 close                                                                 | Lens                             | PostHog dashboard → Personal API Keys                                                                                        |
| GitHub App private key (`github_app_private_key` in Vault) | 90d                                            | M4 close (M1 ship + 90d)                                                 | Forge + Cipher                   | GitHub App settings → Generate new private key → re-encrypt to Vault → revoke old key (rolling: keep both valid 24h overlap) |
| Stripe restricted key (`STRIPE_SECRET_KEY`)                | 90d                                            | M5 close (M2 ship + 90d)                                                 | Ledger                           | Stripe dashboard → Developers → API keys                                                                                     |
| Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`)            | 90d                                            | M5 close                                                                 | Ledger                           | Stripe webhook endpoint → Roll secret (24h overlap)                                                                          |
| GitHub App webhook secret                                  | 90d                                            | M4 close                                                                 | Forge                            | GitHub App → Webhook secret → Generate new                                                                                   |
| Managed Anthropic key (`managed_anthropic_key_shared`)     | 90d                                            | M5 close                                                                 | Cortex                           | Anthropic console → API Keys → Generate new → swap in Vault → revoke old                                                     |
| Resend API key                                             | 90d                                            | M7 (M4 ship + 90d)                                                       | Echo                             | Resend dashboard → API Keys                                                                                                  |
| CLI pairing HMAC key (org-wide)                            | 90d                                            | — (no current rotation procedure; flagged for M3 ship runbook by Cipher) | Cipher                           | TBD                                                                                                                          |
| BYOK Anthropic key (per-tenant)                            | Customer-paced                                 | n/a                                                                      | Customer                         | `/app/settings/integrations/byok` → "Rotate key"                                                                             |
| Per-run code encryption key                                | Per-run (cryptoshred at retention expiry)      | n/a                                                                      | Atlas (job dispatcher generates) | `vault.crypto_aead_encrypt()` at job dispatch; `vault.secrets DELETE` at retention purge                                     |

## The 24-hour overlap pattern (key rotation without downtime)

For org-wide secrets where rolling means "both keys valid for a window":

1. **T+0:** Generate new secret in provider console.
2. **T+0:** Add new secret to Vault / Vercel env-vars **alongside** old one (new env-var name pattern: `<KEY>_NEW`).
3. **T+0 to T+24h:** Code reads new secret if available, falls back to old secret. (Wrapper function in `apps/web/lib/secrets.ts` — Forge writes at M1 first rotation.)
4. **T+24h:** All in-flight requests have drained. Remove old secret from Vault / Vercel. Rename `<KEY>_NEW` → `<KEY>`.
5. **T+24h+5min:** Revoke old secret in provider console.

Same pattern motionmax used for B-NEW-15 (Stripe key rotation 2026-04).

## Emergency rotation (incident response)

Triggers:

- Suspected key leak (committed to a public repo, posted in a Slack-style channel, surface in logs)
- Departed contractor / former Jo collaborator
- Vendor breach (Anthropic / Stripe / Supabase announces a credential exposure)
- Quarterly Shield ticket finds a stale token

Procedure:

1. Cipher pages Jo + the owning agent (Watch + Crash routing — see `architecture/iac/observability/sentry.md`).
2. Revoke the compromised secret IMMEDIATELY in the provider console (skip the 24h overlap — accept brief downtime).
3. Generate replacement; wire into Vault / Vercel env-vars.
4. **Audit the audit_logs table** for any decrypt or access using the compromised credential since suspected leak time (`SELECT * FROM audit_logs WHERE created_at > '<suspected_leak_ts>' AND target = '<secret_id>'`).
5. If audit shows access from non-Studio Zero IP: file breach event in `breach_events` table per PRD §14.3; Comply notifies affected tenants per AUP retention rule.
6. Post-mortem within 7 days; root-cause + procedural fix documented in `compliance/incident-2026-MM-DD.md`.

## Rotation evidence trail

Every rotation lands an `audit_logs` row:

- `audit_action` = `key_rotated`
- `actor` = the agent (Cipher / Forge / Watch / ...) who performed it
- `target` = the secret name / vault.secrets.id
- `metadata` (jsonb) = `{"reason": "scheduled-90d" | "incident" | "vendor-breach", "old_key_revoked_at": <ts>}`

The drift-check protocol (`README.md` §4) cross-references this table monthly against the cadence calendar above. Any secret whose `last_rotated_at` > cadence + grace-window → flag.

## Cross-references

- `architecture/iac/secrets/vault-keys.md` (secret inventory)
- `architecture/threat-model.md` Cipher §3 (cipher choice + AAD)
- `compliance/incident-runbook.md` (Comply — broader incident response wrapper)
- PRD §13.4 (encryption strategy + rotation policy)

---

_Cipher policy reflected; Terra operational tempo · M0 spec; M1+ as secrets land._
