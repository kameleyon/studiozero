"use client";

/**
 * /app/onboarding/github — GitHub App install stub (Trace flow S5a → S6).
 *
 * The mock skips the real GitHub App OAuth dance. A "Install" button
 * advances to /app/projects/new. Real M1+1 wiring:
 *   · Forge: mint installation token via Octokit
 *   · GitHub App: per-repo permissions only (D1)
 *   · Shallow clone `--depth=1` into runner sandbox
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";

const MOCK_REPOS = [
  { id: "demo-org/demo-repo-fail", name: "demo-repo-fail", description: "Synthetic repo that produces a FAIL verdict." },
  { id: "demo-org/demo-repo-pwf", name: "demo-repo-pwf", description: "Synthetic repo that produces PASS WITH FIXES." },
  { id: "demo-org/demo-repo-pass", name: "demo-repo-pass", description: "Synthetic repo that produces PASS (M1+1)." },
];

export default function GithubInstallPage(): React.ReactElement {
  const router = useRouter();
  const [installed, setInstalled] = React.useState<boolean>(false);
  const [picked, setPicked] = React.useState<string | null>(null);

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        STEP 03 · GITHUB
      </Chip>
      <h1 id="page-h1">Install Studio Zero on GitHub.</h1>
      <p className="body-lg">
        Our GitHub App reads one repo at a time, read-only. Per-repo
        permissions — never account-wide.
      </p>

      {!installed ? (
        <>
          <Card
            variant="default"
            heading="Studio Zero · GitHub App"
            body="Read-only access to one repository. Required scopes: contents:read, metadata:read. No write, no webhook beyond run-trigger."
            mono="DEMO MOCK · NO REAL OAUTH"
          />
          <div className="sz-intake-actions">
            <Button variant="ghost" size="md" href="/app/onboarding/byok">
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setInstalled(true)}
              arrow
            >
              Install Studio Zero on GitHub
            </Button>
          </div>
        </>
      ) : (
        <>
          <Chip variant="mono-meta" tone="emphasis">
            INSTALLED · DEMO
          </Chip>
          <h2>Pick a repo to audit.</h2>
          <div className="sz-mode-grid">
            {MOCK_REPOS.map((r) => (
              <Card
                key={r.id}
                variant="default"
                heading={r.name}
                body={r.description}
                mono={`REPO ID · ${r.id}`}
                interactive
                onClick={() => setPicked(r.id)}
                className={picked === r.id ? "sz-card--checked" : undefined}
              />
            ))}
          </div>
          <div className="sz-intake-actions">
            <Button variant="ghost" size="md" onClick={() => setInstalled(false)}>
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/app/projects/new")}
              disabled={!picked}
              arrow
            >
              Continue to intake
            </Button>
          </div>
        </>
      )}
    </>
  );
}
