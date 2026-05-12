import * as React from "react";

import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";

export const metadata = { title: "Billing · Settings" };

/**
 * /app/settings/billing — placeholder per M1 spec.
 *
 * Real Stripe Customer Portal lands at M2 per PRD §16. The page renders
 * the planned tier matrix and a stub "Manage billing" button.
 */
export default function BillingSettingsPage(): React.ReactElement {
  return (
    <>
      <p className="sz-demo-banner">
        <strong>Demo placeholder.</strong> Stripe Customer Portal lands at M2.
      </p>
      <Chip variant="mono-meta" tone="neutral">BILLING & DATA · PLAN</Chip>
      <h1 id="page-h1">Billing</h1>
      <p className="body-lg">
        Active plan and invoices. Stripe Customer Portal handles updates,
        cancellations, and disputes (FTC click-to-cancel).
      </p>

      <Card
        variant="default"
        heading="BYOK Starter · $29 / mo"
        body="Code audits on one project. Unlimited Surface re-audits. Tokens billed by Anthropic, not us."
        mono="STATUS: DEMO · NO REAL CHARGE"
      />

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href="/app/settings">
          Back to settings
        </Button>
        <Button variant="primary" size="lg" href="/app/settings" arrow>
          Manage billing
        </Button>
      </div>
    </>
  );
}
