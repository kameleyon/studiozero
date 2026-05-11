# Studio Zero — Autonomous Full Stack / SaaS Agent Team

A team of 56 autonomous AI agents that build production-ready web applications and SaaS products from idea to launch — and that audit their own work against an independent rubric before anything ships.

**Owner:** Jo  
**Director:** BigBrain 🧠 — see [`BIGBRAIN.md`](./BIGBRAIN.md) for the director's identity, decision rubric, and hard rules  
**Stack:** Agnostic — agents adapt to whatever the project requires  

## How It Works

1. Jo describes what she wants — the vision, the vibe, the outcome
2. BigBrain interprets, delegates, and coordinates the agents
3. Agents work in their specialties, communicate through protocols, and produce results
4. Before launch, the **Audit layer** (Jury + 6 reviewers) runs an independent product review against a fixed severity rubric — no half-baked ships
5. Nothing reaches Jo for approval without a passing audit

## Team Structure

| Layer | Agents | Count |
|-------|--------|-------|
| Strategy | Axiom, Scout, Penny, Sprint | 4 |
| Design | Canvas, Pixel, Flow, Motion | 4 |
| Frontend | Arch, Vega, Touch, Prism, Access | 5 |
| Backend | Forge, Nexus, Vault, Bridge, Queue | 5 |
| Data | Atlas, Stream, Keeper, Query | 4 |
| Security | Shield, Cipher, Verify | 3 |
| Quality | Probe, Crash, Ghost | 3 |
| Audit | Jury, Optic, Proof, Halo, Compass, Trace, Canon | 7 |
| DevOps | Pipeline, Terra, Watch, Chronicle, Siren, Meter | 6 |
| Platform | Locale, Edge, Tongue | 3 |
| AI | Cortex, Memory, Oracle | 3 |
| Docs | Scribe, Guide | 2 |
| Growth | Signal, Lens, Herald, Hook | 4 |
| Operations | Echo, Ledger, Comply | 3 |
| **Total** | | **56** |

## The Audit Layer (AI Product Auditor)

The Audit layer is Studio Zero's independent product-review function — a panel that reviews shipped or near-ship work against a fixed rubric. **Auditors do not edit code**; they flag, recommend, and verify fixes. This independence is what makes the audit trustworthy.

| Agent | Role |
|-------|------|
| **Jury** | Lead orchestrator — receives the brief, dispatches reviewers, synthesizes the verdict |
| **Optic** | UX/UI heuristic audit (Nielsen + Hick's/Fitts's law) |
| **Proof** | Content & wording audit (reading level, jargon, tone, audience fit) |
| **Halo** | Independent WCAG 2.2 AA accessibility audit |
| **Compass** | Audience alignment — does this actually speak to the people it's for? |
| **Trace** | Flow & logic audit on the as-built product — dead ends, cognitive jumps, missing confirmations |
| **Canon** | Visual consistency — brand-guide conformance across every shipped surface |

**Severity rubric used by every auditor:** Blocker / Critical / Major / Minor / Polish (definitions in `agents/audit/jury.md`).

## Activation

Each agent has a definition file in `/agents/<layer>/<name>.md` containing their identity, skills, communication protocols, and rules.

Team configurations for different project types are in `/teams/`.

Communication and workflow protocols are in `/protocols/`.
