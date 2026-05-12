/**
 * Studio Zero — CLI version-too-old rejection (C-FAIL-3).
 *
 * Per `ia/user-flows/cli-pairing-and-tamper.md` C4 + EC-2:
 * the server publishes a min-supported CLI version in
 * `runner-version-policy.json`. When the CLI sends a version below
 * that floor at pair-confirm OR any subsequent authenticated call:
 *
 *   - Status: 426 Upgrade Required (RFC 7231 §6.5.15)
 *   - Body: { error: 'cli_version_too_old',
 *             minSupportedVersion: '<x.y.z>',
 *             upgradeCommand: 'npm install -g @studiozero/cli' }
 *
 * Why npm install in the body: per `apps/cli/src/commands/login.ts`
 * line ~142, the CLI's user-facing message is "Run `studio-zero upgrade`".
 * The structured body lets future CLI surfaces (IDE plugin, GitHub
 * Action) substitute the right install hint.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cliJson } from "../../apps/web/lib/cli-auth";
import { makeMockSupabase, type MockSupabase } from "./_helpers/mock-supabase";

vi.mock("server-only", () => ({}));

/* -------------------------------------------------------------------------- */
/* Version comparison + policy                                                */
/* -------------------------------------------------------------------------- */

/** Forge ships runner-version-policy.json; we model the field for the test. */
const MIN_SUPPORTED_VERSION = "0.1.0-m3";

/**
 * Parse `MAJOR.MINOR.PATCH[-PRERELEASE]` → tuple. Returns null on bad shape.
 * Pre-release is compared lexicographically (NOT SemVer-strict — Forge's
 * policy file shares the simple comparator).
 */
function parseVersion(v: string): [number, number, number, string] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ?? ""];
}

function compareVersions(a: string, b: string): number {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  if (!av || !bv) return 0;
  for (let i = 0; i < 3; i++) {
    const aN = av[i] as number;
    const bN = bv[i] as number;
    if (aN !== bN) return aN - bN;
  }
  // Pre-release: absence = release (higher than pre-release per SemVer)
  const aPre = av[3];
  const bPre = bv[3];
  if (!aPre && bPre) return 1;
  if (aPre && !bPre) return -1;
  return aPre.localeCompare(bPre);
}

function isVersionTooOld(actual: string, min: string): boolean {
  return compareVersions(actual, min) < 0;
}

/* -------------------------------------------------------------------------- */
/* In-test handler                                                            */
/* -------------------------------------------------------------------------- */

async function pairConfirmHandlerWithVersion(
  req: Request,
  _supa: MockSupabase,
): Promise<Response> {
  const body = (await req.json()) as { cliVersion?: string };
  const v = body.cliVersion;
  if (typeof v !== "string") {
    return cliJson({ ok: false, error: "cli_version_required" }, 400);
  }
  if (isVersionTooOld(v, MIN_SUPPORTED_VERSION)) {
    return cliJson(
      {
        ok: false,
        error: "cli_version_too_old",
        minSupportedVersion: MIN_SUPPORTED_VERSION,
        upgradeCommand: "npm install -g @studiozero/cli",
      },
      426,
    );
  }
  return cliJson({ ok: true }, 200);
}

function mkReq(cliVersion: string | undefined): Request {
  return new Request("https://studio-zero.com/api/cli/pair/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cliVersion }),
  });
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

describe("CLI version-too-old rejection (C-FAIL-3)", () => {
  let supa: MockSupabase;
  beforeEach(() => {
    supa = makeMockSupabase();
  });
  afterEach(() => {
    supa.reset();
  });

  it("0.0.9 (old) < 0.1.0-m3 → 426 Upgrade Required", async () => {
    const res = await pairConfirmHandlerWithVersion(mkReq("0.0.9"), supa);
    expect(res.status).toBe(426);
    const body = (await res.json()) as {
      ok: boolean;
      error: string;
      minSupportedVersion: string;
      upgradeCommand: string;
    };
    expect(body.error).toBe("cli_version_too_old");
    expect(body.minSupportedVersion).toBe(MIN_SUPPORTED_VERSION);
    expect(body.upgradeCommand).toBe("npm install -g @studiozero/cli");
  });

  it("0.1.0-m3 (=min) → 200", async () => {
    const res = await pairConfirmHandlerWithVersion(mkReq("0.1.0-m3"), supa);
    expect(res.status).toBe(200);
  });

  it("0.2.0 (newer than min) → 200", async () => {
    const res = await pairConfirmHandlerWithVersion(mkReq("0.2.0"), supa);
    expect(res.status).toBe(200);
  });

  it("0.0.1 (much older) → 426", async () => {
    const res = await pairConfirmHandlerWithVersion(mkReq("0.0.1"), supa);
    expect(res.status).toBe(426);
  });

  it("missing cliVersion field → 400 (not 426 — bad request, not upgrade-required)", async () => {
    const res = await pairConfirmHandlerWithVersion(mkReq(undefined), supa);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("cli_version_required");
  });

  it("upgrade command in body uses npm (canonical install per package.json bin entry)", async () => {
    const res = await pairConfirmHandlerWithVersion(mkReq("0.0.1"), supa);
    const body = (await res.json()) as { upgradeCommand: string };
    expect(body.upgradeCommand).toMatch(/^npm install -g /);
    expect(body.upgradeCommand).toContain("@studiozero/cli");
  });

  it("version comparator correctly orders prerelease vs release (0.1.0-m3 < 0.1.0)", () => {
    expect(compareVersions("0.1.0-m3", "0.1.0")).toBeLessThan(0);
    expect(compareVersions("0.1.0", "0.1.0-m3")).toBeGreaterThan(0);
    expect(compareVersions("0.1.0", "0.1.0")).toBe(0);
  });

  it("version comparator handles bad shape gracefully (returns 0, never throws)", () => {
    expect(compareVersions("not-a-version", "0.1.0")).toBe(0);
    expect(compareVersions("", "")).toBe(0);
  });

  it("AI-disclosure header on the 426", async () => {
    const res = await pairConfirmHandlerWithVersion(mkReq("0.0.9"), supa);
    expect(res.headers.get("X-AI-Generated")).toBe("studio-zero");
  });
});
