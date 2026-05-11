-- ============================================================================
-- Studio Zero — Database Tables (DDL)
-- ============================================================================
-- Owner:        Atlas (data layer lead)
-- Phase:        5 — Tech Architecture
-- Consumed by:  rls-policies.sql, migrations/0001_initial.sql, runner-jwt.md
-- PRD:          §13.2 (tables), §13.4 (secret handling), §13.5 (tenant
--               isolation), §14.4 (retention table)
-- User flows:   ia/user-flows/audit-run-state-machine.md (runs/findings),
--               ia/user-flows/billing-and-cancel.md (subscriptions/billing),
--               ia/user-flows/settings-and-account-management.md (consent /
--               retention / cli_pairings / data_exports / cooling_off_windows
--               / audit_logs).
--
-- Conventions (Atlas, agents/data/atlas.md):
--   - PRIMARY KEY = `gen_random_uuid()` UUID v4 from pgcrypto; ULIDs only for
--     `runs.id` because state-machine event-log ordering benefits from a
--     time-sortable key.
--   - Every table: `id`, `created_at`, `updated_at` (NOT NULL, default now()).
--   - Every tenant-scoped table: `tenant_id uuid NOT NULL REFERENCES tenants(id)
--     ON DELETE CASCADE`. SINGLE exception: `auth.users` is managed by
--     Supabase Auth globally (PRD §13.2 + Decision #14).
--   - Every FK has an explicit index — Postgres does NOT auto-index FKs.
--   - Every NULLable column carries an inline `-- nullable: <reason>` comment.
--     If a column is nullable without a documented rationale, Atlas treats it
--     as a Critical schema bug.
--   - Enums use Postgres `CREATE TYPE` (Atlas v0.2 Polish #1).
--   - Every CHECK constraint carries an inline rationale comment.
--
-- Cross-cutting:
--   - RLS is ENABLED on every tenant-scoped table; policies live in
--     rls-policies.sql (separate file so policy review is reviewable on its
--     own diff).
--   - Service-role-only tables (`audit_logs`, `breach_events`) are RLS-locked
--     to deny anonymous + authenticated; only service-role + a tightly-scoped
--     audit-writer claim can INSERT (never UPDATE/DELETE — append-only).
--   - Hosted runner does NOT use the service-role key. It uses a short-lived
--     tenant-scoped JWT minted by an Edge Function — see runner-jwt.md (this
--     closes Atlas v0.2 Blocker B2).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;         -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- search on projects.name later
-- pgmq + pg_cron are enabled later (M1/M5 migrations); see migration-order.md.

-- ----------------------------------------------------------------------------
-- ENUM types (PRD §13.2; Atlas v0.2 Polish #1)
-- ----------------------------------------------------------------------------

CREATE TYPE plan_tier AS ENUM (
  'free',
  'byok_starter',
  'byok_pro',
  'managed_starter',
  'managed_pro',
  'cli'
);

CREATE TYPE execution_mode AS ENUM ('byok', 'cli', 'managed');

CREATE TYPE finding_severity AS ENUM (
  'Blocker', 'Critical', 'Major', 'Minor', 'Polish'
);

CREATE TYPE audit_verdict AS ENUM (
  'PASS', 'PASS WITH FIXES', 'FAIL'
);

CREATE TYPE reviewer_id AS ENUM (
  'jury', 'optic', 'proof', 'halo', 'compass', 'trace', 'canon'
);

-- Mirrors audit-run-state-machine.md state names verbatim. NEW state-name
-- additions are forward-only and require a migration (never re-purpose).
CREATE TYPE run_state AS ENUM (
  'created',
  'queued',
  'dispatched',
  'reviewers_running',
  'all_reviewers_complete',
  'jury_synthesizing',
  'verdict_emitted',
  'archived',
  'cancelled',
  'failed_recoverable',
  'failed_terminal',
  'partial_completed',
  'suspended_violation',
  -- v0.5 Decision D21:
  'failed_synth_timeout'
);

CREATE TYPE audit_product AS ENUM ('surface', 'code', 'full');
CREATE TYPE audit_depth   AS ENUM ('quick', 'custom', 'comprehensive');

CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'canceled_unpaid', 'incomplete'
);

CREATE TYPE billing_region AS ENUM (
  'eu', 'uk', 'california', 'us_other', 'row'
);

CREATE TYPE consent_kind AS ENUM (
  'necessary_cookies', 'analytics_cookies', 'marketing_cookies', 'ai_training'
);

CREATE TYPE fix_pr_state AS ENUM (
  'queued', 'building', 'reaudit_running', 'reaudit_failed',
  'pr_opened', 'pr_merged', 'pr_closed_unmerged', 'failed'
);

CREATE TYPE audit_action AS ENUM (
  -- Append-only ledger of human / system actions for SOC2 / GDPR / DMCA.
  'url_audit_attestation',       -- §14.7 CFAA close
  'api_key_added',
  'api_key_rotated',
  'api_key_removed',
  'cli_paired',
  'cli_revoked',
  'github_app_installed',
  'github_app_uninstalled',
  'consent_changed',
  'retention_changed',
  'export_requested',
  'export_downloaded',
  'account_deletion_scheduled',
  'account_deletion_cancelled',
  'account_deletion_executed',
  'runner_token_minted',         -- closes B2; runner-jwt.md mint trail
  'admin_action',
  'aup_violation_flagged',
  'dmca_takedown_received',
  'dmca_takedown_resolved'
);

-- ----------------------------------------------------------------------------
-- 1. tenants
-- ----------------------------------------------------------------------------
CREATE TABLE tenants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  plan                plan_tier NOT NULL DEFAULT 'free',
  mode_pref           execution_mode NOT NULL DEFAULT 'byok',
  -- §14.4 customer-overridable code retention (0–30 days).
  retention_days_code int NOT NULL DEFAULT 7
                          CHECK (retention_days_code BETWEEN 0 AND 30),
  -- Per-tenant concurrency cap per §13.5 (NULL = use plan default).
  -- nullable: tenant inherits plan default; explicit override is rare.
  max_concurrent_runs int CHECK (max_concurrent_runs IS NULL
                                 OR max_concurrent_runs BETWEEN 1 AND 16),
  -- Per-tenant token budget for Managed tier (NULL for non-Managed).
  -- nullable: only Managed tenants have a token budget.
  token_budget_micros bigint CHECK (token_budget_micros IS NULL
                                    OR token_budget_micros >= 0),
  region              billing_region,  -- nullable: set on first checkout (D20)
  -- TODO: per Shield's STRIDE T-1, store data-residency override here when
  -- EU residency lands post-MVP.
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenants IS
  'Root of the tenant graph. Every tenant-scoped table FK-cascades to here. '
  'Deleting a tenant cryptoshreds the tree (per §13.4 Vault key delete + '
  'CASCADE on FKs).';

-- ----------------------------------------------------------------------------
-- 2. users  (application-side profile)
-- ----------------------------------------------------------------------------
-- NOTE: `auth.users` is owned by Supabase Auth and is the documented RLS
-- exception (PRD §13.2 + Decision #14). The table below is the application's
-- profile-layer mirror; it FKs to `auth.users.id` but does NOT carry a
-- tenant_id (a user can belong to many tenants via `tenant_members` per
-- PRD §4 non-goal "white-label/reseller" → §19 multi-user-per-tenant deferred
-- but FK shape stays correct from day one).
CREATE TABLE users (
  id                          uuid PRIMARY KEY,  -- mirrors auth.users.id 1:1
  email                       citext NOT NULL UNIQUE,
  display_name                text,              -- nullable: optional profile
  default_tenant_id           uuid REFERENCES tenants(id) ON DELETE SET NULL,
                                                 -- nullable: pre-onboarding
  -- §14.4 GDPR Art. 17 30-day grace window (settings-and-account-management.md
  -- S-DEL). When set, account is in deletion grace; when expired, exec runs.
  deletion_scheduled_at       timestamptz,       -- nullable: most accounts not deleting
  deletion_executes_at        timestamptz,       -- nullable: paired with above
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deletion_pair_or_none CHECK (
    (deletion_scheduled_at IS NULL AND deletion_executes_at IS NULL)
    OR (deletion_scheduled_at IS NOT NULL AND deletion_executes_at IS NOT NULL
        AND deletion_executes_at > deletion_scheduled_at)
  )
);
COMMENT ON TABLE users IS
  'App-layer user profile. RLS exception: no tenant_id; tenancy mediated via '
  'tenant_members. FK is informational only — auth.users is managed by '
  'Supabase Auth (PRD §13.2).';
CREATE INDEX users_default_tenant_id_idx ON users(default_tenant_id);
CREATE INDEX users_deletion_executes_at_idx
  ON users(deletion_executes_at)
  WHERE deletion_executes_at IS NOT NULL;  -- supports nightly purge job (M5)

-- ----------------------------------------------------------------------------
-- 3. tenant_members  (user ↔ tenant mapping; v1 is 1:1, future-proof for V2)
-- ----------------------------------------------------------------------------
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE tenant_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role         tenant_role NOT NULL,
  invited_at   timestamptz,                -- nullable: direct-create
  accepted_at  timestamptz,                -- nullable: pending invite
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX tenant_members_tenant_id_idx ON tenant_members(tenant_id);
CREATE INDEX tenant_members_user_id_idx   ON tenant_members(user_id);

-- ----------------------------------------------------------------------------
-- 4. api_keys  (BYOK Anthropic key; encrypted by Vault, see §13.4)
-- ----------------------------------------------------------------------------
CREATE TABLE api_keys (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Provider keyed in case we add OpenAI/Bedrock in V2 per §19 concentration
  -- risk mitigation.
  provider            text NOT NULL CHECK (provider IN ('anthropic')),
  -- Last 4 chars of plaintext key for "Key on file: sk-ant-…-xxxx" rendering
  -- (settings-and-account-management.md S-KEY).
  last4               text NOT NULL CHECK (length(last4) = 4),
  -- Vault-managed reference; plaintext key never persisted here.
  vault_secret_id     uuid NOT NULL UNIQUE,
  -- Last dry-run verification (settings-and-account-management.md S-KEY copy).
  last_verified_at    timestamptz,              -- nullable: unverified yet
  -- Rotated keys retain a tombstone row; queries filter on revoked_at IS NULL.
  revoked_at          timestamptz,              -- nullable: active key
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_tenant_active_idx
  ON api_keys(tenant_id)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX api_keys_one_active_per_tenant_provider
  ON api_keys(tenant_id, provider)
  WHERE revoked_at IS NULL;
COMMENT ON TABLE api_keys IS
  'BYOK Anthropic keys. Plaintext never stored — only Vault reference + '
  'last4 fingerprint. Rotation = new row + old.revoked_at set; old vault '
  'secret zeroized by Vault.';

-- ----------------------------------------------------------------------------
-- 5. oauth_tokens  (GitHub App per-repo install tokens; encrypted)
-- ----------------------------------------------------------------------------
CREATE TABLE oauth_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('github_app')),
  -- GitHub App installation id; one per (org, app) install. Per-repo perms
  -- live inside the installation (PRD §17 D1).
  installation_id     bigint NOT NULL,
  account_login       text NOT NULL,  -- gh org or user login
  vault_secret_id     uuid NOT NULL UNIQUE,    -- short-lived token storage
  scopes              text[] NOT NULL DEFAULT '{}',
  installed_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,              -- nullable: active install
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, installation_id)
);
CREATE INDEX oauth_tokens_tenant_active_idx
  ON oauth_tokens(tenant_id)
  WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- 6. cli_pairings  (paired CLI devices; per Atlas v0.2 Critical 2)
-- ----------------------------------------------------------------------------
CREATE TABLE cli_pairings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  -- One-time pairing code surfaced at S7 / S-CLI; rotates per attempt.
  pairing_code_hash text NOT NULL,         -- sha256 of pairing code
  -- Used for verifying signed messages from the CLI (cli-pairing-and-tamper).
  public_key        text NOT NULL,
  hostname          text NOT NULL,
  os                text NOT NULL,
  cli_version       text NOT NULL,
  paired_at         timestamptz,            -- nullable: code minted but unpaired
  last_seen_at      timestamptz,            -- nullable: never seen
  revoked_at        timestamptz,            -- nullable: active
  -- 5-min undo window per S-CLI EC (settings-and-account-management.md).
  revoke_undo_until timestamptz,            -- nullable: not currently revoked
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pairing_code_hash)
);
CREATE INDEX cli_pairings_tenant_active_idx
  ON cli_pairings(tenant_id)
  WHERE revoked_at IS NULL;
CREATE INDEX cli_pairings_user_id_idx ON cli_pairings(user_id);

-- ----------------------------------------------------------------------------
-- 7. projects
-- ----------------------------------------------------------------------------
CREATE TABLE projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  -- Intake type per PRD §7.2 Step A.
  intake_type  text NOT NULL CHECK (intake_type IN ('github_repo','local_folder','deployed_url')),
  -- Optional bindings:
  -- nullable: only set when intake_type='github_repo'
  github_installation_id bigint,
  -- nullable: only set when intake_type='github_repo'
  github_repo_full_name  text,
  -- nullable: customer-attested own-URL for free-tier (D2/§14.7)
  deployed_url           text,
  url_authorized         boolean NOT NULL DEFAULT false,
  url_authorized_at      timestamptz,        -- nullable: only set on attestation
  archived_at            timestamptz,        -- nullable: active
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_intake_shape CHECK (
    (intake_type = 'github_repo'
       AND github_installation_id IS NOT NULL
       AND github_repo_full_name IS NOT NULL)
    OR (intake_type = 'local_folder')
    OR (intake_type = 'deployed_url'
       AND deployed_url IS NOT NULL
       AND url_authorized = true)
  )
);
CREATE INDEX projects_tenant_id_idx ON projects(tenant_id);
CREATE INDEX projects_github_install_idx
  ON projects(github_installation_id)
  WHERE github_installation_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 8. runs  (the state machine row; ULID for time-sortable ordering)
-- ----------------------------------------------------------------------------
CREATE TABLE runs (
  -- ULID stored as text to preserve sort order; could move to UUIDv7 once
  -- pgsodium ships a stable generator. 26 chars Crockford base32.
  id                  text PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  tenant_id           uuid NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  state               run_state NOT NULL DEFAULT 'created',
  mode                execution_mode NOT NULL,
  product             audit_product NOT NULL,
  depth               audit_depth NOT NULL,
  -- Final verdict (mirrored from final_verdict event, see findings + score
  -- snapshots for the authoritative payload). Nullable until verdict emitted.
  verdict             audit_verdict,  -- nullable: pre-verdict_emitted state
  score               int CHECK (score IS NULL OR score BETWEEN 0 AND 100),
                                       -- nullable: pre-verdict_emitted
  partial             boolean NOT NULL DEFAULT false,
  watermark           text CHECK (watermark IS NULL
                                  OR watermark = 'private-run-self-audited'),
                                       -- nullable: only CLI-mode runs
  runner_id           text,            -- nullable: pre-dispatch
  attempt             smallint NOT NULL DEFAULT 1
                          CHECK (attempt BETWEEN 1 AND 3), -- §14.2 max 2 retries
  failure_code        text,            -- nullable: only on failed_* states
  failure_recoverable boolean,         -- nullable: only on failed_* states
  -- Per-reviewer substate map per audit-run-state-machine.md reviewers_running.
  reviewer_status     jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Event log buffer for late-subscriber replay (state-machine EC-2). Trimmed
  -- to last 24h by retention job (OQ-4 → recommended).
  events_log          jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Consent snapshot at run start; honored even if customer toggles mid-run
  -- (settings-and-account-management.md EC-4).
  consent_snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Lifecycle timestamps (nullable until reached).
  queued_at           timestamptz,
  dispatched_at       timestamptz,
  reviewers_started_at timestamptz,
  synth_started_at    timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancelled_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  -- Retention timer (NULL until verdict_emitted; computed from tenant policy).
  archive_after       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX runs_tenant_id_idx     ON runs(tenant_id);
CREATE INDEX runs_project_id_idx    ON runs(project_id);
CREATE INDEX runs_state_idx         ON runs(state);
CREATE INDEX runs_archive_after_idx ON runs(archive_after)
  WHERE archive_after IS NOT NULL;
-- Most common query: list active runs per tenant in dashboard.
CREATE INDEX runs_tenant_state_created_idx
  ON runs(tenant_id, state, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. findings  (one row per emitted finding; mirrors audit-output schema $defs)
-- ----------------------------------------------------------------------------
CREATE TABLE findings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id          text NOT NULL REFERENCES runs(id)    ON DELETE CASCADE,
  -- Stable per-run finding id from the runner (F-NNN).
  finding_code    text NOT NULL CHECK (finding_code ~ '^F-[0-9]{3,}$'),
  reviewer        reviewer_id NOT NULL,
  severity        finding_severity NOT NULL,
  layer           text NOT NULL CHECK (layer IN (
                    'frontend','backend','data','infra','security','design',
                    'copy','brand','flow','audience','accessibility','compliance')),
  summary         text NOT NULL CHECK (length(summary) BETWEEN 1 AND 280),
  -- Evidence is jsonb (per audit-output.v1.schema.json $defs/evidence).
  -- Per Atlas v0.2 Minor (5KB boundary): screenshots and transcripts > 5KB
  -- must reference storage_path; inline snippet ≤ 5120 bytes only.
  evidence        jsonb NOT NULL,
  recommendation  text NOT NULL,
  estimated_effort text NOT NULL CHECK (estimated_effort IN ('S','M','L')),
  wcag_sc         text[],                       -- nullable: only set for Halo
  ai_disclosure   jsonb,                        -- nullable: §11.3 disclosure
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, finding_code)
);
CREATE INDEX findings_tenant_id_idx     ON findings(tenant_id);
CREATE INDEX findings_run_id_idx        ON findings(run_id);
CREATE INDEX findings_severity_idx      ON findings(severity);
CREATE INDEX findings_reviewer_idx      ON findings(reviewer);
-- jsonb path queries on evidence-type for evidence-viewer drill-down.
CREATE INDEX findings_evidence_type_idx
  ON findings ((evidence->>'type'));

-- ----------------------------------------------------------------------------
-- 10. score_engine_versions  (Atlas v0.2 Critical 1 — versioned rubrics in DB)
-- ----------------------------------------------------------------------------
CREATE TABLE score_engine_versions (
  version       text PRIMARY KEY CHECK (version ~ '^v[0-9]+$'),
  weights       jsonb NOT NULL,
  thresholds    jsonb NOT NULL,
  rounding      text NOT NULL CHECK (rounding IN ('half-to-even','half-up')),
  schema_sha256 text NOT NULL CHECK (length(schema_sha256) = 64),
  active        boolean NOT NULL DEFAULT false,
  retired_at    timestamptz,                    -- nullable: still in use
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE score_engine_versions IS
  'Versioned readiness-score rubric. Closes Atlas v0.2 Critical 1: scores '
  'across rubric-version boundaries are mathematically incomparable; '
  'analytics emits v1_equivalent_score by re-running findings through the '
  'pinned older version stored here.';

-- ----------------------------------------------------------------------------
-- 11. score_snapshots  (one per terminal verdict; immutable)
-- ----------------------------------------------------------------------------
CREATE TABLE score_snapshots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id                text NOT NULL REFERENCES runs(id)    ON DELETE CASCADE,
  score_engine_version  text NOT NULL REFERENCES score_engine_versions(version)
                              ON DELETE RESTRICT,
  verdict               audit_verdict NOT NULL,
  score                 int NOT NULL CHECK (score BETWEEN 0 AND 100),
  -- For cross-version comparisons (Atlas v0.2 Critical 1). Nullable until the
  -- analytics worker backfills it; nightly job recomputes on rubric bump.
  v1_equivalent_score   int CHECK (v1_equivalent_score IS NULL
                                   OR v1_equivalent_score BETWEEN 0 AND 100),
  partial               boolean NOT NULL DEFAULT false,
  score_breakdown       jsonb NOT NULL,
  finding_ids           uuid[] NOT NULL DEFAULT '{}',
  -- Full audit-output.v1 payload, for share view + export.
  output_payload        jsonb NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id)  -- one snapshot per run
);
CREATE INDEX score_snapshots_tenant_id_idx ON score_snapshots(tenant_id);
CREATE INDEX score_snapshots_run_id_idx    ON score_snapshots(run_id);
CREATE INDEX score_snapshots_verdict_idx   ON score_snapshots(verdict);
CREATE INDEX score_snapshots_engine_idx    ON score_snapshots(score_engine_version);

-- ----------------------------------------------------------------------------
-- 12. fix_pr_jobs  (V1.5 Auto-PR delivery — Decision D3 deferred to V1.5)
-- ----------------------------------------------------------------------------
CREATE TABLE fix_pr_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id          text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_ids     uuid[] NOT NULL,           -- which findings this PR addresses
  state           fix_pr_state NOT NULL DEFAULT 'queued',
  branch_name     text,                      -- nullable: pre-PR-open
  pr_number       int,                       -- nullable: pre-PR-open
  pr_url          text,                      -- nullable: pre-PR-open
  reaudit_run_id  text REFERENCES runs(id)   -- nullable: not yet re-audited
                       ON DELETE SET NULL,
  -- Stripe charge for the one-time Auto-PR upcharge ($49 flat / S-M-L tiered).
  stripe_payment_intent_id text,             -- nullable: payment not yet captured
  failed_reason   text,                      -- nullable: only on failed states
  -- GitHub App uninstall after PR opened (Decision D23): tracking stale.
  tracking_stale  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fix_pr_state_pr_consistency CHECK (
    (state IN ('queued','building','reaudit_running','reaudit_failed','failed')
     AND pr_number IS NULL)
    OR (state IN ('pr_opened','pr_merged','pr_closed_unmerged')
        AND pr_number IS NOT NULL AND pr_url IS NOT NULL)
  )
);
CREATE INDEX fix_pr_jobs_tenant_id_idx ON fix_pr_jobs(tenant_id);
CREATE INDEX fix_pr_jobs_run_id_idx    ON fix_pr_jobs(run_id);
CREATE INDEX fix_pr_jobs_state_idx     ON fix_pr_jobs(state);

-- ----------------------------------------------------------------------------
-- 13. subscriptions  (PRD §12 pricing; billing-and-cancel.md)
-- ----------------------------------------------------------------------------
CREATE TABLE subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  plan                     plan_tier NOT NULL,
  status                   subscription_status NOT NULL,
  stripe_customer_id       text NOT NULL,
  stripe_subscription_id   text UNIQUE,        -- nullable: free-tier has no Stripe sub
  current_period_start     timestamptz,        -- nullable: free-tier
  current_period_end       timestamptz,        -- nullable: free-tier
  cancel_at_period_end     boolean NOT NULL DEFAULT false,
  canceled_at              timestamptz,        -- nullable: not cancelled
  region                   billing_region NOT NULL,
  -- D20 cooling-off waiver: §17 #20 + EC-1 billing-and-cancel.md.
  cooling_off_waiver_signed boolean NOT NULL DEFAULT false,
  cooling_off_waiver_at    timestamptz,        -- nullable: unsigned
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_tenant_id_idx ON subscriptions(tenant_id);
CREATE INDEX subscriptions_status_idx    ON subscriptions(status);
CREATE UNIQUE INDEX subscriptions_one_active_per_tenant
  ON subscriptions(tenant_id)
  WHERE status IN ('trialing','active','past_due');

-- ----------------------------------------------------------------------------
-- 14. cooling_off_windows  (D22 — fresh window per upgrade; closes OQ-2)
-- ----------------------------------------------------------------------------
CREATE TABLE cooling_off_windows (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  region          billing_region NOT NULL CHECK (region IN ('eu','uk')),
  -- A new window opens on subscribe and on every upgrade-event (D22 lock).
  trigger_event   text NOT NULL CHECK (trigger_event IN ('subscribe','upgrade')),
  opened_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  waiver_signed   boolean NOT NULL DEFAULT false,
  exercised_at    timestamptz,                -- nullable: not exercised
  refund_amount_cents int,                    -- nullable: not yet refunded
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cooling_off_subscription_idx ON cooling_off_windows(subscription_id);
CREATE INDEX cooling_off_expires_idx      ON cooling_off_windows(expires_at)
  WHERE exercised_at IS NULL;

-- ----------------------------------------------------------------------------
-- 15. billing_events  (Stripe webhook idempotency ledger; PRD M2 gate)
-- ----------------------------------------------------------------------------
CREATE TABLE billing_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Stripe event.id is globally unique; UNIQUE constraint is the idempotency
  -- mechanism (billing-and-cancel.md Unhappy 4 acceptance criterion).
  stripe_event_id   text NOT NULL UNIQUE,
  stripe_event_type text NOT NULL,
  amount_cents      int CHECK (amount_cents IS NULL OR amount_cents >= 0),
                                                -- nullable: non-charge events
  currency          text CHECK (currency IS NULL OR length(currency) = 3),
                                                -- nullable: non-charge events
  payload           jsonb NOT NULL,             -- raw event body for replay
  processed_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_events_tenant_id_idx     ON billing_events(tenant_id);
CREATE INDEX billing_events_processed_at_idx  ON billing_events(processed_at);

-- ----------------------------------------------------------------------------
-- 16. consent_records  (cookie + AI-training consent; PRD §6.1, §14.5, §14.4)
-- ----------------------------------------------------------------------------
CREATE TABLE consent_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  kind        consent_kind NOT NULL,
  granted     boolean NOT NULL,
  ip_address  inet,                            -- nullable: server-side records
  user_agent  text,                            -- nullable: server-side records
  -- Append-only ledger: never UPDATE; new row per change (Comply Art. 7(1)).
  recorded_at timestamptz NOT NULL DEFAULT now(),
  -- Optimistic concurrency for multi-tab settings race (EC-7).
  etag        text NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_records_tenant_user_kind_recorded_idx
  ON consent_records(tenant_id, user_id, kind, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 17. data_exports  (GDPR Art. 20 portability)
-- ----------------------------------------------------------------------------
CREATE TABLE data_exports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  status          text NOT NULL CHECK (status IN ('pending','ready','expired','failed')),
  storage_path    text,                        -- nullable: pre-ready
  size_bytes      bigint,                      -- nullable: pre-ready
  signed_url_expires_at timestamptz,           -- nullable: pre-ready
  failed_reason   text,                        -- nullable: only on failed
  requested_at    timestamptz NOT NULL DEFAULT now(),
  ready_at        timestamptz,                 -- nullable: pre-ready
  -- 90-day file retention (settings-and-account-management.md EC-6).
  expires_at      timestamptz,                 -- nullable: pre-ready
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX data_exports_tenant_user_idx ON data_exports(tenant_id, user_id);

-- ----------------------------------------------------------------------------
-- 18. audit_logs  (append-only ledger; SOC2 / GDPR / DMCA; 7-year retention)
-- ----------------------------------------------------------------------------
-- Service-role-only. Application code MUST NOT INSERT directly — only via the
-- `audit_log_write` SECURITY DEFINER function (defined in a separate migration
-- so its grants can be reviewed independently). RLS policy denies anon +
-- authenticated read; admin tools read via a dedicated role.
CREATE TABLE audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
                                            -- nullable: system-initiated action
  action         audit_action NOT NULL,
  target_kind    text,                      -- nullable: action-dependent
  target_id      text,                      -- nullable: action-dependent
  ip_address     inet,                      -- nullable: system-initiated
  user_agent     text,                      -- nullable: system-initiated
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Append-only invariant: see rls-policies.sql (deny UPDATE+DELETE).
  recorded_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_tenant_recorded_idx ON audit_logs(tenant_id, recorded_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_user_id)
  WHERE actor_user_id IS NOT NULL;
COMMENT ON TABLE audit_logs IS
  '7-year append-only ledger (§14.4). Never UPDATE, never DELETE. Service-role-'
  'only writes via audit_log_write(); reads via security-definer admin '
  'function. RLS denies all client roles.';

-- ----------------------------------------------------------------------------
-- 19. breach_events  (GDPR Art. 33 72h notification log; admin-only)
-- ----------------------------------------------------------------------------
CREATE TABLE breach_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at      timestamptz NOT NULL,
  -- Optional tenant scope: NULL = platform-wide (e.g. Stripe outage).
  tenant_id        uuid REFERENCES tenants(id) ON DELETE RESTRICT,
                                              -- nullable: platform-wide
  severity         text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  category         text NOT NULL,
  description      text NOT NULL,
  affected_records int,                       -- nullable: TBD during triage
  -- Art. 33: regulator notification window.
  reg_notify_due_at  timestamptz NOT NULL,
  reg_notified_at    timestamptz,             -- nullable: pre-notify
  -- Affected-data-subjects notification (Art. 34 if high-risk).
  subject_notified_at timestamptz,            -- nullable: not yet / not required
  resolved_at      timestamptz,               -- nullable: open
  runbook_url      text,                      -- nullable: tied to incident playbook
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX breach_events_severity_idx ON breach_events(severity);
CREATE INDEX breach_events_open_idx     ON breach_events(detected_at DESC)
  WHERE resolved_at IS NULL;
COMMENT ON TABLE breach_events IS
  'Admin-only incident log. RLS denies all client roles. Never client-readable.';

-- ----------------------------------------------------------------------------
-- 20. runner_token_mints  (audit trail of B2-fix JWT minting; see runner-jwt.md)
-- ----------------------------------------------------------------------------
-- Every short-lived runner JWT minted by the Edge Function lands here. Provides
-- the audit trail that closes Atlas v0.2 Blocker B2. Service-role-only writes.
CREATE TABLE runner_token_mints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id          text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  jti             uuid NOT NULL UNIQUE,        -- JWT id claim
  issued_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  -- Hash of the JWT itself for revocation lookup (not the secret).
  token_sha256    text NOT NULL CHECK (length(token_sha256) = 64),
  revoked_at      timestamptz,                 -- nullable: active or expired
  -- Hostname / worker id that requested the mint.
  issued_to       text NOT NULL,
  CHECK (expires_at > issued_at)
);
CREATE INDEX runner_token_mints_run_idx     ON runner_token_mints(run_id);
CREATE INDEX runner_token_mints_expires_idx ON runner_token_mints(expires_at);
CREATE INDEX runner_token_mints_tenant_idx  ON runner_token_mints(tenant_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers (every table with updated_at gets this)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND column_name  = 'updated_at'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      r.table_name, r.table_name);
  END LOOP;
END$$;

-- ============================================================================
-- End of tables.sql. RLS policies live in rls-policies.sql.
-- ============================================================================
