# Studio Zero — Web App

Phase 9 M0 scaffold. Next.js 15 + React 19 + App Router + TypeScript 5.
Production-ready posture from day one per BUILD_FLOW Hard Rule §5.

## Stack

- **Framework:** Next.js 15 (App Router, React Server Components, force-static
  for the marketing surface).
- **Runtime:** Node.js 20+ (Vercel default; verified on 24 LTS).
- **Hosting:** Vercel · region `iad1` per ARCH-D2 (Railway runner pool also
  us-east; co-locates RTT to Supabase us-east-1).
- **Design tokens:** sourced from `design/components/_tokens/tokens.css`,
  copied at M0 into `apps/web/styles/tokens.css`. See "Token drift" below.

## Develop

```sh
cd apps/web
npm install --legacy-peer-deps   # React 19 + Next 15 peer deps
npm run dev                      # http://localhost:3000
npm run build                    # production build
npm run typecheck                # tsc --noEmit
npm run lint                     # next lint
```

## Deploy

The repo root carries `vercel.json` that forces Vercel to build from
`apps/web/`. Auto-deploy fires on push to `main`. Production URL:
[studiozero-omega.vercel.app](https://studiozero-omega.vercel.app).

If Vercel doesn't auto-detect the monorepo root, set
**Project Settings → Root Directory → `apps/web`** in the dashboard
(one-time config; vercel.json overrides this anyway).

## AI Act Art. 50 interim disclosure (PRD §11.3)

Two surfaces — both wired:

1. **HTTP header** `X-AI-Generated: studio-zero` — set by
   `next.config.ts` `headers()` on every response. Re-asserted by
   `app/api/health/route.ts` belt-and-braces.
2. **HTML meta tag** `<meta name="ai-generated" content="studio-zero">` —
   set by `app/layout.tsx` `metadata.other` so every page under the root
   layout inherits it.

Both strings are constants in `lib/ai-disclosure.ts`. Integration test
at M0 close: `tests/integration/disclosure-headers.spec.ts` (Verify).

## Token drift

`apps/web/styles/tokens.css` is a **copy** of
`design/components/_tokens/tokens.css`. Canon adds a drift detector at
M1 that fails CI when the two diverge. Today, manually mirror any
token change from the design directory into `apps/web/styles/`.

M1 plan: extract `packages/ui` with shared design system; both copies
become stale and get deleted in favour of the package import.

## Routes

| Route               | Status at M0 | Owner           | Ships at         |
| ------------------- | ------------ | --------------- | ---------------- |
| `/`                 | Live         | Forge + Pixel   | M0 (this scaffold)|
| `/api/health`       | Live         | Forge           | M0               |
| `/accessibility`    | Stub         | Halo + Comply   | M4 (full text)   |
| `/privacy`          | Stub         | Comply          | M4               |
| `/terms`            | Stub         | Comply          | M4               |
| `/aup`              | Stub         | Comply          | M4               |
| `/subprocessors`    | Stub         | Comply          | M2               |

All routes 200 OK at M0 — no 404s for surfaces the landing links to,
per BUILD_FLOW Hard Rule §5 (production-ready from day one).

## Structure

```
apps/web/
├── app/
│   ├── layout.tsx            # root layout, metadata, AI-act meta
│   ├── page.tsx              # landing page (Phase 9 M0 keystone)
│   ├── globals.css           # tokens import + body + nav + button + landing
│   ├── accessibility/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   ├── aup/page.tsx
│   ├── subprocessors/page.tsx
│   └── api/health/route.ts
├── components/
│   ├── Button.tsx            # ported from design/components/button
│   ├── Nav.tsx               # ported from design/components/nav (marketing)
│   └── StubPage.tsx          # shared chrome for deferred routes
├── lib/
│   ├── ai-disclosure.ts      # AI Act Art. 50 constants
│   └── analytics-gate.ts     # Lens spec stub (M2)
├── public/                   # favicon + lockups from brand/logo
├── styles/
│   └── tokens.css            # COPY of design/components/_tokens/tokens.css
├── next.config.ts
├── tsconfig.json
└── package.json
```

## What's missing on purpose

- **next/font** — not wired at M0. The Geist + Instrument Serif fallback
  stacks in `tokens.css` render legibly; self-hosting lands at M1 so we
  hit the typography target on first paint.
- **Component library extraction** — Button, Nav, StubPage are copied
  from `design/components/`. Shared `packages/ui` lands at M1.
- **Test scaffolding** — Probe ships Playwright + Vitest configs at M0
  via a separate dispatch; Forge consumes.
- **CI workflows** — Pipeline owns `.github/workflows/` per M0
  milestone plan.

## Cross-references

- `PRD.md` §1, §6, §11.3, §14.5, §14.6
- `BUILD_FLOW.md` Phase 9 — Hard Rule §5
- `sprint/milestone-M0.md` — Forge deliverables
- `design/screens/landing/landing.{md,jsx}` — Pixel's source
- `marketing/copy/01-landing-page.md` — Herald's locked copy
- `brand/samples/01-landing-h1.md` — H1 source of truth
- `architecture/decisions.md` ARCH-D2 (Vercel iad1)
