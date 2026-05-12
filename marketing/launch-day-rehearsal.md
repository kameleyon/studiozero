# Studio Zero — Launch-Day Rehearsal (T-7 Dress Rehearsal)

**Version:** 1.0 (M4 Batch 2 — Signal locks; ready for T-7 execution week 15)
**Date:** 2026-05-12
**Owner:** Signal (launch coordination)
**Cross-signs:** Sprint, Watch, BigBrain, Penny, Herald, Comply, Lens.
**Composed against:** `marketing/launch-checklist.md` (T-7 row), `marketing/channel-plan.md` §2 + §6, `marketing/copy/04-social-bundles.md`, `marketing/copy/05-ama-prep.md`, `marketing/copy/06-brand-voice-channels.md`, `agents/growth/herald-brand-voice.md`, `operations/runbook-day-zero.md`, `sprint/milestone-M5.md` exit gate.
**Phase:** 9 of `BUILD_FLOW.md`.

> T-7 is the dress rehearsal. Every asset, every account, every contact, every monitoring surface is verified live one week before T-0. The rehearsal is itself a CI artifact: M5 exit gate scrapes this file for a green-status row before flipping to launch. **A single red row pushes T-0 by ≥48h.**

---

## 1. Why a T-7 dress rehearsal exists

The first 48 hours of a launch are unforgiving. Hacker News front-page traffic ranks within hours of submission; Product Hunt's algorithm de-ranks slow first responses; X engagement decays in 90 minutes; Discord AMAs cannot be rescheduled without losing the audience that opted in. **Studio Zero gets one shot at T-0.** The cost of doing nothing on T-7 is the cost of a soft launch — the inverse of what M5 is supposed to achieve.

The rehearsal pattern is borrowed from comparable launches (Cursor's June 2023 launch; Linear's 2019 PH launch; Posthog's HN front-page in 2021): a fully-staged, fully-verified, end-to-end dry-run of every channel asset and every monitoring surface, run on a date 7 days before the real launch so that any failure can be remediated without compressing the timeline.

**This file is the playbook Signal runs on T-7.** Each row has an owner, a verification artifact, and a pass/fail criterion. Signal sits with this file open on T-7 from 09:00 UTC until every row is green.

---

## 2. T-7 dress rehearsal rows

### 2.1 Channel assets — all 4+ in staging, end-to-end verified

| Row | Channel | Asset                                                                                                                                                                                                                    | Verification                                                                                                                                                                                                                       | Owner                            | Pass/fail |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------- |
| 1   | X       | 12-tweet build-in-public thread (the M0–M2 weekly bundle, M3–M4 cadence build-up) committed at `marketing/channels/x/staging.md`; launch-day thread drafted at `marketing/copy/launch-week/x-thread.md`                  | Open Buffer / Typefully scheduler; verify each tweet scheduled to the correct UTC time slot; image preview renders; UTM link resolves to `studiozero.dev/?utm_source=x&utm_campaign=launch&utm_medium=tweet&utm_content=<post-id>` | Signal + Herald                  | [ ]       |
| 2   | HN      | Show HN submission line locked per `06-social-post.md` §2; first comment text locked; Jo's HN account warmed (≥4 helpful comments in last 60d; karma ≥10)                                                                | Click into Jo's HN profile (`news.ycombinator.com/user?id=<handle>`); count comments in last 60d; verify karma                                                                                                                     | Signal                           | [ ]       |
| 3   | IH      | Monthly milestone post draft committed at `marketing/channels/ih/staging.md`; M5+30d post stub queued at `marketing/copy/launch-week/ih-launch.md`                                                                       | Render in IH preview; verify Penny + Jo final-review checkboxes signed; D4 pricing reveal acceptability per Jo's locked call per `04-social-bundles.md` §3 (specifics stripped)                                                    | Signal + Herald + Penny          | [ ]       |
| 4   | PH      | Listing copy + tagline + gallery + first-comment text committed at `marketing/channels/ph/staging.md`; gallery video ≤30s approved by Optic + Herald                                                                     | Open PH draft (hunter-side); verify tagline ≤60 chars; gallery loads <2s on cold cache; first-comment text matches Herald copy bundle                                                                                              | Signal + Hunter + Optic + Herald | [ ]       |
| 5   | Discord | Three communities confirmed (per `channel-plan.md` §2.5); intro DMs to mods drafted; AMA dates booked for T+2 → T+5; **no shilling pre-launch — presence only**                                                          | Open each community's mod-DM thread; verify mod has accepted Signal's intro; verify AMA date confirmed in writing by mod                                                                                                           | Signal                           | [ ]       |
| 6   | Reddit  | Per-subreddit launch posts drafted at `marketing/channels/reddit/staging.md` with FTC #ad disclosure on first line; per-subreddit promo-day rules verified                                                               | Read each subreddit's stickied rules thread; verify launch-post day aligns with promo-day rules; Comply gate green on FTC disclosure                                                                                               | Signal + Comply                  | [ ]       |
| 7   | Press   | Press list of 5–10 newsletters contacted with per-newsletter angle (TLDR, Console.dev, Refind, Bytes, Pointer, Indie Hackers Daily, Why-A-Founder, Dense Discovery, The Pragmatic Engineer (community), Indie Worldwide) | Each pitch sent ≥7 days before T-0; replies tracked in `marketing/press-tracker.md`; at least 2 confirmed mentions for launch week                                                                                                 | Signal + Herald                  | [ ]       |
| 8   | Blog    | Launch post drafted at `marketing/copy/launch-week/blog-launch.md`; "Why we built Studio Zero" anchor post indexed in Google Search Console; OG image generated; JSON-LD `Article` schema validated                      | Open Google Search Console → URL Inspection → verify Indexing Status = Indexed; OG image renders in Facebook OG debugger + Twitter Card validator                                                                                  | Lens + Herald + Vega             | [ ]       |

**M5 CI scrape gate (line 93 of `launch-checklist.md`):** ≥4 GTM channels live with timestamped first-post URLs at T-0. **At T-7 we verify the _staging_ of those URLs; T-0 verifies they _went live_.**

---

### 2.2 Hunter, HN warming, IH preview — pre-launch contracts

| Row | Item                                                                                                       | Verification                                                                                                                                      | Owner                | Pass/fail |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------- |
| 9   | **Product Hunt hunter** recruited at T-14 + briefed; gallery + tagline approved                            | Open hunter's email thread; verify hunter has confirmed publish-time slot (00:01 PT / 08:01 UTC on T-0); gallery preview signed off               | Signal               | [ ]       |
| 10  | **HN account warming** complete — Jo posts ≥1 helpful comment per week from M0 through T-14                | Open `news.ycombinator.com/threads?id=<handle>`; verify cadence; verify karma ≥10 + account age ≥6 months                                         | Signal (account: Jo) | [ ]       |
| 11  | **IH milestone post (4 of 4 lined up)** — M0 / M2 / M4 / M5+30d cadence per `channel-plan.md` §2.3         | M0 + M2 + M4 posts have published URLs in `marketing/press-tracker.md`; M5+30d stub is in `marketing/channels/ih/staging.md`                      | Signal + Herald      | [ ]       |
| 12  | **Penny + Jo final review** of IH launch post — D4 pricing-reveal acceptability locked per Jo's prior call | Penny signs off on Pricing-reference language being absent from post body; Jo signs off on the milestone-narrative framing per `pricing.md` §3 D4 | Penny + Jo + Signal  | [ ]       |

---

### 2.3 Discord — three communities authenticated; presence ≠ shilling

| Row | Community                                                                                                                | Status verification                                                                                                                                    | Owner  | Pass/fail |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------- |
| 13  | Community A (placeholder — pick: Cursor / Bolt / Lovable / v0 / IndieHackers / Founders Cafe / MegaMaker / Replit Agent) | Signal has been a member ≥30 days; ≥5 helpful replies on adjacent threads; mod has acknowledged Signal's presence; intro DM to mod sent + acknowledged | Signal | [ ]       |
| 14  | Community B (placeholder)                                                                                                | Same as row 13                                                                                                                                         | Signal | [ ]       |
| 15  | Community C (placeholder)                                                                                                | Same as row 13                                                                                                                                         | Signal | [ ]       |

**Discord rule (from `channel-plan.md` §2.5 risk row):** **No shilling pre-launch. No marketing links in #help channels.** Presence is trust accumulation. T-7 verification is "Signal is recognized as a contributor in each community"; T-0 lights up the AMAs.

---

### 2.4 Press list — pitches sent ≥7 days before T-0

| Row | Newsletter                         | Pitch sent? | Reply received? | Confirmed mention?      | Owner           | Pass/fail |
| --- | ---------------------------------- | ----------- | --------------- | ----------------------- | --------------- | --------- |
| 16  | TLDR                               | [ ]         | [ ]             | [ ] (target: T+0..T+3)  | Signal + Herald | [ ]       |
| 17  | Console.dev                        | [ ]         | [ ]             | [ ] (target: T+0..T+7)  | Signal + Herald | [ ]       |
| 18  | Refind                             | [ ]         | [ ]             | [ ] (target: T+0..T+7)  | Signal + Herald | [ ]       |
| 19  | Bytes                              | [ ]         | [ ]             | [ ] (target: T+0..T+7)  | Signal + Herald | [ ]       |
| 20  | Pointer (optional — bonus surface) | [ ]         | [ ]             | [ ] (target: T+7..T+14) | Signal + Herald | [ ]       |
| 21  | Indie Hackers Daily (optional)     | [ ]         | [ ]             | [ ] (target: T+0..T+7)  | Signal + Herald | [ ]       |

**Hard target:** **≥2 confirmed mentions** for launch week per `launch-checklist.md` T-14 row 3. Rows 16+17 are Signal's must-haves; rows 18–21 are bonus surface.

---

### 2.5 Monitoring surfaces — green going into T-0

| Row | Surface                                                                                                 | Verification                                                                                                                                                                                                 | Owner          | Pass/fail |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | --------- |
| 22  | `status.studiozero.dev` LIVE with subscription form working                                             | Click subscribe; verify confirmation email arrives within 60s                                                                                                                                                | Watch          | [ ]       |
| 23  | Sentry alerts wired; on-call rotation locked for T-0 → T+7                                              | Synthetic Critical alert fired; PagerDuty escalates within 5min                                                                                                                                              | Crash + Watch  | [ ]       |
| 24  | Lens channel dashboard reading from PostHog + Stripe; pre-launch baseline captured                      | Open dashboard URL; verify per-channel cohort table populated with M0–M4 baseline data                                                                                                                       | Lens + Signal  | [ ]       |
| 25  | UTM passthrough verified end-to-end                                                                     | Visit `studiozero.dev/?utm_source=x&utm_medium=tweet&utm_campaign=launch&utm_content=test`; signup; verify Stripe customer object captures attribution; verify PostHog person properties capture attribution | Lens + Forge   | [ ]       |
| 26  | `studiozero.dev/status` shows "Launch day — extra-attentive monitoring in effect" banner queued for T-1 | Banner draft committed; Watch confirms toggle command works                                                                                                                                                  | Watch + Herald | [ ]       |
| 27  | On-call PagerDuty escalation tree posted in #launch-day Slack                                           | Tree committed to `operations/launch-day-escalation-tree.md`; every layer lead acknowledged                                                                                                                  | Watch + Sprint | [ ]       |

---

### 2.6 Substantiation + Comply gates — Proof + Comply CI green

| Row | Gate                                                                                                                                   | Verification                                                                                                    | Owner                                  | Pass/fail |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------- |
| 28  | All 3 substantiation files committed: `claim-pricing-positioning.md`, `claim-defensible-wedge.md`, `claim-code-vs-surface-findings.md` | `marketing/claims-substantiation/` directory listed; each file's verifier date ≤90d; Proof CI passes            | Comply + Penny + Scout + Hook + Herald | [ ]       |
| 29  | Brand-voice grader green across X / HN / IH / PH / Discord / Reddit / blog assets                                                      | `pnpm run brand-voice:grade` exit 0 against `marketing/copy/launch-week/`                                       | Proof + Herald                         | [ ]       |
| 30  | FTC #ad disclosure on every Reddit + partner co-marketing post (Comply gate)                                                           | Manual + automated scan: `pnpm run comply:disclosure-check` exit 0                                              | Comply                                 | [ ]       |
| 31  | Cookie banner + CCPA Do-Not-Sell footer LIVE on production marketing site                                                              | Cypress / Playwright spec runs against prod URL; banner renders on first visit; CCPA link reachable             | Comply + Vega                          | [ ]       |
| 32  | DMCA agent registered + `/dmca` route renders agent contact (Comply HUMAN-pending item from M4 Batch 2)                                | `compliance/dmca-agent.pdf` committed; `/dmca` route renders agent name + address + email + phone               | Comply + Jo + Vega                     | [ ]       |
| 33  | Art. 27 EU + UK representative engaged + `/privacy` §12 updated with live vendor details                                               | `compliance/eu-rep-appointment-YYYY-MM-DD.md` committed; Privacy Policy §12 swapped placeholder for live values | Comply + Jo + Vega                     | [ ]       |
| 34  | Responsible disclosure policy LIVE at `/security` + `/.well-known/security.txt`                                                        | curl `/security` returns 200; curl `/.well-known/security.txt` returns 200 with RFC 9116 conformant body        | Comply                                 | [ ]       |

---

### 2.7 R21(c) alpha-pipeline check at T-7

| Row | Item                                                                                                         | Verification                                                                                                        | Owner                          | Pass/fail |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------- |
| 35  | Paying Managed alpha count ≥5 at T-7 (gate held since M2 close week 9)                                       | Stripe dashboard query: `count(subscriptions WHERE status='active' AND plan IN ('managed_starter', 'managed_pro'))` | Signal + Penny                 | [ ]       |
| 36  | If <5 paying Managed at T-7 → R21(c) escalation per `channel-plan.md` §6 triggers BEFORE T-0                 | Jo + BigBrain + Penny meeting scheduled within 48h; postmortem decision documented                                  | Jo + BigBrain + Penny + Signal | [ ]       |
| 37  | Alpha-list signup count + cohort 30d-retention figure committed to `marketing/r21c-alpha-pipeline-status.md` | Lens dashboard URL committed; weekly digest emailed Penny + Meter on schedule                                       | Lens + Signal                  | [ ]       |

---

## 3. Run-of-show — T-7 day execution timeline (UTC)

The wall-clock schedule Signal follows on T-7. All times UTC.

| Time      | Activity                                                                                                              | Owner                               |
| --------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **09:00** | Signal opens this file; lights up Slack `#launch-rehearsal` channel; pings every named owner                          | Signal                              |
| **09:15** | **§2.1 channel-asset walkthrough** — Signal + Herald walk through each row 1–8                                        | Signal + Herald                     |
| **10:30** | **§2.2 hunter / HN / IH / Penny + Jo final review** — sign-off captured                                               | Signal + Herald + Penny + Jo        |
| **11:30** | Coffee break (15 min). Signal commits status updates to this file.                                                    | Signal                              |
| **11:45** | **§2.3 Discord communities walkthrough** — Signal opens each community + verifies mod relationship                    | Signal                              |
| **12:30** | **§2.4 press-list status** — Signal pulls reply states; Herald drafts re-pings for any quiet newsletter               | Signal + Herald                     |
| **13:30** | Lunch break (45 min).                                                                                                 | Signal                              |
| **14:15** | **§2.5 monitoring-surfaces verification** — Watch fires synthetic alerts; Lens confirms dashboard reads               | Watch + Crash + Lens + Forge        |
| **15:30** | **§2.6 substantiation + Comply gates** — Comply runs CI scripts; Proof grades brand-voice across launch-week assets   | Comply + Proof + Herald             |
| **16:30** | **§2.7 R21(c) check** — Penny pulls Stripe count; Signal commits the number; if <5, escalation tree fires             | Signal + Penny                      |
| **17:00** | **All-hands rehearsal verdict meeting** — every row's status reported; red rows triaged for ≤48h remediation          | BigBrain (chair) + every layer lead |
| **17:30** | Signal commits the verdict to this file (PASS / PASS-WITH-RED-ROWS / FAIL); BigBrain communicates to Sprint           | Signal + BigBrain                   |
| **18:00** | If FAIL or PASS-WITH-RED-ROWS → BigBrain decides whether to delay T-0 by 48–72h; Sprint adjusts milestone-M5 burndown | BigBrain + Sprint                   |

**T-7 verdict triggers an immediate BigBrain decision.** PASS means T-0 proceeds. PASS-WITH-RED-ROWS means the red rows must be remediated in 48h (typically a Friday rehearsal → Sunday remediation → Monday final-check → Tuesday T-0). FAIL means T-0 slides by ≥1 week + Sprint re-baselines.

---

## 4. T-7 verdict — what Signal commits at end of day

At 17:30 UTC on T-7, Signal commits the verdict block to the bottom of this file:

```
## 4.X — T-7 rehearsal verdict (executed YYYY-MM-DD)

| Section | Status | Notes |
|---------|--------|-------|
| §2.1 Channel assets | PASS / FAIL | <if FAIL, which rows> |
| §2.2 Hunter + HN + IH + Penny review | PASS / FAIL | … |
| §2.3 Discord communities | PASS / FAIL | … |
| §2.4 Press list | PASS / FAIL | … |
| §2.5 Monitoring surfaces | PASS / FAIL | … |
| §2.6 Substantiation + Comply | PASS / FAIL | … |
| §2.7 R21(c) check | PASS / FAIL | … |

**Overall verdict: PASS / PASS-WITH-RED-ROWS / FAIL.**

**BigBrain decision: T-0 proceeds on <date> / T-0 slides to <date>.**

Signed: Signal · BigBrain · Sprint · Watch · Crash · Lens · Penny · Comply · Herald · Jo
```

Verdict block is the artifact `sprint/milestone-M5.md` exit gate scrapes for T-7 readiness.

---

## 5. Failure modes — what we explicitly mitigate at T-7

The rehearsal exists precisely because the following failure modes have killed comparable launches:

| Failure mode                                                                               | Mitigation row                                                                   |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **HN account flagged on first submission** (no comment history)                            | Row 10 — warming verified                                                        |
| **Hunter publishes off-schedule** (PH algorithm de-ranks; day-1 reach halved)              | Row 9 — hunter confirmed in writing                                              |
| **PH gallery loads slow** (Prism gate triggers; Optic flagged)                             | Row 4 — gallery cold-cache <2s verified                                          |
| **Discord mod removes Signal pre-launch** for shilling-adjacent behavior                   | Rows 13–15 — mod relationship verified pre-launch                                |
| **FTC #ad disclosure missing on Reddit post** (Comply gate; FTC exposure)                  | Row 30 — Comply CI gate green; row 6 — per-subreddit verified                    |
| **DMCA agent not registered → first takedown notice on launch day creates legal exposure** | Row 32 — DMCA registered + `/dmca` route live                                    |
| **Art. 27 EU rep not engaged → first EU signup triggers technical breach**                 | Row 33 — Art. 27 LIVE + Privacy Policy updated                                   |
| **Cookie banner missing → GDPR breach on first EU visitor**                                | Row 31 — cookie banner LIVE on prod                                              |
| **Sentry alerts not wired → P1 page fires with no escalation**                             | Row 23 — synthetic Critical alert verified; PagerDuty escalates                  |
| **Lens dashboard not reading from PostHog + Stripe → no attribution → R21(c) blind**       | Row 24 — dashboard pulls live data; UTM passthrough verified end-to-end (row 25) |
| **Substantiation file missing for a launch claim → Comply blocks post at CI**              | Row 28 — all 3 files committed + verifier-date ≤90d                              |
| **Brand-voice grader red on a launch asset → Proof rejects post**                          | Row 29 — `pnpm run brand-voice:grade` exit 0                                     |
| **R21(c) gate dropped below 5 paying Managed before launch**                               | Row 35 → row 36 escalation                                                       |

**The whole point of T-7:** find the failure before it becomes a launch-day surprise.

---

## 6. Signal exit-gate self-verdict (T-7 rehearsal readiness)

| Gate                                                                                    | Status |
| --------------------------------------------------------------------------------------- | ------ |
| Every channel asset has a staging file + verification artifact + owner                  | PASS   |
| Run-of-show is wall-clock-scheduled to fit in one business day                          | PASS   |
| §2.5–§2.6 gates align 1:1 with M4 Batch 1 + Batch 2 deliverables                        | PASS   |
| Failure modes enumerated + mitigation row mapped 1:1                                    | PASS   |
| BigBrain decision point at 17:30 UTC is well-defined (PASS / PASS-WITH-RED-ROWS / FAIL) | PASS   |
| R21(c) check (row 35) included in T-7 surface, not deferred to T-0 surprise             | PASS   |
| Verdict block (§4) is the M5 CI artifact                                                | PASS   |

**Signal's verdict on T-7 rehearsal readiness: PASS.** File is execution-ready for week 15.

---

_T-7 rehearsal v1.0. Signal commits the §4 verdict block on rehearsal day. v2 supersedes after T+30 retro reflecting actual rehearsal-vs-execution variance._
