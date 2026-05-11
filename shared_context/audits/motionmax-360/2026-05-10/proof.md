# PROOF — Content & Wording Audit — motionmax-360

**Reviewer:** Proof (Content & Wording Auditor)
**Audit date:** 2026-05-10
**Audience anchor:** tool-savvy creative adults (creators, marketers, video producers). Not developers. Not seniors. Mobile-heavy.
**Reading-level target:** 7th–8th grade for marketing surfaces; 6th grade for empty/error/microcopy.
**Method:** static read of customer-facing strings across landing, marketing, auth, help, editor, admin, microcopy/error utilities, FAQ config, voice/speaker labels, autopost lab. No browser automation.
**Scope limit:** static analysis only. No live render, no localized-string inspection beyond English source, no Flesch readability tooling output captured (scores below are estimates from hand-counting syllables/sentences against the Flesch formula). When a finding cannot be verified statically, I write "Unable to verify from static analysis."

---

## Category — Cross-surface plan-name inconsistency (Brand voice + truthfulness)

### F-01 [Critical] Public plan names diverge across four customer-facing surfaces
- **One-sentence issue:** The same paid tiers are called "Creator/Studio" in landing pricing, "Creator/Professional" in landing FAQ, "Pro/Studio" in Help FAQ (with conflicting prices), and "Creator/Studio" in marketing FAQ — readers cannot tell what plan they are buying.
- **Evidence:**
  - Source of truth (the actual checkout-driving config): `src/components/landing/LandingPricing.tsx:54` `name: "Creator"` and `:79` `name: "Studio"`.
  - `src/config/landingContent.ts:115` (FAQ "Can I use my own voice?") — "Absolutely. **Creator and Professional** plans include voice cloning..." — Professional does not exist publicly; `src/config/stripeProducts.ts:25` confirms "`"professional"` key kept for backward compat (maps to Studio)".
  - `src/pages/Help.tsx:46-50` — "Free includes 1,000 credits/month and watermarked output. **Pro ($29/mo)** unlocks 50,000 credits, HD exports and voice cloning. **Studio ($99/mo)** adds 4K, priority queue, **5 team seats**, brand kits and removed branding." None of these numbers, names, or features match `LandingPricing.tsx` (Creator + Studio, both single-seat, both with voice cloning).
  - `marketing/src/pages/index.astro:55-57` — FAQ "Can I use my own voice?" — "Absolutely. **Creator and Studio** plans include voice cloning."
- **Severity:** Critical — actively misleads buyers about what they are paying for; violates Proof rule #6 (audience harm) and rule #2 (every superlative requires evidence — pricing claims are evidence-bearing).
- **Fix:** Solution → use a single canonical plan name list. Location → `src/config/landingContent.ts:115`, `src/pages/Help.tsx:33-160` (entire FAQ array), `marketing/src/pages/index.astro:55-57`. How → import plan names + prices from `src/config/products.ts` / `src/lib/planLimits.ts` and template the FAQ strings, or replace literals with `Creator` and `Studio` everywhere; delete the entire "Pro $29 / Studio $99 / 5 seats" answer at `Help.tsx:46-50` and rewrite from `LandingPricing.tsx` ground truth.
- **Effort:** S

### F-02 [Major] Admin tooling exposes ghost plan "Pro" in operator-facing copy
- **One-sentence issue:** Admin filters and announcement audience selectors offer a "Pro" segment that does not exist in the live product, causing operators to send announcements to a tier nobody is on.
- **Evidence:**
  - `src/components/admin/tabs/TabUsers.tsx:75` `type PlanFilter = "All" | "Studio" | "Pro" | "Free";` and `:77` `const PLANS: PlanFilter[] = ["All", "Studio", "Pro", "Free"];`.
  - `src/components/admin/tabs/TabAnnouncements.tsx:89` `"All", "Studio", "Pro", "Free", "Active 7d", "Inactive 30d", "EU only",`.
  - Live plans per `LandingPricing.tsx:54,79`: only `Creator` and `Studio` (plus implicit `Free`).
  - `src/components/admin/AdminSubscribers.tsx:194` shows a `<SelectItem value="professional">Professional</SelectItem>` which compounds the same divergence on the admin side.
- **Severity:** Major — admin is internal but the segmentation choice drives outbound user-facing copy (announcements, mass emails). Operator confusion produces user-facing content errors.
- **Fix:** Solution → replace `"Pro"` with `"Creator"` in plan filter arrays; remove the legacy `professional` SelectItem or relabel it `Creator (legacy)` if there are still lingering DB rows on the old key. Location → `TabUsers.tsx:75-77`, `TabAnnouncements.tsx:89`, `AdminSubscribers.tsx:194`. How → derive the list from `src/lib/planLimits.ts` (which already normalizes `"professional" → "studio"` at line 33).
- **Effort:** XS

---

## Category — Truthfulness & substantiation (Marketing claims)

### F-03 [Critical] "2,400+ creators / 2,400+ marketers" social-proof claim is fabricated
- **One-sentence issue:** Two prominent landing-hero claims and the pricing card's "Join 2,400+ creators" badge are hard-coded with a TODO admitting the number is not real.
- **Evidence:**
  - `src/pages/Landing.tsx:289` "Free to start · No credit card required · **Used by 2,400+ marketers**".
  - `src/pages/Landing.tsx:299-302` "// TODO: replace 2,400+ with a real figure from your analytics/DB" then "Join **2,400+** creators already making videos".
  - `src/components/landing/LandingPricing.tsx:16-17` "// TODO: replace with a real figure fetched from your analytics/DB once available" then `const SOCIAL_PROOF_COUNT = "2,400+"` used in `socialProof: 'Join ${SOCIAL_PROOF_COUNT} creators'` (line 76) and `'Trusted by ${SOCIAL_PROOF_COUNT} creators'` (line 101).
  - `marketing/src/pages/index.astro:202` "Free to start · No credit card required · Used by **2,400+ marketers**" and `:213` "Join **2,400+** creators already making videos".
  - The two claims also conflict with each other in audience: "marketers" in the trust strip vs. "creators" in the avatar row, on the same screen.
- **Severity:** Critical — unsubstantiated quantitative marketing claim crosses into deceptive-advertising territory (FTC Endorsement Guides; EU UCPD); also brittle against any press scrutiny.
- **Fix:** Solution → either remove the count and replace with a verified qualitative line, or wire to a live counter and round down for safety. Location → `Landing.tsx:289,300-302`; `LandingPricing.tsx:17,76,101`; `marketing/src/pages/index.astro:202,213`. How → temporary copy "Free to start · No credit card required · Built for creators and marketers"; long-term hook to a `count(*)` Supabase RPC behind a server-cached endpoint (do not query Postgres on every landing render).
- **Effort:** S (copy swap) / M (live counter)

### F-04 [Major] Hard-coded refund window and free-credits figure conflict with public FAQ
- **One-sentence issue:** Help.tsx promises "pro-rated refunds within 14 days" + "Annual plans are refundable within 30 days" + "1,000 credits/month" on Free, while `landingContent.ts` says credits are vague "monthly credits" and never specifies the refund window — buyers will hit support after reading one and finding the other.
- **Evidence:**
  - `src/pages/Help.tsx:64-67` "We offer pro-rated refunds within 14 days of purchase if you've used less than 25% of your credits. Annual plans are refundable within 30 days."
  - `src/config/landingContent.ts:104-106` (FAQ free-plan answer) — "Yes! The free plan includes monthly credits..." (no number).
  - `src/pages/Help.tsx:46` — "Free includes 1,000 credits/month".
  - Refund terms must additionally cross-check `Terms.tsx` and Stripe billing portal copy. **Unable to verify from static analysis whether `Terms.tsx` matches these numbers** — flagged for Comply/Canon to validate.
- **Severity:** Major — comprehension failure with billing impact.
- **Fix:** Solution → drive both surfaces from a shared `src/config/billingPolicy.ts` constant (`FREE_CREDITS_PER_MONTH`, `REFUND_WINDOW_DAYS`, `REFUND_ANNUAL_DAYS`, `REFUND_USAGE_THRESHOLD_PCT`). Location → introduce file; reference from `landingContent.ts:104` and `Help.tsx:64-67`. How → templatize both FAQ answers and have Comply/Canon verify the live Terms.tsx contains identical numbers.
- **Effort:** S

### F-05 [Major] Feature-card claim "9+ AI voices" contradicts the 25+ speakers shipped in code
- **One-sentence issue:** Landing claims the product offers "9+ AI voices" while `SpeakerSelector.tsx` lists at least 25 named speakers, understating the product and confusing buyers comparing tiers.
- **Evidence:**
  - `src/config/landingContent.ts:23-24` "9+ AI voices with emotion-aware style. Clone your own voice for consistent narration across projects."
  - `marketing/src/pages/index.astro:13` same claim "9+ AI voices..."
  - `src/components/workspace/SpeakerSelector.tsx:102,111,120,135` (and the rest of that file's `sm:*` array) ships well over a dozen speakers; combined with `o:*` ElevenLabs entries the count exceeds 25.
- **Severity:** Major — understated claim is ironically an undersell, but creates a mismatch buyers will notice on entering Voice Lab and report as a bait-and-switch in the wrong direction.
- **Fix:** Solution → replace "9+ AI voices" with an accurate range, or reword to a benefit ("Dozens of AI voices in 11 languages, plus your own"). Location → `landingContent.ts:23-24`, `marketing/src/pages/index.astro:13`. How → if marketing wants concrete numbers, source from `SpeakerSelector.tsx` length once and gate behind a build-time constant.
- **Effort:** XS

### F-06 [Major] Feature card "15-scene videos" contradicts marketing site "15–36 scene videos"
- **One-sentence issue:** App-shell landing claims a fixed 15 scenes per video while the marketing site claims a 15–36 range, so the same product appears feature-bounded vs. flexible depending on entry surface.
- **Evidence:**
  - `src/config/landingContent.ts:18` "15-scene videos with AI image-to-video..."
  - `marketing/src/pages/index.astro:8` "15–36 scene videos with AI image-to-video..."
  - `src/pages/Landing.tsx:415` (Cinematic mode card) "**15 AI-generated video scenes**..." aligns with the in-app constant.
- **Severity:** Major — direct contradiction across two top-of-funnel surfaces.
- **Fix:** Solution → pick the truthful upper bound from product (Pixel/Forge to confirm) and use it consistently. Location → `landingContent.ts:18`, `marketing/src/pages/index.astro:8`, `Landing.tsx:415`. How → define `MAX_SCENES_PER_VIDEO` once in `src/config/products.ts` and reference everywhere.
- **Effort:** XS

### F-07 [Critical] "Storytelling" product remnants visible to public despite removal mandate
- **One-sentence issue:** The audit brief states Storytelling is being removed; the word still appears in user-visible SEO keywords, voice-speaker descriptions, and a public LLMs file.
- **Evidence (storytelling search across the repo):**
  - `src/components/landing/SeoHead.tsx:41` `<meta name="keywords" content="...video storytelling...">` — public.
  - `src/components/workspace/SpeakerSelector.tsx:102` "Female · Bright, expressive · **storytelling**", `:111` "Mature, **storytelling** · documentary", `:120` "Gravelly, mature · **storytelling**", `:135` "Expressive, **storytelling** · narrative" — visible in Voice Lab speaker chips.
  - `public/llms.txt` — contains storytelling references (file is fetched by LLM crawlers and visible to anyone who navigates to it).
  - `README.md`, `worker/src/services/buildCinematic.ts`, `supabase/functions/_shared/audioEngine.ts`, `supabase/functions/generate-video/index.ts`, `worker/src/handlers/generateVideo.ts`, `worker/src/handlers/handleFinalize.ts`, `worker/src/services/promptSections.ts`, `worker/src/services/audioProviders.ts`, `index.html`, `tasks/vega-low.txt`, `src/components/dashboard/ProjectsGallery.tsx:35,39` — internal references that may or may not be reachable depending on whether legacy projects render those badges to users. **Unable to verify from static analysis** which of these still surface to end users; flagged for re-test.
  - `supabase/migrations/20260422030000_storytelling_to_doc2video.sql` confirms the rename intent at the data layer.
- **Severity:** Critical (for the user-visible items: SeoHead keywords + SpeakerSelector descriptions + llms.txt). Major for the internal items pending verification.
- **Fix:** Solution → remove "video storytelling" from `SeoHead.tsx:41` keywords; rewrite the four `description: "...storytelling..."` strings in `SpeakerSelector.tsx` to neutral voice-quality terms ("expressive", "documentary", "narrative" — drop the legacy product name); strip storytelling references from `public/llms.txt`. Location → as above. How → straight string replace; do not introduce a "Visual Stories" rebrand in voice-speaker labels (those should describe vocal style, not product modes).
- **Effort:** XS

### F-08 [Minor] "Demo video coming soon" placeholder ships alongside a real Guidde-embedded demo
- **One-sentence issue:** The Watch Demo modal shows "Demo video coming soon" microcopy while the page also embeds a real Guidde walkthrough — readers can't tell which is the real demo.
- **Evidence:** `src/pages/Landing.tsx:333` `<iframe src="https://embed.app.guidde.com/playbooks/wvJwFaqbh66kuXS3hZ23ir?mode=videoOnly" ...>` (real demo, embedded in-page); `src/pages/Landing.tsx:520-530` modal placeholder "Demo video coming soon" with a sign-up CTA. Inline source comment at `:520` confirms the modal is a placeholder.
- **Severity:** Minor — the in-page Guidde demo carries the demo experience; the modal mostly serves as a CTA. But the words "coming soon" plant doubt.
- **Fix:** Solution → either point the modal at the same Guidde URL or replace the `<div>` block at `:523-540` with the real video; rewrite header from "90-second demo" to a verified length (Guidde tells you the duration). Location → `Landing.tsx:511-543`. How → swap placeholder block for an `<iframe>` with the same `src` as `:333` or remove the modal altogether and have "Watch Demo" smooth-scroll to `#demo`.
- **Effort:** XS

---

## Category — Reading level & jargon (Audience-relative)

### F-09 [Major] Trust strip leaks the vendor name "Supabase" to a non-developer audience
- **One-sentence issue:** A trust indicator on the public landing page reads "Your data stays yours · Supabase-hosted infrastructure" — content creators and marketers do not know what Supabase is, so the line creates anxiety without earning trust.
- **Evidence:** `src/config/landingContent.ts:67` `detail: "Your data stays yours · Supabase-hosted infrastructure"`. Audience per brief: "tool-savvy creative adults — content creators, marketers, video producers. NOT developers."
- **Severity:** Major — Proof rule #1 (the audience is not the writer); the line is engineering-speak in a marketing surface.
- **Fix:** Solution → translate to outcome language. Location → `landingContent.ts:67`. How → `detail: "Your data stays yours · Encrypted at rest and in transit"` (verify the encryption claim with Halo before shipping; if false, fall back to `"Your data stays yours · Private by default"`).
- **Effort:** XS

### F-10 [Major] FaqItem "How do credits work?" leaks technical detail without answering the buyer's actual question
- **One-sentence issue:** The credits FAQ explains roll-over policy ("unused credits do not roll over") but never tells a buyer how many credits a typical 60-second video consumes; the same answer set in Help.tsx says "8 credits per second of 1080p" yet that detail is missing on the public landing.
- **Evidence:** `src/config/landingContent.ts:118-121` "Each generation (video, audio, or infographic) consumes credits based on complexity and length. Credits reset monthly and unused credits do not roll over." vs. `src/pages/Help.tsx:55-58` "Each second of finished 1080p video costs roughly 8 credits; 4K costs 24. Voice generation is 1 credit per word."
- **Severity:** Major — visitors comparing plans cannot map credits to videos without signing in to read Help.
- **Fix:** Solution → add a one-sentence concrete example before the policy clause. Location → `landingContent.ts:118-121`. How → "About 8 credits per second of 1080p video — a one-minute cinematic uses about 480 credits. Credits reset monthly and don't roll over." Cross-check the 8-credit number with the worker pricing logic before publishing.
- **Effort:** XS

### F-11 [Major] Hero subtitle uses staccato fragment chain that is hard to parse on small screens
- **One-sentence issue:** The hero line "Cinematic visuals. Natural voiceover. Seamless transitions. From one idea." is four sentence fragments with the noun phrase "From one idea" doing the syntactic heavy lifting alone — a creator scanning on a phone reads four nouns before reaching a verb.
- **Evidence:** `src/pages/Landing.tsx:247-249` and `marketing/src/pages/index.astro:178-181`. Estimated Flesch-Kincaid grade for a fragment chain like this is undefined (FK requires sentences); replaced with full-sentence rewrite would land near grade 5.
- **Severity:** Major — the headline is the single most-read string on the site.
- **Fix:** Solution → keep the noun-rhythm but add a complete sentence first, drop one fragment for breathing room. Location → `Landing.tsx:247-249`, `marketing/src/pages/index.astro:178-181`. How → "**Turn one idea into a finished video.** Cinematic visuals. Natural voiceover. Seamless transitions." (3 fragments instead of 4, opens with a verb-led sentence). Final wording is Herald's call.
- **Effort:** XS

### F-12 [Minor] FAQ answer "MotionMax runs server-side only via Supabase Auth + RLS" leaks stack to API readers
- **One-sentence issue:** The Help "Where can I find API documentation?" answer references Supabase Auth + RLS — even API readers should hear product capability, not internal implementation.
- **Evidence:** `src/pages/Help.tsx:144-149` "Today MotionMax runs server-side only via **Supabase Auth + RLS** — programmatic access keys, webhooks and rate-limit dashboards will land alongside the public REST endpoints."
- **Severity:** Minor — API audience can handle the term, but it tells them nothing about *what they can build*.
- **Fix:** Solution → focus on what's available now and what's coming. Location → `Help.tsx:144-149`. How → "Public API and SDKs are coming soon. Today MotionMax is a hosted product only; programmatic API keys, webhooks, and rate-limit dashboards ship with the public REST endpoints."
- **Effort:** XS

### F-13 [Minor] Body claim "Used by 2,400+ marketers" calls out "marketers" but the avatar row immediately below says "creators"
- **One-sentence issue:** The same hero block addresses two audiences in two adjacent strings, fragmenting the page's positioning.
- **Evidence:** `src/pages/Landing.tsx:289` "Used by 2,400+ marketers" then `:301` "Join **2,400+** creators already making videos". Same on `marketing/src/pages/index.astro:202,213`.
- **Severity:** Minor (subordinate to F-03 which kills the number altogether).
- **Fix:** Solution → use one audience term consistently per page. Location → `Landing.tsx:289,301`; `marketing/src/pages/index.astro:202,213`. How → either "creators and marketers" (broader, single phrase) or pick one based on the page's PMF target and use everywhere.
- **Effort:** XS

---

## Category — Microcopy & error messages

### F-14 [Major] Auth lockout toast uses "30 seconds" hard-coded literal that drifts from the real timer
- **One-sentence issue:** When the user is locked out of sign-in, the toast says "Locked for 30 seconds" but the lockout duration is a constant (`LOCKOUT_DURATION_MS`) that may be changed without updating this string.
- **Evidence:** `src/pages/Auth.tsx:25` `const LOCKOUT_DURATION_MS = 30_000;` and `:162` `toast.error("Too many failed attempts. Locked for 30 seconds.");`. The number is duplicated.
- **Severity:** Major — comprehension fails the moment the constant changes; also the "30 seconds" reads as policy-by-fiat without explaining *why* the user is locked out.
- **Fix:** Solution → derive the seconds from the constant; rewrite the message to explain cause + remedy. Location → `Auth.tsx:162`. How → ``toast.error(`Too many failed sign-ins. Try again in ${LOCKOUT_DURATION_MS / 1000} seconds.`)``. Better still: add one short sentence on remedy ("If you forgot your password, use Reset password.").
- **Effort:** XS

### F-15 [Major] Auth "Try again in {n}s" abbreviates seconds in a way the audience reads as a unit symbol
- **One-sentence issue:** The countdown toast `Too many attempts. Try again in 12s.` uses "s" — physics convention, not consumer microcopy.
- **Evidence:** `src/pages/Auth.tsx:147` ``toast.error(`Too many attempts. Try again in ${secsLeft}s.`)``.
- **Severity:** Major — small but read on every locked-out attempt; a tool-savvy creative will read "s" but "seconds" is plain-language standard.
- **Fix:** Solution → spell the unit. Location → `Auth.tsx:147`. How → `Too many attempts. Try again in ${secsLeft} second${secsLeft === 1 ? '' : 's'}.`.
- **Effort:** XS

### F-16 [Major] `getAuthErrorMessage` "user not found" answer suggests sign-up to existing-account-confused users
- **One-sentence issue:** The mapped error reads "No account found with that email. Did you mean to sign up?" — but Supabase returns "user not found" *also* when an email exists but is unconfirmed, so the message can route a real user to a redundant sign-up flow.
- **Evidence:** `src/lib/errorMessages.ts:42-44` `if (msg.includes("user not found") || msg.includes("no user found")) { return "No account found with that email. Did you mean to sign up?"; }`. This branch is checked before the `email_not_confirmed` branch at `:52`.
- **Severity:** Major — user-flow misdirection; creates duplicate-account headaches.
- **Fix:** Solution → reorder the checks so `email_not_confirmed` matches first, and soften the user-not-found copy. Location → `errorMessages.ts:42-54`. How → swap the order; rewrite the user-not-found return to "We couldn't find that account. Check the email, or create a new account if you're new."
- **Effort:** XS

### F-17 [Minor] "Connection issue" vs "Connection interrupted" — same network class, two strings
- **One-sentence issue:** The auth flow returns "Connection issue. Please check your internet and try again." while the operational flow returns "Connection interrupted. Please check your internet and try again." for the same `failed to fetch` / `network` error class.
- **Evidence:** `src/lib/errorMessages.ts:67-69` (auth) vs `:109-111` (operational). Same root cause, different microcopy.
- **Severity:** Minor — small voice break.
- **Fix:** Solution → unify to a single string. Location → `errorMessages.ts:69,111`. How → both return `"We couldn't reach the server. Check your connection and try again."`.
- **Effort:** XS

### F-18 [Minor] "Too short" password message hard-codes "8 characters" while the constant is configurable
- **One-sentence issue:** `getAuthErrorMessage` returns "Password must be at least 8 characters long." regardless of the actual `MIN_PASSWORD_LENGTH` constant in `Auth.tsx`.
- **Evidence:** `src/lib/errorMessages.ts:48` "Password must be at least 8 characters long." vs `src/pages/Auth.tsx:21` `const MIN_PASSWORD_LENGTH = 8;`. Two sources of truth.
- **Severity:** Minor — currently consistent at 8, but will drift on the first policy change.
- **Fix:** Solution → import the constant or move it to a shared `src/config/auth.ts`. Location → `errorMessages.ts:48`, `Auth.tsx:21`. How → export `MIN_PASSWORD_LENGTH` from a shared module; reference in both.
- **Effort:** XS

### F-19 [Minor] "Sign-in failed. Please try again." swallows the actual cause on OAuth catch-all
- **One-sentence issue:** When Google sign-in throws (network, popup-blocked, third-party-cookie-blocked), the user sees a generic "Sign-in failed" with no remedy — popup-blocker is by far the most common cause and deserves a hint.
- **Evidence:** `src/pages/Auth.tsx:122-124` `} catch { toast.error("Sign-in failed. Please try again."); }`.
- **Severity:** Minor — narrows on a specific edge case.
- **Fix:** Solution → at minimum mention popups/cookies; even better, branch on error message. Location → `Auth.tsx:122-124`. How → ``toast.error("Sign-in failed. If a popup didn't appear, allow popups and third-party cookies for this site, then try again.")``.
- **Effort:** XS

---

## Category — Tone & voice consistency

### F-20 [Major] Marketing site uses emoji icons, in-app landing uses Lucide icons — same product, two visual voices
- **One-sentence issue:** `marketing/src/pages/index.astro` uses 🎬 🎙️ ✨ 💬 🌍 ✏️ as feature icons; `src/config/landingContent.ts` uses `Film, Mic, Wand2, Subtitles, Globe, Pencil` from Lucide — the brand voice document (per brief) says aqua + gold only, but the visual voice still differs by surface.
- **Evidence:**
  - `marketing/src/pages/index.astro:6,11,16,21,26,31` — emoji icons.
  - `src/config/landingContent.ts:14-51` — Lucide icons.
  - Per brief: aqua #14C8CC + gold #E4C875 only; emojis are the operating-system color set.
- **Severity:** Major — emoji on a sober brand voice reads as inconsistent; also emoji rendering varies dramatically across iOS / Android / Windows.
- **Fix:** Solution → replace marketing emoji with Lucide-equivalent SVGs styled in aqua/gold. Location → `marketing/src/pages/index.astro:4-35` (the `features` array). How → import Lucide-static SVGs at build time or hand-author the same six icons; coordinate with Pixel before swapping.
- **Effort:** S

### F-21 [Minor] Em-dash and middle-dot usage inconsistent across surfaces
- **One-sentence issue:** Trust copy uses ` · ` (middle dot), feature descriptions use ` — ` (em dash) and ` - ` (hyphen) for the same separator role; the brief explicitly says "no long dashes" but copy still ships with em dashes.
- **Evidence:** `src/config/landingContent.ts:18` "15-scene videos" (hyphen as compound modifier — fine) but `:30` "researches your topic for accuracy — verified facts, real appearances, cultural context — then writes the script." (em dashes in body copy).
  Brief explicitly says: "no long dashes."
  `marketing/src/pages/index.astro:18` repeats the em-dash usage.
- **Severity:** Minor — consistency, not comprehension.
- **Fix:** Solution → replace em dashes with periods or commas per the brief. Location → all `landingContent.ts` and `marketing/src/pages/index.astro` body strings. How → "researches your topic for accuracy. Verified facts, real appearances, cultural context. Then writes the script."
- **Effort:** XS

### F-22 [Polish] Pricing button labels mix verb forms ("Start Creating" vs "Go Studio")
- **One-sentence issue:** The Creator card CTA reads "Start Creating" (verb-imperative) while the Studio card reads "Go Studio" (verb + tier-name) — neither matches the canonical pattern.
- **Evidence:** `src/components/landing/LandingPricing.tsx:74,99` `buttonText: "Start Creating"` and `buttonText: "Go Studio"`.
- **Severity:** Polish.
- **Fix:** Solution → unify pattern. Location → `LandingPricing.tsx:74,99`. How → `"Start with Creator"` / `"Start with Studio"` or `"Choose Creator"` / `"Choose Studio"`.
- **Effort:** XS

---

## Category — Inclusive & plain language

### F-23 [Minor] Internal-doc string "whitelist" appears in inline editor comments visible to admins
- **One-sentence issue:** `RichEditor.tsx` (admin tool) contains "the email sanitiser whitelists" in a JSDoc and the same word in an inline comment — admin-visible code, but flagged because Microsoft + GOV.UK style guides recommend "allowlist".
- **Evidence:** `src/components/admin/_shared/RichEditor.tsx:6` "// using only tags the email sanitiser **whitelists** (`p`, `br`, `strong`,...)" and `:165` "// Inline styles only — keeping the email sanitiser's **whitelist**".
- **Severity:** Minor — code-comment level; not customer-facing, but admin-facing and part of style-guide hygiene.
- **Fix:** Solution → replace with `allowlists` / `allowlist`. Location → `RichEditor.tsx:6,165`. How → straight string replace.
- **Effort:** XS

### F-24 [Minor] Voice cloning consent disclosure is inside a paragraph, not a checkbox
- **One-sentence issue:** Help.tsx tells users "You must own the voice or have written consent" inside a paragraph, but Voice Lab itself (per brief) is the action surface — Proof cannot verify whether the consent is enforced as a checkbox at upload time.
- **Evidence:** `src/pages/Help.tsx:84-86` "You must own the voice or have written consent — see our acceptable-use policy." **Unable to verify from static analysis** whether VoiceLab.tsx upload UI presents an explicit consent checkbox; flagged for Comply.
- **Severity:** Minor (escalates to Critical if VoiceLab.tsx lacks the checkbox — coordinate with Comply/Halo).
- **Fix:** Solution → add an "I confirm I own this voice or have written consent" required checkbox to the Voice Lab clone-upload step, with consequences spelled out (account suspension on misuse). Location → `src/pages/VoiceLab.tsx` clone-upload form. How → checkbox component + form-submit gate; mirror the language in Help.tsx for consistency.
- **Effort:** S

---

## Category — Localization / 11-language readiness

### F-25 [Critical] All hero, FAQ, microcopy strings are hard-coded English in TSX/Astro — no i18n key indirection visible
- **One-sentence issue:** Brief states 11 languages are claimed, but every customer-facing string surveyed is a literal English JSX/TSX/Astro string with no `t()` call, no i18n provider, no translation-key mapping in scope; localized launch is infeasible without a content-extraction step.
- **Evidence sample (literal strings, not behind a translation function):**
  - `src/pages/Landing.tsx:140,146,243,247-249,288-290,300-302,318,374-379,399-407` — every visible string.
  - `src/pages/Auth.tsx:209,236,260-264,296-312,335,343,386,397,409` — every visible string.
  - `src/pages/Help.tsx:23-160` — entire FAQ array; `:178-184` topic labels.
  - `src/lib/errorMessages.ts:17,38,43,48,53,58,63,68,73,78,83,92,103,110,114,120,125,130,135,140,145,154` — every return string.
  - `src/config/landingContent.ts:14-127` — features, trust, FAQ all hard-coded.
  - `marketing/src/pages/index.astro:4-66` and the hero/feature section literals.
- **Severity:** Critical (per brief: "11 languages claimed"). The infrastructure to deliver on the marketing claim is absent.
- **Fix:** Solution → introduce an i18n layer (e.g., `react-i18next` for the SPA, Astro's built-in i18n for the marketing site), extract strings, and start with English + one pilot language to validate the pipeline. Location → all the files above. How → coordinate with Tongue (localization specialist) to define key naming + extraction tooling; do NOT attempt a literal swap on every file at once. Until i18n ships, soften the marketing claim from "11 languages" to "11 voiceover languages" (which is true at the speaker layer per `landingContent.ts:42-44`) — see F-26 below.
- **Effort:** L

### F-26 [Major] "11 Languages" trust-strip claim conflates voiceover language with UI language
- **One-sentence issue:** The "11 Languages Supported" trust pill reads as if the entire product is localized, but the eleven languages are voiceover/script-output languages only.
- **Evidence:** `src/config/landingContent.ts:75-78` trust indicator `label: "11 Languages Supported"`, `detail: "Create videos in English, French, Spanish, and 8 more languages"` — claim is specifically about video output. But on first read the user assumes the whole UI is translated. F-25 confirms it isn't.
- **Severity:** Major — implicit promise the product can't keep until F-25 ships.
- **Fix:** Solution → tighten the noun. Location → `landingContent.ts:75-78`, `:42-44`, `marketing/src/pages/index.astro:25-29`. How → relabel `"11 Voiceover Languages"` and `"Create video voiceovers in English, French, Spanish, and 8 more languages"`.
- **Effort:** XS

---

## Production Blockers (must fix before launch)

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| F-01 | Critical | Plan names diverge across 4 customer surfaces | `landingContent.ts:115`, `Help.tsx:46-50`, `marketing/.../index.astro:55-57`, vs `LandingPricing.tsx:54,79` |
| F-03 | Critical | "2,400+ marketers/creators" social-proof number is fabricated | `Landing.tsx:289,300-302`, `LandingPricing.tsx:17,76,101`, `marketing/.../index.astro:202,213` |
| F-07 | Critical | Storytelling product remnants visible (SEO keywords, voice descriptions, llms.txt) | `SeoHead.tsx:41`, `SpeakerSelector.tsx:102,111,120,135`, `public/llms.txt` |
| F-25 | Critical | "11 languages" claimed but zero i18n indirection in the codebase | All TSX/Astro pages |

## Top 10 Priority Fixes (ordered by user-facing harm × effort efficiency)

| Rank | ID | Severity | Effort | Action |
|------|----|----------|--------|--------|
| 1 | F-01 | Critical | S | Unify plan names — derive from `LandingPricing.tsx`; fix `Help.tsx:46-50` and `landingContent.ts:115` |
| 2 | F-03 | Critical | S | Remove or wire up the "2,400+" social-proof number across `Landing.tsx`, `LandingPricing.tsx`, marketing site |
| 3 | F-07 | Critical | XS | Strip "storytelling" from `SeoHead.tsx:41`, `SpeakerSelector.tsx`, `public/llms.txt` |
| 4 | F-26 | Major | XS | Relabel "11 Languages" → "11 Voiceover Languages" in trust strip + features (interim until F-25 ships) |
| 5 | F-09 | Major | XS | Replace "Supabase-hosted infrastructure" trust line with outcome wording |
| 6 | F-02 | Major | XS | Remove ghost "Pro" plan from `TabUsers.tsx`, `TabAnnouncements.tsx`, `AdminSubscribers.tsx` |
| 7 | F-05 | Major | XS | Replace "9+ AI voices" with accurate count or qualitative phrase |
| 8 | F-06 | Major | XS | Reconcile "15-scene" vs "15–36 scene" — pick one truthful number |
| 9 | F-14 + F-15 + F-16 | Major | XS | Auth microcopy: derive lockout seconds from constant; spell "seconds"; reorder error-mapping branches |
| 10 | F-11 | Major | XS | Rewrite hero subtitle to lead with a complete sentence |

---

## Out-of-scope / requires re-test

- **F-08** (Demo placeholder) — verify against the live build whether the modal still says "coming soon" after the next deploy.
- **F-24** (Voice consent checkbox) — Halo/Comply must verify VoiceLab.tsx enforces written-consent acknowledgment at upload.
- **Render worker / autopost lab strings** — sampled but not exhaustively reviewed within the time budget. Recommend a follow-up pass for `src/pages/lab/autopost/*` and `worker/src/**` user-bubbling error messages.
- **Email templates** (`supabase/functions/_shared/emailTemplate.ts`) — not opened in this pass; flagged for next round.
- **Terms.tsx / Privacy.tsx / AcceptableUse.tsx** — not opened; refund window numbers in F-04 must be cross-checked there before they can be promoted to PASS.
- **Localized strings** beyond English — Unable to verify from static analysis (no translation files present in repo at the surveyed locations).

---

**Verdict input:** Recommend `FAIL` until F-01, F-03, F-07, and F-25 are resolved. Once those four ship, recommend `PASS WITH FIXES` pending the Major items above. The rest are Polish/Minor and can ship post-launch with tracking issues.
