# Milestone M5 — Public launch

**Target:** week 16 (placeholder per PRD §16)
**Lead:** Sprint + BigBrain (Phase 10 launch coordination)
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS (not PASS WITH FIXES) per `BUILD_FLOW.md` Phase 10. Self-dogfood gate M5 (full audit). **Any FAIL halts launch.**

## Scope (one-line)

Public launch. DMCA Designated Agent registered. At least 4 GTM channels active. Day-zero runbook signed off. Full regression matrix re-run.

## Entry prerequisites

- M0 + M1 + M2 + M3 + M4 exit gates green (regression guard).
- WCAG conformance report signed (M4 exit).
- DMCA paperwork ready (M4 work).
- Marketing site live on staging at M4 close; flipping to production at M5.
- 4+ GTM channels prepped at M4 (build-in-public threads + Show HN draft + IndieHackers post + Discord presence).

## Deliverables per layer

### Strategy

- **Sprint:** day-zero runbook reviewed; on-call rota set; week-1 post-launch standup cadence agreed.
- **Scout:** 4+ channels active — first-post URLs timestamped in `marketing/launch-checklist.md`.
- **Penny:** unit economics dashboard live in production; first 5-paying-customer pricing review queued (R10).

### Audit (Jury + 6 reviewers)

- **Jury:** **Self-dogfood gate M5 (full audit)** — verdict in `audits/m5.json`. **Any FAIL halts launch per BIGBRAIN.md Hard Rule §1.**
- **All 6 reviewers** run a comprehensive audit of the production site before launch.

### Backend (Forge)

- **Forge:** production deploy of all M0–M4 surfaces. Rollback path tested in chaos-week 0.
- **Forge:** first synthetic uptime probe green for 7 days pre-launch.

### Frontend (Vega)

- **Vega:** marketing site flipped to production domain.
- **Vega:** in-app onboarding flow polish + final brand consistency review.

### Design (Canvas, Pixel)

- **Pixel:** launch-day social-post visuals + Product Hunt assets.

### Data (Atlas)

- **Atlas — `0006_dmca_and_retention.sql` lands** (per migration-order.md M5 row): DMCA `takedown_requests` table; `audit_logs` 7-year retention partitioning; `breach_events` MFA-gated admin RPC hardening; `data_exports.expires_at` 90-day pg_cron purge.

### Security (Shield, Cipher, Verify)

- **Verify:** **all M4 gates remain green** — full regression matrix re-run on a staging that mirrors prod.
- **Shield:** day-zero incident response readiness — on-call rota; PagerDuty escalation; Critical SLA per threat-model §5.4.

### Quality (Probe, Crash, Ghost)

- **Crash:** rollback path tested in chaos-week 0.
- **Ghost:** synthetic uptime probe green 7 days pre-launch.

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Pipeline:** production CI pipeline locked; on-call merge approval required.
- **Watch:** Sentry + PostHog + structured logs in production; first 30-day intensive monitoring rota.
- **Chronicle:** structured audit log retention partitioning live (lands in `0006_dmca_and_retention.sql`).
- **Siren:** incident-response runbook reviewed by on-call.
- **Meter:** unit economics dashboard live; Penny + Watch consume daily.

### Platform (Locale, Edge, Tongue)

- **Locale:** regional refund matrix verified live for EU + UK + CA + US.
- **Edge:** Cloudflare WAF rules tuned for free-tier abuse prevention (R12 follow-on).

### AI (Cortex, Memory, Oracle)

- **Cortex:** model pins confirmed for production.
- **Oracle:** AI System Card v0.1 placeholder at `/system-card` — full v1.0 ships at V1.5.

### Docs (Scribe, Guide)

- **Scribe:** `operations/runbook-day-zero.md` reviewed by on-call.
- **Guide:** in-app help center indexed by Lens; final SEO pass.

### Growth (Signal, Lens, Herald, Hook)

- **Signal:** ≥4 GTM channels active — first-post URLs committed to `marketing/launch-checklist.md`.
- **Herald:** launch announcement copy locked.
- **Hook:** Day-1 A/B test variants live on landing page.
- **Lens:** funnel attribution validated; UTM passthrough working in production.

### Operations (Echo, Ledger, Comply)

- **Comply — DMCA Designated Agent registered with U.S. Copyright Office** — confirmation at `compliance/dmca-agent.pdf`; `/dmca` route renders contact info.
- **Comply:** AUP + ToS + Privacy Policy + Cookie Policy + Subprocessor List + DPA template all live.
- **Comply:** Stripe webhooks verified in prod; refund matrix gated by region.
- **Ledger:** first paid charge live (Managed tier — M2 wired, M5 launches publicly).

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 M5 + `BUILD_FLOW.md` Phase 10. M0 + M1 + M2 + M3 + M4 gates remain green; add:

- [ ] **DMCA Designated Agent registered** — `compliance/dmca-agent.pdf` (U.S. Copyright Office confirmation); pipeline asserts file presence + `/dmca` route renders contact info.
- [ ] **At least 4 GTM channels active** — `marketing/launch-checklist.md` enumerates ≥4 with timestamped first-post URL; CI scrapes count.
- [ ] **All M4 gates remain green** — full regression matrix re-run on a staging that mirrors prod.
- [ ] **Self-dogfood gate M5 (full audit):** `audits/m5.json` = PASS or PASS WITH FIXES. **Any FAIL halts launch per `BUILD_FLOW.md` §"Audit Cadence."**
- [ ] **Day-zero runbook reviewed by on-call** — `operations/runbook-day-zero.md` reviewed; rollback path tested in chaos-week 0.
- [ ] **Synthetic uptime probe green** for 7 days pre-launch.
- [ ] `0006_dmca_and_retention.sql` applies cleanly to staging.

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| R8 | Studio Zero ships a build with a bug we should have caught (M5 self-dogfood FAIL) | High | Medium | Sprint + Jury — gate halts launch | M5 close |
| R10 | Pricing positioning misread — first read at first 5 paying customers | Medium | Medium | Penny | M5 + 30d (review) |
| **NEW M5** | **Day-1 traffic spike DoS via free-tier abuse** | Medium | High | Pipeline (Cloudflare WAF) + Forge (per-IP + per-tenant rate limits) | M5 — Cloudflare rules tuned pre-launch |
| **NEW M5** | **Incident on launch day or T+1..T+7** (PRD §16 says T+1 to T+7 is the hard window, not T-0) | High | High | Watch + Crash + Shield (24h Critical SLA) | M5 — on-call rota active; runbook signed off |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 M5 row:

- **DMCA Designated Agent registration** — Comply.
- **≥4 GTM channels active** — Signal.
- **Day-zero runbook on-call sign-off** — Watch + Sprint.
- **Self-dogfood gate M5 PASS** — Jury.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 15 | Production deploy to staging; full regression re-run; DMCA paperwork finalized; chaos-week 0 + rollback test | | | |
| 16 | T-7 prep; T-3 marketing review; T-1 alerting confirmation; T-0 launch; T+1 daily standup begins; self-dogfood M5 PASS | | | |

## Open questions

For BigBrain to resolve before M5 closes:

- (none mandatory)

## Cross-references

- PRD §16 M5 row + §14.5 compliance (DMCA, AI System Card) + §15 success metrics + §15.5 GTM channels.
- `BUILD_FLOW.md` Phase 10 — exit gate.
- `architecture/test-strategy.md` §3 M5 gates.
- `architecture/database/migration-order.md` `0006_dmca_and_retention.sql` row.
- `marketing/launch-checklist.md` (CI scrapes channel count).
- `operations/runbook-day-zero.md` (signed off by on-call).
