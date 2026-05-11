"use client";
import React, { useId } from "react";
import Chip, { ChipHelperText } from "../chip/chip.jsx";

/**
 * Verdict-card — implements PRD §7.2 Step D. The `<h1 role="status">` is the
 * load-bearing SPA state-change announcement (Halo HC1 — the one place where
 * role=status on an <h1> is correct because the route URL doesn't change pre-
 * vs post-finalization).
 */
const VERDICT_TONE = {
  PASS: "pass",
  "PASS WITH FIXES": "pass-with-fixes",
  FAIL: "fail",
};

export function VerdictCard({
  verdict,
  score,
  primaryCta,
  watermark = false,
  freeTierChip = false,
  findingsCount,
  findingsCategories = ["UX", "accessibility", "brand consistency"],
  scoreDisplay,        // ReactNode — <ScoreDisplay/>
  findingsList,        // ReactNode — <FindingsList/>
  audienceLabel,
  runId,
  state = "default",   // "default" | "loading" | "error"
  ...rest
}) {
  const tone = VERDICT_TONE[verdict] || "fail";
  const ids = {
    h: useId(),
    wm: useId(),
    wmHelp: useId(),
  };
  const headlineId = `${ids.h}-h1`;
  const wmHelpId = `${ids.wmHelp}-help`;

  const renderHeader = () => {
    if (state === "loading") {
      return (
        <h1 className="sz-verdict__h sz-verdict__h--loading" role="status" aria-live="polite">
          Audit in progress
        </h1>
      );
    }
    if (state === "error") {
      return (
        <h1 className="sz-verdict__h sz-verdict__h--error" role="alert">
          The audit didn't finish.
        </h1>
      );
    }
    return (
      <h1
        id={headlineId}
        role="status"
        aria-live="polite"
        aria-describedby={watermark ? wmHelpId : undefined}
        className={`sz-verdict__h sz-verdict__h--${tone}`}
      >
        <span className="sz-verdict__icon" aria-hidden="true">
          {tone === "pass" ? "✓" : tone === "pass-with-fixes" ? "!" : "▲"}
        </span>
        <span className="sz-verdict__label">Audit complete</span>
        <span className="sz-verdict__sep" aria-hidden="true">·</span>
        <span className="sz-verdict__word">{verdict}</span>
      </h1>
    );
  };

  return (
    <section
      className={`sz-verdict sz-verdict--${tone}`}
      data-state={state}
      aria-labelledby={headlineId}
      {...rest}
    >
      {renderHeader()}

      {state === "default" ? (
        <>
          {findingsCount !== undefined ? (
            <p className="sz-verdict__sub">
              {tone === "pass" ? (
                <>No findings. The audit covered {findingsCategories.join(", ")}. The receipts are below.</>
              ) : (
                <>
                  We found {findingsCount} issues across {findingsCategories.join(", ")}. Here's every one, with the evidence.
                </>
              )}
            </p>
          ) : null}

          <div className="sz-verdict__row">
            <div className="sz-verdict__score">
              <span className="sz-verdict__score-num">{score}</span>
              <span className="sz-verdict__score-of">/ 100</span>
            </div>

            <div className="sz-verdict__cluster">
              {watermark ? (
                <Chip variant="watermark" id={`${ids.wm}-chip`} describedBy={wmHelpId}>
                  Private Run · Self-Audited
                </Chip>
              ) : null}
              {freeTierChip ? (
                <Chip variant="status" tone="neutral">
                  FREE · UNLIMITED RE-AUDITS ON THIS PROJECT
                </Chip>
              ) : null}
              {audienceLabel ? (
                <span className="sz-verdict__audience">{`AUDIENCE · ${audienceLabel}`}</span>
              ) : null}
            </div>

            <div className="sz-verdict__cta">{primaryCta}</div>
          </div>

          {watermark ? (
            <ChipHelperText id={wmHelpId}>
              This verdict was produced on your machine and not independently re-verified
              by Studio Zero infrastructure. Findings remain on your device.
            </ChipHelperText>
          ) : null}

          {runId ? (
            <p className="sz-verdict__runid">
              <code>{`RUN-${runId}`}</code>
            </p>
          ) : null}

          {scoreDisplay ? <div className="sz-verdict__breakdown">{scoreDisplay}</div> : null}
          {findingsList ? <div className="sz-verdict__findings">{findingsList}</div> : null}
        </>
      ) : null}
    </section>
  );
}

export default VerdictCard;
