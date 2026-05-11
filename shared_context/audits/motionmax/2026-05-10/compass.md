# Compass — Audience Alignment Audit — MotionMax — 2026-05-10

**Reviewer:** Compass (Audience Alignment Auditor)
**Project:** motionmax
**Audit date:** 2026-05-10
**Source dir audited:** `C:\Users\Administrator\motionmax`
**Stated audience (per brief):** Content creators, marketers, video producers — tool-savvy creative adults but **not developers**.

---

## Audience definition check

The brief defines a clear primary persona: **creator/marketer/video-producer**, tool-savvy, non-developer, adult. There is no formal persona document in the repo (no `personas/` dir, nothing in `docs/`), so this audit scores against the brief verbatim.

What the brief does **not** define and what I therefore had to infer from the code:
- **Geography:** the codebase hardcodes USD pricing and `en-US` date formats — implied audience is US-first.
- **Generation:** copy register is millennial/Gen-Z creator-economy ("Stop paying $500/video. Make them yourself."), not boomer / pro-broadcast.
- **Device class:** marketing claims of "make videos on the go" but several primary CTAs ship below the WCAG 44px tap target.
- **Tier:** primarily indie/SMB ("solo creators to teams"). Not enterprise — no SSO, no procurement language, no SLA.

If Axiom can confirm or refine geography (US-only vs. international launch) and tier ceiling (indie vs. agency), several findings below shift severity.

---

## Verdict (audience-fit only — Jury synthesizes the unified verdict)

**Recommendation: PASS WITH FIXES.** The product reads cleanly as a creator-targeted SaaS in tone, structure, and feature framing. But three patterns actively misalign with the stated audience and need to be fixed before launch:

1. Trust claims that aren't backed by evidence (placeholder "2,400+", a hardcoded "47 people upgraded this week" badge, and a "Testimonials" component with no human testimonials).
2. Developer jargon leaking into the public Help FAQ (`429`, `Retry-After`, `RLS`, `webhooks`).
3. US-only assumptions in pricing and date formatting that exclude the international creator market the marketing copy claims.

Tap target sizing on pricing CTAs is the only mobile-creator finding that touches both audience-fit and accessibility — it crosses Compass / Halo lanes. Halo will likely also flag it; agreeing with that score is fine.

Persona-fit scorecard (1-5, 5 = excellent fit for the stated primary persona):

| Dimension                  | Score | Notes                                                                                       |
|----------------------------|:-----:|---------------------------------------------------------------------------------------------|
| Comprehension              |  3    | Clear in core flows; Help FAQ leaks dev jargon                                              |
| Motivation match           |  4    | "Cinematic from one idea" maps directly to creator pain                                     |
| Friction (lower = better)  |  3    | Pricing math, credit nomenclature, small CTAs add unnecessary friction                       |
| Trust                      |  2    | Fake-feeling scarcity + placeholder counts undermine the trust creators need to convert      |
| Completion                 |  4    | Onboarding empty states teach the next step well                                            |

---

## Findings (severity per `agents/audit/jury.md` rubric)

### CRITICAL

#### C-1 — Trust break: "2,400+" social-proof number is an unverified placeholder, used in three audience-facing surfaces
**Evidence:**
- `src/components/landing/LandingPricing.tsx:16-17` —
  ```ts
  // TODO: replace with a real figure fetched from your analytics/DB once available
  const SOCIAL_PROOF_COUNT = "2,400+";
  ```
- Reused at `LandingPricing.tsx:76` (`Join 2,400+ creators`) and `LandingPricing.tsx:101` (`Trusted by 2,400+ creators`).
- Hero re-states it again: `src/pages/Landing.tsx:289` — `Used by 2,400+ marketers` and `Landing.tsx:301` — `Join 2,400+ creators already making videos`.

**Why this fails the audience:** Creators and marketers are an audience that *recognizes* fake social proof — they make this content for a living. A round, unsourced number repeated in four places, with a TODO comment in source admitting it's not real, is a credibility hit at the exact decision point (pricing card CTA). If discovered post-launch (e.g., a journalist or a Reddit thread inspecting the bundle), it becomes a brand-damage event.

**Fix recommendation:** Either (a) wire the number to a real Supabase count (`profiles` row count is fine), with a "+" only when the figure rounds, or (b) remove numeric claims and use qualitative proof ("Built with creators, for creators"). Do not ship the placeholder.

---

#### C-2 — Trust break: "47 people upgraded this week" scarcity badge is hardcoded and unsourced
**Evidence:**
- `src/components/landing/LandingPricing.tsx:167-170` —
  ```tsx
  <span className="...text-amber-400">
    <Flame className="..." />
    Creator plan: 47 people upgraded this week
  </span>
  ```
- The number is a literal string. No fetch, no derivation, no comment indicating it should ever change.

**Why this fails the audience:** The same population that buys MotionMax also runs growth experiments and recognizes the pattern (Booking.com, Shopify dropshippers). A creator audience reads a static "47 people" as Hotjar-tier dark pattern and downgrades trust accordingly. This is a Critical because it directly precedes the purchase CTA — it converts negatively for the savvier members of the audience.

**Fix recommendation:** Either remove the badge or back it with a real rolling 7-day upgrade count. If real, label the timeframe ("this week" is ambiguous; "in the last 7 days" is verifiable). If retained as marketing language, change to non-numeric framing ("Creator is the most-picked plan").

---

#### C-3 — Trust break: "Testimonials" component contains zero testimonials
**Evidence:**
- `src/components/landing/Testimonials.tsx:3-19` — three card objects have `quote`, `role`, `icon` — but **no `name`, no `company`, no `avatar`, no link**.
- The section heading at `Testimonials.tsx:34` is `"What you can do with MotionMax"` — i.e., the *header* admits this is use-cases, but the *file/component* is named Testimonials and is positioned in the page flow where testimonials would appear.
- Imported and rendered as `<Testimonials />` from `src/pages/Landing.tsx:489`, immediately after `BeforeAfterComparison` and immediately before `LandingPricing` — the canonical "social proof before pricing" slot.

**Why this fails the audience:** Creators expect named-and-faced peers in this slot — they buy from people they recognize, not from anonymized roles. A "What you can do" use-case grid is a fine section but should NOT occupy the testimonials position with the testimonials filename, because users scan headers + position together. The audience will register "no testimonials" as "no real users" — which compounds C-1 and C-2.

**Fix recommendation:** Either (a) populate with real named users + photos + permission (3 is enough), or (b) rename the component (and the section) to "Use cases" / "What creators build with MotionMax" and move it earlier in the page so the social-proof slot is honestly empty rather than misleadingly filled. Pair with a "Testimonials coming soon — be one of our first" honest-empty-state if needed.

---

#### C-4 — Developer jargon in audience-facing Help FAQ excludes the stated non-developer persona
**Evidence:**
- `src/pages/Help.tsx:147` — visible FAQ answer: *"Today MotionMax runs server-side only via **Supabase Auth + RLS** — programmatic access keys, **webhooks** and **rate-limit dashboards** will land alongside the public REST endpoints."*
- `src/pages/Help.tsx:156` — visible FAQ answer: *"Studio plans will have 100 requests/minute and 10,000/day; we'll return `**429**` with a `**Retry-After**` header when you exceed it."*
- Category tab at `Help.tsx:169` — `{ id: "api", label: "API" }` exposed in the public help nav.

**Why this fails the audience:** A content creator does not know what RLS, a 429, or a Retry-After header is. A marketer reading the FAQ to evaluate the product before signup will infer "this is for engineers, not me" and bounce. The brief explicitly says **not developers**. Putting these terms behind an "API" tab on the user-facing Help page violates the audience definition.

**Fix recommendation:** Either (a) move the API category to a separate `/developers` or `/docs` route reachable from a single footer link, OR (b) rewrite the answers in plain English ("If you make too many requests in a short window, MotionMax will pause briefly. Wait a minute and try again.") and drop the HTTP status codes. Do not show creators the words `RLS`, `webhook`, `429`, or `Retry-After` on the marketing/help surface.

---

### MAJOR

#### M-1 — USD-only pricing + `en-US` date formatting silently exclude international creators that the marketing claims to serve
**Evidence:**
- `src/config/products.ts:42-53` — every plan price is a hardcoded dollar string: `"$0"`, `"$29"`, `"$19"`, `"$99"`, `"$66"`, `"$9.99"`, `"$24.99"`, `"$59.99"`. No currency code, no locale switch, no `Intl.NumberFormat`.
- `src/components/landing/LandingPricing.tsx:153` —
  ```ts
  PRICE_INCREASE_DATE.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  ```
  hardcodes `en-US`. A French / German / British creator sees `"May 19"`, not `"19 May"` or `"19 mai"`.
- `src/pages/Projects.tsx:104` — date format `"MMM d, h:mm a"` uses 12-hour AM/PM, which reads as US-only to most of the world.
- The brand also advertises **11 languages** (`landingContent.ts:40-44`) including Haitian Creole, French, German, Russian, Chinese, Japanese, Korean — yet the pricing surface is US-only.

**Why this fails the audience:** The marketing copy ("11 languages") sets up an international expectation; the pricing UI immediately breaks it. A French creator reading `$29/month` has to do a currency conversion in their head before evaluating the offer, and the date "May 19" reads as foreign. This is friction at the exact moment of intent — a Major-severity audience-fit hit, not a polish issue.

**Fix recommendation:** Minimum: (a) append explicit currency code to display (`"$29 USD"`) so non-US users know what they're reading, and (b) use the user's locale for `toLocaleDateString` (omit the locale arg). Better: detect locale and offer EUR/GBP/CAD pricing tiers, even if Stripe charges in USD for now.

---

#### M-2 — "1 credit = 1 second (5x for cinematic)" is the only place the cost model is explained, and it's buried inside one plan's feature list
**Evidence:**
- `src/components/landing/LandingPricing.tsx:61` — *"1 credit = 1 second (5x for cinematic)"* appears only in the Creator plan card features.
- `src/config/products.ts:49-52` — credit packs are sold in raw integer counts with no explanatory caption: `300 credits / $9.99`, `900 credits / $24.99`, `2500 credits / $59.99`.
- `src/components/workspace/CreditEstimate.tsx:41` — inline cost shown as `"${cost} credit${cost !== 1 ? "s" : ""}"` with no human translation ("≈ 30 seconds of video").
- `src/config/landingContent.ts:118-121` (FAQ) — explanation says credits depend on "complexity and length" but never gives the 1-credit = 1-second math.

**Why this fails the audience:** The audience must answer "is $29 a good deal for me?" before subscribing. The math `500 credits/month + 1 credit = 1 second + 5× for cinematic` means roughly 100 seconds (~1.6 min) of cinematic per month — which is a *very different* offer than a creator imagining "500 short videos." Without surfacing this calculation, creators will either over-buy and churn or under-buy and bounce. Both outcomes hurt the audience.

**Fix recommendation:** (a) Add an interactive estimator on the pricing page ("How much video do I get?" → slider), OR (b) display human-readable conversions next to every credit number ("500 credits ≈ 8 min standard / 1.6 min cinematic per month"). Repeat the rule prominently above the credit-pack table, not buried in one plan's checklist.

---

#### M-3 — Yearly pricing display invites misreading: per-month equivalent is shown as if it were the annual total
**Evidence:**
- `src/config/products.ts:43-46` —
  ```ts
  creator: { monthly: "$29", yearly: "$19" },
  studio:  { monthly: "$99", yearly: "$66" },
  ```
  The `yearly` field stores the **per-month equivalent when billed annually**, not the annual total.
- `src/components/landing/LandingPricing.tsx:222-227` — UI renders the yearly price followed by `"/month"` plus a parenthetical `(billed annually)`.
- `src/components/landing/LandingPricing.tsx:152-153` — Countdown messaging: *"Yearly pricing locked for {n} more days — price increases May 19"* — does not state what the price is increasing to.

**Why this fails the audience:** A non-developer reading `$19 /month (billed annually)` first sees `$19`, then `/month`, then the parenthetical. The parenthetical is the load-bearing word, but it's the smallest text. A creator who clicks "Subscribe" expecting `$19` is then charged `$228` upfront — refund risk, chargeback risk, public-complaint risk. This is a friction-and-comprehension miss for the literal audience persona ("tool-savvy but not developers").

**Fix recommendation:** Show the annual total prominently ("$228/year, equivalent to $19/month"). Make `(billed annually)` at least the same size as the price. Add an explicit "You'll be charged $228 today" line above the CTA. Also state the new price next to the urgency countdown ("→ $35/month after May 19") so the urgency claim is verifiable.

---

#### M-4 — Primary pricing CTAs ship below the 44px tap-target standard creators rely on for mobile use
**Evidence:**
- `src/components/landing/LandingPricing.tsx:230-236` — landing pricing buttons use the default shadcn `Button` size (`h-10` = 40px).
- `src/pages/Pricing.tsx:244` — credit-pack buttons: `className="w-full mt-4 h-9 rounded-full..."` — **h-9 = 36px**.
- `src/pages/Pricing.tsx:327` — plan CTA buttons: `className="w-full mt-6 h-10 rounded-full..."` and the button uses `text-[12.5px]` — **40px tall, 12.5px text**.

**Why this fails the audience:** "Creator on the go" is part of the marketing positioning (mobile-first social media managers, content creators recording on phones). A 36px tap target on iOS Safari means thumb misses; the WCAG 2.5.5 minimum is 44×44 CSS pixels. Combined with 12.5px button text in low-contrast variants, this excludes the exact mobile-creator slice the audience claim names. Compass flags this as audience-fit; Halo will likely also flag it as accessibility — the two findings are the same defect.

**Fix recommendation:** Bump primary purchase buttons to `h-11` (44px) minimum or `h-12` (48px) preferred, and use `text-sm` (14px) minimum for button labels. Verify on real iPhone SE (smallest active screen) before re-audit.

---

### MINOR

#### m-1 — Generic "Failed to …" toasts give the audience no recovery path
**Evidence:**
- `src/pages/Projects.tsx:381` — `"Failed to delete"`
- `src/pages/Projects.tsx:426` — `"Failed to rename"`
- `src/pages/Projects.tsx:464,476` — `"Failed to update"`
- `src/pages/Editor.tsx:317` — `"Generation partially failed"` (no instruction on what to retry)
- `src/pages/Pricing.tsx:113,191` — `"Couldn't start checkout"` (no suggested next step)

**Why this misses the audience:** Creators are problem-solvers but not debuggers. "Failed to rename" tells them *what* failed, not *what to do*. A creator-tuned message looks like *"Couldn't rename — try a shorter name or check your connection. If it keeps happening, refresh."*

**Fix recommendation:** Pass-through copy update on each. No code change; just the message strings. Coordinate with Herald on tone.

---

#### m-2 — Auth lockout copy uses developer phrasing
**Evidence:**
- `src/pages/Auth.tsx:462` — *"Too many failed attempts? You may be temporarily rate-limited. Wait a few minutes before trying again."*

**Why this misses the audience:** "Rate-limited" is a developer term. Creators read "locked out." The current phrasing also raises a question instead of answering one.

**Fix recommendation:** *"Too many sign-in attempts. We've paused sign-in for a few minutes for your protection. Try again shortly."*

---

#### m-3 — Landing copy claim "Used by 2,400+ marketers" but feature targeting and product modes target creators broadly
**Evidence:**
- `src/pages/Landing.tsx:289` — *"Used by 2,400+ marketers"*
- `src/pages/Landing.tsx:301` — *"Join 2,400+ creators already making videos"* (different word for the same number)
- Brief audience: "content creators, marketers, video producers"

**Why this misses the audience:** Calling the same population "marketers" in one sentence and "creators" in another is fine in isolation, but adjacent on the same screen it reads as inconsistent or as a hasty A/B leak. Pick one canonical noun for hero proof and stick with it; marketers is the narrower (less inclusive) of the two.

**Fix recommendation:** Standardize on `creators` for the hero proof slot since the rest of the marketing site (LandingPricing, FAQ, pricing-card socialProof) uses `creators`. The word `marketers` only appears in the hero; replacing it removes the inconsistency in one edit.

---

#### m-4 — Hero promises "make your first video in under 90 seconds" inside the demo modal, but the demo modal itself shows "Demo video coming soon"
**Evidence:**
- `src/pages/Landing.tsx:524-530` — modal body:
  ```tsx
  <p className="font-serif text-[18px] text-white mb-1">Demo video coming soon</p>
  <p className="font-mono text-[11px] tracking-wider uppercase text-white/50">
    Sign up free — make your first video in under 90 seconds
  </p>
  ```
- The `Watch Demo` CTA at `Landing.tsx:268-284` is rendered as a primary surface element. Clicking it opens an empty placeholder.

**Why this misses the audience:** A creator clicks "Watch Demo" because they want to *see* the product. Showing "demo video coming soon" wastes the click and trains the audience that buttons may not deliver. This is a Minor only because the rest of the page is functional, but if launch is imminent it should escalate to Critical (broken core proof element).

**Fix recommendation:** Either (a) ship a real 90-second screen recording before launch, or (b) hide the "Watch Demo" CTA until the asset exists. Don't ship a placeholder modal that claims "demo coming soon" on a launched product.

---

### POLISH

#### p-1 — Decorative avatar gradients are intentionally non-representational, which is fine — but do not pretend to be photos
**Evidence:** `src/pages/Landing.tsx:294-298` — five circular gradient swatches under the hero, immediately preceding the copy *"Join 2,400+ creators already making videos."*

**Why this is polish only:** Decorative pseudo-avatars next to a social-proof number can read as "stand-ins for real users" — usually a polish nit, but compounds with C-1 (placeholder count) and C-3 (no real testimonials) to reinforce a "no actual users yet" perception. If C-1 and C-3 are fixed, this becomes unimportant.

**Fix recommendation:** When C-3 lands real testimonials with avatars, reuse those photos here. Until then, leave as-is.

---

## Notes for Jury

- **Lane overlaps.** M-4 (tap targets) overlaps with Halo (accessibility) — same evidence, same severity. Not a duplicate, just convergent. Don't double-count in the punch list.
- **Lane overlaps.** C-1, C-2, C-3 overlap with Herald (tone/copy) and Penny (pricing trust) — Compass owns the *audience-fit* angle (does the persona believe this?); Herald and Penny own the *copy quality* and *pricing legitimacy* angles respectively. Same artifact, different rubrics.
- **Out of scope for Compass.** Color contrast, semantic HTML, screen-reader behavior, motion-reduction respect — those are Halo's. I noted only WCAG-overlapping items where the audience-fit and a11y findings are the same defect (M-4).
- **No persona doc was found in the repo.** Brief was used as the source of truth. If Flow produces a persona doc later, re-audit M-1 and M-2 against it — they may shift severity if international or pro-user tier is in/out of scope.

AUDIT WRITTEN: C:\Users\Administrator\studio-zero\shared_context\audits\motionmax\2026-05-10\compass.md
