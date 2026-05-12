# Status Page — M4 Vendor Pick

**Owner:** Watch (Siren M4 milestone) + Terra (DNS + IaC wiring once vendor picks land).
**Status at M0:** **DEFERRED** — vendor decision lives in this doc as the **M4 deliverable**. Sprint's milestone-M4.md exit gate is "status page live."

> **Why a status page exists at all.** Per `architecture/system-diagram.md` §6 failure-domain rule: `/healthz` returns 200 if the Web App process is alive — even when Supabase is down. The independent observability surface for "is the platform up?" is `/status`, which **must** live on infra that doesn't share a failure domain with Vercel + Supabase + Railway. Hence: third-party status page provider, not a self-hosted route.

## Provider candidates (Watch picks at M4)

| Provider               | Cost                                                                               | Pros                                                                                                               | Cons                                                         | Recommendation                                                      |
| ---------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Better Uptime**      | Free tier covers 10 monitors + 1 status page; Premium $24/mo for advanced features | Generous free tier; clean status page UI; on-call routing included; same vendor motionmax uses (B-NEW-19 evidence) | UI customization limited on free tier                        | **DEFAULT pick at M4** unless `runway.md` cushion allows Statuspage |
| Statuspage (Atlassian) | $29/mo minimum (Hobby)                                                             | Industry standard; integrations everywhere                                                                         | $29/mo is a runway-cut-burn target line under $15k cushion   | Avoid at M4; revisit V2                                             |
| Cachet (self-hosted)   | $0 + hosting                                                                       | Free; full control                                                                                                 | Adds infra; defeats the "independent failure domain" purpose | Reject                                                              |
| StatusGator / IsItUp   | Per-monitor pricing                                                                | Light status pages                                                                                                 | Less polish                                                  | Reject                                                              |

**Watch's pre-decision at M4 entry:** Better Uptime free tier unless runway allows Statuspage. Listed in `finance/unit-economics.md` §0 placeholder as `EST $0–$29/mo`.

## What the status page tracks

| Component                                                        | Monitor type                                        | Threshold                               |
| ---------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| Web app (`https://studiozero.dev`)                               | HTTP probe every 60s from 3 regions                 | 2 consecutive failures = DOWN           |
| Vercel API health (`https://studiozero.dev/healthz`)             | HTTP probe every 60s                                | 200 → OK; anything else = DEGRADED      |
| Supabase Postgres (synthetic auth probe via `/api/healthz/deep`) | HTTP probe every 5min                               | Auth probe success = OK                 |
| Runner pool (Railway service active + last job poll < 60s ago)   | Custom heartbeat → status page API                  | DOWN if no heartbeat 5min               |
| Stripe (synthetic webhook signature check)                       | Stripe test event every 1h                          | Failure = `Stripe integration degraded` |
| GitHub App (App token mint test)                                 | Every 1h                                            | Failure = `GitHub integration degraded` |
| Anthropic API (managed)                                          | Every 5min via /messages endpoint with 1-token ping | 2 fails = `LLM provider degraded`       |

`/api/healthz/deep` is a new route Forge writes at M4 — it does a 1-row SELECT from a sentinel table + an auth-server ping + returns 200 only on full stack health. Distinct from `/healthz` (which only proves Web App process is alive).

## DNS wiring

`status.studiozero.dev` CNAME → provider's edge (per `architecture/iac/cloudflare/dns.md`). **Proxied = false** because the provider terminates SSL directly.

## Incident workflow

Per `architecture/iac/observability/sentry.md` + Watch's M4 runbook:

1. Sentry alert fires (P1) → Email Jo + create issue.
2. Jo (or M5+ on-call) goes to status page → "Create incident" → mark affected components DEGRADED or DOWN.
3. Customer email auto-sent via Resend (Echo's lifecycle template E5).
4. Update every 30 min minimum until resolved.
5. Post-mortem within 7 days in `compliance/postmortem-YYYY-MM-DD.md`.

## Cost trajectory

M4 entry: Better Uptime free → $0/mo through M5.
V2: if customer-success signal demands (e.g., enterprise customer asks for SLA badge), upgrade to Statuspage at $29/mo.

## Cross-references

- `architecture/iac/cloudflare/dns.md` (`status` CNAME record)
- `architecture/system-diagram.md` §6 (failure-domain map)
- `agents/devops/watch.md` (Siren M4 milestone owner)
- `sprint/milestone-M4.md` (status-page-live exit gate)
- `architecture/iac/observability/sentry.md` (alert source feeding incidents)

---

_Terra · Status page · M4 deliverable; M0 placeholder spec only._
