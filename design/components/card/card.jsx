"use client";
import React from "react";

/**
 * Card — three semantic variants share a structural shell.
 * Composition: <ModeCard>, <ProjectCard>, <FindingCard>.
 * Brand-token-driven via card.css.
 */

export function Card({ as: Tag = "article", interactive = false, className = "", children, ...rest }) {
  return (
    <Tag
      className={`sz-card ${interactive ? "sz-card--interactive" : ""} ${className}`.trim()}
      tabIndex={interactive ? 0 : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ===================== ModeCard ===================== */
export function ModeCard({
  technicalLabel,    // e.g. "BYOK"
  humanLabel,        // e.g. "Use my API key" (Compass AH-1 primary)
  description,       // ≤60 words per HB-2
  recommended = false,
  comingSoon = false,
  cta,               // ReactNode <Button> recommended
  ...rest
}) {
  return (
    <Card
      as="article"
      data-state={comingSoon ? "disabled" : undefined}
      aria-label={humanLabel}
      className="sz-card--mode"
      {...rest}
    >
      <div className="sz-card__head">
        <span className="sz-card__eyebrow">{technicalLabel}</span>
        {recommended ? (
          <span className="sz-card__pill" aria-label="Recommended for non-technical users">
            Recommended
          </span>
        ) : null}
        {comingSoon ? (
          <span className="sz-card__pill sz-card__pill--soon">Coming soon</span>
        ) : null}
      </div>
      <h2 className="sz-card__title sz-card__title--mode">{humanLabel}</h2>
      <p className="sz-card__body">{description}</p>
      <div className="sz-card__foot">{cta}</div>
    </Card>
  );
}

/* ===================== ProjectCard ===================== */
export function ProjectCard({
  name,
  clientTag,          // Compass AH-6 — indie-agency client label
  modeChip,           // e.g. "BYOK"
  ghConnected = false,
  lastAuditLabel,     // e.g. "3 days ago" or "never audited"
  score,              // 0-100 or null
  verdict,            // "PASS" | "PASS WITH FIXES" | "FAIL" | null
  href,
  ...rest
}) {
  return (
    <Card
      as="a"
      interactive
      href={href}
      aria-label={`${name}${clientTag ? `, client: ${clientTag}` : ""}`}
      className="sz-card--project"
      {...rest}
    >
      <div className="sz-card__head">
        <h3 className="sz-card__title sz-card__title--project">{name}</h3>
        {clientTag ? (
          <span className="sz-card__client-tag" aria-label={`Client: ${clientTag}`}>
            {clientTag}
          </span>
        ) : null}
      </div>

      <div className="sz-card__meta">
        {modeChip ? <span className="sz-card__metachip">{`MODE · ${modeChip}`}</span> : null}
        {ghConnected ? <span className="sz-card__metachip">GITHUB · CONNECTED</span> : null}
        <span className="sz-card__metachip">{`LAST AUDIT · ${lastAuditLabel}`}</span>
      </div>

      {score !== null && score !== undefined ? (
        <div className="sz-card__score" aria-label={`Score ${score} out of 100, verdict ${verdict || "unknown"}`}>
          <span className="sz-card__score-num">{score}</span>
          <span className="sz-card__score-of">/ 100</span>
          {verdict ? <span className={`sz-card__verdict sz-card__verdict--${verdict.replace(/\s+/g, "-").toLowerCase()}`}>{verdict}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}

/* ===================== FindingCard ===================== */
export function FindingCard({
  id,
  severity,           // "Blocker"|"Critical"|"Major"|"Minor"|"Polish"
  category,           // "Accessibility" — primary group per Compass AH-2
  reviewer,           // "halo" — secondary metadata
  summary,
  evidence,           // ReactNode (Evidence component)
  recommendation,
  actions,            // ReactNode (Button row + kebab)
  expanded = false,
  onExpandToggle,
  ...rest
}) {
  const sevKey = (severity || "minor").toLowerCase();
  const expandId = `${id}-evidence`;
  return (
    <Card as="article" aria-labelledby={`${id}-h`} className="sz-card--finding" {...rest}>
      <div className="sz-card__head">
        <span className={`sz-card__sev sz-card__sev--${sevKey}`}>{severity}</span>
        <span className="sz-card__eyebrow">
          {category}
          <span className="sz-card__reviewer" aria-label={`Reviewer ${reviewer}`}>
            {` · ${reviewer}`}
          </span>
        </span>
      </div>

      <h3 id={`${id}-h`} className="sz-card__title sz-card__title--finding">
        {summary}
      </h3>

      <button
        type="button"
        className="sz-card__expand"
        aria-expanded={expanded}
        aria-controls={expandId}
        onClick={onExpandToggle}
      >
        {expanded ? "Hide evidence" : "Show evidence"}
      </button>

      {expanded ? (
        <div id={expandId} className="sz-card__evidence">
          <div className="sz-card__evidence-inner">{evidence}</div>
          {recommendation ? (
            <div className="sz-card__rec">
              <span className="sz-card__eyebrow">Recommendation</span>
              <div className="sz-card__rec-body">{recommendation}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {actions ? <div className="sz-card__actions">{actions}</div> : null}
    </Card>
  );
}

export default Card;
