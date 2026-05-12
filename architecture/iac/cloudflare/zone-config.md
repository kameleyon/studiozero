# Cloudflare — Zone Configuration

**Zone:** `studiozero.dev`
**Plan:** Pro ($25/mo) — required for WAF managed rulesets per Shield's threat model TB-0 (DDoS) + TB-12 (WAF) coverage. Listed in `finance/runway.md` §1.
**Owner:** Terra (this doc) + Shield (WAF rules at M1).

## Settings inventory (Cloudflare dashboard → studiozero.dev → ...)

### SSL/TLS

| Setting                               | Target value                                            | Why                                                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SSL/TLS encryption mode               | **Full (Strict)**                                       | Vercel's Let's Encrypt cert is valid end-to-end; "Full (Strict)" enforces cert validation on the origin connection (Cloudflare → Vercel). Flexible mode (Cloudflare → origin over HTTP) is **forbidden** — it would create a plaintext hop. |
| Always Use HTTPS                      | **ON**                                                  | Auto-redirects http://studiozero.dev → https://                                                                                                                                                                                             |
| HTTP Strict Transport Security (HSTS) | **ON**, max-age 12 months, includeSubdomains, preload   | `.dev` is HSTS-preloaded at the browser level (Google's `.dev` registry forces HTTPS); adding the response header here doubles up at the CDN layer                                                                                          |
| Minimum TLS version                   | **1.2**                                                 | TLS 1.0/1.1 disabled                                                                                                                                                                                                                        |
| TLS 1.3                               | **ON**                                                  | preferred                                                                                                                                                                                                                                   |
| Opportunistic Encryption              | ON                                                      | harmless                                                                                                                                                                                                                                    |
| Automatic HTTPS Rewrites              | ON                                                      | rewrites http:// links in HTML to https://                                                                                                                                                                                                  |
| Certificate Transparency Monitoring   | ON                                                      | alerts on rogue cert issuance                                                                                                                                                                                                               |
| Universal SSL                         | ON (default — Cloudflare-issued edge cert for the zone) | distinct from Vercel's origin cert                                                                                                                                                                                                          |

### Speed

| Setting       | Target value            | Why                                                                                       |
| ------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Auto Minify   | **OFF** for HTML/CSS/JS | Next.js does its own minification; double-minifying breaks sourcemaps and adds zero value |
| Brotli        | **ON**                  | Compression; Next.js outputs are Brotli-friendly                                          |
| Early Hints   | ON                      | 103 hints for resource preloading (HTTP/2+)                                               |
| Rocket Loader | **OFF**                 | Reorders JS execution; breaks React hydration                                             |
| Mirage        | OFF                     | image optimization belongs in Next.js Image component                                     |
| Polish        | OFF                     | Same — Next.js Image handles this                                                         |

### Caching

| Setting           | Target value                                    | Why                                                                                                                 |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Caching Level     | **Standard**                                    | Cache only static assets; never cache HTML for authenticated routes                                                 |
| Browser Cache TTL | **Respect Existing Headers**                    | Vercel sets per-asset cache headers; don't override                                                                 |
| Always Online     | ON                                              | Cloudflare serves a cached snapshot if origin is down (graceful degradation; Vercel rarely is, but cheap insurance) |
| Development Mode  | OFF (in prod) — Jo flips ON only when debugging | Bypasses cache for 3h                                                                                               |

### Firewall (Pro plan WAF)

| Setting                                      | Target value                                                                                            | Why                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Application Firewall                     | **ON**                                                                                                  | Pro plan default                                                                                                                                                              |
| Managed Ruleset (Cloudflare Managed Ruleset) | **ON** (in BLOCK mode for high-confidence; LOG mode for everything else for first 2 weeks then tighten) | Catches OWASP Top 10 + known CVE signatures                                                                                                                                   |
| OWASP Core Ruleset                           | **ON** (Paranoia Level 1 to start; tune up per false-positive log review)                               | Standard baseline                                                                                                                                                             |
| Bot Fight Mode                               | ON                                                                                                      | free-tier bot filter; upgrades to Super Bot Fight Mode at Pro                                                                                                                 |
| Browser Integrity Check                      | ON                                                                                                      | challenges requests with obvious bot UA strings                                                                                                                               |
| Hotlink Protection                           | OFF                                                                                                     | not a content site; doesn't apply                                                                                                                                             |
| Rate Limiting                                | **set at M1**                                                                                           | Shield writes per-path rate limits in `architecture/iac/cloudflare/rate-limits.md` (M1) — e.g., `/auth/signin` → 5 req/min/IP, `/api/runs` → 50 req/24h/IP per PRD §14.2 EC-7 |
| Page Rules / Configuration Rules             | minimal at M0                                                                                           | Add at M1 if specific path bypass needed (e.g., `/api/cli/jobs` long-poll should NOT trigger WAF challenge — Shield writes a rule exception)                                  |
| Custom WAF Rules                             | **none at M0**; Shield writes M1+                                                                       | Per `architecture/threat-model.md` (Shield-owned) — examples: block requests with `X-Forwarded-For` chain length > 10 (proxy abuse), block SQLi signatures on `/api/*`        |

### Scrape Shield

| Setting                   | Target value                                          |
| ------------------------- | ----------------------------------------------------- |
| Email Address Obfuscation | ON                                                    |
| Server-side Excludes      | OFF (Next.js doesn't use Cloudflare's edge insertion) |
| Hotlink Protection        | OFF                                                   |

### Network

| Setting                     | Target value | Why                                                   |
| --------------------------- | ------------ | ----------------------------------------------------- |
| HTTP/3 (with QUIC)          | **ON**       | latency reduction; widely supported                   |
| 0-RTT Connection Resumption | ON           | replays mitigated by Vercel's idempotency on POSTs    |
| IPv6 Compatibility          | ON           | dual-stack                                            |
| WebSockets                  | **ON**       | Realtime requires it (ARCH-D5)                        |
| Onion Routing               | ON           | Tor users hit a Cloudflare onion service for the zone |

### DNS

| Setting                  | Target value |
| ------------------------ | ------------ | ---------------------------------------------------------------- |
| DNSSEC                   | **ENABLED**  | `.dev` registry supports; Cloudflare auto-signs                  |
| CNAME flattening at root | **ON**       | required for the apex CNAME → vercel-dns.com pattern in `dns.md` |

## Bootstrap actions (Jo executes at M0 wk-2)

After zone registration + DNS records land (per `dns.md`):

1. Cloudflare dashboard → studiozero.dev → SSL/TLS → set mode to **Full (Strict)** (NOT Flexible).
2. SSL/TLS → Edge Certificates → enable HSTS → max-age 12 months, includeSubdomains, preload.
3. Speed → Optimization → turn **OFF** Auto Minify (HTML/CSS/JS), **OFF** Rocket Loader, **OFF** Mirage, **OFF** Polish. Turn **ON** Brotli, Early Hints.
4. Caching → Configuration → Caching Level: Standard, Browser Cache TTL: Respect Existing Headers, Always Online: ON.
5. Security → WAF → enable Managed Rulesets in **LOG-only mode** for first 2 weeks (so we can see what gets flagged without breaking dev) → switch to BLOCK after Jo reviews logs. Shield writes the tuning ticket for M1.
6. Security → Bots → enable Bot Fight Mode.
7. Network → enable HTTP/3, WebSockets, IPv6.
8. DNS → confirm DNSSEC enabled (should be on by default for Cloudflare-registered `.dev`).

## Plan upgrade trigger

Pro plan is sufficient at MVP. Upgrade triggers:

- **Business plan** ($200/mo) — if we need custom SSL certs, image optimization for blog/marketing imagery, OR if WAF Pro's request budget is exceeded (10M requests/mo per zone; we're nowhere near at MVP scale).
- **Enterprise** — never at MVP; only if regulated industry customers ask.

## Drift-check protocol

Weekly (Mon): Jo (or Pipeline once it has a CF API token) hits each settings page above and verifies values match this doc. Quarterly: full export of zone settings via Cloudflare API → diff against this file. Tooling: `cf-cli zone settings export --zone studiozero.dev`.

## Cross-references

- `architecture/iac/cloudflare/dns.md` (DNS records)
- `architecture/iac/cloudflare/terraform-stub.tf` (M1 Terraform skeleton)
- `architecture/threat-model.md` (Shield-owned; WAF rule justifications)
- `architecture/system-diagram.md` §1 (Cloudflare in front of marketing + app)

---

_Terra · Cloudflare zone config · M0 manual-bootstrap notes._
