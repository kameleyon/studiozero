/**
 * Experiment assignment + sticky cohort resolution — Phase 9 M1 Batch 3.
 *
 * Owner: Hook (CRO). This module is the single decision point for any
 * A/B test in the Studio Zero web app. Call-sites pass an experiment key;
 * this module returns a sticky variant assignment, fires the
 * `experiment_exposure` event once per user, and exposes the variant
 * label for downstream event-property tagging.
 *
 * Sticky assignment:
 *   1. If PostHog client is loaded and returns a flag value, that wins
 *      (PostHog persists variant assignment in localStorage by default
 *      — see https://posthog.com/docs/feature-flags/local-evaluation).
 *   2. Else, fall back to a deterministic FNV-1a hash of (userId,
 *      experimentKey). Same input → same variant forever. CI + dev runs
 *      without PostHog env are reproducible.
 *   3. Else (no user_id available), bucket on an anon cookie/uuid that
 *      is also written to localStorage; this preserves stickiness for
 *      anonymous traffic across the same browser session.
 *
 * Hard rules:
 *   - Never call this on the server. SSR returns the control variant.
 *   - Variant assignment fires `experiment_exposure` exactly once per
 *     (user × experiment_key) per page-load. The dedup set lives in
 *     `posthog-client.ts`.
 *   - The function is pure (modulo the side-effecting exposure event)
 *     so call-sites can safely use it inside `useMemo`.
 *
 * Cross-refs:
 *   - `marketing/experiments-backlog.md` E-005 row
 *   - `marketing/posthog-flags.md` (canonical flag config)
 *   - `apps/web/lib/posthog-client.ts` (transport + dedup state)
 */
import {
  fireExposureOnce,
  getFeatureFlag,
} from "./posthog-client";

import type { ExperimentVariant } from "./analytics-events.v1";

/**
 * Canonical experiment keys. Each row in `experiments-backlog.md` that
 * goes live gets a key here. Adding an experiment without registering
 * it here is a typecheck error — taxonomy lock.
 */
export const EXPERIMENT_KEYS = {
  DEFER_EMAIL_VERIFY: "defer-email-verify-experiment",
} as const;

export type ExperimentKey =
  (typeof EXPERIMENT_KEYS)[keyof typeof EXPERIMENT_KEYS];

interface ExperimentConfig {
  /** Sticky cookie/localStorage key for anonymous bucketing fallback. */
  anonBucketKey: string;
  /** Variants in fixed order — index 0 is control. */
  variants: readonly ExperimentVariant[];
  /** Bucket weights summing to 1.0; same length as `variants`. */
  weights: readonly number[];
}

const REGISTRY: Record<ExperimentKey, ExperimentConfig> = {
  [EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY]: {
    anonBucketKey: "sz.exp.defer-email-verify.bucket",
    variants: ["A", "B"],
    weights: [0.5, 0.5],
  },
};

/**
 * FNV-1a 32-bit hash. Deterministic across browser engines + node.
 * Used as the fallback bucket function when PostHog is unreachable so
 * dev/CI runs assign the same variant every time for the same user_id.
 */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickByWeight(
  rand01: number,
  weights: readonly number[],
): number {
  let acc = 0;
  for (let i = 0; i < weights.length; i += 1) {
    acc += weights[i] ?? 0;
    if (rand01 < acc) return i;
  }
  return weights.length - 1;
}

function getOrCreateAnonBucket(storageKey: string): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const cached = window.localStorage.getItem(storageKey);
    if (cached) return cached;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, fresh);
    return fresh;
  } catch {
    return `anon-${Date.now()}`;
  }
}

/**
 * Resolve a sticky variant for an experiment. Fires `experiment_exposure`
 * exactly once per (user × key) tuple per page-load.
 *
 * Returns the variant label ('A' or 'B' for two-arm tests). Call-sites
 * that want a more semantic name should map the label themselves.
 */
export function assignVariant(args: {
  key: ExperimentKey;
  userId?: string | null;
}): ExperimentVariant {
  const config = REGISTRY[args.key];

  // SSR: always control. The client will re-resolve after hydration.
  if (typeof window === "undefined") {
    return config.variants[0] ?? "A";
  }

  // 1) PostHog wins when available.
  let variant: ExperimentVariant | null = null;
  const flag = getFeatureFlag(args.key);
  if (typeof flag === "string") {
    // PostHog returns the variant key. Normalize to A/B if the keys
    // match our convention; otherwise pass through.
    const upper = flag.toUpperCase();
    if (upper === "A" || upper === "B") {
      variant = upper;
    } else if (
      upper === "CONTROL" ||
      upper === "TREATMENT"
    ) {
      variant = upper.toLowerCase() as ExperimentVariant;
    } else {
      variant = (flag as ExperimentVariant) ?? null;
    }
  }

  // 2) Deterministic hash fallback.
  if (!variant) {
    const bucketSeed =
      args.userId && args.userId.length > 0
        ? args.userId
        : getOrCreateAnonBucket(config.anonBucketKey);
    const h = fnv1a(`${args.key}:${bucketSeed}`);
    const rand01 = (h % 10_000) / 10_000;
    const idx = pickByWeight(rand01, config.weights);
    variant = config.variants[idx] ?? config.variants[0] ?? "A";
  }

  fireExposureOnce({
    experimentKey: args.key,
    variant,
    userId: args.userId ?? undefined,
  });

  return variant;
}
