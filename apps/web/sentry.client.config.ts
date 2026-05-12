/**
 * Sentry client config — browser-side init.
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Watch + Cipher.
 *
 * The Sentry Next.js SDK auto-loads this file when present in the app
 * root. We wire the SAME `beforeSend` redactor as the server-side
 * instrumentation so events that fire from the browser (uncaught
 * promise rejections, ReactErrorBoundary catches) pass the same scrub.
 *
 * The browser bundle can't import `server-only`, and the redaction
 * module is intentionally browser-safe (no Node APIs — only string + JSON
 * + crypto-free entropy). Verify writes a unit test that this config
 * file imports without pulling Node modules into the bundle.
 */

import * as Sentry from "@sentry/nextjs";

import { redactPiiAndSecrets } from "./lib/sentry-redaction";

/**
 * Surface tag (M5 Vega+Forge §G). Single Sentry project covers both
 * customer-facing marketing surface and the authenticated app shell;
 * events are tagged `surface: app` when the path begins `/app/` (or
 * `/admin/`), otherwise `surface: marketing`. A separate marketing-only
 * project would be over-engineering at M5 — one project + this tag is
 * enough to slice the dashboards.
 */
function resolveSurface(pathname: string | undefined): "app" | "marketing" {
  if (!pathname) return "marketing";
  if (pathname.startsWith("/app") || pathname.startsWith("/admin")) {
    return "app";
  }
  return "marketing";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withSurfaceTag(event: any, hint: any): any {
  const scrubbed = redactPiiAndSecrets(event, hint);
  if (!scrubbed) return scrubbed;
  const pathname =
    typeof window !== "undefined" && window.location
      ? window.location.pathname
      : undefined;
  const surface = resolveSurface(pathname);
  scrubbed.tags = { ...(scrubbed.tags ?? {}), surface };
  return scrubbed;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend: withSurfaceTag as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSendTransaction: withSurfaceTag as any,
  sendDefaultPii: false,
});
