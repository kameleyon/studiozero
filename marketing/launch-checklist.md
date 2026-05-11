# Studio Zero — Launch Checklist (T-30 → T+30)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Signal (launch coordination); cross-signs Sprint, Watch, BigBrain, Penny, Herald, Comply, Lens.
**Composed against:** `marketing/channel-plan.md`, `sprint/milestone-M4.md`, `sprint/milestone-M5.md`, `sprint/owner-matrix.md` R21(c), `agents/growth/herald-brand-voice.md`, `finance/pricing.md` (Penny price-reveal), PRD §15.5 + §16 M5 row.
**Phase:** 8 of `BUILD_FLOW.md`.

> Day-by-day launch playbook. Every row has owner + verification. T-0 = M5 public-launch day (week 16). Tuesday or Wednesday launch by default (Product Hunt + HN traction both peak mid-week per `channel-plan.md` §2.4 / §2.2).
>
> **CI scrape rule:** `sprint/milestone-M5.md` exit gate scrapes this file for ≥4 GTM channels with timestamped first-post URLs at T-0. If any row marked `[ ]` here is unchecked at T-0, M5 does not close.

---

## T-30 (M4 close, week 14)

| Item | Owner | Verification | Status |
|---|---|---|---|
| **Channel assets pre-staged** — X launch thread (drafted by Herald), HN Show HN comment (locked text from `06-social-post.md` §2), IH launch post (drafted), PH listing (tagline + gallery + first-comment drafted), blog launch post on `studiozero.dev/blog` | Herald + Signal | Drafts committed to `marketing/copy/launch-week/` (X-thread.md, hn-show-hn.md, ih-launch.md, ph-listing.md, blog-launch.md); Proof grades each ≤ Herald §4 reading-level ceiling | [ ] |
| **Beta-tester list seeded** — 60–100 alpha-list signups from M0–M4 build-in-public (per `channel-plan.md` §3.1 S2 target) emailed with T-7 embargoed launch-day notice | Signal + Herald | Mailgun / Postmark send confirmed; open rate ≥30% by T-14 (Lens dashboard) | [ ] |
| **DMCA Designated Agent registered** with U.S. Copyright Office | Comply | `compliance/dmca-agent.pdf` committed; `/dmca` route renders contact info (Vega) | [ ] |
| **WCAG 2.2 AA third-party conformance audit signed off** | Halo + Comply | Vendor report committed to `compliance/wcag-conformance-audit-2026q2.pdf`; `/accessibility` route renders statement (M4 gate per `sprint/milestone-M4.md`) | [ ] |
| **Status page live** at `status.studiozero.dev` | Watch + Crash | Status page DNS resolves; first synthetic check green; subscription form functional | [ ] |
| **Day-zero runbook signed off** | Watch + Sprint | `operations/runbook-day-zero.md` reviewed by on-call; rollback path tested in chaos-week 0 (M5 gate per `sprint/milestone-M5.md`) | [ ] |
| **Lens channel dashboard live** with M0–M4 baseline data | Lens + Signal | Dashboard URL committed; per-channel cohort table reads from PostHog + Stripe; ≥1 weekly review documented | [ ] |
| **Substantiation files committed** — `claim-pricing-positioning.md`, `claim-defensible-wedge.md`, `claim-code-vs-surface-findings.md` (per `channel-plan.md` §4) | Penny + Scout + Hook + Herald + Comply | All three files exist in `marketing/claims-substantiation/`; verifier dates ≤90d; Proof CI passes | [ ] |
| **Cookie banner + CCPA "Do Not Sell or Share" footer live** on marketing site | Comply + Forge + Vega | Production site renders banner on first visit; `/privacy#do-not-sell` route renders | [ ] |

---

## T-14 (week 14.5)

| Item | Owner | Verification | Status |
|---|---|---|---|
| **Product Hunt hunter recruited + briefed** — target 50–100 day-1 votes (`channel-plan.md` §2.4) | Signal | Hunter confirmed by name; PH listing draft shared; gallery video ≤30s approved by Optic + Herald | [ ] |
| **HN account warmed up** — Jo's account has ≥4 helpful comments on adjacent threads in the last 60 days (per `channel-plan.md` §2.2 risk row) | Signal (account: Jo) | Jo's HN comment history audited; account karma ≥10; comment cadence verified | [ ] |
| **Press list pitched** — 5–10 indie tech newsletters: TLDR, Console.dev, Refind, Bytes, Pointer, Indie Hackers Daily, Why-A-Founder, Dense Discovery, The Pragmatic Engineer (community), Indie Worldwide newsletter | Signal + Herald | Pitch sent to each (per-newsletter angle, not blast); replies tracked in `marketing/press-tracker.md`; at least 2 confirmed mentions for launch week | [ ] |
| **Brand-voice copy locked across landing, in-app, email** | Herald + Proof | `pnpm run brand-voice:grade` green across all surfaces; Proof signs off on per-surface grade ceilings | [ ] |
| **Production deploy to staging; full regression matrix re-run** | Forge + Verify | Verify regression matrix 100% green on staging deploy; `tests/` suite passes; `pnpm run verify:e2e` green (M5 gate per `sprint/milestone-M5.md`) | [ ] |
| **Sentry alerts wired; on-call rotation locked** | Crash + Watch | PagerDuty schedule confirmed for T-0 + T+7 window; Sentry alert rules verified against threat-model §5.4 Critical SLA | [ ] |
| **Discord AMA communities confirmed (3 communities)** for launch-week AMA slots | Signal | 3 communities named + AMA dates booked at T-7 (per `channel-plan.md` §2.5) | [ ] |
| **Partner co-marketing decision** — any partner signed? If not, partner channel is pre-launch nurture only (per `channel-plan.md` §2.8) | Signal | Decision documented in `marketing/partner-status.md`; if signed, co-marketing post drafted | [ ] |

---

## T-7 (week 15)

| Item | Owner | Verification | Status |
|---|---|---|---|
| **Embargoed beta-tester launch (T-7 → T-0)** — alpha-list users get exclusive access; ask for testimonials | Signal + Jo (1:1 onboarding for Managed alpha) | Embargo email sent; ≥5 testimonials collected by T-2 (these seed launch-day social proof) | [ ] |
| **All channel launch posts scheduled** — X thread (Typefully or native), HN draft (cannot schedule — manual submit at T-0), IH post (scheduled), PH listing (locked by hunter), blog launch post (CMS scheduled), Reddit per-subreddit posts (scheduled per each subreddit's promo-day rules) | Signal + Herald | Each post's scheduled-time + UTM link committed to `marketing/launch-week-schedule.md` | [ ] |
| **DNS final cutover** on `studiozero.dev` apex + `app.studiozero.dev` + `status.studiozero.dev` | Forge + Pipeline | DNS propagation verified globally via DNS checker; CDN cache warmed; TLS cert valid | [ ] |
| **Stripe production mode dry-run** — synthetic test charge against test Managed tier; refund confirmed; webhook reconciliation green (per ARCH-D4) | Ledger + Forge | `tests/integration/stripe-checkout-and-webhook.spec.ts` green against prod-mirror; test charge refunded; webhook lag ≤30s | [ ] |
| **AMA dates booked** in 3 Discord communities (per T-14 confirmation) | Signal | 3 AMA dates locked + announced in respective communities | [ ] |
| **R21(c) check** — paying Managed alpha count at week 15? Target ≥5 (gate landed at M2 close, week 9; this is the post-M2 cohort check) | Signal + Penny | Stripe dashboard count of `subscriptions.status='active'` on Managed Starter or Managed Pro; if <5, escalation per `channel-plan.md` §6 (this is the last pre-launch escalation window) | [ ] |

---

## T-3 (week 15.5)

| Item | Owner | Verification | Status |
|---|---|---|---|
| **Final all-hands launch sim** — runbook walk-through; rollback drill; on-call confirmed; escalation tree posted | BigBrain + Watch + Sprint | Meeting notes committed to `operations/launch-sim-T-3.md`; every layer lead signs off | [ ] |
| **Marketing assets reviewed by Proof + Comply final pass** | Proof + Comply | Final brand-voice grader green; substantiation files re-verified (no stale dates); FTC #ad disclosure verified on every Reddit + partner co-marketing post | [ ] |
| **Stripe production mode toggled live** | Ledger | Stripe live keys deployed; webhook endpoint pointed to prod; per-region refund matrix active (PRD §17 #20) | [ ] |
| **Cookie banner + CCPA footer re-verified in production** | Comply + Vega | Cypress / Playwright test against prod URL; banner renders; CCPA link reachable | [ ] |
| **AI System Card v0.1 interim machinery verified on production** — `X-AI-Generated` header on every response; `<meta>` tag on every page (PRD §11.3 / §17 #18) | Comply + Forge | curl spot-check returns header; HTML inspection shows meta tag | [ ] |

---

## T-1 (week 15.9)

| Item | Owner | Verification | Status |
|---|---|---|---|
| **Pre-launch announce on X / IH / Discord** — "Tomorrow morning." | Herald + Signal | Post published on each channel; UTM-tagged; Lens captures impressions | [ ] |
| **Status page set to "Launch day" notice** at `status.studiozero.dev` | Watch | Status page banner reads "Launch day — extra-attentive monitoring in effect." Refresh + recheck. | [ ] |
| **Final dogfood re-run** — Studio Zero audits its own production codebase; verdict ≥ PASS WITH FIXES per self-dogfood gate (R8 / §18.4) | BigBrain + Jury | Verdict committed to `dogfood/m5-launch-eve.json`; if FAIL, launch is paused until remediation | [ ] |
| **Press-list re-pings** — 2 confirmed mentions verified for launch-week scheduled publication | Signal | Editor reply-confirms in `marketing/press-tracker.md` | [ ] |
| **On-call alert ack-test** — fire a synthetic Critical alert; verify PagerDuty escalates within SLA | Watch + Crash | Synthetic alert fires; on-call acks ≤5min; alert cleared | [ ] |

---

## T-0 — Launch day (week 16)

**Default day-of-week: Tuesday or Wednesday.** Launching Monday or weekend kills HN + PH day-1 traction per `channel-plan.md` §2.4 risk row.

| Time (UTC) | Item | Owner | Verification |
|---|---|---|---|
| **06:00** | **Production deploy to prod** — final code freeze; Pipeline ships green build; Forge verifies prod runs all-green | Forge + Pipeline | Prod URL returns 200; `studiozero.dev` + `app.studiozero.dev` healthcheck green |
| **07:00** | Watch + Crash + Shield go on dedicated channel (Slack `#launch-day`); Sentry dashboard open | Watch + Crash + Shield | Channel populated; dashboards loaded |
| **08:01** | **Product Hunt listing goes live** (00:01 PT) — hunter publishes; Jo + Signal + Herald reply to every comment for 18 hours | Hunter + Signal + Jo + Herald | PH listing URL committed to `marketing/launch-week-schedule.md` |
| **09:00** | **Synthetic check** — one full audit run on a public reference repo (`studio-zero/dogfood-target`); verdict + timing logged | Verify | Run ID committed; runtime within p95 SLO band |
| **12:00** | **Launch posts go live in parallel:** X thread, HN Show HN submission + first comment, IH launch post, blog launch post live on `studiozero.dev/blog/launch` | Signal + Herald | Each post URL + timestamp committed to `marketing/launch-week-schedule.md`; ≥4 channels live (M5 CI scrape gate) |
| **12:30** | First HN comment posted within 60s of submission (HN convention per `06-social-post.md` §2) | Jo | HN thread comment timestamp |
| **14:00** | **BigBrain monitors Sentry + status page + first signups + first Stripe charges** | BigBrain + Lens | Sentry error rate ≤baseline; signups dashboard updating; ≥1 Stripe charge by 14:00 ideal (not a hard gate) |
| **15:00** | **Reddit per-subreddit launch announces go live** per each subreddit's promo-day rules; FTC #ad disclosure on first line of each | Signal | Each post URL committed; upvote-ratio monitored hourly (cut threshold per `channel-plan.md` §2.6) |
| **18:00** | **Engagement push** — reply to every HN comment, every X reply, every IH comment, every PH comment | Jo + Signal + Herald | Reply backlog ≤0 by 20:00 |
| **23:00** | **Day-1 metrics review with Lens** — channel-by-channel attribution; first signups counted; first paying conversions counted; R21(c) verdict at T-0 close (≥5 paying Managed gate held from week 9) | Signal + Lens + Penny + BigBrain | Day-1 readout committed to `marketing/launch-readout-T-0.md` |

---

## T+1 to T+7 — Sustained launch week

| Item | Cadence | Owner | Verification |
|---|---|---|---|
| **Daily 09:00 UTC standup** — Watch on-call + Signal + Penny + BigBrain | Daily, 30min, T+1 → T+7 | BigBrain (chair) | Standup notes committed to `operations/launch-week-standup.md` |
| **Daily engagement push** — top HN thread replies (where new comments lawn-mower in), X replies, Discord presence, Reddit replies | Daily | Jo + Signal + Herald | Reply backlog ≤0 each day at 22:00 UTC |
| **Discord AMAs in 3 communities** — booked at T-14; executed T+2 → T+5 | One per day for 3 days | Signal + Jo (host) | AMA transcripts committed; signup attribution via UTM |
| **Hotfix path tested (R-T+3 simulated)** — controlled rollback drill on a feature flag | Once, T+3 | Watch + Forge | Drill outcome committed to `operations/launch-week-rollback-drill.md` |
| **Status page incident discipline** — every customer-impacting issue gets a status-page incident (open/update/resolve) within SLA | As-needed | Watch + Siren | Status-page history populated |
| **PH listing comment cadence** — Jo replies to every PH comment for first 48 hours | Daily T-0 → T+2 | Jo | Reply count + reply latency tracked |
| **HN thread cadence** — Jo replies to every top-level + every second-level comment for first 48 hours | Daily T-0 → T+2 | Jo | Reply count + thread depth tracked |
| **R21(c) hold check** — daily ≥5 paying Managed count from Stripe; if any churn, flag immediately | Daily | Signal + Penny | Daily count in launch readout |

---

## T+30 — Post-launch retro window

| Item | Owner | Verification |
|---|---|---|
| **Penny revisits pricing with first 30-day data** — first 5 paying customers cohort per R10 / `pricing.md` §3 D4 A/B-test readout | Penny + Hook + Lens | `finance/pricing-v2-readout.md` published; D4 lock-tier decision (if 200 signups reached); v2 of `pricing.md` supersedes if any tier moves |
| **Sprint milestone retro for M5** | Sprint | `sprint/retro-M5.md` published with every layer lead's contribution |
| **Lens channel ROI report** — channel-by-channel CAC, signup-rate, paid-conversion rate, 30-day retention; per-channel cut/continue/double-down verdict (per `channel-plan.md` §5.3) | Lens + Signal | `marketing/channel-roi-T+30.md` committed; channel-plan v2 references the readout |
| **Hook A/B test cohort 1 readout** — every experiment running at launch (CTA copy, pricing A/B if D4 landed at $19/$29, landing-page variant) | Hook + Lens | Readout in `hook/experiments-T+30.md`; learning extracted; next experiments queued |
| **BigBrain launch postmortem** — what worked, what failed, what changes for V1.5 launch | BigBrain | `operations/launch-postmortem-M5.md` committed; circulated to all layer leads |
| **R21(c) final verdict** — was the ≥5 paying Managed gate held through 30-day cohort? If yes, R21 mitigation (c) closes. If churn dropped count below 5 during the 30-day window, retention escalation: Penny + Signal + Jo design retention play | Penny + Signal + BigBrain | R21(c) status committed to `sprint/owner-matrix.md` row update |
| **Channel-plan v2 supersedes** — Signal authors v2 of `channel-plan.md` reflecting T+30 cohort data; underperforming channels cut; winning channels doubled-down | Signal | `channel-plan.md` v2 committed; v1 preserved per supersede convention |

---

## Hard constraints (apply to every row above)

1. **Every channel post passes Herald brand-voice CI grader** (`pnpm run brand-voice:grade` green). No exceptions — Proof rejects the build (`herald-brand-voice.md` §11).
2. **Every comparative or capability claim has substantiation file at `marketing/claims-substantiation/<claim-id>.md`** (Herald §8 + Comply gate). Missing file = post does not ship.
3. **Penny price-reveal sequencing honored** (`pricing.md` §3 + `channel-plan.md` §3.2): cold acquisition leads with "free Surface audit"; Managed-tier price-reveal is a 1:1 founder moment, not a marketing-page bullet.
4. **FTC #ad disclosure on every Reddit + partner co-marketing post** (PRD §15.5 + Comply).
5. **Paid placement is off-limits at MVP** unless §6-channel-plan escalation trigger fires + Meter signs off against the $3k untouchable reserve (R21 mitigation (d)).
6. **R21(c) gate (≥5 paying Managed at M2 close)** was held at week 9; this checklist's job is to *not lose ground* on that gate through T+30. Any churn drops are escalated within 24h.

---

## Signal exit-gate self-verdict (Phase 8 launch-checklist)

| Gate | Status |
|---|---|
| Day-by-day rows T-30 → T+30 cover every M5 exit-gate item from `sprint/milestone-M5.md` (DMCA, ≥4 GTM channels active, day-zero runbook, status page, WCAG audit) | PASS |
| Every channel-plan §2 channel has at least one row in this checklist with timestamped first-post URL committed by T-0 (M5 CI scrape gate) | PASS |
| R21(c) check rows present at T-7, T-0, T+1..T+7 daily, T+30 final | PASS |
| Hard constraints (brand voice, substantiation, price-reveal, FTC, paid budget, R21(c)) restated at the bottom so they don't drift | PASS |
| Owner named on every row; verification artifact named on every row | PASS |

**Signal's verdict on Phase 8 launch-checklist exit gate: PASS.**

---

*Launch checklist v1.0. Signal updates rows in-place as they complete (`[x]`); CI scrapes for ≥4 channels with URLs at T-0 per M5 gate. v2 supersedes after T+30 retro.*
