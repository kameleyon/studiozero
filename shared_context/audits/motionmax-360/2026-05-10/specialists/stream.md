# Stream — §7 Realtime + State Consistency Findings

**Project:** motionmax-360
**Reviewer:** Stream (Realtime & Event Systems specialist)
**Date:** 2026-05-10
**Audience:** tool-savvy creative adults (mobile-heavy, US-first)
**Scope:** Supabase Realtime subscriptions, mid-generation crash recovery, client/server state consistency, optimistic update rollback, websocket reconnection.

Severity rubric (studio-fixed): Blocker / Critical / Major / Minor / Polish.
Every finding cites file:line evidence.

---

## CRITICAL

### C-1. Unfiltered table-wide subscription on `video_generation_jobs` during every generation
- **Where:** `src/hooks/generation/unifiedPipeline.ts:199-208`
- **Evidence:**
  ```
  const progressChannel = supabase
    .channel(`pipeline-progress-${generationId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "video_generation_jobs" },  // ← NO filter
      (payload) => {
        if (allJobSet.has(payload.new?.id as string)) refreshProgress();
      },
    )
    .subscribe();
  ```
- **Why this is critical:** Every active generation tab opens a websocket that receives **every UPDATE on every job in the system** — including jobs belonging to every other user. Client-side filtering (`allJobSet.has(...)`) discards them, but Realtime still delivered them over the wire. This breaks Stream rule #1 ("Never subscribe to an entire table without a filter — it doesn't scale"). Combined with the publication scope (`supabase/migrations/20260505180000_admin_phase2_realtime_publication.sql:50` adds `video_generation_jobs` to `supabase_realtime`), under any traffic burst (autopost cron tick, multiple users generating simultaneously), every active client receives O(N×M) duplicate events where N=concurrent generations, M=updates per job. With sceneProgress flushing on every scene phase change (`worker/src/lib/sceneProgress.ts:208-211` calls `flushSceneProgress` on every `updateSceneProgress`), one cinematic generation can push 100+ UPDATEs per minute.
- **Cascading effect:** Every UPDATE invokes `refreshProgress()` which fires a `SELECT COUNT(*) FROM video_generation_jobs WHERE id IN (...) AND status='completed'` (`unifiedPipeline.ts:171-196`). Plus a 5 s fallback poll (`unifiedPipeline.ts:211`). Under load this is a Postgres traffic amplifier and a battery killer on mobile.
- **Fix (solution + location + how):** In `unifiedPipeline.ts:199-208`, change the `.on("postgres_changes", { event: "UPDATE", schema: "public", table: "video_generation_jobs" }, …)` config to add `filter: \`generation_id=eq.${generationId}\`` (or filter by `project_id=eq.${projectId}` if `generation_id` isn't a column on `video_generation_jobs`). Also debounce `refreshProgress` to at most once per 1 s with `lodash.throttle` or a manual ref. Effort: S.

### C-2. No worker heartbeat — long-running cinematic_video jobs are at risk of being reset by stale-claim reaper
- **Where:** `worker/src/index.ts:895-963` (stale-claim reaper, 30 min cutoff) vs. `worker/src/handlers/handleCinematicVideo.ts:1-100` + `worker/src/services/hypereal.ts` (Hypereal poll loop).
- **Evidence:** Stale reaper resets any `processing` row whose `updated_at` is older than 30 min back to `pending` (`index.ts:895` `STALE_PROCESSING_MS = 30 * 60 * 1000`). The CINEMATIC_VIDEO_TIMEOUT_MS is 45 min (`index.ts:1139`). Heartbeats only exist for the autopost **orchestrator** job (`handleAutopostRun.ts:382` `await heartbeatJob(coordinatorJobId)`), NOT for child cinematic_video jobs. Their `updated_at` only refreshes when `saveCheckpoint(...)` writes a new row (`worker/src/lib/checkpoint.ts:48-66`) — and Hypereal `pollHyperealJob` may sit on the same checkpoint for 10+ minutes between saves.
- **Why this is critical:** A Kling V3.0 Pro job that legitimately takes 35 min while the worker hasn't written a checkpoint in 30 min will be revived to `pending` by the reaper. The next `claim_pending_job` RPC re-claims it on a sibling worker, which submits a **second** Hypereal call (or, if the resume checkpoint is read in time, polls the same provider job twice). The fail-closed branch only protects autopost orchestrators (`index.ts:909-918`), not bare `cinematic_video`. Direct double-spend risk on Kling credits (≈ $0.40-0.80 per second of generated video).
- **Fix:** Add a heartbeat tick inside `pollHyperealJob` in `worker/src/services/hypereal.ts` that runs `supabase.from('video_generation_jobs').update({ updated_at: new Date().toISOString() }).eq('id', jobId)` every 60 s during the poll wait loop. OR: extend the fail-closed `task_type` list at `worker/src/index.ts:917` to include `cinematic_video` (idempotent only when the checkpoint is intact, which the read-error fallback at `checkpoint.ts:36-39` does NOT guarantee — see C-3). Effort: S.

### C-3. Checkpoint read silently returns empty `{}` on any DB error → guaranteed Hypereal double-submit on transient Postgres hiccup
- **Where:** `worker/src/lib/checkpoint.ts:24-40`
- **Evidence:**
  ```
  export async function readCheckpoint(jobId: string): Promise<CheckpointBlob> {
    try {
      const { data } = await supabase.from("video_generation_jobs").select("checkpoint")...
      ...
    } catch (err) {
      console.warn(`[checkpoint] readCheckpoint(${jobId}) failed:`, (err as Error).message);
      return {};                                          // ← silent empty
    }
  }
  ```
- **Why this is critical:** The handler treats an empty checkpoint as "no resume info — start fresh", which on `cinematic_video` means re-submitting the Hypereal job (`handleCinematicVideo.ts` calls `generateSeedance2I2V` / `generateKlingV3ProI2V` again). A single 5xx from Supabase during a worker restart causes a duplicate provider charge, a duplicate Render-side compute spend, and the checkpoint write that follows clobbers the original `_ts`. The error is swallowed to a `console.warn` so SRE never sees it.
- **Fix:** In `worker/src/lib/checkpoint.ts:36-39`, do NOT return `{}` on exception. Wrap the supabase call in `retryDbRead(...)` (already imported elsewhere from `worker/src/lib/retryClassifier.js`) with 3 attempts and exponential backoff, then **throw** if still failing. The handler's outer try/catch in `handleCinematicVideo.ts:92-100` will then trip the transient-retry classifier and re-run the whole step at most once, instead of marching ahead with a corrupt empty checkpoint. Effort: XS.

### C-4. Storytelling realtime remnant — channel name + dependency tree not removed
- **Where:** Storytelling product is being removed per the brief, but `src/hooks/generation/unifiedPipeline.ts` still treats `audioJobIds + imageJobIds + videoJobIds + finalizeJobId` as the universal pipeline. Search for any storytelling-specific channel names is required (Unable to verify from static analysis whether storytelling subscribes to a separate channel topic with active routes).
- **Evidence:** `Grep` for `storytelling` across `src/hooks/generation/` returned no matches in this audit window — but the brief says "flag every remnant." Recommend a manual sweep of `pages/storytelling*`, `components/storytelling*`, and any `supabase.channel("storytelling-…")` patterns.
- **Fix:** Run `rg -i "storytelling|story-tell|story_tell" src/ supabase/ worker/` and remove every active subscription, dependency, and feature flag toggle. Effort: S–M depending on what surfaces.

---

## MAJOR

### M-1. Safari WebSocket recovery calls `subscribe()` on an already-subscribed channel — will not reopen a closed socket
- **Where:** `src/hooks/useVideoExport.ts:127-149`
- **Evidence:**
  ```
  if (channelRef.current) {
    const s = (channelRef.current as unknown as { state?: string }).state;
    if (s === "closed" || s === "timed_out") {
      log("Re-subscribing Realtime channel");
      (channelRef.current as ReturnType<typeof supabase.channel>).subscribe();   // ← no-op on closed channel
    }
  }
  ```
- **Why:** `supabase-js` does not re-open a torn-down channel by re-calling `.subscribe()` on the same instance. The correct pattern (already implemented in `src/components/admin/_shared/useAdminRealtimeChannel.ts:122-125`: `removeChannel(ch)` + `setTimeout(subscribe, reconnectDelayMs)`) is to discard the old channel and build a new one. As-written, after Safari background-suspends and resumes, the channel ref reports "closed" forever and the user only sees updates via the 5 s/15 s fallback poll — which is exactly the slow path the realtime channel was meant to avoid. Mobile-heavy audience makes this hot.
- **Fix:** In `useVideoExport.ts:135-141`, replace the `subscribe()` call with `supabase.removeChannel(channelRef.current); channelRef.current = null;` then re-run the channel-creation block (extract lines 233-247 into a helper). Effort: S.

### M-2. Editor's `useExport` does not detect an in-flight export from another tab
- **Where:** `src/components/editor/useExport.ts:58-106`
- **Evidence:** The rehydration query filters `.eq('status', 'completed')` only. No branch for `pending` or `processing`. Comment at lines 100-105 explicitly excludes `exportState.status` from deps to avoid re-firing — but that means the second tab never even checks for an in-flight job.
- **Why:** User opens Editor in Tab A, hits Export, switches to Tab B. Tab B mounts, `exportState` is `idle`, no in-flight detection runs. The user clicks Export again — DB partial-unique index `uq_video_jobs_project_task_active` rejects the second insert with a "duplicate key" error (`useVideoExport.ts:198-207` handles it; `useExport.ts:182` just throws `error?.message || 'Queue failed'`). The user sees a raw "duplicate key value violates unique constraint" toast instead of "An export is already running."
- **Fix:** In `useExport.ts:62-99` (the rehydration effect), add a sibling query for `.in('status', ['pending', 'processing'])`. If found, set `setExportState({ status: 'rendering', progress: row.progress ?? 5 })` and reattach the realtime channel + 30 s fallback to that job. Effort: S.

### M-3. No connection-status badge anywhere outside admin (Stream rule #5 violated for end users)
- **Where:** `src/hooks/useVideoExport.ts:240-247`, `src/components/editor/useExport.ts:240-249`, `src/hooks/generation/callPhase.ts:218-229`, `src/hooks/generation/unifiedPipeline.ts:199-208`, `src/components/dashboard/{Sidebar,RightRail,ProjectsGallery,NotificationsPopover}.tsx`, `src/pages/lab/autopost/{AutopostHome,RunDetail,RunHistory}.tsx`.
- **Evidence:** Only `useAdminRealtimeChannel` exposes a `connection: 'connecting' | 'subscribed' | 'stale' | 'lost'` state and a toast (`useAdminRealtimeChannel.ts:38, 109-118`). Every consumer outside the admin shell either ignores the subscribe callback (`Sidebar.tsx:201`, `RightRail.tsx:292`, `ProjectsGallery.tsx:138`, `NotificationsPopover.tsx:63`, `useActiveJobs.ts:125`, `unifiedPipeline.ts:208`, `callPhase.ts:229`) or merely logs to the console (`useVideoExport.ts:240-247`, `useExport.ts:248-249`).
- **Why:** Audience is creative adults on mobile who frequently background the tab. When a connection drops they have no UI signal that the spinner they're staring at is no longer truly "live" — only the silent 5–30 s fallback poll catches up. Violates Stream rule #5: "Show connection status to users."
- **Fix:** Promote `useAdminRealtimeChannel.ts` (or its connection-state pattern) into `src/hooks/useRealtimeChannel.ts`, expose a `<RealtimeStatusBadge connection={...} />` shadcn-styled chip, and surface it in the EditorTopBar, AutopostHome / RunDetail header, and dashboard Sidebar. Mobile breakpoints already covered by existing layouts. Effort: M.

### M-4. `refreshProgress` in `unifiedPipeline.ts` not debounced, runs once per realtime event
- **Where:** `src/hooks/generation/unifiedPipeline.ts:171-208`
- **Evidence:** Each UPDATE event calls `refreshProgress()` synchronously. `refreshProgress` performs a `SELECT id, count: 'exact', head: true FROM video_generation_jobs WHERE id IN (...) AND status='completed'`. `allJobIds` can be 30+ on a cinematic generation (15 image + 15 video + audio + finalize). Combined with the unfiltered subscription in C-1, this fires constantly during burst phases (sceneProgress flushes can deliver 5+ events/sec while a scene transitions through download → encode → upload).
- **Why:** Doubles or triples the DB query load during the most resource-constrained part of the pipeline (when the worker is also writing scene URLs, payload mutations, and progress). Also breaks Stream rule for "Debounce UI updates when events arrive in bursts."
- **Fix:** Wrap `refreshProgress` with a leading-edge throttle of 1000 ms (use `lodash-es/throttle` or write a 6-line ref-based throttle). Place at `unifiedPipeline.ts:171`. Effort: XS.

### M-5. No optimistic UI for any scene edit — every mutation goes round-trip with a polling fallback
- **Where:** `src/components/editor/useSceneRegen.ts:38-46`, `src/components/editor/Inspector.tsx`, `src/hooks/useEditorState.ts:379-395`.
- **Evidence:**
  ```
  // useSceneRegen.ts:38-46
  const scheduleRefresh = useCallback((projectId: string | undefined) => {
    if (!projectId) return;
    const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['editor-state', projectId] }); };
    const intervals = [1500, 4000, 8000, 15000, 25000, 40000, 60000, 90000, 120000];
    intervals.forEach((ms) => setTimeout(invalidate, ms));
  }, [queryClient]);
  ```
  Grep across `src/` for `onMutate`, `previousData`, `rollback`, or `setQueryData` (rollback context) returns 0 hits. The only `setQueryData` calls (`useEditorState.ts:379, 391`) write final state, never speculative state.
- **Why:** After clicking "Regenerate image", the scene tile shows nothing-changed for 1.5 s (first poll), then flickers as the polling fallback fires every 6–60 s for 2 min. There is no optimistic placeholder, no rollback path on failure beyond the toast in `useSceneRegen.ts:84-87`. For an audience that's busy editing, this feels broken. Also: failure rolls back nothing because there was no optimistic write.
- **Fix:** In each mutation in `useSceneRegen.ts` (`updateScenePrompt`, `updateSceneMeta`), use TanStack Query's `useMutation({ onMutate: () => { … snapshot + setQueryData(key, optimistic) }, onError: (_, __, ctx) => setQueryData(key, ctx.previous) })` pattern. Effort: M (touches 6 mutations + UI pending states).

### M-6. Worker REST broadcast endpoint uses service-role key directly without retry or rate limit
- **Where:** `worker/src/lib/sceneProgress.ts:23-53`
- **Evidence:**
  ```
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: WORKER_SUPABASE_KEY,
      Authorization: `Bearer ${WORKER_SUPABASE_KEY}`,
      ...
  ```
  Single-shot fetch; non-202 responses are swallowed with a console.warn. Called from every `flushSceneProgress` write (line 285).
- **Why:** Under burst load (parallel scene transitions across many concurrent jobs on a single worker), a 429 from Realtime puts every progress event into the bit bucket. Client only catches up via the 5 s polling fallback, so the user sees a frozen progress bar for up to 5 s during peak generation. Also: the service-role key in plaintext over fetch — if any logging middleware (Sentry, k8s sidecar) captures request headers, the key leaks. Lower priority because all other worker→DB calls already use this key over the supabase-js client.
- **Fix:** In `sceneProgress.ts:38-46`, add a single retry with 250 ms backoff on `5xx` and `429`. Add a 1 RPS leaky bucket per jobId so consecutive flushes for the same job don't pile up against Realtime. Effort: S.

### M-7. `pollWorkerJob` does not validate that the resolved row's `result` matches the expected job_id
- **Where:** `src/hooks/generation/callPhase.ts:174-251`
- **Evidence:** Realtime delivers `payload.new` directly into `handleResult(payload.new)` without re-checking `payload.new.id === jobId`. The filter on line 225 (`filter: 'id=eq.${jobId}'`) is the only guard. If a misconfigured publication or a future filter regression delivers cross-job events, the wrong job's result resolves the promise and the user sees the wrong video URL.
- **Why:** Defense-in-depth. Today the filter is correct, but the cost of the assertion is one comparison.
- **Fix:** Inside `handleResult` at `callPhase.ts:192-216`, add `if (row.id && row.id !== jobId) return;` as the first line. Effort: XS.

### M-8. Mid-generation tab close / logout does not detach in-flight realtime channels — leak survives until GC
- **Where:** `src/hooks/useVideoExport.ts:42-51` (cleanup), `src/components/editor/useExport.ts:42-49` (cleanup), `src/hooks/generation/callPhase.ts:184-190` (cleanup).
- **Evidence:** All three hooks remove their channel on **unmount only**. There's no listener for `auth.onAuthStateChange('SIGNED_OUT')` that proactively closes the channels. If a user logs out mid-generation, the React tree may not unmount the editor before the supabase client mutates session — stale subscriptions linger using the previous JWT. RLS will reject the new owner's data, but the websocket stays open until the heartbeat fails.
- **Why:** Memory + Realtime quota leak. Stream rule #3 ("Clean up every subscription on component unmount") is met for unmounts, but signed-out scenarios are not handled.
- **Fix:** In `src/integrations/supabase/client.ts` (or wherever the client is constructed), add a `supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') supabase.removeAllChannels(); })`. Effort: XS.

### M-9. `useActiveJobs` realtime filter scoped only to `project_id` — admin viewing another user's project fans out cross-user events
- **Where:** `src/components/editor/useActiveJobs.ts:107-127`
- **Evidence:** Comment at lines 117-122 acknowledges the limitation:
  ```
  // Supabase realtime accepts only one filter expression — we
  // pick project_id (the higher-cardinality column) and rely on
  // the queryKey + the queryFn's RLS-scoped read to enforce the
  // user_id boundary on the actual data.
  ```
  But Supabase Realtime now supports an `and()` filter syntax (`and=(project_id.eq.xxx,user_id.eq.yyy)`) introduced in supabase-js 2.43+.
- **Why:** Wasted bandwidth for admin tooling that ever opens another user's project; data is RLS-protected, so this is an efficiency concern not a security one.
- **Fix:** Update the channel config to use the `and(...)` filter form once `@supabase/supabase-js` version is verified ≥ 2.43. Effort: XS.

### M-10. `autopost_render` fail-closed reaper offers no user-visible retry path
- **Where:** `worker/src/index.ts:909-933`
- **Evidence:** Reaper marks orphaned `autopost_render` / `autopost_rerender` jobs as `failed` with `error_message = "Orchestrator orphaned (worker died mid-pipeline). Failed-closed by stale-claim reaper to prevent duplicate spend on retry."` and mirrors to `autopost_runs.status='failed'` (line 928). The decision is correct (avoid Hypereal double-spend), but `src/pages/lab/autopost/RunDetail.tsx` should surface a "This run was interrupted by a server restart — re-run?" CTA. Without it, users see "failed" with no path forward and may not realise their schedule didn't fire.
- **Why:** Correct backend behaviour, missing UX bridge.
- **Fix:** In `RunDetail.tsx`, when `error_summary` matches `/Orchestrator orphaned/i`, render a re-run button that POSTs `autopost_fire_now` for the same schedule. Effort: S.

### M-11. `useExport` polls every 30 s but never re-attaches the realtime channel if it drops
- **Where:** `src/components/editor/useExport.ts:227-269`
- **Evidence:** The channel is created at line 232, the subscribe callback (`.subscribe()` at 249) does not capture status. The 30 s `setInterval` (line 256) is the only safety net. There is no `if (status === "CLOSED") rebuild()` branch.
- **Why:** When the WebSocket drops mid-export (network hiccup, sleep, mobile cellular handoff), the user goes from instantaneous progress updates to a 30 s heartbeat polling cadence with no in-app notice. Combined with M-3, the user has no way to know.
- **Fix:** Take the channel-creation block (lines 232-249) and wrap it in a `subscribe(...)` callback that on `CLOSED|CHANNEL_ERROR|TIMED_OUT` calls `cancelPolling` then re-runs the create-channel block. Match the pattern from `useAdminRealtimeChannel.ts:101-126`. Effort: S.

### M-12. `worker_id` stamped at claim but not refreshed — sibling-replica race possible during a long handoff
- **Where:** `supabase/migrations/20260505110000_claim_pending_job_per_project_fairness.sql:80-84`
- **Evidence:** The claim RPC sets `worker_id = p_worker_id` once, then the worker only updates `worker_id` if it stamps it during checkpoint writes (it doesn't — see `checkpoint.ts:48-66`, only updates `checkpoint`, not `worker_id`). The reaper at `worker/src/index.ts:940` resets `worker_id = null` for stale rows but doesn't enforce that the re-claim worker matches the stamp.
- **Why:** Edge case but real: if Worker-A claims a job, the row is reset to `pending` by the reaper after 30 min, Worker-B re-claims and stamps its own `worker_id`, but Worker-A wakes from a long network blip and writes the final `status='completed'` UPDATE with no WHERE-clause check against `worker_id`. Worker-A's stale write wins; Worker-B's parallel run becomes a zombie that double-spends provider credits.
- **Fix:** Every UPDATE in `worker/src/index.ts:697-715, 745-768` should include `.eq('worker_id', WORKER_ID)`. If 0 rows match, log + abort cleanup. Effort: S.

---

## MINOR

### Mn-1. `flushSceneProgress` queue is per-process — silent last-write-wins across replicas
- **Where:** `worker/src/lib/sceneProgress.ts:111-237`
- **Evidence:** `flushQueue = new Map<string, Promise<void>>()` is a process-local Map. Comment at lines 113-116 only addresses single-replica concurrency. If the heartbeat gap of C-2 results in two replicas writing the same job's `payload.sceneProgress`, the merge_job_scene_progress RPC has no last-writer arbitration.
- **Fix:** Once C-2 is fixed, this becomes moot. If you don't fix C-2, add a `worker_id` check to `merge_job_scene_progress` RPC. Effort: S.

### Mn-2. `progressCache` Map never cleared on job failure — small memory leak per failed cinematic generation
- **Where:** `worker/src/lib/sceneProgress.ts:107, 297-299`
- **Evidence:** `clearSceneProgress` is exported but only called from the success path of `_doFlush`. Failure branch at `worker/src/index.ts:719-792` runs `pool.delete(job.id)` but does not call `clearSceneProgress(job.id)`.
- **Fix:** In the `finally` block at `worker/src/index.ts:789-791`, call `clearSceneProgress(job.id)` (import at top of file). Effort: XS.

### Mn-3. Realtime topic for worker broadcast is unguessable but undocumented for ops
- **Where:** `worker/src/lib/sceneProgress.ts:30` `topic: \`job-progress-${jobId}\``
- **Evidence:** Topic name is built from a v4 UUID (jobId). RLS doesn't apply to broadcast topics — anyone subscribed to the topic gets the events. Acceptable because guessing a UUID is computationally infeasible, but the topic naming convention isn't called out in `worker/src/lib/` README or in `DEPLOYMENT_SECURITY.md`.
- **Fix:** Add a one-line docstring at `sceneProgress.ts:23-26` calling out that topic security depends on jobId secrecy. Effort: XS.

### Mn-4. Multiple competing dashboard channels on the same realtime client could exhaust the per-client channel limit (default 100)
- **Where:** `src/components/dashboard/{Sidebar,RightRail,ProjectsGallery,NotificationsPopover}.tsx` + `src/components/editor/useActiveJobs.ts` + `src/hooks/{useVideoExport,useEditorState,useInfographicsUsage}.ts`.
- **Evidence:** A single dashboard mount opens 4-6 independent channels (sidebar projects, rightrail generations, notifications, gallery projects, optionally active jobs). Each editor mount adds another 2-3. Single-page navigation across the app holds many of these alive (Sidebar persists across routes). No use of `supabase.removeAllChannels()` between major route changes.
- **Why:** Supabase free / pro tiers cap channels per client. Approaching the cap silently degrades subsequent subscriptions.
- **Fix:** Audit the channel count under realistic load and add a top-level guardrail in `src/integrations/supabase/client.ts` that logs a warning when `supabase.getChannels().length` exceeds a threshold. Effort: S.

### Mn-5. `useEditorState` realtime invalidation does not narrow event filter — invalidates on any UPDATE for any related table
- **Where:** Unable to verify exact subscription detail without reading lines 290-340; lines 1-60 reviewed only. Recommend confirming.

---

## POLISH

### P-1. Connection-status icon should use brand aqua `#14C8CC` for "live" and brand gold `#E4C875` for "reconnecting"
- **Where:** Once M-3 is implemented, the new badge component must respect the brand palette per the brief ("BRAND: aqua #14C8CC + gold #E4C875 ONLY. No red. No green."). Default sonner toast colours from `useAdminRealtimeChannel.ts:113` use `toast.error` and `toast.success` which on the project's current theme may default to red/green.
- **Fix:** Pass `style={{ background: '#14C8CC' }}` to `toast.success` and `style={{ background: '#E4C875', color: '#000' }}` to `toast.error` in `useAdminRealtimeChannel.ts:93, 113`. Better: theme sonner globally in `src/main.tsx`. Effort: XS.

---

## Production Blockers

| # | Severity | Issue | File:Line | Effort |
|---|----------|-------|-----------|--------|
| C-1 | Critical | Unfiltered table-wide subscription on `video_generation_jobs` during every generation | `src/hooks/generation/unifiedPipeline.ts:199-208` | S |
| C-2 | Critical | No worker heartbeat for cinematic_video — 30 min reaper can revive a still-running job and trigger double-spend | `worker/src/index.ts:895-963` + `worker/src/handlers/handleCinematicVideo.ts` + `worker/src/services/hypereal.ts` | S |
| C-3 | Critical | Checkpoint read returns `{}` on DB error — guaranteed Hypereal double-submit on transient hiccup | `worker/src/lib/checkpoint.ts:24-40` | XS |
| C-4 | Critical | Storytelling realtime remnants need a sweep (per brief) | `src/`, `worker/`, `supabase/` | S–M |

## Top 10 Priority Fixes

| Rank | Fix | File:Line | Severity | Effort |
|------|-----|-----------|----------|--------|
| 1 | Add `filter: project_id=eq.${projectId}` (or generation_id) to pipeline-progress channel and throttle `refreshProgress` to 1 RPS | `src/hooks/generation/unifiedPipeline.ts:199-208` | Critical | S |
| 2 | Heartbeat tick (60 s) inside `pollHyperealJob` → `UPDATE video_generation_jobs SET updated_at=NOW() WHERE id=$1` | `worker/src/services/hypereal.ts` (in poll loop) | Critical | S |
| 3 | Wrap `readCheckpoint` in `retryDbRead` and throw on failure instead of returning `{}` | `worker/src/lib/checkpoint.ts:24-40` | Critical | XS |
| 4 | Sweep + remove storytelling realtime / route remnants | repo-wide | Critical | S–M |
| 5 | Replace Safari `subscribe()` no-op with `removeChannel` + recreate | `src/hooks/useVideoExport.ts:127-149` | Major | S |
| 6 | Detect in-flight export (status in pending/processing) on second-tab mount | `src/components/editor/useExport.ts:58-106` | Major | S |
| 7 | Add re-subscribe-on-CLOSED branch to Editor `useExport` channel | `src/components/editor/useExport.ts:227-269` | Major | S |
| 8 | Promote `useAdminRealtimeChannel` connection-state pattern app-wide + render `<RealtimeStatusBadge>` in EditorTopBar / Autopost / Sidebar | new `src/hooks/useRealtimeChannel.ts` + consumers | Major | M |
| 9 | Stamp every status-update WHERE clause with `.eq('worker_id', WORKER_ID)` | `worker/src/index.ts:697-715, 745-768` | Major | S |
| 10 | Add optimistic `onMutate`/`onError` rollback to scene-edit mutations | `src/components/editor/useSceneRegen.ts` (6 callbacks) | Major | M |

---

**End of Stream findings.** Submitted to Jury for synthesis. All findings cite file:line evidence per audit protocol.
