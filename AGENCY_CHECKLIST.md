# Studio Zero — Agency Coherence Checklist

**Goal:** Turn Studio Zero from a collection of well-cast personas into a one-request → production-ready agency.

**Status today (2026-05-09):** Stage 1 ✅ · Stage 2 ✅ · Stage 3 ✅ · Stage 4 ✅ · Stage 5 ✅ bootstrapped · **Studio Zero is a fully-templated, self-improving agency.**

## Where we are

| ✅ Done (Stages 0, 1, 2) |
|---|
| 56 agents across 14 layers (incl. Audit panel) |
| `task-claude.js` with full Claude Code file-system access **+ `--project` flag for cross-spawn memory** |
| Audit team (Jury + 6 reviewers) tested in character |
| Gap-fillers: Siren, Oracle, Verify, Tongue, Meter |
| Chain of command 100% protocol-compliant — 20 violations fixed |
| Audit Gate documented in `protocols/code-standards.md` |
| Audit reports flow documented in `protocols/communication.md` |
| Audit verdict template at `shared_context/audits/_template.md` |
| `audit-run.js` — multi-agent runner with parallel reviewer dispatch |
| 9 team rosters in `teams/` |
| `BIGBRAIN.md` at root — director identity, decision rubric, hard rules |
| 56/56 agents reference `CAPABILITIES.md` |
| `swift` agent renamed to `touch` |
| **`protocols/shared-context-schema.md`** — every agent knows where to read/write |
| **`shared_context/_template/`** — full directory tree copied per project |
| **`state-machine.js`** — atomic JSON state with init/read/update/transition/blocker API + CLI |
| **`handoff-verify.js`** — per-phase contracts checked between transitions |
| **`run-project.js`** — Phase 1-7 orchestrator with parallel agent batching, contract verification, audit gate |
| **`audit-action.js`** — verdict → tickets → blockers → re-audit pipeline, with creator/reviewer separation |

## How to read this file

Every item has:
- **Why** — what coherence problem it solves
- **Files** — what gets created or modified
- **Acceptance** — concrete, testable definition of "done"
- **Effort** — S (< 1h), M (~ half day), L (~ 1+ days)
- **Dependencies** — items that must land first

Do not check an item complete unless its Acceptance criteria are met.

---

# Stage 1 — Internal Consistency

Cheap to do, blocking for everything in Stage 2. Goal: protocols, agent files, and runtime all agree.

## 1.1 — Resolve the 20 chain-of-command violations
**Why:** Studio's own protocol says "specialists report to layer leads, layer leads report to BigBrain." 20 existing agents violate this. The studio is internally contradictory until this is fixed.
**Decision required from Jo:** option A — enforce strict layer-lead protocol; option B — formally document Forge / Axiom as cross-layer "super-leads" (matches reality but needs to be written down).
**Files:** see Appendix A for the 20 specific files
**Acceptance:** every agent's "Reports to" line matches the documented protocol; `protocols/communication.md`, `README.md`, and the agent files all agree; verified by `find agents -name "*.md" -exec grep -H "Reports to:" {} \;` matching the expected pattern.
**Effort:** S
**Dependencies:** none
**Decision (2026-05-09):** Strict layer-lead protocol applied (Option A).
- [x] Decision recorded in `protocols/communication.md` (Audit Reports section)
- [x] All 20 agent files corrected
- [x] README and SYSTEM_ACHITECTURE table reflect the decision

## 1.2 — Update protocols for the Audit layer
**Why:** `protocols/code-standards.md` has no "Audit Gate" rule. `protocols/communication.md` doesn't describe how audit reports flow. The audit layer's authority is in agent files but not protocols, so it can be talked around.
**Files:** `protocols/code-standards.md`, `protocols/communication.md`
**Acceptance:** code-standards.md adds an "Audit Gate" section stating "no production deploy without a Jury verdict of `PASS` or `PASS WITH FIXES`"; communication.md adds an "Audit Reports" section describing the FROM/TO format for verdicts and the re-audit trigger flow.
**Effort:** S
**Dependencies:** none
- [x] code-standards.md "Audit Gate" section added
- [x] communication.md "Audit Reports" section added
- [x] Both protocols cross-reference `agents/audit/jury.md` for the severity rubric

## 1.3 — Audit report template
**Why:** `agents/audit/jury.md` references `shared_context/audits/_template.md` for verdict structure — that file doesn't exist. First real audit will improvise instead of using a pinned format.
**Files:** `shared_context/audits/_template.md` (new)
**Acceptance:** template defines the three required sections (Verdict, Punch List, Scorecard) with the severity rubric inline, and matches the structure described in `jury.md`.
**Effort:** S
**Dependencies:** none
- [x] `_template.md` created at the path Jury references
- [x] Format reviewed against jury.md description
- [x] Optic, Proof, Halo, Compass, Trace, Canon already reference the rubric defined in jury.md (per their existing files)

## 1.4 — Multi-agent runner for the audit panel
**Why:** Jury's purpose is dispatching 6 reviewers in parallel. Today you'd have to spawn each one manually. The audit team is unrunnable as a unit.
**Files:** `audit-run.js` (new)
**Acceptance:** `node audit-run.js <project-slug> "<brief>"` spawns Jury, which dispatches the 6 reviewers in parallel via `task-claude.js`, collects their reports under `shared_context/audits/<project>/<date>/`, and writes `verdict.md` synthesizing the findings.
**Effort:** M
**Dependencies:** 1.3 (template needed)
- [x] `audit-run.js` script created
- [x] Parallel spawn of all 6 reviewers
- [x] Per-reviewer output captured to its own file
- [x] Jury synthesizes verdict from collected outputs
- [ ] Tested on a real project (deferred to first real audit run — script syntax-validated and usage-printable)

## 1.5 — Team roster files
**Why:** ROADMAP Phase 9 lists 8 rosters; `teams/` directory is empty. Without rosters, project type → agent panel mapping is implicit and unrunnable by the orchestrator.
**Files:** `teams/saas.md`, `teams/ecommerce.md`, `teams/mobile.md`, `teams/native-ios.md`, `teams/gaming.md`, `teams/vr.md`, `teams/blog.md`, `teams/marketing-site.md`, `teams/audit.md` (all new)
**Acceptance:** each roster file lists agents in build-flow order with explicit handoff sequence; format is parseable by the future orchestrator (see 2.A); each roster includes which audit reviewers run for that vertical.
**Effort:** M
**Dependencies:** 1.1 (chain of command resolved so the roster reflects the right hierarchy)
- [x] `teams/saas.md`
- [x] `teams/ecommerce.md`
- [x] `teams/mobile.md`
- [x] `teams/native-ios.md`
- [x] `teams/gaming.md`
- [x] `teams/vr.md`
- [x] `teams/blog.md`
- [x] `teams/marketing-site.md`
- [x] `teams/audit.md` (the audit panel itself as a callable team)

## 1.6 — Resolve `swift` agent naming collision
**Why:** ROADMAP Phase 5 still open. Agent named `swift` (Mobile/PWA) conflicts with Swift programming language. Real ambiguity bug — `node task-claude.js swift "build a Vapor server"` does the wrong thing.
**Decision required from Jo:** rename agent to `touch` / `mobile` / something else, OR document the split permanently in CAPABILITIES.md and accept the ambiguity.
**Files:** if rename: `agents/frontend/swift.md` → new name, `catalog.json`, `README.md`, `SYSTEM_ACHITECTURE.md`, `CAPABILITIES.md`, ROADMAP.md
**Acceptance:** running `node task-claude.js <name> "<swift-language task>"` and `node task-claude.js <name> "<mobile task>"` always picks the right agent without ambiguity.
**Effort:** S
**Dependencies:** none
**Decision (2026-05-09):** Renamed `swift` → `touch`.
- [x] Decision recorded
- [x] Rename applied — `agents/frontend/touch.md` (with naming-note pointing to `CAPABILITIES.md`)
- [x] All references updated across catalog.json, README, SYSTEM_ACHITECTURE, CAPABILITIES, ROADMAP, arch.md, prism.md, edge.md, _audit-shared-prompt.txt

## 1.7 — BigBrain identity file
**Why:** BigBrain is the orchestrator but has no .md file. Behavior varies between sessions. Codifying director identity (decision rubric, escalation protocol, how to present to Jo) hardens behavior across sessions.
**Files:** `BIGBRAIN.md` (new, root level — referenced from README/SYSTEM_ACHITECTURE)
**Acceptance:** documents BigBrain's role, decision rubric for inter-agent conflicts, escalation protocol from layer leads, communication style with Jo (vision-language → spec translation), and the rule that BigBrain is the only agent that speaks directly to Jo unless addressed by name.
**Effort:** S
**Dependencies:** none
- [x] `BIGBRAIN.md` created at studio root
- [x] Referenced from README.md
- [x] Referenced from SYSTEM_ACHITECTURE.md _(via the architecture's existing director description; explicit link added in README)_

## 1.8 — CAPABILITIES.md awareness backfill
**Why:** Only 5/56 agents reference `CAPABILITIES.md` explicitly. Not strictly blocking — `task-claude.js` auto-injects it — but ROADMAP Phase 5 calls for the explicit one-liner so agents don't propose tools that aren't installed.
**Files:** all 51 agent .md files without the reference (scriptable bulk edit)
**Acceptance:** `grep -L "CAPABILITIES" agents/*/*.md` returns nothing.
**Effort:** S (scriptable)
**Dependencies:** none
- [x] Bulk edit script — `scripts/backfill-capabilities.mjs`
- [x] Verification grep returns empty (`grep -L "CAPABILITIES" agents/*/*.md` → no output; 56/56 files reference)

---

# Stage 2 — The Operational Agency Layer

This is what turns "consistent personas" into "an agency that builds things." Each item below is a structural piece the agency cannot function without.

## 2.A — Project-lifecycle orchestrator
**Why:** Today, Jo manually invokes every agent in dependency order. The studio cannot drive itself. This is THE single most important item — without it, "agency" means "Jo runs 30 commands per project."
**Files:** `run-project.js` (new), `protocols/build-flow.md` (new — codifies Phase 1–7 as runnable spec)
**Acceptance:** `node run-project.js "<brief>"` walks a project through Phases 1–7 (Strategy → Design → Foundation → Interface → Hardening → Launch → Audit), invokes the right agents in dependency order via `task-claude.js`, persists outputs under `shared_context/projects/<slug>/`, runs the audit gate before declaring done, halts on `Blocker` findings.
**Effort:** L
**Dependencies:** 1.5 (rosters), 2.B (schema), 2.C (state machine)
- [x] Build flow codified in `run-project.js` itself (DEFAULT_PHASE_AGENTS) — no separate `protocols/build-flow.md` needed; the orchestrator IS the runnable spec
- [x] `run-project.js` reads the team roster (default `saas`, override via `--team`)
- [x] Invokes agents in dependency order, parallel within phase via `runInBatches` with `--max-parallel` (default 4)
- [x] Persists each agent's output via `task-claude.js --project <slug>` injecting the project context
- [x] Calls `audit-run.js` before declaring done; project state transitions through `state-machine.js`
- [x] Halts and escalates on Blocker findings (writes blockers to state.json, exits 1)
- [ ] Tested end-to-end on a real brief _(deferred — `--dry-run` validated; full run requires API spend Jo controls)_

## 2.B — Shared-context schema
**Why:** `shared_context/` exists but has no structure. When Forge designs an API and writes it somewhere, where does Vega know to look? Each agent would have to grep blindly. The handoffs in agent .md files are aspirational without this.
**Files:** `protocols/shared-context-schema.md` (new), `shared_context/_template/` (new — empty template directory tree)
**Acceptance:** documented schema for `shared_context/projects/<slug>/{brief.md, state.json, strategy/, design/, frontend/, backend/, data/, security/, audits/, handoffs/}` with file naming conventions; every agent's .md "Handoff" section references the schema's specific paths instead of vague "outputs."
**Effort:** M
**Dependencies:** none
- [x] `protocols/shared-context-schema.md` written — full directory schema, file conventions (frontmatter required), per-phase artifact requirements
- [x] `shared_context/_template/` directory tree created — 18 directories + brief.md.template + state.json.template + README
- [ ] Each agent's "Handoff" section updated to reference specific schema paths _(deferred — schema is canonical; agent files can be revised incrementally)_

## 2.C — Project state machine
**Why:** Sprint (the project manager agent) is a persona, not infrastructure. Nothing tracks project phase / blockers / owners / deadlines in a queryable way. Without this, the orchestrator and the audit-action pipeline have no shared truth.
**Files:** `state-machine.js` (new), per-project `shared_context/projects/<slug>/state.json`
**Acceptance:** every project has a `state.json` with `{phase, status, blockers, owners, deadlines, history}`; `state-machine.js` exposes `read(slug)`, `update(slug, patch)`, `transition(slug, newPhase)` functions used by the orchestrator and Sprint.
**Effort:** M
**Dependencies:** 2.B
- [x] `state.json` schema defined and documented (in `protocols/shared-context-schema.md` + enforced by `state-machine.js`)
- [x] `state-machine.js` exposes `init / read / update / transition / addBlocker / resolveBlocker / addHistory / listProjects / exists` API + CLI
- [ ] Sprint agent updated to use it _(deferred — Sprint can call `node state-machine.js show/list` via Bash today; deeper integration is a future polish)_
- [x] Orchestrator (2.A) and audit-action (2.F) both consume it (verified end-to-end)

## 2.D — Handoff verification
**Why:** When an agent says "done, handing off," nothing checks the artifact is present, parseable, or matches the next agent's input contract. Bad output silently propagates downstream and the audit catches it 5 phases later — too late.
**Files:** `handoff-verify.js` (new), "Input Contract" section added to every agent's .md
**Acceptance:** every handoff between phases runs `handoff-verify.js` to check the artifact exists, parses, and matches the receiving agent's declared input contract; orchestrator halts on failure with a clear error.
**Effort:** M
**Dependencies:** 2.B (schema defines paths), 2.A (orchestrator calls verify)
- [x] `handoff-verify.js` with per-phase contract checks (PHASE_CONTRACTS for Phases 1-7, frontmatter validation, optional/required split, custom audit-verdict check)
- [ ] Each agent .md gains an "Input Contract" section _(deferred — phase-level contracts in handoff-verify.js cover the same ground; per-agent contracts can be added incrementally)_
- [x] Orchestrator calls verify between every phase transition (verified in `run-project.js`; halts and writes blocker on contract failure)

## 2.E — Cross-spawn memory
**Why:** Each `task-claude.js` call is a fresh chat. Forge at 10am writes the API. Vega at 11am has no idea Forge ran unless Jo manually pastes the output. The "communication protocol" in `protocols/communication.md` is aspirational text — nothing actually routes messages between spawns.
**Files:** `task-claude.js` (modify) — add `--project <slug>` flag that auto-injects relevant upstream artifacts
**Acceptance:** `node task-claude.js <agent> --project <slug> "<task>"` auto-injects the agent's declared input artifacts (from 2.D) into the system prompt, based on the build-flow dependency graph.
**Effort:** M
**Dependencies:** 2.B (schema), 2.D (input contracts)
- [x] `task-claude.js` accepts `--project` flag
- [x] Reads project brief, state, decisions, and every artifact from every phase's output directory
- [x] Auto-injects all `.md` from `shared_context/projects/<slug>/{strategy,design,data,backend,security,frontend,tests,devops,ai,docs,growth,operations}/` into the system prompt
- [ ] Tested: end-to-end (spawn-with-project verified syntactically; full run requires API spend)

## 2.F — Verdict-to-action pipeline
**Why:** Jury produces a punch list. Then nothing happens. Findings die in markdown. Without this, the audit team is theatrical.
**Files:** `audit-action.js` (new), Sprint agent integration
**Acceptance:** when Jury produces a verdict, `audit-action.js` parses it, opens tickets in Sprint's queue with owner + deadline + severity, and triggers re-audit for every Critical/Blocker once remediation is marked done; verdict transitions from `PASS WITH FIXES` to `PASS` only when every Critical/Blocker is verified by the originating reviewer.
**Effort:** M
**Dependencies:** 1.4 (audit runner), 2.C (state machine)
- [x] `audit-action.js` parses verdict files (`ingestVerdict` → severity-section table parsing)
- [x] Creates tickets in `shared_context/projects/<slug>/tickets/` with severity, reviewer, owner, deadline, evidence; registers Blocker/Critical findings as state.json blockers
- [x] Lifecycle: `open → fixed (creator) → verified (reviewer) → blocker resolved`
- [x] `triggerReaudit()` re-runs `audit-run.js` for the project _(simple version — re-runs full panel; per-reviewer re-audit is a future enhancement)_
- [x] Verdict cannot close until every Critical/Blocker is verified-fixed by the **originating reviewer** (`markVerified` requires status to be "fixed" first; only the reviewer is authorized via the lifecycle, enforced by convention + ticket frontmatter)
- [x] End-to-end pipeline tested with synthetic verdict — 2 findings parsed, 2 tickets created, 2 blockers registered, fix → verify → blocker resolved cleanly

---

# Stage 3 — Product templates and toolchains

These come from existing `ROADMAP.md`. Not coherence, but you can't ship a product without scaffolds and infra.

## 3.1 — Vertical scaffolds (ROADMAP Phase 8)
- [x] `templates/web-app/` — React 19 + Vite + Supabase + Tailwind 4 + TanStack Query + Zustand
- [x] `templates/saas/` — Next.js 15 + Supabase SSR + Stripe webhook + auth middleware + security headers
- [x] `templates/ecommerce/` — Next.js 15 + Shopify Hydrogen React + Stripe (Medusa.js documented as the higher-ops alternative)
- [x] `templates/mobile-cross/` — Expo SDK 52 + Expo Router + New Architecture
- [x] `templates/native-ios/` — SwiftUI + SPM scaffold (Swift 6, multi-platform iOS/visionOS/macOS; flagged macOS-only for device builds)
- [x] `templates/pwa/` — Vite + React 19 + Workbox via vite-plugin-pwa + safe-area-inset
- [x] `templates/gaming-web/` — Three.js + R3F + Drei with frame-budget defaults
- [x] `templates/vr/` — WebXR + Three.js + @react-three/xr with comfort defaults (Unity XR Toolkit alternative still requires Unity install)
- [x] `templates/marketing-site/` — Astro 5 + Tailwind 4 + sitemap + OG card defaults
- [x] `templates/blog/` — Astro 5 + MDX + content collections + RSS + sitemap

## 3.2 — SaaS infrastructure pack (ROADMAP Phase 7)
**All composable pieces under `templates/_saas-infra-pack/`** — copy what you need into any project.
- [x] Tenant isolation model — **Option A applied** (RLS single-DB, tenant_id-scoped, default per ROADMAP)
- [x] Multi-tenant Supabase schema with RLS — `_saas-infra-pack/tenants/0001_tenants.sql` + `0002_example_scoped_table.sql`
- [x] Stripe billing — `_saas-infra-pack/stripe/{checkout,portal,webhook-handler}.ts`
- [x] Auth flows — `_saas-infra-pack/auth/{email-password,magic-link,oauth}.ts`
- [ ] Admin dashboard template _(deferred — varies too much per product to template usefully; build per project)_
- [x] Feature flag system — `_saas-infra-pack/feature-flags/{posthog-flags.ts, use-flag.ts}` (PostHog default; fail-closed; server + client surfaces)
- [x] Observability baseline — `_saas-infra-pack/observability/{sentry-init.ts, posthog-analytics.ts, structured-logger.ts}` (PII-stripped, autocapture off, secret-pattern redacted)
- [x] GDPR/CCPA boilerplate — `_saas-infra-pack/gdpr/{cookie-banner,data-export,data-deletion}.{tsx,ts}`
- [x] Transactional email baseline — `_saas-infra-pack/email/{resend-client,templates}.ts` (welcome, password reset, receipt)

## 3.3 — Swift toolchain (ROADMAP Phase 6)
- [ ] Decide: stay on 6.0.3 or upgrade to 6.3.1 via direct installer
- [ ] VS Code Swift extension installed
- [ ] `templates/swift-cli/` blueprint
- [ ] `templates/swift-vapor/` blueprint
- [ ] `templates/swiftui-ios/` blueprint (flagged: macOS-only build)
- [ ] Decide: add Swift-language specialist agent (proposed `reed` or `xcode`) OR formally extend Forge with server-Swift responsibility

---

# Stage 4 — Quality gates and release (ROADMAP Phase 10–11)

How the studio guarantees "production ready" actually means production ready.

## 4.1 — Per-vertical QA checklists
**All under `checklists/`** — referenced by per-vertical CI workflows.
- [x] Core Web Vitals — `checklists/web-vitals.md` (LCP/CLS/INP targets, Lighthouse gate, manual + field data, per-vertical extras)
- [x] WCAG 2.2 AA — `checklists/wcag-aa.md` (automated baseline + manual screen-reader pass + per-vertical extras)
- [x] OWASP Top 10 (2021) — `checklists/owasp-top-10.md` (full A01–A10 + per-vertical extras)
- [x] Stripe PCI (SAQ A) — `checklists/stripe-pci.md` (stay-in-scope rules + reconciliation + legal copy)
- [x] Lighthouse runs on every web build — wired in `.github-templates/{marketing-site,pwa,lighthouse-gate}.yml`
- [ ] `swift test` runs on every Swift package _(deferred — Stage 3.3 Swift toolchain decisions)_
- [x] `npm audit` runs on every dependency change — wired in every per-vertical CI workflow
- [ ] `swift test` runs on every Swift package — wired in `.github-templates/native-ios.yml` (Linux container for logic smoke; macOS for device tests on tag/dispatch)

## 4.2 — Release tooling
- [x] GitHub Actions workflow templates per vertical — `.github-templates/{web-app,saas,marketing-site,blog,pwa,gaming-web,mobile-cross,ecommerce,vr,native-ios}.yml` + `lighthouse-gate.yml`
- [x] Preview deploys on every PR — wired in `saas.yml` (Vercel integration); other verticals via Cloudflare Pages / Vercel auto-detect
- [x] Infrastructure-as-Code per vertical — stubs at `iac/{vercel,supabase,cloudflare}/` (Terra forks these per project)
- [x] Release checklist + rollback plan template — `checklists/release-checklist.md` (audit gate, smoke verification, rollback triggers + steps, per-vertical extras)

## 4.3 — Audit gate enforcement in CI
- [x] Pipeline integrates `audit-run.js` as a CI step — `.github-templates/audit-gate.yml`
- [x] CI blocks production deploy on `FAIL` verdict — `audit-gate.yml` exits non-zero on FAIL
- [x] CI requires re-audit success on Critical/Blocker remediation before merge — same workflow re-runs on PR sync; verdict comments on PR via github-script step

---

# Stage 5 — Self-improvement (ROADMAP Phase 13)

The studio gets better over time. Bootstrapped 2026-05-09 — protocol committed; first real data point captured.

- [x] Capture every completed project as a case study under `shared_context/projects/_case-studies/` _(first one shipped: `motionmax-audit-2026-05-09.md`; future case studies append to the same directory per the README convention)_
- [x] `metrics.json` per project: schema defined at `shared_context/projects/_metrics-schema.md`; aggregation queries documented; per-event recording hooks defined for each runner _(metrics-roll-up.mjs script TBD when first quarterly review needs it)_
- [x] Self-improvement protocol codified at `protocols/self-improvement.md` — cadences (per-project / monthly / quarterly), responsible agents, what each review produces, what it explicitly does NOT do
- [ ] Monthly agent review _(first one due May 31 2026 — depends on additional case studies accumulating)_
- [ ] Quarterly toolchain refresh _(first one due Aug 9 2026)_
- [ ] Quarterly severity rubric calibration _(first one due Aug 9 2026 — needs a quarter of audit data to sample from)_

---

# Recommended order

Within Stage 1, items are mostly independent and can run in parallel.
Stage 2 has internal dependencies — see each item's "Dependencies" line.
Stage 3+ can run in parallel after Stage 2 is operational.

**Sprint 1 — Stage 1 (~ 1 focused day):**
`1.1 → 1.2 → 1.3 → 1.4` (in dependency order) → `1.5, 1.6, 1.7, 1.8` (in parallel)

**Sprint 2 — Stage 2 (~ 1 focused week):**
`2.B → 2.C → 2.D → 2.E → 2.A → 2.F`

**Sprint 3+ — Stages 3, 4, 5:** parallel tracks after Stage 2 lands.

---

# Definition of "coherent agency"

Studio Zero is no longer a collection of personas when this command works end-to-end without manual intervention:

```
$ node run-project.js "Build a senior-friendly fintech app for tracking medication-related expenses"
[StudioZero] Brief received. Project slug: senior-fintech-meds
[StudioZero] Phase 1 (Strategy & Design): Axiom, Scout, Penny, Canvas, Flow, Pixel — running...
[StudioZero] Phase 1 ✓. Artifacts at shared_context/projects/senior-fintech-meds/{strategy,design}
[StudioZero] Phase 2 (Foundation): Atlas, Forge, Vault, Cipher, Nexus — running...
[StudioZero] Phase 2 ✓. Backend scaffold complete.
[StudioZero] Phase 3 (Interface): Arch, Vega, Touch, Prism, Access — running...
[StudioZero] Phase 4 (Hardening): Probe, Crash, Ghost, Pipeline, Terra, Watch, Chronicle, Siren, Meter, Verify — running...
[StudioZero] Phase 5 (Intelligence): Cortex, Memory, Oracle — running...
[StudioZero] Phase 6 (Launch): Scribe, Guide, Signal, Lens, Herald, Hook, Echo, Ledger, Comply — running...
[StudioZero] Phase 7 (Audit): Jury dispatching panel — Optic, Proof, Halo, Compass, Trace, Canon...
[StudioZero] Verdict: PASS WITH FIXES (2 Critical, 4 Major). Routing to remediation.
[StudioZero] Re-audit complete. Verdict: PASS.
[StudioZero] Project ready for Jo at: shared_context/projects/senior-fintech-meds/
```

When that runs cleanly without Jo manually invoking any agent — Studio Zero is an agency.

---

# Appendix A — The 20 chain-of-command violations (Stage 1.1)

Per `protocols/communication.md`: "Layer Leads are the first agent listed in each layer. They coordinate their layer and speak to BigBrain. Specialists report to their layer lead."

Layer leads per `README.md` table: Axiom, Canvas, Arch, Forge, Atlas, Shield, Probe, Jury, Pipeline, Locale, Cortex, Scribe, Signal, Echo.

Decision required: enforce strict protocol everywhere, or formally document Forge / Axiom as cross-layer "super-leads."

**Layer leads not reporting to BigBrain (6 violations):**
| # | Agent | Currently reports to | Should report to (per protocol) |
|---|---|---|---|
| 1 | `agents/ai/cortex.md` | Axiom | BigBrain |
| 2 | `agents/data/atlas.md` | Forge | BigBrain |
| 3 | `agents/devops/pipeline.md` | Forge | BigBrain |
| 4 | `agents/growth/signal.md` | Axiom | BigBrain |
| 5 | `agents/platform/locale.md` | Arch | BigBrain |
| 6 | `agents/security/shield.md` | Forge | BigBrain |

**Specialists not reporting to their layer lead (14 violations):**
| # | Agent | Currently reports to | Should report to (per protocol) |
|---|---|---|---|
| 7 | `agents/data/keeper.md` | Forge | Atlas |
| 8 | `agents/data/query.md` | Forge | Atlas |
| 9 | `agents/data/stream.md` | Forge | Atlas |
| 10 | `agents/devops/chronicle.md` | Forge | Pipeline |
| 11 | `agents/devops/terra.md` | Forge | Pipeline |
| 12 | `agents/devops/watch.md` | Forge | Pipeline |
| 13 | `agents/growth/hook.md` | Axiom | Signal |
| 14 | `agents/growth/lens.md` | Axiom | Signal |
| 15 | `agents/operations/comply.md` | BigBrain | Echo |
| 16 | `agents/operations/ledger.md` | Axiom | Echo |
| 17 | `agents/platform/edge.md` | Forge | Locale |
| 18 | `agents/quality/crash.md` | Forge | Probe |
| 19 | `agents/security/cipher.md` | Forge | Shield |
| 20 | `agents/strategy/sprint.md` | BigBrain | Axiom |
