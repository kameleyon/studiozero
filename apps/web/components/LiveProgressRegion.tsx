"use client";

/**
 * LiveProgressRegion — port of
 * `design/components/live-progress-region/live-progress-region.jsx`.
 *
 * ONE coalesced `aria-live="polite"` region per Halo A2-2 (do not nest
 * multiple live regions; AT will firehose). 250ms trailing debounce +
 * ≤4 updates/sec throttle per HC2 / SC 2.2.1.
 *
 * Composition contract:
 *   - `latestAnnouncement` — the most recent string to announce. Each
 *     change triggers one AT announcement (debounced).
 *   - `children` — the visual content (per-reviewer rows). Rendered
 *     outside the live region wrapper so the AT only hears the text we
 *     control (visual chips have their own animations the AT shouldn't
 *     narrate).
 *
 * `prefers-reduced-motion` is honored via CSS in globals.css.
 *
 * SC 1.3.1, 1.4.1, 2.2.1, 2.3.3, 4.1.3.
 */
import * as React from "react";

interface LiveProgressRegionProps {
  /** Latest concise sentence to announce ("Halo is reading the repo."). */
  latestAnnouncement: string;
  /** Visual progress UI (per-reviewer rows, phase chips, etc.). */
  children: React.ReactNode;
}

export function LiveProgressRegion({
  latestAnnouncement,
  children,
}: LiveProgressRegionProps): React.ReactElement {
  // Debounce announcements to ≤4/sec per HC2 (Halo A2-2).
  const [announced, setAnnounced] = React.useState<string>("");
  const lastAnnouncedAt = React.useRef<number>(0);
  const pending = React.useRef<string>("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    pending.current = latestAnnouncement;
    const now = Date.now();
    const since = now - lastAnnouncedAt.current;
    const minInterval = 250; // 4/sec ceiling
    if (since >= minInterval) {
      setAnnounced(latestAnnouncement);
      lastAnnouncedAt.current = now;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAnnounced(pending.current);
      lastAnnouncedAt.current = Date.now();
    }, minInterval - since);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [latestAnnouncement]);

  return (
    <>
      {/* Visible progress UI. Visual chips are decorative — the AT relies
          on the polite region below for state. */}
      <div className="sz-progress-visible">{children}</div>

      {/* ONE coalesced polite region per HC2. Only the announced string
          changes; AT reads each change once. */}
      <div
        className="sz-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announced}
      </div>
    </>
  );
}

export default LiveProgressRegion;
