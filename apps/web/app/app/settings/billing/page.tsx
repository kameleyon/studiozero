import * as React from "react";

import { ManageBillingButton } from "./manage-billing-button";
import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";

export const metadata = { title: "Billing · Settings" };

/**
 * /app/settings/billing — FTC Click-to-Cancel primary surface
 * (Vega + Forge — Phase 9 M2 Batch 3, gap G1 close).
 *
 * The "Manage billing" button GETs `/api/billing/portal` then redirects
 * the browser to the returned `portal_url` (one-shot Stripe-hosted
 * session). The FTC 16 CFR 425 §425.4 same-medium contract: signup is
 * online → cancel is online, ≤3 clicks from the app shell:
 *
 *   1. Sidebar → Settings → Billing → "Manage billing"
 *   2. Stripe Portal → "Cancel subscription"
 *   3. Confirm
 *
 * Halo a11y contract:
 *   - aria-label="Manage billing in Stripe Customer Portal"
 *   - SC 2.5.8 ≥24×24 hit target (sz-btn--lg → min-height 44px)
 *   - SC 2.4.7 visible focus ring (sz-btn focus-visible)
 *   - Direction A v0.1.1 tokens only (no inline hex)
 *
 * Cross-refs:
 *   - compliance/click-to-cancel-ux-audit.md §2.2 (G1 close target)
 *   - apps/web/app/api/billing/portal/route.ts (mint endpoint)
 *   - finance/stripe-customer-portal-config.md §4 (return URL)
 */
export default function BillingSettingsPage(): React.ReactElement {
  return (
    <>
      <Chip variant="mono-meta" tone="neutral">BILLING & DATA · PLAN</Chip>
      <h1 id="page-h1">Billing</h1>
      <p className="body-lg">
        Manage your subscription, payment method, and invoices in the Stripe
        Customer Portal. Cancellation is one click in the same channel you
        signed up through (FTC 16 CFR 425).
      </p>

      <Card
        variant="default"
        heading="Your plan"
        body="The portal opens a fresh Stripe-hosted session. From there you can update your payment method, download invoices, switch tiers, or cancel — your access continues through the end of the current billing period."
        mono="OPENS STRIPE-HOSTED PORTAL · CANCEL ANYTIME"
      />

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href="/app/settings">
          Back to settings
        </Button>
        <ManageBillingButton />
      </div>
    </>
  );
}
