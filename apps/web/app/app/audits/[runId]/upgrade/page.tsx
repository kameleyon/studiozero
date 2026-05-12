import * as React from "react";

import { Button } from "../../../../../components/Button";
import { Chip } from "../../../../../components/Chip";

/**
 * /app/audits/[runId]/upgrade — IA-D2 E2 upsell page.
 *
 * Surface → Code upsell. Locked Herald copy from sample 02 §1 (free-tier
 * upgrade card). The CTA copy "Upgrade to Code →" is locked.
 *
 * Hook instruments this route for conversion measurement (M1 deliverable).
 * M1+1 wires Stripe Checkout return → run-new-audit flow.
 */
export default async function UpgradePage({
  params,
}: {
  params: Promise<{ runId: string }>;
}): Promise<React.ReactElement> {
  const { runId } = await params;

  return (
    <>
      <p className="sz-demo-banner">
        <strong>Demo upsell.</strong> Real Stripe Checkout lands at M2.
      </p>
      <Chip variant="mono-meta" tone="neutral">UPGRADE · FROM SURFACE TO CODE</Chip>
      <h1 id="page-h1">You&apos;re on the free plan.</h1>
      <p className="body-lg">
        Free covers unlimited Surface re-audits on one project. Code and
        Full audits read your source — they find 3 to 5 times as many issues.
      </p>

      <div className="sz-mode-grid">
        <div className="sz-card sz-card--default">
          <div className="sz-card__eyebrow">
            <span className="sz-mono-meta">SURFACE · CURRENT</span>
          </div>
          <h3 className="sz-card__heading">Free Surface</h3>
          <p className="sz-card__body">
            Unlimited re-audits on one project. Audits the live URL only.
          </p>
          <div className="sz-card__mono">FROM YOUR LAST RUN: 14 FINDINGS</div>
        </div>
        <div className="sz-card sz-card--default" style={{ borderColor: "var(--line-3)" }}>
          <div className="sz-card__eyebrow">
            <span className="sz-mono-meta">CODE · UPGRADE</span>
          </div>
          <h3 className="sz-card__heading">BYOK Code · $29 / mo</h3>
          <p className="sz-card__body">
            Reads your source. 3–5× more findings than Surface. All six
            reviewers + Jury synthesis.
          </p>
          <div className="sz-card__mono">EXPECTED ON THIS PROJECT: 40–70 FINDINGS</div>
        </div>
      </div>

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href={`/app/audits/${runId}`}>
          Back to verdict
        </Button>
        <Button variant="primary" size="lg" href="/app/settings/billing" arrow>
          Upgrade to Code
        </Button>
      </div>
    </>
  );
}
