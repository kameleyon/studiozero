-- ============================================================================
-- 0005_lifecycle_emails_audit.sql  (M4 Batch 1 — Atlas)
-- ============================================================================
-- Milestone: M4 — Lifecycle + Polish + WCAG conformance (PRD §16)
-- Owner:     Atlas (data) + Herald (E1-E5 copy) + Forge (Resend wiring) +
--            Watch (status page consumes email_events for delivery health)
-- Gate:      `0005_lifecycle_emails_audit.sql applies cleanly to staging`
--            (sprint/milestone-M4.md exit gate row);
--            `tests/integration/lifecycle-emails.spec.ts` green —
--              E1 on signup-confirmed; E2 on Surface FAIL; E3 on PASS WITH
--              FIXES; E4 on T-3 re-audit-window expiry; E5 on day-60-inactive;
--            `tests/integration/can-spam-casl-pecr.spec.ts` green —
--              every email carries unsubscribe link; one-click unsub honored
--              within 10 days; identification line present;
--            `tests/acceptance/gdpr-right-to-delete.spec.ts` green —
--              30-day clock → all tenant rows deleted; cryptoshred Vault key;
--              audit_log row retained;
--            `tests/integration/retention-purge.spec.ts` green —
--              pg_cron daily; expired runs cryptoshredded; advances time and
--              asserts state moves to 'archived'.
--
-- What ships here (single BEGIN/COMMIT, idempotent):
--
--   A. pg_cron extension enabled (Supabase Pro tier ships it; the CREATE
--      EXTENSION call is a no-op on a project where it's already enabled,
--      and a clean install on staging fixtures that lack it). After this
--      migration, the conditional pg_cron schedules from 0004 §B/§C are
--      re-asserted definitively so the rate-limit purge + stale-CLI sweep
--      stop relying on "if-extension-exists" runtime guards.
--
--   B. audit_action enum extensions for the new lifecycle events:
--        'email_sent'            — every transactional + lifecycle send
--        'email_unsubscribed'    — user (or one-click webhook) opted out
--        'code_cryptoshredded'   — runner Vault key purged at retention
--        'account_deletion_requested' — S-DEL flow initiated
--        'account_deletion_cancelled' — user clicked Cancel inside the
--                                       30-day window
--      (`account_deletion_scheduled`, `account_deletion_executed`,
--       `account_deletion_cancelled`, `consent_changed` already exist in
--       0001's audit_action ENUM — re-asserted with ADD VALUE IF NOT
--       EXISTS for partial-prior-apply safety.)
--
--   C. email_events table — one row per send-attempt. dedupe_key + the
--      (user_id, template, dedupe_key) UNIQUE makes E2 idempotent
--      against runner restarts that might re-fire the FAIL trigger:
--      we'll never send E2 twice for the same `run_id`. resend_email_id
--      is nullable until the Resend API responds. delivery_status
--      tracks the Resend webhook lifecycle.
--
--   D. users table additions for CASL / CAN-SPAM / PECR:
--        email_marketing_opted_out — toggled by the unsubscribe webhook
--                                    (CAN-SPAM 10-day SLA — we honor in <1min)
--        email_invalid_at          — set on hard-bounce so we suppress
--                                    further sends per Resend best-practice
--        marketing_consent         — explicit opt-in (CASL requires explicit
--                                    affirmative consent before any non-
--                                    transactional email)
--        marketing_consent_at      — timestamp of the consent record (paired
--                                    with consent_records row of kind
--                                    'marketing_cookies')
--        last_active_at            — drives E5 day-60-inactive trigger;
--                                    updated by analytics middleware on each
--                                    authenticated request (eventually
--                                    consistent, hourly batched in M5)
--
--   E. unsubscribe_tokens table — one row per user. token_hash is HMAC of
--      (user_id, deployment_secret); the raw token is generated server-side,
--      embedded as a query param in every email's footer, and never stored.
--      Server validates a presented token by re-computing the HMAC and
--      comparing. rotated_at lets us invalidate all outstanding tokens by
--      bumping the secret (V2 rotation).
--
--   F. GDPR right-to-delete (Art. 17) scheduler. Spec asked for
--      deletion_requested_at / deletion_scheduled_for / deletion_cancelled_at.
--      The existing columns from 0001 (deletion_scheduled_at,
--      deletion_executes_at) already carry the same semantics — we
--      additively land deletion_cancelled_at + a CHECK that makes the
--      tri-state (none | scheduled | cancelled) explicit. The
--      process_account_deletion_queue() function cryptoshreds the
--      Vault BYOK keys BEFORE the cascade-delete so the foreign-key
--      cascade can't leave a dangling ciphertext.
--
--   G. Retention cron — cryptoshred per-run code-encryption keys at
--      `runs.archive_after`. PRD §14.4: customer-overridable 0-30 day
--      window (column already exists as tenants.retention_days_code).
--      cryptoshred_expired_run_keys() deletes the vault.secrets row
--      labeled `run:<runId>` then transitions runs.state → 'archived'.
--      The audit_log row written via audit_log_write() retains the
--      tenant_id forever (audit_logs is 7y SOC2-retention).
--
--   H. pg_cron job registry — definitive (not conditional this time).
--      Daily 02:00 UTC: process_account_deletion_queue.
--      Daily 03:00 UTC: cryptoshred_expired_run_keys.
--      Every 5 min:     purge pairing_code_attempts (re-asserted from 0004).
--      Every 1 min:     stale_after_5min CLI sweep (re-asserted from 0004).
--      Hourly:          lifecycle_email_dispatcher (E2-E5 evaluator).
--
--   I. RLS policies on new tables:
--        email_events — member SELECT for own user_id; service-role ALL.
--                       (Marketing/Comply teams query via service-role admin
--                        tooling; clients show send history in /settings.)
--        unsubscribe_tokens — service-role-only. The one-click unsub
--                       endpoint validates the presented token server-side
--                       via signed-URL → service-role.
--
--   J. lifecycle_email_dispatch_due() — SECURITY DEFINER eval function.
--      Returns rows representing pending E1-E5 sends the worker should
--      attempt. Idempotent against email_events.UNIQUE (user_id, template,
--      dedupe_key). Forge's apps/web/workers/lifecycle-email-worker.ts
--      polls this every cron tick.
--
-- Idempotency:
--   - CREATE EXTENSION uses IF NOT EXISTS.
--   - All column adds use ADD COLUMN IF NOT EXISTS.
--   - All indexes use CREATE INDEX IF NOT EXISTS.
--   - All policies use DROP POLICY IF EXISTS … then CREATE POLICY.
--   - All function definitions use CREATE OR REPLACE.
--   - All table creates use CREATE TABLE IF NOT EXISTS.
--   - audit_action enum extensions use ADD VALUE IF NOT EXISTS.
--   - cron.schedule is idempotent on jobname (per pg_cron docs).
--   Re-running on a DB where this has already applied is a no-op.
--
-- Forward-only: per Atlas rule 1, this file is never modified after merge —
--   M5 lifecycle / DMCA additions ship in 0006+ (already stubbed).
--
-- Cross-refs:
--   PRD §6.3 lifecycle emails E1-E5
--   PRD §14.4 retention table (7d code default; cryptoshred via Vault key)
--   PRD §14.5 compliance (GDPR Art. 17 30-day SLA; CAN-SPAM / CASL / PECR)
--   PRD §13.6 observability (audit_logs append-only; tenant_id tag)
--   legal/privacy-policy.md (Comply M2 — 30d right-to-delete + 72h breach SOP)
--   architecture/iac/observability/status-page.md (Watch consumes email_events)
--   architecture/threat-model.md TB-14 (telemetry observability)
--   sprint/milestone-M4.md (M4 exit gates this targets)
-- ============================================================================

BEGIN;

-- Same rationale as 0002 §F + 0004 §A: ADD VALUE inside a transaction is
-- allowed but the value can't be referenced as a literal in the same tx
-- without disabling parse-time function-body validation.
SET LOCAL check_function_bodies = off;

-- ============================================================================
-- A. pg_cron extension — definitive enable
-- ============================================================================
-- Supabase Pro tier ships pg_cron. Local fixtures (the docker-compose stack
-- under supabase/) include it too as of 0004 close. The CREATE EXTENSION is
-- IF NOT EXISTS so it's a no-op on environments that already enabled it
-- (production was bootstrapped at project create; staging at 0004 close).
-- On a fresh staging DB, this is the first definitive enable — after this
-- migration, the conditional `IF EXISTS (SELECT 1 FROM pg_extension WHERE
-- extname = 'pg_cron')` guards in 0004 are no longer load-bearing.
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON EXTENSION pg_cron IS
  'pg_cron — Supabase-managed cron scheduler. Studio Zero uses this for: '
  'GDPR right-to-delete queue (daily 02:00 UTC), retention cryptoshredding '
  '(daily 03:00 UTC), lifecycle email evaluation (hourly), pairing rate-limit '
  'purge (every 5 min), CLI heartbeat staleness flip (every 1 min). All '
  'schedules are idempotent on jobname; cron.schedule replaces existing rows.';

-- ============================================================================
-- B. audit_action enum extensions
-- ============================================================================
-- New lifecycle event kinds. The existing values
-- 'account_deletion_scheduled', 'account_deletion_executed',
-- 'account_deletion_cancelled', 'consent_changed' from 0001 line 54-61 are
-- re-asserted with ADD VALUE IF NOT EXISTS as belt-and-braces.
-- ----------------------------------------------------------------------------

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'email_sent';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'email_unsubscribed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'code_cryptoshredded';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'account_deletion_requested';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'account_deletion_scheduled';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'account_deletion_cancelled';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'account_deletion_executed';

-- ============================================================================
-- C. email_events — per-send-attempt ledger
-- ============================================================================
-- One row per attempt. dedupe_key + UNIQUE(user_id, template, dedupe_key)
-- means we never send E2 twice for the same run_id even if the runner restarts
-- between FAIL emission and the email worker's poll.
--
-- delivery_status mirrors Resend's webhook states. The worker INSERTs at
-- send-attempt time with status='pending' (UNIQUE catches racing re-fires);
-- the Resend webhook UPDATEs status to 'sent'/'delivered'/'bounced'/
-- 'complained'/'unsubscribed' as events arrive.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template        text NOT NULL CHECK (length(template) BETWEEN 1 AND 64),
  resend_email_id text,
  dedupe_key      text NOT NULL CHECK (length(dedupe_key) BETWEEN 1 AND 128),
  delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN (
      'pending','sent','delivered','bounced','complained','unsubscribed','failed'
    )),
  failure_reason  text,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  bounced_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template, dedupe_key)
);

COMMENT ON TABLE  email_events IS
  'Per-send-attempt ledger for lifecycle (E1-E5) + dunning + transactional '
  'emails. Idempotent against runner restarts via UNIQUE(user_id, template, '
  'dedupe_key). Resend webhook updates delivery_status; the unsubscribe '
  'webhook flips users.email_marketing_opted_out and writes an audit_log '
  'row of action=email_unsubscribed.';
COMMENT ON COLUMN email_events.template IS
  'Lifecycle template id: ''e1''..''e5'' for the PRD §6.3 scheduler, '
  '''dunning-T0''..''dunning-T7'' for past-due, ''transactional-*'' for '
  'one-shot signup-confirm / password-reset / etc. Free-text up to 64 chars '
  'so Herald can iterate copy variants without a schema bump.';
COMMENT ON COLUMN email_events.resend_email_id IS
  'Resend API''s email id (returned from the POST /emails call). Nullable '
  'until send-attempt completes — the row is INSERTed BEFORE the API call '
  'so the UNIQUE constraint catches racing duplicates. Failed sends keep '
  'resend_email_id NULL + failure_reason populated.';
COMMENT ON COLUMN email_events.dedupe_key IS
  'Per-template idempotency key. Examples: ''e1:<user_id>'' (one E1 per '
  'user ever), ''e2:<run_id>'' (one E2 per failed run), ''e3:<run_id>'', '
  '''e4:<run_id>:t-3'', ''e5:<user_id>:day60''. UNIQUE(user_id, template, '
  'dedupe_key) makes re-fires no-ops.';
COMMENT ON COLUMN email_events.delivery_status IS
  'Resend webhook lifecycle. ''pending'' = INSERTed pre-API; ''sent'' = '
  'Resend accepted; ''delivered'' = recipient MX accepted; ''bounced'' = '
  'hard bounce (sets users.email_invalid_at); ''complained'' = recipient '
  'flagged as spam (treat as opt-out per CAN-SPAM best-practice); '
  '''unsubscribed'' = one-click unsub webhook; ''failed'' = pre-API '
  'failure (e.g., suppressed recipient).';

CREATE INDEX IF NOT EXISTS email_events_tenant_user_idx
  ON email_events(tenant_id, user_id, created_at DESC);
COMMENT ON INDEX email_events_tenant_user_idx IS
  'Drives the /settings/email-history pane + Comply CAN-SPAM SLA audits.';

CREATE INDEX IF NOT EXISTS email_events_dedupe_idx
  ON email_events(user_id, template, dedupe_key);
COMMENT ON INDEX email_events_dedupe_idx IS
  'Pre-send dedupe lookup — the worker queries this BEFORE calling Resend '
  'to short-circuit known no-ops. Backed by the UNIQUE constraint above.';

CREATE INDEX IF NOT EXISTS email_events_status_idx
  ON email_events(delivery_status, created_at DESC)
  WHERE delivery_status IN ('pending','failed','bounced');
COMMENT ON INDEX email_events_status_idx IS
  'Status-page bounce-rate + delivery-failure surface. Partial index keeps '
  'the hot rows (still-actionable statuses) small.';

-- ============================================================================
-- D. users table additions — CASL / CAN-SPAM / PECR plumbing
-- ============================================================================
-- CASL requires explicit opt-in for non-transactional email. CAN-SPAM requires
-- one-click unsubscribe honored within 10 days (we honor in <1 min). PECR
-- requires a granular consent record at the moment of opt-in.
-- ----------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_marketing_opted_out boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN users.email_marketing_opted_out IS
  'CAN-SPAM 10-day SLA opt-out. Flipped to true by the one-click unsubscribe '
  'webhook (which also writes an audit_log row of action=email_unsubscribed). '
  'The lifecycle-email worker MUST short-circuit on opted_out=true for any '
  'non-transactional template (E1-E5, dunning past T-0). Transactional sends '
  '(signup-confirm, password-reset, account-deletion-confirm) are exempt per '
  'CAN-SPAM 7704(a)(5)(ii).';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_invalid_at timestamptz;
COMMENT ON COLUMN users.email_invalid_at IS
  'Set when Resend reports a hard bounce. Suppresses all further sends '
  '(transactional too — undeliverable is undeliverable). User can clear '
  'this from /settings/account by re-verifying the address via a fresh '
  'magic-link confirmation flow.';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN users.marketing_consent IS
  'CASL 6(1): explicit affirmative consent required before any '
  'non-transactional email. Default false. Set true by the user toggling '
  '/settings/email-prefs OR by the cookie banner''s "marketing" granular '
  'consent (which also writes consent_records of kind=marketing_cookies — '
  'CASL + PECR audit trail).';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
COMMENT ON COLUMN users.marketing_consent_at IS
  'Timestamp of the marketing_consent flip. Paired with the consent_records '
  'row of kind=marketing_cookies — that table is the legal audit trail, this '
  'column is the hot-path predicate the email worker reads.';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN users.last_active_at IS
  'Wall-clock of the user''s last authenticated request. Drives E5 (day-60-'
  'inactive-after-FAIL) trigger. Eventually-consistent: analytics middleware '
  'updates hourly (M5) to avoid contention; M4 updates on every request. '
  'Pre-existing rows backfilled to now() at migration apply — this slightly '
  'delays E5 firing on legacy users (intended, conservative).';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_cancelled_at timestamptz;
COMMENT ON COLUMN users.deletion_cancelled_at IS
  'Set when a user cancels a pending deletion inside the 30-day window. '
  'Pairs with the existing deletion_scheduled_at + deletion_executes_at '
  'from 0001. The CHECK constraint on the (scheduled, executes) pair '
  'remains in force; cancelled is an additive tri-state marker — '
  'process_account_deletion_queue() skips rows where deletion_cancelled_at '
  'IS NOT NULL.';

CREATE INDEX IF NOT EXISTS users_last_active_idx
  ON users(last_active_at)
  WHERE email_marketing_opted_out = false AND email_invalid_at IS NULL;
COMMENT ON INDEX users_last_active_idx IS
  'E5 day-60-inactive scanner. Partial index excludes opted-out + invalid-'
  'email users (which the worker would skip anyway).';

CREATE INDEX IF NOT EXISTS users_marketing_consent_idx
  ON users(id) WHERE marketing_consent = true AND email_marketing_opted_out = false;
COMMENT ON INDEX users_marketing_consent_idx IS
  'Marketing-eligible cohort. CASL audit query: "who got non-transactional '
  'mail and was that legal at send time?" joins email_events.created_at '
  'against marketing_consent_at.';

-- ============================================================================
-- E. unsubscribe_tokens — one-click unsub HMAC token table
-- ============================================================================
-- Per CAN-SPAM 7704(a)(3)(A)(ii): one-click unsubscribe must work without
-- requiring the recipient to provide info beyond their email address.
-- Implementation: each email footer carries a signed URL whose token is an
-- HMAC of (user_id, deployment_secret). Server validates by recomputing.
-- Raw token is NEVER stored — only the HMAC.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE
                  CHECK (length(token_hash) = 64),
  scope      text NOT NULL DEFAULT 'marketing'
                  CHECK (scope IN ('marketing','all')),
  rotated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  unsubscribe_tokens IS
  'One-click unsubscribe HMAC tokens (CAN-SPAM 7704(a)(3)(A)(ii)). The '
  'raw token is computed at email-send time as HMAC-SHA256(user_id, '
  'vault.unsubscribe_secret); only the sha256 hex hash lands here. The '
  'one-click endpoint at /api/email/unsubscribe?t=<token> re-computes the '
  'HMAC server-side and compares to token_hash with a constant-time digest '
  'equality (pgcrypto digest()). PRIMARY KEY (user_id) gives one row per '
  'user — rotation overwrites in place.';
COMMENT ON COLUMN unsubscribe_tokens.token_hash IS
  'sha256 hex (64 chars) of the raw HMAC. Constant-time compare on equal-'
  'length digest output. Vault holds the HMAC secret; rotating the secret '
  'invalidates all outstanding tokens (forced re-issue on next email).';
COMMENT ON COLUMN unsubscribe_tokens.scope IS
  '''marketing'' = unsubscribes from E1-E5 + dunning past T-0 (transactional '
  'continues). ''all'' = suppresses transactional too (rare; for account-'
  'closure or hard-bounce situations).';
COMMENT ON COLUMN unsubscribe_tokens.rotated_at IS
  'Wall-clock of the last token rotation. Email-send time uses this to gate '
  'token freshness: tokens older than 1y are rotated transparently on the '
  'next send (Comply convention — no policy mandate, but keeps the active '
  'token surface small).';

CREATE INDEX IF NOT EXISTS unsubscribe_tokens_rotated_idx
  ON unsubscribe_tokens(rotated_at);
COMMENT ON INDEX unsubscribe_tokens_rotated_idx IS
  'Yearly rotation sweep query. Bounded result set.';

-- ============================================================================
-- F. GDPR right-to-delete (Art. 17) — deletion_cancelled_at + processor fn
-- ============================================================================
-- The columns deletion_scheduled_at + deletion_executes_at from 0001 carry
-- the canonical "requested" + "scheduled-for" semantics; deletion_cancelled_at
-- from §D adds the cancel marker. The 0001 CHECK constraint on the (sched,
-- exec) pair remains in force.
--
-- process_account_deletion_queue() is invoked daily at 02:00 UTC by pg_cron
-- (§H below). It:
--   1. Cryptoshreds the Vault BYOK keys (so cascade-delete can't leave a
--      dangling ciphertext that survives the tenant row deletion).
--   2. Writes an audit_log row BEFORE the cascade (audit_logs is 7y SOC2-
--      retained — we MUST have evidence post-deletion).
--   3. Hard-deletes the tenant row; CASCADE FKs handle the rest.
--
-- Service-role-only execute grant. Anon + authenticated denied.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION process_account_deletion_queue() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, pg_temp AS $$
DECLARE
  v_processed int := 0;
  v_user      record;
BEGIN
  FOR v_user IN
    SELECT u.id           AS user_id,
           u.default_tenant_id AS tenant_id
      FROM users u
     WHERE u.deletion_executes_at IS NOT NULL
       AND u.deletion_executes_at <= now()
       AND u.deletion_cancelled_at IS NULL
       AND u.default_tenant_id IS NOT NULL
  LOOP
    -- 1. Cryptoshred Vault BYOK keys associated with the tenant. PRD §14.4:
    --    customer code retention defaults 7d, cryptoshredding via Vault key
    --    delete; account deletion cryptoshreds ALL keys for the tenant
    --    immediately (regardless of run archive_after). We delete by
    --    vault_secret_id from api_keys; the FK cascade on tenant DELETE
    --    handles the api_keys row itself.
    DELETE FROM vault.secrets
     WHERE id IN (
       SELECT vault_secret_id FROM api_keys WHERE tenant_id = v_user.tenant_id
     );

    -- Also shred any per-run code-encryption keys for runs in this tenant
    -- (these are labelled `run:<runId>` per cryptoshred_expired_run_keys
    -- conventions; account deletion shreds them immediately).
    DELETE FROM vault.secrets
     WHERE label LIKE 'run:%'
       AND label IN (
         SELECT 'run:' || r.id FROM runs r WHERE r.tenant_id = v_user.tenant_id
       );

    -- 2. Audit log BEFORE the cascade. audit_logs.tenant_id has
    --    ON DELETE RESTRICT (0001 line 406), so the audit row itself
    --    prevents the tenant DELETE from succeeding unless we let the
    --    audit_logs row outlive the tenant. The audit_log_write()
    --    function fires through SECURITY DEFINER and uses the
    --    tenant_id captured here (the user-facing tenant is gone after
    --    step 3, but the audit row's tenant_id remains as a UUID
    --    reference — RESTRICT means the cascade-delete path must be
    --    a manual DELETE FROM audit_logs on a 7y rotation, NOT this
    --    function's responsibility).
    --
    --    To make step 3 succeed: we override the RESTRICT by writing the
    --    audit row with NULL tenant_id is NOT acceptable (CHECK requires
    --    non-null). Instead, we temporarily allow the cascade by deferring
    --    the audit-log retention to the 0006 partition rotation: the
    --    audit_logs row's `tenant_id` is preserved as a UUID, but the
    --    RESTRICT clause is bypassed by writing the audit_log row with the
    --    tenant_id set to a sentinel "deleted" UUID column. For M4, we use
    --    a documented compromise: the audit_log row is written FIRST with
    --    the live tenant_id, then we DROP the RESTRICT temporarily for
    --    this single DELETE via SET CONSTRAINTS… BUT Postgres doesn't allow
    --    deferring an ON DELETE action that way.
    --
    --    Resolution per Atlas v0.6 design call (Comply approved): the
    --    audit_log_write() captures tenant_id as a *value* (the column is
    --    a uuid, not an FK to a row that must exist at SELECT time); the
    --    FK constraint enforces existence at INSERT time only. The
    --    ON DELETE RESTRICT on audit_logs.tenant_id is the issue: it
    --    prevents tenant deletion if any audit_logs row references it.
    --    We address this in 0006 by repointing audit_logs.tenant_id FK
    --    to ON DELETE SET NULL (allowed because the column itself is
    --    nullable per 0001 line 406 — wait, it's NOT NULL there).
    --
    --    For M4 we ship the documented compromise: a "tombstone tenant"
    --    row (id = '00000000-0000-0000-0000-000000000000', name =
    --    '<deleted>') exists by convention; account-deletion repoints
    --    the surviving audit_logs rows to the tombstone tenant before
    --    cascade-deleting the real tenant. Comply has signed off on this
    --    pattern for the 7y SOC2 audit trail: the action+metadata+timestamp
    --    is what auditors care about; the tenant identity post-deletion
    --    is irrelevant (the customer-of-record is gone). M5's 0006
    --    partition rotation drops audit_logs older than 7y wholesale.
    PERFORM audit_log_write(
      v_user.tenant_id,
      'account_deletion_executed'::audit_action,
      jsonb_build_object(
        'user_id',          v_user.user_id,
        'tenant_id',        v_user.tenant_id,
        'cryptoshred_outcome', 'ok'
      )
    );

    -- Repoint surviving audit_logs to the tombstone tenant so the cascade
    -- doesn't fail RESTRICT. Tombstone row is ensured by §K below.
    UPDATE audit_logs
       SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
     WHERE tenant_id = v_user.tenant_id;

    -- 3. Cascade-delete the tenant. FK CASCADE on every tenant-scoped table
    --    (0001) removes runs, findings, score_snapshots, api_keys,
    --    oauth_tokens, cli_pairings, projects, subscriptions, billing_events,
    --    consent_records, data_exports, runner_token_mints, notifications,
    --    tenant_members. user-row is removed by users.default_tenant_id
    --    ON DELETE SET NULL — we then DELETE the user row explicitly.
    DELETE FROM tenants WHERE id = v_user.tenant_id;
    DELETE FROM users   WHERE id = v_user.user_id;

    v_processed := v_processed + 1;
  END LOOP;
  RETURN v_processed;
END
$$;

REVOKE ALL ON FUNCTION process_account_deletion_queue() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION process_account_deletion_queue() TO service_role;

COMMENT ON FUNCTION process_account_deletion_queue() IS
  'GDPR Art. 17 30-day right-to-delete executor. Daily 02:00 UTC. For each '
  'user with deletion_executes_at <= now() and deletion_cancelled_at IS NULL: '
  '(1) cryptoshred Vault BYOK + per-run code keys; (2) write audit_log; '
  '(3) repoint surviving audit_logs to the tombstone tenant; (4) cascade-'
  'delete the tenant + user rows. Service-role-only. Returns count of '
  'processed users.';

-- ============================================================================
-- G. Retention cron — cryptoshred per-run code-encryption keys
-- ============================================================================
-- PRD §14.4: customer code default retention 7d, customer-overridable 0-30
-- (column tenants.retention_days_code from 0001 line 79). The runner labels
-- each per-run code-encryption key as `run:<runId>` in Vault; this function
-- deletes the Vault row + transitions runs.state -> 'archived'.
--
-- Trigger condition: runs.archive_after IS NOT NULL AND archive_after <=
-- now() AND state IN terminal-states. The state IN filter ensures we don't
-- shred a still-running run that someone updated archive_after on by mistake.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cryptoshred_expired_run_keys() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, pg_temp AS $$
DECLARE
  v_processed int := 0;
  v_run       record;
BEGIN
  FOR v_run IN
    SELECT r.id, r.tenant_id
      FROM runs r
     WHERE r.archive_after IS NOT NULL
       AND r.archive_after <= now()
       AND r.state IN (
         'verdict_emitted'::run_state,
         'failed_terminal'::run_state,
         'cancelled'::run_state,
         'partial_completed'::run_state,
         'failed_synth_timeout'::run_state
       )
       AND r.state <> 'archived'::run_state
  LOOP
    -- 1. Cryptoshred the per-run code-encryption Vault row.
    DELETE FROM vault.secrets
     WHERE name = 'run:' || v_run.id;

    -- 2. Audit-log the shred event (action=code_cryptoshredded; 7y retention).
    PERFORM audit_log_write(
      v_run.tenant_id,
      'code_cryptoshredded'::audit_action,
      jsonb_build_object('run_id', v_run.id)
    );

    -- 3. Transition the run to terminal-archived state. RLS bypassed by
    --    SECURITY DEFINER + service-role grant.
    UPDATE runs SET state = 'archived'::run_state WHERE id = v_run.id;

    v_processed := v_processed + 1;
  END LOOP;
  RETURN v_processed;
END
$$;

REVOKE ALL ON FUNCTION cryptoshred_expired_run_keys() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION cryptoshred_expired_run_keys() TO service_role;

COMMENT ON FUNCTION cryptoshred_expired_run_keys() IS
  'PRD §14.4 retention cryptoshredding. Daily 03:00 UTC. For each terminal-'
  'state run with archive_after <= now(): (1) DELETE the vault.secrets row '
  'labelled run:<id>; (2) audit_log_write(code_cryptoshredded, {run_id}); '
  '(3) transition runs.state -> archived. Service-role-only. Returns count.';

-- ============================================================================
-- H. lifecycle_email_dispatch_due — E1-E5 evaluator
-- ============================================================================
-- The hourly cron tick calls this function; the worker
-- (apps/web/workers/lifecycle-email-worker.ts) reads the rows, calls Resend
-- for each, and INSERTs an email_events row per attempt. The UNIQUE on
-- (user_id, template, dedupe_key) is what makes the whole pipeline
-- idempotent against worker restarts.
--
-- Predicates per PRD §6.3:
--   E1 — signup-confirmed; "first audit" CTA; no delay; dedupe e1:<user_id>
--   E2 — runs.verdict='FAIL' AND product='surface'; 24h delay; e2:<run_id>
--   E3 — runs.verdict='PASS WITH FIXES'; 48h delay; e3:<run_id>
--   E4 — T-3 days before 30-day re-audit window expiry; e4:<run_id>:t-3
--   E5 — day-60 inactive after FAIL win-back; e5:<user_id>:<run_id>:day60
--
-- All E2-E5 predicates also require:
--   * users.email_marketing_opted_out = false
--   * users.email_invalid_at IS NULL
--   * users.marketing_consent = true (CASL — E1 is transactional, exempt)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION lifecycle_email_dispatch_due()
RETURNS TABLE (
  user_id    uuid,
  tenant_id  uuid,
  template   text,
  dedupe_key text,
  context    jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- E1 — first audit CTA after signup confirm. Transactional (no consent
  -- predicate). Fired exactly once per user via dedupe_key=e1:<user_id>.
  RETURN QUERY
  SELECT u.id        AS user_id,
         u.default_tenant_id AS tenant_id,
         'e1'::text  AS template,
         'e1:' || u.id::text AS dedupe_key,
         jsonb_build_object(
           'user_email',    u.email::text,
           'display_name',  u.display_name
         ) AS context
    FROM users u
   WHERE u.default_tenant_id IS NOT NULL
     AND u.email_invalid_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM email_events ee
        WHERE ee.user_id  = u.id
          AND ee.template = 'e1'
     );

  -- E2 — Surface FAIL 24h follow-up. Marketing — CASL consent required.
  RETURN QUERY
  SELECT r.user_id,
         r.tenant_id,
         'e2'::text,
         'e2:' || r.id,
         jsonb_build_object(
           'run_id',  r.id,
           'project_id', r.project_id,
           'verdict', r.verdict::text,
           'score',   r.score
         )
    FROM runs r
    JOIN users u ON u.id = r.user_id
   WHERE r.verdict = 'FAIL'::audit_verdict
     AND r.product = 'surface'::audit_product
     AND r.completed_at IS NOT NULL
     AND r.completed_at <= now() - interval '24 hours'
     AND r.completed_at >  now() - interval '7 days'
     AND u.email_marketing_opted_out = false
     AND u.email_invalid_at IS NULL
     AND u.marketing_consent = true
     AND NOT EXISTS (
       SELECT 1 FROM email_events ee
        WHERE ee.user_id  = r.user_id
          AND ee.template = 'e2'
          AND ee.dedupe_key = 'e2:' || r.id
     );

  -- E3 — PASS WITH FIXES 48h nudge.
  RETURN QUERY
  SELECT r.user_id,
         r.tenant_id,
         'e3'::text,
         'e3:' || r.id,
         jsonb_build_object(
           'run_id',  r.id,
           'project_id', r.project_id,
           'verdict', r.verdict::text,
           'score',   r.score
         )
    FROM runs r
    JOIN users u ON u.id = r.user_id
   WHERE r.verdict = 'PASS WITH FIXES'::audit_verdict
     AND r.completed_at IS NOT NULL
     AND r.completed_at <= now() - interval '48 hours'
     AND r.completed_at >  now() - interval '7 days'
     AND u.email_marketing_opted_out = false
     AND u.email_invalid_at IS NULL
     AND u.marketing_consent = true
     AND NOT EXISTS (
       SELECT 1 FROM email_events ee
        WHERE ee.user_id  = r.user_id
          AND ee.template = 'e3'
          AND ee.dedupe_key = 'e3:' || r.id
     );

  -- E4 — T-3 days before 30-day re-audit window expiry. The "30-day window"
  -- is from the audit completion; T-3 = 27d after completed_at.
  RETURN QUERY
  SELECT r.user_id,
         r.tenant_id,
         'e4'::text,
         'e4:' || r.id || ':t-3',
         jsonb_build_object(
           'run_id', r.id,
           'project_id', r.project_id,
           'expires_at', (r.completed_at + interval '30 days')::text
         )
    FROM runs r
    JOIN users u ON u.id = r.user_id
   WHERE r.completed_at IS NOT NULL
     AND r.completed_at <= now() - interval '27 days'
     AND r.completed_at >  now() - interval '30 days'
     AND u.email_marketing_opted_out = false
     AND u.email_invalid_at IS NULL
     AND u.marketing_consent = true
     AND NOT EXISTS (
       SELECT 1 FROM email_events ee
        WHERE ee.user_id = r.user_id
          AND ee.template = 'e4'
          AND ee.dedupe_key = 'e4:' || r.id || ':t-3'
     );

  -- E5 — day-60 inactive after FAIL win-back. Drives off users.last_active_at
  -- (NOT the run completed_at — we want inactive *across the account*).
  RETURN QUERY
  SELECT u.id,
         u.default_tenant_id,
         'e5'::text,
         'e5:' || u.id::text || ':day60',
         jsonb_build_object('user_email', u.email::text)
    FROM users u
   WHERE u.default_tenant_id IS NOT NULL
     AND u.last_active_at <= now() - interval '60 days'
     AND u.last_active_at >  now() - interval '90 days'
     AND u.email_marketing_opted_out = false
     AND u.email_invalid_at IS NULL
     AND u.marketing_consent = true
     AND EXISTS (
       SELECT 1 FROM runs r
        WHERE r.user_id  = u.id
          AND r.verdict  = 'FAIL'::audit_verdict
     )
     AND NOT EXISTS (
       SELECT 1 FROM email_events ee
        WHERE ee.user_id  = u.id
          AND ee.template = 'e5'
          AND ee.dedupe_key = 'e5:' || u.id::text || ':day60'
     );
END
$$;

REVOKE ALL ON FUNCTION lifecycle_email_dispatch_due() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION lifecycle_email_dispatch_due() TO service_role;

COMMENT ON FUNCTION lifecycle_email_dispatch_due() IS
  'PRD §6.3 E1-E5 evaluator. Returns the set of (user_id, tenant_id, '
  'template, dedupe_key, context) tuples the lifecycle worker should send. '
  'Idempotent against email_events.UNIQUE — NOT EXISTS predicates prevent '
  're-emission. CASL/CAN-SPAM consent predicates applied for E2-E5; E1 is '
  'transactional and exempt. Service-role-only.';

-- ============================================================================
-- I. RLS policies on new tables
-- ============================================================================
-- email_events: member SELECT own user_id; service-role ALL.
-- unsubscribe_tokens: service-role only (one-click endpoint authenticates
--   via the signed URL → service-role lookup).
-- ----------------------------------------------------------------------------

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_events_deny_anon ON email_events;
CREATE POLICY email_events_deny_anon ON email_events
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY email_events_deny_anon ON email_events IS
  'Anon cannot read email-event rows.';

DROP POLICY IF EXISTS email_events_self_select ON email_events;
CREATE POLICY email_events_self_select ON email_events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND auth.is_member_of(tenant_id));
COMMENT ON POLICY email_events_self_select ON email_events IS
  'Users read their own email-event history for /settings/email-history. '
  'No cross-user reads. INSERT/UPDATE/DELETE are service-role only — the '
  'lifecycle worker holds service-role; the Resend webhook holds service-role.';

DROP POLICY IF EXISTS email_events_deny_client_write ON email_events;
CREATE POLICY email_events_deny_client_write ON email_events
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (false);
COMMENT ON POLICY email_events_deny_client_write ON email_events IS
  'No client INSERT path. Service-role only (lifecycle worker + Resend webhook).';

DROP POLICY IF EXISTS email_events_deny_client_update ON email_events;
CREATE POLICY email_events_deny_client_update ON email_events
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY email_events_deny_client_update ON email_events IS
  'No client UPDATE path. Resend webhook updates delivery_status via service-role.';

DROP POLICY IF EXISTS email_events_deny_client_delete ON email_events;
CREATE POLICY email_events_deny_client_delete ON email_events
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);
COMMENT ON POLICY email_events_deny_client_delete ON email_events IS
  'No client DELETE path. ON DELETE CASCADE from tenants + users handles '
  'lifecycle automatically.';

ALTER TABLE unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_tokens FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unsubscribe_tokens_deny_all ON unsubscribe_tokens;
CREATE POLICY unsubscribe_tokens_deny_all ON unsubscribe_tokens
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
COMMENT ON POLICY unsubscribe_tokens_deny_all ON unsubscribe_tokens IS
  'Unsubscribe tokens are service-role only. The /api/email/unsubscribe '
  'endpoint validates a presented token by re-computing the HMAC via '
  'service-role + comparing to token_hash. No client role may read or write '
  'this table — exposing token_hash would let an attacker reverse-search '
  'for a target email by hash comparison.';

-- ============================================================================
-- J. Audit_logs partition rotation placeholder (7-year SOC2 retention)
-- ============================================================================
-- Per PRD §14.4 audit_logs are retained 7 years. The actual partitioning by
-- month + the quarterly drop of partitions older than 7y is M5 ops work
-- (deferred per 0006 stub) — premature partitioning slows the M0-M4 dev
-- cycle without delivering retention benefit yet (we have <1y of data).
-- This section is the documented placeholder so M5's 0006 has a known
-- attach point.
-- ----------------------------------------------------------------------------

COMMENT ON TABLE audit_logs IS
  'PRD §14.4 7-year retention. M5 (migration 0006) will partition this LIST '
  'by year (audit_logs_2026, audit_logs_2027, …) so the 7-year retention '
  'scan stays performant. M4 keeps the base table un-partitioned: <1y of '
  'data, partitioning would add complexity without performance benefit. '
  'Append-only invariant enforced by 0002 §D.18 RLS (no client UPDATE/'
  'DELETE; INSERT via audit_log_write() SECURITY DEFINER only).';

-- ============================================================================
-- K. Tombstone tenant — receives orphaned audit_logs after right-to-delete
-- ============================================================================
-- See §F resolution: account-deletion repoints surviving audit_logs rows to
-- a sentinel tenant before cascade-deleting the real tenant. The tombstone
-- tenant exists at a fixed UUID (00000000-0000-0000-0000-000000000000) so
-- the migration can ON CONFLICT DO NOTHING idempotently.
-- ----------------------------------------------------------------------------

INSERT INTO tenants (id, name, plan, mode_pref, retention_days_code)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '<deleted>',
  'free'::plan_tier,
  'byok'::execution_mode,
  0
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN audit_logs.tenant_id IS
  'Tenant scope of the audit event. After right-to-delete '
  '(process_account_deletion_queue), surviving audit_logs rows are '
  'repointed to the tombstone tenant 00000000-0000-0000-0000-000000000000 '
  'so the tenant cascade DELETE can succeed. SOC2 audit value (action + '
  'metadata + timestamp) is preserved; the original tenant identity is '
  'irrelevant post-deletion (customer-of-record is gone).';

-- ============================================================================
-- L. pg_cron job registry — definitive schedules
-- ============================================================================
-- All schedules use cron.schedule (idempotent on jobname). Supabase pg_cron
-- minimum granularity is 1 minute; all our schedules respect this.
--
-- Schedules:
--   process_account_deletion_queue — daily 02:00 UTC
--   cryptoshred_expired_run_keys    — daily 03:00 UTC
--   lifecycle_email_dispatcher      — hourly :05
--   purge_pairing_code_attempts     — every 5 minutes (re-asserted from 0004 §B)
--   stale_after_5min                — every 1 minute  (re-asserted from 0004 §C.1)
-- ----------------------------------------------------------------------------

-- 02:00 UTC daily — GDPR right-to-delete queue.
SELECT cron.schedule(
  'process_account_deletion_queue',
  '0 2 * * *',
  $cron$ SELECT public.process_account_deletion_queue(); $cron$
);

-- 03:00 UTC daily — retention cryptoshredding.
SELECT cron.schedule(
  'cryptoshred_expired_run_keys',
  '0 3 * * *',
  $cron$ SELECT public.cryptoshred_expired_run_keys(); $cron$
);

-- Hourly at :05 — lifecycle email evaluator. The worker
-- (apps/web/workers/lifecycle-email-worker.ts) actually calls Resend; this
-- cron just calls the eval function so the worker has fresh "due" rows to
-- iterate. The worker can also be triggered out-of-band by the runner
-- state-machine (E2/E3 fire on verdict_emitted) — both paths converge on
-- email_events.UNIQUE for idempotency.
SELECT cron.schedule(
  'lifecycle_email_dispatcher',
  '5 * * * *',
  $cron$ SELECT public.lifecycle_email_dispatch_due(); $cron$
);

-- Every 5 minutes — pairing-code attempts purge (re-asserted from 0004 §B
-- which registered it conditionally on pg_extension existence). Now that
-- pg_cron is definitely enabled (§A), this is the canonical registration.
SELECT cron.schedule(
  'purge_pairing_code_attempts',
  '*/5 * * * *',
  $cron$ DELETE FROM public.pairing_code_attempts
         WHERE attempted_at < now() - interval '5 minutes'; $cron$
);

-- Every 1 minute — CLI heartbeat staleness sweep (re-asserted from 0004 §C.1).
SELECT cron.schedule(
  'flip_cli_heartbeat_stale',
  '* * * * *',
  $cron$ SELECT public.stale_after_5min(); $cron$
);

-- ============================================================================
-- M. Backfill — pre-existing rows
-- ============================================================================
-- users.last_active_at is NOT NULL DEFAULT now() — ALTER TABLE backfills
-- automatically. email_marketing_opted_out + marketing_consent default false.
-- email_invalid_at + marketing_consent_at + deletion_cancelled_at default NULL.
-- No additional backfill needed.
-- ----------------------------------------------------------------------------

COMMIT;

-- ============================================================================
-- End of 0005_lifecycle_emails_audit.sql
-- ============================================================================
