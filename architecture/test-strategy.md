# Studio Zero — Test Strategy (Phase 5)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Verify (QA + test-strategy lead)
**Status:** Phase-5 deliverable. Implements PRD §18 at the granularity Forge + Probe + Pipeline + Shield + Crash can execute against. Mirrors PRD §16 milestone gates exactly. Composes against Atlas's `architecture/schemas/` and Shield's `architecture/threat-model.md` (both Phase-5 sibling deliverables).

**Cross-refs:** `PRD.md` v0.5 §4 / §10 / §13.3 / §14 / §16 / §18 · `BUILD_FLOW.md` Phase 5 + Phase 9 + Audit Cadence · `shared_context/projects/studio-zero-productization/prd-review-v03-verify.md` (Verify B1–B6 + C1–C10 + §X proposal) · `ia/user-flows/*.md` (7 flows; every flow needs an e2e test, per §3 below) · `agents/security/verify.md`.

**Stack lock-in (carried from PRD §13 + Verify §X.4):**
- Test runner: **Vitest** (PRD §13.3 TypeScript runner; one runner across unit + contract + integration).
- E2E: **Playwright** (desktop 1280×800 + mobile 320×568 + tablet 768×1024; Chromium primary, WebKit on primary flows, Firefox nightly).
- Load: **k6**. Chaos: **Toxiproxy + chaos-mesh-style pod-kill helpers**. SAST: **CodeQL**. Secret scan: **gitleaks v8.x** with committed config. Dep CVE: **Dependabot + `pnpm audit --prod`**. Schema validation: **ajv 2020-12** with `formats` enabled.
- DB-integration: **Testcontainers Postgres 15** with the Atlas RLS migrations applied; **never** mock the database for RLS-bearing tests (the database is the wedge).

---

## 1. Layer matrix (mirrors PRD §18.1, with coverage targets added)

| Layer | Owner | Tooling | CI gate | Coverage target |
|---|---|---|---|---|
| **Unit** | Forge / Vega | Vitest | PR-blocking | ≥80% statement, ≥75% branch repo-wide; **≥95% on score-engine; ≥90% on redaction middleware; ≥90% on SSRF egress filter** |
| **Contract (schema)** | Verify | ajv + snapshot | PR-blocking | 100% of schemas in `architecture/schemas/` validate; every emitted payload passes its schema |
| **Integration** | Verify + Probe | Vitest + Testcontainers (real Postgres + Supabase test instance) | PR-blocking | Every Edge Function, every queue worker, every RLS-bearing read/write path |
| **E2E** | Probe | Playwright (desktop 1280, tablet 768, mobile 320 × Chromium primary + WebKit on primary flows) | PR-blocking on `main`; nightly on PRs | Every PRD §4 Goal + every user-flow happy path + 2 unhappy paths per flow |
| **Load** | Crash | k6 | Nightly | 100 concurrent runs sustained 30 min on Managed tier; per-tenant token cap fires; p95 from §14.1 holds |
| **Chaos** | Crash | Toxiproxy + pod-kill helpers | Weekly | Postgres-down 60s; Anthropic-429-storm; Stripe-webhook-delay 30s; Supabase-Realtime drop; Vault-decrypt-RPC failure |
| **Security (SAST + dep CVE + secret scan)** | Pipeline | CodeQL + Dependabot + gitleaks | PR-blocking | **Zero CRITICAL/HIGH** on `main`; CRITICAL on PR → block; HIGH → 7-day grace with owner |
| **Pentest (external)** | Shield (vendor-driven) | Manual | **M3 exit + annual** | ≤1 Major / 0 Critical; pentest report committed at `compliance/pentest-<yyyy-qN>.pdf` |
| **Accessibility (axe-core)** | Halo | axe-core via Playwright | PR-blocking on Critical+Serious | Every primary-flow page renders without `critical` or `serious` violations at 320 / 768 / 1280 px |
| **Accessibility (AT recordings)** | Halo | NVDA (Windows) + VoiceOver (macOS) | **Release gate (M4 conformance audit + every release)** | FAIL-verdict primary flow + verdict screen + signup + settings + Stripe Checkout return |
| **Compliance assertions** | Comply + Verify | Vitest + golden-snapshot | PR-blocking | `X-AI-Generated` header on every API response; `<meta name="ai-generated">` in every HTML emit; AUP attestation logged at intake |

Every cell above resolves to one or more committed test files. No row is aspirational.

---

## 2. Test-data inventory

Atlas + Shield produce most of these in parallel; Verify owns the inventory list, the path conventions, and the CI assertion that each path exists at the milestone it gates.

**Schemas (Atlas, M0):**
- `architecture/schemas/audit-output.v1.schema.json` — JSON Schema 2020-12 for §9.4 payload
- `architecture/schemas/audit-event.v1.ts` — Zod/TypeBox export of the §13.3 discriminated union
- `architecture/schemas/score_engine.v1.json` — weights + thresholds + rounding mode
- `architecture/schemas/score_engine.v1.fixtures.json` — canonical (findings → expected score, expected verdict) rows including the 10 boundary cases from Verify's v0.3 B1
- `architecture/schemas/score_engine.v1.md` — prose contract for round-half-to-even rationale
- `architecture/schemas/audit-input.v1.schema.json` — `runAudit(input)` shape
- `architecture/schemas/build-event.v1.ts` — V2 build mode (placeholder at M0)

**Runner-internal contracts (Atlas/Forge, M1):**
- `runner/schemas/` — symlink/copy mirroring `architecture/schemas/` consumed at runtime
- `runner/schemas/redaction-config.v1.json` — secret-format regex set, entropy threshold, truncation byte cap

**Fixtures (Shield + Probe + Verify):**
- `runner/fixtures/synthetic-repo-fail/` — guaranteed-FAIL repo (Shield + Probe, M1)
- `runner/fixtures/synthetic-repo-pass/` — guaranteed-PASS repo, regression guard against false-FAILs (Shield + Probe, M1)
- `runner/fixtures/synthetic-repo-pass-with-fixes/` — boundary case, score 70–94 band (M1)
- `runner/fixtures/prompt-injection-corpus/` — Shield-owned; ≥30 entries at M0, ≥200 at M2 (D9 mandate)
- `runner/fixtures/ssrf-corpus/` — Shield-owned; covers RFC 1918, loopback, link-local, IPv6 loopback, DNS rebinding, non-HTTP(S) schemes, redirect chains, Host header smuggling
- `runner/fixtures/path-traversal-corpus/` — Shield-owned; `../`, symlinks, junction points, `\\?\` Windows paths, UNC, zip-slip, `.gitmodules` URL injection
- `runner/fixtures/sandbox-escape-corpus/` — Shield-owned; top-30 container-escape CVE patterns; CIS Docker Benchmark misconfigs
- `runner/fixtures/jwt-tampering-corpus/` — Shield + Atlas; tenant-id swaps, exp-extension, alg=none, signature-stripping
- `runner/fixtures/stripe-webhook-corpus/` — Shield-owned; signature-replay, signature-mismatch, idempotency-key collision, double-charge race
- `runner/fixtures/default-branch-fuzz-corpus/` — 50+ variants for C8 guard (case, locale, trailing-space, unicode lookalike, `main `, `MAIN`, `master`, `trunk`)
- `runner/fixtures/secret-scanner-fixtures/` — 30 known-secret + 30 known-not-secret samples (MA8)
- `runner/fixtures/golden/` — golden snapshots of `AuditOutputV1` payloads per fixture repo; regenerated on rubric version bumps with an explicit migration test

**E2E mock services:**
- Stripe sandbox account + test card numbers (held in `tests/e2e/fixtures/stripe.ts`)
- GitHub test org `studio-zero-test/` with synthetic repos + GitHub App installed
- Anthropic test API key (rate-limited; rotates monthly; held in CI secrets, never in repo)
- Supabase test project (separate from staging) for E2E runs
- Mock SMTP (mailpit) for E1–E5 lifecycle email assertions

**A11y references:**
- `tests/a11y/at-recordings/` — NVDA + VoiceOver session recordings keyed by release tag (M4 onward; manual capture, stored in S3 with `compliance-` prefix and 7-year retention)

---

## 3. Per-milestone exit-gate test matrix

Mirrors PRD §16 exactly. Every checkbox is a CI assertion. A milestone closes only when **every** box above the line is green AND **every prior milestone's boxes remain green** (regression guard).

### M0 — Spike (week 2)

Exit gates (all must pass):
- [ ] `pnpm test score-engine` green — Vitest runs `score_v1(findings) === expected` for every row in `architecture/schemas/score_engine.v1.fixtures.json`, including: empty → 100; 1 Blocker → 0 (clamp); 5 Blockers → 0 (clamp upper-bound); 1 Critical → 82, PASS WITH FIXES; 1 Major → 93, PASS WITH FIXES; 3 Majors → 79; 5 Majors → 65, FAIL (crosses 70); 16 Minors → 68, FAIL; 10 Polish → 95, PASS (exact boundary); 11 Polish → 94 (banker's rounding from 94.5), PASS WITH FIXES.
- [ ] `pnpm test schema:validate` green — ajv compiles `audit-output.v1.schema.json`, `audit-event.v1.ts` (Zod → JSON Schema export), `audit-input.v1.schema.json`, `score_engine.v1.json`. Self-referential `$ref`s resolve. No `$ref` to missing definition.
- [ ] `pnpm test schema:property` green — property test: `score_v1(findings) === score_v1(findings)` for 1000 random finding arrays (pure-function determinism).
- [ ] **File-existence assertions in HEAD** — CI script `tools/assert-files-exist.ts` fails the pipeline unless every Atlas path in §2 above is present and non-empty.
- [ ] First synthetic Surface run emits `X-AI-Generated: studio-zero` HTTP header on the API response (Comply interim disclosure per §11.3). Integration test in `tests/integration/disclosure-headers.spec.ts`.
- [ ] D8 sandbox choice locked in `architecture/decisions.md` ARCH-D-Sandbox = "rootless container + dropped caps + seccomp + egress allowlist; Firecracker V2 graduation". Assertion: grep the decisions log; missing → fail.
- [ ] CLI ↔ web pairing prototype demo green — `tests/integration/cli-pairing-prototype.spec.ts` proves a paired CLI can receive a synthetic job.
- [ ] RLS schema scaffolded — Atlas's `architecture/database/migrations/0001_initial.sql` applies cleanly to a fresh Testcontainers Postgres; `pnpm test rls:smoke` proves a basic cross-tenant SELECT returns 0 rows.
- [ ] Tenant-scoped JWT minting demo green — `tests/integration/jwt-mint-tenant-scoped.spec.ts` proves the runner can receive a short-lived JWT bound to a tenant_id.

### M1 — Audit MVP (BYOK only) (week 6)

Exit gates (M0 must remain green; add):
- [ ] **`tests/acceptance/goal-1-signup-to-first-verdict.spec.ts` green** on staging Playwright run. TTFV <8 min simulated on `synthetic-repo-fail`.
- [ ] **`tests/acceptance/goal-2-graded-checklist.spec.ts` green** — every finding has non-null `severity`, `evidence`, `recommendation`; score matches fixture prediction.
- [ ] **`tests/acceptance/goal-5-rls-cross-tenant.spec.ts` green** — Tenant A's JWT, querying `findings WHERE run_id = '<B's run>'`, returns 0 rows (RLS denies via invisibility).
- [ ] `tests/integration/github-app-clone.spec.ts` green — per-repo permissions only (D1); no `repo` scope.
- [ ] `tests/security/ssrf-egress.spec.ts` green — runs every entry in `runner/fixtures/ssrf-corpus/`; asserts each is rejected at the filter, not at the OS.
- [ ] `tests/security/redaction-middleware.spec.ts` green — 30 secret-format samples + Pino log capture; **no secret-format string reaches stdout/stderr or the mock Sentry transport**.
- [ ] `tests/security/path-traversal-fuzz.spec.ts` green — every entry in `runner/fixtures/path-traversal-corpus/`; sandbox FS-boundary assertion (`/var/runs/<tenant-id>/<run-id>/` is the only writable path).
- [ ] `tests/security/ingestion-limits.spec.ts` green — count cap (10k files), size cap (200MB binary), excluded paths (`.git`, `node_modules`, `dist`, `build`, `.venv`, `target`), symlinks pointing outside repo rejected, `.gitmodules` submodules not auto-fetched.
- [ ] `tests/integration/cryptoshredding.spec.ts` green (MA6) — retention=0 → Vault key absent at t+90s; encrypted blob unreadable.
- [ ] `tests/integration/log-tenant-id.spec.ts` green (C5) — every Pino log line during a synthetic run carries `tenant_id` AND `run_id`. Zero lines unstructured; zero lines containing secret-format regex matches.
- [ ] **Nightly synthetic Quick + Comprehensive audit** complete in <10 min / <45 min **p95 over rolling 7d window** — SLO dashboard publishes `quick_audit_duration_seconds_p95` and `full_audit_duration_seconds_p95` per PRD §14.1.
- [ ] **Self-dogfood gate M1:** Studio Zero's own M1 codebase audited via the runner; verdict in `audits/m1.json` = PASS or PASS WITH FIXES (score ≥70).
- [ ] axe-core PR-blocking on every primary-flow page at 320 / 768 / 1280 px — no Critical or Serious violations.

### M2 — Managed mode + billing (week 9)

Exit gates (M0–M1 remain green; add):
- [ ] `tests/security/prompt-injection-corpus.spec.ts` green — **100% of `runner/fixtures/prompt-injection-corpus/` entries handled correctly**: (a) no outbound HTTP outside egress allowlist; (b) verdict never flipped FAIL→PASS by injection; (c) LLM gateway short-lived JWT is the only credential in any traceable scope.
- [ ] `tests/security/sandbox-escape-top30.spec.ts` green — top-30 patterns in `runner/fixtures/sandbox-escape-corpus/` all blocked at the rootless container + seccomp + dropped-caps boundary.
- [ ] `tests/load/per-tenant-token-cap.k6.js` green — 100 concurrent Managed runs with a tenant configured at 1M tokens/hour; the cap **fires**: at-cap runs receive a `429 / token_budget_exceeded` and an alert is emitted. Sustained 30 min.
- [ ] `tests/integration/stripe-checkout-and-webhook.spec.ts` green — Stripe Checkout completes; webhook signature verified; subscription row created idempotently (replay produces no duplicates).
- [ ] `tests/acceptance/goal-4-three-modes.spec.ts` green for BYOK + Managed lanes (CLI lane stubbed for M3).
- [ ] **`tests/integration/cross-mode-consistency.spec.ts` green (C7)** — BYOK vs Managed on same fixture repo: **identical score, identical verdict**, findings match by `(reviewer, severity, summary_hash)` modulo documented noise set.
- [ ] **Comply M2 deliverables:** `compliance/dpa-template.md` + `/subprocessors` route published; integration test asserts the route serves the subprocessor list with `Last-Modified` header. (Decision #17.)
- [ ] **EU 14-day cooling-off reset test** — Decision #22; integration test proves an EU/UK customer upgrade resets the cooling-off window; refund pathway intact.
- [ ] `tests/integration/jury-synth-stall.spec.ts` green (Decision #21) — inject synth stall >30s → state `failed_synth_timeout`; tokens refunded; restart offered.
- [ ] **Self-dogfood gate M2:** verdict in `audits/m2.json` = PASS or PASS WITH FIXES.

### M3 — CLI mode (week 11)

Exit gates (M0–M2 remain green; add):
- [ ] `tests/integration/cli-pairing.spec.ts` green (MA1) — (a) unpaired CLI receives a synthetic job → rejected; (b) tampered pairing code → rejected; (c) replay with stale pairing code → rejected.
- [ ] `tests/integration/cli-no-upload.spec.ts` green — **network-tap** on the CLI process during a local-folder audit asserts **zero file-content bytes POSTed to Studio Zero servers**; only structured findings cross the wire.
- [ ] `tests/acceptance/goal-4-three-modes.spec.ts` CLI lane green — verdict produced; CLI watermark `Private Run · Self-Audited` present in rendered output (web verdict screen + PR body if applicable + Markdown export). Snapshot asserts identical watermark string across surfaces (SC 3.2.4).
- [ ] `tests/security/cli-job-tamper.spec.ts` green — synthetic job-payload tamper between dispatch and CLI execution → rejected.
- [ ] **Deployed-URL audit on paid SKUs** — URL-audit-authorization attestation logged at intake (§14.7); integration test verifies `audit_logs` row with timestamp + IP + user_id + verbatim attestation text. AUP attestation absent → 4xx (`audit_url_authorization_required`).
- [ ] **External pentest report committed** at `compliance/pentest-2026-qN.pdf`; verdict: **≤1 Major, 0 Critical**. Pipeline asserts file existence + scrapes a structured front-matter summary.
- [ ] `tests/integration/stripe-idempotency.spec.ts` green — every charge endpoint accepts an idempotency key; double-submit produces no duplicate `billing_events`.
- [ ] **Self-dogfood gate M3:** verdict in `audits/m3.json` = PASS or PASS WITH FIXES.

### M4 — Lifecycle + Polish (week 14)

Exit gates (M0–M3 remain green; add):
- [ ] `tests/integration/lifecycle-emails.spec.ts` green — E1–E5 fire under correct triggers: E1 on signup-confirmed; E2 on Surface FAIL; E3 on PASS WITH FIXES; E4 on T-3 re-audit-window expiry; E5 on day-60-inactive-after-FAIL. Mailpit captures; assertions on subject + CTA + AI-Authored trailer + unsubscribe link.
- [ ] `tests/integration/can-spam-casl-pecr.spec.ts` green — every email carries unsubscribe link; one-click unsub honored within 10 days (clock-advanced test); identification line present.
- [ ] **WCAG 2.2 AA third-party conformance audit passed** — third-party audit report at `compliance/wcag-conformance-<vendor>-2026.pdf`; `/accessibility` statement live; conformance covers verdict screen, signup, settings, billing, Stripe Checkout return, score breakdown table, pricing table, run timeline, AUP attestation modal.
- [ ] `tests/a11y/at-recordings-fail-flow.test.md` — NVDA + VoiceOver recordings of FAIL-verdict primary flow stored in `tests/a11y/at-recordings/m4/`; manual sign-off by Halo.
- [ ] `tests/integration/status-page.spec.ts` green — uptime probe from two regions every 60s; `/healthz` returns 200; 99.5% SLI computable.
- [ ] **GDPR right-to-delete e2e** — `tests/acceptance/gdpr-right-to-delete.spec.ts` green: request → confirmation → 30-day clock → all tenant rows deleted; cryptoshredding key purged; audit log entry retained.
- [ ] **Retention purge cron green** — pg_cron / equivalent runs daily; expired rows deleted; `tests/integration/retention-purge.spec.ts` advances time and asserts.
- [ ] **Self-dogfood gate M4:** verdict in `audits/m4.json` = PASS or PASS WITH FIXES.

### M5 — Public launch (week 16)

Exit gates (M0–M4 remain green; add):
- [ ] **DMCA Designated Agent registered** — `compliance/dmca-agent.pdf` (U.S. Copyright Office confirmation); pipeline asserts file presence and that the `/dmca` route renders contact info.
- [ ] **At least 4 GTM channels active** — `marketing/launch-checklist.md` enumerates ≥4 with timestamped first-post URL; CI scrapes count.
- [ ] All M4 gates remain green — full regression matrix re-run on a staging that mirrors prod.
- [ ] **Self-dogfood gate M5 (full audit):** verdict in `audits/m5.json` = PASS or PASS WITH FIXES; **any FAIL halts launch per BUILD_FLOW.md §"Audit Cadence"**.
- [ ] **Day-zero runbook reviewed by on-call** — `operations/runbook-day-zero.md` reviewed; rollback path tested in chaos-week 0.
- [ ] **Synthetic uptime probe green** for 7 days pre-launch.

### V1.5 — Auto-PR delivery (week 16 + 6)

Exit gates (M0–M5 remain green; add):
- [ ] **`tests/acceptance/goal-3-fix-delivery.spec.ts` green** — paid upgrade → PR on `studio-zero/fix-<run-id>` (never default) → PR body includes re-audit verdict + Art. 50 disclosure paragraph + AI-Authored trailer per commit.
- [ ] **C6 negative-case test green** — `tests/integration/auto-pr-reaudit-rejection.spec.ts`: injected Critical in re-audit → **PR not opened**, `fix_pr_jobs.state = 'rejected_by_reaudit'`, customer notified with reason, refund event in `billing_events`, **GitHub App token never called `POST /repos/{}/pulls`** (assertion: zero outbound to that endpoint during the test).
- [ ] **C8 default-branch push fuzz green** — `tests/security/default-branch-fuzz.spec.ts`: 50+ variants from `runner/fixtures/default-branch-fuzz-corpus/`; guard fires every time; `audit_logs` records each attempt.
- [ ] **MA5 attribution test green** — every commit in PR has `Refs: F-NNN` trailer; finding-ID set matches PR-claimed-findings set.
- [ ] **C6 race test green** — fix passes re-audit at T; `score_engine_version` bumps to v2 at T+1 → gate uses **fix-time version snapshot** (preferred behavior locked) → PR opens with `score_engine_version: "v1"` stamped.
- [ ] **AI System Card v1.0 published** at `/system-card`; Comply sign-off; Art. 50 disclosure paragraph in every PR body (snapshot test).
- [ ] **Decision D23 banner test** — GitHub App uninstalled after PR opened → banner renders `"Tracking unavailable — reinstall the Studio Zero GitHub App to resume merge status."` (Playwright snapshot).

### V2 — Build mode (week 16 + 12)

Exit gates:
- [ ] `runner/schemas/roadmap-bundle.v1.schema.json` committed + ajv-validates a sample bundle.
- [ ] **Audit-gate-blocks-delivery negative test green** — FAIL verdict → roadmap bundle delivery refused; `tests/integration/build-audit-gate.spec.ts`.
- [ ] **Firecracker microVM A/B test** — same fixture-repo set in Firecracker vs rootless container; **no verdict regression**; runtime within 1.5× rootless baseline. Pentest on Firecracker config = ≤1 Major / 0 Critical before graduation.
- [ ] Live build dashboard reconstructible solely from emitted `phase_started`/`phase_finished` events (MI5 analog for build mode).

### V2.1 — Scaffold generation (week 16 + 18)

Exit gates:
- [ ] **Clean-VM bootstrap of a generated scaffold completes in <30 min** — `tests/e2e/v2.1-clean-vm-bootstrap.spec.ts` on a fresh Ubuntu/Windows VM.
- [ ] **Offline-mode network-tap proves no code POSTed externally** — `tests/security/v2.1-offline-network-tap.spec.ts`: scaffold runs offline; tap captures zero outbound HTTP.
- [ ] Audit-gated delivery: scaffold ships only on PASS or PASS WITH FIXES verdict.

---

## 4. Per-MVP-Goal acceptance tests (PRD §4)

Each Goal is a binary spec file. Forge implements; Verify owns the gate.

- **Goal 1 — signup → run audit**: `tests/acceptance/goal-1-signup-to-first-verdict.spec.ts` — *Given* a freshly signed-up user with BYOK key validated, *When* they connect a GitHub repo via GitHub App and run **Quick** depth, *Then* within p95 **<15 min** SLO they reach a verdict screen with ≥1 finding emitted, AND the verdict screen passes axe-core (no Critical/Serious), AND `runs.state = 'completed'`. **TTFV target <8 min on free Surface tier** (asserted in same spec under the Surface lane). Covers `ia/user-flows/signup-to-first-verdict.md` happy path.

- **Goal 2 — graded checklist + score**: `tests/acceptance/goal-2-graded-checklist.spec.ts` — *Given* a completed audit, *When* the verdict screen renders, *Then* every finding has non-null `severity`, `evidence` (file path + line range OR screenshot with `evidence.alt` per SC 1.1.1 OR transcript as semantic DOM), `recommendation`, `estimated_effort`, AND the rendered `score` equals `score_v1(findings)` from the score-engine pure function, AND the score breakdown radar chart ships with a semantic `<table>` sibling (SC 1.1.1 / 1.3.1).

- **Goal 3 — fix delivery (V1.5; marked deferred in MVP)**: `tests/acceptance/goal-3-fix-delivery.spec.ts` — *Given* a Code/Full audit FAIL verdict in V1.5, *When* customer purchases Auto-PR, *Then* a PR opens on `studio-zero/fix-<run-id>` (never default branch), AND PR body includes re-audit verdict + Art. 50 disclosure + AI-Authored commit trailers. **In MVP, this spec is `test.skip()`-d but the file MUST exist and import its types from the V1.5 schema** so the build doesn't rot.

- **Goal 4 — three execution modes wired**: `tests/acceptance/goal-4-three-modes.spec.ts` — three lanes (BYOK, CLI, Managed); each runs the same synthetic audit; **per-mode constraints hold**: BYOK (key validation via dry-run; key never persisted in plaintext on disk transiently — heap-scan assertion); CLI (`Private Run · Self-Audited` watermark on rendered output; no code POSTed); Managed (token-budget cap enforceable; subscription required). **Cross-mode consistency**: BYOK and Managed verdicts on the same fixture project must be identical in `(score, verdict)`; CLI excluded (can't CI a customer machine, but parity-mode local test in pre-commit).

- **Goal 5 — multi-tenant isolation**: `tests/acceptance/goal-5-rls-cross-tenant.spec.ts` — *Given* Tenant A's session JWT, *When* Tenant B's `run_id` is requested directly (`SELECT * FROM findings WHERE run_id = '<B>'`), *Then* **0 rows returned (RLS denies via row-level invisibility, not 403)**. Same spec covers `runs`, `findings`, `score_snapshots`, `fix_pr_jobs`, `billing_events`. Service-role key bypass attempt → blocked at the runner authentication layer (runner uses tenant-scoped JWT, not service-role). Sandbox cross-read: Tenant A's working dir `/var/runs/A/<run>/` is unreadable from Tenant B's process.

- **Goal 6 — every goal has binary acceptance test (meta)**: `tests/acceptance/goal-6-meta-coverage.spec.ts` — globs `tests/acceptance/goal-*.spec.ts`, asserts files exist for Goals 1–5, asserts each is wired into CI (parseable test names), asserts no goal is `test.skip()`-d except Goal 3 (which is allowlisted as V1.5-deferred).

**Per-user-flow coverage:** every file in `ia/user-flows/` maps to a Playwright spec under `tests/e2e/flows/`:
- `signup-to-first-verdict.md` → `tests/e2e/flows/signup-to-first-verdict.spec.ts` (happy + 2 unhappy: invalid BYOK key, repo-not-found)
- `audit-run-state-machine.md` → `tests/e2e/flows/audit-run-state-machine.spec.ts` (happy + 2 unhappy: synth-stall-timeout per D21, reviewer-crash-mid-run per C4)
- `verdict-to-upsell-loop.md` → `tests/e2e/flows/verdict-to-upsell.spec.ts` (FAIL → E2 click → Code audit checkout; PASS → share)
- `cli-pairing-and-tamper.md` → `tests/e2e/flows/cli-pairing.spec.ts` (happy pair; unpaired job rejected; replay rejected — MA1)
- `fix-delivery-prflow.md` → `tests/e2e/flows/fix-delivery.spec.ts` (V1.5; `test.skip()` in MVP)
- `billing-and-cancel.md` → `tests/e2e/flows/billing-and-cancel.spec.ts` (subscribe; cancel; FTC Click-to-Cancel UI; regional refund matrix)
- `settings-and-account-management.md` → `tests/e2e/flows/settings.spec.ts` (BYOK rotate; GitHub App reinstall; cookie-consent change; right-to-delete trigger)

---

## 5. Self-dogfood gate spec

Per `BUILD_FLOW.md` §"Audit Cadence" + Phase 9: **every milestone closes with Studio Zero auditing its own milestone codebase via the runner.**

- **Where the verdict lives:** `audits/m<n>.json` (and a human-readable `audits/m<n>.md` summary).
- **Pass threshold:** PASS or PASS WITH FIXES (score ≥70). A FAIL halts the milestone per `BIGBRAIN.md` Hard Rule §1 ("No project ships without a Jury verdict") and the same rule applied to Studio Zero itself.
- **Failure flow:** layer leads receive findings within 24h; remediation per the PRD §16 milestone exit gate (Verify, Sprint, BigBrain orchestrate); milestone re-audited by originating reviewer before closing.
- **Feature-flagged scope:** unreleased features behind feature flags are excluded from the dogfood audit's scope (the runner audits what's reachable in the milestone's released surface).
- **Frozen rubric per dogfood:** the dogfood audit runs against the **score_engine version live at the milestone**, not a future version. Comparability across milestones requires the version stamp on every dogfood verdict.

Verify's prior review §X.2 made the dogfood schedule **M1 / M3 / M5 / pre-V2-release**; Phase-5 strengthens this to **every milestone M1–M5 + V1.5 + V2 + V2.1**, no exceptions. Rationale: motionmax's 880-item retro proves "skip an audit cycle" compounds.

---

## 6. Test-burden risk register

Heaviest test-burden items + Pipeline CI-budget fit. Verify owns the burden math; Pipeline owns the infra spend.

| # | Item | Burden | Mitigation | Owner |
|---|---|---|---|---|
| R1 | **Playwright matrix size** | 7 user-flows × 3 viewports × 2 browsers (Chromium + WebKit) × ~2 unhappy paths = ~84 specs. Full nightly ~45 min. | PR-blocking subset = primary flows × Chromium × desktop only (~12 specs, <8 min). Full matrix nightly + on release-tag. | Probe + Pipeline |
| R2 | **k6 load tests** | 100 concurrent runs × 30 min sustained = expensive; needs a non-prod fixture cluster. | Run nightly on a Vercel / Fly.io throwaway environment. Budget: ~$30/night. Skip on PRs unless touched files match `runner/queue/**` or `runner/concurrency/**`. | Crash + Pipeline |
| R3 | **Chaos tests (Toxiproxy + pod-kill)** | Weekly cron in staging; flakiness risk. | Weekly only; failures generate a Linear issue, never PR-block. | Crash |
| R4 | **AT recordings (NVDA + VoiceOver)** | Manual capture; can't be CI'd. | Cadence: M4 conformance audit + every release tag. Storage: S3 `compliance-` prefix, 7-year retention. Halo owns the capture protocol in `tests/a11y/at-protocol.md`. | Halo |
| R5 | **External pentest** | $20k–$40k per engagement (vendor estimate); M3 exit + annual. | Budget allocation owned by Penny; vendor selected by Shield. Post-incident pentests triggered by Critical incident-response per Phase 10. | Shield + Penny |
| R6 | **Sandbox-escape corpus maintenance** | New CVEs land monthly; corpus rots. | Monthly auto-refresh from CIS Docker Benchmark + falco rules; Shield-owned PR every 30 days. | Shield |
| R7 | **Mutation testing (Stryker)** | High CPU; long runtime; high signal-to-noise on a maturing codebase. | **Defer to V2.** Track in roadmap. Re-evaluate when score-engine + redaction stabilize. | Verify |
| R8 | **Cross-mode consistency drift** | BYOK vs Managed scores must match; model-version pinning required. | Pin Anthropic model versions in `runner/llm/pinned-versions.json`; CI tests fail on unpinned model use; nightly drift dashboard. | Forge + Verify |
| R9 | **Schema-breaking changes** | A field rename silently diverges web app + score engine. | Mandatory `schema_version` field on every payload; ajv compile in PR; schema-changing PR must include migration test + bumped version file. | Verify |
| R10 | **CI shells per OS** | CLI mode + dogfood audit on Windows is harder than Linux. | Linux primary CI; Windows nightly on `windows-latest` runner for CLI-touching code only. macOS for VoiceOver-touching code only. | Pipeline |

---

## 7. Open dependencies (cross-agent)

This strategy is **not** self-contained. Verify owns the gate definitions; sibling agents own the artifacts the gates depend on.

| Dependency | Owner | Phase | Verify's gate impacted if missing |
|---|---|---|---|
| `architecture/schemas/audit-output.v1.schema.json` + `audit-event.v1.ts` + `score_engine.v1.json` + `score_engine.v1.fixtures.json` | **Atlas** | Phase 5, M0 | M0 exit (file-existence + schema:validate) |
| `architecture/database/migrations/0001_initial.sql` (RLS policies on every tenant-scoped table) | **Atlas** | Phase 5, M0 | M0 RLS smoke; M1 Goal-5 acceptance |
| `architecture/threat-model.md` with TB-1 … TB-N trust-boundary labels | **Shield** | Phase 5, M0 | M1 SSRF / redaction / path-traversal / sandbox-escape gates (each gate cross-references its TB label) |
| `runner/fixtures/prompt-injection-corpus/`, `ssrf-corpus/`, `path-traversal-corpus/`, `sandbox-escape-corpus/`, `jwt-tampering-corpus/`, `stripe-webhook-corpus/` | **Shield** (+ Verify maintain) | M0 → M2 ramp | M1–M2 security gates |
| `.github/workflows/*.yml` (one workflow per CI gate above; OS matrix; secret injection) | **Pipeline** | Phase 5–6 | Every PR-blocking gate |
| `tests/e2e/playwright.config.ts` (viewports, browsers, retry, video-on-fail) | **Probe** | Phase 5–6 | Every E2E gate |
| Per-layer test scaffolding (`runner/score-engine/*.test.ts`, `runner/security/redact/*.test.ts`, etc.) | **Forge / Vega** | Phase 9 (Build) | Every unit + contract + integration gate |
| `agents/growth/herald-brand-voice.md` (verdict-screen + PR-body templates) | **Herald** | Phase 2 (carried) | M4 E1–E5 snapshot + V1.5 PR-body snapshot |
| `compliance/wcag-conformance-<vendor>-2026.pdf` (third-party audit) | **Halo + Comply** | M4 | M4 release gate |
| `compliance/pentest-2026-qN.pdf` | **Shield + Penny** (vendor) | M3 | M3 exit gate |
| Anthropic model-version pins in `runner/llm/pinned-versions.json` | **Forge** | M1 | M2 cross-mode consistency gate |

If any dependency slips, the corresponding gate becomes "fail-shut" — Verify does not soften.

---

## 8. Closing note

Every PRD claim was a hypothesis at v0.3. Phase 5 is where the hypotheses get experiments. This file is the experiment registry. If a claim in PRD §1–§20 is not represented by a row above, the claim is unfalsifiable and Verify treats it as a finding at the next dogfood audit.

The wedge is the audit layer. The audit layer's wedge is its independence. Independence is meaningless unless an auditor can replay the defense. This file is what makes replay possible.

— *Verify, 2026-05-11*
