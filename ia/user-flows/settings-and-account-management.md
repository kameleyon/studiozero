# Flow: Settings & Account Management

**Owner:** Trace
**Personas affected:** all §5 personas. Settings is the de-facto control panel for every mode-switch, key-rotation, consent change, and account-lifecycle action.
**Mode applicability:** all three; sub-pages render conditionally per mode.
**Acceptance test:** `tests/acceptance/e2e/settings-keyboard-only.spec.ts` (Halo HC5 + WCAG 2.4.11/2.4.13) + `tests/acceptance/integration/gdpr-export.spec.ts` + `tests/acceptance/e2e/account-delete-30day.spec.ts`.
**PRD references:** §6.1 (settings panels MUST satisfy WCAG 2.2 AA), §13.4 secret handling, §14.4 retention & GDPR Art. 15/17/20, §14.5 compliance, §14.6 a11y addenda HC5/HC6/HC7, §17 D1 (GitHub App per-repo), Decision #93 30-day deletion window (BUILD_FLOW context).

---

## State diagram (ASCII)

```
                  ┌───────────────────────┐
                  │ S-NAV  Settings home  │  left rail / accordion
                  └───────────┬───────────┘
                              │ pick a sub-page
       ┌──────────┬──────────┬┴────────┬──────────┬──────────┬──────────┐
       ▼          ▼          ▼         ▼          ▼          ▼          ▼
   S-KEY     S-CLI      S-GH       S-BILL     S-RET      S-CONS     S-DATA
   API key   CLI pair   GitHub     Billing    Retention  Consent    Data
   (BYOK)    (CLI)      App reauth (Stripe)   override   (cookie +  (export +
                                                         AI train)   delete)
       │
       └─── S-NOTIF / S-PROFILE / S-TEAM (V2)
                                                              │
                                                              ▼
                                            ┌────────────────────────────┐
                                            │ S-DEL  Delete account      │
                                            │ reauth + 30-day grace      │
                                            │ window per #93             │
                                            └────────────────────────────┘
```

Every sub-page is independently reachable from S-NAV with breadcrumb-back affordance to S-NAV. Every destructive action has a confirm + undo where possible.

---

## States

### S-NAV — Settings home

- **Renders:** left-rail nav at desktop; accordion at mobile (320px reflow per SC 1.4.10). Sections: API key (BYOK), CLI pairing, GitHub App, Billing, Retention, Consent, Data, Notifications, Profile, Team (V2 stub).
- **Forward:** click any section.
- **Back/cancel:** "Back to dashboard" in header (persistent breadcrumb).
- **Data persisted:** N/A — landing.

### S-KEY — API key (BYOK)

- **Renders per HC5:** masked current-key indicator ("Key on file: `sk-ant-…-xxxx` · last verified 2026-05-09"), "Rotate key" button, "Remove key" button.
- **Forward:**
  - "Rotate key" → input field (autocomplete=off, show/hide, paste, password-manager friendly per SC 3.3.8) → "Verify & save" → dry-run + encrypt + replace. Old key zeroized.
  - "Remove key" (destructive) → confirm modal: "Remove your Anthropic key? Audits in BYOK mode will fail until you add a new one. You can still run on Managed or CLI." Buttons: "Yes, remove" / "Keep it" (sample 02 §5 convention).
- **Back/cancel:** breadcrumb back to S-NAV.
- **Data persisted:** `api_keys` row updated (encrypted ciphertext only).
- **What can go wrong:**
  - Rotate-with-invalid-key → inline error; old key remains intact until new key verifies.
  - Remove-while-run-in-flight → "You have 2 audits running on BYOK. Wait for them to finish, or cancel them first." with "View running audits →" link.
- **Recovery:** every error preserves prior state.

### S-CLI — CLI pairing management

- **Renders:** list of paired CLI devices: hostname, paired_at, last_seen, status (online / offline). Per device: "Revoke" button. "Pair another device" CTA.
- **Forward:**
  - "Pair another device →" → cli-pairing-and-tamper.md pairing flow.
  - "Revoke" (destructive) → confirm: "Revoke this device's access? Any audit running on it will be cancelled." Buttons: "Yes, revoke" / "Keep it".
- **Back/cancel:** breadcrumb back.
- **Data persisted:** `cli_pairings.revoked_at` set on revoke.
- **What can go wrong:**
  - Revoke last paired device while CLI mode is the active mode → warning: "This is your only paired CLI. Revoke anyway?" with mode-switch suggestion.
  - User revokes the device they're paired from → next CLI heartbeat fails; CLI prints "This device was revoked from your account at <ts>. Re-pair with `studio-zero login`."
- **Undo:** revoke is reversible within 5 minutes ("Undo revoke" toast); after 5 min, must re-pair.

### S-GH — GitHub App reauthorization

- **Renders:** list of GitHub Apps installed (per-repo per D1): org/user, install date, repos covered, "Manage on GitHub →", "Disconnect" button.
- **Forward:**
  - "Manage on GitHub →" opens GitHub's install-management page (external).
  - "Disconnect" (destructive) → confirm: "Disconnect this GitHub installation? Audits on its repos will pause until reconnected." Buttons: "Yes, disconnect" / "Keep it".
  - "Connect a new GitHub org/repo →" → GitHub App install flow.
- **Back/cancel:** breadcrumb back.
- **Data persisted:** `oauth_tokens` revoked on disconnect.
- **What can go wrong:**
  - GitHub-side uninstall (customer goes to GitHub, removes app) → S-GH shows "Installation no longer detected on GitHub" with a "Reconnect" CTA.
  - Reconnect for a different org → treated as new install (new `oauth_tokens` row).

### S-BILL — Billing

- **Renders:** current plan, next billing date, payment method (last 4), invoice history, "Change plan", "Update payment method", "Cancel subscription".
- **Forward:**
  - "Change plan" → plan picker (upgrade / downgrade — see billing-and-cancel.md).
  - "Update payment method" → Stripe Customer Portal (HC6 hosted).
  - "Cancel subscription" (destructive) → confirm with D20 regional copy (see billing-and-cancel.md S-CANCEL).
- **Back/cancel:** breadcrumb back.
- **What can go wrong:** see billing-and-cancel.md edge cases.

### S-RET — Retention override

- **Renders:** explanation of default retention (§14.4: code 7d default; findings 24mo; audit logs 7y). Slider for code retention: 0–30 days. Toggle: "Delete code immediately after each run" (= 0 days).
- **Forward:** "Save changes" → updates `tenants.retention_days_code`.
- **Back/cancel:** breadcrumb back; "Reset to default (7 days)" button.
- **Data persisted:** `tenants.retention_days_code` int 0–30.
- **What can go wrong:**
  - Customer sets retention = 0 with a run in flight → "We'll delete this run's code as soon as it finishes." (Doesn't break the run.)
  - Customer sets retention = 30 with 28 days of code already stored → countdown resets only for new runs; existing code uses the prior policy (Comply: no retroactive extension without explicit consent).
- **Recovery:** all changes reversible up to the deletion event; once deleted, code is gone (cryptoshredded per §13.4).

### S-CONS — Consent preferences

- **Renders:** three toggles + explanation per GDPR + ePrivacy + UK PECR (§6.1) + EU AI Act §14.5 + CA SB 942:
  - **Necessary cookies** (always on, disabled-toggle, explained).
  - **Analytics cookies** (toggle).
  - **Marketing cookies** (toggle).
  - **AI training opt-in** (toggle, default OFF, explained: "Allow Studio Zero to use your run data to improve our reviewers. We never train on your code itself.").
- **Forward:** "Save preferences" → `consent_records` row with timestamp + IP + user_agent (Comply Art. 7(1)).
- **Back/cancel:** breadcrumb back; "Reset to defaults" (all opt-out except necessary).
- **What can go wrong:**
  - Customer toggles off analytics mid-session → PostHog instance disabled at next page load (no further events fire; buffered events purged).
  - Customer toggles AI-training off after months of opt-in → only affects future data; prior contributions to training already happened (per Comply, retroactive removal not feasible).
- **Recovery:** all toggles reversible at any time.

### S-DATA — Data export + delete

- **Renders:** two cards:
  - **"Export your data"** (Art. 20): JSON export of profile + runs + findings + verdicts + billing events. Button: "Generate export". Builds in background; emailed when ready (typical < 5 min). History of past exports shown.
  - **"Delete your account"** (Art. 17): "Delete everything. This starts a 30-day grace window during which you can recover the account." Button: "Start deletion →".
- **Forward:**
  - Export: generates a signed download URL (expires 24h). User downloads the JSON.
  - Delete: → S-DEL confirmation flow.
- **Back/cancel:** breadcrumb back.
- **Data persisted:** `data_exports` row with status (pending → ready → downloaded).
- **What can go wrong:**
  - Export takes > 30 minutes (large account) → email when ready; no UI dead-end.
  - Export download URL expires before user clicks → "Generate a new export" button always visible.

### S-DEL — Delete account (with reauth + 30-day window)

- **Renders:** multi-step confirm with friction:
  - Step 1: "Delete your account?" — explains 30-day grace, what's deleted vs retained (audit logs 7y per §14.4, billing events 7y).
  - Step 2: reauth — type your email or re-enter password (or OAuth re-confirm).
  - Step 3: type the literal string "DELETE" to confirm (Hick's-friendly explicit confirm).
  - Step 4: "Account scheduled for deletion. We'll email you a final confirmation in 30 days. Until then, log back in and click Cancel deletion."
- **Forward:** all 4 steps complete → `users.deletion_scheduled_at = now()`, account marked but data retained.
- **Back/cancel:** at every step, "Cancel" returns to S-DATA. At Step 4, "Cancel deletion" link in email + persistent banner in app.
- **Data persisted:** `users.deletion_scheduled_at`, `users.deletion_executes_at = now() + 30 days`.
- **What can go wrong:**
  - User logs in within 30 days → banner: "Your account is scheduled for deletion on `<date>`. Cancel deletion?" One-click cancel.
  - User logs in after 30 days → "We can't find an account with that email." (Same as a never-signed-up user.)
  - User has open billing or unresolved dispute → deletion enters `paused_pending_billing` state; user notified; resumes when billing settled.
  - User has shared verdicts (V2c) → public URLs revoked at the start of the grace window; downloadable export still generated.
- **Recovery:** any time within 30 days → undo. After 30 days → re-signup permitted with same email; no data restored.

### Cross-cutting destructive-action pattern

All destructive actions in Settings follow this pattern:

1. **Action button** with trailing ellipsis (sample 02 §5 convention): "Delete project…", "Remove key", "Disconnect", "Cancel subscription".
2. **Confirmation modal** with:
   - Heading naming the object: "Delete project `<name>`?"
   - Body naming the consequences in plain language: what's gone, what's kept.
   - Two buttons: primary danger-styled "Yes, delete" + secondary safe "Keep it" (sample 02 §5).
3. **Post-action toast** with "Undo" affordance where possible (5-minute window for soft-deletes; not available for cryptoshredded code).
4. **Reauth prompt** for account-lifecycle actions (S-DEL) and key rotation (S-KEY) — but not for low-stakes actions (consent toggle, retention slider).

---

## Edge cases

### EC-1 — Concurrent mode switch (BYOK → CLI)

**Trigger:** user in BYOK mode pairs a CLI device in S-CLI.
**What user sees:** S-CLI shows pairing success; mode in S-NAV header remains BYOK; user can switch active mode at S-NAV → "Active mode: BYOK" dropdown to select.
**System does:** `tenants.mode_pref` updated only on explicit dropdown change; pairing CLI alone doesn't switch modes.
**Recovery:** mode-switch is reversible; in-flight runs continue on whichever mode dispatched them.

### EC-2 — User exports data, then deletes account

**Trigger:** S-DATA → export ready → delete initiated.
**What user sees:** export download URL remains valid for 24h regardless of deletion-scheduled state (per GDPR Art. 20 right-of-portability survives Art. 17).
**System does:** export file retained for the 24h URL window even if account is in grace.
**Recovery:** customer always gets their data even if they're walking out the door.

### EC-3 — GitHub App disconnect with in-flight build (V1.5)

**Trigger:** S-GH disconnect while a `fix_pr_jobs` is in P3.
**What user sees:** disconnect confirm modal warns: "1 fix-build is running on this repo. Disconnecting will pause it." Buttons: "Disconnect anyway" / "Wait for the build to finish".
**System does:** if user proceeds, build pauses per fix-delivery-prflow.md EC-4.
**Recovery:** reconnect resumes within 30 min; after that, refund.

### EC-4 — Consent change mid-run (AI training opt-out)

**Trigger:** user toggles AI-training OFF in S-CONS while a run is in `reviewers_running`.
**What user sees:** "Future runs respect your new preference. This run continues with your prior consent." No interruption.
**System does:** consent state for an in-flight run is fixed at run start (snapshot in `runs.consent_snapshot`).
**Recovery:** customer has a clear forward path; no surprise.

### EC-5 — User schedules deletion, then a friend pays for their account (gift)

**Trigger:** S-DEL initiated → friend purchases gift subscription using same email.
**What user sees:** gift purchase is rejected: "This email is scheduled for deletion. Cancel the deletion first, or use a different email."
**System does:** account-creation rejected for `deletion_scheduled_at` non-null users.
**Recovery:** customer cancels deletion → friend re-attempts gift → success.

### EC-6 — User exports data, file is huge, email-link expires

**Trigger:** large export (e.g., 1GB of run history) → URL expires before download.
**What user sees:** S-DATA → "Generate a new export" → background regeneration. Old export remains accessible for 90 days in `data_exports` history; click "Re-issue URL" to get a fresh signed URL on the same file.
**System does:** export files retained 90d; signed URLs rotate.
**Recovery:** no dead-end.

### EC-7 — Multi-tab settings conflict

**Trigger:** user opens S-CONS in two tabs; toggles analytics off in tab A; tab B still shows analytics on.
**What user sees:** tab B's "Save" overwrites tab A's change → confusion.
**System does:** S-CONS save endpoint uses optimistic concurrency with `consent_records.updated_at` ETag; second save with stale ETag returns 409 → tab B refreshes and shows current.
**Recovery:** standard last-write-wins-with-conflict-detection pattern.

### EC-8 — User deletes account, then 31 days later regrets it

**Trigger:** grace window expired; cryptoshredding executed.
**What user sees:** "We can't find an account with that email." (per EC of S-DEL).
**System does:** data is mathematically destroyed (per §13.4 cryptoshredding).
**Recovery:** customer can re-signup fresh; no data restored.

### EC-9 — Customer revokes consent for AI training; we need to also stop using their data in already-trained models

**Trigger:** S-CONS AI-training toggle off.
**What user sees:** "Future runs won't be used for model improvement. We can't remove your data from models that have already been trained — see our AI System Card for details."
**System does:** opt-out flag set; downstream training pipelines (Comply-defined) exclude their tenant_id.
**Recovery:** Comply's AI System Card (PRD §14.5) explains the limit honestly.

---

## Acceptance criteria (binary, testable)

**Happy — key rotation:**
- **Given** a BYOK customer with a valid key on file,
- **When** they paste a new key and click "Verify & save",
- **Then** the new key's dry-run succeeds, the encrypted `api_keys` row is updated, the prior ciphertext is overwritten/zeroized, and a confirmation toast renders.

**Unhappy 1 — destructive action keyboard-only (HC5 + SC 2.1.1):**
- **Given** the S-KEY page is open,
- **When** the user navigates to "Remove key", presses Enter, then Tab to "Yes, remove" and Enter,
- **Then** the action fires without mouse input, focus moves to the success toast, and focus is not obscured (SC 2.4.11).

**Unhappy 2 — GDPR Art. 20 export completes:**
- **Given** an account with 50 runs of history,
- **When** the user clicks "Generate export",
- **Then** within 5 minutes a JSON export is available at a signed URL, contains profile + runs + findings + verdicts + billing events, and is valid against the export schema.

**Unhappy 3 — 30-day delete grace window works:**
- **Given** a user initiates account deletion at T,
- **When** they log in at T+15 days,
- **Then** the banner "Cancel deletion?" appears, one-click cancel restores the account to active, and `users.deletion_scheduled_at` is cleared.

**Unhappy 4 — 30-day delete grace expires, account is gone:**
- **Given** a user initiated deletion at T and never returned,
- **When** the deletion job runs at T+30 days,
- **Then** account is cryptoshredded, audit logs are retained (7y per §14.4), billing events are retained (7y), and the user's email becomes available for fresh signup with no data restoration.

---

## Open questions

- **OQ-1 (for Optic):** S-NAV at mobile (320px) — left-rail collapses to accordion. Should accordion default to *all collapsed* or *first section open*? Recommend first-section-open to avoid the empty-state-feel.
- **OQ-2 (for Comply):** EC-2 — export survives Art. 17 deletion for 24h. Confirm this is Art. 20 right-of-portability-compliant; some lawyers argue export must finish *before* deletion is scheduled.
- **OQ-3 (for Comply + Herald):** S-CONS AI-training toggle copy — "We never train on your code itself" is a load-bearing claim. Recommend: substantiation file at `marketing/claims-substantiation/claim-no-code-training.md` per Herald §8.
- **OQ-4 (for BigBrain):** S-DEL grace window is 30 days; Stripe subscription cancellations have a different cadence. Confirm interaction: does Stripe sub cancel-at-period-end honor the deletion-execute date, or does it continue to charge for the rest of the period?
- **OQ-5 (for Atlas + Cipher):** when account is cryptoshredded, do we delete the user's `tenant_members` row? The `auth.users` row? PRD §13.2 says `auth.users` is the RLS exception — deletion-on-execute must specify both rows.
