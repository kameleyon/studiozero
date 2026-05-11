# Flow: Fix Delivery PR (V1.5 — DEFERRED FROM MVP)

> **STATUS: V1.5. PRD Decision D3 (locked v0.4) defers Auto-PR fix delivery from MVP to V1.5. This file specs the flow for V1.5 build readiness so engineering can build against a stable contract. MVP ships specs-only per PRD §11.1; this flow does NOT render in MVP UI. Mark any prototype clearly: feature-flag `autopr.enabled = false` at MVP.**

**Owner:** Trace
**Personas affected:** §5 Solo founder technical, Engineering lead at small startup. Indie agencies will adopt if priced per-fix.
**Mode applicability:** BYOK + Managed only. CLI mode is excluded (the runner that generates fixes runs server-side on Jo's infra; CLI's whole point is "code never leaves your machine," which is incompatible with server-side fix generation). CLI customers see a clear message at V1b: "Auto-PR runs on Jo's infra. CLI mode keeps your code on your machine — these are mutually exclusive. Switch modes to enable Auto-PR."
**Acceptance test:** `tests/acceptance/e2e/auto-pr-happy.spec.ts` + `tests/acceptance/e2e/auto-pr-reaudit-fail-no-open.spec.ts` (the PRD §16 V1.5 gate test: C6 Auto-PR negative-case → PR not opened) + `tests/acceptance/integration/default-branch-push-blocked.spec.ts` (PRD §16 V1.5 gate C8).
**PRD references:** §11.2 V1.5 Auto-PR + hard rules, §14.5 EU AI Act Art. 50 disclosure, §16 V1.5 milestone exit gates, §17 D3 (deferral), §19 Risks (Auto-PR opens bad change).

---

## State diagram (ASCII)

```
                  ┌───────────────────────┐
                  │ P0  Verdict screen    │  V1.5 path: Code/Full SKU + FAIL or PWF
                  │ "Ship the fixes — $49 │
                  │ →" CTA from V1b       │
                  └───────────┬───────────┘
                              │ click
                              ▼
                  ┌───────────────────────┐
                  │ P1  Fix-bundle picker │  "Which findings? All (default) or pick."
                  │ shows per-finding     │  ICE-style tiered S/M/L if D5 locked
                  │ effort + price        │
                  └───────────┬───────────┘
                              │ "Buy & start →"
                              ▼
                  ┌───────────────────────┐
                  │ P2  Stripe checkout   │  one-time charge OR allowance debit
                  │ regional D20 checks   │
                  └───────────┬───────────┘
                              │ webhook: paid
                              ▼
                  ┌───────────────────────┐
                  │ P3  Build agents      │  Forge/Vega/etc. generate code changes
                  │ working (live progress│  on branch studio-zero/fix-<run-id>
                  │ per finding)          │  in an isolated workspace
                  └───────────┬───────────┘
                              │ build complete
                              ▼
                  ┌───────────────────────┐
                  │ P4  Jury re-audit     │  same runner; re-audit the generated branch
                  │ gate (mandatory)      │  per PRD §11.2 hard rule
                  └────┬──────────┬───────┘
                       │          │
                  PASS │   PASS   │ FAIL
                  WITH │  WITH    │
                  FIXES│  FIXES /│
                       │  PASS    │
                       ▼          ▼
       ┌────────────────────┐  ┌────────────────────┐
       │ P5a Open PR        │  │ P5b Do NOT open PR │
       │ on customer repo   │  │ refund issued      │
       │ feature branch     │  │ findings explained │
       └─────────┬──────────┘  └─────────┬──────────┘
                 │                       │
                 ▼                       │
       ┌────────────────────┐            │
       │ P6 Customer        │            │
       │ notified           │            │
       │ (email + in-app)   │            │
       └─────────┬──────────┘            │
                 │                       │
        ┌────────┼─────────┐             │
        │        │         │             │
        ▼        ▼         ▼             │
  ┌──────────┐┌──────────┐┌──────────┐   │
  │ P7a      ││ P7b      ││ P7c      │   │
  │ Customer ││ Customer ││ Customer │   │
  │ merges   ││ requests ││ closes PR│   │
  │ PR       ││ changes  ││ rejects  │   │
  └────┬─────┘└────┬─────┘└────┬─────┘   │
       │           │            │        │
       ▼           ▼            ▼        ▼
  ┌────────────────────────────────────────────┐
  │ P8 Re-audit on merged or post-fix state    │
  │ (per audit-run-state-machine.md)           │
  │  · merged → re-audit on customer's default │
  │  · closed → no re-audit; customer feedback │
  │     loop                                   │
  │  · refund → loop back to V0 with credit    │
  └────────────────────────────────────────────┘
```

---

## States

### P0 — Verdict screen (entry from V1b)

- **Renders:** see verdict-to-upsell-loop.md V1b.
- **Forward:** click `"Ship the fixes — $49 →"` → P1.
- **Back/cancel:** "Apply the fixes myself" link → dismiss; verdict idle.
- **Gating:** SKU must be Code or Full AND mode ∈ {BYOK, Managed} (CLI excluded per above). At least one finding has `auto_pr_eligible: true`.

### P1 — Fix-bundle picker

- **Renders:** list of `auto_pr_eligible: true` findings grouped by severity. Each row shows: finding summary, file path, estimated effort (S/M/L), price contribution if D5 tiered locks; otherwise flat $49 bundle.
  - Default: all eligible findings checked.
  - User can uncheck (e.g., "I'll do the Blockers myself; auto-PR the Minors").
  - Below the list: "Auto-PR runs on Studio Zero infra. We'll open a branch in your repo, generate the fixes, re-audit them, and open a PR only if our own re-audit passes." (Herald-voiced; brand-voice §3 pillar 3 receipts).
- **Forward:** "Buy & start →" → P2.
- **Back/cancel:**
  - "Back to verdict" → P0.
  - "Apply the fixes myself" → P0.
- **Data persisted:** `fix_pr_jobs` row in state `draft` with selected_findings array.
- **What can go wrong:** customer selects findings whose collective fix touches files outside the repo's working set — flagged inline; if any selection would require touching files outside the analyzed paths, those are pre-unchecked with explanation.

### P2 — Stripe Checkout (one-time)

- **Renders:** Stripe Checkout hosted page. Regional D20 checks identical to billing-and-cancel.md.
- **Forward:** webhook `checkout.session.completed` (idempotent per M2 gate) → `fix_pr_jobs.state = paid` → P3.
- **Back/cancel:**
  - Stripe Cancel → `/billing/cancel` → P1.
- **Async during webhook lag:** polling page as in S5c/V2a.
- **What can go wrong:** as in V2a. Idempotent.

### P3 — Build agents working

- **Renders:** live progress similar to S8 but tagged "Generating fixes" — per-finding rows: file path, status (queued / running / built / failed), generated-diff preview button.
- **Channel:** Supabase Realtime; same transport as audit-run-state-machine.md.
- **Forward:** all selected findings have a generated commit OR a `generation_failed` marker → P4.
- **Back/cancel:**
  - **"Cancel build"** with confirm: "Cancel this build? Your $49 is refunded; you can re-buy when you're ready." → refund + `fix_pr_jobs.state = cancelled_pre_pr`.
  - Browser close: build continues server-side; resumes on reopen (same pattern as audit run).
- **Data persisted:** generated branch `studio-zero/fix-<run-id>` created in an **internal workspace** (not yet pushed to customer's GitHub); per-commit attribution to originating finding ID; `AI-Authored: studio-zero/runner@v<x.y.z>` trailer per PRD §11.2.
- **What can go wrong:**
  - **Build-agent error on a finding:** that finding is marked `generation_failed`; build continues for the rest. P4 re-audit excludes failed findings.
  - **Whole-bundle build failure (rare):** state → `fix_pr_jobs.state = build_failed`; refund auto-issued; customer notified with error-frame copy.
  - **Customer revokes GitHub App during P3:** detected at next API call → state → `fix_pr_jobs.state = repo_unreachable`; refund auto-issued; customer notified to reconnect.

### P4 — Jury re-audit gate (mandatory hard rule per PRD §11.2)

- **Renders:** live progress like S8 but on the generated branch. Reviewers re-run on the post-fix code.
- **Forward:**
  - Re-audit verdict is PASS or PASS WITH FIXES with **no new Blockers introduced by the fixes** → P5a (open PR).
  - Re-audit verdict is FAIL → P5b (do NOT open PR; refund).
  - Re-audit verdict is PASS WITH FIXES but **introduces** new Critical or Blocker → treated as FAIL for this gate → P5b.
- **Back/cancel:**
  - Cancel disabled at this state (gate is short and mandatory). UI: "Re-auditing the fixes — about 5 minutes." with bounded ETA.
- **Data persisted:** `fix_pr_jobs.reaudit_run_id`, gate outcome.
- **What can go wrong:** Jury synthesis error → retry once; if 2nd fails → P5b (do NOT open PR; refund + log P1 bug).

### P5a — Open PR (happy path)

- **Renders:** "Re-audit passed. Opening PR…" then "PR opened ✓ Link: `<github_url>`".
- **Forward:** automatic to P6.
- **Back/cancel:** "Close this PR" link in case customer changes mind post-open → triggers GitHub API close + P7c.
- **PR body content (mandatory per PRD §11.2 + §14.5):**
  - EU AI Act Art. 50 disclosure paragraph (Comply + Herald template).
  - Summary of included findings (by severity).
  - Per-commit attribution to originating finding ID.
  - "Re-audit" badge confirming originating reviewer signed off.
  - PRD §11.2 hard rule: PR targets **feature branch named `studio-zero/fix-<run-id>`**, never default.
  - Snapshot-tested for Art. 50 disclosure text per PRD §16 V1.5 gate.
- **Hard rule enforcement:** PR creation API call MUST specify `base = <customer_default_branch>` and `head = studio-zero/fix-<run-id>`. Any attempt to push directly to default branch is blocked by a pre-flight check that asserts `branch != default_branch`. Per PRD §16 V1.5 gate C8: default-branch push attempt → blocked → audit-logged. Negative test in `tests/acceptance/integration/default-branch-push-blocked.spec.ts`.
- **Data persisted:** `fix_pr_jobs.pr_url`, `fix_pr_jobs.pr_number`, `fix_pr_jobs.opened_at`.

### P5b — Do NOT open PR (refund path)

- **Renders:** verdict-style screen with the re-audit FAIL: "We didn't open this PR — the fixes our build agents made didn't pass our own re-audit. Your $49 is on its way back."
- **Forward:**
  - "See what went wrong →" expands the re-audit findings.
  - "Try a different fix attempt →" returns to P1 with the failed findings flagged.
  - "Apply the fixes yourself →" returns to V0.
- **Back/cancel:** "Back to dashboard" always.
- **Hard rule:** per PRD §11.2: a PR that does not pass re-audit is NOT opened. Customer is shown why and refunded. No exception.
- **Data persisted:** `fix_pr_jobs.state = blocked_by_reaudit`, `fix_pr_jobs.refunded_at`, refund Stripe event. Refund is idempotent.

### P6 — Customer notified

- **Renders:** in-app notification + lifecycle email (E-PR-Opened; Herald-owned).
  - In-app: "PR open at `<repo>/<pr_url>`. Review and merge when you're ready."
  - Email subject: "Your fix PR is open." (sentence case; no exclamation per brand voice §7).
- **Forward:** customer clicks through to GitHub.
- **Back/cancel:** notification dismissable; remains in PR-history view in Settings.

### P7a — Customer merges PR

- **Trigger:** GitHub webhook `pull_request.closed.merged = true`.
- **Renders:** in-app: "Fix PR merged. Re-audit on the new code?" CTA → P8 with the new default-branch SHA as the audit target.
- **Forward:** "Re-audit now →" → P8.
- **Back/cancel:** "Re-audit later" → /dashboard; CTA persists on the project card.

### P7b — Customer requests changes

- **Trigger:** customer leaves a PR review with "Request changes".
- **Renders:** in-app: "Customer requested changes on the fix PR. V1.5 doesn't auto-revise — feedback recorded for a future build."
- **Forward:** customer's review comments are surfaced; "Open a fresh fix attempt →" returns to P1 with the customer's feedback as a hint for the build agents.
- **Back/cancel:** "I'll edit it myself in GitHub" closes the loop; no further automation.
- **Note:** auto-revision-on-request-changes is a V2 feature; V1.5 ships the manual loop.

### P7c — Customer closes PR without merging

- **Trigger:** `pull_request.closed.merged = false`.
- **Renders:** in-app: "You closed the fix PR without merging. Want to tell us what went wrong?" with a 1-question feedback form (optional).
- **Forward:** "Back to verdict" returns to V0.
- **Back/cancel:** dismissable.
- **Refund policy:** customer closing the PR they bought is **not** a refund event by default (the fix was generated, the PR was opened, the gate passed). However, if customer flags "the fix was wrong" via the feedback form, Comply + Ledger review for goodwill refund per D20 dispute path.

### P8 — Re-audit on merged or post-fix state

Per audit-run-state-machine.md. Surfaces in verdict-to-upsell-loop.md as V5.

---

## Edge cases

### EC-1 — Build-agent error mid-generation

**Trigger:** in P3, build agent fails on finding F-007 (e.g., infinite-loop in code generation, schema-violation, internal LLM error).
**What user sees:** that finding's row marked "Generation failed — we'll skip it." Build continues for others.
**System does:** F-007 excluded from the generated branch; P4 re-audits the rest; if ≥ 50% of bundle failed generation, whole bundle marked `build_failed` → refund (proportional if D5 tiered; full if flat).
**Recovery:** user can re-buy with just the working subset.

### EC-2 — Re-audit FAILS — PR not opened

**Trigger:** PRD §11.2 hard rule. P4 verdict is FAIL.
**What user sees:** P5b screen with explanation, refund confirmation, three forward paths.
**System does:** generated branch deleted from the internal workspace; never pushed to customer's repo; refund via Stripe within 5 minutes; `fix_pr_jobs.state = blocked_by_reaudit`.
**Recovery:** unconditional refund. Customer is back at V0 with a credit acknowledgment.

### EC-3 — Default-branch push attempt (hostile-test / bug)

**Trigger:** internal bug causes the PR creation call to specify `base = head` or to attempt direct push to default branch.
**What user sees:** "We hit an error opening this PR. Your $49 is refunded. Engineers paged." (Error-frame §3.)
**System does:** pre-flight check rejects the operation; `audit_logs` entry with severity `critical`; on-call paged.
**Recovery:** refund; customer can retry P1.
**Test gate:** PRD §16 V1.5 gate C8 negative test.

### EC-4 — Customer revokes GitHub App during P3

**Trigger:** customer (or org admin) uninstalls the Studio Zero GitHub App while build is in progress.
**What user sees:** P3 banner: "We can't reach your repo anymore. The build will pause until you reconnect."
**System does:** build held for 30 min; if no reconnect by then → `fix_pr_jobs.state = repo_unreachable` → refund.
**Recovery:** "Reconnect GitHub →" link surfaces; reconnect within 30 min → build resumes; after 30 min → refund + re-buy path.

### EC-5 — Customer revokes GitHub App after P5a (PR is open)

**Trigger:** PR is open in customer's repo; customer uninstalls the app.
**What user sees:** GitHub-side, the PR persists (we already opened it). In-app, the PR-history row shows "App was uninstalled. We can't track this PR's merge status."
**System does:** webhook subscription for this repo is dead; P7 transitions cannot fire automatically. Customer-side actions in GitHub are still real; our tracking is stale.
**Recovery:** "Reconnect to re-track this PR" link in Settings.

### EC-6 — Re-audit detects a regression introduced by the fix

**Trigger:** P4 verdict is PASS WITH FIXES *but* a new Critical was introduced by one of the generated commits (e.g., fix for Halo accessibility breaks an existing aria-label).
**What user sees:** P5b path (no PR opened): "The fixes introduced a new Critical issue. We didn't open the PR; here's why and your $49 is back."
**System does:** treated as gate FAIL per P4; refund.
**Recovery:** customer can try a different fix subset or apply fixes manually.

### EC-7 — Customer merges PR, then a re-audit at P8 lands FAIL

**Trigger:** P7a → P8 re-audit on merged code is FAIL.
**What user sees:** standard verdict screen + a note: "The merged fixes passed our pre-merge gate; the FAIL at this re-audit is from changes since the merge." Differential view shows what changed.
**System does:** no refund (the gate passed at merge time); standard verdict-to-upsell-loop applies.
**Recovery:** customer is at V0 with full options. Trend chart shows the dip.

### EC-8 — Customer revokes consent for AI training data after P5a

**Trigger:** Settings → consent revoke. (Settings flow.) The merged PR includes commits authored by AI; the customer can't retroactively retract their *use* of the PR but can opt out of future AI-training use.
**What user sees:** consent toggled off; no retroactive removal.
**System does:** future runs respect new consent; prior `fix_pr_jobs` records retained per audit retention §14.4.
**Recovery:** N/A for fix-delivery flow; handled in settings-and-account-management.md.

### EC-9 — Two simultaneous Auto-PR purchases on the same run

**Trigger:** customer double-clicks "Buy & start →" or opens two tabs.
**What user sees:** Stripe Checkout's idempotency key (one per `fix_pr_jobs` draft) prevents double-charge. Second click resolves to the first session.
**System does:** idempotent.
**Recovery:** at most one `fix_pr_jobs` reaches `paid` per draft.

---

## Acceptance criteria (binary, testable)

**Happy:**
- **Given** a Code-SKU customer with a FAIL verdict containing ≥ 3 `auto_pr_eligible: true` findings,
- **When** they purchase Auto-PR and the build + re-audit + open-PR flow completes,
- **Then** a PR exists on the customer's repo on branch `studio-zero/fix-<run-id>`, the PR body contains the EU AI Act Art. 50 disclosure paragraph (snapshot-tested), and `fix_pr_jobs.state = pr_opened` with `pr_url` set.

**Unhappy 1 — re-audit FAILS, no PR opened (hard rule):**
- **Given** P3 completes successfully and P4 re-audit returns FAIL,
- **When** P5 is reached,
- **Then** no GitHub PR is created (verified by GitHub API call audit), the generated branch is deleted from internal workspace, a Stripe refund is issued idempotently, and `fix_pr_jobs.state = blocked_by_reaudit`.

**Unhappy 2 — default-branch push attempt blocked:**
- **Given** a forged code path or fuzz test attempts to set `base = <default_branch>` and `head = <default_branch>` on PR creation,
- **When** the pre-flight check runs,
- **Then** the operation is rejected with `code: 'invariant_violation_default_branch'`, an audit-log entry is written with severity `critical`, and no GitHub API mutation occurs.

**Unhappy 3 — build-agent error refunds proportionally:**
- **Given** P3 fails generation on ≥ 50% of selected findings,
- **When** the build agent reports terminal failure,
- **Then** state → `build_failed`, full refund issued via Stripe (flat pricing) or proportional refund (tiered pricing if D5 locks tiered), customer notified per error-frame.

**Unhappy 4 — customer revokes GitHub App mid-build:**
- **Given** P3 is in progress and the customer uninstalls the GitHub App,
- **When** the next API call detects the missing installation,
- **Then** the build pauses with the reconnect banner; after 30 min without reconnect, state → `repo_unreachable`, refund issued, customer notified by email + in-app.

---

## Open questions

- **OQ-1 (for BigBrain + Comply):** EC-5 (PR open after app uninstall) — do we maintain a long-lived OAuth grant for PR-tracking-only that survives App uninstall? Probably not (defeats the per-repo-permissions D1 lock). Recommend: notify and let customer manually report PR outcome.
- **OQ-2 (for Penny + Ledger):** P5b refunds — flat-$49 or tiered? D5 still open. Lock before V1.5 dev starts.
- **OQ-3 (for Stream):** P7a/P7b/P7c webhook deduplication — GitHub can deliver the same `pull_request.closed` webhook twice. Confirm idempotency on the receiver side.
- **OQ-4 (for Verify):** snapshot test for the Art. 50 disclosure paragraph in PR body — what's the update procedure when Comply revises the text? Recommend: snapshot lives in `runner/schemas/pr-body.v1.template.md`, version-bumped on every change, with a changelog Comply signs off.
- **OQ-5 (for Halo):** EC-6 — when the auto-fix introduces a regression in a different reviewer's area (e.g., Halo fix breaks Optic finding), should the customer see the regression diff cleanly? Recommend a "fixed N → introduced M" mini-table on P5b.
