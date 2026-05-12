# Hacker News — Staging (T-30 → T-0)

**Channel:** Hacker News (PRD §5 primary persona; `channel-plan.md` §2.2)
**Owner:** Signal (channel) · Jo (account holder + commenter)
**Cadence:** **Sparing.** One Show HN at M5 T-0. One follow-up post when dogfood gate flips clean (~T+30..T+60).
**Voice ceiling:** founder-voice grade 9 per `agents/growth/herald-brand-voice.md` + sample `06-social-post.md` §2
**UTM convention:** `?utm_source=hn&utm_medium=submission&utm_campaign=show-hn-launch`

---

## 1. Show HN submission — locked intro line

Per `marketing/copy/04-social-bundles.md` §2 + `brand/samples/06-social-post.md` §2.

**Title (60 char max — HN truncates):**

```
Show HN: Studio Zero – an audit layer for AI-built apps
```

**URL field:**

```
https://studiozero.dev/?utm_source=hn&utm_medium=submission&utm_campaign=show-hn-launch
```

**Submission text (optional; HN allows but does not require):**

```
[ left blank — Jo's first comment carries the context per HN convention ]
```

---

## 2. First comment — locked text (Jo authors; Herald-graded)

Posted within 60 seconds of submission per HN convention. Sample-06 §2 locked the shape; the verbatim text below ships at T-0.

```
Hey HN — Jo here, building Studio Zero.

Quick context: I've been the maker behind Studio Zero for two years. It started as an internal multi-agent system for auditing software I was shipping for clients. Seven specialist reviewers (UX, accessibility, copy clarity, brand consistency, audience fit, security patterns, design-system drift) running against a versioned rubric. The team page on the existing site has the full agent list.

Studio Zero the SaaS is what happens when you take that system, harden it, and put it behind a URL. You connect a repo or submit a URL. We run the audit independently — we don't write code, we grade what got written. Every finding ships with a file path, a line range, and one concrete fix.

The wedge: AI builders (Cursor, v0, Bolt, Lovable, Replit Agent) are good at writing code. They're not built to audit it — that's a different job. Studio Zero sits between the builder and the team about to ship. If you've ever had an AI-built app pass code review but fail a real user, this is the layer that catches it.

What's free: Surface audit on any URL (no signup; just paste the URL). What's paid: Code and Full tiers that connect to your repo + run on managed Anthropic tokens.

Three things I'd love your eyes on:

1. The rubric. /how-it-works walks through the 5 severity levels and the score math. If you spot a category you'd weight differently, tell me.

2. The verdict transparency. Every finding links to its evidence (screenshot, transcript, file diff). Tell me where the receipts feel thin.

3. The pricing. We landed at $29/mo for Managed Starter against the SonarQube / Codacy comp class, not the Cursor / v0 comp class. Honest critique welcome — Penny on the team is running an A/B at $19 for the first 200 BYOK Starter signups; we'll let the cohort data drive v2.

I'm in this thread for the next 12 hours. Replying to every top-level comment. Ask anything.
```

---

## 3. Jo's account warming — verification artifact

Per `channel-plan.md` §2.2 risk row, the HN launch is sunk if Jo's account is new + flagged on first submission. Warming runs M0 → T-14.

**Pre-launch requirements (verified at T-7 per launch-day-rehearsal.md row 10):**

| Metric                           | Target                                                                                         | Verification                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Account age                      | ≥6 months at T-0                                                                               | `news.ycombinator.com/user?id=<handle>` → `created` field |
| Karma                            | ≥10 at T-0                                                                                     | Same page → `karma` field                                 |
| Helpful comments in last 60 days | ≥4                                                                                             | `news.ycombinator.com/threads?id=<handle>`                |
| Comment-to-submission ratio      | comments-only (no prior submissions on Jo's account before the Show HN; first submission rule) | Same page                                                 |
| No flagged comments              | Zero                                                                                           | Manual scan; no `[flagged]` or `[dead]` markers           |

**Warming plan (active since M0):** Jo posts ≥1 substantive comment per week on adjacent threads (audit tooling, AI builders, accessibility, dev-tools UX). Comments are technical and helpful — no self-promotion, no Studio Zero links until T-0.

**Sample warming-comment topics Jo has covered (M0–M4 cumulative):**

- Threads about Cursor / v0 / Lovable / Bolt evaluation: Jo shares specific evaluation criteria from the audit rubric (without naming Studio Zero).
- Threads about a11y testing: Jo shares the 30/70 rule (axe-core covers ~30%, manual covers ~70%) — Halo's published opinion.
- Threads about LLM-as-judge limits: Jo shares the determinism-vs-stochasticity nuance Cortex documented.

---

## 4. Day-of execution timeline (UTC)

| Time                    | Activity                                                                | Owner                |
| ----------------------- | ----------------------------------------------------------------------- | -------------------- |
| **T-0 12:00 UTC**       | Jo submits to HN with §1 title + URL                                    | Jo                   |
| **T-0 12:00:30 UTC**    | Jo posts §2 first comment within 60s                                    | Jo                   |
| **T-0 12:05–18:00 UTC** | Jo replies to every top-level comment within 30 minutes                 | Jo                   |
| **T-0 18:00–22:00 UTC** | Signal + Herald draft reply-suggestions for Jo; Jo continues replying   | Signal + Herald + Jo |
| **T-0 22:00 UTC**       | Reply backlog assessment; Jo continues if active commentary             | Jo                   |
| **T+1 → T+2**           | Jo replies to every top-level + every second-level comment for 48 hours | Jo                   |
| **T+3 → T+7**           | Jo replies to high-signal comments only (selectively)                   | Jo                   |

**Critical:** **Do NOT post links to Studio Zero in Jo's replies that aren't already in the OP / first comment.** HN moderators down-weight comments that pattern-match to repeat-linking.

---

## 5. KPI targets (per channel-plan.md §2.2)

| KPI                                   | Target                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| HN front-page reach                   | Top 30 for ≥2 hours on launch day                                                     |
| HN-attributed signups                 | ≥150 from UTM `utm_source=hn`                                                         |
| Alpha-CTA conversions from HN signups | ≥3 paying Managed alpha within T+7 (cohort cohort; sub-cohort of overall R21(c) gate) |
| HN comment count                      | ≥30 top-level comments at T+24h                                                       |
| Upvote-to-comment ratio               | ≥3:1 (HN's healthy-thread heuristic)                                                  |

---

## 6. Failure-mode mitigations

| Mode                                                                 | Mitigation                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **HN flags Jo's account as new** (first submission rule)             | §3 warming verified at T-7 row 10                                                                                     |
| **HN flags the URL** (auto-flagged for over-promotion)               | §1 URL is the canonical landing page (no marketing redirects); UTM goes in the query string (HN strips it on display) |
| **Jo's reply latency exceeds 30 min** (HN algo de-ranks slow OP)     | §4 timeline + Signal + Herald draft-suggestions during the 18:00–22:00 UTC window                                     |
| **Comment thread devolves into pricing-flame** (D4 risk per AMA §Q2) | Jo reads from `marketing/copy/05-ama-prep.md` §Q2 verbatim; Penny on standby for live consult                         |
| **Show HN does not hit front page in first 2 hours**                 | Per channel-plan.md §6: do NOT artificially boost (HN penalizes vote-rings). Pivot to X + IH + PH-only T-0 push.      |
| **Hostile commenter accuses of vaporware**                           | Jo shares the live `/dogfood` URL with the most recent self-audit verdict — receipts > rhetoric                       |
| **Comment from Cursor / v0 / Bolt employee**                         | Jo replies respectfully, names category-not-competitor framing per `05-ama-prep.md` §Q1                               |

---

## 7. Second-submission plan (T+30..T+60 dogfood-clean milestone)

When Studio Zero's self-dogfood verdict flips from PASS WITH FIXES to PASS (M5 +N weeks), Jo submits a second post:

**Title (draft; Herald finalizes when dogfood-clean lands):**

```
Show HN: Studio Zero now passes its own audit (N weeks in)
```

This is the only Show HN we'd queue beyond the launch. All other HN engagement is comment presence on adjacent threads.

---

## 8. T-7 verification (per `launch-day-rehearsal.md` row 2)

| Check                                               | Pass criterion                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Jo's HN account age ≥6 months                       | `news.ycombinator.com/user?id=<handle>` `created` field                      |
| Karma ≥10                                           | Same page                                                                    |
| ≥4 helpful comments in last 60d                     | `threads?id=<handle>`                                                        |
| Zero flagged comments                               | Manual scan                                                                  |
| §2 first comment text reviewed by Herald + Penny    | Herald + Penny commit sign-off in this file                                  |
| Substantiation file for pricing claim verified ≤90d | `marketing/claims-substantiation/claim-pricing-positioning.md` verifier date |
| Substantiation file for wedge claim verified ≤90d   | `marketing/claims-substantiation/claim-defensible-wedge.md` verifier date    |

---

_HN staging v1.0. Signal commits at M4 Batch 2; second-submission plan §7 stays drafted until dogfood-clean milestone fires._
