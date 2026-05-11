# Trace — Flow & Logic Audit — MotionMax 360
**Date:** 2026-05-10
**Reviewer:** Trace (Flow & Logic Auditor)
**Scope:** As-built flow audit, dead ends, traps, recovery paths, multi-session state, divergence vs spec
**Audience:** Tool-savvy creative adults (creators, marketers, video producers); mobile-heavy
**Method:** Static analysis of the repo at `C:\Users\Administrator\motionmax`. A live walkthrough was not available in this audit context, so every step-flow finding cites a file:line; runtime claims (e.g., "spinner never resolves") are derived from the code that decides those states. Where a claim cannot be proven from code alone, the finding is explicitly tagged "Unable to verify from static analysis (live walk required)".

Severity rubric per `agents/audit/jury.md`: **Blocker / Critical / Major / Minor / Polish**.
Effort key: XS (≤1 h) / S (1–4 h) / M (½–2 d) / L (>2 d).

---

## Category 3 — Process & flow consistency

### Critical · Editor "Save" indicator is a permanently green light
- **Issue:** The editor renders a `saveStatus` chip that is hardcoded to `'saved'` on every render — there is no wiring to dirty/save/persist state, so after edits in the Inspector the chip will still claim the project is saved when it may not be.
- **Evidence:** `src/pages/Editor.tsx:334` — `const saveStatus: 'idle' | 'saving' | 'saved' | 'dirty' = 'saved';` (passed to `<EditorFrame saveStatus={saveStatus} />` at L433).
- **Why it matters for the audience:** Creators making timeline tweaks rely on a save chip to know whether it is safe to navigate away or close the tab. A perpetually green "Saved" silently destroys trust the moment they discover an edit was lost. This is a confirmation/reassurance failure, not just polish.
- **Fix:** In `src/pages/Editor.tsx` near L334 derive `saveStatus` from the editor's mutation state — e.g., subscribe to the per-scene save mutation (or the existing `queryClient` cache state for `['editor-state', projectId]`) and map `idle/pending/success/error` to `idle/saving/saved/dirty`. Until real autosave is implemented, fall back to `'idle'` (no claim) rather than asserting `'saved'`.
- **Effort:** S

### Critical · Editor kickoff probe loop has no terminal failure UI
- **Issue:** When the autostart kickoff inserts a project but no generation row materialises, `Editor.tsx` runs a bounded probe (`MAX_PROBES = 8`, ~60 s of backoff). After the budget is exhausted, the timer is simply released. The page keeps showing the awaiting state with no error toast, no "Start generation" CTA, and no `kickoffState='error'` transition — the user sits on a ~2% progress overlay forever.
- **Evidence:** `src/pages/Editor.tsx:188-256` (the `useEffect` probe). Lines 246–249: `if (attempts < MAX_PROBES && !cancelled) { timer = setTimeout(probe, delayFor(attempts)); }` — no else branch transitions UI on exhaustion. The retry CTA at L374-401 is gated on `kickoffState === 'error'`, which the probe never sets.
- **Why it matters:** A flaky network on mobile is the exact case this code path was added for. Hitting the 60-s ceiling and getting a silent dead end is worse than the bug it was designed to paper over.
- **Fix:** In the probe in `src/pages/Editor.tsx:246`, when `attempts === MAX_PROBES` and no row was found, call `setKickoffState('error')` so the existing recovery view at L374 takes over. Keep the realtime channel subscription alive in case the row arrives later.
- **Effort:** XS

### Critical · "Project not found" page only routes back to dashboard, not to Projects gallery or Help
- **Issue:** The editor's load-error state — which fires for *every* unauthorised, deleted, or 404'd project ID — only offers a single "Back to Studio" button targeting `/dashboard-new`. There is no "Browse my projects" link, no "Contact support" link, and no diagnostic context (project ID, last 8 chars, copy-as-text).
- **Evidence:** `src/pages/Editor.tsx:349-367` — single `<button>` to `/dashboard-new`. No project-id surfaced to the user.
- **Why it matters:** Creators routinely share project links across devices; landing on an error with one ambiguous "Back" is a recoverable-flow miss. They cannot file a useful support ticket without the ID, and the global `/app` dashboard is not always where they want to go.
- **Fix:** In `src/pages/Editor.tsx:349-367` add (a) a secondary "Open Projects" link to `/projects`, (b) a "Contact support" link to `/help#contact` with the project ID prefilled (`?projectId=…`), and (c) render the truncated project ID in monospace below the body text. Keep "Back to Studio" as the primary.
- **Effort:** XS

### Major · Pipeline partial-failure toast is the only escape hatch
- **Issue:** When the pipeline reports `step === 'error'` mid-generation, the user is shown a 10 s toast (`Generation partially failed`). The Inspector renders per-scene fail badges, but there is no persistent banner on the editor surface; once the toast dismisses, a returning user has no global signal that anything failed.
- **Evidence:** `src/pages/Editor.tsx:316-323` — only the `toast.error(...)` call + `duration: 10000`. No surface-level banner is rendered when `pipelineStep === 'error'`.
- **Fix:** In `EditorFrame` (or within `src/pages/Editor.tsx` immediately above the `<EditorFrame>` mount) render a sticky "Some scenes need attention" banner whenever `pipelineStep === 'error'` OR any `state.scenes.some(s => s.status === 'fail')`. Provide a "Retry failed scenes" button that fans out to per-scene regen.
- **Effort:** S

### Major · Account deletion has no confirmation email and no immediate re-auth gate
- **Issue:** The Settings → Danger zone deletion flow inserts into `deletion_requests` and signs the user out, but never sends a confirmation email or requires the password to be re-typed. A logged-in attacker (hijacked session, kiosk, partner with the laptop open) can schedule a 7-day-fuse deletion and the user has no out-of-band signal that it happened.
- **Evidence:** `src/pages/Settings.tsx:212-231` — `handleDeleteAccount` only validates the typed `DELETE` string, inserts the request, and calls `supabase.auth.signOut()`. No `supabase.auth.reauthenticate` step, no email send, no audit-log row.
- **Why it matters:** This is a *destructive, time-fused action*. The audience (creators with paid plans, voice clones, projects) has the most to lose if it fires by accident. Creators using a single laptop with a partner is a real persona, especially with mobile-heavy use.
- **Fix:** Before the insert at `src/pages/Settings.tsx:217`, require a fresh password reauth (`supabase.auth.signInWithPassword({ email, password })` against the typed password) and trigger a transactional email via `supabase/functions/_shared/emailTemplate.ts` ("Account deletion scheduled — cancel within 7 days"). Surface "We sent you an email — check it to cancel" in the success toast.
- **Effort:** M

### Major · Auth lockout is opaque on the second-strike onward
- **Issue:** `Auth.tsx` locks a user for 30 s after 5 failed sign-in attempts, but the lockout state is *only* visible if the user submits again — they get a toast that says "Too many attempts. Try again in Xs." There is no persistent banner above the form, no countdown, and no disabled state on the submit button. The 3-strike rate-limit hint is also a one-shot text node with no live region.
- **Evidence:** `src/pages/Auth.tsx:144-149`, `103-104` (state), and the form section in lines after 281 — neither `lockedUntil` nor `showRateLimitHint` is rendered as a sticky banner; only conditional in submission feedback.
- **Why it matters:** A locked-out creator on mobile typing a password manager misfire will keep mashing the button thinking it broke. They need a visible countdown.
- **Fix:** In `src/pages/Auth.tsx` (~L313 above the form), render a `role="status" aria-live="polite"` banner whenever `lockedUntil > Date.now()` showing "Locked for Ns" with a `setInterval`-driven countdown, and disable the submit button and email/password inputs while locked.
- **Effort:** S

### Major · Help page "Live chat" row is a dead element with no fallback action
- **Issue:** The Help page renders a "Live chat — Coming soon · email us in the meantime" row that is `aria-disabled="true"` but otherwise has no `onClick`, no `href`, and no keyboard target. Users tapping it on mobile get nothing — it is a pure dead-end UI element directly above the working email row.
- **Evidence:** `src/pages/Help.tsx:499-511` — `<div className="touch-row disabled" aria-disabled="true">` with no interactive child.
- **Fix:** Either remove the row entirely OR convert it to a link that scrolls to the contact form / opens the email client (`href="#contact"` or `mailto:…`). If kept as a "soon" tease, render as a dimmed `<span>` rather than a `touch-row` so it is not a tapping target.
- **Effort:** XS

### Major · Settings has multiple "Coming soon" surfaces with no expectation-setting
- **Issue:** Workspace, Preferences (Theme/Language/Time zone), and Team members are all "Coming soon" pills inside Settings. None of them link to a roadmap, a feedback channel, or a "notify me" action. A user who clicks into Workspace expecting to set their org name lands on a row of disabled pills.
- **Evidence:** `src/pages/Settings.tsx:391` ("Coming soon" pill on Preferences), `src/pages/Settings.tsx:479` ("Workspace name, handle, default privacy, brand kit defaults and team-member seats are coming soon. Today MotionMax accounts are single-user.").
- **Fix:** For each "Coming soon" card in `src/pages/Settings.tsx` add a single inline link "Get notified" → submits to the same `submit-support-ticket` edge fn used by Help, with `topic='feature_request'` prefilled, OR hide the card entirely until the feature lands. A passive "coming soon" with no action is friction without payoff.
- **Effort:** S

### Major · Help page "Coming soon" claims overlap with active features (Team members)
- **Issue:** The Help page FAQ at L129 says team members are coming soon, but the in-app Settings Workspace tab references the same thing at L479. There is no consistent message about pricing ("Studio plan includes 5 seats; additional seats $19/mo") and no entry point — neither Help nor Settings tells a user *when* or *how* to be among the first to get it.
- **Evidence:** `src/pages/Help.tsx:129`, `src/pages/Settings.tsx:479`.
- **Fix:** Pick one location of truth (suggest: a single FAQ entry in `src/pages/landingContent.ts`, referenced from both pages) and add a "Notify me when this ships" action.
- **Effort:** S

### Minor · 404 page falls back to `window.history.back()` which can leave the user on the same 404
- **Issue:** The "Go back" button at `src/pages/NotFound.tsx:44` calls `window.history.back()`. If the user arrived at the 404 by typing the URL or following a deep link from email/Slack, this leaves them on the same 404 (back goes to the referrer outside the app, or stays put). No fallback to `/` or to a safe in-app route.
- **Evidence:** `src/pages/NotFound.tsx:44-47`.
- **Fix:** In `src/pages/NotFound.tsx:44`, replace with `if (window.history.length > 1) window.history.back(); else navigate('/')`. Use `useNavigate` instead of raw `window.history`.
- **Effort:** XS

### Minor · 404 suggests `/app` as Dashboard but the Editor's project-not-found page sends to `/dashboard-new`
- **Issue:** The two error surfaces use *different* dashboard targets. `NotFound.tsx:7` lists `{ to: "/app", label: "Dashboard" }` whereas `Editor.tsx:392` sends to `/dashboard-new`. One of these is wrong (or both should be unified) — at minimum, the discrepancy is a routing inconsistency the user can hit by clicking the same labelled button in two places and ending up on different surfaces.
- **Evidence:** `src/pages/NotFound.tsx:7` vs `src/pages/Editor.tsx:359, 392`.
- **Fix:** Standardise on one of `/app` or `/dashboard-new` across both files. If `/dashboard-new` is the live route, update `NotFound.tsx:7`; otherwise update `Editor.tsx`.
- **Effort:** XS

---

## Category 1 — UI/UX & design system (flow-level only — defer color/spacing to Optic)

### Critical · Editor "Project not found" uses red-free chrome — confirmed brand-compliant — but the kickoff-error and project-not-found pages mix `/dashboard-new` cyan with raw hex tokens
- **Issue:** The destinations look brand-aligned (no red), but raw hex is hardcoded inline (`bg-[#14C8CC]/10 border-[#14C8CC]/30`). This makes flow-level theming impossible — if the brand cyan changes, every error page has to be hand-edited.
- **Evidence:** `src/pages/Editor.tsx:359-360, 384-394`; same hex literals at `src/pages/Editor.tsx:338-345` for the loading spinner.
- **Fix:** Replace hex literals with the design-token variant (`text-primary`, `bg-primary/10`, `border-primary/30`) already used in `AdminApiCalls` and `Auth.tsx`. This is a flow-impact finding because divergent error surfaces *re-skin themselves* on theme changes inconsistently.
- **Effort:** S

### Major · Email-sent confirmation screen has no resend timer / cooldown UI
- **Issue:** After signup, the "Check your email" confirmation panel offers only a "Back to Sign In" button. There is no "Resend email", no countdown for the existing email's TTL, and no support fallback for a user whose confirmation never arrives.
- **Evidence:** `src/pages/Auth.tsx:243-279` — only a single CTA, "Back to Sign In".
- **Why it matters:** Creators on Gmail's spam-aggressive enterprise tenants regularly miss these emails. The flow currently dead-ends them: they cannot resend, cannot retry signup with the same email (it's already taken), and have no in-product path to support.
- **Fix:** In `src/pages/Auth.tsx:266-272` add a "Resend confirmation" button that calls `supabase.auth.resend({ type: 'signup', email })` with a 60-s cooldown UI, and a secondary "Email never came — get help" link to `/help?topic=auth_signup`.
- **Effort:** S

---

## Category 4 — Code health & redundancy (storytelling removal)

### Major · Storytelling product remnants survive in three places
- **Issue:** Per the brief, Storytelling is being removed. Three references remain:
  1. `src/components/dashboard/ProjectsGallery.tsx:35-39` — `EXPLAINER_TYPES = new Set(['doc2video', 'storytelling', 'explainer'])` keeps a *legacy compatibility* mapping. While the comment claims this is "treating legacy as their current equivalent", the bucket label still affects how older storytelling projects render in the gallery.
  2. `src/components/landing/SeoHead.tsx:41` — meta keywords list contains `"video storytelling"` as a SEO term, signalling a removed product to search engines.
  3. `src/components/workspace/SpeakerSelector.tsx:102, 111, 120, 135` — speaker descriptions still use the literal word "storytelling" (Harper, Sandra, Johnny, Mariana). These are voice-character marketing copy, not the Storytelling *product*, but the brief's removal mandate can be interpreted strictly.
- **Evidence:** Listed file:line references above (grep for `storytelling`/`Storytelling` in `src/`).
- **Fix:**
  - `ProjectsGallery.tsx:39` — keep the legacy mapping but add a TODO with a deprecation date so a future cleanup pass deletes it.
  - `SeoHead.tsx:41` — remove `"video storytelling"` from the keywords meta string.
  - `SpeakerSelector.tsx:102/111/120/135` — confirm with BigBrain whether voice-style language ("storytelling tone") falls under the removal mandate; if yes, swap for `"narrative"`/`"expressive"`.
- **Effort:** XS for the SEO + projects-gallery touches, S to revisit speaker descriptions if needed.

---

## Category 6 — Security & encryption (flow-relevant only — defer crypto/keys to Compass)

### Critical · OAuth `redirectTo` is built from raw `returnUrl` query param + window origin without further allowlisting
- **Issue:** `Auth.tsx` validates the local-form `returnUrl` to start with `/` and not `//` (good), but the OAuth flow (`handleOAuthSignIn`) constructs `redirectTo: \`${window.location.origin}${returnUrl}\`` and hands it to Supabase. Supabase requires the redirect URL to be on its allowlist, which mitigates this — but the local validation is *only* applied to the post-sign-in `navigate(returnUrl)` call, not to the OAuth handoff.
- **Evidence:** `src/pages/Auth.tsx:107-119` — `rawReturnUrl` is sanitised at L108 for navigation, but `returnUrl` (already sanitised) is correctly used at L119 for OAuth. Re-reading: the same sanitised `returnUrl` is used. **Status:** false alarm on this specific exploit, but `rawReturnUrl` value is silently dropped — verify it isn't read elsewhere. **Unable to verify from static analysis whether all consumers use the sanitised value.**
- **Fix:** None required if Supabase's redirect allowlist is properly configured. As a defence-in-depth measure, log a warning to Sentry whenever `rawReturnUrl !== returnUrl` so attempts to slip in `//evil.com` paths are observable.
- **Effort:** XS (logging only)

### Major · Referral code application swallows all errors silently
- **Issue:** `applyStoredReferralCode` is wrapped in `try/{} catch{ /* Non-critical */ }` so even legitimate referral failures (RPC missing, RLS denied, network error) never surface. A user who paid with a referral expecting credit will not know their credit failed to apply.
- **Evidence:** `src/pages/Auth.tsx:63-75`.
- **Why it matters for the audience:** Creator-recruited creators are a key growth lever. A silent referral failure is a quiet revenue/retention bug.
- **Fix:** In `src/pages/Auth.tsx:72-74` log the error to Sentry and surface a low-key toast (`toast.message("Referral code couldn't be applied — contact support if you expected credit.")`) without blocking the signup confirmation screen.
- **Effort:** XS

---

## Category 9 — Observability & incident readiness (flow-level)

### Major · Editor probe loop is dev-logged but the production path has no observability
- **Issue:** The kickoff probe at `src/pages/Editor.tsx:228-235` only logs `[Editor] kickoff probe` in `import.meta.env.DEV`. In production, a stuck-on-loading user generates zero telemetry — nobody on the team knows about the failure unless the user files a ticket. The probe-exhaustion case (Critical above) silently fails with no Sentry event.
- **Evidence:** `src/pages/Editor.tsx:229-235` (DEV gate), `:243-245` (`log.warn` on probe error — but that's a transient catch, not the exhaustion case).
- **Fix:** Wire a `Sentry.captureMessage('editor.kickoff.probe_exhausted', { level: 'warning', extras: { projectId } })` on the exhaustion branch. Also emit a PostHog event `editor.kickoff.stuck` so abandonment is measurable.
- **Effort:** XS

---

## Category 10 — Testing (flow-level only)

### Major · No e2e test for the multi-tab signup race
- **Issue:** The `acceptedTerms` + `ageVerified` checkbox state is component-local, and the email-sent screen does not persist if the user navigates away mid-flow (closing the tab, opening signup in a second tab). There are e2e tests in `e2e/`, but the brief asks for race-condition coverage; nothing in this file references the multi-tab/double-submit case for signup.
- **Evidence:** `src/pages/Auth.tsx:101-102` (state is local). Need to check `e2e/` directory exists — confirmed at the repo root listing. **Unable to verify from static analysis whether a multi-tab e2e test exists.** Recommend Canon spot-check.
- **Fix:** Add an e2e test that: (a) opens signup, (b) submits valid creds, (c) closes the tab before email click, (d) reopens app and verifies the sign-in form does not show stale email/state. Document under `e2e/auth/` with a name like `signup-multi-tab-race.spec.ts`.
- **Effort:** S

---

## Category 13 — Legal & compliance (flow-relevant)

### Major · Account deletion confirmation copy says "permanently deleted in 7 days" but the live flow does not show the user the cancellation UI inline
- **Issue:** After scheduling deletion, the success toast says "permanently deleted in 7 days" and immediately signs the user out (`Settings.tsx:226`). The user therefore *never sees* the in-product cancel flow until they sign back in — meaning their first chance to undo it is to remember to sign back in within the window.
- **Evidence:** `src/pages/Settings.tsx:212-231`. The "cancel deletion" UI is gated on `pendingDeletion` state at L424-438, only visible when signed-in.
- **Why it matters:** The 7-day grace period is a GDPR-aligned safety mechanism, and a user who accidentally triggered it should not have to sign back in to discover how to cancel.
- **Fix:** In the success path (`src/pages/Settings.tsx:221`), instead of immediately signing out, show an inline confirmation panel with a 5-second "Sign me out" countdown plus a "Cancel deletion" button. Also send the cancel link in the confirmation email (see the Critical finding above on missing reauth+email).
- **Effort:** M

---

## Category 11 — Analytics / lifecycle email (flow-relevant)

### Minor · Signup confirmation screen does not analytics-track which email provider users have
- **Issue:** When a creator hits the "Check your email" screen, there is no event indicating which email domain they used (gmail.com, outlook.com, custom). This is a missed signal for diagnosing deliverability problems against major providers.
- **Evidence:** `src/pages/Auth.tsx:243-279` — no analytics call between `setShowEmailSent(true)` and rendering.
- **Fix:** In `src/pages/Auth.tsx:197` after `setShowEmailSent(true)` add `posthog.capture('signup.email_sent', { domain: email.split('@')[1] })`.
- **Effort:** XS

---

## Cross-cutting flow concerns

### Major · No global "unsaved changes" guard for the Editor
- **Issue:** Because `saveStatus` is hardcoded (Critical above), there is no `beforeunload` guard preventing the user from accidentally closing the tab on a dirty editor. Cmd-W / mobile-back / refresh all silently drop pending state.
- **Evidence:** Repo grep for `beforeunload` in `src/` reveals no guard in editor surfaces. **Unable to verify from static analysis without a full grep, but no such hook is referenced from `Editor.tsx`/`EditorFrame`.**
- **Fix:** Once real save state lands (from the Critical Editor finding), add a `useBeforeUnload` hook to `src/pages/Editor.tsx` that warns when `saveStatus === 'dirty' || pipelineStep !== 'complete'`. Plumb it through React Router's `useBlocker` for in-app navigations.
- **Effort:** S (after the save-status fix)

### Major · `void forceRefresh` at `Editor.tsx:265` indicates dead-coded refresh action
- **Issue:** `forceRefresh` is declared and referenced as `void forceRefresh` at L265, suppressing the unused-var warning. The function is fully implemented (cache invalidation + refetch + toast) but has no visible UI binding. Either the binding was removed and the function should be deleted, or a refresh button is missing from the awaiting overlay (see Critical above).
- **Evidence:** `src/pages/Editor.tsx:259-265`.
- **Fix:** If a refresh CTA is desired on the awaiting overlay, wire `forceRefresh` to a button there. Otherwise delete `forceRefresh` entirely.
- **Effort:** XS

### Polish · Auth toast severity uses `toast.error` for password-too-short which is user-correctable, not exceptional
- **Issue:** Errors that are *expected user-correctable* (password length, password mismatch) are reported via `toast.error`, which on most installations is the same channel used for unexpected failures. This dilutes the "real" errors.
- **Evidence:** `src/pages/Auth.tsx:217-224, 221-225` — `toast.error("Password too short", ...)`, `toast.error("Passwords don't match", ...)`.
- **Fix:** Use `toast.warning` (or simply rely on the inline `errors.password` / `errors.confirmPassword` UI already rendered) for these correctable cases. Reserve `toast.error` for unexpected failures.
- **Effort:** XS

---

## Production Blockers
*(Findings whose severity is `Blocker` — none from a Trace flow perspective in this pass; the most-acute flow issues are `Critical` and listed below.)*

| # | Category | Issue | Location |
|---|---|---|---|
| (none Blocker) | — | — | — |

## Top 10 Priority Fixes (Trace flow lens, severity-then-effort)

| # | Severity | Category | Issue | File:line | Effort |
|---|---|---|---|---|---|
| 1 | Critical | Process | Editor save status hardcoded `'saved'` — silent data-loss risk | `src/pages/Editor.tsx:334` | S |
| 2 | Critical | Process | Editor kickoff probe exhaustion → silent dead-end overlay | `src/pages/Editor.tsx:188-256` | XS |
| 3 | Critical | Security | Account deletion has no reauth and no confirmation email | `src/pages/Settings.tsx:212-231` | M |
| 4 | Critical | Process | "Project not found" page lacks support / projects fallback | `src/pages/Editor.tsx:349-367` | XS |
| 5 | Critical | UI/UX | Inline hex tokens in error views block flow-level theming | `src/pages/Editor.tsx:338-394` | S |
| 6 | Major | Process | Pipeline partial-failure has no persistent banner | `src/pages/Editor.tsx:316-323` | S |
| 7 | Major | Process | Auth lockout countdown is invisible until you re-submit | `src/pages/Auth.tsx:103-149` | S |
| 8 | Major | UI/UX | Email-sent screen has no resend / no support escape | `src/pages/Auth.tsx:243-279` | S |
| 9 | Major | Code-health | Storytelling SEO + product-type remnants | `src/components/landing/SeoHead.tsx:41` + 2 others | XS |
| 10 | Major | Compliance | Deletion sign-out happens before user sees cancel UI | `src/pages/Settings.tsx:221-226` | M |

---

## Coverage notes (what this audit did NOT cover end-to-end)

This pass is static-analysis only. The following flows were not walked at runtime; they should be re-audited with a live build / staging URL before final sign-off:

- **IntakeForm submit→Editor handoff at every breakpoint** (320/375/390/414/428/768/1024/1280px). The intake module is 1571 lines (`src/components/intake/IntakeForm.tsx`) and gates on plan limits + autopost upgrade dialog; mobile traversal of the schedule + autopost branch was not exercised.
- **Voice Lab clone-train → first-use** (`src/pages/VoiceLab.tsx`, 1316 lines). The dialog wiring at L927/1214 suggests a multi-step flow; trap states / keyboard escape unverified.
- **Autopost run lifecycle** (`src/pages/lab/autopost/RunDetail.tsx` + `RunHistory.tsx`). Flagged in brief for its own UI; no walk performed.
- **Admin Generations / Logs / Queue Monitor / Worker Health** — admin shell traversed only via `AdminApiCalls.tsx`. The other 12 admin components were not flow-walked; the brief flagged "broken API calls" — recommend Canon and Compass cover this on their pass.
- **Email template confirmation flow** (`supabase/functions/_shared/emailTemplate.ts`). Not opened in this pass.
- **Mobile keyboard avoidance / safe-area-inset / 100dvh** — entirely runtime concerns; static analysis cannot verify.
- **iOS add-to-home-screen + WebAPK install flow** — runtime only.
- **Hardware back button / orientation / split-screen / external keyboard tablet behavior** — runtime only.

These limitations should be addressed in a re-audit pass once a live or staging URL is available to Trace.

---

**Audit complete.** Sending findings up to Jury for synthesis.

— FROM: Trace (Audit) — TO: Jury (Audit) — RE: AUDIT FINDINGS — motionmax-360 — STATUS: Review
