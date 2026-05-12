# Cloudflare — DNS Records

**Zone:** `studiozero.dev` (registered via Cloudflare Registrar at-cost ≈ $20/yr).
**Owner:** Terra (this doc) + Echo (email records at M4).
**Status at M0:** **STUB** — Jo registers domain + transfers zone at M0 wk-2.

> **Why Cloudflare for DNS + CDN + WAF (and Registrar).** PRD §13.1 + ARCH-D2: cheap DDoS mitigation + free SSL + WAF managed rulesets at Pro ($25/mo). Cloudflare Registrar charges domain at IANA-cost with no markup (saves $5–10/yr vs GoDaddy etc) and binds the zone to Cloudflare's nameservers automatically. Same vendor pattern motionmax uses today.

## DNS record inventory (target state at M0 close)

| Type  | Name                               | Content                                                              | TTL      | Proxied                | Comment                                                                                                                                                                   |
| ----- | ---------------------------------- | -------------------------------------------------------------------- | -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CNAME | `@` (apex `studiozero.dev`)        | `cname.vercel-dns.com`                                               | 1 (auto) | **YES** (orange cloud) | Apex via Cloudflare CNAME-flattening → Vercel project `studiozero-omega`                                                                                                  |
| CNAME | `www` (`www.studiozero.dev`)       | `cname.vercel-dns.com`                                               | 1 (auto) | **YES**                | Vercel auto-redirects to apex                                                                                                                                             |
| CNAME | `app` (`app.studiozero.dev`)       | `cname.vercel-dns.com`                                               | 1 (auto) | **YES**                | **DEFERRED to M5+** — placeholder. Future authenticated app shell.                                                                                                        |
| CNAME | `cli` (`cli.studiozero.dev`)       | `cname.vercel-dns.com`                                               | 1 (auto) | **YES**                | **DEFERRED to M3** — CLI release/docs subdomain.                                                                                                                          |
| CNAME | `status` (`status.studiozero.dev`) | `<provider>.betteruptime.com` (or statuspage.io equivalent)          | 300      | **NO** (gray cloud)    | **DEFERRED to M4** — status page provider needs to terminate SSL directly.                                                                                                |
| MX    | `@`                                | `feedback-smtp.<resend-region>.amazonses.com` (Resend's SES)         | 3600     | n/a                    | **DEFERRED to M4** — Resend transactional email (MX usually NOT needed for outbound-only, but for DMARC-compliant delivery + bounce handling, add Resend's per-region MX) |
| TXT   | `@`                                | `v=spf1 include:amazonses.com ~all`                                  | 3600     | n/a                    | **M4** — Resend SPF                                                                                                                                                       |
| TXT   | `<dkim-selector>._domainkey`       | DKIM public key from Resend dashboard                                | 3600     | n/a                    | **M4** — Resend DKIM                                                                                                                                                      |
| TXT   | `_dmarc`                           | `v=DMARC1; p=quarantine; rua=mailto:dmarc@studiozero.dev`            | 3600     | n/a                    | **M4** — DMARC; tightens to `p=reject` post-launch once delivery stable                                                                                                   |
| TXT   | `_acme-challenge` (transient)      | (Let's Encrypt challenges; Vercel manages)                           | 60       | n/a                    | Auto-managed by Vercel during SSL issuance                                                                                                                                |
| TXT   | `@`                                | (Google site verification, GitHub repo verification, etc. as needed) | 3600     | n/a                    | Added on demand                                                                                                                                                           |
| CAA   | `@`                                | `0 issue "letsencrypt.org"` + `0 issue "pki.goog"`                   | 3600     | n/a                    | **M1+** — CAA restricts who can issue certs for this domain. Add once SSL stable.                                                                                         |

## M0 wk-2 bootstrap (Jo executes)

1. **Cloudflare account** → already exists (Jo's personal account). Confirm 2FA enabled.
2. **Cloudflare Registrar → Register Domain** → search `studiozero.dev` → if available, register (~$20/yr) → set auto-renew ON.
3. **Zone is auto-created** when registering via Cloudflare Registrar. No nameserver transfer needed.
4. **Add DNS records** per table above (apex + www at minimum at M0):
   ```
   Type: CNAME, Name: @, Content: cname.vercel-dns.com, Proxy: ON, TTL: Auto
   Type: CNAME, Name: www, Content: cname.vercel-dns.com, Proxy: ON, TTL: Auto
   ```
5. **Wait for Vercel verification** (~5 min after DNS propagates) — Vercel project should show "Valid Configuration" for `studiozero.dev` + `www.studiozero.dev`.
6. **Smoke**: `curl -I https://studiozero.dev` → 200 + valid Let's Encrypt cert; `curl -I https://www.studiozero.dev` → 301 redirect to apex.

## CNAME tofu rules (TOFU = Trust On First Use)

Cloudflare Registrar binds the zone to Cloudflare's nameservers (`*.ns.cloudflare.com`). DS records (DNSSEC) are auto-managed. No third-party registrar TOFU concerns at MVP.

If we ever migrate the zone to another DNS host (we won't pre-V2), TOFU = the new host's published nameservers + a 48h propagation window.

## DNSSEC

**ENABLED** at zone creation (Cloudflare Registrar default for `.dev` domains). `.dev` registry supports DNSSEC; Cloudflare auto-signs the zone. Verify: `dig +dnssec studiozero.dev DS` returns DS record.

## Email records (deferred to M4)

When Echo wires Resend at M4:

1. Resend dashboard → Domains → Add `studiozero.dev`
2. Resend emits 3 records (SPF, DKIM, MX) — paste into Cloudflare
3. Validate via Resend "Verify" button → all 3 green
4. Add DMARC TXT record (Cloudflare's "Email Security" guide auto-fills the recommended value)
5. Start at `p=quarantine` then move to `p=reject` after 2 weeks of clean delivery telemetry

## Terraform conversion plan (M1+)

Terra writes `architecture/iac/cloudflare/dns.tf` mirroring motionmax's pattern. Each DNS record above becomes a `cloudflare_dns_record` resource. See `terraform-stub.tf` in this dir for the skeleton.

## Drift-check protocol

Weekly (Mon): export DNS via Cloudflare dashboard → Records → "Export" → diff against the table here. Same procedure as motionmax. Any extra record (someone added a hand-typed CNAME) → log → reconcile same day.

## Cross-references

- `architecture/iac/cloudflare/zone-config.md` (SSL Full Strict, HSTS, Brotli)
- `architecture/iac/cloudflare/terraform-stub.tf` (M1 Terraform skeleton)
- `architecture/iac/vercel/domains.md` (Vercel side of the domain binding)
- `architecture/iac/observability/status-page.md` (status subdomain CNAME target)

---

_Terra · Cloudflare DNS · M0 manual-bootstrap notes._
