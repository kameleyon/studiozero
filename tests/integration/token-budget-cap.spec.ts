/**
 * Studio Zero — token-budget cap (R1, M2 Batch 1 scaffold).
 *
 * Verify fills this in at M2 Batch 2. Requires:
 *   - LLM gateway Edge Function booted with a real test tenant.
 *   - Atlas's `check_token_budget(tenant_id)` and
 *     `tenant_token_usage_daily` table from 0003_billing_managed.sql.
 *   - A test tenant with `tenants.token_budget_micros` set to a small
 *     ceiling so 110% threshold fires within the test budget.
 *
 * Contract to verify (per the M2 brief R1 + finance/unit-economics.md):
 *   - tenant under cap → llm-gateway returns 200; usage rolled up.
 *   - tenant at 110% of cap → 429 + JSON
 *       { error:'token_budget_exceeded', cap_micros, used_micros,
 *         alert_sent:true }
 *   - Sentry event emitted with level=warning (NOT error).
 *   - tenant_token_usage_daily row UPSERTed by tenant_id+usage_date.
 *   - Fallback path: when check_token_budget RPC absent, the gateway
 *     falls back to audit_logs aggregation (110% still applies).
 *
 * Load companion: tests/load/per-tenant-token-cap.k6.js sustains
 * 100 concurrent Managed runs for 30 min — cap fires within budget.
 */
import { describe, it } from "vitest";

describe("Token-budget cap R1 (M2)", () => {
  it.skip("under-cap tenant returns 200 (needs LLM gateway boot)", () => {});

  it.skip("at-110% cap returns 429 + cap/used envelope (needs LLM gateway boot)", () => {});

  it.skip("Sentry warning (not error) emitted on cap hit (needs Sentry test transport)", () => {});

  it.skip("tenant_token_usage_daily UPSERT by (tenant_id, usage_date) (needs 0003 applied)", () => {});

  it.skip("fallback to audit_logs aggregation when RPC absent (needs deploy variant)", () => {});
});
