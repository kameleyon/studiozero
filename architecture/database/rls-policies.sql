-- ============================================================================
-- Studio Zero — Row Level Security policies
-- ============================================================================
-- Owner:   Atlas (data) + Vault (RLS review) + Shield (threat-model gate)
-- PRD:     §13.2 (tenant_id rule + auth.users exception), §13.5 (isolation),
--          §17 D8 (sandbox), Atlas v0.2 Blocker B2 (runner JWT — closed),
--          Comply v0.4 audit-logs append-only ledger.
-- Sibling: tables.sql, runner-jwt.md, migration-order.md.
--
-- Pattern (motionmax-learned — see Atlas's atlas.md "RLS is enabled on every
-- table before it contains user data"):
--   - We RESTRICTIVE-default-deny by enabling RLS + FORCE RLS (defeats table
--     owners falling back to bypass).
--   - We then add PERMISSIVE policies that grant exactly what the role needs.
--   - Service-role-only tables get NO PERMISSIVE policies for anon/authenticated;
--     they remain deny-by-default.
--
-- Three claim layers used by these policies (set by Supabase Auth + the
-- runner-jwt mint endpoint per runner-jwt.md):
--   - `auth.uid()`               — the authenticated user's auth.users.id.
--   - `auth.jwt() ->> 'tenant_id'` — set by runner-mint JWT and by the web app
--     session bridge; this is the canonical tenant claim. For web sessions,
--     the app sets it via a session-issuance hook that looks up the user's
--     active tenant_members row.
--   - `auth.jwt() ->> 'role'`    — 'authenticated' for users; 'runner' for
--     short-lived runner JWTs; absent for anon.
--
-- B2 fix in one sentence: the runner authenticates with a tenant-scoped JWT
-- (claim `tenant_id`), so the RLS policies below evaluate at the database
-- engine even when the runner-process code is compromised. The runner NEVER
-- uses the Supabase service-role key.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: read tenant_id claim from JWT as uuid. Returns NULL if absent.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.runner_run_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'run_id', '')
$$;

CREATE OR REPLACE FUNCTION auth.claim_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
$$;

-- Membership convenience: is the calling auth.uid() a member of tid?
CREATE OR REPLACE FUNCTION auth.is_member_of(tid uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = tid AND user_id = auth.uid()
  )
$$;

-- ============================================================================
-- tenants
-- ============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE  ROW LEVEL SECURITY;

CREATE POLICY tenants_member_select ON tenants
  FOR SELECT TO authenticated
  USING (auth.is_member_of(id));
COMMENT ON POLICY tenants_member_select ON tenants IS
  'Users can read tenants they are a member of (tenant_members mapping).';

CREATE POLICY tenants_owner_update ON tenants
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = tenants.id
      AND user_id = auth.uid()
      AND role = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = tenants.id
      AND user_id = auth.uid()
      AND role = 'owner'
  ));
COMMENT ON POLICY tenants_owner_update ON tenants IS
  'Only owners can update tenant settings (mode_pref, retention_days_code, etc.).';

-- Runner has read access to its own tenant only (needs `name`, `plan`,
-- `retention_days_code`, `token_budget_micros`). No UPDATE/DELETE.
CREATE POLICY tenants_runner_select ON tenants
  FOR SELECT TO authenticated
  USING (auth.claim_role() = 'runner' AND id = auth.tenant_id());
COMMENT ON POLICY tenants_runner_select ON tenants IS
  'Runner JWT (role=runner) can SELECT only its own tenant row. tenant_id '
  'claim is matched against the row primary key.';

-- ============================================================================
-- users
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE  ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON users
  FOR SELECT TO authenticated USING (id = auth.uid());
COMMENT ON POLICY users_self_select ON users IS
  'A user can read their own profile. No cross-user reads (V2 multi-user '
  'tenancy will revisit).';

CREATE POLICY users_self_update ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
COMMENT ON POLICY users_self_update ON users IS
  'A user can update their own profile (display_name, default_tenant_id, '
  'and deletion_scheduled_at via the S-DEL flow only).';

-- ============================================================================
-- tenant_members
-- ============================================================================
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members FORCE  ROW LEVEL SECURITY;

CREATE POLICY tenant_members_member_select ON tenant_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR auth.is_member_of(tenant_id));
COMMENT ON POLICY tenant_members_member_select ON tenant_members IS
  'A user can see memberships involving them, and any member of a tenant can '
  'see who else is in it.';

CREATE POLICY tenant_members_owner_write ON tenant_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenant_members.tenant_id
      AND tm.user_id   = auth.uid()
      AND tm.role      = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenant_members.tenant_id
      AND tm.user_id   = auth.uid()
      AND tm.role      = 'owner'
  ));
COMMENT ON POLICY tenant_members_owner_write ON tenant_members IS
  'Owners can invite, change roles, and remove members. V2 multi-user tenancy '
  'is gated by this policy already.';

-- ============================================================================
-- api_keys  (encrypted at rest; rows readable to tenant members for UI display
-- of last4 + last_verified_at; runner reads vault_secret_id via a SECURITY
-- DEFINER function — not via direct row access)
-- ============================================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE  ROW LEVEL SECURITY;

CREATE POLICY api_keys_member_select ON api_keys
  FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY api_keys_member_select ON api_keys IS
  'Members can see metadata (last4, last_verified_at). vault_secret_id is the '
  'reference handle, not the plaintext. Plaintext fetch goes through a '
  'SECURITY DEFINER RPC scoped to (tenant_id, runner-role JWT).';

CREATE POLICY api_keys_owner_write ON api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.is_member_of(tenant_id));
CREATE POLICY api_keys_owner_update ON api_keys
  FOR UPDATE TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
CREATE POLICY api_keys_owner_delete ON api_keys
  FOR DELETE TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY api_keys_owner_write   ON api_keys IS 'Members manage BYOK keys via S-KEY (rotation).';
COMMENT ON POLICY api_keys_owner_update  ON api_keys IS 'Members manage BYOK keys via S-KEY (rotation).';
COMMENT ON POLICY api_keys_owner_delete  ON api_keys IS 'Members manage BYOK keys via S-KEY (remove).';

-- ============================================================================
-- oauth_tokens
-- ============================================================================
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens FORCE  ROW LEVEL SECURITY;

CREATE POLICY oauth_tokens_member_select ON oauth_tokens
  FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY oauth_tokens_member_select ON oauth_tokens IS
  'Members see GitHub App installs for repo-pickers. Token plaintext fetched '
  'via SECURITY DEFINER RPC at runner clone time only.';

CREATE POLICY oauth_tokens_member_write ON oauth_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.is_member_of(tenant_id));
CREATE POLICY oauth_tokens_member_update ON oauth_tokens
  FOR UPDATE TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY oauth_tokens_member_write  ON oauth_tokens IS 'Manage GitHub App installs via S-GH.';
COMMENT ON POLICY oauth_tokens_member_update ON oauth_tokens IS 'Manage GitHub App installs via S-GH (revoke).';

-- Runner role: read its own tenant's tokens only (needed for git clone).
CREATE POLICY oauth_tokens_runner_select ON oauth_tokens
  FOR SELECT TO authenticated
  USING (auth.claim_role() = 'runner' AND tenant_id = auth.tenant_id());
COMMENT ON POLICY oauth_tokens_runner_select ON oauth_tokens IS
  'Runner JWT can read tokens for its tenant only. tenant_id claim matched '
  'against row tenant_id at engine level (closes Atlas v0.2 Blocker B2).';

-- ============================================================================
-- cli_pairings
-- ============================================================================
ALTER TABLE cli_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_pairings FORCE  ROW LEVEL SECURITY;

CREATE POLICY cli_pairings_member_all ON cli_pairings
  FOR ALL TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY cli_pairings_member_all ON cli_pairings IS
  'Members manage their own CLI pairings via S-CLI; pair, revoke, undo within '
  '5-min toast window.';

-- ============================================================================
-- projects
-- ============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE  ROW LEVEL SECURITY;

CREATE POLICY projects_member_all ON projects
  FOR ALL TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY projects_member_all ON projects IS
  'Members CRUD projects in their tenant. Free-tier 1-project cap enforced at '
  'application layer (engine-level check would require subselects that bloat '
  'RLS plans; rate-limit at API tier instead).';

CREATE POLICY projects_runner_select ON projects
  FOR SELECT TO authenticated
  USING (auth.claim_role() = 'runner' AND tenant_id = auth.tenant_id());
COMMENT ON POLICY projects_runner_select ON projects IS
  'Runner reads project metadata for the run it has been minted for.';

-- ============================================================================
-- runs
-- ============================================================================
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs FORCE  ROW LEVEL SECURITY;

CREATE POLICY runs_member_select ON runs
  FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY runs_member_select ON runs IS
  'Members can read runs in their tenant — powers dashboard + verdict screen.';

CREATE POLICY runs_member_insert ON runs
  FOR INSERT TO authenticated
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY runs_member_insert ON runs IS
  'Members can create runs (the runner takes over after dispatch).';

CREATE POLICY runs_member_update ON runs
  FOR UPDATE TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY runs_member_update ON runs IS
  'Members can update runs to cancel (state transitions to cancelled) and '
  'retry. Schema-level CHECK constraints prevent illegal state transitions.';

-- Runner: read + update ONLY its own run, AND only when the JWT carries the
-- matching run_id claim. Tenant claim + run_id claim are both checked at the
-- engine level.
CREATE POLICY runs_runner_select ON runs
  FOR SELECT TO authenticated
  USING (auth.claim_role() = 'runner'
         AND tenant_id = auth.tenant_id()
         AND id        = auth.runner_run_id());
CREATE POLICY runs_runner_update ON runs
  FOR UPDATE TO authenticated
  USING (auth.claim_role() = 'runner'
         AND tenant_id = auth.tenant_id()
         AND id        = auth.runner_run_id())
  WITH CHECK (auth.claim_role() = 'runner'
              AND tenant_id = auth.tenant_id()
              AND id        = auth.runner_run_id());
COMMENT ON POLICY runs_runner_select ON runs IS
  'Runner JWT scoped to ONE run_id. Even within the right tenant, the runner '
  'cannot read sibling runs.';
COMMENT ON POLICY runs_runner_update ON runs IS
  'Runner JWT scoped to ONE run_id. State transitions persisted by the runner '
  'are gated at the engine level.';

-- ============================================================================
-- findings
-- ============================================================================
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings FORCE  ROW LEVEL SECURITY;

CREATE POLICY findings_member_select ON findings
  FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY findings_member_select ON findings IS
  'Members read findings in their tenant — verdict-card FindingsList.';

CREATE POLICY findings_runner_insert ON findings
  FOR INSERT TO authenticated
  WITH CHECK (auth.claim_role() = 'runner'
              AND tenant_id = auth.tenant_id()
              AND run_id    = auth.runner_run_id());
COMMENT ON POLICY findings_runner_insert ON findings IS
  'Only the runner-role JWT, bound to this run_id, can insert findings. '
  'Members cannot fabricate findings.';

-- No UPDATE/DELETE on findings; treat them as immutable per-run. Verdict
-- corrections happen by re-running, not by editing rows.

-- ============================================================================
-- score_engine_versions  (read-only globally; admin write only)
-- ============================================================================
ALTER TABLE score_engine_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_engine_versions FORCE  ROW LEVEL SECURITY;

CREATE POLICY score_engine_versions_public_select ON score_engine_versions
  FOR SELECT TO authenticated USING (true);
COMMENT ON POLICY score_engine_versions_public_select ON score_engine_versions IS
  'Every authenticated user can read the rubric versions (PRD §10 — publish '
  'the rubric). Writes are admin-only via service-role (not via this client).';

-- ============================================================================
-- score_snapshots  (immutable; created by runner)
-- ============================================================================
ALTER TABLE score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_snapshots FORCE  ROW LEVEL SECURITY;

CREATE POLICY score_snapshots_member_select ON score_snapshots
  FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY score_snapshots_member_select ON score_snapshots IS
  'Members see their tenant''s verdict snapshots. Share-view at '
  '/v/<short-id> uses a separate signed-URL function (no RLS bypass).';

CREATE POLICY score_snapshots_runner_insert ON score_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (auth.claim_role() = 'runner'
              AND tenant_id = auth.tenant_id()
              AND run_id    = auth.runner_run_id());
COMMENT ON POLICY score_snapshots_runner_insert ON score_snapshots IS
  'Only the runner can write a verdict snapshot, scoped to its own run_id.';

-- ============================================================================
-- fix_pr_jobs  (V1.5; member-managed; runner writes from build phase)
-- ============================================================================
ALTER TABLE fix_pr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fix_pr_jobs FORCE  ROW LEVEL SECURITY;

CREATE POLICY fix_pr_jobs_member_all ON fix_pr_jobs
  FOR ALL TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY fix_pr_jobs_member_all ON fix_pr_jobs IS
  'Members manage Auto-PR jobs in their tenant. State transitions enforced at '
  'app layer + CHECK constraint in tables.sql.';

-- ============================================================================
-- subscriptions
-- ============================================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE  ROW LEVEL SECURITY;

CREATE POLICY subscriptions_member_select ON subscriptions
  FOR SELECT TO authenticated USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY subscriptions_member_select ON subscriptions IS
  'Members see their tenant''s subscription. Writes are service-role only — '
  'subscription state is owned by the Stripe webhook handler, which uses the '
  'service-role key INTENTIONALLY (this is one of the few server-only paths; '
  'see runner-jwt.md "Service-role usage boundaries").';

-- ============================================================================
-- cooling_off_windows
-- ============================================================================
ALTER TABLE cooling_off_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooling_off_windows FORCE  ROW LEVEL SECURITY;

CREATE POLICY cooling_off_member_select ON cooling_off_windows
  FOR SELECT TO authenticated USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY cooling_off_member_select ON cooling_off_windows IS
  'Members see their cooling-off windows. Writes are service-role (Stripe '
  'webhook + subscribe-handler).';

-- ============================================================================
-- billing_events  (Stripe webhook ledger; service-role-only writes)
-- ============================================================================
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events FORCE  ROW LEVEL SECURITY;

CREATE POLICY billing_events_member_select ON billing_events
  FOR SELECT TO authenticated USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY billing_events_member_select ON billing_events IS
  'Members can read their billing events for invoice history. Writes service-'
  'role only; idempotency-by-stripe_event_id is the dedup mechanism.';

-- ============================================================================
-- consent_records  (append-only via app layer; SELECT for self)
-- ============================================================================
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records FORCE  ROW LEVEL SECURITY;

CREATE POLICY consent_records_self_select ON consent_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY consent_records_self_insert ON consent_records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND auth.is_member_of(tenant_id));
COMMENT ON POLICY consent_records_self_select ON consent_records IS
  'Users read their own consent history. No cross-user reads.';
COMMENT ON POLICY consent_records_self_insert ON consent_records IS
  'Users append a new consent record per change (append-only ledger). UPDATE/'
  'DELETE intentionally absent — historic consent state is immutable.';

-- ============================================================================
-- data_exports
-- ============================================================================
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports FORCE  ROW LEVEL SECURITY;

CREATE POLICY data_exports_self_select ON data_exports
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY data_exports_self_insert ON data_exports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND auth.is_member_of(tenant_id));
COMMENT ON POLICY data_exports_self_select ON data_exports IS
  'Users read their own export history (GDPR Art. 20). Cross-user reads denied.';
COMMENT ON POLICY data_exports_self_insert ON data_exports IS
  'Users request their own exports. The export worker (service-role) updates '
  'status to ready/expired/failed via service-role connection.';

-- ============================================================================
-- audit_logs  (append-only; service-role + admin-reader only)
-- ============================================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE  ROW LEVEL SECURITY;

-- No PERMISSIVE policies for anon/authenticated — fully locked.
-- Service-role writes via the audit_log_write() SECURITY DEFINER function
-- (defined in 0005_lifecycle_emails_audit.sql per migration-order.md).

-- Explicit deny-UPDATE / deny-DELETE: with no permissive policies, RLS already
-- denies; we attach an explicit policy as documentation + belt-and-braces.
CREATE POLICY audit_logs_deny_update ON audit_logs FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY audit_logs_deny_delete ON audit_logs FOR DELETE TO authenticated USING (false);
COMMENT ON POLICY audit_logs_deny_update ON audit_logs IS
  'audit_logs is append-only. No UPDATE path exists for any client role.';
COMMENT ON POLICY audit_logs_deny_delete ON audit_logs IS
  'audit_logs is retained 7y per §14.4. No DELETE path exists for any client '
  'role; archival is a service-role-gated operation.';

-- ============================================================================
-- breach_events  (admin/incident-response only; no client access)
-- ============================================================================
ALTER TABLE breach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_events FORCE  ROW LEVEL SECURITY;

CREATE POLICY breach_events_deny_all ON breach_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
COMMENT ON POLICY breach_events_deny_all ON breach_events IS
  'breach_events is admin-only and contains pre-Art. 33-notification triage '
  'data. No client role may read or write. Reads via service-role + a hardened '
  'admin tool that itself requires MFA + IP-allowlist (TODO: per Shield STRIDE '
  'I-3 / R-2 admin-tooling threat model).';

-- ============================================================================
-- runner_token_mints  (B2 audit trail; service-role writes, admin reads)
-- ============================================================================
ALTER TABLE runner_token_mints ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_token_mints FORCE  ROW LEVEL SECURITY;

CREATE POLICY runner_token_mints_deny_all ON runner_token_mints
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
COMMENT ON POLICY runner_token_mints_deny_all ON runner_token_mints IS
  'Runner token mint audit trail. Service-role-only writes from the mint Edge '
  'Function; reads via admin tooling. Closes Atlas v0.2 Blocker B2 audit '
  'requirement: every short-lived runner JWT is accounted for.';

-- ============================================================================
-- End of rls-policies.sql.
-- TODO: per Shield's STRIDE threat-model deliverable (architecture/
-- threat-model.md), add per-table threat-bucket annotation to the affected
-- COMMENT ON POLICY rows once Shield publishes TB-N identifiers.
-- ============================================================================
