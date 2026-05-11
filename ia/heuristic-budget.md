# Studio Zero — Heuristic Budget (Hick's Law / Fitts's / Miller / Tesler)

**Phase:** 3 — Information Architecture
**Owner:** Optic (UX/UI lead)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** Phase 3 Jury exit gate — *no Hick's Law > 7 choices on any decision surface* (BUILD_FLOW.md Phase 3 gate). This file enumerates every decision surface, counts choices presented at one time, and renders a verdict.

> **Method.** For every surface I count the choices presented *to the user at one time* (Hick's: log₂(n+1) decision-time growth). The line is **> 7 choices = FAIL**, **5–7 = WARN**, **≤ 4 = PASS**. Counter-collapse risk is reviewed for FAIL cases — *too few* choices can violate H7 (flexibility for power users) or hide capability. Citations: Nielsen #1–10, Hick's Law, Fitts's Law, Miller 7±2, Jakob's Law, Tesler's Law of Conservation of Complexity, WCAG SC where a11y-load-bearing.

> **Reading-key.** Choices counted are *peer choices at one rendering*. A modal opened on top of a screen is its own surface and counted separately. A "Show more" disclosure doesn't count its hidden contents — that is the point.

---

## HB-1 — Marketing landing CTAs

- **Surface:** `/` (landing hero).
- **# of choices:** **2** (primary CTA *Run a free Surface audit →*; secondary *See how it works*).
- **Verdict:** **PASS** (≤ 4).
- **Cite:** Hick's Law; H6 (recognition over recall — *Run a free Surface audit* names the action and the cost in five words); Fitts's Law (the primary is the largest, lowest-traveled hero element per the template baseline at `project-template/studiozero/project/Studio Zero - Landing.html`).
- **Counter-collapse risk:** **Low.** A single-CTA landing is the textbook Hick's-correct choice and Herald's canonical example uses that exact CTA copy. The secondary "See how it works" carries the curiosity browser to `/how-it-works` without making them sign up; removing it would hurt the curious-but-not-ready persona (PRD §5 "Solo founder, non-technical").
- **Notes:** The header nav adds choices (logo + ≤ 5 nav items + login + signup) — those are counted in HB-9. The hero choice count is just the hero.

---

## HB-2 — Onboarding mode picker (BYOK / CLI / Managed)

- **Surface:** `/onboarding/mode`.
- **# of choices:** **3** (BYOK, CLI, Managed — PRD §7.1).
- **Verdict:** **PASS** (≤ 4).
- **Cite:** Hick's Law; H8 (minimalist); the three modes are orthogonal (different runtime + billing + privacy posture per PRD §8) so they cannot collapse further without losing the wedge.
- **Counter-collapse risk:** **Medium-high.** *Embedded* decisions inside each card are where Hick's hides. Each mode card carries: a fee chip ($-amount), a description (one sentence), a CTA. If the cards start carrying feature checklists, footnotes, or contrasting comparisons, the user is making n*3 decisions instead of 3.
  - **Recommendation (binding):** each mode card is ≤ 60 words of body, one CTA per card, one chip. Comparison table lives at `/modes` as a marketing surface; the onboarding picker is not a comparison shopper.
- **Embedded-decision check per mode (Hick's at depth):**
  - BYOK card: 1 CTA (*Continue with BYOK*). PASS.
  - CLI card: 1 CTA (*Continue with CLI*); Note: CLI ships in M3 per Decision D6 — at M2 the card surfaces with `COMING SOON` chip; not a third option, a disclosure.
  - Managed card: 1 CTA (*Continue with Managed*) → Stripe Checkout (HC6 hosted).
- **Notes:** Decision D6 (Managed before CLI) shapes this surface at M2 — only 2 of 3 cards are live then, but the **count of choices presented** is still 3 because the disabled card is still rendered (with a clear COMING SOON state per H1). At M2 you could argue this is a **2-of-3 disabled**, which Hick's treats as 2 active + 1 cognitive overhead = effectively 3.

---

## HB-3 — Intake picker (2-step picker per OPT-C1 / PRD §7.2)

This is the surface my v0.3 review flagged for Hick's failure (27 combinations). PRD v0.4 locked the 2-step collapse. The re-verification here is whether it's *actually* Hick's-correct, not just compressed.

### Step 1: "What do you have?"

- **# of choices:** **3** (Repo / Local folder / Deployed URL — PRD §7.2 Step A).
- **Verdict:** **PASS** (≤ 4).
- **Cite:** Hick's Law; H6 (the choice names the *artifact*, not the *audit product*, which is the recognition-over-recall fix from OPT-m3); Tesler's Law (complexity of audit-product derivation pushed into the app, not the user).
- **Counter-collapse risk:** **Low.** Three intake methods are orthogonal in mode + privacy (PRD §7.2 Step A table). Cannot collapse to 2.

### Step 2: "How deep?"

- **# of choices:** **2 visible peers** (Quick default + Comprehensive upgrade); **1 advanced disclosure** (Custom behind *Advanced* expander per PRD §7.2 v0.4 lock).
- **Verdict:** **PASS** (≤ 4) at the visible-peer level; **PASS** counting the disclosure (3 total).
- **Cite:** Hick's Law; H7 (flexibility — Custom available for power users without burdening novices); H8 (minimalist); progressive disclosure pattern (Nielsen, *Progressive Disclosure*).
- **Counter-collapse risk:** **Medium.** Custom-as-disclosure is correct *only if* the expander is keyboard-operable (SC 2.1.1) and the Custom path itself doesn't explode into 6-checkbox-Hick's-disaster. Audit at Phase 4 build: Custom expander = 6 reviewer checkboxes (multi-select per PRD §9.3) = a *single multi-select decision* per Hick's, not 6 independent choices. PASS by that interpretation.
- **Re-verification verdict (the question the prompt explicitly asked):** ✅ This is a real Hick's-Law fix, not just compression. The 27-combination matrix never reaches the customer's cognitive surface; the customer faces **3 + (2 visible or 3 with disclosure)** = at most 3 decisions in sequence, each clearing PASS. The matrix lives internal to the app (Tesler's Law: complexity in the app, not the user).

### Step 1 + Step 2 combined load (multi-step Hick's)

- **Total visible decisions to "Run":** 2 (one per step, both PASS).
- **Cite:** Multi-step Hick's: each step's decision time is independent because the next step's options are derived from the previous (not multiplicative). PRD v0.4 §7.2 Step B documents this lock.

---

## HB-4 — Settings IA (top-level panels)

- **Surface:** `/app/settings`.
- **# of choices:** at top level, **3 groups** (Account / Integrations / Billing & Data) per OPT-M3 and `sitemap.md` settings section.
- **Verdict:** **PASS** (≤ 4) at the group level.
- **Cite:** Miller 7±2; H6 (recognition — groups are recognizable categories, not flat lists); H4 (consistency across panels).

### Within each group

- **Account:** 5 panels (profile, notifications, consent, export, delete) — **PASS / WARN borderline** at 5; sits inside Miller 7±2 lower bound.
- **Integrations:** 3 panels (BYOK, CLI, GitHub) — **PASS**.
- **Billing & Data:** 7 panels (plan, invoices, payment method, cancel, dispute, retention, findings-export) — **WARN** (at the 7 ceiling).

- **Counter-collapse risk for Billing & Data:** **Medium.** Splitting Billing from Data would yield two 3-and-4 groups but **violates Jakob's Law** — competitors keep billing in one drawer; splitting is a learnability hit. Hold at 7, watch for drift; if an 8th panel appears (e.g., tax settings, addresses), split *then*.

### Recommendation (binding)

Lock the 3-group structure. Audit if Billing & Data grows beyond 7. Each panel surfaces its current state on the index card (e.g., *"API key: valid, last validated 3 days ago"*) per OPT-M3 H6 — that reduces the *recall* load on a customer who hasn't been in settings for weeks.

---

## HB-5 — Pricing page

- **Surface:** `/pricing`.
- **# of choices:** **5 paid tiers + 1 free + 1 add-on = 7 tiers** (PRD §12; D4 Starter pricing $19 vs $29 unresolved doesn't add a row, it changes one).
- **Verdict:** **WARN** (5–7 choices = Hick's threshold).
- **Cite:** Hick's Law; Miller 7±2; H8 (minimalist).
- **Counter-collapse risk:** **High** — the 7 tiers exist for substantive segmentation reasons (BYOK vs Managed vs CLI = 3 modes; Starter vs Pro = 2 commitment levels per mode; Free = activation; Auto-PR add-on = V1.5 upsell). Collapsing kills SKU clarity.
- **Recommendation (binding):** keep all 7 published, **but render only 3 "recommended" cards above the fold**, with "See all plans" disclosure expanding to the full 7. This is the Polish-tier recommendation from my v0.3 review (OPT-Polish#4). The 3 above-fold cards should be:
  - **BYOK Starter** ($29 — most-popular badge if Penny's data after first 5 customers supports it).
  - **Managed Pro** ($249 — the high-margin SKU, anchoring the price ceiling).
  - **Free** (always visible — activation hook per Decision D2).
- **Hook's decoy-tier analysis:** With 3 above-fold tiers (Free / $29 / $249), the $29 BYOK Starter is the obvious sweet spot — Hook's standard decoy pattern (free anchors low; $249 anchors high; $29 looks like the value choice). Penny revisits after first 5 customers per PRD §12 — track conversion to the $29 vs to $99 Managed Starter to see if the decoy is doing its job.
- **A11y / structure:** pricing table renders as semantic `<table>` with `<th scope>`; *"Most popular"* badge is text + visual per HC7; reflows at 320 CSS px without horizontal scroll per SC 1.4.10.

---

## HB-6 — Findings list (per-row affordances)

- **Surface:** `/app/audits/[run-id]/findings`.
- **# of choices per row:** **7** affordances per OPT-C4 (PRD review v0.3):
  1. Filter by reviewer (chip)
  2. Group (by file / by severity)
  3. Sort (by severity / by file)
  4. Dismiss / mark won't-fix (with undo per OPT-C5)
  5. Expand evidence
  6. Copy fix recommendation
  7. Share / dispute (proposed)
- **Verdict:** **WARN** (5–7 choices).
- **Cite:** Hick's Law; H7 (flexibility & efficiency — power users want all 7; first-time users see a wall of text); Fitts's Law (touch targets); SC 2.5.8 *Target Size (Minimum)* 24×24 CSS px.
- **Counter-collapse risk:** **Medium-high.** First-audit users (PRD §15 expected FAIL rate ≥ 70%) will face 20–60 findings on first run; they need triage tooling. Stripping affordances violates H7.
- **Recommendation (binding):**
  - **Filter / Group / Sort** become a single toolbar at the top of the list (not per-row) — 1 surface with 3 controls in a button group. That's still 3 choices on that surface (HB-6a below); the row count drops by 3.
  - **Per-row choice budget:** Expand, Copy fix, Dismiss-with-undo = **3** primary actions per row. Share/dispute moves into the per-row "more" menu (3-dot affordance) = **4 visible** with 1+ hidden behind kebab.
  - **Fitts's check:** primary actions (Expand, Dismiss) are the largest hit areas; Copy and more-menu are smaller but still ≥ 24×24 (SC 2.5.8).
- **HB-6a — Findings toolbar:** Filter + Group + Sort = **3 choices**. **PASS** at the toolbar; **PASS** when the row is reduced to 3 + kebab. The wall-of-text risk is mitigated by *grouping by severity default* (Blocker → Polish) which collapses 60 findings into 5 visible severity buckets at first paint per OPT-C4.

---

## HB-7 — Verdict screen CTAs

- **Surface:** `/app/audits/[run-id]` after finalization (PRD §7.2 Step D).
- **# of choices above the fold:** **1 primary CTA** (per PRD §7.2 Step D lock) + **0 visible secondaries above the fold** (findings list and category breakdown live below the fold but are not "choices" — they are content).
- **Verdict:** **PASS** (≤ 4) — and the absolute Hick's-correct answer for a high-stakes outcome screen.
- **Cite:** Hick's Law; H1 (visibility of system status — the verdict + score is the content, the CTA is the next step); H8 (minimalist); Doherty Threshold (engagement-preserving response time).
- **Counter-collapse risk:** **Low.** A single primary CTA on the verdict screen is the brand-locked PRD §7.2 Step D answer. *Secondaries* exist (re-audit, share, settings, dispute) but they live in the row toolbar or the findings list, not above the fold. The verdict screen is designed to make the next action obvious — for FAIL/PASS-WITH-FIXES in Surface SKU it's *Run the Code audit →* (Herald canonical); for PASS it's *Share this verdict →* per `empty-states.md` ES-AUDIT-VERDICT-ZERO-FINDINGS.
- **Above-fold structure (per PRD §7.2 Step D):**
  1. Verdict header (color + icon + text — SC 1.4.1).
  2. Score (numeric + radar with `<table>` fallback — HC3).
  3. One primary CTA.
  4. (below fold) Findings checklist with the HB-6/6a affordances.

---

## HB-8 — Cookie consent banner

- **Surface:** non-modal landmark at bottom of `<body>` (per `sitemap.md` cookie/consent gating).
- **# of choices:** **3** (Accept all / Reject all / Customize).
- **Verdict:** **PASS** (≤ 4).
- **Cite:** Hick's Law; H4 (consistency — these are the three peer-weighted choices required by GDPR + UK PECR per PRD §6.1); H5 (error prevention — *Reject all* is **peer-weighted**, not buried below *Accept all*, which is a GDPR consent-validity requirement per CNIL / ICO guidance); SC 2.1.2 *No Keyboard Trap*; SC 2.4.11 *Focus Not Obscured*.
- **Counter-collapse risk:** **Low.** Three GDPR-mandatory peer choices; cannot collapse further. **Dark-pattern risk** if *Accept all* is visually privileged over *Reject all* — Halo enforces equal-weight rendering at Phase 4.

---

## HB-9 — Dashboard primary nav (sidebar)

- **Surface:** `/app/*` sidebar.
- **# of choices:** **6** primary nav items (proposed): *Dashboard*, *Projects*, *New audit*, *Notifications*, *Settings*, *Help* — plus the workspace switcher / user menu in the top corner (not counted as a peer; it's an account widget).
- **Verdict:** **WARN** (5–7).
- **Cite:** Miller 7±2; H4 (consistency); H6 (recognition over recall — named labels not iconography-only); Jakob's Law (most B2B SaaS uses 4–7 primary nav items).
- **Counter-collapse risk:** **Medium.** *Notifications* could be a header bell instead of a sidebar item — collapses to 5. *Help* could be a footer link — collapses to 4. Trade-off: bell-only notifications work but bury the persistent notification drawer (OPT-M1 calls for persistence so closed-tab users get back to their run).
- **Recommendation (binding):**
  - Sidebar: **Dashboard, Projects, New audit, Settings** = 4 items. **PASS** (≤ 4).
  - Header bell: Notifications.
  - Footer link: Help.
  - Result: 4 sidebar + 1 header + 1 footer = each surface is at PASS independently.

---

## HB-10 — Marketing site top nav

- **Surface:** `/` (and all marketing routes).
- **# of choices:** **6** likely: *Audit*, *Build*, *Modes*, *Pricing*, *Blog*, *Sign in / Sign up* (login+signup count as 1 peer choice; the actual menu has 2 buttons).
- **Verdict:** **PASS** (5 nav links + 1 auth pair = 6 peers; just under Miller 7±2 upper bound and at the WARN threshold for Hick's).
- **Cite:** Hick's Law; Jakob's Law (top-nav 5–7 is the B2B SaaS norm); Fitts's (primary auth CTA is rightmost/largest per Western F-pattern).
- **Counter-collapse risk:** **Low.** Drop one and you lose the discoverability of either Build (V2 demand-gate signups) or Modes (the wedge — Decision D6 reorder means CLI needs visibility). Hold at 5 + auth.

---

## HB-11 — CLI command surface

- **Surface:** `studio-zero <cmd>` (PRD §6.4).
- **# of commands at M5:** **5** likely: *login*, *logout*, *audit*, *status*, *update*.
- **Verdict:** **PASS** (≤ 7; CLI users have higher Hick's tolerance per H7 flexibility).
- **Cite:** Hick's Law; H7 (flexibility & efficiency — CLI is the power-user surface, Tesler's Law allows pushing complexity to the user here because the user opted in); Jakob's Law (CLI users expect `noun verb` or `verb noun` parity with git/gh/stripe).
- **Counter-collapse risk:** **Low-medium.** CLI is *small* per the prompt; budget room remains. Reserve growth headroom for *projects list*, *findings get <id>*, *run <project>* as future commands without breaching budget.
- **Naming convention:** verb-first (`login`, `audit`, `status`) matches gh/stripe; H4 consistency.

---

## HB-12 — Onboarding multi-step (signup → mode → repo)

- **Surface:** `/signup` → `/auth/verify-email` → `/onboarding/mode` → mode-specific → first audit.
- **# of choices per step:** signup form ≤ 3 inputs (email + password + OAuth alternatives); verify-email = 1 action; mode picker = 3 (HB-2); BYOK = 1 input (key); intake = 2 (HB-3).
- **Verdict per step:** PASS / PASS / PASS / PASS / PASS.
- **Progress visibility:** **MUST** ship a progress indicator across the 3 onboarding steps (OPT-Polish#1 from v0.3 review).
- **Cite:** SC 3.3.7 *Redundant Entry* (email entered at signup auto-fills downstream forms per HC5); H1 (visibility of system status); H4 (consistency); SC 3.3.8 *Accessible Authentication* (API key paste in BYOK step).
- **Counter-collapse risk:** None — multi-step keeps each surface at PASS via decomposition (Tesler's Law: split complexity across screens, not within a screen).

---

## Scoreboard (canonical)

| ID | Surface | Choices | Verdict | Recommendation |
|---|---|---:|---|---|
| HB-1 | Marketing landing CTAs | 2 | **PASS** | Hold; locked to Herald's canonical example. |
| HB-2 | Onboarding mode picker (BYOK/CLI/Managed) | 3 | **PASS** | Hold. Constrain each card to 1 CTA + 1 chip + ≤ 60-word body. |
| HB-3 Step 1 | Intake "What do you have?" | 3 | **PASS** | Hold; OPT-C1 fix verified as Hick's-correct, not just compression. |
| HB-3 Step 2 | Intake "How deep?" | 2 visible + 1 disclosure | **PASS** | Hold; Custom remains progressive-disclosure. |
| HB-4 | Settings top-level groups | 3 | **PASS** | Hold. |
| HB-4a | Settings — Account group | 5 | **PASS (border)** | Watch — split if a 6th panel arrives. |
| HB-4b | Settings — Integrations | 3 | **PASS** | Hold. |
| HB-4c | Settings — Billing & Data | 7 | **WARN** | Watch — split Billing / Data into 2 sub-groups if an 8th panel arrives. |
| HB-5 | Pricing page (all tiers) | 7 | **WARN** | Render 3 "recommended" cards above fold; *See all plans* disclosure to full 7. |
| HB-6 | Findings list — per row (original spec) | 7 | **WARN** | Move filter/group/sort to toolbar (HB-6a). Per-row drops to 3 visible + kebab. |
| HB-6a | Findings list — toolbar | 3 | **PASS** | Hold (after collapse). |
| HB-7 | Verdict screen above-fold | 1 primary CTA | **PASS** | Hold; PRD §7.2 Step D locked. |
| HB-8 | Cookie consent banner | 3 | **PASS** | Hold; peer-weight *Accept all* and *Reject all* — no dark patterns. |
| HB-9 | Dashboard sidebar (original) | 6 | **WARN** | Collapse to 4: Dashboard / Projects / New audit / Settings. Move Notifications to header bell, Help to footer. |
| HB-9a | Dashboard sidebar (recommended) | 4 | **PASS** | Hold after collapse. |
| HB-10 | Marketing site top nav | 5 + auth | **PASS** | Hold. |
| HB-11 | CLI commands | 5 | **PASS** | Hold; reserve growth headroom under 7. |
| HB-12 | Onboarding multi-step | ≤ 3 per step | **PASS** | Hold; ship progress indicator (OPT-Polish#1). |

### Summary counts

- **PASS:** 14 surfaces (HB-1, HB-2, HB-3 Step 1, HB-3 Step 2, HB-4, HB-4a, HB-4b, HB-6a, HB-7, HB-8, HB-9a, HB-10, HB-11, HB-12)
- **WARN:** 4 surfaces (HB-4c Billing & Data, HB-5 pricing, HB-6 findings-as-originally-spec'd, HB-9 sidebar-as-originally-spec'd) — **all with binding recommendations to collapse to PASS**
- **FAIL:** **0 surfaces** ← Phase 3 exit gate (BUILD_FLOW.md *"no Hick's Law > 7 choices on any decision surface"*) ✅ **clears**.

---

## Heuristic citation legend

All citations used in this file:

- **Hick's Law** — *T = b · log₂(n+1)* — decision time grows with number of options.
- **Fitts's Law** — *MT = a + b · log₂(D/W + 1)* — target acquisition time grows with distance, shrinks with size; SC 2.5.8 24×24 CSS px floor.
- **Miller 7±2** — short-term memory holds 5–9 chunks; flat menus past 7 lose discoverability.
- **Jakob's Law** — users expect this site to work like other sites they know.
- **Tesler's Law of Conservation of Complexity** — complexity is conserved; push it into the app, not the user.
- **Doherty Threshold** — < 400ms response preserves engagement.
- **H1 Visibility of system status** — Nielsen #1.
- **H3 User control & freedom** — Nielsen #3.
- **H4 Consistency & standards** — Nielsen #4.
- **H5 Error prevention** — Nielsen #5.
- **H6 Recognition over recall** — Nielsen #6.
- **H7 Flexibility & efficiency of use** — Nielsen #7.
- **H8 Aesthetic & minimalist design** — Nielsen #8.
- **H9 Help users recognize, diagnose, recover from errors** — Nielsen #9.
- **H10 Help & documentation** — Nielsen #10.
- **WCAG 2.2 SCs cited** — 1.1.1, 1.3.1, 1.4.1, 1.4.10, 2.1.1, 2.1.2, 2.4.1–2.4.6, 2.4.11, 2.4.13, 2.5.7, 2.5.8, 3.3.7, 3.3.8, 4.1.2.

---

## Open questions for Trace (user-flows)

- HB-12 progress indicator — Trace's flow file should canonical-name the 3 onboarding steps. My placeholder: *Sign up · Choose mode · First audit*. Trace's wording wins if it differs from this.
- HB-7 verdict screen primary CTA — already PRD-locked per §7.2 Step D; this file just enforces the count. If Trace's flow surfaces a contradictory secondary, escalate.

---

*End of heuristic-budget v0.1. Optic — Audit Layer.*
