/**
 * Studio Zero — AI Act Art. 50 disclosure constants (CLI copy).
 *
 * Phase 9 M3 Batch 1 (Forge). The CLI mirrors the web app's M0 disclosure
 * header machinery (`apps/web/lib/ai-disclosure.ts`) so outbound requests
 * to `/api/cli/*` carry the same `X-AI-Generated: studio-zero` header.
 *
 * Why duplicate the constant instead of importing from `apps/web`:
 *  - the CLI is a published npm binary; pulling in the web app's Next.js
 *    server modules would balloon the install footprint and create a
 *    cyclic workspace import.
 *  - the values are stable strings locked by Comply + Herald at M0.
 *    Drift between the two surfaces is caught by
 *    `tests/integration/disclosure-headers.spec.ts` (Verify, M0 gate).
 *
 * If these values ever change, both files MUST update together. The
 * cross-surface test snapshot is the gate.
 */

export const AI_DISCLOSURE_HEADER_NAME = "X-AI-Generated" as const;
export const AI_DISCLOSURE_HEADER_VALUE = "studio-zero" as const;
