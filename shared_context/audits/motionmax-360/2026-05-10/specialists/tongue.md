# Tongue — Localization Quality + Per-Region Legal — motionmax-360

**Reviewer:** Tongue (Localization Quality, Platform layer)
**Audit date:** 2026-05-10
**Categories covered:** §12 SEO/i18n surface · §13 Legal & compliance per-region (locale-side)
**Audience:** tool-savvy creative adults, US-first launch, mobile-heavy, 11 languages claimed.

## Headline

**MotionMax markets itself as "Multi-Language" and ships an SEO/PRD claim of "11 languages," but the codebase has zero UI internationalization infrastructure.** No `react-i18next`, `lingui`, `react-intl`, `formatjs`, `next-intl`, or any other i18n library is installed (verified in `package.json` lines 26-69). 100% of UI strings are hard-coded English JSX. The "multi-language" capability appears to refer **only to TTS voice output**, not to the product UI, marketing site, legal pages, or transactional emails. This is a misleading-advertising risk in EU jurisdictions (UCPD Art. 6) and a US FTC §5 risk for material misrepresentation, and it makes the entire §12 hreflang/SEO programmatic-internationalization category functionally empty.

The cookie banner is also not GDPR/ePrivacy compliant in its current form, and per-region legal strings are present but only in English.

---

## Findings (grouped by category, sorted by severity)

### Category 12 — Locale, i18n, SEO surface

#### TONGUE-01 [BLOCKER] — Multi-language marketing claim is unsupported by code; no i18n runtime

- **Issue:** Marketing copy and SEO metadata explicitly claim "Multi-Language" / "11 languages," but the React app and Astro marketing site contain zero i18n infrastructure. No translation files (`src/locales/*`, `i18n/*.json`, `messages/*` — none exist). All UI text is hard-coded English literals in JSX.
- **Evidence:**
  - `package.json:26-69` — no i18n library in dependencies (no `react-i18next`, `i18next`, `react-intl`, `lingui`, `next-intl`, `formatjs`, `polyglot`).
  - `index.html:84` — JSON-LD schema lists `"Multi-Language Support (11 languages)"` as a feature.
  - `index.html:8` — meta description says `"Multi-language. Start free."`
  - `marketing/src/pages/index.astro:102` — same claim on marketing site.
  - `marketing/src/pages/index.astro:370` — feature card: `"Create videos in English, French, Spanish, and 8 more languages"`.
  - `src/config/landingContent.ts:77` — feature-list entry: `"Create videos in English, French, Spanish, and 8 more languages"`.
  - `src/lib/voiceCatalog.ts:222-228` — only TTS *voice* languages exist (`US/UK/AU/FR/ES/LATAM/DE`) — confirms "multi-language" is a voice-output capability, not a UI capability.
- **Fix:** Either (a) implement actual UI i18n with `react-i18next` + locale JSON catalogs and ship at least the launch languages, OR (b) tighten the marketing copy to be precise: change to `"Generate AI voiceover in 11 languages"` everywhere the broader "Multi-Language" claim appears.
- **Locations to edit (option b):** `index.html:8,84`; `marketing/src/pages/index.astro:102,370`; `src/components/landing/SeoHead.tsx:37`; `src/config/landingContent.ts:77`.
- **Effort:** XS (option b copy fix) | L (option a actual i18n).

#### TONGUE-02 [CRITICAL] — hreflang declares only English despite 11-language claim

- **Issue:** The `<link rel="alternate" hreflang>` set declares only `x-default` and `en`, contradicting the 11-language marketing claim and providing zero international SEO indexability.
- **Evidence:**
  - `index.html:18-19` — `<link rel="alternate" hreflang="x-default" ... />` and `<link rel="alternate" hreflang="en" ... />` only.
  - `marketing/src/layouts/BaseLayout.astro:39` — `<html lang="en" ...>` hard-coded.
  - `index.html:2` — `<html lang="en">` hard-coded.
  - `index.html:11` — `<meta name="language" content="English" />` hard-coded.
  - `marketing/src/pages/{index,privacy,terms,acceptable-use}.astro` — no per-locale variants exist.
- **Fix:** If real i18n ships, generate per-locale alternates from the locale list and emit one `<link rel="alternate" hreflang="<bcp47>" href="<localized-url>" />` per language plus `x-default`. Until then, scrub the "11 languages" UI claim to match reality (see TONGUE-01).
- **Locations:** `index.html:18-19`; `marketing/src/layouts/BaseLayout.astro:39` (per-route hreflang block needed).
- **Effort:** S (when scoping to scrub) | M (when implementing real alternates).

#### TONGUE-03 [MAJOR] — `<html lang>` hard-coded; no per-locale switching

- **Issue:** Both the React app shell and the Astro marketing layout hard-code `lang="en"`. Even if/when locale switching is added, screen readers and Google's locale signals will continue to report English, breaking pronunciation in any other language and undermining hreflang.
- **Evidence:** `index.html:2` (`<html lang="en">`); `marketing/src/layouts/BaseLayout.astro:39` (`<html lang="en" ...>`).
- **Fix:** When i18n lands, drive `lang` from the active locale (`<html lang={currentLocale}>`). For Astro, set the lang per route in BaseLayout via a `locale` prop.
- **Effort:** XS.

#### TONGUE-04 [MAJOR] — No RTL support; physical (left/right) Tailwind classes throughout

- **Issue:** No bidi/RTL plumbing. `dir="rtl"` is never set; `tailwindcss` is configured without an RTL plugin; layout uses physical `left-`/`right-`/`pl-`/`pr-`/`ml-`/`mr-` classes everywhere. If Arabic, Hebrew, Farsi, or Urdu are among the "11 languages," the entire UI mirrors incorrectly.
- **Evidence:**
  - No matches for `dir="rtl"` or `direction:` in `src/`.
  - `src/components/CookieConsent.tsx:73` — `bottom-4 left-4 right-4 sm:left-auto sm:right-4` (physical sides).
  - `tailwind.config.ts` — no RTL plugin, no `logical-properties` extension.
  - Pervasive `pl-/pr-/ml-/mr-/left-/right-` usage across `src/components/**/*.tsx`.
- **Fix:** If any RTL locale is in scope, add `tailwindcss-rtl` (or migrate to logical classes via Tailwind v4's `ps-/pe-/ms-/me-`). Set `<html dir>` from active locale. Audit at minimum: CookieConsent, RightRail, IntakeRail, Editor toolbars, Auth.
- **Effort:** L (codebase-wide refactor).

#### TONGUE-05 [MAJOR] — Hard-coded `en-US` date and currency formatting in user-facing UI

- **Issue:** Many user-visible date/number/currency formatters pin `"en-US"` (or hard-code `"$"`), preventing locale-correct rendering even if i18n is added later. EU/EEA users see USD instead of EUR/GBP, US-format dates instead of DMY.
- **Evidence (file:line):**
  - `src/components/landing/LandingPricing.tsx:153` — `PRICE_INCREASE_DATE.toLocaleDateString("en-US", { month: "long", day: "numeric" })`.
  - `src/components/billing/_shared/format.ts:2,4,7,12` — `Math.round(n).toLocaleString("en-US")`, `"$" + n.toLocaleString("en-US", ...)`, ISO date with `"en-US"`.
  - `src/components/admin/_shared/format.ts:29,58,72,84` — admin-side `"en-US"` lock.
  - `src/components/admin/shell/AdminHero.tsx:32,38` — ``` `$${dollars.toLocaleString("en-US")}` ```.
  - `src/components/admin/_shared/ActivityFeed.tsx:22` — `"en-US"` date.
  - `src/components/admin/tabs/TabPerformance.tsx:249` — `"en-US"` weekday.
  - `src/components/settings/IntegrationsTab.tsx:121` — `new Intl.RelativeTimeFormat("en", ...)` hard-locale.
  - `src/components/pricing/RoiCalculator.tsx:114,134` — hard `"$"` prefix.
  - `src/components/billing/_shared/PackSelect.tsx:50,66` — credits/packs strings English-only.
- **Fix:** Centralize on a `formatCurrency(amount, currency, locale)`/`formatDate(d, locale)` helper that accepts the active locale and the user's currency (set from billing). Replace all `"en-US"` literals with the active locale. Surface currency from Stripe price metadata, not hard-coded `$`.
- **Effort:** M.

#### TONGUE-06 [MAJOR] — Worker injects `en-US` date strings into AI prompts regardless of target language

- **Issue:** The worker pipeline embeds English-formatted dates into prompts that may be generating non-English content. This bleeds English context into the model's output language and breaks the linguistic frame of non-English videos.
- **Evidence:**
  - `worker/src/services/researchTopic.ts:23-24` — `now.toLocaleDateString("en-US", ...)` and `now.toLocaleTimeString("en-US", ...)` injected into prompts.
  - `worker/src/handlers/handleGenerateTopics.ts:118` — `new Date().toLocaleDateString("en-US", ...)` injected into prompt context.
  - `api/autopost/schedules/[id]/fire.ts:46` — `today.toLocaleDateString('en-US', { weekday: 'long' })` used for scheduling logic that touches user-facing scheduled posts.
- **Fix:** Pass the target output locale (already known per generation job) into these prompt builders and format the date using that locale.
- **Effort:** S.

#### TONGUE-07 [MAJOR] — `date-fns` installed but no per-locale loaders configured

- **Issue:** `date-fns@^3.6.0` is in dependencies, but no locale imports (`import { de, fr } from "date-fns/locale"`) appear in the source. All `format()` calls use the default English locale. If localized dates are needed later, this is a refactor, not a flip.
- **Evidence:** `package.json:54` declares `date-fns`. No `date-fns/locale` import found in `src/` or `worker/`.
- **Fix:** When i18n lands, lazy-load the locale bundles (`import("date-fns/locale/de")`) and pass `{ locale }` to every `format()` call.
- **Effort:** S.

#### TONGUE-08 [MINOR] — Voice catalog flag-color mapping uses red/green which violate the brand color policy

- **Issue:** Adjacent to localization concerns: `src/lib/voiceCatalog.ts:222-228` builds country flag gradients with `#EF4444` (red, UK), `#10B981` (green, AU), and `#F97316` (orange, LATAM). The MotionMax brand restricts UI to aqua + gold, and explicitly bans red/green/orange in autopost/lab UI. These flag-tile colors render in voice-pickers used inside Voice Lab.
- **Evidence:** `src/lib/voiceCatalog.ts:223` (UK red), `:224` (AU green), `:226` (LATAM orange).
- **Fix:** Replace flag-gradient palette with monochrome (gold/aqua) variants or muted slate tones; convey nationality via the country code label, not colored gradients.
- **Effort:** XS. *(Note: primary owner is Optic; flagged here because it surfaces during locale-flag rendering.)*

---

### Category 13 — Per-region legal (locale-side)

#### TONGUE-09 [BLOCKER] — Cookie consent UI is not GDPR / ePrivacy compliant

- **Issue:** The cookie banner offers only "Accept" and "Reject" buttons with no granular per-category consent and no preferences manager. Under GDPR + ePrivacy + EDPB Guidelines 03/2022, users must be able to consent per category (analytics, marketing, etc.) at the same level of prominence as accept-all. The single-binary is treated by EU DPAs (CNIL, Garante) as non-compliant.
- **Evidence:**
  - `src/components/CookieConsent.tsx:78-89` — only `<Button>Accept</Button>` and `<Button>Reject</Button>`; no category toggles.
  - `src/components/CookieConsent.tsx:42-46` — banner only renders if `VITE_GA_MEASUREMENT_ID` OR `VITE_SENTRY_DSN` is set. Sentry session replay is described in Privacy Policy as an analytics-class feature requiring consent (`src/pages/Privacy.tsx:94`), and Sentry is loaded unconditionally before consent.
  - `src/components/CookieConsent.tsx:6,19-22` — stored consent is just the literal `"accepted"|"rejected"` string with no policy version, no timestamp; users are not re-prompted when the privacy policy version bumps.
  - No "Cookie preferences" link in app footer (`src/components/landing/LandingFooter.tsx`) lets a user revisit/withdraw the choice after dismissing.
- **Fix:**
  1. Replace binary banner with a 3-button layout: `Accept all` / `Reject all` / `Manage preferences`. Manage opens a modal with per-category switches (Necessary [always-on], Analytics [GA4 + Sentry replay]).
  2. Persist `{ state, policyVersion, timestamp }` so a policy bump triggers re-prompt.
  3. Add a persistent "Cookie preferences" link in the footer (Privacy + Terms already there) that re-opens the manage modal.
  4. Audit Sentry init to confirm session replay is gated behind consent and that `Sentry.init` itself respects DNT for EU IPs.
- **Locations:** `src/components/CookieConsent.tsx:6, 19-22, 42-46, 78-89`; `src/components/landing/LandingFooter.tsx`.
- **Effort:** M.

#### TONGUE-10 [CRITICAL] — Marketing site (Astro) has no cookie banner

- **Issue:** `CookieConsent` lives in `src/components/CookieConsent.tsx` and is mounted only in the React app. The Astro marketing site (`marketing/src/pages/{index,privacy,terms,acceptable-use}.astro`) is a separate build with no consent UI. If GA or any analytics fires on `motionmax.io/` (the marketing landing) before the user clicks into the React app, EU visitors are tracked without consent — a clear ePrivacy/GDPR violation.
- **Evidence:**
  - `marketing/src/layouts/BaseLayout.astro` — no cookie-banner include.
  - `CookieConsent` component never imported in any `.astro` file (`grep -r "CookieConsent" marketing/` returns no matches).
- **Fix:** Port the consent UI into the Astro side as a vanilla-JS component included in `BaseLayout.astro`, sharing the same `motionmax_cookie_consent` localStorage key so the choice carries across to the React app on signup.
- **Effort:** S.

#### TONGUE-11 [CRITICAL] — Privacy Policy / Terms / Acceptable Use available only in English despite EU/EEA legal-basis claims

- **Issue:** The Privacy Policy makes specific commitments to EEA / Germany / Ireland / UK users (lodge-complaint instructions to local DPAs) but is presented only in English. GDPR Art. 12(1) requires information be provided in "a concise, transparent, intelligible and easily accessible form, using clear and plain language" — and in practice EU DPAs expect this to be in a language the data subject can be expected to understand. Marketing the product as supporting 11 languages while withholding the policy is a transparency-mismatch finding.
- **Evidence:**
  - `src/pages/Privacy.tsx:134` — explicit references to Ireland's DPC, Germany's Datenschutzbehörde, UK's ICO.
  - `src/pages/Privacy.tsx` whole file — only English content.
  - `src/pages/Terms.tsx:117-120` — EU-specific cooling-off clause in English only.
  - `marketing/src/pages/privacy.astro` — single English variant, no per-locale `[locale]/privacy.astro` route.
- **Fix:** When/if the launch locale set includes any EU language (DE, FR, ES, IT, NL, PL), translate Privacy + Terms + AUP into those languages with a native-speaker review pass; serve via locale-prefixed routes. Until then, scope the EU/EEA references to make clear English is the canonical version (e.g., "An English-language version is provided as the canonical text — translations on request").
- **Effort:** L (translation + review).

#### TONGUE-12 [CRITICAL] — EU AI Act Art. 50 transparency obligations partially implemented in editor only

- **Issue:** EU AI Act Art. 50 (transparency obligations for AI-generated synthetic content; transparency obligations apply from Aug 2026 — within or near the launch window) requires both (a) machine-readable marking of synthetic content and (b) end-user disclosure. The codebase contains the disclosure string in only two places (editor stage and player), with no machine-readable watermark/metadata embedded into exported MP4s and no disclosure on public share pages.
- **Evidence:**
  - `src/components/workspace/VideoPlayer.tsx:347-350` — disclosure overlay (with explicit "EU AI Act Art. 52" comment — note: text references Art. 52 but the renumbered final-text article is Art. 50; minor copy issue).
  - `src/components/editor/Stage.tsx:812-813` — disclosure overlay during editing.
  - No matches in `src/pages/PublicShare.tsx` for AI-generated disclosure strings.
  - No C2PA / `<meta>` provenance tag emission found in worker MP4 muxing path (`grep -rn "c2pa\|provenance" worker/` returns no matches — `Unable to verify from static analysis` whether some FFmpeg metadata flag is set).
- **Fix:**
  1. Add the AI-generated disclosure to `PublicShare.tsx` (visible on every shared link) and to download metadata.
  2. Embed C2PA content credentials or, at minimum, an XMP `xmpDM:isAI=true` tag in the exported MP4 (worker FFmpeg pipeline).
  3. Update the comment in `VideoPlayer.tsx:347` from "Art. 52" to "Art. 50" to match the final adopted numbering.
- **Effort:** M.

#### TONGUE-13 [MAJOR] — Transactional emails are English-only with no locale parameter

- **Issue:** The shared email layout has no locale parameter; every transactional email (verification, password reset, billing receipt, churn campaign) is sent in English regardless of the user's preferred language. Regulators in DE/FR have repeatedly flagged English-only billing receipts as a consumer-protection issue.
- **Evidence:**
  - `supabase/functions/_shared/emailTemplate.ts:21-` — `EmailLayoutInput` interface has no `locale` field. Subject/body strings are English literals throughout.
  - No `locale`/`lang` parameter threaded into Supabase Edge Function callers (`grep -rn "locale\|lang" supabase/functions/_shared/emailTemplate.ts` returns no matches in the layout function).
- **Fix:** Add `locale: string` to `EmailLayoutInput`; build a small per-locale catalog (`emailStrings.<locale>.ts`) for greeting, headline, CTA, footer; have callers pass the user's `auth.users.raw_user_meta_data.locale`. Native-speaker review per locale before ship.
- **Effort:** L (translation + plumbing).

#### TONGUE-14 [MAJOR] — Pricing displayed in USD only; EU prices not VAT-inclusive

- **Issue:** Pricing UI hard-codes `$` and US dollars. EU consumer law (Price Indication Directive, transposed nationally — e.g., DE Preisangabenverordnung) requires that prices shown to EU consumers be inclusive of VAT and stated in the local currency. Showing "$X.XX" without a clearly labeled currency or VAT disclosure is non-compliant for EU consumers.
- **Evidence:**
  - `src/components/billing/_shared/format.ts:4-7` — `"$" + n.toLocaleString("en-US", ...)`.
  - `src/components/billing/_shared/format.ts:7` — `if (n >= 1000) return "$" + Math.round(n).toLocaleString("en-US")`.
  - `src/components/pricing/RoiCalculator.tsx:114,134` — hard `$` prefix.
  - `src/components/admin/shell/AdminHero.tsx:32` — ``` `$${dollars.toLocaleString("en-US")}` ```.
  - No detection of user country / Stripe locale-aware pricing in the public-facing pricing path.
- **Fix:** Drive currency from Stripe price metadata (Stripe supports multi-currency products); render using `Intl.NumberFormat(locale, { style: "currency", currency })`. For EU customers, ensure the price shown is VAT-inclusive (Stripe Tax or manual gross-price tier).
- **Effort:** M.

#### TONGUE-15 [MAJOR] — No "Sale of personal information" link / no equivalent mechanism, but that's adequate; however no GPC (Global Privacy Control) signal handling

- **Issue:** Privacy.tsx §12 correctly states MotionMax does not "sell or share" personal info, so a "Do Not Sell" link is not strictly required. However, California CCPA (as amended by CPRA) and Colorado CPA require honoring the Global Privacy Control header. No GPC handling found.
- **Evidence:** `grep -rn "Sec-GPC\|globalPrivacyControl\|GPC" src/ supabase/` returns no matches.
- **Fix:** Read `navigator.globalPrivacyControl` at app boot; if `true`, treat consent as `rejected` and avoid loading GA / Sentry replay. Document this in Privacy §12.
- **Effort:** S.

#### TONGUE-16 [MAJOR] — ToS §13 (EU cooling-off) requires explicit waiver checkbox at checkout, not implicit

- **Issue:** ToS §13 (`src/pages/Terms.tsx:117-120`) relies on "by accessing or using the Service... you expressly request immediate performance" to waive the 14-day right of withdrawal. EU Consumer Rights Directive Art. 16(m) requires an *express prior consent* AND *acknowledgement that the right is lost* — typically a checkbox at the point of purchase, not an implicit clause buried in ToS.
- **Evidence:** `src/pages/Terms.tsx:117-120` — clause exists in legal text only. No matching checkbox in `src/pages/Pricing.tsx` or the Stripe checkout configuration in `supabase/functions/` (Stripe Checkout payload not configurable to require this checkbox without a custom field).
- **Fix:** Add a Stripe Checkout `custom_fields` entry (or pre-checkout intermediate page) requiring EU customers to tick "I expressly request that the service begin during the 14-day withdrawal period and acknowledge I will lose my right of withdrawal once the service has been fully performed." Persist this acceptance with a timestamp and policy version.
- **Effort:** M.

#### TONGUE-17 [MINOR] — Privacy Policy describes 90-day deletion; verify this matches actual Supabase deletion job

- **Issue:** Privacy.tsx:110 states "we will delete your personal data within 90 days" of account closure. This is a binding commitment. If the actual deletion job is not implemented or runs on a longer cadence, this is a misrepresentation. *Unable to verify from static analysis* whether such a job exists and runs on schedule.
- **Evidence:** `src/pages/Privacy.tsx:110-117` — specific retention windows committed (90 days, 30 days, 1 year, 7 days). `Unable to verify from static analysis` whether matching cron jobs exist in `supabase/functions/` or worker schedule.
- **Fix:** Verify with Forge/data team that scheduled deletion jobs exist and match the policy text exactly. Add automated test asserting commitment timeframes.
- **Effort:** S (verification only).

#### TONGUE-18 [MINOR] — Cookie banner wording does not name the categories it covers

- **Issue:** Banner copy says only "We use cookies to analyze site usage and improve your experience" — does not specify analytics, error monitoring, or third-party providers. ePrivacy/EDPB guidance recommends naming purposes and at least the principal third parties (GA, Sentry).
- **Evidence:** `src/components/CookieConsent.tsx:79-82`.
- **Fix:** Reword: "We use Google Analytics and Sentry session replay to understand how MotionMax is used. Necessary cookies are always set." Combine with the granular toggles from TONGUE-09.
- **Effort:** XS.

#### TONGUE-19 [MINOR] — `<meta name="language" content="English" />` is non-standard and conflicts with `lang` attribute

- **Issue:** `index.html:11` uses `<meta name="language" content="English" />`. This tag is non-standard, ignored by Google, and will conflict with future locale-aware setups.
- **Evidence:** `index.html:11`.
- **Fix:** Remove. The `<html lang>` attribute is the only canonical signal.
- **Effort:** XS.

#### TONGUE-20 [POLISH] — `format-detection: telephone=no` is set, but no locale-aware contact format anywhere

- **Issue:** Marketing/landing pages don't show phone numbers, so `telephone=no` is fine. But once support phone numbers or office addresses are added, they should be locale-formatted (E.164 phone, country-appropriate address ordering).
- **Evidence:** `index.html:60` — `<meta name="format-detection" content="telephone=no" />`.
- **Fix:** Future: when adding contact info, format using locale-aware helpers.
- **Effort:** XS (forward-looking note).

---

## Production Blockers (locale + per-region legal)

| # | Finding | Severity | File:Line | Owner |
|---|---|---|---|---|
| 1 | "11 languages" / "Multi-Language" claim is unsupported by code (no UI i18n) | BLOCKER | `package.json:26-69`, `index.html:84`, `src/config/landingContent.ts:77` | Locale + Herald |
| 2 | Cookie consent UI not GDPR / ePrivacy compliant (binary, no granular categories, no version) | BLOCKER | `src/components/CookieConsent.tsx:6,19-22,42-46,78-89` | Comply + Vega |
| 3 | Marketing site has no cookie banner — EU visitors tracked without consent | CRITICAL | `marketing/src/layouts/BaseLayout.astro` (missing) | Comply + Vega |
| 4 | hreflang declares only `en` | CRITICAL | `index.html:18-19`, `marketing/src/layouts/BaseLayout.astro:39` | Locale + Signal |
| 5 | Privacy/ToS/AUP only in English while marketing 11 languages | CRITICAL | `src/pages/{Privacy,Terms,AcceptableUse}.tsx`, `marketing/src/pages/*.astro` | Locale + Comply |
| 6 | EU AI Act Art. 50 disclosure missing on share pages and exported MP4s | CRITICAL | `src/pages/PublicShare.tsx`, worker FFmpeg path | Comply + Forge |

## Top 10 Priority Fixes (locale slice)

| # | Severity | Fix | Effort |
|---|---|---|---|
| 1 | BLOCKER | Scrub "11 languages" / "Multi-Language" copy to "AI voiceover in 11 languages" until UI i18n ships (TONGUE-01) | XS |
| 2 | BLOCKER | Replace binary cookie banner with Accept-all / Reject-all / Manage-preferences + per-category toggles + version stamp (TONGUE-09) | M |
| 3 | CRITICAL | Add cookie banner to Astro marketing site sharing the same consent key (TONGUE-10) | S |
| 4 | CRITICAL | Add EU AI Act Art. 50 disclosure to PublicShare and embed `xmpDM:isAI=true` (or C2PA) in exported MP4 (TONGUE-12) | M |
| 5 | CRITICAL | Add EU cooling-off-waiver checkbox at Stripe Checkout (TONGUE-16) | M |
| 6 | MAJOR | Centralize date/currency formatters; replace hard `"en-US"` and `"$"` (TONGUE-05) | M |
| 7 | MAJOR | Add `locale` parameter to `emailTemplate.ts` and per-locale string catalogs (TONGUE-13) | L |
| 8 | MAJOR | Implement GPC (Sec-GPC) signal honoring in CookieConsent (TONGUE-15) | S |
| 9 | MAJOR | Drive `<html lang>` from active locale once i18n exists; remove non-standard `<meta name="language">` (TONGUE-03, TONGUE-19) | XS |
| 10 | MAJOR | Localize worker prompt-context dates to target output language (TONGUE-06) | S |

---

## Notes & limitations

- I verified i18n absence via package.json inspection and grep-based source search; if a custom in-house i18n util exists outside common naming, it was not detectable. *Unable to verify from static analysis* whether a parallel translation pipeline lives in an unreviewed directory.
- I did not run a pseudo-localization pass on the live UI; UI-fit findings (German +30%, CJK contraction, RTL mirroring) are inferred from source structure (physical Tailwind classes, fixed `max-w-*`, single-locale layout). A pseudo-loc test pass against the running app should be run before launch.
- Per-region legal accuracy of the policy *text* (GDPR/CCPA wording, EU AI Act numbering) was reviewed at the structural level — not as a final legal sign-off. Comply + outside counsel must finalize.
- Severity is audience-relative: tool-savvy creative adults, US-first launch. The marketing claim and the cookie/consent gaps are sharpest because they create immediate legal exposure even at a US-first launch (CCPA in CA, plus any EU traffic that lands).
