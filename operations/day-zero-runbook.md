# Day-Zero Runbook — Launch Day Operations (T-0)

**Owner:** Watch (incident response + on-call) · Signal (launch-day GTM actions) · BigBrain (overall launch coordination)
**Status:** M4 Batch 2 — Watch's M4 Batch 1 placeholder at `operations/runbook-day-zero.md` extended with Signal's T-0 launch-day actions. **M5 final content.**
**Audience:** Watch on-call primary + Signal + Jo + Crash + Shield + Lens + Penny + BigBrain — anyone with an action on T-0.
**Cross-references:** `operations/runbook-day-zero.md` (Watch's incident-response runbook), `marketing/launch-checklist.md` T-0 row, `marketing/launch-day-rehearsal.md`, `marketing/channel-plan.md` §2, `sprint/milestone-M5.md` exit gate.

> **Goal of this doc.** Get every named owner on the same page, hour-by-hour, on T-0 so the launch executes without surprises. Watch's incident-response procedures remain at `runbook-day-zero.md`; this file extends that with Signal's GTM actions at T-0, mapped onto the same 06:00–23:00 UTC clock.

---

## 1. Pre-T-0 (T-1 evening) verification

Watch + Signal jointly verify before going to bed on T-1:

- [ ] Status page banner queued for "Launch day — extra-attentive monitoring in effect" toggle at 06:00 UTC (per `launch-checklist.md` T-1 row 2)
- [ ] Sentry alerts wired; PagerDuty schedule confirmed for T-0 → T+7 (per Crash + Watch on-call rota)
- [ ] All 4+ GTM channel posts scheduled in Buffer / Typefully / PH scheduler (per `marketing/launch-day-rehearsal.md` §2.1)
- [ ] Hunter confirmed for 08:01 UTC PH publish (per `launch-checklist.md` T-14 row 1)
- [ ] HN account warmed (per `marketing/channels/hn/staging.md` §3 verification)
- [ ] DMCA + Art. 27 + cookie banner + CCPA footer + `/security` + `/.well-known/security.txt` all LIVE in production (per `compliance/m4-compliance-audit.md`)
- [ ] Substantiation files all ≤90d at T-1 (per Comply gate on `marketing/launch-day-rehearsal.md` row 28)
- [ ] On-call alert ack-test fired at T-1 (per `launch-checklist.md` T-1 row 5)
- [ ] Final dogfood re-run committed (per `launch-checklist.md` T-1 row 3) — if FAIL, **launch is paused per BIGBRAIN.md Hard Rule §1**

---

## 2. T-0 hour-by-hour timeline (UTC)

### 2.1 06:00 UTC — Production deploy + smoke test

| Activity                                                                                                          | Owner            | Pass criterion                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| **Production deploy to prod** — final code freeze; Pipeline ships green build; Forge verifies prod runs all-green | Forge + Pipeline | `studiozero.dev` + `app.studiozero.dev` + `status.studiozero.dev` all return 200 from 2 region checks |
| Smoke test: curl `/healthz`, `/`, `/pricing`, `/security`, `/dmca`, `/privacy`, `/terms`, `/aup`                  | Forge            | All 200; response body matches expected route per `apps/web/app/*/page.tsx`                           |
| Status-page banner toggles to "Launch day — extra-attentive monitoring in effect"                                 | Watch            | Banner renders at `status.studiozero.dev`                                                             |
| Sentry filters set to production environment; alerts routed to #launch-day Slack                                  | Crash + Watch    | Synthetic test event fires + reaches #launch-day                                                      |
| Lens dashboard reading: zero traffic baseline captured                                                            | Lens             | Dashboard snapshot at 06:00 UTC saved to `marketing/launch-readout-T-0.md` baseline section           |

**Failure case:** If prod deploy fails → Forge rollback (one-click Vercel); Sprint posts to #launch-day; T-0 paused until green; Sprint decides re-launch window.

---

### 2.2 07:00 UTC — All-hands go-live in #launch-day

| Activity                                                                                                  | Owner             |
| --------------------------------------------------------------------------------------------------------- | ----------------- |
| Watch + Crash + Shield + Sprint + Signal + Lens + Penny + BigBrain + Jo all online in Slack `#launch-day` | All named layers  |
| Sentry dashboard open on Watch's screen                                                                   | Watch             |
| Stripe Dashboard open on Penny's screen                                                                   | Penny             |
| Lens dashboard open on Signal + BigBrain screens                                                          | Signal + BigBrain |
| PagerDuty schedule confirmed                                                                              | Crash + Watch     |
| #launch-day channel pinned with rolling event log (every action logged)                                   | Sprint (chair)    |

---

### 2.3 08:01 UTC — Product Hunt listing goes live

| Activity                                                                             | Owner           |
| ------------------------------------------------------------------------------------ | --------------- |
| **Hunter publishes PH listing** at 00:01 PT (08:01 UTC)                              | Hunter          |
| Jo posts first comment within 60 seconds (per `marketing/channels/ph/staging.md` §3) | Jo              |
| Signal + Herald monitor for early comments; draft suggested-reply notes for Jo       | Signal + Herald |
| PH listing URL committed to `marketing/launch-week-schedule.md`                      | Signal          |

**If hunter publishes off-schedule:** Per `marketing/channels/ph/staging.md` §4 backup-hunter list, Signal pages a backup hunter immediately. If no backup available, PH launch slides to next valid Tuesday/Wednesday window — Sprint decides whether to delay the rest of the launch or proceed without PH.

---

### 2.4 09:00 UTC — First synthetic audit run + Signal channel-readiness check

| Activity                                                                                                                                                                                                          | Owner        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **First synthetic audit run on Studio Zero's own codebase** — one full audit on `github.com/<studio-zero-org>/studio-zero` per the dogfood pattern; verdict + timing logged to `audits/T-0-launch-synthetic.json` | Verify       |
| Signal does final pass on X / HN / IH / blog scheduled posts — confirms all scheduled for 12:00 UTC                                                                                                               | Signal       |
| Lens confirms UTM passthrough working end-to-end (synthetic clickthrough → signup → Stripe trial)                                                                                                                 | Lens + Forge |

---

### 2.5 10:00–11:30 UTC — Pre-12:00 quiet window

| Activity                                                                       | Owner           |
| ------------------------------------------------------------------------------ | --------------- |
| Watch monitors Sentry baseline; no expected traffic spike yet                  | Watch           |
| Jo continues PH reply cadence (≤30 min latency per reply)                      | Jo              |
| Signal finalizes social-media drafts ready for 12:00 UTC                       | Signal          |
| Pre-launch tweet at 11:00 UTC: "Launching in 60 minutes" — pinned for the hour | Signal + Herald |

---

### 2.6 12:00 UTC — **Launch posts go live in parallel** (the simultaneous wave)

The 4-channel simultaneous wave per `marketing/launch-checklist.md` T-0 row 4 + `marketing/channel-plan.md` channel matrix.

| Asset                               | Channel | Platform action                                                                                                                   | Owner           |
| ----------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **X launch thread (6 tweets)**      | X       | Buffer / Typefully fires automatically at 12:00 UTC; or Signal manually triggers from staged drafts                               | Signal + Herald |
| **HN Show HN submission**           | HN      | Jo manually submits `news.ycombinator.com/submit` with title from `marketing/channels/hn/staging.md` §1; first comment within 60s | Jo              |
| **IH launch milestone post**        | IH      | Signal posts on IndieHackers Milestones from Studio Zero's account                                                                | Signal + Herald |
| **Blog launch post**                | Blog    | Post at `studiozero.dev/blog/launch` flips from staging to published via CMS                                                      | Lens (CMS)      |
| **PH listing already live** (08:01) | PH      | (continuing engagement, not a new post)                                                                                           | Jo + Signal     |

**Each URL committed to `marketing/launch-week-schedule.md` with timestamp.** The M5 CI scrape gate at `sprint/milestone-M5.md` line 103 checks for ≥4 timestamped first-post URLs in this file at T-0.

---

### 2.7 12:30 UTC — HN first comment + reply latency

| Activity                                                                 | Owner                |
| ------------------------------------------------------------------------ | -------------------- |
| **Jo's first HN comment** must be posted within 60 seconds of submission | Jo                   |
| HN reply latency: ≤30 minutes per top-level comment for next 12 hours    | Jo                   |
| X reply latency: ≤30 minutes per @-reply for next 6 hours                | Jo + Signal + Herald |
| IH reply latency: ≤60 minutes per comment for next 12 hours              | Jo                   |
| PH reply latency: ≤30 minutes per comment for next 12 hours              | Jo                   |

**Latency monitoring:** Signal + Lens watch the unreplied-backlog dashboard. If backlog ≥3 unreplied on any channel for >45 minutes, Signal escalates: Herald drafts reply for Jo to send, or Signal replies on Studio Zero's account.

---

### 2.8 14:00 UTC — BigBrain reads signups + first Stripe charges

| Activity                                                                                                        | Owner            | Pass criterion                                                         |
| --------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| **BigBrain monitors:** Sentry error rate; status page healthy; signups dashboard updating; first Stripe charges | BigBrain + Lens  | Sentry error rate ≤baseline; signups dashboard ≥5 by 14:00 UTC ideally |
| First Stripe charge by 14:00 UTC ideal (not a hard gate; T+24h target ≥1)                                       | Penny + BigBrain | Stripe dashboard `charges.list?since=T-0` count ≥1                     |
| Lens runs first cohort attribution: which channel is dominant                                                   | Lens             | Cohort table updated in `marketing/launch-readout-T-0.md`              |
| Watch reports any P1 or P2 incidents from morning                                                               | Watch            | Status page + Sentry dashboard cross-referenced                        |

**If P1 fires:** Watch follows the existing incident-response runbook at `operations/runbook-day-zero.md` "When a P1 page fires" section. Mitigation first, root-cause second. Status-page incident posted within 5 min of detection.

---

### 2.9 15:00 UTC — Reddit per-subreddit announces

| Activity                                                                                | Owner           |
| --------------------------------------------------------------------------------------- | --------------- |
| **Reddit per-subreddit launch announces go live** per each subreddit's promo-day rules  | Signal          |
| r/SaaS post: per `marketing/channels/reddit/staging.md` §2                              | Signal          |
| r/EntrepreneurRideAlong post: per `marketing/channels/reddit/staging.md` §3             | Signal          |
| r/webdev: only if T-21 verification was POSITIVE; otherwise listening-only              | Signal + Comply |
| **FTC #ad disclosure on FIRST line verified before each submit** (Comply hard gate)     | Comply          |
| Upvote-ratio monitored hourly; <85% = cut threshold per `channel-plan.md` §2.6 risk row | Signal + Lens   |

---

### 2.10 18:00 UTC — Engagement push

| Activity                                        | Owner                |
| ----------------------------------------------- | -------------------- |
| **Reply to every HN comment** posted in last 6h | Jo                   |
| **Reply to every X reply / quote** in last 6h   | Jo + Signal + Herald |
| **Reply to every IH comment** in last 6h        | Jo                   |
| **Reply to every PH comment** in last 6h        | Jo                   |
| **Reply to every Reddit comment** in last 3h    | Signal               |
| Reply backlog target: zero by 20:00 UTC         | Jo + Signal + Herald |

**This is the highest-leverage 4-hour window of the launch.** HN front-page algorithm depth-ranks threads by author-reply latency; PH algorithm de-ranks listings whose maker doesn't reply.

---

### 2.11 23:00 UTC — Day-1 metrics review

| Activity                                                                                                                     | Owner                            | Pass criterion                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| **Day-1 metrics review with Lens** — channel-by-channel attribution; first signups counted; first paying conversions counted | Signal + Lens + Penny + BigBrain | Day-1 readout committed to `marketing/launch-readout-T-0.md`                             |
| **R21(c) hold check** — paying Managed count from Stripe; alert if any churn                                                 | Signal + Penny                   | Stripe count ≥5 (gate held); if churn dropped below, escalation per `channel-plan.md` §6 |
| HN status: front-page rank + comment count + upvote ratio                                                                    | Signal                           | Front-page top 30 for ≥2h ideal; recorded in readout                                     |
| PH status: top-N for the day + upvote count + comment count                                                                  | Signal                           | Top-5 ideal; recorded in readout                                                         |
| Status-page summary: any incidents posted today                                                                              | Watch                            | Recorded                                                                                 |
| Watch hands off to T+1 on-call rotation                                                                                      | Watch                            | Handoff signed at `operations/handoffs/T-0.md`                                           |

---

## 3. Owner cheat sheet (who does what when)

Quick reference. Full timeline in §2.

| Owner        | T-1 evening              | 06:00 UTC              | 08:01 UTC            | 12:00 UTC                     | 14:00 UTC                | 15:00 UTC   | 18:00 UTC                | 23:00 UTC               |
| ------------ | ------------------------ | ---------------------- | -------------------- | ----------------------------- | ------------------------ | ----------- | ------------------------ | ----------------------- |
| **Forge**    | Final code freeze        | Production deploy      | (standby)            | (standby)                     | (standby)                | (standby)   | (standby)                | (handoff to Pipeline)   |
| **Pipeline** | Build green              | Verify deploy          | (standby)            | (standby)                     | (standby)                | (standby)   | (standby)                | (standby)               |
| **Watch**    | Sentry verified          | Status banner toggle   | Monitor              | Monitor                       | Incident summary         | Monitor     | Monitor                  | Handoff to T+1 on-call  |
| **Crash**    | PagerDuty verified       | Alerts route confirmed | Monitor              | Monitor                       | (standby)                | (standby)   | (standby)                | (standby)               |
| **Shield**   | (standby)                | (standby)              | (standby)            | (standby)                     | (standby)                | (standby)   | (standby)                | (standby)               |
| **Signal**   | Launch posts staged      | (standby)              | PH listing live      | **X + IH + blog live**        | First-cohort read        | Reddit live | Engagement push          | Metrics readout         |
| **Herald**   | Final voice grade        | (standby)              | Reply drafts         | **All channels live**         | Reply drafts             | (standby)   | Engagement push          | (standby)               |
| **Jo**       | Final dogfood verdict    | (standby)              | **PH first comment** | **HN submit + first comment** | PH + HN replies          | (standby)   | **All channels replies** | (standby)               |
| **Lens**     | Dashboard baselined      | Capture zero baseline  | (standby)            | (standby)                     | Cohort attribution       | UTM check   | Backlog dashboard        | Day-1 metrics committed |
| **Penny**    | (standby)                | (standby)              | (standby)            | (standby)                     | First Stripe charge read | (standby)   | (standby)                | R21(c) verdict          |
| **Comply**   | All HUMAN-pending closed | (standby)              | (standby)            | (standby)                     | (standby)                | FTC gate    | (standby)                | (standby)               |
| **BigBrain** | Final readiness sign-off | All-hands check-in     | (standby)            | (standby)                     | Mid-day verdict          | (standby)   | Engagement check         | Day-1 verdict           |
| **Sprint**   | T-1 final checklist      | All-hands chair        | (standby)            | (standby)                     | (standby)                | (standby)   | (standby)                | Event log committed     |

---

## 4. Escalation tree (when something goes wrong)

For incidents during T-0 launch:

1. **First responder** is the owner closest to the symptom (e.g., Stripe charge fails → Penny first; web app 500 → Watch first).
2. **First responder posts in #launch-day** with: symptom, scope, mitigation underway, ETA.
3. **Watch acknowledges within 5 min** if not the first responder.
4. **Sprint pages BigBrain** if mitigation is not in flight within 15 min.
5. **BigBrain decides** whether to halt launch / roll back / proceed with degraded mode.
6. **Comms:** if customer-impacting > 100 users, customer-comms email via Resend per `runbook-day-zero.md` Communication norms (M5 placeholder template at `marketing/copy/incident-comm-template.md`).

**Hard pause conditions** (Sprint halts launch unilaterally):

- Production database goes down or RLS bypass discovered
- BYOK Vault key plaintext leak detected
- Stripe webhook signature failures affecting payments
- Auth flow breaks (cannot sign in / cannot sign up)
- Sentry error rate >10× baseline for >5 minutes
- Status page goes down (the customer-visible status surface itself failing is a higher-order failure)

---

## 5. Communication norms on T-0

| Channel                         | Used for                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| **Slack #launch-day**           | Real-time coordination; every action logged; Sprint chairs the channel                 |
| **Slack #incident** (if active) | Customer-impacting incident only; status-page updates flow from here                   |
| **Email**                       | Customer comms for >100-user impact; investor comms (BigBrain decides) for >24h outage |
| **Status page**                 | Every customer-impacting incident: open / update / resolve per Watch's runbook         |
| **#launch-day pinned thread**   | Rolling event log; commit-by-commit + post-by-post URL log; Sprint owns the pin        |

---

## 6. Post-T-0 handoff to T+1 routine

At 23:30 UTC on T-0:

1. Watch hands off T+1 on-call to incoming primary (per `oncall-rotation.md`).
2. Sprint commits the `marketing/launch-readout-T-0.md` summary.
3. Signal commits the `marketing/launch-week-schedule.md` with all timestamped URLs (M5 CI scrape gate satisfied).
4. BigBrain commits a one-paragraph T-0 verdict to `operations/launch-week-standup.md` day 1 entry.
5. Penny commits the R21(c) post-launch number to `marketing/r21c-alpha-pipeline-status.md` §3.3.
6. Comply re-verifies: all 10 controls from `compliance/m4-compliance-audit.md` still LIVE in production after the deploy.

**T+1 daily standup at 09:00 UTC starts the sustained launch-week cadence** per `marketing/launch-checklist.md` T+1 → T+7 rows.

---

## 7. Cross-references

- `operations/runbook-day-zero.md` — Watch's incident-response procedures (the "during the shift" steps). This file extends with launch-day GTM actions.
- `marketing/launch-checklist.md` — the T-30 → T+30 day-by-day playbook; this file is the T-0 detailed hour-by-hour.
- `marketing/launch-day-rehearsal.md` — T-7 dress rehearsal that verifies this file's items will execute green at T-0.
- `marketing/channel-plan.md` §2 — per-channel cadence + KPI + risk rows.
- `sprint/milestone-M5.md` exit gate — CI scrapes for ≥4 GTM channels with timestamped URLs.

---

## 8. Signal + Watch joint sign-off

| Gate                                                                            | Owner    | Status              |
| ------------------------------------------------------------------------------- | -------- | ------------------- |
| Watch's `operations/runbook-day-zero.md` reviewed by on-call (M5 exit gate row) | Watch    | [ ] verified at T-3 |
| Signal's T-0 launch-day actions enumerated hour-by-hour (this file §2)          | Signal   | [ ] this file       |
| Owner cheat sheet (§3) covers every named layer                                 | Sprint   | [ ] this file       |
| Escalation tree (§4) + hard pause conditions explicit                           | BigBrain | [ ] this file       |
| Cross-references to other launch docs all reachable                             | Sprint   | [ ] this file       |

**Joint verdict: this file is the M5 launch-day operational source-of-truth.** Reviewed jointly by Watch + Signal + Sprint at T-3 final pass per `marketing/launch-checklist.md` T-3 row 1.

---

## 9. Final pre-flight checklist (Vega + Forge — M5 close)

Run this checklist at T-1 evening AND immediately before the 06:00 UTC production deploy on T-0. Every box must be green; any FAIL halts launch per `BIGBRAIN.md` Hard Rule §1.

### 9.1 Regression — final green build

| #   | Check                             | Command / source                           | Pass criterion                                                         | Owner    |
| --- | --------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- | -------- |
| F1  | Root-level regression suite green | `pnpm test` from repo root (or `npm test`) | All vitest specs PASS, zero skipped without justification              | Pipeline |
| F2  | Web build green                   | `cd apps/web && npm run build`             | `next build` exits 0, no warnings beyond expected metadata-base notice | Forge    |
| F3  | Web typecheck green               | `cd apps/web && npm run typecheck`         | `tsc --noEmit` exits 0                                                 | Forge    |
| F4  | Web lint green                    | `cd apps/web && npm run lint`              | `next lint` exits 0, no error-level rules                              | Forge    |
| F5  | Schema validation suite green     | `pnpm test -- schema-validate.test.ts`     | All AJV schemas validate against the seed corpus                       | Atlas    |

### 9.2 Accessibility — final WCAG axe scan

| #   | Check                                                                                      | Command / source                                                                                                                     | Pass criterion                                                              | Owner |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----- |
| A1  | Axe-core gate green on all 12 primary-flow pages × 2 viewports (mobile-320 + desktop-1280) | `cd apps/web && npm run test:a11y`                                                                                                   | Zero Critical / Serious violations on every page-viewport combo             | Halo  |
| A2  | New M5 routes covered by the axe gate                                                      | Verify `tests/e2e/a11y-primary-flows.spec.ts` includes `/audit`, `/build`, `/modes`, `/blog`, `/blog/why-audit`, `/pricing`, `/dmca` | All seven routes in PRIMARY_FLOW_ROUTES list and scanning at both viewports | Halo  |
| A3  | FAIL-verdict primary-flow scan                                                             | `npm run test:a11y -- a11y-fail-flow.spec.ts`                                                                                        | Zero Critical / Serious; verdict screen color-pair PASS                     | Halo  |

### 9.3 Lighthouse — five hero routes

Target: performance ≥90 + accessibility ≥95 + best-practices ≥90 + SEO ≥95.

| Route             | Performance | Accessibility | Best practices | SEO | Owner       |
| ----------------- | ----------- | ------------- | -------------- | --- | ----------- |
| `/` (landing)     | ≥90         | ≥95           | ≥90            | ≥95 | Vega + Halo |
| `/pricing`        | ≥90         | ≥95           | ≥90            | ≥95 | Vega + Halo |
| `/audit`          | ≥90         | ≥95           | ≥90            | ≥95 | Vega + Halo |
| `/blog/why-audit` | ≥90         | ≥95           | ≥90            | ≥95 | Vega + Halo |
| `/modes`          | ≥90         | ≥95           | ≥90            | ≥95 | Vega + Halo |

Run: `npx lighthouse <url> --quiet --chrome-flags="--headless" --output=json --output-path=./lighthouse-<slug>.json`. Verify each `categories.<axis>.score * 100 ≥ target`. Archive JSON in `operations/lighthouse-T0/`.

### 9.4 Security headers — production response check

`curl -sI https://studiozero.dev/` must include every header below. Any missing header is a FAIL.

| Header                      | Expected value                                                       | Source |
| --------------------------- | -------------------------------------------------------------------- | ------ |
| `Content-Security-Policy`   | `default-src 'self'; …` (full policy from `apps/web/next.config.ts`) | Shield |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                       | Forge  |
| `X-Content-Type-Options`    | `nosniff`                                                            | Shield |
| `X-Frame-Options`           | `DENY`                                                               | Shield |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                    | Shield |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), interest-cohort=()`       | Shield |
| `X-AI-Generated`            | `studio-zero` (EU AI Act Art. 50 interim)                            | Comply |

HSTS preload submitted to `hstspreload.org` per Shield M3; verify the domain appears on the Chrome preload list at T-7 before this gate runs.

### 9.5 Cookie banner — first-visit verification

| #   | Check                                                                                           | Pass criterion                                                                                      | Owner       |
| --- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| C1  | Cookie banner renders on first visit to production `/` in incognito (Chrome + Firefox + Safari) | Banner visible at bottom of viewport, three buttons (Accept all / Reject all / Customize)           | Lens + Vega |
| C2  | Banner is keyboard-accessible                                                                   | Tab order: Accept → Reject → Customize → close. Esc dismisses. Focus returns to triggering element. | Halo        |
| C3  | Analytics fires only after consent                                                              | PostHog network call absent until user clicks Accept all or Customize → analytics ON                | Lens        |
| C4  | Consent persists in `sz_consent` localStorage after first interaction                           | Reload → banner does not re-render                                                                  | Lens        |
| C5  | Status route at `/status` does not gate analytics on consent                                    | `/status` traffic counted regardless (operational transparency, IA sitemap row)                     | Lens        |

### 9.6 SEO surface check — production response

| #   | Check                                                                                                                                                                      | Pass criterion                                                             | Owner        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------ |
| S1  | `https://studiozero.dev/sitemap.xml` returns 200 with every public route enumerated in `apps/web/app/sitemap.ts`                                                           | All 16 routes present                                                      | Vega         |
| S2  | `https://studiozero.dev/robots.txt` returns 200, allows public marketing, disallows `/app/`, `/api/`, `/admin/`, `/auth/`, `/onboarding/`, `/healthz`, `/signup`, `/login` | All Disallow lines present, Sitemap line correct                           | Vega         |
| S3  | Every public route returns 200 with non-empty `<title>`, `<meta name="description">`, and a canonical `<link rel="canonical">`                                             | All checks PASS via `curl + grep` script                                   | Vega         |
| S4  | Open Graph image renders on Twitter / LinkedIn / Slack unfurl test                                                                                                         | Test unfurl on /, /pricing, /audit, /blog/why-audit                        | Pixel + Vega |
| S5  | Structured data validates                                                                                                                                                  | Google Rich Results test on /pricing (Product) + /blog/why-audit (Article) | Vega         |

### 9.7 Sentry + PostHog — production telemetry verification

| #   | Check                                                                                 | Pass criterion                                                                                | Owner  |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| T1  | Sentry production project receives synthetic error within 60s of a controlled trigger | Synthetic event ID lands in Sentry dashboard                                                  | Watch  |
| T2  | `surface: app` and `surface: marketing` tags fire correctly on captured events        | Tag distribution visible in Sentry dashboard                                                  | Watch  |
| T3  | `beforeSend` PII redaction active (Cipher M4)                                         | Synthetic event with PII payload arrives with PII redacted                                    | Cipher |
| T4  | PostHog primary-route page views captured (Lens analytics-events.v1)                  | `pageview` events visible for `/`, `/pricing`, `/audit`, `/modes`, `/blog`, `/blog/why-audit` | Lens   |
| T5  | Status-page link present in app-shell footer (Watch M4)                               | Footer renders `<a href="https://status.studiozero.dev">Status</a>` on every authed page      | Watch  |

### 9.8 Marketing-site Sentry tagging

Per M5 §G — single project, two tags:

- `apps/web` Sentry project covers both app shell and customer-facing surface.
- Events arriving from `app/app/**/*` routes tagged `surface: app`.
- Events arriving from `app/(marketing public routes)` tagged `surface: marketing`.
- A marketing-only project would be over-engineering at M5; one project with the `surface` tag is sufficient. Decision recorded; revisit at V1.5 if event volume diverges materially.

### 9.9 Final binary — go / no-go

| Gate                                      | Pass criterion                                             | Sign-off                 |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------------ |
| All F1–F5 green                           | regression matrix CLEAN                                    | Pipeline + Forge + Atlas |
| All A1–A3 green                           | axe-core zero Critical/Serious                             | Halo                     |
| All Lighthouse scores meet target         | five hero routes                                           | Vega + Halo              |
| All security headers present              | production response                                        | Shield + Forge           |
| Cookie banner working                     | first-visit checks PASS                                    | Lens + Vega              |
| SEO surfaces correct                      | sitemap + robots + titles + canonical                      | Vega                     |
| Sentry + PostHog wired                    | telemetry verification PASS                                | Watch + Lens             |
| DMCA agent registered or filing in flight | `compliance/dmca-designated-agent.md` + `/dmca` route LIVE | Comply                   |

**Single binary verdict — GO / NO-GO** signed off by Sprint + BigBrain + Jo at T-1 evening. Any NO-GO halts the 06:00 UTC deploy until resolved.

---

_Day-zero runbook v1.0 (M4 Batch 2). Watch + Signal jointly own. v2 supersedes after T+30 retro with actual-vs-planned variance flagged._
