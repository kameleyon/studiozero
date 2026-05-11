/**
 * Studio Zero — Structured logger
 *
 * Owned by Chronicle. Writes JSON lines so they stream cleanly into Vercel /
 * Datadog / Sentry breadcrumbs / any log aggregator without per-vendor parsing.
 *
 * Three log levels: info, warn, error. No "debug" in production — if you
 * needed it during dev, use console.log and remove before merge.
 */

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  user_id?: string;
  tenant_id?: string;
  request_id?: string;
  trace_id?: string;
  [k: string]: unknown;
}

const SECRET_KEY_PATTERNS = /password|token|secret|api[_-]?key|authorization|cookie/i;

/** Strip likely-secret keys from context before serializing. */
function redact(ctx: LogContext): LogContext {
  const out: LogContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = SECRET_KEY_PATTERNS.test(k) ? "[REDACTED]" : v;
  }
  return out;
}

function log(level: LogLevel, message: string, ctx: LogContext = {}) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...redact(ctx),
  };
  // stdout for info/warn so they don't get swallowed; stderr for errors
  const stream = level === "error" ? console.error : console.log;
  stream(JSON.stringify(entry));
}

export const logger = {
  info: (message: string, ctx?: LogContext) => log("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => log("warn", message, ctx),
  error: (message: string, ctx?: LogContext) => log("error", message, ctx),
};
