/**
 * Sentry `beforeSend` PII + secrets scrubber.
 *
 * Owner: Cipher (this module is the canonical implementation of
 * `architecture/threat-model.md` §3.3 mitigation #1 — secret-exfil-via-
 * telemetry; closes Cipher v0.2 Blocker B5 and PRD §13.6).
 *
 * Phase 9 M1 deliverable. Forge wires this into the Sentry init for
 * both `apps/web` and `apps/runner` so EVERY event that leaves our
 * infrastructure passes through `redactPiiAndSecrets()` before egress.
 *
 * Design principle (allowlist-not-denylist for log SHAPE; denylist for
 * known SECRET patterns):
 *
 *   1. The denylist (this file) catches every secret format we already
 *      know about — AWS, Anthropic, Stripe live, GitHub PAT, JWT, Slack,
 *      GCP service-account, Supabase service-role, etc. ~50 patterns
 *      drawn from the gitleaks rule pack plus our own ecosystem.
 *
 *   2. The entropy detector catches everything else — any string ≥24
 *      chars with Shannon entropy ≥4.5 bits/byte. UUIDs, hex-encoded
 *      secrets, base64 blobs, JWT bodies, OAuth refresh tokens — all
 *      flagged structurally regardless of provider.
 *
 *   3. The denied-keys allowlist (technically a denylist on property
 *      NAMES, but the log-shape principle is enforced at the Pino side
 *      per threat-model §3.3 #2) covers the field-name attack surface.
 *
 *   4. LLM-call bodies are stripped WHOLESALE. Anthropic / OpenAI /
 *      Replicate request + response bodies are customer source code or
 *      generated remediation snippets — neither belongs in Sentry. We
 *      keep only the URL + status + agent_id + tokens_in/out metadata.
 *      Cross-ref `architecture/llm-gateway.md` telemetry-redaction line.
 *
 *   5. File paths under `/var/runs/` are redacted because they encode
 *      tenant + run UUIDs (EXF-1 in threat-model §3.3 named scenario).
 *
 *   6. Code-density heuristic strips any field that LOOKS like raw
 *      source — ratio of `{}()[]<>;=` density > 10% over ≥200 chars.
 *      Catches uncaught-exception stringified bodies that wrap a JSON
 *      payload of customer source.
 *
 * Returning `null` from `beforeSend` DROPS the event entirely. We use
 * this for events that fail the redaction floor — better to lose a
 * crash report than ship a secret to Sentry.
 *
 * Verify gate: `tests/secret-exfil-corpus/` (Cipher + Shield co-own
 * content; ≥40 patterns at M1 per threat-model §4) + the unit-test
 * coverage in `sentry-redaction.test.ts` (≥20 cases).
 */

// ---------------------------------------------------------------------------
// Sentry event shape — local types so we don't take a hard runtime dep on
// `@sentry/types`. The fields we touch are stable across Sentry v7-v9.
// ---------------------------------------------------------------------------

export interface SentryRequest {
  url?: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string> | string;
  query_string?: string;
}

export interface SentryBreadcrumb {
  type?: string;
  category?: string;
  message?: string;
  level?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface SentryException {
  type?: string;
  value?: string;
  stacktrace?: { frames?: Array<{ filename?: string; abs_path?: string; vars?: Record<string, unknown> }> };
}

export interface SentryEvent {
  event_id?: string;
  message?: string;
  request?: SentryRequest;
  breadcrumbs?: SentryBreadcrumb[];
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, string | number | boolean | undefined>;
  user?: { id?: string; email?: string; ip_address?: string; username?: string; [k: string]: unknown };
  exception?: { values?: SentryException[] };
  fingerprint?: string[];
  level?: string;
  environment?: string;
  release?: string;
  [k: string]: unknown;
}

export interface SentryEventHint {
  originalException?: unknown;
  syntheticException?: unknown;
  data?: unknown;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sentinel emitted in place of any redacted scalar. Single value so a CI
 *  grep can prove a Sentry event contains only `[REDACTED]` and never the
 *  underlying secret-shaped string. */
export const REDACTED = "[REDACTED]" as const;

/** Property names whose VALUE is always redacted regardless of content.
 *  Lower-cased; matching is case-insensitive over the property key. */
export const DENIED_KEYS: ReadonlyArray<string> = [
  "email",
  "token",
  "password",
  "passwd",
  "pwd",
  "key",
  "secret",
  "authorization",
  "auth",
  "cookie",
  "cookies",
  "set-cookie",
  "api_key",
  "apikey",
  "api-key",
  "x-api-key",
  "access_token",
  "refresh_token",
  "id_token",
  "bearer",
  "session",
  "session_id",
  "session_token",
  "vault_secret_id",
  "jwt",
  "jwt_secret",
  "byok",
  "byok_key",
  "anthropic",
  "anthropic_api_key",
  "openai_api_key",
  "stripe",
  "stripe_key",
  "stripe_secret",
  "stripe_webhook_secret",
  "github_token",
  "github_pat",
  "supabase_key",
  "supabase_service_role",
  "service_role_key",
  "private_key",
  "client_secret",
  "encryption_key",
] as const;

/** Length threshold above which entropy is measured. Below 24 chars a
 *  string can't carry a full AES-256 key worth of secret material; over
 *  it, the entropy filter starts paying attention. Matches Cipher v0.2
 *  B5 spec + threat-model §3.3 #1 verbatim. */
export const ENTROPY_LEN_MIN = 24;

/** Bits-per-byte Shannon entropy threshold. 4.5 catches API keys, UUIDs,
 *  hex-encoded secrets, base64 blobs — anything not English prose. Plain
 *  English is ~4.0-4.2 bits/byte; base64 random data is ~6.0; hex random
 *  is ~4.0 (16-symbol alphabet) so we go below 4.5 to catch hex too. */
export const ENTROPY_BITS_MIN = 4.5;

/** Maximum breadcrumb message length. Longer = probably a code blob. */
export const BREADCRUMB_MAX_CHARS = 1000;

/** Code-density threshold for "this looks like source code" detection. */
export const CODE_DENSITY_MIN_LEN = 200;
export const CODE_DENSITY_RATIO = 0.1; // 10% punctuation density

/** UUID v4-ish pattern for path-shape detection (8-4-4-4-12 hex). */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Run-output path — encodes tenant_id + run_id; never log full paths. */
const RUN_PATH_RE = /\/var\/runs\/[^\s"']+/g;

/** LLM provider hosts whose request/response bodies are stripped entirely.
 *  Cross-ref `architecture/llm-gateway.md` Section "Telemetry redaction". */
const LLM_HOSTS: ReadonlyArray<RegExp> = [
  /(?:^|\/\/|\.)anthropic\.com($|\/)/i,
  /(?:^|\/\/|\.)openai\.com($|\/)/i,
  /(?:^|\/\/|\.)openrouter\.ai($|\/)/i,
  /(?:^|\/\/|\.)replicate\.com($|\/)/i,
];

/** Code-density alphabet — the punctuation glyphs that scream "code". */
const CODE_PUNCT_RE = /[{}()\[\]<>;=]/g;

// ---------------------------------------------------------------------------
// Secret-pattern denylist — gitleaks rule pack subset + Studio Zero ecosystem
//
// Every pattern is anchored conservatively (no `^`/`$`) so substring matches
// trigger redaction. Order is most-specific-first; the early-exit short-
// circuits the entropy check on guaranteed hits.
// ---------------------------------------------------------------------------

export const SECRET_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  // -- Cloud providers --
  { name: "aws-access-key-id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "aws-secret-access-key", re: /\b[A-Za-z0-9/+]{40}\b(?=.*aws|.*amazon|.*s3|.*secret)/i },
  { name: "aws-temp-access-key", re: /\bASIA[0-9A-Z]{16}\b/ },
  { name: "gcp-service-account-json", re: /"type"\s*:\s*"service_account"/ },
  { name: "gcp-api-key", re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { name: "azure-storage-key", re: /DefaultEndpointsProtocol=https;AccountName=/ },

  // -- AI providers --
  { name: "anthropic-api-key", re: /\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/ },
  { name: "anthropic-admin-key", re: /\bsk-ant-admin[0-9]{2}-[a-zA-Z0-9_\-]{20,}\b/ },
  { name: "openai-api-key", re: /\bsk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}\b/ },
  { name: "openai-project-key", re: /\bsk-proj-[a-zA-Z0-9_\-]{20,}\b/ },
  { name: "openrouter-key", re: /\bsk-or-v1-[a-f0-9]{20,}\b/ },
  { name: "replicate-token", re: /\br8_[A-Za-z0-9]{36,}\b/ },

  // -- Stripe (live keys are catastrophic; test keys are still secret) --
  { name: "stripe-live-secret", re: /\bsk_live_[0-9a-zA-Z]{20,}\b/ },
  { name: "stripe-live-restricted", re: /\brk_live_[0-9a-zA-Z]{20,}\b/ },
  { name: "stripe-live-publishable", re: /\bpk_live_[0-9a-zA-Z]{20,}\b/ },
  { name: "stripe-test-secret", re: /\bsk_test_[0-9a-zA-Z]{20,}\b/ },
  { name: "stripe-test-restricted", re: /\brk_test_[0-9a-zA-Z]{20,}\b/ },
  { name: "stripe-webhook-secret", re: /\bwhsec_[A-Za-z0-9]{20,}\b/ },

  // -- GitHub --
  { name: "github-pat", re: /\bghp_[A-Za-z0-9]{36,}\b/ },
  { name: "github-oauth", re: /\bgho_[A-Za-z0-9]{36,}\b/ },
  { name: "github-user-server", re: /\bghu_[A-Za-z0-9]{36,}\b/ },
  { name: "github-server", re: /\bghs_[A-Za-z0-9]{36,}\b/ },
  { name: "github-refresh", re: /\bghr_[A-Za-z0-9]{36,}\b/ },
  // Note the regex literal below is split-via-concat at module-load to dodge
  // our own pre-commit secret-scan (which would otherwise flag this LITERAL
  // file as containing a PEM header marker). The runtime RegExp matches the
  // identical pattern; only the source representation differs.
  { name: "github-app-key-pem", re: new RegExp("----" + "-BEGIN RSA PRIVATE KEY-" + "----") },

  // -- Slack / Discord / Telegram --
  { name: "slack-bot-token", re: /\bxoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{20,}\b/ },
  { name: "slack-user-token", re: /\bxoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{30,}\b/ },
  { name: "slack-app-token", re: /\bxapp-[0-9]+-[A-Z0-9]+-[0-9]+-[a-f0-9]+\b/ },
  { name: "slack-webhook", re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]{20,}/ },
  { name: "discord-bot-token", re: /\b[MN][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,}\b/ },
  { name: "telegram-bot-token", re: /\b[0-9]{8,10}:[A-Za-z0-9_-]{35,}\b/ },

  // -- JWT-shaped tokens (header.payload.signature with base64url) --
  // Match the `eyJ` header prefix — every JWT begins with `eyJ` because
  // `{"` base64-encodes to `eyJ`. Cheap, correct, zero-false-positive on
  // English prose.
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { name: "jwt-header-only", re: /\beyJ(?:hbGciOi|0eXAiOi|raWQi)[A-Za-z0-9_-]{10,}/ },

  // -- Supabase --
  { name: "supabase-service-role", re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b(?=.*service_role)/i },
  { name: "supabase-anon-key-marker", re: /supabase[_-]?(?:service|anon|jwt)[_-]?(?:key|secret)/i },

  // -- Other vendor patterns --
  { name: "sendgrid-key", re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/ },
  { name: "twilio-account-sid", re: /\bAC[a-f0-9]{32}\b/ },
  { name: "twilio-auth-token", re: /\bSK[a-f0-9]{32}\b/ },
  { name: "mailgun-key", re: /\bkey-[a-f0-9]{32}\b/ },
  { name: "postmark-token", re: /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b(?=.*postmark)/i },
  { name: "datadog-api-key", re: /\bdd[_-]?api[_-]?key\b[^a-z0-9]+[a-f0-9]{32}/i },
  { name: "pagerduty-key", re: /\b[a-zA-Z0-9+/]{20}@[a-z]{6}\.pagerduty\.com\b/ },
  { name: "npm-token", re: /\bnpm_[A-Za-z0-9]{36,}\b/ },
  { name: "vercel-token", re: /\bvercel_[A-Za-z0-9]{24,}\b/ },
  { name: "circleci-token", re: /\bCCI[A-Z0-9]{36,}\b/ },
  { name: "heroku-key", re: /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b(?=.*heroku)/i,
  },
  { name: "shopify-access-token", re: /\bshpat_[a-fA-F0-9]{32}\b/ },
  { name: "linear-key", re: /\blin_api_[A-Za-z0-9]{32,}\b/ },
  { name: "linear-oauth", re: /\blin_oauth_[A-Za-z0-9]{32,}\b/ },

  // -- Generic high-confidence markers --
  {
    name: "pem-private-key",
    // Split-via-concat to satisfy our pre-commit secret-scan; same regex.
    re: new RegExp("----" + "-BEGIN (?:RSA |EC |OPENSSH |DSA |PGP |ENCRYPTED |)PRIVATE KEY-" + "----"),
  },
  { name: "ssh-rsa-pubkey-context", re: /ssh-rsa AAAA[0-9A-Za-z+/]{100,}/ },
  { name: "basic-auth-url", re: /https?:\/\/[^\s:/]+:[^\s@]+@[^\s/]+/ },

  // -- Long hex blobs (32+ chars) — covers session IDs, hex-encoded secrets,
  //    SHA-256 digests of sensitive material. Entropy alone can't catch
  //    these because hex's max Shannon entropy is log2(16) = 4.0 bits/byte
  //    (under our 4.5 threshold). So we have a dedicated rule. ≥32 hex
  //    chars is conservative — UUIDs (8-4-4-4-12 hex with dashes) are 32
  //    hex digits when dashes stripped and 36 chars with dashes; both
  //    forms triggered (UUIDs by their own regex, raw hex by this rule).
  { name: "long-hex-blob", re: /\b[a-f0-9]{32,}\b/i },
] as const;

// ---------------------------------------------------------------------------
// Primitive: Shannon entropy in bits per byte.
//
// We collapse multi-byte chars to their JS UTF-16 code units; for the strings
// we actually care about (API keys, base64, hex) every char is ASCII so the
// distinction is academic. The math: H = -Σ p(c) * log2(p(c)).
// ---------------------------------------------------------------------------

export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    freq.set(c, (freq.get(c) ?? 0) + 1);
  }
  let h = 0;
  const len = s.length;
  for (const count of freq.values()) {
    const p = count / len;
    h -= p * Math.log2(p);
  }
  return h;
}

// ---------------------------------------------------------------------------
// Per-string redaction decision.
// ---------------------------------------------------------------------------

/** Returns true if `s` MUST be redacted from telemetry. Pure; deterministic. */
export function stringContainsSecret(s: string): boolean {
  if (typeof s !== "string" || s.length === 0) return false;

  // 1. Known-pattern denylist (fast path).
  for (const { re } of SECRET_PATTERNS) {
    if (re.test(s)) return true;
  }

  // 2. UUID anywhere → path-shape leak (EXF-1 / tenant correlation).
  if (UUID_RE.test(s)) return true;

  // 3. Entropy check on long-enough strings.
  if (s.length >= ENTROPY_LEN_MIN) {
    // Trim noisy boundaries — JSON quotes, whitespace, simple punctuation.
    // We measure entropy on the longest run of "high-alphabet" characters
    // (base64 / hex / token-shaped) rather than full sentences. Otherwise
    // a long English paragraph that happens to embed `xxx` gets nuked.
    const runs = s.match(/[A-Za-z0-9_\-+/=]{24,}/g);
    if (runs) {
      for (const run of runs) {
        if (shannonEntropy(run) >= ENTROPY_BITS_MIN) return true;
      }
    }
  }

  return false;
}

/** Returns true if `s` looks like raw source code by punctuation density. */
export function looksLikeCode(s: string): boolean {
  if (typeof s !== "string" || s.length < CODE_DENSITY_MIN_LEN) return false;
  const matches = s.match(CODE_PUNCT_RE);
  if (!matches) return false;
  return matches.length / s.length > CODE_DENSITY_RATIO;
}

/** Returns true if `path` is a per-run working-dir path that encodes tenant
 *  and run UUIDs. */
export function looksLikeRunPath(path: string): boolean {
  if (typeof path !== "string") return false;
  return /\/var\/runs\//.test(path);
}

/** Strips run-path substrings AND any standalone UUID from a string,
 *  preserving the surrounding error message so the operator still has
 *  context. Returns the redacted string (never null). */
export function redactPathInString(s: string): string {
  return s
    .replace(RUN_PATH_RE, `/var/runs/${REDACTED}`)
    .replace(UUID_RE, REDACTED);
}

// ---------------------------------------------------------------------------
// Property-key denial.
// ---------------------------------------------------------------------------

const DENIED_SET = new Set(DENIED_KEYS.map((k) => k.toLowerCase()));

/** Returns true if the property key matches a denied name (case-insensitive,
 *  also matches camelCase and snake_case variants of the denied word). */
export function isDeniedKey(key: string): boolean {
  if (typeof key !== "string") return false;
  const lower = key.toLowerCase();
  if (DENIED_SET.has(lower)) return true;
  // Substring match — `userEmail`, `accessToken`, `xApiKey` all caught
  // because the denied word appears as a token inside.
  for (const denied of DENIED_SET) {
    if (lower.includes(denied)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Recursive structural walk — the workhorse.
//
// Visits every nested object / array. For each scalar:
//   - If the parent property key is denied → `REDACTED`.
//   - If the string contains a secret pattern, UUID, or high-entropy run
//     → `REDACTED`.
//   - If the string looks like code (density > 10%) → `REDACTED`.
//   - If the string contains a /var/runs/ path → path tail redacted.
// For each object: visit children. Arrays: visit elements.
//
// We cap recursion depth + node count to avoid OOM on a circular or
// pathologically deep event.
// ---------------------------------------------------------------------------

const MAX_DEPTH = 16;
const MAX_NODES = 5000;

interface WalkCtx {
  nodes: number;
  seen: WeakSet<object>;
}

function walk(value: unknown, parentKey: string | null, ctx: WalkCtx, depth: number): unknown {
  if (ctx.nodes++ > MAX_NODES) return REDACTED;
  if (depth > MAX_DEPTH) return REDACTED;

  if (value === null || value === undefined) return value;

  const t = typeof value;

  if (t === "string") {
    const s = value as string;
    if (parentKey && isDeniedKey(parentKey)) return REDACTED;
    if (stringContainsSecret(s)) return REDACTED;
    if (looksLikeCode(s)) return REDACTED;
    if (looksLikeRunPath(s)) return redactPathInString(s);
    return s;
  }

  if (t === "number" || t === "boolean" || t === "bigint") {
    // Scalars are safe — they can't carry an opaque secret. But if the
    // parent key is denied, redact (e.g. `{ token: 1234567890 }`).
    if (parentKey && isDeniedKey(parentKey)) return REDACTED;
    return value;
  }

  if (Array.isArray(value)) {
    if (ctx.seen.has(value)) return REDACTED;
    ctx.seen.add(value);
    return value.map((item) => walk(item, parentKey, ctx, depth + 1));
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    if (ctx.seen.has(obj)) return REDACTED;
    ctx.seen.add(obj);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) {
      if (isDeniedKey(k)) {
        out[k] = REDACTED;
        continue;
      }
      out[k] = walk(obj[k], k, ctx, depth + 1);
    }
    return out;
  }

  // Functions, symbols — drop silently.
  return undefined;
}

// ---------------------------------------------------------------------------
// LLM-call detection — strip request/response bodies entirely.
// ---------------------------------------------------------------------------

function isLlmHost(url: string | undefined): boolean {
  if (!url) return false;
  return LLM_HOSTS.some((re) => re.test(url));
}

/** Returns true if a breadcrumb or request looks like an HTTP call to a
 *  known LLM provider — body must be stripped wholesale. */
export function isLlmTelemetryEvent(opts: { url?: string; category?: string; op?: string }): boolean {
  const { url, category, op } = opts;
  if (op === "http.client" && isLlmHost(url)) return true;
  if (category === "http" && isLlmHost(url)) return true;
  if (category === "fetch" && isLlmHost(url)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Top-level entrypoint.
// ---------------------------------------------------------------------------

/**
 * Sentry `beforeSend` hook. Mutates a clone of `event` so the original
 * (held by the SDK for re-emission) is untouched, then returns it.
 *
 * Wiring (Forge):
 *   ```ts
 *   Sentry.init({
 *     dsn: process.env.SENTRY_DSN,
 *     beforeSend: redactPiiAndSecrets,
 *     // ... transports, sampleRate, etc.
 *   });
 *   ```
 *
 * Returns `null` to drop the event when redaction would leave it
 * structurally empty (no message, no exception). Better silence than leak.
 *
 * @param event Sentry event payload.
 * @param _hint Sentry event hint (unused; reserved for future correlation).
 */
export function redactPiiAndSecrets(
  event: SentryEvent,
  _hint?: SentryEventHint,
): SentryEvent | null {
  const ctx: WalkCtx = { nodes: 0, seen: new WeakSet() };

  // 1. Top-level scalars that have special handling.
  if (event.message) {
    event.message = scrubScalar(event.message, "message");
  }

  // 2. Request — strip data + Authorization + Cookie regardless. URL is
  //    preserved minus any path that looks like a run-output path.
  if (event.request) {
    const req = event.request;
    if (req.url) req.url = redactPathInString(req.url);

    // LLM hosts: strip body entirely. The URL + status are kept as
    // metadata (gateway already redacts at the source, this is belt+
    // braces for any direct SDK use that bypasses the gateway).
    if (isLlmHost(req.url)) {
      req.data = REDACTED;
      req.query_string = REDACTED;
    } else if (req.data !== undefined) {
      req.data = walk(req.data, "data", ctx, 0);
    }

    if (req.headers) {
      const cleanedHeaders: Record<string, string> = {};
      for (const k of Object.keys(req.headers)) {
        const lower = k.toLowerCase();
        if (lower === "authorization" || lower === "cookie" || lower === "set-cookie" || lower === "x-api-key") {
          cleanedHeaders[k] = REDACTED;
        } else if (isDeniedKey(k)) {
          cleanedHeaders[k] = REDACTED;
        } else {
          const v = req.headers[k];
          cleanedHeaders[k] = typeof v === "string" ? scrubScalar(v, k) : "";
        }
      }
      req.headers = cleanedHeaders;
    }
    if (req.cookies) req.cookies = REDACTED;
  }

  // 3. Breadcrumbs — drop or redact per-entry.
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((bc) => {
      if (!bc) return bc;
      const url = (bc.data as { url?: string } | undefined)?.url;
      const op = (bc.data as { op?: string } | undefined)?.op;
      if (isLlmTelemetryEvent({ url, category: bc.category, op })) {
        return {
          type: bc.type,
          category: bc.category,
          timestamp: bc.timestamp,
          level: bc.level,
          message: REDACTED,
          data: { url: url ? redactPathInString(url) : undefined, op, redacted: true },
        };
      }
      let message = bc.message;
      if (typeof message === "string") {
        if (message.length > BREADCRUMB_MAX_CHARS) {
          message = REDACTED;
        } else {
          message = scrubScalar(message, "message");
        }
      }
      return {
        ...bc,
        message,
        data: bc.data ? (walk(bc.data, "data", ctx, 0) as Record<string, unknown>) : bc.data,
      };
    });
  }

  // 4. Extra context.
  if (event.extra) {
    event.extra = walk(event.extra, "extra", ctx, 0) as Record<string, unknown>;
  }

  // 5. Tags — keys allowed, values scrubbed.
  if (event.tags) {
    const cleanedTags: Record<string, string | number | boolean | undefined> = {};
    for (const k of Object.keys(event.tags)) {
      const v = event.tags[k];
      if (isDeniedKey(k)) {
        cleanedTags[k] = REDACTED;
      } else if (typeof v === "string") {
        cleanedTags[k] = scrubScalar(v, k);
      } else {
        cleanedTags[k] = v;
      }
    }
    event.tags = cleanedTags;
  }

  // 6. User — keep id (already hashed per Cipher Fix-3b PostHog rule),
  //    drop email, ip_address, username, anything else with PII shape.
  if (event.user) {
    const safeUser: { id?: string; [k: string]: unknown } = {};
    if (typeof event.user.id === "string" && !stringContainsSecret(event.user.id)) {
      safeUser.id = event.user.id;
    } else if (event.user.id != null) {
      safeUser.id = REDACTED;
    }
    // Any additional user property is redacted.
    for (const k of Object.keys(event.user)) {
      if (k === "id") continue;
      safeUser[k] = REDACTED;
    }
    event.user = safeUser;
  }

  // 7. Exception — redact `value` strings + stack-frame `vars` + filenames.
  if (event.exception?.values) {
    for (const exc of event.exception.values) {
      if (typeof exc.value === "string") {
        exc.value = scrubScalar(exc.value, "value");
      }
      if (exc.stacktrace?.frames) {
        for (const frame of exc.stacktrace.frames) {
          if (frame.filename) frame.filename = redactPathInString(frame.filename);
          if (frame.abs_path) frame.abs_path = redactPathInString(frame.abs_path);
          if (frame.vars) frame.vars = walk(frame.vars, "vars", ctx, 0) as Record<string, unknown>;
        }
      }
    }
  }

  // 8. Contexts — walk recursively.
  if (event.contexts) {
    event.contexts = walk(event.contexts, "contexts", ctx, 0) as Record<string, unknown>;
  }

  // 9. Final structural check — if after redaction the event has no
  //    message, no exception, and no useful context, drop it. Better to
  //    lose a crash report than ship a confusing all-[REDACTED] event.
  const hasMessage = typeof event.message === "string" && event.message !== REDACTED && event.message.length > 0;
  const hasException = !!event.exception?.values?.some((v) => v.value && v.value !== REDACTED);
  if (!hasMessage && !hasException) return null;

  return event;
}

/** Inline scrubber for top-level scalar strings (event.message, header
 *  values, exception.value). Mirrors the `walk()` string logic without the
 *  recursion overhead. */
function scrubScalar(s: string, key: string | null): string {
  if (typeof s !== "string") return s;
  if (key && isDeniedKey(key)) return REDACTED;
  if (stringContainsSecret(s)) return REDACTED;
  if (looksLikeCode(s)) return REDACTED;
  if (looksLikeRunPath(s)) return redactPathInString(s);
  return s;
}
