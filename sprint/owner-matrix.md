# Owner Matrix — Decisions & Risks

**Version:** 1.0
**Date:** 2026-05-11
**Owner:** Sprint
**Purpose:** Single canonical map of every cross-phase decision and every PRD §19 risk → owner + milestone deadline. Referenced by `BUILD_FLOW.md` Phase 6 exit gate ("every Blocker risk has owner+milestone; every still-open D# has deadline").

Sources fused:
- PRD §17 (D1–D23 + #17–#20 + #21–#23)
- `shared_context/projects/studio-zero-productization/decisions.md` (IA-D1/2/3 + PRD-v0.5-C1/2/3)
- `architecture/decisions.md` (ARCH-D1..D10)
- Phase-5 Jury verdict (B1/B2/B3 + C1..C4 + M1..M6)
- Phase-5 Cipher audit (Fix-1..Fix-5)
- PRD §19 risk register

---

## 1. Decision matrix

Status legend: **LOCKED** = decision made + artifact landed; **LOCKED (open follow-up)** = decision made but artifact partial; **OPEN** = needs Jo's call or cross-team sign-off.

| Decision | Status | Owner | Deadline milestone | Notes |
|---|---|---|---|---|
| **D1 — GitHub App day-one (per-repo perms)** | LOCKED v0.4 | Forge + Shield | M1 (must ship) | PRD §17 D1. Closes Shield v0.2 B4. `oauth_tokens` table has `installation_id`. |
| **D2 — Free tier = 1 Project, unlimited Surface re-audits** | LOCKED v0.4 | Forge + Hook | M1 (free-tier ships with M1) | PRD §17 D2. App-layer 1-project cap; EC-7 rate-limit in audit-run-state-machine.md. |
| **D3 — Auto-PR fix delivery DEFERRED to V1.5** | LOCKED v0.4 | Forge + Comply | V1.5 | PRD §17 D3. Specs-only at MVP. Interim AI disclosure machinery (§11.3) ships at M0/M1. |
| **D4 — Starter pricing $19 vs $29** | **OPEN** | Penny + Jo | **M2 (Stripe go-live)** | PRD §17 D4. Recommendation if no decision by M2 ticket-cut: ship at $29 with A/B-test slot at $19 for first 200 signups (Penny's call to write up before M2 start). |
| **D5 — Auto-PR pricing flat $49 vs tiered S/M/L** | **OPEN** | Penny + Jo | **V1.5 spec-kickoff** | PRD §17 D5. Decision pushed to V1.5 spec time per v0.4 panel concurrence. |
| **D6 — Milestone reorder M2↔M3 (Managed before CLI)** | LOCKED v0.4 | Sprint | M0 (reorder reflected in this plan) | PRD §17 D6. Verified — M2 = Managed billing; M3 = CLI. |
| **D7 — CLI watermark `Private Run · Self-Audited`** | LOCKED v0.4 | Herald + Halo | M3 (CLI ships) | PRD §17 D7. Copy locked Herald; a11y spec Halo HC1/SC 1.3.1/SC 3.2.4. |
| **D8 — Sandbox = rootless container + seccomp + egress at M1; Firecracker V2** | LOCKED v0.4 (phased) | Shield + Forge | **M0 (sandbox locked in decisions.md) → M1 (ship rootless) → V2 (Firecracker graduation)** | PRD §17 D8. ARCH-D2 picks Railway us-east. Firecracker A/B at V2 exit. |
| **D9 — SSRF / PI / redaction / ingestion limits at M0/M1 mandatory** | LOCKED v0.4 | Shield + Forge + Verify | M1 (all four corpora green) | PRD §17 D9. Corpus minimums in `architecture/test-strategy.md` §2 + threat-model §4. |
| **#17 — GDPR Art. 28 DPA + subprocessor list** | LOCKED v0.4 | Comply + Ledger | M2 (before first paid charge) | PRD §17 #17. `/subprocessors` route, 30-day change-notification. |
| **#18 — EU AI Act AI System Card** | LOCKED v0.4 (phased) | Comply + Herald | **M0/M1 (interim machinery), V1.5 (System Card v1.0)** | PRD §17 #18. Art. 50 binds 2026-08-02. |
| **#19 — BYOK pass-through ToS** | LOCKED v0.4 | Comply | M1 (before first BYOK customer) | PRD §17 #19. |
| **#20 — Regional refund matrix (EU/UK/CA/FTC)** | LOCKED v0.4 | Comply + Ledger + Forge | M2 (before first paid charge) | PRD §17 #20. `cooling_off_windows` table in `0003_billing_managed.sql`. |
| **D21 — Jury synth stall → `failed_synth_timeout`** | LOCKED v0.5 | Atlas + Trace + Forge | M2 (synth-stall integration test green) | PRD §17 #21. State exists in `run_state` enum. |
| **D22 — EU cooling-off resets per upgrade** | LOCKED v0.5 | Comply + Ledger | M2 (TOS live + trigger green) | PRD §17 #22. `cooling_off_windows.trigger_event` CHECK allows `'upgrade'`. |
| **D23 — GH App uninstall after Auto-PR opened (banner)** | LOCKED v0.5 (MVP-V1.5) | Atlas + Forge + Trace | **V1.5 (banner ships with Auto-PR)** | PRD §17 #23. **Jury B1: requires `runs.tracking_state` enum column landed in `0001_initial.sql` at M0.** |
| **IA-D1 — Mode pick before GitHub install** | LOCKED | Forge | M1 (onboarding ships) | shared_context decisions.md IA-D1. |
| **IA-D2 — E2 upsell as full route `/app/audits/[run-id]/upgrade`** | LOCKED | Vega + Hook | M1 (E2 upsell ships) | shared_context decisions.md IA-D2. |
| **IA-D3 — Re-audit at project boundary `/app/projects/[id]/re-audit`** | LOCKED | Vega + Atlas | M1 (re-audit ships with free tier) | shared_context decisions.md IA-D3. |
| **PRD-v0.5-C1 — Jury synth stall escape hatch** | LOCKED (= D21) | Atlas + Trace | M2 | Promoted to PRD §17 #21. |
| **PRD-v0.5-C2 — EU cooling-off reset on upgrade** | LOCKED (= D22) | Comply + Ledger | M2 | Promoted to PRD §17 #22. |
| **PRD-v0.5-C3 — GH App uninstall after PR opened** | LOCKED (= D23) | Atlas + Forge | V1.5 | Promoted to PRD §17 #23. |
| **ARCH-D1 — Job queue = pg-boss in Postgres** | LOCKED 2026-05-11 | Atlas + Forge | M1 (workers ship) | `architecture/decisions.md` §ARCH-D1. |
| **ARCH-D2 — Runner host = Railway us-east** | LOCKED 2026-05-11 | Forge + Pipeline | M0 (Terra provisions in IaC) → M1 (workers deploy) | `architecture/decisions.md` §ARCH-D2. |
| **ARCH-D3 — Short-lived tenant JWT minting (5-min TTL + refresh)** | LOCKED 2026-05-11 | Atlas + Forge + Cipher | M1 (mint endpoint + RLS + revocation join) | Jury B3 reconciled to 5-min hard cap; Cipher Fix-3a + Fix-5 land here. |
| **ARCH-D4 — Stripe webhook reconciliation (bounded polling)** | LOCKED 2026-05-11 | Ledger + Forge | M2 (Stripe go-live) | `architecture/decisions.md` §ARCH-D4. |
| **ARCH-D5 — Realtime fan-out budget (per-run channel)** | LOCKED 2026-05-11 | Stream + Atlas + Crash | M2 (load test green at 90 concurrent runs) | `architecture/decisions.md` §ARCH-D5. |
| **ARCH-D6 — GitHub App webhook stale-tracking gap (tracking_state enum)** | LOCKED 2026-05-11 | Atlas + Forge + Trace | **M0 (column lands in `0001_initial.sql`)** → V1.5 (UI banner ships) | Jury B1: replace `fix_pr_jobs.tracking_stale boolean` with `tracking_state ENUM('active','stale','recovered')` + add same column on `runs`. |
| **ARCH-D7 — Edge Function vs API route boundary** | LOCKED 2026-05-11 | Forge + Pipeline | M1 (CI lint rule live) | Jury B2 + Cipher Fix-2: add `llm-gateway` to Edge Functions list + add `'reaudit_passed'` value to `fix_pr_state` enum. |
| **ARCH-D8 — Multi-region deferral (US-only at MVP)** | LOCKED (plan-only) | Atlas + Comply + Cipher + Forge | Triggered by first EU customer request | Migration spec lives at `architecture/database/migrations/_planned_/data_residency.sql`; not gated by any milestone. |
| **ARCH-D9 — Egress allowlist enforcement primitive** | **OPEN** | Shield + Cipher | **M1 exit gate (Phase-5 deadline)** | `architecture/decisions.md` open follow-up. Sprint flags non-trivial DevOps spike — call this M1 critical path. |
| **ARCH-D10 — `cli_heartbeat` event in AuditEvent enum** | **OPEN** | Atlas | **M3 exit gate (CLI launches)** | Jury Major M3. Schema bump v1 → v1.1. |
| **Jury B1 — `runs.tracking_state` enum column** | OPEN (M0 fix) | Atlas | **M0 (before `0001_initial.sql` lands)** | Phase-5 Jury Blocker; reconciles ARCH-D6 ↔ tables.sql. |
| **Jury B2 — `fix_pr_state` missing `reaudit_passed` value** | OPEN (M0 fix) | Atlas | **M0 (before `0001_initial.sql` lands)** | Phase-5 Jury Blocker; reconciles ARCH-D7 ↔ tables.sql. |
| **Jury B3 — Runner JWT TTL conflict (5 vs 15 min)** | OPEN (M0 fix) | Shield | **M0 (Shield edits TB-3 + §3.2 to 5-min)** | Phase-5 Jury Blocker; Axiom + Atlas already agree on 5-min. |
| **Jury C1 — TB numbering reconciliation (Axiom ↔ Shield)** | OPEN (M0 fix) | Axiom + Shield | **M0 (one-hour reconciliation session)** | Phase-5 Jury Critical; Shield's TB-1..TB-15 numbering wins. |
| **Jury C2 — Runner JWT mint endpoint naming** | OPEN (M0 fix) | Axiom | **M0 (Axiom edits ARCH-D3 to match runner-jwt.md)** | Phase-5 Jury Critical; Atlas's `mint-runner-token` + `aud=studio-zero/runner` wins. |
| **Jury C3 — `notifications` table missing** | OPEN (M0 fix) | Atlas | **M0 (`0001_initial.sql`)** | Phase-5 Jury Critical; `/app/notifications` route in system-diagram §7. |
| **Jury C4 — `tenant_settings.retention_days` rename** | OPEN (M0 fix) | Axiom | **M0 (system-diagram §7 update)** | Phase-5 Jury Critical; Atlas's `tenants.retention_days_code` is the canonical name. |
| **Jury M1 — IaC directory empty** | OPEN (M0 fix) | Terra | **M0 ticket-0** | Phase-5 Jury Major; Sprint ticket-0 owned by Terra. |
| **Jury M2 — Shield TB-3 says BullMQ/pg-boss (stale on ARCH-D1)** | OPEN (M0 fix) | Shield | M1 (Shield edits to pg-boss only) | Phase-5 Jury Major. |
| **Jury M3 — `cli_heartbeat` schema variant missing** | = ARCH-D10 | Atlas | M3 | Phase-5 Jury Major; same item as ARCH-D10. |
| **Jury M4 — Egress allowlist primitive unresolved** | = ARCH-D9 | Shield + Cipher | M1 | Phase-5 Jury Major; same item as ARCH-D9. |
| **Jury M5 — Compass AH-6 `projects.client_tag` missing** | OPEN (M2 fix) | Compass + Atlas | **M2 (indie-agency persona pays)** | Phase-5 Jury Major; add `projects.client_tag text` in `0003_billing_managed.sql`. |
| **Jury M6 — SKU plain-English mapping doc missing** | OPEN (M2 fix) | Forge + Compass | **M2** | Phase-5 Jury Major; `docs/sku-mapping.md`. |
| **Cipher Fix-1 — Vault-AAD enforcement contract** | OPEN (M0 fix) | Atlas + Cipher | **M0 (lands in `0002_rls_and_runner_jwt.sql`)** | `vault.decrypt_byok()` SECURITY DEFINER function + Verify `integration/vault-aad-required.spec.ts`. |
| **Cipher Fix-2 — Runner-vs-gateway BYOK contradiction** | OPEN (M1 fix) | Axiom + Forge | **M1 (architecture lock)** | Add `llm-gateway` Edge Function; rewrite PRD §13.4 + system-diagram TB-5 + ARCH-D7 to match the gateway pattern. |
| **Cipher Fix-3 — Doc reconciliation (JWT, PostHog, CLI manifest, audit_action enum)** | OPEN (phased) | Atlas + Cipher + Forge | **M0 (3a, 3d), M1 (3b), M3 (3c)** | 3a: aud=studio-zero/runner + 5-min hard cap. 3b: PostHog `tenant_id` HMAC-SHA256(salt). 3c: Ed25519 CLI manifest signing. 3d: `code_cryptoshredded` audit_action. |
| **Cipher Fix-4 — Lock AEAD cipher name + rotation cadences** | OPEN (M0 fix) | Cipher | **M0 (PRD §13.4 + system-diagram §1 + threat-model TB-2 I-row edits)** | Rename "AES-256-GCM" → "XChaCha20-Poly1305 (via `pgsodium` TCE), AAD = `tenant_id::text`". Pick 90d rotation for platform-owned signing material. |
| **Cipher Fix-5 — Revocation join clause in RLS** | OPEN (M1 fix) | Atlas | **M1 (`0002_rls_and_runner_jwt.sql`)** | Every runner-role policy joins to `runner_token_mints.revoked_at IS NULL`. |

## Still open after v0.5 (need Jo's call)

These are the ONLY decisions still requiring Jo input at PRD lock. Every other open item above has a named owner + deadline within Studio Zero's team.

| Decision | Recommendation if Jo doesn't decide | Decision deadline |
|---|---|---|
| **D4** Starter pricing $19 vs $29 | Ship at $29 with $19 A/B-test slot for first 200 signups (Penny's recommendation) | M2 ticket-cut (~week 7) |
| **D5** Auto-PR pricing flat $49 vs tiered S/M/L | Decision pushed to V1.5 spec time | V1.5 spec-kickoff (~week 17) |

---

## 2. Risk matrix (PRD §19 + Sprint additions)

Every PRD §19 row maps to ≥1 milestone's "Risks specific to this milestone" section. Likelihood × Impact preserved verbatim from PRD §19; mitigation owner + milestone deadline added.

| # | Risk | Likelihood | Impact | Mitigation owner | Mitigation milestone |
|---|---|---|---|---|---|
| R1 | LLM cost overrun in Managed tier | High | High | **Meter** (caps + alerts), Forge (impl), Crash (auto-pause) | **M2** (load test fires the cap; alert routes to Watch) |
| R2 | Audit verdict perceived as unfair / inconsistent | Medium | High | **Jury** (score versioning + evidence rubric), Herald (verdict-screen copy) | **M1** (verdict ships with score_engine_version stamp + per-finding evidence) |
| R3 | Auto-PR opens a bad change against customer's repo | Medium | High | **Forge** (re-audit gate), Jury (re-audit), Pipeline (default-branch fuzz test) | **V1.5** (C6 + C8 negative tests in V1.5 exit gate) |
| R4 | BYOK key leak from logs or DB | Low | Critical | **Cipher** (Vault AEAD+AAD, `beforeSend` scrub), Pipeline (gitleaks) | **M0** (Fix-1 in migration 0002), **M1** (redaction middleware corpus green) |
| R5 | Customer code retention breach (GDPR/IP) | Low | Critical | **Atlas** (cryptoshred), Comply (retention table), Cipher (key delete) | **M1** (retention=0 cryptoshred test) + **M4** (right-to-delete e2e + purge cron) |
| R6 | CLI mode runner produces fraudulent verdict | Medium | Medium | **Herald** (watermark copy), Halo (a11y), Shield (registry) | **M3** (watermark on every CLI verdict surface; D7) |
| R7 | EU AI Act Art. 50 missed deadline (2026-08-02) | Medium | High | **Comply** (interim machinery), Forge (header + meta tag) | **M0** (header on first synthetic run) + **V1.5** (System Card v1.0) |
| R8 | Studio Zero ships a build with a bug we should have caught | High | Medium | **Sprint** (dogfood gate every milestone), Verify (test plan) | **Every M1 → V2.1** (self-dogfood gate in each milestone's exit) |
| R9 | Concentration risk on Anthropic | Medium | High | **Forge** (provider abstraction), Crash (circuit breaker), Comply (no SLA overpromise) | **M1** (provider abstraction lives in `runner/llm/`) + **V2** (second provider integration) |
| R10 | Pricing positioning misread (commodity vs premium) | Medium | Medium | **Penny** (revisit after first 5 customers) | **M5** (first 5 paying customers landed) → **post-M5 retro** |
| **NEW R11** | **Phase-5 reconciliation drift** (Jury B1/B2/B3 + C1/C2/C3/C4 not landed before `0001_initial.sql` ships) | High | Critical | **Sprint** (ticket M0-week-1 work), Atlas + Axiom + Shield (artifact edits) | **M0** (all Blockers + Criticals fixed in week 1; gate in week 2) |
| **NEW R12** | **IaC absence blocks all M0 testing** | High | High | **Terra** (provision Vercel + Supabase + Railway + Cloudflare us-east) | **M0 ticket-0** (~3 days; nothing else blocks on it) |
| **NEW R13** | **Egress allowlist primitive (ARCH-D9) is a DevOps spike that Sprint underestimated** | Medium | High | **Shield + Cipher** (pick Cilium NetworkPolicy + DNS-pin) | **M1 exit gate** (pentest at M3 validates) |
| **NEW R14** | **Pentest vendor lead-time** (M3 exit gate = first external pentest; reputable vendors book 8–12 weeks out) | High | High | **Shield + Penny** (engage vendor at M0 close; not M3 start) | **M0 close** (vendor signed + scope locked) → **M3 exit** (report committed) |
| **NEW R15** | **WCAG 2.2 AA third-party conformance audit lead-time** (M4 exit gate; reputable vendors book 6–10 weeks out) | Medium | High | **Halo + Comply** (engage vendor at M1 close; not M4 start) | **M1 close** (vendor signed) → **M4 exit** (report committed) |
| **NEW R16** | **Cross-mode consistency drift** (BYOK vs Managed verdicts diverge as Anthropic ships new models) | Medium | Medium | **Forge** (pin model versions in `runner/llm/pinned-versions.json`), Verify (nightly drift dashboard) | **M1** (pins committed) + **ongoing** |
| **NEW R17** | **Decision D4 unresolved at M2 ticket-cut** (Starter pricing) | Medium | Medium | **Penny + Jo** (decide by week 7) | **M2 ticket-cut** (default: $29 + A/B slot) |
| **NEW R18** | **Auto-PR attach rate below assumption** (V1.5 economic model assumed >15% Pro-tier attach) | Medium | High | **Penny + Hook** (monitor attach rate; ICE-prioritize improvements) | **V1.5 + 30 days** (first attach-rate cohort) |
| **NEW R19** | **Self-dogfood gate FAILs at M2 or later** (Studio Zero's own M2 codebase scores < 70) | Medium | High | **BigBrain** (escalation), Jury (verdict), all layer leads (remediation) | **Per-milestone** — milestone does not close until dogfood PASSes |
| **NEW R20** | **Stripe Click-to-Cancel (16 CFR 425) compliance late** — FTC rule binds in 2026 calendar window | Low | High | **Comply + Ledger** (UI must allow cancel in same channel as signup) | **M2** (Stripe go-live; UI gate in `billing-and-cancel.md`) |

---

## 3. Decision-closure tally per milestone

For Phase 6 Jury Exit Gate verification: every milestone closes ≥1 decision. No milestone passes if a decision tied to it remains open at the milestone's close.

| Milestone | Decisions closing here |
|---|---|
| **M0** | Jury B1, B2, B3, C1, C2, C3, C4, M1 (IaC), M2 (Shield TB-3 stale), Cipher Fix-1, Fix-3a, Fix-3d, Fix-4; ARCH-D2 (Terra provisions); D6 (reorder reflected); D8 (locked in decisions.md, ship at M1); #18 (interim machinery on first synthetic run). |
| **M1** | D1 (GH App), D2 (free tier), D9 (4 corpora green), IA-D1/D2/D3, #19 (BYOK pass-through ToS), ARCH-D1 (pg-boss), ARCH-D3 (mint+RLS+revocation), ARCH-D7 (Edge Fn lint), ARCH-D9 (egress primitive), Cipher Fix-2, Fix-3b, Fix-5; R2/R4/R5/R9/R16 mitigations. |
| **M2** | **D4 (must decide by ticket-cut)**, #17 (DPA + subprocessors), #20 (regional refund), D21 (synth stall), D22 (cooling-off reset), ARCH-D4 (Stripe webhook), ARCH-D5 (Realtime fan-out budget), Jury M5 (`client_tag`), Jury M6 (SKU mapping); R1/R20 mitigations. |
| **M3** | D7 (CLI watermark), ARCH-D10 (cli_heartbeat), Cipher Fix-3c (Ed25519 manifest); **external pentest ≤1 Major/0 Critical**; R6 mitigation. |
| **M4** | **WCAG 2.2 AA third-party conformance audit signed off** (R15 closes); GDPR right-to-delete e2e (R5 secondary close); E1–E5 trigger correctness; status page live. |
| **M5** | DMCA Designated Agent registered; ≥4 GTM channels active; R10 first read (5 paying customers landed); day-zero runbook signed off; full regression matrix re-run. |
| **V1.5** | **D5 (must decide by V1.5 spec-kickoff)**, D3 (Auto-PR ships), D23 (banner ships with Auto-PR), #18 v1.0 (AI System Card); R3 mitigation. |
| **V2** | ARCH-D8 (multi-region migration plan; trigger condition met if first EU customer arrives); **Firecracker microVM graduation** (D8 phased close, A/B vs rootless). |
| **V2.1** | Scaffold/MVP code generation; audit-gated delivery; offline-mode network-tap green. |

---

*Owner matrix v1.0. Updated at every milestone retro. Never delete a row — supersede with new entry that links back.*
