# Studio Zero — V2.1 Compliance Audit Scorecard

**Version:** 1.0 (V2.1 exit-gate scorecard — Scaffold/MVP code generation launch)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**Scope:** V2.1 milestone exit gate. Verifies the live-or-not status of every compliance commitment Studio Zero has made through V2.1 per PRD §17 + EU AI Act Art. 50 (binding 2026-08-02) + California SB 942 + 16 CFR 425 (Click-to-Cancel) + GDPR Art. 17 / Art. 22 / Art. 27 + DMCA §512(c)(2) + state biometric laws (N/A) + state automated-decision-making laws + V2.1 Scaffold/MVP customer IP allocation (Build extension §2A — load-bearing customer-IP-ownership + audit-gate-hard-rule + production-readiness disclaim + customer-review obligation + 7-day rejection refund).
**Cross-references:** `compliance/v2-compliance-audit.md` (V2 predecessor scorecard), `compliance/v1-5-compliance-audit.md`, `compliance/m4-compliance-audit.md`, `compliance/m2-compliance-audit.md`, `sprint/milestone-V2-1.md` (V2.1 exit gate), `legal/ai-system-card-v1.6.md` (V2.1 — supersedes v1.5), `legal/build-mode-extension.md` v1.1 (V2.1 amendment — §2A scaffold IP + audit-gate hard rule), `legal/terms-of-service.md` v1.2 (incorporates the extension), `legal/aup.md`, `legal/pr-body-template.md`, `compliance/dmca-designated-agent.md`, `compliance/article-27-eu-representative.md`, `compliance/ai-act-art50-m1-verification.md`, `compliance/d22-cooling-off-flow.md`, `compliance/click-to-cancel-ux-audit.md`, `compliance/wcag-audit-engagement-2026.md`, `compliance/security-policy.md`, `architecture/database/migrations/0008_auto_pr_v1_5.sql`, `architecture/database/migrations/0009_build_mode_v2.sql`, `architecture/database/migrations/0010_scaffold_v2_1.sql` (V2.1 — this batch)

> **V2.1 exit verdict: PASS WITH HUMAN-PENDING.** Twenty-one controls scored (eighteen LIVE — twelve carried from V2 + six NEW V2.1; one RE-VERIFIED carry-over from V2; two HUMAN-PENDING carry-overs — DMCA agent registration + Art. 27 EU representative; both unchanged from prior scorecards). V2.1-specific controls all LIVE: Build extension §2A — scaffold customer-IP-ownership clause (V2.1 amendment); scaffold audit-gate hard rule (delivery refused on FAIL — DB-enforced); scaffold production-readiness disclaim; scaffold customer-review obligation (third human-oversight gate); 7-day customer-rejection refund window; scaffold-audit-gate DB-enforced predicate (`scaffold_jobs_delivered_verdict_required` CHECK + `scaffold_jobs_audit_gate_update` RLS in migration 0010); per-scaffold NOTICE Art. 50 disclosure file (extends bundle disclosure to executable code); scaffold-mode amplification of R1 LLM cost mitigation; clean-VM bootstrap test + offline-mode network-tap test (both LIVE per `sprint/milestone-V2-1.md`); AI System Card v1.6 published.

---

## 1. Scorecard summary (V2.1 exit gate)

| Control                                                                                           | LIVE at V2.1?               | Evidence                                                                                                                                                                                                                                                                                                                                                                                             | Audit doc                                                                                                                               | Hard blocker for V2.1 ship?                                         |
| ------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **1. AI System Card v1.6**                                                                        | **LIVE**                    | `legal/ai-system-card-v1.6.md` (this batch); supersedes v1.5; published at `/system-card`; quarterly re-verification scheduled 2026-08-12                                                                                                                                                                                                                                                            | This file §2.1 + `legal/ai-system-card-v1.6.md`                                                                                         | YES                                                                 |
| **2. Build extension v1.1 §2A — scaffold IP + audit-gate hard rule (V2.1 amendment)**             | **LIVE**                    | `legal/build-mode-extension.md` v1.1 (this batch); §2A inserts under §2 (output ownership) to preserve existing cross-references; load-bearing scaffold customer-IP-ownership clause in §2A.1; audit-gate hard rule in §2A.3; production-readiness disclaim in §2A.4; customer-review obligation in §2A.5; 7-day rejection refund in §2A.7                                                           | This file §2.2 + `legal/build-mode-extension.md` §2A                                                                                    | YES                                                                 |
| **3. Scaffold customer-IP ownership (extension §2A.1)**                                           | **LIVE — UNAMBIGUOUS**      | Extension §2A.1: "the working scaffold/MVP code we generate for you is your property" — covers source files, configs, package manifests, tests, README. §2.1 assignment clause extends to scaffold per §2A.1. §2.2 "rubric vs output" distinction extends per §2A.1. Identical IP posture to V2 bundle.                                                                                              | This file §2.3 + `legal/build-mode-extension.md` §2A.1                                                                                  | YES                                                                 |
| **4. Scaffold audit-gate hard rule (extension §2A.3) — delivery refused on FAIL**                 | **LIVE — DEFENSE IN DEPTH** | Extension §2A.3 plain-English clause: "Studio Zero will not deliver generated scaffold/MVP code that fails its own audit gate." DB-enforced via `architecture/database/migrations/0010_scaffold_v2_1.sql` §C `scaffold_jobs_delivered_verdict_required` CHECK + §D `scaffold_jobs_audit_gate_update` RLS predicate. Negative test green per V2.1 exit gate.                                          | This file §2.4 + `0010_scaffold_v2_1.sql` §C + §D                                                                                       | YES                                                                 |
| **5. Scaffold production-readiness disclaim (extension §2A.4)**                                   | **LIVE**                    | Extension §2A.4 explicitly disclaims: gate is not a security pentest, not a legal opinion, not a guarantee of absence of bugs, not a guarantee of compilability on customer's specific environment. Mirrored in AI System Card v1.6 §2.4 + §7 R-V2.1-3 risk row.                                                                                                                                     | This file §2.5 + `legal/build-mode-extension.md` §2A.4                                                                                  | YES                                                                 |
| **6. Scaffold customer-review obligation (extension §2A.5 — third human-oversight gate)**         | **LIVE**                    | Extension §2A.5 names the obligation in plain language: customer reviews dependency manifest, env-var footprint, auth/authz posture, and test suite before deploying. AI System Card v1.6 §8 documents this as the V2.1 NEW human-oversight gate (third Build-mode gate after brief confirmation + bundle review).                                                                                   | This file §2.6 + `legal/build-mode-extension.md` §2A.5 + `legal/ai-system-card-v1.6.md` §8                                              | YES                                                                 |
| **7. Scaffold 7-day customer-rejection refund (extension §2A.7)**                                 | **LIVE**                    | Extension §2A.7: full refund if audit gate fails OR customer rejects within 7 days of delivery. Captured to `scaffold_jobs.refunded_at`; ledgered under `scaffold_refunded` audit_action (migration 0010 §B). Regional refund matrix unchanged per `finance/refund-matrix.md`. In addition to non-waivable EU/UK 14-day cooling-off rights.                                                          | This file §2.7 + `legal/build-mode-extension.md` §2A.7                                                                                  | YES                                                                 |
| **8. Scaffold audit-gate-blocks-delivery DB-enforced predicate**                                  | **LIVE — DEFENSE IN DEPTH** | `0010_scaffold_v2_1.sql` §C `scaffold_jobs_delivered_verdict_required` CHECK + §D `scaffold_jobs_audit_gate_update` RLS (only scaffold-audit-gate Edge Function may transition state to `audit_passed`/`audit_failed`); negative test green per V2.1 exit gate `tests/integration/scaffold-audit-gate.spec.ts`                                                                                       | This file §2.8 + `0010_scaffold_v2_1.sql` §C + §D                                                                                       | YES                                                                 |
| **9. Per-scaffold Art. 50 NOTICE disclosure file (extends bundle disclosure to executable code)** | **LIVE**                    | AI System Card v1.6 §8 NEW V2.1: every delivered scaffold zip ships with top-level `NOTICE` file carrying the locked-verbatim Art. 50 disclosure paragraph. Seeded-repo Git history carries `AI-Authored: studio-zero/runner@v<x.y.z>` commit trailer. Build extension §2A.2 governs.                                                                                                                | This file §2.9 + `legal/ai-system-card-v1.6.md` §8 + `legal/build-mode-extension.md` §2A.2                                              | YES                                                                 |
| **10. R-V2.1-1: Undisclosed third-party dependencies mitigation (audit-gate license review)**     | **LIVE**                    | AI System Card v1.6 §7 R-V2.1-1 row: scaffold-audit-gate dependency-license review (Forge + Jury — added as self-dogfood gate item per V2.1 milestone); `decisions` + `risks` bundle components surface manifest with license summary; Build extension §2A.4 disclaim (not a license certification) + §2A.5 customer-review obligation.                                                              | This file §2.10 + `legal/ai-system-card-v1.6.md` §7                                                                                     | YES                                                                 |
| **11. R-V2.1-2: Similar-to-public-references in scaffold code (extension §2A.10 extends §4)**     | **LIVE**                    | AI System Card v1.6 §7 R-V2.1-2 row; Build extension §2A.10 explicitly extends §4 similarity disclosure to scaffold code; customer responsibility for verification; dispute path open per §4.3 with Comply triage; similarity dispute rate metric in System Card v1.6 §9 covers scaffold via the V2 row.                                                                                             | This file §2.11 + `legal/build-mode-extension.md` §2A.10                                                                                | YES                                                                 |
| **12. R-V2.1-3: Production-readiness expectation mismatch mitigation**                            | **LIVE**                    | AI System Card v1.6 §7 R-V2.1-3 row; Build extension §2A.4 production-readiness disclaim + §2A.5 customer-review obligation; disclaim travels with code via §2A.2 NOTICE file.                                                                                                                                                                                                                       | This file §2.12 + `legal/build-mode-extension.md` §2A.4 + §2A.5                                                                         | YES                                                                 |
| **13. Clean-VM bootstrap test (V2.1 exit gate)**                                                  | **LIVE**                    | `sprint/milestone-V2-1.md` exit gate; `tests/e2e/v2.1-clean-vm-bootstrap.spec.ts` on fresh Ubuntu/Windows VM; <30 min target; Pipeline + Verify own. Customer-cohort metric in System Card v1.6 §9 NEW V2.1: scaffold clean-VM bootstrap success rate target ≥90%, measured at V2.1+30d.                                                                                                             | This file §2.13 + `sprint/milestone-V2-1.md` exit gate                                                                                  | YES                                                                 |
| **14. Offline-mode network-tap test (V2.1 exit gate)**                                            | **LIVE**                    | `sprint/milestone-V2-1.md` exit gate; `tests/security/v2.1-offline-network-tap.spec.ts`; scaffold generation runs offline; tap captures zero outbound HTTP. Cipher + Verify own. Generation-time safety check (not a delivered-code pentest — see Build extension §2A.4).                                                                                                                            | This file §2.14 + `sprint/milestone-V2-1.md` exit gate                                                                                  | YES                                                                 |
| **15. LLM cost amplification mitigation scaled for Scaffold (R1 + V2 extension)**                 | **LIVE**                    | AI System Card v1.6 §7 R1 row updated: scaffold generation is an additional layer-lead loop on top of V2 bundle generation. Same `check_token_budget()` 110% headroom hard-cap from `0003_billing_managed.sql` applies; scaffold paused at headroom breach (Build extension §7 policy extends).                                                                                                      | This file §2.15 + `legal/build-mode-extension.md` §7 + `legal/ai-system-card-v1.6.md` §7                                                | YES                                                                 |
| **16. EU AI Act Art. 50 disclosure machinery (extends to scaffold)**                              | **LIVE — RE-VERIFIED**      | M0/M1 machinery still LIVE (header + meta); V1.5 Auto-PR Art. 50 paragraph + commit trailer still LIVE; V2 bundle per-artifact disclosure still LIVE; **V2.1 NEW: per-scaffold NOTICE disclosure file + AI-Authored commit trailer in seeded-repo Git history.** Coverage spans four surfaces.                                                                                                       | `compliance/ai-act-art50-m1-verification.md` + this file §2.16                                                                          | NO (re-verification)                                                |
| **17. V2 controls (carry-over)**                                                                  | **LIVE — RE-VERIFIED**      | All twelve V2 LIVE controls scored in `compliance/v2-compliance-audit.md` §1 re-verified at V2.1 with no regressions: System Card (now v1.6 supersedes v1.5); Build extension (now v1.1 supersedes v1.0); customer IP; similarity; audit-gate-is-opinion; pricing; two-gate oversight; DB-enforced audit-gate; per-bundle Art. 50; LLM cost amplification; Firecracker microVM; second LLM provider. | `compliance/v2-compliance-audit.md` + this file §2.17                                                                                   | NO (re-verification)                                                |
| **18. Auto-PR controls (V1.5 carry-over)**                                                        | **LIVE — RE-VERIFIED**      | All eight V1.5 Auto-PR controls scored in `compliance/v1-5-compliance-audit.md` §1 re-verified at V2.1 with no regressions. V2.1 cohort regression test `tests/regression/v1-5-controls.spec.ts` green.                                                                                                                                                                                              | `compliance/v1-5-compliance-audit.md` + this file §2.18                                                                                 | NO (re-verification)                                                |
| **19. State biometric laws (BIPA + analogues) + EU AI Act biometric-ID**                          | **N/A**                     | Studio Zero does not process biometric data; AUP forbids; Build extension §3 customer warranty (extended by §2A.9 to scaffold submissions) prohibits submitting biometric-ID product ideas.                                                                                                                                                                                                          | This file §2.19                                                                                                                         | N/A                                                                 |
| **20. DMCA Designated Agent (USCO) + GDPR Art. 27 EU representative**                             | **HUMAN-PENDING (carried)** | Both filing packages LIVE since M4; Jo's signatures still outstanding; carried from V2 + V1.5 + M4 scorecards. Closure target re-set to pre-V2.1-close-Plus-30d (DMCA agent before V2.1 scaffold-IP issues can scale; Art. 27 rep before Art. 50 binding 2026-08-02).                                                                                                                                | `compliance/m4-compliance-audit.md` §2.5 + §2.6; `compliance/v1-5-compliance-audit.md` §2.12; `compliance/v2-compliance-audit.md` §2.16 | YES (M5 launch + Art. 50 binding artifacts; not V2.1-ship-blocking) |
| **21. Self-dogfood gate V2.1 (`audits/v2_1.json`)**                                               | **LIVE — Jury owns**        | `sprint/milestone-V2-1.md` exit gate: `audits/v2_1.json` = PASS or PASS WITH FIXES. Jury owns; Comply re-verifies at quarterly cadence. Negative-test pattern from V2 carries forward.                                                                                                                                                                                                               | This file §2.21 + `sprint/milestone-V2-1.md` exit gate                                                                                  | YES                                                                 |

---

## 2. Per-control verification

### 2.1 AI System Card v1.6 — LIVE

**Status:** LIVE at V2.1 Batch 1 (this commit).

**Evidence:**

- File exists: `legal/ai-system-card-v1.6.md` v1.6, 2026-05-12.
- Public route: `https://studiozero.dev/system-card` renders the current version (highest-numbered version file in `legal/`).
- Supersedes v1.5 at `legal/ai-system-card-v1.5.md` (kept in repo as version history; v1.0, v0.5, v0.1 also retained).
- V2.1 additions: §2 capabilities + intended-purpose extended (scaffold flipped from "planned" to "LIVE"); §5 capabilities table adds three NEW V2.1 rows; §7 risk register adds three NEW V2.1 rows (R-V2.1-1 undisclosed dependencies, R-V2.1-2 similar-to-public-references in code, R-V2.1-3 production-readiness expectation mismatch); §8 human-oversight commitments add the V2.1 third gate (scaffold-before-deploy) + per-scaffold NOTICE disclosure; §9 performance metrics add four NEW V2.1 rows; §10 data governance covers `scaffold_jobs` + 24h signed-URL TTL + 7-day rejection window; §11 quality management adds scaffold-audit-gate + clean-VM bootstrap test + offline-network-tap test to milestone cadence.
- Honest gaps documented: `runner/llm/pinned-versions.json` (Forge HUMAN-pending) and Art. 27 EU representative (Jo HUMAN-pending) — both carry-overs from v1.5 + v1.0 with the same closure timeline.

**Audit conclusion:** **LIVE.** Comply signs v1.6.

### 2.2 Build extension v1.1 §2A — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- File exists: `legal/build-mode-extension.md` v1.1, 2026-05-12.
- §2A inserted between §2 and §3 (numbered §2A specifically to preserve existing cross-references from System Card v1.5/v1.6 and the V2 compliance audit — renumbering downstream sections would cascade-break every §3/§4/§5/§6/§8/§10/§12 reference).
- §2A subsections: §2A.1 scaffold IP, §2A.2 AI-authored disclosure, §2A.3 audit-gate hard rule, §2A.4 production-readiness disclaim, §2A.5 customer-review obligation, §2A.6 license + liability cap, §2A.7 7-day rejection refund, §2A.8 scaffold pricing (same as V2), §2A.9 customer warranties (§3 extends), §2A.10 similarity disclosure (§4 extends).
- Closing line records the v1.0 → v1.1 transition + Penny pricing review cadence carries.

**Audit conclusion:** **LIVE.** Comply locks the v1.1 extension; cross-referenced from ToS §2.5 (no ToS change needed because the extension was already incorporated by reference at v1.0).

### 2.3 Scaffold customer-IP ownership (extension §2A.1) — LIVE — UNAMBIGUOUS

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- Extension §2A.1 first paragraph: "the working scaffold/MVP code we generate for you is your property" — load-bearing sentence; sets the unambiguous customer-IP-ownership posture.
- §2A.1 explicitly enumerates the deliverables the customer owns: every source file, every configuration file, every package manifest, every test, every README in the scaffold zip.
- §2A.1 explicitly extends §2.1 assignment clause and §2.2 rubric-retention distinction and §2.3 license-back to scaffold without modification.
- Identical IP posture to V2 bundle (control #3 in V2 scorecard).

**Audit conclusion:** **LIVE — UNAMBIGUOUS.** The customer-IP-ownership clause for scaffold mirrors the V2 bundle clause; no carve-outs; any future amendment requires a v1.2 re-version of the extension with 30-day customer notice.

### 2.4 Scaffold audit-gate hard rule (extension §2A.3) — LIVE — DEFENSE IN DEPTH

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- Extension §2A.3 plain-English clause: "Studio Zero will not deliver generated scaffold/MVP code that fails its own audit gate."
- **DB-enforced #1 (CHECK):** `architecture/database/migrations/0010_scaffold_v2_1.sql` §C `scaffold_jobs_delivered_verdict_required` CHECK constraint:
  ```sql
  CHECK (state <> 'delivered' OR (
    audit_verdict IN ('PASS','PASS WITH FIXES')
    AND delivered_at IS NOT NULL
    AND generated_artifact_id IS NOT NULL
  ))
  ```
  A FAIL verdict can NEVER reach delivered state — the DB rejects the transition. Tightened beyond V2's `builds_delivered_verdict_required` by also requiring `generated_artifact_id IS NOT NULL` (defense against ghost-delivery rows pointing at a missing artifact).
- **DB-enforced #2 (RLS):** §D `scaffold_jobs_audit_gate_update` RLS policy: only the scaffold-audit-gate Edge Function (JWT iss='supabase-edge-functions', role='scaffold_gate') may transition `scaffold_jobs.state` to `audit_passed` or `audit_failed`. Runner JWT cannot. Member JWTs cannot. DB rejects unauthorized callers.
- **Test coverage:** `tests/integration/scaffold-audit-gate.spec.ts` (V2.1 exit-gate test): submit a scaffold job with seeded FAIL verdict → assert delivery refused, assert `scaffold_jobs.state='audit_failed'`, assert `audit_action='scaffold_audit_failed'` ledger row written, assert refund mechanic fires.
- Pattern mirrors V1.5 ARCH-D7 Auto-PR jury-reaudit-gate Edge Function and V2 `builds_audit_gate_update` policy — Atlas + Forge tested at V1.5 and V2; V2.1 applies to scaffold layer.

**Audit conclusion:** **LIVE — DEFENSE IN DEPTH.** DB rejects unsafe transitions even if app code is buggy. V2.1 exit-gate negative test (`tests/integration/scaffold-audit-gate.spec.ts`) is the regression guard.

### 2.5 Scaffold production-readiness disclaim (extension §2A.4) — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- Extension §2A.4 explicitly disclaims: gate is not a security pentest, not a legal opinion, not a guarantee of absence of bugs, not a guarantee of compilability on the customer's specific environment.
- Mirrored in AI System Card v1.6 §2.4 (Out-of-scope as a deliverable — NEW V2.1 row added: "Not a production-readiness certification") + §7 R-V2.1-3 risk row.
- The disclaim travels with the code via §2A.2 (the NOTICE file's locked-verbatim disclosure paragraph names the gate as "Reviewed by the Studio Zero audit gate before delivery; customer reviews before publication" — production-readiness is not in that sentence by design).

**Audit conclusion:** **LIVE.** Plain-English disclaim; structural extension into the code itself (NOTICE file); risk register row documents the mitigation chain. Comply signs.

### 2.6 Scaffold customer-review obligation (extension §2A.5 — third human-oversight gate) — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- Extension §2A.5 names the obligation in plain language: customer reviews dependency manifest, env-var footprint, auth/authz posture, and test suite before deploying.
- AI System Card v1.6 §8 documents this as the V2.1 NEW human-oversight gate — the THIRD Build-mode gate after (1) brief confirmation and (2) bundle review. The audit gate is the structural defense; the customer is the human oversight gate before deployment.
- Deliberately no machine-checked "customer reviewed" tick (would degrade into rubber-stamping). The plain-English obligation in the extension is the contract.

**Audit conclusion:** **LIVE.** GDPR Art. 22 satisfied: scaffold delivery is **not** a fully-automated decision affecting a data subject — the customer has three meaningful review gates (brief, bundle, scaffold-before-deploy). Comply signs.

### 2.7 Scaffold 7-day customer-rejection refund (extension §2A.7) — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- Extension §2A.7: full refund if audit gate fails OR customer rejects within 7 days of `scaffold_jobs.delivered_at`. Captured to `scaffold_jobs.refunded_at`; ledgered under `scaffold_refunded` audit_action (migration 0010 §B).
- Regional refund matrix unchanged per `finance/refund-matrix.md` — same channels as Build mode refunds at V2.
- Audit-gate FAIL refund is **automatic** (no dispute flow required); customer-rejection refund within 7 days is filed via in-app dispute flow or `comply@studiozero.dev` (Comply triage within 5 business days).
- 7-day window is **in addition to** (not in lieu of) non-waivable cooling-off rights — EU/UK 14-day right with D22 fresh-window-per-upgrade applies wherever wider, per `compliance/d22-cooling-off-flow.md`.
- Refunds beyond 7-day window for delivered scaffolds with passing audit gate fall back to §4.3 (case-by-case Comply review) and base ToS §14.

**Audit conclusion:** **LIVE.** Refund mechanic is comprehensive (automatic on FAIL; 7-day discretionary rejection window; non-waivable cooling-off preserved). Comply signs.

### 2.8 Scaffold audit-gate-blocks-delivery DB-enforced predicate — LIVE — DEFENSE IN DEPTH

**Status:** LIVE at V2.1 Batch 1.

**Evidence:** See control #4 (this is the technical-companion control to the legal §2A.3 hard rule). The DB-side enforcement is the regression guard for the customer-facing audit-gate hard rule.

**Audit conclusion:** **LIVE — DEFENSE IN DEPTH.**

### 2.9 Per-scaffold Art. 50 NOTICE disclosure file — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- AI System Card v1.6 §8 documents: every delivered scaffold zip ships with a top-level `NOTICE` file carrying the locked-verbatim disclosure paragraph "This document was generated by Studio Zero v1.5+ from a customer-confirmed brief. AI-generated content (Art. 50 EU AI Act 2024/1689). Reviewed by the Studio Zero audit gate before delivery; customer reviews before publication."
- Seeded-repo Git history (where scaffold is delivered as commits rather than zip): every generated commit carries `AI-Authored: studio-zero/runner@v<x.y.z>` in the commit message.
- Build extension §2A.2 governs the disclosure obligation.
- Forge implementation: scaffold packager emits NOTICE at the top of the zip; Git-history packager emits the commit trailer; Verify exit-gate test snapshots the NOTICE on a sample scaffold.
- Coverage extends Art. 50 disclosure to a fourth surface: API responses (header + meta) + Auto-PR (PR body + commit trailer) + Build mode bundles (per-artifact paragraph) + Scaffold mode deliveries (NOTICE + commit trailer).

**Audit conclusion:** **LIVE.** Art. 50 conformance extends to the V2.1 executable-code surface.

### 2.10 R-V2.1-1: Undisclosed third-party dependencies mitigation — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- AI System Card v1.6 §7 R-V2.1-1 risk row: "AI-generated code may contain undisclosed third-party dependencies."
- Mitigation chain:
  1. **Scaffold-audit-gate runs a dependency-license review** as part of the audit rubric (Forge + Jury — added as a self-dogfood gate item per V2.1 milestone exit gate `audits/v2_1.json`).
  2. **Bundle's `decisions` + `risks` components surface the dependency manifest** with a license summary — the customer sees the manifest with license posture before deploying.
  3. **Build extension §2A.4 disclaims the gate as a quality screen** (not a license-compliance certification).
  4. **Build extension §2A.5 obligates customer-side review** of the dependency manifest before running `npm install` / `pnpm install` / `pip install`.

**Audit conclusion:** **LIVE.** Mitigation chain is explicit, audit-trail-backed (audit gate findings persist to the audit run row), and the customer is named as the final reviewer.

### 2.11 R-V2.1-2: Similar-to-public-references in scaffold code — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- AI System Card v1.6 §7 R-V2.1-2 risk row: generated scaffold code may bear stylistic, structural, or substantive similarity to publicly available code (the Anthropic Claude foundation model was trained on public software).
- **Build extension §2A.10 explicitly extends §4** (similarity, plagiarism, attribution) to scaffold code in plain language. Customer is responsible for verifying that the scaffold does not infringe specific third-party IP, trademark, or license before publishing, deploying, or building against it.
- Studio Zero does not run a similarity search against public repositories before delivery — this is honest documentation, not a technical mitigation.
- Dispute path: same as bundle similarity disputes per §4.3 with Comply case-by-case refund.
- Performance metric: System Card v1.6 §9 retains the V2 row "Build mode similarity dispute rate" (target < 5%, measured at V2+30d) which covers scaffold similarity disputes via the shared metric — Comply will surface a separate scaffold-only rate at V2.1+30d if customer-cohort signal suggests divergence.

**Audit conclusion:** **LIVE.** Plain-English disclosure; customer responsibility clearly named; dispute path open. Same honest-not-technical posture as the V2 bundle similarity disclaim.

### 2.12 R-V2.1-3: Production-readiness expectation mismatch mitigation — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:** See control #5 (production-readiness disclaim — extension §2A.4) and control #6 (customer-review obligation — extension §2A.5). R-V2.1-3 is mitigated by the combination of (a) the disclaim that the gate is not a production-readiness certification, (b) the customer-review obligation that puts the production-readiness gate on the customer, and (c) the disclaim's persistence via the per-scaffold NOTICE file (§2A.2) so the disclaim travels with the code into the customer's environment.

**Audit conclusion:** **LIVE.** Three-layer mitigation chain (disclaim + obligation + traveling-with-code). Comply signs.

### 2.13 Clean-VM bootstrap test (V2.1 exit gate) — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- `sprint/milestone-V2-1.md` exit gate: clean-VM bootstrap of a generated scaffold completes in <30 min on a fresh Ubuntu/Windows VM.
- `tests/e2e/v2.1-clean-vm-bootstrap.spec.ts` — Pipeline owns the clean-VM CI runner (Linux + Windows + macOS per V2.1 milestone burndown); Verify owns the spec.
- Customer-cohort metric in System Card v1.6 §9 NEW V2.1 row: "Scaffold clean-VM bootstrap success rate" — target ≥90%, measured at V2.1+30d.
- A sub-target rate signals template-catalog stack-drift; Pipeline + Forge own the response runbook (`operations/scaffold-fail-runbook.md` per V2.1 milestone decisions row).

**Audit conclusion:** **LIVE.** V2.1 exit gate satisfied.

### 2.14 Offline-mode network-tap test (V2.1 exit gate) — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- `sprint/milestone-V2-1.md` exit gate: offline-mode network-tap proves no code POSTed externally.
- `tests/security/v2.1-offline-network-tap.spec.ts` — Cipher + Verify own. Scaffold runs offline; tap captures zero outbound HTTP.
- This is a **generation-time safety check** (the scaffold generator does not POST customer code externally during generation) — explicitly NOT a delivered-code pentest. Build extension §2A.4 governs the distinction.
- Mitigates R-V2.1 "Scaffold leaks customer code to external service during generation" per `sprint/milestone-V2-1.md` risk row.

**Audit conclusion:** **LIVE.** V2.1 exit gate satisfied. The Critical-impact / Low-likelihood risk row from `sprint/milestone-V2-1.md` is mitigated by the gate.

### 2.15 LLM cost amplification mitigation scaled for Scaffold — LIVE

**Status:** LIVE at V2.1 Batch 1.

**Evidence:**

- AI System Card v1.6 §7 R1 row updated to note scaffold generation adds an additional layer-lead loop on top of V2 bundle generation.
- Same `check_token_budget()` 110% headroom hard-cap from `0003_billing_managed.sql` applies to scaffold dispatch.
- Build extension §7 policy extends: scaffold paused at headroom breach; customer notified; Comply triages credit-vs-revise.
- Penny will refine the unit economics for scaffold-tier after the first V2.1 cohort per `sprint/milestone-V2-1.md` (Penny deliverable: "Scaffold-tier unit economics (V2.1 is high-cost-to-generate; price accordingly)"). Any pricing update requires v1.2 re-version of the extension.

**Audit conclusion:** **LIVE.** R1 mitigation scaled correctly for Scaffold's additional amplification. No new technical surface — reuses the M2 mechanic.

### 2.16 EU AI Act Art. 50 disclosure machinery — LIVE — RE-VERIFIED

**Status:** LIVE — RE-VERIFIED at V2.1.

**Evidence:**

- M0/M1 machinery still LIVE: `X-AI-Generated: studio-zero` HTTP header + `<meta name="ai-generated" content="studio-zero">` on every emitted HTML page (`apps/web/lib/ai-disclosure.ts` + `apps/web/next.config.ts`).
- V1.5 Auto-PR Art. 50 paragraph + AI-Authored commit trailer still LIVE.
- V2 bundle per-artifact Art. 50 disclosure paragraph still LIVE.
- **V2.1 expansion:** per-scaffold NOTICE file + seeded-repo commit trailer extend Art. 50 coverage to the executable-code surface (control #9).
- `tests/integration/disclosure-headers.spec.ts` green at V2.1.

**Audit conclusion:** **LIVE — RE-VERIFIED.** Art. 50 disclosure machinery now covers four surfaces: API responses, Auto-PR, Build mode bundles, Scaffold mode deliveries.

### 2.17 V2 controls (carry-over) — LIVE — RE-VERIFIED

**Status:** LIVE — RE-VERIFIED at V2.1.

**Evidence:**

- All twelve V2 LIVE controls scored in `compliance/v2-compliance-audit.md` §1 re-verified at V2.1 with no regressions:
  1. AI System Card (now v1.6 supersedes v1.5; v1.5 preserved in repo);
  2. Build extension (now v1.1 supersedes v1.0; v1.0 supersedure recorded in extension footer);
  3. Build customer-IP ownership (LIVE — extended by §2A.1 to scaffold);
  4. Build similarity disclaimer (LIVE — extended by §2A.10 to scaffold);
  5. Build audit-gate-is-opinion disclaimer (LIVE — extended by §2A.4 to scaffold production-readiness);
  6. Build pricing (LIVE — §2A.8 confirms scaffold does not add a separate line item at V2.1);
  7. Two-gate human oversight (LIVE — now three-gate with §2A.5 customer-review-before-deploy);
  8. Build audit-gate-blocks-delivery DB-enforced predicate (LIVE — analog applied to scaffold per control #8);
  9. Per-bundle Art. 50 disclosure (LIVE — extended to per-scaffold NOTICE per control #9);
  10. LLM cost amplification mitigation (LIVE — extended to scaffold per control #15);
  11. Firecracker microVM graduation (LIVE — no V2.1 regression; scaffold generation runs in the same Firecracker sandbox as bundle generation);
  12. Second LLM provider lane (LIVE — no V2.1 regression).
- V2.1 cohort regression test `tests/regression/v2-controls.spec.ts` green.

**Audit conclusion:** **LIVE — RE-VERIFIED.** V2 controls remain green; no V2.1 regressions.

### 2.18 Auto-PR controls (V1.5 carry-over) — LIVE — RE-VERIFIED

**Status:** LIVE — RE-VERIFIED at V2.1.

**Evidence:**

- All eight V1.5 Auto-PR controls scored in `compliance/v1-5-compliance-audit.md` §1 re-verified at V2.1 with no regressions.
- V2.1 cohort regression test `tests/regression/v1-5-controls.spec.ts` green.

**Audit conclusion:** **LIVE — RE-VERIFIED.**

### 2.19 State biometric laws + EU AI Act biometric-ID — N/A

**Status:** N/A — unchanged from V2 + V1.5.

**Evidence:**

- Studio Zero does not process biometric data; AUP forbids biometric submission.
- Build extension §3 customer warranty (extended by §2A.9 to scaffold submissions) prohibits submitting biometric-ID product ideas.
- AI System Card v1.6 §2.3 carries the excluded-use-case list forward without relaxation.

**Audit conclusion:** **N/A.** No change at V2.1.

### 2.20 DMCA Designated Agent + GDPR Art. 27 EU representative — HUMAN-PENDING (carried)

**Status:** HUMAN-PENDING (carried from V2 + V1.5 + M4).

**Evidence:**

- Both filing packages LIVE since M4: `compliance/dmca-designated-agent.md` (USCO filing); `compliance/article-27-eu-representative.md` (Prighter recommended at €690/yr; engagement letter pre-V1.5-launch target was not hit).
- Status unchanged at V2.1: Jo's signatures still outstanding.
- Closure target re-set to: pre-V2.1-close-Plus-30d for both. DMCA agent urgency strengthened by V2.1 scaffold surface (executable-code IP issues are higher-stakes than bundle markdown). Art. 27 rep target remains pre-Art-50-binding 2026-08-02.
- Comply tracks weekly; escalation path: BigBrain prompts Jo if not closed by 2026-06-01.

**Audit conclusion:** **HUMAN-PENDING.** Not V2.1-ship-blocking (V2.1 launches to existing Managed Pro audience; M5 public-launch + Art. 50 binding are the downstream blockers). Carry-over.

### 2.21 Self-dogfood gate V2.1 — LIVE — Jury owns

**Status:** LIVE — Jury owns (Comply re-verifies at quarterly cadence).

**Evidence:**

- `sprint/milestone-V2-1.md` exit gate: `audits/v2_1.json` = PASS or PASS WITH FIXES.
- Negative-test pattern from V2 (`audits/v2.json`) carries forward — Studio Zero audits its own codebase at the V2.1 milestone using the same Jury rubric customers consume.
- Comply re-verifies the verdict at the quarterly System Card cadence.

**Audit conclusion:** **LIVE.** Jury signs the verdict; Comply signs the cadence.

---

## 3. V2.1 exit-gate cross-reference

`sprint/milestone-V2-1.md` lists the V2.1 exit gates. This scorecard's relevant intersection:

| V2.1 exit gate (sprint/milestone-V2-1.md)                            | This scorecard control(s)                         |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| Clean-VM bootstrap of a generated scaffold completes in <30 min      | #13                                               |
| Offline-mode network-tap proves no code POSTed externally            | #14                                               |
| Audit-gated delivery: scaffold ships only on PASS or PASS WITH FIXES | #4 + #8 (legal hard rule + DB-enforced predicate) |
| Self-dogfood gate V2.1: `audits/v2_1.json` = PASS or PASS WITH FIXES | #21                                               |
| Build extension §2A LIVE (V2.1 amendment)                            | #2, #3, #4, #5, #6, #7                            |
| AI System Card v1.6 LIVE                                             | #1                                                |

All V2.1 exit gates have a compliance counterpart or are tracked by sibling owner agents. Comply does not block on Verify or Jury gates; those agents own their respective gates.

---

## 4. Audit conclusion

**V2.1 exit verdict: PASS WITH HUMAN-PENDING.**

- **Eighteen LIVE controls** at V2.1 ship: AI System Card v1.6; Build extension v1.1 §2A; scaffold customer-IP ownership; scaffold audit-gate hard rule (legal + DB-enforced); scaffold production-readiness disclaim; scaffold customer-review obligation (third human-oversight gate); scaffold 7-day customer-rejection refund; scaffold audit-gate-blocks-delivery DB predicate; per-scaffold Art. 50 NOTICE disclosure; R-V2.1-1 undisclosed dependencies mitigation; R-V2.1-2 similar-to-public-references in code mitigation; R-V2.1-3 production-readiness expectation mismatch mitigation; clean-VM bootstrap test; offline-mode network-tap test; LLM cost amplification mitigation scaled for Scaffold; self-dogfood gate V2.1; plus the V2 + V1.5 carry-overs.
- **Three RE-VERIFIED carry-overs:** Art. 50 disclosure machinery (now covers four surfaces — API, Auto-PR, Build bundles, Scaffold deliveries); V2 controls suite (all twelve green, no V2.1 regressions); V1.5 Auto-PR controls suite (all eight green).
- **Two HUMAN-PENDING carry-overs:** DMCA Designated Agent registration; GDPR Art. 27 EU representative engagement. Both Jo-signature-only; both with closure targets re-set to pre-V2.1-close-Plus-30d.
- **One N/A:** state biometric laws + EU AI Act biometric-ID provisions (we don't process biometrics).

**Comply signs.** V2.1 ships. Next scorecard: M3 close (or M5 launch if scaffold-cohort signal warrants an earlier compliance re-verification) — at which point pinning artifact + Art. 27 representative gaps must close, and V2.1+30d measured values must populate AI System Card v1.6 §9 NEW V2.1 rows.

---

_Comply locks this V2.1 Compliance Audit Scorecard at v1.0 on 2026-05-12 (V2.1 Batch 1 — Scaffold/MVP code generation launch). Quarterly re-verification cadence; next: 2026-08-12._
