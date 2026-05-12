# Stripe Tax Configuration — Studio Zero

**Owner:** Ledger
**Status:** M2 Batch 2 — operationally executable. Jo configures Stripe Tax via Dashboard.
**Spec source:** `finance/stripe-config.md` §1.4; `finance/refund-matrix.md` §1.6 (CCPA non-overlap); `pricing.md` §5 (annual + tax exclusivity).
**Code consumers:**

- `apps/web/app/api/billing/checkout-session/route.ts:218` — already sets `automatic_tax: { enabled: true }` and `tax_id_collection: { enabled: true }`.
- `apps/web/app/api/webhooks/stripe/route.ts` — relies on Stripe Tax computing line items; no Studio Zero-side calculation.

**Legal anchors:**

- **EU VAT:** Council Directive 2006/112/EC (VAT Directive) + 2017/2455 (Digital VAT package) — B2C digital services: VAT charged at customer's Member State rate; B2B reverse-charge via VIES validation.
- **UK VAT:** Value Added Tax Act 1994 + post-Brexit OSS replacement (UK VAT MOSS retired 2021; UK businesses register UK VAT directly when >£85k threshold).
- **US sales tax:** South Dakota v. Wayfair (2018) economic-nexus framework; per-state thresholds (typically $100k or 200 transactions).
- **VAT digital services (rest of world):** Norway, Switzerland, Australia GST, NZ GST, India GST, Singapore GST, Japan JCT, South Korea VAT, Saudi VAT, UAE VAT — Stripe Tax handles registrations.

---

## 1. Mode progression

| Phase                                   | Mode                           | Action                                                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M2 (now)**                            | **Monitoring mode**            | Stripe Tax calculates tax on every transaction but **does NOT collect** until Stripe alerts that a jurisdiction threshold has been crossed. Studio Zero customers see "Tax calculated at checkout" but pay $0 tax until §2 collection flips. |
| **M3 (post-first-customer-per-region)** | **Collection mode** per region | Flip collection-on for US states + EU OSS + UK VAT as thresholds approach. Stripe Tax surfaces "Threshold crossed — register?" alerts.                                                                                                       |
| **V2 (international expansion)**        | **Full collection**            | Norway, Switzerland, AU/NZ GST, India, etc. Stripe Tax handles every registration via partner network.                                                                                                                                       |

**Rationale (Ledger):** monitoring mode at MVP is the FTC-defensible posture. We disclose "tax may apply" on the pricing page (Vega HC7) per `finance/stripe-config.md` §1.4. At MVP volumes (first 5 customers), zero jurisdictions hit thresholds. Flipping to collection mode prematurely creates tax-registration overhead (annual filings per state) we cannot service.

---

## 2. Stripe Tax enablement procedure (Dashboard)

1. Stripe Dashboard → **Settings → Tax → Get started**.
2. **Origin address:** Jo's legal entity address.
   - **PLACEHOLDER** pending Comply trademark resolution per `finance/stripe-config.md` §1.3.
   - For Test mode, use any valid address; for Live mode, MUST match the legal entity per Stripe Services Agreement §3.
3. **Default tax category:** `txcd_10103001` (Software as a Service — generic). Applied to all Products provisioned in `stripe-products-provisioning.md`.
4. **Tax behavior on prices:** `exclusive` — locked in `finance/stripe-config.md` §1.4; tax added on top of displayed price. PRD §12 prices are net of tax.
5. **Enable Stripe Tax.**
6. **Registrations** (defer per §3 below).

---

## 3. Registrations per region

### 3.1 European Union — OSS (One-Stop Shop)

| Field                           | Value                                                                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scheme**                      | Non-Union OSS (Studio Zero is US-based; we register through Ireland's MOSS-successor portal — Stripe partner handles)                                                                                                                        |
| **Threshold**                   | €0 — VAT applies from the **first** B2C EU sale (no de minimis since 2021)                                                                                                                                                                   |
| **Action at M2**                | **Defer registration** — monitoring mode only                                                                                                                                                                                                |
| **Action at first EU customer** | Stripe surfaces "EU VAT threshold crossed — register?" alert immediately → Jo + Comply approve → Stripe Tax partner registers OSS → collection flips ON                                                                                      |
| **Reverse-charge B2B**          | **YES** — when a B2B customer supplies a valid VAT ID at Checkout, Stripe Tax validates via VIES (`https://ec.europa.eu/taxation_customs/vies/`); if valid, reverse-charge applies (customer self-assesses VAT, Studio Zero charges €0 VAT). |
| **Invoice content**             | EU-compliant: Studio Zero VAT ID (post-OSS-register), customer's VAT ID (if B2B reverse-charge), itemized VAT amount (or "reverse-charge — Art. 196 VAT Directive 2006/112/EC" boilerplate)                                                  |
| **Filing cadence**              | Quarterly to Ireland's MOSS portal (Stripe Tax exports the filing-ready report; Jo or accountant files)                                                                                                                                      |

### 3.2 United Kingdom — UK VAT

| Field                            | Value                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Scheme**                       | UK VAT (no MOSS post-Brexit — direct registration with HMRC)                                                                         |
| **Threshold**                    | £85,000 in UK-attributable revenue per rolling 12 months                                                                             |
| **Action at M2**                 | **Defer registration** — monitoring mode only                                                                                        |
| **Action at threshold approach** | Stripe surfaces alert at ~£70k cumulative UK sales → Jo + Comply approve → Stripe Tax partner registers UK VAT → collection flips ON |
| **Reverse-charge B2B**           | **YES** — UK B2B customers with valid UK VAT number → reverse-charge per VAT Act 1994 §55A                                           |
| **Invoice content**              | UK VAT ID, customer VAT ID (B2B), VAT amount or reverse-charge note                                                                  |
| **Filing cadence**               | Quarterly to HMRC via Making Tax Digital (MTD)                                                                                       |

### 3.3 United States — sales tax (per state)

| Field                                                 | Value                                                                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**                                         | Wayfair economic nexus — Stripe Tax monitors per-state thresholds automatically                                                                                             |
| **Per-state threshold (typical)**                     | $100,000 revenue OR 200 transactions per state per calendar year (varies — California uses $500k; some states use $100k OR transactions; some use only revenue)             |
| **Action at M2**                                      | **Monitoring mode** for all 50 states                                                                                                                                       |
| **Action per state at threshold-cross**               | Stripe alerts "<State> threshold crossed — register?" → Jo + Comply approve → Stripe Tax partner registers state sales tax permit → collection flips ON for that state only |
| **Streamlined Sales Tax (SST) states**                | 24 states participate in SST — Stripe handles unified registration in those states                                                                                          |
| **Non-SST states (Hawaii, Idaho, Mississippi, etc.)** | Direct registration via state Department of Revenue                                                                                                                         |
| **Marketplace facilitator exemption**                 | N/A — Studio Zero is not a marketplace facilitator (we sell our own service, not third-party sellers' goods)                                                                |
| **Filing cadence**                                    | Per-state (monthly / quarterly / annual depending on volume); Stripe Tax exports filing-ready reports                                                                       |

**SaaS taxability matrix (US):** SaaS is taxable in some states (Texas, Pennsylvania, Hawaii, etc.) and exempt in others (California, Florida, Virginia, etc.). Stripe Tax applies the per-state SaaS taxability table automatically. Studio Zero's `txcd_10103001` tax code captures this.

### 3.4 Canada — GST/HST + provincial

| Field                                 | Value                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scheme**                            | GST/HST simplified registration (non-resident digital services) per Excise Tax Act Pt IX; Québec QST; British Columbia PST; Saskatchewan PST; Manitoba RST |
| **Threshold**                         | CAD $30,000 in Canada-attributable revenue per rolling 12 months                                                                                           |
| **Action at M2**                      | **Defer registration** — monitoring mode                                                                                                                   |
| **Action at first Canadian customer** | Stripe alert → simplified GST/HST registration via Stripe Tax partner                                                                                      |
| **Reverse-charge B2B**                | YES — Canadian B2B with valid GST number → no GST charged (customer self-assesses)                                                                         |

### 3.5 Other regions (ROW)

| Region       | Scheme                        | Threshold                       | M2 action                        |
| ------------ | ----------------------------- | ------------------------------- | -------------------------------- |
| Norway       | VOEC                          | NOK 50,000                      | Defer; monitor                   |
| Switzerland  | VAT                           | CHF 100,000                     | Defer; monitor                   |
| Australia    | GST (overseas suppliers)      | AUD 75,000                      | Defer; monitor                   |
| New Zealand  | GST (remote services)         | NZD 60,000                      | Defer; monitor                   |
| India        | GST (OIDAR)                   | INR 0 (no de minimis for OIDAR) | Defer; flag at first IN customer |
| Singapore    | GST (overseas vendor)         | SGD 100,000                     | Defer; monitor                   |
| Japan        | Consumption Tax (JCT)         | JPY 10,000,000                  | Defer; monitor                   |
| South Korea  | VAT (B2C electronic services) | KRW 0 (no de minimis)           | Defer; flag at first KR customer |
| Saudi Arabia | VAT                           | SAR 375,000                     | Defer; monitor                   |
| UAE          | VAT                           | AED 375,000                     | Defer; monitor                   |

Stripe Tax surfaces threshold alerts in Dashboard → Tax → Monitoring as cumulative revenue accrues.

---

## 4. Customer-facing tax UX

### 4.1 Pricing page (Vega HC7)

- Prices displayed: net of tax (per stripe-config.md §1.4)
- Disclosure copy under tier price: **"Tax calculated at checkout."**
- Tooltip on hover: **"Stripe Tax calculates VAT, GST, or sales tax based on your billing address. EU/UK B2B customers can supply a VAT ID to reverse-charge."**

### 4.2 Checkout Session (Stripe-hosted)

Stripe automatically:

- Detects customer's region from billing address (required per checkout-session/route.ts:220 `billing_address_collection: 'required'`)
- Adds tax line item
- Validates B2B VAT ID via VIES (EU) or HMRC API (UK)
- If valid → reverse-charge applied, tax = €0/£0

### 4.3 Receipts + invoices

Stripe-generated receipts include:

- Studio Zero legal entity name + address (post-Comply trademark resolution)
- Studio Zero VAT ID (post-OSS / UK / per-state registration)
- Customer name + billing address
- Customer VAT ID if supplied
- Per-line: net amount, tax rate, tax amount, gross amount
- For reverse-charge: "Reverse-charge — Art. 196 Directive 2006/112/EC" or UK equivalent
- Receipt downloadable from Customer Portal + emailed via Stripe-generated receipt (we leave Stripe receipt enabled even though Herald handles other emails — Stripe receipts are tax-compliant by construction; Herald's "welcome" email is brand + onboarding, not a receipt)

### 4.4 Tax ID validation flow

Forge already enables this in `checkout-session/route.ts:219` via `tax_id_collection: { enabled: true }`. Stripe Checkout UI surfaces:

1. "Add tax ID (optional)" link below business name field
2. Customer enters VAT ID / GST number / ABN / etc.
3. Stripe validates synchronously (VIES, HMRC, etc.)
4. On valid → reverse-charge applied; on invalid → error shown, customer can correct or proceed without (B2C tax applied)

---

## 5. Audit + record-keeping

- **VAT records:** retained **10 years** per EU rules (longer than Studio Zero's default `audit_logs` retention). Stripe Tax stores transaction-level tax detail in `billing_events.payload` (full event JSON) — that's our regulatory record. PRD §14.4 retention table covers `billing_events` at 7y (US tax norm); EU VAT requires 10y, so flag as M3 retention-policy extension if first EU OSS-registered transaction lands before retention-policy update.
- **Sales tax records:** retained 4 years (most US states; some 6); covered by `billing_events` 7y.
- **VAT-ID validation logs:** Stripe Tax stores VIES validation timestamps + outcomes — retrievable via `customer.tax_ids.list()` API; logged also in `audit_logs.action='admin_action'` with `internal_action='vat_id_validated'` if/when Forge adds this (M3 enhancement, not M2 blocker).

---

## 6. Configuration verification

Apply in Test mode, then confirm via Stripe CLI:

```
stripe tax settings retrieve
```

Expected output (Test mode, monitoring):

```json
{
  "defaults": {
    "tax_behavior": "exclusive",
    "tax_code": "txcd_10103001"
  },
  "head_office": {
    "address": {
      /* Jo's legal entity */
    }
  },
  "status": "active",
  "status_details": {
    "active": {
      /* monitoring regions populated */
    }
  }
}
```

```
stripe tax registrations list
```

Expected at M2: **empty** (monitoring mode = no registrations yet).

---

## 7. Threshold-alert escalation

When Stripe Tax fires a threshold alert:

1. **Email to Jo + Ledger + Comply** (Stripe Tax notification settings).
2. **Watch picks up** the Stripe Tax alert via webhook `tax.transaction.created` patterns (Stripe Tax emits transaction events; Watch monitors for threshold-cross indicators).
3. **Decision SLA:** 14 days to either register-and-collect OR pause customer acquisition in that region (defensive posture if registration cost exceeds expected revenue — unlikely at any state, possible for low-threshold regions like Norway).
4. **Comply audit log:** every flip from monitoring → collection is an `audit_logs.action='admin_action'` row with `internal_action='tax_collection_enabled'` + region + Stripe registration ID.

---

## 8. Open follow-ups

- **Legal entity address** (Comply, M2): Stripe Tax origin address blocked on Comply trademark + legal entity resolution.
- **First-region collection flip** (Penny + Comply + Ledger, M3): runbook lives here; trigger is Stripe alert.
- **VAT-ID validation logging** (Forge, M3 enhancement): explicit `audit_logs` row on each successful B2B reverse-charge validation for Comply audit trail.
- **EU 10-year VAT record retention** (Atlas + Comply, M3): extend `billing_events` retention from 7y to 10y for tenant rows where any EU VAT registration was active. Conditional retention policy; not M2 blocker until first EU OSS-registered transaction.

---

_Owner: Ledger · M2 Batch 2 · Operational; ready for Jo to enable._
