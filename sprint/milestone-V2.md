# Milestone V2 — Build mode + Firecracker graduation

**Target:** week 28 (= M5 + 12 weeks per PRD §16)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES. Self-dogfood gate V2.

## Scope (one-line)

Build mode ships (roadmap + docs + seeded repo + live dashboard + score) and the runner graduates from rootless container to Firecracker microVM after a second clean external pentest.

## Entry prerequisites

- M0 → M5 + V1.5 all green; production stable.
- Second external pentest scoped at V1.5 close (Firecracker-specific config) — engaged ≥8 weeks before V2 close per Risk R14.
- Auto-PR attach rate ≥10% Pro-tier (R18 sanity check; pivot if below).

## Deliverables per layer

### Strategy

- **Sprint:** weekly burndown updates; V2.1 ticket-cut scoping at week 27.
- **Penny:** Build-mode unit economics (V2 audits + seeded repo cost vs price).
- **Scout:** Build-mode positioning — emphasize roadmap + docs + audit-gate-before-delivery as the differentiator vs v0 / Bolt / Lovable / Devin.

### Audit (Jury + 6 reviewers)

- **Jury — Audit gate before build delivery:** no Build output ships without `PASS` or `PASS WITH FIXES` verdict on the generated artifact.
- **Jury — Self-dogfood gate V2:** verdict in `audits/v2.json` = PASS or PASS WITH FIXES.

### Backend (Forge)

- **Forge — Build mode runner:** `runBuild(input: BuildInput): AsyncIterable<BuildEvent>` per PRD §13.3. Roadmap bundle generation; seeded GitHub repo with milestones/issues; live build dashboard streaming.
- **Forge — Roadmap bundle schema:** `runner/schemas/roadmap-bundle.v1.schema.json` committed; ajv-validates a sample bundle.
- **Forge — Firecracker A/B harness:** parallel Firecracker workers on Fly.io us-east; A/B-test same fixture-repo set in Firecracker vs rootless container.

### Frontend (Vega)

- **Vega — Live build dashboard:** layer-status grid; live phase progress; final readiness-score panel.
- **Vega — Build-mode intake form:** product vision + audience + vibe + constraints input.
- **Vega — Roadmap bundle download UI:** zip / browseable docs / GitHub-seeded repo link.

### Design (Canvas, Pixel)

- **Pixel:** build-mode visuals — layer-status grid + roadmap-bundle preview.

### Data (Atlas)

- **Atlas — `0008_build_mode.sql`:** `builds` table (state machine); `roadmap_bundles` table; `build_phase_events` for live dashboard reconstruction.

### Security (Shield, Cipher, Verify)

- **Shield — Second external pentest on Firecracker config** — scope: KVM-in-CI; Firecracker microVM sandbox-escape corpus. Vendor engaged at V1.5 close per R14.
- **Verify — Roadmap-bundle schema test:** ajv-validates sample bundles.
- **Verify — Audit-gate-blocks-delivery negative test:** `tests/integration/build-audit-gate.spec.ts` — FAIL verdict → roadmap bundle delivery refused.
- **Verify — Firecracker A/B test:** same fixture-repo set in Firecracker vs rootless container; no verdict regression; runtime within 1.5× rootless baseline.
- **Verify — Build dashboard live-reconstruction test:** dashboard reconstructible solely from emitted `phase_started`/`phase_finished` events (MI5 analog for build mode).

### Quality (Probe, Crash, Ghost)

- **Probe:** build-mode e2e specs (happy + 2 unhappy paths: incomplete brief, Jury verdict FAIL).
- **Crash:** chaos test for build-mode multi-layer concurrent phase failure.

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Terra:** Fly.io Firecracker workers provisioned in IaC (us-east `iad` region per ARCH-D2 deferral plan).
- **Pipeline:** self-hosted CI runners for KVM (Firecracker corpus requires KVM-in-CI).
- **Watch:** Firecracker worker observability parity with Railway containers.

### Platform (Locale, Edge, Tongue)

- **Locale + Atlas — ARCH-D8 trigger check:** if first EU customer requested data residency during M5–V2 window, execute the multi-region migration plan from `architecture/database/migrations/_planned_/data_residency.sql`. **Not a milestone gate; trigger-conditional.**

### AI (Cortex, Memory, Oracle)

- **Cortex — Second provider integration (R9 mitigation):** OpenRouter or direct second-provider lane in `runner/llm/`; abstraction validated at M1 pays off here. Circuit breaker fallback live per threat-model TB-4 D-row.

### Docs (Scribe, Guide)

- **Scribe:** `docs/build-mode.md`; documents the 10-phase BUILD_FLOW.md as the methodology Studio Zero sells.

### Growth (Signal, Lens, Herald, Hook)

- **Herald — Build-mode brand voice:** "ideas → roadmap → audit-passing product" positioning; PRD §7.3 workflow.
- **Hook — Build-mode attach rate:** instrument; V2 audits-to-build conversion.

### Operations (Echo, Ledger, Comply)

- **Comply:** AI System Card v1.0 updated to reflect Build mode (new processing surface).

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 V2 exactly. M0 → M5 + V1.5 gates remain green; add:

- [ ] `runner/schemas/roadmap-bundle.v1.schema.json` committed + ajv-validates a sample bundle.
- [ ] **Audit-gate-blocks-delivery negative test green** — FAIL verdict → roadmap bundle delivery refused; `tests/integration/build-audit-gate.spec.ts`.
- [ ] **Firecracker microVM A/B test green** — same fixture-repo set in Firecracker vs rootless container; **no verdict regression**; runtime within 1.5× rootless baseline.
- [ ] **Second external pentest on Firecracker config — ≤1 Major / 0 Critical** before graduation. Report committed at `compliance/pentest-firecracker-2026-qN.pdf`.
- [ ] **Live build dashboard reconstructible** solely from emitted `phase_started`/`phase_finished` events.
- [ ] **Self-dogfood gate V2:** `audits/v2.json` = PASS or PASS WITH FIXES.

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| R9 | Concentration risk on Anthropic | Medium | High | Forge (second provider in `runner/llm/`) | V2 — second provider live |
| **NEW V2** | **Firecracker A/B regression** (verdicts differ between sandbox modes) | Medium | High | Shield + Forge | V2 — A/B test as exit gate |
| **NEW V2** | **Firecracker pentest finds Critical** | Low | Critical | Shield + Forge (24h Critical SLA) | V2 — conditional pass if 5-day mitigation |
| **NEW V2** | **Build mode Jury verdict FAIL is unrecoverable** (no clear remediation path) | Medium | Medium | Jury + BigBrain | V2 — escalation runbook in `operations/build-fail-runbook.md` |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 V2 row:

- **ARCH-D8** (multi-region migration plan trigger if first EU customer arrives) — Atlas + Comply + Cipher + Forge.
- **Firecracker microVM graduation** (D8 phased close, A/B vs rootless) — Shield + Forge.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 23 | Build-mode scaffolding; roadmap-bundle schema drafting; Fly.io Firecracker workers provisioned | | | |
| 24 | Live build dashboard; phase-event emission spec; second-provider integration start | | | |
| 25 | Firecracker A/B harness; ARCH-D8 trigger check; multi-region plan executable if triggered | | | |
| 26 | Firecracker pentest engagement begins; build-mode e2e specs | | | |
| 27 | A/B results review; V2.1 ticket-cut scoping; self-dogfood V2 preview | | | |
| 28 | Firecracker pentest report; A/B test green; self-dogfood gate V2; Firecracker graduation | | | |

## Open questions

For BigBrain to resolve before V2 closes:

- (none mandatory) — ARCH-D8 trigger is event-driven, not calendar-driven.

## Cross-references

- PRD §16 V2 row + §7.3 Build workflow + §17 D8 (phased Firecracker).
- `architecture/test-strategy.md` §3 V2 gates.
- `architecture/decisions.md` ARCH-D2 (Fly.io deferral), ARCH-D8 (multi-region trigger).
- `architecture/threat-model.md` §3.5 sandbox escape + §5 second-pentest scope.
- `BUILD_FLOW.md` (every phase is the methodology Studio Zero sells in V2).
