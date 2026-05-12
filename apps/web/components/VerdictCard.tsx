/**
 * VerdictCard — port of `design/components/verdict-card/verdict-card.jsx`.
 *
 * PRD §7.2 Step D — locked composition. The component:
 *  - renders <h1 role="status"> with the verdict line (HC1 + SC 4.1.3)
 *  - color + icon + text — never color alone (SC 1.4.1)
 *  - score line below the h1, large numeric
 *  - locked body paragraphs (Herald sample 03 §verdict body)
 *  - primary CTA above the fold + secondary text-link CTA
 *  - free-tier chip slot (Compass AH-5) + watermark slot (D7 + HC10)
 *
 * SC 1.1.1, 1.3.1, 1.4.1, 1.4.3, 2.4.6, 3.2.4, 4.1.3.
 */
import * as React from "react";

import { verdictLabel, type Verdict } from "../lib/types";

interface VerdictCardProps {
  verdict: Verdict;
  score: number;
  total?: number;
  /** Locked Herald copy — split into individually-rendered paragraphs. */
  bodyParagraphs: string[];
  primaryCta: React.ReactNode;
  secondaryCta?: React.ReactNode;
  /** Compass AH-5 — D2 free-tier chip slot. */
  freeTierChip?: React.ReactNode;
  /** D7 + HC10 — CLI watermark slot. */
  watermark?: React.ReactNode;
}

function VerdictIcon({ verdict }: { verdict: Verdict }): React.ReactElement {
  // Color + icon + text per HC1 / SC 1.4.1.
  switch (verdict) {
    case "FAIL":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" width="20" height="20">
          <path
            d="M8 1.5L14.5 14h-13L8 1.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M8 6v3.5M8 11.4v.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "PASS_WITH_FIXES":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" width="20" height="20">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M8 4.5V8l2 2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "PASS":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" width="20" height="20">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M4.5 8.2L7 10.7l4.5-5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function VerdictCard({
  verdict,
  score,
  total = 100,
  bodyParagraphs,
  primaryCta,
  secondaryCta,
  freeTierChip,
  watermark,
}: VerdictCardProps): React.ReactElement {
  return (
    <section
      className={`sz-verdict-card sz-verdict-card--${verdict.toLowerCase()}`}
      aria-labelledby="sz-verdict-h1"
    >
      <div className="sz-verdict-card__head">
        <span className="sz-verdict-card__icon">
          <VerdictIcon verdict={verdict} />
        </span>
        {/* HC1 — verdict line is the page's h1, role=status announces the
            SPA state-change to AT. Middle dot · per Herald lock. */}
        <h1 id="sz-verdict-h1" role="status" className="sz-verdict-card__h1">
          Audit complete <span aria-hidden="true">·</span>{" "}
          <span className="sz-sr-only">,</span>
          <strong>{verdictLabel(verdict)}</strong>
        </h1>
      </div>

      <p className="sz-verdict-card__score">
        Score: <strong>{score}</strong>{" "}
        <span aria-hidden="true">/</span>
        <span className="sz-sr-only">out of</span> {total}
      </p>

      {watermark ? (
        <div className="sz-verdict-card__watermark">{watermark}</div>
      ) : null}

      <div className="sz-verdict-card__body">
        {bodyParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="sz-verdict-card__actions">
        {primaryCta}
        {secondaryCta}
      </div>

      {freeTierChip ? (
        <div className="sz-verdict-card__free-tier">{freeTierChip}</div>
      ) : null}
    </section>
  );
}

export default VerdictCard;
