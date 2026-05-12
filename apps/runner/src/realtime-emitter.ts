/**
 * Studio Zero — Realtime emitter.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Publishes AuditEvent messages to the
 * Supabase Realtime channel `runs:<run_id>`. UI subscribers (web app +
 * future CLI control plane) consume the same events identically per the
 * AuditEvent v1 contract (architecture/schemas/audit-event.v1.ts).
 *
 * Throttle policy (Halo HC2 — WCAG SC 2.2.1 aria-live overwhelm):
 *   - Producer SHOULD coalesce `progress` events to ≤ 4/sec.
 *   - Other event kinds (`finding`, `agent_log`, `final_verdict`,
 *     `error`) are NOT throttled — they are infrequent and must surface
 *     immediately.
 *
 * Throttle algorithm: leading-edge + trailing-edge for `progress`. We
 * emit the first event in a 250ms window immediately, and the LAST
 * event in the window at the end of the window (so the final pct of a
 * burst is never lost). This keeps the user-visible progress monotonic
 * AND bounded.
 *
 * NOTE: at M1 the actual `supabase.channel(...).send(...)` plumbing
 * is stubbed by an injected `publish` callback so tests don't need a
 * live websocket. The wiring to Supabase Realtime lands at M1+1 along
 * with the real Anthropic streaming.
 */

// Shape mirrors architecture/schemas/audit-event.v1.ts. Kept local to
// avoid a build-time cross-package dependency in the M1 skeleton.
export type AuditEvent =
  | { kind: "progress"; agent: string; phase: string; pct: number; at?: string }
  | { kind: "finding"; finding: Record<string, unknown>; at?: string }
  | {
      kind: "agent_log";
      agent: string;
      level: "debug" | "info" | "warn" | "error";
      message: string;
      context?: Record<string, unknown>;
      at?: string;
    }
  | { kind: "final_verdict"; result: Record<string, unknown>; at?: string }
  | {
      kind: "error";
      recoverable: boolean;
      code: string;
      message: string;
      agent?: string;
      attempt?: number;
      at?: string;
    };

export interface RealtimeEmitter {
  emit(event: AuditEvent): void;
  /** Drain any pending trailing-edge progress event. Call at run-terminal. */
  flush(): Promise<void>;
  /** Disconnect any underlying transport. Call at process shutdown. */
  close(): Promise<void>;
}

/** Async fn that actually pushes to the wire (Supabase channel send). */
export type RealtimePublish = (
  channel: string,
  event: AuditEvent,
) => Promise<void>;

export interface RealtimeEmitterOptions {
  runId: string;
  /** Default 250ms (≤ 4/sec). */
  progressWindowMs?: number;
  /** The wire-publish function. Tests inject a spy. */
  publish: RealtimePublish;
}

export function createRealtimeEmitter(
  opts: RealtimeEmitterOptions,
): RealtimeEmitter {
  const channel = `runs:${opts.runId}`;
  const windowMs = opts.progressWindowMs ?? 250;

  // Pending trailing-edge progress events, keyed by agent.
  const trailing: Map<string, AuditEvent> = new Map();
  // Most-recent leading-edge emit timestamp per agent.
  const lastSentAtMs: Map<string, number> = new Map();
  // Trailing-edge timers per agent so we can cancel/flush them.
  const timers: Map<string, NodeJS.Timeout> = new Map();
  let closed = false;

  const sendDirect = async (event: AuditEvent): Promise<void> => {
    try {
      await opts.publish(channel, event);
    } catch (err) {
      // Don't crash the run on a Realtime publish failure — log it.
      // Subscribers can replay from runs.events_log per state-machine EC-2.
      console.error(
        "[runner] realtime: publish failed (will continue):",
        (err as Error).message,
      );
    }
  };

  const scheduleTrailing = (agent: string): void => {
    if (timers.has(agent)) return;
    const t = setTimeout(() => {
      timers.delete(agent);
      const pending = trailing.get(agent);
      trailing.delete(agent);
      if (pending) {
        lastSentAtMs.set(agent, Date.now());
        void sendDirect(pending);
      }
    }, windowMs);
    if (typeof t.unref === "function") t.unref();
    timers.set(agent, t);
  };

  return {
    emit(event: AuditEvent) {
      if (closed) return;
      if (event.kind !== "progress") {
        void sendDirect(event);
        return;
      }
      const agent = event.agent;
      const now = Date.now();
      const lastAt = lastSentAtMs.get(agent) ?? 0;
      if (now - lastAt >= windowMs) {
        // Leading-edge: emit immediately.
        lastSentAtMs.set(agent, now);
        void sendDirect(event);
      } else {
        // Trailing-edge: queue, replacing any prior pending event for
        // this agent (newest pct wins).
        trailing.set(agent, event);
        scheduleTrailing(agent);
      }
    },
    async flush() {
      // Drain all pending trailing-edge timers, sending the held events.
      const pendingSends: Array<Promise<void>> = [];
      for (const [agent, timer] of timers.entries()) {
        clearTimeout(timer);
        const event = trailing.get(agent);
        trailing.delete(agent);
        if (event) pendingSends.push(sendDirect(event));
      }
      timers.clear();
      await Promise.all(pendingSends);
    },
    async close() {
      closed = true;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      trailing.clear();
    },
  };
}
