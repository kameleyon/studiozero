/**
 * EmptyState — port of `design/components/empty-state/empty-state.jsx`.
 *
 * One template for every IA-enumerated empty state. Composition slots:
 *   eyebrow · heading · body · primaryCta · secondaryCta · children
 *
 * Halo A2-1 — NO role="status" here. Empty states are not state-changes;
 * they're the initial render. Only verdict-card's h1 carries role=status.
 *
 * SC 1.3.1, 1.4.1, 2.4.1, 2.4.6, 2.4.7, 2.5.8, 3.2.3, 4.1.3.
 */
import * as React from "react";

interface EmptyStateProps {
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  body?: React.ReactNode;
  primaryCta?: React.ReactNode;
  secondaryCta?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  eyebrow,
  heading,
  body,
  primaryCta,
  secondaryCta,
  children,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <section
      className={`sz-empty-state${className ? " " + className : ""}`}
      aria-labelledby="sz-empty-state-h"
    >
      {eyebrow ? <div className="sz-empty-state__eyebrow">{eyebrow}</div> : null}
      <div id="sz-empty-state-h" className="sz-empty-state__heading">
        {heading}
      </div>
      {body ? <div className="sz-empty-state__body">{body}</div> : null}
      {primaryCta || secondaryCta ? (
        <div className="sz-empty-state__actions">
          {primaryCta}
          {secondaryCta}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default EmptyState;
