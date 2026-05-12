# On-Call Rotation — Studio Zero

**Owner:** Watch. **Status:** M4 Batch 1 spec (placeholder structure; week-1 single-rotation).
**Live trigger:** M5 launch — paging rotates per the schedule below from week of launch +1.

> **What this doc covers.** Who is on-call, when, what they answer to, and how to escalate. M4 ships a single-person rotation (Jo) so the alert plumbing can be validated end-to-end before we add second-on-call. The schedule template + escalation tree below are the M5 deliverable structure — Watch fills in names + handles at M5 entry.

---

## Week 1 (M5 launch week)

| Slot                   | Primary                 | Secondary                      | Hours                  |
| ---------------------- | ----------------------- | ------------------------------ | ---------------------- |
| Weekday business hours | Jo (`josinsidevoice@…`) | n/a — solo founder rotation    | Mon-Fri 09:00-18:00 ET |
| Weekday after-hours    | Jo                      | n/a — Sentry pages only for P1 | Mon-Fri 18:00-09:00 ET |
| Weekends               | Jo (best-effort)        | n/a                            | Sat-Sun all-day        |

**Rationale.** At M5 entry there is no second engineer. The plumbing below assumes a multi-person rotation so we can swap in V1.5 hires without changing any alert routing — the env-var aliases the rotation behind a single "primary" / "secondary" notation.

---

## Standard rotation (M5 launch +1 onwards)

| Week of (Mon)  | Primary | Secondary | Notes          |
| -------------- | ------- | --------- | -------------- |
| YYYY-MM-DD     | Jo      | (TBD)     | M5 launch week |
| YYYY-MM-DD +7  | Jo      | (TBD)     |                |
| YYYY-MM-DD +14 | (TBD)   | Jo        | First handoff  |
| YYYY-MM-DD +21 | Jo      | (TBD)     |                |

Rotation cadence: **weekly Mon 09:00 ET handoff** via a 30-min sync. Outgoing primary briefs incoming on any open incidents + unresolved Sentry issues.

---

## What does on-call answer to?

| Source                                     | Channel                | Severity                           | Response SLA        |
| ------------------------------------------ | ---------------------- | ---------------------------------- | ------------------- |
| Sentry P1 alert (see `sentry-alerts.yaml`) | Email + (M5+) SMS      | P1 / page                          | 15 min              |
| Better Uptime down probe (2 consecutive)   | Email + (M5+) SMS      | P1 / page                          | 15 min              |
| Stripe webhook signature-failure burst     | Email                  | P2                                 | 1 hour              |
| Resend bounce-rate > 2% over rolling 1h    | Email                  | P2                                 | 1 hour              |
| GDPR right-to-delete request               | Email (Comply)         | Statutory                          | 30 days (statutory) |
| DMCA takedown notice                       | Email (Comply)         | Statutory                          | 14 days (statutory) |
| Customer support (M5+)                     | support@studiozero.dev | P3 default; P1 if payment-blocking | 1 business day      |

---

## Escalation tree

```
P1 page fires
    |
    +-- Primary acknowledges within 15 min   ----> handle per runbook
    |
    +-- No ack within 15 min
            |
            +-- Secondary paged             ----> handle per runbook
            |
            +-- No ack from secondary within 15 more min
                    |
                    +-- BigBrain email     ----> emergency override
```

At M5 (solo) the "secondary" slot is a 30-min delayed re-page to the same primary — pragmatic for one-person teams; the schedule above stands as soon as the rotation has two people.

---

## Runbooks linked from this rotation

- **`runbook-day-zero.md`** — the boot-up runbook every new on-call reads on first day.
- **`runbook-postgres-down.md`** — M5 (placeholder).
- **`runbook-runner-pool-degraded.md`** — M5 (placeholder).
- **`runbook-stripe-webhook-failure.md`** — M5 (placeholder).
- **`runbook-resend-bounce-spike.md`** — M5 (placeholder).
- **`runbook-gdpr-right-to-delete.md`** — M5 (placeholder; spec already in `legal/privacy-policy.md`).

---

## Time-off + coverage policy (M5+)

- **Planned PTO**: announced in handoff sync; the incoming primary swaps weeks via a single-line PR to this doc.
- **Sick day / emergency**: secondary becomes primary for the day; if no secondary available, BigBrain emergency override.
- **Vacation > 1 week**: must be coordinated with all current on-call to maintain double-coverage. At M5 (solo) this means a planned status-page maintenance window.

---

## Compensation note

Solo founder rotation at M5: no separate compensation (founder equity covers). V2+ rotation when hires land: $200/week on-call stipend + comp time. Tracked in `finance/compensation.md` (M5 update).

---

_Watch · oncall-rotation.md · M4 Batch 1 spec; live rotation from M5 launch +1._
