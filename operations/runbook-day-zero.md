# Runbook — Day Zero (first on-call shift)

**Owner:** Watch. **Status:** M4 Batch 1 placeholder structure; M5 final content.
**Audience:** Whoever just rotated into on-call primary for the first time.

> **Goal of this doc.** Get a new on-call ready to handle a real page within their first hour. Day-zero is NOT "everything you need to know"; it's "enough to triage and escalate without breaking anything." Deep runbooks are linked per-incident-type.

---

## Pre-shift checklist (do this BEFORE you go on-call)

- [ ] Verify Sentry email alerts arrive at your inbox: send a test from https://sentry.io → Project Settings → Alerts → test rule. You should see it within 60 seconds.
- [ ] Bookmark these URLs:
  - https://app.sentry.io/organizations/studio-zero/issues/ (production filter)
  - https://app.supabase.com/project/studio-zero/database (logs + roles)
  - https://app.vercel.com/studio-zero/studio-zero/deployments (rollback gate)
  - https://dashboard.stripe.com/events (webhook delivery)
  - https://studiozero.dev/status (customer-visible status)
  - https://app.betteruptime.com/ (probe results + incident posting)
- [ ] Confirm you have:
  - Sentry login + 2FA
  - Supabase login + 2FA (project: studio-zero)
  - Vercel login + 2FA (org: studio-zero)
  - Stripe Dashboard read-only role
  - Better Uptime login (for posting incidents)
  - Resend login (for inspecting transactional sends)
  - GitHub org owner (for revoking compromised tokens)
- [ ] Read `runbook-day-zero.md` (this doc) end-to-end.
- [ ] Skim the open incidents list at https://studiozero.dev/status — know what's already broken.
- [ ] Talk to outgoing on-call: any pending follow-ups? Any known flaky areas?

---

## During the shift

### When a P1 page fires

1. **Acknowledge within 15 min.** Reply to the Sentry email or click the "Acknowledge" link.
2. **Open the issue** in Sentry. Read the stack trace + breadcrumbs.
3. **Check the dashboard** at https://studiozero.dev/status — is this affecting customers right now?
4. **Identify scope:**
   - Is it one tenant or many? (Sentry tag: `tenant_id`)
   - Is it one route or system-wide? (Sentry tag: `route`)
   - Is the runner pool healthy? (Better Uptime → "Runner pool" component)
5. **Mitigate first, root-cause second.** The order is always:
   1. Status-page incident posted (https://app.betteruptime.com/ → "Create incident")
   2. Mitigation deployed (rollback, env-var change, feature flag flip)
   3. Customer-comms email if > 100 users affected
   4. Root-cause investigation
   5. Post-mortem (within 7 days, file at `compliance/postmortem-YYYY-MM-DD.md`)

### Common mitigations (in order of frequency expected)

| Symptom                              | First action                                                         |
| ------------------------------------ | -------------------------------------------------------------------- |
| Spike of 500s in `/api/runs/[runId]` | Rollback last Vercel deploy (one-click; preserves DB state)          |
| Stripe webhook signature failures    | Check Stripe Dashboard → Events; reprocess from there                |
| Runner pool degraded                 | Restart Railway service; check `runner_token_mints.revoked_at` count |
| Database connection saturation       | Scale Supabase plan up one notch; ~2 min downtime if pool exhausted  |
| Resend bounce-rate spike             | Pause non-transactional sends via `marketing_consent` admin flag     |

### When NOT to deploy

- Friday after 17:00 local time (unless P1 active).
- Saturday/Sunday unless P1 active.
- The 30-min before a known traffic spike (launch day, scheduled email blast).
- When you are tired, hungry, or angry. The system is fine for 8 more hours; you might not be.

---

## Communication norms

- **Customer comms** for > 100-user impact: post on /status, then send Resend bulk email via `marketing/copy/incident-comm-template.md` (M5 placeholder).
- **Internal comms** at M4 (solo): write the post-mortem; no other internal audience yet.
- **Investor comms** for > 24h outage: BigBrain decides; not the on-call's call to make.

---

## Handoff procedure

End of shift (Mon 09:00 ET):

1. List open incidents (any?) and current status.
2. List unresolved Sentry issues with ack but no fix yet.
3. List any planned maintenance windows in the next 7 days.
4. Outgoing on-call answers questions from incoming for 15 min.
5. Both sign off on `operations/handoffs/YYYY-MM-DD.md` (M5 — tracked in HEAD).

---

## Reference

- `oncall-rotation.md` — schedule + escalation tree.
- `architecture/iac/observability/sentry-alerts.yaml` — alert rules + thresholds.
- `architecture/iac/observability/sentry.md` — Sentry setup + `beforeSend` redaction (so you know why some events look anonymised).
- `architecture/iac/observability/status-page.md` — Better Uptime vendor decision + probe targets.
- `legal/privacy-policy.md` §72h breach SOP — when an incident may be a personal-data breach.

---

_Watch · runbook-day-zero.md · M4 Batch 1 placeholder; M5 final content._
