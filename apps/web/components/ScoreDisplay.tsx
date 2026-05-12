/**
 * ScoreDisplay — port of `design/components/score-display/score-display.jsx`.
 *
 * Halo HC3 — radar chart (aria-hidden) + semantic `<table>` sibling.
 * The table is the AT truth; the radar is decoration. Both render.
 *
 * Mock: M1 starter ships the table-truth in full + a stub radar chart
 * placeholder div (not a real SVG plot). M1+1 swaps in the real radar
 * component (likely `visx` or hand-rolled SVG) — UI stays identical.
 *
 * SC 1.1.1, 1.3.1, 1.4.1, 1.4.3, 1.4.10, 2.4.7, 2.5.8, 3.2.4.
 */
import * as React from "react";

interface CategoryScore {
  name: string;
  score: number;
  weight?: number;
}

interface ScoreDisplayProps {
  total: number;
  categories: CategoryScore[];
  /** "radar-with-table" | "table-only" — table is always present. */
  variant?: "radar-with-table" | "table-only";
}

export function ScoreDisplay({
  total,
  categories,
  variant = "radar-with-table",
}: ScoreDisplayProps): React.ReactElement {
  return (
    <div className="sz-score-display">
      {variant === "radar-with-table" ? (
        // Decorative; the table below is the AT truth (HC3).
        <div
          className="sz-score-display__radar"
          aria-hidden="true"
          role="presentation"
        >
          <RadarChart categories={categories} total={total} />
        </div>
      ) : null}

      <table className="sz-score-display__table">
        <caption className="sz-sr-only">
          Score breakdown — {total} out of 100, with per-category breakdown.
        </caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Score</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.name}>
              <th scope="row">{c.name}</th>
              <td>
                <span className="sz-score-display__bar" aria-hidden="true">
                  <span
                    className="sz-score-display__bar-fill"
                    style={{ width: `${c.score}%` }}
                  />
                </span>
                <span className="sz-score-display__num">{c.score}</span>
              </td>
              <td>{c.weight ? `${Math.round(c.weight * 100)}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td colSpan={2}>
              <strong>{total} / 100</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Stub radar chart — renders a hexagonal silhouette in SVG. Decorative;
 * the table is the AT truth. M1+1 swaps for a real plotted radar. */
function RadarChart({
  categories,
  total,
}: {
  categories: CategoryScore[];
  total: number;
}): React.ReactElement {
  const n = categories.length;
  const cx = 100;
  const cy = 100;
  const rOuter = 80;
  // Compute outer hex / polygon points.
  const outerPts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + Math.cos(angle) * rOuter;
    const y = cy + Math.sin(angle) * rOuter;
    outerPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  // Data polygon — each axis at its score-normalized radius.
  const dataPts: string[] = [];
  categories.forEach((c, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (rOuter * c.score) / 100;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    dataPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });

  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <polygon
        points={outerPts.join(" ")}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth="1"
      />
      <polygon
        points={outerPts
          .map((p) => {
            const parts = p.split(",").map(Number);
            const x = parts[0] ?? cx;
            const y = parts[1] ?? cy;
            return `${cx + (x - cx) * 0.66},${cy + (y - cy) * 0.66}`;
          })
          .join(" ")}
        fill="none"
        stroke="var(--line-1)"
        strokeWidth="1"
      />
      <polygon
        points={outerPts
          .map((p) => {
            const parts = p.split(",").map(Number);
            const x = parts[0] ?? cx;
            const y = parts[1] ?? cy;
            return `${cx + (x - cx) * 0.33},${cy + (y - cy) * 0.33}`;
          })
          .join(" ")}
        fill="none"
        stroke="var(--line-1)"
        strokeWidth="1"
      />
      <polygon
        points={dataPts.join(" ")}
        fill="var(--ink-2)"
        fillOpacity="0.18"
        stroke="var(--ink-0)"
        strokeWidth="1.4"
      />
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontSize="32"
        fill="var(--ink-0)"
      >
        {total}
      </text>
    </svg>
  );
}

export default ScoreDisplay;
