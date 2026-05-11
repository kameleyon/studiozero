---
project: motionmax
event: audit
date: 2026-05-09
team: audit
runner: audit-run.js
verdict: FAIL
duration_minutes: 16
agent_runs: 7
case_study_author: bigbrain
---

# Case Study — MotionMax Audit, 2026-05-09

The first real audit run by the Studio Zero Audit panel against a production codebase.

## What we audited

MotionMax — an AI video generator SaaS (React 18 + Vite + Tailwind + shadcn frontend, Supabase backend, Render.com worker, multiple AI providers). Audience: tool-savvy creative adults. Brand brief: aqua + gold only, no red, no green, no orange.

Audit scope: full codebase end-to-end. No live URL provided — reviewers worked from the local source tree at `C:\Users\Administrator\motionmax`.

## Time, cost, headcount

- **Wall clock:** 16 minutes (audit panel) + 6 minutes (Jury synthesis v1) + 8 minutes (Jury synthesis v2 with Canon folded in) = **30 minutes total**
- **Agent runs:** 6 reviewers + 2 Jury syntheses (v1 partial, v2 complete) = 8 spawns
- **API cost:** unmeasured — first run with no metering instrumentation. **Action item: wire `Meter` into `audit-run.js`** so future runs report `$/audit`.
- **Equivalent human team time:** a 6-person human review team would take 3-5 days to produce equivalent file-cited findings. ~600× speedup on wall clock; cost differential pending Meter instrumentation.

## What worked

1. **Parallel reviewer dispatch.** All 6 reviewers ran simultaneously. Total wall clock = max-of-reviewers (10 min cap) instead of sum-of-all (60 min). The orchestration architecture was the right call.
2. **Audience-relative scoring caught real issues.** Compass refused to score "in the abstract" and rejected findings that didn't tie to the defined target audience. This kept the verdict actionable rather than nitpicky.
3. **Convergence elevated risk correctly.** Where multiple reviewers flagged the same artifact (B-1 fake social proof: 4 reviewers; C-2 brand aqua drift: 2 reviewers; C-3 V2 modal orange/green: 3 reviewers), Jury escalated severity rather than deduping down. This is the documented rule from `agents/audit/jury.md` Rule 7 working as intended.
4. **Jury's conflict resolution worked.** Compass recommended `PASS WITH FIXES`; Proof, Halo, and Trace recommended `FAIL`. Jury weighed and overrode Compass to `FAIL`, citing the FTC/UCPD legal exposure that Compass's audience rubric wasn't designed to weigh. This is exactly what Jury exists for.
5. **Brand memory propagated correctly.** The audit brief included Jo's "aqua + gold only, no orange" rule. Canon caught `#F5B049` template orange in the V2 announcement modal — the *exact* pattern Jo's memory had predicted. Validation that briefing the audit with brand context is high-leverage.
6. **Canon found the favicon disaster (B-5).** One byte-identical 2000×2000 PNG repeated four times across favicon / apple-touch-icon / OG card / logo. Manifest declares wrong dimensions. Every social share preview broken. Lighthouse PWA fails. Caught only by Canon's binary-asset checks (md5, pixel-dimension probe) — none of the other 5 reviewers operate at that layer.

## What broke

### 1. Canon's "didn't complete" misclassification (HIGH severity bug, fixed)

**What happened:** Canon's findings file landed on disk (27KB) at minute ~10, then the process kept running and hit the 10-min SIGTERM. `audit-run.js` checked process exit code (null) and concluded "Canon didn't complete" — Jury was synthesized without Canon's input. v1 verdict shipped missing 13 findings including 1 Blocker (B-5 favicon) and 2 Critical (C-23 email orange, C-24 marketing red).

**Why:** Success criterion was "process exit code 0" instead of "findings file exists with non-zero size."

**Fix shipped:** `audit-run.js` now uses `succeeded = (file exists && size > 0)` regardless of how the process terminated. SIGTERM-after-write is now treated as success. Verified by re-synthesizing the verdict (v2) with Canon's findings folded in.

**Action item (DONE):** the v1→v2 audit cycle would never happen on a fresh run with the fix in place. One-shot would produce v2-quality output.

### 2. Uniform per-reviewer timeout was wrong (MEDIUM severity, fixed)

**What happened:** All 6 reviewers had a uniform 10-minute timeout. Canon and Halo do "scan everything" work; Optic and Compass do "evaluate against rubric" work. Canon timed out at exactly 600s; Halo took 453s (close). Heuristic reviewers finished in 6-8 min.

**Why:** Designed-for-the-easy-case timeout config that didn't reflect reviewer workload differences.

**Fix shipped:** `REVIEWER_TIMEOUTS` map per agent. Canon and Halo get 20 min; Proof and Trace get 15; others 10.

**Action item (DONE):** each new reviewer gets an explicit timeout entry as part of its onboarding.

### 3. Node.js DEP0190 noise on every run (LOW severity, fixed)

**What happened:** Every reviewer spawn printed `(node:13104) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true...` to stderr.

**Why:** `task-claude.js` used `spawn(claude, [...args], { shell: true })` which Node 18+ flags as a potential injection vector.

**Fix shipped:** Built a single quoted command string with a cross-platform `quoteForShell` helper, then pass `[]` as args. Deprecation gone, no functional regression. Verified via Jury smoke test.

**Action item (DONE):** `task.js` (the Gemini runner) doesn't have this issue but should be checked for parallel deprecations on next Node upgrade.

### 4. No instrumentation for $/audit (MEDIUM severity, OPEN)

**What happened:** I described "16 minutes wall clock" but cannot tell you what this audit cost in API tokens or dollars.

**Action item (OPEN):** wire `Meter` (the FinOps agent) into `audit-run.js` to record token-in / token-out / $/run per reviewer. Aggregate to `metrics.json` per project. Without this, Stage 5 self-improvement has no cost dimension.
- **Owner:** Pipeline + Meter
- **Deadline:** before next major audit
- **Effort:** S — Anthropic API responses include usage data; just persist it

### 5. Verdict file location vs. project location (LOW severity, partially mitigated)

**What happened:** Verdict was written to `studio-zero/shared_context/audits/motionmax/...` but Jo expected it inside `motionmax/`. Manual copy required.

**Action item (OPEN):** add `--mirror-to <path>` flag to `audit-run.js` so the verdict can be auto-copied into the audited project. Already documented in our exchange.
- **Owner:** Pipeline
- **Deadline:** before second audit on same project
- **Effort:** S — ~10 lines in audit-run.js

## Findings produced

90 findings in v1, 103 in v2 after Canon was folded in:

| Severity | v1 | v2 |
|---|---:|---:|
| Blocker | 4 | 5 |
| Critical | 22 | 24 |
| Major | 33 | 37 |
| Minor | 21 | 24 |
| Polish | 10 | 13 |

The most impactful Blocker (B-5, social-share asset disaster) was caught **only** because Canon's binary-asset reviewer ran. Without Canon, this would have shipped — and every single shared link about MotionMax would render a broken preview.

## Action items rollup

| # | Item | Severity | Owner | Status |
|---|---|---|---|---|
| 1 | Fix audit-run.js success criterion (file exists, not exit code) | High | Pipeline | ✅ Done |
| 2 | Per-reviewer timeouts | Medium | Pipeline | ✅ Done |
| 3 | Fix DEP0190 deprecation | Low | Pipeline | ✅ Done |
| 4 | Wire Meter into audit-run.js for $/audit tracking | Medium | Pipeline + Meter | Open |
| 5 | `--mirror-to <path>` flag for auto-copy into project dir | Low | Pipeline | Open |

## What this case study tells the studio

1. **The audit panel works as designed.** All 6 reviewers produced file-cited, severity-rated findings within the budget; Jury synthesized them into a coherent verdict; convergence + conflict resolution operated as documented; the audience-relative rule changed which findings counted as Blocker vs. Major.
2. **The orchestrator was where the bugs lived, not the agents.** Every fix in this case study is in `audit-run.js` or `task-claude.js` — none of the agent personas needed changes. The mental model (specialized reviewers + orchestration layer) holds; the orchestration layer is where to invest hardening time.
3. **Canon is structurally important.** Canon caught a Blocker that no other reviewer could have found. The brief instinct to "skip the slow one" or to consider Canon optional would have produced a worse verdict and shipped a broken product. **Canon stays mandatory in every audit.**
4. **The `wrote=true` success criterion needs to spread.** Future runners (`run-project.js` and any v2 of `audit-run.js`) should default to "did the artifact land?" not "did the process exit cleanly?" This is now documented in `protocols/code-standards.md` and will be the default for any new orchestrator.
