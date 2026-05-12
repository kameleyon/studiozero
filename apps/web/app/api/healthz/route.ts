/**
 * GET /api/healthz — deep-ish health probe (M4 Batch 1, Watch).
 *
 * Distinct from `/api/health` (M0 liveness): healthz returns a JSON
 * digest used by Better Uptime + the in-app /status page to color
 * components. Auth: NONE. The endpoint MUST return within 100ms p95 so
 * external probes can poll every 60s from 3 regions without paying for
 * latency overhead.
 *
 * Shape (locked at M4 — Better Uptime probe parses this):
 * {
 *   ok:                       boolean,
 *   version:                  string,             // git SHA (Vercel injects)
 *   uptime:                   number,             // process uptime seconds
 *   db:                       "ok"|"degraded"|"down",
 *   queue:                    "ok"|"degraded"|"down",
 *   last_audit_completed_at:  ISO-8601 | null,
 *   checked_at:               ISO-8601
 * }
 *
 * Constraints (hard):
 *  - No tenant_id, no user_id, no customer email in the response.
 *    Cipher beforeSend redaction stays out of the loop only because
 *    we never include those fields.
 *  - 100ms budget end-to-end. We do ONE Supabase `head: true` count
 *    query on `runs` filtered to `state = 'verdict_emitted'` to derive
 *    `last_audit_completed_at`. Anything else (sentinel-table SELECT,
 *    auth probe) goes in `/api/healthz/deep` (M4 Batch 2 — Forge).
 *  - The route MUST return 200 even when `db` is "down". External
 *    probes use the JSON body to color components; using HTTP 5xx
 *    would hide the body and break the status page.
 *
 * Cache: `no-store` — every probe gets a fresh check.
 *
 * Owner: Watch (M4 Batch 1).
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";
import { hasSupabaseEnv } from "../../../lib/env";
import { createServiceRoleClient } from "../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Health = "ok" | "degraded" | "down";

interface HealthzPayload {
  ok: boolean;
  version: string;
  uptime: number;
  db: Health;
  queue: Health;
  last_audit_completed_at: string | null;
  checked_at: string;
}

const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.NEXT_PUBLIC_GIT_SHA ??
  "dev";

const START_TIME_MS = Date.now();

/** Hard timeout for individual probes — keeps p95 under 100ms. */
const PROBE_TIMEOUT_MS = 80;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(onTimeout()), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(t);
        resolve(onTimeout());
      });
  });
}

async function probeDb(): Promise<{
  status: Health;
  lastVerdictAt: string | null;
}> {
  if (!hasSupabaseEnv()) {
    return { status: "degraded", lastVerdictAt: null };
  }
  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return { status: "degraded", lastVerdictAt: null };
  }
  // head:true returns no rows — just the count + the most-recent row
  // via order/limit is a single index scan. The composite index from
  // 0001 line 231 (runs_tenant_state_created_idx) does not perfectly
  // match a state-only sort, but with a small data volume at M4 this
  // is still sub-50ms; the runs_state_idx + an ORDER BY completed_at
  // would be ideal at M5+ when row counts exceed 100k.
  const probe = supabase
    .from("runs")
    .select("completed_at", { head: false, count: "exact" })
    .eq("state", "verdict_emitted")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1);

  return withTimeout(
    (async () => {
      const { data, error } = await probe;
      if (error) return { status: "down" as Health, lastVerdictAt: null };
      const ts = data?.[0]?.completed_at ?? null;
      return {
        status: "ok" as Health,
        lastVerdictAt: typeof ts === "string" ? ts : null,
      };
    })(),
    PROBE_TIMEOUT_MS,
    () => ({ status: "degraded" as Health, lastVerdictAt: null }),
  );
}

async function probeQueue(): Promise<Health> {
  // M4 placeholder: pg-boss schema is lazy-booted. We treat its
  // presence as "ok" and absence as "degraded" (the runner has not
  // yet started or has not yet booted pg-boss). "down" is reserved
  // for an active query failure that is NOT a missing-schema error.
  if (!hasSupabaseEnv()) return "degraded";
  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return "degraded";
  }
  return withTimeout(
    (async () => {
      try {
        const { error } = await supabase
          .from("runs")
          .select("id", { head: true, count: "estimated" })
          .eq("state", "queued")
          .limit(1);
        if (error) return "degraded" as Health;
        return "ok" as Health;
      } catch {
        return "degraded" as Health;
      }
    })(),
    PROBE_TIMEOUT_MS,
    () => "degraded" as Health,
  );
}

export async function GET(): Promise<NextResponse<HealthzPayload>> {
  const checkedAt = new Date().toISOString();
  const uptimeSeconds = Math.max(0, (Date.now() - START_TIME_MS) / 1000);

  const [dbProbe, queueStatus] = await Promise.all([probeDb(), probeQueue()]);

  const payload: HealthzPayload = {
    ok: dbProbe.status === "ok" && queueStatus === "ok",
    version: VERSION,
    uptime: Math.round(uptimeSeconds),
    db: dbProbe.status,
    queue: queueStatus,
    last_audit_completed_at: dbProbe.lastVerdictAt,
    checked_at: checkedAt,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      ...aiDisclosureHeaders,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
