# Flow: Verdict to Upsell Loop

**Owner:** Trace
**Personas affected:** all §5 personas; the loop is where the product monetizes. Free signups → Code SKU; Code SKU → Auto-PR (V1.5).
**Mode applicability:** all three. Upsell mechanics identical; copy and watermark differ for CLI per D7.
**Acceptance test:** `tests/acceptance/e2e/verdict-upsell-conversion.spec.ts` + `tests/acceptance/integration/stripe-idempotency.spec.ts` (PRD §18 + M2 gate).
**PRD references:** §4 Goal 1, §6.3 lifecycle emails E1–E5, §7.2 Step D verdict screen, §11 fix delivery, §12 pricing, §15 success metrics (Code-audit upgrade attach rate > 20%), §17 D2 (free tier unlimited Surface re-audits), D3 (Auto-PR V1.5), D20 (regional refund matrix).

---

## State diagram (ASCII)

```
                  ┌───────────────────────┐
                  │ V0  Verdict emitted   │  entry from audit-run-state-machine.md
                  │ FAIL / PASS W/ FIXES /│
                  │ PASS                  │
                  └───────────┬───────────┘
                              │ verdict + current SKU determines branch
                              ▼
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       │ FAIL or              │ FAIL or PWF on       │ PASS
       │ PWF on Surface SKU   │ Code/Full SKU        │
       │ (free or paid)       │                      │
       ▼                      ▼                      ▼
 ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
 │ V1a Surface →  │   │ V1b Code →     │   │ V1c PASS       │
 │ Code upsell    │   │ Auto-PR upsell │   │ celebration    │
 │ "Run the Code  │   │ (V1.5 only)    │   │ "Share verdict"│
 │ audit →"       │   │ "Ship the      │   │                │
 │                │   │ fixes — $49 →" │   │                │
 └────────┬───────┘   └────────┬───────┘   └────────┬───────┘
          │                    │                    │
          │ click              │ click              │ click
          ▼                    ▼                    ▼
 ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
 │ V2a Plan       │   │ V2b Auto-PR    │   │ V2c Share      │
 │ comparison +   │   │ checkout       │   │ surface (gen   │
 │ Stripe Checkout│   │ (V1.5; see     │   │ shareable link │
 │ (Code SKU)     │   │ fix-delivery)  │   │ + OG image)    │
 └────────┬───────┘   └────────────────┘   └────────────────┘
          │ webhook: paid                             │
          ▼                                           │
 ┌────────────────┐                                   │
 │ V3a Re-intake  │ (auto-prefill from prior run)     │
 │ confirm        │                                   │
 └────────┬───────┘                                   │
          │ start                                     │
          ▼                                           │
 ┌────────────────┐                                   │
 │ V4 Run         │ ← runs through                    │
 │ (state machine)│   audit-run-state-machine.md      │
 └────────┬───────┘                                   │
          │                                           │
          ▼                                           ▼
 ┌────────────────┐                          (terminal: share or
 │ V5 New verdict │ ← loop back to V0                 dashboard)
 └────────────────┘   (closes the loop)

  ── side channel: lifecycle email E2 (FAIL) / E3 (PWF) re-enter V1a/V1b ──
  ── side channel: refund-on-failed-PR (V1.5) returns to V0 with credit ──
```

---

## States

### V0 — Verdict emitted (entry)

- **Renders:** verdict screen per PRD §7.2 Step D + signup-to-first-verdict.md S9.
- **Forward:** primary CTA branches by `(verdict, current_sku)`:
  - `(FAIL | PASS WITH FIXES) × Surface` → V1a CTA: `"Run the Code audit →"` (locked Herald, sample 02 §2).
  - `(FAIL | PASS WITH FIXES) × (Code | Full)` MVP (pre-V1.5) → secondary CTA `"See every finding →"` (V1.5: replaced with `"Ship the fixes — $49 →"` → V1b).
  - `PASS × any` → V1c CTA: `"Share this verdict →"`.
- **Back/cancel:**
  - "Back to dashboard" always available.
  - "Export the report" always available (Markdown + JSON).
  - "Re-audit free for 30 days →" available on PASS WITH FIXES per sample 02 §3.
- **Data persisted:** verdict, score, findings already final from run state machine.
- **What can go wrong:**
  - CTA mismatch (e.g., Surface customer somehow sees the Auto-PR button) — guarded by server-side SKU check on render. Test gate: snapshot tests per SKU × verdict cell.
  - Verdict was produced by CLI runner whose signature failed verification → see cli-pairing-and-tamper.md V0' variant: same screen with extra red banner; primary CTA still shown but a "Re-run on hosted to verify" link surfaces.

### V1a — Surface → Code upsell card

- **Renders:** the existing verdict screen IS the upsell surface. No modal, no redirect. Primary CTA on the FAIL/PWF screen *is* the upsell.
  - Secondary copy near the CTA per error-messages.md §2 frame: "The Code audit reads your source — it finds 3 to 5 times as many issues."
  - Free-tier user sees benefit-specific copy: "Code is part of BYOK Starter and above."
- **Forward:** click "Run the Code audit →" → V2a.
- **Back/cancel:**
  - "Stay on free Surface" link (per error-messages.md §2). Returns to verdict in idle state.
  - "Run another Surface audit on this project →" (free tier unlimited per D2). Returns to S6/S7 of signup flow with intake prefilled.
- **Data persisted:** click event tracked (`upsell_clicked`, consent-gated PostHog).
- **What can go wrong:**
  - User clicks but bounces from Stripe → back to V1a state on return (no charge); state preserved.
  - User on free tier wants Code without paying → cannot; the gate is the gate.
- **Recovery:** unlimited Surface re-audits per D2 means the free tier never dead-ends. The customer can re-run forever and the upsell card surfaces every time.

### V1b — Code/Full → Auto-PR upsell (V1.5 ONLY — MARKED DEFERRED)

> **STATUS: V1.5. Per PRD D3, Auto-PR fix delivery is deferred from MVP. MVP behavior of this state is null — the CTA does not render until V1.5 ships.**

- **Renders (V1.5):** primary CTA `"Ship the fixes — $49 →"` per sample 02 §2 V1.5 lock. Below: list of fixable findings (those with `auto_pr_eligible: true`), per-finding ICE-style upgrade preview if Hook + Scout tiered pricing wins (D5 still open).
- **Forward (V1.5):** click → V2b → fix-delivery-prflow.md.
- **Back/cancel:**
  - "Run a re-audit on this project →" (unchanged).
  - "I'll apply the fixes myself" link → dismisses the V1b card; verdict screen idle.
- **Data persisted:** V1.5 only.
- **What can go wrong:** D3 ships; D5 pricing still open at MVP. Pricing rendered correctly per CT-flow.

### V1c — PASS celebration

- **Renders:** PASS verdict per PRD §7.2 Step D (aqua #14C8CC, restrained per Herald §6 "restrained pride, not confetti").
  - Body copy (Herald-locked): "Audit complete · PASS. Your project clears the Strict Elite gate." No exclamation marks.
  - Primary CTA: `"Share this verdict →"`.
  - Secondary: "Re-audit any time. The next change might shift the score."
- **Forward:** click → V2c.
- **Back/cancel:**
  - "Back to dashboard" always.
  - "Export the report" always.

### V2a — Plan comparison + Stripe Checkout

- **Renders:** plan-comparison table (HC7 semantic `<table>` with `<th scope>`). Three plans relevant to upgrade:
  - BYOK Starter $29/mo (D4 open) — 2 audits/mo, specs-only
  - BYOK Pro $79/mo — unlimited audits, specs-only, priority queue
  - Managed Pro $249/mo — unlimited Full + Auto-PR (V1.5)
  - CLI mode $19/mo (for privacy-sensitive users)
- Each row: "Pick →" button → Stripe Checkout (hosted; HC6).
- Above-the-table: "Continue with free Surface" link — never dead-end on the upsell.
- **Forward:** plan picked → Stripe Checkout → webhook `checkout.session.completed` → V3a.
- **Back/cancel:**
  - "Back to verdict" → V0.
  - Stripe's built-in Cancel returns to `/billing/cancel` → "Checkout cancelled. Pick a plan or stay on free." → V2a.
- **Data persisted:** `billing_events`, `subscriptions` (status: incomplete → active on webhook).
- **Async during webhook lag:** as in signup-to-first-verdict.md S5c. Polling page; webhook is truth.
- **What can go wrong:**
  - **Free-tier user signs up, takes Code, runs once, then downgrades** — see billing-and-cancel.md downgrade path.
  - **D20 regional checks:** EU IP requires 14-day cooling-off waiver checkbox (Stripe Custom Field). Not checked → block. Detailed in billing-and-cancel.md.
  - Card declined → Stripe form; on giveup → V2a with banner.
  - User has existing subscription → V2a renders as upgrade-not-new (no Stripe redirect; in-app prorate). See billing-and-cancel.md upgrade.

### V2b — Auto-PR checkout (V1.5)

See fix-delivery-prflow.md. Marked deferred.

### V2c — Share surface

- **Renders:** shareable URL `studio-zero.com/v/<short-id>` (read-only, public, no auth) + OG image generator + copy: "Share on X" / "Copy link" / "Embed badge". Optional toggle: "Show score only" vs "Show findings". Default: score only (privacy posture).
- **Forward:** copy link / share button.
- **Back/cancel:** "Back to verdict" always. "Unshare" toggle remains in Settings.
- **Data persisted:** `share_tokens` (short_id, run_id, public_view, expires_at nullable).
- **What can go wrong:** customer changes their mind → "Unshare" in Settings revokes the short_id immediately (404 to public).

### V3a — Re-intake confirm (post-checkout)

- **Renders:** "Welcome to `<plan_name>`. Run the Code audit on `<previous_intake>`?" with intake summary + depth picker.
- **Forward:** "Start audit →" → V4 (audit-run-state-machine.md `created` state).
- **Back/cancel:**
  - "Pick a different repo" → S6 of signup flow.
  - "Run later" → /dashboard with new plan active.
- **Data persisted:** new `projects` + `runs` rows.
- **What can go wrong:** intake from prior run is no longer reachable (GitHub App uninstalled, folder moved) → V3a falls back to S6 with error explained.

### V4 — Run (re-audit)

Per audit-run-state-machine.md. No new states; this is the re-entry of the run state machine.

### V5 — New verdict (loop closes)

Same as V0 with `runs.parent_run_id` set to enable score-trend rendering: "You moved from 62 to 81." Loop closes; flow can recur.

---

## Edge cases

### EC-1 — Free-tier user signs up, runs unlimited Surface re-audits (D2)

**Trigger:** every Surface re-audit on the same project lands on V0 → V1a card.
**What user sees:** the same upsell card every time. Per D2 + Hook ICE 30/30, this is intentional: the audit→fix→re-audit loop is the activation engine.
**System does:** rate-limit per §12 free-tier safeguards (50 runs/24h per project; flagged abuse > that).
**Recovery:** unbounded; the customer can churn forever.

### EC-2 — Code SKU upgrade from Surface

**Trigger:** free-tier customer hits V1a, clicks "Run the Code audit →" → V2a → picks BYOK Starter → webhook lands → V3a → V4 starts.
**What user sees:** seamless. Project intake auto-prefills; depth picker now offers Comprehensive.
**System does:** `subscriptions.status = active`, prior `runs` retained for trend comparison.
**Recovery:** if user wants to revert to free → billing-and-cancel.md downgrade path; existing Code runs remain viewable until retention expiry (§14.4).

### EC-3 — V1.5 Auto-PR purchase, fix-delivery flow

See fix-delivery-prflow.md.

### EC-4 — Refund on failed PR (V1.5 + D20)

**Trigger:** customer bought Auto-PR; build agents generated fixes; Jury re-audit FAILED on the generated branch; PR was **not** opened (per PRD §11.2 hard rule).
**What user sees:** verdict screen of the re-audit (the one that failed) + banner: "We didn't open this PR — it didn't pass our own re-audit. Your $49 is on its way back. Want a different fix attempt or want to apply the recommendations yourself?"
**System does:** auto-refund via Stripe (idempotent per M2 gate); `fix_pr_jobs.refunded_at` set; `billing_events` ledger row.
**Recovery:** customer is on V0 of a new verdict, with a refund credit confirmed in the UI and email. Loop continues; no money lost.

### EC-5 — Customer attempts to share a CLI-mode verdict (D7 watermark)

**Trigger:** click "Share this verdict →" on a PASS produced by CLI.
**What user sees:** share preview includes `Private Run · Self-Audited` watermark + Halo's a11y help-text per D7. Optional toggle: "Hide the Private Run badge" → blocked with explanation: "We can't strip the watermark — it's the transparency contract for CLI verdicts."
**System does:** OG image includes the watermark; public view page renders the watermark.
**Recovery:** customer who wants a non-watermarked share must re-run on hosted infra (BYOK or Managed).

### EC-6 — Customer disputes a FAIL verdict (pre-chargeback path, D20)

**Trigger:** "Dispute Finding" link on V0.
**What user sees:** dispute form: "Which findings? Why?" → submit → "We'll review within 5 business days. While we review, your audit credit is on hold; no charge to your card." Goes to billing-and-cancel.md dispute path.
**System does:** `disputes` row; payment hold (Stripe radar review); Comply + Jury manual review.
**Recovery:** dispute resolved → either refund (verdict honored as dispute-won) or upheld (no refund; explanation provided). The pre-chargeback path is offered per D20 to avoid the customer going straight to Visa.

### EC-7 — User on PASS celebrates, then runs again later, scores LOWER

**Trigger:** V5 verdict is FAIL or PWF, prior verdict was PASS.
**What user sees:** verdict + score-trend chart: "You went from 95 to 71. Here's what changed." Findings diffed against prior run.
**System does:** `runs.parent_run_id` chained; diff computed.
**Recovery:** standard FAIL flow; the trend chart is the emotional anchor.

### EC-8 — Email E2 (FAIL upsell) lands; customer clicks; arrives on a re-audited PASS

**Trigger:** customer ran a re-audit between E2 send and click; new run PASSED.
**What user sees:** email link goes to the current latest verdict (deep-link by run_id, not project_id; latest-verdict redirect is the fallback). Customer arrives on V1c (PASS), not V1a (FAIL upsell).
**System does:** the upsell link doesn't fire for an already-PASS state; PostHog event `email_arrived_on_pass` to allow Hook to A/B "send" vs "skip" of E2 on already-passed projects.
**Recovery:** customer sees their PASS. No dissonance.

### EC-9 — Customer clicks "Share this verdict" on a PASS, then later realizes the share included findings they don't want public

**Trigger:** V2c share toggle was set to "Show findings" not "score only".
**What user sees:** in Settings, "Manage shared verdicts" → revoke or change visibility. See settings-and-account-management.md.
**System does:** revocation immediate; cached OG images expire on next render.
**Recovery:** undoable; no permanent leak (no archive.org of OG generator output beyond the user's control — flag for Comply OQ).

---

## Acceptance criteria (binary, testable)

**Happy — Surface→Code upgrade conversion:**
- **Given** a free-tier user lands on V0 with a FAIL verdict on a Surface audit,
- **When** they click "Run the Code audit →", complete Stripe Checkout, and start the re-audit,
- **Then** their subscription transitions to active, the new run is enqueued, and the new verdict at V5 renders with `runs.parent_run_id` set to the original run.

**Unhappy 1 — free-tier unlimited re-audit loop (D2):**
- **Given** a free-tier user has run 12 Surface audits in 24h on the same project,
- **When** they trigger a 13th audit,
- **Then** the audit starts normally (D2: unlimited), the V1a upsell renders on every verdict, and rate-limit only fires above the §12 abuse threshold.

**Unhappy 2 — V1.5 Auto-PR re-audit FAILS, refund auto-issues:**
- **Given** a V1.5 customer purchased Auto-PR and Jury re-audit on the generated branch FAILS (per PRD §11.2),
- **When** the run reaches `verdict_emitted` with `FAIL`,
- **Then** no PR is opened, a Stripe refund is issued idempotently within 5 minutes, the customer sees the EC-4 banner, and `fix_pr_jobs.refunded_at` is set.

**Unhappy 3 — share toggle revoke is immediate:**
- **Given** a public share at `studio-zero.com/v/<short_id>`,
- **When** the owner clicks "Unshare" in Settings,
- **Then** the URL returns 404 within 5s and the OG image cache is invalidated.

**Unhappy 4 — dispute path defers chargeback (D20):**
- **Given** a customer clicks "Dispute Finding" on V0,
- **When** the dispute form is submitted,
- **Then** Stripe payment is placed on hold via radar review, a `disputes` row is created, and the customer is informed of the 5-business-day SLA; this happens before any chargeback could be filed.

---

## Open questions

- **OQ-1 (for Hook + Optic):** the V1a card *is* the verdict screen — there's no separate upsell modal. Is the upsell strong enough at this position, or does a 2-second-delayed modal "Most Surface FAILs find more in Code — try it free for 7 days?" lift conversion? Hook ICE the variants.
- **OQ-2 (for Comply):** EC-9 (revoked share) — does archive.org or other caches preserve the OG image beyond our control? Comply should specify the retention warning we owe the customer at share time.
- **OQ-3 (for Hook + Penny):** D4 (Starter pricing $19 vs $29) directly affects the V1a → V2a conversion rate. Recommend V2a renders an A/B-able price for the first 200 signups per D4 fallback. Flag for Sprint.
- **OQ-4 (for BigBrain):** EC-6 dispute path — does the dispute SLA stop the lifecycle email sequence? An E3 email "Re-audit free →" landing while a dispute is open would be tone-deaf. Recommend pause-on-dispute.
- **OQ-5 (for Stream):** EC-8 email → already-PASS — the email link must deep-link to the latest verdict, not the verdict at email-send time. Confirm with Stream that the redirect handles `run_id` deprecation gracefully when retention archives.
