# Vercel — Environment Variable Inventory

**Owner:** Terra (this doc) — each variable has a **provider-agent** named below.
**Targets:** `production` (master → `studiozero.dev`) and `preview` (PR branches → `*.vercel.app`). Develop locally with a `.env.local` (gitignored) shaped after this table.
**Storage:** Vercel dashboard → Project → Settings → Environment Variables. Marked `Sensitive` for every secret (rotates encryption key but doesn't display value after save). Same names in CI (GitHub Actions secrets) for parity.
**Rotation cadence (default):** 90 days for platform-owned signing material (Cipher Fix-4 lock); customer-controlled keys (BYOK) rotate at customer pace.

> **Surface tag legend.** `web` = consumed by Next.js app (Vercel Functions + Server Components + middleware). `runner` = consumed by Railway runner pool (different vendor, listed for inventory only — actual config lives in `railway/project.md`). `edge-fn` = consumed by Supabase Edge Functions (different store — listed for inventory parity; actual config in Supabase function secrets, not Vercel env). The Vercel env-var store carries `web` variables ONLY.

## Production env-vars (Vercel store)

| Name                            | Surface                    | Sensitive                           | Provider-agent                              | M0/M1/M2 activation | Notes                                                                                                                                                                                                                                          |
| ------------------------------- | -------------------------- | ----------------------------------- | ------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | web                        | NO (public-safe)                    | **Terra** (from Supabase project bootstrap) | M0 wk-1             | Public-readable; appears in browser bundle. Format: `https://<project-ref>.supabase.co`                                                                                                                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web                        | NO (public-safe)                    | **Terra** (from Supabase project bootstrap) | M0 wk-1             | RLS-enforced; safe to ship to browser. JWT (anon role).                                                                                                                                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | web (server-side ONLY)     | YES                                 | **Terra** (from Supabase project bootstrap) | M0 wk-2             | **NEVER prefix with `NEXT_PUBLIC_`.** Server-side Next.js API routes only. Bypasses RLS. Used by job-dispatcher code that calls `mint-runner-token` Edge Fn per ARCH-D3.                                                                       |
| `ANTHROPIC_API_KEY` (Managed)   | runner (NOT web)           | YES                                 | **Cortex** (selects + procures)             | M2 wk-9             | **NOT a Vercel env-var at M0.** Listed here for surface inventory only. Lives in Supabase Vault, decrypted by runner via `vault.decrypt_byok()` per Cipher Fix-1. Web has no path that calls Anthropic per ARCH-D7.                            |
| `STRIPE_PUBLISHABLE_KEY`        | web                        | NO (public-safe by Stripe design)   | **Ledger**                                  | M2 wk-9             | Browser-bundled. Format: `pk_live_*` / `pk_test_*`.                                                                                                                                                                                            |
| `STRIPE_SECRET_KEY`             | web (server-side ONLY)     | YES                                 | **Ledger**                                  | M2 wk-9             | Server-side Next.js API routes (checkout-session create, etc.). Format: `sk_live_*` / `sk_test_*`. **Restricted key preferred** — read+write subscriptions + customers only (Cipher Fix-4 cross-link).                                         |
| `STRIPE_WEBHOOK_SECRET`         | edge-fn (NOT web)          | YES                                 | **Ledger**                                  | M2 wk-9             | **NOT a Vercel env-var.** Supabase Edge Function `stripe-webhook` secret per ARCH-D7. Listed for inventory parity.                                                                                                                             |
| `GITHUB_APP_ID`                 | web (server-side) + runner | NO (public-ish; obscure not secret) | **Forge**                                   | M1 wk-3             | GitHub App "ID" from App config.                                                                                                                                                                                                               |
| `GITHUB_APP_CLIENT_ID`          | web (server-side)          | NO                                  | **Forge**                                   | M1 wk-3             | OAuth client ID.                                                                                                                                                                                                                               |
| `GITHUB_APP_CLIENT_SECRET`      | web (server-side ONLY)     | YES                                 | **Forge**                                   | M1 wk-3             | OAuth client secret.                                                                                                                                                                                                                           |
| `GITHUB_APP_PRIVATE_KEY`        | web (server-side) + runner | YES                                 | **Forge**                                   | M1 wk-3             | RSA private key (PEM). Used to mint per-installation JWT. Multi-line; paste into Vercel as the full PEM.                                                                                                                                       |
| `GITHUB_APP_WEBHOOK_SECRET`     | edge-fn (NOT web)          | YES                                 | **Forge**                                   | M1 wk-3             | **NOT a Vercel env-var.** Edge Function `github-webhook` secret.                                                                                                                                                                               |
| `NEXT_PUBLIC_SENTRY_DSN`        | web                        | NO (public-safe by Sentry design)   | **Watch**                                   | M0 wk-1             | Browser + server. Format: `https://<hash>@<org>.ingest.sentry.io/<project>`.                                                                                                                                                                   |
| `SENTRY_AUTH_TOKEN`             | web (build-time ONLY)      | YES                                 | **Watch**                                   | M0 wk-1             | Sourcemap upload only. Not runtime.                                                                                                                                                                                                            |
| `SENTRY_ORG`                    | web (build-time)           | NO                                  | **Watch**                                   | M0 wk-1             | Sentry org slug.                                                                                                                                                                                                                               |
| `SENTRY_PROJECT`                | web (build-time)           | NO                                  | **Watch**                                   | M0 wk-1             | Sentry project slug = `studio-zero`.                                                                                                                                                                                                           |
| `NEXT_PUBLIC_POSTHOG_KEY`       | web                        | NO (public-safe by PostHog design)  | **Lens**                                    | M0 wk-1             | Browser. **Consent-gated init** per Lens spec — PostHog SDK NOT initialized until cookie consent granted.                                                                                                                                      |
| `NEXT_PUBLIC_POSTHOG_HOST`      | web                        | NO                                  | **Lens**                                    | M0 wk-1             | Default `https://us.i.posthog.com` (US cloud per PRD §14.4).                                                                                                                                                                                   |
| `RESEND_API_KEY`                | web (server-side ONLY)     | YES                                 | **Echo** (email lifecycle owner)            | M4 wk-14            | Transactional email (E1–E5).                                                                                                                                                                                                                   |
| `RESEND_FROM_EMAIL`             | web (server-side)          | NO                                  | **Echo**                                    | M4 wk-14            | Defaults to `noreply@studiozero.dev`. SPF/DKIM/DMARC records via Cloudflare (`cloudflare/dns.md`).                                                                                                                                             |
| `JWT_RUNNER_SIGNING_SECRET`     | edge-fn (NOT web)          | YES                                 | **Cipher**                                  | M1 wk-4             | **NOT a Vercel env-var.** Supabase JWT secret used by `mint-runner-token` Edge Fn per ARCH-D3. Lives in Supabase function-secret store. Listed here for cross-surface inventory.                                                               |
| `CLI_PAIRING_HMAC_KEY`          | web (server-side)          | YES                                 | **Cipher**                                  | M3 wk-10            | Pairing-token HMAC. Listed for completeness; M3 activation.                                                                                                                                                                                    |
| `STRIPE_WEBHOOK_SECRET`         | web (server-side ONLY)     | YES                                 | **Ledger**                                  | M2 wk-9             | **Lives in Vercel env at M1 Batch 2** because `/api/webhooks/stripe` is a Vercel route (Forge — ARCH-D7 dual-path). Mirrored to Supabase Edge Fn secrets at M2 if the endpoint moves. Used to verify `Stripe-Signature` HMAC on every webhook. |
| `ANTHROPIC_KEY_MANAGED`         | edge-fn (NOT web)          | YES                                 | **Cortex**                                  | M2 wk-9             | **NOT a Vercel env-var.** Lives in Supabase Edge Fn secrets (`supabase secrets set --env-file`). Read by `llm-gateway` Edge Fn for Managed-mode runs. Listed for inventory.                                                                    |
| `NEXT_PUBLIC_USE_AUTH_MOCK`     | web                        | NO                                  | **Forge**                                   | M1 Batch 2          | Offline-dev escape hatch. `true` → render mock data without Supabase. Production builds MUST leave unset (the build guard warns if set).                                                                                                       |
| `NEXT_PUBLIC_SUPABASE_FN_URL`   | web                        | NO                                  | **Terra**                                   | M1 Batch 2          | Optional override for Edge Function base URL. Defaults to `<SUPABASE_URL>/functions/v1`.                                                                                                                                                       |
| `NEXT_PUBLIC_GITHUB_APP_SLUG`   | web                        | NO                                  | **Forge**                                   | M1 Batch 2          | GitHub App slug for install-link rendering. Default `studio-zero-audit`.                                                                                                                                                                       |
| `NODE_ENV`                      | web                        | NO                                  | (Vercel-managed)                            | M0 wk-1             | `production` on prod target; `preview` or `development` on previews.                                                                                                                                                                           |

## Preview env-vars (Vercel store)

Preview deployments **must** point at a separate Supabase project (staging) so PR builds can't smash production data. Same name table as Production with these deltas:

- `NEXT_PUBLIC_SUPABASE_URL` = staging project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging anon key
- `SUPABASE_SERVICE_ROLE_KEY` = staging service-role key
- `STRIPE_*` = `*_test_*` test-mode keys
- `GITHUB_APP_*` = a separate "Studio Zero (staging)" GitHub App
- `NEXT_PUBLIC_SENTRY_DSN` = same project, different `environment` tag at SDK init
- `NEXT_PUBLIC_POSTHOG_KEY` = same project, separate `feature_flag` namespace (or staging-only project — Lens decides)

> **Staging Supabase project doesn't exist at M0.** Atlas + Terra stand up the staging project at M1 close (when Forge needs a non-prod env to land BYOK flows). M0 PR previews use the production Supabase project read-only — no destructive operations allowed. Pipeline enforces this with a CI gate that fails any preview job that POSTs to `/api/runs` or similar mutating endpoints.

## Local development (`.env.local` — gitignored)

Shape mirrors Production with these deltas:

- `NEXT_PUBLIC_SUPABASE_URL` = local Docker Supabase (via `supabase start`) on `http://127.0.0.1:54321`
- All `STRIPE_*` keys = test mode
- All `GITHUB_APP_*` = a "Studio Zero (dev)" GitHub App pointed at `localhost:3000` redirect URL
- `RESEND_API_KEY` = unset → emails route to `console.log` via dev-mode email transport (Echo wires)

A `.env.example` (committed) lists every required var with empty values and a one-line comment. Vega writes this file at M0 as part of Forge's scaffold deliverable.

## Who provides what (alphabetized by agent)

| Agent              | Variables it provides                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Cipher**         | `JWT_RUNNER_SIGNING_SECRET`, `CLI_PAIRING_HMAC_KEY`                                                                                |
| **Cortex**         | `ANTHROPIC_API_KEY` (Managed-tier shared key)                                                                                      |
| **Echo**           | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                                                                                              |
| **Forge**          | `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET`         |
| **Ledger**         | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                                             |
| **Lens**           | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`                                                                              |
| **Terra**          | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (sourced from Supabase project bootstrap) |
| **Watch**          | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`                                                      |
| **Vercel-managed** | `NODE_ENV`, plus `VERCEL_URL`, `VERCEL_ENV`, etc. (auto-injected)                                                                  |

## Drift-check protocol

Pipeline (or Jo, weekly Mon) runs `vercel env ls --environment production` and `vercel env ls --environment preview`. Diff each list against the tables above. Any variable in dashboard but not in this doc → add it OR remove it from dashboard. Any variable in this doc not in dashboard → fix-it ticket same-day.

## Cross-references

- `architecture/iac/secrets/vault-keys.md` (Supabase Vault inventory for non-Vercel surfaces)
- `architecture/iac/supabase/edge-functions/README.md` (Edge Function secret-store inventory)
- `architecture/decisions.md` ARCH-D7 (Edge Fn vs Vercel route boundary)
- `architecture/iac/observability/sentry.md` + `posthog.md`

---

_Terra · Vercel env-vars · M0 manual-bootstrap notes._
