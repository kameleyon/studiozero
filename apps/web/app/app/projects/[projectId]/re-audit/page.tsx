"use client";

/**
 * /app/projects/[projectId]/re-audit — IA-D3 re-audit redemption.
 *
 * Free-tier unlimited Surface re-audits on the project (D2). The button
 * POSTs to /api/runs and redirects to the new run page.
 *
 * M1+1 wires real per-tenant rate-limit enforcement (>50 runs/24h
 * triggers cooldown per signup-to-first-verdict.md EC-7).
 */
import { useRouter } from "next/navigation";
import * as React from "react";
import { use } from "react";

import { Button } from "../../../../../components/Button";
import { Chip } from "../../../../../components/Chip";

export default function ReAuditPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): React.ReactElement {
  const router = useRouter();
  const { projectId } = use(params);
  const [starting, setStarting] = React.useState<boolean>(false);

  const handleStart = async (): Promise<void> => {
    setStarting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeMethod: "url", depth: "quick", mode: "byok" }),
      });
      const data = (await res.json()) as { ok: boolean; redirectTo?: string };
      if (data.ok && data.redirectTo) router.push(data.redirectTo);
      else setStarting(false);
    } catch {
      setStarting(false);
    }
  };

  return (
    <>
      <p className="sz-demo-banner">
        <strong>Demo re-audit.</strong> Mock pipeline; no real network calls.
      </p>
      <Chip variant="mono-meta" tone="neutral">
        RE-AUDIT · PROJECT {projectId.toUpperCase()}
      </Chip>
      <h1 id="page-h1">Re-audit free for 30 days.</h1>
      <p className="body-lg">
        Free Surface re-audits are unlimited on this project. Run as many
        as you need while you ship the fixes.
      </p>

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href="/app">
          Back to dashboard
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handleStart}
          loading={starting}
          arrow
        >
          {starting ? "Starting" : "Re-audit now"}
        </Button>
      </div>
    </>
  );
}
