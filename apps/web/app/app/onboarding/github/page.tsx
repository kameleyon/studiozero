"use client";

/**
 * /app/onboarding/github — GitHub App install (Trace flow S5a → S6).
 *
 * Phase 9 M1 Batch 2 (Vega) — replaces the mock "Install" button with a
 * real link to `https://github.com/apps/<APP_SLUG>/installations/new`
 * carrying a CSRF `state` token + `redirect_uri` pointing at the
 * post-install callback at `/auth/install/github`.
 *
 * Mock fallback (env vars missing OR `NEXT_PUBLIC_USE_AUTH_MOCK=true`):
 *  - The button advances to the in-page "pick a demo repo" screen.
 *
 * State (CSRF) handling:
 *  - We mint a 128-bit random token, persist to sessionStorage, and
 *    pass it on `state=`. The callback route compares the returned
 *    `state` against sessionStorage before writing `github_installation_id`
 *    to `tenant_members`. Mismatch → 400.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";
import { getGithubAppSlug, isMockMode } from "../../../../lib/env";

const STATE_STORAGE_KEY = "sz-github-install-state";

const MOCK_REPOS = [
  {
    id: "demo-org/demo-repo-fail",
    name: "demo-repo-fail",
    description: "Synthetic repo that produces a FAIL verdict.",
  },
  {
    id: "demo-org/demo-repo-pwf",
    name: "demo-repo-pwf",
    description: "Synthetic repo that produces PASS WITH FIXES.",
  },
  {
    id: "demo-org/demo-repo-pass",
    name: "demo-repo-pass",
    description: "Synthetic repo that produces PASS (M1+1).",
  },
];

/** Mint a 128-bit hex token using Web Crypto when available. */
function mintCsrfToken(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback (server-render): a stable-ish but obviously-fake token.
  return `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function GithubInstallPage(): React.ReactElement {
  const router = useRouter();
  const [installed, setInstalled] = React.useState<boolean>(false);
  const [picked, setPicked] = React.useState<string | null>(null);

  const mock = isMockMode();
  const slug = getGithubAppSlug();

  // Pre-compute the install URL on the client (sessionStorage needs window).
  const [installUrl, setInstallUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (mock || !slug) return;
    const token = mintCsrfToken();
    try {
      window.sessionStorage.setItem(STATE_STORAGE_KEY, token);
    } catch {
      // sessionStorage may be blocked; the callback handler treats
      // missing local state as a soft warning, not a hard reject.
    }
    const redirect = `${window.location.origin}/auth/install/github`;
    const url = new URL(
      `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`,
    );
    url.searchParams.set("state", token);
    url.searchParams.set("redirect_uri", redirect);
    setInstallUrl(url.toString());
  }, [mock, slug]);

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
            mono={
              mock
                ? "DEMO MOCK · NO REAL OAUTH"
                : slug
                  ? `APP SLUG · ${slug}`
                  : "APP SLUG NOT CONFIGURED"
            }
          />
          <div className="sz-intake-actions">
            <Button variant="ghost" size="md" href="/app/onboarding/byok">
              Back
            </Button>
            {mock ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setInstalled(true)}
                arrow
              >
                Install Studio Zero on GitHub
              </Button>
            ) : installUrl ? (
              <Button
                variant="primary"
                size="lg"
                href={installUrl}
                arrow
              >
                Install Studio Zero on GitHub
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled
                aria-disabled
              >
                {slug ? "Preparing install link…" : "GitHub App not configured"}
              </Button>
            )}
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
            <Button
              variant="ghost"
              size="md"
              onClick={() => setInstalled(false)}
            >
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
