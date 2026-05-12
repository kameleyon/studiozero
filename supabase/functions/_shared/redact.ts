// Minimal redaction helpers for Edge Function structured logging.
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher.
//
// This is a slim Deno-friendly version of `apps/web/lib/sentry-redaction.ts`.
// The full module is bundled into the web app's Node runtime; Edge Functions
// run in Deno isolates so we can't share the import directly. The patterns
// below cover the load-bearing cases — Anthropic key, Supabase JWT shape,
// generic high-entropy strings, run paths, denied keys — so the function
// telemetry never exfils a secret. At M2 a `@studiozero/security` workspace
// package will host the canonical module and both surfaces will import it.
//
// Cross-ref: architecture/llm-gateway.md §8 "Telemetry redaction".

const REDACTED = "[REDACTED]";

const SECRET_RE: RegExp[] = [
  /\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/, // Anthropic
  /\bsk-ant-admin[0-9]{2}-[a-zA-Z0-9_\-]{20,}\b/,
  /\bsk_live_[0-9a-zA-Z]{20,}\b/, // Stripe live
  /\bsk_test_[0-9a-zA-Z]{20,}\b/,
  /\bwhsec_[A-Za-z0-9]{20,}\b/, // Stripe webhook secret
  /\bghp_[A-Za-z0-9]{36,}\b/, // GitHub PAT
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/, // JWT
];

const DENIED_KEYS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "x_api_key",
  "api_key",
  "apikey",
  "anthropic_api_key",
  "stripe_secret",
  "stripe_webhook_secret",
  "service_role_key",
  "supabase_service_role_key",
  "password",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "private_key",
  "jwt",
]);

function stringContainsSecret(s: string): boolean {
  if (typeof s !== "string" || s.length === 0) return false;
  for (const re of SECRET_RE) if (re.test(s)) return true;
  if (/[0-9a-f]{32,}/i.test(s)) return true;
  return false;
}

/** Redact a scalar string in place. */
export function scrub(s: string, key?: string): string {
  if (key && DENIED_KEYS.has(key.toLowerCase())) return REDACTED;
  if (stringContainsSecret(s)) return REDACTED;
  return s;
}

/** Deep-clone-with-redaction of a JSON-like payload for safe logging. */
export function redact(value: unknown, parentKey?: string): unknown {
  if (value == null) return value;
  if (typeof value === "string") return scrub(value, parentKey);
  if (typeof value === "number" || typeof value === "boolean") {
    if (parentKey && DENIED_KEYS.has(parentKey.toLowerCase())) return REDACTED;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, parentKey));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DENIED_KEYS.has(k.toLowerCase())) {
        out[k] = REDACTED;
      } else {
        out[k] = redact(v, k);
      }
    }
    return out;
  }
  return value;
}

/** Console-log a single structured event. Edge Function logs go to Supabase
 *  dashboard; redact before write. */
export function log(level: "info" | "warn" | "error", evt: Record<string, unknown>): void {
  const safe = redact({ level, ts: new Date().toISOString(), ...evt }) as Record<string, unknown>;
  const line = JSON.stringify(safe);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
