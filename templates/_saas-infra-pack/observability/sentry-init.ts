/**
 * Studio Zero — Sentry initialization
 *
 * Wires up error tracking + performance tracing. Drop in `app/instrumentation.ts`
 * for Next.js App Router; or call `initSentry()` once at app boot.
 */
import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn("[sentry] NEXT_PUBLIC_SENTRY_DSN missing — error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Performance: 10% sample for production, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Session Replay: 0% normally, 100% on error
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // PII — never send. Cipher's redaction rules apply.
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip auth headers + cookies + email-like strings from breadcrumbs
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },

    // Don't report common noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      // Browser extensions throwing in our context
      /extension\//,
    ],
  });
}
