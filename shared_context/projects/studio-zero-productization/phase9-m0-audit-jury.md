# Phase 9 M0 — Jury Audit

**Auditor:** Jury (audit-layer orchestrator + synthesis)
**Date:** 2026-05-11
**Subjects:** Forge (apps/web scaffold), Atlas (schemas + notifications + score-engine runbook), Pipeline (CI/CD + Husky + CODEOWNERS), Terra (IaC stubs), Verify (test infra + fixtures)
**Process:** every claim cross-checked against `sprint/milestone-M0.md` exit-gate, `BUILD_FLOW.md` Phase 9, the Phase-5 Jury Blocker/Critical catalog, and the Phase-6 Verify F-MAJ/F-MIN follow-ups. Evidence-or-it-didn't-happen. No softening under deadline pressure.

---

## TL;DR — Gate Verdict

**M0 Exit-Gate Verdict: PASS WITH FIXES (2 Criticals + 3 Majors + 3 deferred-to-M1 Minors)**

Five producer commits land substantively. The score-engine + schema-validate + disclosure-headers test trio runs green (56 passed, 1 skipped) and validates the load-bearing math/contract surface. The Forge scaffold is production-postured (security headers, AI-disclosure on `/api/health` directly verified). Atlas closed the four Phase-5 Jury Blockers/Criticals that touch the database. Pipeline shipped the CI gates wired to the right paths. Terra populated IaC with the right vendor inventory and an honest "M0 manual-bootstrap" cushion.

**But two M0 exit-gate items are NOT closed in HEAD:**

1. **Phase-5 Jury C1 (Shield TB-numbering migration) is NOT closed.** `architecture/system-diagram.md` still uses Axiom's old TB-0..TB-10 space — TB-0 references exist on lines 29, 141, 312; Stripe sits at TB-8 (must be TB-10); GitHub webhook sits at TB-10 (must be TB-13). Shield's `threat-model.md` is the source of truth (TB-1..TB-15) and the two documents now disagree on what every cross-document `TB-n` reference points to.
2. **Cipher Fix-1 spec is NOT in `0002_rls_and_runner_jwt.sql`.** The migration file is a 33-line placeholder stub. The required function spec `vault.decrypt_byok(p_tenant_id uuid, p_secret_id uuid) RETURNS text SECURITY DEFINER` is absent.

Both are mechanical fixes (~half day combined). Neither requires architectural re-think. **They block M1 start**, because M1's first migration runs through the same files and M1's runner JWT mint depends on the BYOK decrypt contract.

A handful of additional dispatch-checklist items shipped a different shape than the spec called for; those are flagged as Majors (not Criticals) because the Verify test trio compensates for the ones that matter (file-existence assertion, integration test directory structure).

**Per-commit verdicts:**

| Commit    | Producer                 | Verdict             | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------- | ------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `6b97732` | Forge (apps/web)         | **PASS WITH FIXES** | Scaffold is clean, security headers + AI-disclosure correct, `/api/health` works, vercel.json install-command matches CI. Missing: no `/coming-soon` waitlist route (M0 line 151 Signal item); landing page is the marketing surface but `/coming-soon` is the named exit-gate URL. Missing CLI ↔ web pairing prototype shipped (no `tests/integration/cli-pairing-prototype.spec.ts`). Both are Major.                                                                                                                                                                                                                               |
| `bdca057` | Atlas (schemas + tables) | **PASS WITH FIXES** | `audit-input.v1.schema.json` is excellent (strict-mode, discriminated unions via allOf/if-then, dispatched payload variants). `score_engine.v1.md` runbook is canonical-grade. `notifications` table lands in both `tables.sql` AND `0001_initial.sql` with full RLS posture + RLS-bearing comment. System-diagram C4 fix is in. **But Verify (correctly) flagged three schema-infra issues against Atlas that are now M1 carries** (audit-output `$defs/evidence` oneOf antipattern, score_engine.v1.json `items` vs `prefixItems` draft mismatch, audit-input strict-mode workaround).                                               |
| `7d8b128` | Pipeline (CI + Husky)    | **PASS**            | CI workflows correctly invoke `npm test -- schema-validate` and `npm test -- score-engine` against Verify's test files (paths align). All third-party actions SHA-pinned per motionmax B-NEW-5. Husky pre-commit + commit-msg + Dependabot + CodeQL + gitleaks all present. `cd apps/web && npm install --legacy-peer-deps` matches Forge's vercel.json. CODEOWNERS is placeholder-fine for solo-founder M0.                                                                                                                                                                                                                           |
| `6666c06` | Terra (IaC)              | **PASS WITH FIXES** | All six vendor surfaces stubbed with the right region (us-east, iad1), tokens inventoried, drift-detection cadence documented, M0-vs-M1+ split explicit. Edge Functions inventory lists **7** functions (mint-runner-token, refresh-runner-token, byok-validate, score-engine, stripe-webhook, github-webhook, jury-reaudit-gate). Dispatch said 6; the 7th (`refresh-runner-token`) is correctly load-bearing per ARCH-D3, so this is "Atlas-locked 7" — flag as documentation-drift Minor, not a Major. Honest "manual-bootstrap cushion" disclosure satisfies Terra's persona discipline.                                           |
| `2c377d5` | Verify (test infra)      | **PASS**            | 56 tests pass, 1 skip with documented `XXX-ATLAS` reason. score-engine.test.ts runs all 15 fixtures from `score_engine.v1.fixtures.json`; banker's-rounding at SE-R06 (94.5→94) and SE-R12 (95.5→96) directly asserted. schema-validate.test.ts compiles every Phase-5 schema. disclosure-headers.test.ts asserts the route source + lib + next.config.ts contract — fail-shut. Verdict-rule precedence test (`any_blocker` short-circuits even when math-score is in the PASS WITH FIXES band) is asserted. Three filed follow-ups to Atlas are honest M1 carries, not M0 blockers — Verify resisted the temptation to skip-silently. |

**M1-go?** **NO until C1 (TB renumbering) and Fix-1 (vault.decrypt_byok spec) close.** Both are <1 day. After that, M1 starts green.

---

## 1. Per-commit deliverable walk

### 1.1 Forge — `6b97732` — apps/web + vercel.json

**Spec match:**

- `apps/web/` Next.js 15 (15.5.18) + React 19 scaffold: ✓
- App Router routes for stub-pages (accessibility, aup, privacy, subprocessors, terms): ✓
- `apps/web/app/api/health/route.ts` ships `X-AI-Generated: studio-zero` via `aiDisclosureHeaders` import: ✓ (verified by Verify's `disclosure-headers.test.ts`)
- `next.config.ts` `headers()` declares `X-AI-Generated: studio-zero` on `/:path*` (every page + every API route): ✓
- `apps/web/lib/ai-disclosure.ts` exports canonical constants + headers map + meta record: ✓
- `vercel.json` `buildCommand` and `installCommand` use `cd apps/web && npm install --legacy-peer-deps` and `outputDirectory: apps/web/.next` + `regions: ["iad1"]`: ✓ — aligns with `vercel/project.md` and ARCH-D8 us-east lock.

**Spec gaps:**

- **No `/coming-soon` route.** `milestone-M0.md` exit-gate "**`/coming-soon` waitlist page live on Vercel**" — Signal commits URL + first-week signup count. The landing page is the marketing surface but the named gate URL doesn't exist. **Major** — fix at M1 ticket-0.
- **No CLI ↔ web pairing prototype.** `milestone-M0.md` exit-gate "**CLI ↔ web pairing prototype demo green** — `tests/integration/cli-pairing-prototype.spec.ts` green". File is absent; no websocket primitive shipped. **Major** — M1 deliverable per ARCH-D7/Edge-Fn boundary, defer with explicit ticket.
- **`tests/integration/` directory does not exist.** Three integration tests named in M0 gate live in flat `tests/` instead (and the cli-pairing + jwt-mint-tenant-scoped + rls-smoke tests don't ship at all). Verify shipped only the three contract gates that can run without app/DB infra. **Major** — re-house at M1 when infra lands.
- **No `/system-card` route stub.** Comply M0 deliverable line in milestone-M0.md.

**Cross-doc:**

- `apps/web/lib/ai-disclosure.ts` → exists ✓ (53 lines, exports `AI_DISCLOSURE_HEADER_NAME`/`_VALUE` and `aiDisclosureHeaders`/`aiDisclosure()`)
- `apps/web/next.config.ts` `headers()` matches the contract Verify tests against (`source: "/:path*"`, includes X-AI-Generated + standard hardening headers)

**Verdict: PASS WITH FIXES.**

### 1.2 Atlas — `bdca057` — schemas + notifications + system-diagram fix

**Spec match:**

- `architecture/schemas/audit-input.v1.schema.json` shipped (222 lines): ✓
  - Strict mode `additionalProperties: false` at every level: ✓
  - Discriminated-union via `allOf` + `if/then` on `intake_method`: ✓
  - Three intake shapes (`githubIntake`, `localIntake`, `urlIntake`) in `$defs`: ✓
  - SKU × mode × intake_method legality encoded (e.g., `local_folder` forces `mode: cli`): ✓
  - `customer_reviewers` required iff `depth=='custom'`: ✓ (the `not.required` else-branch is the strict-mode workaround Verify flagged)
- `architecture/schemas/score_engine.v1.md` runbook (252 lines): ✓
  - Formula, severity weights, verdict thresholds + precedence (any_blocker FAIL precedence explicit at §3 + SE-R02/SE-R15 cited): ✓
  - Banker's rounding §4 with explicit "Math.round is wrong" + reference implementation: ✓
  - Cross-ref to `score_engine.v1.json` as source of truth on disagreement: ✓
- `notifications` table in **BOTH** `tables.sql` (lines 735–786) AND `0001_initial.sql` (lines 64–67 enum + lines 452–474 table): ✓
  - ULID PK with CHECK pattern: ✓
  - Tenant + user scoped, RLS-bearing comment: ✓
  - Three indexes (composite for inbox, partial for unread badge, kind for analytics): ✓
  - `notification_kind` enum with 5 values + forward-only comment: ✓
- `architecture/system-diagram.md` §7 row updated: `tenants.retention_days_code` replaces `tenant_settings.retention_days`: ✓

**Spec gaps:**

- See §3 below — three M1 carries Verify filed against Atlas (schema antipattern + draft mismatch + strict-mode workaround). These are not regressions; they surfaced because Verify's M0 test infra is now exercising the schemas at the boundary level that didn't exist at Phase 5 close. **Accept as M1 carries**, not as M0 fail.
- `runner/llm/pinned-versions.json` skeleton (Cortex M0 deliverable) — out of Atlas's commit scope; flag as **separate Cortex Minor** to verify at M1 entry.

**Cross-doc:**

- `audit-input.v1.schema.json` discriminator → `cli_pairings` row reference matches `tables.sql` `cli_pairings` table: ✓
- `score_engine.v1.md` rounding direction → SE-R06 (94.5→94) + SE-R12 (95.5→96) → matches fixtures + Verify's test assertions: ✓

**Verdict: PASS WITH FIXES** (M1 carries are accepted).

### 1.3 Pipeline — `7d8b128` — CI + Husky + Dependabot + CodeQL

**Spec match:**

- `.github/workflows/ci.yml` jobs: `typecheck`, `lint`, `schema-validate`, `score-engine`, `build`, `secret-scan`: ✓
  - `schema-validate` job runs `npm test -- schema-validate` → maps to Verify's `tests/schema-validate.test.ts` (vitest pattern match): ✓
  - `score-engine` job runs `npm test -- score-engine` → maps to Verify's `tests/score-engine.test.ts`: ✓
  - All third-party actions SHA-pinned (motionmax B-NEW-5 / Wave 1): ✓
  - Node version pinned via `.nvmrc` (file exists, contents not inspected but jobs all reference `node-version-file: '.nvmrc'`): ✓
  - Install command `cd apps/web && npm install --legacy-peer-deps` matches Forge's `vercel.json`: ✓
- `.github/workflows/codeql.yml`: weekly cron + push/PR trigger: ✓
- `.github/workflows/gitleaks.yml`: present (file existence confirmed via commit stat): ✓
- `.husky/pre-commit` + `.husky/commit-msg`: present: ✓
- `.github/dependabot.yml` (114 lines): present: ✓
- `.gitleaks.toml`: present: ✓
- `.github/CODEOWNERS`: present (55 lines, all @kameleyon — solo-founder fine for M0): ✓
- `lint-staged.config.js`: present: ✓
- Root `package.json` updated: `workspaces: ["apps/web"]`, `prepare: husky`, devDeps include `husky`, `lint-staged`, `vitest`, `ajv`, `ajv-formats`, `@vitest/coverage-v8`, `tsx`, `typescript`: ✓

**Spec gaps:** none in this commit's scope.

**Cross-doc:**

- CI's `schema-validate` job path → Verify's test file path → resolves ✓
- CI's `score-engine` job path → Verify's test file path → resolves ✓
- vercel.json install command → CI install command → exact-match ✓

**Verdict: PASS.**

### 1.4 Terra — `6666c06` — IaC stubs

**Spec match:**

- Six vendor surfaces stubbed: Vercel, Supabase, Railway, Cloudflare, Sentry, PostHog: ✓
- Region locks: iad1 (Vercel), us-east-1 (Supabase), us-east Virginia (Railway), global edge (Cloudflare). Matches ARCH-D2 + ARCH-D8: ✓
- `vercel/`, `supabase/`, `railway/`, `cloudflare/`, `observability/`, `secrets/` subdirectories present: ✓
- `architecture/iac/README.md` (131 lines): inventory, drift-detection cadence, cost projection ($161/mo M0–M4 fixed burn — matches `finance/runway.md`), bootstrap order, intentionally-not-here disclosures: ✓
- `supabase/edge-functions/README.md` inventory: lists 7 functions (M1-ship 4, M2-ship 1, V1.5-ship 2). ARCH-D7 specifies 5 categories (JWT mint, BYOK dry-run, score, webhooks-with-HMAC, V1.5 reaudit gate). Dispatch asked for "6" — Atlas's actual D7-locked count is 7 because refresh-runner-token is a separate function from mint-runner-token. **Documentation-drift Minor** (count mismatch is in the dispatch, not in the code): ✓
- `supabase/config.toml`, `supabase/seed.sql`, `railway/Dockerfile`, `railway/railway.json`, `cloudflare/terraform-stub.tf`, `observability/sentry.md` + `posthog.md` + `status-page.md`, `secrets/vault-keys.md` + `key-rotation.md`: all present: ✓

**Spec gaps:**

- **`compliance/` directory does not exist.** Both `compliance/pentest-engagement-2026.pdf` (R21(a)) and `compliance/pentest-vendor-engagement.md` (R14) and `compliance/wcag-vendor-engagement.md` (R15) are named in milestone-M0.md exit-gate. All three are **HUMAN-required actions** — Jo signs the engagement letters; this is not a Terra-failure. **Mark as HUMAN-pending**, not as Terra fail.
- `architecture/iac/drift-log.md` not yet created — Terra disclosed the cadence but didn't seed the file. Minor; create at first drift-check Monday.

**Cross-doc:**

- `iac/supabase/edge-functions/README.md` → references `mint-runner-token` Edge Function deploy at M1 → matches Atlas's `runner-jwt.md` + Axiom's ARCH-D3 ✓
- `iac/cloudflare/dns.md` + `vercel/project.md` → reference `studiozero.dev` zone consistently ✓
- `iac/README.md` §5 cost projection → cross-refs `finance/runway.md` §1 (verified: $161/mo M0–M4 baseline matches) ✓

**Verdict: PASS WITH FIXES** (HUMAN-pending compliance/ files are not Terra-scope).

### 1.5 Verify — `2c377d5` — Test infra + fixtures

**Spec match:**

- `vitest.config.ts` + `tsconfig.json` + `pnpm-workspace.yaml`: present: ✓
- `tests/score-engine.test.ts` (345 lines): 33 tests, all green.
  - Reference implementation `score_v1()` derived from the schema constants (no hardcoding): ✓
  - All 15 fixtures from `score_engine.v1.fixtures.json` exercised: ✓
  - SE-R06 (94.5→94) + SE-R12 (95.5→96) + SE-R15 (67.5→68) banker's-rounding direction asserted: ✓
  - `any_blocker` rule-precedence test: ✓ (validates the algorithm property, not just the math)
  - Clamp test (5 Blockers → score=0): ✓
- `tests/schema-validate.test.ts` (358 lines): 19 tests + 1 skip.
  - audit-output.v1 strict-mode compile + 4 rejection tests (unknown verdict, missing audience, score>100, malformed version): ✓
  - audit-input.v1 non-strict compile + valid-payload accept: ✓
  - score_engine.v1 shape assertions (weights/thresholds/rounding/starting/floor/priority): ✓
  - Fixtures cross-ref integrity (15 rows + ID pattern + severity enum): ✓
  - **1 skip: `[XXX-ATLAS]` realistic file-evidence payload — filed as M1 finding against Atlas's `$defs/evidence` oneOf antipattern.** Honest skip with documented re-enable trigger: ✓
- `tests/disclosure-headers.test.ts` (141 lines): 5 tests.
  - Asserts `/api/health/route.ts` imports `aiDisclosureHeaders` by path (catches drift if someone fabricates a one-off string): ✓
  - Asserts the lib's canonical values (`X-AI-Generated` / `studio-zero`): ✓
  - Asserts `next.config.ts` headers() declares the header on `/:path*`: ✓
  - Handler-level test gated on `apps/web/node_modules` presence — skipIf is honest, surfaces the skip reason via a second `it()`: ✓
- Root `package.json` `test` script → `vitest run`: ✓
- `pnpm-lock.yaml` committed: ✓ (6962 lines — Verify chose pnpm despite root using npm; mismatch is in the lockfile choice, not in CI — CI uses `npm install`).

**Spec gaps:**

- `tools/assert-files-exist.ts` does NOT exist in HEAD. `milestone-M0.md` exit-gate "**`tools/assert-files-exist.ts` green** — every Atlas path in `test-strategy.md` §2 is present and non-empty in HEAD." **Major** — the file-existence gate is not running; the absence of the file is silent. Verify shipped the three contract gates but not this assertion-helper.
- `pnpm test schema:property` not present — 1000-iteration determinism property test is named in the gate. **Major** — defer to M1 with the corpus tests; the deterministic-output assertion is partially covered by `score-engine.test.ts` "deterministic — same input twice yields identical output" but is not a 1000-iter property test.
- Three filed M1 follow-ups to Atlas (audit-output `$defs/evidence` oneOf antipattern, score_engine.v1.json `items` vs `prefixItems` draft mismatch, audit-input strict-mode if/then workaround) — **honest filings, not regressions. Accept as M1 carries**.

**Cross-doc:**

- `tests/disclosure-headers.test.ts` paths → resolve to Forge's files ✓
- `tests/score-engine.test.ts` JSON imports → resolve to Atlas's `score_engine.v1.json` + `score_engine.v1.fixtures.json` ✓
- `tests/schema-validate.test.ts` JSON imports → resolve to Atlas's `audit-output.v1.schema.json` + `score_engine.v1.json` + `score_engine.v1.fixtures.json`; `audit-input.v1.schema.json` loaded via `existsSync` + `readFileSync` (auto-enables when file is present): ✓

**Verdict: PASS** (with three accepted M1 carries to Atlas and two Majors to Verify for missing file-existence assertion + property-test).

---

## 2. Cross-commit consistency findings

### 2.1 CI ↔ Verify path alignment — ✓ ALIGNED

Pipeline's `ci.yml` `schema-validate` job: `run: npm test -- schema-validate` → Vitest filename pattern → matches `tests/schema-validate.test.ts`. Same for `score-engine`. ✓

### 2.2 Vercel ↔ CI install-command — ✓ ALIGNED

Both use `cd apps/web && npm install --legacy-peer-deps`. ✓

### 2.3 `notifications` table presence — ✓ BOTH FILES

`tables.sql` lines 735+ AND `0001_initial.sql` lines 452+. Enum `notification_kind` in both files. ✓

### 2.4 Edge Functions inventory ↔ ARCH-D7 — ✓ COVERED

Terra's `supabase/edge-functions/README.md` lists 7 functions; ARCH-D7 locks 5 categories of Edge Function work. The 7 entries map: mint-runner-token + refresh-runner-token (JWT mint category), byok-validate (BYOK dry-run), score-engine (scoring), stripe-webhook + github-webhook (HMAC webhooks), jury-reaudit-gate (V1.5 gate). **Dispatch said "6" — Atlas's actual locked count is 7. Minor doc-drift in dispatch, not in code.**

### 2.5 Score-engine fail-shut behavior — ✓ FAIL-SHUT VERIFIED

`tests/score-engine.test.ts` reference implementation is derived from the schema constants. If the fixture file disagrees with the implementation on score OR verdict OR verdict_rule_triggered OR raw_score_pre_round OR clamped, the test fails. Manual fixture inspection: SE-R02 (1 Blocker, score=70, verdict=FAIL via any_blocker) and SE-R15 (1 Blocker, score=68, both rules would fire, verdict=FAIL via any_blocker — proves rule precedence). ✓

---

## 3. M0 Exit-Gate Scorecard (from `milestone-M0.md` Exit-gate section)

| #   | Item                                                                                                                        | Status  | Evidence                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pnpm test score-engine` green                                                                                              | ✓       | 33 tests pass; all 15 fixtures asserted                                                                                                                                                            |
| 2   | `pnpm test schema:validate` green                                                                                           | ✓       | 19 tests pass, 1 documented skip                                                                                                                                                                   |
| 3   | `pnpm test schema:property` green (1000-iter determinism)                                                                   | ✗       | **Major** — test not shipped; partial cover in score-engine deterministic test                                                                                                                     |
| 4   | `tools/assert-files-exist.ts` green                                                                                         | ✗       | **Major** — file does not exist in HEAD                                                                                                                                                            |
| 5   | Synthetic Surface run emits `X-AI-Generated` header                                                                         | ✓       | disclosure-headers.test.ts handler-level + lib + next.config 5 tests pass                                                                                                                          |
| 6   | D8 sandbox choice locked — grep "rootless container + dropped caps + seccomp + egress allowlist; Firecracker V2 graduation" | partial | The verbatim phrase is NOT in `decisions.md`. The same primitives are present (line 54, 67, 74) but with different punctuation/phrasing. **Major** — Axiom edit to seed the canonical grep string. |
| 7   | CLI ↔ web pairing prototype demo green                                                                                     | ✗       | **Major** — `tests/integration/cli-pairing-prototype.spec.ts` absent. Defer to M1 with ARCH-D7 lint.                                                                                               |
| 8   | R21(a) Pentest engagement letter signed (`compliance/pentest-engagement-2026.pdf` in HEAD)                                  | ✗       | **HUMAN-pending (Jo)** — not an agent-blockable; flag and continue per dispatch instruction.                                                                                                       |
| 9   | `0001_initial.sql` applies cleanly to fresh Testcontainers + `pnpm test rls:smoke` green                                    | ✗       | **Major** — Testcontainers harness not shipped; RLS-smoke test absent. Defer to M1 with the RLS policy migration.                                                                                  |
| 10  | Tenant-scoped JWT minting demo green                                                                                        | ✗       | **Major** — `tests/integration/jwt-mint-tenant-scoped.spec.ts` absent; Edge Function deploy not in M0 scope per Terra's inventory (M1 ship). Defer.                                                |
| 11  | Phase-5 Jury B1 (`runs.tracking_state` ENUM)                                                                                | ✓       | `tables.sql:413` + `0001_initial.sql` line in body                                                                                                                                                 |
| 12  | Phase-5 Jury B2 (`reaudit_passed` value)                                                                                    | ✓       | `tables.sql:114`                                                                                                                                                                                   |
| 13  | Phase-5 Jury B3 (5-min TTL, no 15-min)                                                                                      | ✓       | grep `15.?min` in threat-model.md → 0 hits                                                                                                                                                         |
| 14  | Phase-5 Jury C1 (Shield TB-1..TB-15 numbering throughout system-diagram)                                                    | ✗       | **CRITICAL — NOT CLOSED.** `system-diagram.md` has 2× TB-0 references + Stripe=TB-8 (must be TB-10) + GitHub-webhook=TB-10 (must be TB-13).                                                        |
| 15  | Phase-5 Jury C2 (`mint-runner-token` + `aud=studio-zero/runner`)                                                            | ✓       | `decisions.md:98–112`                                                                                                                                                                              |
| 16  | Phase-5 Jury C3 (`notifications` table)                                                                                     | ✓       | `tables.sql:735+`, `0001_initial.sql:452+`                                                                                                                                                         |
| 17  | Phase-5 Jury C4 (`tenants.retention_days_code` in §7)                                                                       | ✓       | `system-diagram.md:330`                                                                                                                                                                            |
| 18  | Phase-5 Cipher Fix-1 spec in `0002_rls_and_runner_jwt.sql`                                                                  | ✗       | **CRITICAL — NOT CLOSED.** Migration file is a 33-line stub with TODO; no `vault.decrypt_byok(p_tenant_id uuid, p_secret_id uuid) RETURNS text` function spec.                                     |
| 19  | Phase-5 Cipher Fix-3a (= part of C2)                                                                                        | ✓       | `decisions.md:98–113` (aud static, run_id separate, 300s hard cap, 1800s removed)                                                                                                                  |
| 20  | Phase-5 Cipher Fix-3d (`code_cryptoshredded` in `audit_action` enum)                                                        | ✓       | `tables.sql:152`                                                                                                                                                                                   |
| 21  | Phase-5 Cipher Fix-4 (XChaCha20-Poly1305 in PRD §13.4 + system-diagram §1 + threat-model TB-2 I-row)                        | ✓       | `threat-model.md:67`, `system-diagram.md:46`, `system-diagram.md:118` all have "XChaCha20-Poly1305 AEAD"; "AES-256-GCM" appears only as historical reference inside the disclosure parenthetical   |
| 22  | IaC ticket-0 closed (`terraform plan` no drift)                                                                             | partial | M0 stubs land; Terraform-driven apply deferred to M1 per Terra's honest "manual-bootstrap" disclosure. **Accept** — Terra discloses, drift-cadence documented.                                     |
| 23  | External pentest vendor signed (R14) — `compliance/pentest-vendor-engagement.md`                                            | ✗       | **HUMAN-pending (Jo + Shield + Penny)**                                                                                                                                                            |
| 24  | WCAG conformance audit vendor signed (R15) — `compliance/wcag-vendor-engagement.md`                                         | ✗       | **HUMAN-pending (Jo + Halo + Comply)** — M1 deadline acceptable per R21(b)                                                                                                                         |
| 25  | `/coming-soon` waitlist page live on Vercel                                                                                 | ✗       | **Major** — no `/coming-soon` route in apps/web; landing page is the marketing surface but the named gate URL is missing                                                                           |

**Scorecard total:** 11 green / 2 critical-not-closed / 6 majors-not-closed / 4 human-pending / 1 partial-accept / 1 deferred-accept.

---

## 4. R21 mitigation tracking

| Mitigation                        | Status        | Owner                  | Notes                                                     |
| --------------------------------- | ------------- | ---------------------- | --------------------------------------------------------- |
| R21(a) pentest installment letter | HUMAN-pending | Jo + Shield + Penny    | M0 close deadline; not Jury-blockable. Flag for BigBrain. |
| R21(b) WCAG net-30 letter         | HUMAN-pending | Jo + Halo + Comply     | M1 deadline acceptable.                                   |
| R21(c) Managed alpha ≥5 paying    | M2 deadline   | Signal + Penny + Atlas | Not gated at M0.                                          |
| R21(d) $3k untouchable reserve    | green         | Meter                  | Ongoing meter; in burn-log.                               |

---

## 5. Phase 6 Verify F-MAJ / F-MIN follow-ups

| #       | Item                                                            | Status                                                                    |
| ------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| F-MAJ-1 | BYOK heap-scan in M1 exit gate                                  | ✓ Present in `sprint/milestone-M1.md` (verified per dispatch)             |
| F-MAJ-2 | D4 dual-deadline                                                | ✓ Present in M2 + owner-matrix per commit `5cd349c`                       |
| F-MAJ-3 | AT-recordings signoff structure in M4                           | ✓ Verified per dispatch                                                   |
| F-MAJ-4 | M0 parallel-only note                                           | ✓ Present in `milestone-M0.md` line 27 ("Realism note (F-MAJ-4 closure)") |
| F-MIN-1 | Schema state — audit-input + score_engine.v1.md M0 deliverables | ✓ Both shipped in `bdca057`                                               |

---

## 6. Verify's three new M1 follow-ups (schema-test-infra discovered)

Each is a JSON Schema authoring issue that surfaces only when the schemas are exercised by ajv at M0 boundary depth. None of them break Atlas's contract intent; all three are mechanical re-authoring.

| #      | Issue                                                                                                                                                                          | Severity (Jury rubric)                                                                                                                                            | Decision                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| V-M1-1 | `audit-output.v1.schema.json` `$defs/evidence` outer `additionalProperties:false` ∧ `oneOf` with branch-specific properties pattern rejects every non-trivial Evidence payload | **Critical for M1** (Major for M0 — does not block M0 close; the schema compiles, the rejection is at payload validation, and M0 has no live audit pipeline yet). | Accept as M1 carry. Verify's skip is honest and re-enables when Atlas restructures.                                            |
| V-M1-2 | `score_engine.v1.json` declares draft 2020-12 but uses draft-07 tuple-`items` syntax (must be `prefixItems`)                                                                   | **Major for M1**                                                                                                                                                  | Accept as M1 carry. Verify shape-asserts the file content directly so a regression in the constants would still ring the bell. |
| V-M1-3 | `audit-input.v1.schema.json` strict-mode requires `if/then` workaround                                                                                                         | **Minor for M1**                                                                                                                                                  | Accept as M1 carry. Runner will compile non-strict per Verify's test; not a correctness issue.                                 |

**Decision: NONE of these warrant a Critical finding for M0 close.** All are accepted M1 carries with explicit owner (Atlas) and deadline (M1 exit-gate addition). Verify did the right thing flagging them; Atlas does the right thing accepting the M1 ticket.

---

## 7. Top 5 cross-cutting findings (severity-sorted)

### F-CRIT-1 — Phase-5 Jury C1 NOT closed in HEAD

- **Severity:** Critical (M0 exit-gate item)
- **Source:** `milestone-M0.md` line 139 — "C1: `system-diagram.md` uses Shield's TB-1..TB-15 numbering throughout (no TB-0 references; Stripe = TB-10, GitHub webhook = TB-13)"
- **Evidence:** `architecture/system-diagram.md:29` (TB-0 in ASCII diagram), `:141` (TB-0 row in §2 table), `:312` (route map ref to TB-0 surface); `:149` (Stripe TB-8 — must be TB-10); `:151` (GitHub TB-10 — must be TB-13)
- **Owner:** Axiom (re-author system-diagram §2 + §3 + §7 to Shield's numbering). Shield's `threat-model.md:25–39` is the canonical TB-1..TB-15 table.
- **Deadline:** before M1 start. Half-day rewrite.

### F-CRIT-2 — Cipher Fix-1 spec NOT in `0002_rls_and_runner_jwt.sql`

- **Severity:** Critical (M0 exit-gate item)
- **Source:** `milestone-M0.md` line 144 — "Fix-1 spec authored: `vault.decrypt_byok()` function definition committed in `0002_rls_and_runner_jwt.sql` draft"
- **Evidence:** `architecture/database/migrations/0002_rls_and_runner_jwt.sql` is a 33-line placeholder stub ending in `SELECT 'M1 placeholder: ...' AS status;`. No function definition.
- **Owner:** Cipher + Atlas — author `vault.decrypt_byok(p_tenant_id uuid, p_secret_id uuid) RETURNS text SECURITY DEFINER` with AAD enforcement against `tenant_id::text` in the file. Body can remain stub for M1 implementation; the **signature + comment block + SECURITY DEFINER + AAD-required language** must land at M0 per the gate.
- **Deadline:** before M1 start. Half-day spec author.

### F-MAJ-1 — `tools/assert-files-exist.ts` does NOT exist in HEAD

- **Severity:** Major
- **Source:** `milestone-M0.md` line 127 — exit gate
- **Evidence:** `tools/` directory does not exist
- **Owner:** Verify
- **Deadline:** M1 entry. Ship the tool + wire to CI.

### F-MAJ-2 — `/coming-soon` waitlist page not live + integration test directory not present

- **Severity:** Major (both)
- **Source:** `milestone-M0.md` exit-gate items
- **Evidence:** `apps/web/app/` has no `coming-soon/` subdirectory; `tests/integration/` does not exist
- **Owner:** Forge (route) + Signal (URL commit to `marketing/launch-checklist.md`) + Verify (re-house tests)
- **Deadline:** M1 ticket-0

### F-MAJ-3 — D8 sandbox lock string not present verbatim in `decisions.md`

- **Severity:** Major
- **Source:** `milestone-M0.md` line 129 — grep "rootless container + dropped caps + seccomp + egress allowlist; Firecracker V2 graduation"
- **Evidence:** `decisions.md:54` says "rootless container, dropped caps, seccomp, egress allowlist" (comma-separated) and `:74` says "Fly.io's Firecracker primitive is the V2 graduation path" — but the verbatim phrase with `+` separators AND `; Firecracker V2 graduation` clause as a single string does not exist
- **Owner:** Axiom — add the canonical lock-phrase to ARCH-D2 (or D8) summary line so the grep matches
- **Deadline:** M1 entry. 10-minute fix.

---

## 8. M0-blocked-on-human-action items (vs M0-blocked-on-agent-action)

### HUMAN-pending (Jo action — does not block M1 by Jury policy, flag for BigBrain)

- R21(a) pentest engagement letter — `compliance/pentest-engagement-2026.pdf`
- R14 pentest vendor agreement — `compliance/pentest-vendor-engagement.md`
- R15 WCAG conformance vendor — `compliance/wcag-vendor-engagement.md` (M1 deadline acceptable)
- `compliance/` directory creation itself

### AGENT-pending (blocks M1 by Jury policy)

- F-CRIT-1 — Axiom rewrites system-diagram TB numbering
- F-CRIT-2 — Cipher + Atlas write `vault.decrypt_byok()` spec in `0002_rls_and_runner_jwt.sql`

### AGENT-pending (Major — fix at M1 ticket-0 but does not block M1 start)

- F-MAJ-1 — Verify ships `tools/assert-files-exist.ts`
- F-MAJ-2 — Forge ships `/coming-soon` route; Verify re-houses integration tests
- F-MAJ-3 — Axiom adds D8 canonical lock-phrase

---

## 9. M1 readiness decision

**Can M1 start?**

**NO** — until the two Criticals (F-CRIT-1 and F-CRIT-2) close. Both are mechanical, <1 day total, and the same agents (Axiom + Cipher + Atlas) are already at-keyboard. Jury policy: a Critical finding does not "stay open" into the next milestone — fix it, re-audit, then proceed.

After F-CRIT-1 and F-CRIT-2 close, **M1 starts green** with the five Majors and four HUMAN-pending items as M1-ticket-0 + Jo-action carries. The five Majors do NOT block M1 start — they block M1 _exit_ (and Jury will re-verify each at M1 close).

---

## 10. Phase 9 M0 audit-trail cross-references

- `sprint/milestone-M0.md` — gate checklist this audit walks
- `BUILD_FLOW.md` Phase 9 — audit cadence (every milestone closes with a Jury verdict)
- `shared_context/projects/studio-zero-productization/phase5-audit-jury.md` — source of B1/B2/B3 + C1/C2/C3/C4
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` — source of Fix-1/3a/3d/4
- `shared_context/projects/studio-zero-productization/phase6-audit-verify.md` — source of F-MAJ-1..F-MAJ-4 + F-MIN-1
- Five producer commits walked: `6b97732`, `bdca057`, `7d8b128`, `6666c06`, `2c377d5`

---

_Jury · Audit Layer · Phase 9 M0 verdict · 2026-05-11._
