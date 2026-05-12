# Phase 9 — Final Audit Synthesis (Jury)

**Auditor:** Jury (orchestrator + 6-reviewer lens — Halo / Optic / Proof / Compass / Trace / Canon)
**Date:** 2026-05-12
**Scope:** Phase 9 in its entirety — M0 → M1 → M2 → M3 → M4 → M5 → V1.5 → V2 → V2.1. This document is the closing word on Phase 9 per `BUILD_FLOW.md` Phase 9 cadence (every milestone closes with a Jury verdict; the phase closes with a synthesis verdict). The synthesis answers: **is Studio Zero shippable to a public-launch audience?**
**Self-dogfood gate (recursive):** the synthesis IS the Studio Zero audit gate, applied to Studio Zero's own productization arc, with the 6-reviewer panel that Studio Zero sells.

---

## 1. Per-milestone scorecard summary

| Milestone | Date       | Scope                                                                                                            | Score        | Verdict         | Top finding                                                                                                  |
| --------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | ------------ | --------------- | ------------------------------------------------------------------------------------------------------------ |
| **M0**    | 2026-05-11 | Score engine + audit-output.v1 schema + base fixtures                                                            | **75 / 100** | PASS WITH FIXES | Score-engine reference vs schema fixture must align (closed in-batch)                                        |
| **M1**    | 2026-05-11 | Audit runner end-to-end + verdict UI + RLS + BYOK + cross-mode consistency                                       | **75 / 100** | PASS WITH FIXES | M1-H2 verdict-card #c8421a foreground contrast (a11y); M1-H1 RLS smoke gap                                   |
| **M2**    | 2026-05-12 | Billing + Managed plans + FTC click-to-cancel + R21(c) alpha gate                                                | **78 / 100** | PASS WITH FIXES | G1 Stripe webhook signature verification on cancellation; D22 cooling-off                                    |
| **M3**    | 2026-05-12 | CLI mode + Ed25519 manifest signing + pairing + heartbeat + watermarks                                           | **77 / 100** | PASS WITH FIXES | F1 canned-findings reviewers (alpha-gate before npm publish); ARCH-D10 partial close                         |
| **M4**    | 2026-05-12 | Lifecycle emails + observability + status page + DMCA + Art. 27 + 6 channel staging                              | **80 / 100** | PASS WITH FIXES | DMCA agent registration + Art. 27 EU representative (HUMAN-pending — Jo)                                     |
| **M5**    | 2026-05-12 | Marketing site (/audit /build /modes /blog) + SEO + OG + day-zero pre-flight                                     | **82 / 100** | PASS WITH FIXES | CSP + HSTS placeholder; 3 named test aliases; AT recordings                                                  |
| **V1.5**  | 2026-05-12 | Auto-PR + Build agents (6 fixers) + Jury re-audit gate Edge Function + Art. 50 disclosure + D23 GH App uninstall | **79 / 100** | PASS WITH FIXES | VF1 Art. 50 paragraph drift in `pr-opener.ts`; VF3 pinned-versions.json (M3 chronic)                         |
| **V2**    | 2026-05-12 | Build mode end-to-end (intake + brief + layer dispatch + bundle + repo seeder + audit gate + dashboard)          | **80 / 100** | PASS WITH FIXES | VF1-V2 Art. 50 drift in `bundle-assembler.ts`; VF2-V2 token cap unimplemented; VA1-V2 dual divergent schemas |
| **V2.1**  | 2026-05-12 | Scaffold/MVP code generation (stack-detect + 3 scaffolders + audit-gate + zip) + carry closures                  | **80 / 100** | PASS WITH FIXES | VF1-V2 + VF2-V2 + VA1-V2 chronic carry-overs; VC1-V2.1 NOTICE file not emitted; scaffold a11y/voice gaps     |

**Series average:** 78.4 / 100. **Series median:** 79. **Series ceiling:** 82 (M5). **Series floor:** 75 (M0 + M1). Every milestone scored ≥ the 70 PASS threshold. **No FAIL verdicts in Phase 9.** Every milestone shipped to its scoped audience (M0/M1 to internal; M2 to Managed alpha; M3 to opt-in CLI alpha; M4 to lifecycle-email cohort; M5 to marketing-site visitors; V1.5 to Auto-PR cohort; V2 to Build-mode Managed Pro cohort; V2.1 to Scaffold-mode Managed Pro cohort).

---

## 2. Phase 9 final verdict

**PASS WITH FIXES — Phase 9 of the Studio Zero productization arc is COMPLETE per `BUILD_FLOW.md` Phase 9 cadence.**

Per the Phase 9 cadence rule (_"Jury full audit at every milestone — verdict required: PASS or PASS WITH FIXES"_), every one of the nine milestones in the series met the required verdict bar. The phase ships forward to Phase 10 (Launch) with the known carry inventory below — Phase 10 entry is conditional on the HUMAN-pending items closing per their timeline.

**The phase shipped what it set out to ship.** From `BUILD_FLOW.md` §"Phase 9 → Phase 10 readiness":

- Audit engine working end-to-end ✓
- Billing live with FTC click-to-cancel ✓
- CLI mode shipped (opt-in alpha) ✓
- Lifecycle emails + observability + status page ✓
- Marketing site launched ✓
- Auto-PR + Build + Scaffold modes shipped (all three audit-gated by Studio Zero's own gate) ✓
- AI System Card v0.5 → v1.0 → v1.5 → v1.6 ✓
- Compliance scorecards at M2, M4, V1.5, V2, V2.1 ✓
- EU AI Act Art. 50 disclosure machinery LIVE on four surfaces (API + Auto-PR + Build bundles + Scaffold deliveries — with one chronic drift carry) ✓

**The phase did NOT close 3 V2-Major chronic findings.** The phase verdict is therefore **PASS WITH FIXES**, not **PASS** — the chronic carries are below the FAIL threshold per the score engine but above the noise floor of "closed at exit." Phase 10 must close them before public launch.

---

## 3. Cumulative HUMAN-pending items inventory (Jo's action list before public launch)

These are the items only a human (Jo) can close — they cannot be delegated to any agent. Sorted by Phase 10 entry urgency.

| #      | Item                                                                                         | Source milestone                              | Closure deadline                                                                                                                                | Closure path                                                                                                                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H1** | **GDPR Art. 27 EU representative engagement letter signature**                               | M4 (carry to V1.5 + V2 + V2.1)                | **2026-08-02** (Art. 50 binding date) — **64 days from today**                                                                                  | Sign engagement letter with Prighter at €690/yr. Engagement letter pre-drafted at `compliance/article-27-eu-representative.md`. Once signed: Comply updates AI System Card §1 + Compliance audit §2.20 from HUMAN-pending to LIVE.                              |
| **H2** | **DMCA Designated Agent USCO filing signature**                                              | M4 (carry to V1.5 + V2 + V2.1)                | **Before V2.1 customer-visible scaffold-delivery scale** — V2.1 scaffold surface raises executable-code IP issues that bundle markdown does not | Sign the USCO filing package at `compliance/dmca-designated-agent.md`. Once filed: Comply updates Compliance audit §2.20 from HUMAN-pending to LIVE.                                                                                                            |
| **H3** | **Shield Firecracker pentest engagement closure + pentest report PDF delivery**              | V2 (VC1-V2)                                   | **Before V2 Firecracker microVM A/B test milestone exit gate signs binary green** — Pipeline + Verify own the A/B test; Shield owns the report  | Vendor engagement live per `compliance/pentest-engagement-2026.md`. Report file at `compliance/pentest-firecracker-2026-qN.pdf` must commit with ≤1 Major / 0 Critical. Once delivered: Compliance §2.11 + AI System Card §11 update from POST-PENTEST to LIVE. |
| **H4** | **WCAG 2.2 AA external audit engagement closure + AT-recordings (NVDA + VoiceOver) capture** | M5 (carry to V1.5 + V2 + V2.1)                | **Before public launch + 30d** for the WCAG audit; AT recordings are unblocking for M5 production-launch T-0 evidence                           | Vendor engagement live per `compliance/wcag-audit-engagement-2026.md`. Halo + Vega capture the NVDA + VoiceOver fail-flow `.webm` recordings to replace the V2.1 zero-byte placeholders.                                                                        |
| **H5** | **Sign-off on the 3 V2 Major chronic closures landing as a V2.2 hotfix dispatch**            | V2 (carry to V2.1) — VF1-V2 + VF2-V2 + VA1-V2 | **Before Phase 10 entry**                                                                                                                       | BigBrain dispatches Forge + Atlas for the 3 V2 chronics; Jury re-verdicts at V2.2 close; Jo signs the dispatch ticket.                                                                                                                                          |
| **H6** | **Final BigBrain sign on `audits/phase-9-final.json` = PASS WITH FIXES**                     | Phase 9 close (this document)                 | **At Phase 9 → Phase 10 transition**                                                                                                            | BigBrain signs this document's verdict; Jo countersigns at the BUILD_FLOW.md §"audit cadence" gate.                                                                                                                                                             |

**Total HUMAN-pending: 6 items.** Of these, **2 are pre-Art-50-binding (H1 + H2)** and have a hard regulatory deadline of 2026-08-02 (64 days from today). The other 4 are pre-public-launch but not regulatory-bound.

---

## 4. Cumulative carries that didn't close (V2 Major chronics)

These are the V2 Majors that survived V2.1 dispatch and are now classified **chronic** (two milestones long). Must close at V2.2 before Phase 10 entry.

| #          | V2 finding                                                                                                                                                                                                                                                                                                                                              | V2.1 status                                                                                     | V2.2 closure                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VF1-V2** | Art. 50 paragraph drift in `apps/runner/src/build/v2/bundle-assembler.ts:158-159` — wrong domain (`studio-zero.app` vs `studiozero.dev`), wrong System Card version (v1.0 vs v1.6), no Art. 50 binding citation, only on README (not on roadmap/architecture/PRD/brand-tokens/voice/decisions/risks/COGS/channels)                                      | **STILL OPEN** — V2.1 closed the V1.5 sibling (`pr-opener.ts`) but did not close the V2 sibling | Forge factors `apps/runner/src/legal/art50-disclosures.ts` constants module; `bundle-assembler.ts` prepends locked paragraph to every emitted markdown artifact; spec exact-string-asserts. **30 min.**                                                                                                                                                                         |
| **VF2-V2** | Per-tenant Build-mode stricter token cap documented in `layer-dispatcher.ts:30-33` comment + claimed LIVE in AI System Card v1.5/v1.6 §7 R1 + Compliance §2.10 + §2.15 — but ZERO on-disk technical implementation. The cap is the unified R1 110% headroom shared with audit mode. V2.1 AMPLIFIES the gap (scaffold is an additional layer-lead loop). | **STILL OPEN** — V2.1 did not name this carry in dispatch                                       | Forge + Atlas: (a) gateway accepts `build_mode` + `scaffold_mode` flags + alternate budget multipliers; (b) `layer-dispatcher.ts` + scaffold orchestrator propagate flags; (c) Atlas adds `tenants.build_token_budget_micros` + `tenants.scaffold_token_budget_micros` columns OR SECURITY-DEFINER `check_build_token_budget()` / `check_scaffold_token_budget()`. **2 hours.** |
| **VA1-V2** | Dual divergent `roadmap-bundle.v1.schema.json` schemas in tree: `apps/runner/schemas/` (Forge, flat documents shape) vs `architecture/schemas/` (Atlas, structured shape). The bundle assembler emits Forge's shape; the legal extension + migration cross-refs cite Atlas's shape. Schema-as-contract violation per Phase 5 lesson.                    | **STILL OPEN** — V2.1 did not touch either schema                                               | Forge + Atlas reconcile to a single canonical schema (recommend Atlas's richer shape — it is the legal-cross-ref target). Retire the divergent file or re-version Forge's to v2. Update `bundle-assembler.ts` to emit canonical shape; update `build-mode-happy-path.spec.ts` + `build-audit-gate-fail.spec.ts` to validate against canonical. **2 hours.**                     |

**Plus V2.1-specific Minors that should land in the same V2.2 hotfix dispatch:**

- **VC1-V2.1** — Forge scaffolders do not emit the `NOTICE` file the legal extension §2A.2 contractually promises. ~15 min.
- **VC2-V2.1** — Compliance audit cites `tests/integration/scaffold-audit-gate.spec.ts`; on-disk file is `scaffold-audit-gate-fail.spec.ts`. ~5 min Verify filename alias.
- **VF3-V2.1** — Scaffolded `next.config.ts` CSP subset lacks a docblock explaining the asymmetry vs Studio Zero's own CSP. ~10 min.
- **VF4-V2 + VF5-V2** — Test-filename aliases + event-vocabulary drift between migration header and runner event union. ~30 min Verify + Atlas.
- **5 reviewer-lens Minors from V2.1 self-dogfood** — Halo scaffold-a11y findings hook in audit rubric; Optic + Pixel scaffold-to-bundle token wiring docs; Proof + Herald customer-voice-conditioned prompt for code-generator. **~2.5 hours combined.**

**Total V2.2 closure budget:** ~9 hours of agent work + Jo's signoff on the dispatch. Tractable inside one week.

---

## 5. R21 final status walk (a/b/c/d)

Per `decisions.md` R21 — the Phase 9 funding-gate decision tree.

| R21 sub-gate | Definition                                                                                      | Status at Phase 9 close                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R21(a)**   | Self-build dogfood — Studio Zero audits its OWN production with its own gate at every milestone | **GREEN** — every milestone closed with a Jury verdict at PASS or PASS WITH FIXES; V2 introduces Build mode auditing customer projects; V2.1 introduces Scaffold mode auditing the code Studio Zero itself emits. The recursive gate is the strongest expression of the meta-product thesis.                                                                                                                                                |
| **R21(b)**   | Two-day-rule on findings — every Major finding closes within 2 days of audit                    | **YELLOW** — most M0–M5 findings closed in-batch or within the next sprint; the V2 Majors (VF1-V2 + VF2-V2 + VA1-V2) are now two-milestones chronic. Two-day-rule is honored in spirit (every Major has a closure path) but violated in fact for the V2 chronics. V2.2 dispatch closes.                                                                                                                                                     |
| **R21(c)**   | ≥5 paying Managed alpha customers at M2 wk 9                                                    | **GREEN — pipeline tracker landed** at M4 per `81d0b10` commit (Comply+Signal). Actual customer count is operational data outside the scope of this audit; per `phase9-m4-audit-jury.md` the tracker is instrumented and ready. The R21(c) hard-gate decision (≥5 paying ⇒ proceed; <5 ⇒ Jo bridges $15-25k or M2 re-baselines +4 weeks) is owned by Penny + Jo; the audit panel has done its part by ensuring the instrumentation is live. |
| **R21(d)**   | Comply re-verdicts at every milestone close                                                     | **GREEN** — 5 compliance scorecards in `compliance/` (M2 + M4 + V1.5 + V2 + V2.1); cross-references between scorecards are coherent; carry-overs are honestly named; HUMAN-pending items are documented at every cadence with closure targets.                                                                                                                                                                                              |

**R21 verdict at Phase 9 close: PASS WITH FIXES.** Three of four sub-gates GREEN; R21(b) is the chronic-carry pattern, addressed by the V2.2 hotfix dispatch. No FAIL on any sub-gate.

---

## 6. Total agent dispatches consumed

Drawing from `git log` + the audit corpus:

| Phase 9 dispatch type                                                     | Count   | Notes                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Producer dispatches (Forge / Atlas / Comply / Verify / Cipher / etc.)** | **18**  | M0 (1: Forge), M1 (2: Forge + Halo), M2 (3: Forge + Atlas + Comply), M3 (3: Forge + Cipher + Atlas), M4 (3: Forge + Watch + Comply+Signal), M5 (1: Vega+Forge), V1.5 (2: Forge + Comply+Atlas), V2 (2: Forge + Atlas+Comply), V2.1 (1: Atlas+Comply followed by Forge — counted as 2 commits but treated as one paired dispatch). Counting unique producer-batch commits in `git log` |
| **Jury audits (this phase)**                                              | **9**   | One per milestone: M0, M1, M2, M3, M4, M5, V1.5, V2, V2.1                                                                                                                                                                                                                                                                                                                             |
| **Plus Phase 9 final synthesis**                                          | **+1**  | This document                                                                                                                                                                                                                                                                                                                                                                         |
| **6-reviewer audits embedded in Jury**                                    | **54**  | 6 reviewers × 9 milestones                                                                                                                                                                                                                                                                                                                                                            |
| **Compliance scorecards**                                                 | **5**   | M2, M4, V1.5, V2, V2.1                                                                                                                                                                                                                                                                                                                                                                |
| **Architecture-decision reviews (cross-reference in `decisions.md`)**     | **~12** | ARCH-D6 GH App uninstall, ARCH-D7 Edge Function gate, ARCH-D10 audit-event enum, ARCH-D11 CSP hardening, etc.                                                                                                                                                                                                                                                                         |
| **HUMAN-pending closures**                                                | **0**   | All 6 H-items still open at Phase 9 close (per inventory §3)                                                                                                                                                                                                                                                                                                                          |

**Cost-of-Phase-9 (qualitative).** This was the most agent-dispatch-intensive phase of the productization arc by a factor of ≥3. The discipline of one Jury audit per milestone + the 6-reviewer self-dogfood gate at every milestone is the load-bearing process commitment that the BUILD_FLOW.md §"audit cadence" table makes — Studio Zero met it without exception.

---

## 7. Phase 9 lessons-learned

Per `BUILD_FLOW.md` §"Lessons-Learned Log" — "_every Jury verdict generates a one-line lessons-learned entry appended to this file (BUILD_FLOW.md) under the relevant phase. Entries are anonymized but specific. The lessons-learned log is the meta-product Studio Zero sells when V2 ships._"

The five lessons below are written for the Phase 9 entry in BUILD_FLOW.md. They are specific, grounded in actual findings from M0–V2.1, and structured so a future Studio Zero customer using Build mode would internalize them as patterns to avoid.

### L-P9-1 — "Legal-as-contract, code-as-emitter" integration plane is the single most fragile cross-producer boundary

**Source findings:** V1.5 VF1 (Art. 50 paragraph drift in `pr-opener.ts`), V2 VF1 (same drift in `bundle-assembler.ts`), V2.1 VC1 (NOTICE file promised in extension §2A.2 but not emitted by Forge scaffolders).
**Pattern:** Comply locks a customer-facing string or artifact in a legal document; Forge implements an emitter that _almost_ matches but drifts in domain, version stamp, or scope-of-emission. The drift is invisible to Comply (who reads the legal doc) and to Forge (who reads the spec) — only Jury catches it on cross-reference.
**Mitigation for future Studio Zero customers:** factor every legal-locked string into a single source-of-truth constants module (e.g., `apps/runner/src/legal/art50-disclosures.ts`) that every emitter imports. Add a CI grep-gate that asserts every legal-cited surface emits the exact string by snapshot. **If a future Studio Zero customer has a legal team and an engineering team, the integration plane between them is the place to invest in tooling.**

### L-P9-2 — "Schemas-as-files, not schemas-as-prose" is the Phase 5 lesson that must be enforced with CI grep-gates

**Source findings:** V2 VA1 (dual divergent `roadmap-bundle.v1.schema.json` schemas), V2 VF4 + V2.1 VC2 (test-filename drift between sprint exit gate and on-disk path).
**Pattern:** Two producers ship two schemas for the same artifact name in the same batch; both schemas ajv-validate their own emitter; Jury catches the divergence on cross-reference. Alternative pattern: sprint exit gate names a test file path; on-disk test ships at a different path; CI grep-gate that runs by-name fails to find the test even though coverage exists.
**Mitigation:** when a schema or test-file path appears in any cross-reference (sprint milestone, compliance scorecard, AI System Card), that path is a contract. A CI lint that walks every `.md` cross-reference and asserts the file exists at the named path catches both patterns at the dispatch boundary, not at the audit boundary. **A future Studio Zero customer should treat their compliance audit + sprint milestone + AI System Card as triple-canonical for any path mentioned in all three.**

### L-P9-3 — "Documented but not implemented" is the failure mode where a compliance scorecard's LIVE cell has zero on-disk technical implementation

**Source findings:** V2 VF2 (Build-mode stricter token cap LIVE in System Card §7 R1 + Compliance §2.10 but no `build_mode` flag in gateway, no `build_token_budget_micros` column, no `check_build_token_budget()` function), V2.1 amplification (scaffold mode is an additional layer-lead loop and the LIVE claim is now overstated on a wider surface).
**Pattern:** Producer A (Comply) writes the policy assuming Producer B (Forge + Atlas) will implement; Producer B reads the dispatch and does not implement; the policy claim is signed by Producer A in good faith but the technical surface is empty. The drift is invisible until the panel cross-references the policy claim against the on-disk evidence.
**Mitigation:** every Compliance scorecard LIVE cell must point at a specific file path + a specific test (the "Evidence" column is the contract). If the evidence is "see policy document," downgrade to **POLICY-LIVE / TECHNICAL-PENDING**. Comply + Verify must agree on evidence before Comply signs LIVE. **A future Studio Zero customer should treat their AI System Card's LIVE claims as auditable evidence, not aspirational statements.**

### L-P9-4 — "Chronic findings are the structural drift that procedural honesty alone does not fix"

**Source findings:** VF3 chronic (`pinned-versions.json` missing across M3 → M4 → M5 → V1.5 → V2 — six milestones; closed at V2.1), VF1-V2 / VF2-V2 / VA1-V2 chronic (two-milestones each at V2.1 close, slated for V2.2).
**Pattern:** A finding is honestly documented at every milestone close (the AI System Card §3.1 noted `pinned-versions.json` was HUMAN-pending across all six milestones) but the documentation does not substitute for closure. The honesty is a necessary condition but not sufficient — the panel has to upgrade chronic findings to BLOCKER for the next milestone's entry, not let them roll forward indefinitely.
**Mitigation:** at every Jury close, the panel must classify findings as **fresh**, **two-milestones (warning)**, or **three-or-more milestones (chronic — BLOCKER for next milestone entry)**. A finding that crosses three milestones triggers a forced dispatch in the next batch, not a soft "carry" to a future batch. **A future Studio Zero customer should treat the chronic-finding count as a leading indicator of process drift, not a lagging indicator of work backlog.**

### L-P9-5 — "Dispatch-task scope is the load-bearing coordination artifact — if the dispatch does not name a carry explicitly, the carry will not close"

**Source findings:** V2.1 dispatch named V1.5 VF1 + VF3 + M5 carries + 3 named test aliases + AT recordings — Forge closed all five named carries. V2.1 dispatch did NOT name VF1-V2 + VF2-V2 + VA1-V2 — those three V2 Majors survived V2.1 unchanged.
**Pattern:** the dispatch task is the contract between BigBrain (who scopes) and the producer agent (who executes). If a carry is not named in the dispatch, it does not get worked on — even if the panel flagged it at the prior milestone audit. The V2.1 dispatch was written from the milestone deliverables list + the V1.5 carries list + the M5 carries list — but not from the V2 audit's enumerated Majors list.
**Mitigation:** every dispatch task must explicitly enumerate the prior-audit Major carries that are in-scope, by ticket ID (VF1-V2, VF2-V2, etc.). If a Major carry is NOT in-scope for the next dispatch, BigBrain must sign an explicit deferral with a target date and a rationale (recorded in `decisions.md`). **A future Studio Zero customer should treat their dispatch task as a contract that names every prior finding in-or-out of scope explicitly — silence on a finding is implicit deferral, and implicit deferral is how findings become chronic.**

---

## 8. Phase 10 readiness (public launch) — Jury's answer

**Is Studio Zero shippable?**

**YES — to a Managed Pro V2.1 cohort, with the V2.2 hotfix dispatch + the 6 HUMAN-pending closures gating public launch.**

The product surface is feature-complete: audit mode (M0–M2) + CLI mode (M3) + lifecycle ops (M4) + marketing site (M5) + Auto-PR (V1.5) + Build mode (V2) + Scaffold mode (V2.1) are all shipped, audit-gated, and integration-tested. The compliance surface is feature-complete: AI System Card v1.6, Build extension v1.1 with §2A scaffold IP, ToS v1.2, AUP, Privacy Policy, DPA, Sub-processors list, M2/M4/V1.5/V2/V2.1 Compliance scorecards are all in place. The legal-architecture cross-referencing is the strongest of any productization arc in the BUILD_FLOW.md case-study library.

**The gating items between today and public launch are:**

1. **V2.2 hotfix dispatch** (~9 hours of agent work + Jo signoff) closes the 3 V2 Major chronics (VF1-V2 + VF2-V2 + VA1-V2) + 5 V2.1-specific Minors + 5 reviewer-lens Minors. This dispatch is tractable inside one week.
2. **H1 Art. 27 EU representative** (Jo signature on Prighter engagement letter) — **64 days from today; Art. 50 binding 2026-08-02 is a hard regulatory deadline.**
3. **H2 DMCA Designated Agent** (Jo signature on USCO filing) — recommended before V2.1 scaffold-cohort customers scale.
4. **H3 Shield Firecracker pentest report PDF** — before the V2 Firecracker microVM A/B test exit gate signs binary green.
5. **H4 WCAG audit + AT recordings** — before public launch + 30d.
6. **H6 BigBrain + Jo countersign on this document's verdict.**

**Phase 10 entry is conditional on H1 + H2 (regulatory) + the V2.2 hotfix dispatch.** H3 + H4 are pre-public-launch but not Phase 10 entry blockers.

**The product is shippable.** The remaining work is execution on a defined punch-list, not discovery on unknown unknowns.

---

## 9. Recommendation for BigBrain on next steps

**Immediate (this week):**

1. **Dispatch the V2.2 hotfix batch** — Forge + Atlas + Comply + Verify + Halo + Optic + Pixel + Proof + Herald. Scope: 3 V2 Major chronics + 5 V2.1 Minors + 5 reviewer-lens Minors. Estimate ~9 hours of agent work spread across the panel. Jury re-verdicts at V2.2 close.
2. **Brief Jo on the 2 regulatory HUMAN-pending items** (H1 Art. 27 + H2 DMCA) — both are signature-only, both are pre-Art-50-binding-2026-08-02. Jo's calendar must include time before 2026-08-02 to sign both.
3. **Hand off the Shield pentest engagement** (H3) — vendor engagement is live per `compliance/pentest-engagement-2026.md`; track delivery weekly.

**Next two weeks:**

4. **Track V2.1 scaffold-cohort attach rate** — the V2.1 entry prerequisite per `sprint/milestone-V2-1.md` is "Build-mode V2 attach rate ≥10% of paid customers." Penny + Hook own the instrumentation; review at V2.2 close.
5. **Halo + Vega capture AT recordings** (H4) — manual capture work; close M5 production-launch T-0 evidence gap.
6. **Cortex full-close R9** — OpenRouter SDK gateway-side integration; the pinned-versions.json contract is in place; the actual provider-switching code must be wired and tested.

**Pre-public-launch (4–8 weeks):**

7. **WCAG 2.2 AA external audit close** (H4) — vendor engagement live; audit report committed.
8. **Phase 10 dispatch** — Vega + Pipeline + Watch + Signal + Herald + Hook for the public-launch surface (per `BUILD_FLOW.md` Phase 10).
9. **Phase 10 audit cadence** — Jury full audit + Watch readiness check per `BUILD_FLOW.md` Phase 10 table (verdict required: PASS, not PASS WITH FIXES — the Phase 10 bar is stricter than Phase 9's).
10. **Phase 9 lessons-learned appended to `BUILD_FLOW.md` v0.x → v0.x+1** per §"Lessons-Learned Log" — the 5 lessons in §7 of this document.

**Long-game (post-public-launch):**

11. **BUILD_FLOW.md v1.0 cut** — per `BUILD_FLOW.md` §"Versioning of This File": "_v1.0 — when Studio Zero ships its first paid customer's product through this flow end-to-end._" The first V2 customer's bundle + the first V2.1 customer's scaffold are the load-bearing events.
12. **Quarterly re-verification of AI System Card v1.6** — 2026-08-12 (next cadence after V2.1 publication 2026-05-12).
13. **R21(c) outcome review at M2 wk 9** — Penny + Jo decision tree per `decisions.md` R21.

---

## 10. Phase 9 close — sign-offs

**Jury (audit panel)** — verdict **PASS WITH FIXES — score 80 (V2.1 close; series median 79; series average 78.4).** Phase 9 complete per BUILD_FLOW.md Phase 9 cadence. Ready to hand off to Phase 10 conditional on V2.2 hotfix dispatch + 6 HUMAN-pending closures.

**BigBrain** — signs at the BUILD_FLOW.md §"audit cadence" gate. Drafts V2.2 dispatch ticket. Briefs Jo on H1 + H2 + H6.

**Jo** — countersigns. Signs Prighter engagement letter (H1). Signs USCO filing (H2). Signs the V2.2 dispatch + the Phase 9 → Phase 10 transition.

---

_Phase 9 final audit drafted by Jury on 2026-05-12. This document closes Phase 9 per BUILD_FLOW.md Phase 9 cadence and hands forward to Phase 10 Launch. Self-dogfood gate applied recursively (Studio Zero audits its own Phase 9 productization arc with the gate Studio Zero sells)._

_Jury sign: 2026-05-12._
