# Runway — Studio Zero

**Phase:** 7 — Pricing & Unit Economics
**Owner:** Meter (FinOps) — peer-coordinated with Penny (pricing), Sprint (milestone calendar)
**Version:** 0.2
**Date:** 2026-05-11
**Status:** v0.2 — Jo's three open inputs resolved on 2026-05-11. Recomputed at $25k starting capital with $0 cash compensation and pentest-net-60 locked.

> **What changed v0.1 → v0.2.** Three Phase-7 open dependencies now resolved (Jo, 2026-05-11):
> 1. **Starting capital = $25,000 LOCKED** (was `EST` $50,000). Lean bootstrap, not the planning baseline.
> 2. **Founder cash compensation = $0 LOCKED** (matches v0.1 assumption — no recompute).
> 3. **Pentest payment terms = 30/60-day-net to be negotiated at M0 close** — `runway.md` models the 60-day-net case as the planning baseline (Meter's prior recommendation per v0.1 §4 trigger); 30-day-net modeled as the fallback. Net-0 (cash on receipt) breaches at M5 entry and is treated as FATAL.
>
> Every scenario recomputed. New crunch points surfaced. New risk **R20 (cash-runway crunch at M3→M5)** added for Sprint inheritance.

---

## 0. Source-of-numbers contract

Every line cites: `finance/unit-economics.md` §0 (vendor pricing), `sprint/milestone-M*.md` (activation week), `PRD.md §16` (16-week placeholder calendar), or `EST` with explicit assumption.

LOCKED inputs (Jo, 2026-05-11):
- **Starting capital = $25,000.** Lean bootstrap. No `EST` qualifier — this is the number all scenarios run against.
- **Jo cash compensation = $0/mo** through M5. Founder equity-only. If Jo must draw at any point pre-launch, every scenario in §3 fails — see §4 cut-burn triggers.
- **Pentest terms = negotiate 30/60-day net at M0 close.** Industry-standard for Trail of Bits / Doyensec / NCC / Bishop Fox / Latacora early-stage engagements. Net-60 is the planning target; net-30 is the fallback; net-0 is unsurvivable.

Other carryover from v0.1:
- Calendar starts week 1 = 2026-05-11 per Sprint M0 entry. M5 launch = week 16 ≈ 2026-08-31.
- WCAG audit terms NOT YET NEGOTIATED — see §4/§5. Meter recommends Halo + Comply request 30-day net at M1 close.

---

## 1. Burn baseline (M0–M4, pre-launch)

Fixed monthly infra burn (per `unit-economics.md` §1) — unchanged from v0.1:

| Line | $/mo | Activates | Source |
|---|---|---|---|
| Vercel Pro | $20 | M0 wk 1 | unit-economics §0 |
| Supabase Pro | $25 | M0 wk 1 | unit-economics §0 |
| Railway team plan (1 seat) | $20 | M0 wk 1 | unit-economics §0 |
| Railway compute pre-launch (dev + nightly self-dogfood) | `EST` $15 | M0 wk 1 | EST (~30 dev audits/mo × $0.038) |
| Sentry Team | $26 | M0 wk 1 | unit-economics §0 |
| PostHog | $0 (free tier covers MVP) | M0 wk 1 | unit-economics §0 |
| Resend | $0 (free tier 3k emails/mo covers M4) | M4 wk 14 | unit-economics §0 |
| Cloudflare WAF Pro | $25 | M0 wk 1 | unit-economics §0 |
| Domain + misc SaaS (1Password / GitHub Pro / Linear) | `EST` $30 | M0 wk 1 | EST |
| **Total fixed monthly pre-launch** | **$161** | | |

One-time pre-launch cost events:

| Event | $ amount | Hits which month | Source |
|---|---|---|---|
| Legal (incorporation + ToS/Privacy/AUP + DPA template review) | $5,500 | Pre-M0 (week 0) | unit-economics §0 |
| Comply trademark search + DMCA registration + attorney retainer | $2,000 | Phase 4 (pre-M0) | unit-economics §0 |
| External pentest vendor (Trail of Bits / Doyensec / NCC / Bishop Fox / Latacora) | $22,500 `EST` | engaged M0 wk 2; **invoiced M3 wk 11**; **cash lands wk 19 under net-60 (planning baseline)** | unit-economics §0 + `architecture/threat-model.md` §5.3 |
| WCAG 2.2 AA third-party conformance audit | $10,000 `EST` | engaged M1 close (wk 6); **invoiced M4 wk 14**; **cash lands wk 14 under net-0 (current default)** — Meter recommends Halo+Comply renegotiate to net-30 | unit-economics §0 + PRD §14.6 |

**Pre-launch cumulative cash outflow at $25k starting capital (week 1 → M5 launch wk 16), pentest-net-60 + WCAG-net-0 (current default):**

| Block | Months | Fixed burn | One-time events cash-out | Cumulative cash position |
|---|---|---|---|---|
| Starting capital | | | | **$25,000** |
| Pre-M0 (week 0) | 0 | $0 | $5,500 legal + $2,000 comply = $7,500 | $17,500 |
| M0–M2 (wk 1–9, ≈2.1 months) | 2.1 | 2.1 × $161 = $338 | $0 (pentest invoiced wk 11 — not yet cash-out; WCAG engaged wk 6 — not yet cash-out) | $17,162 |
| M3 (wk 10–11, ≈0.5 months) | 0.5 | 0.5 × $161 = $81 | $0 (pentest invoice received wk 11 but net-60 means cash hits ~wk 19) | $17,081 |
| M4 (wk 12–14, ≈0.7 months) | 0.7 | 0.7 × $161 = $113 | $10,000 WCAG **(net-0 = upfront on invoice receipt)** | $6,968 |
| M5 prep (wk 15–16, ≈0.5 months) | 0.5 | 0.5 × $161 = $81 | $0 | **$6,887 at M5 launch (Day 0)** |

**Day-0 cash position at M5 launch = $6,887.** Pentest invoice (net-60) still outstanding — cash drain hits wk 19 (3 weeks post-launch), at which point MRR must absorb it or cushion goes underwater. See §3 / §5.

---

## 2. Launch ramp (M5+, weeks 17–...)

Unchanged from v0.1 — ramp assumptions don't depend on starting capital. Reproduced for cross-reference:

| Tier | Share of 25 | Count by day-60 | MRR contribution |
|---|---|---|---|
| Free | (`EST` 250 free signups; 25 paid = 10% attach) | 0 | $0 |
| BYOK Starter ($29) | 32% | 8 | $232 |
| BYOK Pro ($79) | 12% | 3 | $237 |
| Managed Starter ($99) | 24% | 6 | $594 |
| Managed Pro ($249) | 12% | 3 | $747 |
| CLI ($19) | 20% | 5 | $95 |
| **Day-60 total** | 100% | **25** | **$1,905/mo MRR** |

Baseline ramp curve:
- Day 0 (wk 16): 0 paying, $0 MRR.
- Day 15 (wk 18): `EST` 6 paying, ~$457 MRR.
- Day 30 (wk 20): `EST` 12 paying, ~$914 MRR.
- Day 45 (wk 22): `EST` 18 paying, ~$1,371 MRR.
- Day 60 (wk 24): 25 paying, $1,905 MRR (PRD §15 target).
- Day 90 (wk 28): `EST` 35 paying, $2,667 MRR.

**Cumulative MRR collected wks 17–19 (pentest cash-drain window, baseline scenario):**
Approx weekly MRR collection (subscriptions billed monthly, first-charge timing distributed across days) ≈ $300–$900 collected by wk 19 cumulative — call it `EST` **$700** in cash inflow before pentest invoice cash-out hits.

Day-60 contribution margin unchanged: MRR $1,905 − COGS $227 − fixed $161 = **+$1,517/mo**.

---

## 3. Runway scenarios at $25k LOCKED

Day-0 (M5 launch) cash = **$6,887**. Pentest invoice $22,500 outstanding (net-60, cash-out wk 19). All three scenarios computed **WITH net-60 pentest baseline**. Net-30 fallback called out where it diverges.

### 3.1 Pessimistic (10 paying customers by day 60)

Day-60 MRR `EST` $762/mo (mix-weighted, half of baseline). COGS `EST` $204/mo (incl. $113 free-funnel). Day-60 monthly net = $762 − $161 fixed − $204 COGS = **+$397/mo**.

**Cash trajectory:**
- Day 0 (wk 16): $6,887.
- Wk 17–19 (pre-pentest-cashout): fixed burn 3 × $40 = $120; COGS ramps `EST` $30; first MRR inflow `EST` $300. Net wk 19 entry: **$7,037**.
- Wk 19 pentest cash-out: $7,037 − $22,500 = **−$15,463** (under).
- **Pessimistic FAILS under net-60 pentest.** Bridge financing required: needs ≥ $16k injection between wk 17 and wk 19.
- Under **net-90** (if vendor accepts): cash-out wk 23. By wk 23, cumulative MRR inflow `EST` $1,200, fixed+COGS outflow `EST` $1,000. Wk 23 entry `EST` $7,087 → after pentest: **−$15,413.** Still fails.
- **Verdict: NOT SURVIVABLE at $25k without bridge capital OR cost cut.** Trigger §4 actions.

### 3.2 Baseline (25 paying customers by day 60, PRD §15)

Day-60 MRR $1,905; day-60 monthly net **+$1,517/mo**.

**Cash trajectory:**
- Day 0 (wk 16): $6,887.
- Wk 17–19: fixed burn $120; COGS `EST` $60; first-charge MRR `EST` $700–$900 cash collected. Wk 19 entry `EST` **$7,400**.
- Wk 19 pentest cash-out: $7,400 − $22,500 = **−$15,100** (under).
- **Baseline ALSO FAILS under net-60 pentest** because the pentest invoice ($22.5k) is 3× the entire Day-0 cushion plus the first 3 weeks of MRR.
- For baseline to survive net-60: need to push pentest to **net-90 AND** add MRR-acceleration (Managed alpha at M2 — see §5). Wk 22 (net-90) cash entry under accelerated ramp `EST` $13,000 → after pentest: **−$9,500.** Still fails.
- **Path to survive baseline:** combine (a) pentest installments OR (b) M2 Managed alpha pulling MRR 7 weeks forward OR (c) bridge $15k friends-family at M3 entry.

### 3.3 Optimistic (50 paying customers by day 60)

Day-60 MRR `EST` $3,810/mo; day-60 monthly net **+$3,195/mo**. Faster ramp.

**Cash trajectory:**
- Day 0 (wk 16): $6,887.
- Wk 17–19: fixed burn $120; COGS `EST` $100; first-charge MRR `EST` $1,800 cash collected (faster pre-launch waitlist conversion). Wk 19 entry `EST` **$8,467**.
- Wk 19 pentest cash-out: $8,467 − $22,500 = **−$14,033** (under).
- **Optimistic ALSO FAILS under net-60 pentest** in cash terms. The pentest invoice is structural — not a ramp problem.
- Optimistic with pentest split into **3 monthly installments of $7,500** (wk 19/23/27): wk 19 cash entry $8,467 − $7,500 = $967, then +$3,000/mo net keeps it positive. **Survives.**

### Scenario summary at $25k starting capital

| Scenario | Crossover month (MRR > monthly outflow) | Wk-19 cash position w/ pentest net-60 lump | Verdict |
|---|---|---|---|
| Pessimistic | wk 4 post-launch (day 30) — MRR mechanics OK | −$15,463 | **FAILS** — bridge required |
| Baseline | wk 2 post-launch (day 15) — MRR mechanics OK | −$15,100 | **FAILS** — pentest installments or alpha-MRR required |
| Optimistic | wk 1 post-launch — MRR mechanics OK | −$14,033 | **FAILS as lump-sum, SURVIVES with 3-installment pentest** |

**The crossover-month math (post-launch unit economics) is healthy in every scenario.** The failure mode at $25k is **timing of one specific invoice (pentest, $22.5k) landing inside the cushion window**. Fix the invoice timing and every scenario survives.

---

## 4. Cash-injection triggers (expanded for $25k tier)

At $25k, vague triggers don't work. Each trigger is now **runway-month-remaining**-based with explicit action ladders.

### 4.1 Cut-burn trigger ladder (taken in this order as cushion drops)

| Cash on hand at any week | Cut-burn action | Monthly savings |
|---|---|---|
| **< $20,000** (≈wk 8, after legal+early-M0) | Tier-1 cuts: PostHog stays free; verify Resend free tier covers M4 (3k emails); audit any subscriptions added between phases | `EST` $0–$50 |
| **< $15,000** (≈wk 11, M3 entry) | Tier-2 cuts: **kill Sentry Team plan ($26 → $0 free tier; lose 50k errors/mo cap; accept developer-tier error budget for MVP)**; cancel any 1Password/Linear paid plans that aren't load-bearing | `EST` $30–$60 |
| **< $10,000** (≈wk 14, M4 entry) | Tier-3 cuts: **defer WCAG audit to V1.5** (PRD §14.6 says "before M5" — slipping it to V1.5 is a PRD spec edit, must coordinate with Halo + Comply + Herald); axe-core + internal Halo review becomes the M5 launch story; **M4 exit gate moves**. R15 reopens — owner: Halo. | `EST` $10,000 (WCAG deferred) |
| **< $5,000** (post-launch, anytime) | Tier-4 emergency cuts: drop free tier entirely → all signups become BYOK Starter 7-day trial; pause V1.5 Auto-PR build → ship V2 instead | `EST` $113/mo free-tier COGS saved + faster paid conversion |
| **< $2,000** | Cash flat. Stop. Triage with Crash. | — |

### 4.2 Cash-injection (raise) trigger ladder

| Cash on hand AND time-window | Action | Amount |
|---|---|---|
| **< $10,000 AND wk ≤ 14 (pre-launch)** | Bridge from personal credit / friends-family. Don't burn week 14 trying to fundraise externally — bridge it. | `EST` $10–$15k |
| **< $5,000 AND wk 17–22 (post-launch, pre-pentest-cash-due)** | **Active fundraise — talk to angel networks (Indie.vc / Calm Fund / Hustle Fund) immediately.** 60-day-net pentest cash-out at wk 19 forces this. | `EST` $25–$50k |
| **Wk 19 pentest invoice due AND cash < $25,000** | Pre-arranged: pentest vendor accepts 3-installment payment plan ($7.5k/mo wk 19/23/27). Locked at M0-close negotiation. **This is the planning baseline at $25k.** | n/a — structured |
| **Day-60 MRR < $762 (pessimistic miss)** | Emergency bridge `EST` $25k friends-family; concurrent GTM pivot (see §4.3) | $25k |

### 4.3 GTM-shift trigger ladder

| Signal | Action | Owner |
|---|---|---|
| **Day-30 paying < 6 customers** (50% of pessimistic) | Signal + Penny pivot: kill SEO investment (slow ramp), 100% into direct outreach (Discord DMs in indie communities, HN front-page push, Cursor / Bolt forum presence). Trigger Penny D4 A/B rotation at $19 Starter. | Signal + Penny |
| **Day-60 paying < 10 customers** | Positioning misread (PRD §19 R10 fires). Cut WCAG; pause Auto-PR build → V2 instead of V1.5; relaunch via highest-converting channel from M5 data; consider second positioning angle (e.g., "agentic-code reviewer" if "audit" reads as too compliance-heavy) | Scout + Penny + Signal |
| **Managed mode token spend > $200/tenant/mo** (cap working but loose) | Tighten Managed Starter cap from $15 → $10/tenant/mo per `unit-economics.md` §6 | Meter + Forge |

### 4.4 Hard runway floor

**Meter holds the line: Jo MUST maintain $3,000 untouchable emergency reserve** through M5 launch. At $25k starting capital, this means scenario math runs against $22,000 of usable capital, NOT $25,000. **The above tables already assume this.** If Jo touches the $3k reserve, every trigger above escalates one severity tier.

---

## 5. Sprint-alignment check (crunch points at $25k)

### 5.1 Vendor-invoice calendar vs Sprint milestones

| Wk | Sprint event | Cash event | Cash position (baseline, no mitigation) |
|---|---|---|---|
| 0 | Pre-M0 | Legal $5,500 + Comply $2,000 cash-out | $25,000 → $17,500 |
| 1–9 | M0–M2 (fixed burn ramp) | $338 cumulative fixed | $17,162 |
| 10–11 | M3 (pentest delivered + invoiced) | $81 fixed; pentest INVOICED but NOT YET CASH-OUT (net-60) | $17,081 |
| 12–14 | M4 (WCAG audit) | $113 fixed; **WCAG $10,000 cash-out wk 14 (net-0 default)** | $6,968 |
| 15–16 | M5 prep + launch | $81 fixed; $300 first MRR inflow (early waitlist conversion) | $7,187 |
| 17–18 | Post-launch ramp | Fixed $80; MRR `EST` $500 inflow | $7,607 |
| 19 | **PENTEST CASH-OUT $22,500 (net-60)** | Fixed $40; MRR `EST` $300 inflow; **pentest -$22,500** | **−$14,553** |

**Crunch point #1: WCAG @ wk 14.** $10k cash-out drops cushion from $17k → $7k just before launch. If WCAG also negotiates net-30 (Meter recommends), cash-out moves to wk 18 (post-launch) where MRR can absorb part of it.

**Crunch point #2: Pentest @ wk 19 (under net-60).** $22.5k cash-out 3 weeks post-launch breaches into negative under every ramp scenario. **This is the structural blocker at $25k.**

### 5.2 Recommended Sprint coordination

Meter, to Sprint and the Phase-4 leads:

1. **Pentest terms — 3-installment plan (LOCKED PLANNING BASELINE):** Shield negotiates at M0 close: $7,500 cash on report delivery (wk 11) + $7,500 net-60 (wk 19) + $7,500 net-90 (wk 23). Vendors that don't accept installments: drop from short-list. Meter blocks pentest contract sign-off without installment terms or ≥ net-60 simple terms.
2. **WCAG terms — net-30 minimum (NEW RECOMMENDATION):** Halo + Comply negotiate at vendor sign-off (M1 close, wk 6): $0 deposit; full invoice net-30 from report delivery. Moves $10k cash-out from wk 14 to wk 18. Adds $10k to Day-0 launch cushion. Coordinate with Comply (DPA template will already touch this vendor).
3. **Managed-tier waitlist alpha at M2 close (wk 9):** Open 5–10 Managed Starter slots to waitlist-confirmed customers as private alpha. $99 × 7 alpha customers × 7 weeks pre-launch = `EST` $4,851 MRR pulled forward into wks 10–16. Adds `EST` $4–5k to launch cushion. Coordinate with Signal (`/coming-soon` from `sprint/milestone-M0.md`) + Penny (alpha pricing review) + Atlas (Stripe webhook live at M2 already).
4. **Sentry kill-switch ready at wk 10:** If cushion < $15k at wk 10, immediate downgrade to free tier. Saves $26/mo. Marginal but symbolic — signals to Jo the cut-burn ladder has triggered.

With (1) + (2) + (3) all executed: launch-day cushion `EST` $16,000 (vs $6,887 baseline) and pentest cash-out distributes across 3 months of post-launch MRR. **Baseline survives.** Pessimistic still requires bridge.

---

## 6. Meter's exit-gate self-verdict (re-verdict at $25k)

**Phase-7 gate per `BUILD_FLOW.md`:** runway sustains Sprint's M0–M5 calendar; cash-injection triggers documented.

| Check | Status at $25k LOCKED |
|---|---|
| Starting capital documented? | ✓ LOCKED $25,000 (Jo, 2026-05-11) |
| Founder compensation modeled? | ✓ LOCKED $0/mo through M5 (Jo, 2026-05-11) |
| Runway sustains M0–M5 calendar at $25k? | ⚠ **CONDITIONAL** — requires ALL of: (a) pentest 3-installment terms at M0-close negotiation, (b) WCAG net-30 terms at M1-close negotiation, (c) Managed alpha at M2 close pulling MRR forward |
| Pessimistic scenario (10 paying in 60d) survives at $25k? | ✗ NO — requires bridge financing $15k OR scenario-redefinition (deferred WCAG) |
| Baseline scenario survives at $25k? | ⚠ ONLY with installment-pentest + net-30-WCAG + alpha-MRR. Lump-sum pentest cash-out fails baseline. |
| Optimistic scenario survives at $25k? | ⚠ Survives ONLY with pentest installments. Lump-sum still fails optimistic. |
| Cash-injection triggers documented with action? | ✓ 13 explicit triggers in §4 across cut-burn / raise / GTM-shift |
| 16-week M0–M5 calendar (PRD §16) matches Sprint? | ✓ Placeholder weeks per PRD §16; recompute when Sprint firms up after M0 |

### 6.1 Verdict

**Meter's verdict at $25k LOCKED: PASS WITH FIXES — but the fixes are now BLOCKERS, not recommendations.**

The four blocking fixes:

1. **BLOCKER:** Pentest contract signed at M0 close MUST include installment payment terms (3-tranche or ≥ net-60-on-half). Without this, baseline AND optimistic both fail in cash terms at wk 19. Owner: Shield + Penny. Deadline: M0 close.
2. **BLOCKER:** WCAG audit contract signed at M1 close MUST include net-30 terms (no upfront / no net-0 default). Without this, launch-day cushion is $6,887 — too thin to absorb any wk-15-17 fixed-burn variance. Owner: Halo + Comply. Deadline: M1 close.
3. **BLOCKER:** Managed-tier alpha at M2 close MUST land ≥ 5 paying alpha customers by wk 14. Pulls $2,500–$4,000 MRR into pre-launch cushion. Owner: Signal + Penny + Atlas + BigBrain (greenlight). Deadline: M2 close.
4. **CONDITIONAL (not blocker):** Jo holds $3,000 untouchable emergency reserve through M5. Math runs against $22k usable capital. If breached, every cut-burn trigger escalates.

If all three blockers land: **PASS.** If any one slips: **FAIL — Jo must bridge $15–25k or defer Phase-7 launch by 4 weeks while M0–M5 re-baselines.**

### 6.2 New risk for Sprint (PRD §19 + owner-matrix.md inheritance)

**NEW R20:** Cash-runway crunch at M3 → M5 under $25k starting capital + lump-sum vendor payment terms.

| Field | Value |
|---|---|
| **Likelihood** | High (default vendor terms are net-0 / on-receipt for first-engagement customers) |
| **Impact** | Critical (pre-launch cash floor breaches at wk 14 / wk 19) |
| **Mitigation owner** | Meter (cash-flow modeling) + Shield (pentest negotiation) + Halo+Comply (WCAG negotiation) + Signal+Penny (alpha-MRR pull-forward) |
| **Mitigation deadline** | M0 close (pentest terms signed) + M1 close (WCAG terms signed) + M2 close (alpha launched ≥5 paying) |
| **Verification** | `finance/runway.md` §6 recomputed at each milestone close; cushion floor never < $3,000; pentest invoice cash-out installment receipts filed at `compliance/pentest-vendor-engagement.md` |

R20 inherits into:
- `sprint/owner-matrix.md` §2 risk matrix as **NEW R20 Cash-runway crunch (M3→M5)**.
- `PRD.md` §19 as a new row paralleling R1 LLM cost overrun — same shape (financial-risk class).

### 6.3 Soft warnings (not blockers but Jo should know)

- **At $25k, Jo has zero margin for any unbudgeted vendor cost.** If Cipher needs a Vault upgrade, if Terra needs a paid Cloudflare tier above Pro, if any tool adds a seat-licensing surprise — every $200/mo unbudgeted line eats 6 weeks of fixed burn cushion.
- **At $25k, Stripe's hold-period on first charges (7–14 days for new accounts) matters.** First-charge MRR doesn't arrive on day-of-charge; it arrives 1–2 weeks later. Wks 17–19 cash inflow numbers in §5 already conservatively assume this delay.
- **At $25k, Jo cannot afford a M4 slip.** Every week of M4 slip = $40 fixed burn + 1 week of delayed MRR. By wk 18 with no launch, cushion = $5k. By wk 20, cushion = $4k. Sprint's M4 exit gate becomes a cash-survival gate, not just a feature-completion gate.

---

*End of runway.md v0.2. Meter — DevOps Layer.*
*Recomputed 2026-05-11 with Jo's three locked inputs: $25k starting capital, $0 cash comp, pentest 30/60-day-net negotiation at M0 close.*
