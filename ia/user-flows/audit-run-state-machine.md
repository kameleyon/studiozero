# Flow: Audit Run State Machine

**Owner:** Trace
**Personas affected:** all §5 personas — this is the engine of every audit experience.
**Mode applicability:** all three — BYOK / CLI / Managed. State machine is identical across modes; transport differs.
**Acceptance test:** `tests/acceptance/integration/run-state-machine.spec.ts` + `tests/acceptance/e2e/run-cancel-resume.spec.ts` (per PRD §18.5 Goal 4). Asserts every documented transition, every terminal state, and every recovery path. Cross-tenant assertion piggybacks `integration/rls-cross-tenant.spec.ts` (Goal 5).
**PRD references:** §7.2 Step C, §13.3 Runner contract + AuditEvent enum, §13.5 multi-tenancy isolation, §14.2 Reliability (partial-result boundary = per-reviewer), §17 D8 (sandbox), §17 D9 (SSRF / prompt-injection / redaction / ingestion).

---

## State diagram (ASCII)

```
                         ┌─────────────────┐
              ┌──────────│ created (draft) │  user clicks "Start audit" at S7
              │          └────────┬────────┘
              │                   │ enqueue
              │                   ▼
              │          ┌─────────────────┐
              │          │ queued          │  in job queue (BullMQ / pg-boss)
              │          └────────┬────────┘
              │                   │ worker pulls (hosted) OR CLI long-polls
              │                   ▼
              │          ┌─────────────────┐
              │          │ dispatched      │  worker assigned; tenant JWT minted
              │          └────────┬────────┘
              │                   │ runner.runAudit() invoked
              │                   ▼
              │          ┌─────────────────┐
              │          │ reviewers_      │  one row per reviewer; fan-out
              │          │ running         │  parallel where possible
              │          └────────┬────────┘
              │            ┌─────┼─────┐
              │            │     │     │   per-reviewer substates:
              │            ▼     ▼     ▼     · running
              │          (Optic)(Halo)(...)  · failed (transient)
              │                              · retried (max 2 attempts)
              │                              · failed_terminal
              │                              · complete
              │                   │ all reviewers terminal
              │                   ▼
              │          ┌─────────────────┐
              │          │ all_reviewers_  │
              │          │ complete        │
              │          └────────┬────────┘
              │                   │ Jury synthesis
              │                   ▼
              │          ┌─────────────────┐
              │          │ jury_           │
              │          │ synthesizing    │
              │          └────────┬────────┘
              │                   │ Jury emits final_verdict event
              │                   ▼
              │          ┌─────────────────┐
              │          │ verdict_emitted │  ← terminal "happy" state
              │          └────────┬────────┘
              │                   │ retention timer (default 7d code; 24mo findings)
              │                   ▼
              │          ┌─────────────────┐
              │          │ archived        │  cryptoshredded code; findings retained
              │          └─────────────────┘
              │
              │  ── unhappy terminals from any non-terminal state ──
              │
              ├──► cancelled                    user-initiated cancel
              ├──► failed_recoverable           transient error; refund or retry
              ├──► failed_terminal              irrecoverable; credit returned
              ├──► partial_completed            token-budget hit; reviewers that finished synth
              └──► suspended_violation          AUP violation detected (rare; M5+)
```

State name conventions are stable: every state above is a string literal in `runs.state`.

---

## States

### `created` (draft)

- **Renders:** /dashboard "Drafts" section row; the depth-picker submit hasn't fired yet.
- **Forward:** user clicks "Start audit →" at S7 of signup-to-first-verdict.md → state advances to `queued`.
- **Back/cancel:**
  - "Edit draft" → back to S6/S7.
  - "Delete draft" with confirm: "Delete this draft? You can start a new one any time." → row removed.
- **Data persisted:** `projects` row, `runs` row in state `created`.
- **Goes wrong:** user never starts. Draft auto-purges after 30d (storage limitation §14.4).

### `queued`

- **Renders:** "Run queued — waiting for a worker (typical wait: < 30s)". User-visible queue position if > 30s wait predicted.
- **Forward:** worker pulls job (BullMQ for hosted; long-poll for CLI) → `dispatched`.
- **Back/cancel:** "Cancel run" → confirm: "Cancel before it starts? No charge." → `cancelled`. Refund auto-issued if applicable.
- **Data persisted:** `runs.state = queued`, `runs.queued_at`.
- **Goes wrong:**
  - Queue full (per-tenant cap §13.5) → user sees "You have N runs already running on this plan. Wait, cancel one, or upgrade." with three actions.
  - Worker pool exhausted (hosted-side) → queue wait shown; SLO breach alerts on-call (>5min p95).
- **Async during wait:** Realtime channel `runs:<run_id>` open from this state; no spinner-without-feedback (Trace red line).

### `dispatched`

- **Renders:** "Run starting…" with skeleton of per-agent rows.
- **Forward:** runner emits first `progress` AuditEvent → state advances to `reviewers_running`.
- **Back/cancel:** "Cancel run" → confirm modal as in S8 → `cancelled`.
- **Data persisted:** `runs.state = dispatched`, `runs.dispatched_at`, `runs.runner_id` (worker id or CLI pairing id), short-lived tenant JWT minted (§13.5).
- **Goes wrong:**
  - Worker accepts job but never emits first event in 60s → heartbeat watchdog re-queues (attempt+1; max 2 retries per §14.2).
  - Hosted: container failed to start (sandbox issue) → automatic re-queue → if 2nd attempt fails → `failed_recoverable` (refund + retry option).
  - CLI: paired CLI accepts job but goes silent → heartbeat watchdog: at 60s, UI shows "CLI not responding"; at 120s, requeues to `queued` for re-dispatch (CLI may re-pair on another device).
- **Recovery:** UI never blanks; states transition visibly.

### `reviewers_running` (parent of N substates)

- **Renders per PRD §7.2 Step C + Optic v0.4:** per-agent rows with phase chip + partial-finding count; `aria-live="polite"` region; throttle ≤ 4 updates/sec.
- **Per-reviewer substates** (one row per reviewer in the depth's set):
  - `running` — reviewer working.
  - `failed_transient` — recoverable error (e.g., rate-limit from Anthropic) — auto-retry per §14.2 (up to 2x).
  - `retried` — retry in progress (UI badge: "retrying").
  - `failed_terminal` — irrecoverable for this reviewer — Jury proceeds with partial verdict (per §14.2 boundary).
  - `complete` — reviewer emitted its findings; written to `findings` table.
- **Forward:** when all reviewer rows are in a terminal substate (`complete` or `failed_terminal`) → state advances to `all_reviewers_complete`.
- **Back/cancel:**
  - "Cancel run" → confirm: "Cancel and keep partial findings? Reviewers that finished will be included in a partial verdict." → `cancelled` (with synthesis from completed) OR `partial_completed` if any reviewer completed.
- **Data persisted:** per reviewer: `findings` rows written as they emit; `runs.reviewer_status` JSON map.
- **Goes wrong:**
  - Reviewer hits prompt-injection trip (per D9) → reviewer marked `failed_transient` with `code: 'prompt_injection_block'`; retry runs the redacted variant; if 2nd fails → `failed_terminal` for that reviewer; Jury proceeds.
  - SSRF egress rejection (D9) → same path as above with `code: 'egress_denied'`.
  - Token-budget exceeded mid-reviewer (Managed) → reviewer marked `failed_terminal`; UI banner; remaining reviewers cancelled cleanly; run → `partial_completed`.
  - Sandbox escape attempt detected → reviewer marked `failed_terminal`; security event logged; if 2+ reviewers tripped, run → `suspended_violation` (rare; M5+).

### `all_reviewers_complete`

- **Renders:** "All reviewers done. Jury synthesizing…" with progress chip.
- **Forward:** Jury synthesis emits `final_verdict` event → `verdict_emitted`.
- **Back/cancel:** "Cancel" — disabled at this state (Jury synthesis is short and uncancellable; would corrupt partial-result invariants). UI shows "Jury is composing your verdict — this takes about 10 seconds. Hang on." Trace exemption: this is a < 30s window; the cancel affordance is replaced by a clearly-bounded ETA.
- **Data persisted:** `runs.state`, reviewer findings finalized.
- **Goes wrong:** Jury synthesis fails (rare; LLM provider issue or schema-validation error per §9.4) → state → `failed_recoverable` with auto-retry; if 2nd fails → `failed_terminal` and credit returned.

### `jury_synthesizing`

- **Renders:** same as above; sub-state of synthesis.
- **Forward:** synthesis complete + verdict + score + score_breakdown computed deterministically per PRD §10 → `verdict_emitted`.
- **Back/cancel:** same as above (uncancellable bounded).
- **Data persisted:** `score_snapshots` row (with `score_engine_version: "v1"`), `runs.verdict`, `runs.score`.
- **Goes wrong:** schema validation fails on Jury output (PRD §9.4 contract) → run → `failed_terminal` with `code: 'schema_invalid'`; bug; Verify on-call paged.

### `verdict_emitted` (terminal — happy)

- **Renders:** verdict screen per PRD §7.2 Step D (see signup-to-first-verdict.md S9).
- **Forward:** user clicks primary CTA → verdict-to-upsell-loop.md.
- **Back/cancel:**
  - "Back to dashboard" — preserves verdict access at /run/`<run-id>`.
  - "Export the report" — always available.
- **Data persisted:** all final.
- **Goes wrong:** N/A — terminal happy state.

### `archived` (terminal — happy, post-retention)

- **Trigger:** retention timer expires.
  - Customer code (BYOK/Managed): 7 days default, 0–30 customer-overridable (§14.4).
  - Findings + verdicts + scores: **24 months** (§14.4; changed from "indefinite" v0.4).
- **Renders:** verdict + findings still viewable; "Source code archived per retention policy" badge on the evidence viewer where source was the evidence.
- **Forward:** "Re-run on fresh code →" — triggers a new run if intake still connected.
- **Back/cancel:** "Delete this run's data now" (GDPR Art. 17) → confirm → cryptoshredding completes within 30 days per §14.4.

### `cancelled` (terminal — user-initiated)

- **Trigger:** user clicks "Cancel run" from any non-terminal state and confirms.
- **Renders:** "Run cancelled. Findings up to cancellation saved (`N` findings)." If zero findings, "Run cancelled — no findings yet."
- **Forward:** "Start a new audit →" (new run), "View partial findings →" (if any).
- **Back/cancel:** terminal; nothing to cancel further.
- **Data persisted:** `runs.state = cancelled`, `runs.cancelled_at`, `runs.cancelled_by` (user_id), partial findings preserved.
- **Goes wrong:** user double-clicks Cancel during the confirm modal animation → idempotent on backend; only first request mutates state.

### `failed_recoverable` (terminal — transient error)

- **Trigger:** runner emits `{ kind: 'error', recoverable: true, code, message }` from `dispatched` or `reviewers_running` state, AND retry budget exhausted.
- **Renders:** error-messages.md §3 "Run failed" copy. Two buttons: "Retry the audit" / "Contact us". If applicable: "1 audit credit returned."
- **Forward:** "Retry" → new `runs` row in `queued`. Credit auto-refunded for Managed tier.
- **Back/cancel:** "Back to dashboard" always.
- **Data persisted:** `runs.failure_code`, `runs.failure_recoverable = true`.

### `failed_terminal` (terminal — irrecoverable error)

- **Trigger:** runner emits `recoverable: false` OR a security violation (D9) trips a non-retryable code (e.g., `prompt_injection_critical`).
- **Renders:** same copy as `failed_recoverable` but without the Retry path; replaced with "Contact us" prominently.
- **Forward:** "Contact us" → support email + run_id in body.
- **Back/cancel:** "Back to dashboard" always.
- **Data persisted:** `runs.failure_code`, security event in `audit_logs`.

### `partial_completed` (terminal — partial verdict)

- **Trigger:** token-budget exceeded OR user cancelled after at least one reviewer completed.
- **Renders:** verdict screen with badge: "Partial verdict — based on `<N>` of `<6>` reviewers." Findings list shows reviewers that completed; missing reviewers explained in an inline card.
- **Forward:** "Upgrade and finish the audit →" (Managed upgrade path) OR "Run again with full budget →" (BYOK).
- **Back/cancel:** "Back to dashboard" always.
- **Data persisted:** partial verdict scored from partial findings; `score_engine_version` + `partial: true` flag so it doesn't mix into "first-audit FAIL rate" metric (§15 SLI definitions).

### `suspended_violation` (terminal — rare; M5+ AUP enforcement)

- **Trigger:** AUP violation detected during run (e.g., CSAM ingestion limit, malware C2 fingerprint per §14.7).
- **Renders:** "This run was halted. Our policies don't allow auditing this content. Contact us to dispute." No findings emitted externally.
- **Forward:** "Contact us" only.
- **Back/cancel:** terminal; account may be flagged for review.

---

## Edge cases

### EC-1 — Cancel-mid-run with one reviewer complete

**Trigger:** user clicks "Cancel run" at `reviewers_running` after Optic finished but Halo still running.
**What user sees:** confirm modal: "Cancel and keep partial findings? Optic's findings will be included in a partial verdict." → confirm → renders partial verdict screen.
**System does:** signals Halo + others to abort cleanly; Jury synth runs over Optic-only; run → `partial_completed`.
**Recovery:** user can re-run anytime; partial verdict is exportable.

### EC-2 — Browser close mid-run

**Trigger:** user closes tab at any state from `queued` through `jury_synthesizing`.
**What user sees:** nothing immediately; reopening /run/`<run-id>` re-subscribes to the Realtime channel and shows current state.
**System does:** runner continues uninterrupted (hosted infra) or CLI continues locally. Events buffered in Realtime channel + persisted to `runs.events_log` so late subscribers can replay history.
**Recovery:** cross-device handoff works (user opens phone, sees state); cross-session handoff works (user logs back in days later, sees terminal state).

### EC-3 — Runner crash (hosted)

**Trigger:** worker container OOM, segfault, or sandbox tripped a fatal seccomp rule (§17 D8).
**What user sees:** state holds for ≤ 60s (heartbeat watchdog), then UI shows "Reviewer restarted (1 of 2 retries)" inline on the affected reviewer row.
**System does:** heartbeat misses 3 beats → worker marked dead → job re-enqueued with attempt+1; if attempt=3 → `failed_recoverable`.
**Recovery:** transparent to user except for the retry badge.

### EC-4 — Network disconnect between web and server (user side)

**Trigger:** user's wifi drops mid-run.
**What user sees:** Realtime websocket disconnects; UI banner: "Reconnecting…" After 5s, falls back to long-poll. If long-poll also fails, banner: "Connection lost. The run is still running on our side — refresh to reconnect."
**System does:** server runs uninterrupted; state changes captured.
**Recovery:** reconnect resumes state at current; no findings lost.

### EC-5 — Token-budget exceeded mid-run (Managed)

**Trigger:** per-tenant budget cap hit (§13.5).
**What user sees:** at next state transition, banner: "This run hit the token budget for `<plan>`. Partial findings saved (`<N>` so far). Upgrade or finish on this plan next cycle." Buttons: "Upgrade →" / "View partial findings →".
**System does:** runner sent SIGTERM; remaining reviewers cancelled; Jury synth runs over completed; run → `partial_completed`.
**Recovery:** upgrade path inside the app (S5c-equivalent); partial verdict is real and exportable.

### EC-6 — CLI goes offline mid-run

**Trigger:** CLI heartbeat lost during `reviewers_running` (process killed, laptop closed, network drop).
**What user sees:** at 60s heartbeat-miss, UI shows error-messages.md §1 "Your CLI isn't connected" with two buttons: "Show pairing code" (re-pair on this or another device) / "Switch to BYOK mode" (which would re-queue the run on hosted infra — but only after user confirms because their source then goes to Jo's infra; explicit warning).
**System does:** run held at last reviewer state. If CLI returns within 5min, run resumes from the last reviewer (per §14.2 partial-result boundary, in-flight reviewer restarts). After 5min, run → `failed_recoverable` with retry path.
**Recovery:** CLI users have a hard 5-min reconnect window; configurable in Settings up to 30 min for known-flaky-network users.

### EC-7 — User on free tier hits unlimited Surface re-audits abuse limit

**Trigger:** > 50 runs in 24h on a single project (rate-limit per §12 free-tier safeguards).
**What user sees:** at `created` → `queued` transition, banner: "You've run many audits on this project in the last day. Wait 1 hour, or upgrade to remove the limit." Buttons: "See plans →" / "OK".
**System does:** rate-limit applied per IP + per tenant; `created` row not enqueued.
**Recovery:** the limit is short; flow re-opens cleanly after the cooldown.

### EC-8 — Tenant A's worker accidentally pulls Tenant B's job

**Trigger:** queue-routing bug (theoretical; covered by `integration/rls-cross-tenant.spec.ts`).
**What user sees:** never happens in production if test passes. If it did: tenant JWT minted at dispatch is bound to the job's tenant; RLS would reject all queries; runner would fail with `code: 'tenant_mismatch'` → `failed_terminal`.
**System does:** logs critical security event; pages on-call.
**Recovery:** PRD M0/M1 exit gate (Goal 5) prevents this.

### EC-9 — User starts second audit on same project while first is still running

**Trigger:** /dashboard click → new audit on a project with an `in-flight` run.
**What user sees:** disambiguation: "This project already has an audit running. Wait for it to finish, cancel it, or start a parallel audit (Pro plan only)."
**System does:** per-tenant concurrency cap enforced (§13.5).
**Recovery:** explicit choice; no implicit cancellation.

### EC-10 — Verdict event received twice (network retry, idempotency)

**Trigger:** Realtime delivers `final_verdict` event twice due to reconnect.
**What user sees:** verdict renders once; idempotent on transition `jury_synthesizing → verdict_emitted`.
**System does:** event handler is idempotent; second event is a no-op.
**Recovery:** N/A.

---

## Acceptance criteria (binary, testable)

**Happy:**
- **Given** a fresh `runs` row in `created`,
- **When** the user clicks Start and the runner completes normally with all reviewers reaching `complete`,
- **Then** the row passes through `queued → dispatched → reviewers_running → all_reviewers_complete → jury_synthesizing → verdict_emitted` with monotonic `*_at` timestamps and `runs.state = verdict_emitted`.

**Unhappy 1 — cancel mid-run preserves partial findings:**
- **Given** a run at `reviewers_running` with at least one reviewer in `complete`,
- **When** the user confirms cancel,
- **Then** state transitions to `partial_completed`, `findings.count == reviewers_complete.count > 0`, and a partial verdict with `partial: true` is rendered.

**Unhappy 2 — browser-close-resume:**
- **Given** a run is at `reviewers_running` and the websocket is killed,
- **When** the user reopens /run/`<run-id>` within 30 minutes,
- **Then** the channel re-subscribes, replayed events from `runs.events_log` rebuild the per-agent view to the current state, and the run completes normally.

**Unhappy 3 — runner-crash auto-retry:**
- **Given** a worker crashes during `reviewers_running`,
- **When** the heartbeat watchdog marks the worker dead,
- **Then** the run is re-enqueued with `attempt = 2`, completes normally, and the user sees a non-alarming "retrying" badge on the affected reviewer row.

**Unhappy 4 — token-budget-exceeded:**
- **Given** a Managed-tier run trips the per-tenant token cap during `reviewers_running`,
- **When** the cap fires,
- **Then** in-flight reviewers receive SIGTERM, completed reviewers' findings are preserved, the run transitions to `partial_completed`, a partial verdict renders, and the upgrade-path CTA is visible.

**Unhappy 5 — CLI-offline mid-run:**
- **Given** a CLI-mode run at `reviewers_running`,
- **When** the CLI heartbeat is missed for 60s,
- **Then** the UI shows error-messages.md §1 copy with both reconnect and mode-switch options, the run state holds for 5 minutes before transitioning to `failed_recoverable`, and a CLI re-pair within that window resumes the run from the last reviewer (per §14.2 boundary).

---

## Open questions

- **OQ-1 (for Sprint + BigBrain):** the `all_reviewers_complete → jury_synthesizing` transition is uncancellable per the Trace red-line exemption (bounded < 30s). Is the 30s budget achievable for Comprehensive depth on a large repo? If not, we need a real cancel affordance here too.
- **OQ-2 (for Comply):** `suspended_violation` is rare but does the user get any data back? Comply should specify whether partial findings on a violated artifact are deletable on request (Art. 17) or retained as evidence (legal hold).
- **OQ-3 (for Optic):** EC-9 (concurrent runs on one project) — should the second-audit attempt block, queue-and-wait, or run-in-parallel? Pro tier allows parallel; free/Starter tiers must pick one. Recommend "queue-and-wait with one-click cancel of the in-flight."
- **OQ-4 (for Stream + Atlas):** the Realtime channel buffers events for late subscribers (EC-2). What's the buffer retention? Recommend 24h (covers cross-session resumption for any reasonable user pattern); flag for Atlas data-volume estimate.
- **OQ-5 (for Verify):** the schema-validation failure at `jury_synthesizing` (PRD §9.4 contract) is a `failed_terminal` for the user but a P1 bug for us. Should the user automatically receive a free re-audit credit in this case? Recommend yes; flag for Penny/Ledger.
