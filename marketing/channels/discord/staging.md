# Discord — Staging (T-30 → T-0)

**Channel:** Discord — founder communities + AI-builder user communities (`channel-plan.md` §2.5)
**Owner:** Signal (personally maintains presence; **does not delegate to a bot at MVP**)
**Cadence:** Daily light presence in 3 communities; weekly substantive contribution; **AMAs in 3 communities during launch week (T+2 → T+5)**.
**Voice ceiling:** casual, helpful, never shilling per `04-social-bundles.md` §5 + Herald §6 Discord row
**UTM convention:** `?utm_source=discord&utm_medium=dm&utm_campaign=<community-slug>`
**Hard rule:** **Authentic presence, NO shilling pre-launch.** Signal posts marketing links in #help channels → ban + reputational damage (channel-plan.md §2.5 risk row).

---

## 1. Three target communities — placeholders

Per `channel-plan.md` §2.5, communities confirmed at T-14 per `launch-checklist.md` T-14 row 7. **Signal picks from this candidate list** based on demonstrated mod relationship + audience overlap with PRD §5 personas:

| Candidate community     | Audience overlap                                           | Mod relationship status (Signal verifies at T-21) |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Cursor Official Discord | AI-builder users; PRD §5 primary persona                   | [verify]                                          |
| Bolt.new community      | AI-builder users; high overlap with audit-ready cohort     | [verify]                                          |
| Lovable community       | AI-builder users; B2C-adjacent (different mix than Cursor) | [verify]                                          |
| v0 (Vercel) Discord     | AI-builder users; design-system-aware cohort               | [verify]                                          |
| Replit Agent users      | AI-builder users; education + indie cohort                 | [verify]                                          |
| IndieHackers Discord    | PRD §5 indie-agency / freelancer persona                   | [verify]                                          |
| Founders Cafe           | Founder community; broad B2B SaaS                          | [verify]                                          |
| MegaMaker               | Founder community; indie + bootstrapped                    | [verify]                                          |

**Signal locks 3 of these at T-21** based on which mods have responded affirmatively to the intro DM. Placeholders below assume **Cursor Discord + IndieHackers Discord + Founders Cafe** are the locked-3 — Signal updates this file with the final 3 at T-21.

---

## 2. Intro DM to mods — drafted (asking permission; NOT shilling)

Template Signal sends to each community's mod team at T-21. Single DM thread per community.

```
Subject: Hi from Studio Zero — would love to introduce a new product to the community at launch

Hi [mod name],

I've been a member of [community] for the past 4+ months and I've appreciated the [specific positive contribution Signal has noted — e.g., "the recent thread on prompt-injection patterns" or "the way the community handled the Cursor-vs-VS-Code review thread"].

I'm Signal, on the team building Studio Zero — we're launching on [date]. The product sits in a space that I think genuinely matters to this community: we're an audit layer that grades software AI builders produce (Cursor, v0, Bolt, Lovable, Replit Agent). Not a competitor to those tools; we sit downstream of them and catch what they don't surface.

Two things I'd love your input on:

1. **Would the community be open to a launch-week AMA?** I'm proposing one session (60–90 min) where the founder (Jo) takes any question — about the product, the build journey, the wedge, the pricing math, anything. I'd love to schedule this for some time between T+2 and T+5 (Wed–Fri of launch week). I can fit your calendar; you set the rules.

2. **Are there community guidelines I should know about before launch day?** I'd much rather follow your rules than ask for forgiveness. I've been reading the pinned mod guidance but it's always different at the community-level than what's pinned.

For context, I won't be dropping links into the community pre-launch. I read your "no shilling" pinned thread and I'm here for the trust accumulation, not lead-gen. The launch-day post (if you're OK with it) would go to whichever channel you direct me to — #announcements / #showcase / a dedicated channel, your call.

Thanks for stewarding [community]. Happy to talk further on DM or jump on a 15-min call if it helps.

— Signal
```

**Mod DM checklist (per community):**

- [ ] Mod responds within 5 business days
- [ ] Mod approves AMA (or declines with reasoning)
- [ ] Mod names the AMA channel + date
- [ ] Mod shares community-specific rules Signal must follow

**If mod does not respond within 5 business days:** Signal moves to next candidate community from §1.

---

## 3. AMA structure (T+2 → T+5)

Each community gets one 60–90 min AMA hosted by Jo. Three AMAs scheduled to different days of launch week (not all on the same day; spread engagement).

**Default AMA flow:**

1. **Pre-AMA announce (24h before):** Mod posts in the community's announcements channel: "AMA tomorrow at [time] with Jo, founder of Studio Zero. Ask anything." Signal does NOT auto-promote.

2. **AMA opens (T+N, hh:00 UTC):** Jo posts an intro message — 2–3 paragraphs, locked text below.

3. **AMA runs 60–90 min:** Jo replies to every question; Signal monitors for any community-rule violations (rare; the mods enforce).

4. **AMA wraps:** Jo posts "thanks; here's where to find more" — one link to `/about` (not `/pricing`; soft landing).

**Jo's AMA opening message — locked text:**

```
Hey [community] — Jo here, founder of Studio Zero. Launching this week.

Quick context: I've been the maker behind Studio Zero for two years (an internal multi-agent audit system for software I ship for clients). Today it's a SaaS. Seven specialist reviewers grading what AI builders shipped — every finding has a file path and a concrete fix.

I'm here for the next 60-90 minutes. Ask anything: the product, the build journey, the wedge against Cursor / v0 / Bolt / Lovable, the pricing math, what failed during M0–M5, what we built and didn't ship, what's next.

I won't drop pricing specifics here unprompted — that's not why we're here. If you ask, I'll answer honestly. Otherwise let's talk shop.

Studio Zero's launch surface is studiozero.dev — but ignore that for now; the AMA is the point.
```

---

## 4. Day-of (T+2..T+5) execution timeline (UTC, per AMA)

Each AMA runs the same pattern.

| Time relative to AMA                  | Activity                                                                          | Owner       |
| ------------------------------------- | --------------------------------------------------------------------------------- | ----------- |
| **AMA - 24h**                         | Mod posts pre-announce in community's #announcements                              | Mod         |
| **AMA - 5min**                        | Jo opens the AMA channel; confirms presence to mod                                | Jo          |
| **AMA opens**                         | Jo posts §3 opening message; AMA window opens                                     | Jo          |
| **AMA + 0..60 min**                   | Jo replies to every question; reply latency target ≤5 min per question            | Jo          |
| **AMA + 60 min** (if 60-min slot)     | Jo posts closing message + soft `/about` link                                     | Jo          |
| **AMA + 60..90 min** (if 90-min slot) | 30 extra min for follow-up replies                                                | Jo          |
| **AMA + 24h**                         | Jo follows up on any questions that came in after AMA window; thanks mod publicly | Jo + Signal |

---

## 5. KPI targets (per channel-plan.md §2.5)

| KPI                                                          | Target                                  |
| ------------------------------------------------------------ | --------------------------------------- |
| Pre-launch community members who DM Signal about Studio Zero | ≥15 by M2 close (cumulative; gate held) |
| Discord-attributed alpha-list signups (cumulative)           | ≥30 across the 3 communities            |
| AMA attendance (per community)                               | ≥30 active participants                 |
| AMA question count                                           | ≥20 substantive questions per AMA       |
| Mod NPS (informal Signal-self-check at T+30)                 | ≥3 of 3 mods report positive experience |

---

## 6. Hard rule reminders (Signal cannot violate)

From `channel-plan.md` §2.5 risk row:

- **No marketing link in any #help channel.** Ever. Even if directly invited. (Help channels are sacred; mods enforce ruthlessly.)
- **No bot presence.** Signal is human and personal at MVP. No webhook-driven posting.
- **AMA scheduled BEFORE hunter confirmation = unforced error.** Hunter confirms at T-14; AMA dates lock at T-7 per `launch-checklist.md` T-7 row 5.
- **Authentic helpfulness > self-promotion.** Signal answers questions about audit tooling, a11y, dev workflows even when Studio Zero is not the answer.

---

## 7. T-7 verification (per `launch-day-rehearsal.md` row 5 + rows 13–15)

| Check                                                                                        | Pass criterion                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 3 communities locked at T-21                                                                 | §1 final-3 names committed to this file                             |
| Mod DM threads exist + mod has acknowledged Signal's intro                                   | DM thread URLs committed to `marketing/press-tracker.md`            |
| AMA dates booked + confirmed in writing                                                      | Date + time + channel per community committed in this file          |
| Signal is recognized as a contributor in each community (≥5 helpful replies in last 30 days) | Signal's profile-history scan in each community                     |
| Signal has NOT posted any Studio Zero links in any community pre-launch                      | Manual scan of Signal's own message history; mod-confirmed if asked |
| Jo's AMA opening message (§3) reviewed by Herald + Penny                                     | Herald + Penny commit sign-off in this file                         |

---

## 8. Failure-mode mitigations

| Mode                                                                         | Mitigation                                                                                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mod removes Signal pre-launch for shilling-adjacent behavior**             | §6 hard rules enforced from M0; T-7 verification scans message history                                                                                             |
| **Mod approves AMA but community rules require pre-AMA submitted questions** | Signal asks at intro DM (§2); if required, Signal pre-collects 5–10 substantive questions from existing alpha-testers + drops them via Penny / Lens DMs to the mod |
| **AMA scheduled in conflict with PH / HN / X reply window**                  | §4 AMAs run T+2 through T+5 — explicitly NOT on T-0 to avoid Jo's attention split                                                                                  |
| **Bot detected by mods** (someone uses Studio Zero's webhook to auto-post)   | Signal disables every Studio Zero webhook to Discord; only human-typed messages from Signal's account                                                              |
| **Hostile community member at AMA**                                          | Jo responds respectfully; mod has authority to mute; Signal does NOT engage trolls                                                                                 |
| **AMA channel pinned thread gets deleted post-AMA**                          | Signal screenshots the full AMA + transcripts for `marketing/copy/ama-transcripts/<community>-AMA-YYYY-MM-DD.md`                                                   |

---

_Discord staging v1.0. Signal commits at M4 Batch 2; final-3 community lock at T-21; AMA dates lock at T-7. v2 supersedes after T+30 retro._
