# PRD v0.3 Review — Verify (QA / Testability lens)

**Reviewer:** Verify (Security layer — Dependency & Supply Chain, here wearing the QA / acceptance-criteria hat)
**Document under review:** `PRD.md` v0.3 (2026-05-10)
**Frame:** Every claim is a hypothesis. Every hypothesis needs a test. Untested claims are findings.

---

## Verdict: **FAIL**

(Same severity ladder as `agents/audit/jury.md`. Promotion to PASS WITH FIXES requires landing the new §X Test Strategy section and per-milestone exit criteria; promotion to PASS additionally requires the score-engine test fixtures and the schema files actually existing on disk before M0 exits.)

## Top-line summary (3 sentences)

The PRD reads as a thoughtful product narrative, but as a build spec it is structurally untestable: MVP goals are prose, success metrics are ambiguous at the cohort level, NFRs have no SLI definitions, and the score engine — the load-bearing math of the entire product — ships without a single referenced test fixture. There is no §Test Strategy, no per-milestone exit criteria, no enumerated event union for the runner contract, and no committed schema file for the audit output contract that two downstream consumers (web app + score engine) depend on. The remediation is mechanical, not architectural: add binary acceptance tests to each goal, spec the SLIs, commit the schema and fixture files, add §X, and convert M0–M5 into release gates with explicit pass criteria.

---

## Blockers (must fix before M0 exits)

### B1. §10 readiness score has no referenced test suite
**Section:** §10
**Claim under test:** `score = max(0, 100 - Σ severity_weight[finding.severity])`, with locked weights and thresholds.
**Missing assertion:** there is no `score_engine/v1.test.json` (or equivalent) fixture file, and no acceptance test enumerated in the PRD. A deterministic formula with no test suite is a formula nobody trusts.
**Required artifact:** a fixture/test table committed in the runner package, e.g. `runner/score_engine/v1.fixtures.json`, with at minimum these cases:
- `[] → score=100, verdict=PASS`
- `[Blocker x1] → score=0 (clamped), verdict=FAIL` (Blocker also forces FAIL regardless of score)
- `[Critical x1] → score=82, verdict=PASS WITH FIXES`
- `[Major x1] → score=93, verdict=PASS WITH FIXES` (proves the §10 "one Major auto-disqualifies PASS" comment)
- `[Major x3] → score=79, verdict=PASS WITH FIXES`
- `[Major x5] → score=65, verdict=FAIL` (crosses 70 boundary)
- `[Minor x16] → score=68, verdict=FAIL`
- `[Polish x10] → score=95, verdict=PASS` (exact boundary)
- `[Polish x11] → score=94.5, verdict=PASS WITH FIXES` (proves we picked a tie-breaker — currently undefined; see B2)
- `[Critical x100] → score=0, verdict=FAIL` (clamp upper-bound)
**Verify wants:** a `pnpm test score-engine` command, wired into CI, that loads this fixture and asserts each row. Without it, the score is an LLM-grade claim.

### B2. §10 score type and rounding undefined
**Section:** §10
**Claim under test:** `"score": <int 0..100>` in §9.3 output contract, but Polish weight is `0.5`. 11 Polish findings = 94.5 — non-integer.
**Missing assertion:** is the score `floor`, `ceil`, `round-half-to-even`, or is the int annotation wrong? Both downstream consumers (UI displays, success-metric SQL queries) will silently disagree.
**Required:** pick one (`round-half-to-even` is the safe default) and add a test row to B1's fixture proving it.

### B3. §9.3 audit output contract has no committed schema file
**Section:** §9.3
**Claim under test:** "Every audit returns a JSON object that the web app and the score engine consume."
**Missing artifact:** there is no path like `runner/schemas/audit-output.v1.json` (JSON Schema or Zod export) committed alongside the PRD. The inline example in §9.3 is not a contract — it's a sample.
**Required:**
- Commit `runner/schemas/audit-output.v1.schema.json` (JSON Schema 2020-12) or `runner/schemas/audit-output.v1.ts` (Zod / TypeBox).
- Mandate `schema_version: "v1"` field on every audit payload (currently absent — only `score_engine_version` is stamped).
- CI gate: every payload emitted in tests validates against the schema. Schema-breaking changes require a `v2` schema file and a migration test.
**Without this:** the web app and the score engine will silently diverge the first time a reviewer adds a new field, and we won't know until a customer's dashboard breaks.

### B4. §13.3 runner contract has no enumerated event union
**Section:** §13.3
**Claim under test:** `runAudit(input): AsyncIterable<AuditEvent>` — but `AuditEvent` is never defined.
**Missing assertion:** the discriminated union of event types. Minimum surface:
```ts
type AuditEvent =
  | { type: 'progress';        run_id: string; pct: number; agent_id: string }
  | { type: 'agent_started';   run_id: string; agent_id: string;  started_at: ISO8601 }
  | { type: 'agent_finished';  run_id: string; agent_id: string;  duration_ms: number; token_cost: number }
  | { type: 'finding';         run_id: string; finding: Finding }
  | { type: 'agent_log';       run_id: string; agent_id: string;  level: 'debug'|'info'|'warn'|'error'; msg: string }
  | { type: 'final_verdict';   run_id: string; payload: AuditOutputV1 }   // matches §9.3 schema
  | { type: 'error';           run_id: string; code: string; recoverable: boolean; partial?: AuditOutputV1 };
```
**Required test:** snapshot test that asserts every emitted event matches the union; CI fails on any event with a type not in the enum.
**Why blocker:** dashboard, live realtime feed, retry logic, and partial-result persistence (§14.2) all depend on knowing which events are emitted and what they carry. Today's spec gives us none of that.

### B5. No §X Test Strategy section exists
**Sections:** entire PRD.
**Claim under test:** every NFR, every hard rule, every contract.
**Missing:** the section that says *who owns testing, what gates the CI, what gates each milestone, and what gets dogfooded.* Without §X, every other testability finding in this review is fixed in isolation and immediately rots.
**Required:** add §X. Proposal in "Add proposals" below.

### B6. §17 milestones M0–M5 have no exit criteria
**Section:** §16 + §17 Decision #6 area
**Claim under test:** "M1 — Audit MVP (BYOK only) … week 6"
**Missing assertion:** what binary, automatically-checkable conditions must hold for M1 to be declared done? "Audit MVP works on one repo" is not falsifiable.
**Required:** per-milestone exit criteria (see "Add proposals"). Without them, milestones slip silently or "complete" without the security/quality work the synthesis identified as M0/M1 blockers (SSRF filter, RLS-via-JWT, redaction middleware, sandbox).

---

## Criticals (must fix before M1 launch)

### C1. §4 MVP Goals are prose, not acceptance criteria
**Section:** §4
**Claim under test:** Goals 1–5.
**Missing assertion:** Given/When/Then or binary acceptance tests per goal. "Customers can sign up, pick an execution mode, and run a full or partial audit" — what observable system state proves Goal 1 is complete?
**Required (proposed mapping):**
- **G1:** Given a new email, when the signup → mode-select → audit-launch happens end-to-end with no manual intervention, then a `runs` row reaches `state='completed'` and a verdict is persisted. Measured by an e2e Playwright test on staging covering all three intake methods.
- **G2:** Given a completed run, when the response payload is validated against `audit-output.v1.schema.json`, then it passes; every finding has non-null `severity`, `evidence`, and `recommendation`; the score matches what the score-engine fixture predicts for that finding set.
- **G3:** Given a completed FAIL audit and a paid upgrade, when fix-delivery is triggered, then a PR is opened against branch `studio-zero/fix-<run-id>` (never default branch — see C8) and re-audit verdict was non-FAIL prior to the PR opening (asserted in the `fix_pr_jobs` table).
- **G4:** Given an audit launched in each of BYOK / CLI / Managed, when results are compared on the same fixture project, then verdicts are consistent within tolerance defined in C7.
- **G5:** Given tenants A and B with concurrent runs, when tenant A's queries are executed under tenant B's JWT, then RLS rejects them (CI test). Tenant A's working dir is unreadable from tenant B's process (sandbox test).

### C2. §15 success metrics: denominators undefined
**Section:** §15
**Claim under test:** "First-audit FAIL rate ≥70%".
**Missing assertion:** what is the denominator?
- ≥70% of **signups** that complete a first audit?
- ≥70% of **first audits run** (any signup, including repeats)?
- ≥70% of **distinct projects' first audits**?
- Over what cohort window — 60 days from signup? Calendar month? All-time?
**Required:**
- SLI: `first_audit_fail_rate = count(distinct projects where first_completed_run.verdict='FAIL') / count(distinct projects with ≥1 completed first run)`, measured over the 60-day cohort since project creation, computed weekly.
- Same treatment for "Audit completion rate >80%" (numerator: runs where `state='completed'`; denominator: runs where `state IN ('completed','failed','aborted')`, excluding still-running).
- Same for "Re-audit improvement +20" — pair on `project_id`, take Δ between first FAIL audit and first non-FAIL re-audit within 30 days.
**Without this:** the success metric is a vibe, not a metric. Different denominators give 60% vs 75% on the same data.

### C3. §14.1 performance SLIs unspec'd
**Section:** §14.1
**Claim under test:** "Quick audit < 10 min p95. Full audit < 45 min p95."
**Missing assertion:**
- Measured per-tenant or global? (Global p95 hides a single tenant whose runs all timeout.)
- Synthetic CI canary, production observation, or both? Verify wants **both** — a synthetic test that runs nightly against a fixture repo (deterministic input, deterministic timing assertion) **and** a production SLO dashboard with weekly burn-rate alerts.
- "Audit" boundary — does the timer start when the customer clicks "Run" (includes queue wait) or when the runner picks up the job (excludes queue wait)? These differ by minutes under load.
**Required:** spec the SLI in §14.1:
```
quick_audit_duration_seconds_p95
  = p95 over 7-day rolling window of (run.completed_at - run.queued_at)
  for runs where depth='Quick' AND state='completed'
  SLO target: <600s, error budget: 5% of runs/quarter may exceed.
```

### C4. §14.2 reliability — "partial results persisted" undefined boundary
**Section:** §14.2
**Claim under test:** "Run failures are retried up to 2x; partial results are persisted so a retry resumes rather than restarts."
**Missing assertion:**
- What's the unit of "partial result"? Per-reviewer (Optic completed, Halo crashed, retry resumes from Halo)? Per-finding within a reviewer (Halo emitted 12 findings, crashed, retry resumes finding #13)? Per-agent invocation?
- Idempotency: re-running a reviewer that already partially emitted findings — do we get duplicate findings, or are they deduped by `finding.id`? `finding.id="F-001"` is sequential, so a retry will re-generate the same ID — collision or overwrite?
- Token-cost on retry: is the BYOK customer charged twice for the same reviewer's tokens?
**Required:**
- Boundary: **per-reviewer.** A reviewer either completes (its findings + score_breakdown contribution persist) or its partial state is discarded and it re-runs from scratch. This matches how the Jury synthesizes.
- Idempotency: each reviewer run has a `reviewer_attempt_id` UUID; findings carry `(run_id, reviewer, reviewer_attempt_id, finding_seq)` as compound key. The merger picks the last successful attempt per reviewer.
- Cost: completed reviewers' tokens are billed once; failed reviewers' tokens are refunded (§14.2 already promises refund on irrecoverable failure — generalize to partial).
- Test: chaos test that kills the runner process at three points (mid-reviewer, between reviewers, mid-Jury-synthesis) and asserts no duplicate findings and no missing reviewers in the final payload.

### C5. §13.6 observability claim has no CI assertion
**Section:** §13.6
**Claim under test:** "Structured logs (Pino), tenant-id tagged on every line."
**Missing assertion:** the CI test that proves it.
**Required:** integration test that spawns a real run, captures stdout/stderr, parses every line as JSON, asserts every line has `tenant_id` and `run_id` fields. Test fails if any line is unstructured or missing tenant_id. Same test asserts §13.6 + B5 (redaction middleware): no log line contains anything matching the secret-format regex set (AKIA, sk-, ghp_, ghs_, etc.) or anything > N bytes of base64-like content.

### C6. §11.2 Auto-PR gate has no test for the negative case
**Section:** §11.2
**Claim under test:** "A PR that does not pass re-audit is not opened; the customer is shown why and refunded if applicable."
**Missing assertion:** the test that proves the gate **fires** rather than the test that proves the happy path.
**Required:**
- Test 1 (positive): fix passes re-audit → PR opened → `fix_pr_jobs.pr_url` populated → customer notified.
- Test 2 (negative — Verify cares about this one): inject a mocked Critical finding into the re-audit response → assert **no PR opened** (`fix_pr_jobs.state = 'rejected_by_reaudit'`), customer notified with reason, refund event written to `billing_events`, and the GitHub App token was never used to call `POST /repos/{}/pulls`.
- Test 3 (race): fix passes re-audit at time T, but a concurrent rubric update (`score_engine_version` bumped to v2) lands at T+1. Either the gate uses the version snapshot at fix-time (preferred) or rejects the now-uncertain decision. Spec which.

### C7. §8 Cross-mode verdict consistency untested
**Section:** §8
**Claim under test:** the three execution modes produce comparable verdicts on the same project.
**Missing assertion:** "auditor independence guarantee" is meaningless if the same project audited under BYOK vs Managed produces different verdicts due to environmental differences (different sandbox, different network path, different model versions pinned).
**Required:**
- Per-mode regression suite: each mode runs the full fixture-project set in CI nightly. Per-mode golden snapshots.
- Cross-mode consistency test: same fixture project across BYOK + Managed (CLI excluded — runs on customer machine, can't be CI'd) must produce **identical score** and **identical verdict**. Findings may differ in order but must match by `(reviewer, severity, summary_hash)` modulo a tolerated noise set documented in the test.
- If cross-mode drift is found, it is a Critical bug — verdict comparability is the entire value prop.

### C8. §11 default-branch push guarantee has no test
**Section:** §11.2 hard rules
**Claim under test:** "We never push to default branches; PRs target `studio-zero/fix-<run-id>`."
**Missing assertion:** the test that proves the guarantee.
**Required:**
- Unit test: the PR-creation code path, given a target_branch of `main` / `master` / `trunk` / a repo's `default_branch` field, **throws** and writes to audit_logs. (The audit_logs entry is itself testable per the Minors below.)
- Integration test against a sandbox GitHub org: attempt to PR into the default branch using the App's token → assert API refusal at the application layer before the GitHub API is even called.
- Fuzz: feed 50 default-branch names (case variants, locale variants, "main "-trailing-space attacks, unicode lookalikes) and assert the guard fires.

### C9. §13.5 path traversal — no fuzz/pentest exit criterion
**Section:** §13.5
**Claim under test:** "no path can escape."
**Missing assertion:** the negative test set + the pentest milestone gate.
**Required:**
- Fuzz suite: 200+ inputs covering `../`, symlinks, junction points, `\\?\` Windows paths, UNC paths, zip-slip in any archives ingested, `package.json` `preinstall` scripts (overlap with synthesis C2), `.gitmodules` with `url=../../../etc/passwd`. CI runs against a constrained sandbox that asserts no host fs access outside the tenant working dir.
- Pentest exit criterion for **M3** (not M5): a third-party or Shield-led pentest must produce a clean report (no Criticals, ≤1 Major) before Managed mode is exposed to real customers.

### C10. §10 score versioning — re-runnability not proven
**Section:** §10, §13.2
**Claim under test:** `score_engine_version: "v1"` is stamped so re-audits remain comparable.
**Missing assertion:** that v1 on the same findings produces an identical score deterministically.
**Required:**
- Property test: for any randomly generated `findings[]`, `score_v1(findings) === score_v1(findings)` (pure function, no I/O).
- Snapshot test: a held set of canonical (findings, expected_score) pairs (overlaps with B1) re-runs in CI; any change in output → CI fails.
- When `v2` ships: a migration test loads v1-tagged historical snapshots and re-scores them under v2 to populate `score_v1_equivalent` (per synthesis C5). Test asserts the v1 score never changes (frozen).

---

## Majors (fix before public launch)

| # | Section | Issue | Required test artifact |
|---|---|---|---|
| MA1 | §6.3 CLI | "CLI never executes anything without a paired job" — claim untested | Integration test: unpaired CLI receives a synthetic job → rejected. Tampered pairing code → rejected. Replay attack with stale pairing code → rejected. |
| MA2 | §7.1 BYOK validation | "Validated by a dry-run call" — what's the failure mode? Wrong key, throttled key, suspended account? | Test matrix: 5 categories of invalid keys, each produces a distinct user-facing error. Successful validation never persists the key in plaintext on disk, even transiently. |
| MA3 | §7.2 Step C live progress | "Live progress is streamed" — under what loss conditions does the dashboard recover? | Resilience test: kill the WebSocket mid-run, assert the dashboard reconnects and replays missed events via the persisted event log. |
| MA4 | §9.2 reviewer mapping | The §9.2 table claims Canon does "partial" on Code audits — what does partial mean and how is it asserted? | Define and test: Canon on Code audit emits findings of types {brand_tokens, type_scale} but skips {visual_layout, rendered_brand}. Snapshot test on a fixture repo. |
| MA5 | §11 attribution | "Per-commit attribution to the originating finding ID" — testable but unproven | PR-generation integration test asserts every commit in the PR has `Refs: F-NNN` in the message and that the set of referenced IDs equals the set of findings the PR claims to address. |
| MA6 | §13.4 cryptoshredding | "Default retention 7 days, customer-overridable down to 0" — retention=0 means what timing exactly? | Spec: retention=0 ⇒ key deleted within 60 seconds of `run.state='completed'`. Test: a job with retention=0 — assert key absent from Vault by t+90s and assert any attempt to read the code blob returns 404. |
| MA7 | §13.4 retention vs WAL | Synthesis M9 already noted Postgres WAL/backups outlive retention. "Cryptoshredded" claim depends on the key truly being gone everywhere. | Test: verify Vault delete propagates to all replicas and any Vault-backup mechanism. Document in a runbook the worst-case window from `delete` to `mathematically destroyed`. |
| MA8 | §14.3 secret scanning | "Secret scanning on customer code intake" — what tool, what regex set, what false-positive rate? | Pin the scanner (gitleaks v8.x with a committed config file). Fixture: 30 known-secret samples + 30 known-not-secret samples; assert precision/recall on each CI run. |
| MA9 | §15 NPS > 30 | NPS is not a build-time test, but the **collection** is — when is the survey sent, to whom, what response-rate threshold makes the number defensible? | Spec: surveyed 14 days after first paid audit completion, to all paying customers, min n=20 before a number is published. Without this, NPS is anecdote. |
| MA10 | §17 D8 (sandboxing) | The chosen sandbox strategy (Firecracker vs rootless container) has different test surfaces — Verify needs to know which before writing the M1 test plan | See Decision votes below. |
| MA11 | §13.2 schema as code | "Tables (initial): tenants, users, …" — listed in prose, not SQL | Commit `supabase/migrations/0001_initial.sql` referenced from §13.2. CI runs `supabase db reset` against it and asserts the schema matches. |
| MA12 | §14.2 99.5% availability | SLI undefined. What probes determine "up"? | Synthetic uptime probe hits `/healthz` from two regions every 60s; 99.5% over a calendar month = 3.6h downtime budget. Document SLO + alerting threshold. |

---

## Minors (fix during M1 polish)

- **MI1 §9.3 evidence type union:** `"evidence": { "type": "file" | "url" | "screenshot" | "transcript", "...": "..." }` — the `"..."` hides a discriminated union. Spec each variant's required fields in the schema file from B3.
- **MI2 §10 negative-score case:** confirmed clamped to 0, but the test fixture should include a case that *would* be negative pre-clamp (e.g., 5 Blockers = -50 → clamped 0) to prove the clamp.
- **MI3 §14.4 retention max=30 days:** test that runs cannot be configured to a value > 30 (input validation), and that scheduled purge actually runs (overlaps with synthesis M7 `pg_cron`).
- **MI4 §11.2 refund logic:** "refunded if applicable" — "if applicable" is unfalsifiable copy. Spec: refund issued iff `fix_pr_jobs.charge_amount_cents > 0` AND `fix_pr_jobs.state = 'rejected_by_reaudit'`. Test both branches.
- **MI5 §13.6 timeline visibility:** "Per-run timeline visible in the dashboard" — assert the timeline is reconstructible solely from emitted `agent_started`/`agent_finished` events without replaying agent prompts (otherwise we're depending on log retention).
- **MI6 §17 D2 (free tier):** whatever the decision lands on, it produces a quota counter — write the test now that asserts the counter increments per audit, decrements on refund (if applicable), and rejects audits at the cap.
- **MI7 §9.1 audit product capability gates:** "Surface audits cap at Quick or Custom" — test that the API rejects `(product=Surface, depth=Comprehensive)` with a 4xx, and that the UI never sends that combination.

---

## Polish

- **P1** Add a `test_id` field to every finding type so failure tests can target specific finding generators.
- **P2** Add a `runner_version` field alongside `score_engine_version` in the output contract — bug repro depends on knowing which runner emitted the verdict.
- **P3** Standardize on Vitest or Jest (currently unspec'd); §X should name the runner so CI shells are obvious.
- **P4** Adopt `audit-output.v1` URN-style identifier (e.g. `application/vnd.studio-zero.audit-output+json; version=1`) so HTTP responses can carry the contract version in their `Content-Type`.

---

## Add proposals

### §X — Test Strategy (NEW SECTION)
Verify proposes this section land between §14 (NFRs) and §15 (Success Metrics) in v0.4.

**X.1 Test layers**
- **Unit:** pure functions only — score engine (§10), severity → verdict mapping, finding deduplication, redaction regexes. Coverage gate: 95% lines on score_engine, 90% on redaction, 80% overall.
- **Contract:** every payload crossing a boundary (runner→web, runner→DB, web→GitHub App) validates against a committed schema. CI gates on schema-mismatch.
- **Integration:** runner + DB + Vault + GitHub App + LLM (mocked); per-execution-mode regression suite (§8 / C7); chaos suite (§14.2 / C4).
- **End-to-end:** Playwright on staging — signup → mode-select → audit → verdict → fix-delivery → PR → re-audit. Runs nightly + on every release tag.
- **Load:** k6 / Artillery — sustain `N` concurrent runs per worker; assert p95 from §14.1; assert per-tenant queue caps from §13.5 actually fire.
- **Chaos:** kill-runner-mid-reviewer (C4); kill-DB-during-write; expire-vault-key-mid-decrypt; network partition between runner and LLM gateway.
- **Security:** path-traversal fuzz (C9), SSRF egress filter test (synthesis B3), prompt-injection corpus against Managed runner (synthesis C1), default-branch push fuzz (C8).
- **Penetration:** external pentest required as M3 exit gate (before Managed launches to real customers).

**X.2 Dogfood schedule**
Studio Zero audits itself at the end of M1, M3, M5, and before every V2 release. Output stored in `shared_context/projects/studio-zero-productization/`. Any Blocker or Critical in self-audit blocks the release.

**X.3 CI gates per milestone**
A milestone is "done" iff its gates are green:

- **M0 exit:** runner contract types compiled and exported; `audit-output.v1.schema.json` committed and lint-clean; `score_engine/v1.json` committed; score-engine fixture suite (B1) green; tenant-scoped JWT minting demo (synthesis B2) green; pairing code prototype demo green.
- **M1 exit:** all of M0 + GitHub App integration test green + SSRF egress filter test green + redaction middleware test green + sandbox path-traversal fuzz green + cryptoshredding test (MA6) green + RLS isolation cross-tenant test green + nightly synthetic Quick + Comprehensive audit complete in <10m/<45m p95 over a 7-day window + first self-audit produces a non-FAIL verdict.
- **M2 exit:** CLI pairing test (MA1) green + CLI tamper-detection rejection test green (or watermark fallback per synthesis M11 — see D7 vote) + local-folder intake never POSTs file content (network-tap assertion).
- **M3 exit:** Stripe webhook integration green + per-tenant token cap fires (load test) + external pentest report clean (≤1 Major, no Criticals) + Managed-tier prompt-injection corpus green.
- **M4 exit (if Auto-PR stays in MVP):** C6 negative-case test green + C8 default-branch fuzz green + MA5 attribution test green + end-to-end PR-flow test green.
- **M5 exit:** all prior gates still green + uptime probe configured + Sentry/PostHog redaction verified + AI disclosure copy on every report + GDPR right-to-delete e2e test green + 14.4 retention purge test green.
- **V2 exit:** Build mode roadmap-bundle schema committed; audit-gate-before-delivery test green.

**X.4 Test ownership**
Verify owns gate definitions. Shield owns security tests. Cipher owns crypto/redaction tests. Sprint owns the release-gate enforcement. Pipeline owns CI infrastructure.

**X.5 Test data**
- Fixture repos live in `runner/fixtures/repos/` (small known-good, small known-bad, large limit-pushing, malicious).
- Fixture findings live in `runner/score_engine/v1.fixtures.json` (B1).
- Fixture audit outputs (golden snapshots) live in `runner/fixtures/golden/`.
- Pentest corpus and SSRF target list live in `runner/fixtures/security/` (not exposed publicly).

### §9.3 — commit the schema file
Add to §9.3:
> The contract above is *normative as committed in* `runner/schemas/audit-output.v1.schema.json`. The PRD sample is illustrative; the schema file is authoritative. Schema-breaking changes ship as `audit-output.v2.schema.json` with a migration test demonstrating v1 → v2 conversion for all stored historical payloads.

### §13.3 — enumerate AuditEvent
Add the discriminated union from B4 to §13.3 inline, or reference `runner/schemas/audit-event.v1.ts`.

### §15 — denominate each metric
For every row in §15, append the SLI definition (numerator/denominator/window) per C2.

### Per-goal acceptance tests
Append to §4 (or move to §X.6) — the Given/When/Then mapping from C1.

---

## Remove proposals (unfalsifiable claims)

- **§14.5** "AI disclosure copy required on every audit report (per Comply agent)" — keep, but remove "(per Comply agent)" parenthetical and replace with a testable assertion: "Every audit report rendered to a customer contains the string defined in `legal/ai-disclosure.txt`. Tested per render path (web, JSON export, Markdown export, PR description body)."
- **§13.5** "no path can escape" — too absolute. Replace with: "Path traversal is prevented by sandbox boundary + the fuzz corpus in §X.1; any unhandled traversal is a Blocker per `agents/security/shield.md`."
- **§7.1 BYOK** "Validated by a dry-run call" — vague. Replace with the test matrix (MA2).
- **§18 risk row** "Studio Zero ships a build with a bug we should have caught" — mitigation reads "treat as a rubric gap and update Jury's brief", which is not falsifiable. Replace mitigation with: "Every customer-reported missed-finding becomes a postmortem with: (a) a new fixture added to the rubric's regression suite, (b) a rubric-version bump if the finding type is novel, (c) a test that the new fixture is caught by the next release."
- **§15** "NPS > 30" — keep but require MA9 collection methodology, otherwise remove until V2.

---

## Decision-D1–D9 votes (Verify's lens)

| D | Verify's vote | Reasoning |
|---|---|---|
| **D1 GitHub App vs OAuth** | **GitHub App.** | OAuth `repo` scope cannot be tested for blast-radius bounding because there isn't one. GitHub App = per-repo permission = a testable surface. Plus C8 (default-branch guard) is much easier to assert when the App's installation permissions exclude default-branch push at the GitHub side too — defense in depth. |
| **D2 Free tier (1-audit vs 1-project-unlimited)** | **1-project-unlimited.** | QA-wise, "unlimited re-audits on one project" gives us the data to compute the re-audit improvement SLI (C2) from organic traffic. 1-audit-per-signup means the second-audit data only exists for paying customers — small N, slow signal. |
| **D3 Auto-PR scope (MVP / V1.5 / Minor-Polish only)** | **V1.5.** | M4 is the milestone with the most untested mass: build-agent re-audit gate (C6), default-branch guard (C8), attribution accuracy (MA5), cross-mode verdict consistency under fix-delivery (C7). Each is multi-week. Doing all of them in M4's 3-week slot is the kind of compression that produces shipped-but-untested. V1.5 isolates the burden. |
| **D4 BYOK Starter $29 vs $19** | Abstain. | No QA implication. |
| **D5 Auto-PR flat vs tiered** | Abstain. | No QA implication beyond ensuring the chosen scheme is testable (e.g., tier = S/M/L is computed by a deterministic function from finding set — that function needs its own fixture test). |
| **D6 Milestone reorder M2↔M3** | **Reorder per Sprint.** | Managed before CLI gives us a server-side surface to harden first (sandbox, SSRF, prompt-injection). CLI mode's testing requires the customer's machine — we can't CI it the same way. Test-readiness argues server-first. |
| **D7 CLI tamper messaging** | **Drop the trust claim; watermark "Self-Audited / Unverified."** | Binary-hash signing is testable for "can we detect a flipped bit" but **not** for "can we detect an adversarial recompile that preserves the binary hash check while changing behavior" — that's an undecidable property without remote attestation. We can't write a test that the trust claim is true. Therefore drop the claim. Watermarking is a documentation assertion we can actually test (every CLI verdict's rendered output contains the string "Self-Audited / Unverified" or the badge URL). |
| **D8 Sandboxing (Firecracker / rootless container / no execution)** | **Rootless container with dropped caps + seccomp profile + no network egress except LLM gateway, with Firecracker as the migration target by V2.** | Test burden ranking: rootless container has the largest existing test ecosystem (CIS benchmarks, container-escape CVE corpus, easy to wire into CI). Firecracker is stronger but the test tooling is thinner and CI integration is heavier (KVM in CI is non-trivial). "No execution" is the safest answer but breaks any audit that needs `npm install` / `pip install` to resolve dependency-tree findings — i.e., it breaks Code and Full audits' Verify-style depth. So: rootless container with a published seccomp profile, test corpus covering the top 30 container-escape patterns, with an explicit roadmap and exit-criterion (`pentest report ≤ 1 Major, no Criticals`) before V2 graduates to Firecracker. **Critical caveat:** the chosen sandbox must be reflected as an M0-spike artifact, not an M1 surprise. |
| **D9 SSRF egress filter, prompt-injection mitigation, telemetry redaction, ingestion limits** | **All four are M0/M1 mandatory; here is Verify's test plan:** |

**D9 test plan (Verify's homework, since the brief asked):**

- **SSRF egress filter:** committed `runner/network/egress-allowlist.ts`; tests covering (a) RFC 1918 blocked (`10.0.0.1`, `192.168.1.1`, `172.16.0.1`), (b) loopback blocked (`127.0.0.1`, `[::1]`, `localhost`), (c) link-local blocked (`169.254.169.254`, `[fe80::]`), (d) DNS rebinding mitigation (resolve at filter time, not at fetch time; or use a hardened resolver), (e) non-HTTP(S) schemes blocked (`file://`, `gopher://`, `dict://`), (f) redirect chains re-checked at each hop, (g) `Host:` header smuggling rejected. Fuzz corpus: 200+ entries. CI gate: every test green.
- **Prompt-injection mitigation:** committed `runner/prompt-injection-corpus/` with 50+ known-pattern attacks (README-style "Ignore previous instructions", code-comment injection, base64-encoded directives, multilingual injection, indirect injection via dependency files). Test: each corpus entry run through a Managed-mode mock audit, assert (a) no outbound HTTP from the runner outside the egress allowlist (caught by SSRF filter, but redundancy is fine), (b) the LLM gateway's short-lived JWT is the only credential present in any traceable scope, (c) no successful injection altered the verdict from FAIL to PASS. Pass criterion: 100% of corpus correctly handled; failures of any kind block M1.
- **Telemetry redaction middleware:** committed `runner/telemetry/redact.ts`; test: feed log lines containing 30 secret-format samples (AKIA, sk-, ghp_, ghs_, AIza, xoxb-, PEM blocks, JWTs), assert each is replaced with `[REDACTED:<type>]`; feed source code chunks > 1KB, assert truncation; integration test that hooks Pino + Sentry transport and asserts no secret-format strings reach the Sentry network layer (use a mock Sentry server).
- **Ingestion limits:** committed config `runner/ingestion/limits.json` with `max_file_size`, `max_total_files`, `max_total_bytes`, `excluded_extensions`, `excluded_paths` (.git, node_modules, dist, build, .venv, target). Test fixtures: (a) repo with 10k files exceeds count cap, (b) repo with one 200MB binary exceeds size cap, (c) repo with `.gitignore` honored, (d) repo with symlinks pointing outside the repo — rejected, (e) repo with `.gitmodules` pointing to suspicious URLs — submodules not auto-fetched.

---

## Closing note (in character)

Every PRD claim is a hypothesis. v0.3 has many hypotheses and very few stated experiments. The good news: the hypotheses are mostly *correct* — strict-elite rubric, severity-weighted score, RLS+JWT isolation, cryptoshredding — these are defensible. The bad news: "defensible" only matters when an auditor can replay the defense. That's what §X + the schema files + the fixture suites buy us. Until they exist, every claim in this PRD is exactly the kind of thing Studio Zero would FAIL in a customer's product.

— *Verify*

*End of PRD v0.3 review (Verify).*

---

## v0.4 Plan Sign-Off (2026-05-10)

**Verdict if plan ships as scoped: PASS WITH FIXES.**

### 1. Does v0.4 close the 6 Blockers?
- **B1 score-engine fixtures:** Partial. Plan commits to §X.5 fixture path, but the *file must exist on disk with the 10 rows from B1* before M0 exit gate can be evaluated. Plan-language ≠ committed JSON.
- **B2 rounding rule:** Partial. §X says "score engine unit tests, 95% lines" but does not name the rounding mode. Pick `round-half-to-even` in §10 prose or it stays open.
- **B3 `audit-output.v1.schema.json`:** Yes — if §9.3 amendment lands and the file is committed at M0 exit. Trust-but-verify the path.
- **B4 AuditEvent enum:** Yes — §13.3 amendment + committed `audit-event.v1.ts` closes it. Snapshot test must be in M0 gate.
- **B5 §X Test Strategy:** Yes — section exists in plan.
- **B6 per-milestone exit criteria:** Yes — §X.3 enumerates them.

Net: 4 Yes, 2 Partial. Partials are file-existence checks at M0 exit, not architectural.

### 2. §X minimum-viable subsections for M0 start
1. **X.1 Test layers** (unit/contract/integration/e2e/load/chaos/security/pentest — one paragraph each).
2. **X.3 CI gates per milestone** (binary list — M0 gate is the load-bearing one for "can we start").
3. **X.4 Test ownership** (Verify/Shield/Cipher/Sprint/Pipeline mapping — prevents "someone else's job" decay).
4. **X.5 Test data paths** (fixture repo + score-engine fixture + golden-snapshot dirs committed before M0 exit).

X.2 (dogfood) and X.6 (per-goal acceptance) can land in M1 polish without blocking M0.

### 3. Per-milestone binary exit gates (automation-checkable)
- **M0:** `pnpm test score-engine && pnpm test schema:validate` green + `runner/schemas/audit-output.v1.schema.json` + `runner/schemas/audit-event.v1.ts` + `runner/score_engine/v1.fixtures.json` all present in HEAD.
- **M1:** Nightly Quick+Comprehensive audit on fixture repo completes within p95 SLO over 7-day window AND cross-tenant RLS isolation test green AND SSRF + redaction + path-traversal fuzz suites green AND first self-audit verdict ≥ PASS WITH FIXES.
- **M2:** Managed-mode prompt-injection corpus 100% pass AND per-tenant token cap fires under load test AND sandbox-escape corpus (top 30 patterns) green.
- **M3:** External pentest report committed with ≤1 Major and zero Criticals AND Stripe webhook idempotency test green.
- **M4 (CLI):** Pairing-code tamper/replay/unpaired-job rejection tests all green AND network-tap test proves CLI never POSTs file content during local audit.
- **M5 (Auto-PR, if in MVP):** C6 negative-case test green AND C8 default-branch fuzz (50+ variants) green AND MA5 commit-attribution snapshot test green AND end-to-end PR flow Playwright green on staging.
- **V2 (Build):** `roadmap-bundle.v1.schema.json` committed AND audit-gate-before-delivery integration test green (FAIL verdict blocks bundle delivery).
- **V2.1 (Self-host):** Containerized runner + DB + Vault bootstrap on a clean VM via documented script in <30 min AND offline-mode audit completes without any outbound HTTP (network-tap assertion).

### 4. Final verdict if v0.4 ships as planned
**PASS WITH FIXES.** Promotion to PASS requires the two Partials in §1 resolved (rounding mode named in §10; fixture + schema files actually committed at M0 exit, not just promised in plan-language).

### D8 — sandbox test-burden math
- **Firecracker microVM:** strongest isolation, weakest test ecosystem. KVM-in-CI is non-trivial (nested virt on GitHub Actions = self-hosted runner cost); container-escape CVE corpus largely N/A; need to build escape-detection harness from scratch. Test burden: **HIGH up-front, LOW per-test once wired.**
- **Rootless container + dropped caps + seccomp + egress allowlist:** mature tooling — CIS Docker Benchmark, falco rules, container-escape CVE corpus (~200 known patterns), trivial CI wiring. Risk: kernel-shared, so a single 0-day in the kernel namespace code escapes. Test burden: **MEDIUM up-front, MEDIUM per-test.**
- **No execution:** zero sandbox tests, but breaks dep-tree analysis (no `npm install`, no `pip install` → Code/Full audits lose Verify-style depth). Test burden: **LOW for sandbox, HIGH for "prove the audit is still useful without execution"** — and the latter is unwinnable for Code audits.

**Verify's pick: rootless container at M1, Firecracker as V2 graduation gated by clean pentest.** Math: container path lets us hit M1 with a known-good test corpus and ship the security story Shield wants. Firecracker is the right end-state but its CI cost is M0/M1 schedule poison. The decision must land as an M0 spike artifact — anything later is an M1 surprise.

— *Verify, 2026-05-10*

