# Ghost — Exploratory Edge Cases (§10)

**Project:** motionmax-360
**Date:** 2026-05-10
**Reviewer:** Ghost (Quality / Exploratory Bug Hunter)
**Scope:** Race conditions, double-submit, mid-flow logout, browser-back during multi-step wizards, state corruption, network failures mid-generation, multi-tab interactions, cache invalidation bugs, retry-storm scenarios.

Severity rubric: Blocker / Critical / Major / Minor / Polish.
Audience-relative: tool-savvy creative adults; mobile-heavy. Edge-case impact is weighted by how a distracted creator on a flaky 4G connection mashing buttons would experience it.

Static analysis only. Where dynamic verification (load test, multi-tab repro) was needed I have written `Unable to verify from static analysis` and explained why.

---

## §10 — Exploratory Edge Cases

### Blocker

**(none surfaced from static analysis)** — most multi-thousand-dollar paths have at least a partial guard. The Critical-severity issues below are the ones that will fire in production within the first week of real traffic.

### Critical

**G-C1. `useExport.startExport` has no in-flight guard against double-submit; second click between `submitting` and the row insert fires a parallel export job.**
File: `src/components/editor/useExport.ts:124-185`.
The function only sets `setExportState({ status: 'submitting', progress: 2 })` at line 159 *after* the early-return user/project guards. There is no short-circuit on `exportState.status !== 'idle'` and no ref-based lock. The Download button is gated by React state, but state updates are async; on a slow phone the user can tap twice before the disabled prop reaches the DOM. Each tap reaches `supabase.from('video_generation_jobs').insert(...)` (line 162) and produces a fresh `export_video` row — both rows get claimed by the worker pool (separate slots if available) and both run full ffmpeg encodes. Credits aren't double-deducted for export (export is free), but worker pool oversubscription + storage upload churn is real. If a user opens two tabs and clicks Export in each, identical effect.
Fix: solution+location+how — at the top of `startExport` add `if (exportState.status === 'submitting' || exportState.status === 'rendering') { toast.info('Export already in progress.'); return; }` and additionally set a `useRef<boolean>` lock that flips true synchronously before the first `await`. (XS)

**G-C2. `IntakeForm.handleGenerate` has no synchronous lock — Enter-mash or two-tab submission inserts duplicate `projects` rows and double-charges credits.**
File: `src/components/intake/IntakeForm.tsx:526-776` (esp. 530, 751).
`setGenerating(true)` runs but is React state, not a sync barrier. The `<button type="submit" disabled={generating}>` (line 1520) is the only UI guard, and it does not block the form's `onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}` (line 833) when the user presses Enter inside the prompt textarea: keystroke processing and React paint can interleave so two Enter presses both trigger handleGenerate before disabled propagates. Network on 4G then has a 200-700ms window where two in-flight inserts (lines 684 schedule path, 751 project path) both succeed. There is no DB-level uniqueness constraint shown in the schema (no `(user_id, content_hash, created_within_5s)` exclusion). Both projects then trigger `generate_video` worker jobs and double-deduct credits via the upfront edge-function deduction.
Fix: solution+location+how — gate with `useRef<boolean>` (`inFlightRef.current = true` synchronously before the first `await`); reject re-entry. Also add a server-side dedup index on `projects(user_id, content_hash, created_at)` with a 30 s window. (S)

**G-C3. Stripe webhook check-first/insert-after pattern has a TOCTOU window for parallel retries, and `invoice.paid` (subscription renewal credits) has no per-invoice idempotency key.**
File: `supabase/functions/stripe-webhook/index.ts:171-189` (the dedup) and `462-499` (invoice.paid handler).
The comment at line 171-175 acknowledges the previous "insert-before-run" footgun but the new pattern is still TOCTOU: two simultaneous deliveries of the same `event.id` (Stripe retries are not always serialised at the edge) both find no row at line 176-180, both proceed past the `if (existingEvent)` guard, and both run the handlers. For one-time payments the secondary check on `credit_transactions.stripe_payment_intent_id` (line 211-221) will save you. For **subscription renewals at `invoice.paid` (line 462-499)**, no analogous idempotency check is shown — the handler grants `monthlyCredits[plan_name]` plus addon credits with no `stripe_invoice_id` dedup. Two parallel deliveries → 2× monthly credits; the user keeps the over-credit because `increment_user_credits` is unconditional.
Fix: solution+location+how — at line 462 (`case "invoice.paid"`), before granting credits, `select id from credit_transactions where stripe_invoice_id = invoice.id` (and add the `stripe_invoice_id` column with a unique index). Alternatively wrap the entire dedup-and-handler in a single SQL transaction with `INSERT ... ON CONFLICT DO NOTHING` on `webhook_events` first and short-circuit on the conflict. (S)

**G-C4. `BulkOpModal.cancelExport` updates ALL pending/processing export_video jobs for the project — silently kills unrelated user-initiated download exports during a captions-apply.**
File: `src/components/editor/BulkOpModal.tsx:199-229`.
`update({ status: 'failed', error_message: 'Cancelled by user' }).eq('project_id', projectId).eq('user_id', user.id).eq('task_type', 'export_video').in('status', ['pending', 'processing'])` does not scope by `payload._bulk`. If a user clicks "Apply captions" (which inserts an `export_video` with `_bulk: 'captions-apply'`, see `useSceneRegen.ts:686-707`) and SIMULTANEOUSLY their previously-clicked Download export from the topbar is rendering, cancelling the captions-apply via this modal also kills the download. The user sees their download silently fail. Conversely: download export rendering, user accidentally clicks Apply→Cancel — same bug.
Fix: solution+location+how — at line 209-212 narrow with `.eq('payload->>_bulk', currentBulkKind)` (or equivalent JSONB filter using a generated column for index). For non-bulk download exports (no `_bulk` tag), filter `is null`. (S)

**G-C5. `useSceneRegen` cross-tab debounce is defeated; in-memory `lastFiredRef` Map gives zero protection across tabs.**
File: `src/components/editor/useSceneRegen.ts:21-31`.
The 2.5 s `debounceFire` lock is a `useRef<Map>` per hook instance. Open the editor in two tabs (common: creator drafts on phone, finishes on laptop), click "Regenerate image" on scene 3 in both within 2 s — both pass the local debounce, both insert `regenerate_image` jobs. The worker has no client-side dedup for image/video regens (only `master_audio` queries `in('status', ['pending','processing'])` at line 53-62). Result: two Hypereal calls billed, two image rows written, last-write-wins via `update_scene_field` RPC. Net: paid 2× for 1 visible result.
Fix: solution+location+how — add server-side dedup at the worker handler entry (or via a partial unique index on `video_generation_jobs(project_id, task_type, scene_index) WHERE status IN ('pending','processing')`). At minimum, mirror the `isMasterAudioInFlight` pattern for `regenerate_image`/`cinematic_video`/`cinematic_video_edit` before the insert. (M)

**G-C6. User-initiated export cancel forfeits credits (acknowledged) AND races the worker — a Cancel within ~1s of the worker uploading the final video shows BOTH "Cancelled" and "Export ready" toasts.**
File: `src/components/editor/BulkOpModal.tsx:199-229` and `worker/src/handlers/exportVideo.ts:168-178`.
The worker's `checkCancelled` reads `status='failed'` + `error_message` containing 'cancel'. But once the export has `await uploadToSupabase(...)` and is committing the row to `completed`, a UI cancel UPDATE arrives mid-flight: PostgreSQL serialisation may apply UI's `failed` write *after* the worker's `completed` write (worker's update runs at index.ts:697-706). The `useExport.handleRow` then sees a `completed` row with finalUrl and toasts "Export ready", while BulkOpModal toasts "Export cancelled" — same job, contradictory UX. Compounding: comment at BulkOpModal:196-198 admits credits are forfeited even when the user gets the file. Worker comment at exportVideo:163-167 says "we can't actually kill the running child" — same forfeit.
Fix: solution+location+how — use a CAS update at the worker side (`update where status = 'processing'`) and refuse to overwrite a `failed` status. UI side: `await` a re-read after the cancel UPDATE; if status is `completed` reverse the toast. Refund: route through `admin_cancel_job_with_refund` (the existing path) for user-initiated cancels too instead of forfeiting. (M)

### Major

**G-M1. `scheduleRefresh` schedules nine uncancellable setTimeouts on every regen and never cleans them up on unmount/logout.**
File: `src/components/editor/useSceneRegen.ts:38-46`.
`const intervals = [1500, 4000, 8000, 15000, 25000, 40000, 60000, 90000, 120000]; intervals.forEach((ms) => setTimeout(invalidate, ms));` returns no handle and the hook stores none. Each regen action stacks 9 timers; a normal session with 6 regens leaves 50+ orphan invalidations queued. After logout, RLS rejects each query but the request still hits Supabase (~50 wasted requests). After unmount, the closure keeps `queryClient` alive. Browser-back during the 2-min window also keeps invalidating the closed editor's cache. On mobile with battery-saver this is real wakeup churn.
Fix: solution+location+how — switch to a single `useRef<number[]>` of timer ids, add a cleanup on the calling effect that clears them, and bail out of `invalidate` when `state?.project?.id` no longer matches the captured id. (S)

**G-M2. Auth lockout (`failedAttemptsRef`, `lockedUntil`) is component-scoped state; refresh or new tab resets it.**
File: `src/pages/Auth.tsx:103-104, 141-176`.
`failedAttemptsRef = useRef(0)` and `lockedUntil = useState<number>(0)` live for the lifetime of the `<Auth>` component. Five failed attempts → 30 s lockout — but a page refresh or opening a new tab resets the counter to 0 instantly. An attacker with credential-stuffing tools sees zero rate-limit. Supabase's own auth rate limit may catch the egregious case, but the comment at line 22-25 implies this is supposed to be the line of defense. Worse: between two parallel Enter presses, both can pass the `Date.now() < lockedUntil` check before the failure for #1 has updated `lockedUntil`, so `LOCKOUT_THRESHOLD = 5` may actually let through 6+ attempts under burst.
Fix: solution+location+how — move the counter to a server-tracked source: a Supabase RPC `auth_record_failed_attempt(email, ip)` backed by a `failed_login_attempts` table (with rolling-window unique index), and gate on the RPC's response. Belt-and-braces: persist the in-memory counter to `sessionStorage` keyed by email so a refresh/new-tab still sees it. (M)

**G-M3. ScheduleBlock localStorage draft is shared across tabs without a tab-id discriminator — Tab B's OAuth round-trip can hydrate Tab A's stale state.**
File: `src/components/intake/ScheduleBlock.tsx:55, 122-157, 286-304`.
`DRAFT_KEY = 'motionmax.scheduleblock.draft'` is a single global key. Scenario: user opens Intake in Tab A, fills schedule, clicks Connect→YouTube which writes the draft and redirects. Meanwhile in Tab B they open another intake, configure DIFFERENT topics, click Connect→TikTok — this overwrites Tab A's draft. Tab A returns from OAuth, hydrates from localStorage, but now sees Tab B's topics. There is no tab-id key, no `BroadcastChannel` reconciliation, and no "newer-than-mine" check. The user silently loses one workflow's worth of input.
Fix: solution+location+how — key the draft by `crypto.randomUUID()` stored in `sessionStorage` (per-tab) and pass that id through the OAuth state parameter so the callback returns to the right tab's draft. Or migrate to a server-persisted draft keyed by user+session. (M)

**G-M4. `useExport`'s realtime subscription is registered AFTER the job insert — a fast-finishing export can complete in the gap and be missed for ~30 s until the sanity poll fires.**
File: `src/components/editor/useExport.ts:162-269`.
Sequence: `await insert → channel.subscribe()`. On a warm worker pool with a tiny scene set, the worker can claim and finish `export_video` in <1 s (especially when crossfade is disabled). Channel attach has its own latency (~200-600 ms WSS handshake). If the worker completes BEFORE the channel attaches, no UPDATE arrives via WS. The 30 s `pollIntervalRef` (line 256-269) catches it eventually, but the user stares at "Submitting…" → "Rendering 5%" for up to 30 s on a finished export. Comment at line 252-255 acknowledges this risk but the mitigation is "30 s every poll" — should be "first poll at 2 s, then 30 s".
Fix: solution+location+how — kick a manual `handleRow` poll 2 s after the channel.subscribe() resolves (first-tick), then continue 30 s cadence. (XS)

**G-M5. Worker stale-claim reaper resets non-orchestrator jobs to `pending` and re-claims — for `master_audio`, `cinematic_audio`, `cinematic_video`, this re-runs partially-completed external API calls, double-billing.**
File: `worker/src/index.ts:935-955`.
Comment at line 936-937 claims "image gen / TTS are single API calls that retry cleanly" — partly true for `regenerate_image` and `voice_preview`, **not** true for `master_audio` (multi-segment slicing + N storage uploads + scene back-fill writes) or `cinematic_video` (Kling jobs with their own job-id state). Resume checkpoints exist for `cinematic_video` (line 936 implies), but `master_audio`'s `handleMasterAudio` has no checkpoint shown — its 30-min stale window means a worker death after the Gemini TTS call but before the back-fill writes triggers a fresh Gemini call (full Tier-1 TPM burn) on revive. Compounded by `MAX_JOB_RETRIES = 3` (line 341) — up to 3× provider charge for a single user-visible regen.
Fix: solution+location+how — add `master_audio` to the fail-closed list at line 909-918, OR add an explicit checkpoint+resume in `handleMasterAudio` (similar to `handleCinematicVideo`). At minimum, shorten `STALE_PROCESSING_MS` for non-resumable types to 8 min — past Gemini's per-call timeout but tight enough that a partial run doesn't pile up. (M)

**G-M6. Topic-generation polling = 1.5 s × 5 min = 200 SELECTs per user click; no exponential backoff, no realtime fallback.**
File: `src/components/intake/ScheduleBlock.tsx:253-275`.
`while (Date.now() < deadline) { await sleep(1500); const { data: row } = await supabase.from('video_generation_jobs').select(...).eq('id', job.id).single(); }` — pure polling. 100 concurrent users on a marketing campaign Friday 9 AM → 67 sustained QPS on `video_generation_jobs` for the duration of the spike. The export path migrated away from this pattern (useExport.ts:227-249 uses realtime), but this one didn't. Also: `.single()` throws on 0 rows; if the row was deleted (admin cleanup) the catch surfaces an opaque error.
Fix: solution+location+how — replace with the same realtime pattern used in `useExport`: subscribe to `postgres_changes UPDATE` on `id=eq.${job.id}` and keep a long sanity-poll at 30 s intervals. Or back off polling: 1.5 s × 5 → 5 s × 30 → 15 s × … (S)

**G-M7. Editor mid-flow logout leaves `useExport` realtime channel + 30 s poll alive, leaking auth-failed requests until tab close.**
File: `src/components/editor/useExport.ts:42-49, 256-269`.
The cleanup effect runs only on component unmount. If the user signs out from the AppSidebar (which calls `signOut()` from `useAuth.ts:163`) without unmounting (e.g., signOut redirects but the editor remains mounted briefly during transition), the channel and 30 s poll keep firing. Each poll selects against `eq('user_id', user.id)` where `user.id` is the now-stale captured value — RLS rejects but the request goes anyway. Worse: realtime UPDATE callbacks on the leftover channel set state on an unmounted-but-not-cleaned component, triggering React warnings + memory pressure. No `useEffect` watches `user?.id` to teardown on logout.
Fix: solution+location+how — add `user?.id` to the cleanup effect's dep array (line 42-49), and bail in `pollIntervalRef`'s callback if `!user`. (S)

**G-M8. No `beforeunload` warning while a project insert / export submission is in flight — closing the tab during the 200-700 ms window after Generate burns credits with no visible result.**
File: `src/components/intake/IntakeForm.tsx:526-776`; `src/components/editor/useExport.ts:159-185`.
Once `setGenerating(true)` fires, the user can close the tab before `supabase.from('projects').insert(...)` resolves. The fetch keeps going (browsers continue in-flight POSTs on close), the project row inserts, the worker picks up `generate_video`, and credits deduct via the edge function. The user closed the tab thinking they aborted; the next session shows a project they don't recognise plus a credit decrement. Same on Export submit (smaller stakes since export is free, but the storage upload still runs).
Fix: solution+location+how — register a `window.addEventListener('beforeunload', ...)` while `generating === true` (or `exportState.status === 'submitting'`); show the browser's standard "Leave site?" prompt. Also add an explicit "Generation submitted — safe to close" success state before navigation so the user knows when the round-trip is committed. (S)

**G-M9. `regenerate_image` insert immediately after `update_scene_field` — if the RPC succeeds but the worker enqueue fails, the user has a re-prompted scene with no regen.**
File: `src/components/editor/useSceneRegen.ts:146-179`.
Sequence: `updateScenePrompt(index, nextPrompt)` (writes to DB) → `supabase.from('video_generation_jobs').insert(...)` (enqueue). If the second call fails (network blip, RLS misfire), the prompt is updated to the new value but no regen runs. The scene's stored prompt now diverges from the rendered image. User sees no error mapping; toast says `"Regenerate failed: ..."` but the form's prompt field shows the new value. Next time they touch the scene they'll think the new prompt was applied — it wasn't rendered.
Fix: solution+location+how — wrap the prompt write + job enqueue in a single Postgres function (`regenerate_scene_atomic(generation_id, scene_index, new_prompt)`) so either both happen or neither. Or revert the prompt write on enqueue failure. (S)

**G-M10. Dispatched orchestrator handlers (`autopost_render`, `autopost_rerender`) skip refund — but the refund classifier at line 383-387 only includes `autopost_render`, leaving `autopost_rerender` failures with no refund despite consuming the same credits.**
File: `worker/src/index.ts:383-387, 405-433`.
`REFUNDABLE_TASK_TYPES = new Set(['generate_video', 'generate_cinematic', 'autopost_render'])`. `autopost_rerender` is missing. If a rerender consumes 45 autopost credits (per `AUTOPOST_CREDITS_PER_RUN`) and fails, no refund. Comment at line 376-381 explains why downstream tasks aren't refundable but `autopost_rerender` is the deduction point for the rerender flow, same as `autopost_render` is for the original.
Fix: solution+location+how — add `autopost_rerender` to `REFUNDABLE_TASK_TYPES` and apply the same `creditsDeducted` payload guard at line 405-433. (XS)

**G-M11. Worker's `withTransientRetry` retries up to 3× without checking idempotency — for handlers that already wrote partial state, retries can leave duplicate rows.**
File: `worker/src/index.ts:343-363, 550-561`.
`retryDelayMs(attempt - 1)` at line 355 is comment-documented as "2 s, 4 s, 8 s with jitter". For `handleAutopostEmailDelivery` or `handleNewsletterSend`, a transient SMTP 503 causes a retry — but if Resend already accepted the email and the 503 was on the response (e.g., gateway timeout), the user gets the email twice on retry. There's no exchange of an idempotency key with Resend (verified by grep — `Resend.idempotency_key` not found in `_shared/resend.ts`).
Fix: solution+location+how — pass `Idempotency-Key: <jobId>` header to Resend on every send (Resend supports this header per their docs). Same for OpenRouter, Hypereal, ElevenLabs where supported. (M)

**G-M12. `applyCaptionsAll` writes `intake_settings.captionStyle` then enqueues an `export_video`; on the schema-cache fallback path the project write is **silently dropped** but the export still fires with the new style.**
File: `src/components/editor/useSceneRegen.ts:652-720`.
At line 657-669: `const ok = await (async () => { ... return !error; })(); if (!ok) { /* schema-cache miss — fall back via updateIntakeSettings handles it elsewhere. For Apply we still try to fire the export. */ }` — the comment is honest but the behaviour is wrong: the export uses `caption_style: style` from the function parameter (line 699), but the scene state and any subsequent re-render reads the OLD captionStyle from the DB. After this export finishes, the editor reloads, sees old style, and the next Apply or per-scene caption flip diverges from what just rendered.
Fix: solution+location+how — early-return `false` and toast an error if the project write fails. Don't enqueue the export with a style the DB doesn't reflect. (S)

**G-M13. `IntakeRail` heavy effect runs every 200 ms while the user types and depends on `generating` — flipping `generating` re-creates a JSX subtree that includes the schedule block and topic list.**
File: `src/components/intake/IntakeForm.tsx:796-828`.
Heavy debounce mitigates per-keystroke churn but the dep array includes `generating, isAdmin, scheduleState`. Toggling the schedule block or hitting Generate rebuilds the rail. With `<IntakeRail>` containing the schedule's localStorage hydration effect (via children), this can re-trigger a hydrate-then-mirror loop in dev where the rail's effect overwrites in-progress edits.
Fix: solution+location+how — pull `generating` out of the heavy effect (it's already mirrored to rail.setGenerating implicitly via `onGenerate`); pass it via a separate sync setter like `rail.setTotalCost`. (S)

**G-M14. Two-tab editor: `applyCaptionsAll` clicked in Tab A and Tab B inserts two `export_video` rows in <1 s — both are valid, both run, last upload wins as `result.url`, the other becomes orphan storage.**
File: `src/components/editor/useSceneRegen.ts:652-720`; no project-level export-in-flight guard.
The `isMasterAudioInFlight` pattern (line 53-62) exists for audio but not for caption-apply exports. Same vulnerability as G-C5 but storage-cost-focused: each abandoned export is 5-100 MB orphan in Supabase storage that the lifecycle policy must reap.
Fix: solution+location+how — extend the `isMasterAudioInFlight` pattern to a generic `isJobInFlightForProject(projectId, taskType, bulkTag?)` and gate `applyCaptionsAll`, `regenerateAllVideos`, and any future bulk op. (S)

**G-M15. `cancelPolling` clears refs but does not abort the in-flight insert; if the user closes the editor between insert call and resolution, the export still runs.**
File: `src/components/editor/useExport.ts:108-122, 161-186`.
No `AbortController` is passed to `supabase.from(...).insert(...)`. The cleanup effect (line 42-49) clears interval/channel/timer but the original insert promise is in-flight and uncancellable. User sees nothing; storage upload completes; download URL never reaches anyone. Same pattern across `useSceneRegen` regenerate* methods.
Fix: solution+location+how — wrap inserts with an `AbortController` whose signal is aborted in cleanup; supabase-js v2 supports `abortSignal` on its query builder. (S)

### Minor

**G-Mi1. `handleSubmit` in Auth.tsx does not gate at the top on `isLoading` — rapid double-Enter still both pass the lockout check and both call `signIn()`.**
File: `src/pages/Auth.tsx:141-176`.
The `isLoading` state is set after the lockout check. Two parallel handlers both pass `Date.now() < lockedUntil` (since neither has incremented `failedAttemptsRef` yet) and both fire `signIn()`. The second call's failure increments to 2 in one tick — the lockout count is correct but two network calls fire for what the user perceived as one Enter press.
Fix: `if (isLoading) return;` at line 142 before any other logic. (XS)

**G-Mi2. `isMasterAudioInFlight` query has no `.single()` constraint and `data && data.length > 0` allows the worker race window — a master_audio dequeue between the check and the new insert lets two run.**
File: `src/components/editor/useSceneRegen.ts:53-62, 379-401`.
TOCTOU: SELECT returns 0 rows because the worker just claimed the only pending one, INSERT fires, two master_audio jobs in flight. The worker doesn't shown server-side dedup either. Comment at line 379-382 calls this "the safety net for races" but the safety net is exactly the missing piece.
Fix: solution+location+how — replace with a Postgres function `enqueue_master_audio_if_not_in_flight(generation_id)` that does the SELECT + INSERT inside one transaction with `FOR UPDATE` row lock on a per-project row in a dedicated `project_locks` table. (M)

**G-Mi3. `handleConnectPlatform` saves draft then `window.location.href` — if the OAuth provider 500s on the start URL, the draft sits in localStorage until the 30-min staleness check.**
File: `src/components/intake/ScheduleBlock.tsx:286-310` (and surrounding handler).
Failed redirect = stale draft for up to 30 min. A subsequent unrelated form load may inherit it.
Fix: detect failed redirect via `navigator.sendBeacon` ack or set a tighter staleness window (5 min) for OAuth drafts. (XS)

**G-Mi4. `useAuth.bump_my_last_active` setInterval continues firing after sign-out but before the AuthProvider re-renders without `user`.**
File: `src/hooks/useAuth.ts:115-129`.
On signOut, the auth state change fires, `setUser(null)` runs, the `useEffect` cleanup tears down the 60 s interval. But there's a one-render gap where the interval has already been scheduled with a stale token; first invocation post-signout 401s. Cosmetic.
Fix: bail in the interval callback with `if (!user) return;`. (XS)

**G-Mi5. `regenerateAllVideos` filters `scene.imageUrl` boolean — but a scene mid-image-regen has `imageUrl` truthy AND a pending image job; the new video regen runs against a stale image.**
File: `src/components/editor/useSceneRegen.ts:609-628`.
Concurrent flow: user regenerates image on scene 3, image job pending, then clicks "Re-render all" videos. Scene 3's video regen reads the OLD `imageUrl` because the new image hasn't landed yet. Worker has no `depends_on` chain set on the bulk insert.
Fix: filter out scenes with active `regenerate_image` jobs OR set `depends_on: pending_image_job_id` on each video insert. (S)

**G-Mi6. Browser-back during the IntakeForm autopost branch (after `scheduleInsert.error` check, before `navigate('/lab/autopost')`) leaves the schedule row created but the user lands back on intake with `setGenerating(false)` still asserted by `finally`.**
File: `src/components/intake/IntakeForm.tsx:684-748, 770-775`.
The `navigate('/lab/autopost')` at line 747 isn't awaited; if the user hits Back faster than React commits, they land back on the form which still says "Submitting…" until `finally` runs. Schedule row is committed. Mostly cosmetic but confusing.
Fix: await navigate (it's sync) and disable Back via `useBlocker` while submitting. (XS)

**G-Mi7. `pollIntervalRef` continues polling at 30 s intervals after `cancelPolling` clears `jobIdRef.current` to null — first guard at line 257 catches it; SECOND-place check at the .eq('id', jobIdRef.current) would error if Supabase ever sends `null` to `.eq`. Tightly coupled to the early return; a refactor that drops the early return reintroduces the bug.**
File: `src/components/editor/useExport.ts:256-269`.
Defensive code is fine today but fragile.
Fix: clear the interval inside `cancelPolling` synchronously and guard with two early returns. (XS)

### Polish

**G-P1. Cleanup-on-unmount effect in `useExport.ts:42-49` has empty dep array and uses captured refs — works today but a future refactor that switches refs to state would silently regress.**
Add an ESLint comment + a unit test that asserts cleanup on unmount.

**G-P2. The 25-min hard deadline in `useExport.ts:274-279` doesn't surface progress — the bar stays where it last rendered, then jumps to "Export timed out". Add a tick on every poll that pushes progress toward 95% even if the worker is silent, then snap to 100/error at the end.**

**G-P3. `handleRow` in useExport's else branch uses `Math.max(prev.progress, rowProgress)` — protects against backward jumps from the realtime/poll dual signal, but a worker that resets a job to retry (line 550-561) writes `progress: 0` and the UI clamps to the previous max, so the user sees a static 60% during a retry. Surface a "Retrying — restarted from scratch" state if `progress` drops below the previous high-water mark by >20.**

---

## Cross-cutting note (for Jury synthesis, not category)

Multiple findings (G-C5, G-Mi2, G-M5, G-M11) all point to the same architectural gap: client-side dedup is best-effort; the server has no transactional barrier between "is this in flight" and "insert this job". The right fix is one Postgres function per task type (`enqueue_<task>_idempotent`) rather than 14 client-side guards. Recommend Forge own this remediation rather than each frontend caller patching individually.

---

## Production Blockers (table)

| ID | Severity | Issue | Fix Effort |
|---|---|---|---|
| G-C1 | Critical | useExport double-submit creates parallel export jobs | XS |
| G-C2 | Critical | IntakeForm Generate is not idempotent — duplicate projects + double credit charge | S |
| G-C3 | Critical | stripe-webhook `invoice.paid` lacks per-invoice idempotency for renewal credits | S |
| G-C4 | Critical | BulkOpModal cancelExport silently kills unrelated download exports | S |
| G-C5 | Critical | Cross-tab debounce defeated; image/video regens have no server dedup | M |
| G-C6 | Critical | Cancel-vs-complete race shows contradictory toasts AND forfeits credits | M |

## Top 10 Priority Fixes (table)

| Rank | ID | Severity | Effort | One-line |
|---|---|---|---|---|
| 1 | G-C3 | Critical | S | Add `stripe_invoice_id` unique index + check in `invoice.paid` handler |
| 2 | G-C2 | Critical | S | Sync ref-lock + DB unique index on duplicate-prevention for `projects` |
| 3 | G-C5 | Critical | M | Server-side per-(project,task,scene) dedup via partial unique index |
| 4 | G-C1 | Critical | XS | `inFlightRef` lock at top of `useExport.startExport` |
| 5 | G-C4 | Critical | S | Filter cancel UPDATE by `payload->>_bulk` so only the active bulk dies |
| 6 | G-C6 | Critical | M | CAS update in worker complete-write + refund route for user cancels |
| 7 | G-M5 | Major | M | Add `master_audio` to fail-closed reaper list OR add resume checkpoint |
| 8 | G-M2 | Major | M | Move auth lockout to server-tracked `failed_login_attempts` table |
| 9 | G-M3 | Major | M | Per-tab session id for ScheduleBlock localStorage draft |
| 10 | G-M11 | Major | M | Pass `Idempotency-Key` to Resend / OpenRouter / Hypereal where supported |

---

End of Ghost findings.
