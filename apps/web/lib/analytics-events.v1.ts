/**
 * Typed analytics event registry — v1.
 *
 * Phase 9 M1 Batch 3. Co-authored by Hook (E-005 variant-assignment +
 * funnel tracking) and Lens (Lens spec §2 taxonomy + dispatcher).
 *
 * Convention (locked):
 *   - Every event in the funnel has a row in EVENT_REGISTRY.
 *   - Adding a new event = a) new key in EventPropsMap, b) new row in
 *     EVENT_REGISTRY, c) contract test in
 *     `tests/integration/funnel-instrumentation.spec.ts` if funnel-critical,
 *     d) markdown row in marketing/analytics-spec.md §2.
 *   - Strings are kebab/snake_case keys; property types are zod-free for M1
 *     (Lens M2 follow-up wires zod schemas in
 *     `runner/schemas/analytics-events.v1.ts`).
 *   - PII-stripping happens in `analytics-gate.ts` before send. This file
 *     declares the *shape*; the gate enforces what survives.
 *
 * Lens additions (Batch 3):
 *   - BYOK / GitHub install / re-audit / cancel / dispute / compliance
 *     events from analytics-spec.md §2.2 + §2.3 + §2.7.
 *   - `COMPLIANCE_EXEMPT_EVENTS` set: the four consent-gate exemptions
 *     (consent_set, consent_changed, do_not_sell_clicked,
 *     do_not_sell_request_submitted). Rationale in spec §2.7.
 *   - `track<E>()` typed dispatcher — single import surface for every
 *     call site. Resolves to `analytics.capture()` on the client; logs a
 *     structured marker on the server (M2 wires posthog-node).
 *
 * Cross-refs:
 *   - `marketing/analytics-spec.md` §2 (canonical taxonomy)
 *   - `marketing/experiments-backlog.md` §3 (Hook's funnel event spec)
 *   - `apps/web/lib/analytics-gate.ts` (consent gate — wraps every fire)
 */

/** Experiment variant assignment label. Sticky per user via PostHog. */
export type ExperimentVariant = "A" | "B" | "control" | "treatment";

/** PRD §7.2 audit verdict trichotomy. */
export type Verdict = "PASS" | "PASS WITH FIXES" | "FAIL";

/** Three execution modes per PRD §8. */
export type Mode = "byok" | "cli" | "managed";

/** Shape of a single UTM touch — stored in users.acquisition_attribution. */
export interface UtmTouch {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  ts: string;
  referrer_host: string | null;
}

/**
 * Per-event property maps. Keys are the canonical event names; values are
 * the typed property bag the event MUST carry. Required keys = no `?:`;
 * optional context keys use `?:`. No string-bagged `extra` field.
 */
export interface EventPropsMap {
  // -------- Acquisition / signup --------
  signup_started: {
    method: "email" | "oauth_google" | "oauth_github";
    /** Sticky per-tab id used to join pre-consent attribution. */
    utm_attribution_session_id?: string;
    experiment_variant?: ExperimentVariant;
  };
  signup_completed: {
    user_id: string;
    method: "email" | "oauth_google" | "oauth_github";
    /** True iff email verified at signup-complete time. Variant B fires
     *  this with `email_verified: false` because verification is deferred. */
    email_verified: boolean;
    time_to_completion_sec?: number;
    /** E-005 (defer-email-verify). Variant A = require-verify;
     *  Variant B = defer-verify. */
    experiment_variant?: ExperimentVariant;
    attribution_first_touch?: UtmTouch | null;
    attribution_last_touch?: UtmTouch | null;
  };
  email_verification_sent: { email_id?: string };
  email_verification_completed: {
    user_id: string;
    latency_ms_since_signup: number;
  };
  /**
   * Fired exactly once when a user is first assigned to an experiment.
   * Hook owns assignment; PostHog's `$feature_flag_called` event mirrors
   * this but ours is explicit so the funnel CTE in the dashboard can
   * join on a single column without parsing the PH magic event.
   */
  experiment_exposure: {
    experiment_key: string;
    variant: ExperimentVariant;
    user_id?: string;
  };

  // -------- Onboarding --------
  mode_picker_viewed: { experiment_variant?: ExperimentVariant };
  mode_picked: {
    mode: Mode;
    time_on_page_sec?: number;
    experiment_variant?: ExperimentVariant;
  };
  byok_key_validated: {
    tenant_id: string;
    success: boolean;
    latency_ms?: number;
  };
  byok_key_failed: {
    tenant_id?: string;
    failure_reason: "invalid_key" | "rate_limited" | "network" | "unknown";
    latency_ms?: number;
  };
  github_app_install_completed: {
    tenant_id: string;
    /** HMAC-hashed installation id (Cipher Fix-3b). Raw id never fired. */
    installation_id_hash: string;
  };

  // -------- Audit --------
  audit_started: {
    run_id: string;
    mode: Mode;
    product: "surface" | "code" | "full";
    depth: "quick" | "comprehensive" | "custom";
    tier?: string;
    experiment_variant?: ExperimentVariant;
  };
  audit_completed: {
    run_id: string;
    verdict: Verdict;
    score: number;
    runtime_ms: number;
    findings_count: number;
    experiment_variant?: ExperimentVariant;
  };
  /**
   * THE AHA EVENT. Defines TTFV terminus. Carries `ttfv_ms` (signup_completed →
   * verdict_shown wall clock) so the funnel CTE doesn't have to do a
   * self-join. `is_first_verdict_for_user` is computed server-side and
   * passed through in the verdict-render payload (spec §9).
   */
  verdict_shown: {
    run_id: string;
    verdict: Verdict;
    score: number;
    findings_count: number;
    is_first_verdict_for_user: boolean;
    /** Milliseconds between signup_completed and this render. May be null
     *  when signup_completed_ts isn't in localStorage (re-audit, signed-in
     *  cross-device, ad-blocker race). */
    ttfv_ms: number | null;
    experiment_variant?: ExperimentVariant;
  };
  re_audit_started: {
    project_id: string;
    days_since_first_audit: number;
    previous_verdict?: Verdict | null;
    previous_score?: number | null;
  };
  audit_failed_terminal: {
    run_id: string;
    failure_code: string;
    retry_count: number;
  };

  // -------- Conversion --------
  upgrade_card_shown: {
    run_id?: string;
    from_tier: string;
    to_tier: string;
    surface: "verdict" | "email_e2" | "pricing_page" | "nav_token_chip" | string;
    experiment_variant?: ExperimentVariant;
  };
  upgrade_clicked: {
    from_tier: string;
    to_tier: string;
    surface: string;
    run_id?: string;
    experiment_variant?: ExperimentVariant;
  };
  checkout_started: {
    tier: string;
    billing_period: "monthly" | "annual";
    run_id?: string;
  };
  paid_conversion: {
    user_id?: string;
    tier: string;
    mode: Mode;
    currency: string;
    amount_cents: number;
    is_annual?: boolean;
    plan_family?: "byok" | "managed" | "cli";
    days_since_signup?: number;
    experiment_variant?: ExperimentVariant;
  };

  // -------- Retention + lifecycle --------
  e_email_sent: {
    email_id: "e1" | "e2" | "e3" | "e4" | "e5";
    user_id: string;
  };
  /** Resend webhook → email.opened. M4 Batch 1 (Forge + Lens). */
  e_email_opened: {
    user_id: string;
    provider_message_id: string;
  };
  /** Resend webhook → email.clicked. */
  e_email_clicked: {
    user_id: string;
    provider_message_id: string;
  };
  /** Resend webhook → email.unsubscribed OR /api/email/unsubscribe handler. */
  e_email_unsubscribed: {
    user_id: string;
    source: "resend_one_click" | "email_link" | "settings_page";
  };
  nps_survey_submitted: {
    score: number;
    segment: "detractor" | "passive" | "promoter";
  };

  // -------- V1.5 Auto-PR --------
  auto_pr_upcharge_clicked: {
    run_id: string;
    findings_count_in_bundle: number;
  };
  auto_pr_purchase_completed: {
    run_id: string;
    amount_cents: number;
  };
  /** V1.5 Batch 1: re-audit gate PASS → PR opened. Wired in
   *  `apps/runner/src/build/pr-opener.ts openAutoPr()` after the GH
   *  pull-create call succeeds. */
  auto_pr_opened: {
    run_id: string;
    fix_pr_job_id: string;
    pr_number: number;
    findings_in_pr: number;
  };
  /** V1.5 Batch 1: customer merged the PR. Wired in the GitHub
   *  webhook handler `pull_request.merged` / `pull_request.closed`
   *  events. */
  auto_pr_merged: {
    run_id: string;
    fix_pr_job_id: string;
    pr_number: number;
  };
  /** V1.5 Batch 1: customer closed the PR without merging. Wired in
   *  the GitHub webhook handler for `pull_request.closed` where
   *  `pull_request.merged === false`. */
  auto_pr_closed_unmerged: {
    run_id: string;
    fix_pr_job_id: string;
    pr_number: number;
  };

  // -------- Compliance + lifecycle (consent-exempt subset) --------
  /** GDPR Art. 7(1) demonstrability — exempt from consent gate. */
  consent_set: {
    status: "accepted" | "rejected" | "partial";
    buckets?: { analytics: boolean; marketing: boolean; necessary: true };
    /** Cookie/session anon id when fired pre-signup. */
    anon_id?: string;
  };
  /** GDPR Art. 7(3) withdrawal — exempt from consent gate. */
  consent_changed: {
    from_status: string;
    to_status: string;
    buckets_changed?: string[];
  };
  /** CCPA legal right — exempt from consent gate. */
  do_not_sell_clicked: Record<string, never>;
  /** CCPA legal right — exempt from consent gate. */
  do_not_sell_request_submitted: { user_id: string };
  cancel_started: {
    tier: string;
    days_active: number;
    current_period_end_iso?: string;
  };
  dispute_finding_started: {
    run_id: string;
    finding_id?: string;
  };
}

/** Compile-time union of every event name we ship. */
export type EventName = keyof EventPropsMap;

/** Strongly-typed prop lookup. */
export type EventProps<E extends EventName> = EventPropsMap[E];

/**
 * Discriminated-union form of the registry — handy when a generic
 * function returns one of many events and TypeScript needs to narrow.
 * Equivalent to `{ name: 'foo'; properties: EventPropsMap['foo'] } | ...`.
 */
export type AnalyticsEvent = {
  [K in EventName]: { name: K; properties: EventPropsMap[K] };
}[EventName];

/* ------------------------------------------------------------------ */
/* COMPLIANCE_EXEMPT_EVENTS — analytics-spec.md §2.7                  */
/* ------------------------------------------------------------------ */

/**
 * The four events that bypass the consent gate. Rationale:
 *   - consent_set + consent_changed → GDPR Art. 7(1) demonstrability.
 *     We MUST be able to prove the user consented; recording the act of
 *     consent is itself the legal basis for processing subsequent events.
 *   - do_not_sell_clicked + do_not_sell_request_submitted → CCPA opt-out
 *     is a legal right; the request itself must be observable for the
 *     verification record (regardless of whether the user has consented
 *     to analytics).
 *
 * The set is enforced at runtime in `analytics-gate.ts capture()`. Adding
 * a new exempt event REQUIRES Comply sign-off + a row in spec §2.7.
 */
export const COMPLIANCE_EXEMPT_EVENTS: ReadonlySet<EventName> = new Set<EventName>([
  "consent_set",
  "consent_changed",
  "do_not_sell_clicked",
  "do_not_sell_request_submitted",
]);

/* ------------------------------------------------------------------ */
/* Registry rows                                                      */
/* ------------------------------------------------------------------ */

export interface EventRegistryRow {
  name: EventName;
  funnel_critical: boolean;
  /** Fires-where comment — keeps the grep audit honest. */
  fires_from: string;
  /** 'analytics' = gated; 'exempt' = legal-basis bypass. */
  consent: "analytics" | "exempt";
}

export const EVENT_REGISTRY: readonly EventRegistryRow[] = [
  // --- Acquisition / signup ---
  {
    name: "signup_started",
    funnel_critical: true,
    fires_from: "apps/web/app/signup/page.tsx — form submit + OAuth click",
    consent: "analytics",
  },
  {
    name: "signup_completed",
    funnel_critical: true,
    fires_from:
      "apps/web/app/auth/callback/route.ts (server side after exchange) " +
      "+ apps/web/app/signup/page.tsx (immediate session path)",
    consent: "analytics",
  },
  {
    name: "email_verification_sent",
    funnel_critical: false,
    fires_from: "Supabase webhook → app/api/webhooks/* (M2)",
    consent: "analytics",
  },
  {
    name: "email_verification_completed",
    funnel_critical: false,
    fires_from: "apps/web/app/auth/callback/route.ts on session exchange",
    consent: "analytics",
  },
  {
    name: "experiment_exposure",
    funnel_critical: true,
    fires_from: "apps/web/lib/experiment.ts — once per (user × experiment_key)",
    consent: "analytics",
  },

  // --- Onboarding ---
  {
    name: "mode_picker_viewed",
    funnel_critical: false,
    fires_from: "apps/web/app/app/onboarding/mode/page.tsx — mount",
    consent: "analytics",
  },
  {
    name: "mode_picked",
    funnel_critical: true,
    fires_from: "apps/web/app/app/onboarding/mode/page.tsx — handleContinue",
    consent: "analytics",
  },
  {
    name: "byok_key_validated",
    funnel_critical: true,
    fires_from: "apps/web/app/app/onboarding/byok/page.tsx — on 200 response",
    consent: "analytics",
  },
  {
    name: "byok_key_failed",
    funnel_critical: false,
    fires_from: "apps/web/app/app/onboarding/byok/page.tsx — on error response",
    consent: "analytics",
  },
  {
    name: "github_app_install_completed",
    funnel_critical: true,
    fires_from: "apps/web/app/auth/install/github/route.ts (server)",
    consent: "analytics",
  },

  // --- Audit ---
  {
    name: "audit_started",
    funnel_critical: true,
    fires_from: "apps/web/app/api/runs/route.ts POST handler",
    consent: "analytics",
  },
  {
    name: "audit_completed",
    funnel_critical: true,
    fires_from:
      "apps/web/app/app/audits/[runId]/page.tsx — VerdictScreen mount " +
      "(client mirror of server runner emit)",
    consent: "analytics",
  },
  {
    name: "verdict_shown",
    funnel_critical: true,
    fires_from:
      "apps/web/app/app/audits/[runId]/page.tsx — VerdictScreen useEffect mount",
    consent: "analytics",
  },
  {
    name: "re_audit_started",
    funnel_critical: false,
    fires_from:
      "apps/web/app/app/projects/[projectId]/re-audit/page.tsx — POST runs",
    consent: "analytics",
  },
  {
    name: "audit_failed_terminal",
    funnel_critical: false,
    fires_from: "runner emit → Realtime listener (M2)",
    consent: "analytics",
  },

  // --- Conversion ---
  {
    name: "upgrade_card_shown",
    funnel_critical: false,
    fires_from: "apps/web/app/app/audits/[runId]/upgrade/page.tsx — mount",
    consent: "analytics",
  },
  {
    name: "upgrade_clicked",
    funnel_critical: true,
    fires_from: "apps/web/app/app/audits/[runId]/upgrade/page.tsx — CTA click",
    consent: "analytics",
  },
  {
    name: "checkout_started",
    funnel_critical: false,
    fires_from: "POST /api/billing/checkout-session redirect handler (M2)",
    consent: "analytics",
  },
  {
    name: "paid_conversion",
    funnel_critical: true,
    fires_from:
      "apps/web/app/api/webhooks/stripe/route.ts — checkout.session.completed",
    consent: "analytics",
  },

  // --- Retention + lifecycle ---
  {
    name: "e_email_sent",
    funnel_critical: false,
    fires_from: "apps/web/lib/email-triggers/_common.ts — sendLifecycleEmail (M4 B1)",
    consent: "analytics",
  },
  {
    name: "e_email_opened",
    funnel_critical: false,
    fires_from: "apps/web/app/api/webhooks/resend/route.ts — email.opened (M4 B1)",
    consent: "analytics",
  },
  {
    name: "e_email_clicked",
    funnel_critical: false,
    fires_from: "apps/web/app/api/webhooks/resend/route.ts — email.clicked (M4 B1)",
    consent: "analytics",
  },
  {
    name: "e_email_unsubscribed",
    funnel_critical: false,
    fires_from:
      "apps/web/app/api/webhooks/resend/route.ts (Resend) + " +
      "apps/web/app/api/email/unsubscribe/route.ts (email link) (M4 B1)",
    consent: "analytics",
  },
  {
    name: "nps_survey_submitted",
    funnel_critical: false,
    fires_from: "/app/settings — day-30 in-app survey (M4)",
    consent: "analytics",
  },

  // --- V1.5 Auto-PR ---
  {
    name: "auto_pr_upcharge_clicked",
    funnel_critical: false,
    fires_from: "apps/web/components/VerdictCard.tsx — fixes-upcharge CTA (V1.5)",
    consent: "analytics",
  },
  {
    name: "auto_pr_purchase_completed",
    funnel_critical: false,
    fires_from:
      "apps/web/app/api/webhooks/stripe/route.ts — payment_intent.succeeded for auto-PR (V1.5)",
    consent: "analytics",
  },
  {
    name: "auto_pr_opened",
    funnel_critical: false,
    fires_from:
      "apps/runner/src/build/pr-opener.ts openAutoPr() — after GH pull-create succeeds (V1.5)",
    consent: "analytics",
  },
  {
    name: "auto_pr_merged",
    funnel_critical: false,
    fires_from:
      "apps/web/app/api/webhooks/github/route.ts — pull_request.merged (V1.5)",
    consent: "analytics",
  },
  {
    name: "auto_pr_closed_unmerged",
    funnel_critical: false,
    fires_from:
      "apps/web/app/api/webhooks/github/route.ts — pull_request.closed where merged=false (V1.5)",
    consent: "analytics",
  },

  // --- Compliance (4 exempt + 2 gated) ---
  {
    name: "consent_set",
    funnel_critical: false,
    fires_from: "apps/web/components/CookieBanner.tsx — first decision",
    consent: "exempt",
  },
  {
    name: "consent_changed",
    funnel_critical: false,
    fires_from: "apps/web/components/CookieBanner.tsx — re-open + change",
    consent: "exempt",
  },
  {
    name: "do_not_sell_clicked",
    funnel_critical: false,
    fires_from: "Footer 'Do Not Sell or Share' link (M2)",
    consent: "exempt",
  },
  {
    name: "do_not_sell_request_submitted",
    funnel_critical: false,
    fires_from: "POST /api/privacy/do-not-sell (M2)",
    consent: "exempt",
  },
  {
    name: "cancel_started",
    funnel_critical: false,
    fires_from: "/app/settings/billing/cancel — mount (FTC Click-to-Cancel)",
    consent: "analytics",
  },
  {
    name: "dispute_finding_started",
    funnel_critical: false,
    fires_from:
      "apps/web/components/FindingsRow.tsx — Dispute CTA click (PRD §11.2)",
    consent: "analytics",
  },
] as const;

/**
 * Set of event names that the funnel walker must observe in order.
 *
 * Order reflects production reality:
 *   - `signup_started` fires on form mount.
 *   - `experiment_exposure` fires immediately after `supabase.auth.signUp()`
 *     returns, when `assignVariant()` resolves the user-bound variant
 *     for the first time (E-005 is bucketed per user_id).
 *   - `signup_completed` then fires with the variant tag attached.
 *   - The rest of the funnel follows the audit pipeline.
 */
export const FUNNEL_HAPPY_PATH: readonly EventName[] = [
  "signup_started",
  "experiment_exposure",
  "signup_completed",
  "mode_picked",
  "audit_started",
  "audit_completed",
  "verdict_shown",
] as const;

/* ------------------------------------------------------------------ */
/* track() — single typed dispatcher                                  */
/* ------------------------------------------------------------------ */

/**
 * Typed track entry point. Two shapes accepted:
 *   1. `track('signup_started', { method: 'email' })` — positional
 *   2. `track({ name: 'signup_started', properties: { method: 'email' } })`
 *      — discriminated-union form (handy when forwarding events through
 *      a queue or contract test).
 *
 * Forwards to `analytics-gate.capture()` on the client (consent-gated +
 * buffered). On the server, logs a structured marker — M2 will wire
 * posthog-node.
 *
 * The function is async because `analytics-gate` is dynamically imported
 * so server bundles that fire events don't pull posthog-js into their
 * module graph.
 */
export async function track<E extends EventName>(
  name: E,
  properties: EventProps<E>,
): Promise<void>;
export async function track<E extends AnalyticsEvent>(event: E): Promise<void>;
export async function track<E extends EventName>(
  nameOrEvent: E | AnalyticsEvent,
  maybeProps?: EventProps<E>,
): Promise<void> {
  const name =
    typeof nameOrEvent === "string"
      ? (nameOrEvent as EventName)
      : nameOrEvent.name;
  const properties =
    typeof nameOrEvent === "string"
      ? (maybeProps ?? ({} as Record<string, unknown>))
      : (nameOrEvent.properties as Record<string, unknown>);

  if (typeof window === "undefined") {
    // Server-side fire — M2 routes through posthog-node. For now we log
    // a structured marker so the funnel can be grep'd from server logs.
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        ts: Date.now(),
        kind: "analytics_server_event",
        event: name,
        properties,
      }),
    );
    return;
  }

  // Client-side — dynamic import to avoid SSR-time evaluation. The gate
  // owns the consent check + pre-consent buffer + PII strip.
  const { analytics } = await import("./analytics-gate");
  analytics.capture(name, properties as Record<string, unknown>);
}
