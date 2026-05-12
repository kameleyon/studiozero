"use client";

/**
 * Upgrade CTA client island — Lens (Phase 9 M1 Batch 3).
 *
 * Fires `upgrade_card_shown` on mount and `upgrade_clicked` on the
 * primary button click per analytics-spec.md §2.4. Hosted inside the
 * surrounding server component so the page can stay server-rendered for
 * SEO/edge cache while the conversion-funnel events still fire client-
 * side (analytics is consent-gated and PostHog runs in the browser).
 */
import * as React from "react";

import { Button } from "../../../../../components/Button";
import { track } from "../../../../../lib/posthog-client";

interface UpgradeCtaProps {
  runId: string;
  fromTier: string;
  toTier: string;
}

export function UpgradeCta({
  runId,
  fromTier,
  toTier,
}: UpgradeCtaProps): React.ReactElement {
  const firedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    track("upgrade_card_shown", {
      run_id: runId,
      from_tier: fromTier,
      to_tier: toTier,
      surface: "verdict",
    });
  }, [runId, fromTier, toTier]);

  const onClick = (): void => {
    track("upgrade_clicked", {
      from_tier: fromTier,
      to_tier: toTier,
      surface: "verdict",
      run_id: runId,
    });
    // navigation happens via the href on the Button below; the event fires
    // synchronously before the navigation kicks off because posthog-js
    // queues + flushes via beacon on unload.
  };

  return (
    <div className="sz-intake-actions">
      <Button variant="ghost" size="md" href={`/app/audits/${runId}`}>
        Back to verdict
      </Button>
      <Button
        variant="primary"
        size="lg"
        href="/app/settings/billing"
        arrow
        onClick={onClick}
      >
        Upgrade to Code
      </Button>
    </div>
  );
}
