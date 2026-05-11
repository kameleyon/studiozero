# Studio Zero — Blog Template

Astro 5 + MDX + content collections + RSS + sitemap. Static-first, SEO-optimized, type-safe content.

## Setup
```bash
npm install
npm run dev    # http://localhost:4321
npm run build
```

## Add a post
Drop a `.mdx` file into `src/content/blog/`. Frontmatter is type-checked by `src/content.config.ts`:
```mdx
---
title: "Your post title"
description: "One sentence — used in OG, Twitter card, list view, RSS"
pubDate: 2026-05-09
tags: ["category"]
---
Your content...
```

## What this template enforces (per Stage 1.5 blog roster)
- Type-safe frontmatter (Zod schema)
- Auto-generated RSS at `/rss.xml`
- Auto-generated sitemap
- OG + Twitter card per post
- Reading-friendly serif typography (Charter / Iowan Old Style)
- Static-first — zero JS by default; per-post hydration only when needed
