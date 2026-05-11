# Studio Zero — Sprint Plan (Phase 6)

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Sprint (Strategy layer — project manager)
**Phase:** BUILD_FLOW.md Phase 6
**Status:** First-cut. Lands in lockstep with Atlas's migration order, Verify's test-strategy, Shield's threat model, Axiom's ARCH-Dn decisions, and the Phase-5 Jury verdict (PASS WITH FIXES — 3 Blockers, 4 Criticals, 6 Majors all tied to M0 reconciliation tickets below). Refined weekly after M0 lands.

---

## What is in this folder

| File | Purpose |
|---|---|
| `milestone-M0.md` | Spike + Phase-5 reconciliation. Binary M0 exit gate. |
| `milestone-M1.md` | Audit MVP (BYOK only). The wedge ships here. |
| `milestone-M2.md` | Managed mode + Stripe billing + GDPR DPA. Revenue starts. |
| `milestone-M3.md` | CLI mode + external pentest + deployed-URL paid SKU. |
| `milestone-M4.md` | Lifecycle emails + WCAG 2.2 AA conformance audit + status page. |
| `milestone-M5.md` | Public launch. DMCA agent registered. 4 GTM channels active. |
| `milestone-V1-5.md` | Auto-PR fix delivery. AI System Card v1.0. Art. 50 in PR body. |
| `milestone-V2.md` | Build mode + Firecracker microVM graduation. |
| `milestone-V2-1.md` | Scaffold/MVP code generation. Audit-gated. |
| `owner-matrix.md` | Every decision (PRD D1–D23, IA-D1/2/3, ARCH-D1..D10, PRD-v0.5-C1/2/3) mapped to owner + milestone deadline. PLUS the PRD §19 risk register mapped the same way. |
| `burndown.md` | Weekly burndown template. Filled live during execution. |

## One-line scope per milestone (from PRD §16, re-anchored to Phase-5 outputs)

| MID | Target | Scope (one-line) |
|---|---|---|
| **M0** | week 2 | Schemas, fixtures, RLS scaffold, Phase-5 Jury Blockers fixed, IaC provisioned, AI-Act interim disclosure header live on the first synthetic run. |
| **M1** | week 6 | Audit MVP (BYOK only) — GitHub-App audit, Surface + Code SKUs, Quick + Comprehensive depths, sandbox at rootless+seccomp+egress, all four Decision-D9 corpora green. |
| **M2** | week 9 | Managed mode + Stripe billing + per-tenant token caps + GDPR Art. 28 DPA + subprocessor list + EU/UK cooling-off + Decision D21 synth-stall + sandbox-escape top-30 + PI corpus ≥200. |
| **M3** | week 11 | CLI mode + local-folder audits + deployed-URL paid SKU + `Private Run · Self-Audited` watermark + **first external pentest** (≤1 Major, 0 Critical). |
| **M4** | week 14 | E1–E5 lifecycle emails + marketing site + status page + **WCAG 2.2 AA third-party conformance audit** + GDPR right-to-delete e2e + retention purge cron. |
| **M5** | week 16 | Public launch + DMCA Designated Agent registered + ≥4 GTM channels active + day-zero runbook signed off + full regression matrix re-run. |
| **V1.5** | week 22 | Auto-PR fix delivery, gated by Jury re-audit, Art. 50 disclosure in every PR body, AI System Card v1.0 published, GitHub-App-uninstall-after-PR banner. |
| **V2** | week 28 | Build mode (roadmap + docs + seeded repo + live dashboard + score). **Firecracker microVM graduation** after second clean external pentest. |
| **V2.1** | week 34 | Scaffold/MVP code generation. Audit-gated. <30min clean-VM bootstrap. Offline-mode network-tap proves no code POSTed externally. |

## Hard rules Sprint will not bend

1. **Every exit gate is BINARY and AUTOMATION-CHECKABLE.** "Feature complete," "looks good," "the team is happy" — all reject. Acceptable forms: `pnpm test X` green; file Y exists in HEAD with sha256 Z; nightly p95 SLO over rolling 7d green; external pentest report committed with ≤1 Major / 0 Critical; third-party WCAG conformance report signed.
2. **One owning agent per deliverable.** Supports are listed separately. Coordination is BigBrain's job; ownership is one name.
3. **Self-dogfood gate at every milestone M1 → V2.1.** Studio Zero audits its own milestone codebase via the runner. PASS or PASS WITH FIXES (score ≥70). FAIL halts the milestone per `BIGBRAIN.md` Hard Rule §1.
4. **No softening findings to meet a deadline.** Verdicts ship the way Jury delivered them. Escalation path: layer lead → BigBrain → Jo.
5. **Schemas-as-files, not schemas-as-prose.** Every spec a milestone depends on must exist as a committed file at the milestone it gates. Where a file does not yet exist, the cross-reference reads `(to be authored at <MID>, owner: <agent>)`.
6. **Decisions tied to milestone deadlines.** Every still-open D/ARCH-D/IA-D/PRD-v0.5-C decision in `PRD.md` §17, `architecture/decisions.md`, or `shared_context/projects/studio-zero-productization/decisions.md` is named in the milestone where it must close. See `owner-matrix.md`.
7. **Realism on calendar.** PRD §16 weeks are placeholders. Sprint sizes the scope per milestone such that a real engineering team can plausibly ship it. Where scope risk exists, Sprint calls it out in that milestone's Risks section.

## How the milestones compose

```
M0 ──► M1 ──► M2 ──► M3 ──► M4 ──► M5 ──► V1.5 ──► V2 ──► V2.1
spike  audit  $$     CLI    polish launch  Auto-PR  build  scaffold
       MVP    +DPA   +pen-                 +Card    +Fire- (audit-
                     test                  v1.0    cracker gated)
```

Phase-5 Jury verdict: **PASS WITH FIXES**. Three Blockers (B1 `runs.tracking_state` enum, B2 `fix_pr_state` missing `reaudit_passed`, B3 runner JWT TTL conflict) and four Criticals (C1 TB-numbering reconciliation, C2 mint endpoint naming, C3 `notifications` table, C4 `tenant_settings.retention_days` rename) all ticketed as **M0-week-1 prep work** below.

## Cross-references

- `PRD.md` v0.5 — §4 MVP goals, §11 fix delivery, §14 NFRs, §16 milestones, §17 decisions, §18 test strategy, §19 risks
- `BUILD_FLOW.md` Phase 6 — exit gate Sprint owns
- `architecture/decisions.md` — Axiom ARCH-D1..D10
- `architecture/database/migration-order.md` — Atlas's 6-migration plan tagged to M0–M5
- `architecture/test-strategy.md` — Verify's §3 per-milestone gate matrix (the source of truth for every exit gate below)
- `architecture/threat-model.md` — Shield's corpora inventory, TB-1..TB-15 (Shield's numbering wins per Jury C1)
- `architecture/system-diagram.md` — what runs where
- `shared_context/projects/studio-zero-productization/decisions.md` — IA-D1/2/3, PRD-v0.5-C1/2/3
- `shared_context/projects/studio-zero-productization/phase5-audit-jury.md` — gate verdict driving M0 fix tickets
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` — Fix-1..Fix-5 ticketed below

---

*Sprint plan v1.0. Update the burndown weekly. Update milestone files at the close of each retro. Never delete — supersede with a vN+1.*
