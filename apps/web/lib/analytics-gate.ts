/**
 * Analytics gate — Lens spec placeholder.
 *
 * No analytics events fire at M0. The full Lens spec wires PostHog +
 * Stripe webhook attribution at M2/M4. This stub exists so future call
 * sites have a stable import — and so the cookie banner has a single
 * place to mutate consent state when it lands.
 *
 * TODO(M2): wire PostHog + first-party UTM passthrough per
 *           `marketing/analytics-spec.md` once Comply confirms regional
 *           consent matrix.
 *
 * Hard rule: nothing in this file may fire a network request without
 * `consent.analytics === true`. CCPA + GDPR + PECR enforce.
 */

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  necessary: true; // always on; the page cannot function without it
  analytics: boolean;
  marketing: boolean;
}

export const defaultConsent: ConsentState = Object.freeze({
  necessary: true,
  analytics: false,
  marketing: false,
});

/**
 * Track a typed analytics event. At M0 this is a no-op — present so
 * call sites can land before the Lens implementation drops at M2.
 */
export function trackEvent(
  _name: string,
  _props: Record<string, unknown> = {},
  consent: ConsentState = defaultConsent,
): void {
  if (!consent.analytics) return;
  // TODO(M2): forward to PostHog + AI-Act-aware redactor before send.
}
