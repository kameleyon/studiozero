# Studio Zero — Channel Plan

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Signal (Growth — Channel strategy + launch coordination)
**Composed against:** PRD §5 (personas), §15 (success metrics), §15.5 (GTM channels table), §3a (competitive landscape), §19 R21; `sprint/owner-matrix.md` R21(c); `agents/growth/herald-brand-voice.md`; `finance/pricing.md` (Penny price-reveal sequencing); `brand/samples/06-social-post.md` (Herald's locked copy).
**Phase:** 8 of `BUILD_FLOW.md`.
**Status:** Locked. Composed by Lens (`channel-by-channel UTM + dashboard`), Hook (`experiments registry`), Herald (`per-channel copy`), Comply (`FTC #ad + substantiation gating`).

> This document is the contract. Every external channel post traces back to a row in §2. Every R21(c) escalation traces back to §6. Every UTM string follows §5. If a channel is added, this file changes first.

---

## 1. Channel selection thesis

B2B dev tools convert on X / HN / IndieHackers / Discord / Reddit, not Google Search. SEO ramps slowly; social + community is the ignition path. Channel selection = persona-fit × cost-of-channel × build-in-public proof. **We do not pay for ads at MVP** — R21 cash crunch (Day-0 $6.9k cushion; ~$3k untouchable reserve per Meter; pentest installments + WCAG net-30 already eat the rest) makes paid placement out-of-budget. We do not chase volume on every channel — we pick 6 channels, execute consistently, and cut underperformers on a 4-week cohort. The single load-bearing metric is **R21(c): ≥5 Managed-tier paying alpha at M2 close (week 9)**. Every channel decision in §2 traces back to whether it feeds that alpha pipeline (§3).

---

## 2. Per-channel plan

### 2.1 X / Twitter — build-in-public flagship

| Field | Value |
|---|---|
| **Channel** | X / Twitter |
| **Why this channel** | PRD §5 primary persona (technical solo founder) lives here. Cursor, v0, Bolt, Lovable, Devin all do their early-stage marketing on X. Receipt-shaped posts (screenshot + verdict + score) are the highest-signal asset format this audience reacts to. |
| **Voice owner** | Herald (per `herald-brand-voice.md` §6 social row + sample `06-social-post.md` §1) |
| **Channel owner** | Signal |
| **Cadence** | **3 posts/week** sustained per PRD §15.5: Tue + Thu + Sat, ~16:00 UTC (peaks for US/EU dev-Twitter). Pre-launch M0–M4: 2 posts/week minimum (build-in-public verdicts + dogfood receipts). |
| **Asset type** | Single tweet with image (verdict screenshot + findings table) — **no threads** unless Herald explicitly drafts one. "Receipts in the post, not a 'thread incoming'" per `06-social-post.md` §1. |
| **KPI** | Followers (target 2,000 by M2 close); engaged-impressions per post (target ≥3% engagement rate); alpha-CTA click-throughs (UTM tracked to `utm_source=x`). |
| **Cost** | $0 organic + ~$15/mo Typefully or Buffer Free (one of: Buffer Free / Typefully Free tier covers our cadence). |
| **M0–M4 pre-launch role** | Build-in-public verdict screenshots (Studio Zero on its own repo). Devin / Cursor / v0 / Bolt / Lovable head-to-head receipts where substantiation file exists (per Herald §8 and `claim-defensible-wedge.md`). Soft CTA to "join alpha" lands on a route Vega ships at M0. |
| **M5 launch role** | Launch thread (~6 tweets, by exception — Herald drafts; sample-06 style "single tweet beats a thread" rule waived once for launch). Pinned tweet pointing to `studiozero.dev`. |
| **M5+ sustained role** | 3 posts/week — verdict-of-the-week + competitor-receipt + a single new finding/changelog. |
| **Risk: what makes this channel fail** | Posting threads instead of single-tweet receipts dilutes the receipt brand. Posting opinion (instead of verdict + evidence) reverts us to generic dev-Twitter noise. Substantiation file missing for any competitor-name reference → Comply rejects in CI; the post does not ship. |

### 2.2 Hacker News

| Field | Value |
|---|---|
| **Channel** | Hacker News |
| **Why this channel** | PRD §5 primary persona reads HN daily. Highest-quality alpha-candidate traffic per click. Audit-tool comp class (SonarQube, Codacy, Snyk) all had inflection points from HN. |
| **Voice owner** | Herald (per sample `06-social-post.md` §2 — submitter posts first comment, voice notes locked) |
| **Channel owner** | Signal |
| **Cadence** | **Sparing.** One Show HN at M5 launch. One follow-up post when dogfood gate flips to a clean PASS (likely M5 + 4–8 weeks). Sustained = comment presence on adjacent threads (audit tooling, AI builders, accessibility), not submissions. |
| **Asset type** | Show HN submission + Jo-authored first comment (locked text in `06-social-post.md` §2). |
| **KPI** | HN front-page reach (target: top 30 for ≥2 hours on launch day); HN-attributed signups (UTM `utm_source=hn`); alpha-CTA conversions from HN-attributed signups. |
| **Cost** | $0 (organic only). |
| **M0–M4 pre-launch role** | **HN account warming** — Jo's account posts helpful comments on adjacent threads (avg ≥1/week from M0 to T-14). Per `launch-checklist.md` T-14: HN account warmed up so launch-day account is not flagged. |
| **M5 launch role** | Show HN goes live 12:00 UTC on T-0. First comment posted within 60 seconds of submission. Jo replies to every top-level comment for 12 hours. |
| **M5+ sustained role** | Comment presence on adjacent threads. Submission #2 = "PASS WITH FIXES on our own codebase" milestone post when dogfood gate flips clean. |
| **Risk: what makes this channel fail** | New account, no comment history, first submission is the Show HN = flagged + sunk. Self-shilling in adjacent threads = banned + flagged. Schema link breaks on launch day = HN moves on by lunchtime. |

### 2.3 IndieHackers

| Field | Value |
|---|---|
| **Channel** | IndieHackers |
| **Why this channel** | PRD §5 primary persona + indie-agency / freelancer persona both live here. Milestone-post format matches our receipts-first voice better than any other long-form channel. |
| **Voice owner** | Herald (per sample `06-social-post.md` §3) |
| **Channel owner** | Signal |
| **Cadence** | **Monthly during M0–M5** (week 4, week 8, week 12, week 16). Quarterly thereafter. Title format: number-anchored (per sample `06-social-post.md` §3). |
| **Asset type** | Milestone post: receipts + one honest open question (the engagement engine). |
| **KPI** | IH followers/subscribers (target 500 by M2 close); IH-attributed alpha-list signups; comment-thread engagement (replies + DMs counted by Lens). |
| **Cost** | $0 (organic only). |
| **M0–M4 pre-launch role** | Month-by-month milestone posts: M0 (intake + score engine receipts), M1 (first dogfood verdict), M2 (Managed billing live), M4 (lifecycle emails wired). Each post lands an alpha CTA. |
| **M5 launch role** | Launch post (the "we're live" milestone) + Jo replies in-thread for 48 hours. |
| **M5+ sustained role** | Quarterly milestone post + ad-hoc when the dogfood gate flips a milestone state. |
| **Risk: what makes this channel fail** | Posts read as humble-brag → IH community penalizes. Posts skip the "one honest open question" → no discussion engine, post sinks. Posts include pricing in the body (Penny price-reveal §4 violation) → kills the alpha funnel. |

### 2.4 Product Hunt

| Field | Value |
|---|---|
| **Channel** | Product Hunt |
| **Why this channel** | Launch-day reach burst into a maker / early-adopter audience that overlaps PRD §5 personas. Single-day mechanic only; not a sustained channel. |
| **Voice owner** | Herald (PH listing copy; tagline; gallery captions) |
| **Channel owner** | Signal |
| **Cadence** | **Once.** Launch day only. |
| **Asset type** | PH listing (tagline, gallery, first comment from maker, gallery video ≤30s). |
| **KPI** | Day-1 upvotes (target: top 5 for the day → 200+ upvotes); PH-attributed signups; PH-attributed alpha conversations. |
| **Cost** | $0 (organic only; hunter recruited from existing dev network at T-14). |
| **M0–M4 pre-launch role** | **Hunter pre-recruitment locked at M0 close.** Per `launch-checklist.md` T-14: hunter confirmed + briefed; gallery assets approved by Optic + Herald. |
| **M5 launch role** | Hunter publishes at 00:01 PT (08:01 UTC). Jo + Signal + Herald reply to every comment for 18 hours. |
| **M5+ sustained role** | None. PH is a one-shot mechanic; we do not re-launch each tier. |
| **Risk: what makes this channel fail** | Hunter publishes off-schedule. Gallery loads slow (Prism gate). Maker doesn't reply in-thread → PH algorithm de-ranks. Launching on a Monday or a weekend → both kill day-1 reach. **Target: Tuesday or Wednesday launch.** |

### 2.5 Discord (founder + AI-builder user communities)

| Field | Value |
|---|---|
| **Channel** | Discord — founder communities + AI-builder user communities (Cursor, Bolt, Lovable, v0, Replit Agent user Discords; IndieHackers Discord; SaaS-focused communities like Founders Cafe, MegaMaker). |
| **Why this channel** | The exact rooms where PRD §5 primary persona is *already* talking about their AI-built codebase. Authentic presence converts. Shilling burns the bridge permanently. |
| **Voice owner** | Herald (one-liner introduction + reply templates) |
| **Channel owner** | Signal — Signal personally maintains presence; **does not delegate to a bot** at MVP. |
| **Cadence** | Daily presence (light) in 3 communities; weekly substantive contribution (answer a question, share a dogfood receipt when relevant). |
| **Asset type** | Replies + DMs. Posts only when invited or when a clearly-on-topic question lands. Shares verdict screenshots only on direct ask. |
| **KPI** | Number of community members who DM Signal/Jo asking about Studio Zero (target ≥15 by M2 close); alpha-list signups attributed to Discord (UTM `utm_source=discord`). |
| **Cost** | $0 (time only). |
| **M0–M4 pre-launch role** | **Authentic presence, no shilling.** Help when asked. Share dogfood receipts when on-topic. Pre-launch role is *trust accumulation*, not lead-gen. |
| **M5 launch role** | **AMAs in 3 communities** (per PRD §15.5). Communities confirmed at T-14; AMA dates booked at T-7. Same week as launch, not launch day. |
| **M5+ sustained role** | Sustained presence in same 3 communities. Add communities as bandwidth allows (cap at 5). |
| **Risk: what makes this channel fail** | Signal posts a marketing link in a "help" channel → ban + reputational damage. AMA scheduled before hunter confirmation → unforced error. Bot-driven presence detected by mods → ban. |

### 2.6 Reddit (r/SaaS, r/EntrepreneurRideAlong, r/webdev)

| Field | Value |
|---|---|
| **Channel** | Reddit — r/SaaS, r/EntrepreneurRideAlong, r/webdev (PRD §15.5). r/programming + r/Entrepreneur are listening-only (mod-strict). |
| **Why this channel** | Adjacent persona pool. Higher reach than Discord; lower trust per impression. Strict per-subreddit rules. |
| **Voice owner** | Herald (post bodies) + Comply (FTC #ad disclosure rider per PRD §15.5) |
| **Channel owner** | Signal |
| **Cadence** | **Listening-only pre-launch.** Per-subreddit launch announce at M5 if the subreddit's self-promotion rules permit. Sustained = comment presence + monthly "milestone update" where rules permit. |
| **Asset type** | Per-subreddit launch announce post (text + verdict screenshot). **Must carry FTC #ad disclosure** (PRD §15.5 + Comply substantiation gate). Comment replies in-thread. |
| **KPI** | Reddit-attributed signups (UTM `utm_source=reddit&utm_campaign=<subreddit>`); upvote ratio (target ≥85% — anything below means subreddit doesn't want us); alpha-list conversions. |
| **Cost** | $0 (organic only). |
| **M0–M4 pre-launch role** | **Listening only.** Signal observes subreddit norms (self-promo days, megathreads, mod rules). Comments helpfully on adjacent threads without linking. |
| **M5 launch role** | One announce post per subreddit, scheduled per that subreddit's promo-day rules. FTC #ad disclosure in the first line of body copy. |
| **M5+ sustained role** | Monthly milestone update where the subreddit's "show off your project" thread accepts it. Otherwise comments-only. |
| **Risk: what makes this channel fail** | FTC #ad disclosure missing → Comply blocks at CI + FTC exposure. Posting on a non-promo day → mod removes + sub-bans. Per-subreddit norms not honored (e.g., r/SaaS requires monthly self-promo thread participation before standalone posts allowed) → instant remove. |

### 2.7 SEO content (Lens-owned)

| Field | Value |
|---|---|
| **Channel** | SEO content cluster — 12 blog posts by M5 (PRD §15.5). Topic anchors: "How to audit your AI-generated app," "WCAG 2.2 AA audit checklist," "AI code-quality rubric," "Severity weighting in code audits," "Auto-PR vs spec-fix delivery," per-competitor comparison posts where substantiation files exist. |
| **Why this channel** | Long-tail discovery for buyers searching after they've already had a quality incident with their AI-built app. SEO ramps slowly — won't carry M0–M2 alpha funnel; will compound from M5+. |
| **Voice owner** | Herald (copy) + Comply (substantiation per FTC AI-claim rule) |
| **Channel owner** | Lens (SEO architecture, keyword strategy, Search Console, sitemap.xml, JSON-LD); Signal coordinates topic queue against R21(c) funnel. |
| **Cadence** | M0–M5: 1 post/week minimum (12 posts shipped by M5). M5+: 2 posts/month sustained per PRD §15.5. |
| **Asset type** | Long-form posts (1,500–3,000 words, grade-10 ceiling per Herald §4). JSON-LD `Article` schema; OG image generated per post; canonical URL; sitemap entry. |
| **KPI** | Indexed pages in Google Search Console; organic clicks per post (rolling 30d); SEO-attributed signups (UTM `utm_source=organic&utm_medium=seo`); time-to-first-rank-page-1 per post. |
| **Cost** | $0 (Herald + Lens authorship). Optional ~$99/mo Ahrefs Starter or SEMrush Pro if SEO becomes the primary lever post-M5 — **deferred decision** until M5 + 30d data informs. |
| **M0–M4 pre-launch role** | Topic queue authored; first 4 posts indexed before T-30 (so they're already showing in SERP when launch drives branded-search traffic). |
| **M5 launch role** | "Why we built Studio Zero" anchor post lives on launch day at the top of the cluster (UTM-tagged from X / HN / IH / PH / Reddit launch posts). |
| **M5+ sustained role** | 2 posts/month per PRD §15.5. Quarterly review by Lens + Signal: which posts pulled organic traffic; double down on winning topics. |
| **Risk: what makes this channel fail** | Generic-AI-aesthetic content reads as low-effort → Google's Helpful Content system de-ranks. Substantiation files missing for competitor-comparison posts → Comply blocks at CI. No internal links between posts → cluster doesn't compound. **Organic SEO will not save R21(c)** — too slow to compound by M2 close. SEO is the M5+ engine, not the alpha pipeline. |

### 2.8 Partner integrations (Cursor / Bolt / Lovable / v0 user communities)

| Field | Value |
|---|---|
| **Channel** | Partner-adjacent user communities — Cursor Discord, Bolt forums, Lovable community, v0 templates community, Replit Agent community. |
| **Why this channel** | These are the exact tools that produce the codebases Studio Zero audits. The user is already shipping AI-built code; the audit is the natural next-step purchase. |
| **Voice owner** | Herald (one-liner messaging when invited) |
| **Channel owner** | Signal |
| **Cadence** | Authentic presence — same playbook as Discord §2.5 but in partner-adjacent spaces. |
| **Asset type** | Replies + when invited, share dogfood verdicts on apps built with that tool. Co-marketing post only if a partner signs. |
| **KPI** | Partner-conversation count (DMs + email threads with partner founders/PMs by M2 close, target ≥3); partner-attributed signups (UTM `utm_source=partner&utm_campaign=<partner-name>`). |
| **Cost** | $0 (time only). |
| **M0–M4 pre-launch role** | Signal initiates 1:1 conversations with one founder/PM at each named partner (3–5 conversations total) — *not* a partnership pitch; a "we audit AI-built code, here's a dogfood verdict on one of your sample apps, would your users find this useful?" intro. |
| **M5 launch role** | Co-marketing post if any partner signs. If none sign by T-14, the partner channel is pre-launch nurture only. |
| **M5+ sustained role** | If any partner signs at M5, sustained channel = co-marketing cadence per partner deal. If none sign, downgrade to "occasional dogfood share when relevant." |
| **Risk: what makes this channel fail** | Partner reads us as competitive (we audit their output → could be perceived as criticism) → partnership dies before it starts. Mitigation: lead with "Studio Zero finds what *every* AI builder ships," not "Studio Zero finds what *Cursor* ships." Voice carries the neutrality (Herald §3 pillar 1). |

---

## 3. R21(c) alpha-recruitment funnel

The single load-bearing question: **how does build-in-public engagement convert to ≥5 paying Managed-tier alpha by M2 close (week 9)?**

### 3.1 Funnel math (Signal's commitment)

| Stage | Window | Target | Conversion to next | Cadence + Asset | Owner | KPI tracking |
|---|---|---|---|---|---|---|
| **S1 — Build-in-public reach** | M0–M1 (weeks 0–6) | 2,000 X followers + 500 IH subscribers + ≥1 HN front-page hit + 15 Discord conversations | ~5% to S2 | X 3/wk + IH 1/mo + Discord daily + 4 SEO posts indexed | Signal + Herald | Lens dashboard: followers, IH subscribers, HN points, Discord conversation count |
| **S2 — Alpha-list signups** | M1–M2 (weeks 6–9) | 50–100 alpha-list signups from S1 reach | ~5–10% to S3 | "Join alpha" CTA on X/IH/Discord + alpha-list landing route (Vega ships M0); E-pre-alpha email sequence (Herald drafts at M1) | Signal + Vega + Herald | Lens dashboard: alpha-list signups per channel (UTM-attributed); E-pre-alpha open + click rates |
| **S3 — Paying Managed alpha** | M2 close (week 9) | **≥5 paying Managed-tier** | n/a (gate) | 1:1 onboarding by Jo for every alpha-list signup; Penny price-reveal honored (free Surface in cold acquisition; Managed price only after they've felt the loop close) | Jo + Signal + Penny | Stripe — count of `subscriptions.status = 'active'` on Managed Starter or Managed Pro |

**Math sanity check:**
- S1 → S2 conversion at 5% of (2,000 X + 500 IH + Discord/HN halo) ≈ ~125–150 alpha-list signups → comfortably above the 50–100 target band.
- S2 → S3 conversion at 5% of 50 = 2.5 paying. At 10% of 100 = 10 paying. **Target band 5–10; R21(c) gate is 5.**
- **If S1 reach <50% of target by M1 close, §6 escalation triggers fire.**

### 3.2 Penny price-reveal sequencing honored at every funnel stage

Per `finance/pricing.md` §2.1 + Herald §3 pillar 1 (confident, not punitive):
- **S1 messaging:** lead with *"Run a free Surface audit →"* — the wedge, the proof, the receipts. **Never lead with $249.** Managed-tier price is not in cold-acquisition copy.
- **S2 messaging (alpha-list E-pre-alpha):** lead with *"You'll get the Managed-tier alpha before public launch — at founder pricing."* Founder-pricing details revealed in the 1:1 onboarding call, not in the email body.
- **S3 messaging (1:1 onboarding):** the price-reveal moment. Jo runs the conversation; Penny supplies the framing per `pricing.md` §2.4 / §2.5 (Managed-tier buyer-persona JTBD locked).

This is why §2 channel CTAs never mention $249 or $99 — the cold-acquisition CTA is *"free Surface audit"* across every channel. The Managed-tier price-reveal is a 1:1 founder moment, not a marketing-page bullet.

---

## 4. Brand voice + Comply gates

Every external-facing post must clear four CI checks before it ships. Proof rejects the build on any failure (Herald §11 — "Brand voice rots one ungraded string at a time").

| Gate | Owner | Rule | What blocks the post |
|---|---|---|---|
| **Brand voice** | Herald (CI grader: Proof) | Every post passes `herald-brand-voice.md` §5 banned-words rule + §4 reading-level target per surface | Any banned word; reading level above ceiling for the channel |
| **Substantiation** | Comply | Every comparative or capability claim has substantiation file at `marketing/claims-substantiation/<claim-id>.md` per Comply + FTC AI-claim substantiation rule (PRD §14.5) | Missing file; claim-quote mismatch; verifier date >90d old |
| **FTC #ad disclosure** | Comply | Reddit posts (every post — paid or not) + any partner co-marketing post carries FTC #ad disclosure on first line of body | Disclosure missing; disclosure not on first line; disclosure stripped by channel formatting |
| **Compliance footer** | Comply + Forge + Vega | Marketing site footer carries: (a) cookie banner (PRD §6.1; granular consent — necessary/analytics/marketing); (b) CCPA "Do Not Sell or Share My Personal Information" link (PRD §17 #20 + `refund-matrix.md` §5); (c) link to `/dmca` (M5 gate) | Any of (a)/(b)/(c) missing in production |

**Substantiation files required before M5 launch** (per `finance/pricing.md` §7 + Herald §8):
1. `marketing/claims-substantiation/claim-pricing-positioning.md` — Penny + Scout. Every §3a comparable + every §2 competitor price reference.
2. `marketing/claims-substantiation/claim-defensible-wedge.md` — Scout. "No competitor ships Auto-PR for UX + a11y + copy + brand + audience-fit findings" claim.
3. `marketing/claims-substantiation/claim-code-vs-surface-findings.md` — Hook. E2 lifecycle email upsell hook + Surface → Code social-post claims.

All three reserved in `pricing.md` §7. Authoring deadlines: claim-pricing-positioning by M4 close (so SEO posts can cite); claim-defensible-wedge by M5 launch day (HN comment needs it); claim-code-vs-surface-findings by M1 (E2 email ships).

---

## 5. Channel ROI tracking

### 5.1 UTM convention

Every link Signal posts carries UTM parameters. Lens captures every signup with attribution; PostHog Experiments tracks per-cohort conversion (Hook owns the experiment registry; Lens owns the attribution dashboard).

```
?utm_source=<channel>
&utm_medium=<post-type>
&utm_campaign=<campaign-slug>
&utm_content=<post-id>          [optional, post-level disambiguation]
```

| Channel | `utm_source` | `utm_medium` examples | `utm_campaign` examples |
|---|---|---|---|
| X / Twitter | `x` | `tweet`, `pinned-tweet`, `bio` | `build-in-public`, `launch`, `dogfood-receipt` |
| Hacker News | `hn` | `submission`, `comment` | `show-hn-launch`, `dogfood-pass` |
| IndieHackers | `ih` | `milestone-post`, `comment` | `m0-milestone`, `m2-milestone`, `launch` |
| Product Hunt | `ph` | `listing`, `comment` | `launch-day` |
| Discord | `discord` | `dm`, `community-post` | `<community-slug>` (e.g., `cursor-community`) |
| Reddit | `reddit` | `submission`, `comment` | `<subreddit>` (e.g., `r-saas`, `r-webdev`) |
| SEO (organic) | `organic` | `seo` | `<post-slug>` |
| Partner | `partner` | `co-marketing`, `embed`, `dm` | `<partner-name>` |
| Lifecycle email | `email` | `e1`, `e2`, `e3`, `e4`, `e5` | `<email-slug>` |

### 5.2 Lens-owned dashboard

Lens ships a channel-by-channel dashboard by M1 close (so M1–M2 funnel data is captured for R21(c)). Columns per channel:

- Followers / subscribers / community count (trended weekly).
- Click-throughs per post (rolling 7d + 30d).
- UTM-attributed signups (count + conversion to alpha-list).
- Alpha-list → paying conversion (count + rate).
- CAC (time-equivalent cost ÷ paying customers — even at $0 paid budget, Signal's hours are a cost; Meter assigns hour-rate).
- 4-week cohort verdict: **continue / double-down / cut**.

### 5.3 Cut-or-double-down decision rule

At week 6 (M1 close) and week 10 (M2 close), Signal + Lens review each channel against:
- Did it produce ≥1 alpha-list signup per 100 followers/subscribers?
- Did alpha-list-to-paying conversion match the funnel target (≥5%)?
- Is the time cost (Signal hours/week) ≤ the channel's contribution to S2 + S3?

A channel that fails 2 of 3 cohort questions for two consecutive cohorts is **cut** — Signal's time redirects to a channel that's working. No sentimentality. No "but we're building presence." Receipts only.

---

## 6. R21(c) escalation triggers

R21(c) is the load-bearing gate. If we miss it, Jo bridges $15–25k or M0–M5 re-baselines by +4 weeks (`sprint/owner-matrix.md` R21 row).

| Trigger | When | Escalation action | Owner |
|---|---|---|---|
| **S1 reach <50% of target at M1 close** (i.e., <1,000 X followers + <250 IH subscribers + 0 HN front-page hits + <8 Discord conversations) | Week 6 | (a) Extra owned-channel cadence: X moves to 5/wk; IH moves to weekly; Signal adds 4th Discord community. (b) Paid placement consideration — **cost gates this hard**: any paid placement requires Meter sign-off against the $3k untouchable reserve floor; default is no spend. (c) Signal escalates to BigBrain + Penny for re-baselining discussion. | Signal + BigBrain + Penny |
| **S2 alpha-list <50% of target at M1.5 (week 7.5)** | Week 7.5 | (a) **1:1 outreach by Jo to existing dev-network** — DM 20 dev-Twitter accounts Jo already has rapport with; offer free Managed alpha access for 90 days in exchange for use + feedback. (b) Tighten alpha-list CTA copy (Hook A/B test slot). (c) Re-target SEO topic queue at higher-intent long-tail queries (Lens). | Jo + Signal + Hook + Lens |
| **S3 paying alpha <5 at M2 close (week 9)** | Week 9 (M2 exit gate) | **R21 trigger fires** per `sprint/owner-matrix.md`: Jo bridges $15–25k OR M0–M5 re-baselines by +4 weeks. Signal authors postmortem: which channel failed, why, what reallocation in M3 reach reverses it. | Jo + BigBrain + Penny + Signal |

**Pre-emptive mitigation Signal commits to before any trigger fires:**
- Weekly dashboard review with Lens (every Friday from M0 onward; trended deltas reported to BigBrain).
- M0.5 (week 1) checkpoint: are the first 2 X posts hitting baseline engagement? If not, Herald rewrites the voice template before week 2.
- M1 (week 6) dry-run: simulate the S1 → S2 conversion against actual reach data; if math doesn't pencil, raise escalation early.

---

## 7. Signal exit-gate self-verdict

| Gate | Status | Evidence |
|---|---|---|
| **≥4 channels active before launch** | PASS — 6 channels active by M4 (X, HN warmed account, IH, Discord, Reddit listening, SEO 4 posts indexed) | §2 cadence schedule; `launch-checklist.md` T-30 + T-14 gates |
| **R21(c) alpha pipeline mapped end-to-end** | PASS — S1 → S2 → S3 funnel math + per-stage cadence + per-stage owner + Lens dashboard + escalation triggers | §3.1 funnel + §3.2 price-reveal + §6 triggers |
| **Every channel has KPI + owner** | PASS — §2 per-channel rows lock owner + KPI + cadence; §5.1 locks UTM convention; §5.2 locks dashboard ownership (Lens) | §2 + §5 |
| **Penny price-reveal sequencing honored** | PASS — every channel CTA in §2 leads with *"free Surface audit"* in cold acquisition; Managed-tier price-reveal is 1:1 founder moment per `pricing.md` §2.4 / §2.5 | §3.2 + §2 row-by-row CTAs |
| **Hard cash constraint honored (≤$0 paid budget at MVP)** | PASS — every §2 row marks $0 organic; one optional tooling line item (~$15/mo Buffer / Typefully) sits inside operating budget; paid placement consideration (§6 trigger) is hard-gated by Meter against the $3k untouchable reserve | §2 cost column + §6 first-trigger note |
| **Brand voice + Comply gates locked** | PASS — §4 gates Herald + Comply + Proof + FTC #ad + cookie + CCPA + DMCA footer; substantiation files reserved + deadlined | §4 + cross-ref to `pricing.md` §7 + `herald-brand-voice.md` §8 |

**Signal's verdict on Phase 8 channel-plan exit gate: PASS.**

---

*Channel plan v1.0. Signal revisits at M2 close (week 9) with first cohort data + R21(c) gate verdict. v2 supersedes; never deleted, always linked back.*
