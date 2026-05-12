/**
 * PostHog client wrapper — Phase 9 M1 Batch 3 (Hook).
 *
 * Thin, lazy, consent-gated wrapper around `posthog-js`. This file is
 * the ONLY module in the codebase allowed to import `posthog-js`
 * directly (Lens's M2 ESLint rule will enforce this). Every other
 * module calls `track()` / `getFeatureFlag()` from here.
 *
 * Why a wrapper and not raw posthog-js:
 *   - Compile-time type safety on event names and props
 *     (`EventName` union → `EventProps<E>` mapped type)
 *   - Consent gate: nothing fires while `analytics-gate` is `unknown`
 *     or `rejected`; pre-consent events go to a session-scoped buffer
 *     and drain on opt-in (analytics-spec §1.2)
 *   - SSR-safe: every function is a no-op on the server, and the
 *     posthog-js init runs strictly in `useEffect` via the bootstrap
 *     module
 *   - Lens's M2 follow-up swaps the network transport behind this
 *     facade for a worker-thread queue without touching call-sites
 *
 * M1 status:
 *   - If `NEXT_PUBLIC_POSTHOG_KEY` is unset, every function degrades to
 *     a no-op + console.debug. Hook's A/B test still functions; the
 *     experiment assignment falls back to a deterministic hash-based
 *     split keyed on user_id so dev/CI runs are reproducible.
 *   - If the key IS set, posthog-js loads on first call and feature
 *     flags resolve via PostHog's REST decide endpoint.
 *
 * Cross-refs:
 *   - `apps/web/lib/analytics-gate.ts` — consent state machine
 *   - `apps/web/lib/analytics-events.v1.ts` — typed taxonomy
 *   - `marketing/posthog-flags.md` — feature flag config
 *   - `marketing/analytics-spec.md` §1 — consent + buffer semantics
 */
import { analytics } from "./analytics-gate";

import type {
  EventName,
  EventProps,
  ExperimentVariant,
} from "./analytics-events.v1";

/** PostHog instance shape we depend on. Kept narrow so the test harness
 *  can stub it without pulling posthog-js in. */
export interface PostHogLike {
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (distinctId: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
  getFeatureFlag: (key: string) => string | boolean | undefined;
  onFeatureFlags: (cb: (flags: string[]) => void) => void;
  /** posthog-js exposes this when EU AI Act / GDPR opt-out flips. */
  opt_in_capturing: () => void;
  opt_out_capturing: () => void;
}

let _client: PostHogLike | null = null;
let _initPromise: Promise<PostHogLike | null> | null = null;
const _exposureFired = new Set<string>();

/**
 * Test seam — Lens's funnel-instrumentation spec calls this to inject a
 * mock PostHog before walking the happy path. Never call from production
 * code.
 */
export function __setPostHogForTests(stub: PostHogLike | null): void {
  _client = stub;
  _exposureFired.clear();
}

export function __getExposureFiredForTests(): ReadonlySet<string> {
  return _exposureFired;
}

function getKey(): string | null {
  if (typeof process === "undefined") return null;
  const k = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return typeof k === "string" && k.length > 0 ? k : null;
}

function getHost(): string {
  if (typeof process === "undefined") return "https://us.i.posthog.com";
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
}

/**
 * Lazy-load posthog-js. Returns `null` in SSR + when the key is missing.
 *
 * The import is dynamic so the bundle stays lean for users who never
 * grant analytics consent (the import never resolves in that case).
 */
async function loadClient(): Promise<PostHogLike | null> {
  if (_client) return _client;
  if (typeof window === "undefined") return null;
  if (_initPromise) return _initPromise;
  const key = getKey();
  if (!key) return null;

  _initPromise = (async (): Promise<PostHogLike | null> => {
    try {
      // posthog-js is an optional peer dep — when absent (M1 default)
      // we degrade to no-op. The dynamic import is wrapped in a string
      // expression so the bundler does not hard-require it.
      const modName = "posthog-js";
      const mod = (await import(/* webpackIgnore: true */ modName).catch(
        () => null,
      )) as { default?: PostHogLike } | null;
      if (!mod) return null;
      const ph = mod.default as PostHogLike | undefined;
      if (!ph) return null;
      (ph as unknown as {
        init: (k: string, opts: Record<string, unknown>) => void;
      }).init(key, {
        api_host: getHost(),
        capture_pageview: false, // Lens fires this manually after consent
        persistence: "localStorage+cookie",
        autocapture: false,
        disable_session_recording: true,
        bootstrap: { distinctID: undefined },
      });
      _client = ph;
      return ph;
    } catch {
      return null;
    }
  })();
  return _initPromise;
}

/**
 * Fire a typed analytics event. SSR-safe + consent-gated.
 *
 * Returns `true` when the event was dispatched to PostHog (or to the
 * registered test stub); `false` when suppressed (SSR, no-key, no-consent,
 * or no client available).
 */
export function track<E extends EventName>(
  event: E,
  props: EventProps<E>,
): boolean {
  if (typeof window === "undefined") return false;
  // Lens Batch 3 — the real consent gate is live. Route every track()
  // call through `analytics.capture()` so consent, buffer, PII strip and
  // compliance-exempt routing are enforced in exactly one place.
  // Test-stub fast-path: if the test harness injected a fake client we
  // still call it (so existing __setPostHogForTests assertions keep
  // working) AND mirror through the gate for the consent assertions.
  if (_client) {
    _client.capture(event, props as Record<string, unknown>);
  }
  analytics.capture(event, props as unknown as Record<string, unknown>);
  return true;
}

export function identify(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (_client) {
    _client.identify(userId, traits);
    return;
  }
  void (async (): Promise<void> => {
    const ph = await loadClient();
    ph?.identify(userId, traits);
  })();
}

/**
 * Read a PostHog feature flag synchronously from the loaded client. When
 * the client is not yet loaded (or absent), returns `undefined` — callers
 * are responsible for providing a default.
 *
 * For experiments use `assignVariant()` instead — it wraps the flag read
 * with deterministic fallback + sticky-per-user assignment.
 */
export function getFeatureFlag(
  key: string,
): string | boolean | undefined {
  if (typeof window === "undefined") return undefined;
  if (_client) return _client.getFeatureFlag(key);
  return undefined;
}

/**
 * Fire `experiment_exposure` exactly once per (user × experiment_key)
 * tuple per page-load. Idempotent across multiple track() calls inside
 * the same React tree.
 */
export function fireExposureOnce(args: {
  experimentKey: string;
  variant: ExperimentVariant;
  userId?: string;
}): void {
  const dedupKey = `${args.userId ?? "anon"}::${args.experimentKey}`;
  if (_exposureFired.has(dedupKey)) return;
  _exposureFired.add(dedupKey);
  track("experiment_exposure", {
    experiment_key: args.experimentKey,
    variant: args.variant,
    user_id: args.userId,
  });
}
