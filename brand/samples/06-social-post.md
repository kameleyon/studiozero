# Sample 06 — Social posts: X, Hacker News, IndieHackers

**Surface:** PRD §15.5 GTM channels — pre-launch build-in-public, launch week, sustained.
**Voice check:** receipts only. No thread bait. No "the secret to…" No "this changed everything." No emoji in headlines; one emoji per X post maximum, and only if it carries information.
**Channel-fit:** each post is sized and framed for the platform's mechanics, not copy-pasted across all three.

---

## 1. X / Twitter — build-in-public verdict screenshot

**Use:** weekly during M0–M4 pre-launch. Posted by Signal; copy by Herald.
**Asset:** screenshot of a real verdict screen on a real repo (Studio Zero's own dogfood, or a public repo with the owner's permission).

**Post (single tweet, no thread):**

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

**Character count:** 247 (well under 280, leaves room for a link if one is added later).

**Voice notes:**
- Names a real verdict, a real score, real reviewers, real counts. Receipts in the post, not a "thread incoming."
- "↓" pointer earns the eye flow without being thread-bait.
- The agent names (Halo, Proof, Optic) double as a soft team-page proof per H-C4 of the v0.3 review.
- Never *"You won't believe what we found."* Never *"A thread 🧵."*

**What this post does not contain:**
- A 12-tweet thread.
- A "follow for more" pitch.
- A hidden CTA. The product link is in the bio; the screenshot is the offer.

---

## 2. Hacker News — Show HN intro line

**Use:** launch week. One submission to HN's Show HN section.
**Title format (per HN rules — capped at 80 chars):**

> Show HN: Studio Zero — an independent audit for AI-built software

(63 characters. Includes the required `Show HN:` prefix. Names the wedge.)

**First comment (HN convention is the submitter posts the first comment with context):**

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

**Word count:** 178. Grade 8.4.

**Voice notes:**
- HN audience reads grade-9+ fluently — this is the only sample where the grade can drift slightly above 8 without losing them. Stays under 9.
- First person ("Jo here") because HN convention rewards a real human submitter; the brand voice supports this in the founder-channel context.
- Lists the *artifacts* (schema file, free tier, evidence shape) not the *adjectives*. HN downvotes adjectives.
- "Run it against a repo you're embarrassed about" — earns engagement without thread-baiting.
- Never *"Excited to share…"* — banned across the brand.

**Substantiation note:** the *"almost none of them audit what they ship against UX, accessibility, copy, brand, or audience fit"* claim must be backed by `marketing/claims-substantiation/claim-defensible-wedge.md` per PRD §3a before launch.

---

## 3. IndieHackers — milestone post

**Use:** monthly during M0–M5; quarterly thereafter.
**Title format (IH posts get full sentences, ~100-character soft cap):**

> 14 weeks in, 47 dogfood audits, one decision I keep going back and forth on

**Body:**

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

**Word count:** 224. Grade 8. (v0.1.1: pricing-specifics paragraph removed per Jo's call — kept the *one honest question* structure, swapped the topic from price-tier to feature-tier line-drawing, which is more durable across pricing iterations and still earns the IH discussion.)

**Voice notes:**
- Opens with a number-anchored title (IH posts with numbers in the title outperform abstract titles).
- Body is *receipts + one honest question*. The honest question is the engagement engine — not a thread hook.
- Names the audit metrics in the same shape they'll appear on the marketing site, so the brand voice compounds across surfaces.
- "I want to understand why" is the warmest line in the post — earned by the data sitting in front of it.
- Never *"Hey IH family!"* or *"What do you think?"* (open-ended engagement bait — banned).

---

## What none of these posts contain

- *The secret to…*
- *This changed everything.*
- *🧵 A thread.*
- *Drop a 🚀 if you agree.*
- *Building in public, day 47/365.* (we build in public by *shipping* receipts, not by counting days)
- *I'm so excited to announce…*
- Any "1/n" thread indicator.
- A pitch for the product before the receipts have landed.
- More than one CTA per post.

---

## Channel-fit notes for Signal

- **X / Twitter:** screenshot-first; single tweet beats a thread for receipts; the agent names are the brand's personality and should appear weekly.
- **Hacker News:** one submission per major milestone (not every blog post). Show HN once at launch, then PASS-WITH-FIXES-on-our-own-repo as the second post when the dogfood gate is green.
- **IndieHackers:** monthly milestone posts; numbers-first titles; one honest open question per post earns the discussion.
- **All three:** never the same copy across channels. Each post is rewritten for the platform's mechanics. Voice stays constant; format and length change.
