"use client";

/**
 * /app/builds/[buildId]/scaffold — V2.1 scaffold live-progress view.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Renders the scaffold generation pipeline's
 * live state: stack detected → code-gen → compose → audit-gate → zip.
 *
 * State machine (mirror of apps/runner/src/build/scaffold-v2-1/index.ts):
 *
 *   pending            — pipeline queued, not yet started
 *   stack_detect       — stack-detector.ts running
 *   code_gen           — code-generator.ts running
 *   compose_scaffold   — scaffolder running
 *   audit_gate         — Jury full audit running
 *   delivered          — verdict PASS or PASS WITH FIXES; zip ready
 *   failed             — verdict FAIL; refund signaled
 *
 * The Download button is only enabled when `state==='delivered'`. The
 * audit panel shows the verdict + findings checklist; on FAIL the page
 * shows the rejection_reason + a "Request refund" CTA.
 */
import * as React from "react";
import { use } from "react";

interface ScaffoldStatus {
  build_id: string;
  state:
    | "pending"
    | "stack_detect"
    | "code_gen"
    | "compose_scaffold"
    | "audit_gate"
    | "delivered"
    | "failed";
  stack: "nextjs-saas" | "nodejs-worker" | "cli-tool" | null;
  audit: {
    verdict: "PASS" | "PASS WITH FIXES" | "FAIL" | null;
    score: number | null;
    findings_count: number;
    rejection_reason: string | null;
  };
  download_url: string | null;
}

const PHASES: Array<{ key: ScaffoldStatus["state"]; label: string }> = [
  { key: "pending", label: "Queued" },
  { key: "stack_detect", label: "Detecting stack" },
  { key: "code_gen", label: "Generating code" },
  { key: "compose_scaffold", label: "Composing scaffold" },
  { key: "audit_gate", label: "Audit gate (Jury)" },
  { key: "delivered", label: "Delivered" },
];

export default function ScaffoldProgressPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}): React.ReactElement {
  const { buildId } = use(params);
  const [status, setStatus] = React.useState<ScaffoldStatus | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/builds/${buildId}/scaffold/generate`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) {
          setErr("Scaffold status unavailable.");
          return;
        }
        const body = (await res.json()) as { status?: ScaffoldStatus };
        if (alive && body.status) setStatus(body.status);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Fetch failed.");
      }
    };
    void poll();
    const t = setInterval(poll, 2000);
    return (): void => {
      alive = false;
      clearInterval(t);
    };
  }, [buildId]);

  const phaseIndex = React.useMemo(() => {
    if (!status) return 0;
    return Math.max(0, PHASES.findIndex((p) => p.key === status.state));
  }, [status]);

  if (err && !status) {
    return (
      <main>
        <h1 id="page-h1">Scaffold status unavailable</h1>
        <p>{err}</p>
      </main>
    );
  }

  if (!status) {
    return (
      <main>
        <h1 id="page-h1">Loading scaffold pipeline...</h1>
      </main>
    );
  }

  return (
    <main>
      <h1 id="page-h1">Scaffold generation - {buildId}</h1>

      <ol className="sz-phase-list" aria-label="Pipeline phases">
        {PHASES.map((p, i) => (
          <li
            key={p.key}
            aria-current={status.state === p.key ? "step" : undefined}
            data-state={i < phaseIndex ? "done" : i === phaseIndex ? "active" : "pending"}
          >
            {p.label}
          </li>
        ))}
      </ol>

      {status.stack ? (
        <p>
          Stack detected: <strong>{status.stack}</strong>
        </p>
      ) : null}

      {status.audit.verdict ? (
        <section aria-labelledby="audit-h2">
          <h2 id="audit-h2">Audit gate</h2>
          <p>
            Verdict: <strong>{status.audit.verdict}</strong> -{" "}
            score <strong>{status.audit.score ?? "-"}/100</strong>
          </p>
          {status.audit.verdict === "FAIL" ? (
            <>
              <p>{status.audit.rejection_reason}</p>
              <p>
                Studio Zero halts delivery when the audit gate fails. Your
                upcharge will be refunded. You can request a re-generation at
                no extra cost.
              </p>
            </>
          ) : null}
          {status.audit.findings_count > 0 ? (
            <p>
              {status.audit.findings_count} finding(s) accompany this scaffold;
              a checklist is bundled in the download.
            </p>
          ) : null}
        </section>
      ) : null}

      {status.state === "delivered" && status.download_url ? (
        <p>
          <a
            href={status.download_url}
            className="sz-button sz-button--primary"
            download
          >
            Download scaffold zip
          </a>
        </p>
      ) : null}

      <p className="sz-fineprint">
        AI-generated by Studio Zero (EU AI Act Art. 50). The Jury audit panel
        ran on this scaffold before delivery. See{" "}
        <a href="/ai-system-card">AI System Card</a>.
      </p>
    </main>
  );
}
