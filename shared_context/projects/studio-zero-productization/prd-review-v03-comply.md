# PRD v0.3 — Comply Review (Legal / Regulatory Compliance Lens)

**Reviewer:** Comply (Operations — Compliance Officer)
**Document under review:** `PRD.md` v0.3 (2026-05-10)
**Cross-referenced against:** v0.2 self-audit synthesis, BIGBRAIN Hard Rules, Jury severity rubric
**Date:** 2026-05-10

---

## Verdict

**FAIL — DO NOT SHIP M0 SPIKE UNTIL BLOCKERS CLEAR.**

The PRD has matured well on security and architecture between v0.2 and v0.3, but the **legal surface area is essentially unaddressed**. Six Blockers exist independent of any code change — they are documentation, policy, and contract gaps that turn the M1 launch into an avoidable lawsuit magnet (CFAA exposure on URL audits, missing Article 28 GDPR DPA for Managed-tier customers, refund policy that does not survive EU/UK consumer-rights law, and no Art. 50 EU AI Act disclosure framework with the regulation 90 days from binding force on 2026-08-02). The wedge product — "independent audit" — is also the product that legally requires the most defensible privacy, IP, and AI-transparency hygiene we ship, and right now those clauses do not exist in writing.

The good news: nearly every Blocker below resolves with **paper, not engineering**. Most cost less than a day each. None of them require slipping the M0 spike date.

---

## Blockers (must fix before M0 — paper instruments + § rewrites)

### LB1. CFAA / Computer Fraud and Abuse Act exposure on Deployed-URL audits (§7.2 Step A)
**Severity:** Blocker. **Regulation:** 18 U.S.C. § 1030 (CFAA); Computer Misuse Act 1990 (UK); EU NIS2 Art. 32 in some Member State transpositions.
**Problem.** §7.2 Step A and §9.1 ("Surface" product) accept a deployed URL and dispatch a headless browser audit. Nothing in the PRD requires the customer to **warrant they own or are authorized to audit** that URL. If a customer enters a competitor's URL — or a URL they used to administer but no longer have rights to — Studio Zero is the *direct* unauthorized accessor; the customer is at most an aider-and-abettor. CFAA § 1030(a)(2) and (a)(5) have been read to cover automated crawling against the operator's wishes (*hiQ v. LinkedIn* notwithstanding — that case turned on public access, our scope is broader: we render JS, execute interactive flows, and emit a rendered DOM dump as "evidence" which is functionally a derivative work).
**Redline.** Add §7.2 Step A.0: *"Before any Surface or Full audit runs against a URL the customer did not also provide source for, the customer must affirmatively accept the URL Audit Authorization clause: 'I warrant that I own, operate, or am authorized by the operator to audit this URL, and I indemnify Studio Zero against any third-party claim arising from this authorization being incorrect.' The acceptance is logged with timestamp, IP, account ID, and full URL to the `audit_logs` table for 7 years."* Mirror clause goes into ToS §X (Authorization of Targets).
**Cost.** 1 checkbox + 1 ToS clause + 1 audit_logs row. <1 day.

### LB2. No Article 28 GDPR Data Processing Agreement for Managed-tier customers (§7.2, §8, §13.4)
**Severity:** Blocker. **Regulation:** GDPR Art. 28 (processor obligations), Art. 26 (joint controllers); UK GDPR equivalent.
**Problem.** In Managed mode, Jo is processing the customer's data (their codebase, their findings, potentially PII inside their codebase if it's a CRM or healthcare product). The customer is the controller; Jo is the processor. Art. 28(3) mandates a written contract specifying: subject matter, duration, nature/purpose of processing, type of personal data, categories of data subjects, controller's rights and obligations. **No standalone DPA is referenced anywhere in the PRD.** Without it, any EU/UK Managed customer triggers a regulatory breach the moment their first byte hits our infra. ICO fines start at 2% global turnover.
**Redline.** Add §14.5.2: *"All Managed-tier and BYOK customers operating in the EU/UK/EEA are required to execute Studio Zero's standard DPA at signup. The DPA is presented as a click-through during checkout for self-serve plans and as a counter-signed instrument for enterprise customers. A Subprocessor List (Anthropic, Supabase, Stripe, Sentry, PostHog, Vercel/GitHub) is published at `/legal/subprocessors` and changes trigger 30-day customer notice."* Add §17 Decision #17: "Comply drafts DPA + Subprocessor list before M3 Managed launch; cannot launch Managed without it." Drop into M0 deliverables list.
**Cost.** 2-3 days for Comply + Scribe to draft the DPA from SCCs + EDPB recommendations. M3 blocker, not M1.

### LB3. EU AI Act Art. 50 transparency obligation — Studio Zero IS an "AI system that interacts with natural persons" generating content (§9, §11.2, §14.5)
**Severity:** Blocker. **Regulation:** Regulation (EU) 2024/1689 (AI Act), Art. 50 — effective **2026-08-02** (90 days after this PRD's date).
**Problem.** §14.5 mentions "AI disclosure copy required on every audit report" — that's necessary but **wildly insufficient** for what AI Act Art. 50 actually demands. Art. 50(1) requires: providers of AI systems intended to interact with natural persons must ensure those persons are informed *that they are interacting with an AI system* in a clear, distinguishable manner, no later than first interaction. Art. 50(2) requires synthetic/generated content (the auto-PR code in §11.2, the recommendations in §9.3) to be marked as artificially generated in a **machine-readable format**. Studio Zero hits both: the audit report is AI-generated and presented to natural persons; the Auto-PR delivers AI-generated code into a customer's repo where third parties (their employees, their auditors, their acquirers) will encounter it without knowing.
**Redline.**
- §14.5 expanded to: *"Every audit report, every finding, and every Auto-PR ships with a machine-readable AI Disclosure (per EU AI Act Art. 50 effective 2026-08-02): an HTTP header `X-AI-Generated: true; system=studio-zero; version=<runner-version>; model=<llm-id>`, a JSON-LD block in the PR body, and a human-readable banner. The Auto-PR description includes a section titled 'AI-Generated Content Disclosure' listing the originating finding IDs, the model that drafted the change, and a link to Studio Zero's AI System Card."*
- §11.2 redline: *"The PR description must contain an AI-Generated Content Disclosure block. Customer's downstream IP/licensing audit trail depends on this being machine-readable and persistent in git history."*
- §17 add Decision #18: *"AI System Card published at `/legal/ai-system-card` before public M5 launch. Includes: intended purpose, populations served, training data attribution (we don't train; we wrap Anthropic — explicit pass-through statement), known limitations, prohibited uses (none of the AI Act Art. 5 prohibitions are within Studio Zero's purpose). Comply drafts; Scribe publishes; reviewed quarterly."*
**Cost.** Documentation: 2 days. Engineering hook (the header + JSON-LD): 1 day. **Must land before M5 public launch and certainly before 2026-08-02.**

### LB4. Refund policy in §17 Decision #8 does not survive EU/UK consumer law, CCPA right-to-cancel, or FTC Click-to-Cancel (§12, §17 Dec. 8)
**Severity:** Blocker. **Regulation:** EU Consumer Rights Directive 2011/83/EU Art. 9-16 (14-day cooling-off); UK Consumer Contracts Regulations 2013; CCPA/CPRA §1798.135; FTC "Click-to-Cancel" final rule (16 CFR 425, eff. 2025); Stripe dispute terms §3.b.
**Problem.** Decision #8 says "no refund + 30-day free re-audit credit" for any FAIL verdict. Four independent legal regimes break this:
1. **EU CRD Art. 9-16** — consumers have a non-waivable 14-day right of withdrawal on digital services unless they explicitly waive it AND have begun using the service before that 14 days lapses, in which case you must collect express consent for "service performance before cooling-off period ends and acknowledgment that the right is lost." That clause is missing.
2. **UK CCR 2013 Reg. 36** — same regime, distinct enforcement.
3. **CCPA does not require refunds**, but the FTC Click-to-Cancel rule requires **"simple cancellation"** — the path to cancel must be as easy as the path to subscribe, and a no-refund policy combined with a 30-day forced re-audit credit reads like a dark pattern that the FTC's negative-option enforcement (R.E. *Disclosure of Material Connections*, 16 CFR 255) will not tolerate. There is also CARU/state-level negative-option statutes (CA Auto-Renewal Law SB 313).
4. **Stripe Services Agreement §3.b** — Stripe retains the right to reverse disputed transactions; a flat no-refund policy on a service the customer perceives as "not delivered" produces chargebacks, and a chargeback rate >0.75% gets the account flagged.
**Redline.**
- §17 Decision #8 split into three regional variants:
  - **EU/UK customers:** 14-day cooling-off with mandatory express-waiver checkbox at checkout (in the language of the customer's locale). If service is consumed within 14 days and waiver is unchecked → full refund. After 14 days or with waiver consumed → re-audit credit policy applies.
  - **California customers:** annual subscriptions must show clear cancellation UI (one-click in dashboard) per SB 313. No refund on consumed audits but pro-rata refund on unconsumed subscription period.
  - **All others (US ex-CA, ROW):** 30-day re-audit credit as written. Add explicit dispute path: "Dispute Finding" button (M4 from synthesis) routes to Jury re-judge before chargeback escalation.
- ToS §X (Refunds) drafted in plain language. Pre-purchase friction screen showing the policy *before* card capture, with affirmative click. Stripe webhook captures the consent timestamp.
- §12 add footnote: *"Pricing and refund policy vary by customer region; see ToS §X. EU/UK customers are presented a cooling-off waiver at checkout."*
**Cost.** Comply: 2 days drafting. Engineering: 1 day for regional gating + waiver checkbox + dispute button. M3 blocker (when billing turns on).

### LB5. Findings retained "indefinitely" violates GDPR Art. 5(1)(e) storage limitation + Art. 17 erasure (§14.4)
**Severity:** Blocker. **Regulation:** GDPR Art. 5(1)(e) (storage limitation), Art. 17 (right to erasure), Art. 6 (lawful basis), CCPA §1798.105 (right to delete).
**Problem.** §14.4 says: *"Findings & scores: retained indefinitely as customer-owned artifacts."* This collides head-on with:
- **Art. 5(1)(e):** personal data shall be kept *no longer than necessary* for the purposes for which it was processed. "Indefinitely" is the textbook violation.
- **Art. 17(1)(a):** the data subject has the right to obtain erasure when data is no longer necessary. Findings frequently contain PII embedded in evidence (a screenshot of a signup form may capture the customer's beta-testers' emails; a code snippet might contain an end-user's name as a test fixture; a screen-reader transcript captures whatever the AT user just spoke). "Customer-owned" does not extinguish data-subject rights — the data subject is the *end user of the customer's product*, not the customer.
- **CCPA §1798.105:** California residents can demand deletion; "indefinite retention" is not a recognized exception.
**Redline.** §14.4 rewritten:
> *"Customer code retention: configurable, max 30 days, default 7. Findings & scores: retained for the active subscription period plus 90 days post-cancellation (for invoicing dispute + score-comparison continuity), then permanently purged via the same cryptoshredding mechanism (§13.4). Customer may export their full findings history (Markdown/JSON/CSV) at any time before purge. Customer may also trigger early erasure of any individual finding or full audit run via the Privacy → Erase Data flow, which executes within 30 days (GDPR Art. 12(3) timeline). Evidence containing PII (screenshots of forms, transcripts, code fixtures with identifiers) is auto-detected and redacted on ingestion (per §13.6 redaction middleware) before storage; un-redacted evidence is stored only for the cryptoshredded retention window of the underlying code."*
**Cost.** 1 day on the schema (retention timestamps on `findings`, `score_snapshots`); 1 day on the purge cron (already needed per synthesis M7); 0.5 day on the export UI. Net new vs synthesis: ~0.5 day.

### LB6. BYOK pass-through to Anthropic ToS — joint-controller / sub-licensing exposure (§8, §13.4)
**Severity:** Blocker. **Regulation:** Anthropic Commercial Terms of Service §3-§5 (acceptable use, attribution, no-resale), GDPR Art. 26 (joint controllers), GDPR Art. 28 (processor chains), CCPA §1798.140(j).
**Problem.** In BYOK mode, the customer pays Anthropic with their key, but **Studio Zero is the entity choosing prompts, agent personas, and orchestration** — i.e., Studio Zero is jointly determining the *purposes and means* of processing alongside the customer. Under GDPR Art. 26 that's a **joint-controller relationship**, which requires its own transparent arrangement separate from any DPA. Additionally, Anthropic's ToS §5 typically restricts API key holders from "providing the API services to third parties as a service" — BYOK is functionally that. Without an explicit pass-through in our ToS saying the customer warrants their Anthropic ToS allows BYOK in a service-provider context, we're inviting either Anthropic to revoke our customers' keys (with us as the cause) or a customer to sue us for material breach when it happens.
**Redline.**
- ToS §X (Provider Pass-Through): *"In BYOK mode, you (Customer) warrant that your Anthropic Commercial Terms of Service permit your API key to be used by a third-party orchestrator (Studio Zero) acting on your behalf. You indemnify Studio Zero against any claim by Anthropic arising from this warranty being incorrect. Studio Zero's standard role in BYOK is as a 'Processor on Customer Instructions' for the purposes of GDPR Art. 28, except where prompt construction, agent persona authoring, or orchestration logic constitutes joint determination of purposes; in those instances Studio Zero is a Joint Controller under GDPR Art. 26 and the Joint Controller Annex applies."*
- §8 redline: add a row *"Provider ToS compliance: Customer responsibility (BYOK / CLI) / Studio Zero responsibility (Managed)"* to the mode-comparison table.
- §17 add Decision #19: "BYOK customers must affirmatively accept the Provider Pass-Through clause; logged with timestamp; if Anthropic ToS changes restrict BYOK, customers receive 30-day notice and migration path to Managed."
**Cost.** ToS clause: 0.5 day. UI checkbox: 0.5 day. M1 blocker.

---

## Criticals (must fix before M1 launch)

### LC1. Stored screenshots of customer code create trade-secret / IP retention exposure (§9.3, §13.4, §14.4)
**Sections:** §9.3 evidence types include "screenshot," §13.4 says code is cryptoshredded but says nothing about evidence blobs in Supabase Storage.
**Problem.** A screenshot of a customer's source code in our Supabase Storage bucket is a **literal copy** of their copyrighted work and potentially their trade secrets. If we are subpoenaed, breached, or insolvent (and the bucket is sold as an asset), that copy goes with us. The customer almost certainly did not license us to retain copies of their code beyond the audit run. Under Defend Trade Secrets Act 18 U.S.C. § 1836, mere unauthorized retention can establish misappropriation if the trade-secret holder can show the holder took reasonable measures to protect it.
**Redline.** §13.4 add: *"Evidence blobs containing customer source code (screenshots, snippets, AST dumps) are stored in the same cryptoshredded enclave as the source repository itself, on the same retention timer. Findings reference evidence by hash + storage_path; when the per-run key is destroyed at retention expiry, all evidence becomes mathematically unrecoverable. Long-retained 'findings' contain only structured metadata (severity, layer, recommendation text, evidence_hash) — never literal customer code."*
**Cost.** Already half-handled by the synthesis M9 cryptoshredding fix — extend the same per-run key to evidence storage. ~1 day.

### LC2. No DMCA designated agent registered for Studio Zero's marketing site / runner outputs (§6.1, §11.2)
**Sections:** §6.1 web app, §11.2 Auto-PR.
**Problem.** Studio Zero hosts user-uploaded content (in the form of customer codebases and the audit outputs derived from them) and publishes Auto-PRs into third-party repos. Under 17 U.S.C. § 512(c) (DMCA safe harbor), we **must** designate a DMCA agent with the U.S. Copyright Office and publish the agent's contact on our website to qualify for safe harbor when a customer's code or our generated PR contains third-party copyrighted material (e.g., GPL'd code laundered into MIT customer repo via Auto-PR). Without registration, every Auto-PR is direct-infringement exposure, not safe-harbored intermediary exposure. Cost to register: $6. Cost to skip: unbounded.
**Redline.** §14.5 add: *"Studio Zero designates a DMCA agent with the U.S. Copyright Office per 17 U.S.C. § 512(c) before M5 public launch. Contact published at `/legal/dmca`. Takedown SOP: Comply triages within 24h; auditor blob removed within 72h; counter-notice path provided."* This is **separate** from any motionmax-side DMCA work — this is Studio Zero's own surface.
**Cost.** $6 registration + 0.5 day for the page. M5 blocker.

### LC3. BYOK key validation endpoint = credential-stuffing oracle (revisit synthesis M12, escalate to Critical) (§7.1)
**Sections:** §7.1.
**Problem.** Synthesis M12 already flagged this from Shield's angle. From Comply's angle: an unauthenticated/under-rate-limited validation endpoint is a **CFAA § 1030(a)(2)(C) liability vector** (someone uses our infra to test stolen Anthropic keys = we are the unauthorized accessor of Anthropic's infra). Bump to Critical because the regulatory exposure is on us, not just the attacker.
**Redline.** Already covered by synthesis M12. Add ToS clause: *"Validation calls against your provided API key are made only against the provider's documented authentication endpoint; we do not test for credential validity beyond the minimum required to confirm key shape and account binding."*
**Cost.** Engineering done in M12. ToS clause: 0.5 hour.

### LC4. AI-generated content in Auto-PRs may carry training-data attribution / license inheritance issues (§11.2)
**Sections:** §11.2.
**Problem.** Claude (Anthropic's model) is trained on a corpus that includes copyleft-licensed code. There is active litigation (*DOE v. GitHub*, *Andersen v. Stability AI*) where output-license inheritance is being argued. Until that case law settles (probably 2027-2028), **the conservative read is that AI-generated code may be derivative of copyleft training inputs**. If our Auto-PR drops AGPL-flavored output into a customer's proprietary codebase, the customer's lawyer at acquisition or IPO will demand provenance we cannot provide.
**Redline.** §11.2 add hard rule: *"Every Auto-PR includes a machine-readable 'AI Generation Provenance' block in the PR description listing: model used, model version, training-data attestation as published by the provider (e.g., link to Anthropic's published statement on training data), and a clause stating 'Studio Zero makes no representation that this output is free of license inheritance from the upstream model's training data. Customer is responsible for license-clearing AI-generated contributions per their own policy.' Auto-PR opt-in checkbox at purchase requires customer to acknowledge this clause."*
**Cost.** 0.5 day for the disclosure block + checkbox.

### LC5. Free-tier email collection without consent banner / lawful basis for marketing (§12, §17 Dec. 7)
**Sections:** §12 free-tier safeguards mention "email-verification required."
**Problem.** Email verification is fine as a lawful-basis processing under GDPR Art. 6(1)(b) (contract performance — verifying you exist before we run an audit for you). The Blocker risk is the next step: if Signal/Herald uses those emails for *marketing* without separate Art. 6(1)(a) consent, that's an enforcement action waiting. CCPA § 1798.100 requires explicit notice at collection point.
**Redline.** §12 add: *"Free-tier signup collects only the email needed to verify the account and deliver audit results (Art. 6(1)(b) basis). Use of the email for any marketing or product-update communication requires separate, granular, unbundled consent presented at signup (per GDPR Art. 7(2) and CCPA § 1798.100). The default state of the marketing-consent checkbox is unchecked (per CNIL guidance and EDPB Guidelines 05/2020 on consent)."*
**Cost.** 1 hour UI + ToS clause.

### LC6. Marketing claim "premium positioning, comparable to v0/Bolt" not substantiated (§12)
**Sections:** §12 closing paragraph.
**Problem.** Under FTC Act § 5 and 16 CFR 255 (Endorsement Guides) and the "Reasonable Basis" doctrine (*Pfizer v. FTC* 1972), any express or implied comparative claim must be substantiated with documented evidence before publication. "Comparable to v0/Bolt" is an implied claim that our quality/capability matches theirs. We don't have benchmark data. EU equivalent: Directive 2006/114/EC on misleading and comparative advertising.
**Redline.** §12 strike the v0/Bolt comparison from PRD. Replace with: *"Pricing positioning is premium, reflecting the depth of the audit and the inclusion of the independent verification layer. Marketing comparisons against named competitors require Proof + Comply substantiation review before publication (per FTC 16 CFR 255 and Directive 2006/114/EC)."* Herald gets a Hard Rule: no named-competitor comparison ships without a substantiation file.
**Cost.** Wording change in PRD: 5 minutes. Process gate for Herald: ongoing.

---

## Majors (fix before public launch)

| # | Section | Issue | Recommendation |
|---|---|---|---|
| LM1 | §13.4 | BYOK key storage uses Supabase Vault — adequate for SOC 2 *Trust Services Criteria CC6.1 (logical access)* but missing: documented key-rotation runbook, separation-of-duties between operator (Jo) and decrypting role | Document rotation cadence in §13.4: MEK rotated yearly, DEK per-tenant rotated on policy event; runbook lives at `runbooks/key-rotation.md` for SOC 2 evidence later |
| LM2 | §13.4 | GDPR Art. 32 (security of processing) requires *demonstrable* encryption + key management + ongoing testing. PRD documents the *what* but not the *how we'll prove it* | Add: "Annual third-party penetration test, results retained for SOC 2 readiness package. Quarterly internal access-review audit of Vault secrets." |
| LM3 | §14.5 | "SOC 2 not in MVP scope" is fine, but enterprise customers will ask in month 2. Need a **SOC 2 readiness roadmap**, not just "deferred." | Add §14.5.3: "SOC 2 Type I readiness audit booked for M5 + 6 months; Type II observation window starts at M5 + 12. Chronicle agent maintains the evidence package continuously, starting M1." |
| LM4 | §13.2 | `audit_logs` table mentioned in synthesis Minor — escalate. Required for SOC 2 CC6.1, CC7.2; required as evidence for §LB1 authorization checks; required for GDPR Art. 30 record-of-processing | Move audit_logs to §13.2 schema list. Append-only, RLS allows INSERT not UPDATE/DELETE. 7-year retention for financial events, 1-year for data-access events |
| LM5 | §14.4 | "EU residency added when first EU customer asks" — too reactive. First EU customer in M1-M3 = scramble | Pre-provision Supabase EU region at M3. Cost is ~$0 until populated. Show "data hosted in US (EU available on request)" on signup. |
| LM6 | §14.4 | No mention of **breach notification SOP** — GDPR Art. 33 requires 72h notification to supervisory authority; Art. 34 requires data-subject notification if high risk | Add §14.5.4: "Breach detection → 24h triage → 48h decision → 72h notification per GDPR Art. 33. Drill quarterly. Cipher + Comply own the runbook." |
| LM7 | §6.1 | OAuth via Google/GitHub — Google Sign-In has its own Verified API consumer requirements and Limited Use disclosure if we ever request a scope that touches Google data | Document the OAuth scopes in §6.1: email + profile only. Anything broader triggers Google's "Sensitive Scopes" review (2-6 week delay) |
| LM8 | §11.2 | Auto-PR branch naming `studio-zero/fix-<run-id>` — risk that `<run-id>` leaks tenant correlation in public-repo PRs | Use a non-correlatable opaque ID. Run-ID stays internal. |
| LM9 | §12 | Stripe collects card data → PCI-DSS SAQ-A scope. Need to confirm our integration doesn't accidentally pull us into SAQ-D | Use Stripe Checkout (hosted) or Payment Element with iframe, never raw card fields. Document the SAQ-A scope claim in `/legal/pci-attestation` |
| LM10 | §17 Dec. 8 | "Comply + Ledger codify the policy in TOS before launch" — fine, but no deadline tied to a milestone | Add to M3 deliverables: "Refund policy ToS clause + DPA + Provider Pass-Through clause + URL Authorization clause shipped." |

---

## Minors (fix during M1 polish)

- **LMn1** §14.5 — add explicit confirmation that Studio Zero is **not** a HIPAA Business Associate by default. Customers handling PHI must execute a separate BAA before using Managed mode against codebases that touch PHI. Otherwise we inherit HIPAA liability silently.
- **LMn2** §6.1 — Cookie consent banner (ePrivacy Directive Art. 5(3) — strict opt-in for non-essential cookies; the "TTDSG" in Germany; the CNIL guidance in France). PostHog and Sentry will set cookies; consent banner before they fire is mandatory for EU traffic.
- **LMn3** §14.4 — Right of Access (GDPR Art. 15) — customer needs a "Download My Data" button alongside the "Erase My Data" button. Not just findings; the full profile, billing history, run metadata.
- **LMn4** §17 Dec. 7 — Free tier email + IP rate-limit is fine but the IP collection itself is processing under GDPR. Document the lawful basis (legitimate interest in fraud prevention, balancing test recorded).
- **LMn5** §13.6 — Sentry/PostHog/Pino vendor list belongs on the public Subprocessor List with the URL at `/legal/subprocessors`. Each one is a sub-processor under GDPR Art. 28(2) requiring customer notice on change.
- **LMn6** §9.3 — `audience` field in the JSON contract may contain demographic descriptors. If it ever stores age range / gender / religion descriptors, that's GDPR Art. 9 Special Category Data. Either constrain the schema (no special categories) or get explicit consent.
- **LMn7** §17 Dec. 6 — CLI tamper detection messaging — Comply concurs with synthesis M11: drop the trust claim, use "Self-Audited / Unverified" watermark. Reason: false sense of security creates a **misrepresentation** that becomes an FTC § 5 deceptive-practice claim if a tampered CLI verdict is later litigated.

---

## Polish (V1+)

- Publish a **Trust & Compliance page** at `/trust` consolidating: ToS, Privacy Policy, DPA template, Subprocessor List, AI System Card, Security whitepaper, DMCA, SOC 2 status, Cookie Policy, Acceptable Use Policy. Enterprise sales unlock at month 3+.
- Annual **DSAR (Data Subject Access Request) drill** — simulate a real GDPR Art. 15 request hitting the platform; measure response time; meet the 1-month statutory deadline.
- **Children's data — COPPA / GDPR-K (Art. 8):** add explicit Acceptable Use Policy clause: Studio Zero is not intended for users under 18 and is not designed to audit products primarily targeting users under 13. Audit intake form should ask "is this product directed at children under 13" — flag and require parental-verification consent attestation if yes.
- **BIPA (Illinois Biometric Information Privacy Act)** — Studio Zero does not knowingly collect biometric identifiers. Add as exclusion clause in ToS. If we ever add screen-recording or webcam evidence types (we should not), this clause must be revisited.

---

## Add Proposals (new sections / clauses / SKUs)

### A1. New §14.6: "Legal Instruments"
A dedicated subsection enumerating every legal document Studio Zero ships, who owns it, when it's required, where it lives. Drives accountability.
```
§14.6 Legal Instruments
- Terms of Service (Comply, public, /legal/tos) — required before signup
- Privacy Policy (Comply, public, /legal/privacy) — required before signup
- Cookie Policy (Comply, public, /legal/cookies) — required before any cookies fire
- Acceptable Use Policy (Comply, public, /legal/aup) — referenced from ToS
- Data Processing Agreement (Comply, click-through, /legal/dpa) — required for EU/UK/EEA customers, M3 blocker
- Subprocessor List (Comply, public, /legal/subprocessors) — 30-day notice on change
- AI System Card (Comply, public, /legal/ai-system-card) — required for EU AI Act Art. 50, M5 blocker
- DMCA Agent Designation (Comply, public, /legal/dmca) — required for safe harbor, M5 blocker
- Security Whitepaper (Cipher + Comply, gated, /trust/security) — for enterprise sales
- URL Authorization Clause (in-flow checkbox, logged) — required before first URL audit
- Provider Pass-Through Clause (in-flow checkbox, logged) — required before BYOK first key
- Marketing Consent Toggle (signup form) — separate from ToS acceptance
- Cooling-Off Waiver (EU/UK checkout) — Art. 16 CRD compliance
```

### A2. New §17 Decision #17-#19
- **#17** DPA mandatory for EU/UK Managed customers (LB2)
- **#18** AI System Card published before M5 (LB3)
- **#19** Provider Pass-Through clause mandatory for BYOK (LB6)

### A3. New SKU consideration: "Compliance-Ready" enterprise add-on
Not for v1, but flag now: customers in regulated industries (fintech, healthcare, education) will pay 3-5x for: signed DPA + BAA + SCCs, dedicated subprocessor commitment, SOC 2 Type II attestation, EU data residency, custom retention windows, named technical contact, custom indemnification cap. Penny + Comply price for V2.

### A4. New §14.7 "Acceptable Use"
Studio Zero must not be used to:
- Audit URLs the customer does not own/operate (LB1)
- Generate code intended to defraud, surveil, or manipulate end users
- Process Special Category Data (GDPR Art. 9) without explicit consent flagging
- Audit codebases the customer does not have license to access
- Circumvent the audit gate via repeated re-runs designed to flip a FAIL via prompt-injection in code comments
Violations result in suspension; willful violations result in termination + breach-of-ToS retention of fees paid.

---

## Remove Proposals (legal liability — cut)

### R1. Strike "comparable to v0/Bolt" from §12 (LC6)
Replace with vague-but-defensible premium positioning. Named-competitor claims require evidence files Herald does not have.

### R2. Strike "retained indefinitely" from §14.4 (LB5)
Replace with bounded retention + early-erasure flow. "Indefinitely" is the most expensive single word in the PRD.

### R3. Strike "Customer code retention: configurable, max 30 days" loophole (§14.4)
The "max 30 days" is fine, but if a customer **chooses** the 30-day option they need a documented business reason recorded (legitimate-interest balancing test under Art. 6(1)(f)). Default 7 stays. Maximum should require a checkbox: "I have a documented reason for extended retention." Defensible if regulator asks.

### R4. Consider striking "deployed URL" from the free tier (§12, §17 Dec. 7)
The free tier's URL audit is the **single biggest CFAA risk surface** in the product because: free users are higher-fraud, less vetted, less likely to read the authorization clause. Either keep URL in free with **stronger** authorization friction (re-typing the URL after acknowledging ownership), or move free tier to "source-only Quick" audits where customer must connect a repo they demonstrably own via GitHub App.

---

## Decision Votes (D1-D9)

Comply has strong opinions on **5 of 9**. Where Comply has no legal lens, vote is "abstain."

### D1. GitHub App vs OAuth — **STRONG YES to GitHub App from day one.**
**Rationale.** OAuth `repo` scope is over-broad (synthesis B4). From Comply's lens: GitHub Apps are **purpose-limited credentials** that map cleanly to GDPR Art. 5(1)(c) data-minimization. They also reduce breach blast radius from "catastrophic" to "scoped" — material for the eventual SOC 2 narrative and the customer's own due diligence questionnaire. The 3-5 day cost is dwarfed by the legal cost of explaining a `repo`-scope breach.

### D2. Free tier — 1 audit per signup vs 1 project unlimited re-audits — **YES to unlimited re-audits per project.**
**Rationale.** Penny's product reason is correct (activation loop). Comply adds: a single fail-and-vanish flow looks like a **dark pattern** under FTC and EU UCPD (Directive 2005/29/EC) — we tease a service, fail the user, and gate the recovery behind payment. Unlimited re-audits per project converts that into a genuine free-tier value prop and is much harder to characterize as deceptive.

### D3. Auto-PR scope — **STRONG: defer to V1.5 OR restrict to Minor/Polish only.**
**Rationale.** Auto-PR is the highest legal-exposure feature in the product (LB3 AI Act, LC1 IP, LC4 training-data inheritance, LM8 branch naming, the entire substantiation surface). Restricting MVP Auto-PR to Minor/Polish (copy fixes, alt-text additions, ARIA-label tweaks) makes the AI-attribution risk approximately zero because those changes are not copyrightable expressions in the first place. Defer logic refactors to V1.5 with full AI System Card + Provenance block in place.

### D4. BYOK Starter $29 vs $19 — **abstain.** No legal angle.

### D5. Auto-PR pricing flat vs tiered — **abstain on price.** **STRONG: tiered creates clearer "service rendered" milestones for refund-dispute defense.**
**Rationale.** Per LB4, refund policy disputes are easier to win when the service has graduated, documented deliverables. Tiered S/M/L pricing creates per-tier acceptance criteria that close out refund eligibility cleanly. Flat pricing creates a single binary "did we deliver" dispute window.

### D6. M2 ↔ M3 reorder — **abstain on scheduling.** Note: Managed before CLI means **DPA + AI System Card + Provider Pass-Through must all land before M2 ships**, not by M5. Either way, those instruments are blockers; the milestone they block depends on this decision.

### D7. CLI tamper "trust signal" vs "Self-Audited / Unverified" watermark — **STRONG: watermark.**
**Rationale.** Per LMn7, the "trust signal" framing is a **misrepresentation surface** under FTC § 5. We cannot defend "tamper-detected verdict" claims against a sophisticated adversary, and the FTC tests claims against the most-sophisticated-adversary standard for technical claims (per the *FTC v. POM Wonderful* line). "Self-Audited / Unverified" is honest, legally bulletproof, and creates a clearer upgrade path to Managed.

### D8. Sandboxing — **STRONG: Firecracker microVM or rootless container — NOT no-execution.**
**Rationale.** "No execution at all" means we cannot run customer code, which means we cannot do dynamic analysis, which means our Surface and Full audits are objectively weaker than the marketing implies. That's an FTC substantiation risk (LC6). Pick the sandbox; do the work; defensibly claim "executes customer code in isolated ephemeral microVMs" in the security whitepaper.

### D9. SSRF / prompt-injection / telemetry redaction / ingestion limits — **STRONG: all four are M0/M1.**
**Rationale.** Each one independently creates a GDPR Art. 32 (security of processing) violation if shipped without. SSRF leaks infra data; prompt injection exfils customer secrets; telemetry leaks customer code to subprocessors not in the DPA; ingestion limits prevent denial-of-service that becomes an availability-SLA breach. None are deferrable.

---

## Final Note

The v0.2 → v0.3 transition was a **security-engineering** upgrade. The v0.3 → v0.4 transition needs to be a **legal-instrument** upgrade. Six blockers, four criticals, ten majors — but ~85% of them are paper, not engineering. None of them delay M0. Most can be drafted in parallel by Comply + Scribe while engineering closes the synthesis Blockers. If we ship M5 without the AI System Card and DMCA registration we are non-compliant on day one with EU AI Act and lose 17 U.S.C. § 512(c) safe harbor — both unforced errors.

The product loop that fixes other people's compliance gaps should not ship with its own.

— Comply

---

## v0.4 Plan Sign-Off (2026-05-10)

### 1. Blocker-by-blocker walk
- **LB1 CFAA / URL authorization — YES.** §14.7 AUP + URL-audit authorization clause + dropping Deployed URL from free tier closes the highest-fraud surface and gates the rest behind a logged warrant.
- **LB2 GDPR Art. 28 DPA — PARTIAL.** New Decision #17 commits the instrument, but I want the DPA + Subprocessor List explicitly named as **M3 gate deliverables** in §X Test Strategy exit criteria, not "before Managed launch." Otherwise it slips.
- **LB3 EU AI Act Art. 50 — PARTIAL.** Decision #18 commits the System Card, good. But Art. 50 binds **2026-08-02 (~84 days out)** and applies the moment any natural person interacts with the audit output, not at M5 public launch. See time-critical note below.
- **LB4 Refund / cooling-off — NO.** Deferred to Jo as D4/D5 price decisions. The legal regime (EU CRD 14-day waiver, FTC Click-to-Cancel, CA SB 313) is **not a pricing question** and must land in §14 regardless of D4/D5 outcome. Add as Decision #20 or fold into §14.7.
- **LB5 Indefinite retention — YES.** Removing the phrase plus bounded retention windows in §14.4 closes it, assuming the rewrite includes the 90-day post-cancel + per-finding erasure flow from my redline.
- **LB6 BYOK Provider Pass-Through — YES.** Decision #19 closes it.

### 2. Net-new additions wanted
- **§14.4 explicit retention table** (code / findings / evidence / audit_logs / billing) with per-row max + lawful basis — referenced from the System Card.
- **Cookie consent banner** before PostHog/Sentry fire (LMn2) — must land with §6.1 web app, not later.
- **Breach notification SOP** (Art. 33 72h) in §14 — drill quarterly.
- **DMCA agent registration** ($6, half a day) added to M5 exit criteria (LC2).
- **Decision #20: Regional refund/cooling-off matrix** to absorb LB4 regardless of D4/D5.

### 3. Adjust / remove
- **Adjust D3:** "Defer Auto-PR to V1.5" — good, but if any Auto-PR ships in MVP (even Minor/Polish), the AI-Generated Content Disclosure block (LC4) + provenance JSON-LD must ship with it. Don't let "deferred" turn into "unscoped."
- **Adjust §7.2 Step D Verdict Screen:** the primary CTA copy must not imply legal certification ("Certified Pass," "Verified Compliant"). Use "Audit Complete — Pass" framing. FTC § 5 substantiation risk.
- **Adjust §3a Competitive Landscape:** named-competitor pricing table needs the same substantiation gate that killed the v0/Bolt claim — Herald + Comply sign off before publication, or it's just LC6 in a new dress.
- **Keep removal of "comparable to v0/Bolt," "retained indefinitely," and free-tier Deployed URL** — all three are correct cuts.

### 4. Time-critical: EU AI Act Art. 50 (84 days to binding force)
**Decision #18 alone is NOT enough.** The System Card landing "before M5" only works if M5 ships before 2026-08-02; on the new milestone order (Managed before CLI) that is not guaranteed. Interim M0/M1 actions required:
- **M0 deliverable:** machine-readable AI disclosure header (`X-AI-Generated`) + JSON-LD block in every audit report (engineering: 1 day).
- **M0 deliverable:** human-readable AI banner on every report and on the Verdict screen (Scribe: 0.5 day).
- **M1 deliverable:** AI System Card v0.1 published at `/legal/ai-system-card` even if minimal — placeholder + intended-purpose + pass-through statement beats nothing on 2026-08-02.
- **M2 deliverable:** System Card v1.0 with full Art. 50(2) machine-readable marking for Auto-PR (if Auto-PR ships at all in MVP).

If Managed (M3) ships after 2026-08-02 without the System Card live, that's a regulatory breach on first EU interaction. Non-negotiable.

### Final Verdict

**PASS WITH FIXES.**

Plan closes 4 of 6 Blockers cleanly, 1 partially, and punts 1 (LB4) into pricing territory where it doesn't belong. Required fixes before v0.4 ships: (a) add Decision #20 for regional refund/cooling-off independent of D4/D5; (b) pull AI Act Art. 50 disclosures into M0/M1 deliverables, not M5; (c) name DPA + Subprocessor List as M3 gate items in §X Test Strategy; (d) cookie consent banner in §6.1. With those four fixes I sign off and we proceed.

The paper-not-engineering ratio is holding. M0 spike date is not at risk.

— Comply
