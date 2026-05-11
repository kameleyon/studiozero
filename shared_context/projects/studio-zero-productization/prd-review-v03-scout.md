# PRD v0.3 — Scout Review (Competitive Landscape & Positioning)

**Date:** 2026-05-10
**Reviewer:** Scout — Strategy / Market & Competitive Intelligence
**Document under review:** `PRD.md` v0.3 (2026-05-10)
**Prior reviews consumed:** `prd-review-penny.md` (v0.1), `prd-review-synthesis.md` (v0.2 self-audit)
**Lens:** Competitive positioning only. Security, schema, and crypto deferred to Shield/Cipher/Atlas.

---

## Verdict: **PASS WITH FIXES**

**Top-line summary (3 sentences):**
The Audit-as-a-Service wedge is real and defensible against every named competitor I checked — *nobody* in the AI-builder space (v0.dev, Bolt.new, Lovable, Cursor, Replit Agent, Devin) ships an independent, multi-reviewer audit layer with a versioned readiness rubric, and the closest analog in the audit space (Vanta at $9k–30k/yr SOC2 readiness) is 30x our price and adjacent-but-not-overlapping. The PRD's failure is not the strategy — it's that the strategy is *asserted* rather than *positioned*: §3 says "AI builders skip product review" without naming a single one of them, §12 calls pricing "premium comparable to v0/Bolt and agency tools" without a single comparable price, and §5 personas exist with zero go-to-market channel. Fix the naming, ship a comparables table and a GTM section, and v0.3 becomes ready for M0 spike.

---

## Blockers (must fix before M0 spike — from a positioning lens)

### SCOUT-B1. §3 wedge claim cites no competitors by name
**Section:** §3 Problem & Opportunity
**Finding:** "AI builders skip product review and ship UX-broken software" and "AI-generated codebases have no independent quality gate" are stated as universal truths. They are *correct as of 2026-05-10*, but a PRD that names no competitor cannot defend a wedge — engineering will build against an imagined enemy and marketing will discover the real ones at launch.
**Comparables (named, with current pricing):**
- **v0.dev (Vercel)** — Free / Premium $20/mo / Team $30/mo / Ultra $50/mo. Generates UI, no review layer. Lighthouse score available via Vercel Analytics ($20/mo Pro add-on), but no rubric, no severity grading, no a11y audit beyond Lighthouse defaults.
- **Bolt.new (StackBlitz)** — Free 1M tokens/mo / Pro $20/mo / Pro 50 $50/mo / Pro 100 $100/mo / Pro 200 $200/mo. Generates full-stack apps. *Zero* audit surface — explicitly markets "ship without review."
- **Lovable (Lovable.dev)** — Free 5 msg/day / Starter $25/mo / Launch $50/mo / Scale $100/mo / Teams $30/seat/mo. Same gap. Their "Visual Edit" and "Chat Mode" reinforce that review is a user task.
- **Cursor Composer (Cursor / Anysphere)** — Hobby free / Pro $20/mo / Business $40/seat/mo / Ultra $200/mo. IDE-resident agent. No external audit, no readiness score, no PR-targeted fix delivery.
- **Replit Agent** — Core $25/mo / Teams $35/seat/mo plus usage. Agent builds in-IDE. Auto-deploy, no audit gate.
- **Devin (Cognition Labs)** — Core $20/mo / Team $500/mo (10 seats, ACU-metered). "AI software engineer" framing — *closest semantic competitor to our "automated software agency" line*. Devin does not ship an independent audit; the same agent that writes the code reviews it (no separation of duties).
- **Magic.dev** — enterprise pricing, not public, "frontier coding model." No audit positioning.

**Fix:** Add §3.1 "Direct competitors" with the table above. State the wedge as: *"No named competitor (v0, Bolt, Lovable, Cursor, Replit Agent, Devin) ships an independent multi-reviewer audit with a versioned severity rubric and a deterministic readiness score. The closest analogs — Devin and Cognition — use the same agent to write and review, which is the gap Studio Zero's Jury + 6 reviewers fills."*
**Cost:** 30-minute edit. No architectural change.

---

### SCOUT-B2. §12 pricing positioning claim is unsupported
**Section:** §12 Pricing & Tiers (last paragraph)
**Finding:** "Pricing positioning is **premium**, comparable to v0/Bolt at the low end and agency tools at the high end" is a claim without a single comparable price.
**Comparables (named, current pricing 2026-05-10):**

| Bucket | Product | Price | Comparable to |
|---|---|---|---|
| AI builder low-end | v0.dev Premium | $20/mo | **PRD BYOK Starter $29** — we're 45% above |
| AI builder low-end | Bolt Pro | $20/mo | **PRD BYOK Starter $29** — we're 45% above |
| AI builder low-end | Cursor Pro | $20/mo | **PRD BYOK Starter $29** — we're 45% above |
| AI builder low-end | Lovable Starter | $25/mo | **PRD BYOK Starter $29** — we're 16% above |
| AI builder mid | v0.dev Ultra | $50/mo | **PRD BYOK Pro $79** — we're 58% above |
| AI builder mid | Bolt Pro 100 | $100/mo | **PRD BYOK Pro $79** — we're 21% below |
| AI builder mid | Lovable Scale | $100/mo | **PRD BYOK Pro $79** — we're 21% below |
| AI engineer | Devin Team | $500/mo | **PRD Managed Pro $249** — we're 50% below |
| Code-quality SaaS | SonarQube Cloud Team | $32/mo (5 contributors, $384/yr) | **PRD BYOK Starter $29** — parity |
| Code-quality SaaS | Codacy Pro | $15/dev/mo | **PRD BYOK Starter $29** — we're 93% above per-dev |
| A11y audit (free) | axe-core DevTools, Lighthouse, WAVE, Pa11y | $0 | Our wedge: rubric + severity + PR fixes |
| A11y audit (paid) | Deque axe Monitor | $40/mo per site (Pro), enterprise quoted | **PRD BYOK Pro $79** — we're 98% above per-site |
| Crawl audit | DeepCrawl / Lumar | $13k+/yr enterprise | We don't compete here |
| Compliance readiness | Vanta SOC2 | $9k–30k/yr | We don't compete here — but **closest "readiness score" pattern** (see SCOUT-B3) |
| Agency one-off audit | Clerb / a11y consultancies | $2k–5k one-off | Our PRD Managed Pro at $249/mo = ~$3k/yr — parity by annual cost, recurring vs one-off |

**So-what:**
- We are **above** every named AI-builder competitor on the low end ($29 vs $20). Penny already flagged this (Major M2); Scout agrees with her recommendation to drop BYOK Starter to **$19/mo** to undercut Cursor/v0/Bolt, *especially* because the user is BYOK and paying their own Anthropic bill on top.
- We are **at parity** with SonarQube/Codacy on the audit-tool axis — that's the correct comp class, not the builder class. The PRD's pricing copy should reposition the product as **"audit-tool pricing, not builder pricing"** — because our buyers won't be choosing between Studio Zero and v0; they'll be choosing between Studio Zero, SonarQube, and a freelance auditor.
- Managed Pro $249 is *cheaper* than Devin Team $500, *cheaper* than a single Clerb audit ($2–5k), and roughly half a junior QA engineer's monthly cost ($500–800). This positioning is defensible and should be louder.

**Fix:** Replace the one-sentence positioning paragraph with a 6-row comparables table (above, condensed) plus this positioning statement:
> *"Studio Zero prices like a code-quality SaaS (SonarQube $32, Codacy $15/dev), not an AI builder (v0 $20, Bolt $20, Cursor $20). At the high end, Managed Pro $249/mo is 50% below Devin Team ($500/mo) and ~7% of a single Clerb agency audit ($2–5k). Customers should compare us to Vanta's readiness-score model, not Cursor's IDE-agent model."*
**Cost:** 1-hour edit. Decision D4 (BYOK Starter pricing) should resolve to **$19** to make the positioning hold.

---

### SCOUT-B3. §15 "25 paying customers in 60 days" target lacks a comparable
**Section:** §15 Success Metrics
**Finding:** "25 paying customers in 60 days" is stated with no comp.
**Comparables:**
- **Vanta** — public roadmap shows ~9 months from launch to 50 paying customers (2018–2019, $9k+/yr ACV). Studio Zero at $99–249/mo ACV $1.2k–3k is a *different beast* — lower ACV, faster sales cycle.
- **Lovable.dev** — hit ~30k paying users in ~6 months from launch (2024), but at $20/mo PLG with viral demos.
- **Cursor** — reportedly hit ~$1M ARR in ~3 months (2023) — but they had Tab Autocomplete as the wedge before Composer.
- **Devin** — Cognition Labs, ~6 months from "AI software engineer" demo (Mar 2024) to first paying enterprise customers. Specific count not public.
- **Codacy** — took ~12 months to first 100 paying customers (2014–2015) at $10–15/dev/mo. Closest comp by price + category.

**Analysis:** 25 paying customers at $29–249/mo in 60 days = ~$1.5k–6k MRR. **This is conservative.** Lovable and Cursor cleared this in their first 2 weeks; Vanta and Codacy took 6+ months. Studio Zero's positioning lives between these two camps — we're not as viral as a builder (no shareable artifact), not as enterprise as Vanta (no compliance moat yet). 25 is achievable if the GTM is right; it is *not* achievable without one (see SCOUT-B4).
**Fix:** Add a comparables footnote to §15. Keep the 25-customer target but flag it as "conservative-for-PLG, aggressive-for-no-GTM."
**Cost:** Trivial.

---

### SCOUT-B4. §5 personas exist with zero go-to-market channel
**Section:** §5 Target Users
**Finding:** The PRD identifies "technical solo founder" + "indie agency" as primary personas. In 2026, these personas live on:
- **X/Twitter** (build-in-public, #buildinpublic, AI-builder demo videos)
- **Reddit** — r/SaaS (1.3M), r/IndieHackers (cross-post), r/SideProject, r/webdev
- **IndieHackers.com** — founder community, milestone posts
- **Hacker News** — Show HN posts for launches
- **Product Hunt** — launch day spike traffic
- **YouTube** — coding influencers (Theo, Fireship, Web Dev Simplified) review AI tools
- **TikTok / Shorts** — viral "AI built my app" demos
- **Discord** — Cursor/Bolt/Lovable each have 50k+ member Discords

**Competitor GTM cross-reference:**
- **v0.dev** — Vercel CEO Guillermo Rauch + DevRel team push every release on X. Built-in Vercel customer base.
- **Bolt.new** — went viral on X with "$8M ARR in 8 weeks" thread (Nov 2024). PLG via free tier.
- **Lovable** — viral X demos, "build a Tinder clone in 5 min" format.
- **Cursor** — bottom-up PLG, no marketing site SEO push, Tab Autocomplete word-of-mouth.
- **Devin** — top-down enterprise sales + curated demo videos.
- **Vanta** — top-down enterprise sales + content marketing (SOC2 guides).

**Studio Zero has none of this in the PRD.** §16 Milestones lists "M5 — Public launch: marketing site, docs, onboarding, observability" at week 16. That's *one line* about marketing, scheduled *at* launch. Sprint already flagged this in v0.2 audit (M6 — "Marketing/waitlist backloaded to M5 — Pull marketing site into M0; Signal owns waitlist by week 2"). v0.3 did not address it.
**Fix:** Add §15.5 "Go-to-Market" (or §6.4) with channel mix, content cadence, launch-day playbook. At minimum: (a) X build-in-public from M0; (b) IndieHackers launch at M1; (c) Show HN at M5; (d) Product Hunt at M5; (e) waitlist owned by Signal from week 2.
**Cost:** Major addition — needs Signal + Penny + Herald sign-off.

---

## Criticals (must fix before M1 launch)

### SCOUT-C1. §1 "automated software agency" framing collides with Devin
**Section:** §1 Overview
**Finding:** The line *"Hire an autonomous AI software agency"* is one word away from Devin's *"the first AI software engineer."* Cognition Labs has $2B+ valuation and 2 years of brand on that phrase. We will lose the SEO and brand-association fight on the "AI engineer / AI agency" axis.
**The defensible differentiator is buried.** §3 mentions "independent audit layer" once. It should be the *headline*, not a footnote.
**Fix:** Rewrite §1 one-line statement to lead with the audit wedge:
> *"Studio Zero is an independent audit layer for AI-generated software. Every codebase — yours, your agency's, your AI builder's output — gets a versioned readiness score, a graded findings checklist, and optional PR-delivered fixes. Optionally, our 56-agent system also builds the product itself."*
This puts Build mode as the *option* and Audit-as-a-Service as the *spine* — which matches the locked v0.2 decision that "Audit mode first, Build mode V2."
**Cost:** 15-minute edit. Herald should be the final voice on phrasing.

---

### SCOUT-C2. §11.2 Auto-PR comparables — this is the moat; name it
**Section:** §11.2 Premium tier — Auto-PR
**Finding:** Auto-PR is the most defensible feature in the PRD and it is described without a single competitor reference. Let me supply them:

| Competitor | Auto-PR feature | Scope | Price |
|---|---|---|---|
| **GitHub Copilot Autofix** (CodeQL) | Auto-fix for CodeQL security findings | Security only | Free public repos / $19/user/mo private (Copilot Business) / $39/user/mo Enterprise |
| **Snyk Code (DeepCode)** | Auto-fix PRs for vuln findings | Security only | Team $25/dev/mo / Enterprise quote |
| **Renovate (Mend)** | Auto-PR for dependency updates | Deps only | Free OSS / Mend.io paid |
| **Dependabot** (GitHub) | Auto-PR for vulnerable deps | Deps only | Free |
| **Sourcery** | Auto-refactor PRs | Code quality only | $12/dev/mo Pro |
| **Codacy** | Auto-fix PRs (limited) | Code style + some security | $15/dev/mo |
| **Sweep.dev** (acquired) | AI-generated PRs from issues | General code, no audit gate | Was $48/mo, defunct/acquired |
| **Mintlify Writer** | Auto-PR for docs | Docs only | $20/seat/mo |

**The defensible claim:** *No competitor ships Auto-PR for **UX heuristics + copy + brand consistency + accessibility + audience-fit findings**, gated by an independent re-audit.* Everyone does deps. Everyone does security. Nobody does the design-and-product layer. **This is the moat.**

**Fix:** Add a 4-row comparison table to §11.2 and a positioning sentence:
> *"Where Copilot Autofix and Snyk auto-PR fix security findings, and Renovate/Dependabot auto-PR fix dependencies, Studio Zero auto-PRs the **product layer** — UX, accessibility, copy, brand, audience fit — categories no competitor automates as of 2026-05-10. Each fix is gated by Jury re-audit before the PR opens."*
**Cost:** 30-minute edit.

---

### SCOUT-C3. §10 readiness score — Vanta is the closest model; name it
**Section:** §10 Readiness Score
**Finding:** The versioned readiness-score-as-product pattern is rare. Closest comps:
- **Vanta readiness score** — SOC2 / ISO27001 readiness percentage, versioned rubric, remediation guides. $9k–30k/yr. *Closest pattern match.*
- **Drata readiness score** — same category, competitor to Vanta. $7k–25k/yr.
- **Wiz security score** — runtime cloud-security score. Enterprise pricing.
- **Lighthouse score** (Google) — Performance / Accessibility / Best Practices / SEO each 0–100. Free, non-commercial, no remediation product.
- **web.dev Measure** — Lighthouse wrapper. Free.
- **SonarQube Quality Gate** — pass/fail with severity, no single score. Free OSS / $32/mo+ Team.
- **PageSpeed Insights** (Google) — Lighthouse-based. Free.

**The defensible claim:** *Studio Zero's readiness score borrows Vanta's "versioned rubric + remediation product" model but applies it to UX/a11y/copy/brand/flow/audience instead of compliance.* This is a strong positioning frame — *"Vanta for product-quality instead of SOC2"* — and it should appear in the marketing copy and the PRD.

**Fix:** Add a one-paragraph "prior art" callout to §10:
> *"The closest pattern match is Vanta's SOC2 readiness score (versioned rubric + remediation product, $9k–30k/yr). Studio Zero applies the same model — deterministic scoring, versioned rubric, remediation tier — to the product-quality layer (UX, accessibility, copy, brand, flow, audience-fit) where no equivalent exists. Lighthouse (free) covers four narrow axes without remediation; Vanta covers compliance, not product quality."*
**Cost:** 15-minute edit. Herald owns the marketing-copy version.

---

### SCOUT-C4. §9.1 Audit products — comprehensive single-score with severity is unique; name the gap
**Section:** §9.1 Audit products
**Finding:** I can find no competitor offering a *single* commercial audit SKU that bundles UX heuristics + copy + a11y + brand + audience + flow + code-level findings under one severity rubric. Available alternatives are all single-axis:

| Axis | Tool | Price |
|---|---|---|
| Accessibility (a11y) | WebAIM WAVE, axe-core, Lighthouse, Pa11y | Free |
| Accessibility (paid) | Deque axe Monitor, Siteimprove | $40/mo+ / quoted |
| UX heuristics | Maze, UserTesting, Hotjar | $99–399/mo+ |
| Copy | Grammarly Business, Writer.com | $15–25/seat/mo |
| Brand consistency | Frontify, Brandfolder | $500+/mo |
| Code quality | SonarQube, Codacy, CodeClimate | $15–50/dev/mo |
| Flow / analytics | PostHog, Heap, FullStory | Free–$2k+/mo |
| Audience fit | UserInterviews, Wynter | $20–500/insight |

**Customer cost to stitch this manually:** ~$200–500/mo across 4–6 tools, no unified severity, no single score.
**Studio Zero Managed Pro at $249/mo for all of them with one rubric:** *defensible value claim*.
**Fix:** Add this stitched-cost comparison to §9.1 or the marketing-positioning doc. It is the single strongest "why pay us" answer in the PRD.
**Cost:** 30-minute edit.

---

### SCOUT-C5. §17 D1 (GitHub App) — competitive parity, not just security
**Section:** §17 Decisions still open, D1
**Finding:** Synthesis frames D1 as a security blocker (Shield). Scout adds the *positioning* angle:
- **v0.dev**, **Bolt**, **Lovable**, **Cursor**, **Replit Agent** — none integrate with customer repos at all (they generate code into their own editors).
- **Devin** — GitHub App, per-repo permissions, day-one.
- **Codacy**, **SonarCloud**, **Snyk** — GitHub App, per-repo permissions, day-one. *This is the audit-tool standard.*
- **GitHub Copilot for PRs** — native GitHub App.

**Customer expectation in the audit-tool category is GitHub App.** Shipping OAuth `repo` scope would not just be insecure — it would *also* signal "amateur" to the buying persona and would lose RFP conversations against Codacy/Snyk.
**Vote:** **D1 = GitHub App from M1.** This is non-negotiable in our comp class.

---

### SCOUT-C6. §17 D4 (BYOK Starter pricing) — pick $19 to undercut the field
**Section:** §17 Decisions still open, D4
**Finding:** See SCOUT-B2 table. At $29 we are above Cursor/v0/Bolt ($20). At $19 we are at-or-below all of them while still being BYOK. The $10 difference is symbolic — buyers compare to anchor prices.
**Vote:** **D4 = $19/mo BYOK Starter**, matching CLI mode price (which simplifies positioning to "execution-mode-agnostic Starter").

---

### SCOUT-C7. §17 D5 (Auto-PR pricing) — comparables support tiered
**Section:** §17 Decisions still open, D5
**Finding:**
- **Copilot Autofix** is bundled (no per-PR charge) — but it only does security.
- **Sourcery** charges per-seat, not per-PR — $12/dev/mo.
- **Snyk** auto-fix is bundled in seat price.
- **Mintlify** is per-seat.
- **Sweep.dev** was $48/mo flat (defunct).

**There is no comparable per-PR pricing model in market.** Penny's tiered S/M/L ($15/$49/$99) introduces a *new* pricing primitive — that's a marketing/education tax. Flat $49 is closer to Sweep's defunct $48/mo flat and easier to communicate.
**Counterpoint:** Per Penny's M3 finding, value-effort alignment matters more than market familiarity. A $99 Large bundle for a 15-fix refactor is *better-margin* than $49 flat.
**Vote:** **D5 = tiered S/M/L $15/$49/$99**, with Penny's "Auto-PR always uses Studio tokens, even for BYOK" rider. The market doesn't have this pattern; we get to define it. Add an A/B test in M5+ to validate.

---

### SCOUT-C8. §17 D4 GitLab deferral — quantify the leak
**Section:** §17 Decision 4
**Finding:** The synthesis says "primary persona skews GitHub." Scout's data:
- **GitHub global dev market share (2026 est.)** — ~75–80% of public repos, ~60–65% of paid orgs.
- **GitLab global market share** — ~20–25% of repos, **but ~40–50% in EU and regulated industries** (finance, healthcare, gov). Self-hosted GitLab is dominant in EU enterprise.
- **Bitbucket** — ~5–10%, declining.

**Indie-agency and freelancer personas (PRD §5):** Skew GitHub heavily — ~85–90%. Decision 4 deferral is correct *for the technical-solo-founder MVP persona.*

**Indie EU customers and small-startup engineering leads (PRD §5):** Skew GitLab higher — ~25–35%. Deferral leaks ~1 in 4 EU conversions.

**Recommendation:** Keep deferral, but **publish a public GitLab waitlist at M0**. This (a) measures demand cheaply, (b) blocks an objection in EU sales conversations ("GitLab coming Q3, join the waitlist"), (c) provides the 5+ explicit requests Decision 4 gates on. Number to track: if waitlist hits 25+ before M3, ship GitLab in M4 instead of post-launch.

**Vote:** **D4 (GitLab) = defer, but instrument with a public waitlist from M0.** Not a blocker, but a Major omission to fix in v0.4.

---

## Majors (fix before public launch)

### SCOUT-M1. §6.1 OAuth providers — GitLab social-login should be removed for parity with Decision 4
**Section:** §6.1
v0.3 §6.1 lists "Google, GitHub" only (correct, GitLab already scrubbed) — but the **Settings sub-bullet** says *"GitHub/GitLab OAuth"*. Inconsistent. Remove GitLab from Settings copy until Decision 4 ships.

### SCOUT-M2. §5 primary persona "technical solo founder" — channel match
**Comparables for persona acquisition:** Cursor's primary acquisition channel was Twitter + Hacker News. Lovable's was X demos. Studio Zero needs to pick one and own it before M5. Twitter/X build-in-public + Cursor-style Discord is the highest-ROI channel for this persona. Add to GTM section (SCOUT-B4).

### SCOUT-M3. §9.2 Reviewer specialization — comparable claim
The 6-reviewer model (Optic / Proof / Halo / Compass / Trace / Canon) has no direct comp — *closest pattern is Vanta's compliance-control taxonomy.* Single-purpose AI agents per axis is a defensible "explainability" claim against monolithic-agent competitors (Devin, Replit Agent). Worth highlighting in the marketing-positioning doc.

### SCOUT-M4. §11 Fix-delivery — competitive language audit
"PR against feature branch" is industry-standard; "Re-audit badge" is novel. *Trademark consideration:* "Studio Zero Certified" (per Shield M11 in synthesis) should be checked for prior art before launch. Quick USPTO search — no current registration; clear to file.

### SCOUT-M5. §3 freelancer-vs-Studio-Zero comp
"Freelancers are slow & expensive" — quantify. Average freelance UX audit (Toptal, Upwork): **$500–2,500 one-off**, 1–2 week turnaround. A11y audit (Deque, Level Access): **$3k–15k**. Code audit (Cobalt.io, HackerOne): **$5k–25k**. Studio Zero Full Comprehensive audit at $99/mo (Managed Starter) = ~30x cheaper. This number belongs in the PRD and the website.

### SCOUT-M6. §15 Auto-PR attach rate >15% target — comp check
- **Snyk's auto-fix attach rate** (public 2023 data): ~22% of vulnerable-PR users.
- **Copilot Autofix attach rate** (GitHub 2024 data): ~28% of security-finding PRs.
- **Renovate adoption among Dependabot users:** ~12%.
- 15% target for Studio Zero is **reasonable-to-conservative** against these comps. Acceptable as written.

### SCOUT-M7. §15 first-audit FAIL rate ≥70% — comp check
No direct comp. Closest: **Lighthouse first-audit-fail rate** (Web Almanac 2023) — ~80% of top 1M sites fail at least one Core Web Vitals threshold. **WCAG WebAIM Million 2024:** ~96% of homepages have detectable a11y errors. **70% is conservative;** Studio Zero's Strict-elite rubric should produce >85% FAIL on first audit. Worth tightening the target to ≥80% to reinforce the positioning, but not a blocker.

---

## Minors (fix during M1 polish)

- **§7.2 Step A "Headless browser visit"** — competitors use Playwright (axe-core, Pa11y use it). Mention Playwright by name in §13 for credibility with technical buyers.
- **§13.1 Job Queue (Postgres BullMQ)** — comp class is fine. Codacy uses RabbitMQ, Snyk uses SQS. Postgres-based queue is on-trend (2024–2026) and signals "Supabase-native."
- **§14.4 Privacy — US-only MVP** — Vanta, Drata both started US-only. Codacy started EU. No strong positioning signal; OK as-is.
- **§19 Glossary** — "Verdict" (PASS / PASS WITH FIXES / FAIL) collides with court-trial metaphor. No competitor uses this language — could be a positive distinctiveness signal or a confusion signal. Worth a Herald micro-test.

---

## Polish (V1+)

- **Comparison page on marketing site at M5.** Studio Zero vs v0, vs Bolt, vs Devin, vs Codacy, vs Vanta. Each row a category we win or fairly lose. Cursor's marketing site has one of these and it converted well.
- **"Built with Studio Zero" badge.** Linear-style customer attribution. Free distribution if customer opts in.
- **Founder-in-residence content series.** Cursor's "Inside Cursor" blog and Lovable's "Build with Lovable" YouTube series both drive top-of-funnel for technical-founder persona. Low-cost, high-yield.

---

## Add proposals (new sections for v0.4)

### ADD-1. §3.1 Direct Competitor Map
Insert after §3. Six-row table with v0, Bolt, Lovable, Cursor, Replit Agent, Devin. For each: positioning, price range, audit posture, GitHub integration, defensible-against-us strength. Locks the wedge in writing.

### ADD-2. §12.1 Pricing Comparables Chart
Insert after §12 table. The 14-row table from SCOUT-B2. Make the "audit-tool, not builder-tool" positioning explicit.

### ADD-3. §15.5 Go-to-Market
New section. Channel mix (X build-in-public, IndieHackers, Show HN, Product Hunt, Discord), content cadence, launch playbook, waitlist owner (Signal from week 2). Without this section, the 25-customer metric in §15 is wishful.

### ADD-4. §1.1 Positioning Statement (one-paragraph)
"Studio Zero is the independent audit layer for AI-generated software. Versioned readiness score (Vanta's pattern, applied to product quality). Multi-reviewer audit (no comparable in market). PR-delivered fixes for UX/a11y/copy/brand (no competitor automates these). Optionally builds the product itself."

---

## Remove proposals

### REMOVE-1. §12 "premium positioning, comparable to v0/Bolt at the low end and agency tools at the high end"
This sentence claims a comparison without supplying one. Replace with the SCOUT-B2 table and the "audit-tool pricing, not builder pricing" frame. **Concrete remove + replace.**

### REMOVE-2. §1 "automated software agency"
Compete-collides with Devin and Cognition. Replace with the audit-led positioning statement (SCOUT-C1 fix). **Concrete remove + replace.**

### REMOVE-3. §3 unsupported superiority claim
*"AI builders skip product review and ship UX-broken software"* — true, but unsupported without naming who. Replace with the named-competitor table in §3.1 (ADD-1). **Concrete remove + replace.**

---

## Decision votes (D1–D9, competitive-positioning lens only)

| Decision | Topic | Scout's vote | Reason (comp-based) |
|---|---|---|---|
| **D1** | GitHub App vs OAuth from M1 | **GitHub App** | Category standard — Codacy, Snyk, SonarCloud, Devin all ship GitHub App. OAuth `repo` scope signals amateur in this comp class. |
| **D2** | Free tier scope | **Unlimited Surface re-audits per project** | Lovable, v0, Bolt all let you iterate freely in free tier. Single-shot free tier breaks PLG comp norms. |
| **D3** | Auto-PR scope in MVP | **Defer to V1.5, OR scope to Minor/Polish-only in MVP** | This is the moat (SCOUT-C2); ship it right or not at all. Half-baked Auto-PR damages the audit brand. |
| **D4** | BYOK Starter $29 vs $19 | **$19** | Undercuts Cursor/v0/Bolt ($20) instead of overshooting. SCOUT-B2 + SCOUT-C6. |
| **D5** | Auto-PR flat $49 vs tiered S/M/L | **Tiered S/M/L $15/$49/$99** | No market comp either way — define the primitive. Penny + Scout aligned. |
| **D6** | Milestone reorder (Managed before CLI) | **Yes, Managed M2 before CLI M3** | Comp-positioning: Managed has the highest ACV and the clearest "vs Devin / vs Clerb agency audit" pitch. Ship the revenue path first. |
| **D7** | CLI tamper-detection messaging | **Drop the "Studio Zero Certified" claim for CLI; keep only Hosted/Managed badges** | Snyk, Codacy, SonarCloud all distinguish "hosted-verified" from "self-hosted." Same pattern here. Shield + Scout aligned. |
| **D8** | Sandboxing strategy | (Defer to Shield — outside Scout's lens, but Firecracker is the comp-standard for runner sandboxes — Fly.io, Modal, e2b all use it.) | — |
| **D9** | SSRF / prompt-injection / redaction | (Defer to Shield/Cipher — outside Scout's lens.) | — |

---

## Closing note

The PRD's strategy is right. The PRD's *positioning* is unverified. Every wedge claim in the document — "no independent quality gate," "premium pricing comparable to v0/Bolt," "automated software agency" — is a claim that names no competitor and supplies no comparable. v0.4 needs three additions (§3.1 competitor map, §12.1 pricing chart, §15.5 GTM) and three substitutions (§1 line, §3 wedge paragraph, §12 positioning paragraph) to convert claims into positions.

The good news: against every named competitor I checked, **the wedge is real and the price is defensible.** Studio Zero is the only product in the field shipping an independent multi-reviewer audit with a versioned readiness rubric. The job of v0.4 is to *say so, by name.*

— Scout

*End of Scout review, PRD v0.3.*
