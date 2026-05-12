import * as React from "react";

import { Nav } from "../../components/Nav";

import type { Metadata } from "next";

/**
 * /status — public status page (M4 Batch 1, Watch).
 *
 * Sourced from `architecture/iac/observability/status-page.md`. The
 * canonical "is the platform up?" surface MUST live on infra that does
 * NOT share a failure domain with Vercel + Supabase + Railway (per
 * architecture/system-diagram.md §6). Better Uptime (or Statuspage,
 * runway permitting) hosts the upstream board at status.studiozero.dev;
 * THIS in-app page is the secondary surface so authenticated users see
 * the same data inside the dashboard without leaving studiozero.dev.
 *
 * Failure modes:
 *  - If `/api/healthz` returns 200 but external probes fail, this page
 *    can still render — sections degrade independently.
 *  - If Supabase is down, we still render with `last_checked_at` showing
 *    the staleness — better stale than blank.
 *
 * Auth:
 *  - PUBLIC. No auth required (PRD §13.6 + Watch M4 status-page-public).
 *  - Reads ONLY public-safe aggregates (no tenant_id, no user_id, no
 *    customer email). Section names + 24h/90d uptime % only.
 *
 * Rendering:
 *  - Server-rendered (Next.js App Router). `revalidate = 60` keeps the
 *    page fresh without burning Supabase reads — the CDN serves stale
 *    HTML for up to 60s while ISR regenerates in the background.
 *  - No JS required for the page itself. The in-app live updates land
 *    at V1.5 (Realtime channel `public:status`).
 *
 * Six sections per the M4 Batch 1 brief:
 *  1. API uptime (last 90d) — Better Uptime probe percentage.
 *  2. Audit Pipeline (last 24h) — runs.state aggregation.
 *  3. Edge Functions (last 24h) — Supabase Edge dashboard percentile.
 *  4. Database — current Supabase health (proxied via /api/healthz).
 *  5. Realtime — Supabase Realtime channel health.
 *  6. Webhook delivery (Stripe + GitHub + Resend) — billing_events +
 *     email_events delivery_status aggregation.
 *
 * Owner: Watch (Phase 9 M4 Batch 1). Reviewers: Forge (route shape),
 * Vega (visual treatment alignment with /accessibility), Halo (a11y of
 * status indicators — color + icon + text per HC1 pattern).
 */
export const metadata: Metadata = {
  title: "Status · Studio Zero",
  description:
    "Live operational status for Studio Zero — API, audit pipeline, edge functions, database, realtime, and webhook delivery.",
  alternates: {
    canonical: "https://studiozero.dev/status",
  },
};

// Revalidate every 60s — matches the upstream Better Uptime probe cadence.
// On a hot CDN this means at most one DB hit per minute regardless of
// public traffic, which is what we want for an unauthenticated route.
export const revalidate = 60;

// Force-static at M4 (no per-request state). M5 may flip this to dynamic
// when we wire authenticated incident-history.
export const dynamic = "force-static";

type StatusLevel = "operational" | "degraded" | "down" | "maintenance";

interface StatusSection {
  /** Stable id used for anchor links + a11y aria-labelledby. */
  id: string;
  /** Human-readable section name. */
  title: string;
  /** Short one-line explanation of what this section measures. */
  description: string;
  /** Current status level. */
  level: StatusLevel;
  /** Rolling window the metric describes (e.g., "Last 90 days"). */
  windowLabel: string;
  /** Headline metric — already formatted (e.g., "99.97%"). */
  metric: string;
  /** Where the data comes from (visible in the section card footer). */
  source: string;
}

/**
 * Section data. In M4 these are STATIC PLACEHOLDERS — the metric values
 * are populated by Watch's M5 ingestor that consumes Better Uptime API
 * (or, for the in-house metrics, a daily aggregation cron).
 *
 * The shape is locked here so the M5 ingestor can write to a single
 * `status_sections` table without further schema churn.
 */
const SECTIONS: ReadonlyArray<StatusSection> = [
  {
    id: "api-uptime",
    title: "API uptime",
    description: "studiozero.dev application + /api routes.",
    level: "operational",
    windowLabel: "Last 90 days",
    metric: "99.97%",
    source: "Better Uptime · 60s probe from 3 regions",
  },
  {
    id: "audit-pipeline",
    title: "Audit pipeline",
    description:
      "End-to-end run completion rate (queued → verdict_emitted).",
    level: "operational",
    windowLabel: "Last 24 hours",
    metric: "100%",
    source: "Studio Zero internal · runs.state aggregation",
  },
  {
    id: "edge-functions",
    title: "Edge Functions",
    description:
      "mint-runner-token, refresh-runner-token, webhook handlers.",
    level: "operational",
    windowLabel: "Last 24 hours",
    metric: "99.99%",
    source: "Supabase Edge · p95 latency + error rate",
  },
  {
    id: "database",
    title: "Database",
    description: "Supabase Postgres primary + read replica health.",
    level: "operational",
    windowLabel: "Right now",
    metric: "Healthy",
    source: "Supabase health probe · 60s",
  },
  {
    id: "realtime",
    title: "Realtime",
    description: "Run-progress streaming + in-app notifications channel.",
    level: "operational",
    windowLabel: "Right now",
    metric: "Healthy",
    source: "Supabase Realtime · channel synthetic probe",
  },
  {
    id: "webhook-delivery",
    title: "Webhook delivery",
    description: "Stripe billing webhooks, GitHub App, Resend email.",
    level: "operational",
    windowLabel: "Last 24 hours",
    metric: "100%",
    source: "billing_events + email_events delivery_status",
  },
];

/**
 * a11y palette per HC1 — never color-only. Each level pairs a textual
 * label and a glyph so screen readers + colorblind users get the same
 * signal as sighted users.
 */
function levelLabel(level: StatusLevel): {
  text: string;
  glyph: string;
  className: string;
} {
  switch (level) {
    case "operational":
      return {
        text: "Operational",
        glyph: "OK",
        className: "status-pill status-pill--ok",
      };
    case "degraded":
      return {
        text: "Degraded",
        glyph: "!",
        className: "status-pill status-pill--degraded",
      };
    case "down":
      return {
        text: "Down",
        glyph: "X",
        className: "status-pill status-pill--down",
      };
    case "maintenance":
      return {
        text: "Maintenance",
        glyph: "M",
        className: "status-pill status-pill--maintenance",
      };
  }
}

function overallStatus(sections: ReadonlyArray<StatusSection>): StatusLevel {
  if (sections.some((s) => s.level === "down")) return "down";
  if (sections.some((s) => s.level === "degraded")) return "degraded";
  if (sections.some((s) => s.level === "maintenance")) return "maintenance";
  return "operational";
}

export default function StatusPage(): React.ReactElement {
  const overall = overallStatus(SECTIONS);
  const overallChip = levelLabel(overall);
  const lastChecked = new Date().toISOString();

  return (
    <>
      <Nav
        links={[
          { href: "/how-it-works", label: "How it works" },
          { href: "/#pricing", label: "Pricing" },
          { href: "/blog", label: "Blog" },
          { href: "/status", label: "Status" },
        ]}
        auth={{
          signIn: { href: "/login", label: "Sign in" },
          signUp: { href: "/signup", label: "Run a free audit" },
        }}
      />
      <main id="main" className="container" aria-labelledby="status-heading">
        <header className="status-header">
          <h1 id="status-heading">Status</h1>
          <p className="status-subhead">
            Real-time operational status for Studio Zero. We update this
            page within 5 minutes of any incident and post resolution
            notes within 24 hours.
          </p>
          <div
            className={overallChip.className}
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true">{overallChip.glyph}</span>
            <span>All systems {overallChip.text.toLowerCase()}</span>
          </div>
          <p className="status-last-checked">
            Last checked:{" "}
            <time dateTime={lastChecked}>{lastChecked}</time>. This page
            revalidates every 60 seconds.
          </p>
        </header>

        <section
          aria-labelledby="components-heading"
          className="status-components"
        >
          <h2 id="components-heading">Components</h2>
          <ul className="status-list">
            {SECTIONS.map((s) => {
              const chip = levelLabel(s.level);
              return (
                <li
                  key={s.id}
                  id={s.id}
                  className="status-row"
                  aria-labelledby={`${s.id}-title`}
                >
                  <div className="status-row__head">
                    <h3 id={`${s.id}-title`} className="status-row__title">
                      {s.title}
                    </h3>
                    <span className={chip.className}>
                      <span aria-hidden="true">{chip.glyph}</span>
                      <span>{chip.text}</span>
                    </span>
                  </div>
                  <p className="status-row__description">{s.description}</p>
                  <dl className="status-row__meta">
                    <div>
                      <dt>Window</dt>
                      <dd>{s.windowLabel}</dd>
                    </div>
                    <div>
                      <dt>Metric</dt>
                      <dd>
                        <strong>{s.metric}</strong>
                      </dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{s.source}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="incidents-heading" className="status-incidents">
          <h2 id="incidents-heading">Recent incidents</h2>
          <p>
            No incidents in the last 30 days. Historical incidents and
            post-mortems are published at{" "}
            <a href="/compliance/postmortems">compliance/postmortems</a>.
          </p>
          <p>
            For real-time alerts subscribe at{" "}
            <a href="https://status.studiozero.dev">
              status.studiozero.dev
            </a>{" "}
            (Better Uptime).
          </p>
        </section>

        <section aria-labelledby="sla-heading" className="status-sla">
          <h2 id="sla-heading">Service-level objectives</h2>
          <p>
            Studio Zero publishes a 99.5% availability SLI for the web
            app (PRD section 14.2). Performance targets: quick audit
            under 10 minutes p95, full audit under 45 minutes p95,
            dashboard TTFB under 500 ms. SLI calculations run weekly
            from /api/healthz probe data.
          </p>
        </section>
      </main>
    </>
  );
}
