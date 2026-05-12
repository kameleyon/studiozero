# Sentry — Error Tracking Bootstrap

**Vendor:** Sentry (Team plan, $26/mo · 50k errors + 100k spans + 1 GB attachments)
**Region:** US cloud (sentry.io) — matches PRD §14.4 US-only data residency
**Owner:** Watch (error budgets + alerts) + Terra (project bootstrap) + Forge (SDK wiring) + Cipher (`beforeSend` PII scrub)
**Status at M0:** **STUB** — project created M0 close; runtime SDK wires up at M1 when first synthetic run emits.

> **Sentry kill-switch trigger.** Per `finance/runway.md` §4.1 cut-burn ladder: if cash on hand < $15k at week 11, Sentry Team ($26/mo) drops to free tier (developer-tier error budget). Watch tracks the trigger; the swap is one config change in `apps/web/sentry.client.config.ts`.

## Project identity

| Field                 | Value (placeholder; populated at bootstrap)                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| Org slug              | `studio-zero`                                                                           |
| Project slug (web)    | `studio-zero-web`                                                                       |
| Project slug (runner) | `studio-zero-runner`                                                                    |
| Platform (web)        | `javascript-nextjs`                                                                     |
| Platform (runner)     | `node-express` (Node runtime, but no Express — generic Node SDK)                        |
| DSN (web)             | TBD on bootstrap → wired as `NEXT_PUBLIC_SENTRY_DSN`                                    |
| DSN (runner)          | TBD on bootstrap → wired as Railway env `SENTRY_DSN`                                    |
| Environments tracked  | `production`, `preview`, `development`, `runner-production`                             |
| Release pinning       | Auto via Vercel Git integration + Sentry's `@sentry/nextjs` plugin (release = git SHA)  |
| Source maps           | Uploaded at build time via `SENTRY_AUTH_TOKEN`                                          |
| Data scrubbing        | Default scrubbers ON + custom `beforeSend` per `architecture/threat-model.md` Cipher B5 |

## `beforeSend` PII scrub config (Cipher B5; PRD §13.6)

Every event passes through `beforeSend` before egress. Scrubbed fields (recursive on the event payload):

- Email addresses → `<email-scrubbed>`
- IPv4/IPv6 addresses → `<ip-scrubbed>` (Sentry's default scrubs `request.env.REMOTE_ADDR`; we extend to deep-scan tags/extras)
- Bearer tokens / JWTs in headers + request bodies → `<token-scrubbed>` (regex: `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`)
- Stripe customer IDs (`cus_*`) → `<stripe-customer-scrubbed>` (allowed in PostHog for funnel analysis; never in Sentry)
- Anthropic API keys (`sk-ant-*`) → `<anthropic-key-scrubbed>`
- GitHub App tokens (`ghs_*`, `ghu_*`) → `<github-token-scrubbed>`
- Customer source code (path patterns matching `/var/runs/*/`) → entire content stripped
- `audit_event.payload` source-code fields → stripped if present

Tenant ID is **preserved** in tags (for grouping/filtering) but always as the raw UUID, never alongside email or other identifiers.

`beforeSend` implementation lives in `apps/web/sentry.client.config.ts` + `apps/web/sentry.server.config.ts` (Forge writes at M1, Cipher reviews). Same module imported by the runner.

## Alert rules (Watch owns the rulesets at M4 — placeholder here)

M0 alerts are minimal — just enough to know if production is broken:

| Rule                               | Trigger                                               | Channel                           | Severity              |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------- | --------------------- |
| `production_500_errors`            | > 10 unhandled errors in 5min in `production` env     | Email Jo                          | P1                    |
| `runner_failed_terminal_burst`     | > 5 `failed_terminal` audit-run transitions in 10min  | Email Jo                          | P1                    |
| `byok_validate_failure_rate`       | > 50% failure rate in `byok-validate` Edge Fn over 1h | Email Jo                          | P2                    |
| `stripe_webhook_signature_failure` | Any `STRIPE_SIGNATURE_INVALID` error                  | Email Jo + log to `breach_events` | P1 (potential attack) |

Full rule set ships at M4 (Watch + Siren milestone) with PagerDuty routing (or Better Uptime equivalent — Watch picks at M4 vendor scout).

## On-call routing

M0–M3: Jo only (no second human). M4+: routes to PagerDuty (~$25/mo per seat) or BetterUptime-included on-call (already bundled in status-page plan). Watch decides at M4 vendor scout per `observability/status-page.md`.

## Bootstrap actions (Jo executes at M0 close)

1. **Sentry account** → sign up at sentry.io → choose US data residency → upgrade to Team plan.
2. **Create org** `studio-zero`.
3. **Create project (web)** → platform `javascript-nextjs` → name `studio-zero-web` → copy DSN → wire as `NEXT_PUBLIC_SENTRY_DSN` in Vercel env-vars (Production + Preview).
4. **Create project (runner)** → platform `node` → name `studio-zero-runner` → copy DSN → wire as Railway env `SENTRY_DSN` when runner deploys at M1.
5. **Issue auth token** → User Settings → Auth Tokens → create token with scopes `project:read`, `project:releases`, `org:read` → wire as `SENTRY_AUTH_TOKEN` in Vercel env-vars (build-time only).
6. **Wire @sentry/nextjs** at M1 when Forge does runtime instrumentation (PR includes `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` + `next.config.ts` plugin wrap).
7. **Confirm beforeSend** scrubbers active — Verify writes `tests/acceptance/integration/sentry-pii-scrub.spec.ts` at M1 (sends a fixture error containing a fake email + token → asserts the event payload at Sentry's ingest is scrubbed).

## Cost trajectory

| Month                                             | Plan            | Why                                                                                                  |
| ------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| M0–M2                                             | Team $26/mo     | Default. Error volume well below 50k/mo.                                                             |
| M3 onward (if cushion < $15k per runway cut-burn) | Free $0/mo      | Lose 50k errors/mo cap; accept developer-tier budget                                                 |
| M5+ (if user count grows)                         | Business $80/mo | More features (advanced search, longer retention). Trigger: > 5 paying customers OR > 10k errors/mo. |

## Drift-check protocol

Weekly (Mon): Watch (or Jo if Watch automated) checks:

- Active project count = 2 (web + runner)
- Active alert-rule count matches table above
- `beforeSend` scrubbers still configured (manual code review via grep on `sentry.*.config.ts`)
- Quarterly: review `Issues` view for any new error pattern that should become an alert rule

## Cross-references

- `architecture/threat-model.md` Cipher B5 (PII scrub spec)
- PRD §13.6 (beforeSend PII redaction requirement)
- PRD §14.3 (audit-log + breach-event retention)
- `architecture/iac/observability/posthog.md` (sister analytics product, different rules)
- `architecture/iac/observability/status-page.md` (M4 vendor pick)
- `finance/unit-economics.md` §1 (Sentry Team plan $26/mo)
- `finance/runway.md` §4.1 (Sentry kill-switch trigger)

---

_Terra · Sentry · M0 manual-bootstrap notes._
