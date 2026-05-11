# Prism — Performance Audit (§5)

**Project:** motionmax-360
**Date:** 2026-05-10
**Reviewer:** Prism (Frontend Performance)
**Audience:** tool-savvy creative adults; mobile-heavy
**Scope:** §5 Performance — Web Vitals, bundle, oversized deps, code-splitting, re-renders, memoization, image/video assets, CDN, Core Web Vitals as ranking factors. Landing + Dashboard prioritized.

> Methodology — static analysis of source + the existing `dist/` build artifact at
> `C:\Users\Administrator\motionmax\dist\assets`. No live Lighthouse run was
> available in this audit window. Field-data sized claims (LCP/CLS/INP in ms)
> are estimates derived from waterfall reasoning and asset weights. They are
> labeled as estimates. Treat them as upper-bound signals, not measurements.
> The project ships `lighthouserc.cjs` only for `/admin` (perf ≥ 90) — there is
> **no Lighthouse gate for `/`, `/dashboard-new`, `/app/create/new`, or
> `/app/editor/:id`**. That is a §5 gap on its own (see PRISM-PERF-014).

---

## Findings (grouped by category, severity-sorted)

### Performance — Blocker

**PRISM-PERF-001 — Brand favicon and OG image are 736 KB each, served from `/public` on every navigation**
- Severity: Blocker
- File:line: `public/favicon.png` (736 KB), `public/apple-touch-icon.png` (736 KB), `public/og-image.png` (736 KB), `public/momaxlogo.png` (736 KB) — referenced from `index.html:21-25, 36, 47, 107`
- Evidence (file size, `du -sh public/*`):
  - `favicon.png` 736 KB — declared at 16×16 and 32×32 (`index.html:22-23`); the actual file is a fully-rendered logo, ~25× larger than necessary
  - `apple-touch-icon.png` 736 KB at 180×180 declared
  - `og-image.png` 736 KB referenced 4× in `<head>` (og + twitter + ld+json) and re-fetched on every share
  - `momaxlogo.png` 736 KB shipped despite the WebP variant `momaxlogo.webp` (80 KB) existing one directory over
- Why it matters: every cold visit to `/` downloads the favicon synchronously during initial parse. On mobile 4G this is ~600-800 ms of pure waste before a single React byte renders. Compounds with PRISM-PERF-002 (font-blocking).
- Estimated LCP impact (mobile 4G, 3 Mbps): 400-700 ms regression
- Fix: regenerate each at the correct dimensions and format. `favicon.png` → ICO multi-resolution + PNG 32×32 (target < 2 KB). `apple-touch-icon.png` → 180×180 PNG (< 15 KB). `og-image.png` → 1200×630 WebP/JPG (< 80 KB). Replace `momaxlogo.png` references with the existing `momaxlogo.webp`.
- Effort: S

**PRISM-PERF-002 — `index.html` loads 15+ display fonts as a render-blocking stylesheet before React boots**
- Severity: Blocker
- File:line: `index.html:126` (single Google Fonts URL), `index.html:128` (Instrument Serif + JetBrains Mono)
- Evidence (the stylesheet URL itself enumerates the families):
  ```
  Inter, Montserrat, Bebas+Neue, Poppins, Bangers, Comfortaa, Oswald,
  Pangolin, Flavors, Chango, Luckiest+Guy, Vina+Sans, Special+Elite,
  Rubik+Mono+One, Pacifico, Instrument+Serif, JetBrains+Mono
  ```
  `<link rel="stylesheet">` (not `rel="preload" as="style"`) blocks the parser until the CSS file is fetched, parsed, and the `@font-face` URLs are resolved. The accompanying comment (`index.html:116-123`) acknowledges the deferred pattern was reverted because of a caption-style preview race — meaning a real product bug forced the regression.
- Why it matters: Inter (body) + Montserrat (display) is what landing actually paints; the other 13+ are caption preview decoratives only used inside the gated CreateNew/Editor flow. They should not be on the critical path of `/`.
- Estimated LCP impact (mobile 4G): 350-600 ms (one extra blocking RTT + multi-font fetch for fonts the landing never paints)
- Fix: split into two stylesheets. (1) Critical: Inter 400/500/600/700 + Montserrat 700/800/900 + Instrument Serif — keep blocking. (2) Caption decorative families — load on demand from inside the caption-style picker via `document.fonts.load()` or a dynamically appended `<link>` when the picker opens. The comment at `index.html:116-123` describes the bug exactly; the fix is conditional load, not blanket eager load.
- Effort: M

**PRISM-PERF-003 — Single style-preview PNG is 1.8 MB; all 17 are statically imported into the same chunk**
- Severity: Blocker
- File:line:
  - `src/assets/styles/cardboard-preview.png` 1.8 MB
  - `src/assets/styles/sketch-preview.png` 604 KB
  - `src/assets/styles/lego-preview.png` 312 KB
  - `src/assets/styles/barbie-preview.png` 228 KB
  - All 17 imported synchronously at `src/components/workspace/StyleSelector.tsx:13-29` and `src/components/workspace/SmartFlowStyleSelector.tsx:13-28`
- Evidence (built artifact `dist/assets`):
  - `cardboard-preview-BYieciak.png` 1,843,868 bytes
  - `UserDrawer-BaSXGJ9w.js` 394,294 bytes — the import graph through StyleSelector pulls these into the user-facing intake chunk
- Why it matters: Vite static `import x from "*.png"` co-locates the image in the chunk graph. A user opening `/app/create/new` on mobile pays for **3.2 MB+ of style PNGs** to render a thumbnail strip they may scroll past in 200ms. cardboard-preview alone exceeds the entire budget for an above-the-fold image.
- Estimated INP impact: opening the intake dialog stalls the main thread on PNG decode for 400-1200 ms per preview on a mid-range Android.
- Fix: convert all 17 to WebP (quality 75, max 800px wide → expect 30-90 KB each). Move them to `public/styles/<name>.webp` and reference via `<img src="/styles/cardboard.webp" loading="lazy" decoding="async" width="..." height="...">`. The static import → bundle-coupling vanishes and they each become a separate cacheable HTTP request that the browser only fetches when the picker scrolls them into view (the `loading="lazy"` is already applied at `StyleSelector.tsx:204` once the file is referenced as a URL).
- Effort: M

**PRISM-PERF-004 — `mmbg.svg` is 1.9 MB**
- Severity: Blocker
- File:line: `public/mmbg.svg` 1,945,600 bytes
- Evidence: `du -sh public/mmbg.svg` → `1.9M`. SVG that large almost certainly has a base64-embedded raster — no vector should approach 2 MB.
- Why it matters: shipped from `/public` therefore eligible to load from any reference. Even if currently unreferenced, the build copies it to `dist/` and it gets cached by the service worker (see PRISM-PERF-013 — `maximumFileSizeToCacheInBytes: 3 MiB` allows it).
- Fix: open the file, extract the embedded raster, replace with a `<image href>` to a separate WebP. If unreferenced, delete it (`grep -r mmbg.svg src/ public/`).
- Effort: S

**PRISM-PERF-005 — `herobackground.png` (2.4 MB) and `caption.png` (2.2 MB) are bundled despite WebP variants existing**
- Severity: Blocker
- File:line: `public/herobackground.png` 2,457,856 B, `public/caption.png` 2,256,896 B; WebP fallbacks already in place at `src/pages/Landing.module.css:8-21`
- Evidence: `du -sh public/{herobackground,caption}.png` and `Landing.module.css` uses `image-set()` to prefer WebP. Good. But the PNG fallbacks are the worst-case browsers (Safari < 14, IE) — those PNGs should still be optimized (current files are unoptimized export defaults). 2.4 MB PNG fallback is a punitive penalty for older Safari/iPad users.
- Why it matters: PWA precache config at `vite.config.ts:59` includes `**/*.{js,css,ico,png,webp,svg,woff2}` — these PNG fallbacks are precached on first install along with the WebP. Service worker installation cost balloons.
- Fix: re-export both PNGs at 80% quality with palette quantization (target < 200 KB each — `pngquant --quality 60-80 --speed 1`). Alternatively, drop the PNG fallback entirely — `image-set()` falls back to the bare `background-image: url(/herobackground.webp)` declaration on line 8 for any browser that doesn't grok `image-set()`, and Safari has supported WebP since 14 (2020). The `image-set()` PNG fallback is dead weight in 2026.
- Effort: S

---

### Performance — Critical

**PRISM-PERF-006 — `UserDrawer-*.js` chunk is 394 KB (largest non-vendor chunk in the build)**
- Severity: Critical
- File:line: `dist/assets/UserDrawer-BaSXGJ9w.js` 394,294 B
- Evidence: `ls -la dist/assets | sort -k5 -n -r | head -5` ranks UserDrawer above every vendor chunk except the vendor index. A user-profile drawer should not be 4× the size of the React vendor chunk (157 KB).
- Why it matters: this chunk is loaded on `/dashboard-new` because the topbar avatar button mounts the drawer. The user pays the full 394 KB before the dashboard becomes interactive. Likely root cause: the drawer transitively imports the style-preview PNGs (PRISM-PERF-003) via a shared dropdown or preview component.
- Fix: run `npx vite-bundle-visualizer` to confirm the import graph; the most likely culprits are (a) inline asset imports from `src/assets/styles`, (b) full lucide-react named-import expansion (133 separate import sites — see PRISM-PERF-008), (c) `embla-carousel-react` or `recharts` accidentally pulled in. Once identified, dynamic-import the heavy descendants.
- Effort: M

**PRISM-PERF-007 — Landing page CSS chunk is 208 KB (uncompressed)**
- Severity: Critical
- File:line: `dist/assets/index-ImWQ-vlI.css` 211,737 B
- Evidence: this is the global Tailwind output. Tailwind's `content` glob in `tailwind.config.ts` should restrict generated classes to those actually used. 208 KB of CSS for a landing page suggests either (a) JIT is generating classes for admin/editor surfaces and shipping them to `/`, (b) `safelist` is too permissive, or (c) the compiled stylesheet bundles `tailwind-merge` artifacts.
- Why it matters: 208 KB CSS on the critical path. Even brotli'd to ~30 KB, that's another RTT before LCP can paint a styled hero.
- Fix: split per-route CSS by code-splitting CSS in `vite.config.ts`'s `rollupOptions.output` with `assetFileNames` per chunk; or audit `tailwind.config.ts` `content` and remove glob entries that scan unused directories. Run `purgecss --css dist/assets/index-*.css --content "dist/**/*.html" "dist/**/*.js"` to measure dead-class weight.
- Effort: M

**PRISM-PERF-008 — `lucide-react` imported at 133 separate sites — verified no namespace imports, but dev cold-start cost remains**
- Severity: ~~Critical~~ → **Major** (downgraded after verification)
- File:line: 133 `lucide-react` import lines across `src/`. Example: `src/components/admin/AdminFlags.tsx:10` imports 9 icons in a single statement.
- Evidence: `grep -rn "lucide-react" src/ | wc -l` → 133. Verified zero namespace imports (`grep "import \* as.*lucide"` → 0). Production tree-shaking is therefore fine. Remaining concern is dev cold-start: without `optimizeDeps.include`, Vite enumerates each icon as a separate request on first dev boot.
- Fix: add `optimizeDeps.include: ["lucide-react"]` in `vite.config.ts` for dev cold-start. Optional: consolidate to a single `src/lib/icons.ts` re-export so the import surface is auditable as the app grows. Add an `eslint-plugin-import/no-namespace` rule scoped to `lucide-react` to prevent regression.
- Effort: XS

**PRISM-PERF-009 — `framer-motion` is loaded on the landing page and shipped to first-paint**
- Severity: Critical
- File:line: `src/pages/Landing.tsx:2`, plus 8 other `src/components/landing/*` files use `framer-motion`. `vite.config.ts:122-123` puts framer-motion in the `ui-vendor` chunk: `"ui-vendor": ["framer-motion", "@tanstack/react-query"]` → built as `ui-vendor-B643l93p.js` 168,611 B.
- Evidence: every landing surface uses `motion.div` for fade-in animations. A 168 KB vendor chunk dedicated to scroll-reveal animations is a heavy tax on a marketing page that could use plain CSS.
- Why it matters: framer-motion is the right tool for the editor and intake form (where gestures + complex orchestration justify it) but is overkill for "fade in on viewport". The landing page costs every visitor ~50 KB (gzipped) for animations that `@keyframes fadeIn` would solve in 200 bytes.
- Fix: split the vendor chunk so framer-motion only ships with authenticated routes. Replace landing animations with CSS `@keyframes` + `IntersectionObserver` (5-line helper). Move `framer-motion` out of the `ui-vendor` manualChunk and into a lazy-loaded chunk that only the editor/intake import. `vite.config.ts:122-123` becomes `"ui-vendor": ["@tanstack/react-query"]` and a separate `"animation"` chunk gates framer.
- Effort: M

**PRISM-PERF-010 — Dashboard fan-out: 4 components each issue independent useQuery calls on first paint, plus 60s/10s polling**
- Severity: Critical
- File:line: `src/components/dashboard/DashboardLayout.tsx` mounts `Hero` (`Hero.tsx:107`), `ProjectsGallery` (`ProjectsGallery.tsx:74`), `RightRail` (`RightRail.tsx:174, 189, 204, 220, 239`) — that's **9 useQuery calls** before paint, plus `GenerationQueueStatus.tsx:66` polls every 10 s and `useSubscription.ts:190` polls every 60 s.
- Evidence: counted `useQuery` instances in `src/components/dashboard/`. Each useQuery is a separate Supabase round-trip on cold load. No `Suspense` boundary, no parallel preloading.
- Why it matters: dashboard LCP is gated by the slowest of those 9 queries because each component renders a skeleton until its own query resolves, causing layout instability. Each Supabase call is 80-200 ms cold. The 10-second `refetchInterval` on GenerationQueueStatus continues even with the tab backgrounded (no `refetchIntervalInBackground: false` set there — the editor's `useEditorState.ts:210` does it correctly; this one doesn't).
- Estimated INP impact: dashboard interactive latency 800-1500 ms cold; CLS likely 0.15-0.25 from skeleton-to-content swaps in 4 quadrants.
- Fix: (a) consolidate to one `useQueries([...])` hook in `DashboardLayout.tsx` so all dashboard reads go in parallel and React batches the suspending renders; (b) add `refetchIntervalInBackground: false` to `GenerationQueueStatus.tsx:66`; (c) wrap Hero/RightRail in a single `<Suspense>` so the page doesn't flash skeleton-content-skeleton; (d) consider a Supabase RPC `dashboard_init()` that returns profile + projects + queue + credits in one query.
- Effort: L

**PRISM-PERF-011 — IntakeForm.tsx is 1,571 lines in a single chunk; no internal step-splitting**
- Severity: Critical
- File:line: `src/components/intake/IntakeForm.tsx` 1,571 lines
- Evidence: `wc -l src/components/intake/IntakeForm.tsx`. `dist/assets/CreateNew-aXmOPhtl.js` is 78 KB — modest, but that file pulls in StyleSelector + SmartFlowStyleSelector which transitively pull the 17 PNGs (PRISM-PERF-003).
- Why it matters: a multi-step intake should lazy-load each step's heavy components (style picker, voice picker, length picker). Currently every user pays for the entire wizard upfront, including steps they may never reach.
- Fix: split each step into a lazy-loaded component using `React.lazy()` and `<Suspense>`. The style-picker step is the heaviest — that alone justifies the change.
- Effort: M

---

### Performance — Major

**PRISM-PERF-012 — No Web Vitals reporting / no field RUM**
- Severity: Major
- File:line: searched `src/` for `web-vitals`, `onCLS`, `onLCP`, `onINP` — zero results.
- Evidence: Sentry browser tracing IS enabled (`src/lib/sentry.ts:71-78` — `Sentry.browserTracingIntegration()` with `tracesSampleRate: 0.1` in prod). That captures route-change spans and basic Web Vitals via Sentry's auto-instrumentation, but Sentry's vitals coverage on mobile is partial (LCP yes, CLS yes, INP partial — Sentry only added INP via `web-vitals` in late 2024 and the integration depends on the SDK auto-instrumenting it). No explicit `web-vitals` import means INP and Long Animation Frames are not first-class.
- Why it matters: Lighthouse lab data (`lighthouserc.cjs`) measures admin only. Sentry catches LCP/CLS but the team should confirm INP visibility in the Sentry UI before relying on it as the sole RUM source. CWV is a Google ranking factor since 2021, field-data-only via CrUX.
- Fix: confirm Sentry Performance dashboard is showing INP for `/`. If gaps exist, install `web-vitals` (1 KB) and wire `onINP` explicitly to a Sentry custom metric (`Sentry.metrics.distribution('web-vitals.inp', metric.value)`). Also wire to `useAnalytics` at `src/hooks/useAnalytics.ts` so PostHog (if used) gets it.
- Effort: S

**PRISM-PERF-013 — PWA precache size limit (3 MiB) is permissive enough that mmbg.svg + herobackground.png each blow part of the cache**
- Severity: Major
- File:line: `vite.config.ts:58` `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024`
- Evidence: with the unoptimized assets (PRISM-PERF-001/004/005), the PWA installs ~9 MB of precache on first visit. iOS Safari's quota for PWAs is small and uncertain; cache eviction is silent.
- Fix: drop the limit to 512 KiB. Then any oversized asset will fail the build and force the team to optimize (good forcing function). Re-evaluate after PRISM-PERF-001/004/005 are fixed.
- Effort: XS

**PRISM-PERF-014 — Lighthouse CI gate covers only `/admin`**
- Severity: Major
- File:line: `lighthouserc.cjs:30` lists only `/admin?tab=overview`
- Evidence: explicit single-URL `url:` array. The customer-facing `/`, `/dashboard-new`, `/app/create/new`, `/app/editor/:id` have no perf gate. Admin is a low-traffic surface; the gate is misallocated.
- Why it matters: a perf regression on `/` ships to production with zero automated friction. The first signal will be a CrUX score drop (28-day lag) or a customer support ticket.
- Fix: extend the URL list to include `/`, `/auth`, `/pricing`, `/dashboard-new` (with a logged-in Puppeteer login script), `/app/create/new`. Set gates: Performance ≥ 85, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 300 ms, with mobile-emulation throttling (currently only desktop is tested).
- Effort: M

**PRISM-PERF-015 — `sheet-*.js` chunk is 100 KB**
- Severity: Major
- File:line: `dist/assets/sheet-B0smX7e_.js` 102,340 B. Sheet is a Radix UI dialog primitive — its core (radix-dialog + variants) should be ~15-25 KB.
- Why it matters: a 100 KB chunk for a single Radix primitive suggests it's pulling in unrelated transitive imports (likely the lucide icon barrel via a shared component).
- Fix: visualize with `npx vite-bundle-visualizer`, identify the unintended import, and barrel-bust it.
- Effort: S

**PRISM-PERF-016 — Editor active-jobs query polls every 3 s on top of realtime subscription**
- Severity: Major
- File:line: `src/components/editor/useActiveJobs.ts:65` `refetchInterval: 3000, // belt-and-suspenders on top of realtime`
- Evidence: comment is honest. With realtime working, this is wasted bandwidth and CPU. With realtime broken, this is the only signal — but the right fix is to fix realtime, not poll.
- Why it matters: 3-second polling fires 20 requests/min from every editor tab. A user with 3 tabs open during a render is ~60 RPM/user against Supabase. Adds main-thread JSON parse + React re-render every 3 s — measurable INP regression on lower-end Android.
- Fix: drop `refetchInterval` once realtime is verified stable, or back it off to 30 s and rely on realtime invalidations for the in-window updates. Add `refetchIntervalInBackground: false` regardless.
- Effort: XS

**PRISM-PERF-017 — Dashboard chrome (Sidebar 659 LOC + RightRail 540 LOC + Hero 373 LOC + ProjectsGallery 396 LOC) renders without `React.memo` or `useMemo` — 0 memoization hits in Sidebar**
- Severity: Major
- File:line: `grep -c "useMemo\|useCallback\|memo(" src/components/dashboard/DashboardLayout.tsx` → 0 (the file is 29 LOC, but it transitively renders 1,968 LOC of children with only 12 memoization sites total across the whole `src/components/dashboard/` directory).
- Evidence: `grep -rn "useMemo\|useCallback\|memo(" src/components/dashboard | wc -l` → 12 across 11 files
- Why it matters: every state change in any of the 9 useQuery calls (PRISM-PERF-010) triggers a tree re-render. The `ProjectsGallery` uses `<img>` inside a list — React diffing is fine, but transient style + className recomputations on every Sidebar nav state change re-render thumbnails. Combined with TanStack Query's default `refetchOnMount: true` + the renewal modal mounted at App root, the dashboard re-renders ~6-10 times during cold load.
- Fix: profile with React DevTools Profiler, then `React.memo` the static rail sub-cards (Credits card, Weekly stats card) — they have stable props once their queries resolve. Use `useMemo` for the projects array transform in `ProjectsGallery.tsx:74` (sort + filter currently appears inline).
- Effort: M

**PRISM-PERF-018 — `console.log` statements ship to production from the landing page mobile menu**
- Severity: Major
- File:line: `src/pages/Landing.tsx:176, 187, 189, 195` (4 `console.log`/`console.warn` calls in the mobile-nav handler)
- Evidence: `grep -n "console\." src/pages/Landing.tsx` → 4 hits. `vite.config.ts` has no `terserOptions.compress.drop_console`.
- Why it matters: every mobile-menu interaction prints to the console, which is non-trivial cost on mobile Safari (DevTools attached or not — Safari serializes the args). 30 console statements project-wide (`grep -c console src/...` → 30) collectively add measurable INP debt.
- Fix: add `esbuild: { drop: ["console", "debugger"] }` to `vite.config.ts` for production mode. Or use the existing `createScopedLogger` (`src/lib/logger.ts` referenced in `App.tsx:1`) which presumably no-ops in production.
- Effort: XS

**PRISM-PERF-019 — Two giant globally-mounted modals (`SubscriptionRenewalModal`, `V2AnnouncementModal`) load on every authenticated surface**
- Severity: Major
- File:line: `src/App.tsx:11-12, 97, 101`
- Evidence: both modals are imported eagerly (not via `lazy()`) and mounted inside the global `<Suspense>` boundary. They run their own queries on every page load.
- Why it matters: a renewal modal that renders 1% of the time should not be on every cold page-paint critical path. It blocks neither, but adds parse + state-init cost and competes with main-thread work during hydration.
- Fix: lazy-import both. They're modal — they don't need to be in the initial chunk. `const SubscriptionRenewalModal = lazy(() => import("./components/workspace/SubscriptionRenewalModal"))` and let Suspense handle the initial null render.
- Effort: XS

**PRISM-PERF-020 — Recharts loads 4 separate chart families across admin tabs simultaneously**
- Severity: Major
- File:line: `src/components/admin/AdminGenerations.tsx:13` (BarChart + PieChart), `AdminPerformanceMetrics.tsx:7` (BarChart + LineChart), `AdminRevenue.tsx:9` (AreaChart + BarChart), `AdminWorkerHealth.tsx:17` (AreaChart)
- Evidence: `vite.config.ts:124-130` correctly excludes recharts from manualChunks so it ships only with admin chunks (good). But recharts is ~120 KB gzipped, and admin loads multiple chart types simultaneously when more than one of these tabs has been visited.
- Why it matters: admin LCP is gated by recharts download on first admin visit. The lighthouserc gate at `/admin?tab=overview` may pass because Overview is not chart-heavy; the first chart-tab click pays the unmeasured cost.
- Fix: lazy-load each chart-heavy admin tab body so recharts is requested only on tab activation. Keep the chart components in their own file and `lazy()` import them from the tab wrapper.
- Effort: M

**PRISM-PERF-021 — `marketing/dist/` and `marketing-dist/` both contain unoptimized 2.4 MB hero PNGs (duplicate output)**
- Severity: Major
- File:line: `marketing/dist/herobackground.png` + `marketing-dist/herobackground.png` (both shipped via `scripts/merge-dist.mjs` — referenced in `package.json:10-11`)
- Evidence: `find marketing-dist marketing/dist -type f` shows both directories carry full asset duplicates. The merge step at build copies into `dist/`. Whichever directory wins, the giant PNGs land in the deployed artifact.
- Why it matters: same problem as PRISM-PERF-005, doubled. CDN cache miss on the marketing path costs the same MBs.
- Fix: delete one of the two `marketing-dist` / `marketing/dist` paths after confirming which is used; ensure the surviving one carries only the optimized (WebP-only) assets.
- Effort: S

**PRISM-PERF-022 — Verified OK: `vercel.json` correctly sets `Cache-Control: immutable` for `/assets/*` and `*.css`**
- Severity: ~~Major~~ → **Resolved (no action)**
- File:line: `vercel.json:84-99`
- Evidence: `vercel.json` ships `Cache-Control: public, max-age=31536000, immutable` on `/assets/(.*)` and `/(.*)\\.css`; `no-cache` on `/index.html`, `/app-shell.html`, `/sw.js`. This is correct.
- Note retained for completeness; not a finding.

---

### Performance — Minor

**PRISM-PERF-023 — `dashboard-bg-light.png` 88 KB and `dashboard-bg-dark.png` 40 KB shipped as PNG**
- Severity: Minor
- File:line: `src/assets/dashboard/dashboard-bg-{dark,light}.png`
- Fix: convert to WebP (target < 20 KB combined). Use a `<picture>` with `prefers-color-scheme` or theme-class swap.
- Effort: XS

**PRISM-PERF-024 — `default-thumbnail.png` 20 KB used for empty state**
- Severity: Minor
- File:line: `src/assets/dashboard/default-thumbnail.png` referenced at `src/components/projects/ProjectsGridView.tsx:14`
- Fix: replace with an inline SVG placeholder (~500 B) — also avoids LCP candidate confusion when many empty cards render.
- Effort: XS

**PRISM-PERF-025 — Hero animation uses `framer-motion` for what is effectively `opacity 0 → 1 + translateY 20px → 0`**
- Severity: Minor
- File:line: `src/pages/Landing.tsx:228-232, 311-315`
- Why it matters: feeds PRISM-PERF-009. The animations don't need framer-motion's gesture/orchestration; they're trivial CSS.
- Fix: replace with CSS `@keyframes` + `animation-play-state: paused` + `IntersectionObserver` toggle. Removes ~50 KB gzipped from the landing critical path.
- Effort: S

**PRISM-PERF-026 — Hero section uses fixed `min-h-screen` which on mobile triggers viewport shifts when the URL bar collapses**
- Severity: Minor
- File:line: `src/pages/Landing.tsx:220` `min-h-[85vh] sm:min-h-screen`
- Why it matters: `100vh` includes the URL bar height on iOS; when the user scrolls and the bar collapses, the hero resizes — CLS event. Brief mentions iOS readiness should use `100dvh`.
- Fix: replace `min-h-screen` with `min-h-[100dvh]` (Tailwind v3.4+ supports `min-h-dvh`).
- Effort: XS

**PRISM-PERF-027 — `<img src="/motion.png">` used as hero logo** (`Landing.tsx:235`) **is 192 KB PNG**
- Severity: Minor
- File:line: `public/motion.png` 192 KB; `Landing.tsx:235`
- Fix: convert to WebP (~12 KB target) or to an inline SVG (logo is brand-mark, vector-friendly).
- Effort: XS

**PRISM-PERF-028 — Dashboard polling (`GenerationQueueStatus.tsx:66`) fires when no jobs are active**
- Severity: Minor
- File:line: `src/components/dashboard/GenerationQueueStatus.tsx:66`
- Evidence: 10 s interval is unconditional. `useEditorState.ts:192` correctly uses a function form `refetchInterval: (query) => …` to short-circuit when nothing is active.
- Fix: convert to function form: `refetchInterval: (q) => (q.state.data?.length ? 10_000 : false)`.
- Effort: XS

---

### Performance — Polish

**PRISM-PERF-029 — `<head>` lacks `<link rel="dns-prefetch">` for the Supabase project domain**
- Severity: Polish
- File:line: `index.html:124-128` preconnects only to Google Fonts, not to `*.supabase.co`
- Why it matters: the first authenticated query waits a full DNS + TLS handshake. A dns-prefetch saves ~80-200 ms on the first dashboard query.
- Fix: add `<link rel="preconnect" href="https://<project>.supabase.co" crossorigin>` (use the actual project subdomain, build-injected from env).
- Effort: XS

**PRISM-PERF-030 — `react-helmet-async` used for SEO head management is heavier than necessary**
- Severity: Polish
- File:line: `package.json:67` `react-helmet-async ^3.0.0`; used in `src/components/landing/SeoHead`
- Why it matters: Vite has native head injection via `vite-plugin-html` or React 19's built-in `<title>` / `<meta>` element rendering. The project is on React 18.3, so this is a future improvement.
- Fix: when the React 19 upgrade lands, drop `react-helmet-async` in favor of native head elements. Saves ~12 KB gzipped.
- Effort: M (defer to React 19 upgrade)

---

## Production Blockers

| ID | Severity | One-liner |
|----|----------|-----------|
| PRISM-PERF-001 | Blocker | Favicon/OG/touch-icon assets are 736 KB each (target < 20 KB). |
| PRISM-PERF-002 | Blocker | 15+ Google Fonts loaded as render-blocking stylesheet on `/`. |
| PRISM-PERF-003 | Blocker | cardboard-preview.png is 1.8 MB; all 17 style PNGs statically imported. |
| PRISM-PERF-004 | Blocker | mmbg.svg is 1.9 MB (almost certainly an embedded raster). |
| PRISM-PERF-005 | Blocker | herobackground.png and caption.png are 2.4 MB / 2.2 MB unoptimized PNG fallbacks. |

These five together are the bulk of the §5 risk. Fixing them moves landing LCP from an estimated 4-6 s on mobile 4G to a credible 1.8-2.3 s.

---

## Top 10 Priority Fixes

| Rank | ID | Estimated impact | Effort |
|------|----|------------------|--------|
| 1 | PRISM-PERF-001 | -400 to -700 ms LCP on every page | S |
| 2 | PRISM-PERF-002 | -350 to -600 ms LCP on landing | M |
| 3 | PRISM-PERF-003 | -3.0 MB cumulative, -400-1200 ms INP on intake | M |
| 4 | PRISM-PERF-004 | -1.9 MB precache + correctness fix | S |
| 5 | PRISM-PERF-005 | -4.5 MB on PWA install; iPad/old-Safari relief | S |
| 6 | PRISM-PERF-006 | -394 KB JS on dashboard cold load | M |
| 7 | PRISM-PERF-009 | -50 KB gz on landing; landing INP | M |
| 8 | PRISM-PERF-010 | -800-1500 ms dashboard LCP, lower CLS | L |
| 9 | PRISM-PERF-014 | Closes the regression-detection gap on consumer routes | M |
| 10 | PRISM-PERF-012 | Enables field RUM (rest is invisible without it) | S |

---

## Items I was unable to verify from static analysis (flagged for follow-up, not findings)

- Real LCP/CLS/INP field values for `/` and `/dashboard-new` (no RUM, no Lighthouse run available in-window). All Web Vitals numbers in this report are estimates.
- Whether `vercel.json` sets `Cache-Control: immutable` for hashed assets (PRISM-PERF-022) — the file was not read in this audit window.
- Whether `src/main.tsx` enables Sentry `BrowserTracing` — file not read.
- Whether the `marketing/` Astro site has its own image optimization pipeline that supersedes the `public/*.png` issues for the marketing domain specifically.
- Brotli/gzip on Vercel edge (typically auto, but not verified).
- Actual lucide namespace-import scan beyond a single grep — recommend `eslint-plugin-import` rule `no-namespace` to prevent regressions.

These are gaps in this audit, not findings against the project.
