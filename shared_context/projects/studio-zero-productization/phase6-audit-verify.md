# Phase 6 Audit — Verify

**Version:** 1.0
**Date:** 2026-05-11
**Auditor:** Verify (QA + test-strategy owner)
**Subject:** Sprint's Phase-6 deliverable — `sprint/` directory (12 files)
**Reference:** `BUILD_FLOW.md` Phase 6 exit gate; `architecture/test-strategy.md` §3 (Verify's own per-milestone gate matrix, the source of truth).

---

## 0. Phase-6 gate verdict

**PASS WITH FIXES.** Binary gate discipline is held throughout; test-strategy alignment is identical-or-stricter at every milestone (no softening); PRD §19 + new R-N coverage is complete; D# / ARCH-D / IA-D / Cipher Fix decisions all have named milestone deadlines. Three Major findings + four Minor findings, all addressable inside M0 week 1 without re-scoping. **M0 is GO**, conditional on the M0-week-1 fix list below.

---

## 1. Per-milestone verdicts

| Milestone | Verdict | Rationale |
|---|---|---|
| **M0** | **PASS WITH FIXES** | 17 binary gates; 0 vibes. Two file-existence assumptions in Entry-prerequisites overstate HEAD state (Finding F-MIN-1). Sandbox-decision grep is binary but uses a long literal string — recommend brittle-string finding F-MIN-3. |
| **M1** | **PASS WITH FIXES** | 16 binary gates; first self-dogfood gate landed correctly. ARCH-D9 egress allowlist sits inside the M1 exit gate AND is flagged "OPEN at start of M1; must close by M1 exit" — that's a known critical path. Major finding F-MAJ-1 (no Goal-4 BYOK lane in M1 even though BYOK is M1's whole point; Goal 4 is gated to M2). |
| **M2** | **PASS WITH FIXES** | 14 binary gates; PI corpus 100% handling assertion is the right shape (specific failure modes enumerated). Finding F-MAJ-2 (D4 pricing decision listed as both "ticket-cut week 7" AND "must land before M2 exit" — re-check ordering). |
| **M3** | **PASS** | 11 binary gates; pentest report file existence + structured front-matter scrape is the strongest binary form available. ARCH-D10 closure binds to schema bump. CLI no-upload network-tap is the right falsifiable assertion. |
| **M4** | **PASS** | 10 binary gates; WCAG conformance audit report committed at `compliance/wcag-conformance-<vendor>-2026.pdf` is the right artifact form. Right-to-delete + retention purge cron both have falsifiable time-advance tests. |
| **M5** | **PASS** | 7 binary gates; DMCA confirmation PDF, GTM channel scrape, and full-regression-rerun are all binary. Self-dogfood at M5 elevated to "FAIL halts launch" per BIGBRAIN.md Hard Rule §1 — correctly. |
| **V1.5** | **PASS** | 8 binary gates; C6 negative-case test (re-audit rejection → zero outbound to `POST /repos/{}/pulls`) is the gold-standard form for proving a thing didn't happen. AI System Card v1.0 + Art. 50 snapshot test is the right binding. |
| **V2** | **PASS WITH FIXES** | 6 binary gates; Firecracker A/B test (no verdict regression + runtime within 1.5× baseline) is well-specified. Finding F-MIN-2 — second pentest "≤1 Major / 0 Critical" softer than M3 ("0 Blocker" explicit there; V2 silent on Blocker — likely an editorial oversight). |
| **V2.1** | **PASS** | 4 binary gates; offline-mode network-tap is the right "prove the thing didn't happen" form. Audit-gated delivery negative test scoped. |

---

## 2. Binary-gate discipline scorecard

Walked every checkbox in every "Exit gate" section. Counts:

| Milestone | Binary CI test | File-existence | SLO assertion | Signed third-party | Vibes-grade | TOTAL |
|---|---|---|---|---|---|---|
| M0 | 9 | 7 | 0 | 0 | **0** | 16 (+1 grep-for-string) |
| M1 | 14 | 1 | 1 (p95 over rolling 7d) | 0 | **0** | 16 |
| M2 | 12 | 1 | 1 (Realtime fan-out p95) | 0 | **0** | 14 |
| M3 | 9 | 1 | 0 | 1 (pentest) | **0** | 11 |
| M4 | 7 | 1 | 0 | 1 (WCAG audit) | **0** | 9 (+1 manual AT recording sign-off — see F-MAJ-3) |
| M5 | 4 | 2 | 1 (uptime 7d) | 0 | **0** | 7 |
| V1.5 | 7 | 1 | 0 | 0 | **0** | 8 |
| V2 | 4 | 1 | 0 | 1 (Firecracker pentest) | **0** | 6 |
| V2.1 | 4 | 0 | 0 | 0 | **0** | 4 |
| **Total** | **70** | **15** | **3** | **3** | **0** | **91** |

**Zero vibes-grade gates across 91 exit assertions.** Sprint held the red line. The "WCAG conformance audit signed off" entries are signed-third-party assertions, which is acceptable per the binary-gate definition. Halo's manual NVDA + VoiceOver sign-off (M4) is the closest thing to a vibes-grade entry but is bounded by file-existence assertion (`tests/a11y/at-recordings/m4/`) + sign-off-recorded contract — see F-MAJ-3 for the gap.

### Notes on the one borderline case

- **M0 sandbox-decision gate** is `grep architecture/decisions.md for "rootless container + dropped caps + seccomp + egress allowlist; Firecracker V2 graduation" → match`. That is technically binary but brittle to whitespace/punctuation drift. Recommend a parseable structured decisions-log assertion (F-MIN-3).

---

## 3. Test-strategy alignment delta report

For each milestone, compared sprint exit-gate to `architecture/test-strategy.md` §3:

| Milestone | Gates in test-strategy §3 | Gates in sprint file | Delta |
|---|---|---|---|
| M0 | 9 | 17 | **+8 additive** (Phase-5 Jury B1/B2/B3 + C1/C2/C3/C4 file-state checks; Cipher Fix-1/3a/3d/4 file-state checks; IaC ticket-0; pentest+WCAG vendor signed; `/coming-soon` waitlist live). All additive, no test-strategy gate dropped. |
| M1 | 14 | 16 | **+2 additive** (jwt-mint-tenant-scoped full M1 version, ARCH-D9 closure with NetworkPolicy yaml). No drops. |
| M2 | 13 | 14 | **+1 additive** (`stripe-reconcile-race.spec.ts` covering ARCH-D4). No drops. |
| M3 | 8 | 11 | **+3 additive** (ARCH-D10 schema bump; Cipher Fix-3c Ed25519; `0004_cli_pairing_hardening.sql` apply). No drops. |
| M4 | 8 | 10 | **+2 additive** (marketing site live; `0005_lifecycle_emails_audit.sql` apply). No drops. |
| M5 | 6 | 7 | **+1 additive** (`0006_dmca_and_retention.sql` apply). No drops. |
| V1.5 | 7 | 8 | **+1 additive** (D23 banner Playwright snapshot). No drops. |
| V2 | 5 | 6 | **+1 additive** (sample roadmap bundle ajv-validates). No drops. |
| V2.1 | 3 | 4 | **+1 additive** (audit-gated delivery negative test made explicit). No drops. |

**Verdict: ZERO gates dropped. Every additive gate is a hardening. Sprint is identical-or-stricter relative to test-strategy §3 at every milestone.**

---

## 4. Risk coverage table

Every PRD §19 row + every new R-N row mapped to milestone(s):

| Risk ID | Risk | L | I | Mitigation owner | Milestone(s) where mitigated | Status |
|---|---|---|---|---|---|---|
| R1 | LLM cost overrun (Managed) | H | H | Meter + Forge + Crash | M2 | Covered (M2 token-cap load test + alert) |
| R2 | Audit verdict perceived unfair | M | H | Jury + Herald | M1 | Covered (score_engine_version stamp + per-finding evidence) |
| R3 | Auto-PR opens bad change | M | H | Forge + Jury + Pipeline | V1.5 | Covered (C6 + C8 negative tests in V1.5 exit gate) |
| R4 | BYOK key leak from logs/DB | L | C | Cipher + Pipeline | M0 + M1 | Covered (Fix-1 in 0002 mig; redaction corpus M1) |
| R5 | Customer code retention breach | L | C | Atlas + Comply + Cipher | M1 + M4 | Covered (cryptoshred M1; full e2e + purge cron M4) |
| R6 | CLI mode fraudulent verdict | M | M | Herald + Halo + Shield | M3 | Covered (D7 watermark on every CLI surface) |
| R7 | EU AI Act Art. 50 missed deadline | M | H | Comply + Forge | M0 + V1.5 | Covered (interim machinery M0; v1.0 V1.5) |
| R8 | Studio Zero ships uncaught bug | H | M | Sprint + Verify | M1→V2.1 every milestone | Covered (self-dogfood gate ubiquity verified §6 below) |
| R9 | Anthropic concentration risk | M | H | Forge + Crash | M1 + V2 | Covered (abstraction M1; second provider V2) |
| R10 | Pricing positioning misread | M | M | Penny | M5 + post-M5 retro | Covered (first 5 paying customers landed at M5) |
| **R11** | Phase-5 reconciliation drift | H | C | Sprint + Atlas + Axiom + Shield + Cipher | M0 week 1 | Covered (B1/B2/B3 + C1/C2/C3/C4 ticketed) |
| **R12** | IaC absence blocks M0 | H | H | Terra | M0 ticket-0 (~3 days) | Covered (Jury M1 mitigation; gate verifies `terraform plan` no drift) |
| **R13** | Egress allowlist DevOps spike | M | H | Shield + Cipher | M1 exit gate | Covered (ARCH-D9 closes at M1; Cilium NetworkPolicy + DNS-pin) |
| **R14** | Pentest vendor lead-time | H | H | Shield + Penny | M0 close → M3 exit | Covered (engage M0; report M3) |
| **R15** | WCAG vendor lead-time | M | H | Halo + Comply | M0/M1 close → M4 exit | Covered (engage M0/M1; report M4) |
| **R16** | Cross-mode consistency drift | M | M | Forge + Verify | M1 + ongoing | Covered (model pins M1; nightly drift dashboard) |
| **R17** | D4 unresolved at M2 ticket-cut | M | M | Penny + Jo | M2 ticket-cut week 7 | Covered (default: $29 + A/B slot for first 200) |
| **R18** | Auto-PR attach rate below 15% | M | H | Penny + Hook | V1.5 + 30 days | Covered (attach-rate dashboard; ICE-prioritize) |
| **R19** | Self-dogfood gate FAIL at M2+ | M | H | BigBrain + Jury + layer leads | per-milestone | Covered (milestone halts until PASS or PWF) |
| **R20** | FTC Click-to-Cancel late | L | H | Comply + Ledger | M2 | Covered (Stripe Customer Portal cancel UX) |

**Every PRD §19 row + every new R11–R20 row has owner + milestone + status. No orphans.**

---

## 5. Decision coverage table

Every decision in PRD §17 (D1–D23, #17–#20), `shared_context/.../decisions.md` (IA-D1/D2/D3, PRD-v0.5-C1/C2/C3), `architecture/decisions.md` (ARCH-D1..D10), and Phase-5 outputs (Jury B1/B2/B3 + C1..C4 + M1..M6; Cipher Fix-1..Fix-5) mapped to milestone:

### PRD §17 D-series

| Decision | Status | Owner | Milestone | Verified |
|---|---|---|---|---|
| D1 GitHub App per-repo | LOCKED | Forge + Shield | M1 | M1 line `tests/integration/github-app-clone.spec.ts` |
| D2 Free tier = 1 Project + unlimited Surface | LOCKED | Forge + Hook | M1 | M1 deliverable list |
| D3 Auto-PR deferred to V1.5 | LOCKED | Forge + Comply | V1.5 | V1.5 entire milestone |
| **D4 Starter pricing $19 vs $29** | **OPEN** | Penny + Jo | **M2 ticket-cut (week 7)** | Owner-matrix §1; Sprint default documented ($29 + $19 A/B slot) |
| **D5 Auto-PR pricing flat vs tiered** | **OPEN** | Penny + Jo | **V1.5 spec-kickoff (week 17)** | Owner-matrix §1; Sprint default documented (flat $49) |
| D6 Milestone reorder M2↔M3 | LOCKED | Sprint | M0 (reflected) | README + M0/M2/M3 ordering verified |
| D7 CLI watermark | LOCKED | Herald + Halo | M3 | M3 line for SC 3.2.4 snapshot |
| D8 Sandbox rootless→Firecracker | LOCKED phased | Shield + Forge | M0 (lock) → M1 (ship) → V2 (Firecracker) | M0 grep gate; M1 Sandbox section; V2 Firecracker A/B |
| D9 SSRF/PI/redaction/ingestion mandatory | LOCKED | Shield + Forge + Verify | M1 | M1 four corpus tests |
| #17 GDPR Art. 28 DPA | LOCKED | Comply + Ledger | M2 | M2 `compliance/dpa-template.md` |
| #18 AI System Card phased | LOCKED phased | Comply + Herald | M0/M1 (interim) → V1.5 (v1.0) | M0 disclosure-headers test; V1.5 system-card snapshot |
| #19 BYOK pass-through ToS | LOCKED | Comply | M1 | M1 deliverable list |
| #20 Regional refund matrix | LOCKED | Comply + Ledger + Forge | M2 | M2 `subscriptions.region` + cooling_off |
| D21 (=#21) Jury synth stall | LOCKED v0.5 | Atlas + Trace + Forge | M2 | M2 `jury-synth-stall.spec.ts` |
| D22 (=#22) EU cooling-off reset | LOCKED v0.5 | Comply + Ledger | M2 | M2 `eu-cooling-off-reset.spec.ts` |
| D23 (=#23) GH App uninstall after PR | LOCKED v0.5 | Atlas + Forge + Trace | V1.5 (banner) — column at M0 (B1 closure) | V1.5 D23 banner test; M0 B1 fix |

### IA-D series

| Decision | Status | Owner | Milestone |
|---|---|---|---|
| IA-D1 Mode pick before GitHub install | LOCKED | Forge | M1 |
| IA-D2 E2 upsell as full route | LOCKED | Vega + Hook | M1 |
| IA-D3 Re-audit at project boundary | LOCKED | Vega + Atlas | M1 |
| PRD-v0.5-C1 (= D21) | LOCKED | Atlas + Trace | M2 |
| PRD-v0.5-C2 (= D22) | LOCKED | Comply + Ledger | M2 |
| PRD-v0.5-C3 (= D23) | LOCKED | Atlas + Forge | V1.5 |

### ARCH-D series

| Decision | Status | Owner | Milestone |
|---|---|---|---|
| ARCH-D1 pg-boss | LOCKED 2026-05-11 | Atlas + Forge | M1 |
| ARCH-D2 Railway us-east | LOCKED 2026-05-11 | Forge + Pipeline | M0 (IaC) → M1 (deploy) |
| ARCH-D3 Short-lived tenant JWT | LOCKED 2026-05-11 | Atlas + Forge + Cipher | M1 |
| ARCH-D4 Stripe webhook reconcile | LOCKED 2026-05-11 | Ledger + Forge | M2 |
| ARCH-D5 Realtime fan-out budget | LOCKED 2026-05-11 | Stream + Atlas + Crash | M2 |
| ARCH-D6 stale-tracking enum | LOCKED 2026-05-11 | Atlas + Forge + Trace | M0 (column) → V1.5 (banner) |
| ARCH-D7 Edge Function vs API boundary | LOCKED 2026-05-11 | Forge + Pipeline | M1 |
| ARCH-D8 Multi-region deferral (plan-only) | LOCKED plan-only | Atlas + Comply + Cipher + Forge | Triggered (event-driven) |
| **ARCH-D9 Egress allowlist primitive** | **OPEN** | Shield + Cipher | **M1 exit** |
| **ARCH-D10 cli_heartbeat event** | **OPEN** | Atlas | **M3 exit** |

### Phase-5 Jury items

| Item | Status | Owner | Milestone |
|---|---|---|---|
| B1 runs.tracking_state enum | OPEN→M0 | Atlas | M0 week 1 |
| B2 fix_pr_state reaudit_passed | OPEN→M0 | Atlas | M0 week 1 |
| B3 Runner JWT TTL conflict | OPEN→M0 | Shield | M0 week 1 |
| C1 TB numbering reconciliation | OPEN→M0 | Axiom + Shield | M0 week 1 |
| C2 Mint endpoint naming | OPEN→M0 | Axiom | M0 week 1 |
| C3 notifications table missing | OPEN→M0 | Atlas | M0 week 1 |
| C4 retention_days rename | OPEN→M0 | Axiom | M0 week 1 |
| M1 IaC empty | OPEN→M0 | Terra | M0 ticket-0 |
| M2 Shield TB-3 stale | OPEN→M1 | Shield | M0→M1 |
| M3 cli_heartbeat (=ARCH-D10) | OPEN | Atlas | M3 |
| M4 Egress (=ARCH-D9) | OPEN | Shield+Cipher | M1 |
| M5 projects.client_tag | OPEN→M2 | Compass + Atlas | M2 |
| M6 SKU mapping doc | OPEN→M2 | Forge + Compass | M2 |

### Phase-5 Cipher Fixes

| Fix | Status | Owner | Milestone |
|---|---|---|---|
| Fix-1 Vault-AAD enforcement | OPEN→M0 (spec)→M1 (ship) | Atlas + Cipher | M0/M1 |
| Fix-2 Runner-vs-gateway BYOK | OPEN→M1 | Axiom + Forge | M1 |
| Fix-3a JWT aud + TTL | OPEN→M0 | Atlas + Cipher | M0 |
| Fix-3b PostHog HMAC tenant_id | OPEN→M1 | Cipher + Forge | M1 |
| Fix-3c Ed25519 CLI manifest | OPEN→M3 | Cipher + Forge | M3 |
| Fix-3d code_cryptoshredded enum | OPEN→M0 | Atlas | M0 |
| Fix-4 AEAD cipher name + rotation | OPEN→M0 | Cipher | M0 |
| Fix-5 Revocation join in RLS | OPEN→M1 | Atlas | M1 |

**Every decision in every source has a named milestone deadline. Zero orphans.** D4 and D5 are still OPEN (need Jo's call) but both have Sprint-default recommendations documented in `owner-matrix.md` §1 + the milestone files where they bind.

---

## 6. Self-dogfood gate ubiquity check

Per `BUILD_FLOW.md` "Audit Cadence" + `architecture/test-strategy.md` §5: every M1→V2.1 milestone must include a self-dogfood audit gate. M0 is exempted (runner not end-to-end yet).

| Milestone | Self-dogfood gate present? | Pass threshold? | Halt on FAIL? |
|---|---|---|---|
| M0 | n/a (exempted) | n/a | n/a |
| M1 | YES — `audits/m1.json` PASS or PWF | YES (score ≥70) | YES |
| M2 | YES — `audits/m2.json` PASS or PWF | YES | YES |
| M3 | YES — `audits/m3.json` PASS or PWF | YES | YES |
| M4 | YES — `audits/m4.json` PASS or PWF | YES | YES |
| M5 | YES — `audits/m5.json` PASS or PWF | YES + **FAIL halts launch** | YES (BIGBRAIN.md Hard Rule §1) |
| V1.5 | YES — `audits/v1_5.json` PASS or PWF | YES | YES |
| V2 | YES — `audits/v2.json` PASS or PWF | YES | YES |
| V2.1 | YES — `audits/v2_1.json` PASS or PWF | YES | YES |

**Self-dogfood gate is ubiquitous across M1–V2.1. No exceptions, no softening.** M5's "FAIL halts launch" formulation correctly invokes the Hard Rule.

---

## 7. Cross-doc referential integrity (10 spot-checks)

| # | Reference | Status |
|---|---|---|
| 1 | `architecture/decisions.md` (ARCH-D1..D10) | EXISTS |
| 2 | `architecture/database/migrations/0001_initial.sql` | EXISTS in HEAD |
| 3 | `architecture/schemas/audit-output.v1.schema.json` | EXISTS |
| 4 | `architecture/schemas/audit-event.v1.ts` | EXISTS |
| 5 | `architecture/schemas/score_engine.v1.json` | EXISTS |
| 6 | `architecture/schemas/score_engine.v1.fixtures.json` | EXISTS |
| 7 | **`architecture/schemas/audit-input.v1.schema.json`** | **MISSING in HEAD** (listed in test-strategy §2 as M0 deliverable; M0-milestone-file entry-prerequisites line 25 over-claims it already exists) — see F-MIN-1 |
| 8 | **`architecture/schemas/score_engine.v1.md`** | **MISSING in HEAD** (test-strategy §2 lists; M0 entry-prereq line 25 over-claims) — see F-MIN-1 |
| 9 | `ia/user-flows/` (all 7) | EXISTS |
| 10 | `architecture/iac/` | EXISTS but EMPTY — correctly flagged as Jury M1 / R12, M0 ticket-0 closes it |

**Verdict:** 8/10 references exist; 2/10 are M0 deliverables that the M0 milestone file Entry-prerequisites section over-claims as already present. They will exist by M0-close per the M0 exit gate (`tools/assert-files-exist.ts` and `pnpm test schema:validate`). **Minor finding F-MIN-1: align M0 Entry-prerequisites line 25 to be honest about which schemas exist at M0-open vs which Atlas authors during M0.**

---

## 8. Owner-discipline spot-checks (10 random deliverables)

Per Sprint Hard Rule §2: "One owning agent per deliverable. Supports are listed separately."

| # | Deliverable | Listed owner | Verdict |
|---|---|---|---|
| 1 | M0 — `0001_initial.sql` migration | Atlas | Single owner ✓ |
| 2 | M0 — IaC ticket-0 | Terra | Single owner ✓ |
| 3 | M0 — Pentest vendor signed | Shield | Single owner ✓ (Penny listed for budget, separate) |
| 4 | M1 — GitHub App integration | Forge | Single owner ✓ |
| 5 | M1 — Sandbox rootless (D8 phase 1) | Shield | Single owner ✓ |
| 6 | M1 — **ARCH-D9 egress allowlist** | "Shield + Cipher" | **COMPOSITE — finding F-MIN-4 (re-check)** |
| 7 | M2 — Stripe Checkout + webhook | Forge | Single owner ✓ |
| 8 | M2 — DPA template + subprocessor list | Comply + Ledger | Composite — **but matches PRD §17 #17 + decisions.md, so this is by-design joint ownership; not a finding (per Sprint, "Co-ownership across layer leads is allowed where the artifact spans layers"). However, Sprint hard rule §2 said "pick a lead, list supports separately" — verdict: minor inconsistency** F-MIN-4 |
| 9 | M3 — External pentest report committed | Shield | Single owner ✓ |
| 10 | M4 — WCAG conformance audit signed off | Halo | Single owner ✓ (Comply listed for vendor coordination, separate) |

**Composite-owner findings (F-MIN-4):** ARCH-D9 lists "Shield + Cipher" as joint owners; M2 DPA lists "Comply + Ledger" jointly. Per Sprint Hard Rule §2 the lead should be picked. **Recommendation:** designate Shield as ARCH-D9 lead (Cilium NetworkPolicy is the artifact, Shield owns network policy in threat-model) and Comply as DPA lead (Comply owns compliance artifacts; Ledger reviews). Both are addressable inline.

---

## 9. Realism findings

### 9.1 M0 — over-loaded? (2-week milestone)

M0 carries the following:
- 9 Atlas-owned schema/migration items (B1, B2, C3, C4, Fix-3d, score_engine.v1.fixtures, `0001_initial.sql`, plus `projects.client_tag` if Compass confirms)
- 4 Axiom-owned document edits (C1 TB renumber, C2 mint endpoint naming, D6 reorder confirmation, ARCH-D3 reconcile)
- 4 Shield-owned items (B3 TTL fix, C1 reconciliation session, M2 TB-3 stale, pentest vendor sign)
- 5 Cipher-owned items (Fix-1 spec, Fix-3a, Fix-3d, Fix-4, Fix-2 spec)
- 1 Comply-owned (AI Act interim machinery, WCAG vendor coordination)
- 1 Terra-owned (IaC ticket-0)
- 1 Halo-owned (WCAG vendor sign)
- 6 Verify-owned tests (score-engine, schema:validate, schema:property, file-existence, disclosure-headers integration, RLS smoke, JWT mint, CLI pairing prototype)
- 4 Forge-owned (monorepo scaffold, AI Act middleware, Vault-decrypt spec, synthetic Surface POC)
- 1 Pipeline-owned (`.github/workflows/` per-gate; CodeQL + Dependabot + gitleaks)
- 1 Signal-owned (`/coming-soon` waitlist)
- 1 Pixel-owned (token audit)
- 1 Scribe-owned (sku-mapping.md skeleton)

**Verdict:** Realistically aggressive. The 2-week target relies on (a) Phase-5 fixes being mostly **document edits** (not code), (b) Verify's tests being scaffolding around already-committed schemas + fixtures (not full implementations), (c) Terra's IaC being a 3-day ticket-0 unblocking gate. The path to plausibility requires the Phase-5 reconciliation to happen in **week 1 in parallel by 4 agents** (Atlas, Axiom, Shield, Cipher each editing their own doc), so that `0001_initial.sql` can land in week 2. **F-MAJ-4: realistic only if all four reconciliation owners work in parallel from M0 day 1; serial work cannot fit.** Sprint already calls this out under R11. Net: plausible-with-discipline; flag visible.

### 9.2 M0 — under-scoped?

Sprint mentions Pipeline workflow scaffolding + Vitest/Playwright config inside the Forge "scaffold the Next.js 15 monorepo" line and inside Pipeline's "`.github/workflows/`" item. **Pre-commit hooks (Husky + lint-staged)** — the motionmax lesson-learned from `BUILD_FLOW.md` Phase 5 "templates ship default oranges and they leak into production unless tokens override on import" applies here. **F-MIN-5: pre-commit hooks (Husky + lint-staged + gitleaks pre-commit) are NOT explicitly enumerated in M0** even though they appear retrospectively in the test-strategy §1 (Pipeline gates) row. Recommend adding to M0 Forge "scaffold the Next.js 15 monorepo" line: "+ Husky pre-commit running lint, format, gitleaks, and schema validation."

### 9.3 M1 — Goal 4 (three execution modes) is gated to M2, not M1

`tests/acceptance/goal-4-three-modes.spec.ts` is enumerated at M2 (BYOK + Managed lanes; CLI stubbed). But Goal 4 from PRD §4 reads "three execution modes wired" and Sprint's M1 *is* "BYOK only" — meaning the BYOK lane of Goal 4 should be green at M1 even if Managed and CLI are not. **F-MAJ-1: M1 exit gate should include `tests/acceptance/goal-4-three-modes.spec.ts` BYOK lane** (per-mode constraints: BYOK key validation; key never persisted in plaintext on disk transiently — heap-scan assertion per test-strategy §4). This may be implicit in M1's Goal-1 + Goal-2 + Goal-5 trio, but explicitness is the point of the binary-gate doctrine.

### 9.4 M4 — AT recordings (manual capture) the only quasi-vibes item

Halo's M4 "AT release recordings of FAIL-verdict primary flow stored in `tests/a11y/at-recordings/m4/`; manual sign-off by Halo" is the closest the entire 91-gate set comes to a vibes-grade entry. It's bounded by file-existence (`tests/a11y/at-recordings/m4/` non-empty) + Halo's sign-off recorded in `tests/a11y/at-protocol.md`. **F-MAJ-3:** Sprint's M4 file lists this as `tests/a11y/at-recordings-fail-flow.test.md` (which is a Markdown sign-off doc, not a test) — naming it `.test.md` is misleading. Recommend renaming the artifact to `tests/a11y/at-recordings/m4/signoff.md` and asserting (a) file exists, (b) contains structured front-matter `signed_by: halo` + `recordings_paths: [...]` with each path existing, (c) recordings_paths is non-empty for NVDA AND VoiceOver. Halo's sign-off becomes a structured artifact rather than a markdown vibes statement.

### 9.5 V2 — second pentest gate "≤1 Major / 0 Critical" but no "0 Blocker" assertion

M3's pentest gate reads "**≤1 Major, 0 Critical, 0 Blocker**" (M3 line 113). V2's Firecracker pentest gate reads "**≤1 Major / 0 Critical**" (V2 line 98) — silent on Blocker count. Likely editorial drift. **F-MIN-2:** harmonize V2 pentest gate to "≤1 Major, 0 Critical, 0 Blocker" to match M3 form.

### 9.6 V1.5 — D5 default lands at "flat $49" if no Jo decision

`owner-matrix.md` documents Sprint's default as "flat $49 matches PRD §12 skeleton." That's clean. But the **PRD §17 D5 OPEN** entry notes Hook + Scout argued tiered S/M/L; Penny argued flat $49. If Jo doesn't decide, Sprint defaults the way Penny argued. Acceptable — Sprint must surface this trade-off to Jo at V1.5 spec-kickoff (week 17). Not a finding; flagging for visibility.

### 9.7 V2.1 — Windows + macOS clean-VM bootstrap

V2.1 burndown week 33 lists "Windows + macOS clean-VM bootstrap green." That's three OS targets in week 33, but only the Linux runner is enumerated in Pipeline's V2.1 DevOps deliverable ("clean-VM CI runner (Linux + Windows + macOS)"). **F-MIN-6:** macOS CI in V2.1 requires GitHub-hosted macOS runners — expensive ($0.16/minute). Sprint should budget this with Penny inline.

---

## 10. Findings catalog

### Major findings (must close before Phase 6 PASS)

- **F-MAJ-1 — M1 Goal-4 BYOK lane not enumerated as M1 exit gate.** Add `tests/acceptance/goal-4-three-modes.spec.ts` BYOK lane to M1 exit gate (heap-scan assertion: BYOK key never persisted in plaintext on disk transiently — already in test-strategy §4). File: `sprint/milestone-M1.md` Exit-gate section. Owner: Sprint + Verify. Fix: insert one line before self-dogfood gate row.
- **F-MAJ-2 — M2 D4 deadline ambiguity.** D4 is listed as both "Hard deadline: M2 ticket-cut (week 7)" AND "Decisions that MUST land before milestone exit." But ticket-cut happens at start of week 7, not at M2 exit (week 9). Recommend clarifying: D4 lands at M2 **ticket-cut** (week 7); M2 **exit** then ships the chosen tier. Files: `sprint/milestone-M2.md` + `sprint/owner-matrix.md` §1.
- **F-MAJ-3 — M4 AT recordings test-file naming.** Rename `tests/a11y/at-recordings-fail-flow.test.md` → `tests/a11y/at-recordings/m4/signoff.md` with structured front-matter assertions. The `.test.md` suffix is misleading (Vitest/Playwright don't run Markdown). Files: `sprint/milestone-M4.md` Exit gate + Halo deliverable. Owner: Halo + Verify.
- **F-MAJ-4 — M0 realism dependency on parallel reconciliation.** R11 already captures the risk but the M0 milestone file should add a one-line note: "**Reconciliation work in week 1 MUST run in parallel across Atlas / Axiom / Shield / Cipher. Serial work does not fit the 2-week budget.**" Owner: Sprint. File: `sprint/milestone-M0.md` under Risks-specific R11.

### Minor findings (recommend close before M0)

- **F-MIN-1 — M0 Entry-prerequisites over-claims schema state.** Line 25 lists "all five schema files (audit-output, audit-event, audit-input, score_engine, score_engine.fixtures)." Currently only 4 of 5 exist at HEAD (`audit-input.v1.schema.json` and `score_engine.v1.md` are still M0 deliverables). Recommend rewording to "schema files audit-output.v1, audit-event.v1, score_engine.v1, score_engine.v1.fixtures present at M0-open; audit-input.v1 + score_engine.v1.md authored during M0 by Atlas." Owner: Sprint. File: `sprint/milestone-M0.md`.
- **F-MIN-2 — V2 pentest gate harmonization.** Add "0 Blocker" to V2 Firecracker pentest exit gate to match M3 form. File: `sprint/milestone-V2.md` line 98. Owner: Sprint.
- **F-MIN-3 — M0 sandbox-decision grep brittleness.** Replace the long literal grep with a structured `architecture/decisions.md` machine-readable section, e.g., a `<!-- decision-id: D8 -->` ↔ `<!-- decision-value: rootless-container-seccomp-egress-firecracker-v2 -->` pair, and have `tools/assert-decisions-locked.ts` consume it. Owner: Axiom. File: `architecture/decisions.md` + `sprint/milestone-M0.md` exit gate.
- **F-MIN-4 — Composite-owner inconsistencies.** ARCH-D9 lists "Shield + Cipher"; M2 DPA lists "Comply + Ledger." Pick a lead per Sprint Hard Rule §2: ARCH-D9 = Shield lead, Cipher supports; DPA = Comply lead, Ledger reviews. Owner: Sprint. Files: `sprint/owner-matrix.md` §1 + relevant milestone files.
- **F-MIN-5 — Pre-commit hooks not explicit in M0.** Add to M0 Forge "scaffold the Next.js 15 monorepo" line: "+ Husky pre-commit running lint, format, gitleaks, and schema validation." (Motionmax lesson-learned analog.) Owner: Forge. File: `sprint/milestone-M0.md`.
- **F-MIN-6 — V2.1 macOS CI budget surface.** Sprint should add a note in V2.1 with Penny estimate for macOS clean-VM CI minutes (GitHub-hosted macOS runners $0.16/min). Owner: Sprint + Penny. File: `sprint/milestone-V2-1.md`.

---

## 11. Phase-6 Jury exit gate (BUILD_FLOW.md)

Per `BUILD_FLOW.md` Phase 6 Jury Exit Gate (binary):

- [x] **Sprint verdict: every milestone has a binary exit gate (not "feature complete", not "looks good").** Confirmed — 91 binary gates across 9 milestones, zero vibes-grade.
- [x] **Every Blocker risk in PRD §19 has a mitigation owner + milestone.** Confirmed — Risk Coverage Table §4 above.
- [x] **Every still-open decision in PRD §17 has a deadline before the milestone it blocks.** Confirmed — D4 = M2 ticket-cut (Penny + Jo, default $29); D5 = V1.5 spec-kickoff (Penny + Jo, default flat $49). Both have Sprint-default fallback if Jo silent.

**Phase 6 exit gate: PASS WITH FIXES.** Three Major findings F-MAJ-1..4 must close before Build phase opens. Six Minor findings F-MIN-1..6 should close during M0 week 1 alongside Phase-5 reconciliation.

---

## 12. M0-go recommendation

**M0 is GO**, conditional on the following M0-week-1 fixes:

1. F-MAJ-1 (M1 Goal-4 BYOK lane added — affects M1 exit; can be applied to milestone-M1.md any time before M1 close, but easier to apply now)
2. F-MAJ-2 (D4 ticket-cut vs M2 exit ordering clarified in milestone-M2.md + owner-matrix.md)
3. F-MAJ-3 (M4 AT recordings naming + structured sign-off — affects M4 exit; can be applied any time before M4)
4. F-MAJ-4 (M0 realism note: parallel reconciliation across 4 agents)
5. F-MIN-1, F-MIN-5 (M0 milestone file hygiene — pre-commit hooks; schema entry-prereq honesty)
6. F-MIN-3 (Axiom restructures decisions.md to be machine-readable — should be done at M0 since the sandbox grep gate is M0)

F-MIN-2, F-MIN-4, F-MIN-6 are editorial and can close at any milestone close.

**Approved to proceed to Phase 9 (Build) at M0 once F-MAJ-1..4 + F-MIN-1, F-MIN-3, F-MIN-5 land.**

---

*Verify, 2026-05-11. Audit replays at every milestone close; Sprint's deliverables are re-audited against this file's findings catalog as remediation evidence.*
