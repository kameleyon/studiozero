# Auto-PR Body Template — V1.5+

**Owner:** Comply (Art. 50 paragraph — locked verbatim) + Herald (voice elsewhere) + Proof (readability)
**Effective:** V1.5 launch (binds before EU AI Act Art. 50 binding date of 2026-08-02)
**Consumed by:** the Auto-PR opener Edge Function (Forge) — every PR body MUST be rendered from this template
**Snapshot-tested by:** `tests/acceptance/goal-3-fix-delivery.spec.ts` (PR body includes re-audit verdict + Art. 50 disclosure + AI-Authored trailer per commit) + AI-System-Card-v1.0 snapshot test per `sprint/milestone-V1-5.md` exit gate.

> **Comply gate.** The Art. 50 disclosure paragraph in §2 below is **LOCKED VERBATIM**. Herald may refine voice in §1 (title), §3 (findings table heading copy), §4 (re-audit verdict prose), §5 (what-this-PR-does-NOT-change copy), §6 (badge label), §7 (cancel + refund copy). Comply re-verifies the locked paragraph on the quarterly System Card cadence.

---

## 1. The template (Markdown — rendered into PR body)

The opener Edge Function substitutes the bracketed `<placeholder>` tokens. All other text — especially the §2 Art. 50 paragraph — is emitted verbatim.

```markdown
# Studio Zero — <N> fix recommendation(s) for <project_name>

**AI Act Art. 50 Disclosure:** This pull request was authored by an AI system (Studio Zero v<system_card_version>) on behalf of <tenant_name>. All code changes are AI-generated and have been pre-verified by Studio Zero's independent audit panel (Jury + 6 reviewers) before this PR was opened. Customer review and approval is required before merge. See https://studiozero.dev/system-card for the AI System Card.

**Auto-PR provenance:** Each commit in this PR carries an `AI-Authored: studio-zero/runner@v<runner_version>` trailer. Patch generated for findings: <comma-separated F-IDs>.

## Findings addressed

| Severity   | Layer   | File                       | Finding                             | Patch                    |
| ---------- | ------- | -------------------------- | ----------------------------------- | ------------------------ |
| <severity> | <layer> | `<file_path>:<line_range>` | <F-NNN> — <summary_truncated_to_80> | <patch_commit_sha_short> |

<!-- ...one row per finding... -->

## Re-audit verdict

- **Original run:** <verdict> · score <N>/100 · run-id `<original_run_ulid>`
- **Post-patch re-audit:** <verdict> · score <N>/100 · run-id `<reaudit_run_ulid>`
- **Score delta:** +<N> points

Studio Zero's Jury re-audited this patch and confirmed it does not introduce new Critical or Major findings before opening this PR. The re-audit gate is enforced by the `jury-reaudit-gate` Supabase Edge Function — the only code path authorized to transition `fix_pr_jobs.state='reaudit_passed'` (per architecture decision ARCH-D7).

## What this PR does NOT change

- Code outside the scope of the original audit findings (commit-level boundary attribution via `Refs: F-NNN` trailers)
- Customer-attested own-URL metadata or intake metadata
- Repository configuration: CI workflows, branch protection rules, GitHub repository settings
- Default branch — this PR targets the feature branch `studio-zero/fix-<run-id>` and was never pushed against `<default_branch>` (audit-logged guard per V1.5 §C8 exit gate)

## Re-audit badge

[![Re-audit verdict](https://studiozero.dev/badges/<reaudit_run_ulid>.svg)](https://studiozero.dev/runs/<reaudit_run_ulid>)

## Cancel + refund

If you do not wish to merge this PR, close it. Closing without merging triggers Studio Zero's Auto-PR cancellation flow; the upcharge is refundable per https://studiozero.dev/terms §7 (and applicable regional cooling-off windows for EU/UK customers per `compliance/d22-cooling-off-flow.md`). The PR will remain in your repository as a record; closing it does not delete the branch.

If the re-audit FAILed (you should not be reading this in that case — we did not open a PR), the upcharge was automatically refunded; see your billing history at https://studiozero.dev/app/billing.

---

🤖 _This PR is AI-authored. Provenance: Studio Zero v<system_card_version>; runner v<runner_version>; score engine v<score_engine_version>; findings F-IDs above. Studio Zero does not auto-merge. EU AI Act Art. 50 disclosure above is the load-bearing transparency notice; the AI System Card at https://studiozero.dev/system-card is the authoritative source on capabilities, limitations, training data summary, risk register, and contact paths for disputes._
```

## 2. The Art. 50 disclosure paragraph — LOCKED VERBATIM

This paragraph is the load-bearing legal disclosure that satisfies EU AI Act Art. 50(2) for AI-generated content delivered as a PR. **Comply locks this text; Herald may not edit it.**

```
**AI Act Art. 50 Disclosure:** This pull request was authored by an AI system (Studio Zero v<system_card_version>) on behalf of <tenant_name>. All code changes are AI-generated and have been pre-verified by Studio Zero's independent audit panel (Jury + 6 reviewers) before this PR was opened. Customer review and approval is required before merge. See https://studiozero.dev/system-card for the AI System Card.
```

The four substantive bindings in this paragraph:

1. **"AI system (Studio Zero v<system_card_version>)"** — names the AI system + version, satisfying Art. 50(2) "informed in a clear and distinguishable manner."
2. **"All code changes are AI-generated"** — the synthetic-content marking required by Art. 50(2). Reinforces the per-commit `AI-Authored:` trailer.
3. **"have been pre-verified by Studio Zero's independent audit panel (Jury + 6 reviewers) before this PR was opened"** — discloses the internal quality gate, addressing the Recital 134 expectation that providers describe their content-checking mechanism.
4. **"Customer review and approval is required before merge"** — establishes the human-oversight gate satisfying GDPR Art. 22 (not fully automated; meaningful human review). Plain-English so a non-lawyer reads the consequence.

## 3. Commit trailer spec — `AI-Authored:`

Format (one trailer line per commit, last in trailer block, immediately above `Refs:` if present):

```
AI-Authored: studio-zero/runner@v<x.y.z>
Refs: F-NNN[, F-NNN, ...]
```

Where:

- `studio-zero/runner@v<x.y.z>` is the runner version that emitted the patch — pinned at gate-pass time (per V1.5 C6 race-test: if `score_engine_version` bumps between gate-pass and PR-open, the PR opens with the gate-pass-time version stamped — same rule applies to `runner@v` for provenance integrity).
- `Refs: F-NNN` is the per-commit attribution to the originating finding (V1.5 MA5 attribution test green — every commit has a `Refs:` trailer; finding-ID set across all PR commits matches the PR-claimed-findings set in the body's table).

**Why a trailer not just a body line.** Git trailers are RFC 5322-style machine-parseable. C2PA-style provenance + Art. 50 machine-readable marking + California SB 942 machine-readable provenance all benefit from a parseable trailer over prose. Tools like `git interpret-trailers` and GitHub's API expose trailers as first-class metadata.

**Example commit:**

```
fix(a11y): add aria-describedby on API-key input per HC5

The settings panel API-key input lacked aria-describedby linking to its
purpose description, failing WCAG 2.2 SC 1.3.5 Identify Input Purpose.

AI-Authored: studio-zero/runner@v0.7.3
Refs: F-042
```

## 4. Cross-references

- AI System Card v1.0: `legal/ai-system-card-v1.0.md` (Art. 50 disclosure paragraph + machine-readable provenance + System Card link cycle).
- Re-audit gate: `architecture/decisions.md` ARCH-D7 (`jury-reaudit-gate` Edge Function is the only path to `fix_pr_jobs.state='reaudit_passed'`).
- Default-branch guard: `architecture/database/migrations/0008_auto_pr_v1_5.sql` `fix_pr_jobs_never_default_branch` CHECK constraint + `sprint/milestone-V1-5.md` §C8 default-branch-fuzz exit gate.
- Refund mechanic: `architecture/database/migrations/0008_auto_pr_v1_5.sql` `fix_pr_jobs.refunded_at` + `refunded_amount_micros` + `audit_action` enum value `auto_pr_refunded`.
- D22 cooling-off: `compliance/d22-cooling-off-flow.md` (EU/UK 14-day right with D22 fresh-window-per-upgrade — Auto-PR upcharge opens a fresh window per the locked D22 mechanic).
- California SB 942 (AI Transparency Act): the `AI-Authored:` trailer is the machine-readable provenance marking referenced in `PRD.md` §14.5.
- Sprint exit gate: `sprint/milestone-V1-5.md` "**AI System Card v1.0 published** at `/system-card`; Comply sign-off; Art. 50 disclosure paragraph in every PR body (snapshot test)."

---

_Comply locks the §2 disclosure paragraph and §3 commit trailer spec. Herald + Proof refine §1 (title), §3 (table copy), §4 (verdict prose), §5–§7 (closing copy). Re-verified quarterly on the System Card cadence._
