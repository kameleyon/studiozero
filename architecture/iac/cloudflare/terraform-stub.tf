# ─────────────────────────────────────────────────────────────────────
# Studio Zero — Cloudflare Terraform skeleton (M1 stub)
#
# Status at M0: SKELETON ONLY. NOT applied. Manual bootstrap per
# architecture/iac/cloudflare/dns.md + zone-config.md is the M0
# state. This file lands as code-as-state at M1 when the DNS records
# stop changing and the WAF rule tuning has stabilized.
#
# Owner: Terra (this file).
# Reviewer: Shield (WAF + rate limit rules at M1+).
#
# Provider auth via env vars:
#   TF_VAR_cloudflare_api_token  (Zone:DNS edit + WAF edit scopes)
#   TF_VAR_cloudflare_zone_id    (from dashboard → Overview)
#
# Apply flow when activated at M1:
#   cd architecture/iac/cloudflare
#   cp terraform.tfvars.example terraform.tfvars  # fill non-secret values
#   terraform init
#   terraform plan -out=plan.out
#   # review, share on PR
#   terraform apply plan.out
#
# State backend: local (gitignored .tfstate) at M1; Terraform Cloud at M2+.
# ─────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ─────────────────────────────────────────────────────────────────────
# Variables — values come from terraform.tfvars (gitignored) or env
# ─────────────────────────────────────────────────────────────────────

variable "cloudflare_api_token" {
  description = "Cloudflare API token (Zone:DNS + WAF edit). Issued in dashboard → My Profile → API Tokens."
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for studiozero.dev. Dashboard → Overview."
  type        = string
}

variable "apex_domain" {
  description = "Root domain managed by this zone."
  type        = string
  default     = "studiozero.dev"
}

variable "vercel_cname_target" {
  description = "Vercel-issued CNAME target. Typically cname.vercel-dns.com."
  type        = string
  default     = "cname.vercel-dns.com"
}

variable "betterstack_status_target" {
  description = "Status page CNAME target (set at M4 when status page provider is wired)."
  type        = string
  default     = ""  # empty until M4
}

# ─────────────────────────────────────────────────────────────────────
# DNS records — mirror architecture/iac/cloudflare/dns.md table
# ─────────────────────────────────────────────────────────────────────

resource "cloudflare_dns_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = var.apex_domain
  type    = "CNAME"
  content = var.vercel_cname_target
  ttl     = 1   # 1 = automatic; required with proxied=true
  proxied = true
  comment = "studiozero.dev apex → Vercel (CNAME flattening)"
}

resource "cloudflare_dns_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www.${var.apex_domain}"
  type    = "CNAME"
  content = var.vercel_cname_target
  ttl     = 1
  proxied = true
  comment = "www.studiozero.dev → Vercel (auto-redirects to apex)"
}

# M5+ when the app shell is split from marketing
# resource "cloudflare_dns_record" "app" {
#   zone_id = var.cloudflare_zone_id
#   name    = "app.${var.apex_domain}"
#   type    = "CNAME"
#   content = var.vercel_cname_target
#   ttl     = 1
#   proxied = true
#   comment = "app.studiozero.dev → Vercel (authenticated app shell)"
# }

# M3+ when the CLI ships
# resource "cloudflare_dns_record" "cli" {
#   zone_id = var.cloudflare_zone_id
#   name    = "cli.${var.apex_domain}"
#   type    = "CNAME"
#   content = var.vercel_cname_target
#   ttl     = 1
#   proxied = true
#   comment = "cli.studiozero.dev → Vercel (CLI release + docs)"
# }

# M4+ status page (Better Uptime / statuspage.io)
# Proxied = false; provider must terminate SSL directly.
# resource "cloudflare_dns_record" "status" {
#   zone_id = var.cloudflare_zone_id
#   name    = "status.${var.apex_domain}"
#   type    = "CNAME"
#   content = var.betterstack_status_target
#   ttl     = 300
#   proxied = false
#   comment = "status.studiozero.dev → status page provider"
# }

# ─────────────────────────────────────────────────────────────────────
# Zone settings (HSTS, SSL Full Strict, minify off, Brotli on)
# Cloudflare's terraform provider exposes these via cloudflare_zone_setting
# Set at M1 once Shield has finalized WAF tuning from log-only review.
# ─────────────────────────────────────────────────────────────────────

# resource "cloudflare_zone_setting" "ssl" {
#   zone_id    = var.cloudflare_zone_id
#   setting_id = "ssl"
#   value      = "strict"
# }
# resource "cloudflare_zone_setting" "always_use_https" {
#   zone_id    = var.cloudflare_zone_id
#   setting_id = "always_use_https"
#   value      = "on"
# }
# resource "cloudflare_zone_setting" "min_tls_version" {
#   zone_id    = var.cloudflare_zone_id
#   setting_id = "min_tls_version"
#   value      = "1.2"
# }
# resource "cloudflare_zone_setting" "tls_1_3" {
#   zone_id    = var.cloudflare_zone_id
#   setting_id = "tls_1_3"
#   value      = "on"
# }
# resource "cloudflare_zone_setting" "minify" {
#   zone_id    = var.cloudflare_zone_id
#   setting_id = "minify"
#   value      = jsonencode({ html = "off", css = "off", js = "off" })
# }
# resource "cloudflare_zone_setting" "brotli" {
#   zone_id    = var.cloudflare_zone_id
#   setting_id = "brotli"
#   value      = "on"
# }

# ─────────────────────────────────────────────────────────────────────
# WAF managed rulesets — Shield writes the full ruleset wiring at M1
# after the log-only tuning period.
# ─────────────────────────────────────────────────────────────────────

# resource "cloudflare_ruleset" "managed_owasp" { ... }  # see Shield's M1 deliverable

# ─────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────

output "zone_id" {
  value = var.cloudflare_zone_id
}

output "apex_record" {
  value = cloudflare_dns_record.apex.id
}

output "www_record" {
  value = cloudflare_dns_record.www.id
}

# End of terraform-stub.tf — activates at M1 per architecture/iac/README.md §2.
