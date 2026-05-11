# Database Migration Order

**Owner:** Atlas · **Phase:** 5 · **Gate:** every migration tagged with its milestone (PRD §16) and applied forward-only per `agents/data/atlas.md` rule 1 ("Schema changes are the most expensive changes. Take time to get them right.").

Migrations are numbered with a stable 4-digit prefix. **Never rewrite a shipped migration** — superseding changes ship as new files. Per-file rationale below; each milestone's migrations are gated by the corresponding PRD §16 exit gate.

## Files in `migrations/`

| File | Milestone | Gate (PRD §16) | What ships |
|---|---|---|---|
| `0001_initial.sql` | **M0 — Spike** | `pnpm test schema:validate` green, `runner/schemas/*.v1.{json,ts}` exist in HEAD, first synthetic run emits `X-AI-Generated` header | Tables (`tables.sql`) + ENUMs + indexes + `updated_at` triggers, wrapped in a single transaction. Seed row in `score_engine_versions` mirroring `architecture/schemas/score_engine.v1.json`. |
| `0002_rls_and_runner_jwt.sql` | **M1 — Audit MVP (BYOK only)** | RLS cross-tenant fuzz suite green; mint endpoint + runner-token audit trail working end-to-end | RLS enable + FORCE + policies (`rls-policies.sql`), `auth.tenant_id()` / `auth.runner_run_id()` / `auth.claim_role()` helpers, `audit_log_write` SECURITY DEFINER function, mint Edge Function deployment hook |
| `0003_billing_managed.sql` | **M2 — Managed mode + billing** | Stripe idempotency tests green; GDPR Art. 28 DPA published; D20 regional refund matrix wired | Stripe webhook UNIQUE constraint hardening (already in initial via `billing_events.stripe_event_id UNIQUE` — this migration adds the *processing* idempotency: a `SELECT … FOR UPDATE SKIP LOCKED` queue for replay, plus `disputes` table for B-DISPUTE flow, plus `subscriptions.region`-derived triggers that auto-open `cooling_off_windows` per D20 + D22) |
| `0004_cli_pairing_hardening.sql` | **M3 — CLI mode** | CLI pairing tamper/replay/unpaired-rejection tests green; external pentest exit (≤1 Major, 0 Critical) | CLI pairing pq_trgm index on `cli_pairings.hostname` (search), pairing-code expiry constraints, replay-attempt counters; Vault key-rotation hooks for `oauth_tokens` per V1.5 prep |
| `0005_lifecycle_emails_audit.sql` | **M4 — Lifecycle + Polish** | E1–E5 trigger correctness verified e2e; WCAG 2.2 AA third-party conformance audit passed | `pg_cron` lifecycle email scheduler hooks (E1–E5 timing rows + Postgres job rows), `audit_log_write()` callable from app layer with hardened grants, retention pg_cron job for `runs.archive_after` (cryptoshredding driver) |
| `0006_dmca_and_retention.sql` | **M5 — Public launch** | All M4 gates remain green; DMCA agent registered; 4 GTM channels active | DMCA `takedown_requests` table, `audit_logs` 7-year retention partitioning (by-year list partitioning to keep query plans tight), `breach_events` MFA-gated admin RPC hardening, `data_exports.expires_at` 90-day pg_cron purge |

## Why this order

**M0 (0001) — schema scaffold.** Atlas's rule 5: "Test migrations against production-like data, not an empty database." The initial migration is intentionally *complete shape-wise* so M1 can ship RLS against the real tables instead of evolving schema alongside policies. This avoids the motionmax pattern of "policies that assumed a column that didn't ship yet." The seed row for `score_engine_versions` lets Verify's contract test run against a DB-backed engine on day one.

**M1 (0002) — RLS lockdown + runner JWT minting.** RLS is enabled *after* the schema is stable so policy-design reviewers can read the policy file against a fixed table file. This also lets us prove the *negative* case in Verify's `integration/rls-cross-tenant.spec.ts` (PRD §18.5 Goal 5): Tenant A's JWT cannot SELECT Tenant B's findings row. The mint endpoint ships in the same migration as the policies so the `auth.tenant_id()` helper has a real producer end-to-end — see `runner-jwt.md`.

**M2 (0003) — Managed billing tables + Stripe idempotency.** Decision D6 (locked v0.4) reorders Managed before CLI. The `billing_events.stripe_event_id UNIQUE` constraint is the idempotency primitive (closes Ledger's billing-and-cancel.md Unhappy 4 acceptance criterion). D20 regional refund matrix needs the trigger that auto-opens `cooling_off_windows` on every `subscribe` or `upgrade` event for `region ∈ {eu, uk}` — that trigger ships here. D22 (cooling-off resets per upgrade) is encoded in the trigger logic, not in the table shape — so the trigger lives in this migration alongside the test that asserts the row count goes up on upgrade.

**M3 (0004) — CLI pairings.** Decision D6 reorders CLI to M3. The pairing-code-replay defence ships here, along with replay-attempt counters and revocation-undo plumbing for the 5-min undo window in `settings-and-account-management.md` S-CLI.

**M4 (0005) — Lifecycle email triggers.** E1–E5 sequences need a pg_cron-backed scheduler that fires on `runs.verdict = 'FAIL'` + `runs.product = 'surface'` (E2), `runs.verdict = 'PASS WITH FIXES'` (E3), etc. The scheduler is a Postgres job — putting it here rather than in app code is deliberate: email cadence is a data-layer SLO, and the database job survives app deploys. `audit_log_write()` becomes callable from the app layer at this point (it existed since 0002 but was service-role-only) — required by S-CLI revoke flow + the URL-audit attestation log.

**M5 (0006) — DMCA + retention triggers.** DMCA takedown lifecycle (intake → review → action → audit) ships at M5 because of the DMCA Designated Agent registration (PRD §14.5). `audit_logs` is partitioned at this point to keep the 7-year retention performant — partitioning earlier would have been premature; partitioning later would have meant a costly online repartition. 90-day pg_cron purge for `data_exports.expires_at` per `settings-and-account-management.md` EC-6.

## Conventions

1. **Forward-only.** Every migration is wrapped in `BEGIN; … COMMIT;` and tested against a clone of the staging dataset before merging (`agents/data/atlas.md` rule 5). Never modify a shipped migration — supersede with a new file.
2. **One concern per migration.** A migration either changes schema OR adds policies OR adds data — never two at once. Reviews are reviewable.
3. **Destructive changes ship as multi-step.** Per Atlas's rule: (1) add new column → (2) backfill → (3) switch reads → (4) drop old column. Each step is its own migration file with its own milestone tag.
4. **Seed data is separate from schema.** `0001_initial.sql` adds the v1 `score_engine_versions` seed row at the *end* of the transaction, after the table exists; further seed data ships in `0007_seed_demo_data.sql` (post-M5, for the demo tenancy used in marketing screenshots).
5. **Every migration declares its rollback plan.** Even when forward-only, the rollback is documented in the file header so the on-call has a path if a deploy lands a corrupted state. Rollback for `0001` = drop schema, restore from snapshot (this is what the staging-clone test exists to prevent).

## Cross-references

- `tables.sql` — DDL contents wrapped into `0001_initial.sql`.
- `rls-policies.sql` — policy contents wrapped into `0002_rls_and_runner_jwt.sql`.
- `runner-jwt.md` — spec for the mint Edge Function deployed alongside `0002`.
- PRD §16 — milestone exit gates these migrations are tagged against.
- `ia/user-flows/audit-run-state-machine.md` — `runs.state` enum values must match its state-name list verbatim.
- `ia/user-flows/billing-and-cancel.md` — billing tables + D20 regional matrix backing here.
- `ia/user-flows/settings-and-account-management.md` — consent / retention / data_exports / S-DEL grace logic backing.
- `agents/data/atlas.md` — Atlas's data-layer rules.
- `BUILD_FLOW.md` Phase 5 exit gate — every schema file exists in HEAD; `pnpm test schema:validate` green.
