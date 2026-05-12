/**
 * POST /api/cli/runs/[id]/events — Phase 9 M3 Batch 2 (Forge).
 *
 * Receives progress / reviewer-status events emitted by the CLI during
 * a local audit run. Each event is appended to `runs.events_log` (jsonb
 * array) and published to the Supabase Realtime channel `runs:<run_id>`
 * so the web app's audit page renders live updates.
 *
 * Auth: pairing-token Bearer. The pairing's tenant_id MUST match the
 * `runs.tenant_id`; otherwise 403 (defense-in-depth alongside RLS).
 *
 * Body: `{ events: AuditEvent[] }` — array of structured events. The
 * AuditEvent v1.1 schema (Atlas ARCH-D10) lives at
 * `architecture/contracts/audit-event.v1.ts`; we don't tightly validate
 * here (the runner contract test is the gate) but we DO enforce the
 * privacy invariant:
 *
 *   - Request body MUST be ≤ 64 KiB (M3 lock — never accept source).
 *   - We never persist any field whose key contains "source", "code",
 *     "diff", or "snippet" — explicit denylist as belt-and-braces.
 *
 * The CLI also POSTs single-event objects (not wrapped in `{ events }`)
 * per `apps/cli/src/network/upload-verdict.ts postRunEvent()`. We
 * accept both shapes.
 *
 * Idempotency: events_log is an append-only buffer; duplicate POSTs
 * just add dupe rows (the CLI is expected to dedupe via its own
 * client-side seq counter — not our problem here).
 */
import {
  cliJson,
  EVENTS_BODY_CAP_BYTES,
  unauthorized,
  verifyPairingToken,
} from "../../../../../../lib/cli-auth";
import { isMockMode } from "../../../../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Privacy denylist — any event-field key containing one of these
// substrings is dropped before persistence. The CLI is the source of
// truth for source code on the customer's machine; nothing source-shaped
// should ever cross the wire. This is belt-and-braces — the CLI's
// `studio-client.ts` already has a 64 KiB request cap.
const SOURCE_KEY_DENYLIST = ["source", "code", "diff", "snippet", "filebody"];

interface PostEventsBody {
  events?: Array<Record<string, unknown>>;
  // Single-event shape per upload-verdict.ts postRunEvent.
  [key: string]: unknown;
}

function isSourceShapedKey(key: string): boolean {
  const low = key.toLowerCase();
  return SOURCE_KEY_DENYLIST.some((needle) => low.includes(needle));
}

function sanitize(event: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(event)) {
    if (isSourceShapedKey(k)) continue;
    out[k] = v;
  }
  return out;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: runId } = await ctx.params;
  if (!runId || typeof runId !== "string") {
    return cliJson({ ok: false, error: "invalid_run_id" }, 400);
  }

  // Privacy invariant: hard size cap BEFORE any parse.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return cliJson({ ok: false, error: "invalid_body" }, 400);
  }
  if (raw.length > EVENTS_BODY_CAP_BYTES) {
    return cliJson(
      { ok: false, error: "body_too_large", limit: EVENTS_BODY_CAP_BYTES },
      413,
    );
  }

  let body: PostEventsBody;
  try {
    body = raw.length ? (JSON.parse(raw) as PostEventsBody) : {};
  } catch {
    return cliJson({ ok: false, error: "invalid_json" }, 400);
  }

  // Mock path: accept silently.
  if (isMockMode()) {
    return cliJson({ accepted: true, mock: true }, 200);
  }

  // Auth + tenant check.
  let service:
    | Awaited<ReturnType<typeof import("../../../../../../lib/supabase-service").createServiceRoleClient>>
    | null = null;
  try {
    const mod = await import("../../../../../../lib/supabase-service");
    service = mod.createServiceRoleClient();
  } catch {
    return unauthorized("service_unavailable");
  }
  const pairing = await verifyPairingToken(service, req);
  if (!pairing) return unauthorized();

  // Normalize events array.
  let events: Array<Record<string, unknown>>;
  if (Array.isArray(body.events)) {
    events = body.events;
  } else if (body && typeof body === "object" && Object.keys(body).length > 0) {
    events = [body as Record<string, unknown>];
  } else {
    return cliJson({ ok: false, error: "no_events" }, 400);
  }
  if (events.length === 0) {
    return cliJson({ accepted: true, count: 0 }, 200);
  }
  if (events.length > 256) {
    return cliJson({ ok: false, error: "too_many_events" }, 413);
  }

  // Sanitize: drop any source-shaped fields.
  const sanitized = events
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
    .map(sanitize);

  // Cross-tenant guard: verify the run belongs to the caller's tenant.
  try {
    const { data: runRow, error: runErr } = await service
      .from("runs")
      .select("id, tenant_id, events_log")
      .eq("id", runId)
      .maybeSingle();
    if (runErr || !runRow) {
      return cliJson({ ok: false, error: "run_not_found" }, 404);
    }
    const row = runRow as { id: string; tenant_id: string; events_log: unknown };
    if (row.tenant_id !== pairing.tenant_id) {
      return cliJson({ ok: false, error: "forbidden" }, 403);
    }

    // Append to events_log (jsonb). Postgres supports `jsonb || jsonb`
    // for array concat; we do the merge in Node + write back to keep
    // the migration surface small for M3. V1.5 moves to a SQL function.
    const current = Array.isArray(row.events_log) ? row.events_log : [];
    const updated = [...(current as unknown[]), ...sanitized];
    // Bound: never grow past 5000 events for a single run (state-machine
    // EC-2 trimmer reaps to last 24h; this is a request-time bound).
    const bounded = updated.length > 5000 ? updated.slice(-5000) : updated;

    const { error: updateErr } = await service
      .from("runs")
      .update({ events_log: bounded })
      .eq("id", runId)
      .eq("tenant_id", pairing.tenant_id);
    if (updateErr) {
      return cliJson({ ok: false, error: "persist_failed" }, 500);
    }

    // Publish to Supabase Realtime channel `runs:<run_id>` — the web
    // audit page subscribes here via `lib/run-realtime.ts`. We use the
    // service-role's `channel().send()` (broadcast) — it doesn't write
    // to a table so it's safe to call per request.
    try {
      const channel = service.channel(`runs:${runId}`);
      await channel.send({
        type: "broadcast",
        event: "cli-events",
        payload: { events: sanitized },
      });
      // Clean up the channel — we don't subscribe to it server-side.
      await service.removeChannel(channel);
    } catch {
      // Realtime publish is best-effort; the events_log write is the
      // source of truth.
    }

    return cliJson({ accepted: true, count: sanitized.length }, 200);
  } catch {
    return cliJson({ ok: false, error: "internal_error" }, 500);
  }
}
