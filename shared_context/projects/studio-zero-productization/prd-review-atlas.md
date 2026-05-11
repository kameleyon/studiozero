[StudioZero] Waking up ATLAS to handle the task...
[StudioZero] Using model: gemini-3.1-pro-preview (Google Gemini)
As the Data layer lead, I have reviewed PRD v0.2. A database schema is the concrete foundation of your application—if the relationships and constraints are wrong here, no amount of application-layer logic will save you from corrupted states or cross-tenant data leaks. 

Here is my architectural review of the database, isolation, and storage requirements, categorized by severity.

## Blocker

### Runner Database Authentication Context (Bypasses RLS)
*   **Section Reference:** 13.2 (Database), 13.5 (Multi-tenancy isolation)
*   **Summary:** The PRD relies entirely on Postgres RLS for multi-tenant isolation, but fails to define how the *Hosted Runner* connects to the database. If the runner uses the Supabase Service Role key to process jobs, it bypasses RLS entirely, rendering the database-level isolation useless against application-layer bugs in the runner.
*   **Evidence:** "All tenant-scoped tables have a `tenant_id` column with an RLS policy... No exceptions." (13.2) alongside "Hosted runners are queue-driven" (6.2).
*   **Recommendation:** The runner must *never* execute queries using the Service Role key. Implement a Supabase Edge Function or an auth-hook that generates a short-lived, tenant-scoped JWT for the runner whenever it picks up a job. The runner must authenticate to Postgres using this JWT so that `auth.jwt() ->> 'tenant_id'` evaluates correctly, enforcing Postgres RLS at the database engine level even if the runner's code is compromised.

## Critical

### Score Versioning Data Model Flaw
*   **Section Reference:** 10 (Readiness Score), 15 (Success Metrics)
*   **Summary:** The PRD tracks a success metric of "average +20 score points" on re-audits, but stores the score engine version purely as a JSON artifact in the runner (`score_engine/v1.json`). If a customer re-audits their project after a rubric version bump (e.g., v1 -> v2), comparing the raw integer scores is mathematically invalid and will result in false regressions or improvements.
*   **Evidence:** "versioned and stamped on every audit as `score_engine_version: "v1"` so re-audits remain comparable across time." (10)
*   **Recommendation:** Move the score weights and thresholds into a Postgres table (`score_engine_versions`). When a re-audit occurs across a version boundary, the database must store both the `v2_score` *and* a `v1_equivalent_score` in the `score_snapshots` table. This allows the UI and analytics engine to query apples-to-apples deltas without requiring the application layer to fetch and back-calculate historical JSON configurations.

### Missing Core Tables for Workflows
*   **Section Reference:** 7.1 (Onboarding), 13.2 (Database)
*   **Summary:** The initial table list in 13.2 is incomplete and cannot support the workflows defined in the PRD. Specifically, it lacks tables for CLI device pairing and GitHub repository mapping.
*   **Evidence:** Section 7.1 requires customers to "paste the pairing code shown in the web app" and "Connect GitHub/GitLab via OAuth for repo-based audits". Section 13.2 lists `api_keys` and `oauth_tokens` but omits relationship tables.
*   **Recommendation:** Add the following tables to the schema migration plan:
    1.  `cli_devices` (id, tenant_id, pairing_code, public_key, last_seen_at).
    2.  `repositories` (id, tenant_id, provider, external_id, full_name).
    3.  `project_environments` or `project_repo_links` to map a `project` to a specific branch/commit in a `repository`.

## Major

### Missing `pg_cron` Retention Migrations
*   **Section Reference:** 13.4 (Secret handling & retention)
*   **Summary:** The PRD promises a configurable retention window (default 7 days) for customer code and transient run data, but relies on the application layer to enforce it. Application-layer sweeps are prone to failure and silently leave orphaned data, violating GDPR/IP promises.
*   **Evidence:** "held only for the duration of the run + a configurable retention window... Deleted permanently after the window." (13.4)
*   **Recommendation:** Implement the data sweep at the database level. Add a `retention_days` column to the `projects` table. Create a Postgres function `purge_expired_runs()` and schedule it using the `pg_cron` extension to run nightly. This function should cascade deletes to `runs`, `findings`, and trigger deletions in Supabase Storage.

### Unspecified Database Queue Implementation
*   **Section Reference:** 13.1 (Components), 13.2 (Database)
*   **Summary:** The architecture diagram suggests "Postgres or Redis BullMQ" for the job queue. If Postgres is chosen, standard tables are notoriously bad for high-concurrency queues without specific locking mechanisms, leading to deadlocks and double-execution.
*   **Evidence:** "Job Queue (Postgres or Redis BullMQ)" (13.1)
*   **Recommendation:** If using Postgres for the queue, do not build a naive `jobs` table. We must either enable the `pgmq` extension (available in Supabase) or explicitly design a `runner_jobs` table utilizing `SELECT ... FOR UPDATE SKIP LOCKED` to ensure atomic job checking without table-level contention.

## Minor

### Storage vs. Postgres Boundary for Evidence
*   **Section Reference:** 17 Decision 10 (Supabase storage), 9.3 (Output contract)
*   **Summary:** The split between Postgres and Supabase Storage is conceptually correct, but the boundary for "evidence" is blurry. Storing large text transcripts directly in a Postgres JSONB column will cause severe table bloat and degrade sequential scan performance.
*   **Evidence:** "evidence: { 'type': 'file' | 'url' | 'screenshot' | 'transcript' }" (9.3)
*   **Recommendation:** Define a strict byte-size threshold in the schema documentation. The `findings.evidence` column should be a `JSONB` type. If the evidence is a screenshot or a transcript > 5KB, the JSONB should only store a `storage_path` reference to the Supabase Storage bucket. Inline text (like a 3-line code snippet) is acceptable inside the JSONB.

### Missing Audit Log Table
*   **Section Reference:** 14.3 (Security), 13.2 (Database)
*   **Summary:** Security requirements mandate that all admin actions are audit-logged, but no table is provisioned for this.
*   **Evidence:** "All admin actions audit-logged (`audit-action.js` exists; needs productizing)." (14.3)
*   **Recommendation:** Add an `audit_logs` table (id, tenant_id, actor_id, action, target_resource, metadata_jsonb, created_at). This table should have an RLS policy that allows `INSERT` but restricts `UPDATE` and `DELETE` entirely, creating an append-only ledger.

## Polish

### Missing Native Postgres Enums
*   **Section Reference:** 13.2 (Database)
*   **Summary:** The PRD implies string states for verdicts and severities, which wastes space and risks data integrity if application validation fails.
*   **Evidence:** "Verdict: PASS | PASS WITH FIXES | FAIL" (9.3)
*   **Recommendation:** Create native Postgres `ENUM` types in the first migration:
    *   `CREATE TYPE finding_severity AS ENUM ('blocker', 'critical', 'major', 'minor', 'polish');`
    *   `CREATE TYPE run_status AS ENUM ('queued', 'running', 'verifying', 'completed', 'failed');`
    *   `CREATE TYPE audit_verdict AS ENUM ('pass', 'pass_with_fixes', 'fail');`
    Use these types in the `findings` and `runs` tables to guarantee state integrity at the schema level.
