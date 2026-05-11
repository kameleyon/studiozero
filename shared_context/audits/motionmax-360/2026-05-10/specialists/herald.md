# Specialist Audit — Herald (Marketing Copy + Lifecycle/Email)

**Project:** motionmax-360
**Date:** 2026-05-10
**Specialist:** Herald (Growth — marketing copy, brand voice, lifecycle/transactional email)
**Audience:** tool-savvy creative adults — content creators, marketers, video producers (mobile-heavy, US-first, 11 languages claimed)
**Scope (per brief):** transactional email (signup, reset, receipts), lifecycle (onboarding drip, re-engagement, win-back), landing copy, in-app announcement copy, voice consistency. Cross-ref Proof for FTC/UCPD substantiation.

Severity rubric: Blocker / Critical / Major / Minor / Polish.

---

## §11 — Lifecycle Copy + Email

### Findings (grouped by surface, sorted by severity)

---

#### A. Transactional email — brand + voice

**[CRITICAL] Email CTA gradient uses orange `#F5B049` — violates brand-only-aqua-and-gold rule.**
- File: `supabase/functions/_shared/emailTemplate.ts:55`
- Evidence: `background:linear-gradient(135deg,#F5B049 0%,#E4C875 100%)` and the matching border `border:1px solid rgba(245,176,73,.45)`. Brand spec says aqua `#14C8CC` + gold `#E4C875` only; `#F5B049` is the un-swapped template amber that has been removed everywhere else (see comments in `src/styles/autopost-tokens.css:11`, `settings-tokens.css:11`, `support-tokens.css:11`).
- Why it matters for Herald's category: every transactional email a paying customer ever sees uses this template. The CTA button — the highest-attention element — is off-brand.
- Fix: swap `#F5B049` → `#E4C875` in the gradient stop and `rgba(245,176,73,.45)` → `rgba(228,200,117,.45)` in the border, in `emailTemplate.ts:55`. Effort: XS.

**[CRITICAL] Body copy embeds the same orange `#F5B049` accent indirectly via inline styles inheriting from the gradient surface (and gold callouts mostly use the correct `#E4C875` — OK), but the announcement modal's CSS file is the bigger violator.**
- File: `src/components/announcements/v2-announcement.css:11,162,163,269,300`
- Evidence: 5 occurrences of `#F5B049` in announcement CSS variables and gradient text fills. The header comment at line 11 even reads `--gold → #F5B049` — locking the wrong hex into the design language at the comment-doc layer.
- Why it matters: this is the "v2.0 is here" modal that fires on first authenticated load — it is the first in-app brand impression after signup. Off-brand here undermines the entire welcome moment.
- Fix: replace `#F5B049` with `#E4C875` in v2-announcement.css and update the doc comment at `:11`. Effort: XS.

**[CRITICAL] Welcome / payment-failed / cancellation copy contains no physical mailing address — CAN-SPAM §7(a)(5) violation.**
- File: `supabase/functions/_shared/emailTemplate.ts:111-119` (footer)
- Evidence: footer renders only `footerNote` (default: "Replying to this email reaches the MotionMax team.") and a `© MotionMax · motionmax.io` line. No street address. Welcome / payment / cancellation emails arguably have a marketing component (the welcome and cancellation include a `pricing` CTA / nudges), making CAN-SPAM applicable.
- Cross-ref: Comply / legal — already acknowledged in `PRODUCTION_CHECKLIST_EMAIL_NOTIFICATIONS.md` §5 ("Physical address in footer (CAN-SPAM §7(a)(5)) — ❌").
- Fix: extend `EmailLayoutInput` with an optional `mailingAddress` prop (or hard-code in the footer block at lines 111-119), default it to MotionMax's registered business address, render under the © line as `<p style="margin:0;font-size:11px;color:#5A6268;">{{address}}</p>`. Effort: XS.

**[CRITICAL] Newsletter sender writes no `List-Unsubscribe` / `List-Unsubscribe-Post` header — Gmail/Yahoo Feb 2024 bulk-sender rules violation; risks the entire sending domain.**
- File: `supabase/functions/admin-send-newsletter/index.ts:69-76`
- Evidence: Resend POST body includes only `from`, `to`, `subject`, `html`, `text`. No `headers: { 'List-Unsubscribe': '<...>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }`. Once volume crosses 5k/day, Gmail will reject; before that, complaint rate >0.3% lands the domain on the bulk-sender penalty box and breaks transactional email too.
- Why it matters for Herald: a single bad newsletter takes down welcome / payment-failed / cancellation deliverability — the entire lifecycle stops.
- Fix: in the `sendOne` body at `index.ts:69-76`, add `headers: { 'List-Unsubscribe': \`<\${APP_URL}/unsubscribe?u=\${userId}&c=\${campaignId}>\`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }`. The `Unsubscribe.tsx` page already exists at `src/pages/Unsubscribe.tsx`. Effort: S.

**[CRITICAL] No marketing-opt-in audit on the *transactional* welcome path, AND the newsletter sender already filters by `marketing_opt_in = true` on `profiles` (good), but copy in the welcome email pre-loads expectations of marketing follow-ups without disclosing it.**
- File: `supabase/functions/_shared/resend.ts:78-86` (signup welcome body)
- Evidence: body says "Schedule auto-posts so a steady stream of content goes out without daily effort" — but never mentions whether the user will hear from MotionMax again or how to opt out. EU UCPD / GDPR transparency expects clear marketing-vs-transactional distinction at point-of-collect; legal copy should hand off to a "Manage email preferences" link in every transactional footer.
- Fix: append `<p style="font-size:12px;color:#8A9198;">You'll get product updates and tips. <a href="\${APP_URL}/settings#email">Manage email preferences</a>.</p>` to the welcome bodyHtml; ensure the Settings page exposes the matching opt-out toggle (separate Halo finding likely). Effort: S.

---

#### B. Transactional email — content quality

**[MAJOR] Welcome subject line `"Welcome to MotionMax"` is generic and ignores the audience's psychology — content creators respond to outcome promises, not category labels.**
- File: `supabase/functions/_shared/resend.ts:88` (`subject: "Welcome to MotionMax"`)
- Evidence: this is the inbox-list line every signup sees; Mailchimp / Litmus benchmarks show outcome subjects ("Your first AI video is 60 seconds away") outperform category subjects by 12-30% open rate for SaaS signup. The headline already does the welcome work; the subject is wasted real estate.
- Fix: change to `subject: "Your first AI video is 60 seconds away"` or `"Let's make your first video — start here"`. Pair with preheader at `:74` already set ("Your MotionMax account is ready — start creating.") — both echo each other; rewrite preheader to extend rather than restate, e.g. `"3 things to try before you close the tab."`. Effort: XS.

**[MAJOR] Welcome bodyHtml at `resend.ts:79-85` mixes "Creator plan" gating into a free-tier welcome — confusing on first read.**
- File: `supabase/functions/_shared/resend.ts:84` — bullet 3 reads "Schedule auto-posts so a steady stream of content goes out without daily effort *(Creator plan)*."
- Evidence: this email is sent for both free + paid signups (per JSDoc at `:71`). Free users see a feature with a paywall hint inside their welcome — feels like an upsell at the wrong moment. Free welcomes should activate, not upsell; upsell belongs in day-3 / day-7 lifecycle email.
- Fix: branch the bullet on plan, or remove the third bullet from the welcome and move it into a future onboarding email (see [BLOCKER] below). Effort: S.

**[MAJOR] Payment-failed copy at `resend.ts:97-100` buries the CTA urgency and uses passive voice.**
- File: `supabase/functions/_shared/resend.ts:97-100`
- Evidence: `"We couldn't process your most recent payment. Update your payment method to keep your subscription active — your account stays accessible during a short grace period."` Two sentences before any specifics. No grace-period length. No retry attempt count. No date the subscription pauses. Dunning best practice (Profitwell, Baremetrics): name the date, name the dollar amount, name the next retry.
- Fix: rewrite as `"Your payment of $\${amount} on \${date} didn't go through. We'll try again on \${nextRetryDate}. Update your card now to avoid losing access on \${cancelDate}."` Requires plumbing amount/date from the Stripe webhook into `sendPaymentFailedEmail` signature at `:92`. Effort: M.

**[MAJOR] Cancellation copy at `resend.ts:112-115` includes zero retention or feedback hooks.**
- File: `supabase/functions/_shared/resend.ts:112-115`
- Evidence: `"Your subscription has been cancelled. You'll keep access until the end of your current billing period. Want to come back? You can resubscribe any time."` No exit-survey link (despite `cancel-with-reason` already capturing reasons in-app), no win-back coupon mention, no "what you'll miss" framing. Cancellation email is the highest-leverage win-back touchpoint and this one is wasted.
- Fix: add a 1-question micro-survey CTA ("Tell us why — 30 seconds") linking to a Settings → Cancellation reason page, AND add a win-back hook ("Come back within 30 days for 50% off your first month — code WELCOMEBACK"). Pair with cron-scheduled day-30 win-back email (see [BLOCKER]). Effort: M.

**[MAJOR] Greeting fallback `"Hi there,"` at `resend.ts:54` triggers when display_name is empty.**
- File: `supabase/functions/_shared/resend.ts:53-54`
- Evidence: signup welcome runs *before* a user has set a display name — meaning most welcome emails will read `"Hi there,"`. Personalization is half-implemented; no first-name capture from auth metadata, no fallback to email-handle (e.g. "Hi marc," for marc@gmail.com).
- Fix: in `greetingFor`, fall back to `name?.split(' ')[0]` when full name is provided, then to the local-part of the email address before defaulting to `"Hi there,"`. Effort: XS.

---

#### C. Lifecycle — missing entirely

**[BLOCKER] No onboarding drip exists. Only the day-0 welcome email is wired; nothing fires at day-1, day-3, day-7, day-14.**
- File: searched `supabase/functions/`, `worker/src/handlers/`, `worker/src/cron/` — no scheduler dispatches a day-N onboarding email. `notify-signup-welcome/index.ts` is the only welcome path. `worker/src/handlers/autopost/dailySummary.ts` exists but is NOT a user-facing drip.
- Why it matters for Herald: industry benchmarks (HubSpot, Customer.io 2024) — SaaS activation rises 30-50% when day-1/day-3 onboarding email is added. Audience is content creators with short attention spans; a single welcome won't hold them through the cinematic-render learning curve. NOT production-ready.
- Fix: add a `lifecycle_email_jobs` queue (cron-driven, daily 09:00 user TZ) that fires:
  - Day 1: "Did you finish your first video? Here's a 60s template that works."
  - Day 3 (if no generation yet): "Stuck? Here are 3 prompts our top creators use."
  - Day 7: "You're missing AutoPost — here's what it does in 60s."
  - Day 14 (if free): soft upsell with 1 testimonial + 20% first-month code.
  Implement as worker cron + Resend send + `email_preferences.lifecycle_opt_out` gate. Effort: L.

**[BLOCKER] No win-back / re-engagement sequence for cancelled or dormant users.**
- File: not present in `supabase/functions/`, `worker/src/`. `cancel-with-reason/index.ts` records the reason but emits no follow-up email.
- Evidence: `cancellation_reasons` table is written at `cancel-with-reason/index.ts:80` (manual path) — a downstream cron could read it and target win-back, but no such cron exists.
- Fix: add worker cron `winback.ts` that runs daily, queries users where `subscription.canceled_at` was 30 days ago AND no resubscribe occurred, sends a single "We miss you — 50% off your first month back" email. Add `dormant.ts` cron that targets free users with `last_generation_at < now() - 30 days`. Effort: L.

**[BLOCKER] No purchase-receipt email is sent on credit-pack purchase or one-time invoice — only Stripe's auto-receipt fires (unbranded, generic).**
- File: `supabase/functions/stripe-webhook/index.ts` — handles `invoice.paid` / `invoice.payment_succeeded` for subscriptions but does not emit a branded receipt. `update-pack-quantity/index.ts` likely fires for credit packs without an email.
- Evidence: `_shared/resend.ts` exports only welcome / signup-welcome / payment-failed / cancellation / generic-support — no `sendReceiptEmail`. Stripe's default receipt is unbranded and contradicts the brand voice rule.
- Fix: add `sendReceiptEmail(to, items[], total, receiptUrl)` to `resend.ts`, call from the `invoice.paid` webhook handler in `stripe-webhook/index.ts`, disable Stripe's default email-receipt (Stripe Dashboard → Customer emails → off) to avoid double-send. Effort: M.

**[CRITICAL] No password-reset email is composed by Herald — relies on Supabase GoTrue's default unbranded recovery template.**
- File: `supabase/functions/admin-send-reset-link/index.ts:113-120` (admin-triggered) and `src/hooks/useAuth.ts` (user-triggered, per the comment at `admin-send-reset-link/index.ts:113`).
- Evidence: `auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: '\${redirectBase}/auth' } })` — GoTrue dispatches the email using whatever template is configured in Supabase Dashboard → Authentication → Email Templates. There is no project-controlled template under `supabase/templates/` (no such dir exists). Default GoTrue copy reads: "Follow this link to reset the password for your user" — no MotionMax branding, no voice, no support footer.
- Why it matters: password-reset is the highest-anxiety email a user receives. Off-brand recovery email reduces trust and increases support tickets ("is this a phishing attempt?").
- Fix: author HTML templates for `recovery`, `confirmation`, `magic_link`, `email_change` using `buildEmail()` from `_shared/emailTemplate.ts`, paste into Supabase Dashboard → Auth → Email Templates. Or override SMTP entirely to send via Resend with the project template (more work, more control). Effort: M for templates only.

---

#### D. Marketing/landing copy — voice, claims, and consistency

**[CRITICAL] Self-contradictory marketing claims between landing and v2 announcement modal — undermines every numerical claim.**
- Files:
  - `src/config/landingContent.ts:34` says `"25+ Caption Styles"` AND `:24` says `"9+ AI voices"` AND `:40` says `"11 Languages"`
  - `src/components/announcements/V2AnnouncementModal.tsx:219` says `"30+ natural voices"` AND `:221` says `"13 languages"` AND `:236` says `"15+ caption styles"`
  - `marketing/src/pages/index.astro:13,22,27,80-81` mirrors landing (11 languages, 9+ voices, 25+ captions)
- Evidence: a user lands → sees "11 languages, 9+ voices, 25+ caption styles" → signs up → first in-app modal says "13 languages, 30+ voices, 15+ caption styles". One of these is false. Either landing under-claims or modal over-claims; either way, every other number on the site is now suspect to a tool-savvy audience.
- Cross-ref Proof: numerical superlatives without a source-of-truth tally violate FTC §5 substantiation. Herald's responsibility is to enforce a single canonical count per claim.
- Fix: consolidate counts into one source of truth (e.g. `src/config/brandClaims.ts`), import into landingContent, marketing index, and announcement modal. Pick the actual current numbers — verify by counting `src/components/voices/`, language list in i18n config, caption styles in editor — and align all surfaces. Effort: S to wire, M including verification.

**[CRITICAL] "Used by 2,400+ marketers" / "Join 2,400+ creators" — fabricated social proof, FTC §5 violation.**
- File: `src/pages/Landing.tsx:289,301` — line `:299` literally contains the comment `// TODO: replace 2,400+ with a real figure from your analytics/DB`. Mirrored at `marketing/src/pages/index.astro:202,213`.
- Evidence: code admits the number is placeholder. Audience is marketers / creators who recognize fabricated trust signals; backfires.
- Cross-ref Proof: Federal Trade Commission Endorsement Guides (16 CFR §255) — endorsement / numerical claim must reflect what a typical user can experience. False user counts are deceptive.
- Fix: either (a) wire to a real query (count of `profiles` with `created_at > 0` and at least one generation), or (b) remove the number entirely and use qualitative social proof ("Loved by independent creators worldwide") until real numbers are credible, or (c) replace with verifiable testimonial avatars only. Effort: XS to remove, M to wire.

**[CRITICAL] "Visual Stories" mode card on the landing page is a Storytelling-product remnant — flagged for removal in the audit brief.**
- File: `src/pages/Landing.tsx:431-436`
- Evidence: card title is `"Visual Stories"`, description: `"AI writes the script from your story idea, generates scene images, and narrates with matched emotion. Full creative control over tone and style."` — this is the storytelling pitch verbatim. Brief: "Storytelling product is being removed — flag every remnant."
- Fix: delete the Visual Stories card from the modes array at `Landing.tsx:431-436`; rebalance the grid (currently 2-col md:grid-cols-2 — will still balance with 3 modes by spanning the third or restyling as 3-up). Mirror in `marketing/src/pages/index.astro` if the same card appears there. Effort: S.

**[MAJOR] Hero feature copy "Claude AI researches your topic for accuracy — verified facts, real appearances, cultural context — then writes the script." over-promises factual accuracy, exposing FTC + EU AI Act risk.**
- File: `src/config/landingContent.ts:30`
- Evidence: marketing claim "verified facts" implies the product fact-checks output. Claude (via OpenRouter per stack) does not guarantee factual accuracy and Anthropic explicitly disclaims it. Repeating this on the landing page creates expectation mismatch when the AI hallucinates — and creates liability for downstream user damages.
- Cross-ref Proof: FTC AI guidance (Apr 2024 — "Keep Your AI Claims in Check"), EU AI Act Art. 50 (transparency obligations for generative AI).
- Fix: rewrite to verifiable claim — `"Claude AI researches your topic and drafts the script — review and edit before render."` Drop "verified facts" entirely. Effort: XS.

**[MAJOR] "Secure by Design" trust indicator with "Your data stays yours · Supabase-hosted infrastructure" needs substantiation.**
- File: `src/config/landingContent.ts:64-68`
- Evidence: "Secure by Design" is a superlative claim with no SOC2/ISO attestation, no certification badge, no third-party audit referenced. Tool-savvy audience recognizes the empty-trust-badge pattern; backfires.
- Cross-ref Proof: same FTC substantiation rule.
- Fix: replace with concrete statement that's verifiable today — `"Encrypted at rest and in transit"`, `"Hosted on Supabase + Render (US-east)"` — and link to the Privacy / Security page. If a SOC2 is in flight, change to `"SOC 2 Type II in progress (Q3 2026)"` only when actually true. Effort: XS.

**[MAJOR] Hero subhead `"Cinematic visuals. Natural voiceover. Seamless transitions. From one idea."` is on-brand but the H1 it pairs with is hidden (`sr-only`).**
- File: `src/pages/Landing.tsx:227`
- Evidence: `<h1 className="sr-only">MotionMax – AI Video Generation</h1>` — no visible H1. The largest visual text on the hero is the `<img src="/motion.png">` logo at `:234`. SEO and accessibility both expect a visible H1 with the value-prop, not a logo image. Herald's persuasion-funnel rule: above-the-fold needs a benefit-driven headline that gets read in 3 seconds.
- Fix: promote the subhead at `:247` to a visible `<h1>`, demote the logo image to its semantic role (logo only, not headline). Suggested H1 (8th-grade level, benefit-led): `"Turn one idea into a cinematic video — in minutes."` Effort: S.

**[MAJOR] The marketing site description meta still references "visual stories": `"Create stunning AI-generated cinematic videos, explainers, and visual stories from any text"`.**
- File: `marketing/src/pages/index.astro:102`
- Evidence: storytelling remnant inside the SEO meta description — affects every search result snippet.
- Fix: change to `"Create stunning AI-generated cinematic videos, explainers, and infographics from any text. AI scriptwriting, voiceover, image-to-video. Multi-language. Start free."` Effort: XS.

**[MINOR] Mode card "Smart Flow" tag is `"Infographics"` and example is `"Top 10 AI trends in 2026"` — currently dated for the audit (year 2026, brief date 2026-05-10). Marketing copy that references the present year ages instantly.**
- File: `src/pages/Landing.tsx:441`
- Fix: rewrite example to evergreen `"Top 10 AI trends this year"` or `"The top AI trends right now"`. Effort: XS.

**[MINOR] FAQ entry "What is MotionMax?" reads as an internal tagline rewrite, not a question a creator would ask in Google.**
- File: `src/config/landingContent.ts:93-96`
- Evidence: "What is MotionMax?" is a brand-search query (the user already knows the product). The FAQ is for SEO long-tail capture — the questions should match real Google search intent. Better candidates: `"How do I make an AI video from text?"`, `"Can I make a video without editing skills?"`, `"What's the best AI video generator for marketers?"`.
- Fix: rewrite the 7 FAQs around long-tail intent queries; keep the answers, change the questions. Coordinate with Signal (SEO) on the keyword set. Effort: S.

**[MINOR] Demo modal copy at `Landing.tsx:527-529` reads "Demo video coming soon" — visible to every user who clicks Watch Demo.**
- File: `src/pages/Landing.tsx:527`
- Evidence: visitor clicks the secondary CTA "Watch Demo" → modal opens → sees "Demo video coming soon". Damages credibility on the page that needs to convert.
- Fix: either embed the existing Guidde walkthrough already used at `:332-341` inside the modal (eliminating the "coming soon" placeholder), or remove the Watch Demo button entirely until a real video exists. Effort: XS.

---

#### E. In-app announcement copy (V2 modal) — voice + accuracy

**[MAJOR] Announcement claim "13 languages" contradicts every other surface (covered as Critical above) AND the modal includes feature claims that may not yet ship in v2.**
- File: `src/components/announcements/V2AnnouncementModal.tsx:219-225,251-254,269-271`
- Evidence:
  - "Clone your own voice in under a minute" — verify against actual clone flow timing in `VoiceLab.tsx`; if the typical clone takes longer, claim is misleading.
  - "lip-sync" — not visible on the landing page features; likely not in v2.
  - "LEGO, Barbie, Cardboard" style mentions — third-party trademarks (LEGO, Barbie). Trademark / IP risk.
- Fix: verify each numerical and feature claim against the actual v2.0 feature list, remove anything not shipping. Replace "LEGO, Barbie" with generic descriptors ("brick-built worlds, plastic-pop figures, cardboard cutouts"). Effort: M including verification.

**[MAJOR] Modal CTA `"Take me in"` is clever but ambiguous — clarity > cleverness for tool-savvy creators on first encounter.**
- File: `src/components/announcements/V2AnnouncementModal.tsx:278`
- Fix: change to `"Show me what's new"` (links to a dedicated /whats-new page if one exists) or `"Got it — back to my dashboard"`. Effort: XS.

**[MINOR] Announcement opt-out checkbox label `"Don't show this again"` lacks reassurance — users hesitate to dismiss because they may want to revisit.**
- File: `src/components/announcements/V2AnnouncementModal.tsx:291`
- Fix: append `" — find it later in Help → What's New"` and ensure that link exists in the Help page. Effort: S.

---

#### F. Operational / silent-failure copy issues affecting Herald's category

**[CRITICAL] Newsletter sender returns `ok: true` to admin even when `RESEND_API_KEY` is missing — admin is told the campaign was sent when zero emails were delivered.**
- File: `supabase/functions/admin-send-newsletter/index.ts:292-315`
- Evidence: `if (!apiKey) { ... mark sent_at, return JSON ok:true with warning text }` — but the response is rendered in admin UI as success. Admin clicks Send → sees green checkmark → walks away. No emails delivered. Cross-ref Trace's silent-failure category.
- Why Herald owns this finding: the admin compose UI is the primary lever Herald-style copy reaches users. A silently-failed send corrupts the marketing program.
- Fix: change to hard fail — return `status: 500, error: "RESEND_API_KEY not configured — campaign not sent"`, do NOT mark `sent_at` or flip status to `sent`. Effort: XS.

**[MAJOR] `_shared/resend.ts:25-28` swallows missing API key with `console.warn` and returns void — same silent-failure shape, transactional path.**
- File: `supabase/functions/_shared/resend.ts:25-28`
- Evidence: `if (!apiKey) { console.warn(...); return; }` — Stripe webhook completes 200 OK even though welcome / cancellation / payment-failed never sent. Already noted in the project's own checklist (`PRODUCTION_CHECKLIST_EMAIL_NOTIFICATIONS.md` Top 3 blocker #1).
- Fix: throw `new Error("RESEND_API_KEY not set")` instead of returning, and let the Stripe webhook retry queue handle re-delivery. Effort: XS.

**[MAJOR] Worker fallback sender is the Resend sandbox `onboarding@resend.dev` — autopost video-ready emails to non-verified recipients silently 403 in production.**
- File: `worker/src/handlers/autopost/handleEmailDelivery.ts:99` (`fromAddress = rawFrom || "MotionMax <onboarding@resend.dev>"`)
- Evidence: there is a `writeSystemLog` warning when sandbox is used (`:113-120`), good — but the *send still proceeds*, returning success while the actual deliveries fail. From a copy / lifecycle perspective, the user who scheduled an autopost gets nothing in their inbox and no error surfaces.
- Fix: refuse to send when `usingSandbox && process.env.NODE_ENV === 'production'` — fail the job loudly so the queue retries when ops fix the env. Effort: XS.

---

#### G. Voice & tone consistency across surfaces

**[MAJOR] Voice drift between marketing site and in-app modal.**
- Marketing (`marketing/src/pages/index.astro`, `landingContent.ts`): clean, direct, benefit-led ("Edit any image with AI text instructions. Regenerate audio or video per scene."). Sentence-case, conversational.
- Email templates (`_shared/resend.ts`): warm, helpful, short ("Need a hand? Just reply to this email — we read every message."). Good — most consistent surface.
- V2 announcement (`V2AnnouncementModal.tsx`): poetic-aspirational ("A new Studio. A new Lab. A new way to ship video at the speed you think."). Different voice — sounds like a different product. The "speed you think" line is also a vague claim with no substantiation.
- Fix: define a 1-page brand voice doc (Confident, helpful, clever-not-snarky per Herald rule set) and rewrite the announcement lede + feature copy to match marketing's cadence. Effort: M.

**[MINOR] Inconsistent em-dash usage — landing uses `—` (em-dash) liberally, emails use `—`, announcement uses both `—` and `&#8209;` (non-breaking hyphen), marketing description meta uses neither.**
- Evidence: `V2AnnouncementModal.tsx:219` `lip&#8209;sync` (non-breaking hyphen), `:222` `Studio-grade` (regular hyphen), `:267` no dash style.
- Fix: pick one — em-dash (`—`) for clauses, regular hyphen for compounds, no non-breaking hyphens in body copy. Document in voice doc. Effort: XS.

---

## Production Blockers (Herald-owned)

| # | File:line | Issue | Severity |
|---|-----------|-------|----------|
| 1 | `supabase/functions/_shared/emailTemplate.ts:55` + `src/components/announcements/v2-announcement.css:11,162,163,269,300` | Orange `#F5B049` brand violation in email CTA + announcement modal — most-seen surfaces are off-brand | Critical |
| 2 | `supabase/functions/_shared/emailTemplate.ts:111-119` | No physical mailing address in email footer — CAN-SPAM §7(a)(5) violation across all transactional sends | Critical |
| 3 | `supabase/functions/admin-send-newsletter/index.ts:69-76` | No `List-Unsubscribe` header on newsletter — Gmail/Yahoo bulk-sender rules violation; risks transactional deliverability | Critical |
| 4 | `src/pages/Landing.tsx:289,299,301` + `marketing/src/pages/index.astro:202,213` | "2,400+ marketers/creators" — TODO comment admits the number is fabricated; FTC §5 violation | Critical |
| 5 | `src/config/landingContent.ts` vs `V2AnnouncementModal.tsx:219-236` | Self-contradictory product counts (11 vs 13 languages, 9+ vs 30+ voices, 25+ vs 15+ captions) — undermines all marketing claims | Critical |
| 6 | `src/pages/Landing.tsx:431-436` + `marketing/src/pages/index.astro:102` | "Visual Stories" mode card + meta description — Storytelling product remnants (brief flagged for removal) | Critical |
| 7 | `src/config/landingContent.ts:30` | "Verified facts" claim on AI research feature — FTC AI guidance + EU AI Act Art. 50 substantiation gap | Critical |
| 8 | Lifecycle gap | No day-1 / day-3 / day-7 onboarding drip — only day-0 welcome exists; activation funnel leaks | Blocker |
| 9 | Lifecycle gap | No win-back / dormant-user re-engagement sequence — cancellations and inactive free users get zero touch | Blocker |
| 10 | Lifecycle gap | No branded purchase-receipt email — relies on Stripe's unbranded default, contradicts brand voice | Blocker |
| 11 | Supabase Auth templates (Dashboard) | Password-reset / email-confirmation use GoTrue defaults — no MotionMax brand or voice; phishing-anxiety risk | Critical |
| 12 | `supabase/functions/admin-send-newsletter/index.ts:292-315` | Silent success when `RESEND_API_KEY` missing — admin is told campaign sent when zero emails delivered | Critical |

---

## Top 10 Priority Fixes (Herald)

| Rank | Fix | File:line | Effort | Why first |
|------|-----|-----------|--------|-----------|
| 1 | Replace `#F5B049` with `#E4C875` everywhere (email CTA + v2 announcement CSS, 6 occurrences total) | `emailTemplate.ts:55`, `v2-announcement.css:11,162,163,269,300` | XS | Every transactional + first in-app surface is off-brand right now; XS effort, highest visibility |
| 2 | Remove or wire-to-real "2,400+ creators" claim | `Landing.tsx:289,301`, `index.astro:202,213` | XS-M | FTC §5 risk, audience is sophisticated and recognizes fabricated proof |
| 3 | Delete "Visual Stories" mode card + storytelling refs in meta description | `Landing.tsx:431-436`, `index.astro:102` | S | Brief explicitly flagged storytelling for removal; remnants visible to every visitor |
| 4 | Reconcile numerical claims (languages / voices / captions) into one source of truth | new `src/config/brandClaims.ts` | S | Self-contradictions visible within the first 60s of signup |
| 5 | Add physical mailing address to email footer template | `emailTemplate.ts:111-119` | XS | CAN-SPAM compliance; one-line fix |
| 6 | Add `List-Unsubscribe` + `List-Unsubscribe-Post` headers to newsletter sender | `admin-send-newsletter/index.ts:69-76` | S | Protects entire sending domain from Gmail bulk-sender penalty |
| 7 | Author and install MotionMax-branded Supabase Auth email templates (recovery, confirmation, magic link, email change) | Supabase Dashboard, using `buildEmail()` | M | Highest-trust moment is currently the most off-brand |
| 8 | Hard-fail (don't silently mark sent) when `RESEND_API_KEY` missing in newsletter sender + transactional sender | `admin-send-newsletter/index.ts:292-315`, `_shared/resend.ts:25-28` | XS | Silent failures destroy marketing program reliability |
| 9 | Rewrite welcome subject + preheader to outcome-led, branch upsell out of free welcome | `_shared/resend.ts:74,84,88` | XS | Activation lift is measurable; free-welcome upsell creates negative first impression |
| 10 | Build minimum-viable lifecycle drip: day-1 activation nudge, day-7 AutoPost intro, day-30 win-back for cancellations | new `worker/src/cron/lifecycle/*.ts` | L | Nothing currently runs after the welcome; activation + retention curve is flat |

---

## Cross-references

- **Proof:** Findings 4 (fabricated 2,400+), 7 (verified-facts AI claim), 11 (Secure by Design), and the language/voice/caption count contradictions all need Proof to grade against FTC §5 / EU UCPD substantiation rules. Herald flags; Proof rules.
- **Optic:** brand color violations (#F5B049) overlap with Optic's design-system review — Herald owns the *email + announcement copy surfaces*; Optic owns the wider design-token audit.
- **Comply:** CAN-SPAM physical-address gap, marketing-vs-transactional disclosure, GoTrue template branding all benefit from a legal review pass.
- **Tongue:** 11-language localization — once English copy lands, Tongue must verify the translated welcome / payment-failed / cancellation / lifecycle drip in each of the 11 languages. Currently no translations of any email body exist (single English template).
- **Signal:** FAQ rewrite for SEO long-tail; landing H1 promotion both affect organic acquisition.

---

**Verdict (Herald's category, §11 — lifecycle copy + email): NOT production-ready.**
Three blockers (no onboarding drip, no win-back, no branded receipt), four critical brand/copy violations (color, contradictions, fabricated proof, storytelling remnants), and two compliance gaps (CAN-SPAM address, List-Unsubscribe). Effort to clear: ~3-5 engineering days for the XS/S items, ~2 weeks for the lifecycle drip + branded auth templates.
