# Milestone M1 — Audit MVP (BYOK only)

**Target:** week 6 (placeholder per PRD §16)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES before M2 starts. **First self-dogfood gate** — Studio Zero audits its own M1 codebase via the runner.

## Scope (one-line)

Ship the audit MVP (BYOK only) end-to-end — GitHub-App repo intake, Surface + Code SKUs, Quick + Comprehensive depths, score + checklist + watermark-less verdict, with the rootless container sandbox + all four Decision-D9 security gates green. This is the wedge.

## Entry prerequisites

- M0 exit gate green (every checkbox in `milestone-M0.md` exit gate).
- Atlas's `0001_initial.sql` on staging.
- Terra IaC applied with no drift.
- Verify's M0 CI gates remain green (regression guard).
- External pentest vendor signed (R14 mitigation in M0).
- WCAG conformance audit vendor signed (R15 mitigation in M0).

## Deliverables per layer

### Strategy

- **Sprint:** weekly burndown updates; M2 ticket-cut scoping at week 5.
- **Penny:** finalize `finance/unit-economics.md` for BYOK Starter ($29) and BYOK Pro ($79) tiers with M1-actual runner-pool COGS data. Flag D4 ($19 vs $29) for Jo's decision at M2 ticket-cut (week 7) with A/B-test default ($29 ship + $19 slot for first 200).

### Audit (Jury + 6 reviewers)

- **Jury:** **Self-dogfood gate M1** — orchestrate the audit of Studio Zero's own M1 codebase via the runner. Verdict in `audits/m1.json` + `audits/m1.md`. PASS or PASS WITH FIXES (score ≥70). FAIL halts the milestone per BIGBRAIN.md Hard Rule §1.
- **Optic:** UX heuristics review of the M1 dashboard + verdict screen (composes with Halo).
- **Halo:** **WCAG conformance vendor onboarded** (R15 — locked at M1 close). axe-core PR-blocking gate green on every primary-flow page at 320 / 768 / 1280 px.
- **Proof:** copy review of verdict-screen + dashboard strings.
- **Compass:** audience alignment review (P1 technical solo founder primary persona).
- **Trace:** flow + logic review of signup-to-first-verdict + audit-run-state-machine flows.
- **Canon:** brand consistency review (no template-orange drift; tokens.json sole source).

### Backend (Forge)

- **Forge — GitHub App integration (D1):** per-repo permissions only; no account-wide `repo` scope. Installation token mint via Octokit + Vault-stored App private key. Shallow clone (`--depth=1`, `core.hooksPath=/dev/null`, `--no-tags`, `--no-recurse-submodules`) into `/var/runs/<tenant-id>/<run-id>/`. Test `tests/integration/github-app-clone.spec.ts`.
- **Forge — Runner contract impl:** `runAudit(input: AuditInput): AsyncIterable<AuditEvent>` returns the events per `audit-event.v1.ts`. Final result conforms to `audit-output.v1.schema.json`.
- **Forge — pg-boss workers on Railway (ARCH-D1 + ARCH-D2):** long-running Node container; tenant-scoped JWT validation on every DB call.
- **Forge — Cipher Fix-2 close (M1 architecture lock):** add `llm-gateway` Edge Function — runner never holds raw Anthropic key; calls gateway with run-scoped 5-min JWT.
- **Forge — `mint-runner-token` Edge Function (ARCH-D3 reconciled):** static `aud=studio-zero/runner` + `run_id` separate claim; 5-min hard cap; refresh-on-heartbeat via `refresh-runner-token` RPC.
- **Forge — score-engine Edge Function:** single source of truth for `score_v1()`; both runner and web app call this Edge Function (no drift). Loads `score_engine.v1.json` as bundled asset.
- **Forge — byok-validate Edge Function:** Anthropic dry-run call; key never logged.
- **Forge — provider abstraction (R9 mitigation):** `runner/llm/` interface abstracts Anthropic so a second provider can be added at V2. Pinned model versions in `runner/llm/pinned-versions.json` (R16 mitigation).
- **Forge — runner ingestion limits (D9):** count cap 10k files; size cap 200MB binary; excluded paths `.git`, `node_modules`, `dist`, `build`, `.venv`, `target`; symlink rejection; `.gitmodules` no auto-fetch. Test `tests/security/ingestion-limits.spec.ts`.
- **Forge — IA-D1 enforcement:** onboarding step order — mode pick before GitHub App install.

### Frontend (Vega)

- **Vega — Goal 1 e2e:** signup → BYOK key entry → GitHub App install → repo pick → Quick depth → verdict screen. TTFV <8 min on `synthetic-repo-fail`.
- **Vega — Verdict screen per PRD §7.2 Step D:** verdict line (text + icon + color per Halo HC1), score with radar chart + semantic `<table>` sibling (HC3), primary CTA above the fold, findings checklist grouped by severity. axe-core green at 320 / 768 / 1280 px.
- **Vega — IA-D2 close:** E2 upsell as full route `/app/audits/[run-id]/upgrade`.
- **Vega — IA-D3 close:** re-audit at project boundary `/app/projects/[id]/re-audit`. Free-tier unlimited Surface re-audits enforced at app layer (D2).
- **Vega — BYOK key UX (HC5):** `autocomplete="off"`, show/hide toggle, paste support, password-manager support.

### Design (Canvas, Pixel)

- **Canvas:** verdict-card component + score-breakdown table + findings-checklist component shipped, every state passes Halo a11y review.
- **Pixel:** sample screens for share-page (PASS state) and FAIL-verdict export PDF.

### Data (Atlas)

- **Atlas — `0002_rls_and_runner_jwt.sql` lands (per migration-order.md M1 row):** RLS enable + FORCE + policies; `auth.tenant_id()`, `auth.runner_run_id()`, `auth.claim_role()` helpers; `audit_log_write` SECURITY DEFINER function; mint Edge Function deployment hook.
- **Atlas — Cipher Fix-1 close:** `vault.decrypt_byok(p_tenant_id, p_secret_id) RETURNS text` SECURITY DEFINER function with AAD = `tenant_id::text`. Verify writes `integration/vault-aad-required.spec.ts` asserting cross-tenant AAD swap fails.
- **Atlas — Cipher Fix-5 close:** every runner-role RLS policy joins to `runner_token_mints.revoked_at IS NULL`. Revoked JWT fails policy check immediately.
- **Atlas:** cross-tenant fuzz suite — `runner/fixtures/rls-cross-tenant-corpus/` ≥20 patterns.

### Security (Shield, Cipher, Verify)

- **Shield — Sandbox at M1 (D8 phase-1):** rootless Docker/Podman on Railway with dropped capabilities, seccomp profile, no-new-privileges, read-only root FS, cgroup limits (2 CPU, 4GB RAM, 1000 PID, 1024 FD), falco runtime detection.
- **Shield — ARCH-D9 close (egress allowlist primitive):** Cilium NetworkPolicy + DNS-pin combo on Railway. Egress allowlist hostnames: Anthropic, GitHub App API, Stripe, Sentry, Supabase. **DevOps spike — call this M1 critical path per Risk R13.**
- **Shield + Verify — SSRF corpus M1:** `runner/fixtures/ssrf-corpus/` ≥40 patterns covering SSRF-1..SSRF-8 + mutations. `tests/security/ssrf-egress.spec.ts` 100% blocked.
- **Shield + Verify — PI corpus M0→M1 ramp:** `runner/fixtures/prompt-injection-corpus/` ≥30 patterns. Full ≥200 lands at M2.
- **Shield + Verify — Path-traversal corpus M1:** `runner/fixtures/path-traversal-corpus/` ≥30 patterns covering PT-1..PT-7. `tests/security/path-traversal-fuzz.spec.ts` 100% rejected.
- **Shield + Verify — Sandbox-escape corpus M1:** `runner/fixtures/sandbox-escape-corpus/` ≥100 patterns. Top-30 green at M2.
- **Shield + Verify — JWT-tampering corpus M1:** `runner/fixtures/jwt-tampering-corpus/` ≥20 patterns. `tests/security/jwt-tampering.spec.ts` 100% blocked.
- **Shield + Verify — GitHub webhook corpus M1:** `runner/fixtures/github-webhook-corpus/` ≥10 patterns.
- **Cipher + Verify — secret-exfil corpus M1:** `runner/fixtures/secret-exfil-corpus/` ≥40 patterns. `beforeSend` PII scrub + Pino allowlist + tenant_id mandatory + entropy threshold 4.5 bits/byte over ≥24 chars. `tests/security/redaction-middleware.spec.ts` 100% scrubbed.
- **Cipher — Fix-3b close:** PostHog `identify` uses HMAC-SHA256(tenant_id, vault-stored hash_salt). No raw uuid to analytics SaaS.
- **Verify — Goal 1 e2e green:** `tests/acceptance/goal-1-signup-to-first-verdict.spec.ts` on staging Playwright. TTFV <8 min on `synthetic-repo-fail`.
- **Verify — Goal 2 e2e green:** `tests/acceptance/goal-2-graded-checklist.spec.ts` — every finding has non-null `severity`, `evidence`, `recommendation`.
- **Verify — Goal 5 e2e green:** `tests/acceptance/goal-5-rls-cross-tenant.spec.ts` — Tenant A's JWT returns 0 rows for Tenant B's `run_id`.
- **Verify — cryptoshredding test:** `tests/integration/cryptoshredding.spec.ts` — retention=0 → Vault key absent at t+90s; encrypted blob unreadable.
- **Verify — log-tenant-id test:** `tests/integration/log-tenant-id.spec.ts` — every Pino log line during a synthetic run carries `tenant_id` AND `run_id`; zero lines containing secret-format regex matches.
- **Verify — nightly SLO dashboard:** publishes `quick_audit_duration_seconds_p95` and `full_audit_duration_seconds_p95` per PRD §14.1.

### Quality (Probe, Crash)

- **Probe:** all M1-applicable Playwright user-flow specs (`signup-to-first-verdict.md`, `audit-run-state-machine.md` happy + 2 unhappy paths each).
- **Crash:** circuit breaker for Anthropic provider; per-tenant queue depth caps; auto-pause at budget threshold.

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Pipeline:** CodeQL + Dependabot + gitleaks PR-blocking; per-PR axe-core gate; nightly Playwright matrix.
- **Watch:** Sentry + structured Pino logs in production; tenant-id required on every log line.
- **Meter:** per-tenant token cost dashboard; BYOK cost is informational only at M1 (Managed billing lands M2).

### Platform (Locale, Edge, Tongue)

- _(no deliverable; multi-region deferred per ARCH-D8)_

### AI (Cortex, Memory, Oracle)

- **Cortex:** Anthropic model pins committed to `runner/llm/pinned-versions.json` (R16 mitigation).
- **Memory:** scoped to runner internal state only; nothing customer-facing at M1.

### Docs (Scribe, Guide)

- **Scribe:** `docs/onboarding-byok.md` — first-run docs for the BYOK technical-founder persona.
- **Guide:** in-app onboarding tour for the first run.

### Growth (Signal, Lens, Herald, Hook)

- **Herald — BYOK pass-through ToS clause LIVE (#19):** Comply authors; published before first BYOK customer.
- **Hook — IA-D2 conversion measurement:** instrument E2 upsell route (FAIL Surface → "Run the Code audit") for conversion tracking. Lens captures.
- **Signal — build-in-public continues:** weekly progress thread on X + IndieHackers.

### Operations (Echo, Ledger, Comply)

- **Comply — BYOK pass-through ToS (#19):** ToS includes Anthropic ToS pass-through; customer attests Anthropic account in good standing.
- **Comply — interim AI Act disclosure (#18) reinforced:** `X-AI-Generated` header + `<meta>` tag verified on every M1 API response + HTML page.

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 M1 exactly. M0 gates remain green (regression guard); add:

- [ ] `tests/acceptance/goal-1-signup-to-first-verdict.spec.ts` green on staging Playwright. TTFV <8 min simulated on `synthetic-repo-fail`. p95 SLO over rolling 7d: Quick <10 min, Comprehensive <45 min.
- [ ] `tests/acceptance/goal-2-graded-checklist.spec.ts` green — every finding has non-null `severity`, `evidence`, `recommendation`; score matches fixture prediction.
- [ ] `tests/acceptance/goal-5-rls-cross-tenant.spec.ts` green — Tenant A's JWT returns 0 rows for Tenant B's `run_id`.
- [ ] `tests/acceptance/goal-4-three-modes.spec.ts` BYOK lane green (F-MAJ-1 closure) — given a freshly-validated BYOK key, when the runner executes a Surface audit, then (a) the verdict produces with mode='byok'; (b) `runs.mode='byok'`; (c) **BYOK heap-scan assertion** — `process` memory snapshot scanned during the run shows the customer's API key only via the Vault decrypt fence (`api_keys.vault_secret_id`-derived ephemeral buffer), never on the runner's heap after the LLM call returns; the spec uses `node --inspect-brk` + a heap-snapshot diff to assert zero plaintext-key bytes outside the decrypt buffer's lifecycle. CLI + Managed lanes ship at M3 + M2 respectively (the spec is mode-lane-scoped so M1 closes BYOK only).
- [ ] `tests/integration/github-app-clone.spec.ts` green — per-repo permissions only (D1).
- [ ] `tests/security/ssrf-egress.spec.ts` green — every entry in `runner/fixtures/ssrf-corpus/` rejected at filter.
- [ ] `tests/security/redaction-middleware.spec.ts` green — 30 secret-format samples + Pino log capture; no secret-format string reaches stdout/stderr/Sentry.
- [ ] `tests/security/path-traversal-fuzz.spec.ts` green — every entry in `runner/fixtures/path-traversal-corpus/`.
- [ ] `tests/security/ingestion-limits.spec.ts` green.
- [ ] `tests/integration/cryptoshredding.spec.ts` green (retention=0 → Vault key absent at t+90s).
- [ ] `tests/integration/log-tenant-id.spec.ts` green.
- [ ] `tests/integration/vault-aad-required.spec.ts` green — Cipher Fix-1 closed.
- [ ] **Nightly synthetic Quick + Comprehensive audit** complete in <10 min / <45 min p95 over rolling 7d window. SLO dashboard publishes both metrics per PRD §14.1.
- [ ] **Self-dogfood gate M1:** `audits/m1.json` = PASS or PASS WITH FIXES (score ≥70). FAIL halts the milestone.
- [ ] axe-core PR-blocking gate green on every primary-flow page at 320 / 768 / 1280 px — no Critical or Serious violations.
- [ ] `tests/integration/jwt-mint-tenant-scoped.spec.ts` green (full M1 version — replaces M0 prototype).
- [ ] `0002_rls_and_runner_jwt.sql` applies cleanly to staging.
- [ ] **R21 mitigation (b) — WCAG conformance vendor net-30 (or better) terms LOCKED in engagement letter** (~$10k bill payable wk 18+ to align with MRR ramp). Letter signed by Halo + Comply + Jo. File: `compliance/wcag-audit-engagement-2026.pdf` exists in HEAD with payment terms.
- [x] **ARCH-D9 closed:** egress allowlist primitive specced and enforced; `architecture/iac/railway/network-policy.yaml` committed (Cilium CiliumNetworkPolicy v2: default-deny egress + FQDN allowlist for Anthropic/Supabase/GitHub/Sentry/PostHog/CoreDNS + CIDR egressDeny for RFC 1918, loopback, link-local, IMDS, ULA, IPv4-mapped IPv6 private). Layer-3 enforcement complements `apps/runner/src/ssrf-guard.ts` (Forge-2 commit 43779fb) app-layer Layer-1 filter. M1+1 proxy-layer spec lives at `architecture/iac/railway/egress-proxy.md` (DNS pinning + per-redirect re-validate + per-tenant rate limit). Pipeline M1 Batch 3.

## Risks specific to this milestone

| #   | Risk                                                                                          | Likelihood | Impact   | Mitigation owner                                       | Deadline                                                                        |
| --- | --------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| R2  | Audit verdict perceived as unfair / inconsistent                                              | Medium     | High     | Jury (score versioning) + Herald (verdict-screen copy) | M1 close — verdict ships with score_engine_version stamp + per-finding evidence |
| R4  | BYOK key leak from logs or DB                                                                 | Low        | Critical | Cipher (Vault AEAD+AAD, `beforeSend`)                  | M1 — Fix-1 in 0002 migration; redaction corpus green                            |
| R5  | Customer code retention breach (GDPR/IP)                                                      | Low        | Critical | Atlas (cryptoshred), Cipher (Vault key delete)         | M1 — `cryptoshredding.spec.ts` green (full purge test at M4)                    |
| R8  | Studio Zero ships a build with a bug we should have caught                                    | High       | Medium   | Sprint (dogfood gate), Verify (test plan)              | M1 close — self-dogfood verdict PASS or PASS WITH FIXES                         |
| R9  | Concentration risk on Anthropic                                                               | Medium     | High     | Forge (provider abstraction), Crash (circuit breaker)  | M1 — abstraction lives in `runner/llm/`; second provider at V2                  |
| R13 | Egress allowlist primitive (ARCH-D9) underestimated as a DevOps spike                         | Medium     | High     | Shield + Cipher (Cilium NetworkPolicy + DNS-pin)       | M1 exit gate                                                                    |
| R16 | Cross-mode consistency drift (BYOK vs Managed verdicts diverge as Anthropic ships new models) | Medium     | Medium   | Forge (model pins) + Verify (nightly drift dashboard)  | M1 close — pins committed                                                       |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 M1 row:

- **D1 GitHub App day-one** — Forge. Test `github-app-clone.spec.ts` green.
- **D2 Free tier = 1 Project, unlimited Surface re-audits** — Forge + Hook. App-layer 1-project cap.
- **D9 SSRF / PI / redaction / ingestion at M0/M1 mandatory** — Shield + Forge + Verify. All four corpora green.
- **IA-D1** Mode pick before GitHub install — Forge. Onboarding flow ships.
- **IA-D2** E2 upsell as full route — Vega + Hook. `/app/audits/[run-id]/upgrade` ships.
- **IA-D3** Re-audit at project boundary — Vega + Atlas. `/app/projects/[id]/re-audit` ships.
- **#19 BYOK pass-through ToS** — Comply. Live before first BYOK customer.
- **ARCH-D1 pg-boss** — Atlas + Forge. Workers running on Railway.
- **ARCH-D3 short-lived tenant JWT minting** — Atlas + Forge + Cipher. Mint + RLS + revocation join (Fix-5) all green.
- **ARCH-D7 Edge Function vs API route boundary** — Forge + Pipeline. CI lint rule `tools/lint-edge-fn-scope.ts` live.
- **ARCH-D9 egress allowlist enforcement primitive** — Shield + Cipher. **OPEN at start of M1; must close by M1 exit.**
- **Cipher Fix-2** Runner-vs-gateway BYOK contradiction — Axiom + Forge. `llm-gateway` Edge Function ships.
- **Cipher Fix-3b** PostHog `tenant_id` HMAC — Cipher + Forge.
- **Cipher Fix-5** Revocation join in RLS — Atlas. Lands in 0002 migration.

## Burndown (weekly)

| Week | Planned                                                                                                                                                | Completed | Blocked | Notes |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------- | ----- |
| 3    | `0002_rls_and_runner_jwt.sql` drafted; pg-boss workers live on Railway; SSRF + path-traversal + ingestion corpus skeletons                             |           |         |       |
| 4    | GitHub App clone + runner contract end-to-end on `synthetic-repo-fail`; mint + refresh JWT working; sandbox + seccomp + egress primitive ARCH-D9 spike |           |         |       |
| 5    | All four D9 corpora green; Goal-1/2/5 e2e green; M2 ticket-cut scoping; D4 decision flagged to Jo                                                      |           |         |       |
| 6    | Nightly SLO dashboard 7-day green; self-dogfood gate M1 audit run; axe-core PR-blocking gate live; ARCH-D9 closed                                      |           |         |       |

## Open questions

For BigBrain to resolve before M1 closes:

- **D4 ($19 vs $29 Starter pricing)** — Jo's call by M2 ticket-cut (~week 7). Sprint default if no decision: ship $29 + A/B slot at $19 for first 200 signups.

## Cross-references

- PRD §16 M1 row + §4 Goals 1, 2, 5 + §11.3 interim AI disclosure + §13.4 secret handling + §13.5 multi-tenancy isolation + §14 NFRs.
- `architecture/test-strategy.md` §3 M1 gates (this file mirrors them).
- `architecture/decisions.md` ARCH-D1, ARCH-D2, ARCH-D3, ARCH-D7, ARCH-D9.
- `architecture/database/migration-order.md` `0002_rls_and_runner_jwt.sql` row.
- `architecture/threat-model.md` TB-1, TB-2, TB-3, TB-4, TB-5, TB-9, TB-14 + §3.1 SSRF + §3.2 PI + §3.3 secret exfil + §3.4 path traversal + §3.5 sandbox escape.
- `ia/user-flows/signup-to-first-verdict.md` (becomes real at M1).
- `ia/user-flows/audit-run-state-machine.md` (most states implemented at M1; D21 synth-stall at M2).
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` Fix-1, Fix-2, Fix-3b, Fix-5.
