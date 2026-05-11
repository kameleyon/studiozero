# Milestone M4 — Lifecycle + Polish + WCAG conformance

**Target:** week 14 (placeholder per PRD §16)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES before M5 starts. Self-dogfood gate M4. **WCAG 2.2 AA third-party conformance audit signed off.**

## Scope (one-line)

Lifecycle emails E1–E5 live, marketing site, status page, GDPR right-to-delete e2e, retention purge cron, and the customer-facing WCAG 2.2 AA conformance audit signed by an independent third party.

## Entry prerequisites

- M0 + M1 + M2 + M3 exit gates green (regression guard).
- External pentest verdict ≤1 Major / 0 Critical (M3 exit).
- WCAG conformance audit vendor engaged at M1 close, kickoff at M3 close (R15 mitigation).
- Marketing site repo scaffolded by Signal — Astro + Tailwind per `CAPABILITIES.md`.

## Deliverables per layer

### Strategy

- **Sprint:** weekly burndown updates; M5 ticket-cut scoping at week 13.
- **Penny:** review Managed-tier unit economics with M3 production data; flag pricing-vs-positioning risks per R10.

### Audit (Jury + 6 reviewers)

- **Jury:** **Self-dogfood gate M4** — verdict in `audits/m4.json` = PASS or PASS WITH FIXES.
- **Halo:** **WCAG 2.2 AA third-party conformance audit signed off** — report committed at `compliance/wcag-conformance-<vendor>-2026.pdf`. Covers verdict screen, signup, settings, billing, Stripe Checkout return, score breakdown table, pricing table, run timeline, AUP attestation modal.
- **Halo:** AT release recordings (NVDA + VoiceOver) of FAIL-verdict primary flow stored in `tests/a11y/at-recordings/m4/`; manual sign-off.

### Backend (Forge)

- **Forge — Lifecycle email infra:** Resend transactional email integration; pg_cron-backed scheduler firing E1–E5 on correct triggers.
- **Forge — GDPR right-to-delete:** `/api/settings/account/delete` initiates 30-day clock; all tenant rows purged at expiry; cryptoshredding key purged; audit log entry retained.
- **Forge — Retention purge cron:** pg_cron daily job; expired rows deleted; cryptoshredding via Vault key delete.
- **Forge — Status page:** `/healthz` endpoint; uptime probe from two regions every 60s.

### Frontend (Vega)

- **Vega — Marketing site (Astro + Tailwind):** landing + pricing + features + comparable-competitors + accessibility statement + dmca + subprocessors + system-card. Mobile-responsive; PWA-ready; cookie-consent banner.
- **Vega — Cookie consent banner:** granular (necessary / analytics / marketing); pre-consent telemetry buffered; never transmitted until consent granted (PRD §6.1).
- **Vega — `/accessibility` conformance statement page:** published; cites third-party audit; updated at every primary-flow release.
- **Vega — Status page UI:** `/status` consumes `/healthz` + synthetic uptime probe; published 99.5% SLI per PRD §14.2.

### Design (Canvas, Pixel)

- **Pixel:** marketing-site visuals; head-to-head competitive screenshots (v0 / Bolt / Lovable / Devin / Cursor) for Scout-curated GTM receipts.
- **Canvas:** marketing-site component library hand-off to Vega.

### Data (Atlas)

- **Atlas — `0005_lifecycle_emails_audit.sql` lands** (per migration-order.md M4 row): pg_cron lifecycle email scheduler (E1–E5 timing rows + Postgres job rows); `audit_log_write()` callable from app layer with hardened grants; retention pg_cron job for `runs.archive_after`.

### Security (Shield, Cipher, Verify)

- **Verify — Lifecycle emails test:** `tests/integration/lifecycle-emails.spec.ts` — E1–E5 fire under correct triggers; Mailpit captures; assertions on subject + CTA + AI-Authored trailer + unsubscribe link.
- **Verify — CAN-SPAM/CASL/PECR test:** `tests/integration/can-spam-casl-pecr.spec.ts` — every email carries unsubscribe link; one-click unsub honored within 10 days; identification line present.
- **Verify — Status page test:** `tests/integration/status-page.spec.ts` — uptime probe from two regions every 60s; `/healthz` returns 200; 99.5% SLI computable.
- **Verify — GDPR right-to-delete e2e:** `tests/acceptance/gdpr-right-to-delete.spec.ts` — request → confirmation → 30-day clock → all tenant rows deleted; cryptoshredding key purged; audit log entry retained.
- **Verify — Retention purge cron test:** `tests/integration/retention-purge.spec.ts` — pg_cron / equivalent runs daily; expired rows deleted; advances time and asserts.
- **Halo — axe-core PR-blocking gate** remains green at 320 / 768 / 1280 px on every primary-flow page including newly-added marketing site pages.

### Quality (Probe, Crash, Ghost)

- **Probe:** `settings-and-account-management.md` flow Playwright spec (BYOK rotate; GitHub App reinstall; cookie-consent change; right-to-delete trigger).
- **Crash:** chaos test for Postgres-down 60s + Vault-decrypt-RPC failure (Toxiproxy weekly).
- **Ghost:** synthetic uptime probe from 2 regions live; sign-off in `operations/uptime-runbook.md`.

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Terra:** status page IaC; cookie-consent CMP provisioned.
- **Watch:** uptime + lifecycle email delivery alerting.
- **Chronicle:** structured audit-log retention partitioning (lands at M5 actually; M4 prep work).
- **Siren:** lifecycle-email-failure escalation.

### Platform (Locale, Edge, Tongue)

- **Locale:** cookie-consent banner regional variants per GDPR + UK PECR + ePrivacy.

### AI (Cortex, Memory, Oracle)

- *(no incremental deliverable)*

### Docs (Scribe, Guide)

- **Scribe:** marketing-site docs page; full ToS / Privacy Policy / Cookie Policy / DPA / Subprocessors / AUP / DMCA / Accessibility Statement / AI System Card v0.1 (placeholder until v1.0 at V1.5).
- **Guide:** in-app help center indexed by Lens for SEO.

### Growth (Signal, Lens, Herald, Hook)

- **Signal — Marketing site LIVE** with all 4+ GTM channels prepped for M5 launch (X, HN, IndieHackers, Discord/Reddit per PRD §15.5).
- **Herald — Email copy frozen for E1–E5** per PRD §6.3 + brand voice doc.
- **Hook — A/B test backlog for landing page** ICE-scored.
- **Lens — UTM passthrough + signup attribution + conversion event funnel** verified end-to-end.

### Operations (Echo, Ledger, Comply)

- **Comply — Cookie consent + AI Act interim machinery verified on marketing site.**
- **Comply — Subprocessor list updated;** Resend (transactional email) added with 30-day change notification.
- **Comply — DMCA agent registration filed with U.S. Copyright Office** — ships at M5 (confirmation gates M5); paperwork prepared in M4.

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 M4 exactly. M0 + M1 + M2 + M3 gates remain green; add:

- [ ] `tests/integration/lifecycle-emails.spec.ts` green — E1 on signup-confirmed; E2 on Surface FAIL; E3 on PASS WITH FIXES; E4 on T-3 re-audit-window expiry; E5 on day-60-inactive-after-FAIL.
- [ ] `tests/integration/can-spam-casl-pecr.spec.ts` green — unsubscribe link; one-click unsub honored within 10 days; identification line present.
- [ ] **WCAG 2.2 AA third-party conformance audit passed** — third-party report at `compliance/wcag-conformance-<vendor>-2026.pdf`; `/accessibility` statement live.
- [ ] `tests/a11y/at-recordings-fail-flow.test.md` — NVDA + VoiceOver recordings of FAIL-verdict primary flow stored in `tests/a11y/at-recordings/m4/`; manual sign-off by Halo.
- [ ] `tests/integration/status-page.spec.ts` green — uptime probe from two regions every 60s; `/healthz` returns 200; 99.5% SLI computable.
- [ ] `tests/acceptance/gdpr-right-to-delete.spec.ts` green — request → 30-day clock → all tenant rows deleted; cryptoshredding key purged; audit log retained.
- [ ] `tests/integration/retention-purge.spec.ts` green — pg_cron daily; expired rows deleted.
- [ ] **Self-dogfood gate M4:** `audits/m4.json` = PASS or PASS WITH FIXES.
- [ ] `0005_lifecycle_emails_audit.sql` applies cleanly to staging.
- [ ] **Marketing site live** at production domain; cookie-consent banner functional; analytics gated by consent.

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| R5 | Customer code retention breach (GDPR/IP) — full e2e validation | Low | Critical | Atlas (cryptoshred) + Comply (retention table) + Cipher (key delete) | M4 close — right-to-delete e2e + retention purge cron green |
| R15 | WCAG conformance audit vendor lead-time | Medium | High | Halo + Comply (engaged at M1 close) | **M4 exit** — report committed |
| **NEW M4** | **WCAG audit finds Critical/Serious violations not caught by axe-core** | Medium | High | Halo + Vega (remediation per vendor SLA) | M4 — conditional pass if mitigations deployable inside milestone |
| **NEW M4** | **CMP / cookie-consent CMP integration delays** | Low | Medium | Locale + Vega | M4 — banner live before marketing site launch |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 M4 row:

- **WCAG 2.2 AA third-party conformance audit signed off** — Halo + vendor.
- **GDPR right-to-delete e2e green** — Atlas + Forge + Comply.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 12 | Marketing site MVP live (staging); E1–E5 cron drafted; `0005_lifecycle_emails_audit.sql` drafted; WCAG audit kickoff | | | |
| 13 | E1–E5 + CAN-SPAM tests green; right-to-delete e2e green; M5 ticket-cut scoping (DMCA paperwork ready) | | | |
| 14 | WCAG audit report received; remediation if any Critical; self-dogfood gate M4; status page live for 7d pre-launch | | | |

## Open questions

For BigBrain to resolve before M4 closes:

- (none mandatory)

## Cross-references

- PRD §16 M4 row + §6.3 lifecycle emails + §14.4 retention + §14.6 a11y + §14.7 AUP.
- `architecture/test-strategy.md` §3 M4 gates.
- `architecture/database/migration-order.md` `0005_lifecycle_emails_audit.sql` row.
- `ia/user-flows/settings-and-account-management.md` (right-to-delete + cookie consent change land at M4).
- `agents/growth/herald-brand-voice.md` (E1–E5 copy).
