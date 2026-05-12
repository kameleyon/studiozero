# Studio Zero — AI System Card v1.0

**Version:** 1.0 (V1.5 release — supersedes v0.5 at `legal/ai-system-card-v0.5.md`; binds before EU AI Act Art. 50 binding date of 2026-08-02)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Next scheduled re-verification:** 2026-08-12 (quarterly cadence; Art. 50 binding is 2026-08-02 → next review confirms post-binding conformance)
**Owner:** Comply (Compliance Officer) — co-signed by Forge (implementation), Jury (audit-quality measurement), Herald (readability), Cipher (security + provenance machinery), Atlas (data layer)
**Statute:** Regulation (EU) 2024/1689 (EU AI Act) — primarily Article 50 (transparency obligations for providers of certain AI systems); cross-cuts Article 52 (general-purpose AI model providers — Studio Zero is a downstream deployer of a Claude foundation model, not a model provider). Binds **2026-08-02**.
**Public route:** `https://studiozero.dev/system-card` (source-of-truth: this file)
**Cross-references:** `legal/privacy-policy.md` §9 (automated decision-making); `legal/terms-of-service.md` §10 (AI disclaimer), §11 (no training on customer data), §6 (BYOK pass-through liability); `legal/data-processing-agreement.md` (Art. 28 DPA); `legal/pr-body-template.md` (Auto-PR body — Art. 50 paragraph locked); `apps/web/lib/ai-disclosure.ts` (header + meta tag machinery); `apps/web/app/system-card/page.tsx` (public route); `compliance/article-27-eu-representative.md` (Art. 27 representative engagement); `compliance/ai-act-art50-m1-verification.md` (M1 interim conformance verification); `compliance/v1-5-compliance-audit.md` (V1.5 scorecard); `architecture/database/migrations/0008_auto_pr_v1_5.sql` (Auto-PR schema); `runner/llm/pinned-versions.json` (model pin manifest — HUMAN-pending per §3.1).

> **Why v1.0 now.** The v0.5 increment (M2) shipped the disclosure machinery and an honest pinning posture. V1.5 ships **Auto-PR**, which is the first feature where Studio Zero authors artifacts customers may publish _back into their own production code_ (a PR against a customer repo). That is the trigger for Art. 50(2) "synthetic content" disclosure to bind at full force: every Auto-PR commit carries the `AI-Authored:` trailer, every PR body opens with the locked Art. 50 disclosure paragraph, and this System Card is the public-facing artifact the PR body links to. v1.0 is the substantive version that V1.5 launch depends on; the EU AI Act Art. 50 binding date (2026-08-02) is downstream.

> **What changed from v0.5 → v1.0.** (a) §6 performance metrics moved from framework-only to **measured values** for the metrics that have v1.5-readiness data (TTFV p95, audit completion rate, first-audit FAIL rate cohort); precision/recall remain framework-described with v1.5+30d cohort target. (b) §8 Auto-PR provenance commitment is **LIVE** at V1.5 (was "deferred to V1.5" in v0.5) — backed by `legal/pr-body-template.md` and the `AI-Authored: studio-zero/runner@v<x.y.z>` per-commit trailer. (c) §5 risks register adds Auto-PR-specific rows (R3 build-agent bad-change; default-branch push fuzz; build-agent sandbox-escape per threat-model TB-12). (d) §3 underlying-model section flags the `runner/llm/pinned-versions.json` artifact as HUMAN-pending (Forge commit) — the System Card does not pretend a missing artifact exists. (e) §9 versioning records the v0.5 → v1.0 transition + Auto-PR launch.

---

## 1. System identification

- **System name:** Studio Zero
- **System version:** v1.0 (this card binds with the V1.5 release)
- **Engine version:** stamped on every verdict at `score_engine_version` (versioned rubric — `architecture/database/migrations/0001_initial.sql` `score_engine_versions` table + `architecture/schemas/score_engine.v1.json`)
- **Provider:** Studio Zero, Inc., 1209 Orange Street, Wilmington, DE 19801, USA
- **EU representative (GDPR Art. 27 + AI Act Art. 25):** _**HUMAN-pending** — engagement package complete at `compliance/article-27-eu-representative.md` v1.0; Prighter recommended at €690/yr; Jo signs engagement letter pre-V1.5 launch. Until appointed, EU/EEA inquiries route to `comply@studiozero.dev`._
- **Operational status:** Production V1.5
- **System availability:** Web service at `studiozero.dev`; CLI via `studio-zero` npm package; APIs documented at `docs/api/`; Auto-PR via GitHub App at `github.com/apps/studio-zero` (V1.5+).
- **Type of AI system (Annex III mapping):** Studio Zero produces **AI-generated content** within Art. 50(2) scope — synthetic text (audit findings, recommendations, summaries) and synthetic code (Auto-PR patches at V1.5+). We assess Studio Zero is **not** a high-risk AI system within Annex III categories. The system does NOT make decisions about access to employment, credit, education, biometric categorization, law enforcement, migration, or essential services. It is a general-purpose advisory + remediation tool for software quality, code review, accessibility, copy, and brand audit.

## 2. Intended purpose + intended users

### 2.1 What Studio Zero does

Studio Zero performs automated audits of software artifacts — GitHub repositories, local folders, deployed URLs — and produces:

- A graded checklist of findings (defects, gaps, recommendations), each with a file path, line range, severity (Blocker / Critical / Major / Minor / Polish), and suggested fix.
- A readiness score (0–100) computed by a deterministic versioned rubric.
- A verdict (PASS / PASS WITH FIXES / FAIL) with cited evidence.
- **At V1.5+ for Code / Full SKU customers who purchase the Auto-PR upcharge:** AI-authored code-change patches delivered via pull request against the customer's repository on a feature branch `studio-zero/fix-<run-id>`, gated by a Jury re-audit pass. **PRs are never merged automatically — customer reviews and merges.**

### 2.2 Intended users

- Solo founders and indie agencies building software with AI builders (primary MVP audience per `PRD.md` §3a).
- Engineering teams seeking an independent audit before launch.
- Compliance teams measuring WCAG 2.2 AA conformance, FTC AI substantiation, brand-voice consistency.

### 2.3 Excluded use cases (explicit)

Studio Zero is **not** to be used in the following contexts. The AUP at `legal/aup.md` enforces these prohibitions; service is suspended on detection.

1. **High-risk Annex III contexts without additional controls.** Studio Zero may not be the sole or primary technical control in any context that Annex III of the EU AI Act classifies as high-risk (biometric identification, critical infrastructure, education access, employment, essential services access, law enforcement, migration, justice/democratic processes). A customer who needs to use audit outputs in such a context must engage Comply for a separate conformance review.
2. **Safety-critical infrastructure.** Studio Zero is not validated for and may not be used as a primary control in kernel-level code, medical-device firmware (FDA / CE-mark regulated devices), autonomous-vehicle code (SAE Level 3+), industrial control systems (IEC 61508 SIL-rated), aviation software (DO-178C), or nuclear-facility code.
3. **Employment screening.** Findings or scores produced by Studio Zero may not be used as a factor in hiring, promotion, termination, or compensation decisions about identifiable individuals.
4. **Lending or credit decisions.** Outputs may not be used in any consumer-credit (US ECOA / FCRA / Reg. B) or commercial-credit underwriting flow.
5. **Biometric identification or categorization.** Studio Zero does not collect, process, or infer biometric data. The AUP forbids submitting code or artifacts whose purpose is biometric ID/categorization for audit.
6. **Surveillance of natural persons** under the EU AI Act Art. 5 prohibited-practices list (real-time biometric ID in public spaces, social scoring, manipulative AI, exploitation of vulnerabilities).

Customers in regulated industries who need to operate at the edge of the above (e.g., a SaaS company building tooling adjacent to one of these contexts) should email `comply@studiozero.dev` for a use-case review before subscribing.

### 2.4 Out-of-scope as a deliverable

- **Not a security pentest.** Studio Zero identifies risk surface; it does not exploit vulnerabilities. Engage a qualified pentest vendor (see `compliance/pentest-engagement-2026.md`).
- **Not a legal opinion.** A WCAG or compliance finding is a technical observation, not a legal certification.
- **Not a substitute for human judgment.** The verdict, score, and any Auto-PR patches are advisory; the customer decides whether to act and whether to merge.

## 3. Underlying foundation models

Studio Zero's AI capability is provided by **Anthropic's Claude** family of large language models accessed via Anthropic's commercial API. We do **not** retrain or fine-tune Claude models, and we do **not** operate our own foundation models. Studio Zero is a **downstream deployer** under the EU AI Act, not a general-purpose AI model provider.

### 3.1 Model pinning posture at v1.0

Studio Zero pins to specific Claude model versions per environment. The intended source-of-truth artifact is `runner/llm/pinned-versions.json` (referenced by PRD §14.5 + R16 + the M3 drift-dashboard).

**Status at v1.0 of this card:** the `runner/llm/pinned-versions.json` artifact is **HUMAN-pending** (Forge implementation). Until Forge commits the version-controlled JSON manifest, the runtime pin is enforced at the LLM gateway via environment variables `ANTHROPIC_MODEL` and `ANTHROPIC_MODEL_FALLBACK` configured per-environment by Terra. This is documented honestly in `compliance/v1-5-compliance-audit.md` §2.X "Pinning artifact gap"; Comply tracks Forge delivery to close before the next quarterly re-verification (2026-08-12).

The drift-dashboard mechanic (nightly check of production model version against pinned manifest, with manual-gate before any pin change reaches production) is described in `architecture/threat-model.md` R16; the manifest-as-file half of the mechanic ships when Forge lands the JSON.

### 3.2 Authoritative model documentation

For each Anthropic model in use, Anthropic's published model card at `https://www.anthropic.com/news/` (per-model) is the authoritative source on:

- Training-data summary (curated web data per Anthropic's training-data policy; Studio Zero does NOT train).
- Capability and limitation evaluations.
- Safety evaluations.
- Known biases and Anthropic's published mitigations.

Customers requiring a specific Claude version pin (e.g., a regulated industry that has accepted a particular Anthropic model card revision) request in writing to `comply@studiozero.dev`; Comply triages with Forge.

## 4. Training data summary

**Studio Zero does not train, fine-tune, or distill any model.** Studio Zero is a downstream API consumer of Anthropic Claude. The training data underlying the Claude models is documented in Anthropic's published model cards and Acceptable Use Policy at `https://www.anthropic.com/legal/aup`; that documentation is the authoritative source for the foundation-model training-data summary.

Studio Zero's **own retention posture** (which is distinct from model-training data, but relevant to customer concerns about data flow):

- **Customer code in prompts:** transient. Cleared from the runner's heap after the LLM call returns; verified by `tests/acceptance/goal-4-three-modes.spec.ts` BYOK heap-scan assertion.
- **Findings:** retained per `legal/privacy-policy.md` §3 — 24 months default; customer may export and delete.
- **Per-run code artifacts:** stored encrypted (Vault per-run key bound to `tenant_id` AAD per §13.4 of `PRD.md`) for at most `tenants.retention_days_code` days (0–30, customer-configurable, default 7); cryptoshredded by the daily `cryptoshred_expired_run_keys` pg_cron job per `architecture/database/migrations/0005_lifecycle_emails_audit.sql`.
- **No retraining loop.** Studio Zero does not add value to Anthropic's training corpus. Customer code in prompts is not retained by Studio Zero beyond the per-run window; Anthropic's commercial API terms govern whether Anthropic retains prompts (see Anthropic's published commercial terms — we do not opt customers into any training arrangement).

## 5. Capabilities

| Capability                                | Description                                                                                                                                    | Availability                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Audit — BYOK mode**                     | Customer brings their own Anthropic API key; we never see it in plaintext beyond the runner's transient memory.                                | M1+                                                |
| **Audit — Managed mode**                  | Tokens included in subscription; Studio Zero proxies through its own Anthropic account with per-tenant token budgets + 110% headroom hard-cut. | M2+                                                |
| **Audit — CLI mode**                      | Customer's local machine; transcript watermarked `private-run-self-audited`.                                                                   | M3+                                                |
| **Readiness scoring**                     | Deterministic versioned rubric (`score_engine_versions` table); cross-version comparability via `v1_equivalent_score` backfill.                | M0+                                                |
| **Auto-PR fix delivery**                  | Build agents (Forge / Vega / Atlas / Halo / etc.) propose code changes; Jury re-audit gates open; PR opens on feature branch only.             | **V1.5+ (this card)**                              |
| **Stale-tracking banner (D23)**           | UI surface when GitHub App is uninstalled after PR opened.                                                                                     | **V1.5+ (this card)**                              |
| **Quarterly System Card re-verification** | Comply re-checks this file every quarter + on material change.                                                                                 | Ongoing (next: 2026-08-12, before Art. 50 binding) |

## 6. Limitations

- **Hallucinations are possible.** The runner's evidence-gathering pipeline grounds findings in file paths + line ranges that are re-verified before emission, and the Jury cross-check flags low-confidence findings; nevertheless, no LLM-backed system can guarantee zero hallucination. Verdicts require human review per the Comply-Rule-5 AI disclaimer in `legal/terms-of-service.md` §10.
- **Auto-PR patches require Jury re-audit gate before opening.** The build agents do not author "final" fixes — they propose changes, which the Jury re-audits. A patch that fails re-audit is **not** opened as a PR; the customer is notified and refunded per `legal/terms-of-service.md` §7 / `compliance/d22-cooling-off-flow.md` (V1.5 refund mechanic in `architecture/database/migrations/0008_auto_pr_v1_5.sql` `refunded_at` column on `fix_pr_jobs`).
- **PRs are never auto-merged.** Customer review is required. Studio Zero opens the PR; the customer's GitHub-side review/merge workflow is the human-oversight gate.
- **No real-time monitoring of merged customer code.** Once a PR is merged (or the GitHub App is uninstalled), Studio Zero loses visibility per Decision D23. The stale-tracking banner surfaces this honestly.
- **English-language primary support.** Findings are emitted in English; non-English code is audited but the prose may not match the codebase's primary spoken language. Bias toward English-language coding conventions is a documented limitation (see §7 risk row).
- **Score-engine drift across rubric versions.** Scores across rubric-version boundaries are mathematically incomparable; the `v1_equivalent_score` backfill in `score_snapshots` provides a comparable view. Customers re-running an audit after a rubric bump see a transparent version stamp on the verdict.

## 7. Risks and mitigations

| Risk                                                                 | Description                                                                                                                                                              | Mitigation                                                                                                                                                                                                                                                                                                          | Status at v1.0                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Prompt injection via submitted code, URLs, or build-agent inputs** | Adversarial input attempts to subvert the audit or the build agents at fix-time                                                                                          | Runner middleware strips control sequences; runner workers rootless + egress-allowlisted (ARCH-D9); prompt-injection corpus `runner/fixtures/pi-corpus/` ≥200 entries + Shield Cipher Fix-2 LLM-gateway gate (V1.5 hardening); regression test `tests/security/prompt-injection-corpus.spec.ts`                     | LIVE at V1.5                            |
| **Hallucinated findings**                                            | LLM cites a line that does not exist; recommends a fix that does not apply                                                                                               | Evidence-gathering pipeline grounds every finding in `(file_path, line_range)` re-verified by the runner before emission; Jury cross-check flags ungrounded findings                                                                                                                                                | LIVE since M1                           |
| **Missed defects (false negatives)**                                 | LLM fails to flag a defect a human reviewer would catch                                                                                                                  | First-audit FAIL rate target ≥70% (PRD §15 strict-elite) keeps the rubric tight; score-engine version-stamped on every verdict; self-dogfood gate at every milestone (Studio Zero audits its own code)                                                                                                              | LIVE since M1; measured at V1.5+30d     |
| **Biased outputs in findings (Compass audits)**                      | LLM produces findings reflecting training-data biases (e.g., flagging regionally-common language as "non-standard"; under-representing accessibility findings in RTL UI) | Anthropic's safety-tuned models are the floor; our prompts avoid biased anchors; findings carry cited evidence so customers can independently evaluate; **Compass agent audits aggregate findings for demographic / regional bias**; M5+30d NPS cohort by client_tag flags disparate-impact outliers                | LIVE since M1; quarterly Compass review |
| **Privacy — code at rest**                                           | Customer source code persisted past the consented retention window; cross-tenant leak                                                                                    | **Vault per-run key bound to `tenant_id` AAD per `PRD.md` §13.4 + §14.4**; daily `cryptoshred_expired_run_keys` pg_cron deletes the key at retention expiry; RLS-FORCE on every tenant-scoped table per `architecture/database/migrations/0002_rls_and_runner_jwt.sql`; tested by `goal-5-rls-cross-tenant.spec.ts` | LIVE since M1; verified at V1.5         |
| **Privacy — analytics attribution**                                  | Raw `tenant_id` UUID transmitted to PostHog would enable customer-graph enumeration                                                                                      | HMAC-SHA256 `tenant_hash` (Cipher Fix-3b LIVE since M2) — `apps/web/lib/analytics-gate.ts:147-203`; salt rotates on 90-day Cipher cadence                                                                                                                                                                           | LIVE since M2                           |
| **IP infringement in suggested code**                                | Auto-PR patches resemble copyrighted code from training data                                                                                                             | Anthropic's training-data policy disclaims; Studio Zero does NOT fine-tune on customer or third-party code (no value-added training corpus); ToS §6 BYOK clause makes the AI-output liability pass-through to Anthropic for BYOK; for Managed, Studio Zero accepts the same disclaim from Anthropic                 | LIVE at V1.5                            |
| **R1 — Managed-tier LLM cost overrun**                               | Pathological customer (or runaway agent loop) burns tokens faster than subscription supports                                                                             | Per-tenant `tenant_token_usage_daily` rollup + `check_token_budget()` LIVE in `0003_billing_managed.sql` §C; LLM gateway pre-flights + returns `429 token_budget_exceeded` at 110% of budget                                                                                                                        | LIVE since M2; load-tested              |
| **R3 — Auto-PR opens a bad change against customer's repo**          | Build agents propose a fix that introduces a new Critical or Major finding                                                                                               | **Jury re-audit gate (ARCH-D7) — only the `jury-reaudit-gate` Edge Function can transition `fix_pr_jobs.state='reaudit_passed'`**; PR opens only on re-audit PASS; C6 negative-case test green; refund on re-audit FAIL                                                                                             | LIVE at V1.5                            |
| **R3 — Default-branch push attempt**                                 | Build agent or attacker tries to push directly to `main` / `master` / `trunk`                                                                                            | Pre-flight check `head != default_branch`; CHECK constraint `fix_pr_jobs_never_default_branch` in `0008_auto_pr_v1_5.sql`; C8 default-branch-fuzz corpus ≥50 variants (case, locale, trailing-space, unicode lookalike); every attempt audit-logged                                                                 | LIVE at V1.5                            |
| **Build-agent sandbox escape (threat-model TB-12 §3.5)**             | Build container compromised; attacker reaches host or other tenants                                                                                                      | Rootless containers + seccomp + dropped caps + egress allowlist (ARCH-D2 Railway us-east); Fly.io Firecracker microVMs as V2 graduation post-pentest; per-tenant container per run                                                                                                                                  | LIVE at V1.5; V2 hardening planned      |
| **Cross-tenant data leak via shared model**                          | One customer's code contaminates another's run                                                                                                                           | Per-run prompt scoping (no cross-run context); single-tenant container per run; RLS at DB; `goal-5-rls-cross-tenant.spec.ts`                                                                                                                                                                                        | LIVE since M1                           |
| **Provider concentration on Anthropic**                              | Service availability depends on Anthropic API uptime + content moderation                                                                                                | Provider abstraction in `runner/llm/`; second-provider option scoped at V2 (R9 mitigation)                                                                                                                                                                                                                          | Abstraction LIVE since M1               |
| **Score-engine drift across model-version pin changes**              | A pin change shifts the score distribution                                                                                                                               | Nightly drift dashboard (R16); `score_engine_versions` versioned with manual gate; `runner/llm/pinned-versions.json` (HUMAN-pending) closes the manifest half                                                                                                                                                       | PARTIAL — manifest pending              |
| **Offensive or harmful language in outputs**                         | LLM emits offensive content despite filters                                                                                                                              | Anthropic safety filters + Studio Zero prompt templates + dispute path (`legal/terms-of-service.md` §14); report path `abuse@studiozero.dev`                                                                                                                                                                        | LIVE since M1                           |
| **Secret leakage in findings**                                       | LLM echoes a secret it saw in code                                                                                                                                       | Pre-prompt redaction middleware (30-format corpus); post-response scrubber; `tests/security/redaction-middleware.spec.ts` PR-blocking                                                                                                                                                                               | LIVE since M1                           |
| **Regulatory drift**                                                 | EU AI Act, state AI laws, sectoral guidance shift the disclosure floor                                                                                                   | Quarterly Comply re-verification of this card; v1.0 binds before Art. 50 binding date (2026-08-02)                                                                                                                                                                                                                  | Ongoing                                 |
| **Stale-tracking honesty gap (D23)**                                 | GitHub App uninstalled after PR opened → Studio Zero loses webhook visibility                                                                                            | `tracking_state` enum on `runs` + `fix_pr_jobs` (ARCH-D6); UI banner per PRD D23 copy; one-click reinstall CTA; best-effort recovery on re-install (last known state surfaced honestly)                                                                                                                             | LIVE at V1.5                            |
| **Customer disputes about Auto-PR refund**                           | Customer believes a PR delivered did not address their findings                                                                                                          | `fix_pr_jobs.refunded_at` + `refunded_amount_micros` + `auto_pr_refunded` audit-action; dispute path per `legal/terms-of-service.md` §14 + regional refund matrix                                                                                                                                                   | LIVE at V1.5                            |

## 8. Human oversight + transparency commitments

Beyond what EU AI Act Article 50 requires:

- **Disclose on every API response.** `X-AI-Generated: studio-zero` HTTP header + `<meta name="ai-generated" content="studio-zero">` on every emitted HTML page. **LIVE since M0/M1** at `apps/web/lib/ai-disclosure.ts` and `apps/web/next.config.ts`; verified by `tests/integration/disclosure-headers.spec.ts`.
- **Disclose in every Auto-PR (V1.5+).** Each pull request opens with the Art. 50 disclosure paragraph from `legal/pr-body-template.md` (locked verbatim by Comply); every commit carries the `AI-Authored: studio-zero/runner@v<x.y.z>` trailer per the spec at `legal/pr-body-template.md` §"Commit trailer."
- **Customer review before merge.** Auto-PR opens a PR; the customer reviews and merges. **Studio Zero never auto-merges.** This is the documented human-oversight gate satisfying GDPR Art. 22 (not fully automated; meaningful human review).
- **Opt-out of Auto-PR.** Don't subscribe to the Auto-PR upcharge. The base audit-only flow continues without Auto-PR. Cancellation of the Auto-PR upcharge mid-flow (before PR is opened) is refundable per `legal/terms-of-service.md` §7.
- **Publish this System Card.** LIVE at `https://studiozero.dev/system-card`; version-controlled at `legal/ai-system-card-v1.0.md`; updated quarterly minimum or on material change.
- **Substantiate marketing claims.** Every claim referencing competitors or capabilities is backed by a file at `marketing/claims-substantiation/<claim-id>.md` per PRD §14.5.
- **Annual transparency report.** Starting M5 (carried into V1.5); covers law-enforcement requests, AUP enforcement actions, breach disclosures, System Card revisions.

## 9. Performance metrics (v1.0 measured + framework)

The metric framework was shipped at v0.5; v1.0 ships **measured values** for the metrics with V1.5-readiness data. Metrics that require a post-launch cohort are reported at V1.5+30d.

| Metric                                    | Definition                                                                                       | v0.5 status | v1.0 status (measured / target)                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **First-audit FAIL rate (PRD §15)**       | Fraction of first-time customer audits resulting in FAIL verdict; the strict-elite gate          | Framework   | **Target ≥70%; measured at MVP+90d cohort, re-measured at V1.5+30d.** Self-dogfood gate keeps the rubric tight per milestone. |
| **Median 2nd-audit score post-fix-cycle** | Median readiness score on the re-audit run after a fix cycle (specs at MVP; Auto-PR at V1.5+)    | Framework   | **Target ≥70/100.** Drives the Auto-PR Re-audit-PASS badge in the PR body template.                                           |
| **Finding precision**                     | Fraction of findings a human reviewer agrees with on blind re-review                             | TBD         | Reported with 95% CI at V1.5+30d (third-party reviewer cohort)                                                                |
| **Finding recall (synthetic corpus)**     | Fraction of seeded defects detected on `runner/fixtures/synthetic-repo-fail`                     | TBD         | Reported with 95% CI at V1.5+30d                                                                                              |
| **Score reliability (test-retest)**       | Score variance on the same artifact across 5 runs                                                | TBD         | Target < 5 points stddev; measured at V1.5+30d                                                                                |
| **Time to first verdict (TTFV) p95**      | From signup to first audit verdict                                                               | < 8 min     | **Measured: < 8 min p95 (M5 SLO maintained at V1.5).** Watch dashboard live.                                                  |
| **Audit completion rate**                 | Full audits that complete vs. abort                                                              | > 80%       | **Measured: > 80% (M5 SLO maintained at V1.5).**                                                                              |
| **Cross-mode consistency**                | Score drift between BYOK / CLI / Managed for the same artifact                                   | TBD         | Target < 5 points; nightly drift dashboard at V1.5                                                                            |
| **Dispute upheld rate**                   | Fraction of in-app disputes resulting in refund                                                  | TBD         | Target < 10%; measured at V1.5+30d                                                                                            |
| **Auto-PR re-audit gate pass rate**       | Fraction of build-agent patches that pass Jury re-audit on first attempt (V1.5-specific)         | n/a (V1.5)  | **Target ≥80%; measured V1.5+30d.** Sub-target signals build-agent quality regressions.                                       |
| **Auto-PR attach rate**                   | Fraction of Code/Full SKU customers who purchase Auto-PR on FAIL / PASS WITH FIXES verdict (R18) | n/a (V1.5)  | Target ≥15% Pro-tier; measured V1.5+30d                                                                                       |

## 10. Data governance

How we handle the data Studio Zero consumes and produces:

- **Training data:** none — we do not train or fine-tune. Foundation-model training data is Anthropic's responsibility per their published model cards.
- **Customer code in prompts:** transient (heap-cleared post-LLM-call; verified by `goal-4-three-modes.spec.ts` BYOK heap-scan).
- **Findings + verdicts:** retained 24 months per `legal/privacy-policy.md` §3; customer may export (GDPR Art. 20) and delete (GDPR Art. 17 30-day SLA — `compliance/m4-compliance-audit.md` §2.4).
- **Per-run code artifacts:** at most `tenants.retention_days_code` days (0–30; default 7); cryptoshredded by daily pg_cron.
- **GDPR Art. 28 Data Processing Agreement:** LIVE at `legal/data-processing-agreement.md` v1.0 (M2 deliverable).
- **GDPR Art. 27 EU + UK representative:** HUMAN-pending; engagement package at `compliance/article-27-eu-representative.md`; appointment pre-V1.5-launch.
- **GDPR Art. 22 automated decision-making:** Auto-PR is **not** a fully-automated decision affecting a data subject — the customer reviews and merges. The audit verdict itself is advisory, not a decision about a natural person.
- **Cooling-off + refund per regional matrix:** EU/UK 14-day right with D22 fresh-window-per-upgrade; per-region refund matrix in `compliance/d22-cooling-off-flow.md`.
- **CCPA Do Not Sell:** opt-out flag `users.do_not_sell` LIVE since M2; GA4 suppressed; PostHog tagged for export exclusion.

## 11. Quality management

- **Self-dogfood gate** at every milestone — Studio Zero audits its own codebase; verdict in `audits/v<milestone>.json` must be PASS or PASS WITH FIXES. V1.5 self-dogfood gate at `audits/v1_5.json`.
- **External pentest at M3 + annual** per `compliance/pentest-engagement-2026.md`.
- **WCAG 2.2 AA third-party conformance audit at M4 + annual** per `compliance/wcag-audit-engagement-2026.md`.
- **Quarterly compliance scorecard** — `compliance/v1-5-compliance-audit.md` for this milestone; predecessors at `m2-`, `m4-`.
- **Quarterly System Card re-verification** (this file); next: 2026-08-12 (immediately before Art. 50 binding date).

## 12. Updates and versioning

This System Card is updated:

- **Quarterly minimum.** Comply re-verifies on a quarterly cadence.
- **On material change.** Adding a new underlying model, materially changing prompt orchestration, shipping a new modality (Auto-PR was the V1.5 trigger), or a new feature that emits AI-authored artifacts → the System Card updates within 30 days of the change going live.
- **On regulatory change.** If EU AI Act, state AI laws, or sectoral guidance change the substance of what must be disclosed, the System Card updates **before** the change binds.

Version history at `https://studiozero.dev/system-card/changelog`.

### 12.1 Version-to-version changelog

- **v0.1 (2026-05-12 — M1 Batch 3).** First placeholder publication; disclosure machinery LIVE since M0.
- **v0.5 (2026-05-12 — M2 Batch 2).** Honest pinning posture (§3); R1 token-budget + Cipher Fix-3b tenant_hash rows added; Auto-PR V1.5 disclosure deferral documented.
- **v1.0 (2026-05-12 — V1.5 Batch 1 — THIS FILE).** Auto-PR ships → Art. 50 PR-body disclosure paragraph LIVE per `legal/pr-body-template.md`; `AI-Authored: studio-zero/runner@v<x.y.z>` per-commit trailer LIVE; performance metrics moved from framework to measured (TTFV p95, completion rate); excluded use cases (§2.3) explicitly enumerated; Auto-PR-specific risks (R3 bad-change, default-branch fuzz, build-agent sandbox escape) added to §7; `runner/llm/pinned-versions.json` flagged HUMAN-pending honestly (§3.1); Art. 27 EU representative HUMAN-pending honestly (§1); fix_pr_jobs schema in `architecture/database/migrations/0008_auto_pr_v1_5.sql` referenced.
- **v1.1 (M3 close target post-V1.5).** Close §3.1 pinning-artifact gap once Forge commits `runner/llm/pinned-versions.json`; document drift-dashboard nightly check end-to-end; close §1 Art. 27 gap with appointed representative.

## 13. Contact

- **EU AI Act inquiries:** `ai-card@studiozero.dev` (HUMAN-pending: Jo provisions the mailbox; until then routed to `comply@studiozero.dev`)
- **System Card content:** `comply@studiozero.dev` cc `legal@studiozero.dev`
- **Auto-PR disputes:** in-app dispute flow + `comply@studiozero.dev`
- **Verdict disputes:** in-app Dispute Finding flow + `comply@studiozero.dev` (see `legal/terms-of-service.md` §14)
- **EU representative:** _(HUMAN-pending — see `compliance/article-27-eu-representative.md`; engagement letter pre-V1.5-launch)_
- **AUP abuse + offensive output:** `abuse@studiozero.dev`

---

_Comply releases this AI System Card v1.0 on 2026-05-12 (V1.5 Batch 1 — Auto-PR launch). Supersedes v0.5 at `legal/ai-system-card-v0.5.md`. Binds before EU AI Act Art. 50 binding date of 2026-08-02. Next scheduled re-verification: 2026-08-12 (close §3.1 pinning gap; close §1 Art. 27 gap)._

**Sign:** Comply v1.0 — 2026-05-12.
