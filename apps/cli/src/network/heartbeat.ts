/**
 * Studio Zero — CLI 30s heartbeat emitter.
 *
 * Phase 9 M3+1 (Forge). Closes Jury M3 Major #4. The CLI fires a
 * heartbeat POST to /api/cli/heartbeat every 30s while a run is in
 * flight so the server's `cli_heartbeat` row stays fresh and the
 * dashboard's "active" / "stale" indicator works (Atlas's
 * `stale_after_5min()` derivation).
 *
 * Why a separate module: keeps the timer + AbortController plumbing
 * isolated so the run.ts command stays small. The heartbeat is fire-
 * and-forget; a failed POST does NOT abort the run (the run can
 * still complete + upload its verdict even if the heartbeat channel
 * blips). Heartbeat failures are dev-only logged.
 *
 * Privacy invariant (PRD §13.4): the heartbeat body is empty `{}`.
 * No project metadata, no source bytes. The pairing token in the
 * Authorization header is the only thing that identifies the CLI.
 *
 * Token refresh — opportunistic. Per `refresh.ts shouldRefresh()`:
 * if the pairing token is within 7d of expiry, we kick off a refresh
 * on a heartbeat tick (the CLI is "alive" so the refresh window is
 * a natural place to do it).
 */
import { request } from "./studio-client.js";
import { refreshIfNeeded } from "../auth/refresh.js";
import { readAuth, type AuthFile } from "../auth/pairing-token.js";

/** 30s as locked by sprint M3 + ARCH-D10. */
export const HEARTBEAT_INTERVAL_MS = 30_000;

export interface HeartbeatOpts {
  apiUrl: string;
  configDir: string;
  /** Bearer token to send on every tick. Updated on refresh. */
  token: string;
  /** AbortController.signal owned by the caller. */
  signal: AbortSignal;
  /** Override fetcher (testing). */
  fetcher?: typeof fetch;
  /** Override interval (testing). Default = HEARTBEAT_INTERVAL_MS. */
  intervalMs?: number;
  /** Test hook — called after each tick completes (success or failure). */
  onTick?: (info: { ok: boolean; status: number; tokenRefreshed: boolean }) => void;
}

export interface HeartbeatHandle {
  /** Stop the timer. Idempotent. */
  stop: () => void;
  /** Resolves when the loop exits cleanly. */
  done: Promise<void>;
}

/**
 * Start a 30s heartbeat loop. The returned handle gives the caller
 * a way to stop the loop (call `stop()` at run completion/abort).
 *
 * The loop is CANCELLABLE via either:
 *   - calling `stop()` directly (preferred — explicit lifecycle)
 *   - aborting the parent AbortSignal
 */
export function startHeartbeat(opts: HeartbeatOpts): HeartbeatHandle {
  const intervalMs = opts.intervalMs ?? HEARTBEAT_INTERVAL_MS;
  let currentToken = opts.token;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    resolveDone();
  };

  // Tie into the caller's signal — when they abort, we stop too.
  if (opts.signal.aborted) {
    stop();
    return { stop, done };
  }
  opts.signal.addEventListener("abort", stop, { once: true });

  const tick = async (): Promise<void> => {
    if (stopped) return;
    let tokenRefreshed = false;
    // Opportunistic refresh: if the token is within the 7d window we
    // POST /api/cli/refresh first so the heartbeat itself rides on a
    // fresh token (avoids racing the run's own retries).
    try {
      const auth: AuthFile | null = readAuth(opts.configDir);
      if (auth) {
        const next = await refreshIfNeeded(opts.configDir, opts.apiUrl, {
          ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
        });
        if (next && next.token !== currentToken) {
          currentToken = next.token;
          tokenRefreshed = true;
        }
      }
    } catch {
      // Refresh failure is non-fatal — heartbeat with the current
      // token. The next tick can retry refresh.
    }

    let info = { ok: false, status: 0, tokenRefreshed };
    try {
      // Privacy invariant — CLI NEVER uploads source. Heartbeat body
      // is intentionally empty. See PRD §13.4.
      const res = await request<{ ok: boolean; last_heartbeat_at?: string }>({
        apiUrl: opts.apiUrl,
        method: "POST",
        path: "/api/cli/heartbeat",
        auth: currentToken,
        body: {},
        ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
      });
      info = { ok: res.ok, status: res.status, tokenRefreshed };
    } catch {
      // Best-effort — log nothing in prod; surface in dev only.
      if (process.env.STUDIOZERO_DEBUG === "1") {
        // eslint-disable-next-line no-console
        console.log("[studio-zero] heartbeat tick failed (non-fatal)");
      }
    }

    if (opts.onTick) opts.onTick(info);

    if (stopped) return;
    timer = setTimeout(() => {
      void tick();
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
  };

  // Kick off the first tick after one interval — the run start itself
  // is the implicit "I am alive" signal, so we don't need a t=0 ping.
  timer = setTimeout(() => {
    void tick();
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();

  return { stop, done };
}
