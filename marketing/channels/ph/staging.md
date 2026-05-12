# Product Hunt — Staging (T-30 → T-0)

**Channel:** Product Hunt (PRD §5 personas + maker/early-adopter overlap; `channel-plan.md` §2.4)
**Owner:** Signal (channel) · Herald (copy) · Optic + Pixel (gallery + video) · Hunter (recruit at T-14)
**Cadence:** **Once.** Launch day only. PH is a one-shot mechanic; not re-launched per tier.
**Voice ceiling:** restrained, taglined per `04-social-bundles.md` §4 + Herald §6 PH row
**UTM convention:** `?utm_source=ph&utm_medium=listing&utm_campaign=launch-day`

---

## 1. Listing copy — locked

### 1.1 Product name

```
Studio Zero
```

### 1.2 Tagline (60 char max — PH truncates anything longer)

```
The audit layer for AI-built apps. Receipts, not opinions.
```

(58 characters; safely under 60.)

### 1.3 Description (260 chars max — PH listing card)

```
Connect a repo or paste a URL. Seven specialist reviewers grade what AI built — UX, accessibility, copy, brand, audience fit, security patterns, design-system drift. Every finding ships with a file path and one concrete fix. Free Surface audit forever.
```

(252 characters.)

### 1.4 Topic tags

- Developer Tools (primary)
- Web App
- Accessibility
- SaaS
- Productivity
- AI

### 1.5 Pricing tag (PH dropdown)

- "Freemium" (free Surface; paid Managed Code + Full)

---

## 2. Gallery — visual specification

Five gallery items at PH-recommended dimensions (1270×760 px for static; 1270×760 px max @ 30s for video). Optic + Pixel produce; Herald copy-grades captions.

| #   | Asset                            | Caption (≤200 chars)                                                                                | Asset path                                   |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | **Hero — verdict screen**        | "PASS WITH FIXES · 81/100. Seven specialist reviewers, one verdict. Every finding has a file path." | `brand/launch-assets/ph/01-hero-verdict.png` |
| 2   | **Findings panel**               | "Halo flagged 2 a11y. Proof flagged 3 copy. Optic flagged 1 UX. Receipts on every line."            | `brand/launch-assets/ph/02-findings.png`     |
| 3   | **Rubric strip**                 | "5 severity levels. Each weighted. No LLM in the score math. Versioned per release."                | `brand/launch-assets/ph/03-rubric.png`       |
| 4   | **Head-to-head dogfood**         | "Studio Zero, audited by Studio Zero. PASS WITH FIXES · 84/100."                                    | `brand/launch-assets/ph/04-dogfood.png`      |
| 5   | **30-second video walk-through** | (video; no caption — speaks for itself; URL → verdict → findings drill-down → fix)                  | `brand/launch-assets/ph/05-walkthrough.mp4`  |

**Optic + Halo a11y gate on every gallery asset:**

- Alt-text on each image at `<= 200 chars` (PH provides the field)
- Color-contrast ≥ 4.5:1 against the dark background for any text overlays
- Video has captions burned in for the few labels visible (since PH does not host SRT files)
- Loading time at PH-edge: each image <500KB; video ≤25MB

---

## 3. First comment from Jo (locked text)

Posted by Jo (NOT the hunter) within 60 seconds of the listing going live at 08:01 UTC.

```
Hi Product Hunt — Jo here, maker of Studio Zero.

Quick context: I've been running Studio Zero as an internal multi-agent system for two years (auditing software I ship for clients). Today is the day it ships as a SaaS.

The wedge: AI builders (Cursor, v0, Bolt, Lovable, Replit Agent) write code. They aren't built to audit it — that's a different job. Studio Zero sits between the builder and the team about to ship. Seven specialist reviewers (UX, accessibility, copy clarity, brand consistency, audience fit, security patterns, design-system drift) running on every audit. Every finding has a file path, a line range, and one concrete fix.

What's free: Surface audit on any URL — no signup, just paste the URL. What's paid: Code and Full tiers that connect to your repo + run on managed Anthropic tokens.

I'll be in the comments all day. Three questions I'd love your take on:

1. The rubric. /how-it-works walks through the 5 severity levels and the score math. If you'd weight a category differently, tell me.
2. The free Surface audit experience. Try it on any of your live URLs. Where does the receipt feel thin?
3. The pricing. We landed at the SonarQube / Codacy comp class. Penny on our team is running an A/B at $19 for the first 200 BYOK Starter signups — we'll let the data drive v2.

Huge thanks to the hunter who brought this here, the alpha-testers who shaped what shipped, and to PH for the launch surface itself. Asking anything — I'll reply within 30 minutes through the next 18 hours.

studiozero.dev
```

---

## 4. Hunter — recruited at T-14, briefed by Signal

**Status:** Hunter confirmed at T-14 per `launch-checklist.md` T-14 row 1. (HUMAN: Signal recruits from existing dev network.)

**Hunter brief (Signal delivers at T-14):**

- Publish time: **00:01 PT (08:01 UTC) on T-0.** PH algorithm strongly rewards midnight Pacific publishes.
- Listing already drafted by maker (Signal); hunter reviews and submits.
- Hunter's hunter-comment is optional but encouraged — Herald drafts a 2–3 line template at `marketing/copy/launch-week/ph-hunter-comment.md` if the hunter wants a starting point.
- Hunter does NOT need to reply to comments — Jo handles that. Hunter just needs to publish on time.
- Hunter receives: free Managed Pro lifetime + public credit in hall of fame + thanks in launch tweet.

**Backup hunter (if primary cancels):** Signal has 2 backups identified at T-14. Brief them in parallel.

---

## 5. Day-of execution timeline (UTC)

| Time                    | Activity                                                                                        | Owner                |
| ----------------------- | ----------------------------------------------------------------------------------------------- | -------------------- |
| **T-0 08:01 UTC**       | **Hunter publishes** the PH listing                                                             | Hunter               |
| **T-0 08:02 UTC**       | Jo posts §3 first comment within 60s                                                            | Jo                   |
| **T-0 08:05–12:00 UTC** | Jo replies to every comment within 30 minutes (overlapping HN + X launches at 12:00 UTC)        | Jo                   |
| **T-0 12:00–18:00 UTC** | Jo continues PH replies in parallel with HN + X + IH replies; Signal + Herald draft suggestions | Jo + Signal + Herald |
| **T-0 18:00–22:00 UTC** | PH listing should be in top 10 of the day by this window; engagement push                       | Jo + Signal          |
| **T-0 23:00 UTC**       | Day-1 metrics review with Lens                                                                  | Signal + Lens        |
| **T+1 → T+2**           | Jo replies to every PH comment for 48 hours total                                               | Jo                   |

**PH algorithm note:** the first 4 hours after 00:01 PT determine the day's top-5 ranking. If Studio Zero is not in the top 10 at 12:00 PT (20:00 UTC), recovery to top-5 is unlikely. **Jo's reply latency in the first 4 hours is the most leveraged variable in the entire launch.**

---

## 6. KPI targets (per channel-plan.md §2.4)

| KPI                                       | Target                                          |
| ----------------------------------------- | ----------------------------------------------- |
| Day-1 upvotes                             | Top 5 for the day → ≥200 upvotes                |
| PH-attributed signups                     | ≥150 from UTM `utm_source=ph`                   |
| PH-attributed alpha conversations         | ≥10 DMs / emails about Managed tier in 7 days   |
| Comment count                             | ≥40 top-level comments at T+24h                 |
| Maker (Jo) reply latency                  | ≤30 minutes for every comment in first 18 hours |
| Listing in top 10 at 12:00 PT (20:00 UTC) | YES (hard threshold; below → "PH didn't catch") |

---

## 7. T-7 verification (per `launch-day-rehearsal.md` row 4 + row 9)

| Check                                                             | Pass criterion                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Hunter confirmed in writing for 00:01 PT T-0 publish              | Email thread in `marketing/press-tracker.md` row PH-1                          |
| Listing draft fully populated in PH (Studio Zero's maker account) | Open PH draft URL → preview renders                                            |
| Tagline ≤60 chars                                                 | Manual count (verify: 58 chars in §1.2)                                        |
| Description ≤260 chars                                            | Manual count (verify: 252 chars in §1.3)                                       |
| All 5 gallery items render in PH preview                          | Each `brand/launch-assets/ph/0X-*` asset uploads ≤500KB                        |
| 30s video plays in PH preview                                     | Video at PH ≤25MB; codec H.264                                                 |
| First comment text (§3) reviewed by Herald + Penny                | Herald + Penny commit sign-off in this file                                    |
| Hunter brief delivered                                            | Slack DM thread to hunter; brief content matches §4                            |
| Gallery image cold-cache load ≤2s on global CDN                   | WebPageTest or Lighthouse run at T-7; results in `marketing/press-tracker.md`  |
| Brand-voice grader green                                          | `pnpm run brand-voice:grade -- --file marketing/channels/ph/staging.md` exit 0 |

---

## 8. Failure-mode mitigations

| Mode                                                                           | Mitigation                                                                                                                                          |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hunter publishes off-schedule**                                              | §4 backup hunters; Signal owns the relationship; written confirmation at T-14 + T-7                                                                 |
| **Gallery loads slow** (Prism / Optic gate triggered)                          | §2 each image <500KB; T-7 row verifies cold-cache <2s                                                                                               |
| **Maker (Jo) reply latency >30 min**                                           | §5 Jo blocks calendar 08:00–22:00 UTC on T-0 exclusively for PH + HN + X + IH replies                                                               |
| **Launching on a Monday or weekend** (kills day-1 reach per channel-plan §2.4) | **Target: Tuesday or Wednesday launch.** Sprint locks the date at M4 close; if M4 slips → T-0 also slides; PH never launches on Monday or weekend   |
| **PH algorithm de-ranks for low engagement**                                   | §3 first comment ends with 3 questions inviting engagement; §5 Jo reply latency commitment is the single most leveraged variable                    |
| **Tagline rejected by PH mods** (over-promotion language)                      | §1.2 tagline is descriptive ("audit layer for AI-built apps") not superlative ("the best audit tool") — pre-cleared with PH's submission guidelines |

---

_PH staging v1.0. Signal commits at M4 Batch 2; hunter confirmation captures at T-14 row 9 of launch-checklist._
