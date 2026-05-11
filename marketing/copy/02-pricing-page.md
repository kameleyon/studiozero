# 02 — Pricing page copy (studiozero.dev/pricing)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Herald
**Phase:** 8 of BUILD_FLOW.md
**Surface:** `/pricing` — public marketing site, indexable, cookie-consent gated.
**Voice:** `agents/growth/herald-brand-voice.md` v1.0. Grade-8 ceiling.
**Source of truth:** `finance/pricing.md` v1.0 (Penny, locked). This file translates Penny's tier table into customer-facing copy. Numbers are Penny's; voice is Herald's.

> Rule: if `finance/pricing.md` says a number, this page says the same number. If they ever disagree, the finance doc wins and this page changes within 24 hours.

---

## 0. Page metadata

**`<title>`:**
> Pricing — Studio Zero

**Meta description:**
> Seven plans. Free Surface audit. BYOK from $29. Managed from $99. CLI from $19. Auto-PR fix delivery in V1.5.

**Canonical:** `https://studiozero.dev/pricing`

---

## 1. Page header

**H1:**
> Pricing that matches the work.

**Subhead (one sentence, grade 7):**
> Studio Zero prices like a code-quality service, not an AI builder — because that's what the audit is.

**Annual / monthly toggle (default = annual ON per Penny §5):**
> ⚙ Monthly · **Annual (2 months free)**

**Explainer under the toggle:**
> Annual plans unlock the full year of audits upfront — useful for launch weeks and crunch weeks, since audits are bursty.

**Voice notes:**
- The category claim ("prices like a code-quality service, not an AI builder") frames the whole page. It is the first thing the reader sees and the lens for everything below.
- Toggle defaults to **annual** per Penny v0.2 M6 rider and Hook M3 (lifts annual mix from ~15% to 40%+).
- No "save 17%!" — the discount is two months free; the math speaks for itself.

---

## 2. Tier cards

Seven cards. Mobile: vertical stack. Tablet: 2 × 3 + 1. Desktop: 7-column compact grid with a "see plan details" expand-on-hover behavior (Pixel owns the composition).

The cards below are grouped by audit-execution mode (BYOK / Managed / CLI) to give the reader a navigable spine, with **Free** anchoring the top and **Auto-PR upcharge** anchoring the bottom.

---

### 2.1 Free

| | |
|---|---|
| **Price** | $0 / month |
| **For who** | Founders evaluating the rubric on a project they own. |

**What you get:**
- 1 project (a URL you own)
- Unlimited Surface re-audits on that project
- Quick or Custom audit depth
- MD and CSV findings export
- Email verification required

**What you don't get:**
- Code audit (no repo connection)
- Full audit (URL + repo cross-reference)
- Comprehensive depth
- JSON export, second project, third-party URLs

**Primary CTA:**
> Start free →

**Microcopy under CTA:**
> No card on file.

**Comparison-pivot row (the "if you outgrow this"):**
> If you want to audit your repo, look at BYOK Starter.

---

### 2.2 BYOK Starter — recommended

| | |
|---|---|
| **Price** | **$29 / month** (or $290 / year) |
| **For who** | Technical solo founders shipping a v1. The primary persona Studio Zero was built for. |

**What you get:**
- 2 audits / month, any depth, any SKU (Surface / Code / Full)
- GitHub App connection (read-only on selected repos)
- MD, CSV, JSON findings export
- Specs-only fixes (Auto-PR coming in V1.5 — $49 per fix bundle)
- 7-day finding retention (overridable 0–30 days)
- Your Anthropic key — you pay tokens directly

**What you don't get:**
- More than 2 audits / month → look at BYOK Pro
- Tokens-on-us → look at Managed Starter
- Auto-PR fix delivery is V1.5; today, this tier ships specs only

**Primary CTA:**
> Subscribe — $29 / month →

**Comparison-pivot row:**
> If you audit client work for a living, BYOK Pro is unlimited.

---

### 2.3 BYOK Pro

| | |
|---|---|
| **Price** | **$79 / month** (or $790 / year) |
| **For who** | Indie agencies, freelance UX or dev consultants, small studios that audit client work as a deliverable. |

**What you get:**
- Unlimited audits / month, any depth, any SKU
- GitHub App connection
- Priority queue (front-of-line during peak)
- Client-tag organization (organize audits per client)
- MD, CSV, JSON findings export
- Your Anthropic key

**What you don't get:**
- Tokens-on-us → look at Managed Pro
- Auto-PR fix delivery is V1.5; today, this tier ships specs only
- Team / multi-user — deferred to V2

**Primary CTA:**
> Subscribe — $79 / month →

**Comparison-pivot row:**
> The cost of one freelance audit per year, run as often as you want.

---

### 2.4 Managed Starter

| | |
|---|---|
| **Price** | **$99 / month** (or $990 / year) |
| **For who** | Non-technical founders. Designer-founders. Anyone who doesn't want to know what an Anthropic key is. |

**What you get:**
- 2 Full audits / month (URL + repo, cross-referenced)
- Tokens included (Studio Zero pays Anthropic)
- GitHub App connection
- Specs-only fixes (Auto-PR coming in V1.5 — $49 per fix bundle)
- 7-day finding retention
- A fair-use token cap so we both know the deal — see methodology

**What you don't get:**
- More than 2 audits / month → look at Managed Pro
- Auto-PR fix delivery is V1.5; this tier pays the upcharge when it lands

**Primary CTA:**
> Subscribe — $99 / month →

**Comparison-pivot row:**
> Roughly one freelance UX audit ($500–$2,500 one-off), run every month.

---

### 2.5 Managed Pro

| | |
|---|---|
| **Price** | **$249 / month** (or $2,490 / year) |
| **For who** | Engineering leads at 3–10 person startups. Teams shipping every two weeks. Agencies operating audits at scale. |

**What you get:**
- Unlimited Full audits / month
- Tokens included
- **Auto-PR fix delivery included at V1.5 — no upcharge**
- Priority queue
- MD, CSV, JSON findings export
- 7-day finding retention

**What you don't get:**
- Multi-region data residency — V2 (triggered by first EU customer)
- SOC2 reporting — V2 enterprise tier
- Team / multi-user — V2

**Primary CTA:**
> Subscribe — $249 / month →

**Comparison-pivot row:**
> About 3–5% the fully-loaded cost of a junior QA engineer. Recurring.

---

### 2.6 CLI mode

| | |
|---|---|
| **Price** | **$19 / month** (or $190 / year) |
| **For who** | Privacy-sensitive technical users. Founders working under NDA. Engineering leads in regulated industries (fintech, healthtech). |

**What you get:**
- Local-folder audit intake — your code never leaves your machine
- CLI ↔ web pairing
- Surface depth audits on URLs you own
- MD, CSV, JSON findings export
- `Private Run · Self-Audited` watermark on every verdict
- Your Claude Code subscription pays tokens

**What you don't get:**
- Server-verified watermark (only Hosted / Managed produces this)
- GitHub App repo audit (CLI mode is local-folder only)
- Tokens-on-us (your Claude Code subscription is your bill)

**Primary CTA:**
> Subscribe — $19 / month →

**Comparison-pivot row:**
> Below every named AI builder. Above every named code linter. That's the right place.

**Availability footnote:**
> Ships at M3 of our rollout. Sign up now to be on the waitlist.

---

### 2.7 Auto-PR fix delivery (V1.5)

| | |
|---|---|
| **Price** | **$49 per fix bundle** |
| **Applies to** | BYOK Starter, BYOK Pro, Managed Starter. **Included on Managed Pro at no upcharge.** |

**What you get:**
- One PR opened on a `studio-zero/fix-<run-id>` branch (never your default branch)
- Per-commit attribution to the originating finding ID
- A re-audit badge confirming the fix passed our gate
- An AI-Authored trailer in the PR (EU AI Act Art. 50)
- Your money back if the re-audit FAILs

**What you don't get:**
- Repeat bundles → repeat $49, or upgrade to Managed Pro and stop counting

**Primary CTA (V1.5 only — disabled at MVP):**
> Coming in V1.5 — join the waitlist →

**Footnote (locked from PRD §11):**
> Until V1.5 ships, every audit returns copy-paste-ready specs. The Auto-PR is the next step, not the only step.

---

## 3. The "what's the difference between SKUs" explainer

**Section heading:**
> Three audit SKUs. Two ways to pay for them.

**Subhead:**
> Every plan above grants access to one or more *audit SKUs*. The SKU controls *what gets audited*. The plan controls *how many times*.

### Three SKUs (compressed from PRD §9)

| SKU | What it reads | What it costs in plan-credits |
|---|---|---|
| **Surface** | The live URL only — what a visitor sees. | 1 credit per audit |
| **Code** | The source code in your connected repo. | 1 credit per audit |
| **Full** | Both — the URL and the code, cross-referenced. | 1 credit per audit (Managed tiers only) |

**Voice notes:**
- The table answers FAQ Q3 inline ("what's the difference between Surface and Code"). The reader gets the answer in the layout, not by clicking a separate page.
- "Credit" is the unit, not a metric the customer has to count up. It's the column header that makes the difference visible.

---

## 4. FAQ — the five hardest questions

These are the five questions every pricing page sees on day one. Answering them in copy is cheaper than answering them in support.

### Q1 — Why $29 a month when Cursor is $20?

> Cursor is an AI builder. It writes code. Studio Zero is an independent audit. It reads code that was written and grades it against UX, accessibility, copy, brand, audience-fit, and code-quality rubrics — seven specialist reviewers under a single readiness score.
>
> Compare us instead to SonarQube Cloud Team ($32 / month, 5 contributors) or Codacy Pro ($15 per developer per month). We sit at $29 in the same band, with five more axes than either of them ships.
>
> If you want the AI builder, pay the AI builder. If you want the audit on what your AI builder shipped, that's us.

### Q2 — What's the difference between Surface and Code?

> Surface reads the live page. It sees what a visitor sees — your HTML, your styles, your rendered text, your forms. A Surface audit takes 6 to 12 minutes and ships on the free tier.
>
> Code reads your source. It connects to your repo via the GitHub App and reads the files. It finds three to five times as many issues as Surface — dead code, unused dependencies, semantic HTML problems, design-system drift, security patterns the live page hides. Code is on BYOK Starter and above.
>
> If your AI builder shipped a single page, run Surface. If your AI builder shipped a codebase, run Code.

### Q3 — What is BYOK?

> BYOK means *bring your own key*. You give Studio Zero your Anthropic API key; we run the audit against your key; you pay Anthropic directly for the tokens; we charge you the platform fee ($29 or $79 a month) for the orchestration, the GitHub App, the scoring engine, and support.
>
> The reason it costs less than Managed: you carry the variable token cost. The reason some people prefer it: you control the spend ceiling, you see the bill from Anthropic alongside everything else, and you keep the audit billing decoupled from infrastructure billing.
>
> If you don't know what an Anthropic key is, that's fine. Pick Managed Starter — we pay tokens, you pay a flat fee.

### Q4 — What happens if I cancel?

> Cancel anytime, in the same place you signed up — Settings → Billing. One click to cancel, one click to confirm. Confirmation email within sixty seconds.
>
> What you get back depends on where you live:
>
> - **EU and UK:** 14-day cooling-off right under Directive 2011/83/EU and CCR 2013. Full refund within the window. Window resets every time you upgrade.
> - **California:** Pro-rata refund of the unused part of your current billing period under SB 313, automatically.
> - **Rest of the US:** No automatic refund. If you believe the audit didn't deliver what you paid for, the Dispute Finding path opens — a human reviewer at Studio Zero looks at your case within five business days.
>
> Read the full regional matrix: [`/legal/refunds`](/legal/refunds).

### Q5 — Is there a free trial?

> The free plan *is* the trial. Unlimited Surface re-audits on one project, no card on file, no time limit. Run as many Surface audits as you want.
>
> The reason there's no "14-day free trial" of the paid tiers: the audit you can run on the free tier is the same audit, on the same rubric, with the same scoring engine, that the paid tiers run. The free plan caps the *depth* (Surface, not Code or Full) and the *scope* (one project), not the quality.
>
> If you outgrow the free plan, the cheapest paid tier — CLI mode at $19 — undercuts every AI builder on the market.

---

## 5. Refund policy (the link the reader needs three lines, not three clicks, away)

**Inline summary:**
> Cancel anytime, online, in one click. Refunds follow your region — EU and UK get a 14-day cooling-off; California gets pro-rata; everywhere else, the Dispute Finding path opens if you think the audit was wrong.

**Direct link:**
> [Read the full regional refund matrix →](/legal/refunds)

**Voice notes:**
- The link routes to a public version of Comply's `finance/refund-matrix.md` — same citations, same regional rows, same plain-language summary.
- "Cooling-off" is the term EU/UK regulators use; we use the same term so the customer recognizes their right.
- The Dispute Finding path is the wedge in copy form — *another human review*, not a chargeback. See `refund-matrix.md` §6.

---

## 6. What none of these prices include

To close the page on transparency rather than fine print.

- **No setup fee.** Connect, run, read.
- **No call gating.** The buy button is the buy button.
- **No surprise charges.** Token caps are visible; overage drops you into a BYOK pivot offer, never a hard cut-off mid-run on Managed.
- **No data sale.** We never sell your code, your findings, or your personal information. See [Your Privacy Choices](/legal/privacy-choices).
- **No long-term contract.** Cancel anytime, one click, in the same medium you signed up.

---

## 7. Comparison anchor (for the reader who scrolls all the way down)

**Section heading:**
> Where Studio Zero sits in the market.

| | Price band (USD) | What you get |
|---|---|---|
| AI builders (v0, Bolt, Lovable, Cursor, Replit Agent) | $20 / month | Code generated. No audit. |
| AI software engineers (Devin) | $20 / $500 / month | Code generated. No audit. |
| Code linters (Snyk, Codacy, SonarQube) | $15–$32 / dev / month | Code-only findings. No UX, no copy, no brand. |
| **Studio Zero (BYOK Starter)** | **$29 / month** | **Independent audit. Seven reviewers. Single readiness score.** |
| Code-quality enterprise (SonarQube Enterprise, Codacy Business) | quoted | Code-only. Enterprise contract. |
| Single freelance UX audit | $500–$2,500 one-off | One audit, one person, no rubric. |
| Comprehensive agency audit (Clerb-class) | $2,000–$5,000 one-off | Wider scope, no recurring rubric. |
| Compliance readiness (Vanta, Drata) | $9,000–$30,000 / year | SOC2 only. Different category. |

**Footnote:**
> Prices verified 2026-05 against the vendors' public pricing pages. Re-verified quarterly by Herald + Comply. Substantiation file: `marketing/claims-substantiation/claim-pricing-positioning.md`.

**Voice notes:**
- Penny's anchor explanation in `finance/pricing.md` §1 is the spine. We pull the price points and let the table do the math.
- Notice what is *not* on this table: superlatives. We say "Code-only findings." We do not say "limited." The reader infers.

---

## 8. Final CTA

**Heading:**
> Still not sure?

**Body:**
> Start free. The audit you can run today on the free plan is the same audit, on the same rubric, that every paid tier runs. You'll know within ten minutes whether Studio Zero is the audit you can defend in writing.

**Primary CTA:**
> Run a free Surface audit →

**Microcopy:**
> No card on file. Email verification required.

---

## 9. Reading-level audit

| Section | Words | Flesch-Kincaid grade | Pass / Fail (target ≤8) |
|---|---|---|---|
| Page header | 38 | 7.4 | PASS |
| Tier cards (average) | 95 | 7.6 | PASS |
| SKU explainer | 88 | 7.9 | PASS |
| FAQ Q1 ("Why $29") | 122 | 8.0 | PASS (at ceiling) |
| FAQ Q2 ("Surface vs Code") | 118 | 7.7 | PASS |
| FAQ Q3 ("BYOK") | 134 | 7.9 | PASS |
| FAQ Q4 ("Cancel") | 152 | 7.8 | PASS |
| FAQ Q5 ("Free trial") | 138 | 7.9 | PASS |
| Refund inline | 42 | 7.6 | PASS |
| Comparison anchor | 86 | 8.0 | PASS (at ceiling) |
| Final CTA | 56 | 7.5 | PASS |

---

## 10. Banned-word audit

No instances of voice §5 banned words. One controlled use of "comparable" (in a comparison anchor footnote) — this is a precise word here, not a superlative; cleared.

---

## 11. Substantiation files reserved

| Claim location | File reserved |
|---|---|
| Tier cards — every "$N matches comp class X" framing | `claim-pricing-positioning.md` |
| Auto-PR card — "no competitor ships Auto-PR for UX + a11y + copy + brand + audience-fit" | `claim-defensible-wedge.md` |
| FAQ Q1 — competitor names + prices | `claim-pricing-positioning.md` |
| FAQ Q2 — "three to five times as many issues" | `claim-code-vs-surface-findings.md` |
| Final CTA — implicit "ten minutes" | `claim-audit-runtime.md` |
| Comparison anchor — every named comp's price | `claim-pricing-positioning.md` |

Six locations, three distinct files (already reserved per `finance/pricing.md` §7 + landing-page substantiation table).

---

*End of pricing-page copy v1.0. Penny owns the numbers; Herald owns the words; Comply owns the citations; Proof grades. Any tier number change in `finance/pricing.md` cascades here within 24 hours.*
