/**
 * Studio Zero — AI Act Art. 50 interim disclosure header gate
 *
 * Phase 9 M0 exit gate (per `milestone-M0.md` and PRD §16):
 *   "First synthetic Surface run emits X-AI-Generated: studio-zero
 *    HTTP header on the API response (Comply interim disclosure per
 *    §11.3). Integration test in tests/integration/disclosure-headers.spec.ts."
 *
 * This test invokes the Next.js route handler **directly** (without
 * spawning a server). The route exports a `GET` function that returns
 * a `NextResponse` — we call it and inspect the resulting headers.
 *
 * Why direct invocation, not `next start` + fetch:
 *   - `next start` requires a `next build` first which is too slow for
 *     PR-blocking CI on Windows (≈90s on cold cache per Pipeline's notes).
 *   - The route file IS the contract; if the handler returns the
 *     header, every framework-mediated call path inherits it. The
 *     additional `next.config.ts` headers() declaration acts as
 *     belt-and-braces and is structurally tested below.
 *   - E2E coverage of `/api/health` through the framework lives in
 *     Playwright (Probe owns; lands at M1 alongside the runner endpoints).
 *
 * Owner: Verify (this gate) + Forge (the implementation under test) +
 * Comply (the policy this gate enforces).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// ---------- route handler — direct import ----------

const HEALTH_ROUTE_PATH = path.resolve(
  __dirname,
  "..",
  "apps",
  "web",
  "app",
  "api",
  "health",
  "route.ts"
);

const AI_DISCLOSURE_LIB_PATH = path.resolve(
  __dirname,
  "..",
  "apps",
  "web",
  "lib",
  "ai-disclosure.ts"
);

const NEXT_CONFIG_PATH = path.resolve(__dirname, "..", "apps", "web", "next.config.ts");

describe("disclosure-headers — apps/web/app/api/health/route.ts (Phase 9 M0)", () => {
  it("the GET /api/health route file exists in HEAD", () => {
    expect(existsSync(HEALTH_ROUTE_PATH)).toBe(true);
  });

  it("the route imports and applies aiDisclosureHeaders from lib/ai-disclosure", () => {
    // Structural assertion: the route's source code wires the header
    // by reference to the canonical lib. Catches the regression where
    // someone fabricates a one-off string and lets it drift from the
    // lib's source-of-truth value.
    const src = readFileSync(HEALTH_ROUTE_PATH, "utf-8");
    expect(src).toMatch(/from\s+["']\.\.\/\.\.\/\.\.\/lib\/ai-disclosure["']/);
    expect(src).toMatch(/aiDisclosureHeaders/);
    expect(src).toMatch(/headers:\s*aiDisclosureHeaders/);
  });

  it("aiDisclosureHeaders exposes X-AI-Generated: studio-zero (PRD §11.3)", () => {
    const src = readFileSync(AI_DISCLOSURE_LIB_PATH, "utf-8");
    // Source of truth — the constants. If anyone edits the lib to
    // weaken the disclosure (e.g., to "interim" or "draft"), the test
    // fails loudly. The AI-Act header value is BINARY: it's either
    // "studio-zero" or it's not, no semantic flexibility.
    expect(src).toMatch(
      /AI_DISCLOSURE_HEADER_NAME\s*=\s*["']X-AI-Generated["']/
    );
    expect(src).toMatch(
      /AI_DISCLOSURE_HEADER_VALUE\s*=\s*["']studio-zero["']/
    );
  });

  it("next.config.ts headers() declares X-AI-Generated: studio-zero (belt-and-braces)", () => {
    const src = readFileSync(NEXT_CONFIG_PATH, "utf-8");
    expect(src).toMatch(/X-AI-Generated/);
    expect(src).toMatch(/studio-zero/);
    // And the source: /:path* (every page + every API route).
    expect(src).toMatch(/source:\s*["']\/?:path\*["']/);
  });
});

describe("disclosure-headers — handler-level assertion (Phase 9 M0)", () => {
  // The handler returns a Web `Response`-shaped object. We invoke it
  // directly and assert the header lands on the response.
  //
  // Dynamic import keeps the test file portable: if Next.js types are
  // resolved differently on the runner vs. dev, we only pay the import
  // cost when the test runs (and `it.skipIf` peels off cleanly on a
  // workstation where apps/web/node_modules isn't installed).

  const WEB_NODE_MODULES = path.resolve(__dirname, "..", "apps", "web", "node_modules");
  const WEB_DEPS_INSTALLED = existsSync(WEB_NODE_MODULES);

  it.skipIf(!WEB_DEPS_INSTALLED)(
    "GET handler returns a response carrying X-AI-Generated: studio-zero",
    async () => {
      // Resolve the handler from the apps/web tree so its imports
      // (NextResponse, lib paths) resolve through the app's own
      // dependency closure rather than the root's.
      const routeModule = (await import(
        /* @vite-ignore */ pathToFileUrl(HEALTH_ROUTE_PATH)
      )) as { GET: () => Response };
      const response = routeModule.GET();
      // Web Response — header access is case-insensitive.
      expect(response.headers.get("x-ai-generated")).toBe("studio-zero");
      expect(response.status).toBe(200);

      // Body shape — sanity-check the disclosure isn't accidentally
      // attached to a 500 page or a redirect.
      const body = (await response.json()) as { ok: boolean; service: string };
      expect(body.ok).toBe(true);
      expect(body.service).toBe("studio-zero/web");
    }
  );

  if (!WEB_DEPS_INSTALLED) {
    // Loudly surface the skip reason. CI installs apps/web/node_modules
    // via the workspace lockfile; local skipping is the dev convenience.
    it("(note: handler-level test SKIPPED — apps/web/node_modules not present; run `pnpm install` to enable)", () => {
      expect(WEB_DEPS_INSTALLED).toBe(false);
    });
  }
});

/** Win32-safe file:// URL builder — Node's import() requires file:// for
 *  dynamic .ts imports on Windows; using a raw path on Win silently fails. */
function pathToFileUrl(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
}
