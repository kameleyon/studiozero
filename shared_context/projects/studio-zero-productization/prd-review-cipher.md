[StudioZero] Waking up CIPHER to handle the task...
[StudioZero] Using model: gemini-3.1-pro-preview (Google Gemini)
I have reviewed PRD v0.2. As the guardian of Studio Zero’s sensitive data, I am evaluating the cryptographic primitives, key management architecture, and data privacy boundaries. 

The current specification attempts to implement strong encryption but falls into the classic trap of rolling a custom key architecture instead of leveraging the host platform's native secure enclaves. Furthermore, the telemetry and evidence-gathering mechanisms are currently acting as massive data exfiltration vectors for customer intellectual property and secrets.

Here are my findings, graded by the Studio Zero severity rubric.

---

## Blocker

### 1. Telemetry Data Leakage (Customer IP & Secrets in Third-Party Tools)
* **Section Reference:** 13.6 (Observability), 14.3 (Security)
* **Summary:** The current observability stack will leak customer source code, proprietary prompts, and potentially hardcoded secrets to Sentry and PostHog.
* **Evidence:** Section 13.6 states "Structured logs (Pino)... Sentry for errors... PostHog for product analytics." Section 13.3 states "Events are streamed (progress, partial findings, agent logs)." If an agent throws an error while processing a customer's proprietary file, the stack trace and local variables (including the file contents or AST) will be shipped to Sentry. PostHog event payloads will likely capture agent outputs.
* **Recommendation:** Implement a strict redaction middleware layer. Agent logs and error payloads must be scrubbed of all `source_code`, `prompt`, and high-entropy strings (via regex/AST detection) *before* leaving the runner process. Sentry and PostHog must only receive metadata (e.g., `agent_id`, `error_code`, `file_extension`), never file contents.

---

## Critical

### 2. Incorrect Cryptographic Primitive & Missing KMS
* **Section Reference:** 13.4 (Secret handling), 17 Decision 10 (Supabase platform)
* **Summary:** `libsodium sealed boxes` are the wrong primitive for this architecture. Sealed boxes use ephemeral keypairs for anonymous public-key encryption (the sender cannot be cryptographically authenticated). Furthermore, using raw libsodium requires us to manually manage the private keys, effectively rolling our own Key Management Service (KMS).
* **Evidence:** "BYOK API keys: encrypted at rest with a tenant-scoped key (libsodium sealed boxes)" (13.4).
* **Recommendation:** Since Section 17 Decision 10 locks Supabase as the platform, we must use **Supabase Vault** (powered by `pgsodium`). Supabase Vault provides Transparent Column Encryption (TCE) using Authenticated Encryption with Associated Data (AEAD - specifically AES-256-GCM). It ties directly into Postgres RLS and manages the Master Encryption Key (MEK) via the cloud provider's KMS. Drop libsodium sealed boxes; use Supabase Vault to encrypt `api_keys` and `oauth_tokens` at the database level.

### 3. Plaintext Secrets Stored in Audit Evidence
* **Section Reference:** 9.3 (Output contract), 13.2 (Database)
* **Summary:** The audit engine will permanently store customer secrets in our database if they are found in the customer's codebase.
* **Evidence:** Section 9.3 defines the finding object as containing `evidence: { "type": "file", "..." }` and notes that findings include line ranges and code snippets. If the Audit layer flags a hardcoded AWS key in the customer's repo, that AWS key becomes the "evidence" string and is saved in plaintext in our `findings` table.
* **Recommendation:** Implement a `trufflehog`/`gitleaks` regex-pass on the `evidence` object before it is serialized to the database. Any high-entropy string or recognized secret format must be masked (e.g., `AKIA****************`) in the finding output. We must never store valid customer credentials in our metadata tables, even to prove an audit failure.

---

## Major

### 4. Cryptoshredding Required for Code Retention Guarantees
* **Section Reference:** 13.4 (Secret handling), 14.4 (Privacy)
* **Summary:** The PRD promises a 7-day retention window for customer code, after which it is "deleted permanently." Standard database or S3 deletions do not guarantee permanent destruction, as data persists in write-ahead logs and backups for up to 30 days.
* **Evidence:** "Customer code... held only for the duration of the run + a configurable retention window... Deleted permanently after the window." (13.4).
* **Recommendation:** Implement **Cryptoshredding**. When customer code is fetched, generate a unique, random symmetric key (AES-256). Encrypt the code payload with this key before writing it to the runner's disk or Supabase Storage. Store this unique key in Supabase Vault. When the 7-day retention window expires, delete the *key* from Vault. Without the key, the data is instantly mathematically destroyed, regardless of where the encrypted blobs live in backups.

### 5. OAuth Token Access Pattern Mismatch
* **Section Reference:** 7.1 (Onboarding), 13.4 (Secret handling)
* **Summary:** The PRD states OAuth tokens receive the "same encryption" as BYOK keys, but their access patterns are entirely different.
* **Evidence:** Section 13.4 says BYOK keys are "decrypted only inside the runner process". If OAuth tokens follow this exact rule, the Web App cannot use them to list the user's GitHub repositories during the Step 7.1 onboarding flow, because the Web App wouldn't be able to decrypt them.
* **Recommendation:** Decouple BYOK key handling from OAuth token handling. BYOK API keys should only be decrypted by the Runner (via a specific Supabase Service Role RPC). OAuth tokens must be decryptable by the Web App to facilitate OAuth flows, repo listing, and webhook setup. Both should live in Supabase Vault, but with different access policies.

---

## Minor

### 6. Missing Key Rotation and Revocation Workflows
* **Section Reference:** 13.4 (Secret handling)
* **Summary:** There is no specified workflow for rotating the encryption keys or handling a compromised tenant.
* **Evidence:** The PRD mentions "encrypted at rest" but omits lifecycle management for the keys themselves.
* **Recommendation:** Define a Master Encryption Key (MEK) rotation schedule (handled natively if using Supabase Vault). Add an admin runbook for "Tenant Compromise" that instantly revokes the tenant's Supabase Vault keys, cryptoshredding their stored credentials and code.

---

## Polish

### 7. Explicit Session Security Posture
* **Section Reference:** 6.1 (Web App)
* **Summary:** The security of the BYOK keys and OAuth tokens relies entirely on the security of the user's web session.
* **Evidence:** Section 6.1 mentions Next.js and Auth, but omits transport and session hardening.
* **Recommendation:** Explicitly mandate `Strict-Transport-Security` (HSTS) headers, and ensure Supabase Auth is configured to issue `httpOnly`, `Secure`, `SameSite=Strict` cookies. Tokens must never be accessible via `localStorage` or client-side JavaScript, mitigating XSS extraction of the session that gates the encrypted secrets.
