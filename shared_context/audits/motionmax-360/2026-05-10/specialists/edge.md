# EDGE — CDN, Caching, Asset Delivery (MotionMax 360 Audit)

**Reviewer:** Edge (Platform — CDN/Caching specialist)
**Date:** 2026-05-10
**Scope:** §5 (Performance — caching/CDN slice) + §8 (Infrastructure — edge placement & asset delivery)
**Project source:** `C:\Users\Administrator\motionmax`
**Audience-relative scoring:** mobile-heavy creative adults on US cellular + WiFi; latency budgets are tight, every KB on first paint costs trust.

Method: static analysis of `vercel.json`, `vite.config.ts`, `marketing/astro.config.mjs`, `dist/` build output, `supabase/functions/serve-media/`, `share-meta/`, root `index.html`, and `public/` asset directory.

---

## Findings (grouped by category, sorted by severity)

### §5 — Performance / Caching

#### F1 — BLOCKER — Marketing-site JS chunks served with no long-cache header
- **Issue:** `vercel.json:84-91` only sets `Cache-Control: public, max-age=31536000, immutable` for `/assets/(.*)`. Astro emits the marketing site under `/_astro/` (`marketing/astro.config.mjs:18` → `assets: "_astro"`, evidence: `dist/_astro/{hoisted.BUi3Ixs-.js, index.D8EgmA0U.css, acceptable-use.BstqiDvn.css}`). These hashed/immutable artifacts will inherit Vercel's default short cache TTL — every Terms / Privacy / Acceptable-Use visit re-downloads JS and CSS that never changes for a given hash.
- **Evidence:** `vercel.json:84` (`"source": "/assets/(.*)"` only); `marketing/astro.config.mjs:18` (`assets: "_astro"`); `dist/_astro/hoisted.BUi3Ixs-.js`, `dist/_astro/index.D8EgmA0U.css` exist on disk under `/_astro/`, not `/assets/`.
- **Fix:** in `vercel.json` headers add a second source rule:
  ```json
  { "source": "/_astro/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ```
- **Effort:** XS

#### F2 — BLOCKER — Hashed JS chunks under `/assets/` lack `Cache-Control` for `*.js` (rule covers path prefix only — verify it actually ships)
- **Issue:** The rule `/assets/(.*)` does match Vite-emitted JS at `dist/assets/*.js`, but every other static type Vite outputs to root or `_astro/` (worker, sw, font, png, webp) is NOT covered. Specifically: `dist/sw.js`, `dist/workbox-af030cb8.js`, `dist/herobackground.webp`, `dist/momaxlogo.webp`, `dist/caption.webp`, `dist/manifest.json`, `dist/apple-touch-icon.png`, `dist/favicon.png`, `dist/og-image.png`, `dist/mmbg.svg` all sit at `/` and inherit Vercel default (~1h public, must-revalidate). Workbox JS is hashed and immutable — should be a year. PNG/webp/svg should be a year (filenames are content-addressed by deploy).
- **Evidence:** `vercel.json:45-110` headers block — only `/(.*)`, `/index.html`, `/app-shell.html`, `/assets/(.*)`, `/(.*)\.css`, `/sw.js` rules exist. `dist/workbox-af030cb8.js` (hashed, immutable) is NOT covered. `dist/_astro/*` not covered. `dist/*.{png,webp,svg,woff2}` not covered.
- **Fix:** add three rules in `vercel.json` headers:
  ```json
  { "source": "/(.*)\\.(png|jpg|jpeg|webp|svg|ico|woff2|woff|ttf)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
  { "source": "/workbox-(.*)\\.js", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
  { "source": "/_astro/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ```
  Caveat: root assets like `/favicon.png`, `/og-image.png` are NOT content-hashed — they would also pick up the year cache. To force re-fetch on logo change, use the `?v=…` query param pattern already in use at `index.html:36,47,92,107` and bust on deploy via env-driven asset version constant.
- **Effort:** S

#### F3 — CRITICAL — `favicon.png`, `apple-touch-icon.png`, `og-image.png`, `momaxlogo.png` are 752 KB each (identical bytes; oversized)
- **Issue:** Four root images are exactly 752,294 bytes each (`dist/{favicon,apple-touch-icon,og-image,momaxlogo}.png`) — the same source PNG copied four times. Favicon spec is 32×32 / 16×16; a 752 KB favicon is ~50× the appropriate budget and is force-loaded on every page (referenced 4× in `index.html:21-26`). On 4G mobile (~5 Mbps real-world) that adds ~1.2 s to the TTFB-to-FCP gap before any meaningful content paints.
- **Evidence:** `ls -la dist/` shows `apple-touch-icon.png 752294`, `favicon.png 752294`, `momaxlogo.png 752294`, `og-image.png 752294`. `index.html:21-30` references favicon.png four times for icon, shortcut icon, sized 32, sized 16, mask-icon and msapplication-TileImage.
- **Fix:** regenerate each at correct dimensions: `favicon.png` → 32×32 PNG (target <5 KB), `apple-touch-icon.png` → 180×180 (<20 KB), `og-image.png` → 1200×630 WebP @ q80 (<60 KB), `momaxlogo.png` → 512×512 WebP (already have `momaxlogo.webp` at 79 KB — reference it instead of `.png`). Use `sharp` or `squoosh-cli`. Then re-run `npm run build` and verify `dist/` sizes.
- **Effort:** S

#### F4 — CRITICAL — `caption.png` (2.26 MB) and `herobackground.png` (2.5 MB) ship to all clients, no responsive variants, no AVIF
- **Issue:** `dist/caption.png 2,260,206 bytes` and `dist/herobackground.png 2,504,450 bytes`. The webp variants exist (`caption.webp 145,900 b`, `herobackground.webp 118,410 b`) and `index.html:115` does preload the webp hero — but the 2.5 MB PNG fallbacks are still in the bundle and reachable by any `<img src>` that omits `<picture>`. PWA precache `globPatterns: "**/*.{js,css,ico,png,webp,svg,woff2}"` (`vite.config.ts:59`) will attempt to install both copies; with `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024` (line 58), each just barely fits — but combined with other PNGs the precache balloons to ~10 MB on mobile install. Mobile users on cellular pay full price.
- **Evidence:** `dist/caption.png` and `dist/herobackground.png` byte counts above. `vite.config.ts:55-60` workbox config. The PNG fallbacks are not removed from the build.
- **Fix:**
  1. Delete `public/caption.png` and `public/herobackground.png` from source if no consumer imports them; keep only the `.webp` (and add an `.avif` companion for ~30 % more savings on Safari 16+/Chrome).
  2. If a fallback is required for legacy browsers, host the PNGs on Supabase storage and lazy-load via `<picture>` so they never enter the precache.
  3. Tighten `globPatterns` in `vite.config.ts:59` to exclude `*.png` (only ship the `*.webp` to PWA): `globPatterns: ["**/*.{js,css,ico,webp,svg,woff2}", "app-shell.html"]`.
- **Effort:** S

#### F5 — CRITICAL — `mmbg.svg` is 1.89 MB (likely embedded raster — not a vector)
- **Issue:** `dist/mmbg.svg 1,889,015 bytes`. SVGs that exceed 1 MB almost always contain base64-embedded raster data — defeating the purpose of an SVG. Will be precached by the service worker (matches `*.svg` in `globPatterns`) AND served uncompressed unless brotli is enabled at the CDN.
- **Evidence:** `dist/mmbg.svg` size 1.89 MB. SVG is not in any `<picture>` or media-query branch in `index.html`.
- **Fix:** open the SVG; if it contains `<image href="data:image/...">` blocks, extract the raster, downsample to needed pixel dims, save as WebP, and either inline a true vector path replacement or reference the WebP via standard `<img>`. Confirm GZIP/Brotli is on for `image/svg+xml` in Vercel (default yes) — but compression won't shrink base64-embedded images.
- **Effort:** S

#### F6 — CRITICAL — Service Worker `supabase-api` runtime cache silently caches user-scoped REST/Auth responses
- **Issue:** `vite.config.ts:63-67` registers `urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i, handler: "NetworkFirst"` with a 5-min `maxAgeSeconds`. This regex matches `/auth/v1/user`, `/auth/v1/token`, `/rest/v1/projects`, `/rest/v1/voices`, every RPC, every RLS-protected table read. On a shared device, after a user logs out, the cached responses for `/rest/v1/profiles?id=eq.X` survive in the SW cache and can be served to a new user via NetworkFirst's 5 s default network timeout if the device is offline. Privacy and authorization risk.
- **Evidence:** `vite.config.ts:63-67`. The pattern has no exception for `/auth/v1/*` or for non-GET methods (Workbox NetworkFirst caches GETs only by default — that mitigates writes but not reads).
- **Fix:** narrow the URL pattern to ONLY safe-to-cache endpoints, e.g. project thumbnails or static config:
  ```js
  urlPattern: ({ url }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/storage/v1/object/public/'),
  ```
  Remove the broad `*.supabase.co/*` pattern. For `/rest/v1` calls, rely on TanStack Query's in-memory cache (already in `package.json`). Add `Cache-Control: no-store` to all `/rest/v1` and `/auth/v1` responses on the Supabase side as defense in depth.
- **Effort:** S

#### F7 — CRITICAL — Service Worker `supabase-thumbnails` cache (24 h CacheFirst) on signed Storage URLs causes broken-image flashes
- **Issue:** `vite.config.ts:69-77` caches `*.supabase.co/storage/v1/object/*` for 24 h with CacheFirst. The `serve-media` function (`supabase/functions/serve-media/index.ts:93-95`) issues 5-minute signed URLs (`createSignedUrl(filePath, 300)`). When the SW returns a stale-but-cached image whose underlying signed URL has long expired and the user goes online and the cache evicts (24 h later), the next request returns a 401 from Supabase Storage — broken-image icon. Worse, a CacheFirst hit can also serve a previously-deleted asset (post-account-deletion) for up to 24 h.
- **Evidence:** `vite.config.ts:69-77` (CacheFirst, 24h, statuses [0,200]). `supabase/functions/serve-media/index.ts:95` (`createSignedUrl(filePath, 300)`). The 24 h cache window vastly exceeds the 5 min URL lifetime.
- **Fix:** either (a) switch to `StaleWhileRevalidate` so users always get a fresh fetch in the background, OR (b) keep CacheFirst but cache by path-without-query (use `cacheKeyWillBeUsed` plugin to strip the signing query params) — that way a fresh signed URL always succeeds while the cached body remains keyed by stable path. Snippet:
  ```js
  plugins: [{
    cacheKeyWillBeUsed: async ({ request }) => new URL(request.url).pathname,
  }],
  ```
- **Effort:** S

#### F8 — MAJOR — `serve-media` edge function awaits `writeSystemLog` on every 302 (latency tax on hot path)
- **Issue:** `supabase/functions/serve-media/index.ts:122-129` awaits a Postgres INSERT before returning the 302 redirect. Every video/image fetch now incurs ~30–150 ms of DB write latency before the browser even starts loading the asset. This is a per-asset cost on a page that may render 8–20 thumbnails (Editor.tsx scene strip).
- **Evidence:** `supabase/functions/serve-media/index.ts:122-129` `await writeSystemLog(...)` precedes `return new Response(null, { status: 302, headers })` at line 132.
- **Fix:** fire-and-forget by removing the `await` and chaining `.catch(console.error)`:
  ```ts
  writeSystemLog({ ... }).catch((e) => console.error('[serve-media] log failed', e));
  return new Response(null, { status: 302, headers });
  ```
- **Effort:** XS

#### F9 — MAJOR — `serve-media` re-issues a fresh signed URL on every request despite a 2-minute browser cache
- **Issue:** Function caches the 302 response with `Cache-Control: private, max-age=120` (`serve-media/index.ts:110`) but mints a new 5-minute signed URL on every cold request (`index.ts:93-95`). The mismatch means: (a) the browser's cached 302 points at a signed URL that expires in 5 min, but the cache lives 2 min — fine, but (b) on each cache miss the function pays the round-trip to Supabase Storage's signed-URL API. With no edge cache at the function level, repeat assets across users (e.g. shared template thumbs) re-sign every time.
- **Evidence:** `supabase/functions/serve-media/index.ts:93-110`. No memoization, no s-maxage on the function response (only `private, max-age=120`).
- **Fix:** if the asset path is content-stable (not user-personalized), set `Cache-Control: private, max-age=240, stale-while-revalidate=120` to align with the 5-min signed URL TTL minus a safety margin. For shared/public buckets, switch to `public, s-maxage=240` so Vercel CDN can de-duplicate. For truly user-private assets keep `private`.
- **Effort:** S

#### F10 — MAJOR — Vercel rewrite proxies every `/api/video/*` through the Supabase function (extra hop)
- **Issue:** `vercel.json:7-10` rewrites `/api/video/:path*` to `serve-media`. Every video request becomes: browser → Vercel edge → Supabase function → 302 → Supabase Storage → browser. The Vercel edge cannot cache the function's 302 (it's `private`), so each request pays two cross-network hops. For a US-east user this is ~120 ms extra; for non-US users (the audit notes 11 languages and "US-first" but global reach) it's worse.
- **Evidence:** `vercel.json:7-14` rewrites; `serve-media` returns `private` Cache-Control so Vercel CDN won't cache.
- **Fix:** for already-rendered project videos (which are immutable once finished), have the worker write the final video URL into the DB and return the signed Supabase Storage URL directly to the client, bypassing the function. Reserve `serve-media` for in-progress / private scene assets where auth-on-every-fetch matters.
- **Effort:** M

#### F11 — MAJOR — `share-meta` function uses `public, max-age=N` but no `s-maxage` — Vercel CDN won't cache the OG payload
- **Issue:** `supabase/functions/share-meta/index.ts:302` sets `Cache-Control: isBotRequest ? "public, max-age=60" : "public, max-age=300"`. Without `s-maxage`, intermediary CDNs (Vercel's edge in front of the rewrite) treat this as the shared-cache TTL too — fine, but the lack of `stale-while-revalidate` means every TTL boundary forces a synchronous origin hit. Twitter/Facebook/LinkedIn crawlers fan out from many regions; each region misses cache and re-hits the function which re-runs an RPC + a DB log write (line 289-295). At launch-day virality this becomes a function-invocation cost spike.
- **Evidence:** `supabase/functions/share-meta/index.ts:297-304`.
- **Fix:** change to `public, max-age=60, s-maxage=600, stale-while-revalidate=300` for bots and `public, max-age=300, s-maxage=900, stale-while-revalidate=600` for humans. Also fire-and-forget the system log write same as F8.
- **Effort:** XS

#### F12 — MAJOR — Google Fonts loaded as render-blocking stylesheet with 14 font families
- **Issue:** `index.html:126-128` loads two separate Google Fonts stylesheet `<link rel="stylesheet">` tags pulling 16+ font families (Inter, Montserrat, Bebas Neue, Poppins, Bangers, Comfortaa, Oswald, Pangolin, Flavors, Chango, Luckiest Guy, Vina Sans, Special Elite, Rubik Mono One, Pacifico, Instrument Serif, JetBrains Mono). Even with `display=swap`, this is render-blocking CSS; many of these fonts are only used inside the caption-style dropdown (deep in the editor) — they should be on-demand, not above-the-fold.
- **Evidence:** `index.html:124-128`; comment block at `index.html:116-123` explains the *current* design forces blocking load.
- **Fix:** ship only Inter (UI font) blocking; lazy-inject the caption display fonts when `CaptionStyleSelector` first mounts. Code-split: in `src/components/.../CaptionStyleSelector.tsx`, append a `<link rel="stylesheet" href="…">` via `useEffect` on mount. The dropdown opens on user click — the 200–400 ms font load is acceptable inside a dropdown, intolerable on first paint.
- **Effort:** M

#### F13 — MAJOR — No edge-region pinning on Supabase Edge Functions; share-meta and serve-media may run far from US-first audience
- **Issue:** Supabase Edge Functions deploy to a single primary region per project (the project's host region) unless explicitly distributed. `serve-media` and `share-meta` are on the hot path for every video playback and every social share — if the project is deployed to e.g. EU-west, US users pay 80–120 ms transatlantic latency on every asset hit. No `regions` or geo config visible in `supabase/functions/*/deno.json` (the `Grep` for "regions" only matched `generate-video/index.ts`, which is a different concern).
- **Evidence:** `supabase/functions/deno.json` exists at function root; no per-function region declaration. Brief states "US-first launch."
- **Fix:** confirm Supabase project region is `us-east-1` (Render worker should match). Document the choice in `iac/` or `DEPLOYMENT_SECURITY.md`. For long-term global reach, Supabase Edge Functions globally distribute via Deno Deploy — verify in the Supabase dashboard that "regional invocation" is enabled for hot-path functions.
- **Effort:** S (verification + doc); M (if reprovisioning required)

### §8 — Infrastructure / Edge Placement

#### F14 — MAJOR — Supabase project URL hardcoded in `vercel.json` rewrites
- **Issue:** `vercel.json:9,13` hardcodes `https://ayjbvcikuwknqdrpsdmj.supabase.co` in the rewrite destinations. Promoting a preview deploy or staging environment to a different Supabase project requires editing committed config. Also leaks the production project ref to anyone reading the repo.
- **Evidence:** `vercel.json:9` `"destination": "https://ayjbvcikuwknqdrpsdmj.supabase.co/functions/v1/serve-media?…"`, line 13 `share-meta`, line 18 `share-meta` (bot rewrite).
- **Fix:** Vercel rewrites do support env interpolation in `vercel.json` via `$VAR` tokens in some plans — verify the team plan supports it. Otherwise generate `vercel.json` at build time from `.env` (pre-build script in `scripts/`). Store the project ref in `SUPABASE_PROJECT_REF` env var.
- **Effort:** S

#### F15 — MAJOR — `cleanupOutdatedCaches: true` + `skipWaiting: true` can serve 404 chunks mid-navigation
- **Issue:** `vite.config.ts:55-57` enables `skipWaiting`, `clientsClaim`, AND `cleanupOutdatedCaches`. When a deploy lands while a user has an open tab: the new SW activates immediately, deletes the old precache (which contained the user's currently-loaded chunk hashes), and any subsequent dynamic `import()` from the old app version tries to fetch a JS chunk filename that no longer exists in `dist/` — 404 → uncaught exception → blank screen. The mitigation comment in `vite.config.ts:42-54` covers staleness but not the inverse hazard.
- **Evidence:** `vite.config.ts:55-57`. React Router code-splits via lazy(); each lazy chunk is hashed.
- **Fix:** add a global error handler for chunk-load failures that triggers `window.location.reload()` (see Vite's recommended pattern). In `src/main.tsx`:
  ```ts
  window.addEventListener('vite:preloadError', () => window.location.reload());
  ```
  Plus listen for `SW updatefound → installed → reload prompt` to give users a "New version available — reload" toast instead of silent disruption.
- **Effort:** S

#### F16 — MINOR — `sitemap.xml` and `robots.txt` have no explicit Cache-Control
- **Issue:** Neither matches a custom rule in `vercel.json:45-110`. Both inherit Vercel's default short cache. Search engines re-fetch frequently, but a tighter `public, max-age=600, s-maxage=3600, stale-while-revalidate=86400` reduces origin hits without hurting indexing freshness.
- **Evidence:** `dist/sitemap.xml` and `dist/robots.txt` exist; no header rule covers them.
- **Fix:** add to `vercel.json` headers:
  ```json
  { "source": "/(robots\\.txt|sitemap\\.xml|llms\\.txt)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" }] }
  ```
- **Effort:** XS

#### F17 — MINOR — `manifest.json` no Cache-Control rule
- **Issue:** PWA manifest at `dist/manifest.json` (1.4 KB) re-fetched by browsers on every install/launch check. No header rule. A 24 h cache is plenty since manifest changes are rare and force-refresh on PWA reinstall is a known accepted UX cost.
- **Evidence:** `dist/manifest.json` exists; not covered in `vercel.json`.
- **Fix:** add `{ "source": "/manifest.json", "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }] }`
- **Effort:** XS

#### F18 — MINOR — `app-shell.html` hashed-chunk preload references could go stale at edge
- **Issue:** `vercel.json:79-82` correctly sets `no-cache, no-store, must-revalidate` on `/app-shell.html`. Good. However, the SPA navigation fallback in `vite.config.ts:60` (`navigateFallback: "app-shell.html"`) means the SW *also* serves app-shell from its own precache — and the precache was built at deploy time. After a deploy, users on the old SW continue to get the old app-shell (with old chunk references) until their SW updates. Combined with F15, post-deploy users can hit a window where the SW serves the old app-shell that references chunks the deploy already deleted from the CDN.
- **Evidence:** `vite.config.ts:60` `navigateFallback: "app-shell.html"`; precache pattern `globPatterns` includes `app-shell.html`. SW update is async on next page load.
- **Fix:** combine with F15 mitigation. Optionally add `navigateFallbackAllowlist` to scope the fallback only to in-app routes, leaving marketing routes to fetch fresh from network.
- **Effort:** S

#### F19 — MINOR — No CDN-level image-resize / image-CDN for user-generated thumbnails
- **Issue:** Project / scene thumbnails come straight from Supabase Storage at full source resolution (typically 1024×1792 portrait for video projects). Mobile dashboard renders 4–6 thumbs on a 360-pt screen; downloading 1024-wide PNGs to display at 160 pt CSS is ~6× wasted bandwidth. No `?width=…` or Vercel `next/image` equivalent. Vercel Image Optimization (`/_vercel/image`) is available even for non-Next sites and can wrap arbitrary remote URLs.
- **Evidence:** `vercel.json` has no `images` block; `serve-media` returns the raw asset; SW caches at full resolution.
- **Fix:** add to `vercel.json`:
  ```json
  "images": {
    "remotePatterns": [{ "protocol": "https", "hostname": "ayjbvcikuwknqdrpsdmj.supabase.co" }],
    "sizes": [128, 256, 384, 512, 768, 1024],
    "minimumCacheTTL": 86400
  }
  ```
  Then in dashboard thumbnail components, build URLs as `/_vercel/image?url=<encoded>&w=256&q=70`. Lift to a single helper to avoid open-coding everywhere.
- **Effort:** M

#### F20 — POLISH — `Permissions-Policy` is set globally but no `Document-Policy` or `Origin-Agent-Cluster` headers
- **Issue:** Edge concern is minor: `vercel.json:62-64` sets `Permissions-Policy: camera=(), microphone=(self), geolocation=()` which is fine. Adding `Origin-Agent-Cluster: ?1` improves cross-origin isolation for Workers performance and is a one-line edge header.
- **Evidence:** `vercel.json:62-72` headers block.
- **Fix:** add `{ "key": "Origin-Agent-Cluster", "value": "?1" }` to the global header list.
- **Effort:** XS

---

## Production Blockers Table

| ID  | Severity | Title | Effort |
|-----|----------|-------|--------|
| F1  | BLOCKER  | Marketing `/_astro/*` JS+CSS shipped without `Cache-Control: immutable` | XS |
| F2  | BLOCKER  | Hashed `workbox-*.js`, `*.{png,webp,svg,woff2}` at root not covered by long-cache rule | S |

## Top 10 Priority Fixes

| Rank | ID | Severity | Title | Why It Matters First |
|------|----|----------|-------|----------------------|
| 1 | F3 | Critical | Shrink 752 KB favicon family (4 identical copies) | First-paint blocker on every page; cheapest mobile win |
| 2 | F4 | Critical | Drop or lazy-load 2.5 MB hero & 2.2 MB caption PNG fallbacks | 5 MB on PWA install; mobile data hostility |
| 3 | F1 | Blocker  | Add `/_astro/(.*)` long-cache rule | Marketing site SEO crawl + repeat visits broken |
| 4 | F2 | Blocker  | Add wildcard `*.png/webp/svg/woff2` long-cache rule | Workbox & root images re-downloaded on every visit |
| 5 | F6 | Critical | Stop SW caching `/auth/v1` and `/rest/v1` | Auth/PII leakage on shared devices |
| 6 | F7 | Critical | Fix 24 h CacheFirst over 5-min signed Storage URLs | Broken image flashes, deleted-asset persistence |
| 7 | F5 | Critical | Decompose 1.89 MB `mmbg.svg` (likely embedded raster) | Wastes bandwidth + precache budget |
| 8 | F8 | Major    | Make `serve-media` system log fire-and-forget | 30–150 ms tax on every asset |
| 9 | F11| Major    | Add `s-maxage` + `stale-while-revalidate` to `share-meta` | CDN can absorb crawler fan-out at viral moments |
| 10| F12| Major    | Lazy-load 14 caption display fonts | LCP on cellular, audience is mobile-heavy |

---

**Notes / Limits of static analysis:**
- Could not verify live response headers without a curl/HTTP fetch. Recommendations assume `vercel.json` is the active config.
- Could not measure actual cache HIT/MISS rates from Vercel Analytics or Supabase Edge logs.
- Did not assess Render.com worker's outbound bandwidth or any Cloudflare/CloudFront/R2 layering — none referenced in `package.json`, `vercel.json`, or `iac/` from sampled paths.
- The `r2.dev` host appears in CSP `img-src` (`vercel.json:71`) suggesting Cloudflare R2 is used somewhere — could not locate the integration code in time budget; recommend follow-up audit.

— Edge
