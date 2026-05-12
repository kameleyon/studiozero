/**
 * Studio Zero — runner-JWT refresh.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Per ARCH-D3 + runner-jwt.md:
 *   - mint endpoint:    POST /functions/v1/mint-runner-token   (job pickup)
 *   - refresh endpoint: POST /functions/v1/refresh-runner-token (mid-run)
 *   - hard TTL cap:     300 seconds
 *   - refresh policy:   heartbeat at 30s tick; refresh if exp - now < 60s
 *
 * This module owns:
 *   1. The initial mint at job pickup (mintRunnerToken).
 *   2. The mid-run refresh loop (TokenRefresher) — call .start() on the
 *      AbortSignal-bearing token issued for the run; .stop() at terminal.
 *   3. Decoding the JWT payload to extract `exp` WITHOUT verifying the
 *      signature — the issuer is the source of truth; we just need to
 *      know when to refresh. The DB is the actual enforcement point
 *      (RLS policy verifies the JWT in-engine).
 *
 * NEVER stores a long-lived credential. The mint endpoint requires a
 * caller JWT (web-session) to mint; the refresh endpoint requires a
 * still-valid runner-JWT. The runner process holds the runner-JWT in
 * memory ONLY — never on disk, never in env.
 */
import { assertSafeUrl } from "./ssrf-guard.js";

export interface RunnerToken {
  token: string;
  expiresAtMs: number;
  jti: string;
}

export interface JwtRefreshOptions {
  mintUrl: string;
  refreshUrl: string;
  runId: string;
  tenantId: string;
  runnerKind: "hosted-worker" | "cli-companion";
  workerFingerprint: string;
  /** Caller JWT (web-session) — REQUIRED for mint but NOT for refresh.
   *  At runtime, the dispatcher passes this as part of the job payload
   *  (it's the user's session that authorized the run in the first place).
   *  Refresh uses the existing runner-JWT as auth — no caller JWT needed. */
  callerJwt?: string;
  /** Heartbeat tick — default 30s per ARCH-D3. */
  heartbeatIntervalMs?: number;
  /** Refresh threshold — default 60s before expiry. */
  refreshThresholdMs?: number;
  /** AbortSignal — refresher stops when this is aborted. */
  signal: AbortSignal;
}

/**
 * Decode a JWT payload (NOT verifying signature). The runner doesn't
 * need to verify — Postgres does that on every query. We just need
 * `exp` to schedule the refresh.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(
  jwt: string,
): T {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error("[runner] jwt: not a JWT (missing parts)");
  }
  const payload = parts[1]!;
  // base64url decode
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=").replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(json) as T;
}

interface MintResponse {
  token: string;
  expires_at: string;
  jti: string;
}

/**
 * Initial mint at job pickup. Calls the mint Edge Function with the
 * caller JWT. Returns the runner-token + its expiry.
 */
export async function mintRunnerToken(opts: {
  mintUrl: string;
  callerJwt: string;
  runId: string;
  runnerKind: "hosted-worker" | "cli-companion";
  workerFingerprint: string;
  signal: AbortSignal;
}): Promise<RunnerToken> {
  const safeUrl = assertSafeUrl(opts.mintUrl);
  const res = await fetch(safeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.callerJwt}`,
      "X-AI-Generated": "studio-zero",
    },
    body: JSON.stringify({
      run_id: opts.runId,
      runner_kind: opts.runnerKind,
      runner_fingerprint: opts.workerFingerprint,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[runner] mint failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as MintResponse;
  return {
    token: json.token,
    expiresAtMs: Date.parse(json.expires_at),
    jti: json.jti,
  };
}

/**
 * Mid-run refresh. Uses the current runner-JWT as auth (the refresh
 * endpoint validates and re-mints with the same claims).
 */
export async function refreshRunnerToken(opts: {
  refreshUrl: string;
  currentToken: string;
  signal: AbortSignal;
}): Promise<RunnerToken> {
  const safeUrl = assertSafeUrl(opts.refreshUrl);
  const res = await fetch(safeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.currentToken}`,
      "X-AI-Generated": "studio-zero",
    },
    signal: opts.signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[runner] refresh failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as MintResponse;
  return {
    token: json.token,
    expiresAtMs: Date.parse(json.expires_at),
    jti: json.jti,
  };
}

/**
 * Long-running refresher. Holds the latest valid token in memory and
 * exposes it via getToken(). Other modules (llm-gateway-client,
 * findings-writer, score-engine-client) call getToken() each request
 * to pick up the freshest credential.
 */
export class TokenRefresher {
  private token: RunnerToken | null = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly opts: Required<
    Omit<JwtRefreshOptions, "callerJwt" | "tenantId" | "runnerKind">
  > & {
    callerJwt?: string;
    tenantId: string;
    runnerKind: "hosted-worker" | "cli-companion";
  };

  constructor(opts: JwtRefreshOptions) {
    this.opts = {
      mintUrl: opts.mintUrl,
      refreshUrl: opts.refreshUrl,
      runId: opts.runId,
      tenantId: opts.tenantId,
      runnerKind: opts.runnerKind,
      workerFingerprint: opts.workerFingerprint,
      callerJwt: opts.callerJwt,
      heartbeatIntervalMs: opts.heartbeatIntervalMs ?? 30_000,
      refreshThresholdMs: opts.refreshThresholdMs ?? 60_000,
      signal: opts.signal,
    };
  }

  /** Inject an existing token (from a prior mint). Use AFTER the mint call. */
  setToken(token: RunnerToken): void {
    this.token = token;
  }

  /** Returns the current valid token. Throws if no token has been minted yet. */
  getToken(): RunnerToken {
    if (!this.token) {
      throw new Error(
        "[runner] jwt-refresh: no token yet; call setToken() after mint",
      );
    }
    return this.token;
  }

  /** Start the heartbeat refresh loop. Stops when the signal aborts. */
  start(): void {
    if (this.timer) return;
    const tick = async (): Promise<void> => {
      if (this.opts.signal.aborted) return;
      if (!this.token) return; // never started; nothing to refresh
      const now = Date.now();
      if (this.token.expiresAtMs - now < this.opts.refreshThresholdMs) {
        try {
          const next = await refreshRunnerToken({
            refreshUrl: this.opts.refreshUrl,
            currentToken: this.token.token,
            signal: this.opts.signal,
          });
          this.token = next;
        } catch (err) {
          // Don't crash the run on a single refresh failure — log and let
          // the next tick retry. If exp passes without success, the next
          // DB query will 401 and the worker will fail the run.
          console.error(
            "[runner] jwt-refresh: refresh failed (will retry):",
            (err as Error).message,
          );
        }
      }
    };
    this.timer = setInterval(() => {
      void tick();
    }, this.opts.heartbeatIntervalMs);
    // Don't keep the event loop alive solely because of this timer.
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  /** Stop the heartbeat. Call at terminal run state. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
