# Studio Zero — Empty / Zero / Error State Catalog

**Phase:** 3 — Information Architecture
**Owner:** Optic (with A11y co-spec to Halo for Phase 4 build)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** Phase 3 Jury exit gate — must cover zero-data / error / payment-required / permission-denied / offline / loading (BUILD_FLOW.md Phase 3 gate)

> **Method.** Every surface that can render without data has an entry. Copy is graded against Herald's brand voice (`agents/growth/herald-brand-voice.md`) — Flesch-Kincaid grade ≤ 8 for in-app, ≤ 7 for FAIL/error states, ≤ 6 for error messages. Banned-word list (Herald §5) enforced. Each entry cites the Nielsen heuristic (H1–H10), and the WCAG SC that gates its a11y. `role="status"` is reserved for transient, polite updates; `role="alert"` is reserved for assertive interruptions (used sparingly per Halo §HC2). `<h1>` per route per SC 2.4.6.

> **Reading-key.** **H1** = Nielsen "visibility of system status"; **H5** = error prevention; **H9** = help users recognize, diagnose, recover from errors; **H10** = help & documentation; **SC** = WCAG 2.2 Success Criterion.

---

## Catalog

### ES-DASHBOARD-FIRST-RUN — First-run dashboard

- **Surface:** `/app` — first time after `/onboarding/*` completion, zero projects.
- **Trigger:** authed user, `count(projects) == 0`.
- **Visual hierarchy (fold-down):**
  1. Eyebrow chip `STEP 01 · YOU'RE IN` in `mono-meta` per tokens.
  2. `<h1>` — single line, ≤ 8 words.
  3. Body — 2 sentences, ≤ 30 words total.
  4. Primary CTA (filled pill, `--ink-0` on `--bg-0`).
  5. Secondary affordance (ghost button, low chroma).
  6. Below-the-fold: 3-card explainer of what the audit covers (defers to `/how-it-works` for the long version).
- **Copy:**
  - H1: *Run your first audit.*
  - Body: *Connect a repo or paste a URL. We'll run seven reviewer agents and hand you a graded checklist with the evidence.*
  - Primary CTA: *Start an audit →*
  - Secondary: *See what we audit*
- **A11y:** This is **not** a transient state — it is a route landing. `<h1>` carries the title; no `role="status"` needed. Primary CTA target ≥ 24×24 CSS px (SC 2.5.8); filled pill from tokens already satisfies. Focus order: H1 → body → primary CTA → secondary → explainer cards. Skip-to-content target = primary CTA.

**Why this matters (per BUILD_FLOW.md Phase 3 lesson #2):** *"First-run empty state is the highest-leverage onboarding moment. Treat it as a hero design surface."* The dashboard at zero is the activation moment; it earns the same hierarchy as the landing hero.

---

### ES-PROJECT-ZERO-AUDITS — Project with zero audits

- **Surface:** `/app/projects/[project-id]` — project created, no runs yet.
- **Trigger:** `project exists`, `count(runs) == 0`.
- **Visual hierarchy:**
  1. Project breadcrumb (so user knows where they are — H3 user control).
  2. `<h1>` — project name.
  3. Status chip: `MODE: BYOK · GITHUB CONNECTED · NEVER AUDITED` (mono-meta, UPPERCASE per tokens).
  4. Empty-state card: H2 + body + primary CTA.
- **Copy:**
  - H2: *No audits yet.*
  - Body: *Pick a depth and we'll run. Quick takes about 10 minutes. Comprehensive takes up to 45.*
  - Primary CTA: *Run a Quick audit →*
  - Secondary: *Choose a different depth*
- **A11y:** `<h2>` under route `<h1>`; sectioning element wraps the empty state with `aria-labelledby="empty-state-heading"`. No `role="status"` — this is a stable state, not a transient one.

---

### ES-AUDIT-RUNNING — Audit run in progress

- **Surface:** `/app/audits/[run-id]` while `state ∈ {dispatched, running}`.
- **Trigger:** Realtime channel reports the run is not yet finalized.
- **Visual hierarchy:**
  1. Verdict-slot reserved (skeleton or "Running…" chip) — same vertical position the verdict will occupy, so the visual hierarchy doesn't shift on finalization (H4 consistency).
  2. Per-agent timeline (HC8 `treegrid`): row per reviewer with `[chip: agent name] [phase: dispatched / running / finished / blocked] [partial-finding count]`. **This is the OPT-C3 fix made real.**
  3. Estimated time remaining (mono-data; bounded by depth's typical runtime per PRD §7.2 Step B).
  4. Cancel run button (ghost, danger-emphasis on hover) — H3 emergency exit.
- **Copy:**
  - H1: *Audit in progress.* (replaced atomically on finalization to *Audit complete · {VERDICT}* per PRD §7.2 Step D)
  - Body: *About {N} minutes left. You can leave this page — we'll email when it's done.*
  - Per-agent phase chip text (Geist Mono UPPERCASE, sentence-case after first word *no* — these are status tokens): `DISPATCHED`, `RUNNING`, `FINISHED`, `BLOCKED`.
  - Cancel button: *Cancel this run*
- **A11y:**
  - **The progress region uses `aria-live="polite"` + `role="status"`** per PRD §7.2 Step C and Halo HC2; throttled to ≤ 4 updates/sec per SC 2.2.1 (`motion.rules.live_region_throttle_per_sec=4` in tokens).
  - Respect `prefers-reduced-motion` per SC 2.3.3 — phase chip transitions reduce to ≤ 100ms (tokens already specify this).
  - The "About {N} minutes left" is an estimate, not a countdown — no live-region update per second (would overwhelm AT per SC 2.2.1).
  - **Closed-tab safety:** if the user navigates away, an in-app notification persists in `/app/notifications` and email fires on completion (OPT-M1). The "you can leave this page" copy makes this contract visible (H1).

**OPT-C3 made canonical.** The 12-minute anxiety vector identified in `prd-review-v03-optic.md` lives or dies on this empty state. Halo gets to decide the exact `aria-live` choreography in Phase 4 build.

---

### ES-AUDIT-VERDICT-ZERO-FINDINGS — Audit run with zero findings (PASS clean)

- **Surface:** `/app/audits/[run-id]` after finalization with `findings.length == 0` and `verdict == "PASS"`.
- **Trigger:** Strict elite gate produced zero findings (will be rare per PRD §15 — *"Most first audits are expected to FAIL"*).
- **Visual hierarchy:**
  1. Verdict header per PRD §7.2 Step D: aqua `#14C8CC` background, checkmark icon, `<h1 role="status">Audit complete · PASS</h1>`.
  2. Score: `100 / 100` in `serif-stat` italic per tokens (60-ish CSS px).
  3. Body — restrained pride (Herald §6 "verdict screen PASS: restrained pride, a quiet acknowledgment, not a confetti cannon").
  4. Primary CTA — **"Share this verdict →"** per PRD §7.2 Step D.
  5. Secondary: *Audit a new project*
  6. Below: per-category radar chart all-spokes-maxed + `<table>` (HC3) so a clean PASS still shows the breakdown.
- **Copy:**
  - H1 (verdict): *Audit complete · PASS*
  - Body: *No findings. The audit covered UX, accessibility, copy, brand, flow, and audience. The receipts are below.*
  - Primary CTA: *Share this verdict →*
  - Secondary: *Audit a new project*
- **A11y:** `role="status"` on the verdict `<h1>` is **already specified by PRD §7.2 Step D** (locked v0.4). Color + icon + text per SC 1.4.1 *Use of Color* — the aqua background never carries the verdict alone.

---

### ES-AUDIT-FAILED-IRRECOVERABLY — Audit failed irrecoverably

- **Surface:** `/app/audits/[run-id]` after finalization with `state == "errored"` (PRD §13.3 `kind: 'error', recoverable: false`).
- **Trigger:** Retry policy (2x, per PRD §14.2) exhausted; partial-result boundary couldn't recover.
- **Visual hierarchy:**
  1. Status chip `RUN FAILED · CODE {E-CODE}` in mono-meta (the code is for support, not for the user to decode).
  2. `<h1>` — what happened in plain words.
  3. Body — what to do next (H9 spec): *try again*, *contact support*, and *you weren't charged* — the three things a customer needs to know after a failed paid action.
  4. Two affordances of equal weight (this is one of the few screens where two peers beats one primary per Hick's, because both actions are equally rational): *Try again* and *Contact support*.
- **Copy:**
  - H1: *The audit didn't finish.*
  - Body: *Something broke on our end. Your project wasn't changed and no tokens were charged. Try again, or send the code below to support and we'll dig in.*
  - Code chip: `RUN-{run-id}` (Geist Mono, copy-on-click).
  - Affordance A: *Try the audit again*
  - Affordance B: *Contact support →*
- **A11y:**
  - `role="alert"` on the status chip — this is an assertive interruption (the user expected a verdict; they got a failure). Halo HC2 reserves `alert` for this severity.
  - Run-ID is rendered as semantic text inside a `<code>` element with a copy button labeled "Copy run ID" (SC 2.5.8 target ≥ 24×24).
  - **Plain-words first** per Herald §4 (error messages target grade 6).

---

### ES-CLI-OFFLINE — CLI paired but disconnected

- **Surface:** `/app/cli/offline` *(modal-as-route)*; also a persistent header chip per OPT-m5.
- **Trigger:** Mode=CLI, pairing exists, websocket/long-poll heartbeat lost ≥ 60s.
- **Visual hierarchy:**
  1. Header chip persistently shows `CLI · OFFLINE` in `--ink-2` on `--bg-3` per token-spec for chips. Color is not load-bearing (SC 1.4.1) — the word "OFFLINE" is the signal.
  2. If the user tries to start a run, the modal-as-route opens: H2 + body + steps + primary CTA.
- **Copy** (graded to grade 6 per Herald error-message tier):
  - Chip text: `CLI · OFFLINE`
  - H2: *The CLI isn't responding.*
  - Body: *Open a terminal and run `studio-zero login`, then try again. If you've already paired a device, the CLI may have stopped — restart it.*
  - Primary CTA: *Check pairing status*
  - Help link: *Why does this happen? →* (to `/app/help` deep link)
- **A11y:**
  - The header chip uses `aria-live="polite"` only on **state transition** (online → offline), then becomes static (SC 2.2.1: don't make AT loop on the same change).
  - The modal-as-route uses `<dialog>` semantics with `aria-labelledby` and `aria-describedby`; focus moves to the H2 on open per SC 2.4.3 *Focus Order*; ESC closes per SC 2.1.2.
  - The code voice (`studio-zero login`) is in `<code>` for semantic correctness (SC 1.3.1).

---

### ES-PAYMENT-REQUIRED — Token budget exceeded / subscription lapsed / free-tier exhausted

Three distinct sub-states because PRD §13.5 (per-tenant token budgets) + §14.7 (AUP termination) + §12 (free tier exhaustion per Decision D2) trigger **three different code paths and require three different copy choices**. H9 requires error-specificity, not generic "payment required."

#### ES-PAYMENT-MANAGED-BUDGET — Managed mode token budget exceeded

- **Surface:** `/app/billing/token-budget-exceeded` (modal-as-route).
- **Trigger:** Mode=managed, monthly token cap hit (PRD §13.5).
- **Copy:**
  - H2: *You've hit this month's audit budget.*
  - Body: *Your plan covered N audits this month. The next one is M days away, or you can upgrade now and run it today.*
  - Primary CTA: *Upgrade your plan →*
  - Secondary: *Wait until {next-cycle-date}*
- **A11y:** `<dialog>`; `role="status"` not `alert` (this is a soft block, not an error).

#### ES-PAYMENT-LAPSED — Subscription lapsed

- **Surface:** `/app/billing/plan` with banner; intake routes throw to here.
- **Trigger:** Stripe webhook reports `subscription.deleted` or `payment_failed` with grace period elapsed.
- **Copy:**
  - H2: *Your plan ended.*
  - Body: *Audits paused. Your projects and findings are kept for 30 days. Re-subscribe to pick up where you left off.*
  - Primary CTA: *Renew your plan →*
  - Secondary: *Export your data*
- **A11y:** Banner uses `role="status"` site-wide once dismissed-with-undo; respects SC 3.3.7 redundant entry — payment method already on file is offered as default.

#### ES-PAYMENT-FREE-TIER — Free tier exhausted

- **Surface:** `/app/billing/free-tier-exhausted` (modal-as-route).
- **Trigger:** Plan=free, `count(projects) >= 1` and customer tries to create a second (per PRD §12 Decision D2 — *1 project, unlimited Surface re-audits*).
- **Copy:**
  - H2: *Free tier is one project.*
  - Body: *Re-audit your current project as many times as you want. To audit a new project, upgrade to BYOK Starter — $29 a month, two audits any depth.*
  - Primary CTA: *Upgrade to BYOK Starter →*
  - Secondary: *Re-audit my current project*
- **A11y:** `<dialog>`; no `role="alert"` — this is an upsell, not an error. Specific competitor-free framing (Herald §6 in-app: -warmth, +brevity).

---

### ES-PERMISSION-DENIED — User opens admin route they don't have access to

- **Surface:** `/403`.
- **Trigger:** Authed, route requires `role=admin`, user role ≠ admin.
- **Visual hierarchy:**
  1. Eyebrow `403 · ACCESS DENIED` in mono-meta.
  2. H1 — explain, don't shame.
  3. Body — what to do.
  4. Primary CTA back to `/app`.
- **Copy:**
  - H1: *You can't open that page.*
  - Body: *This area is for Studio Zero admins. If you think this is wrong, contact your workspace owner or write to us.*
  - Primary CTA: *Back to your dashboard →*
  - Secondary: *Contact support*
- **A11y:** `<h1>` carries the page title; `role="alert"` is **not** used (the user navigated here intentionally or accidentally; nothing changed underneath them).

---

### ES-404 — Route doesn't exist

- **Surface:** `/404`.
- **Trigger:** Any unmatched route.
- **Copy:**
  - H1: *Page not found.*
  - Body: *The URL doesn't match a page on Studio Zero. Try the dashboard, or check the address.*
  - Primary CTA (state-aware): *Back to your dashboard →* (if authed) / *Back to the homepage →* (if anon).
  - Secondary: *Search*
- **A11y:** Page `<title>` carries `404`. H1 plain words.

---

### ES-410 — Project deleted by tenant

- **Surface:** `/410`.
- **Trigger:** Tenant has deleted a project that another user (same tenant, V2 multi-user) or a bookmarked URL is trying to reach.
- **Copy:**
  - H1: *This project was deleted.*
  - Body: *Someone in your workspace removed it. If you have an export, you can still open it locally.*
  - Primary CTA: *Back to projects →*
  - Secondary: *See your exports*
- **A11y:** Distinct from 404 because the resource *did* exist (H9: specificity); page `<title>` reads "Deleted — Studio Zero".

---

### ES-429 — Rate-limited

- **Surface:** `/429`.
- **Trigger:** Per-IP or per-tenant rate limit (PRD §14.3, §13.5).
- **Copy:**
  - H1: *Too many requests.*
  - Body: *You hit the rate limit. Wait {seconds} seconds and try again. If you think this is wrong, contact us.*
  - Primary CTA: *Try again*
  - Secondary: *Contact support*
- **A11y:** Honors `Retry-After` header; the countdown is **not** live-region announced (SC 2.2.1 — pause-stop-hide pattern requires control if the timer matters). Instead the countdown is rendered as static "Try again in {seconds}s" with a button that becomes active when the wait elapses (focus does *not* steal — H3 user control).

---

### ES-OFFLINE — Browser is offline

- **Surface:** `/offline` (PWA service worker fallback) or in-app banner.
- **Trigger:** `navigator.onLine === false`; service worker returns cached shell.
- **Copy:**
  - H1: *You're offline.*
  - Body: *Studio Zero needs the network to run audits. We'll reconnect automatically when your connection comes back.*
  - Primary CTA: *Try again*
- **A11y:** Live-region announce-once on transition; static thereafter. The shell still renders the user's last-viewed run (cached) so context isn't lost (H3 user control).

---

### ES-503-MAINTENANCE — Maintenance / status-page red

- **Surface:** `/503`.
- **Trigger:** Planned maintenance flag OR unplanned outage; `/status` red.
- **Copy:**
  - H1: *Studio Zero is down right now.*
  - Body: *We're working on it. See the status page for live updates. Your data is safe.*
  - Primary CTA: *Open the status page →*
  - Secondary: *Email us*
- **A11y:** Static; no live region (the page itself is the message). Honors `Retry-After` header so well-behaved clients retry without polling.

---

### ES-SETTINGS-BYOK-NOT-ENTERED — BYOK key not yet entered

- **Surface:** `/app/settings/integrations/byok`.
- **Trigger:** Mode=byok, `api_keys.length == 0`.
- **Visual hierarchy:**
  1. H1 — page title (settings panel).
  2. Status chip `NOT CONNECTED`.
  3. Empty-state card with paste input, show/hide toggle (HC5), validate button.
  4. Help-text linking to Anthropic console (H10).
- **Copy:**
  - H1: *Anthropic API key*
  - Status chip: `NOT CONNECTED`
  - Body: *Paste your Anthropic API key. We validate it once and store it encrypted. The key never leaves the vault and is never logged.*
  - Input label: *Anthropic API key*
  - Input placeholder: *sk-ant-…*
  - Primary CTA: *Validate and save*
  - Help link: *Where do I find my API key? →*
- **A11y:** SC 3.3.8 Accessible Authentication — input **must** accept paste, **must not** block password managers, show/hide toggle keyboard-operable per HC5. `aria-describedby` links the input to the security explainer paragraph per HC5/SC 1.3.5.

---

### ES-SETTINGS-GITHUB-NOT-INSTALLED — GitHub App not yet installed

- **Surface:** `/app/settings/integrations/github`.
- **Trigger:** Authed, no GitHub installation linked.
- **Visual hierarchy:**
  1. H1 + status chip `NOT INSTALLED`.
  2. Body explaining the per-repo permissions model (Decision D1) — H10 help in context.
  3. Primary CTA: install the GitHub App (redirects to GitHub).
- **Copy:**
  - H1: *GitHub*
  - Status chip: `NOT INSTALLED`
  - Body: *Install the Studio Zero GitHub App on the repos you want to audit. You pick which repos; we never see the rest. The audit runs read-only.*
  - Primary CTA: *Install the GitHub App →*
- **A11y:** External-link icon paired with `aria-label="opens GitHub in a new tab"` (SC 2.4.4 Link Purpose); CTA target ≥ 24×24.

---

### ES-FINDINGS-FILTERED-TO-ZERO — Findings list filtered to zero

- **Surface:** `/app/audits/[run-id]/findings` when filters reduce the list to empty (e.g., user selects severity=Blocker on a Pass-with-Fixes run that has none).
- **Trigger:** `findings.length > 0` (run has findings) but `filtered.length == 0`.
- **Visual hierarchy:**
  1. Filter chips remain visible at top (so the user sees *why* the list is empty — H1 visibility).
  2. Centered empty card: H2 + body + clear-filters CTA.
- **Copy:**
  - H2: *No findings match these filters.*
  - Body: *Try widening severity, reviewer, or layer. There are {N} findings in this run.*
  - Primary CTA: *Clear filters*
  - Secondary: *Reset to default view*
- **A11y:** When filters change result count, the count is announced **once** via `aria-live="polite"` on the filter-summary region (HC2 throttle applies). H7 (flexibility) made visible via H1 (the user always knows why the list is what it is).

---

### ES-MARKETING-FEATURE-PAGE-NOT-SHIPPED — Marketing page not yet built

- **Surface:** any unimplemented marketing route still linked from `/sitemap.xml` *(should not happen at M5 but specced because PRD §16 ships docs/marketing in phases)*.
- **Trigger:** Route present in nav, content not yet authored.
- **Copy:**
  - H1: *Coming soon.*
  - Body: *We're writing this one. Get on the email list and we'll send a note when it's live.*
  - Primary CTA: *Get notified →*
- **A11y:** Page `<title>` reads "Coming soon — Studio Zero"; H1 is canonical; **route returns HTTP 200** (not 404) because the URL is intentional. Honors PRD §12 SEO Crits: if the page is `noindex` until shipped, that header must be present so it doesn't pollute search results.

---

## Cross-cutting a11y constraints

- **`role="status"`** for transient, polite updates (audit running, filter-to-zero count change, CLI online-transition). Throttled ≤ 4 updates/sec per Halo HC2 / SC 2.2.1.
- **`role="alert"`** for assertive interruptions only (audit failed irrecoverably). Reserved sparingly.
- **`<h1>` per route** per SC 2.4.6; meaningful `<title>` per SC 2.4.2.
- **Skip-to-content link** on every authed shell page (`<a href="#main">Skip to content</a>`) per SC 2.4.1.
- **Focus order** moves H1 → body → primary CTA → secondary actions; modal-as-route moves focus to the H2 on open per SC 2.4.3.
- **No empty state may rely on color alone** for status (chips: `OFFLINE` / `RUNNING` / `NOT CONNECTED` are words, not just dot colors) per SC 1.4.1.
- **All CTA targets ≥ 24×24 CSS px** per SC 2.5.8; pill-radius CTAs from tokens already exceed.
- **`prefers-reduced-motion`** collapses all empty-state entrances to fade-only per SC 2.3.3 (token spec already covers this).

---

## Brand-voice compliance summary

Every H1, body line, and CTA above was checked against Herald §5 banned-word list. **Zero banned words** appear in this catalog. Grade-level checks (eyeballed for this draft; Proof runs Flesch-Kincaid in CI per Herald §4):

| State | Target grade | Draft grade (eyeballed) |
|---|---|---|
| In-app body (most entries) | 8 | 6–8 |
| FAIL-verdict body (ES-AUDIT-FAILED) | 7 | 6 |
| Error messages (ES-CLI-OFFLINE, ES-503, ES-429) | 6 | 5–6 |

Mandatory frames from Herald §5 used where applicable:
- *"We found {N} issues across {areas}. Here's every one, with the evidence."* — verdict-screen state (lives in `sitemap.md` route spec for `/app/audits/[run-id]`, not duplicated here).
- *"Re-audit free for 30 days."* — flagged for E3/E4 email empty states (defer to Herald's lifecycle file).

---

## Open questions for Halo (Phase 4 a11y review)

- AT recording obligations per HC2 — should we cover all 17 empty states in NVDA + VoiceOver release recordings, or only the FAIL-verdict primary flow per PRD §14.6 test gate? My read: PRD requires only the FAIL primary flow, but ES-AUDIT-RUNNING and ES-CLI-OFFLINE warrant inclusion because they exercise the live-region throttle.
- Modal-as-route vs true modal — Halo's call. I have all three payment-required states and CLI-offline as modal-as-route for back-button preservation (H3). Halo's pattern guidance overrides if it argues differently.

---

*End of empty-states v0.1. Optic — Audit Layer.*
