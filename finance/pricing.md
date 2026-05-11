# Studio Zero — Pricing (v1, MVP-locked)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Penny (Strategy / Business Model)
**Status:** Canonical pricing source-of-truth for Phase 7. Composed against by Meter (`finance/unit-economics.md`, parallel), Ledger (Stripe product/price IDs, M2), Comply (`compliance/refund-matrix.md`, M2).
**Phase:** 7 of BUILD_FLOW.md.

> This document is the contract. Ledger configures Stripe to match this table; Comply writes the refund matrix to match this table; Meter computes contribution margin from this table. If the numbers below change, this file changes first.

---

## 1. Pricing thesis

Studio Zero prices like a **code-quality SaaS**, not an **AI builder**. The audit-tool comparable class — SonarQube Cloud Team ($32/mo for 5 contributors), Codacy Pro ($15/dev/mo), Snyk Team ($25/dev/mo), Deque axe Monitor ($40/site/mo) — sets the low-end anchor. The freelance / agency audit class — Toptal/Upwork UX audits ($500–2,500), Deque/Level Access a11y audits ($3k–15k), Clerb-style comprehensive product audits ($2k–5k) — sets the high-end anchor. Vanta's SOC2 readiness platform ($9k–30k/yr) sets the **pattern** (versioned rubric + remediation product) we're cloning, applied to product quality instead of compliance. We are **explicitly not** compared to v0.dev ($20), Bolt.new ($20), Lovable ($25), Cursor ($20), Replit Agent ($25), or Devin ($20/$500) — those are AI builders, a different category, and our marketing must never anchor against them. Reference: PRD §3a competitor matrix (named comparables with verified 2026-05 prices). Substantiation evidence reserved at `marketing/claims-substantiation/claim-pricing-positioning.md` (Phase 8 GTM authoring).

---

## 2. Tier table (locked v1)

All prices USD. Monthly listed; annual = **2 months free** (10× monthly billed once). Stripe-managed; product/price IDs are Ledger's at M2 wire-up.

### 2.1 Free

| Field | Value |
|---|---|
| **Price** | $0 / mo |
| **Buyer persona** | Tire-kicker; demo-viewer; technical solo founder evaluating the rubric on a project they're embarrassed about (PRD §5: *"technical solo founder"* in evaluation mode). JTBD: *"Prove this audit isn't snake oil before I give it my repo or my card."* |
| **What's included** | 1 Project (customer-attested own URL), **unlimited Surface re-audits** within that project (D2). Email-verification gated. IP-rate-limited. Quick or Custom depth only (Comprehensive locked, visible as upsell trigger per Hook M6). MD + CSV findings export. |
| **What's NOT included (gating function)** | Code SKU (no repo connection), Full SKU, Comprehensive depth, JSON export, second project, third-party URL audits (CFAA/Comply gate). |
| **Comparable competitor reference** | Lovable Free (5 msg/day), Bolt.new Free (1M tokens/mo), v0.dev Free, Codacy Free for OSS. We match category-norm free-tier *iteration* allowance (unlimited re-audits) — single-shot free tier would break PLG comp norms (Scout, Hook concur). |
| **Substantiation** | `marketing/claims-substantiation/claim-pricing-positioning.md` (Penny + Scout, Phase 8) |

### 2.2 BYOK Starter

| Field | Value |
|---|---|
| **Price** | **$29 / mo** (Sprint default) — A/B slot at **$19** for first 200 signups; **D4 OPEN, see §3** |
| **Annual** | $290 / yr ($29 × 10); A/B variant $190 / yr |
| **Buyer persona** | Technical solo founder (PRD §5 primary persona); indie hacker shipping a v1. JTBD: *"I just shipped my AI-generated codebase. I need a third-party rubric to tell me what's actually broken before TestFlight / Show HN."* |
| **What's included** | 2 audits / mo (any depth, any SKU — Surface / Code / Full), specs-only fixes, GitHub App connection (D1), private workspace, full findings export (MD / CSV / JSON), retention 7d default (overridable 0–30d). Customer's Anthropic key; customer pays Anthropic for tokens. |
| **What's NOT included (gating function)** | >2 audits / mo → upgrade to BYOK Pro; tokens-on-us → upgrade to Managed Starter; Auto-PR fix delivery → V1.5 upcharge. |
| **Comparable competitor reference** | SonarQube Cloud Team ($32/mo, 5 contributors) — parity at $29. Codacy Pro ($15/dev/mo) — 93% above per-dev, defended because Codacy ships code-only findings and Studio Zero ships UX + a11y + copy + brand + audience + flow + code under one rubric (Scout SCOUT-B2). **NOT compared to** Cursor / v0 / Bolt ($20) — different category. |
| **Substantiation** | `marketing/claims-substantiation/claim-pricing-positioning.md` |

### 2.3 BYOK Pro

| Field | Value |
|---|---|
| **Price** | **$79 / mo** |
| **Annual** | $790 / yr |
| **Buyer persona** | Indie agency principal; freelance UX/dev consultant; small studio (1–5 people) who audits client work as a service deliverable. JTBD: *"I bill clients $500/audit for what I currently eyeball. Studio Zero gives me a defensible written rubric + line-cited findings I hand off as the deliverable."* PRD §5 *"indie agency / freelancer"*. `projects.client_tag` column lands at M2 for this persona (Jury M5). |
| **What's included** | **Unlimited** audits / mo (any depth, any SKU), specs-only fixes, GitHub App connection, **priority queue** (front-of-line during peak), client-tag organization (`projects.client_tag`, M2), full export, retention 7d default. Customer's Anthropic key. |
| **What's NOT included (gating function)** | Tokens-on-us → upgrade to Managed Pro; Auto-PR fix delivery → V1.5; multi-seat / team → V2 (deferred per Decision #9). |
| **Comparable competitor reference** | Codacy Pro at 5 devs ≈ $75/mo (parity). v0.dev Ultra $50/mo (we're 58% above — defended because v0 builds code without audit; not in our comp class). Bolt Pro 100 / Lovable Scale $100/mo (we're 21% below — and we ship the audit layer they don't). Deque axe Monitor $40/site/mo (we're 98% above per-site — defended because Deque ships a11y-only and we ship six axes). Toptal freelance audit one-off $500–2,500 → BYOK Pro at $790/yr = roughly the cost of 1–2 one-off freelance audits, with unlimited recurring coverage (Scout SCOUT-M5). |
| **Substantiation** | `marketing/claims-substantiation/claim-pricing-positioning.md` |

### 2.4 Managed Starter

| Field | Value |
|---|---|
| **Price** | **$99 / mo** |
| **Annual** | $990 / yr |
| **Buyer persona** | Non-technical solo founder (PRD §5); designer-founder who can't be bothered with API keys; founder who wants the audit-as-a-service experience with zero infrastructure friction. JTBD: *"I don't want to know what an Anthropic key is. I want to paste a URL or connect a repo and get a graded report."* |
| **What's included** | 2 Full audits / mo (URL + repo cross-referenced), tokens included (Jo's Anthropic key), per-tenant token budget enforced at runner side (M2; Meter caps), specs-only fixes, GitHub App connection, full export, retention 7d default. **Fair-use token cap:** $30/mo internal token budget (Meter sets floor; revisit weekly with first 5 customers). Cap-exceeded UX: BYOK pivot offer, not hard cut-off (Penny v0.2 M5). |
| **What's NOT included (gating function)** | >2 audits / mo → upgrade to Managed Pro; Auto-PR fix delivery → V1.5 (Managed Pro includes; Managed Starter pays upcharge); team / multi-user → V2. |
| **Comparable competitor reference** | Single freelance UX audit $500–2,500 one-off (Toptal/Upwork) → Managed Starter at $990/yr = ~one freelance audit recurring monthly. Replit Core $25/mo + ChatGPT Plus $20/mo + Vercel Analytics Pro $20/mo + axe Monitor $40/site/mo = ~$105/mo stitched, no unified rubric, no severity, no single score (Scout SCOUT-C4). Devin Core $20/mo doesn't audit, doesn't apply. **NOT compared to** Vanta ($9k–30k/yr) — Vanta is the *pattern* we borrow, not a price competitor; their compliance moat is V2+ for us. |
| **Substantiation** | `marketing/claims-substantiation/claim-pricing-positioning.md` |
| **COGS floor** | $5/mo contribution margin floor per PRD §12 economics. Meter's `finance/unit-economics.md` is the authoritative model; this tier MUST stay above floor at first 5-customer cohort or Penny re-prices. |

### 2.5 Managed Pro

| Field | Value |
|---|---|
| **Price** | **$249 / mo** |
| **Annual** | $2,490 / yr |
| **Buyer persona** | Serious team (3–10 person startup); agency operating audits at scale; engineering lead at a small startup running pre-launch / pre-investor gate audits (PRD §5 *"engineering lead at a small startup"*). JTBD: *"We ship every two weeks. Every release needs a defensible third-party audit, automated, with Auto-PR fixes when the rubric flags something."* |
| **What's included** | **Unlimited** Full audits / mo, tokens included, per-tenant token budget $80/mo internal (Meter); **Auto-PR fix delivery included at V1.5** (no upcharge at this tier — the Auto-PR upcharge in §2.7 is BYOK-only); priority queue; full export; retention 7d default. |
| **What's NOT included (gating function)** | Multi-region data residency → V2 (ARCH-D8, triggered by first EU customer); SOC2 / Compliance-Ready SKU → V2 enterprise tier (§6); team / multi-user → V2. |
| **Comparable competitor reference** | Devin Team $500/mo (10 seats, ACU-metered) — Managed Pro is **50% below Devin Team** and ships the audit layer Devin doesn't (Scout SCOUT-B2). Single Clerb-style comprehensive agency audit $2k–5k one-off → Managed Pro at $2,490/yr is one Clerb audit recurring monthly. Junior QA engineer fully-loaded $5–8k/mo (US W-2) → Managed Pro is ~3–5% of that cost, recurring. SonarQube Enterprise quoted; Codacy Business quoted — we sit firmly in the SMB band by design. |
| **Substantiation** | `marketing/claims-substantiation/claim-pricing-positioning.md` |
| **COGS floor** | $80/mo token cap = ~32% gross margin at peak; Meter computes contribution margin and confirms ≥60% at typical-usage cohort. Pricing holds only if Meter's typical-usage model confirms. |

### 2.6 CLI mode

| Field | Value |
|---|---|
| **Price** | **$19 / mo** (platform fee only) |
| **Annual** | $190 / yr |
| **Buyer persona** | Privacy-sensitive technical user; founder working under NDA; engineering lead at a regulated-industry startup (fintech, healthtech) who cannot send code off-machine (PRD §5 *"engineering lead at a small startup"* in regulated context). JTBD: *"My code does not leave my laptop. I will pay for the rubric and the orchestration; tokens come out of my Claude Code subscription."* |
| **What's included** | Local-folder audit intake (code never leaves customer's machine), CLI ↔ web pairing, Surface depths on customer's own URL, full findings export, `Private Run · Self-Audited` watermark on every verdict (D7). Customer's Claude Code subscription pays tokens. Ships at M3 per D6 (Managed before CLI). |
| **What's NOT included (gating function)** | Server-verified watermark (only Hosted/Managed produces this); tokens-on-us (Claude Code is customer's bill); GitHub App repo audit (no — local folder only at this tier; GitHub App is BYOK / Managed only). |
| **Comparable competitor reference** | No direct comp — *category-defining*. Closest pattern: Snyk Code local CLI (free for OSS, $25/dev/mo Team for commercial), Codacy CLI (free, paired with $15/dev/mo plan). $19/mo undercuts every named AI-builder ($20) and signals "audit tool, not builder tool" by anchoring below the builder floor. Matches BYOK Starter floor if D4 lands at $19 (which simplifies pricing-page positioning to *"$19 starter, two execution modes"*). |
| **Substantiation** | `marketing/claims-substantiation/claim-pricing-positioning.md` |

### 2.7 Auto-PR upcharge (V1.5)

| Field | Value |
|---|---|
| **Price** | **$49 per fix bundle** (Penny's locked recommendation) — Scout argues tiered S/M/L **$15 / $49 / $99**; **D5 OPEN, see §4** |
| **Applies to** | BYOK Starter, BYOK Pro, Managed Starter (Managed Pro includes Auto-PR — no upcharge at Managed Pro). |
| **Buyer persona** | Any BYOK customer who hit FAIL or PASS WITH FIXES and wants the fix written for them rather than written themselves. JTBD: *"The rubric proved I have 14 issues. Pay $49, get a PR with all 14 fixed, gated by re-audit before the PR opens."* |
| **What's included** | One PR against `studio-zero/fix-<run-id>` branch (never default branch — §11.2 hard rule); per-commit attribution to originating finding ID; Re-audit badge confirming Jury re-verified; AI-Authored trailer (EU AI Act Art. 50); Jury re-audit gate (PR not opened if re-audit FAILs — refunded). **Auto-PR always uses Studio Zero's internal tokens** even for BYOK customers (Penny v0.2 M3 rider — justifies the upcharge margin; ends the "double-dipping" perception). |
| **What's NOT included (gating function)** | Repeat fix bundles → repeat upcharge OR upgrade to Managed Pro (Auto-PR included). |
| **Comparable competitor reference** | **No comparable per-PR pricing in market** (Scout SCOUT-C7). Closest: defunct Sweep.dev was $48/mo flat; GitHub Copilot Autofix is bundled with Copilot Business ($19/user/mo) but ships security-only; Snyk Code auto-fix bundled with Team seat ($25/dev/mo) but ships security-only. **No competitor ships Auto-PR for UX + a11y + copy + brand + audience-fit findings against a versioned rubric** (Scout SCOUT-C2 — this is the moat). We get to *define* the pricing primitive. |
| **Substantiation** | `marketing/claims-substantiation/claim-defensible-wedge.md` (Scout, Phase 8) |

---

## 3. D4 resolution recommendation (BYOK Starter $19 vs $29)

**Penny's locked stance:** **Ship at $29 with an A/B test slot at $19 for the first 200 signups.** Decision deadline M2 ticket-cut (week 7); ship-tier deadline M2 exit (week 9); D4 closes at M2 exit regardless of Jo's call (F-MAJ-2 dual-deadline per `sprint/milestone-M2.md`).

**Defense for $29 (Penny's instinct):**
- Audit-tool comp class anchors at $29–$32 (SonarQube Team $32; Codacy Pro at 2 devs ≈ $30). $29 sits dead-center in the correct comp class. The whole §1 thesis depends on us *not* anchoring against the $20 AI-builder floor — pricing at $19 imports the wrong comparison set into the buyer's head ("oh, this is like Cursor"). It isn't.
- Contribution margin: BYOK Starter is platform-fee only (customer pays Anthropic). At $29 the platform fee covers GitHub App ops, runner-pool slice, support, Meter's runtime telemetry, and Stripe fee with margin. At $19 the contribution shaves ~33% — Meter's `finance/unit-economics.md` confirms the floor.
- Buyer-persona signal: the technical solo founder (PRD §5 primary) doesn't price-shop $10 spreads on tooling; they price-shop *what category* the tool is in. The $10 gap is symbolic but **for the wrong direction** — $19 says "AI tool"; $29 says "audit tool." Pick the brand.
- LTV/CAC: at $29 ARPU, a 6-month payback target means CAC ceiling ≈ $174 (assumes 60% gross margin floor per Meter). At $19, CAC ceiling drops to $114. Tighter CAC ceilings constrain Hook's experiment surface (PostHog Experiments, paid acquisition tests) — exactly the surface that produces the conversion data the panel wants.

**Concession to Hook + Scout + Herald ($19 camp):**
- They are right that the *funnel* benefits from a lower entry price. The A/B test slot at $19 for first 200 signups is the bridge: PostHog Experiments captures paid-conversion + 30-day-retention + ARPU-per-cohort data, Penny reads the cohort at M5 (first 5 paying customers per R10), and the locked price for v2 is **data-driven, not opinion-driven**. If $19 outperforms $29 on (conversion × ARPU × 90d retention) at the 200-signup readout, we move the locked tier to $19 in v2 of this doc.
- Where Hook's conversion math contradicts Penny: Hook's BL2 (no A/B plan) and C5 (signup friction) are real funnel issues that compound at $29 more than at $19. **Penny acknowledges this and surfaces the disagreement here rather than papering over it.** The A/B is the resolution mechanism.

**Sprint default if Jo doesn't decide by week 7:** Ship $29 + $19 A/B slot. D4 closes at M2 exit.

---

## 4. D5 resolution stance (Auto-PR flat $49 vs tiered $15 / $49 / $99) — V1.5

**Penny's locked stance:** **Flat $49 at V1.5 launch; revisit at V1.5 + 30d cohort.** Decision pushed to V1.5 spec-kickoff (~week 17) per owner-matrix.

**Defense for flat $49 (Penny):**
- **Simpler conversion math.** The FAIL-screen primary CTA (PRD §7.2 Step D) is *"Ship the fixes — $49"*. One price, one button, no decoder ring. Tiered pricing adds a "which bundle?" decision wall between user-clicks-CTA and Stripe-checkout — Hook's own funnel math (BL1) argues every step costs 7–15% drop-off. Flat $49 eliminates the wall.
- **Defunct Sweep.dev priced at $48/mo flat** — closest market reference. Buyers in this category have a $48–$49 mental anchor for "AI writes the PR for me." Hold it.
- **Margin defense.** Penny's v0.2 M3 rider: Auto-PR uses Studio Zero's internal tokens (not BYOK customer's), so the per-bundle COGS varies with bundle size. Penny accepts margin variance internally; the *price* stays flat to the customer. A 15-fix Large bundle is COGS-heavy but rare; Meter models the expected mix and confirms blended margin ≥60% at flat $49.
- **Marketing education tax** (Scout SCOUT-C7's own admission): tiered S/M/L is a new pricing primitive. Educating the market costs copy, support docs, and pricing-page real estate. At V1.5 launch we should be optimizing for conversion velocity, not pricing-model innovation.

**Defense for tiered S/M/L $15 / $49 / $99 (Scout + Hook):**
- Value-effort alignment: PRD §9.4 already tags every finding with `estimated_effort: S | M | L`. The data structure to tier is *already there*. A 3-finding Small bundle that costs the user $49 feels punitive; a 15-finding Large bundle that costs $49 leaves margin on the table. Value-aligned pricing reduces refund disputes (per Penny's own v0.2 M4 — "Dispute Finding" flow).
- Three pricing experiments in one feature (Hook C3): the tiered structure also enables per-finding micro-CTAs ($5 per fix) + bundle anchors ($35-threshold) + tier ceilings. Hook argues this stacks into 2.5× revenue vs flat.
- Scout: *"There is no comparable per-PR pricing model in market. Penny's tier introduces a new primitive — that's a marketing/education tax. Flat $49 is closer to Sweep's defunct $48/mo flat and easier to communicate."* Scout's own SCOUT-C7 quote — Scout votes tiered *despite* this concession, on value-alignment grounds.

**V1.5 spec-time decision criterion (Penny's recommendation):**
> **Decide based on the first 30-day Auto-PR attach-rate cohort, not on spec-day opinion.** If Auto-PR attach rate ≥ 15% (PRD §15 target) at V1.5 + 30d at flat $49, hold flat. If attach rate < 15% OR refund/dispute rate > 5%, switch to tiered S/M/L within 60 days. Hook owns the cohort dashboard; Meter computes margin per tier; Penny resolves at V1.5 + 45d retro.

This gives V1.5 a clean launch with one price, defers the pricing-primitive debate until we have actual fix-bundle distribution data, and binds the decision to a measurable threshold so it doesn't relitigate in committee.

**Where Hook's math contradicts Penny:** Hook argues per-finding micro-CTAs ($5/fix with cart-total + bundle anchor at $35) outperform any flat-or-tiered bundle approach by 2.5×. Penny accepts this is plausible but argues it adds three pricing experiments at V1.5 launch — too many variables to disambiguate. Penny's stance: ship flat $49 at V1.5; layer per-finding micro-CTAs as a V1.5 + 60d A/B test (Hook's experiment registry) only if the 30-day attach-rate cohort is under target. **Disagreement surfaced, not papered over** — Hook is on record for the per-finding stack.

---

## 5. Annual billing details

- **Standard:** 2 months free on annual plans. Annual price = monthly × 10, billed once at signup.
- **Quota behavior on annual:** Penny v0.2 M6 rider — annual plans unlock the **full year's quota upfront** (e.g., BYOK Starter annual = 24 audits available immediately, not 2/month with monthly reset). Costs nothing extra at BYOK tier (customer pays Anthropic), makes annual measurably more attractive, recognizes audits are bursty (launch week + crisis weeks vs quiet months). Managed annual tiers honor the same upfront unlock against the annual token budget (Meter caps).
- **Annual toggle UX:** Vega owns; pricing page annual toggle defaults **on** per Hook M3 — lifts annual mix from ~15% to 40%+ (Stripe billing benchmark).
- **Enterprise (V2+):** Net-30 terms; Stripe-managed invoicing; volume pricing negotiable per Comply-Ready SKU §6.
- **Refunds:** Regional matrix per Comply (`compliance/refund-matrix.md`, M2) — EU 14-day cooling-off (Directive 2011/83/EU), UK CCR 2013, California SB 313 pro-rata, FTC Click-to-Cancel (16 CFR 425) UI compliance. Cooling-off resets on upgrade per D22 (`cooling_off_windows` table, M2). Dispute-Finding path precedes chargeback escalation (Penny v0.2 M4 rider).
- **Stripe product / price IDs:** Ledger owns; lands at M2 wire-up (`tests/integration/stripe-checkout-and-webhook.spec.ts`). This doc does not lock IDs.

---

## 6. Add-ons + future tiers (V2 thinking)

**Compliance-Ready SKU (V2 — Enterprise tier).** Comply flagged at v0.3 panel. Positioning: SOC2-readiness add-on for customers who want Vanta-pattern compliance reporting on the product-quality axis (audit-log retention 7y, attestation-grade reports, DPA + subprocessor stewardship, optional EU data residency per ARCH-D8). Price band TBD V2; competitor anchor Vanta $9k–30k/yr; target SMB enterprise at ~$500–1,500/mo. **Defer to V2.** Triggered by first 3 inbound enterprise leads.

**Team / multi-user-per-tenant (V2).** Locked deferral per PRD §17 Decision #9 ("Multi-user-per-tenant deferred to V2"). One-operator-per-tenant at MVP. V2 pricing: per-seat add-on at ~$15–25/seat/mo on top of base tier, or flat team-tier upgrade. TBD V2.

**Custom rubric pricing (V2+).** Enterprise customers who want to customize severity weights or add custom reviewers. Price band: one-time setup fee + ongoing platform surcharge. Specced V2+ when the score-engine versioning machinery (`score_engine.v1.json`) has run in production long enough to confidently support customer-authored rubrics.

**White-label / reseller (EXPLICIT NON-GOAL, MVP + V2).** PRD §4 Non-Goals: *"White-label / reseller features for v1."* Penny extends: also non-goal at V2. Studio Zero brand is the trust signal; white-labeling dilutes the rubric's authority. **Listed here so it's not re-litigated.**

**Free re-audit credit on FAIL (carried).** PRD §17 Decision 8 (v0.2): no refund on FAIL + 30-day free re-audit credit. This is a *retention* mechanic, not a price tier. Comply codifies in TOS; regional refund matrix supersedes for EU/UK/CA per #20. Listed here as a reminder it's part of the pricing posture.

---

## 7. Substantiation reservations (Phase 8 GTM authoring)

Reserved paths for claim-substantiation files. Authoring deferred to Phase 8 per Jo's call (the social-post sample `06-social-post.md` is pricing-transparent-stripped on the same logic — no public price claims until the substantiation files exist).

- `marketing/claims-substantiation/claim-pricing-positioning.md` — Penny + Scout. Substantiates every comparable in §2 + §3a. Verifies 2026-05 prices for SonarQube, Codacy, Vanta, Devin, v0, Bolt, Lovable, Cursor, Replit, Deque axe, Clerb-class freelance audits. Re-verified quarterly by Herald + Comply (FTC AI-claim substantiation rule per PRD §14.5).
- `marketing/claims-substantiation/claim-code-vs-surface-findings.md` — Hook's E2 upsell hook (Surface FAIL → Code SKU upgrade). Substantiates the "Code audit finds more" claim with internal finding-density data from Studio Zero's own dogfood cohort. Required before the E2 lifecycle email ships at M1.
- `marketing/claims-substantiation/claim-defensible-wedge.md` — Scout (per `06-social-post.md` HN comment note). Substantiates the "no competitor ships Auto-PR for UX + a11y + copy + brand + audience-fit findings" claim with named competitor capability matrix (Copilot Autofix, Snyk, Sourcery, Renovate, Dependabot, Codacy, Sweep, Mintlify). Required before any external Auto-PR marketing copy ships at V1.5.

---

## 8. Penny's exit-gate self-verdict

- [x] **Every tier has a buyer persona from §5.** Free (technical solo founder, evaluation mode); BYOK Starter (technical solo founder, primary); BYOK Pro (indie agency / freelancer); Managed Starter (non-technical solo founder); Managed Pro (engineering lead at small startup); CLI mode (engineering lead in regulated context); Auto-PR upcharge (any BYOK customer post-FAIL).
- [x] **Every tier has a named §3a competitor reference.** SonarQube ($32), Codacy ($15/dev), Snyk ($25/dev), Deque axe ($40/site), Devin ($20/$500), Vanta ($9k–30k/yr), Clerb freelance audits ($2k–5k), Toptal UX audits ($500–2,500), Sweep.dev defunct ($48). All prices verified to PRD §3a (which Herald + Comply re-verify quarterly per FTC rule).
- [x] **Free tier safeguards documented.** Email verification, IP rate-limit, 1-project cap per D2, customer-attested own URL only (CFAA gate per Comply v0.4). All four called out in §2.1.
- [x] **D4 has Sprint-default if Jo doesn't decide.** $29 + $19 A/B slot for first 200 signups. Ship-tier deadline M2 exit (week 9). §3 codifies.
- [x] **D5 has V1.5 spec-time deferral language.** Flat $49 at V1.5 launch; switch to tiered S/M/L only if attach rate < 15% OR refund/dispute rate > 5% at V1.5 + 30d cohort. §4 codifies the criterion so the decision doesn't relitigate in committee.

**Cross-checks:**
- [x] **Composes against Meter.** Managed Starter $5/mo contribution floor (PRD §12); Managed Pro 60%+ blended margin floor; BYOK platform-fee CAC ceiling math. Meter's `finance/unit-economics.md` is the authoritative model; this doc references but does not duplicate.
- [x] **Composes against Ledger.** Stripe product/price IDs reserved but not locked. Annual = monthly × 10. Regional refund matrix gated on `subscriptions.region` (M2 migration `0003_billing_managed.sql`). Cooling-off resets per upgrade (D22). Click-to-Cancel UI (R20). All Ledger's domain; this doc supplies the price contract.
- [x] **Composes against Comply.** Regional refund matrix (§5); EU 14-day cooling-off + reset (D22); FTC Click-to-Cancel (16 CFR 425); AI System Card disclosure on Auto-PR (V1.5); FTC AI-claim substantiation gating the §7 reservations. All Comply's domain; this doc supplies the tier × region matrix Comply writes against.
- [x] **No vibes claims.** Every "premium" / "comparable to X" statement names X with a verified 2026-05 price.
- [x] **Disagreements surfaced not papered.** Hook's $19 + per-finding stack disagreement is on record in §3 + §4. Scout's tiered S/M/L disagreement is on record in §4 with the V1.5 + 30d resolution criterion.

**Penny's verdict on Phase 7 pricing-document exit gate: PASS.**

---

*Pricing v1.0. Locked tiers at MVP. Penny revisits after first 5 paying customers per R10 (M5 cohort) with conversion + churn + ARPU data; v2 of this document supersedes — never deleted, always supersede with new entry that links back.*
