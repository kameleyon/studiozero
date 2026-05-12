/**
 * Playwright config — Phase 9 M1 Batch 3 (Probe).
 *
 * Owns the e2e gate from `architecture/test-strategy.md` §1 Playwright row
 * and `sprint/milestone-M1.md` exit-gate Goal-1 / Goal-5 / axe-core rows.
 *
 * Three projects (test-strategy §1 row "desktop 1280, tablet 768, mobile 320"):
 *   - desktop-chromium       (1280×800)
 *   - mobile-chromium-pixel  (320×640) — Halo SC 1.4.10 reflow
 *   - tablet-chromium-ipad   (768×1024)
 *
 * The web server auto-starts from `apps/web/`. Mock mode is forced via
 * `NEXT_PUBLIC_USE_AUTH_MOCK=true` so the suite is CI-safe without a real
 * Supabase project (M1 still treats real-Supabase as opt-in until Atlas
 * 0002 is on staging — see milestone-M1.md entry prerequisites).
 *
 * SLO context: PRD §14.1 sets Quick p95 <10 min and Comprehensive p95 <45 min
 * for *real* audits. In mock mode the wall-clock state machine completes in
 * ~10s (lib/run-state-machine.ts MOCK_RUN_TOTAL_MS) so per-test timeouts can
 * be tight; 60s leaves headroom for slow CI Chromium starts.
 *
 * Retries: 2 on CI per test-strategy §1 — we don't tolerate flakes locally
 * (zero retries) so flakes are detected at author time, not in production CI.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Detect CI for reporter / retry / fullyParallel adjustments.
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  // Each test owns its own browser context — fully parallel locally; CI
  // sticks to single-worker per project so the dev server isn't hammered.
  fullyParallel: !IS_CI,
  workers: IS_CI ? 1 : undefined,

  // Probe-rule §3: flakes are bugs. Locally zero retries; CI two retries
  // to mask the next-dev cold-start race on first nav.
  retries: IS_CI ? 2 : 0,

  // Per-test cap. Mock run is ~10s; 60s leaves headroom for `next dev`
  // first-compile on a cold worker.
  timeout: 60_000,

  // Global expect() timeout — short, since the mock state machine is fast.
  expect: { timeout: 10_000 },

  // No `test.only` allowed in CI (would silently skip the rest).
  forbidOnly: IS_CI,

  // Reporter: html for local + CI artifact, line for CI log readability.
  reporter: IS_CI
    ? [
        ["line"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [["list"], ["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    // Always record traces for the FIRST retry so we don't capture-on-pass
    // (slow) but never lose evidence on flake. screenshots/videos only on
    // failure to keep artifact size down.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Locale + tz determinism for axe + locale-sensitive assertions.
    locale: "en-US",
    timezoneId: "UTC",
    // Server start can race the first request; backoff a bit.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-chromium-pixel",
      use: {
        // Use a real device descriptor as the base, then pin the viewport
        // width to 320 — Halo SC 1.4.10 reflow gate. Pixel 7 spec lives
        // in @playwright/test's device DB; we narrow to 320 explicitly.
        ...devices["Pixel 7"],
        viewport: { width: 320, height: 640 },
      },
    },
    {
      name: "tablet-chromium-ipad",
      use: {
        // iPad (gen 7) device descriptor ships with `defaultBrowserType:
        // "webkit"`. Studio Zero's M1 PR-blocking matrix is Chromium-only
        // per test-strategy §1 "WebKit on primary flows" — we add WebKit
        // at M2. Override the browser to Chromium and keep the iPad
        // viewport + user-agent for parity.
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        isMobile: false,
        userAgent:
          devices["iPad (gen 7)"]?.userAgent ?? devices["Desktop Chrome"].userAgent,
      },
    },
  ],

  // Boot `next dev` with mock auth forced on, listening on PORT. Playwright
  // reuses the server between runs locally; in CI it spins up fresh.
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // M1 contract: tests run in mock mode unless a CI job explicitly
      // points NEXT_PUBLIC_SUPABASE_URL at a staging project (Goal-5 RLS).
      NEXT_PUBLIC_USE_AUTH_MOCK: process.env.NEXT_PUBLIC_USE_AUTH_MOCK ?? "true",
      // Don't let Next telemetry surveys block the prompt on first dev run.
      NEXT_TELEMETRY_DISABLED: "1",
      // Quiet Sentry init in tests — production builds wire it via env.
      SENTRY_DSN: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
    },
  },
});
