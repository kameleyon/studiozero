import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /system-card — AI System Card v0.5 (M2, EU AI Act Art. 50 disclosure).
 *
 * Phase 9 M2 Batch 2 (Comply). EU AI Act Art. 50 binds 2026-08-02; the
 * disclosure machinery (header + meta tag) has been live since M0, and
 * the substantive System Card now reflects M2 facts: Anthropic-model
 * pinning posture, token-budget cap per tier (R1 mitigation), per-tenant
 * attribution via HMAC tenant_hash (Cipher Fix-3b). v1.0 ships before
 * V1.5 Auto-PR with measured performance metrics.
 *
 * Source-of-truth: `legal/ai-system-card-v0.5.md`.
 */

export const metadata: Metadata = {
  title: "AI system card",
  description:
    "Studio Zero AI system card v0.5 — EU AI Act Article 50 transparency disclosure. System identity, intended use, risks + mitigations, performance framework, data governance.",
};

export const dynamic = "force-static";

export default function SystemCardPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · AI system card"
      title="AI system card v0.5"
      source="legal/ai-system-card-v0.5.md"
      effectiveDate="2026-05-12"
      version="0.5"
    />
  );
}
