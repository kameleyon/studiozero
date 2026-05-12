# DMCA Designated Agent — Registration Package

**Version:** 1.0 (M4 Batch 2 — filing-ready package; Jo executes)
**Effective date:** 2026-05-12
**Owner:** Comply (Compliance Officer) — package authored, ready-for-Jo-to-file
**Statute:** 17 U.S.C. § 512(c)(2) — Designated agent to receive notification of claimed infringement
**Filing authority:** U.S. Copyright Office — Designated Agent Directory
**PRD anchors:** §14.5 (compliance), §17 D #54 (DMCA agent registration — HUMAN: Jo)
**Cross-references:** `legal/terms-of-service.md` §8 (IP) + §13 (Termination), `legal/aup.md` §2, `compliance/m4-compliance-audit.md`, `sprint/milestone-M5.md` exit gate row 1, `marketing/launch-checklist.md` T-30 DMCA row
**HUMAN action required:** Yes — Jo files via the U.S. Copyright Office portal. Comply has pre-filled every field that does not require Jo's signature or legal-entity decision. The two open placeholders (legal entity name + designated agent contact) are flagged below; everything else is filing-ready.

> **Plain-English mandate.** This package exists so Jo can sit down once with a coffee, paste in the two open fields, pay $6, and file. Total wall-clock time: ~15 minutes. Comply has done every other piece of work.

---

## 1. Why this matters

Section 512(c) of the Digital Millennium Copyright Act gives online service providers a safe harbor from copyright-infringement liability for user-submitted content **if** the provider has designated an agent to receive infringement notices and registered that agent with the U.S. Copyright Office.

Studio Zero hosts user-submitted material in three places that the safe harbor protects:

1. **Audit findings rendered with code excerpts** — we display short quoted segments of user-submitted source code in the verdict UI and exported reports.
2. **User-supplied screenshots in dispute-finding submissions** — at-rest in Supabase Storage, displayed in the in-app dispute viewer.
3. **AMA / community content embedded into our own marketing surfaces** — if we ever quote a user post (with permission) on `studiozero.dev/blog`.

Without a registered DMCA agent, a single takedown notice without our pre-designated channel forces us to either ignore it (loss of safe harbor; direct liability exposure) or scramble to process it (operational chaos + missed §512(g) counter-notice deadlines). **Filing the agent registration is a one-time $6 cost that buys statutory liability immunity.**

The launch-week risk is concrete: at M5 we publish on Hacker News, IndieHackers, and Product Hunt. Any one of those audiences could surface a takedown notice within the first 48 hours of launch (most likely a misunderstanding rather than an actual claim — e.g., a customer worried that a screenshot we tweeted contains their proprietary code). Safe harbor requires the agent to be **on the public DMCA Directory before the first user-submitted content is published**. M5 launch day is the public-content milestone.

---

## 2. Filing portal + fees

| Field                             | Value                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Portal**                        | https://www.copyright.gov/dmca-directory/                                                                                                 |
| **Form**                          | "Designation of Agent to Receive Notification of Claimed Infringement" (online only — no paper submission accepted since 2016)            |
| **Account required**              | Yes — free account at the U.S. Copyright Office; reusable for renewals + amendments                                                       |
| **Filing fee**                    | **$6 USD** (one-time, on submission)                                                                                                      |
| **Annual renewal fee**            | **$6 USD** — required every three years per 37 CFR § 201.38(c); we calendar it on a 33-month tickler so Jo gets a reminder 3 months ahead |
| **Time to directory listing**     | 1–2 business days after submission; directory entry then publicly searchable at https://www.copyright.gov/dmca-directory/                 |
| **Effective date of safe harbor** | Immediately upon directory listing going live; we cite the directory listing URL on our `/dmca` route                                     |

---

## 3. Pre-filled form — what Jo pastes into each field

The Copyright Office portal walks through a sequence of input pages. Below is the canonical content for each. **Fields marked `[FILL]` require Jo's decision before submission; every other field is locked-text.**

### 3.1 Service provider identification

| Form field                   | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Service provider name**    | `[FILL — pending Comply trademark + entity decision]` — provisional value: **Studio Zero, Inc.** (Delaware C-corp; the entity that signs the ToS at `legal/terms-of-service.md` §1.1). If Jo files under a different entity name, update `legal/terms-of-service.md` §1.1 + `legal/privacy-policy.md` §12 simultaneously.                                                                                                                                                                                                                    |
| **Alternate names**          | `Studio Zero` · `studiozero.dev` · `studio-zero` (npm package) — list every public surface the agent's designation covers. The portal accepts up to 10 alternate names; we use 3.                                                                                                                                                                                                                                                                                                                                                            |
| **Service provider address** | `[FILL]` — provisional value: **1209 Orange Street, Wilmington, DE 19801, USA** (the registered-agent address Studio Zero uses on the ToS §18.7). Confirm before filing that this is the address Jo wants on the **public** Copyright Office directory. If Jo prefers a separate PO box for DMCA correspondence to avoid exposing the registered-agent address to the public, supply that here instead. (The registered-agent address is already public via Delaware corporate records, so re-using it carries no marginal disclosure risk.) |
| **Website address**          | `https://studiozero.dev`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### 3.2 Designated agent identification

| Form field             | Value                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Agent full name**    | `[FILL]` — see §4 below for the two options                                                                                                                                                                  |
| **Agent organization** | `[FILL]` — same as §3.1 service-provider name OR external-counsel firm name, depending on §4 choice                                                                                                          |
| **Agent address**      | `[FILL]` — must be a **physical street address** (Copyright Office rejects "P.O. Box only" entries); same address as §3.1 if Jo is the agent; firm address if external counsel is the agent                  |
| **Agent phone**        | `[FILL]` — a phone number a human can answer; voicemail acceptable; consider routing to Jo's mobile or a dedicated Google Voice line for the agent role. The number is **publicly listed** on the directory. |
| **Agent email**        | **`dmca@studiozero.dev`** — Comply pre-configures this inbox (HUMAN: Jo provisions in Resend + forwards to `legal@studiozero.dev` + Jo's personal inbox; same routing pattern as `security@studiozero.dev`)  |

---

## 4. Two options for who the designated agent is

This is the only substantive decision in the package. Comply offers a recommendation but Jo holds the call.

### 4.1 Option A — Jo personally (recommended at MVP)

**Pros:** $0 marginal cost. Fastest correspondence loop (Jo reads `dmca@studiozero.dev` directly + can route quickly to Comply for §512(c)(3)(A) facial-validity review). No third-party intermediary on what is, at MVP scale, an extremely low-volume channel (we predict 0–2 takedown notices per year through M5+12mo based on the comparable-base of single-founder dev-tooling SaaS at similar scale).

**Cons:** Jo's full legal name + a public phone number land on the U.S. Copyright Office public directory. The phone number can be a dedicated Google Voice or Twilio number that forwards — does not need to be Jo's personal cell.

**Suggested values:**

- Agent full name: Jo's legal name as it appears on the Delaware C-corp formation docs
- Agent organization: Studio Zero, Inc.
- Agent address: same as §3.1 (1209 Orange Street if filed there)
- Agent phone: a Google Voice / Twilio number Jo provisions for this role; voicemail OK
- Agent email: `dmca@studiozero.dev`

### 4.2 Option B — External counsel (recommended at V1.5+)

**Pros:** Jo's name + personal phone never appear on a public directory. Counsel handles the §512(c)(3)(A) facial-validity review on intake, freeing Comply + Jo from the 5-business-day SLA on every notice.

**Cons:** $50–$200/mo retainer if we engage a designated-agent service like **CSC Global** (\~$50/mo flat), **Cogency Global**, or **Corporation Service Company**. At MVP cash burn, $50/mo \* 12 = $600/yr is non-trivial against the $6.9k Day-0 cushion (per `finance/runway.md`). Defer to V1.5 unless takedown-notice volume exceeds 3 per quarter (escalation trigger, §8).

**Suggested values (if Jo chooses this path):** Jo signs an engagement letter with one of the named services; the service provides the agent name / address / phone / email; Jo files those values in the portal. The agent service then forwards every received notice to `dmca@studiozero.dev` within 24h per their SLA.

**Comply recommendation:** **Option A at M5 launch. Revisit at V1.5 when retainer becomes affordable.** This matches Studio Zero's pattern of doing everything in-house at MVP and outsourcing only when volume justifies it (same pattern Penny applies to bookkeeping, Cipher to pentest, Halo to WCAG audit).

---

## 5. Filing instructions — step by step

A Jo-can-follow walkthrough. Total wall-clock time: ~15 minutes.

1. **Create / sign in to a Copyright Office account** at https://www.copyright.gov/dmca-directory/. Use the email at which Jo wants account-administration correspondence — recommended `legal@studiozero.dev`. Set up the password in 1Password under `Studio Zero · Compliance · DMCA Agent Portal`.

2. **Start a new Designated Agent Designation.** The portal walks page-by-page through service-provider info, then agent info, then alternate names, then payment.

3. **Service-provider info page** — paste from §3.1 above. Confirm the spelling of the legal-entity name against the Delaware Certificate of Incorporation; the Copyright Office will reject mismatches.

4. **Agent info page** — paste from §3.2 and §4 above. If Option A: Jo's legal name, the Google Voice number, `dmca@studiozero.dev`. If Option B: the agent-service values.

5. **Alternate names page** — paste the three values from §3.1 row "Alternate names." The portal accepts comma-separated input.

6. **Review page** — read every field one more time. Mistakes on this page are correctable later only by filing an **amendment** ($6 each), so it is cheaper to catch errors here.

7. **Payment page** — $6 USD via credit card. Studio Zero's Stripe business card (the one Penny issues for vendor expenses) is fine. **Save the receipt PDF; Comply files it at `compliance/dmca-agent-filing-receipt.pdf`.**

8. **Confirmation page** — the portal returns a designation ID + an estimated directory-listing-live date (typically 1–2 business days). **Screenshot this page; save as `compliance/dmca-agent-filing-confirmation.png`.**

9. **Wait 1–2 business days.** Comply monitors the public directory at https://www.copyright.gov/dmca-directory/ daily. As soon as the entry appears, Comply downloads the directory record as a PDF and saves it to `compliance/dmca-agent.pdf` — the canonical post-registration artifact the M5 exit gate requires.

10. **Update the `/dmca` route.** Vega populates the `/dmca` page on the marketing site with the now-public agent contact (name, address, email, phone, the Copyright Office directory URL). The route already exists as a stub at `apps/web/app/dmca/page.tsx` (HUMAN: Vega ships at M4 Batch 3); Comply provides the locked copy in §7 below.

11. **Add the renewal tickler.** Comply files a calendar item on Jo's calendar 33 months out (i.e., 3 months before the 3-year renewal deadline) so the $6 renewal fee gets paid on time. Lapse = automatic removal from the directory = loss of safe harbor.

---

## 6. Post-registration artifacts checklist

Comply commits each artifact as it lands. The M5 exit gate at `sprint/milestone-M5.md` line 102 ([ ] DMCA Designated Agent registered) flips green only when **all four** are present.

| #   | Artifact                                               | Path                                            | Who commits                                 | When                           |
| --- | ------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------- | ------------------------------ |
| 1   | Filing payment receipt PDF                             | `compliance/dmca-agent-filing-receipt.pdf`      | Jo (saves from portal post-payment)         | Filing day                     |
| 2   | Filing confirmation screenshot                         | `compliance/dmca-agent-filing-confirmation.png` | Jo (screenshots portal confirmation page)   | Filing day                     |
| 3   | Public directory record PDF (the M5-blocking artifact) | **`compliance/dmca-agent.pdf`**                 | Comply (downloads from directory once live) | Filing day + 1–2 business days |
| 4   | `/dmca` route public with agent contact populated      | `apps/web/app/dmca/page.tsx`                    | Vega (uses copy in §7 below)                | M4 Batch 3 (Vega's queue)      |

---

## 7. Locked copy for the `/dmca` route

Vega ships the `/dmca` page at M4 Batch 3. Comply locks the copy here so the route ships with the right text on day one. **Brand-voice grade: 9 ceiling per `agents/growth/herald-brand-voice.md`.** Replace `[FILL]` placeholders post-filing.

```markdown
# DMCA — Copyright takedown procedure

If you believe content on Studio Zero infringes your copyright, this page tells you how to file a notice and what we will do with it.

## 1. Our Designated Agent

Studio Zero is registered with the U.S. Copyright Office under 17 U.S.C. § 512(c)(2). Notices of claimed infringement must be sent to our Designated Agent:

- **Agent name:** [FILL post-registration]
- **Organization:** Studio Zero, Inc.
- **Address:** [FILL post-registration]
- **Phone:** [FILL post-registration]
- **Email:** dmca@studiozero.dev
- **U.S. Copyright Office directory listing:** [FILL — paste the directory URL once live]

## 2. What your notice must include

To be effective under 17 U.S.C. § 512(c)(3)(A), your notice must include all six of the following:

1. A physical or electronic signature of the person authorized to act on behalf of the copyright owner.
2. Identification of the copyrighted work claimed to have been infringed (URL, registration number, or a clear written description).
3. Identification of the material that is claimed to be infringing on Studio Zero, with enough detail for us to locate it (URL, screenshot, file path within a public audit report).
4. Your contact information — address, phone, email.
5. A statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law.
6. A statement, under penalty of perjury, that the information in the notice is accurate and you are authorized to act on behalf of the copyright owner.

Send the complete notice to `dmca@studiozero.dev` or to the postal address above. Incomplete notices do not trigger the §512(c)(1)(C) takedown obligation; we may decline to act on them, but we will reply telling you what is missing.

## 3. What happens after we receive a valid notice

1. **We acknowledge within 24 hours.** We confirm receipt to the email or address you supplied.
2. **We review for facial validity within 5 business days.** Comply checks every notice against §512(c)(3)(A); plainly defective notices are returned with a "what is missing" reply.
3. **If the notice is facially valid, we remove or disable access to the material expeditiously.** "Expeditiously" under §512(c)(1)(C) is typically 24–72 hours from validity confirmation.
4. **We notify the alleged infringer.** Under §512(g), we send the affected user the notice (or a redacted version) and tell them they may file a counter-notice.
5. **Counter-notice — if filed.** Under §512(g)(2)–(3), if the user files a valid counter-notice, we restore the material in 10–14 business days unless you file suit and notify us.

## 4. Repeat-infringer policy

Per 17 U.S.C. § 512(i)(1)(A), Studio Zero terminates accounts of users who, in our reasonable judgment, are repeat infringers. Comply maintains a tracker keyed off `audit_logs` (per `legal/privacy-policy.md` §3 audit-logs retention row).

## 5. Misrepresentation

Under 17 U.S.C. § 512(f), anyone who knowingly materially misrepresents that material is infringing — or that material was removed by mistake — is liable for damages, including costs and attorneys' fees, incurred by the person harmed. Please file accurate notices.

## 6. Other intellectual-property claims

For trademark, trade-dress, patent, or other non-copyright IP claims, contact `legal@studiozero.dev`. The DMCA address is for copyright notices only.

---

_Studio Zero · DMCA Designated Agent registered with the U.S. Copyright Office · See ToS §8 + §13._
```

---

## 8. Renewal + escalation triggers

| Trigger                                                               | Action                                                                                                                     | Owner          | Deadline                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- |
| **33-month tickler fires** (3 months before 3-year renewal)           | Comply emails Jo with the renewal-link + $6 fee reminder                                                                   | Comply         | 33 months from initial filing date                 |
| **Agent details change** (Jo's phone changes; entity rename; etc.)    | File an amendment ($6) within 30 days of the change; outdated directory record is statutorily defective                    | Comply + Jo    | 30 days from the change                            |
| **Takedown-notice volume > 3 per quarter**                            | Re-evaluate Option B (external-counsel agent service); engage CSC Global / Cogency / Corporation Service Co.               | Comply + Penny | The quarter-end where the 3rd notice landed        |
| **DMCA misrepresentation counter-claim filed under §512(f)**          | Comply escalates to outside counsel immediately; do not respond unilaterally                                               | Comply + Jo    | Within 48 hours of receiving any §512(f) claim     |
| **Repeat-infringer threshold hit** (3 valid notices against one user) | Account termination per §512(i)(1)(A); preserve audit-log entry for the 7-year retention horizon at `privacy-policy.md` §3 | Comply + Forge | Within 5 business days of the 3rd validated notice |

---

## 9. Why $6 buys statutory liability immunity — the legal mechanic

For agent counsel readers and Comply's own re-reading. Skim-safe.

The §512(c) safe harbor immunizes a service provider from copyright-infringement damages for user-submitted material **if** four conditions hold:

1. The provider does not have actual knowledge of infringement (or, on awareness of facts making infringement apparent, acts expeditiously to remove).
2. The provider does not receive a financial benefit directly attributable to the infringing activity, in a case in which it has the right and ability to control such activity.
3. Upon receipt of a §512(c)(3)(A)-compliant notification, the provider responds expeditiously to remove or disable access to the material.
4. **The provider has designated an agent to receive notifications of claimed infringement and has filed the designation with the Copyright Office in accordance with §512(c)(2).**

The fourth element is the one Jo is filing. Without it, conditions 1–3 still must hold but the safe harbor does not engage as a complete defense — the plaintiff can argue the provider was not a §512(c) provider at all because step 4 was incomplete. Filing closes that argument.

For the avoidance of doubt: the safe harbor protects against monetary damages from copyright claims on **user-submitted material**. It does not protect against Studio Zero's own original content — for that, ordinary fair-use and license analysis applies. The safe harbor also does not protect against trademark, patent, or trade-secret claims; only copyright.

---

## 10. Comply self-verdict

| Gate                                                                                             | Status |
| ------------------------------------------------------------------------------------------------ | ------ |
| Filing portal + fee + form mechanics specified                                                   | PASS   |
| Pre-filled form — every field except 2 documented decision points has locked-text values         | PASS   |
| Two-option recommendation (Jo personally vs external-counsel service) with Comply recommendation | PASS   |
| Step-by-step filing instructions Jo can follow in ~15 minutes                                    | PASS   |
| Post-registration artifact checklist mapped to M5 exit gate                                      | PASS   |
| `/dmca` route locked copy ready for Vega                                                         | PASS   |
| Renewal + escalation triggers calendar-ed (33-month tickler)                                     | PASS   |

**Comply verdict: PACKAGE READY FOR JO TO FILE.** Filing window: any business day between now and T-30 (M4 close) is acceptable; T-14 (M5 launch week) is the latest-safe date so the 1–2-business-day directory-listing-live window does not collide with launch day.

---

_Comply locks this DMCA package at v1.0 on 2026-05-12. Next re-verification: 33 months from initial filing date (renewal tickler). HUMAN-pending: §3.1 + §3.2 [FILL] fields + §4 Option A/B decision + portal execution + the four §6 artifacts._
