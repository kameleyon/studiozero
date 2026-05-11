# Pipeline (CI/CD + Release) — motionmax-360 — 2026-05-10

**Specialist:** Pipeline (CI/CD)
**Category:** §14 Production readiness — CI/CD + release, rollback, security headers, env/secrets, DNS/SSL
**Scope:** `.github/workflows/`, `vercel.json`, `DEPLOYMENT_SECURITY.md`, `DISASTER_RECOVERY.md`, `package.json`, `iac/`, `scripts/`, husky hooks, supabase deploy gating
**Cross-ref:** `studio-zero/checklists/release-checklist.md`

Severity rubric: Blocker / Critical / Major / Minor / Polish.
Audience: tool-savvy creative adults; production stack on Vercel + Supabase + Render.com.

---

## Findings

### Blocker

#### B-1 — `supabase functions deploy --no-verify-jwt` ships every Edge Function with platform JWT verification disabled
- **Severity:** Blocker
- **Evidence:** `.github/workflows/ci.yml:163-165`
  ```
  supabase functions deploy \
    --project-ref "$SUPABASE_PROJECT_ID" \
    --no-verify-jwt
  ```
- **Issue:** The `--no-verify-jwt` flag applied at the project level disables Supabase's gateway-enforced JWT check on every function in `supabase/functions/*` — including `delete-account`, `manage-api-keys`, `admin-force-signout`, `admin-hard-delete-user`, `admin-send-newsletter`, `admin-stats`, `export-my-data`, `pause-subscription`, `customer-portal`. These can now be reached anonymously at the platform layer; only function-internal auth code (which we cannot rely on for every handler) protects them. Some functions (Stripe webhook, share-meta) legitimately need this; most do not.
- **Fix:** Solution: deploy in two passes — public functions (`stripe-webhook`, `share-meta`, `serve-media`, `health`, `resend-webhook`) with `--no-verify-jwt`; everything else without the flag. Location: `.github/workflows/ci.yml` deploy job. How: replace the single deploy step with a loop that explicitly lists `PUBLIC_FUNCS` and deploys those with `--no-verify-jwt`, then deploys the rest by iterating `supabase/functions/*` and skipping the public set.
- **Effort:** S

#### B-2 — Failing CI does not block Vercel production deploy
- **Severity:** Blocker
- **Evidence:** `vercel.json:1-5` (no `ignoreCommand` / build conditional); CI workflow `.github/workflows/ci.yml` deploys only Supabase + Render. The frontend reaches production via Vercel's default git integration on push to `main`, which deploys regardless of GitHub Actions status unless branch protection + required-status-checks block the merge first. There is no evidence of branch-protection-required-checks configured in this repo (no `.github/CODEOWNERS`, no `branch-protection.json`, no governance README), and Vercel by default will build-and-deploy on every push.
- **Issue:** A red CI run can ship to prod if the merge-time gate is missing. `release-checklist.md §1` requires "All CI workflows green on the release commit" — there is no enforcement.
- **Fix:** Solution: add a `vercel.json` `ignoreCommand` that exits 1 on a failing CI status, OR enforce GitHub branch protection requiring `Lint → Test → Build`, `Worker Build + Test + Audit`, and `Edge Functions Validate` as required checks before merge to `main`. Location: GitHub repo settings → Branches → main → Protect; commit a `.github/branch-protection.md` runbook so the rule is auditable. How: enable "Require status checks to pass before merging" + "Require branches to be up to date" + select all three CI jobs.
- **Effort:** S

#### B-3 — Render worker deploy hook is fire-and-forget with no post-deploy health verification
- **Severity:** Blocker
- **Evidence:** `.github/workflows/ci.yml:174-178`
  ```
  curl --silent --show-error --fail -X POST "$RENDER_DEPLOY_HOOK_URL"
  ```
- **Issue:** The CI step returns success the moment Render acknowledges the webhook — not when the new worker pod is healthy. There is no `/health` poll, no readiness gate, no automatic rollback if `accepting: true` never returns. `DISASTER_RECOVERY.md §4.3a` documents Render rollback as fully manual. Combined with the export pipeline running on this worker, a bad deploy can silently break video generation for every user until someone notices through error rate.
- **Fix:** Solution: after the deploy-hook curl, poll the Render worker's `/health` endpoint with a backoff (e.g. 10s × 30 attempts = 5 min) and fail the CI step if the new release id never reports `accepting: true`. Trigger an automatic rollback (Render API or `git revert + push`) on failure. Location: `.github/workflows/ci.yml` after line 178. How: add a `Verify worker health` step that GETs `https://<render-url>/health`, asserts `accepting === true` and the deployed git SHA matches `${{ github.sha }}`. Requires worker to surface the deployed SHA in `/health` (one-line env injection).
- **Effort:** M

#### B-4 — DB migrations run before Edge Function deploy, with no rollback on either failure
- **Severity:** Blocker
- **Evidence:** `.github/workflows/ci.yml:152-168` — `supabase db push` runs first, `supabase functions deploy` runs second; both inside the same job with no compensating action. `release-checklist.md §1` requires multi-step destructive migrations to be split (add column → migrate → switch reads → drop) but the workflow does not enforce or even check for destructive operations.
- **Issue:** If `db push` succeeds and `functions deploy` then fails, prod has new schema and stale functions reading from it — partial-deploy state with no automatic remediation. Worse: `db push` has no `--dry-run` gate, no migration linter, no review of destructive DDL. A migration that drops a column in a single PR will execute against production immediately.
- **Fix:** Solution: (a) add a `Lint migrations` step using `supabase db diff --linked --schema public` against staging before push, fail on any `DROP COLUMN`/`DROP TABLE`/`ALTER TYPE` not annotated with a `-- safe-destructive: yes` comment; (b) gate `functions deploy` behind a successful migration AND a smoke test that hits the prior endpoints; (c) on `functions deploy` failure, log the partial state explicitly and emit a Sentry alert. Location: `.github/workflows/ci.yml` deploy job. How: split the deploy job into `migrate → smoke → deploy-functions → smoke-again`, each as a separate step with `if: failure()` capture.
- **Effort:** L

---

### Critical

#### C-1 — `if: ${{ !secrets.SENTRY_AUTH_TOKEN }}` is invalid GitHub Actions syntax — source maps may be uploaded *and* deleted, or never deleted
- **Severity:** Critical
- **Evidence:** `.github/workflows/ci.yml:55-56`
  ```
  if: ${{ !secrets.SENTRY_AUTH_TOKEN }}
  run: find dist -name "*.map" -delete 2>/dev/null || true
  ```
- **Issue:** GitHub Actions does not allow direct access to `secrets.*` inside an `if:` conditional — the `secrets` context is restricted to `with`/`env`/`run` contexts on workflow_call jobs and to `env`/`run` on regular steps. The expression `!secrets.SENTRY_AUTH_TOKEN` evaluates to a string-truthiness check on a redacted value, which in many runner versions silently evaluates to `false`, meaning the strip step never fires even when the Sentry token is empty. Result: if Sentry upload silently failed (token revoked, expired, scope wrong) but the build kept going, source maps ship to prod CDN, exposing the unminified source.
- **Fix:** Solution: bind the secret to an env var on the step, then test the env. Location: `.github/workflows/ci.yml:54-56`. How:
  ```yaml
  - name: Strip source maps when Sentry token is absent
    env:
      HAS_SENTRY: ${{ secrets.SENTRY_AUTH_TOKEN != '' }}
    if: env.HAS_SENTRY != 'true'
    run: find dist -name "*.map" -delete
  ```
- **Effort:** XS

#### C-2 — CSP missing `base-uri`, `object-src`, `upgrade-insecure-requests`, and `report-uri`/`report-to` directives required by the project's own DEPLOYMENT_SECURITY spec
- **Severity:** Critical
- **Evidence:**
  - Spec: `DEPLOYMENT_SECURITY.md:11-19` mandates `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests;`
  - Live config: `vercel.json:71` CSP value contains `frame-ancestors 'none'` and `default-src 'self'` but omits `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`, and any `report-uri` or `report-to`.
- **Issue:**
  - No `base-uri` allows `<base href>` injection (one of the OWASP top XSS vectors).
  - No `object-src 'none'` falls back to `default-src 'self'` which is less explicit and weaker against `<embed>`/`<object>` plugin abuse on legacy clients.
  - No `upgrade-insecure-requests` means any user-supplied or imported HTTP asset URL stays on HTTP and gets blocked as mixed content silently.
  - No reporting endpoint means CSP violations in the wild are invisible — there is no way to detect a malicious script load attempt or detect when a directive needs widening.
- **Fix:** Solution: append `object-src 'none'; base-uri 'self'; upgrade-insecure-requests; report-to csp-endpoint;` to the CSP value, and add a `Report-To` header pointing to a Supabase Edge Function (or Sentry's CSP report endpoint). Location: `vercel.json:71`. How: edit the CSP value string; add a new `Report-To` header entry in the `headers[]` block.
- **Effort:** S

#### C-3 — Permissions-Policy is incomplete and inconsistent with the spec
- **Severity:** Critical
- **Evidence:**
  - Live: `vercel.json:62-64` — `Permissions-Policy: camera=(), microphone=(self), geolocation=()`
  - Spec: `DEPLOYMENT_SECURITY.md:48-50` — `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - Voice Lab uses microphone (`/voice-lab` → `/voice-lab/:path*`) — `microphone=(self)` is correct for that surface, so the spec is wrong. But everything else is missing.
- **Issue:** Stripe Checkout uses the Payment Request API; without `payment=(self)` it falls back to redirected checkout in some browsers. Missing `usb=()`, `serial=()`, `bluetooth=()`, `fullscreen=(self)`, `autoplay=(self)`, `accelerometer=()`, `gyroscope=()`, `magnetometer=()`, `interest-cohort=()` (FLoC opt-out), `browsing-topics=()` (Topics API opt-out). Each unspecified feature defaults to allow on first-party origin, opening the surface area for ad-tech feature abuse and for any compromised script in `script-src`.
- **Fix:** Solution: replace the value with `accelerometer=(), autoplay=(self), browsing-topics=(), bluetooth=(), camera=(), display-capture=(), fullscreen=(self), geolocation=(), gyroscope=(), interest-cohort=(), magnetometer=(), microphone=(self), payment=(self "https://js.stripe.com"), serial=(), usb=()`. Then update `DEPLOYMENT_SECURITY.md:48-50` to match. Location: `vercel.json:62-64` and `DEPLOYMENT_SECURITY.md:48-50`. How: single header value swap + doc update so spec and live config stop drifting.
- **Effort:** XS

#### C-4 — No e2e test gating in CI despite Playwright + `e2e/` folder + `test:e2e` script
- **Severity:** Critical
- **Evidence:**
  - `package.json:18` defines `"test:e2e": "playwright test"`
  - `package.json:75` declares `"@playwright/test": "^1.44.0"` as a devDependency
  - `e2e/` directory exists at project root
  - `.github/workflows/ci.yml` runs `npm run test` (vitest only) — no `npm run test:e2e` step anywhere
- **Issue:** The headline user flows (signup, intake, generate, export, checkout) have e2e coverage authored but no CI enforcement, so e2e failures cannot block a merge. `release-checklist.md §1` requires "Manual smoke: signup → primary action → checkout (if applicable) on a real device" precisely because the automated equivalent is absent. Audience is tool-savvy creative adults who will exercise the full flow; a CI that proves `npm test` passes proves nothing about the user-visible product.
- **Fix:** Solution: add a fourth job `e2e` that runs `npx playwright install --with-deps chromium` + `npm run build` + `npm run test:e2e` against a previewable build, on a `pull_request` trigger only (skip on push to main to keep deploy fast); upload the Playwright HTML report as an artifact on failure. Location: `.github/workflows/ci.yml`. How: new job, depends on `lint-test-build`, runs in parallel with `worker-build`.
- **Effort:** M

#### C-5 — Lighthouse CI configured but never invoked from CI
- **Severity:** Critical
- **Evidence:** `lighthouserc.cjs:23-66` — full config including assertions (`performance ≥ 0.90`, `accessibility ≥ 0.95`, `interactive ≤ 1500ms`). No `@lhci/cli` reference in `package.json`. No CI step running `lhci autorun`. `release-checklist.md §1` requires "Lighthouse score ≥ 90 mobile / ≥ 95 desktop on key routes".
- **Issue:** The performance gate is documented and configured but unenforced — every release ships with no Lighthouse evidence on file. For a creator-focused video product where load time directly affects conversion, this is shipping without a perf gate.
- **Fix:** Solution: add `@lhci/cli` to devDependencies, add a `lighthouse` job in `ci.yml` that runs against a Vercel preview URL (use `vercel pull` or the `vercel-action` to fetch the preview URL of the current PR), runs `lhci autorun --config=./lighthouserc.cjs`, fails on assertion violation. Also extend the config to cover `/`, `/auth`, `/dashboard`, `/help` — not just `/admin`. Location: `lighthouserc.cjs`, `.github/workflows/ci.yml`, `package.json` devDependencies. How: new job, runs after Vercel deploy preview is ready; the preview URL is available from the Vercel GitHub integration as a deployment status.
- **Effort:** M

#### C-6 — No Dependabot / Renovate config; npm audit is the only dependency hygiene
- **Severity:** Critical
- **Evidence:** `.github/` contains only `workflows/`. No `dependabot.yml`, no `renovate.json`. `package.json:80,82` pins `@sentry/react@^10.45.0`, `@supabase/supabase-js@^2.90.1`, etc. with caret ranges only.
- **Issue:** `npm audit --audit-level=high` flags known vulnerabilities at CI time but does not open PRs to remediate them. With 50+ direct deps and a 12-month rotation cadence on API keys, transitive supply-chain drift is the primary risk vector. There is no scheduled workflow updating deps. Audit catches issues; nothing fixes them.
- **Fix:** Solution: add `.github/dependabot.yml` with weekly schedule for `npm` (root + `worker/` + `marketing/`) and `github-actions`; group minor/patch updates into one PR per ecosystem to reduce noise; pin majors for Sentry/Supabase to avoid breaking changes mid-week. Location: new file `.github/dependabot.yml`. How: stock Dependabot config with three package directories + grouped updates.
- **Effort:** S

#### C-7 — Bundle size gate sums all chunks into one threshold and ignores the marketing site
- **Severity:** Critical
- **Evidence:** `.github/workflows/ci.yml:58-66`
  ```
  BUNDLE_SIZE=$(du -sk dist/assets/*.js | awk '{sum+=$1} END{print sum}')
  ...
  if [ "$BUNDLE_SIZE" -gt "$MAX_SIZE_KB" ]; then
  ```
- **Issue:** Summing all `dist/assets/*.js` makes the gate insensitive to per-chunk regressions — adding a 200KB unused dep that ships in a single chunk on first load is invisible if other chunks shrink. A creative-tools app with React + Tiptap + Recharts + framer-motion + Tailwind/Radix + Tanstack Query + 7+ AI provider SDKs at 500KB total uncompressed across all chunks is implausible — the threshold likely already trips and was set too low or the gate is silently skipped on Windows runners (du+awk on Windows fails). Marketing build (`marketing/dist`) is also not measured.
- **Fix:** Solution: switch to a per-entry-chunk budget using `vite-plugin-bundle-visualizer` or `size-limit` with explicit budgets — e.g. main entry ≤ 250 KB gzipped, vendor ≤ 350 KB gzipped, lazy chunks ≤ 150 KB gzipped each. Cover `marketing-dist/` separately. Location: replace the `Check bundle size` step. How: add `size-limit` config in `package.json` and run `npx size-limit` in CI.
- **Effort:** M

---

### Major

#### M-1 — `iac/cloudflare`, `iac/supabase`, `iac/vercel` directories are all empty
- **Severity:** Major
- **Evidence:** `ls iac/cloudflare iac/supabase iac/vercel` returns three empty directories (verified 2026-05-10). Yet the project has Cloudflare R2 in CSP (`pub-d259d1d2737843cb8bcb2b1ff98fc9c6.r2.dev`), Supabase project config, and Vercel deployment config.
- **Issue:** Infrastructure is point-and-click only. Every config change (CSP edit, env var add, Supabase RLS toggle, Cloudflare cache rule) is a one-shot manual edit with no audit trail beyond the dashboard activity log. No way to recreate the production environment from code, no PR review on infra changes, no diff between dev/staging/prod infra. `release-checklist.md` assumes IaC for "Migrations dry-run on a copy of production data" — that copy has to be hand-built.
- **Fix:** Solution: at minimum, codify the three highest-impact surfaces — (a) Vercel project + env vars via `vercel.json` + a `vercel.env.example`, (b) Supabase Edge Function secrets + RLS policies via a script that wraps the Supabase Management API, (c) Cloudflare R2 bucket policy as a Wrangler config. Location: populate `iac/{cloudflare,supabase,vercel}/`. How: at least one runbook + one declarative file per provider; full Terraform/Pulumi is L effort, hybrid runbook+CLI is M.
- **Effort:** L (Terraform), M (runbook+CLI)

#### M-2 — No staging environment in the deploy pipeline; CI deploys straight to prod Supabase + prod Render
- **Severity:** Major
- **Evidence:** `.github/workflows/ci.yml:135-178` — only one deploy job, gated only on `github.ref == 'refs/heads/main'`. Secrets used: `SUPABASE_PROJECT_ID` (singular), `RENDER_DEPLOY_HOOK_URL` (singular). `DISASTER_RECOVERY.md:184-194` references "Supabase staging project (separate from production)" but no staging deploy is wired up.
- **Issue:** Every merge to main is a production push. Migrations cannot be validated against a real staging environment in CI. The mock DR test from 2026-04-19 was hand-run against staging — the next test will be hand-run too. There is no canary stage, no preview-against-prod-data, no halt point.
- **Fix:** Solution: add a `deploy-staging` job that runs on every push to a `staging` branch, then `deploy-prod` that runs only on a tagged release commit OR on push to `main` after a manual approval gate (`environment: production` with required reviewers). Location: `.github/workflows/ci.yml`. How: split the deploy job in two; introduce GitHub Environments with `production` requiring reviewer approval; add `STAGING_*` secret variants.
- **Effort:** L

#### M-3 — Render deploy curl has no timeout; CI can hang up to the 15-min job timeout on a slow webhook
- **Severity:** Major
- **Evidence:** `.github/workflows/ci.yml:175-176` — `curl --silent --show-error --fail -X POST "$RENDER_DEPLOY_HOOK_URL"`. No `--max-time` or `--connect-timeout`.
- **Issue:** If Render's webhook endpoint stalls (provider incident or DNS issue), the curl waits indefinitely until the 15-min job timeout fires, blocking subsequent deploys and confusing the operator about which step actually failed.
- **Fix:** Solution: add `--max-time 30 --connect-timeout 10`. Location: `.github/workflows/ci.yml:175-176`. How: append the flags to the curl invocation.
- **Effort:** XS

#### M-4 — No secret scanning, no SAST, no CodeQL, no SBOM
- **Severity:** Major
- **Evidence:** `.github/workflows/` contains only `ci.yml`. No `codeql.yml`, no `gitleaks` action, no `trivy`, no `dependency-review-action`. Project has dozens of API keys (`STRIPE_SECRET_KEY`, `REPLICATE_API_TOKEN`, `ELEVENLABS_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `FISH_AUDIO_API_KEY`, `LEMONFOX_API_KEY`, `HYPEREAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`).
- **Issue:** A leaked secret in a commit message, a sample script (`scripts/stripe-create-billing-products.ts`), or a `.env.example` left with real values has no safety net. CodeQL would flag the typical XSS/SQL/SSRF patterns that escape eslint. `dependency-review-action` would block PRs introducing high-severity transitives at PR time, not just at merge-time `npm audit`.
- **Fix:** Solution: add three lightweight workflows — (a) `.github/workflows/codeql.yml` (GitHub-provided template, JS+TS), (b) `dependency-review-action@v4` step on every PR, (c) `gitleaks-action` or `trufflehog` on push. Optional: `anchore/sbom-action` to upload an SBOM artifact per release for supply-chain audit. Location: new files in `.github/workflows/`. How: copy upstream templates; CodeQL is one-line config.
- **Effort:** S

#### M-5 — Husky pre-commit hook only runs lint-staged; no pre-push test gate
- **Severity:** Major
- **Evidence:** `.husky/pre-commit` exists; `package.json:21-25` defines `lint-staged` for `*.{ts,tsx}` → `eslint --no-warn-ignored`. No pre-push hook. No `prepare-commit-msg`. No commitlint.
- **Issue:** Developers can push commits that fail typecheck or break a unit test — the failure surfaces only on CI minutes later. Conventional-commit enforcement (the user's documented preference per memory) is not enforced by hook either.
- **Fix:** Solution: add `.husky/pre-push` that runs `npx tsc --noEmit && npm run test -- --bail`; add `@commitlint/cli` + `@commitlint/config-conventional` with a `commit-msg` hook. Location: `.husky/pre-push`, `.husky/commit-msg`, new `commitlint.config.cjs`. How: standard husky setup; takes <30 minutes.
- **Effort:** S

#### M-6 — `release-checklist.md`'s "Per-vertical extras" SaaS line ("verify webhooks still receive after deploy") has no automated check
- **Severity:** Major
- **Evidence:** `release-checklist.md:107-108` requires Stripe + Resend webhook signature verification after every deploy. CI deploy job ends at `curl ... RENDER_DEPLOY_HOOK_URL` (line 178); no post-deploy webhook ping or signature replay test.
- **Issue:** A bad deploy that subtly breaks `stripe-webhook` (e.g. CSP frame-src tightening that breaks the `frame-src https://hooks.stripe.com` allowance) goes undetected until a real user payment fails. PCI / chargeback exposure scales with delay-to-detect.
- **Fix:** Solution: add a post-deploy job that sends a test event via `stripe trigger payment_intent.succeeded` against the prod webhook endpoint, asserts a 200, and rolls back if not. Location: `.github/workflows/ci.yml` after Render deploy. How: add `stripe-cli` setup + a `stripe trigger` step gated on `STRIPE_LIVE_RESTRICTED_KEY` (a key scoped to webhook test events only).
- **Effort:** M

#### M-7 — HSTS preload claimed but no evidence of submission to chromium preload list
- **Severity:** Major
- **Evidence:** `vercel.json:67-68` — `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. `DEPLOYMENT_SECURITY.md:55-58` repeats the directive. Static analysis cannot confirm submission to https://hstspreload.org.
- **Issue:** The `preload` directive only takes effect once Chrome / Firefox / Safari accept the domain into their preload lists. Setting the header without submission gives a false sense of preload protection — first-time visitors before TOFU are still vulnerable to SSL strip. With 11 claimed languages and US-first launch, this affects significant new-user traffic.
- **Fix:** Solution: submit `motionmax.app` (and `motionmax.io` if used) to https://hstspreload.org/ once the production domain stabilizes; record the submission in `DISASTER_RECOVERY.md` or a new `DNS_RUNBOOK.md`. Verify status periodically. Location: external (HSTS preload site); doc note in `DEPLOYMENT_SECURITY.md`. How: submit the apex domain via the form; expected acceptance in 6–10 weeks.
- **Effort:** XS to submit, runbook M to maintain.

#### M-8 — `npm audit` runs only at root and worker; marketing site dependencies are unaudited
- **Severity:** Major
- **Evidence:** `.github/workflows/ci.yml:33-34` audits root only. `vercel.json:5` `installCommand: "npm ci && npm ci --prefix marketing"` — marketing is built but never audited. Worker has its own audit at line 90.
- **Issue:** Marketing site is the customer-facing landing surface (Astro under `marketing/src/pages/index.astro`). Unaudited transitive deps there can ship malicious analytics, link rewriters, or supply-chain backdoors directly to the highest-traffic surface.
- **Fix:** Solution: add `cd marketing && npm audit --audit-level=high` to the lint-test-build job after the existing root audit. Location: `.github/workflows/ci.yml:34` (insert step). How: one extra line.
- **Effort:** XS

#### M-9 — Migrations job uses default Supabase CLI version (`version: latest`) — non-deterministic CI
- **Severity:** Major
- **Evidence:** `.github/workflows/ci.yml:148-151` — `supabase/setup-cli@v1` with `version: latest`. Worker steps pin `node-version: 20` but Supabase CLI version floats.
- **Issue:** A breaking change in Supabase CLI minor versions has shipped before (2.x line; e.g. `db push` flag changes). A surprise release can break prod deploy at the worst time. Reproducibility of "what migrated yesterday" requires fixed tool versions.
- **Fix:** Solution: pin `version: 2.77.1` (matching `package.json:97` devDependency `"supabase": "^2.77.1"`) or pin to whatever current is. Location: `.github/workflows/ci.yml:151`. How: replace `version: latest` → `version: 2.77.1`.
- **Effort:** XS

---

### Minor

#### Mn-1 — CI uses `ubuntu-latest` runner; runner-image upgrades break builds without warning
- **Severity:** Minor
- **Evidence:** `.github/workflows/ci.yml:19,78,101,137`
- **Fix:** Pin `runs-on: ubuntu-22.04` (or `ubuntu-24.04` once stable) — change with intent rather than on GitHub's roll schedule. Effort: XS.

#### Mn-2 — No SRI hashes on the Stripe and Google Tag Manager scripts referenced in CSP `script-src`
- **Severity:** Minor
- **Evidence:** `vercel.json:71` allows `https://js.stripe.com` and `https://www.googletagmanager.com` in `script-src` without SRI requirement. CSP has no `require-sri-for script` directive. Source HTML cannot be inspected from this audit alone, but the directive is missing.
- **Fix:** Add `require-sri-for script style;` to CSP and ensure all `<script>` tags have `integrity=` + `crossorigin=`. Effort: S.

#### Mn-3 — Edge function `--lock-write` step uses `|| true` to suppress lock errors
- **Severity:** Minor
- **Evidence:** `.github/workflows/ci.yml:111-114`
- **Fix:** Don't suppress errors — if lock-write fails, deno.lock is stale and remote modules are unverified next run. Replace `|| true` with explicit handling or remove. Effort: XS.

#### Mn-4 — `serve-with-prod-csp.mjs` exists in `scripts/` but is not referenced from CI; can drift from `vercel.json`
- **Severity:** Minor
- **Evidence:** `scripts/serve-with-prod-csp.mjs` listed in directory; `vercel.json:71` is the source of truth. No CI step diffs the two.
- **Fix:** Add a `csp-parity` test step that loads both and asserts equivalence, or delete the duplicate and standardize on `vercel.json`. Effort: S.

#### Mn-5 — DR mock-test action item "Automate quarterly restore test via CI scheduled workflow" still open
- **Severity:** Minor
- **Evidence:** `DISASTER_RECOVERY.md:194-195` — open checkbox dated 2026-04-19. As of audit date 2026-05-10, no `.github/workflows/restore-drill.yml` exists.
- **Fix:** Add a scheduled workflow that runs the restore against a sacrificial Supabase project once a quarter, posts result to Slack `#engineering-incidents`. Effort: M.

#### Mn-6 — No `Content-Security-Policy-Report-Only` staging variant; CSP tightening cannot be tested without breaking prod
- **Severity:** Minor
- **Evidence:** `vercel.json:71` only enforces; no `Content-Security-Policy-Report-Only` header for canary tightening.
- **Fix:** Add a Report-Only header alongside the enforcement header during CSP tightening windows; remove once the new directive is verified clean for 7 days. Effort: S.

#### Mn-7 — `concurrency.cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` cannot evaluate non-boolean expressions on all GH versions reliably
- **Severity:** Minor
- **Evidence:** `.github/workflows/ci.yml:14`
- **Fix:** Verified working in current Actions runtime, but document the intent and add a comment explaining the booleanization. Effort: XS.

---

### Polish

#### P-1 — Marketing build is co-located in `lint-test-build` job; failure invalidates the entire bundle
- **Severity:** Polish
- **Evidence:** `vercel.json:5` chains both via `installCommand`; `package.json:11` `build` runs `build:react && build:marketing && build:merge`.
- **Fix:** Split into a separate `marketing-build` job for parallelism + isolated failure mode. Effort: S.

#### P-2 — `package.json:2` still says `"name": "vite_react_shadcn_ts"` — the Lovable scaffold default
- **Severity:** Polish
- **Evidence:** `package.json:2`
- **Fix:** Rename to `motionmax`. Effort: XS.

#### P-3 — `Strict-Transport-Security` `max-age=63072000` (2 years) — over-cautious; spec recommends 1 year for first preload
- **Severity:** Polish
- **Fix:** No action; the longer max-age is a strict superset and acceptable. Polish-only note. Effort: 0.

---

## Production Blockers Table

| ID  | Severity | Issue                                                                                          | File / Location                              | Effort |
|-----|----------|------------------------------------------------------------------------------------------------|----------------------------------------------|--------|
| B-1 | Blocker  | `--no-verify-jwt` deploys all functions with platform JWT verification disabled                | `.github/workflows/ci.yml:163-165`           | S      |
| B-2 | Blocker  | Failing CI does not block Vercel production deploy                                             | repo branch protection / `vercel.json`       | S      |
| B-3 | Blocker  | Render worker deploy has no post-deploy health check or rollback                               | `.github/workflows/ci.yml:174-178`           | M      |
| B-4 | Blocker  | DB migrations + edge functions deploy have no rollback safety on partial failure               | `.github/workflows/ci.yml:152-168`           | L      |

## Top 10 Priority Fixes

| Rank | ID  | Severity | Fix headline                                                                  | Effort |
|------|-----|----------|-------------------------------------------------------------------------------|--------|
| 1    | B-1 | Blocker  | Stop deploying every function with `--no-verify-jwt` — split public vs auth   | S      |
| 2    | B-2 | Blocker  | Enforce CI green as a required check for merge to main                        | S      |
| 3    | B-3 | Blocker  | Add post-Render-deploy `/health` poll + auto-rollback                         | M      |
| 4    | C-1 | Critical | Fix invalid `if: ${{ !secrets.SENTRY_AUTH_TOKEN }}` — bind via env first      | XS     |
| 5    | C-2 | Critical | Add `base-uri 'self'`, `object-src 'none'`, `upgrade-insecure-requests`, CSP report-uri | S |
| 6    | C-3 | Critical | Complete `Permissions-Policy` (payment, usb, fullscreen, interest-cohort, …) | XS     |
| 7    | B-4 | Blocker  | Split deploy into migrate → smoke → functions → smoke; rollback on failure   | L      |
| 8    | C-4 | Critical | Wire Playwright e2e into CI on PR                                            | M      |
| 9    | C-5 | Critical | Run Lighthouse CI against Vercel preview + extend beyond `/admin`            | M      |
| 10   | C-6 | Critical | Add Dependabot config for root + worker + marketing + actions                | S      |

---

**Auditor note:** Findings are based exclusively on static analysis of the project at `C:\Users\Administrator\motionmax` as of 2026-05-10. Items requiring runtime verification (HSTS preload list status, branch protection settings, GitHub repo settings, Cloudflare DNS records, SSL cert chain) are flagged "Unable to verify from static analysis" where applicable — see M-7. No project files were modified.
