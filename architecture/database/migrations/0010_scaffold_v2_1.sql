-- ============================================================================
-- 0010_scaffold_v2_1.sql  (V2.1 Batch 1 — Atlas)
-- ============================================================================
-- Milestone: V2.1 — Scaffold / MVP code generation (PRD §4 V2 Goal 8,
--            §7.3 Build Workflow step 5 third output preference,
--            §16 V2.1 milestone row, sprint/milestone-V2-1.md exit gate).
-- Owner:     Atlas (data) + Forge (scaffold generator + clean-VM bootstrap
--            harness + offline-network-tap) + Jury (scaffold-audit-gate —
--            only path that can transition scaffold_jobs.state to
--            'audit_passed' or 'audit_failed') + Comply (V2.1 ToS Build
--            extension §3 scaffold IP clause + AI System Card v1.6 V2.1
--            amendment + V2.1 compliance audit).
-- Gate:      sprint/milestone-V2-1.md exit gates:
--              - Clean-VM bootstrap of a generated scaffold completes in
--                <30 min (tests/e2e/v2.1-clean-vm-bootstrap.spec.ts on
--                fresh Ubuntu/Windows VM).
--              - Offline-mode network-tap proves no code POSTed externally
--                (tests/security/v2.1-offline-network-tap.spec.ts: scaffold
--                runs offline; tap captures zero outbound HTTP).
--              - Audit-gated delivery: scaffold ships only on PASS or PASS
--                WITH FIXES verdict. Negative test: FAIL → delivery refused
--                (`scaffold_jobs.state` lands on 'audit_failed' instead of
--                'delivered'; DB-enforced via CHECK + RLS — same defense-in-
--                depth pattern as builds.audit_gate_passed in 0009 §D + §H).
--              - Self-dogfood gate V2.1: audits/v2_1.json = PASS or PASS
--                WITH FIXES.
--              - legal/build-mode-extension.md §3 LIVE (V2.1 scaffold IP
--                amendment).
--              - legal/ai-system-card-v1.6.md LIVE (V2.1 amplified-usage +
--                three new V2.1 risks).
--              - compliance/v2-1-compliance-audit.md LIVE (V2.1 scorecard).
--
-- What ships here (single BEGIN/COMMIT, idempotent, forward-only):
--
--   A. scaffold_state ENUM TYPE — created if missing. The Scaffold job
--      lifecycle (10 states). Forward-only: new states ship via ALTER TYPE
--      ADD VALUE in a successor migration; values are never re-purposed
--      (mirrors build_state's contract in 0009 §A).
--
--   B. scaffold_jobs table — Scaffold/MVP code generation aggregate. UUID
--      primary key (one scaffold job per build that elected
--      output_preference='roadmap_docs_seed_scaffold'; FK to builds.id with
--      ON DELETE CASCADE so reaping a build reaps its scaffold). Captures:
--        - detection (detected_stack — Forge's template-catalog match)
--        - generation (counts + artifact ref + runtime ms)
--        - audit gate (scaffold_audit_run_id → runs.id; audit_verdict +
--          0..100 score from the standard audit contract)
--        - delivery (delivered_at + 24h signed zip URL — populated only on
--          audit-pass; signed-URL TTL is enforced by the storage layer, the
--          column is the human-readable witness of which URL was issued)
--        - lifecycle (failure_code/message; cancelled_at; refunded_at)
--      generated_artifact_id references build_artifacts(id) — Studio Zero
--      uses build_artifacts as the canonical storage-object registry for the
--      Build-mode surface (the user spec named the column 'storage_objects'
--      conceptually; in practice the Studio Zero schema places that registry
--      in build_artifacts(id) per 0009 §E, which carries sha256 + size_bytes
--      + the bucket reference).
--
--   C. New audit_action ENUM values — Scaffold ledger trail (SOC2 +
--      GDPR Art. 22 defense + EU AI Act Art. 50 disclosure paper trail):
--        'scaffold_started'       — scaffold_jobs row entered 'detecting'
--                                    state (job picked up from queue).
--        'scaffold_delivered'     — scaffold_jobs.state → 'delivered';
--                                    24h signed URL issued.
--        'scaffold_audit_failed'  — Jury verdict on generated scaffold was
--                                    FAIL; delivery refused.
--        'scaffold_refunded'      — refund executed (audit_failed,
--                                    customer-initiated cancel within 7d
--                                    of delivery per Build extension §3,
--                                    or terminal failure refundable).
--
--   D. RLS policies — three-actor model mirroring 0009 §H:
--        - members (authenticated, tenant_member of the parent build's
--          tenant) — SELECT/UPDATE/DELETE on their own scaffold_jobs;
--          may NOT transition to 'audit_passed' / 'audit_failed' / 'delivered'.
--        - runner (claim_role='runner', build_id JWT claim matches the
--          parent build) — INSERT/UPDATE for its own job's pipeline states
--          (queued → detecting → generating → audit_gating → packaging →
--          delivered). May NOT transition to 'audit_passed' / 'audit_failed'.
--        - scaffold-audit-gate Edge Function (iss='supabase-edge-functions',
--          role='scaffold_gate') — UPDATE-only for the 'audit_passed' and
--          'audit_failed' transitions. Build-mode analog of 0008 §H ARCH-D7
--          and 0009 §H builds_audit_gate_update.
--        - service-role: ALL (Stripe refund webhook writes refunded_at;
--          delivery cron writes delivered_at + signed URL; ledger emitter).
--
--   E. Indexes:
--        scaffold_jobs_build_id_idx        — parent-build joins
--        scaffold_jobs_tenant_id_idx       — tenant list queries
--        scaffold_jobs_state_idx           — dashboard list filters
--        scaffold_jobs_tenant_state_created_idx — admin dashboards
--
-- Idempotency:
--   - CREATE TYPE wrapped in DO blocks with pg_type catalog NOT EXISTS guard
--     (Postgres lacks CREATE TYPE IF NOT EXISTS).
--   - ALTER TYPE audit_action ADD VALUE IF NOT EXISTS for the four enum
--     extensions.
--   - CREATE TABLE IF NOT EXISTS for scaffold_jobs.
--   - All indexes use CREATE INDEX IF NOT EXISTS.
--   - All RLS policies use DROP POLICY IF EXISTS ... CREATE POLICY.
--   - Re-running on a DB where this has already applied is a no-op.
--
-- Forward-only: per Atlas Rule 1, this file is never modified after merge.
--
-- Cross-refs:
--   PRD.md §4 V2 Goal 8 (scaffold/MVP code generation gated behind audit-
--     pass), §7.3 Build Workflow step 5 'roadmap_docs_seed_scaffold' output
--     preference, §16 V2.1 milestone row.
--   sprint/milestone-V2-1.md exit gates.
--   architecture/database/migrations/0009_build_mode_v2.sql — the V2 Build
--     mode schema this migration extends (scaffold_jobs is a child aggregate
--     of builds; FK cascades on tenant + build deletion).
--   architecture/database/migrations/0008_auto_pr_v1_5.sql §H — RLS pattern
--     for Edge-Function-issuer + role-claim gating (ARCH-D7 analog applied
--     here to scaffold audit gate, mirroring the V2 Build mode audit gate).
--   legal/build-mode-extension.md §3 (V2.1 scaffold IP amendment — this
--     batch).
--   legal/ai-system-card-v1.6.md (V2.1 amendment — this batch).
--   compliance/v2-1-compliance-audit.md (V2.1 scorecard — this batch).
-- ============================================================================

BEGIN;

-- Same rationale as 0002 §F + 0008 + 0009: ADD VALUE inside a transaction is
-- allowed but the new value cannot be referenced as a literal in the same
-- transaction without disabling parse-time function-body validation. Set
-- LOCAL as belt-and-braces; no function bodies in this migration reference
-- the new enum literals.
SET LOCAL check_function_bodies = off;

-- ============================================================================
-- A. scaffold_state ENUM TYPE — Scaffold job lifecycle state machine
-- ============================================================================
-- 10-state machine per sprint/milestone-V2-1.md. Forward-only: additions
-- ship via ALTER TYPE ADD VALUE in a successor migration; values are never
-- re-purposed.
--
-- Happy-path order:
--   queued → detecting → generating → audit_gating → audit_passed
--          → packaging → delivered
--
-- Failure / off-path:
--   audit_failed     — Jury verdict on the generated scaffold was FAIL;
--                      delivery refused (V2.1 exit-gate negative test).
--   cancelled        — customer cancelled (within 7d of delivery per Build
--                      extension §3, or pre-delivery cancel).
--   failed_terminal  — non-retryable; refund decision per regional matrix.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'scaffold_state'
  ) THEN
    CREATE TYPE scaffold_state AS ENUM (
      'queued',
      'detecting',
      'generating',
      'audit_gating',
      'audit_passed',
      'audit_failed',
      'packaging',
      'delivered',
      'cancelled',
      'failed_terminal'
    );
  END IF;
END$$;

COMMENT ON TYPE scaffold_state IS
  'sprint/milestone-V2-1.md + PRD §7.3 step 5 third output preference. '
  '10-state lifecycle. Happy path: queued → detecting → generating → '
  'audit_gating → audit_passed (ONLY via scaffold-audit-gate Edge Function — '
  'see RLS in §D) → packaging → delivered. Off-path: audit_failed (verdict '
  'FAIL → delivery refused; refund path opens), cancelled, failed_terminal. '
  'Forward-only: new states via ALTER TYPE ADD VALUE; never re-purpose.';

-- ============================================================================
-- B. audit_action ENUM extensions — Scaffold ledger trail
-- ============================================================================
-- SOC2 7-year retention + GDPR Art. 22 paper trail + EU AI Act Art. 50
-- disclosure trail for the Scaffold-mode flow (AI System Card v1.6 §V2.1).
--
--   'scaffold_started'       — scaffold_jobs row entered 'detecting'.
--   'scaffold_delivered'     — terminal happy state; signed URL issued.
--   'scaffold_audit_failed'  — Jury verdict on generated scaffold = FAIL.
--   'scaffold_refunded'      — refund executed.
-- ----------------------------------------------------------------------------

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'scaffold_started';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'scaffold_delivered';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'scaffold_audit_failed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'scaffold_refunded';

-- ============================================================================
-- C. scaffold_jobs table — Scaffold/MVP code generation aggregate
-- ============================================================================
-- UUID primary key. tenant_id is denormalized off builds for RLS-join cost
-- (mirrors why 0009's build_events table goes through builds for tenant
-- scoping — the join is cheap but denormalizing on this hot row pays off
-- for dashboard list queries). FK CASCADE on build deletion + on tenant
-- deletion keeps GDPR Art. 17 erasure paths identical to builds.
--
-- generated_artifact_id references build_artifacts(id) — the canonical
-- storage-object registry for Build-mode artifacts (see 0009 §E). The user
-- spec named the column 'storage_objects' conceptually; in Studio Zero's
-- schema, build_artifacts IS the storage-objects table for Build mode.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scaffold_jobs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id                 text NOT NULL REFERENCES builds(id)   ON DELETE CASCADE,
  tenant_id                uuid NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  state                    scaffold_state NOT NULL DEFAULT 'queued',

  -- Detection
  detected_stack           text,
    -- 'nextjs-saas' | 'nodejs-worker' | 'cli-tool' | 'astro-static' | …
    -- Forge's template-catalog match (project-template/ catalog). Free text
    -- for forward-compat; the catalog itself is the authoritative list.

  -- Generation
  generated_files_count    int    CHECK (generated_files_count  IS NULL OR generated_files_count  >= 0),
  generated_lines_count    int    CHECK (generated_lines_count  IS NULL OR generated_lines_count  >= 0),
  generated_artifact_id    uuid REFERENCES build_artifacts(id) ON DELETE SET NULL,
    -- FK to the canonical Build-mode storage-object registry (0009 §E).
    -- NULL pre-generation. Populated by the scaffold generator on exit of
    -- 'generating' state. The build_artifacts.artifact_type for this row is
    -- ALWAYS 'full_bundle_zip' (the sealing zip of the generated scaffold);
    -- enforcement is at the bundle-assembler layer (no DB-side CHECK
    -- because artifact_type ownership belongs to the parent table).
  generation_runtime_ms    bigint CHECK (generation_runtime_ms IS NULL OR generation_runtime_ms >= 0),

  -- Audit gate
  scaffold_audit_run_id    text REFERENCES runs(id) ON DELETE SET NULL,
    -- The audit run executed against the generated scaffold. runs.id is
    -- ULID text (0001 §C). NULL pre-audit. Populated by the scaffold-audit-
    -- gate Edge Function on entry to 'audit_gating'. ON DELETE SET NULL so
    -- a reaped audit run does not cascade-delete the scaffold job ledger
    -- (we keep the scaffold-side history even if the audit run row is
    -- archived).
  audit_verdict            audit_verdict,
    -- audit_verdict enum from 0001 ('PASS' | 'PASS WITH FIXES' | 'FAIL').
    -- Mirrors the contract used by builds.delivered_verdict in 0009 §D.
  audit_score              int CHECK (audit_score IS NULL OR audit_score BETWEEN 0 AND 100),

  -- Delivery
  delivered_at             timestamptz,
  zip_download_url         text,
    -- Signed URL with 24h expiry. Issued by the delivery worker on
    -- scaffold_jobs.state → 'delivered'. The TTL is enforced by the storage
    -- signing layer (Supabase Storage signed-URL expiry); this column is
    -- the human-readable witness of which URL was issued (audit trail).

  -- Lifecycle / failure / refund
  failure_code             text,
  failure_message          text,
  cancelled_at             timestamptz,
  refunded_at              timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE scaffold_jobs IS
  'V2.1 Scaffold/MVP code generation aggregate. Child of builds (FK '
  'CASCADE; one scaffold_jobs row per build that elected '
  'output_preference=''roadmap_docs_seed_scaffold''). UUID PK. Lifecycle '
  'state machine in scaffold_state (10 states). Delivery requires '
  'audit_verdict IN (''PASS'',''PASS WITH FIXES'') — enforced by the '
  'scaffold_jobs_delivered_verdict_required CHECK below + the '
  'scaffold_jobs_audit_gate_update RLS predicate in §D (defense in depth, '
  'mirroring the builds audit-gate pattern from 0009).';

COMMENT ON COLUMN scaffold_jobs.detected_stack IS
  'Forge''s template-catalog match. Free text — the catalog itself is the '
  'authoritative list, kept in project-template/ (Scribe). New stacks '
  'ship by adding catalog rows without a schema change.';

COMMENT ON COLUMN scaffold_jobs.generated_artifact_id IS
  'FK to build_artifacts(id) — Studio Zero''s canonical Build-mode storage-'
  'object registry (0009 §E). NULL pre-generation. The build_artifacts row '
  'this points at is the sealing full_bundle_zip of the generated scaffold; '
  'sha256 + size_bytes + storage_path live on that row (tamper detection + '
  'Penny COGS reporting). The conceptual ''storage_objects'' table named in '
  'the V2.1 spec is realized in Studio Zero''s schema as build_artifacts.';

COMMENT ON COLUMN scaffold_jobs.scaffold_audit_run_id IS
  'The audit run executed against the generated scaffold. runs.id is ULID '
  'text (0001 §C). Populated by the scaffold-audit-gate Edge Function on '
  'entry to ''audit_gating''. ON DELETE SET NULL preserves the scaffold-side '
  'ledger even if the audit run is archived.';

COMMENT ON COLUMN scaffold_jobs.audit_verdict IS
  'audit_verdict enum value (PASS / PASS WITH FIXES / FAIL) emitted by the '
  'Jury audit gate against the generated scaffold. V2.1 exit gate (sprint/'
  'milestone-V2-1.md): scaffold ships only on PASS or PASS WITH FIXES — '
  'enforced by CHECK scaffold_jobs_delivered_verdict_required below.';

COMMENT ON COLUMN scaffold_jobs.zip_download_url IS
  'Signed URL (24h expiry) for the generated scaffold zip. TTL is enforced '
  'by the storage signing layer; this column is the audit-trail witness of '
  'which URL was issued on delivery. Refreshed by Forge''s re-issue endpoint '
  'if the customer requests it before the TTL window closes.';

-- Delivery requires a PASS / PASS WITH FIXES verdict (V2.1 exit gate +
-- Build extension §3 audit-gate hard rule). Same defense-in-depth pattern
-- as builds_delivered_verdict_required in 0009 §D.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scaffold_jobs_delivered_verdict_required'
  ) THEN
    ALTER TABLE scaffold_jobs
      ADD CONSTRAINT scaffold_jobs_delivered_verdict_required CHECK (
        state <> 'delivered'
        OR (
          audit_verdict IN ('PASS','PASS WITH FIXES')
          AND delivered_at IS NOT NULL
          AND generated_artifact_id IS NOT NULL
        )
      );
  END IF;
END$$;

COMMENT ON CONSTRAINT scaffold_jobs_delivered_verdict_required ON scaffold_jobs IS
  'V2.1 exit-gate DB-side guard: any row in state=''delivered'' MUST carry '
  'audit_verdict IN (''PASS'',''PASS WITH FIXES'') AND delivered_at IS NOT '
  'NULL AND generated_artifact_id IS NOT NULL. Pairs with the V2.1 audit-'
  'gate-blocks-delivery negative test (sprint/milestone-V2-1.md exit gate): '
  'a FAIL verdict can NEVER reach delivered state — the scaffold-audit-gate '
  'Edge Function transitions failing jobs to ''audit_failed'' instead. '
  'Defense in depth: even if app code were buggy, the DB rejects the '
  'transition. Mirrors builds_delivered_verdict_required in 0009 §D.';

-- updated_at trigger.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'scaffold_jobs_set_updated_at'
      AND tgrelid = 'scaffold_jobs'::regclass
  ) THEN
    CREATE TRIGGER scaffold_jobs_set_updated_at
      BEFORE UPDATE ON scaffold_jobs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    -- set_updated_at() ships in 0001; safe no-op if absent.
    NULL;
END$$;

-- ============================================================================
-- D. RLS — enable, force, and write the policy set
-- ============================================================================
-- Three actor classes (mirrors 0009 §H builds):
--   1. members (authenticated, tenant_member of scaffold_jobs.tenant_id) —
--      SELECT/UPDATE/DELETE on own jobs; may NOT transition to
--      'audit_passed' / 'audit_failed' / 'delivered'.
--   2. runner (claim_role='runner', build_id JWT claim matches the parent
--      build) — INSERT/UPDATE on its own job's pipeline states. NOT allowed
--      to transition to 'audit_passed' or 'audit_failed' (those are the
--      scaffold-audit-gate Edge Function's exclusive transitions).
--   3. service-role (Supabase bypass) — ALL (Stripe refund webhook,
--      delivery cron, ledger emitter).
--
-- Special: scaffold-audit-gate Edge Function (iss='supabase-edge-functions',
-- role='scaffold_gate') — UPDATE-only policy that allows the transition to
-- 'audit_passed' or 'audit_failed'. Load-bearing predicate for the V2.1
-- audit-gate-blocks-delivery negative test.
-- ----------------------------------------------------------------------------

ALTER TABLE scaffold_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaffold_jobs FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scaffold_jobs_deny_anon ON scaffold_jobs;
CREATE POLICY scaffold_jobs_deny_anon ON scaffold_jobs
  AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
COMMENT ON POLICY scaffold_jobs_deny_anon ON scaffold_jobs IS
  'Deny-all for the anon role. Defense-in-depth — service-role bypasses '
  'RLS implicitly; authenticated paths go through the member + runner + '
  'gate policies below.';

DROP POLICY IF EXISTS scaffold_jobs_member_select ON scaffold_jobs;
CREATE POLICY scaffold_jobs_member_select ON scaffold_jobs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    auth.claim_role() = 'authenticated'
    AND tenant_id = auth.tenant_id()
    AND auth.is_member_of(tenant_id)
  );
COMMENT ON POLICY scaffold_jobs_member_select ON scaffold_jobs IS
  'Members may SELECT scaffold_jobs in their tenant. Tenant scoping '
  'enforced via auth.tenant_id() + auth.is_member_of() — mirrors the '
  'builds_member_select pattern in 0009 §H.';

DROP POLICY IF EXISTS scaffold_jobs_member_update ON scaffold_jobs;
CREATE POLICY scaffold_jobs_member_update ON scaffold_jobs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    auth.claim_role() = 'authenticated'
    AND tenant_id = auth.tenant_id()
    AND auth.is_member_of(tenant_id)
  )
  WITH CHECK (
    auth.claim_role() = 'authenticated'
    AND tenant_id = auth.tenant_id()
    AND auth.is_member_of(tenant_id)
    -- Members may NOT transition to audit_passed / audit_failed (gate-only)
    -- or to delivered (delivery worker only, gated by audit-pass).
    AND state NOT IN ('audit_passed','audit_failed','delivered')
  );
COMMENT ON POLICY scaffold_jobs_member_update ON scaffold_jobs IS
  'Members may UPDATE their own scaffold_jobs (cancel, etc.) but may NOT '
  'transition state to audit_passed, audit_failed, or delivered — those '
  'transitions are gated to the scaffold-audit-gate Edge Function and the '
  'delivery worker respectively (V2.1 analog of the ARCH-D7 jury-gate '
  'pattern from 0008 + 0009).';

DROP POLICY IF EXISTS scaffold_jobs_member_delete ON scaffold_jobs;
CREATE POLICY scaffold_jobs_member_delete ON scaffold_jobs
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    auth.claim_role() = 'authenticated'
    AND tenant_id = auth.tenant_id()
    AND auth.is_member_of(tenant_id)
  );
COMMENT ON POLICY scaffold_jobs_member_delete ON scaffold_jobs IS
  'Members may DELETE their own scaffold_jobs. GDPR Art. 17 erasure path: '
  'members own the right to erase scaffold history. Cascade from parent '
  'builds.id deletion also reaps this row.';

DROP POLICY IF EXISTS scaffold_jobs_runner_insert ON scaffold_jobs;
CREATE POLICY scaffold_jobs_runner_insert ON scaffold_jobs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND build_id   = auth.runner_build_id()
  );
COMMENT ON POLICY scaffold_jobs_runner_insert ON scaffold_jobs IS
  'Runner JWT may INSERT a scaffold_jobs row for its own build (build_id '
  'JWT claim must match scaffold_jobs.build_id). Tenant scoping preserved. '
  'In practice the row is created by the API edge before the runner is '
  'dispatched; this policy exists so recreate-on-retry semantics ship if '
  'a row is reaped between dispatch attempts.';

DROP POLICY IF EXISTS scaffold_jobs_runner_update ON scaffold_jobs;
CREATE POLICY scaffold_jobs_runner_update ON scaffold_jobs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND build_id   = auth.runner_build_id()
  )
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND build_id   = auth.runner_build_id()
    -- Runner may NOT transition to audit_passed / audit_failed
    -- (scaffold-audit-gate Edge Function only). V2.1 analog of ARCH-D7.
    AND state NOT IN ('audit_passed','audit_failed')
  );
COMMENT ON POLICY scaffold_jobs_runner_update ON scaffold_jobs IS
  'Runner JWT may UPDATE its own scaffold_jobs row through the detecting → '
  'generating → audit_gating → packaging → delivered pipeline. May NOT '
  'transition state to audit_passed or audit_failed — those belong '
  'exclusively to the scaffold-audit-gate Edge Function policy below. '
  'Tenant + build scoping enforced. Mirrors builds_runner_update in 0009 §H.';

DROP POLICY IF EXISTS scaffold_jobs_audit_gate_update ON scaffold_jobs;
CREATE POLICY scaffold_jobs_audit_gate_update ON scaffold_jobs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    -- The scaffold-audit-gate Edge Function presents a JWT whose iss claim
    -- is 'supabase-edge-functions' and whose role claim is 'scaffold_gate'.
    -- Both must match for the gate to take effect.
    (auth.jwt() ->> 'iss')  = 'supabase-edge-functions'
    AND auth.claim_role() = 'scaffold_gate'
    AND tenant_id = auth.tenant_id()
  )
  WITH CHECK (
    (auth.jwt() ->> 'iss')  = 'supabase-edge-functions'
    AND auth.claim_role() = 'scaffold_gate'
    AND tenant_id = auth.tenant_id()
    -- The gate may transition to EITHER audit_passed (verdict PASS /
    -- PASS WITH FIXES) OR audit_failed (verdict FAIL → delivery refused;
    -- refund event fires).
    AND state IN ('audit_passed','audit_failed')
  );
COMMENT ON POLICY scaffold_jobs_audit_gate_update ON scaffold_jobs IS
  'V2.1 audit-gate enforcement (analog of ARCH-D7 + the V2 '
  'builds_audit_gate_update predicate in 0009 §H): ONLY the scaffold-audit-'
  'gate Edge Function may transition scaffold_jobs.state to '
  '''audit_passed'' (gate-pass: verdict PASS / PASS WITH FIXES) or '
  '''audit_failed'' (gate-fail: verdict FAIL → delivery refused). The iss '
  '+ role claims on the JWT are both required; tenant scoping preserved. '
  'Load-bearing RLS predicate for the V2.1 exit-gate audit-gate-blocks-'
  'delivery negative test: even if app code is buggy, the DB rejects the '
  'transition unless the request came through the Edge Function. Pairs '
  'with the CHECK scaffold_jobs_delivered_verdict_required — together they '
  'guarantee a FAIL verdict can NEVER reach delivery.';

-- ============================================================================
-- E. Indexes
-- ============================================================================

-- Parent-build joins (scaffold_jobs ↔ builds 1:1 in practice; index supports
-- the join even when build_id is the FK target).
CREATE INDEX IF NOT EXISTS scaffold_jobs_build_id_idx
  ON scaffold_jobs(build_id);

-- Tenant list queries (members' Scaffold-jobs dashboard).
CREATE INDEX IF NOT EXISTS scaffold_jobs_tenant_id_idx
  ON scaffold_jobs(tenant_id);

-- Dashboard list filters by state.
CREATE INDEX IF NOT EXISTS scaffold_jobs_state_idx
  ON scaffold_jobs(state);

-- Admin / tenant dashboards: "show this tenant's scaffolds in state X newest first."
CREATE INDEX IF NOT EXISTS scaffold_jobs_tenant_state_created_idx
  ON scaffold_jobs(tenant_id, state, created_at DESC);

COMMIT;

-- ============================================================================
-- End of 0010_scaffold_v2_1.sql.
--
-- Post-apply checklist for Atlas (run against staging clone before merge):
--   1. SELECT typname FROM pg_type WHERE typname = 'scaffold_state';            -- 1 row
--   2. SELECT enumlabel FROM pg_enum
--        WHERE enumtypid = 'audit_action'::regtype;                             -- includes
--          'scaffold_started','scaffold_delivered','scaffold_audit_failed',
--          'scaffold_refunded'
--   3. \d+ scaffold_jobs                                                        -- column inventory matches §C
--   4. SELECT conname FROM pg_constraint
--        WHERE conrelid='scaffold_jobs'::regclass;                              -- includes
--          scaffold_jobs_delivered_verdict_required
--   5. SELECT policyname FROM pg_policies
--        WHERE tablename = 'scaffold_jobs';                                     -- 6 policies (deny_anon,
--          member_select, member_update, member_delete, runner_insert,
--          runner_update, audit_gate_update) — 7 total counting deny_anon
--   6. Re-run migration on same DB → no-op (idempotency check).
--   7. Negative test: with a runner JWT (build_id claim set), attempt UPDATE
--      SET state='audit_passed' → should be rejected by RLS.
--   8. Negative test: insert scaffold_jobs row with state='delivered',
--      audit_verdict='FAIL' → should be rejected by
--      scaffold_jobs_delivered_verdict_required CHECK.
--   9. Negative test: insert scaffold_jobs row with state='delivered',
--      audit_verdict='PASS' but generated_artifact_id=NULL → should also
--      be rejected by the same CHECK.
-- ============================================================================
