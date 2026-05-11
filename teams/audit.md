# Team — Audit Panel

## Purpose
The standalone audit roster. Use when running an audit on an existing project (not a full build), or when re-running the audit gate after remediation. The full project rosters (`saas.md`, `ecommerce.md`, etc.) reference this team in their final phase.

Invoke via: `node audit-run.js <project-slug> "<brief>" [--project-dir <path>]`

## Roster

| Role | Agent | What they review |
|---|---|---|
| Lead | `jury` | Dispatch + synthesis. Verdict: PASS / PASS WITH FIXES / FAIL |
| Reviewer | `optic` | UX/UI heuristics — Nielsen 10, Hick's/Fitts's law, hierarchy |
| Reviewer | `proof` | Content & wording — reading level, jargon, tone, audience comprehension |
| Reviewer | `halo` | Accessibility — independent WCAG 2.2 AA |
| Reviewer | `compass` | Audience alignment — does this serve the defined target population? |
| Reviewer | `trace` | Flow & logic on as-built journey — dead ends, cognitive jumps, missing confirmations |
| Reviewer | `canon` | Visual consistency — brand-guide conformance, design-token violations |

## Run Order
1. `jury` issues parallel briefs (handled inside `audit-run.js`)
2. All 6 reviewers run **in parallel** (no inter-reviewer dependencies)
3. `jury` synthesizes verdict from collected reviewer files

## Required Inputs
- Project source directory (or live URL) — passed via `--project-dir`
- Defined target audience — primary persona at minimum (Compass rejects audits without one)
- Brand guide (if available — Canon enforces against it)
- PRD / persona doc (if available — Compass uses these)

## Outputs
- `shared_context/audits/<project>/<date>/{brief,optic,proof,halo,compass,trace,canon,verdict}.md`

## Pass / Fail Rule
A `PASS WITH FIXES` cannot promote to `PASS` until every Critical/Blocker is verified-fixed by the **originating reviewer** (not the creator). Re-audit invokes only the affected reviewer, not the full panel.
