-- ============================================================================
-- 0001_initial.sql — Studio Zero initial schema
-- ============================================================================
-- Milestone: M0 — Spike (PRD §16)
-- Owner:     Atlas
-- Gate:      pnpm test schema:validate green; runner/schemas/*.v1.{json,ts}
--            exist in HEAD; first synthetic run emits X-AI-Generated header.
-- Rollback:  drop schema cascade + restore from snapshot. This migration is
--            wrapped in a single transaction; on apply failure it rolls itself
--            back. After successful apply, rollback requires a restore — by
--            design (forward-only per Atlas's rule 1).
--
-- The contents below are tables.sql verbatim, wrapped in BEGIN/COMMIT, with
-- a final seed row for score_engine_versions matching
-- architecture/schemas/score_engine.v1.json. Keep tables.sql and this file in
-- lockstep; tables.sql is the source-of-truth document, this file is the
-- machine-applied unit.
-- ============================================================================

BEGIN;

-- Extensions ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums ---------------------------------------------------------------------
CREATE TYPE plan_tier AS ENUM (
  'free','byok_starter','byok_pro','managed_starter','managed_pro','cli'
);
CREATE TYPE execution_mode AS ENUM ('byok','cli','managed');
CREATE TYPE finding_severity AS ENUM ('Blocker','Critical','Major','Minor','Polish');
CREATE TYPE audit_verdict AS ENUM ('PASS','PASS WITH FIXES','FAIL');
CREATE TYPE reviewer_id AS ENUM ('jury','optic','proof','halo','compass','trace','canon');
CREATE TYPE run_state AS ENUM (
  'created','queued','dispatched','reviewers_running','all_reviewers_complete',
  'jury_synthesizing','verdict_emitted','archived','cancelled',
  'failed_recoverable','failed_terminal','partial_completed',
  'suspended_violation','failed_synth_timeout'
);
CREATE TYPE audit_product AS ENUM ('surface','code','full');
CREATE TYPE audit_depth   AS ENUM ('quick','custom','comprehensive');
CREATE TYPE subscription_status AS ENUM (
  'trialing','active','past_due','canceled','canceled_unpaid','incomplete'
);
CREATE TYPE billing_region AS ENUM ('eu','uk','california','us_other','row');
CREATE TYPE consent_kind AS ENUM (
  'necessary_cookies','analytics_cookies','marketing_cookies','ai_training'
);
CREATE TYPE fix_pr_state AS ENUM (
  'queued','building','reaudit_running','reaudit_failed',
  'pr_opened','pr_merged','pr_closed_unmerged','failed'
);
CREATE TYPE audit_action AS ENUM (
  'url_audit_attestation','api_key_added','api_key_rotated','api_key_removed',
  'cli_paired','cli_revoked','github_app_installed','github_app_uninstalled',
  'consent_changed','retention_changed','export_requested','export_downloaded',
  'account_deletion_scheduled','account_deletion_cancelled',
  'account_deletion_executed','runner_token_minted','admin_action',
  'aup_violation_flagged','dmca_takedown_received','dmca_takedown_resolved'
);
CREATE TYPE tenant_role AS ENUM ('owner','admin','member');

-- Tables --------------------------------------------------------------------
-- The remainder of tables.sql is applied here. Maintained verbatim against
-- ../tables.sql — when tables.sql changes for a new milestone, the diff lands
-- in a new numbered migration, not by editing this file.

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan plan_tier NOT NULL DEFAULT 'free',
  mode_pref execution_mode NOT NULL DEFAULT 'byok',
  retention_days_code int NOT NULL DEFAULT 7 CHECK (retention_days_code BETWEEN 0 AND 30),
  max_concurrent_runs int CHECK (max_concurrent_runs IS NULL OR max_concurrent_runs BETWEEN 1 AND 16),
  token_budget_micros bigint CHECK (token_budget_micros IS NULL OR token_budget_micros >= 0),
  region billing_region,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email citext NOT NULL UNIQUE,
  display_name text,
  default_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  deletion_scheduled_at timestamptz,
  deletion_executes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deletion_pair_or_none CHECK (
    (deletion_scheduled_at IS NULL AND deletion_executes_at IS NULL)
    OR (deletion_scheduled_at IS NOT NULL AND deletion_executes_at IS NOT NULL
        AND deletion_executes_at > deletion_scheduled_at)
  )
);
CREATE INDEX users_default_tenant_id_idx ON users(default_tenant_id);
CREATE INDEX users_deletion_executes_at_idx ON users(deletion_executes_at)
  WHERE deletion_executes_at IS NOT NULL;

CREATE TABLE tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role tenant_role NOT NULL,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX tenant_members_tenant_id_idx ON tenant_members(tenant_id);
CREATE INDEX tenant_members_user_id_idx ON tenant_members(user_id);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('anthropic')),
  last4 text NOT NULL CHECK (length(last4) = 4),
  vault_secret_id uuid NOT NULL UNIQUE,
  last_verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_tenant_active_idx ON api_keys(tenant_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX api_keys_one_active_per_tenant_provider
  ON api_keys(tenant_id, provider) WHERE revoked_at IS NULL;

CREATE TABLE oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('github_app')),
  installation_id bigint NOT NULL,
  account_login text NOT NULL,
  vault_secret_id uuid NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  installed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, installation_id)
);
CREATE INDEX oauth_tokens_tenant_active_idx ON oauth_tokens(tenant_id) WHERE revoked_at IS NULL;

CREATE TABLE cli_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pairing_code_hash text NOT NULL,
  public_key text NOT NULL,
  hostname text NOT NULL,
  os text NOT NULL,
  cli_version text NOT NULL,
  paired_at timestamptz,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoke_undo_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pairing_code_hash)
);
CREATE INDEX cli_pairings_tenant_active_idx ON cli_pairings(tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX cli_pairings_user_id_idx ON cli_pairings(user_id);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  intake_type text NOT NULL CHECK (intake_type IN ('github_repo','local_folder','deployed_url')),
  github_installation_id bigint,
  github_repo_full_name text,
  deployed_url text,
  url_authorized boolean NOT NULL DEFAULT false,
  url_authorized_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_intake_shape CHECK (
    (intake_type = 'github_repo' AND github_installation_id IS NOT NULL
       AND github_repo_full_name IS NOT NULL)
    OR (intake_type = 'local_folder')
    OR (intake_type = 'deployed_url' AND deployed_url IS NOT NULL AND url_authorized = true)
  )
);
CREATE INDEX projects_tenant_id_idx ON projects(tenant_id);
CREATE INDEX projects_github_install_idx ON projects(github_installation_id)
  WHERE github_installation_id IS NOT NULL;

CREATE TABLE runs (
  id text PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state run_state NOT NULL DEFAULT 'created',
  mode execution_mode NOT NULL,
  product audit_product NOT NULL,
  depth audit_depth NOT NULL,
  verdict audit_verdict,
  score int CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  partial boolean NOT NULL DEFAULT false,
  watermark text CHECK (watermark IS NULL OR watermark = 'private-run-self-audited'),
  runner_id text,
  attempt smallint NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 3),
  failure_code text,
  failure_recoverable boolean,
  reviewer_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  events_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  consent_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  queued_at timestamptz,
  dispatched_at timestamptz,
  reviewers_started_at timestamptz,
  synth_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id) ON DELETE SET NULL,
  archive_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX runs_tenant_id_idx ON runs(tenant_id);
CREATE INDEX runs_project_id_idx ON runs(project_id);
CREATE INDEX runs_state_idx ON runs(state);
CREATE INDEX runs_archive_after_idx ON runs(archive_after) WHERE archive_after IS NOT NULL;
CREATE INDEX runs_tenant_state_created_idx ON runs(tenant_id, state, created_at DESC);

CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  finding_code text NOT NULL CHECK (finding_code ~ '^F-[0-9]{3,}$'),
  reviewer reviewer_id NOT NULL,
  severity finding_severity NOT NULL,
  layer text NOT NULL CHECK (layer IN (
    'frontend','backend','data','infra','security','design',
    'copy','brand','flow','audience','accessibility','compliance')),
  summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 280),
  evidence jsonb NOT NULL,
  recommendation text NOT NULL,
  estimated_effort text NOT NULL CHECK (estimated_effort IN ('S','M','L')),
  wcag_sc text[],
  ai_disclosure jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, finding_code)
);
CREATE INDEX findings_tenant_id_idx ON findings(tenant_id);
CREATE INDEX findings_run_id_idx ON findings(run_id);
CREATE INDEX findings_severity_idx ON findings(severity);
CREATE INDEX findings_reviewer_idx ON findings(reviewer);
CREATE INDEX findings_evidence_type_idx ON findings ((evidence->>'type'));

CREATE TABLE score_engine_versions (
  version text PRIMARY KEY CHECK (version ~ '^v[0-9]+$'),
  weights jsonb NOT NULL,
  thresholds jsonb NOT NULL,
  rounding text NOT NULL CHECK (rounding IN ('half-to-even','half-up')),
  schema_sha256 text NOT NULL CHECK (length(schema_sha256) = 64),
  active boolean NOT NULL DEFAULT false,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  score_engine_version text NOT NULL REFERENCES score_engine_versions(version) ON DELETE RESTRICT,
  verdict audit_verdict NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  v1_equivalent_score int CHECK (v1_equivalent_score IS NULL OR v1_equivalent_score BETWEEN 0 AND 100),
  partial boolean NOT NULL DEFAULT false,
  score_breakdown jsonb NOT NULL,
  finding_ids uuid[] NOT NULL DEFAULT '{}',
  output_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id)
);
CREATE INDEX score_snapshots_tenant_id_idx ON score_snapshots(tenant_id);
CREATE INDEX score_snapshots_run_id_idx ON score_snapshots(run_id);
CREATE INDEX score_snapshots_verdict_idx ON score_snapshots(verdict);
CREATE INDEX score_snapshots_engine_idx ON score_snapshots(score_engine_version);

CREATE TABLE fix_pr_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_ids uuid[] NOT NULL,
  state fix_pr_state NOT NULL DEFAULT 'queued',
  branch_name text,
  pr_number int,
  pr_url text,
  reaudit_run_id text REFERENCES runs(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  failed_reason text,
  tracking_stale boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fix_pr_state_pr_consistency CHECK (
    (state IN ('queued','building','reaudit_running','reaudit_failed','failed')
     AND pr_number IS NULL)
    OR (state IN ('pr_opened','pr_merged','pr_closed_unmerged')
        AND pr_number IS NOT NULL AND pr_url IS NOT NULL)
  )
);
CREATE INDEX fix_pr_jobs_tenant_id_idx ON fix_pr_jobs(tenant_id);
CREATE INDEX fix_pr_jobs_run_id_idx ON fix_pr_jobs(run_id);
CREATE INDEX fix_pr_jobs_state_idx ON fix_pr_jobs(state);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan plan_tier NOT NULL,
  status subscription_status NOT NULL,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text UNIQUE,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  region billing_region NOT NULL,
  cooling_off_waiver_signed boolean NOT NULL DEFAULT false,
  cooling_off_waiver_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_tenant_id_idx ON subscriptions(tenant_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
CREATE UNIQUE INDEX subscriptions_one_active_per_tenant
  ON subscriptions(tenant_id) WHERE status IN ('trialing','active','past_due');

CREATE TABLE cooling_off_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  region billing_region NOT NULL CHECK (region IN ('eu','uk')),
  trigger_event text NOT NULL CHECK (trigger_event IN ('subscribe','upgrade')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  waiver_signed boolean NOT NULL DEFAULT false,
  exercised_at timestamptz,
  refund_amount_cents int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cooling_off_subscription_idx ON cooling_off_windows(subscription_id);
CREATE INDEX cooling_off_expires_idx ON cooling_off_windows(expires_at)
  WHERE exercised_at IS NULL;

CREATE TABLE billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_event_id text NOT NULL UNIQUE,
  stripe_event_type text NOT NULL,
  amount_cents int CHECK (amount_cents IS NULL OR amount_cents >= 0),
  currency text CHECK (currency IS NULL OR length(currency) = 3),
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_events_tenant_id_idx ON billing_events(tenant_id);
CREATE INDEX billing_events_processed_at_idx ON billing_events(processed_at);

CREATE TABLE consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind consent_kind NOT NULL,
  granted boolean NOT NULL,
  ip_address inet,
  user_agent text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  etag text NOT NULL DEFAULT encode(gen_random_bytes(8),'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_records_tenant_user_kind_recorded_idx
  ON consent_records(tenant_id, user_id, kind, recorded_at DESC);

CREATE TABLE data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending','ready','expired','failed')),
  storage_path text,
  size_bytes bigint,
  signed_url_expires_at timestamptz,
  failed_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX data_exports_tenant_user_idx ON data_exports(tenant_id, user_id);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  target_kind text,
  target_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_tenant_recorded_idx ON audit_logs(tenant_id, recorded_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_user_id) WHERE actor_user_id IS NOT NULL;

CREATE TABLE breach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at timestamptz NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE RESTRICT,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  category text NOT NULL,
  description text NOT NULL,
  affected_records int,
  reg_notify_due_at timestamptz NOT NULL,
  reg_notified_at timestamptz,
  subject_notified_at timestamptz,
  resolved_at timestamptz,
  runbook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX breach_events_severity_idx ON breach_events(severity);
CREATE INDEX breach_events_open_idx ON breach_events(detected_at DESC) WHERE resolved_at IS NULL;

CREATE TABLE runner_token_mints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  jti uuid NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  token_sha256 text NOT NULL CHECK (length(token_sha256) = 64),
  revoked_at timestamptz,
  issued_to text NOT NULL,
  CHECK (expires_at > issued_at)
);
CREATE INDEX runner_token_mints_run_idx ON runner_token_mints(run_id);
CREATE INDEX runner_token_mints_expires_idx ON runner_token_mints(expires_at);
CREATE INDEX runner_token_mints_tenant_idx ON runner_token_mints(tenant_id);

-- updated_at triggers -------------------------------------------------------
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
      AND column_name = 'updated_at'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      r.table_name, r.table_name);
  END LOOP;
END$$;

-- Seed v1 score engine ------------------------------------------------------
-- The schema_sha256 below is a placeholder; CI computes the real sha256 at
-- build time and asserts it matches the seed row (PRD §10 versioning rule).
INSERT INTO score_engine_versions
  (version, weights, thresholds, rounding, schema_sha256, active)
VALUES (
  'v1',
  '{"Blocker":30,"Critical":18,"Major":7,"Minor":2,"Polish":0.5}'::jsonb,
  '{"fail_below":70,"pass_with_fixes_min":70,"pass_with_fixes_max":94,"pass_min":95}'::jsonb,
  'half-to-even',
  '0000000000000000000000000000000000000000000000000000000000000000', -- TODO: replace at CI build with real sha256 of score_engine.v1.json
  true
);

COMMIT;
-- End of 0001_initial.sql
