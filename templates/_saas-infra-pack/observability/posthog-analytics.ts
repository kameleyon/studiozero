/**
 * Studio Zero — PostHog client init for product analytics
 *
 * Owned by Lens (per teams/saas.md). Tracks page views, conversion events,
 * funnel drop-off. Same PostHog project as feature flags — single vendor.
 */
"use client";
import posthog from "posthog-js";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return;
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // we manually capture so we can include search params
    persistence: "localStorage+cookie",
    autocapture: false,      // explicit events only — keeps the schema clean
  });
  initialized = true;
}

/** Manual page-view capture. Lift into a layout component to fire on every route change. */
export function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
    if (!initialized) return;
    const url = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/** Identify a user — call on sign-in. */
export function identify(userId: string, properties?: Record<string, string | number | boolean>) {
  initAnalytics();
  if (initialized) posthog.identify(userId, properties);
}

/** Reset on sign-out. */
export function reset() {
  if (initialized) posthog.reset();
}

/** Capture a domain event — keep names <snake_case>, <action>_<noun>. */
export function track(event: string, properties?: Record<string, unknown>) {
  initAnalytics();
  if (initialized) posthog.capture(event, properties);
}
