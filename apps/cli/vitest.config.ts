/**
 * Studio Zero — CLI Vitest config.
 *
 * Phase 9 M3 Batch 1 (Forge). The CLI binary is the customer-facing
 * surface for the privacy wedge — its security-sensitive paths are:
 *
 *   - auth/pairing-token.ts        (token-on-disk; 0600 perms; never logged)
 *   - watermark/private-run...     (D7 watermark text is locked-copy)
 *   - runner/verdict-sign.ts       (HMAC-SHA256 verdict signing — D7)
 *
 * Per-file thresholds are stricter for those. Repo-wide floor matches
 * `architecture/test-strategy.md` §1 (80 statement / 75 branch).
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
        "src/index.ts", // entrypoint; commander dispatch covered by per-command tests
        "src/ui/**",   // tty / chalk rendering covered manually
      ],
      // M3 Batch 1 thresholds: D7-critical surfaces ship at high
      // coverage NOW. The remaining commands (status, logout, doctor,
      // version) + long-poll get covered in M3 Batch 2/3 when their
      // server endpoints land. The global floor mirrors that staging.
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
        // D7 surfaces — stricter floor (load-bearing for the watermark
        // contract per `ia/user-flows/cli-pairing-and-tamper.md` C7/C8).
        "src/runner/verdict-sign.ts": {
          statements: 90,
          branches: 60,
        },
        "src/watermark/private-run-self-audited.ts": {
          statements: 100,
        },
        "src/auth/pairing-token.ts": {
          statements: 85,
          branches: 70,
        },
        "src/env.ts": {
          statements: 90,
          branches: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@cli": path.resolve(__dirname, "./src"),
    },
  },
});
