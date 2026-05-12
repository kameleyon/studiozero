/**
 * Studio Zero — root Vitest config.
 *
 * Phase 9 M0 (Verify). Implements `architecture/test-strategy.md` §1 layer
 * matrix at the repo root: unit + contract (schema) + the M0-gate
 * integration tests live here. Per-app scaffolds (apps/web, future
 * apps/runner) will compose their own vitest.config.ts and inherit
 * coverage thresholds via the workspace file Pipeline lands at M1.
 *
 * Coverage targets are §1's repo-wide floor:
 *   ≥80% statement, ≥75% branch.
 * Score-engine + redaction middleware + SSRF filter have stricter local
 * thresholds enforced in their own per-package configs (lands with the
 * runner at M1 — at M0 we only own the schema + score-engine surface).
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Node environment by default — schema + score-engine are pure data;
    // the disclosure-header test spins its own Next request mock.
    environment: "node",

    // Glob pattern matches the M0 deliverables; expanded by Pipeline at M1
    // when integration + e2e scaffolds land under apps/.
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],

    // Keep apps/web's own vitest harness (when Forge adds one) isolated.
    exclude: ["node_modules/**", "apps/**", "dist/**", ".next/**"],

    // No globals — we always import {describe, it, expect} explicitly so
    // the contract stays readable in code-review and grep-able in CI logs.
    globals: false,

    // Deterministic output for CI snapshots.
    reporters: ["default"],

    // Coverage per `test-strategy.md` §1. Statement ≥80%, branch ≥75%.
    // Score-engine is held to ≥95% by its own thresholds file at M1; at
    // M0 it's a single pure function tested exhaustively against 15
    // fixtures so coverage is implicit.
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      // Measure the modules our tests EXERCISE so the coverage figure
      // reflects security-bearing code at the root (per
      // test-strategy.md §1: ≥90% on redaction middleware, ≥90% on SSRF
      // egress filter, ≥95% on score-engine reference impl).
      include: [
        "tests/**/*.{ts,js}",
        "apps/runner/src/ssrf-guard.ts",
        "apps/runner/src/path-traversal-guard.ts",
        "apps/runner/src/ingestion-limits.ts",
        "apps/runner/src/run-state-machine.ts",
        "apps/runner/src/realtime-emitter.ts",
        "apps/runner/src/reviewers/**/*.ts",
        "apps/web/lib/sentry-redaction.ts",
        "apps/web/lib/ai-disclosure.ts",
        // M2 Batch 1 Forge — Verify exercises these via mocked Stripe SDK
        // + in-memory Supabase shims; coverage ≥75% statement per the
        // M2 Batch 2 brief.
        "apps/web/app/api/webhooks/stripe/route.ts",
        "apps/web/app/api/webhooks/github/route.ts",
        "apps/web/app/api/billing/checkout-session/route.ts",
        "apps/web/app/api/billing/reconcile/route.ts",
        "apps/web/app/api/billing/portal/route.ts",
        "architecture/schemas/score_engine.v1.json",
      ],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "**/coverage/**",
        "**/.next/**",
        // apps/web React tree — covered by next-typed test lane.
        "apps/web/app/**/page.tsx",
        "apps/web/app/**/layout.tsx",
        "apps/web/components/**",
        "apps/runner/tests/**",
        // audit-event.v1.ts is a *types* file with one tiny `assertNever`
        // runtime helper. Coverage on it lands at M1 when the runner
        // exercises every variant.
        "architecture/schemas/audit-event.v1.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },

  resolve: {
    alias: {
      "@schemas": path.resolve(__dirname, "./architecture/schemas"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
