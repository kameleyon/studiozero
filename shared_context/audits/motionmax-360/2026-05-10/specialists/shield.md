# Shield — Application Security Audit (motionmax-360, 2026-05-10)

**Reviewer:** Shield (Application Security)
**Category:** §6 Security & Encryption (OWASP Top 10 focus: A01, A02, A03, A05, A07; with A04/A08/A10 spot checks)
**Audience-relative:** Tool-savvy creative adults paying real money via Stripe — financial loss, account takeover, and PII exposure are the headline risks. Sophistication of attacker assumed: scripted credential stuffing and abuse, not nation-state.
**Time budget:** 15 min — depth focused on A01/A05/A07 (highest blast radius for paying SaaS users on mobile). Items I could not verify in time are listed at the bottom with concrete file pointers.

---

## Summary

The auth core (Supabase + RLS), the Stripe webhook (signature, body cap, idempotency check-then-insert), the rate-limit fail-closed wrapper, the privileged-route registry, and the export-my-data GDPR endpoint are largely well-built. The damage is concentrated in: **(1) missing platform security headers**, **(2) a substring IDOR in `serve-media`**, **(3) an in-memory lockout that is trivially bypassed**, **(4) localStorage JWT with no compensating CSP**, and **(5) localhost origins still in the production CORS allowlist**. SECURITY DEFINER hygiene is mostly good (most functions DO set `search_path`), but six migration files are missing it. Edge functions echo raw exception strings to clients. Admin audit logs are fire-and-forget. **Status: NOT shippable as-is — three Blockers and four Criticals must close.**

---

## Findings (grouped by category, sorted Blocker → Polish)

### A05 — Security Misconfiguration

#### S-001 [BLOCKER] No production security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- **Evidence:** `index.html:1-50` ships the SPA shell with no `<meta http-equiv="Content-Security-Policy">`. No platform-level header config in repo (no `vercel.json` / `_headers` / `render.yaml` headers block surfaced via Glob). Edge functions return only `Access-Control-*` and `Content-Type` (e.g., `supabase/functions/stripe-webhook/index.ts:88-92, 606-609`; `supabase/functions/admin-stats/index.ts:1059-1062`).
- **Why it matters:** Combined with the JWT in `localStorage` (S-002), any reflected XSS in an AI-generated content surface (Voice Lab, Autopost Lab, project titles, captions) becomes session theft. HSTS missing means a downgrade attack on a hotel/airport WiFi can MITM the auth flow on first visit. `X-Frame-Options: DENY` is missing so the app can be framed for clickjacking against payment / cancel flows.
- **Fix:** add a CSP allowlist in the host's edge config — `script-src 'self' js.stripe.com *.supabase.co *.sentry.io`; `connect-src 'self' *.supabase.co api.stripe.com *.sentry.io render.com`; `frame-ancestors 'none'`; HSTS `max-age=31536000; includeSubDomains; preload`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(self), geolocation=(), usb=()`. Configure in the deploy target (Vercel `vercel.json` `headers`, Netlify `_headers`, or Render static-site headers).
- **Effort:** S

#### S-002 [CRITICAL] Supabase session token persisted in `localStorage` (XSS → full account takeover)
- **Evidence:** `src/integrations/supabase/client.ts:18-23` — `auth: { storage: localStorage, persistSession: true }`. With CSP missing (S-001) and an editor app that displays user-pasted content (titles, captions, voice scripts) inside admin views, any reflected XSS lifts the JWT and RLS no longer protects the user — the token *is* the user.
- **Why it matters:** The standard Supabase trade-off for an SPA, but for paying users with stored payment methods + AI credits, the cost of takeover is real money.
- **Fix:** Either (a) accept the trade-off and harden by shipping S-001 + dompurify on every admin-facing render, or (b) switch to `@supabase/ssr` cookie storage with HttpOnly+Secure+SameSite=Lax (requires a server component). Recommendation: option (a) for cost, but only if S-001 ships first. Document the choice in `DEPLOYMENT_SECURITY.md`.
- **Effort:** M (option a) / L (option b)

#### S-003 [CRITICAL] CORS allowlist hard-codes `http://localhost:8080` and `:5173` — production functions accept dev-origin credentialed requests
- **Evidence:** `supabase/functions/_shared/cors.ts:9-16` — `ALLOWED_ORIGINS` includes both localhost ports unconditionally. There is no environment guard branching on `Deno.env.get("DENO_DEPLOYMENT_ID")`.
- **Why it matters:** An attacker who can get a victim to visit a localhost page (a dev tool, locally-running malware, or a `127.0.0.1` DNS-rebound endpoint) gets the production function to respond with `Access-Control-Allow-Origin: http://localhost:8080`, enabling cross-origin reads of user data using the victim's JWT.
- **Fix:** in `getCorsHeaders`, branch on `Deno.env.get("DENO_DEPLOYMENT_ID")` (or a dedicated `MOTIONMAX_ENV` env) — if production, drop localhost entries from the allowlist; otherwise keep them. Alternative: move localhost entries into the `ALLOWED_ORIGIN` env var and never bake them into source.
- **Effort:** XS

#### S-004 [MAJOR] Errors echo raw exception messages to clients
- **Evidence:** `supabase/functions/admin-stats/index.ts:1063-1069` — `catch { return new Response(JSON.stringify({ error: errorMessage }), …, status: 500 })`. Same pattern repeats in `supabase/functions/get-shared-project/index.ts:155-160` (`error: e instanceof Error ? e.message : "Unknown error"`).
- **Why it matters:** Postgres error text leaks schema/column names; Stripe / FFmpeg errors leak internal code paths — useful reconnaissance for A01/A03 discovery and for crafting injection probes.
- **Fix:** return `{ error: "Internal error", request_id: crypto.randomUUID() }` and `Sentry.captureException(error, { extra: { request_id } })` with the real error. Apply to every `catch` block in `supabase/functions/**/index.ts` via a shared `handleError` helper.
- **Effort:** S

#### S-005 [MAJOR] No content-type validation on POST bodies before `req.json()` in admin / billing edges
- **Evidence:** `supabase/functions/admin-stats/index.ts:91` (`await req.json()` with no `Content-Type` check), same pattern across action-dispatching edges.
- **Why it matters:** Permits "simple-request" CSRF where a victim's browser sends a `text/plain` POST without preflight; combined with S-003 (localhost in prod CORS) the cross-origin read path widens.
- **Fix:** at top of handler, `if (req.method === "POST" && !(req.headers.get("content-type") ?? "").includes("application/json")) return new Response(null, { status: 415 });`. Add to a shared middleware helper.
- **Effort:** S

---

### A01 — Broken Access Control

#### S-006 [CRITICAL] `serve-media` IDOR check is `filePath.includes(user.id)` — substring match, not path-prefix match
- **Evidence:** `supabase/functions/serve-media/index.ts:88` — `if (!filePath.includes(user.id)) return 403;`. UUIDs make collision astronomically unlikely *in practice*, but the check is wrong: any path that contains the caller's user-id as a substring anywhere passes — and the path is then passed to `supabase.storage.from(bucket).createSignedUrl(filePath, 300)` which does NOT enforce ownership at the storage layer.
- **Why it matters:** Two failure modes: (1) if Supabase storage RLS for these buckets is permissive (e.g. service-role usage bypasses it), an authenticated attacker can probe arbitrary `<other-uid>/<path>` constructions that happen to contain their own UUID; (2) any future change that removes the substring check or reorders the path prefix has no defense in depth. Also, `Content-Disposition: attachment; filename="${filename}"` at line 115 is built from the URL-derived filename with no escaping — a CRLF-injection or quote-injection vector if filenames ever contain those chars.
- **Fix:** replace `filePath.includes(user.id)` with `filePath.startsWith(user.id + "/")` so the user-id MUST be the first path segment. Also: percent-encode `filename` before splicing into `Content-Disposition`, or use `filename*=UTF-8''<encoded>`. Verify storage RLS policy for each `ALLOWED_BUCKETS` entry rejects cross-user reads even with service-role-minted signed URLs (or stop using service-role here and use the user-scoped client instead).
- **Effort:** XS for the path check; S for storage RLS verification.

#### S-007 [CRITICAL] `Auth.tsx` lockout is in-memory only and lasts 30 seconds — trivially bypassed by page refresh; checklist requires 15 min
- **Evidence:** `src/pages/Auth.tsx:24-25, 103-104, 158-164` — `const LOCKOUT_DURATION_MS = 30_000; const failedAttemptsRef = useRef(0); const [lockedUntil, setLockedUntil] = useState<number>(0);`. Both the counter and the lock are React state/refs, lost on F5/tab-reopen, and per-tab not per-account. The OWASP checklist (`checklists/owasp-top-10.md` line 57) requires a 15-minute lockout after N failed attempts.
- **Why it matters:** A scripted credential-stuffing attack reloads the SPA between attempts and never sees the lockout. AUDIENCE is on mobile carrier NAT (creators on the go) so Supabase's per-IP rate limit also fails. Account takeover here gives an attacker stored payment methods and AI credits.
- **Fix:** track failures server-side in an `auth_failures` table keyed by lower(email), enforced by a Supabase edge function called *before* `signInWithPassword`. After 5 failures within 15 min, reject for 15 min and trigger an alert email via existing `_shared/resend.ts` (`sendPaymentFailedEmail`-style template). Keep the client-side lockout as a UX hint only.
- **Effort:** M

#### S-008 [CRITICAL] Admin role check is single-table lookup with no MFA gate; admin audit-log inserts are fire-and-forget
- **Evidence:** `supabase/functions/admin-stats/index.ts:74-87` — admin proven by a single SELECT against `user_roles` with no `aal2`/MFA check. Audit inserts are `.catch(() => {})` at lines 386-395, 567-577, 624-633, 663-672, 877, 1027-1039 — silent on failure. Combined with S-002 (admin JWT in localStorage), a single XSS or stolen admin device gives full system control with no MFA backstop and no reliable audit trail.
- **Why it matters:** Admin endpoints touch all financial reporting, all user PII, and have a `admin-hard-delete-user` and `admin-force-signout` cousin. Fire-and-forget audit means an attacker who DoS's the database insert leaves no trace.
- **Fix:** (a) require Supabase MFA enrollment for any account in `user_roles.role='admin'`; reject the request unless the JWT carries `aal2` (`user.aal === "aal2"`). (b) `await` the audit insert; on failure, write `console.error({ level: "ERROR", event: "audit_log_insert_failed", admin_id, action, target_id })` so Sentry/log aggregation alerts. For destructive endpoints (`admin-hard-delete-user`, `admin-force-signout`, `admin-send-newsletter`), block the operation if the audit insert fails.
- **Effort:** M

#### S-009 [MAJOR] Six SECURITY DEFINER functions in migrations lack an explicit `SET search_path` — Postgres privilege-escalation footgun
- **Evidence:** Cross-checked all `SECURITY DEFINER` definitions against `SET search_path` declarations. Files with SECURITY DEFINER but no search_path on the function:
  - `supabase/migrations/20260131003825_53f2ca87-8863-4138-b14c-0c077f623cb8.sql`
  - `supabase/migrations/20260318223400_add_update_scene_field_rpc.sql` (later remediated by `20260404000001_fix_credit_security.sql:53-67` which adds search_path AND auth check — confirmed)
  - `supabase/migrations/20260320210500_add_storage_lifecycle_cleanup.sql`
  - `supabase/migrations/20260406000001_update_scene_field_json.sql`
  - `supabase/migrations/20260407000001_job_dependencies.sql`
  - `supabase/migrations/20260426000000_admin_read_rls_for_six_tables.sql`
- **Why it matters:** A SECURITY DEFINER function with mutable `search_path` can be hijacked by a lower-privileged user creating a same-named table in an earlier-search schema. Supabase Security Advisor flags this as `function_search_path_mutable`.
- **Fix:** for each listed file, add `SET search_path = public, pg_temp` to the function body and schema-qualify every table reference. Run `supabase db lint` and resolve every `function_search_path_mutable` warning before launch. Add `supabase db lint --linter postgres-extension --linter postgres-function` to CI.
- **Effort:** S–M

#### S-010 [MAJOR] RLS migration history shows tables enabled-then-disabled-then-re-enabled — confirm live state on every user table before launch
- **Evidence:** Migration filenames show RLS toggling cycles in the `20260117*` and `20260121*` clusters (e.g. `20260117014830_*.sql`, `20260117014957_*.sql`, `20260121194252_*.sql`). Until live `pg_class.relrowsecurity` is queried per table, A01 cannot be certified.
- **Fix:** run `select schemaname, tablename, rowsecurity from pg_tables where schemaname='public';` against production; every row must have `rowsecurity = true`. Persist as a CI smoke test (a `.sql` file plus `psql` step) so this can never regress silently. Also enumerate every storage bucket and confirm the storage RLS policy is `(bucket_id = '<bucket>') AND (auth.uid()::text = (storage.foldername(name))[1])` or equivalent prefix-on-uid.
- **Effort:** S

#### S-011 [MAJOR] `update_scene_field` originally granted to `anon` with no auth check — verify the fix migration ran in production
- **Evidence:** `supabase/migrations/20260318223400_add_update_scene_field_rpc.sql:28` — `GRANT EXECUTE ON FUNCTION update_scene_field(...) TO anon;` with no auth check in the body. Remediated by `supabase/migrations/20260404000001_fix_credit_security.sql:56-98` which DROPs and recreates with caller-id check + `REVOKE ALL FROM anon`. Need to verify production migration state actually includes the April 4 fix.
- **Fix:** in production, run `select proacl from pg_proc where proname='update_scene_field';` and confirm `anon` is NOT present in the ACL. Also verify the function body contains the `auth.uid()` ownership check.
- **Effort:** XS

---

### A02 — Cryptographic Failures

#### S-012 [BLOCKER] No CI secret-scan over git history (gitleaks / trufflehog) — cannot rule out a service-role key, Stripe secret, or provider key in past commits
- **Evidence:** `C:\Users\Administrator\motionmax\.env` exists at repo root (300 bytes) with `VITE_SUPABASE_URL=https://ayjbvcikuwknqdrpsdmj.supabase.co` and the publishable anon JWT (exp 2088-07-26 — expected, anon key is public-by-design). `.gitignore` correctly excludes `.env`. Husky hooks present in `.husky/` but no gitleaks or trufflehog in the repo or CI workflows.
- **Why it matters:** the publishable anon key is fine to expose, but absence of any history scan means we cannot certify that no service-role key, Stripe live secret, ElevenLabs / Hypereal / Replicate key has *ever* landed in a commit. For a paid-launch product this is non-negotiable.
- **Fix:** run `gitleaks detect --source . --no-git=false --redact` against the full history before launch; rotate every secret it surfaces. Add `gitleaks` (or GitHub Secret Scanning + push protection) as a required CI check on every PR.
- **Effort:** S to verify, M if rotation needed

#### S-013 [POLISH] Supabase publishable key has 60+ year lifetime
- **Evidence:** `.env:2` — anon JWT exp = 2088-07-26 (62 years). Treating the anon key as a long-lived credential is per Supabase spec, but means a tightening event (post-leak) requires manual ops.
- **Fix:** document the rotation procedure for the anon key in `DEPLOYMENT_SECURITY.md` (config swap + redeploy + hard refresh). No code change.
- **Effort:** XS

---

### A07 — Identification & Authentication Failures

(See S-007 above as the headline A07 finding.)

#### S-014 [MAJOR] Account-enumeration: `getAuthErrorMessage(error.message)` may transform Supabase's generic "Invalid login credentials" into distinct UX messages
- **Evidence:** `src/pages/Auth.tsx:168-170` — `const msg = getAuthErrorMessage(error.message); setErrors({ email: msg, password: " " }); toast.error("Sign in failed", { description: msg });`. Need to read `src/lib/errorMessages.ts` to confirm the function does not produce different messages for "user not found" vs "wrong password" vs "email not confirmed".
- **Fix:** in `errorMessages.ts`, collapse all login-failure cases (`Invalid login credentials`, `Email not confirmed`, `User not found`) to a single "Invalid email or password." string for the login flow. Keep distinct messages only for non-login flows (e.g., signup confirmation).
- **Effort:** XS

#### S-015 [MAJOR] Password-reset token lifetime + Supabase rate-limit config not verified
- **Evidence:** No `supabase/config.toml` reviewed in time budget. Supabase default OTP lifetime is 1 hour (acceptable per checklist line 59), but the project may have raised it.
- **Fix:** confirm `supabase/config.toml` contains `[auth.email] otp_expiry = 3600` (or shorter), `mailer.otp_length >= 6`, and the `[auth.rate_limit]` block does not loosen the defaults. Document the values in `DEPLOYMENT_SECURITY.md`.
- **Effort:** XS

---

### A03 — Injection

#### S-016 [PASS] FFmpeg invocations use safe APIs (no shell interpolation)
- **Evidence:** `worker/src/handlers/export/ffmpegCmd.ts:6, 25, 55, 83` — all use `execFile(...)` with explicit argv arrays. `worker/src/services/fishVoiceClone.ts:19, 40` uses `spawn("ffmpeg", [...])` (also non-shell). No `child_process.exec()` with template-literal command strings was found in the worker.
- **Status:** No action needed. Maintain this pattern — add an ESLint rule (`no-restricted-syntax`) banning `child_process.exec` to lock it in.

#### S-017 [PASS] No `dangerouslySetInnerHTML` in the React tree
- **Evidence:** Grep across `src/**` returned zero matches.
- **Status:** No action needed.

---

### A04 / A08 — Insecure Design & CI Integrity

#### S-018 [MAJOR] Verify every PRIVILEGED route in `rateLimit.ts` actually calls `checkRateLimit`
- **Evidence:** `supabase/functions/_shared/rateLimit.ts:11-27` declares the privileged registry but is just a list. `admin-stats/index.ts:60-71`, `serve-media/index.ts:64-72`, `export-my-data/index.ts:62-68`, `get-shared-project/index.ts:73-85` were verified to call it. The remaining privileged routes (`create-checkout`, `customer-portal`, `delete-account`, `delete-voice`, `clone-voice`, `manage-api-keys`, `migrate-storage`, `generate-video`, `generate-cinematic`, `verify`, `reset-password`, `auth`) need a one-by-one Grep before launch.
- **Fix:** before launch, Grep each privileged route's `index.ts` for a `checkRateLimit` call BEFORE any side-effecting work. Any miss = block launch.
- **Effort:** S

#### S-019 [MAJOR] `get-shared-project` mints 7-day signed URLs for video — too long if a share is later revoked
- **Evidence:** `supabase/functions/get-shared-project/index.ts:137` — `videoUrl = await refreshSignedUrl(supabase, gen.video_url, 604800);` (7 days). Combined with no token rotation on share-revocation, a leaked share-card URL grants playback for a week even after the user clicks "unshare."
- **Fix:** drop the TTL to 1 hour (3600) or align with the share-token expiry; have the share-card frontend re-call `get-shared-project` periodically to refresh URLs. Verify the share-revocation flow also bumps a token version so old responses become invalid.
- **Effort:** S

#### S-020 [MINOR] CI uses pinned actions? Webhook signature verification on inbound webhooks beyond Stripe?
- **Evidence:** `.github/` exists but workflow contents not reviewed in time budget. Inbound webhook surfaces beyond `stripe-webhook` include `resend-webhook` — needs signature verification audit.
- **Fix:** verify (1) every GitHub Action in `.github/workflows/*.yml` is pinned to a full SHA, not a floating tag (per checklist A08); (2) `resend-webhook/index.ts` verifies the Svix signature header from Resend.
- **Effort:** S

---

### A10 — SSRF

#### S-021 [MAJOR] No SSRF guard verified on worker URL fetchers (handleRegenerateImage / processAttachments / nanoBananaEdit)
- **Evidence:** `worker/src/handlers/handleRegenerateImage.ts`, `worker/src/services/processAttachments.ts`, `worker/src/services/nanoBananaEdit.ts` exist; URL inputs likely come partly from AI-provider responses (Hypereal/Replicate/Kling) and partly from user uploads. On Render.com, the cloud metadata endpoint is at `169.254.169.254`.
- **Fix:** wrap every server-side URL fetcher used on user- or AI-provider-supplied URLs in a guard that DNS-resolves the host and rejects RFC1918 (10/8, 172.16/12, 192.168/16), 169.254/16, ::1, fc00::/7. Where possible, restrict to a small allowlist of known provider hostnames.
- **Effort:** M

---

## Production Blockers (must close before launch)

| ID | Title | Owner |
|----|-------|-------|
| S-001 | No production security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) | Pipeline + Forge |
| S-006 | `serve-media` substring IDOR + un-encoded `Content-Disposition` filename | Forge |
| S-012 | No CI secret-scan over git history; cannot rule out leaked secrets in past commits | Pipeline + Verify |

## Top 10 Priority Fixes

| # | ID | Severity | Title | Effort |
|---|----|----------|-------|--------|
| 1 | S-001 | Blocker | Add CSP + HSTS + X-Frame-Options + nosniff + Referrer-Policy + Permissions-Policy at edge | S |
| 2 | S-006 | Blocker | Replace `filePath.includes(user.id)` with `startsWith(user.id + "/")`; encode filename in Content-Disposition | XS |
| 3 | S-012 | Blocker | Run gitleaks against full history; rotate any leaked key; add CI gate | S–M |
| 4 | S-002 | Critical | Decide localStorage trade-off; if keeping, ship CSP first + dompurify on admin views | M |
| 5 | S-003 | Critical | Strip localhost origins from CORS in production via env-guard | XS |
| 6 | S-007 | Critical | Server-side account-level lockout (5 fails / 15 min) keyed on email; replace 30-sec in-memory ref | M |
| 7 | S-008 | Critical | Require MFA (`aal2`) for `user_roles.role='admin'`; await audit-log inserts on destructive ops | M |
| 8 | S-009 | Major | Add `SET search_path = public, pg_temp` to the six SECURITY DEFINER functions missing it | S–M |
| 9 | S-018 | Major | Verify every PRIVILEGED route in `rateLimit.ts` actually calls `checkRateLimit` | S |
| 10 | S-019 | Major | Drop `get-shared-project` signed-URL TTL from 7 days to 1 hour | S |

---

## Open verification items (Unable to verify from static analysis in 15-min budget — flag for re-audit)

- Per-table `pg_class.relrowsecurity` snapshot in production (S-010)
- `supabase/config.toml` rate-limit + OTP-expiry values (S-015)
- Production `pg_proc.proacl` for `update_scene_field` to confirm April 4 remediation shipped (S-011)
- Storage RLS policies per `ALLOWED_BUCKETS` entry — confirm prefix-on-uid (S-006 / S-010)
- `src/lib/errorMessages.ts` for account-enumeration text (S-014)
- `.github/workflows/*.yml` action SHA pinning (S-020)
- `resend-webhook/index.ts` Svix signature verification (S-020)
- SSRF guards on every worker URL fetch path (S-021)
- Grep all 12 remaining privileged routes for `checkRateLimit` invocation (S-018)
- Stripe webhook endpoint URL configured with secret rotation runbook (handler logic verified; ops side untested)

---

## Items verified PASSING (no action needed)

- Stripe webhook signature verification: `supabase/functions/stripe-webhook/index.ts:135-167` — uses `constructEventAsync`, fail-closed on missing secret, body capped at 512 KB at lines 110-130.
- Stripe webhook idempotency: lines 171-188 (check-then-insert) and 568-580 (insert-after-handler) — survives Stripe retries without losing events; comment explains the design choice.
- Refund clawback: lines 528-565 — matches by `stripe_payment_intent_id` (exact match), uses RPC for atomicity.
- Rate-limit fail-closed for privileged routes: `_shared/rateLimit.ts:84-94, 124-128` — DB error on a privileged route returns `allowed:false` rather than allowing through.
- CORS allowlist (apart from S-003) is explicit, not wildcard, with regex-bounded Vercel preview pattern.
- FFmpeg invocations use `execFile`/`spawn` with argv arrays (S-016).
- No `dangerouslySetInnerHTML` in the React tree (S-017).
- `update_scene_field` remediated in April 4 migration (S-011) — auth check + revoke from anon + search_path set.
- `export-my-data` GDPR endpoint: scoped to `user.id` via user-JWT-scoped client, rate limited 1/hour, size cap 10 MB (`supabase/functions/export-my-data/index.ts:17-67`).

---

*Findings limited by 15-minute time budget. The high-confidence finds are static-evidence-backed; the IDOR / SSRF / config items are flagged with concrete file pointers so remediators can execute without re-discovery.*
