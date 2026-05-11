"use client";
import React from "react";

/**
 * Table — semantic <table> with 320 px reflow via CSS stack.
 * Halo HC7: "Most popular" badge is programmatic (text in a <td>), never
 * visual-only.
 */
export function Table({
  caption,
  captionVisible = true,
  columns = [],
  rows = [],
  responsive = "stack",
  striped = false,
  state = "default",
  ...rest
}) {
  return (
    <div className={`sz-table-wrap sz-table-wrap--${responsive}`}>
      <table
        className={`sz-table ${striped ? "is-striped" : ""}`}
        data-state={state}
        aria-busy={state === "loading" || undefined}
        {...rest}
      >
        <caption className={captionVisible ? "sz-table__caption" : "sz-sr-only"}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope={c.scope || "col"} style={c.align ? { textAlign: c.align } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              data-state={r.highlighted ? "highlighted" : r.error ? "error" : undefined}
            >
              {columns.map((c, i) => {
                const cell = r.cells[c.key];
                const isRowHeader = i === 0;
                if (isRowHeader) {
                  return (
                    <th key={c.key} scope="row" data-label={c.label}>
                      {cell}
                      {r.badge ? (
                        <span className="sz-table__badge" aria-label={`Highlighted: ${r.badge}`}>
                          {r.badge}
                        </span>
                      ) : null}
                    </th>
                  );
                }
                return (
                  <td key={c.key} data-label={c.label} style={c.align ? { textAlign: c.align } : undefined}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
