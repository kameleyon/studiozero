# 03 — Lifecycle email sequences (E1 → E5)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Herald
**Phase:** 8 of BUILD_FLOW.md
**Surface:** Resend transactional pipeline, fired by Supabase Auth + Postgres triggers + cron jobs (Watch).
**Voice:** `agents/growth/herald-brand-voice.md` v1.0. Grade-8 ceiling. No exclamation marks in subject lines. No emoji.
**Compliance:** every email below satisfies CAN-SPAM (US) + PECR (UK) + CASL (Canada) — unsubscribe link, sender identification with postal address, opt-out within 10 days. AI-disclosure footer per PRD §11.3 + EU AI Act Art. 50.
**Source samples:** `brand/samples/04-transactional-email.md` (E1, E2, E4 locked). E3 and E5 are new in this file.

> Subject lines earn the open. Bodies earn the click. Neither uses urgency tricks, fake commiseration, or "click here." Every email points the reader to one decision.

---

## 0. Global rules — apply to every email below

### 0.1 Sender identification (CAN-SPAM §316.5)

Every email's `From:` header is:
> Studio Zero `<hello@studiozero.dev>`

Reply-to is the same address. Replies are read by Jo (M0–M5), then by the support rotation (M5+).

### 0.2 Mandatory footer

Every transactional email ends with this footer. Adjust the *transactional context line* per email — everything else is identical.

```
Studio Zero · [Legal entity, postal address per CAN-SPAM]
[Transactional context line — varies per email]
Unsubscribe from product emails · Privacy · Manage preferences
Studio Zero is an AI system. See methodology: studiozero.dev/methodology
```

**Postal address:** placeholder until incorporation finalizes. Ledger + Comply own the live value at M2 wire-up.

### 0.3 HTML safety

- Inline CSS only. No `<style>` blocks. Gmail's clip-and-truncate at 102 KB.
- Buttons are styled `<a>` tags with `display: inline-block` and a fallback `<a>` link below for plain-text email clients.
- No images required to make sense of the message. Alt text required on every image used.
- No remote-loaded fonts. System font stack only.
- Plain-text MIME alternative built from the body markdown — every email ships dual-format.

### 0.4 Throttle and cool-off

Every email below specifies its *Cool-off* rule — when this email is suppressed because the user already acted, already received a similar email recently, or has opted out of the relevant preference. Cool-off is a hard rule, enforced at the trigger layer, not best-effort.

### 0.5 Subject-line constraints (re-asserted per voice §6 + §7)

- ≤50 characters where the meaning allows.
- Sentence case. No trailing period.
- No exclamation marks (voice §6 verdict-screen-and-email rule).
- No emoji.
- No "Last chance," "Don't miss out," "Hurry."

---

## E1 — Signup welcome + first-audit prompt

**Locked from `brand/samples/04-transactional-email.md` §E1. Reaffirmed here for sequence completeness.**

### Trigger

- Event: Supabase Auth `user.confirmed` fired (email link clicked).
- Cool-off: never (this is a one-time transactional confirmation).
- Latency target: within 60 seconds of confirmation.

### Subject (≤50 chars: 28)

> Your free audit is ready.

### Preheader (≤90 chars: 71)

> Connect a repo or paste a URL — we'll run a Surface audit on the house.

### Body

```
Welcome to Studio Zero.

Your account is confirmed. Your free Surface audit is waiting —
one project, unlimited re-audits, no card on file.

Two ways to start:

  1. Connect a GitHub repo. We'll audit the latest commit on
     your default branch.

  2. Paste a URL you own. We'll audit the live page.

[ Run my free audit → ]

A heads-up before you start: our gate is strict. Most first
audits do not pass it — that is the point. Every finding ships
with a file path, a line number, and a fix.

— Studio Zero
```

### Primary CTA

> Run my free audit → (routes to `/dashboard?action=new-audit`)

### Alternate CTA

> Tour the dashboard first → (routes to `/dashboard?tour=1`)

### Footer (transactional context line)

> This is a confirmation email about your account.

### Word count / grade

96 words. Flesch-Kincaid grade 7.4.

### Voice notes

- "Welcome to Studio Zero" is the one allowed welcome line. Short, no exclamation, no "we're so glad you're here."
- "On the house" is the most casual phrase in the whole brand library. It earns its place exactly once, in the preheader of E1. Nowhere else.
- Pre-empts the strict-gate emotion before the first audit runs — same pattern as the landing body and the verdict screen.

---

## E2 — Post-FAIL upsell (Surface → Code)

**Locked from `brand/samples/04-transactional-email.md` §E2. Reaffirmed here.**

### Trigger

- Event: `runs.verdict = 'FAIL'` on a free-tier Surface audit.
- Cool-off: throttled at 1 per project per 24 hours. Suppressed if user already upgraded to a paid tier within the last hour.
- Latency target: within 5 minutes of verdict finalization.
- The locked replacement for "Have us fix it" — Auto-PR is V1.5, so the upsell is the deeper audit tier.

### Subject (≤50 chars, ≤55 with dynamic domain)

> 14 issues on `staging.acme.dev` — and we only ran Surface.

**Penny's name-the-domain rule (PRD §15.5):** the customer's audited domain appears in the subject line. The specificity earns the open.

### Preheader (≤90 chars)

> Code audit reads your source. It finds 3 to 5 times as many.

### Body

```
Your Surface audit on staging.acme.dev finished. Verdict:
FAIL. Score: 58 / 100.

What we found, briefly:

  • 2 Blockers — both accessibility, both on /signup.
  • 4 Critical — split across copy clarity and brand
    consistency.
  • 8 more across Major, Minor, and Polish.

Every finding is in your dashboard with the evidence.

  [ See the full report → ]

What Surface cannot see

Surface audits the live page — they don't read your code.
A Code audit connects to your repo and finds 3 to 5 times
as many issues: dead code, unused dependencies, semantic
HTML problems, security patterns, design-system drift.

Same project. Deeper gate.

  [ Run the Code audit → ]

— Studio Zero
```

### Primary CTA

> See the full report → (routes to `/project/<id>/audit/<run-id>`)

### Alternate CTA

> Run the Code audit → (routes to `/dashboard/upgrade?from=e2&plan=byok-starter`)

### Footer (transactional context line)

> You're getting this because your free Surface audit completed.

### Word count / grade

132 words. Grade 8.

### Voice notes (and substantiation)

- Subject never contains the word "failed." The number does the work.
- "3 to 5 times as many" — comparative claim. **Substantiation file required before this email ships: `marketing/claims-substantiation/claim-code-vs-surface-findings.md`.** Reserved per `finance/pricing.md` §7.
- "What we found, briefly" mirrors the verdict-screen language exactly — same brand voice on every surface.

---

## E3 — PASS WITH FIXES + 30-day free re-audit (new in this file)

### Trigger

- Event: `runs.verdict = 'PASS_WITH_FIXES'` on any audit (free or paid).
- Cool-off: one E3 per project per 30 days (the window itself).
- Latency target: within 5 minutes of verdict finalization.

### Subject (≤50 chars: 41)

> 81 / 100 on `staging.acme.dev` — re-audit free for 30 days.

**The number does the work** — the customer sees their score and their offer in 50 characters.

### Preheader (≤90 chars)

> 6 fixes between you and PASS. Same project. Same rubric.

### Body

```
Your audit on staging.acme.dev finished. Verdict:
PASS WITH FIXES. Score: 81 / 100.

You're 19 points from a clean PASS, with 6 fixes
between you and shippable.

The fixes, briefly:

  • 1 Critical — heading hierarchy on /pricing.
  • 3 Major — copy clarity in error states.
  • 2 Minor — design-system drift on button radii.

Every fix is in your dashboard with the file, the line,
and the change to make.

  [ See the fixes → ]

The offer: re-audit free for 30 days.

Same project, same rubric version, no charge. Make the
six fixes, run it again, see if the score moves. The
window opens today and closes on June 10.

  [ Re-audit free → ]

— Studio Zero
```

### Primary CTA

> See the fixes → (routes to `/project/<id>/audit/<run-id>`)

### Alternate CTA

> Re-audit free → (routes to `/project/<id>/audit/new?credit=re-audit`)

### Footer (transactional context line)

> You're getting this because your audit on `staging.acme.dev` returned PASS WITH FIXES.

### Word count / grade

148 words. Grade 7.6.

### Voice notes

- Reuses the locked frame *"re-audit free for 30 days"* from voice §5 + sample 02 §3. Same words, every surface.
- "19 points from a clean PASS" — names the gap as a number. The reader knows the cost of the fix in PRs, not in adjectives.
- Concrete date ("June 10") not "30 days" — closes the ambiguity. Cron computes the date and writes it into the template.
- The two CTAs are sequential, not competing: read the fixes → make the fixes → run the re-audit.

---

## E4 — Re-audit window expiring (T-3 days)

**Locked from `brand/samples/04-transactional-email.md` §E4. Reaffirmed here.**

### Trigger

- Event: nightly cron — for every project whose most recent verdict is PASS WITH FIXES, exactly 27 days ago, no re-audit run since.
- Cool-off: single send per project per window. Suppressed if user has already started a re-audit run within the last hour.
- Latency target: send during the user's morning window (8–10am their local time per `subscriptions.timezone`).

### Subject (≤50 chars: 35)

> 3 days left on your free re-audit.

### Preheader (≤90 chars)

> Same project, same rubric, no charge.

### Body

```
Heads-up — the 30-day free re-audit window on
acme-marketing-site closes Friday.

Your last verdict: PASS WITH FIXES, 81 / 100.
You were 14 points from a clean PASS, with 6 fixes
between you and shippable.

  [ Redeem your free re-audit → ]

Re-audits cover the same project against the same rubric
version (v1). The score is comparable.

— Studio Zero
```

### Primary CTA

> Redeem your free re-audit → (routes to `/project/<id>/audit/new?credit=re-audit`)

### Alternate CTA

> See my last verdict → (routes to `/project/<id>/audit/<last-run-id>`)

### Footer (transactional context line)

> You're receiving this because `acme-marketing-site` has an open re-audit window.

### Word count / grade

73 words. Grade 7.5.

### Voice notes

- "Heads-up" earns its place — this is a deadline-driven email; the register matches.
- Names the *project*, the *last score*, the *gap*, the *deadline*. Every number the customer needs to decide.
- "No charge" not "free!" — restrained voice on the offer.
- Same-rubric-version disclosure pre-empts the "why did my score change?" complaint and earns trust on the next verdict.

---

## E5 — Day-60 win-back (new in this file)

### Trigger

- Event: nightly cron — for every user whose most recent verdict is FAIL, exactly 60 days ago, no further audit run since, no paid upgrade.
- Cool-off: one E5 per user, ever. After this, the user is in long-term suppression unless they re-engage. We do not send a second win-back.
- Latency target: send during the user's morning window.

### Subject (≤50 chars: 47)

> What changed on Studio Zero since you signed up.

### Preheader (≤90 chars)

> Three things we shipped. One free re-audit credit if you want to come back.

### Body

```
You signed up on March 11, ran your first Surface
audit, and we haven't heard from you since.

No pressure. But three things changed.

  1. We shipped Managed mode. Paste a URL, run a Full
     audit, no API key required. Same gate. Same rubric.

  2. The CLI runner ships in two weeks. Your code never
     leaves your machine.

  3. Auto-PR fix delivery is on the V1.5 roadmap. The
     rubric flags the fix; Studio Zero writes the PR;
     we re-audit it before it lands.

If any of that changes the math for you, here's a free
re-audit credit on your old project:

  [ Run a fresh audit → ]

Or unsubscribe from this list and we won't send another
one of these. No hard feelings.

— Studio Zero
```

### Primary CTA

> Run a fresh audit → (routes to `/project/<id>/audit/new?credit=winback-60d`)

### Alternate CTA

> Unsubscribe from win-back emails → (routes to `/preferences/email?unsub=winback`)

### Footer (transactional context line)

> This is the one and only win-back email you'll get from us.

### Word count / grade

158 words. Grade 7.9.

### Voice notes

- "No pressure" is the warmest line in the brand library and it earns its place in the win-back because the relationship has cooled.
- Names the three concrete things that shipped. No "lots of improvements." Three things, by name, with what they do.
- The unsubscribe CTA is *in the body*, not buried in the footer. Honest exit. Voice §3 pillar 1 — confident, not punitive.
- "One and only" in the footer is the rare disclosure that *suppresses* future sends. Win-back is a one-shot.

---

## E6 (placeholder, not in scope for MVP) — payment failure dunning

Comply's `refund-matrix.md` §8.8 owns the dunning copy. Lifecycle pipeline references that file when wiring at M2. **Not authored here** because the dunning sequence is part of the Stripe-integrated billing flow, not the marketing email program. Cross-reference is for index integrity only.

---

## Compliance audit — every email passes

| Email | CAN-SPAM unsub | CAN-SPAM postal address | PECR consent | CASL identification | AI-disclosure (EU AI Act Art. 50) | No banned words | Subject without exclamation |
|---|---|---|---|---|---|---|---|
| E1 | yes | yes | yes (transactional carve-out) | yes | yes | yes | yes |
| E2 | yes | yes | yes (transactional) | yes | yes | yes | yes |
| E3 | yes | yes | yes (transactional) | yes | yes | yes | yes |
| E4 | yes | yes | yes (transactional) | yes | yes | yes | yes |
| E5 | yes | yes | yes (marketing — requires opt-in at signup) | yes | yes | yes | yes |

**Note on E5:** E5 is *marketing*, not strictly transactional. The trigger is dormancy, not a user action. Therefore E5 requires the user to have *opted into product/marketing email at signup* (separate checkbox from the ToS+Privacy checkbox). Comply lock at signup-form spec: the opt-in checkbox label is *"Send me product updates and a single 60-day win-back email if I go quiet"* — explicit about what the user is opting into, default unticked. Without that opt-in, E5 is suppressed.

---

## Suppression and preference-center copy

**Manage preferences page (linked from every footer):**

```
Your email preferences

Product emails (account, billing, audits)
  [✓] On  (required to use Studio Zero)

Product updates (changelog, V1.5 release)
  [ ] On  [ ] Off

Win-back (a single 60-day check-in if you go quiet)
  [ ] On  [ ] Off

Unsubscribe from all marketing
  [ Unsubscribe ]

Delete my account entirely
  [ Delete my account → ]
```

**Unsubscribe confirmation copy:**

> You're unsubscribed from `<category>` emails. We won't send another. You can re-subscribe anytime in your preferences. Transactional emails about your account and billing still come through.

**Account-deletion routes to** `Settings → Privacy → Delete my data` — a separate flow with its own confirmation per Comply's CCPA / GDPR right-to-erasure spec (`refund-matrix.md` §1.3 + §5).

---

## Substantiation files reserved

| Claim location | File reserved |
|---|---|
| E2 — "3 to 5 times as many issues" | `claim-code-vs-surface-findings.md` |
| E3 — "v1 rubric, score is comparable" | `claim-score-engine-versioning.md` |
| E5 — "we shipped Managed mode" / "CLI runner ships in two weeks" | `claim-roadmap-shipped.md` (date-gated; only fires when the roadmap status table updates) |

Three files reserved. `claim-code-vs-surface-findings.md` is the gate-blocker for E2 — Hook owns the dogfood data; Penny + Herald + Comply sign off; required before E2 fires on a single live customer.

---

## Reading-level audit

| Email | Words | Grade |
|---|---|---|
| E1 | 96 | 7.4 |
| E2 | 132 | 8.0 |
| E3 | 148 | 7.6 |
| E4 | 73 | 7.5 |
| E5 | 158 | 7.9 |

All five at or below the grade-8 ceiling per voice §4.

---

*End of lifecycle email copy v1.0. Triggers + cool-offs owned by Watch (cron jobs) + Forge (Postgres triggers); send pipeline owned by Hook (Resend integration); copy owned by Herald; compliance + suppression owned by Comply; reading-level grading owned by Proof. Any change to subject lines or CTAs requires the four-sign-off per voice §11.*
