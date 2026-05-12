"use client";

/**
 * CheckoutHandoff — waiver checkbox + Stripe Checkout redirect.
 *
 * Owner: Vega + Forge (Phase 9 M2 Batch 3, D22 D2 close).
 *
 * Renders the EU/UK 14-day cooling-off waiver checkbox VERBATIM from
 * Comply's §8.2 (EU) / §8.3 (UK) copy. The checkbox is:
 *
 *   - NOT pre-ticked (EDPB Guidelines 05/2020 — D22 Comply rule)
 *   - REQUIRED to proceed when region ∈ {eu, uk}
 *   - Optional for california/us_other/row (the field is still posted
 *     so the audit-log can capture the unticked state)
 *
 * a11y:
 *   - Real native <input type="checkbox"> with visible label
 *   - aria-describedby links the legal text
 *   - SC 2.5.8 ≥24×24 hit target (44px via min-height)
 *   - SC 1.4.11 ≥3:1 non-text contrast (tokens.css)
 *   - SC 3.3.1 inline error if proceed clicked without tick
 *
 * Cross-refs:
 *   - finance/refund-matrix.md §8.2 (EU) / §8.3 (UK) — locked copy
 *   - apps/web/app/api/billing/checkout-session/route.ts (server gate)
 */
import * as React from "react";

import { Button } from "../../../../components/Button";

import type { RegionCode } from "../../../../lib/region-detect";

type Tier =
  | "byok_starter"
  | "byok_pro"
  | "managed_starter"
  | "managed_pro"
  | "cli";

type BillingPeriod = "monthly" | "annual";

interface CheckoutHandoffProps {
  tier: Tier;
  billingPeriod: BillingPeriod;
  region: RegionCode;
  requiresWaiver: boolean;
}

const ERR_WAIVER_REQUIRED =
  "Tick the cooling-off waiver to start your subscription immediately.";
const ERR_NETWORK = "We couldn't reach the payment processor. Try again.";
const ERR_AUTH = "Sign in first to continue checkout.";

// LOCKED COPY (refund-matrix.md §8.2 EU / §8.3 UK). Do NOT paraphrase —
// Comply's rule: Herald may polish for tone, but legally protective
// language is locked verbatim.
const EU_WAIVER_TEXT =
  "I waive my right to the 14-day cooling-off period under Directive " +
  "2011/83/EU. I understand that by clicking Subscribe, my subscription " +
  "begins immediately and I cannot cancel for a refund within the next " +
  "14 days unless the service is faulty.";

const UK_WAIVER_TEXT =
  "I waive my right to the 14-day cancellation period under the " +
  "Consumer Contracts Regulations 2013. I understand my subscription " +
  "begins immediately and I cannot cancel for a refund within 14 days " +
  "unless the service is faulty.";

const SHORT_WAIVER_INTENT =
  "I understand I'm waiving my 14-day cooling-off right because I'm " +
  "getting immediate access to Studio Zero.";

export function CheckoutHandoff({
  tier,
  billingPeriod,
  region,
  requiresWaiver,
}: CheckoutHandoffProps): React.ReactElement {
  const [waived, setWaived] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<boolean>(false);

  const waiverText = region === "uk" ? UK_WAIVER_TEXT : EU_WAIVER_TEXT;

  async function handleContinue(): Promise<void> {
    setError(null);

    if (requiresWaiver && !waived) {
      setError(ERR_WAIVER_REQUIRED);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billing_period: billingPeriod,
          region,
          // Always send the boolean — the server's strict-true check
          // distinguishes signed/unsigned/absent without ambiguity.
          cooling_off_waiver: waived,
        }),
      });

      const data = (await res.json()) as
        | { checkout_url: string; session_id: string }
        | { error: string; detail?: string };

      if (!res.ok) {
        const code = "error" in data ? data.error : "";
        if (res.status === 401 || code === "not_authenticated") {
          setError(ERR_AUTH);
        } else if (code === "cooling_off_waiver_required") {
          // Defensive — should never reach here because the client gate
          // already enforces. Surface the same locked copy anyway.
          setError(ERR_WAIVER_REQUIRED);
        } else {
          setError(ERR_NETWORK);
        }
        setPending(false);
        return;
      }

      if ("checkout_url" in data && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setError(ERR_NETWORK);
      setPending(false);
    } catch {
      setError(ERR_NETWORK);
      setPending(false);
    }
  }

  return (
    <>
      {requiresWaiver ? (
        <fieldset
          className="sz-intake-fieldset"
          style={{ marginTop: "var(--sp-24)" }}
        >
          <legend className="sz-sr-only">Cooling-off waiver</legend>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label
            htmlFor="cooling-off-waiver"
            className="sz-cooling-off-waiver"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--sp-12)",
              padding: "var(--sp-16)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r)",
              background: "var(--bg-3)",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            <input
              id="cooling-off-waiver"
              name="cooling_off_waiver"
              type="checkbox"
              checked={waived}
              onChange={(e) => setWaived(e.target.checked)}
              aria-describedby="cooling-off-waiver-help cooling-off-waiver-legal"
              aria-required="true"
              style={{
                width: 20,
                height: 20,
                marginTop: 2,
                flexShrink: 0,
                accentColor: "var(--brand-aqua, currentColor)",
              }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: "var(--sp-8)" }}>
              <span id="cooling-off-waiver-help" style={{ color: "var(--ink-0)", fontWeight: 600 }}>
                {SHORT_WAIVER_INTENT}
              </span>
              <span
                id="cooling-off-waiver-legal"
                style={{
                  color: "var(--ink-2)",
                  fontSize: "var(--fs-body-sm)",
                  lineHeight: "var(--lh-body)",
                }}
              >
                {waiverText}
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="sz-form-error-summary"
          style={{ marginTop: "var(--sp-16)" }}
        >
          {error}
        </div>
      ) : null}

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href="/pricing">
          Back to pricing
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          loading={pending}
          arrow
          onClick={handleContinue}
          aria-label="Continue to Stripe Checkout"
          disabled={pending}
        >
          {pending ? "Opening checkout" : "Continue to checkout"}
        </Button>
      </div>
    </>
  );
}

export default CheckoutHandoff;
