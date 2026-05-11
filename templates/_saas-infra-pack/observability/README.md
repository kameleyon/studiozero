# Observability Baseline

Three pieces, one stack:
- **Sentry** — errors + performance (`sentry-init.ts`)
- **PostHog** — product analytics + funnels (`posthog-analytics.ts`)
- **Structured logger** — JSON-lines for log aggregators (`structured-logger.ts`)

## Install
```bash
npm install @sentry/nextjs posthog-js
```

## Env
```env
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Wire-up (Next.js App Router)

```ts
// app/instrumentation.ts
import { initSentry } from "@/lib/observability/sentry-init";
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") initSentry();
}
```

```tsx
// app/layout.tsx — wrap children with the page tracker
import { PageviewTracker } from "@/lib/observability/posthog-analytics";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PageviewTracker />
        {children}
      </body>
    </html>
  );
}
```

```ts
// Anywhere server-side
import { logger } from "@/lib/observability/structured-logger";
logger.info("subscription_created", { user_id, tenant_id, plan: "creator" });
```

## What's intentionally NOT here
- **Datadog / New Relic / etc.** — out-of-scope for the baseline; pick later if scale demands. Sentry + PostHog handle 95% of small/medium SaaS observability needs.
- **OpenTelemetry** — Sentry's tracing is good enough for most teams. Only worth the complexity if you have a polyglot service mesh.
- **Custom metrics dashboards** — PostHog Insights covers this; only build custom Grafana when you outgrow it.

## Privacy
- Sentry: `sendDefaultPii: false`, headers + cookies stripped, common noise ignored
- PostHog: `autocapture: false` — explicit events only, keeps the schema clean and reduces accidental PII capture
- Logger: secret-key pattern redaction (password / token / authorization / cookie / api_key)
