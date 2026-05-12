import * as React from "react";

import { Button } from "../../../../../components/Button";
import { Card } from "../../../../../components/Card";
import { Chip } from "../../../../../components/Chip";

export const metadata = { title: "GitHub App · Settings" };

export default function GithubSettingsPage(): React.ReactElement {
  return (
    <>
      <p className="sz-demo-banner">
        <strong>Demo mode.</strong> Real GitHub App install lands at M1+1.
      </p>
      <Chip variant="mono-meta" tone="neutral">INTEGRATIONS · GITHUB</Chip>
      <h1 id="page-h1">GitHub App</h1>
      <p className="body-lg">
        Per-repo permissions only. Studio Zero never requests account-wide
        scopes. Add or remove repos any time.
      </p>

      <Card
        variant="default"
        heading="demo-org/demo-repo-fail"
        body="Read-only · contents:read, metadata:read. Last clone 11 minutes ago (mock)."
        mono="INSTALLATION ID · 99999 · DEMO"
      />

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href="/app/settings">
          Back to settings
        </Button>
        <Button variant="primary" size="lg" href="/app/onboarding/github" arrow>
          Manage repositories
        </Button>
      </div>
    </>
  );
}
