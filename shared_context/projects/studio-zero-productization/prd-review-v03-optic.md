# PRD v0.3 — Optic (UX/UI Heuristics) Review

**Reviewer:** Optic — Audit Layer (independent)
**Document:** `PRD.md` v0.3 (2026-05-10)
**Lens:** Nielsen's 10 heuristics, Hick's Law, Fitts's Law, Tesler's Law of Conservation of Complexity, Miller 7±2, Jakob's Law
**Posture:** Flag, don't fix. Cite a heuristic per finding. Recommend a direction; do not redesign.
**Date:** 2026-05-10

---

## Verdict: **PASS WITH FIXES**

## Top-line summary (3 sentences)

The PRD specifies the engine well but underspecifies the customer-facing surfaces where the engine's value lands — Hick's Law is violated at intake (3 × 3 × 3 = 27 reasoning combinations before "Run"), Heuristic 1 (visibility of system status) is left to engineering imagination at the longest-running moment of the product, and the entire surface area of empty-, error-, loading-, and dispute-states is missing despite Heuristic 5 (error prevention) requiring them. Tesler's Law is being applied in reverse: complexity that should live in the app (smart defaults, progressive disclosure, IA for settings, dual-channel notifications) has been pushed onto the customer's mental model. None of this blocks M0 spike, but every one of these gaps will show up as a Major or Critical at first heuristic walkthrough of the live product, and several (verdict-screen hierarchy, per-agent progress, findings-table affordances) deserve to be specced now rather than discovered in M5 dogfooding.

---

## Blockers

**None for an engine PRD.** A web product PRD that ships to a UI team without specifying empty states, progress display, and verdict-screen hierarchy would be a Blocker, but §6 explicitly defers UI specification to the existing built interface. The findings below are scoped to what the PRD must specify so the interface team can implement consistently.

---

## Criticals

### OPT-C1. Hick's Law violation: 27-combination intake (H8 Aesthetic & minimalist design; Hick's Law)
**Sections:** §7.2 Step A + Step B, §9.1
Three intake methods × three audit products × three audit depths = **27 reasoning paths** the customer must traverse before clicking "Run." Hick's Law: decision time grows logarithmically with the number of choices, and the choices here are not orthogonal — intake method constrains product (URL → Surface only; local folder → CLI-mode only), and product constrains depth (Surface caps at Quick/Custom). The spec already encodes the constraints but presents them as three parallel pickers.
**Direction (do not implement):** collapse to a **two-step picker with smart defaults**:
1. "What do you have?" → URL / Repo / Local folder. This single answer determines the eligible product (Surface/Code/Full) and the eligible depths.
2. "How deep?" → default to Quick (Comprehensive available as "show advanced" disclosure).
"Custom" depth becomes a power-user expander, not a peer of Quick/Comprehensive. Audit *product* (Surface/Code/Full) becomes a derived label shown on the run summary, not a primary picker — the customer already revealed it implicitly by choosing what they have.
**Heuristic citation:** Hick's Law + H8 (minimalist) + H6 (recognition over recall — don't make them recall the product-vs-depth taxonomy).

### OPT-C2. Verdict-screen visual hierarchy is unspecified (H1 Visibility of system status)
**Section:** §7.2 Step D
PASS / PASS WITH FIXES / FAIL is three states but their emotional valence differs by orders of magnitude. PASS WITH FIXES (the 70–94 band) is where most customers will land — it is also the most ambiguous middle. The PRD says "Verdict + Score + Checklist" but does not specify:
- Where the score lives at the fold (loud, quiet, hero-sized?).
- The CTA hierarchy on PASS WITH FIXES (is "Buy fix delivery" the primary action, or "View findings"?).
- The color/iconography rule (per the user's brand memory: aqua + gold only — no red/green, so FAIL cannot lean on red and PASS cannot lean on green).
- The defensibility moment: the PRD's whole posture is "FAIL means something" — the verdict screen has to look like a delivered service, not an error page.
**Direction:** spec a wireframe-level hierarchy in §7.2 Step D: score is the hero element; verdict is the badge; category breakdown is the secondary band; CTA depends on verdict (FAIL → "View findings + buy fix delivery"; PASS WITH FIXES → split between "Review fixes" and "Dispute / Re-audit"; PASS → "Export + share").
**Heuristic citation:** H1 (status) + H4 (consistency across the three verdicts) + H8 (don't bury the punchline).

### OPT-C3. Per-agent progress display is unspecified — anxiety risk at 12-min mark (H1 Visibility of system status)
**Section:** §7.2 Step C
"Live progress streamed to dashboard" is the whole spec. Worst-case the customer sees `jury_orchestrator running… 12:43` with no per-reviewer breakdown. At the price points in §12 ($79–$249/mo), 12 minutes of "still working" with no decomposition is a churn vector. H1 is explicit: "always keep users informed about what is going on, through appropriate feedback within reasonable time."
**Direction:** spec the dashboard's run view as a **per-agent timeline** with three pieces of state per row: `[agent name] [phase: dispatched / running / finished / blocked] [partial-finding count so far]`. Reuse the per-run timeline already promised in §13.6 — it is currently described as a *post-hoc* artifact; promote it to a **live artifact** during the run. Stream partial findings as they land (the audit JSON is already a stream per §13.3) so the customer sees "Halo found 3 issues so far" rather than a spinner.
**Heuristic citation:** H1 (visibility) + Doherty Threshold (perceived progress preserves engagement past the 400ms threshold).

### OPT-C4. Findings checklist has no affordances — wall-of-text risk (H7 Flexibility & efficiency)
**Section:** §10, §9.3 (output contract)
Every finding carries 5 fields (severity, layer, evidence, recommendation, estimated_effort). At an expected first-audit FAIL rate ≥70% (§15), a typical first audit will return 20–60 findings. Without **filter / group / sort / search / dismiss** affordances this is a wall of text — exactly the H7 problem (accelerators for experts, defaults for novices). The PRD does not specify any of these affordances or which fields are filterable.
**Direction:** spec the findings table contract:
- Default view: grouped by severity, sorted Blocker → Polish.
- Filters: severity (multi), reviewer (multi), layer, estimated effort, status (open/dismissed/won't-fix).
- Sort: severity, reviewer, effort, recency.
- Per-row actions: expand evidence, mark won't-fix, dispute (carries to §17 D-M4 "Dispute Finding"), copy recommendation as Markdown.
- A `status` field needs to be added to the §9.3 output contract or layered on top via a per-tenant findings-state table.
**Heuristic citation:** H7 (flexibility/efficiency) + H6 (recognition — grouping is recognition; alphabetical lists are recall).

### OPT-C5. "Mark as won't-fix" without undo (H3 User control & freedom)
**Sections:** §10, missing entirely from PRD
Implicit in OPT-C4: customers will dismiss findings. H3 requires "emergency exit" / undo for any user action with consequence. The PRD currently has no dismiss/undo spec at all.
**Direction:** every state change on a finding (dismiss, won't-fix, dispute) must be reversible from the same surface for at least 30 days. Status field tracks the actor and timestamp so re-audits can show "you previously dismissed this — it's back."
**Heuristic citation:** H3 (user control & freedom).

### OPT-C6. Empty states are entirely unspecified (H5 Error prevention; H10 Help & documentation)
**Sections:** missing — affects §6.1, §7, §10
H5 starts with the empty state. The PRD never describes what the customer sees when:
- They land in the dashboard with **zero audits** run yet (first-run state — most important moment in the product).
- A run returns **zero findings** (edge case but it will happen — what does PASS look like at 100/100?).
- No projects connected yet.
- No payment method on file when they try to run.
- CLI is paired but offline.
**Direction:** add a §7.x "Empty & Edge States" subsection enumerating each surface and its empty copy + primary CTA. The first-run dashboard's empty state is the highest-leverage onboarding moment in the product — it deserves PRD-level intent.
**Heuristic citation:** H5 (error prevention) + H10 (help).

---

## Majors

### OPT-M1. Auto-PR notification surface is inconsistent (H4 Consistency & standards; H1 Visibility)
**Section:** §11.2
When a PR opens, where is the customer? The PRD doesn't say. Job-complete arguably uses Supabase Realtime to push to the dashboard (§17 D10). Auto-PR completes minutes-to-hours later — same surface, or email-only? H4 requires the same notification surface for similar events.
**Direction:** spec dual-channel notifications (in-app toast + email) for three milestone events: audit-complete, fix-delivery-complete, re-audit-complete. In-app notifications persist in a notification drawer so a customer who closed the tab still has the link when they return. Email subject line carries verdict so it's scannable in the inbox.
**Heuristic citation:** H4 (consistency) + H1 (visibility).

### OPT-M2. Build dashboard vs Audit dashboard — same UI or two mental models? (Jakob's Law; H4 Consistency)
**Sections:** §7.2 Step C vs §7.3 step 4
Both V1 audit and V2 build promise a "live dashboard." Jakob's Law: customers expect this site to work like other sites — and they expect *the same site* to work like itself. The PRD does not say whether one dashboard component renders both (run-of-agents view, with phase ribbon switching by mode) or two distinct dashboards exist.
**Direction:** lock now (or by V2 spec) that there is **one dashboard component** that takes a `run_kind: "audit" | "build"` and renders the same per-agent timeline, score panel, and findings table. Build mode swaps "findings" for "deliverables" but the IA stays put. Tesler's Law: this is complexity that has to live somewhere — push it into the runtime contract (the run object), not into the customer's mental model of "which screen am I on now."
**Heuristic citation:** Jakob's Law + H4 (consistency).

### OPT-M3. Settings IA is undefined for 6+ panels (H6 Recognition over recall; Miller 7±2)
**Section:** §6.1
Settings enumerated: API key entry, CLI pairing, GitHub OAuth, GitLab OAuth (post-launch), billing, retention overrides. Plus implicit: notification preferences, team members (V2), tenant profile, danger zone (delete workspace). That is 7–10 panels — at the upper bound of Miller 7±2 for a flat menu.
**Direction:** spec the Settings IA as three groups: **Account** (profile, notifications, danger zone), **Integrations** (BYOK key, CLI devices, GitHub, GitLab), **Billing & Data** (plan, invoices, retention, audit-log download). Each panel surfaces its current state (e.g., "API key: valid, last validated 3 days ago") so the customer doesn't have to recall what they did months ago (H6).
**Heuristic citation:** H6 (recognition) + H4 (consistency) + Miller 7±2.

### OPT-M4. Long-run latency strategy unspecified (H1 Visibility of system status; Doherty Threshold)
**Section:** §14.1
TTFB <500ms and score page <2s are page-load metrics. They do not address the dashboard during a 10–45 minute audit. Polling vs websocket vs Supabase Realtime makes the difference between "feels alive" and "feels stuck." §17 D10 locks Supabase Realtime — confirm it covers this case and document the fallback if the websocket drops (polling at 5–10s with a visible "reconnecting" indicator, not a silent gap).
**Direction:** §14.1 should add: "Live run updates: Supabase Realtime channel per run; fallback to long-poll at 10s if the websocket drops; visible 'reconnecting' state if both fail (H1)."
**Heuristic citation:** H1 (visibility) + Doherty Threshold.

### OPT-M5. Verdict + retention + dispute = a three-actor undo story (H3 User control)
**Sections:** §11.2 + §14.4 + (Decisions log M4 "Dispute Finding")
The customer might dispute a finding after the code retention window has expired (default 7 days). If the original evidence (file snippet) was cryptoshredded per §13.4, the dispute reviewer can't re-examine. H3 says give users control, but the architecture currently silently prevents the action.
**Direction:** spec that **findings** (with their evidence already extracted at run-time, not the full source) are exempt from cryptoshredding — they are explicitly retained as customer-owned artifacts (§14.4). The dispute flow operates on the retained finding+evidence object, not the original codebase. Surface this in the dispute UI: "Disputes are reviewed against the evidence captured at run time, not your current codebase."
**Heuristic citation:** H3 (control) + H1 (transparency about what's being reviewed).

---

## Minors

### OPT-m1. Six category scores: bars vs radar (H6 Recognition over recall)
**Section:** §10 score breakdown
Six categories (UX, Accessibility, Copy, Brand, Flow, Audience) is exactly the count where a radar chart starts to read better than parallel bars — and exactly the count where a radar chart starts to mislead by exaggerating polygon area. Recommend **horizontal stacked bars sorted descending by score**, one bar per category, with the category-weakest pulled to the top so the customer's eye lands on the weakest category first (this is what they need to act on).
**Heuristic:** H6 + Gestalt (proximity & similarity).

### OPT-m2. Timeline accessibility (defer detail to Halo, flag now)
**Section:** §13.6
Per-run timelines are notoriously inaccessible — they default to horizontal-axis SVG with no keyboard tab order and no screen-reader semantics. Flag for Halo at spec time, not at audit time. PRD should add: "The run timeline is delivered as both a visual component and a screen-reader-accessible ordered list of `(agent, phase, start, end, finding_count)` tuples (Halo to spec)."
**Heuristic:** H10 (help) + WCAG 2.1.1 keyboard.

### OPT-m3. "Audit depth" copy still risks recall confusion (H6 Recognition over recall)
**Sections:** §7.2 Step B, §9.3 (which is duplicated — there are two §9.3 headers in the PRD)
The v0.3 rename Quick/Custom/Comprehensive is correct, but "Custom" is a recall term — the customer must remember what's customizable. Consider rewriting the picker label as the question itself: "Pick which reviewers run." That makes the choice recognizable rather than recallable.
**Heuristic:** H6 (recognition).

Note: §9.3 appears **twice** in the PRD — once as "Audit depths → reviewer mapping" and once as "Output contract." Pure editorial slip, but it's an H4 (consistency) violation of the document itself.

### OPT-m4. The "Run" button is the only verb (H6 Recognition; Fitts's Law)
**Section:** §7.2 Step C
The PRD never names the primary CTA. "Run" is fine but it is a non-specific verb. Recommend "Start audit" (or "Start [Surface|Code|Full] audit" derived from intake). Fitts's Law also implies this is the largest, lowest-traveled target on the intake screen — call that out so the UI team doesn't bury it in the top-right.
**Heuristic:** H6 + Fitts's Law.

### OPT-m5. CLI-paired state is invisible (H1 Visibility of system status)
**Section:** §6.3
"Web app verifies the CLI is online before unlocking workflows." Good. But what does the web app *show* when the CLI goes offline mid-run? PRD should require a persistent header indicator (CLI: connected / reconnecting / offline) so the customer always knows.
**Heuristic:** H1.

### OPT-m6. Score-engine version is in the data contract but not in the UI (H10 Help)
**Section:** §10
"Customers see their current and prior verdicts with the version that produced them." Good intent. Spec needs to say *where* — small tooltip on the score badge: "Scored on `score_engine v1`. [Compare versions]". H10 wants help findable where the question arises.
**Heuristic:** H10.

---

## Polish

- **§7.1 onboarding:** spec a progress indicator across the 3 onboarding steps (sign up → mode → optional repo). Multi-step forms without progress = lost users (H1).
- **§17 D7 CLI tamper banner:** if the "Self-Audited / Unverified" watermark approach wins, spec the banner copy + position now. Banners that say "Unverified" without explanation are scarier than helpful. Recommend: "Run completed on your CLI. Verdict not certified by Studio Zero. [What does this mean?]" (H10).
- **§13.4 retention slider:** if customers can set retention 0–30 days, expose the trade-off inline: "0 days: maximum privacy, no dispute resolution possible after the run completes." H5 (error prevention) — make the consequence visible before the action.
- **§12 plan comparison:** seven tiers is at the Miller ceiling. The pricing page IA should default to three "recommended" cards with the others behind a "Show all plans" disclosure.

---

## Add proposals

### A1. §7.2bis "Empty & Edge States" subsection (mandatory)
Enumerate empty/error/edge surfaces with copy intent + primary CTA. Minimum coverage: first-run dashboard, zero-findings result, payment-required, CLI offline, run failed (per §14.2 retry policy), run aborted, dispute pending, dispute resolved.

### A2. §7.2 Step C+ "Per-Agent Live Progress Spec"
Define the dashboard run view as a live per-agent timeline (see OPT-C3). Spec: list view with row-per-agent, phase chip, partial-finding count, elapsed time. Streamed via Supabase Realtime (§17 D10).

### A3. §7.2 Step D+ "Verdict Screen Hierarchy Spec"
Score is hero, verdict is badge, category breakdown is secondary band, CTA varies by verdict (see OPT-C2). Color rule: aqua = pass-band, gold = action/CTA, neutral grays for FAIL — no red/green per brand memory.

### A4. §10+ "Findings UI Affordances"
Filter/group/sort/search/dismiss/dispute as table-level affordances. Add `status` to the §9.3 output contract or to a sidecar table. See OPT-C4.

### A5. §6.1+ "Settings IA"
Three-group structure: Account / Integrations / Billing & Data. Spec the current-state surface on each panel (Heuristic 6). See OPT-M3.

### A6. §11.2+ "Notification Surfaces"
In-app drawer + email + (future) webhook. Same surface for audit-complete, fix-delivery-complete, re-audit-complete. See OPT-M1.

### A7. §13.6+ "Live timeline is also a customer-facing artifact"
Promote the per-run timeline from observability artifact to product feature. Spec accessibility requirement (OPT-m2).

### A8. §14.1+ "Long-Run Latency Strategy"
Realtime channel + long-poll fallback + visible reconnecting state. See OPT-M4.

---

## Remove proposals (collapse combinatorial complexity)

### R1. Collapse intake × product × depth into 2 questions + smart defaults
The customer never types "I want a Code audit at Custom depth via local-folder intake." They have something, they want it reviewed, they have a sense of how thorough. The product picker (Surface/Code/Full) is derivable from intake; the depth default is Quick with Comprehensive available on demand. See OPT-C1.

### R2. Demote "Custom" depth from peer to power-user expander
The Quick / Comprehensive axis is the actual decision. "Custom" is configuration, not a peer choice. Place it behind "Advanced" disclosure on the depth picker so first-time users see two clean choices, not three.

### R3. Remove "audit product" from primary copy after intake
Once intake is selected, the product label (Surface/Code/Full) is determined. Show it as a derived summary on the run-confirmation card, not as a separate picker the customer has to actively choose.

### R4. Drop the second §9.3 header
Editorial — there are two §9.3 sections (depths-to-reviewer mapping; output contract). One should be §9.3 and the other §9.4.

---

## Decision votes (D1–D9)

Voting only on items with UX implications; abstaining where the call is purely security/security-theater or pricing without a UX angle.

| # | Decision | Optic vote | UX reasoning |
|---|---|---|---|
| D1 | GitHub App vs OAuth | **Abstain** — outside Optic's lane (security). |
| **D2** | Free tier: 1 audit per signup vs unlimited re-audits per project | **Unlimited re-audits per project (Penny's recommendation)** | UX-critical. H1 (visibility of progress) and the whole *audit → fix → re-audit → pass* product loop require the customer to feel a PASS during the free tier. A single audit that lands on FAIL with no path back to PASS is a Critical activation-loop failure (Penny C6 in synthesis). The brand posture *needs* customers to feel the iteration loop work. |
| D3 | Auto-PR scope (MVP / V1.5 / Minor-Polish only) | **Defer to V1.5** | UX reasoning: opening a real PR against a customer's repo is a high-trust action. Doing it in M4 with under-baked guardrails risks one bad PR poisoning the brand for the first 25 paying customers. Specs-only for MVP is the more honest H5 (error prevention) posture. |
| D4 | BYOK Starter $29 vs $19 | **Abstain** — pricing. |
| D5 | Auto-PR flat vs tiered | **Tiered S/M/L** | UX angle: a single $49 flat price masks the effort signal. Tiered pricing communicates "we know how big this fix is" — that's an H1 visibility-of-system-status moment at the purchase point. |
| **D7** | CLI tamper messaging — "trust signal" vs watermark "Self-Audited / Unverified" | **Watermark + plain-language explainer** | Strong UX position. "Verdict signed with binary hash" reads like security theater to non-technical users and like a lie to technical ones (Shield M11). A "Self-Audited / Unverified" watermark, paired with H10 help copy explaining what it means, is honest. Banner copy must avoid alarm-language; recommend: "This audit ran on your machine. The verdict is yours to use; it isn't certified by Studio Zero." |
| D6 | Milestone reorder | **Abstain** — sequencing. |
| D8 | Sandboxing strategy | **Abstain** — security. |
| D9 | SSRF / prompt-injection / redaction / ingestion limits | **Abstain** — security. |

---

## Closing

The PRD is a strong engine spec. The customer-facing surface where the engine's value materializes — intake friction, verdict hierarchy, progress visibility, findings affordances, empty states, and the dispute/undo loop — is where the heuristic gaps live. None of it requires re-architecture. All of it should be specified before the UI team builds against v0.3, so that v0.4 carries an "Interface Behavior" section the design team can hand to engineering with the same rigor as §13.

— *Optic*
