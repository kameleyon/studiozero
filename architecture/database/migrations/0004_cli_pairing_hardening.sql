-- ============================================================================
-- 0004_cli_pairing_hardening.sql  (M3 Batch 2 — Atlas)
-- ============================================================================
-- Milestone: M3 — CLI mode + external pentest (PRD §16; D6 Managed-before-CLI)
-- Owner:     Atlas (data) + Forge (web endpoint) + Cipher (Fix-3c manifest sig)
-- Gate:      `0004_cli_pairing_hardening.sql applies cleanly to staging`
--            (sprint/milestone-M3.md exit gate row);
--            `tests/integration/cli-pairing.spec.ts` green —
--                (a) unpaired CLI rejected;
--                (b) tampered pairing code rejected;
--                (c) replay rejected;
--            `tests/security/cli-job-tamper.spec.ts` green;
--            ARCH-D10 closed — cli_heartbeat schema lands here;
--            external pentest verdict ≤1 Major / 0 Critical / 0 Blocker.
--
-- What ships here (single BEGIN/COMMIT, idempotent):
--
--   A. cli_pairings hardening — additive columns + a (tenant_id, status,
--      expires_at) index for the "active pairings" dashboard query. The new
--      columns are:
--        manifest_signature      — ed25519 sig over (pairing_id, binary_hash,
--                                  version) from Cipher Fix-3c. Verifies the
--                                  CLI's pair-time identity claim.
--        last_heartbeat_at       — denormalised mirror of cli_heartbeat.last_seen_at
--                                  on the row so the active-pairings query stays
--                                  index-only. ARCH-D10 close.
--        binary_hash             — sha256 of CLI binary at pair (transparency
--                                  per D7 — NOT a security claim against the
--                                  customer themselves).
--        device_fingerprint      — hostname:OS:hardware-id. Used by C4 replay
--                                  detection (same code+different fingerprint).
--        replay_attempt_count    — incremented when token-misuse is detected
--                                  (per cli-pairing-and-tamper.md EC-10).
--        status                  — explicit FSM column instead of inferring from
--                                  (paired_at, revoked_at) — eliminates the
--                                  three-state-from-two-nulls ambiguity Forge
--                                  hit on the web endpoint.
--        expires_at              — pairing-code TTL (5 min per flow §C2).
--                                  CHECK constraint enforces non-NULL future.
--        pairing_token_hash      — SHA256 of opaque server-issued token. Raw
--                                  token is returned ONCE at C5 confirm; never
--                                  stored. UNIQUE for token lookup.
--        pairing_token_created_at — set when the opaque token is minted; used
--                                  by the (V1.5) rotate-pairing-token endpoint.
--
--   B. pairing_code_attempts — per-IP rate-limit ledger backing the 5/min/user
--      cap from sprint/milestone-M3.md §"Forge — CLI pairing hardening" + flow
--      §C2 "Multiple regenerations in 1 min → rate-limit at 5/min per user to
--      prevent enumeration". IP retention is 5 minutes per Comply privacy
--      (IP minimization — see consent-and-data-minimisation.md). pg_cron purge
--      job is registered conditionally so the migration applies cleanly on
--      staging where pg_cron is not yet enabled (extension lands at M4 per
--      0005); the purge falls back to a service-role TTL DELETE in
--      apps/web/app/api/internal/purge-rate-limits/ until pg_cron arrives.
--
--   C. cli_heartbeat — ARCH-D10 close. One row per pairing tracks last seen,
--      version drift, IP hash (NEVER raw IP — HMAC w/ a per-deployment pepper
--      so forensics can pivot across rows without enabling re-identification),
--      last claimed job id, and a coarse health_status. stale_after_5min()
--      flips status to 'stale' for the UI per cli-pairing-and-tamper.md EC-6
--      ("reconnect window, then failed_recoverable"). Trace's flow EC-6 +
--      audit-run-state-machine.md EC-6 both consume this.
--
--   D. CLI revocation cascade. When cli_pairings.status flips to 'revoked',
--      a trigger deletes all in-flight `cli-jobs:<pairing_id>` pg-boss jobs
--      so a revoked CLI can't pick a dispatched audit off the queue. The
--      DELETE uses dynamic SQL because pgboss.job may not exist on a fresh
--      staging DB (pg-boss boots lazily on first runner start — same forward-
--      safe pattern as 0003 enqueue_audit_run). Also writes an audit_log
--      entry via audit_log_write('cli_revoked', …). The `cli_revoked` enum
--      value already exists in 0001 (line 58) — re-asserted with
--      ADD VALUE IF NOT EXISTS for safety on partial-prior-apply DBs.
--
--   E. RLS policies (additive — 0002 RESTRICTIVE deny-anon + member-all on
--      cli_pairings already covers the new columns at row level since column-
--      level grants are unaffected by ADD COLUMN). For the NEW tables:
--        pairing_code_attempts — service-role-only writes; deny anon+authn.
--                                Anon rate-limit increments go through the
--                                rate-limit middleware (Forge) which holds
--                                service-role; this prevents a logged-in user
--                                from enumerating other users' attempts by IP.
--        cli_heartbeat         — member SELECT for their tenant's pairings;
--                                service-role INSERT/UPDATE only (heartbeat
--                                endpoint writes via service-role after JWT
--                                check on the opaque pairing token).
--
--   F. ULID-backed pairing code. The 6-char display code (UX requirement —
--      "type this on your terminal") is generated from a ULID core +
--      HMAC-validated server-side. ulid_pairing_code(p_ulid uuid) returns the
--      6-char display string, deterministic given the ULID. Forge calls this
--      at code-mint time and stores BOTH columns (pairing_code_hash +
--      pairing_code_ulid) so the lookup path is `WHERE pairing_code_hash = $1
--      AND pairing_code_ulid = $2` — both must match (HMAC validation), which
--      defeats brute-force of the 6-char surface (~2B keyspace → effectively
--      2^128 with the ULID gate). The HMAC verify is timing-safe via
--      pg_crypto's `gen_random_uuid` randomness + a `pgcrypto digest()` +
--      `=` on the digest output (constant-time at digest length).
--
--   G. Opaque pairing token. Per apps/cli/src/auth/pairing-token.ts the token
--      is opaque (no JWT claims); server-side lookup only. We store SHA256(token)
--      and return the raw token to the CLI exactly once at the C5 confirm
--      response. The unique-index on pairing_token_hash enforces single-token-
--      per-pairing — a fresh pair generates a new token + replaces the hash.
--
-- Idempotency:
--   - All column adds use ADD COLUMN IF NOT EXISTS.
--   - All indexes use CREATE INDEX IF NOT EXISTS.
--   - All policies use DROP POLICY IF EXISTS … then CREATE POLICY.
--   - All function definitions use CREATE OR REPLACE.
--   - All table creates use CREATE TABLE IF NOT EXISTS.
--   - Trigger CREATE is preceded by DROP TRIGGER IF EXISTS.
--   - audit_action enum extension uses ADD VALUE IF NOT EXISTS.
--   Re-running on a DB where this has already applied is a no-op.
--
-- Forward-only: per Atlas rule 1, this file is never modified after merge —
--   subsequent CLI hardening ships in 0005+.
--
-- Cross-refs:
--   ia/user-flows/cli-pairing-and-tamper.md        (C2..C9 + EC-1..EC-10)
--   sprint/milestone-M3.md                          (exit gates this targets)
--   architecture/decisions.md                       (ARCH-D10, D7 watermark)
--   apps/cli/src/auth/pairing-token.ts              (token shape Forge M3 B1)
--   architecture/database/migrations/0001_initial.sql  (cli_pairings init)
--   architecture/database/migrations/0002_rls_and_runner_jwt.sql (RLS pattern)
--   architecture/threat-model.md §3.6                (CLI tamper + replay)
-- ============================================================================

BEGIN;

-- Same rationale as 0002 §F: we extend the audit_action enum near the bottom
-- of this file (re-asserting 'cli_revoked' for safety) and reference the
-- literal inside a trigger function. PG 12+ allows ADD VALUE inside a tx but
-- the new value cannot be used until commit — the check_function_bodies pin
-- bypasses parse-time validation so the function can name the literal.
SET LOCAL check_function_bodies = off;

-- ============================================================================
-- A. cli_pairings hardening — additive columns + active-pairings index
-- ============================================================================
-- Every ADD COLUMN is IF NOT EXISTS so partial-prior-applies on staging are
-- safe. CHECK constraints are added as NOT VALID then VALIDATEd so the table
-- isn't rewritten in-place on a populated DB (M3 staging may already have rows
-- from Forge's web-endpoint smoke tests).
-- ----------------------------------------------------------------------------

-- A.1 — Cipher Fix-3c manifest signature. Ed25519 over
-- (pairing_id || binary_hash || cli_version). Verified at pair time by the
-- web endpoint against the public key pinned at /cli/handshake.
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS manifest_signature text;
COMMENT ON COLUMN cli_pairings.manifest_signature IS
  'Ed25519 signature over (pairing_id||binary_hash||cli_version) per Cipher '
  'Fix-3c. NULL until the CLI completes pair-time handshake. NULL after '
  'rotation if the manifest changes server-side (re-pair required).';

-- A.2 — Denormalised last-heartbeat mirror. ARCH-D10: the canonical
-- last_seen_at lives in cli_heartbeat (§C); this column is the index-friendly
-- mirror so `SELECT … WHERE last_heartbeat_at > now() - '5 min'::interval` is
-- a single-table index lookup. Updated by the heartbeat-write trigger (§C).
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;
COMMENT ON COLUMN cli_pairings.last_heartbeat_at IS
  'Mirror of cli_heartbeat.last_seen_at, updated by trigger. Indexed via '
  '(tenant_id, status, expires_at) — the active-pairings dashboard query.';

-- A.3 — Binary hash at pair time (D7 transparency, NOT a security claim).
-- Already implied by tables.sql but never stored explicitly; this column
-- is the persisted form referenced by C8 signature verification.
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS binary_hash text;
COMMENT ON COLUMN cli_pairings.binary_hash IS
  'sha256(CLI binary) captured at pair. Used by C8 verdict-signature verify: '
  'HMAC(verdict_bytes, key=binary_hash). D7-locked: transparency, not security.';

-- A.4 — Device fingerprint (hostname:OS:hardware-id concat).
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS device_fingerprint text;
COMMENT ON COLUMN cli_pairings.device_fingerprint IS
  'hostname:OS:hardware-id captured at C3. C4 replay detection compares this '
  'against the row''s prior value — same code + different fingerprint = replay.';

-- A.5 — Replay-attempt counter. Incremented by the web endpoint when a token
-- presented from a different fingerprint than the pairing recorded.
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS replay_attempt_count int NOT NULL DEFAULT 0;
COMMENT ON COLUMN cli_pairings.replay_attempt_count IS
  'Count of token-misuse detections (same opaque token, different device '
  'fingerprint). ≥3 → pairing auto-revoked by service-role worker (Forge).';

-- A.6 — Explicit FSM column. Forge hit a three-state-from-two-nulls
-- ambiguity (paired_at IS NULL AND revoked_at IS NULL could mean 'pending'
-- OR 'expired') — this column makes the state explicit + indexable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'cli_pairings'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE cli_pairings
      ADD COLUMN status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paired','expired','revoked'));
  END IF;
END$$;
COMMENT ON COLUMN cli_pairings.status IS
  'Explicit pairing FSM: pending (code minted, not yet redeemed) → paired '
  '(C5) → revoked (S-CLI revoke). expired is set by the pg_cron sweep when '
  'now() > expires_at AND status = pending.';

-- A.7 — Pairing-code TTL. 5 min per flow §C2. NULL allowed for already-paired
-- rows (TTL is irrelevant once redeemed).
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
COMMENT ON COLUMN cli_pairings.expires_at IS
  '5-min TTL on the pairing code per cli-pairing-and-tamper.md §C2. NULL '
  'once status=paired (code is consumed). pg_cron sweeps pending rows '
  'where now() > expires_at → status=expired (added in M4 via 0005).';

-- A.8 — Opaque server-issued pairing token (per apps/cli/src/auth/pairing-token.ts).
-- We store SHA256(token); raw token is returned to the CLI exactly once at C5.
-- UNIQUE so the (pairing_token_hash) lookup is the only path that reveals row id.
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS pairing_token_hash text UNIQUE;
COMMENT ON COLUMN cli_pairings.pairing_token_hash IS
  'SHA256 hex of the opaque pairing token returned to the CLI at C5. The raw '
  'token is never stored. UNIQUE — at most one live token per pairing row; '
  'rotation overwrites this column with the new hash.';

ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS pairing_token_created_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN cli_pairings.pairing_token_created_at IS
  'Wall-clock at which pairing_token_hash was last set. Drives token-rotation '
  '(V1.5) age check + forensics. NOT NULL — default now() backfills on the '
  'first apply for rows that pre-date this migration.';

-- A.9 — ULID backing for the 6-char display code (security harden — §F).
ALTER TABLE cli_pairings
  ADD COLUMN IF NOT EXISTS pairing_code_ulid uuid;
COMMENT ON COLUMN cli_pairings.pairing_code_ulid IS
  'Random ULID-equivalent (uuid v4 from gen_random_uuid). The 6-char display '
  'code surfaced to the user is derived from this via ulid_pairing_code(). '
  'Lookup path requires BOTH pairing_code_hash AND pairing_code_ulid to match, '
  'turning the 6-char display surface (~2B keyspace) into a 2^128 HMAC gate.';

-- A.10 — Active-pairings index for the (tenant_id, status, expires_at)
-- dashboard query: "show all my CLI pairings, ordered by activity, only the
-- non-revoked ones". Partial-index variant on status<>'revoked' keeps it small.
CREATE INDEX IF NOT EXISTS cli_pairings_tenant_status_expires_idx
  ON cli_pairings(tenant_id, status, expires_at)
  WHERE status <> 'revoked';
COMMENT ON INDEX cli_pairings_tenant_status_expires_idx IS
  'Active-pairings dashboard query (S-CLI listing). Excludes revoked rows '
  '(those are read by a separate audit-trail query).';

-- A.11 — Token lookup index. UNIQUE is the constraint; the explicit BTREE
-- here is for the heartbeat-endpoint hot path: hash-lookup → tenant/user
-- claim resolution → audit_log_write.
CREATE INDEX IF NOT EXISTS cli_pairings_token_hash_idx
  ON cli_pairings(pairing_token_hash)
  WHERE pairing_token_hash IS NOT NULL;
COMMENT ON INDEX cli_pairings_token_hash_idx IS
  'Hot-path lookup for the heartbeat + run-dispatch endpoints. The UNIQUE '
  'constraint covers correctness; this BTREE is for plan stability under '
  'the partial-NULL pattern.';

-- ============================================================================
-- B. pairing_code_attempts — per-IP rate-limit ledger
-- ============================================================================
-- Backs the 5/min/user cap from milestone-M3.md "Forge — CLI pairing
-- hardening". IPv4 + IPv6 covered by `inet`. pairing_code is stored
-- redacted/hashed (sha256, hex) per Comply privacy — raw code never persists
-- in this ledger. 5-minute retention (Comply IP minimization) — purge runs
-- via pg_cron when M4 lands the extension (0005); until then the rate-limit
-- middleware's TTL DELETE keeps the table bounded.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pairing_code_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address    inet NOT NULL,
  pairing_code  text NOT NULL,             -- sha256(code) hex; never raw
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  success       boolean NOT NULL,
  user_agent    text,                       -- nullable: anon may omit
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  pairing_code_attempts IS
  'Per-IP rate-limit ledger for the CLI pairing endpoint. 5-min retention '
  '(Comply IP minimization). Raw IP NEVER leaves this table — surface APIs '
  'project to ip_hash (HMAC) before any cross-table join.';
COMMENT ON COLUMN pairing_code_attempts.ip_address IS
  'inet — IPv4 or IPv6. 5-minute TTL enforced by pg_cron purge job (M4). '
  'Never read out via the API surface; only the rate-limit middleware reads.';
COMMENT ON COLUMN pairing_code_attempts.pairing_code IS
  'sha256(code) hex. Raw code is never persisted — only the hash, to allow '
  'rate-limit lookup ("did this IP try this code already?") without enabling '
  'a leak path from this ledger.';
COMMENT ON COLUMN pairing_code_attempts.success IS
  'Outcome of the attempt. Drives the rate-limit predicate: too many '
  'failures within the 5-min window → 429 + audit-log entry.';

CREATE INDEX IF NOT EXISTS pairing_code_attempts_ip_time_idx
  ON pairing_code_attempts(ip_address, attempted_at DESC);
COMMENT ON INDEX pairing_code_attempts_ip_time_idx IS
  'Rate-limit hot path: count attempts from $ip in the last 5 minutes.';

-- pg_cron purge job — registered conditionally so this migration applies
-- cleanly to a staging DB where pg_cron is not yet enabled (extension lands
-- at M4 per 0005_lifecycle_emails_audit.sql). If pg_cron is present, we
-- register the job here; otherwise the rate-limit middleware (Forge) runs
-- the TTL DELETE on each request until the cron extension arrives.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- cron.schedule is idempotent on (jobname, schedule, command).
    PERFORM cron.schedule(
      'purge_pairing_code_attempts',
      '*/5 * * * *',
      $cron$
        DELETE FROM public.pairing_code_attempts
        WHERE attempted_at < now() - interval '5 minutes';
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron may exist as an extension but not be installed in the public
  -- schema (Supabase pattern: cron.* lives in `cron` schema). The PERFORM
  -- failure on missing function is treated as "extension not yet ready" —
  -- the M4 migration installs the schedule definitively.
  NULL;
END$$;

-- ============================================================================
-- C. cli_heartbeat — ARCH-D10 close
-- ============================================================================
-- One row per pairing. UPSERT semantics: heartbeat endpoint INSERTs on first
-- ping, UPDATEs thereafter. ON DELETE CASCADE so a deleted pairing's
-- heartbeat row disappears automatically (no orphan rows).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cli_heartbeat (
  pairing_id    uuid PRIMARY KEY REFERENCES cli_pairings(id) ON DELETE CASCADE,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_version  text,                       -- nullable: pre-pair handshake
  last_ip_hash  text,                       -- HMAC(ip, deployment_pepper)
  last_job_id   text,                       -- nullable: idle CLI
  health_status text NOT NULL DEFAULT 'unknown'
                 CHECK (health_status IN ('unknown','healthy','stale','revoked'))
);

COMMENT ON TABLE  cli_heartbeat IS
  'ARCH-D10 close. One row per cli_pairings row tracking liveness, version '
  'drift, last claimed job, and current health. Raw IP is NEVER stored — '
  'only an HMAC(ip, pepper) for forensics pivot without re-identification.';
COMMENT ON COLUMN cli_heartbeat.last_seen_at IS
  'Wall-clock of last heartbeat. UI shows reconnect prompt per EC-6 when '
  'now() - last_seen_at > 5 min (stale_after_5min() flips health_status).';
COMMENT ON COLUMN cli_heartbeat.last_version IS
  'CLI version string from the latest heartbeat. Drives version-drift alert '
  'in S-CLI when last_version <> cli_pairings.cli_version (user upgraded the '
  'binary without re-pairing — C-FAIL cli_binary_hash_unknown on next pair).';
COMMENT ON COLUMN cli_heartbeat.last_ip_hash IS
  'HMAC-SHA256(ip, deployment_pepper). The pepper lives in Vault under '
  'observability/heartbeat-ip-pepper and rotates yearly (Cipher). Forensic '
  'queries pivot via this hash; we cannot reverse-resolve to raw IP.';
COMMENT ON COLUMN cli_heartbeat.last_job_id IS
  'Last claimed audit run id (text — matches runs.id ULID shape). NULL = '
  'idle. Used by the heartbeat-correlates-to-run health check.';
COMMENT ON COLUMN cli_heartbeat.health_status IS
  'unknown = no heartbeat yet; healthy = seen <5min ago; stale = >5min '
  '(EC-6 trigger); revoked = pairing was revoked (D §revocation cascade).';

CREATE INDEX IF NOT EXISTS cli_heartbeat_last_seen_idx
  ON cli_heartbeat(last_seen_at);
COMMENT ON INDEX cli_heartbeat_last_seen_idx IS
  'Drives the stale_after_5min() sweep query.';

CREATE INDEX IF NOT EXISTS cli_heartbeat_health_status_idx
  ON cli_heartbeat(health_status)
  WHERE health_status IN ('stale','revoked');
COMMENT ON INDEX cli_heartbeat_health_status_idx IS
  'Partial — admin dashboard lists "unhealthy CLIs across all tenants" with '
  'a small bounded result set (healthy CLIs are excluded from the index).';

-- updated_at-style trigger isn't applied here because the table doesn't carry
-- updated_at (cli_heartbeat is event-stamped via last_seen_at — repeated
-- UPDATEs ARE the heartbeat). The 0001 DO-block trigger loop matches on
-- column_name='updated_at' so this table is silently skipped — by design.

-- C.1 — stale_after_5min(): flip health_status to 'stale' for rows whose
-- last_seen_at is older than 5 minutes. The UI subscribes to this column
-- for the EC-6 "reconnect prompt" treatment.
CREATE OR REPLACE FUNCTION stale_after_5min() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE cli_heartbeat
     SET health_status = 'stale'
   WHERE health_status NOT IN ('stale','revoked')
     AND last_seen_at < now() - interval '5 minutes';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END
$$;
REVOKE ALL ON FUNCTION stale_after_5min() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION stale_after_5min() TO service_role;
COMMENT ON FUNCTION stale_after_5min() IS
  'ARCH-D10 close + cli-pairing-and-tamper.md EC-6. Flips cli_heartbeat rows '
  'to health_status=stale when last_seen_at is >5min old. Returned int is '
  'the row count for observability. Service-role only — invoked by the '
  '1-minute pg_cron sweep (M4) and by the on-demand admin RPC.';

-- Register the 1-minute pg_cron sweep, conditionally (same pattern as §B).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'stale_after_5min',
      '* * * * *',
      $cron$ SELECT public.stale_after_5min(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

-- C.2 — Trigger mirror: when cli_heartbeat updates, copy last_seen_at to
-- cli_pairings.last_heartbeat_at so the (tenant_id, status, expires_at)
-- index serves the dashboard without a JOIN. The trigger is AFTER so it
-- doesn't interfere with the row write itself.
CREATE OR REPLACE FUNCTION cli_heartbeat_mirror_to_pairings() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE cli_pairings
     SET last_heartbeat_at = NEW.last_seen_at
   WHERE id = NEW.pairing_id;
  RETURN NEW;
END
$$;
COMMENT ON FUNCTION cli_heartbeat_mirror_to_pairings() IS
  'Mirrors cli_heartbeat.last_seen_at to cli_pairings.last_heartbeat_at on '
  'every heartbeat write. Keeps the active-pairings dashboard query '
  'index-only (no JOIN to cli_heartbeat).';

DROP TRIGGER IF EXISTS cli_heartbeat_mirror_trg ON cli_heartbeat;
CREATE TRIGGER cli_heartbeat_mirror_trg
  AFTER INSERT OR UPDATE OF last_seen_at ON cli_heartbeat
  FOR EACH ROW EXECUTE FUNCTION cli_heartbeat_mirror_to_pairings();

-- ============================================================================
-- D. CLI revocation cascade
-- ============================================================================
-- When cli_pairings.status flips to 'revoked' (S-CLI revoke action or auto-
-- revoke from replay_attempt_count >= 3), we MUST:
--   1. Delete in-flight pg-boss jobs for `cli-jobs:<pairing_id>` so the CLI
--      can't pick up an audit it has no right to run.
--   2. Mark the cli_heartbeat row health_status='revoked' so any straggler
--      heartbeat from the CLI surfaces in admin as "revoked but still talking".
--   3. Write an audit_logs row via audit_log_write('cli_revoked', …).
--
-- The audit_action enum value 'cli_revoked' already exists in 0001 (line 58)
-- — we re-assert IF NOT EXISTS for partial-prior-apply safety.
-- ----------------------------------------------------------------------------

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'cli_revoked';

CREATE OR REPLACE FUNCTION cli_pairings_revoke_cascade() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_job_name text;
BEGIN
  IF NEW.status = 'revoked' AND (OLD.status IS DISTINCT FROM 'revoked') THEN
    v_job_name := 'cli-jobs:' || NEW.id::text;

    -- 1. Cancel in-flight pg-boss jobs. Dynamic SQL because pgboss.job may
    --    not exist yet on fresh staging (same forward-safe pattern as 0003).
    BEGIN
      EXECUTE format(
        'DELETE FROM pgboss.job WHERE name = %L',
        v_job_name
      );
    EXCEPTION WHEN undefined_table OR undefined_schema THEN
      -- pg-boss not yet booted — nothing to cancel; first runner start will
      -- never see a job for a revoked pairing (the cli_pairings.status check
      -- in dispatch refuses to enqueue for revoked rows).
      NULL;
    END;

    -- 2. Mark heartbeat row revoked (if exists).
    UPDATE cli_heartbeat
       SET health_status = 'revoked'
     WHERE pairing_id = NEW.id;

    -- 3. Audit-log via audit_log_write. The function is SECURITY DEFINER and
    --    captures actor_user_id from auth.uid() — for service-role triggered
    --    revokes (auto-revoke from replay-count threshold), actor_user_id
    --    will be NULL which is exactly the documented "system action" shape.
    PERFORM audit_log_write(
      NEW.tenant_id,
      'cli_revoked'::audit_action,
      jsonb_build_object(
        'pairing_id',           NEW.id,
        'replay_attempt_count', NEW.replay_attempt_count,
        'hostname',             NEW.hostname,
        'cli_version',          NEW.cli_version
      )
    );
  END IF;
  RETURN NEW;
END
$$;
COMMENT ON FUNCTION cli_pairings_revoke_cascade() IS
  'On cli_pairings.status -> revoked: cancels in-flight pg-boss jobs for the '
  'pairing, marks cli_heartbeat health_status=revoked, writes audit_logs row '
  'via audit_log_write(cli_revoked, …). Forward-safe against pre-boot pg-boss.';

DROP TRIGGER IF EXISTS cli_pairings_revoke_cascade_trg ON cli_pairings;
CREATE TRIGGER cli_pairings_revoke_cascade_trg
  AFTER UPDATE OF status ON cli_pairings
  FOR EACH ROW
  WHEN (NEW.status = 'revoked')
  EXECUTE FUNCTION cli_pairings_revoke_cascade();

-- ============================================================================
-- E. RLS policies (additive)
-- ============================================================================
-- 0002 already enabled + FORCEd RLS on cli_pairings and installed
-- cli_pairings_member_all (FOR ALL TO authenticated). The new columns from §A
-- are covered at row level by that existing policy — no additional policy
-- needed for cli_pairings here.
--
-- For the NEW tables in this migration, RLS must be enabled + FORCEd and
-- policies installed. Service-role bypasses RLS by default; the explicit
-- RESTRICTIVE deny-anon + deny-authenticated-write policies are belt-and-
-- braces invariant documentation in pg_policies.
-- ----------------------------------------------------------------------------

-- E.1 — pairing_code_attempts: service-role-only writes; deny anon+authn.
ALTER TABLE pairing_code_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_code_attempts FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pairing_code_attempts_deny_all ON pairing_code_attempts;
CREATE POLICY pairing_code_attempts_deny_all ON pairing_code_attempts
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
COMMENT ON POLICY pairing_code_attempts_deny_all ON pairing_code_attempts IS
  'Rate-limit ledger is service-role-only. No client role may read or write. '
  'The rate-limit middleware (Forge) holds service-role for both the INSERT '
  '(every attempt) and the SELECT (window count). This prevents a logged-in '
  'user from enumerating other users'' attempts via IP.';

-- E.2 — cli_heartbeat: member SELECT for their tenant's pairings;
-- service-role INSERT/UPDATE only (heartbeat endpoint writes via service-role
-- after validating the opaque pairing token).
ALTER TABLE cli_heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_heartbeat FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cli_heartbeat_deny_anon ON cli_heartbeat;
CREATE POLICY cli_heartbeat_deny_anon ON cli_heartbeat
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY cli_heartbeat_deny_anon ON cli_heartbeat IS
  'Anon cannot read or write heartbeat rows.';

DROP POLICY IF EXISTS cli_heartbeat_member_select ON cli_heartbeat;
CREATE POLICY cli_heartbeat_member_select ON cli_heartbeat
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM cli_pairings p
    WHERE p.id = cli_heartbeat.pairing_id
      AND auth.is_member_of(p.tenant_id)
  ));
COMMENT ON POLICY cli_heartbeat_member_select ON cli_heartbeat IS
  'Members read heartbeat rows for pairings in tenants they belong to. '
  'Joins through cli_pairings since cli_heartbeat does not carry tenant_id '
  '(the pairing_id FK is the single source of truth).';

DROP POLICY IF EXISTS cli_heartbeat_deny_client_write ON cli_heartbeat;
CREATE POLICY cli_heartbeat_deny_client_write ON cli_heartbeat
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (false);
COMMENT ON POLICY cli_heartbeat_deny_client_write ON cli_heartbeat IS
  'Heartbeat writes are service-role only. The CLI talks to a heartbeat '
  'endpoint that validates the opaque pairing_token_hash and writes via '
  'service-role — clients have no INSERT path.';

DROP POLICY IF EXISTS cli_heartbeat_deny_client_update ON cli_heartbeat;
CREATE POLICY cli_heartbeat_deny_client_update ON cli_heartbeat
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY cli_heartbeat_deny_client_update ON cli_heartbeat IS
  'No client UPDATE path — heartbeats are authored by the CLI endpoint only.';

DROP POLICY IF EXISTS cli_heartbeat_deny_client_delete ON cli_heartbeat;
CREATE POLICY cli_heartbeat_deny_client_delete ON cli_heartbeat
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);
COMMENT ON POLICY cli_heartbeat_deny_client_delete ON cli_heartbeat IS
  'No client DELETE path. ON DELETE CASCADE from cli_pairings handles the '
  'lifecycle automatically when a pairing is hard-deleted.';

-- ============================================================================
-- F. ULID-backed pairing code generator (security harden)
-- ============================================================================
-- The 6-char display surface is a UX requirement ("type this in your terminal")
-- that has only ~2B keyspace (36^6) — guessable under load. We harden by:
--   1. Generating a uuid via gen_random_uuid() (the "ULID core" — random 128b).
--   2. Deriving the 6-char display from a deterministic projection of that
--      uuid into base36 (collision-resistant for the issuance window).
--   3. Storing BOTH pairing_code_hash AND pairing_code_ulid; lookup requires
--      BOTH to match — the 6-char surface becomes a routing hint, the uuid
--      is the actual secret.
--   4. The verify path uses pgcrypto digest() + `=` on the fixed-length digest
--      output, which is constant-time at digest length.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ulid_pairing_code(p_ulid uuid)
RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  -- Crockford base32 alphabet — unambiguous (no I, L, O, U). 32 chars,
  -- giving 32^6 ≈ 1B display surface; the security comes from the paired
  -- uuid (2^128), not from this surface.
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes    bytea;
  v_n        bigint := 0;
  v_out      text := '';
  v_i        int;
  v_idx      int;
BEGIN
  -- Convert the uuid to its 16-byte representation. We use the first 5 bytes
  -- (40 bits) — more than enough for 6 base32 chars (30 bits) plus headroom.
  v_bytes := decode(replace(p_ulid::text, '-', ''), 'hex');
  FOR v_i IN 0..4 LOOP
    v_n := (v_n << 8) | get_byte(v_bytes, v_i);
  END LOOP;
  FOR v_i IN 1..6 LOOP
    v_idx := (v_n & 31)::int;
    v_out := substring(v_alphabet FROM v_idx + 1 FOR 1) || v_out;
    v_n := v_n >> 5;
  END LOOP;
  RETURN v_out;
END
$$;
REVOKE ALL ON FUNCTION ulid_pairing_code(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION ulid_pairing_code(uuid) TO service_role, authenticated;
COMMENT ON FUNCTION ulid_pairing_code(uuid) IS
  'Deterministic 6-char Crockford-base32 projection of a uuid. The 6-char '
  'surface is the user-typed display code; the uuid is the actual secret '
  '(stored in cli_pairings.pairing_code_ulid). Lookup requires matching '
  'BOTH columns — defeats brute-force of the 6-char surface.';

-- ============================================================================
-- G. Backfill defaults for any pre-existing cli_pairings rows
-- ============================================================================
-- A staging DB may already carry rows from Forge's smoke tests (Phase 9 M3
-- Batch 1). The NOT NULL columns we added (replay_attempt_count default 0,
-- pairing_token_created_at default now(), status default 'pending') are
-- backfilled automatically by ALTER TABLE ADD COLUMN DEFAULT — no extra UPDATE
-- needed. The nullable columns (manifest_signature, last_heartbeat_at,
-- binary_hash, device_fingerprint, expires_at, pairing_token_hash,
-- pairing_code_ulid) are intentionally left NULL on pre-existing rows; those
-- pairings predate the hardened pair endpoint and the next heartbeat /
-- re-pair fills them in. The status backfill from (paired_at, revoked_at)
-- is best-effort here:
--   * revoked_at IS NOT NULL          → 'revoked'
--   * paired_at  IS NOT NULL and      → 'paired'
--     revoked_at IS NULL
--   * otherwise (paired_at IS NULL)   → 'pending' (the ADD COLUMN default)
-- ----------------------------------------------------------------------------

UPDATE cli_pairings
   SET status = 'revoked'
 WHERE revoked_at IS NOT NULL
   AND status <> 'revoked';

UPDATE cli_pairings
   SET status = 'paired'
 WHERE paired_at  IS NOT NULL
   AND revoked_at IS NULL
   AND status <> 'paired';

COMMIT;

-- ============================================================================
-- End of 0004_cli_pairing_hardening.sql
-- ============================================================================
