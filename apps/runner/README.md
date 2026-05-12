# Studio Zero — Hosted Runner

Phase 9 M1 Batch 2 (Forge-2). Long-running Node TS worker that consumes
pg-boss jobs from Postgres and drives audit reviewers.

## What this is

The runner is one container, one Node process, multiple in-flight runs
per worker (configurable). It:

1. Subscribes to the `audit-run` pg-boss queue (ARCH-D1).
2. For each job: mints a short-lived runner-JWT (ARCH-D3), starts a
   heartbeat-driven refresh loop, and drives the audit through the
   state machine (`reviewers_running → all_reviewers_complete →
jury_synthesizing → verdict_emitted`).
3. Calls Cipher's LLM gateway (ARCH-D7) — NEVER holds the raw Anthropic
   key.
4. Calls the score-engine Edge Function for the deterministic readiness
   score — NEVER computes it locally (ARCH-D7).
5. Writes findings to Postgres via a Supabase client whose only auth is
   the runner-JWT. RLS (Atlas migration 0002) refuses any write outside
   the run's tenant + run_id.

The runner is a customer-facing surface from a threat-model perspective.
Its credentials are minimal by design: a runner-JWT, a database URL for
pg-boss, an anon Supabase key. It MUST NEVER hold the Supabase
service-role key or a raw Anthropic key. The env validation in
`src/env.ts` refuses to boot if either is present.

## Deploy to Railway (M1)

Service config: `apps/runner/railway.json`. Region `us-east` per ARCH-D2.

### Required env vars

| Name                       | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`             | Postgres connection string for pg-boss queue ops       |
| `SUPABASE_URL`             | Supabase project URL                                   |
| `SUPABASE_ANON_KEY`        | Public anon key — runner-JWT is layered on this client |
| `LLM_GATEWAY_URL`          | Cipher's gateway base URL                              |
| `MOCK_LLM_GATEWAY`         | `true` at M1; flip to `false` at M1+1                  |
| `MINT_RUNNER_TOKEN_URL`    | `/functions/v1/mint-runner-token`                      |
| `REFRESH_RUNNER_TOKEN_URL` | `/functions/v1/refresh-runner-token`                   |
| `SCORE_ENGINE_URL`         | `/functions/v1/score-engine`                           |
| `PORT`                     | Healthcheck port (Railway defaults 8080)               |
| `TEAM_CONCURRENCY`         | Per-worker parallel job cap (default 4)                |

### Forbidden env vars (validation refuses to boot)

- `ANTHROPIC_API_KEY` — belongs to the gateway, never the runner
- `SUPABASE_SERVICE_ROLE_KEY` — belongs to the web app + Edge Fns only
- `SUPABASE_SERVICE_KEY` — alias of the above

## Healthcheck

`GET /health` returns `{ok, version, uptime_seconds, jobs_in_flight,
last_heartbeat}` in ≤ 100ms (no DB call in the hot path). Railway probes
this every 15s; flapping kills the container. The `X-AI-Generated:
studio-zero` header is on every response.

## Build + run locally

```bash
cd apps/runner
npm install
npm run typecheck
npm run test
npm run build
node dist/index.js  # requires the env vars above
```

## What's mocked at M1

- LLM calls (`MOCK_LLM_GATEWAY=true` → canned canned responses)
- Reviewer findings (each reviewer emits one mock finding)
- `runs.state` persistence (state transitions emit AuditEvents to
  Realtime; the UPDATE call to `runs` lands at M1+1 with the mint
  endpoint integration)
- Supabase Realtime publish (the emitter's `publish` callback is
  no-op; the wire-level send lands at M1+1)

What is REAL at M1: env validation, pg-boss subscriber, state machine
transitions, healthcheck, JWT refresh client, SSRF/path-traversal/
ingestion guards (test-cover Shield's full M1 corpora).

## Security posture (Shield TB-5 / TB-6 / TB-9)

- Multi-stage Dockerfile; runtime carries no compilers or source
- Non-root user (UID/GID 10001), dropped CAPs at platform layer,
  seccomp profile referenced via `architecture/iac/runner-pool/`
- SSRF guard runs the egress URL through `assertSafeUrl` before every
  fetch; tests cover every entry in `runner/fixtures/ssrf-corpus/`
- Path-traversal guard's `safeOpen` wraps `realpathSync` +
  `startsWith` check; tests cover every entry in
  `runner/fixtures/path-traversal-corpus/`
- Ingestion limits (max files, max bytes, max token budget, excluded
  paths) enforced before any read

## Cross-references

- `architecture/decisions.md` — ARCH-D1 (pg-boss), ARCH-D2 (Railway),
  ARCH-D3 (runner JWT mint), ARCH-D7 (LLM gateway + score engine
  single sources of truth)
- `architecture/llm-gateway.md` — Cipher's gateway boundary
- `architecture/database/runner-jwt.md` — JWT claim shape + RLS contract
- `architecture/schemas/audit-event.v1.ts` — event discriminated union
- `ia/user-flows/audit-run-state-machine.md` — state transitions
