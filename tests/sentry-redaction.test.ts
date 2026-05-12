/**
 * Sentry-redaction tests — root-Vitest entry point.
 *
 * The canonical test file lives at `apps/web/lib/sentry-redaction.test.ts`
 * (co-located with the module under test). The repo-root Vitest config
 * excludes `apps/**` from its glob so app-local Vitest harnesses stay
 * isolated, but this redaction surface is M1-blocking (Cipher Fix-2 +
 * threat-model §3.3 secret-exfil gate) so we mirror the suite here as a
 * thin re-export until the workspace-level test runner lands at M2.
 *
 * Owner: Cipher (Phase 9 M1).
 * Cross-ref: `architecture/llm-gateway.md` + `architecture/threat-model.md`
 * §3.3 + `runner/fixtures/secret-exfil-corpus/` (≥40 fixtures at M1).
 */

// Re-run the canonical suite. Each describe/it inside that file registers
// itself with the active Vitest runner — importing it here is enough.
import "../apps/web/lib/sentry-redaction.test.js";
