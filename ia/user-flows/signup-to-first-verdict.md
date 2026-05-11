# Flow: Signup to First Verdict

**Owner:** Trace
**Personas affected:** §5 all four (Solo founder non-technical, Solo founder technical, Indie agency, Engineering lead at small startup). Primary persona is the technical solo founder; the flow must not collapse for the non-technical persona either.
**Mode applicability:** all three — BYOK / CLI / Managed. Mode picker is a state in this flow.
**Acceptance test:** `tests/acceptance/e2e/signup-to-first-verdict.spec.ts` (per PRD §18.5 Goal 1). Asserts: signup → mode picked → intake connected → run completes → verdict rendered in < 8 minutes simulated, finding count > 0, no dead-end state hit.
**PRD references:** §4 Goal 1, §7.1 Onboarding & Mode Selection, §7.2 Step A–D, §8 Three Execution Modes, §12 Free tier (D2), §14.7 URL-audit authorization, §17 D1/D2/D6/D7.

---

## State diagram (ASCII)

```
                     ┌───────────────────────┐
                     │ S0  Landing (logged-out)
                     │ CTA: "Run a free Surface audit →"
                     └─────────────┬─────────┘
                                   │ click CTA
                                   ▼
                     ┌───────────────────────┐
                     │ S1  Signup form       │
                     │ email + pw OR OAuth   │
                     │ (Google / GitHub)     │
                     └─────────────┬─────────┘
                                   │ submit
                                   ▼
                     ┌───────────────────────┐
                     │ S2  Verify-email sent │  ←─── back: "Use a different email"
                     │ poll for click        │       cancel: "Delete this signup" (Comply)
                     └─────────────┬─────────┘
                                   │ link clicked (different tab or same)
                                   ▼
                     ┌───────────────────────┐
                     │ S3  Workspace created │
                     │ Cookie consent banner │  (granular: necessary / analytics / marketing)
                     │ AUP attestation       │
                     └─────────────┬─────────┘
                                   │ continue
                                   ▼
                     ┌───────────────────────┐
                     │ S4  Mode picker       │  three cards: BYOK / CLI / Managed
                     │ "How will you run it?"│  defaults: free signup biased to BYOK
                     └────┬────────┬────────┬┘
                          │        │        │
                     BYOK │   CLI  │ Managed│
                          ▼        ▼        ▼
            ┌───────────┐ ┌───────────┐ ┌──────────────────┐
            │ S5a Paste │ │ S5b Down  │ │ S5c Stripe       │
            │ Anthropic │ │ load CLI  │ │ Checkout (hosted)│
            │ key + dry │ │ + pair    │ │ select plan      │
            │ run       │ │ code      │ │                  │
            └─────┬─────┘ └─────┬─────┘ └──────┬───────────┘
                  │ ok          │ paired      │ webhook: paid
                  └──────┬──────┴─────┬───────┘
                         ▼            ▼
                     ┌───────────────────────┐
                     │ S6  Connect intake    │  "What do you have?"
                     │ GitHub repo / folder  │   (Optic's 2-step picker, Step 1)
                     │ / attested-own URL    │
                     └─────────────┬─────────┘
                                   │
                                   ▼
                     ┌───────────────────────┐
                     │ S7  Depth picker      │  Quick (default) / Comprehensive / Custom
                     │                       │  (Optic's 2-step picker, Step 2)
                     └─────────────┬─────────┘
                                   │ start
                                   ▼
                     ┌───────────────────────┐
                     │ S8  Live progress     │  Supabase Realtime, per-agent rows
                     │ phase chips + partial │  aria-live="polite"; can cancel
                     └─────────────┬─────────┘
                                   │ all reviewers done + jury synth
                                   ▼
                     ┌───────────────────────┐
                     │ S9  Verdict screen    │  FAIL / PASS WITH FIXES / PASS
                     │ score + findings      │  PRD §7.2 Step D
                     └─────────────┬─────────┘
                                   │ (verdict-to-upsell loop, separate flow)
                                   ▼
                            (terminal: end of this flow;
                             handoff to verdict-to-upsell-loop.md)
```

Every state has a forward action AND a back/cancel affordance — enumerated below.

---

## States

### S0 — Landing (logged-out)

- **Renders:** hero + one-line PRD §1 statement, primary CTA "Run a free Surface audit →", secondary "Sign in".
- **Forward:** click CTA → S1.
- **Back/cancel:** close tab. No data persisted yet.
- **Data persisted:** none. PostHog event (consent-gated) — landing impression after cookie consent only.
- **What can go wrong:** marketing claim drift (Herald + Comply re-verify quarterly). N/A to flow.

### S1 — Signup form

- **Renders:** email + password OR OAuth buttons (Google, GitHub). Password manager support (SC 3.3.8). `autocomplete="email"` and `autocomplete="new-password"`.
- **Forward:** submit OR OAuth callback → S2 (email) OR S3 (OAuth, email already verified by provider).
- **Back/cancel:** "Sign in instead" link → /login. Browser back → S0. Form state preserved on accidental nav (SC 3.3.7 Redundant Entry).
- **Data persisted:** none until submit. On submit: `auth.users` row (Supabase Auth); no `tenant_members` row yet.
- **What can go wrong:**
  - Email already exists → inline error: "An account uses that email. Sign in instead." Link to /login carries email through.
  - Weak password → inline error with the rule that failed. Not a modal.
  - OAuth provider down → message per error-frame: "GitHub didn't respond. Try email signup, or try GitHub again."
  - Bot signup → Cloudflare Turnstile (telemetry consent-gated; per §13 obs requirements).
- **Recovery:** all paths lead back to S1 with state preserved. No dead-end.

### S2 — Verify-email sent

- **Renders:** "Check your email. We sent a link to `<masked-email>`." Resend countdown (60s). Help-text: "Wrong email? Use a different one."
- **Forward:** poll Supabase Auth every 5s for `email_confirmed_at`. When set → auto-advance to S3. Also: if user clicks the email link in *another* tab, that tab handles the redirect; this tab's poll detects the change and advances.
- **Back/cancel:**
  - "Use a different email" → soft-deletes the unverified `auth.users` row (Comply Art. 17 within 30 days; we delete immediately because the account was never verified), returns to S1 with form cleared.
  - "Cancel signup" → same as above.
- **Data persisted:** `auth.users` row (unverified). Auto-purged after 7 days of no verification (Comply storage limitation).
- **What can go wrong:**
  - Email never arrives (typo, spam filter) → resend button works after 60s; "Use a different email" path always available.
  - Link expired (default Supabase 24h) → S2.5 (Expired-link recovery): "This link expired. Send a new one." → re-trigger send → return to S2.
  - User closes tab before clicking link → flow resumes: clicking the link later opens S3 directly (Supabase Auth handles).
- **Recovery:** resend, switch email, or click the link from any device.

### S2.5 — Expired-link recovery (substate)

- **Renders:** "That link expired. Send a new one?" — one button: "Send new link". 
- **Forward:** send → S2 with reset countdown.
- **Back/cancel:** "Use a different email" → S1.
- **No dead-end.**

### S3 — Workspace created + first-run consent

- **Renders:**
  - Cookie consent banner (granular: necessary / analytics / marketing) — required by GDPR + ePrivacy + UK PECR per PRD §6.1. Pre-consent telemetry buffered, never transmitted (§13.6).
  - AUP attestation: "I have read and agree to the Acceptable Use Policy."
  - Welcome card: "Hi `<name>`. Let's set up your first audit."
- **Forward:** continue → S4. Both consent and AUP attestation are required to advance.
- **Back/cancel:**
  - "Log out" link in header. Logout returns to S0; verified user row retained.
  - "Delete this account" link (always available per Comply Art. 17). Opens a confirmation modal → settings-and-account-management.md S-DEL flow.
- **Data persisted:** `tenants` row created (workspace), `tenant_members` row links user→tenant (role: owner), `consent_records` row.
- **What can go wrong:**
  - Consent banner dismissed without choice → banner re-appears next page load; analytics off until consent given.
  - AUP refused → user cannot proceed; "Log out" remains available.
- **Recovery:** logout → log back in → S3 returns (idempotent).

### S4 — Mode picker

- **Renders:** three cards side-by-side at desktop, stacked at mobile (320px reflow per SC 1.4.10). Each card: mode name, one-line description, setup-effort badge, "Choose →" button.
  - **BYOK:** "Paste an Anthropic API key. Your tokens, our infra."
  - **CLI (Privacy):** "Run on your own machine. Source never leaves your laptop." Badge: `Private Run · Self-Audited` (D7 preview).
  - **Managed:** "We handle tokens. Easiest setup." Badge: "Recommended for non-technical."
- **Forward:** click "Choose →" → S5a / S5b / S5c.
- **Back/cancel:**
  - "Skip for now" link → S6 with mode = unselected; intake step locks Code/Full SKUs (free Surface allowed on attested own URL).
  - Browser back → S3.
- **Data persisted:** `tenants.mode_pref` (nullable; non-binding; can change anytime in Settings).
- **Hick's Law check (Optic):** 3 choices + 1 skip = under 7. Pass.
- **What can go wrong:** user picks wrong mode → switchable from Settings at any time without data loss (see settings-and-account-management.md).

### S5a — BYOK key entry + dry-run

- **Renders:** API key input (HC5: `autocomplete="off"`, show/hide toggle keyboard-operable, `aria-describedby` linking purpose, paste supported, password-manager-friendly per SC 3.3.8). Help-text: "We dry-run a single call to verify the key. Studio Zero never logs the key."
- **Forward:** "Verify & save" → background dry-run call (Anthropic `messages` endpoint, 1 token max). On success → encrypt via Supabase Vault (`pgsodium` TCE, **XChaCha20-Poly1305 AEAD** per v0.5 Cipher Fix-4, `tenant_id::text` as AAD per §13.4) → S6.
- **Back/cancel:**
  - "Back" → S4.
  - "Skip — I'll add a key later" → S6 in restricted mode (can connect intake but cannot start a paid run).
- **Data persisted:** `api_keys` row (encrypted ciphertext only), `tenants.byok_verified_at`.
- **What can go wrong:**
  - Invalid key → inline error: "Anthropic didn't accept that key. Check it and paste again." No raw 401 in user string (per error-frame).
  - Anthropic rate-limited → "Anthropic is rate-limiting that key. Try again in a minute, or paste a different key."
  - Anthropic down → "Anthropic didn't respond. Try again, or pick a different mode." Fallback link to S4.
  - Customer pastes a key from a banned account → handled at run time, not here (PRD #19 BYOK Provider Pass-Through ToS).
- **Recovery:** every failure leaves user on S5a with the input intact; banner above the input names the problem.

### S5b — CLI download + pairing

- **Renders:** OS-detected download button ("Download for macOS / Linux / Windows"). Three steps: (1) install, (2) run `studio-zero login`, (3) paste pairing code shown on screen (6 chars, regenerates every 5 min). Pairing code has explicit expiry timestamp.
- **Forward:** poll for CLI heartbeat. When CLI registers with the pairing code → web shows "CLI connected ✓ (`hostname`)" → S6.
- **Back/cancel:**
  - "Back" → S4.
  - "Skip — pair later" → S6 with CLI marked unpaired; intake locks the Local Folder option.
  - "Show pairing code again" regenerates if expired.
- **Data persisted:** `cli_pairings` row (pairing_code_hash, expires_at, paired_at nullable, device fingerprint).
- **What can go wrong:**
  - Pairing code expired → user sees expired badge → click "Generate new code" → new code → continue.
  - CLI version mismatch → CLI returns 426 Upgrade Required on heartbeat → web shows "Your CLI is older than the server expects. Run `studio-zero upgrade`, then try again."
  - User on locked-down corp network blocking egress → CLI fails to register → "We can't reach the CLI. Confirm `studio-zero login` ran without errors, or switch to BYOK." Fallback link to S4.
- **Recovery:** every failure has either a regenerate path or a mode-switch fallback. See cli-pairing-and-tamper.md for the full state machine.

### S5c — Stripe Checkout (Managed)

- **Renders:** plan picker (Managed Starter $99 / Managed Pro $249) → click → redirect to **Stripe Checkout (hosted)** per HC6 + PRD §14.6. Token-budget set per tier on success.
- **Forward:** Stripe webhook `checkout.session.completed` (idempotent per Ledger spec) → server marks `subscriptions.status = active` → user redirected to S6.
- **Back/cancel:**
  - "Back" on plan picker → S4.
  - On Stripe Checkout: Stripe's built-in cancel returns user to `<host>/billing/cancel` → renders "Checkout cancelled. Pick a plan or try a different mode." → S4.
- **Data persisted:** `subscriptions` row, `billing_events` row, regional refund-matrix state (per D20).
- **Async state during webhook lag (user-visible):** while we wait for webhook (typical < 2s, p99 < 30s), user lands on `/billing/return?cs=<session-id>` with a polling indicator: "Confirming payment with Stripe…". Webhook is the truth; we do **not** mark active off the success URL alone.
- **What can go wrong:**
  - Card declined → Stripe returns to the form; on final cancel, user returns to plan picker.
  - Webhook delayed > 60s → user sees: "Stripe is taking longer than usual. We'll email you when it confirms — you can leave this page." With "Refresh status now" button.
  - Webhook never lands (Stripe outage) → polling continues for 5 min then falls back to "Contact us with checkout id `<cs>`" — single link, replies read (per error-frame fallback).
  - Regional check (D20): EU IP → cooling-off waiver checkbox must be ticked at checkout (Stripe Custom Field). Not ticked → block submit with inline explanation.
- **Recovery:** webhook is idempotent (PRD M2 gate); user can refresh, contact support, or retry without double-charge.

### S6 — Connect intake (Optic's 2-step picker, Step 1)

- **Renders:** "What do you have?" → three cards.
  - **GitHub repo** (BYOK + Managed only; CLI users see this option marked locked with "CLI mode reads local folders only — switch modes in Settings"). Clicking opens GitHub App install flow (per-repo permissions only per D1).
  - **Local folder** (CLI only; other modes show locked).
  - **Attested own URL** — free Surface only; paid SKUs can audit third-party URLs with §14.7 attestation.
- **Forward:** selection completes → S7.
- **Back/cancel:**
  - "Back" → S4 (mode picker; useful when user realizes wrong mode).
  - "Skip — explore the dashboard" → /dashboard with intake banner persistent.
- **Data persisted:** `projects` draft row with intake_method + intake_ref (e.g., `repo_id` or `local_path_handle` or attested URL).
- **What can go wrong:**
  - GitHub App install requires the user to authorize an org they don't own → GitHub redirects with `installation_id` for the unowned org → we detect and show: "You picked an org you can't install on. Pick a different org, or ask its admin to install Studio Zero."
  - User pastes a URL we can't reach (private, 404) → handled per error-messages.md §5 "Repo not found" or §4 "Permission denied" depending on cause.
  - User attests a URL they don't own on free tier → §14.7 checkbox + IP/timestamp logged; legal posture per Comply; no UI block at this stage.
- **Recovery:** every option allows reselection without losing the draft project.

### S7 — Depth picker (Optic's 2-step picker, Step 2)

- **Renders:** "How deep?" three options.
  - **Quick** (default, pre-selected, badged "10–15 min") — Optic + Proof + Halo per §9.3.
  - **Comprehensive** (badged "20–45 min, all 6 reviewers + Jury") — one-click upgrade.
  - **Advanced / Custom** (collapsed; expand to pick subset).
- **SKU gating:** Surface SKU caps at Quick or Custom (PRD §9.1). If the intake selected in S6 only supports Surface (e.g., URL-only on free tier) and user picks Comprehensive, a soft warning surfaces: "Comprehensive needs the Code SKU. Upgrade, or run Quick on Surface."
- **Forward:** "Start audit →" → S8.
- **Back/cancel:**
  - "Back" → S6 (intake), draft preserved.
  - "Save and run later" → /dashboard with the draft listed under "Drafts" (always retrievable).
- **Data persisted:** `projects.depth`, `projects.reviewer_subset` if custom.
- **What can go wrong:** depth + intake combo is invalid (e.g., Comprehensive on free Surface) → inline; no run starts.
- **Recovery:** soft warnings always preserve back paths.

### S8 — Live progress

- **Renders per PRD §7.2 Step C + Optic v0.4:**
  - Per-agent rows: agent name, phase chip ("Reading repo", "Running heuristics", "Synthesizing"), partial-finding count, elapsed time.
  - Region wrapper: `aria-live="polite"` + `role="status"` (SC 4.1.3). Throttle ≤ 4 updates/sec (SC 2.2.1).
  - `prefers-reduced-motion` respected (SC 2.3.3): animated chips become static badges.
  - Overall progress bar + ETA based on cohort median.
- **Channel:** Supabase Realtime (websocket). Fallback: long-poll every 5s if websocket fails.
- **Forward:** when Jury emits `final_verdict` event (per §13.3 AuditEvent contract) → S9.
- **Back/cancel:**
  - **"Cancel run"** primary action. Confirmation modal: "Cancel and keep partial findings? You can re-run any time." Buttons: "Keep running" / "Cancel and save partial findings". Per PRD §14.2 partial-result boundary (per-reviewer), Jury composes verdict-equivalent from completed reviewers; if zero reviewers completed, no verdict — run marked `cancelled`.
  - **Browser close mid-run:** the run continues on the server (hosted) or on the user's machine (CLI). Reopening /run/`<run-id>` resumes the live view. No data lost.
  - **CLI mode browser close:** same — CLI keeps running locally; reopening recovers stream.
- **Data persisted:** `runs.state` transitions (queued → dispatched → reviewer_running → reviewer_complete per reviewer → jury_synthesizing → verdict_emitted) — see audit-run-state-machine.md.
- **What can go wrong:** every async event is covered in audit-run-state-machine.md (cancel mid-run, runner-crash, network-disconnect, token-budget-exceeded, CLI-offline-mid-run, browser-close-mid-run).

### S9 — Verdict screen

- **Renders per PRD §7.2 Step D (Herald + Hook + Optic + Halo locked v0.4):**
  - Verdict line (h1, role="status"): "Audit complete · `<VERDICT>`". Color + icon + text per HC1 SC 1.4.1.
  - Score + radar chart with semantic `<table>` fallback (HC3).
  - Primary CTA above the fold (handoff to verdict-to-upsell-loop.md).
  - CLI watermark badge if applicable (D7).
  - Findings checklist below.
- **Forward:** click primary CTA → verdict-to-upsell-loop.md or fix-delivery-prflow.md.
- **Back/cancel:**
  - "Back to dashboard" link in header.
  - "Export the report" (secondary action). Exports JSON + Markdown. Always available — no dead-end if user just wants the data.
  - "Share verdict →" if PASS.
- **Data persisted:** `runs.verdict_emitted_at`, `score_snapshots`, `findings.*`.
- **What can go wrong:**
  - Verdict was FAIL but the customer disagrees → "Dispute Finding" link surfaces; opens dispute path before any chargeback (D20). Goes to billing-and-cancel.md.
  - Verdict was produced with CLI runner whose signature fails verification → render with red banner: "We could not verify this verdict was produced by an unmodified runner. Re-run on hosted infra to verify." Verdict still rendered (D7 is transparency, not enforcement). See cli-pairing-and-tamper.md.
- **Recovery:** terminal state of this flow. Hands off cleanly.

---

## Edge cases

### EC-1 — User signs up with Google OAuth, no email-verify step

**Trigger:** S1 → OAuth → S3 directly (Supabase trusts the provider's email verification).
**What user sees:** S2 is skipped; lands on S3 immediately.
**System does:** `consent_records` still must be captured at S3.
**Recovery:** identical to email-signup path from S3 forward.

### EC-2 — User signs up, never verifies, returns 8 days later

**Trigger:** unverified row purged at 7d.
**What user sees:** sign-in fails ("We can't find an account with that email") → re-signup path.
**System does:** purge job ran; no orphan data.
**Recovery:** treat as fresh signup. No friction.

### EC-3 — User picks BYOK, pastes a valid Anthropic key, but their Anthropic account is suspended

**Trigger:** S5a dry-run returns 403 with `error.type: account_suspended`.
**What user sees:** "Anthropic isn't accepting that key. Check the account, then try again — or switch modes."
**System does:** does not store the key. Logs the failure (key fingerprint only, never the key).
**Recovery:** S5a stays open with help link; user can switch to Managed/CLI from S4.

### EC-4 — Managed user completes Stripe checkout but webhook never lands

**Trigger:** Stripe outage or signing-key mismatch.
**What user sees:** polling indicator times out at 5min → "We confirmed your card was charged but Stripe hasn't pinged us yet. Refresh, or contact us with checkout id `cs_<...>`."
**System does:** retries webhook receipt (Stripe redelivers); reconciles on next successful webhook.
**Recovery:** webhook is idempotent (PRD M2 gate); user is not charged twice; lands on S6 when status flips.

### EC-5 — User connects GitHub repo, then the GitHub App is uninstalled mid-flow

**Trigger:** S6 succeeds, S7/S8 in progress; admin uninstalls app from the org.
**What user sees at S8:** runner fails with "permission_denied" → error-frame §4: "We can't reach this repo right now. Reconnect to refresh access." Two buttons: "Reconnect GitHub →" / "Pick a different repo".
**System does:** run marked `failed` with `recoverable: true`; credit returned per PRD §14.2.
**Recovery:** S6 with intake unset; user can reconnect and resume.

### EC-6 — Browser closed at S8 (mid-run) and reopened on a different device

**Trigger:** S8 cancellation by tab close, then user opens /dashboard on phone.
**What user sees on phone:** runs list shows the run in `running` state; tapping → resumes S8 live view via Realtime channel re-subscribe.
**System does:** runner continues on server (hosted) or local CLI; events buffered for late subscribers.
**Recovery:** seamless cross-device handoff.

### EC-7 — CLI user has CLI offline at S8

**Trigger:** S5b paired ok; CLI process died between S6 and S8.
**What user sees:** S8 shows "Waiting for your CLI…" → after 60s heartbeat-miss: error-frame §1 ("Your CLI isn't connected"). Two buttons: "Show pairing code" / "Switch to BYOK mode".
**System does:** run remains `queued`; never times out the queue while user is in the flow.
**Recovery:** see cli-pairing-and-tamper.md.

### EC-8 — Token-budget exceeded for Managed-tier user mid-run

**Trigger:** runner detects budget cap hit (per-tenant cap, §13.5).
**What user sees at S8:** banner: "This run hit the token budget for `<plan>`. Partial findings saved. Upgrade to continue, or finish on this plan next cycle."
**System does:** run goes to `partial_completed` with reviewers that finished synthesized into a partial verdict (per §14.2 boundary). Findings already gathered are preserved.
**Recovery:** "Upgrade →" goes to S5c-equivalent inside the app; "View partial findings →" goes to S9 with partial-verdict badge.

---

## Acceptance criteria (binary, testable)

**Happy path (Goal 1 per PRD §4):**

- **Given** a fresh email and an active Anthropic API key,
- **When** the user completes signup → email verify → BYOK key + dry-run → GitHub App install on a public repo → Quick depth → start audit,
- **Then** within 8 minutes simulated runtime, the user reaches S9 with `verdict ∈ {FAIL, PASS WITH FIXES, PASS}` and `findings.length > 0` and the run row's terminal state is `verdict_emitted`.

**Unhappy 1 — invalid BYOK key:**

- **Given** S5a is reached with a syntactically-valid but rejected Anthropic key,
- **When** the user clicks "Verify & save",
- **Then** an inline error in plain copy is shown, the key is not persisted, and the user remains on S5a with the input value intact and the "Back" + "Skip" options still operable.

**Unhappy 2 — Stripe webhook delayed > 60s:**

- **Given** S5c Stripe Checkout returns success,
- **When** the webhook is delayed beyond 60s,
- **Then** the polling page shows the "taking longer than usual" copy without redirecting the user away, and reconciliation completes correctly when the webhook finally lands (no double-charge, no duplicate `subscriptions` row).

**Unhappy 3 — browser closed during S8:**

- **Given** an audit is at S8 with at least one reviewer in `running` state,
- **When** the user closes the tab and re-opens the run from /dashboard within 30 minutes,
- **Then** S8 resumes from the current state with no lost partial findings, and the run reaches S9 normally.

**Unhappy 4 — GitHub App uninstalled mid-flow:**

- **Given** a GitHub-repo intake at S8,
- **When** the org admin uninstalls the Studio Zero GitHub App,
- **Then** the run fails with `recoverable: true`, the user sees error-frame §4 copy, and a "Reconnect GitHub →" path returns them to S6 with no data lost.

**Unhappy 5 — CLI offline at S8:**

- **Given** a CLI-mode run at S8 with paired CLI,
- **When** the CLI process exits unexpectedly,
- **Then** within 60s the UI shows the "Your CLI isn't connected" message with both "Show pairing code" and "Switch to BYOK mode" affordances, and the run remains `queued` for resume.

---

## Open questions

- **OQ-1 (for Optic):** the S4 mode picker has three cards + a "Skip for now" link = 4 surfaces. Optic's heuristic budget allows this, but does the "Skip" surface fragment the conversion funnel? Hook should A/B this against a forced-pick variant in Phase 4 prototype.
- **OQ-2 (for BigBrain):** PRD §14.4 says cookie consent must be gated at first visit, but the cookie consent banner in S3 is the *second* page (post email-verify). Is pre-auth analytics OK if it's anonymous + opt-in-only, or do we need a consent banner at S0/S1 too? Comply should confirm.
- **OQ-3 (for Optic + Pixel):** S2.5 (expired-link recovery) is a substate of S2 — should it be a distinct route (`/verify/expired`) or an inline modal on S2? Inline preserves form context; distinct route is more shareable. Recommend inline; flag for visual-design review.
- **OQ-4 (for Sprint):** does S5a's dry-run call cost the customer a token? At 1 token max it's negligible, but it's a customer cost on a flow they expect to be free until they hit "Start audit". Recommend disclosing in help-text; flag for Penny/Sprint.
- **OQ-5 (for Comply):** S3 AUP attestation — does it satisfy §14.7 URL-audit authorization for the free-tier own-URL attestation, or do we need a *second* attestation at S6 for URL intake? Recommend two attestations; the §14.7 one is contextual.
