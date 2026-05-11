# Feature Flags (PostHog)

Server-side flags via `posthog-flags.ts`. Client-side reactive flags via `use-flag.ts`.

## Why PostHog
Already pulled in for analytics (per Lens). One vendor, one SDK, no extra cost. Switch to Statsig / LaunchDarkly / Vercel Edge Config if your scale or pricing model demands.

## Setup
```bash
npm install posthog-node posthog-js
```

```env
POSTHOG_API_KEY=phc_...           # server-side
NEXT_PUBLIC_POSTHOG_KEY=phc_...   # client-side (same key)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Usage

```ts
// Server component / API route
import { isEnabled } from "@/lib/feature-flags/posthog-flags";
const showNewFlow = await isEnabled("new-onboarding-v2", { userId, properties: { plan } });
```

```tsx
// Client component
"use client";
import { useFlag } from "@/lib/feature-flags/use-flag";
const showBeta = useFlag("beta-features", false);
return showBeta ? <BetaUi /> : <LegacyUi />;
```

## Failure mode
Both helpers fail closed — if PostHog is unreachable, the flag returns `false`. Never accidentally enable a flag because the network was down.

## Audit gate
Hook (conversion) runs A/B tests via PostHog Experiments. Same flag store, no extra wiring.
