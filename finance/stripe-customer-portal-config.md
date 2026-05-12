# Stripe Customer Portal Configuration — Studio Zero

**Owner:** Ledger
**Status:** M2 Batch 2 — operationally executable. Jo applies in Stripe Dashboard (Settings → Billing → Customer portal) OR via Stripe API.
**Spec source:** `finance/stripe-config.md` §1.5; `finance/refund-matrix.md` §4 (FTC Click-to-Cancel UX); `agents/growth/herald-brand-voice.md` (copy lock — Herald owns wording).
**Code consumer:** Forge's Customer Portal session creation (M2 Batch 1 — see `apps/web/app/api/billing/portal-session/route.ts` or equivalent).

**Legal anchor:** FTC 16 CFR Part 425 §425.4 (simple cancellation, same-medium) + EU CRD Art. 11(1) (online cancellation equally easy as signup) + UK CCR 2013 Reg. 29. The Customer Portal is the **canonical Click-to-Cancel surface** — every toggle below is justified against these regulations and Comply's parallel audit.

---

## 1. Feature toggles

Apply in Stripe Dashboard → Settings → Billing → Customer portal → **Configure**.

| Stripe toggle                                | Setting                                                                                                                                              | Rationale (Ledger + Comply)                                                                                                                                                                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer information**                     | Enable: email, name, phone, address, tax ID                                                                                                          | Customers must be able to keep billing details current; address change triggers Stripe Tax re-eval.                                                                                                                                                        |
| **Invoice history**                          | **Enable**                                                                                                                                           | FTC + EU receipt-retention norms; customer self-service download removes Echo support tickets.                                                                                                                                                             |
| **Payment methods**                          | **Enable update** (add, remove, set default)                                                                                                         | Dunning recovery — primary CTA in every dunning email (per `dunning-policy-config.md`). 3DS-aware (Stripe handles).                                                                                                                                        |
| **Subscription cancellation**                | **Enable. Mode: _Immediately_ OR _At period end_ — set to _At period end_ (default)**                                                                | FTC §425.4 simple-cancel. No save-attempt prompts, no retention modal injected by Stripe. ✗ Do NOT enable "Cancellation reasons survey" — that is a friction step which conflicts with FTC §425.5(b) prohibited-friction reading.                          |
| **Subscription updates (upgrade/downgrade)** | **Enable.** Allow proration: **Yes** (Stripe-default proration credits applied at next invoice).                                                     | Customer-managed plan changes; D22 upgrade triggers cooling-off reset in our webhook handler. Stripe shows proration preview in the Portal UI — sufficient transparency.                                                                                   |
| **Subscription pause**                       | **DISABLED**                                                                                                                                         | Not in PRD scope; revisit V2. Disabling closes the "pause and forget to resume" support pattern.                                                                                                                                                           |
| **Promotion codes**                          | **Enable** in Portal                                                                                                                                 | Customers can apply codes Stripe-side; doesn't bypass Hook's experiment instrumentation (codes redeemed in Portal generate `customer.subscription.updated` webhook → our handler picks up the discount).                                                   |
| **Allowed plan switches**                    | **Whitelist:** every active Product in `stripe-products-provisioning.md` §1 EXCEPT `prod_studiozero_autopr_fix` (one-time, not a subscription tier). | Prevents customers from switching INTO Auto-PR (which is per-fix, not subscription); switching BYOK ↔ Managed is permitted.                                                                                                                               |
| **Customer deletion**                        | **DISABLED**                                                                                                                                         | Account deletion is handled by Studio Zero's S-DEL flow (GDPR Art. 17 path in `ia/user-flows/settings-and-account-management.md`), NOT by Stripe Portal. Stripe-side deletion only deletes the Stripe Customer record, leaving our `tenants` row orphaned. |

---

## 2. Branding

Apply in Stripe Dashboard → Settings → Branding (global; the Customer Portal inherits).

| Field                    | Value                                                                            | Source                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Business name**        | `Studio Zero`                                                                    | Comply trademark final; placeholder for now per stripe-config.md §1.3                     |
| **Public business name** | `Studio Zero`                                                                    | (same)                                                                                    |
| **Logo**                 | `brand/logo-square-512.png` (Echo asset)                                         | Apply at 512×512 PNG; Stripe scales                                                       |
| **Icon**                 | `brand/icon-32.png` (Echo asset)                                                 | Favicon-style                                                                             |
| **Primary brand color**  | `#0E2A47` (Studio Zero deep navy per `tokens/colors.json` `--brand-primary-900`) | Aligned with web app shell brand token; Echo owns palette                                 |
| **Accent color**         | `#FFB94B` (Studio Zero amber per `tokens/colors.json` `--brand-accent-500`)      | CTA color; used by Stripe for primary buttons in Portal                                   |
| **Header text color**    | `#0E2A47` on white                                                               | High contrast (AAA per Halo M6 audit)                                                     |
| **Public business URL**  | `https://studiozero.dev`                                                         | Marketing site                                                                            |
| **Support email**        | `support@studiozero.dev`                                                         | Echo owns; same as receipt support email per stripe-config.md §1.3                        |
| **Support phone**        | (none)                                                                           | Studio Zero is online-only; FTC same-medium read says phone path is OPTIONAL not required |

**Brand-voice note:** these tokens may not match every claudeMd cross-product reminder. Studio Zero uses navy + amber per `tokens/colors.json`; this is NOT the MotionMax aqua + gold palette. If Echo updates tokens before M2 go-live, re-sync the Stripe branding accordingly.

---

## 3. Custom copy (Herald-locked)

Stripe Customer Portal allows a small set of custom-copy slots. Herald owns the wording; do NOT paraphrase.

| Slot                                      | Copy (Herald-locked)                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Portal headline**                       | `Manage your Studio Zero subscription`                                                                                                                         |
| **Portal subheadline**                    | `Update your plan, payment method, or cancel — all here.`                                                                                                      |
| **Cancellation confirmation modal title** | `Cancel your Studio Zero subscription?`                                                                                                                        |
| **Cancellation confirmation modal body**  | `Your access continues through the end of your current billing period. Your past audits and findings stay available for export. You can re-subscribe anytime.` |
| **Cancellation success message**          | `Cancellation confirmed. We'll email you a receipt shortly.`                                                                                                   |
| **Plan switch confirmation modal title**  | `Confirm your plan change`                                                                                                                                     |
| **Plan switch confirmation modal body**   | `Prorated billing applies. Your next invoice will reflect the change. EU/UK customers: your 14-day cooling-off window resets with this upgrade.`               |

**Hard rule (Comply):** the cancellation modal must NOT include a save-attempt prompt, retention offer, downgrade-suggestion, or "are you sure" loop beyond a single confirm step. FTC §425.5(b) reads dark patterns aggressively.

---

## 4. URLs

| Field                                 | URL                                                       | Notes                                                           |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| **Privacy policy URL**                | `https://studiozero.dev/privacy`                          | Comply M1 Batch 3 deliverable; live                             |
| **Terms of service URL**              | `https://studiozero.dev/terms`                            | Comply M1 Batch 3 deliverable; live                             |
| **Return URL (after Portal session)** | `https://studiozero.dev/app/settings/billing`             | Customer lands back in Studio Zero billing settings (Vega owns) |
| **Cancellation return URL**           | `https://studiozero.dev/app/settings/billing?cancelled=1` | Triggers Vega's confirmation banner                             |

**Return URL session-binding:** Forge mints each Portal session server-side with `return_url` set per request; the configuration-level `default_return_url` above is the fallback if no per-session override is passed.

---

## 5. Provisioning procedure

### 5.1 Via Dashboard (recommended for first setup)

1. Stripe Dashboard → **Settings → Billing → Customer portal**.
2. Click **Configure**.
3. Apply every toggle in §1.
4. Apply branding in §2 (global Branding settings).
5. Apply custom copy in §3 (each slot in the Portal Configuration UI).
6. Apply URLs in §4.
7. **Save**. Stripe assigns a `bpc_*` configuration ID.
8. Retrieve the configuration ID via Stripe CLI:
   ```
   stripe billing_portal configurations list --limit 1
   ```
9. Paste into Vercel env as `STRIPE_PORTAL_CONFIGURATION_ID`.

### 5.2 Via API (for repeatable infra provisioning — Terra owns at M3)

```ts
// Reference implementation; Terra wires into IaC at M3
await stripe.billingPortal.configurations.create({
  business_profile: {
    headline: "Manage your Studio Zero subscription",
    privacy_policy_url: "https://studiozero.dev/privacy",
    terms_of_service_url: "https://studiozero.dev/terms",
  },
  default_return_url: "https://studiozero.dev/app/settings/billing",
  features: {
    customer_update: {
      enabled: true,
      allowed_updates: ["email", "name", "phone", "address", "tax_id"],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end",
      cancellation_reason: { enabled: false }, // No save-attempt friction
      proration_behavior: "create_prorations",
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price", "promotion_code"],
      proration_behavior: "create_prorations",
      products: [
        // Populate with prod_* IDs from stripe-products-provisioning.md §3
        {
          product: process.env.STRIPE_PROD_BYOK_STARTER!,
          prices: [
            /* ... */
          ],
        },
        {
          product: process.env.STRIPE_PROD_BYOK_PRO!,
          prices: [
            /* ... */
          ],
        },
        {
          product: process.env.STRIPE_PROD_MANAGED_STARTER!,
          prices: [
            /* ... */
          ],
        },
        {
          product: process.env.STRIPE_PROD_MANAGED_PRO!,
          prices: [
            /* ... */
          ],
        },
        {
          product: process.env.STRIPE_PROD_CLI!,
          prices: [
            /* ... */
          ],
        },
      ],
    },
    subscription_pause: { enabled: false },
    promotion_code: { enabled: true },
  },
});
```

---

## 6. Portal session minting (Forge contract)

Per `finance/stripe-config.md` §1.5 — Forge's `/api/billing/portal-session` route:

```ts
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${baseUrl}/app/settings/billing`,
  configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
});
return Response.json({ portal_url: session.url });
```

**Session TTL:** 1 hour (Stripe default; not configurable). Expired links route the user back to Studio Zero login → re-auth → fresh portal session (recovery loop is intentional per dunning-policy §5.4).

---

## 7. Verification — exit gate

Manual smoke (Test mode):

- [ ] Log in to Test-mode Studio Zero → Settings → Billing → **Manage subscription** button → expect redirect to `https://billing.stripe.com/p/session/test_...`
- [ ] Portal page header matches §3 copy verbatim
- [ ] Branding (colors, logo) matches §2
- [ ] Cancel subscription flow: **2 clicks max** (Cancel → Confirm) — measures FTC §425.4 compliance
- [ ] After cancel: redirect to `/app/settings/billing?cancelled=1` per §4
- [ ] Confirmation email received from Stripe within 60 seconds (FTC §425.4(b)) AND from Studio Zero via Herald-managed pipeline within 60 seconds (per refund-matrix.md §4.4)
- [ ] Plan switch BYOK Starter → BYOK Pro: prorated invoice preview shown; cooling-off banner copy renders if region∈{eu,uk}
- [ ] Invoice history: at least one downloadable PDF

Automated (Verify, M2):

- `tests/acceptance/e2e/customer-portal-click-to-cancel.spec.ts` — asserts ≤3-click cancel + 60s confirmation email per Vega's B-CAN flow

---

## 8. Stripe configuration drift detection

Per Watch's `compliance/audit-trail.md` quarterly audit: every quarter, run:

```
stripe billing_portal configurations retrieve <bpc_id> > current.json
diff <(jq -S . current.json) <(jq -S . spec.json)
```

Where `spec.json` is a sync'd snapshot of this document's §5.2 API payload. Drift → Comply pages.

---

## 9. Open follow-ups

- **EU/UK regional cancel copy** — when Locale opens EU/UK, the cancellation success message needs EU/UK variant per `refund-matrix.md` §8.6. Stripe Portal supports per-region copy via the Configuration API but Dashboard UI is single-region; Terra wires region-aware Portal configurations at first EU customer.
- **Multi-language Portal** — Stripe Portal supports localization; defer to V1.5 when Locale ships beyond en-US.
- **Branding token drift** — if Echo updates `tokens/colors.json`, re-sync §2 colors at next deploy.

---

_Owner: Ledger · M2 Batch 2 · Operational; ready for Jo to apply._
