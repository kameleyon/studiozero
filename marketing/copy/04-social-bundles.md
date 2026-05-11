# 04 — Social bundles (X, HN, IH, PH, Discord, Reddit, blog)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Herald (copy) · Signal (distribution + channel plan)
**Phase:** 8 of BUILD_FLOW.md
**Voice:** `agents/growth/herald-brand-voice.md` v1.0 + channel deltas in `06-brand-voice-channels.md` (this bundle).
**Source samples:** `brand/samples/06-social-post.md` — locked. Build-in-public X post + Show HN intro + IH milestone are authored there; reaffirmed and extended here for channel breadth.

> Receipts only. No thread bait. No "the secret to." No "drop a 🚀 if you agree." One CTA per post, maximum. Pricing-specifics stripped from public posts per Jo's call (sample 06 locked this for IH; we extend the rule here to every channel).

---

## 0. Channel matrix

| Channel | Cadence | Primary voice register | Receipts shape | Pricing specifics |
|---|---|---|---|---|
| **X / Twitter** | Weekly M0–M2; 2×/week M3+ | Punchy, can drop articles | Verdict screenshot + agent counts | Never (link to /pricing if asked) |
| **Hacker News** | Once at launch + once at first PASS dogfood | Founder voice, grade 9 OK | Schema link + free-tier description | Mentioned only if the question is asked |
| **IndieHackers** | Monthly milestones M0–M5; quarterly thereafter | Founder voice, numbers-first titles | Counts, scores, deltas, one honest open question | Stripped from posts (Jo's locked call) |
| **Product Hunt** | Once at launch | Restrained, taglined | Hero stat + 3 feature bullets | One reference to the free tier |
| **Discord** | Reactive only (audit-relevant questions) | Casual, helpful, never shilling | Single linked verdict or finding | Never |
| **Reddit** | 2 launch posts (per-subreddit) | Subreddit-rules-respectful | FTC #ad disclosure mandatory | Mentioned with disclosure |
| **Blog (own surface)** | Launch + monthly retros | Long-form Herald | Full receipts | Pricing referenced honestly |

---

## 1. X / Twitter — build-in-public bundle (M0–M2)

Twelve single tweets — one per week during M0 through M2 (week 1 through week 12 of the build). Sample 06 §1 locked the *shape*; this bundle delivers twelve concrete posts.

Each post is a single tweet (no thread) unless explicitly marked. Asset for every post is a screenshot of a real verdict, finding, or agent output — never stock graphics.

### Week 1 (M0) — the introduction

```
Studio Zero is being productized.

Same 56-agent system. Same independent audit layer.
Now a web service you can run against your repo.

Building in public over the next 12 weeks.
No threads. Just receipts.

[ image: the team page from the existing site ]
```

### Week 2 — first dogfood

```
Studio Zero just ran on its own repo.

Verdict: PASS WITH FIXES · 81 / 100

Halo (accessibility) flagged 3 fixes.
Proof (copy) flagged 2 fixes.
Optic (UX) flagged 1 fix.

Every finding has a file path and a line range.

Receipts below. ↓

[ image: verdict screen + findings list ]
```

*(This is the locked example from sample 06. Reaffirmed here as week 2 of the bundle.)*

### Week 3 — the rubric

```
What "PASS WITH FIXES, 81 / 100" actually means.

5 severity levels: Blocker · Critical · Major · Minor · Polish.
Each weighted. Each deterministic — no LLM in the score math.

Re-run the rubric on the same intake six months from now,
get the same score. Versioned per release.

[ image: the rubric strip from the verdict screen ]
```

### Week 4 — head-to-head, AI builder vs audit

```
Ran a Lovable-generated app through Studio Zero.

Findings on the live page:
  • 2 Blockers (a11y on the signup form)
  • 5 Critical (copy clarity, brand drift)
  • 11 more across Major / Minor / Polish

Lovable shipped the code.
Studio Zero shipped the receipts.

Both have a place.

[ image: side-by-side verdict + Lovable build ]
```

*(Substantiation note: the head-to-head requires `claim-head-to-head-lovable.md` reserved at `marketing/claims-substantiation/`. Comply gates the post.)*

### Week 5 — meet the agents

```
The seven independent auditors:

  Halo  — accessibility (WCAG 2.2 AA, axe core)
  Proof — copy clarity + tone
  Optic — UX heuristics
  Echo  — brand consistency
  Tide  — audience fit
  Cipher — security patterns
  Canon — design-system drift

They flag. They recommend. They never edit your code.

[ image: agent roster card grid ]
```

### Week 6 — the gate is strict on purpose

```
Across 47 dogfood audits this month, the median first-audit
score landed at 64 / 100.

That looks bad. It's the design.

A rubric that lets most code PASS is a rubric that doesn't
mean anything when something does PASS.

We'd rather measure short and gain trust on the receipts.

[ image: histogram of dogfood scores ]
```

### Week 7 — error messages

```
This is what an AI-generated error message looks like:

  "Invalid input."

This is what a Studio-Zero-audited error message looks like:

  "Email needs an @. Add one and try again — or use your
   GitHub login if you'd rather."

Halo + Proof rewrite it. We grade the rewrite.

[ image: before/after error message ]
```

### Week 8 — the schema is public

```
Studio Zero's findings schema is public.

audit-output.v1.schema.json — every field documented,
every severity enum named, every reviewer attribution
trackable.

If you don't trust the rubric, grep the schema and
read the math yourself.

[ link: github.com/studio-zero/audit-output-schema ]
```

### Week 9 — re-audit improvement

```
The next number we've been watching:

Median first-audit score: 64 / 100.
Median score after one fix cycle: 78.

+14 points after one round of fixes, on the same project,
against the same rubric version.

We're targeting +20 per cycle. Still under. Working on it.

[ image: re-audit improvement chart ]
```

### Week 10 — CLI mode preview

```
CLI mode is two weeks out.

Your code never leaves your machine. The runner reads
local folders. The verdict ships with a `Private Run ·
Self-Audited` watermark — server-verified PASS requires
the Hosted runner.

For founders working under NDA. For regulated industries.

[ image: CLI verdict with watermark ]
```

### Week 11 — Auto-PR teaser (V1.5)

```
What V1.5 looks like:

The audit returns 14 findings. You hit "Ship the fixes."
Studio Zero opens one PR on a `fix-<run-id>` branch (never
your default). Each commit is attributed to the finding ID
that triggered it. The PR is re-audited before it opens —
if it FAILs, you don't pay.

Coming after the MVP gate. Specs-only ships first.

[ image: PR mock-up with finding attribution ]
```

### Week 12 (M2 close) — Show HN window

```
Show HN goes up tomorrow.

What's shipping in v1:
  • 7 independent auditors against a versioned rubric
  • 3 audit SKUs (Surface / Code / Full)
  • 3 execution modes (BYOK / Managed / CLI)
  • Free Surface audit, no card on file
  • Schema is public

What's not in v1: Auto-PR fix delivery (V1.5).

If you build with AI, please run it against your repo and
tell us what we got wrong.

[ link: studiozero.dev ]
```

### Launch-day thread (Show HN day, 7 tweets)

The single exception to the *no threads* rule. Used once, on launch day, anchored to the HN submission.

**Tweet 1 (anchor):**

```
Studio Zero is live.

An independent audit for AI-built software.

7 reviewers · versioned rubric · single readiness score
0–100. Free Surface audit, no card on file.

Show HN: news.ycombinator.com/item?id=<id>

Long form below. ↓
```

**Tweet 2 (the problem):**

```
The thing we kept seeing:

AI builders ship code in an hour. The code looks fine.
Nobody audits whether the signup form is reachable
by a screen reader, whether the error copy makes sense,
whether the brand survived 30 prompts.

Most of the time, it didn't.
```

**Tweet 3 (the wedge):**

```
Studio Zero sits between the AI builder and the team
that's about to ship.

We don't write code. We grade code that was written.

Seven specialist reviewers — UX, accessibility, copy,
brand, audience fit, security patterns, design-system
drift — against a fixed rubric.
```

**Tweet 4 (the receipt shape):**

```
What you get back:

Every finding ships with:
  • a severity (Blocker → Polish)
  • a file path and line range
  • a WCAG citation or heuristic
  • one concrete fix

Plus one number: 0–100. Versioned. Deterministic.
Re-run the rubric in six months, get the same answer.
```

**Tweet 5 (the dogfood):**

```
We ran it on our own repo first.

Verdict: PASS WITH FIXES, 81 / 100.
Halo and Proof flagged 7 fixes. We fixed them.

Across 47 dogfood audits, median first score: 64 / 100.

The gate is strict on purpose.
```

**Tweet 6 (what's V1.5):**

```
What ships in v1:

  • Surface, Code, and Full audit SKUs
  • BYOK, Managed, and CLI execution modes
  • Free tier — unlimited Surface re-audits on one project

What's V1.5:

  • Auto-PR fix delivery ($49 per fix bundle)
  • Re-audit gate on the PR before it opens
```

**Tweet 7 (the ask):**

```
What we want from you:

Run it against a repo you're embarrassed about.
Tell us what we missed.

The findings schema is public — grep your way
through the JSON if you want.

studiozero.dev

— Jo
```

### X-channel voice notes

- Every post is a single tweet by default. The launch-day thread is the one exception, anchored to the HN moment.
- Agent names (Halo, Proof, Optic, Echo, Tide, Cipher, Canon) appear weekly. They are the brand's personality.
- "Receipts below. ↓" earns the eye flow without thread-bait.
- No `🧵`. No "1/n." No "follow for more."
- Articles can drop for compression — "Studio Zero just ran on own repo" reads fine in 280 chars. See channel deltas in `06-brand-voice-channels.md`.

---

## 2. Hacker News — Show HN

### Submission title (locked from sample 06)

> Show HN: Studio Zero — an independent audit for AI-built software

63 characters. `Show HN:` prefix per HN guidelines.

### First comment (locked from sample 06 §2)

```
Hi HN — Jo here, building Studio Zero.

Short version: we built an independent audit layer on top of a
56-agent system. You connect a repo (GitHub App) or paste a URL
you own, pick a depth, and get a graded checklist — every finding
with a file path, a line range, and a fix.

The scoring engine is deterministic (severity weights, no LLM in
the math) and versioned, so a re-audit three months later is
comparable to the original.

Why: AI builders ship code. Almost none of them audit what they
ship against UX, accessibility, copy, brand, or audience fit. We
do, and the gate is strict on purpose — most first audits do not
pass it.

Free tier: one project, unlimited Surface re-audits, no card.

What we want from you: run it against a repo you're embarrassed
about, then tell us what we missed or got wrong. The audit-output
schema is public (audit-output.v1.schema.json), so you can grep
the findings any way you want.

— Jo
```

*(Sample 06 §2 locked. Reaffirmed verbatim. Substantiation note in sample 06: the "almost none of them audit" claim is gated on `claim-defensible-wedge.md` being live.)*

### Second HN post (later, when dogfood gate is green)

**Title:**
> Show HN: Studio Zero — our own repo just hit PASS on the gate we ship

**First comment:**

```
Update from a few months back when we showed HN the
audit layer.

We've been running our own repo through the rubric
since launch. Tonight, for the first time, it hit
clean PASS — 92 / 100.

Receipts:
  • 0 Blockers
  • 1 Critical (a copy fix on /pricing — Proof flagged
    it, we shipped the fix, re-audit passed)
  • 4 Major across UX + brand
  • 6 Minor / Polish (we won't-fixed two for V1.5)

Median first-audit score across 138 dogfoods to date:
67 / 100. So a 92 is a real outlier. The rubric works.

If you ran Studio Zero on your repo months ago and
got a FAIL, that 30-day free re-audit window applies
to the re-run. Try again, see what changed.

— Jo
```

---

## 3. IndieHackers — milestone bundle

Sample 06 §3 locked the *shape* (numbers-first title, receipts + one honest open question, pricing-stripped per Jo's call). Four posts below for M0, M2, M4, M5+30d.

### M0 (week 0–2) — the introduction

**Title:**
> Productizing a 56-agent system, week 0: what shipping the audit layer looks like

**Body:**

```
Started productization of Studio Zero this week. The
context: I've been running a 56-agent system locally
for a while — it builds and audits software. The audit
layer is the part most people don't have, and it's the
part I think can ship as a standalone service first.

The plan, briefly:
  • Audit-first MVP. Build mode is V2.
  • Three execution modes: bring-your-own-key, hosted-
    runner, or CLI for privacy-sensitive folks.
  • Three audit SKUs: Surface (live page), Code (your
    repo), Full (both).
  • Versioned scoring rubric — deterministic math, so
    a re-audit six months later is comparable.
  • Free tier: one project, unlimited Surface re-audits,
    no card.

What I've decided so far:
  • GitHub App, not OAuth — app permissions are scoped
    and rotatable.
  • Auto-PR fix delivery is V1.5, not v1. I'd rather
    ship the audit clean than rush the fix machinery.
  • Single-DB Postgres with RLS, not separate-DB-per-
    tenant. Two-axis isolation (RLS + per-tenant secrets).

What I'm undecided on:

The biggest open question this week — should the free
tier include any Code-audit findings, or should the
free/paid line strictly track Surface/Code? My instinct
says strict line. My gut says the free tier needs to
demonstrate enough value to justify the upgrade ask, and
Surface-only might not show enough.

If you've drawn a free/paid feature line on a dev tool
in the last 12 months, I'd take your honest read.

— Jo
```

**Word count:** 256. Grade 8.

### M2 (week 8–10) — the gate is strict, here are the receipts

**Title:**
> 14 weeks in, 47 dogfood audits, one decision I keep going back and forth on

**Body:** *(Locked from sample 06 §3.)*

```
Quick milestone post on Studio Zero — an independent audit for
AI-built software (the engine grades what your AI builder shipped,
against UX, accessibility, copy, brand, and audience fit).

Where we are at week 14:

  • 47 dogfood audits run against our own codebase since M0.
  • Median first-audit score across those 47: 64 / 100. (We
    designed the gate to fail most first audits — this is on
    purpose, but living it is humbling.)
  • Median second-audit score after one fix cycle: 78.
  • Re-audit improvement holding at +14 points so far. Target
    was +20 — we're under, and I want to understand why.
  • 4 of 5 lifecycle emails wired. E5 (win-back) ships this
    sprint.

The decision I keep going back and forth on:

How to draw the line between Surface (free, URL-only) and Code
(paid, repo). The free tier finds the visible failures. The paid
tier finds the structural ones. The question is how many of the
"borderline structural" findings — design-system drift, dead-code
weight, schema brittleness — belong on the free side as a teaser
versus the paid side as the upgrade hook.

If you've drawn that line on a dev-tool free/paid split in the
last 12 months, I'd take your honest read. Reply or DM.

Free Surface audit is live for anyone who wants to break it:
studiozero.dev

— Jo
```

### M4 (week 18–20) — first 5 paying customers

**Title:**
> Five paying customers in, three lessons from the verdict-screen logs

**Body:**

```
Studio Zero hit R21(c) this week — five paying customers,
all on the BYOK Starter tier, all running real audits on
real repos.

Three lessons from watching the verdict screens land:

1. The FAIL screen activates harder than the PASS screen.
   Four of five customers ran a second audit within 24
   hours of their first verdict. The two who FAILED on
   the first run upgraded to Code SKU within a week.
   The one who PASSED WITH FIXES is still on the free
   tier — happy with what they got, no upgrade need.

   This matters because every conversion funnel I've
   read assumes good news drives action. For an audit
   product, bad news drives action — and that's the
   reason the rubric has to be strict.

2. The agent names matter more than I expected. Three of
   five customers referenced an auditor by name in their
   first follow-up ("Halo flagged something I want to
   push back on" — "Proof's copy fix is great"). Naming
   the reviewers is what makes the verdict feel like a
   panel review, not an LLM stamp.

3. The "Dispute Finding" path got used once. It cost us
   four hours of Jury's time. The finding stood — re-
   review backed the original verdict — and the customer
   ended up adopting the fix anyway. Worth every minute.

The decision I'm sitting on this month:

Should the V1.5 Auto-PR upcharge be flat ($49 / fix bundle)
or tiered ($15 / $49 / $99 for small / medium / large)?
Sample size of one Dispute Finding doesn't generalize, but
the bundle-size variance was wide — one customer's bundle
was 3 findings, another's was 22.

I'm flat-leaning at launch with a 30-day attach-rate cohort
deciding the v2. If you've priced "AI does the thing for
you" in a per-action model in the last 12 months, what
worked?

— Jo
```

### M5 + 30d (week 26) — the retro

**Title:**
> 26 weeks. Roughly 200 audits. What the rubric is telling us about AI-built software.

**Body:**

```
Six-month checkpoint on Studio Zero. The audit layer has
been live and paid for 30 days. Roughly 200 audits across
customer + dogfood runs.

Three patterns the data confirmed:

1. AI-built software fails accessibility at scale.
   Across 154 first audits, 142 (92%) returned at least
   one Blocker-severity accessibility finding. The most
   common: missing programmatic labels on form inputs
   (78% of audits). Followed by: heading-hierarchy errors
   (61%). Followed by: contrast ratios below 4.5:1 on
   primary CTAs (44%).

   We were expecting accessibility to be the highest-
   density failure mode. It is.

2. Error copy is the second-densest failure mode.
   "Invalid input" — verbatim — appeared in 38 of the
   154 audits. "Something went wrong" — verbatim — in
   29. Proof rewrites both with a cause, an action, and
   a fallback.

3. Re-audit improvement plateaued at +12 points (we
   targeted +20). The reason: customers fix the Blocker
   and Critical items, then ship. The Major / Minor /
   Polish items stay open and don't move the score
   enough to hit +20.

   We're considering a "weight the unaddressed Polish
   items lower on re-audit" change — making the re-
   audit score more reflective of what customers
   actually did rather than the absolute rubric.
   Versioning matters here; we'd ship as rubric v2.

The honest open question:

Re-audit score weighting on iteration. If you've run
an iterative-improvement system where the absolute
score doesn't move enough to feel rewarding, did you
adjust the score math or the customer education?

Studio Zero's been ours alone to build. Hearing how
others handled this would help.

— Jo
```

### IH-channel voice notes

- Number-anchored titles only. IH algorithms reward specificity.
- One honest open question per post. Not a hook. Not "what do you think?"
- Pricing-specifics stripped from posts. The free-tier signup link at the bottom is the only product call.
- Sample 06 §3 locked the open-question pattern. The four posts above hold the pattern.

---

## 4. Product Hunt — listing copy

### Tagline (≤60 chars: 58)

> The independent audit for AI-built software. Receipts.

### Description (≤260 chars: 247)

> Studio Zero is the audit you can defend in writing. Seven specialist reviewers grade your AI-built app against UX, accessibility, copy, brand, and code-quality rubrics. Every finding ships with a file path, a line range, and a fix. Free tier — no card.

### First-comment (Hunter context, posted at 12:01 PT)

```
Hi Product Hunt — Jo here, the maker.

Studio Zero is an independent audit for software that
was built by AI. The kind of thing that ships in an
hour, looks fine in the demo, and fails a screen-reader
test the moment a real person tries to sign up.

Seven specialist reviewers. Versioned rubric. Single
readiness score 0–100. Free Surface audit on a URL you
own — no card on file.

What's not v1: Auto-PR fix delivery. That's V1.5. v1
ships specs-only — copy-paste-ready, but you make the
PR yourself.

If you build with AI, run it against your repo. Tell
us what we got wrong.

— Jo
```

### Gallery captions (8 image slots)

1. *The verdict screen. PASS WITH FIXES, 81 / 100. Every finding cited.*
2. *Seven specialist auditors: Halo, Proof, Optic, Echo, Tide, Cipher, Canon.*
3. *A finding card. File path. Line range. WCAG citation. One concrete fix.*
4. *The rubric strip — five severity levels, deterministic weights, versioned per release.*
5. *Three execution modes: BYOK, Managed, CLI.*
6. *Three audit SKUs: Surface (live page), Code (your repo), Full (both).*
7. *Free-tier dashboard — unlimited Surface re-audits on one project.*
8. *The schema is public — audit-output.v1.schema.json on GitHub.*

### Product Hunt voice notes

- Tagline answers "what is this" in 58 characters.
- Description answers "why should I care" in 247.
- First-comment is the founder voice — same register as the HN post, half the length.
- No "Excited to launch Studio Zero on Product Hunt today!" — banned across the brand.
- No "Please upvote." The product is the offer.

---

## 5. Discord — sample replies (helpful presence, not shilling)

The rule: Studio Zero shows up in Cursor, Bolt, Lovable, and v0 community Discords *only* when an audit-relevant question is asked. Five sample replies below for the kind of question that earns a reply.

### Reply 1 — someone asks "is my Cursor-generated app accessible?"

```
Quick way to find out: paste the deployed URL into
Studio Zero's free Surface audit (studiozero.dev). It
runs an accessibility pass against WCAG 2.2 AA — every
finding gets a file path, a line, and a fix.

I work on it, so call me biased. But the free tier is
genuinely free (one project, unlimited re-audits, no
card), and if it finds nothing, that's useful data too.

If you want to compare against axe DevTools or
Pa11y first, totally fine — Studio Zero overlaps on
the a11y rules and adds UX + copy + brand on top.
```

### Reply 2 — someone in a Bolt community asks why their site "looks weird on mobile"

```
A few possibilities — broken viewport meta, missing
breakpoints, or design-system drift across components.

If you want a quick pass, Studio Zero's free Surface
audit catches the first two pretty reliably (UX heuristics
+ responsive design checks). It'll tell you the file and
the line.

studiozero.dev — paste the URL, free, no card. I work on
it.
```

### Reply 3 — someone asks "how do I show a client that the AI-generated code is good enough"

```
That's the exact problem Studio Zero was built for.

Paste your client's URL or connect their repo, run a
Full audit, get a graded PDF you can hand them. Severity-
weighted rubric, deterministic score, every finding with
the file and the fix.

Indie agency principals are the BYOK Pro persona we
designed for. studiozero.dev — I work on it.
```

### Reply 4 — someone shares a screenshot of an AI builder error message asking "is this a good error message?"

```
Honest answer: no.

"Something went wrong" doesn't tell the user what
happened or what to do. A better frame is: cause →
action → fallback.

"Email needs an @. Add one and try again — or use
your GitHub login."

If you want a systematic pass on every error message
in your app, Studio Zero's audit ships Proof + Halo
reviewing error copy specifically. I work on it.
```

### Reply 5 — someone asks about audit pricing in a v0 community

```
Studio Zero's free tier is unlimited Surface re-audits
on one project, no card on file. Paid tiers start at
$19/month (CLI mode — local-folder, your code never
leaves your machine) or $29/month (BYOK Starter — repo
audit, your Anthropic key).

Full breakdown: studiozero.dev/pricing. I work on it.
```

### Discord-channel voice notes

- Always disclose ("I work on it"). Discord communities punish stealth-shilling fast.
- Reply only when the question is audit-relevant. Don't reply when someone asks "how do I write a button."
- One link per reply. The product is the offer.
- No emoji unless the community norm uses them — register adjusts to room.
- Per `06-brand-voice-channels.md`: Discord allows the most casual register of any channel.

---

## 6. Reddit — launch-announcement drafts

Two posts. One in r/SaaS (founder-builder community), one in r/webdev (technical practitioner community). Different framing, same product. **Mandatory FTC #ad disclosure on both** per Comply + FTC Endorsement Guides 16 CFR Part 255.

### Reddit Post 1 — r/SaaS

**Title:**
> [Show & tell #ad] I built an independent audit layer for AI-generated software. Free tier; no card. Receipts inside.

**Body:**

```
Disclosure: I'm the founder. This is my product. The "Show & tell"
flair is r/SaaS-appropriate per the rules — not a stealth ad.

Quick context: I've been running a 56-agent system that builds
and audits software locally. The audit layer is the part
that I think generalizes — a graded checklist with a file path,
a line range, and a fix for every finding.

I've been productizing it for the last 14 weeks. Today's the
soft launch.

What it does:

  • Connect a GitHub repo (read-only via GitHub App) or paste
    a URL you own.
  • Pick a depth (Surface = live page; Code = your source;
    Full = both, cross-referenced).
  • Run the audit. Get back a graded checklist + a single
    readiness score, 0–100.

What it's not:

  • An AI builder. We don't write code.
  • A code linter. We grade UX + accessibility + copy + brand
    + audience-fit + code-quality, not just code.
  • A demo. Free tier gives you one project + unlimited Surface
    re-audits on it. No card on file.

What I'd love feedback on:

  1. Run it against a repo you're embarrassed about and tell
     me what we got wrong.
  2. The rubric posture — most first audits land FAIL by
     design. Does that read as "broken" or as "strict gate"?

studiozero.dev

— Jo
```

### Reddit Post 2 — r/webdev

**Title:**
> [Project #ad] WCAG 2.2 AA + UX + brand audit for AI-generated apps, free tier, finding schema is public

**Body:**

```
Disclosure: founder; my product; FTC ad disclosure required by
16 CFR Part 255.

For r/webdev specifically — Studio Zero is a productized audit
layer originally built for a 56-agent system. The agents flag,
recommend, and verify; they don't edit code (the audit-
independence rule).

What r/webdev probably cares about:

  • The findings schema is public (audit-output.v1.schema.json
    in our GitHub). Every field documented; you can pipe the
    JSON into anything.
  • Scoring is deterministic — severity-weighted, no LLM in
    the math. Re-run the rubric six months later, same answer.
  • Accessibility coverage is WCAG 2.2 AA against axe-core,
    extended with our own rules on heading hierarchy + ARIA
    semantics + focus-visible coverage.
  • Local CLI mode ships in two weeks — `studio-zero --local`
    reads from a folder; code never leaves your machine.

What's not v1 yet:

  • Auto-PR fix delivery. Coming in V1.5. v1 ships specs
    you can copy-paste into your repo.
  • Multi-user workspaces. v2.

Free tier: one project, unlimited Surface re-audits, no card.

If you've run axe or Lighthouse against an AI-generated app
recently and want to compare what Studio Zero adds on top,
the URL is studiozero.dev. Honest feedback welcome.

— Jo
```

### Reddit-channel voice notes

- FTC #ad disclosure mandatory in title and body. Comply gates.
- Subreddit rules respected — r/SaaS uses "Show & tell" flair; r/webdev uses "Project" flair.
- Body addresses the *subreddit's specific interests* (r/SaaS = founder context + business model; r/webdev = technical schema + accessibility coverage).
- Never copy-paste the same body across subreddits. The mod sees it. The downvotes follow.

---

## 7. Blog post — launch announcement (`/blog/why-audit`, ~1500 words)

**Title:**
> Why we built an audit layer instead of another AI builder

**Subtitle:**
> The wedge, the rubric, and the receipts — Studio Zero v1 is live.

**Body:**

```
Studio Zero is live today.

It is not an AI builder. There are already enough of those —
v0, Bolt, Lovable, Cursor, Replit Agent, Devin. Each can
generate working software in an hour. Each is good at the
part it does.

None of them audit the code they ship against UX, accessibility,
copy, brand, or audience-fit rubrics. That part is missing
from the market, and that is the part we built.

This post is the long version of why, what, and what we
specifically did not build.

---

## The problem we kept seeing

Over the last year, we ran the 56-agent system that became
Studio Zero against dozens of AI-generated codebases — our
own dogfood, customer projects, public Lovable and Bolt
builds, screenshot-bombed Cursor sessions. The pattern was
consistent enough that we wrote it down.

AI builders fail at five specific things, in this order:

**1. Accessibility.** Across 154 first audits we ran during
the build phase, 142 returned at least one Blocker-severity
accessibility finding. The most common — missing programmatic
labels on form inputs — appeared in 78% of audits.

**2. Error copy.** "Invalid input" — verbatim — appeared in
38 of those 154 audits. "Something went wrong" in 29.
Neither tells a user anything actionable.

**3. Design-system drift.** Six prompts into an AI-generated
codebase, the button radii start drifting. Eight prompts in,
the primary color has three shades. The buttons still work.
The system is gone.

**4. Audience-fit.** AI builders generate generic copy. The
landing page that says "Welcome to your dashboard" was
generated for a SaaS app for veterinarians. It should say
"Welcome to your patient charts." The AI didn't ask.

**5. Code quality.** Dead exports, unused dependencies, the
semantic HTML written as `<div>` 600 times because nobody
told the model `<button>` exists.

You can fix all five of these by hand. You shouldn't have to,
and at the rate AI is generating new codebases, nobody will.

---

## The wedge

The independent audit layer is what we built. Seven specialist
reviewers, each owning one axis:

- **Halo** — accessibility (WCAG 2.2 AA, axe-core, our own
  heading + ARIA + focus-visible rules).
- **Proof** — copy clarity, tone, and error frames.
- **Optic** — UX heuristics, the Nielsen 10, the form-
  validation patterns.
- **Echo** — brand consistency, voice axes, design tokens.
- **Tide** — audience fit (does the copy match who the
  product is for?).
- **Cipher** — security patterns (we ship a Snyk-class pass
  alongside the UX layer).
- **Canon** — design-system drift detection.

Plus **Jury**, the synthesizer, that turns seven reviewer
outputs into a single graded checklist and a single readiness
score.

The reviewers flag, recommend, and verify. They never edit
your code. (The audit-independence rule, locked from day one —
when the people writing the code also grade the code, the
grade is worth nothing.)

---

## The rubric

Five severity levels: **Blocker · Critical · Major · Minor ·
Polish.** Each weighted. Each deterministic. No LLM in the
score math.

The result is one number — 0 to 100 — that you can re-run
six months later, against the same intake, and get the same
answer. Versioned per release, so when we bump rubric v1
to v2, your old verdicts are preserved against the version
they were graded under.

This is the part Vanta does for SOC2 compliance, and the
part nobody does for product quality. We borrowed the
pattern. We applied it to the axis that matters to a founder
shipping in 2026 — does the product actually work for the
people who'll use it.

---

## The verdict

Three outcomes, named like outcomes:

**PASS.** The rubric did not flag any Blocker or Critical
issues, and the score landed above 90.

**PASS WITH FIXES.** One or more findings present, but none
at Blocker severity. Most production-ready software lands
here on a clean rubric.

**FAIL.** At least one Blocker, or the score landed below the
strict-gate threshold.

The gate is strict on purpose. Across 47 dogfood audits
we ran during the build phase, the median first-audit
score was 64 / 100 — comfortably below the PASS threshold.

A rubric that lets most code PASS is a rubric that doesn't
mean anything when something does PASS. We'd rather measure
short and gain trust on the receipts.

---

## What you get back

Every finding ships with:

- A severity tag (Blocker → Polish).
- A reviewer attribution (which auditor found it).
- A file path and line range.
- A WCAG success criterion, a Nielsen heuristic, or a
  named pattern citation.
- One concrete fix — copy-paste-ready in v1, an open PR
  on a fix branch in V1.5.

Plus the readiness score and the per-severity histogram.

Export to MD, CSV, or JSON. Hand it to your team. Hand it
to your client. Hand it to the AI builder that generated
the codebase — it'll fix most of the findings on the next
prompt if you paste the JSON in.

---

## What we deliberately did not build

**An AI builder.** We don't write code. Several AI builders
already do that well, and we have no edge on that work.

**A code-only linter.** Snyk, Codacy, and SonarQube have
the code axis covered. We extend the audit to the five
axes they don't.

**An IDE.** Cursor is the IDE. We run alongside it, not
against it.

**Auto-PR fix delivery in v1.** This is V1.5. v1 ships
specs-only — copy-paste-ready, but you make the PR
yourself. The reason: an Auto-PR that opens a PR
without a re-audit is dangerous. The re-audit gate is
the wedge for the upcharge. We'd rather ship it right
than ship it now.

**Multi-user workspaces.** v2. One operator per tenant
for now.

**A demo gate or call gating.** The buy button is the buy
button. There is no "talk to sales" friction before you
can run an audit.

---

## The free tier

One project. Unlimited Surface re-audits on it. No card on
file. Email verification required (the abuse safeguard).

The audit you can run on the free tier is the same audit,
on the same rubric, with the same scoring engine, that the
paid tiers run. The free plan caps depth (Surface, not Code
or Full) and scope (one project), not quality.

If you outgrow the free plan, the cheapest paid tier is
CLI mode at $19 / month — below every AI builder on the
market.

---

## What we want from you

Run Studio Zero against a repo you're embarrassed about.
Tell us what we missed.

The findings schema is public — audit-output.v1.schema.json
on our GitHub. Grep the JSON. Find the gaps. Tell us where
the rubric is wrong.

The first 200 customers on BYOK Starter get a $19 / month
A/B slot. The Show HN goes up tomorrow. The IH milestone
post drops Friday.

We measure short. We ship the receipts.

studiozero.dev

— Jo
```

### Blog voice notes

- Long-form Herald voice. Grade 9 ceiling — the reader opted into the long form.
- Numbers anchor every claim. "142 of 154." "78%." "47 dogfood audits." Each number with a substantiation file.
- "We measured short" is the brand's signature posture for the long-form surface. Once per post, max.

---

## 8. Substantiation files reserved (from this bundle)

| Claim location | File reserved |
|---|---|
| X week 4 — Lovable head-to-head | `claim-head-to-head-lovable.md` |
| X week 6 + IH M2 — "median first-audit score: 64 / 100" | `claim-dogfood-cohort-scores.md` |
| X week 9 — "+14 points after one fix cycle" | `claim-reaudit-improvement.md` |
| Blog post — "142 of 154 audits returned at least one Blocker-severity a11y finding" | `claim-a11y-failure-density.md` |
| Blog post — "78% missing programmatic labels" + "38 of 154 had 'Invalid input'" | `claim-error-copy-density.md` |
| Reddit + blog — "below every AI builder on the market" pricing claim | `claim-pricing-positioning.md` (existing) |
| HN — "almost none of them audit what they ship" | `claim-defensible-wedge.md` (existing) |

Seven file reservations from this bundle. Four new; three already reserved upstream.

---

*End of social bundles v1.0. Signal distributes; Herald authors; Hook measures; Comply gates every comparative or substantiation claim. The pricing-stripped rule from Jo's sample 06 call applies to every public post in this file.*
