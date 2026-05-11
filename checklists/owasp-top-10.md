# QA Checklist — OWASP Top 10 (2021)

**Owner:** Shield (app security)
**Supported by:** Verify (supply chain), Cipher (encryption)
**Applies to:** every vertical with auth, user input, or external integrations

## Automated baseline (CI gate)
- [ ] **`npm audit`** runs on every dependency change. Critical / High vulnerabilities block merge (per Verify's 48h SLA).
- [ ] **`osv-scanner`** runs daily. Same SLA.
- [ ] **eslint-plugin-security** enabled. Zero warnings.
- [ ] **OWASP ZAP** baseline scan runs on staging deploys. New findings reviewed within 24h.

## A01:2021 — Broken Access Control
- [ ] **Server-side authorization on every API endpoint** — never trust client-side checks.
- [ ] **Postgres RLS enabled on every user-data table** before it contains data (per Atlas).
- [ ] **Role checks audited** — write tests proving a user in role X cannot access role Y's resources.
- [ ] **IDOR (Insecure Direct Object References)** — resources scoped by `tenant_id` AND `user_id` on read AND write.
- [ ] **Service-role key never exposed to the client** — only in server-only code paths.

## A02:2021 — Cryptographic Failures
- [ ] **TLS 1.2+ everywhere** — no exceptions, no localhost-only HTTP.
- [ ] **HSTS header set** with reasonable max-age.
- [ ] **Secrets in env vars, never in code** — verified by `gitleaks` or `trufflehog` in CI.
- [ ] **Passwords stored hashed** — Supabase handles this automatically; verify if rolling your own.
- [ ] **Session tokens are HTTP-only, Secure, SameSite cookies** (not localStorage).
- [ ] **PII encryption at rest** for sensitive fields (SSN, health data, financial data) — coordinate with Cipher.

## A03:2021 — Injection
- [ ] **Parameterized queries only** — no string interpolation in SQL.
- [ ] **Drizzle/Prisma/Supabase JS client used everywhere** — no raw SQL with user input.
- [ ] **Output encoding** — React's auto-escaping is your friend; `dangerouslySetInnerHTML` requires justification.
- [ ] **Command injection** — never pass user input to `child_process.exec()`. Use `execFile()` with explicit args.
- [ ] **LDAP / NoSQL / XPath injection** if applicable — same parameterization rule.

## A04:2021 — Insecure Design
- [ ] **Threat model exists** — Shield owns one for the project (`security/threat-model.md`).
- [ ] **Rate limiting** on auth endpoints, password reset, API endpoints with cost.
- [ ] **Account enumeration** prevented — login error messages identical for "wrong password" and "no such user".
- [ ] **Multi-factor auth** offered (and required for admins).

## A05:2021 — Security Misconfiguration
- [ ] **Security headers** set: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy.
- [ ] **CORS** explicit allowlist — no `*` in production unless intentional public API.
- [ ] **No default credentials** anywhere — Stripe test keys, Supabase demo data, etc. cleared from env.
- [ ] **Verbose error pages disabled in production** — never expose stack traces.
- [ ] **Cloud storage buckets** are private by default; signed URLs for time-limited access.

## A06:2021 — Vulnerable and Outdated Components
- [ ] **SBOM maintained** (per Verify) — CycloneDX or SPDX format committed to repo.
- [ ] **Dependabot / Renovate** auto-PRs for security patches; auto-merged after CI.
- [ ] **Dependencies pinned** — lockfile committed, integrity hashes verified.
- [ ] **Single-maintainer dependencies** flagged for review.

## A07:2021 — Identification and Authentication Failures
- [ ] **Password requirements** sane — minimum 8 chars, encourage passphrases over complexity rules.
- [ ] **Brute-force protection** — Supabase has built-in rate limits; verify they're not disabled.
- [ ] **Account lockout policy** — temporary (15 min) after N failed attempts.
- [ ] **Session expiration** — reasonable timeout (per project — usually 24h–7d for SaaS).
- [ ] **Password reset tokens** single-use, short-lived (≤ 1 hour).

## A08:2021 — Software and Data Integrity Failures
- [ ] **CI uses pinned actions** — full SHA, not floating tags (per Verify).
- [ ] **Webhook signatures verified** — Stripe, GitHub, Supabase webhooks all check signatures.
- [ ] **Auto-update is opt-in** — users not auto-updated to a new version that breaks their workflows.
- [ ] **CDN integrity** — script tags use `integrity=` SRI hash.

## A09:2021 — Security Logging and Monitoring Failures
- [ ] **Security events logged** — auth attempts (success + failure), admin actions, permission denials.
- [ ] **Logs reach a central location** (Sentry, Datadog, etc.) — not just stdout.
- [ ] **Alerts exist** for: 5xx spike, auth-failure spike, unexpected admin activity (per Watch + Siren).
- [ ] **Logs do not contain secrets** — Cipher's redaction patterns applied.

## A10:2021 — Server-Side Request Forgery (SSRF)
- [ ] **No user-supplied URLs fetched server-side** without allowlist + DNS resolution check.
- [ ] **Cloud metadata endpoints blocked** — `169.254.169.254` and equivalents.
- [ ] **Webhook outbound URLs** validated — no internal IPs allowed.

## Per-vertical extras
- **SaaS:** A01 + A02 are highest-risk. RLS audit + secret scanning are non-negotiable.
- **E-commerce:** A03 (payment input) + A07 (account takeover). PCI checklist applies separately.
- **Marketing site:** A05 + A06 (most exposure is misconfiguration + outdated deps on a relatively static surface).
- **Blog:** A03 (if comments) + A05 (basic).
- **Mobile / PWA:** A02 (token storage on device) — use Keychain / Keystore via expo-secure-store.
