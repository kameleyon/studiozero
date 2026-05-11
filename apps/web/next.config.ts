import type { NextConfig } from "next";

/**
 * Studio Zero — Next.js 15 App Router config.
 *
 * Phase 9 M0 scaffold (Forge). Production-ready posture from day one
 * per BUILD_FLOW Hard Rule §5.
 *
 * Headers wire EU AI Act Art. 50 interim disclosure machinery per PRD §11.3:
 * every response (API + page) carries `X-AI-Generated: studio-zero`.
 * Disclosure binds 2026-08-02 — we ship the header at M0, not M5.
 *
 * Security headers per Shield's threat model defaults (TB-1..TB-15).
 * Fuller CSP, HSTS preload, and per-route variants land at M1 with the
 * runner endpoints; this is the floor every page meets today.
 */
const securityHeaders = [
  // EU AI Act Art. 50 interim machinery — PRD §11.3 + §14.5.
  // Comply + Forge ticket #18. Comply re-verifies before V1.5 Auto-PR.
  { key: "X-AI-Generated", value: "studio-zero" },

  // Standard hardening — Shield's M0 floor.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // SC 2.3.3 + privacy: do not surface ambient sensors to the marketing site.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // We live inside a monorepo (the studio-zero repo root has its own
  // package-lock.json from the audit-runner scripts). Pin the trace root
  // to apps/web so Next doesn't walk up and complain about the sibling
  // lockfile. `process.cwd()` resolves to apps/web because that's the
  // dir Vercel runs `next build` from (per vercel.json buildCommand).
  outputFileTracingRoot: process.cwd(),

  // Landing + stub routes are fully static. Keep the door open for
  // server actions and edge routes when M1 lands the runner endpoints.
  experimental: {
    // Reserved for M1 — leave empty at M0 so we don't ship unstable flags.
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
