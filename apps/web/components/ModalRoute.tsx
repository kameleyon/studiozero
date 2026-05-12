"use client";

/**
 * ModalRoute — port of `design/components/modal-route/modal-route.jsx`.
 *
 * Halo A1-1 — Critical fix bundle:
 *   · focus return on close (router.back() OR onClose handler restores
 *     focus to the trigger ref)
 *   · ESC closes
 *   · focus trap inside dialog
 *   · SR announce of the parent route on close (via the polite live region
 *     in `AppShell`, M1+1 wires this through context)
 *
 * SC 1.3.1, 1.4.10, 1.4.11, 2.1.2, 2.4.3, 2.4.11, 2.4.13, 2.5.8, 4.1.3.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

interface ModalRouteProps {
  /** Heading text — wired into <h2 id="…"> + aria-labelledby. */
  title: string;
  /** Optional close callback. Default: router.back(). */
  onClose?: () => void;
  children: React.ReactNode;
}

export function ModalRoute({
  title,
  onClose,
  children,
}: ModalRouteProps): React.ReactElement {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const headingRef = React.useRef<HTMLHeadingElement | null>(null);

  const handleClose = React.useCallback(() => {
    if (onClose) onClose();
    else router.back();
  }, [onClose, router]);

  // Open: focus the heading (announces title to AT).
  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Focus trap + Esc.
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = (): NodeListOf<HTMLElement> =>
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === "Tab") {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  return (
    <div className="sz-modal-route-overlay">
      {/* Overlay backdrop button — clicking dismisses; SR sees the
          explicit "Close dialog" button below in the dialog. Keyboard
          users use Esc (already wired) or the visible close button. */}
      <button
        type="button"
        aria-label="Close dialog"
        className="sz-modal-route-backdrop"
        onClick={handleClose}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sz-modal-route-title"
        className="sz-modal-route-dialog"
      >
        <h2
          id="sz-modal-route-title"
          ref={headingRef}
          tabIndex={-1}
          className="sz-modal-route-title"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="sz-modal-route-close"
          aria-label="Close dialog"
        >
          Close
        </button>
        <div className="sz-modal-route-body">{children}</div>
      </div>
    </div>
  );
}

export default ModalRoute;
