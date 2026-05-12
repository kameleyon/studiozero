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
 * V2.1 Batch 1 (Forge — M5 CSP+HSTS carry close). The CSP allows-only the
 * third-party origins the customer-facing site genuinely needs:
 *   - https://cdn.stripe.com + https://js.stripe.com (Checkout + Portal)
 *   - https://js.posthog.com + https://eu.i.posthog.com (Lens / Hook funnel)
 *   - https://browser.sentry-cdn.com (Sentry replay loader)
 *
 * The list is intentionally short — Shield's threat-model.md TB-1 ("XSS via
 * third-party origin allowlist drift") + Cipher's redaction posture both ban
 * `script-src *` and `script-src 'unsafe-eval'`. Adding a new origin requires
 * a Cipher-signed PR.
 *
 * HSTS includes-subDomains + preload — Studio Zero is on the HSTS preload
 * list (per architecture/iac/cloudflare/dns.md). The 1-year max-age matches
 * the preload registry minimum.
 */

/** Content Security Policy — Shield + Cipher gate. */
const CSP_DIRECTIVES = [
  // Default sources — locked to same-origin.
  "default-src 'self'",
  // Scripts — Stripe + PostHog + Sentry loaders. 'unsafe-inline' is the
  // pragmatic concession Next.js requires for App Router server components
  // until Next 16 ships `next/script` strict-dynamic. Tracked under
  // architecture/decisions.md ARCH-D11 (CSP hardening roadmap).
  "script-src 'self' 'unsafe-inline' https://cdn.stripe.com https://js.stripe.com https://js.posthog.com https://browser.sentry-cdn.com",
  // Styles — Tailwind atomic classes + inline style attrs on Stripe iframes.
  "style-src 'self' 'unsafe-inline'",
  // Images — same-origin + Supabase storage + Stripe + data: URIs.
  "img-src 'self' data: blob: https://*.supabase.co https://q.stripe.com https://*.studiozero.dev",
  // Fonts — same-origin (Geist Sans + Geist Mono ship as static assets).
  "font-src 'self' data:",
  // Network connectivity — Supabase Realtime (wss) + Stripe + PostHog + Sentry.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  // Frames — Stripe Checkout iframes only.
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  // Form actions — local only.
  "form-action 'self'",
  // Browsing context — never embed Studio Zero in a third-party iframe.
  "frame-ancestors 'none'",
  // Base URI — pin to same-origin (Shield TB-3 base-tag injection).
  "base-uri 'self'",
  // Object embeds — block.
  "object-src 'none'",
  // Upgrade insecure requests in case any third-party HTTP URL slips in.
  "upgrade-insecure-requests",
];

const securityHeaders = [
  // EU AI Act Art. 50 interim machinery — PRD §11.3 + §14.5.
  // Comply + Forge ticket #18. Comply re-verifies before V1.5 Auto-PR.
  { key: "X-AI-Generated", value: "studio-zero" },

  // Content Security Policy — V2.1 Batch 1 carry close (M5 CSP).
  // Shield TB-1 + Cipher redaction posture.
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES.join("; ") },

  // HSTS preload — V2.1 Batch 1 carry close (M5 HSTS).
  // 1-year max-age + includeSubDomains + preload.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },

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

  // Next 15 enables `instrumentation.ts` discovery by default — no
  // `experimental.instrumentationHook` flag needed. The actual init
  // lives in `apps/web/instrumentation.ts` (Forge — M1 Batch 2).
  experimental: {},

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
