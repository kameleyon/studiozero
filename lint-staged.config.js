/**
 * studio-zero — lint-staged config
 * ─────────────────────────────────────────────────────────────────────
 * Maps staged file patterns to fast incremental checks. The pre-commit
 * hook (`.husky/pre-commit`) runs `npx lint-staged`, which picks this
 * up.
 *
 * Design notes:
 *   - apps/web/**\/*.{ts,tsx,css} → `cd apps/web && eslint --fix` so
 *     ESLint resolves apps/web's next/core-web-vitals config + its own
 *     tsconfig path mappings.
 *   - TS typecheck on staged files is intentionally NOT per-file (tsc
 *     can't honor a tsconfig project on a single-file scope without
 *     producing false errors). Instead, we run a fast project-scoped
 *     `tsc --noEmit` once when any TS/TSX is staged.
 *   - Prettier handles docs / config files (md / json / yml).
 *   - The inline secret-scan in `.husky/pre-commit` runs BEFORE
 *     lint-staged, so secrets fail fast before ESLint touches anything.
 * ─────────────────────────────────────────────────────────────────────
 */
export default {
  // ── apps/web TS/TSX/CSS — scoped ESLint with auto-fix ────────────
  'apps/web/**/*.{ts,tsx,css}': [
    // Use --no-warn-ignored so lint-staged doesn't blow up on staged
    // files that next.js ignores (e.g. .next/, node_modules/).
    () => 'npm --prefix apps/web run lint -- --fix --no-warn-ignored',
  ],

  // ── apps/web TS/TSX — single project-scoped tsc pass ─────────────
  // Returning a single command (not per-file) avoids tsc-bug noise where
  // a single-file invocation can't see the project graph.
  'apps/web/**/*.{ts,tsx}': [() => 'npm --prefix apps/web run typecheck'],

  // ── Root TS — incremental ESLint not yet configured at root.
  //    Typecheck the root if/when a root tsconfig + ts sources land.
  // 'src/**/*.ts': [() => 'npm run typecheck'],

  // ── Docs, configs, workflows — Prettier (write + check) ──────────
  '*.{md,json,yml,yaml}': ['prettier --write --ignore-unknown'],
  '**/*.{md,json,yml,yaml}': ['prettier --write --ignore-unknown'],
};
