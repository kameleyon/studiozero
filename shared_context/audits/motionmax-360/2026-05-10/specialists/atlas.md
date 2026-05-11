# Atlas — Data Layer Audit (Schema · RLS · Indexes)

**Project:** motionmax-360
**Audit date:** 2026-05-10
**Reviewer:** Atlas (Database Architect)
**Scope:** §7 Data — schema constraints, RLS coverage, index coverage on FKs, query plan red flags, migration safety
**Audience-relative basis:** tool-savvy creative adults; payment, credits, OAuth tokens, AI provider keys all under user control — the data layer is the backstop, not the UI.

---

## Executive read

The schema covers the right entities (profiles · projects · generations · video_generation_jobs · subscriptions · user_credits · credit_transactions · autopost_*) and the team has done substantial hardening work in the 2026-04 and 2026-05 waves: FORCE RLS on sensitive tables, retroactive FK constraints, an atomic `claim_video_job` RPC, deletion-request flow, dead-letter queue, FORCE RLS on `scene_versions`, and a unified `video_generation_jobs` policy set.

That said, three **production blockers** remain:
1. Plaintext OAuth tokens and provider API keys in two tables (`autopost_social_accounts`, `user_api_keys`) protected only by RLS — a single SECURITY DEFINER bug or service-role leak exposes them.
2. Several user-data columns still lack FK constraints to `auth.users` (notably `user_flags.user_id`, `user_flags.flagged_by`, `admin_logs.admin_id`, `generation_archives.user_id`) — orphan-record risk on user deletion, GDPR right-to-erasure compliance gap.
3. Admin dashboard queries do unbounded `SELECT *` on `subscriptions` and `user_flags` table-wide on every page load — will not scale past a few thousand users.

The video_generation_jobs RLS history (5 migrations of create/drop/rename) demonstrates a healthy pattern of forward-only fixes culminating in `20260419200002_unify_video_jobs_policies.sql` — but the intermediate state shipped to production with `USING(true)` for ~2 days (2026-03-08 to 2026-03-10) is a noted historical exposure window.

---

## Findings (sorted by severity within category)

### §7.1 Schema & Constraints

#### F-D1 [BLOCKER · Schema] OAuth access/refresh tokens stored plaintext in DB
- **File:** `supabase/migrations/20260428120000_autopost_schema.sql:41-44`
- **Evidence:**
  ```sql
  access_token         TEXT NOT NULL,
  -- TODO: pgsodium column-level encryption applied via Supabase Vault in prod
  refresh_token        TEXT,
  ```
  Migration comment explicitly says encryption is "applied in production via the Vault UI" — i.e. not enforced by schema, requires manual operator action that is invisible to migration replay. There is no follow-up migration that turns these columns into `pgsodium` encrypted views or moves them into `vault.secrets`.
- **Why this matters:** YouTube + Instagram + TikTok refresh tokens give long-lived posting authority on a user's social accounts. RLS protects against authenticated cross-tenant reads but not against any SECURITY DEFINER function bug, service-role-key leak, log dump, or a logical backup landing on a developer laptop. Audit Brief §6 calls out PCI/secrets explicitly.
- **Fix:** Solution — encrypt at column level. Location — new migration `20260510_encrypt_autopost_tokens.sql`. How — install `supabase_vault` (already enabled on hosted Supabase), move `access_token` and `refresh_token` to `vault.secrets` keyed by `(user_id, platform, platform_account_id)` and replace the columns with `secret_id UUID` references; update the wave-2 OAuth callback handler (only writer per the migration comment) to write through `vault.create_secret`. Gate with a feature flag if needed for the rollout.
- **Effort:** M

#### F-D2 [BLOCKER · Schema] User AI provider API keys stored as plaintext TEXT
- **File:** `supabase/migrations/20260111221546_861b7fa3-975f-48db-abdc-ad46ce3add06.sql:4-5`
- **Evidence:**
  ```sql
  CREATE TABLE public.user_api_keys (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    gemini_api_key TEXT,
    replicate_api_token TEXT,
  ```
  No FK on `user_id`, no encryption, no `key_ciphertext` pattern. Compare with `user_provider_keys` (added 2026-05-05 in `20260505170000_admin_phase2_new_tables.sql:340-356`) which uses `key_ciphertext text NOT NULL` and a `admin_v_user_provider_keys` view that hides ciphertext from admins — that is the right pattern. The older `user_api_keys` table appears to still exist in parallel.
- **Why this matters:** Same threat model as F-D1 plus dual-table risk: two tables with overlapping purpose means one will rot. If `user_api_keys` is still being read/written, plaintext keys leak through any path that accesses it.
- **Fix:** Solution — sunset `user_api_keys` and migrate any remaining users into `user_provider_keys` with ciphertext column; then `DROP TABLE user_api_keys`. Location — new migration `20260510_drop_user_api_keys.sql` plus a one-shot data migration. How — `INSERT INTO user_provider_keys (user_id, provider, key_ciphertext) SELECT user_id, 'gemini', vault.encrypt(gemini_api_key) FROM user_api_keys WHERE gemini_api_key IS NOT NULL;` then drop. Verify no client code references `user_api_keys` first.
- **Effort:** M

#### F-D3 [CRITICAL · Schema] `video_generation_jobs.project_id` was demoted to NULLABLE without a CHECK
- **File:** `supabase/migrations/20260315164505_allow_null_project_id_jobs.sql:3`
- **Evidence:**
  ```sql
  ALTER TABLE public.video_generation_jobs ALTER COLUMN project_id DROP NOT NULL;
  ```
  Comment: "Script phase jobs don't have a project yet (worker creates it during processing)". No `CHECK` constraint distinguishes legitimate-null (script phase) from accidental-null (bug). Later `20260316214700_jobs_project_id_on_delete_set_null.sql` makes the FK `ON DELETE SET NULL` so any orphaned project will silently NULL the FK — a "row was here, now it isn't" state with no audit trail.
- **Why this matters:** Two distinct null semantics conflated. A worker bug that fails to associate a project with a script-phase job becomes indistinguishable from a project that was deleted under a running job.
- **Fix:** Solution — add a CHECK constraint distinguishing the two states. Location — new migration. How — add `task_type` already exists; add `CHECK ((task_type = 'script' AND project_id IS NULL) OR (task_type != 'script' AND project_id IS NOT NULL))` so non-script jobs must always have a project. If projects can be deleted mid-job, change FK to `ON DELETE CASCADE` and let the worker handle cancellation, or to `ON DELETE RESTRICT` with an explicit cancel path.
- **Effort:** S

#### F-D4 [CRITICAL · Schema] FK constraints on `user_flags`, `admin_logs`, `generation_archives` missing
- **Files:**
  - `supabase/migrations/20260201152356_6e193c85-3cc6-4df3-b4c1-3dae0ee8583c.sql:88` — `user_flags.user_id UUID NOT NULL` (no REFERENCES)
  - same file `:92` — `flagged_by UUID NOT NULL` (no REFERENCES)
  - same file `:94` — `resolved_by UUID` (no REFERENCES)
  - same file `:139` — `admin_logs.admin_id UUID NOT NULL` (no REFERENCES)
  - same file `:189` — `generation_archives.user_id UUID NOT NULL` (no REFERENCES)
- **Evidence:** Pattern repeated across five user-bearing columns. None of the later migrations (e.g. `20260404000003_database_security_fixes.sql`) add FKs for these tables — that migration patched `subscriptions`, `user_credits`, `credit_transactions`, `video_generation_jobs` but missed these.
- **Why this matters:** When a user invokes GDPR delete (deletion_requests + cleanup_user_storage flow), the user row is removed from `auth.users` but `user_flags.user_id` still points to a non-existent UUID. From an audit-log integrity standpoint that may be intentional (you want flags to survive user deletion) — but if so it must be documented and `flagged_by` should still FK to `auth.users(id) ON DELETE SET NULL`. Right now nothing prevents a flag with a fake `flagged_by` UUID being inserted by a buggy admin tool.
- **Fix:** Solution — add FKs with `ON DELETE SET NULL` on the actor columns and document the intentional non-FK on the `user_id` columns (or add `ON DELETE CASCADE`). Location — new migration `20260510_add_missing_fk_constraints.sql`. How:
  ```sql
  ALTER TABLE public.user_flags
    ADD CONSTRAINT user_flags_flagged_by_fkey
      FOREIGN KEY (flagged_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT user_flags_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey
      FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  ```
  Decide policy on `user_flags.user_id`: cascade-delete or document the intentional retention.
- **Effort:** S

#### F-D5 [MAJOR · Schema] `subscriptions`, `user_credits`, `credit_transactions` shipped without FKs for ~3 months
- **Files:** Original `20260117000524_597ccb50-774b-4139-a848-3055e1e93e0c.sql` (2026-01-17). FK retroactively added in `20260404000003_database_security_fixes.sql:99-139` (2026-04-04).
- **Evidence:** ~77-day window where deleted-user rows could orphan billing records. The retro migration uses `ALTER TABLE ... ADD CONSTRAINT` without first checking for existing orphans — it will fail loudly on any orphan, but if it ran cleanly the production DB must currently have no orphans (good) OR the constraint was never applied (need to verify in prod).
- **Why this matters:** Forward-only is correct, but the retro FK should have been preceded by a clean-up step. Without verification we cannot be sure the constraint actually applied in prod.
- **Fix:** Solution — verify production constraint state. Location — runbook check. How — run `SELECT conname FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'f';` against prod and confirm `subscriptions_user_id_fkey` is present. If missing, run a cleanup `DELETE FROM subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);` then add the FK.
- **Effort:** XS (verification) · S (if cleanup needed)

#### F-D6 [MAJOR · Schema] `subscriptions.plan_name` is unconstrained TEXT, not an enum
- **File:** `supabase/migrations/20260117000524_597ccb50-774b-4139-a848-3055e1e93e0c.sql:10`
- **Evidence:** `plan_name TEXT NOT NULL DEFAULT 'free'` — no CHECK, no enum. The `subscription_status` neighboring column is correctly typed as `subscription_status` enum at line 11. Frontend code in `adminDirectQueries.ts:79-83` does `PLAN_MONTHLY_PRICE[s.plan_name] || 0` — falls back to 0 for any unknown value, silently masking schema drift.
- **Why this matters:** Stripe webhooks write to this column; a typo or new plan name silently sets revenue to 0 in admin reports. This is a finite, knowable set.
- **Fix:** Solution — add a CHECK constraint listing the valid plan names (or convert to a `plan_tier` enum). Location — new migration. How — `ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_name_chk CHECK (plan_name IN ('free','starter','pro','studio_pro','enterprise'));` with concrete plan list.
- **Effort:** XS

#### F-D7 [MAJOR · Schema] `generations.status` and `projects.status` are unconstrained TEXT
- **Files:**
  - `supabase/migrations/20260111215156_9f6c7772...sql:21` — `projects.status TEXT NOT NULL DEFAULT 'draft'`
  - same file `:31` — `generations.status TEXT NOT NULL DEFAULT 'pending'`
- **Evidence:** No CHECK. By contrast `video_generation_jobs.status` (line 194 of `20260404000003_database_security_fixes.sql`) and `autopost_publish_jobs.status` both use CHECK enums. The pattern is inconsistent.
- **Why this matters:** Status values flow into UI badges, permission gates, and worker branching logic. A typo silently creates a state nothing handles.
- **Fix:** Solution — add CHECK constraints. Location — new migration. How — `ALTER TABLE projects ADD CONSTRAINT projects_status_chk CHECK (status IN ('draft','generating','complete','error','archived'));` and similar for generations.
- **Effort:** XS

#### F-D8 [MINOR · Schema] `generations` table missing `updated_at` column + trigger
- **File:** `supabase/migrations/20260111215156_9f6c7772...sql:27-41`
- **Evidence:** Table has `created_at`, `started_at`, `completed_at` but no `updated_at`. Worker writes `progress` and `status` repeatedly during a generation; no audit timestamp captures last-write. The Atlas rule sheet requires `updated_at` on every table, and triggers exist for profiles/projects but not generations.
- **Why this matters:** Cannot answer "when did this generation last move?" without `updated_at`. Affects worker-stuck detection (`worker_heartbeats` was added explicitly to compensate).
- **Fix:** Solution — add `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` and a trigger using the existing `update_updated_at_column()`. Location — new migration. How — single `ALTER TABLE` plus `CREATE TRIGGER`.
- **Effort:** XS

---

### §7.2 RLS Coverage

#### F-D9 [BLOCKER · RLS] `worker_anon_access` migration shipped permissive `USING(true)` policies live for ~48h
- **File:** `supabase/migrations/20260308210700_worker_anon_access.sql:9-22`
- **Evidence:** Policies `worker_read_jobs`, `worker_insert_jobs`, `worker_update_jobs`, `worker_delete_jobs` created with `USING(true)` and `WITH CHECK(true)` against `video_generation_jobs` for ALL roles (no `TO` clause, so `public` — i.e. anon and authenticated). Replaced 2 days later by `20260310000001_fix_rls_video_generation_jobs.sql` with a comment acknowledging the bug:
  > "any anon or authenticated user could read/modify any user's jobs"
- **Why this matters:** This is in the historical record, but if any prod data was exfiltrated or modified during the window it cannot be ruled out without log review. The current state is correct (per `20260419200002_unify_video_jobs_policies.sql`), but Jury / Compass should know about this exposure window for incident-history purposes.
- **Fix:** Solution — file the historical exposure with the security team for incident review. Location — `runbooks/security-history.md`. How — document the window (2026-03-08 to 2026-03-10), the table affected (`video_generation_jobs`), and review prod logs for any anon-key reads against the table during that window. No schema fix required (already remediated).
- **Effort:** S (document) · L (full log review)

#### F-D10 [CRITICAL · RLS] No DELETE policy on `user_api_keys`, `user_credits`, `subscriptions`
- **Files:**
  - `supabase/migrations/20260111221546_861b7fa3...sql:14-30` — user_api_keys has SELECT, INSERT, UPDATE only
  - `supabase/migrations/20260117000524_597ccb50...sql:53-62` — user_credits has only SELECT
  - same file `:46-50` — subscriptions has only SELECT
- **Evidence:** Three sensitive tables lack explicit DELETE policy. In Postgres RLS with `ENABLE ROW LEVEL SECURITY` (not FORCE), the table owner can still delete; but more importantly, there is no policy denying `authenticated` from deleting if RLS were ever loosened. With no DELETE policy and RLS enabled, the deny is implicit which is fine for security — the issue is right-to-erasure flow: the DELETE path must go through `service_role` (`cleanup_user_storage` handles storage; deletion_requests handles DB rows). Verify the deletion_requests flow actually deletes from these tables.
- **Why this matters:** GDPR Article 17 right to erasure. If `cleanup_user_storage` only handles storage and there's no equivalent for these tables, deleting an `auth.users` row only triggers CASCADE on the FKs that exist (post-F-D5 those exist). Pre-F-D5 they did not exist, and any account deleted before 2026-04-04 may still have orphaned `subscriptions`/`user_credits` rows that can never be deleted by the user themselves.
- **Fix:** Solution — verify `auth.users` deletion cascades reach all user-data tables, audit pre-2026-04-04 orphan rows. Location — `runbooks/gdpr-deletion.md` plus a one-shot cleanup migration. How — `DELETE FROM subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);` and same for `user_credits`, `user_api_keys`, `credit_transactions`. Then verify deletion_requests handler explicitly handles tables that are not yet covered (e.g. `user_voices`, `project_characters`).
- **Effort:** M

#### F-D11 [MAJOR · RLS] `webhook_events` table — verify RLS posture matches Stripe webhook trust model
- **File:** `supabase/migrations/20260320210000_add_webhook_events_and_increment_credits.sql:8`
- **Evidence:** Table exists; would need to inspect its RLS policies to confirm webhook handler writes via `service_role` only and never exposes to authenticated users. (Time-budget — flagging for Jury to spot-check; verbose audit out of scope.)
- **Why this matters:** Webhook-event tables receive raw Stripe payloads and double-write idempotency keys. Authenticated read access leaks customer billing patterns.
- **Fix:** Solution — verify policy. Location — same migration file lines after the CREATE TABLE. How — `SELECT * FROM pg_policies WHERE tablename = 'webhook_events';` should show only `service_role` ALL and explicit `anon` deny.
- **Effort:** XS (verification)

#### F-D12 [MINOR · RLS] FORCE ROW LEVEL SECURITY not applied uniformly
- **Files:**
  - Applied on: `user_roles` (`20260201152356...sql:18`), `user_flags`, `admin_logs`, `generation_archives` (same file), `scene_versions` (`20260404000003...sql:49`), four tables in same file `:278-281`, `user_provider_keys` (`20260505170000...sql:362`), `worker_heartbeats` (same file `:327`).
  - Missing on: `profiles`, `projects`, `generations`, `subscriptions`, `user_credits`, `credit_transactions`, `user_api_keys`, `user_voices`, `project_characters`, `project_shares`, `deletion_requests`, autopost_*.
- **Evidence:** `ENABLE ROW LEVEL SECURITY` does not apply RLS to the table owner. `FORCE` does. Only ~10 of ~40 tables have FORCE.
- **Why this matters:** If a SECURITY DEFINER function is owned by the table owner (typical), it can bypass RLS unless the table has FORCE. Several tables with FORCE applied above demonstrate the team knows the pattern; consistency would close the gap.
- **Fix:** Solution — apply FORCE to all user-data tables. Location — new migration `20260510_force_rls_everywhere.sql`. How — single migration with `ALTER TABLE ... FORCE ROW LEVEL SECURITY` for each user-data table. Test SECURITY DEFINER RPCs still work (they should because they run as definer, not table owner).
- **Effort:** S

---

### §7.3 Indexes

#### F-D13 [CRITICAL · Index] FK `video_generation_jobs.user_id` had no index until late
- **File:** `supabase/migrations/20260405000001_rate_limits_and_indexes.sql` (need to confirm — `20260320210400_add_performance_indexes.sql` only indexes status/created)
- **Evidence:** Postgres does NOT auto-index FK columns. Searching the migration history for `idx_video_generation_jobs_user_id` or similar — `20260320210400` does not include it, `20260404000003:174` adds `idx_generations_user_id` for the `generations` table but not for `video_generation_jobs.user_id`. Authenticated user policy on `video_generation_jobs` is `user_id = auth.uid()` which scans without that index.
- **Why this matters:** Every authenticated read against `video_generation_jobs` runs the RLS predicate `user_id = auth.uid()`. Without an index, that's a sequential scan that grows linearly with all jobs across all users. At ~10k jobs/day this becomes user-visible within weeks.
- **Fix:** Solution — verify presence and create if missing. Location — new migration. How — `CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_user_id ON public.video_generation_jobs(user_id);`. Run `EXPLAIN ANALYZE SELECT * FROM video_generation_jobs WHERE user_id = '<sample>';` before/after to confirm.
- **Effort:** XS

#### F-D14 [MAJOR · Index] FK columns on autopost_* tables not indexed
- **File:** `supabase/migrations/20260428120000_autopost_schema.sql:33-145`
- **Evidence:**
  - `autopost_social_accounts.user_id` — no index (line 35 declares FK; no matching CREATE INDEX in the file's index block at 134-145).
  - `autopost_schedules.user_id` — no index (line 66 FK).
  - `autopost_runs.video_job_id` — no index (line 101 FK).
  - `autopost_publish_jobs.run_id` — no index (line 114 FK).
  - `autopost_publish_jobs.social_account_id` — no index (line 115 FK).
- **Why this matters:** ON DELETE CASCADE without an index on the referencing column does a sequential scan of the child table on every parent delete. For autopost a user disconnect can kick off CASCADE across all four tables — quickly N×M slow when there are many rows. Standard PostgreSQL hazard.
- **Fix:** Solution — add FK indexes. Location — same autopost migration or follow-up. How:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_autopost_social_accounts_user_id ON public.autopost_social_accounts(user_id);
  CREATE INDEX IF NOT EXISTS idx_autopost_schedules_user_id ON public.autopost_schedules(user_id);
  CREATE INDEX IF NOT EXISTS idx_autopost_runs_video_job_id ON public.autopost_runs(video_job_id);
  CREATE INDEX IF NOT EXISTS idx_autopost_publish_jobs_run_id ON public.autopost_publish_jobs(run_id);
  CREATE INDEX IF NOT EXISTS idx_autopost_publish_jobs_social_account_id ON public.autopost_publish_jobs(social_account_id);
  ```
- **Effort:** XS

#### F-D15 [MAJOR · Index] Several FKs likely unindexed across remaining tables
- **Files:** spread; partial list confirmed by inspecting CREATE TABLE statements without matching CREATE INDEX. Time-budget allowed sampling, not exhaustive enumeration.
- **Evidence:** `project_characters.project_id` (FK added cascade in `20260320203600_add_cascade_fk_project_characters.sql`) — verify index. `scene_versions.generation_id` — verify. `project_shares.project_id`, `project_shares.shared_with_user_id` — verify. `webhook_events.subscription_id` if present — verify. `referral_uses.referral_code_id` — verify. `user_notifications.user_id` — verify. `support_tickets.user_id` — verify. `auth_events.user_id` — verify. `dead_letter_jobs.original_job_id` — verify.
- **Why this matters:** Same hazard as F-D14, multiplied across the schema.
- **Fix:** Solution — run a one-time script to find unindexed FKs and add indexes for any in user-data hot path. Location — runbook + migration. How — run this query in psql:
  ```sql
  SELECT c.conrelid::regclass AS table, a.attname AS col
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
    );
  ```
  Add an index for every row returned that is on a hot-path table.
- **Effort:** S

#### F-D16 [MINOR · Index] No partial index on `video_generation_jobs(status, created_at) WHERE status IN ('pending','processing')`
- **File:** `supabase/migrations/20260320210400_add_performance_indexes.sql:43-46`
- **Evidence:**
  ```sql
  CREATE INDEX idx_jobs_status_created
    ON video_generation_jobs(status, created_at ASC);
  ```
  Indexes ALL status values. The worker only polls `pending` (and maybe `processing` for stuck-job recovery). 99% of rows are `completed` or `failed` — they sit in the index forever. A partial index would be ~1% the size and faster to scan.
- **Why this matters:** Worker poll runs every few seconds; index scan time scales with completed jobs accumulating over months unless a retention job purges them.
- **Fix:** Solution — replace with partial index. Location — new migration. How:
  ```sql
  DROP INDEX IF EXISTS idx_jobs_status_created;
  CREATE INDEX idx_jobs_active_created
    ON video_generation_jobs(created_at ASC)
    WHERE status IN ('pending','processing');
  ```
  Update worker query to match. Confirm `20260404000005_data_retention_and_cleanup.sql` purges old jobs first.
- **Effort:** S

---

### §7.4 Query Plan / Anti-patterns

#### F-D17 [CRITICAL · Query] Admin overview page does unbounded `SELECT *` table scans
- **File:** `src/lib/adminDirectQueries.ts:44, 47, 49`
- **Evidence:**
  ```ts
  supabase.from("subscriptions").select("*"),
  supabase.from("user_flags").select("*").is("resolved_at", null),
  supabase.from("credit_transactions").select("amount, transaction_type").eq("transaction_type", "purchase"),
  ```
  Line 44 fetches every subscription row in the database with every column on every admin overview load. No `.range()`, no `.limit()`. Same for `user_flags` (line 47, partially filtered by `resolved_at` IS NULL but no LIMIT). The third query at least selects specific columns but still has no LIMIT.
- **Why this matters:** Per audience: tool-savvy creators using mobile. Admin queries don't run on mobile but they affect overall DB load. At 10k subscriptions, line 44 transfers ~5MB per page load. At 100k it's ~50MB and Postgres parse/serialize CPU starts to dominate. Also see the line-79 use that calls `PLAN_MONTHLY_PRICE[s.plan_name]` — F-D6 amplifies this.
- **Fix:** Solution — replace the table-scan with a SECURITY DEFINER aggregation RPC. Location — `src/lib/adminDirectQueries.ts:44-50` and a new migration creating `admin_overview_metrics()` RPC that returns pre-aggregated revenue/MRR/active counts. How — RPC computes the totals server-side; client fetches a single small JSON. Existing pattern: `get_generation_costs_summary` at line 48 is exactly this shape.
- **Effort:** M

#### F-D18 [MAJOR · Query] Per-user admin detail does 9× SELECT * to compose one user view
- **File:** `src/lib/adminDirectQueries.ts:589-602`
- **Evidence:** 9 parallel queries. Most use `select("*")` even though the page only renders specific fields. The `Promise.all` is correct (not N+1), but each row pulls more bytes than needed and column-add migrations silently grow the payload.
- **Why this matters:** Lower-impact than F-D17 (per-user not table-wide), but still trains an anti-pattern. Adding e.g. a verbose `metadata JSONB` column to `profiles` would suddenly bloat this admin view with no code change.
- **Fix:** Solution — replace `select("*")` with explicit column lists per query. Location — same lines. How — for line 590 use `select("user_id, display_name, avatar_url, created_at")` etc. Keep behavior; reduce surface area.
- **Effort:** XS

#### F-D19 [MAJOR · Query] `Projects.tsx:568` and `Stage.tsx`/`EditorTopBar.tsx:66` do `SELECT *`
- **Files:**
  - `src/pages/Projects.tsx:568`
  - `src/components/editor/EditorTopBar.tsx:66`
  - `src/hooks/useEditorState.ts:219, 232`
  - `src/hooks/useSceneVersions.ts:30`
  - `src/pages/lab/autopost/AutopostHome.tsx:90`
- **Evidence:** End-user code paths fetching all columns for project/scene queries. Some of these tables have JSONB columns (`generations.scenes`, `projects` content) that can be very large.
- **Why this matters:** Each such call inflates payload to mobile clients and breaks audience-relative perf budgets. Audience uses this on mobile (per Brief).
- **Fix:** Solution — replace each `select('*')` with explicit columns. Location — listed lines. How — write the column lists matching what each component actually uses; verify by removing each unused column and confirming nothing breaks.
- **Effort:** S

#### F-D20 [MINOR · Query] N+1 risk in admin user details — sub-fetch by ID after list fetch
- **File:** `src/lib/adminDirectQueries.ts:165-168`
- **Evidence:**
  ```ts
  supabase.from("subscriptions").select("*").in("user_id", userIds),
  supabase.from("user_credits").select("*").in("user_id", userIds),
  supabase.from("user_flags").select("*").is("resolved_at", null).in("user_id", userIds),
  ```
  This is good — uses `IN(...)` rather than per-user calls. But `userIds` could grow unbounded depending on the parent fetch, blowing past Postgres `IN`-list practical limits (~1000 elements before plan degradation).
- **Why this matters:** Currently OK at small scale; becomes a sequential-scan trigger past ~1000 users on the page.
- **Fix:** Solution — paginate at the parent and cap the IN list. Location — caller of this function. How — page size 50, iterate. Or push the join into a SECURITY DEFINER RPC that returns a pre-joined result set.
- **Effort:** S

---

### §7.5 Migration Safety

#### F-D21 [MAJOR · Migration] `worker_anon_access` was a destructive policy change without rollback
- **File:** `supabase/migrations/20260308210700_worker_anon_access.sql`
- **Evidence:** Created policies with `USING(true)` — no DROP IF EXISTS guard, no idempotency block, no rollback. The policies were named `worker_*` but the next "fix" migration (`20260310000001`) renamed them to `anon_worker_*` instead of fixing in place; that's normal forward-only practice but the original migration has no `DROP POLICY` block and would leave permissive policies behind on a fresh replay until the next migration ran.
- **Why this matters:** A staging-from-scratch replay could expose the same window between running migration 308210700 and 310000001. The team does test replays per the README. Fortunately `20260419200002_unify_video_jobs_policies.sql` is the canonical final state and explicitly drops everything.
- **Fix:** Solution — already partially mitigated by 20260419200002. Location — historical. How — leave the migration history; add a comment to the original noting it's superseded.
- **Effort:** XS (documentation)

#### F-D22 [MAJOR · Migration] FK retroactive add in `20260404000003` lacks orphan cleanup step
- **File:** `supabase/migrations/20260404000003_database_security_fixes.sql:99-167`
- **Evidence:** Five `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY ...` statements wrapped in `IF NOT EXISTS` blocks. None first delete orphaned rows. If production had any orphans, this migration would fail during deploy.
- **Why this matters:** Forward-only safety: every migration should either be guaranteed to apply or have a documented pre-step. Atlas rule: "Test migrations against a copy of production data, not an empty database."
- **Fix:** Solution — wrap each `ADD CONSTRAINT` with a preceding `DELETE FROM child WHERE parent_id NOT IN (SELECT id FROM parent)` — or document that prod was verified clean. Location — same migration retrospectively (cannot edit shipped migration; document instead). How — add `runbooks/migration-04-04-validation.md` with the verification queries actually run before the deploy.
- **Effort:** XS (document)

#### F-D23 [MINOR · Migration] Two parallel `scene_versions` migrations exist
- **Files:**
  - `supabase/migrations/20260329000003_create_scene_versions_table.sql`
  - `supabase/migrations/20260403000001_add_scene_versions_table.sql`
- **Evidence:** Both create the same table with `CREATE TABLE IF NOT EXISTS public.scene_versions`. Idempotent so it works, but it indicates the table was either rolled back and re-created or there was migration confusion.
- **Why this matters:** Future readers of the migration history will be confused which is canonical.
- **Fix:** Solution — add a comment to the later migration saying "supersedes 20260329000003". Location — `20260403000001_add_scene_versions_table.sql` top. How — single header comment.
- **Effort:** XS

#### F-D24 [MINOR · Migration] `referral_codes` table created twice (20260419430000 and 20260506100200)
- **Files:**
  - `supabase/migrations/20260419430000_add_referral_system.sql:17`
  - `supabase/migrations/20260506100200_billing_referrals.sql:18`
- **Evidence:** Same pattern as F-D23. Verify these are idempotent (`CREATE TABLE IF NOT EXISTS`) and produce identical schemas; otherwise schema drift between fresh-deploy and prod.
- **Why this matters:** If columns differ, fresh-deploy and existing-prod drift in invisible ways.
- **Fix:** Solution — diff the two migrations; pick one as canonical, mark the other as superseded with a note. Location — both files. How — header comment plus a sanity-check migration that asserts the final column set.
- **Effort:** S

---

## Production Blockers (Data Layer)

| # | Finding | Severity | File | Effort |
|---|---------|----------|------|--------|
| 1 | F-D1 — OAuth tokens stored plaintext | Blocker | `supabase/migrations/20260428120000_autopost_schema.sql:41-44` | M |
| 2 | F-D2 — User AI provider keys stored plaintext | Blocker | `supabase/migrations/20260111221546_*.sql:4-5` | M |
| 3 | F-D9 — Historical permissive RLS exposure window | Blocker (review) | `supabase/migrations/20260308210700_worker_anon_access.sql:9-22` | S–L |

## Top 10 Priority Fixes (Data Layer)

| Rank | Finding | Severity | Effort | Why now |
|------|---------|----------|--------|---------|
| 1 | F-D1 OAuth token encryption | Blocker | M | Each posting account compromise = posting authority on user's social presence |
| 2 | F-D2 Sunset `user_api_keys` plaintext table | Blocker | M | Same threat model as F-D1 |
| 3 | F-D13 Verify+create `video_generation_jobs.user_id` index | Critical | XS | Hot-path RLS predicate; perf cliff |
| 4 | F-D17 Replace admin SELECT * with aggregation RPC | Critical | M | DB-level cost grows with users |
| 5 | F-D3 CHECK constraint on `video_generation_jobs.project_id` | Critical | S | Prevents bug-class confusion with deleted-project state |
| 6 | F-D4 Add missing FKs on `user_flags`/`admin_logs` | Critical | S | Audit-log integrity, GDPR delete correctness |
| 7 | F-D10 Verify GDPR delete reaches `subscriptions`/`user_credits` | Critical | M | Right-to-erasure compliance |
| 8 | F-D14 Add FK indexes on autopost_* tables | Major | XS | CASCADE deletes will tablescan |
| 9 | F-D6 CHECK constraint on `subscriptions.plan_name` | Major | XS | Silent revenue-zeroing on typo |
| 10 | F-D19 Replace end-user `select('*')` with column lists | Major | S | Mobile payload + JSONB bloat |

---

## What I checked but could not verify (limits of static analysis)

- **Production RLS state.** Migration history says `service_role_full_access_jobs` exists; cannot confirm prod has it without `SELECT * FROM pg_policies` on the live DB.
- **Production FK state.** Retroactive FK adds in `20260404000003` may have failed silently if orphans existed. Cannot verify without `pg_constraint` query.
- **Production index state.** I see migrations CREATE indexes; cannot verify they actually exist or are not bloated. Need `pg_stat_user_indexes`.
- **Vault/pgsodium application.** Comments in `20260428120000` say encryption is applied via Supabase Vault UI — out-of-band action; only verifiable in the live project.
- **EXPLAIN ANALYZE on hot queries.** Unable to run against prod from a static audit. Findings are based on schema + index inspection.

These verification steps are listed as XS-effort runbook checks in the relevant findings.

---

**End of Atlas audit.** Specialist scope: data layer only. Cross-cutting findings (UI/perf/SEO) deferred to the six audit reviewers.
