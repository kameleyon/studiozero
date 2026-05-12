# Studio Zero — Terms of Service: Build Mode Extension

**Version:** 1.0 (V2 Batch 1 — Build mode launch)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer) — co-signed by BigBrain (product), Penny (pricing), Jury (audit-gate disclaimer)
**Status:** **INCORPORATED BY REFERENCE INTO `legal/terms-of-service.md`.** When the customer subscribes to Managed Pro at V2 or activates a Build mode session, these terms bind alongside the base Terms of Service. Where a provision below conflicts with the base ToS, the more specific provision in this extension controls for Build mode interactions only.
**PRD anchors:** §4 V2 Goals (Build mode), §7.3 Build Workflow, §12 Pricing & Tiers (Managed Pro includes 1 build/mo; overage pricing — Penny refines post-V2)
**Cross-references:** `legal/terms-of-service.md` (base ToS), `legal/aup.md` (Acceptable Use Policy), `legal/privacy-policy.md`, `legal/ai-system-card-v1.5.md` (Build mode AI System Card extension), `legal/data-processing-agreement.md` (Art. 28 DPA), `architecture/database/migrations/0009_build_mode_v2.sql` (Build mode schema), `architecture/schemas/brief.v1.schema.json`, `architecture/schemas/roadmap-bundle.v1.schema.json`, `compliance/v2-compliance-audit.md` (V2 scorecard), `sprint/milestone-V2.md`, `finance/refund-matrix.md`
**Voice:** plain English, grade-9 ceiling, sentence case per `brand/voice.md`. We say what we mean; we name the IP allocation in the first paragraph because that's the question every Build mode customer asks.

> **Plain-English mandate.** The single most important question in a generative-software service is "who owns the output?" This extension answers it in the first substantive section, in plain words, before any defined terms. We then explain the limits — what we keep, what we license back to you, what you warrant, and what the audit gate is not. Everything else is mechanics.

---

## 1. Scope

This extension applies whenever you (the customer) use **Build mode** — the V2 feature that takes a product description from you, generates a structured brief, dispatches Studio Zero's multi-layer agent system, runs the Jury audit gate against the result, and delivers a roadmap + documentation bundle (optionally seeded into a GitHub repo, and at V2.1, optionally with a working scaffold). The base Terms of Service govern your account, payment, suspension, dispute, governing law, and arbitration. This extension adds the Build-mode-specific provisions: who owns the output, what we keep, what you warrant, what the audit gate is not, and how Build mode is priced.

If you only use Audit mode, this extension does not apply to you. If you use Build mode, every provision below binds in addition to the base ToS.

---

## 2. Output ownership — the customer owns the deliverables (PRD §4 V2)

**You own the output Studio Zero produces for your build.** Concretely, this means:

- **The roadmap and documentation bundle.** Every markdown file, every milestone, every architecture diagram, every PRD section, every brand-token JSON file, every voice document, every decision-log entry, every risk-register row, every COGS analysis, every channels recommendation, and every README we produce as part of a Build mode delivery is **your property**. You may publish it, modify it, sell products built on top of it, sub-license it, or destroy it. You do not need our permission and you do not owe us a royalty.
- **The seeded GitHub repository.** When your `output_preference` is `roadmap_docs_seed` or `roadmap_docs_seed_scaffold` (the V2 default) and we seed a repository into your GitHub account, the repository — including the milestones, issues, README, ARCHITECTURE.md, and scaffolded folder structure — is **your property** from the moment of seeding. Studio Zero's GitHub App had write permission to create the repo on your behalf; that permission terminates with the seeding event unless you separately enable our Auto-PR feature on the same repo. We do not retain a copy of the seeded repository; the GitHub API call that creates it is the only persistence on our side.
- **The scaffold / MVP code (V2.1).** When V2.1 ships and your `output_preference` is `roadmap_docs_seed_scaffold` and the audit gate passes on the scaffold, the working scaffold code is **your property** under the same terms.
- **Derived works.** Anything you build on top of the bundle (your product, your repo's commits after seeding, your modifications to the scaffold) is yours. We claim no derivative right.

This is the load-bearing clause of this extension and we will not soften it. The first paragraph of the AI System Card v1.5 §2.1 says the same thing in product language.

### 2.1 What "you own" means in copyright terms

Where applicable copyright law recognizes an authorship interest in AI-generated output, Studio Zero **assigns** to you, effective on delivery, every right, title, and interest Studio Zero or its affiliates may hold in the bundle, the seeded repository, and the scaffold (V2.1+) produced for your build. Where applicable copyright law treats AI-generated output as ineligible for copyright protection (e.g., the current U.S. Copyright Office position on works lacking a human author), the assignment is moot but the practical posture is identical: **we don't hold an exclusive right and we don't claim one.**

### 2.2 What we keep — the rubric, not the output

Studio Zero retains all rights, title, and interest in:

- The **score engine** (`architecture/schemas/score_engine.v1.json`), the **audit rubric**, and the **Jury + 6-reviewer** evaluation methodology — including the prompts, the orchestration logic, the layer dispatch pattern, and the BUILD_FLOW.md methodology document.
- The **runner**, the **agent system**, the **CLI**, the **web app**, and the underlying source code of the Studio Zero service. None of these are licensed to you under this extension; the base ToS §4 (Permitted Use) defines what you may do with the service itself.
- The **patterns, heuristics, and prompt templates** Studio Zero uses internally to produce bundles. The output of those templates is yours; the templates themselves are ours.

The distinction is the difference between "we wrote you a book" and "we sold you a printing press." You own the book. The printing press is ours.

### 2.3 What we license you — application of the rubric

Studio Zero grants you, effective on delivery, a worldwide, perpetual, royalty-free, sublicensable license to apply the audit rubric Studio Zero ran against your bundle to **your own subsequent work** — meaning you may use the score and verdict from your delivered build as a benchmark in your own marketing or due-diligence, you may run your own informal application of the rubric against your derivative work, and you may share your bundle's verdict + score publicly. This license does not authorize you to operate a competing audit-as-a-service product against third parties using the rubric as your engine.

---

## 3. What you warrant about your idea

When you submit an idea description to Build mode, you warrant that:

- **The idea description doesn't infringe third-party IP.** You either own the idea, have the right to commission a build of it, or the idea is sufficiently abstract that no IP claim attaches. If your idea description quotes copyrighted text, embeds a competitor's trademark, names a real person without consent for a derogatory portrayal, or otherwise injects third-party IP, **that injection is your responsibility, not ours**. We do not screen idea text against the trademark register or copyright catalog.
- **The idea is lawful to build.** You are not asking us to produce a roadmap for content the AUP (`legal/aup.md`) forbids, including but not limited to: child sexual abuse material; weapons of mass destruction; malware command-and-control infrastructure; systems whose primary purpose is to violate laws of your jurisdiction or ours; surveillance products targeting natural persons under EU AI Act Art. 5 prohibited practices; biometric identification or categorization products without a separate Comply review.
- **You have authority to commit to the build.** If you are agreeing on behalf of an organization, your authority has not been revoked.

Breach of any of the above is a material breach of the base ToS and these extension terms. We may suspend the build, refuse delivery, and (where appropriate) refer the matter to law enforcement.

### 3.1 Your indemnity for idea-side IP claims

You will defend, indemnify, and hold Studio Zero harmless from any claim by a third party that your idea description, as submitted by you, infringes that third party's IP. This is a customer-side indemnity: Studio Zero did not write your idea description; you did. (The base ToS §11 indemnity covers Studio Zero's side of the equation. The two are complementary.)

---

## 4. Similarity, plagiarism, and attribution

### 4.1 What AI output may resemble

Generative AI systems can produce output that resembles publicly available reference material. Studio Zero's bundles are produced by Anthropic's Claude family of large language models (see the AI System Card v1.5 §3 for the foundation-model identification). Although Studio Zero does not retrain or fine-tune on customer or third-party code, **the underlying foundation model was trained on data that includes public software, public documentation, public design language, and public marketing copy**. As a consequence:

- Your bundle's roadmap, PRD, architecture document, brand tokens, voice document, decisions log, risks register, COGS analysis, channels analysis, README, and (V2.1+) scaffold code may bear **stylistic, structural, or substantive similarity** to publicly available references that you did not name.
- A milestone exit gate Studio Zero produces for you may resemble a milestone exit gate Studio Zero (or another generative system) has produced for a different customer building a similar product.
- Brand-token color values, typography choices, and naming conventions may resemble those of public design systems Studio Zero is familiar with.

This is a property of the generative AI category, not a defect of Studio Zero specifically.

### 4.2 Your responsibility to verify

You are responsible for **verifying** that the bundle as delivered does not infringe a specific third party's IP or trademark before you publish, deploy, or build against it. Studio Zero does not run a similarity search against public repositories, the trademark register, or copyright filings before delivery. The audit gate (PRD §7.3 step 7) is an opinion on **product readiness against your brief**, not a legal IP-clearance certification — see §5 below.

If you publish a bundle component that turns out to substantially copy a third-party reference, that is your decision to publish. We are not your publisher and we are not your IP-clearance counsel.

### 4.3 The dispute path

If you believe Studio Zero produced a bundle component that demonstrably copies a third-party reference at a level that exceeds incidental similarity, file a dispute via the in-app dispute flow (or by emailing `comply@studiozero.dev`) within the cooling-off window per `compliance/d22-cooling-off-flow.md`. Refunds for similarity disputes are evaluated on case-by-case basis by Comply per the base ToS §14 dispute procedure.

---

## 5. The audit gate is an opinion, not legal certification

PRD §7.3 step 7 requires the Jury audit gate to verdict PASS or PASS WITH FIXES before the bundle is delivered. The gate is run by Studio Zero's audit reviewers (Jury, Optic, Proof, Halo, Compass, Trace, Canon) against the generated artifact. Its purpose is to **catch quality regressions** before delivery — missing milestones, contradictory PRD goals, brand tokens that drift from the requested vibe, accessibility gaps in the scaffold (V2.1+), inconsistent voice across documents, and so on.

**The audit gate is not:**

- A **legal opinion**. A PASS verdict does not certify that the bundle complies with any specific law, regulation, or industry standard. If your build is in a regulated context (healthcare, finance, child-directed services, biometric-adjacent), engage qualified counsel separately.
- A **security pentest**. The scaffold (V2.1+) is not pentested before delivery. The audit gate's `Trace` reviewer evaluates flow and logic; it does not run an exploitation suite.
- A **patent or trademark clearance**. We do not screen against the trademark register, the patent database, or copyright filings.
- A **substitute for human judgment**. As with audit mode (base ToS §2.3), the gate is advisory. The decision to ship what we delivered is yours.

### 5.1 What PASS WITH FIXES means in Build mode

A `PASS WITH FIXES` verdict on the bundle means the audit reviewers found one or more recommended changes that fall below the FAIL threshold. The bundle delivers; the recommended changes are surfaced in the bundle's `risks` and `decisions` components and (where applicable) in the seeded GitHub repo's issue list. You may merge the bundle as-is or address the fixes before shipping.

### 5.2 What FAIL means in Build mode

A `FAIL` verdict refuses delivery. Schema-side, `builds.state` lands on `audit_gate_failed` instead of `delivered` (architecture/database/migrations/0009_build_mode_v2.sql §D `builds_delivered_verdict_required` CHECK). You are entitled to a refund per the regional refund matrix (`finance/refund-matrix.md`) and the AI System Card v1.5 §7 build-refunded ledger row is written. You may re-submit the brief (with adjustments) for a fresh build at no additional charge if Comply determines the FAIL was attributable to Studio Zero (e.g., layer-lead infrastructure failure) rather than to a brief-side issue.

---

## 6. Pricing — Managed Pro inclusion + overage (PRD §12)

### 6.1 Included in Managed Pro

Build mode is included in **Managed Pro at $249/mo**. Each Managed Pro month includes **one (1) build** under these terms. A build is consumed when `builds.state` enters `layers_dispatching` (i.e., after you confirm the BigBrain brief and the multi-layer dispatch starts). Builds in earlier states (created, queued, brief_generating, brief_pending_confirmation) do not consume your monthly quota — you may abandon a build during brief review without burning your inclusion. The included build resets on the first day of your billing month per Stripe's invoice cycle.

### 6.2 Overage

Additional builds beyond the included one within a single billing month are billed at **$499 per build** per PRD §12. The overage charge is captured at brief confirmation (the `build_brief_confirmed` audit_action ledger row, alongside the Stripe payment intent). If the build subsequently FAILs the audit gate or you cancel within the cooling-off window, the overage charge is refunded per `finance/refund-matrix.md`. Penny refines the overage pricing after the first cohort of V2 customers per PRD §12 footnote; this clause is subject to a price update no more frequently than once per 90-day Comply review cycle. Existing in-flight builds at the time of any price change are honored at the rate captured at brief confirmation.

### 6.3 Builds while not subscribed to Managed Pro

Build mode is not available on Free, BYOK Starter, BYOK Pro, Managed Starter, or CLI tier in V2. If you wish to use Build mode, upgrade to Managed Pro. (Penny may surface a Build-only SKU after the first V2 cohort; that decision is not made in this extension.)

### 6.4 Cooling-off and refund mechanics

Build mode obeys the same regional refund matrix as the base service (`finance/refund-matrix.md`) and the D22 cooling-off rules in `compliance/d22-cooling-off-flow.md`. Each Build overage charge opens a fresh D22 window per Decision D22 (PRD §17 D22 — locked v0.5). Refunds are captured to `builds.refunded_at` + `builds.refunded_amount_micros` and ledgered under the `build_refunded` audit_action (migration 0009 §F).

---

## 7. Tokens and LLM cost amplification

Build mode consumes significantly more LLM tokens than a single audit run — every layer-lead dispatch is its own multi-turn agent loop, and the audit gate runs a full reviewer panel against the generated artifact. This is the "LLM cost amplification" risk recorded in the AI System Card v1.5 §7 risk register.

Because Build mode is Managed Pro only (§6.3), **tokens are included in your subscription** — there is no BYOK pass-through clause for Build mode in V2. The base ToS §6 BYOK provisions do not apply to Build mode.

The internal cost amplification means a runaway build that exceeds per-tenant token budgets is hard-capped by the `check_token_budget()` function from `0003_billing_managed.sql` and the per-tenant budget headroom set by Penny. A build that would breach the 110% headroom is **paused** at the offending layer dispatch, not silently truncated; you are notified and Comply triages whether to credit the build or to flag the brief for revision. This is the same R1 mitigation that applies to audit mode, scaled for Build's amplified token profile.

---

## 8. Data retention specific to Build mode

The base privacy policy (`legal/privacy-policy.md`) governs the retention of audit data. Build mode adds:

- **Brief inputs (`builds.idea`, `builds.target_audience`, `builds.vibe`, `builds.constraints`):** retained for the lifetime of your tenant per `legal/privacy-policy.md` §3 — these are part of your project history. You may delete a build (members have DELETE on `builds` per the RLS policy in 0009 §H.1); cascade reaps the artifacts and events.
- **The BigBrain brief (`builds.brief`):** retained alongside the build. Comply may access the brief during a dispute review (`legal/data-processing-agreement.md` §8 sub-processor purpose).
- **The bundle artifacts (`build_artifacts.storage_path`):** retained for the lifetime of the build row. Cryptoshredded on tenant deletion per the existing `tenants` ON DELETE CASCADE rules.
- **The build_events log:** append-only for the build's lifetime; reaped on `builds` row deletion via FK CASCADE.

You may export any Build artifact via the existing data-export flow (GDPR Art. 20 + `compliance/m4-compliance-audit.md` §2.4).

---

## 9. Sub-processors

Build mode uses the same sub-processor set as audit mode (`legal/subprocessors.md`) with two additions:

- **GitHub** (when `output_preference` is `roadmap_docs_seed` or `roadmap_docs_seed_scaffold`): the seeded repository is created in your GitHub account via the Studio Zero GitHub App. GitHub is your data controller for the seeded repo from the moment of seeding; Studio Zero's role is the mechanical creation call.
- **Supabase Storage** (bucket `build-artifacts`): bundle artifacts are persisted here under per-tenant prefix. Supabase is already a sub-processor per `legal/subprocessors.md`; the bucket addition does not introduce a new vendor.

No additional sub-processor is added for the LLM tier — Anthropic remains the foundation-model provider per AI System Card v1.5 §3.

---

## 10. Disclaimers in plain language

We are saying the following in plain English so there is no ambiguity:

- **Studio Zero does not promise your product will succeed.** Build mode delivers a roadmap and documentation. Whether your product finds product-market fit is up to you, the market, and a thousand other variables we have no say in.
- **Studio Zero does not promise the audit gate will catch every defect.** The gate is an opinion-based quality screen, not a guarantee of completeness. The base ToS §10 AI disclaimer extends to Build mode without modification.
- **Studio Zero does not promise the seeded repository will compile, build, or deploy without modification.** In V2 the seeded repo is a scaffold + milestones + issues + README + architecture doc — it is a starting point. In V2.1+, when scaffold code ships, it is audit-gated for quality, not for environment-specific compilability.
- **Studio Zero does not warrant the bundle is free of similarity to third-party references.** §4 above governs.
- **Studio Zero does not warrant the bundle is legally compliant in your jurisdiction or industry.** §5 above governs.

These disclaimers do not limit any non-waivable consumer protection right you have under the laws of your country of residence (see base ToS §17 governing law and §10 AI disclaimer).

---

## 11. Updates to this extension

We may update this extension. We will notify you in-product or by email at least 30 days before a material change takes effect, except where the change is required by law (in which case we notify you as soon as practical). Continued use of Build mode after the effective date of an update constitutes acceptance. If you do not accept an update, you may cancel Managed Pro per the base ToS §13.

---

## 12. Contact

- Build mode disputes: in-app dispute flow + `comply@studiozero.dev`
- IP / similarity escalations: `legal@studiozero.dev` cc `comply@studiozero.dev`
- General contact: see base ToS §18.7

---

_Comply locks this Build Mode Extension at v1.0 on 2026-05-12 (V2 Batch 1 — Build mode launch). Re-verify quarterly with the System Card cadence (next: 2026-08-12). Penny revisits §6 pricing after the first 5 V2 customers and surfaces a recommendation; any pricing update requires a re-version of this extension._
