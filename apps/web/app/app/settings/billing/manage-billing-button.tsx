"use client";

/**
 * "Manage billing" button — wires the in-app Settings → Billing surface
 * to /api/billing/portal (Forge M2 Batch 1) per FTC 16 CFR 425 §425.4(a)
 * same-medium cancellation. Phase 9 M2 Batch 3 (Vega) — G1 close.
 *
 * Flow:
 *   1. User clicks → GET /api/billing/portal
 *   2. Server mints one-shot Stripe Customer Portal session, returns URL
 *   3. window.location.href = portal_url (hard navigate; portal is hosted)
 *
 * Error surfaces use locked Herald-voice copy. Never expose raw Stripe
 * errors to the user — `compliance/click-to-cancel-ux-audit.md` §2.2.
 *
 * a11y contract (Halo):
 *   - aria-label="Manage billing in Stripe Customer Portal"
 *   - aria-busy during fetch
 *   - SC 2.5.8 ≥24×24 hit target via sz-btn--lg (min-height 44px)
 *   - SC 2.4.7 focus-visible inherited from sz-btn
 */
import * as React from "react";

import { Button } from "../../../../components/Button";

// Locked Herald-voice error copy — never surface Stripe's raw message.
const ERR_NOT_AUTHED =
  "Your session expired. Sign in again to manage billing.";
const ERR_NO_SUBSCRIPTION =
  "You don't have an active subscription yet. Pick a plan to get started.";
const ERR_GENERIC =
  "We couldn't open the billing portal. Try again in a moment.";

export function ManageBillingButton(): React.ReactElement {
  const [pending, setPending] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  async function openPortal(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json()) as
        | { portal_url: string }
        | { error: string; detail?: string };

      if (!res.ok) {
        const code = "error" in data ? data.error : "";
        if (res.status === 401 || code === "not_authenticated") {
          setError(ERR_NOT_AUTHED);
        } else if (
          res.status === 404 ||
          code === "no_subscription" ||
          code === "no_stripe_customer"
        ) {
          setError(ERR_NO_SUBSCRIPTION);
        } else {
          setError(ERR_GENERIC);
        }
        setPending(false);
        return;
      }

      if ("portal_url" in data && data.portal_url) {
        // Hard navigate — Stripe Portal is a full-page hosted session.
        window.location.href = data.portal_url;
        return;
      }
      setError(ERR_GENERIC);
      setPending(false);
    } catch {
      setError(ERR_GENERIC);
      setPending(false);
    }
  }

  return (
    <>
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="sz-form-error-summary"
          style={{ width: "100%", marginBottom: "var(--sp-12)" }}
        >
          {error}
        </div>
      ) : null}
      <Button
        type="button"
        variant="primary"
        size="lg"
        loading={pending}
        arrow
        onClick={openPortal}
        aria-label="Manage billing in Stripe Customer Portal"
      >
        {pending ? "Opening portal" : "Manage billing"}
      </Button>
    </>
  );
}

export default ManageBillingButton;
