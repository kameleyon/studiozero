[StudioZero] Waking up SPRINT to handle the task...
[StudioZero] Using model: gemini-3.1-pro-preview (Google Gemini)
As Sprint, here is my review of PRD v0.2. 

My primary lens here is forward momentum and risk mitigation. For a small team heavily leveraged by AI agents, a 16-week timeline to ship a multi-tenant Next.js + Supabase SaaS with a local CLI companion and a custom execution engine is aggressive, but achievable—*if* we sequence it right. Right now, the sequencing is flawed, and we are backloading our highest risks. 

Here is the breakdown of findings according to the Studio Zero severity rubric.

---

## Blocker

### Missing Security & Secret-Handling Gate
**Section Reference:** 13.4 (Secret handling), 14.3 (Security), 16 (Phasing)
**Summary:** We are ingesting Anthropic API keys (BYOK) and GitHub OAuth tokens with `repo` scopes in M1, but there is no dedicated security review milestone before these hit a production environment. 
**Evidence:** Section 14.3 mandates "OWASP Top 10 baseline" and "Secret scanning," but Section 16 has no time allocated for Shield (Security Agent) to actually audit the runner or the Supabase RLS policies before we ask technical founders to hand over their keys.
**Recommendation:** Insert an "M0.5 - Security Foundation" or explicitly gate M1's release on a Shield sign-off. Do not wait until M5 to test our libsodium sealed-box implementation. If we leak a user's Anthropic key in week 7, the product is dead on arrival.

## Critical

### M4 (Auto-PR) Reliability is Severely Underestimated
**Section Reference:** 11.2 (Premium tier), 16 (Phasing)
**Summary:** The 3-week placeholder for M4 (Week 11 to 14) assumes AI agents can reliably ingest a codebase, author a fix, pass a strict re-audit, and open a clean PR. This is the hardest engineering problem in the entire PRD.
**Evidence:** M4 is scheduled *after* billing and CLI modes. If we wait until Week 11 to discover that Forge and Vega struggle to reliably patch complex Next.js ASTs without breaking the build, our premium revenue tier evaporates right before launch.
**Recommendation:** Pull a technical spike for Auto-PR into M0 or M1. We need to prove the "Build agent → Jury re-audit → GitHub PR" loop works on a dummy repo by Week 4. If it's too brittle, we downgrade M4 to "Specs-only" for MVP and save 3 weeks of thrash.

## Major

### M2 (CLI) and M3 (Managed) are Out of Order
**Section Reference:** 16 (Phasing)
**Summary:** The critical path to revenue is the Hosted Runner. M3 (Managed mode) uses the exact same Hosted Runner as M1 (BYOK). M2 (CLI mode) requires a completely different execution architecture (local binary, websocket syncing, firewall traversal).
**Evidence:** By putting CLI (M2) before Managed (M3), we are delaying our primary monetization path (Managed Starter/Pro) to build a complex local networking feature that only serves a subset of users. M3 does not depend on M2.
**Recommendation:** Swap M2 and M3. Launch M1 (BYOK) -> M2 (Managed + Billing). Get Stripe live and start collecting revenue. Push CLI mode to M3 or M4. 

### Marketing & Waitlist is Backloaded to M5
**Section Reference:** 16 (M5 — Public launch)
**Summary:** Building the marketing site in Week 16 guarantees we will launch to zero users. 
**Evidence:** M5 lumps "Marketing site, docs, onboarding" into the final 2 weeks. 
**Recommendation:** Extract the Marketing Site (Astro + Tailwind, per `CAPABILITIES.md`) into M0. Put up a waitlist by Week 2. Let Signal (SEO/Marketing agent) own this while the engineering agents build the M1 runner. 

## Minor

### Missing E2E Testing and QA Milestones
**Section Reference:** 14.1, 14.2 (Reliability), 16
**Summary:** The timeline assumes code-complete equals production-ready. For a product selling "Strict elite gate" audits, our own app cannot be buggy.
**Evidence:** No explicit QA, E2E testing (Playwright/Cypress), or dogfooding phases are listed in the milestones.
**Recommendation:** Allocate Week 5 (end of M1) and Week 15 (before M5) exclusively to dogfooding. The team should run Studio Zero against Studio Zero's own codebase to validate the audit rubric and catch UX bugs.

### GitHub App vs. OAuth Scope Creep
**Section Reference:** 13.4, 16 (M1 & M4)
**Summary:** M1 requires read-only GitHub access for audits. M4 requires write access (`pull_request`) for Auto-PR. 
**Evidence:** If we build a standard OAuth integration in M1, asking for write permissions in M4 will force all existing M1 users to re-authenticate and accept scary write-access prompts.
**Recommendation:** Build this as a GitHub App from day one (M1), not standard OAuth. GitHub Apps allow granular, repo-by-repo permissions and separate read/write scopes much more cleanly. 

## Polish

### Realtime / Websocket Infrastructure Assignment
**Section Reference:** 13.1 (Architecture), 17 (Decision 10)
**Summary:** The architecture diagram shows websocket/long-poll connections for the CLI, and Decision 10 locks Supabase Realtime. 
**Evidence:** Supabase Realtime is incredibly capable, but managing connection drops and state reconciliation for long-running CLI jobs requires careful state-machine design.
**Recommendation:** Ensure the M0 Spike explicitly includes a proof-of-concept for Supabase Realtime broadcasting a 10-minute mock job to a local Node script. De-risk the socket connection before we build the actual CLI in later phases.

---

**Sprint's Bottom Line for BigBrain & Jo:** 
The 16-week timeline is credible for the Next.js + Supabase stack, but only if we reorder the work. **Swap CLI and Managed modes**, pull a **Security review into M1**, and **put up the waitlist in Week 2**. I will update the dependency graph and prep the Jira/Linear board once these adjustments are approved. Let me know if we are good to lock this and move to Sprint 1.
