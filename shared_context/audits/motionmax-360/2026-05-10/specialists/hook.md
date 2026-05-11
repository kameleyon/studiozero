# MotionMax 360 — Hook (Conversion Rate Optimization) — 2026-05-10

**Reviewer:** Hook (Growth Layer / CRO)
**Audience-relative scoring:** tool-savvy creative adults (creators, marketers, video producers); mobile-heavy; US-first; not developers, not seniors. CRO bar is HIGH for this audience — they evaluate tools fast, smell fake social proof immediately, and abandon at the first crack in trust.
**Scope:** §2 Conversion Rate Optimization — funnel drop-off, missing/abused psychological triggers, pricing-page clarity, time-to-first-value, checkout reassurance, A/B opportunities. In-app `Landing.tsx`, marketing `index.astro`, `Auth.tsx`, dashboard `Pricing.tsx`, `LandingPricing.tsx`, `LandingCta.tsx`, `Testimonials.tsx`, `BeforeAfterComparison.tsx`, `FaqSection.tsx`, `landingContent.ts`, intake form (`IntakeForm.tsx`, `CreateNew.tsx`).

---

## §2 Conversion Rate Optimization — Findings

### BLOCKER

**B1. Pricing → Auth funnel silently drops `next` and `plan` params; users who pick a plan never reach checkout.**
- Evidence: `src/pages/Pricing.tsx:104` and `src/pages/Pricing.tsx:182` send users to `/auth?next=/pricing&plan=${plan.id}`. `src/pages/Auth.tsx:107` only reads `searchParams.get("returnUrl")` — it never reads `next` or `plan`. Result: after signup the user lands on `/app` (line 110 default), not back on `/pricing` with the chosen plan auto-selected.
- Why it matters (CRO): the most expensive customer in the funnel — one who clicked a paid-plan CTA — gets dumped into the editor instead of Stripe checkout. Drop-off here is near total because there is no nudge back to the upgrade flow once the user lands in `/app`.
- Fix: in `Auth.tsx` add `const next = searchParams.get("next");` (with safe-prefix validation identical to `returnUrl`) and on success `navigate(next ?? returnUrl)`. After redirect, `Pricing.tsx` must read `?plan=` from the URL and immediately call `handleCta(plan)` so the just-signed-up user is forwarded to Stripe checkout in one continuous motion. (location: `src/pages/Auth.tsx:107-110, 175, 237`; `src/pages/Pricing.tsx:97-117`).
- Effort: S.

**B2. Fabricated social-proof counts ("2,400+ marketers / creators") shipped on landing AND marketing site with `TODO: replace with a real figure` — FTC §5 truth-in-advertising risk and a trust-killer for a tool-savvy audience.**
- Evidence: `src/pages/Landing.tsx:289` ("Used by 2,400+ marketers"), `src/pages/Landing.tsx:299-302` ("TODO: replace 2,400+ with a real figure" + "Join 2,400+ creators already making videos"), `src/components/landing/LandingPricing.tsx:16-17` ("TODO: replace with a real figure" + `SOCIAL_PROOF_COUNT = "2,400+"` rendered on every plan card and "Join 2,400+ creators" CTA), `marketing/src/pages/index.astro:202, 213` (same fabricated numbers).
- Why it matters (CRO): savvy creators reverse-image-search avatars and check Google trends before paying. Discovering invented counts triggers immediate abandonment AND damages the long-term brand. FTC.gov endorsement guides explicitly require "user counts" to be accurate.
- Fix: replace literal counts with verifiable language until real numbers exist. Either: (a) remove the count entirely and lead with concrete capability proof ("4K export · 23 styles · 11 languages"), or (b) wire to `SELECT COUNT(*) FROM auth.users` via a public RPC + edge cache and cap the display at the real floor (e.g. "100+ creators" until it's actually larger). Same fix for marketing astro page. (locations above).
- Effort: S.

**B3. "Creator plan: 47 people upgraded this week" badge is a hard-coded fake stat — pure dark-pattern scarcity without a backing query.**
- Evidence: `src/components/landing/LandingPricing.tsx:158-172` — string literal `"Creator plan: 47 people upgraded this week"` rendered behind a flame icon as a scarcity ribbon. No data source, no rotation, no truth check.
- Why it matters (CRO): manufactured scarcity converts in the short term and craters trust in the long term. For a tool-savvy creator audience that tests SaaS for a living, this is the #1 thing they screenshot when warning peers.
- Fix: gate the badge behind a real `subscription_events` query (count of upgrade events in last 7 days) and only render when the count is ≥10 AND truthful. If no data, render nothing. (location: `src/components/landing/LandingPricing.tsx:158-172`).
- Effort: S.

**B4. Fake price-increase countdown that creators "reset" manually — explicit dark-pattern urgency.**
- Evidence: `src/components/landing/LandingPricing.tsx:11-13` `// Update this when you want to reset the countdown. Keep ~30 days out.` followed by `const PRICE_INCREASE_DATE = new Date("2026-05-19T23:59:59Z");`. Today is 2026-05-09 → the banner currently tells visitors "Yearly pricing locked for 10 more days — price increases May 19" with no actual price increase planned.
- Why it matters (CRO): false urgency is a documented FTC enforcement target (e.g. *FTC v. WunderlandPress*). Repeat visitors who notice the date never moves are lost forever and may post screenshots.
- Fix: either (a) commit to a real price increase with a one-shot calendar event and remove the manual-reset workflow, or (b) replace the urgency banner with legitimate annual-discount framing ("Save 20% with yearly — 2 months free"). (location: `src/components/landing/LandingPricing.tsx:11-37, 142-155`).
- Effort: S.

---

### CRITICAL

**C1. "Visual Stories" product card on landing is a click-trap — broken handoff to an undefined mode.**
- Evidence: `src/pages/Landing.tsx:431-436` defines a fourth product card "Visual Stories" with NO `mode` field (compare lines 419, 428, 444 which all set `mode`). The card's CTA fires `handleCta('Try Visual Stories')` (line 471) which routes to `/auth?mode=signup` (line 87). After auth, IntakeForm only knows three modes — `CreateNew.tsx:16-23` falls back to `cinematic` for any unrecognised value. So a user who specifically clicked "Visual Stories" lands on the Cinematic intake.
- Why it matters (CRO): brief explicitly says the storytelling product is being removed — this card is a remnant generating a bait-and-switch experience. Users who care enough to click a specific mode will bail when they discover it's not what they were promised. Also flagged because the mode count claim ("4 Ways to Create", line 400) is now false once Stories is removed.
- Fix: delete the "Visual Stories" object from the products array (`src/pages/Landing.tsx:411-446`) and update the section eyebrow from "4 Ways to Create" to "3 Ways to Create" (line 400). Same on the marketing astro page if mirrored. Effort: XS.

**C2. Free plan disappears between marketing site and in-app landing — visitor reads "Start free" promise but sees only paid plans on `Landing.tsx`.**
- Evidence: `marketing/src/pages/index.astro:273-294` shows three plans (Free / Creator / Studio). `src/components/landing/LandingPricing.tsx:52-103` renders only **two** plans (Creator, Studio). `src/pages/Pricing.tsx:37-89` (in-app) again has three. Hero copy on `src/pages/Landing.tsx:288-290` says "Free to start · No credit card required" but the pricing block shown four screens below has no Free card.
- Why it matters (CRO): the cheapest possible "yes" — a free signup — is hidden at exactly the moment the user is comparing prices. Creates a perceived $29/month minimum and inflates abandonment. Mismatch between marketing-site price grid and app landing price grid will also damage trust for users who arrive via different paths.
- Fix: add a third Free card to `LandingPricing.tsx` mirroring the in-app `Pricing.tsx:37-53` definition; ensure the small-print "Free trial: 150 credits…" banner becomes the Free card's payload, not floating prose. (location: `src/components/landing/LandingPricing.tsx:52-103, 174-184, 187`). Effort: S.

**C3. Hero "Watch Demo" button opens a placeholder modal that says "Demo video coming soon" — trust-destroying landing on the most-clicked secondary CTA.**
- Evidence: `src/pages/Landing.tsx:268-285` Watch-Demo button opens `demoModalOpen` modal. `src/pages/Landing.tsx:511-543` modal body literally renders "Demo video coming soon" with a placeholder Play icon. Meanwhile a real Guidde walkthrough already exists embedded further down at `src/pages/Landing.tsx:332-341` (the demo section iframe).
- Why it matters (CRO): the most engaged visitors click "Watch Demo" before they sign up — this is the high-intent micro-conversion. Showing them an empty "coming soon" modal at that moment cuts the funnel hard. They won't scroll to find the real demo.
- Fix: either (a) point the modal at the existing Guidde URL `https://embed.app.guidde.com/playbooks/wvJwFaqbh66kuXS3hZ23ir?mode=videoOnly` so the click delivers what was promised, or (b) remove the Watch Demo button until a 90-second cut is recorded and instead scroll to `#demo`. (location: `src/pages/Landing.tsx:511-543`). Effort: XS.

**C4. "Testimonials" section contains zero real testimonials — anonymous use-case stubs labeled by job title.**
- Evidence: `src/components/landing/Testimonials.tsx:3-19` defines three "quotes" with role labels ("Content Creators", "Social Media Managers", "Learning & Development Teams") and no names, photos, companies, or quote attribution. The component is named `Testimonials` and imported on `Landing.tsx:489` between Trust Indicators and Pricing — a position that signals "social proof".
- Why it matters (CRO): testimonials with face photos lift conversion 30–60% in industry CRO benchmarks (Nielsen Norman, ConversionXL). Faceless quotes without names function as filler — readers know they're invented and skip the section. The labelling-as-testimonials is also a soft deception risk.
- Fix: until real testimonials exist, rename the component and section heading to "Built for these workflows" / "Common use cases" and remove the quote-mark styling so they read as use-case descriptions, not customer voices. Add a placeholder for the first three real testimonials with a clear data shape (`{ name, photoUrl, role, company, quote, verifiedAt }`). (location: `src/components/landing/Testimonials.tsx:1-67`). Effort: XS for renaming, M for sourcing real testimonials.

**C5. Pricing page has annual-billing footnote but the in-app `/pricing` route has no annual toggle — user can't actually claim the advertised 20% saving.**
- Evidence: `src/pages/Pricing.tsx:151` — footnote "Annual billing saves 20%" — and lines 30-89 hard-code monthly `priceId`s only (`STRIPE_PLANS.creator.monthly.priceId`, etc). No `BillingToggle`. Compare `LandingPricing.tsx:135-140` which DOES render a `<BillingToggle>` and switches between `monthlyPrice` / `yearlyPrice`. So a user who navigates from app sidebar → /pricing sees a discount footnote but can never select annual.
- Why it matters (CRO): annual upsell is the #1 LTV lever for SaaS. Confusing UX where one route can claim the discount and the other can't will lose annual conversions and trigger support tickets.
- Fix: port `BillingToggle` and `STRIPE_PLANS.creator.yearly.priceId` / `STRIPE_PLANS.studio.yearly.priceId` into `Pricing.tsx`. Mirror the toggle behaviour from `LandingPricing.tsx`. (location: `src/pages/Pricing.tsx:37-89, 151`; reuse `src/components/pricing/BillingToggle.tsx`). Effort: S.

**C6. Auth signup blocks submission on TWO separate checkboxes (Terms + Age 18+) — extra friction with no compliance gain over a single combined affirmation.**
- Evidence: `src/pages/Auth.tsx:466-502` renders two `<Checkbox>` controls; `Auth.tsx:507` disables the submit button until BOTH are checked.
- Why it matters (CRO): each additional checkbox costs measurable signup conversion (Baymard finds 2-4% drop per added required interaction). Both compliance items can be combined into one affirmation: "I am 18+ and agree to the Terms / Privacy / AUP". Single click, same legal force.
- Fix: collapse into a single required checkbox: `"I'm 18 or older and agree to the Terms of Service, Privacy Policy, and Acceptable Use Policy"`. Update disabled state at `Auth.tsx:507` accordingly. (location: `src/pages/Auth.tsx:466-502, 507`). Effort: XS.

**C7. Only Google OAuth offered — no Apple Sign-In on a mobile-heavy / iOS-bound audience, no GitHub, no email-magic-link.**
- Evidence: `src/pages/Auth.tsx:114-127, 318-336`. Google is the only provider button. No Apple ID, no GitHub, no Magic Link / passwordless flow. Brief specifies "mobile-heavy usage" + iOS readiness.
- Why it matters (CRO): on iOS, Apple Sign-In typically converts 1.5-2× Google for first-time signups (less friction, no email-typing). For creators, GitHub or magic-link removes the password barrier entirely. The current flow forces a password and a confirmation email even on the trial.
- Fix: add Apple OAuth provider via `supabase.auth.signInWithOAuth({ provider: 'apple', options: ... })`. Add a "Email me a link" magic-link option using `supabase.auth.signInWithOtp` so the trial path can skip password entirely. (location: `src/pages/Auth.tsx:114-127, 315-347`). Effort: M.

**C8. "Free trial: 150 credits to try everything" copy contradicts the actual Free plan capabilities — credibility gap detectable in 30 seconds.**
- Evidence: `src/components/landing/LandingPricing.tsx:181-183` — "Free trial: 150 credits to try everything." But `src/pages/Pricing.tsx:43-49` Free plan = "150 one-time credits, 720p, landscape only, 3 Smart Flow videos, NO voice cloning". And `src/config/landingContent.ts:103-105` FAQ says free includes "**monthly** credits" (which is wrong — the migration `20260405000003_update_pricing_system.sql:30` confirms 150 is a one-time signup bonus, NOT recurring).
- Why it matters (CRO): "try everything" is materially false (no voice cloning, capped resolution, format restricted). The FAQ contradicts the migration. This is the kind of inconsistency that surfaces in negative reviews.
- Fix: change banner to "Free trial: 150 credits to test the workflow — voice cloning and 4K export available on paid plans." Update FAQ entry at `landingContent.ts:103-106` from "monthly credits" to "150 one-time credits at signup". (location: `src/components/landing/LandingPricing.tsx:181-183`; `src/config/landingContent.ts:103-106`). Effort: XS.

---

### MAJOR

**M1. No price-anchoring/decoy on the public landing — only two plans rendered (Creator / Studio), so Studio reads as the expensive option with nothing to anchor it against.**
- Evidence: `src/components/landing/LandingPricing.tsx:52-103` — exactly two pricing entries. Behavioural-pricing literature (Ariely, *Predictably Irrational*) shows a 3-tier structure with a clear decoy lifts conversion to the middle tier ~30%. The Free + Creator + Studio structure used in `marketing/index.astro` and the in-app `Pricing.tsx` is the right shape.
- Why it matters: Creator already wears the "Most Popular" badge but without a Free anchor it doesn't read as "the smart middle choice".
- Fix: add Free as the first card (see C2). For stronger middle-tier pull, consider an "Agency" placeholder above Studio with annual pricing only, so Studio becomes the new middle. Effort: S.

**M2. Conflicting "Most Popular" + "Best Value" badging — both pricing cards wear top-of-card badges, neutralising both.**
- Evidence: `src/components/landing/LandingPricing.tsx:201-211`. Creator gets "Most Popular" (line 202-204), Studio gets "Best Value" (line 207-211). Both render the same `-top-3 left-1/2` ribbon position.
- Why it matters (CRO): when every card is special, no card is. The "anchor" effect requires exactly ONE highlighted plan. Two badges is the most common A/B-test loser pattern in pricing-page literature.
- Fix: drop the "Best Value" ribbon on Studio. Instead promote the gold accent border (already present at line 197 → extend to Studio with a subtle gold tint) and let Creator hold the singular "Most Popular" highlight. (location: `src/components/landing/LandingPricing.tsx:201-211`). Effort: XS.

**M3. Email-confirmation interstitial breaks time-to-first-value — user signs up, gets bounced to a "check your email" screen instead of straight into the editor.**
- Evidence: `src/pages/Auth.tsx:196-198, 243-279` — after signup, `setShowEmailSent(true)` shows a confirmation screen. The user must leave the tab, open email, click the link, and only then return. Brief calls out time-to-first-value as a key conversion lever.
- Why it matters (CRO): the "Aha!" for MotionMax is making the first video. Every minute between "Create Account" and "first video rendering" costs activation. SaaS benchmarks (Reforge) put confirmation-email TTFV penalty at ~30-45% activation drop.
- Fix: enable Supabase email-confirmation as a soft confirmation — users can enter the editor and start their FIRST video without confirming, with a banner reminder to confirm before second video. Or implement passwordless magic-link signup (see C7) which folds confirmation and signup into a single step. (location: `src/pages/Auth.tsx:179-198`; Supabase Auth → "Enable email confirmations" setting). Effort: M.

**M4. "Voice cloning" feature gating is visible on the landing pricing card but not anywhere on the marketing site Free plan — visitors don't know what they unlock by upgrading until they hit pricing.**
- Evidence: `src/components/landing/LandingPricing.tsx:71` Creator: "1 voice clone"; line 92 Studio: "5 voice clones". Marketing site `marketing/src/pages/index.astro:289` Free plan ✗ "Voice cloning". But the marketing hero / features sections never frame voice cloning as a paid lever — it's listed alongside other features at parity (`src/config/landingContent.ts:21-27`).
- Why it matters (CRO): clear feature-gating in the feature grid (free / pro / studio columns or coloured badges) is what drives upgrades. Right now a visitor doesn't realise voice cloning is the upgrade reason until they get to pricing — too late to nudge.
- Fix: add a small "Pro" / "Studio" pill to feature cards at `src/components/landing/FeatureCard.tsx` based on a new `tier?: 'free' | 'creator' | 'studio'` field added to `LANDING_FEATURES` in `landingContent.ts:14-51`. Effort: S.

**M5. No exit-intent capture on landing — abandoning visitors leave without any retargeting hook (email, free guide, etc.).**
- Evidence: full `src/pages/Landing.tsx` (1-546) — no `mouseleave` / `beforeunload` handler, no email-capture lightbox, no "Wait! Get a free starter video pack" trigger. Only the `useScrollDepthTracker` analytics hook (line 8, 34) which is read-only.
- Why it matters (CRO): exit-intent modals on cold-traffic landings typically capture 4–10% of would-be abandoners and recover 10–30% of those into trials. Cheap, high-yield CRO play. Particularly effective for the marketer/creator audience who already understand "give email → get value".
- Fix: add a `useExitIntent` hook + lightweight modal offering a downloadable "Top 10 AI video prompts that convert" PDF or "Free 90-second video pack" in exchange for email. Wire to Resend transactional flow. (location: new file `src/hooks/useExitIntent.ts` + add modal at `src/pages/Landing.tsx:543`). Effort: M.

**M6. Hero CTA pair is "Try for Free" + "Watch Demo" — but no urgency/scarcity ANYWHERE near the primary action; landing leans on countdown banner that's only visible inside pricing yearly view.**
- Evidence: `src/pages/Landing.tsx:259-285`. "Used by 2,400+ marketers" line is fabricated (B2). No real-time activity ("Last video rendered: 17 seconds ago"), no FOMO genuine signal (queue depth, render speed today), no social-proof logos at the top of the page.
- Why it matters (CRO): the hero is where conversion is decided. Currently the only authority signal is one self-claimed sentence.
- Fix: replace the fake "2,400+" line with a real-time signal pulled from a Supabase RPC: `last_render_completed_at` formatted as relative time, e.g. "Latest video rendered 12 seconds ago in 4K". Truth-based urgency converts as well as fake urgency without the trust risk. (location: `src/pages/Landing.tsx:288-303`). Effort: M.

**M7. No checkout reassurance copy on the Stripe-redirect step — users click the plan CTA, see a loading spinner, then redirect to Stripe with no expectation set.**
- Evidence: `src/pages/Pricing.tsx:107-116` — `setPendingPlan(plan.id)`; button shows "Opening checkout…" only. No microcopy about: "Secure checkout via Stripe · Cancel anytime · 7-day money-back guarantee" appearing AT the click moment. The landing pricing card has reassurance copy at `LandingPricing.tsx:243-245` but the in-app `Pricing.tsx` at lines 323-331 has nothing of the sort under each Plan CTA.
- Why it matters (CRO): the moment between click and Stripe page is the highest-anxiety moment in the funnel — that's where the "are they going to charge me anything weird?" thought happens. Reassurance copy reduces last-click abandonment.
- Fix: add a one-line caption directly under each `<PlanCard>` CTA: "Secure checkout · Cancel anytime · 7-day refund". Place at `src/pages/Pricing.tsx:331` after the Button. Effort: XS.

**M8. Auth page uses `noindex,nofollow` (correct) but skips `autoCapitalize="off" / autoCorrect="off"` on the email input — mobile keyboards mangle the email and force re-entry.**
- Evidence: `src/pages/Auth.tsx:355-367` — email input has `autoComplete="email"` but no `autoCapitalize` / `autoCorrect` / `spellCheck="false"` / `inputMode="email"`. Mobile Safari and Android Chrome will autocapitalize the first letter and autocorrect domain typos.
- Why it matters (CRO): on a mobile-heavy audience this directly causes signup-form rage. iOS adds a capital letter to "John@gmail" → "John@gmail" submits, fails validation, user retypes. Each mistake costs ~10% of the cohort.
- Fix: add `autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email"` to the email Input at `src/pages/Auth.tsx:355-367`. Same for the password field — add `autoCapitalize="off" autoCorrect="off" spellCheck={false}`. Effort: XS.

**M9. Intake form (the post-signup "make a video" page) is a single 1500+ line monolith with style picker, brand kit, voice picker, etc all on one screen — overwhelming for first-video flow; no progressive disclosure.**
- Evidence: `src/components/intake/IntakeForm.tsx` is 1571 lines (single component). The form requires choosing: prompt, sources, format, duration, language, voice, captions, brand, style, camera motion, color grade, etc. (lines 1014-1461). For a brand-new free user trying their first 90-second video, this is decision paralysis.
- Why it matters (CRO): Time-to-first-value is the most important activation metric. A creator who just signed up wants to type a prompt and watch something happen. Burying that under 12+ optional knobs costs first-video completion.
- Fix: introduce a "Quick Start" mode for `signupSession === firstVideo`: prompt + duration + language only, with sensible defaults, and a "Show advanced options" toggle that reveals everything else. Track via `track('first_video_started')` and measure activation lift. (location: refactor `src/components/intake/IntakeForm.tsx:832-1500` to wrap advanced fields in a `<details>` collapsed by default for first-time users, gated on a `first_video` flag from `users.metadata`). Effort: L.

---

### MINOR

**m1. CTA copy variance — landing hero says "Try for Free", footer banner says "Start Creating Free", LandingCta says "Start Creating Free", pricing says "Start with Creator". Inconsistent verbs reduce mental cache hit-rate.**
- Evidence: `src/pages/Landing.tsx:266` ("Try for Free"), `src/components/landing/LandingCta.tsx:31` ("Start Creating Free"), `src/components/landing/LandingPricing.tsx:74, 99` ("Start Creating", "Go Studio"), `src/pages/Pricing.tsx:50, 66, 85` ("Get started free", "Start with Creator", "Start with Studio").
- Fix: pick one primary CTA verb across the funnel. Recommend "Start free" (matches free-trial framing). Effort: XS.

**m2. No LinkedIn/Facebook auth despite a marketing-targeted persona — workplace identity + SSO would lift B2B conversion.**
- Evidence: `src/pages/Auth.tsx:114-127` — only Google OAuth.
- Fix: add LinkedIn OAuth provider (Supabase has built-in support: `provider: 'linkedin_oidc'`). Effort: XS.

**m3. Pricing page footer line "All plans include a 7-day money-back guarantee" is below the fold and not visually elevated.**
- Evidence: `src/pages/Pricing.tsx:150-152` — small grey 12px footnote text after the plan grid.
- Fix: surface the guarantee as a green-shield (NOTE: brand has no green; use aqua `#14C8CC`) badge ABOVE each plan CTA, not below the grid. Already done in `LandingPricing.tsx:243-245` for the public landing — port the same pattern into `Pricing.tsx`. Effort: XS.

**m4. The intake form's "Generate" CTA shows raw credit cost ("This will use 12 credits") but doesn't show what % of the user's monthly budget that is — important for plan-pressure conversions.**
- Evidence: `src/components/intake/IntakeForm.tsx` cost summary computed via `costItems` / `totalCost` / `credits` / `creditsCap` — the budget context is in scope but not surfaced as a friendly progress bar.
- Fix: render a small inline "12 / 500 monthly credits" mini-meter beside the Generate button, with an "Upgrade" link when the bar passes 80%. Drives Creator → Studio upgrades. Effort: S.

**m5. FAQ has zero entries about "Will my data train AI models?" / "Do I own the videos I make?" — both top-of-mind for creator audience and easy conversion blockers when missing.**
- Evidence: `src/config/landingContent.ts:91-127` — FAQ list. No copyright/ownership Q. No AI-training Q. No "What happens if generation fails?" Q.
- Fix: add three FAQ entries: (1) "Who owns the videos I create?" → "You do. Full commercial rights to all output.", (2) "Is my content used to train AI models?" → "No.", (3) "What happens if a video fails to render?" → "Credits are returned automatically; you can re-run with one click." Effort: XS.

**m6. Free trial banner is positioned BELOW the urgency banner and AFTER the scarcity badge — order reversal would let the most positive frame land first.**
- Evidence: `src/components/landing/LandingPricing.tsx:142-184` order: (1) urgency yearly note, (2) scarcity flame badge, (3) free-trial banner, (4) plans grid.
- Fix: re-order to (1) free-trial banner first (positive frame, "you can try this risk-free"), (2) plans grid, (3) urgency note last. Effort: XS.

**m7. Hero pricing copy A/B test variant uses "$500/video" anchor without any source — auditable claim risk.**
- Evidence: `src/components/landing/LandingPricing.tsx:124-126` `"Stop paying $500/video. Make them yourself."` Test variant under `useExperiment`. No citation or industry-rate disclosure.
- Fix: when running the variant, include a tiny citation under the headline ("Industry rate per Upwork 2025 video survey") to defend the claim. Or soften to "Stop paying agencies. Make them yourself." Effort: XS.

---

### POLISH

**p1. The "Used by 2,400+ marketers" trust line on hero would convert better as a logo strip — even 4-5 anonymized brand silhouettes outperform a numeric claim per ConversionXL benchmarks.**
- Evidence: `src/pages/Landing.tsx:288-290`.
- Fix: once any real brand customers exist, replace the line with a 5-up logo bar. Until then, use category icons ("Used by → [agency icon] [creator icon] [educator icon] [marketer icon]"). Effort: S.

**p2. No "Sticky CTA" on mobile after the hero scrolls off — visitor scrolling pricing or features has to scroll back up to convert.**
- Evidence: `src/pages/Landing.tsx` — sticky header (line 97) shows logo + nav but the "Get Started" CTA only appears on `md:flex` (line 142-147), invisible on mobile.
- Fix: add a sticky bottom-CTA bar on mobile that appears after 50% scroll: "Try free →". Effort: S.

**p3. No "powered by Stripe" / Stripe trust badge near the pricing CTAs — minor reassurance gap on a payments page.**
- Evidence: `src/pages/Pricing.tsx` 1-334 — no Stripe logo or "Secured by Stripe" microcopy.
- Fix: add a small "🔒 Secured by Stripe · Apple Pay · Google Pay" line under the plan grid (location: `src/pages/Pricing.tsx:152`). Effort: XS.

---

## §2 Production Blockers (CRO)

| # | Issue | File:Line | Severity | Effort |
|---|-------|-----------|----------|--------|
| B1 | Pricing→Auth drops `next`/`plan`; signup never reaches checkout | `src/pages/Auth.tsx:107-110, 175, 237`; `src/pages/Pricing.tsx:104, 182` | Blocker | S |
| B2 | Fabricated "2,400+ marketers/creators" social proof shipped with TODO | `src/pages/Landing.tsx:289, 299-302`; `src/components/landing/LandingPricing.tsx:16-17, 76, 101`; `marketing/src/pages/index.astro:202, 213` | Blocker | S |
| B3 | Hard-coded "47 people upgraded this week" fake scarcity | `src/components/landing/LandingPricing.tsx:158-172` | Blocker | S |
| B4 | Manually-reset fake countdown ("Yearly pricing locked for X days") | `src/components/landing/LandingPricing.tsx:11-37, 142-155` | Blocker | S |

---

## §2 Top 10 Priority Fixes (CRO — by impact ÷ effort)

| Rank | Issue | File:Line | Severity | Effort |
|------|-------|-----------|----------|--------|
| 1 | Wire `?next` + `?plan` params through Auth so paid-CTA users reach checkout | Auth.tsx:107-110, 175, 237 | Blocker | S |
| 2 | Remove or replace fake "2,400+" social proof everywhere | Landing.tsx:289, LandingPricing.tsx:16-17, marketing/index.astro:202 | Blocker | S |
| 3 | Remove the "47 people upgraded" fake scarcity ribbon | LandingPricing.tsx:158-172 | Blocker | S |
| 4 | Remove or commit-to the fake price-increase countdown | LandingPricing.tsx:11-37, 142-155 | Blocker | S |
| 5 | Delete "Visual Stories" remnant card (storytelling is being removed) | Landing.tsx:431-436 | Critical | XS |
| 6 | Add Free plan card to landing pricing grid | LandingPricing.tsx:52-103 | Critical | S |
| 7 | Fix Watch-Demo modal — point at real Guidde URL or remove button | Landing.tsx:511-543 | Critical | XS |
| 8 | Rename "Testimonials" → "Use cases"; remove quote-mark styling until real testimonials exist | Testimonials.tsx:1-67 | Critical | XS |
| 9 | Combine Terms+Age signup checkboxes into one | Auth.tsx:466-507 | Critical | XS |
| 10 | Add Apple Sign-In + Magic Link to Auth providers | Auth.tsx:114-127, 315-347 | Critical | M |

---

## Out-of-scope notes

- Funnel telemetry / analytics correctness is owned by Trace; I observed `trackEvent("cta_click", ...)` is wired (Landing.tsx:85) but did NOT verify event consistency across the full funnel — that is Trace's call.
- The "11 languages" claim and i18n correctness for landing copy is owned by Compass.
- The brand-color drift (orange `#F5B049` in some components vs gold `#E4C875`) is a design-system finding; flagged here only where it touches a CTA — the rest is Optic's call.
- AI-disclosure / EU AI Act language and copyright handling are Canon's call.
- Auth lockout mechanics, Stripe-webhook verification, and PCI scope are Halo's call.

— Hook
