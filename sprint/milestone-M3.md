# Milestone M3 — CLI mode + external pentest

**Target:** week 11 (placeholder per PRD §16)
**Lead:** Sprint
**Reports to:** BigBrain
**Audit gate:** Jury — must verdict PASS or PASS WITH FIXES before M4 starts. Self-dogfood gate M3. **External pentest is the gate** (≤1 Major, 0 Critical).

## Scope (one-line)

Ship CLI mode (local-folder audits, `Private Run · Self-Audited` watermark) and deployed-URL audits on paid SKUs, gated by a clean first external pentest.

## Entry prerequisites

- M0 + M1 + M2 exit gates green.
- External pentest vendor engaged at M0 close; scope agreed at M2 close (Risk R14).
- ARCH-D10 (`cli_heartbeat` event in AuditEvent enum) is M3 deadline — must be resolved this milestone.

## Deliverables per layer

### Strategy

- **Sprint:** weekly burndown updates; M4 ticket-cut scoping at week 10.
- **Penny:** monitor pentest engagement cost; budget per Risk R5 table.

### Audit (Jury + 6 reviewers)

- **Jury:** **Self-dogfood gate M3** — verdict in `audits/m3.json` = PASS or PASS WITH FIXES.
- **Halo:** WCAG conformance audit kickoff with vendor (engaged at M1 close per R15); pre-M4 dry run.

### Backend (Forge)

- **Forge — CLI binary (`studio-zero` npm package):** Node/TypeScript binary; `studio-zero login` pairs with web account via one-time code; receives audit/build jobs via websocket; runs runner locally; streams progress + results back.
- **Forge — Local-folder intake:** CLI reads local folders; nothing uploaded except structured findings. Network-tap test asserts zero file-content bytes POSTed.
- **Forge — Deployed-URL audit on paid SKUs:** URL-audit AUP attestation checkbox (PRD §14.7); attestation logged in `audit_logs` with timestamp + IP + user_id + verbatim attestation text. Absent → `4xx audit_url_authorization_required`.
- **Forge — Stripe idempotency tests live:** every charge endpoint accepts idempotency key; double-submit produces no duplicate `billing_events`.
- **Forge — CLI binary-hash registry + manifest:** Ed25519-signed manifest per Cipher Fix-3c. Public key bundled in CLI + pinned at `/cli/handshake`. Private key in Vault under release-engineering namespace.
- **Forge — HMAC-SHA256 verdict signing:** CLI signs `verdict_bytes` with `key=binary_hash`; server verifies. Mismatch → C-TAMPER red banner (transparency, not security claim).
- **Forge — CLI heartbeat (ARCH-D10):** schema v1 → v1.1 with `cli_heartbeat` variant; runner emits 30s heartbeat. Atlas owns schema; Forge implements.
- **Forge — CLI pairing hardening:** 5-min code TTL; single-use; rate-limited 5/min/user.

### Frontend (Vega)

- **Vega — CLI watermark on verdict screen (D7):** `Private Run · Self-Audited` badge below verdict line; `aria-describedby` help-text per Halo (SC 1.3.1, SC 3.2.4).
- **Vega — CLI pairing UX:** `/app/settings/cli` shows pairing-code generation; rate-limit kicks in at 5/min/user.
- **Vega — Deployed-URL intake on paid SKUs:** URL field + AUP attestation checkbox with mandatory text per PRD §14.7.

### Design (Canvas, Pixel)

- **Canvas:** watermark component identical render across CLI/web/PR-body/exported-PDF surfaces (SC 3.2.4).

### Data (Atlas)

- **Atlas — `0004_cli_pairing_hardening.sql` lands** (per migration-order.md M3 row): CLI pairing pg_trgm index on `cli_pairings.hostname`; pairing-code expiry constraints; replay-attempt counters; Vault key-rotation hooks for `oauth_tokens` (V1.5 prep).
- **Atlas — ARCH-D10 close:** add `cli_heartbeat` variant to `audit-event.v1.ts`; bump schema version v1 → v1.1; update fixtures.

### Security (Shield, Cipher, Verify)

- **Shield — External pentest report committed at `compliance/pentest-2026-qN.pdf`** with verdict ≤1 Major, 0 Critical, 0 Blocker. Pipeline asserts file existence + scrapes structured front-matter summary.
- **Shield + Verify — CLI tamper corpus M3:** `runner/fixtures/cli-tamper-corpus/` ≥10 patterns (hash unknown, signature mismatch, replay).
- **Cipher — Fix-3c close:** Ed25519 manifest signing primitive specced + implemented. Public key bundling in CLI + pinning at `/cli/handshake`.
- **Verify — Goal 4 CLI lane green:** `tests/acceptance/goal-4-three-modes.spec.ts` CLI lane — verdict produced; watermark present in rendered output (web verdict screen + PR body if applicable + Markdown export); identical watermark string across surfaces (SC 3.2.4).
- **Verify — CLI no-upload test:** `tests/integration/cli-no-upload.spec.ts` network-tap asserts zero file-content bytes POSTed during local-folder audit.
- **Verify — CLI pairing tests:** `tests/integration/cli-pairing.spec.ts` — (a) unpaired CLI rejected; (b) tampered pairing code rejected; (c) replay rejected.
- **Verify — CLI job tamper test:** `tests/security/cli-job-tamper.spec.ts` — synthetic job-payload tamper between dispatch and CLI execution rejected.
- **Verify — Deployed-URL AUP attestation test:** `tests/integration/aup-attestation-logged.spec.ts` — `audit_logs` row with timestamp + IP + user_id + verbatim attestation text; absent → `4xx`.
- **Verify — Stripe idempotency test:** `tests/integration/stripe-idempotency.spec.ts` — every charge endpoint accepts idempotency key; double-submit produces no duplicate `billing_events`.

### Quality (Probe, Crash, Ghost)

- **Probe:** `cli-pairing-and-tamper.md` flow Playwright spec (CLI integration mocked via spawn).
- **Probe — Windows CI:** nightly Windows runner for CLI-touching code only (R10 mitigation).
- **Crash:** chaos test for CLI offline mid-run (audit-run-state-machine.md EC-6 — uses `cli_heartbeat`).

### DevOps (Pipeline, Terra, Watch, Chronicle, Siren, Meter)

- **Pipeline:** OS matrix expansion — Windows + macOS CI runners for CLI-touching code (R10).
- **Pipeline:** CLI binary build + publish workflow (npm publish + GitHub Release with signed manifest).
- **Watch:** CLI heartbeat observability.

### Platform (Locale, Edge, Tongue)

- *(no incremental deliverable)*

### AI (Cortex, Memory, Oracle)

- **Cortex:** CLI mode uses customer's own Claude Code installation per PRD §8 — no Anthropic key on our side for CLI runs.

### Docs (Scribe, Guide)

- **Scribe:** `docs/cli-install.md`, `docs/cli-pair.md`, `docs/cli-troubleshooting.md`.
- **Guide:** CLI quickstart for technical-founder persona.

### Growth (Signal, Lens, Herald, Hook)

- **Herald — D7 watermark copy LIVE:** "Private Run · Self-Audited" + help-text "This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device." Locked per PRD §7.2 Step D.
- **Signal:** CLI launch thread on X / IndieHackers; emphasize privacy posture for technical-founder persona.

### Operations (Echo, Ledger, Comply)

- **Comply — D7 disclosure copy reviewed:** watermark is transparency, not security; no over-claim.
- **Comply — pentest scope coordination with Shield:** vendor selection per threat-model §5.3 criteria (Trail of Bits / Doyensec / NCC / Bishop Fox / Latacora).

## Exit gate (BINARY — automation-checkable)

Mirrors `architecture/test-strategy.md` §3 M3 exactly. M0 + M1 + M2 gates remain green; add:

- [ ] `tests/integration/cli-pairing.spec.ts` green — unpaired CLI rejected; tampered pairing code rejected; replay rejected.
- [ ] `tests/integration/cli-no-upload.spec.ts` green — network-tap on CLI process during local-folder audit; zero file-content bytes POSTed; only structured findings cross the wire.
- [ ] `tests/acceptance/goal-4-three-modes.spec.ts` CLI lane green — verdict produced; watermark `Private Run · Self-Audited` present in rendered output (web verdict screen + PR body + Markdown export). Snapshot asserts identical watermark string across surfaces (SC 3.2.4).
- [ ] `tests/security/cli-job-tamper.spec.ts` green — synthetic job-payload tamper rejected.
- [ ] **Deployed-URL audit on paid SKUs** — URL-audit authorization attestation logged (§14.7); `tests/integration/aup-attestation-logged.spec.ts` green; AUP absent → `4xx audit_url_authorization_required`.
- [ ] **External pentest report committed** at `compliance/pentest-2026-qN.pdf`; verdict: **≤1 Major, 0 Critical, 0 Blocker**. Pipeline asserts file existence + scrapes structured front-matter summary.
- [ ] `tests/integration/stripe-idempotency.spec.ts` green — every charge endpoint accepts idempotency key; double-submit produces no duplicate `billing_events`.
- [ ] **Self-dogfood gate M3:** `audits/m3.json` = PASS or PASS WITH FIXES.
- [ ] `0004_cli_pairing_hardening.sql` applies cleanly to staging.
- [ ] **ARCH-D10 closed:** `cli_heartbeat` variant in `audit-event.v1.ts`; schema bumped v1 → v1.1.
- [ ] **Cipher Fix-3c closed:** Ed25519 manifest signing in production; public key bundled in CLI + pinned at `/cli/handshake`.

## Risks specific to this milestone

| # | Risk | Likelihood | Impact | Mitigation owner | Deadline |
|---|---|---|---|---|---|
| R6 | CLI mode runner produces fraudulent verdict | Medium | Medium | Herald (watermark copy) + Halo (a11y) + Shield (registry) | M3 close — watermark on every CLI verdict surface (D7) |
| R14 | External pentest vendor lead-time | High | High | Shield + Penny (engaged at M0; scope locked at M2) | **M3 exit** — report committed |
| R8 | Self-dogfood gate FAIL | High | Medium | Sprint + Jury (gate halts milestone) | M3 close |
| **NEW M3** | **External pentest finds ≥1 Critical or ≥2 Major** | Medium | Critical | Shield + Forge on-call (24h to mitigation, 5 business days to permanent fix per threat-model §5.4) | M3 conditional pass — re-test by same vendor required before M3 closes |
| **NEW M3** | **CLI binary distribution / supply-chain attack** (npm publish hijack) | Low | Critical | Cipher (Ed25519 manifest signing) + Pipeline (npm 2FA + provenance attestation) | M3 — manifest signing live; npm provenance enabled |

## Decisions that MUST land before milestone exit

From `owner-matrix.md` §3 M3 row:

- **D7** CLI watermark `Private Run · Self-Audited` — Herald + Halo. Watermark in every CLI verdict surface.
- **ARCH-D10** `cli_heartbeat` event in AuditEvent enum — Atlas. Schema bump.
- **Cipher Fix-3c** Ed25519 CLI manifest signing — Cipher + Forge.
- **External pentest report committed** — Shield. Conditional pass if mitigation deployable in 5 business days.

## Burndown (weekly)

| Week | Planned | Completed | Blocked | Notes |
|---|---|---|---|---|
| 10 | CLI binary first build; pairing flow; `0004_cli_pairing_hardening.sql` drafted; pentest engagement kickoff | | | |
| 11 | All CLI tests green; pentest report received; remediation if any Critical/≥2 Major; self-dogfood gate M3 | | | |

## Open questions

For BigBrain to resolve before M3 closes:

- (none mandatory) — D5 Auto-PR pricing is V1.5 spec-kickoff decision.

## Cross-references

- PRD §16 M3 row + §8 execution modes + §14.7 AUP + §17 D7.
- `architecture/test-strategy.md` §3 M3 gates.
- `architecture/decisions.md` ARCH-D10 (closes here).
- `architecture/database/migration-order.md` `0004_cli_pairing_hardening.sql` row.
- `architecture/threat-model.md` §3.6 CLI tamper + §5 pentest scope.
- `ia/user-flows/cli-pairing-and-tamper.md` (becomes real at M3).
- `ia/user-flows/audit-run-state-machine.md` EC-6 (CLI offline mid-run) lands here.
- `shared_context/projects/studio-zero-productization/phase5-audit-cipher.md` Fix-3c.
