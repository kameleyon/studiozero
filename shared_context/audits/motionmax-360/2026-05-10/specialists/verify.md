# VERIFY — Supply Chain & Dependency Security Findings
**Project:** motionmax-360
**Audit date:** 2026-05-10
**Specialist:** Verify (Dependency & Supply Chain Security)
**Categories owned:** §6 (Security & encryption — supply chain subset) + §14 (Production readiness — CI/CD supply chain)
**Source under audit:** `C:\Users\Administrator\motionmax`

---

## Scope

This report covers ONLY supply-chain concerns: third-party dependency CVEs, SBOM completeness, license compliance, version-pinning discipline, abandoned/single-maintainer dependencies, typosquat risk, and CI/CD action pinning. Application-level security (auth, RLS, secrets handling, OWASP A01–A10 in first-party code) is delegated to Shield/Trace.

Three Node packages were scanned: `/` (frontend root), `/worker`, `/marketing`. Supabase Edge Functions (Deno) were scanned via static analysis of remote-import URLs.

**Headline metrics**
- Root package: 268 deps total, **12 vulnerabilities** (7 moderate, 5 high)
- Worker package: dependency count via lockfile, **6 moderate** vulnerabilities
- Marketing package: **3 vulnerabilities** (2 moderate, 1 high)
- Supabase Edge Functions: **8 functions** import Sentry from an UNPINNED URL
- SBOM: **none generated**
- Renovate / Dependabot: **none configured**
- CI actions: **all use floating tags**, none SHA-pinned

---

## Findings

### §14 — CI/CD Supply Chain

#### V-001 — `BLOCKER` — CI security audit gate is currently failing (5 high CVEs in root, 1 high in marketing)
- **Issue:** CI step `npm audit --audit-level=high` is configured at `.github/workflows/ci.yml:34` and `.github/workflows/ci.yml:90`. Root `npm audit` reports 5 HIGH vulnerabilities (serialize-javascript RCE GHSA-5c6j-r48x-rmvq CVSS 8.1; @babel/plugin-transform-modules-systemjs code-gen GHSA-fv7c-fp4j-7gwp CVSS 8.2; fast-uri path traversal GHSA-q3j6-qgpj-74h6 + GHSA-v39h-62p7-jpjc CVSS 7.5). Marketing `npm audit` reports 1 HIGH (astro reflected XSS GHSA-wrwg-2hg8-v723 CVSS 7.1). Either main is currently red on every push, or the gate is being silently bypassed. There is no marketing-package audit step in the workflow — `lint-test-build` only audits the root.
- **Evidence:**
  - `.github/workflows/ci.yml:33-34` (root audit)
  - `.github/workflows/ci.yml:89-90` (worker audit)
  - `npm audit` in root: `12 vulnerabilities (7 moderate, 5 high)`
  - `npm audit` in marketing: `3 vulnerabilities (2 moderate, 1 high)`
  - No audit step exists for `marketing/` package in CI
- **Fix:** Solution — bring main green by remediating V-002 through V-005 first; THEN add an audit step for `marketing/` mirroring the worker pattern. Location — add a new job `marketing-build` in `.github/workflows/ci.yml` after the `worker-build` job, with `cd marketing && npm ci && npm audit --audit-level=high`. How — copy the worker-build block, change paths, remove `tsc --noEmit` if not needed.
- **Effort:** S (after remediating V-002 to V-005)

#### V-002 — `CRITICAL` — Frontend root has 5 HIGH-severity CVEs in deployed bundle
- **Issue:** Frontend dependencies contain five HIGH-severity vulnerabilities. Two are reachable through the production build path (vite-plugin-pwa → workbox-build → @rollup/plugin-terser → serialize-javascript RCE; postcss XSS GHSA-qx2v-qp2m-jg93 used at build time and is a direct dep). Three are dev-only but still ship in CI (`@babel/plugin-transform-modules-systemjs`, `fast-uri`, `esbuild` GHSA-67mh-4wv8-2f99 dev-server SSRF).
- **Evidence:**
  - `package.json:101` — `vite ^5.4.19` (current safe: ≥6.4.2)
  - `package.json:102` — `vite-plugin-pwa ^0.19.8` (current safe: ≥0.21.1)
  - `package.json:96` — `postcss ^8.5.6` direct dep, vulnerable <8.5.10 (XSS via unescaped `</style>`)
  - `npm audit --json` output: `serialize-javascript <=7.0.4` GHSA-5c6j-r48x-rmvq CVSS 8.1
  - `npm audit --json` output: `@babel/plugin-transform-modules-systemjs 7.12.0–7.29.0` GHSA-fv7c-fp4j-7gwp CVSS 8.2
  - `npm audit --json` output: `fast-uri <=3.1.1` GHSA-q3j6-qgpj-74h6 + GHSA-v39h-62p7-jpjc CVSS 7.5 (both)
- **Fix:** Solution — bump direct vulnerable deps. Location — `package.json:96` `postcss` to `^8.5.10`, `package.json:101` `vite` to `^6.4.2` (semver-major; coordinate with V-003), `package.json:102` `vite-plugin-pwa` to `^0.21.1`, run `npm audit fix` for transitive serialize-javascript/babel/fast-uri/esbuild via `npm update`. How — bump in package.json, `npm install`, re-run `npm audit`, run full test suite, verify build artifact unchanged size order-of-magnitude.
- **Effort:** M (vite 5→6 is a breaking change; review vite.config.ts plugin order)

#### V-003 — `CRITICAL` — Marketing site uses outdated Astro with reflected XSS (CVSS 7.1)
- **Issue:** `marketing/package.json:12` pins `astro ^4.16.0`. Multiple CVEs apply: GHSA-wrwg-2hg8-v723 (reflected XSS via server islands, HIGH CVSS 7.1, fix in 5.15.6+), GHSA-hr2q-hp5q-x767 (URL manipulation middleware bypass, fix in 5.15.5+), GHSA-5ff5-9fcw-vg88 (X-Forwarded-Host reflection, fix in 5.14.3+), GHSA-fvmw-cj7j-j39q (stored XSS in /_image, fix in 5.15.9+), GHSA-ggxq-hp9w-j794 (URL-encoded middleware auth bypass), GHSA-x3h8-62x9-952g (dev-server arbitrary local file read). Marketing site is the public face — XSS here is reachable by anonymous users.
- **Evidence:**
  - `marketing/package.json:12` — `"astro": "^4.16.0"`
  - `npm audit` marketing: `Will install astro@6.3.1, which is a breaking change`
  - GHSA URLs referenced above (all confirmed in marketing `npm audit --json` output)
- **Fix:** Solution — upgrade to `astro@^5.x` (latest 5.x patched) or evaluate the 6.x migration. Location — `marketing/package.json:12`. How — bump to `astro: "^5.16.0"` minimum, run Astro 4→5 codemod (`npx @astrojs/upgrade`), re-test all marketing pages, re-run `npm audit`. Do NOT skip to 6.x unless you have time to validate the Tailwind v4 migration that ships with it.
- **Effort:** M (Astro 4→5 has documented breaking changes; pages need smoke-test)

#### V-004 — `CRITICAL` — Worker has 6 moderate CVEs incl. direct `uuid` bounds-check vulnerability
- **Issue:** Worker `npm audit` reports 6 moderate vulns. `uuid ^11.0.3` (direct dep at `worker/package.json:21`) has GHSA-w5hq-g745-h8pq (missing buffer bounds check in v3/v5/v6 with `buf` provided). Worker also pulls in vulnerable vite/esbuild/vitest chain through dev tooling. Worker is the FFmpeg/AI pipeline — RCE-class risk profile.
- **Evidence:**
  - `worker/package.json:21` — `"uuid": "^11.0.3"`
  - `worker/npm audit --json`: `uuid ... range >=11.0.0 <11.1.1` GHSA-w5hq-g745-h8pq
  - 5 additional moderate via vitest/vite/vite-node/@vitest/mocker/esbuild
- **Fix:** Solution — bump uuid to `^11.1.1` minimum, bump vitest to `^4.x`. Location — `worker/package.json:21` uuid, `worker/package.json:27` vitest. How — `cd worker && npm install uuid@^11.1.1 vitest@^4.1.5 -D`, re-run `npm audit`, re-run worker tests.
- **Effort:** S

#### V-005 — `CRITICAL` — All CI actions use floating tags instead of SHA pinning (SLSA L1 violation)
- **Issue:** Every GitHub Action in `.github/workflows/ci.yml` uses floating tag references (`@v4`, `@v1`, `@v1.x`). This means a compromised action publisher can ship malicious code into the next CI run — see the `tj-actions/changed-files` and `reviewdog` compromises of recent years where attackers replaced tags with malicious commits. The deploy job (lines 135-178) handles Supabase migrations, edge function deploys, and Render deploy hooks — a compromised action here can alter the production database.
- **Evidence:**
  - `.github/workflows/ci.yml:23` — `actions/checkout@v4`
  - `.github/workflows/ci.yml:25` — `actions/setup-node@v4`
  - `.github/workflows/ci.yml:70` — `actions/upload-artifact@v4`
  - `.github/workflows/ci.yml:81, 82, 102, 104` — same pattern
  - `.github/workflows/ci.yml:104` — `denoland/setup-deno@v1`
  - `.github/workflows/ci.yml:149` — `supabase/setup-cli@v1` with `version: latest` (worst case — both action and CLI version are floating)
- **Fix:** Solution — pin every `uses:` to a full commit SHA, with the version as a comment for human readability. Location — every `uses:` line in `.github/workflows/ci.yml`. How — replace `actions/checkout@v4` with `actions/checkout@<40-char-sha> # v4.2.2` (look up current SHAs from each action's release page), then enable `pin-github-action` Renovate manager (or use `pinact` CLI) to keep them current. Also pin `version: latest` on `supabase/setup-cli` to a specific version.
- **Effort:** S

#### V-006 — `MAJOR` — No Renovate or Dependabot configured — security patches won't reach the repo
- **Issue:** Repository contains no `.github/dependabot.yml`, no `renovate.json`, no `.renovaterc.json`. Without automated dependency updates, security patches require manual discovery and PR creation. The current state of the audit (12+6+3 vulns across packages) is direct evidence this gap exists in practice.
- **Evidence:**
  - `.github/` contents: only `workflows/`, no `dependabot.yml`
  - Repo root: no `renovate.json`, no `.renovaterc*`
- **Fix:** Solution — add Dependabot (zero-cost, GitHub-native) for security updates on all three package ecosystems. Location — create `.github/dependabot.yml`. How — configure `package-ecosystem: npm` for `/`, `/worker`, `/marketing`; add `package-ecosystem: github-actions` for `/`; group security updates in a single PR per ecosystem; require CI green before auto-merge for security patches only.
- **Effort:** S

#### V-007 — `MAJOR` — 8 Supabase Edge Functions import Sentry from a fully-unpinned URL
- **Issue:** Eight production-deployed Edge Functions import Sentry as `https://deno.land/x/sentry/index.mjs` with NO version in the URL. The `deno.lock` currently redirects this to `8.55.0`, but if the lock file is ever regenerated (e.g., on a contributor's machine without the lock present), Deno will fetch whatever `deno.land/x/sentry` resolves to at that moment. Affected functions handle Stripe webhooks, customer portal, subscription changes, support tickets — financially-sensitive code paths.
- **Evidence:**
  - `supabase/functions/cancel-with-reason/index.ts` — `import * as Sentry from "https://deno.land/x/sentry/index.mjs";`
  - Same unpinned import in: `create-checkout/index.ts`, `customer-portal/index.ts`, `list-invoices/index.ts`, `pause-subscription/index.ts`, `stripe-webhook/index.ts`, `submit-support-ticket/index.ts`, `update-pack-quantity/index.ts`
  - `deno.lock` line referencing redirect: `"https://deno.land/x/sentry/index.mjs": "https://deno.land/x/sentry@8.55.0/index.mjs"`
- **Fix:** Solution — pin every import URL to a specific Sentry version. Location — all 8 files listed above. How — replace `https://deno.land/x/sentry/index.mjs` with `https://deno.land/x/sentry@8.55.0/index.mjs` (matching what the lock currently resolves to), then commit. Consider migrating to `npm:@sentry/deno@<version>` once on Deno 1.40+ for native npm-import support and tighter integration with the existing `@sentry/node` and `@sentry/react` versions.
- **Effort:** XS

#### V-008 — `MAJOR` — Worker `@sentry/node` floats across all of v8 (`^8.0.0`)
- **Issue:** `worker/package.json:15` pins `@sentry/node` to `^8.0.0`. Because `^8.0.0` permits any 8.x.x release, every `npm install` on a fresh checkout could pull a newer minor/patch — including unreleased breaking changes the team has not validated. Render deploys re-resolve on each build unless `npm ci` is strictly enforced.
- **Evidence:**
  - `worker/package.json:15` — `"@sentry/node": "^8.0.0"`
  - `worker/package.json:7-8` — `"start": "tsx src/index.ts"` (Render runs tsx in production, no build step that would freeze deps)
- **Fix:** Solution — narrow the range. Location — `worker/package.json:15`. How — pin to `~8.55.0` (or whatever `worker/package-lock.json` currently resolves to) so only patch updates are accepted automatically; major bumps require deliberate review.
- **Effort:** XS

#### V-009 — `MAJOR` — `pdf-parse 2.4.5` is a single-maintainer dependency on a critical path
- **Issue:** `worker/package.json:19` depends on `pdf-parse@^2.4.5`. The package has a single maintainer (Mehmet Kozan) and is used in the worker's PDF ingestion path. Single-maintainer dependencies on an income-generating critical path (paid AI generation) are a supply-chain risk: the package can be hijacked, abandoned, or replaced. The 2.x branch is also a recent rewrite from the previous abandoned 1.x line.
- **Evidence:**
  - `worker/package.json:19` — `"pdf-parse": "^2.4.5"`
  - `worker/node_modules/pdf-parse/package.json` author field: `"author": "Mehmet Kozan"` (single)
- **Fix:** Solution — accept the risk OR audit alternatives. Location — worker PDF ingestion code (search worker/src for `pdf-parse` import). How — short term: pin to exact version `2.4.5`, add Subresource Integrity check via `npm install --save-exact`, monitor via Socket.dev or npm advisory feed. Long term: evaluate `pdfjs-dist` (Mozilla) or `unpdf` as multi-maintainer alternatives.
- **Effort:** S (immediate pin) / M (alternative migration)

#### V-010 — `MAJOR` — `lovable-tagger` is a single-maintainer Lovable.dev-specific build dep
- **Issue:** `package.json:94` uses `lovable-tagger ^1.1.13`, single maintainer (Emil Fagerholm), MIT-licensed. Used in vite plugin chain. Lovable.dev tooling that survived after the project graduated off the platform — risk if the Lovable team stops maintaining it. Not on the runtime path (dev/build only) so risk is reduced, but still in CI's npm install footprint.
- **Evidence:**
  - `package.json:94` — `"lovable-tagger": "^1.1.13"`
  - `node_modules/lovable-tagger/package.json` — `"author": "Emil Fagerholm"`, `"license": "MIT"`
- **Fix:** Solution — confirm the project still needs it. Location — `vite.config.ts` (search for `lovable-tagger` import). How — if the project no longer uses Lovable's hot-reload tagging, remove the dep and the plugin entry from `vite.config.ts`. If still needed, pin to exact version and document why in `package.json` via a comment commit.
- **Effort:** XS (removal) / S (audit)

#### V-011 — `MINOR` — `deno.land/std@0.190.0` is end-of-life and pinned to an old version across all Edge Functions
- **Issue:** Every Edge Function imports `https://deno.land/std@0.190.0/http/server.ts`. The Deno standard library has migrated to JSR (`@std/http`) and the `deno.land/x/std` mirror is deprecated. 0.190.0 is from mid-2023. Future Deno versions may break compatibility.
- **Evidence:**
  - `supabase/functions/admin-force-signout/index.ts:1`, plus 25+ other `index.ts` files all using `std@0.190.0`
- **Fix:** Solution — migrate to JSR `@std/http` or `Deno.serve` native (Deno 1.35+, supported by Supabase Edge runtime). Location — all 26 `supabase/functions/*/index.ts` files. How — replace `import { serve } from "https://deno.land/std@0.190.0/http/server.ts"` with native `Deno.serve(handler)` or `import { serve } from "jsr:@std/http@1/server"`.
- **Effort:** M (mass refactor — codemod-friendly)

#### V-012 — `MINOR` — `https://esm.sh/stripe@18.5.0` and `https://esm.sh/@supabase/supabase-js@2.90.1` pinned tightly but mixed loose pin (`@2`) appears in a few files
- **Issue:** Most Edge Functions pin Stripe and Supabase precisely (`stripe@18.5.0`, `@supabase/supabase-js@2.90.1`), but `clone-voice/index.ts` and `clone-voice-fish/index.ts` use only `@supabase/supabase-js@2`. Mixed pin discipline lets transitively-different Supabase client versions execute side-by-side, which can hide subtle behavior differences.
- **Evidence:**
  - `supabase/functions/clone-voice/index.ts:2` — `import { createClient } from "https://esm.sh/@supabase/supabase-js@2";`
  - `supabase/functions/clone-voice-fish/index.ts:2` — same
  - All other functions: `@supabase/supabase-js@2.90.1`
- **Fix:** Solution — normalize to the same pinned version. Location — both `clone-voice*` files. How — change `@2` to `@2.90.1` to match every other function.
- **Effort:** XS

#### V-013 — `MINOR` — No SBOM generated for any package
- **Issue:** No CycloneDX or SPDX SBOM is produced or committed for any of the three Node packages. Without an SBOM, post-incident response (e.g., next time a `tj-actions`-style compromise hits) requires manual lockfile diffing across three lockfiles to determine exposure. Also blocks future enterprise customer due-diligence requests.
- **Evidence:** No `*.cdx.json`, `*.spdx.json`, `bom.xml` anywhere in repo (verified via `find . -type f \( -name "*.cdx.*" -o -name "*.spdx.*" -o -name "bom.xml" \)`).
- **Fix:** Solution — add a CI step to generate SBOMs and upload as build artifact. Location — `.github/workflows/ci.yml` (one new step per package). How — `npx @cyclonedx/cyclonedx-npm --output-file sbom-root.cdx.json` per package, then `actions/upload-artifact` with name `sboms`. Alternatively, install the GitHub `dependency-graph` SBOM export.
- **Effort:** S

#### V-014 — `MINOR` — Worker pulls full `vitest@^2.0.0` chain into production node_modules (no prune step)
- **Issue:** `worker/package.json:27` lists `vitest ^2.0.0` as devDependency. The worker is deployed to Render via `tsx src/index.ts` with no documented `npm prune --omit=dev` step in `worker/package.json` or in `render.yaml` (file does not exist in repo root). If Render runs `npm install` (not `npm ci --omit=dev`), the production container ships dev tooling including vulnerable vite/vite-node/esbuild — increasing attack surface in the runtime image even though they aren't `import`ed.
- **Evidence:**
  - `worker/package.json:23-28` — devDependencies listed
  - No `render.yaml` at project root (verified)
  - `iac/` directory exists and contains `cloudflare`, `supabase`, `vercel` — but no `render` infra-as-code
- **Fix:** Solution — verify and document the Render install command. Location — Render dashboard service settings (out of repo). How — set Render build command to `npm ci --omit=dev` (or `--production`); add a `render.yaml` at root checked into git so the build command is auditable.
- **Effort:** S

#### V-015 — `POLISH` — No license inventory or third-party-notices file
- **Issue:** The studio licensing rubric requires tracking attribution-required licenses (BSD, MIT, Apache) and surfacing a third-party-notices file. None exists. License posture itself is clean — comprehensive scan returned 0 GPL/AGPL/SSPL/CDDL/EPL/MPL/EUPL/LGPL deps across all three packages, so this is purely process polish.
- **Evidence:**
  - License scan via `node` walking `node_modules`: 0 copyleft/weak-copyleft deps across root + worker + marketing
  - No `THIRD_PARTY_NOTICES`, `NOTICES.md`, `LICENSES.md`, or `licenses.txt` in repo
- **Fix:** Solution — generate at build time. Location — root build chain. How — `npx license-checker --production --json > public/third-party-licenses.json` per package, link from a `/legal/licenses` route in the app and a footer link on the marketing site.
- **Effort:** XS

#### V-016 — `POLISH` — No typosquat denylist or pre-install verification
- **Issue:** No tooling verifies new package additions against typosquat patterns. Project has 268+115+~50 = 433+ direct + transitive deps; risk of a typosquat slipping through during a future `npm install foo` is non-zero. No specific typosquats detected in current lockfiles (spot-checked top dependency names against legitimate packages — `@supabase/supabase-js`, `@radix-ui/*`, `@sentry/react`, `framer-motion` all match canonical names).
- **Evidence:** No `socket.dev` integration, no `npm-package-arg` validation step in CI, no denylist file.
- **Fix:** Solution — install `socket-security/socket` GitHub App OR add `pnpm audit` equivalent. Location — repository GitHub settings + optional CI step. How — install Socket Security GitHub App for free typosquat/install-script flagging on every dependency PR.
- **Effort:** XS

---

## Production Blockers

| ID | Severity | One-line | File |
|----|----------|----------|------|
| V-001 | Blocker | CI security audit gate fails (HIGH CVEs in root + marketing); main is red OR being silently bypassed | `.github/workflows/ci.yml:34, 90` |

---

## Top 10 Priority Fixes (this category)

| Rank | ID | Severity | Fix | Effort |
|------|----|----------|-----|--------|
| 1 | V-001 | Blocker | Bring CI security gate green (depends on V-002 to V-004) and add audit step for marketing | S after deps |
| 2 | V-002 | Critical | Bump root postcss to ^8.5.10, vite to ^6.4.2, vite-plugin-pwa to ^0.21.1; clear 5 HIGH CVEs | M |
| 3 | V-003 | Critical | Upgrade marketing astro to ^5.16.0+ (clears reflected XSS CVSS 7.1) | M |
| 4 | V-004 | Critical | Bump worker uuid to ^11.1.1, vitest to ^4.x | S |
| 5 | V-005 | Critical | SHA-pin every CI action (incl. supabase/setup-cli `version: latest`) | S |
| 6 | V-006 | Major | Add Dependabot for npm × 3 + github-actions ecosystem | S |
| 7 | V-007 | Major | Pin Sentry import URL in all 8 Edge Functions to `@8.55.0` | XS |
| 8 | V-008 | Major | Tighten worker `@sentry/node` from `^8.0.0` to `~8.55.0` | XS |
| 9 | V-009 | Major | Pin `pdf-parse` to exact version + plan migration to multi-maintainer alternative | S/M |
| 10 | V-013 | Minor | Generate CycloneDX SBOM per package in CI for incident response readiness | S |

---

## Out-of-scope notes
- Application code (Auth.tsx, Stripe webhook signature validation in `stripe-webhook/index.ts`, RLS policies, secrets handling): owned by Shield/Trace.
- License compliance posture is **clean** — no GPL/AGPL/SSPL/copyleft deps detected anywhere in the dependency tree. Only attribution-required licenses (MIT, Apache, BSD, ISC) are present.
- Lockfile integrity discipline is **good**: all three packages have lockfiles committed (`package-lock.json`, `worker/package-lock.json`, `marketing/package-lock.json`, `deno.lock`) with integrity hashes (1074 of 1074 entries in root lockfile have `integrity` fields). The remediation gap is the floating-tag GitHub Actions and missing automated update tooling, not lockfile hygiene.
