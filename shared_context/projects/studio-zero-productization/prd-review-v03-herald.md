# PRD v0.3 Review — Herald (Marketing Copy & Lifecycle)

**Reviewer:** Herald (Growth layer — Marketing Copywriter)
**Document:** `PRD.md` v0.3 (2026-05-10)
**Lens:** Copy, brand voice, lifecycle email, conversion funnel, premium positioning
**Date:** 2026-05-10

---

## Verdict: **FAIL**

Not because the engineering is wrong. The engineering is fine. **The PRD ships a product with no voice.** A premium-priced "your AI builder shipped garbage, we'll prove it" wedge cannot launch with the word "autonomous" in its hero line, no verdict-screen script, no PR-body template, no lifecycle emails, and tier names a CFO wrote. The product is the copy. The copy is missing.

## Top-line summary (3 sentences)

The product loop the PRD describes — *audit → FAIL → buy fix → re-audit → PASS* — is a **copywriting product**, not an engineering one, and v0.3 spec'd the engine but not the words that make the loop convert. The §1 one-liner, the §7.2 verdict screen, the §11 PR description, and the §12 tier names are all brand surface and all unspec'd; the lifecycle email sequence (post-FAIL upsell, 30-day re-audit, win-back) isn't mentioned at all even though it is the entire monetization path for a Strict-elite gate that fails 70%+ of first audits. Lock the voice doc and the five emails before M0 or the funnel leaks at every stage.

---

## Blockers (must fix before M0)

### H-B1. No brand voice document exists; every customer-facing string in the PRD is written in engineering register
**Sections:** entire document, but lands hardest in §1, §7.2D, §11, §12
**Why blocker:** "Premium positioning, comparable to v0/Bolt at the low end and agency tools at the high end" (§12) is asserted, not earned. Premium is a voice, not a price tag. Without a brand voice doc, Pixel writes one tone, Guide writes another, Stripe receipts default to Stripe's tone, error pages default to Next.js's tone, and the product feels like a Mechanical-Turk seam of five different writers. The single-voice rule (§Background) says "only BigBrain talks to the customer" — but BigBrain has no documented voice, just a job title.

**Fix:** Ship `agents/growth/herald-brand-voice.md` before M0. Specifies:
- Voice pillars (4): **Confident, not punitive. Specific, not vague. Receipt-bringing, not opinion-having. Plain, not dumbed-down.**
- 8th-grade Flesch-Kincaid ceiling on every customer-visible string. Proof enforces.
- Banned words: *autonomous, leverage, robust, seamless, cutting-edge, enterprise-grade, AI-powered, revolutionize, unlock, empower, solution, journey.*
- Mandatory words for the audit verdict surface: *evidence, file, line, what to do next, free re-audit.*
- One canonical example per surface: hero, button, verdict screen, PR body, billing receipt, error page, lifecycle email.

**Cost:** 1 doc, 1 day. Blocks nothing else if started in parallel with M0 spike.

### H-B2. §1 one-line product statement fails the mom test, fails 14-word ceiling, fails reading-level grade
**Current copy:**
> *"Hire an autonomous AI software agency to either build your product from idea to production-ready, or audit your existing project against a fixed severity rubric and return a graded checklist with optional remediation."*

**Diagnosis:**
- 36 words. Two products joined by "or" — the reader bounces.
- "Autonomous" earns nothing the reader cares about. Buyers don't buy autonomy; they buy *I don't have to ride along.* "Autonomous" is a builder's word, not a buyer's.
- "Severity rubric," "graded checklist," "optional remediation" — register is engineering memo, not landing page.
- Flesch-Kincaid grade ~14. Target ≤8.

**Redline (proposed):**
> **"Your AI builder shipped code that fails accessibility. We'll prove it — and fix it."**
> *(13 words. Grade 6. Names the pain, names the wedge, names the upsell. No "autonomous.")*

Secondary line for the engineering-spec audience inside the PRD:
> *"Studio Zero is an audit-first software agency: we grade what your AI built, then ship the fixes."*

**Cost:** 5 minutes. Atomic.

### H-B3. §7.2 Step D — Verdict screen has no copy spec'd; "FAIL" with no buffer kills the upsell
**Section:** §7.2 Step D
**Why blocker:** §10 says "most first audits are expected to FAIL — the product loop is *audit → fail → buy fix → re-audit → pass.*" That loop **runs through one screen** — the verdict screen — and the PRD spec'd zero words on it. Show a customer a red "FAIL" with no frame and they refund, churn, and post on Twitter. Show them the *same* result with the right script and they upgrade.

**Redline (proposed verdict-screen copy, all three states):**

**FAIL:**
> **Verdict: Needs Work**
> *Score: 38 / 100. We found 4 Blockers, 7 Criticals, 12 Majors.*
>
> Here's the thing — this is what we expected. Our gate is strict on purpose. Most first audits fail it; that's the point.
>
> Every finding below comes with a file path, a line range, and the exact fix. You can ship the fixes yourself, or we can open a PR with the changes for you.
>
> **[ See the 4 Blockers first → ]**  **[ Let us fix it for $49 → ]**

**PASS WITH FIXES:**
> **Verdict: Close**
> *Score: 81 / 100. You're 14 points from a clean PASS.*
>
> Your foundation is solid. There are 6 fixes between you and shippable — we've grouped them by effort below. Knock these out, then come back for a free re-audit any time in the next 30 days.
>
> **[ Show me the 6 fixes → ]**  **[ Have us ship the PR — $49 → ]**

**PASS:**
> **Verdict: Ship It**
> *Score: 96 / 100.*
>
> This passes our strict gate. We don't hand these out — fewer than 5% of first audits land here. Your audit certificate is below; share it freely.
>
> **[ Download certificate → ]**  **[ Run a second audit on a different project → ]**

**Replaces:** The bare "PASS / PASS WITH FIXES / FAIL" string from §7.2 Step D and §10. The verdict labels stay in the API/JSON contract (§9.3) for engineering; the **display copy** is the table above. Document the split: machine-readable verdict ≠ customer-facing headline.

**Cost:** Copy is written above. Pixel + Vega wire it. ~2 days total.

### H-B4. §11 PR description template not spec'd — auto-PR opens on the customer's repo and represents the brand to *their team*
**Section:** §11.2
**Why blocker:** The auto-PR is a brand-surface artifact that lives forever in the customer's git history. Their CTO sees it. Their contractors see it. Their next acquirer sees it. The PRD spec'd three bullet points of *what* goes in the PR (summary, attribution, badge) but zero words of *how*. A bad PR body title — "Studio Zero auto-remediation bundle #f8a9c2" — gets the integration ripped out within a week.

**Redline (proposed PR template):**

**Title format:**
```
Fix 6 audit findings: 3 a11y, 2 copy, 1 UX
```
*(Always: count, then top 3 categories by count. Never the run ID in the title.)*

**Body template:**
```markdown
## What this PR does

We ran Studio Zero against this repo and found 6 issues worth fixing.
This PR ships the fixes for all 6. After merge, you can re-audit free.

**Before:** Score 73 / 100 — PASS WITH FIXES
**After (estimated):** Score 94 / 100 — PASS

## What changed

### Accessibility (3 fixes)
- [F-007] Added labels to /signup form inputs — `app/signup/page.tsx:42`
- [F-012] Fixed contrast on the primary button (3.1:1 → 7.2:1) — `components/Button.tsx:18`
- [F-019] Added `alt` text to hero image — `app/page.tsx:24`

### Copy (2 fixes)
- [F-022] Rewrote the empty-state on /dashboard for clarity — `app/dashboard/Empty.tsx:8`
- [F-024] Shortened the pricing-page H1 from 19 words to 9 — `app/pricing/page.tsx:12`

### UX (1 fix)
- [F-031] Fixed the back-button trap on /checkout — `app/checkout/layout.tsx:33`

## What we did *not* change

We don't touch logic, data, or architecture in an auto-PR. If a finding needed
a refactor, it's in the report but not in this branch — you'll see it flagged as
"manual fix required."

## How we verified

Every commit was re-checked by the original reviewer agent before this PR opened.
If re-audit didn't pass, this PR wouldn't exist. Run ID: <id>.

---
*This PR was opened by Studio Zero on behalf of <customer>. See the full report: <link>.*
*Questions? Reply in this thread — a human reads them.*
```

**Why these choices:**
- Title is countable and human-readable. No internal IDs in the title.
- Body leads with the score delta — the customer's CTO scans for that.
- "What we did not change" pre-empts the #1 reviewer objection ("you touched my architecture").
- Finding IDs are inline so engineers can grep the report.
- "A human reads them" — even if Jo automates the reply, the *promise* converts.

**Cost:** Copy is above. Forge wires the template. ~1 day.

### H-B5. Five lifecycle email sequences are not in the PRD and are the entire monetization path
**Sections:** missing from §6, §7, §12, §15
**Why blocker:** A Strict-elite gate that's *designed* to fail 70% of first audits (§15, §10) only monetizes if the post-FAIL email converts to a fix-delivery purchase or a 30-day re-audit return. The PRD spec'd Stripe (§6.1) and an NPS metric (§15) but zero of the lifecycle messages that produce the revenue between signup and renewal. This is a copywriting product without copywriting infrastructure.

**Sequences to add (full specs in §Add proposals below):**
1. **Welcome → first-audit prompt** (sent immediately on signup, single CTA: run your free Surface audit)
2. **Post-FAIL → "here's what we found, here's the fix bundle"** (sent at verdict, NOT a separate trigger — same screen, same words, email mirror)
3. **Post-PASS-WITH-FIXES → "you're X points from PASS, free re-audit in 30 days"** (sent at verdict)
4. **30-day re-audit reminder** (sent day 25 if no re-audit has run on a PASS-WITH-FIXES project)
5. **Win-back at day 60 for churned customers** (sent 30 days after cancellation, leads with a *new* finding category we've added, not a guilt trip)

**Cost:** 5 emails × ~1 hour each = 1 day of Herald time. Wire-up: Resend + Supabase trigger, ~2 days engineering. Total: 3 days, blocking M3 (billing) at the latest.

---

## Criticals (must fix before M1 launch)

### H-C1. §12 tier names are functional, not branded — they tell the buyer what they bought, not what they *got*
**Section:** §12
**Current copy:**
> Free / BYOK Starter / BYOK Pro / Managed Starter / Managed Pro / Auto-PR upcharge / Claude Code CLI mode

**Diagnosis:** "BYOK Starter" is an acronym wrapped in a tier-stage word. It reads like a wireless plan, not a premium service. "Managed Pro" is two adjectives in a trench coat. The names *describe billing* — they don't *sell anything*.

**Two paths. Pick one and lock it:**

**Path A — Branded names (recommended for marketing site, premium positioning):**

| Internal name | Marketing name | What it says |
|---|---|---|
| Free | **Sample** | One free audit. Try the rubric. |
| BYOK Starter | **Solo** | For one founder, one project, your tokens. |
| BYOK Pro | **Studio** | Unlimited audits, priority queue. |
| Managed Starter | **Concierge** | We bring the tokens. You bring the URL. |
| Managed Pro | **Concierge+** | Everything, plus we fix it. |
| Auto-PR upcharge | **Ship It** | One-time. We open the PR. |
| CLI mode | **Private** | Your machine, your code, our gate. |

**Path B — Keep functional names but earn the premium with the *descriptor copy* (cheaper, faster):**

Drop "Starter" and "Pro." Use *one descriptor line per tier* that's a benefit, not a feature:

| Tier | Descriptor (current) | Descriptor (proposed) |
|---|---|---|
| Free | "1 free Surface audit per signup (URL only)" | **"See if your live site passes our gate. Free. One try."** |
| BYOK Starter | "2 audits/mo (any level), specs-only fixes" | **"For founders who write their own checks. Two audits a month. Bring your Anthropic key."** |
| Managed Pro | "Unlimited Full audits + Auto-PR fix delivery, tokens included" | **"We audit. We fix. You ship. No keys, no setup, no surprises."** |

**Recommendation:** **Path B for v0.3, migrate to Path A at M5 public launch** when Herald has run the names past five real prospects.

**Cost:** Path B is 20 minutes. Path A is 1 day + prospect interviews.

### H-C2. §10 brand-posture paragraph buries the only sentence customers will ever read
**Section:** §10, third paragraph
**Current copy:**
> *"Brand posture: Strict elite gate. Most first audits are expected to FAIL. The product loop is audit → fail → buy fix-delivery → re-audit → pass. The premium positioning depends on the verdict meaning something — every finding is required to ship with cited evidence..."*

**Diagnosis:** This is the *thesis* of the product, written like a footnote. Move it. Promote it. Make it the first sentence a customer reads on the marketing site, the welcome email, and the verdict screen header.

**Redline (proposed customer-facing version):**
> **"Our gate is strict on purpose. Most first audits fail it. That's how you know a PASS means something."**

That's the hero line for the marketing site. That's the subject line for the welcome email. That's the explainer pinned above the verdict screen. Same sentence, four places. **One voice, repeated, equals premium.**

**Cost:** 5 minutes for the sentence; ~half a day to wire it into the four surfaces.

### H-C3. §15 success metrics measure scores, not what customers love — no NPS-driver hypothesis
**Section:** §15
**Current copy:**
> "NPS from first 25 customers > 30"

**Diagnosis:** NPS > 30 is a number, not a script. We don't know *what we want customers to say* when they rate us 9 or 10. Without that hypothesis, the survey can't be tuned and the marketing copy can't echo it.

**Fix — add to §15:**

| Hypothesis (what we *want* promoters to say) | Survey question | Copy hook on marketing site |
|---|---|---|
| "It found things my AI builder missed" | "What did Studio Zero find that you didn't expect?" | **"The AI builder said it was done. Our gate disagreed."** |
| "The evidence was undeniable" | "How did you feel reading the findings?" | **"Every finding ships with a file path and a line number. Argue with the receipt."** |
| "The PR was actually mergeable" | "Did you merge the auto-PR? Why or why not?" | **"We open the PR. You review it. Your default branch is sacred."** |

Track which hypothesis verbatims dominate at +30 NPS — that's the H1 for the marketing site.

**Cost:** 1 hour for the hypotheses; survey wiring is already in scope via PostHog.

### H-C4. §19 Glossary names 56 agents — does the customer ever *hear* them?
**Section:** §19
**Why critical:** The glossary lists BigBrain, Jury, Optic, Halo, etc. as glossary terms — but §Background says "only BigBrain talks to the customer." So which is it? Either the agent names are a moat (transparency, "see who reviewed your code") and they belong on every audit report, the marketing site, and the verdict screen — or they're internal jargon that should never leak.

**Decision needed (Herald's vote):** **Make them a feature.**

Rationale: "Halo, our accessibility reviewer, flagged 4 issues" reads premium and human. "The system flagged 4 issues" reads automated and cold. Premium positioning needs identifiable reviewers. The agent names are the closest thing to a "team page" we have without hiring humans.

**Proposed surfacing:**
- Audit report: every finding tagged with the reviewer's name and 1-line bio.
- Marketing site: "Meet the 7-agent audit panel" — one paragraph each.
- PR body: "Re-verified by Halo, our accessibility reviewer."
- Email subject line on FAIL: "Halo and Optic found 11 issues on /signup."

**Cost:** Decision + 7 short bios + UI wiring on the finding card. ~1 day.

### H-C5. D2 (free tier) decision is a copy decision dressed as a pricing decision
**Section:** §17 D2
**Penny's recommendation:** "1 Project, unlimited Surface re-audits."
**Herald's vote: STRONG SECOND.**

**Why:** The free tier is not pricing — it's the *first scene of the funnel.* The job of the free tier is to make the customer *feel a PASS.* "1 audit per signup" guarantees they never feel a PASS (they'll FAIL — that's by design) and they never see the value loop close. Unlimited re-audits on one project means:

- They run, FAIL.
- They fix something themselves (free).
- They re-run, score goes up.
- **They feel the loop.** *This* is the activation moment.
- Then they either pay for Auto-PR (because they don't want to fix the remaining ones) or buy Code/Full (because they want line-level findings).

The "1 audit per signup" version makes them feel *judged*. The "unlimited Surface re-audits per project" version makes them feel *guided*. Premium positioning lives on *guided.*

**Cost:** Pricing-model edit, no engineering change beyond per-project quota counter.

### H-C6. D7 (CLI tamper messaging) is brand-voice territory and the current spec is brittle
**Section:** §17 D7
**Shield/Jury's recommendation:** Watermark CLI as "Self-Audited / Unverified."
**Herald's vote: SECOND, with copy refinement.**

**Why "Self-Audited / Unverified" is almost right but reads punitive:**

"Unverified" tells a paying customer they bought the second-class tier. They didn't — they bought the **private** tier. Sell what they bought.

**Redline — three badge states:**

| Mode | Current proposed badge | Herald's redline |
|---|---|---|
| Managed / Hosted | "Studio Zero Certified" | **"Studio Zero Verified"** *(certified implies a third-party body; verified is honest)* |
| BYOK Hosted | (not specified) | **"Studio Zero Verified"** *(same — runs on our infra)* |
| CLI Local | "Self-Audited / Unverified" | **"Private Run — Findings Owned By You"** |

The CLI badge tells the customer what they get (privacy, ownership) without telling them what they don't get (our seal). Same trust signal; honest framing; doesn't punish the privacy-buyer.

**Cost:** 3 strings. 30 minutes.

---

## Majors (fix before public launch)

| # | Section | Issue | Redline |
|---|---|---|---|
| H-M1 | §6.1 | "Project list, audit/build dashboards, score display, findings checklist, fix-delivery purchase flow" — zero microcopy spec'd. Empty states, loading states, and error states are 60% of the in-app surface and 100% of the *feel.* | Add a §6.1.1 "Microcopy inventory" with one entry per state: empty project list, audit-in-progress, audit-failed-to-run, fix-bundle-purchased, payment-failed. Herald drafts; Pixel inserts. |
| H-M2 | §7.2 Step C | "Live progress is streamed to the dashboard." Stream copy is unspec'd. A premium product needs *narration*, not log lines. | Replace `"agent: halo, status: running, step: 3/12"` with `"Halo is checking color contrast on your live pages — 3 of 12 checks done."` Each agent gets a 1-line activity verb in its persona file; runner emits the verb. |
| H-M3 | §7.2 Step E | "Default tier ships specs only." Spec for *what the spec looks like in the report* is missing. | Each finding's `recommendation` field needs a fixed shape: 1-sentence *what*, 1-sentence *why it matters to a user*, code block *how*. Proof grades. |
| H-M4 | §11.2 | "Per-commit attribution to the originating finding ID." Commit message format is unspec'd. | Lock commit message format: `fix(a11y): add labels to /signup form [F-007]`. Conventional Commits + finding ID. Customer's commit history stays clean. |
| H-M5 | §12 | "Annual billing: 2 months free (same SaaS standard)." Standard. Herald hates standard. | Reframe: **"Pay for 10 months, get 12. The other 2 cover the audits you'll actually need."** Same discount, the framing earns the price. |
| H-M6 | §13.6 | Sentry error pages and Stripe receipts inherit vendor voice. Brand consistency breaks at the seam. | Add §13.6.1 "Brand-surface customization": custom Sentry error page, custom Stripe receipt template, custom Supabase auth emails. All three vendors support it. Herald drafts the templates. |
| H-M7 | §17 D4 | BYOK Starter $29 vs $19 — Penny flagged the price; Herald flags the *name.* | If we go $19, rename to "Solo" (Path A) — $19 reads cheap for a "Starter Pro tier" but premium for a "Solo plan." |
| H-M8 | §16 M5 | "Marketing site, docs, onboarding, observability" — all in week 16. Same problem Sprint flagged: marketing backloaded. | Pull marketing site to M0 alongside the spike. Herald + Pixel ship a single-page site by week 2, expand through M5. Waitlist captures intent during M1-M4. |

---

## Minors

- **§7.2 Step D:** rename verdict label `PASS WITH FIXES` → `CLOSE` (internal) / **"Close"** (display). "PASS WITH FIXES" is three words trying to be one feeling.
- **§12 "Free-tier safeguards":** the phrase "Email-verification required, IP-rate-limited" is engineering voice. Customer-facing: **"One free audit per email, please."** That's it.
- **§14.5:** "AI disclosure copy required on every audit report" — Herald drafts it now so Comply has something to grade. Proposed: *"Studio Zero is an AI system. The findings below were produced by software agents; the rubric and the scoring math are deterministic and human-defined. See [link] for our methodology."*
- **§Background single-voice rule:** "only BigBrain talks to the customer" — but the agent named *Herald* writes the marketing copy. Reconcile the metaphor in the glossary: BigBrain is the *spokesperson in the product*; Herald is the *spokesperson on the marketing site, in emails, and in error pages.* Same voice, different surfaces.
- **§19 Glossary:** add **"Verdict screen"**, **"Fix bundle"**, **"Re-audit window"** as terms. They appear in customer-facing copy and aren't defined.

---

## Polish

- The phrase "premium positioning" appears once (§12). Premium positioning is a *practice*, not a declaration. Strip the phrase; ship the practice.
- Anywhere the PRD says "the customer," substitute the persona name once per section to keep the writer honest about who they're writing for.
- "Studio Zero" appears 14 times in the PRD body. The customer sees this brand name 50+ times across the product. Brief Pixel: the brand mark and the wordmark need to *not feel corporate.* (Out of scope for this review; flagged for Pixel.)

---

## Add proposals

### Proposal A1 — Brand Voice Document
**File:** `agents/growth/herald-brand-voice.md`
**Owner:** Herald (drafts), Proof (grades)
**Contents:**
1. Voice pillars (4): Confident, Specific, Receipt-bringing, Plain
2. Reading level: ≤8th grade (Flesch-Kincaid), enforced on every customer-visible string by Proof in CI
3. Banned word list (above)
4. Mandatory frames: "Here's what we found. Here's the file. Here's the fix."
5. One canonical example per surface: hero, button, verdict, PR body, billing receipt, error page, email
6. Negative examples: 5 strings we'd never ship and why

### Proposal A2 — Lifecycle Email Sequences (5 emails, full specs)

**E1 — Welcome / First-audit prompt** *(trigger: signup confirmed)*
- Subject: **"Your free audit is waiting"**
- Preheader: *"Paste a URL. We'll grade what we see."*
- Body: 60 words. Single CTA: **"Run my free Surface audit →"**
- Voice check: zero use of "welcome," "thrilled," "journey."

**E2 — Post-FAIL upsell** *(trigger: verdict = FAIL)*
- Subject: **"<X> issues on <domain> — and how to fix them"**
- Preheader: *"Score <Y>/100. Here's the file-by-file breakdown."*
- Body: lists the top 3 Blockers (1 line each, with file path). CTA: **"See the full report"** + secondary **"Have us fix it — $49"**
- Voice check: never use the word "failed" in the subject line; *show the work* instead.

**E3 — Post-PASS-WITH-FIXES** *(trigger: verdict = PASS WITH FIXES)*
- Subject: **"You're <X> points from a clean PASS"**
- Preheader: *"Knock these out, re-audit free for 30 days."*
- Body: lists the 3 highest-impact remaining findings. CTA: **"Show me the path to PASS"**
- Voice check: this email exists to anchor the 30-day re-audit window in the customer's head.

**E4 — 30-day re-audit reminder** *(trigger: day 25 after PASS-WITH-FIXES, no re-audit run)*
- Subject: **"5 days left on your free re-audit"**
- Preheader: *"Same project, same rubric, no charge."*
- Body: 40 words. Shows their last score. CTA: **"Re-audit now →"**

**E5 — Win-back** *(trigger: day 30 after cancellation)*
- Subject: **"We added <new finding type>. Here's what it found on your last project."**
- Preheader: *"No re-signup needed to see it."*
- Body: leads with *new value*, not guilt. Shows a single new finding their old project would now trigger. CTA: **"Reactivate to see all <N> →"**
- Voice check: no "we miss you," no "come back," no emoji.

**Wire-up:** Resend (transactional) + Supabase webhook on verdict-write. Herald + Flow co-own. Lifecycle dashboard tracked in PostHog.

### Proposal A3 — Verdict screen scripts (3 states)
*Already redlined in Blocker H-B3 above. Treat that copy as the v1 spec.*

### Proposal A4 — PR description template
*Already redlined in Blocker H-B4 above. Treat that template as the v1 spec.*

### Proposal A5 — Stripe receipt + Supabase auth email customization
**File:** `agents/growth/herald-transactional-copy.md`
**Why:** Stripe's default receipt and Supabase's default magic-link email are the highest-volume strings the customer ever sees. Defaulting to vendor voice kills the premium frame.

**Templates to ship at M3 (billing milestone):**
- Stripe receipt header copy
- Stripe receipt footer ("Questions? Reply to this email — a human reads them.")
- Supabase magic-link email
- Supabase password-reset email
- Stripe payment-failed dunning email
- Stripe subscription-cancelled confirmation

---

## Remove proposals

Strip these from the PRD and from any customer-facing surface:

| Word / phrase | Where it appears | Why remove |
|---|---|---|
| **autonomous** | §1, §Background | Builder's word. Buyer doesn't care. |
| **AI software agency** | §1 | Two AI buzzwords in one phrase. Pick one. Herald picks "software agency." |
| **production-ready** | §1 | Means nothing. "Shippable" or "ready to ship." |
| **severity rubric** | §1, throughout | Engineering term. Customer-facing: **"how strict we grade."** |
| **graded checklist with optional remediation** | §1 | "Optional remediation" is a Latinate way to say "and we can fix it." |
| **execution mode** | §6, §7, §8 | "Mode" is fine. "Execution mode" is corporate. Customer sees: **"how you want to run it."** |
| **premium positioning, comparable to v0/Bolt at the low end and agency tools at the high end** | §12 | Internal positioning, never customer-facing. Keep in the PRD; never let it leak. |
| **multi-tenant runtime** | §1, §2 | Customer doesn't know what this is. Internal-only term. |
| **stateless executor** | §6.2 | Internal-only. |
| **single-voice rule** | §Background | Internal-only. |

---

## Decisions D1–D9 Votes (Herald)

| # | Decision | Herald vote | Brand-voice rationale |
|---|---|---|---|
| **D1** | GitHub App vs OAuth | **GitHub App** | The OAuth re-auth prompt at M4 ("we need write scope now") *reads* like a bait-and-switch even if it isn't. GitHub App scopes per-repo, the customer's CTO doesn't have to re-read a permission dialog mid-funnel. Brand cost of OAuth: high. |
| **D2** | Free tier — 1 audit vs 1 project unlimited re-audits | **Unlimited re-audits per project. STRONG.** | This is the activation-loop decision. Detailed rationale in H-C5 above. The free tier's *only* job is to make the customer feel the loop close. "1 audit per signup" guarantees they never do. |
| **D3** | Auto-PR scope — MVP / V1.5 / Minor-Polish only | **Minor + Polish only at MVP. Logic refactors V1.5.** | Marketing-wise: a clean PR that fixes 6 a11y issues is *demonstrable*. A messy PR that tries to refactor business logic and gets rejected by the customer's reviewer destroys the brand in 1 incident. Lead with wins. |
| **D4** | BYOK Starter $29 vs $19 | **$19** | $29 needs a comma in a chart. $19 reads "try it" — and the free tier already does the heavy converting. The price *is* the copy on this tier. |
| **D5** | Auto-PR flat $49 vs tiered $15/$49/$99 | **Tiered.** | One price for three sizes of work *feels* like a vending machine. Three prices for three sizes of work *feels* like a service. Premium positioning lives on "feels like a service." |
| **D6** | M2/M3 reorder — Managed before CLI | **Yes, swap.** | Marketing-wise: the Managed tier is the one we'll sell to non-technical founders via paid acquisition. CLI is the technical-founder organic-acquisition tier. Build the paid-acquisition path first; the organic path needs less hand-holding. |
| **D7** | CLI tamper messaging | **"Private Run — Findings Owned By You"** (see H-C6) | Watermarking the privacy customer as "Unverified" punishes them for buying the tier we sold them. Sell what they bought. |
| **D8** | Sandboxing strategy | *Defer to Shield/Atlas.* | Brand-voice neutral. Whatever ships, the customer sees a "private" badge or a "verified" badge, never a "Firecracker microVM" mention. |
| **D9** | SSRF / prompt-injection / telemetry redaction / ingestion limits | *Defer to Shield/Cipher.* Brand-voice ask: when a customer's submission is blocked by an ingestion limit, the error reads **"This file is over 1MB. Skip it, or split it."** Not **"Ingestion limit exceeded (1048576 bytes)."** |

---

## What I will not do

I will not write the marketing site H1, the pricing page subhead, or the onboarding tour copy in this review. Those need a 30-minute prospect conversation each, and we don't have prospects yet. Lock the brand voice doc and the verdict-screen script first. The rest follows.

---

*End of Herald review — PRD v0.3.*

---

## v0.4 Plan Sign-Off (2026-05-10)

### 1. Do the v0.4 additions close my 3 Blockers?

- **H-B1 Brand voice doc** — **Yes.** `agents/growth/herald-brand-voice.md` is on the work list. I own it; Proof grades CI.
- **H-B2 §1 one-liner** — **Partial.** v0.4 adopts the wedge but Auto-PR-deferral changes the second half. Refined redline below.
- **H-B3 §7.2 Verdict screen** — **Yes.** Step D Verdict Screen Spec lands copy + hierarchy + a11y + CTA. Use the H-B3 table as v1.
- **H-B4 PR template** — **N/A for MVP.** Auto-PR deferred to V1.5. Template stays parked in this review; revisit pre-V1.5.
- **H-B5 Lifecycle emails** — **Yes.** §6.3 ships all 5. E2 hook needs the swap below.

### 2. §1 one-liner — refined for Auto-PR-deferred MVP

Original ("We'll prove it — and fix it") promises Auto-PR. With Auto-PR out, lock this instead:

> **"Your AI builder shipped code that fails accessibility. We'll prove it — line by line."**

13 words, grade 6, no "autonomous," and the second half now promises *evidence* (which MVP ships) rather than *remediation* (which it doesn't). "Line by line" pre-sells the file-path + line-range receipt that the verdict screen delivers.

### 3. §6.3 E2 Post-FAIL email — replacement upsell hook

Drop "Have us fix it — $49." Replace with the **paid-tier audit upgrade**:

> Subject: **"<X> issues on <domain> — and we only ran the Surface check"**
> Preheader: *"Code-level audit finds 3-5× more. Same project, deeper gate."*
> CTA primary: **"Run the Code audit →"**  CTA secondary: **"See the Surface findings"**

The upsell stops being "buy a fix" and becomes "buy more receipts." Same psychological lever (evidence), same revenue path, no Auto-PR dependency.

### 4. D7 framing — CONFIRMED

**"Private Run — Findings Owned By You"** ships. Considered alternatives: "Local Audit" (true but flat), "Self-Hosted Verdict" (engineering register), "Offline Verified" (lies — we can't verify). The chosen line sells the privacy benefit, doesn't punish the buyer, and ducks the certification-body trap that "Certified" would walk into.

### Final verdict on v0.4 plan: **PASS WITH FIXES**

Fixes are the two redlines above (§1 one-liner, E2 upsell). Both are copy edits, not engineering. Plan ships.

*— Herald, 2026-05-10*
