# Unit Economics — Studio Zero

**Phase:** 7 — Pricing & Unit Economics
**Owner:** Meter (FinOps) — peer-coordinated with Penny (pricing)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** First draft for Phase-7 exit gate per `BUILD_FLOW.md` (positive contribution margin every tier).
**Reader contract:** Defends — or refuses to defend — every price in PRD v0.5 §12. Every number cites its source; estimates marked `EST` with the assumption named.

> **Method.** Walks every dollar from PRD §13 (architecture) and system-diagram.md (cost surfaces) through PRD §12 (tiers) and §15 (60-day customer target). Cross-checked against PRD §14.1 SLOs (which set runtime budget, which sets token cost), PRD §19 R1 (LLM cost overrun risk), and Penny's prd-review-penny.md (her D4 $19/$29 instinct and her Auto-PR-tokens-on-us instinct, both stress-tested against the math below).

---

## 0. Pricing sources (cited)

| Cost line | Unit price | Source |
|---|---|---|
| Anthropic Claude Sonnet 4 input | $3.00 / 1M tokens | https://www.anthropic.com/pricing#api (retrieved 2026-05-11; "Claude Sonnet 4 — Input: $3 / MTok"). PRD §13 standardizes on Sonnet for reviewer-tier audit work. |
| Anthropic Claude Sonnet 4 output | $15.00 / 1M tokens | Same source. |
| Anthropic Claude Sonnet 4 cached read (prompt caching) | $0.30 / 1M tokens | Same source (90% discount on cached input). Applied to system-prompt + rubric portions of reviewer calls — `EST` cache-hit ratio 60% on input after warm-up (assumption: per-tenant rubric, per-reviewer system prompt, code chunks NOT cached). |
| Vercel Pro plan | $20/seat/mo (1 seat = Jo) | https://vercel.com/pricing (retrieved 2026-05-11). Includes Vercel Functions invocations within plan; overage `EST` $0 at MVP scale (PRD §15 = 25 customers in 60d). |
| Vercel Functions overage (Fluid Compute) | $0.18 / GB-hr active | https://vercel.com/pricing (Functions pricing). `EST` < $5/mo at MVP scale; load-test reality check at M2. |
| Supabase Pro plan | $25/mo (org-flat) + included compute (Micro 1 GB RAM / 2 vCPU shared) + 8 GB DB + 100 GB egress + 100 GB Storage | https://supabase.com/pricing (retrieved 2026-05-11). |
| Supabase compute upgrade (Small, dedicated 1 vCPU / 2 GB) | +$15/mo | Same source. Triggered if MVP load exceeds Micro burst; `EST` not needed at M5 baseline, needed by 100-customer mark. |
| Supabase Storage overage | $0.021/GB-mo after 100 GB included | Same source. |
| Supabase egress overage | $0.09/GB after 250 GB included | Same source. |
| Supabase Edge Functions invocations | 2M included Pro; $2 / 1M after | Same source. |
| Railway team plan | $20/seat/mo (1 seat = Jo) + usage | https://railway.com/pricing (retrieved 2026-05-11). |
| Railway compute | $0.000463/vCPU-min (= $20/vCPU-mo / 43,200 min) + $0.000231/GB-RAM-min | Same source. |
| Railway egress | $0.05/GB after 100 GB included on team plan | Same source. |
| Stripe processing fee | 2.9% + $0.30 per successful card charge (US-domestic) | https://stripe.com/pricing (retrieved 2026-05-11). **PRD task prompt said "1.5% + $0.30" — Meter overrides: 1.5% is the lower European card rate; US-domestic Standard rate is 2.9%. Using 2.9% as the conservative number.** |
| Sentry Team plan | $26/mo (50k errors + 100k spans + 1 GB attachments) | https://sentry.io/pricing/ (retrieved 2026-05-11). |
| PostHog (Cloud, self-serve) | First 1M events/mo free; $0.0001 / event after | https://posthog.com/pricing (retrieved 2026-05-11). `EST` $0 at MVP. |
| Resend transactional email | First 3,000 emails/mo free; Pro $20/mo for 50k | https://resend.com/pricing (retrieved 2026-05-11). E1–E5 lifecycle ramps; free tier covers M4. |
| Cloudflare DNS + CDN + WAF (Free + Pro) | Free for DNS/CDN; $25/mo for WAF managed rulesets (Pro) | https://www.cloudflare.com/plans/ (retrieved 2026-05-11). |
| External pentest (Trail of Bits / Doyensec / NCC / Bishop Fox / Latacora — M3 gate, threat-model §5.3) | $15,000–$30,000 one-time | Industry range, `EST`. Bishop Fox / Doyensec quotes for a ~10-day scoped engagement of this surface area typically land $20k–$25k. Used $22,500 midpoint in burn. |
| WCAG 2.2 AA third-party conformance audit (M4 gate, R15) | $5,000–$15,000 one-time | Industry range, `EST` (Deque / Level Access / TPGi for the scope in PRD §14.6: verdict screen + signup + settings + billing + Stripe return + score breakdown + pricing + run timeline + AUP attestation). Used $10,000 midpoint. |
| Comply trademark search + DMCA registration | $500 + $6 + ~$1,500 attorney retainer | USPTO TEAS Plus $250/class + clearance search budget; U.S. Copyright Office DMCA agent fee $6 + 3-year renewal; `EST` attorney $1,500 one-time. |
| Legal: incorporation + ToS/Privacy/AUP + DPA template attorney sign-off | $3,000–$8,000 one-time | `EST` Delaware C-corp or LLC + Comply-drafted policies with attorney review. Used $5,500 midpoint. |
| Jo's compensation | Self-paid; `EST` $0 burn (founder equity-only pre-launch) | Sole proprietor working capital; not a cash outflow line for runway purposes. Flag in `runway.md`. |

**Sonnet-cost-as-of-2026 sanity check:** PRD does not pin a Claude version; ARCH and the reviewer pattern in `agents/audit/` imply Sonnet-class. If Cortex picks Opus for any specific reviewer, this model breaks — `EST` for Sonnet only. Pinned to PRD §13 narrative.

---

## 1. Cost-model overview

Every cost surface, when it activates, who pays.

| Cost surface | Type | Activates | Who pays | Variable driver |
|---|---|---|---|---|
| Vercel Pro | FIXED | M0 (week 1) | Jo | seat count (1) |
| Supabase Pro | FIXED | M0 (week 1) | Jo | seat + Storage + egress overage |
| Railway team plan | FIXED | M0 (week 1) | Jo | seat + compute-min |
| Sentry Team | FIXED | M0 (week 1) | Jo | error volume |
| PostHog | VARIABLE | M0 (post-consent) | Jo | event volume |
| Resend | FIXED $0 → VARIABLE | M4 (week 14) | Jo | E1–E5 email volume |
| Cloudflare WAF Pro | FIXED | M0 | Jo | n/a |
| Anthropic API (BYOK paths: Surface free, BYOK Starter/Pro, CLI) | VARIABLE | M1 (BYOK runner online) | **Customer** (BYOK direct billing) OR **Jo** (Surface free tier on Managed shared key) | input + output tokens |
| Anthropic API (Managed Starter/Pro, Auto-PR) | VARIABLE | M2 (Managed), V1.5 (Auto-PR) | **Jo** | input + output tokens |
| Stripe processing | VARIABLE | M2 (week 9) | Jo (deducted from gross) | per-charge 2.9% + $0.30 |
| Railway compute (audit runs) | VARIABLE | M1 (BYOK), M2 (Managed), V1.5 (Auto-PR build agents) | Jo | runtime min × 1 vCPU |
| Supabase Storage (customer code 7d retention + evidence blobs 24mo) | VARIABLE | M1 (BYOK code intake) | Jo | MB × retention-days |
| External pentest | FIXED one-time | M3 (week 11) — engaged M0 | Jo | $22,500 (EST midpoint) |
| WCAG conformance audit | FIXED one-time | M4 (week 14) — engaged M1 | Jo | $10,000 (EST midpoint) |
| Comply (trademark + DMCA + attorney) | FIXED one-time | Phase 4 + M5 | Jo | $2,000 (EST total) |
| Legal (incorporation + policies + DPA) | FIXED one-time | Pre-M0 | Jo | $5,500 (EST) |

**Tagging rule (Meter):** every Railway service + Vercel project + Supabase resource MUST carry `project=studio-zero`, `env=prod|staging`, `feature=runner|web|edge-fn|storage` tags before M2. Untagged spend is itself a Critical Meter finding (PRD-aligned with persona.md Rule 1). Terra owns wiring this in `architecture/iac/`.

---

## 2. Per-run COGS

Two representative profiles, derived from PRD §14.1 (Quick < 10min p95, Comprehensive < 45min p95) and the §9 reviewer fan-out (Optic + Proof + Halo + Compass + Trace + Canon + Jury synthesizer).

### 2.1 Surface audit (Quick depth, 1 reviewer subset, ~5 min wall-clock)

Assumption: Surface SKU runs Halo + Optic + Compass against a deployed URL only (no source). `EST` token budget per PRD §13 reviewer architecture:
- System prompts (rubric + role) ≈ 8,000 input tokens × 3 reviewers + Jury synth = ~32k input tokens
- Page content / screenshots transcribed / interactive observations ≈ 18,000 input tokens
- Reviewer reasoning + structured findings output ≈ 8,000 output tokens total
- **Total: ~50k input + 8k output** (matches the prompt's "~50k tokens" expectation).

With prompt caching (60% of system-prompt input cached after warm-up):
- Cached read: 32k × 0.60 = 19,200 tokens × $0.30/M = **$0.0058**
- Fresh input: 50k − 19,200 = 30,800 tokens × $3.00/M = **$0.0924**
- Output: 8,000 tokens × $15.00/M = **$0.1200**
- **Anthropic cost = $0.2182 per Surface audit** (BYOK paths: customer pays $0.22, Jo pays $0; free-tier path: Jo pays $0.22)

Railway compute (5 min × 1 vCPU + ~2 GB RAM):
- 5 × $0.000463 = $0.0023 (vCPU)
- 5 × 2 × $0.000231 = $0.0023 (RAM)
- **Railway cost = $0.0046 per Surface audit**

Supabase Storage: Surface audits have NO source code (PRD §13.4 "cryptoshredded customer code in BYOK/Managed" only applies to Code SKU). Evidence blobs (screenshots) ≈ 2 MB × 24-month retention. Cost per audit = 2 MB × $0.021/GB-mo × 24mo / 1024 = **$0.00099**. Round **$0.001**.

Supabase egress: negligible (`EST` < $0.0001 per audit).

Edge Functions: 4 invocations × negligible cost = `EST` $0.0001.

Sentry events: avg ~0 errors/audit on green path; `EST` $0.0001 amortized.

PostHog events: ~5 events/audit × $0.0001 (after free tier) = `EST` $0 at MVP scale.

**Surface audit total COGS:**
| Path | Anthropic | Railway | Storage | Other | **Total (Jo)** | **Total (Customer)** |
|---|---|---|---|---|---|---|
| Free tier (Managed shared key) | $0.218 | $0.005 | $0.001 | $0.001 | **$0.225** | $0 |
| BYOK Starter/Pro/CLI | $0 | $0.005 | $0.001 | $0.001 | **$0.007** | $0.218 |
| Managed Starter/Pro | $0.218 | $0.005 | $0.001 | $0.001 | **$0.225** | $0 |

### 2.2 Comprehensive Code audit (Full depth, 6 reviewers + Jury, ~30 min wall-clock)

Assumption: Comprehensive runs all 6 reviewers (Optic, Proof, Halo, Compass, Trace, Canon) + Jury synthesis against repo + URL. `EST` token budget:
- System prompts × 6 reviewers + Jury ≈ 56,000 input tokens (more cached overlap → 70% cache-hit `EST`)
- Repo file content + dependency manifest + URL transcripts ≈ 180,000 input tokens (NOT cached — per-tenant unique)
- Reviewer reasoning + structured findings + cross-reviewer Jury synth output ≈ 60,000 output tokens
- **Total: ~236k fresh input + 56k system (39k cached, 17k fresh) + 60k output ≈ 295k tokens total** (matches "~300k tokens" expectation).

Cached read: 39k × $0.30/M = **$0.0117**
Fresh input: (236k + 17k) = 253k × $3.00/M = **$0.7590**
Output: 60k × $15.00/M = **$0.9000**
**Anthropic cost = $1.6707 per Comprehensive audit** (BYOK paths: customer pays $1.67; Managed: Jo pays $1.67)

Railway compute (30 min × 1 vCPU + 2 GB RAM):
- 30 × $0.000463 = $0.0139
- 30 × 2 × $0.000231 = $0.0139
- **Railway cost = $0.0278 per Comprehensive audit**

Supabase Storage (customer code, 7-day default cryptoshred per PRD §14.4):
- `EST` 80 MB repo clone × 7/30 month × $0.021/GB = $0.0004 (de minimis)
- Evidence blobs ~15 MB × 24mo × $0.021/GB = **$0.0074**
- **Storage cost = $0.0078 per Comprehensive audit**

Other (Edge Fns, Sentry, PostHog): `EST` $0.002 amortized.

**Comprehensive audit total COGS:**
| Path | Anthropic | Railway | Storage | Other | **Total (Jo)** | **Total (Customer)** |
|---|---|---|---|---|---|---|
| BYOK Starter/Pro/CLI | $0 | $0.028 | $0.008 | $0.002 | **$0.038** | $1.671 |
| Managed Starter/Pro | $1.671 | $0.028 | $0.008 | $0.002 | **$1.709** | $0 |
| Auto-PR build + re-audit bundle (V1.5) | $1.671 × 1.5 build + 1.671 re-audit ≈ $4.18 | 60 min ≈ $0.056 | $0.012 | $0.003 | **$4.25** (Jo always, per Penny's "tokens on us" instinct §3.B below) | $0 |

`EST` Auto-PR token cost: build agents (Forge + Vega per system-diagram §3e) generate a patch — assume 1.5× a Comprehensive's tokens for the patch generation + 1.0× for the Jury re-audit gate = 2.5× Comprehensive Anthropic = $4.18. Plus 60 min Railway compute = $0.056. Total $4.25.

### 2.3 Stripe processing per charge

Amortized into per-tier monthly COGS in §3 below. Per charge = 2.9% × subscription_price + $0.30.

---

## 3. Per-tier contribution margin

**Behavior assumptions (EST, anchored to PRD §15 success metrics and Penny's prd-review):**

| Persona | Audits/mo (modeled) | Source for the number |
|---|---|---|
| Free user | 4 Surface re-audits/mo for 1 month avg | Penny's "unlimited re-audits" instinct + PRD §15 "20% upgrade attach in 30 days" implies first-month engagement burst then decay |
| BYOK Starter | 2 audits/mo cap (PRD §12) → assume 1.6/mo actual (80% cap utilization, mix: 70% Comprehensive + 30% Surface) | Standard SaaS cap-utilization for a hard cap |
| BYOK Pro | "Unlimited" → `EST` 6 audits/mo avg (mix: 60% Comprehensive + 40% Surface; bursty per Penny's polish #6) | EST anchored on power-user pattern at unlimited tier |
| Managed Starter | 2 Full audits/mo cap → `EST` 1.8/mo actual (90% cap utilization — Managed customers paying for the cap will use it) | Pricing-tier value-perception math |
| Managed Pro | "Unlimited" → `EST` 5 Full audits/mo + 1 Auto-PR bundle every 2 months (PRD §15 ">15% Auto-PR attach on Pro") | Compound modeling |
| CLI ($19/mo) | 1.8/mo actual (similar to BYOK Starter; same cap-class) | EST |
| Auto-PR ($49) | one-time per fix bundle | n/a |

**Conversion fees:** Stripe = 2.9% + $0.30 per monthly charge.

### 3.1 Free tier ($0/mo, Surface only, unlimited re-audits)

- Audits/mo: 4 Surface (Managed shared key path — Jo pays Anthropic)
- Revenue: $0
- COGS/customer/mo: 4 × $0.225 = **$0.90/mo**
- **Contribution margin: −$0.90/customer/mo** (expected loss)
- **Acceptable bound:** Free is a marketing channel. Bound = CAC-equivalent for the paid conversion. Per §5 below, blended CAC ≈ $40 and 20% Surface→paid attach (PRD §15.5+§15) → blended free-to-paid CAC = $0.90 × ~5mo decay-tail × (1/0.20 conversion) ≈ **$22.50 of free COGS per acquired paying customer**. That sits comfortably under the $40 CAC budget. **PASS** — free tier is affordable acquisition. **Flag:** if a free user runs >10 Surface audits/mo for >2 months without converting, contribution loss exceeds $4.50 — Meter recommends a soft cap of **8 Surface audits per 30-day rolling window per free tenant**, gracefully degrading to "you've used your free quota — upgrade to Code SKU for unlimited" (close Penny's Critical-1 "paywalls core loop" without paywalling the loop).

### 3.2 BYOK Starter ($29/mo OR $19/mo — D4 unresolved)

- Audits/mo: 1.6 (70% Comprehensive, 30% Surface) — BYOK paths, customer pays Anthropic
- Jo COGS/audit: 0.7 × $0.038 + 0.3 × $0.007 = $0.029
- Jo COGS/customer/mo (audits): 1.6 × $0.029 = $0.046
- Jo COGS/customer/mo (Stripe): $29 → 2.9% + $0.30 = $1.141 (at $29); $19 → 2.9% + $0.30 = $0.851
- Total Jo COGS/customer/mo: **$29 tier: $1.19** | **$19 tier: $0.90**
- Margin: **$29 tier: ($29 − $1.19)/$29 = 95.9%** | **$19 tier: ($19 − $0.90)/$19 = 95.3%**
- Margin/audit: $29 tier = $17.39/audit | $19 tier = $11.32/audit

**Verdict:** BOTH price points clear the 80% target by a mile. Penny's $19 recommendation does NOT break the unit economics; it loses ~$10/customer/mo in absolute margin, which compounds over the customer base. **Meter's defensible recommendation: $29 at MVP** with a *time-limited $19 launch promo for the first 200 customers* to test conversion lift without locking the floor (matches PRD's "Penny revisits after first 5 customers" + Sprint M2 F-MAJ-2 default of $29 + A/B at $19).

### 3.3 BYOK Pro ($79/mo)

- Audits/mo: 6 (60% Comprehensive, 40% Surface) — BYOK path
- Jo COGS/audit: 0.6 × $0.038 + 0.4 × $0.007 = $0.026
- Jo COGS/customer/mo (audits): 6 × $0.026 = $0.156
- Stripe: 2.9% × $79 + $0.30 = $2.591
- Total Jo COGS/customer/mo: **$2.75**
- Margin: ($79 − $2.75)/$79 = **96.5%**
- Margin/audit: $12.71

**Verdict:** Far above 85% target. Pro tier is the cleanest dollar in the stack.

### 3.4 Managed Starter ($99/mo) — TIGHTEST TIER

- Audits/mo: 1.8 Full (Comprehensive) — Jo pays Anthropic
- Jo COGS/audit (Comprehensive Managed): $1.709
- Jo COGS/customer/mo (audits): 1.8 × $1.709 = **$3.076**
- Stripe: 2.9% × $99 + $0.30 = $3.171
- Total Jo COGS/customer/mo: **$6.25**
- Margin: ($99 − $6.25)/$99 = **93.7%**
- Margin/audit: $52.74

**Verdict:** Well above 80%. **BUT** — this assumes the **EST 295k tokens / Comprehensive holds**. Sensitivity analysis:
- At 500k tokens/audit (large monorepo): $2.85/audit × 1.8 = $5.13/mo audits; total COGS $8.30; margin = 91.6%. Still safe.
- At 1M tokens/audit (Penny's "hooked up a monorepo and runs 10 a day" scenario from prd-review §3.5): COGS per audit ≈ $5.70. If a single tenant runs 10 Comprehensive/day × 30 days = 300 audits/mo × $5.70 = **$1,710 Anthropic cost on a $99 plan**. **The token cap is non-negotiable.** See §6 below.

### 3.5 Managed Pro ($249/mo, includes Auto-PR V1.5)

- Audits/mo: 5 Full + 0.5 Auto-PR bundles/mo (PRD §15 >15% attach = `EST` 0.5/mo)
- Audit COGS: 5 × $1.709 = $8.55
- Auto-PR COGS: 0.5 × $4.25 = $2.13
- Stripe: 2.9% × $249 + $0.30 = $7.521
- Total Jo COGS/customer/mo: **$18.20**
- Margin: ($249 − $18.20)/$249 = **92.7%**
- Margin/audit-equivalent: ~$42/audit

**Verdict:** Above 85%. Auto-PR-included-in-Pro pricing holds.

### 3.6 CLI mode ($19/mo)

- Audits/mo: 1.8 (mix similar to BYOK Starter, but CLI runs against customer's Claude Code — Anthropic cost = $0 to Jo AND $0 to customer-as-Anthropic-charge — customer pays Anthropic via their pre-existing Claude Code subscription)
- Jo COGS/audit: Railway $0 (CLI runs on customer's machine), Storage = `EST` $0.001 (no source storage; AuditEvents only carry findings per system-diagram §3d invariant)
- Jo COGS/customer/mo: 1.8 × $0.001 = $0.002
- Stripe: 2.9% × $19 + $0.30 = $0.851
- Total Jo COGS/customer/mo: **$0.85**
- Margin: ($19 − $0.85)/$19 = **95.5%**
- Margin/audit: $10.08

**Verdict:** Cleanest absolute cost-to-Jo of any paid tier. CLI is pure-platform-fee economics, exactly as PRD §12 positions.

### 3.7 Auto-PR one-shot ($49/bundle, BYOK only)

- Per Penny's prd-review §3 + the system-diagram §3e flow + her "tokens on us" recommendation (which Meter accepts — see verdict below):
- Anthropic cost (build agents + re-audit gate): $4.25
- Railway compute (60 min build+reaudit × 1 vCPU): $0.056
- Storage delta: $0.012
- Stripe: 2.9% × $49 + $0.30 = $1.721
- Total Jo COGS/charge: **$6.04**
- Margin: ($49 − $6.04)/$49 = **87.7%**

**Verdict:** Above 85%. Penny's "tokens on us for Auto-PR even on BYOK paths" survives the math. **Meter endorses Penny's §3 recommendation** — the flat $49 only holds at average bundle size; if Scout's tiered $15/$49/$99 prevails, recompute with these numbers:
- **$15 Small bundle:** assume 1× Comprehensive-equivalent build + 0.5× re-audit = $2.55 Anthropic + $0.035 Railway + $0.005 storage + $0.74 Stripe = $3.33 COGS; margin = ($15 − $3.33)/$15 = **77.8%** — **BELOW 80% threshold. FLAG.** Recommend $19 Small as the minimum defensible floor.
- **$49 Medium:** same as above; 87.7% margin.
- **$99 Large bundle:** `EST` 2× tokens = $8.50 Anthropic + $0.084 Railway + $0.018 storage + $3.17 Stripe = $11.77 COGS; margin = **88.1%**.

---

## 4. Customer-level LTV

Churn assumptions (`EST`, cited against PRD §3a competitive landscape):

| Tier | Monthly churn `EST` | Anchor |
|---|---|---|
| Free | 95%/mo (single-use behavior) | Tire-kicker pattern; PRD §15 attach 20% in 30d, rest churns |
| BYOK Starter | 7%/mo | B2B dev-tool benchmark; e.g., Cursor's $20/mo annual churn `EST` 5–8% (no public number; conservative midpoint) |
| BYOK Pro | 5%/mo | Higher commitment / mixed-use; SonarQube-class retention `EST` |
| Managed Starter | 6%/mo | Non-technical persona; slightly higher churn than technical-self-service |
| Managed Pro | 4%/mo | Higher commitment + Auto-PR lock-in increases retention; comparable to Vanta-class retention `EST` ~96%/yr |
| CLI | 8%/mo | Privacy-sensitive, project-driven; episodic |
| Auto-PR | n/a (one-shot) | Treated as expansion revenue, not subscription |

Industry-benchmark substantiation pending Comply's FTC-substantiation check before any external use of these numbers (PRD §14.5 substantiation rule). Marked `EST` until then.

**LTV per tier (ARPU / monthly churn):**

| Tier | Monthly margin (USD) | LTV (USD) |
|---|---|---|
| BYOK Starter ($29) | $27.81 | $27.81 / 0.07 = **$397** |
| BYOK Starter ($19) | $18.10 | $18.10 / 0.07 = **$259** |
| BYOK Pro | $76.25 | $76.25 / 0.05 = **$1,525** |
| Managed Starter | $92.75 | $92.75 / 0.06 = **$1,546** |
| Managed Pro | $230.80 | $230.80 / 0.04 = **$5,770** |
| CLI | $18.15 | $18.15 / 0.08 = **$227** |

Annual billing (Penny's 2-mo-free per PRD §12): for a customer on annual at $290 (Starter $29 × 10), LTV-month-1 = $290 cash up-front, churn-decayed monthly margin equivalent retained. Annual customers churn `EST` 50% slower per industry pattern → effective annual-cohort LTV is ~1.4× the monthly-cohort number above. Not modeled in baseline (conservative).

---

## 5. LTV/CAC ratio

CAC per channel per Phase 8 GTM (PRD §15.5 channels — owned by Signal):

| Channel | `EST` CAC | Anchor |
|---|---|---|
| X / Twitter (build-in-public) | $10–$30 | `EST` — organic build-in-public + paid amplification budget `EST` $50/wk × 4 channels at MVP |
| Hacker News (Show HN, organic) | $0–$5 | One-shot; bursty |
| Product Hunt | $0–$15 | One-shot launch; bursty |
| IndieHackers | $5–$15 | Time-cost only at MVP |
| Discord | $5–$15 | Time-cost + occasional paid amplification |
| Reddit | $5–$20 | Time-cost; #ad disclosure per Comply |
| SEO content (Lens, 12 posts by M5) | $10–$40 | Slow ramp; CAC drops over time |
| Partner integrations | $0 if co-marketing | Speculative |

**Blended `EST` CAC at MVP = $40** (heavy on time-cost; minimal paid). Drops to $20–$25 at sustained run-rate as SEO compounds.

**LTV/CAC ratio (3:1 viability threshold):**

| Tier | LTV | CAC `EST` | Ratio | Verdict |
|---|---|---|---|---|
| BYOK Starter ($29) | $397 | $40 | **9.9** | ✓ Excellent |
| BYOK Starter ($19) | $259 | $40 | **6.5** | ✓ Still healthy — Penny's $19 instinct does NOT break LTV/CAC |
| BYOK Pro | $1,525 | $40 | **38.1** | ✓ Cleanest |
| Managed Starter | $1,546 | $40 | **38.7** | ✓ Cleanest |
| Managed Pro | $5,770 | $40 | **144.3** | ✓ Cleanest |
| CLI | $227 | $40 | **5.7** | ✓ Healthy |
| Free → conversion to any paid | n/a | $22.50 free-cogs + $40 CAC = $62.50 blended | n/a | Folded into paid-tier LTV/CAC |

**All paid tiers clear 3:1 by wide margins.** Pricing has substantial defensible slack against CAC variance.

**Payback period (CAC / monthly margin):**
- BYOK Starter $29: $40 / $27.81 = **1.4 months**
- BYOK Starter $19: $40 / $18.10 = **2.2 months**
- BYOK Pro: $40 / $76.25 = **0.5 months**
- Managed Starter: $40 / $92.75 = **0.4 months**
- Managed Pro: $40 / $230.80 = **0.2 months**
- CLI: $40 / $18.15 = **2.2 months**

All under 3-month payback. Healthy.

---

## 6. Token-budget-overrun risk (Managed tier) — PRD §19 R1

PRD §19 R1: "LLM cost overrun in Managed tier — High likelihood, High impact." This is the only tier where Jo carries the Anthropic bill on uncapped usage.

**Breach point math (Managed Starter $99):**
- Revenue: $99/mo
- Monthly margin at modeled 1.8 audits/mo: $92.75
- Per-Comprehensive Anthropic cost: $1.67 (modeled) — $5.70 (worst-case 1M-token monorepo)
- Breakeven (zero-margin) point at modeled $1.67/audit: $99 / $1.67 = **59 Comprehensive audits/mo** ($99 − Stripe $3.17 − Railway/Storage 59×$0.038 = $93.59 left for Anthropic → 56 audits).
- Breakeven at worst-case $5.70/audit: ($99 − $3.17 − 59×$0.038) / $5.70 = **16.4 Comprehensive audits/mo**. Below 17 audits before margin goes negative on bad-monorepo cases.

**Margin-floor token cap recommendation (Meter):**
- **Managed Starter:** hard cap at **$15 of Anthropic spend / tenant / month** (allows ~9 Comprehensive audits at modeled rate, ~3 at worst case, leaving 84%+ margin floor). UI degrades gracefully per Penny's prd-review §3.5: *"plug in a BYOK key to continue for the rest of the month."* Locks PRD §19 R1 risk closed.
- **Managed Pro:** hard cap at **$45 of Anthropic spend / tenant / month** (allows ~27 Comprehensive at modeled rate, leaving ~$185 margin floor on $249 plan = 74% — above the floor with room for Auto-PR bundles).
- **Auto-PR bundles** count against the bundle's $49 price, not the monthly Managed cap (separate line).

**Where the cap fires in code:** PRD §13.5 "per-tenant token budgets for Managed tier" — Edge Function `mint-runner-jwt` checks tenant's MTD Anthropic spend (tracked in `billing_events` or new `tenant_token_usage` table — coordinate with Atlas) BEFORE minting the runner JWT. If over cap, mint fails; UI shows `/app/billing/token-budget-exceeded` (already in sitemap.md). Cap enforced **before** the Anthropic call, not after — closes the "kill it once it's burning" failure mode.

---

## 7. Meter's exit-gate self-verdict

**Phase-7 gate per `BUILD_FLOW.md`:** positive contribution margin at projected token cost per tier.

| Tier | Contribution margin | Above target threshold? |
|---|---|---|
| Free | −$0.90/mo (expected loss; bounded by acquisition math) | n/a — acquisition channel; bound documented (§3.1) |
| BYOK Starter $29 | 95.9% | ✓ (target ≥80%) |
| BYOK Starter $19 (Penny's instinct) | 95.3% | ✓ (still ≥80%) |
| BYOK Pro $79 | 96.5% | ✓ (target ≥85%) |
| Managed Starter $99 | 93.7% (at modeled tokens) — 91.6% (at 500k-token audits) — DEPENDS ON CAP (§6) at worst case | ✓ (target ≥80%) **conditional on §6 cap landing in M2** |
| Managed Pro $249 | 92.7% | ✓ (target ≥85%) |
| CLI $19 | 95.5% | ✓ |
| Auto-PR $49 (flat) | 87.7% | ✓ (target ≥80%) |
| Auto-PR $15 (Penny's S tier) | 77.8% | ✗ **FLAG TO PENNY — recommend $19 floor** |

**Meter's verdict: PASS WITH FIXES.** Every locked tier clears contribution-margin thresholds. Two conditions on the pass:
1. **§6 token cap MUST ship in M2** alongside Stripe + Managed mode. PRD §13.5 already requires it; this doc names the exact $15/$45 numbers to gate at. **Meter blocks M2 exit gate** if `tenant_token_usage` (or equivalent) table + mint-runner-jwt cap-check is not in code by M2 close.
2. **If D5 lands as tiered S/M/L Auto-PR pricing,** the Small bundle MUST be priced ≥$19 to clear margin floor. Penny's $15 Small breaks the gate.

---

*End of unit-economics.md v0.1. Meter — DevOps Layer.*
