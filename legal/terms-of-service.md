# Studio Zero — Terms of Service

**Version:** 1.2 (V2 — Build mode extension incorporated by reference; AI System Card pointer bumped v0.5 → v1.5 chain)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**PRD anchors:** §17 Decision #19 (BYOK pass-through — LOCKED), §17 Decision #20 (regional refund matrix — LOCKED v0.4), §17 Decision #22 (EU cooling-off resets per upgrade — LOCKED v0.5), §14.5 (compliance), §14.7 (AUP), §11.3 (AI disclosure), §12 (pricing & tiers), §14.4 (privacy & retention), §4 V2 Goals (Build mode), §7.3 Build Workflow
**Cross-references:** `legal/privacy-policy.md`, `legal/aup.md`, `legal/subprocessors.md`, `legal/data-processing-agreement.md` (Art. 28 DPA — LIVE at M2), `legal/ai-system-card-v1.5.md` (current — V2; predecessors: `legal/ai-system-card-v1.0.md`, `legal/ai-system-card-v0.5.md`), **`legal/build-mode-extension.md` (V2 Build mode ToS extension — incorporated by reference for Managed Pro customers activating Build mode)**, `finance/refund-matrix.md`, `compliance/click-to-cancel-ux-audit.md`, `compliance/d22-cooling-off-flow.md`
**Voice:** plain English, grade-9 ceiling, sentence case per `brand/voice.md`. We say what we mean. Legal terms are explained in line, not buried in a glossary.

> **Plain-English mandate.** This file follows the principle in `agents/operations/comply.md` §4: a Terms of Service that no consumer can read is not a Terms of Service, it is a liability shield made of fog. Every defined term is introduced in plain words; the legal-of-record language follows in parentheses where required for enforceability.

---

## 1. Acceptance of these terms

### 1.1 Who you are agreeing with

These Terms of Service (**"Terms"**) are a contract between you (the person or organization using Studio Zero) and **Studio Zero, Inc.** (a Delaware corporation; **"Studio Zero,"** **"we,"** **"us,"** or **"our"**). When you create an account, run an audit, click a checkbox saying you accept these terms, or pay us for the service, you agree to be bound by these Terms.

### 1.2 You must be allowed to agree

You must be at least 18 years old (or the age of majority where you live) and legally able to enter contracts. If you are agreeing on behalf of a company, you confirm you have authority to bind that company.

### 1.3 If you do not agree

Do not use Studio Zero. Close your browser tab; uninstall the CLI. You cannot use the service without accepting these Terms.

### 1.4 Binding arbitration and class-action waiver (U.S. residents only)

If you live in the United States, you and Studio Zero agree to resolve disputes by individual binding arbitration under the American Arbitration Association's Consumer Arbitration Rules. You give up the right to sue in court (except small claims) and to participate in class actions. Full arbitration terms are in §16 below. **You may opt out of arbitration within 30 days of accepting these Terms by emailing legal@studiozero.dev with the subject line `Arbitration Opt-Out`** and including your account email. EU, UK, and other jurisdictions where arbitration of consumer disputes is unenforceable are excluded; for those users, §17 (Governing Law) applies instead.

---

## 2. What Studio Zero is

### 2.1 The service

Studio Zero is an automated software-audit service. You connect a repository or submit a URL; our system runs an independent audit using artificial-intelligence agents (powered by Anthropic's Claude models), produces a graded checklist of findings, and assigns a readiness score. We do not edit your code; we evaluate it. Full product description: `PRD.md` §6 and §7.

### 2.2 Three execution modes

You can run audits in one of three modes:

- **BYOK (Bring Your Own Key)** — you supply your own Anthropic API key. We execute the audit on your tokens. See §6 for the pass-through clause.
- **Claude Code CLI** — you supply your Claude Code subscription. We coordinate the audit through your local CLI.
- **Managed** — Studio Zero supplies the Anthropic tokens. You pay a flat subscription that includes them.

### 2.3 The audit is advisory

A Studio Zero finding is a recommendation, not an order. We do not deploy code on your behalf; we do not access your production systems uninvited; we do not warrant that fixing every finding will produce defect-free software. The decision to act on a finding is always yours. See §10 (AI disclaimer) for the limits of what we claim.

### 2.4 The Surface, Code, and Full SKUs

Audit products are defined in `PRD.md` §9.1. **Surface** is an external accessibility + UX audit on a URL you attest you own. **Code** adds repository review of front-end source. **Full** is the deepest tier and inspects backend + infra-as-code.

### 2.5 Build mode (V2+, Managed Pro only)

Build mode is the V2 feature that takes a product description from you, generates a structured brief, dispatches Studio Zero's multi-layer agent system, runs the Jury audit gate against the generated artifact, and delivers a roadmap + documentation bundle (optionally seeded into a GitHub repo, and at V2.1, optionally with a working scaffold). **Build mode is governed by `legal/build-mode-extension.md`, which is incorporated by reference into these Terms.** The extension is the load-bearing source of truth for: customer ownership of the delivered bundle and seeded repository (Studio Zero retains rubric IP only); customer warranty about the idea description (no third-party IP injection); similarity-to-public-references disclaimer; the audit-gate-is-opinion-not-legal-certification disclaimer; pricing (Managed Pro includes 1 build/mo; overage $499/build, with Penny refinement after the first V2 cohort); and Build mode-specific retention. Where this base ToS and the Build mode extension disagree on a Build-mode-specific question, the extension controls.

---

## 3. Your account

### 3.1 Creating an account

You must provide a valid email address. We may require email verification before letting you run any audit. You are responsible for keeping your password (or OAuth provider login) confidential and for everything that happens under your account.

### 3.2 One account per person

You may not share an account with another person. Teams should use the Managed Pro tier with seat-based access (V2). You may not create an account using someone else's identity or contact information.

### 3.3 Suspension and termination

We can suspend or terminate your account immediately if (a) you violate these Terms or the Acceptable Use Policy, (b) we are required to by law, (c) you fail to pay, or (d) your activity threatens the security or stability of Studio Zero or its other customers. See §13 (Termination) for the consequences and refund posture.

---

## 4. Permitted use

You may use Studio Zero to:

- Audit software, source code, or URLs that you own or have written permission to audit.
- Export findings and verdicts produced for you.
- Use those findings to improve your own software.
- Discuss your readiness score publicly.

---

## 5. Restrictions and Acceptable Use

Detailed rules are in `legal/aup.md` (the Acceptable Use Policy). The headline restrictions are:

- **You may not audit URLs or repositories you do not own and are not authorized to audit.** This is the load-bearing rule. We log a per-run attestation; submitting false attestations breaches these Terms.
- You may not scrape Studio Zero's outputs to feed a competing product.
- You may not submit content that contains child sexual abuse material (CSAM), malware command-and-control infrastructure, weapons-of-mass-destruction plans, or other illegal material.
- You may not attempt to reverse-engineer the runner, the score engine, or any agent system.
- You may not run prompt-injection or adversarial-input campaigns against Studio Zero itself.
- When operating in BYOK mode, you may not submit content that violates Anthropic's Usage Policy (see §6).

Violations may result in immediate suspension, termination, and (where appropriate) referral to law enforcement.

---

## 6. BYOK Provider Pass-Through (Decision #19 — LOCKED)

This section is the binding text of the BYOK pass-through clause locked at PRD §17 Decision #19. It applies whenever you use Studio Zero in BYOK mode.

> **When you use BYOK mode, Studio Zero is not a party to your contract with Anthropic. You warrant that your Anthropic account is in good standing. Studio Zero acts as a technical conduit; charges for token usage are between you and Anthropic. Studio Zero disclaims joint-controllership under GDPR Art. 26 for token consumption.**

In plain English:

### 6.1 The token bill is yours

When you choose BYOK, you connect your Anthropic API key. We pass your audit requests to Anthropic using **your** key. Anthropic bills you, not us. We do not see your Anthropic invoice; we do not pay your Anthropic bill; if Anthropic suspends your account or rejects a call for any reason (rate limits, billing, content moderation), the audit fails on your account and you handle it with Anthropic directly.

### 6.2 You warrant your Anthropic account is in good standing

By enabling BYOK, you confirm: (a) your Anthropic account exists and is active, (b) you are not in violation of Anthropic's Usage Policy, (c) your API key was obtained legitimately and belongs to you (not borrowed from an employer or a friend), and (d) you have the funding or credits in place to pay Anthropic for the tokens we will consume on your behalf. We may pause your runs if Anthropic returns repeated authentication errors.

### 6.3 Studio Zero is a technical conduit

In BYOK mode, our role is mechanical: we receive your audit request, we package it for Anthropic, we forward it on your key, we read Anthropic's response, we produce findings. We do not control the model, the rate limits, or Anthropic's content moderation. We do not store your Anthropic-billed tokens; we do not resell them; we do not charge a per-token markup. The platform fee you pay Studio Zero in BYOK mode is for the audit infrastructure, the score engine, the integrations, and the customer surface — not for the LLM tokens.

### 6.4 GDPR joint-controllership disclaimer

For tokens you consume on your Anthropic key, **Studio Zero disclaims joint-controllership with Anthropic under GDPR Article 26**. You are the controller of the data you submit to Anthropic via your key; Anthropic is the controller of the data it processes under its own contract with you. Studio Zero's role for that data flow is limited to the technical conduit described in §6.3, which is a processor-style role under GDPR Article 28. We will execute an Article 28 Data Processing Agreement with you on request — the template is LIVE at M2 at `legal/data-processing-agreement.md` per Decision #17.

### 6.5 Anthropic's terms apply to your BYOK use

When you operate in BYOK mode, your use of Anthropic's API is governed by Anthropic's Commercial Terms of Service and its Usage Policy, both of which you accepted when you obtained your Anthropic API key. If Anthropic changes those terms, your use of Studio Zero in BYOK mode is also affected because your audit requests still flow to Anthropic. We will surface significant Anthropic policy changes in our changelog but we cannot guarantee notice on Anthropic's behalf.

### 6.6 Switching to Managed mode

If you want Studio Zero to take responsibility for the tokens — including the bill, the rate limits, and the contractual relationship with Anthropic — you can switch from BYOK to Managed at any time. In Managed mode, Studio Zero is the customer of Anthropic for token purposes; you pay Studio Zero one bundled subscription fee. See `finance/pricing.md` for the Managed tier prices.

---

## 7. Pricing, billing, and auto-renewal

### 7.1 Prices

Current prices are at `https://studiozero.dev/#pricing` and in `finance/pricing.md`. We may change prices on 30 days' notice for new subscriptions; existing subscribers keep their current price through their current term and are notified at least 30 days before the next renewal.

### 7.2 Auto-renewal

Paid subscriptions renew automatically at the end of each billing period (monthly or annually). You authorize us, via our payment processor Stripe, to charge your stored payment method for each renewal. We send renewal-reminder emails between 3 and 21 days before each annual renewal as required by California Business and Professions Code §17602.

### 7.3 Click-to-Cancel (FTC 16 CFR Part 425)

You can cancel your subscription at any time, online, in the same medium you used to sign up. Cancellation is at Settings → Billing → Manage billing → Cancel subscription (Stripe Customer Portal). We do not require you to call us, email us, or talk to a human. The cancel path is at most three clicks from the in-app sidebar. Confirmation arrives by email within 60 seconds. Full mechanics are speced in `finance/refund-matrix.md` §4; the M2 UX-compliance audit lives at `compliance/click-to-cancel-ux-audit.md`.

### 7.4 Cooling-off (EU/UK consumers) — Decision #22 LOCKED

If you live in the EU or UK and you are a consumer (not buying for business), you have a 14-day cooling-off period from the date your contract starts, under EU Directive 2011/83/EU Article 9 / UK Consumer Contracts Regulations 2013 Regulation 30. You can cancel within 14 days for a full refund **unless** you expressly waived the right at checkout (CRD Article 16(m) / CCR Reg. 36 waiver — speced in `finance/refund-matrix.md` §3.2; we use the legally-sufficient waiver text drafted at `finance/refund-matrix.md` §8.2/§8.3 verbatim).

**D22 reset clause (LOCKED):** If you upgrade your subscription during this period — or at any later time, while you remain an EU/UK consumer — a new 14-day cooling-off window opens on the upgrade contract from the upgrade timestamp. Downgrades do not reset the window. Full mechanics + edge cases are speced in `finance/refund-matrix.md` §3.5 + §3.6; the M2 UX-compliance audit lives at `compliance/d22-cooling-off-flow.md`.

### 7.5 California pro-rata refunds (SB 313)

If you live in California and you cancel a paid subscription mid-period, we refund the unused portion automatically. Calculation: `refund = floor((days_remaining / days_in_period) * plan_price)`. Settles via Stripe in 5–10 business days. See `finance/refund-matrix.md` §4.5.

### 7.6 Other regions

Refund rules for every region we serve are in `finance/refund-matrix.md` §2. Where the matrix and these Terms differ, the matrix governs (because the matrix is the version Comply re-verifies quarterly against changing statute).

### 7.7 Taxes

Prices are exclusive of applicable sales tax, VAT, GST, or similar transaction taxes. Where required by law, we add the tax at checkout and remit it to the relevant authority. You are responsible for any income or business tax on your end.

### 7.8 Failed payments

If a renewal payment fails, we will attempt to charge your card up to four times over seven days (Stripe Smart Retries). If all attempts fail, your subscription is cancelled and your account moves to the free tier. We do not pursue collections for failed consumer-tier subscriptions.

---

## 8. Intellectual property

### 8.1 What Studio Zero owns

Studio Zero owns: the runner; the score engine; the rubric (including the Surface, Code, and Full audit specifications); the agent prompts and orchestration system; the web app, dashboards, and UI; all branding, logos, and marketing copy; this Terms of Service; and all documentation under `agents/`, `architecture/`, `runner/`, and `apps/`. You receive no ownership interest in any of the above.

### 8.2 What you own

You own: your code; your URLs; your repositories; the data you submit; and **the audit findings that Studio Zero produces about your code**. The findings are work made for you under these Terms. You can publish, share, or use them however you like.

### 8.3 What Studio Zero gets to use

You grant Studio Zero a non-exclusive, worldwide, royalty-free license to **process** your submitted code and data for the limited purpose of running the audit you requested and improving the service. This license is bounded by the retention table in `legal/privacy-policy.md` §3: by default, customer code is deleted after 7 days, and the license terminates with deletion. We do not train models on your code without an explicit, separate opt-in (no such opt-in exists at M1; see §11).

### 8.4 Feedback

If you send us feedback or feature requests, you grant us a perpetual, irrevocable, royalty-free license to use it. We will not identify you as the source without your permission.

### 8.5 Third-party content

Our service includes integrations with Anthropic, Stripe, GitHub, Supabase, Sentry, PostHog, Resend, Vercel, Cloudflare, and Railway. Each has its own terms which apply to your use of those parts of the service. The full subprocessor list is at `legal/subprocessors.md`.

---

## 9. Privacy

How we collect, use, and retain your information is described in our **Privacy Policy** at `legal/privacy-policy.md`. The Privacy Policy is incorporated into these Terms by reference. Notable points:

- We do not sell your personal information.
- We honor GDPR rights (access, rectification, erasure, portability, restriction, objection, automated-decision opt-out) within 30 days.
- We honor CCPA rights (know, delete, opt-out of sale, non-discrimination) within 45 days.
- Customer code retention defaults to 7 days, configurable from 0 to 30 days.
- We notify the supervisory authority of a personal-data breach within 72 hours per GDPR Article 33.

---

## 10. AI disclaimer (Comply Rule #5)

Studio Zero is an AI-powered service. By using it, you acknowledge and agree:

### 10.1 Outputs are AI-generated

Every finding, score, recommendation, summary, transcript, and explanatory artifact produced by Studio Zero is generated by large language models (Anthropic Claude). We carry the EU AI Act Article 50 disclosure machinery on every response (HTTP header `X-AI-Generated: studio-zero` and HTML `<meta name="ai-generated">` tag — verified live at M1; see `legal/ai-system-card-v0.5.md` for the full System Card).

### 10.2 Outputs may be wrong

AI systems can hallucinate. A finding may cite a line that does not exist, recommend a fix that does not apply, miss a defect that a human reviewer would catch, or contain biased or offensive language despite our content filters. **You must independently verify any finding before acting on it.** The score we produce is a measurement based on our rubric, not a prediction of real-world performance.

### 10.3 No warranty of fitness

Studio Zero is provided **"AS IS"** and **"AS AVAILABLE."** To the maximum extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, non-infringement, and accuracy. We do not warrant that the service will be uninterrupted, error-free, secure, or that defects will be corrected. Some jurisdictions do not allow exclusion of implied warranties; in those, our liability is limited to the maximum extent permitted by law.

### 10.4 Offensive or harmful outputs

We use Anthropic's safety-tuned models and our own content filters. We do not warrant that outputs will be free of language you find offensive, biased, or harmful. If you encounter such output, please report it to `abuse@studiozero.dev` so we can investigate. We do not assume liability for an AI-generated string that a human would have phrased differently.

### 10.5 Not professional advice

Studio Zero is not a substitute for legal, security, regulatory, accessibility, or other professional advice. A WCAG conformance finding from Studio Zero is not a legal opinion; a security recommendation is not a pentest report. Where the stakes warrant it, engage a qualified professional.

---

## 11. Training and model improvement

### 11.1 We do not train on customer code by default

Customer code and submitted data are **not** used to train any large language model — neither ours, nor Anthropic's. Anthropic's commercial API has a default no-training posture (see Anthropic's [Commercial Terms](https://www.anthropic.com/legal/commercial-terms)), and we contract under that posture for Managed-mode tokens. For BYOK mode, your API key inherits whatever training posture you negotiated with Anthropic directly.

### 11.2 We may improve the service from aggregated, de-identified telemetry

We may collect aggregated, de-identified telemetry about audit runs (timing, finding counts by severity, score distributions) to improve performance and to validate the score engine. This telemetry is the basis of our SLO dashboards and the score engine version control. It is not used to train models.

### 11.3 Anthropic's policies for BYOK

When you operate in BYOK mode, Anthropic's data-handling and training posture applies to your token flow. Studio Zero is not a party to that arrangement (see §6.4).

---

## 12. Liability cap and indemnification

### 12.1 Cap on our liability

**To the maximum extent permitted by law, our total liability to you for any claim arising from or related to these Terms or the service is capped at the greater of (a) the amount you paid Studio Zero in the 12 months immediately before the event giving rise to the claim, or (b) one hundred United States dollars (USD 100).** This cap applies regardless of the legal theory (contract, tort, statute, strict liability). It does not apply to liability that cannot be limited by law (e.g., fraud, intentional misconduct, gross negligence, death or personal injury from negligence).

### 12.2 Exclusion of certain damages

To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost data, lost goodwill, or business interruption, arising from or related to these Terms or the service, even if the party knew or should have known such damages were possible.

### 12.3 Your indemnification of Studio Zero

You will indemnify, defend, and hold harmless Studio Zero and its officers, directors, employees, and contractors from any claim, demand, loss, liability, or expense (including reasonable attorneys' fees) arising from: (a) your breach of these Terms or the AUP; (b) your violation of any law or any third party's rights; (c) content you submit to the service, including any URL or repository you audit without authorization; (d) your use of BYOK mode that violates Anthropic's terms; or (e) your misuse of audit findings (e.g., disclosing them to a third party in a way that harms that third party).

### 12.4 Our indemnification of you

We will indemnify, defend, and hold you harmless from third-party claims alleging that Studio Zero's service (as we provided it, unmodified, and used within these Terms) infringes a U.S. copyright, trademark, or patent. We can, at our discretion, modify the service to be non-infringing, obtain a license, or refund unused subscription fees and terminate. We have no obligation under this section for claims arising from your modifications, your combination of the service with non-Studio Zero materials, or your continued use after we notified you to stop.

---

## 13. Termination

### 13.1 By you

You can cancel any time via Settings → Billing (see §7.3). Free-tier accounts can be deleted via Settings → Account → Delete Account; we begin the 30-day GDPR Article 17 erasure process described in the Privacy Policy.

### 13.2 By Studio Zero

We can terminate for cause (AUP violation, fraud, non-payment, regulatory order) immediately. We can terminate without cause with 30 days' notice; in that case, we refund the unused portion of any prepaid period pro-rata.

### 13.3 Effect of termination

On termination: (a) your access stops at the effective date; (b) you can export your findings and account data for 90 days; (c) customer code is deleted per the retention schedule (default 7 days); (d) clauses that by their nature survive termination remain in effect (Sections 6, 8, 10, 11, 12, 14, 15, 16, 17, 18).

### 13.4 Survival

The following survive termination of these Terms: definitions; §6 (BYOK pass-through; the GDPR Article 26 disclaimer survives so it can be cited in any later cross-border claim); §8 (IP, including the perpetual feedback license); §10 (AI disclaimer); §12 (Liability cap + indemnification); §14 (Dispute Finding path); §15 (Modifications); §16 (Arbitration); §17 (Governing law + venue); §18 (Miscellaneous).

---

## 14. Dispute Finding path (pre-chargeback)

If you disagree with an audit finding, a charge, or any other action we took on your account, **before you file a chargeback with your bank**, please use one of these two paths:

### 14.1 In-app

Click **"Dispute Finding"** on the verdict screen (V0) or **"Dispute charge"** in Settings → Billing. Tell us which finding or charge, and why. We respond within 5 business days. If the dispute is upheld, you get a full refund of the disputed charge plus a free re-audit credit. Details: `finance/refund-matrix.md` §6.

### 14.2 Email

Send the same information to `comply@studiozero.dev`. Same 5-business-day SLA, same outcomes.

### 14.3 Why this matters

Pre-chargeback paths preserve our wedge (the audit-then-re-audit loop) and keep our Stripe dispute rate below the 0.75% network threshold. They also satisfy the good-faith dispute-resolution expectation that California UCL §17200 and FTC Click-to-Cancel both implicitly require. You retain the right to escalate to your bank if you are unsatisfied with our resolution.

---

## 15. Modifications to these Terms

### 15.1 We may change these Terms

We may modify these Terms from time to time. When we make a **material change** — defined as a change that meaningfully reduces your rights, expands your obligations, or alters pricing or refund mechanics — we will notify you by email **at least 30 days before the change takes effect**, and we will post the new version at `https://studiozero.dev/terms` with the new effective date and a changelog entry.

### 15.2 Immediate changes for legal compliance

We may make immediate changes when required by law, court order, or regulatory authority (e.g., a new EU AI Act provision binding tomorrow, a sanctioned country added to a denied-party list). We will notify you as soon as practicable after the change.

### 15.3 If you do not agree

If you do not agree with a material change, you may cancel your subscription before the change takes effect and receive a pro-rata refund of any unused prepaid period. Continued use after the effective date is your acceptance of the new Terms.

### 15.4 Version history

We maintain a public changelog at `https://studiozero.dev/terms/changelog`. Every version is preserved, dated, and diff-viewable.

---

## 16. Arbitration (U.S. residents)

### 16.1 Scope

For U.S. residents who did not opt out of arbitration under §1.4, any dispute, claim, or controversy arising from or relating to these Terms or the service ("**Dispute**") will be resolved by **individual binding arbitration** under the American Arbitration Association ("**AAA**") Consumer Arbitration Rules, except as set out below.

### 16.2 Carve-outs

The following are not subject to arbitration: (a) claims in small-claims court within that court's jurisdictional limits; (b) claims for injunctive relief to stop infringement of intellectual property (either party may seek such relief in court); (c) any claim that cannot be arbitrated under applicable law.

### 16.3 Class-action waiver

You and Studio Zero each waive the right to bring or participate in any class, collective, or representative action. The arbitrator may not consolidate claims of multiple parties and may not preside over any class or representative proceeding. If this waiver is held unenforceable for a particular Dispute, that Dispute must be severed and proceed in court, but the arbitration of all other Disputes is unaffected.

### 16.4 Procedure

Arbitration is administered by the AAA in San Francisco, California, by a single arbitrator. The arbitrator's decision is final and binding. Either party may enter the decision as a judgment in any court of competent jurisdiction. Filing fees and arbitrator fees are governed by the AAA Consumer Rules; if you cannot afford them, we will pay them per the AAA's fee schedule.

### 16.5 30-day opt-out

See §1.4. The opt-out window starts the day you first accept these Terms.

---

## 17. Governing law and venue

These Terms are governed by the laws of the **State of Delaware, USA**, without regard to its conflict-of-laws principles. Any dispute not subject to arbitration under §16 will be brought exclusively in the state or federal courts located in **New Castle County, Delaware**, and you consent to personal jurisdiction there. **For EU/UK consumers**, this section does not deprive you of the protections of the mandatory consumer-protection laws of your country of residence; where those laws apply, they override anything to the contrary in this section.

---

## 18. Miscellaneous

### 18.1 Entire agreement

These Terms (together with the Privacy Policy, the AUP, the Subprocessor List, the AI System Card, and any order forms or DPAs we sign with you) are the entire agreement between you and Studio Zero. They supersede all prior agreements, oral or written.

### 18.2 No waiver

Failure to enforce a provision is not a waiver of the right to enforce it later.

### 18.3 Severability

If a court (or arbitrator) holds any provision invalid or unenforceable, the rest of these Terms remain in effect. The invalid provision is replaced with the closest enforceable equivalent.

### 18.4 Assignment

You may not assign or transfer these Terms or any rights under them without our prior written consent. We may assign these Terms to an affiliate or in connection with a merger, acquisition, or sale of substantially all our assets; we will notify you when we do.

### 18.5 No third-party beneficiaries

These Terms are for you and Studio Zero only. They create no rights in favor of any third party.

### 18.6 Force majeure

Neither party is liable for delay or failure to perform caused by events beyond reasonable control (acts of God, war, civil unrest, pandemic, internet backbone outage, government action). This does not excuse payment obligations.

### 18.7 Contact

- Legal: `legal@studiozero.dev`
- Privacy: `privacy@studiozero.dev`
- Compliance / disputes: `comply@studiozero.dev`
- Abuse reports: `abuse@studiozero.dev`
- Mailing address: Studio Zero, Inc., 1209 Orange Street, Wilmington, DE 19801, USA (registered agent — for legal notice service only; not for product support).

---

## 19. Definitions

- **AAA** — American Arbitration Association.
- **Anthropic** — Anthropic, PBC, the provider of the Claude large language model.
- **AUP** — the Acceptable Use Policy at `legal/aup.md`, incorporated by reference.
- **BYOK** — Bring Your Own Key; an execution mode in which the customer supplies their own Anthropic API key.
- **Customer data** — data submitted by you, including code, URLs, screenshots, and account information.
- **Finding** — an item in an audit report identifying a defect, gap, or recommendation.
- **GDPR** — Regulation (EU) 2016/679, General Data Protection Regulation.
- **Managed mode** — an execution mode in which Studio Zero supplies the Anthropic tokens and bills the customer one bundled fee.
- **Service** — Studio Zero's web app, runner, CLI, APIs, integrations, and documentation, taken together.
- **Studio Zero** — Studio Zero, Inc., a Delaware corporation.
- **You / your** — the person or organization accepting these Terms and using the service.

---

_Comply locks this Terms of Service at v1.2 on 2026-05-12 (V2 Batch 1 — Build mode extension incorporated by reference; AI System Card pointer bumped to v1.5). Re-verify quarterly. Any regulatory change (EU AI Act Art. 50 binding 2026-08-02; FTC NPRM pending; CPRA regulation updates; Stripe Services Agreement amendments) triggers a version bump. The Build mode extension at `legal/build-mode-extension.md` has its own version lifecycle on the same Comply cadence._
