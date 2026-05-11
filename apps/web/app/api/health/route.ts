import { NextResponse } from "next/server";

import { aiDisclosureHeaders } from "../../../lib/ai-disclosure";

/**
 * GET /api/health
 *
 * Liveness probe. Returns 200 with a tiny payload so uptime monitors,
 * Vercel's deployment health check, and Watch's status-page poller can
 * confirm the app is reachable.
 *
 * Carries `X-AI-Generated: studio-zero` per PRD §11.3. The header is
 * also set by `next.config.ts` headers() — explicit here so callers who
 * inspect the response see it on every payload Studio Zero produces.
 *
 * Owner: Forge. Status-page wiring: Watch (M5).
 */

export const runtime = "nodejs";
export const dynamic = "force-static"; // health is stateless at M0

const VERSION = "0.1.0";
const SERVICE = "studio-zero/web" as const;

interface HealthResponse {
  ok: true;
  service: typeof SERVICE;
  version: string;
  // ISO 8601 timestamp of the build, not request time, since the
  // route is force-static. Vercel rebuilds on every push.
  builtAt: string;
}

const BUILT_AT = new Date().toISOString();

export function GET(): NextResponse<HealthResponse> {
  const payload: HealthResponse = {
    ok: true,
    service: SERVICE,
    version: VERSION,
    builtAt: BUILT_AT,
  };
  return NextResponse.json(payload, {
    status: 200,
    headers: aiDisclosureHeaders,
  });
}
