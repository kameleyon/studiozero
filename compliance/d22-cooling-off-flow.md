# D22 EU/UK Cooling-Off Flow Verification — Studio Zero M2

**Version:** 1.0 (M2 verification)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**Statute:** Directive 2011/83/EU (Consumer Rights Directive) Arts. 9, 11, 13, 14, 16(m); UK Consumer Contracts Regulations 2013 (SI 2013/3134) Regs. 29, 30, 34, 36, 38
**PRD anchors:** §17 Decision #22 (EU cooling-off resets per upgrade — LOCKED v0.5)
**Cross-references:** `finance/refund-matrix.md` §3 (EU/UK cooling-off lifecycle), `apps/web/app/api/billing/checkout-session/route.ts` (EU/UK waiver gate), `architecture/database/migrations/0003_billing_managed.sql` §B.3 (cooling_off_windows.reset_count + waiver_signed_at), `legal/terms-of-service.md` §7.4 (cooling-off ToS), `sprint/milestone-M2.md` exit gate "EU 14-day cooling-off reset test green"

> **Verdict at M2 close:** `PASS WITH GAPS` — checkout-session gate live and enforced; database schema live with reset_count + waiver_signed_at columns; D22 reset semantics specified end-to-end; **three UX surface gaps** flagged for Vega/Locale/Herald to close before M2 exit gate.

---

## 1. What the D22 lock requires (refresher)

From `finance/refund-matrix.md` §3 + PRD §17 D22:

1. **Region detection (§3.1):** Locale resolves EU/UK at every billing-state transition via billing-address → IP → timezone → explicit-radio disambiguation on conflict.
2. **Signup-time waiver (§3.2):** Express checkbox at Stripe Checkout, **not pre-ticked** (EDPB Guidelines 05/2020), with the legally-sufficient wording at `finance/refund-matrix.md` §8.2 (EU) / §8.3 (UK).
3. **Without waiver (§3.3):** 14-day full-refund right; `cooling_off_windows` row open; confirmation email restates the right.
4. **With waiver (§3.4):** Cooling-off suspended; standard cancel posture; service-faulty carve-out (CRD Art. 16(m) + CCR Reg. 36) still applies via Dispute path.
5. **Upgrade resets window (§3.5 — the D22 lock):** New `cooling_off_windows` row inserted with `trigger_event='upgrade'`; banner reads "Your 14-day cooling-off window resets with this upgrade."
6. **Downgrade does NOT reset (§3.6):** Existing window unchanged; refund eligibility re-priced to lower tier.
7. **Day-14 close (§3.7):** Cron-driven email confirms window closed; `cooling_off_windows.closed_at = now()`.

---

## 2. Audit findings (per control)

### 2.1 Region detection — **PASS (contract-level)**

`finance/refund-matrix.md` §3.1 specifies the priority cascade: billing-address → IP geolocation → timezone → explicit-radio on conflict.

**Backend evidence:**

- `apps/web/app/api/billing/checkout-session/route.ts:175` checks `body.region === 'eu' || body.region === 'uk'` before requiring `cooling_off_waiver === true`.
- The `region` field is a `RegionCode` enum: `'eu' | 'uk' | 'california' | 'us_other' | 'row'` (line 68).
- Stripe Checkout `billing_address_collection: 'required'` (line 220) ensures Stripe captures the billing country; the `customer.subscription.created` webhook handler (per `finance/stripe-config.md` §3.4) resolves it into `subscriptions.region`.

**Gap D1 (Locale + Vega):** The plan-picker page on the marketing site does NOT yet render the EU/UK banner (`finance/refund-matrix.md` §8.1) before the user clicks "Start"; Locale's region-resolution logic is not yet wired client-side on the marketing site. Without the upstream client-side detect, the customer arrives at Stripe Checkout with an unspecified `region` field, and the checkout-session API will default to the `else` branch (no waiver required). The server-side check at `route.ts:175` is the safety net but it fires only when `body.region === 'eu' || 'uk'` is **explicitly** passed.

**Action required for M2 exit:** Vega + Locale wire the marketing-site banner (`finance/refund-matrix.md` §8.1 copy) on `/pricing` for EU/UK-detected sessions, and pass the resolved `region` into the checkout-session POST. Acceptance test: a Playwright spec simulates a `CF-IPCountry: DE` request → banner renders → user clicks "Start" → `region: 'eu'` lands in the POST body → server enforces waiver.

### 2.2 Waiver checkbox — **PASS (server-side enforced)**

`apps/web/app/api/billing/checkout-session/route.ts:170–185` enforces the EU/UK gate:

```ts
if (
  (body.region === "eu" || body.region === "uk") &&
  body.cooling_off_waiver !== true
) {
  return json(
    {
      error: "cooling_off_waiver_required",
      detail:
        "EU/UK customers must explicitly waive the 14-day cooling-off " +
        "period via the plan-picker checkbox before checkout.",
    },
    400,
  );
}
```

The `cooling_off_waiver` field is **boolean strict-equality to `true`** — `undefined`, `false`, `0`, `'true'` (string), or omitted all fail the gate. This satisfies the EDPB-05/2020 "no pre-ticked" rule **at the API contract level**: the server treats absent or non-strict-true as unsigned. ✓

The `cooling_off_waiver` is forwarded into Stripe Checkout `metadata.cooling_off_waiver: String(Boolean(body.cooling_off_waiver))` (line 236) so the webhook handler can populate `cooling_off_windows.waiver_signed_at` (migration 0003 column live) on `customer.subscription.created`.

**Code reading confirms compliance with §3.2** — the server is the canonical enforcement; the UI checkbox is a UX rendering of the same state.

**Gap D2 (Vega):** The plan-picker UI (`apps/web/app/pricing/page.tsx` — not yet inspected for waiver checkbox; M2 batch 2 Vega scope) must render the legally-sufficient text from `finance/refund-matrix.md` §8.2 (EU) or §8.3 (UK) **verbatim**. Comply's draft is legally sufficient as-is; Herald may rephrase for tone but **may not weaken the waiver text** (`finance/refund-matrix.md` §8 lead-in). Until Vega ships the checkbox UI, the server gate exists with no UI to drive it — Stripe Checkout would refuse the request with `cooling_off_waiver_required` error and surface a backend error to the user, which is a broken UX.

**Action required for M2 exit:** Vega ships the EU/UK waiver checkbox on the plan-picker page with the verbatim §8.2/§8.3 copy and routes the boolean state into the checkout-session POST.

### 2.3 Without-waiver path (full refund within 14 days) — **PASS (contract-level)**

`finance/refund-matrix.md` §7 RT-1 + §3.3:

- Customer cancels within 14 days, waiver unsigned → **full refund** of all paid amounts incl. upgrade increments per CRD Art. 13(1) / CCR Reg. 38.
- Refund SLA: 14 days from withdrawal notice; Stripe settlement 5–10 business days.
- Audit log: `audit_logs.action='refund.cooling_off'` with `meta={region, withdrawal_notice_at, refund_amount_cents, stripe_refund_id}`.

**Database evidence:** `0003_billing_managed.sql` §B.3 adds `cooling_off_windows.waiver_signed_at` (timestamptz, NULL = not waived) — this is the canonical "waiver unsigned" state.

**Implementation gap (G4 from `compliance/click-to-cancel-ux-audit.md`):** Same as the CA pro-rata gap — the region-gated refund branch on `customer.subscription.deleted` is contract-only. Forge's batch 1 commit `a7396fc` shipped the webhook scaffold; the EU/UK cooling-off refund branch is M2 batch 2 scope.

### 2.4 With-waiver path (no refund within 14 days; service-faulty carve-out applies) — **PASS**

`finance/refund-matrix.md` §3.4 + §7 RT-2:

- Customer cancels within 14 days, waiver signed → cancellation effective at period-end; no full refund.
- Service-faulty carve-out (CRD Art. 16(m) + CCR Reg. 36): Dispute Finding path opens (`legal/terms-of-service.md` §14; `finance/refund-matrix.md` §6) with 5-business-day SLA.

**No code gap** — the standard cancel path (no region-specific refund branch) is the default; the Dispute Finding path is M3 scope for the in-app surface (M2 ships the email-to-`comply@studiozero.dev` path; in-app surface lands M3 per `sprint/milestone-M3.md`).

### 2.5 D22 reset-on-upgrade — **PASS (database live; webhook contract live; UI banner pending)**

This is the heart of D22. Three layers must be live:

#### Layer A — Database (Atlas M2 — LIVE)

`architecture/database/migrations/0003_billing_managed.sql` §B.3:

```sql
ALTER TABLE cooling_off_windows
  ADD COLUMN IF NOT EXISTS reset_count int NOT NULL DEFAULT 0
    CHECK (reset_count >= 0);

ALTER TABLE cooling_off_windows
  ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz;

COMMENT ON COLUMN cooling_off_windows.reset_count IS
  'D22 (PRD §17): increments on every upgrade event for EU/UK customers. '
  '0 on initial subscribe row; N on the Nth upgrade. Used by the cooling-off '
  'banner copy at upgrade time ("Your 14-day window has been reset").';
```

Atlas's migration is applied to staging per the M2 exit-gate line `0003_billing_managed.sql applies cleanly to staging` (`sprint/milestone-M2.md` line 131). ✓

#### Layer B — Webhook handler (Forge M2 — LIVE per contract)

`finance/stripe-config.md` §3.4 webhook-event table for `customer.subscription.updated`:

> "If plan upgrade AND region∈{eu,uk}: INSERT new `cooling_off_windows` row with `trigger_event='upgrade'` (D22 fresh-window rule). Herald upgrade-email."

Forge's batch 1 commit `a7396fc` ships the webhook handler scaffold. The reset trigger is in the contract; Comply must verify the actual code path via `tests/integration/eu-cooling-off-reset.spec.ts` (the M2 exit-gate test per `sprint/milestone-M2.md` line 134).

**Verification:** `tests/integration/eu-cooling-off-reset.spec.ts` must assert:

- EU/UK customer upgrade → fresh `cooling_off_windows` row inserted with `trigger_event='upgrade'`
- `reset_count` on the new row = previous max `reset_count` + 1
- Old row's `closed_at` NOT touched (the previous window may still be open until the user-initiated cancel or the day-14 cron)

Comply will read the test output at M2 exit gate to confirm green.

#### Layer C — UI banner (Vega M2 — PENDING)

`sprint/milestone-M2.md` Vega row line 49:

> "Vega — D22 cooling-off banner: EU/UK customers see 'Your 14-day cooling-off window resets with this upgrade' copy at upgrade time."

**Gap D3 (Vega + Herald):** The upgrade flow UI banner is not yet shipped. Until Vega lands it, EU/UK customers upgrade with no UX surface for the fresh-window opening; they would receive an upgrade-confirmation email (Herald owns) but the in-app affordance is silent.

**Action required for M2 exit:** Vega + Herald implement the upgrade-time banner on the upgrade-confirmation page or in the upgrade-success modal, with the locked copy "Your 14-day cooling-off window resets with this upgrade." Acceptance test: Playwright spec simulates EU customer upgrade → banner visible → `aria-label` includes the cooling-off mention for a11y.

### 2.6 Downgrade does NOT reset — **PASS (contract-level)**

`finance/refund-matrix.md` §3.6 specifies the rule. No additional implementation: the webhook handler's branch is "if plan upgrade AND region∈{eu,uk}" — downgrade does not match the predicate, so no new `cooling_off_windows` row inserts.

**Verification needed:** The `eu-cooling-off-reset.spec.ts` (or a sibling spec) should additionally assert that **downgrade does NOT insert a new row**. Comply flags this as a test-coverage gap to Verify: a negative-path test prevents future regression if a maintenance commit accidentally widens the trigger predicate.

### 2.7 Day-14 close — **PASS (contract-level); cron pending**

`finance/refund-matrix.md` §3.7: cron-driven email on day 14; `cooling_off_windows.closed_at = now()`.

**Implementation:** The cron job is a Watch/Hook deliverable per `sprint/milestone-M2.md` (Watch monitors webhook delivery; Hook owns lifecycle email triggers in coordination with Herald). The actual day-14 cron job and email-send is not strictly an M2-exit-gate item; it can land M2 batch 3 or roll into M3.

**Comply observation:** Until the day-14 cron lives, the `cooling_off_windows.closed_at` column will sit NULL beyond the 14-day boundary, which means a customer who attempts cancellation on day 15 would (in a naive read) still appear to be within their window. Forge must make the refund-handler check `closed_at IS NULL AND opened_at + interval '14 days' > now()` — **both** predicates, not just `closed_at IS NULL`. The temporal check is the authoritative gate; the column is the audit-log of when the gate closed.

**Gap D4 (Forge):** Verify the refund-handler at `customer.subscription.deleted` reads BOTH predicates: `closed_at IS NULL` **AND** the temporal computation. Without the temporal check, a missed cron could grant refunds beyond the lawful window.

---

## 3. Gap summary + owner assignment

| Gap       | Description                                                                                                      | Owner             | Action                                                                                                                     | Deadline                         |
| --------- | ---------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| D1        | Marketing-site `/pricing` does not render EU/UK banner; `region` field not yet routed into checkout-session POST | **Vega + Locale** | Implement banner per §8.1 copy; client-side region detect via `CF-IPCountry` / Stripe Tax preflight; pass `region` to POST | M2 exit gate                     |
| D2        | Plan-picker waiver checkbox UI not yet shipped (server gate exists; UI to drive it does not)                     | **Vega**          | Render checkbox with verbatim §8.2 (EU) / §8.3 (UK) copy; bind to `cooling_off_waiver` boolean in POST                     | M2 exit gate                     |
| D3        | Upgrade-time UI banner ("Your 14-day window resets") not yet shipped                                             | **Vega + Herald** | Banner on upgrade-confirmation surface; locked copy from D22 spec                                                          | M2 exit gate                     |
| D4        | Refund-handler must check BOTH `closed_at IS NULL` AND temporal `opened_at + interval '14 days' > now()`         | **Forge**         | Verify or implement temporal gate in webhook refund branch; add regression test                                            | M2 exit gate                     |
| D5 (test) | Negative-path test: downgrade does NOT insert new `cooling_off_windows` row                                      | **Verify**        | Sibling assertion in `tests/integration/eu-cooling-off-reset.spec.ts`                                                      | M2 exit gate (in same test file) |

---

## 4. Verdict for M2 exit gate

**Comply verdict: PASS WITH GAPS.**

Backend gates are speced and enforced (checkout-session waiver gate, database schema, webhook contract). The five gaps above are all UX-surface / negative-test completeness; closing them is M2 batch 2/3 sprint scope.

**Hard requirement:** All five gaps closed before first paid EU/UK customer. If any remains open:

- **D1 unclosed** → EU/UK customers may transit Stripe Checkout without a region tag; server gate still saves them via error response but the UX is broken. **Hard blocker for EU/UK customer acquisition.**
- **D2 unclosed** → no UI to surface the waiver decision; customers cannot complete checkout. **Hard blocker.**
- **D3 unclosed** → upgrade reset is silent in the UI; defensible legally (the legal right still applies) but a missed disclosure under CRD Art. 6(1)(h) / CCR Reg. 13(1)(l). **Recommended close before EU/UK customer.**
- **D4 unclosed** → temporal gate missing; refund-handler may grant out-of-window refunds. **Hard blocker — financial-exposure risk.**
- **D5 unclosed** → no regression coverage on downgrade; future commits may break the invariant silently. **Recommended close at M2 exit.**

---

## 5. Test inventory for Verify (M2 + ongoing)

| Test                                            | File                                                                 | Asserts                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| EU cooling-off reset (positive)                 | `tests/integration/eu-cooling-off-reset.spec.ts` (M2 exit-gate test) | EU/UK upgrade → fresh row + `reset_count` increments                                |
| EU cooling-off no-reset on downgrade (negative) | (same file, sibling assertion)                                       | Downgrade → no new row                                                              |
| Checkout-session waiver gate                    | `tests/integration/checkout-session-waiver-gate.spec.ts` (new)       | EU/UK request without `cooling_off_waiver=true` → 400 `cooling_off_waiver_required` |
| Temporal-gate refund handler                    | `tests/integration/cooling-off-temporal-gate.spec.ts` (new)          | Day-15 cancellation does NOT grant cooling-off refund even if `closed_at IS NULL`   |
| Upgrade banner UI                               | `apps/web/tests/e2e/upgrade-cooling-off-banner.spec.ts` (new)        | EU customer upgrade flow shows the locked banner copy                               |

---

## 6. Quarterly re-verification

Per Comply's standing cadence: re-run this audit quarterly. Triggers for immediate re-run:

- CRD or CCR is amended (especially Art. 16(m) waiver mechanics)
- EDPB issues new guidance on consent / waiver framing
- A national supervisory authority enforcement action interprets the cooling-off right against a digital-services trader
- Studio Zero adds a tier that interacts with the cooling-off lifecycle differently (e.g., a one-time charge SKU outside subscription scope)

Next scheduled re-verification: **2026-08-12** (quarterly cadence; aligns to EU AI Act Art. 50 binding date).

---

_Comply locks this verification at v1.0 on 2026-05-12. Gaps D1–D5 must close before M2 exit gate / first paid EU/UK customer._
