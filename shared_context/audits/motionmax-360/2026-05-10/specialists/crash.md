# CRASH — Specialist Audit (Load + Scaling)

**Project:** motionmax-360
**Date:** 2026-05-10
**Categories:** §8 Infrastructure & Scaling, §10 Testing (load/race aspects)
**Audience:** tool-savvy creative adults, US-first, mobile-heavy

Speaks in p99, throughput, and bottleneck identification. Every finding requires evidence. Where static analysis cannot prove a runtime claim I write "Unable to verify from static analysis."

---

## §8 INFRASTRUCTURE & SCALING

### CRASH-001  [BLOCKER]  `claim_pending_job` runs O(N) correlated subqueries per pending row — quadratic queue cost
**Evidence:** `supabase/migrations/20260505110000_claim_pending_job_per_project_fairness.sql:43-78`. The CTE `to_claim` issues TWO correlated COUNT(*) subqueries per candidate row (`user_active_count` and `project_active_count`) before applying `ORDER BY ... LIMIT p_limit FOR UPDATE OF j SKIP LOCKED`. Postgres must materialize the subqueries against `video_generation_jobs WHERE status='processing'` for every candidate `j` matching the pending filter — that is N candidates × 2 scans of the processing set on every claim.
**Impact at scale:** With render.yaml at `maxInstances: 8` (`worker/render.yaml:30`) and the worker polling export+LLM separately every 5s plus every realtime INSERT (`src/index.ts:1266-1273`), a backlog of even ~200 pending jobs across the fleet means hundreds of claim RPCs/min, each scanning processing rows × pending rows × per-instance concurrency. Under burst (e.g. 50 autopost runs firing simultaneously per the Wave-E flow) this is the first thing that will fall over before any AI provider does.
**Fix:** index `video_generation_jobs(status, user_id) WHERE status='processing'` and `(status, project_id) WHERE status='processing'`; rewrite the CTE to compute the two counts in a single windowed pass over the processing snapshot (CTE that aggregates user/project counts once, then joins the pending set). Location: replace the function body in `20260505110000_claim_pending_job_per_project_fairness.sql`.
**Effort:** M

### CRASH-002  [CRITICAL]  Hypereal fleet-wide concurrency is uncapped — 8 instances × 10 = 80 simultaneous Hypereal requests on a single API key
**Evidence:** `worker/src/services/imageGenerator.ts:106` defines `HYPEREAL_MAX_CONCURRENT = 10` with the comment at line 23-25 "limiter is local to the worker process — separate worker instances aren't coordinated, but in production there's typically one worker so single-process coverage is enough." `worker/render.yaml:30` sets `maxInstances: 8`. The two facts together produce up to 80 concurrent Hypereal calls on one API key.
**Impact at scale:** Under the autoscaling target (`targetMemoryPercent: 40`, `worker/render.yaml:40`) the fleet expands toward 8 instances exactly when traffic is heaviest — i.e. when the per-key rate ceiling matters most. The same comment block at `imageGenerator.ts:103-104` admits "20 concurrent jobs × 5 scenes = 100 parallel requests, which triggers provider rate-limit 429s and wastes retry budget" — that's the actual production-fleet shape, not the assumed single-worker shape.
**Fix:** move per-provider concurrency caps to a Redis token bucket or a Supabase row-lock counter so all 8 instances share a single budget. Lacking Redis, accept lower per-instance caps (e.g. `HYPEREAL_MAX_CONCURRENT = ceil(provider_ceiling / maxInstances)`) and document the math in the file. Same fix needed for `OPENROUTER_MAX_CONCURRENT = 2` (`openrouter.ts:29`), `LEMON_MAX_CONCURRENT = 4` (`audioProviders.ts:291`), `FISH_MAX_CONCURRENT = 3` (`audioProviders.ts:365`), `GEMINI_FLASH_MAX_CONCURRENT = 6` (`geminiFlashTTS.ts:41`), `SMALLEST_MAX_CONCURRENT = 6` (`smallestTTS.ts:53`).
**Effort:** L

### CRASH-003  [CRITICAL]  No `Retry-After` honoring on OpenRouter 429s — the limiter does not yield to upstream backpressure
**Evidence:** `worker/src/services/openrouter.ts:135-172` retry loop catches AbortError and retries once on fetch failure but never inspects `res.status === 429` or `res.headers.get('retry-after')`. The `for (let attempt = 1; attempt <= 2; attempt++)` block re-fires immediately, and `!res.ok` falls straight to throw at line 167-172. The acquireOpenRouter limiter is FIFO and has no penalty for upstream rate-limit responses.
**Impact at scale:** When OpenRouter throttles, every queued caller in `_openrouterQueue` (`openrouter.ts:31`) inherits the throttled state — the limiter releases a slot, the next caller fires within ms, and the cycle repeats. The 2026-05-09 incident referenced in the same file (line 14-20) is exactly this pattern.
**Fix:** in `_callOpenRouterLLMInner` add a `if (res.status === 429)` branch that reads `Retry-After`, await the backoff, and refuse to release the slot until the wait elapses. Same treatment needed for `callHyperealLLM` (`openrouter.ts:246-261`) which currently doesn't even retry on transient errors — it throws on first non-200.
**Effort:** S

### CRASH-004  [CRITICAL]  Supabase connection pooling is unconfigured — service-role client uses default pool with no PgBouncer tuning
**Evidence:** `worker/src/lib/supabase.ts:65-70` creates the client with only `auth: { autoRefreshToken: false, persistSession: false }`. No `db.schema`, no `global.fetch`, and importantly no awareness of whether `SUPABASE_URL` points at the direct Postgres or the pgbouncer pooler. With 8 worker instances × `MAX_CONCURRENT_JOBS` (8-12 typical) × per-call HTTP keep-alive sockets to PostgREST, plus the realtime channel + autopost dispatcher (`autopost/dispatcher.ts:37`) + newsletter + scheduled notifications + master_kill_switch poll + concurrency_override poll, the worker fans out many independent PostgREST connections.
**Impact at scale:** Supabase free/pro tiers cap connections at 60 direct or 200 via pooler. 8 instances × ~15 connections each = 120 in-flight, well past direct limits and within the pooler's headroom only if `SUPABASE_URL` points at pgbouncer. Unable to verify from static analysis whether the production env var uses the pooler URL or the direct URL.
**Fix:** document the required URL form (pooler `aws-0-*.pooler.supabase.com:6543` for transaction mode) in `worker/src/lib/supabase.ts` and add a startup assertion that fails-fast when `SUPABASE_URL` does not match the pooler form in production. Also bound `_openrouterQueue` / `_lemonQueue` / `_fishQueue` / `_hyperealQueue` so they can't grow unbounded during outages (currently they are `Array<() => void>` with no cap — `imageGenerator.ts:108`).
**Effort:** S

### CRASH-005  [CRITICAL]  Health endpoint queries the hot table on every probe — Render's default 30s healthcheck multiplied across 8 instances adds ~16 reads/min to `video_generation_jobs`
**Evidence:** `worker/src/healthServer.ts:178-194` — `GET /health` issues `supabase.from('video_generation_jobs').select('id').limit(1)` synchronously inside the request handler. Render's healthcheck (`worker/render.yaml:44 healthCheckPath: /health`) probes every 30s by default; with 8 instances that's 16 hits/min on the hottest table in the schema. Each hit also reuses the service_role connection.
**Impact at scale:** healthcheck queries compete with `claim_pending_job` for the same Postgres workers and contribute to the index-scan load on `video_generation_jobs`. Worse, if the DB is briefly slow, `/health` returns 503, Render marks the instance unhealthy and may restart it — turning a transient DB blip into instance churn that orphans jobs (which then need the stale-claim reaper from `index.ts:895`).
**Fix:** cache the DB ping result for ~10s, or use a cheap probe (`SELECT 1` via RPC), or accept "ok" on a stale cache and only deep-probe every 60s. Location: `worker/src/healthServer.ts:178-194`.
**Effort:** XS

### CRASH-006  [MAJOR]  FFmpeg children are not killed on graceful shutdown — SIGTERM drains the JS promises but leaves spawned encoders running
**Evidence:** `worker/src/index.ts:1297-1404 gracefulShutdown()` releases jobs to `pending` after a 60s drain timeout (`SHUTDOWN_DRAIN_TIMEOUT_MS = 60_000`, line 336) but never tracks or kills child processes spawned by `runFfmpeg`/`execFile` in `worker/src/handlers/export/ffmpegCmd.ts:25`. The export job timeout is 90 min (`EXPORT_JOB_TIMEOUT_MS`, line 1135) and the ffmpegCmd default timeout is 10 min (`ffmpegCmd.ts:10 DEFAULT_TIMEOUT_MS = 600_000`).
**Impact at scale:** when Render redeploys (multiple times daily on autoDeploy) any in-flight encode is force-killed by the host SIGKILL after 60s drain — but the JS-side Promise.race in `index.ts:1097-1119` will already have rejected after the hard JS timeout, leaving the underlying ffmpeg child as a zombie. On a 2-vCPU pod with `MAX_EXPORT_SLOTS=4` this can pile multiple zombie ffmpeg processes that double-spend CPU until the kernel reaps them, increasing OOM risk during the very next deploy.
**Fix:** track every `proc` returned by `execFile` in a module-level `Set<ChildProcess>`; on shutdown iterate and `proc.kill('SIGKILL')` after the JS drain elapses. Location: `worker/src/handlers/export/ffmpegCmd.ts:25-48` plus a hook into `gracefulShutdown` in `worker/src/index.ts:1297`.
**Effort:** S

### CRASH-007  [MAJOR]  Stale-claim reaper can revive an export job that is still actively encoding
**Evidence:** `worker/src/index.ts:895-963`. `STALE_PROCESSING_MS = 30 * 60 * 1000` (30 min) sets the staleness gate, but `EXPORT_JOB_TIMEOUT_MS = 5_400_000` (90 min) and `CINEMATIC_VIDEO_TIMEOUT_MS = 2_700_000` (45 min) both legitimately exceed 30 min. The reaper only checks `updated_at < cutoff` — the export handler updates progress via `sceneProgress.ts` only on scene transitions, so a single 35-minute crossfade-heavy encode can sit on the same `updated_at` for the duration.
**Impact at scale:** the reaper resets such an active job to `pending`; a sibling worker re-claims it via `claim_pending_job`; both workers now run the same export, both upload to `scene-images`/`autopost-renders`, both deduct the same Hypereal credits if the path involves a re-render, and either the second-write-wins or last-write-wins on the row. The "Fail-closed for autopost orchestrators" carveout (line 909-933) protects autopost_render/autopost_rerender but explicitly excludes plain `export_video` (line 943: `.not("task_type", "in", "(autopost_render,autopost_rerender)")`).
**Fix:** require an explicit heartbeat tick from the export handler (e.g. write `updated_at = now()` every 60s during ffmpeg encode) OR raise `STALE_PROCESSING_MS` to comfortably exceed the longest legit per-task duration (90+ min for export). Location: `worker/src/index.ts:895` plus add a heartbeat in `worker/src/handlers/exportVideo.ts`.
**Effort:** S

### CRASH-008  [MAJOR]  Auto-tuned LLM concurrency hard-caps at 8 even on 4GB+ pods — vertical scale-up does not increase throughput
**Evidence:** `worker/src/index.ts:175-176` `const llmSlots = Math.max(2, Math.min(llmByMemory, 8));`. The comment block at line 124-138 explicitly states "Total never exceeds 10-12 jobs in flight per instance — well under the 2GB ceiling" and "scale horizontally rather than packing more jobs per pod". That is a defensible choice for memory safety, but it means upgrading the Render plan (e.g. to 8GB) buys exactly zero additional LLM throughput per instance.
**Impact at scale:** with `maxInstances: 8` (`render.yaml:30`) and per-instance LLM cap = 8, the fleet caps at 64 in-flight LLM jobs — independent of how much money is spent on the plan. This is fine for MotionMax's documented scale, but launch traffic above ~64 simultaneous generations (a viral TikTok mention scenario) will pile up in `pending` for the duration of the spike. The queue-depth alert fires (line 1009-1082) but the alert is informational; nothing dynamically raises the cap.
**Fix:** either (a) raise the hard cap with a memory-derived ceiling (drop the `Math.min(..., 8)` clamp and rely solely on `availableMb / 350`), or (b) document the launch-day ceiling explicitly in the runbook with a "scale plan + bump cap" runbook step. Location: `worker/src/index.ts:175-176`.
**Effort:** XS

### CRASH-009  [MAJOR]  `Promise.race` hard-timeout pattern leaks the loser promise — handler keeps running and consuming budget after the race resolves
**Evidence:** `worker/src/index.ts:1097-1120`. The race between `processJob(job)` and the timeout promise resolves the slot (via `pool.delete` in the catch block, line 1113) but the actual `processJob` async chain is not aborted — there is no AbortController/CancellationToken plumbed through. Inside `processJob` are awaited fetches against Hypereal, OpenRouter, ElevenLabs etc. — none of those are cancelled.
**Impact at scale:** a job that "times out" continues to consume an HTTP connection to the upstream provider (and counts against `HYPEREAL_MAX_CONCURRENT`/`OPENROUTER_MAX_CONCURRENT` until that fetch resolves naturally). At fleet scale this means a wave of timed-out jobs can starve the next wave of legitimate jobs — the limiter's `_openrouterQueue` (`openrouter.ts:31`) keeps growing because slots never free.
**Fix:** thread an `AbortSignal` from the timeout into every fetch call. Or, simpler short-term: add a release in the timeout reject path that does `releaseHypereal()` / `releaseOpenRouter()` defensively (slot accounting goes negative once the fetch finally resolves and tries to release again — guard the release functions against negative counts). Location: `worker/src/index.ts:1097` and the limiter release functions.
**Effort:** M

### CRASH-010  [MAJOR]  Background pollers in the worker process compound DB load — multiple independent polling loops with overlapping cadence
**Evidence:** the worker runs simultaneously: main pollQueue (30s fallback + per-realtime-event), `pollConcurrencyOverride` every 60s (`index.ts:287-308`), `isMasterKillEngaged` every 10s cache TTL (`index.ts:807`), `startAutopostDispatcher` polling every 5s (`autopost/dispatcher.ts:36 POLL_INTERVAL_MS = 5_000`), `startTokenRefresher`, `startAutopostDailySummary`, `startNewsletterSender`, `startScheduledNotificationDispatcher`. All run inside the same Node process.
**Impact at scale:** with 8 worker instances each polling, the autopost dispatcher alone generates 8 × (60/5) = 96 queries/min against `autopost_publishes`. The master_kill / concurrency_override polls hit `app_settings` 16/min × 8 = 128/min. Plus the per-realtime-event pollQueue. None of this is wrong individually; the aggregate is unmodelled and there's no per-instance jitter to spread the load (all instances boot at once on deploy and tick aligned). At launch traffic the DB will see synchronized poll bursts every 5s.
**Fix:** add randomized startup jitter (0-2× POLL_INTERVAL_MS) before each loop's first tick, and document the aggregate per-fleet RPS in the runbook so future capacity decisions account for the polling baseline. Locations: `worker/src/handlers/autopost/dispatcher.ts:36`, `worker/src/index.ts` poll setup near line 1500.
**Effort:** XS

### CRASH-011  [MAJOR]  No backpressure between the worker and Supabase Storage — image/audio uploads per generation can saturate Storage egress
**Evidence:** `worker/src/services/imageGenerator.ts:145-155 uploadToStorage` uploads each generated image with no batching or rate gate. A cinematic 15-scene job uploads 15 images × ~1-3MB + 15 video clips + 1 master audio + 1 final export. With 64 LLM jobs in flight (full fleet) that's ~960 image PUTs in flight at peak, plus the export pool's mp4 PUTs.
**Impact at scale:** Supabase Storage has a per-bucket throughput limit not exposed in their public docs but known to be modest on Pro tier (Unable to verify exact RPS limit from static analysis). The retryClassifier (`worker/src/lib/retryClassifier.ts:22`) treats "connection reset" as transient, but a 503 from Storage during a saturation burst returns straight back through the upload's `if (error) throw` (line 151) without classification.
**Fix:** wrap `supabase.storage.from(...).upload(...)` in a single shared limiter (e.g. `pLimit(20)`) and on `error` route through `isTransientError` so storage 503s get retry instead of failing the whole scene. Location: `worker/src/services/imageGenerator.ts:145-155` and every other `.storage.from(...).upload(...)` call site.
**Effort:** S

### CRASH-012  [MAJOR]  `_restartCount` increment-and-fail logic uses payload mutation — races with a concurrent worker that picks up the same row
**Evidence:** `worker/src/index.ts:1206-1234 startupDiagnostic`. Two workers booting simultaneously (e.g. both autoscale-out instances spinning up after a deploy) both run startupDiagnostic, both query `processing` rows older than 10 min, both compute `restartCount = (payload._restartCount ?? 0) + 1`, both write the row. Last-write-wins, but the `_restartCount` only increments by 1 instead of 2.
**Impact at scale:** the MAX_RESTART_RETRIES gate (`index.ts:1157`) is supposed to break OOM-restart loops at 3 attempts. Concurrent boots make the counter unreliable — under sustained OOM pressure with autoscaler thrashing the gate may never trip and the same job will rotate through pending → processing → OOM forever.
**Fix:** move the increment to an atomic Postgres RPC `increment_restart_count(jobId)` that uses `UPDATE ... SET payload = jsonb_set(payload, '{_restartCount}', ...) WHERE id = $1 RETURNING (payload->>_restartCount)::int` so the counter is always linearizable. Location: `worker/src/index.ts:1208`.
**Effort:** S

### CRASH-013  [MAJOR]  Storage growth not gated — exports + intermediates accumulate indefinitely
**Evidence:** Unable to verify a retention policy from static analysis. `worker/src/services/imageGenerator.ts:145-155` uploads to bucket `scene-images` with `upsert: true` keyed by `${projectId}/${uuidv4()}.png`, which means re-renders write new files (not overwrite) and the old ones are never cleaned. No GC handler observed in `worker/src/handlers/`.
**Impact at scale:** at typical scale (15 scenes × 2-3MB + final mp4 ~20-50MB per generation) every paid generation costs ~80MB of Storage permanently. 1000 paid generations/month = 80 GB/month, growing forever. Cost growth is linear with active users, hitting the operating budget before any infrastructure ceiling.
**Fix:** add a Supabase Edge Function cron that prunes intermediates older than 30 days and archives finals to cold storage (Cloudflare R2). Location: new `supabase/functions/storage-gc/index.ts`. Track the per-project storage usage in `projects.storage_bytes` so pricing tiers can enforce caps.
**Effort:** M

### CRASH-014  [MINOR]  `app_settings.worker_concurrency_override` poll has no jitter and re-applies even when value unchanged
**Evidence:** `worker/src/index.ts:287-308 pollConcurrencyOverride`. Runs on a fixed cadence (Unable to verify the exact setInterval duration without reading the rest of the file but the comment at line 286 says "every 60s"). All 8 instances poll on the same 60s grid because they were all started by the same Render deploy. The function calls `applyConcurrencyOverride` which has an early-return for `override === currentConcurrencyOverride` (line 243) — good — but the row is read every tick regardless.
**Impact at scale:** 8 synchronized reads/min on `app_settings`. Negligible alone but combined with master_kill_switch (`index.ts:811`), realtime pings, and dispatcher polling it adds up. Stagger startup-time so the polls spread across the minute.
**Fix:** add `await sleep(randomInt(0, POLL_INTERVAL_MS))` before the first tick. Location: `worker/src/index.ts` near where the interval is registered.
**Effort:** XS

### CRASH-015  [MINOR]  No FFmpeg `-threads` cap — encoder can saturate all container CPU and starve the JS event loop
**Evidence:** `worker/src/handlers/export/ffmpegCmd.ts:20-48 runFfmpeg`. The args injected are `-y -loglevel warning <user args>` — there is no `-threads N` and no thread-affinity setting. FFmpeg defaults to `min(16, ncpu*1.5)` threads, which on a Render Pro cgroup-limited 2 vCPU instance means ffmpeg may report 16 threads (host count) and aggressively context-switch.
**Impact at scale:** with `MAX_EXPORT_SLOTS = 4` (`index.ts:170`) and each ffmpeg using up to host-cpu-count threads, exports will steal CPU from the realtime channel handler and the claim-poll loop. Symptom: realtime websocket drops more often during heavy export traffic, increasing reliance on the 30s fallback poll — slowing job pickup.
**Fix:** add `-threads ${getContainerCpuCount()}` to every ffmpeg invocation. Location: prepend in `runFfmpeg` (`ffmpegCmd.ts:27`).
**Effort:** XS

### CRASH-016  [MINOR]  Limiter queues are unbounded — outage on a single provider fills heap
**Evidence:** `worker/src/services/imageGenerator.ts:108` `const _hyperealQueue: Array<() => void> = [];` (and the parallel queues in `openrouter.ts:31`, `audioProviders.ts:293,367`, `geminiFlashTTS.ts:43`, `smallestTTS.ts:55`). No `MAX_QUEUE_DEPTH` or queue-full rejection.
**Impact at scale:** if Hypereal goes down for 30 minutes during a peak hour with 50 concurrent jobs each needing 5 image calls, the queue grows to ~250 deferred resolvers PER INSTANCE × 8 instances = 2000 deferred Promise resolvers fleet-wide. Each retains the closure over the calling fetch's request body (the prompt + reference images), so heap grows roughly linearly with queue depth. OOM risk on the 2GB pod.
**Fix:** cap each queue at e.g. `MAX_QUEUE = 50`; reject newcomers with a `ProviderSaturated` error that the handler catches and surfaces as "try again in a minute" to the user (already the user-facing contract per the autopost-readiness intent). Location: each `acquire*` function, e.g. `imageGenerator.ts:110-118`.
**Effort:** S

### CRASH-017  [POLISH]  Missing per-provider observability for queue-wait time
**Evidence:** `worker/src/services/openrouter.ts:86-88` logs `queueWaitMs` only when > 1000ms. There is no histogram or summary metric exposed at `/metrics` (`worker/src/healthServer.ts:108-138`) for limiter wait times. Aggregation requires log scraping.
**Impact at scale:** during a saturation incident an operator can't ask "p99 of OpenRouter wait time" — they have to grep logs. Sentry breadcrumbs exist but transactions sample at 0.1 (`index.ts:2`) so most are dropped.
**Fix:** add `motionmax_provider_queue_wait_seconds{provider="openrouter"}` histogram in the Prometheus metrics output. Location: `worker/src/healthServer.ts:108-138` plus a small histogram helper.
**Effort:** S

---

## §10 TESTING — Race / Concurrency gaps

### CRASH-018  [CRITICAL]  No automated load test exists — production-readiness rests entirely on incident-driven hotfixes
**Evidence:** `worker/src/refundCreditsOnFailure.test.ts`, `worker/src/handlers/exportVideo.test.ts`, `worker/src/handlers/generateVideo.test.ts`, `worker/src/handlers/export/mediaValidator.test.ts` are unit tests. No `k6`/`artillery`/`locust` scripts under `worker/` or repo root (verified via Glob `*/{k6,load,perf,stress}*.{js,ts,yaml}`). The hotfix density in `worker/src/index.ts` comments (2026-05-04 OOM, 2026-05-05 OOM, 2026-05-07 cgroup, 2026-05-08 autopost double-spend, 2026-05-09 OpenRouter throttle) shows the team is learning load behavior in production.
**Impact at scale:** every launch-day surprise (viral TikTok, Hacker News mention, scheduled marketing burst) will be the first time the fleet sees that traffic shape. The autoscaler reacts AFTER memory hits 40% — a fast spike will OOM the first pod before scale-out completes, the spike then hits the next pod, and so on (cascading OOM verified in the same comment block).
**Fix:** add a `worker/load/` directory with k6 scripts for: (1) sustained 50 generations/min for 30 min (soak), (2) 0→100 generations in 60s (spike), (3) Hypereal-down chaos test (block egress to Hypereal in test env, verify graceful degradation). Track p95/p99 job wall time and queue depth in CI. Location: new `worker/load/{soak.js,spike.js,chaos-hypereal.js}`.
**Effort:** L

### CRASH-019  [MAJOR]  No race-test for double-fire of `claim_pending_job` under `SKIP LOCKED`
**Evidence:** `claim_pending_job` uses `FOR UPDATE OF j SKIP LOCKED` (`20260505110000_claim_pending_job_per_project_fairness.sql:78`) which is correct in principle. However there is no integration test that boots two concurrent workers and asserts that no job is claimed twice. The `worker_id` field exists (`20260419120000_add_worker_id_to_jobs.sql`) but is only checked on startupDiagnostic, not on every claim.
**Impact at scale:** if the SKIP LOCKED clause ever fails to engage (e.g. an index is missing on `status`, forcing a sequential scan that doesn't take row locks predictably) two workers can claim the same job. Static analysis can't disprove this — `Unable to verify from static analysis` whether `idx_video_generation_jobs_status_pending` exists.
**Fix:** add a Postgres test (pgTAP or a node script) that spawns 5 connections, each calling `claim_pending_job` simultaneously, and asserts that `SELECT id, COUNT(*) FROM claimed GROUP BY id HAVING COUNT(*) > 1` returns 0 rows. Location: new `supabase/tests/claim_pending_job.test.sql`.
**Effort:** M

### CRASH-020  [MAJOR]  Mid-generation crash recovery is asserted in comments but not exercised by tests
**Evidence:** `worker/src/index.ts:1346-1376` references "Resumable handlers (handleCinematicVideo) consult their saved checkpoint and skip the external-API re-submit". `worker/src/lib/checkpoint.ts` exists but no test verifies the SIGTERM-mid-Hypereal-call-then-resume path actually skips the Hypereal re-submit.
**Impact at scale:** Render redeploys 1-3× per day on autoDeploy=true (`worker/render.yaml:43`). Every redeploy is an opportunity for a mid-flight cinematic_video to get re-submitted to Hypereal — at $0.X per call this is a real cost line item. Without a test, the team will only learn about regressions from the bill.
**Fix:** add a Vitest scenario that mocks Hypereal, runs handleCinematicVideo to the post-submit checkpoint, simulates SIGTERM, restarts the handler, and asserts Hypereal was called exactly once. Location: new `worker/src/handlers/handleCinematicVideo.test.ts`.
**Effort:** M

---

## Production Blockers

| ID | Severity | One-line | Effort |
|---|---|---|---|
| CRASH-001 | BLOCKER | `claim_pending_job` correlated subqueries are quadratic in queue depth | M |
| CRASH-002 | CRITICAL | Hypereal fleet-wide concurrency uncoordinated — 8×10=80 on one key | L |
| CRASH-003 | CRITICAL | OpenRouter 429 `Retry-After` not honored — limiter doesn't yield | S |
| CRASH-004 | CRITICAL | Supabase pgbouncer pooler URL not enforced — connection exhaustion risk | S |
| CRASH-005 | CRITICAL | `/health` hits the hot table on every probe — DB blip becomes instance churn | XS |
| CRASH-018 | CRITICAL | No automated load test — every launch surprise hits prod first | L |

## Top 10 Priority Fixes (load + scaling category)

| Rank | ID | Why now |
|---|---|---|
| 1 | CRASH-001 | The fleet's first bottleneck under any spike — fix before launch traffic |
| 2 | CRASH-002 | One viral mention triggers fleet-wide Hypereal 429 storm; 8×10 math is wrong |
| 3 | CRASH-005 | Every Render healthcheck blip risks instance restart; trivial fix |
| 4 | CRASH-003 | OpenRouter 429 burst already caused the 2026-05-09 incident in code comments |
| 5 | CRASH-004 | Connection-limit exhaustion is a silent failure mode — surface it at boot |
| 6 | CRASH-018 | Without a load test, none of the above can be verified before launch |
| 7 | CRASH-006 | Zombie ffmpeg children on redeploy cause repeat OOMs — high incident probability |
| 8 | CRASH-007 | Stale-claim reaper double-runs export jobs — burns provider credit |
| 9 | CRASH-016 | Provider outage blows up heap on 8 pods simultaneously |
| 10 | CRASH-013 | Linear storage cost growth uncapped — operating-budget risk before infra risk |

---

**Notes for Jury:**
- Findings on cross-cutting domains (security headers, RLS, design-system, copy quality) are intentionally NOT in this report — those belong to Optic / Proof / Halo / Compass / Trace / Canon respectively.
- The `Unable to verify from static analysis` flags on CRASH-004 (pooler URL form), CRASH-011 (Storage RPS limit), and CRASH-019 (status-index existence) require a live env-var dump and a `\d video_generation_jobs` from production to close definitively.
- Severity is calibrated audience-relative: a tool-savvy creator hitting "queue full" once is recoverable; the same creator's video silently double-charging Hypereal credits is not. Hence CRASH-007 (silent double-spend) is rated higher than CRASH-008 (visible queue cap).
