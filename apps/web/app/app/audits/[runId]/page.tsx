"use client";

/**
 * /app/audits/[runId] — Trace flow S8 + S9.
 *
 * Phase 9 M1 Batch 2 (Vega) — swaps the M1 starter's 500ms polling loop
 * for `useRunRealtime(runId)` which subscribes to Supabase Realtime
 * `runs:<runId>` (postgres_changes on runs + findings). The hook falls
 * back to polling the mock /api/runs route when env vars are absent —
 * so the audit page renders with one shape regardless of mode.
 *
 * Cleanup contract: the hook tears down its subscription / interval on
 * component unmount and on `runId` change (see `lib/run-realtime.ts`).
 *
 * Renders one of:
 *   - in-progress view (Trace S8): LiveProgressRegion + reviewer rows
 *   - terminal view (Trace S9):    VerdictCard + ScoreDisplay + Findings
 */
import * as React from "react";
import { use } from "react";

import { Button } from "../../../../components/Button";
import { Chip } from "../../../../components/Chip";
import { FindingsRow } from "../../../../components/FindingsRow";
import { LiveProgressRegion } from "../../../../components/LiveProgressRegion";
import { ScoreDisplay } from "../../../../components/ScoreDisplay";
import { VerdictCard } from "../../../../components/VerdictCard";
import { useRunRealtime, type RunSnapshot } from "../../../../lib/run-realtime";

import type { MockFinding } from "../../../../lib/mock-data";
import type {
  ReviewerProgress,
  RunState,
} from "../../../../lib/types";

function stateLabel(s: RunState): string {
  switch (s) {
    case "created":
    case "queued":
      return "Run queued — waiting for a worker.";
    case "dispatched":
      return "Run starting…";
    case "reviewers_running":
      return "Reviewers are working.";
    case "all_reviewers_complete":
      return "All reviewers done. Jury synthesizing your verdict.";
    case "jury_synthesizing":
      return "Jury is composing your verdict — this takes about 10 seconds.";
    case "verdict_emitted":
      return "Audit complete.";
    case "archived":
      return "Audit complete (archived).";
    case "cancelled":
      return "Audit cancelled.";
    case "partial_completed":
      return "Audit ended with partial results.";
    case "failed_terminal":
      return "Audit failed.";
    default:
      return s;
  }
}

function phaseLabel(phase: ReviewerProgress["phase"]): string {
  switch (phase) {
    case "reading_repo":
      return "Reading repo";
    case "running_heuristics":
      return "Running heuristics";
    case "synthesizing":
      return "Synthesizing";
    case "done":
      return "Complete";
    case "idle":
      return "Queued";
  }
}

export default function AuditRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}): React.ReactElement {
  const { runId } = use(params);
  const snap = useRunRealtime(runId);

  if (!snap) {
    return (
      <>
        <Chip variant="mono-meta" tone="neutral">
          RUN · {runId.toUpperCase()}
        </Chip>
        <h1 id="page-h1">Run starting…</h1>
        <p>Connecting to the run channel.</p>
      </>
    );
  }

  // Terminal — verdict emitted.
  if (
    (snap.state === "verdict_emitted" || snap.state === "archived") &&
    snap.verdict
  ) {
    return <VerdictScreen runId={runId} snap={snap} />;
  }

  // In-progress.
  return (
    <>
      {snap.mock ? (
        <p className="sz-demo-banner">
          <strong>Demo mode.</strong> Mock run advances over ~10 seconds. Real
          audits take 10–15 min (Quick) or 20–45 min (Comprehensive).
        </p>
      ) : null}
      <Chip variant="mono-meta" tone="neutral">
        RUN · {runId.toUpperCase()} · STATE: {snap.state.toUpperCase()}
      </Chip>
      <h1 id="page-h1">{stateLabel(snap.state)}</h1>
      <p className="body-lg">
        Progress: {Math.round(snap.progress * 100)}% · Elapsed:{" "}
        {Math.round(snap.elapsedMs / 1000)}s
      </p>

      <div className="sz-progress-bar" aria-hidden="true">
        <div
          className="sz-progress-bar__fill"
          style={{ width: `${Math.round(snap.progress * 100)}%` }}
        />
      </div>

      <h2>Reviewers</h2>
      <LiveProgressRegion
        latestAnnouncement={(() => {
          const running = snap.reviewers.find(
            (r) => r.status === "running",
          );
          if (running) {
            return `${running.reviewer} is ${phaseLabel(running.phase).toLowerCase()}.`;
          }
          return stateLabel(snap.state);
        })()}
      >
        {snap.reviewers.map((r) => (
          <div
            key={r.reviewer}
            className="sz-progress-row"
            data-status={r.status}
          >
            <span className="sz-progress-row__name">{r.reviewer}</span>
            <span className="sz-progress-row__phase">{phaseLabel(r.phase)}</span>
            <span className="sz-progress-row__count">
              {r.partialFindings} finding{r.partialFindings === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </LiveProgressRegion>

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href="/app">
          Back to dashboard
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm(
                "Cancel this run? Findings so far will be preserved.",
              )
            ) {
              window.location.href = "/app";
            }
          }}
        >
          Cancel run
        </Button>
      </div>
    </>
  );
}

function VerdictScreen({
  runId,
  snap,
}: {
  runId: string;
  snap: RunSnapshot;
}): React.ReactElement {
  const verdict = snap.verdict;
  if (!verdict) {
    return <p>Verdict not available.</p>;
  }
  const isFail = verdict.verdict === "FAIL";
  const totalFindings = verdict.findings.length;

  const groups = verdict.findings.reduce<Record<string, MockFinding[]>>(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      const arr = acc[f.category];
      if (arr) arr.push(f);
      return acc;
    },
    {},
  );

  const sevCounts = verdict.findings.reduce<Record<string, number>>(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const bodyParagraphs = isFail
    ? [
        `We found ${totalFindings} issues across UX, accessibility, and brand consistency. Here's every one, with the evidence.`,
        "Most first audits do not pass our gate — that's the design. Every finding below names a file, a line, and a fix.",
      ]
    : [
        `We found ${totalFindings} issues across UX, accessibility, and brand consistency. Here's every one, with the evidence.`,
        "Pass with fixes — you're inside the gate. The fixes below will move you to a clean pass on the next re-audit.",
      ];

  return (
    <>
      {snap.mock ? (
        <p className="sz-demo-banner">
          <strong>Demo verdict.</strong> Findings are mock fixtures with paths
          like <code>src/Mock*</code>.
        </p>
      ) : null}
      <VerdictCard
        verdict={verdict.verdict}
        score={verdict.score.total}
        bodyParagraphs={bodyParagraphs}
        primaryCta={
          isFail ? (
            <Button
              variant="primary"
              size="lg"
              href={`/app/audits/${runId}/upgrade`}
              arrow
            >
              Run the Code audit
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              href={`/app/projects/demo-project-2/re-audit`}
              arrow
            >
              Re-audit free for 30 days
            </Button>
          )
        }
        secondaryCta={
          <Button
            variant="ghost"
            size="md"
            href={`/app/audits/${runId}/export`}
          >
            Export report
          </Button>
        }
        freeTierChip={
          isFail ? (
            <Chip variant="free-tier" tone="neutral">
              FREE · UNLIMITED RE-AUDITS ON THIS PROJECT
            </Chip>
          ) : null
        }
      />

      <section aria-labelledby="score-h2">
        <h2 id="score-h2">Score breakdown</h2>
        <ScoreDisplay
          variant="radar-with-table"
          total={verdict.score.total}
          categories={verdict.score.categories}
        />
      </section>

      <section
        aria-labelledby="findings-h2"
        className="sz-findings-section"
      >
        <h2 id="findings-h2">Findings</h2>
        <p className="findings-intro">
          {totalFindings} findings, grouped by category. Expand any row for
          the evidence and the recommended fix.
        </p>
        <p className="severity-counts">
          Blockers ({sevCounts.blocker ?? 0}) · Critical ({sevCounts.critical ?? 0}) ·
          Major ({sevCounts.major ?? 0}) · Minor ({sevCounts.minor ?? 0}) ·
          Polish ({sevCounts.polish ?? 0})
        </p>

        {Object.entries(groups).map(([categoryKey, items]) => (
          <div key={categoryKey} className="sz-findings-group">
            <h3 className="sz-findings-group-heading">
              {categoryKey}{" "}
              <span className="sz-mono-meta">({items.length})</span>
            </h3>
            {items.map((f) => (
              <FindingsRow
                key={f.id}
                findingId={f.id}
                severity={f.severity}
                reviewer={f.reviewer}
                category={f.category}
                title={f.title}
                whatWeFound={f.whatWeFound}
                whyItMatters={f.whyItMatters}
                fix={f.fix}
                filePath={f.filePath}
                lineRange={f.lineRange}
              />
            ))}
          </div>
        ))}
      </section>
    </>
  );
}
