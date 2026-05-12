-- ─────────────────────────────────────────────────────────────────────
-- Minimal dev-time seed data for Studio Zero.
--
-- Loaded via:  supabase db reset   (which runs migrations + this file)
--
-- Scope: ONE tenant, ONE user, ONE active score_engine_versions row.
-- This is enough to let:
--   - Forge's first synthetic Surface audit POC run end-to-end against
--     a hand-crafted fixture repo (per milestone-M0.md "Forge: first
--     synthetic Surface-audit POC").
--   - Verify's RLS smoke test cross-tenant SELECT returns 0 rows.
--   - Local browser-based smoke testing of /signup → /app/projects/new.
--
-- DO NOT load this into staging or production. Belt-and-suspenders:
-- the migration runner refuses to load seed.sql against any project
-- whose URL doesn't match the local-dev placeholder.
-- ─────────────────────────────────────────────────────────────────────

-- Safety gate: this file is local-dev only.
DO $$
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'dev', '') THEN
    RAISE EXCEPTION 'seed.sql refuses to run outside local dev (app.environment=%)',
      current_setting('app.environment', true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Score engine versions — v1 row matches architecture/schemas/score_engine.v1.json.
-- Atlas's 0001_initial.sql creates the table; this seed inserts the
-- first row so the runner can stamp score_snapshots.score_engine_version
-- without a missing-FK failure.
--
-- Update the JSON column when score_engine.v1.json itself changes
-- (lockstep with the schema file in architecture/schemas/).
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO score_engine_versions (version, weights, thresholds, active, created_at)
VALUES (
  'v1',
  -- weights — placeholder shape; Atlas confirms exact keys against
  -- the JSON file at M0 wk-2 when 0001_initial.sql lands.
  '{
    "ux": 0.20,
    "accessibility": 0.20,
    "brand": 0.15,
    "performance": 0.15,
    "security": 0.15,
    "code_quality": 0.15
  }'::jsonb,
  '{
    "pass": 85,
    "pass_with_fixes_low": 70,
    "pass_with_fixes_high": 84.99,
    "fail_high": 69.99
  }'::jsonb,
  true,
  now()
)
ON CONFLICT (version) DO UPDATE
  SET weights    = EXCLUDED.weights,
      thresholds = EXCLUDED.thresholds,
      active     = EXCLUDED.active;

-- ─────────────────────────────────────────────────────────────────────
-- One dev tenant.
--
-- tenant_id is a stable UUID so test fixtures can reference it by
-- literal value without needing a setup hook.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, created_at, retention_days_code)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Dev Tenant',
  'dev-tenant',
  now(),
  7  -- default 7-day code retention per PRD §14.4
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- One dev user. auth.users insert is handled by GoTrue normally, but
-- for seed we insert directly so RLS-as-this-user works in tests.
--
-- NOTE: this bypasses Supabase Auth's signup flow — only safe locally.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'dev@studiozero.local',
  crypt('devpass-not-for-prod', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_members (tenant_id, user_id, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'owner',
  now()
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- One dev project so /app/projects/[id] has something to land on.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO projects (id, tenant_id, name, url, created_at)
VALUES (
  '00000000-0000-0000-0000-0000000000b1'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Dev Project',
  'https://example.com',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- End of seed.sql. Run via:  supabase db reset
