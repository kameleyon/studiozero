# Refund Matrix — Studio Zero (Regional, Comply-locked)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Comply (Compliance Officer)
**Co-signs required:** Ledger (Stripe configuration), Herald (consumer-facing copy voice)
**PRD anchors:** §17 Decision #8 (origin policy — superseded), Decision #20 (regional matrix — LOCKED v0.4), Decision #22 (EU cooling-off resets per upgrade — LOCKED v0.5), §14.4 retention, §14.5 compliance, §14.7 AUP, §13.4 secret handling
**Cross-references:** `ia/user-flows/billing-and-cancel.md` (the spine), `sprint/milestone-M2.md` (exit gate items #20, #22), `compliance/dpa-template.md` (M2), Ledger's `finance/stripe-config.md` §6 (webhooks) + §7 (refund handlers)
**Status:** LOCKED for M2 ship; mandatory live before any paid charge.

> Comply Rule #4: "Other companies do it this way" is not a valid legal defense. Every claim in this file is cited to the regulation by article / section / CFR number. Where the substantive law is silent or ambiguous, this matrix takes the **more customer-favorable** position — it is easier to defend a generous refund than to retroactively credit a denied one.

---

## 1. Regulatory inventory

The legal regimes that govern refund, cancellation, dispute, and disclosure on Studio Zero's subscription and one-time SKUs. Every row in §2 (Regional Matrix) and §7 (Refund-Trigger Truth Table) traces to a citation here.

### 1.1 EU — Directive 2011/83/EU on Consumer Rights (Consumer Rights Directive, "CRD")

- **Citation:** Directive 2011/83/EU of the European Parliament and Council of 25 October 2011, as amended by Directive (EU) 2019/2161 ("Omnibus Directive").
- **Specifically:** Art. 9 (right of withdrawal), Art. 10 (extension to 12 months on notice failure), Art. 11 (exercise of the right), Art. 13 (refund obligation — 14 days), Art. 14 (consumer's obligations on withdrawal), Art. 16(m) (waiver carve-out for digital content "supplied not on a tangible medium" where the consumer gave express prior consent AND acknowledged loss of withdrawal right).
- **Scope:** B2C distance contracts for digital services with consumers established in any EU Member State. Studio Zero is a "trader" providing "digital services" within the meaning of Art. 2(13).
- **Our obligation:** Provide a 14-day cooling-off period from contract conclusion. Refund within 14 days of withdrawal notice (Art. 13(1)). To suspend the cooling-off right via Art. 16(m), we must collect **(a)** express prior consent that performance begin within the 14-day window and **(b)** acknowledgment that the right is consequently lost. Both must be in durable form.
- **Enforcement teeth:** Per Member State competent authorities (e.g., German BNetzA, French DGCCRF, Irish CCPC). Omnibus Directive raised fines to up to **4% of annual turnover in the Member State concerned** or, in cross-border CPC-Network cases, **€2 million minimum**. Class actions enabled by Directive (EU) 2020/1828 (Representative Actions).

### 1.2 UK — Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 ("CCR 2013")

- **Citation:** Statutory Instrument 2013 No. 3134, made under European Communities Act 1972 (retained post-Brexit per Retained EU Law (Revocation and Reform) Act 2023). The substantive 14-day right is preserved.
- **Specifically:** Reg. 29 (right to cancel), Reg. 30 (cancellation period — 14 days), Reg. 34 (effect on supply contracts for digital content), Reg. 36 (digital-content waiver — parallel to CRD Art. 16(m)), Reg. 38 (refund within 14 days).
- **Scope:** Consumer contracts concluded at a distance with consumers resident in the UK (England, Wales, Scotland, Northern Ireland).
- **Our obligation:** Same posture as EU — 14-day cooling-off, express waiver to suspend, 14-day refund SLA on withdrawal.
- **Enforcement teeth:** Trading Standards (local authority) + Competition and Markets Authority (CMA). Digital Markets, Competition and Consumers Act 2024 (in force 2025) gives CMA direct fining power up to **10% of global turnover**. Treat UK risk as on-par with EU, not as a softer cousin.

### 1.3 EU/UK — GDPR & UK GDPR (cross-link only — refund-adjacent, not refund itself)

- **Citation:** Regulation (EU) 2016/679 (GDPR), Art. 17 (erasure), Art. 12(3) (one-month response).
- **Why it lives here:** A customer who cancels and then exercises Art. 17 right-to-erasure must have their billing records preserved for 7 years under §14.4 (tax/accounting lawful basis Art. 6(1)(c)) while findings/code are purged per the §14.4 retention table. Cancellation and erasure are **separate workflows**; cancellation does not automatically trigger erasure. The Privacy → Erase Data flow does (see `ia/user-flows/settings-and-account-management.md`).
- **Enforcement teeth:** GDPR Art. 83 — up to **€20M or 4% of global annual turnover**, whichever is higher.

### 1.4 California — Automatic Renewal Law ("SB 313" / Cal. Bus. & Prof. Code §17600 et seq.)

- **Citation:** SB 313 (2024 amendments, in force 2025-07-01), amending Cal. Bus. & Prof. Code §§17601–17606.5.
- **Specifically:** §17602(a)(3) (clear and conspicuous disclosure of cancellation policy before charging); §17602(b) (affirmative consent to auto-renewal); §17602.7 (online same-method cancellation requirement — parallel to FTC 16 CFR 425 but state-level); §17603 (remedies — restitution + statutory damages).
- **Scope:** California residents (billing address, IP, or self-declared) on any subscription with automatic renewal.
- **Our obligation:** **Pro-rata refund of unused portion** when a California consumer cancels an unconsumed subscription period; online cancellation must be available in the same medium as signup with no longer-than-signup friction; clear disclosure of renewal terms at signup and renewal-notice between 3 and 21 days before any renewal of a term ≥1 year.
- **Enforcement teeth:** Cal. Bus. & Prof. Code §17206 — civil penalty up to **$2,500 per violation**, plus restitution; private right of action under the Unfair Competition Law (§17200). Class-action exposure.

### 1.5 US Federal — FTC Click-to-Cancel Rule (16 CFR Part 425)

- **Citation:** Federal Trade Commission Negative Option Rule, 16 CFR Part 425, final rule published 2024-11-15, **effective 2025-01-19** (deferred provisions effective 2025-05-14).
- **Specifically:** §425.4 (simple cancellation — must be at least as easy as initiation, in the same medium); §425.5 (misrepresentation prohibition); §425.6 (consent); §425.7 (record-keeping — 3 years).
- **Scope:** All US-based consumer subscriptions, regardless of state. Applies to Studio Zero's Managed Starter ($99) and Managed Pro ($249) tiers and to BYOK platform-fee subscriptions.
- **Our obligation:** Cancellation pathway as easy as signup, in the same medium (online → online), no upsell-with-confirm-buried, no support-required gating, no longer-than-one-step retention attempt, confirmation of cancellation within a reasonable time.
- **Enforcement teeth:** Civil penalty up to **$51,744 per violation per day** (15 U.S.C. §45(m); inflation-adjusted per 16 CFR §1.98). FTC can also seek consumer redress and disgorgement under §19 of the FTC Act. The Click-to-Cancel rule was challenged but the substantive simple-cancellation requirement is in force.

### 1.6 California — CCPA / CPRA

- **Citation:** California Consumer Privacy Act of 2018 (Cal. Civ. Code §1798.100 et seq.), as amended by California Privacy Rights Act of 2020 (CPRA), regulations at 11 CCR §7000 et seq.
- **Specifically:** §1798.105 (right to delete — 45 days, extendable by 45), §1798.110 (right to know), §1798.120 (right to opt out of sale/share — "Do Not Sell or Share My Personal Information"), §1798.135 (notice-of-right disclosures + link surface), §1798.130 (verification).
- **Scope:** California consumers; applies once business thresholds met (gross revenues > $25M OR 100k consumers' PI OR ≥50% revenue from selling/sharing PI). Studio Zero will hit thresholds at scale; ship the surface from day one.
- **Our obligation:** Even though Studio Zero does **not sell or share PI for cross-context behavioral advertising**, §1798.135(b)(1) requires the link "Do Not Sell or Share My Personal Information" on every internet homepage *if the business sells/shares*; we will publish a clear non-sale notice in lieu, plus a privacy choices link to be safe (CPRA Reg. §7026). 45-day response window on requests.
- **Enforcement teeth:** California Privacy Protection Agency (CPPA) — administrative fines up to **$7,500 per intentional violation** or per violation involving a minor (§1798.155). Private right of action limited to data breach scenarios under §1798.150.

### 1.7 Stripe — Services Agreement & Dispute Terms

- **Citation:** Stripe Services Agreement (US), Section 3 (Disputes, Refunds and Reversals); Stripe Connected Account Agreement where applicable; Stripe Restricted Businesses list; Stripe's dispute documentation under Stripe Radar.
- **Specifically:** Network dispute windows — **Visa: 120 days from transaction (per Visa Core Rules ID# 0026648 chargeback reason 13.x), MasterCard: 120 days (MasterCard Chargeback Guide §3.x), Amex: typically 120 days, Discover: 120 days**. Stripe's combined window is 120 days for most consumer cards. Stripe requires evidence submission within their **specified response window** (typically 7–21 days depending on reason code).
- **Scope:** Every card-funded charge processed by Stripe.
- **Our obligation:** Maintain dispute rate **below 0.75%** (Stripe risk threshold; 1.0% = Visa VAMP/MasterCard Excessive Chargeback Program); submit evidence packages within Stripe's response window; honor Stripe's reversal even if substantively meritless.
- **Enforcement teeth:** Stripe can suspend the account, hold reserves up to 100% of balance for 120+ days, and terminate. No regulator; this is a contract-private remedy.

### 1.8 Out-of-scope at MVP (flagged for V2)

These are not addressed by this matrix; revisit when those markets unlock. Each has a refund/cooling-off posture in the **same family as GDPR/CRD** but separate statutory citations:

- **Brazil — Código de Defesa do Consumidor (Law 8.078/1990) Art. 49** — 7-day right of regret for distance contracts. LGPD (Law 13.709/2018) Art. 18 right of erasure.
- **Canada — PIPEDA (S.C. 2000, c. 5); Québec Law 25; Ontario Consumer Protection Act 2002 §43** — 10-day cooling-off on remote agreements.
- **Australia — Australian Consumer Law (Schedule 2 to the Competition and Consumer Act 2010)** — consumer guarantees; no statutory cooling-off for digital services but ACCC enforcement on misleading conduct (§18).
- **Singapore — Consumer Protection (Fair Trading) Act (Cap. 52A); PDPA.**
- **South Korea — Act on the Consumer Protection in Electronic Commerce Art. 17** — 7-day withdrawal.
- **Japan — Act on Specified Commercial Transactions** — no statutory cooling-off for digital services but Specified Commercial Transactions Act applies.

**Trigger to revisit:** when Locale opens any of these regions in `subscriptions.region` enum, this matrix gets a parallel row + citation.

---

## 2. Regional matrix

Single source of truth. Every billing event reads `subscriptions.region` (set at signup per `ia/user-flows/billing-and-cancel.md` D20 spine — IP + timezone + billing-address declaration, with explicit-radio disambiguation on conflict per EC-6) and applies the corresponding row.

| Region | Cooling-off | Pro-rata refund | Dispute window | Cancellation channel | Plain-language summary |
|---|---|---|---|---|---|
| **EU** | **14 days** from contract conclusion per Directive 2011/83/EU Art. 9; waivable only via Art. 16(m) express prior consent + acknowledgment of right loss | Full refund within window if waiver **unsigned**; pro-rata only if waiver **signed**; refund issued within 14 days of withdrawal notice per Art. 13(1) | 14-day withdrawal notice (statutory) **+** Stripe 120-day chargeback (contractual) | Online same medium as signup; email withdrawal also accepted per Art. 11(1) | EU waiver checkbox at checkout starts the clock. Window **resets per upgrade** per D22 (§3 below). |
| **UK** | **14 days** per CCR 2013 Reg. 30; waivable per Reg. 36 (parallel to CRD Art. 16(m)) | Same as EU | 14-day notice **+** Stripe 120-day | Online same medium **+** email | UK parallel to EU. CMA enforcement teeth treated as equivalent. |
| **California** | None — no statutory cooling-off; CRD does not extraterritorially apply | **Pro-rata refund** of unused subscription period per SB 313 / Cal. Bus. & Prof. Code §17602.7 | Stripe 120-day chargeback **+** state-level UCL §17200 private action | Online same medium per §17602.7 **and** FTC 16 CFR 425 | One-click cancel; refund unused fraction of paid period; automated. |
| **US (other 49)** | None | None statutorily required | Stripe 120-day chargeback only | Online same medium per FTC 16 CFR 425 §425.4 | FTC Click-to-Cancel applies federally; no state-level pro-rata. |
| **ROW (Rest of World)** | None (per MVP-scope; revisit when LGPD/PIPEDA markets unlock) | None | Stripe 120-day | Online same medium (defensive default — Studio Zero applies FTC posture globally) | Stripe Services Agreement governs disputes. |

**Implementation note for Ledger + Forge:** the region column maps to `subscriptions.region` enum `{'eu','uk','ca','us','row'}` (per Atlas's `0003_billing_managed.sql`). The cooling-off column drives the `cooling_off_windows` Postgres trigger (Forge — D22 reset trigger per M2 deliverables).

---

## 3. EU + UK cooling-off lifecycle (D22 resolution)

D22 was locked v0.5: **EU/UK cooling-off resets on upgrade**. The customer-friendly interpretation. This section specifies the workflow.

### 3.1 Region detection

At every billing-state transition, Locale resolves region per priority:
1. Billing-address country (Stripe Customer object)
2. IP geolocation at session start
3. Timezone
4. On disambiguation conflict (e.g., VPN — IP says EU but billing address US), present explicit radio at B-S (`ia/user-flows/billing-and-cancel.md` EC-6) and log all three signals to `audit_logs` for Comply trail.

If region resolves to `eu` or `uk`, the cooling-off workflow engages.

### 3.2 Signup-time waiver capture

- Banner at Stripe Checkout pre-confirmation: **"You're in the EU/UK. By law, you have 14 days to change your mind."**
- Express waiver checkbox (D22-locked copy, mirrored from `ia/user-flows/billing-and-cancel.md` and confirmed legally sufficient under CRD Art. 16(m) + CCR 2013 Reg. 36):
  - **EU:** *"I waive my right to the 14-day cooling-off period under Directive 2011/83/EU. I understand that by clicking Subscribe, my subscription begins immediately and I cannot cancel for a refund within the next 14 days unless the service is faulty."*
  - **UK:** *"I waive my right to the 14-day cancellation period under the Consumer Contracts Regulations 2013. I understand my subscription begins immediately and I cannot cancel for a refund within 14 days unless the service is faulty."*
- Checkbox state stored in `subscriptions.cooling_off_waiver_signed_at` (timestamp; NULL if unticked). Default state = unticked (per EDPB Guidelines 05/2020 on consent applied by analogy + CRD Art. 8(2)).
- Pre-ticked is **forbidden** — pre-checking would invalidate consent under EDPB 05/2020.
- Note for Herald: never lead with the waiver. Lead with the right; the waiver is the trade-off.

### 3.3 Without waiver (waiver unsigned)

- Subscription proceeds. Customer retains 14-day full-refund right.
- Confirmation email includes restatement of the right + the cancel link.
- Customer cancels within 14 days → **full refund of all amounts paid, including upgrade increments, processed within 14 days of withdrawal per CRD Art. 13(1) / CCR Reg. 38**.
- Cancel within window: B-CAN-REGIONAL renders cooling-off path; Stripe `Refund` issued immediately; subscription downgrades to free.

### 3.4 With waiver (waiver signed)

- Customer expressly waived; standard cancel posture applies.
- Customer cancels within 14 days → cancellation effective at period-end; **no full refund**.
- **Important carve-out (CRD Art. 16(m) + CCR Reg. 36):** the waiver does **not** override service-faulty refund rights. If customer claims the service is faulty (e.g., audit run failed, verdict was demonstrably wrong, billing was incorrect), B-DISPUTE path opens; Comply + Jury review on the 5-day SLA in §6 below.

### 3.5 Upgrade resets window (D22 lock)

- Customer on Starter at day N (N ≤ 13 of original window or beyond), upgrades to Pro → **new 14-day window starts on Pro from upgrade timestamp**.
- The Postgres trigger on `subscriptions` insert/update with `region IN ('eu','uk')` writes a fresh `cooling_off_windows` row (Forge M2 deliverable).
- UI banner at upgrade time (Vega M2 deliverable per `sprint/milestone-M2.md`): *"Your 14-day cooling-off window resets with this upgrade."*
- Cancel within the new window → full refund of the **upgrade increment** (i.e., the additional amount charged for the upgrade), not the original Starter cost if already consumed beyond the original window. If the original Starter window was still open at upgrade, the original right merges into the new window (single 14-day window from upgrade timestamp; full refund of full amount paid on the upgrade contract).
- Rationale (D22 lock text): upgrade creates a new contract; the new contract's distance-sales nature triggers a fresh withdrawal right under CRD Art. 9. The customer-friendly interpretation is the only one Comply can defend with the regulation as written.

### 3.6 Downgrade does **not** reset

- Downgrade does not create a new contract; it modifies the existing one. Current window runs through unchanged.
- If downgrade happens within an open window, the open window applies to the **new lower price** (full refund = lower-tier price, not the prior higher-tier amount).

### 3.7 Day-14 close

- Cron-driven email (Watch + Hook deliverable) on day 14 confirming the window has closed without action: *"Your 14-day cooling-off window closed today. You can still cancel anytime; refund eligibility now follows Studio Zero's standard regional policy."*
- `cooling_off_windows.closed_at` set to `now()`.
- No further full-refund right; customer falls back to in-app Dispute path (§6) or Stripe chargeback (last resort).

---

## 4. FTC Click-to-Cancel UX spec (16 CFR Part 425)

Per §425.4 (Simple Cancellation) and §425.5 (Misrepresentation), the following are **mandatory**. Failure = up to $51,744 per violation per day.

### 4.1 Same-medium requirement (§425.4(a)(1))

- Signup is online → cancel must be online. No phone-required cancellation path. No "contact our team" gating.
- Signup in-app (Settings → Billing) → cancel surface in the same place, equally prominent. No menu-burying.
- Cancel link in **both** the Stripe Customer Portal (Stripe-hosted, fallback) **and** Studio Zero's Settings → Billing (primary). Two entry points; one cannot be the *only* entry point.

### 4.2 No-longer-than-signup-friction (§425.4(a)(2))

- Signup is `pick plan → checkout → done` (3 clicks). Cancel must be ≤ 3 clicks.
- Concrete spec (mirrors `ia/user-flows/billing-and-cancel.md` B-CAN acceptance test #2):
  - Click 1: "Cancel subscription" in B0 (Settings → Billing).
  - Click 2: confirm in modal ("Confirm cancellation").
  - Click 3 (optional): close confirmation.
- The "Keep my subscription" reject button must exit in **one click**, not require additional confirmation.

### 4.3 No prohibited friction (§425.5(b))

- **No upsell-with-confirm-buried.** A retention offer is permitted but it cannot be a required step. The cancel flow must include a button labeled "Cancel anyway" or equivalent, prominently. (Conservative read of §425.5(b); FTC has been aggressive on dark-pattern characterizations.)
- **No "are you sure" loop > 1.** One confirm step. Not three.
- **No support-required gating.** Cannot route the customer to a human before processing cancellation.
- **No multi-channel switch.** Started in-app → cannot demand they call.

### 4.4 Confirmation (§425.4(b))

- Confirmation email within **60 seconds** of cancellation (configured at Stripe webhook receipt → email send via Resend transactional pipeline).
- Email content includes:
  - Confirmation of cancellation
  - Effective date (immediate cancellation OR period-end, region-specific)
  - Refund amount (if any) + expected settlement timing (Stripe 5–10 business days for card refunds)
  - Re-subscribe link (no restriction on re-engagement)

### 4.5 Pro-rata processing (CA + FTC defensive)

- California subscribers (SB 313): automatic pro-rata refund calculated server-side; idempotent (per Ledger's `finance/stripe-config.md` §7 refund handler with `idempotency_key = "refund:" + subscription_id + ":" + cancellation_timestamp`).
- Pro-rata formula: `refund_cents = floor((days_remaining / days_in_period) * plan_price_cents)`. Days remaining computed from cancellation timestamp to `current_period_end`. Rounding favors customer (floor of the denominator-effect, ceiling of customer benefit — per UCL §17200 conservative read).
- Non-California US: no automatic pro-rata; customer can request via Dispute path (§6).

### 4.6 Record-keeping (§425.7)

- All cancellation events logged to `audit_logs` with: timestamp, user_id, tenant_id, subscription_id, region, cooling-off state, refund amount, IP, user-agent. Retained **3 years** per §425.7 (longer than our default; this overrides the default `audit_logs` retention for cancellation events specifically).

---

## 5. CCPA "Do Not Sell or Share" surface (Cal. Civ. Code §1798.135)

Required even though Studio Zero does **not sell or share personal information for cross-context behavioral advertising**. The safer posture is to publish the surface and clearly state "we don't sell" rather than rely on the technical carve-out.

### 5.1 Footer link

- Every page on the public marketing site, the in-app shell, and the Stripe Checkout return surfaces: footer link labeled exactly **"Your Privacy Choices"** (per CPRA Reg. §7026(a)) **or** **"Do Not Sell or Share My Personal Information"** (per §1798.135(a)).
- Link routes to `/legal/privacy-choices`.
- Page content:
  - Plain-language statement: "Studio Zero does not sell your personal information. We do not share your personal information for cross-context behavioral advertising as defined by CCPA §1798.140(ah)."
  - Opt-out form anyway (defensive — if a customer asserts we are sharing, the form is the verification path).
  - Right-to-know request form (Art. 1798.110).
  - Right-to-delete request form (Art. 1798.105).
  - 45-day response SLA disclosure.

### 5.2 In-app settings surface

- Settings → Privacy → toggles for:
  - "Do not sell or share my personal information" (default ON — we don't sell anyway, but the toggle persists customer's expressed preference).
  - "Limit use of sensitive personal information" (§1798.121).
  - "Marketing communications" (separate from privacy choices — per §1798.135(b)(3) "alternative opt-out link"; this is the lawful-basis Art. 6(1)(a) GDPR + state-marketing-CAN-SPAM consent surface).

### 5.3 Response SLA

- 45-day response window per §1798.130(a)(2), extendable to 90 days on notice per §1798.130(a)(2)(ii).
- Comply maintains the request queue at `compliance/ccpa-requests/` (off-Git for privacy; tracked in a Supabase Vault-secured table).
- Identity verification per 11 CCR §7060 — pass acceptable signals (logged-in session + email confirmation suffice for "right to know" and "right to delete"; sensitive PI removal requires step-up).

---

## 6. Dispute Finding path (pre-chargeback)

Per D20 lock + the wedge logic: Studio Zero's wedge is the **independent audit** — when a customer disputes a verdict, the right resolution path is **another human review**, not a chargeback. Comply + Jury operate this path together.

### 6.1 Two paths before chargeback

#### Path A — In-app Dispute Finding flow

- Trigger: "Dispute Finding" button on V0 verdict screen, OR "Dispute charge" in B0 Billing.
- Flow: form captures (a) which charge/run is disputed, (b) which finding(s) are contested, (c) the customer's case (free text + optional file upload).
- System generates an **evidence package**: verdict + findings + cited evidence + agent reasoning trace + score-engine version + run metadata.
- Submission → `disputes` row created (Atlas `0003_billing_managed.sql`) → Stripe Radar review hold applied (paused dunning, paused further charges on this subscription).
- Comply + Jury 5-business-day SLA for human review.
- Resolution outcomes:
  - **Dispute upheld** → full refund + free re-audit credit + (if appropriate) Jury re-runs the audit on the same intake with adjusted reviewer config.
  - **Dispute denied** → customer notified with reasoned response citing specific evidence; subscription resumes; customer can still escalate to Stripe chargeback (we will provide them the evidence package automatically so they can attach it to their chargeback if they want; we cannot prevent escalation — Stripe does).

#### Path B — Email comply@studiozero.dev

- Same intake, different surface. 5-business-day SLA on initial response, same resolution mechanics.
- Email path exists for customers who can't access the in-app surface (e.g., subscription suspended, account lockout).

### 6.2 Why this matters legally

- Pre-chargeback paths **reduce dispute rate** in Stripe's accounting (chargebacks count against the 0.75% threshold; in-app disputes do not unless escalated).
- Pre-chargeback paths satisfy the "good-faith dispute resolution" expectation that California UCL §17200 and FTC Click-to-Cancel both implicitly require.
- Pre-chargeback paths preserve the wedge — the customer experiences the audit-then-re-audit loop instead of the "I gave up and called my bank" loop.

### 6.3 Chargeback path (last resort, customer-initiated)

- If customer skips the pre-chargeback paths and files with their bank directly, we still get notified via Stripe webhook `charge.dispute.created`.
- Comply runs the Stripe Dispute response per `compliance/stripe-dispute-runbook.md` (to be drafted by Ledger + Comply jointly for M2 ship).
- Evidence package generated automatically (same as Path A) and submitted to Stripe within Stripe's response window.
- Outcome is whatever the issuing bank decides. Stripe-side appeal exhausted per Stripe's terms.

---

## 7. Refund-trigger truth table

For each refund trigger, who is eligible, what is refunded, what is the SLA, what is the audit-log row.

| # | Trigger | Eligible region(s) | Refund amount | SLA | Audit-log row |
|---|---|---|---|---|---|
| RT-1 | Cooling-off withdrawal, waiver unsigned, within 14 days | EU, UK | **Full refund** of all paid amounts on this contract (incl. upgrade increments per §3.5) | Refund issued within 14 days of withdrawal notice per CRD Art. 13(1) / CCR Reg. 38; Stripe settlement typically 5–10 business days | `audit_logs.action='refund.cooling_off'`; `meta={region, withdrawal_notice_at, refund_amount_cents, stripe_refund_id}` |
| RT-2 | Cancellation, waiver signed, within 14 days, service-faulty claim upheld | EU, UK | Full refund or pro-rata, depending on extent of fault; Comply's call after Jury review | Per the Dispute Finding 5-business-day SLA (§6) | `audit_logs.action='refund.faulty_service'`; `meta={dispute_id, reasoning_link}` |
| RT-3 | Cancellation, California, mid-period | California | **Pro-rata refund** of unused days per SB 313 §17602.7 (`floor((days_remaining / days_in_period) * plan_price_cents)`) | Refund issued immediately on cancellation; Stripe settlement 5–10 business days | `audit_logs.action='refund.proRata_ca'`; `meta={days_remaining, days_in_period, refund_cents}` |
| RT-4 | Cancellation, US (non-CA) or ROW, mid-period | US ex-CA, ROW | None automatic; customer can request via Dispute path | If dispute granted: per Dispute SLA | `audit_logs.action='cancel.no_refund'` |
| RT-5 | Run failure (irrecoverable) — Managed | All | Refund of credits used **on that run** per PRD §14.2 + D21; subscription continues | Automatic; same billing cycle | `audit_logs.action='refund.run_failure'`; `meta={run_id, failure_mode, credits_refunded}` |
| RT-6 | Jury synthesis stall > 30s → `failed_synth_timeout` (D21) | All | Refund of credits used on that run; customer offered restart | Automatic on state transition | `audit_logs.action='refund.synth_timeout'`; `meta={run_id, stall_duration_seconds}` |
| RT-7 | BYOK token-budget exceeded mid-run | All BYOK | No refund (customer's tokens, customer's cap) but `429 / token_budget_exceeded` returned with no further consumption | Real-time | `audit_logs.action='token_budget_exceeded'` |
| RT-8 | Dispute Finding upheld (in-app dispute path) | All | Full refund of disputed charge **+ free re-audit credit** | Per Dispute SLA (5 business days) | `audit_logs.action='refund.dispute_upheld'`; `meta={dispute_id, run_id, refund_cents}` |
| RT-9 | Stripe chargeback filed by customer | All | Bank decides; if customer wins, Stripe reverses charge (+ Stripe dispute fee retained by Stripe per their fee schedule) | Per Stripe response window (varies by reason code) | `audit_logs.action='chargeback.resolved'`; `meta={charge_id, outcome, stripe_dispute_id}` |
| RT-10 | AUP violation termination (Studio Zero terminates customer) | All | Pro-rata refund of unused subscription period per §14.7 + regional law; no refund if violation involves prohibited content per §14.7 | Within 14 days of termination (defensive — adopt the EU posture globally for these) | `audit_logs.action='refund.aup_termination'`; `meta={aup_clause_violated, refund_cents}` |
| RT-11 | Auto-PR (V1.5) — fix demonstrably wrong | All | Full refund of Auto-PR upgrade charge; subscription unaffected | Per Dispute SLA | `audit_logs.action='refund.auto_pr_defect'` |

**Idempotency requirement (cross-link to Ledger's `finance/stripe-config.md` §7):** every refund call to Stripe must carry `Idempotency-Key` header matching `refund:<subscription_id_or_run_id>:<trigger_timestamp_iso>`. Replay safety verified by `tests/integration/stripe-checkout-and-webhook.spec.ts` (M2 gate).

---

## 8. Notice + disclosure copy (drafts; Herald passes for voice)

Comply provides the legally-sufficient text; Herald owns final polish for brand voice per `brand/voice.md`. Drafts below are **legally sufficient as-is** — Herald may not weaken protective text but may rephrase for tone.

### 8.1 Stripe Checkout — EU/UK cooling-off banner (above plan selector)

> **Your 14-day cooling-off right (EU/UK)**
> By law, you have 14 days from purchase to change your mind and get a full refund. You can keep this right (default), or waive it below if you want to start using Studio Zero immediately and accept that the right is then lost.

### 8.2 EU waiver checkbox (default unticked)

> **□ I waive my 14-day cooling-off right.**
> *I waive my right to the 14-day cooling-off period under Directive 2011/83/EU. I understand that by clicking Subscribe, my subscription begins immediately and I cannot cancel for a refund within the next 14 days unless the service is faulty.*

### 8.3 UK waiver checkbox (default unticked)

> **□ I waive my 14-day cancellation right.**
> *I waive my right to the 14-day cancellation period under the Consumer Contracts Regulations 2013. I understand my subscription begins immediately and I cannot cancel for a refund within 14 days unless the service is faulty.*

### 8.4 California — auto-renew disclosure (per Cal. Bus. & Prof. Code §17602(a)(1))

> **Auto-renewal terms (California consumers):**
> Your subscription renews automatically on `<renewal_date>` for `<plan_price>`, charged to the payment method on file. You can cancel anytime online at Settings → Billing. If you cancel mid-period, California law entitles you to a pro-rata refund of unused days.

### 8.5 Cancellation confirmation email (US, default)

> Subject: *Your Studio Zero subscription is cancelled.*
>
> Your cancellation is confirmed. Your access continues through `<period_end>`. After that, your account moves to the free plan; your past audits and findings stay available for export.
>
> No refund applies on this cancellation under your region's policy. If you believe the service didn't deliver what you paid for, you can dispute a finding within 60 days: `<link>`.
>
> — Studio Zero

### 8.6 Cancellation confirmation email (EU/UK, cooling-off, waiver unsigned)

> Subject: *Your Studio Zero refund is processing.*
>
> Your cancellation is confirmed under your 14-day cooling-off right (`<EU Directive 2011/83/EU | UK CCR 2013>`). A full refund of `<amount>` `<currency>` is on its way to your card — it usually settles within 5–10 business days.
>
> Your access ends now. Your past audits and findings stay available for export for 90 days.
>
> — Studio Zero

### 8.7 Cancellation confirmation email (California, pro-rata)

> Subject: *Your Studio Zero subscription is cancelled, with a partial refund.*
>
> Your cancellation is confirmed. Under California's SB 313, you're entitled to a pro-rata refund of `<refund_amount>` for the unused portion of this billing period — it's on its way to your card and usually settles within 5–10 business days.
>
> Your access ends now. Your past audits and findings stay available for export.
>
> — Studio Zero

### 8.8 Dunning final email (subscription about to cancel for payment failure)

> Subject: *Last try — your Studio Zero subscription will be cancelled tomorrow.*
>
> We've tried `<n>` times to charge your card on file and each one was declined. If we can't bill you by `<deadline>`, your subscription will be cancelled and your account will move to the free plan.
>
> Update your card here: `<link>` — or, if you'd rather, downgrade to the free plan now: `<link>`. Either way, your past audits and findings stay.
>
> — Studio Zero

### 8.9 Dispute Finding intake (in-app banner)

> *We hear you. If you think a finding is wrong, tell us why and we'll have another human reviewer look — usually within 5 business days. Your billing pauses until we decide.*

### 8.10 CCPA "Your Privacy Choices" landing copy

> **Your Privacy Choices**
>
> *We don't sell your personal information.* Studio Zero does not sell your personal information, and we don't share it for cross-context behavioral advertising (CCPA §1798.140(ah)). Still, California gives you the right to opt out, request what we know about you, or ask us to delete it. Use the forms below.
>
> - Right to know (45-day SLA): `<form>`
> - Right to delete (45-day SLA): `<form>`
> - Limit sensitive personal information: `<toggle>`
> - Marketing communications: `<toggle>` (separate from the above)

---

## 9. Comply exit-gate self-verdict

Per BUILD_FLOW.md Phase 7 Jury Exit Gate, Comply must verdict that the refund matrix covers EU 14-day cooling-off, UK CCR 2013, CA SB 313, and FTC Click-to-Cancel.

- [x] **EU 14-day cooling-off covered.** Directive 2011/83/EU Art. 9-16 cited; Art. 16(m) waiver clause specified; Art. 13(1) 14-day refund SLA codified; D22 reset-on-upgrade resolved (§3.5).
- [x] **UK CCR 2013 covered.** CCR 2013 Regs. 29, 30, 34, 36, 38 cited; parallel waiver checkbox locked; same SLA and reset mechanics as EU.
- [x] **California SB 313 pro-rata covered.** Cal. Bus. & Prof. Code §§17600–17606.5 cited; pro-rata formula speced (§4.5); idempotency requirement cross-linked to Ledger; auto-renew disclosure copy drafted (§8.4).
- [x] **FTC Click-to-Cancel UX speced.** 16 CFR Part 425 §§425.4, 425.5, 425.6, 425.7 cited; same-medium, ≤3-click cancellation, no-prohibited-friction, 60-second confirmation, 3-year record-keeping all locked (§4).
- [x] **Dispute Finding path before chargeback documented.** Two paths (in-app + email comply@) + 5-business-day SLA + evidence-package generation + Stripe Radar hold + outcomes (upheld/denied) all speced (§6).
- [x] **CCPA "Do Not Sell" surface specified.** §1798.135 link surface + §1798.105 deletion + §1798.110 right to know + 45-day SLA + in-app toggles all speced (§5).

**Phase 7 Comply verdict: PASS.** Locked for M2 ship. Mandatory live before any paid charge per `sprint/milestone-M2.md`.

---

## 10. Cross-references for Ledger + Forge + Vega implementation

- **Ledger:** mirror §7 truth table into `finance/stripe-config.md` §6 (webhook handlers) + §7 (refund handlers) with the exact `Idempotency-Key` patterns specified. Stripe webhook signature verification on every event (Cipher M2 corpus deliverable).
- **Forge:** D22 Postgres trigger on `subscriptions` insert/update with `region IN ('eu','uk')` writes new `cooling_off_windows` row per `sprint/milestone-M2.md`. Refund endpoint exposes the trigger taxonomy from §7.
- **Vega:** B-S waiver checkbox copy from §8.2/8.3 (locked, do not paraphrase); B-CAN regional rendering from §2 matrix; banner copy from §8.1; CCPA footer link from §5.1.
- **Locale:** region detection cascade per §3.1; explicit-radio fallback per `ia/user-flows/billing-and-cancel.md` EC-6.
- **Atlas:** `cooling_off_windows` table schema, `disputes` table schema, `audit_logs` action-type enum additions per §7 RT-1 through RT-11 (`0003_billing_managed.sql`).
- **Verify:** acceptance tests already in `sprint/milestone-M2.md` exit gate cover EU cooling-off reset (D22), Stripe webhook idempotency, Click-to-Cancel UX, CA pro-rata calculation. Truth-table rows RT-5, RT-6, RT-10, RT-11 need new tests added in M2 → M3 transition.

---

*Comply locks this matrix at v1.0 on 2026-05-11. Re-verify quarterly. Any change in regulation (EU AI Act Art. 50 effective 2026-08-02, FTC NPRM pending, CPPA Reg. updates, Stripe Services Agreement amendments) triggers a matrix bump and a Jury re-audit before downstream consumers depend on the new version.*
