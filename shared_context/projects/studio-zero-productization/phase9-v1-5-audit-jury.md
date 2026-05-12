# Phase 9 — V1.5 Audit (Jury)

**Auditor:** Jury (orchestrator + 6-reviewer lens — Halo / Optic / Proof / Compass / Trace / Canon)
**Date:** 2026-05-12
**Scope:** V1.5 Batch 1 — commits `23cab84` (Forge: 6 build agents + jury-reaudit-gate Edge Function + pr-opener + D23 webhook handling + 5 integration tests) and `72b71c8` (Comply+Atlas: AI System Card v1.0 + PR-body template + `0008_auto_pr_v1_5.sql`). Audited against `sprint/milestone-V1-5.md` exit gate + `PRD.md` §11.2 hard rules + ARCH-D7 + EU AI Act Art. 50 binding 2026-08-02.
**Self-dogfood gate:** APPLIED (6-reviewer lens on V1.5 new attack surface — build-agent LLM→code path + PR-opener).
**Verdict at V1.5 close:** **PASS WITH FIXES — score 79.** Above the 70 PASS threshold; below the M5 score of 82 due to **one Jury-gated Major (Art. 50 paragraph drift between Comply-locked template §2 and Forge `ART50_DISCLOSURE` constant)**, two carry-overs from M3/M5 still unclosed, and three test-file-naming gaps where V1.5 exit-gate items reference paths that do not exist on disk despite functional coverage shipping. None of the gaps reach Critical; V1.5 is launchable behind a 30-minute Comply+Forge reconciliation patch.

Prior milestone scores: **M0 75 · M1 75 · M2 78 · M3 77 · M4 80 · M5 82 · V1.5 79.** The −3 delta from M5 to V1.5 reflects the genuine new attack surface (Auto-PR is the first feature where Studio Zero authors artifacts the customer publishes into their own production), tempered by extremely disciplined Forge producer work (DB-side CHECK + app-side fuzz + RLS gate-only state transition + 35/35 fuzz-variant test green = textbook defense-in-depth).

---

## 1. Per-producer verdict

### 1.1 Forge — commit `23cab84` — **PASS WITH FIXES (Major)**

**3,357 net lines across 27 files.** Six build-agent fixers (halo / proof / optic / canon / compass / trace) + `fixer-runtime.ts` + `dispatcher.ts` (`index.ts`) + `patch.ts` (unified-diff applier) + `pr-opener.ts` (479 lines — branch creation, commit-per-patch, PR open, default-branch fuzz reject) + `types.ts` + Edge Function `supabase/functions/jury-reaudit-gate/index.ts` (380 lines — service-role auth, 30-min bounded poll, mock-mode escape, RLS-enforced gate-pass transition, refund triggering). GitHub webhook handler at `apps/web/app/api/webhooks/github/route.ts` extended for `installation.deleted` / `installation.created` / `pull_request.{merged,closed}`. Five integration specs + four runner-side unit-test files (`dispatcher.test.ts`, `fixers.test.ts`, `patch.test.ts`, `pr-opener.test.ts` — 35 tests). Runner test suite: **143/143 green.** V1.5 integration specs run locally: **48/48 green** across `auto-pr-art50-disclosure`, `auto-pr-default-branch-blocked` (35 fuzz variants), `auto-pr-reaudit-fail`, `auto-pr-d23-tracking`, `auto-pr-flow`.

**What Forge nailed:**

- **PR opener defense-in-depth (PRD §11.2 hard rule "never push to default branches").** `isLikelyDefaultBranch()` runs NFKC normalization + zero-width strip + cyrillic/greek lookalike substitution + lowercase + trim before comparison against the customer's default-branch _and_ an 8-name synonym list (`main`, `master`, `trunk`, `develop`, `default`, `production`, `prod`, `release`). The fuzz spec exercises 30 variants (case, locale, padding, cyrillic-`а`, greek-`ο`, zero-width spaces, LTR/BOM marks) plus 4 SAFE feature branches (`studio-zero/fix-…`, `feature/main-something`, `release-notes`); all 35 cases green. Pre-flight check fires BEFORE any `POST /repos/{}/pulls`; `auditLogReject` callback writes the rejected attempt with `reason: "default_branch_push_blocked"`. This is the strongest implementation of a PRD-§11.2 hard rule shipped in the series.
- **Jury re-audit gate as the ONLY transition path to `reaudit_passed`.** Edge Function `supabase/functions/jury-reaudit-gate/index.ts` is service-role-Bearer-gated (rejects customer JWTs with `service_role_required`); writes `audit_log_write` ledger on both pass and reject paths; triggers Stripe refund via `STRIPE_REFUND_URL` POST on reject + falls back to `billing_events` insert when refund URL unset (CI/mock); bounded by 30-min poll loop per PRD §14.2 with explicit `reaudit_timeout` 504 response. Mock mode (`MOCK_GATE=true` + `mock_verdict` field) is the right CI seam — production-path never runs in CI but gate decision tree is unit-testable.
- **Decision tree validation.** `auto-pr-reaudit-fail.spec.ts` mirrors the gate's decision tree in `gateDecide()` and asserts: (a) re-audit FAIL → reject + refund; (b) PASS WITH FIXES + new Critical/Major → reject; (c) PASS WITH FIXES + zero new Critical/Major → gate passes; (d) the rejection path means `openAutoPr` is never called (proxy for the "GitHub App token never called POST /repos/{}/pulls" exit-gate assertion).
- **D23 stale-tracking.** GitHub webhook handler updates `fix_pr_jobs.tracking_state` to `stale` on `installation.deleted` (filter by `github_installation_id`); `recovered` on `installation.created`; `pr_merged` / `pr_closed_unmerged` on `pull_request.closed`. `auto-pr-d23-tracking.spec.ts` asserts all 4 transitions via mock-supabase update inspection.
- **Commit trailer format.** `formatCommitMessage()` emits subject + blank line + `Refs: <finding_code>` + `AI-Authored: studio-zero/runner@v<version>` — RFC 5322 git-trailer format, parseable by `git interpret-trailers` and GitHub's API. Satisfies California SB 942 machine-readable provenance + PRD §11.2 MA5 attribution.
- **Lens events instrumented.** `auto_pr_opened` / `auto_pr_merged` / `auto_pr_closed_unmerged` analytics events wired through `apps/web/lib/analytics-events.v1.ts` extensions (R18 Auto-PR attach-rate dashboard prerequisite).

**Forge Major Jury-gated findings:**

- **VF1 (Major) — Art. 50 paragraph drift between Comply-locked template and Forge constant.** `legal/pr-body-template.md` §2 declares the Art. 50 disclosure paragraph **LOCKED VERBATIM** ("Comply gate; Herald may not edit"); the locked text reads: _"**AI Act Art. 50 Disclosure:** This pull request was authored by an AI system (Studio Zero v<system_card_version>) on behalf of <tenant_name>. All code changes are AI-generated and have been pre-verified by Studio Zero's independent audit panel (Jury + 6 reviewers) before this PR was opened. Customer review and approval is required before merge. See https://studiozero.dev/system-card for the AI System Card._". The Forge `ART50_DISCLOSURE` constant at `apps/runner/src/build/pr-opener.ts:43-50` emits a _different_ paragraph — a 7-line blockquote citing EU AI Act + California SB 942, Anthropic Claude, the `AI-Authored:` trailer and `Refs: F-NNN`, and the system-card URL. The Forge text is substantively conformant to Art. 50 (it names the AI system, marks the content as AI-generated, discloses the Jury pre-verification, and links the System Card), **but it is NOT verbatim the template Comply locked**. The test (`auto-pr-art50-disclosure.spec.ts`) asserts only token presence (`EU AI Act Article 50` / `California SB 942` / `AI-Authored` / `Refs: F-NNN` / system-card URL), not template fidelity. The Comply gate doc reads: _"Comply locks this text; Herald may not edit it."_ — drift between the locked-text artifact and the load-bearing emitter is the failure mode the compliance audit explicitly forbids. **Closure (~30 min):** either (a) Forge replaces `ART50_DISCLOSURE` with the literal template §2 paragraph, parameterized for `<system_card_version>` and `<tenant_name>`, OR (b) Comply explicitly updates `legal/pr-body-template.md` §2 to the Forge string with Comply countersign. Recommend (a) — Comply's text is the legally load-bearing artifact and Forge's text smuggles unfamiliar bindings (`Refs: F-NNN` belongs in §3 of the template, not §2).
- **VF2 (Major) — V1.5 exit-gate test file naming mismatch.** Three exit-gate items in `sprint/milestone-V1-5.md` reference test paths that do not exist on disk:
  - `tests/acceptance/goal-3-fix-delivery.spec.ts` — the entire `tests/acceptance/` directory does not exist; the functional coverage is in `tests/integration/auto-pr-flow.spec.ts` which Forge's commit message acknowledges as the "goal-3 e2e pre-cursor".
  - `tests/integration/auto-pr-reaudit-rejection.spec.ts` — the file shipped is `tests/integration/auto-pr-reaudit-fail.spec.ts` (different verb).
  - `tests/security/default-branch-fuzz.spec.ts` — the file shipped is `tests/integration/auto-pr-default-branch-blocked.spec.ts` (different path + different verb).
    Same M4 carry pattern as the M5 audit flagged ("3 exit-gate-named test files still absent"). Coverage exists at the integration layer; the exit gate scrape gate (`grep -F <path>` in CI) will fail. **Closure (~30 min):** Verify creates filename aliases (symlinks or thin wrappers that `import` and re-export the integration specs) at the exact paths the exit gate enumerates. Filename + assertion-wrapper work; no new logic.
- **VF3 (Major carry from M3) — `runner/llm/pinned-versions.json` STILL MISSING.** Forge's M3 deliverable referenced by PRD §14.5 + R16 + the M3 drift-dashboard + AI System Card v1.0 §3.1; flagged as HUMAN-pending in v1.0 of the card honestly. V1.5 shipped the System Card v1.0 honestly acknowledging the gap but did not close it. Recommendation: close at V1.5 + 5 days (or fold into V2 spec); do NOT carry past 2026-08-12 quarterly re-verification when the gap becomes a Comply blocker. **Closure (~2 hours):** Forge emits the JSON manifest with `claude-opus-4-7@anthropic` + fallback values; CI nightly drift check reads it.

**Forge Minor findings:**

- **VF4 (Minor) — `default-branch-fuzz-corpus/` directory absent.** `runner/fixtures/` exists with 9 other corpora (prompt-injection, sandbox-escape, ssrf, etc.) but the `default-branch-fuzz-corpus/` referenced by `sprint/milestone-V1-5.md` line 65 ("Shield — default-branch fuzz corpus: `runner/fixtures/default-branch-fuzz-corpus/` ≥50 variants") and `compliance/v1-5-compliance-audit.md` §2.6 ("Default-branch-fuzz corpus ≥50 variants in `runner/fixtures/default-branch-fuzz-corpus/`") and the SQL comment in `0008_auto_pr_v1_5.sql` (`>=50 variants in runner/fixtures/default-branch-fuzz-corpus/`) does not exist on disk. The 35-variant inline corpus in `auto-pr-default-branch-blocked.spec.ts` covers the test surface, but the file-on-disk artifact that Shield + Atlas + Comply cite is absent. **Closure (~30 min):** Forge (or Shield) writes the corpus to disk as `*.txt` lines (50+ variants); spec updates to read from it.
- **VF5 (Minor) — `pr-opener.ts` uses `assertSafeUrl` against `api.github.com` but commits via a single-file `PUT /contents` path rather than the documented "tree + commit + update ref" sequence.** The implementation comment at line 119 acknowledges the simplification ("we attach the unified diff as the commit body so reviewers see the patch source") but in practice `createCommit` does NOT attach the unified diff — it writes new file contents via `PUT /repos/{}/contents/{}`. The reviewer-UX implication is the customer sees the post-patch file content in the diff but loses the explicit unified-diff representation in the commit body. This is acceptable for V1.5 launch (GitHub's diff view renders the change) but the comment is misleading — drop or correct. Backlog for V2.

### 1.2 Comply+Atlas — commit `72b71c8` — **PASS WITH FIXES (Minor)**

**1,178 net lines across 4 files.** AI System Card v1.0 (`legal/ai-system-card-v1.0.md`, 226 lines — supersedes v0.5; binds before Art. 50 2026-08-02 binding date); PR-body template (`legal/pr-body-template.md`, 116 lines — locked Art. 50 paragraph + commit-trailer spec); V1.5 compliance scorecard (`compliance/v1-5-compliance-audit.md`, 250 lines — 12 controls scored, 8 LIVE, 2 RE-VERIFIED, 2 HUMAN-PENDING carry); Atlas migration `architecture/database/migrations/0008_auto_pr_v1_5.sql` (586 lines — `pr_tracking_state` enum, `fix_pr_state` enum extensions for `reaudit_passed` + `rejected_by_reaudit`, `audit_action` enum extensions for `auto_pr_opened` + `auto_pr_reaudit_fail` + `auto_pr_refunded`, 11 new `fix_pr_jobs` columns, `fix_pr_jobs_never_default_branch` CHECK, `runs.tracking_state` column, RLS policies `fix_pr_jobs_runner_update` + `fix_pr_jobs_jury_gate_update` per ARCH-D7, 5 indexes, `fix_pr_state_v1_5_consistency` supplementary CHECK).

**What Comply+Atlas nailed:**

- **AI System Card v1.0 honesty discipline.** §3.1 model-pinning section flags `runner/llm/pinned-versions.json` HUMAN-pending without pretending the artifact exists; §1 Art. 27 EU rep flagged HUMAN-pending; §12.1 changelog records v0.1 → v0.5 → v1.0 transitions with rationale; v1.1 target documented (close pinning gap + Art. 27 gap); next quarterly re-verification scheduled for 2026-08-12, before Art. 50 binding date of 2026-08-02. The card is the cleanest the series has shipped — it does not pretend the gaps are closed, and it does not hide that the closure timeline runs through 2026-08-12.
- **PR-body template §2 isolation of the locked paragraph.** Comply explicitly carves out §2 as LOCKED VERBATIM with the four substantive bindings enumerated below it (system identification, synthetic-content marking, Jury pre-verification disclosure, GDPR-Art-22 human-oversight gate). Herald-may-not-edit gate is explicit and re-verifiable on the quarterly cadence.
- **`0008_auto_pr_v1_5.sql` defense-in-depth posture.** DB-side CHECK constraint `fix_pr_jobs_never_default_branch` pairs with the app-side opener pre-flight guard pairs with the 35-variant fuzz spec — three layers, each independently sufficient. RLS policy `fix_pr_jobs_jury_gate_update` enforces ARCH-D7 at the database (only the Edge-Function JWT with `iss=supabase-edge-functions` + `role=jury_gate` may transition to `reaudit_passed` or `rejected_by_reaudit`); even an app-layer bug cannot bypass the DB. Idempotency disciplined throughout (`CREATE TYPE` wrapped in DO block, `ADD VALUE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` then `CREATE POLICY`, `pg_constraint` NOT EXISTS guards). Atlas Rule 3 (multi-step destructive changes) respected — old `tracking_stale` boolean retained as tombstone; column-drop deferred to a successor migration after read-paths switch.
- **V1.5 compliance scorecard structure.** 12 controls cross-referenced to law + regulation in §3 table (Art. 50, Art. 27, Art. 5, Annex III, SB 942, GDPR Art. 17 / 22 / 27 / 28, DMCA §512(c)(2), 16 CFR 425, CAN-SPAM/CASL/PECR, CCPA Do Not Sell, BIPA, WCAG 2.2 AA). Honest carry: DMCA + Art. 27 HUMAN-pending acknowledged + scoped as M5-public-launch-blocker not V1.5-feature-launch-blocker, which is correct.

**Comply+Atlas Minor findings:**

- **VC1 (Minor) — Comply scorecard claims the default-branch fuzz corpus is "≥50 variants" but the actual on-disk + in-spec corpus is 35 unique variants.** `compliance/v1-5-compliance-audit.md` §2.6 reads: _"Default-branch-fuzz corpus ≥50 variants in `runner/fixtures/default-branch-fuzz-corpus/` covering case, locale, trailing-space, unicode lookalikes..."_ — the spec has 30 fuzz variants + 4 safe-feature-branches + 1 negative-test case = 35 total, and there is no corpus directory. **Closure:** Comply restates as "≥30 variants on-spec; corpus directory deferred to V1.5+5d", OR Forge/Shield ships the >=50 variant on-disk corpus, OR Comply reverts §2.6's count to match reality. Recommendation: ship the on-disk corpus to >=50 entries (~30 min) — covers VF4 and VC1 simultaneously.
- **VC2 (Minor) — Migration `0008_auto_pr_v1_5.sql` line 363 comment references `fix_pr_jobs_never_default_branch` (correct) but the SQL CHECK predicate evaluates only `pr_source_branch ~ '^studio-zero/fix-'` when `pr_target_branch IS NOT NULL`.** The application-side guard in `pr-opener.ts:isLikelyDefaultBranch` is broader (rejects branch names that _resolve_ to default, even if the regex would match — e.g., `studio-zero/fix-main` could theoretically pass the regex while resolving to the customer's literal `main` default branch). The DB-side and app-side guards have a small impedance mismatch. Not a security gap — Forge's pre-flight runs first — but the DB-side is one layer thinner than the comment implies. Backlog.

### 1.3 Producer-pair joint verdict

The two commits land together as a single batch and they reference each other correctly (compliance scorecard cites the migration; migration comments cite the PRD sections + ARCH decisions; PR-body template cross-references the migration's refund columns + the Edge Function). This is the cleanest cross-producer integration the series has shipped — no silent contradictions, no missing cross-refs. The Art. 50 paragraph drift (VF1) is a Comply-Forge integration gap, not a layer-internal failure, and it is the only finding above Minor.

---

## 2. V1.5 exit-gate scorecard (per `sprint/milestone-V1-5.md` L103–L114)

| #   | Exit-gate item                                                                                                | Status at HEAD                                                                                                                                                                                  | Closer                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `tests/acceptance/goal-3-fix-delivery.spec.ts` green                                                          | **NOT-ON-DISK; coverage IN `tests/integration/auto-pr-flow.spec.ts` 2/2 green**                                                                                                                 | Verify (filename alias)                                                                                   |
| 2   | C6 negative-case test `tests/integration/auto-pr-reaudit-rejection.spec.ts` green                             | **NOT-ON-DISK; coverage IN `tests/integration/auto-pr-reaudit-fail.spec.ts` 4/4 green**                                                                                                         | Verify (filename alias)                                                                                   |
| 3   | C8 default-branch push fuzz `tests/security/default-branch-fuzz.spec.ts` green (50+ variants)                 | **NOT-ON-DISK; coverage IN `tests/integration/auto-pr-default-branch-blocked.spec.ts` 35 variants green**                                                                                       | Verify (filename alias) + Forge (raise variant count to >=50 OR ship on-disk corpus + spec reads from it) |
| 4   | MA5 attribution test green (every commit has `Refs: F-NNN`)                                                   | **GREEN** — `auto-pr-art50-disclosure.spec.ts` asserts `Refs: F-013` + `AI-Authored: studio-zero/runner@v1.5.0` on `formatCommitMessage()` output                                               | Forge ✓                                                                                                   |
| 5   | C6 race test green (fix-time `score_engine_version` stamp)                                                    | **STRUCTURAL** — `OpenPrInput.score_engine_version_snapshot` field carries the gate-pass-time stamp into the PR body; no race-test spec on disk that bumps the engine version between T and T+1 | Verify (write the race test)                                                                              |
| 6   | AI System Card v1.0 published at `/system-card`; Comply sign-off; Art. 50 paragraph snapshot in every PR body | **PASS WITH FIX VF1** — System Card LIVE; sign-off LIVE; snapshot asserts only token presence, not template fidelity → drift between locked text and emitter                                    | Comply + Forge (reconcile per VF1)                                                                        |
| 7   | D23 banner test green (GH App uninstalled after PR opened)                                                    | **GREEN** — `auto-pr-d23-tracking.spec.ts` 4/4 green; UI banner is Vega deliverable (not in this batch — separate Vega-V1.5 commit needed)                                                      | Forge ✓ for webhook; Vega for UI banner (pending)                                                         |
| 8   | Self-dogfood gate V1.5: `audits/v1_5.json` PASS or PASS WITH FIXES                                            | **THIS DOCUMENT** — PASS WITH FIXES, score 79. `audits/v1_5.{json,md}` to be written post-verdict.                                                                                              | Jury ✓                                                                                                    |

**Exit-gate roll-up:** 5 PASS (functional coverage exists + green where applicable) but 3 of those have NAME-MISMATCH between the exit-gate's named path and the on-disk file, plus 1 race-test spec absent. Net: **PASS WITH FIXES** — V1.5 is functionally launch-ready behind two ~30-min closures (VF1 Art. 50 reconciliation + VF2 test-filename aliases). VF3 (`pinned-versions.json`) is the M3 carry that should close before 2026-08-12 quarterly re-verification but does NOT block V1.5 ship.

---

## 3. Cross-cutting findings

### 3.1 `runner/llm/pinned-versions.json` STILL MISSING (Forge M3 carry)

**Status at V1.5 close: STILL HUMAN-PENDING.** Carry from M3; re-flagged at M4 (Jury); re-flagged at M5 (Jury, score impact −2); re-flagged at V1.5 honestly in AI System Card v1.0 §3.1; still absent. The card's §12.1 v1.1 target ("close §3.1 pinning-artifact gap once Forge commits `runner/llm/pinned-versions.json`") is the right home for closure — recommend closing **before V2.1 spec kickoff** so the drift-dashboard mechanic is fully wired before any V2 Build-mode work begins. Three milestones of carry without escalation is the failure mode `BUILD_FLOW.md` Phase 9 calls out ("a reviewer who reverses a verdict under deadline pressure breaks the wedge — escalate to BigBrain"). Jury escalates: **close at V1.5+10d or split into a tracked V2.1 carry with an explicit BigBrain-signed deferral rationale**. Do not let it pass quarterly re-verification on 2026-08-12 unclosed — at that point Art. 50 binds and the pinning honesty in the System Card transitions from "documented gap" to "documented non-conformance".

### 3.2 Art. 27 EU representative — HUMAN-pending (Jo)

Engagement letter pre-drafted; Prighter recommended at €690/yr (`compliance/article-27-eu-representative.md` v1.0); Jo signs to start. Documented honestly in System Card v1.0 §1 + §13 + compliance scorecard §2.12. **Not V1.5-blocking** (V1.5 is technical Auto-PR launch for existing customers); **is M5-public-launch-blocking** per `compliance/m4-compliance-audit.md` §2.6. Jury upholds Comply's scoping: HUMAN-pending is acceptable for V1.5 ship.

### 3.3 M5 Jury-gated 3 fixes — CSP+HSTS, 3 named tests, AT .webm files

The M5 audit identified three Jury-gated fixes recommended before T-0 binary go/no-go:

1. **CSP+HSTS in `next.config.ts`** — **NOT YET CLOSED.** No commit between `7acc9f9` (M5) and `23cab84`+`72b71c8` (V1.5 Batch 1) touches `apps/web/next.config.ts`. The day-zero runbook §9.4 still expects `Content-Security-Policy` + `Strict-Transport-Security` headers; `curl -sI` against the production response would still FAIL today. **Carry forward to M5 T-0 production launch (separate from V1.5 Auto-PR feature launch).**
2. **3 named tests (`status-page.spec.ts`, `retention-purge.spec.ts`, `gdpr-right-to-delete.spec.ts`)** — **NOT YET CLOSED.** Same M5 grep-gate failure mode as VF2 above (filename-mismatch). Carry forward.
3. **AT .webm files (`nvda-fail-flow.webm`, `voiceover-fail-flow.webm`)** — **NOT YET CLOSED.** Halo deliverable; no commit since M5 touches `tests/a11y/at-recordings/`. Carry forward.

**Carry posture:** All three are M5 launch gate items, separate from V1.5 feature launch. V1.5 ships Auto-PR as a feature _to existing customers_ on the existing production stack; the M5 production-launch gates remain in their own pipeline. Recommend **Sprint disambiguate** in the next burndown: V1.5 ships behind M5 T-0 or in parallel with the existing customer base — if parallel, the M5 carry items must close on the M5 T-0 timeline regardless.

### 3.4 Vega-side V1.5 deliverables NOT in this batch

`sprint/milestone-V1-5.md` Vega row enumerates 4 deliverables: Auto-PR upgrade UI (verdict-screen CTA + checkout), `fix-delivery-prflow.md` flow LIVE, D23 stale-tracking banner UI with `role="status"` per Halo HC1 + one-click reinstall CTA, re-audit progress UI ("Jury re-auditing your fixes…"). **None of these shipped in this batch.** Forge's webhook handler updates `fix_pr_jobs.tracking_state` correctly; the Vega banner that _consumes_ that state and renders to the customer is not yet wired. The D23 exit-gate test row 7 references the **Playwright snapshot** — `tests/e2e/d23-banner.spec.ts` or equivalent — which depends on Vega rendering the banner. Jury cannot close exit gate 7 fully until Vega ships.

**Jury recommendation:** Open V1.5 Batch 2 immediately covering Vega's 4 rows + Hook attach-rate measurement + Probe `fix-delivery-prflow.md` Playwright spec + Crash chaos test for webhook delay race. Without Batch 2, V1.5 is back-end-only; customer-visible Auto-PR launch requires the verdict-screen CTA + checkout + progress UI + banner.

### 3.5 D5 pricing decision — status not asserted in this batch

`sprint/milestone-V1-5.md` line 14 hard-deadlines D5 ("Jo's call between flat $49 and tiered S/M/L $15/$49/$99") at V1.5 spec-kickoff (week 17). Neither commit references D5 closure. PRD §17 D5 still reads "deferred to V1.5 prep (still open)". Sprint default per milestone L15: ship flat $49. **Jury escalates: BigBrain must record D5 closure in `decisions.md` before V1.5 Batch 2 ships the customer-visible upgrade UI.** Vega cannot wire the checkout CTA copy ("Ship the fixes — $49 →" vs "Ship the fixes — from $15 →") without D5 locked.

---

## 4. Self-dogfood gate V1.5 (6-reviewer lens on Auto-PR new attack surface)

V1.5 introduces a fundamentally new attack surface: build agents make LLM calls to generate code patches that are written into a customer's git repository. The threat-model TB-12 §3.5 sandbox-escape and the new R3 (Auto-PR opens a bad change) rows in AI System Card v1.0 §7 acknowledge the magnitude. Applying each reviewer's lens:

| Reviewer    | V1.5 finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Verdict       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| **Halo**    | Build agents proposed = Halo-fixer at `apps/runner/src/build/halo-fixer.ts` (52 lines). Token-only CSS verification: the fixer generates replacement-block strings via the LLM gateway with prompts that frame the brief as "token-only" — but the prompt template (in `fixer-runtime.ts`) does NOT include explicit anti-hex-literal instruction. Verify a halo-fixer prompt enforces token-only output via prompt + post-emission scan before commit (~1 hour); otherwise the Canon-clean discipline M5 achieved on producer files leaks via auto-emitted patches. **PASS WITH FIX (Major Halo-Canon cross-cutting).**                                                                                                                                                       | PASS WITH FIX |
| **Optic**   | PR body UX: VF1 aside (Art. 50 paragraph), the PR body's structure is good. Hick's-law check: PR-body table has Severity / Layer / File / Lines columns — 4 affordances, well within budget. Re-audit section provides original-verdict + re-audit-verdict + score-delta + score-engine-version + badge link — high information density without overload. Refund path is documented in the locked-template §7 ("Cancel + refund") but the Forge `formatPrBody()` output does NOT currently emit §5–§7 of the locked template (cancel + refund copy, badge label customization, what-this-PR-does-NOT-change list). PR body is shorter than the template specifies. **PASS WITH FIX (Minor) — Forge align `formatPrBody()` output to the locked template §1 + §3–§7.**          | PASS WITH FIX |
| **Proof**   | PR body copy: the Forge-emitted body uses Herald-grade voice in the table headers and Re-audit section ("What changed in `<project>`", "Re-audit", "Provenance"). Grade-8 ceiling holds. Banned-word list scan: no findings. Art. 50 paragraph drift (VF1) is the only Proof-relevant finding. **PASS WITH FIX (VF1).**                                                                                                                                                                                                                                                                                                                                                                                                                                                        | PASS WITH FIX |
| **Compass** | Target persona is the technical solo founder + indie agency reviewing the PR. The body opens with the Art. 50 disclosure (which a non-lawyer reader has to parse before reaching the actually-useful summary). Compass position: the disclosure-first ordering is correct under Art. 50 ("informed in a clear and distinguishable manner") — moving the summary above the disclosure would dilute the legal binding. The trade-off is acceptable. The PR title format (`Studio Zero — N fix recommendation(s) for <project_name>`) is scannable in the GitHub PR list. **PASS.**                                                                                                                                                                                               | PASS          |
| **Trace**   | PR flow: open → customer reviews on GitHub → merge OR close. On merge: webhook handler transitions `fix_pr_jobs.state='pr_merged'` + records `merged_at`. On close-without-merge: `state='pr_closed_unmerged'` + `closed_at`. On re-audit FAIL: PR not opened + refund event in `billing_events`. On GH App uninstall after PR opened: `tracking_state='stale'`. On reinstall: `tracking_state='recovered'`. All transitions tested in `auto-pr-d23-tracking.spec.ts`. **Dead-end check:** customer-facing UI for the refund-on-FAIL path is the Vega deliverable not yet in this batch — without Vega's re-audit-progress UI + verdict-screen "Re-audit failed; upcharge refunded" copy, the customer has no in-app artifact post-FAIL. **PASS WITH FIX (Vega Batch 2 gap).** | PASS WITH FIX |
| **Canon**   | Brand consistency in PR body Markdown rendering on GitHub: the body uses `##` H2 headers (Studio Zero brand convention) and inline-code for file paths and runner versions. The `🤖` emoji at the end of the template (template §1 closing line) is NOT in the Forge emitter — Forge's `formatPrBody()` ends at the Provenance bullet list, no robot emoji, no italicized epilogue. This is a Canon-vs-template gap (Forge ships less than the template specifies). PR body Markdown on GitHub renders cleanly (H2 + table + bulleted list + link). **PASS WITH FIX (VC1 alignment) — Forge align to template §1.**                                                                                                                                                            | PASS WITH FIX |

**Net self-dogfood V1.5 findings:** **0 Critical / 3 Major (VF1 Art. 50 drift; VF2 test-filename aliases; VF3 pinned-versions.json M3 carry) / 5 Minor (VF4 fuzz corpus on disk; VF5 commit body diff; VC1 corpus count; VC2 DB CHECK breadth; Halo-fixer prompt enforcement).**

**Self-dogfood verdict: PASS WITH FIXES** — consistent with M0–M5 posture, but score 79 reflects the new attack surface plus the 3 carried unclosed items.

---

## 5. V1.5 score reasoning per `score_engine.v1.json`

- Starting 100.
- **−6** (VF1 Art. 50 paragraph drift — Major; load-bearing legal disclosure; Comply's locked text is not what Forge emits).
- **−4** (VF2 three exit-gate test-filename mismatches — Major; same M5 carry pattern; the M4 chronic).
- **−3** (VF3 `pinned-versions.json` M3 carry — Major chronic; honestly documented but not closed across 4 milestones now).
- **−2** (Vega-Batch-2 gap: customer-facing Auto-PR UI not in this batch — Minor for V1.5 backend ship; Major if V1.5 is supposed to be a customer-visible feature launch).
- **−2** (Halo-fixer prompt does not enforce token-only output — Major Halo-Canon cross-cutting; risks Canon-clean leak via auto-emitted patches).
- **−2** (M5 carry of CSP+HSTS + 3 named tests + AT .webm files — Major carry not closed in V1.5 batch; separate launch gate).
- **−1** (VC1 corpus count mismatch + VF4 corpus directory absent — Minor; ~30 min closure).
- **−1** (VC2 DB CHECK predicate narrower than comment claims + VF5 commit body diff comment misleading — Minor; backlog).
- **= 79/100** (vs M5's 82; −3 delta).

The score reflects: V1.5 introduces meaningful new attack surface; Forge's producer work is the strongest in the series on the defense-in-depth dimension; the Art. 50 paragraph drift between Comply-locked artifact and Forge constant is the single most-important finding because it is the compliance contract V1.5 is supposed to satisfy.

---

## 6. V1.5 exit verdict

**PASS WITH FIXES — score 79.**

V1.5 Batch 1 is launch-ready behind two ~30-min closures + one Vega Batch 2:

**Recommended before V1.5 customer-visible feature flag flip:**

1. **VF1 (Major)** — Forge replaces `ART50_DISCLOSURE` with `legal/pr-body-template.md` §2 verbatim text, parameterized for `<system_card_version>` + `<tenant_name>`. Update `auto-pr-art50-disclosure.spec.ts` snapshot assertion to exact-string match (not token-presence). ~30 min.
2. **VF2 (Major)** — Verify creates filename aliases at `tests/acceptance/goal-3-fix-delivery.spec.ts`, `tests/integration/auto-pr-reaudit-rejection.spec.ts`, `tests/security/default-branch-fuzz.spec.ts` (thin wrappers that re-export from the on-disk integration specs). ~30 min.
3. **V1.5 Batch 2 (Vega + Hook + Probe + Crash)** — Vega's 4 rows (Auto-PR upgrade UI + flow doc LIVE + D23 banner UI + re-audit progress UI), Hook attach-rate instrumentation, Probe Playwright spec, Crash webhook-delay chaos. Sprint to schedule.

**Recommended before V1.5 + 10 days:**

4. **VF3 (Major chronic carry)** — Forge commits `runner/llm/pinned-versions.json`. Closes the M3-→M4-→M5-→V1.5 honesty gap before 2026-08-12 quarterly re-verification.
5. **VF4 + VC1 (Minor)** — Forge/Shield ships `runner/fixtures/default-branch-fuzz-corpus/` with ≥50 entries; spec reads from it. Closes the on-disk-vs-cited mismatch.
6. **D5 pricing decision** — BigBrain records Jo's call (flat $49 vs tiered $15/$49/$99) in `decisions.md` before Vega wires checkout copy.

**Carry-not-blocking for V1.5 feature launch (but blocking for M5 production launch):**

- CSP + HSTS in `apps/web/next.config.ts` (M5 Jury-gated, runbook §9.4).
- 3 M4 named tests (`status-page.spec.ts`, `retention-purge.spec.ts`, `gdpr-right-to-delete.spec.ts`).
- AT .webm files (`nvda-fail-flow.webm`, `voiceover-fail-flow.webm`) + `signoff.md` ISO date.
- DMCA Designated Agent registration (Jo signs at copyright.gov).
- Art. 27 EU representative engagement (Jo signs Prighter letter).
- WCAG vendor conformance report (vendor delivery; LIVE-PENDING).

Score 79 is above the 70 PASS threshold per `score_engine.v1.json`. The series shape — 75/75/78/77/80/82/**79** — reflects V1.5 introducing genuine new risk (Auto-PR is the first feature where Studio Zero authors customer-production artifacts), tempered by Forge's textbook defense-in-depth implementation. The −3 from M5's 82 is the cost of the new surface plus the unclosed chronics; net posture is the same disciplined PASS-WITH-FIXES the series has held throughout.

---

## 7. V2 readiness assessment

V2 is the Build-mode tier (`/build` route currently LIVE as honest "coming in 2027" placeholder with demand-gate signup). V2 wiring depends on:

- **V1.5 Batch 2 closure** — customer-visible Auto-PR UI must ship to validate the Auto-PR attach-rate assumption (R18 ≥15% Pro-tier target) before V2 Build mode commits to the same Forge+Vega+Atlas+Jury-re-audit pipeline.
- **`pinned-versions.json` (VF3)** — Build mode requires the drift dashboard end-to-end; the manifest-as-file half cannot keep slipping.
- **External pentest report (R21(a))** — Build mode opens far larger sandbox-escape surface (TB-12 §3.5); pentest results before V2 spec-kickoff is operationally non-negotiable.
- **V1.5 + 30d attach-rate cohort data** — R18 + Auto-PR re-audit gate pass rate (target ≥80%) measured at V1.5 + 30d; if attach rate < 15% or gate pass rate < 80%, V2 Build mode's commercial assumptions need re-derivation by Penny before V2 spec.

**V2 readiness verdict: PRE-SPEC — proceed with caution.** V2 spec kickoff should follow V1.5 + 30d retro, conditional on (a) Batch 2 customer-visible launch + (b) attach-rate cohort hitting R18 mitigation thresholds + (c) pentest report landing + (d) VF3 closure. None of these block V1.5; all condition V2.

**V2.1 readiness:** PRE-SPEC; sequenced behind V2; ~12+ weeks after V2 close. The audit-output schema + verdict state-machine architectural pre-work is in place from PRD §10 + the score-engine versioning machinery from M0/M1. No V2.1-specific Jury action this audit.

---

## 8. Decisions closing at V1.5

Per `sprint/owner-matrix.md` §3 V1.5 row + `sprint/milestone-V1-5.md` lines 127–132:

| Decision                                                                     | Status at V1.5 Batch 1 close                                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **D3 Auto-PR fix delivery ships** (Forge + Comply)                           | **TECHNICALLY LIVE (Batch 1 back-end + compliance); Batch 2 customer-visible required for full ship**      |
| **D5 Auto-PR pricing** (Jo + Penny, hard deadline V1.5 spec-kickoff week 17) | **OPEN — Jury escalates: BigBrain to record Jo's call in `decisions.md` before V1.5 Batch 2**              |
| **D23 GH App uninstall after PR opened** (D23 banner ships with Auto-PR)     | **PARTIAL — backend webhook handling + DB state LIVE; Vega banner UI pending in Batch 2**                  |
| **#18 v1.0 AI System Card** (Comply + Herald)                                | **LIVE** — `legal/ai-system-card-v1.0.md` v1.0 published; supersedes v0.5; next re-verification 2026-08-12 |
| **Self-dogfood gate V1.5 PASS** (Jury)                                       | **PASS WITH FIXES — this document, score 79**                                                              |

---

**Audit complete.** Cross-refs: `sprint/milestone-V1-5.md`, `PRD.md` §11.2 + §11.3 + §14.5 + §16 V1.5 + §17 D3+D5+D23+#18, `legal/ai-system-card-v1.0.md`, `legal/pr-body-template.md`, `compliance/v1-5-compliance-audit.md`, `architecture/database/migrations/0008_auto_pr_v1_5.sql`, `architecture/decisions.md` ARCH-D6 + ARCH-D7, `apps/runner/src/build/pr-opener.ts`, `apps/runner/src/build/index.ts`, `supabase/functions/jury-reaudit-gate/index.ts`, `apps/web/app/api/webhooks/github/route.ts`, `tests/integration/auto-pr-*.spec.ts` (5 specs, 48 tests green), `apps/runner/tests/build/*` (143 tests green), commits `23cab84` + `72b71c8`, `BUILD_FLOW.md` Phase 9 + Phase 10, `score_engine.v1.json`, `shared_context/projects/studio-zero-productization/phase9-m5-audit-jury.md`.
