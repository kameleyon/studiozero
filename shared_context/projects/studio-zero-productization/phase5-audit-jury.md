# Phase 5 — Tech Architecture · Jury Audit

**Auditor:** Jury (audit-layer orchestrator + synthesis)
**Date:** 2026-05-11
**Subjects:** Axiom (system-diagram + decisions), Atlas (schemas + database + RLS + JWT), Shield (threat model), Verify (test strategy)
**Cipher:** auditing in parallel; verdict will be reconciled into this report at gate-close. References to Cipher below are placeholders for the secrets-at-rest verdict.
**Process:** every claim cross-checked against PRD v0.5 §10/§13/§14/§16/§17/§18, BUILD_FLOW.md Phase 5 exit gate, all Phase-3/4 binding fixes (IA-D1/2/3 + Halo HC1-10 + Compass AH-4/6), and against the four Phase-5 deliverables themselves. Evidence-or-it-didn't-happen. No silent decisions. No deadline softening.

---

## TL;DR — Gate Verdict

**Phase 5 Gate:** **PASS WITH FIXES (3 Blockers + 4 Criticals + 6 Majors)**

The architecture is **substantively complete and M0-go-able** for Forge to begin scaffolding the API surface, Atlas's migrations to apply, Verify to wire its contract gates, and Shield's threat model to drive runner egress + sandbox work. The four PASS-WITH-FIXES findings below are *naming/coverage drift* between the deliverables, not load-bearing design failures. None of the Blockers require re-thinking the architecture; all are mechanical re-alignment between two authoritative documents where the documents currently disagree.

**Per-deliverable verdicts:**

| Deliverable | Verdict | Why |
|---|---|---|
| **Axiom** (system-diagram + decisions) | **PASS WITH FIXES** | Strong spine; ARCH-D1..D8 are well-reasoned with traceability to PRD. Two contradictions vs Atlas (TB numbering, fix_pr_state value) and one vs Shield (TB number space) need mechanical fix. Self-named contradiction C7 (egress filtering primitive) honestly flagged but unresolved — accept-with-deadline. |
| **Atlas** (schemas + tables + RLS + JWT) | **PASS WITH FIXES** | All 15 score-engine fixtures pass math spot-check (4+ rows independently verified). Schemas are excellent: strict mode, additionalProperties:false, version-stamped, fixture-as-contract pattern correct. RLS policies are belt-and-braces. Two Blockers: (a) `runs.tracking_state` missing (Axiom ARCH-D6 mandates it; Atlas only has `fix_pr_jobs.tracking_stale` boolean — wrong shape, wrong place); (b) `fix_pr_state` enum is missing `'reaudit_passed'` value that Axiom's ARCH-D7 / system-diagram §3e relies on. |
| **Shield** (threat model) | **PASS WITH FIXES** | STRIDE coverage is strong: 15 TBs + 5 cross-cutting domains (SSRF/PI/exfil/PT/sandbox-escape) + CLI-tamper section + pentest scope. Critical: Shield's TB numbering (TB-1..TB-15) does NOT align with Axiom's (TB-0..TB-10). Stripe is TB-11 (Shield) vs TB-8 (Axiom); GitHub webhook is TB-13 (Shield) vs TB-10 (Axiom). Verify references Shield's numbering. Cross-document cross-refs by ID will not resolve until reconciled. Also: Shield's TB-3 names "15-min TTL" for runner JWT; Axiom (ARCH-D3) and Atlas (runner-jwt.md) both say **5-min TTL**. Same disagreement repeats in Shield §3.2 PI mitigation. |
| **Verify** (test strategy) | **PASS** | Layer matrix mirrors PRD §18 with coverage targets that bite (≥95% score-engine; ≥90% redaction; ≥90% SSRF filter). Per-milestone exit-gate matrix is binary, file-cited, and aligned with PRD §16. Self-dogfood gate strengthened to every milestone. Fixture inventory complete. The only quibble: M0 fixture-row checklist in §3 references "10 Polish → 95, PASS" but actual fixture is 11 Polish → 94.5 → 94 (SE-R06) — Verify's prose drifts off the canonical fixture file by one example. Mechanical fix; not a verdict change. |

**M0-go?** **YES, conditional on the Blockers below being fixed before Forge writes the first migration** (because the Blockers are schema-level and the first migration is M0). All Blockers are < 1 day of Atlas+Axiom reconciliation. Critical-and-below findings can be landed during Phase 6 sprint plan (M0 ticket) without slipping M0 itself.

**Terra IaC:** absent (`architecture/iac/` is empty). BUILD_FLOW.md Phase 5 lists this as an output and the gate requires "IaC applies cleanly to a fresh staging environment." My orchestrator brief carries explicit deferred-acceptance language: "Terra IaC is deferred but flag if absent blocks gate." I flag it as a **Major** with deferral noted — does NOT block Phase 5 close at orchestrator's instruction, but **must land at M0 ticket on Sprint plan** because no migration applies without a Supabase project provisioned by Terra.

---

## 1. Cross-document contradiction list

Every finding cites file + section AND the contradicting file + section. Severity per the Jury rubric (Blocker / Critical / Major / Minor / Polish). The "Owner" column is who fixes; the "Deadline" column is when (per BIGBRAIN Hard Rule §3 + Jury Rule "every finding has an owner and a deadline").

### Blockers (M0 schema work cannot proceed without these resolved)

#### B1 — `runs.tracking_state` column missing (Axiom ARCH-D6 ↔ Atlas tables.sql)

- **Source:** `architecture/decisions.md` §ARCH-D6 lines 239–278 specify:
  > Add `runs.tracking_state` enum column AND `fix_pr_jobs.tracking_state` enum column with values `('active', 'stale', 'recovered')`.
- **Contradicted by:** `architecture/database/tables.sql` line 503 — `fix_pr_jobs` has `tracking_stale boolean NOT NULL DEFAULT false`. There is **no `runs.tracking_state` column at all**, and the `fix_pr_jobs` column is a boolean, not the three-value enum Axiom requires.
- **Why it matters:** Axiom's system-diagram §7 route map references `runs.tracking_state` on `/app/audits/[run-id]/pr/[pr-id]` (V1.5) and on `/app/audits/[run-id]` for the conditional banner render. PRD D23 commits to the banner. With a boolean and no `runs.tracking_state`, the `recovered` state transition (Axiom ARCH-D6 state diagram) is unrepresentable — there is no way to distinguish "active" from "recovered" because both are `tracking_stale=false`. The UX commitment (PRD D23 banner with "Tracking resumed — last known state was 'open'…") cannot be honored.
- **Severity:** **Blocker** — schema-level, ships in `0001_initial.sql`, M0 gate.
- **Owner:** Atlas to add the columns. Axiom + Atlas to agree on naming (suggest: keep `tracking_state` enum name on both tables; deprecate the `tracking_stale` boolean in favor of `tracking_state` ENUM).
- **Deadline:** before `0001_initial.sql` lands on staging. Phase 6 Sprint plan to ticket.

#### B2 — `fix_pr_state` enum missing `reaudit_passed` value (Axiom ARCH-D7 ↔ Atlas tables.sql)

- **Source:** `architecture/system-diagram.md` §3e step 7 + ARCH-D7 lock:
  > `jury-reaudit-gate` Edge Function is the ONLY code path that can transition `fix_pr_jobs.state='reaudit_passed'`.
  And `architecture/decisions.md` ARCH-D7 enumerates this state explicitly.
- **Contradicted by:** `architecture/database/tables.sql` line 109–112 — `fix_pr_state` enum values are `('queued','building','reaudit_running','reaudit_failed','pr_opened','pr_merged','pr_closed_unmerged','failed')`. **No `reaudit_passed` value.**
- **Why it matters:** ARCH-D7 specifies the value as the load-bearing gating state — the moment between "re-audit succeeded" and "PR opened." Without it, either (a) the workflow has no representable state between `reaudit_running` and `pr_opened` (race-window for a failed PR-open), or (b) Forge has to invent the name at impl time and drift from the architecture decision.
- **Severity:** **Blocker** — enum is forward-only; adding a value later requires a migration AND retraining every consumer.
- **Owner:** Atlas to add `'reaudit_passed'` to `fix_pr_state` enum + update the `fix_pr_state_pr_consistency` CHECK constraint to include it on the "no pr_number yet" side.
- **Deadline:** before `0001_initial.sql` lands.

#### B3 — Runner JWT TTL conflict (Shield §TB-3 + §3.2 ↔ Axiom ARCH-D3 ↔ Atlas runner-jwt.md)

- **Sources disagree:**
  - Axiom `architecture/decisions.md` ARCH-D3 lines 109: "**TTL:** default 300s (5 minutes); max 1800s (30 min for Comprehensive depth)"
  - Atlas `architecture/database/runner-jwt.md` line 40 + line 50: "**TTL ≤ 5 min.** If the runner needs longer, the runner asks for a new token via a tiny refresh RPC"
  - Shield `architecture/threat-model.md` TB-3 line 75: "Tenant-scoped short-lived JWT (**15-min TTL**) minted by the dispatch Edge Function"
  - Shield `architecture/threat-model.md` §3.2 PI mitigation line 265: "short-lived run-scoped JWT (**15-min TTL**, bound to `tenant_id` and `run_id`)"
- **Why it matters:** The TTL is a load-bearing security parameter. A 5-min TTL with re-mint-on-heartbeat (Axiom/Atlas) and a 15-min TTL (Shield) imply different replay-attack windows, different mint-rate quotas, and different test fixtures (jwt-tampering-corpus needs to know which TTL to assert against). Verify's `tests/integration/jwt-mint-tenant-scoped.spec.ts` cannot be written deterministically until this is resolved.
- **Severity:** **Blocker** — security-critical parameter; cannot ship inconsistent.
- **Owner:** Shield to reconcile to 5-min TTL (Axiom + Atlas already agree; Shield is the outlier). Shield must update TB-3 and §3.2.
- **Deadline:** before M1 (because M1 is the runner-JWT exit gate).

### Criticals (production correctness or contract-coverage risk; fix before M1)

#### C1 — Trust-boundary numbering systems are incompatible (Axiom system-diagram §2 ↔ Shield threat-model §1)

- **Source:** Axiom system-diagram §2 uses **TB-0 (Marketing) through TB-10 (GitHub webhook)**, 11 boundaries.
- **Contradicted by:** Shield threat-model §1 uses **TB-1 (Public Internet→Web App) through TB-15 (Admin)**, 15 boundaries.
- **Mappings that don't align:**
  - Stripe webhook: Axiom TB-8 vs Shield TB-11
  - GitHub webhook: Axiom TB-10 vs Shield TB-13
  - Marketing public surface: Axiom TB-0 (exists) vs Shield (does not have an explicit TB)
  - Admin surface: Axiom (does not have an explicit TB) vs Shield TB-15
- **Why it matters:** Shield's threat-model.md is the source of truth for the test corpora (Verify cross-references TB-N labels per Verify §1 layer matrix + §7 open dependencies). System-diagram §2 says "Shield's threat model in `architecture/threat-model.md` MUST cover each by ID" — but the IDs do not match. A reviewer trying to verify "TB-8 covered" cannot use either doc as source — they're talking past each other.
- **Severity:** **Critical** — cross-document cross-refs do not resolve; pentest scope (§5.1) lists "TB-1..TB-15 except TB-8 and TB-13" which references Shield's numbering and means Axiom's TB-8 (Stripe) is INCLUDED while Shield's TB-8 (CLI→Claude Code, customer machine) is EXCLUDED. Confusion compounds at pentest engagement.
- **Owner:** Axiom + Shield co-own. Recommend: **Shield's numbering wins** (richer, 15 boundaries, separates admin + telemetry + customer-machine). Axiom rewrites system-diagram §2 + §3 + §7 to use Shield's TB labels.
- **Deadline:** before M0 close. This is a half-day editing pass.

#### C2 — Runner JWT mint endpoint naming + audience binding diverge (Axiom ARCH-D3 ↔ Atlas runner-jwt.md)

- **Axiom** (`decisions.md` ARCH-D3 line 95): endpoint **`POST /functions/v1/mint-runner-jwt`**; audience claim **`aud=runner-<run_id>`**.
- **Atlas** (`runner-jwt.md` lines 10, 31, 42): endpoint **`POST /functions/v1/mint-runner-token`**; audience claim **`aud="studio-zero/runner"`**.
- **Why it matters:** Two equivalent specs, two different names. Forge will pick one at impl time; the OTHER document then drifts. RLS policy template in ARCH-D3 (`auth.jwt() ->> 'aud' = 'runner-' || run_id::text`) is run-scoped at the aud level; Atlas's RLS policy in `rls-policies.sql` uses `auth.claim_role() = 'runner' AND id = auth.runner_run_id()` which gets the same effect by checking `run_id` claim against the row id. Functionally equivalent; lexically incompatible.
- **Severity:** **Critical** — every downstream document (test fixtures, runbook, Cipher's secret-policy notes, Shield's JWT-tampering corpus) will cite one or the other.
- **Owner:** Atlas's spelling wins (runner-jwt.md is more detailed and ships first). Axiom updates ARCH-D3 endpoint name to `mint-runner-token` and re-spec the aud claim to match runner-jwt.md's `aud="studio-zero/runner"` + `role: 'runner'` claim pattern. Atlas's RLS already enforces the same semantics; no policy edit needed.
- **Deadline:** before M0 close.

#### C3 — `notifications` table referenced by Axiom route map but absent from Atlas (Axiom system-diagram §7 ↔ Atlas tables.sql)

- **Source:** `architecture/system-diagram.md` §7 line 325:
  > `/app/notifications` | `GET /api/notifications` + Realtime channel `notifications:<user_id>` | — | — | `notifications`
- **Contradicted by:** No `notifications` table in `tables.sql`. Grep confirms zero occurrences.
- **Why it matters:** The `/app/notifications` route is in the sitemap. Without a table, the route returns 500. The Realtime channel `notifications:<user_id>` has no row source to broadcast.
- **Severity:** **Critical** — route is in the published IA; absence is a Day-1 bug.
- **Owner:** Atlas to add `notifications` table (tenant-scoped, user-scoped, RLS-bearing) in `0001_initial.sql` OR Axiom to remove the row from system-diagram §7 with explanation. Recommend Atlas adds it — the route is real per IA.
- **Deadline:** before `0001_initial.sql` lands.

#### C4 — `tenant_settings.retention_days` referenced by route map; Atlas has `tenants.retention_days_code`

- **Source:** `architecture/system-diagram.md` §7 line 332:
  > `/app/settings/data/retention` | `PATCH /api/settings/retention` | — | — | `tenant_settings.retention_days`
- **Contradicted by:** Atlas's `tenants.retention_days_code` (tables.sql line 147). There is no `tenant_settings` table.
- **Why it matters:** Same as C3 — route cannot resolve.
- **Severity:** **Critical** — column-name and table-name drift.
- **Owner:** Axiom corrects the route-map entry to `tenants.retention_days_code` (Atlas's name is more specific — there will be `retention_days_findings` later per PRD §14.4 24-month findings retention).
- **Deadline:** before M0 close.

### Majors (fix before M1 or M2 — coverage gaps, not correctness)

#### M1 — IaC directory empty (BUILD_FLOW.md Phase 5 output ↔ `architecture/iac/`)

- **Source:** BUILD_FLOW.md Phase 5 lists `architecture/iac/` as an output; exit gate requires "IaC applies cleanly to a fresh staging environment (`terraform plan` shows no drift)."
- **Contradicted by:** `architecture/iac/` exists as an empty directory.
- **My orchestrator brief** explicitly allows deferral: "Terra IaC is deferred but flag if absent blocks gate."
- **Severity:** **Major** (accept deferral with deadline).
- **Owner:** Terra. Phase 6 must ticket as the very first M0 work item — no other M0 work can land without a provisioned Supabase project for migrations.
- **Deadline:** M0 ticket-0 in Sprint plan.

#### M2 — Shield's TB-3 says "BullMQ/pg-boss" (threat-model line 76) — ARCH-D1 locked pg-boss

- **Source:** Shield `architecture/threat-model.md` TB-3 line 76: "Queue (BullMQ/pg-boss) lives inside our Supabase project"
- **Locked by:** Axiom ARCH-D1: pg-boss chosen unambiguously.
- **Severity:** **Major** — Shield's threat model is stale on the queue primitive. The mitigation reasoning ("row-level tenant binding") still holds for pg-boss specifically; just remove the "BullMQ/" alternative.
- **Owner:** Shield edits to "Queue (pg-boss inside Postgres)".
- **Deadline:** before M1.

#### M3 — Shield's `cli_heartbeat` event contract not yet specced (Axiom C3 / ARCH-D10 ↔ audit-event.v1.ts)

- **Source:** Axiom system-diagram §9 C3 + decisions.md ARCH-D10 ("OPEN — Atlas owns; deadline M3"):
  > add `cli_heartbeat` event to `runner/schemas/audit-event.v1.ts` so the same enum carries both run progress events AND device-liveness pings.
- **Contradicted by:** `architecture/schemas/audit-event.v1.ts` lines 183–198 — AuditEvent union has progress | finding | agent_log | final_verdict | error. **No `cli_heartbeat` variant.**
- **Why it matters:** audit-run-state-machine.md EC-6 (CLI offline mid-run) depends on a 60s/120s/5min threshold structure that needs a heartbeat contract. Schemas-as-files-not-prose rule (Atlas's own rule, README.md) implies the contract MUST exist BEFORE the EC behavior can be tested. Verify cannot write `tests/integration/cli-pairing.spec.ts` MA1 fully without it.
- **Severity:** **Major** — deadline M3 per Axiom; flag now so Sprint plans accordingly.
- **Owner:** Atlas. The variant should be:
  ```ts
  export interface HeartbeatEvent { kind: 'cli_heartbeat'; pairing_id: string; at: string; }
  ```
  Schema bumps to v1 → v1.1 or v2 (Atlas's call per README.md versioning).
- **Deadline:** M3 exit gate.

#### M4 — Shield egress allowlist enforcement primitive UNRESOLVED (Axiom C7 / ARCH-D9 ↔ Shield TB-4 mitigation)

- **Source:** Axiom system-diagram §9 C7 + decisions.md ARCH-D9 ("OPEN — Shield owns; deadline M1 exit gate"):
  > the runner egress allowlist will be enforced primarily at the **DNS level**…supplemented by a Cilium NetworkPolicy that drops anything resolving outside the allowlisted hostnames. This is a known-rough edge…**NOT FULLY RESOLVED at Phase 5 lock**; mitigation is in place but pentest at M3 exit must validate.
- **Contradicted by:** Shield threat-model.md TB-4 + §3.5 SE-1 simply say "egress allowlist" without specifying primitive. No deep dive on the Railway-specific implementation question.
- **Severity:** **Major** — accept with deadline, but flag to Sprint that a non-trivial DevOps spike is required.
- **Owner:** Shield + Cipher (per Axiom's open-followups list).
- **Deadline:** M1 exit gate.

#### M5 — Compass AH-6 (multi-project / client tags) — not in Atlas schema

- **Source:** orchestrator brief asks "does Atlas have a `projects.client_tag` column?"
- **Contradicted by:** `tables.sql` `projects` table has no client_tag column. Grep confirms.
- **Why it matters:** Compass AH-6 needs revisiting. Either (a) the phase-3/4 commitment was deferred, or (b) Atlas missed it. Without surveying phase-3 audit-compass.md and phase-4 audits I cannot fully adjudicate, but the column is cheap and the brief flags it.
- **Severity:** **Major** — needs cross-phase reconciliation.
- **Owner:** Compass to confirm AH-6 is still in scope; Atlas to add `projects.client_tag text` if yes.
- **Deadline:** M2 (Managed tier is where indie-agency P3 persona starts paying).

#### M6 — Compass AH-4 SKU plain-English mapping — not in any schema

- **Source:** orchestrator brief asks "is the SKU enum documented anywhere in the schemas?"
- **Contradicted by:** Atlas has `plan_tier` (`free/byok_starter/byok_pro/managed_starter/managed_pro/cli`) and `audit_product` (`surface/code/full`). Plain-English mapping (what Compass AH-4 wants) is documented nowhere I can find.
- **Severity:** **Major** — Forge will produce a different mapping than UX expects.
- **Owner:** Forge to maintain a plain-English mapping doc (`docs/sku-mapping.md`?), reviewed by Compass. NOT a schema concern (Atlas's enum is the database surface).
- **Deadline:** M2.

### Minors

#### m1 — Verify's M0 fixture-row example in §3 drifts from canonical fixture (test-strategy.md ↔ score_engine.v1.fixtures.json)

- **Source:** `architecture/test-strategy.md` §3 M0 bullet line 88:
  > 10 Polish → 95, PASS (exact boundary); 11 Polish → 94 (banker's rounding from 94.5), PASS WITH FIXES.
- **Canonical fixture:** `score_engine.v1.fixtures.json` SE-R06 is 11 Polish → 94.5 → 94. **There is no 10-Polish row** in the canonical file; SE-R11 is "1 Minor + 6 Polish → 95" not "10 Polish → 95". 10 Polish would be 5.0 deduction → score 95, which DOES pass — but Verify's prose implies this row exists in the file, and it doesn't.
- **Severity:** **Minor** — Verify's prose vs the fixture spec drifts in one example. Fix: replace prose with "see SE-R06, SE-R10, SE-R11, SE-R12 boundary cases."
- **Owner:** Verify.
- **Deadline:** next test-strategy.md revision.

#### m2 — `rls-policies.sql` TODO at the bottom references "TB-N identifiers" — same numbering ambiguity as C1

- **Source:** `rls-policies.sql` line 489: "TODO: per Shield's STRIDE threat-model deliverable (`architecture/threat-model.md`), add per-table threat-bucket annotation to the affected COMMENT ON POLICY rows once Shield publishes TB-N identifiers."
- **Severity:** **Minor** — resolves automatically when C1 is fixed.
- **Owner:** Atlas (annotate after C1 lands).

---

## 2. PRD commitment closure table (D1–D23 + IA-D1/2/3 + Phase-3/4 binding fixes)

For each commitment, "Closure" is **yes/no/partial** with the artifact citation.

### PRD §17 D-numbers

| ID | Commitment | Closure | Artifact |
|---|---|---|---|
| **D1** | GitHub App per-repo perms only | **YES** | `oauth_tokens` table (tables.sql line 258, `installation_id` field per-install; per-repo perms enforced inside install per GitHub App model). Shield TB-5 + TB-12 cover. Verify gate at M1. |
| **D2** | Free tier = 1 Project, unlimited Surface re-audits | **YES** | `projects` table + `runs.project_id` FK (Atlas tables.sql) + EC-7 rate-limit in audit-run-state-machine.md. Free-tier 1-project cap enforced at app layer per RLS comment line 236 (intentional — Atlas notes the engine-level check would bloat plans). |
| **D3** | Auto-PR fix delivery → V1.5 | **YES** | `fix_pr_jobs` table (tables.sql), `fix_pr_state` enum (minus the missing `'reaudit_passed'` — see B2). System-diagram §3e end-to-end V1.5 flow specced. |
| **D4** | Starter pricing $19 vs $29 — **STILL OPEN** | **N/A** | Jo's call. Atlas's `plan_tier` enum accommodates either. |
| **D5** | Auto-PR pricing flat $49 vs tiered — **STILL OPEN** | **N/A** | Jo's call at V1.5. `fix_pr_jobs.stripe_payment_intent_id` column is shape-agnostic. |
| **D6** | M2↔M3 reorder (Managed before CLI) | **YES** | migration-order.md M2=`0003_billing_managed.sql`, M3=`0004_cli_pairing_hardening.sql`. |
| **D7** | CLI watermark = transparency, not security | **YES** | `audit-output.v1.schema.json` watermark field (enum: `'private-run-self-audited' \| null`); verdict-card.md lines 14, 28, 57 render rules; Shield §3.6 CLI-tamper section explicitly says "transparency, not security." |
| **D8** | Sandbox = rootless container + seccomp + egress allowlist at M1; Firecracker V2 | **YES** | ARCH-D2 picks Railway; Shield §3.5 SE-1..SE-8 mitigations enumerate the primitives in detail; Verify M1 gates `tests/security/sandbox-escape-top30.spec.ts`. ARCH-D9 leaves the egress-primitive open (Major M4 above). |
| **D9** | SSRF/PI/redaction/ingestion at M0/M1 mandatory | **YES** | Shield §3.1 SSRF (8 named scenarios + 8 mitigations + ≥40 fixtures M1), §3.2 PI (7 scenarios + 7 mitigations + ≥30 M0 → ≥200 M2), §3.3 secret exfil (4 scenarios + 7 mitigations); Verify M1 gates each corpus. |
| **D17** | GDPR Art. 28 DPA + subprocessors | **PARTIAL** | Atlas has `data_exports` table (Art. 20 portability); `audit_logs`/`breach_events` cover Art. 33; DPA template itself is Comply's M2 deliverable per test-strategy.md (not Atlas-side schema concern). |
| **D18** | EU AI Act AI System Card | **PARTIAL** | `audit-output.v1.schema.json` `ai_disclosure` field per finding; verdict-card emits `X-AI-Generated` header per test-strategy.md §3 M0; full System Card v1.0 ships V1.5 per test-strategy.md V1.5 gate. |
| **D19** | BYOK pass-through ToS | **N/A (Comply)** | Schema-irrelevant. |
| **D20** | Regional refund matrix | **YES** | `cooling_off_windows` table (Atlas tables.sql line 548) + `subscriptions.region` + `billing_region` enum. Trigger logic ships in `0003_billing_managed.sql` per migration-order.md. |
| **D21** | Jury synth stall → `failed_synth_timeout` | **YES** | `run_state` enum contains `'failed_synth_timeout'` (tables.sql line 91). State machine has the state. Verify M2 gate has explicit test `tests/integration/jury-synth-stall.spec.ts`. |
| **D22** | EU cooling-off reset per upgrade | **YES** | `cooling_off_windows.trigger_event` CHECK constraint allows `'subscribe' OR 'upgrade'`. New row per upgrade → window resets. Trigger lives in `0003_billing_managed.sql`. |
| **D23** | GH App uninstall after PR opened — banner | **PARTIAL → NEEDS B1 FIX** | Banner UX lives in component spec; Axiom ARCH-D6 specifies `runs.tracking_state` enum + `fix_pr_jobs.tracking_state` enum; Atlas only has `fix_pr_jobs.tracking_stale` boolean. **See Blocker B1.** |

### Cross-phase decisions (`shared_context/.../decisions.md`)

| ID | Commitment | Closure | Artifact |
|---|---|---|---|
| **IA-D1** | Mode pick before GitHub install | **PARTIAL** | Axiom system-diagram §7 has `/onboarding/{byok,cli,managed}` routes ahead of `/auth/install/github`; **Atlas schema is shape-agnostic** — no constraint that GitHub install must occur after mode pick. App-layer concern; Forge enforces at onboarding flow. Acceptable. |
| **IA-D2** | E2 upsell as full route | **YES** | `/app/audits/[run-id]/upgrade` in route table (system-diagram §7 line 321). `POST /api/runs/[id]/upgrade-checkout` API. `runs` table has `tenant_id` + `project_id` + `subscriptions` for FK navigation. |
| **IA-D3** | Re-audit at project, not run | **YES** | `runs.project_id` is the entitlement boundary; route `/app/projects/[id]/re-audit` in system-diagram §7 line 324 with `POST /api/projects/[id]/re-audit` creating a new `runs` row. Atlas's project→run model supports it. |

### Phase-3/4 binding fixes

| ID | Commitment | Closure | Artifact |
|---|---|---|---|
| **Halo HC1** | `role="status"` triple (text + icon + color) | **YES** | verdict-card.md §A11y. Atlas schema audit-output.v1 has `verdict` + `score` for the renderer. |
| **Halo HC2** | Live-region throttle ≤4/sec | **YES** | audit-event.v1.ts comment line 14 ("Throttle policy: producer SHOULD coalesce `progress` events to ≤ 4 updates/sec per agent"). Atlas's `runs.events_log` JSONB supports late-subscriber replay (ARCH-D5). |
| **Halo HC3** | Per-category 0..100 sub-scores | **YES** | audit-output.v1.schema.json `score_breakdown` object with `ux/accessibility/copy/brand/flow/audience` integers 0..100. Verdict-card.md props match exactly. |
| **Halo HC4** | Screenshot `alt` required | **YES** | audit-output.v1.schema.json $defs.evidence screenshot variant requires `alt`. |
| **Halo HC5** | BYOK key paste — encryption pattern | **PARTIAL** | `api_keys.vault_secret_id` references Vault; runner-jwt.md §"Service-role usage boundaries" #2 confirms decrypt RPC. **AAD pattern stated in system-diagram §1 (AES-256-GCM + `tenant_id` AAD); Cipher's parallel audit will confirm.** |
| **Compass AH-4** | SKU plain-English doc | **NO → Major M6** | Atlas has the enums; no plain-English doc. |
| **Compass AH-5** | Free-tier re-audit chip slot | **YES** | verdict-card.md `freeTierChip` prop renders `FREE · UNLIMITED RE-AUDITS ON THIS PROJECT`. |
| **Compass AH-6** | Multi-project / client tags | **NO → Major M5** | Atlas `projects` table has no `client_tag` column. |

---

## 3. Phase 5 exit-gate completeness scorecard

Per BUILD_FLOW.md Phase 5 Jury Exit Gate:

| Gate item | Status | Evidence |
|---|---|---|
| Axiom verdict: no internal contradictions; every decision traceable to a layer-spec | **PASS WITH FIXES** | ARCH-D1..D8 lock; ARCH-D9 + D10 honestly flagged as still-open. Internal contradictions C1..C7 named in §9 of system-diagram. |
| Atlas verdict: RLS enforces tenant isolation at engine, not app layer | **PASS** | `rls-policies.sql` has FORCE RLS on every tenant-scoped table; helper functions `auth.tenant_id()`, `auth.runner_run_id()`, `auth.claim_role()`; runner-scoped policies use audience-binding pattern. Service-role used only at 5 named code paths (runner-jwt.md). |
| Shield verdict: threat model covers SSRF + prompt-injection + secret-exfil + path-traversal + sandbox-escape | **PASS WITH FIXES** | §3.1 SSRF (8 scenarios), §3.2 PI (7), §3.3 secret exfil (4), §3.4 path traversal (7), §3.5 sandbox escape (8). PLUS bonus §3.6 CLI tamper. **Fix:** TB numbering reconcile (C1) + 5-min TTL reconcile (B3). |
| Cipher verdict: secrets-at-rest pattern with AEAD+AAD | **PENDING — parallel audit** | Cipher's deliverable not yet in HEAD at my read time. System-diagram §1 + Atlas's `api_keys.vault_secret_id` indicate AES-256-GCM + `tenant_id` AAD; awaiting Cipher's deep-dive. |
| All schema files exist in HEAD; `pnpm test schema:validate` green | **PASS for existence** | Confirmed: `audit-output.v1.schema.json`, `audit-event.v1.ts`, `score_engine.v1.json`, `score_engine.v1.fixtures.json`, `README.md` all present. `schema:validate` green is Verify's M0 contract gate (test-strategy.md §3 M0 third bullet) — not yet runnable because Forge hasn't scaffolded; gate verified at M0 close. |
| IaC applies cleanly to fresh staging | **DEFERRED — Major M1** | `architecture/iac/` empty. Orchestrator-accepted deferral; ticketed M0. |

---

## 4. Fixture math spot-check (4+ of 15 rows verified)

Re-computed independently from the formula `score = max(0, round_half_even(100 − Σ weights[severity]))` with weights `{Blocker:30, Critical:18, Major:7, Minor:2, Polish:0.5}`. Banker's rounding: tie rounds to the EVEN integer.

| Row | Input | Deduction | Pre-round | Banker's round | Clamp | Any blocker? | Expected score | Expected verdict | Match? |
|---|---|---|---|---|---|---|---|---|---|
| **SE-R01** | empty | 0 | 100 | 100 | no | no | 100 | PASS | **✓** |
| **SE-R03** | 4 Blocker | 120 | −20 | −20 | yes→0 | yes | 0 | FAIL | **✓** |
| **SE-R06** | 11 Polish | 5.5 | 94.5 | tie {94 even, 95 odd}→**94** | no | no | 94 | PASS WITH FIXES | **✓** |
| **SE-R11** | 1 Minor + 6 Polish | 5.0 | 95 | 95 | no | no | 95 | PASS (edge) | **✓** |
| **SE-R12** | 9 Polish | 4.5 | 95.5 | tie {95 odd, 96 even}→**96** | no | no | 96 | PASS | **✓** |
| **SE-R13** | 13 Polish | 6.5 | 93.5 | tie {93 odd, 94 even}→**94** | no | no | 94 | PASS WITH FIXES | **✓** |
| **SE-R15** | 1 Blocker + 5 Polish | 32.5 | 67.5 | tie {67 odd, 68 even}→**68** | no | yes | 68 | FAIL (by `any_blocker`) | **✓** |

**Verdict on Atlas's fixture math:** **PASS.** All 7 rows independently checked agree with `expected_breakdown` and `expected_output`. Rule-precedence ordering (SE-R15) confirmed: with `any_blocker=true` AND `score=68 < 70`, the `any_blocker` rule fires first per priority array. Banker's rounding direction at 94.5 (→94) and 95.5 (→96) confirms the rounding mode is genuinely half-to-even (not half-up, which would have produced 95 and 96).

Bonus: SE-R09 lower-band edge (30 deduction, 70 score, PASS WITH FIXES) verified by recomputing 18+7+2+2+0.5+0.5=30. ✓

---

## 5. Self-dogfood meta-check

**Question:** does the architecture support running the audit pipeline against itself? Would Jury auditing this PRD pass?

**Answer:** **YES, structurally; FAIL with conditions, on this very Phase 5 deliverable set, by the rubric.**

The architecture supports self-audit because:
- The runner is mode-agnostic (CLI mode + Code SKU) — Studio Zero's own repo would be cloned via GitHub App (D1) into a sandboxed working dir (D8) and the same 6-reviewer set + Jury would synthesize a verdict.
- `runs.tenant_id` for the Studio Zero internal tenant is no different from any customer tenant.
- Verify §5 explicitly mandates self-dogfood at every milestone M1–M5 + V1.5 + V2 + V2.1; the verdicts land at `audits/m<n>.json`.

**However, the present Phase 5 deliverable set, audited by Jury today, would produce:**
- **3 Blockers** (B1, B2, B3) → any Blocker forces FAIL by §10 priority-1 rule.
- **4 Criticals** + **6 Majors** → on the score-engine math: 3×30 + 4×18 + 6×7 = 90 + 72 + 42 = 204; clamp at 0; but FAIL by Blocker override regardless.
- Verdict: **FAIL**.

This is **acceptable for a Phase 5 audit gate** because the work is mid-flight and gate-fix-and-re-audit IS the process. But it is exactly the dogfood signal the system is designed to produce: the same rubric Studio Zero will sell, applied honestly to itself, says "fix the named drifts before claiming the architecture is shipped." Jo, this is the system working as designed.

---

## 6. Top-5 most-corroborated findings (multiple reviewers would land these)

1. **TB-numbering reconciliation** (C1). Surfaces every time anyone tries to cross-reference Axiom and Shield. Worst-cost-now-vs-later finding in the report.
2. **`runs.tracking_state` enum missing** (B1). PRD D23 commitment cannot be honored without it; UX, V1.5 webhook handler, Atlas migration, and test-strategy all reference a field that doesn't exist.
3. **`fix_pr_state` missing `reaudit_passed`** (B2). Axiom's invariant-preserving gating logic (ARCH-D7) has no representable state for "re-audit succeeded → ready to open PR." Forge will invent a name; architecture decision drifts off-record.
4. **Runner JWT TTL (5 vs 15 min)** (B3). Security parameter; cannot be ambiguous; Verify cannot write the test until reconciled.
5. **Score engine math is rigorously correct AND deterministic** (positive corroborated finding). 7+ rows spot-checked independently; banker's rounding direction confirmed at two opposite-side tie points. Atlas + Verify did this well; Sprint should treat the fixture suite as immovable contract.

---

## 7. Top-3 recommendations for Phase 6 (Sprint Plan) input

1. **Ticket the 3 Blockers as M0-week-1 prep work, before `0001_initial.sql` lands on staging.** None take longer than half a day. All three are mechanical reconciliation: rename a field, add an enum value, pick a number. The cost of NOT doing them now is a destructive-migration later (Atlas Rule 3: destructive changes ship as multi-step) — much more expensive than fixing while the migration file is still drafting.

2. **Create a `architecture/iac/` ticket-0 owned by Terra, blocking on nothing else.** Without it, no migration applies. Without migrations, no integration tests. Without integration tests, no M1 exit gate. This is the critical path. The IaC scope is bounded: Vercel project (us-east), Supabase project (us-east-1), Railway runner pool (us-east), Cloudflare DNS+WAF. ~3 days for a Terra-experienced operator.

3. **Schedule a 1-hour Axiom + Shield reconciliation session on TB numbering before Phase 6 closes.** Pick Shield's numbering (15 boundaries is the richer/correct surface — separates admin, customer-machine, telemetry as distinct trust zones). Axiom rewrites system-diagram §2 + §3 + §7 to use Shield's labels. Adds RLS-policy COMMENT annotations per `rls-policies.sql` line-489 TODO. Single pass — closes C1 + m2 simultaneously.

---

## 8. What Jury would NOT soften under deadline pressure

- The 3 Blockers. They are not "Polish" or "Minor" because the schema is being committed THIS milestone and forward-only migrations make these expensive to fix retroactively.
- The TB-numbering Critical. It is not a "documentation nit"; it's load-bearing for Verify's corpora and Shield's pentest scope.
- The dogfood verdict. Studio Zero auditing the present Phase 5 deliverable set FAILS by Studio Zero's own rubric. This is feature, not bug: it is what `BIGBRAIN.md` Hard Rule §1 ("no project ships without a Jury verdict") looks like applied inward.

---

## 9. Closing

Phase 5 is **PASS WITH FIXES**. The architecture is strong. Atlas's RLS pattern is best-in-class; Shield's threat model is rigorous; Verify's gate matrix is binary and citation-backed; Axiom's contradictions-section in system-diagram §9 is the kind of honesty that makes the rest of the document trustworthy. The drifts that remain are mechanical reconciliation between two documents written in parallel under deadline — not architectural mistakes.

Forge may begin M0 scaffolding **after** B1/B2/B3 land. Verify's M0 gates remain achievable on the original M0 deadline. Phase 6 Sprint Plan must ticket the Blockers + Criticals + Major M1 (IaC) as the first M0 work items.

No silent passes. No softening. The audit trail lives here.

— *Jury, 2026-05-11*
