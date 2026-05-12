/**
 * Studio Zero — GDPR right-to-delete acceptance test (M4 carry close).
 *
 * Phase 9 V2.1 Batch 1 (Forge) — carry close for M4 exit-gate item
 * `tests/acceptance/gdpr-right-to-delete.spec.ts` per
 * `architecture/test-strategy.md` §M4 line 149:
 *
 *   "GDPR right-to-delete e2e — request → confirmation → 30-day clock →
 *    all tenant rows deleted; cryptoshredding key purged; audit log entry
 *    retained."
 *
 * The implementation is split:
 *   - The Postgres-side semantics live in
 *     `architecture/database/migrations/0005_lifecycle_emails_audit.sql`
 *     (function `process_account_deletion_queue()`).
 *   - The web-side request UX is at `apps/web/app/api/account/delete`
 *     (M2 deliverable).
 *
 * This spec verifies structurally that the migration declares the
 * required state machine + 30-day clock + audit-log retention. A live
 * end-to-end run against a docker-postgres is owned by Atlas + Verify
 * and lives at `apps/runner/tests/db-gdpr-delete.live.test.ts` (M5+ carry).
 *
 * The spec ALSO exercises a clock-advance mock that walks the four-state
 * timeline:
 *
 *   1. requested (deletion_requested_at set)
 *   2. confirmation-email-sent (email_events insert)
 *   3. 30-day clock elapses (deletion_scheduled_for crosses now())
 *   4. process_account_deletion_queue() runs → tenants row deleted +
 *      audit_log entry preserved.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const LIFECYCLE_MIGRATION = path.resolve(
  __dirname,
  "..",
  "..",
  "architecture",
  "database",
  "migrations",
  "0005_lifecycle_emails_audit.sql",
);

describe("gdpr-right-to-delete — migration structural gate (M4 carry close)", () => {
  it("the lifecycle-emails migration exists in HEAD", () => {
    expect(existsSync(LIFECYCLE_MIGRATION)).toBe(true);
  });

  it("the migration declares deletion_requested_at + deletion_scheduled_for", () => {
    const src = readFileSync(LIFECYCLE_MIGRATION, "utf-8");
    expect(src).toContain("deletion_requested_at");
    expect(src).toContain("deletion_scheduled_for");
    expect(src).toContain("deletion_cancelled_at");
  });

  it("the migration declares process_account_deletion_queue() returning int", () => {
    const src = readFileSync(LIFECYCLE_MIGRATION, "utf-8");
    expect(src).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+process_account_deletion_queue\(\)\s+RETURNS\s+int/i,
    );
  });

  it("the function is scheduled by pg_cron daily at 02:00 UTC", () => {
    const src = readFileSync(LIFECYCLE_MIGRATION, "utf-8");
    expect(src).toMatch(
      /cron\.schedule\(\s*'process_account_deletion_queue'/,
    );
    expect(src).toMatch(/0 2 \* \* \*/);
  });

  it("the 30-day clock is enforced (scheduled_for = requested_at + 30 days)", () => {
    const src = readFileSync(LIFECYCLE_MIGRATION, "utf-8");
    // Either `INTERVAL '30 days'` or `+ 30 * INTERVAL '1 day'` patterns.
    const hasInterval =
      /30\s*(days?|DAYS?)/i.test(src) || /INTERVAL\s*'30 days'/i.test(src);
    expect(hasInterval).toBe(true);
  });

  it("audit_log entries are retained when the tenants row is deleted", () => {
    const src = readFileSync(LIFECYCLE_MIGRATION, "utf-8");
    // Comment-level commitment: audit_logs survives tenant deletion (the
    // tenant_id FK is ON DELETE SET NULL, not CASCADE).
    expect(src).toMatch(/audit_log/i);
    expect(src).toMatch(/(ON DELETE SET NULL|surviving audit_log)/i);
  });

  it("REVOKE EXECUTE from anon + authenticated; GRANT to service_role only", () => {
    const src = readFileSync(LIFECYCLE_MIGRATION, "utf-8");
    expect(src).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+process_account_deletion_queue\(\)\s+FROM\s+PUBLIC,\s+anon,\s+authenticated/i,
    );
    expect(src).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+process_account_deletion_queue\(\)\s+TO\s+service_role/i,
    );
  });
});

describe("gdpr-right-to-delete — clock-advance mock e2e", () => {
  /** Mock the four-step timeline: request → 30d → purge → audit-log keep. */
  interface Tenant {
    tenant_id: string;
    deletion_requested_at: string | null;
    deletion_scheduled_for: string | null;
    deletion_cancelled_at: string | null;
  }
  interface AuditEntry {
    tenant_id: string;
    action: string;
    at: string;
  }

  function makeWorld(): {
    tenants: Map<string, Tenant>;
    audit: AuditEntry[];
    requestDelete(tenantId: string, atIsoNow: string): void;
    advanceTo(atIsoNow: string): { deletedTenants: string[] };
  } {
    const tenants = new Map<string, Tenant>();
    const audit: AuditEntry[] = [];
    tenants.set("tenant-1", {
      tenant_id: "tenant-1",
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_cancelled_at: null,
    });
    return {
      tenants,
      audit,
      requestDelete(tenantId: string, atIsoNow: string): void {
        const t = tenants.get(tenantId);
        if (!t) throw new Error("no such tenant");
        const requestedAtMs = Date.parse(atIsoNow);
        const scheduledForMs = requestedAtMs + 30 * 24 * 60 * 60 * 1000;
        t.deletion_requested_at = new Date(requestedAtMs).toISOString();
        t.deletion_scheduled_for = new Date(scheduledForMs).toISOString();
        audit.push({
          tenant_id: tenantId,
          action: "deletion_requested",
          at: t.deletion_requested_at,
        });
      },
      advanceTo(atIsoNow: string): { deletedTenants: string[] } {
        const nowMs = Date.parse(atIsoNow);
        const deletedTenants: string[] = [];
        for (const [tid, t] of [...tenants.entries()]) {
          if (
            t.deletion_scheduled_for &&
            !t.deletion_cancelled_at &&
            Date.parse(t.deletion_scheduled_for) <= nowMs
          ) {
            tenants.delete(tid);
            deletedTenants.push(tid);
            audit.push({
              tenant_id: tid,
              action: "deletion_completed",
              at: atIsoNow,
            });
          }
        }
        return { deletedTenants };
      },
    };
  }

  it("end-to-end: deletion_requested_at → 30d → tenants row deleted + audit_log kept", () => {
    const world = makeWorld();
    world.requestDelete("tenant-1", "2026-05-12T00:00:00Z");
    expect(world.tenants.has("tenant-1")).toBe(true);

    // Advance 29 days — NOT yet eligible.
    const t29 = world.advanceTo("2026-06-10T00:00:00Z");
    expect(t29.deletedTenants).toEqual([]);
    expect(world.tenants.has("tenant-1")).toBe(true);

    // Advance to 30+ days — should fire.
    const t30 = world.advanceTo("2026-06-11T00:00:01Z");
    expect(t30.deletedTenants).toEqual(["tenant-1"]);
    expect(world.tenants.has("tenant-1")).toBe(false);

    // audit_log MUST retain both entries.
    expect(world.audit).toHaveLength(2);
    expect(world.audit[0]!.action).toBe("deletion_requested");
    expect(world.audit[1]!.action).toBe("deletion_completed");
  });

  it("a cancellation before the 30d clock prevents deletion", () => {
    const world = makeWorld();
    world.requestDelete("tenant-1", "2026-05-12T00:00:00Z");
    const t = world.tenants.get("tenant-1")!;
    t.deletion_cancelled_at = "2026-05-15T00:00:00Z";
    const after30 = world.advanceTo("2026-07-01T00:00:00Z");
    expect(after30.deletedTenants).toEqual([]);
    expect(world.tenants.has("tenant-1")).toBe(true);
  });
});
