"use client";

/**
 * Run-realtime subscription — Phase 9 M1 Batch 2 (Vega).
 *
 * Replaces `lib/run-state-machine.ts`'s wall-clock fake advance with a
 * real Supabase Realtime subscription on `runs:<runId>` (postgres_changes
 * on the `runs` table filtered by id, plus a `findings` postgres_changes
 * filter for the per-row stream).
 *
 * The hook returned by `useRunRealtime(runId)` falls back to polling the
 * mock `/api/runs/[runId]` endpoint when we're in mock mode — so the
 * call-site is one shape and the audit page never branches on mock/real.
 *
 * Cleanup contract (HARD):
 *  - Every subscription registered MUST be unsubscribed when the consuming
 *    component unmounts. The effect returns the unsubscribe handle; we
 *    additionally tear down on `runId` change.
 *  - In mock mode we clearInterval on unmount.
 *
 * Channel naming locked: `runs:<runId>` (matches Forge-2 + the docs in
 * `architecture/database/runner-jwt.md`).
 */
import * as React from "react";

import { isMockMode } from "./env";
import { createBrowserSupabaseClient } from "./supabase-client";

import type { MockFinding, MockScoreBreakdown } from "./mock-data";
import type {
  ReviewerProgress,
  RunState,
  Verdict,
} from "./types";

export interface RunSnapshot {
  state: RunState;
  progress: number; // 0..1
  elapsedMs: number;
  reviewers: ReviewerProgress[];
  verdict: {
    verdict: Verdict;
    score: MockScoreBreakdown;
    findings: MockFinding[];
  } | null;
  /** True when this snapshot came from the mock fallback. */
  mock: boolean;
}

/**
 * Subscribe to live run state. Returns a snapshot that updates on each
 * Realtime payload (real) or each poll tick (mock).
 */
export function useRunRealtime(runId: string): RunSnapshot | null {
  const [snap, setSnap] = React.useState<RunSnapshot | null>(null);

  React.useEffect(() => {
    let alive = true;

    // -- MOCK MODE: poll /api/runs/[runId] every 500ms ---------------------
    if (isMockMode()) {
      const tick = async (): Promise<void> => {
        try {
          const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as Omit<RunSnapshot, "mock"> & {
            mock?: boolean;
          };
          if (!alive) return;
          setSnap({ ...data, mock: true });
        } catch {
          // swallow — next tick retries
        }
      };
      void tick();
      const id = setInterval(() => void tick(), 500);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }

    // -- REAL MODE: SSR-fetch initial + Realtime postgres_changes ---------
    let unsubscribe: (() => void) | undefined;

    void (async (): Promise<void> => {
      // Initial snapshot from the API route (uses server-side RLS).
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Omit<RunSnapshot, "mock">;
          if (alive) setSnap({ ...data, mock: false });
        }
      } catch {
        // swallow — Realtime will deliver the next update
      }

      if (!alive) return;

      let supabase;
      try {
        supabase = createBrowserSupabaseClient();
      } catch {
        return; // env vars missing despite isMockMode false — degrade
      }

      // postgres_changes on the runs row + findings rows. Both filter by
      // runId so we don't get noisy cross-tenant payloads. RLS still
      // enforces tenancy; this filter is for delivery economy.
      const channel = supabase
        .channel(`runs:${runId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "runs",
            filter: `id=eq.${runId}`,
          },
          () => {
            // Re-fetch the canonical snapshot via the API route. We don't
            // splice the payload directly because the API route composes
            // run + reviewer-progress + verdict; the websocket only
            // delivers the row diff.
            void (async (): Promise<void> => {
              try {
                const res = await fetch(`/api/runs/${runId}`, {
                  cache: "no-store",
                });
                if (!res.ok) return;
                const data = (await res.json()) as Omit<
                  RunSnapshot,
                  "mock"
                >;
                if (alive) setSnap({ ...data, mock: false });
              } catch {
                // swallow
              }
            })();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "findings",
            filter: `run_id=eq.${runId}`,
          },
          () => {
            // New finding came in — same re-fetch strategy.
            void (async (): Promise<void> => {
              try {
                const res = await fetch(`/api/runs/${runId}`, {
                  cache: "no-store",
                });
                if (!res.ok) return;
                const data = (await res.json()) as Omit<
                  RunSnapshot,
                  "mock"
                >;
                if (alive) setSnap({ ...data, mock: false });
              } catch {
                // swallow
              }
            })();
          },
        )
        .subscribe();

      unsubscribe = (): void => {
        void channel.unsubscribe();
      };
    })();

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [runId]);

  return snap;
}
