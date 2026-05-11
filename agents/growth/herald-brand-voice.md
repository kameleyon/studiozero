# Studio Zero — Brand Voice

**Owner:** Herald (Growth layer)
**Graded by:** Proof (independent copy audit), Comply (substantiation), Tongue (locale).
**Status:** v1.0 — locked. Supersedes the inline drafts in `prd-review-v03-herald.md` §Proposal A1.
**North Star:** the §1 PRD one-liner — *"Your AI builder shipped code that fails accessibility. We'll prove it — line by line."* Every line of copy Studio Zero ships must be consistent with that promise.

---

## 1. Position statement (3 sentences)

Studio Zero is **the audit you can defend in writing.** We don't shout; we cite. Our voice carries the same confidence-without-arrogance the verdict screen carries — *we found things, here is the evidence, here is the recommendation* — and treats the reader as the professional they are.

---

## 2. Voice axes

For each axis, the marker shows where Studio Zero lives. Anything farther in either direction is off-brand and must be edited back.

```
formal     |————————————X———————|     casual
warm       |——————————X—————————|     cool
restrained |————X———————————————|     expressive
technical  |——————————X—————————|     plain
serious    |—————————X——————————|     playful
```

- **Slightly formal.** We are reviewing professional work. We use sentence case, full sentences, real punctuation. We don't fake-buddy ("Hey there!"). We don't fake-corporate either.
- **Slightly warm.** The reader bought an audit they expected to fail. Warmth here is *respect*, not cheer. Never "Great news!", never "Oops!".
- **Restrained.** The numbers do the shouting. We don't.
- **Plain-leaning-technical.** We name what we did (`aria-label`, contrast ratio 3.1:1) when it earns the precision; we never hide behind jargon when a plain word works.
- **Serious with dry edges.** We can be wry in changelogs. We are never wry in a verdict.

---

## 3. Voice pillars (4)

1. **Confident, not punitive.** A FAIL is a measurement, not a verdict on the person. The customer is the operator, not the defendant.
2. **Specific, not vague.** Every claim names a file, a line, a ratio, a count, or a competitor. "Many" and "various" are banned.
3. **Receipt-bringing.** Evidence first, recommendation second, opinion last (if at all).
4. **Plain, not dumbed-down.** Short words when they fit. Technical words when they're the *right* words. Never both.

---

## 4. Reading-level targets per surface

Measured with Flesch-Kincaid grade level. Proof runs the check in CI and fails the build on a violation.

| Surface | Target grade | Why |
|---|---|---|
| Landing site (hero, subhead, body) | **8** | Mom test. First impression. |
| In-app body copy | **8** | Operator is mid-task; don't slow them down. |
| FAIL-verdict body | **7** | Cognitive load is already high. |
| Error messages | **6** | They appear at the worst moment of the user's day. |
| Subscriber emails (E1–E5) | **8** | Skimmed in an inbox. |
| Technical docs | **10** | The reader opted in. |
| Legal (ToS, Privacy, AUP) | no ceiling | Comply owns; readability summary required at top. |
| PR-body templates (V1.5) | **9** | Read by the customer's engineering reviewer. |

**The mom test:** read every customer-facing sentence out loud. If a non-technical adult would need it explained, rewrite it. No exceptions for the verdict screen, error pages, or pricing copy.

---

## 5. Banned words and phrases — with substitutes

A claim using any of these without an evidence file checked in at `marketing/claims-substantiation/<claim-id>.md` does not ship. Proof rejects in CI.

| Banned | Why | Use instead |
|---|---|---|
| AI-powered, AI-driven | Generic; the FTC sees through it. Name the capability. | "audits your code with seven reviewer agents"; "reads your repo with the GitHub App" |
| autonomous | Builder's word. The buyer doesn't care. | describe what the system does without a driver |
| revolutionary, game-changing, disruptive, next-gen | Superlatives with no proof. Banned by FTC substantiation rule. | cite the specific thing that's new + how it's measured |
| fastest, best, leading, #1 | Superlatives that need substantiation per FTC + Comply. Almost never worth the file. | the number itself; a comparison with a named competitor and date |
| seamless, robust, scalable, enterprise-grade, cutting-edge | Empty intensifiers. | the specific behavior that earns the word |
| leverage, utilize, facilitate, enable | Latin throat-clearing. | use, lets you, helps you |
| unlock, empower, supercharge, transform, journey | Self-help register. We are an audit. | the concrete action the user takes |
| solution, offering, platform | Sales-deck words. Studio Zero is a *service* or a *tool*. | service, tool, audit, runner |
| world-class, premier, elite | Marketing-deck words. | the proof of the claim, or nothing |
| simply, just, easily, effortlessly | Diminishes the user's effort. They tried something hard. | drop the word |
| seamlessly integrates | Two banned words in three. | "connects to" + the name of the thing |
| failed, failure, broken, garbage | About the customer's product. Punitive. | "did not pass," "needs work," the specific finding |
| guys, hey, hi friend | Fake intimacy. | "you" or no greeting |
| we're excited to, we're thrilled to, we're proud to | Stock SaaS opener. | get to the news |
| at the end of the day, in today's world, in this day and age | Filler phrases. | delete |

**Mandatory frames (use these instead of inventing new ones):**

- *"We found N issues across [areas]. Here's every one, with the evidence."*
- *"Score: N / 100. You're X points from PASS."*
- *"Here's the file. Here's the line. Here's the fix."*
- *"Re-audit free for 30 days."*

---

## 6. Tone shifts per channel

Same voice, different volume. Voice never changes; register adjusts to surface.

| Channel | Tone delta from baseline | Example move |
|---|---|---|
| Landing site | +confidence, +specificity | lead with the wedge; cite numbers |
| In-app body | -warmth, +brevity | the operator is working; do not narrate |
| Verdict screen — FAIL | neutral, evidence-first | no apologies, no congratulations, no exclamation marks |
| Verdict screen — PASS | restrained pride | a quiet acknowledgment, not a confetti cannon |
| Error messages | warmer, action-oriented | "Try X. If that doesn't work, contact us." |
| Lifecycle emails | conversational-but-direct | subject line earns the open without click-bait |
| Social — X / HN / IH | receipts + a single insight per post | screenshots, numbers, dates. No threads-as-bait. |
| Status page / incident | the calmest version of the voice | timestamps, facts, the next update time |
| Changelogs | dry, can be a little wry | "Halo learned to read your error pages. About time." |
| Stripe receipts, Supabase emails | branded, restrained | brand voice in a transactional shell |
| Legal pages | Comply owns; we contribute a plain-language summary at the top | "What this means in plain English: …" |

---

## 7. Punctuation and capitalization rules

- **Sentence case** for every UI string, button, headline, email subject line, table header, settings label. *Audit complete.* Not *Audit Complete.* Not *AUDIT COMPLETE.* The verdict word itself (`PASS`, `PASS WITH FIXES`, `FAIL`) is the one exception — it stays in uppercase because the JSON contract does.
- **Em dash with spaces** — *like this*, not—like this. Em dashes used sparingly: one per paragraph maximum, never two per sentence.
- **Oxford comma: ON.** We pick one and we pick this one. *UX, accessibility, and brand.* Never *UX, accessibility and brand.*
- **Numerals from 10 up; spelled out below.** *We found 14 issues.* *We found two Blockers.* Exception: any sentence that starts with a number gets spelled out or rewritten.
- **No exclamation marks** in product copy except one place: an honest celebration on a clean PASS. Even there, optional.
- **No emoji** in product copy, transactional emails, error messages, or legal pages. Optional in social (one per post, maximum).
- **Smart quotes** in long-form copy (landing, blog, emails). Straight quotes in code blocks and CLI output.
- **No trailing periods** on UI buttons, table cells, or single-clause table cells. *Run the Code audit →* not *Run the Code audit →.*
- **No trailing periods** on email subject lines.
- **Arrow glyph** for forward-CTA is the right arrow `→` (U+2192), not `>` or `->`. Use it sparingly — at most one per screen.
- **Code voice** for file paths, identifiers, contrast ratios written as `app/page.tsx:42`, `aria-label`, `3.1:1`.

---

## 8. Substantiation rule (FTC + Comply)

Per PRD §14.5 and the Comply panel sign-off, **any** superlative, comparative claim, capability claim, or referenced competitor price must have a substantiation file checked in at:

```
marketing/claims-substantiation/<claim-id>.md
```

The file contains: the claim verbatim, the evidence (URL, screenshot, dated quote), the date verified, the verifier (Herald + Proof + Comply), and the next re-verification date (quarterly minimum). A claim without a substantiation file does not ship; Proof rejects the build.

Examples that need a file:

- "comparable to SonarQube/Codacy on the low end and freelance agency audits on the high end" → `claim-pricing-positioning.md`
- any price quoted for a competitor in §3a → `claim-competitor-prices-2026q2.md`
- "no competitor ships an Auto-PR for UX + accessibility + copy + brand + audience-fit findings against a versioned readiness rubric" → `claim-defensible-wedge.md`
- "fewer than 5% of first audits land on PASS" — **do not ship** until we have N > 100 audits and the data backs it. Until then, omit.

Examples that do **not** need a file (descriptive, not comparative or superlative):

- "We found 14 issues across UX, accessibility, and brand consistency."
- "Re-audit free for 30 days."
- "Your code never leaves your machine." *(only true in CLI mode — copy must specify mode)*

---

## 9. Canonical examples per surface

These are the v1 reference strings. Other surfaces extend by analogy.

**Landing H1:**
> Your AI builder shipped code that fails accessibility. We'll prove it — line by line.

**Primary CTA — landing:**
> Run a free Surface audit →

**Verdict-screen H1 — FAIL:**
> Audit complete · FAIL

**Verdict-screen body — FAIL:**
> We found 14 issues across UX, accessibility, and brand consistency. Here's every one, with the evidence.

**Primary CTA on FAIL (Surface SKU):**
> Run the Code audit →

**Transactional email subject — signup confirm:**
> Your free audit is ready.

**Error message — CLI offline:**
> The CLI isn't responding. Open a terminal and run `studio-zero login`, then try again.

**Social — X build-in-public:**
> Studio Zero just ran on its own repo. Verdict: PASS WITH FIXES, 81/100. Halo (accessibility) and Proof (copy) flagged 7 fixes — every one with a file path. Receipts in the thread.

---

## 10. Negative examples — five strings Studio Zero would never ship, and why

1. *"We're thrilled to announce our revolutionary AI-powered audit platform!"* — three banned words in nine. Self-congratulatory. Empty.
2. *"Oh no — looks like your audit failed."* — fake commiseration, "failed" is punitive, casual register breaks trust on the highest-stakes screen.
3. *"Simply paste your URL and let our autonomous agents do the rest!"* — "simply," "just," "autonomous." Three diminishers.
4. *"Unlock world-class insights for your codebase today!"* — every word is a banned word.
5. *"Studio Zero leverages cutting-edge AI to seamlessly integrate with your development workflow, empowering teams to ship faster than ever before."* — corporate-deck word salad. Says nothing measurable. Substantiation file for "faster than ever before" does not exist and cannot.

---

## 11. The handoff rule

Herald drafts. Proof grades. Comply substantiates. Tongue localizes. Nothing customer-facing ships without all four signing off the CI check. If any check fails, the string is rewritten — not shipped with an exception. Brand voice rots one ungraded string at a time.

---

*End of Studio Zero brand voice v1.0.*
