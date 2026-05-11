# Studio Zero — Architecture Decisions Log

**Phase:** 5 — Tech Architecture
**Owner:** Axiom (Strategy layer lead)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** First draft for Phase 5 Jury exit gate
**Format:** mirrors `shared_context/projects/studio-zero-productization/decisions.md` (cross-phase) and PRD §17 (PRD-scoped). This log holds **architecture-scoped** decisions (`ARCH-Dn`) that arose during Phase 5 and don't belong in either of the other two logs.

> **Method.** Each decision: trigger, options considered, chosen path, rationale, cross-references to PRD-D / IA-D / Atlas / Shield / Verify / Cipher domains, reviewers, status. Never deleted; superseded with a new entry that links back. Per `BIGBRAIN.md` Hard Rule §3 ("no silent decisions").

---

## ARCH-D1 · Job queue: pg-boss inside Postgres

**Status:** LOCKED 2026-05-11
**Cross-refs:** PRD §13.1 (component diagram says "Postgres or Redis BullMQ — pick one"), PRD §17 D8 (sandbox = self-hosted worker, needs queue + worker host), PRD §13.5 (per-tenant queue depth caps).
**Reviewers:** Atlas (RLS-compat), Forge (worker impl), Crash (retry semantics), Sprint (infra cost & ops).

**Trigger:** PRD §13.1 diagram offers Postgres-backed queue OR Redis BullMQ. Sprint and Forge will pick differently if not locked. The choice affects: ops surface area (1 service vs 2), idempotency primitives, per-tenant cap enforcement, and Atlas's RLS scope.

**Options considered:**

| Option | Pros | Cons |
|---|---|---|
| **A. `pg-boss` (Postgres-backed)** | Zero new infra (uses existing Supabase Postgres); SKIP LOCKED idempotency mature; RLS extends naturally to job tables (per-tenant); cost = $0 incremental; failure-domain consolidates with DB (one less thing to monitor); single-region matches MVP | Higher DB load (poll-driven); not ideal at 1000+ jobs/sec; lacks Redis-pubsub channels (we don't need them) |
| **B. `graphile-worker` (also Postgres-backed)** | Same pros as A; arguably better cron support | Less battle-tested at production scale than pg-boss; smaller ecosystem |
| **C. Redis BullMQ (managed Upstash)** | High throughput; native pubsub for low-latency dispatch; well-known tooling | NEW infra (Upstash account, vault entry, monitoring); ~$10–30/mo cost; second SLA to track; Realtime is on Postgres so RTT to Redis adds inter-service hops; RLS doesn't extend (per-tenant cap needs app-layer enforcement) |
| **D. Supabase Queues (PGMQ-based, in beta as of 2026-05)** | Managed inside Supabase; tight integration | Beta product; vendor-coupling without escape hatch; not battle-tested |

**Chosen: A — pg-boss.**

**Rationale:**
1. At MVP scale (target 25 paying customers in 60 days per PRD §15) the throughput ceiling for any Postgres-backed queue is **2–4 orders of magnitude above** projected load. We are not queue-bound for the next 12+ months.
2. Failure-domain consolidation (system-diagram §6) — when Postgres is down, runs queue. When Redis is down AND Postgres is up, the Web App is half-healthy: hard to reason about, hard to surface honestly on `/status`.
3. **RLS extension** (Atlas's lock-in): pg-boss job tables can have a `tenant_id` column and RLS policy `tenant_id = auth.tenant_id()`. Per-tenant queue depth caps become a SQL SELECT count — no app-layer race condition.
4. Sprint's ops cost calculation: pg-boss = $0/mo at MVP; BullMQ on Upstash = $10–30/mo + ~5 hrs/mo of dashboard tending. Pre-revenue dollars matter.
5. The pg-boss `SKIP LOCKED` pattern is the same idempotency primitive BullMQ uses; functionally equivalent at our scale.

**For Atlas to validate:** the pg-boss tables (`pgboss.job`, `pgboss.archive`) must be in a separate schema with RLS enabled and a tenant-scoped policy. Migration in `architecture/database/migrations/0003_pg_boss_install.sql`.

**Reversibility:** medium. Migrating to BullMQ later is a 2-week task once we hit 100+ runs/sec (not foreseeable in 2026).

**Open follow-up:** Forge writes the worker as a long-running Node process on Railway (not Vercel Functions; functions can't poll). One worker per container; horizontal scale = more containers. ARCH-D2 picks Railway as the host.

---

## ARCH-D2 · Runner host: Railway (us-east)

**Status:** LOCKED 2026-05-11
**Cross-refs:** PRD §13.1 (hosted runner is part of the architecture), PRD §13.5 (rootless container + seccomp + egress allowlist), PRD §17 D8 (sandbox is M1 exit gate), PRD §14.4 (US-only residency).
**Reviewers:** Forge (deploy ergonomics), Shield (sandbox primitive availability), Cipher (egress filter), Sprint (cost), Crash (region match).

**Trigger:** PRD §13.5 specifies sandbox primitives (rootless container, dropped caps, seccomp, egress allowlist) but doesn't pick a host. ARCH-D1 picks pg-boss → workers run as long-running processes, not serverless functions → we need a host that runs **stateful Linux containers** with custom seccomp and network policy.

**Options considered:**

| Option | Sandbox primitives | Region match | Cost @ ~30 runs/day | Ops burden |
|---|---|---|---|---|
| **A. Railway (us-east)** | Rootless containers, custom Dockerfile, seccomp via Docker security-opt, egress via Cilium-equivalent + iptables in initContainer | us-east (Virginia DC; matches Supabase us-east-1 within ~5ms RTT) | ~$20/mo for 1 worker idle, scales to ~$80/mo at MVP load | Low — built-in observability, deploys from git |
| **B. Render** | Same primitives | us-east available | Similar pricing | Similar |
| **C. Fly.io** | Rootless **Firecracker microVMs** (stronger isolation than rootless containers) | iad region | ~$5/mo idle, $30/mo at load | Low; flyctl is solid |
| **D. Cloudflare Containers** (in beta) | Limited seccomp customization; egress via Workers | Multi-region only (Cloudflare edge) | TBD | Beta — too immature |
| **E. AWS Fargate** | Full primitive control | us-east-1 native | $30–60/mo | High — ECS/IAM/VPC overhead is hostile to a 4-person team |
| **F. Self-hosted on a VPS (Hetzner/DigitalOcean)** | Full control | us-east available | $10–20/mo | Highest — patching, monitoring, backups all manual |

**Chosen: A — Railway us-east.** Defer Fly.io's Firecracker primitive as the V2 graduation host (matches PRD D8 phasing: "Firecracker microVM as V2 graduation gate after first clean pentest").

**Rationale:**
1. **Sandbox primitives:** Railway supports custom Dockerfiles with `security-opt no-new-privileges`, custom seccomp JSON, and network policy via sidecar. The PRD D8 spec is achievable on Railway.
2. **Region match:** Railway us-east is in the same Virginia data center cluster as Supabase us-east-1 and Vercel iad1 — RTT < 5ms p50 for Realtime + DB writes during streaming AuditEvents. Critical for PRD §14.1 perf SLOs.
3. **Cost:** at projected MVP load (25 customers × ~5 audits/mo = 125 runs/mo ≈ 4 runs/day), one always-on container @ $20/mo plus burst-scaling to 2–3 containers during peak is < $100/mo. Penny's unit economics ($29–249/mo SKU prices) absorb this comfortably.
4. **Ops burden:** Forge's experience matches Railway; no IaC-from-scratch overhead. Sprint says Forge needs to focus on the runner, not the host.
5. **Fly.io's Firecracker primitive is the V2 graduation path** — PRD D8 explicitly: "Firecracker microVM as V2 graduation gate." When pentest at M3 exit passes, we have a 2-quarter window before V2 launch to migrate workers from Railway containers to Fly Firecracker. The runner code itself is portable (it's just a Node binary calling `runner.runAudit()`); the host swap is mainly Dockerfile + IaC.

**For Shield to validate:** the seccomp profile + Cilium NetworkPolicy must be in `architecture/iac/runner-pool/seccomp.json` + `network-policy.yaml` and applied via Railway's `railway.json` config. Egress allowlist hostnames per system-diagram TB-4.

**Reversibility:** high. Runner code is portable; we are not building on Railway-specific APIs.

**Open follow-up:** Fly.io as failover region if Railway us-east outage exceeds 1h. Not a v1 deliverable; flagged for V2 multi-host plan.

---

## ARCH-D3 · Short-lived tenant JWT minting (closes Atlas v0.2 Blocker B2)

**Status:** LOCKED 2026-05-11
**Cross-refs:** PRD §13.5 ("runner authenticates via short-lived tenant-scoped JWTs minted at job dispatch"), Atlas v0.2 PRD review B2 (service-role keys bypass RLS — must NOT be used by runners).
**Reviewers:** Atlas (RLS-correctness), Cipher (key management), Shield (replay-attack surface), Forge (impl).

**Trigger:** PRD §13.5 names the pattern but doesn't spec it. Forge will reach for the service-role key (it's a "just use this" key that bypasses RLS) unless we lock the alternative.

**Decision:** A dedicated Supabase Edge Function `mint-runner-jwt` is the **sole minter** of runner JWTs. Specification:

- **Endpoint:** `POST /functions/v1/mint-runner-jwt`
- **Auth:** caller must present the **service-role JWT** (only the Web App's job-dispatcher code has this; never the runner itself)
- **Input:** `{ run_id, tenant_id, ttl_seconds }`
- **Validation:** verify (a) `runs` row exists with matching `tenant_id`, (b) state is `queued` or `dispatched`, (c) caller is service-role
- **Output:** JWT signed with Supabase's JWT secret, claims (v0.5 Cipher Fix-3a — `aud` static, `run_id` separate claim, matching Atlas's `runner-jwt.md` shape so RLS predicates aren't doing string parsing):
  ```json
  {
    "sub": "worker:<hostname>",
    "aud": "studio-zero/runner",
    "iss": "studio-zero/mint-runner-token",
    "tenant_id": "<tenant_id>",
    "run_id": "<run_id>",
    "role": "runner",
    "jti": "<uuid>",
    "iat": <now>,
    "exp": <now + 300>
  }
  ```
- **TTL:** **300s (5 minutes), hard cap.** Long-running audits (Comprehensive depth ~45 min) refresh mid-run via a tiny `/functions/v1/refresh-runner-token` RPC that re-validates the same membership check and re-mints with the same claims. v0.5 Jury B3 + Cipher Fix-3 reconciliation: 5-min cap is the source of truth across all docs (was a 5 vs 15 vs 30 drift across Axiom/Atlas/Shield).
- **Rotation:** **refresh-on-heartbeat.** Token expires every 5 min; the runner heartbeat at 30s intervals checks `exp - now < 60s` and calls the refresh RPC. Both mint and refresh land a row in `runner_token_mints` (audit trail). Revocation flips `runner_token_mints.revoked_at`; the RLS policy joins this and rejects revoked `jti`s immediately (closes Cipher Fix-5 — applied at M1 with the rest of the policy set).
- **Audience binding (CRITICAL):** the RLS policies on `findings`, `runs`, `score_snapshots`, `cli_pairings` check `auth.tenant_id()` AND `auth.runner_run_id()` (helper functions extract claims). A runner JWT only works for the specific run it was minted for, in its specific tenant. No string parsing of `aud` — claims are typed columns in the JWT.

**Options considered (and rejected):**

| Option | Why rejected |
|---|---|
| **B. Service-role key from runner** (the "just use this" path) | Bypasses RLS entirely; tenant isolation becomes app-layer concern; Atlas B2 blocker; PRD §13.5 explicitly forbids |
| **C. Long-lived tenant JWT** (cached) | Replay attack window grows; revocation requires a deny-list; complexity for ~zero benefit |
| **D. mTLS between runner and Supabase** | Supabase doesn't expose mTLS surface on the data plane; would require self-hosting |
| **E. OAuth client-credentials grant** | Same JWT outcome with more ceremony |

**Rationale:**
1. **Atlas's B2 closure:** Atlas v0.2 named service-role-key-in-runner as a Blocker. This decision closes it by definition.
2. **Audience binding** is the load-bearing part. Even if a runner JWT leaks, it works for one run_id only, in a 5-min window, and only for one tenant. Blast radius is minimal.
3. **Refresh-on-heartbeat** avoids the "Comprehensive audit takes 45min but JWT expired at 5min" footgun without going to long-lived tokens.
4. **Single point of minting** (an Edge Function) means we can audit-log every mint event for forensics. Mint logs land in `audit_logs` per PRD §14.3.

**For Atlas to validate:** RLS policy for `findings`:
```sql
CREATE POLICY findings_select ON findings FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (
      auth.jwt() ->> 'aud' = 'authenticated'
      OR auth.jwt() ->> 'aud' = 'runner-' || run_id::text
    )
  );
```
Negative test in `tests/acceptance/integration/runner-jwt-cross-run.spec.ts`: a JWT minted for `run_A` cannot SELECT findings for `run_B` even within same tenant. **For Verify to add to M1 exit gate.**

**Reversibility:** medium. Changing audience-binding pattern later requires re-issuing all RLS policies.

---

## ARCH-D4 · Webhook reconciliation (Stripe asynchronous delivery)

**Status:** LOCKED 2026-05-11
**Cross-refs:** PRD §13.5 (per-tenant token budgets gated on subscription state), PRD §17 #20 (regional refund matrix, FTC Click-to-Cancel), `ia/user-flows/` Trace's checkout-return flow.
**Reviewers:** Ledger (Stripe integration), Forge (idempotency), Trace (UX flow).

**Trigger:** Stripe `customer.subscription.created` webhook is async — typically < 1s after Checkout Session completes, but during incidents can be 30s+. The browser-side `cs_complete` redirect fires immediately. If UI claims "Your purchase is complete" before the webhook lands, entitlement checks (`subscriptions` table read) on the next page render can fail.

**Decision:** `/app/billing/checkout` (the Stripe Checkout return URL) implements a **bounded polling reconciliation** pattern:

1. Return URL receives `?cs=<session_id>` query parameter
2. Page server-loader calls `GET /api/billing/reconcile?cs=<session_id>`
3. Reconcile endpoint:
   - First, check `subscriptions` table for row matching session — if present, return immediately (webhook beat us)
   - Else, call `stripe.checkout.sessions.retrieve(cs)` to fetch live status
   - If `payment_status='paid'` AND `subscription` populated:
     - Upsert `subscriptions` row using `stripe_subscription_id` as idempotency key
     - Insert `billing_events` row
     - Return success
   - Else, return 202 Accepted with `retry_after_ms: 2000`
4. Browser polls every 2s up to **10 attempts (20s total)**
5. On final attempt failing: render "Your purchase is processing — we'll email you when it's ready" (Resend transactional email triggered when webhook lands)
6. **Idempotency:** the webhook handler at `/webhooks/stripe` uses the same upsert with `stripe_subscription_id`. Whether the poller or the webhook lands first, the row is written exactly once.

**Options considered (and rejected):**

| Option | Why rejected |
|---|---|
| **B. Synchronous wait-on-webhook** (block until webhook arrives) | Blocks browser; bad UX during incident |
| **C. Optimistic UI** (just trust `cs_complete` and assume entitlement) | Webhook can fail (signature mismatch, dropped); customer gets entitlement they didn't pay for; reverse-charge headache |
| **D. Poll Stripe directly forever** | Wastes Stripe API quota; not idempotent across browser refreshes |
| **E. Server-Sent Events from webhook handler** | Adds infrastructure complexity for the ~1% case |

**Rationale:**
1. **Bounded polling** (10 × 2s = 20s) handles the 99.9% case where webhook lands fast OR our reconcile-poll beats it.
2. **Webhook handler is the source of truth** for long-running events (subscription updates, refunds, disputes). The reconcile endpoint exists ONLY for the immediate-post-checkout user moment.
3. **Idempotency via `stripe_subscription_id`** as the upsert key means there is no race condition. Both code paths write the same row.
4. **Graceful failure copy** ("Your purchase is processing") is honest and respects PRD §14.7's transparency posture.

**For Ledger to validate:** Stripe webhook signature verification + idempotency key handling per `architecture/iac/stripe-webhook.md`. Negative tests in `tests/acceptance/integration/stripe-webhook-replay.spec.ts` and `tests/acceptance/integration/stripe-reconcile-race.spec.ts`. Both M2 exit gate per PRD §16.

**Reversibility:** high. Polling endpoint can be removed if we move to SSE; webhook handler is untouched.

**Open follow-up:** the same pattern applies to Stripe's `invoice.payment_failed` event (Customer Portal flow). Trace owns the flow; Ledger owns the impl. Re-use this decision.

---

## ARCH-D5 · Realtime fan-out budget (concurrent runs per tenant)

**Status:** LOCKED 2026-05-11
**Cross-refs:** PRD §13.6 (per-run timeline live in dashboard), PRD §14.1 (perf SLOs), `ia/user-flows/audit-run-state-machine.md` EC-2 (browser-close-resume, EC-4 (websocket disconnect fallback).
**Reviewers:** Stream (Realtime channel patterns), Atlas (data-volume estimate), Crash (fallback paths).

**Trigger:** Supabase Realtime supports ~10k concurrent connections per project on the free tier and ~100k on Pro. **Fan-out** (per-event subscriber count) is the real bottleneck — every reviewer emits ~4 events/sec throttled (HC2 in PRD §14.6), so a Comprehensive audit emits ~24 events/sec to its channel. Multiple subscribers (web + share-page + admin) multiplies. At 100 concurrent runs, this becomes ~2400 events/sec inbound to Realtime per project.

**Decision:** **Per-tenant + per-run channel naming + admin-side aggregation pattern.**

- **Channel naming convention:** `runs:<run_id>` (one channel per run). NOT `runs:<tenant_id>` (would cross-pollute).
- **Subscribers per channel:** typically 1 (the customer's browser); occasionally 2 (customer's second tab); rarely 3 (customer + admin observer). Hard cap not enforced.
- **Admin channel:** `admin:runs` is a separate channel where ALL run events are mirrored (admin observability). Subscriber count = 1–3 (Watch on-call). Mirroring is a single `pg_notify` extra at write-time; cost is negligible.
- **Presence:** not used at MVP. PRD has no multi-user-per-tenant feature (deferred to V2 per decision #9).
- **Event payload size cap:** ≤ 4 KB per event. AuditEvent payloads with `kind: 'finding'` containing large evidence blobs are stripped to evidence pointers; full blob lives in Storage; client fetches on demand.
- **Throttle:** ≤ 4 updates/sec per agent per HC2 in PRD §14.6 — enforced at the Runner side (debounce before emit). Not a Realtime-side concern.
- **Buffer retention** (closes OQ-4 in audit-run-state-machine.md): events are persisted to `runs.events_log` (JSONB array, append-only) at the time of emit; late subscribers (EC-2 browser-close-resume) replay from this table, NOT from Realtime's in-memory buffer. Retention: 24h after `verdict_emitted` then events are pruned (kept beyond that only on debug-flag).

**Fan-out budget at MVP scale:** 25 paying customers × ~0.1 concurrent runs each ≈ 3 concurrent runs system-wide. Even at 30× burst load (90 concurrent runs × 24 events/sec × 1.5 avg subscribers) = ~3.3k events/sec inbound. Supabase Pro tier handles this. **For Atlas:** confirm with Supabase Pro tier's published Realtime limits before M2 (Managed launch); flag if MVP-scale assumptions change.

**Options considered (and rejected):**

| Option | Why rejected |
|---|---|
| **B. Single `tenant:<id>` channel for all runs in a tenant** | Cross-pollutes events; customer with run A sees run B's progress; RLS-style scoping needs row-level not channel-level |
| **C. WebSockets bypassing Realtime (direct from runner via SSE)** | Doubles infra surface; loses Realtime's built-in fan-out + RLS-aware filter |
| **D. Poll-only (no websockets)** | Bad UX for live progress; doesn't meet PRD §7.2 Step C's streaming requirement |

**Rationale:**
1. **One channel per run** is the natural scope. RLS on the row → subscriber's JWT → Realtime's row-level subscribe filter enforces tenant isolation.
2. **Replay from `runs.events_log`** (not from Realtime's buffer) is necessary anyway for cross-session resume (EC-2). The same primitive handles fan-out late-subscribers.
3. **Admin mirroring channel** is one extra `pg_notify` per event — negligible. Keeps admin observability simple.

**For Verify:** load test asserting 90 concurrent runs × ~24 events/sec sustained for 5 min, p95 event-delivery < 500ms, no Realtime-side errors. M2 exit gate per PRD §16.

**Reversibility:** high. Channel naming convention can change with a thin client-side router.

---

## ARCH-D6 · GitHub App webhook stale-tracking gap (closes PRD-D23)

**Status:** LOCKED 2026-05-11
**Cross-refs:** PRD §11.2 (Auto-PR fix delivery V1.5), PRD §17 D23 (uninstall-after-PR-opened), `shared_context/projects/studio-zero-productization/decisions.md` IA-D3 (re-audit semantics — project as entitlement boundary).
**Reviewers:** Atlas (schema), Forge (webhook handler), Trace (UI flow + banner copy), Comply (audit-log retention).

**Trigger:** PRD D23 says "PR persists in customer's repo; Studio Zero loses webhook visibility into merge status. UI shows banner 'Tracking unavailable — reinstall the Studio Zero GitHub App to resume merge status.'" but no schema field exists to drive the banner. Without a column, the UI cannot conditionally render the banner; without a webhook handler that flips the column, no event drives the state change.

**Decision:** Add `runs.tracking_state` enum column AND `fix_pr_jobs.tracking_state` enum column with values `('active', 'stale', 'recovered')`.

**State transitions:**

| From → To | Trigger |
|---|---|
| `active` (initial) | row created |
| `active → stale` | GitHub webhook `installation.deleted` arrives AND there's an open `fix_pr_jobs` row whose `github_installation_id` matches the uninstalled installation |
| `stale → recovered` | GitHub webhook `installation.created` arrives AND existing `fix_pr_jobs.github_installation_id` matches |
| `stale → stale` (no-op) | webhook for stale install arrives (idempotent) |

**UI consequences:**

- On `/app/audits/[run-id]/pr/[pr-id]` (V1.5): when `tracking_state='stale'`, banner per PRD D23 copy; CTA "Reinstall GitHub App" links to `/auth/install/github`.
- On `/app/audits/[run-id]`: when any `fix_pr_jobs.tracking_state='stale'` for the run, banner shows.
- On `/app/settings/integrations/github`: a list of "stale tracking" runs with one-click "Reinstall" CTA.

**Recovery:** when user re-installs, `installation.created` webhook fires. Handler checks for existing `fix_pr_jobs` rows with matching `github_installation_id` and flips to `recovered`. The PR's actual merge state is then queried via `GET /repos/:owner/:repo/pulls/:number` and persisted to `fix_pr_jobs.merge_state`. This is **best-effort recovery** — between uninstall and re-install we have ZERO visibility into merge events; we surface this honestly ("Tracking resumed — last known state was 'open' on 2026-05-09; current state is 'merged'").

**Options considered (and rejected):**

| Option | Why rejected |
|---|---|
| **B. Long-lived OAuth grant for merge-status read-only** | Violates D1 (per-repo permissions only); blast radius of leaked token unacceptable |
| **C. Webhook deliveries via customer-installed GitHub Action** | Infra burden too high for MVP; deferred to V2 if Auto-PR attach rate > 15% (per PRD D23) |
| **D. Periodic polling via GitHub API** | Hits rate limits at scale; wasteful; race condition with webhooks |

**Rationale:**
1. **Honest UX wins.** Customer knows their data is stale; they have a one-click fix; we don't pretend we know things we don't.
2. **Schema-as-files**: this column MUST exist at M0 even though Auto-PR is V1.5. Migrating the column in later means migrating production data; Atlas's PRD lessons-learned ("schemas-as-files, not schemas-as-prose") locks it in early.
3. **Recovery is best-effort** by design. Per D1 blast-radius, we accept some informational gap as the price of permission minimalism.

**For Atlas:** add columns in `architecture/database/migrations/0007_tracking_state.sql`:
```sql
ALTER TABLE runs ADD COLUMN tracking_state text NOT NULL DEFAULT 'active'
  CHECK (tracking_state IN ('active','stale','recovered'));
ALTER TABLE fix_pr_jobs ADD COLUMN tracking_state text NOT NULL DEFAULT 'active'
  CHECK (tracking_state IN ('active','stale','recovered'));
```

**For Trace:** banner copy + UX is per PRD D23. Halo confirms `role="status"` on the banner per HC1.

**For Verify:** acceptance test in `tests/acceptance/e2e/github-app-uninstall-tracking.spec.ts` — V1.5 milestone gate.

**Reversibility:** high. Adding the column now is cheap; the constraint is forward-compatible.

---

## ARCH-D7 · Edge Function vs API route boundary

**Status:** LOCKED 2026-05-11
**Cross-refs:** PRD §13 (architecture), PRD §10 (score engine versioning), system-diagram C1, C6.
**Reviewers:** Forge (impl ergonomics), Atlas (DB co-location), Cipher (secret handling), Verify (testability).

**Trigger:** Both Supabase Edge Functions (Deno isolates) and Vercel Server Actions / API routes (Node.js) can run server-side code, verify JWTs, read DB, call external APIs. Without a clear rule, Forge will inconsistently place sensitive ops, and we'll get drift (e.g., score-engine implementation in TWO places that can drift in version).

**Decision:** **Edge Functions own** four kinds of operations; **Vercel API routes own** everything else.

**Edge Functions own:**

1. **`mint-runner-jwt`** (per ARCH-D3) — must run server-side with service-role auth; close to DB to avoid double-network-hop; auditable.
2. **`byok-validate`** — the Anthropic dry-run call must NOT touch Vercel function logs (BYOK key would land in Sentry-equivalents); Edge Fn isolates have stricter log scoping.
3. **`score-engine`** — single source of truth for deterministic score computation (PRD §10). Loads `score_engine.v1.json` as bundled asset. Runner posts findings → Edge Fn returns `{score, verdict, score_breakdown, score_engine_version}`. Web App also calls this Edge Fn if explainability requires recompute. **Both code paths use the same compute primitive — no drift possible.**
4. **`jury-reaudit-gate`** (V1.5) — the gating logic for Auto-PR open. Must be the ONLY code path that can transition `fix_pr_jobs.state='reaudit_passed'` (enforced by RLS predicate referencing `auth.jwt() ->> 'iss' = 'supabase-edge-functions'`).
5. **Webhooks** with HMAC verification: `stripe-webhook`, `github-webhook`. Co-located with DB for atomic writes; signature secret loaded from Edge Fn secrets store (not exposed to Vercel env).

**Vercel API routes own:**

1. All authenticated user-driven CRUD: `POST /api/runs`, `GET /api/runs/[id]`, `POST /api/projects`, `PATCH /api/settings/*`, etc.
2. Authentication flow handlers that need Next.js cookie support: signup, login, OAuth callbacks (`/auth/callback/{google,github}`)
3. Admin routes: `/api/admin/*` (audit-logged via middleware in Next.js)
4. Static-data + RSS endpoints: `/subprocessors/feed.xml`, `/sitemap.xml`
5. Health: `/healthz`

**Options considered (and rejected):**

| Option | Why rejected |
|---|---|
| **B. Everything in Vercel** | Score-engine drift risk (runner has to duplicate the logic); BYOK dry-run leaks key to function logs; webhook handler not co-located with DB → atomic-write gap |
| **C. Everything in Edge Functions** | Deno's ecosystem is narrower; Next.js cookies + Auth callbacks awkward in Deno; admin debugging is harder; ALL traffic goes through Supabase egress |
| **D. Per-route case-by-case** (no rule) | Exactly the contradiction surfaced in system-diagram C1 — leads to drift |

**Rationale:**
1. **Co-location matters for atomicity.** Webhook handlers MUST write to DB atomically with verification; Edge Fns are physically next to Postgres in us-east-1.
2. **Score-engine single-source-of-truth** is non-negotiable per PRD §10 versioning convention. One Edge Fn loading one JSON file is the simplest possible implementation.
3. **Cold start cost:** Edge Functions cold-start in ~50ms (Deno); Vercel Functions in ~200ms (Node). For our use, both are acceptable; the choice is by responsibility, not perf.
4. **Debuggability:** Vercel's logs UI is superior for human debugging; Edge Fns logs go through Supabase dashboard. We keep the user-driven CRUD where humans look first.

**For Forge:** the file boundary is enforced by directory structure:
- `apps/web/app/api/**` — Vercel API routes
- `supabase/functions/**` — Edge Functions

A CI lint rule (Verify-owned) rejects any Edge Function whose responsibility doesn't match the four categories above. **Pre-commit check in `tools/lint-edge-fn-scope.ts`.**

**Reversibility:** medium. Moving a function from Edge → API (or vice versa) is a 1–2 day refactor per function.

---

## ARCH-D8 · Multi-region deferral plan (US-only at MVP)

**Status:** LOCKED 2026-05-11 (deferral); MIGRATION PATH SPECCED
**Cross-refs:** PRD §14.4 (US-only data residency at MVP, EU residency when first EU customer asks), PRD §17 #17 (DPA + subprocessors), PRD §17 #20 (regional refund matrix — already implemented at MVP for billing, separate from data residency).
**Reviewers:** Atlas (schema for residency tag), Comply (DPA addendum for EU), Cipher (Vault residency), Forge (per-tenant routing middleware).

**Trigger:** PRD §14.4 commits to US-only at MVP but doesn't spec the migration path. When the first EU customer asks, we have weeks (not months) of legal pressure to deliver EU data residency. Without a pre-locked plan, that becomes an emergency.

**Decision:** US-only at MVP. **Pre-spec the migration path so it can be executed in < 3 weeks when triggered.**

**Migration plan when first EU customer requests data residency:**

1. **Provision a second Supabase project** in `eu-west-1` (or `eu-central-1` per customer's specific jurisdiction). Parallel to us-east-1; same schema; same RLS policies; same Vault setup.
2. **Add column** `tenants.data_residency` enum `('us', 'eu')`, default `'us'`. Existing tenants stay `'us'`; new EU tenants tagged `'eu'` at signup.
3. **Provision a corresponding Railway runner pool** in `eu-west` (Amsterdam DC). Runner code is unchanged; only deploy target changes. Egress allowlist verified to include EU Anthropic endpoint if it exists at that time.
4. **Web App middleware** reads `tenants.data_residency` from the session JWT claim, routes DB calls + Realtime + Storage to the correct Supabase project. Middleware code in `apps/web/middleware.ts`.
5. **RLS policies do NOT change** — they already scope by `tenant_id`; the routing layer ensures the JWT only ever hits the project containing that tenant's rows.
6. **Stripe billing region** is independent (already supports EU per PRD #20).
7. **DPA addendum** drafted by Comply pre-emptively (lives in `compliance/dpa-eu-addendum.md`); customer signs as part of EU-region onboarding.
8. **Subprocessor list updated** per PRD #17 30-day notification commitment if any new EU subprocessor is added (likely: Supabase EU region appears on the subprocessor list).
9. **Migration of existing tenants** from US → EU is NOT supported at first delivery — too complex to do safely cross-region; customers explicitly choose at signup. For pre-existing customers who later need EU residency, manual data-migration procedure handled case-by-case until V2.

**Options considered (and rejected):**

| Option | Why rejected |
|---|---|
| **B. Multi-region from MVP** | Adds 4+ weeks to M1; cost doubles; no EU customer demand validated yet |
| **C. Self-host EU region on AWS direct** | Replaces Supabase's managed pieces; massive ops burden; not Studio Zero's core competency |
| **D. CDN-only EU edge (no DB residency)** | Doesn't satisfy GDPR "data of EU residents stored within EU" interpretation |

**Rationale:**
1. **YAGNI for MVP:** US-only is honest, in line with PRD §14.4, and matches Stripe/Vercel/Supabase MVP setup patterns.
2. **Pre-spec is cheap insurance:** writing this plan now (3 hrs of Axiom + Atlas + Comply time) prevents a 3-week emergency later.
3. **Per-tenant routing** is the right primitive — keeps RLS untouched; only the DB-connection middleware changes.
4. **Stripe billing** already handles EU via Decision #20, so the customer-facing billing experience is region-aware from day one. Only data residency lags.

**For Atlas:** the migration plan implies a column `tenants.data_residency` that does NOT need to exist at M0 — it's a DDL migration done at trigger time. Document the migration in `architecture/database/migrations/_planned_/data_residency.sql` so it's ready to apply.

**For Comply:** draft `compliance/dpa-eu-addendum.md` pre-emptively. Subprocessor change-notification process (PRD #17) tested with a dry-run before first EU customer.

**Reversibility:** N/A — this is a forward-only migration plan.

**Status:** PLAN LOCKED; trigger condition = first EU customer request for data residency commitment.

---

## Still open after ARCH-D8 (need cross-team sign-off, not Jo's call)

- **ARCH-D9 (Shield + Cipher) — Egress allowlist enforcement primitive.** Surfaced in system-diagram §9 contradiction C7. DNS-only enforcement is leaky; Cilium NetworkPolicy + DNS combo is the current plan but the implementation primitive on Railway requires validation. Owner: Shield. Deadline: M1 exit gate.
- **ARCH-D10 (Atlas) — `cli_heartbeat` event in AuditEvent enum.** Surfaced in system-diagram §9 C3. Single contract for run-progress AND device-liveness vs separate channels. Owner: Atlas. Deadline: M3 exit gate (CLI launch).

These are NOT blockers for Forge starting M0 scaffolding; they are layer-specific specs that Atlas/Shield/Cipher own and will land in their Phase-5 deliverables.

---

*End of architecture decisions log v0.1. Axiom — Strategy Layer.*
