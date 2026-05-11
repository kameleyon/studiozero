# Milestone V2.1 — Scaffold / MVP code generation

**Target:** week 34 (= M5 + 18 weeks per PRD §16)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES. Self-dogfood gate V2.1. **Audit-gated delivery — scaffold ships only on PASS or PASS WITH FIXES.**

## Scope (one-line)

Working scaffold / MVP code generation. Audit-gated. Clean-VM bootstrap completes <30 min. Offline-mode network-tap proves no code POSTed externally.

## Entry prerequisites

- M0 → M5 + V1.5 + V2 all green; Firecracker graduation complete.
- Build-mode V2 attach rate ≥10% of paid customers (signal that scaffold is asked for).

## Deliverables per layer

### Strategy

- **Sprint:** weekly burndown updates; post-V2.1 retro queue → BUILD_FLOW.md v2.0 candidate.
- **Penny:** Scaffold-tier unit economics (V2.1 is high-cost-to-generate; price accordingly).

### Audit (Jury + 6 reviewers)

- **Jury — Audit-gated scaffold delivery:** scaffold ships only on PASS or PASS WITH FIXES. FAIL → re-generation cycle.
- **Jury — Self-dogfood gate V2.1:** verdict in `audits/v2_1.json` = PASS or PASS WITH FIXES.

### Backend (Forge)

- **Forge — Scaffold generation:** working MVP code output (Next.js + Tailwind + Supabase by default; templates per `project-template/`).
- **Forge — Clean-VM bootstrap test:** scaffold runs offline on a fresh Ubuntu/Windows VM in <30 min.
- **Forge — Offline-mode network-tap:** scaffold runs offline; tap captures zero outbound HTTP.

### Frontend (Vega)

- **Vega — Scaffold preview UI:** download zip / open-in-Codespaces / open-in-StackBlitz buttons.

### Design (Canvas, Pixel)

- **Pixel:** scaffold-preview screenshots.

### Data (Atlas)

- **Atlas — `0009_scaffold_v2_1.sql`:** `scaffolds` table; `scaffold_audits` linking to `runs`.

### Security (Shield, Cipher, Verify)

- **Verify — Clean-VM bootstrap test:** `tests/e2e/v2.1-clean-vm-bootstrap.spec.ts` on fresh Ubuntu/Windows VM.
- **Verify — Offline-mode network-tap test:** `tests/security/v2.1-offline-network-tap.spec.ts` — scaffold runs offline; tap captures zero outbound HTTP.
- **Verify — Audit-gated delivery test:** scaffold ships only on PASS or PASS WITH FIXES verdict.

### Quality (Probe, Crash, Ghost)

- **Probe:** scaffold-generation e2e on multiple template combinations (Next.js + Astro + plain Node).
- **Crash:** chaos test for scaffold-generation mid-run failure.

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Pipeline:** clean-VM CI runner (Linux + Windows + macOS).
- **Watch:** scaffold-generation observability.

### Platform (Locale, Edge, Tongue)

- *(no incremental deliverable)*

### AI (Cortex, Memory, Oracle)

- **Cortex:** scaffold-generation prompts; second-provider fallback (R9 ramp).

### Docs (Scribe, Guide)

- **Scribe:** `docs/scaffold.md`; template catalog.

### Growth (Signal, Lens, Herald, Hook)

- **Herald — Scaffold-mode brand voice:** "audit-passed code, on day one" positioning.
- **Hook — Scaffold attach rate:** instrument.

### Operations (Echo, Ledger, Comply)

- **Comply:** AI System Card v1.0 updated to reflect Scaffold mode.

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 V2.1 exactly. M0 → V2 gates remain green; add:

- [ ] **Clean-VM bootstrap of a generated scaffold completes in <30 min** — `tests/e2e/v2.1-clean-vm-bootstrap.spec.ts` on fresh Ubuntu/Windows VM.
- [ ] **Offline-mode network-tap proves no code POSTed externally** — `tests/security/v2.1-offline-network-tap.spec.ts`: scaffold runs offline; tap captures zero outbound HTTP.
- [ ] **Audit-gated delivery:** scaffold ships only on PASS or PASS WITH FIXES verdict. Negative test: FAIL → delivery refused.
- [ ] **Self-dogfood gate V2.1:** `audits/v2_1.json` = PASS or PASS WITH FIXES.

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| **NEW V2.1** | **Scaffold generation produces non-bootstrappable output** | Medium | High | Forge + Verify (clean-VM bootstrap test as gate) | V2.1 exit |
| **NEW V2.1** | **Scaffold leaks customer code to external service during generation** | Low | Critical | Cipher + Verify (offline network-tap as gate) | V2.1 exit |
| **NEW V2.1** | **Audit-gate-on-scaffold creates customer frustration loop** (FAIL → regenerate → FAIL → …) | Medium | Medium | Jury + Forge (escalation runbook; max retries with manual escalation) | V2.1 — `operations/scaffold-fail-runbook.md` |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 V2.1 row:

- **Scaffold/MVP code generation audit-gated delivery** — Jury + Forge.
- **<30min clean-VM bootstrap** — Forge + Verify.
- **Offline-mode network-tap green** — Verify + Cipher.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 29 | Scaffold-generation scaffolding; template catalog (Next.js + Astro + plain Node) | | | |
| 30 | Clean-VM bootstrap test harness; offline-network-tap test harness | | | |
| 31 | First scaffold output running on clean Ubuntu VM; offline-mode wired | | | |
| 32 | Audit-gate-on-scaffold integration; max-retries escalation runbook | | | |
| 33 | All e2e specs green; Windows + macOS clean-VM bootstrap green | | | |
| 34 | Self-dogfood gate V2.1; production launch of Scaffold mode | | | |

## Open questions

For BigBrain to resolve before V2.1 closes:

- (none mandatory)

## Cross-references

- PRD §16 V2.1 row + §7.3 Build workflow output options (roadmap, seeded repo, scaffold).
- `architecture/test-strategy.md` §3 V2.1 gates.
- `BUILD_FLOW.md` — closes Phase 9 → Phase 10 loop for scaffold-mode customers.
