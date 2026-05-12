import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /system-card — AI System Card v1.0 (V1.5, EU AI Act Art. 50 disclosure).
 *
 * Phase 9 V1.5 Batch 1 (Forge wires Comply's v1.0). Auto-PR ships with
 * Art. 50 provenance trailers on every commit + Art. 50 disclosure
 * paragraph in every PR body — the System Card is the public-facing
 * artifact those PRs link to. v0.5 (M2) is preserved at
 * `legal/ai-system-card-v0.5.md` for the audit history.
 *
 * Source-of-truth: `legal/ai-system-card-v1.0.md`.
 */

export const metadata: Metadata = {
  title: "AI system card",
  description:
    "Studio Zero AI system card v1.0 — EU AI Act Article 50 transparency disclosure. System identity, intended use, risks + mitigations, performance metrics, data governance, Auto-PR provenance.",
};

export const dynamic = "force-static";

export default function SystemCardPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · AI system card"
      title="AI system card v1.0"
      source="legal/ai-system-card-v1.0.md"
      effectiveDate="2026-05-12"
      version="1.0"
    />
  );
}
