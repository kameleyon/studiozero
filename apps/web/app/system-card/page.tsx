import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /system-card — AI System Card v0.1 (M1, EU AI Act Art. 50 placeholder).
 *
 * Phase 9 M1 Batch 3 (Comply). EU AI Act Art. 50 binds 2026-08-02; the
 * disclosure machinery (header + meta tag) has been live since M0, and
 * the substantive System Card placeholder lands here at M1. v1.0 ships
 * before V1.5 Auto-PR with measured performance metrics.
 *
 * Source-of-truth: `legal/ai-system-card-v0.1.md`.
 */

export const metadata: Metadata = {
  title: "AI system card",
  description:
    "Studio Zero AI system card v0.1 — EU AI Act Article 50 transparency disclosure. System identity, intended use, risks + mitigations, performance framework, data governance.",
};

export const dynamic = "force-static";

export default function SystemCardPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · AI system card"
      title="AI system card v0.1"
      source="legal/ai-system-card-v0.1.md"
      effectiveDate="2026-05-12"
      version="0.1"
    />
  );
}
