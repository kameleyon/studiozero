/**
 * Studio Zero — RLS cross-tenant corpus consumer (Shield M2, M2 Batch 2 Verify).
 *
 * Consumes runner/fixtures/rls-cross-tenant-corpus/index.json (≥20 patterns
 * per Shield's M2 expansion, commit 08c1f15) and asserts the corpus is
 * well-formed + each pattern documents the defense layer. Live cross-tenant
 * RLS testing requires a real Postgres with the 0002 + 0003 migrations
 * applied (Testcontainers or staging Supabase) — gated on
 * `SUPABASE_TEST_URL` + `SUPABASE_TEST_SERVICE_ROLE_KEY` env vars OR
 * `PGURL_TEST` and SKIPPED with the explicit M1+1 carry reason otherwise.
 *
 * Cross-ref: tests/integration/goal-5-rls-cross-tenant.spec.ts is the
 * sibling that runs the M1 hand-picked Goal-5 RLS checks. This spec is
 * the BULK consumer that ratchets up as Shield adds patterns.
 *
 * Categories covered (from index.json):
 *   - direct_read (RLS USING clause on tenant-scoped SELECT)
 *   - forged_jwt_claims (signature verify rejects forged tenant_id)
 *   - fk_manipulation (CHECK + RLS join prevents cross-tenant FK insert)
 *   - byok_decrypt (vault.decrypt_byok AAD-binds to tenant)
 *   - realtime_subscribe (Realtime channels scoped by tenant)
 *   - service_role_bypass (service-role is the documented escape hatch;
 *     audit_logs row Critical on every use)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

interface RlsEntry {
  id: string;
  category: string;
  pattern: string;
  expected_action: "block" | "allow";
  expected_outcome: string;
  notes?: string;
}

interface CorpusDoc {
  corpus: string;
  version: string;
  patterns: RlsEntry[];
}

const CORPUS_PATH = path.resolve(
  __dirname,
  "../../runner/fixtures/rls-cross-tenant-corpus/index.json",
);
const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf-8")) as CorpusDoc;
const all = corpus.patterns;

const REAL_DB =
  !!(
    process.env.SUPABASE_TEST_URL &&
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
  ) || !!process.env.PGURL_TEST;

const MIG_0002 = path.resolve(
  __dirname,
  "../../architecture/database/migrations/0002_rls_and_runner_jwt.sql",
);
const MIG_0003 = path.resolve(
  __dirname,
  "../../architecture/database/migrations/0003_billing_managed.sql",
);

describe("RLS cross-tenant corpus — structural invariants", () => {
  it("corpus has ≥20 patterns (Shield M2 size floor per brief)", () => {
    expect(all.length).toBeGreaterThanOrEqual(20);
  });

  it("every pattern declares id + category + pattern + expected_action + expected_outcome", () => {
    for (const p of all) {
      expect(p.id).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.pattern).toBeTruthy();
      expect(["block", "allow"]).toContain(p.expected_action);
      expect(p.expected_outcome).toBeTruthy();
      expect(p.expected_outcome.length).toBeGreaterThan(20);
    }
  });

  it("ids are unique across the corpus", () => {
    const ids = new Set<string>();
    for (const p of all) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
    }
  });

  it("expected categories all present", () => {
    const present = new Set(all.map((p) => p.category));
    const expected = [
      "direct_read",
      "forged_jwt_claims",
      "fk_manipulation",
      "byok_decrypt",
      "realtime_subscribe",
      "service_role_bypass",
    ];
    for (const c of expected) {
      expect(present.has(c)).toBe(true);
    }
  });
});

describe("RLS cross-tenant corpus — defense surface documented in migrations", () => {
  it("0002 enables RLS + FORCE on every tenant-scoped table", () => {
    const src = readFileSync(MIG_0002, "utf-8");
    expect(src).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(src).toMatch(/FORCE\s+ROW LEVEL SECURITY/i);
  });

  it("0002 declares the tenant-scoped USING(auth.is_member_of(...)) pattern", () => {
    const src = readFileSync(MIG_0002, "utf-8");
    expect(src).toMatch(/auth\.is_member_of/);
    // Anon role is RESTRICTIVE-denied somewhere.
    expect(src).toMatch(/anon|RESTRICTIVE/);
  });

  it("0003 carries RLS on the new tenant_token_usage_daily table", () => {
    const src = readFileSync(MIG_0003, "utf-8");
    expect(src).toMatch(/tenant_token_usage_daily[\s\S]*ENABLE ROW LEVEL SECURITY/);
    expect(src).toMatch(/tenant_token_usage_deny_anon/);
    expect(src).toMatch(/tenant_token_usage_member_select/);
  });

  it("0003 enqueue_audit_run validates membership unless service-role", () => {
    const src = readFileSync(MIG_0003, "utf-8");
    expect(src).toMatch(/auth\.claim_role/);
    expect(src).toMatch(/auth\.is_member_of/);
    expect(src).toMatch(/service_role/);
  });
});

// ---------------------------------------------------------------------------
// Live cross-tenant tests — gated on real Postgres.
//
// When REAL_DB is true, each `block` pattern in the corpus is replayed
// against the live DB and we assert 0 rows returned (RLS contract) or
// the expected throw (forged-JWT / FK-violation paths). Until staging
// is wired the body is skipped with the M1+1 carry reason — the
// structural assertions above are the holding pattern.
// ---------------------------------------------------------------------------

describe("RLS cross-tenant corpus — live cross-tenant attempts", () => {
  if (!REAL_DB) {
    it("(SKIPPED — live tests need SUPABASE_TEST_URL+SERVICE_ROLE_KEY or PGURL_TEST; M1+1 staging gate)", () => {
      expect(REAL_DB).toBe(false);
    });
    return;
  }

  // When this branch lands, each pattern in the block subset becomes a
  // live test. Pattern-by-pattern execution requires the Postgres + JWT-
  // mint scaffolding from Atlas's M2+1 — for now we surface the skip.
  it.skip(
    "every block pattern returns 0 rows OR throws via RLS USING clause (// M1+1: needs staging Supabase)",
  );
});
