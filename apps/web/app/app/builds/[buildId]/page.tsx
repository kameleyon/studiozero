"use client";

/**
 * /app/builds/[buildId] — live build dashboard.
 *
 * Phase 9 V2 Batch 1 (Forge). Subscribes to `build:<buildId>` channel
 * via Supabase Realtime + polls /api/builds/[buildId] as fallback for
 * mock mode. Renders:
 *   - layer-status grid (strategy, design, data, …)
 *   - brief preview + Confirm button (when brief is awaiting confirmation)
 *   - estimated time to completion
 *   - Cancel button (with refund warning)
 *   - on delivery: roadmap + docs + repo link
 *
 * Cross-refs: PRD §7.3 step 4 + milestone-V2.md exit gate "Live build
 * dashboard reconstructible solely from emitted phase_started /
 * phase_finished events".
 */
import * as React from "react";
import { use } from "react";

import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";

type LayerName =
  | "strategy"
  | "design"
  | "data"
  | "security"
  | "growth"
  | "frontend"
  | "backend"
  | "ops";

interface LayerRow {
  layer: LayerName;
  agent: string;
  status: "queued" | "running" | "complete" | "failed" | "skipped";
  score: number | null;
  message?: string;
}

interface BriefPreview {
  project_name: string;
  jtbd: string;
  risk_profile: "regulated" | "consumer" | "internal";
  team_roster: string[];
  success_criteria: string[];
}

interface BuildSnapshot {
  buildId: string;
  state:
    | "queued"
    | "brief_generating"
    | "brief_awaiting_confirmation"
    | "dispatching"
    | "layers_running"
    | "bundle_assembling"
    | "audit_gate_running"
    | "delivering"
    | "delivered"
    | "audit_failed"
    | "cancelled"
    | "failed";
  projectName: string;
  outputPreference: string;
  brief: BriefPreview | null;
  layers: LayerRow[];
  etaSeconds: number | null;
  startedAt: string;
  verdict: "PASS" | "PASS WITH FIXES" | "FAIL" | null;
  score: number | null;
  repoUrl: string | null;
  outputUrl: string | null;
  mock: boolean;
}

const LAYER_ORDER: LayerName[] = [
  "strategy",
  "design",
  "data",
  "security",
  "growth",
  "frontend",
  "backend",
  "ops",
];

function statusLabel(s: BuildSnapshot["state"]): string {
  switch (s) {
    case "queued":
      return "Queued — waiting for a worker.";
    case "brief_generating":
      return "BigBrain is writing your brief…";
    case "brief_awaiting_confirmation":
      return "Brief ready — confirm to dispatch the team.";
    case "dispatching":
      return "Dispatching layer leads…";
    case "layers_running":
      return "Team running in parallel.";
    case "bundle_assembling":
      return "Assembling the roadmap bundle…";
    case "audit_gate_running":
      return "Jury is auditing the deliverables.";
    case "delivering":
      return "Seeding repo + finalizing delivery…";
    case "delivered":
      return "Build delivered.";
    case "audit_failed":
      return "Audit gate FAILED — revision required before delivery.";
    case "cancelled":
      return "Build cancelled.";
    case "failed":
      return "Build failed.";
  }
}

export default function BuildPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}): React.ReactElement {
  const { buildId } = use(params);
  const [snap, setSnap] = React.useState<BuildSnapshot | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function fetchSnap(): Promise<void> {
      try {
        const res = await fetch(`/api/builds/${buildId}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { build: BuildSnapshot };
        if (alive) setSnap(body.build);
      } catch {
        /* swallow */
      }
    }

    void fetchSnap();
    intervalId = setInterval(() => {
      void fetchSnap();
    }, 2000);

    return (): void => {
      alive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [buildId]);

  async function confirmBrief(): Promise<void> {
    setConfirming(true);
    try {
      const res = await fetch(`/api/builds/${buildId}/confirm-brief`, {
        method: "POST",
      });
      if (res.ok) {
        // re-fetch immediately
        const r = await fetch(`/api/builds/${buildId}`, { cache: "no-store" });
        const body = (await r.json()) as { build: BuildSnapshot };
        setSnap(body.build);
      }
    } finally {
      setConfirming(false);
    }
  }

  async function cancelBuild(): Promise<void> {
    if (
      typeof window === "undefined" ||
      !window.confirm(
        "Cancel this build? You'll receive a pro-rata refund based on how many layers ran. This cannot be undone.",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      await fetch(`/api/builds/${buildId}/cancel`, { method: "POST" });
      const r = await fetch(`/api/builds/${buildId}`, { cache: "no-store" });
      const body = (await r.json()) as { build: BuildSnapshot };
      setSnap(body.build);
    } finally {
      setCancelling(false);
    }
  }

  if (!snap) {
    return (
      <>
        <Chip variant="mono-meta" tone="neutral">
          BUILD · {buildId.toUpperCase()}
        </Chip>
        <h1 id="page-h1">Build starting…</h1>
        <p>Connecting to the build channel.</p>
      </>
    );
  }

  const terminal =
    snap.state === "delivered" ||
    snap.state === "audit_failed" ||
    snap.state === "cancelled" ||
    snap.state === "failed";

  return (
    <>
      {snap.mock ? (
        <p className="sz-demo-banner">
          <strong>Demo mode.</strong> Mock build advances over a short
          timeline. Real builds take 45 min to 4 hours depending on output
          preference.
        </p>
      ) : null}

      <Chip variant="mono-meta" tone="neutral">
        BUILD · {snap.projectName} · STATE: {snap.state.toUpperCase()}
      </Chip>
      <h1 id="page-h1">{statusLabel(snap.state)}</h1>

      {snap.etaSeconds && !terminal ? (
        <p className="body-lg">
          ETA: ~{Math.round(snap.etaSeconds / 60)} min remaining.
        </p>
      ) : null}

      {snap.brief && snap.state === "brief_awaiting_confirmation" ? (
        <Card>
          <h2>Brief preview</h2>
          <p>
            <strong>Project:</strong> {snap.brief.project_name}
          </p>
          <p>
            <strong>JTBD:</strong> {snap.brief.jtbd}
          </p>
          <p>
            <strong>Risk profile:</strong> {snap.brief.risk_profile}
          </p>
          <p>
            <strong>Team roster:</strong> {snap.brief.team_roster.join(", ")}
          </p>
          <div>
            <strong>Success criteria:</strong>
            <ul>
              {snap.brief.success_criteria.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="sz-intake-actions">
            <Button
              variant="primary"
              size="md"
              onClick={confirmBrief}
              loading={confirming}
            >
              Confirm brief — dispatch team
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={cancelBuild}
              disabled={cancelling}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <h2>Layers</h2>
      <ul className="sz-layer-grid">
        {LAYER_ORDER.map((layerName) => {
          const row =
            snap.layers.find((l) => l.layer === layerName) ??
            ({
              layer: layerName,
              agent: "—",
              status: "queued",
              score: null,
            } satisfies LayerRow);
          return (
            <li key={layerName} data-status={row.status} className="sz-layer-row">
              <span className="sz-layer-row__name">{row.layer}</span>
              <span className="sz-layer-row__agent">{row.agent}</span>
              <span className="sz-layer-row__status">{row.status}</span>
              <span className="sz-layer-row__score">
                {row.score === null ? "—" : `${row.score}/100`}
              </span>
            </li>
          );
        })}
      </ul>

      {snap.state === "delivered" ? (
        <Card>
          <h2>Delivery</h2>
          <p>
            Verdict <strong>{snap.verdict}</strong> · score{" "}
            <strong>{snap.score}/100</strong>.
          </p>
          {snap.repoUrl ? (
            <p>
              GitHub repo: <a href={snap.repoUrl}>{snap.repoUrl}</a>
            </p>
          ) : null}
          <div className="sz-intake-actions">
            <Button
              variant="primary"
              size="md"
              href={`/app/builds/${buildId}/output`}
              arrow
            >
              View deliverables
            </Button>
          </div>
        </Card>
      ) : null}

      {snap.state === "audit_failed" ? (
        <Card>
          <h2>Audit gate FAILED</h2>
          <p>
            Jury would not let this ship. Studio Zero will revise and re-run
            the gate at no extra cost — or you can request a refund.
          </p>
          <div className="sz-intake-actions">
            <Button variant="primary" size="md" href={`/app/builds/${buildId}/output`}>
              Review findings
            </Button>
            <Button variant="ghost" size="md" onClick={cancelBuild}>
              Cancel + refund
            </Button>
          </div>
        </Card>
      ) : null}

      {!terminal &&
      snap.state !== "brief_awaiting_confirmation" ? (
        <div className="sz-intake-actions">
          <Button
            variant="ghost"
            size="md"
            onClick={cancelBuild}
            disabled={cancelling}
          >
            Cancel build (pro-rata refund)
          </Button>
        </div>
      ) : null}
    </>
  );
}
