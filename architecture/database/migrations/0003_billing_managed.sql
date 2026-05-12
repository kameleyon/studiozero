-- ============================================================================
-- 0003_billing_managed.sql  (M2 — Managed mode + billing)
-- ============================================================================
-- Milestone: M2 — Managed mode + billing (PRD §16; D6 reorder Managed-before-CLI)
-- Owner:     Atlas (data) + Ledger (Stripe contract) + Comply (D20/D22 legal)
-- Gate:      `0003_billing_managed.sql applies cleanly to staging`
--            (sprint/milestone-M2.md exit gate row);
--            `tests/integration/stripe-checkout-and-webhook.spec.ts` green;
--            `tests/integration/eu-cooling-off-reset.spec.ts` green (D22);
--            `tests/load/per-tenant-token-cap.k6.js` green (R1 mitigation);
--            `tests/integration/cross-mode-consistency.spec.ts` green;
--            GDPR Art. 28 DPA published (PRD §17 #17);
--            D20 regional refund matrix wired (billing-and-cancel.md happy + EC paths);
--            D22 cooling-off-resets-per-upgrade row count goes up on upgrade.
--
-- What ships here (single transaction):
--   A. enqueue_audit_run() RPC wrapper — closes M1 carry-over M1-X1 (Jury Major).
--      Service-role can pass any tenant_id; auth users can only enqueue for
--      tenants they belong to. apps/web/app/api/runs/route.ts:299 is the
--      live call site that has been swallowing the missing-function error
--      since M1; this migration lets it succeed.
--   B. Managed-tier billing column additions:
--        tenants.stripe_customer_id  (UNIQUE, nullable — only Managed/paid)
--        subscriptions.plan_family   (e.g. 'byok','managed','cli','addon';
--                                     matches finance/stripe-config.md §
--                                     "Metadata" column)
--        subscriptions.billing_period (monthly|annual — drives proration math
--                                      in the Stripe webhook handler)
--        cooling_off_windows.reset_count + waiver_signed_at (D22 — increments
--                                      on every upgrade event, surfaces fresh
--                                      14-day window per refund-matrix.md
--                                      EU/UK rows).
--   C. R1 mitigation — per-tenant daily token-usage rollup
--      (tenant_token_usage_daily) + check_token_budget(uuid) function. The
--      runner consults this from inside the LLM gateway pre-flight; webhook
--      handler resets the monthly window via UPSERT on usage_date.
--      Cap-check formula: monthly cost_micros >= token_budget_micros * 1.10
--      → block. The 10% headroom is §15 R1 mitigation (we'd rather lose 10%
--      of margin than 100% of the customer to a noisy cap).
--   D. Compass AH-6 — projects.client_tag for indie-agency multi-client
--      tagging (Jury M5). Free-text ≤50 chars, nullable, indexed on
--      (tenant_id, client_tag).
--   E. RLS policies for the new tenant_token_usage_daily table
--      (cooling_off_windows already has RLS from 0002 — those policies cover
--      the new columns automatically; SELECT happens at row level, not
--      column level).
--
-- Idempotency:
--   - All column adds use ADD COLUMN IF NOT EXISTS.
--   - All indexes use CREATE INDEX IF NOT EXISTS.
--   - All policies use DROP POLICY IF EXISTS … then CREATE POLICY.
--   - All function definitions use CREATE OR REPLACE.
--   - All table creates use CREATE TABLE IF NOT EXISTS.
--   Re-running this migration on a DB where it has already applied is a no-op
--   (no errors, no duplicate rows).
--
-- Forward-only: per Atlas rule 1, this file is never modified after merge —
--   subsequent schema changes ship in 0004+.
--
-- Cross-refs:
--   apps/web/app/api/runs/route.ts:299        (enqueue_audit_run call site)
--   apps/web/app/api/webhooks/stripe/route.ts (plan_family resolution)
--   finance/stripe-config.md                  (Metadata contract)
--   finance/refund-matrix.md                  (D20 regional matrix + D22 reset)
--   sprint/milestone-M2.md                    (exit gates this targets)
--   PRD §17 D20 (regional refund), §17 D22 (cooling-off reset), §15 R1 (LLM cost)
-- ============================================================================

BEGIN;

-- pg-boss v10 creates the `pgboss` schema on first .start() boot. We don't
-- want this migration to depend on pg-boss having been booted yet, so the
-- enqueue function uses dynamic SQL (EXECUTE) and the check is deferred to
-- call-time. check_function_bodies = off mirrors the 0002 pattern for the
-- same reason (forward-safe SECURITY DEFINER definitions).
SET LOCAL check_function_bodies = off;

-- ============================================================================
-- A. enqueue_audit_run RPC wrapper  (M1 carry-over M1-X1 — Jury Major)
-- ============================================================================
-- The stub at apps/web/app/api/runs/route.ts:299 has been swallowing a missing-
-- function error since M1. This wrapper closes the loop: service-role bypasses
-- membership (it's how the Stripe webhook + the lifecycle workers enqueue
-- system-initiated runs), authenticated users must be a member of the tenant
-- they're enqueuing for. The pgboss insert uses dynamic SQL so this migration
-- applies cleanly to a fresh staging DB where pg-boss has not yet booted —
-- the function call will only succeed once pg-boss has created its schema
-- (which apps/runner does on startup), and a not-yet-booted call surfaces as
-- a clean error that the route.ts catch-block already handles (the run sits
-- in 'queued' state and the runner reconciles it on the next pass — see the
-- comment at route.ts:303-306).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enqueue_audit_run(
  p_run_id    text,
  p_tenant_id uuid,
  p_priority  int DEFAULT 5
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_job_id uuid := gen_random_uuid();
  v_role   text;
BEGIN
  IF p_run_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'enqueue_audit_run: p_run_id and p_tenant_id are required';
  END IF;

  -- Service-role bypasses the membership check (used by webhook + worker
  -- paths). Authenticated users can only enqueue for tenants they belong to.
  v_role := auth.claim_role();
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF NOT auth.is_member_of(p_tenant_id) THEN
      RAISE EXCEPTION 'enqueue_audit_run: not a member of tenant %', p_tenant_id;
    END IF;
  END IF;

  -- Verify the run row exists and belongs to the declared tenant. Closes the
  -- cross-tenant-enqueue threat: a member of tenant A cannot enqueue a job
  -- carrying tenant_id=A but a run row that actually belongs to tenant B
  -- (the runner would then pick it up under tenant A's JWT and SELECT
  -- tenant B's findings).
  IF NOT EXISTS (
    SELECT 1 FROM runs
    WHERE id = p_run_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'enqueue_audit_run: run % not found in tenant %',
      p_run_id, p_tenant_id;
  END IF;

  -- pg-boss insert pattern (matches pg-boss v9/v10 API surface: `pgboss.job`
  -- with columns id, name, data, retrylimit, priority). EXECUTE keeps this
  -- file applies-cleanly even when pg-boss has not yet booted on staging —
  -- the runner's startup creates `pgboss.job` before consuming work, and
  -- route.ts wraps this call in a try/catch that falls through to the
  -- reconciler on missing-relation errors.
  EXECUTE $sql$
    INSERT INTO pgboss.job (id, name, data, retrylimit, priority)
    VALUES ($1, 'audit-run', jsonb_build_object('runId', $2, 'tenantId', $3),
            2, $4)
  $sql$
  USING v_job_id, p_run_id, p_tenant_id, p_priority;

  RETURN v_job_id;
END
$$;

REVOKE ALL ON FUNCTION enqueue_audit_run(text, uuid, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION enqueue_audit_run(text, uuid, int)
  TO authenticated, service_role;
COMMENT ON FUNCTION enqueue_audit_run(text, uuid, int) IS
  'M2 Atlas (M1-X1 carry close): enqueue an audit run job into pg-boss. '
  'Validates membership unless caller is service-role. retrylimit=2 honors '
  'PRD §14.2 max-2-retries. Priority 5 = default; higher = more urgent. '
  'Returns the pg-boss job UUID for downstream correlation.';

-- ============================================================================
-- B. Managed-tier billing column additions
-- ============================================================================

-- B.1  tenants.stripe_customer_id  (Managed/paid tenants only; nullable).
-- ----------------------------------------------------------------------------
-- The Stripe customer is created on first paid checkout. Free tenants never
-- have one. UNIQUE because Stripe customer_id is globally unique and we
-- never want to bind two tenants to the same Stripe customer (that would
-- mis-route invoices). Partial index supports the webhook's frequent
-- "find tenant by stripe_customer_id" lookup without bloating with NULLs.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- UNIQUE on a nullable column: Postgres treats NULLs as distinct, so this
-- still allows many tenants with NULL stripe_customer_id (free tenants) but
-- enforces uniqueness once set. Wrap in DO block for idempotency — repeating
-- ADD CONSTRAINT would error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_stripe_customer_id_key'
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS tenants_stripe_customer_id_idx
  ON tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN tenants.stripe_customer_id IS
  'Stripe Customer object id (cus_…). NULL for free tenants. Set on first '
  'paid checkout-session-completed event. Webhook handler resolves tenant '
  'from this column on subscription.* events. UNIQUE — same Stripe customer '
  'never binds to two tenants.';

-- B.2  subscriptions.plan_family + billing_period
-- ----------------------------------------------------------------------------
-- plan_family is the metadata field Stripe products carry per
-- finance/stripe-config.md (values: byok|managed|cli|addon). It's
-- denormalized onto the subscription row so the Stripe webhook handler
-- doesn't need a roundtrip to the Products API to know which family the
-- subscription belongs to. Made nullable on add (existing rows get
-- NULL; webhook backfill on next subscription.updated event).
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_family text
    CHECK (plan_family IS NULL
           OR plan_family IN ('byok','managed','cli','addon'));

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_period text
    CHECK (billing_period IS NULL
           OR billing_period IN ('monthly','annual'));

CREATE INDEX IF NOT EXISTS subscriptions_plan_family_idx
  ON subscriptions(tenant_id, plan_family)
  WHERE plan_family IS NOT NULL;

COMMENT ON COLUMN subscriptions.plan_family IS
  'Stripe Product metadata.plan_family verbatim. Drives dashboard rendering '
  'and analytics segmentation (finance/stripe-config.md). Nullable for '
  'backfill compatibility — webhook backfills on next subscription.updated.';

COMMENT ON COLUMN subscriptions.billing_period IS
  'monthly | annual. Drives proration math in the Stripe webhook handler. '
  'Nullable for backfill compatibility.';

-- B.3  cooling_off_windows.reset_count + waiver_signed_at  (D22)
-- ----------------------------------------------------------------------------
-- D22 (PRD §17): every Managed-tier upgrade event for EU/UK customers resets
-- the 14-day cooling-off clock. The existing schema already inserts a NEW
-- row per (subscribe|upgrade) trigger_event, so `reset_count` is a
-- denormalized counter on the LATEST row for that subscription — easier
-- for UI "Your window has been reset N times" copy than COUNT(*) joins.
ALTER TABLE cooling_off_windows
  ADD COLUMN IF NOT EXISTS reset_count int NOT NULL DEFAULT 0
    CHECK (reset_count >= 0);

ALTER TABLE cooling_off_windows
  ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz;

COMMENT ON COLUMN cooling_off_windows.reset_count IS
  'D22 (PRD §17): increments on every upgrade event for EU/UK customers. '
  '0 on initial subscribe row; N on the Nth upgrade. Used by the cooling-off '
  'banner copy at upgrade time ("Your 14-day window has been reset").';

COMMENT ON COLUMN cooling_off_windows.waiver_signed_at IS
  'Timestamp the customer signed the cooling-off waiver (immediate-execution '
  'waiver per refund-matrix.md EU/UK row). NULL = not waived. Paired with '
  'the existing waiver_signed boolean for backwards-compat.';

-- ============================================================================
-- C. R1 mitigation — per-tenant daily token-usage rollup + cap check
-- ============================================================================
-- §15 R1: LLM cost overrun in Managed tier. The runner emits per-call cost
-- snapshots; a nightly aggregator (M2 Forge deliverable) collapses them into
-- (tenant_id, usage_date) rows here. The check_token_budget() function is
-- called from the LLM gateway pre-flight; returning false means the cap is
-- exhausted and the gateway returns 429 / token_budget_exceeded.
-- Cap formula: monthly sum(cost_micros) >= token_budget_micros * 1.10 → block.
-- 10% headroom is the documented §15 R1 grace — we lose 10% of margin rather
-- than hard-cut a customer in the middle of an audit (auto-pause UX).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_token_usage_daily (
  tenant_id     uuid   NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_date    date   NOT NULL,
  input_tokens  bigint NOT NULL DEFAULT 0 CHECK (input_tokens  >= 0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  -- USD micros = USD × 1,000,000. bigint lets us safely sum a year of
  -- Managed-Pro usage without overflow (1e18 USD ceiling).
  cost_micros   bigint NOT NULL DEFAULT 0 CHECK (cost_micros   >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, usage_date)
);

COMMENT ON TABLE tenant_token_usage_daily IS
  'Per-tenant daily LLM-cost rollup. R1 mitigation (PRD §15). Source rows '
  'are the runner LLM-gateway cost snapshots; a Forge-owned aggregator UPSERTs '
  'one row per (tenant, day). check_token_budget() reads from here. Indexed '
  'by primary key — month-window queries scan the per-tenant partition.';

-- check_token_budget — the R1 cap-check function.
-- Called by the LLM gateway before every Managed-tier completion.
-- Returns:
--   true  = OK to spend (under cap, or no cap configured)
--   false = stop; gateway returns 429 token_budget_exceeded
CREATE OR REPLACE FUNCTION check_token_budget(p_tenant_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    -- Non-Managed tenants have no budget; always allow.
    WHEN t.token_budget_micros IS NULL THEN true
    -- Managed tenants: block once month-to-date cost >= 110% of cap.
    WHEN COALESCE((
      SELECT SUM(u.cost_micros)
      FROM tenant_token_usage_daily u
      WHERE u.tenant_id  = t.id
        AND u.usage_date >= date_trunc('month', current_date)::date
        AND u.usage_date <= current_date
    ), 0) >= (t.token_budget_micros * 1.10)::bigint THEN false
    ELSE true
  END
  FROM tenants t
  WHERE t.id = p_tenant_id
$$;

REVOKE ALL ON FUNCTION check_token_budget(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION check_token_budget(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION check_token_budget(uuid) IS
  'R1 mitigation (PRD §15). Returns false when month-to-date Managed-tier '
  'LLM cost has reached 110% of tenant.token_budget_micros (10% headroom is '
  'the documented grace before hard-cut). LLM gateway returns 429 / '
  'token_budget_exceeded on false.';

-- ============================================================================
-- D. Compass AH-6 — projects.client_tag (Jury M5)
-- ============================================================================
-- Indie-agency persona (finance/pricing.md "Buyer persona") needs to group
-- audits by client. Free text, ≤50 chars, nullable (most projects have no
-- tag). Indexed on (tenant_id, client_tag) to support the grouped-list UI
-- without a sequential scan once a tenant has 100+ projects.
-- ----------------------------------------------------------------------------

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_tag text
    CHECK (client_tag IS NULL
           OR (length(client_tag) BETWEEN 1 AND 50));

CREATE INDEX IF NOT EXISTS projects_client_tag_idx
  ON projects(tenant_id, client_tag)
  WHERE client_tag IS NOT NULL;

COMMENT ON COLUMN projects.client_tag IS
  'Compass AH-6 (Jury M5): indie-agency multi-client tagging. Free-text, '
  '1–50 chars, nullable. Indexed on (tenant_id, client_tag) for grouped-list '
  'UI. UI surfaces this only on agency-eligible tiers (byok_pro+, managed_pro); '
  'non-agency tiers ignore the column.';

-- ============================================================================
-- E. RLS for the new tenant_token_usage_daily table
-- ============================================================================
-- cooling_off_windows already has RLS policies from 0002 — those policies
-- evaluate at row level (auth.is_member_of(tenant_id)) so the new columns
-- (reset_count, waiver_signed_at) are automatically protected. No new policy
-- needed there.
--
-- projects already has the full member-CRUD policy set from 0002 — the new
-- client_tag column is covered automatically.
--
-- tenant_token_usage_daily is brand new; it needs ENABLE+FORCE+policies that
-- mirror the cooling_off_windows pattern (member SELECT own; service-role
-- writes; anon denied).
-- ----------------------------------------------------------------------------

ALTER TABLE tenant_token_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_token_usage_daily FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_token_usage_deny_anon ON tenant_token_usage_daily;
CREATE POLICY tenant_token_usage_deny_anon ON tenant_token_usage_daily
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
COMMENT ON POLICY tenant_token_usage_deny_anon ON tenant_token_usage_daily IS
  'Anon cannot enumerate per-tenant LLM-cost rollups. Belt-and-braces — RLS '
  'denies by default; this RESTRICTIVE policy is the explicit lock that pairs '
  'with the PERMISSIVE member SELECT below.';

DROP POLICY IF EXISTS tenant_token_usage_member_select ON tenant_token_usage_daily;
CREATE POLICY tenant_token_usage_member_select ON tenant_token_usage_daily
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.is_member_of(tenant_id));
COMMENT ON POLICY tenant_token_usage_member_select ON tenant_token_usage_daily IS
  'Members read their own tenant usage rollup. Writes are service-role only '
  '(the Forge-owned aggregator runs under service-role and UPSERTs rows '
  'nightly). UI uses this for the "Managed-tier usage this month" widget.';

-- Make sure the updated_at trigger covers the new table. tables.sql/0001
-- installs a generic loop that catches every table with an updated_at
-- column at apply time — but this table didn't exist then. Attach it here.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tenant_token_usage_daily_set_updated_at'
  ) THEN
    EXECUTE
      'CREATE TRIGGER tenant_token_usage_daily_set_updated_at
         BEFORE UPDATE ON tenant_token_usage_daily
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();';
  END IF;
END$$;

COMMIT;
-- ============================================================================
-- End of 0003_billing_managed.sql
-- Net new objects:
--   functions    : 2  (enqueue_audit_run, check_token_budget)
--   tables       : 1  (tenant_token_usage_daily)
--   columns      : 7  (tenants.stripe_customer_id,
--                      subscriptions.plan_family, subscriptions.billing_period,
--                      cooling_off_windows.reset_count,
--                      cooling_off_windows.waiver_signed_at,
--                      projects.client_tag,
--                      tenant_token_usage_daily.updated_at*)
--   indexes      : 4  (tenants_stripe_customer_id_idx,
--                      subscriptions_plan_family_idx,
--                      projects_client_tag_idx,
--                      tenant_token_usage_daily PK implicit)
--   constraints  : 1  (tenants_stripe_customer_id_key UNIQUE)
--   policies     : 2  (tenant_token_usage_daily deny_anon + member_select)
--   triggers     : 1  (tenant_token_usage_daily updated_at)
-- ============================================================================
