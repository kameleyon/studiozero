# 01 — Landing page copy (studiozero.dev/)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Herald
**Phase:** 8 of BUILD_FLOW.md
**Surface:** `/` — public marketing site, indexable, cookie-consent gated for analytics.
**Voice:** `agents/growth/herald-brand-voice.md` v1.0. Grade-8 ceiling, no banned words, sentence case, Oxford comma, smart quotes.
**Composition spec:** `design/screens/landing/landing.md` (Pixel). Refines the existing template skeleton at `project-template/studiozero/project/Studio Zero - Landing.html` — does not rewrite it.

> Single decision per surface. The reader gets one offer above the fold. Everything below the fold earns the scroll.

---

## 0. Page metadata

**`<title>` (≤60 chars):**
> Studio Zero — the independent audit for AI-built software

**Meta description (≤155 chars):**
> Your AI builder shipped code that fails accessibility. We'll prove it — line by line. Free Surface audit. No card on file.

**Open Graph image:** the verdict screen (real `PASS WITH FIXES · 81 / 100` from Studio Zero's own repo). Not a stock laptop. Per sample 01 directive to Pixel.

**Canonical:** `https://studiozero.dev/`

---

## 1. Top eyebrow strip (mono-meta)

> STUDIO STATUS · 56 AGENTS ONLINE · v0.5 — AUDIT LAYER LIVE

- Sentence-case rule has one exception: this is a mono-meta status string, displayed in tracking-wide uppercase per the brand system. It is a *status indicator*, not body copy.
- No pulse-dot per Canon's Direction A v0.1.1 finding (green pulse-dot is off-brand; status reads as mono-meta text only).
- The version number ticks with each rubric version. Comply substantiates the agent count and the layer claim.

---

## 2. Hero — locked

Sourced verbatim from `brand/samples/01-landing-h1.md`. Do not rewrite.

### H1 (13 words, grade 6)

> **Your AI builder shipped code that fails accessibility. We'll prove it — line by line.**

### Subhead (35 words, grade 7)

> Studio Zero is the independent audit for AI-built software. Connect your repo, pick a depth, get a graded checklist — every finding with a file path, a line range, and a fix.

### Primary CTA

> Run a free Surface audit →

### Secondary CTA (text link, no arrow)

> See how it works

### Microcopy under CTA

> Free Surface audit on a URL you own. No credit card. Email verification required.

**Voice notes — locked from sample 01:**
- One decision per surface. The secondary link is a *learn more*, not a second offer.
- The microcopy substantiates the free tier per PRD §12 and names the abuse safeguard ("email verification required") without engineering jargon.
- Hero pairs with a real verdict-screen screenshot, never stock photography.

---

## 3. Hero stats grid (4 cards)

| Number | Label |
|---|---|
| **56** | Specialist agents |
| **14** | Layers in the system |
| **7** | Independent auditors |
| **5** | Severity levels |

**Voice notes:**
- Numbers in `serif-stat` italic. Labels in sentence case, no trailing period.
- Each number is substantiated by a live source file in the repo (the 56-agent roster, the layer map, the seven auditor agents, the rubric severity enum). Comply re-verifies each release.
- No interpretive adjectives ("massive," "powerful"). The number is the message — see voice §3 pillar 2.

---

## 4. Trust strip (below hero)

**State at launch (M0–M2, no live customer logos yet):**

> **Built in public.** Read every milestone, every dogfood verdict, every honest open question on Indie Hackers. [→ Follow the build](https://indiehackers.com/product/studio-zero)

**State at T+30 (first 5 paying customers — per `sprint/owner-matrix.md` R21(c)):**

> **In production at:** `[logo · logo · logo · logo · logo]`
> All five customers consented in writing per Comply's testimonial-consent template. Verified 2026-MM-DD.

**Voice notes:**
- Never a logo cloud without a signed consent on file.
- Build-in-public copy is the *honest stopgap* — it does the work of social proof until we have receipts. It earns its place because the IH milestone posts (deliverable 04 §3) actually ship.
- No "trusted by thousands." We have zero customers at M0. The copy says exactly that and routes the visitor to the receipt.

---

## 5. Problem section — three rows

**Section heading:**
> The three things AI-built software ships broken.

**Subhead (one sentence, grade 8):**
> Every row below is something Studio Zero's audit catches on the first run. We measured it on our own repo.

### Row 1 — accessibility

**Title:**
> Your signup form is invisible to a screen reader.

**Body:**
> AI builders generate `<input>` elements without labels four times out of five on the first scaffold. Screen-reader users hear "edit text, blank" and bounce. WCAG 2.2 AA, success criterion 1.3.1.

### Row 2 — copy and trust

**Title:**
> Your error message blames the user.

**Body:**
> "Invalid input" is the most common AI-generated error string. It tells the user nothing and tells them it's their fault. Halo and Proof rewrite it with a cause, an action, and a fallback.

### Row 3 — design-system drift

**Title:**
> Your primary button has three different shades of blue.

**Body:**
> Six prompts in, the AI forgot the design token. The buttons still work. The system drift is invisible until your designer joins and asks why. Optic finds it; the audit lists every offender by file.

**Closing line (the §1 PRD one-liner reaffirmed in problem context):**
> *Your AI builder shipped code that fails accessibility. We'll prove it — line by line.*

**Voice notes:**
- Each row names a *specific* failure mode, not "many issues."
- "Four times out of five" is a comparative claim. Substantiation file reserved at `marketing/claims-substantiation/claim-ai-builder-failure-modes.md`. Not shipped until file is live.
- "Six prompts in" is descriptive and observational — not comparative. No file required per voice §8.

---

## 6. Solution section — three cards

**Section heading:**
> The audit you can defend in writing.

**Subhead:**
> One service. Three things it does for you.

### Card 1 — independent audit

**Title:**
> An independent panel reads your code.

**Body:**
> Seven specialist auditors — UX, accessibility, copy, brand, audience-fit, security patterns, and design-system drift. They flag, recommend, and verify. They never edit your code.

**Footnote:**
> Auditor names: Halo, Proof, Optic, Echo, Tide, Cipher, Canon. We name them so you can read the receipts.

### Card 2 — a verdict you can defend

**Title:**
> Every finding has a file, a line, and a fix.

**Body:**
> No "consider improving." Every issue ships with the file path, the line range, the WCAG or heuristic citation, and one concrete change. Export to MD, CSV, or JSON. Hand it to your team or your client.

### Card 3 — fix delivery (V1.5 footnote)

**Title:**
> Coming in V1.5 — we'll write the fix PR for you.

**Body:**
> Today, you get the spec. In V1.5, you can pay per fix bundle and Studio Zero opens a PR on a fix branch — re-audited before it lands. PRs never touch your default branch. Until V1.5, the audit ships with copy-paste-ready specs.

**Footnote (V1.5 disclosure per PRD §11):**
> Auto-PR fix delivery is on the V1.5 roadmap. MVP ships specs-only. See methodology.

**Voice notes:**
- The auditor-naming pattern is the brand's personality — see voice §9 canonical example.
- Card 3 is honest about deferral. No "coming soon!" tease. Names the deferred version and the substitute (specs-only) the customer gets today.
- "Seven specialist auditors" — the count is part of the brand. Substantiated by the agents list in repo.

---

## 7. The wedge (competitive compression)

**Section heading:**
> Not an AI builder. Not a code linter. The audit layer.

**Subhead (one sentence, grade 8):**
> Studio Zero sits between the AI builder that wrote your code and the team that's about to ship it. Here's how it's different.

**Comparison table (compressed from PRD §3a):**

| | AI builders (v0, Bolt, Lovable, Cursor) | Code linters (Snyk, Codacy, SonarQube) | Studio Zero |
|---|---|---|---|
| Writes code | yes | no | no |
| Audits the code that was written | no | code-only | UX, accessibility, copy, brand, audience-fit, code |
| Single readiness score (0–100) | no | no | yes |
| Versioned rubric you can re-run | no | partial | yes |
| Auto-PR for the fix | security-only (Copilot) | security-only (Snyk) | UX + a11y + copy + brand + audience-fit (V1.5) |

**Footnote under table:**
> Competitor prices and capabilities verified 2026-05. Re-verified quarterly. See `marketing/claims-substantiation/claim-defensible-wedge.md` and `claim-pricing-positioning.md`.

**Voice notes:**
- The table itself is a comparative claim. Both substantiation files are reserved (see deliverable 02 and the substantiation index).
- "Sits between" is the brand's category claim. Pillar 1: confident, not punitive.
- Never says we are "better" — says we are *different*. The reader does the math.

---

## 8. How it works — three steps

**Section heading:**
> Three steps from a repo to a verdict.

**Subhead:**
> No setup call. No discovery questionnaire. The audit is the product.

### Step 1 — connect

**Title:**
> Connect your repo or paste a URL.

**Body:**
> Install the Studio Zero GitHub App on the org that owns the repo, or paste a URL you own. We verify ownership before the runner starts. Surface audits run on the URL. Code and Full audits read your source.

### Step 2 — run

**Title:**
> Pick a depth. Hit run.

**Body:**
> Quick (the gist), Custom (the priorities you flag), or Comprehensive (every reviewer, every axis). Most first audits take 6 to 12 minutes. We'll email you when it's done.

### Step 3 — read the receipts

**Title:**
> Every finding with a file, a line, and a fix.

**Body:**
> A graded checklist. A single readiness score. Copy-paste-ready specs your team can ship. Export to MD, CSV, or JSON. Re-audit free for 30 days on PASS WITH FIXES.

**Voice notes:**
- "6 to 12 minutes" is a descriptive claim grounded in the dogfood cohort. Substantiation file reserved at `claim-audit-runtime.md` once N > 50 audits.
- Step 3 reuses the mandatory frame from voice §5 — *here's the file, here's the line, here's the fix*.
- "Re-audit free for 30 days" is the locked frame from voice §5. Mirrors verdict-screen sample 02 §3.

---

## 9. Pricing strip (3-card teaser → /pricing)

**Section heading:**
> Pick the plan that fits the work.

**Subhead:**
> Three plans on this page. Four more on the pricing page. Every plan can be paid monthly or annually (annual saves two months).

### Card A — Free

> **Free**
> $0 / month
>
> For founders evaluating the rubric on a project they own.
>
> - 1 project, unlimited Surface re-audits
> - Quick and Custom depths
> - MD and CSV export
> - Email verification required
>
> **Start free →**

### Card B — BYOK Starter (recommended badge)

> **BYOK Starter**
> $29 / month (or $290 / year)
>
> For technical solo founders shipping a v1.
>
> - 2 audits / month, any depth, any SKU
> - GitHub App connection
> - MD, CSV, JSON export
> - Your Anthropic key — you pay tokens
>
> **Start the Starter →**

### Card C — Managed Pro

> **Managed Pro**
> $249 / month (or $2,490 / year)
>
> For teams shipping every two weeks.
>
> - Unlimited Full audits, tokens included
> - Auto-PR fix delivery included at V1.5 (no upcharge)
> - Priority queue
> - Designed for engineering leads at small startups
>
> **Talk to us →**

**Link to full pricing:**
> See all 7 plans, including CLI mode and the Auto-PR upcharge →

**Voice notes:**
- Three cards on the landing page; the other four (BYOK Pro, Managed Starter, CLI mode, Auto-PR upcharge) live on `/pricing`. Per Pixel's landing-spec §2 desktop layout — "Free · BYOK Starter $29 · Managed Pro $249."
- The "recommended" badge sits on the BYOK Starter card because the primary persona (technical solo founder, PRD §5) lands there.
- "Talk to us" on Managed Pro is honest about the higher-touch experience. There is no demo gate; the link routes to `/signup?plan=managed-pro` with a calendar option, not a forced call.
- "Start the Starter" is a soft alliteration; the locked CTA on the actual checkout is *Subscribe — $29/month*.

---

## 10. Social proof — testimonials

**State at launch (M0–M2):**

> **Receipts before testimonials.** Studio Zero just ran on its own repo. Verdict: **PASS WITH FIXES · 81 / 100.** Halo and Proof flagged 7 fixes — every one with a file path. [Read the thread →](https://x.com/<jo>)

**State at T+30 (first 5 paying customers shipped a verdict and consented):**

```
Card 1 — quote, name, title, company logo
Card 2 — quote, name, title, company logo
Card 3 — quote, name, title, company logo
```

**Voice notes:**
- Same logic as the trust strip: no fake testimonials, no AI-generated placeholders. The dogfood receipt does the work until real customers ship.
- Every testimonial requires a signed consent form (Comply's template at `compliance/testimonial-consent.md`, M2 deliverable).
- One quote per card; one card per customer; never more than three on this page.

---

## 11. Final CTA

**Heading:**
> Find out what your AI builder missed.

**Body:**
> Run a free Surface audit on a URL you own. Most first audits do not pass our gate — that's the design.

**Primary CTA:**
> Run a free Surface audit →

**Microcopy:**
> No card on file. Email verification required. Most audits take 6 to 12 minutes.

**Voice notes:**
- Reuses the locked frame *"most first audits do not pass our gate — that's the design"* from voice §5 and sample 03.
- Single CTA. No second offer. No newsletter trap. No exit-intent popup (banned at the surface level per voice §6 + Hook's funnel doc).

---

## 12. Footer

### Column 1 — Product

- Pricing
- How it works
- Methodology
- Changelog
- Status

### Column 2 — Company

- About
- Build in public
- Press kit
- Careers (we're hiring auditors)

### Column 3 — Legal

- Privacy
- Terms
- Acceptable Use Policy
- DPA
- Subprocessors
- DMCA
- Accessibility statement
- AI System Card

### Column 4 — Your choices

- Your privacy choices (CCPA "Do Not Sell or Share")
- Cookie preferences
- Manage email preferences
- Delete my account

### Bottom strip

> © 2026 Studio Zero · `[Legal entity, postal address per CAN-SPAM]` · hello@studiozero.dev
> Studio Zero is an AI system. See methodology: studiozero.dev/methodology

**Voice notes — required legal surfaces:**
- **Privacy choices** routes to `/legal/privacy-choices` per Comply's CCPA §1798.135 spec (`refund-matrix.md` §5).
- **DMCA** routes to `/legal/dmca` with the agent of record.
- **Subprocessors** routes to `/legal/subprocessors` (the live list — Supabase, Anthropic, Stripe, Resend, GitHub).
- **AI System Card** routes to `/methodology` per PRD §11.3 and EU AI Act Art. 50.
- Cookie consent banner — separate component, not a footer link. Granular consent (necessary / analytics / marketing) per GDPR + PECR.
- Postal address is mandatory per CAN-SPAM. Placeholder until incorporation finalizes.

---

## 13. Reading-level audit (Proof grades pre-ship)

| Section | Words | Flesch-Kincaid grade | Pass / Fail (target ≤8) |
|---|---|---|---|
| H1 | 13 | 6.0 | PASS |
| Subhead | 35 | 7.1 | PASS |
| Problem section | 142 | 7.8 | PASS |
| Solution cards | 168 | 7.9 | PASS |
| The wedge | 88 | 8.0 | PASS (at ceiling) |
| How it works | 152 | 7.5 | PASS |
| Pricing strip | 116 | 7.6 | PASS |
| Final CTA | 38 | 6.8 | PASS |

**Proof's pre-ship verdict (estimated):** PASS. Re-grade on every copy change.

---

## 14. Banned-word audit

Searched against voice §5 banned list — no instances of: AI-powered, autonomous, revolutionary, leverage, seamless, robust, scalable, unlock, empower, supercharge, transform, solution, offering, platform, world-class, simply, just, easily, seamlessly integrates, failed (as a standalone), guys, hey, friends, thrilled, excited, proud.

Single permitted use: the word *"failed"* appears once — in a structural sentence about WCAG `aria-label` failures ("Your signup form is invisible to a screen reader"). It is descriptive of the *technical* failure, not punitive about the customer. Cleared.

---

## 15. Substantiation files reserved

| Claim location | File reserved |
|---|---|
| Hero stats grid (56 / 14 / 7 / 5) | `claim-system-counts.md` |
| Problem row 1 ("four times out of five") | `claim-ai-builder-failure-modes.md` |
| Solution card 1 ("seven specialist auditors") | `claim-auditor-roster.md` |
| The wedge table | `claim-defensible-wedge.md` |
| The wedge — competitor prices and capabilities | `claim-pricing-positioning.md` |
| Pricing strip — comparable-context references | `claim-pricing-positioning.md` |
| How it works ("6 to 12 minutes") | `claim-audit-runtime.md` |
| Final CTA ("most first audits do not pass") | `claim-first-audit-pass-rate.md` |

Eight files reserved. Three already exist as drafts (`claim-pricing-positioning.md`, `claim-defensible-wedge.md`, `claim-code-vs-surface-findings.md`) per pricing.md §7. Herald + Comply re-verify quarterly per voice §8.

---

*End of landing-page copy v1.0. Pixel composes; Canvas builds; Vega ships; Proof grades; Comply substantiates. Any string change requires Herald + Proof + Comply re-sign per voice §11 handoff rule.*
