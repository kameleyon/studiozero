# PRD v0.3 — Hook Review (Conversion / Funnel Lens)

**Date:** 2026-05-10
**Reviewer:** Hook (Growth — Conversion Rate Optimization)
**Document under review:** `PRD.md` v0.3
**Stance:** Scientific, unemotional, every claim is a hypothesis until A/B-validated. Funnel math beats opinion.

---

## Verdict: **PASS WITH FIXES**

The PRD is architecturally sound (Penny + the v0.2 panel did that work), but it is **funnel-blind**. It specifies what the product *does* and almost nothing about how a stranger becomes a paying customer. The Strict-elite rubric is a conversion weapon if the FAIL screen is engineered correctly, and a churn engine if it is not. v0.3 does not spec the FAIL screen, does not name the Aha moment, does not commit a time-to-first-value (TTFV) target, does not include an A/B test plan, and ships a pricing ladder with a 3.1x jump that no decoy bridges. These are not architectural problems. They are conversion problems. They are mine.

---

## Top-line summary (3 sentences)

1. The audit-fail-buy-fix-pass loop is the entire monetization thesis, yet the **FAIL moment UX is not specced anywhere** — without a sub-CTA inside the verdict screen, FAIL is just churn with a credit card.
2. The pricing ladder has a **$79 → $249 (3.1x) gap with no decoy**, the free tier kills its own activation dopamine loop ("1 audit per signup" — Decision D2 already flagged), and the Auto-PR upsell is positioned as a flat bundle when it should be both per-finding and per-effort-tier.
3. There is **zero A/B test plan, zero TTFV target, zero defined Aha moment** — the document treats conversion as something that happens after engineering, rather than a system that engineering is built around.

---

## Blockers (must fix before any traffic hits the funnel)

### BL1. FAIL-screen UX is not specced (§7.2 Step D)
**ICE:** Impact 10 · Confidence 9 · Ease 8 → **27/30**
**Hypothesis:** "FAIL verdict screens with a single primary 'Ship the fixes for $49' CTA above the fold convert ≥18% of free-tier failures to paid, vs. ≤3% for a naked FAIL with no path forward."
The PRD locks Strict-elite as ≥70% first-audit FAIL by design (§15). That means **70%+ of users hit FAIL before they hit value**. If the FAIL screen does not turn the failure into an upgrade moment, the rubric is a churn machine.

What §7.2 Step D currently specs: "Verdict: PASS / PASS WITH FIXES / FAIL" + "Checklist." That is a data structure, not a UX. **Missing:**
- Single primary CTA above the fold ("Ship the fixes — $49" or "Buy Auto-PR — $49")
- Emotional reframe copy: FAIL is not "you failed," it is "we found 14 issues we can fix for you by tomorrow"
- Per-finding micro-CTAs ("Fix this for $5" — see BL2)
- Social proof inline ("87% of teams pass on their second audit")
- A "Dispute Finding" link (Penny M4) below the fold, not above it — disputing must not be the easiest action
- Re-audit countdown ("Your free re-audit is available now") for Free tier (Decision D2 dependency)

**A/B test queue (post-spec):**
- V1 (control): findings list, no CTA
- V2: top banner with "$49 Auto-PR" flat CTA
- V3: per-finding "Fix this — $5" with running cart total
- V4: V3 + "Bundle all 14 fixes — $49 (save $21)" anchor

### BL2. No A/B test plan exists anywhere in the PRD
**ICE:** Impact 9 · Confidence 10 · Ease 9 → **28/30**
**Hypothesis:** "Shipping without PostHog Experiments wired into the landing page, pricing page, and FAIL screen by M1 means the first 25 paying customers (§15 target) deliver zero conversion data we can defend."
PostHog is already in §13.6 for analytics. Experiments are one config flag away. The PRD must add an Appendix X (or §6.4) defining the **launch test matrix**: landing-page hero copy, pricing-page tier order, free-tier CTA copy, FAIL-screen CTA, signup form field count. Minimum 5 active experiments at M1. Without this, "Auto-PR upgrade attach rate > 15%" (§15) is a wish, not a target.

### BL3. Time-to-First-Value (TTFV) is undefined
**ICE:** Impact 10 · Confidence 9 · Ease 7 → **26/30**
**Hypothesis:** "Free signup → first FAIL verdict with cited evidence in < 8 minutes drives trial→paid conversion 2-3x higher than > 15 minutes (industry SaaS data, GrowSumo / OpenView benchmarks)."
The PRD claims Quick audit runtime "~10–15 min" (§7.2) and "< 10 min p95" (§14.1). **But TTFV is not just runtime — it is signup-to-Aha.** Add up the actual funnel from a cold landing page:

1. Land → signup (email + verify) — **2–5 min**
2. Workspace setup → mode selection — **1–3 min** (assumes BYOK paste; CLI mode is 5–10 min)
3. Connect repo OR enter URL — **1–2 min**
4. Wait for audit — **10–15 min**

**Cold-start TTFV: 14–25 min.** That is brutal. SaaS benchmarks: every minute past 5 costs ~7% conversion. By minute 20 you have lost more than half your funnel.

**Mitigation (must spec):**
- Surface audit on a demo URL should run in **< 3 minutes** for the free tier (this is the Aha hit; full audit can run after)
- Email verification is *not required* before the first audit (deferred until upgrade attempt)
- Mode selection deferred — free tier defaults to Managed-on-Jo's-tokens for Surface only (Jo absorbs the ~$0.10 token cost as CAC)
- A "watch the audit run live" progress page with streamed findings is the entertainment layer that prevents abandonment during the 3-min wait

### BL4. The Aha moment is not named
**ICE:** Impact 9 · Confidence 9 · Ease 10 → **28/30**
**Hypothesis:** "The Aha moment is the first FAIL verdict with cited evidence (screenshot of the broken thing + contrast measurement + recommended fix) — naming and instrumenting this event lifts onboarding completion telemetry from noise to signal."
PostHog needs an explicit `aha_moment_reached` event fired at the moment a user sees their first finding with evidence rendered. Onboarding success = % of signups who reach this event. Everything else is vanity.

---

## Criticals (fix before M1 public)

### C1. Pricing ladder has no decoy at the Pro→Pro Managed jump (§12)
**ICE:** Impact 9 · Confidence 8 · Ease 8 → **25/30**
**Hypothesis:** "Inserting a 'BYOK Pro + Auto-PR add-on' at $129/mo between $79 (BYOK Pro) and $249 (Managed Pro) doubles Managed Pro conversion by making it look like the obvious 'just upgrade and stop thinking' choice."
Current ladder: Free → $19 (CLI) → $29/$79 (BYOK) → $99/$249 (Managed) → $49 one-time (Auto-PR).
The $79 → $249 jump is 3.1x. That is the canonical "no decoy" failure. Classic decoy theory (Ariely / Dan Lovallo): insert a **deliberately worse-priced middle tier** that makes $249 look obvious.

**Proposal:** "BYOK Pro + Auto-PR" at $129/mo (unlimited BYOK audits + 4 Auto-PR bundles/mo). Customer math: 4 × $49 = $196 á la carte, but you pay $129 and Anthropic still bills you for tokens. Versus Managed Pro $249/mo: unlimited audits, unlimited Auto-PR, tokens included. The $129 tier *exists to make $249 win*. Expected: 30-50% of $129 tier-interested users upgrade to $249.

### C2. Free tier kills its own activation loop (§12, Decision D2)
**ICE:** Impact 10 · Confidence 10 · Ease 10 → **30/30** — perfect score, ship the fix
Penny already C6'd this in v0.2. v0.3 Decision D2 acknowledges it. **It is still unfixed in §12.** Stop deliberating; switch to "1 Project (URL), unlimited Surface re-audits" and ship it. Funnel math:

| Free model | Audits/user | PASS-reach rate | Trust signal | Paid-conversion lift vs control |
|---|---|---|---|---|
| 1 audit per signup (current) | 1 | ~30% (only those who score ≥95 first try) | Low — most users only experience FAIL | Control |
| Unlimited Surface re-audits on 1 project | 4-8 typical | ~70% (iterate until PASS) | High — they feel the rubric works | **+40-60% to paid Code/Full** |

The "1 per signup" cap creates urgency but **for the wrong action** — users churn instead of upgrading because they never got the dopamine hit that makes them believe the paid tier is worth it. Switch this immediately.

### C3. Auto-PR upsell is mispositioned as flat bundle (§11.2, §12)
**ICE:** Impact 8 · Confidence 7 · Ease 7 → **22/30**
**Hypothesis:** "Per-finding micro-pricing ('Fix this for $5') inside the findings checklist converts 2.5x more total revenue than a flat $49 bundle, because users add fixes one by one without ever facing the $49 decision wall."
Penny's M3 (tiered S/M/L bundles) is correct but doesn't go far enough. Stack the model:

1. **Per-finding** — "Fix this for $5" button on every finding card. Running cart total at top.
2. **Bundle anchor** — Once cart hits $35, show "Bundle all 14 fixes for $49 — save $21" (Ariely anchor).
3. **Tier ceiling** — Bundle pricing follows Penny's S/M/L $15/$49/$99 by aggregate `estimated_effort`.

This gives Hook three test variants in one config. The PRD currently only specs (3). Add (1) and (2) to §11.2.

### C4. Auto-PR attach rate target (15%) has no funnel math (§15)
**ICE:** Impact 8 · Confidence 8 · Ease 9 → **25/30**
**Hypothesis:** "Without funnel math under the 15% target, the metric is unfalsifiable — we need the explicit chain FAIL → views findings → clicks 'Fix' → completes checkout, and a target loss rate at each step."
The PRD writes ">15% of Pro customers" with no breakdown. Real funnel target:

| Step | Target retention | Cumulative |
|---|---|---|
| FAIL verdict reached | 100% | 100% |
| User scrolls to findings (Aha) | 85% | 85% |
| Clicks any "Fix this" / Auto-PR CTA | 40% | 34% |
| Reaches Stripe checkout | 75% | 25.5% |
| Completes purchase | 60% | **15.3%** |

These are testable per-step. The 15% number is fine; the chain to it is what's missing. Spec this in §15.

### C5. Signup friction count is too high (§6.1)
**ICE:** Impact 9 · Confidence 8 · Ease 9 → **26/30**
**Hypothesis:** "Each removed signup field lifts completion ~10% (Imaginary Landscape benchmark, replicated across HubSpot / Unbounce / Drift studies)."
Current friction inventory implied by §6.1 + §7.1:
1. Email
2. Password (or OAuth)
3. Email verification
4. Workspace name
5. Mode selection (BYOK / CLI / Managed)
6. API key paste (BYOK) OR CLI install (CLI) OR Stripe checkout (Managed)
7. GitHub OAuth / repo connection

**That is 7 steps before the user has run anything.** Cut to 3:

1. **Email + magic link** (no password, defer verification until upgrade attempt)
2. **URL paste** (Surface audit, no mode selection — Jo absorbs free-tier tokens)
3. **Watch the audit run**

Mode selection, workspace name, GitHub OAuth are all deferred to *after* the Aha moment. Spec this onboarding shortcut in §7.1.

### C6. Landing page / pricing page A/B plan missing
**ICE:** Impact 8 · Confidence 9 · Ease 8 → **25/30**
**Hypothesis:** "A landing page testing 3 hero variants (problem-framing / outcome-framing / fear-framing) with PostHog Experiments converges on a winner in ≤2 weeks at our expected traffic and beats untested copy by 25-40%."
Add §6.5 "Marketing Funnel Surfaces" spec'ing:
- Landing page (hero, social proof, demo video)
- Pricing page
- FAIL → upsell page
- Re-audit page (Free tier)

Each surface needs an experiment slot defined.

---

## Majors

### M1. Onboarding API-key paste creates a "leave the page" friction (§6.1, §7.1)
**ICE:** 7 · 8 · 7 → 22/30
Asking BYOK users to paste their Anthropic API key during onboarding sends them to console.anthropic.com — they don't come back. **Hypothesis:** defer API key request until after the first free Surface audit. Once they've felt value, they'll go get a key.

### M2. CLI mode pairing flow is opaque (§6.3, §7.1)
**ICE:** 6 · 7 · 6 → 19/30
Three-step pairing (install CLI → run command → paste code) before the user has seen anything. **Hypothesis:** CLI mode should *only* be offered after a successful free Surface audit, framed as "Privacy upgrade — keep your code local."

### M3. Annual billing CTA is buried (§12)
**ICE:** 6 · 8 · 9 → 23/30
"2 months free" annual is one line. **Hypothesis:** "Annual toggle at top of pricing table with default-on lifts annual ARR mix from ~15% to 40%+ (Stripe billing benchmark)."

### M4. No "downgrade prevention" / cancellation flow specced
**ICE:** 6 · 7 · 7 → 20/30
The PRD has 8 risks (§18). None are "churn." **Hypothesis:** "Cancellation flow with a one-click 'pause for 30 days' option retains 25-35% of churners."

### M5. No referral / network mechanic
**ICE:** 7 · 6 · 5 → 18/30
**Hypothesis:** "Auto-attaching a 'Audited by Studio Zero' badge to public PR comments (with the customer's permission, opt-in) generates 1.4 free signups per PR closed."

### M6. "Comprehensive" audit gating (§9.1) — Surface-product-capped-at-Quick-depth funnel
**ICE:** 7 · 8 · 8 → 23/30
The §9.1 cap "Surface audits cap at Quick or Custom" is fine, but the free-tier user must see in the UI that Comprehensive exists and is locked. Locked features are upsell triggers. **Hypothesis:** showing locked Comprehensive option with "Upgrade to unlock" CTA in the depth selector lifts free→paid conversion 12-18%.

---

## Minors

### m1. Stripe checkout single-page (§6.1)
Multi-step checkouts leak 15% per step. Mandate single-page checkout.

### m2. Trust badges / risk reversal missing from §12 pricing copy
Money-back guarantee, SOC 2 status, customer count — none mentioned. Spec a §12.5 "Trust Layer."

### m3. Score breakdown by category (§10) is a great upsell trigger
"Your Accessibility score is 62/100 — upgrade to Code audit for line-level fixes" copy not specced.

### m4. NPS > 30 target (§15) is wrong metric
NPS surveys are vanity. Replace with: "% of users who run a second audit within 7 days" (real activation signal).

### m5. Findings export (Markdown/JSON/CSV) is a friction-killer when *not* gated
**Hypothesis:** giving free users CSV export of their FAIL findings increases social sharing (each share = ~0.3 leads). Free tier gets MD/CSV; JSON is paid-tier (developer trigger).

---

## Polish

- **p1.** Free Surface audit demo URL should be pre-filled with a famously-broken site (a well-known accessibility-failing landing page) as the placeholder. They click "Audit this" → instant Aha without typing.
- **p2.** Post-PASS share: "I scored 96 on Studio Zero — get audited at studiozero.app" tweet/LinkedIn copy auto-drafted on PASS screen.
- **p3.** Failing-audit screen should show "X of last 100 audits also failed on this finding" — normalizes the failure and proves the rubric is consistent.
- **p4.** Pricing page tier order: Free | $19 CLI | $29 Starter | **$79 Pro (highlighted "Most Popular")** | $129 Pro+AutoPR (decoy) | $249 Managed Pro. Visual emphasis on $79 with $129 as the soft anchor pushing them to $249.

---

## Add proposals (sections / surfaces to add to PRD v0.4)

### A1. §6.5 — Marketing Funnel Surfaces
Spec: landing page, pricing page, FAIL→upsell page, re-audit page. Each surface owns ≥1 active experiment.

### A2. §7.0 — Conversion Funnel Definition (before §7.1 Onboarding)
Defines: TTFV target (< 8 min signup→first FAIL), Aha event (`aha_moment_reached` fires on first rendered finding), free→paid trigger events, the full funnel from landing page click to PASS verdict.

### A3. §15.1 — Per-Step Funnel Targets
Breaks down §15 macro metrics into per-step retention (see C4 table).

### A4. §17 D10–D12 — Conversion decisions log
- D10: Decoy tier $129 yes/no
- D11: Per-finding micro-CTAs vs flat-bundle Auto-PR
- D12: Email verification deferred to upgrade (vs at signup)

### A5. §11.3 — Findings UI / Per-Finding CTA spec
Per-finding "Fix this for $5" buttons, running cart, bundle anchor at $35-threshold.

### A6. §20 — Experiment Registry (new section)
Living table: every A/B test, hypothesis, ICE score, status, result. PostHog Experiments backed.

---

## Remove proposals (pure friction with no conversion data)

### R1. Email verification before first audit (§6.1, §7.1)
Defer to upgrade attempt. ~10% conversion lift.

### R2. Workspace naming during onboarding (§7.1 step 1)
Auto-generate from email; let user rename later. ~5% lift.

### R3. Mode selection during onboarding (§7.1 step 2)
Defer to upgrade attempt. Free tier defaults to Surface-on-Jo's-tokens. Mode selection is a paid-tier decision.

### R4. The §15 NPS > 30 metric
NPS is a survey artifact. Replace with second-audit-within-7-days behavioral metric (see m4).

### R5. "Custom" audit depth in the free tier
Free tier defaults to Quick. Custom is itself an upsell trigger; hiding it from free creates a 'discover paid feature' moment.

---

## Decisions D1-D9 votes

Hot zone is D2, D3, D4, D5. Voting on all 9 where I have signal.

### D1. GitHub App vs OAuth — **ABSTAIN** (Shield's call, not mine)
The funnel impact is similar either way; what matters is the OAuth-consent-screen UX (GitHub App's per-repo picker actually *helps* conversion by reducing scope anxiety). Mild lean: GitHub App. Add 3-5 days is fine.

### D2. Free tier: "1 per signup" vs "1 Project, unlimited Surface re-audits" — **VOTE: UNLIMITED RE-AUDITS**
**ICE:** 10 · 10 · 10 → **30/30**. This is the single highest-ROI fix in the entire PRD. See C2. The "1 per signup" cap eliminates the activation dopamine loop. Switch immediately. Not a debate.

### D3. Auto-PR scope — **VOTE: DEFER TO V1.5, KEEP SPECS-ONLY IN MVP**
**ICE:** 8 · 7 · 9 → 24/30
But add per-finding "Fix this for $5" micro-CTAs *in MVP* with **manual fix delivery** (specs + a Loom video walkthrough emailed within 24h). This sells the upgrade without needing Forge/Vega wired. When V1.5 ships Auto-PR, the funnel UI doesn't change — only the fulfillment backend. This is the cheapest way to test pricing without building the engine.

### D4. BYOK Starter pricing $29 vs $19 — **VOTE: A/B TEST, default to $19**
**ICE:** 7 · 6 · 9 → 22/30
Penny's $19 logic is correct on the Cursor comparison. **But** $29 is testable. Run PostHog Experiment: 50/50 split on the pricing page for first 60 days, measure paid-conversion + MRR per cohort. Don't lock the price; lock the experiment. Default $19 while data collects.

### D5. Auto-PR pricing flat $49 vs tiered S/M/L $15/$49/$99 — **VOTE: TIERED + PER-FINDING**
**ICE:** 8 · 8 · 7 → 23/30
Penny's tier idea is right. Stack it: per-finding $5 → bundle anchor $35-threshold → tier ceiling S/M/L $15/$49/$99. See C3. This is three pricing experiments in one feature; we'd be insane to ship flat.

### D6. Milestone reorder M2↔M3 (Managed before CLI) — **VOTE: MANAGED BEFORE CLI**
**ICE:** 7 · 8 · 8 → 23/30
Managed is the highest-margin tier and the only one that converts non-technical buyers (the larger market). Ship it second. CLI is a privacy-pitch refinement that comes after we have ARR.

### D7. CLI tamper-detection messaging — **VOTE: DROP THE TRUST CLAIM, WATERMARK "SELF-AUDITED / UNVERIFIED"**
**ICE:** 6 · 8 · 9 → 23/30
The "Studio Zero Certified" badge becomes a *visible upgrade trigger* — every CLI customer sees the "Unverified" watermark on their reports and wants the badge. That's a $19→$99 upsell mechanic, not a security feature. Shield is right on the security; Hook is happy because it converts.

### D8. Sandboxing strategy — **ABSTAIN** (Shield/Atlas call)
Funnel impact zero. Whatever the team can ship fastest without compromising security.

### D9. SSRF egress / prompt-injection / telemetry redaction / ingestion limits — **ABSTAIN** (Shield/Cipher call)
Funnel impact zero, but flag: these all need to ship before any traffic. Don't let security work delay the marketing site (Sprint's M6 — pull marketing into M0 is the right call).

**Vote count:** 6 votes cast (D2, D3, D4, D5, D6, D7); 3 abstentions (D1, D8, D9 — outside conversion lens).

---

## Closing note

The PRD is a builder's document. It needs a 30% rewrite to also be a marketer's document. The Strict-elite rubric + FAIL→fix→PASS loop is the most monetizable thing in this codebase, and v0.3 ships it without naming the Aha moment, without specifying the FAIL-screen CTA, without an A/B plan, and without a decoy tier. None of those are hard fixes. All of them are blockers because the §15 metrics ("25 paying customers in 60 days," ">15% Auto-PR attach") cannot be hit without them — they require a funnel, and a funnel does not exist yet.

Ship v0.4 with §6.5, §7.0, §15.1, §17 D10-D12, §20 added. Then we have a product that can be sold, not just built.
