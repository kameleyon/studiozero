[StudioZero] Waking up JURY to handle the task...
[StudioZero] Using model: gemini-3.1-pro-preview (Google Gemini)
Here is the audit report for PRD v0.2. 

I do not grade on effort; I grade against the audience rubric. The audience for this artifact is the engineering layer (Forge, Touch, Arch, etc.) who must translate this document into a database schema, a multi-tenant architecture, and a stateless runner. Right now, if handed to engineering, this PRD will result in a broken database schema, blown LLM token budgets, and wasted cycles on contradictory logic. 

**Verdict:** `FAIL`
**Owner:** BigBrain
**Deadline:** Fix prior to M0 Spike kickoff.

---

## Blocker

### 1. Missing Codebase Filtering Specifications
- **Section Reference:** §7.2 (Step A - Intake), §13.4, §18
- **Summary:** The PRD specifies pulling "Full source" for Code/Full audits but provides no constraints on repository size, file types, or token budgeting. 
- **Evidence:** Section 18 identifies "LLM cost overrun" as a High risk, but there is no architectural mitigation defined for ingestion. If the runner attempts to read `node_modules`, `.git`, or large media assets, it will immediately crash the context window and burn the tenant's token cap.
- **Recommendation:** Define a strict ingestion pipeline. Specify mandatory `.gitignore` parsing, a hard file-size limit (e.g., max 1MB per file text-extraction), exclusion of binary/media files, and a total token-budget cap per repository before the runner dispatches to the audit agents.

### 2. Invalid Multi-Tenancy Database Schema
- **Section Reference:** §13.2 (Database), §6.1
- **Summary:** The stated database schema rules conflict with standard SaaS authentication and will break Supabase Auth.
- **Evidence:** Section 13.2 lists `users` as a table and states: "All tenant-scoped tables have a `tenant_id` column... No exceptions." Supabase manages `auth.users` globally. If a strict `tenant_id` column is enforced on the `users` table, a single email address cannot be invited to a second workspace in the future, painting V2 into a corner. 
- **Recommendation:** Remove `tenant_id` from the `users` table. Scope RLS on `users` via `id = auth.uid()` and handle workspace isolation strictly through the `tenant_members` mapping table.

---

## Critical

### 3. Contradictory Success Metric
- **Section Reference:** §15 vs §17 (Decision 1)
- **Summary:** The PRD claims to have resolved a metric issue in the decisions log, but the actual metric was never updated.
- **Evidence:** Section 17, Decision 1 states: "§15 success metric was rewritten because the original 'median 50–75' was unreachable under these weights." However, Section 15 literally still says: "Median readiness score on first audit: between 50–75". 
- **Recommendation:** Update Section 15 to reflect the mathematical reality of the "Strict elite gate" (e.g., target median 20–40), or replace the specific score target with a target failure rate.

### 4. Overlapping Nomenclature (Product vs. Level)
- **Section Reference:** §7.2 (Step B) vs §9.1
- **Summary:** The term "Full" is used to describe two different dimensions of the audit, which will cause data-model confusion and UI friction.
- **Evidence:** Section 9.1 defines an audit *product* (SKU) called "Full" (meaning Source + URL). Section 7.2 defines an audit *level* (depth) called "Full" (meaning all 6 reviewers). An engineer building the API payload will end up with `{"product": "Full", "level": "Full"}`, which is ambiguous.
- **Recommendation:** Rename the audit levels to decouple them from the SKUs. (e.g., rename levels to "Quick", "Custom", and "Comprehensive").

---

## Major

### 5. Incomplete Cryptography Architecture
- **Section Reference:** §13.4 (Secret handling)
- **Summary:** The specified encryption primitive is incompatible with the stateless runner architecture.
- **Evidence:** The PRD states BYOK keys are "encrypted at rest with a tenant-scoped key (libsodium sealed boxes)". Sealed boxes use asymmetric (public-key) cryptography designed for anonymous senders. If the web app encrypts the key, the stateless runner needs the private key to decrypt it. The PRD does not specify how the runner securely retrieves this private key.
- **Recommendation:** Do not invent custom libsodium implementations. Since the stack is locked to Supabase (§2), mandate the use of Supabase Vault (pgsodium) for transparent column encryption of API keys.

### 6. CLI Tamper Verification Contradiction
- **Section Reference:** §8 vs §17 (Decision 6)
- **Summary:** The document gives engineers conflicting instructions on how to treat CLI mode security.
- **Evidence:** Section 8 states: "A tampered verdict is rejected [server-side]." Section 17 acknowledges: "treat as a trust signal, not a security boundary." An engineer reading Section 8 will waste sprint cycles trying to build an un-bypassable client-side hash check, which is technically impossible on a customer-controlled machine.
- **Recommendation:** Amend Section 8 to clarify that the binary hash check is a soft validation (trust but verify) to prevent accidental tampering, not a hardened security boundary.

---

## Minor

### 7. Redundant Mathematical Logic in Scoring
- **Section Reference:** §10 (Readiness Score)
- **Summary:** The explicit conditions for a `PASS` verdict contain mathematically redundant logic that will result in unnecessary code.
- **Evidence:** The rule states: "PASS if score ≥ 95 AND no Critical AND no Major findings". A Major finding deducts 7 points. `100 - 7 = 93`. It is mathematically impossible to score ≥ 95 and possess a Major or Critical finding.
- **Recommendation:** Simplify the engineering requirement to "PASS if score ≥ 95". The math already enforces the exclusion of Critical and Major findings.

### 8. Document Version Mismatch
- **Section Reference:** Header vs Footer
- **Summary:** The document versioning is inconsistent.
- **Evidence:** The header reads "**Version:** 0.2", but the final line of the document reads "*End of PRD v0.1.*"
- **Recommendation:** Update the footer to v0.2 to maintain artifact integrity.

---

## Polish

### 9. Presumptive Persona Copy
- **Section Reference:** §5 (Target Users)
- **Summary:** The justification for the primary persona relies on an unproven behavioral assumption.
- **Evidence:** The PRD states the technical solo founder "will tolerate a rougher product". Technical founders are historically the least tolerant of developer-tool friction and the most likely to inspect network payloads or complain about UX.
- **Recommendation:** Rephrase to: "They are equipped to provide actionable, code-level feedback on beta rough edges." 

---
*End of Audit. Re-submit to Jury when Blockers and Criticals are resolved.*
