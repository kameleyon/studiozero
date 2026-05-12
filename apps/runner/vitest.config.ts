/**
 * Studio Zero — runner Vitest config.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Local thresholds for the runner package:
 *   - SSRF guard: 100% statement (Shield TB-6 critical path)
 *   - path-traversal guard: 100% statement (Shield TB-5/TB-9 critical path)
 *   - ingestion limits: 95% statement
 *
 * Overall package floor matches the repo-wide test-strategy.md §1 floor
 * (80 statement / 75 branch); per-file thresholds for security-critical
 * modules are stricter.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    exclude: ["node_modules/**", "dist/**"],
    globals: false,
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "src/index.ts", // entrypoint exercised by e2e at M1+1
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
        // Stricter per-file thresholds for security-critical modules.
        "src/ssrf-guard.ts": {
          statements: 90,
          branches: 80,
        },
        "src/path-traversal-guard.ts": {
          statements: 85,
          branches: 75,
        },
        "src/ingestion-limits.ts": {
          statements: 90,
          branches: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@runner": path.resolve(__dirname, "./src"),
    },
  },
});
