# Studio Zero — Privacy Policy

**Version:** 1.0 (M1 first draft)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**PRD anchors:** §14.4 (privacy & retention), §14.5 (compliance), §13.2 (database / RLS), §13.6 (observability — consent gates)
**Cross-references:** `legal/terms-of-service.md`, `legal/aup.md`, `legal/subprocessors.md`, `marketing/analytics-spec.md` (event taxonomy), `architecture/system-diagram.md` (subprocessor flow), `finance/refund-matrix.md` §5 (CCPA surface)
**Voice:** plain English, grade-9 ceiling, sentence case per `brand/voice.md`. We say what we mean.

> **Plain-English mandate.** Per `agents/operations/comply.md`: data is toxic waste. This policy tells you what we keep, why, for how long, and how to get it out. If a sentence in this file is jargon, it has failed; tell us at `privacy@studiozero.dev` and we will fix it.

---

## 1. What this Privacy Policy covers

This Privacy Policy ("**Policy**") describes how **Studio Zero, Inc.** ("**Studio Zero**," "**we**," "**us**") collects, uses, retains, shares, and protects personal information when you use our service. It applies to:

- the marketing site at `studiozero.dev` and its subdomains;
- the authenticated app at `studiozero.dev/app/*`;
- the `studio-zero` npm package (CLI companion);
- audits run on your behalf through any execution mode (BYOK, Claude Code CLI, or Managed);
- transactional and lifecycle emails we send you.

This Policy is incorporated by reference into the Terms of Service at `legal/terms-of-service.md`.

---

## 2. What we collect, why, and on what legal basis

We collect only the data we need. The table below maps each data class to its purpose and to the GDPR Article 6 lawful basis we rely on.

| Data class                             | What it is                                                                                                                                                        | Why we collect it                                                      | GDPR Art. 6 lawful basis                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Account identifiers**                | Email, hashed password (or OAuth provider ID), display name                                                                                                       | Authenticate you; send transactional emails                            | Art. 6(1)(b) contract performance                                                                                           |
| **Billing identifiers**                | Stripe customer ID, last 4 of card, billing country, VAT/tax ID                                                                                                   | Process payments; comply with tax law                                  | Art. 6(1)(b) contract + 6(1)(c) legal obligation                                                                            |
| **Project metadata**                   | Repository URL, GitHub installation ID, project name, the audit depth you picked                                                                                  | Run the audit you asked for; show it in your dashboard                 | Art. 6(1)(b) contract performance                                                                                           |
| **Submitted code**                     | Source files we cloned for the audit                                                                                                                              | Run the audit; produce findings                                        | Art. 6(1)(b) contract performance                                                                                           |
| **Submitted URLs**                     | The URL you asked us to audit (Surface tier)                                                                                                                      | Run the external audit                                                 | Art. 6(1)(b) contract performance                                                                                           |
| **Audit findings + verdicts + scores** | The output we produce for you                                                                                                                                     | Deliver the product; let you re-audit; show history                    | Art. 6(1)(b) contract performance                                                                                           |
| **Run telemetry**                      | Run ID, mode (BYOK / CLI / Managed), duration, token counts, retry counts, agent names invoked                                                                    | Compute SLOs; bill (Managed); debug                                    | Art. 6(1)(b) contract + 6(1)(f) legitimate interest (debugging)                                                             |
| **API key references**                 | A reference to your BYOK Anthropic key (the key itself is in Supabase Vault, encrypted with XChaCha20-Poly1305 AEAD, tenant-isolated; we never log the plaintext) | Forward your audit requests to Anthropic on your key                   | Art. 6(1)(b) contract performance                                                                                           |
| **Consent records**                    | Your cookie-banner choice, the timestamp, your IP, your user agent                                                                                                | Demonstrate consent per GDPR Art. 7(1)                                 | Art. 6(1)(c) legal obligation                                                                                               |
| **AUP attestation**                    | The "I own or am authorized" checkbox state at each audit intake; timestamp, IP, user_id                                                                          | Defend against unauthorized-audit claims (CFAA risk)                   | Art. 6(1)(f) legitimate interest                                                                                            |
| **Audit logs (admin actions)**         | Logins, payment events, account-setting changes, cancellation events, dispute events                                                                              | Security; SOC2 readiness; FTC 16 CFR 425.7 cancellation record-keeping | Art. 6(1)(c) legal obligation + 6(1)(f) legitimate interest (security)                                                      |
| **Marketing-site analytics (PostHog)** | Page views, events from `marketing/analytics-spec.md` event registry; tenant_id HMAC-hashed (Cipher Fix-3b)                                                       | Measure funnels; improve copy                                          | Art. 6(1)(a) **consent only** — initialized only after the consent banner returns `accepted` or `partial` with analytics on |
| **Error capture (Sentry)**             | Stack traces from server + browser errors; PII scrubbed via `apps/web/lib/sentry-redaction.ts`                                                                    | Diagnose and fix bugs                                                  | Art. 6(1)(f) legitimate interest (necessary for service reliability)                                                        |
| **Email engagement**                   | Whether a transactional or lifecycle email was opened or clicked (where we use Resend's tracking; lifecycle emails only)                                          | Improve email timing; comply with CAN-SPAM (link to unsubscribe)       | Art. 6(1)(a) consent (lifecycle marketing) + 6(1)(b) contract (transactional)                                               |
| **IP address (server logs)**           | Truncated /24 (IPv4) or /48 (IPv6) for general logs; full IP only at the consent-record, AUP-attestation, and cancellation-event rows                             | Security + abuse defense + legal record-keeping                        | Art. 6(1)(f) legitimate interest + 6(1)(c) legal obligation                                                                 |

### 2.1 What we explicitly do not collect

- We do not collect biometric or genetic data.
- We do not collect precise geolocation (we resolve country/region from IP + billing address, no GPS).
- We do not knowingly collect data from anyone under 18 (see §11 for our children's policy).
- We do not collect special-category data under GDPR Art. 9 (health, religion, sexual orientation, etc.). Do not submit such data to Studio Zero.
- We do not collect data we do not need (Comply Rule #1: data is toxic waste).

---

## 3. Retention table

We delete data when we no longer have a lawful basis to keep it. The defaults below are bounded by the more aggressive of (a) what the regulation requires and (b) what we genuinely need.

| Data class                      | Default retention                        | You can change it                                         | Why                                                                                       |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Customer code (BYOK / Managed)  | **7 days**                               | 0–30 days via Settings → Privacy                          | Cryptoshredding via Supabase Vault key delete; storage limitation under GDPR Art. 5(1)(e) |
| Submitted URLs (Surface)        | 90 days                                  | Delete on request                                         | Re-audit convenience; you can delete sooner                                               |
| Findings + verdicts + scores    | **24 months**                            | Export + delete on request                                | Storage limitation; product utility (re-audit comparison)                                 |
| Run telemetry                   | 24 months                                | Not customer-overridable                                  | SLO history; score-engine version control                                                 |
| API key references (Vault refs) | Until you delete the key, then immediate | Yes, at Settings → Integrations                           | Contract performance                                                                      |
| Consent records                 | Term of relationship + 3 years           | Not customer-overridable                                  | GDPR Art. 7(1) demonstrability; do not delete proof you consented                         |
| AUP attestation                 | 7 years                                  | Not customer-overridable                                  | CFAA defense; statute of limitations buffer                                               |
| Audit logs (admin actions)      | **7 years**                              | Not customer-overridable                                  | SOC 2 / legal hold; FTC 16 CFR 425.7 requires 3 years on cancellation events specifically |
| Billing events                  | **7 years**                              | Not customer-overridable                                  | Tax + accounting law                                                                      |
| Marketing-site analytics        | 24 months in PostHog                     | Withdrawable at any time via "Manage cookies" footer link | Funnel analysis                                                                           |
| Error capture (Sentry)          | 90 days                                  | Not customer-overridable                                  | Bug investigation horizon                                                                 |
| Email engagement                | 90 days                                  | Withdrawable via Unsubscribe link                         | CAN-SPAM 10-day clock                                                                     |
| Server logs (truncated IP)      | 7 days                                   | Not customer-overridable                                  | Security investigation horizon                                                            |

When customer code is deleted (default day 7), we cryptoshred — the per-tenant Supabase Vault key is destroyed, all encrypted ciphertext and backups become unreadable, and the Postgres rows are dropped. Cryptoshred completes within 90 seconds end-to-end; the integration test that proves this is `tests/integration/cryptoshredding.spec.ts`.

---

## 4. Cookies and similar technologies

We use cookies for three purposes only. The cookie banner you saw on first visit lets you accept all, reject non-essential, or pick by bucket. We re-prompt every 13 months (GDPR EDPB guidance) or any time we add a cookie.

### 4.1 Cookie inventory

| Bucket        | Cookie / storage                                       | Purpose                           | Default              | Required?                                |
| ------------- | ------------------------------------------------------ | --------------------------------- | -------------------- | ---------------------------------------- |
| **necessary** | `sz_session` (httpOnly, Secure, SameSite=Lax, 7-day)   | Keep you logged in                | On                   | Yes — service cannot function without it |
| **necessary** | `sz_consent` (SameSite=Lax, 13-month)                  | Remember your consent choice      | On                   | Yes — required to honor your choice      |
| **necessary** | `sz_csrf` (httpOnly, Secure, SameSite=Strict, session) | CSRF protection on POST routes    | On                   | Yes — security                           |
| **analytics** | `ph_*` (PostHog: distinct_id, anon_id, session_id)     | Measure funnels and feature usage | Off until you accept | No                                       |
| **analytics** | `_ga`, `_ga_*` (GA4)                                   | Cross-channel attribution         | Off until you accept | No                                       |
| **marketing** | `_fbp` (Meta Pixel)                                    | Re-engage on paid social (M3+)    | Off                  | No — only if you accept marketing        |
| **marketing** | `li_at` (LinkedIn Insight)                             | LinkedIn paid attribution (M3+)   | Off                  | No                                       |

The `consent_kind` enum in our database mirrors these buckets exactly: `{'necessary', 'analytics', 'marketing'}`. See `marketing/analytics-spec.md` §1 for the technical gate and `architecture/iac/observability/posthog.md` for the lazy-init mechanics.

### 4.2 Withdrawing consent

Click **"Manage cookies"** in the site footer. Your previous choice loads; toggle off any bucket and save. Analytics and marketing tools immediately call `opt_out_capturing()`; no further events fire from those tools. We log the change as a `consent_changed` event (the only event allowed across a withdrawal boundary, per GDPR Art. 7(3)).

### 4.3 Do Not Track / Global Privacy Control

We honor the `Sec-GPC: 1` header as a binding opt-out from sale or sharing (CCPA §1798.135(b)). Browsers that send GPC are treated as if the customer clicked "Reject non-essential" on the cookie banner.

---

## 5. How we share data — Subprocessors

We share data only with the vendors listed in `legal/subprocessors.md`. Each is contractually bound to handle your data under data-processing terms at least as strict as ours. **We do not sell your personal information. We do not share your personal information for cross-context behavioral advertising as defined by CCPA §1798.140(ah).**

Headline subprocessors (full list at `legal/subprocessors.md`):

- **Supabase** — primary database, auth, vault, storage. (US East 1)
- **Anthropic** — LLM inference. (US)
- **Stripe** — payment processing. (Global)
- **GitHub** — source repository access via the Studio Zero GitHub App. (Global)
- **Vercel** — web hosting + CDN. (US East 1)
- **Cloudflare** — DNS + edge protection. (Global)
- **Railway** — runner pool host. (US East)
- **Sentry** — error capture. (US)
- **PostHog** — analytics + feature flags. (US)
- **Resend** — transactional + lifecycle email. (US)

We notify you at least 30 days before adding a new subprocessor (Decision #17). The `/subprocessors` page is the canonical version; subscribing to its RSS feed is the supported way to track changes.

### 5.1 International transfers

Some subprocessors operate from the United States. Where personal data of EU/UK residents is transferred to the US, we rely on:

- **Standard Contractual Clauses (SCCs)** — 2021 EU Commission decision module 2 (controller-to-processor). Executed with Anthropic, Stripe (US entity), Sentry, PostHog, Resend, Vercel, and Cloudflare.
- **UK International Data Transfer Addendum** — for transfers from the UK.
- **EU-US Data Privacy Framework certification** where the subprocessor is certified (currently Stripe; we track each subprocessor's DPF status in `legal/subprocessors.md`).

We perform a Transfer Impact Assessment for each US subprocessor; the assessment file lives at `compliance/tia/<subprocessor>.md` (M2 deliverable).

### 5.2 Government and law-enforcement requests

We do not voluntarily disclose customer data to governments. If we receive a lawful order (subpoena, warrant, court order), we:

1. Review for facial validity. Vague or overbroad orders are challenged.
2. Where the order does not prohibit notice, **we notify you before disclosing** so you can seek a protective order or otherwise respond.
3. Where notice is prohibited, we note the order in our **Transparency Report** (published annually starting M5).
4. Disclose the narrowest set of data responsive to the order.

---

## 6. Your rights

### 6.1 GDPR / UK GDPR rights (EU and UK residents)

You have the right to:

- **Access** (Art. 15) — a copy of the personal data we hold about you, in machine-readable form.
- **Rectification** (Art. 16) — correction of inaccurate data.
- **Erasure** (Art. 17) — deletion of your personal data ("right to be forgotten").
- **Restriction** (Art. 18) — temporary halt to processing while we investigate a dispute.
- **Portability** (Art. 20) — your data in a portable JSON format, transmissible to another controller.
- **Objection** (Art. 21) — to processing based on legitimate interest; we will stop unless we demonstrate compelling overriding grounds.
- **Object to automated decisions, including profiling** (Art. 22) — Studio Zero does not currently make decisions about you using solely automated means that produce legal or similarly significant effects. The audit verdict itself is an automated AI output but it is advisory only and does not bind you or any third party to a legal consequence; you can dispute it under `legal/terms-of-service.md` §14.
- **Withdraw consent** (Art. 7(3)) — for any processing where consent is the lawful basis. Withdrawal does not affect the lawfulness of prior processing.
- **Lodge a complaint** with your supervisory authority (Art. 77). The EDPB publishes contact details for every national DPA at `https://edpb.europa.eu/about-edpb/board/members_en`.

#### Response SLA

**30 days** from the date we receive a verifiable request, per Art. 12(3). Extendable by 60 days for complex requests; we notify you within the original 30-day window if we need the extension.

#### How to make a request

Email `privacy@studiozero.dev` with the subject line `Privacy request — <type>`, or use Settings → Privacy → Manage my data in-app. We verify identity via your logged-in session for routine requests; for sensitive PI removal we step up (email confirmation + a second factor). See `finance/refund-matrix.md` §5.3 for the verification policy.

### 6.2 CCPA / CPRA rights (California residents)

You have the right to:

- **Know** what categories of personal information we collect, the sources, the purposes, the categories of third parties we share with, and the specific pieces we have collected (§1798.110, §1798.115).
- **Delete** your personal information (§1798.105).
- **Correct** inaccurate personal information (§1798.106, CPRA addition).
- **Opt out of sale or sharing** (§1798.120) — though we do not sell or share for cross-context behavioral advertising, the opt-out form exists.
- **Limit use of sensitive personal information** (§1798.121) — though we do not collect sensitive PI as defined.
- **Non-discrimination** — we do not deny service, charge a different price, or provide a different level of service because you exercised a CCPA right (§1798.125).

#### Response SLA

**45 days** from receipt of a verifiable request, extendable once by 45 more days on notice, per §1798.130(a)(2)(ii).

#### "Your Privacy Choices" surface

Link in every page footer per CCPA §1798.135. Lands at `/legal/privacy-choices`. Forms for right-to-know, right-to-delete, and right-to-correct are there. Full copy at `finance/refund-matrix.md` §5.

### 6.3 Other regions (informational)

We aim for the substance of the highest standard everywhere. If you live in a region we do not list (Canada, Brazil, Australia, South Korea, Japan, etc.), email `privacy@studiozero.dev`; we will honor the substance of GDPR rights as our baseline.

---

## 7. Breach notification

We will notify the relevant supervisory authority of a personal-data breach **within 72 hours** of becoming aware of it, per GDPR Art. 33. We will notify affected users **without undue delay** when the breach is likely to result in a high risk to your rights and freedoms, per GDPR Art. 34 — typically the same 72-hour window unless an investigation in good faith requires more time.

The breach response is operated from `compliance/breach-runbook.md` (M2 deliverable). Drilled quarterly. Logged in the `breach_events` Postgres table per `architecture/system-diagram.md`.

State-specific obligations (California AB 1130, New York SHIELD, Massachusetts 201 CMR 17.00, and others) are honored on the same timeline.

---

## 8. Security

We take security seriously. Headline controls (the full set is in `architecture/system-diagram.md` and `architecture/threat-model.md`):

- All data in transit encrypted with TLS 1.3 (minimum 1.2 for legacy clients).
- All data at rest encrypted with AES-256 (Supabase managed) or, for BYOK keys, **XChaCha20-Poly1305 AEAD** with per-tenant `tenant_id::text` AAD (Cipher Fix-4).
- Multi-tenant isolation via Postgres Row-Level Security; every query carries a tenant filter. Cross-tenant queries are denied by the database, not just by application code.
- Runner workers are rootless, seccomp-filtered, egress-allowlisted (ARCH-D9). One audit per container; nothing persists between runs.
- Logs are tenant-id-stamped; secrets are redacted at the log middleware with a 30-format corpus; Sentry has a `beforeSend` redactor.
- Independent third-party pentest scheduled for M3 (see `compliance/pentest-engagement-2026.md`).

No system is unhackable. If you suspect a vulnerability, please report it to `security@studiozero.dev` (PGP fingerprint published at `/.well-known/security.txt`). We follow a 90-day responsible-disclosure window and credit reporters who request credit.

---

## 9. Automated decision-making and the EU AI Act

### 9.1 What we do with AI

Studio Zero's findings, scores, and audit verdicts are generated by AI agents using Anthropic Claude models. This is the core product. Per the EU AI Act Article 50 (binding 2026-08-02), and our own interim disclosure machinery (PRD §11.3), every page on the service carries:

- HTTP header `X-AI-Generated: studio-zero` on every response;
- `<meta name="ai-generated" content="studio-zero">` in every HTML page;
- a System Card at `/system-card` (see `legal/ai-system-card-v0.1.md`).

### 9.2 You can opt out of relying on AI-generated outputs

Audit verdicts are advisory; you decide whether to act. If you would prefer not to receive AI-generated content, do not use Studio Zero — there is no non-AI path through the product.

### 9.3 You can dispute a finding

See `legal/terms-of-service.md` §14 (Dispute Finding path) and `finance/refund-matrix.md` §6. Human review by Comply + Jury within 5 business days. The dispute path is the lawful response under GDPR Art. 22(3) right to "obtain human intervention" if the AI verdict were ever construed as a decision with legal or similarly significant effect — which, in our reading, it is not, but the dispute path satisfies the requirement defensively.

---

## 10. Children

Studio Zero is not directed at, and we do not knowingly collect personal information from, anyone under 18. If we learn a user is under 18, we will delete the account and any associated data. If you are a parent or guardian and you believe your child has provided us with personal information, email `privacy@studiozero.dev`.

---

## 11. Changes to this Policy

We may update this Policy. When we make a **material change** — definition same as `legal/terms-of-service.md` §15.1 — we notify you by email at least 30 days before the change takes effect, and we update the effective date at the top of this file. The changelog is at `https://studiozero.dev/privacy/changelog`.

Immediate changes are reserved for legal compliance (e.g., a new EU AI Act provision binding tomorrow). We notify as soon as practicable.

---

## 12. Contact

- **Privacy inquiries and rights requests:** `privacy@studiozero.dev`
- **General legal:** `legal@studiozero.dev`
- **Security disclosure:** `security@studiozero.dev`
- **Abuse / AUP violations:** `abuse@studiozero.dev`
- **Mailing address:** Studio Zero, Inc., 1209 Orange Street, Wilmington, DE 19801, USA
- **EU / UK Article 27 representative:** **[placeholder — to be appointed by M2 ship; will be a GDPR-Rep.com or VeraSafe entity once contract signs]**. Email `eu-rep@studiozero.dev` (forwarded to the appointed representative when in place; bounced to `privacy@studiozero.dev` until then with an auto-reply explaining the interim arrangement). The appointment will appear on the published Policy version that ships before our first EU paid customer (M2).
- **California consumers — Your Privacy Choices:** `https://studiozero.dev/legal/privacy-choices`

---

_Comply locks this Privacy Policy at v1.0 on 2026-05-12. Re-verify quarterly. Any regulatory change (EU AI Act Art. 50 binding 2026-08-02; CPRA regulation updates; Anthropic data-handling posture changes for commercial customers; Supabase or other subprocessor data-residency changes) triggers a version bump._
