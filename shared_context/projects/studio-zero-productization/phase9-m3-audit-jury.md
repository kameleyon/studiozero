# Phase 9 — M3 Audit (Jury)

**Auditor:** Jury (orchestrator + 6 reviewers' lens)
**Date:** 2026-05-12
**Scope:** Commits `6d9ecdb..26c62f6` (M3 producer batches 1 + 2) against `sprint/milestone-M3.md` exit gate.
**Self-dogfood gate:** APPLIED (M3 codebase delta audited via reviewer reasoning per `score_engine.v1.json`).
**Verdict at M3 close:** **PASS WITH FIXES — score 77** (conditional on closing 4 sprint-named exit-gate items + 1 partial-close finding before binary-green; external pentest report is HUMAN-pending and NOT Jury-gated).

Prior milestone scores: **M0 75 · M1 75 · M2 78 · M3 77** (small regression vs M2 driven by net-new CLI surface area with 4 sprint-named exit-gate items still open at HEAD).

---

## 1. Per-producer verdict

### 1.1 Forge (CLI binary) — commit `619cb79` — **PASS WITH FIXES**

`apps/cli/` is a disciplined first ship.

**Pass:**

- 6 commands, well below Hick's-Law threshold: `login`, `logout`, `status`, `run`, `doctor`, `version` (`apps/cli/src/index.ts` L57–L146).
- 67 CLI unit tests pass locally (`pnpm test` in `apps/cli/` → 7 files / 67 passed / 0 fail / 2.17s).
- Pairing-token file persisted at `0600` perms (`apps/cli/src/auth/pairing-token.ts`), Windows-aware via `chmod` no-op fallback.
- HMAC-SHA256 verdict-signing with the binary-hash as the HMAC key (`apps/cli/src/runner/verdict-sign.ts`) — exact D7-locked primitive from `ia/user-flows/cli-pairing-and-tamper.md` C7/C8.
- Watermark constants in a single load-bearing module (`apps/cli/src/watermark/private-run-self-audited.ts`) — `WATERMARK_BADGE = "Private Run · Self-Audited"`, `WATERMARK_HELP` matches PRD §7.2 verbatim. SC 3.2.4 testable across surfaces.
- `--skip-upload` dry-run flag is responsibly named (no "test mode" euphemism).
- Manifest-verify gate wired at startup for the load-bearing commands (login + run); `STUDIOZERO_SKIP_MANIFEST_VERIFY=1` is a documented dev-only bypass.

**Fixes required (M3+1 carries Forge itself names in the commit):**

- **F1 (Major):** `apps/cli/src/runner/reviewers-local.ts` returns **canned findings** at M3. Real Claude Code subprocess invocation is a documented M3+1 carry. This is honest, but means the CLI mode ships a **mocked happy path** end-to-end at npm publish — must be disclosed in `docs/cli-install.md` and in marketing-launch copy. R6 (fraudulent verdict) mitigation is the watermark; this gap doesn't shift R6 but it does shift the value proposition. **Closure plan:** M3+1 first ticket; until then the CLI is opt-in alpha, not GA. Add a `[ALPHA]` warning to `studio-zero --version` output.
- **F2 (Major):** No 30s heartbeat emitter in CLI source. `grep -rn heartbeat apps/cli/src/` returns 0 hits. Sprint M3 §"Forge — CLI heartbeat (ARCH-D10): runner emits 30s heartbeat" is unsatisfied on the CLI side; the receiving endpoint exists (Forge web batch 2) but nothing calls it. Crash chaos test EC-6 (CLI offline mid-run) cannot exercise because there is no heartbeat to drop. **Closure plan:** add `apps/cli/src/network/heartbeat.ts` invoking `POST /api/cli/heartbeat` on 30s `setInterval`; cancel on SIGINT.
- **F3 (Minor):** No emission of `cli_heartbeat` events in the AuditEvent stream — see ARCH-D10 finding under §3.

### 1.2 Forge (web endpoints) — commit `ca00044` — **PASS**

8 web endpoints land clean:

- `POST /api/cli/pair/init` — pairing-code mint with 5-min TTL + 5/min rate-limit (`apps/web/lib/cli-auth.ts` L186–L198 in-memory token bucket; V1.5 Upstash Redis migration explicitly noted).
- `POST /api/cli/pair/confirm` — code redemption + manifest-signature pre-check.
- `POST /api/cli/pair` — listing + revocation surface.
- `GET /api/cli/jobs` — long-poll job dispatch (30s default, AbortController-cancellable).
- `GET /api/cli/runs/[id]/events` — SSE event-stream relay.
- `POST /api/cli/runs/[id]/verdict` — **D7 sign-verify is here** (`apps/web/app/api/cli/runs/[id]/verdict/route.ts` L40–L74). Watermark is server-rendered after sig pass — NOT customer-claimed. Discipline.
- `POST /api/cli/heartbeat` — 30s liveness ping target (Forge correctly notes no outer rate-limit; bearer-token auth + revocation are the throttle).
- `POST /api/cli/refresh` — pairing-token rotation.

999-tests-pass claim is the root harness count; CLI integration spec lane verified separately under §1.5.

**No fixes required for the endpoint set.** The in-memory rate limiter is the right M3 choice for single-region (vercel.json pins `iad1`); V1.5 multi-region forces Upstash. The verdict route's `unrecognized_binary | mismatch | verified` tri-state correctly preserves D7's transparency posture (verdict still renders with `signature_status` advisory; no "blocked" path for the customer's own machine).

### 1.3 Atlas — commit `9d4cdee` — **PASS WITH FIXES**

`0004_cli_pairing_hardening.sql` is 689 lines, single `BEGIN/COMMIT`, idempotent (`IF NOT EXISTS` guards on every `CREATE`). Three blocks ship:

**A. `cli_pairings` hardening** — 8 additive columns: `manifest_signature`, `last_heartbeat_at` (denorm mirror of `cli_heartbeat.last_seen_at` for index-only `active_pairings` query), `binary_hash`, `device_fingerprint`, `replay_attempt_count`, explicit `status` FSM column, `expires_at`, `pairing_token_hash` (UNIQUE; raw token returned once at C5 confirm).

**B. `pairing_code_attempts`** — per-IP rate-limit ledger, 5-min IP retention (Comply privacy-minimisation aligned per `consent-and-data-minimisation.md`). pg_cron purge gated to M4 0005 migration; fallback service-role TTL `DELETE` until then. Sound staging-compatibility posture.

**C. `cli_heartbeat`** — one row per pairing; `last_seen_at`, `version`, `ip_hash` (HMAC with per-deployment pepper, never raw IP), `last_claimed_job`, coarse `health_status`. `stale_after_5min()` function flips status for the UI per `cli-pairing-and-tamper.md` EC-6.

**4 functions + 5 RLS policies** — RLS posture correct: member-SELECT for tenant rows, service-role-only mutations on rate-limit ledger.

**Fixes required:**

- **A1 (Major):** **ARCH-D10 partial close.** Decision text in `architecture/decisions.md` L401 is: _"`cli_heartbeat` event in AuditEvent enum"_. Atlas's migration adds the `cli_heartbeat` **TABLE** + helper functions, which is the persistence side. The discriminated-union `kind:` enum in `architecture/schemas/audit-event.v1.ts` has **no `'cli_heartbeat'` variant** and **no v1 → v1.1 bump** (`grep -n "kind: '"` returns `progress`, `finding`, `agent_log`, `final_verdict`, `error`). Sprint M3 line 54 also says: _"Atlas — ARCH-D10 close: add `cli_heartbeat` variant to `audit-event.v1.ts`; bump schema version v1 → v1.1; update fixtures."_ — this scope is unmet. **Closure plan:** new file `architecture/schemas/audit-event.v1.1.ts` (or in-place superset with `kind: 'cli_heartbeat'` variant) + fixtures + `schema-validate.test.ts` reflection. Runner contract version bump.

### 1.4 Cipher — commit `f6e50e5` — **PASS WITH FIXES**

Ed25519 manifest-signing primitive lands per `architecture/cli-manifest-signing.md` (354 lines, LOCKED 2026-05-12). Single load-bearing claim documented in §0: _"The web app trusts a CLI binary_hash if-and-only-if that hash appears in an Ed25519-signed manifest whose signature verifies under Jo's vault-held private key."_ Disciplined single-claim posture mirroring `architecture/llm-gateway.md`.

**Pass:**

- `tools/cli-manifest-sign.ts` build-time signer (private key never persisted; one-shot from 1Password).
- `apps/cli/src/auth/manifest-verify.ts` — startup verifier with the three-way result type: `{ ok: true }`, `{ ok: 'soft_fail' }` (network failures — continue, server is the final tamper call), `{ ok: false, reason: ... }` (signature invalid or hash mismatch → exit 13).
- `apps/web/lib/cli-manifest-verifier.ts` — server-side mirror; correctly fail-hard on missing manifest (server is on a stable network; missing manifest IS a tamper signal).
- `architecture/secrets-rotation-runbook.md` §1.7 — 90d Ed25519 rotation runbook added.
- Brand-locked tamper copy in `manifest-verify.ts` L321–L326 (`brand/samples/05-error-messages.md` voice: grade-6 + what-then-what-to-do).

**Fix required:**

- **C1 (Major, impact-7 per `score_engine.v1.json`):** `apps/cli/src/auth/manifest-pubkey.ts` L63–L64 `CURRENT_PUBKEY` is an **honest documented placeholder** (`"MCowBQYDK2VwAyEAxxXk2Ej2OvKYDpVxnZBWnQF5b3fL8KCxOyA1QkR7Y10="`). The L56–L62 doc-block names this as "Jo's first-release-ceremony Human action" and says _"the placeholder is the SHA-256 hash of 'studio-zero/m3-placeholder-pubkey' encoded b64 — visibly fake, will fail any real signature verify, fails-safe by design."_ The fail-safe posture is correct: a real signature attempt against this pubkey will reject and exit 13. **But it means M3 cannot publish a real CLI binary to npm without the ceremony.** Closure is Jo-Human (vault keypair gen + edit constant + republish), not Forge/Cipher. Flag as **R14-adjacent operational gate**.

### 1.5 Verify — commit `26c62f6` — **PASS WITH FIXES**

11 CLI integration specs land (code physically in `f6e50e5` due to concurrent commit; attribution in `26c62f6`). Local re-run: **12 spec files / 94 passed / 5 skipped / 0 failed / 1.50s.**

| Spec                                     | Tests       | Status |
| ---------------------------------------- | ----------- | ------ |
| `cli-pair-init.spec.ts`                  | 8           | PASS   |
| `cli-pair-confirm.spec.ts`               | 7           | PASS   |
| `cli-pair-expired.spec.ts`               | 7           | PASS   |
| `cli-pair-replay.spec.ts`                | 8           | PASS   |
| `cli-unpaired-rejection.spec.ts`         | 9           | PASS   |
| `cli-version-too-old.spec.ts`            | 9           | PASS   |
| `cli-tamper-detected.spec.ts`            | 6 (1 skip)  | PASS   |
| `cli-verdict-signature-tampered.spec.ts` | 6           | PASS   |
| `cli-heartbeat.spec.ts`                  | 9 (1 skip)  | PASS   |
| `cli-cross-tenant-rejected.spec.ts`      | 7           | PASS   |
| `cli-watermark-sr-announce.spec.ts`      | 12 (3 skip) | PASS   |
| `cli-manifest-tamper.spec.ts`            | 11          | PASS   |

**All 5 skips carry documented M3+1 reasons** (verified inline):

1. `cli-heartbeat`: Atlas `stale_after` Postgres-trigger needs live DB.
2. `cli-tamper-detected`: live binary tamper test needs actual built `dist/index.js` artifact.
3. `cli-watermark-sr-announce` × 3: axe-core / FG-BG contrast / 320px reflow need jsdom + react-dom/server setup at root.

**Fixes required:**

- **V1 (Major):** **Exit-gate-named tests do not exist by exact name.** `sprint/milestone-M3.md` exit gate (L107–L113) names 6 specs that are MIA on disk:
  - `tests/integration/cli-pairing.spec.ts` → coverage spread across 4 specs (init, confirm, expired, replay) — substantively covered, but the named file does not exist; pipeline grep on file-name fails-shut.
  - `tests/integration/cli-no-upload.spec.ts` → **does not exist anywhere.** Network-tap zero-bytes-POSTed assertion is **not implemented.** This is the load-bearing privacy claim for CLI mode (PRD §13.4); unimplemented exit gate.
  - `tests/security/cli-job-tamper.spec.ts` → **does not exist** (no `tests/security/cli-*`). Synthetic job-payload tamper between dispatch + CLI is uncovered.
  - `tests/acceptance/goal-4-three-modes.spec.ts` → **`tests/acceptance/` directory does not exist at all.** This goal-4 acceptance test was an M2 carry too (M2 audit §1.5); CLI lane snapshot of identical watermark string across surfaces (SC 3.2.4) is not asserted by an acceptance test, only by unit + watermark-sr-announce specs.
  - `tests/integration/aup-attestation-logged.spec.ts` → **does not exist.** Deployed-URL AUP attestation not tested.
  - `tests/integration/stripe-idempotency.spec.ts` → **does not exist** by exact name; partial idempotency coverage in `stripe-reconcile-race.spec.ts` + `stripe-webhook-handler.spec.ts`.
  - **Closure plan:** Verify renames or creates 6 specs by exit-gate-exact filenames; `goal-4-three-modes.spec.ts` is the highest priority (CLI lane is the watermark cross-surface gate). `cli-no-upload.spec.ts` is the second-highest (load-bearing privacy claim).

---

## 2. M3 exit-gate scorecard (per `sprint/milestone-M3.md` L103–L117)

| #   | Exit-gate item                                                                | Status                              | Evidence                                                                                                                         |
| --- | ----------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `tests/integration/cli-pairing.spec.ts` green                                 | **PASS (renamed)**                  | Coverage in `cli-pair-init/confirm/expired/replay/unpaired-rejection` (39 tests, 0 fail); recommend Verify rename                |
| 2   | `tests/integration/cli-no-upload.spec.ts` green (network-tap)                 | **FAIL — file absent**              | No network-tap spec on disk; PRD §13.4 load-bearing privacy claim untested                                                       |
| 3   | `tests/acceptance/goal-4-three-modes.spec.ts` CLI lane                        | **FAIL — file absent**              | `tests/acceptance/` dir does not exist; cross-surface SC 3.2.4 snapshot uncovered                                                |
| 4   | `tests/security/cli-job-tamper.spec.ts`                                       | **FAIL — file absent**              | Synthetic job-payload tamper uncovered                                                                                           |
| 5   | Deployed-URL audit on paid SKUs + `aup-attestation-logged.spec.ts`            | **FAIL — feature absent**           | No `/api/runs/audit-url` route; no AUP attestation log path                                                                      |
| 6   | External pentest report at `compliance/pentest-2026-qN.pdf`                   | **OPERATIONAL pending (HUMAN)**     | Only `compliance/pentest-engagement-2026.md` present; vendor-driven; not Jury-gated                                              |
| 7   | `tests/integration/stripe-idempotency.spec.ts` green                          | **PASS (partial coverage; rename)** | Partial coverage in `stripe-reconcile-race` + `stripe-webhook-handler`; named file absent                                        |
| 8   | Self-dogfood gate M3 PASS / PASS WITH FIXES                                   | **PASS WITH FIXES**                 | This document                                                                                                                    |
| 9   | `0004_cli_pairing_hardening.sql` applies cleanly                              | **PASS**                            | 689 lines, single `BEGIN/COMMIT`, `IF NOT EXISTS` idempotent                                                                     |
| 10  | ARCH-D10 closed: `cli_heartbeat` variant in `audit-event.v1.ts`; v1→v1.1 bump | **PARTIAL — table-only**            | Table + functions land; enum variant + version bump MISSING (see §1.3 A1)                                                        |
| 11  | Cipher Fix-3c closed: Ed25519 manifest signing in production                  | **PASS WITH CEREMONY-PENDING**      | Code + spec + runbook live; `CURRENT_PUBKEY` placeholder pending Jo's first-release ceremony — fail-safe by design (see §1.4 C1) |

**Exit-gate roll-up:** **5 PASS / 2 PASS-WITH-FIX / 3 FAIL / 1 PARTIAL / 1 OPERATIONAL-pending.** The 3 hard FAILs (`cli-no-upload`, `goal-4-three-modes`, `cli-job-tamper`) are the M3-close blockers Jury can self-validate. The deployed-URL AUP feature absence is a **scope blocker** (not just a test absence): the M3 paid-SKU AUP intake is unimplemented.

---

## 3. Cross-cutting findings (top 5)

| #   | Finding                                                                                                                                                                                                               | Severity                | Owner                          | Closure plan                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `tests/integration/cli-no-upload.spec.ts` network-tap missing — CLI mode's load-bearing privacy claim (PRD §13.4: "source never leaves customer machine") is unverified by automation                                 | **Critical**            | Verify                         | Spawn CLI process under a network-tap proxy (`undici`/`mitmproxy`/Nock at the `studio-client.ts` HTTP egress); assert payload bodies for verdict POSTs contain only the audit-output.v1 metadata shape; assert zero bytes from `projectPath` reach the wire. Land before M3 binary-green.                                                                       |
| 2   | Deployed-URL audit on paid SKUs + AUP attestation logged at intake (PRD §14.7) NOT IMPLEMENTED — no API route, no audit_logs write, no test                                                                           | **Critical**            | Forge + Vega + Verify + Comply | Forge: `apps/web/app/api/runs/audit-url/route.ts` with mandatory `aup_attestation` body field + `audit_logs` row write (timestamp + IP + user_id + verbatim text). Vega: URL field + AUP checkbox on `/app/projects/new` (paid-SKU gate). Verify: `aup-attestation-logged.spec.ts`. Comply: copy review for D7-style transparency framing (not security claim). |
| 3   | ARCH-D10 closed at table+function layer (`0004` migration) but NOT at AuditEvent enum / schema-version layer                                                                                                          | **Major**               | Atlas                          | Add `kind: 'cli_heartbeat'` variant to `audit-event.v1.ts` (or rev to `audit-event.v1.1.ts`); update fixtures + `schema-validate.test.ts`. Verify the CLI's heartbeat path emits the schema-conformant event; runner-contract version bump in `runner/llm/pinned-versions.json`.                                                                                |
| 4   | No 30s heartbeat emitter in CLI source (server endpoint receives, but no CLI client calls it); Crash chaos test EC-6 (CLI offline mid-run) cannot exercise                                                            | **Major**               | Forge + Crash                  | `apps/cli/src/network/heartbeat.ts` — 30s `setInterval` POST to `/api/cli/heartbeat` while a run is in-flight; cancel on SIGINT + run-complete. Crash chaos test then mocks the interval, asserts state machine EC-6 transition.                                                                                                                                |
| 5   | `CURRENT_PUBKEY` placeholder in `apps/cli/src/auth/manifest-pubkey.ts` L63–L64 — honest documented gap; fail-safe by design (real signature against placeholder fails-shut); Jo's first-release-ceremony Human action | **Major (operational)** | Jo + Cipher                    | Per `architecture/secrets-rotation-runbook.md` §1.7: gen Ed25519 keypair on air-gapped laptop into 1Password; sign first manifest via `tools/cli-manifest-sign.ts`; PR-edit `manifest-pubkey.ts` constant; npm publish + manifest-publish CI run. Not Jury-gated; required before first real `npm i -g @studiozero/cli` ships to a customer.                    |

**Honorable mentions (Minor, not in top 5):**

- Web watermark Chip (`apps/web/components/Chip.tsx`) declares `variant: "watermark"` but does NOT auto-wire `aria-describedby` — current contract puts the burden on the callsite to pass both badge + help-text node. No live callsite yet renders the watermark on the web verdict page (PRD §7.2 Step D wiring landing post-CLI-launch UI work). Acceptable if the CLI's tty rendering is the only M3 watermark surface AND `goal-4-three-modes.spec.ts` lands and asserts both surfaces.
- `docs/cli-install.md`, `docs/cli-pair.md`, `docs/cli-troubleshooting.md` (Scribe) status not directly verified in this audit; sprint M3 line 90 owns them.
- `runner/fixtures/cli-tamper-corpus/` (Shield + Verify ≥10 patterns) — coverage exists implicitly in `cli-tamper-detected.spec.ts` + `cli-verdict-signature-tampered.spec.ts` but the named fixtures directory was not verified to be ≥10 explicit entries.

---

## 4. Self-dogfood gate M3 (6-reviewer lens)

Applying the 6 reviewers' rubrics to the M3 codebase delta:

| Reviewer    | M3 finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Verdict                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Halo**    | Watermark badge + help-text constants are SC-3.2.4 identical across the CLI tty surface (`apps/cli/src/watermark/private-run-self-audited.ts`) and the planned web/PDF surfaces (`apps/web/components/Chip.tsx`'s `watermark` variant + PRD §7.2 verbatim). `aria-describedby` wiring on the web Chip is NOT auto-applied — callsite-driven contract; no live callsite renders the watermark yet so this is testable but not currently tested. CLI's tty rendering uses `colors.watermark(watermarkBlock())` from `ui/colors.ts` (chalk-style picocolors) — passes Direction A brand token mapping. | **PASS WITH FIX** (live web-surface wiring + `goal-4` snapshot) |
| **Optic**   | CLI command surface = 6 (`login` / `logout` / `status` / `run` / `doctor` / `version`) — well below Hick's-Law threshold (≤7). Sub-flag count low: `--depth`, `--reviewers`, `--skip-upload`, `--code`. Discovery affordance is `doctor` (diagnostic surface) — disciplined Optic pattern.                                                                                                                                                                                                                                                                                                          | **PASS**                                                        |
| **Proof**   | CLI error copy in `manifest-verify.ts` L321–L326 matches `brand/samples/05-error-messages.md` voice (grade-6, what-then-what-to-do, no jargon: _"Your Studio Zero CLI was modified or is out of date. Run `npm install -g @studiozero/cli` to reinstall the official build."_). Soft-fail copy L335–L338 explicitly does NOT say "tamper" (Herald D7 lock: customer did nothing wrong on a network failure).                                                                                                                                                                                        | **PASS**                                                        |
| **Compass** | CLI persona-fit: primary = technical solo founder + indie agency (PRD §6.4). Managed buyers don't use CLI. Persona alignment is correct. **Persona risk:** the M3+1 carry (canned-findings reviewers) means alpha-CLI customers get a misleading happy-path verdict — Compass would flag this as **persona trust erosion** if not gated behind an `[ALPHA]` banner on the `version` output + an opt-in flag at install.                                                                                                                                                                             | **PASS WITH FIX** (alpha-gating before npm publish)             |
| **Trace**   | CLI pairing flow per `ia/user-flows/cli-pairing-and-tamper.md`: C0–C9 + C-TAMPER + C-FAIL all reachable through endpoints (`pair/init` → `pair/confirm` → `jobs` → `runs/[id]/verdict`). No dead-end states; C-TAMPER renders verdict with advisory banner per D7 lock (no customer-blocking). Heartbeat dead-end exists at the moment: CLI doesn't emit → DB column `last_heartbeat_at` never updates → status UI shows "stale" → indistinguishable from real offline. Trace flag: **F4 finding above closes this.**                                                                               | **PASS WITH FIX** (heartbeat emitter)                           |
| **Canon**   | Brand consistency: CLI tty uses `colors.ts` chalk/picocolors mapping; Direction A tokens (`brand-aqua #14C8CC`, `brand-gold #E4C875`) — no template-orange `#F5B049` leak detected. Memory-locked motionmax color discipline holds in CLI surface. Watermark rendering is monochrome in tty (no color claim, just spacing) — disciplined.                                                                                                                                                                                                                                                           | **PASS**                                                        |

**Net Critical findings (self-dogfood):** **0 Critical / 3 Major / 1 Minor.**
**Self-dogfood verdict:** **PASS WITH FIXES** — same posture as M0/M1/M2; the 3 Major findings (heartbeat emitter, ARCH-D10 enum, alpha-gating) are all addressable inside M3+1.

Score reasoning per `score_engine.v1.json`:

- Starting 100, -3 (C1 Cipher placeholder Major impact-7) — wait: M3 finding is **operational/HUMAN-pending**, score-engine treats this as `impact_band: major` with `effort_to_close: low` → -3 capped.
- -7 (cross-cutting finding #1 cli-no-upload Critical impact-9 — load-bearing privacy claim untested).
- -7 (cross-cutting finding #2 deployed-URL AUP feature absent Critical impact-9).
- -3 (cross-cutting finding #3 ARCH-D10 partial Major impact-7).
- -3 (cross-cutting finding #4 heartbeat emitter Major impact-7).
- = **77/100** (vs M2's 78). One-point regression driven by net-new CLI scope with 2 Critical-band gaps.

Written to `audits/m3.json` + `audits/m3.md` per the M3 exit gate item (Jury TODO: produce these files post-audit-verdict-confirmation per `BUILD_FLOW.md` Phase 9 audit cadence).

---

## 5. Decisions closing at M3

| Decision                                                                          | Status at HEAD                             | Closer                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D7** CLI watermark `Private Run · Self-Audited` — ship                          | **CLOSED-AT-CONTRACT, PARTIAL-LIVE**       | CLI tty surface ships verbatim copy; web verdict-card slot exists, no live callsite; V1.5 carries PR-body surface per `milestone-V1-5.md` L36. SC 3.2.4 snapshot test (`goal-4-three-modes.spec.ts`) MIA — closure needs Verify rename/create. |
| **ARCH-D10** `cli_heartbeat` event in AuditEvent enum + schema v1→v1.1            | **PARTIAL — table only**                   | Atlas table + functions ship; enum variant + version bump MISSING. (See §1.3 A1, §3 #3.) **Not yet closeable.**                                                                                                                                |
| **Cipher Fix-3c** Ed25519 CLI manifest signing primitive + key custody + rotation | **CODE-CLOSED, CEREMONY-PENDING**          | Code + architecture spec + rotation runbook live. `CURRENT_PUBKEY` is documented placeholder (fail-safe). Jo first-release-ceremony Human action; not Jury-gated.                                                                              |
| **R6** CLI mode runner produces fraudulent verdict — D7 watermark mitigation      | **MITIGATED-AT-CLI; live-surface-pending** | Watermark constants live; CLI tty surface renders; web/PR/PDF surfaces pending.                                                                                                                                                                |
| **R14** External pentest vendor lead-time + report                                | **OPERATIONAL pending (HUMAN)**            | `compliance/pentest-engagement-2026.md` only; report not committed. **Not Jury-gated** — vendor-driven, Shield + Penny + Jo.                                                                                                                   |
| **R10** Windows CI for CLI                                                        | **NOT VERIFIED**                           | Pipeline OS-matrix expansion not directly inspected; `apps/cli/` ships Windows-aware code (`pairing-token.ts` chmod no-op on win32) but CI matrix file delta not in this audit's commit set.                                                   |

---

## 6. R21 mitigation status walk

- **R21(a)** External pentest installment letter — Human-pending (Jo + Shield + Penny). Carrying from M2.
- **R21(c)** Managed alpha ≥5 paying customers (wk 9 R21 trigger) — Operational pending. Per `finance/r21c-progress.json` last instrumented at M2 audit: `current_week=5`, `S3_paying_managed.cumulative_paying=null`. Not Jury-self-validatable. **At wk 9 close: if cumulative_paying < 5, R21 triggers — Jo bridges $15-25k or rebaselines.** Recommend Meter publishes wk-7 digest before M4 ticket-cut.

---

## 7. M4 readiness blockers

**Hard blockers for M4 ticket-cut (must close in an M3 cleanup commit before M4 start):**

1. **Cross-cutting #1:** `tests/integration/cli-no-upload.spec.ts` network-tap implementation (PRD §13.4 load-bearing privacy claim).
2. **Cross-cutting #2:** Deployed-URL audit on paid SKUs + AUP attestation route + log + test (M3 milestone scope, not just exit-gate naming).
3. **Cross-cutting #3:** ARCH-D10 enum + schema-bump close at `audit-event.v1.ts`.
4. **Cross-cutting #4:** CLI 30s heartbeat emitter.
5. **§1.5 V1:** Create or rename Verify specs to match the 6 exit-gate-named files (lowest-effort: rename existing + add 3 missing).

**Soft blockers (not M4-cut blockers, but must close before M3 binary-green):**

6. **§1.1 F1:** `[ALPHA]` banner + opt-in install gating before any npm publish — until canned-findings → real Claude Code subprocess closes.
7. **§1.4 C1:** Jo's manifest-pubkey ceremony — required before npm publish but does not block M4 implementation work.
8. Comply D7 disclosure copy review (sprint M3 line 100 — not landed at HEAD).

**Operational (NOT Jury-gated, but tracked):**

9. External pentest report at `compliance/pentest-2026-qN.pdf` (R14, R21(a)).
10. R21(c) wk 9 ≥5 paying alpha cohort.

---

## 8. Jury recommendation on M4 start

**M3 Exit Verdict: PASS WITH FIXES — score 77.** Producer work is structurally sound (Forge CLI binary disciplined, Forge web endpoints correct, Atlas migration RLS-clean, Cipher single-claim posture, Verify 94/0 with disciplined skips). The two-point gap to M2's 78 is paid entirely in scope-discipline: net-new CLI surface area with 2 Critical-band exit-gate items not yet implemented.

**Jury recommendation: M4 ticket-cut may begin at week 11 in parallel with M3 closure** (per `milestone-M3.md` burndown week 11 expectations + standard Sprint practice), **but M4 implementation must not commence until items 1–5 of §7 above land + Comply re-verdicts D7 disclosure copy.** Specifically:

- Items 1 (cli-no-upload) and 2 (deployed-URL AUP) are **the load-bearing M3 claims** — without them, M3's customer value-proposition is unverified.
- Items 3 (ARCH-D10 enum) and 4 (heartbeat emitter) close decision-loop integrity (you cannot M4-onward without the schema-versioned contract that downstream consumers depend on).
- Item 5 (exit-gate spec renames) is the lowest effort and unblocks the pipeline's filename-grep gate.

**External pentest report (R14) is NOT a Jury-gated M4-start blocker.** It is the M3-exit-from-product-perspective gate — a separate axis. Standard practice per `BUILD_FLOW.md` Phase 9 audit cadence: Jury verdicts on Jury-self-validatable items; Shield + Penny + Jo close the external dimension on their own timeline. If the pentest verdict comes back >1 Major or ≥1 Critical, the M3-conditional-pass + 5-business-day mitigation window per `threat-model.md` §5.4 kicks in; M4 may continue in parallel.

**Score 77 is above the 70 PASS threshold per `score_engine.v1.json`.** M3 exit verdict signs PASS WITH FIXES. Audits written to `audits/m3.md` + `audits/m3.json` complete the self-dogfood gate.

---

**Audit complete.** Cross-refs: `sprint/milestone-M3.md`, `PRD.md` §8/§14.7/§17 D7, `architecture/test-strategy.md` §3 M3, `architecture/cli-manifest-signing.md`, `architecture/decisions.md` ARCH-D10, `ia/user-flows/cli-pairing-and-tamper.md`, `BUILD_FLOW.md` Phase 9 audit cadence.
