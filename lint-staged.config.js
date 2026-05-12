/**
 * studio-zero — lint-staged config
 * ─────────────────────────────────────────────────────────────────────
 * Maps staged file patterns to fast incremental checks. The pre-commit
 * hook (`.husky/pre-commit`) runs `npx lint-staged`, which picks this
 * up.
 *
 * M1 Batch 3 (Pipeline) update — wired `apps/runner` so Forge-2's
 * worker code (commit 43779fb) gets the same pre-commit treatment as
 * apps/web. `apps/runner` has no ESLint config yet (lint script is a
 * stub per package.json), so we only typecheck on staged TS — the
 * `tsc --noEmit` pass is project-scoped via the runner's tsconfig and
 * catches the bug class that matters (type errors, broken imports).
 * When Forge wires ESLint at M2, add the apps/runner ESLint clause
 * symmetrically to apps/web.
 *
 * Design notes:
 *   - apps/web/**\/*.{ts,tsx,css}    → `eslint --fix` via apps/web's
 *                                       next/core-web-vitals config.
 *   - apps/web/**\/*.{ts,tsx}        → single project-scoped `tsc --noEmit`.
 *   - apps/runner/**\/*.ts           → single project-scoped `tsc --noEmit`
 *                                       using apps/runner/tsconfig.json.
 *   - Prettier handles docs / config files (md / json / yml).
 *   - The inline secret-scan in `.husky/pre-commit` runs BEFORE
 *     lint-staged, so secrets fail fast before ESLint touches anything.
 * ─────────────────────────────────────────────────────────────────────
 */
export default {
  // ── apps/web TS/TSX/CSS — scoped ESLint with auto-fix ────────────
  'apps/web/**/*.{ts,tsx,css}': [
    // `next lint` doesn't forward unknown options like --no-warn-ignored
    // (M0 starter passed it as a hopeful pass-through; the flag never
    // reached eslint). Ignored files are already handled by .eslintrc.json
    // `ignorePatterns`, so dropping the flag is safe.
    () => 'npm --prefix apps/web run lint -- --fix',
  ],

  // ── apps/web TS/TSX — single project-scoped tsc pass ─────────────
  // Returning a single command (not per-file) avoids tsc-bug noise where
  // a single-file invocation can't see the project graph.
  'apps/web/**/*.{ts,tsx}': [() => 'npm --prefix apps/web run typecheck'],

  // ── apps/runner TS — project-scoped tsc pass (M1 Batch 3) ────────
  // Forge-2's worker code lives here; no ESLint config yet so we only
  // run `tsc --noEmit`. The `--prefix` form scopes Node module
  // resolution to the runner's own tsconfig.json.
  'apps/runner/**/*.ts': [() => 'npm --prefix apps/runner run typecheck'],

  // ── Root TS — incremental ESLint not yet configured at root.
  //    Typecheck the root if/when a root tsconfig + ts sources land.
  // 'src/**/*.ts': [() => 'npm run typecheck'],

  // ── Docs, configs, workflows — Prettier (write + check) ──────────
  '*.{md,json,yml,yaml}': ['prettier --write --ignore-unknown'],
  '**/*.{md,json,yml,yaml}': ['prettier --write --ignore-unknown'],
};
