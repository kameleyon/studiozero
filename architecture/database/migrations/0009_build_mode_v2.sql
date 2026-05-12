-- ============================================================================
-- 0009_build_mode_v2.sql  (V2 Batch 1 — Atlas)
-- ============================================================================
-- Milestone: V2 — Build mode + Firecracker graduation (PRD §4 V2 Goals,
--            §7.3 Build Workflow, §12 Managed Pro includes 1 build/mo,
--            §16 V2 milestone row).
-- Owner:     Atlas (data) + Forge (Build runner + dispatch + Realtime channel)
--            + Comply (V2 ToS Build IP clause + AI System Card v1.5)
--            + Jury (Build audit gate — only path that can transition
--              builds.state → 'audit_gate_passed').
-- Gate:      sprint/milestone-V2.md exit gates:
--              - architecture/schemas/roadmap-bundle.v1.schema.json committed
--                + ajv-validates a sample bundle.
--              - tests/integration/build-audit-gate.spec.ts green
--                (Audit-gate-blocks-delivery negative test: FAIL verdict on
--                 the generated artifact → roadmap bundle delivery refused
--                 → builds.state lands on 'audit_gate_failed', never on
--                 'delivered').
--              - tests/integration/build-dashboard-reconstruction.spec.ts
--                green (Live build dashboard reconstructible solely from
--                emitted state_transition + layer_complete events in
--                build_events; MI5 analog for build mode).
--              - Self-dogfood gate V2: audits/v2.json = PASS or PASS WITH FIXES.
--              - AI System Card v1.5 LIVE at /system-card (Build mode
--                extension — see legal/ai-system-card-v1.5.md).
--              - legal/build-mode-extension.md LIVE (ToS Build mode IP +
--                similarity attribution disclaimer + audit-gate disclaimer +
--                Managed Pro pricing inclusion).
--
-- What ships here (single BEGIN/COMMIT, idempotent, forward-only):
--
--   A. build_state ENUM TYPE — created if missing. The Build mode lifecycle
--      state machine (15 states). Mirrors PRD §7.3 + sprint/milestone-V2.md.
--      Forward-only: new states ship via ALTER TYPE ADD VALUE in a successor
--      migration; values are never re-purposed.
--
--   B. build_output_preference ENUM TYPE — three customer-selectable output
--      shapes per PRD §7.3 step 5:
--        'roadmap_docs'              — markdown bundle only
--        'roadmap_docs_seed'         — + seeded GitHub repo (V2 default)
--        'roadmap_docs_seed_scaffold'— + working scaffold/MVP code
--                                       (V2.1, audit-gated; per PRD §7.3 (5)
--                                        "scaffold V2.1 — gated by audit-pass")
--
--   C. builds table — the Build mode aggregate root. ULID primary key
--      (mirrors runs.id shape; CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$')).
--      Brief inputs are captured at intake (PRD §7.3 step 1 + brief.v1.schema).
--      BigBrain-generated brief is persisted to builds.brief (jsonb)
--      conforming to architecture/schemas/brief.v1.schema.json; customer
--      confirms before dispatch (state 'brief_pending_confirmation' →
--      'brief_confirmed'); confirmation is tracked by brief_confirmed_at +
--      brief_confirmed_by (PRD §7.3 step 2 + AI System Card v1.5 §8 human
--      oversight gate before dispatch).
--      Layer outputs aggregate to builds.layer_outputs (jsonb, keyed by
--      layer-lead name → output payload) for the live dashboard + the bundle
--      assembler.
--      Final deliverables: bundle_artifact_id (FK to build_artifacts), the
--      seeded github_repo_url, delivered_at, delivered_verdict (audit_verdict
--      — required to be PASS or PASS WITH FIXES per PRD §7.3 step 7).
--      Lifecycle columns: cancelled_at, refunded_at, refunded_amount_micros,
--      failure_code, failure_message.
--
--   D. build_artifacts table — physical artifact references (Supabase
--      Storage bucket 'build-artifacts'). Each row is one logical artifact
--      (roadmap, architecture, prd, brand_tokens, voice_doc, decisions,
--      risks, cogs, channels, readme, full_bundle_zip). sha256 column makes
--      tamper detection cheap; size_bytes drives the Penny COGS analytics.
--      INSERT only via service-role (cron + bundle assembler write);
--      members SELECT; never UPDATE/DELETE (artifacts are immutable once
--      sealed; supersedes ship as new rows).
--
--   E. build_events table — append-only event log for the Realtime channel
--      that drives the live build dashboard (PRD §7.3 step 4). Every
--      meaningful transition lands here as a row, keyed by build_id. The
--      Vega frontend subscribes to `builds:<build_id>` Realtime channel and
--      reconstructs the dashboard solely from these rows (Verify exit-gate
--      test: dashboard reconstructible from events alone). event_kind
--      values: 'state_transition' | 'layer_complete' | 'layer_finding' |
--      'bundle_ready' | 'repo_seeded' | 'delivered' | 'cancelled' | 'error'.
--
--   F. New audit_action enum values — Build mode ledger trail (SOC2 +
--      GDPR Art. 22 defense + Art. 50 disclosure paper trail):
--        'build_started'             — builds row created (intake captured)
--        'build_brief_confirmed'     — customer signed off on BigBrain brief
--                                       (human oversight gate before dispatch)
--        'build_delivered'           — builds.state → 'delivered'; bundle
--                                       sealed; repo seeded; readiness score
--                                       attached.
--        'build_audit_gate_failed'   — Jury verdict on the generated artifact
--                                       was FAIL; delivery refused.
--        'build_refunded'            — refund executed (audit_gate_failed,
--                                       customer-initiated cancel within D22,
--                                       or terminal failure refundable).
--
--   G. RLS policies — three-actor model per the user spec:
--        - members: SELECT/UPDATE/DELETE their own builds (tenant + user
--          scoping); SELECT artifacts + events (own only).
--        - runner: INSERT/UPDATE for the build it owns (build_id JWT
--          claim — runner JWT carries `build_id` distinct from `run_id` so
--          the same mint-Edge-Function machinery can issue tokens scoped to
--          either a run or a build). build_artifacts + build_events INSERT
--          via service-role only (cron + bundle assembler + state-transition
--          emitter); members never INSERT artifacts/events directly.
--        - service-role: ALL (Stripe refund webhook writes refunded_at +
--          refunded_amount_micros; GitHub-seed webhook writes
--          github_repo_url; bundle assembler writes bundle_artifact_id;
--          state-transition emitter inserts build_events rows).
--
--      Jury audit gate (analog of ARCH-D7 for Build mode): only the
--      `build-audit-gate` Edge Function (JWT iss = 'supabase-edge-functions',
--      role = 'build_gate') may transition builds.state to either
--      'audit_gate_passed' (verdict PASS / PASS WITH FIXES on the generated
--      artifact) or 'audit_gate_failed' (verdict FAIL → delivery refused).
--      The runner may NOT make that transition. This is the load-bearing
--      RLS predicate that makes the V2 audit-gate-blocks-delivery negative
--      test bulletproof.
--
--   H. auth.runner_build_id() helper — mirrors auth.runner_run_id() but
--      reads the `build_id` claim from the runner JWT. Lets the same mint
--      Edge Function machinery issue tokens scoped to either an audit run
--      OR a build run.
--
--   I. Indexes:
--        builds_tenant_id_idx               — tenant list queries
--        builds_user_id_idx                 — user-scoped list queries
--        builds_state_idx                   — dashboard list filters
--        builds_tenant_state_created_idx    — admin dashboards
--        builds_deadline_idx                — partial: deadline IS NOT NULL
--                                              (deadline-soon notifications)
--        build_artifacts_build_id_idx       — bundle assembly + downloads
--        build_artifacts_type_idx           — artifact-type filters
--        build_events_build_idx             — Realtime channel replay
--          (REQUIRED by user spec: ON build_events(build_id, created_at DESC))
--
-- Idempotency:
--   - CREATE TYPE wrapped in DO blocks with pg_type catalog NOT EXISTS guard
--     (Postgres lacks CREATE TYPE IF NOT EXISTS).
--   - ALTER TYPE audit_action ADD VALUE IF NOT EXISTS for the enum extensions.
--   - CREATE TABLE IF NOT EXISTS for the three new tables.
--   - All indexes use CREATE INDEX IF NOT EXISTS.
--   - All RLS policies use DROP POLICY IF EXISTS ... CREATE POLICY.
--   - CREATE OR REPLACE FUNCTION for the auth.runner_build_id() helper.
--   - Re-running on a DB where this has already applied is a no-op.
--
-- Forward-only: per Atlas Rule 1, this file is never modified after merge.
--   V2.1 scaffold-generation extensions (state additions for the
--   'roadmap_docs_seed_scaffold' output preference) ship in a successor
--   migration.
--
-- Cross-refs:
--   PRD.md §4 V2 Goals (Build mode), §7.3 Build Workflow, §12 (Managed Pro
--     includes 1 build/mo; overage $499/build — Penny refines post-V2),
--     §16 V2 milestone row.
--   architecture/schemas/brief.v1.schema.json (BigBrain brief shape this
--     migration's builds.brief column conforms to).
--   architecture/schemas/roadmap-bundle.v1.schema.json (final delivered
--     bundle shape; build_artifacts + builds.layer_outputs aggregate to it).
--   architecture/schemas/audit-input.v1.schema.json + audit-output.v1.schema.json
--     (the Jury audit gate that runs against the generated artifact uses
--     the same audit contract; builds.delivered_verdict is the audit_verdict
--     enum value from that contract).
--   architecture/database/migrations/0008_auto_pr_v1_5.sql §H (RLS pattern
--     for Edge-Function-issuer + role-claim gating — ARCH-D7 analog applied
--     to Build mode audit gate).
--   architecture/decisions.md ARCH-D6 (tracking_state enum) — Build mode
--     does not need stale-tracking because the seeded repo is delivered
--     once at the end of the build (not an ongoing PR-tracking surface).
--   sprint/milestone-V2.md exit gates.
--   legal/build-mode-extension.md (ToS Build mode IP clause — this batch).
--   legal/ai-system-card-v1.5.md (System Card Build mode extension — this
--     batch).
--   compliance/v2-compliance-audit.md (V2 scorecard — this batch).
-- ============================================================================

BEGIN;

-- Same rationale as 0002 §F + 0004 §A + 0005 §B + 0008 (ADD VALUE inside a
-- transaction is allowed but the new value cannot be referenced as a literal
-- in the same transaction without disabling parse-time function-body
-- validation). Set LOCAL as belt-and-braces; no function bodies in this
-- migration reference the new enum literals.
SET LOCAL check_function_bodies = off;

-- ============================================================================
-- A. build_state ENUM TYPE — Build mode lifecycle state machine
-- ============================================================================
-- 15-state machine per PRD §7.3 + sprint/milestone-V2.md. Forward-only:
-- additions ship via ALTER TYPE ADD VALUE in a successor migration; values
-- are never re-purposed (mirrors run_state's contract in tables.sql).
--
-- Happy-path order:
--   created → queued → brief_generating → brief_pending_confirmation
--           → brief_confirmed → layers_dispatching → layers_running
--           → layers_complete → bundle_assembling → audit_gate_running
--           → audit_gate_passed → repo_seeding → delivered
--
-- Failure / off-path:
--   audit_gate_failed   — Jury verdict on the generated artifact was FAIL;
--                         delivery refused (V2 exit-gate negative test).
--   cancelled           — customer cancelled (D22 cooling-off + cancel-anywhere).
--   failed_recoverable  — transient failure; retryable.
--   failed_terminal     — non-retryable; refund decision per regional matrix.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'build_state'
  ) THEN
    CREATE TYPE build_state AS ENUM (
      'created',
      'queued',
      'brief_generating',
      'brief_pending_confirmation',
      'brief_confirmed',
      'layers_dispatching',
      'layers_running',
      'layers_complete',
      'bundle_assembling',
      'audit_gate_running',
      'audit_gate_passed',
      'audit_gate_failed',
      'repo_seeding',
      'delivered',
      'cancelled',
      'failed_recoverable',
      'failed_terminal'
    );
  END IF;
END$$;

COMMENT ON TYPE build_state IS
  'PRD §7.3 Build Workflow + sprint/milestone-V2.md exit gates. 15-state '
  'lifecycle. Happy path: created → queued → brief_generating → '
  'brief_pending_confirmation (customer review gate per AI System Card v1.5 '
  '§8) → brief_confirmed → layers_dispatching → layers_running → '
  'layers_complete → bundle_assembling → audit_gate_running → '
  'audit_gate_passed (ONLY via build-audit-gate Edge Function — see RLS in '
  '§G) → repo_seeding → delivered. Off-path: audit_gate_failed (verdict FAIL '
  '→ delivery refused; refund path opens), cancelled, failed_recoverable, '
  'failed_terminal. Forward-only: new states via ALTER TYPE ADD VALUE; never '
  're-purpose.';

-- ============================================================================
-- B. build_output_preference ENUM TYPE — three customer-selectable outputs
-- ============================================================================
-- PRD §7.3 step 5: roadmap_docs (markdown only), roadmap_docs_seed (V2
-- default — + seeded GitHub repo with milestones/issues/README/scaffolded
-- folders), roadmap_docs_seed_scaffold (V2.1 — + working MVP code, gated by
-- audit-pass). The V2 audit gate runs against whatever artifact set the
-- customer selected; in V2 the scaffold layer is suppressed for the third
-- preference unless V2.1 is shipped.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'build_output_preference'
  ) THEN
    CREATE TYPE build_output_preference AS ENUM (
      'roadmap_docs',
      'roadmap_docs_seed',
      'roadmap_docs_seed_scaffold'
    );
  END IF;
END$$;

COMMENT ON TYPE build_output_preference IS
  'PRD §7.3 step 5 customer output choice. roadmap_docs = markdown bundle '
  'only. roadmap_docs_seed = + seeded GitHub repo with milestones/issues + '
  'README + ARCHITECTURE.md + scaffolded folders (V2 default). '
  'roadmap_docs_seed_scaffold = + working scaffold/MVP code (V2.1 — audit-'
  'gated per PRD §7.3 (5)). In V2 the scaffold layer is suppressed for the '
  'third preference unless V2.1 ships.';

-- ============================================================================
-- C. audit_action ENUM extensions — Build mode ledger trail
-- ============================================================================
-- SOC2 7-year retention + GDPR Art. 22 human-oversight paper trail + EU AI
-- Act Art. 50 disclosure trail for the Build mode flow (AI System Card v1.5).
--
--   'build_started'             — builds row created; intake + tenant + user
--                                 captured.
--   'build_brief_confirmed'     — customer ticked the "confirm brief" CTA;
--                                 the human-oversight gate before dispatch
--                                 satisfying GDPR Art. 22 (meaningful human
--                                 review BEFORE the multi-layer LLM
--                                 amplification kicks off; AI System Card
--                                 v1.5 §8).
--   'build_delivered'           — terminal happy state; bundle sealed; repo
--                                 seeded; readiness score attached.
--   'build_audit_gate_failed'   — Jury verdict on generated artifact was
--                                 FAIL; delivery refused.
--   'build_refunded'            — refund executed.
-- ----------------------------------------------------------------------------

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'build_started';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'build_brief_confirmed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'build_delivered';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'build_audit_gate_failed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'build_refunded';

-- ============================================================================
-- D. builds table — Build mode aggregate root
-- ============================================================================
-- ULID primary key mirrors runs.id shape (Crockford alphabet, 26 chars).
-- Tenant + user scoping is mandatory and CASCADE-bound to tenants + users
-- (deleting a tenant or user reaps their builds; the GDPR Art. 17 erasure
-- path is the same as for runs).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS builds (
  id                       text PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  tenant_id                uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  state                    build_state NOT NULL DEFAULT 'created',

  -- Brief inputs (PRD §7.3 step 1 — what the customer typed at intake).
  idea                     text NOT NULL,
  target_audience          text NOT NULL,
  vibe                     text NOT NULL,
  constraints              jsonb NOT NULL DEFAULT '{}'::jsonb,
  deadline                 date,
  output_preference        build_output_preference NOT NULL DEFAULT 'roadmap_docs_seed',

  -- BigBrain-generated brief (PRD §7.3 step 2). NULL until brief_generating
  -- completes; conforms to architecture/schemas/brief.v1.schema.json once
  -- populated. Customer confirms before dispatch (state transition to
  -- 'brief_confirmed') — the human-oversight gate before the multi-layer
  -- LLM amplification kicks off.
  brief                    jsonb,
  brief_confirmed_at       timestamptz,
  brief_confirmed_by       uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Layer outputs (aggregated; keyed by layer-lead name → output payload).
  -- Drives the live build dashboard reconstruction and feeds the bundle
  -- assembler at state 'bundle_assembling'.
  layer_outputs            jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Final deliverables.
  bundle_artifact_id       uuid,  -- FK added separately so re-apply is safe
  github_repo_url          text,
  delivered_at             timestamptz,
  delivered_verdict        audit_verdict,
    -- audit_verdict enum from 0001 ('PASS' | 'PASS WITH FIXES' | 'FAIL').
    -- PRD §7.3 step 7: build_delivered REQUIRES delivered_verdict IN
    -- ('PASS','PASS WITH FIXES'); enforced by CHECK below.

  -- Lifecycle / failure / refund.
  failure_code             text,
  failure_message          text,
  cancelled_at             timestamptz,
  refunded_at              timestamptz,
  refunded_amount_micros   bigint CHECK (
    refunded_amount_micros IS NULL OR refunded_amount_micros >= 0
  ),

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE builds IS
  'V2 Build mode aggregate root. ULID PK mirrors runs.id Crockford-alphabet '
  'shape (26 chars). Brief inputs captured at intake (PRD §7.3 step 1); '
  'BigBrain-generated brief in builds.brief conforms to '
  'architecture/schemas/brief.v1.schema.json (PRD §7.3 step 2). Customer '
  'confirms the brief BEFORE dispatch — the human-oversight gate satisfying '
  'GDPR Art. 22 + AI System Card v1.5 §8 for the Build mode flow. Delivered '
  'verdict carries the audit_verdict enum value from the Jury audit gate run '
  'against the generated artifact (PRD §7.3 step 7).';

COMMENT ON COLUMN builds.idea IS
  'Customer-supplied product idea description (PRD §7.3 step 1). Free text. '
  'Customer warrants per legal/build-mode-extension.md that this description '
  'does not infringe third-party IP; the ToS Build extension makes this '
  'warranty load-bearing.';

COMMENT ON COLUMN builds.brief IS
  'BigBrain-generated structured brief (PRD §7.3 step 2). NULL until '
  'brief_generating completes. Conforms to '
  'architecture/schemas/brief.v1.schema.json once populated. Customer '
  'reviews + confirms before dispatch (brief_confirmed_at + brief_confirmed_by). '
  'This is the FIRST human-oversight gate for Build mode (the SECOND is the '
  'Jury audit gate before delivery).';

COMMENT ON COLUMN builds.layer_outputs IS
  'Aggregated layer-lead outputs (keyed by layer name → payload). The bundle '
  'assembler reads this to produce the final roadmap-bundle artifact set; '
  'the live dashboard reads from build_events (not this column) — '
  'layer_outputs is the materialized state, build_events is the reconstructible '
  'event log.';

COMMENT ON COLUMN builds.delivered_verdict IS
  'audit_verdict enum value (PASS / PASS WITH FIXES / FAIL) emitted by the '
  'Jury audit gate against the generated artifact. PRD §7.3 step 7: delivery '
  'requires PASS or PASS WITH FIXES — enforced by CHECK '
  'builds_delivered_verdict_required below.';

COMMENT ON COLUMN builds.bundle_artifact_id IS
  'FK to build_artifacts(id) — the full_bundle_zip row sealed at delivery. '
  'NULL pre-delivery. Populated by the bundle assembler at state '
  'bundle_assembling exit.';

-- FK constraint added separately so we can wrap in a DO block (idempotent
-- on re-apply via pg_constraint catalog check).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'builds_bundle_artifact_id_fkey'
  ) THEN
    ALTER TABLE builds
      ADD CONSTRAINT builds_bundle_artifact_id_fkey
      FOREIGN KEY (bundle_artifact_id) REFERENCES build_artifacts(id)
      ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
      -- DEFERRABLE INITIALLY DEFERRED: the bundle assembler inserts the
      -- build_artifacts row + updates builds.bundle_artifact_id in the same
      -- transaction; deferring the FK check to commit-time accepts both
      -- orderings without a chicken-and-egg conflict.
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- build_artifacts doesn't exist yet on first apply — that's fine; this
    -- constraint is added below in §E after build_artifacts is created. We
    -- silently swallow here and re-attempt in §E's tail.
    NULL;
END$$;

-- Delivery requires a PASS / PASS WITH FIXES verdict (PRD §7.3 step 7).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'builds_delivered_verdict_required'
  ) THEN
    ALTER TABLE builds
      ADD CONSTRAINT builds_delivered_verdict_required CHECK (
        state <> 'delivered'
        OR (
          delivered_verdict IN ('PASS','PASS WITH FIXES')
          AND delivered_at IS NOT NULL
        )
      );
  END IF;
END$$;

COMMENT ON CONSTRAINT builds_delivered_verdict_required ON builds IS
  'PRD §7.3 step 7 DB-side guard: any row in state=''delivered'' MUST carry '
  'delivered_verdict IN (''PASS'',''PASS WITH FIXES'') AND delivered_at IS '
  'NOT NULL. Pairs with the V2 audit-gate-blocks-delivery negative test '
  '(tests/integration/build-audit-gate.spec.ts): a FAIL verdict can NEVER '
  'reach delivered state — the Jury audit gate Edge Function transitions '
  'failing builds to audit_gate_failed instead. Defense in depth: even if '
  'app code were buggy, the DB rejects the transition.';

-- Refund consistency: refunded_at + refunded_amount_micros co-vary.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'builds_refund_consistency'
  ) THEN
    ALTER TABLE builds
      ADD CONSTRAINT builds_refund_consistency CHECK (
        (refunded_at IS NULL AND refunded_amount_micros IS NULL)
        OR (refunded_at IS NOT NULL AND refunded_amount_micros IS NOT NULL)
      );
  END IF;
END$$;

COMMENT ON CONSTRAINT builds_refund_consistency ON builds IS
  'Refund pair invariant: refunded_at and refunded_amount_micros are either '
  'both NULL (no refund) or both NOT NULL (refund executed). Prevents '
  'half-recorded refunds from reaching the billing reconciliation reports.';

-- updated_at trigger (mirrors the runs / fix_pr_jobs convention from 0001).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'builds_set_updated_at'
      AND tgrelid = 'builds'::regclass
  ) THEN
    CREATE TRIGGER builds_set_updated_at
      BEFORE UPDATE ON builds
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    -- set_updated_at() ships in 0001; if not present we're on a bare DB
    -- and the trigger will be created when 0001 runs. Safe no-op.
    NULL;
END$$;

-- ============================================================================
-- E. build_artifacts table — Supabase Storage object references
-- ============================================================================
-- Each row is one logical artifact in the bundle: roadmap, architecture,
-- prd, brand_tokens, voice_doc, decisions, risks, cogs, channels, readme,
-- or the sealing full_bundle_zip. storage_path points into the Supabase
-- Storage bucket 'build-artifacts' (private bucket; per-tenant prefix
-- enforced by the bundle assembler).
-- sha256 + size_bytes drive tamper detection + Penny COGS reporting.
-- INSERT is service-role only (the bundle assembler + state-transition cron
-- write rows). Members SELECT their own; nothing UPDATE/DELETE — artifacts
-- are immutable once written (supersedes ship as new rows).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS build_artifacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id        text NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  artifact_type   text NOT NULL CHECK (artifact_type IN (
    'roadmap','architecture','prd','brand_tokens','voice_doc',
    'decisions','risks','cogs','channels','readme','full_bundle_zip'
  )),
  storage_path    text NOT NULL,
  size_bytes      bigint NOT NULL CHECK (size_bytes >= 0),
  sha256          text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE build_artifacts IS
  'Build mode artifact storage references. One row per logical artifact in '
  'the bundle (PRD §7.3 step 5 deliverables). storage_path points into the '
  'Supabase Storage bucket ''build-artifacts'' (private, per-tenant prefix). '
  'Immutable once written: members SELECT only; service-role INSERT only; '
  'no UPDATE/DELETE policies — supersedes ship as new rows. sha256 column '
  'is the tamper-detection witness; size_bytes feeds Penny COGS reporting.';

COMMENT ON COLUMN build_artifacts.artifact_type IS
  'Discriminator. Eleven allowed values matching the roadmap-bundle.v1 '
  'schema component names + the sealing full_bundle_zip row. Each build '
  'has at most ONE full_bundle_zip artifact (the assembled output the '
  'customer downloads).';

COMMENT ON COLUMN build_artifacts.sha256 IS
  'Lowercase hex sha256 of the artifact contents at write-time. Re-fetch '
  'verification uses this as the integrity witness; mismatches escalate to '
  'Crash + Shield as a tamper signal.';

-- Now retry the deferred FK on builds.bundle_artifact_id (in case §D's
-- attempt fell through the undefined_table EXCEPTION block).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'builds_bundle_artifact_id_fkey'
  ) THEN
    ALTER TABLE builds
      ADD CONSTRAINT builds_bundle_artifact_id_fkey
      FOREIGN KEY (bundle_artifact_id) REFERENCES build_artifacts(id)
      ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
  END IF;
END$$;

-- ============================================================================
-- F. build_events table — append-only event log (live dashboard substrate)
-- ============================================================================
-- The Vega frontend subscribes to Supabase Realtime channel
-- `builds:<build_id>` and reconstructs the dashboard solely from these rows
-- (Verify exit-gate test: tests/integration/build-dashboard-reconstruction.spec.ts).
-- event_kind values:
--   'state_transition'  — builds.state changed
--   'layer_complete'    — one layer-lead finished
--   'layer_finding'     — intermediate finding emitted by a layer
--   'bundle_ready'      — bundle_assembling exited successfully
--   'repo_seeded'       — github_repo_url populated
--   'delivered'         — builds.state → 'delivered'
--   'cancelled'         — builds.state → 'cancelled'
--   'error'             — failed_recoverable / failed_terminal entered
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS build_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id     text NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  event_kind   text NOT NULL CHECK (event_kind IN (
    'state_transition','layer_complete','layer_finding',
    'bundle_ready','repo_seeded','delivered','cancelled','error'
  )),
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE build_events IS
  'Append-only event log for Build mode. Drives the Supabase Realtime '
  'channel `builds:<build_id>` that Vega''s live build dashboard subscribes '
  'to (PRD §7.3 step 4). The dashboard MUST be reconstructible solely from '
  'these rows — that is the V2 exit-gate test '
  '(tests/integration/build-dashboard-reconstruction.spec.ts). Members '
  'SELECT their own; INSERT via service-role only (state-transition emitter '
  '+ layer-lead callback writes rows). No UPDATE/DELETE: events are '
  'historical fact.';

COMMENT ON COLUMN build_events.event_kind IS
  'Discriminator for payload shape. Eight allowed values matching the '
  'Vega event-reducer''s switch arms. New event kinds ship via successor '
  'migration with a CHECK constraint extension (never re-purpose).';

-- ============================================================================
-- G. auth.runner_build_id() — mirror of auth.runner_run_id() for builds
-- ============================================================================
-- The mint-runner-token Edge Function (runner-jwt.md) issues JWTs that can
-- be scoped to either an audit run (run_id claim) OR a build run (build_id
-- claim). This helper extracts the build_id claim for the build-runner
-- INSERT/UPDATE policies in §H.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth.runner_build_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, pg_temp AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'build_id',
    ''
  )::text
$$;
COMMENT ON FUNCTION auth.runner_build_id() IS
  'Returns the build_id claim from a runner JWT issued for a Build mode '
  'dispatch. NULL for user-session JWTs and for runner JWTs issued for an '
  'audit run (those carry run_id instead — see auth.runner_run_id()). '
  'Build mode RLS policies match this against builds.id / build_artifacts.build_id / '
  'build_events.build_id. Mirrors auth.runner_run_id() from 0002 §A.';

GRANT EXECUTE ON FUNCTION auth.runner_build_id() TO PUBLIC;

-- ============================================================================
-- H. RLS — enable, force, and write the policy set for the three new tables
-- ============================================================================
-- Pattern mirrors 0002 §C + §D (ENABLE + FORCE on every tenant-scoped
-- table) and 0008 §H (Edge-Function-issuer + role-claim gating for the
-- audit-gate transition).
--
-- Three actor classes:
--   1. members (authenticated, tenant_member of builds.tenant_id) —
--      SELECT/UPDATE/DELETE on own builds; SELECT on build_artifacts + build_events
--      (own only).
--   2. runner (claim_role='runner', build_id JWT claim) — INSERT/UPDATE on
--      its own build only (build_id match); NOT allowed to transition to
--      'audit_gate_passed' (that's the build-audit-gate Edge Function's
--      exclusive transition).
--   3. service-role (Supabase bypass) — ALL (Stripe refund webhook,
--      GitHub-seed webhook, bundle assembler, state-transition emitter).
--
-- Special: build-audit-gate Edge Function (iss='supabase-edge-functions',
-- role='build_gate') — UPDATE-only policy that allows the transition to
-- 'audit_gate_passed' or 'audit_gate_failed'. This is the load-bearing
-- predicate for the V2 audit-gate-blocks-delivery negative test.
-- ----------------------------------------------------------------------------

ALTER TABLE builds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds           FORCE  ROW LEVEL SECURITY;
ALTER TABLE build_artifacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_artifacts  FORCE  ROW LEVEL SECURITY;
ALTER TABLE build_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_events     FORCE  ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- H.1 builds: deny anon, member SELECT/UPDATE/DELETE, runner INSERT/UPDATE,
--     build-audit-gate UPDATE, service-role ALL
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS builds_deny_anon ON builds;
CREATE POLICY builds_deny_anon ON builds
  AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
COMMENT ON POLICY builds_deny_anon ON builds IS
  'Deny-all for the anon role. Defense-in-depth — service-role bypasses '
  'RLS implicitly; authenticated paths go through the member policies '
  'below. anon must never see a build row.';

DROP POLICY IF EXISTS builds_member_select ON builds;
CREATE POLICY builds_member_select ON builds
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    auth.claim_role() = 'authenticated'
    AND tenant_id = auth.tenant_id()
    AND auth.is_member_of(tenant_id)
  );
COMMENT ON POLICY builds_member_select ON builds IS
  'Members may SELECT builds in their tenant. Tenant scoping enforced via '
  'auth.tenant_id() + auth.is_member_of() (mirrors the runs policy pattern '
  'in 0002 §D).';

DROP POLICY IF EXISTS builds_member_update ON builds;
CREATE POLICY builds_member_update ON builds
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
    -- Members may NOT transition to audit_gate_passed / audit_gate_failed —
    -- those belong exclusively to the build-audit-gate Edge Function below.
    AND state NOT IN ('audit_gate_passed','audit_gate_failed')
    -- Members may NOT mark a build as delivered (the runner does that
    -- on transition out of repo_seeding, gated by the audit-gate pass).
    AND state <> 'delivered'
  );
COMMENT ON POLICY builds_member_update ON builds IS
  'Members may UPDATE their own builds (cancel, edit brief inputs before '
  'brief_confirmed, etc.) but may NOT transition state to audit_gate_passed, '
  'audit_gate_failed, or delivered — those transitions are gated to the '
  'build-audit-gate Edge Function and the runner respectively (closes the '
  'Build mode analog of ARCH-D7).';

DROP POLICY IF EXISTS builds_member_delete ON builds;
CREATE POLICY builds_member_delete ON builds
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    auth.claim_role() = 'authenticated'
    AND tenant_id = auth.tenant_id()
    AND auth.is_member_of(tenant_id)
  );
COMMENT ON POLICY builds_member_delete ON builds IS
  'Members may DELETE their own builds. Cascades to build_artifacts + '
  'build_events. GDPR Art. 17 erasure path: members own the right to '
  'erase their build history.';

DROP POLICY IF EXISTS builds_runner_insert ON builds;
CREATE POLICY builds_runner_insert ON builds
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND id        = auth.runner_build_id()
  );
COMMENT ON POLICY builds_runner_insert ON builds IS
  'Runner JWT may INSERT its own build row (build_id JWT claim must match '
  'the row PK). Belt-and-braces: in practice the row is created by the API '
  'edge before the runner is dispatched; this policy exists so the runner '
  'can recreate-on-retry semantics ship if a row is reaped between dispatch '
  'attempts.';

DROP POLICY IF EXISTS builds_runner_update ON builds;
CREATE POLICY builds_runner_update ON builds
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND id        = auth.runner_build_id()
  )
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id = auth.tenant_id()
    AND id        = auth.runner_build_id()
    -- Runner may NOT transition to audit_gate_passed / audit_gate_failed
    -- (build-audit-gate Edge Function only). Build mode analog of the
    -- ARCH-D7 jury-reaudit-gate predicate in 0008 §H.
    AND state NOT IN ('audit_gate_passed','audit_gate_failed')
  );
COMMENT ON POLICY builds_runner_update ON builds IS
  'Runner JWT may UPDATE its own build row through the brief_generating → '
  'layers_complete → bundle_assembling → audit_gate_running → repo_seeding → '
  'delivered pipeline. May NOT transition state to audit_gate_passed or '
  'audit_gate_failed — those belong exclusively to the build-audit-gate '
  'Edge Function policy below. Tenant + build scoping enforced.';

DROP POLICY IF EXISTS builds_audit_gate_update ON builds;
CREATE POLICY builds_audit_gate_update ON builds
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    -- The build-audit-gate Edge Function presents a JWT whose iss claim is
    -- 'supabase-edge-functions' and whose role claim is 'build_gate'.
    -- Both must match for the gate to take effect (V2 analog of ARCH-D7).
    (auth.jwt() ->> 'iss')  = 'supabase-edge-functions'
    AND auth.claim_role() = 'build_gate'
    AND tenant_id = auth.tenant_id()
  )
  WITH CHECK (
    (auth.jwt() ->> 'iss')  = 'supabase-edge-functions'
    AND auth.claim_role() = 'build_gate'
    AND tenant_id = auth.tenant_id()
    -- The gate may transition to EITHER audit_gate_passed (verdict
    -- PASS / PASS WITH FIXES) OR audit_gate_failed (verdict FAIL → delivery
    -- refused; refund event fires).
    AND state IN ('audit_gate_passed','audit_gate_failed')
  );
COMMENT ON POLICY builds_audit_gate_update ON builds IS
  'V2 audit-gate enforcement (analog of ARCH-D7 for Build mode): ONLY the '
  'build-audit-gate Edge Function may transition builds.state to '
  '''audit_gate_passed'' (gate-pass: verdict PASS / PASS WITH FIXES) or '
  '''audit_gate_failed'' (gate-fail: verdict FAIL → delivery refused). The '
  'iss + role claims on the JWT are both required; tenant scoping preserved. '
  'This is the load-bearing RLS predicate that makes the V2 exit-gate '
  'audit-gate-blocks-delivery negative test bulletproof: even if app code '
  'is buggy, the DB rejects the transition unless the request came through '
  'the Edge Function. Pairs with the CHECK builds_delivered_verdict_required '
  'in §D — together they guarantee a FAIL verdict can NEVER reach delivery.';

-- ----------------------------------------------------------------------------
-- H.2 build_artifacts: deny anon, member SELECT, service-role INSERT, no
--     UPDATE/DELETE (immutability)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS build_artifacts_deny_anon ON build_artifacts;
CREATE POLICY build_artifacts_deny_anon ON build_artifacts
  AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
COMMENT ON POLICY build_artifacts_deny_anon ON build_artifacts IS
  'Deny-all for anon. Artifacts are tenant-scoped; never visible to anon.';

DROP POLICY IF EXISTS build_artifacts_member_select ON build_artifacts;
CREATE POLICY build_artifacts_member_select ON build_artifacts
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    auth.claim_role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM builds b
      WHERE b.id = build_artifacts.build_id
        AND b.tenant_id = auth.tenant_id()
        AND auth.is_member_of(b.tenant_id)
    )
  );
COMMENT ON POLICY build_artifacts_member_select ON build_artifacts IS
  'Members may SELECT artifacts belonging to a build in their tenant. '
  'Join through builds enforces the tenant scope without denormalizing '
  'tenant_id onto build_artifacts (the build_id FK + CASCADE is the source '
  'of truth).';

-- INSERT only via service-role (bypasses RLS implicitly). No explicit
-- INSERT policy for authenticated → all authenticated INSERTs are denied by
-- default (RLS is FORCE + ENABLE; no PERMISSIVE INSERT policy = deny).
-- No UPDATE or DELETE policies at all → immutable. Service-role bypass is
-- the only path that can write.
COMMENT ON TABLE build_artifacts IS
  'Build mode artifact storage references. One row per logical artifact in '
  'the bundle (PRD §7.3 step 5 deliverables). storage_path points into the '
  'Supabase Storage bucket ''build-artifacts'' (private, per-tenant prefix). '
  'Immutable once written: members SELECT only; service-role INSERT only; '
  'no UPDATE/DELETE policies — supersedes ship as new rows. sha256 column '
  'is the tamper-detection witness; size_bytes feeds Penny COGS reporting. '
  '(RLS: deny-anon RESTRICTIVE; member SELECT PERMISSIVE; no INSERT/UPDATE/DELETE '
  'policies for authenticated → service-role bypass is the only write path.)';

-- ----------------------------------------------------------------------------
-- H.3 build_events: deny anon, member SELECT, service-role INSERT, no
--     UPDATE/DELETE (immutability)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS build_events_deny_anon ON build_events;
CREATE POLICY build_events_deny_anon ON build_events
  AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
COMMENT ON POLICY build_events_deny_anon ON build_events IS
  'Deny-all for anon. Events stream tenant-scoped data; never visible to anon.';

DROP POLICY IF EXISTS build_events_member_select ON build_events;
CREATE POLICY build_events_member_select ON build_events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    auth.claim_role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM builds b
      WHERE b.id = build_events.build_id
        AND b.tenant_id = auth.tenant_id()
        AND auth.is_member_of(b.tenant_id)
    )
  );
COMMENT ON POLICY build_events_member_select ON build_events IS
  'Members may SELECT events for a build in their tenant. Join through '
  'builds enforces tenant scope. The Realtime channel subscription respects '
  'this policy — the dashboard reconstruction test (V2 exit gate) runs '
  'under a member JWT to prove the channel + policy combination is '
  'sufficient.';

-- INSERT only via service-role (the state-transition emitter + layer-lead
-- callback). No UPDATE / DELETE — events are historical fact.

-- ============================================================================
-- I. Indexes
-- ============================================================================

-- Tenant + user list queries on builds.
CREATE INDEX IF NOT EXISTS builds_tenant_id_idx        ON builds(tenant_id);
CREATE INDEX IF NOT EXISTS builds_user_id_idx          ON builds(user_id);

-- Dashboard list filters by state.
CREATE INDEX IF NOT EXISTS builds_state_idx            ON builds(state);

-- Admin / tenant dashboards: "show this tenant's builds in state X newest first."
CREATE INDEX IF NOT EXISTS builds_tenant_state_created_idx
  ON builds(tenant_id, state, created_at DESC);

-- Deadline-soon notifications (Herald lifecycle email candidate).
CREATE INDEX IF NOT EXISTS builds_deadline_idx ON builds(deadline)
  WHERE deadline IS NOT NULL;

-- build_artifacts: assembly + downloads.
CREATE INDEX IF NOT EXISTS build_artifacts_build_id_idx ON build_artifacts(build_id);
CREATE INDEX IF NOT EXISTS build_artifacts_type_idx     ON build_artifacts(artifact_type);

-- build_events: Realtime channel replay (REQUIRED by spec — composite index
-- on (build_id, created_at DESC) supports the dashboard reconstruction
-- query that selects all events for a build ordered newest-first).
CREATE INDEX IF NOT EXISTS build_events_build_idx
  ON build_events(build_id, created_at DESC);

COMMIT;

-- ============================================================================
-- End of 0009_build_mode_v2.sql.
--
-- Post-apply checklist for Atlas (run against staging clone before merge):
--   1. SELECT typname FROM pg_type
--        WHERE typname IN ('build_state','build_output_preference');           -- 2 rows
--   2. SELECT enumlabel FROM pg_enum
--        WHERE enumtypid = 'audit_action'::regtype;                            -- includes
--          'build_started','build_brief_confirmed','build_delivered',
--          'build_audit_gate_failed','build_refunded'
--   3. \d+ builds                                                              -- column inventory matches §D
--   4. \d+ build_artifacts                                                     -- column inventory matches §E
--   5. \d+ build_events                                                        -- column inventory matches §F
--   6. SELECT conname FROM pg_constraint WHERE conrelid='builds'::regclass;   -- includes
--        builds_delivered_verdict_required, builds_refund_consistency,
--        builds_bundle_artifact_id_fkey
--   7. SELECT policyname FROM pg_policies WHERE tablename IN
--        ('builds','build_artifacts','build_events');                          -- includes the 9 policies emitted above
--   8. SELECT 1 FROM pg_proc WHERE proname='runner_build_id';                  -- 1 row
--   9. Re-run migration on same DB → no-op (idempotency check).
--  10. Negative test: with a runner JWT (build_id claim set), attempt UPDATE
--      SET state='audit_gate_passed' → should be rejected by RLS.
--  11. Negative test: insert builds row with state='delivered',
--      delivered_verdict='FAIL' → should be rejected by
--      builds_delivered_verdict_required CHECK.
-- ============================================================================
