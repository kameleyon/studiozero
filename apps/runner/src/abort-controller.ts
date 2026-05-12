/**
 * Studio Zero — per-run abort plumbing.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Per `audit-run-state-machine.md` EC-1 +
 * the `cancelled` terminal, the runner MUST honor cancel signals
 * mid-flight: any reviewer in `running` substate aborts cleanly, any
 * partial findings already persisted stay persisted, and the run
 * transitions to `cancelled` (or `partial_completed` if ≥1 reviewer
 * finished).
 *
 * This module owns the per-run AbortController registry. Every async op
 * inside the runner pulls a signal from here and threads it through:
 *
 *   - llm-gateway-client fetch calls (fetch(url, { signal }))
 *   - findings-writer Supabase calls (.abortSignal(signal))
 *   - score-engine-client fetch
 *   - realtime-emitter throttled publishes
 *
 * The cancel SIGNAL can come from three places:
 *   1. user click in /run/<run-id> → web app writes `runs.cancelled_at`
 *      → DB NOTIFY → run-state-machine.ts polls and calls cancelRun()
 *   2. pg-boss job timeout / retry escalation
 *   3. process SIGTERM (graceful shutdown — abort all in-flight runs)
 */

export interface RunAbortHandle {
  /** AbortSignal threaded into every async op for this run. */
  signal: AbortSignal;
  /** Trip the signal. Idempotent. */
  abort(reason?: string): void;
  /** Is this signal already aborted? */
  aborted: boolean;
  /** Reason string if aborted. */
  reason: string | undefined;
}

export interface AbortRegistry {
  /** Create and register a handle for a runId. Throws if duplicate. */
  create(runId: string): RunAbortHandle;
  /** Lookup an existing handle. Returns undefined if not registered. */
  get(runId: string): RunAbortHandle | undefined;
  /** Trip the signal for runId; no-op if unknown. */
  cancel(runId: string, reason?: string): void;
  /** Remove the handle (call when the run reaches a terminal state). */
  release(runId: string): void;
  /** Trip ALL signals — used by SIGTERM graceful shutdown. */
  abortAll(reason: string): void;
  /** Snapshot of currently-tracked runIds. */
  list(): string[];
}

class RunAbortHandleImpl implements RunAbortHandle {
  private readonly controller: AbortController;
  private cancelReason: string | undefined;

  constructor() {
    this.controller = new AbortController();
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get aborted(): boolean {
    return this.controller.signal.aborted;
  }

  get reason(): string | undefined {
    return this.cancelReason;
  }

  abort(reason?: string): void {
    if (this.controller.signal.aborted) return;
    this.cancelReason = reason;
    this.controller.abort(reason);
  }
}

export function createAbortRegistry(): AbortRegistry {
  const map = new Map<string, RunAbortHandleImpl>();

  return {
    create(runId: string): RunAbortHandle {
      if (map.has(runId)) {
        throw new Error(
          `[runner] abort-registry: duplicate runId '${runId}' — refusing to overwrite`,
        );
      }
      const handle = new RunAbortHandleImpl();
      map.set(runId, handle);
      return handle;
    },
    get(runId: string): RunAbortHandle | undefined {
      return map.get(runId);
    },
    cancel(runId: string, reason?: string): void {
      const handle = map.get(runId);
      if (!handle) return;
      handle.abort(reason);
    },
    release(runId: string): void {
      map.delete(runId);
    },
    abortAll(reason: string): void {
      for (const handle of map.values()) {
        handle.abort(reason);
      }
    },
    list(): string[] {
      return [...map.keys()];
    },
  };
}
