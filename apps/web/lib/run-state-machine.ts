/**
 * Mock run state machine — Phase 9 M1 starter dispatch.
 *
 * Drives a fake audit run through the canonical PRD state ladder:
 *   queued → dispatched → reviewers_running → all_reviewers_complete →
 *   jury_synthesizing → verdict_emitted
 *
 * The transitions advance based on **elapsed wall-clock time since the
 * run was created**, so polling the `getRunState(runId)` function returns
 * a monotonically-advancing state. Total runtime is ~10 seconds at the
 * fastest (so demos feel snappy) — real M1+1 runs will be 10–15 minutes
 * Quick / 20–45 minutes Comprehensive per PRD §14.1.
 *
 * **What this mock skips (M1+1 follow-up):**
 *  - real pg-boss worker dispatch
 *  - real Anthropic message streaming
 *  - real Supabase Realtime websocket
 *  - real partial-result boundary on cancel
 *  - per-reviewer retry/failure paths (we only happy-path it here)
 *
 * The shape of the returned events MATCHES what the real runner will
 * emit — so the UI components consuming this don't need to refactor.
 *
 * Owner: Forge (this dispatch) → Forge + Crash + Cortex (M1+1 real impl).
 */
import {
  getMockRunFixture,
  getMockVerdictForRun,
  type MockRun,
} from "./mock-data";

import type {
  RunState,
  ReviewerProgress,
  ReviewerName,
  ReviewerStatus,
  Verdict,
} from "./types";

/** Total mock-run duration. Keep snappy for demo; real audits are minutes. */
const MOCK_RUN_TOTAL_MS = 10_000;

/** State timeline — proportions of MOCK_RUN_TOTAL_MS. */
const TIMELINE: Array<{ atMsFrac: number; state: RunState }> = [
  { atMsFrac: 0.0, state: "queued" },
  { atMsFrac: 0.08, state: "dispatched" },
  { atMsFrac: 0.18, state: "reviewers_running" },
  { atMsFrac: 0.78, state: "all_reviewers_complete" },
  { atMsFrac: 0.85, state: "jury_synthesizing" },
  { atMsFrac: 1.0, state: "verdict_emitted" },
];

/**
 * In-memory run registry. Each runId records its `startedAt`. Module-level
 * Map persists across requests *within the same Next.js process* on Vercel
 * Functions — good enough for the mock demo. Real persistence lands with
 * the `runs` table at M1+1.
 */
const RUN_REGISTRY: Map<string, { startedAt: number; baseFixture: MockRun }> =
  new Map();

/** Register a new run. Returns the seeded fixture. */
export function registerMockRun(runId: string): MockRun {
  const fixture = getMockRunFixture(runId);
  RUN_REGISTRY.set(runId, { startedAt: Date.now(), baseFixture: fixture });
  return fixture;
}

/**
 * Derive the run's current state from elapsed wall-clock time.
 * Idempotent on read — calling twice 10ms apart returns the same state.
 */
export function getRunState(runId: string): {
  state: RunState;
  elapsedMs: number;
  progress: number; // 0..1
} {
  const entry = RUN_REGISTRY.get(runId);
  // If a route handler is hit before the run was registered (cold start,
  // process reboot), auto-register and treat it as starting now. Real
  // M1+1 lookups would 404; the mock is forgiving by design.
  if (!entry) {
    registerMockRun(runId);
    return { state: "queued", elapsedMs: 0, progress: 0 };
  }
  const elapsedMs = Date.now() - entry.startedAt;
  const frac = Math.max(0, Math.min(1, elapsedMs / MOCK_RUN_TOTAL_MS));
  // Walk timeline; pick the last entry whose threshold we've passed.
  let state: RunState = "queued";
  for (const milestone of TIMELINE) {
    if (frac >= milestone.atMsFrac) state = milestone.state;
  }
  return { state, elapsedMs, progress: frac };
}

/**
 * Reviewer progress snapshot — synthetic per-reviewer status derived from
 * the overall elapsed time. Order matches the Comprehensive depth roster.
 * Real M1+1 reviewers will emit their own per-row progress events.
 */
export function getReviewerProgress(runId: string): ReviewerProgress[] {
  const { elapsedMs, progress } = getRunState(runId);
  const reviewers: ReviewerName[] = ["Optic", "Halo", "Proof", "Compass", "Canon"];

  // Each reviewer occupies a 0.12-wide slice of the [0.18, 0.78] reviewers_running
  // window. Stagger so they don't all complete simultaneously — feels alive.
  const rrStart = 0.18;
  const rrEnd = 0.78;
  const sliceWidth = (rrEnd - rrStart) / reviewers.length;

  return reviewers.map((reviewer, i) => {
    const startFrac = rrStart + i * sliceWidth;
    const endFrac = startFrac + sliceWidth * 1.1; // small overlap
    let status: ReviewerStatus = "pending";
    let phase: ReviewerProgress["phase"] = "idle";
    let partialFindings = 0;

    if (progress >= endFrac) {
      status = "complete";
      phase = "done";
      partialFindings = 2 + i; // 2..6
    } else if (progress >= startFrac) {
      status = "running";
      const localFrac = (progress - startFrac) / (endFrac - startFrac);
      phase =
        localFrac < 0.33
          ? "reading_repo"
          : localFrac < 0.66
            ? "running_heuristics"
            : "synthesizing";
      partialFindings = Math.floor(localFrac * (2 + i));
    }

    return {
      reviewer,
      status,
      phase,
      partialFindings,
      elapsedMs,
    };
  });
}

/**
 * Returns the final verdict + score + findings IFF the run is in
 * `verdict_emitted`; otherwise null. The /audit page polls this to
 * know when to flip from "in progress" to the verdict screen.
 */
export function getRunVerdict(runId: string): {
  verdict: Verdict;
  score: ReturnType<typeof getMockVerdictForRun>["score"];
  findings: ReturnType<typeof getMockVerdictForRun>["findings"];
} | null {
  const { state } = getRunState(runId);
  if (state !== "verdict_emitted" && state !== "archived") return null;
  return getMockVerdictForRun(runId);
}

/** Cancel a mock run — wipes registry entry. Real cancel goes through
 * the runner SIGTERM path at M1+1. */
export function cancelMockRun(runId: string): void {
  RUN_REGISTRY.delete(runId);
}
