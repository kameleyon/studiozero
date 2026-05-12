/**
 * Chip — port of `design/components/chip/chip.jsx`. TypeScript variant for
 * apps/web composition.
 *
 * Variants:
 *   - mono-meta   — eyebrow / status strip (default font is mono, uppercase)
 *   - severity    — Blocker / Critical / Major / Minor / Polish (color-coded
 *                   per --sev-*-text + --sev-*-border tokens)
 *   - verdict     — FAIL / PASS WITH FIXES / PASS (color-coded per
 *                   --verdict-* tokens)
 *   - watermark   — D7 "Private Run · Self-Audited" pair (HC10 / SC 3.2.4)
 *   - free-tier   — D2 "FREE · UNLIMITED RE-AUDITS" chip slot for verdict-card
 *
 * Tone: neutral | emphasis. Tone applies to mono-meta only; other variants
 * derive color from the variant's semantic.
 *
 * SC 1.3.1, 1.4.1, 1.4.3, 2.5.8, 3.2.4, 4.1.2.
 */
import * as React from "react";

import type { Severity, Verdict } from "../lib/types";

type Variant =
  | "mono-meta"
  | "severity"
  | "verdict"
  | "watermark"
  | "free-tier";

type Tone = "neutral" | "emphasis";

interface ChipBaseProps {
  variant: Variant;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

interface ChipSeverityProps extends Omit<ChipBaseProps, "variant" | "children"> {
  variant: "severity";
  severity: Severity;
  children?: React.ReactNode;
}

interface ChipVerdictProps extends Omit<ChipBaseProps, "variant" | "children"> {
  variant: "verdict";
  verdict: Verdict;
  children?: React.ReactNode;
}

export type ChipProps = ChipBaseProps | ChipSeverityProps | ChipVerdictProps;

function severityLabel(s: Severity): string {
  switch (s) {
    case "blocker":
      return "Blocker";
    case "critical":
      return "Critical";
    case "major":
      return "Major";
    case "minor":
      return "Minor";
    case "polish":
      return "Polish";
  }
}

function verdictLabel(v: Verdict): string {
  switch (v) {
    case "FAIL":
      return "FAIL";
    case "PASS_WITH_FIXES":
      return "PASS WITH FIXES";
    case "PASS":
      return "PASS";
  }
}

export function Chip(props: ChipProps): React.ReactElement {
  const { variant, className, tone = "neutral" } = props;

  if (variant === "severity") {
    const p = props as ChipSeverityProps;
    return (
      <span
        className={`sz-chip sz-chip--severity sz-chip--sev-${p.severity}${className ? " " + className : ""}`}
        data-severity={p.severity}
      >
        {p.children ?? severityLabel(p.severity)}
      </span>
    );
  }

  if (variant === "verdict") {
    const p = props as ChipVerdictProps;
    return (
      <span
        className={`sz-chip sz-chip--verdict sz-chip--verdict-${p.verdict.toLowerCase()}${className ? " " + className : ""}`}
        data-verdict={p.verdict}
      >
        {p.children ?? verdictLabel(p.verdict)}
      </span>
    );
  }

  const p = props as ChipBaseProps;
  return (
    <span
      className={`sz-chip sz-chip--${variant} sz-chip--tone-${tone}${className ? " " + className : ""}`}
    >
      {p.children}
    </span>
  );
}

export default Chip;
