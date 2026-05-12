/**
 * Studio Zero — D7 watermark text constants.
 *
 * Phase 9 M3 Batch 1 (Forge). The watermark is **transparency**, not a
 * security claim (PRD §17 D7). Copy is Herald-locked. SC 3.2.4 requires
 * the watermark to render identically across every surface: web verdict
 * page, V1.5 PR body, Markdown export, CLI's own terminal output.
 *
 * Constants live in this module because:
 *  (a) they must be identical across CLI / Vega / runner / docs surfaces
 *      (SC 3.2.4 Consistent Identification);
 *  (b) any change here is a brand-voice change and triggers a Herald +
 *      Halo + Comply review per the v0.4 D7 lock notes;
 *  (c) the AC-3 test (`tests/acceptance/goal-4-three-modes.spec.ts`)
 *      snapshots these exact strings — drift breaks CI.
 *
 * Halo a11y note: the help-text MUST be programmatically associated with
 * the badge via `aria-describedby` in the web surface (SC 1.3.1). The
 * CLI surface uses the same string in its tty output for cross-surface
 * consistency (SC 3.2.4).
 */

/** Watermark badge text — locked Herald copy. SC 3.2.4. */
export const WATERMARK_BADGE = "Private Run · Self-Audited" as const;

/** Watermark help-text — locked Herald copy. SC 1.3.1 (aria-describedby). */
export const WATERMARK_HELP =
  "This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device." as const;

/** Verdict-output `watermark` field per PRD §9.4 + audit-output.v1 schema. */
export const WATERMARK_FIELD_VALUE = "private-run-self-audited" as const;

/** Sentinel for non-CLI verdicts (Surface / BYOK / Managed). PRD §9.4. */
export const WATERMARK_FIELD_NULL = null;

/**
 * CLI-side renderable block. Used by `commands/status.ts` and the
 * verdict-print path so the customer sees the same words in their
 * terminal that we'll show in the web verdict page (SC 3.2.4).
 */
export function watermarkBlock(): string {
  return `${WATERMARK_BADGE}\n${WATERMARK_HELP}`;
}

/**
 * Build the verdict object's `watermark` field. Used by
 * `runner/local-runner.ts` when composing the AuditOutput.
 *
 * Two arities:
 *  - 'cli'   → 'private-run-self-audited'
 *  - other   → null
 *
 * Per PRD §9.4 the field is non-nullable in shape; null encodes
 * "no watermark applies."
 */
export function watermarkFor(
  mode: "cli" | "byok" | "managed" | "surface",
): "private-run-self-audited" | null {
  if (mode === "cli") return WATERMARK_FIELD_VALUE;
  return WATERMARK_FIELD_NULL;
}
