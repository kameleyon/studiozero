"use client";
import React, { useId } from "react";

/**
 * Chip / Badge — Studio Zero design system.
 * Variants: status | severity | verdict | filter | watermark.
 *
 * The watermark variant satisfies D7 + HC10 via a paired describedBy helper
 * line. The consumer is responsible for placing the helper line in the DOM
 * with the matching id.
 */
export function Chip({
  variant = "status",
  tone = "neutral",
  selected,
  dismissible,
  onDismiss,
  onClick,
  id,
  describedBy,
  as,
  className = "",
  children,
  ...rest
}) {
  const autoId = useId();
  const Tag = as || (variant === "filter" ? "button" : "span");
  const isButton = Tag === "button";

  const props = isButton
    ? {
        type: "button",
        "aria-pressed": variant === "filter" ? !!selected : undefined,
        onClick,
      }
    : {};

  const chipId = id || `sz-chip-${autoId}`;

  return (
    <Tag
      id={chipId}
      className={`sz-chip sz-chip--${variant} sz-chip--tone-${tone} ${selected ? "is-selected" : ""} ${className}`.trim()}
      aria-describedby={describedBy}
      {...props}
      {...rest}
    >
      {variant === "status" || variant === "watermark" ? (
        <span className="sz-chip__dot" aria-hidden="true" />
      ) : null}
      <span className="sz-chip__label">{children}</span>
      {dismissible && variant === "filter" ? (
        <button
          type="button"
          className="sz-chip__x"
          aria-label="Remove filter"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
        >
          ×
        </button>
      ) : null}
    </Tag>
  );
}

/* Convenience: helper-text element paired with a watermark chip via id link.
   Consumer renders this *anywhere* in the DOM; pairs through aria-describedby
   on the watermark Chip or on a heading near it. */
export function ChipHelperText({ id, children, className = "" }) {
  return (
    <p id={id} className={`sz-chip__help ${className}`.trim()}>
      {children}
    </p>
  );
}

export default Chip;
