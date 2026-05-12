"use client";

/**
 * Cookie banner — Lens (Phase 9 M1 Batch 3).
 *
 * Implements analytics-spec.md §1.2 + §1.4 + §7.4.
 *
 * Behaviour:
 *   - Renders if no `sz_consent` cookie/localStorage entry is present.
 *   - Three top-level buttons: Accept all / Reject all / Customize.
 *   - Customize → granular toggles for analytics + marketing (necessary
 *     is always on).
 *   - On submit: POST `/api/consent` (server-side writes consent_records
 *     row + sets the `sz_consent` cookie) AND mirrors the decision to
 *     `analytics.applyConsent()` (drains buffer or destroys it).
 *   - GDPR PECR + EDPB Guidelines 5/2020 compliant — affirmative
 *     consent required; the banner does not auto-dismiss on outside-click.
 *
 * Accessibility:
 *   - role="dialog", aria-modal, aria-labelledby.
 *   - Focus moves to the first focusable button on mount.
 *   - Escape DOES NOT close — consent must be affirmative. The dialog
 *     stays until the user makes a decision.
 *
 * Mounted from the root layout; lazily renders only when needed.
 */

import * as React from "react";

import {
  analytics,
  type ConsentState,
  type ConsentStatus,
  defaultConsent,
} from "../lib/analytics-gate";

interface PendingDecision {
  status: ConsentStatus;
  buckets: ConsentState;
}

export interface CookieBannerProps {
  /** Optional override — render the banner regardless of stored state.
   *  Used by Settings → Privacy → "Manage cookies" to re-open. */
  forceOpen?: boolean;
  onClose?: () => void;
}

export function CookieBanner({
  forceOpen = false,
  onClose,
}: CookieBannerProps): React.ReactElement | null {
  const [open, setOpen] = React.useState<boolean>(forceOpen);
  const [showCustomize, setShowCustomize] = React.useState<boolean>(false);
  const [buckets, setBuckets] = React.useState<ConsentState>(defaultConsent);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const firstButtonRef = React.useRef<HTMLButtonElement | null>(null);

  // Decide visibility on mount.
  React.useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("sz_consent");
      if (!raw) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [forceOpen]);

  // Focus the first action when the dialog opens (a11y: SC 2.4.3).
  React.useEffect(() => {
    if (open) firstButtonRef.current?.focus();
  }, [open]);

  const submit = React.useCallback(
    async (decision: PendingDecision): Promise<void> => {
      setSubmitting(true);
      const recorded_at = new Date().toISOString();

      // Mirror to the gate immediately — the user perceives the decision
      // as instant; the server POST is fire-and-forget for the audit
      // trail.
      try {
        await analytics.applyConsent({
          status: decision.status,
          buckets: decision.buckets,
          recorded_at,
        });
      } catch {
        /* gate apply failed — banner still closes; server is canon. */
      }

      // Fire exempt consent_set event (the gate routes exempt events
      // even when status='rejected').
      analytics.capture("consent_set", {
        status: decision.status === "withdrawn" ? "rejected" : (decision.status as "accepted" | "rejected" | "partial"),
        buckets: {
          analytics: decision.buckets.analytics,
          marketing: decision.buckets.marketing,
          necessary: true,
        },
      });

      // Server-side persistence — fire-and-forget; failure logs but does
      // not block the UX (the localStorage write already protected the
      // user's decision client-side).
      try {
        await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: decision.status,
            buckets: decision.buckets,
            recorded_at,
          }),
        });
      } catch {
        /* offline — server reconciles on next page load */
      }

      setSubmitting(false);
      setOpen(false);
      onClose?.();
    },
    [onClose],
  );

  const acceptAll = (): void => {
    void submit({
      status: "accepted",
      buckets: { necessary: true, analytics: true, marketing: true },
    });
  };

  const rejectAll = (): void => {
    void submit({
      status: "rejected",
      buckets: { necessary: true, analytics: false, marketing: false },
    });
  };

  const saveCustom = (): void => {
    void submit({
      status:
        buckets.analytics || buckets.marketing ? "partial" : "rejected",
      buckets,
    });
  };

  if (!open) return null;

  return (
    <div
      className="sz-cookie-banner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sz-cookie-heading"
      aria-describedby="sz-cookie-body"
    >
      <div className="sz-cookie-banner__panel">
        <h2 id="sz-cookie-heading">Cookies and analytics consent</h2>
        <p id="sz-cookie-body" className="body-lg">
          We use strictly-necessary cookies to keep you signed in. With your
          consent we also use analytics cookies so we can measure what helps
          and what hurts. You can change this any time in Settings &rarr;
          Privacy.
        </p>

        {showCustomize ? (
          <div className="sz-cookie-banner__customize">
            <label className="sz-cookie-toggle">
              <input type="checkbox" checked disabled />
              <span>
                <strong>Necessary.</strong> Sign-in, security, and the
                fundamentals of the app. Always on.
              </span>
            </label>
            <label className="sz-cookie-toggle">
              <input
                type="checkbox"
                checked={buckets.analytics}
                onChange={(e) =>
                  setBuckets((b) => ({ ...b, analytics: e.target.checked }))
                }
              />
              <span>
                <strong>Analytics.</strong> PostHog product analytics so we
                can measure which audits convert and where the funnel
                breaks. Never sold.
              </span>
            </label>
            <label className="sz-cookie-toggle">
              <input
                type="checkbox"
                checked={buckets.marketing}
                onChange={(e) =>
                  setBuckets((b) => ({ ...b, marketing: e.target.checked }))
                }
              />
              <span>
                <strong>Marketing.</strong> Ad-platform attribution (Google,
                Meta) for paid campaigns. Off by default until we run paid
                ads.
              </span>
            </label>

            <div className="sz-cookie-banner__actions">
              <button
                type="button"
                className="sz-button sz-button--ghost"
                onClick={() => setShowCustomize(false)}
                disabled={submitting}
              >
                Back
              </button>
              <button
                ref={firstButtonRef}
                type="button"
                className="sz-button sz-button--primary"
                onClick={saveCustom}
                disabled={submitting}
              >
                {submitting ? "Saving" : "Save preferences"}
              </button>
            </div>
          </div>
        ) : (
          <div className="sz-cookie-banner__actions">
            <button
              type="button"
              className="sz-button sz-button--ghost"
              onClick={rejectAll}
              disabled={submitting}
            >
              Reject all
            </button>
            <button
              type="button"
              className="sz-button sz-button--ghost"
              onClick={() => setShowCustomize(true)}
              disabled={submitting}
            >
              Customize
            </button>
            <button
              ref={firstButtonRef}
              type="button"
              className="sz-button sz-button--primary"
              onClick={acceptAll}
              disabled={submitting}
            >
              {submitting ? "Saving" : "Accept all"}
            </button>
          </div>
        )}

        <p className="sz-mono-meta sz-cookie-banner__footer">
          GDPR Art. 7(1) record on file. CCPA &ldquo;Do Not Sell&rdquo; link
          in the footer.
        </p>
      </div>
    </div>
  );
}

export default CookieBanner;
