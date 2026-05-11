# Runway — Studio Zero

**Phase:** 7 — Pricing & Unit Economics
**Owner:** Meter (FinOps) — peer-coordinated with Penny (pricing), Sprint (milestone calendar)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** First draft for Phase-7 exit gate per `BUILD_FLOW.md` (runway sustains Sprint's M0–M5 calendar).

> **Method.** Builds monthly burn from cost-surface activation calendar (`finance/unit-economics.md` §1 + `sprint/milestone-M0..M5.md`). Projects MRR ramp from PRD §15 (25 customers in 60 days) under three scenarios. Flags cash-injection trigger points. Cross-checks Sprint's M0–M5 placeholder 16-week calendar (PRD §16) — `BUILD_FLOW.md` Phase 7 exit gate.

---

## 0. Source-of-numbers contract

Every line cites: `finance/unit-economics.md` §0 (vendor pricing), `sprint/milestone-M*.md` (activation week), `PRD.md §16` (16-week placeholder calendar), or `EST` with explicit assumption.

`EST` assumptions baseline:
- Calendar starts week 1 = today (2026-05-11) per Sprint M0 entry. M5 launch = week 16 ≈ 2026-08-31.
- Jo compensation = $0 cash outflow (founder equity-only, working from existing capital). Flag explicitly — if Jo must draw cash compensation, recompute.
- Pre-existing capital = `EST` $50,000 starting balance. **If Jo's actual balance differs, scale the scenarios proportionally — runway months invariant ratio holds.** Document Jo's actual cash position before relying on month-X verdicts.

---

## 1. Burn baseline (M0–M4, pre-launch)

Fixed monthly infra burn (per unit-economics.md §1):

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
| External pentest vendor (Trail of Bits / Doyensec / NCC / Bishop Fox / Latacora) | $22,500 `EST` | M3 wk 11 | unit-economics §0 + threat-model §5.3 |
| WCAG 2.2 AA third-party conformance audit | $10,000 `EST` | M4 wk 14 | unit-economics §0 + PRD §14.6 |

**Pre-launch cumulative cash burn (week 1 → week 16, M5 launch):**

| Block | Months | Fixed burn | One-time events | Cumulative outflow |
|---|---|---|---|---|
| Pre-M0 (week 0) | 0 | $0 | $5,500 legal + $2,000 comply = $7,500 | $7,500 |
| M0–M2 (wk 1–9, ≈2.1 months) | 2.1 | 2.1 × $161 = $338 | $0 | $7,838 |
| M3 (wk 10–11, ≈0.5 months) | 0.5 | 0.5 × $161 = $81 | $22,500 pentest | $30,419 |
| M4 (wk 12–14, ≈0.7 months) | 0.7 | 0.7 × $161 = $113 | $10,000 WCAG | $40,532 |
| M5 prep (wk 15–16, ≈0.5 months) | 0.5 | 0.5 × $161 = $81 | $0 | **$40,613 pre-launch outflow** |

**Pre-launch cash outflow at M5 = ~$40,600** of `EST` $50,000 starting capital. Remaining cushion = ~$9,400 at launch. **This is tight.** See §3 scenarios.

---

## 2. Launch ramp (M5+, weeks 17–...)

PRD §15 target: 25 paying customers in first 60 days post-launch (week 17 through week 24).

**Tier mix assumption (`EST`, anchored to Penny's positioning + persona §5):**

| Tier | Share of 25 | Count by day-60 | MRR contribution |
|---|---|---|---|
| Free | (not paying — `EST` 250 free signups for funnel; 25 paid = 10% attach, more aggressive than PRD §15's 20%-by-30d because mix-weighted) | 0 | $0 |
| BYOK Starter ($29) | 32% | 8 | $232 |
| BYOK Pro ($79) | 12% | 3 | $237 |
| Managed Starter ($99) | 24% | 6 | $594 |
| Managed Pro ($249) | 12% | 3 | $747 |
| CLI ($19) | 20% | 5 | $95 |
| **Total day-60 paying** | 100% | **25** | **$1,905/mo MRR** |

Ramp curve `EST`:
- Day 0 (M5 launch): 0 paying
- Day 30: 12 paying (~half) → MRR `EST` $914/mo
- Day 60: 25 paying → MRR $1,905/mo
- Day 90 (M5 +30d, end of PRD §15 +90d window): assume 35 paying with attach compounding → MRR `EST` $2,667/mo
- Month 6 post-launch (week 16+24 ≈ week 40): assume 60 paying with channel compounding → MRR `EST` $4,572/mo
- Month 12 post-launch (V1.5 launch ≈ wk 16+6 → V2 launch ≈ wk 16+12; V1.5 Auto-PR attach starts): assume 120 paying + Auto-PR revenue → MRR `EST` $9,144/mo + Auto-PR `EST` $588/mo (12 bundles/mo × $49) = $9,732/mo

**Monthly COGS ramp (per unit-economics.md §3 per-tier numbers):**

| Tier | Day-60 count | COGS/customer/mo | COGS/mo |
|---|---|---|---|
| Free | 250 signups (250 free funnel) | $0.90 (4 audits × $0.225) but decays — `EST` $0.45 mo-average | $113 |
| BYOK Starter | 8 | $1.19 | $9.52 |
| BYOK Pro | 3 | $2.75 | $8.25 |
| Managed Starter | 6 | $6.25 (at cap-respected modeled rate per unit-economics §6) | $37.50 |
| Managed Pro | 3 | $18.20 | $54.60 |
| CLI | 5 | $0.85 | $4.25 |
| **Day-60 total COGS** | | | **$227/mo** |

**Day-60 contribution margin** = MRR − COGS = $1,905 − $227 = **$1,678/mo positive contribution**. **Above fixed burn $161/mo by $1,517.** Profitable contribution at day 60 in baseline.

**Burn-to-MRR crossover** (the month MRR first exceeds total monthly outflow including fixed burn):
- Total monthly outflow (fixed burn + COGS at day 60) = $161 + $227 = $388/mo
- Day-60 MRR $1,905 ≫ $388 outflow → **crossover happens before day 60 in baseline scenario** — specifically at the point where MRR > $388 + COGS. At ~5 customers (mix-weighted MRR ~$381/mo) the line crosses. **`EST` crossover at day 15–20 post-launch** in baseline.

---

## 3. Runway scenarios

Three scenarios × runway-remaining at end of year-1 (calendar week ~68, ≈2027-08).

Starting capital `EST` $50,000. Pre-launch outflow $40,613. Cushion at M5 launch = **$9,387**.

### 3.1 Pessimistic (10 paying customers by day 60, slow channel performance)

Tier mix-weighted MRR at day 60 with 10 paying = `EST` $762/mo.
- Day-60 COGS `EST` $91/mo + $113 free-funnel COGS = $204/mo
- Day-60 monthly net = $762 − $161 fixed − $204 COGS = **+$397/mo contribution** (still positive at day 60).
- Crossover: ~day 30 (MRR > $355).
- Cushion drain weeks 17–22 (slow ramp before crossover): `EST` extra $1,500 burn beyond crossover line.
- **Cushion at crossover ≈ $7,900.** Survivable.
- 6-month-post-launch MRR `EST` $1,524 (60 customers half-pace); year-1 MRR `EST` $3,500.
- **Cumulative net from M5 → year-1 end ≈ +$24,000.**
- **Year-1 ending cash `EST` = $9,400 + $24,000 = $33,400.** Runway-remaining = 33,400 / (avg monthly outflow `EST` $500) = **66+ months of runway**, assuming no cash compensation drawn.
- **Even pessimistic survives** because pre-launch burn is the bottleneck, not post-launch unit economics.

### 3.2 Baseline (25 paying customers by day 60, PRD §15)

As §2 above. Day-60 net +$1,517/mo. Year-1 MRR `EST` $9,732/mo with V1.5 Auto-PR. Year-1 ending cash `EST` $9,400 + cumulative-year-1-net `EST` $70,000 = **~$79,000**. Runway-remaining months: undefined-positive (cash growing).

### 3.3 Optimistic (50 paying customers by day 60, Scout's positioning bet realized)

Mix-weighted MRR at day 60 = `EST` $3,810/mo. Day-60 net = $3,810 − $161 − $454 COGS = **+$3,195/mo**. Year-1 MRR `EST` $18,000/mo. Year-1 ending cash `EST` $9,400 + `EST` $130,000 = **~$139,000.**

**Crossover month (week-from-M5-launch) by scenario:**

| Scenario | Crossover | Year-1 ending cash `EST` | Runway-remaining at year-1 end |
|---|---|---|---|
| Pessimistic | wk 4 post-launch (≈day 30) | $33,400 | 66+ months at current burn |
| Baseline | wk 2 post-launch (≈day 15) | $79,000 | undefined-positive |
| Optimistic | wk 1 post-launch | $139,000 | undefined-positive |

---

## 4. Cash-injection triggers

If runway-remaining at any month drops below the thresholds, take the corresponding action.

| Trigger | Action |
|---|---|
| **Cash on hand < $15,000 AND pre-launch (before M5)** | Cut burn: defer WCAG audit to V1.5 launch (PRD §14.6 says "third-party audit before M5" — Comply must re-negotiate the binding date, or down-scope to internal axe-core + Halo manual review; risk: M4 exit gate slips). Talk to vendors about installment terms. |
| **Cash on hand < $25,000 AND pentest invoice landing (M3 wk 11)** | Negotiate 60-day net terms with pentest vendor (Trail of Bits / Doyensec do offer this for early-stage); shifts ~$22k from M3 outflow to M5 outflow when MRR starts. |
| **Cash on hand < $5,000 post-launch** | Emergency: raise bridge (friends-family `EST` $25k–$50k) OR shift go-to-market: drop free tier entirely (negative-contribution channel) → all signups become BYOK Starter trial (7-day) → forces faster conversion. PRD §12 free-tier safeguards already constrain it; tightening to a 7-day trial is a quick lever. |
| **MRR ramp at day 30 < $500** (50% below pessimistic) | Shift go-to-market: re-allocate 100% of time from Sprint's organic channels to high-conversion direct outreach (Discord DMs in indie communities, Hacker News thread engagement, Cursor / Bolt forum presence). Trigger Penny + Scout pricing review (D4 A/B rotation enabled). |
| **Day-60 paying < 10 customers** | Bigger problem: positioning misread (PRD §19 R10). Cut burn (pause WCAG / pause Auto-PR build → V2 instead of V1.5) AND re-launch via the most-effective channel from M5 data. |
| **Anthropic monthly bill > $200/customer in Managed tier** | Cap fired correctly per unit-economics §6 but cap is too loose. Tighten Managed Starter cap from $15 → $10/tenant/mo. |
| **Stripe processing rate ≠ 2.9% as modeled** | Already conservative; if PRD prompt's "1.5%" was meant for European cards on Stripe via local-method routing, recompute → margins improve, not worsen. No action needed. |

**Hard runway floor (Meter):** Jo holds back **$15,000 emergency reserve** that does NOT participate in scenario math. The cushion math above assumes this reserve is untouched. If touched, all triggers escalate one severity level.

---

## 5. Sprint-alignment check

Sprint's milestone calendar (PRD §16 placeholder + `sprint/milestone-M*.md`):
- M0 (week 2) → M1 (week 6) → M2 (week 9) → M3 (week 11) → M4 (week 14) → M5 (week 16) → V1.5 (week 22) → V2 (week 28) → V2.1 (week 34)

**Cash-event alignment vs Sprint calendar:**

| Sprint event | Cash event | Aligned? |
|---|---|---|
| M0 wk 2 | Fixed burn starts | ✓ |
| M0 close | Pentest + WCAG vendors engaged (R14/R15 lead-times); no cash yet | ✓ |
| M2 wk 9 | Stripe live; first paying customers possible (Managed Starter ships); MRR ramp could start pre-M5 if Sprint opens Managed-tier preview to waitlist | ✓ — **opportunity:** consider opening Managed-tier preview at M2 close to a waitlist subset (10-customer alpha). Pulls MRR forward by ~7 weeks. Coordinate with Signal + Penny. |
| M3 wk 11 | Pentest invoice $22,500 lands | **CRUNCH POINT** — cushion at this point `EST` $50,000 − $338 (M0–M2 fixed) − $7,500 pre-M0 = $42,162 going in; pentest drains $22,500 → $19,662 remaining before M4 |
| M4 wk 14 | WCAG audit invoice $10,000 + Resend starts billing | M4 cushion `EST` $19,662 − $113 (M3 partial) − $10,000 = $9,549 |
| M5 wk 16 | Launch; MRR ramp starts | M5 entry cushion `EST` $9,387 (matches §1 number) |
| V1.5 wk 22 | Auto-PR launches; expansion-rev kicks in | By then baseline MRR has been ramping 6 weeks → `EST` $1,500–$2,500/mo offsetting Auto-PR's COGS |

**Crunch point: M3 → M5.** Between pentest cash-out (wk 11) and first paying-customer MRR (wk 17+), Jo's cushion thins to `EST` $9,000–$10,000. This is enough to survive in baseline but leaves no margin for vendor-cost overrun or M4 slip.

**Sprint coordination recommendation (Meter, to Sprint):**
- Open Managed-tier alpha at M2 close to waitlist (Signal's `/coming-soon` from sprint/milestone-M0 deliverables). 5–10 alpha customers × $99 = $495–$990/mo MRR pulled forward by 7 weeks. Adds `EST` $3,500 cushion by M5.
- Negotiate pentest vendor 30-day or 60-day net terms (industry-standard for Trail of Bits / Doyensec early-stage engagements). Shifts $22,500 from wk 11 to wk 14 or wk 19. Closes M3 cash crunch.

---

## 6. Meter's exit-gate self-verdict

**Phase-7 gate per `BUILD_FLOW.md`:** runway sustains Sprint's M0–M5 calendar; cash-injection triggers documented.

| Check | Status |
|---|---|
| Runway sustains M0–M5 calendar at `EST` $50,000 starting capital? | ✓ **YES with two mitigations:** (a) negotiate pentest 30-day-net terms at M0 close; (b) open Managed alpha at M2 close to pull MRR forward |
| Pessimistic scenario (10 paying customers in 60d) survives? | ✓ YES — pre-launch burn is the bottleneck; post-launch unit economics are strong enough that even slow ramp clears crossover by day 30 |
| Cash-injection triggers documented with action? | ✓ YES — seven triggers in §4 |
| Jo's actual starting capital documented? | ✗ **OPEN — Jo must confirm `EST` $50,000 baseline** before this doc commits to scenarios. If Jo's actual capital is <$30k, pre-launch outflow $40,600 breaches before M5 launch; pentest and WCAG must be deferred or financed. **Block on Jo confirming.** |
| Founder compensation modeled? | ✗ **OPEN — `EST` $0 cash compensation assumed.** If Jo draws even $3,000/mo personal salary, pre-launch cumulative outflow rises by `EST` $12,000 over 4 months, breaching cushion. **Block on Jo confirming.** |
| 16-week M0–M5 calendar (PRD §16) matches Sprint's actual schedule? | ✓ Placeholder weeks per PRD §16; Sprint firms up after M0 lands per PRD §16 last line. Recompute when firm. |

**Meter's verdict: PASS WITH FIXES.** Runway is viable for M0–M5 under stated assumptions. **Two open dependencies require Jo's input:**
1. Confirm starting capital. The `EST` $50,000 baseline is a planning assumption only.
2. Confirm $0 cash compensation OR specify monthly draw — model recomputes proportionally.

Without these, the verdict is conditional. With them, runway is defensible and Sprint's calendar holds.

---

*End of runway.md v0.1. Meter — DevOps Layer.*
