/**
 * GET /api/status/incidents — current + recent incidents (M4 Batch 1, Watch).
 *
 * Returns the list of currently-open and recently-resolved incidents the
 * /status page surfaces in its "Recent incidents" section. Authoritative
 * source at M4 is Better Uptime's incidents API; this route normalises
 * the shape so the M5 in-app incident-history (DB-backed `incidents`
 * table — Watch authors the M5 data model) can swap in without the UI
 * changing.
 *
 * Auth: NONE (public status surface).
 * Cache: `public, max-age=60, s-maxage=60` — matches /status revalidate.
 *
 * Response shape (locked at M4):
 *   {
 *     incidents: Array<{
 *       id:             string,
 *       title:          string,
 *       status:         "investigating" | "identified" | "monitoring" | "resolved",
 *       severity:       "minor" | "major" | "critical",
 *       components:     string[],     // matches /status section ids
 *       started_at:     ISO-8601,
 *       resolved_at:    ISO-8601 | null,
 *       last_update:    string,       // markdown-safe one-paragraph
 *     }>,
 *     window_days: 30,
 *     fetched_at:  ISO-8601,
 *   }
 *
 * M4 is a STATIC PLACEHOLDER returning the empty list — the route's
 * shape is what M5 needs to fulfil. The placeholder is checked into
 * HEAD so the /status page's `/api/status/incidents` fetch never 404s
 * during M4 staging.
 *
 * Owner: Watch (M4 Batch 1).
 */
import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../../lib/ai-disclosure";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 60;

type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

type IncidentSeverity = "minor" | "major" | "critical";

interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  /** Component ids — match the section ids on /status. */
  components: string[];
  started_at: string;
  resolved_at: string | null;
  /** One-paragraph latest update — markdown-safe (no HTML). */
  last_update: string;
}

interface IncidentsResponse {
  incidents: Incident[];
  window_days: number;
  fetched_at: string;
}

/**
 * M4 placeholder: empty list. M5 swap-in fetches from Better Uptime API
 * (BETTER_UPTIME_API_TOKEN env) or from the M5 `incidents` table (data
 * model authored by Watch as part of the M5 status-page-DB-backed
 * deliverable in `architecture/iac/observability/status-page.md`).
 *
 * The empty array intentionally returns 200 (not 204) so consumers can
 * always parse a JSON body and read `window_days` / `fetched_at`.
 */
const PLACEHOLDER_INCIDENTS: ReadonlyArray<Incident> = [];

export function GET(): NextResponse<IncidentsResponse> {
  const payload: IncidentsResponse = {
    incidents: [...PLACEHOLDER_INCIDENTS],
    window_days: 30,
    fetched_at: new Date().toISOString(),
  };
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      ...aiDisclosureHeaders,
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
