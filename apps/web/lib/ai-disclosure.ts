/**
 * AI Act Art. 50 interim disclosure machinery.
 *
 * Closes PRD §11.3 + §14.5 + Phase-5 Comply ticket #18 + M0 risk R7.
 * Binds 2026-08-02 — we ship at M0, not at V1.5 with the full system card.
 *
 * Two surfaces:
 *   1. HTTP responses carry `X-AI-Generated: studio-zero` — wired in
 *      `next.config.ts` `headers()` so every page + API route gets it
 *      without per-route code. This module exposes the canonical strings
 *      so route handlers can re-assert the header explicitly when they
 *      bypass the framework default (rare; mostly belt-and-braces).
 *   2. HTML pages carry `<meta name="ai-generated" content="studio-zero">`
 *      — wired via `app/layout.tsx` `generateMetadata()` so every page
 *      under the root layout inherits it. `aiGeneratedMeta` is the
 *      JSX-ready record used there.
 *
 * Owner: Forge (impl) · Comply (content + system-card content) · Herald
 * (readability when the AI System Card v0.1 placeholder copy lands).
 *
 * Verified by `tests/integration/disclosure-headers.spec.ts` at M0 exit.
 */

export const AI_DISCLOSURE_HEADER_NAME = "X-AI-Generated" as const;
export const AI_DISCLOSURE_HEADER_VALUE = "studio-zero" as const;

export const AI_DISCLOSURE_META_NAME = "ai-generated" as const;
export const AI_DISCLOSURE_META_CONTENT = "studio-zero" as const;

/**
 * Headers object suitable for `Response` constructor or `NextResponse`.
 * Use in route handlers that fabricate a `Response` directly.
 */
export const aiDisclosureHeaders: Readonly<Record<string, string>> = Object.freeze({
  [AI_DISCLOSURE_HEADER_NAME]: AI_DISCLOSURE_HEADER_VALUE,
});

/**
 * Meta-tag record for Next.js `Metadata.other`. Layout merges this into
 * the document head so the `<meta name="ai-generated">` tag lands on
 * every page.
 */
export const aiDisclosureMeta: Readonly<Record<string, string>> = Object.freeze({
  [AI_DISCLOSURE_META_NAME]: AI_DISCLOSURE_META_CONTENT,
});

/**
 * Convenience: returns the headers as a plain object so callers can spread
 * them into `new Response(body, { headers: { ...aiDisclosure(), ... } })`.
 */
export function aiDisclosure(): Record<string, string> {
  return { ...aiDisclosureHeaders };
}
