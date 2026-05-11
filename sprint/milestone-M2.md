# Milestone M2 — Managed mode + billing

**Target:** week 9 (placeholder per PRD §16)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES before M3 starts. Self-dogfood gate M2.

## Scope (one-line)

Stripe-backed Managed mode goes live with per-tenant token caps, regional refund matrix, GDPR Art. 28 DPA + subprocessor list, and the heavier security corpora (PI ≥200, sandbox-escape top-30, prompt-injection 100% blocked).

## Entry prerequisites

- M1 exit gate green (every checkbox; nightly p95 SLO green over rolling 7d; self-dogfood M1 PASS or PASS WITH FIXES).
- M0 + M1 regression gates remain green.
- **D4 has TWO deadlines (F-MAJ-2 closure):** (a) **Decision deadline = M2 ticket-cut (week 7)** — Jo decides $19 vs $29 (or accepts Sprint default = $29 + A/B slot at $19 for first 200); (b) **Ship-tier deadline = M2 exit (week 9)** — whichever tier (or A/B harness) is wired into Stripe products + `subscriptions` table + Pricing page. If decision deadline (a) slips past week 7, Sprint default ships at deadline (b); D4 closes regardless of whether Jo decided.

## Deliverables per layer

### Strategy

- **Sprint:** weekly burndown updates; M3 ticket-cut scoping at week 8.
- **Penny — Managed-tier unit economics:** lock COGS per audit at Managed Starter ($99) + Managed Pro ($249) tiers using M1-actual runner-pool cost data. Verify Auto-PR upcharge $49 placeholder still in PRD §12 (D5 deferred to V1.5).

### Audit (Jury + 6 reviewers)

- **Jury:** **Self-dogfood gate M2** — verdict in `audits/m2.json` = PASS or PASS WITH FIXES.
- **Halo:** axe-core gate remains green on every primary-flow page; pricing-table page added to coverage (HC7).
- **Optic + Trace:** review `verdict-to-upsell-loop.md` flow including the E2 upsell.

### Backend (Forge)

- **Forge — Managed tier runner:** Jo's Anthropic key used; per-tenant token budget enforcement at runner side.
- **Forge — Stripe Checkout + webhook (ARCH-D4):** hosted Checkout (Halo HC6); webhook signature verification; idempotency via `stripe_subscription_id` UNIQUE constraint.
- **Forge — Stripe reconcile endpoint (ARCH-D4):** `/api/billing/reconcile?cs=<session_id>` bounded polling — 10 × 2s.
- **Forge — Token budget gating:** per-tenant token cap dashboard + alert; auto-pause at threshold; `429 / token_budget_exceeded` response on exceeded.
- **Forge — D21 synth-stall handling:** `runs.state` transitions to `failed_synth_timeout` after 30s; tokens refunded; customer offered restart.
- **Forge — D22 cooling-off reset trigger:** Postgres trigger on `subscriptions` insert/update with `region IN ('eu','uk')` writes new `cooling_off_windows` row.
- **Forge — Cross-mode consistency:** BYOK vs Managed verdicts identical on same fixture repo (model pins from M1).
- **Forge — Compass AH-6 close (Jury M5):** indie-agency persona `projects.client_tag` column wired into project-create UI.
- **Forge — `docs/sku-mapping.md` (Jury M6):** plain-English mapping of `plan_tier` × `audit_product` enums.

### Frontend (Vega)

- **Vega — Goal 4 e2e (BYOK + Managed lanes):** `tests/acceptance/goal-4-three-modes.spec.ts` green for the two server-side modes (CLI stubbed for M3).
- **Vega — Pricing page (HC7):** semantic table; "Most popular" badge text + visual; reflows at 320 CSS px; SC 1.4.10 + SC 1.4.12.
- **Vega — Stripe Checkout return UX:** `/app/billing/checkout` polls reconcile endpoint up to 10×2s; "Your purchase is processing" honest copy on overrun.
- **Vega — `billing-and-cancel.md` flow:** subscribe / upgrade / cancel; FTC Click-to-Cancel UI compliance (16 CFR 425, R20 mitigation); regional refund matrix surfaces per `subscriptions.region`.
- **Vega — D22 cooling-off banner:** EU/UK customers see "Your 14-day cooling-off window resets with this upgrade" copy at upgrade time.

### Design (Canvas, Pixel)

- **Pixel:** payment-confirmation screen + 5 regional refund variants (US, EU, UK, CA, other).

### Data (Atlas)

- **Atlas — `0003_billing_managed.sql` lands** (per migration-order.md M2 row): Stripe webhook UNIQUE hardening; `disputes` table; `subscriptions.region` + auto-open `cooling_off_windows` trigger (D20 + D22); `projects.client_tag text` (Jury M5).
- **Atlas — D21 state added:** `'failed_synth_timeout'` already in `run_state` enum (per Jury closure table); confirm runner emits this state.
- **Atlas — Stream coordination on Realtime fan-out (ARCH-D5):** confirm channel naming `runs:<run_id>` per ARCH-D5; load-test infra hooks live.

### Security (Shield, Cipher, Verify)

- **Shield + Verify — PI corpus M2 ramp:** `runner/fixtures/prompt-injection-corpus/` ≥200 patterns. `tests/security/prompt-injection-corpus.spec.ts` 100% handled correctly (no exfil; verdict never flipped FAIL→PASS by injection; LLM gateway JWT only credential in scope).
- **Shield + Verify — sandbox-escape top-30:** `runner/fixtures/sandbox-escape-corpus/` ≥200 patterns; `tests/security/sandbox-escape-top30.spec.ts` green.
- **Shield + Verify — SSRF corpus M2 ramp:** ≥100 patterns.
- **Ledger + Shield + Verify — Stripe webhook corpus M2:** `runner/fixtures/stripe-webhook-corpus/` ≥15 patterns (signature-mismatch, replay, idempotency collision).
- **Cipher — Stripe key rotation cadence enforced:** 90d calendar reminders live; rotation-runbook in `compliance/key-rotation.md`.
- **Crash + Verify — Load test:** `tests/load/per-tenant-token-cap.k6.js` — 100 concurrent Managed runs sustained 30 min; cap fires; `429` returned; alert emitted.
- **Crash + Verify — Realtime fan-out load test (ARCH-D5):** 90 concurrent runs × ~24 events/sec for 5 min; p95 event-delivery < 500ms.
- **Verify — Cross-mode consistency test:** `tests/integration/cross-mode-consistency.spec.ts` — BYOK vs Managed identical (score, verdict) on fixture repo.
- **Verify — Jury synth-stall test:** `tests/integration/jury-synth-stall.spec.ts` — inject stall >30s → `failed_synth_timeout` → refund → restart.
- **Verify — Stripe checkout + webhook test:** `tests/integration/stripe-checkout-and-webhook.spec.ts` — subscription row created idempotently; replay produces no duplicates.
- **Verify — Stripe reconcile race test:** `tests/integration/stripe-reconcile-race.spec.ts` — webhook + poller race write same row exactly once.
- **Verify — EU 14-day cooling-off reset test:** EU/UK customer upgrade → fresh window in `cooling_off_windows` table.

### Quality (Probe, Crash)

- **Probe:** `billing-and-cancel.md` flow Playwright spec — happy + 4 unhappy paths (cancel, dispute, decline, cooling-off-reset).
- **Crash:** chaos test for Stripe-webhook-delay 30s (Toxiproxy weekly).

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Terra:** Stripe webhook endpoint + DPA subprocessor route provisioned in IaC.
- **Watch:** Stripe webhook delivery alerting; per-tenant budget-exceeded alert.
- **Meter:** Managed-tier COGS dashboard live; Penny consumes weekly.
- **Siren:** PagerDuty escalation for Stripe webhook failures.

### Platform (Locale, Edge, Tongue)

- **Locale:** regional refund matrix gating logic per `subscriptions.region`.

### AI (Cortex, Memory, Oracle)

- *(no incremental deliverable at M2; M1 pins still in force)*

### Docs (Scribe, Guide)

- **Scribe — `docs/sku-mapping.md` LIVE (Jury M6):** Forge maintains; Compass reviews.
- **Scribe:** `docs/managed-onboarding.md` for non-technical solo-founder persona.
- **Guide:** Managed-tier first-run tour.

### Growth (Signal, Lens, Herald, Hook)

- **Hook — Conversion measurement:** instrument paid-tier signup funnel; A/B-test slot at $19 ready if D4 lands at "ship $29 default."
- **Lens — Analytics:** UTM passthrough verified end-to-end; signup attribution captured; conversion events firing post-cookie-consent.
- **Herald — Pricing page copy:** locked v0.4 per PRD §12; substantiation references comparable competitors per §3a.

### Operations (Echo, Ledger, Comply)

- **Comply + Ledger — GDPR Art. 28 DPA template LIVE (#17):** `compliance/dpa-template.md` published; `/subprocessors` route serves the list with `Last-Modified` header; 30-day change-notification process documented + dry-run.
- **Comply — D22 EU 14-day cooling-off reset in TOS:** legal copy live before first paid charge.
- **Comply — Regional refund matrix LIVE (#20):** EU/UK/CA/FTC paths gated by `subscriptions.region`; dispute path before chargeback escalation.
- **Ledger — Stripe Customer Portal:** cancel-in-same-channel-as-signup (R20 / FTC 16 CFR 425).

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 M2 exactly. M0 + M1 gates remain green; add:

- [ ] `tests/security/prompt-injection-corpus.spec.ts` green — 100% of ≥200 patterns handled correctly: no outbound HTTP outside egress allowlist; verdict never flipped FAIL→PASS; LLM-gateway JWT is the only credential in any traceable scope.
- [ ] `tests/security/sandbox-escape-top30.spec.ts` green — top-30 patterns in `runner/fixtures/sandbox-escape-corpus/` blocked at rootless container + seccomp + dropped-caps boundary.
- [ ] `tests/load/per-tenant-token-cap.k6.js` green — 100 concurrent Managed runs sustained 30 min; cap fires; `429 / token_budget_exceeded`; alert emitted.
- [ ] `tests/integration/stripe-checkout-and-webhook.spec.ts` green — Stripe Checkout completes; webhook signature verified; subscription row created idempotently (replay produces no duplicates).
- [ ] `tests/acceptance/goal-4-three-modes.spec.ts` green for BYOK + Managed lanes (CLI lane stubbed for M3).
- [ ] `tests/integration/cross-mode-consistency.spec.ts` green — BYOK vs Managed identical `(score, verdict)` on fixture repo.
- [ ] `compliance/dpa-template.md` + `/subprocessors` route published; integration test asserts route serves with `Last-Modified` header. (#17.)
- [ ] EU 14-day cooling-off reset test green — `tests/integration/eu-cooling-off-reset.spec.ts` (D22).
- [ ] `tests/integration/jury-synth-stall.spec.ts` green (D21) — synth stall >30s → `failed_synth_timeout` → refund → restart.
- [ ] `tests/integration/stripe-reconcile-race.spec.ts` green (ARCH-D4).
- [ ] **Realtime fan-out load test** green — 90 concurrent runs × ~24 events/sec for 5 min; p95 event-delivery < 500ms (ARCH-D5).
- [ ] **Self-dogfood gate M2:** `audits/m2.json` = PASS or PASS WITH FIXES.
- [ ] `0003_billing_managed.sql` applies cleanly to staging.
- [ ] **Compass AH-6 closed (Jury M5):** `projects.client_tag` in `0003_billing_managed.sql`; UI wired.
- [ ] **Jury M6 closed:** `docs/sku-mapping.md` published, Compass-reviewed.
- [ ] **R21 mitigation (c) — Managed-tier alpha ≥5 paying customers LIVE** (hard gate, not Sprint default). Signal + Penny + Atlas drive alpha recruitment from M0 build-in-public audience. Metric: `subscriptions.status IN ('active','trialing') AND plan_family IN ('managed_starter','managed_pro') >= 5`. Pulls MRR forward 7 weeks. **If <5 paying alpha at M2 close: R21 triggers — Jo bridges $15-25k or M2 re-baselines.**

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| R1 | LLM cost overrun in Managed tier | High | High | Meter (caps + alerts) + Forge (impl) + Crash (auto-pause) | M2 close — load test fires the cap; alert routes to Watch |
| R10 | Pricing positioning misread (commodity vs premium) | Medium | Medium | Penny (revisit after first 5 paying customers) | M2 close — first paying customers acquired; data feeds back to Penny |
| R17 | D4 unresolved at M2 ticket-cut | Medium | Medium | Penny + Jo (decide by week 7) | M2 ticket-cut — default $29 + A/B slot |
| R20 | FTC Click-to-Cancel (16 CFR 425) compliance late | Low | High | Comply + Ledger (UI must allow cancel in same channel as signup) | M2 — Stripe Customer Portal cancel UX |
| **R21** | **Cash-runway crunch — Managed-tier alpha <5 paying at M2 close** | High | Critical | Signal + Penny + Atlas (alpha recruitment from M0+ build-in-public audience); Meter (cash-reserve tracking) | M2 close — hard exit gate. If miss → Jo bridges $15-25k or M2 re-baselines +4 weeks. |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 M2 row:

- **D4** Starter pricing $19 vs $29 — **Jo + Penny. Hard deadline: M2 ticket-cut (week 7).**
- **#17** GDPR Art. 28 DPA + subprocessor list — Comply + Ledger.
- **#20** Regional refund matrix — Comply + Ledger + Forge.
- **D21** Jury synth stall → `failed_synth_timeout` — Atlas + Trace + Forge.
- **D22** EU cooling-off resets per upgrade — Comply + Ledger.
- **ARCH-D4** Stripe webhook reconciliation — Ledger + Forge.
- **ARCH-D5** Realtime fan-out budget — Stream + Atlas + Crash.
- **Jury M5** `projects.client_tag` column — Compass + Atlas.
- **Jury M6** SKU plain-English mapping doc — Forge + Compass.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 7 | **D4 decision needed by EoW** (Jo's call); Stripe Checkout integration; `0003_billing_managed.sql` drafted; PI corpus to 200 | | | |
| 8 | Sandbox-escape top-30 green; per-tenant token cap load test green; M3 ticket-cut scoping (external pentest engagement reconfirmed) | | | |
| 9 | Cross-mode consistency green; DPA + subprocessors live; D21/D22 tests green; self-dogfood gate M2 | | | |

## Open questions

For BigBrain to resolve before M2 closes:

- (none mandatory if D4 lands at week 7)

## Cross-references

- PRD §16 M2 row + §12 pricing + §14.5 compliance (#17, #20) + §14.2 (D21).
- `architecture/test-strategy.md` §3 M2 gates.
- `architecture/decisions.md` ARCH-D4, ARCH-D5.
- `architecture/database/migration-order.md` `0003_billing_managed.sql` row.
- `ia/user-flows/billing-and-cancel.md` (becomes real at M2).
- `ia/user-flows/audit-run-state-machine.md` D21 synth-stall path (becomes real at M2).
- `ia/user-flows/verdict-to-upsell-loop.md` E2 upsell completes here (started M1).
- `shared_context/projects/studio-zero-productization/decisions.md` PRD-v0.5-C1, C2 (= D21, D22).
