/**
 * Next.js 15 instrumentation hook — server-side observability init.
 *
 * Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Watch (Sentry config),
 * Cipher (beforeSend redaction wiring — closes B5 secret-exfil-via-Sentry).
 *
 * Two runtimes:
 *   - Node.js — covers Route Handlers, Server Actions, Server Components.
 *   - Edge — covers Edge runtime API routes + middleware.
 *
 * Both initialize Sentry with `beforeSend: redactPiiAndSecrets`, the
 * canonical PII + secrets scrubber from `lib/sentry-redaction.ts`. Per
 * threat-model §3.3 mitigation #1 + PRD §13.6, NO event leaves our infra
 * unscrubbed. Returning `null` from `redactPiiAndSecrets` (when the event
 * is post-redaction empty) DROPS the event entirely — better to lose a
 * crash report than ship a secret.
 *
 * Sourcemap upload is wired separately at build time via `SENTRY_AUTH_TOKEN`
 * + `SENTRY_ORG` + `SENTRY_PROJECT` (Watch's responsibility — `vercel/env-vars.md`).
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    const { redactPiiAndSecrets } = await import("./lib/sentry-redaction");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment:
        process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      // Cipher's redactor — the only piece this file must wire correctly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSend: redactPiiAndSecrets as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSendTransaction: redactPiiAndSecrets as any,
      // Send minimal default integrations so we don't pull in CookieJar /
      // RequestData captures that would re-introduce PII before the
      // scrubber runs.
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    const { redactPiiAndSecrets } = await import("./lib/sentry-redaction");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment:
        process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0.1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSend: redactPiiAndSecrets as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSendTransaction: redactPiiAndSecrets as any,
      sendDefaultPii: false,
    });
  }
}
