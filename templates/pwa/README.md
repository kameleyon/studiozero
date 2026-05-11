# Studio Zero — PWA Template

Vite + React 19 + Workbox via `vite-plugin-pwa`. Offline-first, installable, mobile-tuned.

## Setup
```bash
npm install
npm run dev
npm run build && npm run preview  # test the production SW
```

## What's wired
- Web App Manifest (theme color, icons, standalone display, scope)
- Service worker registration (autoUpdate strategy)
- Workbox runtime caching: Google Fonts (CacheFirst), API calls (NetworkFirst with 5s timeout)
- Safe-area-inset support for notched devices
- 16px input font-size to prevent iOS zoom on focus
- Online/offline detection

## Required public assets (replace placeholders)
- `public/favicon.svg`
- `public/apple-touch-icon.png` (180×180)
- `public/pwa-192x192.png`
- `public/pwa-512x512.png` (also used as maskable)
- `public/robots.txt`

## Lighthouse PWA audit
Run after `npm run build && npm run preview`:
- Should hit 100 on PWA category
- Manifest: complete
- Service worker: registered, controlling navigation
- HTTPS: required for production install (localhost is exempt)
