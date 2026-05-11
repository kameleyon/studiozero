FROM: Compass (Audit)
TO: Jury (Audit)
RE: AUDIENCE-FIT FINDINGS — motionmax-360
STATUS: Review

# Compass — Audience Alignment Audit
**Project:** motionmax-360
**Date:** 2026-05-10
**Audience definition (from brief):** Tool-savvy creative adults — content creators, marketers, video producers. NOT developers. NOT seniors. Mobile-heavy usage. 11 languages claimed. US-first launch.
**Brand constraint:** aqua `#14C8CC` + gold `#E4C875` only. No red. No green. No orange (especially in autopost/lab UI).
**Audit scope (this report):** audience comprehension match, generational/cultural fit, device/context fit, trust/motivation match, and the gap between the audience the product *promises* and the product as built. Code-health, security, and infra are out of scope for Compass — they are owned by Trace, Halo, and Canon.

Severity rubric: **Blocker / Critical / Major / Minor / Polish** per `agents/audit/jury.md` §44–§51.

---

## Category 1 — UI/UX & design system (audience-relative)

### COMPASS-1.1 — "11 Languages" promise is marketing-only; UI has no translation layer  **[CRITICAL]**
**Issue:** Landing copy and trust strip promise "11 Languages" (`src/config/landingContent.ts:40-42`, `:75-78`) and "Create videos in English, French, Spanish, and 8 more languages", but the React app has no i18n runtime — `package.json` contains zero matches for `i18n|useTranslation|react-i18next|next-intl` (verified by Grep). `Grep` for `i18n|useTranslation|react-i18next|next-intl|locale|hreflang` across `src/` returns 7 files, all referencing `locale` as a date/time format helper or `hreflang` in `SeoHead`. There is no per-string translation. The shipped UI is monolingual English. `index.html:2` is `<html lang="en">`; `index.html:11` `<meta name="language" content="English" />`; `index.html:18-19` declare hreflang only for `x-default` and `en`; `SeoHead.tsx:64` declares `og:locale="en_US"` only. The "11 languages" message refers to *generated voiceover output*, but the marketing presents it as *product language support*, which a non-English creator audience will read as a UI promise.
**Audience harm:** Non-English-speaking creators (Spanish, French, Haitian Creole, Korean, Japanese, etc. — explicitly named in `landingContent.ts:42`) land on an English-only product. Trust break on first paint. Conversion failure for the audiences the brand explicitly courted.
**Location:** `src/config/landingContent.ts:40-42, 75-78`; `src/components/landing/SeoHead.tsx:64`; `index.html:2`.
**Fix (solution + location + how):** Either (a) add an i18n provider (e.g. `react-i18next` with at least 5 priority locales — en, es, fr, pt, de) and translate landing+pricing+auth+intake hero copy at minimum; or (b) re-scope the marketing copy to read "Generate voiceover in 11 languages" everywhere it currently reads "11 languages supported." Update `landingContent.ts:75-78` `TrustIndicators` detail to "Generate videos in English, French, Spanish, and 8 more languages" (verb shifted from "Create videos in" → "Generate videos in" makes it about output, not UI). Add the same disambiguation to feature card title at `:40` ("AI Voiceover in 11 Languages" rather than "11 Languages").
**Effort:** S (copy fix only) or L (real i18n).

### COMPASS-1.2 — Storytelling product remnants visible to users after rename  **[MAJOR]**
**Issue:** Brief states the Storytelling product is being removed. Voice catalog descriptions still ship the word "storytelling" to users at `src/components/workspace/SpeakerSelector.tsx:102, 111, 120, 135` (e.g., `"Female · Bright, expressive · storytelling"`). Landing SEO keywords retain `"video storytelling"` at `src/components/landing/SeoHead.tsx:41`. Public LLM hint file `public/llms.txt` and project type set in `src/components/dashboard/ProjectsGallery.tsx:39` (`new Set(['doc2video', 'storytelling', 'explainer'])`) keep the term alive.
**Audience harm:** Users see the deprecated category name in voice picker subtitles, in search descriptions, and in any AI surface that consumes `llms.txt`. Creates the perception that the product still has a Storytelling mode, which the team is actively removing — sets up support tickets and onboarding confusion.
**Location:** `src/components/workspace/SpeakerSelector.tsx:102, 111, 120, 135`; `src/components/landing/SeoHead.tsx:41`; `src/components/dashboard/ProjectsGallery.tsx:39`; `public/llms.txt`.
**Fix:** Replace voice description `storytelling` → `narration` (4 lines). Drop `video storytelling,` token from the keyword string in `SeoHead.tsx:41`. Keep `'storytelling'` in `EXPLAINER_TYPES` set as a *legacy migration* alias (correct), but rename the constant identifier comment so a future reader knows this is back-compat only.
**Effort:** XS.

### COMPASS-1.3 — Brand-color violations in user-facing surfaces  **[MAJOR]**
**Issue:** Brief says aqua + gold only; no red, no green, no orange. The shipped UI ships all three:
- Orange: `src/components/workspace/SubscriptionRenewalModal.tsx:120` `text-orange-500` clock icon; `src/components/ui/password-strength.tsx:15, 36` `bg-orange-500` / `text-orange-500` for "Fair" tier (visible on signup).
- Red (outside destructive-action norms): `src/pages/VoiceLab.tsx:663, 1002` `hover:text-red-400` on icon buttons; `src/components/workspace/CaptionStyleSelector.tsx:98` `bg-red-600` (caption preview) and `:97` red text-shadow.
- Green: `src/components/workspace/CaptionStyleSelector.tsx:100` `text-green-400` "typewriter" caption preview.
- Off-brand gold/orange `#F5B049` from template still in: `src/components/announcements/v2-announcement.css:162, 163, 269, 300` (used for `color` and `-webkit-text-fill-color`). Brand gold per `feedback_motionmax_brand_gold.md` is `#E4C875`.
- Amber-500 ramp used in pricing/CTA emphasis: `src/components/landing/LandingPricing.tsx:150, 167, 208`; `src/components/dashboard/LowCreditWarning.tsx:16-26`; `src/pages/Auth.tsx:461`. Amber visually reads as orange/gold-but-wrong against the brand gold `#E4C875`.
**Audience harm:** Tool-savvy creatives notice palette inconsistency immediately — it is the literal medium of their work. Erodes the "we're a serious creative tool" positioning. Caption style previews shipping red+green further breaks the brand promise on a screen the creator will look at every project.
**Location:** see above.
**Fix:** Replace `text-orange-500` → `text-[#E4C875]` in `SubscriptionRenewalModal.tsx:120`. Re-skin `password-strength.tsx` ramp to use opacity tiers of `#E4C875`/`#14C8CC` instead of red→green. Replace `hover:text-red-400` in `VoiceLab.tsx:663, 1002` with `hover:text-[#E4C875]` for a non-destructive context, or move the destructive icon into a confirm-prefixed flow if delete is the intent. Caption-style previews are visual demos — keep these as-is *only if* they represent third-party styles the user will see in finished captions; if they represent MotionMax brand styles, recolor to brand. Replace every `#F5B049` in `v2-announcement.css` with `#E4C875`. Replace `amber-500/amber-400` tokens in landing/pricing/auth with brand gold `[#E4C875]`.
**Effort:** S.

### COMPASS-1.4 — Mobile viewport: stale `100vh` units in primary surfaces  **[MAJOR]**
**Issue:** Brief mandates `100dvh` for iOS. Found `100vh` in user-facing screens: `src/styles/admin-shell.css:26, 67` (admin shell height), `src/pages/VoiceLab.tsx:1178` (`max-h-[calc(100vh-7rem)]` scroll container), `src/pages/Unsubscribe.tsx:57` (`minHeight: "100vh"`). Editor/Intake/AppShell already use `100dvh` correctly, so the pattern is known — these are misses.
**Audience harm:** On iOS Safari with the URL bar visible, `100vh` overflows by ~75-90px, hiding content under the chrome bar — a known Safari behavior. Affects VoiceLab scroll boundary (mobile-heavy audience), Unsubscribe (every email-driven mobile visit), and Admin (internal users only — lower harm).
**Location:** `src/pages/VoiceLab.tsx:1178`; `src/pages/Unsubscribe.tsx:57`; `src/styles/admin-shell.css:26, 67`.
**Fix:** Replace `100vh` → `100dvh` in the three user-facing locations. Admin can stay if Admin is desktop-only — but the file already targets mobile at line 67 inside a media query, so update both there too.
**Effort:** XS.

### COMPASS-1.5 — Trust copy assumes "team" buyer alongside solo creator (audience drift)  **[MINOR]**
**Issue:** `src/config/landingContent.ts:72` reads "From solo creators to teams — no video editing skills needed." Brief audience is "content creators, marketers, video producers" (individuals/small studios). The "to teams" qualifier opens the door to enterprise expectations (SSO, seat management, billing-by-seat) the product likely doesn't fulfill. Pricing page (`LandingPricing.tsx`) and onboarding are individual-account shaped.
**Audience harm:** Mismatched expectation — a marketing manager arriving from "for teams" copy will look for shared workspaces and not find them; conversion drops at the moment of "where's my team?". Better to commit to the solo/small-creator persona and earn the team upsell later.
**Location:** `src/config/landingContent.ts:72`.
**Fix:** Either (a) drop "to teams" — "Built for solo creators and small studios" — or (b) ship a real workspace seat model. Compass recommends (a) for US-first launch.
**Effort:** XS.

---

## Category 2 — Visitor → customer conversion (audience trust)

### COMPASS-2.1 — "Testimonials" are fabricated personas, not real customers  **[CRITICAL]**
**Issue:** `src/components/landing/Testimonials.tsx:3-19` defines three quotes attributed to *role categories* ("Content Creators", "Social Media Managers", "Learning & Development Teams") with no person, no photo, no company, no source. The component title rendered is "What you can do with MotionMax" (`:35`), which is *honest framing*, but the structure (quoted text + speaker attribution) reads as testimonials to the user. The TrustIndicators block `src/components/landing/TrustIndicators.tsx:26` headline "Trusted by creators worldwide" reinforces a social-proof claim with no underlying proof asset (no logos, no count, no review-platform stars).
**Audience harm:** Tool-savvy creators are sophisticated about social proof and will notice immediately. Either the quotes look like fake testimonials (trust break, FTC risk for endorsement claims) or the "Trusted by creators worldwide" headline looks unsupported (credibility loss). Both fail the audience's "earn the level of trust the audience expects to give it" test in Compass's rubric.
**Location:** `src/components/landing/Testimonials.tsx:3-19, 35`; `src/components/landing/TrustIndicators.tsx:26`.
**Fix:** Either (a) re-skin the Testimonials block as a "Use cases" grid — drop the quote glyphs (`✦`), drop the role-as-attribution pattern, lead with a verb ("Turn long blog posts into short social videos"); or (b) replace with two real testimonials sourced from existing pilot users by launch. For TrustIndicators, replace "Trusted by creators worldwide" with a verifiable claim (e.g. specific user count once audited, or a Product Hunt / G2 / Trustpilot embed).
**Effort:** S.

### COMPASS-2.2 — `og:locale` declares `en_US` only despite multi-language audience claim  **[MAJOR]**
**Issue:** `src/components/landing/SeoHead.tsx:64` ships `<meta property="og:locale" content="en_US" />` only. No `og:locale:alternate` for the other 10 languages mentioned in marketing copy. `index.html:18-19` declares hreflang `x-default` and `en` only. Combined with COMPASS-1.1, the actual launch is en-US only and the marketing doesn't match.
**Audience harm:** Search results in non-en locales won't surface MotionMax with appropriate language context; Open Graph cards on French/Spanish social shares render with `en_US` locale hint. Either narrows the funnel or sends mixed signals.
**Location:** `src/components/landing/SeoHead.tsx:64`; `index.html:18-19`.
**Fix:** Either ship real hreflang/og:locale alternates per supported UI language (requires COMPASS-1.1 fix path b — real i18n) or align the marketing copy honestly with en-US-only positioning at launch (fix path a).
**Effort:** XS once COMPASS-1.1 is decided.

### COMPASS-2.3 — Pricing emphasis color is amber instead of brand gold  **[MINOR]**
**Issue:** Pricing tier highlight at `src/components/landing/LandingPricing.tsx:167, 208` uses `border-amber-500/30 bg-amber-500/10 text-amber-400` for the most-prominent pricing chip. Amber-500 is `#f59e0b` — this reads as orange-gold against the brand gold `#E4C875`. Per Jo's documented preference (`feedback_motionmax_brand_gold.md`) brand gold is `#E4C875` and template orange `#F5B049` should be swapped on import. The same swap applies to amber Tailwind tokens.
**Audience harm:** Pricing is the highest-stakes screen for conversion; a palette mismatch right at the buy-button reduces the perceived consistency of the product.
**Location:** `src/components/landing/LandingPricing.tsx:150, 167, 208`.
**Fix:** Replace amber tokens with arbitrary-value brand gold: `border-[#E4C875]/30 bg-[#E4C875]/10 text-[#E4C875]`. Same swap in `src/pages/Auth.tsx:461` and `src/components/dashboard/LowCreditWarning.tsx:16-26`.
**Effort:** XS.

---

## Category 3 — Process & flow consistency (audience expectations)

### COMPASS-3.1 — Voice catalog cardinality contradicts "11 languages" promise  **[MAJOR]**
**Issue:** `src/components/workspace/SpeakerSelector.tsx:15-40` enumerates the actual voice union. The shipped voice set is heavily English (Smallest.ai v3.1 = 29 American-accent voices) plus a handful per other language: Haitian Creole (2 Gemini voices: Pierre, Marie), French (2: Jacques, Camille), Spanish (2: Carlos, Isabella + 11 Smallest Mexican-accent), English (2 named + 29 Smallest). German voices `sm2:adele`, `sm2:leon` and Italian `sm2:maria`, `sm2:enzo` are present in the union but explicitly annotated `// German (retired)` / `// Italian (retired)` at `SpeakerSelector.tsx:48-49`. Russian/Chinese/Japanese/Korean are explicitly called out at `SpeakerSelector.tsx:214` as a comment ("Russian / Chinese / Japanese / Korean") with no corresponding voice IDs — i.e. acknowledged as missing in code. So of the 11 languages claimed in `landingContent.ts:42`, only 4-5 (English, French, Spanish, Portuguese-via-shared, Haitian Creole) are actually shippable today; German and Italian are retired; Russian, Chinese, Japanese, Korean are unimplemented.
**Audience harm:** A Korean or Japanese creator who signs up after seeing "Korean, Japanese" in the supported-languages list will find no voices for their language. Direct expectation break that surfaces inside the product, after signup. Worst location for an expectation gap.
**Location:** `src/components/workspace/SpeakerSelector.tsx:15-40` vs `src/config/landingContent.ts:42`.
**Fix:** Reconcile. Either ship voices for the 6 missing languages (German, Italian, Russian, Chinese, Japanese, Korean) before claiming them, or update `landingContent.ts:42` to "English, French, Spanish, Portuguese, and Haitian Creole — more languages coming soon" matching what the voice catalog actually delivers.
**Effort:** S (copy) or L (voice integration).

### COMPASS-3.2 — Auth amber alert pattern misaligns with audience tier  **[MINOR]**
**Issue:** `src/pages/Auth.tsx:461` renders an amber-tinted hint pill (`text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200`). Tool-savvy creator audience reads amber as a *warning* — not an informational hint. The standard convention for tool-savvy adults is: amber = warning, gold/aqua = brand-info.
**Audience harm:** Friction at the auth gate; users pause to read what they assume is a problem when it is informational.
**Location:** `src/pages/Auth.tsx:461`.
**Fix:** Reskin to brand: `text-[#E4C875] bg-[#E4C875]/10 border border-[#E4C875]/30` (informational), or `text-[#14C8CC] bg-[#14C8CC]/10 border border-[#14C8CC]/30` (neutral hint).
**Effort:** XS.

---

## Category 11 — Analytics / marketing / growth (audience targeting)

### COMPASS-11.1 — Twitter creator handle `@MotionMax` not verified to exist  **[MINOR]**
**Issue:** `src/components/landing/SeoHead.tsx:82` declares `<meta name="twitter:creator" content="@MotionMax" />`. The brand handle availability cannot be verified from static analysis (Compass cannot reach the network from inside this audit). If the handle is unowned, Twitter Cards link clicks resolve to a 404 / unrelated profile, breaking the audience's path back to the brand.
**Audience harm:** Trust break on social shares — the most viral surface — at zero added cost to fix.
**Location:** `src/components/landing/SeoHead.tsx:82`.
**Fix:** Verify ownership of `@MotionMax` on X/Twitter; if unowned, either acquire the handle pre-launch or remove the `twitter:creator` meta until owned. Unable to verify from static analysis whether handle is owned.
**Effort:** XS.

### COMPASS-11.2 — `og:image` cache-bust pinned to old date `?v=20260129`  **[MINOR]**
**Issue:** `src/components/landing/SeoHead.tsx:13` pins the OG image cache key to `20260129` — over three months old as of audit (today is `2026-05-09`). Any post-Jan visual updates to the OG image will not be picked up by social platform crawlers that have already cached the URL.
**Audience harm:** Stale share previews on LinkedIn / X / FB / Slack — small but visible to a marketing-aware audience.
**Location:** `src/components/landing/SeoHead.tsx:13`.
**Fix:** Bump to `?v=20260509` (today's date) at launch, and add a comment instructing updates whenever `/public/og-image.png` changes.
**Effort:** XS.

---

## Production Blockers

| ID | Severity | Title |
|---|---|---|
| _(none from Compass)_ | _—_ | No Compass finding rises to Blocker (audience cannot complete the primary task at all). Critical findings below should still gate launch per the brief's "fix before launch" definition. |

## Top 10 Priority Fixes (Compass — audience-fit only)

| Rank | ID | Severity | Title | Effort |
|---|---|---|---|---|
| 1 | COMPASS-1.1 | Critical | "11 languages" UI promise has no i18n implementation | S or L |
| 2 | COMPASS-2.1 | Critical | Fabricated testimonials + unsupported "trusted by creators" claim | S |
| 3 | COMPASS-1.3 | Major | Brand-color violations (orange, red, green, amber, off-brand gold) | S |
| 4 | COMPASS-1.4 | Major | `100vh` in 3 mobile-facing surfaces — iOS Safari clipping | XS |
| 5 | COMPASS-1.2 | Major | Storytelling remnants in voice picker, SEO keywords, llms.txt | XS |
| 6 | COMPASS-3.1 | Major | Voice catalog missing 6 of 11 claimed languages | S or L |
| 7 | COMPASS-2.2 | Major | `og:locale` and hreflang declare en-US only despite multi-lang claim | XS |
| 8 | COMPASS-1.5 | Minor | "to teams" copy raises team-feature expectation product can't meet | XS |
| 9 | COMPASS-2.3 | Minor | Pricing CTA uses amber instead of brand gold `#E4C875` | XS |
| 10 | COMPASS-11.1 | Minor | `twitter:creator` handle ownership unverified | XS |

---

## Coverage notes

- **Verified from static analysis:** Landing+Auth+Pricing+VoiceLab+SpeakerSelector+Editor frame surfaces, brand color usage across `src/`, i18n surface area, viewport unit usage, SEO meta tags, storytelling remnants.
- **Unable to verify from static analysis:** Live screen captures at the 8 mandated breakpoints (320/375/390/414/428/768/1024/1280) — Compass had file-system but no headless-browser access in this audit window. Optic/Halo cover this. Twitter handle ownership. Real comprehension testing with target persona — recommended as a follow-up task to Lens.
- **Out of scope (other reviewers):** Code health (Trace), security/RLS (Halo), legal/AI-Act disclosures (Canon), pure visual contrast (Optic), copy reading-level (Proof). Compass deferred to those reviewers on overlapping items.

End of Compass findings.
