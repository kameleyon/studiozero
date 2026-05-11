# QA Checklist — Core Web Vitals

**Owner:** Prism (frontend perf engineer)
**Audited by:** Optic (UX/UI audit), Halo (when contrast or motion is involved)
**Applies to:** every web vertical (web-app, saas, marketing-site, blog, pwa)

## Targets (audience-relative)

| Metric | Good | Needs improvement | Poor | Notes |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5–4.0s | > 4.0s | Mobile 3G baseline. Marketing site: ≤ 1.5s. |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 | Marketing site: 0. Blog: 0. |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200–500ms | > 500ms | SaaS dashboards must hit ≤ 200ms even on data-heavy views. |
| **TTFB** (Time to First Byte) | ≤ 800ms | 800–1800ms | > 1800ms | Vercel Edge / Cloudflare Workers: ≤ 200ms achievable. |
| **FCP** (First Contentful Paint) | ≤ 1.8s | 1.8–3.0s | > 3.0s | |

## Lighthouse gate (CI)
- **Performance score:** ≥ 90 on mobile, ≥ 95 on desktop. Fail the build below threshold.
- **Best Practices score:** ≥ 95.
- Run via `lhci autorun` per `.github-templates/lighthouse-gate.yml` (in this repo).

## Manual checks
- [ ] **LCP element identified** — what is it? Hero image, hero headline, or hero video. Anything else is a finding.
- [ ] **LCP element preloaded** with `<link rel="preload">` if it's an image/font.
- [ ] **No layout shift from images** — every `<img>` has `width` + `height` attributes (or aspect-ratio CSS).
- [ ] **No layout shift from fonts** — `font-display: swap` AND a fallback metric-matched to the web font (size-adjust, ascent-override).
- [ ] **No layout shift from injected content** — ads, banners, third-party widgets respect reserved space.
- [ ] **Long tasks profiled** — main thread free of > 50ms tasks during user interaction; any longer task is broken up via `scheduler.yield()` or `startTransition()`.
- [ ] **Bundle size budget** — initial JS ≤ 200KB per route, CSS ≤ 50KB. Enforced in vite.config.ts via `manualChunks`.
- [ ] **Third-party scripts audited** — every external script (analytics, chat, maps) has known cost; non-critical scripts loaded with `defer` or via Partytown/Web Worker.
- [ ] **Image formats optimized** — WebP/AVIF where supported; no PNG > 100KB except for transparent UI assets.
- [ ] **Lazy loading** — every below-the-fold image has `loading="lazy"`.
- [ ] **Service worker (PWA)** doesn't break LCP — caches assets, never blocks first paint.

## Field data (Real User Monitoring)
- [ ] **CrUX or RUM enabled** — lab data ≠ field data. PostHog Web Vitals or Vercel Speed Insights.
- [ ] **p75 metrics tracked** — Google's CrUX uses p75 for ranking signals, so we mirror it.
- [ ] **Regression alerts** — any 7-day p75 regression > 10% pages on-call (Watch's responsibility).

## Per-vertical exceptions
- **Marketing site:** LCP target tightens to ≤ 1.5s, CLS = 0 strictly. Performance score ≥ 95 mobile.
- **Blog:** Same as marketing site.
- **SaaS dashboard:** INP is the priority metric — interactive views > content-heavy views.
- **PWA:** Service worker caching can mask LCP issues — measure with cache disabled too.
- **Gaming web:** This checklist doesn't apply directly — see frame budget in `gaming.md` roster.
