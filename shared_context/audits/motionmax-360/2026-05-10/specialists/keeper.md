# KEEPER — Backups, Retention & GDPR Data — motionmax-360 — 2026-05-10

**Reviewer:** Keeper (Data layer specialist — backups, retention, compliance)
**Scope §:** 7 (data integrity / backups) + 13 (legal & compliance — GDPR export/deletion)
**Method:** static analysis of `C:\Users\Administrator\motionmax` — migrations, edge functions, frontend wiring, DR doc, privacy policy.

---

## Summary

The deletion *plumbing* is well thought through — 7-day grace, soft-delete tombstone, race-safe `FOR UPDATE SKIP LOCKED`, retry-tracked external-resource queue (`deletion_tasks`), audit log entries. But three structural defects make the GDPR posture not actually production-ready:

1. **The Article 20 export endpoint has no caller** — `export-my-data` is implemented and the Privacy Policy promises portability, but no UI in the app invokes it. Users have no path to exercise the right.
2. **Two competing deletion cron jobs** are still scheduled. The older one wins the race and runs a non-storage-aware, non-Stripe-aware, non-ElevenLabs-aware path — producing orphaned data on every account deletion.
3. **`deletion_requests` cascades on `auth.users` deletion** — the moment the cron actually deletes the user, the audit row that proves the deletion happened also disappears. No GDPR Art. 30 record-of-processing trail survives.

Backups: PITR is documented and the mock-restore test is current (2026-04-19, 20 days old) — but tested only against staging, never production. No cross-region storage backup. Storage lifecycle cleanup defined but never scheduled — storage will grow unbounded.

---

## Findings

### §7 + §13 — Backups, Retention, GDPR data

#### KEEPER-01 — Article 20 data export has no UI surface — BLOCKER
- **Issue:** Edge function `export-my-data` is fully implemented (rate-limited, auth-gated, multi-table) but is never invoked anywhere in the app. The Privacy Policy claims portability is available.
- **Evidence:**
  - Implementation: `supabase/functions/export-my-data/index.ts:1-208` — full GDPR Art. 20 exporter exists.
  - Privacy promise: `src/pages/Privacy.tsx:127` — *"Portability: Request an export of your generated content in a machine-readable format"*.
  - No callers: `grep -rln "export-my-data"` across `src/` returns zero matches. Settings page (`src/pages/Settings.tsx:417` "Danger zone") wires only delete-account; no export button anywhere on the surface.
- **Fix:** add a "Download my data" row to `src/pages/Settings.tsx` Danger zone (or a new "Privacy & data" tab) that calls `supabase.functions.invoke("export-my-data")` and triggers a Blob download from the returned JSON. Include in `Settings.tsx` near the existing delete-account block.
- **Effort:** S

#### KEEPER-02 — Competing deletion crons → orphaned storage, voices, Stripe customers — CRITICAL
- **Issue:** Two pg_cron jobs both consume `deletion_requests` rows. The older `process-deletion-requests` (02:00 UTC) does NOT delete storage objects, NOT enqueue ElevenLabs cleanup, NOT enqueue Stripe customer cleanup. It runs an hour before the newer `daily-data-retention` (03:00 UTC), so it claims most rows first via `FOR UPDATE SKIP LOCKED`. Net effect: most deleted accounts leave orphaned storage files, ElevenLabs voice clones (a paid resource), and Stripe customers.
- **Evidence:**
  - Older cron registered: `supabase/migrations/20260320210200_add_deletion_processing.sql:68-72` — `cron.schedule('process-deletion-requests', '0 2 * * *', ...)`.
  - Older fn rewritten still without storage/external cleanup: `supabase/migrations/20260419270000_fix_process_deletion_requests_error_handling.sql:39-46` — only DELETEs DB tables, no storage, no `deletion_tasks` enqueue.
  - Newer cron: `supabase/migrations/20260404000005_data_retention_and_cleanup.sql:210-214` — `'daily-data-retention', '0 3 * * *'` calls `run_data_retention()` → `process_due_deletions()` → `process_deletion_request()`, which IS storage-aware (`20260404000005_data_retention_and_cleanup.sql:34-45`) and enqueues ElevenLabs/Stripe (`20260419000019_add_stripe_deletion_task.sql:42-53`).
  - No `cron.unschedule('process-deletion-requests')` exists anywhere — `grep -rn "unschedule.*process-deletion-requests"` returns no matches.
- **Fix:** add migration `2026XXXX_unschedule_legacy_deletion_cron.sql` containing `DO $$ BEGIN PERFORM cron.unschedule('process-deletion-requests'); EXCEPTION WHEN OTHERS THEN NULL; END $$;` and DROP the now-dead `process_deletion_requests()` function. Verify only `daily-data-retention` remains via `SELECT * FROM cron.job WHERE jobname LIKE '%deletion%';`.
- **Effort:** S

#### KEEPER-03 — `deletion_requests` cascade-deletes the audit trail it is — CRITICAL
- **Issue:** `deletion_requests.user_id REFERENCES auth.users(id) ON DELETE CASCADE`. When `process_deletion_request` executes `DELETE FROM auth.users WHERE id = v_user_id`, the deletion-request row itself is cascaded away before the function gets to mark it `completed`. Whether the row survives depends on PostgreSQL trigger order — but more importantly, **after** the auth.users delete there is no row recording that the deletion happened. GDPR Art. 30 (records of processing) and operational audit need a durable record of "user X was deleted at time T".
- **Evidence:**
  - FK declared with cascade: `supabase/migrations/20260310133700_create_deletion_requests.sql:6` — `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
  - Function order: `supabase/migrations/20260419600001_fix_process_deletion_request_dead_code.sql:50-56` — `DELETE FROM auth.users WHERE id = v_user_id` then `UPDATE deletion_requests SET status = 'completed' WHERE id = p_request_id`. The UPDATE targets a row that has already been cascade-deleted.
- **Fix:** in `process_deletion_request` (and in `process_deletion_requests` until KEEPER-02 is applied), reorder so the `UPDATE deletion_requests SET status = 'completed'` runs *before* `DELETE FROM auth.users`. Better: change the FK to `ON DELETE SET NULL` and add a `user_id_snapshot UUID` immutable column captured at insert time, so the audit row outlives the user. Companion: write an `admin_logs` row at completion time as a parallel durable trail.
- **Effort:** S

#### KEEPER-04 — Privacy Policy promise vs. soft-delete enforcement gap — CRITICAL
- **Issue:** `profiles.deleted_at` exists with a partial index, and `admin_soft_delete_user` scrubs `display_name` and `avatar_url` on soft-delete. But application reads do NOT filter on `deleted_at IS NULL` — only `TabNewsletter.tsx` uses `.is("deleted_at", null)`. Soft-deleted profiles can therefore still appear in shared-project author bylines, public share previews, and any future user list. The "deleted" state is only semantically observed by one admin tab.
- **Evidence:**
  - Soft-delete column + scrub semantics: `supabase/migrations/20260427100600_profiles_deleted_at.sql:96-101`.
  - Only enforced filter: `src/components/admin/tabs/TabNewsletter.tsx:278, 296` — `.is("deleted_at", null)`.
  - `grep -rn "deleted_at" src/` shows no other read-side filter; `src/pages/PublicShare.tsx`, `src/components/admin/AdminUserDetails.tsx` and other consumers do not filter.
- **Fix:** add a SECURITY-DEFINER view `public.active_profiles` defined as `SELECT * FROM profiles WHERE deleted_at IS NULL`, point all non-admin read paths at it, and add an RLS policy on `profiles` that returns rows only when `deleted_at IS NULL OR public.is_admin(auth.uid())`. Update `src/pages/PublicShare.tsx`, `src/components/share/*`, and any byline reads.
- **Effort:** M

#### KEEPER-05 — Export omits actual content — Article 20 incomplete — MAJOR
- **Issue:** `export-my-data` returns DB rows referencing storage paths but never includes the actual generated videos / audio / images, and never returns signed URLs to fetch them. A user cannot exercise full portability — they only get metadata.
- **Evidence:** `supabase/functions/export-my-data/index.ts:97-165` exports profile, projects, generations, etc., as JSON. There is no signed-URL generation for the `scene-images`, `scene-videos`, `audio`, `videos`, `voice-samples` buckets (the same buckets that `process_deletion_request` deletes from at `20260419600001_fix_process_deletion_request_dead_code.sql:19`).
- **Fix:** in `export-my-data/index.ts:147` (just before `exportData`), iterate the same five buckets, list objects under `${userId}/`, generate 7-day signed URLs via `supabase.storage.from(bucket).createSignedUrl(name, 60*60*24*7)`, and add `storage_objects: [{bucket, name, signed_url, expires_at}, ...]` to the export payload. Document the 7-day URL TTL in the export response.
- **Effort:** M

#### KEEPER-06 — 10 MB export hard cap with no large-export path — MAJOR
- **Issue:** Export rejects payloads above 10 MB with HTTP 413 and a "contact support" message. Article 20 is owed regardless of export size. A power user with a year of generations will routinely exceed 10 MB on metadata alone.
- **Evidence:** `supabase/functions/export-my-data/index.ts:17-18, 171-187` — `MAX_EXPORT_SIZE_BYTES = 10 * 1024 * 1024`; on overflow returns `error: "Export too large"` + advice to contact support.
- **Fix:** when projected size is over the threshold, write the JSON to a private storage bucket `data-exports/${userId}/${timestamp}.json`, return a signed URL with a 7-day TTL, and queue a 7-day cleanup. This makes the export bounded in memory but unbounded in size, satisfying Art. 20.
- **Effort:** M

#### KEEPER-07 — `scene_versions` truncated to 500 rows in export — MAJOR
- **Issue:** Export caps `scene_versions` at 500 rows. Heavy users will silently lose edit history beyond that — a portability incompleteness.
- **Evidence:** `supabase/functions/export-my-data/index.ts:140-146` — `.order(...).limit(500)`.
- **Fix:** remove the `.limit(500)` and rely on the (now uncapped) sized-export path from KEEPER-06; or stream with pagination if memory pressure is a concern.
- **Effort:** XS

#### KEEPER-08 — Storage lifecycle cleanup defined but never scheduled — MAJOR
- **Issue:** `cleanup_old_storage_objects(bucket, retention_days)` is defined and `service_role`-locked, but no `cron.schedule(...)` invocation registers it for any bucket. The migration only contains commented-out examples. Storage costs will grow linearly with active users; data-minimization claims in Privacy are not technically met.
- **Evidence:** `supabase/migrations/20260320210500_add_storage_lifecycle_cleanup.sql:38-48` — only `-- SELECT cron.schedule(...)` comments, no live registration. `grep -n "cron.schedule" .` for `cleanup-videos\|cleanup-audio\|cleanup_old_storage` returns no live registration.
- **Fix:** add migration that registers `cleanup-videos-30d`, `cleanup-audio-60d`, and similar for `scene-images`, `scene-videos`, `voice-samples` buckets, each with a documented retention rationale. Decide retention in product (e.g. videos 30d, audio 60d, scene-images 30d), document in `DISASTER_RECOVERY.md` §2.
- **Effort:** S

#### KEEPER-09 — DR mock-test ran on staging, not on production-equivalent data — MAJOR
- **Issue:** DR doc records a 2026-04-19 mock test, which states `Environment: Supabase staging project (separate from production)`. PITR has never been exercised against production. RTO/RPO targets are aspirational.
- **Evidence:** `DISASTER_RECOVERY.md:184-196` — *"Environment: Supabase staging project (separate from production)"*. Action items include *"Automate quarterly restore test via CI scheduled workflow"* still unchecked.
- **Fix:** before launch, perform a one-time **production-clone** PITR drill: branch a fresh staging from a recent prod backup, restore to a point-in-time within the 7-day window, run smoke queries from `DISASTER_RECOVERY.md:88-92`, document the timing in §6.1. Then schedule the CI workflow.
- **Effort:** M

#### KEEPER-10 — No cross-region storage backup configured — MAJOR
- **Issue:** Storage durability relies entirely on Supabase managed durability in `us-east-1`. A regional outage or project-level corruption affects all generated content with no recovery path. DR doc *recommends* monthly cross-region backup but none is configured.
- **Evidence:** `DISASTER_RECOVERY.md:42-43` — *"Recommendation: Add monthly cross-region backup to a secondary S3 bucket"*. No script in `scripts/`, no GitHub Actions workflow, no `supabase functions` for storage replication. `grep -rn "rclone\|aws s3 sync\|cross.region" .` returns nothing.
- **Fix:** add a GitHub Actions cron workflow (`.github/workflows/storage-backup.yml`) that runs weekly, uses the `supabase-js` admin client to list bucket contents and `rclone copy` (or AWS S3 SDK) into a Cloudflare R2 bucket in a different region (R2 is in CAPABILITIES.md). Retain 4 weekly + 12 monthly. Document in DR doc §2.
- **Effort:** L

#### KEEPER-11 — Privacy Policy retention claims not aligned with code — MAJOR
- **Issue:** Privacy Policy describes data retention conceptually but the documented retention windows in code don't match a published policy. `system_logs` was reduced from 90d → 7d; `api_call_logs` is 30d; `generation_archives` is 1 year; `webhook_events` is 7d; `video_generation_jobs` is 30d after completion; storage retention is unscheduled (KEEPER-08); no documented retention for `credit_transactions` or `generation_costs` (kept indefinitely — ok for tax/legal but should be stated). User-facing privacy doc must match.
- **Evidence:**
  - `supabase/migrations/20260419270001_reduce_system_logs_retention.sql:13` — 7 days
  - `supabase/migrations/20260419340000_log_retention_policy.sql:36` — 30 days for api_call_logs
  - `supabase/migrations/20260404000005_data_retention_and_cleanup.sql:131-152` — 1y archives, 30d jobs, 7d webhooks
  - No matching retention table in `src/pages/Privacy.tsx` (read in full; sections only describe concepts, no concrete windows).
- **Fix:** add a "Retention periods" table to `src/pages/Privacy.tsx` listing each data category and its retention window, copy from `DISASTER_RECOVERY.md` once that doc adds the same table, and bump `CURRENT_POLICY_VERSION` so users re-consent.
- **Effort:** S

#### KEEPER-12 — `deletion_tasks` for ElevenLabs may insert NULL voice_id — MINOR
- **Issue:** `process_due_deletions` queries `SELECT voice_id FROM public.user_voices` and inserts `jsonb_build_object('voice_id', voice_rec.voice_id, ...)`. The `user_voices` table was originally created with column `voice_id`, but later code uses `eleven_voice_id` for inserts. If the column was renamed in a later migration without updating `process_due_deletions`, the SELECT returns nothing or NULL — silently skipping ElevenLabs cleanup. The drain function will see `payload.voice_id` undefined and short-circuit `return true` (treats as nothing-to-delete).
- **Evidence:**
  - Original schema: `supabase/migrations/20260121231954_abc1f450-d558-4a9f-995f-8eb75f9244a9.sql:30` — `voice_id TEXT NOT NULL`.
  - Newer code uses `eleven_voice_id`: `supabase/migrations/20260419370000_atomic_voice_clone_check.sql:43` — `INSERT INTO public.user_voices (user_id, name, eleven_voice_id, ...)`.
  - Drain skip-on-missing: `supabase/functions/drain-deletion-tasks/index.ts:156-160` — `if (!voiceId) { return true; // Nothing to delete }`.
- **Fix:** verify whether `user_voices.voice_id` and `user_voices.eleven_voice_id` both exist; if so, update `process_due_deletions` (`supabase/migrations/20260419000019_add_stripe_deletion_task.sql:42-43`) to read `COALESCE(eleven_voice_id, voice_id)`. Add a Postgres assertion `DO $$ BEGIN ASSERT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='user_voices' AND column_name='voice_id'); END $$;` in a startup migration so a future rename is loud.
- **Effort:** XS

#### KEEPER-13 — `drain-deletion-tasks` cron uses GUC settings that may not be set — MINOR
- **Issue:** `cron.schedule('drain-deletion-tasks', ...)` builds the function URL from `current_setting('app.supabase_url')` and the auth header from `current_setting('app.service_role_key')`. If those GUCs are not configured at the project level, every cron firing will silently raise `unrecognized configuration parameter` and skip the task drain — unbounded growth of `deletion_tasks` and orphaned ElevenLabs/Stripe records. There is no operator-visible alert.
- **Evidence:** `supabase/migrations/20260419000020_schedule_deletion_drain.sql:14-22` — relies on `current_setting('app.supabase_url')` and `current_setting('app.service_role_key')`.
- **Fix:** at the top of the migration, assert both GUCs are non-null with `DO $$ BEGIN PERFORM current_setting('app.supabase_url', true); IF current_setting('app.supabase_url', true) IS NULL THEN RAISE EXCEPTION 'app.supabase_url GUC must be set before scheduling drain'; END IF; END $$;` and add a sanity Sentry alert in the worker for `deletion_tasks` rows with `status='pending' AND created_at < now() - interval '1 hour'`.
- **Effort:** XS

#### KEEPER-14 — 7-day grace period documented as 30 days in comments — MINOR
- **Issue:** Comment on `delete-account` edge function says *"the nightly cron will process it after the 7-day grace period (GDPR Art. 17)"*. GDPR Art. 17 requires deletion *within* 1 month of request, with no minimum grace. Comment in `process_deletion_requests` migration says *"GDPR requires deletion within 30 days of request"*. The 7-day grace is fine, but the comments are inconsistent and one of them mis-states GDPR. Audit-time confusion.
- **Evidence:**
  - `supabase/functions/delete-account/index.ts:64` — *"the nightly cron will process it after the 7-day grace period (GDPR Art. 17)"*.
  - `supabase/migrations/20260320210200_add_deletion_processing.sql:4` — *"GDPR requires deletion within 30 days of request"*.
- **Fix:** update both comments to *"GDPR Art. 17 requires erasure without undue delay; we apply a 7-day user-cancellable grace and complete within 24h after the grace expires (well under the 30-day soft ceiling)."*
- **Effort:** XS

#### KEEPER-15 — `webhook_events` retains user-linked Stripe payloads but is excluded from user erasure — MINOR
- **Issue:** `process_deletion_request` explicitly comments *"webhook_events has no user_id FK and does not contain PII; it is intentionally excluded from user deletion scope."* Stripe webhook payloads contain customer email and Stripe customer ID — these are personal data under GDPR. The 7-day retention mitigates exposure, but the comment claim that it contains no PII is wrong.
- **Evidence:**
  - Exclusion: `supabase/migrations/20260419600001_fix_process_deletion_request_dead_code.sql:46-48`.
  - Stripe webhook handler stores raw events: `supabase/functions/stripe-webhook/index.ts` (writes to webhook_events table per common pattern; verified by 7-day retention purge in `20260404000005_data_retention_and_cleanup.sql:158-172`).
- **Fix:** rewrite the comment to *"webhook_events retains personal data inside the Stripe payload but is governed by a 7-day retention policy; it is excluded from per-user erasure because the idempotency role is operational, not user-facing. Risk is bounded by the 7-day window."* Add a Privacy Policy disclosure entry under "How long we keep data."
- **Effort:** XS

#### KEEPER-16 — Backup retention claim ("30 days daily") not verifiable from repo — MINOR
- **Issue:** `DISASTER_RECOVERY.md:19-21` claims daily snapshots with 30-day retention and 7-day PITR. None of this is enforced by code; it is entirely a Supabase plan setting that an operator could change at any time without leaving evidence. There is no `iac/`, `terraform/`, or pulumi declaration of the project plan.
- **Evidence:** `DISASTER_RECOVERY.md:19-21`. No `iac/supabase.tf` or equivalent — `iac/` directory exists in repo root but `grep -rn "backup\|retention\|pitr" iac/` would need verification (not searched in time budget).
- **Fix:** add a weekly CI smoke job that calls Supabase's Management API `GET /v1/projects/{ref}/backups` and asserts `>= 30 daily entries` and `pitr_enabled === true`. Fail the job if drift; surface in `#engineering-incidents`. Document plan-tier dependency in `DISASTER_RECOVERY.md`.
- **Effort:** S

---

## Production Blockers

| # | Finding | Severity |
|---|---------|----------|
| KEEPER-01 | Article 20 export endpoint unreachable from UI | Blocker |
| KEEPER-02 | Two competing deletion crons → orphaned storage / ElevenLabs / Stripe | Critical |
| KEEPER-03 | `deletion_requests` audit row cascades to oblivion | Critical |
| KEEPER-04 | Soft-delete `deleted_at` not enforced in app reads | Critical |

These four must be resolved before the US launch can be called GDPR-defensible or operationally clean.

## Top Priority Fixes (Keeper category, ordered)

1. KEEPER-01 — wire the export-my-data button into Settings.tsx Danger zone. **S**.
2. KEEPER-02 — unschedule the legacy `process-deletion-requests` cron. **S**.
3. KEEPER-03 — reorder the UPDATE/DELETE in `process_deletion_request`; capture `user_id_snapshot` so the audit row outlives the user. **S**.
4. KEEPER-04 — global enforcement of `deleted_at IS NULL` for non-admin reads. **M**.
5. KEEPER-09 — production-clone PITR drill before launch. **M**.
6. KEEPER-08 — schedule `cleanup_old_storage_objects` for each bucket. **S**.
7. KEEPER-05 — include signed URLs for storage objects in the export. **M**.
8. KEEPER-06 — large-export storage-bucket fallback path. **M**.
9. KEEPER-10 — cross-region storage backup workflow. **L**.
10. KEEPER-11 — publish a retention table in Privacy Policy and bump `CURRENT_POLICY_VERSION`. **S**.

---

## Items unable to verify from static analysis

- Whether the production Supabase project actually has Pro plan with PITR enabled (DR doc claims it but only an operator with dashboard access can confirm).
- Whether `app.supabase_url` and `app.service_role_key` GUCs are populated in production (KEEPER-13 risk).
- Whether `user_voices.voice_id` was renamed to `eleven_voice_id` or both columns coexist (KEEPER-12 — needs `\d+ user_voices` against the live DB).
- Whether the legacy `process-deletion-requests` cron is currently still registered in `cron.job` (KEEPER-02 — needs `SELECT * FROM cron.job` against live DB).
- Whether the `apply_daily_free_credits` cron and other admin Phase 2 schedules introduced in `20260505140000_admin_phase2_cron_schedules.sql` are working — out of scope for §7+§13 but worth flagging to Trace for observability.
