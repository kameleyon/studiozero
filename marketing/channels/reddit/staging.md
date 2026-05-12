# Reddit — Staging (T-30 → T-0)

**Channel:** Reddit — r/SaaS, r/EntrepreneurRideAlong, r/webdev (PRD §15.5 + `channel-plan.md` §2.6)
**Owner:** Signal (channel) · Herald (copy) · **Comply (FTC #ad disclosure gate — mandatory)**
**Cadence:** Listening-only pre-launch. One per-subreddit launch announce post at T-0 per each subreddit's promo-day rules.
**Voice ceiling:** subreddit-rules-respectful per `04-social-bundles.md` §6 + Herald §6 Reddit row
**FTC gate (HARD):** **Every Reddit post carries FTC #ad disclosure on first line of body.** Per PRD §15.5 + Comply substantiation rule. Comply blocks at CI on any missing disclosure.
**UTM convention:** `?utm_source=reddit&utm_medium=submission&utm_campaign=<subreddit>`

---

## 1. Subreddit-specific rules verified at T-21

Per `channel-plan.md` §2.6 risk row, each subreddit has its own promo-day + self-promo rules. Signal reads each subreddit's stickied rules thread + verifies promo-day before drafting the post.

| Subreddit                   | Promo-day                                                                                                              | Self-promo rule (T-21 verification)                                                                        | Status           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| **r/SaaS**                  | Self-promo posts allowed in monthly thread + ad-hoc with rules followed; standalone "I built" posts OK with disclosure | Must have ≥30d karma + comment in 3 threads before standalone post; FTC disclosure required                | [verify at T-21] |
| **r/EntrepreneurRideAlong** | Self-promo posts allowed if format = "Here's what I built + what I learned"; community values story over pitch         | Must include "what I learned" reflection; cannot lead with product                                         | [verify at T-21] |
| **r/webdev**                | **Mod-strict** — self-promo posts heavily restricted; consider listening-only                                          | Read mod rules carefully; if standalone post allowed, format must be "I built X using Y stack" not "buy X" | [verify at T-21] |

**Default posture:** if a subreddit's mod rules prohibit launch-day standalone posts, **Signal does not post**. Listening-only is acceptable; getting banned is not.

**Read these rules verbatim BEFORE drafting:**

- `https://www.reddit.com/r/SaaS/about/rules/`
- `https://www.reddit.com/r/EntrepreneurRideAlong/about/rules/`
- `https://www.reddit.com/r/webdev/about/rules/`

---

## 2. r/SaaS launch post — drafted

**Format:** standalone post on r/SaaS's self-promo day (typically Saturday/Sunday; Signal verifies at T-7).

**Title (≤300 chars):**

```
[I built] Studio Zero — an audit layer for AI-built apps (free Surface tier; paid Code/Full)
```

**Body — FTC #ad disclosure on FIRST line:**

```
**[Disclosure: I'm the founder. This is a self-promotion of my own product. FTC #ad.]**

Hey r/SaaS — sharing what I built and looking for honest feedback from the community.

**The problem:** AI builders (Cursor, v0, Bolt, Lovable, Replit Agent) write code fast. They aren't built to audit it — that's a different job. If you've shipped AI-built code that passed code review but failed real users, you've felt this gap.

**What Studio Zero does:** Connect a repo or paste a URL. Seven specialist reviewers grade what got built — UX, accessibility, copy clarity, brand consistency, audience fit, security patterns, design-system drift. Every finding has a file path, a line range, and one concrete fix.

**What's free vs paid:**
- Free Surface audit on any URL (no signup; just paste the URL)
- Paid Code + Full tiers connect to your repo + run on managed Anthropic tokens
- Pricing details on /pricing — landed in the SonarQube / Codacy comp class, not the Cursor / v0 comp class (the comp-class framing is intentional)

**What I'd love feedback on:**
1. The rubric. /how-it-works walks through the 5 severity levels and the score math. Where would you weight a category differently?
2. The free Surface audit. Try it on any of your live URLs. Where does the receipt feel thin?
3. The pricing positioning. We're at $29/mo for Managed Starter. Penny on the team is running an A/B at $19 for the first 200 BYOK Starter signups; we'll let the data drive v2.

**What's behind the scenes:** 16 weeks of build-in-public on Twitter + IndieHackers; 5 milestones (M0..M4 closed; M5 today is launch); pentest by [vendor TBD per `compliance/pentest-engagement-2026.md`]; WCAG 2.2 AA conformance audit signed by independent third party; GDPR + CCPA + CAN-SPAM + EU AI Act Art. 50 compliant from day one.

studiozero.dev

Happy to answer anything in the comments.
```

**Comply FTC gate (verify before submit):**

- FTC #ad disclosure on FIRST line ✓
- Disclosure is conspicuous (bold + bracketed) ✓
- Disclosure uses both "self-promotion" and "#ad" language ✓
- Reference to FTC's Endorsement Guides 16 CFR § 255 is implicit (#ad) ✓

---

## 3. r/EntrepreneurRideAlong launch post — drafted (story-shaped)

**Format:** r/EntrepreneurRideAlong values story over pitch. Body re-shaped accordingly.

**Title:**

```
[Year in build-in-public] 16 weeks ago I posted my M0 milestone here. Today I shipped.
```

**Body — FTC #ad disclosure on FIRST line:**

```
**[Disclosure: I'm the founder of Studio Zero. This is the story of building it; the launch post itself is on /r/SaaS. FTC #ad.]**

Some of you might recognize me from the M0 milestone post I dropped here 16 weeks ago. I said I was productizing an internal multi-agent audit system into a SaaS. Today it ships.

**What worked during the build:**

- **The build-in-public X cadence (3 posts/week, sustained 12 weeks).** Verdict screenshots on real repos converted better than any opinion piece I could've written. Receipts > rhetoric is real.
- **IH monthly milestone posts.** Every 4 weeks I posted what worked, what failed, one honest open question. The "honest open question" pattern Patrick McKenzie writes about is the engagement engine — without it, milestone posts are humble-brag noise.
- **R21(c) alpha gate.** I committed to having 5 paying Managed-tier customers before launch (rather than launching to zero customers and hoping). It worked. We hit the gate at week 9 of the build with [N] paying alpha. Without that gate, I'd have launched into a void.

**What didn't:**

- **The first 2 weeks of X cadence read as humble-brag.** Herald (the voice grader on my team) rewrote the template before week 3. Reading-level grade 9 was the missing constraint; pre-rewrite I was at grade 11–12 and the receipts felt distant.
- **Partner co-marketing channel didn't land.** I had 5 named conversations with founders at Cursor / v0 / Bolt / Lovable / Replit. Zero converted to a partnership pre-launch — they read us as competitive even though we sit downstream. The mitigation in the channel-plan was "downgrade to occasional dogfood share when relevant" and that's where we landed. Lesson: don't bet pre-launch on partners that perceive you as competitive.
- **SEO topic queue didn't carry M0–M2 alpha funnel.** Organic SEO ramps too slowly; SEO is the M5+ engine, not the alpha pipeline. Knowing this in advance let me put the right weight on the right channels.

**What's next:**

- 4 GTM channels active at launch + AMAs in 3 Discord communities through the week
- 30-day cohort retrospective on /pricing A/B + channel ROI (I'll post that here at T+30)
- V1.5 ships Auto-PR (the spec-to-pull-request automation) Q4 2026

**Stuff that helped me ship that I'll credit publicly:**

- Sprint's milestone cadence framework (M0..M5; week-by-week burndown)
- BigBrain's audit-driven launch gating (no FAIL = no launch)
- Comply's plain-English mandate (every legal doc grade-9 readable)
- Halo's WCAG-as-contract framing (a11y as receipts, not a checklist)

For founders here in build-in-public mode: AMA me anything in the comments. I have 12 hours blocked today for engagement on this post + r/SaaS + HN + PH + IH + Discord.

studiozero.dev
```

**Comply FTC gate (verify):**

- FTC #ad disclosure on FIRST line ✓
- Story-shape compliant with r/EntrepreneurRideAlong rules (reflection + lessons) ✓
- Multiple "what didn't work" sections are mandatory for this subreddit's culture ✓

---

## 4. r/webdev — listening-only at MVP

Per §1 verification, r/webdev's mod posture is strict. Default: **do not post a standalone launch announce on r/webdev at T-0.** Signal observes the subreddit + replies helpfully on adjacent threads + drops one link only if a directly-on-topic question lands organically.

If at T-21 verification r/webdev's mods are confirmed receptive to launch-day standalone posts:

**Title (draft):**

```
[I built] Studio Zero — automated WCAG 2.2 AA audit + AI code-quality scan; free Surface tier
```

**Body — FTC #ad disclosure on FIRST line:**

```
**[Disclosure: I'm the founder. Self-promotion post. FTC #ad.]**

Cross-posting from r/SaaS with a webdev-specific framing.

Studio Zero runs a WCAG 2.2 AA audit (axe-core blocking on Critical + Serious + manual at 320/768/1280 px viewports + NVDA + VoiceOver walkthrough) on any URL or repo. We also run 6 other reviewers (UX, copy, brand, audience fit, security patterns, design-system drift) — full 7-reviewer audit on Code + Full tiers.

What's free vs paid:
- Free Surface audit on any URL (no signup)
- Paid Code + Full tiers when you connect a repo

Where it differs from existing tools:
- axe-core covers ~30% of WCAG; the remaining 70% is manual. Studio Zero runs both, then weights them in a versioned rubric (no LLM in the score math).
- Pa11y and Lighthouse a11y are also automated-only. Studio Zero is the audit *layer*, not the linter.
- Code-quality SaaS comp class (SonarQube, Codacy), not AI-builder comp class.

WCAG 2.2 AA third-party conformance audit signed before launch (vendor TBD per public engagement letter). EU AI Act Art. 50 disclosure machinery live since M0.

studiozero.dev

Happy to answer technical questions in the comments.
```

---

## 5. Day-of execution timeline (UTC)

Each subreddit post runs the same pattern, scheduled per the subreddit's promo-day.

| Time relative to post | Activity                                                                                                | Owner         |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------- |
| **Pre-post -24h**     | Signal verifies the subreddit's promo-day still holds; reads any new mod announcements                  | Signal        |
| **Post + 0 min**      | Signal posts (from Studio Zero's Reddit account, NOT Jo's personal account)                             | Signal        |
| **Post + 5–60 min**   | Jo + Signal monitor for mod-removal; reply to every comment within 15 min                               | Jo + Signal   |
| **Post + 60–360 min** | Continue engagement; cross-link to other launch surfaces (HN / PH / IH) only when contextually relevant | Jo + Signal   |
| **Post + 24h**        | Day-1 metrics review with Lens; upvote-ratio assessment                                                 | Signal + Lens |

**Hard cut threshold:** **Upvote-ratio <85% at 24h post-launch → subreddit's audience does not want us.** Per channel-plan.md §2.6 risk row, this is the signal to retreat from the subreddit (do not delete; do not double-down; just let it sink).

---

## 6. KPI targets (per channel-plan.md §2.6)

| KPI                                                        | Target                                      |
| ---------------------------------------------------------- | ------------------------------------------- |
| Reddit-attributed signups (UTM: r/SaaS + r/ERA + r/webdev) | ≥80 cumulative                              |
| Upvote ratio per post                                      | ≥85% (below = subreddit cuts the post)      |
| Comment-thread engagement                                  | ≥30 substantive comments per r/SaaS + r/ERA |
| Alpha-list conversions from Reddit                         | ≥5 cumulative across 3 subreddits           |

---

## 7. FTC #ad disclosure verification — Comply's hard gate

Every Reddit post passes through this Comply CI check before submit. Failure blocks the post.

| Check                                                                        | Pass criterion                                                                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Disclosure on FIRST line of body                                             | Manual verify; Comply CI scans first ~80 chars of body for "#ad" or "Disclosure" pattern            |
| Disclosure is conspicuous (bold / bracketed / capitalized)                   | Manual verify                                                                                       |
| Disclosure language includes both "self-promotion" / "founder" AND "#ad" tag | Per FTC Endorsement Guides 16 CFR § 255.5 + 2024 amendments                                         |
| Disclosure not stripped by Reddit's auto-formatter                           | Post-publish curl scrape verifies disclosure still on first line                                    |
| Substantiation files for all comparable claims ≤90d                          | `claim-pricing-positioning.md` + `claim-defensible-wedge.md` + (if cited) `claim-head-to-head-*.md` |

---

## 8. T-7 verification (per `launch-day-rehearsal.md` row 6 + row 30)

| Check                                                                        | Pass criterion                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Per-subreddit rules read + verified at T-21                                  | Each subreddit's status committed to §1 of this file                               |
| §2 + §3 + (optionally) §4 post bodies committed in this file                 | Both bodies present + Comply-graded                                                |
| FTC #ad disclosure on first line of each post body                           | Manual + automated verify (§7)                                                     |
| Studio Zero Reddit account exists + ≥30d karma + comments on 3 prior threads | Account profile scan                                                               |
| Per-subreddit promo-day verified for T-0 week                                | Each subreddit's promo-day still holds                                             |
| Brand-voice grader green                                                     | `pnpm run brand-voice:grade -- --file marketing/channels/reddit/staging.md` exit 0 |

---

## 9. Failure-mode mitigations

| Mode                                                                | Mitigation                                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **FTC #ad disclosure missing → Comply blocks at CI + FTC exposure** | §7 verification mandatory; CI gate active per `channel-plan.md` §4               |
| **Posting on a non-promo day → mod removes + sub-bans**             | §1 + §5 pre-post -24h verification; if rules changed in last 24h, skip the post  |
| **Account too new + karma <30 → r/SaaS / r/webdev auto-removal**    | Studio Zero Reddit account warmed M3–M4 per launch-checklist row 7-T+14          |
| **Upvote-ratio <85% → audience doesn't want us**                    | §5 cut threshold; do not double-down; redirect time to channels that are working |
| **Mod removes despite rules being followed**                        | Single-DM-appeal to mod with rules-citation; if denied, accept + do not re-post  |
| **Substantiation file goes stale before T-0**                       | §7 ≤90d gate; Penny / Scout / Hook re-verify substantiation files at T-14 + T-7  |

---

_Reddit staging v1.0. Signal commits at M4 Batch 2; r/webdev posture confirms at T-21. v2 supersedes after T+30 retro with upvote-ratio data._
