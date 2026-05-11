# Studio Zero Productization — Decisions Log

Per `BIGBRAIN.md` Hard Rule §3 ("no silent decisions"), every cross-phase decision lands here with rationale. PRD §17 holds the PRD-scoped decisions (D1–D20); this file logs the *cross-phase* decisions that don't belong in the PRD itself.

---

## Phase 3 — Information Architecture (2026-05-11)

### IA-D1 · Onboarding step order: mode pick BEFORE GitHub App install
- **Owner:** BigBrain (resolving Optic↔Trace coordination question)
- **Rationale:** Mode pick is universal — every customer chooses one. GitHub install is mode-specific (BYOK + Managed need it; CLI does not). Putting the mode pick first lets the system suppress GitHub install entirely for CLI customers, removing friction and respecting Hick's Law by surfacing only relevant choices. Reverse order would force CLI customers through a GitHub flow they'll never use.
- **Reviewers:** Optic (sitemap aligned), Trace (signup-to-first-verdict.md aligned), Compass (P2 technical-CLI persona served).
- **Affects:** `ia/sitemap.md` `/auth/install/github`, `ia/user-flows/signup-to-first-verdict.md` S3→S4 transition.

### IA-D2 · E2 upsell surface: full route, not modal
- **Owner:** BigBrain
- **Rationale:** Back-button accessibility per SC 2.4.11 + shareable URL for marketing receipts (`/app/audits/<run>/upgrade` can be linked in support emails). Modal would lose both. Halo confirmed modal-as-route is viable but adds spec burden; for the highest-leverage upsell surface, a real route is simpler.
- **Reviewers:** Optic, Trace, Halo (no SR-trap risk on full route), Hook (conversion-equivalent in Hook's analysis if the route loads in <500ms TTFB per PRD §14.1).
- **Affects:** `ia/sitemap.md` `/app/audits/[run-id]/upgrade`, `ia/user-flows/verdict-to-upsell-loop.md` V1a state.

### IA-D3 · Re-audit redemption surface: top-level `/app/projects/[id]/re-audit`
- **Owner:** BigBrain
- **Rationale:** Customer mental model is "I'm re-auditing the project," not "I'm re-running this specific audit run." Project-scoped also handles D2 unlimited Surface re-audits correctly — the project is the entitlement boundary, not the run. Run-scoped would conflict with multi-run-per-project semantics in V2.
- **Reviewers:** Optic, Trace, Compass (P3 indie-agency multi-project mental model honored).
- **Affects:** `ia/sitemap.md` `/app/projects/[id]/re-audit`, `ia/user-flows/verdict-to-upsell-loop.md` V3 + V4 transitions.

---

## Surfaced for PRD v0.5 (Phase 3 → PRD evolution candidates)

These three edge cases surfaced during Phase 3 are NOT in PRD v0.4 and need to land in v0.5 or be explicitly accepted as out-of-MVP-scope:

### PRD-v0.5-C1 · Jury synthesis stall escape hatch
- **Trigger:** `audit-run-state-machine.md` state `jury_synthesizing` is currently cancel-disabled on a bounded ETA (<30s). If synthesis stalls >30s on Comprehensive depth at scale, no cancel affordance exists — Trace red-line violation.
- **Options:**
  - A. Add 30s timeout → mark run as `failed_synth_timeout` → token refund per PRD §14.2 → user offered restart.
  - B. Keep bounded-ETA exemption but spec a 60s hard timeout in PRD §14.2 with explicit fallback verdict ("incomplete · check back later").
  - C. Allow cancel-mid-synth (loses agent partial outputs that are otherwise queued for archival).
- **Recommendation:** A. Simplest contract; aligns with §14.2 retry semantics.
- **Decision:** open · needs Jo + Sprint call before Phase 4.

### PRD-v0.5-C2 · EU 14-day cooling-off window reset on upgrade
- **Trigger:** D20 regional refund matrix is silent on what happens when an EU customer upgrades mid-cooling-off-window. Two legal interpretations: (a) window resets on each new contract; (b) window is per-customer-relationship and doesn't reset.
- **Options:**
  - A. Customer-friendly: window resets on every upgrade. Easy to operate; modest revenue risk.
  - B. Strict: window is per-customer-relationship; upgrades do not reset.
- **Recommendation:** A. Aligns with Studio Zero's audit-tool brand posture (transparency over revenue protection).
- **Decision:** open · needs Comply + Ledger call before paid charges go live (M2 gate).

### PRD-v0.5-C3 · GitHub App uninstall AFTER V1.5 PR opened
- **Trigger:** `fix-delivery-prflow.md` EC-5. The PR persists in the customer's repo; we lose webhook visibility into merge status. D1 (GitHub App with per-repo permissions) prevents long-lived OAuth tracking.
- **Options:**
  - A. Accept stale tracking. UI shows "tracking unavailable — reinstall GitHub App to resume." Honest, low-friction.
  - B. Long-lived OAuth grant for merge-status read-only — violates D1's blast-radius rationale.
  - C. Webhook deliveries via Studio Zero proxy that customer's GitHub Action posts — adds infra burden but preserves D1.
- **Recommendation:** A for MVP; revisit at V2 if attach rate justifies C.
- **Decision:** open · needs decision before V1.5 spec freeze.

---

*Decisions log v0.1. Update as new cross-phase decisions land. Never delete — supersede with new IA-Dn entries that link back.*
