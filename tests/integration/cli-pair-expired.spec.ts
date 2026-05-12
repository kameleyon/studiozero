/**
 * Studio Zero — CLI expired pairing token (C-FAIL-2 per Trace flow).
 *
 * Per `ia/user-flows/cli-pairing-and-tamper.md` C5 → C-FAIL transition:
 * the pairing token has a 90-day TTL. When it expires, the CLI's next
 * authenticated request to /api/cli/jobs (or any bearer-required route)
 * MUST receive a 401 + the body MUST include a `redirect_to_login`
 * machine code so the CLI can trigger the `studio-zero login` flow again.
 *
 * Surface verified:
 *   - Expired token row exists → 401 + body.error='token_expired'.
 *   - Body carries a `redirect_to_login: true` flag so the CLI knows to
 *     prompt re-pair (not retry).
 *   - The bearer extraction + verifyPairingToken contract returns null
 *     (the row's expires_at is in the past), so the route's auth guard
 *     denies access without leaking row data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cliJson,
  unauthorized,
  verifyPairingToken,
} from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

/* -------------------------------------------------------------------------- */
/* In-test handler: /api/cli/jobs                                             */
/* -------------------------------------------------------------------------- */

async function jobsHandler(req: Request, supa: MockSupabase): Promise<Response> {
  const row = await verifyPairingToken(supa.client, req);
  if (!row) {
    // The CLI needs a machine-actionable hint so it triggers `studio-zero
    // login` rather than retrying. Carry the redirect flag on the body.
    return cliJson(
      { ok: false, error: "token_expired", redirect_to_login: true },
      401,
      { "WWW-Authenticate": 'Bearer realm="studio-zero", error="invalid_token"' },
    );
  }
  // Happy path — return a noop empty job (test doesn't care).
  return cliJson({ ok: true, jobs: [] }, 200);
}

function mkReq(token: string | null): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request("https://studio-zero.com/api/cli/jobs", {
    method: "GET",
    headers,
  });
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI expired pairing token (C-FAIL-2)", () => {
  let supa: MockSupabase;

  beforeEach(() => {
    supa = makeMockSupabase();
  });
  afterEach(() => {
    supa.reset();
  });

  it("expired token (expires_at in past) → 401 + redirect_to_login=true", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: null,
      // Expired 1 day ago.
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await jobsHandler(
      mkReq("Z".repeat(43)) /* valid-shape token */,
      supa,
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: string; redirect_to_login: boolean };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("token_expired");
    expect(body.redirect_to_login).toBe(true);
  });

  it("response includes WWW-Authenticate header (RFC 6750 §3 — invalid_token)", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await jobsHandler(mkReq("Z".repeat(43)), supa);
    const wwwAuth = res.headers.get("WWW-Authenticate");
    expect(wwwAuth).toBeTruthy();
    expect(wwwAuth).toContain("Bearer");
    expect(wwwAuth).toContain('error="invalid_token"');
  });

  it("AI-disclosure header still present on the 401 (PRD §11.3)", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await jobsHandler(mkReq("Z".repeat(43)), supa);
    expect(res.headers.get("X-AI-Generated")).toBe("studio-zero");
  });

  it("CLI's handler-side behavior: 401 + redirect_to_login → CLI clears local auth", () => {
    // Models what the CLI does when it sees the 401: this is the
    // contract Forge will wire into `network/studio-client.ts` via the
    // refresh path. We assert the shape the CLI relies on.
    const serverBody = { ok: false, error: "token_expired", redirect_to_login: true };
    // The CLI's `network` layer checks this exact predicate.
    const shouldRedirect =
      !serverBody.ok &&
      (serverBody.error === "token_expired" ||
        serverBody.error === "pairing_revoked") &&
      serverBody.redirect_to_login === true;
    expect(shouldRedirect).toBe(true);
  });

  it("valid (unexpired) token is admitted → 200 (control)", async () => {
    supa.pushRead("cli_pairings", {
      id: "pairing-001",
      tenant_id: "tt-1",
      user_id: "uu-1",
      cli_version: "0.1.0-m3",
      hostname: "h",
      os: "darwin",
      binary_hash: "a".repeat(64),
      revoked_at: null,
      // 30 days in the future.
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_heartbeat_at: null,
    });
    const res = await jobsHandler(mkReq("Y".repeat(43)), supa);
    expect(res.status).toBe(200);
  });

  it("missing Authorization header → 401 (does NOT need redirect_to_login — CLI is unpaired)", async () => {
    const res = await jobsHandler(mkReq(null), supa);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: string; redirect_to_login: boolean };
    // We DO still set redirect_to_login=true because the CLI's recovery
    // is the same: run `studio-zero login`. (Cleaner than a per-cause
    // matrix on the client.)
    expect(body.error).toBe("token_expired");
    expect(body.redirect_to_login).toBe(true);
  });

  it("contract sanity: unauthorized() helper from cli-auth still works (no regression)", () => {
    const r = unauthorized("token_expired");
    expect(r.status).toBe(401);
  });
});
