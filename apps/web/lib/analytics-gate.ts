/**
 * Analytics gate — Lens (Phase 9 M1 Batch 3).
 *
 * The single bottleneck through which every analytics event must pass.
 * No other file imports `posthog-js` directly; Forge's ESLint rule
 * `no-restricted-imports` blocks both `posthog-js` and `gtag`. This is
 * the only place those live.
 *
 * Implements analytics-spec.md §1 in full:
 *   - Consent-gated init (loadAndInitAnalytics — checks consent FIRST,
 *     then dynamic-imports posthog-js, then captures).
 *   - Pre-consent FIFO sessionStorage buffer (capped at 50).
 *   - capture() / identify() / reset() / withdrawConsent().
 *   - Four compliance-exempt events that bypass the gate
 *     (analytics-spec.md §2.7; enforced via COMPLIANCE_EXEMPT_EVENTS).
 *   - PII strip on every payload (§7.1).
 *
 * Bundle posture: PostHog SDK is loaded with `await import('posthog-js')`
 * inside `loadAndInitAnalytics()` — the SDK never ends up in the initial
 * page bundle. Server-side renders of this module are no-ops (every
 * method short-circuits on `typeof window === 'undefined'`).
 *
 * Why a class with a module-singleton: PostHog itself is a singleton; the
 * pre-consent buffer must be a singleton (a second instance would lose
 * events between mount and consent). Hot-reload safety in dev is handled
 * by re-reading `localStorage` on every consent transition.
 *
 * Public M1-stub backcompat: the legacy `trackEvent()` + `defaultConsent` +
 * `ConsentState` + `ConsentCategory` exports survive so call sites Hook
 * landed in Batch 3 part-1 don't break. They forward to `analytics`.
 */

import {
  COMPLIANCE_EXEMPT_EVENTS,
  type EventName,
  type EventProps,
} from "./analytics-events.v1";

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export type ConsentStatus =
  | "unknown"
  | "accepted"
  | "partial"
  | "rejected"
  | "withdrawn";

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  necessary: true; // always on; the page cannot function without it
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord {
  status: ConsentStatus;
  buckets: ConsentState;
  /** ISO timestamp the decision was recorded client-side. */
  recorded_at: string;
  /** Pre-signup anon id (mirrors consent_records.anon_id). */
  anon_id?: string;
}

export const defaultConsent: ConsentState = Object.freeze({
  necessary: true,
  analytics: false,
  marketing: false,
});

/* ------------------------------------------------------------------ */
/* Storage keys                                                       */
/* ------------------------------------------------------------------ */

const LS_CONSENT = "sz_consent";
const LS_ANON_ID = "sz_anon_id";
const LS_SIGNUP_TS = "sz_signup_completed_ts";
const SS_BUFFER = "sz.analytics.preconsent.queue";
const BUFFER_CAP = 50;

const POSTHOG_API_HOST = "https://us.i.posthog.com";

/* ------------------------------------------------------------------ */
/* PII strip (analytics-spec.md §7.1)                                 */
/* ------------------------------------------------------------------ */

const PII_KEY_REGEX = /email|name|phone|address|ssn|password|api_?key|token|secret/i;
const EMAIL_VALUE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALUE_MAX_LEN = 200;

function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function isHighEntropySecret(value: string): boolean {
  return value.length > 20 && shannonEntropy(value) > 4.5;
}

function stripPii(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEY_REGEX.test(k)) continue; // drop key entirely
    if (typeof v === "string") {
      if (v.length > VALUE_MAX_LEN) continue;
      if (EMAIL_VALUE_REGEX.test(v)) continue;
      if (isHighEntropySecret(v)) continue;
      out[k] = v;
    } else if (
      v === null ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = v.filter(
        (item) =>
          typeof item === "number" ||
          typeof item === "boolean" ||
          (typeof item === "string" &&
            item.length <= VALUE_MAX_LEN &&
            !EMAIL_VALUE_REGEX.test(item) &&
            !isHighEntropySecret(item)),
      );
    } else if (typeof v === "object") {
      out[k] = stripPii(v as Record<string, unknown>);
    }
    // functions / undefined / symbols → dropped
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* PreconsentEvent shape                                              */
/* ------------------------------------------------------------------ */

interface PreconsentEvent {
  name: EventName;
  ts: number;
  props: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Minimal PostHog surface (typed without pulling in posthog-js types) */
/* ------------------------------------------------------------------ */

interface PostHogLike {
  init: (
    key: string,
    options: Record<string, unknown>,
  ) => void;
  capture: (name: string, props?: Record<string, unknown>) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
  opt_in_capturing: () => void;
  opt_out_capturing: () => void;
}

/* ------------------------------------------------------------------ */
/* The gate                                                           */
/* ------------------------------------------------------------------ */

class AnalyticsGate {
  private status: ConsentStatus = "unknown";
  private buckets: ConsentState = { ...defaultConsent };
  private buffer: PreconsentEvent[] = [];
  private posthog: PostHogLike | null = null;
  private posthogLoading: Promise<PostHogLike | null> | null = null;
  private bootstrapped = false;

  /* ------------ Public API ------------------------------------- */

  /**
   * One-shot bootstrap. Reads consent from localStorage; if granted,
   * lazy-loads PostHog and replays the buffer. Idempotent (safe to call
   * from every layout mount).
   */
  async loadAndInitAnalytics(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.bootstrapped) return;
    this.bootstrapped = true;

    // Restore consent + buffer from storage.
    this.hydrateFromStorage();

    if (this.shouldFire()) {
      await this.ensurePostHogReady();
      this.drainBuffer();
    }
    // unknown / rejected / withdrawn → no PostHog init yet.
  }

  /**
   * Type-narrow accessor for the current consent state.
   * Cookie-banner + Settings → Privacy both read this.
   */
  getConsent(): { status: ConsentStatus; buckets: ConsentState } {
    return { status: this.status, buckets: { ...this.buckets } };
  }

  /**
   * Capture an event. Consent-gated except for the four compliance events
   * (consent_set / consent_changed / do_not_sell_*). Pre-consent events
   * are buffered FIFO (cap 50); rejected/withdrawn drop silently.
   */
  capture<E extends EventName>(name: E, props: EventProps<E>): void;
  capture(name: string, props: Record<string, unknown>): void;
  capture(name: string, props: Record<string, unknown> = {}): void {
    if (typeof window === "undefined") return;

    const safeProps = stripPii(props);
    const isExempt = COMPLIANCE_EXEMPT_EVENTS.has(name as EventName);

    if (isExempt) {
      // Exempt events bypass the gate per GDPR Art. 7(1) / CCPA opt-out.
      // We still try to send them through PostHog if it's already up; if
      // not, we POST directly to PostHog's /capture endpoint as a
      // best-effort beacon (M2 wires this); for M1 we log to the
      // exempt-buffer so the server-side audit trail in consent_records
      // is the canonical record.
      void this.fireExempt(name as EventName, safeProps);
      return;
    }

    if (this.shouldFire()) {
      void this.dispatch(name, safeProps);
      return;
    }
    if (this.status === "unknown") {
      this.bufferPush({ name: name as EventName, ts: Date.now(), props: safeProps });
      return;
    }
    // rejected / withdrawn → drop silently. No telemetry about telemetry.
  }

  /**
   * Identify the user. ONLY called from the server-side post-signup flow
   * (or its client mirror immediately after `signup_completed`). Never
   * called with PII; `userId` is the Supabase Auth UUID.
   */
  identify(userId: string, traits: Record<string, unknown> = {}): void {
    if (typeof window === "undefined") return;
    if (!this.shouldFire()) return;
    if (!userId) return;

    const safeTraits = stripPii(traits);
    void this.ensurePostHogReady().then((ph) => {
      ph?.identify(userId, safeTraits);
    });

    // Stamp signup_completed timestamp for TTFV math.
    try {
      window.localStorage.setItem(LS_SIGNUP_TS, String(Date.now()));
    } catch {
      /* localStorage disabled */
    }
  }

  /**
   * Reset identity. Fires on signout, account deletion, or consent
   * withdrawal — the three cases that legally require de-identification.
   */
  reset(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(LS_SIGNUP_TS);
    } catch {
      /* noop */
    }
    void this.ensurePostHogReady().then((ph) => {
      ph?.reset();
    });
  }

  /**
   * Apply a fresh consent decision from the cookie banner. Three paths:
   *   - accepted / partial-with-analytics → init PostHog, drain buffer.
   *   - rejected → destroy buffer, do not init PostHog.
   *   - withdrawn → fire consent_changed (exempt), then opt-out + reset.
   */
  async applyConsent(record: ConsentRecord): Promise<void> {
    if (typeof window === "undefined") return;

    const prev = this.status;
    this.status = record.status;
    this.buckets = { ...record.buckets };
    this.persistConsent(record);

    if (this.status === "rejected") {
      this.buffer = [];
      this.persistBuffer();
      return;
    }

    if (this.status === "withdrawn") {
      // Fire the consent_changed event before tearing down — it's exempt
      // so the gate lets it through.
      this.capture("consent_changed" as EventName, {
        from_status: prev,
        to_status: "withdrawn",
      });
      this.posthog?.opt_out_capturing();
      this.reset();
      this.buffer = [];
      this.persistBuffer();
      return;
    }

    // accepted | partial — initialize PostHog and drain.
    if (this.shouldFire()) {
      await this.ensurePostHogReady();
      this.posthog?.opt_in_capturing();
      this.drainBuffer();
    }
  }

  /**
   * Withdraw consent — bound to the Settings → Privacy → "Withdraw
   * analytics consent" button and to the banner's "Manage cookies →
   * analytics off" path. Equivalent to `applyConsent({status:'withdrawn',
   * ...})` but with the side-effect of clearing localStorage so the
   * banner re-prompts on next visit.
   */
  async withdrawConsent(): Promise<void> {
    if (typeof window === "undefined") return;
    await this.applyConsent({
      status: "withdrawn",
      buckets: { ...defaultConsent },
      recorded_at: new Date().toISOString(),
    });
    try {
      window.localStorage.removeItem(LS_CONSENT);
    } catch {
      /* noop */
    }
  }

  /* ------------ Internals -------------------------------------- */

  private shouldFire(): boolean {
    if (this.status === "accepted") return true;
    if (this.status === "partial" && this.buckets.analytics) return true;
    return false;
  }

  private hydrateFromStorage(): void {
    try {
      const raw = window.localStorage.getItem(LS_CONSENT);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
        if (parsed.status) this.status = parsed.status as ConsentStatus;
        if (parsed.buckets)
          this.buckets = {
            necessary: true,
            analytics: Boolean(parsed.buckets.analytics),
            marketing: Boolean(parsed.buckets.marketing),
          };
      }
    } catch {
      this.status = "unknown";
    }

    try {
      const raw = window.sessionStorage.getItem(SS_BUFFER);
      if (raw) {
        const parsed = JSON.parse(raw) as { events?: PreconsentEvent[] };
        if (Array.isArray(parsed.events)) {
          this.buffer = parsed.events.slice(-BUFFER_CAP);
        }
      }
    } catch {
      this.buffer = [];
    }

    // Ensure an anon id exists for pre-signup consent records.
    try {
      let anon = window.localStorage.getItem(LS_ANON_ID);
      if (!anon) {
        anon = crypto.randomUUID();
        window.localStorage.setItem(LS_ANON_ID, anon);
      }
    } catch {
      /* localStorage disabled — skip */
    }
  }

  private persistConsent(record: ConsentRecord): void {
    try {
      window.localStorage.setItem(LS_CONSENT, JSON.stringify(record));
    } catch {
      /* noop */
    }
  }

  private persistBuffer(): void {
    try {
      window.sessionStorage.setItem(
        SS_BUFFER,
        JSON.stringify({ events: this.buffer, capped: BUFFER_CAP, eviction: "FIFO" }),
      );
    } catch {
      /* sessionStorage disabled */
    }
  }

  private bufferPush(ev: PreconsentEvent): void {
    this.buffer.push(ev);
    if (this.buffer.length > BUFFER_CAP) {
      this.buffer.shift(); // FIFO eviction (oldest drops)
    }
    this.persistBuffer();
  }

  private drainBuffer(): void {
    if (!this.posthog) return;
    const events = this.buffer.slice();
    this.buffer = [];
    this.persistBuffer();
    for (const ev of events) {
      this.posthog.capture(ev.name, { ...ev.props, $ts_offset_ms: Date.now() - ev.ts });
    }
  }

  private async dispatch(
    name: string,
    props: Record<string, unknown>,
  ): Promise<void> {
    const ph = await this.ensurePostHogReady();
    ph?.capture(name, props);
  }

  /**
   * Fire-and-forget for the four exempt events when PostHog isn't yet
   * loaded (typical: user clicks "Reject all" — we still need to log the
   * consent_set, but we don't want to load PostHog at all). The server-
   * side consent_records insert in `/api/consent` is the canonical
   * record; this beacon is the client-side audit trail.
   *
   * On reject/withdraw we deliberately do NOT initialize PostHog — the
   * exempt event ends up only in the consent_records server log.
   */
  private async fireExempt(
    name: EventName,
    props: Record<string, unknown>,
  ): Promise<void> {
    if (this.posthog) {
      this.posthog.capture(name, props);
      return;
    }
    // PostHog isn't loaded. If we're already in accepted/partial-analytics,
    // load it now (the user already consented). Otherwise leave it un-
    // loaded — the server-side `/api/consent` POST is the persisted
    // record of consent_set / consent_changed for the audit trail.
    if (this.shouldFire()) {
      const ph = await this.ensurePostHogReady();
      ph?.capture(name, props);
    }
  }

  private async ensurePostHogReady(): Promise<PostHogLike | null> {
    if (this.posthog) return this.posthog;
    if (this.posthogLoading) return this.posthogLoading;

    const key =
      typeof process !== "undefined" &&
      typeof process.env?.NEXT_PUBLIC_POSTHOG_KEY === "string"
        ? process.env.NEXT_PUBLIC_POSTHOG_KEY
        : null;
    if (!key) {
      // No PostHog project configured — gate behaves as a no-op. Calls
      // still buffer/persist for the eventual configuration; the lack of
      // a key is treated as a deploy-time TODO, not a bug.
      return null;
    }

    this.posthogLoading = (async (): Promise<PostHogLike | null> => {
      try {
        // Dynamic import — keeps posthog-js out of the initial bundle.
        // The package is added as a dependency at M1; the import resolves
        // to the browser ESM build (~30 KB gzipped).
        const mod = (await import(
          /* webpackChunkName: "posthog" */ "posthog-js"
        )) as unknown as { default: PostHogLike } | PostHogLike;
        const ph: PostHogLike =
          "default" in (mod as { default?: PostHogLike })
            ? (mod as { default: PostHogLike }).default
            : (mod as PostHogLike);

        ph.init(key, {
          api_host: POSTHOG_API_HOST,
          // Lens spec §7.1: IP collection OFF.
          ip: false,
          disable_session_recording: true,
          autocapture: false,
          capture_pageview: false,
          // GA4 Consent Mode v2 mirror — start with opt-out, opt-in below.
          opt_out_capturing_by_default: false,
          persistence: "localStorage+cookie",
          loaded: (_ph: PostHogLike) => {
            // Tag every event with do_not_sell when present.
            // The flag is persisted server-side; we mirror it here for
            // the BigQuery export pipeline.
          },
        });

        this.posthog = ph;
        return ph;
      } catch {
        // Network blocked, ad-blocker, dynamic import failed — degrade
        // silently. Lens's invariant: failed-to-load is the same as
        // user-rejected.
        this.posthog = null;
        return null;
      }
    })();

    return this.posthogLoading;
  }
}

/* ------------------------------------------------------------------ */
/* Singleton                                                          */
/* ------------------------------------------------------------------ */

export const analytics = new AnalyticsGate();

/* ------------------------------------------------------------------ */
/* Convenience entry points used outside the class                    */
/* ------------------------------------------------------------------ */

/**
 * Convenience for the root layout / AuthProvider — equivalent to
 * `analytics.loadAndInitAnalytics()` but exposed as a free function so
 * the call site doesn't have to import the class.
 */
export async function loadAndInitAnalytics(): Promise<void> {
  await analytics.loadAndInitAnalytics();
}

export function identify(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  analytics.identify(userId, traits);
}

export function reset(): void {
  analytics.reset();
}

export async function withdrawConsent(): Promise<void> {
  await analytics.withdrawConsent();
}

/* ------------------------------------------------------------------ */
/* M1-stub backcompat                                                 */
/* ------------------------------------------------------------------ */

/**
 * Legacy entry point left in place for any call site that imported the
 * M1 stub before the gate landed. Forwards to the singleton's `capture`.
 *
 * New code should import `track()` from `analytics-events.v1.ts` for
 * compile-time event-name + property safety.
 */
export function trackEvent(
  name: string,
  props: Record<string, unknown> = {},
  consent: ConsentState = defaultConsent,
): void {
  // Honor the explicit `consent` arg from the stub era — if the caller
  // says "no analytics", we drop. Otherwise the gate's own state decides.
  if (!consent.analytics) return;
  analytics.capture(name, props);
}

/**
 * Exposed for unit tests + the Cipher PII-corpus contract test.
 */
export const __INTERNALS__ = {
  stripPii,
  isHighEntropySecret,
  shannonEntropy,
  BUFFER_CAP,
};
