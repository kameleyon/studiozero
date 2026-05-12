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
      include: ["tests/**/*.{ts,js}"],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "**/coverage/**",
        "**/.next/**",
        "apps/**", // apps own their coverage thresholds
        // audit-event.v1.ts is a *types* file with one tiny `assertNever`
        // runtime helper. Coverage on it lands at M1 when the runner
        // exercises every variant — at M0 it's deliberately uncovered.
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
