/**
 * Studio Zero — W3C trace-context helpers (M4 Batch 1, Watch).
 *
 * Surfaces a single trace-id we can propagate web → Edge Function →
 * runner → webhook return path. Sentry already injects spans across
 * the Next.js boundary via `@sentry/nextjs` instrumentation; this
 * module is the BRIDGE for the parts Sentry doesn't see — namely the
 * runner's outbound fetch to the LLM gateway (apps/runner/src/
 * llm-gateway-client.ts) and the inbound webhook handlers that
 * need to correlate to the originating request.
 *
 * Constraints (hard) per Cipher's redaction rule:
 *  - The trace-id MUST be opaque (no PII, no tenant_id, no user_id).
 *    Sentry beforeSend already scrubs accidental leaks but we don't
 *    rely on that — the value here is provably opaque (W3C-format
 *    32-hex characters; cryptographic random).
 *  - The trace-id is set as `traceparent` and `X-Trace-Id` headers.
 *    Both, because middleboxes can strip one or the other.
 *  - Browser code reads the value via `getTraceId()` (cookieless;
 *    sessionStorage-backed so a refresh keeps the same trace).
 *
 * Format: W3C trace-context spec (https://www.w3.org/TR/trace-context/).
 *   traceparent = version "-" trace-id "-" parent-id "-" trace-flags
 *   version     = "00"
 *   trace-id    = 32-char lowercase hex
 *   parent-id   = 16-char lowercase hex
 *   trace-flags = "01" (sampled) — we sample 10% via Sentry, but the
 *                 header always advertises sampled so downstream
 *                 systems can do their own sampling decision.
 *
 * Owner: Watch (M4 Batch 1). Reviewers: Cipher (no PII in tags),
 * Forge-2 (runner client forwards the header).
 */

const W3C_VERSION = "00" as const;
const SAMPLED_FLAGS = "01" as const;

/** True when running in the browser. */
const isBrowser = typeof window !== "undefined";

/** Storage key for the per-tab session trace-id. */
const STORAGE_KEY = "sz_trace_id";

/** 32-char lowercase hex (W3C trace-id). */
function newTraceIdHex(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for environments without WebCrypto (vanishingly rare in
  // our targets). Math.random is NOT cryptographically secure — fine
  // for a trace-id (opaqueness is the only requirement; uniqueness is
  // collision-tolerant since traces are scoped per-request).
  let out = "";
  for (let i = 0; i < 32; i += 1) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

/** 16-char lowercase hex (W3C parent-id / span-id). */
function newParentIdHex(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

/**
 * Build a W3C traceparent header value from a trace-id (and optional
 * parent-id; defaults to a fresh random span).
 */
export function buildTraceparent(
  traceId: string,
  parentId: string = newParentIdHex(),
): string {
  return `${W3C_VERSION}-${traceId}-${parentId}-${SAMPLED_FLAGS}`;
}

/**
 * Parse a W3C traceparent header and return the trace-id, or null if
 * the value is malformed. Strictly validates format so a malicious
 * header (e.g., `00-<email>-<email>-01`) can't sneak PII through.
 */
export function parseTraceparent(value: string | null): string | null {
  if (!value) return null;
  // version-trace-flags-parent-flags
  const parts = value.split("-");
  if (parts.length !== 4) return null;
  const version = parts[0];
  const traceId = parts[1];
  const parentId = parts[2];
  const flags = parts[3];
  if (version !== W3C_VERSION) return null;
  if (!traceId || !/^[0-9a-f]{32}$/.test(traceId)) return null;
  if (!parentId || !/^[0-9a-f]{16}$/.test(parentId)) return null;
  if (!flags || !/^[0-9a-f]{2}$/.test(flags)) return null;
  return traceId;
}

/**
 * Get-or-create the per-session trace-id (browser-only).
 *
 * Server-side callers should accept the trace-id as input (parsed from
 * the incoming `traceparent` header) rather than calling this — server
 * components don't have sessionStorage.
 */
export function getTraceId(): string {
  if (!isBrowser) {
    // Server-side fallback: a fresh trace per call. Callers that need
    // to correlate across multiple server calls should pass the
    // trace-id explicitly via headers (the standard W3C pattern).
    return newTraceIdHex();
  }
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;
  } catch {
    // sessionStorage may be unavailable (Safari ITP, sandboxed iframes).
    // Fall through to mint a fresh id without persisting.
  }
  const fresh = newTraceIdHex();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, fresh);
  } catch {
    // Ignore storage failures — we still return the value for the
    // current page, just don't persist across refresh.
  }
  return fresh;
}

/**
 * Build the headers object the web client should send on every fetch.
 *
 * Usage:
 *   fetch(url, { headers: { ...withTraceHeaders() } })
 */
export function withTraceHeaders(
  baseHeaders: HeadersInit = {},
): Record<string, string> {
  const traceId = getTraceId();
  const out: Record<string, string> = {};
  if (baseHeaders instanceof Headers) {
    baseHeaders.forEach((v, k) => {
      out[k] = v;
    });
  } else if (Array.isArray(baseHeaders)) {
    for (const [k, v] of baseHeaders) out[k] = v;
  } else {
    Object.assign(out, baseHeaders);
  }
  out["traceparent"] = buildTraceparent(traceId);
  out["x-trace-id"] = traceId;
  return out;
}

/**
 * Extract a trace-id from an incoming Request — used by route handlers
 * + middleware. Falls back to a fresh trace-id when the upstream
 * caller didn't propagate one (e.g., a curl probe to /api/healthz).
 */
export function extractTraceId(req: Request): string {
  const traceparent = req.headers.get("traceparent");
  const parsed = parseTraceparent(traceparent);
  if (parsed) return parsed;
  const xTrace = req.headers.get("x-trace-id");
  if (xTrace && /^[0-9a-f]{32}$/.test(xTrace)) return xTrace;
  return newTraceIdHex();
}
