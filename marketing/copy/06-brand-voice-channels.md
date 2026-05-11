# 06 — Brand voice channel deltas

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Herald
**Phase:** 8 of BUILD_FLOW.md
**Master document this extends:** `agents/growth/herald-brand-voice.md` v1.0 (locked).
**Purpose:** channel-specific tone, register, and rule deltas. This file does **not** replace the master voice document; it specifies how the *same voice* speaks differently on different surfaces.

> Same voice, different volume. Voice never changes; register adjusts to surface. Anything in this file that contradicts the master voice loses — escalate to Herald.

---

## 0. The rule of the rules

Three constraints hold across every channel below. They are the master-voice gates that no channel delta can override.

1. **Banned words stay banned** (master §5). Channel deltas adjust *register*; they do not unbank words.
2. **Substantiation is mandatory** (master §8). Channel deltas do not waive the FTC AI-claim substantiation rule. A comparative claim on Discord still requires a substantiation file.
3. **The §1 PRD one-liner is the north star.** Every channel's copy is downstream of *"Your AI builder shipped code that fails accessibility. We'll prove it — line by line."*

If a channel delta below appears to contradict the master, the master wins.

---

## 1. X / Twitter

### Register delta (from baseline)

| Axis | Master baseline | X delta |
|---|---|---|
| Formality | slightly formal | -1 (slightly more casual) |
| Warmth | slightly warm | unchanged |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | +1 (can be more technical) |
| Brevity | implicit | maximal — every word earns its place in 280 chars |

### Specific rules

- **Articles can drop.** *"Studio Zero ran on own repo"* reads fine in 280 chars. Master rule is "real sentences," X relaxes this for *compression only*, never for omitting required substantiation.
- **One emoji per post, max** (master §7 stands). Emoji must carry information, not vibe. The down-arrow `↓` to point at a screenshot is information; `🚀` is not.
- **No threads by default.** The single launch-day thread is the documented exception (sample 04, deliverable §1).
- **Screenshot or it didn't happen.** Verdict-screen posts, finding cards, agent outputs, head-to-head competitor runs — every X post leads with the receipt asset.
- **Agent names weekly.** Halo, Proof, Optic, Echo, Tide, Cipher, Canon, Jury. The roster is the brand's personality on X.

### Negative examples — strings Studio Zero would never post on X

- *"🧵 A thread on why we built Studio Zero"* — banned thread bait.
- *"Drop a 🚀 if you agree the audit gap is real"* — banned engagement bait.
- *"Building in public, day 47/365"* — we build in public by shipping receipts, not counting days (sample 06).
- *"This changed everything."* — banned across the brand.

### What X earns the brand

- The agent-roster impression frequency. Twelve weeks of posts naming reviewers builds the soft "the auditors have personalities" priming for the verdict screen.
- The dogfood verdict cycle (week 2, week 9, week 11) — the brand's authenticity proof on the highest-velocity channel.

---

## 2. Hacker News

### Register delta (from baseline)

| Axis | Master baseline | HN delta |
|---|---|---|
| Formality | slightly formal | unchanged |
| Warmth | slightly warm | -1 (slightly cooler — HN punishes warmth) |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | +2 (can be substantially more technical) |
| Reading-level ceiling | grade 8 | **grade 9 OK** |

### Specific rules

- **Founder voice OK.** First person ("Jo here, building Studio Zero") earns the room. The brand voice supports this in the founder-channel context per master §6 social row.
- **Artifacts > adjectives.** HN downvotes adjectives. List the schema file, the free tier, the evidence shape. Skip the "powerful," "robust," "scalable" instinct.
- **One submission per major milestone, not per blog post.** Show HN at launch; Show HN again only when the dogfood gate hits clean PASS. Two HN posts in v1's lifetime is the right count.
- **First comment within 3 minutes.** HN convention is the submitter posts the first comment with context. The comment is sample 06 §2 — locked.
- **Reply to top comments within 1 hour during business hours of HN's primary user base** (PT 9am–6pm). If Jo is away, Signal pings.

### Negative examples

- *"Excited to share Studio Zero with the HN community!"* — three banned words in nine.
- *"We're a small team and we'd love your support."* — banned founder-channel sentimentalism. HN reads it as begging.
- *"Please upvote if you found this useful."* — banned vote bait, against HN guidelines.

### What HN earns the brand

- Schema-file legitimacy. Open-sourcing `audit-output.v1.schema.json` on HN earns the "this isn't a marketing-deck product" credit that compounds for months.
- AMA structure. The HN launch-day AMA (deliverable 05) is the brand's most concentrated honest-answer moment of the launch window.

---

## 3. IndieHackers

### Register delta (from baseline)

| Axis | Master baseline | IH delta |
|---|---|---|
| Formality | slightly formal | -1 (founder voice, slightly more conversational) |
| Warmth | slightly warm | +1 (founder-channel warmth earns the room) |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | -1 (IH audience is mixed-technical, founder-business-focused) |
| Reading-level ceiling | grade 8 | unchanged |

### Specific rules

- **Founder voice required.** First person. "I'm building Studio Zero." The IH algorithm and the IH culture both reward the named founder over the brand voice.
- **Numbers-first titles.** "47 dogfood audits, one decision I keep going back and forth on." IH posts with numbers in the title outperform abstract titles 3 to 1 (IH analytics, internal).
- **One honest open question per post.** Not a hook. Not "what do you think?" An actual question the founder is wrestling with — locked frame from sample 06 §3.
- **Pricing-specifics stripped from posts.** Jo's locked call from sample 06 v0.1.1 — the IH post never contains a price-tier number. The price-tier comparison link at the bottom does the work if the reader is shopping.
- **Monthly milestone cadence M0–M5.** Quarterly thereafter. Skipping a month is fine; faking activity is not.

### Negative examples

- *"Hey IH family!"* — banned (master §5 + IH-culture-specific).
- *"What do you think?"* — banned open-ended engagement bait.
- *"Just shipped this — would love your feedback!"* — banned "just" + exclamation.

### What IH earns the brand

- Sustained founder-voice impressions across the 12-week build window.
- One honest open question per post = honest discussion, not engagement farming. The discussion compounds the brand's auditor-of-record positioning.

---

## 4. LinkedIn — out of scope for MVP

**Status:** explicit non-goal at MVP. Flagged here for transparency.

**Why:**

- LinkedIn's algorithm rewards engagement bait, motivational posts, and "thought leadership" templates — every one of which contradicts master §5 banned words and master §10 negative examples.
- The audit-tool buyer persona (PRD §5 technical solo founder, indie agency, engineering lead at small startup) is on X, HN, IH, and Discord. LinkedIn is the marketing-decision-maker channel that Studio Zero doesn't need at MVP.
- The compliance overhead of LinkedIn ads (Restricted Ad Categories, employment-status implications, the "professional network" framing) is non-trivial for an early-stage product.

**Revisit:** when Compliance-Ready SKU (V2 enterprise tier) is on the roadmap. At that point, LinkedIn is where compliance-buyer personas live, and a separate channel-voice delta will be authored.

**Until then:** Studio Zero does not have a LinkedIn presence. Jo's personal LinkedIn is personal; brand presence is not authorized.

---

## 5. Email (lifecycle + transactional)

### Register delta (from baseline)

| Axis | Master baseline | Email delta |
|---|---|---|
| Formality | slightly formal | unchanged (email stays formal) |
| Warmth | slightly warm | unchanged |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | unchanged |
| Reading-level ceiling | grade 8 | unchanged |

### Specific rules

- **No exclamation marks in subject lines.** Master §7 + email-specific reaffirmation. Single hardest rule to enforce; the marketing instinct is to slip one in.
- **No emoji in subject lines or bodies.** Period.
- **Subject lines ≤50 chars** where the meaning allows. The penalty for going over is the truncation, which costs the open more than the length-cap would have.
- **Preheader ≤90 chars.** Gmail and Outlook show the preheader as the second snippet line; longer preheaders truncate visibly in the inbox preview.
- **One primary CTA per email.** Master §10 negative example #5 reaffirmed.
- **Footer non-negotiables:** physical postal address (CAN-SPAM), unsubscribe link, sender identification, AI-disclosure line.

### Negative examples

- *"🎉 Welcome to Studio Zero!"* — emoji + exclamation in subject. Two bans in five characters.
- *"Don't miss out — your free re-audit expires soon!"* — false urgency, exclamation, "don't miss out."
- *"Hi there!"* — fake intimacy (master §5).
- *"Click here to see your report"* — non-self-describing CTA. Banned.

### What email earns the brand

- The activation pathway from signup (E1) through first FAIL (E2) through PASS WITH FIXES + re-audit cycle (E3, E4) through win-back (E5). Each email is a single decision; the sequence compounds.
- The subject-line discipline trains the inbox to expect signal, not noise. Restrained voice in the inbox is the rarest experience the customer has — earns the open by being un-spammy.

---

## 6. Reddit

### Register delta (from baseline)

| Axis | Master baseline | Reddit delta |
|---|---|---|
| Formality | slightly formal | varies by subreddit (-1 for casual subs, unchanged for technical) |
| Warmth | slightly warm | unchanged |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | varies by subreddit (+1 for r/webdev, -1 for r/SaaS) |
| Reading-level ceiling | grade 8 | unchanged |

### Specific rules

- **Subreddit-rules-respectful, always.** Read the rules before posting. Use the required flair. Disclose the founder relationship in the first line.
- **FTC #ad disclosure mandatory.** 16 CFR Part 255 Endorsement Guides. Comply gates every Reddit post. The disclosure goes in the title (`[#ad]` or `[Promotion]`) and in the body's first line.
- **Never copy-paste the same body across subreddits.** Each subreddit gets a rewritten body that addresses its specific interests. Mods see cross-posting; the karma punishment is fast.
- **Respond to comments in good faith.** Hostile comments get the same calm honest treatment as friendly ones. Hostile comments that violate Reddit rules get reported, not engaged.

### Negative examples

- *"Hey r/SaaS, check out my new product!"* — banned greeting, no disclosure.
- *"Studio Zero is the BEST audit tool for AI software."* — superlative without substantiation. Plus all-caps.
- *"Use code REDDIT20 for 20% off"* — discount-code spam, against most subreddit rules; also we don't have a discount strategy at MVP.

### What Reddit earns the brand

- Two launch-day posts (r/SaaS + r/webdev) seed the brand's technical-community legitimacy. Limited surface — not a primary channel — but earns the founder-builder credit on the technical practitioner side.

---

## 7. Discord

### Register delta (from baseline)

| Axis | Master baseline | Discord delta |
|---|---|---|
| Formality | slightly formal | -2 (most casual register the brand uses) |
| Warmth | slightly warm | +1 (community presence is warmer) |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | varies by server |
| Reading-level ceiling | grade 8 | grade 9 OK on technical Discord servers |

### Specific rules

- **Reactive only.** Studio Zero replies to audit-relevant questions in Cursor, Bolt, Lovable, v0 communities. Studio Zero does **not** post unsolicited.
- **Always disclose.** "I work on Studio Zero" or "I'm the founder" in the first line of every reply. Discord communities punish stealth-shilling faster than any other channel.
- **One link per reply, maximum.** The product is the offer.
- **Emoji per community norm.** If the community uses emoji liberally, one or two per reply is fine. If the community is text-heavy, no emoji.
- **Never DM strangers cold.** Even with a relevant audit hook, cold DMs in Discord communities get reported as spam.

### Negative examples

- *"Hey everyone! Just dropping in to share Studio Zero 🚀"* — banned greeting, banned vibe-emoji, unsolicited.
- *"Studio Zero is the audit you need — try it free!"* — promotional tone in a community channel.
- *"DM me if you want a discount code"* — banned cold-DM solicitation.

### What Discord earns the brand

- Long-tail community legitimacy. Five honest replies in five different AI-builder communities, over six months, builds the "yeah, the audit thing — that founder shows up in our Discord and is helpful" reputation that no paid acquisition channel produces.

---

## 8. Product Hunt

### Register delta (from baseline)

| Axis | Master baseline | PH delta |
|---|---|---|
| Formality | slightly formal | unchanged |
| Warmth | slightly warm | +1 (PH culture expects warmer founder voice) |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | -1 (PH audience is mixed-technical, lean plainer) |
| Reading-level ceiling | grade 8 | unchanged |

### Specific rules

- **Tagline ≤60 chars.** PH listing constraint.
- **Description ≤260 chars.** PH listing constraint.
- **First-comment as the hunter / maker, at 12:01 PT.** Same convention as HN.
- **Reply to every comment within 4 hours during launch-day window.** PH ranking is comment-velocity-weighted; absence costs ranking.
- **One link per comment.** Same as Discord.

### Negative examples

- *"Excited to launch Studio Zero on Product Hunt today!"* — three banned words.
- *"Please upvote if you find this useful!"* — banned vote bait; also against PH guidelines.
- *"DM me with feedback!"* — banned DM solicitation.

### What PH earns the brand

- One launch day's worth of awareness in the PH audience (founders + early-adopter buyers). Limited substained value, but the launch-day spike is real for the lifecycle email pipeline.

---

## 9. Blog (own surface — `studiozero.dev/blog`)

### Register delta (from baseline)

| Axis | Master baseline | Blog delta |
|---|---|---|
| Formality | slightly formal | +1 (long-form, more deliberate) |
| Warmth | slightly warm | unchanged |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | unchanged |
| Reading-level ceiling | grade 8 | **grade 9 OK** on technical posts |

### Specific rules

- **Long-form earns the reader.** Blog posts are 1000–2000 words. Shorter goes to changelog; longer goes to documentation.
- **Numbers anchor every section.** Every claim has a number, a citation, or a substantiation file.
- **One CTA at the end.** The post is the offer.
- **Cross-link to the methodology page** (`/methodology`) on any technical claim.

### Negative examples

- *"In today's fast-paced world of AI..."* — banned filler phrase.
- *"At the end of the day, what matters is..."* — banned filler.
- Listicles ("5 reasons why...") — banned format. Studio Zero blog posts have arguments, not enumerations.

---

## 10. Status page and incident reports

### Register delta (from baseline)

| Axis | Master baseline | Status delta |
|---|---|---|
| Formality | slightly formal | +1 (formal, restrained) |
| Warmth | slightly warm | -1 (calmness over warmth) |
| Restraint | restrained | +1 (maximum restraint) |
| Technical | plain-leaning-technical | unchanged |
| Reading-level ceiling | grade 8 | unchanged |

### Specific rules

- **Timestamps + facts + next-update-time.** Master §6 row.
- **No apologies in the status update itself.** Save the apology for the post-mortem. The status page is for facts.
- **Post-mortem format:** what happened, when we noticed, what we did, what we're changing. No "we apologize for the inconvenience."

### Negative examples

- *"We're sorry for the inconvenience this may have caused."* — banned across the brand (master §5 + master §10).
- *"Our team is working hard to resolve this."* — empty filler.
- *"Stay tuned for updates!"* — banned exclamation + vague promise. Replace with "Next update by 14:00 UTC."

---

## 11. Changelog

### Register delta (from baseline)

| Axis | Master baseline | Changelog delta |
|---|---|---|
| Formality | slightly formal | unchanged |
| Warmth | slightly warm | unchanged |
| Restraint | restrained | unchanged |
| Technical | plain-leaning-technical | +1 |
| Tone | serious with dry edges | dry edges allowed |

### Specific rules

- **One bullet per shipped item.** No marketing prose mixed in.
- **Reviewer attribution where relevant.** "Halo learned to read your error pages. About time." — sample voice §9.
- **Dry humor allowed, sparingly.** Master §2 voice-axis "serious with dry edges" — changelog is the surface where the dry edge appears.

### Negative examples

- *"We're excited to announce..."* — banned across the brand.
- *"New feature: improved performance!"* — vague + banned exclamation. Replace with the specific thing that got faster, by how much.

---

## 12. Channel rule of thumb (cheat sheet for Signal)

If Signal is distributing copy across channels and needs the one-line answer to "what voice am I using here":

| Channel | The voice |
|---|---|
| X | receipts, punchy, agent names weekly, one decision |
| HN | founder voice, schema and free tier, no adjectives |
| IH | founder voice, numbers-first title, one honest open question |
| Product Hunt | tagline + description + founder first-comment + reply velocity |
| Discord | reactive only, always disclose, helpful presence |
| Reddit | subreddit-rules-respectful, FTC #ad disclosure, per-sub body rewrite |
| Email | restrained voice in the inbox; no exclamation in subjects; one CTA |
| Blog | long-form, numbered anchors, one CTA at the end |
| Status page | timestamps, facts, next update time, no apologies in real time |
| Changelog | dry, technical, reviewer attribution allowed |
| LinkedIn | not yet — defer to Compliance-Ready SKU (V2) |

---

## 13. The grade-level matrix (re-asserted from master §4 with channel additions)

| Surface | Target grade | Notes |
|---|---|---|
| Landing site (hero, subhead, body) | 8 | Mom test |
| In-app body copy | 8 | Operator is mid-task |
| FAIL-verdict body | 7 | Cognitive load is high |
| Error messages | 6 | Worst moment of the user's day |
| Subscriber emails (E1–E5) | 8 | Skimmed |
| Technical docs | 10 | Reader opted in |
| Legal (ToS, Privacy, AUP) | no ceiling | Plain-language summary at top |
| PR-body templates (V1.5) | 9 | Read by engineering reviewer |
| X / Twitter | 7 | Skim register |
| Hacker News | **9** | HN audience reads grade-9+ fluently |
| IndieHackers | 8 | Founder voice |
| Reddit (technical subs) | **9** | Technical reader, longer attention |
| Reddit (general SaaS subs) | 8 | Founder-builder cross-section |
| Discord | **9** | Reactive only, technical communities |
| Blog (technical) | **9** | Long-form reader |
| Blog (general) | 8 | Founder voice + numbers |
| Product Hunt listing + first comment | 8 | PH audience is mixed |
| Status page + incident reports | 8 | Reader is under stress |
| Changelog | 9 | Technical reader |

Bold values are channel-specific *raises* of the master ceiling — earned by the surface and the audience, not assumed.

---

## 14. The handoff rule (re-asserted from master §11)

Every channel's copy goes through the four-sign-off before it ships, even on a deadline:

1. **Herald drafts.**
2. **Proof grades** for reading level + banned words + frame consistency.
3. **Comply substantiates** every comparative or capability claim with a file at `marketing/claims-substantiation/<claim-id>.md`.
4. **Tongue localizes** when the surface ships in a non-English locale (deferred to V2 for most channels).

If any check fails, the string is rewritten — not shipped with an exception. Brand voice rots one ungraded string at a time.

The four-sign-off applies to every channel, including the high-velocity ones (X, Discord). On a tight deadline, the order can compress to parallel review — but no string ships without all four.

---

## 15. Channel-voice review cadence

This document is reviewed quarterly and on the following triggers:

- A new channel opens (e.g., LinkedIn when V2 enterprise ships).
- A new banned word is added to master §5 (cascade required).
- A channel-platform changes its rules in a material way (e.g., X drops the 280-char limit, HN tightens its self-promotion rules, Reddit changes the #ad disclosure spec).
- A new substantiation requirement lands from Comply.

Cadence owner: Herald. Diffs are tracked in `agents/growth/herald-brand-voice-changelog.md` (file to be created at first revision).

---

*End of brand voice channel deltas v1.0. Same voice, different volume. The master document at `agents/growth/herald-brand-voice.md` is the canonical source. This file is the channel-specific tuning fork — never the source of truth on banned words, substantiation, or the §1 north star.*
