"use client";

/**
 * /app/builds — Build mode list.
 *
 * Phase 9 V2 Batch 1 (Forge). Lists the tenant's Build runs scoped via
 * RLS. Each row links to /app/builds/[buildId] for live status or to
 * /app/builds/[buildId]/output for the final deliverables. New users
 * see an empty state with a CTA to /app/builds/new.
 */
import * as React from "react";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { EmptyState } from "../../../components/EmptyState";

interface BuildListItem {
  id: string;
  projectName: string;
  state: string;
  verdict: "FAIL" | "PASS_WITH_FIXES" | "PASS" | null;
  createdAt: string;
  outputPreference: string;
}

export default function BuildsListPage(): React.ReactElement {
  const [builds, setBuilds] = React.useState<BuildListItem[] | null>(null);
  const [mock, setMock] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    void (async (): Promise<void> => {
      try {
        const res = await fetch("/api/builds", { cache: "no-store" });
        if (!res.ok) {
          if (alive) setBuilds([]);
          return;
        }
        const body = (await res.json()) as {
          builds: BuildListItem[];
          mock: boolean;
        };
        if (alive) {
          setBuilds(body.builds);
          setMock(body.mock);
        }
      } catch {
        if (alive) setBuilds([]);
      }
    })();
    return (): void => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        BUILD MODE · V2
      </Chip>
      <h1 id="page-h1">Builds</h1>
      <p className="body-lg">
        Idea → brief → roadmap + docs + repo. Studio Zero runs the same
        14-layer team that built itself.
      </p>

      <div className="sz-actions-row">
        <Button variant="primary" size="md" href="/app/builds/new" arrow>
          Start a new build
        </Button>
      </div>

      {mock ? (
        <p className="sz-demo-banner">
          <strong>Demo mode.</strong> Builds shown here are fixtures.
        </p>
      ) : null}

      {builds === null ? (
        <p>Loading…</p>
      ) : builds.length === 0 ? (
        <EmptyState
          heading="No builds yet"
          body="Describe your idea — Studio Zero produces a roadmap, docs, and a seeded GitHub repo."
          primaryCta={
            <Button variant="primary" size="md" href="/app/builds/new" arrow>
              Start your first build
            </Button>
          }
        />
      ) : (
        <ul className="sz-build-list">
          {builds.map((b) => (
            <li key={b.id}>
              <Card>
                <h3>
                  <a href={`/app/builds/${b.id}`}>{b.projectName}</a>
                </h3>
                <p className="sz-meta">
                  Started {new Date(b.createdAt).toLocaleString()} · state{" "}
                  {b.state}
                  {b.verdict ? ` · verdict ${b.verdict}` : ""}
                </p>
                <p className="sz-meta">Output: {b.outputPreference}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
