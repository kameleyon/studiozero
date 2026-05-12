# Studio Zero — System Architecture Diagram

**Phase:** 5 — Tech Architecture
**Owner:** Axiom (architecture spine) · with Atlas (schemas + RLS), Shield (threat model), Verify (test strategy)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** First draft for Phase 5 Jury exit gate (Axiom + Atlas + Shield + Cipher must PASS)
**Reader contract:** This document is readable by a developer who knows Next.js + Supabase + Stripe + GitHub Apps but has **not** read the PRD. PRD is the source of intent; this file is the spec.

> **Method.** Components, trust boundaries, and data flows derived from PRD v0.5 §6 (surface), §7.2 (audit workflow), §8 (three modes), §11 (Auto-PR V1.5), §13 (architecture), §14 (NFRs incl. retention + a11y + AUP), §16 (milestones + exit gates), §17 (decisions D1–D23). Cross-phase decisions in `shared_context/projects/studio-zero-productization/decisions.md` (IA-D1/D2/D3) and `architecture/decisions.md` (ARCH-D1–D8). Every contradiction surfaced during drafting is named in the *Internal contradictions* section at the end.

---

## 1. Component map

```
                                    ┌──────────────────────────────────────────┐
                                    │ Cloudflare (DNS + CDN + WAF)             │
                                    │   studiozero.com / cli/                  │
                                    └──────────────┬───────────────────────────┘
                                                   │ TLS 1.3
        ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
        │                                          │                                          │
        ▼                                          ▼                                          ▼
┌──────────────────┐                  ┌────────────────────────┐                  ┌────────────────────┐
│  Marketing site  │                  │   Web App (Next.js 15) │                  │   /healthz, /status │
│  (Astro/Next     │                  │   on Vercel, US-east   │                  │   public read-only  │
│   SSG, Vercel)   │                  │   Server Components +  │                  │   (statuspage.io    │
│  TB-0 (public)   │                  │   API Routes           │                  │    mirror)          │
└──────────────────┘                  └─────┬─────────┬────────┘                  └────────────────────┘
                                            │         │
                                            │TB-1     │TB-1
                                            │JWT      │JWT
                                            ▼         ▼
                                ┌─────────────────────────────────────────────────────────┐
                                │  Supabase (managed, us-east-1)                          │
                                │  ┌────────────────┐ ┌──────────────────┐ ┌────────────┐ │
                                │  │ Postgres       │ │ Auth (GoTrue)    │ │ Realtime   │ │
                                │  │  + RLS         │ │  email/OAuth     │ │ websockets │ │
                                │  │  + pg-boss     │◄┤  G/GH            │ │  fan-out   │ │
                                │  │   (ARCH-D1)    │ └──────────────────┘ └─────┬──────┘ │
                                │  └──────┬─────────┘                            │        │
                                │         │                                      │        │
                                │  ┌──────▼─────────┐ ┌──────────────────┐       │        │
                                │  │ Vault          │ │ Storage          │       │        │
                                │  │ (pgsodium      │ │  customer code,  │       │        │
                                │  │ XChaCha20-AEAD │ │  evidence blobs  │       │        │
                                │  │  + AAD)        │ │  TB-3            │       │        │
                                │  └────────────────┘ └──────────────────┘       │        │
                                │  ┌──────────────────────────────────────────┐  │        │
                                │  │ Edge Functions (Deno)                    │  │        │
                                │  │   · mint-runner-jwt  (ARCH-D3)           │  │        │
                                │  │   · byok-validate     (BYOK dry-run)     │  │        │
                                │  │   · score-engine      (deterministic)    │  │        │
                                │  │   · stripe-webhook    (signature verify) │  │        │
                                │  │   · github-webhook    (signature verify) │  │        │
                                │  │   · jury-reaudit-gate (V1.5)             │  │        │
                                │  └─────┬────────────────────────────────────┘  │        │
                                └────────┼─────────────────────────────────────────┘        │
                                         │ TB-2 (short-lived tenant-scoped JWT, ARCH-D3)    │
                                         │  5-min TTL (refresh-on-heartbeat), aud=runner    │
                                         ▼                                                  │
                            ┌──────────────────────────────┐                                │
                            │ Hosted Runner Pool           │                                │
                            │  Railway us-east (ARCH-D2)   │                                │
                            │  rootless container          │                                │
                            │   + dropped caps             │                                │
                            │   + seccomp profile          │                                │
                            │   + egress allowlist (TB-4)  │                                │
                            │  Worker process polls        │                                │
                            │  pg-boss jobs per tenant     │                                │
                            └────────┬──────────┬──────────┘                                │
                                     │          │                                           │
                                     │TB-5      │TB-4 (egress allowlist)                    │
                                     │          │  · api.anthropic.com                      │
                                     │          │  · *.supabase.co (own project)            │
                                     │          │  · api.github.com (clone w/ App token)    │
                                     │          │  · customer's deployed URL (audited host) │
                                     ▼          ▼                                           │
                            ┌───────────┐ ┌──────────────────┐                              │
                            │ Anthropic │ │ GitHub App       │                              │
                            │ API       │ │  (per-repo perms │                              │
                            │ (BYOK or  │ │   D1; clone +    │                              │
                            │  Managed  │ │   PR open V1.5)  │                              │
                            │  key)     │ │ TB-6             │                              │
                            └───────────┘ └──────────────────┘                              │
                                                                                            │
        ┌─────────────────────────────────────────────────────────────────────────────┐     │
        │ CLI Companion (customer's machine, Node binary)                             │     │
        │   · long-polls /api/cli/jobs (TB-7, pairing token)                          │     │
        │   · runs local runner against customer's Claude Code installation          │      │
        │   · signs verdict w/ binary-hash HMAC (D7 transparency, not security)      │      │
        │   · POSTs signed verdict back to web                                        │     │
        └─────────────────────────────────────────────────────────────────────────────┘     │
                                                                                            │
        ┌────────────────────────────────────────────────────────────────────────────┐      │
        │ Customer browser ◄── Realtime (run progress + verdict events) ─────────────┼──────┘
        └────────────────────────────────────────────────────────────────────────────┘

  External services consumed (US regions where supported):
  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐
  │ Stripe       │  │ Sentry      │  │ PostHog    │  │ Resend       │
  │ Checkout +   │  │ errors,     │  │ analytics, │  │ transactional│
  │ Customer     │  │ beforeSend  │  │ consent-   │  │ email        │
  │ Portal       │  │ PII scrub   │  │ gated      │  │ (E1–E5)      │
  │ TB-8         │  │ TB-9        │  │ TB-9       │  │ TB-9         │
  └──────────────┘  └─────────────┘  └────────────┘  └──────────────┘
```

**Component summary:**

| Component | Purpose | Runtime | Region |
|---|---|---|---|
| Marketing site | Public, indexable pages (PRD §6.1, sitemap `/`, `/pricing`, etc.) | Astro/Next.js SSG on Vercel | global edge |
| Web App (Next.js 15) | Authed app shell, API routes, signup, dashboards, intake, settings (`/app/*`, `/admin/*`) | Vercel Functions (Node 20) + Server Components | us-east-1 (Vercel iad1) |
| Supabase Postgres | Single multi-tenant DB w/ RLS. Owns `runs`, `findings`, `tenants`, `projects`, `cli_pairings`, `score_snapshots`, `billing_events`, `consent_records`, `breach_events`, `audit_logs`, plus `pg-boss` job tables | Supabase managed | us-east-1 |
| Supabase Auth (GoTrue) | Email + Google + GitHub OAuth. Issues JWT consumed by web. (`auth.users` is the RLS exception — PRD §13.2.) | Supabase managed | us-east-1 |
| Supabase Vault | `pgsodium` TCE with **XChaCha20-Poly1305 AEAD** (v0.5 Cipher Fix-4 — was named "AES-256-GCM"; equivalent 256-bit AEAD security, but `pgsodium`'s actual API call is `crypto_aead_xchacha20poly1305_ietf_encrypt` with a 24-byte nonce, not AES-GCM's 12-byte) with `tenant_id::text` as AAD. Stores BYOK keys, GitHub App tokens, per-run code-encryption keys (cryptoshredding base) | Supabase managed | us-east-1 |
| Supabase Storage | Evidence blobs (screenshots, transcripts), exported reports. RLS-scoped. | Supabase managed | us-east-1 |
| Supabase Realtime | Per-tenant channels `runs:<run_id>`, fan-out for live progress events | Supabase managed | us-east-1 |
| Supabase Edge Functions | Latency-sensitive or signature-verifying ops: JWT mint, BYOK dry-run, score engine, Stripe + GitHub webhooks, V1.5 Jury re-audit gate (see ARCH-D7) | Deno isolates | us-east-1 |
| Job Queue (`pg-boss`) | Postgres-backed BullMQ-equivalent; lives inside Postgres (ARCH-D1) | Inside Supabase Postgres | us-east-1 |
| Hosted Runner Pool | Stateless workers; one container per run; sandboxed (D8) | Railway, rootless containers + seccomp + egress allowlist | us-east-1 |
| CLI Companion | Local runner on customer's machine. Long-polls jobs; pairing flow per `ia/user-flows/cli-pairing-and-tamper.md` | Node binary, customer host | customer-local |
| Stripe | Hosted Checkout (HC6) + Customer Portal; webhooks land on Edge Function | Stripe-managed | global |
| GitHub App | Per-repo permissions only (D1); clone code for audit; open PR for V1.5 | GitHub-managed | global |
| Anthropic API | LLM provider; BYOK key from Vault, or Managed-tier shared key | Anthropic-managed | us |
| Sentry | Error capture; `beforeSend` PII scrub (PRD §13.6 + Cipher B5) | Sentry-managed | us |
| PostHog | Product analytics; **does not fire until cookie consent granted** | PostHog-managed (US cloud) | us |
| Resend | Transactional email (E1–E5 lifecycle, magic links, password reset) | Resend-managed | us |
| Cloudflare | DNS + CDN + WAF in front of marketing + app | Cloudflare-managed | global |

---

## 2. Trust boundaries

Every boundary where authentication or authorization changes. Shield's threat model in `architecture/threat-model.md` (forthcoming) MUST cover each by ID.

| ID | From → To | Auth/authz primitive | What changes | Threat-model focus |
|---|---|---|---|---|
| **TB-0** | Internet → Marketing site | none (public) | anonymous read-only | DDoS, content-scrape, supply-chain on Vercel build |
| **TB-1** | Customer browser → Web App | Supabase Auth JWT in `sb-access-token` cookie (httpOnly, Secure, SameSite=Lax) | anonymous → authenticated user; tenant context derived from `auth.tenant_id()` SQL function | session hijack, CSRF (Next.js double-submit + Origin check), broken access control |
| **TB-2** | Hosted Runner → Supabase Postgres | **Short-lived tenant-scoped JWT** minted at job dispatch by `mint-runner-jwt` Edge Function. TTL 5 min (refresh-on-heartbeat via `refresh-runner-token` RPC per Atlas `runner-jwt.md`), `aud="studio-zero/runner"`, claims `tenant_id`+`run_id` are fenced. (ARCH-D3, closes Atlas v0.2 B2. v0.5 Jury B3 + Cipher Fix-3 unified.) | runner has DB access only to one tenant's rows; **never service-role key** | service-role-key bypass of RLS, JWT replay across runs |
| **TB-3** | Web App / Runner → Supabase Vault | tenant-scoped JWT + Vault RPC call with `tenant_id` as AAD | secrets decrypt only for the calling tenant; AAD mismatch = decrypt fails | wrong-AAD decrypt, log exfil of decrypted payload |
| **TB-4** | Hosted Runner → external internet | egress allowlist enforced at container network namespace (iptables / Cilium policy) | runner can only reach `api.anthropic.com`, own Supabase project, `api.github.com`, customer's audited URL host | SSRF, data exfil to attacker-controlled host, prompt-injection-driven exfil (D9) |
| **TB-5** | Hosted Runner → Anthropic API | Anthropic API key (BYOK from Vault, or Managed shared key); per-tenant token budget cap enforced before request | crosses Studio Zero / Anthropic boundary | key leak via logs, token-budget bypass |
| **TB-6** | Hosted Runner → GitHub API | GitHub App installation token (per-repo perms, D1); minted at clone time | per-tenant repo access; **never account-wide `repo` scope** | over-permissioned token, stale token after uninstall (D23) |
| **TB-7** | CLI Companion → Web App | CLI pairing token (long-lived, revocable per device) in `Authorization: Bearer`; runs via long-poll | CLI authenticates as a paired device for one user | token theft from `~/.studio-zero/`, replay across devices |
| **TB-8** | Stripe → Web App (webhook) | HMAC-SHA256 signature in `Stripe-Signature` header; secret from env (`STRIPE_WEBHOOK_SECRET`) | unauthenticated → trusted-source on signature verify | replay, forged webhook → free upgrades, signature timing-attack |
| **TB-9** | Web App / Runner → external SaaS (Sentry, PostHog, Resend) | API keys in Vercel env vars | outbound only; redaction middleware before send | PII leak via Sentry payloads (closed by §13.6 `beforeSend`), PostHog pre-consent fire (closed by consent gate) |
| **TB-10** | GitHub → Web App (webhook) | HMAC-SHA256 signature in `X-Hub-Signature-256`; secret from GitHub App config | unauthenticated → trusted-source on signature verify | webhook replay, App-uninstall-after-PR stale tracking (D23) |

**Trust-boundary inventory rule (Axiom, locks):** every new outbound integration adds a `TB-n` row; every new inbound webhook adds a `TB-n` row; threat-model PR is blocked until the corresponding row exists. This is a CI assertion against `architecture/threat-model.md`.

---

## 3. Data flow per primary use case

### 3a. Free-tier Surface audit (no auth to repo; deployed-URL only)

```
1. Browser → Web App: POST /app/audits/new {project_id, sku='surface', depth='quick', url}
2. Web App: server-side RLS check (project belongs to tenant); insert `runs` row state='created'
3. Web App → pg-boss: enqueue {run_id, tenant_id, payload}
4. Hosted Runner: poll pg-boss; pull job
5. Runner → mint-runner-jwt Edge Fn: request tenant-scoped JWT (TB-2)
6. Runner → Realtime: open channel `runs:<run_id>`; emit kind='progress' events
7. Runner → headless browser inside sandbox: visit URL (egress allowlist enforced TB-4)
8. Runner → Anthropic API (Managed shared key for free tier): reviewer calls (TB-5)
9. Runner → Postgres: write findings rows (RLS enforced by JWT claim)
10. Runner → score-engine Edge Fn: deterministic score computation (input: findings; output: score + verdict + breakdown)
11. Runner → Postgres: update runs.verdict, score_snapshots row with score_engine_version='v1'
12. Runner → Realtime: emit kind='final_verdict'
13. Browser: re-renders verdict-card per design/components/verdict-card spec
14. Retention timer scheduled (24mo findings; surface audits have no source code to cryptoshred)
```

**Free-tier specifics:** unlimited re-audits within the one project (D2). Rate-limited per IP + tenant (50 runs/24h per project per EC-7 in audit-run-state-machine.md). Managed shared Anthropic key is metered against Jo's account (cost engineering: Surface audits are low-token; budget cap enforced at runner before Anthropic call).

### 3b. Managed Full audit (paid; billed via Stripe)

Same as 3a with these deltas:
- Intake includes repo (GitHub App clone) + URL (TB-6)
- Source-code path: Runner clones to `/var/runs/<tenant_id>/<run_id>/` inside container; encrypted with per-run Vault key (TB-3)
- Anthropic uses Jo's Managed shared key (BYOK key not present)
- After verdict_emitted: Stripe `customer.subscription.updated` is the gating event for entitlement decisions (handled in TB-8 webhook); the run itself does not call Stripe
- Retention: 7-day default cryptoshred of customer code; findings retained 24mo (PRD §14.4)

### 3c. BYOK Code audit (customer's Anthropic key)

Same as 3b with these deltas:
- At onboarding: customer pastes key → `byok-validate` Edge Fn does a dry-run `messages.create` call → if OK, key encrypted to Vault with `tenant_id` AAD
- At dispatch: `mint-runner-jwt` includes scope to decrypt one Vault row; Runner pulls BYOK key via Vault RPC (TB-3)
- Runner uses customer's key for all Anthropic calls (TB-5)
- Billing: BYOK customer pays Studio Zero a platform fee (Stripe subscription, no per-token billing); Anthropic bills customer directly

### 3d. CLI Code audit (source never leaves customer's machine)

```
1. Browser → Web App: POST /app/audits/new {project_id, sku='code', depth='comp', mode='cli'}
2. Web App: insert `runs` row state='created'; mark `runner_id=<paired_cli_device_id>`
3. Web App → pg-boss: enqueue job tagged for CLI delivery
4. CLI Companion (long-polling /api/cli/jobs with pairing token, TB-7): receives job payload
5. CLI: invoke local runner.runAudit() against customer's Claude Code installation
   - Source code stays on disk; never POSTed
   - Reviewer calls hit customer's local Claude Code (their subscription, their tokens)
6. CLI → Web App: POST stream of AuditEvents (progress, finding, agent_log) — findings only, NO source
7. Web App → Realtime: fan-out to browser channel `runs:<run_id>`
8. CLI → Web App: POST signed verdict (HMAC of verdict bytes, key=binary_hash) per cli-pairing-and-tamper.md C7
9. Web App: verifies signature (C8) → sets runs.watermark='private-run-self-audited'
10. Browser: verdict-card renders with Private Run · Self-Audited chip (D7)
```

**CLI privacy invariant (Axiom locks):** the only payload CLI POSTs back is `AuditEvent` (per `runner/schemas/audit-event.v1.ts`). Source code, file contents, and binary blobs are **never** part of `AuditEvent`. This is contract-tested in `tests/acceptance/integration/cli-no-source-egress.spec.ts` (for Verify to validate at M3 exit gate per PRD §16).

### 3e. V1.5 Auto-PR (audit → Jury re-audit → build agent → PR open)

```
1. Verdict_emitted state reached on Code/Pro tier run (PASS WITH FIXES or FAIL)
2. Customer clicks "Ship the fixes — $49 →" CTA on verdict-card
3. Web App: charge Stripe $49 (idempotent via run_id key); insert `fix_pr_jobs` row state='charged'
4. Web App → pg-boss: enqueue fix-job (separate queue from audit jobs; ARCH-D5 channel naming)
5. Forge + Vega agents (running in their own sandboxed worker tier, NOT the audit runner pool): generate patch
6. patch → Hosted Runner: re-audit against patched workspace
7. Runner → jury-reaudit-gate Edge Fn: validates the re-audit verdict satisfies all-originally-flagged-findings-now-resolved
8. If gate PASS: GitHub App opens PR against `studio-zero/fix-<run_id>` branch (never default; PRD §11.2 hard rule)
9. PR body emits AI Act Art. 50 disclosure + Private Run watermark if CLI-mode origin (HC9)
10. Webhook GitHub → /webhooks/github (TB-10): subscribe to PR merge events for tracking
11. If customer uninstalls GitHub App post-PR-open (D23): webhook stops; UI shows `tracking_state='stale'` banner
12. If gate FAIL: PR NOT opened; customer refunded per PRD §11.2; UI shows why
```

**Auto-PR gating invariant (Axiom locks):** `jury-reaudit-gate` Edge Function is the ONLY code path that can transition `fix_pr_jobs.state='reaudit_passed'`. Direct UPDATEs from worker code are blocked by RLS + a CHECK constraint that requires the transition's auth context to be the Edge Function's JWT (claim `iss='supabase-edge-functions'`). Negative test in `tests/acceptance/security/auto-pr-bypass.spec.ts` (M5 gate-3 per PRD §18).

---

## 4. Runtime topology (where things run)

| Tier | Host | Region | Why |
|---|---|---|---|
| Marketing + Web App | Vercel | iad1 (US-east) | PRD §13.1; co-locates with Supabase us-east-1 to minimize DB RTT |
| Supabase (Postgres + Auth + Vault + Storage + Realtime + Edge Fns) | Supabase managed | us-east-1 (AWS) | Single region MVP per PRD §14.4 |
| Hosted Runner Pool | Railway | us-east (Virginia) | Rootless containers + seccomp + egress allowlist supported; nearest region to Supabase us-east-1; ARCH-D2 |
| CLI Companion | Customer's machine | n/a | Privacy wedge; mode applies in M3+ |
| Stripe / Sentry / PostHog / Resend / Anthropic / GitHub | SaaS-managed | US | All US-based services to match data residency claim |
| DNS / CDN / WAF | Cloudflare | global edge | Cheap DDoS mitigation; WAF rules per Shield |

**Region drift constraint (Axiom locks):** Web App on Vercel `iad1`, Supabase on `us-east-1`, Runner on Railway `us-east` — same physical region (AWS Virginia data centers). RTT budget for runner→DB stays < 5ms p50, supporting per-event Realtime writes during reviewer streaming. PRD §14.1 web TTFB < 500ms is achievable only with this co-location. If any tier slides to a non-US-east region, web TTFB SLO becomes at-risk; flag to Sprint for re-planning.

---

## 5. Authentication map

How every component identifies itself to every other.

| Caller → Callee | Primitive | Token lifetime | Rotation | Audience binding |
|---|---|---|---|---|
| Browser → Web App | Supabase Auth JWT (cookie) | 1h access + 30d refresh | refresh on every API call | `aud=authenticated`; tenant claim `tenant_id` |
| Web App → Postgres | Supabase Auth JWT forwarded; RLS evaluates `auth.tenant_id()` | inherits above | n/a (no key) | enforced by `auth.uid()` + `auth.tenant_id()` in RLS policies |
| Web App → Supabase Edge Fn | Supabase Auth JWT or service-role JWT (per function) | inherits / svc-role 1h | svc-role: rotate quarterly | per-function `verify_jwt = true` |
| Web App → Stripe | Restricted API key (read-write subscriptions + customers only) | indefinite | rotate quarterly | n/a |
| Stripe → Web App (webhook) | HMAC signature `Stripe-Signature` | n/a | webhook secret rotates per env | `STRIPE_WEBHOOK_SECRET` env var |
| Web App → GitHub App | GitHub App JWT (10-min) + installation access token (1h) | 10m / 1h | auto-refresh per Octokit | per-installation, per-repo permissions only (D1) |
| GitHub → Web App (webhook) | HMAC signature `X-Hub-Signature-256` | n/a | webhook secret rotates per env | per-App webhook secret |
| Web App → Anthropic | n/a (only Runner calls Anthropic) | n/a | n/a | n/a |
| **Runner → Supabase (Postgres + Realtime + Vault)** | **Short-lived tenant-scoped JWT minted by `mint-runner-jwt` Edge Fn** | **5 min, refresh-on-heartbeat** | **minted at dispatch; refresh via `refresh-runner-token` RPC** | **`aud="studio-zero/runner"`; claims `tenant_id`, `run_id`** |
| Runner → Anthropic | BYOK or Managed key (from Vault) | indefinite | customer-controlled (BYOK); Jo-rotated quarterly (Managed) | n/a |
| Runner → GitHub | GitHub App installation token (1h) | 1h | minted per clone | per-installation, per-repo |
| Runner → Sentry/PostHog | API key (env var) | indefinite | quarterly | n/a |
| CLI → Web App | Pairing token (Bearer) | 90 days; revocable per device | rotate on `studio-zero login` re-pair | `aud=cli-<device_id>` |
| CLI → Customer's Claude Code | n/a (uses local install) | n/a | n/a | n/a |
| CLI → Web App (verdict POST) | Pairing token + HMAC signature (HMAC key = binary_hash) | n/a | n/a | per-run_id idempotency key |

**Critical Atlas-coordination point:** the `mint-runner-jwt` Edge Function MUST be the only path that mints runner JWTs. It MUST set `aud=runner-<run_id>` and a `tenant_id` claim. The Postgres RLS policies MUST reject any JWT whose `aud` is not `authenticated` (browser) or `runner-<run_id>` matching the row's `tenant_id`. **For Atlas to validate: write the RLS predicate in `architecture/database/policies/runs.sql` exactly as specced in ARCH-D3.**

---

## 6. Failure domain map

What fails when what fails. Each row names mitigation + which tests prove it.

| Failing component | What surfaces stay UP | What DEGRADES | What FAILS | Mitigation | Owned by |
|---|---|---|---|---|---|
| **Supabase Postgres down** | Marketing site, `/status`, `/healthz` (returns 503 cleanly) | none — DB is in the critical path of every authed surface | Web App auth, all `/app/*`, all runner job state, billing reconciliation | Single-region MVP accepts this risk (PRD §14.2 99.5% acceptable). Mitigated by: Supabase managed HA replicas; on incident → public `/status` page; Watch agent's runbook | Crash (retry semantics) + Watch (runbook) |
| **Supabase Realtime down** | Marketing, App auth, run dispatch | run progress UX (no live updates) | nothing terminal — falls back to polling per audit-run-state-machine.md EC-4 | Browser long-poll fallback at 2s interval when websocket fails; CI test exercises both paths | Verify (`tests/acceptance/e2e/realtime-fallback.spec.ts`) |
| **Anthropic API 429 or 5xx** | All Studio Zero surfaces | reviewer throughput | individual reviewer may transition to `failed_transient` then `failed_terminal` after retry budget (PRD §14.2: 2 retries) | Per-reviewer retry; partial-result boundary preserves completed reviewers (audit-run state machine `partial_completed`); cost-aware backoff | Crash (retry policy) + Verify (chaos test via Toxiproxy nightly) |
| **Anthropic API entirely unavailable >30min** | All Studio Zero surfaces | new audits queued | run dispatch → reviewers all timeout → runs `failed_recoverable`; user offered re-run | Status page red banner ("Audits paused — provider issue"); auto-resume on health-check restore | Watch + Crash |
| **Stripe API down** | All Studio Zero surfaces | new subscriptions/upgrades | webhook reconciliation delays | Idempotent webhook handler + polling fallback at `/billing/return?cs=<session_id>` (ARCH-D4). 90-day expiry on Stripe Checkout Session means polling has bounded window | Ledger + Forge |
| **Stripe webhook delayed > 30s** | All surfaces | subscription status may lag | none — entitlement check reads `subscriptions` table populated by webhook OR by polling endpoint | `/billing/return` polls Stripe directly until subscription record observed; max 10 polls @ 2s; falls back to "Your purchase is processing" copy | ARCH-D4 |
| **Vercel Functions down** | Marketing (still served from edge cache) | API routes that hit functions | authed app shell | Vercel has its own SLA; Web App TTFB SLO breached; status page red | Watch |
| **Railway runner pool down** | All surfaces | new audit dispatch queues up; CLI-mode unaffected | hosted-mode runs queue past SLO | pg-boss queue holds jobs; auto-resume on Railway recovery; CLI mode is the failover-via-customer fallback | Crash |
| **GitHub App rate-limited (60k/h org cap)** | All surfaces | new audits that need clone | individual run → `failed_transient` with `code='github_rate_limit'` | Per-installation rate-limit observer; exponential backoff; surface to user with retry-after | Verify (rate-limit fuzz nightly) |
| **CLI pairing token compromised** | All surfaces | one user's CLI integrity | one customer's CLI-mode verdicts | Per-device revocation in S-CLI settings; binary-hash watermark per D7 (transparency, not security claim) | Shield + Trace |
| **Supabase Vault unavailable** | Marketing | new BYOK validations; new audit dispatch (cannot decrypt key) | runs that need Vault decrypt → `failed_recoverable` | Same as Supabase Postgres down (Vault is co-resident); status page red | Cipher |
| **Sentry / PostHog / Resend down** | All surfaces; runs continue | error visibility (Sentry), analytics (PostHog), transactional email (Resend) | nothing user-critical | Buffered local logs; email retried via Resend dead-letter; analytics events buffered then dropped after 30 min | Watch |

**Failure-domain rule (Axiom locks):** `/healthz` returns 503 only when the **Web App itself** is the failure. When Supabase is down, `/healthz` returns 200 (because the Web App process is alive) — operator observability is via `/status` (which is a statuspage.io mirror, independent infra). This split prevents Vercel from cycling the deployment during a Supabase incident.

---

## 7. Backend surface ↔ frontend route mapping

Every route in `ia/sitemap.md` mapped to the backend surface it depends on. **For Forge + Atlas + Vega to validate at Phase 6.**

| Frontend route | API endpoint | Edge Function | Webhook source | DB table(s) touched |
|---|---|---|---|---|
| `/` (landing) | none (SSG) | — | — | — |
| `/pricing` | none (SSG) | — | — | — |
| `/signup` | `POST /auth/signup` (Supabase Auth) | — | — | `auth.users`, `tenants`, `tenant_members` |
| `/login` | `POST /auth/signin` (Supabase Auth) | — | — | `auth.users` |
| `/auth/callback/{google,github}` | Supabase Auth OAuth handler | — | — | `auth.users`, `oauth_tokens` |
| `/auth/install/github` | `POST /api/github/app/callback` | — | GitHub App install event → `/webhooks/github` (TB-10) | `oauth_tokens`, `tenant_members.github_installation_id` |
| `/onboarding/byok` | `POST /api/byok/validate` | `byok-validate` (calls Anthropic dry-run) | — | `api_keys` (encrypted via Vault TB-3) |
| `/onboarding/cli` → `/cli/handshake` | `POST /api/cli/pair`, `GET /api/cli/pair/poll` | — | — | `cli_pairings` |
| `/onboarding/managed` | `POST /api/billing/checkout-session` | — | Stripe Checkout → `/webhooks/stripe` (TB-8) | `subscriptions`, `billing_events` |
| `/app/projects/new` | `POST /api/projects` | — | — | `projects` |
| `/app/audits/new` | `POST /api/runs` | — | — | `runs` (state='created'), `pg_boss.job` (enqueue) |
| `/app/audits/[run-id]` | `GET /api/runs/[id]` + Realtime channel `runs:<id>` | — | — | `runs`, `findings`, `score_snapshots` (RLS) |
| `/app/audits/[run-id]/findings` | `GET /api/runs/[id]/findings` | — | — | `findings` |
| `/app/audits/[run-id]/score` | (page reads runs.score_breakdown) | `score-engine` (server-side recompute on demand for explainability) | — | `score_snapshots` |
| `/app/audits/[run-id]/upgrade` | `POST /api/runs/[id]/upgrade-checkout` | — | Stripe webhook | `runs`, `subscriptions` |
| `/app/audits/[run-id]/share/[share-token]` | `GET /api/share/[token]` (anon-reachable, token-gated, no consent gate) | — | — | `runs` (read-only via share token JWT) |
| `/app/audits/[run-id]/pr/[pr-id]` (V1.5) | `GET /api/runs/[id]/pr` | — | GitHub PR events → `/webhooks/github` (TB-10) | `fix_pr_jobs`, `runs.tracking_state` (D23) |
| `/app/audits/[run-id]/re-audit` | `POST /api/projects/[id]/re-audit` | — | — | new `runs` row |
| `/app/notifications` | `GET /api/notifications` + Realtime channel `notifications:<user_id>` | — | — | `notifications` |
| `/app/settings/integrations/byok` | `POST/DELETE /api/byok` | `byok-validate` | — | `api_keys` |
| `/app/settings/integrations/cli` | `GET/DELETE /api/cli/devices` | — | — | `cli_pairings` |
| `/app/settings/integrations/github` | `GET/DELETE /api/github/install` | — | GitHub uninstall webhook (D23) | `oauth_tokens` |
| `/app/settings/billing/{plan,invoices,payment-method,cancel,dispute}` | `GET /api/billing/*`, `POST /api/billing/cancel` | — | Stripe webhooks | `subscriptions`, `billing_events` |
| `/app/settings/data/retention` | `PATCH /api/settings/retention` | — | — | `tenants.retention_days_code` |
| `/app/settings/data/findings-export` | `GET /api/runs/export` | — | — | `findings` (RLS) |
| `/app/billing/checkout` | (Stripe Checkout return) | — | TB-8 | — |
| `/admin/runs/[id]` | `GET /api/admin/runs/[id]` (role=admin RLS bypass via SECURITY DEFINER fn, audit-logged) | — | — | all tables (audit-logged) |
| `/admin/audit-action-log` | `GET /api/admin/audit-logs` | — | — | `audit_logs` |
| `/admin/breach-events` | `GET /api/admin/breach-events` | — | — | `breach_events` |
| `/healthz` | `GET /healthz` (returns 200 if Web App process alive) | — | — | none (no DB read) |
| `/status` | (Cloudflare proxy to statuspage.io) | — | — | none |
| `/cli/handshake` | poll `GET /api/cli/pair/poll` | — | — | `cli_pairings` |
| `/app/cli/offline` (modal-as-route) | (client-side state, no API) | — | — | — |
| `/app/billing/token-budget-exceeded` (modal-as-route) | (client-side state, no API) | — | — | — |
| `/app/billing/free-tier-exhausted` (modal-as-route) | (client-side state, no API) | — | — | — |
| `/401`, `/403`, `/404`, `/410`, `/429`, `/500`, `/503` | static + Next.js error pages | — | — | — |

**Coverage check (Axiom):** every authed route maps to either a DB-RLS-protected query or a service-role Edge Function (admin only). No route reaches into the runner pool directly — runner is queue-driven only. **For Atlas to confirm at Phase 5 exit: every entry in this table corresponds to a row in `architecture/database/tables.md` schema spec.**

---

## 8. Hosting / region decisions

US-only at MVP per PRD §14.4. Specs:

- **Vercel:** Production deployment locked to `iad1` (Virginia). `vercel.json` regions = `["iad1"]`. Edge Functions run in iad1 only (paid Vercel feature for region pinning).
- **Supabase:** Project provisioned in `us-east-1` (AWS Virginia). Documented in `architecture/iac/supabase-project.tf`.
- **Railway:** Runner pool in `us-east` (Virginia DC). Per-service region pin.
- **Cloudflare:** DNS + CDN are global; WAF rules apply globally. R2 buckets (if any) provisioned in `WNAM` (Western North America) for redundancy if Supabase Storage outage occurs (V2 backup plan, NOT MVP).
- **Stripe:** Account configured for USD; supports EU/UK billing per Decision #20 with region-specific tax + refund handling.
- **All other SaaS:** US-cloud variants (PostHog US, Sentry US, Resend US).

**Multi-region migration path (deferred — see ARCH-D8):** when first EU customer asks, the migration involves: (a) Supabase EU-region project provisioned; (b) tenant rows tagged with `data_residency` column; (c) per-tenant routing layer in Web App middleware reads tag and proxies DB calls to the correct project. RLS does NOT need to change. **Not a v1 deliverable.**

---

## 9. Internal contradictions surfaced

Axiom names them out loud. Resolution either locked here, deferred with owner+deadline, or escalated.

### C1. Edge Function vs Vercel Server Action for sensitive ops
**Surfaced when:** mapping where `byok-validate`, `score-engine`, `jury-reaudit-gate` live.
**Contradiction:** Edge Functions on Supabase (Deno) and Vercel Server Actions / API routes (Node) both can verify-JWT and run server-side. PRD §13.5 says "runner authenticates via short-lived tenant-scoped JWTs minted at job dispatch" — implying an Edge Function — but doesn't specify the same primitive for other sensitive ops.
**Resolution:** **Locked in ARCH-D7 below.** Edge Functions own: JWT minting, BYOK dry-run (because the Anthropic API call should not touch Vercel logs), score-engine (because it MUST be a deterministic single source of truth at the DB tier, not duplicated in Web + Runner), Jury re-audit gate (V1.5, because the entitlement check must be co-resident with the DB row). Vercel API routes own everything else.

### C2. pg-boss vs Redis BullMQ
**Surfaced when:** picking queue primitive.
**Contradiction:** PRD §13.1 diagram says "Postgres or Redis BullMQ" — doesn't pick. Sprint and Forge will pick differently if not locked.
**Resolution:** **Locked in ARCH-D1.** pg-boss. One fewer infra dependency; idempotent SKIP LOCKED semantics on Postgres are mature; cost-zero vs paying for managed Redis at low scale; Atlas's RLS extends naturally to job tables.

### C3. CLI heartbeat is in PRD §6.4 but no contract for what `heartbeat` means
**Surfaced when:** mapping CLI → Web App auth.
**Contradiction:** `ia/user-flows/cli-pairing-and-tamper.md` says "background heartbeat (1 ping / 30s)" but no schema/contract exists for the heartbeat payload, nor what the server does on missed heartbeats beyond the 60s/120s/5min thresholds in audit-run-state-machine.md EC-6.
**Resolution:** **Flagged for Atlas + Forge** — add `cli_heartbeat` event to `runner/schemas/audit-event.v1.ts` so the same enum carries both run progress events AND device-liveness pings. Single contract; one place to schema-test.

### C4. Stripe webhook reconciliation timing
**Surfaced when:** thinking through "what fails when what fails."
**Contradiction:** PRD doesn't say what happens between Stripe Checkout `cs_complete` (browser-side success) and the `customer.subscription.created` webhook landing on `/webhooks/stripe`. Default delay is < 1s but can be 30s+ during incidents. UI claiming "Your purchase is complete" without webhook confirmation can mislead.
**Resolution:** **Locked in ARCH-D4.** `/billing/return?cs=<session_id>` polls `/api/billing/reconcile?cs=...` which calls Stripe directly to verify session status, then writes to `subscriptions` table. Max 10 polls @ 2s = 20s; if exceeded, UI shows "Processing your purchase — we'll email you when it's ready" (Resend E-receipt path).

### C5. GitHub App uninstall after PR opened (D23) — tracking_state field doesn't exist yet
**Surfaced when:** mapping V1.5 PR webhook flow.
**Contradiction:** PRD §11.2 Decision D23 specifies a banner "Tracking unavailable — reinstall the Studio Zero GitHub App to resume merge status." but no `runs.tracking_state` field exists in the v0.5 schema. PRD §13.2 lists tables but not this field.
**Resolution:** **Locked in ARCH-D6 below.** Add column `runs.tracking_state` enum `('active','stale','recovered')`; flipped to `stale` by webhook handler when GitHub App `installation.deleted` event arrives AND there's an open `fix_pr_jobs` row for that installation. UI conditional on this column. **For Atlas to add to `architecture/database/migrations/0007_tracking_state.sql`.**

### C6. Score-engine versioning lives "somewhere" but the file doesn't specify which surface
**Surfaced when:** mapping where ARCH-D7 puts score-engine.
**Contradiction:** PRD §10 says "weights/thresholds live in `runner/schemas/score_engine.v1.json`." But the runtime caller — is it the Web App (server-side compute on demand?), the Runner (post-Jury synthesis), or the Edge Function (centralized recompute path)? If all three load the JSON independently, they CAN drift in dependency-version ordering.
**Resolution:** **Locked in ARCH-D7.** Score-engine runs in **one place** — a Supabase Edge Function `score-engine` that loads `score_engine.v1.json` as a bundled asset, exposes `POST /functions/v1/score-engine` with input=`findings[]` and output=`{score, verdict, score_breakdown}`. Runner calls this Edge Fn to compute the score (NOT compute locally). Web App also calls this Edge Fn if explainability requires recomputation (e.g., for the radar-chart "why" UI). This guarantees single source of truth + version-stamping.

### C7. Hosted runner region matters for egress allowlist enforcement
**Surfaced when:** picking Railway us-east vs alternatives.
**Contradiction:** Egress allowlists enforce by IP. If runner runs in Railway us-east but Supabase project IPs are not stable (Supabase doesn't publish a static IP range for the data plane), the allowlist becomes a CIDR drift problem.
**Resolution:** **Flagged for Shield + Cipher.** The runner egress allowlist will be enforced primarily at the **DNS level** (only resolve `*.supabase.co`, `api.anthropic.com`, `api.github.com`, customer's audited URL host) inside the container's `resolv.conf`, supplemented by a Cilium NetworkPolicy that drops anything resolving outside the allowlisted hostnames. This is a known-rough edge of containerized egress filtering and is on the test plan for ARCH-D9 (escape-corpus tests at M2 gate). **NOT FULLY RESOLVED at Phase 5 lock; mitigation is in place but pentest at M3 exit must validate.**

---

## 10. Phase-5 self-verdict (Axiom)

Is the system diagram complete enough that Forge + Vega could start M0 with it? **Yes, with two caveats:**

1. **Atlas must publish `architecture/database/tables.md` + RLS policies** before Forge writes any API route. The route table in §7 above references `runs.tracking_state`, `tenant_members.github_installation_id`, etc., which don't exist yet. Schema-as-files is a PRD §13.1 lessons-learned rule.
2. **Shield must publish `architecture/threat-model.md` with STRIDE on every TB-1..TB-10** before M1 exit. The threat model gates M1 per PRD §16, and the threat-model rows below reference TB-IDs declared here.

Everything else (component map, data flows, auth map, failure domains, route mapping, region locks) is complete enough that Forge can start M0 scaffolding the API surface, Vega can start binding routes to verdict-card and live-progress components, and Crash can write the retry-state-machine glue from the failure-domain table.

---

*End of system-diagram v0.1. Axiom — Strategy Layer.*
