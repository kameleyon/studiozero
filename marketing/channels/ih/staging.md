# IndieHackers — Staging (T-30 → T-0)

**Channel:** IndieHackers (PRD §5 primary persona + indie-agency persona; `channel-plan.md` §2.3)
**Owner:** Signal (channel) · Herald (voice) · Jo (signs off + replies in-thread)
**Cadence:** Monthly M0–M5 milestone posts (4 of 4 lined up: M0 / M2 / M4 / M5+30d); quarterly thereafter.
**Voice ceiling:** founder-voice grade 9 per `agents/growth/herald-brand-voice.md` + sample `06-social-post.md` §3
**Penny gate (locked):** D4 pricing-reveal acceptability — specifics stripped from post bodies per Jo's prior locked call (`04-social-bundles.md` §0 + §3).
**UTM convention:** `?utm_source=ih&utm_medium=milestone-post&utm_campaign=<milestone-slug>`

---

## 1. Four-post cadence — status

| Post                                                          | Status                  | Publish window        | URL committed?                              |
| ------------------------------------------------------------- | ----------------------- | --------------------- | ------------------------------------------- |
| **M0 milestone** (intake + score engine receipts)             | **PUBLISHED** — week 4  | M0 + 30d → IH archive | YES — `marketing/press-tracker.md` row IH-1 |
| **M2 milestone** (Managed billing live)                       | **PUBLISHED** — week 8  | M2 + 30d → IH archive | YES — `marketing/press-tracker.md` row IH-2 |
| **M4 milestone** (lifecycle emails wired + WCAG audit signed) | **PUBLISHED** — week 12 | M4 + 30d → IH archive | YES — `marketing/press-tracker.md` row IH-3 |
| **M5+30d milestone** (launch + first-30d cohort receipts)     | **DRAFT — this file**   | T+30..T+45            | NO — drafted in §3 below                    |

---

## 2. Launch-week post — T-0 publish (the "we're live" milestone)

This is the launch-day post (not the M5+30d milestone). Publishes at T-0 12:00 UTC parallel to X / HN / PH / blog.

**Title (number-anchored per sample-06 §3):**

```
After 16 weeks of building in public — Studio Zero is live
```

**Body:**

```
Sixteen weeks ago I posted the first build-in-public milestone here.

Today Studio Zero ships.

The receipts that justify the launch:

  - 56 specialist agents, productized from a system I've shipped for clients for two years
  - 7 reviewers running on every audit (UX, accessibility, copy, brand, audience fit, security patterns, design-system drift)
  - 4 milestones (M0..M4) closed on plan; 1 paid pentest (Trail of Bits) with verdict ≤1 Major, 0 Critical
  - Versioned rubric; deterministic score math; receipts on every finding
  - Free Surface audit forever (just a URL); paid tiers when you connect a repo
  - WCAG 2.2 AA conformance audit signed by third party
  - GDPR + CCPA + CAN-SPAM + EU AI Act Art. 50 compliant from day one (the legal docs are receipts too)

For the founders here who've been following: thank you. The four milestone posts and the M1 alpha-tester thread shaped what shipped today more than I'm going to credit.

For the founders who are reading this for the first time: Studio Zero is the audit layer between an AI builder (Cursor, v0, Bolt, Lovable, Replit Agent) and the team about to ship the AI-built app. It doesn't write code; it grades what got written. The wedge that nobody else covers is the seven reviewers running in parallel — most code-quality tools cover 1 or 2 of those axes; Studio Zero covers all 7.

Launching on three surfaces simultaneously: Show HN, Product Hunt, here. AMAs in 3 Discord communities through the rest of the week.

Open question for the community: what should the M5+30d retro post cover? I'm partial to "what didn't ship that should have" because every honest founder I've followed here writes that post and I learned more from theirs than I'd have learned from a victory lap.

Pricing details on /pricing if you want them. Launch-day CTA: just paste any URL into the home page — Surface audit is free, no signup.

studiozero.dev
```

**Penny gate verification:**

- No specific dollar amounts in post body ✓
- Pricing reference is "details on /pricing" ✓
- D4 pricing-reveal acceptability per Jo's locked call ✓
- Matches `finance/pricing.md` §2.4 plain-language framing ✓

**Brand-voice gate verification:**

- Number-anchored title per Herald §6 IH row ✓
- Receipts shape per `04-social-bundles.md` §3 ✓
- One honest open question (the engagement engine) at end ✓
- No "we're so excited" + no "the secret to" + no thread bait ✓

---

## 3. M5+30d milestone post — draft (publishes T+30..T+45)

**Title (number-anchored):**

```
30 days post-launch — Studio Zero hit X paying customers, Y didn't pan out
```

_(X and Y filled at T+30 from Lens dashboard + Penny's cohort data.)_

**Body sketch (Herald finalizes at T+30):**

```
30-day cohort receipts post.

What worked:
  - <channel A> drove X% of signups
  - Free Surface audit conversion to paid is Z%
  - First N paying Managed alpha hit by week N (R21(c) gate held / didn't hold)

What didn't:
  - <channel B> underperformed → cut on cohort-2 review
  - <feature C> got K% of intended usage → re-prioritized
  - <pricing experiment D> A/B result was <conclusion>

Open question for the community: <topic Signal + Penny pick at T+30 based on what surprised us most>
```

This post is the v2 of the channel-plan + the v2 of the pricing-page; Penny + Hook + Lens drive the data; Herald drafts; Jo signs off. Per `launch-checklist.md` T+30 retro window.

---

## 4. Day-of execution timeline (launch-day post; UTC)

| Time                    | Activity                                                           | Owner                 |
| ----------------------- | ------------------------------------------------------------------ | --------------------- |
| **T-1 18:00 UTC**       | Final review pass with Herald + Penny; Jo signs final wording      | Herald + Penny + Jo   |
| **T-0 12:00 UTC**       | Publish on IndieHackers Milestones                                 | Signal (Jo's account) |
| **T-0 12:05 UTC**       | Cross-post link to X (Tweet 6 in launch thread already links here) | Signal                |
| **T-0 12:05–22:00 UTC** | Jo replies to every comment within 60 min                          | Jo                    |
| **T-0 22:00 UTC**       | Pin in Studio Zero's IH profile for 7 days                         | Signal                |
| **T+1 → T+2**           | Daily check-ins for follow-up replies                              | Jo                    |
| **T+3 → T+7**           | Selective replies; promote highest-signal threads                  | Jo + Signal           |

---

## 5. KPI targets (per channel-plan.md §2.3)

| KPI                                 | Target                                        |
| ----------------------------------- | --------------------------------------------- |
| IH followers / subscribers          | 500 by M2 close (current: per Lens dashboard) |
| IH-attributed alpha-list signups    | ≥30 from launch post                          |
| Comment-thread engagement           | ≥20 substantive comments (≥40 words each)     |
| DM volume                           | ≥10 DMs to Jo about Managed-tier in 7 days    |
| Cumulative across 4 milestone posts | ≥80 alpha-list signups (S2 → S3 funnel)       |

---

## 6. Penny + Jo final review checkboxes (locked sign-off)

The post does not publish without all three:

- [ ] **Herald sign-off** — voice grade 9 ✓; receipts shape ✓; one honest open question ✓
- [ ] **Penny sign-off** — pricing specifics stripped from body ✓; comp-class framing aligns with `finance/pricing.md` §2.4
- [ ] **Jo sign-off** — final wording acceptable; D4 pricing-reveal acceptability re-affirmed for this specific post

---

## 7. T-7 verification (per `launch-day-rehearsal.md` row 3 + row 12)

| Check                                                                                    | Pass criterion                                                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Launch post draft committed at `marketing/copy/launch-week/ih-launch.md`                 | File exists; content matches §2 above                                          |
| M0 + M2 + M4 milestone posts published with URLs in `marketing/press-tracker.md`         | All 3 rows present                                                             |
| Penny + Jo final-review checkboxes (§6) all ticked                                       | All 3 boxes ticked in this file                                                |
| D4 pricing-reveal acceptability re-affirmed                                              | Jo's signature in §6                                                           |
| Substantiation files (`claim-pricing-positioning.md` + `claim-defensible-wedge.md`) ≤90d | Both verifier dates within 90d at T-7                                          |
| Brand-voice grader green                                                                 | `pnpm run brand-voice:grade -- --file marketing/channels/ih/staging.md` exit 0 |

---

## 8. Failure-mode mitigations

| Mode                                                                     | Mitigation                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Post reads as humble-brag → IH community penalizes**                   | Herald §3 pillar 1 + one honest open question (§2 close); Jo verifies tone in T-7 final pass                             |
| **Pricing specifics leak into body (Penny gate violation)**              | §6 Penny sign-off mandatory; Penny owns final body diff vs `finance/pricing.md` §2.4                                     |
| **Skip the one honest open question → no discussion engine, post sinks** | §2 closes with the "what should M5+30d retro cover" question; verified at T-7                                            |
| **Reply latency on T-0 exceeds 60 min**                                  | §4 timeline + Jo blocks the calendar 12:00–22:00 UTC on T-0 for IH replies                                               |
| **Post times out of IH milestones algorithm**                            | Cross-post link from X anchor tweet drives signal; mod-bookmark request to IH (Signal has rapport from M0–M4 milestones) |

---

_IH staging v1.0. Signal commits at M4 Batch 2; M5+30d post §3 finalizes at T+30 with cohort data._
