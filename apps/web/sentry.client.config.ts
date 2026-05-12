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

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend: redactPiiAndSecrets as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSendTransaction: redactPiiAndSecrets as any,
  sendDefaultPii: false,
});
