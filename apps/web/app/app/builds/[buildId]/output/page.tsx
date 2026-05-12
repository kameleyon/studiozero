"use client";

/**
 * /app/builds/[buildId]/output — final deliverables view.
 *
 * Phase 9 V2 Batch 1 (Forge). Renders the roadmap-bundle.v1 documents
 * (roadmap.md, architecture.md, prd.md, decisions.md, risks.md, …) plus
 * the seeded GitHub repo link if any. Gated by the audit-gate; if FAIL
 * the page shows the findings + refund-or-revise CTAs.
 */
import * as React from "react";
import { use } from "react";

import { Button } from "../../../../../components/Button";
import { Card } from "../../../../../components/Card";
import { Chip } from "../../../../../components/Chip";

interface DocumentMap {
  readme_md: string;
  roadmap_md: string;
  architecture_md: string;
  prd_md: string;
  brand_tokens_json: string;
  voice_md: string;
  decisions_md: string;
  risks_md: string;
  cogs_md: string;
  channels_md: string;
}

interface OutputResponse {
  build_id: string;
  verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  score: number;
  documents: DocumentMap;
  repo_url: string | null;
  rejection_reason?: string;
}

const TABS: Array<{ key: keyof DocumentMap; label: string }> = [
  { key: "readme_md", label: "README" },
  { key: "roadmap_md", label: "Roadmap" },
  { key: "architecture_md", label: "Architecture" },
  { key: "prd_md", label: "PRD" },
  { key: "voice_md", label: "Voice" },
  { key: "decisions_md", label: "Decisions" },
  { key: "risks_md", label: "Risks" },
  { key: "cogs_md", label: "COGS" },
  { key: "channels_md", label: "Channels" },
  { key: "brand_tokens_json", label: "Brand tokens" },
];

export default function BuildOutputPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}): React.ReactElement {
  const { buildId } = use(params);
  const [out, setOut] = React.useState<OutputResponse | null>(null);
  const [tab, setTab] = React.useState<keyof DocumentMap>("readme_md");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    void (async (): Promise<void> => {
      try {
        const res = await fetch(`/api/builds/${buildId}`, { cache: "no-store" });
        const body = (await res.json()) as { build?: { outputUrl?: string } };
        // Fetch the assembled bundle via a sub-route
        const outRes = await fetch(`/api/builds/${buildId}?include=output`, {
          cache: "no-store",
        });
        if (!outRes.ok) {
          setErr("Output not yet available.");
          return;
        }
        const outBody = (await outRes.json()) as {
          output?: OutputResponse;
          error?: string;
        };
        if (!alive) return;
        if (outBody.output) setOut(outBody.output);
        else setErr(outBody.error ?? "No output yet.");
        // body is referenced to avoid unused-var lint
        void body;
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Fetch failed.");
      }
    })();
    return (): void => {
      alive = false;
    };
  }, [buildId]);

  if (err && !out) {
    return (
      <>
        <Chip variant="mono-meta" tone="neutral">
          BUILD · {buildId.toUpperCase()}
        </Chip>
        <h1 id="page-h1">Output not available</h1>
        <p>{err}</p>
        <Button variant="ghost" size="md" href={`/app/builds/${buildId}`}>
          Back to live status
        </Button>
      </>
    );
  }

  if (!out) {
    return (
      <>
        <Chip variant="mono-meta" tone="neutral">
          BUILD · {buildId.toUpperCase()}
        </Chip>
        <h1 id="page-h1">Loading deliverables…</h1>
      </>
    );
  }

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        BUILD · {buildId.toUpperCase()} · {out.verdict}
      </Chip>
      <h1 id="page-h1">Deliverables</h1>
      <p className="body-lg">
        Verdict <strong>{out.verdict}</strong> · readiness score{" "}
        <strong>{out.score}/100</strong>.
      </p>

      {out.verdict === "FAIL" ? (
        <Card>
          <h2>Audit gate blocked delivery</h2>
          <p>{out.rejection_reason ?? "Jury blocked delivery."}</p>
          <p>
            Studio Zero will revise and re-run the audit at no extra cost. You
            can also cancel for a pro-rata refund.
          </p>
        </Card>
      ) : null}

      {out.repo_url ? (
        <Card>
          <h2>Seeded GitHub repo</h2>
          <p>
            <a href={out.repo_url}>{out.repo_url}</a>
          </p>
          <p className="sz-fineprint">
            Milestones and issues from each layer are pre-populated. README and
            ARCHITECTURE.md are at the repo root.
          </p>
        </Card>
      ) : null}

      <div className="sz-tablist" role="tablist" aria-label="Deliverables">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className="sz-tab"
            onClick={(): void => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sz-doc-pane" role="tabpanel">
        <pre className="sz-doc-content">{out.documents[tab]}</pre>
      </div>

      <p className="sz-fineprint">
        This Build output was produced by Studio Zero (AI Act Art. 50). System
        Card v1.0 disclosure: <a href="/ai-system-card">/ai-system-card</a>.
      </p>
    </>
  );
}
