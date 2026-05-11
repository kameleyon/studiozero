# Studio Zero — SaaS Template

Production-ready multi-tenant SaaS scaffold. Next.js 15 + Supabase + Stripe + Tailwind 4 + Resend.

## What's included
- **Auth-protected routes** via middleware (`middleware.ts`) — public routes whitelisted, everything else requires a session
- **Supabase server client** (`lib/supabase-server.ts`) for Server Components and Server Actions
- **Stripe webhook receiver** (`app/api/stripe/webhook/route.ts`) with signature verification
- **Security headers** in `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- **TanStack Query** for client-side server state
- **Zustand** for client state
- **React Hook Form + Zod** for forms

## Pull from the SaaS infra pack
The `_saas-infra-pack/` at the studio root has composable pieces — copy what you need:
- `_saas-infra-pack/tenants/` — multi-tenant Postgres schema + RLS policies
- `_saas-infra-pack/stripe/` — checkout, customer portal, webhook handlers
- `_saas-infra-pack/auth/` — email/pw, magic link, OAuth flows
- `_saas-infra-pack/gdpr/` — cookie banner, data export, deletion
- `_saas-infra-pack/email/` — Resend templates (welcome, password reset, receipt)

## Setup
```bash
cp .env.example .env
# Fill in Supabase, Stripe, Resend keys
npm install
npm run dev
```

## Audit gate
Before deploy, the audit gate must pass — no `FAIL` verdict. Run from studio root:
```bash
node audit-run.js my-saas "Pre-launch audit" --project-dir <path>
```
CI integration: copy `.github-templates/audit-gate.yml` into your repo's `.github/workflows/`.
