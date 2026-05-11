"use client";
import React, { useId, useState } from "react";

const CATEGORIES = [
  { key: "ux",            label: "UX" },
  { key: "accessibility", label: "Accessibility" },
  { key: "copy",          label: "Copy" },
  { key: "brand",         label: "Brand" },
  { key: "flow",          label: "Flow" },
  { key: "audience",      label: "Audience" },
];

/**
 * Score-display — radar + semantic table parity (HC3).
 * The table is the truth; radar is `aria-hidden`.
 */
export function ScoreDisplay({
  breakdown = {},
  delta = null,
  runtime = "both",
  summaryText,
  state = "default",
  ...rest
}) {
  const id = useId();
  const tableId = `${id}-table`;
  const radarId = `${id}-radar`;

  const [view, setView] = useState(runtime);

  // Derived summary
  const entries = CATEGORIES.map((c) => ({ ...c, score: breakdown[c.key] ?? null }));
  const valid = entries.filter((e) => typeof e.score === "number");
  const min = valid.reduce((acc, e) => (acc == null || e.score < acc.score ? e : acc), null);
  const max = valid.reduce((acc, e) => (acc == null || e.score > acc.score ? e : acc), null);
  const autoSummary = (() => {
    if (!valid.length) return "No category scores available.";
    if (min && max && min.key !== max.key) {
      return `${max.label} is the highest category at ${max.score}. ${min.label} is the lowest at ${min.score}.`;
    }
    return "All categories at parity.";
  })();

  // Radar SVG — six-point polygon
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 30;
  const points = entries.map((e, i) => {
    const angle = (Math.PI * 2 * i) / entries.length - Math.PI / 2;
    const score = typeof e.score === "number" ? e.score : 0;
    const dist = (score / 100) * r;
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
  });
  const polygon = points.map((p) => p.join(",")).join(" ");

  return (
    <section className="sz-score" data-state={state} aria-labelledby={`${id}-label`} {...rest}>
      <div className="sz-score__head">
        <span id={`${id}-label`} className="sz-score__eyebrow">Breakdown</span>
        <div className="sz-score__toggle" role="tablist" aria-label="Score view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "radar" || view === "both"}
            aria-controls={radarId}
            onClick={() => setView((v) => (v === "radar" ? "both" : "radar"))}
            className="sz-score__toggle-btn"
          >
            Chart
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "table" || view === "both"}
            aria-controls={tableId}
            onClick={() => setView((v) => (v === "table" ? "both" : "table"))}
            className="sz-score__toggle-btn"
          >
            Table
          </button>
        </div>
      </div>

      <div className="sz-score__body">
        {/* Radar — aria-hidden because the table carries the same data. */}
        {view !== "table" ? (
          <div id={radarId} className="sz-score__radar" aria-hidden="true">
            <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="auto">
              {/* Rings */}
              {[0.25, 0.5, 0.75, 1].map((t) => (
                <polygon
                  key={t}
                  points={CATEGORIES.map((_, i) => {
                    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                    return [cx + r * t * Math.cos(a), cy + r * t * Math.sin(a)].join(",");
                  }).join(" ")}
                  fill="none"
                  stroke="var(--line-1)"
                  strokeWidth="1"
                />
              ))}
              {/* Axes */}
              {CATEGORIES.map((_, i) => {
                const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={cx + r * Math.cos(a)}
                    y2={cy + r * Math.sin(a)}
                    stroke="var(--line-1)"
                    strokeWidth="1"
                  />
                );
              })}
              {/* Polygon */}
              <polygon
                points={polygon}
                fill="var(--ink-0)"
                fillOpacity="0.08"
                stroke="var(--ink-0)"
                strokeWidth="1.5"
              />
              {/* Labels */}
              {CATEGORIES.map((c, i) => {
                const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                const lx = cx + (r + 18) * Math.cos(a);
                const ly = cy + (r + 18) * Math.sin(a);
                return (
                  <text
                    key={c.key}
                    x={lx}
                    y={ly}
                    fill="var(--ink-3)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    letterSpacing="0.08em"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {c.label.toUpperCase()}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : null}

        {/* Semantic table — the load-bearing SR surface. */}
        <table
          id={tableId}
          className={`sz-score__table ${view === "radar" ? "sz-sr-only" : ""}`}
        >
          <caption className="sz-sr-only">Score breakdown by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Score</th>
              {delta ? <th scope="col">Change</th> : null}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const d = delta?.[e.key];
              const dText = typeof d === "number"
                ? `${d > 0 ? "+" : ""}${d}, ${d > 0 ? "improved" : d < 0 ? "worse" : "unchanged"}`
                : "—";
              return (
                <tr key={e.key}>
                  <th scope="row">{e.label}</th>
                  <td>{typeof e.score === "number" ? e.score : "—"}</td>
                  {delta ? <td>{dText}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="sz-score__summary">{summaryText || autoSummary}</p>
    </section>
  );
}

export default ScoreDisplay;
