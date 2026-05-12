"use client";

/**
 * FindingsRow — port of `design/components/findings-row/findings-row.jsx`.
 *
 * Per-finding card with the locked Herald frame:
 *   [severity chip] [reviewer chip] [F-NNN] Title
 *     What we found · Why it matters · The fix
 *     [Copy fix] [Mark won't-fix]
 *
 * Halo A3-3 — kebab menu rendered as ARIA menu (aria-haspopup="menu",
 * aria-expanded). Keyboard: ArrowDown / End opens menu; Escape closes
 * + returns focus to button.
 *
 * SC 2.5.7 — non-drag reorder via Alt+↑/↓ when row is focused (skipped in
 * the M1 mock since reordering would have no persistence; flagged for M1+1).
 *
 * SC 1.1.1, 1.3.1, 1.4.1, 2.1.1, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 3.2.4, 4.1.2.
 */
import * as React from "react";

import { Chip } from "./Chip";

import type { Severity, ReviewerName } from "../lib/types";

export interface FindingsRowProps {
  findingId: string;
  severity: Severity;
  reviewer: ReviewerName;
  category: string;
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  fix: string;
  filePath?: string;
  lineRange?: string;
  /** Initial expanded state. Parent owns expand state in real wiring. */
  defaultExpanded?: boolean;
}

export function FindingsRow({
  findingId,
  severity,
  reviewer,
  category,
  title,
  whatWeFound,
  whyItMatters,
  fix,
  filePath,
  lineRange,
  defaultExpanded = false,
}: FindingsRowProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState<boolean>(defaultExpanded);
  const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);
  const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const bodyId = `${findingId}-body`;

  const handleCopy = async (): Promise<void> => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(fix);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // Silent fail — clipboard not available; user will see no feedback.
      // M1+1 follow-up: surface inline "Could not copy" microcopy.
    }
    setMenuOpen(false);
  };

  return (
    <div className="sz-findings-row" data-severity={severity}>
      <button
        type="button"
        className="sz-findings-row__header"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((v) => !v)}
      >
        <Chip variant="severity" severity={severity} />
        <span className="sz-findings-row__reviewer-chip">{reviewer}</span>
        <span className="sz-findings-row__id">{findingId}</span>
        <span className="sz-findings-row__title">{title}</span>
        <span className="sz-findings-row__chevron" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded ? (
        <div id={bodyId} className="sz-findings-row__body">
          <div className="sz-findings-row__section">
            <h4>What we found</h4>
            <p>{whatWeFound}</p>
          </div>
          <div className="sz-findings-row__section">
            <h4>Why it matters</h4>
            <p>{whyItMatters}</p>
          </div>
          <div className="sz-findings-row__section">
            <h4>The fix</h4>
            <p>
              {filePath && lineRange ? (
                <>
                  In <code>{filePath}</code>, lines {lineRange}. {fix}
                </>
              ) : (
                fix
              )}
            </p>
          </div>
          <div className="sz-findings-row__actions">
            <button
              type="button"
              className="sz-btn sz-btn--ghost sz-btn--sm"
              onClick={handleCopy}
            >
              {copied ? "Copied" : "Copy fix"}
            </button>
            <button
              type="button"
              className="sz-btn sz-btn--ghost sz-btn--sm"
              onClick={() => {
                // M1+1: persist won't-fix to `findings.disposition` table.
              }}
            >
              Mark won&apos;t-fix
            </button>
            <span className="sz-findings-row__meta">
              <span className="sz-mono-meta">CATEGORY: {category.toUpperCase()}</span>
            </span>
            <div className="sz-findings-row__kebab-wrap">
              <button
                ref={menuButtonRef}
                type="button"
                className="sz-findings-row__kebab"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`More actions for finding ${findingId}`}
                onClick={() => setMenuOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setMenuOpen(false);
                    menuButtonRef.current?.focus();
                  }
                }}
              >
                ⋯
              </button>
              {menuOpen ? (
                <ul
                  role="menu"
                  className="sz-findings-row__menu"
                  aria-label="More actions"
                >
                  <li role="none">
                    <button role="menuitem" type="button" onClick={handleCopy}>
                      Copy fix
                    </button>
                  </li>
                  <li role="none">
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dispute finding
                    </button>
                  </li>
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FindingsRow;
