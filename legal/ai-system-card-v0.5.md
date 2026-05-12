# Studio Zero — AI System Card v0.5

**Version:** 0.5 (M2 — replaces v0.1 placeholder; full v1.0 ships before V1.5 Auto-PR launch per PRD §14.5)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer) — with co-sign from Forge (implementation), Jury (audit-quality measurement), Herald (readability), Cipher (Fix-3b tenant_hash mechanic)
**Statute:** EU AI Act (Regulation (EU) 2024/1689), Article 50 (Transparency obligations for providers and deployers of certain AI systems). Binds **2026-08-02**.
**Cross-references:** `legal/privacy-policy.md` §9 (automated decision-making), `legal/terms-of-service.md` §10 (AI disclaimer), `legal/data-processing-agreement.md` (Art. 28 DPA — LIVE at M2), `apps/web/lib/ai-disclosure.ts` (the disclosure machinery), `apps/web/app/system-card/page.tsx` (the public route — LIVE since M0/M1, lands at /system-card), `apps/web/lib/analytics-gate.ts` (Cipher Fix-3b tenant_hash mechanic)

> **Why v0.5 and not v1.0.** The EU AI Act binds the substantive Article 50 transparency obligations on 2026-08-02. Studio Zero ships the disclosure **machinery** (HTTP header + meta tag + this System Card) at M0/M1; M2 hardens the substance with R1 token-budget capping, per-tenant attribution via HMAC `tenant_hash` (Cipher Fix-3b), and an honest statement of the model-pinning posture. v0.5 is the M2 increment; v1.0 lands with full performance metrics, training-data summary, and a third-party-verified risk register before V1.5 Auto-PR ships.

> **What changed from v0.1 → v0.5.** (a) §3 model-pinning posture rewritten to reflect actual code state: the `runner/llm/pinned-versions.json` artifact referenced by PRD §14.5 is **not yet committed** as of M2 — the System Card no longer pretends it is. (b) §5 risks register augmented with R1 (token-budget cap LIVE in `architecture/database/migrations/0003_billing_managed.sql` §C) and Cipher Fix-3b (per-tenant attribution via HMAC `tenant_hash` LIVE in `apps/web/lib/analytics-gate.ts`). (c) §8 transparency commitments now records that **Auto-PR (V1.5) Art. 50 PR-body disclosure is deferred to V1.5 — M2 does not ship it**. (d) §9 versioning records the v0.1 → v0.5 transition with a changelog entry.

---

## 1. System identity

- **System name:** Studio Zero
- **System version:** v0.5 (rubric); engine version stamped on every verdict at `score_engine_version`
- **Provider:** Studio Zero, Inc., 1209 Orange Street, Wilmington, DE 19801, USA
- **EU representative:** _(placeholder — to be appointed by M2; see `legal/privacy-policy.md` §12)_
- **Type of AI system (Annex III mapping):** Studio Zero produces **AI-generated content** within the scope of Art. 50(2) — it generates synthetic text (audit findings, recommendations, summaries) that a user might publish or otherwise rely on. We assess Studio Zero is **not** a high-risk AI system within Annex III categories (the system does not make decisions about access to employment, credit, education, biometric categorization, law enforcement, etc.). It is a general-purpose advisory tool for software quality.
- **System availability:** Web service at `studiozero.dev`; CLI via npm; APIs documented at `docs/api/`.

## 2. Intended use

### 2.1 What Studio Zero does

Studio Zero performs automated audits of software artifacts — repositories, URLs, codebases — and produces:

- A graded checklist of findings (defects, gaps, recommendations), each with a file path, line range, severity, and suggested fix.
- A readiness score (0–100) based on a documented rubric.
- A verdict (PASS / PASS WITH FIXES / FAIL) with the cited evidence.

### 2.2 Intended users

- Solo founders and indie agencies building software with AI builders (the primary MVP audience per `PRD.md` §3a).
- Engineering teams seeking an independent audit before launch.
- Compliance teams measuring WCAG 2.2 AA conformance, FTC AI substantiation, or similar.

### 2.3 Out-of-scope uses

- **Not a security pentest.** Studio Zero does not exploit vulnerabilities; it identifies risk surface. Engage a qualified pentest vendor (see `compliance/pentest-engagement-2026.md`).
- **Not a legal opinion.** A WCAG finding is a technical observation, not a legal certification.
- **Not a substitute for human judgment.** The audit verdict is advisory; you decide whether to act.

## 3. Underlying foundation models

Studio Zero's AI capability is provided by **Anthropic's Claude** family of large language models. We use Anthropic's commercial API; we do **not** retrain or fine-tune Claude models.

### 3.1 Pinning posture at v0.5 (HONEST STATEMENT)

PRD §14.5 + R16 specify that the runner pins to specific Claude model versions in a checked-in artifact at `runner/llm/pinned-versions.json`. **As of M2 (commit window covering v0.5 of this System Card), that artifact does not yet exist in the repository.** The runner-pool scaffolding lives at `apps/runner/` (Forge M1 Batch 2 deliverable) and the LLM gateway is at `supabase/functions/llm-gateway/` (Edge Function — Forge M1 Batch 2); pinning is enforced at the gateway via environment variables (`ANTHROPIC_MODEL`, `ANTHROPIC_MODEL_FALLBACK`) configured per environment by Terra.

This System Card does not name a specific Claude model version because the **pinned-versions.json contract has not yet shipped**. Comply commits that v0.6 (M3 increment) or v1.0 (V1.5 increment) will:

1. Cite the actual `runner/llm/pinned-versions.json` artifact with the model version strings (e.g., `claude-sonnet-4-5-20251022`) once Forge commits it; and
2. Document the drift-dashboard nightly check that compares production model version against the pinned manifest, with the manual-gate mechanic that prevents an unintended pin change reaching production.

Until the pinned-versions.json contract is live, the System Card is honest about the gap. The interim pinning mechanic (env-var-based at the LLM gateway) is described in the threat-model.md R16 row and is sufficient as a stopgap; the System Card commitment is that the version-controlled JSON manifest is the M3/V1.5 hardening.

### 3.2 Anthropic published model cards (authoritative source)

For each Anthropic model in use, Anthropic's published model card is the authoritative source on:

- Training data summary (curated web data; Anthropic's training-data policy at https://www.anthropic.com/legal/aup).
- Capability and limitation evaluations.
- Safety evaluations.
- Known biases and mitigations.

Customers who require a specific Claude version pin (e.g., for a regulated industry that has accepted a particular Anthropic model card) can request that in writing to `comply@studiozero.dev`; Comply triages with Forge.

## 4. How Studio Zero composes the underlying model

Studio Zero does not just call the API. Around the LLM, we run:

- A **prompt orchestration layer** (`agents/*`, the 56-agent system) that decomposes audit tasks into role-scoped prompts.
- An **evidence-gathering pipeline** that captures screenshots, transcripts, file excerpts, and Lighthouse runs to ground each finding.
- A **score engine** (`runner/score-engine/`) that converts findings to a numeric score using a documented rubric with severity weights (Blocker / Critical / Major / Minor / Polish per `agents/audit/jury.md`).
- A **runner middleware** that redacts secrets and PII from prompts before transmission and from responses before storage.
- A **Jury cross-check** (multi-agent agreement step) that flags low-confidence findings for human review.

The composition is documented in `SYSTEM_ACHITECTURE.md` and `runner/README.md` (M2 — currently scaffolding).

## 5. Risks and mitigations

| Risk                                                          | Description                                                                                                                                       | Mitigation                                                                                                                                                                                                                                                                                                                                                                                    | Status                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Hallucinated findings**                                     | LLM cites a line that does not exist, recommends a fix that does not apply                                                                        | Evidence-gathering pipeline grounds every finding in a file path + line range that the runner re-verifies before emitting; Jury cross-check flags ungrounded findings                                                                                                                                                                                                                         | In place at M1; quantified in v1.0                               |
| **Missed defects (false negatives)**                          | LLM fails to flag a defect a human reviewer would catch                                                                                           | Score engine version-stamped on every verdict; first-audit FAIL rate target ≥70% (PRD §15) keeps the rubric Strict-elite; self-dogfood gate runs Studio Zero on its own code at every milestone                                                                                                                                                                                               | In place at M1; FAIL rate measured at MVP +90d                   |
| **Biased outputs**                                            | LLM produces findings that reflect training-data biases (e.g., language flagged as "non-standard" when it is regionally common)                   | Anthropic's safety-tuned models are the floor; our prompts avoid biased anchors; findings carry the cited evidence so customers can independently evaluate                                                                                                                                                                                                                                    | In place at M1; reviewed quarterly                               |
| **Offensive or harmful language in outputs**                  | LLM emits offensive content despite content filters                                                                                               | Anthropic's safety filters + our prompt template + dispute path (`legal/terms-of-service.md` §14)                                                                                                                                                                                                                                                                                             | In place at M1; report path: `abuse@studiozero.dev`              |
| **Prompt injection via submitted code or URLs**               | Adversarial input attempts to subvert the audit                                                                                                   | Runner middleware strips control sequences; runner workers are rootless + egress-allowlisted (ARCH-D9); a documented prompt-injection corpus (`runner/fixtures/pi-corpus/`) is part of CI from M1                                                                                                                                                                                             | In place at M1                                                   |
| **Secret leakage in findings**                                | LLM echoes back a secret it saw in the code                                                                                                       | Pre-prompt redaction middleware with a 30-format corpus; post-response scrubber; integration test `tests/security/redaction-middleware.spec.ts` is a PR-blocking gate                                                                                                                                                                                                                         | In place at M1                                                   |
| **Cross-tenant data leak via shared model**                   | One customer's code contaminates another customer's run                                                                                           | Tenant isolation via per-run prompt scoping (no cross-run context); single-tenant container per run on Railway; RLS enforces DB-level isolation; tested by `tests/acceptance/goal-5-rls-cross-tenant.spec.ts`                                                                                                                                                                                 | In place at M1                                                   |
| **Provider concentration on Anthropic**                       | Service availability depends on Anthropic API uptime + content moderation                                                                         | Provider abstraction in `runner/llm/`; second-provider option scoped at V2 (R9 mitigation)                                                                                                                                                                                                                                                                                                    | Abstraction in place at M1; second provider deferred             |
| **Score-engine drift across model versions**                  | A pin change shifts the score distribution                                                                                                        | Verify nightly drift dashboard; pins committed to `runner/llm/pinned-versions.json`; manual gate before unpinning (R16)                                                                                                                                                                                                                                                                       | In place at M1                                                   |
| **Regulatory drift**                                          | EU AI Act, state AI laws, sectoral guidance shift the disclosure floor                                                                            | Comply re-verifies this System Card quarterly; the v1.0 ship before V1.5 includes the latest binding requirements                                                                                                                                                                                                                                                                             | Ongoing                                                          |
| **LLM cost overrun in Managed tier (R1)**                     | A pathological customer (or runaway agent loop) burns tokens faster than the per-tenant subscription tier accounts for; Studio Zero eats the loss | **LIVE at M2.** Per-tenant daily token-usage rollup (`tenant_token_usage_daily` table) + `check_token_budget(uuid)` function in `architecture/database/migrations/0003_billing_managed.sql` §C. LLM gateway pre-flights the function and returns `429 / token_budget_exceeded` once month-to-date cost >= 110% of the tenant's budget (10% headroom is the documented grace before hard-cut). | LIVE at M2; load test at `tests/load/per-tenant-token-cap.k6.js` |
| **Per-tenant attribution leak via analytics (Cipher Fix-3b)** | Raw `tenant_id` UUID transmitted to PostHog would let an observer with PostHog access enumerate Studio Zero's customer graph by tenant            | **LIVE at M2.** `tenant_id` is HMAC-SHA256-hashed (keyed on `POSTHOG_HASH_SALT`) into `tenant_hash` before any transmission to PostHog; PostHog never sees the raw UUID. Implementation at `apps/web/lib/analytics-gate.ts:147-203`. Salt rotates on the Cipher 90-day cadence (`finance/stripe-config.md` §1.2).                                                                             | LIVE at M2                                                       |

## 6. Performance metrics (placeholder)

v0.1 publishes the **metric framework**; v1.0 publishes the **measured values** with confidence intervals.

| Metric                                        | Definition                                                                                          | v0.1 status                                            | v1.0 target                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| **Finding precision**                         | Fraction of findings that a human reviewer agrees with on blind re-review                           | TBD (M3 self-eval; v1.0 includes third-party reviewer) | Reported with 95% CI                          |
| **Finding recall (against synthetic corpus)** | Fraction of seeded defects detected on `runner/fixtures/synthetic-repo-fail`                        | TBD                                                    | Reported with 95% CI                          |
| **Score reliability**                         | Test-retest score variance on the same artifact across 5 runs                                       | TBD                                                    | < 5 points stddev                             |
| **Time to first verdict (TTFV) p95**          | From signup to first audit verdict                                                                  | M1 target: < 8 minutes                                 | Maintained at MVP launch                      |
| **Audit completion rate**                     | Full audits that complete vs. those that abort                                                      | M1 target: > 80%                                       | Maintained                                    |
| **Cross-mode consistency**                    | Score drift between BYOK / CLI / Managed for the same artifact                                      | TBD (Verify nightly drift dashboard, R16)              | < 5 points                                    |
| **Dispute upheld rate**                       | Fraction of in-app disputes that result in a refund (under-detection or over-flagging by the audit) | TBD                                                    | < 10% — high disputes signal a rubric problem |

## 7. Data governance

How we handle the data Studio Zero consumes and produces:

- **Training data:** none — we do not train or fine-tune. The underlying Claude models' training data is Anthropic's responsibility and is documented in their published model cards.
- **Customer code in prompts:** transient. Cleared from the runner's heap after the LLM call returns; verified by `tests/acceptance/goal-4-three-modes.spec.ts` BYOK heap-scan assertion.
- **Findings:** retained per `legal/privacy-policy.md` §3 — 24 months default; customer can export and delete.
- **Telemetry on runs:** retained 24 months; not customer-overridable; used for SLO history and score-engine version control.
- **No training of models on customer data.** Confirmed contractually under Anthropic's Commercial Terms; documented in `legal/terms-of-service.md` §11.

## 8. Transparency commitments

Beyond what the EU AI Act Article 50 requires, Studio Zero commits to:

- **Disclose on every response.** `X-AI-Generated: studio-zero` HTTP header + `<meta name="ai-generated" content="studio-zero">` meta tag on every page. **LIVE since M0/M1** at `apps/web/lib/ai-disclosure.ts` and `apps/web/next.config.ts`; verified by `tests/integration/disclosure-headers.spec.ts`.
- **Publish this System Card.** LIVE at `https://studiozero.dev/system-card`. Version-controlled. Updated at least quarterly. Source-of-truth: this Markdown file at `legal/ai-system-card-v0.5.md`.
- **Substantiate marketing claims.** Every claim referencing competitors or capabilities is backed by a file at `marketing/claims-substantiation/<claim-id>.md` (per PRD §14.5).
- **Provenance for AI-authored artifacts (Auto-PR — V1.5, NOT M2).** When V1.5 Auto-PR ships, each PR will carry an `AI-Authored: studio-zero/runner@v<x.y.z>` Git trailer per California SB 942 and Art. 50 transparency posture. **M2 does NOT ship the Auto-PR PR-body disclosure** — Auto-PR itself is deferred to V1.5 per PRD §17 D3, so this commitment binds at V1.5 launch, not at M2. The interim disclosure (header + meta tag + System Card) is sufficient under Art. 50 for the audit-verdict output flow we ship today.
- **Annual transparency report.** Starting M5, an annual report covering law-enforcement requests, AUP enforcement actions, breach disclosures, and System Card revisions.

## 9. Updates and versioning

This System Card is updated:

- **Quarterly minimum.** Comply re-verifies on a quarterly cadence; new version published with a changelog.
- **On material change.** If we add a new underlying model, change the prompt orchestration meaningfully, ship Auto-PR (V1.5), or onboard a new modality, the System Card updates within 30 days of the change going live.
- **On regulatory change.** If the EU AI Act, state AI laws, or sectoral guidance change the substance of what must be disclosed, the System Card updates before the change binds.

Version history is at `https://studiozero.dev/system-card/changelog`.

### 9.1 Version-to-version changelog

- **v0.1 (2026-05-12 — M1 Batch 3).** First placeholder publication. Disclosure machinery (header + meta tag) live since M0; substantive System Card placeholder seeded.
- **v0.5 (2026-05-12 — M2 Batch 2).** Honest pinning posture (§3 — no fabrication about `runner/llm/pinned-versions.json`, which is not yet committed); R1 token-budget cap row added to risks (§5 — LIVE in `0003_billing_managed.sql`); Cipher Fix-3b tenant_hash row added to risks (§5 — LIVE in `apps/web/lib/analytics-gate.ts`); Auto-PR V1.5 disclosure deferral documented explicitly in §8.
- **v0.6 (M3 target).** Cite the actual `runner/llm/pinned-versions.json` once Forge commits it; drift-dashboard nightly check documented in detail.
- **v1.0 (V1.5 target — before Auto-PR launch).** Full performance metrics with confidence intervals (§6 measured values, not just framework); third-party-verified risk register; Auto-PR PR-body provenance trailer live per §8.

## 10. Contact

- **EU AI Act inquiries:** `comply@studiozero.dev`
- **System Card content:** `comply@studiozero.dev` + cc `legal@studiozero.dev`
- **Disputes about a specific verdict:** in-app Dispute Finding flow + `comply@studiozero.dev` (see `legal/terms-of-service.md` §14)
- **EU representative:** _(placeholder — to be appointed by M2 ship)_

---

_Comply releases this AI System Card v0.5 on 2026-05-12 (M2 Batch 2 — replaces v0.1 placeholder; M2 facts incorporated). Next scheduled re-verification: 2026-08-12 (before EU AI Act Art. 50 binding date of 2026-08-02 — v0.6 will land by that date with the EU Representative appointed and the pinned-versions.json artifact in place once Forge commits it). Full v1.0 ships before V1.5 Auto-PR launch._
