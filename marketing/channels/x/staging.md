# X / Twitter — Staging (T-30 → T-0)

**Channel:** X / Twitter (PRD §5 primary persona; `channel-plan.md` §2.1)
**Owner:** Signal (distribution) · Herald (voice)
**Scheduler:** Buffer Free OR Typefully Free (Comply-approved — both store no PII beyond post text)
**Cadence:** 3 posts/week M0–M5 + dedicated launch-day thread (Herald §1 sample-06 single-tweet rule waived once for launch)
**Voice ceiling:** grade 9 per `agents/growth/herald-brand-voice.md`
**UTM convention:** `?utm_source=x&utm_medium=tweet&utm_campaign=<campaign>&utm_content=<post-id>` (channel-plan.md §5.1)

---

## 1. Pre-launch build-in-public thread (M0–M2) — already in flight

Per `marketing/copy/04-social-bundles.md` §1, the 12 single tweets covering weeks 1–12 are locked. By T-30 (week 14), tweets 1–12 are published; tweets 13–16 (M3–M4 cadence build-up) are scheduled in Buffer / Typefully.

Status: **on cadence per channel-plan.md §2.1.**

---

## 2. Launch-day thread (T-0) — staged in Buffer / Typefully

This is the single Herald-approved thread that supersedes the "single tweet beats a thread" rule (sample-06 §1 carve-out for launch).

**Trigger time:** T-0 12:00 UTC (channel-plan launch posts parallel).

**Tweet 1 (anchor):**

```
Studio Zero is live.

You build with AI. We grade what got built.
Seven specialist reviewers. One verdict. Receipts on every finding.

Free Surface audit at studiozero.dev

[image: verdict screen — PASS WITH FIXES · 81 / 100]
```

**Tweet 2 (proof):**

```
Today's dogfood verdict on our own production codebase.

PASS WITH FIXES · 84 / 100
Halo flagged 2 a11y. Proof flagged 3 copy. Optic flagged 1 UX.

Every finding has a file path and a line range.

[image: findings panel]
```

**Tweet 3 (rubric):**

```
What "PASS WITH FIXES" means:

5 severity levels — Blocker · Critical · Major · Minor · Polish.
Each weighted. No LLM in the score math.

Re-run the rubric six months from now, get the same score.
Versioned per release.

[image: rubric panel]
```

**Tweet 4 (head-to-head — substantiated):**

```
Ran a Lovable-built app through Studio Zero.

  • 2 Blockers (a11y on signup)
  • 5 Critical (copy clarity, brand drift)
  • 11 more across Major / Minor / Polish

Lovable shipped the code.
Studio Zero shipped the receipts.

Both have a place.
```

**Comply substantiation gate:** `marketing/claims-substantiation/claim-head-to-head-lovable.md` must be ≤90d old. If stale, Tweet 4 is replaced with a Cursor or v0 head-to-head where a fresh substantiation file exists.

**Tweet 5 (price-reveal — Penny-locked language):**

```
Free Surface audit forever.

Managed tier when you're ready — flat fee that includes the tokens.
Code-quality SaaS comp class (SonarQube, Codacy), not AI-builder comp class.

Pricing at studiozero.dev/pricing
```

**Penny gate:** language matches `finance/pricing.md` §2.4 verbatim. Specific dollar amounts are on the `/pricing` page, not in the post body (price-reveal sequencing).

**Tweet 6 (CTA + thread close):**

```
Three ways to start:

1. Free Surface audit — no signup, just a URL → studiozero.dev
2. Connect your repo — see what got missed → studiozero.dev/signup
3. AMA-ing in 3 Discord communities this week — DMs open

Thanks to everyone who alpha-tested. You shaped this.
```

---

## 3. Sustained T-0 → T+7 engagement plan

| Time                    | Activity                                                                        | Owner                                     |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------------------- |
| **T-0 12:00 UTC**       | Thread publishes                                                                | Herald (via Buffer / Typefully scheduled) |
| **T-0 12:05–18:00 UTC** | Signal + Jo reply to every comment within 30 minutes; quote-tweet best receipts | Signal + Jo                               |
| **T-0 22:00 UTC**       | Pin Tweet 1 of the thread for 7 days                                            | Signal                                    |
| **T+1 → T+7**           | Daily 1 verdict screenshot + 1 community reply                                  | Signal                                    |
| **T+7 onward**          | Resume 3 posts/week cadence per channel-plan.md §2.1                            | Signal                                    |

---

## 4. UTM strings — verified in Lens dashboard

Every link in the thread above carries one of these UTM strings. Lens captures attribution; PostHog Experiments cohorts by `utm_content`.

| Tweet # | UTM target URL                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------- |
| 1       | `https://studiozero.dev/?utm_source=x&utm_medium=tweet&utm_campaign=launch&utm_content=anchor`           |
| 4       | (none — text-only, no link)                                                                              |
| 5       | `https://studiozero.dev/pricing?utm_source=x&utm_medium=tweet&utm_campaign=launch&utm_content=pricing`   |
| 6.1     | `https://studiozero.dev/?utm_source=x&utm_medium=tweet&utm_campaign=launch&utm_content=cta-free-surface` |
| 6.2     | `https://studiozero.dev/signup?utm_source=x&utm_medium=tweet&utm_campaign=launch&utm_content=cta-signup` |

---

## 5. T-7 verification (per `launch-day-rehearsal.md` row 1)

| Check                                                                          | Pass criterion                                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| All 6 tweets scheduled in Buffer / Typefully with correct UTC timestamps       | Each tweet's "scheduled at" matches the §3 wall-clock                              |
| Image previews render in scheduler                                             | Each image renders ≥600px wide, no broken-link icons                               |
| UTM links resolve to live `studiozero.dev` routes (no 404s)                    | curl each UTM URL → 200                                                            |
| Tweet 4 head-to-head substantiation file ≤90d                                  | `marketing/claims-substantiation/claim-head-to-head-lovable.md` verifier date ≤90d |
| Tweet 5 Penny price-reveal language matches `finance/pricing.md` §2.4 verbatim | Manual diff against §2.4                                                           |
| Brand-voice grader green                                                       | `pnpm run brand-voice:grade -- --file marketing/channels/x/staging.md` exit 0      |
| Buffer / Typefully account 2FA enabled (Comply security gate)                  | Open Buffer / Typefully → Security → 2FA enabled                                   |

---

## 6. Failure-mode mitigations

| Mode                                             | Mitigation                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Buffer / Typefully outage at T-0**             | Tweets 1–6 staged in `marketing/copy/launch-week/x-thread.md` ready for manual copy-paste posting                   |
| **Tweet 4 substantiation goes stale before T-0** | Swap Tweet 4 with the Cursor head-to-head where `claim-head-to-head-cursor.md` is fresh                             |
| **Image render fails (broken asset URL)**        | Optic + Pixel have versioned copies of every image in `brand/launch-assets/x/`; Buffer auto-falls-back to text-only |
| **X rate-limits launch thread**                  | Stagger tweets 2–6 by 60 seconds each (current schedule is 0 / 60 / 120 / 180 / 240 / 300 seconds)                  |
| **Thread tone reads as overselling**             | Herald §3 pillar 1 (confident, not punitive) — re-read at T-3 final pass                                            |

---

_X staging v1.0. Signal commits this file at M4 Batch 2; updates row-by-row through T-0. v2 supersedes after T+30 retro._
