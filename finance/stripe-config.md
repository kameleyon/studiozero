# Stripe Configuration — Studio Zero

**Owner:** Ledger
**Status:** Phase 7 deliverable; Forge implements at M2 (exit gate: `tests/integration/stripe-checkout-and-webhook.spec.ts` + `tests/integration/stripe-reconcile-race.spec.ts` green).
**Coordinates with:** Penny (PRD §12 pricing, `finance/pricing.md` pending), Comply (regional refund matrix D20, Dispute Finding path), Forge (impl), Atlas (`subscriptions`, `billing_events`, `cooling_off_windows`, `disputes` migrations).
**Cross-refs:** PRD §12, §14.5, §17 D4/D5/#17/#20/D22/D23; `architecture/system-diagram.md` TB-8 + §3b + C4; `architecture/decisions.md` ARCH-D4; `architecture/database/tables.sql` lines 498–601; `ia/user-flows/billing-and-cancel.md`; `sprint/milestone-M2.md`; `sprint/milestone-V1-5.md`.

**Ledger's first principle:** every charge is idempotent, every webhook is signature-verified before any DB write, every state transition is replay-safe. "We'll add idempotency later" is not an entry in the dictionary. The Stripe `event.id` UNIQUE constraint on `billing_events` is the spine of this entire document — every section below either feeds it or relies on it.

---

## 1. Stripe account setup

### 1.1 Modes + key inventory

| Mode | Purpose | Secret keys (env-only — never code-pinned) | Restricted key scope |
|---|---|---|---|
| **Live** | Production charges | `STRIPE_SECRET_KEY` (restricted, see §1.2), `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | per §1.2 |
| **Test** | M2 dev + Verify integration tests + Crash chaos tests | `STRIPE_SECRET_KEY_TEST`, `STRIPE_PUBLISHABLE_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_TEST` | identical scope to Live |

**Vercel env config** (Terra owns IaC; `architecture/iac/stripe-webhook.md`): test keys in Preview + Development envs; live keys in Production env only. Three-environment isolation prevents Verify test runs from touching real money.

**Rotation:** every 90 days (Cipher key-rotation cadence at `compliance/key-rotation.md`). Quarterly calendar reminder live since M2. On rotation: provision new key, deploy with both old + new accepted by webhook handler for 24 h grace, revoke old.

**Logging redaction:** Sentry `beforeSend` PII scrub (PRD §13.6) explicitly redacts any field matching `/sk_live_|whsec_|rk_live_/`. Pino logger has the same redaction filter on path `*.stripe.*`. Verify owns the test that asserts no Stripe secret ever lands in a log line.

### 1.2 Restricted keys (least-privilege)

Studio Zero NEVER uses an unrestricted Stripe secret key. We provision **one restricted key per logical actor**:

| Key role | Permissions (read / write) | Used by |
|---|---|---|
| `rk_live_webapp` | Customers: w · Checkout Sessions: w · Subscriptions: w · Invoices: r · PaymentIntents: w · Refunds: w · Customer Portal Sessions: w · Tax Calculations: r · Disputes: r | Web app server routes (Vercel) |
| `rk_live_webhook` | Webhook Endpoints: r (for signature secret retrieval, only) — **none of the above mutation scopes** | Edge Function webhook handler |
| `rk_live_reconcile` | Checkout Sessions: r · Subscriptions: r · PaymentIntents: r | `/api/billing/reconcile` (ARCH-D4) |
| `rk_live_dunning_ops` | Customers: r · Subscriptions: w (status updates only) · Refunds: w | Internal ops dashboard (post-MVP) |

Rationale: if `rk_live_reconcile` is compromised, the attacker can read session state but cannot create charges or issue refunds. Blast-radius reduction per Shield's threat model.

### 1.3 Account holder + legal entity

- **Account holder:** Jo's legal entity — **PLACEHOLDER pending Comply trademark + legal entity decisions** (Comply v0.5 still-open).
- **Statement descriptor:** `STUDIO ZERO` (max 22 chars; Comply locks final wording with trademark resolution).
- **Support email on receipts:** `support@studiozero.dev` (Echo owns).

### 1.4 Stripe Tax

**Stripe Tax enabled — auto-collection ON for:**
- All US states (Stripe Tax handles state-by-state nexus thresholds; we hit auto-collection thresholds gradually)
- EU VAT (all 27 member states + UK VAT)
- Other jurisdictions: enabled at first customer per region (Penny + Comply approve before flip)

**Tax behavior on every Price object (§2):** `tax_behavior: 'exclusive'` (tax added on top of displayed price). PRD §12 prices are **net of tax**; Stripe Tax adds VAT/sales tax at checkout. Pricing page (Vega HC7) shows "Tax calculated at checkout."

**Tax IDs:** customer can supply VAT ID at Checkout (B2B reverse-charge); Stripe Tax validates via VIES.

**Receipts:** Stripe-generated tax-compliant invoices include VAT/sales-tax line items; archived in `billing_events.payload` and customer-downloadable from Customer Portal.

### 1.5 Customer Portal

**Enabled** for subscription management — this is the M2 R20 mitigation (FTC Click-to-Cancel 16 CFR 425: cancel in same channel as signup).

**Portal configuration:**
- ✓ Update payment method (3DS-aware)
- ✓ View invoice history (matches `billing_events` ledger)
- ✓ Cancel subscription (one-click; emits `customer.subscription.deleted` webhook → our handler runs region-aware refund logic per §6 + §8)
- ✓ Switch plan (proration preview shown by Stripe)
- ✗ Pause subscription (DISABLED — not in PRD scope; revisit V2)
- ✗ Delete account (NOT a Stripe Portal concern — handled by S-DEL flow per GDPR Art. 17)

**Portal sessions:** server-minted via `rk_live_webapp` key, short-lived (`return_url` set, expires at default 1 h). Customer Portal link is the "Manage subscription" button in B0.

### 1.6 Stripe Checkout (hosted)

**Hosted Checkout** is the default per Halo HC6 (SC 2.1.2 No Keyboard Trap — Stripe owns the a11y compliance of the embed; we don't take on that test burden ourselves).

**Stripe Elements** is opt-in only for power users (PRD §14.6 HC6 carve-out); MVP ships hosted Checkout only.

**Checkout configuration per session:**
- `mode: 'subscription'` for plan signups; `mode: 'payment'` for V1.5 Auto-PR one-time bundles
- `payment_method_types: ['card']` MVP; SEPA / Bacs added when EU/UK customer volume justifies
- `customer_creation: 'always'` (we want `stripe_customer_id` populated for every paid signup, even before first charge)
- `automatic_tax: { enabled: true }`
- `tax_id_collection: { enabled: true }` (B2B VAT)
- `billing_address_collection: 'required'` (region detection per `ia/user-flows/billing-and-cancel.md` D20 spine)
- `consent_collection: { terms_of_service: 'required' }`
- `custom_fields`: D20 cooling-off waiver checkbox for EU/UK regions (rendered upstream on plan-picker page B-S; passed into Checkout as metadata, NOT as a `custom_field` since Stripe's custom_field a11y is weak — Halo HC6 rationale)
- `client_reference_id`: `<tenant_id>:<user_id>:<session_nonce>` — used by webhook handler to map back to our tenant graph; **nonce prevents session-ID guessing as an idempotency-key forgery vector**

**Session expiry:** 24 h default; covers the ARCH-D4 bounded-polling window plus customer-leaves-tab edge case. After expiry, customer must restart from B-S.

---

## 2. Products + prices

**Naming conventions** (locked by Ledger, must be enforced by Forge — Verify asserts via `tests/integration/stripe-products-naming.spec.ts`):

- **Product ID:** `prod_studiozero_<tier-slug>` — created in Stripe Dashboard or via Stripe API; ID is immutable
- **Price ID:** `price_<tier-slug>_<currency>_<billing-period>` — e.g. `price_byok_starter_usd_monthly`, `price_managed_pro_usd_annual`, `price_autopr_fix_usd_oneoff`
- **Currency:** USD primary; EUR + GBP Price objects added at first EU/UK customer demand signal (PRD §14.4 "EU residency added when first EU customer asks" — Penny + Locale gate)
- **Recurring:** monthly OR annual; annual = 10× monthly (= 2 months free, PRD §12)
- **Stripe Tax:** `tax_behavior: 'exclusive'` on every Price

**Metadata** stamped on every Stripe Product (NOT on Price — products are the SKU spine; prices are the currency/period variants). Forge MUST read these in the webhook handler to gate entitlements. **Documented here so Forge does not guess** (constraint per the brief):

| Metadata key | Type | Values | Read by |
|---|---|---|---|
| `tier` | string | `free`, `byok_starter`, `byok_pro`, `managed_starter`, `managed_pro`, `cli` (matches `plan_tier` enum, `tables.sql:51`) | webhook handler → `subscriptions.plan`; entitlement check on every run dispatch |
| `plan_family` | string | `byok`, `managed`, `cli`, `addon` | dashboard rendering; analytics segmentation |
| `audit_count_cap` | string (int or `unlimited`) | `2`, `unlimited` | per-tenant audit-quota enforcement (Forge + Meter) |
| `mode_allowed` | string (CSV) | `byok`, `byok,cli`, `managed` (matches `execution_mode` enum) | run-dispatch gating (Forge); mode-picker on `/onboarding` |
| `auto_pr_enabled` | string boolean | `"true"`, `"false"` | V1.5 Auto-PR upgrade-CTA visibility on verdict screen |
| `region_eligible` | string (CSV) | default `all`; can be `us_only` for tier-specific regional gates | Locale's regional-gating layer |

### 2.1 Tier enumeration

#### Free — internal-only (NO Stripe product)
- No Stripe Product. `tenants.plan = 'free'` (default); `subscriptions` row not created.
- Entitlements enforced by `tenants.plan` enum + RLS-bound `runs` quota check.
- Free-tier abuse prevention (PRD D2 / §12): email verification + IP rate-limit + customer-attested own-URL — owned by Forge; not Stripe-related.

#### BYOK Starter — `prod_studiozero_byok_starter`
- **Description:** "Studio Zero BYOK Starter — 2 audits/month, specs-only fixes. Customer-supplied Anthropic API key."
- **Prices:**
  - `price_byok_starter_usd_monthly` — **$29.00 USD/month** (default per PRD §12; D4 still open)
  - `price_byok_starter_usd_monthly_v19_ab` — **$19.00 USD/month** (A/B slot per D4 fallback; live for first 200 signups if Jo defers — M2 ticket-cut hard deadline week 7)
  - `price_byok_starter_usd_annual` — **$290.00 USD/year** (10× monthly; 2 months free)
  - `price_byok_starter_usd_annual_v19_ab` — **$190.00 USD/year** (A/B parallel)
- **Metadata:** `tier=byok_starter`, `plan_family=byok`, `audit_count_cap=2`, `mode_allowed=byok,cli`, `auto_pr_enabled=false`

**D4 Ledger position:** I do not need this decision resolved to ship — both Price objects can co-exist in Stripe with metadata `ab_slot=v29` or `ab_slot=v19`, and Hook's conversion measurement (M2 deliverable) reads from `billing_events.payload.amount_paid` not from a hard-coded price ID. If Jo defers past week 7, Sprint default ($29 + A/B slot) ships and `billing_events` instrumentation is identical. **Forge: do not hard-code price IDs in route handlers; read from `subscriptions.stripe_subscription_id` → Stripe.subscriptions.retrieve → `items.data[0].price.id`.**

#### BYOK Pro — `prod_studiozero_byok_pro`
- **Description:** "Studio Zero BYOK Pro — unlimited audits, specs-only fixes, priority queue."
- **Prices:**
  - `price_byok_pro_usd_monthly` — **$79.00 USD/month**
  - `price_byok_pro_usd_annual` — **$790.00 USD/year**
- **Metadata:** `tier=byok_pro`, `plan_family=byok`, `audit_count_cap=unlimited`, `mode_allowed=byok,cli`, `auto_pr_enabled=false`

#### Managed Starter — `prod_studiozero_managed_starter`
- **Description:** "Studio Zero Managed Starter — 2 Full audits/month, tokens included, specs-only fixes."
- **Prices:**
  - `price_managed_starter_usd_monthly` — **$99.00 USD/month**
  - `price_managed_starter_usd_annual` — **$990.00 USD/year**
- **Metadata:** `tier=managed_starter`, `plan_family=managed`, `audit_count_cap=2`, `mode_allowed=managed`, `auto_pr_enabled=false`

#### Managed Pro — `prod_studiozero_managed_pro`
- **Description:** "Studio Zero Managed Pro — unlimited Full audits, tokens included, Auto-PR fix delivery (V1.5)."
- **Prices:**
  - `price_managed_pro_usd_monthly` — **$249.00 USD/month**
  - `price_managed_pro_usd_annual` — **$2490.00 USD/year**
- **Metadata:** `tier=managed_pro`, `plan_family=managed`, `audit_count_cap=unlimited`, `mode_allowed=managed`, `auto_pr_enabled=true`

**V1.5 toggle:** at M2 ship time, `auto_pr_enabled=true` is metadata only — the V1.5 verdict-screen CTA reads this flag to decide whether to render the "Ship the fixes" button. The Auto-PR feature ships V1.5 (D3); flipping this metadata earlier than V1.5 launch is the kill-switch path if we need to revoke.

#### CLI — `prod_studiozero_cli`
- **Description:** "Studio Zero CLI — privacy-mode platform fee. Audits run on your machine; results stay local."
- **Prices:**
  - `price_cli_usd_monthly` — **$19.00 USD/month**
  - `price_cli_usd_annual` — **$190.00 USD/year**
- **Metadata:** `tier=cli`, `plan_family=cli`, `audit_count_cap=unlimited`, `mode_allowed=byok,cli`, `auto_pr_enabled=false`

**Note on CLI tier mode_allowed:** the customer can still run BYOK in the web app under a CLI subscription — it's a platform-fee tier, mode-flexible. Privacy posture is the customer's choice per run.

#### Auto-PR fix bundle — `prod_studiozero_autopr_fix` (V1.5 — separate product, one-time charge)
- **Description:** "Studio Zero Auto-PR — one fix bundle. Build agents propose fixes; Jury re-audits; PR opens on PASS."
- **Prices:**
  - `price_autopr_fix_usd_oneoff` — **$49.00 USD one-time** (D5 default per PRD §12)
  - D5 tiered alternative (if Jo's V1.5 spec-kickoff decision lands tiered): `price_autopr_fix_s_usd_oneoff` $15, `price_autopr_fix_m_usd_oneoff` $49, `price_autopr_fix_l_usd_oneoff` $99
- **Mode:** `mode: 'payment'` in Stripe Checkout (not `'subscription'`)
- **Metadata:** `tier=addon`, `plan_family=addon`, `audit_count_cap=0` (this charge is per-fix not per-audit), `mode_allowed=byok` (only BYOK tiers buy the upcharge; Managed Pro already includes it), `auto_pr_enabled=true`, `run_id` (Stripe metadata on the PaymentIntent only — links to `fix_pr_jobs.run_id` so we can match charge to fix-PR job)
- **Idempotency:** PaymentIntent `idempotency_key` = `autopr:<run_id>` — exact same charge cannot be created twice for the same run. (See §3.5 below.)

---

## 3. Webhook handler design

### 3.1 Deployment surface — **Supabase Edge Function** (NOT Vercel API route)

**Decision:** webhook handler at `POST /functions/v1/stripe-webhook` (Supabase Edge Function in Deno isolate). System-diagram.md §1 already places Stripe + GitHub webhooks on Edge Functions (line 55–56).

**Defense (cold-start vs latency tradeoff):**
- **Vercel API route (rejected):** cold-start p95 ~600 ms; webhook handler MUST respond within 3 s or Stripe retries. Cold-starts during retry storms = duplicated event processing (idempotency saves us, but it's noise). Vercel Edge Functions specifically would be OK on cold-start but the **co-location argument wins**: ARCH-D2 puts Edge Functions physically next to Postgres in us-east-1, so the atomic-write step (`billing_events` INSERT first, then process) is one network hop, not two. ARCH-D2 line 320 explicitly says "webhook handler not co-located with DB → atomic-write gap" as the rejection rationale for Vercel.
- **Supabase Edge Function (chosen):** Deno isolates have ~50 ms cold start; same-region Postgres write ~5 ms; budget headroom 2.9 s under the 3 s Stripe retry trigger. Webhook secret stored in Supabase Edge Function secrets store (not Vercel env) — narrower blast radius if Vercel build-env leaks.

**Public URL** registered with Stripe Webhook Endpoint: `https://<project>.supabase.co/functions/v1/stripe-webhook` — single endpoint receives all event types listed in §3.3.

### 3.2 Signature verification (THE first step — runs before any DB read)

```
function handle(req: Request) {
  const sig = req.headers.get('Stripe-Signature');
  if (!sig) return new Response('missing signature', { status: 400 });

  const body = await req.text();  // RAW body — never JSON.parse before verify
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // SIGNATURE FAIL. NEVER touch the DB. NEVER log the body.
    // Sentry capture with event_id redacted; on-call paged via Siren if rate
    // exceeds threshold (Watch monitors this).
    return new Response('signature verification failed', { status: 400 });
  }
  // Only past this line do we touch the DB.
  return process(event);
}
```

**Hard rule:** `stripe.webhooks.constructEvent` is the only acceptable verification path. Roll-your-own HMAC is forbidden (Stripe's library handles `Stripe-Signature` multi-secret parsing for key rotation grace windows; we get that for free).

**Replay-window enforcement:** Stripe library default tolerance 5 minutes — we keep the default. Older replays rejected at the signature step. Verify owns `tests/integration/stripe-webhook-replay-stale.spec.ts` (asserts events older than 5 min are rejected even with valid signature).

**Tests Verify owns at M2 (`sprint/milestone-M2.md` exit gate):**
- `tests/integration/stripe-checkout-and-webhook.spec.ts` — Stripe Checkout completes; webhook signature verified; subscription row created idempotently (replay produces no duplicates)
- `tests/integration/stripe-reconcile-race.spec.ts` — webhook + poller race write same row exactly once
- `runner/fixtures/stripe-webhook-corpus/` ≥15 patterns (signature-mismatch, replay, idempotency collision)
- Negative: forged signature, expired signature, missing signature, malformed signature, multi-secret rotation grace window

### 3.3 Idempotency strategy — INSERT-first, process-second

**The contract** (this is Ledger's red line):

```sql
-- billing_events.stripe_event_id is UNIQUE (tables.sql:590).
-- The UNIQUE constraint IS the idempotency mechanism. PRD M2 gate.

INSERT INTO billing_events (
  tenant_id, stripe_event_id, stripe_event_type, amount_cents, currency, payload
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (stripe_event_id) DO NOTHING
RETURNING id;
```

**Webhook handler algorithm:**

```
1. Verify signature (§3.2). On failure → 400, no DB touch.
2. Resolve tenant_id from event payload (subscription.metadata.tenant_id
   set at Checkout Session creation via client_reference_id).
3. INSERT billing_events ... ON CONFLICT DO NOTHING.
4. IF nothing was inserted (duplicate event_id):
     - Log "duplicate event ignored" at INFO with stripe_event_id.
     - Return 200 OK. NO further processing. (Idempotent no-op.)
5. ELSE (first time seeing this event):
     - Dispatch to event-specific handler (§3.4).
     - All side-effecting DB writes inside one transaction with the
       billing_events insert (BEGIN before step 3, COMMIT after handler).
     - On handler exception: ROLLBACK; return 500 so Stripe retries.
     - Stripe retry → step 1 again → step 3 succeeds (because rollback
       undid the billing_events insert) → handler runs again. Clean.
```

**Why this works:**
- `stripe_event_id` is globally unique across Stripe (Stripe contract).
- INSERT-with-ON-CONFLICT-DO-NOTHING is atomic; two webhook deliveries of the same event racing each other → exactly one INSERT wins, the other returns zero rows and the handler short-circuits to 200.
- Transaction scoping: if the side-effecting handler crashes mid-write, ROLLBACK removes the `billing_events` row → retry path is clean. **Never set a `billing_events` row to "processed" outside the transaction that performed the work.**
- "Processed-at" timestamp on `billing_events` (`processed_at`, tables.sql:597) is set inside the same transaction; it is the audit trail, not the gate.

**Anti-pattern Forge must avoid:** the dual-write trap. Do NOT process the side effect first (e.g., upgrade `subscriptions.plan`) and then write `billing_events` second. If we crash between the two writes, the second retry sees no `billing_events` row, processes again, and we double-upgrade. The INSERT MUST come first; the side effect MUST be transactionally bound to it.

### 3.4 Events handled (M2 + V1.5 enumeration)

For each event below: (a) the gate it satisfies, (b) DB writes within the transaction, (c) downstream effects (Herald email, Watch alert, etc.).

| Stripe event | Phase | Transaction writes | Downstream |
|---|---|---|---|
| `checkout.session.completed` | M2 | INSERT `billing_events`; UPSERT `subscriptions` (stub if subscription.created hasn't landed yet) keyed on `stripe_subscription_id`; INSERT `cooling_off_windows` row if region∈{eu,uk} per D22 trigger | Herald welcome-email queue; PostHog `subscription_started` event (consent-gated) |
| `customer.subscription.created` | M2 | INSERT `billing_events`; UPSERT `subscriptions` (idempotent with checkout.session.completed via UNIQUE `stripe_subscription_id`); set `status='trialing'` or `'active'` per Stripe payload | Herald welcome-email (deduped against checkout.session.completed Herald-side) |
| `customer.subscription.updated` | M2 | INSERT `billing_events`; UPDATE `subscriptions` — status transitions `trialing→active→past_due→canceled`, `cancel_at_period_end`, plan changes (= `items.data[0].price.product` lookup → `plan_tier` mapping via Product metadata `tier`), `current_period_start`/`end` | If plan upgrade AND region∈{eu,uk}: INSERT new `cooling_off_windows` row with `trigger_event='upgrade'` (D22 fresh-window rule). Herald upgrade-email |
| `customer.subscription.deleted` | M2 | INSERT `billing_events`; UPDATE `subscriptions.status='canceled'`, `canceled_at=now()` | Herald cancellation-confirmation; PostHog `subscription_canceled`. Region-gated refund per §6 + §8 |
| `customer.subscription.trial_will_end` | M2 | INSERT `billing_events` (no subscription-table change) | Herald trial-ending-3-days reminder (cadence per `agents/growth/herald-brand-voice.md`) |
| `invoice.payment_succeeded` | M2 | INSERT `billing_events` with `amount_cents` populated; UPDATE `subscriptions.status='active'` (reset from `past_due` if applicable); reset internal dunning counter (see §5) | Herald receipt-email (Stripe-default receipt suffices for tax compliance; Herald shell only for branding) |
| `invoice.payment_failed` | M2 | INSERT `billing_events`; UPDATE `subscriptions.status='past_due'`; increment dunning counter | Trigger §5 dunning email step 1 via Herald + Resend; PostHog `payment_failed` |
| `payment_intent.succeeded` | V1.5 | INSERT `billing_events`; UPDATE `fix_pr_jobs.stripe_payment_intent_id=event.data.object.id` (looked up via PI metadata `run_id`); transition `fix_pr_jobs.state='queued'→'building'` | Trigger build-agent dispatch (Forge); Herald "Fix bundle started" email |
| `payment_intent.payment_failed` | V1.5 | INSERT `billing_events`; UPDATE `fix_pr_jobs.state='failed'`, `fix_pr_jobs.failed_reason='payment_failed'` | Herald "Charge failed — retry?" email; UI banner in verdict screen |
| `charge.dispute.created` | M2 | INSERT `billing_events`; INSERT `disputes` row (Atlas M2 migration); flag associated `runs.suspended_violation=true` per Comply's pre-chargeback Dispute Finding path per `ia/user-flows/billing-and-cancel.md` B-DISPUTE/B-CB | Comply paged via Siren; Echo support-ticket auto-created. **Subscription is NOT auto-cancelled** — dispute review owns the outcome (PRD M2 gate B0 unresolved-dispute banner) |
| `charge.dispute.closed` | M2 | INSERT `billing_events`; UPDATE `disputes.resolved_at=now()`, `disputes.outcome=event.data.object.status` (`won`, `lost`, `warning_closed`) | Comply notified; if `lost`, Comply triggers fraud-blocklist evaluation per agent persona rule 4 |
| `customer.subscription.trial_will_end` | M2 | (see above) | (see above) |
| `radar.early_fraud_warning.created` | M2 | INSERT `billing_events`; INSERT `disputes` row pre-dispute with `pre_warning=true` | Comply + Echo notified — chance to proactive-refund before chargeback hits |

**Events explicitly NOT handled at M2:**
- `customer.created` — we already have `tenants.id`; no Stripe-side identity action needed
- `customer.updated` — minor metadata; no entitlement implications
- `invoice.created` / `invoice.finalized` — Stripe internal lifecycle; `payment_succeeded`/`failed` are the load-bearing events
- `tax.transaction.*` — Stripe Tax handles internally; no Studio Zero action

**Forge: register the M2 events listed above and ONLY those events on the Stripe Webhook Endpoint config.** Receiving events we don't handle still works (signature-verified, INSERTed to `billing_events`, no handler dispatch — but wastes the Edge Fn invocation budget). Tight subscription is the cleaner posture.

### 3.5 Auto-PR one-time charge — Stripe API key idempotency

Separate from webhook idempotency: when Forge **creates** the PaymentIntent at V1.5 (after the customer clicks "Ship the fixes — $49"), the `Idempotency-Key` HTTP header on the PaymentIntent creation call is:

```
Idempotency-Key: autopr:<run_id>:<finding_set_hash>
```

Where `finding_set_hash` is `sha256(sorted(finding_ids).join(','))`. **Rationale:** the same run with the same finding set should never charge twice. If the customer double-clicks the button or the request times out client-side and retries, Stripe returns the same PaymentIntent. `architecture/system-diagram.md` §3b line 221 already requires this: "Web App: charge Stripe $49 (idempotent via run_id key); insert `fix_pr_jobs` row state='charged'".

---

## 4. Reconcile endpoint (ARCH-D4 spec)

**Endpoint:** `GET /api/billing/reconcile?cs=<session_id>` (Vercel API route — this is web-session-authenticated, not webhook-traffic, so it doesn't need the Edge Function co-location)

**Spec for Forge** (impl owner — this section is Ledger's contract):

### 4.1 Request

- Method: `GET`
- Query: `cs=<stripe_checkout_session_id>` (format: `cs_test_*` or `cs_live_*`; reject anything else with 400)
- Auth: web-session JWT (Supabase Auth) — **MUST be authenticated**; an unauthenticated reconcile is a session-ID enumeration vector. Reject 401 if no session.
- Authorization: the JWT subject's `user_id` MUST match the `client_reference_id` prefix on the Checkout Session (`<tenant_id>:<user_id>:<nonce>`) — reject 403 if mismatch. This prevents a logged-in attacker from reconciling another customer's session.

### 4.2 Algorithm (per ARCH-D4 line 159–170)

```
1. Check subscriptions table for stripe_subscription_id matching the cs's
   subscription field (look up via stripe.checkout.sessions.retrieve(cs)
   ONLY if our table doesn't already have a hit; this minimizes Stripe API
   quota burn on repeat polls).

   Actually — order it the other way for the first poll:
   a. SELECT subscriptions WHERE stripe_subscription_id IN
        (SELECT stripe_subscription_id FROM billing_events
         WHERE payload->'data'->'object'->>'id' = $cs LIMIT 1)
      — i.e., did the webhook already write the row?
   b. If yes → return 200 with the entitlement payload (§4.3). Fast path.
   c. If no → stripe.checkout.sessions.retrieve(cs).

2. From Stripe API response:
   - payment_status='paid' AND subscription populated:
     UPSERT subscriptions using stripe_subscription_id as conflict target;
     INSERT billing_events with synthesized stripe_event_id=`reconcile:<cs>:<sub_id>`
       (prefix prevents collision with real Stripe event IDs — those start
        with `evt_`; the UNIQUE constraint still protects against repeats
        if the customer polls multiple times).
     Return 200 with entitlement payload.
   - payment_status='unpaid' or subscription not yet populated:
     Return 202 Accepted with { retry_after_ms: 2000, next_action: 'wait' }.
   - payment_status='no_payment_required' (free-tier promo via Stripe Coupon
     edge case — not in MVP scope but handle gracefully):
     Return 200 with mode_unlocked=true, plan='free_promo'.

3. Audit log every poll attempt:
   INSERT audit_logs (
     tenant_id, user_id, action='stripe_reconcile_poll',
     metadata=jsonb_build_object(
       'cs', $cs,
       'attempt', $attempt_number,    -- client-supplied; rate-limited
       'webhook_already_landed', $bool,
       'result', $next_action
     )
   )
   — `stripe_reconcile_poll` to be added to `audit_action` enum at M2 in
   `0003_billing_managed.sql` (Atlas: add this enum value).
```

### 4.3 Response shape

```json
{
  "subscription_status": "active" | "trialing" | "incomplete" | null,
  "mode_unlocked": true | false,
  "next_action": "ready" | "wait" | "failed",
  "retry_after_ms": 2000,
  "plan": "managed_pro" | null,
  "polled_at": "2026-05-11T10:23:45.000Z"
}
```

- `mode_unlocked=true` iff `subscriptions.status` ∈ `{'trialing','active'}` AND the entitlement check for the customer's intended mode passes (`mode_allowed` metadata vs the picked plan).
- `next_action='ready'` → Vega's `/app/billing/checkout` page proceeds to dashboard.
- `next_action='wait'` → Vega polls again (max 10 polls per ARCH-D4).
- `next_action='failed'` → Vega renders honest "Your purchase is processing — we'll email you when it's ready" copy + Resend transactional email fires when webhook finally lands.

### 4.4 Idempotency of reconcile itself

Multiple polls of the same session_id return the same result (after first success). Achieved via:
- Step 1 fast path — once the row exists, all subsequent polls hit step 1b
- Step 2 UPSERT — even if two polls race past step 1 simultaneously, only one INSERT wins, the other UPDATE no-ops (UNIQUE constraint)
- The synthesized `stripe_event_id=reconcile:<cs>:<sub_id>` prevents `billing_events` duplication across re-polls

### 4.5 Rate-limit

Per ARCH-D4: bounded polling = 10 × 2 s = 20 s. Server enforces no more than 10 polls per `(user_id, cs)` pair via Redis counter (or `audit_logs` count for MVP — simpler, slower, fine for first paying-customer volume). Exceed → 429 with `Retry-After: 60` so the user can refresh and start over.

---

## 5. Dunning + retry policy

### 5.1 Stripe Smart Retries (carrier-level)

Stripe's built-in Smart Retries — **let Stripe own the card-retry logic**. Configuration on the Stripe Billing settings panel:
- Retry schedule: 3 attempts over 21 days (PRD §14.2 / `ia/user-flows/billing-and-cancel.md` EC-4 currently says "4 retries over 30 days" — **discrepancy**; Ledger aligns to **3 over 21** per the brief; Trace + Comply update EC-4 to match. Flagged as M2 doc-fix.)
- Default-of-the-defaults: Stripe Smart Retries algorithm picks optimal retry windows; we don't override.

### 5.2 Dunning state machine (our side, on top of Stripe's retries)

| Event | `subscriptions.status` | Customer comms |
|---|---|---|
| `invoice.payment_failed` (attempt 1) | `past_due` | T+0: in-app banner only (no email — minimize noise on transient declines) |
| `invoice.payment_failed` (attempt 2) | `past_due` | T+3: Herald email "Update your payment method" + Customer Portal deep-link |
| `invoice.payment_failed` (attempt 3 = final) | `past_due` | T+10: Herald email "Last try — update card or switch to free plan" |
| Smart Retries exhausted | `past_due` (still — 7-day grace begins) | T+17: Herald email "We couldn't charge your card. Subscription pauses in 4 days." |
| 7-day grace ends | `canceled_unpaid` | T+21 (= T+17+4): Herald email "Subscription cancelled. Your data is preserved per §14.4 retention. Resubscribe any time." |

**Email cadence aligns to brief spec** (T+0 fail, T+3, T+10, T+17, T+21 final — five touchpoints across the 21-day Smart Retries window + 7-day grace).

Every dunning email includes:
- ✓ Customer Portal "Update payment method" link (Stripe-generated session URL, 1-h expiry)
- ✓ Plain-language explanation of what happens next (FTC Click-to-Cancel transparency posture)
- ✓ "Switch to free plan" CTA (one-click cancellation per FTC 16 CFR 425 — cancel-in-same-channel; Customer Portal already provides this)
- ✓ Support contact (`support@studiozero.dev`)

### 5.3 Service degradation during dunning (PRD §14.2 partial-result + tenant-scoped pause)

Per agent persona rule 5 + §14.2: when `subscriptions.status='past_due'` AND grace period active:
- **Managed tier:** runner dispatch returns `403 / subscription_past_due`; UI banner explains; existing runs in-flight complete with token-refund grace
- **BYOK / CLI:** same dispatch gate; customer's own API key is irrelevant — the platform fee must be current
- **Existing audit data:** read-only access preserved (no destructive action during dunning)

On `subscriptions.status='canceled_unpaid'`:
- Account moves to `tenants.plan='free'` (revert to free tier — no data destruction; PRD §14.4 retention rules apply normally to the now-free tenant)

### 5.4 Customer Portal in dunning emails

Critical: every dunning email's primary CTA is the Customer Portal deep-link. Stripe-generated session, ~1-h expiry. If the customer clicks an expired link, they hit our login page → re-auth → Vega's B0 → "Update payment method" → fresh portal session. Loop is recoverable.

---

## 6. Cooling-off integration (D22 EU)

### 6.1 Window opening (subscribe path)

Per Atlas M2 migration `0003_billing_managed.sql` (sprint/milestone-M2.md line 57): Postgres trigger on `subscriptions` insert/update with `region IN ('eu','uk')` writes a `cooling_off_windows` row.

**Trigger logic** (Ledger spec; Atlas implements):

```sql
CREATE TRIGGER cooling_off_open_on_subscribe
AFTER INSERT ON subscriptions
FOR EACH ROW
WHEN (NEW.region IN ('eu','uk'))
EXECUTE FUNCTION cooling_off_open();

-- And on upgrade-detection (UPDATE where plan_tier rank increases per
-- a known plan-rank function):
CREATE TRIGGER cooling_off_reset_on_upgrade
AFTER UPDATE OF plan ON subscriptions
FOR EACH ROW
WHEN (NEW.region IN ('eu','uk') AND plan_rank(NEW.plan) > plan_rank(OLD.plan))
EXECUTE FUNCTION cooling_off_open_upgrade();

-- cooling_off_open() inserts with trigger_event='subscribe', expires_at=now()+14d
-- cooling_off_open_upgrade() inserts with trigger_event='upgrade', expires_at=now()+14d
```

`plan_rank(plan_tier)` is a deterministic function: `free=0, byok_starter=1, byok_pro=2, cli=1, managed_starter=3, managed_pro=4`. Defined in `0003_billing_managed.sql`.

### 6.2 Waiver checkbox (B-S subscribe flow)

Per `ia/user-flows/billing-and-cancel.md` lines 91–97: the waiver checkbox is rendered on B-S (plan picker, upstream of Stripe Checkout). On submit:
- Checkbox state → `subscriptions.cooling_off_waiver_signed`, `cooling_off_waiver_at`
- Also stamped into the cooling_off_windows row: `waiver_signed=true`

**Waiver does NOT remove the cooling_off_windows row** — we still write the row for audit purposes. The waiver only affects refund-eligibility logic at cancel time (see §6.3).

### 6.3 Refund eligibility check (cancel path)

When `customer.subscription.deleted` webhook arrives (or customer hits B-CAN-REGIONAL):

```sql
-- Is the customer EU/UK and within an open cooling-off window?
SELECT *
FROM cooling_off_windows
WHERE subscription_id = $1
  AND region IN ('eu','uk')
  AND exercised_at IS NULL
  AND expires_at > now()
  AND waiver_signed = false  -- ← waiver gates this
ORDER BY opened_at DESC
LIMIT 1;
```

If a row is returned → **auto-refund eligible**. Issue full Stripe refund per §8. Mark `cooling_off_windows.exercised_at=now()`, `refund_amount_cents=<refund_total>`.

If no row → standard cancel (no refund unless California pro-rata applies — see §8).

**EC-7 (cooling-off-resets-on-upgrade per D22):** EU customer upgrades on day 7 of a 14-day window. The new `customer.subscription.updated` webhook fires; our trigger writes a NEW `cooling_off_windows` row with `trigger_event='upgrade'`, expires 14 days from upgrade date. The OLD window's `exercised_at` is NOT set (customer didn't exercise — they upgraded). At cancel-time, the query above picks up the most recent (`ORDER BY opened_at DESC LIMIT 1`) — the upgrade-triggered window — and refunds against that. Vega's "Your 14-day cooling-off window resets with this upgrade" banner (M2 deliverable) sets customer expectation.

### 6.4 Tests Verify owns (M2)

- `tests/integration/eu-cooling-off-reset.spec.ts` — EU customer subscribe → upgrade → fresh `cooling_off_windows` row with `trigger_event='upgrade'`
- `tests/acceptance/e2e/refund-eu-cooling-off.spec.ts` — EU customer subscribes without waiver → cancels day 7 → full refund issued, `cooling_off_windows.exercised_at` set, `subscriptions.status='canceled'`, `billing_events` has refund event row

---

## 7. Dispute Finding path (Comply's regulatory hook)

### 7.1 Why this exists

Per PRD §17 #20 + `ia/user-flows/billing-and-cancel.md` B-DISPUTE: before any chargeback escalation, customer must complete an in-app Dispute Finding flow. This is **Comply's regulatory hook** — Comply owns the legal validity of the dispute resolution; Ledger owns the Stripe submission technical path.

### 7.2 Pre-chargeback flow (B-DISPUTE)

1. Customer clicks "Dispute Finding" on V0 verdict screen OR "Dispute charge" in B0 billing settings
2. Vega renders dispute form: "Which charge? Why?" (form fields locked by Comply + Herald)
3. Customer submits → `disputes` table row inserted (state=`pending_review`)
4. Comply paged via Siren; auto-SLA banner "We'll review within 5 business days"
5. Comply (or Jury for verdict-related disputes) reviews → decision (refund / partial / upheld)
6. If refund: §8 issues; `disputes.state='resolved_refund'`; B-CONF rendered
7. If upheld: `disputes.state='resolved_upheld'`; customer can still file chargeback through bank — but our pre-chargeback offer is on record

### 7.3 If customer skips B-DISPUTE and goes straight to chargeback (B-CB)

`charge.dispute.created` webhook lands → §3.4 handler INSERTs `disputes` row, INSERTs `billing_events`, pages Comply. Stripe Dispute API path is now in play:

1. Stripe surfaces the dispute reason + evidence-required deadline (typically 7 days from creation)
2. **Evidence package**: Comply + Ledger collaboration. Required artifacts (Stripe Dispute API fields):
   - `customer_communication`: thread of emails (from Resend log)
   - `customer_signature`: ToS-acceptance audit log entry (per `audit_logs.action='url_audit_attestation'` or equivalent)
   - `service_documentation`: audit verdict + findings + evidence ratios (the dispute Finding evidence package per PRD §17 #8)
   - `service_date`: timestamp of audit completion
   - `receipt`: Stripe-generated invoice PDF
   - `refund_policy`: link to `/refunds` (Comply publishes; D20 regional matrix)
   - `cancellation_policy_disclosure`: link to `/cancel` policy + screenshot of B-CAN UI showing Click-to-Cancel compliance
3. Ledger submits via `stripe.disputes.update(dispute_id, { evidence: { ... } })`
4. Stripe + card network adjudicate → `charge.dispute.closed` webhook → `disputes.outcome` updated
5. If `outcome='lost'`: agent rule 4 fraud-blocklist evaluation triggers (Comply decides; not automatic)

### 7.4 Comply owns; Ledger owns

- **Comply owns:** the legal validity of dispute decisions, evidence-package content (especially `service_documentation` framing), and any blocklist decisions
- **Ledger owns:** the Stripe Dispute API submission, the `disputes` table schema, the `charge.dispute.*` webhook handlers, the evidence-package assembly script

---

## 8. Refund operations

### 8.1 Refund triggers (per D20 regional matrix)

| Trigger | Region | Refund amount | Auto vs manual |
|---|---|---|---|
| Cooling-off cancel within open window, waiver=false | EU, UK | Full refund of current period | **Auto** (§6) |
| SB 313 pro-rata cancel | California | `(days_remaining / days_in_period) × plan_price` rounded down to nearest cent | **Auto** |
| FTC Click-to-Cancel "cancel-with-refund" customer request | All US (incl. CA) | Per cancel-with-refund button state — currently MVP does not surface a "cancel AND refund" button outside CA; under FTC 16 CFR 425, refund is not mandated, only easy cancel | **Manual** (Echo ticket) — open question, flagged below |
| Dispute Finding resolution = `refund` or `partial` | All | Per Comply decision | **Manual** (Comply approves; Ledger executes Stripe API call) |
| Chargeback resolved against us (won by customer) | All | Stripe auto-refunds | **Auto by Stripe** |
| Failed-synth refund (PRD §14.2 D21 — `failed_synth_timeout`) | All | Token-cost refund (Managed) — translated to USD via token-COGS table; or charge-reversal (BYOK platform fee is unaffected; only Managed tokens) | **Auto** (Forge — Ledger reviews COGS math) |
| Auto-PR rejection by re-audit (V1.5 — C6 negative test) | All | Full $49 refund | **Auto** (V1.5 — refund event in `billing_events` is a V1.5 exit-gate assertion) |

### 8.2 Refund API call (idempotent)

```
stripe.refunds.create({
  payment_intent: $pi_id,         // or charge: $charge_id
  amount: $refund_cents,           // partial supported
  reason: 'requested_by_customer', // or 'duplicate' or 'fraudulent'
  metadata: {
    tenant_id, user_id, run_id (V1.5), trigger,
    audit_log_id (← key cross-ref into our audit trail)
  }
}, {
  idempotencyKey: `refund:<trigger>:<subscription_id|payment_intent_id>:<window_id_if_cooling_off>`
});
```

**Idempotency key construction** (Ledger contract; deterministic):
- Cooling-off: `refund:cooloff:<subscription_id>:<cooling_off_window_id>`
- SB 313: `refund:sb313:<subscription_id>:<cancel_event_id>`
- Dispute: `refund:dispute:<dispute_id>`
- Failed-synth: `refund:synthstall:<run_id>`
- Auto-PR rejection: `refund:autopr:<run_id>`

Same trigger + same target → same key → Stripe returns same Refund object → no double-refund. **This is the same red-line idempotency posture as §3.3.**

### 8.3 Audit logging

Every refund issuance writes:
1. `billing_events` row — synthesized `stripe_event_id=refund_initiated:<refund_id>`, type=`internal.refund_initiated` (the `refund.created` webhook from Stripe will follow with its own real event_id; both are kept, dedup via separate `stripe_event_id` values)
2. `audit_logs` row — `action='admin_action'` (or new `refund_issued` enum entry — Atlas adds to `audit_action` enum at M2), metadata includes `refund_id`, `amount_cents`, `trigger`, `idempotency_key_used`

---

## 9. Ledger's exit-gate self-verdict (Phase 7)

- **✓ Idempotency on every charge endpoint** — UNIQUE constraint on `billing_events.stripe_event_id` (`tables.sql:590`, defined as `UNIQUE`); UNIQUE on `subscriptions.stripe_subscription_id` (`tables.sql:543`); Stripe `Idempotency-Key` header on every mutating Stripe API call (PaymentIntent create §3.5, Refund create §8.2). The transaction-bound `INSERT...ON CONFLICT DO NOTHING` pattern (§3.3) is the spine.
- **✓ Webhook signature verification before any DB write** — `stripe.webhooks.constructEvent` runs first in the handler; the body is read as raw text, never JSON-parsed before verify; signature failure returns 400 with zero DB touches (§3.2). Sentry redaction filter prevents secrets from leaking on capture.
- **✓ Dunning policy 21-day finite, then `canceled_unpaid`** — Stripe Smart Retries 3 attempts over 21 days + 7-day grace = 28-day total bounded window; status transitions `past_due → canceled_unpaid` deterministic; five email touchpoints T+0/+3/+10/+17/+21 (§5).
- **✓ Dispute Finding path documented for Comply** — B-DISPUTE pre-chargeback flow (§7.2); B-CB direct-chargeback path with evidence-package contract (§7.3); ownership split locked (Comply = legal validity; Ledger = Stripe API submission, §7.4).
- **✓ FTC Click-to-Cancel** — Customer Portal enabled with one-click cancel (§1.5); cancel-in-same-channel as signup; dunning emails include "Switch to free plan" CTA; B-CAN flow in Vega passes the 16 CFR 425 acceptance criterion `cancellation completes in ≤ 2 clicks` (`billing-and-cancel.md` line 311).
- **✓ Regional refund matrix wired** — D20/D22 cooling-off windows table-backed (§6); SB 313 pro-rata formula-driven (§8.1 row 2); waiver checkbox EU/UK gates auto-refund eligibility correctly (§6.3); EC-7 upgrade-resets-window enforced by Postgres trigger (§6.1).

**Phase 7 sign-off (Ledger):** the spec is idempotent, signature-verified, dunning-bounded, Click-to-Cancel-compliant. Open items below are NOT exit-gate blockers — they are explicit handoffs to other agents.

---

## 10. Open items + handoffs

- **D4 (Penny + Jo, M2 ticket-cut week 7):** $19 vs $29 Starter pricing — both Price objects pre-created (§2.1 BYOK Starter); Forge does not hard-code prices; A/B harness reads `subscriptions.metadata.ab_slot`.
- **D5 (Penny + Jo, V1.5 spec-kickoff week 17):** Auto-PR flat $49 vs tiered $15/$49/$99 — Product `prod_studiozero_autopr_fix` ready; tiered Price objects can be added at V1.5 without product re-creation.
- **EC-4 doc-discrepancy (Trace + Comply, M2):** `billing-and-cancel.md` line 189 says "4 retries over 30 days"; Stripe Smart Retries default + our policy is 3 over 21 + 7-day grace = 28 days total. Update flow doc to match this config; Verify aligns test fixtures.
- **OQ-5 (Trace + Herald, M2):** dunning email cadence — Ledger spec'd T+0/+3/+10/+17/+21 (§5.2); Herald reviews copy; Trace updates `billing-and-cancel.md` EC-4 with the same cadence.
- **FTC cancel-with-refund button (Comply, M2):** PRD § leaves ambiguous whether non-CA US customers should get a "cancel AND refund" path; 16 CFR 425 mandates easy cancel, not refund. Comply confirms; if "no refund outside regional law" stands, §8.1 row 3 stays manual-only.
- **`stripe_reconcile_poll` enum value (Atlas, M2):** add to `audit_action` enum in `0003_billing_managed.sql`.
- **Legal entity placeholder (Comply, M2):** Stripe account holder + statement descriptor wording pending trademark + entity resolution.
- **EU/UK Price objects in EUR/GBP (Penny + Locale, post-MVP):** added when first EU/UK customer signals; pricing-page renders converted USD until then with the disclosure "Billed in USD; your bank may apply FX fees."

---

## Cross-references

- PRD §12 pricing skeleton + §14.5 compliance (#17, #20, D22) + §17 D3/D4/D5/D23
- `architecture/system-diagram.md` §1 (TB-8), §3b (Managed flow), §3c (V1.5 Auto-PR), §C4 (webhook reconciliation contradiction)
- `architecture/decisions.md` ARCH-D2 (Edge Function co-location), ARCH-D4 (bounded polling), ARCH-D6 (D23 tracking_state)
- `architecture/database/tables.sql` lines 498–601 (`fix_pr_jobs`, `subscriptions`, `cooling_off_windows`, `billing_events`)
- `architecture/iac/stripe-webhook.md` (Forge owns; this file is the spec input)
- `ia/user-flows/billing-and-cancel.md` (all 9 states, 10 edge cases, 4 acceptance criteria — Ledger's spec maps 1:1 to the unhappy-path acceptance criteria)
- `sprint/milestone-M2.md` Forge/Verify/Comply/Ledger deliverables + exit gates
- `sprint/milestone-V1-5.md` Auto-PR pricing + C6 refund-on-rejection exit gate
- `compliance/key-rotation.md` (Cipher; 90-day cadence)
- `compliance/dpa-template.md` (Comply M2; Stripe listed as Stripe Payments Europe Ltd. subprocessor)
- `agents/growth/herald-brand-voice.md` (dunning email copy review)

---

*Owner: Ledger · Phase 7 deliverable · Last update: 2026-05-11 · Status: complete, awaiting Forge implementation at M2*
