# Studio Zero — Web App Template

React 19 + Vite + Supabase + Tailwind 4 + TanStack Query + Zustand.

## Stack
- **React 19** with strict mode
- **Vite 6** with `@vitejs/plugin-react` and bundle splitting
- **TypeScript** strict (no `any`, no implicit nulls)
- **Tailwind CSS 4** via `@tailwindcss/vite`
- **TanStack Query** for server state
- **Zustand** for client state
- **React Hook Form + Zod** for forms
- **React Router 7**
- **Supabase JS** for auth/data

## Setup
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Conventions (per `protocols/code-standards.md`)
- Files: kebab-case
- Components: PascalCase
- Functions: camelCase
- Max file length: 300 lines

## Auditable
This template is audit-ready. Run from the studio root:
```bash
node audit-run.js my-app "Audit my-app for senior-friendly fintech audience" --project-dir <path-to-this-app>
```
