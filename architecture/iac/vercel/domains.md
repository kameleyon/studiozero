# Vercel — Domain Plan

**Owner:** Terra (this doc) + Echo (email subdomain decisions later).
**Cost:** `studiozero.dev` domain registration ≈ $20/year via Cloudflare Registrar (at-cost; no markup). SSL is free via Vercel's auto-issued Let's Encrypt certs.

## Domain inventory

| Domain                        | Purpose                                                                                       | Vercel mapping                                                                                         | SSL                              | M0/M1/M2 status                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------- |
| `studiozero-omega.vercel.app` | Vercel-default production URL (created at scaffold time)                                      | Auto (project default)                                                                                 | Vercel-managed                   | **LIVE** at M0 (Forge's scaffold shipped here)     |
| `studiozero.dev`              | **Primary production** — apex; marketing + app live on same origin at M0 (single Next.js app) | CNAME `@` → Vercel                                                                                     | Vercel auto-issues Let's Encrypt | **M0 wk-2** — added once Cloudflare zone is set up |
| `www.studiozero.dev`          | 301-redirect to apex                                                                          | CNAME `www` → Vercel; Vercel redirect rule "redirect www → apex"                                       | Vercel auto                      | **M0 wk-2**                                        |
| `app.studiozero.dev`          | Future authenticated app shell (split when marketing becomes its own surface at M5+)          | CNAME `app` → Vercel                                                                                   | Vercel auto                      | **Deferred to M5+** — see ARCH-D8 follow-up        |
| `cli.studiozero.dev`          | CLI release / docs subdomain                                                                  | CNAME `cli` → Vercel (static)                                                                          | Vercel auto                      | **Deferred to M3** (when CLI ships)                |
| `status.studiozero.dev`       | Status page (statuspage.io or Better Uptime)                                                  | CNAME `status` → provider edge (NOT proxied through Cloudflare — provider needs to serve SSL directly) | Provider-managed                 | **M4** (Watch + Siren milestone)                   |
| `noreply.studiozero.dev`      | Email sender domain (Resend SPF/DKIM)                                                         | NOT a Vercel domain — DNS only (MX, TXT) in Cloudflare                                                 | n/a                              | **M4 wk-14** (when Resend wires up E1–E5)          |

> **Domain choice rationale.** `studiozero.dev` (not `.com`, not `.io`) was Jo's call at Phase 1; `.dev` is HSTS-preloaded by Google by default (all `.dev` traffic is HTTPS-forced at the browser level — security wedge for free).

## SSL / TLS posture

| Setting       | Value                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Vercel SSL    | Auto-issued Let's Encrypt; auto-renewed                                                                         |
| TLS minimum   | 1.2 (Vercel-enforced); prefer 1.3                                                                               |
| HSTS          | Cloudflare-managed at the zone level (`cloudflare/zone-config.md`) — preload-eligible since `.dev` is preloaded |
| Mixed-content | Forbidden by Next.js; Forge enforces all assets HTTPS                                                           |

## DNS routing at M0 (handshake between Cloudflare and Vercel)

```
                  ┌──────────────────────────────────┐
                  │ Cloudflare DNS (studiozero.dev)  │
                  │                                  │
                  │  @  (apex)  CNAME → vercel-dns   │ ← proxied = true
                  │  www        CNAME → vercel-dns   │ ← proxied = true
                  │  app        CNAME → vercel-dns   │ ← proxied = true (M5+)
                  │  status     CNAME → BetterUptime │ ← proxied = false (M4+)
                  │  noreply    MX/TXT for Resend    │ ← M4+
                  └──────────────────────────────────┘
                                  │
                                  ▼
                  ┌──────────────────────────────────┐
                  │ Vercel project studiozero-omega  │
                  │  Production iad1                 │
                  │  Domains: studiozero.dev,        │
                  │           www.studiozero.dev     │
                  └──────────────────────────────────┘
```

Cloudflare's CNAME-flattening lets us use `CNAME @` at the apex (which classic DNS forbids). Same pattern motionmax uses today (`motionmax/iac/cloudflare/dns.tf`).

## Custom domain bootstrap (M0 wk-2)

1. Register `studiozero.dev` at Cloudflare Registrar → at-cost ($20/yr, no markup). Auto-renew ON.
2. Cloudflare creates the zone automatically on registration.
3. Add DNS records per `cloudflare/dns.md` (CNAME apex + www to `cname.vercel-dns.com`).
4. Vercel dashboard → Project `studiozero-omega` → Domains → Add `studiozero.dev` → "Use a third-party DNS provider" → confirm.
5. Vercel polls DNS (~5 min); once it resolves, Let's Encrypt cert auto-issues.
6. Add `www.studiozero.dev` the same way → Vercel auto-configures the redirect-to-apex behavior.
7. Verify: `curl -I https://studiozero.dev` → 200; `curl -I https://www.studiozero.dev` → 301 to apex.

## DNSSEC

Enabled at the Cloudflare zone level (`cloudflare/zone-config.md`). `.dev` registry supports DNSSEC; Cloudflare auto-signs.

## Drift-check protocol

Weekly (Mon): `cf dns list --zone studiozero.dev` (via `cf-cli`) diffed against the table above + `cloudflare/dns.md`. Any extra/missing record → drift-log entry → same-day fix.

## Cross-references

- `architecture/iac/cloudflare/dns.md` (DNS record specifics)
- `architecture/iac/cloudflare/zone-config.md` (HSTS, SSL Full/Strict, DNSSEC)
- `architecture/iac/observability/status-page.md` (status subdomain provider choice)

---

_Terra · Vercel domains · M0 manual-bootstrap notes._
