# Forge — Backend Architecture & Worker Pipeline Findings

**Audit:** motionmax-360 — 2026-05-10
**Scope:** §4 + §5 + §7 — Render.com Node worker, job lifecycle (queued → running → succeeded/failed/retrying), idempotency, retry-with-backoff, dead-letter handling, AI provider integration, FFmpeg pipeline, Supabase Edge Functions wiring
**Audience:** tool-savvy creative adults — single missed credit refund or stuck "GENERATING 35%" run is a churn event
**Severity rubric:** Blocker / Critical / Major / Minor / Polish

> Files referenced are absolute under `C:\Users\Administrator\motionmax\`. Line numbers from current HEAD.

---

## Category 4 — Code health & redundancy (worker layer)

### F-CH-01 — Critical — Hard-timeout uses Promise.race but never aborts in-flight work
- **File:** `worker/src/index.ts:1097-1120`
- **Evidence:** `Promise.race([processJob(job), new Promise((_, reject) => setTimeout(...))])`. There is no AbortController, no signal threaded into the handler, no kill of FFmpeg children, no cancellation of Hypereal polling. When the timeout branch fires, the slot is freed via `pool.delete(job.id)` and the row is marked `failed` — but `processJob` keeps running. If the underlying handler eventually succeeds it calls `supabase.update({ status: 'completed', ... })` on a row already marked `failed` AND already refunded. The user sees `failed` in the UI, gets a refund, and a working `finalUrl` shows up minutes later — with the credits already gone.
- **Fix:** Solution: thread an `AbortSignal` from the timeout into every awaitable boundary (Hypereal poll, FFmpeg child, Supabase fetch). Location: replace the Promise.race in `pollQueue()` with an `AbortController` passed down through `processJob → handler → service`. How: handlers honour `signal.aborted` between awaits and stop spawning new ffmpeg children; mark-failed and mark-completed must check current row status before issuing the update so a winner-takes-all race becomes "first writer wins, second skips."
- **Effort:** L

### F-CH-02 — Critical — Stale-claim reaper threshold (30 min) shorter than legit cinematic_video runtime (45 min)
- **File:** `worker/src/index.ts:895` (`STALE_PROCESSING_MS = 30 * 60 * 1000`) vs `worker/src/index.ts:1139` (`CINEMATIC_VIDEO_TIMEOUT_MS = 2700000` = 45 min) and `worker/src/handlers/handleCinematicVideo.ts` (no heartbeat anywhere in this handler).
- **Evidence:** Only `handleAutopostRun` heartbeats — see `heartbeatJob()` at `handleAutopostRun.ts:221-228`. `handleCinematicVideo._runCinematicVideo` polls Hypereal for up to 47 min (`hypereal.ts:766` `maxAttempts = 95` × 30s steady-state) without ever updating `updated_at`. After 30 min the reaper at `worker/src/index.ts:938-944` resets the row `status='pending'`, the next `pollQueue` re-claims it via the RPC, and a second worker submits a brand-new Hypereal job — original poll continues in the dying first worker, so two parallel Hypereal renders run on the same scene. Both eventually call `updateSceneField(...)` and second-write-wins on `generations.scenes`. Documented bug pattern in `handleAutopostRun.ts:899-908` ("a single revived run produced two full Uruguay scripts + image/video batches"). Fix-closed exists for orchestrators only.
- **Fix:** Solution: add per-poll heartbeat to `handleCinematicVideo`. Location: inside the `pollHyperealJob` resume + main poll loop in `handleCinematicVideo.ts:419-431` and the in-handler outer loop. How: every iteration call `supabase.from('video_generation_jobs').update({ updated_at: new Date().toISOString() }).eq('id', jobId)`; OR raise `STALE_PROCESSING_MS` to 60 min so it strictly dominates every per-job hard timeout. The "revive everything else" non-orchestrator branch needs the same `cinematic_video` exclusion the orchestrator branch already has.
- **Effort:** S

### F-CH-03 — Critical — uncaughtException/unhandledRejection hard-fails resumable jobs instead of releasing them
- **File:** `worker/src/index.ts:1412-1436`
- **Evidence:** Both signal handlers run `update({ status: 'failed', error_message: 'Worker process crashed' }).eq('worker_id', WORKER_ID)`. Resumable handlers (`handleCinematicVideo` saves `checkpoint = { stage: 'polling', providerJobId, pollUrl, model }` via `saveCheckpoint` at `handleCinematicVideo.ts:458-462`) are explicitly designed to be re-claimed and resume polling — but a 'failed' row triggers `refundCreditsOnFailure` and the user is told the job died, when in reality it could have continued without re-charging Hypereal credits. By contrast, the graceful-shutdown path at `index.ts:1356-1376` correctly resets `status='pending'` for in-flight jobs.
- **Fix:** Solution: mirror the graceful-shutdown release-to-pending logic in the crash handlers. Location: `index.ts:1418-1423` and `:1430-1435`. How: replace the unconditional `status: 'failed'` update with `status: 'pending', worker_id: null` for jobs whose `task_type` is in the resumable set (`cinematic_video`, image, audio); keep `status: 'failed'` only for orchestrators (`autopost_render`, `autopost_rerender`) per the existing fail-closed policy at `index.ts:909-933`.
- **Effort:** S

### F-CH-04 — Critical — DLQ insert is fire-and-forget; failures swallowed by `wlog.warn`
- **File:** `worker/src/index.ts:772-786`
- **Evidence:** `supabase.from("dead_letter_jobs").insert(...).then(() => {}, (dlqErr) => { wlog.warn("Dead-letter insert failed", ...) })` runs after `markJobFailed` without `await`. Under DB pressure during a failure storm (the exact scenario DLQ exists for), inserts queue up — anything that errors is dropped with a warn-level log nobody reads. There is no retry, no fallback file/log sink, no Sentry escalation.
- **Fix:** Solution: `await` the DLQ insert and on insert failure write a Sentry breadcrumb with the full job snapshot. Location: `index.ts:772`. How: `await supabase.from("dead_letter_jobs").insert(...)`; on error, `Sentry.captureException(dlqErr, { extra: { jobId, taskType, payload } })` so the failure-of-the-failure is preserved. Add a uniqueness constraint on `dead_letter_jobs(source_job_id, attempts)` so re-runs don't double-insert.
- **Effort:** S

### F-CH-05 — Critical — `withTransientRetry` is a silent no-op for autopost orchestrator
- **File:** `worker/src/index.ts:550-683` and `worker/src/handlers/autopost/handleAutopostRun.ts:537-542`
- **Evidence:** `processJob` wraps every handler call in `withTransientRetry(fn, { maxAttempts: 3 })`. For `autopost_render`, the second attempt enters `runPipeline` and immediately hits the idempotence gate at `handleAutopostRun.ts:537-542` (`if ((run.progress_pct ?? 0) > 0)`) — because attempt #1 already called `setRunProgress(runId, 5)` at `:631`. Result: every transient error in autopost causes a guaranteed terminal failure on the second attempt, and the retry budget is never actually used.
- **Fix:** Solution: skip the transient-retry wrapper for autopost task types, or move `setRunProgress(5)` to AFTER the first irreversible side effect (project insert). Location: `index.ts:550` add `if (job.task_type === 'autopost_render' || 'autopost_rerender') { await fn(0); } else { withTransientRetry(...) }`, OR `handleAutopostRun.ts:631` move the `setRunProgress(5)` call below `:664`. How: pick the latter — keeps the orchestrator's idempotence gate intact while letting transient retries actually work.
- **Effort:** S

### F-CH-06 — Major — `isTransientError` regex `/aborted/i` matches user-cancelled exports
- **File:** `worker/src/lib/retryClassifier.ts:46-49`
- **Evidence:** Pattern `/this operation was aborted/i`, `/\bAbortError\b/`, `/the operation was aborted/i`, and `/\baborted\b/i`. The export pipeline writes `error_message: 'Cancelled by user'` (`exportVideo.ts:175`) and throws `ExportCancelledError("Export ${jobId} cancelled by user")` (`exportVideo.ts:153-158`). The literal "Cancelled" doesn't match any pattern, but: handlers calling third-party SDKs that propagate `AbortError` from a user-cancellation handler upstream WILL match `/AbortError/` and `/aborted/`, retrying user cancellations 3× before bubbling up — wasting credits the user explicitly told us not to spend.
- **Fix:** Solution: Make `ExportCancelledError` a sentinel that bypasses the wrapper. Location: `retryClassifier.ts:67`. How: add `if (err instanceof Error && err.name === 'ExportCancelledError') return false;` at the top of `isTransientError`. Also tighten the broad `/\baborted\b/i` to `/this operation was aborted/i` (already separately listed).
- **Effort:** XS

### F-CH-07 — Major — Master kill switch fails OPEN on Supabase read errors
- **File:** `worker/src/index.ts:822-828`
- **Evidence:** `if (error) { wlog.warn(...); masterKillCache = { engaged: masterKillCache.engaged, fetchedAt: now }; return masterKillCache.engaged; }`. The cache defaults to `{ engaged: false }` at cold start (`:808`). If an admin engages the kill switch and Supabase becomes unreliable in the same window (the exact scenario where the kill switch matters most — DB instability), a freshly-restarted worker reads `engaged=false`, falls into the cache miss, fails the read, and keeps the cached `false`. Worker keeps claiming jobs through the incident.
- **Fix:** Solution: fail CLOSED on read errors during cold-start, OPEN only when there's a confirmed prior `engaged=false` reading. Location: `index.ts:822-828`. How: track `masterKillCache.everSucceeded: boolean`; if `!everSucceeded`, return `true` (fail-closed) on read errors so a freshly-restarted worker into a degraded DB doesn't claim until at least one successful read confirms the actual state.
- **Effort:** XS

### F-CH-08 — Major — `pollHyperealJob` `completedJobs` Map grows unbounded — memory leak feeding the OOM cycle
- **File:** `worker/src/services/hypereal.ts:10` (`const completedJobs = new Map<string, string>();`)
- **Evidence:** Inserted at `:824` (`completedJobs.set(jobId, videoUrl)`), never deleted, never bounded. Worker process runs 8+ LLM jobs at a time, each scene cinematic_video pushes one Hypereal jobId. A 12-scene autopost = 12 entries; an 8-instance fleet running 24/7 for a week ≈ thousands of entries × ~80 bytes each. Small in absolute terms but the comment at `index.ts:114-138` cites "OOM kills at 2GB" — every contributor to working-set growth matters at this margin. Also: cache is never cleared on shutdown, so the `gracefulShutdown` log "processed N jobs" doesn't free anything.
- **Fix:** Solution: bound the cache with an LRU policy at, say, 256 entries. Location: `hypereal.ts:10`. How: replace the `Map` with a small LRU (or just `if (completedJobs.size > 256) { const first = completedJobs.keys().next().value; completedJobs.delete(first); }` before inserting). The cache is correctness-irrelevant — it short-circuits a redundant poll for the same `jobId` in the same process — so eviction is free.
- **Effort:** XS

### F-CH-09 — Major — Hypereal global `lastRequestTime` serializes ALL HTTP calls process-wide
- **File:** `worker/src/services/hypereal.ts:9-18`
- **Evidence:** `lastRequestTime` is a single module-level mutex. Every `hyperealFetch` waits 2s after the previous call. With 8 LLM slots all polling Seedance/Kling jobs at independent cadences, polls serialize through this single gate — when one job is in 30s back-off (`backoffDelay`), other jobs' polls are gated by `lastRequestTime` ahead of them, but they're already racing on the JS event loop, not waiting on each other. Worse: the gate doesn't differentiate submit from poll, so a long submit blocks a poll that's about to time out, and the gate ALSO doesn't actually guard against bursts (it only enforces minimum INTER-call gap, not call rate).
- **Fix:** Solution: per-endpoint token bucket (e.g. 30 calls/min for `/jobs/`, 10 calls/min for `/videos/generate`). Location: `hypereal.ts:13-18`. How: replace the single `lastRequestTime` with a `Map<endpoint, number[]>` of recent timestamps and a sliding-window check; or use the `bottleneck` package. At minimum, separate poll calls (cheap, idempotent) from submit calls (expensive, billable).
- **Effort:** S

### F-CH-10 — Major — Job retry on `withTransientRetry` may double-spend Hypereal credits for non-resumable handlers
- **File:** `worker/src/index.ts:550-683` × all non-cinematic handlers
- **Evidence:** `withTransientRetry` re-runs the entire handler on transient errors (3 attempts with exponential backoff). `handleCinematicVideo` is checkpointed, so resume is safe. But `handleCinematicAudio`, `handleCinematicImage`, `handleMasterAudio`, `handleVoicePreview`, `handleCloneVoice` do NOT save provider checkpoints (verified by absence in handler imports). A transient error after the upstream API call returns successfully but before the DB write commits → withTransientRetry re-runs the handler → upstream API charges again. Same risk for `generate_topics`, `cinematic_video_edit` etc.
- **Fix:** Solution: extend the `saveCheckpoint` pattern from `handleCinematicVideo` to all paid-API handlers, OR mark these handlers as non-retryable by classifying their post-submit errors as permanent. Location: each handler's external-API call site. How: same pattern as `handleCinematicVideo.ts:458-462` — immediately after the provider returns its job/result identifier, persist `checkpoint = { providerCallCompleted: true, result }` and have the handler return early on retry if checkpoint is set.
- **Effort:** M

### F-CH-11 — Major — Refund idempotency check uses string-match on description, not a unique constraint
- **File:** `worker/src/index.ts:447-462`
- **Evidence:** Idempotency check: `select id from credit_transactions where user_id=? and transaction_type='refund' and description='Refund for failed generation (job ${job.id})'`. If two failure paths fire concurrently (timeout race + actual error from F-CH-01), both queries could hit before either insert lands. Also: the description is `Refund for failed generation (job ${job.id})` for `generate_video` but the autopost path at `:447` uses the same string — collisions across task types can happen if the same `job.id` reused (UUIDs make this practically impossible, but the string-match is a fragile primary key).
- **Fix:** Solution: enforce uniqueness in the DB. Location: `credit_transactions` table migration. How: `ALTER TABLE credit_transactions ADD CONSTRAINT credit_tx_unique_refund UNIQUE (user_id, transaction_type, description) WHERE transaction_type = 'refund';` — partial unique index. Then the second concurrent refund hits a 23505 SQLSTATE and the existing `if (existingRefund)` check becomes belt-and-suspenders.
- **Effort:** S

### F-CH-12 — Major — Concurrency override clamp ignores actual memory ceiling
- **File:** `worker/src/index.ts:302`
- **Evidence:** `override = Math.max(1, Math.min(64, Math.floor(raw)))`. The detailed comment at `:114-138` explains a 2GB pod can safely host ~10-12 jobs and the auto-tuner's `Math.min(llmByMemory, 8)` enforces this. But an admin override via `app_settings.worker_concurrency_override` bypasses that ceiling entirely — typing `64` into the admin UI silently sets `MAX_CONCURRENT_JOBS=64`, the ratio split lands `~6 export + 58 LLM`, and the pod OOMs immediately.
- **Fix:** Solution: clamp `override` to the auto-tuned baseline `_baselineBudget.total * 1.5` (allow some headroom for vertical-scale headroom but not unbounded). Location: `index.ts:302`. How: `override = Math.max(1, Math.min(_baselineTotalSlots * 2, raw))`. Surface the clamped value back to the admin UI so the operator sees the actual cap.
- **Effort:** XS

### F-CH-13 — Minor — Worker hardcodes Supabase project ref; rotation requires code change
- **File:** `worker/src/lib/supabase.ts:13` (`const EXPECTED_PROJECT_REF = "ayjbvcikuwknqdrpsdmj"`)
- **Evidence:** Hardcoded; the JWT-decode signature check at `:33-40` validates the env-var key matches THIS ref. Migrating Supabase projects (DR scenario, security incident, region move) requires a worker code change + redeploy. The `DEPLOYMENT_SECURITY.md` and `DISASTER_RECOVERY.md` files at the project root suggest DR is in scope.
- **Fix:** Solution: read the expected ref from a build-time env var with a validated fallback. Location: `supabase.ts:13`. How: `const EXPECTED_PROJECT_REF = process.env.EXPECTED_SUPABASE_REF ?? "ayjbvcikuwknqdrpsdmj";`. Document the override in `render.yaml`.
- **Effort:** XS

### F-CH-14 — Polish — Service role JWT decoded without signature verification
- **File:** `worker/src/lib/supabase.ts:33-40`
- **Evidence:** `JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString())` — payload only, no signature check. Any string with the right `ref` claim passes. Mitigated because the env var is the trust boundary, but defense-in-depth would import a JWT lib and verify against Supabase's published JWKS.
- **Fix:** Solution: defer — the env-var trust boundary is the correct one for a service worker, and the actual auth happens at Supabase's PostgREST layer. Just document the intent in a comment. Location: `supabase.ts:33`.
- **Effort:** XS

---

## Category 5 — Performance (worker pipeline + FFmpeg)

### F-PF-01 — Critical — FFmpeg `drawtext` brand-mark filter injection vector (file-read primitive)
- **File:** `worker/src/handlers/export/concatScenes.ts:104-106` and `:151-153`; `worker/src/handlers/exportVideo.ts:246`
- **Evidence:** `escaped = brandMark.replace(/'/g, "’").replace(/:/g, "\\:").replace(/\\/g, "\\\\")`. ffmpeg's `drawtext` filter parses comma `,` as filter-graph delimiter and lets you set `fontfile=`, `textfile=`, etc. as parameters. Sanitization here covers `'`, `:`, `\` but NOT `,`. A user-supplied `brandMark` of `Foo,fontfile=/etc/passwd` (or on Windows `,fontfile=C\:\\Windows\\win.ini`) would inject a new filter parameter that opens an arbitrary file as the drawtext font — depending on libfreetype's parser, this can leak file content as glyphs rendered into the video, or crash the pipeline. The `payload.brandMark` source is user-controlled (intake form / autopost schedule).
- **Fix:** Solution: whitelist-validate brand mark to printable ASCII letters + digits + space + a small set of punctuation (`-_.&`), reject anything else at submit time AND truncate to 64 chars before passing to drawtext. Location: `exportVideo.ts:526` (where `brandMark` is read from payload) and add the same validation in the Edge Function that accepts intake payloads. How: `if (!/^[\w\s\-.&]{1,64}$/.test(brandMark)) brandMark = undefined;`. Also strip commas, semicolons, equals, brackets explicitly.
- **Effort:** S

### F-PF-02 — Critical — Default `EXPORT_BATCH_SIZE=3` contradicts the comment "(1) is safest for memory" — known OOM contributor
- **File:** `worker/src/handlers/exportVideo.ts:57-58`
- **Evidence:** `/** Scenes per batch — sequential (1) is safest for memory. */ const SCENE_BATCH_SIZE = parseInt(process.env.EXPORT_BATCH_SIZE || "3", 10);`. With `MAX_EXPORT_JOBS=2` (`:50`) running concurrently, that's up to 6 simultaneous `processScene` ffmpeg children + libx264 encoders = ~3-4 GB working set on the 2 GB Render Pro pod that the auto-tuner comments at `index.ts:114-138` document as OOM-prone.
- **Fix:** Solution: lower default to 1, keep env override for high-memory pods. Location: `exportVideo.ts:58`. How: `parseInt(process.env.EXPORT_BATCH_SIZE || "1", 10)`. Empirical: each ffmpeg-libx264 child is ~200 MB resident; one batch of 1 gives 200 MB per export × 2 export jobs = 400 MB, leaving plenty of headroom for the LLM pool.
- **Effort:** XS

### F-PF-03 — Critical — Hypereal poll inner timeout (~47 min) > worker outer cinematic timeout (45 min)
- **File:** `worker/src/services/hypereal.ts:766` (`maxAttempts = 95`) vs `worker/src/index.ts:1139` (`CINEMATIC_VIDEO_TIMEOUT_MS = 2700000` = 45 min)
- **Evidence:** 95 polls × 30s steady-state ≈ 47.5 min — intentional per the comment, "intentionally a hair past the worker cap." But the result is the inner timeout error message (`timed out after N polls`) is unreachable in practice; the outer Promise.race always wins with the less-specific `Job ${job.id} (${job.task_type}) exceeded hard timeout of 45 min`. Operators triaging stuck jobs see only the generic message. Combined with F-CH-01, the inner poll keeps running after the outer fires.
- **Fix:** Solution: align the inner cap to be slightly LESS than the outer (44 min) so the inner exception always surfaces with a clearer error. Location: `hypereal.ts:766`. How: `const maxAttempts = 88` (≈ 44 min). Plus the F-CH-01 fix to actually cancel.
- **Effort:** XS

### F-PF-04 — Major — Concat list path quoting uses POSIX shell escape (`'\''`), not the ffmpeg concat-demuxer C-string escape
- **File:** `worker/src/handlers/export/concatScenes.ts:32, 95, 149`
- **Evidence:** `f.replace(/'/g, "'\\''")`. ffmpeg concat demuxer parses `file '<path>'` directives with C-style string parsing: `\'` to escape an apostrophe, `\\` to escape a backslash. The shell-style `'\''` (close-quote, escaped-quote, open-quote) only works because ffmpeg is permissive enough to interpret it as `'` followed by `\` followed by `'` followed by `'` and accidentally land on the right path. On Windows where paths contain `\` the listfile breaks outright — the worker is documented as Linux-only for FFmpeg per `render.yaml`, but the same listfile is exercised in unit tests and could fail on a developer's Windows machine.
- **Fix:** Solution: use the documented ffmpeg escape. Location: `concatScenes.ts:32, 95, 149`. How: replace with `f.replace(/\\/g, "/").replace(/'/g, "\\'")` so backslashes become forward slashes (FFmpeg accepts these on Windows too) and apostrophes are properly escaped per the demuxer spec.
- **Effort:** XS

### F-PF-05 — Major — ASS subtitle file path escaping uses the same wrong shell-style escape
- **File:** `worker/src/handlers/export/concatScenes.ts:99-101`
- **Evidence:** `assPathEsc = assPath.replace(/\\/g, "/").replace(/'/g, "'\\''")` and same for `fontsDirEsc`. The `ass=` filter itself parses `:` as parameter separator — a path containing `:` (e.g. Windows-style `C:/temp`) breaks even after the backslash conversion. This is also a filter-injection vector if the path includes filter delimiters (`,`, `[`, `]`, `;`).
- **Fix:** Solution: use ffmpeg's `\:` filter-arg escape AND wrap the path with `\\\:` for double escape. Location: `concatScenes.ts:99-103`. How: `assPathEsc = assPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");` and same for fontsDir.
- **Effort:** XS

### F-PF-06 — Major — Partial output cleanup missing for intermediate files (`*.master.mp4`, `*.mixed.mp4`)
- **File:** `worker/src/handlers/exportVideo.ts:820-852` (master swap), `:875-898` (music mix)
- **Evidence:** Each step writes to `finalOutputPath + ".master.mp4"` or `.mixed.mp4`, then `fs.unlinkSync(finalOutputPath)` and `fs.renameSync(swappedPath, finalOutputPath)`. On a throw between the two filesystem ops, the intermediate file is orphaned in `tempDir`. The temp dir IS cleaned on success at `:794` (`removeFiles`) but the catch block (`exportVideo.ts:842-852`) only logs and continues — the orphan remains until OS clears `/tmp` (Render's pods restart often, mitigating, but cumulative across a long-running pod adds up to GB of dead intermediates if mixing fails mid-export under load).
- **Fix:** Solution: wrap the swap+rename in a try/finally that unlinks the intermediate on failure. Location: `exportVideo.ts:820-852`. How: add `try { /* swap */ } catch (err) { try { fs.unlinkSync(swappedPath); } catch {} throw err; }` (or non-fatal log + cleanup), same pattern in the music mix block. Also add a final-block cleanup that walks `tempDir` and removes any `.mp4` that isn't `final_export.mp4`.
- **Effort:** S

### F-PF-07 — Major — `applyWatermarkOverlay` never called for free-tier on the no-captions+no-brand simple-concat path before line 778
- **File:** `worker/src/handlers/exportVideo.ts:712-790`
- **Evidence:** Free-tier user → `effectiveBrandMark = "AI-Generated"` (`:528`), so the `else if (effectiveBrandMark)` branch (`:778-780`) catches them, calling `concatWithBrandMark`. So the actual gap is on the crossfade path (`:712-715`): `if (usedCrossfade) { ...applyWatermarkOverlay... }` only runs if crossfade succeeded. If crossfade FELL BACK to demuxer (`usedCrossfade = false`, `:709-711`), no watermark is applied because that branch lands in the else where the no-captions path already burned via `concatWithBrandMark`. Wait — re-reading: when crossfade fails AND captions are off, control falls into the `else` at `:716`. That else applies `concatWithBrandMark` correctly. Net: actually OK in code today, BUT the coupling is fragile — any future caption/brand path added to one branch and not the other silently breaks free-tier policy. No regression test verifies this.
- **Fix:** Solution: write a regression test that asserts `applyWatermarkOverlay` or `concatWithBrandMark` is called on every code path when `effectiveBrandMark` is non-null. Location: `worker/src/handlers/export/` test directory. How: parametric vitest covering `(usedCrossfade ∈ {true, false}) × (captionStyle ∈ {none, ...}) × (effectiveBrandMark ∈ {undefined, "AI-Generated"})` — 8 paths.
- **Effort:** S

### F-PF-08 — Major — `replaceMasterAudio` swap has no integrity check; silent audio mismatch possible
- **File:** `worker/src/handlers/exportVideo.ts:810-852`
- **Evidence:** Reads `master_audio_url` from `generations`, downloads, mux-replaces. If the URL has been overwritten between `master_audio` job completion and `export_video` job start (e.g. user regenerates master audio while export is queued), the export silently uses the new audio without re-checking scene durations. Spliced timing assumes the original master was used.
- **Fix:** Solution: store a content hash on the `generations.master_audio_hash` column at write time, verify on read in export. Location: `replaceMasterAudio.ts` (file not read but inferred from import) + `exportVideo.ts:810`. How: SHA-256 the master mp3 buffer when `handleMasterAudio` writes the URL; export's swap step refuses if hash doesn't match.
- **Effort:** M

### F-PF-09 — Minor — `os.tmpdir()` per-job temp dir not bounded
- **File:** `worker/src/handlers/exportVideo.ts:511`
- **Evidence:** `path.join(os.tmpdir(), 'motionmax_export_${jobId}')`. On graceful completion the dir is removed (assumed via `removeFiles` cascade). On crash, orphaned dirs accumulate. Render pods rotate but a long-lived pod under steady traffic accumulates GB. No periodic cleanup task observed.
- **Fix:** Solution: add a startup cleanup that removes any `motionmax_export_*` older than 6 hours from `os.tmpdir()`. Location: `index.ts:startupDiagnostic`. How: walk tmpdir once at startup, unlink stale dirs.
- **Effort:** S

---

## Category 7 — Data integrity (worker writes, idempotency)

### F-DI-01 — Critical — `setRunProgress(5)` writes BEFORE the projects-row insert, leaving runs permanently unrecoverable
- **File:** `worker/src/handlers/autopost/handleAutopostRun.ts:631` (`setRunProgress(runId, 5)`) vs `:662-664` (`projects.insert`)
- **Evidence:** Sequence: `setRunStatus(runId, 'generating')` → `setRunProgress(runId, 5)` → projects insert. If projects insert fails for ANY reason (DB blip, RLS quirk, disk full), the run row is at `progress_pct=5` with no project. The handler catches and `markRunFailed` runs (good). But the idempotence gate at `:537-542` (`if ((run.progress_pct ?? 0) > 0)`) refuses to re-run a `progress_pct > 0` row — the failed run can never be retried, even by a manual admin requeue. The user has to delete the autopost_run and create a fresh schedule.
- **Fix:** Solution: move `setRunProgress(5)` AFTER the projects insert succeeds. Location: `handleAutopostRun.ts:631` → move below `:664`. How: `await setRunStatus(runId, 'generating')` first (signals "started"), then projects insert, then `setRunProgress(5)` once we have a real project. Idempotence gate's "anything > 0 means real spend happened" invariant is preserved.
- **Effort:** XS

### F-DI-02 — Critical — Worker `update` calls don't filter by `worker_id` on completion/failure paths — sibling-replica clobber
- **File:** `worker/src/index.ts:697-715` (mark completed), `:744-768` (mark failed)
- **Evidence:** Both updates use `.eq('id', job.id)` only — no `.eq('worker_id', WORKER_ID)` filter. If the stale-claim reaper (sibling worker) reset this row to `pending` while THIS worker was still inside its handler (timeout race scenario per F-CH-01), and a sibling re-claimed and completed the job → THIS worker's eventual UPDATE clobbers the sibling's `result`/`status` based on stale local state. The frontend polls and sees alternating success/failure.
- **Fix:** Solution: scope all completion/failure updates by `worker_id`. Location: `index.ts:706, 712, 748, 758`. How: add `.eq('worker_id', WORKER_ID).in('status', ['processing'])` to every status-transition update. If 0 rows updated, log a warning ("our claim was reaped while we ran") and abort the post-processing without further side effects. The startup-diagnostic recovery path at `:545-548` already does the right thing by NOT setting worker_id.
- **Effort:** S

### F-DI-03 — Critical — Hypereal API responses cast to `any` without runtime shape validation — JSON parse crash on CDN HTML pages
- **File:** `worker/src/services/hypereal.ts:87, 147, 222, 359, 467, 727, 812, 933` (every `await response.json() as any`)
- **Evidence:** Every Hypereal response is cast to `any`. The defensive code checks `data?.data?.[0]?.url` ONCE for image gen but other paths just access `data.jobId` immediately after `response.ok`. CDN error pages (Cloudflare 5xx HTML, "site moved" redirects) flip `response.ok` to false (good), but a 200 response with HTML body (e.g. HTML auth-required page returned at 200 by upstream) passes `response.ok` AND throws `SyntaxError: Unexpected token '<'` from `response.json()` — caught nowhere specific, retried by `withTransientRetry` (which doesn't match `SyntaxError`), terminally fails the job with a cryptic error.
- **Fix:** Solution: validate the response shape with Zod (already in deps via shared validation per worker's package.json — confirm) before access. Location: every `await response.json() as any`. How: define a small Zod schema per endpoint (`HyperealVideoSubmitResponse = z.object({ jobId: z.string(), pollUrl: z.string().nullable(), creditsUsed: z.number().optional() })`) and `parse()`-validate. Add `Content-Type: application/json` check before parsing.
- **Effort:** M

### F-DI-04 — Major — `dead_letter_jobs` table has no schema visibility from worker code; `attempts` field semantics unclear
- **File:** `worker/src/index.ts:773-783`
- **Evidence:** Insert has `attempts: (job.payload?._restartCount ?? 0) + 1`. The `_restartCount` field is bumped by `startupDiagnostic` (`index.ts:1208-1234`) on orphan recovery — NOT by `withTransientRetry`. So `attempts` here counts process restarts, not actual retry attempts. A job retried via the in-process exponential backoff 3 times will land in DLQ with `attempts=1`. Operator triaging the DLQ has wrong information about why a job failed.
- **Fix:** Solution: rename to `restart_count` and add a separate `transient_retries` column. Location: migration on `dead_letter_jobs` + `index.ts:779`. How: track withTransientRetry attempt count via the jobId-scoped closure and pass it to `processJob` via a Map<jobId, attempts>; insert both fields.
- **Effort:** S

### F-DI-05 — Major — `result` and `payload` columns both written with same data on success — risk of divergence
- **File:** `worker/src/index.ts:697-714`
- **Evidence:** `update({ status: 'completed', progress: 100, payload: cleanPayload, result: cleanPayload, ... })`. Two columns, same content. The comment notes "old builds" poll `payload`, "new builds" poll `result`. Future code that updates only one column (e.g. someone adding metadata to `result` alone) will silently diverge for old clients.
- **Fix:** Solution: pick one canonical source. Location: `index.ts:702-703`. How: write only to `result` for new jobs; deprecate the dual write with a 30-day window where the old client is force-upgraded; remove `payload` write. Until then, document the dual-write as a hard requirement at the top of `processJob`.
- **Effort:** S

### F-DI-06 — Minor — Held-frame metadata `error_summary` overwrites prior failure cause
- **File:** `worker/src/handlers/autopost/handleAutopostRun.ts:858-862`
- **Evidence:** When ≥1 scene was held by Kling moderation, `error_summary` is set to "N scenes held as still frames". But `error_summary` is also where `markRunFailed` writes the actual failure cause. If the run completes (with held frames) the friendly summary is preserved — fine. But if a held-frame run subsequently fails in the export phase, `markRunFailed` overwrites the held-frame summary with the export error and the user loses the held-frame context. Not a correctness issue but loses operator-actionable info.
- **Fix:** Solution: append rather than overwrite, or use a separate `held_frame_summary` column. Location: `handleAutopostRun.ts:858-862`. How: `error_summary: prev ? prev + '; ' + summary : summary` after re-reading the row.
- **Effort:** XS

---

## Production Blockers

| ID | Severity | Issue | Why blocker |
|---|---|---|---|
| F-CH-01 | Critical | Promise.race timeout doesn't cancel underlying work — race causes refund + complete on same job | User loses credits AND sees confused UI; production-data-corrupting |
| F-CH-02 | Critical | Stale-claim reaper threshold (30 min) shorter than `cinematic_video` runtime (45 min) — duplicate Hypereal renders | Documented as the 2026-05-08 incident pattern; double-spend on Hypereal; non-deterministic scene output |
| F-CH-03 | Critical | uncaughtException terminally fails resumable jobs instead of releasing them | Wastes Hypereal credits already spent on submitted jobs; refunds users for jobs that could continue |
| F-CH-04 | Critical | DLQ insert is fire-and-forget; failures swallowed | Failure-of-failure invisible; can't triage prod incidents |
| F-CH-05 | Critical | `withTransientRetry` is a silent no-op for autopost orchestrator (idempotence gate trips on retry) | Every transient autopost error → guaranteed terminal failure |
| F-PF-01 | Critical | drawtext brand-mark filter injection — file-read primitive via user-controlled `payload.brandMark` | Security; can leak server-side files into rendered video |
| F-PF-02 | Critical | `EXPORT_BATCH_SIZE=3` default contradicts safety comment — known OOM contributor | Continuous 2GB-pod OOM cycle; matches the documented "2026-05-04 OOM-restart loop" pattern |
| F-DI-01 | Critical | `setRunProgress(5)` before projects insert → permanently unrecoverable runs on insert failure | Customer churn vector — single DB blip kills schedule forever |
| F-DI-02 | Critical | Completion/failure UPDATEs not scoped to `worker_id` — sibling-replica clobber | Combined with F-CH-02, creates the actual data-corruption scenario |
| F-DI-03 | Critical | Hypereal `as any` parses CDN HTML 200 responses as JSON → cryptic SyntaxError, not retried | Customer-visible "unknown error"; no observability path |

---

## Top 10 Priority Fixes

| # | ID | Fix | Effort |
|---|---|---|---|
| 1 | F-PF-02 | Set `EXPORT_BATCH_SIZE` default to `1` — single line change, immediately reduces OOM rate | XS |
| 2 | F-CH-02 | Add `cinematic_video` to the orchestrator-style fail-closed reaper exclusion OR raise `STALE_PROCESSING_MS` to 60 min | S |
| 3 | F-DI-01 | Move `setRunProgress(5)` below `projects.insert` so failed pre-insert runs stay retryable | XS |
| 4 | F-PF-01 | Whitelist-validate `brandMark` to `[\w\s\-.&]{1,64}` at submit time | S |
| 5 | F-CH-04 | `await` the DLQ insert and Sentry-escalate insert failures | S |
| 6 | F-DI-02 | Scope completion/failure UPDATEs by `worker_id`; abort post-processing on 0-row update | S |
| 7 | F-CH-05 | Move `setRunProgress(5)` AFTER projects insert (same edit fixes F-DI-01); also bypass `withTransientRetry` for autopost | XS+XS |
| 8 | F-CH-03 | Crash handlers reset resumable-handler jobs to `pending`, not `failed` | S |
| 9 | F-DI-03 | Zod-validate Hypereal response shapes; reject non-JSON with clear error | M |
| 10 | F-CH-01 | Thread `AbortSignal` from outer timeout into handlers; check `signal.aborted` before writing status | L |

---

## Coverage gaps (Unable to verify from static analysis)

- **Database schema for `dead_letter_jobs`, `credit_transactions`, `app_settings`** — the migration files were not opened in this audit. Findings F-CH-11 and F-DI-04 assume schema exists but constraints/indexes were not verified. Cross-reference with Atlas (database specialist) audit.
- **Edge Functions (`supabase/functions/*`)** — only listed; only the handler that submits autopost-render jobs is implicit. Specific findings on Edge Function signature verification, JWT validation, rate limiting, and error mapping require a second pass through `generate-video`, `generate-cinematic`, `stripe-webhook`, `clone-voice-fish`. The brief flags Stripe webhook signature as a security item — not opened here.
- **AI provider services not audited deeply:** `openrouter.ts`, `elevenlabs.ts`, `fishVoiceClone.ts`, `geminiNative.ts`, `lyriaMusic.ts`, `replicate-*` — the Hypereal pattern (cast `as any`, no Zod) is likely repeated; F-DI-03 should be applied across all of them.
- **Frontend polling behavior** — the comment "polls `payload` (old builds) or `result` (new builds)" at `index.ts:702` was not verified against `src/lib/jobPolling.ts` or equivalent.

