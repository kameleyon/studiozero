# Studio Zero — Subprocessor List

**Version:** 1.0 (M1 first draft)
**Effective date:** 2026-05-12
**Last updated:** 2026-05-12
**Owner:** Comply (Compliance Officer)
**PRD anchors:** §14.4 (privacy & retention), §17 Decision #17 (GDPR Art. 28 DPA + subprocessor list — pulled forward from M3 stub to M1 first publication)
**Cross-references:** `legal/privacy-policy.md`, `legal/terms-of-service.md`, `architecture/system-diagram.md` (component table — single source of truth for "what touches what data")
**Change-notification window:** Studio Zero gives **30 days' notice** before adding a new subprocessor, per Decision #17. The change log at `https://studiozero.dev/subprocessors/changelog` is the canonical record. RSS feed available.

> A "subprocessor" is any third-party vendor that processes personal data on behalf of Studio Zero in the course of delivering our service. Every subprocessor below is contractually bound by data-processing terms at least as strict as ours, with Standard Contractual Clauses (or equivalent transfer mechanism) where data crosses borders.

---

## 1. Core platform subprocessors

| #   | Name                                      | Purpose                                                                                                                                                                           | Region                                     | Data categories                                                                                                                                                                                                                                           | Transfer mechanism (EU/UK → US)                                                                                     | DPA                                                                |
| --- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | **Supabase, Inc.**                        | Primary Postgres database, authentication (GoTrue), Vault (BYOK key encryption), Storage (evidence blobs), Realtime (per-tenant channels), Edge Functions (latency-sensitive ops) | US East 1 (AWS us-east-1)                  | Account identifiers, project metadata, submitted code (encrypted, cryptoshredded at 7 days default), findings, run telemetry, audit logs, billing event references, consent records                                                                       | SCCs (EU 2021 module 2) + UK IDTA                                                                                   | https://supabase.com/legal/dpa                                     |
| 2   | **Anthropic, PBC**                        | Large language model inference (Claude family) for the audit runner                                                                                                               | US                                         | Submitted code excerpts (only the portions needed for the audit prompt; redacted of secrets via runner middleware), audit context, agent prompt history (for the in-flight call only; not retained by Anthropic per their commercial no-training posture) | SCCs (EU 2021 module 2) + UK IDTA + EU-US DPF certification status tracked at https://www.dataprivacyframework.gov/ | https://www.anthropic.com/legal/dpa                                |
| 3   | **Stripe, Inc.**                          | Payment processing (Stripe Checkout, Stripe Customer Portal, Stripe Connect for future Reseller tier), invoicing, dunning, refund execution, dispute handling                     | Global (US-controlled, regional acquirers) | Billing identifiers (Stripe customer ID, last 4 of card, billing country), payment events, tax IDs, refund records                                                                                                                                        | SCCs + UK IDTA + EU-US DPF certified                                                                                | https://stripe.com/legal/dpa                                       |
| 4   | **GitHub, Inc.** (a Microsoft subsidiary) | Source repository access via the Studio Zero GitHub App (per-repo permissions only, D1); future Auto-PR delivery (V1.5)                                                           | Global                                     | Repository metadata, source code (read via GitHub App at runtime — we hold a transient clone, not a persisted copy), GitHub installation IDs, webhook payloads                                                                                            | SCCs (Microsoft-wide) + UK IDTA + EU-US DPF certified                                                               | https://github.com/customer-terms/github-data-protection-agreement |
| 5   | **Vercel, Inc.**                          | Web hosting (Next.js 15 app + marketing site), CDN, build pipeline                                                                                                                | US East 1 (iad1) + global edge             | Account identifiers (cookie-borne session ID), request logs (truncated IP, user agent, URL path), build artifacts (no customer code)                                                                                                                      | SCCs + UK IDTA                                                                                                      | https://vercel.com/legal/dpa                                       |
| 6   | **Cloudflare, Inc.**                      | DNS, edge CDN for marketing site, WAF, DDoS protection                                                                                                                            | Global                                     | Connection logs (IP, ASN, user agent), challenge events                                                                                                                                                                                                   | SCCs + UK IDTA + EU-US DPF certified                                                                                | https://www.cloudflare.com/cloudflare-customer-dpa/                |
| 7   | **Railway Corp.**                         | Hosted Runner Pool — stateless workers, rootless containers with seccomp + egress allowlist (ARCH-D2 + ARCH-D9). One audit per container; nothing persists between runs.          | US East                                    | Transient: submitted code at audit time; runner stdout/stderr (tenant_id-stamped, secrets redacted); ephemeral process memory                                                                                                                             | SCCs + UK IDTA                                                                                                      | https://railway.com/legal/dpa                                      |

---

## 2. Observability and operations subprocessors

| #   | Name                                   | Purpose                                                                                                                                                                                                                                               | Region                                         | Data categories                                                                                                                  | Transfer mechanism | DPA                          |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------- |
| 8   | **Sentry (Functional Software, Inc.)** | Server + browser error capture with `beforeSend` PII scrubbing (`apps/web/lib/sentry-redaction.ts`); release tracking                                                                                                                                 | US (with EU region optional from M3)           | Stack traces, error context (PII-scrubbed), session ID (consent-gated), browser/runtime metadata                                 | SCCs + UK IDTA     | https://sentry.io/legal/dpa/ |
| 9   | **PostHog Inc.**                       | Product analytics, funnel measurement, feature flags. **Consent-gated**: SDK is not initialized until the cookie banner returns `accepted` or `partial` with the analytics bucket on. `tenant_id` is HMAC-hashed before transmission (Cipher Fix-3b). | US (with EU Cloud option in evaluation for M3) | Event payloads from `marketing/analytics-spec.md` registry, distinct_id, anon_id, session_id, page metadata                      | SCCs + UK IDTA     | https://posthog.com/dpa      |
| 10  | **Resend (Resend Inc.)**               | Transactional email (verification, password reset, billing receipts, cancellation confirmation per FTC 16 CFR 425.4(b)) and lifecycle email (consent-gated where lifecycle is marketing in nature)                                                    | US (multi-region delivery)                     | Email address, message content, delivery + open + click events (lifecycle only; transactional emails not tracked for engagement) | SCCs + UK IDTA     | https://resend.com/legal/dpa |

---

## 3. Conditional subprocessors (used only on customer instruction)

These vendors are touched only when a customer explicitly enables their use. Listing them keeps the inventory complete.

| #   | Name                                  | Purpose                                               | When triggered                                                                 | Data categories                            |
| --- | ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| 11  | **Google LLC (Google Analytics 4)**   | Marketing-site analytics for paid-channel attribution | Only when customer accepts the `analytics` cookie bucket at the consent banner | Page views, UTM parameters, anonymized IP  |
| 12  | **Meta Platforms, Inc. (Meta Pixel)** | Paid social attribution (M3+)                         | Only when customer accepts the `marketing` cookie bucket                       | Page view event, conversion event (no PII) |
| 13  | **LinkedIn Corp. (Insight Tag)**      | Paid social attribution (M3+)                         | Only when customer accepts the `marketing` cookie bucket                       | Page view event, conversion event          |

If you reject the `analytics` and `marketing` buckets at the cookie banner, items 11–13 are not triggered for your session.

---

## 4. Coverage check against system-diagram.md

Every external service in `architecture/system-diagram.md` §1 (Components) and §3 (Trust boundaries) is on this list. Cross-check:

- TB-0 Cloudflare → Subprocessor #6 ✓
- TB-3 Supabase → Subprocessor #1 ✓
- TB-4/5 Hosted Runner → Anthropic + GitHub clone → Subprocessors #2, #4, #7 ✓
- TB-8 Stripe webhook → Subprocessor #3 ✓
- TB-9 Telemetry SaaS (Sentry, PostHog, Resend) → Subprocessors #8, #9, #10 ✓
- TB-10 GitHub webhook → Subprocessor #4 ✓
- Vercel hosting → Subprocessor #5 ✓
- Railway runner pool → Subprocessor #7 ✓

**Coverage: 10 core subprocessors + 3 conditional = 13 total.** No gap.

---

## 5. Adding or removing a subprocessor

When we propose to **add** a subprocessor:

1. Comply runs a Transfer Impact Assessment if the vendor processes EU/UK personal data and operates from a third country. File: `compliance/tia/<vendor>.md`.
2. Cipher and Shield review the security posture (SOC 2 Type II report, ISO 27001 certificate, recent pentest summary).
3. We execute a DPA with the vendor that mirrors our own customer-facing DPA at least clause-for-clause.
4. We publish a 30-day notice at `https://studiozero.dev/subprocessors/changelog`. The RSS feed pushes the notice to subscribers.
5. Existing customers who object can terminate within the notice period and receive a pro-rata refund (see `legal/terms-of-service.md` §15.3).
6. After 30 days, the new subprocessor is added to this page with a `Added: YYYY-MM-DD` annotation.

When we **remove** a subprocessor (rare; only on contract termination, security event, or migration), the row is moved to a "Former subprocessors" appendix with the removal date and reason.

### 5.1 Customer objection process

If you object to a new subprocessor on reasonable grounds (security incident, sanctions, ethical concern), email `privacy@studiozero.dev` within the 30-day notice window. We will: (a) explore mitigations, (b) accept the objection and not route your data through that subprocessor where technically feasible, or (c) if neither is feasible, allow termination with pro-rata refund.

---

## 6. Article 28 DPA

The standard customer-facing Data Processing Agreement template lives at `compliance/dpa-template.md` (ships at M2, before the first paid Managed-tier customer per Decision #17). The template incorporates Module 2 of the EU 2021 Standard Contractual Clauses by reference and includes the UK IDTA addendum. Customers can request execution at `privacy@studiozero.dev`.

---

## 7. Contact

- **Subprocessor questions:** `privacy@studiozero.dev`
- **General legal:** `legal@studiozero.dev`
- **Subscribe to changes:** `https://studiozero.dev/subprocessors/changelog.rss`

---

_Comply locks this Subprocessor List at v1.0 on 2026-05-12. Re-verify quarterly or on any contract change. Next review: 2026-08-12._
