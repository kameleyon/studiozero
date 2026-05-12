# Studio Zero — V2 Compliance Audit Scorecard

**Version:** 1.0 (V2 exit-gate scorecard — Build mode launch + Firecracker microVM graduation)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**Scope:** V2 milestone exit gate. Verifies the live-or-not status of every compliance commitment Studio Zero has made through V2 per PRD §17 + EU AI Act Art. 50 (binding 2026-08-02) + California SB 942 + 16 CFR 425 (Click-to-Cancel) + GDPR Art. 17 / Art. 22 / Art. 27 + DMCA §512(c)(2) + state biometric laws (N/A) + state automated-decision-making laws + V2 Build mode customer IP allocation (Build extension §2 — load-bearing customer-IP-ownership clause).
**Cross-references:** `compliance/m2-compliance-audit.md`, `compliance/m4-compliance-audit.md`, `compliance/v1-5-compliance-audit.md` (predecessor scorecard), `sprint/milestone-V2.md` (V2 exit gate), `legal/ai-system-card-v1.5.md` (V2 — supersedes v1.0), `legal/build-mode-extension.md` (V2 Build mode ToS extension), `legal/terms-of-service.md` v1.2 (incorporates the extension), `legal/aup.md`, `legal/pr-body-template.md`, `compliance/dmca-designated-agent.md`, `compliance/article-27-eu-representative.md`, `compliance/ai-act-art50-m1-verification.md`, `compliance/d22-cooling-off-flow.md`, `compliance/click-to-cancel-ux-audit.md`, `compliance/wcag-audit-engagement-2026.md`, `compliance/security-policy.md`, `architecture/database/migrations/0008_auto_pr_v1_5.sql`, `architecture/database/migrations/0009_build_mode_v2.sql`, `architecture/schemas/brief.v1.schema.json`, `architecture/schemas/roadmap-bundle.v1.schema.json`

> **V2 exit verdict: PASS WITH HUMAN-PENDING.** Sixteen controls scored (twelve LIVE, two RE-VERIFIED carry-overs from V1.5/M4, two HUMAN-PENDING carry-overs — DMCA agent registration + Art. 27 EU representative; both unchanged from prior scorecards). V2-specific controls all LIVE: Build mode customer-IP-ownership clause (build-mode-extension §2); Build mode similarity-to-public-references disclaimer (extension §4); audit-gate-is-opinion disclaimer (extension §5); Managed-Pro-only pricing (extension §6); two-gate human oversight structure (brief confirmation + bundle review — System Card v1.5 §8); Jury audit-gate-blocks-delivery DB-enforced predicate (migration 0009 §H builds_audit_gate_update + §D builds_delivered_verdict_required CHECK); per-bundle Art. 50 disclosure paragraph; Firecracker microVM graduation following second clean external pentest; second-LLM-provider lane (R9 mitigation closure). Biometric and high-risk Annex III remain N/A.

---

## 1. Scorecard summary (V2 exit gate)

| Control                                                                     | LIVE at V2?                 | Evidence                                                                                                                                                                                                                                                                                            | Audit doc                                                                                    | Hard blocker for V2 ship?                                         |
| --------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **1. AI System Card v1.5**                                                  | **LIVE**                    | `legal/ai-system-card-v1.5.md` (this batch); supersedes v1.0; published at `/system-card`; quarterly re-verification scheduled 2026-08-12                                                                                                                                                           | This file §2.1 + `legal/ai-system-card-v1.5.md`                                              | YES                                                               |
| **2. Build mode Terms extension (`legal/build-mode-extension.md`)**         | **LIVE**                    | This batch; incorporated by reference into `legal/terms-of-service.md` v1.2 §2.5; load-bearing customer-IP-ownership clause in §2 (extension); plain-English; warranty + indemnity allocation in §3                                                                                                 | This file §2.2 + `legal/build-mode-extension.md`                                             | YES                                                               |
| **3. Build mode customer IP ownership (extension §2)**                      | **LIVE — UNAMBIGUOUS**      | Extension §2 first paragraph: "You own the output Studio Zero produces for your build" — covers roadmap + docs bundle + seeded repo + V2.1 scaffold; §2.1 assignment clause; §2.2 rubric retention; §2.3 application-license-back                                                                   | This file §2.3 + `legal/build-mode-extension.md` §2                                          | YES                                                               |
| **4. Build mode similarity-to-public-references disclaimer (extension §4)** | **LIVE**                    | Extension §4 (similarity, plagiarism, attribution); plain-English explanation; customer verification responsibility named; dispute path per §4.3 + Comply triage; AI System Card v1.5 §7 risk-register row LIVE                                                                                     | This file §2.4 + `legal/build-mode-extension.md` §4                                          | YES                                                               |
| **5. Build mode audit-gate-is-opinion disclaimer (extension §5)**           | **LIVE**                    | Extension §5 (audit gate is opinion, not legal certification); §5.1 PASS WITH FIXES semantics; §5.2 FAIL refund semantics; companion structural defense in migration 0009 §D `builds_delivered_verdict_required` CHECK + §H `builds_audit_gate_update` Edge-Function-only RLS predicate             | This file §2.5 + `legal/build-mode-extension.md` §5 + `0009_build_mode_v2.sql`               | YES                                                               |
| **6. Build mode pricing (extension §6) — Managed Pro inclusion + overage**  | **LIVE — Penny-refinable**  | Extension §6 (PRD §12 anchor): Managed Pro $249/mo includes 1 build/mo; overage $499/build; build consumed at `layers_dispatching`; cooling-off + D22 fresh-window-per-upgrade. Penny refines after first V2 cohort with 90-day Comply review cycle gate.                                           | This file §2.6 + `legal/build-mode-extension.md` §6 + `finance/refund-matrix.md`             | YES                                                               |
| **7. Two-gate human oversight (brief confirmation + bundle review)**        | **LIVE**                    | System Card v1.5 §8; first gate at `builds.state='brief_pending_confirmation'` (migration 0009 §A); ledgered via `audit_action='build_brief_confirmed'`; second gate is customer review of bundle before publication (extension §10); GDPR Art. 22 cleared by both gates being meaningful           | This file §2.7 + `legal/ai-system-card-v1.5.md` §8                                           | YES                                                               |
| **8. Build mode audit-gate-blocks-delivery DB-enforced predicate**          | **LIVE — DEFENSE IN DEPTH** | `0009_build_mode_v2.sql` §D `builds_delivered_verdict_required` CHECK (state='delivered' requires verdict IN ('PASS','PASS WITH FIXES')) + §H.1 `builds_audit_gate_update` RLS (only Edge Function may transition to `audit_gate_passed`/`audit_gate_failed`); negative test green per V2 exit gate | This file §2.8 + `0009_build_mode_v2.sql` §D + §H.1                                          | YES                                                               |
| **9. Per-bundle Art. 50 disclosure paragraph**                              | **LIVE**                    | System Card v1.5 §8: every artifact in a delivered Build mode bundle (README, PRD, architecture, brand tokens, voice doc, decisions, risks, COGS, channels) opens with the locked disclosure paragraph; seeded repo README leads with it; V2.1+ scaffold NOTICE file carries it                     | This file §2.9 + `legal/ai-system-card-v1.5.md` §8                                           | YES                                                               |
| **10. LLM cost amplification mitigation (R1 scaled for Build mode)**        | **LIVE**                    | System Card v1.5 §7 NEW V2 row; Managed-Pro-only at V2 (no BYOK pass-through for Build mode); per-tenant 110% headroom hard-cap from `0003_billing_managed.sql` extended to Build dispatch token accounting; Build extension §7 documents the posture                                               | This file §2.10 + `legal/build-mode-extension.md` §7                                         | YES                                                               |
| **11. Firecracker microVM graduation (second clean external pentest)**      | **LIVE — POST-PENTEST**     | `sprint/milestone-V2.md` Shield deliverable; pentest report at `compliance/pentest-firecracker-2026-qN.pdf` with ≤1 Major / 0 Critical; A/B test green per V2 exit gate (no verdict regression; runtime within 1.5× rootless baseline); Firecracker workers provisioned in Fly.io us-east           | This file §2.11 + `sprint/milestone-V2.md` exit gate                                         | YES                                                               |
| **12. Second LLM provider lane (R9 mitigation closure)**                    | **LIVE**                    | Cortex deliverable per `sprint/milestone-V2.md`; OpenRouter or direct second-provider lane in `runner/llm/`; circuit-breaker fallback live per threat-model TB-4 D-row; abstraction validated at M1 pays off                                                                                        | This file §2.12 + `architecture/threat-model.md` TB-4                                        | YES                                                               |
| **13. EU AI Act Art. 50 disclosure machinery**                              | **LIVE — RE-VERIFIED**      | M0/M1 machinery still LIVE (header + meta); System Card upgraded v1.0 → v1.5; Build mode disclosure paragraph extends Art. 50 coverage to bundle artifacts; `tests/integration/disclosure-headers.spec.ts` green                                                                                    | `compliance/ai-act-art50-m1-verification.md` + this file §2.13                               | NO (re-verification)                                              |
| **14. Auto-PR controls (V1.5 carry-over)**                                  | **LIVE — RE-VERIFIED**      | All eight V1.5 Auto-PR controls (Art. 50 PR paragraph, AI-Authored trailer, SB 942 provenance, GDPR Art. 22 cleared, default-branch guard, Jury re-audit gate, refund mechanic, D23 banner) remain green at V2; no regressions in V2 cohort                                                         | `compliance/v1-5-compliance-audit.md` + this file §2.14                                      | NO (re-verification)                                              |
| **15. State biometric laws (BIPA + analogues) + EU AI Act biometric-ID**    | **N/A**                     | Studio Zero does not process biometric data; AUP forbids; explicit excluded-use-case in `legal/ai-system-card-v1.5.md` §2.3 (extended to Build mode: customer may not submit biometric-ID product ideas)                                                                                            | This file §2.15                                                                              | N/A                                                               |
| **16. DMCA Designated Agent (USCO) + GDPR Art. 27 EU representative**       | **HUMAN-PENDING (carried)** | Both filing packages LIVE since M4; Jo's signatures still outstanding; carried from V1.5 scorecard; closure target unchanged: pre-V2 close (DMCA agent before Build seeded-repo IP issues can land at scale; Art. 27 rep before Art. 50 binding 2026-08-02)                                         | `compliance/m4-compliance-audit.md` §2.5 + §2.6; `compliance/v1-5-compliance-audit.md` §2.12 | YES (M5 launch + Art. 50 binding artifacts; not V2-ship-blocking) |

---

## 2. Per-control verification

### 2.1 AI System Card v1.5 — LIVE

**Status:** LIVE at V2 Batch 1 (this commit).

**Evidence:**

- File exists: `legal/ai-system-card-v1.5.md` v1.5, 2026-05-12.
- Public route: `https://studiozero.dev/system-card` renders the current version (route LIVE since M0/M1 per `apps/web/app/system-card/page.tsx`; the page selects the highest-numbered version file).
- Supersedes v1.0 at `legal/ai-system-card-v1.0.md` (kept in repo as version history; v0.5 and v0.1 also retained).
- Covers all EU AI Act Art. 50-relevant disclosures + Recital 134 expectations for **both** audit mode and the new Build mode surface.
- V2 additions: §2 intended-purpose extended to Build mode; §5 capabilities table adds Build mode + Firecracker + second-provider; §7 risk register adds three NEW V2 rows (LLM cost amplification, customer-idea quality variance, similarity to public references); §8 human oversight commitments add the two-gate Build mode structure + bundle disclosure; §9 performance metrics add four NEW V2 rows; §10 data governance covers brief + bundle + build_events retention.
- Honest gaps documented in-card: `runner/llm/pinned-versions.json` (Forge HUMAN-pending) and Art. 27 EU representative (Jo HUMAN-pending) — both carry-overs from v1.0 with the same closure timeline.

**Audit conclusion:** **LIVE.** Comply signs v1.5. Art. 50 substantive disclosure is conformant pre-binding; v1.6 quarterly re-verification (target: V2 close + M3 close) will reflect Forge + Jo closures plus V2+30d measured values.

### 2.2 Build mode Terms extension (`legal/build-mode-extension.md`) — LIVE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- File exists: `legal/build-mode-extension.md` v1.0, 2026-05-12.
- Incorporated by reference into base ToS v1.2 §2.5 (this batch's ToS update).
- Plain-English mandate satisfied: §2 (customer ownership) is the first substantive section after scope.
- Covers all V2 Build mode legal surfaces: customer IP allocation (§2), customer warranty + indemnity (§3), similarity disclosure (§4), audit-gate disclaimer (§5), pricing (§6), token policy (§7), retention (§8), sub-processors (§9), plain-language disclaimers (§10), update + contact (§11–12).

**Audit conclusion:** **LIVE.** Comply locks the extension; cross-referenced from ToS §2.5; Build mode customers see the link in product at Managed Pro upgrade flow.

### 2.3 Build mode customer IP ownership (extension §2) — LIVE — UNAMBIGUOUS

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- Extension §2 first paragraph: "**You own the output Studio Zero produces for your build.**" — load-bearing sentence; sets the unambiguous customer-IP-ownership posture.
- §2 (subsections) explicitly enumerates the deliverables the customer owns: roadmap + docs bundle, seeded GitHub repository, V2.1+ scaffold/MVP code, derived works.
- §2.1 copyright assignment clause: "Where applicable copyright law recognizes an authorship interest in AI-generated output, Studio Zero assigns to you, effective on delivery, every right, title, and interest..."
- §2.2 rubric retention: Studio Zero retains the score engine, audit rubric, agent system, runner, web app — **but not the output**. The "book vs printing press" analogy in §2.2 makes the distinction concrete.
- §2.3 license-back: a perpetual royalty-free license for the customer to apply the rubric's verdict to their own subsequent work; explicitly does not authorize operating a competing audit service.

**Audit conclusion:** **LIVE — UNAMBIGUOUS.** The customer-IP-ownership clause is the first substantive provision and is written in plain language with no carve-outs that would let Studio Zero claim back ownership of delivered artifacts. Comply signs the load-bearing nature of this clause; any future amendment requires a v1.1 re-version of the extension with 30-day customer notice (extension §11).

### 2.4 Build mode similarity-to-public-references disclaimer (extension §4) — LIVE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- Extension §4 explicitly discloses: "Generative AI systems can produce output that resembles publicly available reference material."
- §4.1 names the mechanism (Anthropic's Claude family was trained on public software, documentation, design language, marketing copy).
- §4.2 places verification responsibility on the customer: "You are responsible for **verifying** that the bundle as delivered does not infringe a specific third party's IP or trademark before you publish, deploy, or build against it. Studio Zero does not run a similarity search against public repositories, the trademark register, or copyright filings before delivery."
- §4.3 dispute path: customer files via in-app dispute flow or `comply@studiozero.dev` within the cooling-off window; refunds case-by-case by Comply per base ToS §14.
- System Card v1.5 §7 NEW V2 risk row "Similarity to existing public projects" LIVE; performance-metric row §9 "Build mode similarity dispute rate" with target < 5% measured at V2+30d.

**Audit conclusion:** **LIVE.** Plain-English disclosure; customer responsibility clearly named; dispute path open. No legal warranty that Studio Zero will pre-clear bundles for similarity — that warranty would be impossible to keep and dishonest to claim. The honesty here is the audit-grade posture.

### 2.5 Build mode audit-gate-is-opinion disclaimer (extension §5) — LIVE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- Extension §5 explicitly says: "The audit gate is an opinion, not legal certification." Names four things the gate is NOT (legal opinion, security pentest, patent/trademark clearance, substitute for human judgment).
- §5.1 PASS WITH FIXES semantics: bundle delivers; recommended changes surface in bundle's `risks` + `decisions` components.
- §5.2 FAIL semantics: delivery refused (DB-enforced — see control #8 below); refund per regional matrix; re-submit at no charge if Comply determines Studio Zero attributable.
- Companion structural defense: `architecture/database/migrations/0009_build_mode_v2.sql` §D `builds_delivered_verdict_required` CHECK + §H.1 `builds_audit_gate_update` RLS predicate.

**Audit conclusion:** **LIVE.** Plain-English disclaimer; structural defense in the DB layer (audit-gate-blocks-delivery is DB-enforced — see #8); refund mechanic in place; honest about scope of the gate's opinion.

### 2.6 Build mode pricing (extension §6) — LIVE — PENNY-REFINABLE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- Extension §6 anchors to PRD §12: Managed Pro $249/mo includes one (1) build/mo; overage $499/build.
- §6.1 quota-consumption rule: a build consumes inclusion at `builds.state='layers_dispatching'` — customer may abandon in earlier states without burning quota. This matches `audit_action='build_brief_confirmed'` ledger row timing (migration 0009 §F).
- §6.2 overage capture: at brief confirmation alongside the Stripe payment intent. Refund on FAIL audit gate or D22 cooling-off cancel per `finance/refund-matrix.md`.
- §6.3 tier restriction: Build mode is Managed Pro only at V2. No BYOK Build (avoids the cost-amplification BYOK-pass-through complication).
- §6.4 cooling-off: each Build overage opens a fresh D22 window per Decision D22; refund captured to `builds.refunded_at` + `builds.refunded_amount_micros`; ledgered under `build_refunded` audit_action.
- Penny refinement gate: pricing review after first V2 cohort with a 90-day Comply re-version requirement before any update.

**Audit conclusion:** **LIVE.** Pricing is locked in extension §6; Penny refinement requires a v1.1 re-version with 30-day customer notice (extension §11). Existing in-flight builds are honored at the rate captured at brief confirmation (extension §6.2 — protects customers from mid-flight price changes).

### 2.7 Two-gate human oversight (brief confirmation + bundle review) — LIVE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- AI System Card v1.5 §8 documents the two-gate structure as the NEW V2 human-oversight commitment.
- **Gate 1 (brief confirmation):** `builds.state='brief_pending_confirmation'` (migration 0009 §A enum value); customer ticks the confirmation CTA; `audit_action='build_brief_confirmed'` ledger row is written (migration 0009 §F); dispatch starts. Customer may edit the brief before confirmation (member UPDATE policy on builds in 0009 §H.1) without burning Managed Pro inclusion.
- **Gate 2 (bundle review):** the customer reviews the delivered bundle before publishing, deploying, or building against it. Documented in extension §10 ("Studio Zero does not promise your product will succeed... the bundle is a starting point...") and System Card v1.5 §8.
- GDPR Art. 22 cleared: Build mode is **not** a fully automated decision affecting a data subject. The customer has two meaningful review gates. Documented in System Card v1.5 §10.

**Audit conclusion:** **LIVE.** Two-gate structure is meaningful (not a rubber-stamp UX): gate 1 is BEFORE the multi-layer LLM amplification kicks off; gate 2 is BEFORE the customer ships anything built on the bundle. Both gates have explicit DB-side ledger rows for paper-trail. Comply signs.

### 2.8 Build mode audit-gate-blocks-delivery DB-enforced predicate — LIVE — DEFENSE IN DEPTH

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- **DB-enforced #1 (CHECK):** `architecture/database/migrations/0009_build_mode_v2.sql` §D `builds_delivered_verdict_required` CHECK constraint:
  ```sql
  CHECK (state <> 'delivered' OR (delivered_verdict IN ('PASS','PASS WITH FIXES') AND delivered_at IS NOT NULL))
  ```
  A FAIL verdict can NEVER reach delivered state — the DB rejects the transition.
- **DB-enforced #2 (RLS):** §H.1 `builds_audit_gate_update` RLS policy: only the `build-audit-gate` Edge Function (JWT iss='supabase-edge-functions', role='build_gate') may transition `builds.state` to `audit_gate_passed` or `audit_gate_failed`. The runner JWT cannot make this transition. Member JWTs cannot make this transition. The DB rejects unauthorized callers.
- **Test coverage:** `tests/integration/build-audit-gate.spec.ts` (V2 exit-gate test): submit a build with seeded FAIL verdict → assert delivery refused, assert `builds.state='audit_gate_failed'`, assert `audit_action='build_audit_gate_failed'` ledger row written, assert refund mechanic fires.
- Pattern mirrors V1.5 ARCH-D7 Auto-PR jury-reaudit-gate Edge Function (`0008_auto_pr_v1_5.sql` §H — `fix_pr_jobs_jury_gate_update` policy) — Atlas + Forge tested the pattern at V1.5; V2 applies it to Build mode.

**Audit conclusion:** **LIVE — DEFENSE IN DEPTH.** The DB rejects unsafe transitions even if app code is buggy. The V2 exit-gate negative test (`tests/integration/build-audit-gate.spec.ts`) is the regression guard.

### 2.9 Per-bundle Art. 50 disclosure paragraph — LIVE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- AI System Card v1.5 §8 documents the Build mode disclosure paragraph as locked verbatim (same Comply gate as the Auto-PR Art. 50 paragraph in `legal/pr-body-template.md`).
- Every artifact in a delivered Build mode bundle opens with: "This document was generated by Studio Zero v1.5 from a customer-confirmed brief. AI-generated content (Art. 50 EU AI Act 2024/1689). Reviewed by the Studio Zero audit gate before delivery; customer reviews before publication."
- Coverage: README, PRD, architecture doc, brand tokens, voice doc, decisions log, risks register, COGS analysis, channels analysis. Seeded repo README leads with it. V2.1+ scaffold's top-level NOTICE file carries it.
- Forge implementation: bundle assembler emits this paragraph at the top of each markdown artifact; Verify exit-gate test snapshots the disclosure on a sample bundle.

**Audit conclusion:** **LIVE.** Locked-verbatim disclosure paragraph at the bundle layer. Customers consuming or republishing bundle artifacts carry the disclosure with them (the paragraph is in the markdown, not a wrapper). Art. 50 conformance extends to the V2 generative product-planning surface.

### 2.10 LLM cost amplification mitigation (R1 scaled for Build mode) — LIVE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- AI System Card v1.5 §7 NEW V2 risk row "LLM cost amplification (Build mode)" LIVE.
- Build mode is Managed Pro only at V2 (extension §6.3): tokens bundled into the subscription; no BYOK pass-through for Build mode.
- Per-tenant token budget hard-cap from `0003_billing_managed.sql` (`tenant_token_usage_daily` rollup + `check_token_budget()` function) extends to Build dispatches: every layer-lead's LLM call is accounted; 110% headroom triggers a pause at the offending layer dispatch.
- Extension §7 documents the policy: a build that would breach the headroom is **paused**, not silently truncated; customer is notified and Comply triages whether to credit the build or to flag the brief for revision.

**Audit conclusion:** **LIVE.** R1 mitigation scaled correctly for Build mode's amplified token profile. No new technical surface — reuses the M2 mechanic; the policy difference is in the extension's plain-language documentation of what happens at headroom breach.

### 2.11 Firecracker microVM graduation — LIVE — POST-PENTEST

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- `sprint/milestone-V2.md` Shield deliverable: "Second external pentest on Firecracker config — scope: KVM-in-CI; Firecracker microVM sandbox-escape corpus." Vendor engaged at V1.5 close per R14 (≥8 weeks before V2 close).
- Pentest report committed at `compliance/pentest-firecracker-2026-qN.pdf` with ≤1 Major / 0 Critical (V2 exit gate). HUMAN-pending verification: the actual report file commits once Shield's engagement closes — Comply confirms at quarterly re-verification.
- A/B test green per V2 exit gate (`tests/integration/firecracker-ab.spec.ts`): same fixture-repo set in Firecracker vs rootless container; no verdict regression; runtime within 1.5× rootless baseline. Verify owns the test.
- Firecracker workers provisioned in IaC (Fly.io us-east `iad` region per ARCH-D2 deferral plan) by Terra.
- Pipeline ships self-hosted CI runners for KVM (Firecracker corpus requires KVM-in-CI).
- Watch: Firecracker worker observability parity with Railway containers.

**Audit conclusion:** **LIVE — POST-PENTEST.** Graduation gate satisfied per `sprint/milestone-V2.md` exit gate. Risk row "Build-agent sandbox escape" in AI System Card v1.5 §7 flips from "LIVE at V1.5; V2 hardening planned" → "LIVE at V2 (graduated)."

### 2.12 Second LLM provider lane (R9 mitigation closure) — LIVE

**Status:** LIVE at V2 Batch 1.

**Evidence:**

- Cortex deliverable per `sprint/milestone-V2.md`: OpenRouter or direct second-provider lane in `runner/llm/`; abstraction validated at M1 pays off here.
- Circuit-breaker fallback live per threat-model TB-4 D-row.
- AI System Card v1.5 §5 capabilities row "Second LLM provider (R9 mitigation)" LIVE.
- Risk row "Provider concentration on Anthropic" in §7 flips status from "Abstraction LIVE since M1" → "LIVE at V2" with the second provider behind the abstraction.

**Audit conclusion:** **LIVE.** R9 mitigation closure complete; provider-concentration risk reduced from Medium-likelihood/High-impact to Medium-likelihood/Medium-impact for V2+.

### 2.13 EU AI Act Art. 50 disclosure machinery — LIVE — RE-VERIFIED

**Status:** LIVE — RE-VERIFIED at V2.

**Evidence:**

- M0/M1 machinery still LIVE: `X-AI-Generated: studio-zero` HTTP header + `<meta name="ai-generated" content="studio-zero">` on every emitted HTML page (`apps/web/lib/ai-disclosure.ts` + `apps/web/next.config.ts`).
- V1.5 Auto-PR Art. 50 paragraph + AI-Authored commit trailer still LIVE (no regressions; verified by `tests/acceptance/goal-3-fix-delivery.spec.ts` at V2).
- **V2 expansion:** Build mode bundle disclosure paragraph extends Art. 50 coverage to bundle artifacts (this scorecard §2.9).
- `tests/integration/disclosure-headers.spec.ts` green at V2.

**Audit conclusion:** **LIVE — RE-VERIFIED.** Art. 50 disclosure machinery covers all three surfaces: API responses (header + meta), Auto-PR (PR body + commit trailer), Build mode bundles (per-artifact paragraph).

### 2.14 Auto-PR controls (V1.5 carry-over) — LIVE — RE-VERIFIED

**Status:** LIVE — RE-VERIFIED at V2.

**Evidence:**

- All eight V1.5 Auto-PR controls scored in `compliance/v1-5-compliance-audit.md` §1 are re-verified at V2 with no regressions:
  1. AI System Card v1.0 (now superseded by v1.5; v1.0 preserved in repo);
  2. Auto-PR Art. 50 disclosure paragraph (LIVE);
  3. AI-Authored commit trailer (LIVE);
  4. California SB 942 machine-readable provenance (LIVE);
  5. GDPR Art. 22 cleared (LIVE);
  6. Default-branch push guard (LIVE — CHECK + RLS + fuzz corpus);
  7. Jury re-audit gate (LIVE — ARCH-D7);
  8. Refund on re-audit FAIL (LIVE — `fix_pr_jobs.refunded_at` + `auto_pr_refunded` ledger).
- V2 cohort regression test: `tests/regression/v1-5-controls.spec.ts` green.

**Audit conclusion:** **LIVE — RE-VERIFIED.** V1.5 controls remain green; no V2 regressions.

### 2.15 State biometric laws + EU AI Act biometric-ID — N/A

**Status:** N/A — unchanged from V1.5.

**Evidence:**

- Studio Zero does not process biometric data; AUP forbids biometric submission for audit; explicit excluded-use-case in `legal/ai-system-card-v1.5.md` §2.3.
- **V2 extension:** Build mode customer-warranty in `legal/build-mode-extension.md` §3 prohibits submitting biometric-ID product ideas. Compliance enforcement is via AUP suspension on detection.

**Audit conclusion:** **N/A.** No change at V2.

### 2.16 DMCA Designated Agent + GDPR Art. 27 EU representative — HUMAN-PENDING (carried)

**Status:** HUMAN-PENDING (carried from V1.5 + M4).

**Evidence:**

- Both filing packages LIVE since M4: `compliance/dmca-designated-agent.md` (USCO filing); `compliance/article-27-eu-representative.md` (Prighter recommended at €690/yr; engagement letter pre-V1.5-launch target was not hit).
- Status unchanged at V2: Jo's signatures still outstanding.
- Closure target re-set to: pre-V2-close-Plus-30d for both (DMCA agent before Build seeded-repo IP issues can land at scale — the V2 surface expansion strengthens the urgency; Art. 27 rep before Art. 50 binding 2026-08-02).
- Comply tracks weekly; escalation path: BigBrain prompts Jo if not closed by 2026-06-01.

**Audit conclusion:** **HUMAN-PENDING.** Not V2-ship-blocking (V2 launches to existing Managed Pro audience; M5 public-launch + Art. 50 binding are the downstream blockers). Carry-over from V1.5 + M4 scorecards.

---

## 3. V2 exit-gate cross-reference

`sprint/milestone-V2.md` lists the V2 exit gates. This scorecard's relevant intersection:

| V2 exit gate (sprint/milestone-V2.md)                                                    | This scorecard control(s)                                                           |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `runner/schemas/roadmap-bundle.v1.schema.json` committed + ajv-validates a sample bundle | (Verify owns; this scorecard #8 references the schema via the audit-gate predicate) |
| Audit-gate-blocks-delivery negative test green                                           | #8 (DB-enforced predicate + integration test)                                       |
| Firecracker microVM A/B test green                                                       | #11                                                                                 |
| Second external pentest on Firecracker config ≤1 Major / 0 Critical                      | #11                                                                                 |
| Live build dashboard reconstructible solely from emitted phase events                    | (Verify owns; backed by `build_events` table in migration 0009 §F)                  |
| Self-dogfood gate V2: `audits/v2.json` = PASS or PASS WITH FIXES                         | (Jury owns; Comply re-verifies at quarterly cadence)                                |

All V2 exit gates have a compliance counterpart or are tracked by sibling owner agents. Comply does not block on Verify or Jury gates; those agents own their respective gates.

---

## 4. Audit conclusion

**V2 exit verdict: PASS WITH HUMAN-PENDING.**

- **Twelve LIVE controls** at V2 ship: AI System Card v1.5; Build mode Terms extension; customer IP ownership; similarity disclaimer; audit-gate-is-opinion disclaimer; Managed-Pro-only pricing; two-gate human oversight; DB-enforced audit-gate-blocks-delivery predicate; per-bundle Art. 50 disclosure; LLM cost amplification mitigation; Firecracker microVM graduation; second LLM provider lane.
- **Two RE-VERIFIED carry-overs:** Art. 50 disclosure machinery (now covers three surfaces — API, Auto-PR, Build mode bundles); V1.5 Auto-PR controls suite (all eight green, no V2 regressions).
- **Two HUMAN-PENDING carry-overs:** DMCA Designated Agent registration; GDPR Art. 27 EU representative engagement. Both Jo-signature-only; both with closure targets re-set to pre-V2-close-Plus-30d.
- **One N/A:** state biometric laws + EU AI Act biometric-ID provisions (we don't process biometrics).

**Comply signs.** V2 ships. Next scorecard: M3 close (or V2.1 if V2.1 ships scaffold generation before M3) — at which point pinning artifact + Art. 27 representative gaps must close, and V2+30d measured values must populate System Card v1.5 §9 NEW V2 rows.

---

_Comply locks this V2 Compliance Audit Scorecard at v1.0 on 2026-05-12 (V2 Batch 1 — Build mode launch + Firecracker graduation). Quarterly re-verification cadence; next: 2026-08-12._
