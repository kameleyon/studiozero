# Studio Zero — Data Processing Agreement (Article 28 GDPR)

**Version:** 1.0 (M2 first publication — Decision #17 LIVE)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer); co-signed by Ledger (Stripe + billing data flows) and Cipher (security measures Annex II)
**Statute:** GDPR (Regulation (EU) 2016/679) Article 28; UK GDPR (Data Protection Act 2018, retained EU Law); SCCs (Commission Implementing Decision (EU) 2021/914 of 4 June 2021); UK IDTA + Addendum (2022)
**PRD anchors:** §14.4 (privacy & retention), §14.5 (compliance), §17 Decision #17 (GDPR Art. 28 DPA template — pulled forward from M3 stub to M2 LIVE before first paid Managed-tier customer)
**Cross-references:** `legal/terms-of-service.md` (incorporates this DPA by reference), `legal/privacy-policy.md`, `legal/subprocessors.md` v1.1, `legal/ai-system-card-v0.5.md`, `compliance/dpa-template.md` (deprecated stub — replaced by this canonical file)
**Voice:** legal-of-record where enforceability requires it; plain English everywhere a binding term doesn't demand otherwise.

> **Plain-English mandate.** Article 28 obligations are mandatory floor-text under GDPR. Where a clause looks like boilerplate, that's because the Regulation drafted it that way and we cannot legally weaken it. Where the clause is ours, we have written it the way Comply would brief Jo — short, blunt, and verifiable.

> **How this DPA is executed.** This DPA template is incorporated by reference into the Studio Zero Terms of Service (`legal/terms-of-service.md` §18.1) for every customer who processes personal data of EU/UK/EEA data subjects through the service. Customers who require a signed instance can request one at `privacy@studiozero.dev`; the canonical text is this file at the version + effective date stamped above. A downloadable PDF target ships at **M5** per `sprint/milestone-M5.md` (M4 publishes the public link).

---

## 1. Parties

This Data Processing Agreement (**"DPA"**) is between:

- **Studio Zero, Inc.**, a Delaware corporation with registered office at 1209 Orange Street, Wilmington, DE 19801, USA (**"Studio Zero"**, **"Processor"**); and
- **You**, the customer accepting the Terms of Service at `legal/terms-of-service.md` (**"Customer"**, **"Controller"**), whether an individual consumer or a legal entity, acting in respect of personal data within the territorial scope of Article 3 GDPR.

This DPA forms part of, and is governed by, the Terms of Service. In the event of conflict between this DPA and the Terms of Service on a matter of personal-data processing, this DPA prevails.

For the avoidance of doubt under GDPR Article 26: where Customer uses Studio Zero in **BYOK (Bring Your Own Key) mode**, Studio Zero is the Processor for the Customer's submissions under this DPA, while Anthropic is a separate Controller for the token-consumption data flow under Customer's own contract with Anthropic. Studio Zero disclaims joint-controllership with Anthropic for that flow per Terms of Service §6.4.

---

## 2. Subject matter

The subject matter of the processing is the provision by Studio Zero of an automated software-audit service to Customer, as described in the Terms of Service §2 and `PRD.md` §6–7. Processing of personal data is incidental to, and limited by, the technical operation of that service.

---

## 3. Duration

Processing under this DPA continues for the **term of the Customer's subscription or other contractual relationship with Studio Zero**, plus the post-termination periods specified in §12 (Return + destruction). Defined retention horizons for individual data classes are at `legal/privacy-policy.md` §3 and Annex I §I.3 below.

---

## 4. Nature and purpose of processing

The nature of the processing is **automated audit of software artifacts** (URLs, repositories, code) supplied or referenced by Customer, producing graded findings, a readiness score, and a verdict. Personal data is processed only as strictly necessary to deliver that audit, to bill for it, to demonstrate compliance with our regulatory obligations, and to defend against abuse or security events.

The purpose of processing is the **performance of the contract** (GDPR Art. 6(1)(b)) Customer entered into when accepting the Terms of Service, supplemented by **legal obligation** (Art. 6(1)(c)) for billing and audit-log retention and **legitimate interest** (Art. 6(1)(f)) for security, debugging, and abuse defense, all within the bounds specified at `legal/privacy-policy.md` §2.

---

## 5. Type of personal data and categories of data subjects

### 5.1 Type of personal data

The full inventory is at `legal/privacy-policy.md` §2 and is reproduced in summary at Annex I §I.1. Headline categories:

- **Account identifiers** — email, hashed password or OAuth provider ID, display name
- **Billing identifiers** — Stripe customer ID, last 4 of card, billing country, VAT/tax ID
- **Project metadata** — repository URL, GitHub installation ID, project name
- **Submitted code** — source files cloned for the audit (encrypted at rest; cryptoshredded at retention end)
- **Submitted URLs** — URLs Customer asked us to audit (Surface tier)
- **Audit findings, verdicts, scores** — the output Studio Zero produces
- **Run telemetry** — Run ID, mode, duration, token counts, retry counts
- **API key references** — encrypted references to Customer's BYOK Anthropic key (the key itself is in Supabase Vault, XChaCha20-Poly1305 AEAD, tenant-isolated; we never log the plaintext)
- **Consent records** — cookie-banner choice, timestamp, IP, user agent
- **AUP attestation** — "I own or am authorized" checkbox state, timestamp, IP, user_id
- **Audit logs** — administrative actions (logins, payment events, cancellation events)
- **Server logs** — truncated IP (/24 for IPv4, /48 for IPv6), URL path, user agent

### 5.2 Special-category data

Studio Zero **does not request, require, or knowingly process** personal data within the scope of GDPR Article 9 (racial or ethnic origin; political opinions; religious or philosophical beliefs; trade-union membership; genetic data; biometric data; health data; data concerning sex life or sexual orientation). Customer warrants it will not submit special-category data to the service. Where Customer nonetheless submits source code that incidentally contains references to such categories (e.g., a healthcare application's variable names), Studio Zero processes only the technical content and does not derive special-category inferences. Customer remains the Controller responsible for the lawfulness of any such submission.

### 5.3 Categories of data subjects

- Customer's authorized users (the person who created the account and any team members on Managed Pro / V2 seat-based tiers)
- Customer's end-users where their personal data incidentally appears in submitted code, URLs, or evidence captures (e.g., a fixture row in a database migration)
- Customer's contacts where personal data appears in dispute submissions or support tickets

Studio Zero does not process the personal data of any data subject who is not in one of the above categories.

---

## 6. Obligations of the Processor (GDPR Article 28(3)(a)–(h))

Studio Zero, as Processor, agrees to the following obligations, which mirror Article 28(3) verbatim where the Regulation prescribes specific language and are operationalized in plain English where the Regulation leaves discretion.

### 6.1 Documented instructions (Art. 28(3)(a))

Studio Zero shall process personal data **only on documented instructions from the Controller**, including with regard to transfers of personal data to a third country or an international organisation, unless required to do so by Union or Member State law to which Studio Zero is subject. Customer's documented instructions are constituted by:

(a) the Terms of Service;
(b) this DPA;
(c) the in-product configuration choices Customer makes (retention horizon, BYOK mode toggle, cookie consent, subprocessor opt-outs);
(d) any written instruction Customer sends to `privacy@studiozero.dev`.

If Studio Zero is required by law to process beyond Customer's instructions, Studio Zero shall **inform Customer of that legal requirement before processing**, unless that law prohibits such notice on important grounds of public interest.

### 6.2 Confidentiality of personnel (Art. 28(3)(b))

Studio Zero shall ensure that **persons authorized to process the personal data have committed themselves to confidentiality** or are under an appropriate statutory obligation of confidentiality. This includes all Studio Zero employees, contractors, and on-call engineers who may, in the course of their duties, access systems containing Customer's personal data.

### 6.3 Security measures (Art. 28(3)(c) → Art. 32)

Studio Zero shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, per GDPR Article 32. The detailed Security Measures are at Annex II. Headline controls:

- **Encryption in transit** — TLS 1.3 (minimum 1.2 for legacy clients) for every external connection.
- **Encryption at rest** — AES-256 (Supabase managed) for the database; **XChaCha20-Poly1305 AEAD** with per-tenant `tenant_id::text` AAD for BYOK keys in Supabase Vault (Cipher Fix-4).
- **Tenant isolation** — Postgres Row-Level Security with `auth.is_member_of(tenant_id)` enforced at the database, not just the application code (`architecture/database/migrations/0002_rls_and_runner_jwt.sql`).
- **Sandbox isolation** — Runner workers rootless, seccomp-filtered, egress-allowlisted (ARCH-D9). One audit per container; nothing persists between runs.
- **Secret redaction** — Pre-prompt redaction middleware with a 30-format corpus; post-response scrubber; Sentry `beforeSend` PII scrub (PRD §13.6 / `apps/web/lib/sentry-redaction.ts`).
- **Cryptoshredding** — On retention end, the per-tenant Vault key is destroyed; all encrypted ciphertext and backups become unreadable within 90 seconds (`tests/integration/cryptoshredding.spec.ts`).
- **Audit logs** — Tenant-id-stamped; 7-year retention; tamper-evident via append-only ledger pattern.
- **Independent third-party pentest** — Scheduled for M3 per `compliance/pentest-engagement-2026.md`.

Studio Zero will re-verify the Security Measures **annually** and after any material change to the architecture (new subprocessor, new data flow, new modality).

### 6.4 Use of sub-processors (Art. 28(3)(d) and Art. 28(2))

Studio Zero shall **not engage another processor without prior specific or general written authorization of the Controller**. Customer hereby grants **general written authorization** for Studio Zero to engage the sub-processors listed at `legal/subprocessors.md` and Annex III to this DPA.

**Change-notification commitment (Decision #17):** Studio Zero shall **inform Customer of any intended changes concerning the addition or replacement of other processors** with at least **30 days' notice**, thereby giving Customer the opportunity to object to such changes. Notification channels:

- Public changelog at `https://studiozero.dev/subprocessors/changelog`
- RSS feed at `https://studiozero.dev/subprocessors/changelog.rss`
- Email to the Customer's primary account email (opt-in form at `https://studiozero.dev/subprocessors/subscribe` — M3)

**Objection process:** Customer may object to the engagement of a new sub-processor by emailing `privacy@studiozero.dev` within the 30-day notice window. Studio Zero will: (a) explore mitigations; (b) accept the objection and not route Customer's data through that sub-processor where technically feasible; or (c) if neither is feasible, allow Customer to terminate the subscription with a pro-rata refund of any unused prepaid period per `legal/terms-of-service.md` §15.3.

Where Studio Zero engages a sub-processor, Studio Zero shall enter into a written contract with that sub-processor that imposes data-protection obligations **at least as protective as those in this DPA** (per Art. 28(4)). The current sub-processor inventory + DPA URLs is at `legal/subprocessors.md` v1.1.

### 6.5 Data-subject-rights assistance (Art. 28(3)(e))

Taking into account the nature of the processing, Studio Zero shall assist the Controller by appropriate technical and organisational measures, insofar as this is possible, for the **fulfilment of the Controller's obligation to respond to requests for exercising the data subject's rights** laid down in Chapter III GDPR.

Concretely:

- **Right of access (Art. 15)** — Studio Zero provides a JSON export of the personal data we hold about a given user via Settings → Privacy → Manage my data, or on email request to `privacy@privacy@studiozero.dev`. SLA: 14 days from receipt of a verifiable request (well within the Controller's 30-day obligation under Art. 12(3)).
- **Right to rectification (Art. 16)** — In-product editing of mutable fields; corrections to immutable fields (e.g., audit-log rows) are handled by ticket on the same 14-day SLA.
- **Right to erasure (Art. 17)** — Customer-initiated deletion via Settings → Account → Delete account, which begins the 30-day erasure process documented at `legal/privacy-policy.md` §3. Backend hook: the data-deletion worker (see `architecture/database/migrations/0006_dmca_and_retention.sql` retention column wiring) propagates erasure to all subprocessors with retained data, subject to lawful retention overrides (billing records 7 years; AUP attestation 7 years per `legal/privacy-policy.md` §3).
- **Right to restriction (Art. 18)** — Account-level restriction flag toggleable by Comply on request; pauses all processing other than storage.
- **Right to portability (Art. 20)** — JSON export per above; machine-readable; transmissible to another Controller on request.
- **Right to object (Art. 21)** — Honoured for any processing based on legitimate interest (Art. 6(1)(f)); Studio Zero will cease such processing unless we demonstrate compelling overriding grounds in writing within 14 days.
- **Right not to be subject to automated decisions (Art. 22)** — Studio Zero does not make decisions about Customer or any data subject using solely automated means that produce legal or similarly significant effects. The audit verdict is **advisory only** (`legal/terms-of-service.md` §10, `legal/ai-system-card-v0.5.md` §2.3). Customers may dispute any verdict via `legal/terms-of-service.md` §14 and obtain human review by Comply + Jury within 5 business days, which satisfies the right to human intervention under Art. 22(3) defensively.

Where a data subject contacts Studio Zero directly with an Art. 15–22 request, Studio Zero shall, **without undue delay**, forward the request to the relevant Controller (i.e., the Customer whose account the data subject belongs to) and refrain from acting on the request directly without the Controller's instruction, except where the request involves the Customer's own account holder.

### 6.6 Assistance with security, breach, DPIA, prior consultation (Art. 28(3)(f) → Art. 32–36)

Studio Zero shall assist the Controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 GDPR, taking into account the nature of processing and the information available to Studio Zero:

- **Art. 32 (security)** — see §6.3 and Annex II.
- **Art. 33 (breach notification to supervisory authority)** — see §9 below; Studio Zero notifies Customer without undue delay so Customer can meet its own 72-hour clock.
- **Art. 34 (breach notification to data subjects)** — Studio Zero supplies the breach detail Customer needs; Customer remains the entity that notifies its data subjects under Art. 34.
- **Art. 35 (DPIA)** — On Customer's request, Studio Zero provides documentation sufficient to support Customer's DPIA: `architecture/system-diagram.md`, `architecture/threat-model.md`, `legal/ai-system-card-v0.5.md` (System Card per EU AI Act Art. 50), and the Security Measures at Annex II.
- **Art. 36 (prior consultation)** — Where Customer's DPIA concludes prior consultation with a supervisory authority is required, Studio Zero will participate in the consultation in good faith.

### 6.7 Return or deletion at termination (Art. 28(3)(g))

See §12 below.

### 6.8 Information and audit (Art. 28(3)(h))

Studio Zero shall make available to the Controller **all information necessary to demonstrate compliance** with the obligations laid down in Article 28 and allow for and contribute to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller. Audit rights are operationalized at §10 below.

---

## 7. Sub-processors (cross-reference)

The current Sub-processor List is at `legal/subprocessors.md` v1.1 and reproduced in summary at Annex III. The 30-day change-notification commitment under Decision #17 is set out at §6.4. Customers may subscribe to the changelog RSS feed at `https://studiozero.dev/subprocessors/changelog.rss`.

---

## 8. International transfers

Where personal data of data subjects in the EU, UK, EEA, or Switzerland is transferred to a third country (most commonly the United States) in the course of Studio Zero providing the service, Studio Zero relies on the following transfer mechanisms, layered:

### 8.1 Standard Contractual Clauses (SCCs)

Studio Zero incorporates by reference **Module Two (Controller-to-Processor) of the Standard Contractual Clauses set out in Commission Implementing Decision (EU) 2021/914 of 4 June 2021** (the "**2021 SCCs**"), as published at `https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj`. Where Studio Zero is itself acting as Sub-processor (rare, only when a corporate customer's structure positions them as Processor and us as Sub-processor), Module Three (Processor-to-Sub-processor) applies on the same terms.

The 2021 SCCs are incorporated by reference into this DPA. In the event of conflict between this DPA and the 2021 SCCs on a matter of cross-border transfer, the 2021 SCCs prevail. Annex IV reproduces the docking provisions and the optional clauses Studio Zero has selected (Clause 7 docking; Clause 9(a) Option 2 general written authorisation; Clause 11(a) Option excluded; Clause 17 Option 1 governing law = Ireland; Clause 18 Option 1 forum = Ireland).

### 8.2 UK International Data Transfer Addendum (IDTA)

For transfers from the United Kingdom, Studio Zero incorporates the **UK International Data Transfer Addendum to the EU Commission's Standard Contractual Clauses (Version B.1.0, in force 21 March 2022)** as published by the UK Information Commissioner's Office. The UK IDTA modifies the 2021 SCCs to function under the UK GDPR and the Data Protection Act 2018.

### 8.3 EU-US Data Privacy Framework

Where a Studio Zero sub-processor is certified under the **EU-US Data Privacy Framework** (and its UK Extension and Swiss-US Framework where applicable), the certification provides an additional, independent transfer mechanism alongside the SCCs/IDTA. Current DPF certification status of each sub-processor is tracked at `legal/subprocessors.md` and at the Department of Commerce list at `https://www.dataprivacyframework.gov/`.

### 8.4 Transfer Impact Assessments (TIAs)

For each sub-processor that processes EU/UK personal data from a third country, Studio Zero maintains a Transfer Impact Assessment at `compliance/tia/<vendor>.md`. The TIAs evaluate the legal regime of the destination country (notably the US FISA 702 / Executive Order 12333 landscape, post-Schrems II), the supplementary measures applied (encryption-in-transit, encryption-at-rest with customer-controlled keys where feasible, tenant isolation, audit logs), and the residual risk. TIAs are re-verified annually or on any material change to the destination-country legal regime.

---

## 9. Personal data breach notification

### 9.1 Studio Zero's obligation to Customer

Studio Zero shall, **without undue delay after becoming aware of a personal data breach** as defined in Art. 4(12) GDPR, notify the Controller. "Without undue delay" means the notification will be sent **within 48 hours of confirmed awareness** in normal circumstances and in any event within sufficient time for the Controller to meet its own 72-hour clock under Art. 33(1).

### 9.2 Content of the notification

The notification will contain, to the extent known and to the extent Studio Zero has sufficient information:

(a) the nature of the personal data breach, including where possible the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned;
(b) the name and contact details of Studio Zero's data protection contact (`privacy@studiozero.dev`);
(c) the likely consequences of the personal data breach;
(d) the measures taken or proposed to be taken by Studio Zero to address the personal data breach, including, where appropriate, measures to mitigate its possible adverse effects.

Where, and in so far as, it is not possible to provide the information at the same time, the information may be provided in phases without further undue delay (Art. 33(4) applied mutatis mutandis).

### 9.3 Studio Zero's own supervisory-authority notification

Where Studio Zero is required to notify a supervisory authority of a personal data breach in its own right (e.g., where Studio Zero acts as Controller for its own employee or marketing-prospect data), Studio Zero will do so within 72 hours of awareness per Art. 33(1).

### 9.4 Breach runbook

The internal breach-response runbook lives at `compliance/breach-runbook.md` (M2 deliverable). It is drilled quarterly and the drill outcomes are logged in the `breach_events` Postgres table per `architecture/system-diagram.md`. State-specific obligations (California AB 1130, New York SHIELD, Massachusetts 201 CMR 17.00 and similar) are honoured on the same timeline.

---

## 10. Audit rights

### 10.1 Customer's right to audit (Art. 28(3)(h))

Customer has the right to **audit Studio Zero's compliance** with this DPA and Article 28. To balance audit rights against the security and operational integrity of a multi-tenant SaaS, audits are scoped as follows:

### 10.2 Annual desk review (standard)

Once per calendar year, Customer (or a third-party auditor under a confidentiality undertaking acceptable to Studio Zero) may request a **desk review** of Studio Zero's compliance documentation, including:

(a) this DPA at its then-current version
(b) the Security Measures at Annex II
(c) the Sub-processor List and TIAs
(d) the latest independent pentest report (M3 onwards)
(e) the latest SOC 2 Type II report once available (V2 target)
(f) breach-response runbook drill outcomes (redacted where another customer's data would otherwise be exposed)

Studio Zero will respond to a desk-review request within 30 days. The review is conducted remotely; on-site visits are not part of the standard desk review.

### 10.3 On-site audit (extraordinary)

Where the desk review identifies a material concern that cannot be resolved by documentation, Customer may request an on-site audit of Studio Zero's premises (the headquarters and the production data-center region for Customer's data). On-site audits:

- Are scheduled with at least 30 days' written notice
- Are conducted during business hours and in a manner that does not unreasonably disrupt Studio Zero's operations
- Are limited to no more than one (1) on-site audit per calendar year per Customer (or per third-party group acting on behalf of Customer)
- Are subject to confidentiality undertakings protecting other customers' data and Studio Zero's trade secrets

### 10.4 Supervisory-authority audits

This Section 10 does not limit the audit rights of a competent supervisory authority under Article 58 GDPR. Studio Zero will cooperate fully with any supervisory-authority inspection and inform the affected Controller(s) where the inspection concerns their data and where notice is not prohibited by the authority.

### 10.5 Costs

Customer bears its own costs and the costs of any third-party auditor it engages. Studio Zero bears the costs of its own personnel time supporting the audit, up to a reasonable threshold; where an audit identifies a material non-compliance attributable to Studio Zero, Studio Zero will additionally bear Customer's reasonable audit costs to the extent caused by the non-compliance.

---

## 11. Confidentiality

All information exchanged under or in connection with this DPA — including the Security Measures, the breach runbook, pentest reports, and audit findings — is **confidential** and may not be disclosed by Customer to any third party without Studio Zero's prior written consent, except (a) to Customer's professional advisers under equivalent confidentiality obligations, (b) to a competent supervisory authority, or (c) as required by law. Studio Zero's reciprocal confidentiality obligation as to Customer's personal data is at §6.2.

---

## 12. Return and destruction at termination (Art. 28(3)(g))

At the choice of the Controller, on termination of the services relating to processing, Studio Zero shall **delete or return all personal data to the Controller** after the end of the provision of services and **delete existing copies** unless Union or Member State law requires storage of the personal data.

### 12.1 Default — deletion

Unless Customer instructs otherwise in writing within 30 days of termination, Studio Zero will **delete all personal data** processed under this DPA in accordance with the retention table at `legal/privacy-policy.md` §3. Specifically:

- **Customer code** — cryptoshredded immediately on termination (the per-tenant Vault key is destroyed; all encrypted ciphertext and backups become unreadable within 90 seconds; tested by `tests/integration/cryptoshredding.spec.ts`).
- **Findings, verdicts, scores** — available for export by Customer for **90 days** post-termination per Terms of Service §13.3, then deleted.
- **Account identifiers, project metadata** — deleted within 30 days of termination, subject to §12.3 lawful-retention overrides.
- **Submitted URLs (Surface tier)** — deleted within 30 days of termination.

### 12.2 Return on request

On Customer's written request within 30 days of termination, Studio Zero will provide a **machine-readable JSON export** of the personal data, transmissible to Customer or a successor Controller. Format mirrors the Art. 20 portability export.

### 12.3 Lawful-retention overrides

Notwithstanding §12.1 and §12.2, Studio Zero will **retain** the following data classes beyond termination for the periods specified at `legal/privacy-policy.md` §3, on the lawful basis of legal obligation (Art. 6(1)(c)):

- **Billing events and tax records** — 7 years (US + EU tax/accounting law)
- **Audit logs (administrative actions)** — 7 years (SOC 2 readiness + FTC 16 CFR 425.7 cancellation-record-keeping minimum 3 years)
- **AUP attestation records** — 7 years (CFAA defense; statute of limitations buffer per `legal/aup.md` §1.1)
- **Consent records** — term of relationship + 3 years (GDPR Art. 7(1) demonstrability)

Retained data is access-controlled, tenant-id-stamped, and subject to the same Security Measures (Annex II) as live data.

---

## 13. Liability and indemnification

### 13.1 Liability under this DPA

Each party's liability arising out of or in connection with this DPA is subject to the **liability cap and exclusions in `legal/terms-of-service.md` §12**, except where applicable mandatory law (notably GDPR Art. 82 on data-subject compensation) prevents such limitation.

### 13.2 Article 82 GDPR carve-out

Nothing in this DPA limits a data subject's right to compensation against either party under Art. 82 GDPR. Where a data subject brings a claim under Art. 82 against one party, the other party shall provide reasonable assistance with the defense at no charge, and the parties shall apportion liability between themselves consistent with Art. 82(4)–(5) (joint and several liability with right of recourse based on each party's share of responsibility).

### 13.3 Indemnification

Customer indemnifies Studio Zero against claims by a data subject (or by a supervisory authority) where the claim arises from Customer's **breach of its Controller obligations** (e.g., Customer instructed Studio Zero to process special-category data; Customer failed to obtain consent where consent was the relevant lawful basis; Customer submitted personal data Customer was not authorized to submit). Studio Zero indemnifies Customer for **breaches by Studio Zero of its Processor obligations** under this DPA. The full indemnification mechanic, including notice + control-of-defense, is in `legal/terms-of-service.md` §12.3–§12.4.

---

## 14. Governing law and dispute resolution

### 14.1 Governing law

This DPA is governed by the laws of the **Republic of Ireland** for purposes of the SCCs (Clause 17 Option 1 selection) and by the laws of the **State of Delaware, USA** for all other purposes (per `legal/terms-of-service.md` §17), except where mandatory consumer-protection law of a Customer's country of residence governs irrespective.

### 14.2 Dispute resolution

Disputes arising under this DPA follow the same path as disputes under the Terms of Service: §14 (pre-chargeback Dispute Finding), then §16 (arbitration for US residents who have not opted out), then §17 (Delaware courts). EU/UK consumer disputes about data-protection rights may additionally be brought before the lead supervisory authority of the Customer's country of residence.

---

## 15. Amendments + version control

### 15.1 Amendments

Studio Zero may amend this DPA from time to time. Where the amendment is **material** (defined as in `legal/terms-of-service.md` §15.1), Customer will be notified by email at least **30 days before the amendment takes effect** and the new version will be published at `https://studiozero.dev/legal/dpa` with a fresh effective date and a changelog entry.

Customers who do not agree with a material amendment may terminate per `legal/terms-of-service.md` §15.3 and receive a pro-rata refund.

### 15.2 Immediate amendments for regulatory compliance

Where the EU Commission, the European Data Protection Board, the UK ICO, or a supervisory authority issues a binding decision that requires immediate amendment (e.g., a new SCC version; a new IDTA version; a fresh Schrems-style ruling that invalidates a transfer mechanism), Studio Zero may amend with notice as soon as practicable after the change.

### 15.3 Version history

A public changelog is at `https://studiozero.dev/legal/dpa/changelog`. Every version of this DPA is preserved, dated, and diff-viewable from M4 onwards (M4 publishes the route; M5 ships the downloadable PDF).

### 15.4 PDF target

A downloadable PDF of this DPA at the current version is on the M4 + M5 roadmap per `sprint/milestone-M4.md` (publishes the link) + `sprint/milestone-M5.md` (the PDF rendering service goes live; vendor selection per `legal/subprocessors.md` §4 row 16). Until then, the canonical artifact is this Markdown file at `legal/data-processing-agreement.md`.

---

## 16. Contact

- **Data protection inquiries:** `privacy@studiozero.dev`
- **DPA execution requests:** `privacy@studiozero.dev`
- **EU/UK Article 27 representative:** _(placeholder — Studio Zero will appoint a GDPR-Rep.com or VeraSafe-style entity by M2 ship; see `legal/privacy-policy.md` §12. Once appointed, contact is `eu-rep@studiozero.dev`.)_
- **Security incidents:** `security@studiozero.dev` (PGP fingerprint at `/.well-known/security.txt`)
- **Mailing address:** Studio Zero, Inc., 1209 Orange Street, Wilmington, DE 19801, USA (registered agent — for legal notice service only).

---

# Annex I — Processing Details

## I.1 Categories of personal data

See §5.1 above and `legal/privacy-policy.md` §2 for the full inventory.

## I.2 Categories of data subjects

See §5.3 above.

## I.3 Retention

See `legal/privacy-policy.md` §3 (full retention table) and §12 above.

## I.4 Purposes

See §4 above.

## I.5 Frequency of processing

Continuous, on Customer demand (audits run on-demand; webhooks process in near-real-time; emails dispatched per the lifecycle cadence).

---

# Annex II — Security Measures (Art. 32)

The technical and organisational measures Studio Zero implements to ensure a level of security appropriate to the risk.

## II.1 Pseudonymisation and encryption (Art. 32(1)(a))

- **In transit:** TLS 1.3 minimum (1.2 for legacy clients) for every external connection.
- **At rest:** AES-256 (Supabase managed) for database; **XChaCha20-Poly1305 AEAD** with per-tenant `tenant_id::text` AAD for BYOK keys in Supabase Vault (Cipher Fix-4).
- **In-process:** Customer code transient in runner heap; cleared after the LLM call returns (`tests/acceptance/goal-4-three-modes.spec.ts` BYOK heap-scan assertion).
- **Pseudonymisation:** `tenant_id` HMAC-hashed before any analytics transmission to PostHog (Cipher Fix-3b at `apps/web/lib/analytics-gate.ts`); PostHog never sees the raw tenant UUID.

## II.2 Confidentiality, integrity, availability, resilience (Art. 32(1)(b))

- **Confidentiality:** Postgres Row-Level Security; tenant-id-stamped logs; secret redaction at log middleware; Sentry `beforeSend` PII scrub; rootless seccomp-filtered runner containers.
- **Integrity:** Append-only audit log; signed Stripe webhooks (signature verification before any DB write — `finance/stripe-config.md` §3.2); HMAC over JWT for runner tokens.
- **Availability:** Multi-region CDN via Vercel + Cloudflare; Postgres backups via Supabase; pg-boss job queue with retries.
- **Resilience:** Toxiproxy chaos tests (Crash); load tests at 100 concurrent Managed runs sustained 30 min (`tests/load/per-tenant-token-cap.k6.js`).

## II.3 Ability to restore (Art. 32(1)(c))

Supabase managed Postgres provides point-in-time recovery for the retention window. Backups encrypted at rest. Recovery procedure documented in the breach runbook (M2 deliverable).

## II.4 Regular testing (Art. 32(1)(d))

- **Continuous:** CI gates on every PR — RLS cross-tenant test, secret-scan, axe-core a11y, integration test suite, prompt-injection corpus.
- **Quarterly:** Comply re-verifies this DPA, the Subprocessor List, and the System Card.
- **Annual:** Independent third-party pentest from M3 onwards per `compliance/pentest-engagement-2026.md`.
- **Quarterly:** Breach-response runbook drill.

## II.5 Sub-processor controls

Every sub-processor is bound by a DPA at least as protective as this one (Art. 28(4)). Sub-processor security posture (SOC 2 Type II, ISO 27001 certificate, recent pentest summary) is reviewed before engagement by Cipher and Shield per `legal/subprocessors.md` §6.

## II.6 Personnel measures

- **Confidentiality undertakings** in every Studio Zero employment and contractor agreement.
- **Least-privilege access** — production access restricted to on-call engineers with audit-logged sessions.
- **Background checks** — to be implemented at first 5-FTE headcount; until then, Jo personally vets every contractor.
- **Security training** — annual; logged.

## II.7 Specific controls map

| Risk                        | Control                                                                 | Test                                                                 |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Cross-tenant data leak      | RLS + tenant-id-stamped JWT + per-run prompt scoping                    | `tests/acceptance/goal-5-rls-cross-tenant.spec.ts`                   |
| Secret leakage in findings  | Pre-prompt + post-response redaction (30-format corpus)                 | `tests/security/redaction-middleware.spec.ts` (PR-blocking)          |
| Prompt injection            | Runner middleware strip; rootless egress-allowlisted containers         | `tests/security/prompt-injection-corpus.spec.ts` (≥200 patterns)     |
| Sandbox escape              | Rootless + seccomp + dropped caps + egress allowlist                    | `tests/security/sandbox-escape-top30.spec.ts`                        |
| SSRF                        | URL allowlist + DNS pinning                                             | `tests/security/ssrf-corpus.spec.ts` (≥100 patterns at M2)           |
| Stripe webhook forgery      | Signature verification before any DB write                              | `tests/integration/stripe-checkout-and-webhook.spec.ts`              |
| Token-budget overrun (R1)   | Per-tenant daily rollup + `check_token_budget(uuid)`                    | `tests/load/per-tenant-token-cap.k6.js`                              |
| BYOK key plaintext leak     | Supabase Vault XChaCha20-Poly1305 + tenant-id AAD                       | Heap-scan assertion in `tests/acceptance/goal-4-three-modes.spec.ts` |
| Disclosure machinery absent | `X-AI-Generated` header + `<meta name="ai-generated">` (Art. 50 AI Act) | `tests/integration/disclosure-headers.spec.ts`                       |
| Consent-pre-init analytics  | Consent-gated lazy-init of PostHog                                      | `tests/integration/analytics-consent-gate.spec.ts`                   |

---

# Annex III — Sub-processor List (Summary)

The full Sub-processor List is at `legal/subprocessors.md` v1.1. Summary at M2:

- **Core (in use):** Supabase, Anthropic, Stripe, GitHub, Vercel, Cloudflare, Railway (subprocessors #1–#7).
- **Observability (in use):** Sentry, PostHog, Resend (subprocessors #8–#10).
- **Conditional (consent-gated):** Google Analytics, Meta Pixel, LinkedIn Insight (subprocessors #11–#13).
- **Reserved (not in use; flagged to V1.5/V2):** OpenRouter, Replicate, third-party PDF rendering (subprocessors #14–#16).

Customer authorizes Studio Zero to engage these sub-processors under §6.4. Change-notification per Decision #17: 30-day notice via `https://studiozero.dev/subprocessors/changelog` + RSS feed.

---

# Annex IV — SCC Docking Provisions

For the 2021 SCCs incorporated by reference under §8.1:

- **Clause 7 (Docking clause)** — applies; additional entities may accede by signing Annex I.A.
- **Clause 9 (Sub-processors), Option 2 (General written authorisation)** — selected; 30-day change-notification commitment per §6.4.
- **Clause 11 (Redress), optional language** — excluded.
- **Clause 17 (Governing law), Option 1** — laws of Ireland.
- **Clause 18 (Choice of forum and jurisdiction), Option 1** — courts of Ireland.

The 2021 SCC Annexes I (parties, processing details), II (technical and organisational measures), and III (sub-processors) are populated by Annex I, Annex II, and Annex III of this DPA respectively.

For transfers from the UK, the UK IDTA (Version B.1.0, 21 March 2022) modifies the above as published by the ICO at `https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-data-transfer-agreement-and-guidance/`.

---

_Comply locks this DPA at v1.0 on 2026-05-12 for M2 LIVE per Decision #17. Re-verify quarterly. Any regulatory change (a new SCC version; a new UK IDTA version; an EU AI Act Art. 50 amendment binding 2026-08-02; a Schrems-style ruling on transfer mechanisms; CCPA/CPRA regulation updates) triggers a version bump per §15._
