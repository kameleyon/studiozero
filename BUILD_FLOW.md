# Studio Zero — Build Flow Master File

**Version:** 0.1
**Date:** 2026-05-10
**Owner:** BigBrain
**Status:** Living document. Updated after every project, every phase, every Jury verdict. The flow is the product.

---

## Purpose

This file documents Studio Zero's repeatable build flow — how an idea becomes a production-ready, audit-passing product. It exists for three reasons:

1. **Consistency** — every project Studio Zero ships follows the same phase order, the same audit gates, the same lessons-learned discipline.
2. **Teachability** — new agents joining the system read this file first. It is the onboarding spec.
3. **Productization** — when V2 Build mode launches, the bundle Studio Zero delivers to customers references this flow as the methodology.

The flow is **derived from Studio Zero auditing itself** during the productization project. Every entry in the lessons-learned log is grounded in a real verdict from a real Jury run — not theory.

---

## Hard Rules

These never bend. They predate the flow; they constrain it.

1. **No project ships without a Jury verdict.** `PASS` or `PASS WITH FIXES` only. `FAIL` halts the phase.
2. **No silent decisions.** Every cross-phase decision is logged with rationale in `shared_context/projects/<slug>/decisions.md`.
3. **One voice to the customer.** Only BigBrain speaks to the customer. Layer leads escalate through BigBrain, not around it.
4. **Auditors flag, never fix.** Independence of the audit layer is the wedge. A reviewer who edits code becomes a builder; the audit loses meaning.
5. **Production-ready from day one.** No "we'll fix it later." Every phase exits with the deliverable usable by the next phase without rework.

---

## The 10-Phase Flow

```
[1] PRD Lock
       │
       ▼
[2] Brand Identity ◄────────┐
       │                    │
       ▼                    │
[3] Information Architecture │
       │                    │
       ▼                    │
[4] Visual Design           │  (loops back to [2] if Canon flags brand drift)
       │                    │
       ▼                    │
[5] Tech Architecture       │
       │                    │
       ▼                    │
[6] Sprint Plan             │
       │                    │
       ▼                    │
[7] Finance Plan            │
       │                    │
       ▼                    │
[8] GTM Plan                │
       │                    │
       ▼                    │
[9] Build ──────── Jury after every milestone ─────► milestone fail loops back to [6]
       │
       ▼
[10] Public Launch (Jury full audit + DMCA/AUP/AI System Card + GTM go-live)
```

---

### Phase 1 — PRD Lock

**Lead:** BigBrain (drafts) + Axiom (architecture review) + Penny (pricing review) + Sprint (milestone plausibility)

**Coordinates:** strategic agents (Axiom, Penny, Sprint, Scout) plus audit panel (Jury, Optic, Halo, Proof, Compass, Trace, Canon) plus operations (Comply, Cipher, Shield) for second-pass review.

**Inputs:** customer brief (or for Studio Zero's own productization, Jo's intent), competitive context, regulatory context, prior-art lessons (`shared_context/projects/_case-studies/`).

**Outputs:**
- `PRD.md` versioned and dated
- `shared_context/projects/<slug>/prd-review-v0X-<agent>.md` — one file per reviewing agent
- `shared_context/projects/<slug>/decisions.md` — locked decisions log
- D-N open-decisions list with owner + deadline for each

**Jury Exit Gate (binary):**
- All Blockers from the latest review panel closed
- All FAIL-voting agents have explicitly signed off as PASS or PASS WITH FIXES on the latest revision
- No open Critical without an owner + ETA in `decisions.md`

**Process:**
1. BigBrain drafts PRD v0.1 from customer brief.
2. Dispatch v0.1 review panel — minimum 6 agents covering strategy + architecture + audit + security + compliance + pricing.
3. Apply Blocker/Critical fixes → v0.2.
4. Dispatch v0.2 review panel from fresh angles — agents who haven't reviewed yet (UX, a11y, copy, lifecycle, competitive, test, growth).
5. Apply v0.2 findings → v0.3 → v0.4 until all FAIL-voting agents sign off.
6. BigBrain presents to customer with locked decisions + still-open decisions clearly flagged. Customer's call resolves remaining opens.
7. PRD locked. Phase 2 begins.

**Lessons learned (from Studio Zero's own PRD productization, May 2026):**
- Two review panels are better than one. Different agent sets surface different findings; convergence across two panels is the strongest signal that v0.X is ready to ship.
- D-N open decisions surface architectural disagreement faster than long debate threads. Force a vote per agent.
- `score_engine_version` and `audit-output.v1.schema.json` must exist as files at PRD-lock, not at M0-spike. A schema described in prose isn't a contract.

---

### Phase 2 — Brand Identity

**Lead:** Pixel (visual brand) + Herald (verbal brand)

**Coordinates:** Canvas (component direction), Canon (consistency audit ownership), Tongue (locale variants), Comply (trademark + claim substantiation).

**Inputs:** PRD §1 one-line product statement, PRD §3 problem framing, PRD §5 target users, PRD §3a competitive landscape.

**Outputs:**
- `brand/logo/` — primary + secondary lockups in SVG (light, dark, monochrome)
- `brand/tokens.json` — color, type, spacing, radius, motion tokens
- `brand/voice.md` — owned by Herald; reading-level target, banned-word list, tone examples, channel-specific deltas
- `brand/usage-rules.md` — clear-space, minimum-size, prohibited uses
- 3 sample applications (landing hero, in-app screen, social post) showing the brand in context

**Jury Exit Gate (binary):**
- Canon verdict: brand consistency PASS
- Compass verdict: audience alignment PASS (brand resonates with §5 personas)
- Halo verdict: WCAG 2.2 AA contrast PASS on every token combination shipped
- `brand/voice.md` examples cover at least: landing H1, in-app primary CTA, FAIL-verdict body copy, transactional email subject line, error message, social post

**Process:**
1. Pixel proposes 2–3 visual directions referencing competitive landscape (§3a).
2. Herald authors voice doc in parallel with 3 sample applications.
3. Canon reviews each direction for consistency; Compass reviews for audience fit; Halo reviews tokens for contrast.
4. BigBrain presents direction options + audit summaries to customer.
5. Customer picks one. Pixel finalizes tokens; Herald finalizes voice doc.
6. Phase 3 begins.

**Lessons learned:**
- Brand voice doc is non-negotiable. Engineering teams will ship product copy without it and the brand will rot within the first month.
- Lock token color hexes early. Templates ship default oranges (`#F5B049` is the canonical offender) and they leak into production unless tokens override on import.
- Reading-level target → write to grade 8 unless audience is specifically technical. Herald enforces.

---

### Phase 3 — Information Architecture

**Lead:** Optic (UX/UI lead) + Trace (flow logic)

**Coordinates:** Canvas (component implications), Halo (a11y of navigation patterns), Compass (audience friction model).

**Inputs:** PRD §6 product surface, PRD §7 user workflows, locked decisions from Phase 1 + 2.

**Outputs:**
- `ia/sitemap.md` — all routes, with role-gating per route
- `ia/user-flows/` — one diagram per critical flow (signup, first audit, verdict, upgrade, settings, billing, cancel)
- `ia/empty-states.md` — every empty/zero/error state enumerated with copy + CTA
- `ia/heuristic-budget.md` — Hick's Law combinatorics check on every decision surface

**Jury Exit Gate (binary):**
- Optic verdict: no Hick's Law violation > 7 choices on any single decision surface
- Trace verdict: no flow has dead-ends (every state has a forward action OR a back/cancel affordance)
- Halo verdict: every navigation pattern has keyboard equivalent + screen-reader pattern documented
- Empty states cover: zero-data, error, payment-required, permission-denied, offline, loading

**Lessons learned:**
- Watch for combinatorial explosions in intake (e.g., 3 methods × 3 SKUs × 3 depths = 27 paths). Collapse to 2-step pickers with smart defaults.
- "First-run" empty state is the highest-leverage onboarding moment. Treat it as a hero design surface, not an afterthought.
- Build dashboards and audit dashboards should reuse mental models, not invent new ones. Push complexity into the app, not the user (Tesler's Law).

---

### Phase 4 — Visual Design

**Lead:** Canvas (component library) + Pixel (high-fidelity screens)

**Coordinates:** Halo (a11y review of every component), Canon (brand consistency audit), Optic (heuristic re-review on the rendered design).

**Inputs:** brand tokens (Phase 2), sitemap + user flows (Phase 3), reference templates (e.g., `project-template/` if customer provides one).

**Outputs:**
- `design/components/` — every component in the library, with `<th>` accessibility annotations
- `design/screens/` — every screen in the sitemap, at desktop + tablet + mobile breakpoints
- `design/states/` — interaction states for every component (hover, active, focus, disabled, error, loading)
- `design/motion.md` — motion tokens + `prefers-reduced-motion` handling

**Jury Exit Gate (binary):**
- Halo verdict: WCAG 2.2 AA on every component AND every screen — including new SCs (2.4.11, 2.4.13, 2.5.7, 2.5.8, 3.3.7, 3.3.8)
- Canon verdict: 100% token usage (no hardcoded hexes, no off-grid spacing)
- Optic verdict: heuristic check on the rendered design (visibility of system status, error prevention, recognition over recall)
- All screens render at 320 CSS px width without horizontal scroll (SC 1.4.10)
- All interactive controls ≥24×24 CSS px (SC 2.5.8)

**Lessons learned:**
- The FAIL-verdict screen is the activation moment. Spec its visual hierarchy, copy, and a11y with the same rigor as the landing hero.
- Stripe Elements embed is an a11y trap; default to Stripe Checkout hosted unless there's a power-user reason.
- Score breakdown charts (radar/bar) MUST ship with a semantic `<table>` fallback — chart-only fails SC 1.1.1.

---

### Phase 5 — Tech Architecture

**Lead:** Axiom (architecture decisions) + Arch (codebase structure) + Atlas (data layer)

**Coordinates:** Shield (security threat model), Cipher (encryption strategy), Pipeline (CI/CD), Terra (IaC), Crash (resilience patterns).

**Inputs:** PRD §13 technical architecture, PRD §14 NFRs, design system (Phase 4).

**Outputs:**
- `architecture/system-diagram.md` — components + data flow + trust boundaries
- `architecture/schemas/` — every JSON schema referenced by the runner contract (`audit-output.v1.schema.json`, `audit-event.v1.ts`, `score_engine.v1.json`)
- `architecture/database/` — table definitions, RLS policies, migration ordering
- `architecture/threat-model.md` — Shield's STRIDE pass on every trust boundary
- `architecture/iac/` — Terraform/Pulumi for every cloud resource (Supabase, Vercel, Cloudflare, etc.)
- `architecture/test-strategy.md` — Verify's layer-by-layer plan (mirrors PRD §18)

**Jury Exit Gate (binary):**
- Axiom verdict: no internal contradictions; every decision traceable to a layer-spec
- Atlas verdict: RLS enforces tenant isolation at the engine, not at the app layer
- Shield verdict: threat model covers SSRF + prompt-injection + secret-exfil + path-traversal + sandbox-escape
- Cipher verdict: secrets-at-rest pattern chosen with correct primitive (AEAD with AAD, not sealed boxes)
- All schema files exist in HEAD; `pnpm test schema:validate` green
- IaC applies cleanly to a fresh staging environment (`terraform plan` shows no drift)

**Lessons learned:**
- Schemas-as-files, not schemas-as-prose. The first time a reviewer adds a field to the audit output without updating the schema, downstream consumers silently diverge.
- Service-role keys bypass RLS. Runners must authenticate via short-lived tenant-scoped JWTs. The database is the last line of defense; don't disable it.
- Sandbox strategy is a phase-5 lock, not an M0-spike surprise. Rootless container + seccomp + egress allowlist is the medium-burden default; Firecracker is the V2 graduation.

---

### Phase 6 — Sprint Plan

**Lead:** Sprint

**Coordinates:** every layer lead (each owns deliverables in their lane), BigBrain (milestone gating), Verify (per-milestone CI gates).

**Inputs:** PRD §16 milestones, tech architecture (Phase 5), risk register (PRD §19).

**Outputs:**
- `sprint/milestone-M0.md` through `sprint/milestone-Mn.md` — one file per milestone
- Each file contains: scope, deliverables (per layer), exit gate (binary, automation-checkable), owner per deliverable, dependencies
- `sprint/burndown.md` — updated weekly during Build phase

**Jury Exit Gate (binary):**
- Sprint verdict: every milestone has a binary exit gate (not "feature complete", not "looks good")
- Every Blocker risk in PRD §19 has a mitigation owner + milestone
- Every still-open decision in PRD §17 has a deadline before the milestone it blocks

**Lessons learned:**
- "Audit MVP works on one repo" is not a release gate. Replace vibes with assertions: `pnpm test e2e:audit-mvp` green, p95 SLO over rolling 7d.
- Pull regulatory deadlines forward. EU AI Act Art. 50 binds 2026-08-02; disclosure machinery ships at M0/M1, not M5.
- Reorder milestones based on customer-reach math, not architectural elegance. Managed before CLI if Managed reaches more customers faster.

---

### Phase 7 — Finance Plan

**Lead:** Penny (pricing) + Ledger (billing infrastructure) + Meter (unit economics)

**Coordinates:** Hook (conversion math), Comply (regional refund matrix, FTC Click-to-Cancel), Sprint (cash-runway alignment).

**Inputs:** PRD §12 pricing, competitive landscape (PRD §3a), GTM plan (Phase 8 — iterative with this phase).

**Outputs:**
- `finance/pricing.md` — locked tier table with substantiation
- `finance/unit-economics.md` — per-tier gross margin, COGS breakdown, payback period
- `finance/runway.md` — burn rate, runway months at current pricing + GTM ramp
- `finance/refund-matrix.md` — per-region refund + cooling-off + dispute path (Comply)
- `finance/stripe-config.md` — products, prices, idempotency keys, webhook handlers

**Jury Exit Gate (binary):**
- Penny verdict: every tier has a buyer persona AND a comparable competitor reference
- Meter verdict: every tier has positive contribution margin at projected token cost
- Comply verdict: refund matrix covers EU 14-day cooling-off, UK CCR 2013, CA SB 313, FTC Click-to-Cancel
- Ledger verdict: Stripe idempotency on every charge endpoint; webhook signature verification on every webhook

**Lessons learned:**
- Premium positioning collapses without substantiation. "Comparable to v0/Bolt" is not a claim; "comparable to SonarQube/Codacy on the low end, freelance agency audits on the high end" is a claim with prices.
- Refund policies are regulatory, not pricing. EU cooling-off doesn't waive because we offered a free re-audit credit.
- Auto-PR upgrade pricing should be tiered (S/M/L) not flat — fix complexity is bimodal and flat pricing leaves money on the table or sandbags adoption.

---

### Phase 8 — GTM Plan

**Lead:** Signal (channels) + Herald (copy) + Hook (conversion tests) + Lens (analytics)

**Coordinates:** Comply (FTC #ad disclosure, marketing claim substantiation), Penny (price reveal sequencing), Sprint (launch-week dependencies).

**Inputs:** PRD §15.5 GTM channels, brand voice (Phase 2), competitive landscape (PRD §3a), pricing (Phase 7).

**Outputs:**
- `marketing/channel-plan.md` — Signal's channel-by-channel strategy with KPIs
- `marketing/copy/` — landing page copy, email sequences (E1–E5), social posts, AMA prep
- `marketing/launch-checklist.md` — Day -30 / -14 / -7 / -1 / 0 / +1 / +7 / +30 actions
- `marketing/claims-substantiation/` — one file per marketing claim with evidence
- `marketing/experiments-backlog.md` — Hook's ICE-scored A/B test backlog

**Jury Exit Gate (binary):**
- Signal verdict: at least 4 channels active before launch
- Herald verdict: brand voice consistent across landing, in-app, email, social
- Proof verdict: every claim in marketing copy passes substantiation gate
- Comply verdict: every comparative claim has #ad / disclosure where required; cookie banner live on marketing site; CCPA "Do Not Sell" link present
- Lens verdict: UTM passthrough end-to-end; signup attribution captured; conversion events firing

**Lessons learned:**
- B2B dev tools convert on X/HN/IndieHackers/Discord, not Google search. SEO ramps slowly; social and community are the ignition path.
- Pre-launch build-in-public threads generate Day-1 signups. The asset is *receipts* (Jury verdict screenshots, head-to-head competitive runs), not aspirations.
- Free tier's job is to make the customer feel the audit→fix→re-audit loop close. A one-shot freebie kills the dopamine loop.

---

### Phase 9 — Build

**Lead:** Forge (backend) + Vega (frontend) + Crash (resilience) + Pipeline (CI/CD)

**Coordinates:** every layer lead at their own touchpoint, audit panel (Jury after every milestone).

**Inputs:** all prior phase outputs.

**Outputs:**
- Code in the repository, milestone by milestone
- Per-milestone Jury report + verdict at `shared_context/projects/<slug>/audits/M<n>.md`
- Per-milestone CI gate green: see PRD §18 + Sprint plan exit gates

**Jury Exit Gate (binary, per milestone):**
- All exit-gate assertions from Sprint plan (Phase 6) green
- Self-dogfood gate: Studio Zero auditing its own milestone codebase = PASS or PASS WITH FIXES
- No regressions on prior-milestone gates (full gate suite re-run)

**Process:**
1. Forge + Vega execute the milestone scope.
2. Probe ships e2e + integration tests in lockstep with feature work.
3. Pipeline runs SAST, dep CVE, CodeQL, gitleaks on every PR.
4. At milestone end: Jury orchestrates audit; reviewers run in parallel; verdict published.
5. On `FAIL` — halt; route Critical/Blocker findings to layer leads; re-audit on remediation. **Never soften findings to meet a deadline.**
6. On `PASS WITH FIXES` — fixes tracked, re-audited by originating reviewer before milestone closes.
7. On `PASS` — milestone closed; next milestone begins.

**Lessons learned (from motionmax's 880-item retro-audit):**
- The 880-item backlog is what happens when phases 1–8 are skipped and Phase 9 ships before audits. The discipline is not "audit later"; it is "no milestone closes without an audit."
- Greenfield projects with Jury baked in from M0 produce milestone backlogs in the 10–30 item range, not 800.
- A reviewer who reverses a verdict under deadline pressure breaks the wedge. Escalate to BigBrain, then to Jo; never soften.

---

### Phase 10 — Public Launch

**Lead:** BigBrain + Signal (announcement) + Comply (compliance go-live) + Watch (incident response readiness)

**Coordinates:** all layer leads on launch-day rota; Crash + Pipeline for incident response.

**Inputs:** all M5 gates green (or equivalent final milestone), GTM plan executed.

**Outputs:**
- Production deployment live
- WCAG 2.2 AA conformance statement published at `/accessibility`
- DMCA Designated Agent registered with U.S. Copyright Office (US-facing services)
- AI System Card v1.0 published (if AI Act Art. 50 applies)
- AUP + ToS + Privacy Policy + Cookie Policy + Subprocessor List + DPA template all live
- Launch announcements on the GTM channels per Phase 8

**Jury Exit Gate (binary):**
- All M5 gates green per Sprint plan
- All Phase 7 finance compliance items live (Stripe webhooks verified, refund matrix gated by region)
- All Phase 8 launch checklist items checked
- Incident response runbook (`operations/runbook-day-zero.md`) reviewed by on-call
- Status page live; first synthetic uptime check green

**Process:**
1. T-7 days: production deploy to staging; Verify runs full regression; Halo runs AT release recording.
2. T-3 days: marketing assets reviewed by Proof + Comply; embargo lifts.
3. T-1 day: Watch + Siren confirm alerting; Crash confirms rollback path.
4. T-0: BigBrain announces; Signal executes channel plan; Lens monitors funnel.
5. T+1 to T+7: daily incident-response standup; rapid hotfix path; postmortem of any Critical incident.
6. T+30: Penny reviews unit economics with first 30 days of real data; Sprint reviews milestone retro; BigBrain compiles launch postmortem.

**Lessons learned:**
- Launch day is not the hard day. T+1 through T+30 is. Staff accordingly.
- Postmortem every Critical incident even if it didn't affect a customer. The pattern matters, not just the impact.
- Track GTM channel ROI weekly for the first 90 days. Cut underperforming channels fast; double down on what converts.

---

## Cross-cutting concerns

### Decisions Log

Every cross-phase decision lands in `shared_context/projects/<slug>/decisions.md` with: decision ID, date, owner, rationale, alternatives considered, who reviewed it. Never delete a decision — supersede it with a new one and link back.

### Lessons-Learned Log

Every Jury verdict generates a one-line lessons-learned entry appended to this file (`BUILD_FLOW.md`) under the relevant phase. Entries are anonymized but specific. The lessons-learned log is the meta-product Studio Zero sells when V2 ships.

### Audit Cadence

| Phase | Audit type | Verdict required |
|---|---|---|
| 1 PRD Lock | Two review panels | PASS WITH FIXES |
| 2 Brand | Canon + Compass + Halo | PASS |
| 3 IA | Optic + Trace + Halo | PASS |
| 4 Visual Design | Halo + Canon + Optic | PASS |
| 5 Tech Architecture | Axiom + Atlas + Shield + Cipher | PASS |
| 6 Sprint Plan | Sprint + Verify | PASS |
| 7 Finance | Penny + Meter + Comply + Ledger | PASS |
| 8 GTM | Signal + Herald + Proof + Comply + Lens | PASS |
| 9 Build | Jury full audit at every milestone | PASS or PASS WITH FIXES |
| 10 Launch | Jury full audit + Watch readiness | PASS |

### Phase Skipping Policy

Phases may run in parallel where dependencies allow (e.g., Phase 7 Finance and Phase 8 GTM iterate). Phases may **not** be skipped. A skipped phase = a phase done badly later under deadline pressure. Studio Zero's motionmax 880-item retro is the case study.

### When the Customer Pushes Back

When the customer asks to skip a phase, compress a phase, or override an audit verdict, BigBrain's response is:
1. **Audience harm test:** does skipping this phase fail the §5 personas? If yes, refuse.
2. **Reversibility test:** can the skipped phase be retrofitted cheaply later? Brand identity yes; tech architecture no.
3. **Cost-of-skip math:** present the expected post-launch retro-audit backlog size to the customer. Motionmax was 880 items. Compounding cost.
4. **Escalate to Jo** if the customer insists. Jo's call, with the trade-off laid out.

---

## Versioning of This File

This file is versioned at the top. Bumps:
- **v0.x** — pre-productization, derived from Studio Zero's own self-build
- **v1.0** — when Studio Zero ships its first paid customer's product through this flow end-to-end
- **vN.x** — every minor revision adds lessons-learned + clarifications without changing phase order
- **v2.0** — a structural change to phase count or order (must be approved by Jo + Axiom + BigBrain)

---

## Cross-References

- `PRD.md` — Studio Zero's own productization PRD; every phase in this file is exercised in PRD's §1–§20.
- `SYSTEM_ACHITECTURE.md` — the 56-agent layer map; this file references agents by name.
- `BIGBRAIN.md` — the Hard Rules that constrain this flow.
- `ROADMAP.md` — the time-bound projection of the phases above onto Studio Zero's own calendar.
- `shared_context/projects/<slug>/` — per-project state, decisions, reviews, audits.
- `agents/` — every agent persona referenced by name in this file.

---

*This file is alive. Update it after every project, every milestone, every verdict. The flow is the product.*
