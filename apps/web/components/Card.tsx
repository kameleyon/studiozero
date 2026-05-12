/**
 * Card — port of `design/components/card/card.jsx`. Three variants:
 *
 *   mode      — Compass AH-1 dual label (technical eyebrow + human heading).
 *               Used on the onboarding mode-picker.
 *   project   — Project list row with optional Compass AH-6 client tag slot.
 *   finding   — Compass AH-2 category-primary finding card (used inline by
 *               FindingsRow.tsx for the collapsed header).
 *   default   — generic surface (intake step cards, dashboard tiles).
 *
 * SC 1.1.1, 1.3.1, 1.4.1, 1.4.3, 2.1.1, 2.4.4, 2.5.8, 3.2.4.
 */
import * as React from "react";

type Variant = "default" | "mode" | "project" | "finding";

interface CardBaseProps {
  variant?: Variant;
  className?: string;
  /** Optional href turns the whole card into a single-link interactive surface. */
  href?: string;
  /** Optional onClick — only honored when href is not provided. */
  onClick?: () => void;
  /** Make the card focusable + keyboard-actionable (overrides href default). */
  interactive?: boolean;
  children?: React.ReactNode;
  /** Slot props for variant=mode + project: */
  eyebrow?: React.ReactNode;
  heading?: React.ReactNode;
  body?: React.ReactNode;
  mono?: React.ReactNode;
  /** Footer slot (project card uses for "Last audit: 3d ago"). */
  meta?: React.ReactNode;
  /** Compass AH-6 — Indie agency client tag. */
  clientTag?: React.ReactNode;
}

export function Card(props: CardBaseProps): React.ReactElement {
  const {
    variant = "default",
    className,
    href,
    onClick,
    interactive,
    children,
    eyebrow,
    heading,
    body,
    mono,
    meta,
    clientTag,
  } = props;

  const cls = `sz-card sz-card--${variant}${interactive || href ? " sz-card--interactive" : ""}${className ? " " + className : ""}`;

  const inner = (
    <>
      {eyebrow ? <div className="sz-card__eyebrow">{eyebrow}</div> : null}
      {heading ? <h3 className="sz-card__heading">{heading}</h3> : null}
      {body ? <p className="sz-card__body">{body}</p> : null}
      {clientTag ? <div className="sz-card__client-tag">{clientTag}</div> : null}
      {mono ? <div className="sz-card__mono">{mono}</div> : null}
      {children}
      {meta ? <div className="sz-card__meta">{meta}</div> : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  if (interactive && onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export default Card;
