-- ============================================================================
-- 0007_attribution_and_do_not_sell.sql
-- ============================================================================
-- Milestone: M1 — Phase 9 Batch 3 (Lens)
-- Owner:     Lens (analytics) + Atlas (schema steward)
-- Gate:      Lens's analytics-spec.md §3.3 (server-side UTM attribution) +
--            §7.2 (CCPA Do Not Sell) require these columns on users.
--
-- What ships here:
--   - users.acquisition_attribution jsonb     -- first/last/all UTM touches
--                                                + referrer_host, see §3.3
--   - users.do_not_sell boolean (default false) -- CCPA opt-out flag
--   - users.region_inferred text (nullable)     -- coarse region for the
--                                                  identify() trait
--
-- Server is the source of truth for attribution (§3.3): the column receives
-- the JSON.stringified `sz_attribution_persistent` payload from the signup
-- POST. Clients can't be trusted to keep cookies; the column is permanent.
--
-- Schema check: keep acquisition_attribution shape loose (jsonb, no schema
-- constraint). Spec evolves faster than DDL; the registry in
-- runner/schemas/analytics-events.v1.ts is the contract.
--
-- Rollback: ALTER TABLE users DROP COLUMN ... (acceptable — these are
-- additive marketing-only columns; no FK depends on them).
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS acquisition_attribution jsonb,
  ADD COLUMN IF NOT EXISTS do_not_sell boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS region_inferred text;

COMMENT ON COLUMN users.acquisition_attribution IS
  'Lens analytics-spec.md §3.3. Shape: {first_touch:{source,medium,campaign,'
  'term,content,ts,referrer_host}, last_touch:{...}, all_touches:[...up to 20], '
  'captured_via:"client_session_storage"|"server_referer"}. Server-stamped '
  'at signup from the hidden form field — client-side capture is treated as '
  'broken-by-design (ad-blockers, incognito, cookie clears). Read by Lens at '
  'identify() time + at paid_conversion to stamp utm_first_touch/utm_last_touch '
  'on the PostHog event.';

COMMENT ON COLUMN users.do_not_sell IS
  'CCPA "Do Not Sell or Share My Personal Information" opt-out (§7.2). When '
  'true: GA4 entirely suppressed for this user (gtag consent denied); '
  'PostHog events tagged do_not_sell=true and excluded from any data-sharing '
  'export. The footer DNS link is present for ALL users (Lens §7.2: we cannot '
  'reliably infer state-of-residence so we surface it universally).';

COMMENT ON COLUMN users.region_inferred IS
  'Coarse region (US/EU/UK/CA/...) inferred from IP at signup. Used as a '
  'PostHog identify() trait per analytics-spec.md §2.8 — never as a security '
  'control. Comply-cleared as legitimate-interest profile data.';

-- Helpful index: the alpha-pipeline tracker (§5.4) joins on first_touch.source
-- to compute channel-level conversion. A jsonb GIN supports that filter.
CREATE INDEX IF NOT EXISTS users_acquisition_attribution_gin_idx
  ON users USING gin (acquisition_attribution jsonb_path_ops);

-- Helpful partial index for the GA4-suppression check (rare positive cases).
CREATE INDEX IF NOT EXISTS users_do_not_sell_idx
  ON users(id) WHERE do_not_sell = true;
