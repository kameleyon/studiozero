# Studio Zero — Acceptable Use Policy

**Version:** 1.0 (M1 first draft)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**PRD anchors:** §14.7 (AUP — original mandate), §17 Decision #20 (regional refund matrix on termination)
**Cross-references:** `legal/terms-of-service.md`, `legal/privacy-policy.md`, `finance/refund-matrix.md` (RT-10 AUP termination row)
**Voice:** plain English, grade-9 ceiling, sentence case per `brand/voice.md`.

> This Acceptable Use Policy ("**AUP**") is incorporated by reference into the Terms of Service at `legal/terms-of-service.md`. Violating the AUP is a breach of the Terms and may result in suspension, termination, and (where appropriate) law-enforcement referral. We aim to enforce this AUP **proportionally**: the response to a first minor breach is not the response to malicious abuse.

---

## 1. The load-bearing rule — URL-audit authorization

**You may only audit URLs, repositories, or other artifacts that you own, or for which you have written authorization from the owner.**

This is the single rule that, if broken, exposes both you and Studio Zero to liability under the U.S. Computer Fraud and Abuse Act (18 U.S.C. §1030), the UK Computer Misuse Act 1990, and equivalent statutes worldwide. We take it seriously.

### 1.1 The attestation checkbox

At every audit intake, before the audit begins, you must tick this checkbox:

> **□ I am the owner of, or have written authorization to audit, the URL or repository above.**

We log every attestation in `audit_logs` with timestamp, IP, user agent, user_id, and the artifact in question. The log row is retained for **7 years** (see `legal/privacy-policy.md` §3). The retention is deliberately long: if you submit a false attestation and the rightful owner objects, we need the record.

### 1.2 What "authorized" means

You are authorized to audit something if at least one of these is true:

- You are the owner (you bought the domain, you wrote the code, you control the deployment).
- You are an employee or contractor acting within the scope of your role for the owner.
- You have a written agreement (engagement letter, statement of work, email confirmation, ticket) from the owner that names the artifact and permits security/accessibility/quality auditing.
- You are an officer or named representative of the legal entity that owns the artifact.

The following are **not** authorization:

- "It's a public URL" — public visibility is not the same as authorization to audit at depth. A Surface audit hits a page once with a headless browser, which is broadly defensible under normal-browsing-equivalent doctrine. A Code audit clones the repo, which absolutely requires authorization.
- "My friend works there and said it's fine" — verbal authorization from a non-owner is not authorization.
- "I plan to acquire the company" — due-diligence engagements require written scope from the seller, not the buyer's assumption.
- "It's my old job, I still have the credentials" — your authorization terminates when your employment terminates.

### 1.3 What happens if you submit a false attestation

We suspend your account immediately on credible reports from the rightful owner. Investigation follows. If the false attestation is confirmed:

- We terminate your account.
- We retain the audit logs (we are required to).
- We share the records with the rightful owner if they request them as part of a civil or criminal action.
- We may report to law enforcement if the misuse appears criminal.
- No refund is owed for the unused portion of any subscription (see `finance/refund-matrix.md` RT-10 termination row; AUP violation involving unauthorized auditing is one of the no-refund carve-outs).

---

## 2. Prohibited content

You may not submit, host, or generate via Studio Zero any of the following:

### 2.1 Child sexual abuse material (CSAM)

Zero tolerance. If we detect CSAM at any point in the pipeline (intake screening, runner inspection, finding generation), we **immediately**:

1. Suspend the account.
2. Preserve the evidence in a write-once log.
3. Report to NCMEC (National Center for Missing & Exploited Children) under 18 U.S.C. §2258A.
4. Cooperate with law enforcement.

This applies whether the CSAM is in submitted code, attached files, audited URLs, or generated as part of an attempted prompt-injection exploit.

### 2.2 Malware command-and-control infrastructure

Repositories hosting malware C2, exploit kits, ransomware payloads, or similar are out of scope. We are not a sandbox for adversarial code; we audit defensive software. If your repo is a deliberately malicious artifact (not a research project with a clear academic context), do not submit it.

### 2.3 Illegal content

Anything illegal in the United States or in your jurisdiction. This includes (non-exhaustive): pirated copyrighted material, controlled-substance marketplaces, human trafficking, weapons of mass destruction plans, sanctioned-country contraband.

### 2.4 Hate speech and harassment artifacts

Code or data designed to facilitate doxing, targeted harassment, or hate-group coordination.

### 2.5 BYOK mode — Anthropic Usage Policy

When you operate in BYOK mode, anything that violates Anthropic's Usage Policy is also prohibited under this AUP. Anthropic's policy is the floor; this AUP may go further but never weaker. See `legal/terms-of-service.md` §6.5.

---

## 3. No automated abuse

You may not:

### 3.1 Scrape Studio Zero outputs back into a competing product

Our findings, scores, and rubric are work product. You can publish your own audit results; you cannot build a competing audit service that uses Studio Zero as its silent backend.

### 3.2 Test our limits with adversarial inputs

No prompt-injection corpora aimed at the runner. No deliberate attempts to exfiltrate internal prompts, agent definitions, or scoring logic. Legitimate security research is welcome through `security@studiozero.dev` and our responsible-disclosure program — not by repeated probing of paying-customer surfaces.

### 3.3 Resell capacity

You may not resell access to the runner, the score engine, or Anthropic tokens through Studio Zero. The Managed-tier subscription is for **your** audits, not for white-labeling. Talk to us about a Reseller Agreement at `partners@studiozero.dev` if you need to embed Studio Zero in another product.

### 3.4 Abuse the free tier

Free tier is one project per signup with unlimited Surface re-audits (Decision #2). Creating multiple free accounts to evade the cap is a breach. Email verification + IP rate limits exist to make this harder; the AUP makes it forbidden.

### 3.5 Overload the service

Submitting unusually large repositories, deeply recursive URL trees, or rapidly enqueued runs to test our limits, deny service, or extract competitive intelligence is prohibited. Where we detect abuse signatures, we throttle first and ask questions through `comply@studiozero.dev` second.

---

## 4. Termination for AUP violation

### 4.1 Process

The default escalation:

1. **First minor breach** (e.g., a clearly accidental unauthorized-URL submission caught at intake) — we warn and educate. No service interruption.
2. **Repeated minor breaches** — temporary suspension while we investigate; same-channel notice to the customer.
3. **Serious breach** (false attestation confirmed; prohibited content submitted; adversarial probing detected) — immediate termination.
4. **Criminal-grade breach** (CSAM; malware C2; sanctioned-country activity) — immediate termination + law-enforcement referral + evidence preservation.

We log every escalation. The customer gets the reasoned written notice for any escalation past the warning step.

### 4.2 Refund posture on termination

Per `finance/refund-matrix.md` row RT-10:

- **Default:** pro-rata refund of the unused subscription period for the customer, calculated and issued within 14 days of termination (we adopt the EU posture globally as a defensive default).
- **Carve-out:** **no refund** if the violation involves prohibited content per §2 above, or if the violation involves a deliberate false attestation. The carve-out is narrow and Comply must verdict each carve-out invocation; the default is to refund.

### 4.3 Right to appeal

You can appeal a termination by emailing `comply@studiozero.dev` within 30 days of the termination notice. Comply (with Jury cross-check) reviews and responds within 5 business days. If the appeal succeeds, the account is restored and any refund withheld under §4.2 is issued.

---

## 5. Reporting abuse

If you believe another user is violating this AUP, or if you find content on Studio Zero (e.g., an exported report, a public audit summary) that violates this AUP, please tell us:

- **Abuse reports:** `abuse@studiozero.dev`
- **Security disclosure (vulnerabilities, not abuse):** `security@studiozero.dev`
- **DMCA-specific copyright notices:** `dmca@studiozero.dev` (full DMCA Agent registration with the U.S. Copyright Office is an M5 deliverable; until then, notices are accepted at this address and Comply triages within 5 business days)

Reports should include: the artifact in question (URL, run ID, or screenshot), the specific AUP clause you believe is breached, and your contact information. We investigate every credible report. We do not share the reporter's identity with the reported user unless legally required.

---

## 6. Changes to this AUP

We may update this AUP. Material changes get 30 days' notice. Changes required by law (e.g., a new platform-liability statute) take effect immediately with notice as soon as practicable. The changelog is at `https://studiozero.dev/aup/changelog`.

---

## 7. Contact

- **Abuse:** `abuse@studiozero.dev`
- **Compliance / appeals:** `comply@studiozero.dev`
- **Security disclosure:** `security@studiozero.dev`
- **DMCA notices:** `dmca@studiozero.dev`

---

_Comply locks this AUP at v1.0 on 2026-05-12. Re-verify quarterly._
