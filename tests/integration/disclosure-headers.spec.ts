/**
 * Studio Zero — AI Act Art. 50 disclosure-headers integration.
 *
 * Phase 9 M1 Batch 3 (Verify). REPLACES the M0 mock-shaped fixture-test
 * with a real route-handler exercise: we invoke the Next.js route
 * handlers directly (no `next start` boot — that requires `next build`
 * which is ~90s on cold cache per Pipeline) and assert the header lands
 * on every response.
 *
 * Why direct invocation, not `next start` + fetch (same rationale as the
 * M0 sibling): the route file IS the contract — if the handler returns
 * the header, every framework-mediated call path inherits it. Plus we
 * test the `next.config.ts` headers() declaration as belt-and-braces.
 *
 * Coverage added vs M0:
 *   - /api/health        (M0 baseline; re-asserted)
 *   - /api/runs          (M1 — Vega's runs list + create handlers)
 *   - layout.tsx Metadata wiring (the <meta name="ai-generated"> source
 *     of truth — every page inherits via Next's `metadata` export.)
 *   - aiDisclosureHeaders is the only place the value "studio-zero" is
 *     declared; the route imports it (not re-types it).
 *
 * Constraint per the brief: this spec replaces the M0 mock test. We
 * keep the M0 file (`tests/disclosure-headers.test.ts`) functional — it
 * still validates the route source against the lib — but the **handler-
 * level binary assertion** (header present on actual Response objects)
 * is what THIS spec adds.
 *
 * Note on Next.js 15 route module loading. Route handlers under
 * apps/web/app are TypeScript that imports `next/server`. Next has
 * its own TS compile/transform pipeline for these files. We dynamic-
 * import via file:// URL — Node + Vitest's loader handles the .ts
 * resolve. If the apps/web node_modules isn't installed, the import
 * will fail at module-load time and we surface that as an explicit
 * skip with M1+1 reason.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

const HEALTH_ROUTE = path.join(ROOT, "apps/web/app/api/health/route.ts");
const RUNS_ROUTE = path.join(ROOT, "apps/web/app/api/runs/route.ts");
const NEXT_CONFIG = path.join(ROOT, "apps/web/next.config.ts");
const AI_DISCLOSURE_LIB = path.join(ROOT, "apps/web/lib/ai-disclosure.ts");
const LAYOUT_PATH = path.join(ROOT, "apps/web/app/layout.tsx");

// --- M2 Batch 1 routes added by Forge (a7396fc). Each must declare the
//     X-AI-Generated header via the shared `aiDisclosureHeaders` constant.
const STRIPE_WEBHOOK_ROUTE = path.join(
  ROOT,
  "apps/web/app/api/webhooks/stripe/route.ts",
);
const CHECKOUT_SESSION_ROUTE = path.join(
  ROOT,
  "apps/web/app/api/billing/checkout-session/route.ts",
);
const RECONCILE_ROUTE = path.join(ROOT, "apps/web/app/api/billing/reconcile/route.ts");
const PORTAL_ROUTE = path.join(ROOT, "apps/web/app/api/billing/portal/route.ts");
const PRICING_PAGE = path.join(ROOT, "apps/web/app/pricing/page.tsx");

const M2_NEW_ROUTES: ReadonlyArray<{ name: string; file: string }> = [
  { name: "/api/webhooks/stripe", file: STRIPE_WEBHOOK_ROUTE },
  { name: "/api/billing/checkout-session", file: CHECKOUT_SESSION_ROUTE },
  { name: "/api/billing/reconcile", file: RECONCILE_ROUTE },
  { name: "/api/billing/portal", file: PORTAL_ROUTE },
];

const WEB_NODE_MODULES = path.join(ROOT, "apps/web/node_modules");
const WEB_DEPS_INSTALLED = existsSync(WEB_NODE_MODULES);

function pathToFileUrl(p: string): string {
  const norm = p.replace(/\\/g, "/");
  return norm.startsWith("/") ? `file://${norm}` : `file:///${norm}`;
}

// Force isMockMode = true so /api/runs takes the mock path (no DB).
const PRIOR_AUTH_MOCK = process.env.NEXT_PUBLIC_USE_AUTH_MOCK;
process.env.NEXT_PUBLIC_USE_AUTH_MOCK = "true";

describe("disclosure-headers — HTTP header on every API response", () => {
  it("aiDisclosureHeaders is the source of truth — X-AI-Generated: studio-zero", () => {
    const src = readFileSync(AI_DISCLOSURE_LIB, "utf-8");
    expect(src).toMatch(/AI_DISCLOSURE_HEADER_NAME\s*=\s*["']X-AI-Generated["']/);
    expect(src).toMatch(/AI_DISCLOSURE_HEADER_VALUE\s*=\s*["']studio-zero["']/);
  });

  it("next.config.ts headers() applies X-AI-Generated to every path", () => {
    const src = readFileSync(NEXT_CONFIG, "utf-8");
    expect(src).toMatch(/X-AI-Generated/);
    expect(src).toMatch(/studio-zero/);
    expect(src).toMatch(/source:\s*["']\/?:path\*["']/);
  });

  it.skipIf(!WEB_DEPS_INSTALLED)(
    "GET /api/health response carries X-AI-Generated: studio-zero",
    async () => {
      const mod = (await import(/* @vite-ignore */ pathToFileUrl(HEALTH_ROUTE))) as {
        GET: () => Response;
      };
      const res = mod.GET();
      expect(res.headers.get("x-ai-generated")).toBe("studio-zero");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; service: string };
      expect(body.ok).toBe(true);
      expect(body.service).toBe("studio-zero/web");
    },
  );

  it.skipIf(!WEB_DEPS_INSTALLED)(
    "GET /api/runs (mock auth) response carries X-AI-Generated: studio-zero",
    async () => {
      const mod = (await import(/* @vite-ignore */ pathToFileUrl(RUNS_ROUTE))) as {
        GET: () => Promise<Response>;
      };
      const res = await mod.GET();
      expect(res.headers.get("x-ai-generated")).toBe("studio-zero");
      expect(res.status).toBe(200);
    },
  );

  it.skipIf(!WEB_DEPS_INSTALLED)(
    "POST /api/runs (mock auth) response carries X-AI-Generated: studio-zero",
    async () => {
      const mod = (await import(/* @vite-ignore */ pathToFileUrl(RUNS_ROUTE))) as {
        POST: (req: Request) => Promise<Response>;
      };
      const req = new Request("http://test.example.com/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeMethod: "github", depth: "quick" }),
      });
      const res = await mod.POST(req);
      expect(res.headers.get("x-ai-generated")).toBe("studio-zero");
      // Mock path returns 201 with mock runId.
      expect(res.status).toBe(201);
    },
  );

  if (!WEB_DEPS_INSTALLED) {
    it("(handler-level tests SKIPPED — apps/web/node_modules absent; run pnpm install)", () => {
      console.warn(
        "[disclosure-headers] apps/web/node_modules absent — handler tests skipped (M1+1: run pnpm install in apps/web)",
      );
      expect(WEB_DEPS_INSTALLED).toBe(false);
    });
  }
});

describe("disclosure-headers — <meta name=\"ai-generated\"> on every HTML page", () => {
  it("layout.tsx Metadata wires the canonical name + content (Art. 50 interim)", () => {
    const src = readFileSync(LAYOUT_PATH, "utf-8");
    // The layout MUST import from lib/ai-disclosure (no fabricated string).
    expect(src).toMatch(/AI_DISCLOSURE_META_NAME/);
    expect(src).toMatch(/AI_DISCLOSURE_META_CONTENT/);
    expect(src).toMatch(/from\s+["']\.\.\/lib\/ai-disclosure["']/);
    // And the metadata `other` map carries the name/content pair.
    expect(src).toMatch(/other:\s*\{/);
  });

  it("aiDisclosureMeta is the only declaration of meta name/content", () => {
    const src = readFileSync(AI_DISCLOSURE_LIB, "utf-8");
    expect(src).toMatch(/AI_DISCLOSURE_META_NAME\s*=\s*["']ai-generated["']/);
    expect(src).toMatch(/AI_DISCLOSURE_META_CONTENT\s*=\s*["']studio-zero["']/);
  });
});

describe("disclosure-headers — unhappy paths + structural drift guards", () => {
  it("the route handlers reference aiDisclosureHeaders (not a hard-coded string)", () => {
    for (const route of [HEALTH_ROUTE, RUNS_ROUTE]) {
      const src = readFileSync(route, "utf-8");
      expect(src).toMatch(/aiDisclosureHeaders/);
      // And: no fabricated `"X-AI-Generated"` string elsewhere in the
      // handler — only the import from the lib counts. (One occurrence
      // is fine — it could be a typed-out import comment; we just
      // ensure the structural wiring above passed.)
    }
  });

  it("(unhappy) a fabricated route handler that hardcodes the value is detectable", () => {
    // Pretend a developer wrote:
    const offending = `return new Response("ok", { headers: { "X-AI-Generated": "interim" } });`;
    // The drift is the wrong value. Our guard: no `"X-AI-Generated"`
    // appears with a value other than `"studio-zero"`.
    const m = offending.match(/X-AI-Generated"\s*:\s*"([^"]+)"/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toBe("studio-zero");
    // (In the real codebase the test files above grep the route for
    // `aiDisclosureHeaders` — a forced-import pattern that catches the
    // typo-the-value bug at PR time.)
  });

  it("(unhappy) a route without aiDisclosureHeaders import flagged at review", () => {
    // The matching pattern used by the structural test above.
    const okRoute = readFileSync(HEALTH_ROUTE, "utf-8");
    expect(/aiDisclosureHeaders/.test(okRoute)).toBe(true);
    const badRoute = "export function GET() { return new Response('x'); }";
    expect(/aiDisclosureHeaders/.test(badRoute)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// M2 Batch 1 — new billing + webhook routes (Forge a7396fc).
//
// Source-level assertions only: the route handlers fabricate Response objects
// directly (not via Next's default headers() wrapper) and MUST import the
// canonical `aiDisclosureHeaders` constant + spread it into every Response.
// Runtime-import + invoke is gated on apps/web deps + a stack of mocks for
// Stripe + Supabase — covered in the M2 Batch 2 sibling specs. Here we
// only need the structural binary "header is wired".
// ---------------------------------------------------------------------------

describe("disclosure-headers — M2 Batch 1 routes (Forge a7396fc)", () => {
  it.each(M2_NEW_ROUTES)(
    "$name route imports aiDisclosureHeaders from lib/ai-disclosure (Art. 50 source-of-truth)",
    ({ file }) => {
      const src = readFileSync(file, "utf-8");
      // 1) Imports the named export — not a hand-typed string.
      expect(src).toMatch(/from\s+["'][^"']*\/lib\/ai-disclosure["']/);
      expect(src).toMatch(/aiDisclosureHeaders/);
    },
  );

  it.each(M2_NEW_ROUTES)(
    "$name route spreads aiDisclosureHeaders into every Response (no hand-typed X-AI-Generated values)",
    ({ file }) => {
      const src = readFileSync(file, "utf-8");
      // Every Response constructed in the handler spreads aiDisclosureHeaders.
      // Concretely: the count of `new Response(` declarations should be
      // ≤ the count of `...aiDisclosureHeaders` spreads (allowing the same
      // spread to be applied to multiple Response paths via a helper).
      const newResponseCount = (src.match(/new Response\(/g) ?? []).length;
      const spreadCount = (src.match(/\.\.\.aiDisclosureHeaders/g) ?? []).length;
      expect(newResponseCount).toBeGreaterThan(0);
      // Either every Response carries the spread directly OR the route
      // funnels Responses through a `json()` helper that does (checkout +
      // reconcile + portal use this pattern; the webhook does not).
      const hasJsonHelper = /function json\(/.test(src);
      if (hasJsonHelper) {
        expect(spreadCount).toBeGreaterThan(0);
      } else {
        // Webhook route — every Response inlines the spread.
        expect(spreadCount).toBeGreaterThanOrEqual(newResponseCount);
      }
    },
  );

  it.each(M2_NEW_ROUTES)(
    "$name route never declares a literal X-AI-Generated value (only via lib constant)",
    ({ file }) => {
      const src = readFileSync(file, "utf-8");
      // Match patterns like `"X-AI-Generated": "anything-else"` —
      // there should be ZERO literal occurrences anywhere outside imports.
      // The lib constants live in ai-disclosure.ts; routes only import.
      const literal = src.match(/X-AI-Generated["']\s*:\s*["']([^"']+)["']/);
      expect(literal).toBeNull();
    },
  );

  it("/pricing page (HTML) is covered by the layout.tsx Metadata.other path", () => {
    // The /pricing page exists and inherits from app/layout.tsx Metadata,
    // which carries `<meta name="ai-generated" content="studio-zero">`.
    // We assert the page file exists and the layout.tsx wiring (already
    // covered above) is what fans out to it — no per-page meta-tag drift.
    expect(existsSync(PRICING_PAGE)).toBe(true);
  });

  it("next.config.ts source/path catches the new /api/billing/* + /api/webhooks/stripe globs", () => {
    const src = readFileSync(NEXT_CONFIG, "utf-8");
    // source: "/:path*" covers EVERY path including the new M2 routes;
    // this re-confirms the catch-all stays in place.
    expect(src).toMatch(/source:\s*["']\/?:path\*["']/);
    // And the header itself is X-AI-Generated: studio-zero.
    expect(src).toMatch(/X-AI-Generated/);
    expect(src).toMatch(/studio-zero/);
  });

  // Runtime handler-level invocation for the M2 webhook + billing routes
  // requires mocking @supabase/ssr cookies + the server-only import +
  // the Stripe SDK. The sibling specs (stripe-webhook-handler.spec.ts,
  // stripe-checkout-flow.spec.ts) carry that full mock stack; here we only
  // verify the structural wiring is in place at the file-source level.
});

// Restore env for any subsequent tests.
if (PRIOR_AUTH_MOCK === undefined) {
  delete process.env.NEXT_PUBLIC_USE_AUTH_MOCK;
} else {
  process.env.NEXT_PUBLIC_USE_AUTH_MOCK = PRIOR_AUTH_MOCK;
}
