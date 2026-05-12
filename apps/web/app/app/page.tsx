"use client";

/**
 * /app — dashboard (first-run + populated).
 *
 * Phase 9 M1 Batch 2 (Vega) — replaces MOCK_PROJECTS with a fetch to
 * `/api/runs` which routes to real (RLS-scoped) or mock data based on
 * `lib/env.ts isMockMode()`. The shape returned matches what the M1
 * starter rendered so we keep one composition.
 */
import * as React from "react";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Chip } from "../../components/Chip";
import { EmptyState } from "../../components/EmptyState";
import { useSupabaseUser } from "../../lib/auth-context";
import { MOCK_PROJECTS } from "../../lib/mock-data";

interface RunListItem {
  id: string;
  projectId: string;
  projectName: string;
  state: string;
  verdict: "FAIL" | "PASS_WITH_FIXES" | "PASS" | null;
  startedAt: string;
}

export default function DashboardPage(): React.ReactElement {
  const { mock } = useSupabaseUser();
  const [runs, setRuns] = React.useState<RunListItem[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    void (async (): Promise<void> => {
      try {
        const res = await fetch("/api/runs", { cache: "no-store" });
        if (!res.ok) {
          if (alive) setRuns([]);
          return;
        }
        const data = (await res.json()) as { runs: RunListItem[] };
        if (alive) setRuns(data.runs ?? []);
      } catch {
        if (alive) setRuns([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Until the first fetch resolves, show the mock projects so the demo
  // path renders content immediately. Once the real list arrives the
  // mock list is replaced.
  const list = runs ?? [];
  const hasContent = list.length > 0;

  // Compose a "project-like" shape for the grid from the runs list.
  const projects = hasContent
    ? list.map((r) => ({
        id: r.projectId,
        name: r.projectName,
        clientTag: null as string | null,
        intakeMethod: "github" as const,
        intakeRef: r.projectName,
        createdAt: r.startedAt,
        lastRunId: r.id,
        lastVerdict: r.verdict,
      }))
    : mock
      ? MOCK_PROJECTS
      : [];

  const hasProjects = projects.length > 0;

  return (
    <>
      {mock ? (
        <p className="sz-demo-banner">
          <strong>Demo data.</strong> Projects below are fixtures. Start a
          new audit to see the mock run pipeline end-to-end.
        </p>
      ) : null}

      {!hasProjects ? (
        <EmptyState
          eyebrow={
            <Chip variant="mono-meta" tone="neutral">
              STEP 01 · YOU&apos;RE IN
            </Chip>
          }
          heading={<h1 id="page-h1">Run your first audit.</h1>}
          body={
            <p className="body-lg">
              Connect a repo or paste a URL. We&apos;ll run seven reviewer
              agents and hand you a graded checklist with the evidence.
            </p>
          }
          primaryCta={
            <Button variant="primary" size="lg" href="/app/projects/new" arrow>
              Run your free Surface audit
            </Button>
          }
          secondaryCta={
            <Button variant="ghost" size="md" href="/app/settings">
              Settings
            </Button>
          }
        >
          <hr className="sz-divider" />
          <section aria-labelledby="three-ways-h2">
            <h2 id="three-ways-h2">Three ways to start:</h2>
            <div className="sz-mode-grid">
              <Card
                variant="default"
                heading="Connect a GitHub repo"
                body="Install our GitHub App on one repo. The audit reads it read-only and never sees the rest."
                mono="BYOK · Managed"
                href="/app/projects/new?intake=github"
                interactive
              />
              <Card
                variant="default"
                heading="Paste a URL you own"
                body="Free Surface audit on a live page. Email-verification required; we never crawl uninvited."
                mono="Free tier"
                href="/app/projects/new?intake=url"
                interactive
              />
              <Card
                variant="default"
                heading="Run on your machine"
                body="CLI mode — source stays on your laptop. We watermark the verdict as Private Run · Self-Audited."
                mono="CLI"
                href="/app/projects/new?intake=local"
                interactive
              />
            </div>
          </section>
        </EmptyState>
      ) : (
        <>
          <Chip variant="mono-meta" tone="neutral">DASHBOARD</Chip>
          <h1 id="page-h1">Your projects.</h1>
          <p className="body-lg">
            {projects.length} project{projects.length === 1 ? "" : "s"}.
            Click any to see its verdict.
          </p>

          <div
            className="sz-intake-actions"
            style={{
              marginBottom: "var(--sp-24)",
              borderTop: "none",
              paddingTop: 0,
            }}
          >
            <span />
            <Button
              variant="primary"
              size="lg"
              href="/app/projects/new"
              arrow
            >
              New audit
            </Button>
          </div>

          <div className="sz-project-grid">
            {projects.map((p) => (
              <Card
                key={p.id}
                variant="project"
                eyebrow={
                  <span className="sz-mono-meta">
                    {p.intakeMethod.toUpperCase()} · LAST VERDICT:{" "}
                    {p.lastVerdict ?? "—"}
                  </span>
                }
                heading={p.name}
                body={p.intakeRef}
                clientTag={p.clientTag ?? undefined}
                mono={`PROJECT ${p.id.toUpperCase()}`}
                href={
                  p.lastRunId
                    ? `/app/audits/${p.lastRunId}`
                    : "/app/projects/new"
                }
                interactive
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
