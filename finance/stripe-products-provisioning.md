# Stripe Products Provisioning Runbook — Studio Zero

**Owner:** Ledger
**Status:** M2 Batch 2 — operationally executable. Jo follows line-by-line in Stripe Dashboard (or via Stripe CLI / API) to provision live products before M2 go-live.
**Spec source:** `finance/stripe-config.md` §2 (canonical naming + metadata); `finance/pricing.md` §2 (prices).
**Code consumers:**

- `apps/web/app/api/billing/checkout-session/route.ts` — reads `STRIPE_PRICE_*` env vars via `priceEnvVarName(tier, period)` (line 112).
- `apps/web/app/api/webhooks/stripe/route.ts` — reads `product.metadata.tier`, `plan_family` via `planFromProductMetadata` (line 112) + `resolvePlanFromSubscription` (line 408).
- Verify: `tests/integration/stripe-products-naming.spec.ts` (M2 gate — asserts naming convention).

**Operator:** Jo (Stripe account holder). Estimated time: 90 min for first pass (Test mode); 45 min for Live-mode mirror.

---

## 0. Pre-flight checklist

Before touching Stripe Dashboard:

- [ ] **Stripe account created** under Jo's legal entity (per `finance/stripe-config.md` §1.3 — PLACEHOLDER pending Comply trademark resolution; OK to provision in Test mode without resolution).
- [ ] **Stripe Tax enabled** in Test mode (Settings → Tax — see `finance/stripe-tax-config.md`).
- [ ] **Statement descriptor** set to `STUDIO ZERO` (max 22 chars; Settings → Public details).
- [ ] **Support email on receipts** set to `support@studiozero.dev` (Settings → Branding).
- [ ] **Restricted API keys provisioned** per `finance/stripe-config.md` §1.2 (four roles: `rk_*_webapp`, `rk_*_webhook`, `rk_*_reconcile`, `rk_*_dunning_ops`).
- [ ] **Vercel env vars staged** but not yet set (placeholders below).
- [ ] **Test mode first.** Provision ALL products in Test mode → run Verify integration suite green → mirror to Live mode last.

---

## 1. Product + price provisioning table

Provision each row below as a **separate Stripe Product**, then add the listed Prices as children. Stripe assigns the actual `prod_*` and `price_*` IDs at creation — record them in §3 below for the env-var fill-in.

> **Hard rule (Ledger):** Stripe-assigned IDs are immutable. If you mis-create, **archive** (do not delete) and create fresh. The env var pulls the current ID; archived products with the wrong metadata still get logged via webhooks but no longer dispatch.

### 1.1 BYOK Starter

| Field                                          | Value                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Product name**                               | `Studio Zero BYOK Starter`                                                                          |
| **Internal product ID label**                  | `prod_studiozero_byok_starter` (Ledger naming; Stripe assigns the real `prod_*`)                    |
| **Description**                                | `Studio Zero BYOK Starter — 2 audits/month, specs-only fixes. Customer-supplied Anthropic API key.` |
| **Statement descriptor suffix**                | `BYOK STARTER` (max 10 chars after the `STUDIO ZERO* ` prefix)                                      |
| **Tax code**                                   | `txcd_10103001` (Software as a Service — SaaS, generic)                                             |
| **Stripe Climate contribution**                | 0% (off by default; revisit V2)                                                                     |
| **Metadata** (exact keys — Forge reads these): |                                                                                                     |
| `tier`                                         | `byok_starter`                                                                                      |
| `plan_family`                                  | `byok`                                                                                              |
| `audit_count_cap`                              | `2`                                                                                                 |
| `mode_allowed`                                 | `byok,cli`                                                                                          |
| `auto_pr_enabled`                              | `false`                                                                                             |
| `region_eligible`                              | `all`                                                                                               |

**Prices to create under this product:**

| Stripe Price label (Ledger naming)      | Amount      | Currency | Period            | `tax_behavior` | Env var (production)                           |
| --------------------------------------- | ----------- | -------- | ----------------- | -------------- | ---------------------------------------------- |
| `price_byok_starter_usd_monthly`        | **$29.00**  | USD      | monthly recurring | `exclusive`    | `STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY`        |
| `price_byok_starter_usd_monthly_v19_ab` | **$19.00**  | USD      | monthly recurring | `exclusive`    | `STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY_V19_AB` |
| `price_byok_starter_usd_annual`         | **$290.00** | USD      | yearly recurring  | `exclusive`    | `STRIPE_PRICE_BYOK_STARTER_USD_ANNUAL`         |
| `price_byok_starter_usd_annual_v19_ab`  | **$190.00** | USD      | yearly recurring  | `exclusive`    | `STRIPE_PRICE_BYOK_STARTER_USD_ANNUAL_V19_AB`  |

**Price-level metadata** (on each Price object, in addition to product-level):

- `ab_slot` = `v29` on $29 / $290 prices; `v29` is the default
- `ab_slot` = `v19` on $19 / $190 prices; A/B variant for first 200 signups per Penny §3

### 1.2 BYOK Pro

| Field                           | Value                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Product name**                | `Studio Zero BYOK Pro`                                                                                            |
| **Description**                 | `Studio Zero BYOK Pro — unlimited audits, specs-only fixes, priority queue. Customer-supplied Anthropic API key.` |
| **Statement descriptor suffix** | `BYOK PRO`                                                                                                        |
| **Tax code**                    | `txcd_10103001`                                                                                                   |
| **Metadata:**                   |                                                                                                                   |
| `tier`                          | `byok_pro`                                                                                                        |
| `plan_family`                   | `byok`                                                                                                            |
| `audit_count_cap`               | `unlimited`                                                                                                       |
| `mode_allowed`                  | `byok,cli`                                                                                                        |
| `auto_pr_enabled`               | `false`                                                                                                           |
| `region_eligible`               | `all`                                                                                                             |

| Stripe Price label           | Amount      | Currency | Period  | Env var                             |
| ---------------------------- | ----------- | -------- | ------- | ----------------------------------- |
| `price_byok_pro_usd_monthly` | **$79.00**  | USD      | monthly | `STRIPE_PRICE_BYOK_PRO_USD_MONTHLY` |
| `price_byok_pro_usd_annual`  | **$790.00** | USD      | yearly  | `STRIPE_PRICE_BYOK_PRO_USD_ANNUAL`  |

### 1.3 Managed Starter

| Field                           | Value                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| **Product name**                | `Studio Zero Managed Starter`                                                           |
| **Description**                 | `Studio Zero Managed Starter — 2 Full audits/month, tokens included, specs-only fixes.` |
| **Statement descriptor suffix** | `MGD STARTER`                                                                           |
| **Tax code**                    | `txcd_10103001`                                                                         |
| **Metadata:**                   |                                                                                         |
| `tier`                          | `managed_starter`                                                                       |
| `plan_family`                   | `managed`                                                                               |
| `audit_count_cap`               | `2`                                                                                     |
| `mode_allowed`                  | `managed`                                                                               |
| `auto_pr_enabled`               | `false`                                                                                 |
| `region_eligible`               | `all`                                                                                   |

| Stripe Price label                  | Amount      | Currency | Period  | Env var                                    |
| ----------------------------------- | ----------- | -------- | ------- | ------------------------------------------ |
| `price_managed_starter_usd_monthly` | **$99.00**  | USD      | monthly | `STRIPE_PRICE_MANAGED_STARTER_USD_MONTHLY` |
| `price_managed_starter_usd_annual`  | **$990.00** | USD      | yearly  | `STRIPE_PRICE_MANAGED_STARTER_USD_ANNUAL`  |

### 1.4 Managed Pro

| Field                           | Value                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Product name**                | `Studio Zero Managed Pro`                                                                        |
| **Description**                 | `Studio Zero Managed Pro — unlimited Full audits, tokens included, Auto-PR fix delivery (V1.5).` |
| **Statement descriptor suffix** | `MGD PRO`                                                                                        |
| **Tax code**                    | `txcd_10103001`                                                                                  |
| **Metadata:**                   |                                                                                                  |
| `tier`                          | `managed_pro`                                                                                    |
| `plan_family`                   | `managed`                                                                                        |
| `audit_count_cap`               | `unlimited`                                                                                      |
| `mode_allowed`                  | `managed`                                                                                        |
| `auto_pr_enabled`               | `true`                                                                                           |
| `region_eligible`               | `all`                                                                                            |

| Stripe Price label              | Amount       | Currency | Period  | Env var                                |
| ------------------------------- | ------------ | -------- | ------- | -------------------------------------- |
| `price_managed_pro_usd_monthly` | **$249.00**  | USD      | monthly | `STRIPE_PRICE_MANAGED_PRO_USD_MONTHLY` |
| `price_managed_pro_usd_annual`  | **$2490.00** | USD      | yearly  | `STRIPE_PRICE_MANAGED_PRO_USD_ANNUAL`  |

### 1.5 CLI mode

| Field                           | Value                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Product name**                | `Studio Zero CLI`                                                                              |
| **Description**                 | `Studio Zero CLI — privacy-mode platform fee. Audits run on your machine; results stay local.` |
| **Statement descriptor suffix** | `CLI`                                                                                          |
| **Tax code**                    | `txcd_10103001`                                                                                |
| **Metadata:**                   |                                                                                                |
| `tier`                          | `cli`                                                                                          |
| `plan_family`                   | `cli`                                                                                          |
| `audit_count_cap`               | `unlimited`                                                                                    |
| `mode_allowed`                  | `byok,cli`                                                                                     |
| `auto_pr_enabled`               | `false`                                                                                        |
| `region_eligible`               | `all`                                                                                          |

| Stripe Price label      | Amount      | Currency | Period  | Env var                        |
| ----------------------- | ----------- | -------- | ------- | ------------------------------ |
| `price_cli_usd_monthly` | **$19.00**  | USD      | monthly | `STRIPE_PRICE_CLI_USD_MONTHLY` |
| `price_cli_usd_annual`  | **$190.00** | USD      | yearly  | `STRIPE_PRICE_CLI_USD_ANNUAL`  |

### 1.6 Auto-PR fix bundle (V1.5 — one-time charge)

| Field                           | Value                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Product name**                | `Studio Zero Auto-PR Fix`                                                                             |
| **Description**                 | `Studio Zero Auto-PR — one fix bundle. Build agents propose fixes; Jury re-audits; PR opens on PASS.` |
| **Statement descriptor suffix** | `AUTO-PR`                                                                                             |
| **Tax code**                    | `txcd_10103001`                                                                                       |
| **Metadata:**                   |                                                                                                       |
| `tier`                          | `addon`                                                                                               |
| `plan_family`                   | `addon`                                                                                               |
| `audit_count_cap`               | `0`                                                                                                   |
| `mode_allowed`                  | `byok`                                                                                                |
| `auto_pr_enabled`               | `true`                                                                                                |
| `region_eligible`               | `all`                                                                                                 |

| Stripe Price label            | Amount     | Currency | Period                       | Env var                              |
| ----------------------------- | ---------- | -------- | ---------------------------- | ------------------------------------ |
| `price_autopr_fix_usd_oneoff` | **$49.00** | USD      | **one-time** (not recurring) | `STRIPE_PRICE_AUTOPR_FIX_USD_ONEOFF` |

**D5 tiered alternative** (only provision if Jo's V1.5 spec-kickoff lands tiered; otherwise leave un-created):

| Stripe Price label              | Amount | Currency | Period   | Env var                                |
| ------------------------------- | ------ | -------- | -------- | -------------------------------------- |
| `price_autopr_fix_s_usd_oneoff` | $15.00 | USD      | one-time | `STRIPE_PRICE_AUTOPR_FIX_S_USD_ONEOFF` |
| `price_autopr_fix_m_usd_oneoff` | $49.00 | USD      | one-time | `STRIPE_PRICE_AUTOPR_FIX_M_USD_ONEOFF` |
| `price_autopr_fix_l_usd_oneoff` | $99.00 | USD      | one-time | `STRIPE_PRICE_AUTOPR_FIX_L_USD_ONEOFF` |

---

## 2. Step-by-step Dashboard procedure (per product)

For **each** product in §1, in **Test mode first**:

1. **Stripe Dashboard → Products → + Add product.**
2. **Name:** copy verbatim from §1 table.
3. **Description:** copy verbatim from §1 table.
4. **Image:** upload Studio Zero square logo (Echo asset; `brand/logo-square-512.png`).
5. **Statement descriptor suffix:** copy from §1 table.
6. **Tax behavior:** Inclusive of tax? **NO** (we use `tax_behavior: 'exclusive'` per stripe-config.md §1.4).
7. **Tax code:** `txcd_10103001` (SaaS — generic).
8. **Metadata:** add every key-value pair from the §1 metadata block. **Keys are case-sensitive. Values are strings even when they look numeric.** Forge's code at `apps/web/app/api/webhooks/stripe/route.ts:112` whitelists `tier` against the exact strings `byok_starter|byok_pro|managed_starter|managed_pro|cli|free` — a typo will silently map to `null` and the subscription defaults to `'free'` in the DB (see line 496 of that file).
9. **Save product.** Record the Stripe-assigned `prod_*` ID in §3 below.
10. **Within the product → + Add price** for each Price row.
    - **Pricing model:** Standard pricing.
    - **Price:** copy from §1 (USD, exact cents).
    - **Billing period:** Monthly OR Yearly OR One time (per row).
    - **Usage:** Licensed (not metered — Studio Zero is seat-equivalent flat pricing).
    - **Include tax in price:** **No** (Stripe Tax adds on top).
    - **Add metadata** if specified (e.g., `ab_slot` on BYOK Starter prices).
11. **Save price.** Record the Stripe-assigned `price_*` ID in §3.
12. Repeat for every Price under that Product.

---

## 3. Env-var fill-in template (copy into Vercel)

After §2 is complete, paste the Stripe-assigned IDs into Vercel's env settings (Production, Preview, Development scopes). Forge's checkout-session route resolves these dynamically — **do not hard-code in app code**.

```
# === Stripe core (Test → swap for Live at go-live) ===
STRIPE_SECRET_KEY=                  # rk_test_webapp restricted key (Test); rk_live_webapp at go-live
STRIPE_PUBLISHABLE_KEY=             # pk_test_*
STRIPE_WEBHOOK_SECRET=              # whsec_* — register endpoint per §4 below first
STRIPE_API_VERSION=2024-09-30.acacia

# === Price IDs — BYOK Starter ===
STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY=price_______________________
STRIPE_PRICE_BYOK_STARTER_USD_MONTHLY_V19_AB=price_______________________
STRIPE_PRICE_BYOK_STARTER_USD_ANNUAL=price_______________________
STRIPE_PRICE_BYOK_STARTER_USD_ANNUAL_V19_AB=price_______________________

# === Price IDs — BYOK Pro ===
STRIPE_PRICE_BYOK_PRO_USD_MONTHLY=price_______________________
STRIPE_PRICE_BYOK_PRO_USD_ANNUAL=price_______________________

# === Price IDs — Managed Starter ===
STRIPE_PRICE_MANAGED_STARTER_USD_MONTHLY=price_______________________
STRIPE_PRICE_MANAGED_STARTER_USD_ANNUAL=price_______________________

# === Price IDs — Managed Pro ===
STRIPE_PRICE_MANAGED_PRO_USD_MONTHLY=price_______________________
STRIPE_PRICE_MANAGED_PRO_USD_ANNUAL=price_______________________

# === Price IDs — CLI ===
STRIPE_PRICE_CLI_USD_MONTHLY=price_______________________
STRIPE_PRICE_CLI_USD_ANNUAL=price_______________________

# === Price IDs — Auto-PR (V1.5) ===
STRIPE_PRICE_AUTOPR_FIX_USD_ONEOFF=price_______________________
# Tiered S/M/L (only if D5 lands tiered)
# STRIPE_PRICE_AUTOPR_FIX_S_USD_ONEOFF=
# STRIPE_PRICE_AUTOPR_FIX_M_USD_ONEOFF=
# STRIPE_PRICE_AUTOPR_FIX_L_USD_ONEOFF=

# === Customer Portal configuration ID (per stripe-customer-portal-config.md) ===
STRIPE_PORTAL_CONFIGURATION_ID=bpc_______________________
```

**Vercel env-var scopes:**

- **Production:** Live-mode keys + Live `price_*` IDs only.
- **Preview:** Test-mode keys + Test `price_*` IDs.
- **Development:** Test-mode keys + Test `price_*` IDs (Verify tests run in Preview against Test mode).

---

## 4. Webhook endpoint registration

Per `finance/stripe-config.md` §3.1 — the production webhook is a **Supabase Edge Function** at `https://<project>.supabase.co/functions/v1/stripe-webhook`. **BUT Forge's M2 Batch 1 code (`apps/web/app/api/webhooks/stripe/route.ts`) is also live as the Vercel Node-runtime fallback.** Until Cipher migrates handler to Supabase Edge Function (M3), register **both endpoints** in Stripe Dashboard and let `STRIPE_WEBHOOK_SECRET` rotate per endpoint.

**Endpoint 1 (M2 primary — Vercel Node):**

- URL: `https://<vercel-domain>/api/webhooks/stripe`
- Description: "M2 primary — Vercel Node runtime"
- Events to listen for (per `finance/stripe-config.md` §3.4 — register ONLY these):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `payment_intent.succeeded` (V1.5 wiring — register at M2 so the corpus tests can fire)
  - `payment_intent.payment_failed` (V1.5)
  - `charge.dispute.created`
  - `charge.dispute.closed`
  - `radar.early_fraud_warning.created`
  - `customer.subscription.paused` (defensive; Stripe may emit even though we don't allow pause)
- Copy the `whsec_*` secret → paste into `STRIPE_WEBHOOK_SECRET` env.
- **Test:** Stripe Dashboard → Send test event → `checkout.session.completed` → expect 200 OK from Vercel within 3s.

**Endpoint 2 (M3 migration target — Supabase Edge Function):**

- Defer until Cipher M3 deliverable lands.
- Same event subscription list.

---

## 5. Customer Portal configuration

Provisioned via Stripe Dashboard OR Stripe API. **Use Stripe Dashboard for first pass; record `bpc_*` ID into `STRIPE_PORTAL_CONFIGURATION_ID` env.**

Full spec at `finance/stripe-customer-portal-config.md`. Summary:

1. **Stripe Dashboard → Settings → Billing → Customer portal.**
2. Apply the toggles + branding + URLs per `stripe-customer-portal-config.md` §1-§4.
3. Save → record the configuration ID (Stripe doesn't expose `bpc_*` in the UI by default; retrieve via API: `stripe billing_portal configurations list --limit 1`).
4. Paste into Vercel env as `STRIPE_PORTAL_CONFIGURATION_ID`.

---

## 6. Stripe Tax setup (summary; full spec at `stripe-tax-config.md`)

1. Settings → Tax → **Enable Stripe Tax**.
2. Add origin address (Jo's legal entity address — placeholder; finalize at Comply trademark resolution).
3. Tax registrations:
   - **US:** Stripe Tax monitors nexus per state — enable **monitoring mode** at M2; flip to **collection mode** per state once Stripe surfaces threshold-crossed alert (typically $100k or 200 transactions per state per CA AB 147 + Wayfair). At MVP volume we hit zero state thresholds.
   - **EU:** register OSS (One-Stop Shop) for VAT once first EU customer signals. Stripe Tax handles registration via partner network. Defer to first EU customer.
   - **UK:** register UK VAT when £85k threshold approached. Defer.
4. Tax IDs: enable B2B VAT collection on Checkout (already done in checkout-session/route.ts: `tax_id_collection: { enabled: true }`).

---

## 7. Stripe Climate (optional, default OFF)

Per stripe-config.md §1 not explicitly addressed; Ledger's stance: **0% contribution by default for MVP**. Climate is a 1-2% margin tax; revisit at V2 when Penny's unit-economics confirms margin headroom. To enable later: Settings → Climate → Enable → set percentage. No code change required.

---

## 8. Verification — exit gate before go-live

After §1–§6 in **Test mode**, run:

```
pnpm --filter @studiozero/web test:integration stripe
```

Expected green:

- `tests/integration/stripe-products-naming.spec.ts` — asserts every metadata key + value per §1 above
- `tests/integration/stripe-checkout-and-webhook.spec.ts` — end-to-end Checkout → webhook → DB
- `tests/integration/stripe-reconcile-race.spec.ts` — bounded-polling reconcile per ARCH-D4
- `tests/integration/stripe-webhook-replay-stale.spec.ts` — replay-window enforcement

If green → mirror §1–§6 in **Live mode**. Use Stripe CLI:

```
# In Test mode, list products with metadata for diff against the runbook
stripe products list --limit 100 -d active=true \
  | jq '.data[] | {id, name, metadata}'

# In Live mode, repeat AFTER provisioning
stripe products list --live --limit 100 \
  | jq '.data[] | {id, name, metadata}'
```

Diff Test vs Live — they MUST be identical except for `prod_*` / `price_*` IDs.

---

## 9. Post-provisioning — Vercel deploy

1. `vercel env pull .env.production.local` to verify env vars set.
2. Confirm `STRIPE_SECRET_KEY` is the **restricted** key (starts with `rk_live_`, NOT `sk_live_`) per stripe-config.md §1.2.
3. Deploy: `vercel deploy --prod`.
4. Hit `/api/webhooks/stripe` from Stripe Dashboard "Send test webhook" → expect 200 with `received: true, duplicate: false` (first call) → 200 with `duplicate: true` on retry.
5. Manually run one Test-mode checkout via `/pricing` → confirm subscription row lands in `subscriptions` table with correct `plan`.

---

## 10. Rollback

If a product mis-provisions:

1. **Do not delete** — Stripe forbids deletion of products with charges/subscriptions and silently no-ops the API delete on others; deleting orphans the metadata our webhooks rely on.
2. **Archive the product** (Stripe Dashboard → product → Archive). Existing subscriptions continue to renew; no new checkouts can use it.
3. Provision a fresh product with corrected metadata; update the `STRIPE_PRICE_*` env var to the new Price ID; redeploy.

---

## 11. Open follow-ups

- **EUR / GBP Price objects** — add when Locale opens EU/UK. Add `STRIPE_PRICE_*_EUR_MONTHLY` env-var slots alongside USD; `priceEnvVarName()` in Forge route needs a `currency` parameter at that time (V1.5 follow-up).
- **Statement descriptor finalization** — `STUDIO ZERO` placeholder pending Comply trademark resolution.
- **Tax registrations** — flip from monitoring to collection per `stripe-tax-config.md` per-state schedule.

---

_Owner: Ledger · M2 Batch 2 · Operational; ready for Jo to execute._
