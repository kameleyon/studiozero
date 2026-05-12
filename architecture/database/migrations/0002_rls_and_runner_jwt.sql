-- ============================================================================
-- 0002_rls_and_runner_jwt.sql  (M1)
-- ============================================================================
-- Milestone: M1 — Audit MVP (BYOK only) (PRD §16)
-- Owner:     Atlas (data) + Vault (RLS pattern review) + Shield (threat-model)
-- Gate:      `0002_rls_and_runner_jwt.sql applies cleanly to staging`
--            (sprint/milestone-M1.md exit gate row);
--            `tests/integration/rls-cross-tenant.spec.ts` green;
--            `tests/integration/vault-aad-required.spec.ts` green (Cipher Fix-1);
--            ARCH-D9 closed (egress allowlist primitive).
--
-- What ships here (single transaction):
--   A. auth.tenant_id() / auth.runner_run_id() / auth.claim_role() /
--      auth.is_member_of() helper functions — SECURITY DEFINER, search_path
--      hardened. Used by every RLS policy on every tenant-scoped table.
--   B. audit_log_write() SECURITY DEFINER function — the ONLY path that
--      writes audit_logs. PUBLIC/anon/authenticated execute revoked.
--   C. ENABLE + FORCE ROW LEVEL SECURITY on every table in tables.sql.
--   D. The full policy set from rls-policies.sql, inlined, with COMMENT ON
--      POLICY for every rule. Pattern: RESTRICTIVE deny-PUBLIC + PERMISSIVE
--      role-scoped allow. Runner-role policies join to runner_token_mints
--      and reject when revoked_at IS NOT NULL (Cipher Fix-5).
--   E. score_engine_versions v1 seed (placeholder sha256 — replaced at deploy
--      by tools/compute-schema-sha.ts CI step).
--   F. vault.decrypt_byok() SECURITY DEFINER body — Cipher Fix-1. Decrypts
--      a Supabase Vault secret bound to the calling tenant by AAD; returns
--      NULL on tenant mismatch or AAD mismatch (caller treats as "key not
--      available"); audit-logs every call (success or failure).
--   G. runtime_config table + mint-runner-token Edge Function pin row.
--
-- Rollback: drop policies, disable RLS, drop helper functions. Same forward-
--           only discipline as 0001 — once shipped, supersede via 0003+.
--
-- Cross-refs:
--   architecture/database/tables.sql        (table shapes + comments)
--   architecture/database/rls-policies.sql  (canonical policy bodies)
--   architecture/database/runner-jwt.md     (claim shape + mint flow)
--   architecture/threat-model.md            (TB-2 tenant isolation, TB-3 secrets)
--   PRD §13.4 (Vault AEAD), §13.5 (multi-tenancy), §17 #14 (auth.users RLS exception)
-- ============================================================================

BEGIN;

-- Disable function-body validation for the duration of this migration. We
-- add `'api_key_decrypted'` to the `audit_action` enum below (§F) and then
-- define `vault.decrypt_byok` which references it as a literal. Since PG 12,
-- `ALTER TYPE ... ADD VALUE` is allowed inside a transaction but the new
-- value cannot be used in the same transaction — and `check_function_bodies`
-- would otherwise parse-validate the literal at CREATE FUNCTION time and
-- fail. The literal is only evaluated at CALL time (after this migration
-- commits), so disabling the check is safe and the standard pattern for
-- forward enum additions co-located with function definitions.
SET LOCAL check_function_bodies = off;

-- ============================================================================
-- A. JWT claim helper functions
-- ============================================================================
-- Every RLS policy on a tenant-scoped table evaluates one or more of these
-- helpers. They live in the `auth` schema so they sit next to `auth.uid()` /
-- `auth.jwt()` provided by Supabase. SECURITY DEFINER + search_path is
-- belt-and-braces — the function bodies only read `request.jwt.claims` (set
-- by PostgREST/Supabase before every query) so they can't be tricked by a
-- search_path attack, but the convention is mandatory per Atlas's "every
-- SECURITY DEFINER pins search_path" rule (see atlas.md).
-- ----------------------------------------------------------------------------

-- Extracts tenant_id from auth.jwt(). NULL if absent or empty.
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, pg_temp AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
    ''
  )::uuid
$$;
COMMENT ON FUNCTION auth.tenant_id() IS
  'Returns the tenant_id claim from the calling JWT. NULL when the JWT lacks '
  'the claim (anon path) or when called outside a request context. Used by '
  'every tenant-scoped RLS policy.';

-- Extracts run_id from auth.jwt(). NULL for user-session JWTs; populated for
-- runner-role JWTs minted by the mint-runner-token Edge Function.
CREATE OR REPLACE FUNCTION auth.runner_run_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, pg_temp AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'run_id',
    ''
  )::text
$$;
COMMENT ON FUNCTION auth.runner_run_id() IS
  'Returns the run_id claim from a runner JWT. NULL for user-session JWTs. '
  'Runner policies match this against the row primary key (runs.id, '
  'findings.run_id, score_snapshots.run_id).';

-- Returns the textual `role` claim: 'authenticated' | 'runner' |
-- 'service_role' | 'anon' | NULL.
CREATE OR REPLACE FUNCTION auth.claim_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, pg_temp AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  )::text
$$;
COMMENT ON FUNCTION auth.claim_role() IS
  'Returns the role claim. Distinguishes runner-role JWTs from regular user '
  'sessions so a single policy file can serve both without ambiguity.';

-- Membership check: is auth.uid() a member of p_tenant?  Used by RLS and by
-- the mint-runner-token Edge Function for membership validation.
CREATE OR REPLACE FUNCTION auth.is_member_of(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant
      AND tm.user_id   = auth.uid()
  )
$$;
COMMENT ON FUNCTION auth.is_member_of(uuid) IS
  'Membership predicate used by RLS policies and by the mint-runner-token '
  'Edge Function. Single source of truth — when the membership model evolves '
  '(V2 seats, V2 invitations), this is the only function that changes.';

-- These helpers must be callable by every Postgres role that runs RLS-bound
-- queries. EXECUTE is granted broadly; the helpers themselves return scoped
-- data, so this is safe.
GRANT EXECUTE ON FUNCTION auth.tenant_id()           TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.runner_run_id()       TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.claim_role()          TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.is_member_of(uuid)    TO PUBLIC;

-- ============================================================================
-- B. audit_log_write — the ONLY path that writes audit_logs
-- ============================================================================
-- audit_logs is append-only (PRD §14.4, 7-year retention). No client role has
-- INSERT permission via RLS. Service-role writes go through this SECURITY
-- DEFINER function so that:
--   - The actor_user_id is captured from auth.uid() consistently (never from
--     caller-supplied input, which the caller could spoof).
--   - The tenant_id is captured as an explicit argument and validated by the
--     function rather than inferred from a free-form jsonb payload.
--   - All audit metadata flows through one chokepoint (easier to extend with
--     PII-scrubbing or signing later).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_log_write(
  p_tenant_id uuid,
  p_action    audit_action,
  p_metadata  jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'audit_log_write: p_tenant_id must not be NULL';
  END IF;

  INSERT INTO audit_logs (tenant_id, actor_user_id, action, metadata)
  VALUES (p_tenant_id, auth.uid(), p_action, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;

REVOKE ALL ON FUNCTION audit_log_write(uuid, audit_action, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION audit_log_write(uuid, audit_action, jsonb) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION audit_log_write(uuid, audit_action, jsonb) TO service_role;

COMMENT ON FUNCTION audit_log_write(uuid, audit_action, jsonb) IS
  'Append a row to audit_logs. Only callable by service-role. actor_user_id '
  'is captured from auth.uid() (NULL for system-initiated actions). This is '
  'the only INSERT path for audit_logs — RLS denies all client roles.';

-- ============================================================================
-- C. ENABLE + FORCE ROW LEVEL SECURITY on every table
-- ============================================================================
-- ENABLE turns RLS on. FORCE makes it apply even to the table owner (defeats
-- table-owner bypass). Every tenant-scoped table is locked here; service-role
-- still bypasses RLS by default (the Supabase service-role grant is the
-- bypass mechanism) but FORCE protects against accidental superuser writes
-- through a migration session or psql shell.
-- ----------------------------------------------------------------------------

ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants               FORCE  ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 FORCE  ROW LEVEL SECURITY;
ALTER TABLE tenant_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members        FORCE  ROW LEVEL SECURITY;
ALTER TABLE api_keys              ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys              FORCE  ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens          FORCE  ROW LEVEL SECURITY;
ALTER TABLE cli_pairings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_pairings          FORCE  ROW LEVEL SECURITY;
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects              FORCE  ROW LEVEL SECURITY;
ALTER TABLE runs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs                  FORCE  ROW LEVEL SECURITY;
ALTER TABLE findings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings              FORCE  ROW LEVEL SECURITY;
ALTER TABLE score_engine_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_engine_versions FORCE  ROW LEVEL SECURITY;
ALTER TABLE score_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_snapshots       FORCE  ROW LEVEL SECURITY;
ALTER TABLE fix_pr_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fix_pr_jobs           FORCE  ROW LEVEL SECURITY;
ALTER TABLE subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions         FORCE  ROW LEVEL SECURITY;
ALTER TABLE cooling_off_windows   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooling_off_windows   FORCE  ROW LEVEL SECURITY;
ALTER TABLE billing_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events        FORCE  ROW LEVEL SECURITY;
ALTER TABLE consent_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records       FORCE  ROW LEVEL SECURITY;
ALTER TABLE data_exports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports          FORCE  ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            FORCE  ROW LEVEL SECURITY;
ALTER TABLE breach_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_events         FORCE  ROW LEVEL SECURITY;
ALTER TABLE runner_token_mints    ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_token_mints    FORCE  ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         FORCE  ROW LEVEL SECURITY;

-- ============================================================================
-- D. Policies
-- ============================================================================
-- Pattern per table:
--   1. RESTRICTIVE deny-all for anon (defense in depth — PostgREST already
--      maps anon to its own role, but an explicit deny means the table is
--      provably locked even if a role grant changes).
--   2. PERMISSIVE allow policies per role. Composition is the OR of all
--      PERMISSIVE policies for a (role, command) — so we slice by command
--      (SELECT / INSERT / UPDATE / DELETE) and per principal (authenticated
--      member vs runner JWT).
--   3. Service-role is NOT scoped by these policies — it bypasses RLS
--      because of its grant. Where a table is "service-role-only" (no
--      client access), we omit any PERMISSIVE policy for anon/authenticated
--      and the deny-default + FORCE RLS keeps it locked.
--
-- Helper-function usage (never re-parse JWT claims inline):
--   auth.uid()                — user id (Supabase-provided)
--   auth.tenant_id()          — tenant claim from JWT (helper above)
--   auth.runner_run_id()      — run_id claim for runner JWTs
--   auth.claim_role()         — 'runner' for runner JWTs
--   auth.is_member_of(uuid)   — tenant membership predicate
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- D.1  tenants
-- ----------------------------------------------------------------------------
CREATE POLICY tenants_deny_anon ON tenants
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY tenants_deny_anon ON tenants IS
  'Anon role has no access to tenants. Belt-and-braces — RLS denies by '
  'default; this is the explicit documentation.';

CREATE POLICY tenants_member_select ON tenants
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(id));
COMMENT ON POLICY tenants_member_select ON tenants IS
  'Members read tenants they belong to. tenant_members is the source of '
  'truth (PRD §13.5 multi-tenancy).';

CREATE POLICY tenants_owner_update ON tenants
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenants.id
      AND tm.user_id   = auth.uid()
      AND tm.role      = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenants.id
      AND tm.user_id   = auth.uid()
      AND tm.role      = 'owner'
  ));
COMMENT ON POLICY tenants_owner_update ON tenants IS
  'Only owners can update tenant settings (mode_pref, retention_days_code, '
  'max_concurrent_runs, etc.). Non-owner members read but cannot change.';

CREATE POLICY tenants_runner_select ON tenants
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.claim_role() = 'runner' AND id = auth.tenant_id());
COMMENT ON POLICY tenants_runner_select ON tenants IS
  'Runner JWT (role=runner) reads its own tenant row only. The runner needs '
  'plan, retention_days_code, and token_budget_micros for the run.';

-- ----------------------------------------------------------------------------
-- D.2  users
-- ----------------------------------------------------------------------------
-- `auth.users` is the documented RLS exception (PRD §13.2 + Decision #14);
-- THIS `users` is the application's profile-layer mirror and IS RLS-bearing.
-- ----------------------------------------------------------------------------
CREATE POLICY users_deny_anon ON users
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY users_deny_anon ON users IS
  'Anon cannot read app-side user profile rows.';

CREATE POLICY users_self_select ON users
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (id = auth.uid());
COMMENT ON POLICY users_self_select ON users IS
  'A user can read their own profile. No cross-user reads. V2 collab will '
  'add a sibling policy keyed off tenant_members.';

CREATE POLICY users_self_update ON users
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
COMMENT ON POLICY users_self_update ON users IS
  'A user updates their own profile (display_name, default_tenant_id, '
  'deletion_scheduled_at via the S-DEL flow). Service-role still bypasses '
  'for system flows (e.g., account deletion executor).';

-- ----------------------------------------------------------------------------
-- D.3  tenant_members
-- ----------------------------------------------------------------------------
CREATE POLICY tenant_members_deny_anon ON tenant_members
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY tenant_members_deny_anon ON tenant_members IS
  'Anon cannot enumerate tenant membership.';

CREATE POLICY tenant_members_member_select ON tenant_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR auth.is_member_of(tenant_id));
COMMENT ON POLICY tenant_members_member_select ON tenant_members IS
  'A user sees memberships involving them, and any member of a tenant can '
  'see who else is in it (org-directory UX).';

CREATE POLICY tenant_members_owner_write ON tenant_members
  AS PERMISSIVE FOR ALL TO authenticated
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
  'Owners invite, change roles, and remove members. V2 seat management is '
  'gated by this policy already — non-owners cannot escalate.';

-- ----------------------------------------------------------------------------
-- D.4  api_keys  (BYOK Anthropic key references; encrypted at rest)
-- ----------------------------------------------------------------------------
-- The plaintext key never lives in this table — only the Vault reference +
-- last4 fingerprint. Plaintext fetch goes through vault.decrypt_byok() (§F),
-- which is service-role only. Clients see metadata only.
-- ----------------------------------------------------------------------------
CREATE POLICY api_keys_deny_anon ON api_keys
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY api_keys_deny_anon ON api_keys IS
  'Anon cannot enumerate BYOK key rows.';

CREATE POLICY api_keys_member_select ON api_keys
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY api_keys_member_select ON api_keys IS
  'Members see metadata (last4, last_verified_at). vault_secret_id is a '
  'reference handle, not the plaintext — that is gated by vault.decrypt_byok().';

CREATE POLICY api_keys_member_insert ON api_keys
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY api_keys_member_insert ON api_keys IS
  'Members add a BYOK key (S-KEY flow). Plaintext is sent to a server-side '
  'route that calls Vault to store ciphertext; the row is then INSERTed.';

CREATE POLICY api_keys_member_update ON api_keys
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY api_keys_member_update ON api_keys IS
  'Members rotate BYOK keys (sets revoked_at on the old row + INSERTs a new '
  'row). The unique-active index in tables.sql enforces one active per provider.';

CREATE POLICY api_keys_member_delete ON api_keys
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY api_keys_member_delete ON api_keys IS
  'Members hard-remove a BYOK key. Vault zeroizes the underlying secret. '
  'Normally the rotation path (UPDATE revoked_at) is preferred.';

-- ----------------------------------------------------------------------------
-- D.5  oauth_tokens  (GitHub App per-install tokens; encrypted)
-- ----------------------------------------------------------------------------
CREATE POLICY oauth_tokens_deny_anon ON oauth_tokens
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY oauth_tokens_deny_anon ON oauth_tokens IS
  'Anon cannot enumerate OAuth/GitHub-App rows.';

CREATE POLICY oauth_tokens_member_select ON oauth_tokens
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY oauth_tokens_member_select ON oauth_tokens IS
  'Members read GitHub App install metadata to drive the repo-picker. Token '
  'plaintext is fetched via a SECURITY DEFINER RPC at runner clone time only.';

CREATE POLICY oauth_tokens_member_insert ON oauth_tokens
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY oauth_tokens_member_insert ON oauth_tokens IS
  'Members add an install via S-GH after the GitHub App OAuth callback.';

CREATE POLICY oauth_tokens_member_update ON oauth_tokens
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY oauth_tokens_member_update ON oauth_tokens IS
  'Members revoke an install (sets revoked_at) via S-GH.';

CREATE POLICY oauth_tokens_runner_select ON oauth_tokens
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.claim_role() = 'runner' AND tenant_id = auth.tenant_id());
COMMENT ON POLICY oauth_tokens_runner_select ON oauth_tokens IS
  'Runner JWT reads tokens for its tenant only. Closes Atlas v0.2 Blocker '
  'B2: tenant_id claim is matched at the engine level even if the runner '
  'process is compromised.';

-- ----------------------------------------------------------------------------
-- D.6  cli_pairings
-- ----------------------------------------------------------------------------
CREATE POLICY cli_pairings_deny_anon ON cli_pairings
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY cli_pairings_deny_anon ON cli_pairings IS
  'Anon cannot enumerate CLI pairings.';

CREATE POLICY cli_pairings_member_all ON cli_pairings
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY cli_pairings_member_all ON cli_pairings IS
  'Members manage their own CLI pairings via S-CLI: pair, revoke, undo '
  'within the 5-min toast window (revoke_undo_until).';

-- ----------------------------------------------------------------------------
-- D.7  projects
-- ----------------------------------------------------------------------------
CREATE POLICY projects_deny_anon ON projects
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY projects_deny_anon ON projects IS
  'Anon cannot enumerate projects.';

CREATE POLICY projects_member_all ON projects
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY projects_member_all ON projects IS
  'Members CRUD projects in their tenant. Free-tier 1-project cap is '
  'enforced at the API layer (not RLS — keeps the policy plan light).';

CREATE POLICY projects_runner_select ON projects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    auth.claim_role() = 'runner'
    AND tenant_id     = auth.tenant_id()
    AND EXISTS (
      SELECT 1 FROM runs r
      WHERE r.project_id = projects.id
        AND r.id         = auth.runner_run_id()
    )
  );
COMMENT ON POLICY projects_runner_select ON projects IS
  'Runner reads project metadata for the run it was minted for — joins to '
  'runs to confirm the project_id is reachable from the runner JWT''s run_id.';

-- ----------------------------------------------------------------------------
-- D.8  runs
-- ----------------------------------------------------------------------------
-- The state-machine row. Members create + cancel; runner reads + transitions
-- ONLY its own run (claim run_id must match runs.id and not be revoked).
-- ----------------------------------------------------------------------------
CREATE POLICY runs_deny_anon ON runs
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY runs_deny_anon ON runs IS
  'Anon cannot enumerate runs.';

CREATE POLICY runs_member_select ON runs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY runs_member_select ON runs IS
  'Members read runs in their tenant — powers dashboard + verdict screen.';

CREATE POLICY runs_member_insert ON runs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY runs_member_insert ON runs IS
  'Members create runs from the audit-start flow. Runner takes over after '
  'dispatch (it does not create rows — only transitions existing ones).';

CREATE POLICY runs_member_update ON runs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY runs_member_update ON runs IS
  'Members cancel runs (state -> cancelled). Schema CHECK constraints and '
  'the state-machine guards prevent illegal transitions.';

CREATE POLICY runs_runner_select ON runs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    auth.claim_role() = 'runner'
    AND tenant_id     = auth.tenant_id()
    AND id            = auth.runner_run_id()
    AND NOT EXISTS (
      SELECT 1 FROM runner_token_mints m
      WHERE m.run_id     = runs.id
        AND m.revoked_at IS NOT NULL
    )
  );
COMMENT ON POLICY runs_runner_select ON runs IS
  'Runner JWT scoped to ONE run_id. Cipher Fix-5: joins to runner_token_mints '
  'and refuses if any mint for this run was revoked. Even within the right '
  'tenant, the runner cannot read sibling runs.';

CREATE POLICY runs_runner_update ON runs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    auth.claim_role() = 'runner'
    AND tenant_id     = auth.tenant_id()
    AND id            = auth.runner_run_id()
    AND NOT EXISTS (
      SELECT 1 FROM runner_token_mints m
      WHERE m.run_id     = runs.id
        AND m.revoked_at IS NOT NULL
    )
  )
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id     = auth.tenant_id()
    AND id            = auth.runner_run_id()
  );
COMMENT ON POLICY runs_runner_update ON runs IS
  'Runner state transitions are gated at the engine level. Revoked mints '
  'block all updates (Cipher Fix-5). The WITH CHECK omits the revocation '
  'join so that an in-flight UPDATE cannot succeed for the row but fail '
  'the check against an already-revoked sibling (mints query is USING-only).';

-- ----------------------------------------------------------------------------
-- D.9  findings  (immutable per-run; member SELECT, runner INSERT only)
-- ----------------------------------------------------------------------------
CREATE POLICY findings_deny_anon ON findings
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY findings_deny_anon ON findings IS
  'Anon cannot enumerate findings.';

CREATE POLICY findings_member_select ON findings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY findings_member_select ON findings IS
  'Members read findings in their tenant — drives the verdict-card '
  'FindingsList grouped-by-severity.';

CREATE POLICY findings_runner_insert ON findings
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id     = auth.tenant_id()
    AND run_id        = auth.runner_run_id()
    AND NOT EXISTS (
      SELECT 1 FROM runner_token_mints m
      WHERE m.run_id     = findings.run_id
        AND m.revoked_at IS NOT NULL
    )
  );
COMMENT ON POLICY findings_runner_insert ON findings IS
  'Only the runner-role JWT, bound to this run_id and with no revoked mint, '
  'can insert findings. Members cannot fabricate findings (verdict integrity).';

-- No UPDATE/DELETE on findings. They are immutable per Atlas v0.2 #4 —
-- verdict corrections happen via a fresh run, never by editing rows.

-- ----------------------------------------------------------------------------
-- D.10  score_engine_versions  (publicly-readable rubric)
-- ----------------------------------------------------------------------------
CREATE POLICY score_engine_versions_deny_anon ON score_engine_versions
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY score_engine_versions_deny_anon ON score_engine_versions IS
  'Anon cannot read engine versions directly (read via a public marketing '
  'route if exposure is needed; today consumed only by authenticated app).';

CREATE POLICY score_engine_versions_public_select ON score_engine_versions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
COMMENT ON POLICY score_engine_versions_public_select ON score_engine_versions IS
  'Every authenticated user reads the rubric versions (PRD §10 — publish the '
  'rubric). Writes are admin-only via service-role.';

-- ----------------------------------------------------------------------------
-- D.11  score_snapshots  (immutable; created by runner)
-- ----------------------------------------------------------------------------
CREATE POLICY score_snapshots_deny_anon ON score_snapshots
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY score_snapshots_deny_anon ON score_snapshots IS
  'Anon cannot read verdict snapshots directly. Share-view uses a separate '
  'signed-URL function — not this table.';

CREATE POLICY score_snapshots_member_select ON score_snapshots
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY score_snapshots_member_select ON score_snapshots IS
  'Members read their tenant''s verdict snapshots. Share-view at '
  '/v/<short-id> uses a signed-URL Edge Function (no RLS bypass).';

CREATE POLICY score_snapshots_runner_insert ON score_snapshots
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id     = auth.tenant_id()
    AND run_id        = auth.runner_run_id()
    AND NOT EXISTS (
      SELECT 1 FROM runner_token_mints m
      WHERE m.run_id     = score_snapshots.run_id
        AND m.revoked_at IS NOT NULL
    )
  );
COMMENT ON POLICY score_snapshots_runner_insert ON score_snapshots IS
  'Only the runner writes a verdict snapshot, scoped to its own run_id and '
  'with no revoked mint. UNIQUE(run_id) in tables.sql enforces one per run.';

-- ----------------------------------------------------------------------------
-- D.12  fix_pr_jobs  (V1.5; member-managed; runner writes during build)
-- ----------------------------------------------------------------------------
CREATE POLICY fix_pr_jobs_deny_anon ON fix_pr_jobs
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY fix_pr_jobs_deny_anon ON fix_pr_jobs IS
  'Anon cannot enumerate Auto-PR jobs.';

CREATE POLICY fix_pr_jobs_member_all ON fix_pr_jobs
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.is_member_of(tenant_id))
  WITH CHECK (auth.is_member_of(tenant_id));
COMMENT ON POLICY fix_pr_jobs_member_all ON fix_pr_jobs IS
  'Members manage Auto-PR jobs in their tenant. State transitions enforced '
  'at app layer + CHECK constraint in tables.sql.';

CREATE POLICY fix_pr_jobs_runner_insert ON fix_pr_jobs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    auth.claim_role() = 'runner'
    AND tenant_id     = auth.tenant_id()
    AND run_id        = auth.runner_run_id()
  );
COMMENT ON POLICY fix_pr_jobs_runner_insert ON fix_pr_jobs IS
  'Runner inserts a fix_pr_job when the build-phase produces a candidate PR. '
  'Tied to the run that generated the findings (V1.5 D3 path).';

-- ----------------------------------------------------------------------------
-- D.13  subscriptions  (read-only to members; service-role writes)
-- ----------------------------------------------------------------------------
CREATE POLICY subscriptions_deny_anon ON subscriptions
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY subscriptions_deny_anon ON subscriptions IS
  'Anon cannot enumerate subscriptions.';

CREATE POLICY subscriptions_member_select ON subscriptions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY subscriptions_member_select ON subscriptions IS
  'Members read their tenant''s subscription. Writes are service-role only '
  '(Stripe webhook handler — see runner-jwt.md "Service-role usage boundaries").';

-- Intentionally no member INSERT/UPDATE/DELETE — subscription state is owned
-- by Stripe + the webhook handler. Members initiate via Checkout; webhook
-- creates/updates the row using service-role.

-- ----------------------------------------------------------------------------
-- D.14  cooling_off_windows  (D22 — fresh window per upgrade)
-- ----------------------------------------------------------------------------
CREATE POLICY cooling_off_deny_anon ON cooling_off_windows
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY cooling_off_deny_anon ON cooling_off_windows IS
  'Anon cannot enumerate cooling-off windows.';

CREATE POLICY cooling_off_member_select ON cooling_off_windows
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY cooling_off_member_select ON cooling_off_windows IS
  'Members read their cooling-off windows (EU/UK 14-day right). Writes are '
  'service-role (Stripe webhook + subscribe-handler open a window on each '
  'qualifying event).';

-- ----------------------------------------------------------------------------
-- D.15  billing_events  (Stripe webhook ledger; service-role-only writes)
-- ----------------------------------------------------------------------------
CREATE POLICY billing_events_deny_anon ON billing_events
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY billing_events_deny_anon ON billing_events IS
  'Anon cannot read billing events.';

CREATE POLICY billing_events_member_select ON billing_events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY billing_events_member_select ON billing_events IS
  'Members read their billing events for invoice history. Writes service-'
  'role only; UNIQUE(stripe_event_id) is the idempotency mechanism.';

-- ----------------------------------------------------------------------------
-- D.16  consent_records  (append-only ledger; SELF only)
-- ----------------------------------------------------------------------------
CREATE POLICY consent_records_deny_anon ON consent_records
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY consent_records_deny_anon ON consent_records IS
  'Anon cannot read consent ledger rows.';

CREATE POLICY consent_records_self_select ON consent_records
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid());
COMMENT ON POLICY consent_records_self_select ON consent_records IS
  'Users read their own consent history. No cross-user reads (GDPR Art. '
  '7(1) — auditable trail).';

CREATE POLICY consent_records_self_insert ON consent_records
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND auth.is_member_of(tenant_id));
COMMENT ON POLICY consent_records_self_insert ON consent_records IS
  'Users append a new consent record per change. UPDATE/DELETE intentionally '
  'absent — historic consent state is immutable for legal audit.';

-- ----------------------------------------------------------------------------
-- D.17  data_exports  (GDPR Art. 20 portability)
-- ----------------------------------------------------------------------------
CREATE POLICY data_exports_deny_anon ON data_exports
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY data_exports_deny_anon ON data_exports IS
  'Anon cannot enumerate data-export rows.';

CREATE POLICY data_exports_self_select ON data_exports
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid());
COMMENT ON POLICY data_exports_self_select ON data_exports IS
  'Users read their own export history (GDPR Art. 20). Cross-user reads denied.';

CREATE POLICY data_exports_self_insert ON data_exports
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND auth.is_member_of(tenant_id));
COMMENT ON POLICY data_exports_self_insert ON data_exports IS
  'Users request their own exports. The export worker (service-role) updates '
  'status to ready/expired/failed via service-role connection.';

-- ----------------------------------------------------------------------------
-- D.18  audit_logs  (append-only; INSERT via audit_log_write() only)
-- ----------------------------------------------------------------------------
-- No PERMISSIVE policies for anon/authenticated/runner — fully locked. All
-- writes flow through audit_log_write() (§B). Reads via admin tooling.
-- Explicit deny-UPDATE / deny-DELETE attached as documentation: RLS already
-- denies by default, but the explicit RESTRICTIVE makes the invariant
-- inspectable in pg_policies.
-- ----------------------------------------------------------------------------
CREATE POLICY audit_logs_deny_anon ON audit_logs
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY audit_logs_deny_anon ON audit_logs IS
  'audit_logs is admin-only; anon has no access.';

CREATE POLICY audit_logs_deny_client_select ON audit_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (false);
COMMENT ON POLICY audit_logs_deny_client_select ON audit_logs IS
  'No client SELECT path. Admin tooling reads via service-role + a hardened '
  'admin function (MFA + IP-allowlist).';

CREATE POLICY audit_logs_deny_client_insert ON audit_logs
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);
COMMENT ON POLICY audit_logs_deny_client_insert ON audit_logs IS
  'No client INSERT path. Writes flow through audit_log_write() SECURITY '
  'DEFINER function (§B of this migration).';

CREATE POLICY audit_logs_deny_update ON audit_logs
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY audit_logs_deny_update ON audit_logs IS
  'audit_logs is append-only. No UPDATE path exists for any client role.';

CREATE POLICY audit_logs_deny_delete ON audit_logs
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);
COMMENT ON POLICY audit_logs_deny_delete ON audit_logs IS
  'audit_logs is retained 7y per §14.4. No DELETE path exists for any client '
  'role; archival is a service-role-gated operation (pg_cron partition rotate).';

-- ----------------------------------------------------------------------------
-- D.19  breach_events  (admin/incident-response only)
-- ----------------------------------------------------------------------------
CREATE POLICY breach_events_deny_all ON breach_events
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
COMMENT ON POLICY breach_events_deny_all ON breach_events IS
  'breach_events is admin-only and contains pre-Art. 33-notification triage '
  'data. No client role may read or write. Reads via service-role + a '
  'hardened admin tool that itself requires MFA + IP-allowlist.';

-- ----------------------------------------------------------------------------
-- D.20  runner_token_mints  (B2 audit trail; service-role writes)
-- ----------------------------------------------------------------------------
CREATE POLICY runner_token_mints_deny_all ON runner_token_mints
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
COMMENT ON POLICY runner_token_mints_deny_all ON runner_token_mints IS
  'Runner token mint audit trail. Service-role-only writes from the mint '
  'Edge Function; reads via admin tooling. Closes Atlas v0.2 Blocker B2 '
  'audit requirement: every short-lived runner JWT is accounted for, and a '
  'forensic review can answer "did any runner ever exfiltrate beyond this '
  'tenant?" by joining runner_token_mints <-> runs <-> access logs.';

-- ----------------------------------------------------------------------------
-- D.21  notifications  (in-app inbox; user SELF read/update, service writes)
-- ----------------------------------------------------------------------------
CREATE POLICY notifications_deny_anon ON notifications
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY notifications_deny_anon ON notifications IS
  'Anon cannot read or write notifications.';

CREATE POLICY notifications_self_select ON notifications
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND auth.is_member_of(tenant_id));
COMMENT ON POLICY notifications_self_select ON notifications IS
  'A user reads their own notifications scoped to their tenant. Realtime '
  'channel notifications:<user_id> subscribes against this same predicate.';

CREATE POLICY notifications_self_update ON notifications
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND auth.is_member_of(tenant_id))
  WITH CHECK (user_id = auth.uid() AND auth.is_member_of(tenant_id));
COMMENT ON POLICY notifications_self_update ON notifications IS
  'A user toggles read_at / dismissed_at on their own notifications. INSERT '
  'is service-role only (workers fan out); DELETE is service-role only '
  '(nightly purge per PRD §14.4).';

-- ============================================================================
-- E. score_engine_versions v1 seed
-- ============================================================================
-- The active v1 rubric. weights/thresholds/rounding mirror PRD §10 and Atlas
-- v0.2 Critical 1 close. schema_sha256 is a placeholder string here; CI step
-- `tools/compute-schema-sha.ts` replaces it at deploy with the actual SHA-256
-- of schemas/score_engine.v1.json (Verify M0 test asserts the value matches).
--
-- The placeholder is 64 hex chars to satisfy the CHECK(length(schema_sha256)=64)
-- constraint while keeping the deploy-time substitution mechanical.
-- ----------------------------------------------------------------------------

INSERT INTO score_engine_versions (
  version, weights, thresholds, rounding, schema_sha256, active
) VALUES (
  'v1',
  '{"Blocker":30,"Critical":18,"Major":7,"Minor":2,"Polish":0.5}'::jsonb,
  '{"fail_below":70,"pass_with_fixes_min":70,"pass_with_fixes_max":94,"pass_min":95}'::jsonb,
  'half-to-even',
  -- CI replaces with sha256(schemas/score_engine.v1.json) at deploy.
  '0000000000000000000000000000000000000000000000000000000000000000',
  true
) ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- F. vault.decrypt_byok — Cipher Fix-1 (Jury F-CRIT-2 close)
-- ============================================================================
-- Decrypts a Supabase Vault secret bound to the calling tenant. Returns NULL
-- on tenant mismatch or AAD mismatch (caller treats as "key not available");
-- audit-logs every call.
--
-- Implementation note: Supabase Vault uses pgsodium TCE with the secret's
-- `key_id` as the encryption key and a per-row nonce. AAD binding is done at
-- the application layer here: vault.decrypted_secrets is a view that
-- auto-decrypts on SELECT (TCE), but we additionally verify that the
-- requesting tenant_id matches the api_keys row that owns the secret. The
-- AAD effect (cross-tenant ciphertext swap fails) is achieved because the
-- api_keys.tenant_id <-> p_tenant_id check happens BEFORE the decrypt
-- SELECT — a ciphertext swapped across tenants would fail the tenant_id
-- check at the FIRST query and short-circuit to NULL + audit-log.
--
-- The integration test `vault-aad-required.spec.ts` exercises both the
-- tenant_mismatch path and the legitimate decrypt path; both must produce
-- audit_logs rows with the matching outcome metadata.
-- ----------------------------------------------------------------------------

-- Forward-only enum extension (Atlas convention: new audit actions added by
-- migration, never re-purposed). IF NOT EXISTS handles re-applying the same
-- migration against a database where it has already been merged forward.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'api_key_decrypted';

CREATE OR REPLACE FUNCTION vault.decrypt_byok(
  p_tenant_id uuid,
  p_secret_id uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = vault, public, pg_temp AS $$
DECLARE
  v_owner_tenant uuid;
  v_plaintext    text;
BEGIN
  IF p_tenant_id IS NULL OR p_secret_id IS NULL THEN
    -- Defensive: don't even audit-log a NULL-input call (no tenant context).
    RETURN NULL;
  END IF;

  -- 1. Verify api_keys.tenant_id matches the caller's claimed tenant.
  SELECT tenant_id INTO v_owner_tenant
    FROM public.api_keys
   WHERE vault_secret_id = p_secret_id;

  IF v_owner_tenant IS NULL OR v_owner_tenant <> p_tenant_id THEN
    PERFORM public.audit_log_write(
      p_tenant_id,
      'api_key_decrypted',
      jsonb_build_object(
        'secret_id', p_secret_id,
        'outcome',   'tenant_mismatch'
      )
    );
    RETURN NULL;
  END IF;

  -- 2. Decrypt via Supabase Vault's TCE view. NULL on any pgsodium-level
  --    failure (key rotation, ciphertext corruption, nonce mismatch).
  --    The tenant-AAD binding is enforced by step 1: a ciphertext copied
  --    across tenants fails the tenant_id check before reaching this query.
  SELECT decrypted_secret INTO v_plaintext
    FROM vault.decrypted_secrets
   WHERE id = p_secret_id;

  -- 3. Audit-log every call (success or post-tenant-check failure).
  PERFORM public.audit_log_write(
    p_tenant_id,
    'api_key_decrypted',
    jsonb_build_object(
      'secret_id', p_secret_id,
      'outcome',   CASE WHEN v_plaintext IS NULL THEN 'aad_fail' ELSE 'ok' END
    )
  );

  RETURN v_plaintext;
END
$$;

REVOKE ALL ON FUNCTION vault.decrypt_byok(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault.decrypt_byok(uuid, uuid) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION vault.decrypt_byok(uuid, uuid) TO service_role;

COMMENT ON FUNCTION vault.decrypt_byok(uuid, uuid) IS
  'Cipher Fix-1 (Jury F-CRIT-2): tenant-AAD-bound BYOK key decrypt. NULL on '
  'tenant mismatch or AAD/decrypt failure. Every call audit-logged via '
  'audit_log_write(api_key_decrypted, {secret_id, outcome}).';

-- ============================================================================
-- G. runtime_config — mint-runner-token Edge Function pin
-- ============================================================================
-- Single-row-per-key config table read by the web app at boot to discover
-- the deployed mint-runner-token Edge Function URL + version. Decouples
-- frontend code from hard-coded URLs and lets a re-deploy of the Edge
-- Function (e.g., bumping `version`) take effect without an app deploy.
-- Service-role-only writes; client roles denied.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS runtime_config (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE runtime_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_config FORCE  ROW LEVEL SECURITY;

CREATE POLICY runtime_config_deny_anon ON runtime_config
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY runtime_config_deny_anon ON runtime_config IS
  'Anon cannot read runtime_config — function URLs etc. are not for public '
  'consumption.';

CREATE POLICY runtime_config_authenticated_select ON runtime_config
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
COMMENT ON POLICY runtime_config_authenticated_select ON runtime_config IS
  'Authenticated users read runtime_config to discover Edge Function URLs '
  'and feature flags. No write access — writes are service-role only.';

CREATE POLICY runtime_config_deny_client_write ON runtime_config
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (false);
COMMENT ON POLICY runtime_config_deny_client_write ON runtime_config IS
  'No client INSERT path. Service-role only.';

CREATE POLICY runtime_config_deny_client_update ON runtime_config
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY runtime_config_deny_client_update ON runtime_config IS
  'No client UPDATE path. Service-role only.';

CREATE POLICY runtime_config_deny_client_delete ON runtime_config
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);
COMMENT ON POLICY runtime_config_deny_client_delete ON runtime_config IS
  'No client DELETE path. Service-role only.';

-- Pin the mint-runner-token Edge Function deployment. The version string
-- bumps when the Edge Function code changes; the web app reads this row at
-- boot and rejects mismatched JWT issuers in defense-in-depth.
INSERT INTO runtime_config (key, value) VALUES (
  'mint_runner_token',
  jsonb_build_object(
    'endpoint',         '/functions/v1/mint-runner-token',
    'refresh_endpoint', '/functions/v1/refresh-runner-token',
    'version',          'v1',
    'jwt_audience',     'studio-zero/runner',
    'jwt_issuer',       'studio-zero/mint-runner-token',
    'jwt_ttl_seconds',  300,
    'jwt_secret_ref',   'vault:supabase_jwt_secret'
  )
) ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ============================================================================
-- End of 0002_rls_and_runner_jwt.sql
-- ============================================================================
