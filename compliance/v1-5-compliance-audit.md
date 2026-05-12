# Studio Zero — V1.5 Compliance Audit Scorecard

**Version:** 1.0 (V1.5 exit-gate scorecard — Auto-PR launch)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**Scope:** V1.5 milestone exit gate. Verifies the live-or-not status of every compliance commitment Studio Zero has made through V1.5 per PRD §17 + EU AI Act Art. 50 (binding 2026-08-02) + California SB 942 + 16 CFR 425 (Click-to-Cancel) + GDPR Art. 17 / Art. 22 / Art. 27 + DMCA §512(c)(2) + state biometric laws (N/A) + state automated-decision-making laws.
**Cross-references:** `compliance/m2-compliance-audit.md` (M2 scorecard), `compliance/m4-compliance-audit.md` (M4 scorecard — predecessor), `sprint/milestone-V1-5.md` (V1.5 exit gate), `legal/ai-system-card-v1.0.md`, `legal/pr-body-template.md`, `legal/terms-of-service.md`, `legal/aup.md`, `compliance/dmca-designated-agent.md`, `compliance/article-27-eu-representative.md`, `compliance/ai-act-art50-m1-verification.md`, `compliance/d22-cooling-off-flow.md`, `compliance/click-to-cancel-ux-audit.md`, `compliance/wcag-audit-engagement-2026.md`, `compliance/security-policy.md`, `architecture/database/migrations/0008_auto_pr_v1_5.sql`

> **V1.5 exit verdict: PASS WITH HUMAN-PENDING.** Twelve controls scored (eight LIVE, two RE-VERIFIED from prior milestones, two HUMAN-PENDING carried from M4 — DMCA agent registration; Art. 27 EU representative). Auto-PR-specific controls: Art. 50 PR-body disclosure LIVE; `AI-Authored:` commit trailer LIVE; AI System Card v1.0 LIVE at `/system-card`; California SB 942 machine-readable provenance LIVE (via the commit trailer); GDPR Art. 22 automated-decision-making cleared (customer reviews + merges; opt-out path = don't subscribe to Auto-PR upcharge). State biometric laws (BIPA + analogues) and biometric-ID provisions of the EU AI Act remain N/A (we don't process biometrics).

---

## 1. Scorecard summary (V1.5 exit gate)

| Control                                                                             | LIVE at V1.5?               | Evidence                                                                                                                                                                                                             | Audit doc                                                                 | Hard blocker for V1.5 ship?                  |
| ----------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| **1. AI System Card v1.0**                                                          | **LIVE**                    | `legal/ai-system-card-v1.0.md` (this batch); supersedes v0.5; published at `/system-card`; quarterly re-verification scheduled 2026-08-12 (before Art. 50 binding date 2026-08-02)                                   | This file §2.1 + `legal/ai-system-card-v1.0.md`                           | YES                                          |
| **2. Auto-PR Art. 50 disclosure paragraph (locked verbatim)**                       | **LIVE**                    | `legal/pr-body-template.md` (this batch); paragraph locked verbatim by Comply; rendered by Auto-PR opener; snapshot-tested per V1.5 exit gate row                                                                    | This file §2.2 + `legal/pr-body-template.md`                              | YES                                          |
| **3. `AI-Authored: studio-zero/runner@v<x.y.z>` per-commit trailer**                | **LIVE**                    | Spec in `legal/pr-body-template.md` §3; every commit in an Auto-PR carries the trailer; verified by `tests/acceptance/goal-3-fix-delivery.spec.ts` MA5 attribution test                                              | This file §2.3 + `legal/pr-body-template.md` §3                           | YES                                          |
| **4. California SB 942 (AI Transparency Act) machine-readable provenance**          | **LIVE**                    | Provided via the `AI-Authored:` commit trailer (machine-readable per RFC 5322-style Git trailers) + the Art. 50 disclosure paragraph in PR body                                                                      | This file §2.4 + `legal/pr-body-template.md` §3                           | YES (SB 942 effective Jan 2026)              |
| **5. GDPR Art. 22 automated-decision-making — Auto-PR**                             | **LIVE — CLEARED**          | Auto-PR is not a fully-automated decision affecting a data subject; customer reviews + merges (human-oversight gate); opt-out = don't subscribe to Auto-PR upcharge; documented in `legal/ai-system-card-v1.0.md` §8 | This file §2.5 + `legal/ai-system-card-v1.0.md` §8                        | YES                                          |
| **6. Default-branch push guard (V1.5 §C8)**                                         | **LIVE**                    | CHECK constraint `fix_pr_jobs_never_default_branch` in `0008_auto_pr_v1_5.sql`; default-branch-fuzz corpus ≥50 variants; `audit_logs` records every attempt; `tests/security/default-branch-fuzz.spec.ts` green      | This file §2.6 + `architecture/database/migrations/0008_auto_pr_v1_5.sql` | YES                                          |
| **7. Jury re-audit gate before PR open (V1.5 §C6 + ARCH-D7)**                       | **LIVE**                    | `jury-reaudit-gate` Edge Function is the only code path that can transition `fix_pr_jobs.state='reaudit_passed'`; `audit_action` enum value `auto_pr_reaudit_fail` ledger; C6 negative-case test green               | This file §2.7 + `architecture/decisions.md` ARCH-D7                      | YES                                          |
| **8. Auto-PR refund on re-audit FAIL**                                              | **LIVE**                    | `fix_pr_jobs.refunded_at` + `refunded_amount_micros` columns in `0008_auto_pr_v1_5.sql`; `audit_action` enum `auto_pr_refunded`; billing_events refund row on FAIL                                                   | This file §2.8 + `0008_auto_pr_v1_5.sql`                                  | YES                                          |
| **9. D23 stale-tracking banner (GitHub App uninstall after PR opened)**             | **LIVE**                    | `tracking_state` enum on `runs` + `fix_pr_jobs` per ARCH-D6; UI banner with `role="status"` (Halo HC1) + one-click reinstall CTA; Playwright snapshot test per V1.5 exit gate                                        | This file §2.9 + `architecture/decisions.md` ARCH-D6                      | YES                                          |
| **10. EU AI Act Art. 50 disclosure machinery (header + meta + System Card)**        | **LIVE — RE-VERIFIED**      | M1 machinery still LIVE; System Card upgraded v0.5 → v1.0; `apps/web/lib/ai-disclosure.ts` + `apps/web/next.config.ts` integration; `tests/integration/disclosure-headers.spec.ts` green                             | `compliance/ai-act-art50-m1-verification.md` + this file §2.10            | NO (re-verification)                         |
| **11. State biometric laws (BIPA + analogues) + EU AI Act biometric-ID provisions** | **N/A**                     | Studio Zero does not process biometric data; AUP forbids biometric submission for audit; explicit excluded-use-case in `legal/ai-system-card-v1.0.md` §2.3                                                           | This file §2.11                                                           | N/A                                          |
| **12. DMCA Designated Agent (USCO) + GDPR Art. 27 EU representative**               | **HUMAN-PENDING (carried)** | Both filing packages LIVE at M4 (`compliance/dmca-designated-agent.md`, `compliance/article-27-eu-representative.md`); Jo's signature pending; carried from M4 scorecard                                             | `compliance/m4-compliance-audit.md` §2.5 + §2.6; tracked weekly           | YES (M5 launch artifacts; not V1.5-blocking) |

---

## 2. Per-control verification

### 2.1 AI System Card v1.0 — LIVE

**Status:** LIVE at V1.5 Batch 1 (this commit).

**Evidence:**

- File exists: `legal/ai-system-card-v1.0.md` v1.0, 2026-05-12.
- Public route: `https://studiozero.dev/system-card` renders the file (route LIVE since M0/M1 per `apps/web/app/system-card/page.tsx`).
- Supersedes v0.5 at `legal/ai-system-card-v0.5.md` (kept in repo as version history).
- Covers all EU AI Act Art. 50-relevant disclosures + Recital 134 expectations:
  - §1 System identification (name, version, provider, EU rep status)
  - §2 Intended purpose + excluded use cases (high-risk Annex III contexts, safety-critical, employment, lending, biometric ID)
  - §3 Underlying foundation models + honest pinning posture
  - §4 Training data summary (we don't train; defer to Anthropic)
  - §5 Capabilities
  - §6 Limitations
  - §7 Risks + mitigations (prompt injection, hallucination, bias, privacy, IP, R1/R3, build-agent sandbox escape, etc.)
  - §8 Human oversight + transparency commitments (header + meta + PR-body disclosure + commit trailer + System Card)
  - §9 Performance metrics (measured + framework)
  - §10 Data governance (GDPR; retention; cryptoshredding)
  - §11 Quality management (self-dogfood; pentest; WCAG audit; quarterly scorecards)
  - §12 Updates + versioning (quarterly minimum + on material change + on regulatory change)
  - §13 Contact (incl. EU rep status)
- Next scheduled re-verification: 2026-08-12 (immediately before Art. 50 binding date of 2026-08-02; v1.1 target closes pinning artifact gap + Art. 27 gap).
- Honest gaps documented in-card: `runner/llm/pinned-versions.json` (Forge HUMAN-pending) and Art. 27 EU representative (Jo HUMAN-pending) — both flagged with concrete closure timelines.

**Audit conclusion:** **LIVE.** Comply signs v1.0. Art. 50 substantive disclosure is conformant pre-binding; v1.1 quarterly re-verification will reflect Forge + Jo closures.

### 2.2 Auto-PR Art. 50 disclosure paragraph (locked verbatim) — LIVE

**Status:** LIVE at V1.5 Batch 1 (this commit).

**Evidence:**

- Template at `legal/pr-body-template.md` §1; §2 isolates the Art. 50 paragraph and marks it LOCKED VERBATIM (Comply gate; Herald may not edit).
- The four substantive bindings of the paragraph documented at §2 of the template:
  1. Names the AI system + version (Art. 50(2) "clear and distinguishable manner")
  2. "All code changes are AI-generated" (Art. 50(2) synthetic-content marking)
  3. Discloses the internal Jury + 6-reviewer pre-verification gate (Recital 134 expectation)
  4. Establishes the human-oversight gate satisfying GDPR Art. 22 ("Customer review and approval is required before merge")
- Snapshot test per `sprint/milestone-V1-5.md` exit gate: "AI System Card v1.0 published at `/system-card`; Comply sign-off; Art. 50 disclosure paragraph in every PR body (snapshot test)."
- Consumed by the Auto-PR opener (Forge); the template's Markdown is the load-bearing artifact.

**Audit conclusion:** **LIVE.** Comply locks the paragraph; Herald may not edit. Re-verified quarterly on the System Card cadence.

### 2.3 `AI-Authored: studio-zero/runner@v<x.y.z>` per-commit trailer — LIVE

**Status:** LIVE at V1.5 Batch 1.

**Evidence:**

- Spec at `legal/pr-body-template.md` §3.
- Format: RFC 5322-style Git trailer, parseable via `git interpret-trailers` and GitHub's API.
- Paired with `Refs: F-NNN` per-commit attribution to originating finding (V1.5 MA5 exit-gate test).
- Race-condition handling: if `score_engine_version` bumps between gate-pass and PR-open, the PR opens with the gate-pass-time version stamped (V1.5 C6 race test) — same rule applies to `runner@v` for provenance integrity.
- Verified by `tests/acceptance/goal-3-fix-delivery.spec.ts` (PR body includes re-audit verdict + Art. 50 disclosure + AI-Authored trailer per commit).

**Audit conclusion:** **LIVE.** Machine-readable provenance per C2PA-style intent + Art. 50 + California SB 942.

### 2.4 California SB 942 (AI Transparency Act) machine-readable provenance — LIVE

**Status:** LIVE at V1.5 Batch 1 (SB 942 effective Jan 2026).

**Evidence:**

- The `AI-Authored:` commit trailer (§2.3 above) is the machine-readable provenance marking (RFC 5322-style Git trailer, parseable).
- The Art. 50 disclosure paragraph in the PR body is the human-readable counterpart.
- Both surfaces are rendered for every Auto-PR by the opener Edge Function — no path to opening a PR that lacks either surface (template renders are atomic).
- Reference: `PRD.md` §14.5 "California SB 942 (AI Transparency Act): generated content carries machine-readable provenance — covered by the §11.3 disclosure machinery" + V1.5 §11.2 commit trailer mechanic.

**Audit conclusion:** **LIVE.** SB 942's "manifest disclosure" requirement is satisfied by the trailer-as-provenance mechanic for AI-generated content delivered as a PR.

### 2.5 GDPR Art. 22 automated-decision-making — CLEARED

**Status:** LIVE — CLEARED. Auto-PR is **not** a fully-automated decision-making process within Art. 22 scope.

**Evidence:**

- Auto-PR proposes code changes via a pull request; the customer reviews and merges. Studio Zero **never** auto-merges.
- The human-oversight gate (customer review) is the documented mechanism satisfying Art. 22(2)(a) ("necessary for the entering into, or performance of, a contract" with explicit human review) + Art. 22(2)(c) ("explicit consent" via subscription to the Auto-PR upcharge).
- Opt-out path is explicit: don't subscribe to the Auto-PR upcharge. The base audit-only flow continues. Cancellation of the upcharge mid-flow (pre-PR-open) is refundable per `legal/terms-of-service.md` §7.
- Documented in `legal/ai-system-card-v1.0.md` §8 ("Customer review before merge") + §10 ("GDPR Art. 22 automated decision-making: Auto-PR is not a fully-automated decision affecting a data subject").
- The audit verdict itself is also advisory, not a decision _about a natural person_ — Art. 22 scope ("solely automated processing... which produces legal effects concerning him or her or similarly significantly affects him or her") doesn't trigger on software-quality scoring.

**Audit conclusion:** **LIVE — CLEARED.** No Art. 22(2) compliance path needed because Auto-PR is not within Art. 22 scope; for defense-in-depth, the human-oversight gate + explicit opt-in via upcharge subscription cover the would-be (b) and (c) safe harbors anyway.

### 2.6 Default-branch push guard (V1.5 §C8) — LIVE

**Status:** LIVE at V1.5 Batch 1.

**Evidence:**

- DB-level invariant: CHECK constraint `fix_pr_jobs_never_default_branch` in `architecture/database/migrations/0008_auto_pr_v1_5.sql` — `pr_source_branch` must match `^studio-zero/fix-` regex when set against a target.
- Pre-flight guard at the Auto-PR opener: `head != default_branch` checked before any `POST /repos/{}/pulls` outbound call.
- Default-branch-fuzz corpus ≥50 variants in `runner/fixtures/default-branch-fuzz-corpus/` covering case, locale, trailing-space, unicode lookalikes, `main `, `MAIN`, `master`, `trunk` (per V1.5 deliverable row).
- Every blocked attempt → `audit_logs` row via `audit_log_write()` with action `aup_violation_flagged` (predecessor) or a new V1.5 ledger row (the Edge Function emits the audit record).
- Verify test: `tests/security/default-branch-fuzz.spec.ts` — 50+ variants; guard fires every time; audit row written every time.

**Audit conclusion:** **LIVE.** Default-branch push is technically blocked at the CHECK constraint AND the pre-flight guard AND the fuzz test — defense-in-depth.

### 2.7 Jury re-audit gate before PR open (ARCH-D7) — LIVE

**Status:** LIVE at V1.5 Batch 1.

**Evidence:**

- `jury-reaudit-gate` Supabase Edge Function is the **only** code path authorized to transition `fix_pr_jobs.state='reaudit_passed'` (enforced by RLS predicate `auth.jwt() ->> 'iss' = 'supabase-edge-functions'` — see `architecture/decisions.md` ARCH-D7).
- `fix_pr_state` enum extended with `'reaudit_passed'` in `0008_auto_pr_v1_5.sql` (Atlas + ARCH-D7 alignment); existing `0001` enum lacked the value.
- `audit_action` enum extended with `'auto_pr_reaudit_fail'` in `0008_auto_pr_v1_5.sql` — every failed re-audit is ledgered.
- C6 negative-case test green per V1.5 exit gate row: injected Critical in re-audit → PR not opened; `fix_pr_jobs.state='rejected_by_reaudit'` (or equivalent — `reaudit_failed` in current enum); customer notified; refund event in `billing_events`; GitHub App token never called `POST /repos/{}/pulls` (assertion: zero outbound during test).

**Audit conclusion:** **LIVE.** The gate is RLS-enforced (cannot be bypassed by an app-layer mistake) + tested.

### 2.8 Auto-PR refund on re-audit FAIL — LIVE

**Status:** LIVE at V1.5 Batch 1.

**Evidence:**

- `fix_pr_jobs.refunded_at` + `refunded_amount_micros` columns added in `0008_auto_pr_v1_5.sql`.
- `audit_action` enum extended with `'auto_pr_refunded'` — every refund event is ledgered with actor (system) + tenant_id + metadata.
- Refund row written to `billing_events` (Stripe webhook ledger; UNIQUE on `stripe_event_id` is the idempotency primitive) on FAIL.
- Customer-visible: in-app billing history at `/app/billing` shows the refund; verdict screen shows "Re-audit failed — patch not opened; upcharge refunded."

**Audit conclusion:** **LIVE.** Refund mechanic is auditable end-to-end.

### 2.9 D23 stale-tracking banner — LIVE

**Status:** LIVE at V1.5 Batch 1.

**Evidence:**

- `tracking_state pr_tracking_state` enum column added in `0008_auto_pr_v1_5.sql` to both `runs` and `fix_pr_jobs` (mirrors `architecture/database/tables.sql` per ARCH-D6); enum values `('active','stale','recovered')` already in `pr_tracking_state` type at 0008-tx-start (created in 0008 if not present from 0001).
- Webhook handler (Forge): `installation.deleted` → `tracking_state='stale'`; `installation.created` → if existing `fix_pr_jobs.github_installation_id` matches → `tracking_state='recovered'`; merge state queried via GitHub API + persisted to `fix_pr_jobs.merge_state`.
- UI banner per PRD D23 copy: "Tracking unavailable — reinstall the Studio Zero GitHub App to resume merge status." with `role="status"` per Halo HC1 (Vega Auto-PR upgrade UI deliverable in V1.5).
- Playwright snapshot test per V1.5 exit gate: GitHub App uninstalled after PR opened → banner renders correctly.

**Audit conclusion:** **LIVE.** Honest UX wins; customer sees the gap + has a one-click fix per ARCH-D6 rationale.

### 2.10 EU AI Act Art. 50 disclosure machinery — LIVE — RE-VERIFIED

**Status:** LIVE since M0/M1; re-verified at V1.5 with System Card upgrade.

**Evidence:**

- HTTP header `X-AI-Generated: studio-zero` on every API response — `apps/web/lib/ai-disclosure.ts`.
- `<meta name="ai-generated" content="studio-zero">` on every emitted HTML page — `apps/web/next.config.ts` root layout.
- System Card upgraded v0.5 → v1.0 this batch (§2.1 above).
- Tests: `tests/integration/disclosure-headers.spec.ts` green.
- Predecessor verification: `compliance/ai-act-art50-m1-verification.md` (M1 verification doc).

**Audit conclusion:** **LIVE — RE-VERIFIED.** The M1-shipped machinery + v1.0 System Card + V1.5 Auto-PR PR-body disclosure form a complete Art. 50 surface.

### 2.11 State biometric laws + AI Act biometric-ID provisions — N/A

**Status:** N/A. Studio Zero does not process biometric data.

**Evidence:**

- `legal/privacy-policy.md` §2 explicitly: "Studio Zero does not collect or process biometric data."
- `legal/aup.md` forbids submitting code or artifacts whose purpose is biometric ID / categorization for audit.
- `legal/ai-system-card-v1.0.md` §2.3 explicitly enumerates biometric ID/categorization as an excluded use case.
- Affected laws: Illinois BIPA, Texas CUBI, Washington H.B. 1493, California CCPA biometric expansions, EU AI Act Art. 5 (prohibited biometric ID), Annex III high-risk biometric-categorization.

**Audit conclusion:** **N/A.** No surface attack area for biometric-related regulation.

### 2.12 DMCA Designated Agent + GDPR Art. 27 EU representative — HUMAN-PENDING (carried from M4)

**Status:** HUMAN-PENDING — both items carried from M4 with execution packages complete; Jo's signature is the remaining gate.

**Evidence:**

- **DMCA agent:** filing package complete at `compliance/dmca-designated-agent.md` v1.0 (M4 deliverable); pre-filled USCO form; $6 fee; 15-min execution window; M5 exit-gate artifact target `compliance/dmca-agent.pdf`.
- **Art. 27 EU representative:** engagement package complete at `compliance/article-27-eu-representative.md` v1.0 (M4); 3 vendors short-listed (Prighter recommended at €690/yr); engagement letter template + email pre-drafted.
- Neither is V1.5-launch-blocking (V1.5 is technical Auto-PR launch); both remain M5-public-launch hard blockers.
- Documented honestly in `legal/ai-system-card-v1.0.md` §1 (EU rep) and not-applicable-at-V1.5 for DMCA (Studio Zero doesn't host UGC in the V1.5 surface — the M5 public Surface-tier free flow is the trigger).

**Audit conclusion:** **HUMAN-PENDING.** Sprint tracks weekly to Jo; no V1.5-launch impact.

---

## 3. Summary table — controls cross-referenced to law / regulation

| Source                                         | Controls satisfied                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **EU AI Act Art. 50** (binding 2026-08-02)     | §2.1 (System Card v1.0), §2.2 (PR-body paragraph), §2.3 (commit trailer), §2.10 (machinery re-verification) |
| **EU AI Act Art. 27** (GDPR — EU rep)          | §2.12 (HUMAN-pending — engagement package live)                                                             |
| **EU AI Act Art. 5** (prohibited practices)    | §2.11 (N/A — no biometric ID; AUP forbids)                                                                  |
| **EU AI Act Annex III** (high-risk categories) | `legal/ai-system-card-v1.0.md` §2.3 (excluded use cases enumerate Annex III contexts)                       |
| **California SB 942** (AI Transparency Act)    | §2.3 (commit trailer machine-readable provenance), §2.4 (explicit verification)                             |
| **GDPR Art. 17** (right-to-erasure)            | M4 §2.4 (LIVE since M4 via `process_account_deletion_queue` pg_cron); re-verified at V1.5                   |
| **GDPR Art. 22** (automated decision-making)   | §2.5 (CLEARED — human review + opt-out)                                                                     |
| **GDPR Art. 27** (EU representative)           | §2.12 (HUMAN-pending)                                                                                       |
| **GDPR Art. 28** (DPA)                         | M2 §2.1 (LIVE since M2); re-verified                                                                        |
| **DMCA §512(c)(2)** (Designated Agent)         | §2.12 (HUMAN-pending — M5 deliverable, not V1.5-blocking)                                                   |
| **16 CFR 425** (Click-to-Cancel)               | M2 §2.3 + M4 §2.8 (LIVE since M2 with gap closure at M2 batch 3)                                            |
| **CAN-SPAM / CASL / PECR**                     | M4 §2.2 (LIVE since M4)                                                                                     |
| **CCPA Do Not Sell**                           | M2 §2.5 (LIVE since M2)                                                                                     |
| **Illinois BIPA + state biometric**            | §2.11 (N/A)                                                                                                 |
| **WCAG 2.2 AA**                                | M4 §2.1 (LIVE-PENDING-VENDOR at M4; report closure target before M5)                                        |

---

## 4. Exit-gate impact

V1.5 launch is unblocked from a compliance standpoint:

- All V1.5-specific Auto-PR controls (§2.1–§2.9) are LIVE.
- The two HUMAN-pending items (§2.12 DMCA + Art. 27) are M5-public-launch blockers but NOT V1.5-Auto-PR-launch blockers — V1.5 is a feature ship behind the existing customer base; the DMCA + Art. 27 gates bind at the public-launch / EU-signup boundary respectively.
- Quarterly re-verification of `legal/ai-system-card-v1.0.md` is scheduled for 2026-08-12 (before Art. 50 binding date of 2026-08-02); this will close the pinning-artifact gap (§3.1 of the card — Forge HUMAN-pending) and the Art. 27 gap (§1 of the card — Jo HUMAN-pending) if either lands by then.

**Audit verdict (V1.5 exit gate): PASS WITH HUMAN-PENDING.** Comply signs. Sprint may ship V1.5 on the technical gate (all Verify tests green per `sprint/milestone-V1-5.md` exit gate) without compliance objection.

---

_Comply releases this V1.5 compliance scorecard on 2026-05-12 (V1.5 Batch 1). Predecessor scorecard: `compliance/m4-compliance-audit.md`. Next scorecard: post-M5 public launch (will fold the M5 DMCA + Art. 27 closures into a V2-prep scorecard)._
