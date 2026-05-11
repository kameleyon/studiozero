/**
 * Studio Zero — Feature Flags via PostHog
 *
 * Server-side only. Flags evaluated against an authenticated user's id +
 * properties. PostHog handles flag definitions, percent rollouts, and
 * targeting rules in its dashboard.
 *
 * Why PostHog: it's already pulled in for analytics (per Lens), so flags
 * cost no additional vendor or SDK. Alternative: Statsig, LaunchDarkly,
 * Vercel Edge Config — pick per project; this file abstracts the surface.
 */
import { PostHog } from "posthog-node";

const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";

if (!apiKey) {
  throw new Error("POSTHOG_API_KEY is required for feature flags");
}

const client = new PostHog(apiKey, {
  host,
  flushAt: 1,        // server-side: don't batch — every flag eval matters
  flushInterval: 0,  //               flush immediately
});

export interface FlagContext {
  userId: string;
  properties?: Record<string, string | number | boolean>;
  groups?: Record<string, string>; // e.g. { tenant: "acme-corp" }
}

/** Boolean feature flag. Returns false if PostHog is unreachable. */
export async function isEnabled(flagKey: string, ctx: FlagContext): Promise<boolean> {
  try {
    const result = await client.isFeatureEnabled(flagKey, ctx.userId, {
      groups: ctx.groups,
      personProperties: ctx.properties,
    });
    return result === true;
  } catch (err) {
    console.error(`[feature-flag] ${flagKey} eval failed:`, err);
    return false; // fail-closed — never accidentally enable a flag on error
  }
}

/** Multivariate flag — returns the variant key or null. */
export async function getVariant(flagKey: string, ctx: FlagContext): Promise<string | null> {
  try {
    const result = await client.getFeatureFlag(flagKey, ctx.userId, {
      groups: ctx.groups,
      personProperties: ctx.properties,
    });
    return typeof result === "string" ? result : null;
  } catch (err) {
    console.error(`[feature-flag] ${flagKey} variant eval failed:`, err);
    return null;
  }
}

/** Call before process exit to flush any buffered events. */
export async function shutdownFlags() {
  await client.shutdown();
}
