# Signal — SEO Audit (technical + on-page)

**Project:** motionmax-360
**Date:** 2026-05-10
**Reviewer:** Signal (SEO & Discoverability)
**Audience:** tool-savvy creative adults, mobile-heavy, US-first, 11 output languages claimed
**Scope (§12):** sitemap, robots, canonicals, structured data (Software/Video/Org/FAQ), hreflang for the 11 advertised languages, indexability gating, programmatic SEO opportunities

All findings file:line-evidenced. Severity follows Studio rubric (Blocker / Critical / Major / Minor / Polish).

---

## Critical

### S-C1 — Sitewide canonical collapses /pricing, /share, all SPA routes into the homepage
- **Issue:** `dist/app-shell.html:17` ships a hard-coded `<link rel="canonical" href="https://motionmax.io" />`. Every route rewritten to `/app-shell.html` in `vercel.json:20-43` (auth, pricing, share, dashboard-new, projects, settings, usage, billing, help, voice-lab, admin, lab, lab/autopost) inherits that canonical because the React layer either ships no canonical override (`src/pages/Pricing.tsx:121` uses `<Helmet><title>Pricing · MotionMax</title></Helmet>` only; `src/pages/PublicShare.tsx` has no `<Helmet>` at all) or competes with the static one client-side.
- **Impact:** Google takes the static `<link rel="canonical">` over a Helmet-injected one when they conflict (rendering pass occurs after first-pass HTML parse and the static element is authoritative). `/pricing` and `/share/:token` will be canonicalized into `/`, removing them from the index entirely. Sitemap declares `/pricing` at priority 0.9 — wasted.
- **Fix:** in the Vite source `index.html` (becomes `app-shell.html` post-merge per `scripts/merge-dist.mjs:42`), remove the hard-coded `<link rel="canonical">` line. Replace with a route-aware Helmet canonical via `PageSeo` on every SPA page (`Pricing.tsx`, `PublicShare.tsx`, `Help.tsx`, `Billing.tsx`, `Usage.tsx`, `Settings.tsx`).
- **Effort:** S

### S-C2 — `app-shell.html` ships `index, follow` for every private route
- **Issue:** `dist/app-shell.html:10` declares `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`. This file backs every authenticated route per `vercel.json:20-43` (admin, lab, lab/autopost, dashboard-new, projects, settings, billing, voice-lab, help). React `Helmet` correctly injects `noindex,nofollow` per-page (`src/pages/Admin.tsx:295`, `src/pages/lab/_LabLayout.tsx:64`, `src/pages/Editor.tsx:427`, `src/pages/Auth.tsx:283`, `src/pages/CreateNew.tsx:33`, `src/pages/Settings.tsx:244`, `src/pages/Projects.tsx:731`, `src/pages/Help.tsx:340`, `src/pages/Usage.tsx:243`, `src/pages/VoiceLab.tsx:193`, `src/components/settings/IntegrationsTab.tsx:568`, `src/pages/lab/autopost/AutopostHome.tsx:365`, `src/pages/lab/autopost/RunHistory.tsx:280`), but Helmet only runs after JS hydration. Crawlers that fetch raw HTML (and Googlebot's first-pass before render) see `index, follow`.
- **Impact:** /admin, /lab, /lab/autopost, /dashboard-new, /billing, /usage, /projects, /settings will leak into the index, especially for non-Googlebot crawlers (Bing, Yandex, AppleBot do not always render JS) and during render-budget exhaustion. Authenticated content and screenshots could appear in the SERP.
- **Fix:** flip the static default in the Vite `index.html` to `<meta name="robots" content="noindex, nofollow">`. The public landing page is served from Astro's `marketing/src/layouts/BaseLayout.astro:48` (which already correctly emits `index, follow` for public routes), so the SPA shell never needs to be indexable.
- **Effort:** XS

### S-C3 — `robots.txt` is out-of-sync with current React Router routes
- **Issue:** `public/robots.txt:5-11` blocks `/dashboard`, but `src/App.tsx:215` defines the new dashboard at `/dashboard-new`. `App.tsx:198-208` exposes `/lab` and `/lab/autopost` (admin sandbox), neither of which is in robots.txt. `/billing` (`App.tsx:169`), `/unsubscribe` (`App.tsx:109`), and `/dashboard-new/*` are also missing. The `Disallow: /dashboard` line therefore matches nothing real.
- **Impact:** crawlers will index `/dashboard-new`, `/lab`, `/lab/autopost`, `/billing` (which all redirect to `app-shell.html` and currently say `index, follow` — see S-C2). Combined with S-C2 this guarantees admin/internal pages appear in search.
- **Fix:** in `public/robots.txt` and `marketing/dist/robots.txt`, replace the per-UA disallow blocks with: `Disallow: /dashboard`, `Disallow: /dashboard-new`, `Disallow: /lab`, `Disallow: /billing`, `Disallow: /unsubscribe`, `Disallow: /workspace`, plus retained existing entries. Apply identical block to Googlebot, Bingbot, the wildcard UA, GPTBot, ChatGPT-User, anthropic-ai, Claude-Web.
- **Effort:** XS

### S-C4 — Pricing page has no description, no canonical, no OG override despite priority 0.9 in sitemap
- **Issue:** `src/pages/Pricing.tsx:121` is the only SEO surface — `<Helmet><title>Pricing · MotionMax</title></Helmet>`. There is no `<meta name="description">`, no `<link rel="canonical" href="https://motionmax.io/pricing">`, no OG/Twitter overrides. `public/sitemap.xml:21` lists `/pricing` at priority 0.9. Combined with S-C1, the URL is sitemapped but canonicalized away to `/`.
- **Impact:** highest-intent transactional URL in the funnel ("motionmax pricing", "ai video generator pricing") is unindexable. CTR from any social share that lands on `/pricing` uses the homepage hero copy, not pricing-specific value props.
- **Fix:** in `src/pages/Pricing.tsx`, replace lines 120-121 with:
  ```tsx
  <PageSeo
    title="Pricing — MotionMax | Free, Creator, Studio plans"
    description="MotionMax pricing: Free 150 credits, Creator $X/mo with 500 credits and voice cloning, Studio $Y/mo with 4K and unlimited brand kits. No credit card required for free tier."
    canonical="https://motionmax.io/pricing"
    breadcrumbs={[{ name: "Home", item: "https://motionmax.io" }, { name: "Pricing", item: "https://motionmax.io/pricing" }]}
  />
  ```
  Better: also serve a static `/pricing/index.html` from Astro (add `marketing/src/pages/pricing.astro`) so first-paint HTML carries the copy without waiting for hydration; then remove the `/pricing` rewrite from `vercel.json:35-36`.
- **Effort:** S

### S-C5 — hreflang declares English only while marketing claims "11 languages"
- **Issue:** `index.html:18-19` declares only `<link rel="alternate" hreflang="x-default">` and `<link rel="alternate" hreflang="en">`. `marketing/src/layouts/BaseLayout.astro:38-84` declares zero hreflang. Yet `index.html:84` (`SoftwareApplication` JSON-LD `featureList`) and `public/llms.txt:38` advertise "Multi-Language Support (11 languages): English, French, Spanish, Portuguese, German, Italian, Russian, Chinese, Japanese, Korean, Haitian Creole".
- **Impact:** the discrepancy is technically defensible (the 11 languages refer to *generated voiceover output*, not localized marketing UI), but Google's hreflang validator and international rich-result eligibility treat this as an unfulfilled internationalization claim. French/Spanish/Portuguese searches for "AI video generator" will not surface MotionMax even when the ad copy says it supports those languages, because there are no localized URL paths and no `lang`-targeted content. The brand also forfeits "ai video generator français/español/etc." long-tail queries.
- **Fix:** two paths — pick one:
  1. **Defensible posture**: drop `hreflang="x-default"` and `hreflang="en"` (they add nothing for English-only sites). In landing/marketing copy disambiguate: "11 voiceover languages" (output, not UI). Add `<meta name="content-language" content="en">`.
  2. **Programmatic SEO posture (recommended)**: ship `/fr/`, `/es/`, `/pt/`, `/de/`, `/it/`, `/ru/`, `/zh/`, `/ja/`, `/ko/`, `/ht/` Astro pages with translated landing copy. Wire reciprocal hreflang. This is also the lever that unlocks ~10× the long-tail keyword pool flagged in `SEO_DISTRIBUTION_PLAN.md:1.2`.
- **Effort:** S (option 1) / L (option 2)

---

## Major

### S-M1 — `SoftwareApplication` JSON-LD lacks `aggregateRating`, `applicationSubCategory`, `priceRange`
- **Issue:** `index.html:60-99` and `marketing/src/pages/index.astro:68-87` define `SoftwareApplication` schema with `applicationCategory: "MultimediaApplication"` and an `offers` block, but no `aggregateRating`/`review` (the only fields that produce ⭐ rich snippets), no `applicationSubCategory: "VideoEditingApplication"`, and no `priceRange`.
- **Impact:** the SERP listing will not show ratings even after the brand earns them; competitors with the same on-page schema + ratings outrank by CTR, not by content.
- **Fix:** once 5+ verified reviews exist (Stripe Customer Portal, G2, Trustpilot, ProductHunt), append to both JSON-LD blocks:
  ```json
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.X", "reviewCount": "N" },
  "applicationSubCategory": "VideoEditingApplication",
  "priceRange": "$0 — $XX"
  ```
- **Effort:** S

### S-M2 — Zero `VideoObject` structured data on a video product
- **Issue:** `supabase/functions/share-meta/index.ts:220-250` emits OG `og:video:url`/`og:video:secure_url`/`og:video:width`/`og:video:height` for shared videos but no JSON-LD `VideoObject`. `index.html` (landing) and `marketing/src/pages/index.astro` have no `VideoObject` at all (despite a "Watch Demo" CTA at `marketing/src/pages/index.astro:191-198`).
- **Impact:** Google Video Search and the YouTube-style video carousel in regular SERPs require `VideoObject` with `thumbnailUrl`, `contentUrl`, `uploadDate`, `duration`. Without it, MotionMax videos (the literal product output, the strongest possible SEO surface for a video-gen tool) are invisible to the video search vertical. This is the highest-leverage missing schema for this product.
- **Fix:**
  1. In `supabase/functions/share-meta/index.ts` after the og:video block (line 241), emit:
     ```html
     <script type="application/ld+json">{"@context":"https://schema.org","@type":"VideoObject","name":"<title>","description":"<description>","thumbnailUrl":"<imageUrl>","contentUrl":"<videoUrl>","uploadDate":"<ISO8601 of created_at>","duration":"PT<seconds>S","publisher":{"@type":"Organization","name":"MotionMax","logo":{"@type":"ImageObject","url":"https://motionmax.io/og-image.png"}}}</script>
     ```
  2. On the marketing landing, add a `VideoObject` for the demo video (`#demo-btn` at `marketing/src/pages/index.astro:191`). Host the demo on a stable URL.
- **Effort:** M

### S-M3 — "Visual Stories" / Storytelling product remnants in indexable copy and JSON-LD
- **Issue:** Storytelling is being removed (per audit brief). Remnants found:
  - `index.html:8` description "...visual stories from any text..."
  - `index.html:35` `og:description` "...visual stories..."
  - `index.html:46` `twitter:description` "...visual stories..."
  - `index.html:65` `SoftwareApplication.description` "...visual stories, and infographics..."
  - `index.html:78` `featureList` includes `"Visual Story Generation"`
  - `index.html:108` `Organization.description` "...visual stories from text..."
  - `marketing/src/pages/index.astro:72` JSON-LD description "...visual stories..."
  - `marketing/src/pages/index.astro:102` `BaseLayout` description "...visual stories..."
  - `public/llms.txt:3,29,46,70` (4 references)
  - `marketing/dist/index.html` and `dist/app-shell.html` carry the same baked-in text (rebuild required after source edits)
- **Impact:** when storytelling is removed, every search snippet still advertises a removed feature. CTR mismatch (user clicks expecting Visual Stories, lands on a UI without it) is a known Google "user intent" signal that depresses ranking. Schema lying about featureList can also disqualify rich-result eligibility.
- **Fix:** strip every "visual stories"/"Visual Story Generation"/"storytelling" mention from the listed files. Replace with "explainer videos" or remove. Same edit in `public/llms.txt` and the marketing source. Rebuild.
- **Effort:** S

### S-M4 — www-vs-apex inconsistency between canonical and hreflang URLs
- **Issue:** `index.html:17` declares `<link rel="canonical" href="https://motionmax.io" />` (apex). `index.html:18-19` declares `hreflang="x-default"` and `hreflang="en"` against `https://www.motionmax.io/` (subdomain). `public/sitemap.xml:5-39` uses apex (no www). `public/llms.txt:7-9` uses apex.
- **Impact:** mixed canonical/hreflang signals. Google may pick either as the indexable form; if it picks www, every non-www inbound link's PageRank is split (until 301s consolidate), and the sitemap's apex URLs are treated as non-canonical alternates.
- **Fix:** in `index.html:18-19`, change both alternate URLs to `https://motionmax.io/`. Verify Vercel domain config 301-redirects `www.motionmax.io` → `motionmax.io` (or vice versa — pick one and stick).
- **Effort:** XS

### S-M5 — `Crawl-delay: 10` throttles a 4-month-old domain that needs more crawl, not less
- **Issue:** `public/robots.txt:42` (and identical line in `marketing/dist/robots.txt`) declares `Crawl-delay: 10` under the wildcard UA bucket. `SEO_DISTRIBUTION_PLAN.md:1.2` self-flags zero backlink authority and 4-month domain age as the #1 ranking blocker.
- **Impact:** Google ignores `Crawl-delay`, but Bing and Yandex respect it as 10 seconds between fetches. For a domain with very few backlinks, the rare crawler visits matter — throttling them wastes the limited crawl budget. Bing/Yandex coverage is part of the "available 5%" for a young SaaS.
- **Fix:** delete the `Crawl-delay: 10` line from `public/robots.txt:42` and `marketing/dist/robots.txt`.
- **Effort:** XS

### S-M6 — CCBot fully blocked while GPTBot/anthropic-ai/Claude-Web are allowed on landing
- **Issue:** `public/robots.txt:57-58` declares `User-agent: CCBot` + `Disallow: /` (full block). `public/robots.txt:45-70` allows GPTBot/ChatGPT-User/anthropic-ai/Claude-Web on the public landing (only blocks `/app/`, `/auth`, `/dashboard`, `/projects`).
- **Impact:** CCBot powers Common Crawl, which is the training data for many models including Gemini's earlier rounds, You.com, Perplexity's web index, and most open-weight LLMs. Blocking CCBot but allowing GPTBot is incoherent — MotionMax is excluded from the largest open web index used in LLM grounding while remaining visible to OpenAI/Anthropic. For a "discoverable in LLM answers" goal (per `SEO_DISTRIBUTION_PLAN.md`), this is a self-inflicted blind spot.
- **Fix:** unify the AI-bot policy. Replace `CCBot Disallow: /` with the same `Disallow: /app/ Disallow: /auth Disallow: /dashboard Disallow: /projects` block used for GPTBot. Add `Disallow: /lab Disallow: /admin Disallow: /billing Disallow: /usage Disallow: /settings` to all AI-bot blocks for consistency.
- **Effort:** XS

### S-M7 — Sitemap `lastmod` frozen at 2026-04-19 across all 5 URLs
- **Issue:** `public/sitemap.xml:6,21,27,33,39` (and identical `marketing/dist/sitemap.xml`) declares the same `<lastmod>2026-04-19</lastmod>` for the homepage, `/pricing`, `/terms`, `/privacy`, `/acceptable-use`. Today is 2026-05-09; the `/pricing` route source `src/pages/Pricing.tsx` and `marketing/src/pages/index.astro` have been edited since 2026-04-19.
- **Impact:** Google uses `lastmod` to prioritize re-crawls. A sitewide stuck date trains Google to skip re-fetches; pages indexed on first hit then never re-checked, despite copy changes (e.g., the storytelling-removal edits in S-M3 won't propagate until URLs are independently re-crawled).
- **Fix:** replace static `public/sitemap.xml` with a build-step generator. Add `scripts/generate-sitemap.mjs` that walks `marketing/src/pages/*.astro` + the public SPA routes (`/pricing`), reads each source file's git mtime via `git log -1 --format=%cI <path>`, and writes ISO `<lastmod>` per URL. Hook into `npm run build:merge` after the merge step in `scripts/merge-dist.mjs:53`.
- **Effort:** S

### S-M8 — Visible hero heading is `<p>`; the only `<h1>` is `sr-only` with weak copy
- **Issue:** `src/pages/Landing.tsx:227` declares `<h1 className="sr-only">MotionMax — AI Video Generation</h1>`. The visually dominant hero copy "Cinematic visuals. Natural voiceover. Seamless transitions. From one idea." is a `<p>` at `src/pages/Landing.tsx:247-249`. Marketing parallel: `marketing/src/pages/index.astro:178-181` does have a visible `<h1>` ("Cinematic visuals. Natural voiceover. Seamless transitions. From one idea.") — fine on the marketing side, broken on the SPA landing.
- **Impact:** Google weights visible H1 text more heavily than visually-hidden H1s (the sr-only heading still counts but at lower confidence — Google's rep John Mueller confirmed in 2020). The current sr-only string ("AI Video Generation") under-uses the keyword pool. Also creates inconsistent on-page heading structure between the SPA landing (rendered when JS executes) and the merged Astro index.html (rendered first).
- **Fix:** in `src/pages/Landing.tsx`, delete the sr-only h1 at line 227 and promote the descriptor on line 247-249 to `<h1>`. Or, since the merged `dist/index.html` is the Astro version (per `scripts/merge-dist.mjs:50`) and the SPA Landing only renders if Astro routing fails, keep the SPA Landing's H1 in sync with Astro's: `<h1 className="...">Cinematic visuals. Natural voiceover. Seamless transitions. <span>From one idea.</span></h1>`.
- **Effort:** XS

### S-M9 — Help/FAQ content trapped behind auth — programmatic SEO opportunity wasted
- **Issue:** `src/App.tsx:179-187` gates `/help` behind `<ProtectedRoute>`. `src/pages/Help.tsx:340` correctly noindexes the in-app help (because users post tickets there). However the same FAQ corpus that ships in-app also exists at `src/config/landingContent.ts` (`LANDING_FAQ`) but only renders on the landing's FAQ section. There is no public, indexable, deep `/help/*` knowledge base mapping each FAQ to its own URL. `marketing/src/pages/` only has `index.astro`, `terms.astro`, `privacy.astro`, `acceptable-use.astro`.
- **Impact:** "People Also Ask" rich snippets are the dominant non-brand traffic source for video-tool SaaS. Each FAQ entry as its own URL with `Article` + `FAQPage` schema unlocks 5–50 long-tail queries each ("how do I clone my voice in motionmax", "what video formats does motionmax export", etc.). At domain age 4 months, every indexable URL is gold.
- **Fix:** add `marketing/src/pages/help/index.astro` (knowledge-base index) + `marketing/src/pages/help/[slug].astro` (per-article deep page). Source articles from `LANDING_FAQ` (or split a richer corpus from current Help). Each deep page emits `Article` + per-question `FAQPage` JSON-LD. Add to sitemap. Keep `/help` (in-app) for ticketing only.
- **Effort:** L (real content lift, but high SEO leverage)

### S-M10 — Organization JSON-LD has no `contactPoint`
- **Issue:** `index.html:101-113` declares `Organization` schema with `name`, `url`, `logo`, `description`, `sameAs: [twitter]` only. No `contactPoint`, no support email, no `customerService` contactType.
- **Impact:** the brand panel in Google's right-rail (when triggered) shows contact channels. Missing `contactPoint` = no support email surfaces in branded search ("motionmax support"). `public/llms.txt:9-11` declares `support@motionmax.io` and `privacy@motionmax.io` but these are not in JSON-LD.
- **Fix:** in `index.html:101-113` and `marketing/src/pages/index.astro:68-87` Organization JSON-LD, add:
  ```json
  "contactPoint": [
    { "@type": "ContactPoint", "contactType": "customer support", "email": "support@motionmax.io", "availableLanguage": ["en"] },
    { "@type": "ContactPoint", "contactType": "privacy", "email": "privacy@motionmax.io", "availableLanguage": ["en"] }
  ]
  ```
- **Effort:** XS

---

## Minor

### S-Mi1 — Twitter handle inconsistency between SeoHead and rest of app
- **Issue:** `src/components/landing/SeoHead.tsx:82` sets `<meta name="twitter:creator" content="@MotionMax" />` (CamelCase). Every other reference uses `@motionmaxio` (lowercase): `index.html:49,50`, `marketing/src/layouts/BaseLayout.astro:65`, `supabase/functions/share-meta/index.ts:247`.
- **Impact:** Twitter Card validator warns on creator-handle mismatch; some social platforms tag-link the wrong handle.
- **Fix:** in `src/components/landing/SeoHead.tsx:82`, change to `content="@motionmaxio"`.
- **Effort:** XS

### S-Mi2 — `mask-icon` color and `theme-color` use legacy palette
- **Issue:** `index.html:26` declares `<link rel="mask-icon" href="/favicon.png" color="#2D9A8C">`. `index.html:30` declares `theme-color="#0F1112"`. Brand spec (per audit brief): aqua `#14C8CC`, gold `#E4C875` only. `#2D9A8C` is a stale teal.
- **Impact:** Apple Pinned-Tab and the iOS PWA status bar render with an off-brand color, weakening brand recognition in the SERP-adjacent surfaces (bookmarks, app switcher).
- **Fix:** `index.html:26` change `color="#2D9A8C"` to `color="#14C8CC"`. (Optic owns the broader brand-color audit; flagging here because the icon shows up in SEO-adjacent UI.)
- **Effort:** XS

### S-Mi3 — Sitemap missing public `/share/:token` entries (no published-video index)
- **Issue:** `public/sitemap.xml` lists 5 URLs; zero `/share/*` entries. `src/App.tsx:106` exposes `/share/:token` as the public share route. The bot-targeted SSR via `supabase/functions/share-meta` works for direct hits but Google won't *discover* any share unless backlinked.
- **Impact:** the literal product output (generated videos) is unindexable until each share earns its own backlink. For a young domain this is the biggest missed SEO surface — every shared video could have been an indexed `VideoObject` deep page.
- **Fix:** add a build-step or daily edge function generating `/sitemap-shares.xml` from the `share_link` table where `is_public=true` (or whatever the column name is). Reference from `public/sitemap.xml` via `<sitemap>` index entries. Each entry includes `<video:video>` markup with thumbnail + content URL.
- **Effort:** M

### S-Mi4 — `dist/app-shell.html` default title/description matches the homepage, not "App"
- **Issue:** `dist/app-shell.html:6` ships `<title>MotionMax — AI Video Generator | Turn Text into Cinematic Videos</title>` — the marketing-landing title. Combined with S-C1/S-C2, any leak makes the SPA shell look like a duplicate homepage.
- **Impact:** before Helmet hydrates, an indexer fetching `/auth` or `/dashboard-new` sees the homepage title + canonical + OG identical to `/`, reinforcing the duplicate-content collapse.
- **Fix:** in the Vite source `index.html`, set the static title/description to a neutral "MotionMax · App" + a no-op description, and rely on Helmet to override per route.
- **Effort:** XS

### S-Mi5 — `meta name="keywords"` ships a 21-keyword stuff list
- **Issue:** `index.html:15` and `src/components/landing/SeoHead.tsx:39-42` ship the same long keywords meta string.
- **Impact:** Google ignores `meta keywords` since 2009. Bing claimed in 2014 it could be a *spam signal* when stuffed. SEMrush/Ahrefs scrape it for competitor analysis — exposing your top-N target keywords to competitors is operationally a leak. Not a ranking factor.
- **Fix:** trim to ~5 brand+intent keywords or remove. In `src/components/landing/SeoHead.tsx:39-42`, delete the `<meta name="keywords">` entirely.
- **Effort:** XS

### S-Mi6 — `screenshot` field in JSON-LD points to the bare-logo OG image, not a UI capture
- **Issue:** `index.html:92` declares `"screenshot": "https://motionmax.io/og-image.png?v=20260129"` — but `og-image.png` is a logo per `SEO_DISTRIBUTION_PLAN.md:1.2` self-flag.
- **Impact:** Google rich-result tester accepts it but the SoftwareApplication "App" panel image shown in the SERP is a logo, not a product screen — depressing CTR.
- **Fix:** capture an Editor screenshot (timeline + scenes panel + preview at a representative state), 1280×800, save as `/public/screenshot-editor.png`. Update JSON-LD `screenshot` to point at it. Keep `og-image.png` for OG cards.
- **Effort:** S

### S-Mi7 — Vercel bot-detection regex misses several major crawlers
- **Issue:** `vercel.json:17` regex is `(?i).*(bot|crawler|spider|googlebot|bingbot|twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|whatsapp|telegram).*`. Most other bots include "bot" so they catch — except: `Applebot` (matches `bot` ✓), `DuckDuckBot` (matches ✓), `YandexBot` (matches ✓), `Baiduspider` (matches `spider` ✓), but Slack's link unfurl uses `Slackbot-LinkExpanding` (matches ✓). However `iframely`, `embedly`, `nuzzel`, `vkShare` don't match. More relevant: bare crawlers like `Mastodon` (used for fediverse link previews) don't match.
- **Impact:** Mastodon link previews on `/share/:token` will see the SPA shell instead of `share-meta` HTML — generic OG card shown instead of the video thumbnail/title.
- **Fix:** in `vercel.json:17` regex, append `mastodon|iframely|embedly|nuzzel|vkshare|skypeuripreview|applebot|petalbot|mojeekbot`. Or simpler: switch to a denylist (everything that fails the SPA's session-cookie check) but that's a bigger architectural change.
- **Effort:** XS

### S-Mi8 — `/share/:token` rewrites only on `/share/:id` (single-segment) — multi-segment shares miss bot-SSR
- **Issue:** `vercel.json:16` source is `/share/:id` — Vercel matches single path segment. If any share URL ever uses `/share/<userId>/<videoId>` style, bots hit the SPA shell.
- **Impact:** future-proofing only; current share URLs appear single-segment per `App.tsx:106` (`/share/:token`). Flagging because the data model could evolve.
- **Fix:** none required today. If multi-segment share routes ship, change to `/share/:path*` with the same has-header rule.
- **Effort:** XS

---

## Polish

### S-P1 — Missing `og:image:type` declaration
- **Issue:** `index.html:36-39` and `marketing/src/layouts/BaseLayout.astro:56-58` declare `og:image` + `og:image:width` + `og:image:height` + `og:image:alt`, but no `og:image:type`. WhatsApp and some Slack workspaces fall back to a generic preview when image type is ambiguous.
- **Fix:** after `og:image:alt`, add `<meta property="og:image:type" content="image/png" />`.
- **Effort:** XS

### S-P2 — No Astro `pricing.astro` despite sitemap claiming `/pricing` is its own page
- **Issue:** `public/sitemap.xml:21` lists `/pricing` at priority 0.9. `vercel.json:35-36` rewrites `/pricing` to `/app-shell.html` (the SPA). Static-first paint = the homepage; React then renders Pricing. No purpose-built static `/pricing` page exists in `marketing/src/pages/`.
- **Fix:** add `marketing/src/pages/pricing.astro` mirroring the SPA Pricing layout for first-paint SSG. Drop the `/pricing` rewrite. SPA `Pricing.tsx` becomes a fallback if a logged-in user navigates directly via the dashboard.
- **Effort:** M

### S-P3 — `BaseLayout.astro` description-hardcodes the en-US locale
- **Issue:** `marketing/src/layouts/BaseLayout.astro` has no `og:locale` declaration (compare to `index.html:41` `og:locale=en_US`).
- **Fix:** in `BaseLayout.astro` after `og:site_name`, add `<meta property="og:locale" content="en_US" />`.
- **Effort:** XS

### S-P4 — Image sitemap uses non-cache-busted URL while OG image uses `?v=20260129`
- **Issue:** `public/sitemap.xml:10` references `https://motionmax.io/og-image.png` (no version qs). `index.html:36` references `https://motionmax.io/og-image.png?v=20260129`. When the OG image is replaced (as recommended in S-Mi6 / SEO_DISTRIBUTION_PLAN), the sitemap-cited copy will not invalidate Google Image Search caches.
- **Fix:** match the cache-bust query on `public/sitemap.xml:10` to whatever version the live `og-image.png` deploys with, OR use a hashed filename and emit it from a build step. Easiest fix: drop the `?v=` from `index.html:36,47` and rotate the filename instead (e.g., `og-image-v3.png`).
- **Effort:** XS

### S-P5 — Same `BreadcrumbList` schema duplicated by `BaseLayout.astro` and `PageSeo.tsx`
- **Issue:** `marketing/src/layouts/BaseLayout.astro:24-35` builds a BreadcrumbList from props. `src/components/PageSeo.tsx:27-38` builds one independently. Two source-of-truth implementations with no shared tested helper. `src/pages/Terms.tsx:16` calls PageSeo — but `marketing/src/pages/terms.astro` calls LegalLayout. Two URLs (`/terms` from Astro, `/terms` from SPA) potentially compete.
- **Impact:** post-merge, only one `/terms` exists (the Astro static; SPA `Terms.tsx` is unreachable because Astro's `dist/terms/index.html` wins). The duplicate code path is dead.
- **Fix:** delete `src/pages/Terms.tsx`, `src/pages/Privacy.tsx`, `src/pages/AcceptableUse.tsx` and the related routes in `src/App.tsx:252-254` — they're shadowed by the Astro statics. Trim React bundle. Independent of SEO but tied to the SEO-routing architecture.
- **Effort:** S

---

## Production Blockers

| # | Severity | Finding |
|---|----------|---------|
| S-C1 | Critical | Sitewide canonical = homepage on every SPA route (collapses /pricing, /share/:token into /) |
| S-C2 | Critical | `app-shell.html` ships `index, follow` for every authenticated route |
| S-C3 | Critical | `robots.txt` blocks `/dashboard` (gone) but not `/dashboard-new`, `/lab`, `/billing` |
| S-C4 | Critical | `/pricing` has no description / canonical / OG override despite priority 0.9 in sitemap |

## Top 10 Priority Fixes

| Rank | Finding | Severity | Effort | Why first |
|------|---------|----------|--------|-----------|
| 1 | S-C2 — Flip static `<meta robots>` to `noindex,nofollow` in app-shell.html | Critical | XS | One-line fix; eliminates leak of admin/lab/dashboard-new |
| 2 | S-C3 — Replace stale robots.txt with route-accurate disallows | Critical | XS | One-line-per-route; immediate impact on next crawl |
| 3 | S-C1 — Strip static canonical from app-shell.html; rely on PageSeo per route | Critical | S | Unblocks /pricing and /share for indexing |
| 4 | S-C4 — Add full PageSeo block to Pricing.tsx | Critical | S | Highest-intent transactional URL |
| 5 | S-M3 — Strip "Visual Stories"/storytelling remnants across 9 files | Major | S | Search-snippet ↔ product mismatch tanks CTR |
| 6 | S-M2 — Emit `VideoObject` JSON-LD from `share-meta` function + landing demo | Major | M | Unlocks Google Video Search for the actual product output |
| 7 | S-M5 + S-M6 — Drop `Crawl-delay: 10`, unify CCBot policy | Major | XS | Unblocks Bing/Yandex/CommonCrawl-derived LLMs immediately |
| 8 | S-M7 — Replace static sitemap with build-step generator (real `lastmod`) | Major | S | Required so the storytelling-removal edits propagate |
| 9 | S-C5 — Drop the en-only hreflang lines OR commit to localized `/fr/`,`/es/`,etc. routes | Critical | S–L | Stops the "11 languages" lie OR captures 10× the long-tail pool |
| 10 | S-M9 — Public knowledge-base at `/help/*` with FAQ + Article schema | Major | L | Highest content-leverage SEO play; activates "People Also Ask" rich-snippet supply |

---

**Reviewer notes:**
- On-page technical SEO is genuinely above-average (per `SEO_DISTRIBUTION_PLAN.md:1.1` self-assessment, which the artifacts confirm). The issues above are not "missing schema" — they are **routing-layer regressions** (S-C1, S-C2, S-C3 are caused by the Path B Astro-merge architecture not propagating per-route SEO into the SPA shell) and **claim-vs-evidence gaps** (S-C5 hreflang, S-M3 storytelling remnants, S-M2 zero VideoObject on a video product).
- Audience-relative weighting: the audience is "tool-savvy creative adults" who *will* search for "best AI video generator", "ai cinematic video", "ai video pricing", "[language] ai voiceover", and similar long-tail. The current setup blocks the funnel at the most commercially valuable pages (/pricing canonical, /share VideoObject). Mobile-heavy usage means `og:image` quality (Mi6, SEO_DISTRIBUTION_PLAN cross-reference) is doubly important — most shares happen via mobile WhatsApp/iMessage where the OG card is the only product preview.
- Skip-list (out of scope for §12, owned by other reviewers): brand-color compliance (Optic), Core Web Vitals/LCP (Prism), localization quality (Tongue/Locale), accessibility (Halo).

— Signal
