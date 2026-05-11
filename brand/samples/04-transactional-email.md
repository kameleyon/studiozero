# Sample 04 — Transactional emails (E1, E2, E4)

**Surface:** lifecycle email program per PRD §6.3.
**Voice check:** grade 8. Subject ≤ 50 characters where possible. Preheader ≤ 100. No exclamation marks. No emoji.
**Compliance:** every email includes a one-click unsubscribe link in the footer per CAN-SPAM, CASL, PECR. Sender identification (legal name + postal address) in the footer per CAN-SPAM. AI-disclosure footer line per PRD §11.3.

---

## E1 — Signup confirmation / first-audit prompt

**Trigger:** Supabase Auth `user.confirmed` event.
**From:** Studio Zero `<hello@studiozero.dev>`
**Reply-to:** same (monitored by Jo).

**Subject:**
> Your free audit is ready.

**Preheader:**
> Connect a repo or paste a URL — we'll run a Surface audit on the house.

**Body:**

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

Studio Zero · [postal address per CAN-SPAM]
This is a transactional email about your account.
Unsubscribe from product emails · Privacy · Manage preferences
Studio Zero is an AI system. See methodology: studiozero.dev/methodology
```

**Word count:** 96. Grade 7.4.

**Voice notes:**
- "Welcome to Studio Zero" is the one allowed welcome word — short, no exclamation.
- "On the house" is the most casual phrase in the whole brand library; it earns its place once, in the preheader, where it lifts the open rate without breaking voice.
- Pre-empts the strict-gate emotion before the first run, exactly like the landing body.

---

## E2 — Post-FAIL upsell (Surface → Code)

**Trigger:** `runs.verdict = 'FAIL'` on a free-tier Surface audit. Fires once per run; throttled at 1 per project per 24h.
**Locked replacement for "Have us fix it" — Auto-PR is deferred to V1.5, so the upsell is the deeper audit tier.**

**Subject:**
> 14 issues on staging.acme.dev — and we only ran Surface.

**Preheader:**
> Code audit reads your source. It finds 3 to 5 times as many.

**Body:**

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

Studio Zero · [postal address]
Unsubscribe from product emails · Privacy
Studio Zero is an AI system. See methodology: studiozero.dev/methodology
```

**Word count:** 132. Grade 8.

**Voice notes:**
- Subject line never contains the word "failed." The number does the work.
- Subject line names the *domain audited* — specificity earns the open.
- "And we only ran Surface" sets up the upsell from the first 50 characters.
- The "3 to 5 times as many" claim must have a substantiation file checked in before launch.
- Body's "What we found, briefly" mirrors the verdict-screen voice — same brand on every surface.

**Compliance flags:**
- Comparative claim ("3 to 5 times as many") — substantiation file required.
- CAN-SPAM unsubscribe in footer.

---

## E4 — 30-day re-audit reminder (T-3 days)

**Trigger:** projects where most recent verdict is PASS WITH FIXES, 27 days ago, no re-audit run since. Single send; not a sequence.

**Subject:**
> 3 days left on your free re-audit.

**Preheader:**
> Same project, same rubric, no charge.

**Body:**

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

Studio Zero · [postal address]
You're receiving this because acme-marketing-site has an
open re-audit window. Manage notification preferences.
Studio Zero is an AI system. See methodology: studiozero.dev/methodology
```

**Word count:** 73. Grade 7.5.

**Voice notes:**
- "Heads-up" earns its place in the body opener: this is a time-sensitive notice and the register should match.
- Names the *project*, the *last score*, the *gap*, and the *deadline* — every number the customer needs to decide.
- "No charge" not "free!" — restrained voice on the offer.
- Same-rubric-version disclosure pre-empts the "why did my score change?" complaint and earns trust on the next verdict.

---

## Footer template (all transactional emails)

```
Studio Zero · [Legal entity, postal address per CAN-SPAM]
[Transactional context line — varies per email]
Unsubscribe from product emails · Privacy · Manage preferences
Studio Zero is an AI system. See methodology: studiozero.dev/methodology
```

- CAN-SPAM: physical postal address + sender identification + opt-out within 10 days (per PRD §6.3, §14.5).
- PECR: identification + unsubscribe.
- EU AI Act Art. 50 disclosure: the methodology link is the customer-facing surface for the AI System Card (PRD §11.3, §14.5).

---

## What none of these emails contain

- *We're thrilled, we're excited, we're proud.*
- *Hi there!* / *Hey [name]!*
- Emoji in the subject line or body.
- More than one primary CTA per email.
- "Click here" — links are self-describing.
- "Don't miss out" / "Last chance" / "Hurry" — false urgency.
- Any superscript trademark mark (™, ®) in body copy — Comply owns where these appear, never in marketing prose.
