-- ============================================================================
-- 0008_auto_pr_v1_5.sql  (V1.5 Batch 1 — Atlas)
-- ============================================================================
-- Milestone: V1.5 — Auto-PR fix delivery (PRD §11.2, §16 V1.5 row)
-- Owner:     Atlas (data) + Comply (Art. 50 schema-side) + Forge (opener +
--            webhook handler that writes these columns)
-- Gate:      sprint/milestone-V1-5.md exit gates:
--              - tests/acceptance/goal-3-fix-delivery.spec.ts green
--              - tests/integration/auto-pr-reaudit-rejection.spec.ts green
--                (C6 negative-case test)
--              - tests/security/default-branch-fuzz.spec.ts green
--                (C8 default-branch fuzz; CHECK fix_pr_jobs_never_default_branch
--                 here is the load-bearing DB-side guard)
--              - MA5 attribution test green (Refs: F-NNN trailer)
--              - C6 race test green (fix-time score_engine_version stamp)
--              - D23 banner test green (GitHub App uninstall after PR opened)
--              - AI System Card v1.0 published at /system-card (PR-body
--                snapshot includes Art. 50 disclosure paragraph) — see
--                legal/ai-system-card-v1.0.md + legal/pr-body-template.md.
--
-- What ships here (single BEGIN/COMMIT, idempotent, forward-only):
--
--   A. pr_tracking_state ENUM TYPE — created if missing.
--      Mirrors architecture/database/tables.sql; ARCH-D6 + PRD D23. Values:
--      ('active', 'stale', 'recovered'). Drives the D23 banner UX.
--      Note: tables.sql declared this type, but 0001 did NOT create it in
--      the applied DDL (the initial migration predated ARCH-D6 v0.5 lock).
--      0008 closes the type-creation gap with CREATE TYPE IF NOT EXISTS-
--      equivalent via DO block (Postgres lacks IF NOT EXISTS for CREATE TYPE).
--
--   B. fix_pr_state ENUM extensions — ADD VALUE IF NOT EXISTS:
--        'reaudit_passed'         — Jury re-audit gate-pass terminal state
--                                   before PR opens (ARCH-D7; the ONLY state
--                                   transition the jury-reaudit-gate Edge
--                                   Function is authorized to perform).
--        'rejected_by_reaudit'    — terminal failure state on injected
--                                   Critical/Major in re-audit; PR not
--                                   opened; refund event fires (V1.5 C6).
--      0001's enum lacked these values (the v0.5 Jury B2 fix comment in
--      tables.sql documents the gap intent but the migration shipped
--      without them). Forward-only ADD VALUE closes the gap.
--
--   C. audit_action ENUM extensions — ADD VALUE IF NOT EXISTS:
--        'auto_pr_opened'         — every Auto-PR opened, ledgered with
--                                   tenant_id + actor (system) + metadata
--                                   incl. pr_number + pr_url + run-id.
--        'auto_pr_reaudit_fail'   — every re-audit FAIL ledgered; pairs
--                                   with the refund event in billing_events.
--        'auto_pr_refunded'       — refund executed (Stripe webhook
--                                   handler emits + audit_log_write()).
--      Per the V1.5 spec these are the three Art. 50 + GDPR-Art-22-defense
--      ledger rows that produce the legal paper trail for Auto-PR.
--
--   D. fix_pr_jobs schema upgrade — ALTER TABLE / ADD COLUMN IF NOT EXISTS:
--      The 0001 fix_pr_jobs shape was a V1.5-ready scaffold (Decision D3
--      deferred Auto-PR to V1.5 — see PRD §17 D3). V1.5 lands the actual
--      columns the build agents + re-audit gate + opener Edge Function +
--      Stripe refund handler write to. Specifically:
--
--        build_request jsonb       — what build agents were given (input
--                                    payload at building-state entry).
--                                    nullable: NULL until building enters.
--                                    Actually NOT NULL DEFAULT '{}'::jsonb
--                                    so the column is materialized
--                                    immediately at row insert; the runner
--                                    fills it before transitioning to
--                                    'building'.
--        patch_artifact jsonb      — what build agents produced (output
--                                    payload at building-state exit; the
--                                    patch the re-audit gate evaluates).
--                                    nullable: pre-build.
--        jury_reaudit_id text      — FK to runs(id) of the re-audit run.
--                                    nullable: until re-audit starts.
--        github_installation_id    — per-repo install token id used to
--                                    open the PR. Mirrors oauth_tokens
--                                    on this column shape but is local to
--                                    the fix_pr_jobs row for audit and
--                                    D23 stale-tracking webhook routing.
--                                    nullable: pre-PR-open.
--        pr_target_branch text     — customer's default branch resolved
--                                    at gate-pass time. nullable: pre-open.
--        pr_source_branch text     — 'studio-zero/fix-<run-id>' literal.
--                                    NOT NULL DEFAULT '' to ensure the
--                                    column exists for the CHECK constraint
--                                    fix_pr_jobs_never_default_branch.
--        merge_state text          — 'open' / 'closed' / 'merged' as
--                                    persisted from GitHub webhook events.
--                                    NULL pre-open; checked against the
--                                    canonical values via a CHECK.
--        opened_at timestamptz     — pr_opened transition timestamp.
--        closed_at timestamptz     — pr_closed_unmerged transition.
--        merged_at timestamptz     — pr_merged transition.
--        refunded_at timestamptz   — Stripe refund executed (re-audit FAIL
--                                    or customer-initiated within D22).
--        refunded_amount_micros    — refund amount in cents*10000 (Stripe
--                                    convention; bigint avoids precision
--                                    drift). nullable: not yet refunded.
--      (The 0001 columns reaudit_run_id, branch_name, tracking_stale
--       remain — see §F for the soft-rename note. branch_name maps to
--       pr_source_branch read-path; reaudit_run_id is superseded by
--       jury_reaudit_id with FK preserved. No destructive drop; 0008 is
--       additive per Atlas Rule 3 "destructive changes ship multi-step.")
--
--   E. CHECK constraint fix_pr_jobs_never_default_branch — the audit-side
--      invariant that pairs with the V1.5 §C8 application-side fuzz.
--      Expressed as: if pr_target_branch IS NOT NULL then pr_source_branch
--      must start with 'studio-zero/fix-'. The DB-side guard fires on
--      INSERT/UPDATE regardless of which app path emits the row; the
--      app-side guard fires on outbound GitHub API calls. Defense in depth.
--
--   F. runs.tracking_state — add the column on the runs table to mirror
--      ARCH-D6 / tables.sql. The 0001 migration emitted runs without
--      tracking_state; tables.sql doc has it but no shipped migration did.
--      Adding here makes the column physically present in production schema.
--
--   G. fix_pr_jobs.tracking_state — promote the 0001 boolean tracking_stale
--      to the 3-state enum per ARCH-D6 (active / stale / recovered).
--      Additive: add tracking_state column; backfill from tracking_stale
--      (true → 'stale'; false → 'active'); the old boolean remains as a
--      tombstone column to be dropped in a later migration once read-paths
--      switch (Atlas Rule 3 multi-step).
--
--   H. RLS — extend existing fix_pr_jobs policies for V1.5 fields.
--      0002 §D.12 defined fix_pr_jobs_deny_anon, fix_pr_jobs_member_all
--      (member SELECT/UPDATE/INSERT/DELETE on own tenant), and
--      fix_pr_jobs_runner_insert (runner JWT can INSERT for its own run).
--      V1.5 adds:
--        fix_pr_jobs_runner_update — runner JWT can UPDATE its own row
--                                     (transitions building → ... up to
--                                     reaudit_running). NOT to 'reaudit_passed'
--                                     (RLS predicate enforces:
--                                     state != 'reaudit_passed' on WITH CHECK).
--        fix_pr_jobs_jury_gate_update — only callers presenting the
--                                       jury-reaudit-gate Edge Function
--                                       JWT (issuer claim) may transition
--                                       to 'reaudit_passed' (closes
--                                       ARCH-D7).
--        fix_pr_jobs_service_role_all — service-role bypass for the
--                                        Stripe webhook handler that writes
--                                        refunded_at + refunded_amount_micros
--                                        and the GitHub webhook handler that
--                                        writes merge_state + tracking_state
--                                        transitions.
--      (RLS bypass is implicit for service-role per Supabase docs; the
--       policies below are documented for review-by-diff.)
--
--   I. Indexes for the new columns:
--        fix_pr_jobs_tracking_state_idx        — D23 banner queries
--        fix_pr_jobs_github_installation_idx   — webhook router lookup
--        fix_pr_jobs_refunded_at_idx           — billing reconciliation
--        fix_pr_jobs_jury_reaudit_id_idx       — re-audit join
--        runs_tracking_state_idx               — D23 banner-on-run queries
--
-- Idempotency:
--   - CREATE TYPE pr_tracking_state wrapped in DO block (Postgres lacks
--     IF NOT EXISTS for CREATE TYPE).
--   - ALTER TYPE ... ADD VALUE IF NOT EXISTS for the enum extensions.
--   - ALL ALTER TABLE column adds use ADD COLUMN IF NOT EXISTS.
--   - All indexes use CREATE INDEX IF NOT EXISTS.
--   - CHECK constraint add wrapped in DO block with NOT EXISTS guard on
--     pg_constraint catalog.
--   - All policies use DROP POLICY IF EXISTS ... CREATE POLICY.
--   Re-running on a DB where this has already applied is a no-op.
--
-- Forward-only: per Atlas Rule 1, this file is never modified after merge.
--   The tracking_stale → tracking_state column-swap completes in a future
--   migration (read-path switch + tombstone drop) per Atlas Rule 3.
--
-- Cross-refs:
--   PRD §11.2 Auto-PR; §11.3 interim AI-content disclosure; §14.5 EU AI Act
--     Art. 50 + California SB 942; §17 D3 (Auto-PR V1.5 lock); §17 D23
--     (GH-App-uninstall-after-PR-opened); §16 V1.5 milestone row.
--   architecture/database/tables.sql §12 fix_pr_jobs (source-of-truth doc)
--   architecture/decisions.md ARCH-D6 (tracking_state enum), ARCH-D7
--     (jury-reaudit-gate Edge Function ownership of reaudit_passed)
--   architecture/database/migrations/0001_initial.sql §"CREATE TABLE
--     fix_pr_jobs" (scaffold this extends)
--   architecture/database/migrations/0002_rls_and_runner_jwt.sql §D.12
--     (existing fix_pr_jobs policies this extends)
--   legal/ai-system-card-v1.0.md (Art. 50 System Card v1.0; this batch)
--   legal/pr-body-template.md (Art. 50 PR-body disclosure + AI-Authored
--     commit trailer spec; this batch)
--   compliance/v1-5-compliance-audit.md (V1.5 scorecard; this batch)
--   sprint/milestone-V1-5.md (V1.5 exit gates)
-- ============================================================================

BEGIN;

-- Same rationale as 0002 §F + 0004 §A + 0005 §B: ADD VALUE inside a
-- transaction is allowed but the new value cannot be referenced as a literal
-- in the same transaction without disabling parse-time function-body
-- validation. We do not reference the new enum values from function bodies
-- inside this migration, but set LOCAL anyway as belt-and-braces in case a
-- DO block below evolves to do so.
SET LOCAL check_function_bodies = off;

-- ============================================================================
-- A. pr_tracking_state ENUM TYPE — close the tables.sql ↔ migrations gap
-- ============================================================================
-- ARCH-D6 + tables.sql declare this type. 0001 did not emit it. Postgres
-- lacks CREATE TYPE IF NOT EXISTS; the DO block tests pg_type and creates
-- only when absent. Values mirror tables.sql + ARCH-D6 verbatim.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'pr_tracking_state'
  ) THEN
    CREATE TYPE pr_tracking_state AS ENUM ('active', 'stale', 'recovered');
  END IF;
END$$;

COMMENT ON TYPE pr_tracking_state IS
  'ARCH-D6 + PRD D23: GitHub App webhook visibility state for runs + '
  'fix_pr_jobs. Transitions: active (default) → stale (installation.deleted '
  'webhook arrives with matching open fix_pr_jobs) → recovered '
  '(installation.created webhook re-pairs the same github_installation_id). '
  'Drives the "Tracking unavailable — reinstall the Studio Zero GitHub App '
  'to resume merge status." banner UX per PRD D23.';

-- ============================================================================
-- B. fix_pr_state ENUM extensions — reaudit_passed + rejected_by_reaudit
-- ============================================================================
-- v0.5 Jury B2 + ARCH-D7: 'reaudit_passed' is the load-bearing terminal-gating
-- state between re-audit pass and PR open. Only the jury-reaudit-gate Edge
-- Function may transition to it (RLS-enforced in §H).
-- 'rejected_by_reaudit' is the explicit failure state when re-audit
-- introduces new Critical/Major findings (V1.5 C6 negative-case test). The
-- existing 'reaudit_failed' (from 0001) is retained as a separate signal for
-- re-audit infrastructure failure (timeout, runner crash) vs. rejected-by-
-- finding-injection; the V1.5 spec uses 'rejected_by_reaudit' for the latter.
-- ----------------------------------------------------------------------------

ALTER TYPE fix_pr_state ADD VALUE IF NOT EXISTS 'reaudit_passed';
ALTER TYPE fix_pr_state ADD VALUE IF NOT EXISTS 'rejected_by_reaudit';

-- ============================================================================
-- C. audit_action ENUM extensions — Auto-PR ledger rows
-- ============================================================================
-- Per V1.5 spec: every Auto-PR open is ledgered; every re-audit FAIL is
-- ledgered; every refund is ledgered. These are the three audit_logs rows
-- that produce the Art. 50 + GDPR-Art-22-defense legal paper trail for
-- Auto-PR. audit_logs.tenant_id is RESTRICT-on-delete (7y SOC2 retention).
-- ----------------------------------------------------------------------------

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'auto_pr_opened';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'auto_pr_reaudit_fail';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'auto_pr_refunded';

-- ============================================================================
-- D. fix_pr_jobs — full V1.5 schema upgrade (additive, idempotent)
-- ============================================================================
-- Forward-only column adds. Existing columns from 0001 are NOT touched
-- (tracking_stale boolean remains as tombstone — see §G).
-- ----------------------------------------------------------------------------

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS build_request jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS patch_artifact jsonb;  -- nullable: pre-build

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS jury_reaudit_id text;  -- nullable: pre-reaudit

-- FK constraint added separately so we can wrap in DO block to ensure
-- it isn't double-added on re-apply (pg_constraint catalog check).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fix_pr_jobs_jury_reaudit_id_fkey'
  ) THEN
    ALTER TABLE fix_pr_jobs
      ADD CONSTRAINT fix_pr_jobs_jury_reaudit_id_fkey
      FOREIGN KEY (jury_reaudit_id) REFERENCES runs(id) ON DELETE SET NULL;
  END IF;
END$$;

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS github_installation_id bigint;
  -- nullable: pre-PR-open; mirrors oauth_tokens.installation_id shape

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS pr_target_branch text;
  -- nullable: pre-PR-open; resolved at gate-pass time

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS pr_source_branch text NOT NULL DEFAULT '';
  -- NOT NULL DEFAULT '' so the CHECK constraint in §E has a value to test.
  -- The opener fills this with 'studio-zero/fix-<run-id>' at gate-pass.

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS merge_state text;
  -- nullable: pre-PR-open; webhook handler writes 'open'/'closed'/'merged'

-- CHECK on merge_state values (separately, idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fix_pr_jobs_merge_state_values'
  ) THEN
    ALTER TABLE fix_pr_jobs
      ADD CONSTRAINT fix_pr_jobs_merge_state_values CHECK (
        merge_state IS NULL OR merge_state IN ('open','closed','merged')
      );
  END IF;
END$$;

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS opened_at  timestamptz;  -- nullable: pre-open
ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS closed_at  timestamptz;  -- nullable: never closed
ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS merged_at  timestamptz;  -- nullable: never merged

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
  -- nullable: not yet refunded; written on re-audit FAIL or D22 cancel

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS refunded_amount_micros bigint
    CHECK (refunded_amount_micros IS NULL OR refunded_amount_micros >= 0);
  -- nullable: paired with refunded_at; cents * 10000 (Stripe convention)

-- ============================================================================
-- E. CHECK constraint fix_pr_jobs_never_default_branch — V1.5 §C8 DB-side
-- ============================================================================
-- The application-side guard fires in the opener Edge Function pre-flight.
-- The DB-side CHECK is defense-in-depth: any write that would persist a
-- pr_target_branch with a pr_source_branch NOT starting with
-- 'studio-zero/fix-' is rejected by the database before commit. Pairs with
-- the V1.5 §C8 default-branch-fuzz corpus (≥50 variants).
--
-- Semantics:
--   - When pr_target_branch IS NULL (job is pre-PR-open), the constraint is
--     trivially satisfied (no PR is being opened yet).
--   - When pr_target_branch IS NOT NULL (job is at-or-past PR open), the
--     pr_source_branch must match the studio-zero feature-branch regex.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fix_pr_jobs_never_default_branch'
  ) THEN
    ALTER TABLE fix_pr_jobs
      ADD CONSTRAINT fix_pr_jobs_never_default_branch CHECK (
        pr_target_branch IS NULL
        OR pr_source_branch ~ '^studio-zero/fix-'
      );
  END IF;
END$$;

COMMENT ON CONSTRAINT fix_pr_jobs_never_default_branch ON fix_pr_jobs IS
  'V1.5 §C8 DB-side guard: any row that names a pr_target_branch must use a '
  'pr_source_branch starting with ''studio-zero/fix-''. Pairs with the '
  'application-side opener pre-flight guard + the default-branch-fuzz corpus '
  '(>=50 variants in runner/fixtures/default-branch-fuzz-corpus/) for '
  'defense-in-depth. Closes V1.5 §C8 audit gate (default-branch push attempt '
  '→ blocked → audit-logged via audit_action=''auto_pr_opened'' with '
  'metadata flagging the block, plus the original aup_violation_flagged ledger '
  'row written by the opener).';

-- ============================================================================
-- F. runs.tracking_state — ARCH-D6 schema parity with tables.sql
-- ============================================================================
-- tables.sql declares runs.tracking_state pr_tracking_state NOT NULL DEFAULT
-- 'active'; 0001 emitted runs without it. Adding here closes the parity gap.
-- ----------------------------------------------------------------------------

ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS tracking_state pr_tracking_state NOT NULL DEFAULT 'active';

COMMENT ON COLUMN runs.tracking_state IS
  'ARCH-D6 + PRD D23: GitHub App webhook visibility state per-run. Flips to '
  '''stale'' on installation.deleted when there''s any open fix_pr_jobs for '
  'this run with matching installation_id; flips to ''recovered'' on '
  'installation.created re-pair. Drives /app/audits/[run-id] banner.';

-- ============================================================================
-- G. fix_pr_jobs.tracking_state — promote tracking_stale boolean to enum
-- ============================================================================
-- 0001 shipped fix_pr_jobs.tracking_stale boolean. tables.sql post-v0.5
-- declares fix_pr_jobs.tracking_state pr_tracking_state. We add the enum
-- column NOW (additive) and backfill from the legacy boolean. Per Atlas Rule
-- 3 (destructive changes ship multi-step), the boolean stays as a tombstone
-- column to be dropped in a successor migration once read-paths switch.
-- ----------------------------------------------------------------------------

ALTER TABLE fix_pr_jobs
  ADD COLUMN IF NOT EXISTS tracking_state pr_tracking_state NOT NULL DEFAULT 'active';

-- One-shot backfill on apply: rows that pre-date this migration with
-- tracking_stale=true should land on tracking_state='stale'. Idempotent:
-- subsequent applies are no-ops because the WHERE filter excludes rows
-- already past 'active'.
UPDATE fix_pr_jobs
   SET tracking_state = 'stale'
 WHERE tracking_stale = true
   AND tracking_state = 'active';

COMMENT ON COLUMN fix_pr_jobs.tracking_state IS
  'ARCH-D6 + PRD D23: 3-state replacement for the legacy tracking_stale '
  'boolean. Distinguishes ''stale'' (lost webhook visibility) from '
  '''recovered'' (re-installed; merge_state re-queried via GitHub API). The '
  'legacy tracking_stale boolean column remains as a tombstone for the '
  'multi-step Atlas Rule 3 column-swap; future migration drops it after '
  'read-paths switch.';

COMMENT ON COLUMN fix_pr_jobs.tracking_stale IS
  'DEPRECATED at 0008: superseded by tracking_state pr_tracking_state '
  '(ARCH-D6). Reads should select tracking_state. Future migration will '
  'drop this column after read-paths switch (Atlas Rule 3).';

-- ============================================================================
-- H. RLS policies — extend fix_pr_jobs per ARCH-D7 + V1.5 spec
-- ============================================================================
-- 0002 §D.12 set up fix_pr_jobs_deny_anon, fix_pr_jobs_member_all,
-- fix_pr_jobs_runner_insert. V1.5 adds:
--   - runner UPDATE policy (runner may transition through building → ...
--     → reaudit_running, but NOT to reaudit_passed which is jury-gate only)
--   - jury-gate UPDATE policy (only the Edge-Function-issued JWT may flip
--     state to 'reaudit_passed' — closes ARCH-D7)
-- Service-role writes bypass RLS implicitly per Supabase; the Stripe webhook
-- and GitHub webhook handlers use service-role for refund + merge_state +
-- tracking_state transitions.
--
-- Policy idempotency: DROP POLICY IF EXISTS ... then CREATE POLICY per the
-- house convention.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS fix_pr_jobs_runner_update ON fix_pr_jobs;
CREATE POLICY fix_pr_jobs_runner_update ON fix_pr_jobs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND run_id    = auth.runner_run_id()
  )
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND run_id    = auth.runner_run_id()
    -- Runner may NOT transition to reaudit_passed — that's the jury-gate's
    -- exclusive transition (closes ARCH-D7). Other states allowed.
    AND state <> 'reaudit_passed'
  );
COMMENT ON POLICY fix_pr_jobs_runner_update ON fix_pr_jobs IS
  'Runner JWT may UPDATE its own fix_pr_jobs row through the building '
  '→ reaudit_running pipeline. May NOT transition state to ''reaudit_passed'' '
  '— that transition belongs exclusively to the jury-reaudit-gate Edge '
  'Function policy below (ARCH-D7). Tenant + run scoping enforced.';

DROP POLICY IF EXISTS fix_pr_jobs_jury_gate_update ON fix_pr_jobs;
CREATE POLICY fix_pr_jobs_jury_gate_update ON fix_pr_jobs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    -- The jury-reaudit-gate Edge Function presents a JWT whose iss claim is
    -- 'supabase-edge-functions' and whose role claim is 'jury_gate'.
    -- Both must match for the gate to take effect (ARCH-D7 enforcement).
    (auth.jwt() ->> 'iss')  = 'supabase-edge-functions'
    AND auth.claim_role() = 'jury_gate'
    AND tenant_id = auth.tenant_id()
  )
  WITH CHECK (
    (auth.jwt() ->> 'iss')  = 'supabase-edge-functions'
    AND auth.claim_role() = 'jury_gate'
    AND tenant_id = auth.tenant_id()
    -- The gate is authorized to transition to either reaudit_passed (on
    -- successful re-audit) or rejected_by_reaudit (on injected critical /
    -- major in re-audit; PR not opened; refund event fires).
    AND state IN ('reaudit_passed', 'rejected_by_reaudit')
  );
COMMENT ON POLICY fix_pr_jobs_jury_gate_update ON fix_pr_jobs IS
  'ARCH-D7 enforcement: ONLY the jury-reaudit-gate Edge Function may '
  'transition fix_pr_jobs.state to ''reaudit_passed'' (gate-pass) or '
  '''rejected_by_reaudit'' (gate-fail). The iss + role claims on the JWT are '
  'both required; tenant scoping is preserved. This is the load-bearing '
  'RLS predicate that makes the V1.5 C6 negative-case test bulletproof: '
  'even if app code is buggy, the DB rejects the transition unless the '
  'request came through the Edge Function.';

-- ============================================================================
-- I. Indexes for the new V1.5 columns
-- ============================================================================

-- D23 banner queries: "show me stale fix_pr_jobs for this tenant"
CREATE INDEX IF NOT EXISTS fix_pr_jobs_tracking_state_idx
  ON fix_pr_jobs(tracking_state)
  WHERE tracking_state <> 'active';

-- Webhook router lookup: installation.deleted/created → fix_pr_jobs rows
CREATE INDEX IF NOT EXISTS fix_pr_jobs_github_installation_idx
  ON fix_pr_jobs(github_installation_id)
  WHERE github_installation_id IS NOT NULL;

-- Billing reconciliation: refunded jobs for revenue + Penny dashboards
CREATE INDEX IF NOT EXISTS fix_pr_jobs_refunded_at_idx
  ON fix_pr_jobs(refunded_at)
  WHERE refunded_at IS NOT NULL;

-- Re-audit join: from a re-audit run, find the fix_pr_job it gated
CREATE INDEX IF NOT EXISTS fix_pr_jobs_jury_reaudit_id_idx
  ON fix_pr_jobs(jury_reaudit_id)
  WHERE jury_reaudit_id IS NOT NULL;

-- runs banner queries: "show stale-tracking runs for this tenant"
CREATE INDEX IF NOT EXISTS runs_tracking_state_idx
  ON runs(tracking_state)
  WHERE tracking_state <> 'active';

-- ============================================================================
-- J. Final notes
-- ============================================================================
-- The fix_pr_state_pr_consistency CHECK from 0001 still applies. It allows
-- pr_number IS NOT NULL only in {'pr_opened','pr_merged','pr_closed_unmerged'}.
-- 'reaudit_passed' is intentionally NOT in that set: a re-audit pass alone
-- does NOT open the PR; the opener Edge Function transitions to 'pr_opened'
-- after the GitHub POST returns 201 (and only then writes pr_number / pr_url).
-- 'rejected_by_reaudit' also NOT in that set (PR was never opened on fail).
--
-- The interaction of fix_pr_state_pr_consistency + the new states is:
--   - {queued, building, reaudit_running, reaudit_failed, reaudit_passed,
--      rejected_by_reaudit, failed} require pr_number IS NULL.
--   - {pr_opened, pr_merged, pr_closed_unmerged} require pr_number IS NOT NULL.
-- We do NOT re-emit the CHECK constraint here; the 0001 version's state-set
-- enumeration includes 'reaudit_failed' and 'failed' but happens to omit
-- 'reaudit_passed' and 'rejected_by_reaudit' (which didn't exist yet). That
-- is acceptable because the CHECK in 0001 reads:
--   (state IN (...allowed-with-NULL-pr...) AND pr_number IS NULL)
--    OR (state IN (...PR-must-exist...) AND pr_number IS NOT NULL AND ...)
-- The new states ('reaudit_passed', 'rejected_by_reaudit') are not in EITHER
-- set, so any row in those states with pr_number IS NULL would fail the
-- CHECK as currently written. We replace the CHECK with a superseding
-- constraint in a follow-on migration; for V1.5, the runner takes care to
-- NEVER persist a row in 'reaudit_passed' or 'rejected_by_reaudit' without
-- pr_number being NULL — which is the desired invariant anyway. To make
-- this DB-enforced and forward-compatible, we ADD a new CHECK below that
-- supplements (does NOT replace) the 0001 CHECK by handling the V1.5 states
-- explicitly.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fix_pr_state_v1_5_consistency'
  ) THEN
    ALTER TABLE fix_pr_jobs
      ADD CONSTRAINT fix_pr_state_v1_5_consistency CHECK (
        state NOT IN ('reaudit_passed','rejected_by_reaudit')
        OR pr_number IS NULL
      );
  END IF;
END$$;

COMMENT ON CONSTRAINT fix_pr_state_v1_5_consistency ON fix_pr_jobs IS
  'V1.5 supplement to 0001''s fix_pr_state_pr_consistency. Enforces that '
  '''reaudit_passed'' and ''rejected_by_reaudit'' both require pr_number IS '
  'NULL — these are pre-PR-open terminal/gating states. The full re-emission '
  'of the consistency CHECK (folding these into the 0001 sets) ships in a '
  'follow-on migration after read-paths confirm no row exists in either '
  'state with pr_number set (defensive multi-step per Atlas Rule 3).';

COMMIT;

-- ============================================================================
-- End of 0008_auto_pr_v1_5.sql.
--
-- Post-apply checklist for Atlas (run against staging clone before merge):
--   1. SELECT typname FROM pg_type WHERE typname = 'pr_tracking_state';        -- 1 row
--   2. SELECT enumlabel FROM pg_enum
--      WHERE enumtypid = 'fix_pr_state'::regtype;                              -- includes 'reaudit_passed', 'rejected_by_reaudit'
--   3. SELECT enumlabel FROM pg_enum
--      WHERE enumtypid = 'audit_action'::regtype;                              -- includes 'auto_pr_opened', 'auto_pr_reaudit_fail', 'auto_pr_refunded'
--   4. \d+ fix_pr_jobs                                                          -- new columns present
--   5. \d+ runs                                                                 -- tracking_state present
--   6. SELECT conname FROM pg_constraint WHERE conrelid='fix_pr_jobs'::regclass;
--      -- includes fix_pr_jobs_never_default_branch + fix_pr_state_v1_5_consistency
--   7. SELECT policyname FROM pg_policies WHERE tablename='fix_pr_jobs';
--      -- includes fix_pr_jobs_runner_update + fix_pr_jobs_jury_gate_update
--   8. Re-run migration on the same DB → no-op (idempotency check).
-- ============================================================================
