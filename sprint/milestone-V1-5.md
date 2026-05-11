# Milestone V1.5 — Auto-PR fix delivery

**Target:** week 22 (= M5 close + 6 weeks, per PRD §16)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES. Self-dogfood gate V1.5.

## Scope (one-line)

Auto-PR fix delivery ships — gated by Jury re-audit, with Art. 50 disclosure in every PR body, AI System Card v1.0 published, GitHub-App-uninstall-after-PR banner live.

## Entry prerequisites

- M0 → M5 exit gates all green; production stable for ≥4 weeks post-launch.
- **D5 decision LOCKED at V1.5 spec-kickoff** (week 17) — Jo's call between flat $49 and tiered S/M/L $15/$49/$99. Sprint default if no decision: ship flat $49 (matches PRD §12 skeleton).
- AI System Card v0.1 placeholder live since M5; v1.0 due before Auto-PR launch.

## Deliverables per layer

### Strategy

- **Sprint:** weekly burndown updates; ICE scoring for V1.5 follow-on work.
- **Penny — D5 decision deadline:** $49 flat vs tiered S/M/L. Decision at V1.5 spec-kickoff.
- **Scout:** GTM thread for V1.5 launch — emphasize the wedge (Auto-PR with UX + a11y + brand audit, not just security).

### Audit (Jury + 6 reviewers)

- **Jury — Re-audit gate (ARCH-D7 + Cipher Fix-2):** `jury-reaudit-gate` Edge Function is the only code path that can transition `fix_pr_jobs.state='reaudit_passed'` (RLS predicate). Re-audit runs after build agents propose fixes; PR opens only on re-audit PASS.
- **Jury — Self-dogfood gate V1.5:** verdict in `audits/v1_5.json` = PASS or PASS WITH FIXES.
- **Halo:** axe-core gate on PR-body Markdown render on GitHub (HC9).

### Backend (Forge)

- **Forge — Build agents wired into fix delivery:** Forge / Vega / Atlas / Halo / etc. propose code changes; Jury orchestrates re-audit.
- **Forge — PR opens on feature branch only:** `studio-zero/fix-<run-id>`; pre-flight check `head != default_branch`; default-branch push attempt → blocked → audit-logged (PRD §16 V1.5 gate C8).
- **Forge — Art. 50 disclosure in PR body:** template owned by Comply + Herald; opens with disclosure paragraph.
- **Forge — Per-commit AI-Authored trailer:** `AI-Authored: studio-zero/runner@v<x.y.z>` in every commit message.
- **Forge — Per-commit attribution to originating finding:** `Refs: F-NNN` trailer; finding-ID set matches PR-claimed-findings set (MA5).
- **Forge — Score-engine-version snapshot at fix-time:** if version bumps during fix flow, PR opens with the version that was live at gate-pass time (C6 race test).
- **Forge — D23 stale-tracking banner:** when `installation.deleted` webhook arrives for an installation that has open `fix_pr_jobs`, `runs.tracking_state` and `fix_pr_jobs.tracking_state` transition to `'stale'`. UI banner: "Tracking unavailable — reinstall the Studio Zero GitHub App to resume merge status."

### Frontend (Vega)

- **Vega — Auto-PR upgrade UI:** verdict-screen CTA on FAIL or PASS WITH FIXES in Code/Full SKU → "Ship the fixes — $49 →" (or tiered if D5 lands tiered).
- **Vega — `fix-delivery-prflow.md` flow LIVE.**
- **Vega — D23 stale-tracking banner:** `role="status"` per Halo HC1; one-click reinstall CTA.
- **Vega — Re-audit progress UI:** customer sees "Jury re-auditing your fixes…" with same live-progress patterns as M1 audit.

### Design (Canvas, Pixel)

- **Canvas:** Auto-PR upgrade modal + PR-body Markdown template + stale-tracking banner state.

### Data (Atlas)

- **Atlas — `0007_v1_5_auto_pr.sql` lands:** `fix_pr_jobs` row creation; webhook handler updates for `installation.deleted` and `installation.created` (ARCH-D6 transitions). Verify with integration test that the column already exists from M0 (B1 closure).

### Security (Shield, Cipher, Verify)

- **Verify — Goal 3 e2e green:** `tests/acceptance/goal-3-fix-delivery.spec.ts` — paid upgrade → PR on `studio-zero/fix-<run-id>` (never default) → PR body includes re-audit verdict + Art. 50 disclosure + AI-Authored trailer per commit.
- **Verify — C6 negative-case test:** `tests/integration/auto-pr-reaudit-rejection.spec.ts` — injected Critical in re-audit → PR not opened → `fix_pr_jobs.state='rejected_by_reaudit'` → customer notified → refund event in `billing_events` → GitHub App token never called `POST /repos/{}/pulls`.
- **Verify — C8 default-branch push fuzz:** `tests/security/default-branch-fuzz.spec.ts` — 50+ variants from `runner/fixtures/default-branch-fuzz-corpus/`; guard fires every time; `audit_logs` records each attempt.
- **Verify — MA5 attribution test:** every commit has `Refs: F-NNN` trailer; finding-ID set matches.
- **Verify — C6 race test:** fix passes re-audit at T; `score_engine_version` bumps to v2 at T+1; gate uses fix-time version snapshot; PR opens with `score_engine_version: "v1"` stamped.
- **Verify — D23 banner test:** GitHub App uninstalled after PR opened → banner renders correctly (Playwright snapshot).
- **Shield — default-branch fuzz corpus:** `runner/fixtures/default-branch-fuzz-corpus/` ≥50 variants (case, locale, trailing-space, unicode lookalike, `main `, `MAIN`, `master`, `trunk`).

### Quality (Probe, Crash, Ghost)

- **Probe:** `fix-delivery-prflow.md` flow Playwright spec (un-skipped from MVP).
- **Crash:** chaos test for GitHub webhook delivery delay 60s; re-audit gate must not race ahead.

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Pipeline:** GitHub App `Contents: Write` scope added (M3 → V1.5 transition per threat-model TB-12 E-row); documented review by Cipher.
- **Watch:** Auto-PR open / merge / closed event monitoring.
- **Meter:** Auto-PR attach rate dashboard; Penny consumes (R18 mitigation).

### Platform (Locale, Edge, Tongue)

- *(no incremental deliverable)*

### AI (Cortex, Memory, Oracle)

- **Oracle — AI System Card v1.0 LIVE** at `/system-card`; Comply sign-off; Herald + Proof review readability.

### Docs (Scribe, Guide)

- **Scribe:** `docs/auto-pr.md`; PR-body template documented.
- **Guide:** in-app help for "What is Auto-PR?" with audit→fix→PR explainer.

### Growth (Signal, Lens, Herald, Hook)

- **Herald — PR-body template LIVE:** Art. 50 disclosure paragraph + AI-Authored trailer + finding-ID attribution + re-audit-PASS badge.
- **Hook — Attach-rate measurement:** instrument upgrade funnel; ICE-prioritize improvements; >15% Pro-tier attach target (R18 mitigation).
- **Signal:** V1.5 launch thread + competitive head-to-head (Copilot Autofix is security-only; Studio Zero ships UX + a11y + brand fixes).

### Operations (Echo, Ledger, Comply)

- **Comply — AI System Card v1.0 LIVE (#18 final):** Art. 50 disclosure paragraph in every PR body; commit trailer in every commit message.
- **Comply — California SB 942** (AI Transparency Act) verified — machine-readable provenance via PR-body disclosure machinery.
- **Ledger — D5 pricing wired:** flat $49 OR tiered S/M/L per Jo's call.

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 V1.5 exactly. M0 → M5 gates remain green; add:

- [ ] `tests/acceptance/goal-3-fix-delivery.spec.ts` green — paid upgrade → PR on `studio-zero/fix-<run-id>` (never default) → PR body includes re-audit verdict + Art. 50 disclosure + AI-Authored trailer per commit.
- [ ] **C6 negative-case test green** — `tests/integration/auto-pr-reaudit-rejection.spec.ts`: injected Critical in re-audit → PR not opened; `fix_pr_jobs.state = 'rejected_by_reaudit'`; customer notified; refund event in `billing_events`; GitHub App token never called `POST /repos/{}/pulls` (assertion: zero outbound to that endpoint during test).
- [ ] **C8 default-branch push fuzz green** — `tests/security/default-branch-fuzz.spec.ts`: 50+ variants from `runner/fixtures/default-branch-fuzz-corpus/`; guard fires every time; `audit_logs` records each attempt.
- [ ] **MA5 attribution test green** — every commit in PR has `Refs: F-NNN` trailer; finding-ID set matches PR-claimed-findings set.
- [ ] **C6 race test green** — fix-time `score_engine_version` snapshot wins; PR opens with `v1` stamped even when `v2` lands at T+1.
- [ ] **AI System Card v1.0 published** at `/system-card`; Comply sign-off; Art. 50 disclosure paragraph in every PR body (snapshot test).
- [ ] **Decision D23 banner test** — GitHub App uninstalled after PR opened → banner renders `"Tracking unavailable — reinstall the Studio Zero GitHub App to resume merge status."` (Playwright snapshot).
- [ ] **Self-dogfood gate V1.5:** `audits/v1_5.json` = PASS or PASS WITH FIXES.

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| R3 | Auto-PR opens a bad change against customer's repo | Medium | High | Forge (re-audit gate), Jury (re-audit), Pipeline (default-branch fuzz) | **V1.5 exit** — C6 + C8 negative tests green |
| R18 | Auto-PR attach rate below 15% Pro-tier assumption | Medium | High | Penny + Hook (monitor; ICE-prioritize) | V1.5 + 30 days (first cohort) |
| **NEW V1.5** | **AI System Card v1.0 misses Art. 50 deadline** (binds 2026-08-02 ≈ M3-M4 window if calendar holds) | Medium | High | Comply + Herald | V1.5 — interim machinery already live since M0/M1 buys runway |
| **NEW V1.5** | **GitHub App `Contents: Write` scope leak / over-permission** | Low | High | Cipher + Shield (scope review per TB-12 E-row) | V1.5 — documented review pre-launch |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 V1.5 row:

- **D3** Auto-PR fix delivery ships — Forge + Comply.
- **D5** Auto-PR pricing — **Jo + Penny. Hard deadline: V1.5 spec-kickoff (week 17).**
- **D23** GH App uninstall after PR opened — banner ships with Auto-PR.
- **#18 v1.0** AI System Card — Comply + Herald.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 17 | **D5 decision needed by EoW**; Auto-PR scaffolding; build-agents-into-fix-delivery design | | | |
| 18 | Jury re-audit Edge Function; PR-body template draft (Herald + Comply) | | | |
| 19 | Default-branch fuzz corpus; ARCH-D6 stale-tracking banner; AI System Card v1.0 drafting | | | |
| 20 | C6 + C8 negative tests green; attribution test green; race test green | | | |
| 21 | D23 banner test; AI System Card v1.0 review (Comply + Herald + Proof) | | | |
| 22 | Self-dogfood gate V1.5; Goal-3 e2e green; production launch of Auto-PR | | | |

## Open questions

For BigBrain to resolve before V1.5 closes:

- **D5 pricing** at week 17 (start of V1.5).

## Cross-references

- PRD §16 V1.5 row + §11.2 Auto-PR + §14.5 AI System Card + §17 D3, D23, #18.
- `architecture/test-strategy.md` §3 V1.5 gates.
- `architecture/decisions.md` ARCH-D6 (stale-tracking enum), ARCH-D7 (jury-reaudit-gate).
- `architecture/threat-model.md` TB-12 + §3.5 sandbox-escape (build agents in container).
- `ia/user-flows/fix-delivery-prflow.md` (becomes real at V1.5).
- `shared_context/projects/studio-zero-productization/decisions.md` PRD-v0.5-C3 (= D23).
- `agents/growth/herald-brand-voice.md` PR-body template.
