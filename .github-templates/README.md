# GitHub Actions Templates

Per-vertical CI/CD workflow templates. Copy the relevant file into your project's `.github/workflows/` directory.

## Files

| File | Vertical |
|---|---|
| `web-app.yml` | React + Vite web apps |
| `saas.yml` | Next.js SaaS (build + test + lighthouse) |
| `marketing-site.yml` | Astro marketing sites |
| `blog.yml` | Astro + MDX blogs |
| `pwa.yml` | Vite PWA with Workbox |
| `gaming-web.yml` | Three.js / R3F web games |
| `mobile-cross.yml` | Expo (uses EAS Build for native artifacts) |
| `audit-gate.yml` | **Universal — calls `audit-run.js` and blocks deploy on FAIL verdict** |
| `lighthouse-gate.yml` | Lighthouse CI score gate (drop into web verticals) |

## Conventions
- All workflows pin actions by full SHA (per Verify's supply-chain rules) — replace the placeholder SHA comments with real ones via Renovate / Dependabot
- Secrets referenced via `${{ secrets.NAME }}` — set them in repo / org settings, never inline
- Node version pinned to 24 (per `CAPABILITIES.md`)

## Audit gate is the floor
Per `protocols/code-standards.md`, no production deploy ships without a `PASS` or `PASS WITH FIXES` verdict. `audit-gate.yml` is the enforcement point. Add it to every project, regardless of vertical.
