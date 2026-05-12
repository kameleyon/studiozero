/**
 * /app/onboarding/checkout — region-aware checkout handoff (D22 D1+D2 close).
 *
 * Owner: Vega + Forge + Locale (Phase 9 M2 Batch 3).
 *
 * Server component. Reads `request.geo` via `next/headers` at the edge,
 * resolves region, and:
 *
 *   - EU/UK → renders waiver UX (legally-sufficient §8.2/§8.3 copy);
 *     the user MUST tick the checkbox to proceed. Server posts to
 *     /api/billing/checkout-session with `region` + `cooling_off_waiver`.
 *   - California / US-other / ROW → posts the same endpoint with no
 *     waiver field; server falls through to non-EU branch.
 *
 * Cross-refs:
 *   - compliance/d22-cooling-off-flow.md §2.1 (D1) + §2.2 (D2)
 *   - finance/refund-matrix.md §3.1 (region cascade) + §8.1–8.3 (locked copy)
 *   - apps/web/lib/region-detect.ts (detection cascade)
 */
import { headers } from "next/headers";
import * as React from "react";

import { CheckoutHandoff } from "./checkout-handoff";
import { Chip } from "../../../../components/Chip";
import {
  detectRegionFromHeaders,
  requiresCoolingOffWaiver,
  type RegionCode,
} from "../../../../lib/region-detect";

type Tier =
  | "byok_starter"
  | "byok_pro"
  | "managed_starter"
  | "managed_pro"
  | "cli";

type BillingPeriod = "monthly" | "annual";

const VALID_TIERS: ReadonlySet<Tier> = new Set([
  "byok_starter",
  "byok_pro",
  "managed_starter",
  "managed_pro",
  "cli",
]);

const VALID_PERIODS: ReadonlySet<BillingPeriod> = new Set([
  "monthly",
  "annual",
]);

interface CheckoutPageProps {
  searchParams: Promise<{ tier?: string; period?: string }>;
}

export const metadata = { title: "Checkout · Studio Zero" };

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const tierParam = params?.tier ?? "";
  const periodParam = params?.period ?? "annual";

  const tier = VALID_TIERS.has(tierParam as Tier)
    ? (tierParam as Tier)
    : null;
  const period: BillingPeriod = VALID_PERIODS.has(periodParam as BillingPeriod)
    ? (periodParam as BillingPeriod)
    : "annual";

  // Edge geo headers — set by Vercel (`x-vercel-ip-country`,
  // `x-vercel-ip-country-region`). In local dev these are absent and the
  // region defaults to 'row'.
  const h = await headers();
  const region: RegionCode = detectRegionFromHeaders(h);
  const requiresWaiver = requiresCoolingOffWaiver(region);

  if (!tier) {
    return (
      <>
        <Chip variant="mono-meta" tone="neutral">CHECKOUT</Chip>
        <h1 id="page-h1">Pick a plan first.</h1>
        <p className="body-lg">
          We didn&apos;t see a tier on that link. <a href="/pricing">Open the
          pricing page</a> and start from the plan you want.
        </p>
      </>
    );
  }

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        STEP · CHECKOUT
      </Chip>
      <h1 id="page-h1">Confirm and continue.</h1>

      {requiresWaiver ? (
        <div className="sz-soft-warning" role="region" aria-label="EU and UK cooling-off notice">
          <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-0)" }}>
            Your 14-day cooling-off right ({region === "uk" ? "UK" : "EU"})
          </p>
          <p style={{ margin: "var(--sp-8) 0 0" }}>
            By law, you have 14 days from purchase to change your mind and
            get a full refund. You can keep this right (default), or waive
            it below if you want to start using Studio Zero immediately and
            accept that the right is then lost.
          </p>
        </div>
      ) : (
        <p className="body-lg">
          Review your plan, then we&apos;ll take you to our payment processor to
          complete checkout.
        </p>
      )}

      <CheckoutHandoff
        tier={tier}
        billingPeriod={period}
        region={region}
        requiresWaiver={requiresWaiver}
      />
    </>
  );
}
