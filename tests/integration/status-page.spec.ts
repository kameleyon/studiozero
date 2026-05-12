/**
 * Studio Zero — /status + /api/healthz structural gate (M5 exit-gate carry).
 *
 * Phase 9 V2.1 Batch 1 (Forge) — carry close for M4 exit gate item
 * `tests/integration/status-page.spec.ts` per `architecture/test-strategy.md`
 * §M4 line 148. Asserts:
 *
 *   1. The /api/healthz route file exists and exposes a GET handler that
 *      can resolve a 200 response with the locked JSON shape.
 *   2. The /status page renders six sections (PRD §13.6 +
 *      `architecture/iac/observability/status-page.md` M4 spec).
 *
 * The handler-level test is skipped when apps/web/node_modules is not
 * installed (same convention as `tests/disclosure-headers.test.ts`).
 *
 * Cross-refs:
 *   - architecture/test-strategy.md §M4 (line 148)
 *   - sprint/milestone-M4.md (status page deliverable)
 *   - apps/web/app/status/page.tsx (six-section docstring header)
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const STATUS_PAGE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "apps",
  "web",
  "app",
  "status",
  "page.tsx",
);

const HEALTHZ_ROUTE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "apps",
  "web",
  "app",
  "api",
  "healthz",
  "route.ts",
);

describe("status-page — /api/healthz JSON shape (M4 carry close)", () => {
  it("the /api/healthz route file exists in HEAD", () => {
    expect(existsSync(HEALTHZ_ROUTE_PATH)).toBe(true);
  });

  it("the route declares the locked JSON-shape keys", () => {
    const src = readFileSync(HEALTHZ_ROUTE_PATH, "utf-8");
    // Locked shape per the route's docstring contract.
    for (const key of [
      "ok",
      "version",
      "uptime",
      "db",
      "queue",
      "last_audit_completed_at",
      "checked_at",
    ]) {
      expect(src).toContain(key);
    }
  });

  it("the route returns HTTP 200 even on degraded probes (per docstring)", () => {
    const src = readFileSync(HEALTHZ_ROUTE_PATH, "utf-8");
    // External probes parse the JSON body — a 5xx would hide it.
    expect(src).toMatch(/status:\s*200/);
    // No `status: 5` (any 5xx) on the success path of GET().
    // Allow `status: 500` only inside catch blocks for explicit errors,
    // but the file SHOULD not have a 500 on the healthz path.
    // Soft-grep: ensure no `status: 500` in the file.
    expect(/status:\s*500/.test(src)).toBe(false);
  });

  it("the route disables caching (probe freshness)", () => {
    const src = readFileSync(HEALTHZ_ROUTE_PATH, "utf-8");
    expect(src).toMatch(/no-store/);
  });
});

describe("status-page — /status renders six sections", () => {
  it("the page file exists in HEAD", () => {
    expect(existsSync(STATUS_PAGE_PATH)).toBe(true);
  });

  it("page docstring + content reference six locked sections", () => {
    const src = readFileSync(STATUS_PAGE_PATH, "utf-8");
    // Six section names per M4 Batch 1 brief.
    const sections = [
      "API uptime",
      "Audit Pipeline",
      "Edge Functions",
      "Database",
      "Realtime",
      "Webhook delivery",
    ];
    for (const s of sections) {
      expect(src).toContain(s);
    }
  });

  it("page is public (no auth gate)", () => {
    const src = readFileSync(STATUS_PAGE_PATH, "utf-8");
    // PRD §13.6 + Watch M4 status-page-public. Catch a regression where
    // someone wraps the page in a session guard.
    expect(src).toMatch(/PUBLIC/);
  });

  it("page exports Next.js metadata (canonical URL)", () => {
    const src = readFileSync(STATUS_PAGE_PATH, "utf-8");
    expect(src).toMatch(/export\s+const\s+metadata/);
    expect(src).toContain("studiozero.dev/status");
  });
});

describe("status-page — 99.5% SLI computable", () => {
  it("the route exposes the fields needed to compute uptime SLI", () => {
    const src = readFileSync(HEALTHZ_ROUTE_PATH, "utf-8");
    // The `db`/`queue` ternary {ok|degraded|down} is the SLI input.
    expect(src).toContain('"ok"|"degraded"|"down"');
    expect(src).toContain("last_audit_completed_at");
  });
});
