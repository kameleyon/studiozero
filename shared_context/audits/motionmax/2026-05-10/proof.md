# PROOF — Content & Wording Audit
**Project:** motionmax · **Audit date:** 2026-05-10 · **Reviewer:** Proof (Audit layer)
**Audience under review:** content creators, marketers, video producers — tool-savvy creative adults, **not developers**, often non-native English speakers (the platform supports 11 languages).
**Scope:** every customer-facing string in `src/`, the marketing Astro site at `marketing/src/pages/index.astro`, plus the legal pages (`Privacy.tsx`, `Terms.tsx`, `AcceptableUse.tsx`).
**Method:** read-only inspection of code; Flesch-Kincaid Grade Level (FK-G) + Flesch Reading Ease (FRE) scoring via `textstat==0.7.13`; comparison against the brand voice signals in `CLAUDE.md` memory and the marketing FAQ promises. Targets used: **FK-G ≤ 8** for in-app microcopy and marketing body copy; **FK-G ≤ 12** for legal sections that govern a purchase; superlatives require evidence (FTC §255.1 guidance).

---

## Verdict (Proof's portion of the panel)
**FAIL** at content/wording — the launch carries three Blocker-class findings (marketing claims that the engineers themselves flagged as fake placeholders, a credits-policy contradiction across surfaces, and a wrong plan name in the public FAQ) plus a Critical microcopy failure (the primary dashboard CTA is the single word "Direct"). None of these are taste calls — every one is evidenced by file:line and either a TODO comment in the source or a direct cross-page contradiction. Audit-layer recommendation to Jury: do not promote past `PASS WITH FIXES` until at least all Blocker + Critical items below are closed by Proof re-verification.

---

## Findings — sorted by severity

### BLOCKER-1 — "2,400+ marketers / creators" social-proof claim is a hard-coded placeholder the engineers flagged as fake
**Evidence — three call sites, all with `// TODO: replace with a real figure`:**
- `src/pages/Landing.tsx:289` — `Free to start · No credit card required · Used by 2,400+ marketers`
- `src/pages/Landing.tsx:299-301` — `// TODO: replace 2,400+ with a real figure from your analytics/DB` immediately above `Join 2,400+ creators already making videos`
- `src/components/landing/LandingPricing.tsx:16-17` — `// TODO: replace with a real figure fetched from your analytics/DB once available` then `const SOCIAL_PROOF_COUNT = "2,400+";` — surfaced as `Join 2,400+ creators` (line 76) and `Trusted by 2,400+ creators` (line 101) on the two pricing cards
- `marketing/src/pages/index.astro:202` — `Used by 2,400+ marketers`
- `marketing/src/pages/index.astro:213` — `Join 2,400+ creators already making videos`
- `marketing/src/pages/index.astro:405` — `Join thousands of creators turning text into professional videos with AI`
- `src/components/landing/Testimonials.tsx:34` — section heading `What you can do with MotionMax` paired with three quote-styled blocks attributed only to generic roles ("Content Creators", "Social Media Managers"), not real customers — see Critical-3.

**Why this is Blocker, not Critical:** the audience is marketers — they know the FTC Endorsement Guides §255.1 and EU Directive 2005/29/EC on unfair commercial practices. A "Used by N+ marketers" / "Trusted by N+ creators" claim is a substantive, quantitative claim of social proof. With no real basis (the source comments confirm there is none), it is materially misleading commercial communication. For a launch reviewed by a marketer audience, this is account-suspension- and litigation-exposure-class risk on day one.

**Recommended remediation (Proof does not write the final copy — Herald owns it):**
- If the real number is unknown, replace with an honest qualitative phrase: `Free to start · No credit card required · Built for creators` — drops the false count, keeps the trust beats.
- Or, if a real (audited) number exists, hard-code it with a year tag: `Used by 240 launch-list creators (April 2026)`.
- Remove the "Trusted by 2,400+ creators" line from `LandingPricing.tsx:101` until the count is real — the verb "trusted by" raises the bar even higher than "used by" because it implies a satisfaction signal, not just a count.
- Owner: Herald · Re-verify: Proof, by grepping for "2,400" returning zero matches in `src/` and `marketing/`.

---

### BLOCKER-2 — Public FAQ names a plan that does not exist ("Professional")
**Evidence:**
- `src/config/landingContent.ts:114-116` (rendered on the live landing page via `Landing.tsx` → `FaqSection`):
  > **"Can I use my own voice?" Absolutely. Creator and Professional plans include voice cloning — upload a short sample and generate narrations in your own voice.**
- The actual plans, per `src/pages/Pricing.tsx:38-89` and `marketing/src/pages/index.astro:271-343`, are **Free / Creator / Studio**. There is no "Professional" plan anywhere in the codebase. The marketing Astro FAQ at `marketing/src/pages/index.astro:55-57` correctly says "Creator and Studio plans".

**Why this is Blocker:** the visitor reads the in-app landing FAQ, decides to subscribe to "Professional" for voice cloning, hits the pricing page, finds no such plan, and either bounces or — worse — pays for the wrong tier. This is a direct comprehension failure on a paid-conversion surface, and a defensible "but the FAQ said…" complaint to a chargeback or consumer-protection regulator.

**Recommended remediation:** swap "Professional" for "Studio" in `src/config/landingContent.ts:115`. Also worth a one-time grep across `src/`, `marketing/`, and `docs/` for the string "Professional plan" — none of those should exist.
- Owner: Herald · Re-verify: Proof.

---

### BLOCKER-3 — Credits-expiry contradiction across three customer-facing surfaces
**Evidence — three different stories about the same policy:**
- `src/pages/Pricing.tsx:167-168` (in-app pricing page, "One-time credit packs" section):
  > **"Need more credits this cycle? Stack a pack on top of your plan. Credits never expire."**
  The antecedent of "Credits" is ambiguous — directly under a "One-time credit packs" heading it could mean *pack credits never expire*, but a buyer who hasn't yet read Terms will reasonably read it as *all credits never expire*.
- `src/config/landingContent.ts:119-120` (landing FAQ on the same domain):
  > **"How do credits work? … Credits reset monthly and unused credits do not roll over. You can also purchase credit packs at any time."**
- `src/pages/Terms.tsx:81-82` (the binding Terms of Service):
  > **"Monthly subscription credits expire at the end of each billing period. Purchased credit packs do not expire but are non-refundable once consumed."**

**Why this is Blocker:** credits ARE the unit of purchase. The Pricing page says one thing, the FAQ says another, the Terms say a third. A user who buys a Creator plan based on the Pricing-page claim "Credits never expire" has a colourable claim under consumer-protection statutes that the brand cannot cite the Terms to rescue, because the Terms contradict the page they were on at the moment of purchase.

**Recommended remediation:**
- `src/pages/Pricing.tsx:167-168` should be unambiguous about scope: `Top-up credit packs never expire. Plan credits reset monthly.`
- The FAQ in `landingContent.ts:119-120` should mirror the same two-sentence shape so the rule appears identical on every surface.
- Owner: Herald + Comply (legal liaison) · Re-verify: Proof + Canon (legal-text reviewer in audit panel).

---

### CRITICAL-1 — Primary dashboard CTA is the single word "Direct"
**Evidence:** `src/components/dashboard/Hero.tsx:350` — the gradient primary submit button on the home dashboard hero (the first action a signed-in user sees) is rendered as:
```
Direct  ⏎
```

**Why this is Critical (not just Polish):**
- Per the brand-voice rule "Button labels are verbs that match the outcome" (Proof's own rubric, also Microsoft Style Guide §6 and GOV.UK Design System guidance), `Direct` fails on every test — it's an ambiguous verb (direct *what*?), it gives no signal that clicking submits the prompt to start video generation, and the user has just read a headline ("What are we *making*?") that primed the verb "make", not "direct".
- For a non-native English speaker in any of the 11 languages MotionMax supports, "Direct" is a Latinate verb with multiple senses (direction-giving, supervising, addressing). The headline / button verb mismatch makes the action illegible.
- This is the load-bearing CTA for the entire dashboard. Comprehension failure here costs activation, not just polish.

**Recommended remediation (Herald or Guide):** replace with a verb that matches the outcome and the prompt the user just typed. Suggestions ranked by Proof's preference:
1. `Make video` (matches the headline verb "making")
2. `Generate`
3. `Start video`
4. `Create`
- The `⏎` keyboard-shortcut chip can stay.
- Owner: Guide (in-app microcopy) · Re-verify: Proof.

---

### CRITICAL-2 — Unsubstantiated quantitative comparison claims on the landing page
**Evidence:** `src/components/landing/BeforeAfterComparison.tsx`:
- Line 32-34: hard-coded `MANUAL_TOTAL = "~15 hours"`, `MOTIONMAX_TOTAL = "~7 minutes"`, `TIME_SAVED_PERCENT = 99`
- Line 50: `<h2>Save 99% of Your Production Time</h2>`
- Line 184-188: metrics list `Faster than manual: 120×`, `Cost reduction: ~90%`, `No software needed: Zero`

**Why this is Critical (one notch below Blocker because the methodology gap is recoverable with a footnote, unlike the placeholder counts which are flatly false):** every one of these is a comparative quantitative claim. FTC §255.1 and the EU Unfair Commercial Practices Directive both require advertisers to be able to substantiate every quantitative comparative claim before publication. There is no methodology disclosed, no comparison benchmark, no link to a study, no footnote, and no source. "120× faster" and "save 99%" are exactly the kind of round, oddly-specific numbers regulators look for in greenwashing/AI-washing investigations.

**Recommended remediation:**
- Either (a) replace with a non-quantitative phrasing (`Hours of editing collapsed to minutes` — true and unfalsifiable), or
- (b) keep the numbers but add a methodology footnote: `*Based on a creator producing one 2-minute explainer video: 15 hours of manual workflow vs. 7 minutes of MotionMax queue time. Your results will vary.*` and gate the methodology on a real internal benchmark.
- Owner: Herald + Comply · Re-verify: Proof.

---

### CRITICAL-3 — "Testimonials" component renders brand-written marketing copy as customer quotes
**Evidence:** `src/components/landing/Testimonials.tsx:3-19` — the file is named `Testimonials`, the data array is named `useCases`, and each item has a `quote` field rendered between visible content blocks attributed by `role` ("Content Creators", "Social Media Managers", "Learning & Development Teams"). The visible heading on line 35 says "What you can do with MotionMax" — but the content layout (centered italic-feel quotes attributed to a role) carries the unmistakable visual idiom of customer testimonials.

**Why this is Critical:** FTC §255.2 specifically prohibits using fictional endorsements that "give the impression they are real testimonials" without clear disclosure. The variable name is literally `quote`. The visual grammar matches every other testimonial pattern on the web. A reasonable visitor reads these as customer quotes, even though they are marketing copy.

**Recommended remediation:**
- Rename the visual treatment to clearly read as benefit statements, not quotes: drop the `"…"` styling cues, replace the small `✦` icon, render the text as a short benefit headline ("Polished explainers, no editing timeline") followed by the role tag as the *audience*, not the *attributor*.
- Or, replace with three real customer quotes (with first name + last initial + city, per FTC guidance) when launch is past beta.
- Owner: Herald · Re-verify: Proof + Canon (legal-text reviewer).

---

### CRITICAL-4 — "Demo video coming soon" placeholder reachable from a "Watch Demo" button on the live landing page
**Evidence:**
- `src/pages/Landing.tsx:268-284` — primary "Watch Demo" button that opens a modal
- `src/pages/Landing.tsx:511-543` — modal body renders the literal string `Demo video coming soon` and a fallback CTA, when the brand has explicitly told the user a demo will play.

The marketing Astro page at `marketing/src/pages/index.astro:467-478` *does* wire up a real Guidde iframe — so the same button has different behavior depending on which entry point the user came from. The in-app `Landing.tsx` modal placeholder is the broken one.

**Why this is Critical:** trust beat. A "Watch Demo" CTA that opens "Demo video coming soon" tells a first-time visitor that the brand promises things it cannot deliver. This is also a verb/outcome mismatch (Proof's button-label rule). Severity Critical because it directly impacts pre-purchase trust on the highest-traffic page.

**Recommended remediation (pick one before launch):**
- Wire the same Guidde iframe used in the marketing Astro page (`embed.app.guidde.com/playbooks/wvJwFaqbh66kuXS3hZ23ir?mode=videoOnly`) into the React landing modal, OR
- Hide the "Watch Demo" CTA entirely until the real video is recorded.
- Owner: Herald (decision) + frontend layer (implementation) · Re-verify: Proof.

---

### CRITICAL-5 — "Export 4K" button is shown to users on plans that don't include 4K
**Evidence:** `src/components/editor/EditorTopBar.tsx:352` —
```tsx
{exporting ? `Exporting · ${exportState.progress}%` : exportDone ? 'Download' : 'Export 4K'}
```
The label is hard-coded "Export 4K" with no plan-tier check. Per `src/pages/Pricing.tsx:42-49` and `marketing/src/pages/index.astro:285-294`, the Free plan tops out at **720p**, Creator at **1080p**, and Studio at **4K**. So Free and Creator users are looking at a button that promises an export quality their plan does not allow.

**Why this is Critical:** an implicit promise that the product cannot keep — Proof rule §1 in the agent spec ("flag implicit promises that the product doesn't keep"). When a Free user clicks "Export 4K" and gets a 720p file, that is at minimum a comprehension failure and at worst a deceptive trade-practice signal.

**Recommended remediation:**
- Read the user's plan-tier export ceiling and render the label dynamically: `Export 720p` / `Export 1080p` / `Export 4K`.
- Or use a plan-neutral verb: `Export video`. (Proof prefers the plan-aware version because it sets accurate expectations.)
- Owner: Guide + frontend · Re-verify: Proof.

---

### CRITICAL-6 — Hard-coded countdown to a "PRICE_INCREASE_DATE" needs proof it's real
**Evidence:** `src/components/landing/LandingPricing.tsx:13` —
```ts
const PRICE_INCREASE_DATE = new Date("2026-05-19T23:59:59Z");
```
Combined with `useDaysRemaining()` (lines 22-37) the page renders an urgency countdown. Today is 2026-05-09 — countdown reads ~10 days. The comment on line 11-12 explicitly says "Update this when you want to reset the countdown. Keep ~30 days out." — i.e., the engineers' intent appears to be a perpetually-resetting fake countdown, not an actual price change.

**Why this is Critical:** if no actual price increase is planned for 2026-05-19, this is a textbook "false urgency" dark pattern, banned by the FTC (16 CFR Part 465, the Click-to-Cancel Rule preamble explicitly cites false-urgency patterns) and by the EU Unfair Commercial Practices Directive Annex I §7. For a marketer-audience product, showing this on a regulator's screenshot would be embarrassing.

**Recommended remediation:**
- Either commit to the price change (and let the countdown go to zero, then publish the new price), OR
- Remove the countdown entirely. Pick one — but do not run a perpetually-resetting fake countdown.
- Owner: Penny (pricing) + Herald · Re-verify: Proof + Canon.

---

### CRITICAL-7 — In-app FAQ overstates supported aspect ratios
**Evidence:**
- `src/config/landingContent.ts:108-110`:
  > "What video formats and resolutions are supported? MotionMax supports 16:9 (landscape), 9:16 (portrait / Reels), and 1:1 (square) formats."
- `src/components/dashboard/Hero.tsx:14` and `Hero.tsx:322` — the actual in-app aspect-ratio selector only offers `'16:9' | '9:16'`. There is no `1:1` option in the dashboard create flow.

**Why this is Critical:** the FAQ is a pre-purchase promise. A creator picks MotionMax expecting Instagram square (1:1) support, signs up, and the option is missing. Comprehension + expectation failure on a feature claim.

**Recommended remediation:**
- If 1:1 is on the roadmap, change the FAQ to `MotionMax supports 16:9 (landscape) and 9:16 (portrait / Reels). Square (1:1) is on the roadmap.`
- If 1:1 is not coming, drop the mention entirely.
- Owner: Herald + product · Re-verify: Proof.

---

### MAJOR-1 — "Direct" is one of several copy artifacts on the dashboard hero that read as "clever instead of clear"
**Evidence:** `src/components/dashboard/Hero.tsx`:
- Line 162: headline `What are we making?` — fine
- Line 165: subhead `Describe a scene, paste a link, or drop in a document. MotionMax takes it from there.` — clear, FK-G ~7
- Lines 43, 47: greetings `Burning the midnight oil` (00:00–05:00) and `Late night creative session` (22:00–23:59) — both are English idioms; non-native English speakers in any of the 11 supported languages will not parse them. The other greetings ("Good morning" etc.) translate cleanly. The two idiomatic ones are outliers.
- Line 350: the "Direct" CTA — see Critical-1.

**Recommended remediation:**
- Replace the two idiomatic greetings with literal time-of-day phrasing: `Late night` (00:00–05:00) and `Good night` (22:00–23:59).
- Owner: Guide · Re-verify: Proof.

---

### MAJOR-2 — Autopost lab page lede uses developer jargon to a creator audience
**Evidence:** `src/pages/lab/autopost/AutopostHome.tsx:382-385`:
> **"Recurring video pipelines firing across your connected channels. Each automation writes a fresh script, renders a video, and publishes — on the schedule you set."**

Reading-level scoring (textstat 0.7.13): FK-G **10.2**, FRE **43.1**. Above target.

The substantive issue is "video pipelines firing" — both "pipeline" (in this verb-noun sense) and "fire" (intransitive, of a scheduled job) are developer jargon. The audience for `/lab` is admin-only today (per `_LabLayout` guard) but the page itself does not say "admin-only" in the body — and per `LabHome.tsx:33` the brand frames Lab as the public-soft-launch surface. When this becomes user-facing, the jargon will land as confusion.

**Recommended remediation:** rewrite to plain language — example:
> **"Schedule recurring videos to publish automatically. Each automation writes a script, renders the video, and posts it on the schedule you set."**

FK-G drops to ~7.5 by removing "pipelines firing" and breaking the run-on sentence. Owner: Guide · Re-verify: Proof.

---

### MAJOR-3 — Toast titles use four different capitalization conventions
**Evidence (sample, from grep across `src/`):**
- `useVoiceCloning.ts:124`: `"Voice cloned successfully!"` (sentence case + exclamation)
- `useVoiceCloning.ts:217`: `"Voice renamed"` (sentence case)
- `useSceneRegeneration.ts:62`: `"Audio Regenerated"` (Title Case)
- `useSceneRegeneration.ts:65`: `"Regeneration Failed"` (Title Case)
- `useCinematicRegeneration.ts:140`: `"Regenerating Videos"` (Title Case present-progressive)
- `useCinematicRegeneration.ts:196`: `"Image Edited"` (Title Case past-tense)
- `useWorkspaceSubscription.ts:90`: `"Cannot Generate"` (Title Case verb-only — reads like an error code)
- `Sidebar.tsx:249`: `"Project deleted"` (sentence case)
- `Sidebar.tsx:275`: `"Signed out"` (sentence case)
- `IntakeForm.tsx:746`: `"Automation created — first run scheduled."` (sentence case + full stop)

There is no in-repo style decision committed (no `STYLE.md`, no Pixel/Herald voice doc cited in CAPABILITIES.md), so toasts have drifted into four conventions. For a creator audience this reads as an unpolished product.

**Recommended remediation:** pick one and apply globally. Proof's recommendation, aligned with Microsoft Style Guide and GOV.UK content design: **sentence case, no terminal full stop**. Examples:
- `Voice cloned` (drop the exclamation — reduces "yelly app" feel)
- `Audio regenerated`
- `Sign out failed` (verb-noun sentence-case phrase)
- `Can't generate — add credits to continue` (replace "Cannot Generate" with a sentence the user can read in 1 second)

Owner: Guide · Re-verify: Proof by sampling 10 toasts post-fix.

---

### MAJOR-4 — Voice Lab "Suggested read · phonetically diverse" is jargon for the audience
**Evidence:** `src/pages/VoiceLab.tsx:906`:
> **"Suggested read · phonetically diverse"**

"Phonetically diverse" is a speech-engineering term. The audience is creators and marketers; nine out of ten will not know what it means. The sample sentence underneath ("The quick brown fox jumps over the lazy dog…") is itself a clue but the *label* of the section should be readable on its own.

**Recommended remediation:** `Suggested read · covers all the sounds we need` or `Suggested read · uses every speech sound`. Both score FK-G 4–5. Owner: Guide · Re-verify: Proof.

---

### MAJOR-5 — Voice Lab "Test playground" header pairs with a "● LIVE" status indicator that misleads
**Evidence:** `src/pages/VoiceLab.tsx:1180-1184`:
```
Test playground         ● LIVE
```
The `● LIVE` indicator (line 1184) reads as broadcast-status semantics ("we are live now"). The user is sitting in a sandbox testing a voice; nothing is being broadcast. A creator audience knows "LIVE" from streaming context, which makes this signal misread the surface state.

**Recommended remediation:** drop the `● LIVE` chip. If the engineering intent was to signal "this is connected to the real backend, not a mock", say so plainly: `Connected` or remove the status indicator entirely (the user's prompts working IS the signal). Owner: Guide · Re-verify: Proof.

---

### MAJOR-6 — Marketing FAQ vs. in-app pricing have two different credit-policy descriptions on top of Blocker-3
**Evidence:**
- `marketing/src/pages/index.astro:60`: `"Each generation consumes credits based on complexity and length. Credits reset monthly. You can also purchase credit packs at any time."` — silent on roll-over.
- `src/config/landingContent.ts:119-120`: `"Each generation (video, audio, or infographic) consumes credits based on complexity and length. Credits reset monthly and unused credits do not roll over. You can also purchase credit packs at any time."` — explicit on roll-over.

These are the same FAQ rendered on two surfaces (motionmax.io static marketing site vs. /landing in-app). They should be byte-identical or sourced from a single shared file. Drift here is how Blocker-2 and Blocker-3 happened.

**Recommended remediation:** centralize the FAQ in a single JSON/YAML file consumed by both `marketing/src/pages/index.astro` and `src/config/landingContent.ts`. Owner: Herald + frontend layer · Re-verify: Proof.

---

### MAJOR-7 — "Footer claim" line on the marketing site is unverified
**Evidence:** `marketing/src/pages/index.astro:455`:
> **"Made with AI · Powered by Claude, Hypereal, Seedance"**

`Seedance` is not mentioned anywhere else in the public surfaces (it appears nowhere in `Privacy.tsx` subprocessor list at lines 88-95, which lists Hypereal, Gemini, Claude/OpenRouter, Replicate, Kling, ElevenLabs, Fish, LemonFox, Google Cloud TTS). If Seedance is a real subprocessor, the privacy policy must list it (GDPR Art. 28). If it is not, the footer claim is misleading.

**Recommended remediation:** verify with Comply / engineering. Either add Seedance to `Privacy.tsx:88-95` and the in-app subprocessor list, or remove from the marketing footer. Owner: Herald + Comply · Re-verify: Proof + Canon.

---

### MAJOR-8 — "GDPR compliant" claim on the auth page needs evidence
**Evidence:** `src/pages/Auth.tsx:529-531`:
```
<LockIcon /> GDPR compliant
```

"GDPR compliant" is a claim. Privacy.tsx itself walks the audience through legal bases, transfer mechanisms, and subprocessor list — that's good — but the bare phrase "GDPR compliant" stamped on the auth page is exactly the kind of trust-signal claim European regulators (notably the French CNIL) have called out as misleading when not backed by, e.g., an SCC reference, a DPO contact, or a published DPIA. The auth-page "trust strip" also says "SSL secured" — which is technically wrong (SSL has been deprecated for ten years; the correct term is TLS, but the audience-friendly phrase is "encrypted in transit").

**Recommended remediation:**
- Replace "SSL secured" with "Encrypted in transit" (audience-readable, technically correct).
- Replace "GDPR compliant" with `EU privacy rules respected` and link the phrase to `/privacy`. Stronger trust beat, weaker legal exposure.
- Owner: Guide + Comply · Re-verify: Proof + Canon.

---

### MAJOR-9 — Terms of Service §6 (Credits & Billing) and §9 (Limitation of Liability) score above any reasonable consumer-readability target
**Evidence — Flesch-Kincaid scores from `textstat==0.7.13`:**

| Sample | FK-G | FRE | Words |
|---|---:|---:|---:|
| Terms §6 lead sentence on plan limits (`Terms.tsx:82`) | **16.6** | 29.7 | 30 |
| Terms §9 limitation-of-liability sentence (`Terms.tsx:98`) | **21.1** | 13.2 | 39 |
| Privacy §4 GDPR Art. 6(1)(c) (`Privacy.tsx:80`) | 13.0 | 19.1 | 19 |

**Why this is Major (not Critical):** §6 governs the user's purchase — they have to be able to read it, or the contract is harder to enforce in any consumer-protection forum that applies a "reasonable consumer" reading test. §9 limits the brand's liability — courts in the EU and increasingly in California (Civ. Code §1670.5 unconscionability) discount limitation clauses written above ~FK-G 14. Privacy §4's FK-G 13 is acceptable for a legal-basis section because the GDPR article numbers are normatively required.

**Recommended remediation:** rewrite §6 and §9 with a side-by-side plain-language summary in a callout box, leaving the legal text intact below. Example pattern (used by Stripe, Notion, Linear): a left-rail box that says "Plain-English summary:" and a one-paragraph rewrite that mirrors the legal-text scope. Don't replace the legal text — *augment* it. Owner: Comply (legal liaison) + Herald · Re-verify: Proof + Canon.

---

### MINOR-1 — "tiktok" is lowercased in a suggestion chip
**Evidence:** `src/components/dashboard/Hero.tsx:39`:
```
'Brand teaser for tiktok in French',
```
TikTok's brand name is `TikTok`. Treat brand names as proper nouns. Owner: Guide · Re-verify: Proof.

---

### MINOR-2 — "0:30 minimum" inside the Voice Lab record button reads as a timestamp
**Evidence:** `src/pages/VoiceLab.tsx:893`:
```
"Record live · 0:30 minimum"
```
`0:30` is timestamp grammar, not a duration. For a creator audience used to reading recording-length labels, `30 seconds` or `30 sec` is clearer. Owner: Guide · Re-verify: Proof.

---

### MINOR-3 — "+ Example" label on the Voice Lab playground is too terse
**Evidence:** `src/pages/VoiceLab.tsx:1223`:
```
+ Example
```
`Example` of what? The button repopulates the textarea with `SAMPLE_PROMPT`. Recommended: `Use sample text`. Owner: Guide.

---

### MINOR-4 — "Best Value" badge on credit pack appears in two stylings
**Evidence:**
- `src/components/landing/LandingPricing.tsx:209` — `Best Value` (Title Case, regular weight, primary tag)
- `src/components/billing/tabs/TabTopup.tsx:67` — `BEST VALUE` (UPPERCASE, gold ribbon)
- `src/components/pricing/CreditTopUp.tsx:70` — `Best Value` (Title Case, primary tag)

Three different visual treatments for the same conceptual badge. Pick one. Owner: Pixel (brand) + Guide.

---

### MINOR-5 — "Continue with Google" / "Sign In" / "Sign in" inconsistent capitalization
**Evidence:**
- `Auth.tsx:336` button text: `Continue with Google` (Title Case)
- `Auth.tsx:513`: `Sign In` (Title Case)
- `Auth.tsx:271`: `Back to Sign In` (Title Case)
- `Landing.tsx:140`: `Sign In` (Title Case)
- `marketing/src/pages/index.astro:121`: `Sign in` (sentence case)
- `marketing/src/pages/index.astro:434`: `Sign In` (Title Case in same file as line 121)

Pick one (sentence case is the modern/Microsoft-Style-Guide default). Owner: Guide.

---

### MINOR-6 — `aria-label="Toggle TT"` etc. — abbreviated platform names in screen-reader labels
**Evidence:** `src/pages/lab/autopost/AutopostHome.tsx:478-493`:
```
<KillToggle label="YT" .../>
<KillToggle label="IG" .../>
<KillToggle label="TT" .../>
```
Both the visible label and the `aria-label` use `YT`/`IG`/`TT`. For an admin-only sandbox today this is acceptable shorthand, but `TT` is genuinely ambiguous (TripleTen? TomTom?) and the screen-reader pass should always speak the full platform name. Owner: Guide.

---

### POLISH-1 — "AI handles research, scriptwriting, visuals, voiceover, and editing. You bring the idea."
**Evidence:** `src/pages/Landing.tsx:377-379`. FK-G 9.4 — slightly above the marketing target of ~8 because of the noun-chain. Could read more naturally as: *"You bring the idea. AI handles the script, visuals, voiceover, and editing."* — same content, lower FK, leads with the user. Owner: Herald.

---

### POLISH-2 — Hero tagline is a noun-fragment chain that translates poorly
**Evidence:** `src/pages/Landing.tsx:248`:
> **"Cinematic visuals. Natural voiceover. Seamless transitions. From one idea."**
Three Latinate noun phrases + a prepositional fragment. Textstat scores it FK-G 16.8 / FRE -9.1, which is mostly an artifact of fragment-counting — but the underlying problem is real for non-native English speakers. Consider: *"One idea becomes a video. Cinematic shots, natural voice, smooth cuts."* — FK-G ~6, same beats, contains a verb.

Tag as Polish (not Major) because the sequence is widely understood by English-fluent marketers and the brand voice clearly favors minimalist three-beat rhythm. Owner: Herald.

---

## Reading-level scorecard (representative samples)

Method: `textstat==0.7.13`, default English tokenizer. Targets used: in-app FK-G ≤ 8 (audience: tool-savvy creators, mixed English fluency); marketing FK-G ≤ 8; legal sections governing a purchase FK-G ≤ 12.

| Surface | File:line | FK-G | FRE | Verdict vs. target |
|---|---|---:|---:|---|
| Landing demo subtitle | Landing.tsx:351 | 7.0 | 58.2 | ✓ OK |
| Voice clone consent | VoiceLab.tsx:950 | 8.8 | 73.1 | ✓ OK (and FRE high — the audience can read it) |
| Auth signup subtitle | Auth.tsx:304 | 9.7 | 40.1 | ⚠ slightly above |
| Landing features intro | Landing.tsx:377-379 | 9.4 | 38.6 | ⚠ slightly above |
| Autopost lede | AutopostHome.tsx:382-385 | 10.2 | 43.1 | ⚠ above (jargon — see Major-2) |
| Settings intro | Settings.tsx:254 | 11.3 | 24.5 | ⚠ above |
| Landing FAQ research | landingContent.ts:30 | 12.6 | 35.3 | ⚠ above (em-dash chain breaks scanning) |
| SEO meta description | SeoHead.tsx:37 | 13.7 | 18.4 | ⚠ above marketing target |
| Privacy §4 GDPR | Privacy.tsx:80 | 13.0 | 19.1 | ✓ acceptable for legal |
| Terms §6 credits | Terms.tsx:82 | 16.6 | 29.7 | ✗ above legal target — see Major-9 |
| Terms §9 LoL | Terms.tsx:98 | 21.1 | 13.2 | ✗ way above legal target — see Major-9 |
| Hero tagline | Landing.tsx:248 | 16.8† | -9.1† | † artifact of fragment counting — see Polish-2 |

---

## Cross-reviewer handoffs

- **To Comply (legal-text reviewer):** Blocker-1 (false social-proof claims), Blocker-3 (credits contradiction in Terms vs. Pricing), Critical-2 (unsubstantiated quantitative comparison), Critical-3 (testimonial-style attribution), Critical-6 (perpetually-resetting countdown), Major-7 (Seedance subprocessor not listed in Privacy), Major-8 (GDPR-compliant claim), Major-9 (Terms readability).
- **To Tongue (localization):** Major-1 (English idioms in Hero greetings), Polish-2 (hero tagline fragments translate poorly), Critical-1 (the verb "Direct" has no clean translation in most languages — it becomes a noun in French/Spanish/etc., which makes the issue worse, not better).
- **To Halo (a11y reviewer):** Minor-6 (`aria-label="Toggle YT/IG/TT"` should speak full platform name).
- **To Herald (copy creator):** every Blocker, Critical-1, Critical-3, Critical-4, Critical-7, Major-1, Major-7.
- **To Guide (in-app microcopy):** Critical-1, Critical-5, Major-2, Major-3, Major-4, Major-5, Major-6, Major-8, Minor-1, Minor-2, Minor-3, Minor-5, Minor-6.

---

## Severity tally
- Blocker: **3**
- Critical: **7**
- Major: **9**
- Minor: **6**
- Polish: **2**

Total: **27 findings**, all evidenced by file:line, source-comment artifact, cross-page contradiction, or measured reading-level score.

---

**Reviewer:** Proof
**Status:** Review (per studio communication protocol — Jury synthesizes)
**Re-verification owner per finding:** noted inline; default re-verifier is Proof unless escalated to Canon.
