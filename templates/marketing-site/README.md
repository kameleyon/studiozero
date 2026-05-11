# Studio Zero — Marketing Site Template

Astro 5 + Tailwind 4 + sitemap. Optimized for SEO, LCP, and time-to-launch (1-3 days for most projects).

## Setup
```bash
npm install
npm run dev    # http://localhost:4321
npm run build  # outputs to dist/
```

## Edit checklist
1. `astro.config.mjs` — set `site` to your real domain
2. `src/pages/index.astro` — replace headline, features, FAQ, CTA
3. `public/robots.txt` — update sitemap URL
4. Add `public/og.png` (1200×630) for social sharing
5. Add `public/favicon.svg`

## What this template enforces (per Stage 1.5 marketing-site roster)
- LCP < 1.5s on hero (single section, no JS-heavy hero animation)
- CLS = 0 (explicit dimensions on images, font-display: swap via system fonts)
- WCAG AA color contrast on default palette
- Single primary CTA per surface
- OG image + Twitter card per page

## Audit gate
Run from studio root:
```bash
node audit-run.js my-marketing-site "Pre-launch audit, single CTA: signup, audience: founders" --project-dir <path>
```
