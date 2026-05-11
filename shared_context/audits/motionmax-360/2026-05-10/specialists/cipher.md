# Cipher — §6 Security: Encryption + Secrets — motionmax-360 — 2026-05-10

**Specialist:** Cipher (Cryptography & Privacy)
**Category:** §6 Security — encryption + secrets (focus: hardcoded secrets, client-exposed env vars, secret rotation, data-at-rest, data-in-transit, PII redaction in logs)
**Audience:** tool-savvy creative adults; mobile-heavy; US-first; 11 languages
**Method:** Static analysis of `C:\Users\Administrator\motionmax` (HEAD), git history grep, RLS policy review, edge-function source read. No runtime probes.

---

## Summary

The codebase shows above-average security craftsmanship in several places — Stripe webhook signature verification is correct, AES-256-GCM with PBKDF2 and per-user salts encrypts user-stored AI provider keys, key rotation slot (`ENCRYPTION_KEY_PREV`) is wired, structured logger and Sentry both scrub `email|token|password|key|secret` keys, CORS never wildcards, security headers (HSTS preload, CSP, frame-ancestors none, Permissions-Policy) ship at the Vercel edge, and signed media URLs default to short TTLs.

That said, four findings are production-blocking: (1) the original Supabase project's anon key was committed to the initial `.env` and lives in git history forever, (2) the `scene-images` storage bucket grants `anon` SELECT and INSERT on a 100 MB-limit bucket, (3) the `videos` bucket grants `anon` SELECT and INSERT on a 500 MB-limit public bucket, (4) `/api/video/*` and `/api/media/*` rewrites in `vercel.json` hardcode the production Supabase project ref — fine, but rotating projects requires a code change instead of an env var.

---

## Findings (grouped by severity, then file)

### Blocker

#### B1. Original Supabase project's anon key + project ref is permanently in git history
- **Category:** §6 Security — secrets management
- **Severity:** Blocker
- **Issue:** The initial commit `b9148c1` (`Initial commit of MotionMax code`, 2026-03-03) committed `.env` containing `VITE_SUPABASE_PROJECT_ID=hesnceozbedzrgvylqrm` and a working anon JWT (`exp` 2083731292 = year 2036). The cleanup commit `211494a` (2026-03-09) only removed it from HEAD; git history still serves it via `git show b9148c1:.env`.
- **Evidence:** `git show b9148c1:.env` returns the JWT; `git log --all --diff-filter=D -- .env` shows the deletion commit. The current production anon key (`ayjbvcikuwknqdrpsdmj` project) is not in git history (verified via `git ls-files | grep .env` returns only `.env.example`).
- **Why this matters:** Anon keys are not "secret" in the bearer-token sense, but they ARE the entry point that all RLS depends on. If `hesnceozbedzrgvylqrm` was the dev/staging project that was decommissioned, low risk. If it is still alive (or was migrated to the current prod), an attacker can read the JWT, hit its REST endpoint, and probe RLS until they find a permissive policy or a bug. JWT exp is 2036.
- **Fix:** Solution: confirm `hesnceozbedzrgvylqrm` is fully deleted or its anon key has been rotated; document in `DEPLOYMENT_SECURITY.md`. Location: Supabase dashboard for old project + `DEPLOYMENT_SECURITY.md`. How: (a) in Supabase, go to Project Settings → API → Reset anon key for `hesnceozbedzrgvylqrm` (or delete the project if dead); (b) BFG/git-filter-repo to rewrite history is optional (high friction, breaks all clones) — the cheaper fix is the anon-key rotation; (c) add a `git secrets`/`gitleaks` pre-commit hook so this never reoccurs. Effort: S.

#### B2. `scene-images` bucket grants `anon` INSERT and SELECT (no auth, no path scoping)
- **Category:** §6 Security — file upload, OWASP A01 (broken access control)
- **Severity:** Blocker
- **Issue:** Bucket `scene-images` is created `public: false` but the policies created in the same migration grant `anon` role both `SELECT` and `INSERT` with `USING (bucket_id = 'scene-images')` — no `auth.uid()` check, no path constraint, no owner match.
- **Evidence:** `supabase/migrations/20260315195000_create_audio_bucket.sql:64-72`:
  ```sql
  CREATE POLICY "anon_read_scene_images" ON storage.objects
    FOR SELECT TO anon USING (bucket_id = 'scene-images');
  CREATE POLICY "anon_upload_scene_images" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'scene-images');
  ```
  Bucket spec at `:44-52` sets `file_size_limit = 104857600` (100 MB), `allowed_mime_types = ['image/png','image/jpeg','image/webp']`.
- **Why this matters:** Anyone with the publishable anon key (i.e. the entire internet — it ships in the JS bundle) can (a) enumerate every other user's uploaded scene reference image (privacy leak — these may include faces, brands, IP) and (b) upload up to 100 MB image files to your storage account at zero cost to them and direct cost to MotionMax (Supabase storage + egress is billed). This is also a perfect host for image-based payload distribution / malware staging.
- **Fix:** Solution: drop the two `anon_*_scene_images` policies and replace `authenticated_*` policies with owner-scoped variants. Location: new migration replacing policies in `supabase/migrations/20260315195000_create_audio_bucket.sql:54-72`. How:
  ```sql
  DROP POLICY "anon_read_scene_images" ON storage.objects;
  DROP POLICY "anon_upload_scene_images" ON storage.objects;
  DROP POLICY "authenticated_read_scene_images" ON storage.objects;
  DROP POLICY "authenticated_upload_scene_images" ON storage.objects;
  CREATE POLICY "owner_rw_scene_images" ON storage.objects
    FOR ALL TO authenticated
    USING  (bucket_id = 'scene-images' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'scene-images' AND (storage.foldername(name))[1] = auth.uid()::text);
  ```
  Update upload code to write to `${userId}/...` paths. Effort: M (because client upload paths must be updated in `src/lib/attachmentProcessor.ts`).

#### B3. `videos` bucket is public + grants `anon` INSERT of 500 MB files
- **Category:** §6 Security — file upload, infrastructure cost, OWASP A04 (insecure design)
- **Severity:** Blocker
- **Issue:** Bucket `videos` is created `public: true` with a 500 MB size cap and broad mime list, then policies grant `anon` both `SELECT` and `INSERT`. Comment claims "worker uses anon key" but the worker actually has `SUPABASE_SERVICE_ROLE_KEY` set (`worker/.env` confirms), so the anon-write policy is unnecessary AND open to the public.
- **Evidence:** `supabase/migrations/20260309013400_create_videos_bucket.sql:2-9` (public:true, 500MB), `:32-40`:
  ```sql
  CREATE POLICY "anon_upload_videos" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'videos');
  CREATE POLICY "anon_read_videos" ON storage.objects
    FOR SELECT TO anon USING (bucket_id = 'videos');
  ```
  Worker uses service role per `supabase/functions/stripe-webhook/index.ts:103-105` pattern (same `SUPABASE_SERVICE_ROLE_KEY` env in `worker/.env`).
- **Why this matters:** Anyone holding the publishable anon key can upload up to 500 MB MP4/WebM files to your storage. Egress + storage cost is uncapped. Also enables the bucket to be used as a malware/IP-violation distribution surface that points back to `motionmax.io`. Public read is acceptable for shareable rendered videos but only if the path is unguessable; combined with anon-write, an attacker can upload at known paths and link them.
- **Fix:** Solution: drop `anon_upload_videos`; restrict authenticated writes to owner-prefixed paths; keep public read only for files under a `/public/` prefix; worker writes via service role bypass anyway. Location: new migration; reference policies at `supabase/migrations/20260309013400_create_videos_bucket.sql:32-40`. How:
  ```sql
  DROP POLICY "anon_upload_videos" ON storage.objects;
  DROP POLICY "authenticated_upload_videos" ON storage.objects;
  CREATE POLICY "owner_upload_videos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
  ```
  Effort: S (worker is unaffected — it uses service role).

### Critical

#### C1. Worker `/health` endpoint emits internal infrastructure detail with `Access-Control-Allow-Origin: *`
- **Category:** §6 Security — information disclosure
- **Severity:** Critical
- **Issue:** `/health` returns the worker's PID, Node version, hostname, exact memory footprint, and active job counts to any caller (no auth) with `Access-Control-Allow-Origin: *`. While `/metrics` correctly requires Bearer token, `/health` is unprotected and leaks reconnaissance data.
- **Evidence:** `worker/src/healthServer.ts:142-144`:
  ```ts
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  ```
  Response includes `system: { platform, nodeVersion, pid }` (`:71-75`). Render needs `/health` for liveness only and only checks status code — no need for the body.
- **Why this matters:** Render's healthcheck only inspects status code, but anyone on the internet can probe the body to fingerprint Node version (CVE targeting), see exact memory headroom (timing attack windows), and observe job-queue depth (when to attack). The `*` CORS lets a hostile webpage script the probe from a victim's browser.
- **Fix:** Solution: keep `/health` returning status-only (no body details) for unauth callers; gate the detail body behind the same Bearer token as `/metrics`; remove `Access-Control-Allow-Origin: *` (use the same allowlist pattern as the edge functions). Location: `worker/src/healthServer.ts:142, 148-167`. How: only emit `{status:"ok"}` when `authToken` not presented; require Bearer for the detail body. Effort: S.

#### C2. Worker `/metrics` Bearer comparison is non-constant-time
- **Category:** §6 Security — timing attack
- **Severity:** Critical
- **Issue:** `auth !== Bearer ${authToken}` uses JS string `!==` which short-circuits on the first mismatched byte, making byte-by-byte timing-attack token discovery theoretically possible.
- **Evidence:** `worker/src/healthServer.ts:158`:
  ```ts
  if (!auth || auth !== `Bearer ${authToken}`) {
  ```
- **Why this matters:** Practical attack surface is small (HTTP latency dwarfs string-compare timing on a public endpoint), but Cipher rule #6 says crypto-adjacent comparisons are constant-time. With Render's HTTP front-end this is mostly defence-in-depth, but it's cheap to fix and leaving it makes the same pattern propagate.
- **Fix:** Solution: use Node's `crypto.timingSafeEqual` after length check. Location: `worker/src/healthServer.ts:158`. How:
  ```ts
  import { timingSafeEqual } from "crypto";
  const expected = Buffer.from(`Bearer ${authToken}`);
  const got = Buffer.from(auth ?? "");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) { /* 401 */ }
  ```
  Effort: XS.

#### C3. CSP allows inline styles (`style-src 'self' 'unsafe-inline'`)
- **Category:** §6 Security — CSP, XSS defence
- **Severity:** Critical
- **Issue:** The Vercel CSP permits `'unsafe-inline'` in `style-src`. Combined with a React + shadcn stack that uses Tailwind's compiled stylesheet, inline styles are mostly Radix's `<style>` injection and dynamic style attributes. Since `script-src` already excludes `'unsafe-inline'`, classic JS XSS is blocked — but a sufficiently-clever style-injection (CSS exfiltration via background-image attribute selectors, a known pattern) can leak DOM contents.
- **Evidence:** `vercel.json` headers source `/(.*)`, value of `Content-Security-Policy`: `... style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ...`
- **Why this matters:** Audience is creative adults uploading personal content (scripts, voices, faces). CSS-based exfiltration of authenticated DOM (e.g., reading the user's email shown in the dropdown) is mature attack tradecraft.
- **Fix:** Solution: switch to CSP nonces for inline styles, OR move all inline styles to compiled Tailwind classes / CSS modules, then drop `'unsafe-inline'`. Location: `vercel.json` CSP value. How: as an interim, document the residual risk; the cleaner fix is `style-src 'self' https://fonts.googleapis.com 'nonce-<per-request>'` with Vercel middleware injecting the nonce. Effort: M.

#### C4. CSP allows third-party connect to `https://api.openai.com` from the browser
- **Category:** §6 Security — supply-chain / data exfiltration surface
- **Severity:** Critical
- **Issue:** `connect-src` in the CSP includes `https://api.openai.com` — that means the browser is allowed to talk directly to OpenAI. Either (a) the frontend really does call OpenAI client-side using a user-stored key (acceptable but risky if that key isn't always end-to-end encrypted as `manage-api-keys` claims), or (b) it's a leftover allowlist entry from a removed feature.
- **Evidence:** `vercel.json` `connect-src ... https://api.openai.com`. No occurrences of `api.openai.com` were found in committed source paths I scanned. The codebase routes most LLM traffic via OpenRouter and Hypereal in the worker (server-side).
- **Why this matters:** Every CSP allowlist entry is a potential exfiltration channel for an injected script. If the OpenAI direct-client call no longer exists, removing the entry tightens the policy. If it does exist, it likely uses a user-provided API key — verify the key never lands in `localStorage`/`sessionStorage`.
- **Fix:** Solution: grep `src/` for `api.openai.com` (I saw none); if zero hits, remove from CSP. Location: `vercel.json`, `connect-src` directive. Effort: XS.

### Major

#### M1. Email field redaction missed by Sentry's `sendDefaultPii` not being explicitly disabled
- **Category:** §6 Security — PII in error tracker
- **Severity:** Major
- **Issue:** `src/lib/sentry.ts:67-91` initializes Sentry with custom `beforeSend` scrubbing of `password|token|email|jwt|key|secret` from `event.extra` and `event.request.data`. However it does NOT explicitly set `sendDefaultPii: false`. Sentry SDK v10 defaults vary; if the default is `true` (it became `true` in `@sentry/browser` 8.x), then `event.user.email`, IP address, headers, cookies are still sent — bypassing the custom scrub.
- **Evidence:** `src/lib/sentry.ts:67-91` — no `sendDefaultPii` key. Package: `"@sentry/react": "^10.45.0"` (`package.json`). Sentry v8+ enabled `sendDefaultPii` by default; v10 retains that behavior unless overridden.
- **Why this matters:** Per Cipher rule #3, never log PII. Event-level scrubbing of `extra` is correct but incomplete — the user object and request headers (which include `Cookie`, `Authorization` after auto-instrument) bypass it.
- **Fix:** Solution: add `sendDefaultPii: false` to `Sentry.init({ ... })` call. Location: `src/lib/sentry.ts:67-91`. How:
  ```ts
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    environment: ...
  });
  ```
  Mirror in worker `worker/src/index.ts:2` (`Sentry.init({ dsn: ..., environment: ..., tracesSampleRate: 0.1 })`). Effort: XS.

#### M2. `vercel.json` rewrites hardcode the production Supabase project ref
- **Category:** §6 Security — secret rotation; key-mobility (Cipher rule #4)
- **Severity:** Major
- **Issue:** `vercel.json` hardcodes `https://ayjbvcikuwknqdrpsdmj.supabase.co` in three rewrite destinations. The project ref isn't a secret, but tying it into the deploy manifest means rotating the Supabase project (e.g., disaster recovery, regional move, environment swap) requires a code change + deploy instead of an env var swap. This is a Cipher rule #4 violation: "If modifying a key requires codebase changes, the architecture is wrong."
- **Evidence:** `vercel.json` rewrites `/api/video/:path*` → `https://ayjbvcikuwknqdrpsdmj.supabase.co/functions/v1/serve-media...`, `/api/media/:bucket/:path*` → same, `/share/:id` → same.
- **Fix:** Solution: Vercel rewrites support `{NEXT_PUBLIC_*}` syntax in destinations only via Edge Middleware; the cleanest fix is to move these to Vercel Edge Middleware or a proxy edge function that reads `process.env.SUPABASE_PROJECT_URL`. Location: `vercel.json` (3 rewrites). Effort: M.

#### M3. `audio` bucket grants `anon` UPDATE without owner/path scoping
- **Category:** §6 Security — data integrity / RLS
- **Severity:** Major
- **Issue:** `supabase/migrations/20260315195000_create_audio_bucket.sql:39-41` (referenced in the read window) creates a `FOR UPDATE TO anon USING (bucket_id = 'audio')` policy — anyone holding the anon key can overwrite any audio file in the bucket. Even though the bucket was made private (`public:false` per `20260117014047_a37c28a6-c241-488c-b94c-6bb69dd65737.sql:2`), an UPDATE policy without owner check lets an authenticated impersonator overwrite anyone's audio.
- **Evidence:** `supabase/migrations/20260315195000_create_audio_bucket.sql:39-41`:
  ```sql
  FOR UPDATE TO anon
  USING (bucket_id = 'audio');
  ```
- **Why this matters:** Combined with brute-forceable file paths (UUIDs are not — but if any path is predictable like `${userId}/voiceover.mp3`, this becomes a CSRF-style overwrite vector targeting voiceover audio).
- **Fix:** Solution: drop the unconditional `FOR UPDATE TO anon`; move all writes through service-role-backed edge functions. Location: same migration; create a new migration to drop. Effort: S.

#### M4. `manage-api-keys` legacy SHA-256 KDF kept indefinitely; no forced re-encryption sweep
- **Category:** §6 Security — cryptographic agility
- **Severity:** Major
- **Issue:** `supabase/functions/manage-api-keys/index.ts:48-65` keeps `getLegacyEncryptionKey()` (single-round SHA-256) for decrypting unprefixed (pre-v2) ciphertexts; `decrypt` will silently use it for ciphertexts missing both `v3:` and `v2:` prefixes (`:103-106`). The migration logic returns `needsReEncrypt: true` only on `ENCRYPTION_KEY_PREV` fallback, NOT on legacy decryption. So legacy SHA-256-derived ciphertexts can persist indefinitely.
- **Evidence:** `supabase/functions/manage-api-keys/index.ts:100-106` and onwards (legacy branch handling). The `needsReEncrypt` flag is set only inside the `isV3` branch with `prevKeyString` fallback (`:107-119`).
- **Why this matters:** PBKDF2 with 100k iterations + per-user salt is strong; SHA-256 single-round is brittle to GPU brute force if the master key were ever leaked. Cryptographic-agility hygiene (rule #4: rotation must not require code changes) requires that we eventually migrate every row.
- **Fix:** Solution: extend `decrypt` to set `needsReEncrypt = true` for any non-v3 ciphertext, then add a one-time migration job that decrypts and re-encrypts all rows; after a deploy window, delete `getLegacyEncryptionKey`. Location: `supabase/functions/manage-api-keys/index.ts:100-130`. Effort: M.

#### M5. Stripe price/product IDs hardcoded in client bundle as fallbacks
- **Category:** §6 Security — config-as-code drift; Cipher rule #4
- **Severity:** Major
- **Issue:** `src/config/stripeProducts.ts:17-59` hardcodes 8 live Stripe `price_*` and `prod_*` IDs as `??` fallbacks. They are not secrets (price IDs are public), but baking them in means a Stripe-side rename (e.g., re-pricing for a US/EU split) ships the old ID until a code deploy lands. They also confirm to a snooper which prices are active without env access.
- **Evidence:** `src/config/stripeProducts.ts:17` `priceId: env.VITE_STRIPE_CREATOR_MONTHLY ?? "price_1TJ1Z86hfVkBDzkS8irL0G15"`, plus 7 more.
- **Fix:** Solution: drop `??` defaults; throw at startup if any `VITE_STRIPE_*` env is missing in production; surface as a build-time error. Location: `src/config/stripeProducts.ts:17-59`. Effort: S.

#### M6. `notify-signup-welcome` invocation hardcodes `?? ""` fallback for `VITE_SUPABASE_URL`
- **Category:** §6 Security — silent failure
- **Severity:** Major
- **Issue:** `src/hooks/useAuth.ts:94` builds the welcome-email URL as `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/notify-signup-welcome`. If the env var is unset, the request fires at `/functions/v1/notify-signup-welcome` (relative URL) which on `motionmax.io` resolves to a 404 — silent welcome-email loss. Same anti-pattern in `src/components/admin/users/UserDrawer.tsx:366,514,530,547` and `src/components/admin/AdminUserDetails.tsx:173,660`.
- **Evidence:** Grep matches above; client.ts:8-9 already throws when these vars are unset, so the `?? ""` fallback is unreachable in practice — but the pattern is brittle and security-relevant because admin force-signout (`:514`), reset-link (`:530`), and hard-delete (`:547`) silently 404 in misconfigured envs.
- **Fix:** Solution: drop the `?? ""` fallback; rely on `client.ts:8-9` startup throws to enforce env presence; replace with a typed helper `getSupabaseFunctionUrl(name: string)` that throws if URL is missing. Location: 7 call sites listed above. Effort: S.

### Minor

#### Mn1. CSP `script-src 'self'` is missing nonces; relies on no committed inline `<script>` blocks
- **Category:** §6 Security — defence in depth
- **Severity:** Minor
- **Issue:** `script-src` is `'self' https://js.stripe.com https://www.googletagmanager.com` — strict (good), but no `'nonce-...'` and no `'strict-dynamic'`. If anything inline ever lands in `index.html` (it currently does not), it silently breaks; conversely if a future build inserts inline GA bootstrap, it will be blocked.
- **Evidence:** `vercel.json` CSP `script-src 'self' https://js.stripe.com https://www.googletagmanager.com`. `index.html` has no inline `<script>` blocks (verified).
- **Fix:** Solution: leave as-is; document that inline scripts are forbidden. Location: `vercel.json`. Effort: XS.

#### Mn2. `Permissions-Policy` enables microphone for `self` but Voice Lab is the only consumer
- **Category:** §6 Security — least privilege
- **Severity:** Minor
- **Issue:** `Permissions-Policy: camera=(), microphone=(self), geolocation=()`. Microphone is needed for voice cloning, but enabling it across every route (`/(.*)`) means a future XSS could attempt `getUserMedia()` from any page. Tighter policy gates by route.
- **Evidence:** `vercel.json` headers source `/(.*)`.
- **Fix:** Solution: split headers — `microphone=()` everywhere except `/voice-lab/(.*)` and `/lab/(.*)` where it becomes `(self)`. Location: `vercel.json` headers array. Effort: S.

#### Mn3. PWA service worker uses `skipWaiting + clientsClaim` — old SW cannot be paused for security advisory
- **Category:** §6 Security — incident response readiness
- **Severity:** Minor
- **Issue:** `vite.config.ts:42-58` enables `skipWaiting: true, clientsClaim: true`. This is the right call for UX (avoids stale code), but during a security incident there is no kill-switch to freeze the SW on the previous version while the fix is rolled.
- **Evidence:** `vite.config.ts:43-58`.
- **Fix:** Solution: add a runtime "SW shutdown" feature flag (read at SW install) that calls `self.unregister()` if the kill-switch is set in a small JSON manifest fetched from the origin. Location: `vite.config.ts` workbox config + new `public/sw-killswitch.json`. Effort: M. (Document as runbook even if not implemented.)

#### Mn4. `worker/src/handlers/autopost/handleEmailDelivery.ts:79,84` logs raw filename / message
- **Category:** §6 Security — log hygiene
- **Severity:** Minor
- **Issue:** `console.warn` in autopost email-sign failure path embeds the user-controlled `raw` value directly in the log line. If `raw` ever contains an attacker-controlled string (style reference filename), it can break log aggregation parsing or smuggle ANSI/log-injection sequences.
- **Evidence:** `worker/src/handlers/autopost/handleEmailDelivery.ts:79,84`.
- **Fix:** Solution: pass via structured logger context, not interpolation. Location: those two lines. Effort: XS.

#### Mn5. `.env.example` documents `VITE_APP_URL=http://localhost:8080` as default — used as OAuth redirect
- **Category:** §6 Security — open-redirect risk if env unset in prod
- **Severity:** Minor
- **Issue:** `src/hooks/useAuth.ts:132,172` uses `import.meta.env.VITE_APP_URL || window.location.origin` as the OAuth redirect base. If `VITE_APP_URL` is set to something Lovable/preview-deploy-specific by mistake, a Supabase OAuth round-trip could land on the wrong origin. The current fallback (`window.location.origin`) is safe; the env override is the risk.
- **Evidence:** `src/hooks/useAuth.ts:132` `const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;` (and `:172`).
- **Fix:** Solution: validate `VITE_APP_URL` at build time against an allowlist of `motionmax.io|*.vercel.app|localhost`; throw on mismatch. Location: `src/hooks/useAuth.ts` or a new `src/lib/env.ts`. Effort: S.

### Polish

#### P1. `DEPLOYMENT_SECURITY.md` documents the policy but no automated `gitleaks` / pre-commit hook
- **Category:** §6 Security — secret-leak prevention
- **Severity:** Polish
- **Issue:** `.husky/` exists; `package.json` has `lint-staged` for ESLint on TS/TSX only. No `gitleaks`, no `trufflehog`, no entropy check on staged content. The current `.gitignore` is excellent (single authoritative `.env*` block) but is a passive defence.
- **Evidence:** `package.json` `lint-staged` block — no secret scanner. `.husky/` not inspected, but no `gitleaks` config file at repo root (`Glob` for `.gitleaks*`/`gitleaks.toml` returned nothing during scan).
- **Fix:** Solution: add `gitleaks protect --staged --redact` to `.husky/pre-commit` and ship a minimal `.gitleaks.toml` allowlisting `.env.example`. Location: `.husky/pre-commit`, new `.gitleaks.toml`. Effort: S.

#### P2. PostgreSQL `sanitize_log_details` regex allowlist is good — verify it covers OpenRouter / Anthropic key formats
- **Category:** §6 Security — log scrubbing
- **Severity:** Polish
- **Issue:** `supabase/migrations/20260320210300_fix_log_sanitization.sql:98` confirms a Stripe key sanitizer is in place for `system_logs`. Need to confirm patterns also redact `sk-or-...` (OpenRouter), `sk-ant-...` (Anthropic), `re_...` (Resend), `whsec_...` (Stripe webhook secret) — all of which can appear in error payloads if a worker handler stringifies a request body.
- **Evidence:** `Grep` for `sk-or-|sk-ant-|whsec_` found matches only in test fixtures, comments, and the resend-webhook decoder — none in `sanitize_log_details`.
- **Fix:** Solution: extend the regex set in `sanitize_log_details` to cover all six prefixes; add a unit test asserting each is redacted. Location: `supabase/migrations/20260320210300_fix_log_sanitization.sql` — create a follow-up migration. Effort: S.

---

## Production Blockers Table

| ID | File:Line | One-line | Effort |
|----|-----------|----------|--------|
| B1 | `git history @ b9148c1:.env` | Old project anon JWT (exp 2036) is permanently in git history; verify project deleted or rotate | S |
| B2 | `supabase/migrations/20260315195000_create_audio_bucket.sql:64-72` | `scene-images` bucket grants `anon` SELECT + INSERT (100 MB cap) — open upload + open enumeration | M |
| B3 | `supabase/migrations/20260309013400_create_videos_bucket.sql:32-40` | `videos` bucket is `public: true` and grants `anon` INSERT (500 MB cap) — open file dump | S |

## Top 10 Priority Fixes

| Rank | ID | Severity | Fix | Effort |
|------|----|----------|-----|--------|
| 1 | B2 | Blocker | Replace `anon`/`authenticated` blanket scene-images policies with owner-scoped `auth.uid()` policies | M |
| 2 | B3 | Blocker | Drop `anon_upload_videos`; restrict authenticated INSERT to owner-prefixed paths | S |
| 3 | B1 | Blocker | Rotate or confirm-deleted `hesnceozbedzrgvylqrm` Supabase project; add gitleaks pre-commit | S |
| 4 | C1 | Critical | Strip body detail from unauthenticated `/health`; remove `*` CORS | S |
| 5 | C3 | Critical | Replace CSP `style-src 'unsafe-inline'` with nonce or per-request hash | M |
| 6 | C4 | Critical | Audit `connect-src` `https://api.openai.com`; remove if unused | XS |
| 7 | C2 | Critical | Replace `!==` Bearer-token compare with `crypto.timingSafeEqual` | XS |
| 8 | M1 | Major | Set `sendDefaultPii: false` in both `src/lib/sentry.ts:67` and `worker/src/index.ts:2` | XS |
| 9 | M3 | Major | Drop `audio` bucket `FOR UPDATE TO anon` policy; force writes through service-role functions | S |
| 10 | M5 | Major | Drop `??` Stripe price-ID fallbacks; throw at startup when env missing in prod | S |

---

## Items Where I Could Not Verify From Static Analysis

- Whether `hesnceozbedzrgvylqrm` Supabase project is still alive (B1 hinges on this; needs Supabase dashboard access).
- Whether `STRIPE_WEBHOOK_SECRET` and `ENCRYPTION_KEY` are actually set in production Vercel/Supabase env (cannot inspect remote env from local).
- Whether `/api/openai.com` allowlist entry corresponds to a still-active code path (Grep found no matches in `src/`, but compiled-out feature flag could re-introduce).
- TLS/HSTS preload status of `motionmax.io` (would need a network probe; HSTS header is correctly set in `vercel.json` with `max-age=63072000; includeSubDomains; preload`).
- Whether Supabase Auth has password-strength policy / breached-password protection enabled (managed in Supabase dashboard, not in code).

---

## Strengths Observed (no fix needed — bank these)

- Stripe webhook signature verification uses `constructEventAsync` (`stripe-webhook/index.ts:157`) — correct for Deno/WebCrypto.
- Stripe webhook idempotency uses check-first/insert-after pattern (`stripe-webhook/index.ts:171-188`) — handles retry storms.
- AES-256-GCM with PBKDF2 100k iterations + per-user salt (`manage-api-keys/index.ts:6-40`) — strong KDF, agility-ready with `ENCRYPTION_KEY_PREV` slot.
- CORS never wildcards (`supabase/functions/_shared/cors.ts:1-50`) — explicit allowlist with prod-default fallback.
- Sentry `beforeSend` scrubs `password|token|email|jwt|key|secret` keys from `extra` and `request.data` (`src/lib/sentry.ts:84-90`).
- Stripe webhook PII masking via `maskId` for customer/user IDs at info level (`stripe-webhook/index.ts:32-47`).
- Body-size cap on Stripe webhook (`stripe-webhook/index.ts:111-130`) — DoS-resistant.
- Rate limiter has explicit `PRIVILEGED_ROUTES` fail-closed list (`_shared/rateLimit.ts:9-26`) — good fail-mode design.
- Security headers shipped at edge (HSTS `max-age=2y; preload`, `X-Frame-Options DENY`, `frame-ancestors 'none'`, `Referrer-Policy strict-origin-when-cross-origin`) — solid baseline.
- Signed URLs have explicit short TTL on streaming media (`serve-media/index.ts:95` — 300 s) and reasonable default (`signedUrlHelper.ts:41` — 7 days) for non-streaming.
- `voice_samples` and `audio` buckets correctly switched from public to private after initial migration (`20260117014047_*.sql`, `20260131012240_*.sql`).
- Service role key is never referenced from `src/` (verified — no matches for `SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole` in client code).

---

**End of Cipher report.**
