"use client";
import React from "react";
import Chip from "../chip/chip.jsx";

/**
 * Empty-state — composition template for every IA-enumerated empty state.
 *
 * Per Halo A2-1: this is a route, not a region update. No `role="status"`
 * except via the assertive prop (used for unexpected failures only).
 */
export function EmptyState({
  kind = "zero-data",
  eyebrow,
  statusChip,
  headingLevel = 1,
  title,
  body,
  primary,
  secondary,
  supportCode,
  assertive = false,
  state = "default",
  ...rest
}) {
  const H = headingLevel === 1 ? "h1" : "h2";

  return (
    <section
      className={`sz-empty sz-empty--${kind}`}
      data-state={state}
      {...rest}
    >
      {eyebrow ? <span className="sz-empty__eyebrow">{eyebrow}</span> : null}

      {statusChip ? (
        assertive ? (
          <div role="alert" className="sz-empty__chip-wrap">
            <Chip variant="status" tone="fail" data-state="error">{statusChip}</Chip>
          </div>
        ) : (
          <Chip variant="status" tone="neutral">{statusChip}</Chip>
        )
      ) : null}

      <H className="sz-empty__title">{title}</H>

      {body ? <div className="sz-empty__body">{body}</div> : null}

      {supportCode ? (
        <p className="sz-empty__code">
          <code>{supportCode}</code>
          <button
            type="button"
            className="sz-empty__copy"
            aria-label={`Copy support code ${supportCode}`}
            onClick={() => navigator.clipboard?.writeText(supportCode)}
          >
            Copy
          </button>
        </p>
      ) : null}

      {(primary || secondary) ? (
        <div className="sz-empty__actions">
          {primary}
          {secondary}
        </div>
      ) : null}
    </section>
  );
}

export default EmptyState;
