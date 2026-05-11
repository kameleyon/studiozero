# SaaS Infrastructure Pack

Composable building blocks used by `templates/saas/` and copyable into any SaaS project. Each subdirectory is independent — pick what you need.

## Contents

| Directory | Purpose |
|---|---|
| `tenants/` | Multi-tenant Postgres schema with RLS — single-DB, tenant_id-scoped (Option A — default per ROADMAP) |
| `stripe/` | Checkout sessions, customer portal, webhook handling |
| `auth/` | Email/pw, magic link, OAuth flows (Supabase) |
| `gdpr/` | Cookie banner, data export, account deletion |
| `email/` | Resend client + transactional email templates |

## How to use
Each piece is a TypeScript snippet or SQL migration designed to drop into a Next.js / SvelteKit / Astro project. Adjust paths to your project layout.

## Tenant isolation model
**Option A: single-DB, tenant_id-scoped, RLS-enforced.** This is the documented studio default (per `ROADMAP.md`). For most B2B SaaS, this is the right balance of cost, ops simplicity, and isolation. Revisit at the first enterprise contract that demands schema-per-tenant or DB-per-tenant.
