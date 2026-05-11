"use client";
import React, { useEffect, useRef } from "react";
import Chip from "../chip/chip.jsx";

/**
 * Live-progress-region — Studio Zero design system.
 *
 * Halo A2-2: one wrapper `aria-live="polite"` region publishes a coalesced
 * summary. Per-reviewer rows are visual-only (no per-row aria-live).
 *
 * Coalescing: trailing-edge debounce at `coalesceMs` (default 250 ms = the
 * 4-updates/sec floor per tokens.json motion.rules.live_region_throttle_per_sec).
 */
const PHASE_LABEL = {
  dispatched: "DISPATCHED",
  running: "RUNNING",
  finished: "FINISHED",
  blocked: "BLOCKED",
};
const PHASE_TONE = {
  dispatched: "neutral",
  running: "pass",
  finished: "pass",
  blocked: "fail",
};

export function LiveProgressRegion({
  reviewers = [],
  etaMinutes,
  onCancel,
  coalesceMs = 250,
  srSummary,
  cancelDisabled = false,
  ...rest
}) {
  const liveRef = useRef(null);
  const timerRef = useRef(null);
  const lastMessageRef = useRef("");

  // Coalesced summary derivation
  const running = reviewers.filter((r) => r.phase === "running").length;
  const finished = reviewers.filter((r) => r.phase === "finished").length;
  const blocked = reviewers.filter((r) => r.phase === "blocked").length;
  const derived = srSummary
    || `${finished} finished, ${running} running${blocked ? `, ${blocked} blocked` : ""}.${
       typeof etaMinutes === "number" ? ` About ${etaMinutes} minutes left.` : ""}`;

  // Schedule a single trailing-edge announcement when state changes.
  useEffect(() => {
    if (!liveRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (derived === lastMessageRef.current) return;
      lastMessageRef.current = derived;
      liveRef.current.textContent = derived;
    }, coalesceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [derived, coalesceMs]);

  return (
    <section className="sz-live" aria-labelledby="sz-live-heading" {...rest}>
      <header className="sz-live__head">
        <h2 id="sz-live-heading" className="sz-live__title">Audit in progress</h2>
        {typeof etaMinutes === "number" ? (
          <p className="sz-live__eta">{`About ${etaMinutes} minutes left. You can leave this page — we'll email when it's done.`}</p>
        ) : null}
      </header>

      {/* The ONE coalesced live region (Halo A2-2). */}
      <div ref={liveRef} className="sz-sr-only" aria-live="polite" aria-atomic="true" />

      <ul className="sz-live__list" role="list">
        {reviewers.map((r) => (
          <li
            key={r.id}
            className="sz-live__row"
            data-state={r.phase === "blocked" ? "error" : r.phase === "running" ? "loading" : undefined}
          >
            <span className="sz-live__agent">
              <span className="sz-live__agent-name">{r.label}</span>
              {r.role ? <span className="sz-live__agent-role">{r.role}</span> : null}
            </span>
            <Chip
              variant="status"
              tone={PHASE_TONE[r.phase] || "neutral"}
              data-state={r.phase === "running" ? "loading" : undefined}
            >
              {PHASE_LABEL[r.phase] || r.phase.toUpperCase()}
            </Chip>
            {typeof r.partialCount === "number" ? (
              <span className="sz-live__count" aria-label={`${r.partialCount} partial findings`}>
                {r.partialCount}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {onCancel ? (
        <div className="sz-live__foot">
          <button
            type="button"
            className="sz-live__cancel"
            onClick={onCancel}
            disabled={cancelDisabled}
          >
            Cancel this run
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default LiveProgressRegion;
