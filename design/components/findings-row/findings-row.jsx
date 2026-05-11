"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import Chip from "../chip/chip.jsx";

/**
 * Findings-row — Studio Zero design system.
 *
 * HB-6 collapse: 3 visible actions + kebab. Halo A3-3: kebab is an ARIA menu
 * with arrow-key navigation, Esc close, focus return.
 * SC 2.5.7: non-drag reorder lives in kebab.
 */
export function FindingsRow({
  id,
  severity = "Minor",
  category,
  reviewer,
  summary,
  evidence,
  recommendation,
  expanded = false,
  onExpandToggle,
  onCopyFix,
  onDismiss,
  onShare,
  onDispute,
  onMoveCategory,
  onReorder,
  dismissed = false,
  ...rest
}) {
  const sevKey = (severity || "minor").toLowerCase();
  const autoId = useId();
  const evId = `${id || autoId}-ev`;
  const menuId = `${id || autoId}-menu`;
  const rowRef = useRef(null);

  // Kebab menu
  const [menuOpen, setMenuOpen] = useState(false);
  const kebabRef = useRef(null);
  const menuRef = useRef(null);

  // Close menu on outside click + Esc.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (!menuRef.current?.contains(e.target) && !kebabRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        kebabRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // ArrowDown/Up navigation inside the menu.
  function onMenuKeyDown(e) {
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!items?.length) return;
    const idx = Array.from(items).indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  }

  // SC 2.5.7 keyboard reorder when the row itself is focused
  function onRowKeyDown(e) {
    if (!onReorder) return;
    if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault();
      onReorder("up");
    } else if (e.altKey && e.key === "ArrowDown") {
      e.preventDefault();
      onReorder("down");
    }
  }

  const dataState = dismissed
    ? "disabled"
    : expanded
      ? "expanded"
      : undefined;

  return (
    <li
      ref={rowRef}
      className="sz-finding"
      data-state={dataState}
      onKeyDown={onRowKeyDown}
      tabIndex={-1}
      aria-labelledby={`${id}-sum`}
      {...rest}
    >
      <div className="sz-finding__head">
        <Chip variant="severity" tone={sevKey}>{severity}</Chip>
        {category ? (
          <span className="sz-finding__category">{category}</span>
        ) : null}
        {reviewer ? (
          <span className="sz-finding__reviewer" aria-label={`Reviewer ${reviewer}`}>
            {`· ${reviewer}`}
          </span>
        ) : null}
      </div>

      <h3 id={`${id}-sum`} className="sz-finding__summary">{summary}</h3>

      <div className="sz-finding__actions">
        <button
          type="button"
          className="sz-finding__action"
          aria-expanded={expanded}
          aria-controls={evId}
          onClick={onExpandToggle}
        >
          <span className="sz-finding__action-label">{expanded ? "Hide" : "Expand"}</span>
        </button>
        <button
          type="button"
          className="sz-finding__action"
          onClick={onCopyFix}
        >
          <span className="sz-finding__action-label">Copy fix</span>
        </button>
        <button
          type="button"
          className="sz-finding__action"
          onClick={onDismiss}
          aria-pressed={dismissed}
        >
          <span className="sz-finding__action-label">{dismissed ? "Undo" : "Dismiss"}</span>
        </button>

        <button
          ref={kebabRef}
          type="button"
          className="sz-finding__kebab"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="More actions"
          onClick={() => setMenuOpen((v) => !v)}
          /* HF-FROW-1 close: kebab is in tab order; Alt+↑/↓ from here
           * fires reorder so the SC 2.5.7 keyboard alternative is always
           * reachable. Menu items below remain the primary non-keyboard path. */
          onKeyDown={onRowKeyDown}
        >
          ⋯
        </button>

        {menuOpen ? (
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            className="sz-finding__menu"
            onKeyDown={onMenuKeyDown}
          >
            <li role="none">
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onShare?.(); }}>Share</button>
            </li>
            <li role="none">
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onDispute?.(); }}>Dispute</button>
            </li>
            <li role="none">
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onMoveCategory?.(); }}>Move to category…</button>
            </li>
            <li role="none">
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onReorder?.("up"); }}>Move up (Alt+↑)</button>
            </li>
            <li role="none">
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onReorder?.("down"); }}>Move down (Alt+↓)</button>
            </li>
          </ul>
        ) : null}
      </div>

      {expanded ? (
        <div id={evId} className="sz-finding__evidence">
          <div className="sz-finding__evidence-body">{evidence}</div>
          {recommendation ? (
            <div className="sz-finding__rec">
              <span className="sz-finding__eyebrow">Recommendation</span>
              <div>{recommendation}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default FindingsRow;
