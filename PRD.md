# Studio Zero — Product Requirements Document

**Version:** 0.5
**Date:** 2026-05-11
**Author:** BigBrain (drafted on behalf of Jo)
**Status:** Reviewed by 14 agents across two panels (v0.2 panel: Atlas, Axiom, Cipher, Jury, Penny, Shield, Sprint; v0.3 panel: Comply, Halo, Herald, Hook, Optic, Scout, Verify). Phase 2 brand-audit panel (Canon, Compass, Halo) and Phase 3 IA-audit panel (Halo, Compass) both PASS WITH FIXES. v0.5 lands three Phase-3-surfaced edge-case decisions (D21 synth stall, D22 EU cooling-off reset, D23 GH App post-PR uninstall). Reviews + decisions log in `shared_context/projects/studio-zero-productization/`.

---

## 1. Overview

Studio Zero is being productized into an **automated software agency**: a web-based service where customers either build new products or audit existing ones, executed by Studio Zero's 56-agent system and gated by an independent audit layer.

The interface is already designed and built by Jo. This PRD specifies the **engine, APIs, and platform behavior** that sit behind that interface — the multi-tenant runtime, the three execution modes, the audit/build workflows, the readiness scoring system, and the productization concerns (auth, billing, secrets, repo access, fix delivery).

**One-line product statement:** *Your AI builder shipped code that fails accessibility. We'll prove it — line by line.*

(Marketing variants and longer brand copy are owned by Herald in `agents/growth/herald-brand-voice.md`. The line above is the locked reference statement; downstream copy must not contradict its promise.)

---

## 2. Background

Studio Zero already exists as a 56-agent orchestration system (see `README.md`, `BIGBRAIN.md`, `SYSTEM_ACHITECTURE.md`). It currently runs locally, driven by `task.js` / `run-project.js` / `audit-run.js`, with project state persisted to `shared_context/projects/<slug>/`.

What is **not yet built** and is in scope for this PRD:
- A web-facing product surface (auth, billing, dashboards, project intake)
- Multi-tenant execution isolation
- Three pluggable execution modes (BYOK, Claude Code CLI, Managed)
- A thin local CLI companion
- A readiness scoring engine
- A fix-delivery system with a pricing tier
- Hardened secret handling and GitHub integration
- A documented test strategy with per-milestone CI exit gates
- A WCAG 2.2 AA-conformant customer-facing surface

What **is already decided** (do not relitigate in this PRD):
- Tenant isolation: single-DB Postgres with RLS, `tenant_id`-scoped (Phase 7, 2026-05-09)
- Audit independence: auditors flag/recommend, do not edit code (`BIGBRAIN.md`)
- Severity rubric: Blocker / Critical / Major / Minor / Polish (`agents/audit/jury.md`)
- Single-voice rule: only BigBrain talks to the customer (`BIGBRAIN.md` Hard Rules)
- Stack: **Next.js (web) + Node/TypeScript (CLI + runner)**
- Backing platform: **Supabase** (Postgres + Storage + Auth + Realtime) — locked v0.2
- Score posture: **Strict elite gate** (weights & thresholds in §10) — locked v0.2
- MVP slice: **Audit mode first; Build mode in V2**
- Three audit products: **Surface / Code / Full** (defined in §9) — locked v0.2
- **GitHub integration via GitHub App from day one** (locked v0.4, Decision D1)
- **Free tier: 1 Project, unlimited Surface re-audits** (locked v0.4, Decision D2)
- **Auto-PR fix delivery deferred to V1.5** (locked v0.4, Decision D3)
- **Milestone order: Managed mode before CLI mode** (locked v0.4, Decision D6)
- **CLI mode tamper detection reframed as `Private Run · Self-Audited` watermark** (locked v0.4, Decision D7)

---

## 3. Problem & Opportunity

| Problem | Today's option | Why it falls short |
|---|---|---|
| Solo founders can't afford an agency to build a v1 | Hire freelancers, learn to code, or use generic AI builders | Freelancers are slow & expensive; AI builders skip product review and ship UX-broken software |
| Founders ship code that fails accessibility, UX heuristics, or audience fit | DIY review, manual QA, or hire a UX consultant | Manual review is inconsistent; consultants are expensive and don't audit code-level issues |
| AI-generated codebases have no independent quality gate | "Looks good in the demo" | No reproducible scoring, no structured remediation path |

**Studio Zero's wedge:** the **independent audit layer** (Jury + 6 reviewers) is rare in agentic systems, and selling Audit-as-a-Service is a lower-risk way to monetize that wedge before tackling full Build mode.

### 3a. Competitive Landscape (added v0.4)

Named comparables, prices verified 2026-05. Substantiation gate: Herald + Comply re-verify quoted prices before any external marketing claim ships (FTC AI-claim substantiation rule).

| Competitor | Category | Price (2026-05) | Closest overlap with Studio Zero |
|---|---|---|---|
| v0.dev (Vercel) | AI builder | $20 / $30 / $50/mo | Builds code; **no independent audit** |
| Bolt.new (StackBlitz) | AI builder | $20/mo Pro | Builds code; **no independent audit** |
| Lovable | AI builder | $25/mo | Builds code; **no independent audit** |
| Cursor | AI IDE | $20/mo Pro | Inside-the-editor; **no readiness rubric** |
| Replit Agent | AI builder | $25/mo | Builds code; **no independent audit** |
| Devin (Cognition) | AI software engineer | $20 / $500/mo | Builds code; **no independent audit** |
| GitHub Copilot Autofix | Auto-PR fix | Free public / paid private | Security-only Auto-PR; **no UX/copy/brand/a11y findings** |
| Snyk / Codacy / SonarQube | Code-quality audit | $15–$32/dev/mo | Code-only findings; **no UX/brand/audience review** |
| Vanta / Drata | Readiness platform | $9k–$30k/yr | SOC2-only; **no product audit** |
| Freelance agency audit | Manual audit | $2k–$5k/audit | No automation; **no versioned rubric** |

**Defensible wedge (Scout, v0.4):** No competitor ships an Auto-PR for UX + accessibility + copy + brand + audience-fit findings against a versioned readiness rubric. Studio Zero's positioning is *audit-tool pricing comparable to SonarQube/Codacy, with agency-tool depth and Vanta-style readiness scoring*. Marketing claims must reference this row, not "comparable to v0/Bolt."

---

## 4. Goals & Non-Goals

### MVP Goals (Audit-first)
1. Customers can sign up, pick an execution mode, and run a Surface or Code audit on an existing project from two intake methods (GitHub repo via GitHub App, local folder via CLI). Deployed-URL audits ship in the Code/Full SKUs (paid), not the free tier. Full audit (URL + repo) requires Code SKU + URL connection.
2. The audit produces a **graded checklist** (every finding tagged with severity, evidence, and recommended fix) and a **single readiness score** (0–100%).
3. Customers can purchase fix-delivery upgrades **starting in V1.5** (Decision D3). MVP ships specs-only with a per-finding ICE upgrade path for the Code SKU.
4. Three execution modes are wired end-to-end: BYOK, Claude Code CLI, Managed.
5. Multi-tenant isolation is enforced — one customer's run cannot read or affect another's state.
6. Every MVP goal ships with a binary acceptance test in §18 Test Strategy.

### V2 Goals (Build mode)
7. Customers can describe a product idea and receive a **roadmap + documentation bundle**, optionally seeded as a **GitHub repo** with milestones/issues, with progress visible in a **live build dashboard** and a final **readiness score**.
8. Optional **scaffold/MVP code generation** (gated behind audit-pass).

### Non-Goals (explicitly out of scope)
- A general-purpose code editor or IDE replacement.
- A project-management replacement (Linear/Jira/Asana). We integrate, not replace.
- A hosted production environment for customer apps. We deliver code and roadmaps; customers deploy.
- Real-time collaboration / multi-user editing within a single tenant. (One operator per tenant for v1.)
- White-label / reseller features for v1.
- A native mobile app at MVP. Web app is mobile-responsive and PWA-ready; native iOS (Swift) is V1.5 demand-gated.

---

## 5. Target Users

| Persona | Primary need | Likely mode |
|---|---|---|
| **Solo founder, non-technical** | Idea → roadmap they can hand to a contractor; or audit of contractor work | Managed |
| **Solo founder, technical** | Audit of their own codebase; build mode for spinning up side projects | BYOK or CLI |
| **Indie agency / freelancer** | Audit client work to demonstrate value; offload roadmap drafting | BYOK |
| **Engineering lead at a small startup** | Black-box audit before a release; accessibility/UX gate before launch | BYOK or Managed |

The **primary persona** for the MVP is the **technical solo founder** (BYOK or CLI mode, GitHub repo audit). They tolerate a rougher product, give feedback, and validate the agent system on real codebases before non-technical users are onboarded. GTM channels for this persona are specified in §15.5.

---

## 6. Product Surface

The interface already exists; this section specifies the behaviors the interface depends on, not the UI itself.

### 6.1 Web App (Next.js, hosted by Jo)
- Authentication (email + OAuth: Google, GitHub).
- Billing (Stripe; subscription + one-time fix-delivery upcharge starting V1.5).
- Tenant management (one workspace per signup; v1 is single-user-per-tenant).
- Project list, audit dashboards, score display, findings checklist.
- Settings: API key entry (BYOK), CLI pairing, GitHub OAuth, billing.
- **Cookie consent banner** at first visit (granular consent: necessary / analytics / marketing) — required by GDPR + ePrivacy + UK PECR (Comply, v0.4). Pre-consent telemetry buffered, never transmitted until consent granted.
- All settings panels MUST satisfy WCAG 2.2 AA per §14.6.

### 6.2 Studio Runner (the engine)
A **stateless executor** that runs the 56-agent workflow against a single project context. Three deployment shapes from one codebase:
- **Hosted Runner** (Jo-operated): runs in Jo's infrastructure; used by BYOK and Managed tiers.
- **Local Runner** (customer's machine): same code, packaged into the CLI; used by Claude Code CLI mode.
- **Worker pool**: hosted runners are queue-driven (jobs in, results out) so we can scale horizontally and cap concurrency per tenant.

Hosted runner sandboxing strategy: **rootless container with dropped capabilities + seccomp profile + egress allowlist** at M1; **Firecracker microVM as V2 graduation gate** after first clean pentest (locked v0.4, Decision D8). Rationale and test burden in §18.

### 6.3 Lifecycle Email Sequences (added v0.4)

Owned by Herald. Brand voice in `agents/growth/herald-brand-voice.md`. All emails must satisfy CAN-SPAM (US), CASL (Canada), and PECR (UK) — unsubscribe, identification, opt-out within 10 days.

| # | Trigger | Purpose | Primary CTA |
|---|---|---|---|
| **E1** | Signup confirmed | Welcome + first Surface audit prompt | "Run your free Surface audit →" |
| **E2** | Verdict = FAIL on free Surface audit | Receipts + upgrade hook (Code SKU finds more) | "Run the Code audit →" *(NOT "buy fix delivery" — Auto-PR deferred to V1.5)* |
| **E3** | Verdict = PASS WITH FIXES | Show distance to PASS, offer free 30-day re-audit | "Re-audit free →" |
| **E4** | 30-day re-audit window expiring (T-3 days) | Reminder + how to redeem | "Redeem your free re-audit →" |
| **E5** | Day-60 inactive after FAIL | Win-back: changes shipped since signup | "See what's new →" |

Verdict-screen scripts and PR-body templates (V1.5) are owned by Herald. Drafts in `agents/growth/herald-brand-voice.md`.

### 6.4 CLI Companion (`studio-zero` npm package)
A thin Node/TypeScript binary the customer installs locally for the Claude Code CLI mode and for local-folder audit intake. Responsibilities:
- Pair with the customer's web account via a one-time code (`studio-zero login`).
- Receive audit/build jobs from the web app via long-poll or websocket.
- Execute the runner locally against the user's Claude Code installation.
- Stream progress + final results back to the web app.
- Read local folders for audit intake without uploading the codebase to Jo's servers.

The CLI never executes anything on the customer's machine without an explicit job dispatched from the paired web account. **CLI-produced verdicts ship a `Private Run · Self-Audited` watermark on the verdict screen and PR body** (Decision D7). Watermark UX spec in §7.2 Step D and §14.6.

---

## 7. User Workflows

### 7.1 Onboarding & Mode Selection
1. Sign up → create workspace.
2. Choose execution mode:
   - **BYOK:** paste an Anthropic API key. Validated by a dry-run call. Stored encrypted (see §13.4).
   - **Claude Code CLI:** download CLI, run `studio-zero login`, paste the pairing code shown in the web app. Web app verifies the CLI is online before unlocking workflows.
   - **Managed:** select a plan, complete Stripe checkout. Jo's API key is used; customer is billed per-project or per-month. (Managed ships before CLI per Decision D6.)
3. (Optional) Connect GitHub via OAuth + GitHub App install for repo-based audits.

### 7.2 Audit Workflow (MVP)

**Step A — Intake.** Customer chooses one of three intake methods:

| Method | Available in modes | Available in SKUs | What it audits | Privacy |
|---|---|---|---|---|
| GitHub repo (GitHub App, per-repo permissions) | BYOK, Managed | Code, Full | Full source + deployed URL if linked | Code is fetched server-side; held only for the run + retention window (see §14.4) |
| Local folder | CLI only | Code, Full | Full source, never leaves the customer's machine | Maximum privacy; only findings are uploaded |
| Deployed URL | All | Surface (paid), Code (with repo), Full | Black-box only (UX, copy, accessibility, brand) | Headless browser visit; egress allowlist (no RFC 1918, loopback, link-local); URL-audit authorization checkbox required (§14.7) |

**Note (v0.4):** Deployed-URL intake is **removed from the free tier** to reduce CFAA × fraud risk (Comply). Free tier ships Surface audits **only on customer's own connected-repo deployed URL** (auto-detected from package metadata or explicitly attested).

**Step B — Audit *depth* selection.** Customer picks one. The three audit *products* (Surface / Code / Full) live in §9.1; the three *depths* below are distinct.

| Depth | Reviewers run | Typical use | Estimated runtime |
|---|---|---|---|
| **Quick** | Optic + Proof + Halo | Pre-launch sanity check: UX heuristics + copy + accessibility | ~10–15 min |
| **Custom** | Customer-selected subset of the 6 | Targeted re-audit (e.g. accessibility-only, brand-only) | varies |
| **Comprehensive** | All 6 reviewers + Jury synthesis | Pre-investor / pre-launch / post-incident | ~20–45 min |

**Optic's Hick's-Law fix (v0.4):** the UI presents these as a **2-step picker**: *(1) "What do you have?"* — repo / folder / URL → auto-selects the eligible audit product; *(2) "How deep?"* → Quick is the default; Comprehensive surfaces as a one-click upgrade; Custom is collapsed behind "Advanced." 27-combination matrix is internal; customer sees 3 + 3.

**Step C — Run.** Jury orchestrates; reviewers run in parallel where possible. Live progress is streamed to the dashboard via Supabase Realtime, with **per-agent rows showing phase chip + partial-finding count** (Optic, v0.4). The progress region uses `aria-live="polite"` + `role="status"` (WCAG SC 4.1.3) and respects `prefers-reduced-motion` (SC 2.3.3). Each finding includes: severity, layer, evidence (screenshot, file path, line range, contrast ratio, screen-reader transcript, etc.), recommended fix, and estimated effort.

**Step D — Verdict & Score (rewritten v0.4 — Herald + Hook + Optic + Halo).**

The verdict screen is the activation moment for ≥70% of customers (§15). It is specced as a product surface, not a data structure.

**Visual hierarchy:**
1. **Verdict line** at top — text + icon + color (SC 1.4.1 *Use of Color*). Three states:
   - `FAIL` — red `#C8421A` background, alert triangle icon, `<h1 role="status">` reads "Audit complete · FAIL"
   - `PASS WITH FIXES` — gold `#E4C875` background, exclamation icon, `<h1 role="status">` reads "Audit complete · PASS with fixes"
   - `PASS` — aqua `#14C8CC` background, checkmark icon, `<h1 role="status">` reads "Audit complete · PASS"
2. **Score** below verdict — large numeric (e.g., `68 / 100`) + per-category radar chart **with semantic data table fallback** (SC 1.1.1, SC 1.3.1). Chart has `<table>` sibling rendering the same six category scores.
3. **Primary CTA** above the fold, single button:
   - On `FAIL` or `PASS WITH FIXES` in Surface SKU → **"Run the Code audit →"** (E2 upsell hook, MVP-compatible)
   - On `FAIL` or `PASS WITH FIXES` in Code/Full SKU starting V1.5 → **"Ship the fixes — $49 →"** (Auto-PR upgrade)
   - On `PASS` → **"Share this verdict →"** (social proof / brand surface)
4. **Findings checklist** below — grouped by severity (Blocker → Polish), with per-row affordances: filter (by reviewer), group (by file / by severity), sort, mark as "won't-fix" (with undo per H3), expand evidence, copy fix-recommendation.
5. **Empty states** speced per Optic: zero findings → celebration card with brand voice; CLI offline → "Reconnect your CLI" + pairing link; payment required → upsell card.

**Copy (locked v0.4, Herald):** FAIL state body — *"We found 14 issues across UX, accessibility, and brand consistency. Here's every one, with the evidence."* Not *"Your product failed."* The numbers and the evidence carry the verdict; the brand voice stays neutral-and-confident, not punitive.

**CLI-mode watermark (D7):** when the verdict was produced by a local runner, a **`Private Run · Self-Audited`** badge appears below the verdict line. Help-text (programmatically associated via `aria-describedby`, SC 1.3.1): *"This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device."*

**Step E — Fix delivery.**
- **MVP tier (specs only):** every finding ships a `recommendation` field + code snippet. Customer applies it. Free with audit.
- **V1.5 tier (Auto-PR):** Deferred per Decision D3. See §11.

### 7.3 Build Workflow (V2)

1. Customer describes the product (vision, audience, vibe, constraints).
2. BigBrain produces a **structured brief** and confirms with the customer before dispatching.
3. Layer leads execute their phases per `SYSTEM_ACHITECTURE.md` §3.
4. Customer can watch a **live dashboard** of layer status.
5. Output is delivered as one or more of:
   - **Roadmap + documentation bundle** (zip / browseable docs)
   - **Seeded GitHub repo** with milestones, issues, README, ARCHITECTURE.md, scaffolded folders
   - **Working scaffold/MVP code** (V2.1 — gated by an audit-pass)
6. Final readiness score is included.
7. The Audit gate runs before delivery — no Build output ships without `PASS` or `PASS WITH FIXES`.

---

## 8. The Three Execution Modes

| | BYOK | Claude Code CLI | Managed |
|---|---|---|---|
| Who pays for tokens | Customer (their Anthropic account) | Customer (their Claude Code subscription) | Jo (rolled into pricing) |
| Where the runner runs | Jo's hosted infra | Customer's machine | Jo's hosted infra |
| Where the code lives during a run | Jo's infra (transient) | Customer's machine only | Jo's infra (transient) |
| Verdict watermarking | None (server-verified) | `Private Run · Self-Audited` badge + help-text | None (server-verified) |
| Suitable for confidential / regulated codebases | No | **Yes** | No (without future enterprise tier) |
| Setup effort | Low (paste key) | Medium (install CLI, pair) | Lowest (just pay) |
| Margin to Jo | Platform fee only | Platform fee only | Full margin |

**Constraint:** the audit verdict is only meaningful when produced by an unmodified runner. CLI mode signs each verdict with the runner's binary hash; the watermark is a **transparency signal to the customer**, not a security guarantee against the customer themselves. Tampering claims are not made (D7).

---

## 9. Audit System (productized)

### 9.1 Audit products (three named SKUs)
The product surfaces three distinct audits so customers see clear scope and pricing rather than a single audit with caveats.

| Product | Inputs required | What it can find | What it cannot find |
|---|---|---|---|
| **Surface** | Deployed URL only (must be customer-attested in free tier; paid tiers may audit third-party URLs with authorization attestation per §14.7) | UX heuristics, copy, visible accessibility issues, brand consistency, audience alignment on the live UI | Code-level issues (bundle size, security patterns, dead code, schema problems) |
| **Code** | Source repo (GitHub App) or local folder (CLI) | Code-level findings + design-system audit + everything Surface finds (when a URL is also provided) | Live-runtime UX issues if no URL is provided |
| **Full** | Source **and** URL | Everything: deepest audit. Reviewers cross-reference source ↔ runtime | (none — this is the deepest tier) |

Surface audits cap at the **Quick** or **Custom** depth (§7.2 Step B). Code and Full audits unlock all three depths.

### 9.2 Auditors
Per `SYSTEM_ACHITECTURE.md` §4 and `README.md` §"The Audit Layer":

| Reviewer | Responsibility | Surface | Code | Full |
|---|---|---|---|---|
| **Jury** | Orchestrator, dispatch, synthesis | ✓ | ✓ | ✓ |
| **Optic** | UX/UI heuristics (Nielsen, Hick's, Fitts's) | ✓ | ✓ | ✓ |
| **Proof** | Copy / wording / tone / reading level | ✓ | ✓ | ✓ |
| **Halo** | WCAG 2.2 AA accessibility | ✓ (visible) | ✓ (semantic) | ✓ (both) |
| **Compass** | Audience alignment | ✓ | ✓ | ✓ |
| **Trace** | Flow & logic on the as-built product | ✓ | ✓ | ✓ |
| **Canon** | Visual / brand consistency | ✓ | partial | ✓ |

### 9.3 Audit depths → reviewer mapping (locked v0.2; renamed v0.3)
- **Quick:** Optic + Proof + Halo (~10–15 min runtime)
- **Custom:** customer picks any subset of the 6 reviewers
- **Comprehensive:** all six + Jury synthesis (~20–45 min runtime)

### 9.4 Output contract (stable across all audits)
Every audit returns a JSON object that conforms to `runner/schemas/audit-output.v1.schema.json` (Verify, v0.4 — schema file must exist at M0 exit). Web app and score engine consume this contract:
```
{
  "verdict": "PASS" | "PASS WITH FIXES" | "FAIL",
  "score": <int 0..100>,
  "score_engine_version": "v1",
  "audience": "...",
  "watermark": null | "private-run-self-audited",
  "findings": [
    {
      "id": "F-001",
      "reviewer": "halo",
      "severity": "Critical",
      "layer": "frontend",
      "summary": "Form labels missing for /signup inputs",
      "evidence": {
        "type": "file" | "url" | "screenshot" | "transcript",
        "alt": "<required for screenshot evidence per WCAG SC 1.1.1>",
        "...": "..."
      },
      "recommendation": "...",
      "estimated_effort": "S" | "M" | "L"
    }
  ],
  "score_breakdown": { "ux": 88, "accessibility": 62, "copy": 91, "brand": 84, "flow": 70, "audience": 79 }
}
```

`evidence.alt` is **required** for any evidence whose `type` is `screenshot` (Halo HC4). Transcripts must be surfaced as semantic DOM text in the UI, not as opaque JSON blobs.

---

## 10. Readiness Score (locked v0.2 — Strict elite gate; fixtures committed v0.4)

A deterministic function of the findings. Independent of the LLM so it is reproducible and explainable in the UI. Versioned and stamped on every audit as `score_engine_version: "v1"` so re-audits remain comparable across time.

**Formula:**
```
score = max(0, round_half_even(100 - Σ severity_weight[finding.severity]))
```

**Rounding mode:** `round-half-to-even` (banker's rounding) — locked v0.4 per Verify. Eliminates the ambiguity around Polish-decimal sums (e.g., 11 Polish findings × 0.5 = 5.5 deduction → integer 94 not 95). Documented in `runner/schemas/score_engine.v1.md`.

**Weights (locked v1):**
- Blocker: 30
- Critical: 18
- Major: 7
- Minor: 2
- Polish: 0.5

**Verdict thresholds (locked v1):**
- `FAIL` if any Blocker exists, OR score < 70
- `PASS WITH FIXES` if score in [70, 94]
- `PASS` if score ≥ 95 *(the math enforces "no Critical and no Major" automatically: one Major = 7 deduction = 93, already below 95)*

**Test fixtures (Verify, v0.4 — must exist at M0 exit):** `runner/schemas/score_engine.v1.fixtures.json` contains canonical rows: empty set → 100; one Blocker → 0 (clamped); three Majors → 79; one Major + 10 Polish → 88; exact threshold rows at 69/70/94/95. The test suite asserts `score_v1(input) === expected` for every row.

**Brand posture:** Strict elite gate. Most first audits are expected to FAIL. The product loop is *audit → fail → upgrade audit tier → fix → re-audit → pass*. The premium positioning depends on the verdict meaning something — every finding is required to ship with cited evidence (file path, line range, contrast measurement, screen-reader transcript, or screenshot with alt text) so a FAIL can be defended in writing.

**Score breakdown:** displayed per-category (UX, Accessibility, Copy, Brand, Flow, Audience) as both a radar chart *and* a semantic data table per §7.2 Step D and SC 1.1.1/1.3.1. Category scores computed only from findings tagged with that reviewer.

**Versioning convention:** weights/thresholds live in `runner/schemas/score_engine.v1.json`. Any change to the rubric is a new version (`v2`, `v3`), never an in-place edit. Customers see their current and prior verdicts with the version that produced them.

---

## 11. Fix Delivery

### 11.1 MVP tier — Specs only
Every finding ships with a `recommendation` field describing the fix in prose + code snippets. Customer applies it.

### 11.2 V1.5 tier — Auto-PR (deferred per Decision D3)
**Status: deferred from MVP to V1.5** (locked v0.4, Decision D3).

Customer purchases the upgrade (one-time or as part of a higher subscription). The build layer (Forge / Vega / etc., gated by Jury re-audit) generates code changes and opens a PR against the connected repo with:
- A description summarizing all included findings.
- Per-commit attribution to the originating finding ID.
- A "Re-audit" badge confirming the originating reviewer signed off.
- **AI-content disclosure** in the PR body per EU AI Act Art. 50 + C2PA-style provenance (Comply): every commit message carries `AI-Authored: studio-zero/runner@v<x.y.z>` trailer; PR body opens with the Art. 50 disclosure paragraph (template owned by Comply + Herald).

**Hard rules** (carried over from `BIGBRAIN.md`):
- Auditors do not author the fixes — build agents do, then auditors re-verify before the PR is opened.
- A PR that does not pass re-audit is **not** opened; the customer is shown why and refunded if applicable.
- We never push to default branches; PRs target a feature branch named `studio-zero/fix-<run-id>`.
- Verified by §18.M5.gate-3 negative test (default-branch push attempt → blocked → audit-logged).
- **GitHub App uninstall AFTER PR opened** (Decision D23, v0.5): PR persists in customer's repo; Studio Zero loses webhook visibility into merge status. UI shows banner *"Tracking unavailable — reinstall the Studio Zero GitHub App to resume merge status."* Stale-tracking is accepted at MVP-V1.5; webhook-proxy via GitHub Action revisited at V2 if Auto-PR attach rate justifies the infra burden.

### 11.3 Interim AI-content disclosure (M0/M1, Comply, v0.4)
Even before Auto-PR ships, any artifact Studio Zero authors that the customer might publish (e.g., remediation snippets in findings) carries an `X-AI-Generated: studio-zero` HTTP header on API responses and an `<meta name="ai-generated" content="studio-zero">` tag in any HTML emitted. EU AI Act Art. 50 binds 2026-08-02 (~84 days from PRD date); we do not wait for V1.5 to land disclosure machinery.

---

## 12. Pricing & Tiers (locked v0.2 skeleton — Penny refines after first 5 customers; v0.4 removes unsupported claims)

| Tier | Audience | Includes | Price |
|---|---|---|---|
| **Free** | Tire-kickers, demo viewers | **1 Project, unlimited Surface re-audits** on customer-attested own URL (D2) | $0 |
| **BYOK Starter** | Technical solo founders | 2 audits/mo (any depth), specs-only fixes | **$29/mo** *(D4 deferred — Penny + Scout argue for $19; Jo's call)* |
| **BYOK Pro** | Indie agencies, freelancers | Unlimited audits (any depth), specs-only, priority queue | **$79/mo** |
| **Managed Starter** | Non-technical solo founders | 2 Full audits/mo, tokens included, specs-only | **$99/mo** |
| **Managed Pro** | Serious teams, agencies | Unlimited Full audits + **Auto-PR fix delivery (V1.5)**, tokens included | **$249/mo** |
| **Auto-PR upcharge (V1.5)** (BYOK only) | Any BYOK tier | Per-fix bundle | **$49 per fix bundle** *(D5 deferred — Scout argues tiered S/M/L $15/$49/$99; Jo's call)* |
| **Claude Code CLI mode** | Privacy-sensitive technical users | Platform fee only; tokens via customer's Claude Code subscription | **$19/mo** |

**Annual billing:** 2 months free (same SaaS standard).

**Free-tier safeguards:** Surface audits are low-token-cost. To prevent abuse: free tier limited to **1 project per signup** (unlimited re-audits within that project, per D2); email-verification required; IP-rate-limited; only customer-attested own-URL audits.

**Positioning (v0.4):** *audit-tool pricing with agency-tool depth* — Scout, §3a. Comparable to SonarQube/Codacy on the low end and freelance agency audits on the high end. Penny revisits the skeleton after the first 5 paying customers and presents conversion / churn data with proposed adjustments.

---

## 13. Technical Architecture

### 13.1 Components
```
┌──────────────────┐     ┌────────────────────┐     ┌─────────────────────┐
│  Web App         │────▶│  Job Queue         │────▶│  Hosted Runner Pool │
│  (Next.js, Jo's  │     │  (Postgres or      │     │  (Rootless containers│
│  hosted)         │     │   Redis BullMQ)    │     │   + seccomp + egress │
│                  │     │                    │     │   allowlist, M1;     │
│                  │     │                    │     │   Firecracker V2)    │
└────────┬─────────┘     └────────────────────┘     └─────────────────────┘
         │                                              ▲
         │ websocket / long-poll                        │
         ▼                                              │
┌──────────────────┐                                    │
│  CLI Companion   │────────────────────────────────────┘
│  (customer's     │  (CLI-mode jobs run locally,
│   machine)       │   results POSTed back)
└──────────────────┘
```

### 13.2 Database (single Postgres, RLS, per Phase 7 decision)
Tables (initial):
- `tenants`, `users`, `tenant_members`, `api_keys` (encrypted), `oauth_tokens` (encrypted)
- `projects` (one row per audit/build run)
- `runs` (state machine state, links to `projects`)
- `findings`, `score_snapshots`, `fix_pr_jobs`
- `billing_events`, `subscriptions`
- `consent_records` (cookie + AI-training consent, per Comply)
- `breach_events` (incident triage log for GDPR Art. 33 72h notification, per Comply)

All tenant-scoped tables have a `tenant_id` column with an RLS policy that requires `tenant_id = auth.tenant_id()`. **Single exception:** `auth.users` is managed globally by Supabase Auth and does **not** carry a `tenant_id`; tenancy on the user side is mediated by the `tenant_members` mapping table. Every other application table follows the rule.

### 13.3 Runner contract
The runner is a single TS package consumed by both the hosted worker and the CLI binary. It exposes:
```
runAudit(input: AuditInput): AsyncIterable<AuditEvent>
runBuild(input: BuildInput): AsyncIterable<BuildEvent>
```
Events are streamed (progress, partial findings, agent logs) so the dashboard can update live. The `AuditEvent` discriminated union is enumerated in `runner/schemas/audit-event.v1.ts` (Verify, v0.4):
```
type AuditEvent =
  | { kind: 'progress'; agent: string; phase: string; pct: number }
  | { kind: 'finding'; finding: Finding }
  | { kind: 'agent_log'; agent: string; level: 'info'|'warn'|'error'; message: string }
  | { kind: 'final_verdict'; result: AuditOutput }
  | { kind: 'error'; recoverable: boolean; code: string; message: string }
```
Final result conforms to the contract in §9.4.

### 13.4 Secret handling
- BYOK API keys: encrypted at rest using **Supabase Vault** (`pgsodium` TCE, **XChaCha20-Poly1305 AEAD** — v0.5 Cipher Fix-4; the primitive `pgsodium` actually implements; equivalent 256-bit AEAD security to AES-256-GCM but with a 24-byte nonce — Forge must call `crypto_aead_xchacha20poly1305_ietf_encrypt`, not the AES-GCM API) with `tenant_id::text` bound as Additional Authenticated Data. Decrypted only inside the runner process via a tenant-scoped Edge Function RPC. Never logged.
- OAuth tokens (GitHub App): stored in Supabase Vault, separate access policy from BYOK keys (the web app needs to decrypt them for repo listing during onboarding; the runner needs them at clone time). GitHub App with **per-repo permissions only** (no account-wide `repo` scope) — locked v0.4 per Decision D1.
- Customer code (in BYOK and Managed modes): cryptoshredded — encrypted with a per-run key stored in Vault; key deleted at retention expiry so backups become mathematically destroyed simultaneously. Default retention 7 days, customer-overridable to 0–30 (see §14.4 retention table).
- CLI mode customer code: never leaves the customer's machine.

### 13.5 Multi-tenancy isolation
- Database: enforced by Postgres RLS (Phase 7 decision). Runner authenticates via short-lived tenant-scoped JWTs minted at job dispatch (closes Atlas's v0.2 Blocker B2).
- Runtime: each run executes in a tenant-isolated working directory (`/var/runs/<tenant-id>/<run-id>/`) inside a rootless container with dropped capabilities (CAP_NET_RAW, CAP_SYS_ADMIN, etc. dropped) and a seccomp profile. Tenant-id is fenced into the runner's process env; no path can escape.
- Concurrency caps: per-tenant queue depth limits; per-tenant token budgets for Managed tier.

### 13.6 Observability
- Sentry for errors with **`beforeSend` PII scrub** that strips file contents, high-entropy strings, and any payload exceeding entropy threshold (closes Cipher's v0.2 Blocker B5).
- PostHog for product analytics with consent-gated init (no events fire until cookie consent granted).
- Structured logs (Pino), tenant-id tagged on every line; CI test asserts `tenant_id` presence on every log line emitted during a synthetic run.
- Per-run timeline visible in the dashboard (which agent ran when, how long, token cost). Live; not just post-hoc (Optic, v0.4).

---

## 14. Non-Functional Requirements

### 14.1 Performance
- Quick audit: < 10 min p95 (SLI measured over rolling 7d, hosted-runner cohort).
- Full audit: < 45 min p95 (same SLI definition).
- Web dashboard: TTFB < 500ms, score page < 2s on cold load.

### 14.2 Reliability
- 99.5% availability for the web app (single region acceptable for MVP).
- Run failures are retried up to 2x; partial results are persisted so a retry resumes rather than restarts. **Partial-result boundary:** per-reviewer (Jury composes from completed reviewers; in-flight reviewer restarts).
- A run that fails irrecoverably refunds tokens (BYOK) or credits (Managed).
- **Jury synthesis stall:** if `jury_synthesizing` state exceeds 30s, run is marked `failed_synth_timeout`, tokens refunded, customer offered restart with the same intake (Decision D21, v0.5). Bounded-ETA exemption from Trace's dead-end-free invariant remains for runs under 30s.

### 14.3 Security
- OWASP Top 10 baseline for the web app (Shield agent reviews before launch).
- Secret scanning on customer code intake (don't log API keys we accidentally read from their repo).
- Rate limiting per IP and per tenant.
- All admin actions audit-logged (`audit-action.js` exists; needs productizing).
- **SSRF egress filter, prompt-injection mitigation, telemetry redaction middleware, ingestion limits** — all four mandatory at M0/M1 (locked v0.4, Decision D9).

### 14.4 Privacy & Retention (rewritten v0.4 — Comply)

Data residency: US-only for MVP. EU residency added when first EU customer asks.
GDPR right-to-delete honored within **30 days** of request (Art. 17). Right-of-access within 30 days (Art. 15). Right-to-portability via JSON export (Art. 20).

**Retention table:**

| Data class | Default retention | Customer override | Rationale |
|---|---|---|---|
| Customer code (BYOK/Managed) | 7 days | 0–30 days | Cryptoshredding via Vault key delete; backups destroyed simultaneously |
| Findings + verdicts + scores | **24 months** (changed from "indefinite" v0.4) | Export + delete on request | GDPR Art. 5(1)(e) storage limitation |
| Audit logs (admin actions) | 7 years | Not customer-overridable | SOC2 / legal-hold |
| Consent records | Term of relationship + 3 years | Not customer-overridable | Demonstrates compliance per Art. 7(1) |
| Billing events | 7 years | Not customer-overridable | Tax + accounting law |

**Breach notification:** Comply maintains a runbook implementing GDPR Art. 33 72-hour notification + state breach laws (CA AB 1130, NY SHIELD, etc.). Logged in `breach_events` table; rehearsed quarterly.

### 14.5 Compliance (v0.4 — pulled forward per Comply)
- SOC 2 not in MVP scope; flagged as a V2+ blocker for enterprise tier.
- AI disclosure copy required on every audit report (per Comply).
- **EU AI Act Art. 50** binds **2026-08-02**. Interim disclosure machinery (HTTP header + `<meta>` tag + AI System Card v0.1 placeholder) ships at M0/M1, not M5. Full AI System Card v1.0 ships before V1.5 Auto-PR launch.
- **FTC AI-claim substantiation:** every marketing claim referencing competitors or capabilities (e.g., §3a table, §12 positioning copy) requires substantiation evidence file checked in at `marketing/claims-substantiation/<claim-id>.md` before publication. Herald + Proof + Comply re-verify quarterly.
- **California SB 942** (AI Transparency Act): generated content carries machine-readable provenance — covered by the §11.3 disclosure machinery.
- **DMCA Designated Agent** registered with U.S. Copyright Office as M5 gate deliverable (Comply).
- **GDPR Art. 28 DPA** template + subprocessor list published as M3 gate deliverable (locked v0.4, Decision #17).

### 14.6 Accessibility (added v0.4 — Halo)

Studio Zero's **customer-facing surface** (web app, dashboard, score page, findings UI, evidence viewer, settings, billing, exported reports, marketing site, CLI-emitted Markdown rendered on GitHub) conforms to **WCAG 2.2 AA**. Conformance verified by independent third-party audit before M5 launch and re-verified on every primary-flow release thereafter. Conformance statement published at `/accessibility`.

**Per-section a11y addenda merged from Halo v0.3 review (HC1–HC10):**
- **HC1 Verdict color:** text + icon + color per SC 1.4.1 — covered in §7.2 Step D.
- **HC2 Live regions:** progress streams via `aria-live="polite"` + `role="status"` per SC 4.1.3; respects `prefers-reduced-motion` per SC 2.3.3. Throttle to ≤4 updates/sec to avoid AT overwhelm per SC 2.2.1.
- **HC3 Score chart:** radar chart paired with semantic `<table>` and text summary per SC 1.1.1, SC 1.3.1, SC 1.4.11.
- **HC4 Screenshot & transcript evidence:** `evidence.alt` required for screenshot type (§9.4); transcripts rendered as semantic DOM text, not opaque JSON (SC 1.1.1, SC 1.4.5).
- **HC5 API-key input:** `autocomplete="off"` + show/hide toggle keyboard-operable per SC 2.1.1; `aria-describedby` linking purpose per SC 1.3.5; supports paste; supports password managers per SC 3.3.8 *Accessible Authentication*.
- **HC6 Stripe integration:** use Stripe **Checkout (hosted)** as default; Stripe Elements embed only as opt-in for power users (SC 2.1.2 No Keyboard Trap).
- **HC7 Pricing table:** semantic `<table>` with `<th scope>`; "Most popular" badge marked up as text + visual, not visual-only (SC 1.3.1); reflows at 320 CSS px without horizontal scroll per SC 1.4.10; line-height + spacing per SC 1.4.12.
- **HC8 Run timeline:** ARIA `treegrid` pattern with full keyboard nav per SC 2.1.1, SC 4.1.2.
- **HC9 Auto-PR Markdown emission (V1.5):** heading hierarchy honored; per-finding badges have text alternatives; checkboxes don't rely on visual state only.
- **HC10 AI disclosure:** programmatically associated via `aria-describedby` to the verdict block per SC 1.3.1, SC 3.2.4.

**New WCAG 2.2 SCs explicitly in scope:**
- SC 2.4.11 *Focus Not Obscured (Minimum)*
- SC 2.4.13 *Focus Appearance*
- SC 2.5.7 *Dragging Movements*
- SC 2.5.8 *Target Size (Minimum)* — 24×24 CSS px minimum on all interactive controls
- SC 3.3.7 *Redundant Entry*
- SC 3.3.8 *Accessible Authentication*

**Test gate:** axe-core fails CI on Critical + Serious violations. AT release recordings (NVDA + VoiceOver) cover the FAIL-verdict primary flow on every release, not just happy paths.

### 14.7 Acceptable Use Policy (added v0.4 — Comply)

Customer-facing AUP published before M5. Mandatory clauses:
- **URL-audit authorization:** customer warrants they are authorized to audit any URL submitted to Studio Zero. Checkbox at intake with the explicit text *"I am the owner of, or have written authorization to audit, the URL above."* Attestation logged in `audit_logs` with timestamp + IP + user_id. Closes Comply's CFAA exposure (LB1).
- **No automated abuse:** no scraping Studio Zero outputs back into a competing audit product.
- **No prohibited content:** the artifact under audit must not contain CSAM, malware C2 infrastructure, or other illegal content. Studio Zero may suspend immediately if detected; AI-emitted findings on such artifacts may not be published externally.
- **Termination:** Studio Zero may terminate accounts violating the AUP; refund pro-rata per regional law (see Decision #20).

---

## 15. Success Metrics

| Phase | Metric | Target |
|---|---|---|
| MVP launch | Paying customers in first 60 days | 25 |
| MVP launch | Audit completion rate (full audits not aborted) | > 80% of *full audits run* |
| MVP launch | First-audit FAIL rate | ≥70% of *first audits run* per signup — Strict-elite rubric is designed to fail most first audits |
| MVP launch | Median readiness score on **second** audit (after one upgrade-tier cycle) | ≥ 70 (PASS WITH FIXES band) — proves the loop produces real improvement |
| MVP +90d | **Code-audit upgrade attach rate** (free Surface → paid Code) | > 20% of free signups within 30 days |
| MVP +90d | NPS from first 25 customers | > 30 |
| V1.5 launch | Auto-PR upgrade attach rate | > 15% of Pro customers |
| V2 launch | Build-mode roadmap delivery rate | > 70% complete within 24h |
| Ongoing | Re-audit improvement after fix-delivery | average +20 score points |

**SLI definitions** (Verify, v0.4):
- "First-audit FAIL rate" denominator = first audit *completed* per signup, measured on rolling 30-day cohort.
- "Median readiness score on second audit" denominator = users with ≥2 completed audits.
- "p95 audit runtime" measured over rolling 7d on the hosted-runner cohort only (CLI excluded from SLO).

### 15.5 GTM Channels (added v0.4 — Scout + Signal)

The primary persona (technical solo founder) does not live on Google search. Channel plan owned by Signal; copy owned by Herald; A/B tests owned by Hook.

| Channel | Owner | Pre-launch (M0–M4) | Launch (M5) | Sustained (M5+) |
|---|---|---|---|---|
| X / Twitter | Signal + Herald | Build-in-public threads, Jury verdict screenshots | Launch thread + Devin/Cursor/v0 head-to-head receipts | 3 posts/week |
| Hacker News | Signal | Build-in-public Show HN draft | Show HN launch | Comment presence on adjacent threads |
| IndieHackers | Signal + Herald | Milestone posts | Launch post | Weekly progress |
| Product Hunt | Signal | Hunter pre-recruitment | Launch day | n/a |
| Discord (founder communities) | Signal | Authentic presence, no shilling | AMAs in 3 communities | Sustained presence |
| Reddit (r/SaaS, r/EntrepreneurRideAlong, r/webdev) | Signal + Comply (FTC #ad disclosure) | Listening only | Launch announce per subreddit rules | n/a |
| SEO content (Lens) | Lens + Herald | "How to audit your AI-generated app" cluster — 12 posts by M5 | n/a (organic ramps slowly) | 2 posts/month |
| Partner integrations | Signal | Cursor / Bolt / Lovable user-community presence | Co-marketing if a partner signs | n/a |

The "25 paying customers in 60 days" target (§15) is conditional on at least 4 of these channels showing activity by M5.

---

## 16. Phasing & Milestones (rewritten v0.4 — Verify + Comply + Sprint)

Per-milestone **exit gate** is binary, automation-checkable, and gates promotion to the next milestone. No vibes.

| Phase | Scope | Exit gate (binary) | Target |
|---|---|---|---|
| **M0 — Spike** | Runner contract decided, CLI ↔ web pairing prototype, RLS schema scaffolded, **Decision D8 sandbox choice locked**, **score_engine v1 fixtures committed**, AuditEvent enum + schema files committed, **AI Act interim disclosure headers shipping** | `pnpm test score-engine && pnpm test schema:validate` green; `runner/schemas/{audit-output,audit-event,score_engine}.v1.{json,ts}` exist in HEAD; first synthetic run emits `X-AI-Generated` header | week 2 |
| **M1 — Audit MVP (BYOK only)** | GitHub-App repo audit (D1), Surface + Code SKUs, Quick + Comprehensive depths, score, checklist, specs-only fixes, **rootless container sandbox + seccomp + egress allowlist**, SSRF/prompt-injection/redaction/ingestion limits live (D9) | Nightly p95 SLO green over 7d; RLS cross-tenant + SSRF + redaction + path-traversal fuzz suite green; first self-audit ≥ PASS WITH FIXES | week 6 |
| **M2 — Managed mode + billing** | Stripe, plans, token-budget caps, Managed-tier runner | Prompt-injection corpus 100% blocked; token cap fires under load test; top-30 sandbox-escape corpus green; **GDPR Art. 28 DPA + subprocessor list published (Decision #17)** | week 9 |
| **M3 — CLI mode** | Local-folder audit via CLI, deployed-URL audit on paid SKUs, Private Run watermark | External pentest exit criterion: ≤1 Major, 0 Critical; Stripe idempotency tests green; CLI pairing tamper/replay/unpaired rejection tests green | week 11 |
| **M4 — Lifecycle + Polish** | E1–E5 emails live, marketing site, status page, conformance audit | E1–E5 trigger correctness verified end-to-end; **WCAG 2.2 AA third-party conformance audit passed**; `/accessibility` statement live | week 14 |
| **M5 — Public launch** | Docs, onboarding, observability, **DMCA agent registered**, **at least 4 GTM channels active** | All M4 gates remain green; DMCA registration confirmation in `compliance/dmca-agent.pdf`; GTM channels enumerated in `marketing/launch-checklist.md` | week 16 |
| **V1.5 — Auto-PR delivery** | Build agents wired into fix delivery, gated by Jury re-audit, AI System Card v1.0, Art. 50 PR-body disclosure | C6 Auto-PR negative-case test green (failed re-audit → PR not opened); C8 default-branch push fuzz green; PR-body Art. 50 snapshot test green | week 16 + 6 |
| **V2 — Build mode** | Roadmap + docs + seeded repo + dashboard + score, **Firecracker microVM graduation** | Roadmap-bundle schema committed; audit-gate-blocks-delivery negative test green; Firecracker A/B test shows no regression vs rootless container | week 16 + 12 |
| **V2.1 — Scaffold generation** | Working MVP code output, audit-gated | <30min clean-VM bootstrap of a generated scaffold; offline-mode network-tap proves no code POSTed externally | week 16 + 18 |

Weeks are placeholders; Sprint firms up the schedule once M0 lands.

---

## 17. Decisions Log (v0.4 — locks 5 v0.3-open decisions; opens 4 new)

Per `BIGBRAIN.md` Hard Rule §3 ("no silent decisions"), every cross-layer decision is logged with rationale.

### Locked v0.2 (carried)

1. **Score weights & thresholds — Strict elite gate.** Weights: Blocker 30, Critical 18, Major 7, Minor 2, Polish 0.5. Thresholds: FAIL <70 or any Blocker; PASS WITH FIXES 70–94; PASS ≥95. Rounding: round-half-to-even (v0.4). Versioned as `score_engine.v1.json`.
2. **Audit-depth → reviewer mapping.** Quick = Optic + Proof + Halo. Custom = customer picks. Comprehensive = all six + Jury.
3. **Pricing skeleton.** Free / $29 / $79 BYOK; $99 / $249 Managed; $49 per Auto-PR bundle (V1.5); $19 CLI. Premium positioning. Penny revisits after first 5 customers.
4. **GitLab parity DEFERRED post-launch, demand-gated.** GitHub-only at MVP.
5. **URL-only audits = separate "Surface" audit product.** Three SKUs (Surface / Code / Full).
6. **CLI tamper detection** (revised in v0.4 — see Decision D7 below).
7. **Free tier** (revised in v0.4 — see Decision D2 below).
8. **Refund policy on FAIL verdicts.** No refund + 30-day free re-audit credit. Comply codifies in TOS. (Revised by Decision #20 in v0.4.)
9. **Multi-user-per-tenant DEFERRED to V2.**
10. **Run-data storage on Supabase.** Postgres + Storage + Auth + Realtime.

### Locked v0.3 (carried)

11. **Audit *level* renamed to audit *depth*; "Layered" → "Custom"; "Full" → "Comprehensive".**
12. **Supabase Vault (`pgsodium` TCE, XChaCha20-Poly1305 AEAD per v0.5 Cipher Fix-4) replaces `libsodium sealed boxes`.**
13. **§15 success metrics rewritten** for Strict-elite weights.
14. **`auth.users` is the explicit RLS exception** in §13.2.
15. **§4 / §7 scrubbed of GitLab references** for MVP.
16. **§10 PASS rule simplified to `score ≥ 95`.**

### Locked v0.4 (resolves 5 of 9 v0.3-open decisions)

**D1. GitHub App from day one — LOCKED.** Per-repo permissions only; no account-wide `repo` OAuth scope. Adds ~3–5 days to M1 vs OAuth, prevents both Shield's Blocker B4 and Sprint's re-auth UX disaster, and matches category-standard practice (Cursor, Codacy, Snyk all use GitHub App). Rationale: parity + security blast-radius reduction.

**D2. Free tier = 1 Project, unlimited Surface re-audits — LOCKED.** Switched from "1 free Surface audit per signup." Rationale (Hook, ICE 30/30): the strict-elite gate fails 70%+ of first audits; the free tier's only job is to make the customer feel the audit→fix→re-audit loop close. A one-shot free audit kills the dopamine loop; unlimited re-audits within one project preserves it. Abuse prevention: email-verification, IP-rate-limit, customer-attested-own-URL only.

**D3. Auto-PR fix delivery DEFERRED to V1.5 — LOCKED.** MVP ships specs-only. V1.5 wires Auto-PR with full AI Act Art. 50 disclosure machinery + Jury re-audit gate. Rationale: 7-of-7 v0.3 panel agents independently voted defer (test burden, trust UX, legal exposure). MVP upsell path becomes free Surface → paid Code SKU (E2 email lock). Interim AI-disclosure machinery in §11.3 ships at M0/M1 regardless.

**D4. Starter pricing — DEFERRED (still open).** Panel split: Hook + Scout + Herald argue $19 (match CLI, undercut competitors); Penny argued $29 in v0.2 panel. Jo's call. Recommendation if no decision by M2: ship at $29 with an A/B test slot at $19 for the first 200 signups.

**D5. Auto-PR pricing — DEFERRED to V1.5 prep (still open).** Panel split: Hook + Scout argue tiered S/M/L ($15/$49/$99); Penny argued flat $49. Jo's call at V1.5 spec time.

**D6. Milestone reorder M2↔M3 (Managed before CLI) — LOCKED.** Sprint argued Managed reaches more customers faster; CLI is the privacy-tier with smaller initial demand. Hook + Verify + Scout + Herald concurred. M2 now = Managed; M3 now = CLI.

**D7. CLI tamper-detection reframed as `Private Run · Self-Audited` watermark — LOCKED.** Herald owns the brand-voice frame ("Private Run · Self-Audited" — neutral, transparent, customer-positive). Halo owns the a11y spec (icon + text + color per SC 1.4.1; `aria-describedby` help-text per SC 1.3.1; identical render across CLI/web/PR per SC 3.2.4). Drops the false "tamper detection" trust claim per 7-of-7 panel concurrence.

**D8. Sandbox strategy — LOCKED (phased).** **Rootless container with dropped caps + seccomp + egress allowlist at M1**; **Firecracker microVM as V2 graduation** gated by first clean external pentest. Rationale (Verify test-burden math): no-execution breaks Code/Full SKUs (unwinnable); Firecracker is HIGH setup / LOW per-test (needs KVM-in-CI = self-hosted runners); rootless container is MEDIUM/MEDIUM with mature corpus (~200 escape patterns, falco, CIS). Ship the medium-burden option to launch; graduate after pentest survives.

**D9. SSRF / prompt-injection / telemetry redaction / ingestion limits — LOCKED at M0/M1 mandatory.** All four are M0/M1 exit-gate items, not deferred. Verify owns the test plan; Shield owns the threat model; Forge owns the implementation.

### New v0.4 decisions (added per Comply panel sign-off)

**#17. GDPR Article 28 Data Processing Agreement (DPA) + subprocessor list — LOCKED for M2 gate delivery.** DPA template authored by Comply, reviewed by Ledger, published before Managed tier first customer. Subprocessor list (Supabase, Stripe, Anthropic, Sentry, PostHog, Vercel, etc.) maintained at `/subprocessors` with 30-day change-notification commitment.

**#18. AI System Card (EU AI Act Art. 50) — LOCKED.** Interim machinery (HTTP header + `<meta>` + System Card v0.1 placeholder) at M0/M1; v1.0 before V1.5 Auto-PR launch. Comply owns content; Herald + Proof own readability.

**#19. BYOK Provider Pass-Through ToS clause — LOCKED.** ToS includes explicit pass-through of Anthropic ToS to BYOK customers; customer attests their Anthropic account is in good standing; Studio Zero disclaims joint-controllership for tokens consumed under customer's API key. Comply authors; published before M1.

**#20. Regional Refund Matrix — LOCKED.** Replaces single "no refund + free re-audit" policy. EU customers: 14-day cooling-off waiver checkbox at checkout per Directive 2011/83/EU. UK: parallel CCR 2013 path. California: pro-rata refund per SB 313. FTC Click-to-Cancel (16 CFR 425) UI compliance. Dispute Finding path before chargeback escalation. Comply + Ledger codify; Forge + Vega build the regional gating; live before any paid charge.

### v0.5 — Phase-3-surfaced edge cases resolved

**#21. Jury synthesis stall behavior — LOCKED.** If `jury_synthesizing` exceeds 30s, run state transitions to `failed_synth_timeout`, tokens are refunded per §14.2, customer is offered restart with the same intake input. Rationale: cleanest contract; aligns with existing §14.2 retry semantics; closes Trace's dead-end-free invariant. Specced in `ia/user-flows/audit-run-state-machine.md`.

**#22. EU 14-day cooling-off window resets per upgrade — LOCKED.** EU/UK customer upgrades restart a fresh 14-day cooling-off window per contract. Rationale: aligns with Studio Zero's audit-tool transparency posture (customer-friendly default); modest revenue risk acceptable given strict-elite gate already self-selects customers who understand they are paying for *receipts*, not promises. Comply + Ledger codify in TOS before M2 (Managed-tier paid charges) launches.

**#23. GitHub App uninstall after Auto-PR opened — LOCKED (MVP-V1.5).** PR persists; tracking goes stale; banner notifies customer. Webhook-proxy via customer-installed GitHub Action deferred to V2 evaluation. Rationale: preserves D1 (GitHub App per-repo blast-radius reduction); honest UX; revisit if Auto-PR attach rate >15% justifies infra investment.

### Still open after v0.5 (need Jo's call)

- **D4** Starter pricing $19 vs $29 (Penny vs Hook+Scout+Herald)
- **D5** Auto-PR pricing flat $49 vs tiered $15/$49/$99 (decision pushed to V1.5 spec time)

---

## 18. Test Strategy (added v0.4 — Verify owns this section)

A PRD without a test obligation is a wish list. This section defines what Verify owns at each layer; passing the gates in §16 means the corresponding subsections here are green.

### 18.1 Layers
| Layer | Owner | Tooling | CI gate |
|---|---|---|---|
| Unit | Forge / Vega | Vitest | PR-blocking |
| Contract (schema validation) | Verify | ajv + snapshot | PR-blocking |
| Integration | Verify + Probe | Vitest + Testcontainers (real Postgres + Supabase test instance) | PR-blocking |
| E2E | Probe | Playwright (desktop + mobile viewports) | PR-blocking on `main`; nightly on PRs |
| Load | Crash | k6 | Nightly |
| Chaos | Crash | Toxiproxy | Weekly |
| Security (SAST + dep CVE) | Pipeline | CodeQL + Dependabot + gitleaks | PR-blocking |
| Pentest (external) | Shield (engages vendor) | Manual | M3 exit gate; annual thereafter |
| Accessibility (axe-core) | Halo | axe-core via Playwright | PR-blocking on Critical+Serious |
| Accessibility (AT recordings) | Halo | NVDA + VoiceOver | Release gate for primary FAIL flow |

### 18.2 Test data
- `runner/schemas/score_engine.v1.fixtures.json` — canonical (findings → score, verdict) rows
- `runner/fixtures/synthetic-repo-fail/` — minimal repo that's guaranteed to FAIL the rubric (used in nightly first-audit-FAIL-rate calibration test)
- `runner/fixtures/synthetic-repo-pass/` — minimal repo that's guaranteed to PASS (regression guard against false-FAILs creeping in)
- `runner/fixtures/prompt-injection-corpus/` — Verify + Shield co-maintained, ≥30 patterns at M0, ≥200 at M2

### 18.3 CI gates per milestone
See §16 — each milestone exit gate is a binary CI assertion. Promotion from one milestone to the next requires all prior gates remain green.

### 18.4 Self-dogfood gate
At each milestone, the Studio Zero codebase itself is audited by the Studio Zero runner (with feature-flagged audits for unreleased features). Verdict must be PASS or PASS WITH FIXES. The runner auditing itself is the highest-leverage test we run.

### 18.5 Per-MVP-goal acceptance tests (Verify)
Each Goal in §4 maps to a binary acceptance test. Specified in `tests/acceptance/<goal-id>.test.ts`. Sample:
- Goal 1 (signup → run audit): `e2e/signup-to-first-verdict.spec.ts` — completes in <8 minutes simulated, exits with a finding count >0.
- Goal 5 (multi-tenant isolation): `integration/rls-cross-tenant.spec.ts` — Tenant A's JWT cannot SELECT Tenant B's `findings` row; expects 0 rows returned, not an error.

---

## 19. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM cost overrun in Managed tier | High | High | Per-tenant token caps; budget alerts; auto-pause at threshold |
| Audit verdict perceived as unfair / inconsistent | Medium | High | Score versioning + 30-day free re-audit; publish the rubric; cite evidence on every finding |
| Auto-PR opens a bad change against customer's repo (V1.5) | Medium | High | Mandatory Jury re-audit before PR; PR targets feature branch; never default branch; §18.M5.gate-3 negative test |
| BYOK key leak from logs or DB | Low | Critical | Encrypted at rest in Vault; never decrypted outside runner; secret-scanning on logs; Cipher's `beforeSend` PII scrub |
| Customer code retention breach (GDPR / IP) | Low | Critical | 7-day default retention; customer-controlled; cryptoshredding via Vault key delete; deleted on tenant offboard |
| CLI mode runner produces fraudulent verdict | Medium | Medium | `Private Run · Self-Audited` watermark + help-text — transparency signal, not security claim (D7) |
| EU AI Act Art. 50 missed deadline (2026-08-02) | Medium | High | Interim disclosure machinery at M0/M1 per §11.3 / §14.5 |
| Studio Zero ships a build with a bug we should have caught | High | Medium | Self-dogfood gate at every milestone (§18.4) |
| Concentration risk on Anthropic | Medium | High | Abstract the LLM provider in the runner; add a second provider in V2 |
| Pricing positioning misread (commodity vs premium) | Medium | Medium | Penny revisits after first 5 customers; D4/D5 still open |

---

## 20. Glossary

- **Studio Zero:** the 56-agent system; the engine.
- **BigBrain:** the director agent; the only agent that talks to the customer.
- **The Audit Layer:** Jury + 6 reviewers (Optic, Proof, Halo, Compass, Trace, Canon).
- **Severity rubric:** Blocker / Critical / Major / Minor / Polish.
- **BYOK:** Bring Your Own Key — customer pays Anthropic directly.
- **CLI mode:** Studio Zero runs on the customer's machine via the local CLI companion + their Claude Code installation.
- **Managed mode:** Jo runs everything; customer pays a subscription.
- **Auto-PR:** the V1.5 fix-delivery tier; build agents author fixes, audit agents re-verify, a PR is opened against the customer's repo.
- **Readiness Score:** the 0–100% deterministic score computed from audit findings.
- **Verdict:** `PASS` / `PASS WITH FIXES` / `FAIL`.
- **Private Run · Self-Audited:** the CLI-mode watermark (D7).
- **Self-dogfood gate:** Studio Zero auditing its own codebase at every milestone (§18.4).

---

*End of PRD v0.5.*
