# Release Checklist + Rollback Plan

**Owners:** Pipeline (CI/CD), Sprint (project state), Siren (incident response if rollback fires)
**Applies to:** every production release of every vertical

Drop a copy of this checklist into your project's release ticket and check items off as you go. Don't merge a "ready for release" PR with un-ticked items.

---

## 1. Pre-flight (T-24h)

### Audit gate
- [ ] **Audit verdict on file:** `shared_context/audits/<project>/<latest>/verdict.md` reads `PASS` or `PASS WITH FIXES`
- [ ] All Critical / Blocker findings closed by the **originating reviewer** (not the creator) — confirm via `node audit-action.js list <project>` showing zero `open` or `fixed` items at those severities; only `verified`
- [ ] If `PASS WITH FIXES`, BigBrain has acknowledged the remaining Major findings and tracked them in Sprint's backlog

### Code & tests
- [ ] All CI workflows green on the release commit (build, typecheck, lint, tests, dependency audit)
- [ ] Lighthouse score ≥ 90 mobile / ≥ 95 desktop on key routes (per `checklists/web-vitals.md`)
- [ ] axe-core a11y violations: zero (per `checklists/wcag-aa.md`)
- [ ] `npm audit --audit-level=high` clean (per `checklists/owasp-top-10.md`, Verify's SLA)
- [ ] Manual smoke: signup → primary action → checkout (if applicable) on a real device

### Database
- [ ] Migrations reviewed by Atlas (or whoever owns the schema)
- [ ] Migrations dry-run on a copy of production data, not just an empty DB
- [ ] **Multi-step destructive migrations** broken up: add column → migrate data → switch reads → drop old column (per code-standards.md)
- [ ] Backup taken right before deploy (Keeper) — verify it's restorable (don't ship until you've actually tested a restore in the past 30 days)

### Feature flags
- [ ] Risky features behind a flag — set to `false` by default
- [ ] Rollout plan documented: % rollout schedule, kill-switch criteria

### Comms
- [ ] Status page set to "Maintenance" or "Operational" as appropriate
- [ ] Customer comms drafted (if user-visible change) — coordinate Echo + Herald
- [ ] Internal notice sent (Slack / email) — who's on point, when, what changes

---

## 2. Deploy (T-0)

- [ ] Pipeline runs the deploy workflow
- [ ] Watch the deploy in real time — if it stalls > 2x typical duration, abort and investigate
- [ ] Post-deploy health check: hit a known endpoint that exercises DB + auth + a typical API call; expect 200 in < 1s
- [ ] Verify Watch's dashboards register the new release version
- [ ] Verify Sentry's release-health auto-creates a release entry
- [ ] Verify the deploy commit SHA matches the release tag

---

## 3. Post-deploy verification (T+15min)

- [ ] **Smoke the primary user flow** as a real user — sign in, do the headline action, see the result
- [ ] **Watch the error rate** — should not climb above baseline within 15 min
- [ ] **Watch latency p95** — should not climb above baseline within 15 min
- [ ] **Watch conversion-funnel events** (Lens) — signup / paid-conversion events firing at expected rate
- [ ] **Stripe dashboard** (if commerce/billing) — no spike in failed payments
- [ ] **Sentry** — no new error class above baseline
- [ ] **Customer support inbox** (Echo) — no spike in confused users

If any of these fire, **proceed to Rollback (§5)**.

---

## 4. T+24h check-in

- [ ] Error rate, latency, conversion all within baseline
- [ ] Audit team's flagged Majors logged for next release
- [ ] Postmortem queued **if** anything went unexpectedly (per Siren's protocol — blameless, action-itemed)
- [ ] Update `state.json` to `complete` for this release: `node state-machine.js update <slug> phase=complete`
- [ ] Capture the release as a case study under `shared_context/projects/<slug>/case-study-<date>.md`

---

## 5. Rollback Plan

A rollback is a deploy. Apply the same care.

### Trigger criteria (any one)
- Error rate > 2× baseline for > 5 min
- Latency p95 > 2× baseline for > 5 min
- Critical user flow broken (signup, checkout, core action)
- Data corruption or loss observed
- Security incident (in which case Shield + Siren co-own the response)

### Steps

1. **Declare incident** (Siren) — open the channel / ticket / status-page entry within 5 min
2. **Mitigate first, diagnose second.** Roll back to the previous good release immediately:
   - Vercel: `vercel rollback <previous-deployment-url>` OR redeploy the previous commit
   - Self-hosted: `git checkout <previous-tag> && deploy`
   - Database migrations: **do not** roll back DB if the migration was destructive; instead, hold the rollback at the app layer and write a forward-fix
3. **Verify rollback worked** — same health checks as post-deploy verification (§3)
4. **Update status page** with what happened, what's done, what's next
5. **Postmortem within 5 working days** — blameless, with action items + owners + deadlines

### What NOT to do during a rollback

- Don't deploy a fix forward in panic — roll back to known good, then take time to fix
- Don't blame an individual — every incident has systemic contributors
- Don't skip the postmortem because "we already know what happened" — write it down or it repeats

---

## Per-vertical extras

- **SaaS:** verify webhooks (Stripe, Resend) still receive after deploy; flag if signature verification breaks
- **E-commerce:** order processing pipeline end-to-end test + Stripe reconciliation within 1h
- **Marketing site:** social-share preview check (paste URL into Slack/Discord — confirm OG image renders) per audit Blocker B-5 from motionmax
- **Mobile (Expo):** EAS Update for OTA fixes; full app store re-submission only if native code changed
- **Native iOS:** TestFlight beta first, then phased App Store rollout (1% → 5% → 25% → 100% over 7 days)
- **Gaming web:** frame-rate telemetry from production users, not just lab data
- **VR:** test on the actual headsets you target — not just desktop preview
- **Blog:** RSS feed validates; sitemap reachable; OG images render in social previews
