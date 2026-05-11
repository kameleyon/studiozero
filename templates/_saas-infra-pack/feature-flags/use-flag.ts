/**
 * Studio Zero — Client-side feature flag hook (PostHog browser SDK)
 *
 * For client components only. Server components / Server Actions / API routes
 * should use posthog-flags.ts (server-side eval).
 */
"use client";
import { useEffect, useState } from "react";
import posthog from "posthog-js";

let posthogInitialized = false;

function initPosthog() {
  if (posthogInitialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return;
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // Lens handles this explicitly
    persistence: "localStorage+cookie",
  });
  posthogInitialized = true;
}

/**
 * Reactive boolean flag hook. Updates when PostHog re-evaluates.
 * Defaults to false until PostHog has loaded — fail-closed.
 */
export function useFlag(flagKey: string, defaultValue = false): boolean {
  const [enabled, setEnabled] = useState<boolean>(defaultValue);

  useEffect(() => {
    initPosthog();
    if (!posthogInitialized) {
      setEnabled(defaultValue);
      return;
    }
    const evaluate = () => {
      const result = posthog.isFeatureEnabled(flagKey);
      setEnabled(result === true);
    };
    evaluate();
    posthog.onFeatureFlags(evaluate);
    // PostHog doesn't expose an unsubscribe — handler stays for the page lifetime
  }, [flagKey, defaultValue]);

  return enabled;
}
