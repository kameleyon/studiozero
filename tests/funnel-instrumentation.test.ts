/**
 * Funnel-instrumentation tests — root-Vitest entry point.
 *
 * Canonical spec lives at
 *   `apps/web/tests/integration/funnel-instrumentation.spec.ts`
 * The repo-root Vitest config excludes `apps/**` so app-local Vitest
 * harnesses stay isolated, but this surface is M1-blocking (Hook's
 * E-005 funnel + Lens's analytics-events.v1.ts registry) so we mirror
 * the suite here as a thin re-import until the workspace-level test
 * runner lands at M2 — same pattern as `tests/sentry-redaction.test.ts`.
 *
 * Owners: Hook (E-005 + funnel) + Lens (typed taxonomy).
 * Cross-ref: `marketing/posthog-flags.md` §2.9 (test ownership row).
 */

// Re-run the canonical suite. Each describe/it inside that file registers
// itself with the active Vitest runner — importing it here is enough.
import "../apps/web/tests/integration/funnel-instrumentation.spec.js";
