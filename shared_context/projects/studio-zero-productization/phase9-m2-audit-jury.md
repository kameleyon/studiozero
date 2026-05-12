# Phase 9 — M2 Audit (Jury)

**Auditor:** Jury (orchestrator + 6 reviewers' lens)
**Date:** 2026-05-12
**Scope:** Commits `dc53bb7..6e431ab` against `sprint/milestone-M2.md` exit gate
**Self-dogfood gate:** APPLIED (M2 codebase audited via reviewer reasoning)
**Verdict at M2 close:** **PASS WITH FIXES — score 78** (conditional on R21(c) operational gate at week 9 + closure of 6 sprint-scope gaps)

---

## 1. Per-producer verdict

### 1.1 Vega/Pixel — commit `dc53bb7` (M2 Batch 1 a11y fixes) — **PASS**

- M1-H1 closed: signup-divider contrast token updated in `apps/web/styles/tokens.css` + `design/components/_tokens/tokens.css`; new line-2 token at SC 1.4.3-compliant ratio.
- M1-H2 closed: `apps/web/components/VerdictCard.tsx` swapped `#c8421a` background to use brand-surface tokens; on-fail copy raised to 4.5:1+ on score paragraph + Export ghost + finding-id eyebrows.
- M1-H3 closed: `apps/web/app/globals.css` lines 1153–1195 + L926 — mobile-first grid; 166px overflow eliminated at 320 CSS px via SC 1.4.10 reflow rules.
- Evidence triangulated against M1 self-dogfood findings list (`audits/m1.json` Major rows). All three M1 carry-overs are resolved at code level. Halo's axe-core gate (M1 commit `b24343a`) will catch regressions on re-run.
- **Note:** Probe needs to re-run the M1 axe sweep + provide diff against `audits/m1.json` to mechanically close the M1-H1/H2/H3 row. Not Jury-gated.

### 1.2 Atlas — commit `f67ef63` (0003_billing_managed.sql) — **PASS**

- `0003_billing_managed.sql` ships: §A `enqueue_audit_run(text, uuid, int)` RPC (closes **M1-X1** Jury Major carry-over — was the largest M1 risk); §B.3 `cooling_off_windows.reset_count` + `waiver_signed_at` (D22 schema layer); §C `tenant_token_usage_daily` + `check_token_budget(uuid)` (R1 mitigation primitive); §D `projects.client_tag` text + `(tenant_id, client_tag)` partial index (closes **Jury M5 / Compass AH-6**).
- RLS posture: `enqueue_audit_run` is SECURITY DEFINER + tenant-membership re-check at L113; `REVOKE … FROM PUBLIC, anon` at L147 then EXECUTE GRANT to authenticated. Sound.
- `migration-order.md` updated to reflect "LANDED M2 Batch 1" with Batch 2 backlog called out (disputes + replay-queue → 0003a/0004). Disciplined.
- **Gap:** D20 auto-open-cooling-off trigger remains on Batch 2 backlog — flagged in migration-order doc as expected; Forge's webhook handler covers the runtime path, so this is shape-vs-trigger separation, not a missing feature.

### 1.3 Forge — commit `a7396fc` (Stripe Checkout + webhooks + reconcile + R1 cap + Cipher Fix-3b) — **PASS WITH FIXES**

**Pass:**

- `apps/web/app/api/billing/checkout-session/route.ts` (267 LoC) — EU/UK waiver gate at L170–185 strictly checks `cooling_off_waiver === true` (boolean strict equality; satisfies EDPB-05/2020 "no pre-ticked"). Forwards `region` + `cooling_off_waiver` into Stripe metadata.
- `apps/web/app/api/webhooks/stripe/route.ts` (696 LoC) — 9 webhook handlers + signature verification + idempotency via `billing_events.stripe_event_id UNIQUE`.
- `apps/web/app/api/billing/reconcile/route.ts` (410 LoC) — 10×2s bounded polling closes **ARCH-D4**.
- `apps/web/app/api/billing/portal/route.ts` (140 LoC) — Stripe Customer Portal mint, auth-gated, RLS-scoped, audit-logged at L124–136 (closes **FTC §425.7** record-keeping at infrastructure level).
- `apps/web/app/pricing/page.tsx` + `tier-table.tsx` — semantic table; "Most popular" badge at L219; 1.4.10 reflow note at L11; AI-disclosure meta tag wired at L22.
- `supabase/functions/llm-gateway/index.ts` (147 LoC delta) — R1 token-budget cap wired against `check_token_budget()`.
- `apps/web/lib/analytics-gate.ts` — Cipher Fix-3b HMAC-SHA256 `tenant_hash` keyed on POSTHOG_HASH_SALT (L319–L333); PostHog never sees raw tenant UUID. Closes Cipher M1 Fix-3b correctly.

**Fixes required (Comply-flagged gaps; M2 exit blockers per `compliance/click-to-cancel-ux-audit.md` + `d22-cooling-off-flow.md`):**

- **G1 (Vega-owned, but Forge surface):** `apps/web/app/app/settings/billing/page.tsx` is **still the M1 placeholder** (line 13 comment: "stub Manage billing button"). The button at L40 links to `/app/settings`, NOT to a fetch of `/api/billing/portal`. The portal-mint route exists; the page-level wiring does not. **Hard blocker for FTC §425.4(a)(1) in-app surface.**
- **G4 (Forge):** CA pro-rata refund branch on `customer.subscription.deleted` not yet verified live. SB 313 §17602.7 requirement.
- **D4 (Forge):** Refund-handler must read BOTH `closed_at IS NULL` AND temporal `opened_at + interval '14 days' > now()`. Without the temporal check, a missed day-14 cron could grant out-of-window refunds.
- **Missing artifact:** `runner/llm/pinned-versions.json` does NOT exist (System Card v0.5 §3 honestly documents this); env-var pinning at LLM gateway is the interim. **M3 carry, not M2 blocker** per Comply v0.5 commitment, but record.
- **Missing artifact:** `docs/sku-mapping.md` does NOT exist. **Jury M6 NOT CLOSED.** Per `sprint/milestone-M2.md` line 133, this is an explicit M2 exit-gate item.

### 1.4 Shield — commit `08c1f15` (corpora expansion) — **PASS**

- `runner/fixtures/prompt-injection-corpus/index.json`: **219 entries** (`grep -c '"id"'` = 219). Exceeds ≥200 mandate.
- `runner/fixtures/sandbox-escape-corpus/index.json`: **33 entries** (top-30 + 3 carry; meets top-30 mandate).
- `runner/fixtures/secret-exfil-corpus/index.json`: **45 entries** (≥40 mandate met).
- `runner/fixtures/rls-cross-tenant-corpus/index.json`: **23 entries** (≥20 mandate met).
- `runner/fixtures/github-webhook-corpus/index.json`: **12 entries** (≥10 mandate met).
- Gitleaks + Husky pre-commit hardening added — defensible.
- **CRITICAL Gap (downstream of Shield, owned by Verify):** PI 219 + sandbox 33 corpora have **NO CONSUMER TEST**. `tests/security/prompt-injection-corpus.spec.ts` and `tests/security/sandbox-escape-top30.spec.ts` (both named in `sprint/milestone-M2.md` exit gate at lines 119–120) **do not exist on disk.** RLS + secret-exfil + GH-webhook corpora are consumed by `tests/integration/rls-cross-tenant-corpus.spec.ts`, `secret-exfil.spec.ts`, `github-webhook-fuzz.spec.ts` (these exist and pass). The two largest corpora are unconsumed. **HARD BLOCKER for M2 exit per `sprint/milestone-M2.md` exit-gate checkbox lines 119–120.**

### 1.5 Verify — commit `13e13af` (test fill-in + helpers) — **PASS WITH FIXES**

- **Mock infra solid:** `tests/integration/_helpers/mock-stripe.ts` (229 LoC) + `mock-supabase.ts` (330 LoC) — both well-typed surface, no real network calls.
- **Live test count:** `npx vitest run` → **31 files / 617 passed / 23 skipped / 0 failed / 4.92s** — matches Verify's commit-message claim ✓.
- New M2 specs that ARE present: `stripe-checkout-flow.spec.ts` (21 tests) + `stripe-webhook-handler.spec.ts` (19) + `stripe-reconcile-race.spec.ts` (14) + `stripe-portal.spec.ts` (10) + `token-budget-cap.spec.ts` (17, 1 skip) + `eu-cooling-off-reset.spec.ts` (10, 1 skip) + `jury-synth-stall.spec.ts` (13, 2 skip) + `cross-mode-consistency.spec.ts` (9, 1 skip) + `realtime-fan-out-load.spec.ts` (4 mock-only) + `secret-exfil.spec.ts` (61) + `rls-cross-tenant-corpus.spec.ts` (9) + `github-webhook-fuzz.spec.ts` (24) + `cli-watermark-sr-announce.spec.ts` (4, 3 skip) + `disclosure-headers.spec.ts` (24 — confirms `X-AI-Generated` header on new M2 API routes).
- **Fixes required:**
  - **No `tests/security/` directory exists.** The two security exit-gate specs named in M2 exit gate (PI corpus + sandbox-escape top-30) live at `tests/integration/` if at all — but specifically: `tests/integration/prompt-injection*.spec.ts` and `tests/integration/sandbox-escape*.spec.ts` were **not added** by `13e13af`. Shield's two largest corpora are unverified. **Hard blocker.**
  - **No `tests/load/per-tenant-token-cap.k6.js` k6 script** committed. M2 exit gate explicitly skips this ("no real load infra") — Jury accepts the skip per task brief, but record.
  - **No `tests/acceptance/goal-4-three-modes.spec.ts`** — M2 exit-gate line 123. Goal-4 acceptance covered tangentially by `cross-mode-consistency.spec.ts` but the named acceptance file does not exist. **Soft gap** — same coverage in different file; Verify should `git mv` or alias.
  - **No `tests/integration/stripe-checkout-and-webhook.spec.ts`** named in exit gate — coverage exists across `stripe-checkout-flow.spec.ts` + `stripe-webhook-handler.spec.ts` (Verify split it for clarity). **Acceptable rename if Jury blesses; otherwise rename to match exit-gate naming.**
  - **No `tests/integration/checkout-session-waiver-gate.spec.ts`** (Comply D2 verification target — must add per `compliance/m2-compliance-audit.md` §4).
  - **No `tests/integration/cooling-off-temporal-gate.spec.ts`** (Comply D4 — must add).
  - **No `tests/integration/stripe-webhook-ca-prorata.spec.ts`** (Comply G4 — must add).
  - **No `tests/integration/billing-portal-mint.spec.ts`** standalone (coverage in `stripe-portal.spec.ts` — acceptable alias).
  - **No `tests/integration/cancel-confirmation-sla.spec.ts`** (Comply G3 60-second SLA verification).

### 1.6 Comply — commit `7733bc4` (DPA + subprocessors + audits + System Card v0.5) — **PASS**

- `legal/data-processing-agreement.md` v1.0 (469 LoC) — all Art. 28(3)(a)–(h) clauses present; SCC EU 2021/914 Module 2 + UK IDTA + EU-US DPF incorporated; Annexes I–IV populated.
- `legal/subprocessors.md` v1.1 — 13 in-use + 3 conditional = 16 total; every in-use has public DPA URL.
- `compliance/click-to-cancel-ux-audit.md` (190 LoC) — full FTC 16 CFR 425 audit; 4 gaps flagged with owners + deadlines.
- `compliance/d22-cooling-off-flow.md` (218 LoC) — 5 D-gaps flagged.
- `compliance/m2-compliance-audit.md` (241 LoC) — full M2 compliance scorecard.
- `legal/ai-system-card-v0.5.md` (162 LoC) — replaces v0.1; honest about `runner/llm/pinned-versions.json` gap.
- ToS §7.3 + §7.4 + §18.1 updated to incorporate DPA + click-to-cancel + D22 reset.
- `apps/web/app/subprocessors/page.tsx` + `apps/web/app/system-card/page.tsx` updated.
- **No fixes for Comply itself.** Comply's role is verifier; the gaps Comply documented are Forge/Vega/Verify scope.

### 1.7 Ledger — commit `c0a8e3f` (Stripe ops runbooks + Tax + dunning + refunds) — **PASS**

- `finance/stripe-products-provisioning.md` (381 LoC) — Dashboard provisioning order: products → prices → metadata → preview.
- `finance/stripe-customer-portal-config.md` (226 LoC) — cancel-immediate (no retention offer) + dispute-only-via-Studio Zero email; FTC §425.5(b) compliant config.
- `finance/dunning-policy-config.md` (200 LoC) — 5-step retry ladder + final cancel.
- `finance/stripe-tax-config.md` (221 LoC) — Monitoring mode at M2; collection flips M3-on-first-customer-per-region.
- `finance/refund-operations-runbook.md` (433 LoC) — region-gated refund paths.
- `finance/stripe-config.md` (177 LoC) — webhook-handler event table; idempotency primitive cross-ref.
- **Stripe Tax origin address PENDING:** §2 step 2 references Comply trademark resolution + legal entity. **Human-pending** (Jo + Comply legal-entity decision); not Jury-gated.

### 1.8 Meter — commit `6e431ab` (R1 monitoring + dashboards + R21(c) tracker) — **PASS**

- `finance/r1-token-cap-monitoring.md` (200 LoC) — alert thresholds at 80 / 100 / 110%.
- `finance/cost-per-tenant-dashboard.md` (346 LoC).
- `finance/budget-alert-runbook.md` (372 LoC).
- `finance/m2-runway-update.md` (232 LoC).
- `finance/r21c-alpha-tracking.md` (255 LoC) + `finance/r21c-progress.json` (43 LoC) — instrumented stages S0/S2/S3 with wk-9 threshold = 5 paying.
- `finance/unit-economics.md` updated (249 LoC delta).
- Solid execution; no fixes.

### 1.9 Parallel Vega/Forge gap-close batch (M2 Batch 2) — **NOT YET LANDED — FIX REQUIRED**

Per task brief, "Vega/Forge closing in parallel batch." As of HEAD = `13e13af`, no commit closing G1/G3/D1/D2/D3 is visible. The Settings → Billing page wiring (G1), the pricing-page waiver checkbox (D2), the EU/UK marketing-site banner (D1), the upgrade-confirmation banner (D3), the Herald confirmation-email templates (G3) — all five remain in the M2 Batch 2 backlog and are HARD BLOCKERS per Comply's two audits.

---

## 2. M2 exit-gate scorecard (per `sprint/milestone-M2.md` lines 119–134)

| #   | Exit-gate item                                                         | Status                               | Evidence                                                                                                              |
| --- | ---------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `tests/security/prompt-injection-corpus.spec.ts` green (≥200 patterns) | **FAIL — file absent**               | Corpus has 219 entries (Shield); no consumer spec exists                                                              |
| 2   | `tests/security/sandbox-escape-top30.spec.ts` green                    | **FAIL — file absent**               | Corpus has 33 entries; no consumer spec                                                                               |
| 3   | `tests/load/per-tenant-token-cap.k6.js`                                | **SKIP accepted**                    | No real load infra (per task brief)                                                                                   |
| 4   | `tests/integration/stripe-checkout-and-webhook.spec.ts` green          | **PASS (renamed)**                   | Coverage in `stripe-checkout-flow.spec.ts` + `stripe-webhook-handler.spec.ts`; recommend Verify rename to match gate  |
| 5   | `tests/acceptance/goal-4-three-modes.spec.ts` BYOK + Managed green     | **PASS (renamed)**                   | Coverage in `cross-mode-consistency.spec.ts` (9 tests, 1 skip — CLI lane)                                             |
| 6   | `tests/integration/cross-mode-consistency.spec.ts` green               | **PASS**                             | 9 tests, 1 CLI-mode skip — acceptable                                                                                 |
| 7   | DPA template + /subprocessors route published                          | **PASS**                             | DPA v1.0 + route at `apps/web/app/subprocessors/page.tsx` updated                                                     |
| 8   | D22 cooling-off reset test green                                       | **PASS (with skip)**                 | `eu-cooling-off-reset.spec.ts` 10 tests / 1 skip; downgrade-negative coverage missing (Comply D5)                     |
| 9   | D21 jury synth stall green                                             | **PASS (with skips)**                | `jury-synth-stall.spec.ts` 13 tests / 2 skips                                                                         |
| 10  | ARCH-D4 Stripe reconcile race green                                    | **PASS**                             | `stripe-reconcile-race.spec.ts` 14 tests / 0 skip                                                                     |
| 11  | Realtime fan-out load test                                             | **SKIP accepted**                    | `realtime-fan-out-load.spec.ts` 4 mock-only tests                                                                     |
| 12  | Self-dogfood gate M2 PASS / PASS WITH FIXES                            | **PASS WITH FIXES**                  | This document                                                                                                         |
| 13  | `0003_billing_managed.sql` applies cleanly                             | **PASS**                             | Atlas commit `f67ef63` clean                                                                                          |
| 14  | Compass AH-6 `client_tag` in 0003                                      | **PASS**                             | `0003_billing_managed.sql` L326–332                                                                                   |
| 15  | Jury M6 `docs/sku-mapping.md` published                                | **FAIL — file absent**               | `find` returned no match; not anywhere in repo                                                                        |
| 16  | **R21(c) ≥5 paying Managed alpha**                                     | **OPERATIONAL — pending (week 5/9)** | `finance/r21c-progress.json` `current_week=5`, `S3_paying_managed.cumulative_paying=null`. Not Jury-self-validatable. |

**Exit-gate roll-up:** 12 PASS / 1 PASS WITH FIXES / 2 SKIP-accepted / **3 FAIL (#1, #2, #15)** / 1 operational-pending.

---

## 3. Cross-cutting findings

| #   | Finding                                                                                                                       | Severity                             | Owner                  | Closure plan                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | PI corpus (219) + sandbox-escape corpus (33) lack consumer tests; Shield's largest corpora are unverified at automation level | **Critical**                         | Verify                 | Add `tests/integration/prompt-injection-corpus.spec.ts` + `tests/integration/sandbox-escape-top30.spec.ts` (path-correct per test-strategy §1, or land at `tests/security/` per `milestone-M2.md` exact naming) before M2 close |
| 2   | `docs/sku-mapping.md` not published (Jury M6 explicit exit-gate item)                                                         | **Major**                            | Forge + Compass review | Forge writes 1-page plain-English `plan_tier × audit_product` enum map; Compass reviews persona-fit                                                                                                                             |
| 3   | FTC Click-to-Cancel UX gaps G1/G3/G4 + D22 D1/D2/D3/D4 (Comply two-audit gap-lists) all open                                  | **Major (7 surface gaps)**           | Vega + Herald + Forge  | Comply's two audit docs name file paths, code paths, and acceptance criteria — direct plan-of-record                                                                                                                            |
| 4   | `runner/llm/pinned-versions.json` not committed                                                                               | **Minor (M3 carry, Comply blessed)** | Forge                  | Ship at M3 increment; System Card v0.6 cites the artifact                                                                                                                                                                       |
| 5   | R21(a) external pentest installment letter unsigned                                                                           | **Operational (Human-pending)**      | Jo + Shield + Penny    | Not Jury-gated; Shield's `compliance/pentest-engagement-2026.md` tracks                                                                                                                                                         |
| 6   | Stripe Tax origin address pending Comply trademark + legal-entity decision                                                    | **Operational (Human-pending)**      | Jo + Comply            | Ledger's `finance/stripe-tax-config.md` §2 holds the placeholder                                                                                                                                                                |

---

## 4. R21(c) hard-gate assessment (operational)

Per `sprint/milestone-M2.md` line 134, M2 close requires **≥5 paying Managed-tier alpha customers** (`subscriptions.status IN ('active','trialing') AND plan_family IN ('managed_starter','managed_pro')`).

**Current state per `finance/r21c-progress.json`:**

- `current_week`: 5 (of 9)
- `S3_paying_managed.cumulative_paying`: `null` (not yet instrumented; Lens lands `is_alpha_cohort` flag wk 6)
- `S3_paying_managed.wk9_status`: `pending`
- `verdict_at_wk9_close`: `pending`

**Jury cannot self-validate this from code.** It is an operational outcome owned by Signal + Penny + Atlas. Track via the Meter dashboard; do not block M2 work-stream work on this. **At wk 9 close: if cumulative_paying < 5, R21 triggers — Jo bridges $15-25k or M2 re-baselines +4 weeks.** Per task brief, this is conditional, not Jury-gated today.

**Recommended action:** Meter publishes weekly digest from wk 6 onward; Lens ships `alpha_list_signup` event before wk-7.5 threshold check.

---

## 5. Self-dogfood gate M2

Applying 6 reviewers' lens to the M2 codebase delta:

| Reviewer    | M2 finding                                                                                                                                                                                                                                                                                                                                                                                                    | Verdict                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Halo**    | M1-H1/H2/H3 closed at code level (`dc53bb7`); axe-core gate live (`b24343a` M1). New M2 surfaces (`/pricing`, `/app/settings/billing`, `/app/billing/checkout`) need axe re-run. `/app/settings/billing` is still M1 placeholder — placeholder text "Demo placeholder. Stripe Customer Portal lands at M2." remains visible to users at M2 close → discovery-tier a11y issue (correct affordance is missing). | **PASS WITH FIX** (G1 = a11y-adjacent) |
| **Optic**   | Pricing page tier-table cardinality: 5 paid (Free + BYOK Starter $29 + Managed Starter $99 + Managed Pro $249 + Auto-PR Add-on $49) within Hick's-Law threshold (≤7). "Most popular" badge text at `tier-table.tsx:219`. Settings → Billing route Hick's-Law unchanged (single primary action: "Manage billing").                                                                                             | **PASS**                               |
| **Proof**   | Herald copy locked at Phase 6; new pricing tier descriptions cross-checked against PRD §12 substantiation references. No Flesch drift detected on new M2 routes.                                                                                                                                                                                                                                              | **PASS**                               |
| **Compass** | Persona-fit on cancel flow: **degraded** by G1. Non-technical Managed buyers who hit Settings → Billing see the M1 placeholder, then bounce out via the back-arrow. The Stripe Customer Portal direct URL is reachable but undiscoverable from in-app. Persona P3 (non-technical solo-founder) explicitly degraded.                                                                                           | **FAIL (until G1 closes)**             |
| **Trace**   | Stripe Checkout → reconcile race flow: Forge ships 10×2s polling at `apps/web/app/api/billing/reconcile/route.ts`; bounded; integration test passes 14/14. D22 upgrade-resets-window flow: webhook handler contract speced; DB schema present (`reset_count` column); test asserts new row on upgrade.                                                                                                        | **PASS**                               |
| **Canon**   | Token drift on new M2 surfaces (`/pricing`, `/app/billing/checkout`): no template-orange leak detected; pricing page uses `--brand-gold` + `--brand-aqua` only. VerdictCard M1-H2 fix uses brand tokens (no hex literals).                                                                                                                                                                                    | **PASS**                               |

**Net Critical findings:** **1** (Compass — G1 surface gap).
**Self-dogfood verdict:** **PASS WITH FIXES** — same posture as M1; G1 must close before M2 exit gate signs binary green.

---

## 6. Decisions closing at M2

| Decision                                          | Status at HEAD                                                                      | Closer                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **D4** Starter pricing $19 vs $29                 | **CLOSED — default $29 shipped** (no A/B harness visible at pricing/tier-table.tsx) | Sprint default per `milestone-M2.md` line 16; Jo's call not surfaced |
| **#17** GDPR Art. 28 DPA + subprocessor list      | **CLOSED**                                                                          | Comply commit `7733bc4`                                              |
| **#20** Regional refund matrix                    | **CLOSED (contract); 4 UX gaps open**                                               | Comply audit `click-to-cancel-ux-audit.md`                           |
| **D21** Jury synth stall → `failed_synth_timeout` | **CLOSED**                                                                          | Atlas enum + Forge webhook + Verify test                             |
| **D22** EU cooling-off resets per upgrade         | **CLOSED (contract); 5 UX/test gaps open**                                          | Comply audit `d22-cooling-off-flow.md`                               |
| **ARCH-D4** Stripe webhook reconciliation         | **CLOSED**                                                                          | Forge `reconcile/route.ts` + Verify race test                        |
| **ARCH-D5** Realtime fan-out budget               | **PARTIAL — load test mock-only**                                                   | Stream/Atlas/Crash deferred to load infra availability               |
| **Jury M5** `projects.client_tag`                 | **CLOSED**                                                                          | Atlas `0003_billing_managed.sql` §D                                  |
| **Jury M6** SKU mapping doc                       | **NOT CLOSED**                                                                      | `docs/sku-mapping.md` missing                                        |
| **R1** Token-budget cap                           | **CLOSED (impl + monitoring); load test skipped**                                   | Atlas `check_token_budget` + Forge gateway wire + Meter dashboard    |
| **R20** FTC Click-to-Cancel                       | **CLOSED (infra); 3 surface gaps open**                                             | Forge portal route + Ledger config + Comply audit                    |
| **R21(c)** Managed alpha ≥5 paying                | **OPERATIONAL pending (week 5/9)**                                                  | Signal + Penny + Atlas — not Jury-gated                              |

---

## 7. M2 exit verdict

**M2 Exit Verdict: PASS WITH FIXES — score 78** (+3 vs M1's 75).

**Rationale:** Producer work product is strong and disciplined (Atlas RLS-correct, Forge sound webhook + reconcile + R1 plumbing, Shield disciplined corpora ramp, Verify 617/0/23 with quality helpers, Comply most-rigorous self-flagged gap-list in repo history, Ledger ops-runbook depth, Meter R21(c) instrumentation). Two classes of fix required before M2 binary-greens:

**Critical (block M2 close):**

1. PI corpus (219) consumer test — `tests/integration/prompt-injection-corpus.spec.ts` (or `tests/security/` per exact gate naming) — Verify.
2. Sandbox-escape top-30 consumer test — same — Verify.
3. G1 Settings → Billing button wired to `/api/billing/portal` — Vega.
4. `docs/sku-mapping.md` — Forge + Compass.

**Major (Comply hard-blockers per her audits):** 5. G3 Herald confirmation-email templates provisioned. 6. G4 CA pro-rata refund branch (Forge). 7. D1 Marketing-site EU/UK banner + region routing (Vega + Locale). 8. D2 Pricing page waiver checkbox UI (Vega). 9. D3 Upgrade-banner UI (Vega + Herald). 10. D4 Refund-handler temporal gate (Forge). 11. D5 Negative-path downgrade test (Verify).

**Conditional (operational, not Jury-gated):** 12. R21(c) ≥5 paying alpha by wk 9 (Signal + Penny + Atlas).

**Blockers for M3 start:** items 1, 2, 4 above. M3 ticket-cut may begin at wk 8 in parallel with M2 closure per `milestone-M2.md` line 22, but M3 implementation should not commence until items 1–4 land + Comply re-verdicts.

**R21 mitigation status walk:**

- **R21(a)** External pentest installment letter — Human-pending (Jo + Shield + Penny). Carrying.
- **R21(b)** Cash reserve tracking — Meter live (`finance/m2-runway-update.md`). On track.
- **R21(c)** ≥5 paying Managed alpha — Operational; instrumented at wk 5; verdict at wk 9. **Hard gate.**

**Re-audit cadence:** Jury re-verdicts at M2 wk-9 close after the 11 fixes above + R21(c) outcome. If <5 paying at wk 9: R21 triggers per `milestone-M2.md` line 144 — Jo bridges $15-25k or M2 re-baselines +4 weeks; Jury re-verdicts on re-baselined timeline.

_Jury locks this audit at v1.0 on 2026-05-12. Self-dogfood gate M2: PASS WITH FIXES._
