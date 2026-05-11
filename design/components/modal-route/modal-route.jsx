"use client";
import React, { useEffect, useId, useRef } from "react";

/**
 * Modal-as-route — implements Halo A1-1 binding fix.
 *
 * The route is the dialog. URL ↔ open state is owned by the consumer; this
 * component simply orchestrates focus choreography and SR announcements
 * around open/close. See modal-route.md for the binding spec.
 */
export function ModalRoute({
  open,
  title,
  parentLabel = "previous page",
  parentHref,
  triggerRef,
  onClose,
  dismissible = true,
  srAnnounceRef,        // optional — consumer-provided page-shell aria-live region
  children,
  actions,
  ...rest
}) {
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const fallbackSrRef = useRef(null);
  const autoId = useId();
  const titleId = `${autoId}-title`;

  // Focus management on open
  useEffect(() => {
    if (!open) return;

    // Move focus to the H2 (focus-target on open per Halo A1-1 + SC 2.4.3).
    titleRef.current?.focus();

    // Persist trigger element id on history.state for back-button focus return.
    try {
      if (triggerRef?.current?.id) {
        history.replaceState(
          { ...history.state, sz_modal_trigger: triggerRef.current.id },
          "",
        );
      }
    } catch (_e) { /* SSR or restricted env */ }

    // Body scroll lock.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, triggerRef]);

  // Close on Esc — guarded by dismissible.
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dismissible]);

  function handleClose() {
    // SR announce: navigated back to {parentLabel}.
    const live = srAnnounceRef?.current || fallbackSrRef.current;
    if (live) {
      // Clear then set to ensure the announcement fires every time.
      live.textContent = "";
      // Stagger by a frame so the change is observed.
      requestAnimationFrame(() => {
        live.textContent = `Navigated back to ${parentLabel}.`;
      });
    }

    // Focus return: trigger first, parent <h1> fallback.
    requestAnimationFrame(() => {
      const target =
        triggerRef?.current ||
        document.querySelector('main h1, [data-sz-parent-heading]');
      if (target) {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: false });
      }
    });

    onClose?.();
  }

  // Focus-trap inside dialog
  function onKeyDownTrap(e) {
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Fallback page-shell live region for the navigated-back announcement.
          When the consumer provides srAnnounceRef this fallback is unused. */}
      <div
        ref={fallbackSrRef}
        className="sz-sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <div
        className="sz-modal-route__backdrop"
        onClick={dismissible ? handleClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sz-modal-route"
        onKeyDown={onKeyDownTrap}
        {...rest}
      >
        {dismissible ? (
          <button
            type="button"
            className="sz-modal-route__x"
            aria-label="Close"
            onClick={handleClose}
          >
            ×
          </button>
        ) : null}

        <h2
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
          className="sz-modal-route__title"
        >
          {title}
        </h2>

        <div className="sz-modal-route__body">{children}</div>

        {actions ? (
          <div className="sz-modal-route__actions">{actions}</div>
        ) : null}

        {parentHref ? (
          <a className="sz-sr-only" href={parentHref}>Back to {parentLabel}</a>
        ) : null}
      </div>
    </>
  );
}

export default ModalRoute;
