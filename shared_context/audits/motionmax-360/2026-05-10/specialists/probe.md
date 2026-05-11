# Probe — §10 Testing — coverage + plan

**Reviewer:** Probe (QA Engineer)
**Project:** motionmax-360
**Date:** 2026-05-10
**Audience:** tool-savvy creative adults; mobile-heavy; 11 languages claimed; US-first; pre-launch.
**Severity rubric:** Blocker / Critical / Major / Minor / Polish (audience-relative).
**Method:** static analysis of `C:\Users\Administrator\motionmax`. No tests were executed. Findings without file:line evidence are explicitly labeled "Unable to verify from static analysis".

---

## 1. Coverage map (current state)

| Layer | Tests on disk | What's covered | What's NOT covered |
|---|---|---|---|
| **Frontend unit (vitest)** | 11 files in `src/**/__tests__` | `appErrors`, `authValidation`, `coreUtils`, `planLimits`, `validateGenerationAccess`, `stripeProducts`, `subscriptionEdgeCases`, `useAuth`, `useWorkspaceSubscription`, `PasswordStrengthMeter`, `errorBoundaries`, `authRoutes`, admin `format` | Editor, Stage, Timeline, IntakeForm, Voice Lab, Autopost Lab, Landing, Help, every admin tab component, Auth screen, every page beyond auth routing, every reducer/store, every form validator beyond auth |
| **Worker (vitest, real handlers)** | 4 files: `generateVideo`, `exportVideo`, `mediaValidator`, `refundCreditsOnFailure` | LLM/storage/ffmpeg failure paths, watermark on free tier, export concurrency cap, refund idempotency contract | Cinematic generation, Hypereal/Kling/Replicate provider failures, ElevenLabs/Fish/LemonFox voice paths, captions rendering, Sentry instrumentation, queue health/heartbeat, mid-job crash recovery |
| **Edge functions (Deno)** | 6 files: `stripe-webhook`, `admin-stats/accessControl`, `get-shared-project/shareFlow`, `_shared` (`audioEngine`, `cors`, `creditAtomicity`, `rateLimit`) | Webhook signature + idempotency contract (against a mirrored handler), accessControl/share contracts, CORS, rate limit, audio engine, atomicity helper | `delete-account`, `admin-hard-delete-user`, `drain-deletion-tasks`, `export-my-data`, `cancel-with-reason`, `create-checkout`, `customer-portal`, `generate-video`, `generate-cinematic`, `clone-voice*`, `delete-voice*`, `manage-api-keys`, `pause-subscription`, `update-pack-quantity`, `submit-support-ticket`, `notify-*`, `serve-media`, `share-meta`, `list-invoices`, `health`, `resend-webhook` (20+ deployed functions with zero tests) |
| **E2E (Playwright)** | 3 files: `auth.spec.ts`, `generate.spec.ts`, `admin.spec.ts` | Sign up / log in / invalid creds / authed redirect; create-project + initiate-generation happy path; admin tab smoke + a few targeted admin actions | Payment (Stripe Checkout), credit pack purchase, refund-on-failure, delete-account, GDPR export, subscription cancel/pause, mid-generation crash, mid-flow logout, double-submit, paywall enforcement, watermark removal after upgrade, share link revocation, intake form validation, editor save, voice lab end-to-end, autopost lab end-to-end, marketing site, mobile/tablet breakpoints |
| **Coverage % (measured)** | Unable to verify from static analysis — no `coverage/` directory or lcov artifact in repo. Threshold gate is configured but **not enforced in CI**; see F-10-04. |

Configured vitest thresholds (`vitest.config.ts:28-33`): lines 20, functions 20, statements 20, branches 15. For an audience that includes paying customers and an 11-language launch, this is well below industry norm (60-80%).

---

## 2. Findings

### BLOCKER

#### F-10-01 — CI runs no E2E and no coverage gate; deploy job depends on neither
- **Category:** §10 Testing / §14 Production readiness
- **Severity:** Blocker
- **Issue:** `.github/workflows/ci.yml:42-43` runs `npm run test` (vitest only). Playwright (`npx playwright test`) is never invoked. The `deploy` job (`ci.yml:135-141`) lists `needs: [lint-test-build, worker-build, edge-functions-check]` — there is no E2E job. Production deploys to Render + Supabase ship even if every E2E spec is broken.
- **Evidence:** `.github/workflows/ci.yml:42-43, 135-141`; `package.json:18` defines `test:e2e` but no workflow references it.
- **Fix (solution + location + how):** Add an `e2e` job to `ci.yml` after `lint-test-build` that runs `npx playwright install --with-deps` then `npx playwright test`, against either a built preview server or a deployed staging URL. Add `e2e` to `deploy.needs`. Gate on `BASE_URL` secret pointing at a staging deployment, not `localhost`. **Effort: M.**

#### F-10-02 — Auth, generation, and admin E2Es will not run in CI as written (no webServer / no auth bootstrap)
- **Category:** §10 Testing
- **Severity:** Blocker
- **Issue:** `e2e/playwright.config.ts:1-19` sets `baseURL` to `http://localhost:5173` but defines no `webServer` block, so CI has nothing to hit. Even if invoked, every spec depends on a pre-existing `e2e-test@motionmax.dev` account (`e2e/auth.spec.ts:4-5`, `e2e/generate.spec.ts:3-4`) and admin tests skip when `ADMIN_EMAIL`/`ADMIN_PASSWORD` are absent (`e2e/admin.spec.ts:24, 52`). There is no seeding script and no global setup. Sign-up test will fail or pollute prod data because it hits the real Supabase (`e2e/auth.spec.ts:14-21`).
- **Evidence:** `e2e/playwright.config.ts:1-19`; `e2e/auth.spec.ts:1-21`; `e2e/admin.spec.ts:22-54`; `e2e/generate.spec.ts:1-13`.
- **Fix:** Add `webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI }` to `playwright.config.ts`. Create `e2e/global-setup.ts` that provisions a disposable test user against a **dedicated staging Supabase project** (never prod) and exposes its credentials via Playwright `storageState`. Add a teardown that deletes the test user. **Effort: M.**

#### F-10-03 — Refund-on-failure test asserts against a mirrored copy, not the deployed code
- **Category:** §10 Testing
- **Severity:** Blocker
- **Issue:** `worker/src/refundCreditsOnFailure.test.ts:60-122` re-implements `refundCreditsOnFailure` inline in the test file (the file even comments "We inline the exact business logic so the tests remain valid even if index.ts is refactored"). The real function in `worker/src/index.ts` is never imported. If the production logic drifts (a missing `await`, a wrong table name, a flipped `eq` clause, removal of the idempotency check), all 11 tests still pass. This is a credit-loss / double-refund hazard that the test suite is currently **incapable of catching**. Probe Rule #1: a bug fixed without a test that exercises the real fix is a bug that returns.
- **Evidence:** `worker/src/refundCreditsOnFailure.test.ts:60-122` (mirrored function); same file `:65-66` imports `supabase` + `writeSystemLog` but never imports `refundCreditsOnFailure` from `worker/src/index.ts`.
- **Fix:** Export `refundCreditsOnFailure` from `worker/src/index.ts` (named export) and import it directly in the test. Delete the mirrored copy from the test file. Re-run the suite to confirm it still passes against the real implementation. **Effort: S.**

#### F-10-04 — `stripe-webhook` Deno test exercises a "handler factory" mirror, not `index.ts`
- **Category:** §10 Testing / §6 Security (PCI / webhook signature)
- **Severity:** Blocker
- **Issue:** `supabase/functions/stripe-webhook/index.test.ts:96` declares `// ─── Handler factory (mirrors index.ts logic with injected deps) ──────────────`. All 15 webhook tests run against a parallel implementation defined in the test file, not the deployed `index.ts`. Stripe signature verification, subscription state transitions, credit grant, and idempotency cannot regress detectably. For a US-launch SaaS that takes money, this is the highest-risk untested seam.
- **Evidence:** `supabase/functions/stripe-webhook/index.test.ts:2, 96-100`; the test file is 704 lines yet never imports the real handler.
- **Fix:** Refactor `supabase/functions/stripe-webhook/index.ts` so the request handler is exported as `export async function handleStripeWebhook(req, deps)` with deps injected. Import that function in the test. Delete the in-file factory. Add `Deno.test` runs for: (a) bad signature → 400, (b) replay of same `event.id` → 200 + `duplicate: true` flag, (c) `checkout.session.completed` → credit grant inserted with idempotency key, (d) `invoice.payment_failed` → subscription marked `past_due`, (e) `customer.subscription.deleted` → cancellation event row written. **Effort: M.**

#### F-10-05 — Zero tests on every revenue and account-deletion edge function
- **Category:** §10 Testing / §13 Legal & compliance (GDPR Art. 17 / 20)
- **Severity:** Blocker
- **Issue:** `supabase/functions/` ships 25+ edge functions; only 5 have any test (and 1 of those is the mirror in F-10-04). Functions with **no test at all** include all of: `delete-account`, `admin-hard-delete-user`, `drain-deletion-tasks`, `export-my-data`, `cancel-with-reason`, `pause-subscription`, `create-checkout`, `customer-portal`, `list-invoices`, `update-pack-quantity`, `generate-video`, `generate-cinematic`, `clone-voice`, `clone-voice-fish`, `delete-voice`, `delete-voice-fish`, `manage-api-keys`, `submit-support-ticket`, `notify-signup-welcome`, `notify-user-of-message`, `serve-media`, `share-meta`, `resend-webhook`, `health`. GDPR right-to-erasure and right-to-portability cannot be regression-protected; every revenue side-effect (checkout, portal, refund-on-cancel, plan change) is unverified.
- **Evidence:** `ls supabase/functions/` (25+ dirs); cross-referenced against `*.test.ts` glob — only `stripe-webhook`, `admin-stats`, `get-shared-project`, plus `_shared/*` have tests.
- **Fix:** Refactor each of the listed functions to expose `handle(req, deps)` and add at minimum: happy-path 2xx, auth-rejected 401, RLS/role-rejected 403, validation-error 400, idempotency or double-submit case. Priority order in §3 below. **Effort: L.**

---

### CRITICAL

#### F-10-06 — E2E pipeline is desktop-Chromium only despite mobile-heavy audience
- **Category:** §10 Testing / §1 UI/UX
- **Severity:** Critical
- **Issue:** `e2e/playwright.config.ts:15-17` declares a single project `{ name: "chromium", use: { ...devices["Desktop Chrome"] } }`. Brief lists 8 mobile breakpoints (320/375/390/414/428/768/1024/1280) and explicit iOS/Android requirements (100dvh, safe-area-inset, 16px input font, 44px / 48dp touch targets). None of those are exercised end-to-end. Mobile Safari quirks (100vh address-bar collapse, soft-keyboard viewport shift) cannot be caught by any current test.
- **Evidence:** `e2e/playwright.config.ts:15-17`; brief §10 + §1.
- **Fix:** Add Playwright projects: `Mobile Chrome` (Pixel 5), `Mobile Safari` (iPhone 12), `iPad`, `Tablet Chrome`. For at least the Auth → Dashboard → IntakeForm → Generate happy path, run on every project. Add a `viewport-grid.spec.ts` that visits each public route at the 8 brief-listed widths and asserts no horizontal scroll + 16px+ computed font on every `input`. **Effort: M.**

#### F-10-07 — Worker test script in CI does not include the refund/export/generate tests on a real run
- **Category:** §10 Testing
- **Severity:** Critical
- **Issue:** `.github/workflows/ci.yml:93-94` runs `cd worker && npm run test`. The worker `package.json` test script is not visible in the inspected snippet — Unable to verify from static analysis whether it points to vitest, a stub, or a no-op. If it returns 0 with no tests collected, all four worker tests are silently skipped in CI.
- **Evidence:** `.github/workflows/ci.yml:93-94`. Recommendation: open `worker/package.json` and confirm `"test": "vitest run"`; if it is `"test": "echo skip"` or missing, all worker tests are dead.
- **Fix:** Open `worker/package.json`, ensure `"test": "vitest run"` and `"test:coverage": "vitest run --coverage"`. Add a CI step `cd worker && npm run test:coverage` and fail the job if coverage drops below an explicit baseline (start at 40% and ratchet). **Effort: XS.**

#### F-10-08 — Coverage threshold is 20%/15%, and the `test:coverage` script is never run in CI
- **Category:** §10 Testing
- **Severity:** Critical
- **Issue:** `vitest.config.ts:28-33` sets thresholds at lines 20, functions 20, statements 20, branches 15. Even those laughable bars are not enforced because CI runs `npm run test` (= `vitest run`, no `--coverage`) at `.github/workflows/ci.yml:42-43`, not `npm run test:coverage`. So the threshold can drop to 0 and CI passes.
- **Evidence:** `vitest.config.ts:28-33`; `package.json:15-17`; `.github/workflows/ci.yml:42-43`.
- **Fix:** In `ci.yml` step "Run tests", change `npm run test` to `npm run test:coverage`. In `vitest.config.ts`, lift thresholds to lines 60, functions 60, statements 60, branches 50 once the priority test plan in §3 lands; until then set thresholds to **current measured baseline** so the suite ratchets up, never down. Upload lcov to a coverage service (Codecov / Coveralls) so PRs show deltas. **Effort: S.**

#### F-10-09 — No tests for paywall / plan-limit enforcement on the server (only on the client)
- **Category:** §10 Testing / §6 Security
- **Severity:** Critical
- **Issue:** `src/lib/__tests__/planLimits.test.ts` and `src/lib/__tests__/validateGenerationAccess.test.ts` test the **client** plan-gate logic. The server-side enforcement (worker `generateVideo`, `generate-cinematic`, `create-checkout`) has no comparable test. A user bypassing the React UI (curling the worker queue or invoking the edge function directly) cannot be confirmed-blocked from generation. Critical for a paid product.
- **Evidence:** `src/lib/__tests__/validateGenerationAccess.test.ts` (client); no matching test for worker's job intake or `generate-video` edge function.
- **Fix:** Add `worker/src/handlers/generateVideo.test.ts` cases: (a) free-tier user requesting cinematic → handler rejects, (b) paid user past monthly cap → handler rejects, (c) banned user (`profiles.is_banned = true`) → handler rejects. Mirror in the edge function. **Effort: M.**

#### F-10-10 — No tests for mid-generation crash recovery (worker restart mid-job)
- **Category:** §10 Testing / §7 Data integrity
- **Severity:** Critical
- **Issue:** Brief §7 calls out mid-generation crash recovery as in-scope; there is no test for: worker dying after credit deduct but before generation enqueue, ffmpeg dying mid-render, Render.com restart leaving a job in `processing`, retry-on-stale-heartbeat. `worker/src/handlers/exportVideo.test.ts` covers ffmpeg failure → throw, but not the wrapper that should re-queue or fail-out a stranded job.
- **Evidence:** No `recovery`, `stale`, `requeue`, `heartbeat-timeout` matches in any project test file.
- **Fix:** Add `worker/src/recovery.test.ts` covering: stranded-job reaper picks up jobs older than N minutes with status=`processing` and no recent heartbeat; reaper either re-queues (if attempt < max) or fails + refunds. **Effort: M.**

---

### MAJOR

#### F-10-11 — Sign-up E2E pollutes the real backend (no test-Supabase isolation)
- **Category:** §10 Testing
- **Severity:** Major
- **Issue:** `e2e/auth.spec.ts:14` creates accounts with `e2e-${Date.now()}@motionmax.dev`. Run repeatedly, this leaves orphan auth users + profiles + workspace rows in whatever Supabase project the dev server points at. There is no teardown.
- **Evidence:** `e2e/auth.spec.ts:14-22`.
- **Fix:** Point E2Es at a dedicated staging Supabase project (set in `BASE_URL` + `VITE_SUPABASE_URL` env). Add `test.afterEach` that calls `delete-account` for the just-created email. Or use a fixed shared `e2e-test@motionmax.dev` plus a single sign-up test that uses `auth.admin.deleteUser` against a service-role key. **Effort: S.**

#### F-10-12 — Race conditions / double-submit / mid-flow logout untested
- **Category:** §10 Testing
- **Severity:** Major
- **Issue:** Brief §10 explicitly calls out "race conditions, double-submit, mid-flow logout". No spec asserts: clicking Generate twice deducts credits once; logging out mid-generation does not lose the user's job; opening intake form in two tabs and submitting both does not double-charge; refresh during Stripe Checkout redirect does not double-grant credits.
- **Evidence:** Grepped project tests for `double|race|concurrent|two tabs|mid.flow|logout` — only `worker/src/handlers/exportVideo.test.ts` covers concurrency cap; nothing for the user-facing race conditions.
- **Fix:** Add `e2e/race-conditions.spec.ts` with: (a) double-click Generate → assert one credit_transactions row, (b) two-tab IntakeForm submit → assert single project, (c) sign-out during generation → assert job continues + receipt visible after re-login, (d) Stripe success redirect refresh → assert credit grant idempotent. **Effort: M.**

#### F-10-13 — i18n: 11 languages claimed, zero translation/locale tests
- **Category:** §10 Testing / §1 UI/UX / §12 SEO
- **Severity:** Major
- **Issue:** Brief states "11 languages claimed". No spec validates that translations exist for every key, no spec catches missing-key fallbacks, no spec asserts hreflang tags render for each route, no RTL viewport check.
- **Evidence:** Grepped tests for `locale|i18n|translation|hreflang|rtl` — zero matches in project test files.
- **Fix:** Add `src/lib/__tests__/i18n.test.ts`: load every locale JSON, assert key parity vs the canonical English bundle. Add `e2e/i18n.spec.ts`: visit `/`, `/auth`, `/dashboard` with each `?lang=` query, screenshot, assert no English fallback strings + no untranslated `{{key}}` placeholders. **Effort: M.**

#### F-10-14 — Storytelling product slated for removal but no regression test guards remnant references
- **Category:** §10 Testing / §4 Code health
- **Severity:** Major
- **Issue:** Brief: "Storytelling product is being removed — flag every remnant." A test that scans the bundle for `storytelling`/`story-telling` and fails the build would catch leftover routes/components, but no such guard exists.
- **Evidence:** No grep hit for `storytelling` in any project test file.
- **Fix:** Add `src/__tests__/no-storytelling.test.ts`: read every `src/**/*.{ts,tsx,json}` (excluding archive/) and assert `/storytelling/i` returns no matches. Same for `marketing/src/**`. Failing the build is the cheapest way to enforce removal. **Effort: XS.**

#### F-10-15 — Edge-function lint runs `deno check` only — no tests are executed in CI
- **Category:** §10 Testing
- **Severity:** Major
- **Issue:** `.github/workflows/ci.yml:98-133` runs `deno check` per function but **never** runs `deno test`. The 6 existing Deno test files (`stripe-webhook`, `admin-stats/accessControl`, `get-shared-project/shareFlow`, `_shared/*`) are not executed in CI.
- **Evidence:** `.github/workflows/ci.yml:98-133` — only `deno check`, no `deno test`.
- **Fix:** Add a step `deno test --allow-net --allow-env supabase/functions/**/*.test.ts` (with appropriate `--lock` handling). **Effort: XS.**

#### F-10-16 — No accessibility-regression tests despite WCAG implications
- **Category:** §10 Testing / §1 UI/UX
- **Severity:** Major
- **Issue:** No axe-core / `@axe-core/playwright` integration. Audience includes mobile users on small screens; brand requires aqua/gold contrast. Without an automated a11y check on each PR, contrast and label regressions ship.
- **Evidence:** `package.json` has no `axe`, `pa11y`, or `@axe-core/*` dependency; no spec uses `injectAxe`.
- **Fix:** Add `@axe-core/playwright` (devDep). Create `e2e/a11y.spec.ts` that loads every public route + the IntakeForm/Editor/VoiceLab/Autopost screens and asserts zero `serious`/`critical` axe violations. Layered on top of Halo's manual review, not replacing it. **Effort: S.**

#### F-10-17 — Stripe webhook idempotency rests on a unique-constraint side-effect (`23505`) — no negative test for missing constraint
- **Category:** §10 Testing
- **Severity:** Major
- **Issue:** `supabase/functions/stripe-webhook/index.test.ts:412` simulates a `webhookInsertError: { code: "23505", message: "duplicate key" }`. The test passes if the handler treats `23505` as "already processed". There is no test that fails when the unique constraint is missing on the `webhook_events` table — meaning a migration that drops/forgets `unique(event_id)` is invisible to the suite.
- **Evidence:** `supabase/functions/stripe-webhook/index.test.ts:408-424`.
- **Fix:** Add a Supabase migration test (Deno + a real local Supabase) that asserts `\d+ webhook_events` includes `unique(event_id)`. Or add a SQL assertion in `supabase/tests/migration_invariants.sql` and run it in CI before deploy. **Effort: S.**

#### F-10-18 — `coreUtils.test.ts` and `appErrors.test.ts` test trivial helpers; critical surfaces (Editor, Stage, Timeline, IntakeForm) have zero tests
- **Category:** §10 Testing
- **Severity:** Major
- **Issue:** The repo has tests for utility helpers (`coreUtils`, `appErrors`, `format`) and route guards but none for the actual creative product surfaces. Editor/Stage/Timeline are the differentiator and the most error-prone (canvas + timeline + drag); IntakeForm is the funnel entry point. Their absence skews coverage statistics — high coverage on glue code, zero on the value-creating UI.
- **Evidence:** `src/components/__tests__/`, `src/lib/__tests__/`, `src/hooks/__tests__/` — directory listing has no Editor/Stage/Timeline/IntakeForm.
- **Fix:** Add focused unit tests around the reducer/state-machine inside Editor and Timeline (drag-to-trim, multi-select delete, undo/redo determinism). Add an IntakeForm validation test for: required field, max-length, unsupported file MIME. **Effort: M.**

---

### MINOR

#### F-10-19 — Playwright tests retry twice in CI but flake guards (trace, screenshot) are minimal
- **Category:** §10 Testing
- **Severity:** Minor
- **Issue:** `e2e/playwright.config.ts:7-13` sets `retries: process.env.CI ? 2 : 0`. Two retries hide flakes (Probe Rule #3). Trace is `on-first-retry` and screenshot `only-on-failure` — fine, but a flake budget / quarantine list is absent.
- **Evidence:** `e2e/playwright.config.ts:7-13`.
- **Fix:** Drop `retries` to 1 (or 0 once specs stabilize). Add `--reporter=list,html,junit` and post the JUnit to GitHub Checks. Maintain a `e2e/.flake-quarantine.txt` and gate it (max 0 entries) so quarantining requires PR review. **Effort: XS.**

#### F-10-20 — `forbidOnly` only blocks `.only` in CI; no eslint rule prevents committing it
- **Category:** §10 Testing
- **Severity:** Minor
- **Issue:** `e2e/playwright.config.ts:6` sets `forbidOnly: !!process.env.CI`. Good in CI, but a developer can still push `test.only(...)` and have it run in local watch, then forget — the next CI run skips half the suite by accident only if the same `.only` ships. Cheap fix below.
- **Evidence:** `e2e/playwright.config.ts:6`.
- **Fix:** Add `no-only-tests` to `eslint.config.js` covering `*.spec.ts` and `*.test.ts`. Add a lint-staged hook so accidental `.only` is caught at commit time. **Effort: XS.**

#### F-10-21 — Bundle-size gate is fixed at 500KB but tests never assert it
- **Category:** §10 Testing / §5 Performance
- **Severity:** Minor
- **Issue:** `.github/workflows/ci.yml:58-66` enforces `MAX_SIZE_KB=500` via shell at deploy time. There is no per-route or per-chunk budget and no Lighthouse CI assertion despite `lighthouserc.cjs` being present in repo root.
- **Evidence:** `.github/workflows/ci.yml:58-66`; `lighthouserc.cjs` exists but is not invoked from CI.
- **Fix:** Wire `lighthouserc.cjs` into CI as a separate job after `lint-test-build`. Set per-route LCP/CLS/INP budgets aligned with brief §5. **Effort: S.**

#### F-10-22 — Test setup file is referenced but not inspected; MSW handlers may be incomplete
- **Category:** §10 Testing
- **Severity:** Minor
- **Issue:** `vitest.config.ts:16` references `src/test-utils/setup.ts`. Unable to verify from static analysis (file not opened during this audit) whether MSW (`msw` is in devDeps at `package.json:95`) is wired with handlers for Supabase, Stripe, OpenRouter, ElevenLabs, Replicate, Hypereal, Fish Audio, LemonFox, Gemini. Missing handlers means real network requests in tests → flake source.
- **Evidence:** `vitest.config.ts:16`; `package.json:95`.
- **Fix:** Open `src/test-utils/setup.ts`, audit which providers are mocked, and add MSW handlers for any provider used in `src/services/*` that lacks one. Add a test that fails on any unhandled outbound request. **Effort: S.**

---

### POLISH

#### F-10-23 — Coverage reporters are `text` + `lcov` only; no HTML report makes manual triage harder
- **Category:** §10 Testing
- **Severity:** Polish
- **Issue:** `vitest.config.ts:34` lists `reporter: ["text", "lcov"]`. No `html` means devs cannot open `coverage/index.html` after a local run.
- **Evidence:** `vitest.config.ts:34`.
- **Fix:** Add `"html"` to the reporter array. **Effort: XS.**

#### F-10-24 — Worker `dist/*.test.js` files committed alongside source tests
- **Category:** §10 Testing / §4 Code health
- **Severity:** Polish
- **Issue:** `worker/dist/handlers/exportVideo.test.js` etc. are present in the repo (Glob results). Compiled tests in `dist/` will be picked up if vitest's `include` ever changes; they also bloat the repo.
- **Evidence:** Glob `**/*.{test,spec}.*` returned `worker/dist/handlers/exportVideo.test.js`, `worker/dist/refundCreditsOnFailure.test.js`, etc.
- **Fix:** Add `worker/dist/` to `.gitignore` (if not already). Confirm `worker/tsconfig.json` has `exclude: ["**/*.test.ts"]` for the build target so tests are not compiled into `dist/` in the first place. **Effort: XS.**

---

## 3. Proposed test plan — priority order

Order is risk-weighted (revenue, legal, blast radius), not effort-weighted.

| # | Item | Layer | Severity unblocked | Effort |
|---|---|---|---|---|
| 1 | Refund test against real `refundCreditsOnFailure` (F-10-03) | Worker unit | Blocker | S |
| 2 | Stripe webhook test against real handler (F-10-04) | Edge unit | Blocker | M |
| 3 | CI: run `npm run test:coverage` + ratchet thresholds (F-10-08) | CI | Critical | S |
| 4 | CI: run `deno test` for edge functions (F-10-15) | CI | Major | XS |
| 5 | E2E in CI with `webServer` + staging Supabase (F-10-01, F-10-02) | E2E + CI | Blocker | M |
| 6 | E2E suite for delete-account + export-my-data (GDPR) | E2E | Blocker | M |
| 7 | E2E for Stripe Checkout (test mode) → credit grant + idempotent refresh | E2E | Blocker | M |
| 8 | E2E for cancel-with-reason + pause-subscription | E2E | Critical | S |
| 9 | Worker tests for cinematic + voice provider failures (F-10-09) | Worker unit | Critical | M |
| 10 | Worker mid-generation recovery / stranded-job reaper (F-10-10) | Worker unit | Critical | M |
| 11 | Race / double-submit / mid-flow logout E2Es (F-10-12) | E2E | Major | M |
| 12 | Mobile-Chrome + Mobile-Safari + iPad Playwright projects (F-10-06) | E2E | Critical | M |
| 13 | Viewport-grid spec for 8 brief breakpoints | E2E | Major | S |
| 14 | i18n key-parity + hreflang test for 11 locales (F-10-13) | Unit + E2E | Major | M |
| 15 | Editor / Stage / Timeline / IntakeForm focused unit tests (F-10-18) | Frontend unit | Major | M |
| 16 | Storytelling-remnant guard (F-10-14) | Static check | Major | XS |
| 17 | a11y axe scans on all public routes (F-10-16) | E2E | Major | S |
| 18 | Edge-function tests for every untested function in F-10-05 | Edge unit | Blocker | L |
| 19 | DB-invariant test for `webhook_events.unique(event_id)` (F-10-17) | DB | Major | S |
| 20 | Lighthouse CI integration via existing `lighthouserc.cjs` (F-10-21) | CI | Minor | S |

---

## 4. CI test gating — recommended target state

```yaml
jobs:
  lint-test-build:    # existing; change `npm run test` → `npm run test:coverage`; fail on threshold
  worker-build:       # existing; ensure `npm run test:coverage` and a coverage gate
  edge-functions:     # add `deno test` step in addition to `deno check`
  e2e-desktop:        # NEW: Playwright chromium against `npm run preview`, blocking
  e2e-mobile:         # NEW: Mobile Chrome + Mobile Safari, blocking on critical flows
  a11y:               # NEW: axe sweep over public + signed-in routes
  lighthouse:         # NEW: lighthouserc against built preview
  deploy:
    needs: [lint-test-build, worker-build, edge-functions, e2e-desktop, e2e-mobile, a11y]
```

The current state needs all four NEW jobs **and** the threshold-gated coverage to satisfy production readiness for a paid US launch.

---

## 5. Production blockers (testing-only subset)

| Blocker | One-line | Owner |
|---|---|---|
| F-10-01 | CI does not run E2E and deploy does not depend on E2E | Pipeline |
| F-10-02 | E2E config has no webServer + no test-data isolation; real prod risk | Probe |
| F-10-03 | Refund test does not exercise the deployed refund function | Probe + Forge (worker) |
| F-10-04 | Stripe webhook test does not exercise the deployed handler | Probe + Forge (edge) |
| F-10-05 | Zero tests on delete-account, export-my-data, create-checkout, customer-portal, generate-video | Probe + Forge (edge) |

---

## 6. Top 10 priority fixes (testing-only)

1. F-10-03 — point refund test at real function.
2. F-10-04 — point Stripe webhook test at real handler.
3. F-10-01 — add E2E job to CI; add E2E to `deploy.needs`.
4. F-10-02 — add `webServer` + staging-Supabase + global-setup to Playwright.
5. F-10-08 — switch CI to `test:coverage`; raise thresholds in lockstep with §3 plan.
6. F-10-05 — write happy-path + auth-fail tests for `delete-account`, `export-my-data`, `create-checkout`, `customer-portal`.
7. F-10-15 — `deno test` step in CI.
8. F-10-06 — Mobile Chrome + Mobile Safari Playwright projects.
9. F-10-09 — server-side paywall tests in worker + edge.
10. F-10-10 — stranded-job reaper test for mid-generation crash.

---

**Probe note for Jury:** Findings F-10-03 and F-10-04 are the most consequential — both look green in CI today but provide false assurance on the highest-risk surfaces (credits + payments). Fixing these two does not require new tests; it requires re-pointing the existing tests at the real code. That's the cheapest way to materially raise the floor before launch.
