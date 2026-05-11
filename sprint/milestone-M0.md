# Milestone M0 — Spike

**Target:** week 2 (placeholder per PRD §16; firmed up after M0 lands)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES before M1 starts. (Note: M0 has no self-dogfood requirement — the runner isn't end-to-end yet. First self-dogfood gate is M1.)

## Scope (one-line)

Land the contracts, fixtures, RLS scaffold, and IaC that every later milestone consumes — and close all three Phase-5 Jury Blockers + four Criticals before the first migration ships.

## Entry prerequisites

- PRD v0.5 LOCKED (Phase 1 closed).
- Brand identity LOCKED (Phase 2 closed).
- IA LOCKED (Phase 3 closed). All 7 user-flow files present in `ia/user-flows/`.
- Visual design LOCKED (Phase 4 closed).
- Tech architecture LOCKED (Phase 5 closed — PASS WITH FIXES per Jury 2026-05-11; Blockers tickered as M0-week-1 below).
- Phase 5 deliverables in HEAD:
  - `architecture/decisions.md` (ARCH-D1..D8 locked; D9, D10 open)
  - `architecture/system-diagram.md`
  - `architecture/database/tables.sql`, `rls-policies.sql`, `runner-jwt.md`, `migration-order.md`
  - `architecture/threat-model.md` v1.0
  - `architecture/test-strategy.md` v1.0
  - `architecture/schemas/` — 4 schema files committed in HEAD at Phase 5 close (`audit-output.v1.schema.json`, `audit-event.v1.ts`, `score_engine.v1.json`, `score_engine.v1.fixtures.json`). **Not yet in HEAD (M0 deliverables, not prerequisites — F-MIN-1 closure):** `audit-input.v1.schema.json` (Atlas to author week 1) and `score_engine.v1.md` runbook (Atlas to author week 1).

> **Realism note (F-MAJ-4 closure):** the 2-week M0 budget assumes **parallel execution from day 1** across Atlas (Phase-5 reconciliation B1/B2/B3 + new audit-input schema), Axiom (C2/C4 doc fixes), Shield (C-numbering + corpora), and Cipher (Fix-1/3a/3d/4) per R11 mitigation. Sequential execution does NOT fit the budget. Sprint allocates: week 1 = reconciliation in parallel + week-1 Jury re-audit checkpoint; week 2 = remaining M0 deliverables + final exit-gate run.

## Deliverables per layer

### Strategy

- **Sprint:** this milestone file + `owner-matrix.md` + `burndown.md` (Phase 6 outputs).
- **Axiom:** Phase-5 Jury C2 fix — edit `architecture/decisions.md` ARCH-D3 to use `mint-runner-token` endpoint name + `aud=studio-zero/runner` static audience (Atlas's spelling wins). Phase-5 Jury C4 fix — update system-diagram §7 route map to reference `tenants.retention_days_code` (drop `tenant_settings.retention_days`).
- **Penny:** finalize unit-economics worksheet (`finance/unit-economics.md` — to be authored at M0, owner: Penny) sizing the M1 BYOK runner pool cost vs $29/$79 BYOK tier revenue projections; flag D4 ($19 vs $29) decision for Jo by M2 ticket-cut. Engage WCAG conformance audit vendor (Halo's vendor list) at M0 close — 6–10 week lead time per Risk R15.
- **Scout:** publish the build-in-public kickoff thread on X (week 1) and stand up `/coming-soon` waitlist page on Vercel (week 2) so the GTM ramp is not backloaded to M5. PRD §15.5 channel plan; aligns Sprint v0.2 review "Marketing waitlist backloaded to M5" Major.

### Audit (Jury + 6 reviewers)

- **Jury:** **Phase-5 Jury Blockers B1, B2, B3 + Criticals C1, C2, C3, C4 — re-audit after fixes land in week 1; sign off before `0001_initial.sql` lands on staging.**
- **Halo:** Phase-5 vendor scouting for WCAG conformance audit (R15 mitigation). Vendor short-list at M0 close.
- **Optic:** confirm Phase-3 IA-D1/D2/D3 commitments are mapped to M1 Forge tickets in this plan (no new findings expected).
- **Compass:** Phase-5 Jury M5 — confirm AH-6 (multi-project / client tags) is still in scope; Atlas adds `projects.client_tag text` to `0001_initial.sql` if yes. Decision deadline: M0 week 1.

### Backend (Forge)

- **Forge:** Phase-5 Jury C3 fix — confirm `notifications` table addition with Atlas (week 1).
- **Forge:** scaffold the Next.js 15 monorepo (`apps/web`, `apps/runner`, `packages/runner-contract`, `packages/cli`). Wire ESLint, Prettier, Vitest, Playwright. CI pipeline lays in `.github/workflows/` (Pipeline owns; Forge consumes).
- **Forge:** Phase-5 Cipher Fix-1 — author `vault.decrypt_byok(p_tenant_id uuid, p_secret_id uuid) RETURNS text` SECURITY DEFINER function spec; lands in `0002_rls_and_runner_jwt.sql` at M1 but spec must exist at M0.
- **Forge:** AI-Act interim disclosure machinery — `X-AI-Generated: studio-zero` HTTP middleware on every API response; `<meta name="ai-generated" content="studio-zero">` in every HTML emit (PRD §11.3, §14.5; closes part of #18).
- **Forge:** first synthetic Surface-audit POC that exercises the runner contract end-to-end (`runAudit()` → `AuditEvent` stream → `AuditOutputV1`) against a hand-crafted fixture repo. Test `tests/integration/disclosure-headers.spec.ts`.

### Frontend (Vega)

- **Vega:** scaffold the Next.js App Router shape per `architecture/system-diagram.md` §7 route map (post-C4 fix). All routes ship as 501-stub pages at M0; behavior lands at M1+.
- **Vega:** verdict-card component skeleton consuming `audit-output.v1.schema.json` types; render placeholder for the M1 verdict screen.

### Design (Canvas, Pixel)

- **Canvas:** component-library handoff to Vega — confirm Halo HC1..HC10 spec coverage matches what Vega ships at M0. No new components needed at M0.
- **Pixel:** `brand/tokens.json` audit — confirm gold `#E4C875`, aqua `#14C8CC` are the locked values, no template orange `#F5B049` drift. (Lessons-learned BUILD_FLOW.md Phase 2.)

### Data (Atlas)

- **Atlas — Phase-5 Jury Blocker B1 fix:** replace `fix_pr_jobs.tracking_stale boolean` with `tracking_state ENUM('active','stale','recovered')`; add same column to `runs` table. Update CHECK constraint. **Week 1.**
- **Atlas — Phase-5 Jury Blocker B2 fix:** add `'reaudit_passed'` value to `fix_pr_state` enum; update `fix_pr_state_pr_consistency` CHECK to include it on the "no pr_number yet" side. **Week 1.**
- **Atlas — Phase-5 Jury Critical C3 fix:** add `notifications` table to `tables.sql` (tenant-scoped, user-scoped, RLS-bearing). **Week 1.**
- **Atlas:** `architecture/database/migrations/0001_initial.sql` lands at end of week 2 — wraps `tables.sql` + ENUMs + indexes + `updated_at` triggers + seed row in `score_engine_versions` (per migration-order.md). Applies cleanly to fresh Testcontainers Postgres + staging Supabase (provisioned by Terra ticket-0 below).
- **Atlas:** Phase-5 Cipher Fix-3d — add `code_cryptoshredded` value to `audit_action` enum in `0001_initial.sql`.
- **Atlas:** Phase-5 Jury M5 — add `projects.client_tag text` if Compass confirms AH-6 in scope.
- **Atlas:** `architecture/schemas/score_engine.v1.fixtures.json` — confirm 15 canonical rows present (Jury verified 7+ rows math-correct at Phase 5 close).

### Security (Shield, Cipher, Verify)

- **Shield — Phase-5 Jury Blocker B3 fix:** edit `threat-model.md` TB-3 + §3.2 to use 5-min TTL (Axiom + Atlas already at 5-min; Shield is the outlier). **Week 1.**
- **Shield — Phase-5 Jury Critical C1 fix:** Axiom + Shield 1-hour reconciliation session — pick Shield's TB-1..TB-15 numbering (richer). Axiom rewrites `system-diagram.md` §2, §3, §7 to use Shield's labels. **Week 1.**
- **Shield:** **engage external pentest vendor (Trail of Bits / Doyensec / NCC / Bishop Fox / Latacora) at M0 close.** M3 exit gate is the pentest; reputable vendors book 8–12 weeks out (Risk R14). Vendor signed + scope agreed by M0 close.
- **Cipher — Phase-5 Fix-4:** PRD §13.4 + system-diagram §1 Vault row + threat-model TB-2 I-row — replace "AES-256-GCM AEAD" prose with "XChaCha20-Poly1305 AEAD (via `pgsodium` TCE), AAD = `tenant_id::text`." Lock rotation cadences in PRD §13.4 (90d uniform for platform-owned signing material). **Week 1.**
- **Cipher — Phase-5 Fix-3a:** edit Axiom's ARCH-D3 + system-diagram §5 + PRD §13.5 to reconcile to Atlas's `aud=studio-zero/runner` + `run_id` separate claim + 300s hard cap (delete 1800s exception). **Week 1.**
- **Verify:** `pnpm test schema:validate` green — ajv compiles all five schema files. CI gate live.
- **Verify:** `pnpm test score-engine` green — runs `score_v1(findings) === expected` for every row in `score_engine.v1.fixtures.json`. Banker's-rounding direction asserted at SE-R06 (94.5→94) and SE-R12 (95.5→96).
- **Verify:** `pnpm test schema:property` green — 1000-iteration determinism property test.
- **Verify:** `tools/assert-files-exist.ts` lives in HEAD and fails CI if any Atlas-owned path in `test-strategy.md` §2 is missing or empty.
- **Verify:** `tests/integration/rls-smoke.spec.ts` — basic cross-tenant SELECT returns 0 rows on the Testcontainers Postgres with `0001_initial.sql` applied.
- **Verify:** `tests/integration/jwt-mint-tenant-scoped.spec.ts` — proves the runner can receive a short-lived JWT bound to a tenant_id (M0 prototype against the Edge Function stub).
- **Verify:** `tests/integration/cli-pairing-prototype.spec.ts` — proves a paired CLI can receive a synthetic job (proves the websocket + pairing primitives ahead of M3). Closes Sprint v0.2 review Polish item.

### Quality (Probe)

- **Probe:** Playwright config + first synthetic e2e (`tests/e2e/smoke.spec.ts`) on the 501-stub pages. Ensures CI pipeline triggers Playwright correctly.

### DevOps (Pipeline, Terra)

- **Terra — TICKET-0 (M0 week 1, blocking):** `architecture/iac/` populated — Terraform/Pulumi for Vercel (us-east-1 / iad), Supabase project (us-east-1), Railway runner pool (us-east), Cloudflare DNS+WAF. `terraform plan` shows no drift. Without this, no migration applies. **Closes Phase-5 Jury Major M1.**
- **Pipeline:** `.github/workflows/` — one workflow per CI gate from `test-strategy.md` §1. PR-blocking config for schema:validate, score-engine, schema:property, file-existence assertion, axe-core. Secret injection via GitHub Actions secrets (Anthropic test key, Stripe test key, Supabase test project URL).
- **Pipeline:** CodeQL + Dependabot + gitleaks v8.x with committed config — PR-blocking on Critical/High.

### Platform (Locale, Edge, Tongue)

- *(no deliverable at M0; multi-region deferred per ARCH-D8)*

### AI (Cortex, Memory, Oracle)

- **Cortex:** confirm Anthropic model pins for M1 runner — `runner/llm/pinned-versions.json` skeleton present at M0; populated at M1.

### Docs (Scribe, Guide)

- **Scribe:** `docs/sku-mapping.md` skeleton present (Phase-5 Jury M6 — populated at M2).

### Growth (Signal, Hook, Lens, Herald)

- **Signal:** `/coming-soon` waitlist page live on Vercel by end of week 2 (Sprint v0.2 review fix: marketing not backloaded to M5).
- **Herald:** confirm verdict-screen copy frozen at PRD §7.2 Step D ("We found 14 issues across UX, accessibility, and brand consistency. Here's every one, with the evidence."). No new copy at M0.

### Operations (Echo, Ledger, Comply)

- **Comply:** AI-Act Art. 50 interim machinery — confirm `X-AI-Generated` header + `<meta>` tag spec is in Forge's M0 ticket. AI System Card v0.1 placeholder file lands at `/system-card` route stub. **Closes part of #18.**
- **Comply:** engage WCAG conformance audit vendor coordination with Halo (R15 — 6–10 week lead).

## Exit gate (BINARY — automation-checkable)

Pulled from PRD §16 M0 row + `test-strategy.md` §3 M0 + Phase-5 Jury verdict reconciliation tickets. **Every item is a CI assertion or a file-existence assertion.**

- [ ] `pnpm test score-engine` green — Vitest, every row in `architecture/schemas/score_engine.v1.fixtures.json` passes `score_v1(findings) === expected`.
- [ ] `pnpm test schema:validate` green — ajv compiles `audit-output.v1.schema.json`, `audit-event.v1.ts` (Zod export), `audit-input.v1.schema.json`, `score_engine.v1.json`. No `$ref` to missing definition.
- [ ] `pnpm test schema:property` green — 1000-iteration determinism property test.
- [ ] `tools/assert-files-exist.ts` green — every Atlas path in `test-strategy.md` §2 is present and non-empty in HEAD.
- [ ] First synthetic Surface run emits `X-AI-Generated: studio-zero` HTTP header — `tests/integration/disclosure-headers.spec.ts` green.
- [ ] **D8 sandbox choice locked** — grep `architecture/decisions.md` for "rootless container + dropped caps + seccomp + egress allowlist; Firecracker V2 graduation" → match.
- [ ] CLI ↔ web pairing prototype demo green — `tests/integration/cli-pairing-prototype.spec.ts` green.
- [ ] **R21 mitigation (a) — Pentest vendor installment terms LOCKED in engagement letter** (3 payments over M3 / M4 / M5; never lump-sum at wk 19). Letter signed by Shield + Penny + Jo. File: `compliance/pentest-engagement-2026.pdf` exists in HEAD with installment schedule.
- [ ] RLS schema scaffolded — `architecture/database/migrations/0001_initial.sql` applies cleanly to a fresh Testcontainers Postgres; `pnpm test rls:smoke` green.
- [ ] Tenant-scoped JWT minting demo green — `tests/integration/jwt-mint-tenant-scoped.spec.ts` green.
- [ ] **Phase-5 Jury Blockers closed in HEAD:**
  - [ ] B1: `runs.tracking_state` ENUM column present in `tables.sql` + `0001_initial.sql`; `fix_pr_jobs.tracking_state` is ENUM not boolean.
  - [ ] B2: `fix_pr_state` enum contains `'reaudit_passed'`.
  - [ ] B3: `threat-model.md` TB-3 + §3.2 references "5-min TTL with refresh-on-heartbeat" (no "15-min" string anywhere in the file).
- [ ] **Phase-5 Jury Criticals closed in HEAD:**
  - [ ] C1: `system-diagram.md` uses Shield's TB-1..TB-15 numbering throughout (no TB-0 references; Stripe = TB-10, GitHub webhook = TB-13).
  - [ ] C2: `architecture/decisions.md` ARCH-D3 references `mint-runner-token` + `aud=studio-zero/runner`.
  - [ ] C3: `notifications` table present in `tables.sql`.
  - [ ] C4: `system-diagram.md` §7 references `tenants.retention_days_code` (no `tenant_settings.retention_days`).
- [ ] **Phase-5 Cipher Fixes closed in HEAD:**
  - [ ] Fix-1 spec authored: `vault.decrypt_byok()` function definition committed in `0002_rls_and_runner_jwt.sql` draft (function ships at M1; spec ships at M0).
  - [ ] Fix-3a closed (= part of C2 above).
  - [ ] Fix-3d closed: `code_cryptoshredded` value in `audit_action` enum.
  - [ ] Fix-4 closed: PRD §13.4 + system-diagram §1 + threat-model TB-2 I-row all read "XChaCha20-Poly1305 AEAD (via `pgsodium` TCE), AAD = `tenant_id::text`" (no "AES-256-GCM" string in any of those three locations).
- [ ] **IaC ticket-0 closed:** `terraform plan` against `architecture/iac/` shows no drift; Vercel, Supabase, Railway, Cloudflare provisioned in us-east. **Closes Phase-5 Jury Major M1.**
- [ ] **External pentest vendor signed + scope agreed** — Shield commits vendor agreement to `compliance/pentest-vendor-engagement.md`. Risk R14 mitigation.
- [ ] **WCAG conformance audit vendor signed** — Halo commits vendor agreement to `compliance/wcag-vendor-engagement.md`. Risk R15 mitigation.
- [ ] **`/coming-soon` waitlist page live on Vercel** — Signal commits URL + first-week signup count to `marketing/launch-checklist.md`.

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| R11 | Phase-5 reconciliation drift (Jury B1/B2/B3 + C1/C2/C3/C4 not landed before `0001_initial.sql` ships → forward-only schema with wrong shape) | High | Critical | Sprint (tickets) + Atlas/Axiom/Shield/Cipher (artifacts) | **M0 week 1** — all fixes in HEAD before week 2 |
| R12 | IaC absence blocks every other M0 deliverable | High | High | Terra | **M0 ticket-0** — ~3 days; nothing else blocks on it |
| R7 | EU AI Act Art. 50 interim disclosure missed (binds 2026-08-02 ≈ 12 weeks out) | Medium | High | Comply + Forge | M0 close — `X-AI-Generated` header live on first synthetic run |
| R14 | External pentest vendor lead-time too long for M3 exit gate | High | High | Shield + Penny | **M0 close** — vendor signed + scope locked |
| R15 | WCAG conformance audit vendor lead-time too long for M4 exit gate | Medium | High | Halo + Comply | M0 close — vendor coordination started; lock at M1 close |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 M0 row:

- **Jury B1, B2, B3** (3 Blockers) — Atlas + Shield. Deadline: week 1.
- **Jury C1, C2, C3, C4** (4 Criticals) — Axiom + Atlas. Deadline: week 1.
- **Jury M1** (IaC empty) — Terra. Deadline: M0 ticket-0 (~3 days).
- **Jury M2** (Shield TB-3 stale on queue) — Shield. Deadline: M0 close.
- **Cipher Fix-1** (Vault-AAD enforcement contract spec) — Atlas + Cipher. Deadline: M0 close (function ships M1).
- **Cipher Fix-3a** (JWT aud + TTL reconciliation) — = part of Jury C2.
- **Cipher Fix-3d** (`code_cryptoshredded` audit_action) — Atlas. Deadline: M0 close.
- **Cipher Fix-4** (cipher name + rotation cadence) — Cipher. Deadline: M0 close.
- **ARCH-D2** (Terra provisions Railway us-east) — Forge + Pipeline. Deadline: M0 ticket-0.
- **D6** (M2↔M3 reorder reflected in this Sprint plan) — Sprint. Deadline: this file (CLOSED).
- **D8** (sandbox locked in decisions.md, ships at M1) — Shield. Deadline: M0 (locked at Phase 5; M0 gate verifies grep).
- **#18** (Art. 50 interim machinery) — Comply + Forge. Deadline: M0 close.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 1 | Phase-5 reconciliation (B1/B2/B3/C1/C2/C3/C4); Terra IaC ticket-0; Cipher Fix-4 doc edits; pentest + WCAG vendor outreach | | | |
| 2 | `0001_initial.sql` lands on staging; all five schema files validated by Verify; synthetic run emits `X-AI-Generated`; `/coming-soon` live | | | |

## Open questions

For BigBrain to resolve before M0 closes:

- (none mandatory) — D4 ($19 vs $29) and D5 (Auto-PR pricing) are explicitly deferred to M2 ticket-cut and V1.5 spec-kickoff respectively per owner-matrix.md.

## Cross-references

- PRD §16 row for M0; PRD §11.3 + §14.5 (AI Act interim disclosure).
- `architecture/test-strategy.md` §3 M0 gates (this file mirrors them).
- `architecture/decisions.md` ARCH-D1, ARCH-D2 (Railway us-east); ARCH-D9, ARCH-D10 (still open — deadline M1, M3 respectively, NOT M0).
- `architecture/database/migration-order.md` `0001_initial.sql` row.
- `shared_context/projects/studio-zero-productization/decisions.md` IA-D1/D2/D3 (deadlines: M1).
- `shared_context/projects/studio-zero-productization/phase5-audit-jury.md` (Blocker + Critical + Major catalog).
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` (Fix-1..Fix-5 catalog).
- `ia/user-flows/*.md` — no user-flow ships at M0 (501-stubs only).
