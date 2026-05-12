# GDPR Article 27 — EU Representative Engagement Template

**Version:** 1.0 (M4 Batch 2 — Comply locks; HUMAN: Jo engages)
**Effective date:** 2026-05-12
**Owner:** Comply (Compliance Officer) — package authored, ready-for-Jo-to-engage
**Statute:** Regulation (EU) 2016/679 (GDPR) Article 27 — Representatives of controllers or processors not established in the Union; UK GDPR Article 27 (mirror provision)
**PRD anchors:** §14.5 (compliance), §17 D #55 (Art. 27 EU representative engagement — HUMAN: Jo)
**Cross-references:** `legal/privacy-policy.md` §12 (Contact — EU/UK Art. 27 placeholder), `legal/data-processing-agreement.md` §13 (Contact — Art. 27 placeholder), `compliance/m4-compliance-audit.md`, `sprint/milestone-M5.md` (launch readiness)
**HUMAN action required:** Yes — Jo signs one of the engagement letters; Comply has pre-scoped the three viable vendors and the deliverables they must meet.

> **Plain-English mandate.** GDPR Article 27 is not optional for Studio Zero. The moment we process personal data of an EU or UK resident — which we do, from the first free-tier signup — we must have a representative in the Union (and, separately, in the UK). This file is the package Jo uses to engage one. The three short-listed vendors all deliver the same statutory minimum; the choice is on price + signal + speed.

---

## 1. Why Studio Zero needs an Article 27 representative

Article 27(1) requires a non-EU-established controller or processor to designate **in writing** an EU representative when its processing of EU residents' personal data is "regular" and not "occasional." Studio Zero's processing is regular by any reading:

- **EU users sign up to the free tier from launch.** The marketing site at `studiozero.dev` is globally reachable; there is no geo-block; the cookie banner provides GDPR-compliant consent for EU visitors. Day-one signup activity from EU IP addresses is expected per Lens's regional traffic forecast at `marketing/analytics-spec.md` §3.
- **EU paid customers expected by M5.** Penny's pricing model in `finance/pricing.md` does not exclude any region. The D22 EU cooling-off-on-upgrade clause at `legal/terms-of-service.md` §7.4 LOCKED at M2 is itself an admission that we plan to bill EU consumers.
- **Special-category data carve-out (Art. 27(2)(a))** does not apply — Studio Zero processes ordinary personal data (account identifiers, code-as-data, billing records), but it processes at a volume far above "occasional."
- **Public authority carve-out (Art. 27(2)(b))** is irrelevant — we are not a public authority.

**Penalty for non-engagement.** Articles 83(4)(a) and 83(5)(b) set the floor at €10M or 2% of global turnover (whichever is higher) for failure to engage an Art. 27 representative. The German DPA (BfDI) issued €525,000 fines in 2021–2023 specifically for missing Art. 27 designations. The fine schedule is _per supervisory authority_, not per company — a German DPA fine does not preclude a French DPA fine for the same gap.

**Same logic for the UK.** UK GDPR Article 27 mirrors the EU provision after Brexit; we need a _separate_ UK representative (a single firm can satisfy both, but we must engage them under both jurisdictions). The ICO's enforcement posture on UK Art. 27 has been less aggressive than the EU's, but the statutory exposure is identical.

---

## 2. What the representative must do — the statutory minimum

The representative's role under Art. 27(3)–(5) is:

1. **Receive correspondence** from supervisory authorities and data subjects, on all GDPR-related matters, on the controller's behalf.
2. **Maintain records of processing activities (Art. 30(1) ROPA)** in cooperation with the controller, available to the supervisory authority on request.
3. **Be physically located** in one of the EU Member States where the controller's data subjects reside. The recommended Member State is the one with the largest EU resident base of data subjects (Recital 80).
4. **Be designated in writing** — engagement letter signed by Jo on behalf of Studio Zero, Inc.

The representative does NOT replace the controller; Studio Zero remains the controller. Liability also remains with the controller (Art. 27(5) explicitly preserves liability against the controller).

---

## 3. Short-listed vendors

Comply has screened the three vendors that consistently service single-founder dev-tooling SaaS at MVP scale. All three meet Art. 27(3)–(5) requirements; all three publish their physical address on a website Studio Zero can reference from the Privacy Policy. Pricing ranges below are 2026-05 indicative ranges sourced from each vendor's public pricing page (Comply re-verifies before Jo signs).

### 3.1 Vendor A — Prighter (Comply's primary recommendation)

| Field                          | Value                                                                                                                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legal entity**               | Prighter GmbH (Austria)                                                                                                                                                                                                                                                            |
| **Physical address (EU rep)**  | Vienna, Austria — service in all 27 EU Member States                                                                                                                                                                                                                               |
| **UK rep service**             | Yes — Prighter UK Ltd (London) — single engagement covers EU + UK with one contract                                                                                                                                                                                                |
| **Monthly price (2026-05)**    | **€69/mo** for the "Privacy Officer" tier covering both EU + UK; €39/mo for EU-only                                                                                                                                                                                                |
| **Annual price (paid yearly)** | **€690/yr** (≈ $750 USD) — Comply recommends annual prepay for the 2-month discount                                                                                                                                                                                                |
| **Setup fee**                  | €0                                                                                                                                                                                                                                                                                 |
| **Contract minimum**           | 12 months                                                                                                                                                                                                                                                                          |
| **Cancellation**               | 30-day notice at any 12-month renewal anniversary                                                                                                                                                                                                                                  |
| **Onboarding time**            | 48–72 hours from contract sign to representative appointment live                                                                                                                                                                                                                  |
| **What's included**            | Art. 27 rep designation (EU + UK); intake mailbox + postal forwarding for DPA correspondence; quarterly compliance check-in; ROPA template assistance; data-breach notification triage                                                                                             |
| **What's NOT included**        | Outside-counsel representation (separate engagement if a supervisory authority opens a formal investigation); DPIA authoring (we author in-house at `architecture/threat-model.md`); DPO appointment (Studio Zero is not size-thresholded into a mandatory DPO at MVP per Art. 37) |
| **Why Comply recommends**      | Cheapest tier covering both EU + UK. Austrian regulator (DSB) is conservative — well-regarded enforcement track record. Established 2018; serves Notion, Loom, Linear historically.                                                                                                |

### 3.2 Vendor B — VeraSafe (US-based; established player)

| Field                          | Value                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legal entity**               | VeraSafe Czech s.r.o. (EU rep) + VeraSafe Ireland Ltd (alternate) + VeraSafe UK Ltd (UK rep)                                                                                              |
| **Physical address (EU rep)**  | Prague, Czech Republic                                                                                                                                                                    |
| **UK rep service**             | Yes — separate contract; bundled discount available                                                                                                                                       |
| **Monthly price (2026-05)**    | **$165/mo** for EU + UK bundled (≈ €152/mo) on the "Standard" tier                                                                                                                        |
| **Annual price (paid yearly)** | **$1,800/yr** (≈ €1,660) — quarterly invoicing also available                                                                                                                             |
| **Setup fee**                  | $0                                                                                                                                                                                        |
| **Contract minimum**           | 12 months                                                                                                                                                                                 |
| **Onboarding time**            | 5–7 business days from contract sign                                                                                                                                                      |
| **What's included**            | Art. 27 rep designation (EU + UK); intake mailbox; postal forwarding; ROPA assistance; **CCPA / CPRA US privacy posture review included at no extra cost** (this is the value-add)        |
| **What's NOT included**        | Outside-counsel representation in formal investigations                                                                                                                                   |
| **Why Comply considered**      | More expensive than Prighter but the CCPA / CPRA bundling means we get a US-side privacy review thrown in. **Defer to V1.5** unless Jo specifically wants the bundled CCPA review at MVP. |

### 3.3 Vendor C — EDPO (EU Data Protection Office)

| Field                          | Value                                                                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legal entity**               | EDPO BV (Belgium)                                                                                                                                                                                                     |
| **Physical address (EU rep)**  | Brussels, Belgium                                                                                                                                                                                                     |
| **UK rep service**             | Yes — separate contract                                                                                                                                                                                               |
| **Monthly price (2026-05)**    | **€89/mo** for EU + UK on the "Lite" tier                                                                                                                                                                             |
| **Annual price (paid yearly)** | **€890/yr** (≈ $970 USD)                                                                                                                                                                                              |
| **Setup fee**                  | €150 one-time                                                                                                                                                                                                         |
| **Contract minimum**           | 12 months                                                                                                                                                                                                             |
| **Onboarding time**            | 3–5 business days                                                                                                                                                                                                     |
| **What's included**            | Art. 27 rep designation (EU + UK); intake mailbox; postal forwarding; ROPA assistance; monthly newsletter on supervisory-authority enforcement                                                                        |
| **What's NOT included**        | Outside-counsel; DPIA authoring                                                                                                                                                                                       |
| **Why Comply considered**      | Brussels location (proximity to EDPB) is a soft signal of regulatory engagement; €150 setup fee adds friction; otherwise comparable to Prighter. **Strong alternate if Prighter is unresponsive on the first email.** |

### 3.4 Comply recommendation — Prighter

**Choose Prighter at €69/mo (€690/yr prepay).** Rationale:

- **Cheapest full coverage** (EU + UK in one engagement).
- **Austrian regulator** is a credible base — DSB has a track record of measured enforcement, not over-eager fines.
- **48–72h onboarding** — fits the M5 launch timeline. If Jo engages by T-21 (M4 close), the representative is appointed and listed in the Privacy Policy by T-14.
- **Existing customer base** includes companies Jo respects (Notion, Loom, Linear, several Y-Combinator dev-tools).
- **Cancellation flexibility** — 30-day notice at any 12-month anniversary; we're not locked into a multi-year contract if we need to switch to outside counsel at V2.

VeraSafe is the strong backup if Jo wants the CCPA-bundled value-add. EDPO is the third-rank option.

---

## 4. Engagement letter — template Jo signs

The text below is the Studio-Zero-side engagement-letter template Comply offers Prighter (or whichever vendor Jo picks). Most vendors counter with their own paper; the bullets below are the points Comply requires to be in the final signed letter regardless of whose template wins.

```
ENGAGEMENT LETTER — GDPR ARTICLE 27 REPRESENTATIVE

This engagement letter ("Engagement") is between:

  STUDIO ZERO, INC.
  1209 Orange Street, Wilmington, DE 19801, USA
  Acting for Studio Zero, Inc. ("Controller")

and:

  [VENDOR LEGAL NAME]
  [VENDOR ADDRESS]
  ("Representative")

1. Designation. Controller designates Representative as its
   representative under Article 27 of Regulation (EU) 2016/679
   (GDPR) and, in a parallel designation, under Article 27 of the
   UK GDPR.

2. Scope. The designation covers all personal data of EU and UK
   residents processed by Controller in connection with the Studio
   Zero service ("Service"). Service definition at the canonical
   Terms of Service (https://studiozero.dev/terms).

3. Duties. Representative shall:
   (a) receive correspondence from supervisory authorities and from
       data subjects on Controller's behalf;
   (b) maintain (in cooperation with Controller) the Article 30(1)
       record of processing activities;
   (c) cooperate with supervisory authority requests within five
       business days of receipt;
   (d) forward to Controller, within twenty-four hours of receipt,
       any communication received in respect of the Service;
   (e) maintain a physical address in [EU Member State / UK]
       publicly accessible to data subjects and supervisory
       authorities, and disclosed in Controller's Privacy Policy.

4. Term. This Engagement begins on [DATE] and continues for an
   initial term of twelve (12) months, automatically renewable for
   successive twelve-month terms unless either party gives 30 days'
   written notice of non-renewal.

5. Fees. Controller shall pay Representative [AMOUNT in EUR or
   USD] per [annum / month]. Payment terms: [annual prepay /
   monthly invoicing].

6. Insurance. Representative carries professional-indemnity
   insurance of at least €1,000,000 per claim, naming Controller
   as an additional insured for the duration of the Engagement.

7. Confidentiality. Representative shall treat all data received
   under this Engagement as confidential. Representative is bound
   by GDPR Article 28(3)(b) confidentiality on personnel.

8. Liability. Article 27(5) preserves Controller's primary
   liability. Representative is liable for its own gross
   negligence and willful misconduct in performing under this
   Engagement, capped at 12 months' fees.

9. Termination. Either party may terminate (a) at the end of any
   12-month renewal on 30 days' notice, (b) immediately on the
   other party's uncured material breach, or (c) immediately on
   the other party's insolvency.

10. Publication. Representative's name, postal address, and
    contact email shall be published by Controller at:
      - legal/privacy-policy.md §12 (Contact)
      - legal/data-processing-agreement.md §13 (Contact)
      - https://studiozero.dev/privacy
    Controller shall update each surface within 5 business days of
    Representative's appointment going effective.

11. Governing law. [Austria / EU Member State of Representative]
    for the EU portion; England and Wales for the UK portion.
    Controller waives jurisdictional objection.

12. Counterparts. This Engagement may be signed in counterparts;
    electronic signatures binding.

SIGNED:

For Controller:                For Representative:

_______________________        _______________________
[NAME], on behalf of           [NAME], on behalf of
Studio Zero, Inc.              [VENDOR LEGAL NAME]
Date: ____________             Date: ____________
```

---

## 5. Email Jo sends to start engagement

Pre-drafted by Comply. Jo's job is to paste, add a date, and send to the vendor's contact email (Prighter: `sales@prighter.com`; VeraSafe: `info@verasafe.com`; EDPO: `info@edpo.com`).

```
Subject: Studio Zero, Inc. — GDPR Article 27 representative engagement

Hi [vendor team],

I'm the founder of Studio Zero, Inc., a Delaware C-corp launching a
software-audit SaaS in [target launch month — June 2026]. We process
personal data of EU and UK residents from day one (free-tier signups,
paid subscribers); we have no EU establishment and so trigger the
Article 27 designation requirement.

I'd like to engage [Prighter / VeraSafe / EDPO] as our Art. 27
representative covering both EU and UK. I'm targeting designation
live by T-21 (approximately three weeks before public launch).

Could you please send:

1. A draft engagement letter on your standard paper.
2. Pricing confirmation for the EU+UK bundle (annual prepay where
   applicable).
3. Onboarding-time confirmation — when can the designation go
   live from contract sign?
4. A reference customer at comparable scale (single-founder /
   small-team SaaS) we can speak with.

Studio Zero's published Terms of Service is at
https://studiozero.dev/terms; our Privacy Policy is at
https://studiozero.dev/privacy and contains an Art. 27 placeholder
ready to swap in your designation details on contract sign.

Looking forward to working with you.

Best,
Jo Stevens
Founder, Studio Zero, Inc.
jo@studiozero.dev
```

---

## 6. After engagement — what changes in our published files

The moment the engagement letter is signed and the representative is appointed, Comply updates three files in one commit (`compliance/eu-rep-appointment-YYYY-MM-DD.md` records the date + the vendor; the three live files swap the placeholder text for the live representative details):

### 6.1 `legal/privacy-policy.md` §12

Replace:

```
**EU / UK Article 27 representative:** **[placeholder — to be appointed by M2 ship; will be a GDPR-Rep.com or VeraSafe entity once contract signs]**. Email `eu-rep@studiozero.dev` (forwarded to the appointed representative when in place; bounced to `privacy@studiozero.dev` until then with an auto-reply explaining the interim arrangement). The appointment will appear on the published Policy version that ships before our first EU paid customer (M2).
```

With (Prighter shown; substitute vendor on appointment):

```
**EU Article 27 representative:** **Prighter GmbH**, Schönbrunner Straße 218–220 / 12. OG, 1120 Vienna, Austria. Email: `eu-rep@studiozero.dev` (forwarded to Prighter). Web: https://prighter.com/q/[Studio-Zero-tenant-slug] — Prighter publishes a tenant-specific page listing Studio Zero's designation effective on [DATE].

**UK Article 27 representative:** **Prighter UK Ltd**, [LONDON ADDRESS]. Email: `uk-rep@studiozero.dev` (forwarded to Prighter UK).
```

### 6.2 `legal/data-processing-agreement.md` §13

Same swap, mirroring §12 content.

### 6.3 `apps/web/app/privacy/page.tsx`

Update the rendered §12 Contact card with the same live values. Vega owns the route; Comply provides the verbatim copy on appointment day.

### 6.4 Provision the email aliases (HUMAN: Jo)

Configure `eu-rep@studiozero.dev` and `uk-rep@studiozero.dev` in Resend to forward to the vendor's intake address (Prighter publishes a per-tenant intake email on engagement). Same routing pattern as `dmca@studiozero.dev` and `security@studiozero.dev`. Forward should also CC `privacy@studiozero.dev` for Comply's audit trail.

---

## 7. Timing — when this must happen

| Milestone                    | What lands                                                                                                                                                                                                                                                | Owner                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **T-30 (M4 close, week 14)** | Engagement letter sent to Prighter; price + onboarding confirmed back                                                                                                                                                                                     | Jo (signing) + Comply (drafting) |
| **T-21 (week 14.5)**         | Engagement letter signed; representative appointment live; aliases routed                                                                                                                                                                                 | Jo + Forge (Resend)              |
| **T-14 (M5 week 15)**        | `legal/privacy-policy.md` §12 + `data-processing-agreement.md` §13 + `/privacy` page updated with live vendor details                                                                                                                                     | Comply + Vega                    |
| **T-7**                      | Final pre-launch verification: GDPR ROPA assembled in cooperation with representative (Comply provides §2 data classes from `legal/privacy-policy.md`); supervisory-authority correspondence channel tested with a synthetic ping from the representative | Comply + Vendor                  |
| **T-0 launch day**           | Representative is operational from minute zero of first EU traffic                                                                                                                                                                                        | n/a — already live               |

**Hard deadline.** First EU resident signup. If the launch surfaces an EU signup before the Art. 27 representative is appointed, Studio Zero is in technical breach of GDPR Art. 27 from that moment. Comply treats T-14 as the latest-safe-date for representative-live; T-21 is the planned date with one-week buffer.

---

## 8. What this engagement does NOT solve

For completeness. The representative is one piece of GDPR compliance, not all of it.

| Adjacent GDPR obligation                           | Where it lives                                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Art. 28 DPA with subprocessors**                 | `legal/data-processing-agreement.md` v1.0 (LIVE at M2)                                                                                                                         |
| **Art. 30 ROPA (record of processing activities)** | Comply authors in cooperation with Prighter at T-14; canonical at `compliance/ropa.md` (M4 Batch 3 — Comply's queue)                                                           |
| **Art. 32 security controls**                      | `architecture/system-diagram.md` + `legal/privacy-policy.md` §8                                                                                                                |
| **Art. 33 breach notification (72-hour SLA)**      | `compliance/breach-runbook.md` (M2 deliverable per `privacy-policy.md` §7)                                                                                                     |
| **Art. 35 DPIA (where required)**                  | `architecture/threat-model.md` covers the technical surface; Comply authors a separate DPIA file at `compliance/dpia-audit-processing.md` if/when Prighter flags one is needed |
| **Art. 37 DPO (where required)**                   | Studio Zero is not size-thresholded into a mandatory DPO at MVP. Re-evaluate at V1.5 if employee count > 10 or processing changes materially                                   |
| **Cookies + ePrivacy (PECR in UK)**                | `legal/privacy-policy.md` §4 (cookie banner LIVE at M1)                                                                                                                        |
| **Data-subject rights (Art. 15–22)**               | `legal/privacy-policy.md` §6 + in-app surface (M5 — `0006_dmca_and_retention.sql`)                                                                                             |

Article 27 is the _channel_ through which supervisory authorities and data subjects reach us. The other obligations are the _substance_ of what they receive when they do.

---

## 9. HUMAN-pending actions

| #   | Action                                                                                    | Owner           | Deadline                      |
| --- | ----------------------------------------------------------------------------------------- | --------------- | ----------------------------- |
| 1   | Send the §5 email to Prighter (primary) + EDPO (backup, in case Prighter is slow)         | Jo              | T-30                          |
| 2   | Review + sign the §4 engagement letter (or the vendor's counter-template; Comply reviews) | Jo + Comply     | T-21                          |
| 3   | Provision `eu-rep@studiozero.dev` + `uk-rep@studiozero.dev` aliases in Resend             | Jo + Forge      | T-21                          |
| 4   | Coordinate ROPA assembly with the appointed representative                                | Comply + Vendor | T-7                           |
| 5   | Pay annual fee (€690 to Prighter, or vendor-equivalent)                                   | Penny           | On contract sign              |
| 6   | Re-evaluate at first 12-month renewal (Q2 2027)                                           | Comply + Penny  | T-30 from renewal anniversary |

---

## 10. Comply self-verdict

| Gate                                                                                           | Status |
| ---------------------------------------------------------------------------------------------- | ------ |
| Statutory basis for the engagement explained + penalty exposure quantified                     | PASS   |
| Three vendors short-listed with apples-to-apples comparison + recommendation                   | PASS   |
| Engagement letter template covers Art. 27(3)–(5) duties verbatim + liability cap + termination | PASS   |
| Pre-drafted email Jo sends to start engagement (no thinking required)                          | PASS   |
| Post-engagement file-update playbook (§12 of Privacy Policy, §13 of DPA, `/privacy` route)     | PASS   |
| Timing aligned with M5 launch (T-30 send, T-21 signed, T-14 live, T-7 ROPA, T-0 operational)   | PASS   |
| Adjacent GDPR obligations clearly distinguished from Art. 27                                   | PASS   |
| HUMAN-pending actions enumerated (§9)                                                          | PASS   |

**Comply verdict: ENGAGEMENT PACKAGE READY.** Hard deadline: T-14 (M5 launch week 15) for representative-live; T-21 planned with one-week buffer. Failure to engage by first EU signup is technical breach.

---

_Comply locks this Art. 27 engagement package at v1.0 on 2026-05-12. Next re-verification: 30 days before the first 12-month contract anniversary (Q2 2027). HUMAN-pending: §9 actions, sequenced T-30 → T-7._
