# Studio Zero — Infrastructure as Code

Per-vertical IaC stubs owned by Terra. Drop-in configurations for Vercel, Supabase, and Cloudflare. Each vertical's roster (`teams/<vertical>.md`) cites which of these apply.

| File | Vertical | What it configures |
|---|---|---|
| `vercel/vercel.json` | web-app, saas, marketing-site, blog, pwa, gaming-web, ecommerce, vr | Rewrites, redirects, headers, function regions, build cache |
| `supabase/config.toml` | saas, ecommerce (when DB-backed) | Auth providers, RLS defaults, edge function settings |
| `cloudflare/wrangler.toml` | any with edge workers | KV namespaces, R2 buckets, environment bindings |

These are **starting points**. Terra produces project-specific IaC by reading the project's `state.json` and brief — these stubs are what Terra forks from.
